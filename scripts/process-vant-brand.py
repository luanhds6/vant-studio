"""Remove fundo escuro/claro e realça a marca Vant (logo completa + ícone)."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
OUT_LOGO = ROOT / "public" / "brand" / "vant-studio-logo.png"
OUT_ICON = ROOT / "public" / "brand" / "vant-studio-icon.png"
OUT_FAVICON = ROOT / "public" / "favicon.png"
OUT_FAVICON_32 = ROOT / "public" / "favicon-32.png"


def _lum(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def _sat(r: int, g: int, b: int) -> float:
    mx, mn = max(r, g, b), min(r, g, b)
    return (mx - mn) / mx if mx else 0.0


def sample_background(img: Image.Image) -> tuple[int, int, int]:
    w, h = img.size
    pts = [
        (2, 2),
        (w - 3, 2),
        (2, h - 3),
        (w - 3, h - 3),
        (w // 2, 2),
        (w // 2, h - 3),
    ]
    px = img.convert("RGBA").load()
    rs, gs, bs = [], [], []
    for x, y in pts:
        r, g, b, a = px[x, y]
        if a > 200:
            rs.append(r)
            gs.append(g)
            bs.append(b)
    if not rs:
        return (18, 24, 38)
    return (sum(rs) // len(rs), sum(gs) // len(gs), sum(bs) // len(bs))


def color_dist(r: int, g: int, b: int, bg: tuple[int, int, int]) -> float:
    br, bgc, bb = bg
    return ((r - br) ** 2 + (g - bgc) ** 2 + (b - bb) ** 2) ** 0.5


def is_background(r: int, g: int, b: int, a: int, bg: tuple[int, int, int]) -> bool:
    if a < 15:
        return True
    lum = _lum(r, g, b)
    sat = _sat(r, g, b)
    dist = color_dist(r, g, b, bg)

    # Apenas pixels muito próximos do navy dos cantos (preserva texto «VANT» escuro)
    if dist < 36 and lum < 118 and sat < 0.22:
        return True
    if dist < 28:
        return True

    # Fundo branco (exportações antigas)
    if lum > 235 and sat < 0.12:
        return True
    if lum > 205 and sat < 0.08 and dist < 55:
        return True
    return False


def remove_background(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    bg = sample_background(img)
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_background(r, g, b, a, bg):
                px[x, y] = (r, g, b, 0)
            else:
                lum = _lum(r, g, b)
                # Suaviza halos do fundo nas bordas
                if is_background(r, g, b, 255, bg) or (lum < 115 and _sat(r, g, b) < 0.2):
                    fade = max(0, min(255, int((lum - 70) * 4)))
                    if fade < a:
                        px[x, y] = (r, g, b, fade)
    return img


def lift_dark_text(img: Image.Image) -> Image.Image:
    """Clareia texto «VANT» muito escuro para ficar legível em fundos claros."""
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 40:
                continue
            lum = _lum(r, g, b)
            sat = _sat(r, g, b)
            if 35 < lum < 130 and sat < 0.55 and b >= r:
                lift = 1.55
                nr = min(255, int(r * lift + 28))
                ng = min(255, int(g * lift + 32))
                nb = min(255, int(b * lift + 40))
                px[x, y] = (nr, ng, nb, a)
    return img


def enhance_brand(img: Image.Image) -> Image.Image:
    img = lift_dark_text(img)
    rgb = Image.new("RGB", img.size, (0, 0, 0))
    rgb.paste(img, mask=img.split()[3])
    rgb = ImageEnhance.Color(rgb).enhance(1.62)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.22)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.12)
    rgb = ImageEnhance.Sharpness(rgb).enhance(1.2)
    out = Image.new("RGBA", img.size)
    out.paste(rgb, (0, 0))
    out.putalpha(img.split()[3])
    return out


def trim_alpha(img: Image.Image, pad: int = 10) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    img = img.crop(bbox)
    w, h = img.size
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    canvas.paste(img, (pad, pad), img)
    return canvas


def crop_icon_emblem(full: Image.Image) -> Image.Image:
    """Recorte superior (~emblema V) para favicon e menu recolhido."""
    w, h = full.size
    top = full.crop((0, 0, w, int(h * 0.52)))
    return trim_alpha(top, pad=6)


def save_outputs(logo: Image.Image, icon: Image.Image) -> None:
    OUT_LOGO.parent.mkdir(parents=True, exist_ok=True)

    target_w = 560
    scale = target_w / logo.width
    target_h = max(1, int(logo.height * scale))
    logo_hi = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
    logo_hi.save(OUT_LOGO, "PNG", optimize=True)

    icon_sq = trim_alpha(icon, pad=8)
    side = max(icon_sq.width, icon_sq.height)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(icon_sq, ((side - icon_sq.width) // 2, (side - icon_sq.height) // 2), icon_sq)
    icon_hi = square.resize((512, 512), Image.Resampling.LANCZOS)
    icon_hi.save(OUT_ICON, "PNG", optimize=True)

    fav32 = square.resize((32, 32), Image.Resampling.LANCZOS)
    fav32.save(OUT_FAVICON_32, "PNG", optimize=True)
    fav192 = square.resize((192, 192), Image.Resampling.LANCZOS)
    fav192.save(OUT_FAVICON, "PNG", optimize=True)

    print(f"OK: {OUT_LOGO} ({logo_hi.size})")
    print(f"OK: {OUT_ICON} (512x512)")
    print(f"OK: {OUT_FAVICON_32}, {OUT_FAVICON}")


def main() -> int:
    if len(sys.argv) < 2:
        print("Uso: python scripts/process-vant-brand.py <imagem-fonte>", file=sys.stderr)
        return 1
    src = Path(sys.argv[1])
    if not src.is_file():
        print(f"Arquivo não encontrado: {src}", file=sys.stderr)
        return 1

    raw = Image.open(src)
    processed = enhance_brand(remove_background(raw))
    logo = trim_alpha(processed, pad=12)
    icon = crop_icon_emblem(logo)
    save_outputs(logo, icon)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
