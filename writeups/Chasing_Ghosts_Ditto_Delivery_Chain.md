---
id: ditto-delivery-chain
title: "Chasing Ghosts: A Ditto Delivery Chain"
summary: "Quick Assist social engineering to DLL side-loading via Ditto, malformed DNS C2, and domain compromise in under one hour."
category: DFIR
date: 2026-04-23
tags: [quick-assist, ditto, dll-sideload, domain-compromise, social-engineering]
---

```
┌─────────────────────────────────────────────────────────────────┐
│  THREAT INTEL // CASE FILE 0x00A5                               │
│  CLASSIFICATION: PUBLIC                                          │
│  ANALYST: L. MURPHY                                              │
│  CASE NAME: CHASING GHOSTS // DITTO DELIVERY CHAIN              │
└─────────────────────────────────────────────────────────────────┘
```

# CHASING GHOSTS
## A Ditto Delivery Chain

> *"The net is vast and infinite."*
> — Ghost in the Shell

────────────────────────────────────────────────────────────

## // PROLOGUE

Some compromises start with an exploit.

Some start with a vulnerability.

This one started with a phone call.

The user picked up. The "IT technician" on the other end was polite, professional, and just helpful enough to be believable. By the time the Quick Assist banner appeared on the screen, the conversation was already over. The keyboard belonged to someone else.

What followed was not loud. It was not destructive. It was not even particularly fast — though it would soon become so.

It was patient.

It was deliberate.

It was a ghost climbing through a clipboard manager.

This is the story of how a single Quick Assist session became a domain compromise in under one hour, and how a humble open-source utility called Ditto was conscripted into one of the cleaner side-loading chains I have seen this year.

────────────────────────────────────────────────────────────

## // EXECUTIVE SUMMARY

```
┌──────────────────────────────────────────────────────────────┐
│  INCIDENT CLASS  : KRBTGT COMPROMISE / DOMAIN INTRUSION       │
│  INITIAL VECTOR  : SOCIAL ENGINEERING + QUICK ASSIST          │
│  IMPLANT TYPE    : DLL SIDE-LOADED RAT (BOTAN / AES-256-GCM)  │
│  C2 TRANSPORT    : MALFORMED DNS (UDP/53)                     │
│  TIME TO DOMAIN  : < 60 MINUTES                               │
│  RANSOMWARE      : NONE OBSERVED                              │
│  OBJECTIVE       : PRIVILEGED ACCESS, NOT DESTRUCTION          │
└──────────────────────────────────────────────────────────────┘
```

A user at a CLIENT environment was socially engineered into accepting a Microsoft Quick Assist session. The operator on the other end performed quick host reconnaissance, dropped two MSI packages — the first blocked by Defender, the second successful — and side-loaded a malicious DLL implant beneath a legitimate copy of Ditto.

The implant was modern. Statically linked Botan 3. AES-256/GCM. MinGW build. JSON beacon. Base64-encoded C2 address tunneled over UDP/53.

Within minutes, the workstation was being used as a launching pad for PetitPotam-style authentication coercion, NTLM relay, and DCSync activity against the domain controller. A service account holding Domain Administrator rights was abused for RDP-based lateral movement, and remote access utilities (GetScreen, DWAgent) were installed for long-term persistence.

The malware did not encrypt anything.

The malware did not exfiltrate large data sets.

The malware existed for one reason: to hold the door open.

────────────────────────────────────────────────────────────

## // ATTACK CHAIN AT A GLANCE

