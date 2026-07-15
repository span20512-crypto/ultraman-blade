/* pass 2: stance cleanup (keep largest alpha component), portrait rebake + webp,
   HUD stillCrop computation. Run after bake.js. */
const sharp = require('sharp');
const SCRATCH = '/tmp';
const IDS = ['taro', 'tiga', 'dyna', 'gaia', 'zett'];

async function loadRaw(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: Buffer.from(data), w: info.width, h: info.height };
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
  let removed = 0;
  for (let i = 0; i < N; i++) if (comp[i] >= 0 && comp[i] !== big) { data[i * 4 + 3] = 0; removed++; }
  return removed;
}
function bbox(img) {
  let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++)
    if (img.data[(y * img.w + x) * 4 + 3] > 8) {
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
  return { minx, miny, maxx, maxy, h: maxy - miny + 1 };
}
(async () => {
  const crops = {};
  for (const id of IDS) {
    // stance: strip debris in the baked 320 grid, save
    const stF = `assets/img/still/ultra-${id}-stance.png`;
    const st = await loadRaw(stF);
    const rm = largestComponent(st);
    await sharp(st.data, { raw: { width: st.w, height: st.h, channels: 4 } }).png().toFile(stF);

    // portrait: rescale cleaned stance figure to h=328, feet 335, cx 160 into 320x344
    const bb = bbox(st);
    const f = 328 / bb.h;
    const sw = Math.round(st.w * f), sh = Math.round(st.h * f);
    const rs = await sharp(st.data, { raw: { width: st.w, height: st.h, channels: 4 } })
      .resize(sw, sh).png().toBuffer();
    // feet cx in stance grid = 160 by construction; feet y = 303.5
    const left = Math.round(160 - 160 * f), top = Math.round(335.5 - 304 * f);
    let sx = 0, sy = 0, l = left, t = top, cw = sw, ch = sh;
    if (l < 0) { sx = -l; cw += l; l = 0; }
    if (t < 0) { sy = -t; ch += t; t = 0; }
    if (l + cw > 320) cw = 320 - l;
    if (t + ch > 344) ch = 344 - t;
    const cropped = await sharp(rs).extract({ left: sx, top: sy, width: cw, height: ch }).png().toBuffer();
    const pf = `assets/ui-lab/portrait-ultra-${id}-sel.png`;
    await sharp({ create: { width: 320, height: 344, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: cropped, left: l, top: t }]).png().toFile(pf);
    await sharp(pf).webp({ lossless: true }).toFile(pf.replace('.png', '.webp'));

    // HUD crop: head band = portrait rows [figTop-? window]: side 140, top = figTop-4
    const pr = await loadRaw(pf);
    const pb = bbox(pr);
    const winTop = pb.miny - 4, side = 140;
    // head cx = alpha centroid over rows winTop..winTop+side*0.8 (upper head zone)
    let cxs = 0, cn = 0;
    for (let y = Math.max(0, winTop); y < Math.min(pr.h, winTop + Math.round(side * 0.8)); y++)
      for (let x = 0; x < pr.w; x++)
        if (pr.data[(y * pr.w + x) * 4 + 3] > 8) { cxs += x; cn++; }
    const headCx = cxs / cn;
    const s = 84 / side;
    crops[`u:${id}`] = {
      x: +(2 - (headCx - side / 2) * s).toFixed(1),
      y: +(2 - winTop * s).toFixed(1),
      w: +(320 * s).toFixed(1),
    };
    console.log(id, 'debris removed:', rm, 'figH:', bb.h, 'headCx:', headCx.toFixed(1));
  }
  console.log(JSON.stringify(crops));
  // preview sheet: stance + portrait + simulated hud crop per hero
  const cells = [];
  for (const id of IDS) {
    cells.push(await sharp(`assets/img/still/ultra-${id}-stance.png`).resize(180, 180).png().toBuffer());
    cells.push(await sharp(`assets/ui-lab/portrait-ultra-${id}-sel.png`).resize(167, 180).png().toBuffer());
    // simulate bakeFace: draw portrait scaled to HC.w at (HC.x-2, HC.y-2) in 84 canvas
    const hc = crops[`u:${id}`];
    const scl = await sharp(`assets/ui-lab/portrait-ultra-${id}-sel.png`)
      .resize(Math.round(hc.w), Math.round(hc.w * 344 / 320)).png().toBuffer();
    const ox = Math.round(hc.x - 2), oy = Math.round(hc.y - 2);
    const face = await sharp({ create: { width: 84, height: 84, channels: 4, background: { r: 27, g: 20, b: 16, alpha: 1 } } })
      .composite([{ input: await sharp(scl).extract({
          left: Math.max(0, -ox), top: Math.max(0, -oy),
          width: Math.min(Math.round(hc.w) + Math.min(0, ox), 84 - Math.max(0, ox)),
          height: Math.min(Math.round(hc.w * 344 / 320) + Math.min(0, oy), 84 - Math.max(0, oy)),
        }).png().toBuffer(), left: Math.max(0, ox), top: Math.max(0, oy) }])
      .png().resize(180, 180, { kernel: 'nearest' }).toBuffer();
    cells.push(face);
  }
  const comps = cells.map((c, i) => ({ input: c, left: (i % 3) * 190, top: Math.floor(i / 3) * 190 }));
  await sharp({ create: { width: 570, height: 950, channels: 4, background: { r: 45, g: 45, b: 66, alpha: 1 } } })
    .composite(comps).png().toFile(`${SCRATCH}/pass2.png`);
})();
