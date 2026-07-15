---
id: ditto-delivery-chain
title: "Ditto DLL Side-Loading and Domain Compromise"
summary: "Quick Assist to pdf24/user.dll (blocked) then Ditto with fake vcruntime140.dll, DNS C2, and KRBTGT compromise in under one hour."
category: DFIR
date: 2026-06-24
tags: [quick-assist, ditto, dll-sideload, domain-compromise, social-engineering]
---

# Ditto DLL Side-Loading and Domain Compromise

## Summary

```
CLASS      : KRBTGT compromise / domain intrusion
VECTOR     : Vishing + Microsoft Quick Assist
IMPLANT    : Botan RAT via user.dll (pdf24) then fake vcruntime140.dll (Ditto)
C2         : Malformed DNS over UDP/53 → 45.55.94.174
TTX        : Domain compromise < 60 minutes
RANSOMWARE : Not observed
OBJECTIVE  : Persistent privileged access
```

A user was social-engineered into accepting an unsolicited Microsoft Quick Assist session after a vishing call. The remote operator ran brief host reconnaissance, then dropped two MSI packages from the same staging host. Stage 1 used a PDF-utility host (`pdf24.exe`) with malicious **`user.dll`** and was blocked by Defender. Stage 2 installed a Ditto-looking directory under the user profile: legitimate **`Ditto.exe`** side-loading a **fake `vcruntime140.dll`** implant, plus Startup-folder persistence.

From there the case stopped looking like "someone installed a clipboard manager." The fake runtime DLL is a MinGW/Botan RAT (same family as Stage 1 `user.dll`). It beaconed over UDP/53 to a non-resolver IP with malformed DNS payloads, and within about thirty minutes the operator had coerced DC authentication, performed DCSync, and started RDP lateral movement with a Domain Admin service account. GetScreen and DWAgent were planted for extra footholds. No ransomware was observed. The objective was durable privileged access.

## Attack Chain

