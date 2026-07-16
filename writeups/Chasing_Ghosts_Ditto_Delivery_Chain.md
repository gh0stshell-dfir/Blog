---
id: ditto-delivery-chain
title: "Ditto DLL Side-Loading and Domain Compromise"
summary: "Quick Assist to pdf24/userenv.dll (blocked) then Ditto with fake vcruntime140.dll, DNS C2, and KRBTGT compromise in under one hour."
category: DFIR
date: 2026-06-24
tags: [quick-assist, ditto, dll-sideload, domain-compromise, social-engineering]
---

# Ditto DLL Side-Loading and Domain Compromise

## Summary

```
CLASS      : KRBTGT compromise / domain intrusion
VECTOR     : Vishing + Microsoft Quick Assist
IMPLANT    : Botan RAT via userenv.dll (pdf24) then fake vcruntime140.dll (Ditto)
C2         : Malformed DNS over UDP/53 → 45.55.94.174
TTX        : Domain compromise < 60 minutes
RANSOMWARE : Not observed
OBJECTIVE  : Persistent privileged access
```

Vishing led to an accepted Microsoft Quick Assist session. From that interactive user context, the operator ran host recon, then pulled two MSI packages from the same staging host. Stage 1 (`pdf24.exe` + malicious `userenv.dll`) was blocked by Defender. Stage 2 installed a Ditto-shaped tree under the user profile: legitimate `Ditto.exe` side-loading a fake `vcruntime140.dll` (Botan RAT, same family as Stage 1), with Startup-folder persistence.

The implant beaconed over UDP/53 to a non-resolver IP with malformed DNS payloads. That foothold enabled domain-level actions: EFSRPC coercion against DC01, NTLM relay of the DC auth, DCSync (`DRSGetNCChanges`), KRBTGT/privileged hash extraction, then RDP lateral movement as a Domain Admin service account. GetScreen and DWAgent were added on secondary hosts. No ransomware was observed.

## Attack Chain

```
Social engineering (vishing)
  → Quick Assist session
  → Host recon (whoami, ipconfig, net user /domain)
  → pd_53updates.msi → pdf24.exe + userenv.dll (blocked by Defender)
  → dt_53updates.msi (successful)
  → Ditto.exe side-loads fake vcruntime140.dll from %LOCALAPPDATA%\Ditto\
  → Botan RAT beacon (AES-256-GCM, UDP/53 C2)
  → PetitPotam (\PIPE\efsrpc → DC01)
  → NTLM relay (DC01 → 167.172.212.171)
  → DCSync (DRSGetNCChanges)
  → KRBTGT / privileged hash extraction
  → Lateral movement via <svc_account> (RDP)
  → GetScreen + DWAgent persistence
```

## Initial Access

Microsoft Quick Assist was initiated by an external party and accepted by the user after a vishing call. The tool ran in the logged-on user's context, giving the operator an interactive session without a separate privilege-elevation step at this stage.

## Host Reconnaissance

Within about two minutes of session start, interactive recon established user context, network placement, internal reachability, and domain membership:

```
whoami
whoami /groups
ipconfig /all
ping <internal-host>
nslookup <internal-host>
net user /domain
```

That output fed the decision to proceed with payload delivery on this host.

## Payload Delivery

### Stage 1 — Blocked (pdf24 + userenv.dll)

```
URL    : http://<C2-DROP>/pd_53updates.msi
SOURCE : 45.61.163.226
```

Stage 1 attempted DLL side-loading under a PDF-utility host (`pdf24.exe`) with malicious `userenv.dll` adjacent to the host binary. Defender blocked the side-load:

```
Potential Side-Loaded Behavior Was Blocked
```

`pdf24.exe` / the associated payload was quarantined. Static strings from Stage 1 `userenv.dll` already identify the same Botan RAT family later used under Ditto: MinGW/GCC 13-win32, Botan 3 AES-GCM, base64 C2 `NDUuNTUuOTQuMTc0` → `45.55.94.174`, implant GUID `573d2149-b7b1-4d54-b0d4-403195f3984e`, and the JSON beacon template. Compile stamp strings include `Jun 11 2026`.

Approximately three minutes later, the operator switched host packages and delivered Stage 2 from the same staging IP.

### Stage 2 — Successful (Ditto + fake vcruntime140.dll)

```
URL    : http://<C2-DROP>/dt_53updates.msi
SOURCE : 45.61.163.226
SHA256 : 849a2c808694426b2afb8848dcea00f9e64538a503b05543e38af1fdee9dd9f8
SIZE   : ~4.8 MB
```

