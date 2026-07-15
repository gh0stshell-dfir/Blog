---
id: ditto-delivery-chain
title: "Ditto DLL Side-Loading and Domain Compromise"
summary: "Quick Assist social engineering to Ditto DLL side-loading, malformed DNS C2, and KRBTGT compromise in under one hour."
category: DFIR
date: 2026-06-24
tags: [quick-assist, ditto, dll-sideload, domain-compromise, social-engineering]
---

# Ditto DLL Side-Loading and Domain Compromise

## Summary

```
CLASS      : KRBTGT compromise / domain intrusion
VECTOR     : Vishing + Microsoft Quick Assist
IMPLANT    : DLL side-loaded RAT (Botan 3, AES-256-GCM, MinGW)
C2         : Malformed DNS over UDP/53 → 45.55.94.174
TTX        : Domain compromise < 60 minutes
RANSOMWARE : Not observed
OBJECTIVE  : Persistent privileged access
```

Unsolicited Quick Assist session after a vishing call. Operator ran host recon, deployed two MSI packages (first blocked by Defender, second successful), and established persistence via a side-loaded DLL under a legitimate Ditto install.

Within 30 minutes: PetitPotam-style coercion, NTLM relay, and DCSync against the domain controller. A Domain Admin service account was used for RDP lateral movement. GetScreen and DWAgent were installed for additional persistence.

## Attack Chain

```
Social engineering (vishing)
  → Quick Assist session
  → Host recon (whoami, ipconfig, net user /domain)
  → pd_53updates.msi (blocked by Defender)
  → dt_53updates.msi (successful)
  → Ditto.exe side-loads malicious DLL
  → Botan RAT beacon (AES-256-GCM, UDP/53 C2)
  → PetitPotam (\PIPE\efsrpc → DC01)
  → NTLM relay (DC01 → 167.172.212.171)
  → DCSync (DRSGetNCChanges)
  → KRBTGT hash extraction
  → Lateral movement via <svc_account> (RDP)
  → GetScreen + DWAgent persistence
```

## Initial Access

A Quick Assist session was initiated by an external party and accepted by the user. Quick Assist runs with the logged-on user's context and is typically allowed by default in enterprise environments.

The operator's first actions were standard interactive reconnaissance.

## Host Reconnaissance

Commands observed within two minutes of session start:

```
whoami
whoami /groups
ipconfig /all
ping <internal-host>
nslookup <internal-host>
net user /domain
```

These establish user context, network placement, reachable internal hosts, and domain membership.

## Payload Delivery

### Stage 1 — Blocked

```
URL    : http://<C2-DROP>/pd_53updates.msi
SOURCE : 45.61.163.226
```

Defender blocked the side-load attempt:

```
Potential Side-Loaded Behavior Was Blocked
```

The associated `pdf24.exe` payload was quarantined and an alert was generated.

### Stage 2 — Successful

Three minutes later, a second MSI was retrieved:

```
URL    : http://<C2-DROP>/dt_53updates.msi
SOURCE : 45.61.163.226
SHA256 : 849a2c808694426b2afb8848dcea00f9e64538a503b05543e38af1fdee9dd9f8
SIZE   : ~4.8 MB
```