```
Social engineering (vishing)
  → Quick Assist session
  → Host recon (whoami, ipconfig, net user /domain)
  → pd_53updates.msi → pdf24.exe + user.dll (blocked by Defender)
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

The entry point was not an exploit. It was a person on a phone and a built-in remote-help tool.

Microsoft Quick Assist was initiated by an external party and accepted by the user. Quick Assist runs in the logged-on user's context and is often allowed by default in enterprise environments, which makes it an attractive hands-on-keyboard vector once trust is established via vishing.

The operator did not need privilege elevation at this stage. They already had an interactive session as the victim.

## Host Reconnaissance

Within about two minutes of the session starting, standard interactive recon was observed:

```
whoami
whoami /groups
ipconfig /all
ping <internal-host>
nslookup <internal-host>
net user /domain
```

Nothing exotic. User context, network placement, reachability of internal hosts, and domain membership. Enough to decide whether the host was worth the payload.

## Payload Delivery

### Stage 1 - Blocked (pdf24 + user.dll)

First package from the staging host:

```
URL    : http://<C2-DROP>/pd_53updates.msi
SOURCE : 45.61.163.226
```

This stage attempted side-loading under a PDF-utility host (`pdf24.exe`). The malicious implant library was **`user.dll`** next to that host binary. Defender blocked the side-load attempt:

```
Potential Side-Loaded Behavior Was Blocked
```

`pdf24.exe` / the associated payload was quarantined and an alert fired. That should have been the end of the story. It was not.

String extraction from the Stage 1 implant (`user.dll`) already shows the same Botan RAT family later seen under Ditto: MinGW/GCC 13-win32, Botan 3 AES-GCM, base64 C2 `NDUuNTUuOTQuMTc0` → `45.55.94.174`, implant GUID `573d2149-b7b1-4d54-b0d4-403195f3984e`, and the JSON beacon template. Compile stamp strings include `Jun 11 2026`. Three minutes later the operator switched hosts and tried again.

### Stage 2 - Successful (Ditto + fake vcruntime140.dll)

```
URL    : http://<C2-DROP>/dt_53updates.msi
SOURCE : 45.61.163.226
SHA256 : 849a2c808694426b2afb8848dcea00f9e64538a503b05543e38af1fdee9dd9f8
SIZE   : ~4.8 MB
```

This MSI executed successfully and dropped a Ditto-shaped tree under the user profile. To a casual observer it looks like a clipboard manager install. To DFIR it is a dual-use package: legitimate `Ditto.exe` as the host, a **fake `vcruntime140.dll`** as the implant, plus other support files and a Startup shortcut for logon persistence.

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

`Ditto.exe` in this package is a real clipboard manager binary. It behaves like Ditto. The problem is not the EXE name. The problem is the **fake VC runtime DLL** sitting next to it.

When `Ditto.exe` starts, Windows resolves imports with the normal DLL search order. A local `vcruntime140.dll` is preferred over the system copy under `C:\Windows\System32\`. The legitimate process therefore loads attacker-controlled code in-process, under a trusted-looking process tree, without a standalone unsigned RAT EXE on disk.

That is DLL side-loading. Boring, and effective.

### Malicious libraries (confirmed)

Two implant names, two host packages, same RAT family:

```
Stage   Host binary     Malicious DLL        Role
------  --------------  -------------------  ------------------------------------------
1       pdf24.exe       user.dll             Side-load implant (blocked by Defender)
2       Ditto.exe       vcruntime140.dll     Fake VC++ runtime; successful side-load
```

Stage 2 focus for hunting after the blocked PDF stage:

```
Path     %LOCALAPPDATA%\Ditto\vcruntime140.dll
SHA256   9d20d9f17dddedd3ea057b68e42ef2ca86ff7c776d59b045213f377ba1707291
Role     Fake vcruntime140; Botan RAT loaded by Ditto.exe
```

Other files under `%LOCALAPPDATA%\Ditto\` complete the install appearance (MFC/VC companions, `ICU_Loader.dll`, `Addins\DittoUtil.dll`, settings/language). The implant to prioritize is the **fake `vcruntime140.dll`**. Stage 1's **`user.dll`** is the same family under the PDF host and should be treated as an earlier attempt, not a different actor.

### Why Ditto

A real clipboard manager already does things EDRs treat as suspicious in unknown binaries:

```
AddClipboardFormatListener
SetWindowsHookEx
FindShellTrayWindow
SendNotifyMessage
Process enumeration
```

Inside random malware, those APIs get attention. Inside `Ditto.exe`, they look like product behavior. The operator did not pick Ditto at random:

1. Open-source and easy to repackage
2. Legitimate distributions are unremarkable / often trusted by users
3. Clipboard, hooks, and window enumeration are expected
4. Small footprint and common enough to ignore in triage
5. Local DLL search order makes side-loading straightforward

The implant does not need to hide every capability. It needs to hide **context** by running inside a process whose job already looks like monitoring and enumeration.

### Static strings (user.dll / fake vcruntime140.dll)

Strings from the Stage 1 implant dump (`user.dll`) and consistent with the Stage 2 fake `vcruntime140.dll` family:

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

MinGW-w64 build with statically linked Botan 3. Not MSVC, not a thin .NET loader. Hand-rolled C++ with real crypto. The Stage 1 `user.dll` dump also shows heavy `userenv.dll` export-forward style strings (SysWOW64 userenv API names), consistent with a proxy/side-load library wrapper around the implant payload.

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

In practice: multi-threaded work, in-memory allocation/execution, Winsock networking, directory enumeration, host profiling, and dynamic API resolution.

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

Runtime fields include hostname, compile timestamp, architecture (`windows`), logged-on user, and PID. Beacon payload encrypted with AES-256-GCM before send.

## C2 - Malformed DNS over UDP/53

Sandbox and network telemetry repeatedly showed:

```
DESTINATION : 45.55.94.174
PORT        : 53
PROTOCOL    : UDP
ORIGIN      : %LOCALAPPDATA%\Ditto\Ditto.exe
```

Traffic was not aimed at the corporate resolver or a public DNS service. It went straight to an attacker IP listening on 53/udp. Packet contents were not valid DNS queries: close enough to look like "DNS" in NetFlow, useless as real name resolution.

This is DNS-as-transport, not DNS-as-service. Outbound 53/udp is open on most workstations. Combined with AES-GCM inside the implant, the channel is encrypted and low-suspicion unless you inspect protocol validity or destination reputation.

## Post-Exploitation

Once the implant was up, the operator moved from "foothold on one laptop" to "domain problem" quickly.

### PetitPotam / NTLM relay

About nine minutes after the successful MSI:

```
TARGET    : DC01
PIPE      : \PIPE\efsrpc
INTERFACE : EFSRPC (MS-EFSR)
```

That pattern matches PetitPotam-style coercion: abuse EFSRPC to force a remote host (here, the DC) to authenticate to an attacker-chosen destination. Immediately after, the DC opened outbound auth:

```
SOURCE : DC01 (ntoskrnl context)
DEST   : 167.172.212.171 (DigitalOcean)
```

Consistent with NTLM relay of the coerced DC authentication to external infrastructure. In a hardened environment, EFSRPC patches, SMB signing, EPA, and channel binding make this much harder. Here, it went through.

### DCSync

Eleven minutes after the first MSI:

```
OPERATION : DRSGetNCChanges
TARGET    : DC01
SOURCE    : <workstation>
```

`DRSGetNCChanges` from a workstation is the classic DCSync signal (Mimikatz, Impacket, or similar). That implies credentials with directory replication rights, most likely obtained via the relay path above, and active hash harvesting from AD.

Expect at least:

- `krbtgt`
- privileged / service account hashes
- other high-value directory secrets

KRBTGT compromise is domain-ending until a **double** KRBTGT password reset (and usually a broader credential reset). That was the correct containment recommendation and was executed later the same day.

### Privileged service account

Directory review turned up `<svc_account>`: a service account with Domain Administrator membership, no meaningful logon or source-host restrictions, and a long-unchanged password. After DCSync, the operator had its material. That account, not the DLL craft, is what made multi-host RDP trivial.

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

Three independent footholds: Ditto/Botan on the original workstation, GetScreen on the print server, DWAgent on the test server. Isolate one host and you still have two others.

## Timeline (MDT)

```
13:29  Quick Assist session established
13:31  Recon commands (whoami, ping, ipconfig, nslookup)
13:36  Stage 1 MSI downloaded from 45.61.163.226
13:38  Stage 1 side-load blocked (pdf24.exe + user.dll)
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
user.dll (Stage 1, with pdf24.exe)               Malicious implant (blocked); same Botan family as Stage 2
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

