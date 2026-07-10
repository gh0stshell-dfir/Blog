# GHOST — DFIR & OffSec Field Notes

Live site: **https://gh0stshell-dfir.github.io/Blog/**

Toolkit, artifact references, and investigation writeups.

## Writeups

Source files live in [`writeups/`](writeups/). After editing a post:

```bash
python build_writeups.py
git add .
git commit -m "Add writeup"
git push
```

## Build

| Script | Output |
|--------|--------|
| `build_data.py` | `js/data.js` (toolkit commands) |
| `build_writeups.py` | `js/writeups-data.js` (writeups page) |