The MSI executed and wrote a Ditto-shaped tree under the user profile: legitimate `Ditto.exe` as host process, fake `vcruntime140.dll` as implant, companion libraries/settings to complete the install appearance, and a Startup shortcut for logon persistence.

#### Dropped paths

```
%LOCALAPPDATA%\Ditto\Ditto.exe              ← host (legitimate Ditto)
%LOCALAPPDATA%\Ditto\vcruntime140.dll       ← FAKE / implant (side-loaded)
%LOCALAPPDATA%\Ditto\mfc140u.dll
%LOCALAPPDATA%\Ditto\vcruntime140u.dll
%LOCALAPPDATA%\Ditto\msvcp140.dll
%LOCALAPPDATA%\Ditto\ICU_Loader.dll
%LOCALAPPDATA%\Ditto\Addins\DittoUtil.dll
%LOCALAPPDATA%\Ditto\language\English.xml
%LOCALAPPDATA%\Ditto\Ditto.Settings
```

#### Persistence

```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Ditto.lnk
```

## DLL Side-Loading

On process start, `Ditto.exe` resolves imports via the standard DLL search order. A local `vcruntime140.dll` in the application directory is preferred over `C:\Windows\System32\`. The legitimate host therefore loads attacker-controlled code in-process under a trusted-looking process tree, without a standalone unsigned RAT EXE on disk.

### Malicious libraries (confirmed)

```
Stage   Host binary     Malicious DLL        Role
------  --------------  -------------------  ------------------------------------------
1       pdf24.exe       userenv.dll          Side-load implant (blocked by Defender)
2       Ditto.exe       vcruntime140.dll     Fake VC++ runtime; successful side-load
```

Stage 2 implant:

```
Path     %LOCALAPPDATA%\Ditto\vcruntime140.dll
SHA256   9d20d9f17dddedd3ea057b68e42ef2ca86ff7c776d59b045213f377ba1707291
Role     Fake vcruntime140; Botan RAT loaded by Ditto.exe
```

Stage 1 `userenv.dll` is the same family under the PDF host (earlier attempt, not a separate actor). Remaining files under `%LOCALAPPDATA%\Ditto\` support install appearance only; the primary Stage 2 implant is the fake `vcruntime140.dll`.

### Host choice (Ditto)

Ditto is open-source and commonly repackaged. As a clipboard manager it already uses APIs that look suspicious outside that product context:

```
AddClipboardFormatListener
SetWindowsHookEx
FindShellTrayWindow
SendNotifyMessage
Process enumeration
```

Running the implant inside `Ditto.exe` places those behaviors in a process where clipboard, hooks, and window enumeration are expected, and local DLL search order makes side-loading straightforward.

### Static strings (userenv.dll / fake vcruntime140.dll)

Strings from Stage 1 `userenv.dll`, consistent with the Stage 2 fake `vcruntime140.dll` family:

```
GCC: (GNU) 13-win32
libgcc_s_dw2-1.dll
Botan 3.0.0 (unreleased, revision unknown, distribution unspecified)
AES-256/GCM
GHASH requires a 128-bit nonce
Invalid authentication tag
BOTAN_MLOCK_POOL_SIZE
RtlGenRandom / SystemFunction036
NDUuNTUuOTQuMTc0
573d2149-b7b1-4d54-b0d4-403195f3984e
{"name": "%s", "build_date": "%s %s", "arch": "windows", "username": "%s", "pid": "%d" }
Jun 11 2026
```

MinGW-w64 build with statically linked Botan 3. Stage 1 malicious `userenv.dll` also carries export-forward style strings to legitimate SysWOW64 userenv APIs, consistent with a proxy DLL: present as `userenv.dll` for side-loading under pdf24 while wrapping the Botan implant.

### Imports and capabilities

```
Threading        : CreateThread, ExitThread, ResumeThread
Synchronization  : InitializeCriticalSection, SleepConditionVariableCS
Memory           : VirtualAlloc, VirtualProtect, VirtualFree, VirtualLock
Filesystem       : FindFirstFileA, FindNextFileA
Networking       : WSAStartup, WSACleanup, getaddrinfo, closesocket
Profiling        : GetComputerNameA, GetUserNameA, GetSystemInfo,
                   GlobalMemoryStatusEx, GetTickCount
