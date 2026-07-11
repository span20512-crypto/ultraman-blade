"""Post-process band-full-{a..e}.png → band-full-{a..e}-cut.png.
1) key bg: four-corner flood-fill (seed = corner colors, works whatever hue
   the model painted the magenta) + orphan-component sweep + defringe
2) locate band by opaque-pixel density (raw getbbox lies when artifacts stay)
3) symmetric horizontal cut INTO the band (drops end caps/rollers) so the
   strip is genuinely full-bleed when drawn at 1024 wide
CUT per version: px cut inboard from each end of band content, past fittings.
"""
from PIL import Image
from collections import deque
import sys

CUT = {'a': 150, 'b': 170, 'c': 60, 'd': 190, 'e': 150, 'f': 30}
TOL = 60  # max channel distance to a corner seed color

def key(im):
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    seeds = [px[0, 0][:3], px[w-1, 0][:3], px[0, h-1][:3], px[w-1, h-1][:3]]
    def isbg(c):
        return any(abs(c[0]-s[0]) < TOL and abs(c[1]-s[1]) < TOL and abs(c[2]-s[2]) < TOL
                   for s in seeds)
    seen = [[False]*w for _ in range(h)]
    q = deque()
    for x, y in ((0,0),(w-1,0),(0,h-1),(w-1,h-1)):
        q.append((x, y)); seen[y][x] = True
    while q:
        x, y = q.popleft()
        if not isbg(px[x, y][:3]): continue
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                seen[ny][nx] = True; q.append((nx, ny))
    # sweep orphan opaque blobs (<500 px) the flood couldn't reach around
    lab = [[0]*w for _ in range(h)]
    for y0 in range(h):
        for x0 in range(w):
            if px[x0, y0][3] == 0 or lab[y0][x0]: continue
            comp = [(x0, y0)]; lab[y0][x0] = 1; qq = deque(comp)
            while qq:
                x, y = qq.popleft()
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < w and 0 <= ny < h and not lab[ny][nx] and px[nx, ny][3] > 0:
                        lab[ny][nx] = 1; comp.append((nx, ny)); qq.append((nx, ny))
            if len(comp) < 500:
                for x, y in comp: px[x, y] = (0, 0, 0, 0)
    # defringe magenta-tinged border pixels
    for _ in range(3):
        kill = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0: continue
                if r - g > 30 and b - g > 20:
                    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                        nx, ny = x+dx, y+dy
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                            kill.append((x, y)); break
        for x, y in kill: px[x, y] = (0, 0, 0, 0)
    return im

for k in (sys.argv[1:] or 'abcde'):
    im = key(Image.open(f'band-full-{k}.png'))
    w, h = im.size
    A = im.getchannel('A').load()
    rows = [sum(1 for x in range(w) if A[x, y] > 0) for y in range(h)]
    band_rows = [y for y in range(h) if rows[y] > w * 0.50]
    t, b = min(band_rows), max(band_rows)
    bh = b - t + 1
    band_cols = [x for x in range(w) if sum(1 for y in range(t, b+1) if A[x, y] > 0) > bh * 0.25]
    l, r = min(band_cols), max(band_cols)
    # extend to tassel/rod overshoot above and below the dense band
    while t > 0 and rows[t - 1] > w * 0.02: t -= 1
    while b < h - 1 and rows[b + 1] > w * 0.02: b += 1
    cut = CUT[k]
    im2 = im.crop((l + cut, t, r - cut + 1, b + 1))
    im2.save(f'band-full-{k}-cut.png')
    print(k, 'band box', (l, t, r, b), '→', im2.size, 'ratio %.2f' % (im2.width / im2.height))
print('DONE')