```
   ┌──────────────────────────┐
   │  SOCIAL ENGINEERING      │
   │  "IT Support" call lure  │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  QUICK ASSIST SESSION    │
   │  Interactive operator    │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  HOST RECONNAISSANCE     │
   │  whoami / ipconfig / ... │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  STAGE 1 MSI (BLOCKED)   │
   │  pd_53updates.msi        │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  STAGE 2 MSI (SUCCESS)   │
   │  dt_53updates.msi        │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  DITTO.EXE (TRUSTED)     │
   │  Side-loads malicious DLL│
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  BOTAN RAT IMPLANT       │
   │  AES-256/GCM beacon      │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  C2 OVER MALFORMED DNS   │
   │  45.55.94.174 / UDP 53   │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  PETITPOTAM + NTLM RELAY │
   │  \PIPE\efsrpc → external │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  DCSYNC                  │
   │  DRSGetNCChanges to DC1  │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  KRBTGT COMPROMISE       │
   │  Golden Ticket capable   │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  PRIVILEGED SVC ACCOUNT  │
   │  fieldsvc (Domain Admin) │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  RDP LATERAL MOVEMENT    │
   │  Print server + test box │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  REMOTE ACCESS TOOLING   │
   │  GetScreen + DWAgent     │
   └──────────────────────────┘
```

────────────────────────────────────────────────────────────

## // STAGE 0 — THE LURE

The exact pretext is not preserved, but the artifact is unmistakable. A Quick Assist session appeared on the user's workstation, initiated by an external party. The user accepted.

This is the modern face of social engineering. It does not require an attachment. It does not require a link. It does not require a vulnerability.

It requires a phone call and a willing victim.

Quick Assist is signed by Microsoft. It runs in the user's context. It is allowed by every EDR by default. From the moment the operator clicked "Take Control," every action they performed inherited the trust of the logged-on user.

The first command they typed was not malicious.

It was reconnaissance.

────────────────────────────────────────────────────────────

## // STAGE 1 — HOST RECON

Within two minutes of obtaining interactive access, the operator executed the standard hands-on-keyboard reconnaissance set:

```
whoami
whoami /groups
ipconfig /all
ping <internal-host>
nslookup <internal-host>
net user /domain
```

These commands answered four questions:

1. **Who am I?** — Current user context and group membership.
2. **Where am I?** — Internal addressing, naming, DNS configuration.
3. **Who's nearby?** — Domain relationships and resolvable infrastructure.
4. **Is this worth my time?** — Domain-joined? Privileged accounts available?

The answer to all four was apparently yes.

The tools came out next.

────────────────────────────────────────────────────────────

## // STAGE 2 — THE FIRST PAYLOAD (BLOCKED)

The operator downloaded and executed an MSI from attacker-controlled infrastructure:

```
URL    : http://<C2-DROP>/pd_53updates.msi
SOURCE : 45.61.163.226
```

This payload attempted DLL side-loading techniques against a different trusted binary. Microsoft Defender caught the behavior and generated the alert:

```
Potential Side-Loaded Behavior Was Blocked
```

The MSI was quarantined. The associated `pdf24.exe` payload was contained. The alert hit the SOC queue.

This was the first signal that something was wrong.

It was also the only thing that worked correctly in the next hour.

────────────────────────────────────────────────────────────

## // STAGE 3 — THE SECOND PAYLOAD (SUCCESS)

Three minutes later, the operator pivoted to a different MSI:

```
URL    : http://<C2-DROP>/dt_53updates.msi
SOURCE : 45.61.163.226
SHA256 : 849a2c808694426b2afb8848dcea00f9e64538a503b05543e38af1fdee9dd9f8
SIZE   : ~4.8 MB
```

This package executed successfully. It dropped the following into the user's profile directory:

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

And it created persistence through the Startup folder:

```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Ditto.lnk
```

To a casual observer this looked like a legitimate clipboard manager being installed.

To a forensic analyst it looked like a textbook DLL side-loading chain wearing a Halloween costume.

────────────────────────────────────────────────────────────

## // STAGE 4 — THE GHOST IN THE DLL

Ditto is a legitimate open-source clipboard manager. The `Ditto.exe` in this package was real. It was signed. It behaved exactly as Ditto should behave.

The malicious code lived in one of the supporting DLLs.