## YARA Rule

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

## Detection Opportunities

### Endpoint

- `pdf24.exe` loading `user.dll` from a non-system / drop directory (Stage 1)
- `Ditto.exe` executing from `%LOCALAPPDATA%\Ditto\` without a corresponding software inventory / install record
- `Ditto.exe` loading `vcruntime140.dll` from `%LOCALAPPDATA%\Ditto\` instead of `System32` / `SysWOW64` (Stage 2 implant)
- Hash match on fake `vcruntime140.dll` (`9d20d9f1…07291`) or Botan/string YARA hits on `user.dll` / that DLL
- `msiexec.exe` writing a new binary tree under `%LOCALAPPDATA%\Ditto\`
- Startup folder `.lnk` files pointing at `%LOCALAPPDATA%\Ditto\Ditto.exe`

### Identity

- `\PIPE\efsrpc` access to domain controllers from non-DC workstations
- `DRSGetNCChanges` from non-domain-controller hosts
- Kerberos TGS bursts without correlated interactive logon
- `<svc_account>` authenticating from unexpected hosts

### Network

- UDP/53 to non-resolver destinations (especially cloud VPS ranges)
- UDP/53 payloads that fail DNS protocol validation
- Domain controllers initiating outbound NTLM to cloud provider ranges
- Workstation traffic to DigitalOcean without legitimate SaaS correlation

### Behavioral

- Quick Assist sessions from non-corporate Microsoft accounts
- Multiple MSI downloads from the same external IP in a short window
- Remote support agents (GetScreen, DWAgent) installed on servers without change tickets

## Recommendations

### Immediate

1. Restrict Quick Assist via GPO to IT workstations that require it.
2. Block remote support installers (GetScreen, DWAgent, AnyDesk, ScreenConnect, TeamViewer) on non-IT endpoints via AppLocker or WDAC.
3. Deploy Defender for Identity (or equivalent) on all domain controllers.
4. Audit service accounts for Domain Admin membership and remove unnecessary privileges.
5. Apply PetitPotam mitigations: EFSRPC patches, SMB signing, EPA, channel binding.

### Strategic

1. Tier administrative access; block workstation-to-DC admin authentication paths.
2. Deploy LAPS for local administrator accounts.
3. Disable NTLM where Kerberos is sufficient.
4. Conditional Access policies blocking privileged accounts on standard workstations.
5. Include vishing / fake helpdesk scenarios in security awareness training.

## Root Cause

No zero-day was required. The intrusion stacked ordinary failures:

1. User accepted an unsolicited Quick Assist session.
2. A service account held Domain Administrator rights without restrictions.
3. Domain controllers lacked identity threat detection coverage.
4. Authentication coercion and NTLM relay mitigations were incomplete.
5. Outbound UDP/53 to arbitrary destinations was unrestricted.
6. Remote support software could be installed on servers without alerting.

The DLL craft and DNS C2 mattered for the foothold. The over-privileged service account and missing identity controls decided the blast radius.

