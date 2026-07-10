window.GHOST_DATA = {
  "offsec": [
    {
      "id": "nmap",
      "title": "Nmap",
      "icon": "fa-network-wired",
      "defaultOpen": true,
      "commands": [
        {
          "id": "nmap-quick",
          "title": "Quick Scan \u2014 Top Ports + Version",
          "description": "Fast service detection on the most common ports.",
          "command": "nmap -sV -sC -T4 example.com -oA nmap-quick"
        },
        {
          "id": "nmap-web-ports",
          "title": "Web Port Scan",
          "description": "Common web and app ports with version detection.",
          "command": "nmap -sV -sC -p 80,443,8000,8080,8443,8888,3000,5000,9000 example.com -oA web-ports"
        },
        {
          "id": "nmap-full",
          "title": "Full Port Scan",
          "description": "All TCP ports with aggressive timing and OS/service detection.",
          "command": "nmap -p- --min-rate 1000 -T4 -A example.com -oA fullscan"
        },
        {
          "id": "nmap-http-scripts",
          "title": "HTTP Enumeration Scripts",
          "description": "NSE scripts for titles, headers, methods, and tech fingerprinting.",
          "command": "nmap -p 80,443 --script=http-title,http-headers,http-methods,http-server-header,http-enum -oA http-enum example.com"
        },
        {
          "id": "nmap-ssl-scan",
          "title": "SSL/TLS Analysis",
          "description": "Certificate details, cipher enumeration, and known SSL issues.",
          "command": "nmap -p 443 --script ssl-cert,ssl-enum-ciphers,ssl-heartbleed -oA ssl-scan example.com"
        },
        {
          "id": "naabu-nmap",
          "title": "Naabu \u2192 Nmap Service Scan",
          "description": "Port discovery with Naabu, then Nmap service/script scan on hits.",
          "command": "naabu -host example.com -c 50 -nmap-cli 'nmap -sV -sC' -o naabu-full.txt"
        },
        {
          "id": "masscan",
          "title": "Masscan \u2014 Full Range",
          "description": "High-speed full TCP range scan. Follow up open ports with Nmap.",
          "command": "masscan -p0-65535 example.com --rate 100000 -oG masscan-results.txt"
        }
      ]
    },
    {
      "id": "nuclei",
      "title": "Nuclei",
      "icon": "fa-radiation",
      "defaultOpen": true,
      "commands": [
        {
          "id": "nuclei-single",
          "title": "Single Target \u2014 All Templates",
          "description": "Run the full Nuclei template set against one URL.",
          "command": "nuclei -u https://example.com -o nuclei-single.txt"
        },
        {
          "id": "nuclei-severity",
          "title": "Critical & High Only",
          "description": "Filter findings to critical and high severity.",
          "command": "nuclei -u https://example.com -severity critical,high -o nuclei-critical.txt"
        },
        {
          "id": "nuclei-tags",
          "title": "Tagged Templates (CVE / Exposure)",
          "description": "Focused scan using cve, exposure, and misconfig tags.",
          "command": "nuclei -u https://example.com -tags cve,exposure,misconfig -o nuclei-tagged.txt"
        },
        {
          "id": "nuclei-list",
          "title": "Scan URL List",
          "description": "Run Nuclei against a list of live URLs from recon output.",
          "command": "cat alive-urls.txt | nuclei -t nuclei-templates/ -severity medium,high,critical -c 50 -o nuclei-results.txt"
        },
        {
          "id": "nuclei-cors",
          "title": "CORS Misconfiguration Templates",
          "description": "CORS-specific templates across a list of live hosts.",
          "command": "cat example.coms.txt | httpx -silent | nuclei -t nuclei-templates/vulnerabilities/cors/ -o cors_results.txt"
        }
      ]
    },
    {
      "id": "full-scans",
      "title": "Full Scans & Pipelines",
      "icon": "fa-layer-group",
      "defaultOpen": true,
      "commands": [
        {
          "id": "web-recon-pipeline",
          "title": "Web Recon Pipeline",
          "description": "Port scan \u2192 probe live hosts \u2192 directory brute \u2192 Nuclei.",
          "command": "nmap -sV -p 80,443,8080,8443 example.com -oG - | awk '/Status: Open/{print $2}' | httpx -silent -o alive.txt && gobuster dir -u https://example.com -w /usr/share/wordlists/seclists/Discovery/Web-Content/raft-medium-directories.txt -q -o gobuster.txt && nuclei -l alive.txt -severity critical,high -o nuclei.txt"
        },
        {
          "id": "httpx-nuclei",
          "title": "Httpx \u2192 Nuclei Sweep",
          "description": "Probe subdomains for live web services, then Nuclei scan.",
          "command": "cat subexample.coms_alive.txt | httpx -silent -status-code -title -tech-detect -o alive.txt && nuclei -l alive.txt -severity critical,high,medium -c 40 -o nuclei-sweep.txt"
        },
        {
          "id": "subfinder-httpx-nuclei",
          "title": "Subfinder \u2192 Httpx \u2192 Nuclei",
          "description": "Subdomain enum, live host filter, then vulnerability scan.",
          "command": "subfinder -d example.com -all -silent | httpx -silent -o alive.txt && nuclei -l alive.txt -severity critical,high -c 50 -o nuclei-results.txt"
        }
      ]
    },
    {
      "id": "gobuster",
      "title": "Gobuster",
      "icon": "fa-folder-open",
      "commands": [
        {
          "id": "gobuster-dir",
          "title": "Directory Brute Force",
          "description": "Discover hidden directories and files on a web server.",
          "command": "gobuster dir -u https://example.com -w /usr/share/wordlists/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,html,js,txt,bak -t 50 -o gobuster-dirs.txt"
        },
        {
          "id": "gobuster-vhost",
          "title": "Vhost Discovery",
          "description": "Brute force virtual hosts on the same IP.",
          "command": "gobuster vhost -u https://example.com -w /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-5000.txt -t 50 -o gobuster-vhosts.txt"
        },
        {
          "id": "gobuster-dns",
          "title": "DNS Subdomain Enum",
          "description": "Enumerate subdomains via DNS brute force.",
          "command": "gobuster dns -d example.com -w /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-110000.txt -t 50 -o gobuster-dns.txt"
        }
      ]
    },
    {
      "id": "subdomain",
      "title": "Subdomain Enumeration",
      "icon": "fa-sitemap",
      "commands": [
        {
          "id": "subfinder-basic",
          "title": "Subfinder \u2014 Basic Discovery",
          "description": "Recursive subdomain enumeration with subfinder.",
          "command": "subfinder -d example.com -all -recursive > subexample.com.txt"
        },
        {
          "id": "httpx-filter",
          "title": "Httpx \u2014 Live Subdomain Filter",
          "description": "Filter discovered subdomains to alive hosts on common web ports.",
          "command": "cat subexample.com.txt | httpx-toolkit -ports 80,443,8080,8000,8888 -threads 200 > subexample.coms_alive.txt"
        },
        {
          "id": "subzy-check",
          "title": "Subzy \u2014 Takeover Check",
          "description": "Check for subdomain takeover vulnerabilities.",
          "command": "subzy run --targets subexample.coms.txt --concurrency 100 --hide_fails --verify_ssl"
        }
      ]
    },
    {
      "id": "urls",
      "title": "URL Collection",
      "icon": "fa-link",
      "commands": [
        {
          "id": "katana-passive",
          "title": "Katana \u2014 Passive URL Collection",
          "description": "Collect URLs from passive sources via katana.",
          "command": "katana -u subexample.coms_alive.txt -d 5 -ps -pss waybackarchive,commoncrawl,alienvault -kf -jc -fx -ef woff,css,png,svg,jpg,woff2,jpeg,gif,svg -o allurls.txt"
        },
        {
          "id": "gau-urls",
          "title": "GAU URL Collection",
          "description": "Collect historical URLs with gau and filter for parameters.",
          "command": "echo example.com | gau --mc 200 | urldedupe > urls.txt"
        },
        {
          "id": "advanced-urls",
          "title": "Katana + GAU Combined",
          "description": "Multi-source URL collection and deduplication.",
          "command": "echo example.com | gau --mc 200 | urldedupe > urls.txt && katana -u https://example.com -d 5 -o katana-urls.txt"
        }
      ]
    },
    {
      "id": "sensitive",
      "title": "Sensitive Data Discovery",
      "icon": "fa-eye",
      "commands": [
        {
          "id": "sensitive-files",
          "title": "Sensitive File Detection",
          "description": "Grep collected URLs for sensitive file extensions.",
          "command": "cat allurls.txt | grep -E \"\\.xls|\\.xml|\\.xlsx|\\.json|\\.pdf|\\.sql|\\.doc|\\.docx|\\.pptx|\\.txt|\\.zip|\\.tar\\.gz|\\.tgz|\\.bak|\\.7z|\\.rar|\\.log|\\.cache|\\.secret|\\.db|\\.backup|\\.yml|\\.gz|\\.config|\\.csv|\\.yaml|\\.md|\\.md5\""
        },
        {
          "id": "git-detection",
          "title": "Git Repository Detection",
          "description": "Probe hosts for exposed .git directories.",
          "command": "cat example.coms.txt | httpx-toolkit -sc -server -cl -path \"/.git/\" -mc 200 -location -ms \"Index of\" -probe"
        },
        {
          "id": "s3-buckets",
          "title": "AWS S3 Bucket Finder",
          "description": "Scan for S3 buckets associated with the target domain.",
          "command": "s3scanner scan -d example.com"
        },
        {
          "id": "api-keys",
          "title": "API Key Finder (JS)",
          "description": "Search JavaScript files for exposed keys and tokens.",
          "command": "cat allurls.txt | grep -E \"\\.js$\" | httpx-toolkit -mc 200 -content-type | grep -E \"application/javascript|text/javascript\" | cut -d' ' -f1 | xargs -I% curl -s % | grep -E \"(API_KEY|api_key|apikey|secret|token|password)\""
        }
      ]
    },
    {
      "id": "xss",
      "title": "XSS Testing",
      "icon": "fa-code",
      "commands": [
        {
          "id": "xss-pipeline",
          "title": "XSS Hunting Pipeline",
          "description": "URL collection \u2192 parameter filter \u2192 reflected XSS check.",
          "command": "echo https://example.com/ | gau | gf xss | uro | Gxss | kxss | tee xss_output.txt"
        },
        {
          "id": "dalfox-xss",
          "title": "Dalfox Scan",
          "description": "Scan parameterized URLs with Dalfox and blind XSS callback.",
          "command": "cat xss_params.txt | dalfox pipe --blind https://your-collaborator-url --waf-bypass --silence"
        },
        {
          "id": "stored-xss",
          "title": "Stored XSS \u2014 Form Endpoints",
          "description": "Nuclei XSS templates against auth-related endpoints.",
          "command": "cat urls.txt | grep -E \"(login|signup|register|forgot|password|reset)\" | httpx -silent | nuclei -t nuclei-templates/vulnerabilities/xss/ -severity critical,high"
        }
      ]
    },
    {
      "id": "lfi",
      "title": "LFI Testing",
      "icon": "fa-file-code",
      "commands": [
        {
          "id": "lfi-method",
          "title": "LFI with FFuF",
          "description": "Parameter fuzzing for local file inclusion using ffuf.",
          "command": "echo \"https://example.com/\" | gau | gf lfi | uro | sed 's/=.*/=/' | qsreplace \"FUZZ\" | sort -u | xargs -I{} ffuf -u {} -w payloads/lfi.txt -c -mr \"root:(x|\\*|\\$[^\\:]*):0:0:\" -v"
        }
      ]
    },
    {
      "id": "cors",
      "title": "CORS Testing",
      "icon": "fa-globe",
      "commands": [
        {
          "id": "cors-check",
          "title": "Manual CORS Check",
          "description": "Send a cross-origin request and inspect response headers.",
          "command": "curl -H \"Origin: http://example.com\" -I https://example.com/wp-json/"
        },
        {
          "id": "corscanner",
          "title": "CORScanner",
          "description": "Automated CORS misconfiguration scanner.",
          "command": "python3 CORScanner.py -u https://example.com -d -t 10"
        },
        {
          "id": "cors-reflection",
          "title": "Origin Reflection Test",
          "description": "Test whether the server reflects arbitrary origins in ACAO header.",
          "command": "curl -H \"Origin: https://evil.com\" -I https://example.com/api/data | grep -i \"access-control-allow-origin: https://evil.com\""
        }
      ]
    },
    {
      "id": "ffuf",
      "title": "FFuF",
      "icon": "fa-bolt",
      "commands": [
        {
          "id": "ffuf-lfi",
          "title": "LFI \u2014 Request File",
          "description": "Bruteforce LFI using a saved HTTP request file.",
          "command": "ffuf -request lfi -request-proto https -w /usr/share/wordlists/offensive-payloads/LFI-payload.txt -c -mr \"root:\""
        },
        {
          "id": "ffuf-xss",
          "title": "XSS \u2014 Request File",
          "description": "Bruteforce XSS using a saved HTTP request file.",
          "command": "ffuf -request xss -request-proto https -w /usr/share/wordlists/xss-payloads.txt -c -mr \"<script>alert('XSS')</script>\""
        }
      ]
    },
    {
      "id": "parameters",
      "title": "Parameter Discovery",
      "icon": "fa-cogs",
      "commands": [
        {
          "id": "arjun-passive",
          "title": "Arjun \u2014 Passive",
          "description": "Passive parameter discovery with Arjun.",
          "command": "arjun -u https://example.com/endpoint.php -oT arjun_output.txt -t 10 --rate-limit 10 --passive -m GET,POST --headers \"User-Agent: Mozilla/5.0\""
        },
        {
          "id": "arjun-wordlist",
          "title": "Arjun \u2014 Wordlist",
          "description": "Active parameter discovery with a custom wordlist.",
          "command": "arjun -u https://example.com/endpoint.php -oT arjun_output.txt -m GET,POST -w /usr/share/wordlists/seclists/Discovery/Web-Content/burp-parameter-names.txt -t 10 --rate-limit 10"
        }
      ]
    },
    {
      "id": "javascript",
      "title": "JavaScript Analysis",
      "icon": "fa-js",
      "commands": [
        {
          "id": "js-hunting",
          "title": "JS File Collection + Nuclei",
          "description": "Crawl for JS files and scan with exposure templates.",
          "command": "echo example.com | katana -d 5 | grep -E \"\\.js$\" | nuclei -t nuclei-templates/http/exposures/ -c 30"
        },
        {
          "id": "js-analysis",
          "title": "JS File Nuclei Scan",
          "description": "Run Nuclei exposure templates against collected JS URLs.",
          "command": "cat alljs.txt | nuclei -t nuclei-templates/http/exposures/"
        }
      ]
    },
    {
      "id": "wordpress",
      "title": "WordPress",
      "icon": "fa-wordpress",
      "commands": [
        {
          "id": "wpscan",
          "title": "WPScan \u2014 Aggressive",
          "description": "Enumerate users, plugins, and themes with aggressive plugin detection.",
          "command": "wpscan --url https://example.com --disable-tls-checks --api-token YOUR_TOKEN -e at -e ap -e u --enumerate ap --plugins-detection aggressive --force"
        }
      ]
    },
    {
      "id": "shodan",
      "title": "Shodan Dorks",
      "icon": "fa-search",
      "commands": [
        {
          "id": "shodan-ssl",
          "title": "SSL Certificate Search",
          "description": "Find hosts with certificates issued for the target domain.",
          "command": "Ssl.cert.subject.CN:\"example.com\" 200"
        }
      ]
    }
  ],
  "dfir": [
    {
      "id": "memory",
      "title": "Memory Forensics",
      "icon": "fa-memory",
      "commands": [
        {
          "id": "vol3-info",
          "title": "Volatility 3 \u2014 System Info",
          "description": "Identify OS, kernel, and architecture from a memory dump.",
          "command": "vol -f memory.dmp windows.info"
        },
        {
          "id": "vol3-pslist",
          "title": "Volatility 3 \u2014 Process List",
          "description": "Enumerate running processes at time of capture.",
          "command": "vol -f memory.dmp windows.pslist"
        },
        {
          "id": "vol3-pstree",
          "title": "Volatility 3 \u2014 Process Tree",
          "description": "Visualize parent-child process relationships for anomaly detection.",
          "command": "vol -f memory.dmp windows.pstree"
        },
        {
          "id": "vol3-netscan",
          "title": "Volatility 3 \u2014 Network Connections",
          "description": "Extract active network connections and listening ports from memory.",
          "command": "vol -f memory.dmp windows.netscan"
        },
        {
          "id": "vol3-malfind",
          "title": "Volatility 3 \u2014 Malware Detection",
          "description": "Find injected code and suspicious memory regions.",
          "command": "vol -f memory.dmp windows.malfind"
        },
        {
          "id": "vol3-dumpfiles",
          "title": "Volatility 3 \u2014 Dump Suspicious Files",
          "description": "Extract files from process memory for further analysis.",
          "command": "vol -f memory.dmp windows.dumpfiles --pid 1234 --dump-dir ./dumps/"
        }
      ]
    },
    {
      "id": "disk",
      "title": "Disk & File Forensics",
      "icon": "fa-hard-drive",
      "commands": [
        {
          "id": "fls-inode",
          "title": "Sleuth Kit \u2014 List Deleted Files",
          "description": "List deleted files by inode on an NTFS/ext image.",
          "command": "fls -rd image.E01 | grep '(deleted)'"
        },
        {
          "id": "icat-extract",
          "title": "Sleuth Kit \u2014 Extract by Inode",
          "description": "Carve a file from a disk image using its inode number.",
          "command": "icat image.E01 128-128-4 > recovered_file.exe"
        },
        {
          "id": "mmls-partitions",
          "title": "Sleuth Kit \u2014 Partition Table",
          "description": "Display partition layout of a forensic image.",
          "command": "mmls image.E01"
        },
        {
          "id": "bulk-extractor",
          "title": "Bulk Extractor \u2014 Auto Carve",
          "description": "Automatically extract emails, URLs, credit cards, and more.",
          "command": "bulk_extractor -o bulk_out/ image.E01"
        },
        {
          "id": "find-suspicious",
          "title": "Find Suspicious Executables",
          "description": "Locate recently modified executables in a mounted image.",
          "command": "find /mnt/evidence -type f \\( -name '*.exe' -o -name '*.dll' -o -name '*.ps1' \\) -mtime -7"
        }
      ]
    },
    {
      "id": "evtx",
      "title": "Windows Event Logs",
      "icon": "fa-scroll",
      "commands": [
        {
          "id": "evtx-dump",
          "title": "Export All EVTX Logs",
          "description": "Export all Windows event logs to a review directory.",
          "command": "wevtutil epl Security C:\\forensics\\Security.evtx & wevtutil epl System C:\\forensics\\System.evtx & wevtutil epl \"Microsoft-Windows-PowerShell/Operational\" C:\\forensics\\PS.evtx"
        },
        {
          "id": "evtx-parse",
          "title": "Parse EVTX with EvtxECmd",
          "description": "Parse Security.evtx into CSV for timeline analysis.",
          "command": "EvtxECmd.exe -f C:\\forensics\\Security.evtx --csv C:\\forensics\\output\\"
        },
        {
          "id": "evtx-4624",
          "title": "Hunt Successful Logons (4624)",
          "description": "Filter Security log for successful authentication events.",
          "command": "Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4624} | Select TimeCreated, @{n='User';e={$_.Properties[5].Value}}, @{n='IP';e={$_.Properties[18].Value}}"
        },
        {
          "id": "evtx-4688",
          "title": "Hunt Process Creation (4688)",
          "description": "Find process creation events \u2014 key for detecting execution.",
          "command": "Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4688} | Where-Object {$_.Message -match 'powershell|cmd|wscript'} | Select TimeCreated, Message"
        },
        {
          "id": "chainsaw-hunt",
          "title": "Chainsaw \u2014 Sigma Hunt",
          "description": "Run Sigma rules against collected EVTX logs.",
          "command": "chainsaw hunt C:\\forensics\\evtx\\ --sigma rules/ --mapping mappings/sigma-event-logs-all.yml -o results/"
        }
      ]
    },
    {
      "id": "netforensics",
      "title": "Network Forensics",
      "icon": "fa-network-wired",
      "commands": [
        {
          "id": "tshark-http",
          "title": "Extract HTTP Hosts from PCAP",
          "description": "Pull HTTP host headers from a packet capture.",
          "command": "tshark -r capture.pcap -Y http.request -T fields -e http.host | sort -u"
        },
        {
          "id": "tshark-dns",
          "title": "Extract DNS Queries",
          "description": "List all DNS queries \u2014 useful for C2 domain identification.",
          "command": "tshark -r capture.pcap -Y dns.flags.response==0 -T fields -e dns.qry.name | sort -u"
        },
        {
          "id": "tshark-follow",
          "title": "Follow TCP Stream",
          "description": "Reconstruct a TCP conversation from a PCAP.",
          "command": "tshark -r capture.pcap -q -z follow,tcp,ascii,0"
        },
        {
          "id": "zeek-conn",
          "title": "Zeek \u2014 Connection Log Summary",
          "description": "Summarize connection logs from Zeek output.",
          "command": "cat conn.log | jq -r '[.ts, .id.orig_h, .id.resp_h, .id.resp_p, .proto] | @tsv' | sort -u"
        },
        {
          "id": "suricata-alerts",
          "title": "Suricata \u2014 Review Alerts",
          "description": "Parse Suricata fast.log for triggered IDS rules.",
          "command": "cat fast.log | grep -E 'ET |SURICATA' | awk '{print $NF}' | sort | uniq -c | sort -rn"
        }
      ]
    },
    {
      "id": "timeline",
      "title": "Timeline Analysis",
      "icon": "fa-clock",
      "commands": [
        {
          "id": "plaso-log2timeline",
          "title": "Plaso \u2014 Create Timeline",
          "description": "Generate a super timeline from a forensic image.",
          "command": "log2timeline.py --storage-file timeline.plaso image.E01"
        },
        {
          "id": "plaso-psort",
          "title": "Plaso \u2014 Export Timeline",
          "description": "Export timeline to CSV for review in Timeline Explorer.",
          "command": "psort.py -o l2tcsv -w timeline.csv timeline.plaso"
        },
        {
          "id": "mactime-bodyfile",
          "title": "Sleuth Kit \u2014 Mactime Bodyfile",
          "description": "Create a bodyfile for timeline generation with mactime.",
          "command": "fls -r -m C: image.E01 > bodyfile.txt && mactime -b bodyfile.txt -d > timeline.txt"
        },
        {
          "id": "kape-timeline",
          "title": "KAPE \u2014 Targeted Collection",
          "description": "Collect high-value forensic artifacts for rapid timeline building.",
          "command": "kape.exe --tsource C: --tdest C:\\kape_out --target !SANS_Triage --mdest C:\\kape_out --module !EZParser"
        }
      ]
    },
    {
      "id": "malware",
      "title": "Malware Analysis",
      "icon": "fa-biohazard",
      "commands": [
        {
          "id": "yara-scan",
          "title": "YARA \u2014 Scan Directory",
          "description": "Scan files against a YARA rule set.",
          "command": "yara -r rules/malware.yar /path/to/samples/"
        },
        {
          "id": "strings-extract",
          "title": "Extract Printable Strings",
          "description": "Pull ASCII/Unicode strings from a suspicious binary.",
          "command": "strings -el suspicious.exe | grep -iE 'http|password|cmd|powershell|registry'"
        },
        {
          "id": "pe-header",
          "title": "PE Header Analysis",
          "description": "Inspect PE headers with pefile for anomalies.",
          "command": "python3 -c \"import pefile; pe=pefile.PE('sample.exe'); print(pe.DOS_HEADER); print(pe.OPTIONAL_HEADER)\""
        },
        {
          "id": "hash-file",
          "title": "Hash Suspicious Files",
          "description": "Generate SHA256 hashes for IOC reporting and threat intel lookup.",
          "command": "sha256sum suspicious.exe | tee hashes.txt"
        },
        {
          "id": "floss-strings",
          "title": "FLOSS \u2014 Obfuscated Strings",
          "description": "Extract obfuscated strings from malware using Mandiant FLOSS.",
          "command": "floss --no-static-strings suspicious.exe > floss_output.txt"
        }
      ]
    },
    {
      "id": "winir",
      "title": "Windows IR Collection",
      "icon": "fa-windows",
      "commands": [
        {
          "id": "kape-triage",
          "title": "KAPE \u2014 SANS Triage",
          "description": "Rapid triage collection using KAPE SANS targets.",
          "command": "kape.exe --tsource C: --tdest \\\\share\\evidence --target !SANS_Triage"
        },
        {
          "id": "velociraptor",
          "title": "Velociraptor \u2014 Live Collection",
          "description": "Collect artifacts remotely via Velociraptor VQL.",
          "command": "SELECT * FROM Artifact.Windows.System.Pslist()"
        },
        {
          "id": "autoruns",
          "title": "Autoruns \u2014 Persistence Check",
          "description": "Enumerate autorun locations for persistence mechanisms.",
          "command": "autorunsc.exe -accepteula -a * -c -h -s -v -vt > autoruns.csv"
        },
        {
          "id": "prefetch",
          "title": "PECmd \u2014 Parse Prefetch",
          "description": "Parse Windows Prefetch files for execution evidence.",
          "command": "PECmd.exe -d C:\\Windows\\Prefetch --csv C:\\forensics\\prefetch\\"
        },
        {
          "id": "mft-parse",
          "title": "MFTECmd \u2014 Parse $MFT",
          "description": "Parse the Master File Table for file system timeline.",
          "command": "MFTECmd.exe -f C:\\$MFT --csv C:\\forensics\\mft\\"
        }
      ]
    },
    {
      "id": "linuxir",
      "title": "Linux IR",
      "icon": "fa-linux",
      "commands": [
        {
          "id": "linux-ps",
          "title": "Process Enumeration",
          "description": "List running processes with full command lines.",
          "command": "ps auxww | grep -v '\\[' | sort"
        },
        {
          "id": "linux-netstat",
          "title": "Active Connections",
          "description": "Show listening ports and established connections.",
          "command": "ss -tulpn && netstat -antp 2>/dev/null"
        },
        {
          "id": "linux-cron",
          "title": "Cron Persistence Check",
          "description": "Review cron jobs across users and system directories.",
          "command": "for u in $(cut -f1 -d: /etc/passwd); do echo \"=== $u ===\"; crontab -l -u $u 2>/dev/null; done; ls -la /etc/cron.*"
        },
        {
          "id": "linux-auth",
          "title": "Auth Log Review",
          "description": "Hunt failed SSH logins and privilege escalation in auth logs.",
          "command": "grep -E 'Failed password|Accepted password|sudo:' /var/log/auth.log | tail -100"
        },
        {
          "id": "linux-forensics",
          "title": "UAC \u2014 Live Response Collection",
          "description": "Collect Linux artifacts using UAC (Unix-like Artifact Collector).",
          "command": "./uac -p full /path/to/evidence"
        }
      ]
    }
  ],
  "kql": [
    {
      "id": "device",
      "title": "Device",
      "icon": "fa-desktop",
      "defaultOpen": true,
      "commands": [
        {
          "id": "device-process-placeholder",
          "title": "Process creation \u2014 template",
          "description": "Placeholder. Replace filters with your hunt criteria.",
          "command": "DeviceProcessEvents\n| where Timestamp > ago(7d)\n| where ActionType == \"ProcessCreated\"\n| project Timestamp, DeviceName, InitiatingProcessFileName, FileName, ProcessCommandLine\n| take 100"
        },
        {
          "id": "device-network-placeholder",
          "title": "Outbound connection \u2014 template",
          "description": "Placeholder. Filter by remote IP, port, or process.",
          "command": "DeviceNetworkEvents\n| where Timestamp > ago(7d)\n| where RemotePort == 443\n| project Timestamp, DeviceName, InitiatingProcessFileName, RemoteIP, RemotePort\n| take 100"
        }
      ]
    },
    {
      "id": "identity",
      "title": "Identity & Auth",
      "icon": "fa-user-shield",
      "commands": [
        {
          "id": "signin-failures-placeholder",
          "title": "Failed sign-ins \u2014 template",
          "description": "Placeholder. Add account, IP, or app filters as needed.",
          "command": "SigninLogs\n| where TimeGenerated > ago(24h)\n| where ResultType != 0\n| summarize FailedAttempts = count() by UserPrincipalName, IPAddress\n| order by FailedAttempts desc"
        },
        {
          "id": "risky-signin-placeholder",
          "title": "Risky sign-ins \u2014 template",
          "description": "Placeholder. Requires Entra ID P2 / Identity Protection.",
          "command": "AADIdentityProtectionSignInLogs\n| where TimeGenerated > ago(7d)\n| where RiskLevelDuringSignIn in (\"medium\", \"high\")\n| project TimeGenerated, UserPrincipalName, IPAddress, RiskLevelDuringSignIn, RiskDetail"
        }
      ]
    },
    {
      "id": "email",
      "title": "Email & Phishing",
      "icon": "fa-envelope",
      "commands": [
        {
          "id": "email-threat-placeholder",
          "title": "Malicious email \u2014 template",
          "description": "Placeholder. Defender for Office 365 / MDO required.",
          "command": "EmailEvents\n| where Timestamp > ago(7d)\n| where ThreatTypes has \"Phish\"\n| project Timestamp, SenderFromAddress, RecipientEmailAddress, Subject, DeliveryAction"
        }
      ]
    },
    {
      "id": "hunting",
      "title": "Threat Hunting",
      "icon": "fa-crosshairs",
      "commands": [
        {
          "id": "powershell-encoded-placeholder",
          "title": "Encoded PowerShell \u2014 template",
          "description": "Placeholder. Hunt for common LOLBin abuse patterns.",
          "command": "DeviceProcessEvents\n| where Timestamp > ago(7d)\n| where FileName =~ \"powershell.exe\"\n| where ProcessCommandLine has_any (\"-enc\", \"-EncodedCommand\", \"FromBase64String\")\n| project Timestamp, DeviceName, AccountName, ProcessCommandLine"
        },
        {
          "id": "lolbin-schtasks-placeholder",
          "title": "Schtasks creation \u2014 template",
          "description": "Placeholder. Scheduled task creation via command line.",
          "command": "DeviceProcessEvents\n| where Timestamp > ago(7d)\n| where FileName =~ \"schtasks.exe\"\n| where ProcessCommandLine has \"Create\"\n| project Timestamp, DeviceName, AccountName, ProcessCommandLine"
        }
      ]
    }
  ]
};