When `Ditto.exe` launched, Windows resolved its DLL imports in the standard search order. Because the malicious DLL lived in the same directory as the executable, it was loaded **before** the system copy from `C:\Windows\System32`.

The legitimate process loaded a malicious payload from its own folder, ran it in-process, and inherited none of the suspicion that an unsigned standalone binary would have received.

This is DLL side-loading at its most boring.

And boring is what makes it work.

### // STATIC STRING ANALYSIS

Strings extracted from the malicious DLL revealed a modern, custom-built remote access trojan. Highlights:

```
GCC: (GNU) 13-win32              ← MinGW-w64 build
libgcc_s_dw2-1.dll               ← MinGW runtime
Botan 3.0.0 (unreleased, ...)    ← Cryptography library
AES-256/GCM                      ← Symmetric encryption mode
GHASH requires a 128-bit nonce   ← Botan GCM internals
Invalid authentication tag       ← GCM tag verification
BOTAN_MLOCK_POOL_SIZE            ← Memory-locked key storage
RtlGenRandom                     ← Secure RNG via SystemFunction036
```

This was not a Visual Studio binary. This was not a .NET stub. This was not a packed commodity RAT pulled off a forum.

It was a hand-rolled C++ implant compiled with the GNU toolchain and statically linked against a serious cryptography library.

### // CAPABILITIES INFERRED FROM IMPORTS

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

Translation:

- **Multi-threaded** — One thread can beacon while another runs tasks.
- **Memory-resident** — Capable of allocating, protecting, and executing in-memory payloads.
- **Network-capable** — Full Winsock stack for sockets and DNS resolution.
- **File-aware** — Can enumerate directories and stage files for transfer.
- **Environment-aware** — Profiles host RAM, CPU, ticks, and boot characteristics.
- **Sandbox-conscious** — `IsNativeVhdBoot` and `GetTickCount` are textbook sandbox-detection probes.

### // THE BASE64 C2

The most distinctive single string in the binary:

```
NDUuNTUuOTQuMTc0
```

Decoded:

```
45.55.94.174
```

The author did not bother concealing the address behind a fancy custom cipher. They Base64-encoded it. That alone is enough to defeat the laziest string scanners — and that is all this layer of obfuscation is trying to do. The actual confidentiality is provided downstream by AES-256/GCM.

### // THE BEACON

Embedded in the binary was a JSON template that effectively describes the implant's initial check-in to its controller:

```json
{
  "name":     "%s",
  "build_date":"%s %s",
  "arch":     "windows",
  "username": "%s",
  "pid":      "%d"
}
```

At runtime, `%s` and `%d` are filled with:

- `name`       → Hostname (`COMPUTERNAME`)
- `build_date` → Compile-time `__DATE__ __TIME__` of the implant
- `arch`       → Always `windows` (suggesting cross-platform aspirations)
- `username`   → Currently logged-on user
- `pid`        → The implant's host process ID

This is the first sentence the implant says to its controller:

> *"Hello. I am alive. Here is who I am. Here is where I am. What would you like me to do?"*

It is also, conveniently, an excellent network detection opportunity — if you can decrypt the payload. Which, of course, you cannot, because it is wrapped in AES-256/GCM.

### // A NOTE ON STYLE

The choice of MinGW + Botan is uncommon. Commodity RAT builders are almost universally .NET, Delphi, or AutoIt. Crimeware-as-a-service operators rarely bother with a full-featured cryptography library when XOR will do.

Whoever built this implant cared about:

- **Cross-platform portability** (the `"arch": "windows"` field implies others exist)
- **Cryptographic hygiene** (memory-locked keys, authenticated encryption)
- **Reduced static signatures** (GCC binaries differ from MSVC heuristics)
- **Minimal external dependencies** (statically linked everything)

This is not a kid in a basement.

This is somebody's work product.

────────────────────────────────────────────────────────────

## // STAGE 5 — DNS THAT ISN'T DNS

The sandbox repeatedly observed the implant communicating with the same destination throughout execution:

