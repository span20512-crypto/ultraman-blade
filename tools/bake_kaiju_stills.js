/* Bake new-kaiju battle stills + select portraits from codex monster-sources.
 * - sources: 4 张已抠底 cutout + 2 张白底(five-king / maga-orochi, 边界 flood-fill 抠底)
 * - battle still: 320x320, 脚底线 y=303.5, cx=160, 身高对齐 265(与老 kaiju-mack/kenji 一致);
 *   过宽怪兽(五帝王等)按宽度 312 封顶回缩
 * - sel portrait: 320x344, 身高 328 / 脚底 335.5(同英雄规则, 宽度 316 封顶)
 * - HUD stillCrop k: 值: 全身取景(84 窗内含整身), 公式先对老两只验算再输出新六只
 * - 联络表 (contact sheet) 输出到 scratchpad 供逐只目检
 */
const sharp = require('sharp');
const SCRATCH = process.env.SCRATCH || '/tmp';
const SRC = 'assets/img/ultraman-icons/monster-sources';

const KAIJUS = {
  // 巴尔坦 2026-07-21 最新高清稿为近白底，旧 cutout 已停用。
  baltan:   { src: `${SRC}/alien-baltan.png`, key: true, bgLum: 220, bgSat: 12 },
  // 哥莫拉 2026-07-17 最新高清稿为近白底，旧 cutout 已停用。
  gomora:   { src: `${SRC}/gomora.png`, key: true, bgLum: 220, bgSat: 12 },
  // 金古乔/雷德王 2026-07-17 换新稿(chibi v2: 金古乔发光黄眼+虹彩胸板 / 雷德王暖棕大眼)。
  // 白底渲染图 -> key:true; 稿子脚下带一圈软投影(中性灰 lum 186~254, 严格近白阈值
  // 吃不掉 -> 烘出来脚底一坨白斑), 故放宽为 bgLum/bgSat 的"中性且够亮"判定。
  // 五帝王/玛迦大蛇不加该旗标: 它们纯白底无投影, 且刃/角是浅银色(中性), 放宽会啃边。
  kingjoe:  { src: `${SRC}/king-joe.png`,  key: true, bgLum: 170, bgSat: 10 },
  redking:  { src: `${SRC}/red-king.png`,  key: true, bgLum: 170, bgSat: 10 },
  fiveking: { src: `${SRC}/five-king.png`,            key: true },
  orochi:   { src: `${SRC}/maga-orochi.png`,          key: true },
};

async function loadRaw(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: Buffer.from(data), w: info.width, h: info.height };
}

/* 白底抠图: 从边界像素 BFS 背景连通域置透明 + 2px 软边。
   缺省判定 = 近白(各通道>=238)。opt.bgLum/bgSat 给"带软投影"的稿子用: 背景判定
   放宽成"中性(max-min<=bgSat)且够亮(max>=bgLum)" —— 投影是中性灰而怪兽本体有
   色相(实测 sat 34~108), 故不误伤; 又因只吃边界连通域, 图内包在本体里的银色部件
   BFS 到不了, 同样安全。 */
function keyWhite(img, opt = {}) {
  const { data, w, h } = img, N = w * h;
  const isWhite = opt.bgLum
    ? (i) => {
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        return mx >= opt.bgLum && (mx - mn) <= opt.bgSat;
      }
    : (i) => data[i * 4] >= 238 && data[i * 4 + 1] >= 238 && data[i * 4 + 2] >= 238;
  const mask = new Uint8Array(N);
  const queue = [];
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) {
    const i = y * w + x; if (isWhite(i) && !mask[i]) { mask[i] = 1; queue.push(i); }
  }
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) {
    const i = y * w + x; if (isWhite(i) && !mask[i]) { mask[i] = 1; queue.push(i); }
  }
  while (queue.length) {
    const p = queue.pop(), px = p % w, py = (p / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = px + dx, ny = py + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const q = ny * w + nx;
      if (!mask[q] && isWhite(q)) { mask[q] = 1; queue.push(q); }
    }
  }
  for (let i = 0; i < N; i++) if (mask[i]) data[i * 4 + 3] = 0;
  for (let pass = 0; pass < 2; pass++) { // 软边: 邻接背景的残留白边减半
    const rim = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (mask[i] || data[i * 4 + 3] === 0) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && mask[ny * w + nx]) { rim.push(i); break; }
      }
    }
    for (const i of rim) { data[i * 4 + 3] = data[i * 4 + 3] >> 1; mask[i] = 1; }
  }
}

function largestComponent(img) {
  const { data, w, h } = img, N = w * h;
  const comp = new Int32Array(N).fill(-1), areas = [], stack = [];
  for (let i = 0; i < N; i++) {
    if (data[i * 4 + 3] < 8 || comp[i] >= 0) continue;
    const id = areas.length; let area = 0;
    stack.push(i); comp[i] = id;
    while (stack.length) {
      const p = stack.pop(); area++;
      const px = p % w, py = (p / w) | 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (data[q * 4 + 3] >= 8 && comp[q] < 0) { comp[q] = id; stack.push(q); }
      }
    }
    areas.push(area);
  }
  let big = 0;
  for (let i = 1; i < areas.length; i++) if (areas[i] > areas[big]) big = i;
  for (let i = 0; i < N; i++) if (comp[i] >= 0 && comp[i] !== big) data[i * 4 + 3] = 0;
}

