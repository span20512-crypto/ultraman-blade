/* Asset loading, particles / floating text / afterimages, projectiles. */
'use strict';

const Assets = {
  images: {},
  load() {
    const list = [
      ['bg', 'assets/img/background.png'],
      ['shop', 'assets/img/shop.png'],
    ];
    for (const cid of Object.keys(DATA)) {
      const c = DATA[cid];
      for (const [aname, a] of Object.entries(c.anims)) {
        list.push([`${cid}:${aname}`, `${c.dir}/${a.file}`]);
      }
    }
    return Promise.all(list.map(([key, src]) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { Assets.images[key] = img; res(); };
      img.onerror = () => rej(new Error('failed to load ' + src));
      img.src = src;
    })));
  },
  img(key) { return Assets.images[key]; },
};

/* Procedural 和风 stage: painted pixel-by-pixel at 256x144 with a seeded RNG,
   upscaled 4x. Dusk sky, red sun, pagoda & torii silhouettes, lanterns.
   The ground plane lands exactly on STAGE.ground (y=480 -> lowres y=120). */
const Stage = {
  canvas: null,

  build() {
    const W = 256, H = 144;
    const cv = document.createElement('canvas');
    cv.width = W * 4; cv.height = H * 4;
    const lo = document.createElement('canvas');
    lo.width = W; lo.height = H;
    const g = lo.getContext('2d');
    let seed = 20260704;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };

    // dusk sky bands
    const sky = ['#131022', '#181329', '#1e1630', '#261a38', '#31203f', '#3d2643', '#4a2c44'];
    sky.forEach((c, i) => px(0, i * 14, W, 14, c));
    // stars
    for (let i = 0; i < 34; i++) px(rnd() * W, rnd() * 52, 1, 1, rnd() < 0.3 ? '#cdbfd8' : '#7a6a90');
    // huge red sun, slightly left
    const sx = 96, sy = 66, sr = 34;
    for (let yy = -sr; yy <= sr; yy++) {
      const half = Math.floor(Math.sqrt(sr * sr - yy * yy));
      px(sx - half, sy + yy, half * 2, 1, yy < -sr + 6 ? '#a8241c' : '#c1272d');
    }
    px(sx - sr, sy - 2, sr * 2, 1, '#d64533'); // glint band
    // far mountains
    g.fillStyle = '#241a33';
    for (let x = 0; x < W; x += 2) {
      const h = 16 + Math.sin(x * 0.045) * 7 + Math.sin(x * 0.013) * 9;
      px(x, 96 - h, 2, h + 6, '#241a33');
    }
    // pagoda silhouette (right)
    const pag = (bx, by, s) => {
      for (let i = 0; i < 4; i++) {
        const w = (34 - i * 7) * s, y = by - i * 11 * s;
        px(bx - w / 2, y - 4 * s, w, 4 * s, '#171126');
        px(bx - w / 2 - 3 * s, y - 5 * s, w + 6 * s, 2 * s, '#171126');
        px(bx - (w - 8 * s) / 2, y - 11 * s, w - 8 * s, 7 * s, '#131022');
      }
      px(bx - 1, by - 50 * s, 2, 6 * s, '#171126');
    };
    pag(214, 100, 1);
    // torii gate silhouette (left-mid)
    const tor = (bx, by, s) => {
      px(bx - 16 * s, by - 26 * s, 3 * s, 26 * s, '#2b1420');
      px(bx + 13 * s, by - 26 * s, 3 * s, 26 * s, '#2b1420');
      px(bx - 22 * s, by - 30 * s, 44 * s, 4 * s, '#2b1420');
      px(bx - 25 * s, by - 32 * s, 50 * s, 2 * s, '#38181f');
      px(bx - 13 * s, by - 22 * s, 26 * s, 2 * s, '#2b1420');
    };
    tor(42, 106, 1);
    // near tree silhouettes
    g.fillStyle = '#0f0c1c';
    for (const tx of [8, 244]) {
      px(tx - 3, 40, 6, 66, '#0f0c1c');
      for (let i = 0; i < 26; i++) {
        const a = rnd() * Math.PI * 2, rr = 8 + rnd() * 20;
        px(tx + Math.cos(a) * rr - 4, 48 + Math.sin(a) * rr * 0.5 - 3, 8 + rnd() * 6, 5 + rnd() * 4, '#0f0c1c');
      }
    }
    // roofline strip with lanterns
    px(120, 88, 90, 3, '#171126');
    for (const lx of [132, 158, 184]) {
      px(lx, 91, 1, 4, '#171126');
      px(lx - 2, 95, 5, 6, '#8a3d1e');
      px(lx - 1, 96, 3, 4, '#e08a3c');
      px(lx, 97, 1, 2, '#ffd27a');
    }
    // ground: packed dirt, top edge exactly at y=120 (=480 in game)
    px(0, 118, W, 2, '#3d2b3a');       // dusk rim light on the ground edge
    px(0, 120, W, 24, '#241812');
    for (let i = 0; i < 260; i++) {
      const gy = 120 + rnd() * 24;
      px(rnd() * W, gy, 1 + rnd() * 3, 1, rnd() < 0.5 ? '#2a1c15' : '#1d130e');
    }
    px(0, 120, W, 1, '#171008');
    // sparse pebbles
    for (let i = 0; i < 14; i++) px(rnd() * W, 121 + rnd() * 20, 2, 1, '#3a2a20');

    const gc = cv.getContext('2d');
    gc.imageSmoothingEnabled = false;
    gc.drawImage(lo, 0, 0, W * 4, H * 4);
    this.canvas = cv;
  },
};

