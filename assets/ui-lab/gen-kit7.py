"""Round-7: reframe hayato v4b into a TIGHT head-and-shoulders bust matching
kenji's framing/zoom, so both portraits read as one set. v4b = design source
(keep hat/scarf/red-eyes/face exactly), kenji bust = framing target."""
import json, base64, urllib.request, os, time

KEY = os.environ['GEMINI_API_KEY']
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={KEY}"

def b64(p): return base64.b64encode(open(p, 'rb').read()).decode()

PROMPT = (
    "Re-frame the character in the FIRST image into a TIGHT HEAD-AND-SHOULDERS BUST PORTRAIT "
    "cropped and zoomed EXACTLY like the SECOND image (the oni-mask ninja): the head/hat fills "
    "the upper portion of the frame and the shoulders reach the bottom edge - the face must be "
    "LARGE and highly detailed, same zoom level as the ninja. Keep the FIRST character's design "
    "100% identical: the wide thin dark-plum lacquered disc hat tilted low, the pale mask-like "
    "white face, narrow GLOWING RED eyes, the crimson scarf knotted only at the neck with tails "
    "over the shoulders, bone-grey robe, dark katana. Redraw at higher detail as you zoom in - "
    "crisp painterly 16-bit pixel-art shading, sharp clean pixels, NOT blurry. 3/4 view facing "
    "slightly RIGHT. Flat near-black background (#0a0a0c), no text, no watermark, single figure."
)

os.chdir(os.path.dirname(os.path.abspath(__file__)))
parts = [
    {"text": PROMPT},
    {"inline_data": {"mime_type": "image/png", "data": b64('portrait-hayato-v4b.png')}},
    {"inline_data": {"mime_type": "image/png", "data": b64('ref-kenji-bust.png')}},
]
body = json.dumps({"contents": [{"parts": parts}],
                   "generationConfig": {"responseModalities": ["IMAGE"]}}).encode()
for c in range(1, 4):
    out = f"portrait-hayato-bust-c{c}.png"
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
