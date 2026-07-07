"""Round-8: matched-PAIR regeneration. Both busts painted in ONE image so the
model enforces identical zoom / head size / eye-line / area occupancy. Designs
must stay 100% faithful to the two approved references."""
import json, base64, urllib.request, os, time

KEY = os.environ['GEMINI_API_KEY']
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={KEY}"

def b64(p): return base64.b64encode(open(p, 'rb').read()).decode()

PROMPT = (
    "ONE image containing TWO bust portraits side by side as a MATCHED character-select pair "
    "for the same fighting game. Hard requirements: IDENTICAL zoom, identical head size, "
    "identical vertical eye-line, and each subject occupies the SAME visual area within his "
    "half of the canvas, with similar breathing room around both heads.\n"
    "LEFT half: the cloaked swordsman from the FIRST reference - keep his design exactly: "
    "wide thin dark-plum lacquered disc hat worn tilted, pale mask-like white face, narrow "
    "glowing RED eyes, crimson scarf knotted at the neck with trailing tails, bone-grey robe.\n"
    "RIGHT half: the oni-masked ninja from the SECOND reference - keep his design exactly: "
    "red oni mask with gold horns, black topknot hair, indigo shinobi garb, blade on back.\n"
    "Both waist-up, 3/4 view, facing INWARD toward each other. Same painterly 16-bit pixel "
    "art shading as the references, crisp pixels, flat near-black background (#0a0a0c), no "
    "text, no watermark, no divider line between the halves.",
)

os.chdir(os.path.dirname(os.path.abspath(__file__)))
parts = [
    {"text": PROMPT[0]},
    {"inline_data": {"mime_type": "image/png", "data": b64('portrait-hayato-bust.png')}},
    {"inline_data": {"mime_type": "image/png", "data": b64('ref-kenji-bust.png')}},
]
body = json.dumps({"contents": [{"parts": parts}],
                   "generationConfig": {"responseModalities": ["IMAGE"]}}).encode()
for c in range(1, 5):
    out = f"portrait-pair-c{c}.png"
    if os.path.exists(out):
        print('skip', out); continue
    for attempt in range(3):
        try:
            req = urllib.request.Request(URL, data=body, headers={'Content-Type': 'application/json'})
            d = json.load(urllib.request.urlopen(req, timeout=120))
            img = next(p for p in d['candidates'][0]['content']['parts'] if 'inlineData' in p)
            open(out, 'wb').write(base64.b64decode(img['inlineData']['data']))
            print('OK', out); break
        except Exception as e:
            print('retry', out, str(e)[:120]); time.sleep(4)
    else:
        print('FAIL', out)
print('DONE')