const Effects = {
  parts: [], texts: [], ghosts: [], slashes: [],

  reset() { this.parts = []; this.texts = []; this.ghosts = []; this.slashes = []; },

  /* 程序化刀光: 像素方块沿月牙弧铺开。前缘在生命前段扫过(sweep), 之后整体
     渐隐; 半径随时间微扩。角度约定: 0=正前, -PI/2=正上, dir 翻转左右。
     opts: r 半径 / a0,a1 起止角 / w 最大厚度 / life / color 内芯 color2 外缘
           grow 每“年龄”半径扩张 / rise 弧心垂直漂移 / vx 弧心沿朝向漂移 / sweep 扫过占比 */
  slash(x, y, dir, o = {}) {
    const life = o.life || 12;
    this.slashes.push({
      x, y, dir: dir >= 0 ? 1 : -1,
      r: o.r || 60,
      a0: o.a0 !== undefined ? o.a0 : -1.8,
      a1: o.a1 !== undefined ? o.a1 : 0.5,
      width: o.w || 10,
      color: o.color || '#ffffff', color2: o.color2 || '#ffe27a',
      grow: o.grow !== undefined ? o.grow : 0.8,
      rise: o.rise || 0, vx: o.vx || 0,
      sweep: o.sweep || 0.4, ry: o.ry || 1, // ry<1 压扁成贴地平弧
      life, maxLife: life,
    });
  },

  /* 聚气: 粒子从周围一圈向 (x,y) 汇聚, 到点即灭 (超杀起手/忍者内爆) */
  converge(x, y, colors, n = 8, r = 70) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = r * (0.55 + Math.random() * 0.75);
      const life = 9 + Math.random() * 10;
      this.parts.push({
        x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * 0.85,
        vx: -Math.cos(a) * rr / life, vy: -Math.sin(a) * rr * 0.85 / life,
        life, maxLife: life,
        size: 2 + Math.floor(Math.random() * 3),
        color: colors[Math.floor(Math.random() * colors.length)],
        grav: 0,
      });
    }
  },

  /* 花瓣: 粉白小片, 缓慢左右摇摆着飘落 (隼人超杀终结余韵) */
  petals(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: x + (Math.random() - 0.5) * 190, y: y - Math.random() * 140,
        vx: (Math.random() - 0.5) * 0.4, vy: 0.45 + Math.random() * 0.7,
        life: 52 + Math.random() * 38, maxLife: 90,
        size: 3 + (Math.random() < 0.35 ? 1 : 0),
        color: Math.random() < 0.6 ? '#ffd9df' : '#fff3ee',
        grav: 0, sway: 0.9 + Math.random() * 0.6, ph: Math.random() * 6.28,
      });
    }
  },

  spark(x, y, dir, colors, n = 12, pow = 5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.3 + Math.random()) * pow;
      this.parts.push({
        x, y,
        vx: Math.cos(a) * sp + dir * pow * 0.6,
        vy: Math.sin(a) * sp - 1.5,
        life: 14 + Math.random() * 12, maxLife: 26,
        size: 2 + Math.floor(Math.random() * 4),
        color: colors[Math.floor(Math.random() * colors.length)],
        grav: 0.18,
      });
    }
  },

  dust(x, y, n = 6, dir = 0) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: x + (Math.random() - 0.5) * 30, y: y - Math.random() * 8,
        vx: (Math.random() - 0.5) * 2 + dir * (1 + Math.random() * 2),
        vy: -(0.4 + Math.random() * 1.4),
        life: 16 + Math.random() * 10, maxLife: 26,
        size: 3 + Math.floor(Math.random() * 3),
        color: 'rgba(210,200,180,0.7)',
        grav: 0.02,
      });
    }
  },

  rise(x, y, color, n = 3) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: x + (Math.random() - 0.5) * 56, y: y - Math.random() * 130,
        vx: 0, vy: -(0.8 + Math.random() * 1.6),
        life: 20 + Math.random() * 14, maxLife: 34,
        size: 2 + Math.floor(Math.random() * 3),
        color, grav: 0,
      });
    }
  },

  ring(x, y, color, n = 18) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.parts.push({
        x, y,
        vx: Math.cos(a) * 6.5,
        vy: Math.sin(a) * 2.2 - 0.6,
        life: 15 + Math.random() * 7, maxLife: 22,
        size: 3 + Math.floor(Math.random() * 2),
        color, grav: 0.05,
      });
    }
  },

  text(x, y, str, color = '#ffe27a', size = 14) {
    this.texts.push({ x, y, str, color, size, life: 46, vy: -0.9 });
  },

  ghost(params) {
    this.ghosts.push({ ...params, life: 14 });
  },

  update(rate = 1) {
    for (const p of this.parts) {
      p.x += p.vx * rate; p.y += p.vy * rate;
      if (p.sway) p.x += Math.sin((p.maxLife - p.life) * 0.11 + p.ph) * p.sway * rate;
      p.vy += p.grav * rate; p.life -= rate;
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const t of this.texts) { t.y += t.vy * rate; t.life -= rate; }
    this.texts = this.texts.filter(t => t.life > 0);
    for (const g of this.ghosts) g.life -= rate;
    this.ghosts = this.ghosts.filter(g => g.life > 0);
    for (const s of this.slashes) {
      s.x += s.vx * s.dir * rate; s.y += s.rise * rate; s.life -= rate;
    }
    this.slashes = this.slashes.filter(s => s.life > 0);
  },

  drawGhosts(ctx) {
    for (const g of this.ghosts) {
      ctx.save();
      ctx.globalAlpha = 0.32 * (g.life / 14);
      if (g.flip) {
        ctx.translate(g.mirrorX, 0); ctx.scale(-1, 1); ctx.translate(-g.mirrorX, 0);
      }
      ctx.drawImage(g.img, g.sx, 0, 200, 200, g.dx, g.dy, g.dw, g.dh);
      ctx.restore();
    }
  },

  drawSlashes(ctx) {
    if (!this.slashes.length) return;
    ctx.save();
    for (const s of this.slashes) {
      const age = 1 - s.life / s.maxLife;                 // 0..1
      const head = Math.min(1, age / s.sweep);            // 前缘扫过进度
      const fade = age < s.sweep ? 1 : 1 - (age - s.sweep) / (1 - s.sweep);
      const r = s.r + s.grow * age * s.maxLife;
      const span = s.a1 - s.a0;
      const steps = Math.max(10, Math.round(Math.abs(span) * r / 4));
      const seg = [];
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        if (u > head) break;
        const trail = Math.max(0, 1 - (head - u) * 1.7);  // 尾迹拖影
        const alpha = (0.18 + 0.82 * trail) * fade;
        if (alpha <= 0.03) continue;
        seg.push({ u, ang: s.a0 + span * u, alpha });
      }
      // pass 1 外缘主题色 (source-over: 叠加不烧白, 月牙轮廓干净)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = s.color2;
      for (const g of seg) {
        const w = Math.max(2, Math.round(s.width * Math.pow(Math.sin(g.u * Math.PI), 0.65)));
        const px = Math.round((s.x + Math.cos(g.ang) * r * s.dir) / 2) * 2;
        const py = Math.round((s.y + Math.sin(g.ang) * r * s.ry) / 2) * 2;
        ctx.globalAlpha = Math.min(1, g.alpha) * 0.8;
        ctx.fillRect(px - (w >> 1) - 1, py - (w >> 1) - 1, w + 2, w + 2);
      }
      // pass 2 内芯亮色 (lighter: 沿弧内侧的灼热刃芯)
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = s.color;
      for (const g of seg) {
        const w = Math.max(2, Math.round(s.width * Math.pow(Math.sin(g.u * Math.PI), 0.65)));
        const wi = Math.max(2, Math.round(w * 0.42));
        const ix = Math.round((s.x + Math.cos(g.ang) * (r - w * 0.3) * s.dir) / 2) * 2;
        const iy = Math.round((s.y + Math.sin(g.ang) * (r - w * 0.3) * s.ry) / 2) * 2;
        ctx.globalAlpha = Math.min(1, g.alpha) * 0.55;
        ctx.fillRect(ix - (wi >> 1), iy - (wi >> 1), wi, wi);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  draw(ctx) {
    this.drawSlashes(ctx);
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife * 1.6));
      ctx.fillStyle = p.color;
      if (p.w) { // 长条粒子(速度线)
        ctx.fillRect(Math.round(p.x - p.w / 2), Math.round(p.y - p.h / 2), p.w, p.h);
      } else {
        const s = p.size;
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      }
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, t.life / 20));
      UI.pixText(ctx, t.str, t.x, t.y, { size: t.size, color: t.color, align: 'center', outline: true });
    }
    ctx.globalAlpha = 1;
  },
};