```
DESTINATION : 45.55.94.174
PORT        : 53
PROTOCOL    : UDP
ORIGIN      : %LOCALAPPDATA%\Ditto\Ditto.exe
```

The traffic was not directed at the corporate resolver. It was not directed at `8.8.8.8` or `1.1.1.1`. It was sent straight to an attacker-controlled IP that happened to be listening on the standard DNS port.

Examination of the actual packet contents revealed they were not well-formed DNS queries. The payload structure was malformed — close enough to pass casual inspection in a NetFlow log, but not actually resolvable by any DNS server.

This is DNS-as-a-transport, not DNS-as-a-service. Port 53 is open outbound from almost every workstation in almost every environment on Earth. It is the closest thing the modern internet has to an unmonitored tunnel.

Combined with the AES-256/GCM payload encryption inside the DLL, the result is an encrypted, low-suspicion C2 channel that hides inside one of the most ubiquitous protocols on the network.

It is not a clever channel.

It is a tired channel.

It works because nobody looks at it.

────────────────────────────────────────────────────────────

## // STAGE 6 — WHY DITTO?

A real clipboard manager performs a long list of behaviors that, in any other context, would look suspicious:

```
AddClipboardFormatListener
SetWindowsHookEx
FindShellTrayWindow
SendNotifyMessage
EnumeratesProcesses
```

Run those API calls inside an unknown binary, and your EDR will scream.

Run those API calls inside `Ditto.exe`, and your EDR shrugs.

The operator did not choose Ditto by accident. They chose it because:

1. It is open-source — easy to modify or repackage.
2. It is signed — at least in its legitimate distribution.
3. It performs clipboard, hook, and window-enumeration behavior **by design**.
4. It is small, common, and unremarkable.
5. Its DLL search behavior makes side-loading trivial.

The malicious code did not need to hide its capabilities.

It needed to hide its **context**.

By living inside a process whose entire job is to monitor user input, enumerate windows, and react to keystrokes, the implant became indistinguishable from the application hosting it.

That is the entire trick.

────────────────────────────────────────────────────────────

## // STAGE 7 — AUTHENTICATION COERCION

Roughly nine minutes after the successful payload deployment, the workstation initiated suspicious named-pipe activity against the domain controller:

```
TARGET   : DC01
PIPE     : \PIPE\efsrpc
INTERFACE: EFSRPC (MS-EFSR)
```

This is the fingerprint of **PetitPotam** — abuse of the Encrypting File System Remote Protocol to force a remote host to authenticate to an arbitrary attacker-chosen destination.

Immediately afterward, the domain controller initiated outbound traffic:

```
SOURCE  : DC01 (ntoskrnl context)
DEST    : 167.172.212.171 (DigitalOcean)
```

This is the fingerprint of an **NTLM relay**. The coerced authentication was forwarded to an external attacker-controlled host where the credentials could be cracked or relayed onward.

In a properly hardened environment, EFSRPC patches, SMB signing, Extended Protection for Authentication, and Channel Binding would all conspire to make this very hard.

In this environment, the conversation went through.

────────────────────────────────────────────────────────────

## // STAGE 8 — DCSYNC

Eleven minutes after the first MSI, the workstation began issuing directory replication requests against the domain controller:

```
OPERATION : DRSGetNCChanges
TARGET    : DC01
SOURCE    : fld_a_<workstation>
```

`DRSGetNCChanges` is the call used by domain controllers to replicate directory data — including password hashes — to one another. When that call originates from a workstation, it is virtually always a **DCSync** attack via Mimikatz, Impacket, or a Cobalt Strike beacon kit.

The implication is unavoidable: the operator had obtained credentials with the Replicating Directory Changes privilege, almost certainly via the preceding NTLM relay, and was now harvesting password hashes from the directory.

Hash harvesting at this stage almost always includes:

- The `krbtgt` account hash
- Service account hashes
- Domain administrator hashes
- The local machine account hash of the DC itself

