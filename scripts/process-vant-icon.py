"""Remove fundo claro e realça cores do ícone Vant (PNG com transparência)."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "brand" / "vant-studio-icon.png"
OUT_ICON = ROOT / "public" / "brand" / "vant-studio-icon.png"
OUT_FAVICON = ROOT / "public" / "favicon.png"
OUT_FAVICON_32 = ROOT / "public" / "favicon-32.png"


def is_background(r: int, g: int, b: int, a: int) -> bool:
    if a < 12:
        return True
    # Branco / cinza claro do quadrado
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx, mn = max(r, g, b), min(r, g, b)
    sat = (mx - mn) / mx if mx else 0
    if lum > 235 and sat < 0.12:
        return True
    if lum > 210 and sat < 0.08:
        return True
    # Bordas quase brancas com leve cor
    if lum > 200 and r > 190 and g > 190 and b > 190:
        return True
    return False


def remove_background(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_background(r, g, b, a):
                px[x, y] = (r, g, b, 0)
            else:
                # Suaviza halos brancos nas bordas do logo
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                if lum > 175:
                    fade = max(0, min(255, int((220 - lum) * 12)))
                    px[x, y] = (r, g, b, min(a, fade))
    return img


def enhance_logo(img: Image.Image) -> Image.Image:
    """Realça saturação/contraste só nos pixels visíveis."""
    rgb = Image.new("RGB", img.size, (0, 0, 0))
    rgb.paste(img, mask=img.split()[3])
    rgb = ImageEnhance.Color(rgb).enhance(1.55)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.18)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.08)
    rgb = ImageEnhance.Sharpness(rgb).enhance(1.15)
    out = Image.new("RGBA", img.size)
    out.paste(rgb, (0, 0))
    out.putalpha(img.split()[3])
    return out


def trim_transparent(img: Image.Image, pad: int = 8) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    img = img.crop(bbox)
    w, h = img.size
    side = max(w, h) + pad * 2
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - w) // 2
    oy = (side - h) // 2
    canvas.paste(img, (ox, oy), img)
    return canvas


def save_sizes(img: Image.Image) -> None:
    OUT_ICON.parent.mkdir(parents=True, exist_ok=True)
    master = trim_transparent(img, pad=12)
    # Versão principal para sidebar/login (nítida em ecrãs retina)
    hi = master.resize((512, 512), Image.Resampling.LANCZOS)
    hi.save(OUT_ICON, "PNG", optimize=True)
    fav = master.resize((32, 32), Image.Resampling.LANCZOS)
    fav.save(OUT_FAVICON_32, "PNG", optimize=True)
    fav192 = master.resize((192, 192), Image.Resampling.LANCZOS)
    fav192.save(OUT_FAVICON, "PNG", optimize=True)
    print(f"OK: {OUT_ICON} ({master.size})")
    print(f"OK: {OUT_FAVICON} (192x192)")
    print(f"OK: {OUT_FAVICON_32} (32x32)")


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC
    if not src.is_file():
        print(f"Arquivo não encontrado: {src}", file=sys.stderr)
        return 1
    img = Image.open(src)
    img = remove_background(img)
    img = enhance_logo(img)
    save_sizes(img)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
