"""Full-bleed announcement band, round 2 (Eric: 横批必须横跨整个屏幕宽度,
要牌匾+流苏的感觉; 前一轮 band-*.png 两侧留白 = 不合格).

Key requirements baked into every prompt:
  - band spans the ENTIRE image width, both ends cut off by the frame
  - ornate: lacquer / gold fittings / hanging tassels (流苏)
  - empty center for game text
  - flat magenta bg for offline keying (品红抠底, 同参考图管线)
Output: band-full-{a,b,c,d}.png raw gens; post.py keys + crops them.
Usage: python3 gen-band-full.py [a b c d]  (default: all missing)
"""
import json, base64, urllib.request, os, time, sys

KEY = os.environ['GEMINI_API_KEY']
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={KEY}"

STYLE = ("16-bit pixel art game UI asset, Japanese samurai wafu style, palette of black lacquer, "
         "vermillion red (#b32b20), antique gold (#c9a24b) and warm parchment, crisp chunky pixel "
         "clusters, no text, no letters, no watermark, ")

BAND = ("the MIDDLE SECTION of an extremely long horizontal ceremonial announcement band, seen as "
        "if through a window narrower than the band: the band runs edge to edge and is CUT OFF by "
        "the left and right image borders, its two ends are far outside the picture and MUST NOT be "
        "visible — no end caps, no corner pieces, no side margins, the band touches both image "
        "sides; the band occupies the middle third of the image height; large EMPTY plain center "
        "area reserved for text; everything above and below the band is solid flat pure magenta "
        "#FF00FF, no magenta color anywhere on the band itself; ")

VERSIONS = {
  'a': ("styled as a grand hanging temple plaque: black lacquer rails along the top and bottom "
        "with ornate antique-gold cloud-scroll fittings and a row of small gold rivets, warm "
        "parchment inner panel, a small gold kamon medallion centered on the top rail, and two "
        "braided vermillion silk cords with long hanging tassels draped over the band near the "
        "left side and near the right side"),
  'b': ("styled as a black lacquer plaque band with a deep midnight-ink inner panel decorated "
        "with a very faint dark gold asanoha pattern, heavy ornate gold corner fittings where the "
        "band meets the image edges, thin double gold trim lines along the rails, and two long "
        "vermillion silk tassels with gold caps hanging from the top rail at the left and right"),
  'c': ("styled as a war-camp curtain (jinmaku): a dark lacquered wooden rod running edge to edge "
        "across the top, deep vermillion red cloth hanging from it through red fabric loops, a row "
        "of small antique-gold kamon crests along the upper hem, a ragged wind-torn lower hem, and "
        "thick gold ropes with large hanging tassels draped at the left and at the right"),
  'd': ("styled as an unrolled silk brocade scroll band: warm parchment center panel, wide brocade "
        "borders along the top and bottom in deep red with a woven gold seigaiha wave pattern, thin "
        "antique gold trim lines, and two vermillion tassel cords hanging down in front of the band "
        "near the left and right edges"),
}

os.chdir(os.path.dirname(os.path.abspath(__file__)))
want = sys.argv[1:] or [k for k in VERSIONS if not os.path.exists(f'band-full-{k}.png')]
for k in want:
    out = f'band-full-{k}.png'
    body = json.dumps({
        "contents": [{"parts": [{"text": STYLE + BAND + VERSIONS[k]}]}],
        "generationConfig": {"responseModalities": ["IMAGE"],
                             "imageConfig": {"aspectRatio": "21:9"}},
    }).encode()
    for attempt in range(3):
        try:
            req = urllib.request.Request(URL, data=body, headers={'Content-Type': 'application/json'})
            d = json.load(urllib.request.urlopen(req, timeout=120))
            img = next(p for p in d['candidates'][0]['content']['parts'] if 'inlineData' in p)
            open(out, 'wb').write(base64.b64decode(img['inlineData']['data']))
            print('OK', out)
            break
        except Exception as e:
            print('retry', out, str(e)[:160]); time.sleep(4)
    else:
        print('FAIL', out)
print('DONE')