Obtaining the `krbtgt` hash is the end of the game in any meaningful sense. With it, the operator can forge Kerberos tickets for any user at any time — Golden Tickets — and impersonate anybody in the domain indefinitely until the `krbtgt` password is rotated twice.

The investigation team recommended exactly that: a domain-wide credential reset and a double KRBTGT reset.

That recommendation is not paranoid.

That recommendation is the only reasonable response.

────────────────────────────────────────────────────────────

## // STAGE 9 — THE SERVICE ACCOUNT

Buried in the directory was an account named `<svc_account>` — a service account that, for unclear historical reasons, had been granted **Domain Administrator** rights.

This account had:

- A password that had not rotated in years
- No interactive logon restrictions
- No source-host restrictions
- No tier-zero protections
- Domain Admin group membership

After DCSync, the operator possessed this account's hash.

After that, every server in the environment was reachable with a single RDP session and a `runas /netonly`.

This is the single biggest force multiplier in the entire intrusion. The implant was clever. The C2 was clever. The side-loading was clever. None of it would have mattered at this scale without an over-privileged service account waiting to be inherited.

────────────────────────────────────────────────────────────

## // STAGE 10 — LATERAL MOVEMENT

Using the compromised service account, the operator established interactive RDP sessions to:

```
TARGET 1 : <print-server>
TARGET 2 : <test-server>
PROTOCOL : RDP (TCP/3389)
ACCOUNT  : <svc_account>
```

On each host, additional persistence tooling was deployed:

```
<print-server> :  GetScreen.me agent
<test-server>  :  DWAgent
```

Both are legitimate commercial remote support utilities. Neither triggered Defender. Both phone home to vendor infrastructure, which then exposes a control channel back to whoever holds the corresponding account on the vendor side.

This is the modern equivalent of "leave the back door propped open with a brick." The brick is signed by a reputable vendor.

The operator now had at least three independent footholds:

1. The implant on the original workstation (until isolated)
2. GetScreen on the print server
3. DWAgent on the test box

Any one of them was enough to survive containment of the others.

────────────────────────────────────────────────────────────

## // TIMELINE (ALL TIMES MDT)

```
13:29  Quick Assist session established on workstation
13:31  Recon commands executed (whoami, ping, ipconfig, nslookup)
13:36  Stage 1 MSI downloaded from 45.61.163.226
13:38  Stage 1 side-load attempt blocked by Defender
13:39  Defender alert generated → SOC queue
13:39  Stage 2 MSI (dt_53updates.msi) downloaded
13:43  Halo ITSM ticket created
13:45  Internal enumeration (Kerberos, LDAP, SMB, RDP)
13:47  PetitPotam activity targeting DC01 (\PIPE\efsrpc)
13:48  DC01 authenticates outbound to 167.172.212.171
13:48  Authentication coercion confirmed
13:57  pdf24.exe execution blocked by Defender
13:59  DCSync activity (DRSGetNCChanges) observed
14:01  Kerberos service ticket requests against DC01
14:09  RDP to <test-server> using <svc_account>
14:11  Ticket escalated to Tier 2
14:14  RDP to <print-server> using <svc_account>
14:15  GetScreen.me downloaded
14:17  GetScreen persistence established on <print-server>
14:17  DWAgent deployed on <test-server>
15:11  Tier 2 analyst accepts incident
15:53  Workstation isolated
18:28  Initial escalation sent to client IT
20:04  Bridge call initiated with client on-call
~21:00 Domain-wide password reset + double KRBTGT reset
```

From first foothold to multi-host persistence: **48 minutes.**

From first foothold to KRBTGT compromise: **30 minutes.**

────────────────────────────────────────────────────────────

## // MITRE ATT&CK MAPPING

