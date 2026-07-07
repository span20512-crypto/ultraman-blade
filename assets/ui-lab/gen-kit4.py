"""Round-4 (Eric's review feedback): hayato portrait v2 (on-model: dark slanted
kasa + crimson cloak, ronin not farmer), 4 alternative title emblem concepts,
2 title-screen-specific background concepts. All library-first."""
import json, base64, urllib.request, os, time

KEY = os.environ['GEMINI_API_KEY']
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={KEY}"
STYLE = ("16-bit pixel art game UI asset, Japanese samurai wafu style, palette of black lacquer, "
         "vermillion red (#b32b20), antique gold (#c9a24b) and warm parchment, crisp chunky pixel clusters, "
         "flat very dark brown background, no text, no letters, no watermark, single asset centered, ")
SCENE = ("16-bit pixel art fighting game TITLE SCREEN background, no characters, no text, no watermark, "
         "moody and dark overall so white UI text stays readable, ")

def b64(path):
    return base64.b64encode(open(path, 'rb').read()).decode()

# name -> (prompt, ref_image_or_None, n_candidates)
ASSETS = {
  'portrait-hayato-v2': (
    "Character bust portrait of the pixel-art fighter in this reference sprite sheet. STAY "
    "STRICTLY ON-MODEL, sample the exact colors from the sprite: a wide-brim kasa hat in DARK "
    "muted tone (NOT golden straw) worn TILTED at a steep slanted angle so it shadows the eyes; "
    "a flowing CRIMSON CLOAK draped over the shoulders and back (a cloak, not a scarf); pale "
    "bone-white under-robe; katana at the hip. He is a weathered wandering swordsman - a cloaked "
    "knight-errant ronin, mysterious and lethal, absolutely NOT a peasant or farmer. Waist-up, "
    "3/4 view facing slightly RIGHT, face partly shadowed by the hat brim. 16-bit pixel art "
    "portrait with painterly pixel shading, palette anchored to black lacquer, vermillion red "
    "(#b32b20), antique gold (#c9a24b) and warm parchment, high detail, fighting game "
    "character-select art, flat very dark navy background (#0d0f16), no text, no watermark.",
    '../img/mack/Idle.png', 3),
  'title-torii': (
    STYLE + "a grand weathered vermillion torii gate seen straight on, a huge rising red sun "
    "disc behind it with thin gold rays, tiny crows circling, the sun disc face kept open and "
    "uncluttered because a two-kanji game title will be overlaid there, 1:1", None, 2),
  'title-gunsen': (
    STYLE + "a wide fully-opened japanese war fan (gunsen) emblem, black lacquer ribs with gold "
    "studs, gold-leaf paper face with a big vermillion sun circle at the center, a red tassel "
    "hanging from the pivot, the fan face kept clean because a two-kanji game title will be "
    "overlaid on it, 1:1", None, 2),
  'title-zangetsu': (
    STYLE + "one huge diagonal black ink brush slash cutting across a large red rising sun disc, "
    "gold spark flecks scattered along the cut line, dramatic single-stroke energy, the center "
    "kept readable because a two-kanji game title will be overlaid there, 1:1", None, 2),
  'title-kanban': (
    STYLE + "two tall vertical dark lacquered wooden signboards hanging side by side from a "
    "horizontal rope-bound beam, antique gold trim, vermillion cords and tassels, board faces "
    "left completely BLANK (one large kanji will be painted on each board), small red sun crest "
    "on the beam, 1:1", None, 2),
  'titlebg-moon': (
    SCENE + "night courtyard of a mountain shrine under a huge silver full moon, drifting mist, "
    "black pine and five-story pagoda silhouettes, stone lanterns with warm candle glow, "
    "fireflies, sparse falling sakura petals, cool indigo night palette with vermillion and "
    "gold accents, open dark sky in the upper-middle where the logo will sit, 16:9", None, 2),
  'titlebg-gate': (
    SCENE + "colossal weathered japanese castle gate viewed from below at blood-red dusk, giant "
    "glowing paper lanterns, tattered war banners swaying, crows circling a dark crimson sky, "
    "drifting embers, black lacquer / vermillion / antique gold palette, open dark sky in the "
    "upper-middle where the logo will sit, 16:9", None, 2),
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