Files dropped to `%LOCALAPPDATA%\Ditto\`:

```
%LOCALAPPDATA%\Ditto\Ditto.exe
%LOCALAPPDATA%\Ditto\mfc140u.dll
%LOCALAPPDATA%\Ditto\vcruntime140.dll
%LOCALAPPDATA%\Ditto\vcruntime140u.dll
%LOCALAPPDATA%\Ditto\msvcp140.dll
%LOCALAPPDATA%\Ditto\ICU_Loader.dll
%LOCALAPPDATA%\Ditto\Addins\DittoUtil.dll
%LOCALAPPDATA%\Ditto\language\English.xml
%LOCALAPPDATA%\Ditto\Ditto.Settings
```

Persistence via Startup folder shortcut:

```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Ditto.lnk
```

## DLL Side-Loading

`Ditto.exe` is a legitimate clipboard manager. The malicious code resides in a supporting DLL loaded via standard DLL search order — the local copy in `%LOCALAPPDATA%\Ditto\` resolves before `C:\Windows\System32\`.

Ditto's legitimate behavior (clipboard hooks, window enumeration, process listing) provides cover for similar API usage by the implant.

### Static Analysis — Implant Strings

```
GCC: (GNU) 13-win32
libgcc_s_dw2-1.dll
Botan 3.0.0 (unreleased, ...)
AES-256/GCM
GHASH requires a 128-bit nonce
Invalid authentication tag
BOTAN_MLOCK_POOL_SIZE
RtlGenRandom
```

MinGW-w64 build with statically linked Botan 3 cryptography. Uncommon compared to typical .NET or Delphi commodity RATs.

### Imports and Capabilities

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

### C2 Address (Base64)

```
NDUuNTUuOTQuMTc0  →  45.55.94.174
```

### Beacon Format

```json
{
  "name":     "%s",
  "build_date":"%s %s",
  "arch":     "windows",
  "username": "%s",
  "pid":      "%d"
}
```

Runtime fields: hostname, compile timestamp, architecture (`windows`), logged-on user, process ID. Payload is encrypted with AES-256-GCM before transmission.

## C2 — Malformed DNS over UDP/53

```
DESTINATION : 45.55.94.174
PORT        : 53
PROTOCOL    : UDP
ORIGIN      : %LOCALAPPDATA%\Ditto\Ditto.exe
```

Traffic was sent directly to the attacker IP, not to the corporate resolver. Packet inspection showed malformed DNS payloads — sufficient to blend into NetFlow as DNS traffic but not valid queries. Port 53 outbound is commonly unrestricted; payload encryption prevents content inspection without endpoint visibility.

## Post-Exploitation

### PetitPotam / NTLM Relay

Nine minutes after payload deployment:

```
TARGET   : DC01
PIPE     : \PIPE\efsrpc
INTERFACE: EFSRPC (MS-EFSR)
```

Followed by outbound authentication from the DC:

```
SOURCE  : DC01 (ntoskrnl context)
DEST    : 167.172.212.171 (DigitalOcean)
```

Consistent with coerced DC authentication relayed to an external attacker host.

### DCSync

Eleven minutes after the first MSI:

```
OPERATION : DRSGetNCChanges
TARGET    : DC01
SOURCE    : <workstation>
```

`DRSGetNCChanges` from a workstation indicates DCSync (Mimikatz, Impacket, or equivalent). This typically yields `krbtgt`, service account, and domain admin hashes. KRBTGT compromise enables Golden Ticket forgery until a double KRBTGT password reset is performed.

### Privileged Service Account

A service account (`<svc_account>`) held Domain Administrator membership with no logon restrictions, no source-host restrictions, and a long-unchanged password. Post-DCSync, this account was used for RDP to additional hosts.

### Lateral Movement and Persistence

RDP sessions using `<svc_account>`:

```
TARGET 1 : <print-server>
TARGET 2 : <test-server>
PROTOCOL : RDP (TCP/3389)
```

Additional remote access tools deployed:

```
<print-server> : GetScreen.me agent
<test-server>  : DWAgent
```

Three independent footholds resulted: the Ditto implant, GetScreen on the print server, and DWAgent on the test server.

## Timeline (MDT)

```
13:29  Quick Assist session established
13:31  Recon commands (whoami, ping, ipconfig, nslookup)
13:36  Stage 1 MSI downloaded from 45.61.163.226
13:38  Stage 1 side-load blocked by Defender
13:39  Defender alert → SOC queue
13:39  Stage 2 MSI (dt_53updates.msi) downloaded
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
45.55.94.174       — C2 (DNS-tunneled, UDP/53)
45.61.163.226      — MSI staging host
167.172.212.171    — NTLM relay endpoint (DigitalOcean)
```

### Encoded Strings

```
NDUuNTUuOTQuMTc0   — Base64 for 45.55.94.174
```

### Files

```
dt_53updates.msi
  SHA256 : 849a2c808694426b2afb8848dcea00f9e64538a503b05543e38af1fdee9dd9f8

