/* Bake new-hero battle stills from codex hero-moves icons.
 * - stance: light icon with energy fx removed (hue-band seed -> component filter -> bounded growth)
 * - light/special/super: bottom-anchored at feet=303, body cx -> 160, per-hero scale from stance body height 250
 * - portrait: stance figure scaled to h=328, feet=335, cx=160 in 320x344
 * Debug contact sheets written to scratchpad for visual review.
 */
const sharp = require('sharp');
const SCRATCH = '/tmp';
const MOVES_DIR = 'assets/img/ultraman-icons/hero-moves';

const HEROES = {
  taro: { src: '04-taro', fxHue: [18, 68] },
  tiga: { src: '05-tiga', fxHue: [255, 335] },
  dyna: { src: '06-dyna', fxHue: [160, 220] },
  gaia: { src: '07-gaia', fxHue: [16, 60] },
  zett: { src: '08-z', fxHue: [165, 225] },
};

function rgb2hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx / 255];
}

async function loadRaw(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function bbox(img, athr = 8) {
  let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (img.data[(y * img.w + x) * 4 + 3] > athr) {
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
  }
  return { minx, miny, maxx, maxy, h: maxy - miny + 1, w: maxx - minx + 1 };
}

function feetCx(img, bb) {
  let sx = 0, sn = 0;
  const y0 = Math.max(bb.miny, Math.round(bb.maxy - 0.12 * bb.h));
  for (let y = y0; y <= bb.maxy; y++) for (let x = 0; x < img.w; x++) {
    if (img.data[(y * img.w + x) * 4 + 3] > 8) { sx += x; sn++; }
  }
  return sx / sn;
}

/* fx removal: returns new RGBA buffer + stats */
function stripFx(img, hueLo, hueHi) {
  const { data, w, h } = img;
  const N = w * h;
  const seed = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const a = data[i * 4 + 3]; if (a < 8) continue;
    const [hu, s, v] = rgb2hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    if (s > 0.42 && v > 0.55 && hu >= hueLo && hu <= hueHi) seed[i] = 1;
  }
  // connected components of seed (4-neighbour), keep area >= 600
  const comp = new Int32Array(N).fill(-1);
  const areas = [];
  const stack = [];
  for (let i = 0; i < N; i++) {
    if (!seed[i] || comp[i] >= 0) continue;
    const id = areas.length; let area = 0;
    stack.push(i); comp[i] = id;
    while (stack.length) {
      const p = stack.pop(); area++;
      const px = p % w, py = (p / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (seed[q] && comp[q] < 0) { comp[q] = id; stack.push(q); }
      }
    }
    areas.push(area);
  }
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (comp[i] >= 0 && areas[comp[i]] >= 600) mask[i] = 1;
  // bounded growth from core into blazing whites / translucent glow (depth 30)
  let frontier = [];
  for (let i = 0; i < N; i++) if (mask[i]) frontier.push(i);
  for (let d = 0; d < 30 && frontier.length; d++) {
    const next = [];
    for (const p of frontier) {
      const px = p % w, py = (p / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (mask[q]) continue;
        const a = data[q * 4 + 3]; if (a < 8) continue;
        const [hu, s, v] = rgb2hsv(data[q * 4], data[q * 4 + 1], data[q * 4 + 2]);
        const blazingWhite = v > 0.94 && s < 0.20;
        const glow = a < 170;
        const fxish = s > 0.25 && v > 0.5 && hu >= hueLo - 8 && hu <= hueHi + 8;
        if (blazingWhite || glow || fxish) { mask[q] = 1; next.push(q); }
      }
    }
    frontier = next;
  }
  // 2px soft dilate: halve alpha on rim
  const out = Buffer.from(data);
  let removed = 0;
  for (let i = 0; i < N; i++) if (mask[i]) { out[i * 4 + 3] = 0; removed++; }
  for (let pass = 0; pass < 2; pass++) {
    const rim = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (mask[i] || out[i * 4 + 3] === 0) continue;
      let adj = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
        { const nx=x+dx, ny=y+dy; if (nx>=0&&ny>=0&&nx<w&&ny<h&&mask[ny*w+nx]) { adj = true; break; } }
      if (adj) rim.push(i);
    }
    for (const i of rim) { out[i * 4 + 3] = out[i * 4 + 3] >> 1; mask[i] = 1; }
  }
  return { out, removed };
}

async function toPng(buf, w, h) {
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png();
}

/* place raw img scaled by f so feet(maxy)->feetY, feetCx->cx, into W x H canvas */
async function place(img, f, cx, feetY, W, H) {
  const bb = bbox(img), fcx = feetCx(img, bb);
  const sw = Math.round(img.w * f), sh = Math.round(img.h * f);
  const scaled = await (await toPng(img.data, img.w, img.h)).toBuffer();
  const rs = await sharp(scaled).resize(sw, sh).png().toBuffer();
  const left = Math.round(cx - fcx * f), top = Math.round(feetY - (bb.maxy + 0.5) * f);
  // composite with clipping
  const base = sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  // sharp composite requires the overlay to fit? No - it errors if outside. Pre-crop.
  let sx = 0, sy = 0, l = left, t = top, cw = sw, ch = sh;
  if (l < 0) { sx = -l; cw += l; l = 0; }
  if (t < 0) { sy = -t; ch += t; t = 0; }
  if (l + cw > W) cw = W - l;
  if (t + ch > H) ch = H - t;
  const cropped = await sharp(rs).extract({ left: sx, top: sy, width: cw, height: ch }).png().toBuffer();
  return base.composite([{ input: cropped, left: l, top: t }]).png();
}

(async () => {
  for (const [id, cfg] of Object.entries(HEROES)) {
    const light = await loadRaw(`${MOVES_DIR}/${cfg.src}-light.png`);
    const { out: stanceBuf } = stripFx(light, cfg.fxHue[0], cfg.fxHue[1]);
    const stance = { data: stanceBuf, w: light.w, h: light.h };
    const sbb = bbox(stance);
    const f = 250 / sbb.h;

    // battle stills
    await (await place(stance, f, 160, 303.5, 320, 320)).toFile(`assets/img/still/ultra-${id}-stance.png`);
    for (const mv of ['light', 'special', 'super']) {
      const img = await loadRaw(`${MOVES_DIR}/${cfg.src}-${mv}.png`);
      await (await place(img, f, 160, 303.5, 320, 320)).toFile(`assets/img/still/ultra-${id}-${mv}.png`);
    }
    // sel portrait: stance figure h=328, feet 335, cx 160 in 320x344
    const fp = 328 / sbb.h;
    await (await place(stance, fp, 160, 335.5, 320, 344)).toFile(`assets/ui-lab/portrait-ultra-${id}-sel.png`);

    // debug sheet: light | stance | special | super (battle-baked)
    const cells = [];
    for (const src of [`${MOVES_DIR}/${cfg.src}-light.png`, `assets/img/still/ultra-${id}-stance.png`,
                       `assets/img/still/ultra-${id}-special.png`, `assets/img/still/ultra-${id}-super.png`]) {
      cells.push(await sharp(src).resize(240, 240).png().toBuffer());
    }
    await sharp({ create: { width: 960, height: 240, channels: 4, background: { r: 45, g: 45, b: 66, alpha: 1 } } })
      .composite(cells.map((c, i) => ({ input: c, left: i * 240, top: 0 }))).png()
      .toFile(`${SCRATCH}/bake-${id}.png`);
    console.log(id, 'stanceBodyH=' + sbb.h, 'scale=' + f.toFixed(3));
  }
})();
