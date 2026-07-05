"""Round-2 gap assets (announcement ribbon, menu cursor). Same STYLE prefix as gen-kit.py."""
import json, base64, urllib.request, os, time

KEY = os.environ['GEMINI_API_KEY']
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={KEY}"
STYLE = ("16-bit pixel art game UI asset, Japanese samurai wafu style, palette of black lacquer, "
         "vermillion red (#b32b20), antique gold (#c9a24b) and warm parchment, crisp chunky pixel clusters, "
         "flat very dark brown background, no text, no letters, no watermark, single asset centered, ")

ASSETS = {
  'banner-ribbon': "a very long horizontal ceremonial silk banner ribbon for a fighting game announcement, wide 8:1 shape, vermillion red silk center band with dark lacquer edging and thin antique gold trim lines, swallow-tail forked ends on both sides, subtle cloth folds, 16:9",
  'cursor-fan': "a small opened japanese folding fan icon pointing to the right, antique gold ribs, vermillion red paper with tiny gold sun, compact, 1:1",
}

for name, desc in ASSETS.items():
    out = f"{name}.png"
    if os.path.exists(out):
        print('skip', name); continue
    body = json.dumps({
        "contents": [{"parts": [{"text": STYLE + desc}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }).encode()
    for attempt in range(3):
        try:
            req = urllib.request.Request(URL, data=body, headers={'Content-Type': 'application/json'})
            d = json.load(urllib.request.urlopen(req, timeout=120))
            parts = d['candidates'][0]['content']['parts']
            img = next(p for p in parts if 'inlineData' in p)
            open(out, 'wb').write(base64.b64decode(img['inlineData']['data']))
            print('OK', name)
            break
        except Exception as e:
            print('retry', name, str(e)[:120]); time.sleep(4)
    else:
        print('FAIL', name)
print('DONE')
