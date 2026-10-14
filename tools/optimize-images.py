#!/usr/bin/env python3
"""GORRIóN · Optimizador de imágenes (se ejecuta solo en cada publicación; ver .github/workflows/pages.yml)

1. Imágenes subidas por cualquier vía (panel, editor avanzado, GitHub):
   - PNG/JPG/JPEG  -> se convierten a WebP, se corrigen las referencias en content/*.json y se borra el original.
   - WebP grandes (lado largo > 1800 px o > 300 KB) -> se reducen y se recomprimen.
   - Se elimina la información oculta de las fotos (ubicación GPS, cámara…).
   - GIF y SVG no se tocan.
2. Versiones pequeñas para móviles: uploads/w480/, uploads/w800/, uploads/w1200/ (se generan en cada publicación,
   no se guardan en el repositorio). La web las usa con «srcset» y, si una no existe, vuelve a la original.

Uso:  python tools/optimize-images.py [carpeta-del-sitio] [--dry-run]
Requiere Pillow (pip install pillow). Si no está, no hace nada y avisa.
"""
import json, os, re, sys

try:
    from PIL import Image, ImageOps
except ImportError:
    print("⚠ Pillow no está instalado: se omite la optimización de imágenes.")
    sys.exit(0)

ROOT = next((a for a in sys.argv[1:] if not a.startswith("--")), ".")
DRY = "--dry-run" in sys.argv
UP = os.path.join(ROOT, "uploads")
MAX_SIDE = 1800          # lado largo máximo de la imagen guardada
BIG_BYTES = 300 * 1024   # un WebP más pesado que esto se recomprime
QUALITY = 80
WIDTHS = (480, 800, 1200)

if not os.path.isdir(UP):
    print("No hay carpeta uploads/: nada que optimizar.")
    sys.exit(0)

def kb(n): return f"{n/1024:.0f} KB"

def load(path):
    im = Image.open(path)
    im.load()
    im = ImageOps.exif_transpose(im)          # respeta la orientación y descarta los metadatos
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA" if "A" in im.getbands() or im.info.get("transparency") is not None else "RGB")
    return im

def save_webp(im, path):
    im.save(path, "WEBP", quality=QUALITY, method=6)

def fit(im, side):
    k = min(1.0, side / max(im.size))
    return im if k >= 1 else im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)

changes = []   # (viejo, nuevo)
saved = 0

for name in sorted(os.listdir(UP)):
    p = os.path.join(UP, name)
    if not os.path.isfile(p):
        continue
    stem, ext = os.path.splitext(name)
    ext = ext.lower()
    size = os.path.getsize(p)
    try:
        if ext in (".png", ".jpg", ".jpeg"):
            im = fit(load(p), MAX_SIDE)
            new = stem + ".webp"
            n = 2
            while os.path.exists(os.path.join(UP, new)):
                new = f"{stem}-{n}.webp"; n += 1
            np_ = os.path.join(UP, new)
            if DRY:
                print(f"  convertiría {name} ({kb(size)}) -> {new}")
                continue
            save_webp(im, np_)
            nsize = os.path.getsize(np_)
            if nsize >= size:   # raro: el original ya era más pequeño; se conserva el original
                os.remove(np_)
                print(f"  = {name}: ya es ligera ({kb(size)}), se deja como está")
                continue
            os.remove(p)
            changes.append((name, new))
            saved += size - nsize
            print(f"  ✔ {name} ({kb(size)}) -> {new} ({kb(nsize)})")
        elif ext == ".webp":
            im = load(p)
            if max(im.size) > MAX_SIDE or size > BIG_BYTES:
                im2 = fit(im, MAX_SIDE)
                if DRY:
                    print(f"  recomprimiría {name} ({kb(size)}, {im.width}x{im.height})")
                    continue
                tmp = p + ".tmp"
                im2.save(tmp, "WEBP", quality=QUALITY, method=6)
                nsize = os.path.getsize(tmp)
                if nsize < size * 0.9 or max(im.size) > MAX_SIDE:
                    os.replace(tmp, p)
                    saved += max(0, size - nsize)
                    print(f"  ✔ {name}: {kb(size)} -> {kb(nsize)} ({im2.width}x{im2.height})")
                else:
                    os.remove(tmp)
    except Exception as e:
        print(f"  ⚠ {name}: no se pudo optimizar ({e})")

# Referencias en content/*.json
if changes and not DRY:
    cdir = os.path.join(ROOT, "content")
    for f in sorted(os.listdir(cdir)):
        if not f.endswith(".json"):
            continue
        fp = os.path.join(cdir, f)
        txt = open(fp, encoding="utf-8").read()
        out = txt
        for old, new in changes:
            out = re.sub(r"(?<=uploads/)" + re.escape(old) + r"(?=[\"'?#])", new, out)
        if out != txt:
            json.loads(out)  # que siga siendo un JSON válido
            open(fp, "w", encoding="utf-8").write(out)
            print(f"  referencias actualizadas en content/{f}")

# Versiones pequeñas (no se guardan en el repositorio; ver .gitignore)
if not DRY:
    made = 0
    for w in WIDTHS:
        d = os.path.join(UP, f"w{w}")
        os.makedirs(d, exist_ok=True)
    for name in sorted(os.listdir(UP)):
        p = os.path.join(UP, name)
        if not (os.path.isfile(p) and name.lower().endswith(".webp")):
            continue
        try:
            im = load(p)
        except Exception as e:
            print(f"  ⚠ {name}: {e}")
            continue
        for w in WIDTHS:
            out = os.path.join(UP, f"w{w}", name)
            if im.width <= w:
                # La original ya es más pequeña: se copia tal cual para que la dirección siempre exista.
                with open(p, "rb") as a, open(out, "wb") as b:
                    b.write(a.read())
            else:
                k = w / im.width
                save_webp(im.resize((w, max(1, round(im.height * k))), Image.LANCZOS), out)
            made += 1
    print(f"✔ {made} versiones pequeñas generadas")

print(f"Imágenes: {len(changes)} convertidas · ahorro {kb(saved)}" + (" (simulación)" if DRY else ""))
