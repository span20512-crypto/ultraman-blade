"""announce-brush retry: rounds 1-2 came out blobby (2.5:1) or soft-glow (which
the border-flood knockout eats). Hard requirements this round: solid opaque
black core, hard pixel edges, elongated >=6:1."""
import json, base64, urllib.request, os, time

KEY = os.environ['GEMINI_API_KEY']
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={KEY}"

PROMPT = (
    "16-bit pixel art game UI asset, Japanese samurai wafu style, crisp chunky pixel clusters, "
    "flat medium brown background (#5a4a3c), no text, no letters, no watermark, single asset centered: "
    "one EXTREMELY WIDE and THIN horizontal sumi-e ink brushstroke, at least 6 times wider than tall, "
    "spanning nearly the full image width, SOLID OPAQUE pure black ink core with hard-edged pixel "
    "boundaries (no soft glow, no transparency, no gradient halo), rough dry-bristle streaks and a "
    "tapered flicked tail on the right end, a few small vermillion red (#b32b20) edge accents and "
    "2-3 tiny antique gold flecks, energetic single-stroke calligraphy swash"
)

os.chdir(os.path.dirname(os.path.abspath(__file__)))
body = json.dumps({
    "contents": [{"parts": [{"text": PROMPT}]}],
    "generationConfig": {"responseModalities": ["IMAGE"]},
}).encode()
for c in range(3, 6):  # -c3..-c5 (c1/c2 kept for reference)
    out = f"announce-brush-c{c}.png"
    if os.path.exists(out):
        print('skip', out); continue
    for attempt in range(3):
        try:
            req = urllib.request.Request(URL, data=body, headers={'Content-Type': 'application/json'})
            d = json.load(urllib.request.urlopen(req, timeout=120))
            parts = d['candidates'][0]['content']['parts']
            img = next(p for p in parts if 'inlineData' in p)
            open(out, 'wb').write(base64.b64decode(img['inlineData']['data']))
            print('OK', out)
            break
        except Exception as e:
            print('retry', out, str(e)[:120]); time.sleep(4)
    else:
        print('FAIL', out)
print('DONE')
