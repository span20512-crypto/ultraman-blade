"""Round-9: narrow the head-to-body ratio gap of the c4 pair (Eric: Hayato's
face too small, Kenji's too big — 微调 so they read as one set).

Editing the PAIR image always destroyed Kenji's oni mask (any 'shrink his
masked head' instruction made the model swap the mask for a blue hood — 7/7
failures). Working approach = two per-character edits that never threaten
the mask, then composite:
  1. Hayato half → 'enlarge head/hat/face, same body'  → portrait-hayato-big.png
  2. Kenji half  → 'enlarge body/shoulders, keep head' → portrait-kenji-body.png
  3. Composite at eye-line parity, kenji scaled so mask eye→chin ≈ 1.5×
     hayato's (mask keeps a natural oversize)          → portrait-pair-f1.png

Anchors (native px): hayato eye y=700 faceCx=300 eye→chin 75 (576x1792);
kenji eye y=715 faceCx=215 mask eye→chin 165 (576x1728).
Preview scales: hayato 0.78, kenji 0.53, eye-line y=210 on 832x624."""
import json, base64, urllib.request, os, time

KEY = os.environ['GEMINI_API_KEY']
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={KEY}"

def b64(p): return base64.b64encode(open(p, 'rb').read()).decode()

HAYATO = (
    "Edit this pixel-art bust portrait of a cloaked swordsman. Keep his design, pose, colors, "
    "painterly 16-bit pixel style and flat near-black background EXACTLY: wide dark-plum disc hat, "
    "pale mask-like white face, glowing red eyes, crimson scarf, bone-grey robe, katana hilt in hand.\n"
    "ONLY change: his head and face are too SMALL for his body. Redraw him with a noticeably "
    "LARGER head, face and hat relative to the same body - heroic bust proportion where the head "
    "(chin to hat brim) reads about one third of the bust height. Keep the same overall bust size "
    "and framing within the canvas. No text, no watermark."
)
KENJI = (
    "Edit this pixel-art bust portrait of an oni-masked ninja. Keep his red oni demon mask with "
    "gold horns, black topknot hair, katana hilt, colors, painterly 16-bit pixel style and flat "
    "near-black background EXACTLY as they are. Do not touch the mask or head at all.\n"
    "ONLY change: his shoulders and torso are too SMALL for his head. Redraw the body larger - "
    "broader shoulders, fuller chest, more of the indigo shinobi garb visible - so the head reads "
    "as about one third of the bust height, a natural heroic bust proportion. Extend the bust "
    "lower in the canvas as needed. No text, no watermark."
)

os.chdir(os.path.dirname(os.path.abspath(__file__)))
JOBS = [  # (source half of portrait-pair-c4.png, prompt, out)
    ('pair-c4-left.png', HAYATO, 'portrait-hayato-big.png'),
    ('pair-c4-right.png', KENJI, 'portrait-kenji-body.png'),
]
for src, prompt, out in JOBS:
    if os.path.exists(out):
        print('skip', out); continue
    parts = [{"text": prompt},
             {"inline_data": {"mime_type": "image/png", "data": b64(src)}}]
    body = json.dumps({"contents": [{"parts": parts}],
                       "generationConfig": {"responseModalities": ["IMAGE"]}}).encode()
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
