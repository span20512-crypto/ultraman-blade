"""Round-3 assets (UI polish branch): vs-emblem blade fix (image edit), announce
ink-stroke (replaces banner-ribbon), nameplate, win-pip kamon, combo ink splash,
and 2 reference-based character bust portraits. Writes {name}-c{1..N}.png
candidates; pick the winner and `cp` it to {name}.png. Same STYLE voice as
gen-kit.py; background stays flat very dark so knockout fringes are invisible
in-game (magenta halos are not)."""
import json, base64, urllib.request, os, time

KEY = os.environ['GEMINI_API_KEY']
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={KEY}"
STYLE = ("16-bit pixel art game UI asset, Japanese samurai wafu style, palette of black lacquer, "
         "vermillion red (#b32b20), antique gold (#c9a24b) and warm parchment, crisp chunky pixel clusters, "
         "flat very dark brown background, no text, no letters, no watermark, single asset centered, ")

def b64(path):
    return base64.b64encode(open(path, 'rb').read()).decode()

# name -> (prompt, input_image_or_None, n_candidates)
ASSETS = {
  'vs-emblem-v2': (
    "Edit this pixel art emblem. Keep the round gold badge, parchment center, red sun disc, "
    "gold cloud motifs and the overall composition EXACTLY unchanged. Only fix the two crossed "
    "katana: each katana gets a SHORT handle (dark cord wrap with gold tsuba guard) at its UPPER "
    "end, and a LONG curved gleaming steel BLADE (light silver-grey with a pale cutting-edge "
    "highlight and darker spine) running down through the center to the LOWER end. The two lower "
    "ends must be sharp blade tips pointing down-left and down-right - absolutely no cord wrap, "
    "no gold pommels, no handles at the bottom. Same 16-bit pixel art style, same palette, flat "
    "dark brown background, no text.",
    'vs-emblem.png', 2),
  'announce-brush': (
    STYLE + "a wide horizontal dry-brush sumi-e ink stroke swash used as a backdrop for "
    "announcement text, one bold solid-black calligraphy brushstroke with rough bristle streaks, "
    "ragged edges and tapered flicked ends, subtle deep vermillion glow along the edges, a few "
    "tiny gold flecks, wide 7:1 shape, 16:9", None, 2),
  'nameplate': (
    STYLE + "a slim horizontal fighter name plate for a HUD, dark lacquer bar with angled "
    "hishigata cut corners, thin antique gold border line, small vermillion cord knot on the left "
    "end, empty center, wide 6:1 shape, 16:9", None, 2),
  'pip-mon': (
    STYLE + "a small round japanese kamon family-crest medallion for a round-win marker, antique "
    "gold sun-and-petal crest embossed on a black lacquer disc with a thin gold rim, compact, 1:1",
    None, 2),
  'combo-splash': (
    STYLE + "a compact vermillion red ink splash burst, wet sumi ink splatter with a few flying "
    "droplets, energetic diagonal motion, used as backdrop of a combo hit counter, 1:1", None, 2),
  'portrait-hayato': (
    "Character bust portrait based EXACTLY on the pixel-art fighter in this reference sprite "
    "sheet: a wandering samurai with a wide conical straw hat (kasa), crimson scarf, off-white "
    "and tan robe, katana on his hip. Waist-up, 3/4 view facing slightly to the RIGHT, calm "
    "deadly gaze visible under the hat brim. 16-bit pixel art portrait with painterly pixel "
    "shading, palette anchored to black lacquer, vermillion red (#b32b20), antique gold "
    "(#c9a24b) and warm parchment, high detail, fighting game character-select art, flat very "
    "dark navy background (#0d0f16), no text, no watermark.",
    '../img/mack/Idle.png', 2),
  'portrait-kenji': (
    "Character bust portrait based EXACTLY on the pixel-art fighter in this reference sprite "
    "sheet: a shinobi in dark indigo garb wearing a RED ONI HALF-MASK over his face, black "
    "spiky hair, blade slung on his back. Waist-up, 3/4 view facing slightly to the LEFT, sharp "
    "hostile glare. 16-bit pixel art portrait with painterly pixel shading, palette anchored to "
    "black lacquer, vermillion red (#b32b20), antique gold (#c9a24b), deep indigo and warm "
    "parchment, high detail, fighting game character-select art, flat very dark navy background "
    "(#0d0f16), no text, no watermark.",
    '../img/kenji/Idle.png', 2),
}

os.chdir(os.path.dirname(os.path.abspath(__file__)))
for name, (desc, ref, n) in ASSETS.items():
    parts = [{"text": desc}]
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
