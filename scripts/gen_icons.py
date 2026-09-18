"""Generate app icons from the in-app logo (components/Logo.tsx).

Renders the M3 expressive logo mark (LOGO_MARK) in sky blue with the white
layers glyph (LOGO_GLYPH), then writes the full Tauri bundle icon set and the
PWA icons.
"""
import io
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM

ROOT = Path(__file__).resolve().parent.parent
TAURI_ICONS = ROOT / "src-tauri" / "icons"
PWA_ICONS = ROOT / "public" / "icons"
LOGO_TSX = ROOT / "components" / "Logo.tsx"


def extract_logo_paths() -> tuple[str, str]:
    text = LOGO_TSX.read_text(encoding="utf-8")
    mark = re.search(r'LOGO_MARK\s*=\s*"([^"]+)"', text)
    glyph = re.search(r'LOGO_GLYPH\s*=\s*"([^"]+)"', text)
    if not mark or not glyph:
        raise SystemExit("could not extract LOGO_MARK / LOGO_GLYPH from Logo.tsx")
    return mark.group(1), glyph.group(1)


def render_path_mask(d: str, render_size: int, transform: str | None = None) -> Image.Image:
    """Render a single SVG path to an anti-aliased alpha mask (L mode,
    255 = inside shape). Edge pixels keep partial coverage for smoothness."""
    tf = f' transform="{transform}"' if transform else ""
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144"
 width="{render_size}" height="{render_size}">
  <path d="{d}"{tf}/>
</svg>'''
    drawing = svg2rlg(io.BytesIO(svg.encode("utf-8")))
    png = renderPM.drawToString(drawing, fmt="PNG", bg=0xFFFFFF)
    gray = Image.open(io.BytesIO(png)).convert("L")
    # invert to alpha and harden interior (edge anti-aliasing is preserved)
    return gray.point(lambda v: min(255, (255 - v) * 3))


def render_logo(size: int) -> Image.Image:
    """Render the logo at `size` px, vector-sampled at 4x for crispness.
    Small sizes (<=64) drop the gradient and enlarge the glyph so the mark
    stays legible in taskbars and title bars."""
    mark, glyph = extract_logo_paths()
    ss = min(size * 4, 4096)
    small = size <= 64

    mark_alpha = render_path_mask(mark, ss)
    glyph_scale = "1.6" if small else "1.35"
    glyph_alpha = render_path_mask(
        glyph, ss, f"translate(72 74) scale({glyph_scale}) translate(-32 -32)"
    )

    if small:
        fill = Image.new("RGBA", mark_alpha.size, (92, 185, 232, 255))  # flat sky
    else:
        fill = Image.new("RGBA", mark_alpha.size)
        gd = ImageDraw.Draw(fill)
        top, bottom = (108, 196, 246), (56, 150, 212)
        for y in range(mark_alpha.size[1]):
            t = y / max(mark_alpha.size[1] - 1, 1)
            c = tuple(int(a + (b - a) * t) for a, b in zip(top, bottom))
            gd.line([(0, y), (mark_alpha.size[0], y)], fill=c + (255,))

    img = Image.new("RGBA", mark_alpha.size, (255, 255, 255, 0))
    img.paste(fill, (0, 0), mark_alpha)
    white = Image.new("RGBA", mark_alpha.size, (255, 255, 255, 255))
    img.paste(white, (0, 0), glyph_alpha)

    if ss > size:
        img = img.resize((size, size), Image.LANCZOS)
    if size >= 128:
        img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=55, threshold=2))
    return img


def main() -> None:
    TAURI_ICONS.mkdir(parents=True, exist_ok=True)
    PWA_ICONS.mkdir(parents=True, exist_ok=True)

    render_logo(32).save(TAURI_ICONS / "32x32.png")
    render_logo(128).save(TAURI_ICONS / "128x128.png")
    render_logo(256).save(TAURI_ICONS / "128x128@2x.png")
    render_logo(512).save(TAURI_ICONS / "icon.icns", format="ICNS")
    render_logo(1024).save(TAURI_ICONS / "icon.png")  # source for `tauri icon`

    render_logo(256).save(
        TAURI_ICONS / "icon.ico",
        format="ICO",
        sizes=[(64, 64), (128, 128), (256, 256)],  # drop tiny sizes: Windows scales from crisp large frames
    )

    render_logo(192).save(PWA_ICONS / "icon-192.png")
    render_logo(512).save(PWA_ICONS / "icon-512.png")

    print("logo icons written")


if __name__ == "__main__":
    main()
