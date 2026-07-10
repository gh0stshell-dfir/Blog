import json
import re
from pathlib import Path

import markdown
from markdown.extensions.fenced_code import FencedCodeExtension
from markdown.extensions.tables import TableExtension

BASE = Path(__file__).parent
WRITEUPS_DIR = BASE / "writeups"
OUTPUT = BASE / "js" / "writeups-data.js"
WORDS_PER_MINUTE = 200

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
WIKI_IMAGE_RE = re.compile(r"!\[\[([^\]]+)\]\]")
WIKI_LINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")


def parse_frontmatter(text: str) -> tuple[dict, str]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}, text

    meta: dict = {}
    for line in match.group(1).splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if value.startswith("[") and value.endswith("]"):
            meta[key] = [item.strip().strip('"').strip("'") for item in value[1:-1].split(",") if item.strip()]
        else:
            meta[key] = value
    return meta, text[match.end() :]


def preprocess_obsidian(text: str) -> str:
    def image_replacer(match: re.Match[str]) -> str:
        filename = Path(match.group(1)).name
        return f"![{filename}](assets/{filename})"

    text = WIKI_IMAGE_RE.sub(image_replacer, text)
    text = WIKI_LINK_RE.sub(lambda m: m.group(2) or m.group(1), text)
    return text


def estimate_read_time(text: str) -> str:
    words = len(re.findall(r"\b\w+\b", text))
    minutes = max(1, round(words / WORDS_PER_MINUTE))
    return f"{minutes} min"


def slug_from_filename(path: Path) -> str:
    slug = path.stem.lower()
    slug = re.sub(r"^chasing_ghosts_", "", slug)
    return re.sub(r"[^a-z0-9]+", "-", slug).strip("-")


def infer_title(body: str) -> str:
    for line in body.splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
            subtitle = ""
            for subline in body.splitlines():
                if subline.startswith("## "):
                    subtitle = subline[3:].strip()
                    break
            return f"{title}: {subtitle}" if subtitle else title
    return "Untitled Writeup"


def md_to_html(body: str) -> str:
    return markdown.markdown(
        body,
        extensions=[FencedCodeExtension(), TableExtension()],
    )


def load_writeup(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    meta, body = parse_frontmatter(raw)
    body = preprocess_obsidian(body)

    writeup = {
        "id": meta.get("id", slug_from_filename(path)),
        "title": meta.get("title", infer_title(body)),
        "summary": meta.get("summary", ""),
        "category": meta.get("category", "DFIR"),
        "date": meta.get("date", ""),
        "readTime": meta.get("readTime", estimate_read_time(body)),
        "tags": meta.get("tags", []),
        "content": md_to_html(body),
    }

    if not writeup["summary"]:
        for line in body.splitlines():
            if line.strip() and not line.startswith(("#", ">", "`", "─", "│", "┌", "└", "---")):
                writeup["summary"] = line.strip()[:180]
                break

    return writeup


def main() -> None:
    files = sorted(WRITEUPS_DIR.glob("*.md"))
    writeups = [load_writeup(path) for path in files]
    writeups.sort(key=lambda item: item.get("date", ""), reverse=True)

    content = "window.GHOST_WRITEUPS = " + json.dumps(writeups, indent=2, ensure_ascii=False) + ";\n"
    OUTPUT.write_text(content, encoding="utf-8")
    print(f"Built {OUTPUT.name} with {len(writeups)} writeup(s)")


if __name__ == "__main__":
    main()