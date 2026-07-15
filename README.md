# GHOST — DFIR & OffSec Field Notes

Live site: **https://ghostsh-labs.github.io/Blog/**

> Use the `/Blog/` URL — `https://ghostsh-labs.github.io/` alone will 404.

Writeups page: **https://ghostsh-labs.github.io/Blog/writeups.html**

- [CastleRat Delivery Chain](https://ghostsh-labs.github.io/Blog/writeups.html#castle-rat-delivery-chain)
- [Ditto Delivery Chain](https://ghostsh-labs.github.io/Blog/writeups.html#ditto-delivery-chain)

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