Evasion          : IsNativeVhdBoot, DisableThreadLibraryCalls
Dynamic Loading  : LoadLibraryA, GetProcAddress
```

Multi-threaded work, in-memory allocation/execution, Winsock networking, directory enumeration, host profiling, and dynamic API resolution.

### C2 address (Base64)

```
NDUuNTUuOTQuMTc0  →  45.55.94.174
```

### Beacon format

```json
{
  "name":      "%s",
  "build_date":"%s %s",
  "arch":      "windows",
  "username":  "%s",
  "pid":       "%d"
}
```

Runtime fields: hostname, compile timestamp, architecture (`windows`), logged-on user, PID. Beacon payload encrypted with AES-256-GCM before send.

## C2 — Malformed DNS over UDP/53

Sandbox and network telemetry:

```
DESTINATION : 45.55.94.174
PORT        : 53
PROTOCOL    : UDP
ORIGIN      : %LOCALAPPDATA%\Ditto\Ditto.exe
```

Traffic targeted an attacker IP on 53/udp, not a corporate or public resolver. Packet contents were not valid DNS queries (DNS-as-transport). AES-GCM encrypts the beacon on the channel established by the side-loaded implant.

That C2 path provided operator control on the workstation, which then drove the post-exploitation sequence below.

## Post-Exploitation

### PetitPotam / NTLM relay

About nine minutes after the successful MSI:

```
TARGET    : DC01
PIPE      : \PIPE\efsrpc
INTERFACE : EFSRPC (MS-EFSR)
```

EFSRPC coercion forced DC01 to authenticate to an attacker-chosen destination. Immediately after, DC01 opened outbound auth:

```
SOURCE : DC01 (ntoskrnl context)
DEST   : 167.172.212.171 (DigitalOcean)
```

Consistent with NTLM relay of the coerced DC authentication to external infrastructure. Relayed DC material then enabled directory replication rights used in the next step.

### DCSync

Eleven minutes after the first MSI:

```
OPERATION : DRSGetNCChanges
TARGET    : DC01
SOURCE    : <workstation>
```

`DRSGetNCChanges` from the workstation is DCSync (Mimikatz, Impacket, or equivalent), implying credentials with directory replication rights obtained via the relay path. Material extracted included at least:

- `krbtgt`
- privileged / service account hashes
- other high-value directory secrets

KRBTGT compromise enables forged TGTs until a double KRBTGT password reset (and usually broader credential reset). That reset was executed later the same day.

### Privileged service account

Directory review identified `<svc_account>`: Domain Administrator membership, no meaningful logon or source-host restrictions, long-unchanged password. DCSync provided its material. That account enabled multi-host RDP without further escalation on the secondary targets.

### Lateral movement and extra persistence

RDP as `<svc_account>`:

```
TARGET 1 : <print-server>
TARGET 2 : <test-server>
PROTOCOL : RDP (TCP/3389)
```

Additional remote-access tools:

```
<print-server> : GetScreen.me agent
<test-server>  : DWAgent
```

Resulting footholds: Ditto/Botan on the original workstation, GetScreen on the print server, DWAgent on the test server.

## Timeline (MDT)

```
13:29  Quick Assist session established
13:31  Recon commands (whoami, ping, ipconfig, nslookup)
13:36  Stage 1 MSI downloaded from 45.61.163.226
13:38  Stage 1 side-load blocked (pdf24.exe + userenv.dll)
13:39  Defender alert → SOC queue
13:39  Stage 2 MSI (dt_53updates.msi) downloaded; Ditto + fake vcruntime140.dll
13:43  ITSM ticket created
13:45  Internal enumeration (Kerberos, LDAP, SMB, RDP)
13:47  PetitPotam activity against DC01 (\PIPE\efsrpc)
13:48  DC01 outbound auth to 167.172.212.171
13:57  pdf24.exe execution blocked
13:59  DCSync (DRSGetNCChanges) observed
14:01  Kerberos TGS requests against DC01
14:09  RDP to <test-server> as <svc_account>
14:14  RDP to <print-server> as <svc_account>
14:15  GetScreen.me downloaded
14:17  GetScreen persistence on <print-server>
14:17  DWAgent deployed on <test-server>
15:53  Workstation isolated
~21:00 Domain-wide password reset + double KRBTGT reset
```

- First foothold to multi-host persistence: **48 minutes**
- First foothold to KRBTGT compromise: **30 minutes**

## MITRE ATT&CK Mapping

| Tactic | Technique | ID |
|--------|-----------|-----|
| Initial Access | Remote Services: Quick Assist abuse | T1219 |
| Initial Access | Phishing: Voice / Vishing | T1566.004 |
| Execution | User Execution: Malicious File (MSI) | T1204.002 |
| Execution | Command and Scripting Interpreter | T1059 |
| Persistence | Boot or Logon Autostart: Startup Folder | T1547.001 |
| Persistence | Remote Access Software (GetScreen, DWAgent) | T1219 |
| Privilege Escalation | Domain Policy Modification (svc account) | T1484 |
| Defense Evasion | Hijack Execution Flow: DLL Side-Loading | T1574.002 |
| Defense Evasion | Obfuscated Files or Information (Base64 C2) | T1027 |
| Defense Evasion | Masquerading: Match Legitimate Name | T1036.005 |
| Credential Access | Forced Authentication (PetitPotam) | T1187 |
| Credential Access | OS Credential Dumping: DCSync | T1003.006 |
| Credential Access | Steal or Forge Kerberos Tickets (KRBTGT) | T1558 |
| Discovery | System Information Discovery | T1082 |
| Discovery | System Network Configuration Discovery | T1016 |
| Discovery | Account Discovery: Domain Account | T1087.002 |
| Lateral Movement | Remote Services: RDP | T1021.001 |
| Command and Control | Application Layer Protocol: DNS | T1071.004 |
| Command and Control | Encrypted Channel: Symmetric (AES-GCM) | T1573.001 |
| Command and Control | Non-Standard Port (DNS-as-transport) | T1571 |

## Indicators of Compromise

### Network

```
Indicator           Role
------------------  ----------------------------------------
45.55.94.174        C2 (DNS-tunneled, UDP/53)
45.61.163.226       MSI staging host
167.172.212.171     NTLM relay endpoint (DigitalOcean)
```

### Encoded strings

```
NDUuNTUuOTQuMTc0    Base64 for 45.55.94.174
```

### Files and hashes (SHA256)

```
Path / file                                      Notes / Hash
-----------------------------------------------  ----------------------------------------------------------------
userenv.dll (Stage 1, with pdf24.exe)            Malicious implant (blocked); same Botan family as Stage 2
dt_53updates.msi                                 849a2c808694426b2afb8848dcea00f9e64538a503b05543e38af1fdee9dd9f8
%LOCALAPPDATA%\Ditto\Ditto.exe                   Host binary
                                                 b120f170046b0ba5952d4957dd25e0a394ad28f743b47f2152c973e9fd94f08d