/* Kenji's shadow shuriken. Drawn procedurally (spinning pixel blades + glow). */
class Projectile {
  constructor(owner, def, x, y, dir) {
    this.owner = owner; this.def = def;
    this.x = x; this.y = y; this.dir = dir;
    this.vx = def.speed * dir;
    this.t = 0; this.dead = false;
  }

  update() {
    this.x += this.vx; this.t++;
    if (this.x < -40 || this.x > STAGE.w + 40) this.dead = true;
    if (this.t % 2 === 0) {
      Effects.parts.push({
        x: this.x - this.dir * 10, y: this.y + (Math.random() - 0.5) * 10,
        vx: -this.dir * 0.6, vy: (Math.random() - 0.5) * 0.6,
        life: 12, maxLife: 12, size: 3, color: 'rgba(125,91,255,0.75)', grav: 0,
      });
    }
  }

  box() { return { x1: this.x - 16, y1: this.y - 14, x2: this.x + 16, y2: this.y + 14 }; }

  draw(ctx) {
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.fillStyle = 'rgba(125,91,255,0.25)';
    ctx.fillRect(-14, -14, 28, 28);
    ctx.rotate(this.t * 0.45);
    ctx.fillStyle = '#c9baff';
    ctx.fillRect(-13, -3, 26, 6);
    ctx.fillRect(-3, -13, 6, 26);
    ctx.fillStyle = '#35e0d8';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
}
