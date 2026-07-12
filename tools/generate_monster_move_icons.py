#!/usr/bin/env python3
"""Build monster move icons from the approved monster source art.

The Image API path is preferred when billing is available. This deterministic
fallback keeps the project shippable by deriving readable move-specific icons
from the monster references already committed in assets/img/ultraman-icons.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "img" / "ultraman-icons"
OUT_DIR = ASSET_DIR / "monster-moves"
SIZE = 192
ATLAS = SIZE * 4


MOVES = [
    ("portrait", "neutral portrait"),
    ("move", "walk and jump"),
    ("crouch", "low crouch"),
    ("dash", "forward dash"),
    ("light", "fast light attack"),
    ("heavy", "heavy attack"),
    ("clight", "crouch light"),
    ("cheavy", "rising launcher"),
    ("airlight", "air light"),
    ("dive", "air dive"),
    ("special", "special attack"),
    ("super", "ultimate attack"),
    ("guard", "guard shield"),
    ("crush", "guard crush"),
    ("combo", "rapid combo"),
    ("finisher", "combo finisher"),
]


MONSTERS = {
    "monster-1": {
        "src": ASSET_DIR / "monster-1.jpg",
        "primary": (255, 101, 38),
        "secondary": (142, 79, 255),
        "accent": (39, 219, 255),
    },
    "monster-2": {
        "src": ASSET_DIR / "monster-2.jpg",
        "primary": (252, 59, 73),
        "secondary": (56, 196, 255),
        "accent": (255, 204, 73),
    },
}


def alpha_crop(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    alpha = img.getchannel("A")
    has_real_alpha = alpha.getextrema()[0] < 250
    if has_real_alpha:
        bbox = alpha.getbbox()
        if bbox:
            return img.crop(bbox)

    rgb = img.convert("RGB")
    white_key = rgb.point(lambda v: 0 if v > 244 else 255).convert("L")
    white_key = white_key.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    if white_key.getbbox():
        keyed = img.copy()
        keyed.putalpha(white_key)
        bbox = white_key.getbbox()
        if bbox:
            return keyed.crop(bbox)

    bg = Image.new("RGBA", img.size, img.getpixel((0, 0)))
    diff = ImageChops.difference(img, bg).convert("L")
    diff = diff.point(lambda v: 255 if v > 12 else 0)
    bbox = diff.getbbox()
    if bbox:
        cropped = img.crop(bbox)
        mask = diff.crop(bbox).filter(ImageFilter.GaussianBlur(0.5))
        cropped.putalpha(mask)
        return cropped
    return img


def fit_subject(img: Image.Image, scale: float = 0.88) -> Image.Image:
    img = alpha_crop(img)
    w, h = img.size
    target = int(SIZE * scale)
    ratio = min(target / w, target / h)
    return img.resize((max(1, int(w * ratio)), max(1, int(h * ratio))), Image.Resampling.LANCZOS)


def tint_layer(size: tuple[int, int], color: tuple[int, int, int], strength: int = 80) -> Image.Image:
    layer = Image.new("RGBA", size, (*color, strength))
    return layer


def rotate_subject(subject: Image.Image, deg: float) -> Image.Image:
    return subject.rotate(deg, expand=True, resample=Image.Resampling.BICUBIC)


def squash_subject(subject: Image.Image, sx: float = 1.0, sy: float = 1.0) -> Image.Image:
    w, h = subject.size
    return subject.resize((max(1, int(w * sx)), max(1, int(h * sy))), Image.Resampling.LANCZOS)


def shadow(canvas: Image.Image, subject: Image.Image, x: int, y: int) -> None:
    alpha = subject.getchannel("A").filter(ImageFilter.GaussianBlur(5))
    sh = Image.new("RGBA", subject.size, (0, 0, 0, 95))
    sh.putalpha(alpha.point(lambda v: int(v * 0.38)))
    canvas.alpha_composite(sh, (x + 4, y + 7))


def paste_center(canvas: Image.Image, subject: Image.Image, dx: int = 0, dy: int = 0) -> None:
    x = (SIZE - subject.width) // 2 + dx
    y = (SIZE - subject.height) // 2 + dy
    shadow(canvas, subject, x, y)
    canvas.alpha_composite(subject, (x, y))


def glow(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], color: tuple[int, int, int], width: int = 7) -> None:
    for i in range(width + 8, width - 1, -4):
        draw.arc(xy, 200, 338, fill=(*color, 62), width=i)
    draw.arc(xy, 200, 338, fill=(*color, 235), width=width)
    draw.arc(xy, 204, 334, fill=(255, 255, 255, 220), width=max(2, width // 3))


def bolt(draw: ImageDraw.ImageDraw, pts: list[tuple[int, int]], color: tuple[int, int, int], width: int = 7) -> None:
    for extra, alpha in [(10, 50), (5, 100), (0, 240)]:
        draw.line(pts, fill=(*color, alpha), width=width + extra, joint="curve")
    draw.line(pts, fill=(255, 255, 255, 230), width=max(2, width // 3), joint="curve")


def shield(draw: ImageDraw.ImageDraw, color: tuple[int, int, int]) -> None:
    for r, alpha in [(68, 46), (58, 82), (48, 130)]:
        draw.ellipse((SIZE // 2 - r, 34, SIZE // 2 + r, 34 + r * 2), outline=(*color, alpha), width=5)
    draw.arc((32, 30, 160, 170), 205, 335, fill=(255, 255, 255, 200), width=3)


def speed_lines(draw: ImageDraw.ImageDraw, color: tuple[int, int, int], left: bool = True) -> None:
    base = -8 if left else SIZE + 8
    for i in range(6):
        y = 42 + i * 20
        x2 = 74 + i * 4 if left else 118 - i * 4
        draw.line((base, y, x2, y - 6), fill=(*color, 145), width=4)


def star(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int], r1: int = 58, r2: int = 19) -> None:
    pts = []
    for i in range(16):
        a = -math.pi / 2 + i * math.pi / 8
        r = r1 if i % 2 == 0 else r2
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    draw.polygon(pts, fill=(*color, 120))
    draw.line(pts + [pts[0]], fill=(*color, 230), width=4)


def base_tile(primary: tuple[int, int, int], secondary: tuple[int, int, int]) -> Image.Image:
    tile = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tile, "RGBA")
    for r, alpha in [(88, 24), (66, 36), (46, 42)]:
        draw.ellipse((SIZE // 2 - r, SIZE // 2 - r, SIZE // 2 + r, SIZE // 2 + r), fill=(*secondary, alpha))
    draw.rounded_rectangle((11, 11, SIZE - 11, SIZE - 11), radius=22, outline=(*primary, 60), width=2)
    return tile


def make_icon(subject: Image.Image, move: str, colors: dict[str, tuple[int, int, int]]) -> Image.Image:
    p, s, a = colors["primary"], colors["secondary"], colors["accent"]
    tile = base_tile(p, s)
    fx = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(fx, "RGBA")

    pose = subject.copy()
    dx = dy = 0
    if move == "move":
        pose = rotate_subject(subject, -8)
        dx, dy = 12, -12
        speed_lines(draw, a)
    elif move == "crouch":
        pose = squash_subject(subject, 1.1, 0.68)
        dy = 31
    elif move == "dash":
        pose = rotate_subject(subject, -15)
        dx, dy = 21, 0
        speed_lines(draw, p)
    elif move == "light":
        pose = rotate_subject(subject, -6)
        glow(draw, (34, 42, 184, 176), a, 7)
    elif move == "heavy":
        pose = rotate_subject(subject, 10)
        glow(draw, (8, 24, 182, 188), p, 12)
    elif move == "clight":
        pose = squash_subject(subject, 1.08, 0.72)
        dy = 28
        draw.arc((16, 98, 188, 200), 198, 340, fill=(*a, 225), width=8)
    elif move == "cheavy":
        pose = rotate_subject(subject, -18)
        dy = -8
        bolt(draw, [(60, 176), (82, 118), (96, 92), (124, 36)], p, 7)
    elif move == "airlight":
        pose = rotate_subject(subject, -26)
        dy = -28
        glow(draw, (20, 58, 188, 198), a, 6)
    elif move == "dive":
        pose = rotate_subject(subject, 30)
        dx, dy = 14, -18
        bolt(draw, [(48, 28), (70, 62), (108, 104), (142, 164)], p, 9)
    elif move == "special":
        pose = rotate_subject(subject, -12)
        dx = 12
        draw.ellipse((34, 48, 158, 160), outline=(*s, 190), width=8)
        bolt(draw, [(24, 146), (64, 112), (98, 96), (164, 54)], p, 8)
    elif move == "super":
        pose = subject.copy()
        star(draw, SIZE // 2, SIZE // 2, p, 72, 23)
        draw.ellipse((28, 28, 164, 164), outline=(*s, 170), width=7)
    elif move == "guard":
        pose = squash_subject(subject, 0.86, 0.92)
        dx = -8
        shield(draw, a)
    elif move == "crush":
        pose = rotate_subject(subject, -18)
        dx = 18
        star(draw, 124, 88, p, 50, 14)
        for pts in [[(120, 45), (108, 80), (136, 92), (118, 134)], [(142, 54), (132, 86), (155, 118)]]:
            draw.line(pts, fill=(255, 255, 255, 230), width=4)
    elif move == "combo":
        for offset, alpha in [(-23, 55), (-12, 82)]:
            ghost = tint_layer(subject.size, s, alpha)
            ghost.putalpha(subject.getchannel("A").point(lambda v: int(v * alpha / 255)))
            paste_center(tile, ghost, offset, 1)
        glow(draw, (22, 46, 186, 176), a, 5)
    elif move == "finisher":
        pose = rotate_subject(subject, 13)
        dx = 9
        star(draw, 116, 96, s, 68, 18)
        bolt(draw, [(36, 150), (82, 116), (112, 82), (166, 44)], p, 10)

    tile.alpha_composite(fx)
    paste_center(tile, pose, dx, dy)
    tile = ImageEnhance.Contrast(tile).enhance(1.05)
    return tile


def make_monster(slug: str, spec: dict[str, object]) -> None:
    src = Image.open(spec["src"]).convert("RGBA")
    subject = fit_subject(src, 0.82)
    colors = {
        "primary": spec["primary"],
        "secondary": spec["secondary"],
        "accent": spec["accent"],
    }
    atlas = Image.new("RGBA", (ATLAS, ATLAS), (0, 0, 0, 0))
    for idx, (move, _label) in enumerate(MOVES):
        icon = make_icon(subject, move, colors)
        out = OUT_DIR / f"{slug}-{move}.webp"
        icon.save(out, "WEBP", quality=92, method=6)
        x = (idx % 4) * SIZE
        y = (idx // 4) * SIZE
        atlas.alpha_composite(icon, (x, y))
    atlas.save(ASSET_DIR / f"{slug}-moves-atlas.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for slug, spec in MONSTERS.items():
        make_monster(slug, spec)


if __name__ == "__main__":
    main()