%LOCALAPPDATA%\Ditto\vcruntime140.dll            FAKE implant (primary Stage 2 side-load)
                                                 9d20d9f17dddedd3ea057b68e42ef2ca86ff7c776d59b045213f377ba1707291
%LOCALAPPDATA%\Ditto\mfc140u.dll                 27ebf5ed915a573aa10a4ec18b3626a297032f3c46afc2daf45d8bb1ffecfe66
%LOCALAPPDATA%\Ditto\msvcp140.dll                968bbd2a36b04cc5795c6fc99afe85e4d294ff9c28032ce0e870463827181799
%LOCALAPPDATA%\Ditto\vcruntime140u.dll           eb6a3a491efcc911f9dff457d42fed85c4c170139414470ea951b0dafe352829
%LOCALAPPDATA%\Ditto\ICU_Loader.dll              15a9c2550759eee371d57fa69e4d7d596235f2f061cd17ca123cba535a24fbcd
%LOCALAPPDATA%\Ditto\Addins\DittoUtil.dll        1ba47b26175855cba499ff8e951af5193e662319e96d497f4270daac440da1fd
```

### Persistence

```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Ditto.lnk
```

### Implant identifier

```
573d2149-b7b1-4d54-b0d4-403195f3984e
```

### Build artifacts

```
Botan 3.0.0 (unreleased, revision unknown)
AES-256/GCM
GCC: (GNU) 13-win32
libgcc_s_dw2-1.dll
BOTAN_MLOCK_POOL_SIZE
```

### YARA

```
rule Ditto_BotanRAT_Implant
{
    meta:
        description = "Detects Ditto-side-loaded Botan RAT implant"
        author      = "ghostsh-labs"

    strings:
        $botan   = "Botan 3.0.0 (unreleased" ascii
        $aes     = "AES-256/GCM"             ascii
        $mlock   = "BOTAN_MLOCK_POOL_SIZE"   ascii
        $beacon  = "\"arch\": \"windows\""   ascii
        $ip_b64  = "NDUuNTUuOTQuMTc0"        ascii
        $guid    = "573d2149-b7b1-4d54-b0d4-403195f3984e" ascii
        $mingw   = "GCC: (GNU) 13-win32"     ascii
        $authtag = "Invalid authentication tag" ascii

    condition:
        uint16(0) == 0x5A4D and
        filesize < 8MB and
        (
            ($botan and $aes and ($mlock or $authtag)) and
            ($ip_b64 or $guid or $beacon) and
            $mingw
        )
}
```
