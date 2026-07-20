/**
 * DFIR Artifact Cheat Sheet data.
 * Categories and items ordered by day-to-day investigation value (core first).
 * tier: "core" = high-frequency / expected on most Windows IR engagements.
 */
window.GHOST_ARTIFACTS = [
  {
    id: "execution",
    title: "Execution Evidence",
    icon: "fa-terminal",
    defaultOpen: true,
    artifacts: [
      {
        id: "prefetch",
        name: "Prefetch",
        tier: "core",
        description: "Execution evidence - run count, last run times, files loaded into the process.",
        paths: ["C:\\Windows\\Prefetch\\*.pf", "%SystemRoot%\\Prefetch\\"],
        registry: null,
        parser: "PECmd (Eric Zimmerman)",
        notes: "Disabled on some SSD systems (SysMain). Win11 uses hash-based names."
      },
      {
        id: "amcache",
        name: "AmCache.hve",
        tier: "core",
        description: "Program execution, file SHA1, PE compile times, install evidence.",
        paths: ["C:\\Windows\\AppCompat\\Programs\\Amcache.hve"],
        registry: null,
        parser: "AmcacheParser, Amcache.py, Registry Explorer",
        notes: "Win8+. High-value execution artifact even when Prefetch is missing."
      },
      {
        id: "shimcache",
        name: "ShimCache (AppCompatCache)",
        tier: "core",
        description: "Application compatibility cache - evidence a binary was seen on the system.",
        paths: ["SYSTEM hive → ControlSet00X\\Control\\Session Manager\\AppCompatCache"],
        registry: "SYSTEM\\ControlSet001\\Control\\Session Manager\\AppCompatCache",
        parser: "AppCompatCacheParser, ShimCacheParser, regripper",
        notes: "Win8+ includes timestamps. Survives file deletion."
      },
      {
        id: "bam-dam",
        name: "BAM / DAM",
        tier: "core",
        description: "Background/Desktop Activity Moderator - process execution with last-run timestamp.",
        paths: [
          "SYSTEM hive → Services\\bam\\State\\UserSettings\\<SID>",
          "SYSTEM hive → Services\\dam\\State\\UserSettings\\<SID>"
        ],
        registry: "SYSTEM\\CurrentControlSet\\Services\\bam\\State\\UserSettings",
        parser: "bam-parser, Registry Explorer",
        notes: "Win10 1709+. Per-user SID subkeys. Very reliable execution evidence."
      },
      {
        id: "userassist",
        name: "UserAssist",
        tier: "core",
        description: "GUI program execution - run count and last executed (ROT13-encoded names).",
        paths: ["NTUSER.DAT → Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist"],
        registry: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist\\{GUID}\\Count",
        parser: "UserAssistView, regripper, Registry Explorer",
        notes: "Tracks Explorer-launched programs. Decode ROT13 for the path."
      },
      {
        id: "srum",
        name: "SRUM",
        tier: "core",
        description: "System Resource Usage Monitor - app resource usage and network bytes per app/user.",
        paths: ["C:\\Windows\\System32\\sru\\SRUDB.dat"],
        registry: null,
        parser: "SrumECmd, srum-dump",
        notes: "ESE database. Pair with SOFTWARE hive for context."
      },
      {
        id: "muicache",
        name: "MUICache",
        description: "Executed program friendly names from Open/Save dialogs and shell launches.",
        paths: ["UsrClass.dat → Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache"],
        registry: "HKCU\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache",
        parser: "Registry Explorer, regripper",
        notes: "Shows apps run via shell even if the binary was deleted."
      },
      {
        id: "compatibility-assistant",
        name: "Program Compatibility Assistant (PCA)",
        description: "Tracks executables that triggered compatibility dialogs.",
        paths: [
          "C:\\Windows\\appcompat\\pca\\PcaAppLaunchDic.txt",
          "C:\\Windows\\appcompat\\pca\\PcaGeneralDb0.txt"
        ],
        registry: null,
        parser: "Manual review, PcaParser",
        notes: "Win10+. Supplement to AmCache / Prefetch."
      },
      {
        id: "wer",
        name: "Windows Error Reporting (WER)",
        description: "Crash reports - executable name, path, faulting module, timestamp.",
        paths: [
          "C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportArchive\\",
          "C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue\\"
        ],
        registry: null,
        parser: "AppCrashView, WER parsers",
        notes: "Proves a program ran and crashed even if deleted afterward."
      }
    ]
  },
  {
    id: "file-access",
    title: "File Access & User Activity",
    icon: "fa-folder-open",
    defaultOpen: true,
    artifacts: [
      {
        id: "lnk",
        name: "LNK Files (Shortcuts)",
        tier: "core",
        description: "Shortcut metadata - target path, volume serial, MAC times, network paths.",
        paths: [
          "%APPDATA%\\Microsoft\\Windows\\Recent\\*.lnk",
          "%APPDATA%\\Microsoft\\Office\\Recent\\*.lnk",
          "%USERPROFILE%\\Desktop\\*.lnk"
        ],
        registry: null,
        parser: "LECmd (Eric Zimmerman)",
        notes: "Recent folder is high-value for user activity timelines."
      },
      {
        id: "jump-lists",
        name: "Jump Lists",
        tier: "core",
        description: "Recent files/apps per application - automatic and custom destinations.",
        paths: [
          "%APPDATA%\\Microsoft\\Windows\\Recent\\AutomaticDestinations\\*.automaticDestinations-ms",
          "%APPDATA%\\Microsoft\\Windows\\Recent\\CustomDestinations\\*.customDestinations-ms"
        ],
        registry: null,
        parser: "JLECmd",
        notes: "AppID maps to executable; strong for Office/browser activity."
      },
      {
        id: "shellbags",
        name: "ShellBags",
        tier: "core",
        description: "Folder access history - window size/position and viewed folders (even deleted).",
        paths: [
          "UsrClass.dat → ...\\Shell\\BagMRU",
          "UsrClass.dat → ...\\Shell\\Bags"
        ],
        registry: "HKCU\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\BagMRU",
        parser: "SBECmd, ShellBags Explorer",
        notes: "Stored in UsrClass.dat, not NTUSER.DAT. Proves a folder was browsed."
      },
      {
        id: "recentdocs",
        name: "RecentDocs",
        tier: "core",
        description: "Recently opened documents by extension and MRU list.",
        paths: ["NTUSER.DAT → Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs"],
        registry: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs",
        parser: "Registry Explorer, regripper",
        notes: "Subkeys per file extension (.doc, .pdf, etc.)."
      },
      {
        id: "typedpaths",
        name: "TypedPaths / TypedURLs",
        description: "User-typed paths in Explorer address bar and legacy IE URL bar.",
        paths: [
          "NTUSER.DAT → ...\\Explorer\\TypedPaths",
          "NTUSER.DAT → ...\\Internet Explorer\\TypedURLs"
        ],
        registry: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths",
        parser: "Registry Explorer",
        notes: "TypedURLs for IE; modern Edge uses WebCache / Chromium history."
      },
      {
        id: "recycle-bin",
        name: "$Recycle.Bin",
        tier: "core",
        description: "Deleted files with original path and deletion timestamp ($I / $R).",
        paths: ["C:\\$Recycle.Bin\\<SID>\\$I*", "C:\\$Recycle.Bin\\<SID>\\$R*"],
        registry: null,
        parser: "RBCmd, Autopsy",
        notes: "Per-user SID folders. $I = metadata, $R = content."
      },
      {
        id: "thumbcache",
        name: "Thumbcache",
        description: "Thumbnail database - proves a folder/image was viewed in Explorer.",
        paths: ["%LOCALAPPDATA%\\Microsoft\\Windows\\Explorer\\thumbcache_*.db"],
        registry: null,
        parser: "ThumbcacheViewer, ThumbcacheParser",
        notes: "Multiple thumbcache_NN.db files by resolution."
      },
      {
        id: "timeline",
        name: "ActivitiesCache.db (Timeline)",
        description: "Windows Timeline / Activity History - app usage across devices.",
        paths: ["%LOCALAPPDATA%\\ConnectedDevicesPlatform\\<ID>\\ActivitiesCache.db"],
        registry: null,
        parser: "WxTCmd, SQLite browser",
        notes: "Win10 1803+. May sync if a Microsoft account is linked."
      },
      {
        id: "zone-identifier",
        name: "Zone.Identifier (ADS)",
        tier: "core",
        description: "Mark-of-the-Web - proves a file was downloaded from the internet/zone.",
        paths: ["<file>:Zone.Identifier (NTFS Alternate Data Stream)"],
        registry: null,
        parser: "streams.exe, LECmd, Get-Content -Stream Zone.Identifier",
        notes: "Not a single path - ADS attached to downloaded files. ZoneId=3 = Internet."
      }
    ]
  },
  {
    id: "event-logs",
    title: "Event Logs",
    icon: "fa-scroll",
    defaultOpen: true,
    artifacts: [
      {
        id: "security-evtx",
        name: "Security.evtx",
        tier: "core",
        description: "Logons (4624/4625), process creation (4688), privilege use, object access.",
        paths: ["C:\\Windows\\System32\\winevt\\Logs\\Security.evtx"],
        registry: null,
        parser: "EvtxECmd, chainsaw, Event Log Explorer",
        notes: "4688 needs audit policy. Often overwritten when full - grab early."
      },
      {
        id: "powershell-evtx",
        name: "PowerShell Operational",
        tier: "core",
        description: "Script block logging (4104), module logging, engine start/stop.",
        paths: ["C:\\Windows\\System32\\winevt\\Logs\\Microsoft-Windows-PowerShell%4Operational.evtx"],
        registry: null,
        parser: "EvtxECmd, chainsaw (Sigma)",
        notes: "4104 script blocks are gold for IR when GPO-enabled."
      },
      {
        id: "system-evtx",
        name: "System.evtx",
        tier: "core",
        description: "Service/driver events, crashes, time changes, patch install.",
        paths: ["C:\\Windows\\System32\\winevt\\Logs\\System.evtx"],
        registry: null,
        parser: "EvtxECmd, chainsaw",
        notes: "Event 7045 = new service installed."
      },
      {
        id: "rdp-evtx",
        name: "TerminalServices / RDP",
        tier: "core",
        description: "RDP logon success/fail, reconnect, session disconnect.",
        paths: [
          "Microsoft-Windows-TerminalServices-LocalSessionManager%4Operational.evtx",
          "Microsoft-Windows-TerminalServices-RemoteConnectionManager%4Operational.evtx"
        ],
        registry: null,
        parser: "EvtxECmd, chainsaw",
        notes: "1149 = successful RDP auth. Correlate with Security 4624 Type 10."
      },
      {
        id: "defender-evtx",
        name: "Windows Defender",
        description: "Malware detections, quarantine actions, scan results.",
        paths: [
          "Microsoft-Windows-Windows Defender%4Operational.evtx",
          "Microsoft-Windows-Windows Defender%4WHC.evtx"
        ],
        registry: null,
        parser: "EvtxECmd, Defender UI",
        notes: "Quarantine: C:\\ProgramData\\Microsoft\\Windows Defender\\Quarantine\\"
      },
      {
        id: "taskscheduler-evtx",
        name: "Task Scheduler Operational",
        description: "Task created, deleted, executed - ties directly to persistence.",
        paths: ["Microsoft-Windows-TaskScheduler%4Operational.evtx"],
        registry: null,
        parser: "EvtxECmd",
        notes: "106 = registered, 140 = updated, 200/201 = execution."
      },
      {
        id: "application-evtx",
        name: "Application.evtx",
        description: "Application errors and installs - MSI, app crashes.",
        paths: ["C:\\Windows\\System32\\winevt\\Logs\\Application.evtx"],
        registry: null,
        parser: "EvtxECmd",
        notes: null
      },
      {
        id: "sysmon",
        name: "Sysmon Event Log",
        description: "Process create, network connect, file create - if Sysmon is installed.",
        paths: ["Microsoft-Windows-Sysmon/Operational.evtx"],
        registry: null,
        parser: "SysmonView, chainsaw, Event Log Explorer",
        notes: "Not default; gold when present. Config often at C:\\Windows\\Sysmon.cfg."
      }
    ]
  },
  {
    id: "persistence",
    title: "Persistence & Autostart",
    icon: "fa-thumbtack",
    defaultOpen: false,
    artifacts: [
      {
        id: "run-keys",
        name: "Run / RunOnce Keys",
        tier: "core",
        description: "Programs set to run at logon - classic persistence.",
        paths: ["NTUSER.DAT + SOFTWARE hive"],
        registry: "HKCU/HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run | RunOnce",
        parser: "Autoruns, regripper",
        notes: "Check both HKCU and HKLM. Also RunOnceEx, Policies\\Explorer\\Run."
      },
      {
        id: "tasks",
        name: "Scheduled Tasks",
        tier: "core",
        description: "Scheduled job definitions - persistence and timed execution.",
        paths: ["C:\\Windows\\System32\\Tasks\\", "C:\\Windows\\Tasks\\"],
        registry: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\TaskCache",
        parser: "Autoruns, schtasks /query, task XML parsers",
        notes: "XML under System32\\Tasks mirrors the registry TaskCache."
      },
      {
        id: "services",
        name: "Windows Services",
        tier: "core",
        description: "Service binaries and start type - persistence via service install.",
        paths: ["SYSTEM hive → Services"],
        registry: "HKLM\\SYSTEM\\CurrentControlSet\\Services",
        parser: "Autoruns, sc query, Registry Explorer",
        notes: "Review ImagePath for unexpected binaries. Pair with System 7045."
      },
      {
        id: "startup",
        name: "Startup Folder",
        description: "Programs launched at user logon via Start Menu Startup.",
        paths: [
          "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\",
          "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\"
        ],
        registry: null,
        parser: "Autoruns",
        notes: "Per-user and all-users locations."
      },
      {
        id: "wmi",
        name: "WMI Repository",
        description: "WMI permanent event subscriptions - common fileless persistence.",
        paths: ["C:\\Windows\\System32\\wbem\\Repository\\"],
        registry: "HKLM\\SOFTWARE\\Microsoft\\WBEM",
        parser: "Autoruns, PyWMIPersistenceFinder",
        notes: "Check __EventFilter, __EventConsumer, __FilterToConsumerBinding."
      },
      {
        id: "powershell-history",
        name: "PowerShell Console History",
        tier: "core",
        description: "PSReadLine command history - typed PowerShell commands.",
        paths: ["%APPDATA%\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt"],
        registry: null,
        parser: "Manual review",
        notes: "Per-user. Default on Win10+ when PSReadLine is enabled."
      },
      {
        id: "ps-transcripts",
        name: "PowerShell Transcripts",
        description: "Logged PS sessions when Start-Transcript is enabled via GPO/policy.",
        paths: ["%USERPROFILE%\\Documents\\", "GPO-defined path"],
        registry: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\Transcription",
        parser: "Manual review",
        notes: "Not enabled by default on most hosts."
      }
    ]
  },
  {
    id: "usb-devices",
    title: "USB & Removable Media",
    icon: "fa-plug",
    defaultOpen: false,
    artifacts: [
      {
        id: "usbstor",
        name: "USBSTOR",
        tier: "core",
        description: "USB storage enumeration - vendor, product, serial, first install context.",
        paths: ["SYSTEM hive"],
        registry: "SYSTEM\\CurrentControlSet\\Enum\\USBSTOR",
        parser: "USBDeview, regripper",
        notes: "Serial number often in the device instance path."
      },
      {
        id: "mountpoints",
        name: "MountedDevices",
        description: "Volume GUID mapping and removable device connection history hints.",
        paths: ["SYSTEM hive"],
        registry: "SYSTEM\\MountedDevices",
        parser: "USBDeview, regripper, Registry Explorer",
        notes: "Correlate with USBSTOR and setupapi.dev.log."
      },
      {
        id: "setupapi",
        name: "setupapi.dev.log",
        tier: "core",
        description: "USB/device install log - driver install timestamps per device.",
        paths: ["C:\\Windows\\inf\\setupapi.dev.log", "C:\\Windows\\setupapi.dev.log"],
        registry: null,
        parser: "USB tools, manual parse",
        notes: "Look for === Device Install === section headers with timestamps."
      }
    ]
  },
  {
    id: "filesystem",
    title: "Filesystem Core",
    icon: "fa-hard-drive",
    defaultOpen: false,
    artifacts: [
      {
        id: "mft",
        name: "$MFT",
        tier: "core",
        description: "Master File Table - every file/dir on the NTFS volume with timestamps and metadata.",
        paths: ["C:\\$MFT", "%SystemDrive%\\$MFT"],
        registry: null,
        parser: "MFTECmd, Autopsy, FTK",
        notes: "Locked while the volume is mounted. Collect from image or raw access."
      },
      {
        id: "usn-journal",
        name: "$UsnJrnl",
        tier: "core",
        description: "NTFS change journal - create, delete, rename, and change events.",
        paths: ["C:\\$Extend\\$UsnJrnl:$J", "%SystemDrive%\\$Extend\\$UsnJrnl:$J"],
        registry: null,
        parser: "MFTECmd (UsnJrnl), fsutil usn",
        notes: "Can be cleared by admin; size is capped by the OS."
      },
      {
        id: "pagefile",
        name: "Pagefile.sys",
        description: "Virtual memory - may contain process memory fragments and strings.",
        paths: ["C:\\pagefile.sys"],
        registry: null,
        parser: "Volatility, strings, bulk_extractor",
        notes: "Best collected from a powered-off image. Large file."
      },
      {
        id: "hiberfil",
        name: "Hiberfil.sys",
        description: "Hibernation file - compressed RAM snapshot of the last hibernate.",
        paths: ["C:\\hiberfil.sys"],
        registry: null,
        parser: "Volatility (hiberfil), decompress tools",
        notes: "Requires admin live. Useful full-memory alternative when present."
      }
    ]
  },
  {
    id: "registry-hives",
    title: "Registry Hives (Files)",
    icon: "fa-database",
    defaultOpen: false,
    artifacts: [
      {
        id: "system",
        name: "SYSTEM",
        tier: "core",
        description: "Services, drivers, ShimCache, BAM/DAM, hostname, timezone, ControlSets.",
        paths: ["C:\\Windows\\System32\\config\\SYSTEM"],
        registry: null,
        parser: "Registry Explorer, AppCompatCacheParser, bam-parser",
        notes: "Select ControlSet00X via CurrentControlSet / Select\\Current."
      },
      {
        id: "software",
        name: "SOFTWARE",
        description: "OS install date, installed software, user SIDs, app config.",
        paths: ["C:\\Windows\\System32\\config\\SOFTWARE"],
        registry: null,
        parser: "Registry Explorer, regripper",
        notes: "Machine-wide hive. Often needed alongside SRUM."
      },
      {
        id: "ntuser",
        name: "NTUSER.DAT",
        tier: "core",
        description: "Per-user settings - UserAssist, RecentDocs, Run keys, typed paths.",
        paths: ["C:\\Users\\<username>\\NTUSER.DAT"],
        registry: null,
        parser: "Registry Explorer, regripper",
        notes: "Load as HKU\\<user> in forensic tools."
      },
      {
        id: "usrclass",
        name: "UsrClass.dat",
        tier: "core",
        description: "Per-user COM/class registration - ShellBags, MUICache, BagMRU.",
        paths: ["C:\\Users\\<username>\\AppData\\Local\\Microsoft\\Windows\\UsrClass.dat"],
        registry: null,
        parser: "SBECmd, ShellBags Explorer, Registry Explorer",
        notes: "Primary ShellBags location (Classes root)."
      },
      {
        id: "sam",
        name: "SAM",
        description: "Local account password hashes and account lockout info.",
        paths: ["C:\\Windows\\System32\\config\\SAM"],
        registry: null,
        parser: "secretsdump, regripper, Registry Explorer",
        notes: "Locked live. Collect from image or volume shadow copy."
      },
      {
        id: "security",
        name: "SECURITY",
        description: "LSA secrets, cached domain creds, audit policy.",
        paths: ["C:\\Windows\\System32\\config\\SECURITY"],
        registry: null,
        parser: "secretsdump, regripper",
        notes: "Needed with SAM + SYSTEM for hash extraction."
      },
      {
        id: "default",
        name: "DEFAULT",
        description: "Default user profile template hive.",
        paths: ["C:\\Windows\\System32\\config\\DEFAULT"],
        registry: null,
        parser: "Registry Explorer",
        notes: "Less common unless reviewing default profile config."
      }
    ]
  },
  {
    id: "browsers-apps",
    title: "Browsers & Applications",
    icon: "fa-globe",
    defaultOpen: false,
    artifacts: [
      {
        id: "chrome",
        name: "Google Chrome",
        tier: "core",
        description: "History, downloads, cookies, extensions (SQLite profile DBs).",
        paths: [
          "%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\History",
          "%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cookies",
          "%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Network\\Cookies"
        ],
        registry: null,
        parser: "Hindsight, ChromeCacheView, SQLite browser",
        notes: "Multiple profiles under User Data\\<Profile>. Cookies path moved on newer builds."
      },
      {
        id: "edge-chromium",
        name: "Microsoft Edge (Chromium)",
        tier: "core",
        description: "Same structure as Chrome - history, cookies, extensions.",
        paths: ["%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\History"],
        registry: null,
        parser: "Hindsight, Chromium forensic tools",
        notes: "Chromium-based; same SQLite schema family as Chrome."
      },
      {
        id: "firefox",
        name: "Mozilla Firefox",
        description: "Browsing history, downloads, form history.",
        paths: ["%APPDATA%\\Mozilla\\Firefox\\Profiles\\<profile>\\places.sqlite"],
        registry: null,
        parser: "SQLite browser, Hindsight",
        notes: "profiles.ini maps profile folders."
      },
      {
        id: "webcache",
        name: "WebCache (IE / legacy Edge)",
        description: "Edge/IE browsing history, cookies, and cache in an ESE database.",
        paths: ["%LOCALAPPDATA%\\Microsoft\\Windows\\WebCache\\WebCacheV01.dat"],
        registry: null,
        parser: "ESEDatabaseView, NirSoft IEHistoryView",
        notes: "WebCacheV24.dat on newer builds. Locked while the browser is open."
      },
      {
        id: "outlook",
        name: "Outlook PST / OST",
        description: "Email, attachments, calendar - local mail store.",
        paths: [
          "%LOCALAPPDATA%\\Microsoft\\Outlook\\*.ost",
          "%USERPROFILE%\\Documents\\Outlook Files\\*.pst"
        ],
        registry: null,
        parser: "PST Viewer, AXIOM, FTK",
        notes: "OST is cached Exchange; PST is POP/IMAP/archive."
      },
      {
        id: "rdp-bitmap",
        name: "RDP Bitmap Cache",
        description: "Cached screen regions from RDP sessions - partial screenshot reconstruction.",
        paths: ["%LOCALAPPDATA%\\Microsoft\\Terminal Server Client\\Cache\\bcache*.bmc"],
        registry: null,
        parser: "bmc-tools, RDP Bitmap Cache Parser",
        notes: "Also check Default.rdp for saved connection settings."
      },
      {
        id: "default-rdp",
        name: "Default.rdp / RDP Config",
        description: "Saved RDP connection settings - hostnames and usernames.",
        paths: ["%USERPROFILE%\\Documents\\Default.rdp", "%USERPROFILE%\\Documents\\*.rdp"],
        registry: "HKCU\\Software\\Microsoft\\Terminal Server Client\\Servers",
        parser: "Manual review, Registry Explorer",
        notes: "Servers key stores MRU of connection hostnames."
      }
    ]
  },
  {
    id: "network",
    title: "Network",
    icon: "fa-network-wired",
    defaultOpen: false,
    artifacts: [
      {
        id: "hosts",
        name: "Hosts File",
        description: "Static DNS overrides - common malware redirection artifact.",
        paths: ["C:\\Windows\\System32\\drivers\\etc\\hosts"],
        registry: null,
        parser: "Manual review",
        notes: null
      },
      {
        id: "firewall-log",
        name: "Windows Firewall Log",
        description: "Allowed/blocked connections when logging is enabled.",
        paths: ["%SystemRoot%\\System32\\LogFiles\\Firewall\\pfirewall.log"],
        registry: "HKLM\\SOFTWARE\\Policies\\Microsoft\\WindowsFirewall\\...\\Logging",
        parser: "Manual parse, LogParser",
        notes: "Disabled by default - check policy before relying on it."
      },
      {
        id: "vpn-logs",
        name: "VPN Client Logs",
        description: "VPN connection history - vendor-specific paths.",
        paths: ["C:\\ProgramData\\<VPN Vendor>\\Logs\\", "%APPDATA%\\<VPN Vendor>\\"],
        registry: null,
        parser: "Vendor-specific",
        notes: "Check installed clients (AnyConnect, GlobalProtect, etc.)."
      }
    ]
  },
  {
    id: "linux",
    title: "Linux Artifacts",
    icon: "fa-linux",
    defaultOpen: false,
    artifacts: [
      {
        id: "linux-auth",
        name: "Auth / Syslog",
        tier: "core",
        description: "SSH logins, sudo usage, authentication failures.",
        paths: ["/var/log/auth.log", "/var/log/secure", "/var/log/syslog"],
        registry: null,
        parser: "grep, journalctl, log2timeline",
        notes: "Path varies by distro (Debian/Ubuntu vs RHEL)."
      },
      {
        id: "linux-bash-history",
        name: "Shell History",
        tier: "core",
        description: "Interactive shell commands per user.",
        paths: ["~/.bash_history", "~/.zsh_history", "/root/.bash_history"],
        registry: null,
        parser: "Manual review",
        notes: "Can be unset (HISTFILE) or cleared. Check zsh/fish too."
      },
      {
        id: "linux-ssh-keys",
        name: "SSH Authorized Keys",
        tier: "core",
        description: "Persistence via trusted SSH public keys.",
        paths: ["~/.ssh/authorized_keys", "/root/.ssh/authorized_keys"],
        registry: null,
        parser: "Manual review",
        notes: "Also check sshd_config for AuthorizedKeysFile overrides."
      },
      {
        id: "linux-cron",
        name: "Cron Jobs",
        description: "Scheduled task persistence.",
        paths: ["/etc/crontab", "/etc/cron.d/", "/var/spool/cron/crontabs/"],
        registry: null,
        parser: "Manual review",
        notes: "Per-user crontabs in /var/spool/cron/crontabs/<user>."
      },
      {
        id: "linux-systemd",
        name: "Systemd Units",
        description: "Service/timer persistence via unit files.",
        paths: ["/etc/systemd/system/", "~/.config/systemd/user/"],
        registry: null,
        parser: "systemctl list-unit-files",
        notes: "Check timers as well as services."
      },
      {
        id: "linux-utmp",
        name: "utmp / wtmp / btmp",
        description: "Login records, reboot history, failed login attempts.",
        paths: ["/var/log/wtmp", "/var/log/btmp", "/var/run/utmp"],
        registry: null,
        parser: "last, lastb, utmpdump",
        notes: "Binary format - use last / lastb."
      }
    ]
  }
];