| Tactic               | Technique                                   | ID        |
| -------------------- | ------------------------------------------- | --------- |
| Initial Access       | Remote Services: Quick Assist abuse         | T1219     |
| Initial Access       | Phishing: Voice / Vishing                   | T1566.004 |
| Execution            | User Execution: Malicious File (MSI)        | T1204.002 |
| Execution            | Command and Scripting Interpreter           | T1059     |
| Persistence          | Boot or Logon Autostart: Startup Folder     | T1547.001 |
| Persistence          | Remote Access Software (GetScreen, DWAgent) | T1219     |
| Privilege Escalation | Domain Policy Modification (svc account)    | T1484     |
| Defense Evasion      | Hijack Execution Flow: DLL Side-Loading     | T1574.002 |
| Defense Evasion      | Obfuscated Files or Information (Base64 C2) | T1027     |
| Defense Evasion      | Masquerading: Match Legitimate Name         | T1036.005 |
| Credential Access    | Forced Authentication (PetitPotam)          | T1187     |
| Credential Access    | OS Credential Dumping: DCSync               | T1003.006 |
| Credential Access    | Steal or Forge Kerberos Tickets (KRBTGT)    | T1558     |
| Discovery            | System Information Discovery                | T1082     |
| Discovery            | System Network Configuration Discovery      | T1016     |
| Discovery            | Account Discovery: Domain Account           | T1087.002 |
| Lateral Movement     | Remote Services: RDP                        | T1021.001 |
| Command and Control  | Application Layer Protocol: DNS             | T1071.004 |
| Command and Control  | Encrypted Channel: Symmetric (AES-GCM)      | T1573.001 |
| Command and Control  | Non-Standard Port (DNS-as-transport)        | T1571     |

────────────────────────────────────────────────────────────

## // INDICATORS OF COMPROMISE

### // Network

```
45.55.94.174       — C2 (DNS-tunneled, UDP/53, embedded in DLL)
45.61.163.226      — MSI staging host
167.172.212.171    — NTLM relay endpoint (DigitalOcean)
```

### // Encoded Strings

```
NDUuNTUuOTQuMTc0   — Base64-encoded form of 45.55.94.174
```

### // Files

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

### // Persistence

```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Ditto.lnk
```

### // Unique Implant Identifier

```
573d2149-b7b1-4d54-b0d4-403195f3984e
```

### // Build Artifacts

```
"Botan 3.0.0 (unreleased, revision unknown)"
"AES-256/GCM"
"GCC: (GNU) 13-win32"
"libgcc_s_dw2-1.dll"
"Mingw-w64 runtime failure"
"BOTAN_MLOCK_POOL_SIZE"
```

────────────────────────────────────────────────────────────

## // YARA — CONCEPTUAL

