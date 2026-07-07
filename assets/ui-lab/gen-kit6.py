"""Round-6: (a) hayato v4 = targeted EDIT of the approved-style v3 bust (fix
hat shape / scarf position / red eyes, keep style); (b) brush-calligraphy
title kanji 刀魂 as an art asset (the pixel font reads cheap at logo size)."""
import json, base64, urllib.request, os, time

KEY = os.environ['GEMINI_API_KEY']
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={KEY}"

def b64(path):
    return base64.b64encode(open(path, 'rb').read()).decode()

HAYATO_EDIT = (
    "Edit this pixel-art bust portrait. KEEP the exact art style, palette, painterly pixel "
    "shading, framing, pose and dark background. Fix exactly three details to match the game "
    "sprite:\n"
    "1) HAT: replace the cone-shaped hat with a very WIDE, THIN, FLAT dark-plum disc hat - a "
    "flat lacquered plate seen edge-on at a slight angle, clearly wider than the shoulders, "
    "tilted down to one side, hovering low over the head. NOT a cone, NOT a dome, no visible "
    "underside depth.\n"
    "2) SCARF: the red cloth is ONLY a scarf knotted around the NECK with two tails hanging "
    "over shoulder and back - remove ALL red wrapping from around the head and ears; between "
    "hat and face show the bare pale mask-like head.\n"
    "3) EYES: narrow GLOWING RED eye slits, small and sharp, sinister.\n"
    "Everything else unchanged. Same 16-bit pixel art portrait style, no text, no watermark."
)

BRUSH_KANJI = (
    "Japanese shodo brush calligraphy artwork for a retro fighting game logo: the two kanji "
    "characters 「刀魂」 written horizontally in bold, wild, expressive dry-brush style "
    "(kanteiryu / sousho energy), very thick strokes with ink splatter, rough bristle texture "
    "and flying-white (kasure), slightly pixelated 16-bit rendering, bone-white ink on a flat "
    "pure black background, nothing else in the image, no watermark. The characters MUST be "
    "stroke-correct and clearly legible as 刀 (left) and 魂 (right), wide 2:1 composition."
)

JOBS = [
    ('portrait-hayato-v4', HAYATO_EDIT, 'portrait-hayato-v3.png', 4),
    ('title-kanji-toukon', BRUSH_KANJI, None, 3),
]

os.chdir(os.path.dirname(os.path.abspath(__file__)))
for name, prompt, ref, n in JOBS:
    parts = [{"text": prompt}]
    if ref:
        parts.append({"inline_data": {"mime_type": "image/png", "data": b64(ref)}})
    body = json.dumps({
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }).encode()
    for c in range(1, n + 1):
        out = f"{name}-c{c}.png"
        if os.path.exists(out):
            print('skip', out); continue
        for attempt in range(3):
            try:
                req = urllib.request.Request(URL, data=body, headers={'Content-Type': 'application/json'})
                d = json.load(urllib.request.urlopen(req, timeout=120))
                parts_out = d['candidates'][0]['content']['parts']
                img = next(p for p in parts_out if 'inlineData' in p)
                open(out, 'wb').write(base64.b64decode(img['inlineData']['data']))
                print('OK', out)
                break
            except Exception as e:
                print('retry', out, str(e)[:120]); time.sleep(4)
        else:
            print('FAIL', out)
print('DONE')