function bbox(img) {
  let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++)
    if (img.data[(y * img.w + x) * 4 + 3] > 8) {
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
  return { minx, miny, maxx, maxy, h: maxy - miny + 1, w: maxx - minx + 1 };
}

function feetCx(img, bb) {
  let sx = 0, sn = 0;
  const y0 = Math.max(bb.miny, Math.round(bb.maxy - 0.12 * bb.h));
  for (let y = y0; y <= bb.maxy; y++) for (let x = 0; x < img.w; x++)
    if (img.data[(y * img.w + x) * 4 + 3] > 8) { sx += x; sn++; }
  return sx / sn;
}

/* 同 bake_hero_stills.place: 图缩放 f, 脚底->feetY, 脚部质心->cx, 出 W x H png */
async function place(img, f, cx, feetY, W, H) {
  const bb = bbox(img), fcx = feetCx(img, bb);
  const sw = Math.round(img.w * f), sh = Math.round(img.h * f);
  const rs = await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
    .resize(sw, sh).png().toBuffer();
  const left = Math.round(cx - fcx * f), top = Math.round(feetY - (bb.maxy + 0.5) * f);
  let sx = 0, sy = 0, l = left, t = top, cw = sw, ch = sh;
  if (l < 0) { sx = -l; cw += l; l = 0; }
  if (t < 0) { sy = -t; ch += t; t = 0; }
  if (l + cw > W) cw = W - l;
  if (t + ch > H) ch = H - t;
  const cropped = await sharp(rs).extract({ left: sx, top: sy, width: cw, height: ch }).png().toBuffer();
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: cropped, left: l, top: t }]).png();
}

/* HUD k: 取景: 顶部锚定(头部优先), 窗边=0.88*max(bbW,bbH)(比全身略收,
   对齐老两只手调值的观感), 84 窗公式同 pass2 */
function hudCrop(pr) {
  const bb = bbox(pr);
  const side = 0.88 * Math.max(bb.w, bb.h);
  const winTop = bb.miny - 4;
  const cx = (bb.minx + bb.maxx + 1) / 2;
  const s = 84 / side;
  return {
    x: +(2 - (cx - side / 2) * s).toFixed(1),
    y: +(2 - winTop * s).toFixed(1),
    w: +(320 * s).toFixed(1),
  };
}

(async () => {
  // 公式验算: 老两只的既有 k: 值 (mack {-3.2,2.2,93.1} / kenji {-13.8,1.6,117.7})
  for (const old of ['mack', 'kenji']) {
    const pr = await loadRaw(`assets/ui-lab/portrait-kaiju-${old}-sel.png`);
    console.log('verify k:' + old, JSON.stringify(hudCrop(pr)));
  }

  const crops = {}, cells = [];
  for (const [id, cfg] of Object.entries(KAIJUS)) {
    const img = await loadRaw(cfg.src);
    if (cfg.key) keyWhite(img, cfg);
    largestComponent(img);
    const bb = bbox(img);

    // battle still: 身高 265, 宽 312 封顶
    let f = 265 / bb.h;
    if (bb.w * f > 312) f = 312 / bb.w;
    await (await place(img, f, 160, 303.5, 320, 320)).toFile(`assets/img/still/kaiju-${id}.png`);

    // sel portrait: 身高 328, 宽 316 封顶
    let fp = 328 / bb.h;
    if (bb.w * fp > 316) fp = 316 / bb.w;
    const pf = `assets/ui-lab/portrait-kaiju-${id}-sel.png`;
    await (await place(img, fp, 160, 335.5, 320, 344)).toFile(pf);
    await sharp(pf).webp({ lossless: true }).toFile(pf.replace('.png', '.webp'));

    const pr = await loadRaw(pf);
    crops[`k:${id}`] = hudCrop(pr);
    console.log(id, 'srcBB', bb.w + 'x' + bb.h, 'stillScale', f.toFixed(3), 'crop', JSON.stringify(crops[`k:${id}`]));

    cells.push(await sharp(`assets/img/still/kaiju-${id}.png`).png().toBuffer());
    cells.push(await sharp(pf).resize(298, 320).png().toBuffer());
  }
  console.log(JSON.stringify(crops));
  await sharp({ create: { width: 640, height: 320 * 6, channels: 4, background: { r: 45, g: 45, b: 66, alpha: 1 } } })
    .composite(cells.map((c, i) => ({ input: c, left: (i % 2) * 320, top: Math.floor(i / 2) * 320 })))
    .png().toFile(`${SCRATCH}/bake-kaiju.png`);
})();