```
rule Ditto_BotanRAT_Implant
{
    meta:
        author      = "L. Murphy"
        description = "Detects Ditto-side-loaded Botan RAT implant"
        case_file   = "0x00A5"
        tlp         = "CLEAR"

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

────────────────────────────────────────────────────────────

## // DETECTION OPPORTUNITIES

### // Endpoint

- Alert on `Ditto.exe` executing from `%LOCALAPPDATA%\Ditto\` when no corresponding install record exists in the package manager.
- Alert on any process loading `vcruntime140.dll` or `msvcp140.dll` from a non-system path.
- Alert on `msiexec.exe` invoking `WriteProcessMemory` into a freshly spawned binary in `%LOCALAPPDATA%`.
- Alert on Startup folder `.lnk` creation pointing to `%LOCALAPPDATA%` paths.

### // Identity

- Alert on `\PIPE\efsrpc` named-pipe access against domain controllers from non-administrative workstations.
- Alert on `DRSGetNCChanges` requests originating from non-domain-controller hosts.
- Alert on Kerberos AS-REQ / TGS-REQ bursts that don't correlate to user interactive logon events.
- Alert on the use of `<svc_account>` from any host other than its designated service host.

### // Network

- Alert on UDP/53 traffic to non-resolver destinations.
- Alert on outbound UDP/53 with payloads that fail DNS protocol validation.
- Alert on workstation traffic toward DigitalOcean ranges that do not correlate to legitimate SaaS usage.
- Alert on domain controllers initiating outbound NTLM authentication.

### // Behavioral

- Quick Assist sessions initiated by external Microsoft accounts (non-corporate `@outlook.com`, `@hotmail.com`, etc.).
- Multiple MSI downloads from the same IP within a short window.
- New remote-support agents (GetScreen, DWAgent, AnyDesk, ScreenConnect) installed on servers without change tickets.

────────────────────────────────────────────────────────────

## // DEFENDER RECOMMENDATIONS

### // Immediate

1. **Block Quick Assist** at the GPO level except for IT-staff workstations that genuinely require it.
2. **Block known remote-support agent installers** (GetScreen, DWAgent, AnyDesk, ScreenConnect, TeamViewer) on non-IT endpoints via AppLocker / WDAC.
3. **Deploy Defender for Identity sensors** on every domain controller, AD FS server, and AD CS server. No exceptions.
4. **Audit every service account for Domain Admin membership.** Remove. Replace with delegated permissions or gMSAs.
5. **Patch and harden against PetitPotam** — EFSRPC mitigations, SMB signing, EPA, channel binding, and NTLM auditing.

### // Strategic

1. **Tier the environment.** Workstations should not be able to authenticate to domain controllers as administrators. Period.
2. **Adopt LAPS for local admin accounts.** A different password on every host changes the math for lateral movement.
3. **Move toward Kerberos-only authentication** where feasible, and disable NTLM where it is not.
4. **Implement Conditional Access policies** that prevent privileged accounts from logging on to standard user workstations.
5. **Train users specifically on remote support social engineering.** Phishing tests should include voice-based scenarios, not just email.

────────────────────────────────────────────────────────────

## // WHY THIS ATTACK WORKED

This intrusion was not technically remarkable. There was no zero-day. There was no novel exploit. There was no exotic post-exploitation framework.

It worked because:

1. **A human said yes** to a Quick Assist prompt they did not understand.
2. **A service account** held privileges it did not need.
3. **A domain controller** was missing identity sensors.
4. **Authentication coercion mitigations** were not in place.
5. **NTLM** was still enabled in environments where it could be relayed.
6. **Outbound UDP/53** to arbitrary IPs was not restricted.
7. **Remote-support agents** could be installed on servers without alerts.

Every one of those is a configuration choice.

Every one of those is fixable.

The operator did not break in.

The operator walked in through doors that were already open.

────────────────────────────────────────────────────────────

## // EPILOGUE

The malware in this case was, in many ways, the least interesting part of the story.

The DLL was well-built. The encryption was clean. The C2 was hidden in plain sight. The side-loading was textbook. Any one of those details, in isolation, would make for a respectable conference talk.

But none of those details mattered as much as the moment the user clicked "Allow."

Modern intrusions do not look like the ones in the training videos. There is no flashing skull. There is no dramatic music. There is no ransom note on the lock screen at 3 a.m.

There is a polite voice on the phone, a familiar-looking prompt on the screen, and a quiet little clipboard manager that appears in the Startup folder.

There is a DLL that wakes up every time the user logs in.

There is an encrypted whisper to a server somewhere on the other side of the world.

There is an operator on the other end of that whisper, drinking coffee, watching their dashboard, and waiting.

Most of the time, by the time anybody notices the ghost in the machine, the ghost is already wearing the machine's clothes.

The net is vast and infinite.

So is the patience of the people who hunt it.

> *— L. Murphy*
> *Case File 0x00A5 // CLOSED*

────────────────────────────────────────────────────────────

```
┌─────────────────────────────────────────────────────────────────┐
│  END OF FILE                                                     │
│  CHASING GHOSTS // DITTO DELIVERY CHAIN                         │
│  CASE 0x00A5                                                     │
└─────────────────────────────────────────────────────────────────┘
```
