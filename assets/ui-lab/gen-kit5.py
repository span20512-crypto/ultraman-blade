"""Round-5: hayato portrait v3. Fixes vs v2 (Eric): the sprite truth is a PALE
WHITE mask-like face (eerie), a SMOOTH dark-brown lacquered disc hat worn at a
steep tilt (NOT woven straw), crimson head-wrap/cloak. Style must pair with the
approved kenji bust, so ref-kenji-bust.png is passed as a style anchor."""
import json, base64, urllib.request, os, time

KEY = os.environ['GEMINI_API_KEY']
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={KEY}"

PROMPT = (
    "Draw ONE single WAIST-UP BUST PORTRAIT (one figure only; head and shoulders FILL most of "
    "the frame; do NOT reproduce the sprite's full body or pose, NO legs, NO sprite sheet, no "
    "multiple views) of the cloaked swordsman shown in the FIRST reference image (a pixel-art "
    "game sprite), rendered in EXACTLY the same painterly art style, framing, zoom and "
    "near-black background as the SECOND reference image (an oni-masked ninja bust portrait) - "
    "the two portraits must look like a matched pair painted by the same artist for the same "
    "character-select screen.\n"
    "Character details, follow the sprite strictly:\n"
    "- FACE: pale chalk-WHITE and mask-like with a faint dark vertical seam, gaunt, narrow dark "
    "eye slits half-hidden in the hat shadow; unsettling, sinister, eerie aura (jaki). NOT "
    "tanned, NOT handsome, NOT heroic.\n"
    "- HAT: a smooth DARK-BROWN lacquered wide flat disc hat (roningasa), worn TILTED steeply "
    "down to one side, its shadow cutting across the face. NOT woven straw, NOT golden, no "
    "visible weave texture.\n"
    "- a deep CRIMSON head-wrap flowing into a red cloak draped around neck and shoulders, "
    "cloth tails trailing.\n"
    "- hunched posture, pale bone-grey robe under a dark wrap, katana with a dark violet blade "
    "held low.\n"
    "Waist-up, 3/4 view facing slightly RIGHT (mirroring the ninja portrait's leftward pose). "
    "16-bit pixel art with painterly pixel shading, palette anchored to black lacquer, "
    "vermillion red (#b32b20), bone white and warm parchment, flat very dark background "
    "(#0a0a0c), no text, no watermark."
)

def b64(path):
    return base64.b64encode(open(path, 'rb').read()).decode()

os.chdir(os.path.dirname(os.path.abspath(__file__)))
parts = [
    {"text": PROMPT},
    {"inline_data": {"mime_type": "image/png", "data": b64('ref-mack-frame.png')}},
    {"inline_data": {"mime_type": "image/png", "data": b64('ref-kenji-bust.png')}},
]
body = json.dumps({
    "contents": [{"parts": parts}],
    "generationConfig": {"responseModalities": ["IMAGE"]},
}).encode()
for c in range(1, 9):  # c1-c4 kept from round 1 (skip-guarded); c5-c8 bust-biased rerolls
    out = f"portrait-hayato-v3-c{c}.png"
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
