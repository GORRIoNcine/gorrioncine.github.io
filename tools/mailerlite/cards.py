#!/usr/bin/env python3
"""GORRIóN · Tarjetas «vivas» para el correo automático «Conoce el trabajo».

MailerLite no permite editar por API el texto de una automatización, así que el correo se pega UNA vez y sus tres
tarjetas son imágenes en direcciones fijas (assets/email/auto/card-N-es|en.png) con enlaces fijos (/ml/pN/).
Este script las regenera con los proyectos actuales: elige uno por fase (estrenada → en rodaje → postproducción →
desarrollo, preferiblemente con cartel) y escribe también las páginas /ml/pN/ que redirigen al proyecto.

    python3 tools/mailerlite/cards.py [raíz]        (Pillow instalado; el flujo de publicación ya lo hace)"""
import json, os, sys, html
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
site = json.load(open(f"{ROOT}/content/site.json", encoding="utf-8"))
items = json.load(open(f"{ROOT}/content/proyectos.json", encoding="utf-8"))["items"]
BASE = (site.get("siteUrl") or "https://gorrioncine.github.io").rstrip("/")
INK, BONE, RED, REC, MUTE, LINE, PANEL = "#000000", "#efefef", "#5f140f", "#d4271c", "#a8a8a8", "#3a3a3a", "#121212"
PHASE = {"estrenado": ("ESTRENADA", "RELEASED", "#3d8b5a"), "produccion": ("EN RODAJE", "SHOOTING", REC),
         "postproduccion": ("POSTPRODUCCIÓN", "POST-PRODUCTION", "#d9a441"), "desarrollo": ("DESARROLLO", "IN DEVELOPMENT", MUTE)}
ORDER = ["estrenado", "produccion", "postproduccion", "desarrollo"]
FD = ["/usr/share/fonts/truetype/liberation/LiberationSansNarrow-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf"]
FM = ["/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]
FI = ["/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Oblique.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf"]
FB = ["/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"]
def font(paths, size):
    for p in paths:
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default()
def L(o, l):
    return o if isinstance(o, str) else (o or {}).get(l) or (o or {}).get("es") or ""
def wrap(d, text, f, width):
    out, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= width: cur = t
        else:
            if cur: out.append(cur)
            cur = w
    if cur: out.append(cur)
    return out

# --- elegir 3 proyectos: uno por fase, con cartel si es posible ---
def pick():
    chosen, used = [], set()
    for ph in ORDER:
        c = [p for p in items if p.get("status") == ph and p["slug"] not in used]
        c.sort(key=lambda p: (not p.get("poster"), -(p.get("year") or 0)))
        if c: chosen.append(c[0]); used.add(c[0]["slug"])
        if len(chosen) == 3: break
    for p in items:  # completar si hay menos de 3 fases
        if len(chosen) == 3: break
        if p["slug"] not in used: chosen.append(p); used.add(p["slug"])
    return chosen

S = 2  # escala x2 para pantallas retina
W, H, PW = 528 * S, 210 * S, 150 * S

def card(p, l):
    im = Image.new("RGB", (W, H), PANEL); d = ImageDraw.Draw(im)
    poster = p.get("poster") and os.path.join(ROOT, p["poster"].lstrip("/"))
    if poster and os.path.exists(poster):
        try: im.paste(ImageOps.fit(Image.open(poster).convert("RGB"), (PW, H), Image.LANCZOS), (0, 0))
        except Exception: poster = None
    else: poster = None
    if not poster:
        d.rectangle([0, 0, PW, H], fill="#1c1c1c")
        f = font(FD, 22 * S); t = (p["title"][:1] or "G").upper(); d.text((PW / 2, H / 2), t, font=f, fill=LINE, anchor="mm")
    x0 = PW + 20 * S; wmax = W - x0 - 18 * S
    es, en, col = PHASE.get(p.get("status"), PHASE["desarrollo"])
    chip = es if l == "es" else en
    fc = font(FM, 11 * S); cw = d.textlength(chip, font=fc) + 20 * S
    y = 18 * S
    d.rectangle([x0, y, x0 + cw, y + 22 * S], outline=col, width=S)
    d.text((x0 + 10 * S, y + 11 * S), chip, font=fc, fill=col, anchor="lm")
    y += 36 * S
    ft = font(FD, 24 * S); lines = wrap(d, p["title"].upper(), ft, wmax)[:2]
    for ln in lines: d.text((x0, y), ln, font=ft, fill=BONE); y += 27 * S
    y += 4 * S
    fm = font(FM, 11 * S)
    meta = f"{L(p.get('format'), l)} · {p.get('year', '')}".upper()
    d.text((x0, y), meta, font=fm, fill=MUTE); y += 22 * S
    fi = font(FI, 13 * S); tag = L(p.get("tagline"), l)
    for ln in wrap(d, f"“{tag}”", fi, wmax)[:2]: d.text((x0, y), ln, font=fi, fill=BONE); y += 19 * S
    fb = font(FB, 12 * S); cta = ("VER PROYECTO" if l == "es" else "SEE PROJECT")
    yb = H - 28 * S; d.text((x0, yb), cta, font=fb, fill=BONE)
    ww = d.textlength(cta, font=fb); d.rectangle([x0, yb + 17 * S, x0 + ww, yb + 19 * S], fill=REC)
    d.rectangle([0, 0, W - 1, H - 1], outline=LINE, width=S)
    return im

os.makedirs(f"{ROOT}/assets/email/auto", exist_ok=True)
for n, p in enumerate(pick(), 1):
    for l in ("es", "en"):
        card(p, l).save(f"{ROOT}/assets/email/auto/card-{n}-{l}.png", optimize=True)
        target = f"{BASE}/proyectos/{p['slug']}/" if l == "es" else f"{BASE}/en/projects/{p.get('slugEn') or p['slug']}/"
        d = f"{ROOT}/ml/p{n}" if l == "es" else f"{ROOT}/ml/en/p{n}"
        os.makedirs(d, exist_ok=True)
        t = html.escape(target, quote=True)
        open(f"{d}/index.html", "w", encoding="utf-8").write(
            f'<!doctype html><html lang="{l}"><head><meta charset="utf-8"><meta name="robots" content="noindex">'
            f'<meta http-equiv="refresh" content="0;url={t}"><link rel="canonical" href="{t}"><title>{html.escape(p["title"])}</title></head>'
            f'<body><script>location.replace({json.dumps(target)})</script><a href="{t}">{html.escape(p["title"])}</a></body></html>')
    print(f"  tarjeta {n}: {p['title']} ({p.get('status')})")
