import json
from pathlib import Path

base = Path(__file__).parent
offsec = json.loads((base / "js/offsec-commands.json").read_text(encoding="utf-8"))
dfir = json.loads((base / "js/dfir-commands.json").read_text(encoding="utf-8"))
kql = json.loads((base / "js/kql-commands.json").read_text(encoding="utf-8"))

content = "window.GHOST_DATA = " + json.dumps({"offsec": offsec, "dfir": dfir, "kql": kql}, indent=2) + ";\n"
(base / "js/data.js").write_text(content, encoding="utf-8")
print("Built js/data.js")