%LOCALAPPDATA%\Ditto\Ditto.exe
  SHA256 : b120f170046b0ba5952d4957dd25e0a394ad28f743b47f2152c973e9fd94f08d

%LOCALAPPDATA%\Ditto\mfc140u.dll
  SHA256 : 27ebf5ed915a573aa10a4ec18b3626a297032f3c46afc2daf45d8bb1ffecfe66

%LOCALAPPDATA%\Ditto\msvcp140.dll
  SHA256 : 968bbd2a36b04cc5795c6fc99afe85e4d294ff9c28032ce0e870463827181799

%LOCALAPPDATA%\Ditto\vcruntime140.dll
  SHA256 : 9d20d9f17dddedd3ea057b68e42ef2ca86ff7c776d59b045213f377ba1707291

%LOCALAPPDATA%\Ditto\vcruntime140u.dll
  SHA256 : eb6a3a491efcc911f9dff457d42fed85c4c170139414470ea951b0dafe352829

%LOCALAPPDATA%\Ditto\ICU_Loader.dll
  SHA256 : 15a9c2550759eee371d57fa69e4d7d596235f2f061cd17ca123cba535a24fbcd

%LOCALAPPDATA%\Ditto\Addins\DittoUtil.dll
  SHA256 : 1ba47b26175855cba499ff8e951af5193e662319e96d497f4270daac440da1fd
```

### Persistence

```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Ditto.lnk
```

### Implant Identifier

```
573d2149-b7b1-4d54-b0d4-403195f3984e
```

### Build Artifacts

```
"Botan 3.0.0 (unreleased, revision unknown)"
"AES-256/GCM"
"GCC: (GNU) 13-win32"
"libgcc_s_dw2-1.dll"
"BOTAN_MLOCK_POOL_SIZE"
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

- `Ditto.exe` executing from `%LOCALAPPDATA%\Ditto\` without a corresponding install record
- `vcruntime140.dll` or `msvcp140.dll` loaded from non-system paths
- `msiexec.exe` writing into a new binary under `%LOCALAPPDATA%`
- Startup folder `.lnk` files pointing to `%LOCALAPPDATA%` paths

### Identity

- `\PIPE\efsrpc` access to domain controllers from non-DC workstations
- `DRSGetNCChanges` from non-domain-controller hosts
- Kerberos TGS bursts without correlated interactive logon
- `<svc_account>` authenticating from unexpected hosts

### Network

- UDP/53 to non-resolver destinations
- UDP/53 payloads failing DNS protocol validation
- Domain controllers initiating outbound NTLM to cloud provider ranges
- Workstation traffic to DigitalOcean without legitimate SaaS correlation

### Behavioral

- Quick Assist sessions from non-corporate Microsoft accounts
- Multiple MSI downloads from the same external IP in a short window
- Remote support agents installed on servers without change tickets

## Recommendations

### Immediate

1. Restrict Quick Assist via GPO to IT workstations that require it.
2. Block remote support installers (GetScreen, DWAgent, AnyDesk, ScreenConnect, TeamViewer) on non-IT endpoints via AppLocker or WDAC.
3. Deploy Defender for Identity on all domain controllers.
4. Audit service accounts for Domain Admin membership and remove unnecessary privileges.
5. Apply PetitPotam mitigations: EFSRPC patches, SMB signing, EPA, channel binding.

### Strategic

1. Tier administrative access; block workstation-to-DC admin authentication paths.
2. Deploy LAPS for local administrator accounts.
3. Disable NTLM where Kerberos is sufficient.
4. Conditional Access policies blocking privileged accounts on standard workstations.
5. Include vishing scenarios in security awareness training.

## Root Cause

No zero-day or novel exploit was used. Contributing factors:

1. User accepted an unsolicited Quick Assist session.
2. A service account held Domain Administrator rights without restrictions.
3. Domain controllers lacked identity threat detection coverage.
4. Authentication coercion and NTLM relay mitigations were incomplete.
5. Outbound UDP/53 to arbitrary destinations was unrestricted.
6. Remote support software could be installed on servers without alerting.