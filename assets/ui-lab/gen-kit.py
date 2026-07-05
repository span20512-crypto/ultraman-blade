import json, base64, urllib.request, os, time, sys

KEY = os.environ['GEMINI_API_KEY']
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={KEY}"
STYLE = ("16-bit pixel art game UI asset, Japanese samurai wafu style, palette of black lacquer, "
         "vermillion red (#b32b20), antique gold (#c9a24b) and warm parchment, crisp chunky pixel clusters, "
         "flat very dark brown background, no text, no letters, no watermark, single asset centered, ")

ASSETS = {
  'healthbar-frame': "a long horizontal health bar frame for a fighting game HUD, wide 6:1 shape, ornate gold cloud-scroll caps on both ends, empty dark inner track, thin vermillion accent line, 16:9",
  'meter-bar': "a horizontal power gauge styled as segmented green-gold bamboo stalk with dark knots between segments, lacquer backing plate, 16:9",
  'menu-panel': "a horizontal rectangular menu panel styled as dark lacquered wood board with antique gold border, hanging from a small braided vermillion rope knot at top center, subtle asanoha pattern in the wood, 16:9",
  'keycap': "a single square keyboard keycap button, dark lacquer face with gold beveled rim, subtle top highlight, 1:1",
  'timer-seal': "a square vermillion red hanko seal plate with carved border, empty center, slight ink texture, gold pin corners, 1:1",
  'title-emblem': "a large circular emblem: bold black enso brush circle over a rising red sun disc with thin gold rays, three tiny sakura petals, 1:1",
  'vs-emblem': "a compact emblem of two crossed katana swords over a small red sun disc, gold hilts, 1:1",
  'stage-alt': "a full fighting game stage background, feudal japan dojo courtyard at dusk, huge low red sun, torii gate and pagoda silhouettes, glowing lanterns, flat empty dirt ground across bottom quarter, dark moody, 16:9",
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
