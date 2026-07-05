/* All 2D UI drawing: text/panels, KOF-style HUD, title / controls /
   character-select / result screens, announcements. */
'use strict';

const UI = {
  portraits: {},
  ua: {}, // processed 和风 UI assets; any key may be null → programmatic fallback

  // ---- primitives ---------------------------------------------------------
  pixText(ctx, str, x, y, opts = {}) {
    const {
      size = 16, color = '#f4f1e8', align = 'left', baseline = 'alphabetic',
      outline = false, outlineColor = '#0d0f16', shadow = 0,
      shadowColor = 'rgba(0,0,0,0.65)', spacing = 0,
    } = opts;
    ctx.font = `${size}px PressStart, FusionPixelJA, FusionPixel, monospace`;
    ctx.textBaseline = baseline;

    const drawOne = (s, dx, dy, fill) => {
      ctx.fillStyle = fill;
      ctx.fillText(s, dx, dy);
    };

    if (spacing > 0) {
      ctx.textAlign = 'left';
      const widths = [...str].map(ch => ctx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + spacing * (str.length - 1);
      let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
      [...str].forEach((ch, i) => {
        if (shadow) drawOne(ch, cx + shadow, y + shadow, shadowColor);
        if (outline) for (const [ox, oy] of [[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,2],[-2,2],[2,-2]]) drawOne(ch, cx + ox, y + oy, outlineColor);
        drawOne(ch, cx, y, color);
        cx += widths[i] + spacing;
      });
      return;
    }

    ctx.textAlign = align;
    if (shadow) drawOne(str, x + shadow, y + shadow, shadowColor);
    if (outline) for (const [ox, oy] of [[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,2],[-2,2],[2,-2]]) drawOne(str, x + ox, y + oy, outlineColor);
    drawOne(str, x, y, color);
  },

  panel(ctx, x, y, w, h, opts = {}) {
    // lacquered wood panel with gold trim — 和风
    const { fill = 'rgba(22,17,13,0.94)', border = '#8a6a2f', accent = null, shadowOff = 5 } = opts;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + shadowOff, y + shadowOff, w, h);
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
    ctx.fillStyle = border;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    if (accent) {
      ctx.fillStyle = accent;
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = '#8a6a2f';
      ctx.fillRect(x, y + 4, w, 1);
    }
    // pixel corner notches
    ctx.fillStyle = '#07080c';
    ctx.fillRect(x - 5, y - 5, 4, 4);
    ctx.fillRect(x + w + 1, y - 5, 4, 4);
    ctx.fillRect(x - 5, y + h + 1, 4, 4);
    ctx.fillRect(x + w + 1, y + h + 1, 4, 4);
  },

  keycap(ctx, x, y, w, label) {
    const A = this.ua.keycap;
    if (!A) {
      ctx.fillStyle = '#0d0f16';
      ctx.fillRect(x + 3, y + 3, w, 34);
      ctx.fillStyle = '#4a5470';
      ctx.fillRect(x, y, w, 34);
      ctx.fillStyle = '#1c2130';
      ctx.fillRect(x + 2, y + 2, w - 4, 30);
      ctx.fillStyle = '#2a3145';
      ctx.fillRect(x + 2, y + 2, w - 4, 5);
      this.pixText(ctx, label, x + w / 2, y + 24, { size: 13, align: 'center', color: '#ffe27a' });
      return;
    }
    const H = 40, s = H / A.h, natW = A.w * s;
    if (w <= natW + 4) {
      // square-ish: uniform scale, centered in the requested slot
      ctx.drawImage(A.cv, x + (w - natW) / 2, y, natW, H);
    } else {
      // wide: 3-slice through the clean lacquer band between the rim corners
      const lw = Math.round(A.w * 0.21 * s), rw = Math.round(A.w * 0.195 * s);
      ctx.drawImage(A.cv, 0, 0, A.w * 0.21, A.h, x, y, lw, H);
      ctx.drawImage(A.cv, A.w * 0.805, 0, A.w * 0.195, A.h, x + w - rw, y, rw, H);
      ctx.drawImage(A.cv, A.w * 0.21, 0, A.w * 0.595, A.h, x + lw, y, w - lw - rw, H);
    }
    this.pixText(ctx, label, x + w / 2, y + Math.round(H * 0.42) + 5, { size: 13, align: 'center', color: '#ffe27a' });
  },

  // chosen fight backdrop: AI-painted alt stage or the procedural one
  bgCanvas(G) {
    return (G.stageArt === 'alt' && this.ua.stage) ? this.ua.stage.cv : Stage.canvas;
  },

  statBar(ctx, x, y, label, val, theme) {
    this.pixText(ctx, label, x, y + 10, { size: 12, color: '#9aa3bd' });
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < val ? theme : '#252b3d';
      ctx.fillRect(x + 52 + i * 22, y, 16, 12);
    }
  },

  drawCharPreview(ctx, cid, x, y, scale, tick, anim = 'idle', faceRight = true) {
    const c = DATA[cid];
    const a = c.anims[anim];
    const img = Assets.img(`${cid}:${anim}`);
    if (!img) return;
    const frame = Math.floor(tick / a.hold) % a.frames;
    const flip = (c.native === 1) !== faceRight;
    ctx.save();
    if (flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
    ctx.drawImage(img, frame * 200, 0, 200, 200,
      x - c.anchor.x * scale, y - c.anchor.y * scale, 200 * scale, 200 * scale);
    ctx.restore();
  },

  makePortraits() {
    for (const cid of Object.keys(DATA)) {
      const c = DATA[cid];
      const img = Assets.img(`${cid}:idle`);
      // auto face-crop: find the character bbox in idle frame 0, then zoom a
      // square onto the head (top of the bbox) so the face FILLS the portrait
      const mc = document.createElement('canvas');
      mc.width = 200; mc.height = 200;
      const mg = mc.getContext('2d');
      mg.drawImage(img, 0, 0, 200, 200, 0, 0, 200, 200);
      const data = mg.getImageData(0, 0, 200, 200).data;
      let bx1 = 200, by1 = 200, bx2 = 0, by2 = 0;
      for (let yy = 0; yy < 200; yy++) for (let xx = 0; xx < 200; xx++) {
        if (data[(yy * 200 + xx) * 4 + 3] > 40) {
          if (xx < bx1) bx1 = xx; if (xx > bx2) bx2 = xx;
          if (yy < by1) by1 = yy; if (yy > by2) by2 = yy;
        }
      }
      const H = by2 - by1, side = Math.max(26, Math.round(H * 0.42));
      const cxm = (bx1 + bx2) / 2, cym = by1 + H * 0.2;
      const sx = Math.round(cxm - side / 2), sy = Math.round(cym - side / 2);

      const cv = document.createElement('canvas');
      cv.width = 84; cv.height = 84;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#1b1410';
      g.fillRect(0, 0, 84, 84);
      g.drawImage(img, sx, sy, side, side, 0, 0, 84, 84);
      this.portraits[cid] = cv;
    }
  },

  // ---- fight HUD -----------------------------------------------------------
  drawHUD(ctx, G) {
    const [f1, f2] = G.fighters;

    // smooth "recent damage" ghost values
    for (const f of G.fighters) {
      if (f.dispHp === undefined) f.dispHp = f.hp;
      f.dispHp += (f.hp - f.dispHp) * 0.06;
      if (f.dispHp < f.hp) f.dispHp = f.hp;
    }

    this.healthBar(ctx, G, f1, 116, 470, false);
    this.healthBar(ctx, G, f2, 554, 908, true);
    this.guardBar(ctx, G, f1, 116, 470, false);
    this.guardBar(ctx, G, f2, 554, 908, true);

    // portraits: gold-corner lacquer frame asset (tassel mirrored to the outside)
    const P = this.ua.portrait;
    for (const [f, px, mir] of [[f1, 12, true], [f2, 924, false]]) {
      const shakeX = f.flash > 0 ? (Math.random() * 4 - 2) : 0;
      if (P) {
        const s = 86 / P.inner.w;
        ctx.fillStyle = f.c.theme;
        ctx.fillRect(px + shakeX, 10, 88, 88);
        ctx.drawImage(this.portraits[f.c.id], px + 2 + shakeX, 12, 84, 84);
        ctx.save();
        if (mir) {
          const cm = px + 44 + shakeX;
          ctx.translate(cm, 0); ctx.scale(-1, 1); ctx.translate(-cm, 0);
        }
        ctx.drawImage(P.cv, px + 1 + shakeX - P.inner.x * s, 11 - P.inner.y * s, P.w * s, P.h * s);
        ctx.restore();
      } else {
        ctx.fillStyle = '#0c0a09';
        ctx.fillRect(px - 4 + shakeX, 6, 96, 96);
        ctx.fillStyle = '#8a6a2f';
        ctx.fillRect(px - 2 + shakeX, 8, 92, 92);
        ctx.fillStyle = f.c.theme;
        ctx.fillRect(px + shakeX, 10, 88, 88);
        ctx.drawImage(this.portraits[f.c.id], px + 2 + shakeX, 12, 84, 84);
      }
    }

    // names
    this.pixText(ctx, `${f1.c.name} · ${f1.c.cn}`, 118, 66, { size: 12, color: '#efe6d5', outline: true });
    this.pixText(ctx, `${f2.c.name} · ${f2.c.cn}`, 906, 66, { size: 12, color: '#efe6d5', align: 'right', outline: true });
    if (G.p2IsAI) this.pixText(ctx, 'CPU', 906, 82, { size: 9, color: '#9a8f78', align: 'right' });

    // round pips
    for (let i = 0; i < 2; i++) {
      this.pip(ctx, 452 - i * 22, 78, f1.wins > i, f1.c.theme);
      this.pip(ctx, 572 + i * 22, 78, f2.wins > i, f2.c.theme);
    }

    // timer: carved vermillion hanko seal, ink digits on the parchment center
    const SL = this.ua.seal;
    if (SL) {
      const size = 92, ss = size / SL.w;
      ctx.drawImage(SL.cv, 512 - size / 2, 2, size, SL.h * ss);
      const dcy = 2 + (SL.inner.y + SL.inner.h / 2) * ss;
      if (G.mode === 'training') {
        this.pixText(ctx, '--', 512, dcy + 9, { size: 20, align: 'center', color: '#7a231a' });
      } else {
        const tsec = Math.max(0, Math.ceil(G.roundTimer));
        const urgent = tsec <= 10;
        const pulse = urgent && G.tick % 30 < 15;
        this.pixText(ctx, String(tsec).padStart(2, '0'), 512, dcy + (pulse ? 11 : 9), {
          size: pulse ? 24 : 20, align: 'center', color: urgent ? '#c22a20' : '#5f2015',
        });
      }
    } else {
      ctx.fillStyle = '#0c0a09';
      ctx.fillRect(478, 12, 68, 54);
      ctx.fillStyle = '#b32b20';
      ctx.fillRect(481, 15, 62, 48);
      ctx.fillStyle = '#d64533';
      ctx.fillRect(483, 17, 58, 4);
      if (G.mode === 'training') {
        this.pixText(ctx, '--', 512, 52, { size: 30, align: 'center', color: '#f4ead6', outline: true });
      } else {
        const tsec = Math.max(0, Math.ceil(G.roundTimer));
        const urgent = tsec <= 10;
        const pulse = urgent && G.tick % 30 < 15;
        this.pixText(ctx, String(tsec).padStart(2, '0'), 512, 52, {
          size: pulse ? 34 : 30, align: 'center', color: urgent ? '#ffe27a' : '#f4ead6', outline: true,
        });
      }
    }

    // power meters
    this.meterBar(ctx, G, f1, 24, false);
    this.meterBar(ctx, G, f2, 700, true);

    // combo counters
    this.comboCounter(ctx, G, f1, 150, false);
    this.comboCounter(ctx, G, f2, 874, true);

    // training info bar / key hint bar
    const strip = (x, y, w, h) => {
      ctx.fillStyle = 'rgba(10,8,6,0.8)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(217,164,65,0.5)';
      ctx.fillRect(x, y, w, 1);
      ctx.fillRect(x, y + h - 1, w, 1);
    };
    if (G.mode === 'training') {
      const names = { stand: 'STAND', guard: 'AUTO-GUARD', cpu: 'CPU' };
      strip(182, 470, 660, 24);
      this.pixText(ctx, `TRAINING · DUMMY: ${names[G.training.dummy]} (T) · R RESET · ∞ METER · AUTO HEAL · ESC EXIT`, 512, 487, {
        size: 12, align: 'center', color: '#ffe27a',
      });
    }
    if (G.showHint) {
      strip(172, 496, 680, 24);
      this.pixText(ctx, 'J LIGHT · K HEAVY · S CROUCH · AIR-K DIVE · U SPECIAL · I SUPER · HOLD BACK=GUARD · H HIDE', 512, 513, {
        size: 12, align: 'center', color: '#c9bfa8',
      });
    }
  },

  healthBar(ctx, G, f, xa, xb, mirror) {
    const A = this.ua.hpframe;
    if (A) {
      // asset frame: fills painted inside the frame's open window, frame on top
      const w = xb - xa, h = 22, y = 24;
      ctx.fillStyle = '#241d18';
      ctx.fillRect(xa, y, w, h);
      const gw = Math.max(0, w * f.dispHp / f.maxHp);
      ctx.fillStyle = '#e8e4d8';
      ctx.fillRect(mirror ? xb - gw : xa, y, gw, h);
      const hw = Math.max(0, w * f.hp / f.maxHp);
      const low = f.hp <= 30;
      ctx.fillStyle = low ? (G.tick % 20 < 10 ? '#ff4a3d' : '#c22a20') : f.c.theme;
      ctx.fillRect(mirror ? xb - hw : xa, y, hw, h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(xa, y + 2, w, 2);
      if (!mirror) ctx.drawImage(A.cv, xa - A.fill.x, y - A.fill.y);
      else {
        ctx.save(); ctx.scale(-1, 1);
        ctx.drawImage(A.cv, -(xb + A.fill.x), y - A.fill.y);
        ctx.restore();
      }
      return;
    }
    const w = xb - xa, h = 22, y = 24, skew = 14;
    const quad = (x1, x2, fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      if (!mirror) {
        ctx.moveTo(x1, y); ctx.lineTo(x2, y);
        ctx.lineTo(x2 - (x2 === xb ? skew : 0), y + h);
        ctx.lineTo(x1, y + h);
      } else {
        ctx.moveTo(x1, y); ctx.lineTo(x2, y);
        ctx.lineTo(x2, y + h);
        ctx.lineTo(x1 + (x1 === xa ? skew : 0), y + h);
      }
      ctx.closePath(); ctx.fill();
    };
    // lacquer frame with a gold hairline
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(xa - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = '#8a6a2f';
    ctx.fillRect(xa - 4, y - 4, w + 8, 2);
    quad(xa, xb, '#241d18');
    // ghost (recent damage)
    const gw = Math.max(0, w * f.dispHp / f.maxHp);
    if (!mirror) quad(xa, xa + gw, '#e8e4d8');
    else quad(xb - gw, xb, '#e8e4d8');
    // actual hp
    const hw = Math.max(0, w * f.hp / f.maxHp);
    const low = f.hp <= 30;
    const col = low ? (G.tick % 20 < 10 ? '#ff4a3d' : '#c22a20') : f.c.theme;
    if (!mirror) quad(xa, xa + hw, col);
    else quad(xb - hw, xb, col);
    // shine line
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(xa, y + 2, w, 3);
  },

  guardBar(ctx, G, f, xa, xb, mirror) {
    if (f.guard <= 1) return;
    const w = (xb - xa) * 0.6, y = this.ua.hpframe ? 57 : 52, h = 5;
    const bx = mirror ? xb - w : xa;
    ctx.fillStyle = '#0d0f16';
    ctx.fillRect(bx - 1, y - 1, w + 2, h + 2);
    const gw = w * Math.min(1, f.guard / 100);
    const hot = f.guard >= 65;
    ctx.fillStyle = hot ? (G.tick % 12 < 6 ? '#ff4a3d' : '#ffc531') : '#c9a24b';
    ctx.fillRect(mirror ? bx + w - gw : bx, y, gw, h);
    if (hot) this.pixText(ctx, 'GUARD!', mirror ? bx - 6 : bx + w + 6, y + 6, {
      size: 10, align: mirror ? 'right' : 'left', color: '#ff4a3d',
    });
  },

  pip(ctx, x, y, won, theme) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#0d0f16';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = won ? theme : '#252b3d';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  },

  meterBar(ctx, G, f, x, mirror) {
    const A = this.ua.meter;
    const isFull = f.meter >= 100;
    if (A) {
      // bamboo capsule asset: dark husk base + gold/vermillion lit overlay
      const y = 538, frac = Math.max(0, Math.min(1, f.meter / 100));
      const dx = x - A.fill.x, dy = y - A.fill.y;
      ctx.save();
      if (mirror) {
        const cm = x + A.fill.w / 2;
        ctx.translate(cm, 0); ctx.scale(-1, 1); ctx.translate(-cm, 0);
      }
      ctx.drawImage(A.empty, dx, dy);
      if (frac > 0.01) {
        const lit = isFull ? (G.tick % 14 < 7 ? A.gold : A.hot) : A.gold;
        ctx.beginPath();
        ctx.rect(x - 2, dy, A.fill.w * frac + 2, A.h);
        ctx.clip();
        ctx.drawImage(lit, dx, dy);
      }
      ctx.restore();
      const lx = mirror ? x + A.fill.w : x, la = mirror ? 'right' : 'left';
      this.pixText(ctx, isFull ? 'MAX! 超必殺 READY' : '気 POWER', lx, dy - 4, {
        size: 10, align: la, color: isFull ? '#ffe27a' : '#9a8f78',
      });
      return;
    }
    // bamboo-segment power gauge, lacquer + gold
    const w = 300, h = 15, y = 540;
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#8a6a2f';
    ctx.fillRect(x - 3, y - 3, w + 6, 2);
    ctx.fillStyle = '#241d18';
    ctx.fillRect(x, y, w, h);
    const mw = w * f.meter / 100;
    const full = f.meter >= 100;
    const col = full ? (G.tick % 14 < 7 ? '#ffe27a' : '#d64533') : '#d9a441';
    ctx.fillStyle = col;
    if (!mirror) ctx.fillRect(x, y, mw, h);
    else ctx.fillRect(x + w - mw, y, mw, h);
    // bamboo notches
    ctx.fillStyle = '#0c0a09';
    for (let i = 1; i < 4; i++) ctx.fillRect(x + (w / 4) * i - 1, y, 2, h);
    const lx = mirror ? x + w : x, la = mirror ? 'right' : 'left';
    this.pixText(ctx, full ? 'MAX! 超必殺 READY' : '気 POWER', lx, y - 7, {
      size: 10, align: la, color: full ? '#ffe27a' : '#9a8f78',
    });
  },

  comboCounter(ctx, G, f, x, mirror) {
    if (f.combo.count < 2 || f.combo.timer <= 0) { f.comboShown = 0; return; }
    if (f.comboShown !== f.combo.count) { f.comboShown = f.combo.count; f.comboPop = 10; }
    if (f.comboPop > 0) f.comboPop -= 0.5;
    const scale = 1 + (f.comboPop > 0 ? f.comboPop / 10 * 0.5 : 0);
    ctx.save();
    ctx.translate(x, 150);
    ctx.scale(scale, scale);
    this.pixText(ctx, String(f.combo.count), 0, 0, { size: 40, align: mirror ? 'right' : 'left', color: '#ffe27a', outline: true, shadow: 4 });
    this.pixText(ctx, 'HITS!', mirror ? 2 : -2, 22, { size: 13, align: mirror ? 'right' : 'left', color: '#ff9c3d', outline: true });
    ctx.restore();
  },

  // silk banner ribbon behind announcement text (no-op without the asset)
  ribbon(ctx, cx, cy, w) {
    const R = this.ua.ribbon;
    if (!R) return;
    const h = w * R.h / R.w;
    ctx.drawImage(R.cv, cx - w / 2, cy - h / 2, w, h);
  },

  // ---- announcements --------------------------------------------------------
  drawAnnounce(ctx, G) {
    const a = G.ann;
    if (!a) return;
    const cx = 512, cy = 250;
    const fadeIn = Math.min(1, a.t / 8);
    const life = a.dur - a.t;
    const fadeOut = Math.min(1, life / 10);
    ctx.globalAlpha = Math.min(fadeIn, fadeOut);

    if (a.style === 'ko') {
      const sx = cx + (Math.random() * 8 - 4), sy = cy + (Math.random() * 8 - 4);
      const sc = 1 + Math.max(0, (8 - a.t)) * 0.18;
      ctx.save(); ctx.translate(sx, sy); ctx.scale(sc, sc);
      this.pixText(ctx, a.text, 0, 20, { size: 88, align: 'center', color: '#ff4a3d', outline: true, shadow: 8 });
      ctx.restore();
    } else if (a.style === 'fight') {
      const sc = 1 + Math.max(0, (6 - a.t)) * 0.25;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
      this.pixText(ctx, a.text, 0, 15, { size: 56, align: 'center', color: '#ff9c3d', outline: true, shadow: 6 });
      ctx.restore();
    } else if (a.style === 'round') {
      const slide = Math.max(0, 10 - a.t) * 16;
      this.ribbon(ctx, cx, cy - 14, 560);
      this.pixText(ctx, a.text, cx - slide, cy, { size: 40, align: 'center', color: '#f4f1e8', outline: true, shadow: 5 });
      if (a.sub) this.pixText(ctx, a.sub, cx + slide, cy + 36, { size: 18, align: 'center', color: '#ffc531', outline: true });
    } else { // banner
      this.ribbon(ctx, cx, cy - 4, 640);
      this.pixText(ctx, a.text, cx, cy, { size: 34, align: 'center', color: '#f4f1e8', outline: true, shadow: 5 });
      if (a.sub) this.pixText(ctx, a.sub, cx, cy + 42, { size: 20, align: 'center', color: '#ffc531', outline: true });
    }
    ctx.globalAlpha = 1;
  },

  drawSuperBanner(ctx, G) {
    const sb = G.superBanner;
    if (!sb || sb.t <= 0) return;
    ctx.fillStyle = `rgba(5,6,12,${Math.min(0.66, sb.t / 20)})`;
    ctx.fillRect(0, 0, 1024, 576);
    // speed lines
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 10; i++) {
      const ly = (i * 63 + sb.t * 41) % 576;
      ctx.fillRect(0, ly, 1024, 2);
    }
    const f = sb.f;
    const slide = Math.max(0, sb.t - 16) * 26 * (f === G.fighters[0] ? -1 : 1);
    ctx.fillStyle = 'rgba(13,15,22,0.9)';
    ctx.fillRect(0, 220, 1024, 110);
    ctx.fillStyle = f.c.theme;
    ctx.fillRect(0, 220, 1024, 4);
    ctx.fillRect(0, 326, 1024, 4);
    this.pixText(ctx, sb.def.name, 512 + slide, 288, { size: 46, align: 'center', color: '#ffe27a', outline: true, shadow: 6 });
    this.pixText(ctx, `${f.c.cn} · ${f.c.name}  超必殺`, 512 + slide, 318, { size: 15, align: 'center', color: '#aab3cc' });
  },

  // ---- title ------------------------------------------------------------------
  drawTitle(ctx, G) {
    ctx.drawImage(this.bgCanvas(G), 0, 0);
    ctx.fillStyle = 'rgba(7,8,12,0.78)';
    ctx.fillRect(0, 0, 1024, 576);

    this.drawCharPreview(ctx, 'mack', 190, 500, 2.4, G.tick, 'idle', true);
    this.drawCharPreview(ctx, 'kenji', 834, 500, 2.4, G.tick, 'idle', false);

    // logo: enso emblem (asset) or rising sun disc + brush title, 和风
    ctx.save();
    const bob = Math.sin(G.tick * 0.04) * 4;
    ctx.translate(0, bob);
    // sun rays
    ctx.save();
    ctx.translate(512, 185);
    ctx.rotate(G.tick * 0.0012);
    ctx.fillStyle = 'rgba(179,43,32,0.16)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.fillRect(-13, -235, 26, 235);
    }
    ctx.restore();
    const TE = this.ua.title;
    if (TE) {
      const TW = 352, TH = TW * TE.h / TE.w;
      ctx.drawImage(TE.cv, 512 - TW / 2, 185 - TH / 2, TW, TH);
    } else {
      for (const [r, col] of [[152, '#8a6a2f'], [146, '#b32b20'], [138, '#c93527']]) {
        ctx.fillStyle = col;
        for (let yy = -r; yy <= r; yy += 4) {
          const half = Math.floor(Math.sqrt(r * r - yy * yy) / 4) * 4;
          ctx.fillRect(512 - half, 185 + yy, half * 2, 4);
        }
      }
    }
    this.pixText(ctx, '拳魂', 512, 226, { size: 108, align: 'center', color: '#f4ead6', outline: true, shadow: 8 });
    this.pixText(ctx, 'SOUL FIST', 512, 288, { size: 22, align: 'center', color: '#d9a441', outline: true, spacing: 8 });
    this.pixText(ctx, '- 和風 PIXEL FIGHTING -', 512, 316, { size: 10, align: 'center', color: '#9a8f78', spacing: 4 });
    ctx.restore();

    // menu: lacquered wood boards with a folding-fan cursor
    const items = ['VS CPU', 'TRAINING · 修行', 'HOW TO PLAY'];
    const MP = this.ua.panel, FAN = this.ua.cursor;
    items.forEach((it, i) => {
      const sel = G.titleSel === i;
      const bx = 322, by = 381 + i * 42, bw = 380, bh = 36;
      if (MP) {
        if (sel) { ctx.save(); ctx.filter = 'brightness(1.5) saturate(1.15)'; }
        this.nine(ctx, MP, bx, by, bw, bh, 0.13);
        if (sel) {
          ctx.restore();
          ctx.fillStyle = 'rgba(255,197,49,0.12)';
          ctx.fillRect(bx + 5, by + 5, bw - 10, bh - 10);
        }
      } else if (sel) {
        ctx.fillStyle = 'rgba(255,197,49,0.14)';
        ctx.fillRect(332, 384 + i * 42, 360, 32);
      }
      if (sel && G.tick % 30 < 22) {
        if (FAN) {
          const fw = 30, fh = fw * FAN.h / FAN.w;
          ctx.drawImage(FAN.cv, bx - fw - 10, by + bh / 2 - fh / 2, fw, fh);
          ctx.save(); ctx.scale(-1, 1);
          ctx.drawImage(FAN.cv, -(bx + bw + fw + 10), by + bh / 2 - fh / 2, fw, fh);
          ctx.restore();
        } else {
          this.pixText(ctx, '▶', 352, 407 + i * 42, { size: 16, color: '#ffc531' });
        }
      }
      this.pixText(ctx, it, 512, 405 + i * 42, {
        size: 16, align: 'center', color: sel ? '#ffe27a' : (MP ? '#b3a68d' : '#9aa3bd'), outline: sel,
      });
    });

    this.pixText(ctx, 'W/S SELECT · J OK · M MUTE', 512, 520, { size: 12, align: 'center', color: '#5d6784' });
    this.pixText(ctx, 'sprites: LuizMelo (itch.io free) · stage & UI art: gemini pixel gen', 512, 556, { size: 9, align: 'center', color: '#4a4136' });
  },

  // ---- controls / tutorial ------------------------------------------------------
  drawControls(ctx, G, asOverlay = false) {
    if (!asOverlay) {
      ctx.drawImage(this.bgCanvas(G), 0, 0);
      ctx.fillStyle = 'rgba(7,8,12,0.86)';
      ctx.fillRect(0, 0, 1024, 576);
    } else {
      ctx.fillStyle = 'rgba(7,8,12,0.82)';
      ctx.fillRect(0, 0, 1024, 576);
    }
    if (this.ua.panel) this.nine(ctx, this.ua.panel, 62, 40, 900, 496, 0.28);
    else this.panel(ctx, 62, 40, 900, 496, { accent: '#ffc531' });
    this.pixText(ctx, 'HOW TO PLAY · 操作', 512, 84, { size: 24, align: 'center', color: '#ffe27a', outline: true });

    const rows = [
      ['A D', 'MOVE / HOLD BACK = GUARD', 'W', 'JUMP (works in dash)'],
      ['J', 'LIGHT (alternating slashes)', 'K', 'HEAVY / IN AIR = DIVE SLAM'],
      ['S', 'CROUCH: J LOW STAB / K LAUNCHER', 'U I', 'SPECIAL (cooldown) / SUPER (MAX 気)'],
      ['A A / D D', 'DASH / BACKDASH (i-frames)', '', ''],
    ];
    let y = 118;
    for (const [k1, d1, k2, d2] of rows) {
      this.keycap(ctx, 100, y, Math.max(44, k1.length * 13 + 18), k1);
      this.pixText(ctx, d1, 240, y + 24, { size: 15, color: '#efe6d5' });
      if (k2) {
        this.keycap(ctx, 540, y, Math.max(44, k2.length * 13 + 18), k2);
        this.pixText(ctx, d2, 690, y + 24, { size: 15, color: '#efe6d5' });
      }
      y += 52;
    }

    // combo branch callout
    ctx.fillStyle = 'rgba(217,164,65,0.1)';
    ctx.fillRect(100, y, 824, 40);
    this.pixText(ctx, 'COMBO ENDERS: J-J-K then K (knockdown) / U (HAYATO) / I (SUPER, MAX 気)', 112, y + 26, { size: 15, color: '#d9a441' });
    y += 56;

    // combo route
    this.pixText(ctx, 'COMBO · 連携', 100, y + 16, { size: 15, color: '#ffc531' });
    const route = ['J', 'J', 'K', 'K', 'U', 'I'];
    let rx = 300;
    route.forEach((k, i) => {
      this.keycap(ctx, rx, y - 6, 44, k);
      if (i < route.length - 1) this.pixText(ctx, '→', rx + 52, y + 18, { size: 16, color: '#8892ad' });
      rx += 74;
    });
    this.pixText(ctx, 'Chained hits 3+ get BONUS x1.3 · KENJI\'s U is a zoning shuriken, not a combo piece', 300, y + 52, { size: 12, color: '#9a8f78' });
    y += 74;

    this.pixText(ctx, 'GUARD = hold AWAY at the moment of impact · not while attacking/jumping/dashing · full gauge = GUARD CRUSH', 512, y + 8, {
      size: 12, align: 'center', color: '#ff9c3d',
    });
    this.pixText(ctx, 'Hits & guards build 気 · chip never kills · ESC PAUSE · M MUTE · H HIDE HINTS', 512, y + 28, {
      size: 12, align: 'center', color: '#8892ad',
    });

    this.pixText(ctx, asOverlay ? 'J / K  BACK' : 'J  BACK TO TITLE', 512, 522, {
      size: 14, align: 'center', color: G.tick % 40 < 25 ? '#ffe27a' : '#8892ad',
    });
  },

  // ---- character select ------------------------------------------------------------
  drawSelect(ctx, G) {
    ctx.drawImage(this.bgCanvas(G), 0, 0);
    ctx.fillStyle = 'rgba(7,8,12,0.84)';
    ctx.fillRect(0, 0, 1024, 576);

    const s = G.select;

    if (s.phase === 'vs') {
      // VS splash: crossed-katana emblem
      const t = s.vsT;
      const off = Math.max(0, 20 - t) * 18;
      ctx.fillStyle = 'rgba(13,15,22,0.9)';
      ctx.fillRect(0, 150, 1024, 280);
      ctx.fillStyle = '#8a6a2f';
      ctx.fillRect(0, 150, 1024, 2);
      ctx.fillRect(0, 428, 1024, 2);
      this.drawCharPreview(ctx, s.p1, 250 - off, 430, 2.6, G.tick, 'idle', true);
      this.drawCharPreview(ctx, s.p2, 774 + off, 430, 2.6, G.tick, 'idle', false);
      this.pixText(ctx, DATA[s.p1].name, 250 - off, 480, { size: 22, align: 'center', color: DATA[s.p1].theme, outline: true });
      this.pixText(ctx, DATA[s.p2].name, 774 + off, 480, { size: 22, align: 'center', color: DATA[s.p2].theme, outline: true });
      const vsScale = 1 + Math.max(0, 12 - t) * 0.3;
      const VE = this.ua.vs;
      ctx.save(); ctx.translate(512, 290); ctx.scale(vsScale, vsScale);
      if (VE) {
        const W = 236, H = W * VE.h / VE.w;
        ctx.drawImage(VE.cv, -W / 2, -H / 2, W, H);
        this.pixText(ctx, 'VS', 0, 30, { size: 44, align: 'center', color: '#ffc531', outline: true, shadow: 5 });
      } else {
        this.pixText(ctx, 'VS', 0, 34, { size: 72, align: 'center', color: '#ffc531', outline: true, shadow: 6 });
      }
      ctx.restore();
      this.pixText(ctx, s.training ? 'TRAINING' : `${AI_DIFFS[s.diff].en} · ${AI_DIFFS[s.diff].label}`,
        512, 530, { size: 15, align: 'center', color: '#9aa3bd' });
      return;
    }

    this.pixText(ctx, '選べ、己の剣', 512, 66, { size: 28, align: 'center', color: '#f4ead6', outline: true, shadow: 4 });
    this.pixText(ctx, 'CHOOSE YOUR FIGHTER', 512, 92, { size: 11, align: 'center', color: '#8892ad', spacing: 4 });

    const ids = ['mack', 'kenji'];
    ids.forEach((cid, i) => {
      const c = DATA[cid];
      const x = i === 0 ? 152 : 552;
      const hovered = s.phase === 'char' && s.cursor === i;
      const chosen = s.p1 === cid;
      if (this.ua.panel) {
        if (!hovered && !chosen) { ctx.save(); ctx.filter = 'brightness(0.72)'; }
        this.nine(ctx, this.ua.panel, x, 116, 320, 330, 0.26);
        if (!hovered && !chosen) ctx.restore();
        ctx.fillStyle = c.theme; // character-theme band under the top border
        ctx.globalAlpha = hovered || chosen ? 1 : 0.45;
        ctx.fillRect(x + 15, 130, 290, 3);
        ctx.globalAlpha = 1;
      } else {
        this.panel(ctx, x, 116, 320, 330, {
          border: hovered || chosen ? c.theme : '#3a4157',
          accent: c.theme,
          fill: hovered ? 'rgba(22,26,40,0.95)' : 'rgba(16,19,28,0.92)',
        });
      }
      const animName = hovered || chosen ? 'run' : 'idle';
      this.drawCharPreview(ctx, cid, x + 160, 296, 2.25, G.tick, animName, i === 0);
      this.pixText(ctx, c.name, x + 160, 336, { size: 21, align: 'center', color: c.theme, outline: true });
      this.pixText(ctx, `${c.cn} · ${c.title}`, x + 160, 362, { size: 14, align: 'center', color: '#efe6d5' });
      this.pixText(ctx, `${c.type} TYPE`, x + 160, 381, { size: 10, align: 'center', color: '#9a8f78', spacing: 2 });
      this.statBar(ctx, x + 74, 398, '力', c.stats.pow, c.theme);
      this.statBar(ctx, x + 74, 416, '速', c.stats.spd, c.theme);
      if (hovered && G.tick % 30 < 20) {
        this.pixText(ctx, '▼', x + 160, 112, { size: 16, align: 'center', color: '#ffc531' });
      }
      if (chosen && s.phase !== 'char') {
        this.pixText(ctx, '1P', x + 18, 146, { size: 14, color: '#ffe27a', outline: true });
      }
    });

    if (s.phase === 'char') {
      this.pixText(ctx, 'A/D SELECT · J OK · K BACK', 512, 500, { size: 12, align: 'center', color: '#9a8f78', spacing: 1 });
      const other = s.cursor === 0 ? 'kenji' : 'mack';
      this.pixText(ctx, s.training ? `DUMMY: ${DATA[other].name}` : `CPU: ${DATA[other].name}`,
        512, 478, { size: 12, align: 'center', color: '#5d6784' });
    } else if (s.phase === 'diff') {
      this.pixText(ctx, 'DIFFICULTY · 難易度', 512, 478, { size: 15, align: 'center', color: '#ffc531', outline: true });
      const keys = ['easy', 'normal', 'hard'];
      keys.forEach((k, i) => {
        const dd = AI_DIFFS[k];
        const sel = s.diffCursor === i;
        const bx = 262 + i * 180;
        if (this.ua.panel) {
          if (sel) { ctx.save(); ctx.filter = 'brightness(1.5) saturate(1.15)'; }
          this.nine(ctx, this.ua.panel, bx, 490, 160, 40, 0.13);
          if (sel) {
            ctx.restore();
            ctx.fillStyle = 'rgba(255,197,49,0.12)';
            ctx.fillRect(bx + 5, 495, 150, 30);
          }
        } else {
          ctx.fillStyle = sel ? 'rgba(255,197,49,0.16)' : 'rgba(16,19,28,0.8)';
          ctx.fillRect(bx, 490, 160, 40);
          ctx.fillStyle = sel ? '#ffc531' : '#3a4157';
          ctx.fillRect(bx, 490, 160, 3);
        }
        this.pixText(ctx, `${dd.label} ${dd.en}`, bx + 80, 516, {
          size: 13, align: 'center', color: sel ? '#ffe27a' : (this.ua.panel ? '#b3a68d' : '#9aa3bd'),
        });
      });
      const dd = AI_DIFFS[keys[s.diffCursor]];
      this.pixText(ctx, dd.desc + '   (A/D SELECT · J FIGHT · K BACK)', 512, 552, { size: 12, align: 'center', color: '#9a8f78' });
    }
  },

  // ---- result -----------------------------------------------------------------------
  drawResult(ctx, G) {
    ctx.drawImage(this.bgCanvas(G), 0, 0);
    ctx.fillStyle = 'rgba(7,8,12,0.82)';
    ctx.fillRect(0, 0, 1024, 576);

    const r = G.result;
    const winner = r.winner;
    const playerWon = winner === G.fighters[0];

    this.drawCharPreview(ctx, winner.c.id, 512, 400, 2.6, G.tick, 'idle', true);

    const RB = this.ua.ribbon;
    if (RB) {
      const RW = 560, RH = RW * RB.h / RB.w;
      ctx.drawImage(RB.cv, 512 - RW / 2, 116 - RH / 2, RW, RH);
    }
    this.pixText(ctx, playerWon ? 'VICTORY' : 'DEFEAT', 512, 130, {
      size: 54, align: 'center', color: playerWon ? '#ffc531' : '#f4ead6', outline: true, shadow: 6, spacing: 6,
    });
    this.pixText(ctx, playerWon ? '勝利' : '敗北', 512, RB ? 208 : 172, { size: 22, align: 'center', color: '#f4f1e8', outline: true });

    if (this.ua.panel) this.nine(ctx, this.ua.panel, 312, 428, 400, 62, 0.14);
    else this.panel(ctx, 312, 428, 400, 62, { accent: winner.c.theme });
    this.pixText(ctx, `${winner.c.cn}:「${playerWon ? winner.c.quoteWin : winner.c.quoteWin}」`, 512, 466, {
      size: 14, align: 'center', color: '#dfe4f2',
    });

    this.pixText(ctx, `MAX COMBO: ${G.stats.maxCombo} HITS`, 512, this.ua.ribbon ? 240 : 218, { size: 13, align: 'center', color: '#9aa3bd' });

    this.pixText(ctx, 'J REMATCH · K CHARACTER · ESC TITLE', 512, 530, {
      size: 14, align: 'center', color: G.tick % 40 < 25 ? '#ffe27a' : '#8892ad',
    });
  },

  // ---- pause ------------------------------------------------------------------------
  drawPause(ctx, G) {
    if (G.pauseView === 'keys') { this.drawControls(ctx, G, true); return; }
    ctx.fillStyle = 'rgba(7,8,12,0.7)';
    ctx.fillRect(0, 0, 1024, 576);
    if (this.ua.panel) this.nine(ctx, this.ua.panel, 362, 200, 300, 176, 0.2);
    else this.panel(ctx, 362, 200, 300, 176, { accent: '#ffc531' });
    this.pixText(ctx, 'PAUSED · 一時停止', 512, 246, { size: 20, align: 'center', color: '#ffe27a', outline: true });
    this.pixText(ctx, 'J  RESUME', 512, 292, { size: 15, align: 'center', color: '#dfe4f2' });
    this.pixText(ctx, 'K  HOW TO PLAY', 512, 320, { size: 15, align: 'center', color: '#dfe4f2' });
    this.pixText(ctx, 'ESC  QUIT TO TITLE', 512, 348, { size: 15, align: 'center', color: '#9aa3bd' });
  },

  // ==== 和风 asset pipeline ===================================================
  // Gemini-generated 1024px source art in assets/ui-lab/ is processed at boot:
  // background knockout (flood fill from borders / from center for hollow
  // frames), alpha-bbox trim, inner-window metrics, and pre-composed
  // display-size canvases for the HUD bars. Every step is fail-safe: a broken
  // asset leaves ua[key] = null and the programmatic drawing takes over.
  async loadAssets() {
    const jobs = {
      portrait: () => this._procHole('portrait-frame.png'),
      hpframe:  () => this._procHpFrame(),
      meter:    () => this._procMeter(),
      panel:    () => this._procPanel(),
      keycap:   () => this._procKeycap(),
      seal:     () => this._procSeal(),
      title:    () => this._procSimple('title-emblem.png'),
      vs:       () => this._procSimple('vs-emblem.png'),
      stage:    () => this._procStage(),
      ribbon:   () => this._procSimple('banner-ribbon.png'),
      cursor:   () => this._procSimple('cursor-fan.png'),
    };
    for (const [k, fn] of Object.entries(jobs)) {
      try { this.ua[k] = await fn(); }
      catch (e) { console.warn('UI asset "' + k + '" failed, using fallback:', e); this.ua[k] = null; }
    }
  },

  _loadImg(file) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('missing ' + file));
      i.src = '/assets/ui-lab/' + file;
    });
  },

  _cv(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [c, g];
  },

  _srcData(img, crop) {
    const r = crop || { x: 0, y: 0, w: img.width, h: img.height };
    const [cv, g] = this._cv(r.w, r.h);
    g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    return { cv, g, id: g.getImageData(0, 0, r.w, r.h), w: r.w, h: r.h };
  },

  _cornerBg(id, w, h) {
    const d = id.data; let r = 0, g = 0, b = 0, n = 0;
    for (const [cx, cy] of [[0, 0], [w - 8, 0], [0, h - 8], [w - 8, h - 8]]) {
      for (let y = cy; y < cy + 8; y++) for (let x = cx; x < cx + 8; x++) {
        const i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      }
    }
    return [r / n, g / n, b / n];
  },

  _borderSeeds(w, h) {
    const s = [];
    for (let x = 0; x < w; x += 3) s.push([x, 0], [x, h - 1]);
    for (let y = 0; y < h; y += 3) s.push([0, y], [w - 1, y]);
    return s;
  },

  // flood-erase (alpha=0) pixels color-connected to seeds; returns erased bbox
  _flood(id, w, h, seeds, bg, tol) {
    const d = id.data, t2 = tol * tol;
    const seen = new Uint8Array(w * h);
    const q = new Int32Array(w * h);
    let qh = 0, qt = 0;
    const ok = i => {
      const j = i * 4, dr = d[j] - bg[0], dg = d[j + 1] - bg[1], db = d[j + 2] - bg[2];
      return dr * dr + dg * dg + db * db < t2;
    };
    for (const [sx, sy] of seeds) {
      const i = sy * w + sx;
      if (!seen[i] && ok(i)) { seen[i] = 1; q[qt++] = i; }
    }
    let x1 = w, y1 = h, x2 = -1, y2 = -1;
    while (qh < qt) {
      const i = q[qh++], x = i % w, y = (i - x) / w;
      d[i * 4 + 3] = 0;
      if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
      if (x > 0 && !seen[i - 1] && ok(i - 1)) { seen[i - 1] = 1; q[qt++] = i - 1; }
      if (x < w - 1 && !seen[i + 1] && ok(i + 1)) { seen[i + 1] = 1; q[qt++] = i + 1; }
      if (y > 0 && !seen[i - w] && ok(i - w)) { seen[i - w] = 1; q[qt++] = i - w; }
      if (y < h - 1 && !seen[i + w] && ok(i + w)) { seen[i + w] = 1; q[qt++] = i + w; }
    }
    return x2 < 0 ? null : { x1, y1, x2, y2 };
  },

  _alphaBBox(id, w, h) {
    const d = id.data;
    let x1 = w, y1 = h, x2 = -1, y2 = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (d[(row + x) * 4 + 3] > 8) {
          if (x < x1) x1 = x; if (x > x2) x2 = x;
          if (y < y1) y1 = y; if (y > y2) y2 = y;
        }
      }
    }
    if (x2 < 0) throw new Error('asset fully transparent after knockout');
    return { x1, y1, x2, y2 };
  },

  // write id back into dat.cv, crop to alpha bbox → {cv,w,h,ox,oy}
  _trim(dat) {
    dat.g.putImageData(dat.id, 0, 0);
    const b = this._alphaBBox(dat.id, dat.w, dat.h);
    const [cv, g] = this._cv(b.x2 - b.x1 + 1, b.y2 - b.y1 + 1);
    g.drawImage(dat.cv, -b.x1, -b.y1);
    return { cv, w: cv.width, h: cv.height, ox: b.x1, oy: b.y1 };
  },

  _eraseRect(id, w, x, y, rw, rh) {
    const d = id.data;
    for (let yy = y; yy < y + rh; yy++)
      for (let xx = x; xx < x + rw; xx++) d[(yy * w + xx) * 4 + 3] = 0;
  },

  // plain asset: knockout outer bg + trim
  async _procSimple(file, tol = 38) {
    const img = await this._loadImg(file);
    const dat = this._srcData(img);
    const bg = this._cornerBg(dat.id, dat.w, dat.h);
    this._flood(dat.id, dat.w, dat.h, this._borderSeeds(dat.w, dat.h), bg, tol);
    return this._trim(dat);
  },

  // hollow frame: knockout outer bg AND enclosed center hole; record hole rect
  async _procHole(file, tol = 38) {
    const img = await this._loadImg(file);
    const dat = this._srcData(img);
    const bg = this._cornerBg(dat.id, dat.w, dat.h);
    this._flood(dat.id, dat.w, dat.h, this._borderSeeds(dat.w, dat.h), bg, tol);
    const ob = this._alphaBBox(dat.id, dat.w, dat.h);
    const hole = this._flood(dat.id, dat.w, dat.h,
      [[Math.round((ob.x1 + ob.x2) / 2), Math.round((ob.y1 + ob.y2) / 2)]], bg, tol);
    if (!hole) throw new Error('no center hole found in ' + file);
    const t = this._trim(dat);
    t.inner = { x: hole.x1 - t.ox, y: hole.y1 - t.oy, w: hole.x2 - hole.x1 + 1, h: hole.y2 - hole.y1 + 1 };
    return t;
  },

  // health bar: open frame (rails + end scrolls) → pre-composed display canvas.
  // The fill window (transparent run between the rails / between the caps) maps
  // exactly onto the 354x22 HP fill used by drawHUD.
  async _procHpFrame() {
    const img = await this._loadImg('healthbar-frame.png');
    const dat = this._srcData(img);
    const bg = this._cornerBg(dat.id, dat.w, dat.h);
    this._flood(dat.id, dat.w, dat.h, this._borderSeeds(dat.w, dat.h), bg, 38);
    const t = this._trim(dat);
    const g = t.cv.getContext('2d');
    const id = g.getImageData(0, 0, t.w, t.h);
    const a = (x, y) => id.data[(y * t.w + x) * 4 + 3] > 8;
    // fill window: transparent run through the frame center
    const cy = Math.round(t.h / 2), cx = Math.round(t.w / 2);
    let fx1 = cx, fx2 = cx, fy1 = cy, fy2 = cy;
    while (fx1 > 0 && !a(fx1 - 1, cy)) fx1--;
    while (fx2 < t.w - 1 && !a(fx2 + 1, cy)) fx2++;
    while (fy1 > 0 && !a(cx, fy1 - 1)) fy1--;
    while (fy2 < t.h - 1 && !a(cx, fy2 + 1)) fy2++;
    if (fx2 - fx1 < t.w * 0.5 || fy2 - fy1 < 20) throw new Error('hp frame window detect failed');
    const FW = 354, FH = 22; // display fill size (must match drawHUD bars)
    const s = FH / (fy2 - fy1 + 1);
    const capL = fx1, capR = t.w - fx2 - 1;
    const W = Math.round(FW + (capL + capR) * s), H = Math.round(t.h * s);
    const [cv, c] = this._cv(W, H);
    const cut = 70; // slice a bit inside the fill so end art keeps its aspect
    const lw = Math.round((capL + cut) * s), rw = Math.round((capR + cut) * s);
    c.drawImage(t.cv, 0, 0, capL + cut, t.h, 0, 0, lw, H);
    c.drawImage(t.cv, fx2 - cut, 0, capR + cut + 1, t.h, W - rw, 0, rw, H);
    c.drawImage(t.cv, capL + cut, 0, fx2 - cut - capL - cut, t.h, lw, 0, W - lw - rw, H);
    return { cv, w: W, h: H, fill: { x: Math.round(capL * s), y: Math.round(fy1 * s), w: FW, h: FH } };
  },

  // power meter: bamboo capsule cropped out of the ornamental sheet, three
  // recolored variants (empty husk / gold charge / vermillion MAX) composed at
  // display size with tiled bamboo segments.
  async _procMeter() {
    const img = await this._loadImg('meter-bar.png');
    const C = { x: 104, y: 392, w: 815, h: 233 };      // capsule crop (measured)
    const dat = this._srcData(img, C);
    this._eraseRect(dat.id, dat.w, 236, 0, 351, 20);   // sun disc overlap (top)
    this._eraseRect(dat.id, dat.w, 91, 209, 634, 24);  // banner overlap (bottom)
    const bg = this._cornerBg(dat.id, dat.w, dat.h);
    this._flood(dat.id, dat.w, dat.h, this._borderSeeds(dat.w, dat.h), bg, 38);
    dat.g.putImageData(dat.id, 0, 0);
    const bb = this._alphaBBox(dat.id, dat.w, dat.h);
    // measured features in crop coords → trimmed coords
    const knot0 = 191.5 - bb.x1, knot1 = 335.5 - bb.x1, knot3 = 623 - bb.x1;
    const band = { x1: 56 - bb.x1, x2: 755 - bb.x1, y1: 68 - bb.y1, y2: 164 - bb.y1 };
    const tw = bb.x2 - bb.x1 + 1, th = bb.y2 - bb.y1 + 1;
    const variant = (mode) => {
      const [vc, vg] = this._cv(tw, th);
      vg.drawImage(dat.cv, -bb.x1, -bb.y1);
      const vid = vg.getImageData(0, 0, tw, th), d = vid.data;
      for (let y = Math.max(0, band.y1); y <= Math.min(th - 1, band.y2); y++) {
        for (let x = Math.max(0, band.x1); x <= Math.min(tw - 1, band.x2); x++) {
          const i = (y * tw + x) * 4;
          if (d[i + 3] < 8) continue;
          const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (lum <= 55) continue; // keep dark knots / track
          if (mode === 'empty') { d[i] *= 0.30; d[i + 1] *= 0.30; d[i + 2] *= 0.30; }
          else {
            const tt = Math.max(0, Math.min(1, (lum - 45) / 170));
            const ramp = mode === 'gold'
              ? [107 + 148 * tt, 74 + 152 * tt, 26 + 96 * tt]
              : [122 + 133 * tt, 20 + 130 * tt, 16 + 44 * tt];
            d[i] = ramp[0]; d[i + 1] = ramp[1]; d[i + 2] = ramp[2];
          }
        }
      }
      vg.putImageData(vid, 0, 0);
      return vc;
    };
    // compose display-size: end caps at native scale, 12 tiled bamboo segments
    const FW = 300, FH = 34;                            // fill width / frame height
    const s = FH / th;
    const leftW = knot0 * s, rightW = (tw - knot3) * s;
    const fillL = (knot0 - band.x1) * s, fillR = (band.x2 - knot3) * s;
    const midW = FW - fillL - fillR;
    const N = 12, tileW = midW / N, tileSrcW = knot1 - knot0;
    const W = Math.round(leftW + midW + rightW), H = FH;
    const compose = (srcCv) => {
      const [cv, c] = this._cv(W, H);
      c.drawImage(srcCv, 0, 0, knot0, th, 0, 0, leftW, H);
      for (let i = 0; i < N; i++)
        c.drawImage(srcCv, knot0, 0, tileSrcW, th, leftW + i * tileW, 0, tileW + 0.5, H);
      c.drawImage(srcCv, knot3, 0, tw - knot3, th, leftW + midW, 0, rightW, H);
      return cv;
    };
    return {
      empty: compose(variant('empty')), gold: compose(variant('gold')), hot: compose(variant('hot')),
      w: W, h: H,
      fill: { x: band.x1 * s, y: band.y1 * s, w: FW, h: (band.y2 - band.y1 + 1) * s },
    };
  },

  // menu board: erase the hanging rope knot (clone clean board columns over it)
  async _procPanel() {
    const img = await this._loadImg('menu-panel.png');
    const dat = this._srcData(img);
    const d = dat.id.data;
    for (let y = 300; y <= 452; y++) {
      for (let x = 452; x <= 572; x++) {
        const i = (y * dat.w + x) * 4, j = (y * dat.w + x + 220) * 4;
        d[i] = d[j]; d[i + 1] = d[j + 1]; d[i + 2] = d[j + 2]; d[i + 3] = d[j + 3];
      }
    }
    const bg = this._cornerBg(dat.id, dat.w, dat.h);
    this._flood(dat.id, dat.w, dat.h, this._borderSeeds(dat.w, dat.h), bg, 38);
    return this._trim(dat);
  },

  async _procKeycap() {
    const img = await this._loadImg('keycap.png');
    const dat = this._srcData(img);
    const d = dat.id.data;
    // erase the red petal decorations on the key face (noise under labels)
    for (let y = 330; y <= 600; y++) {
      for (let x = 340; x <= 690; x++) {
        const i = (y * dat.w + x) * 4;
        if (d[i] > 100 && d[i] > d[i + 1] * 1.6 && d[i] > d[i + 2] * 1.6) {
          d[i] = 50; d[i + 1] = 41; d[i + 2] = 43;
        }
      }
    }
    const bg = this._cornerBg(dat.id, dat.w, dat.h);
    this._flood(dat.id, dat.w, dat.h, this._borderSeeds(dat.w, dat.h), bg, 34);
    return this._trim(dat);
  },

  async _procSeal() {
    const t = await this._procSimple('timer-seal.png');
    // parchment window: light-pixel bbox scanned inside the central region
    const g = t.cv.getContext('2d');
    const id = g.getImageData(0, 0, t.w, t.h), d = id.data;
    let x1 = t.w, y1 = t.h, x2 = -1, y2 = -1;
    for (let y = Math.round(t.h * 0.2); y < t.h * 0.8; y++) {
      for (let x = Math.round(t.w * 0.2); x < t.w * 0.8; x++) {
        const i = (y * t.w + x) * 4;
        if (d[i + 3] > 8 && d[i] > 170 && d[i + 1] > 140 && d[i + 2] > 90) {
          if (x < x1) x1 = x; if (x > x2) x2 = x;
          if (y < y1) y1 = y; if (y > y2) y2 = y;
        }
      }
    }
    if (x2 < 0) throw new Error('seal parchment not found');
    t.inner = { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 };
    return t;
  },

  // alt stage: crop the letterboxed painting, land its ground line on y=480,
  // extend the sky upward with a gradient + stars
  async _procStage() {
    const img = await this._loadImg('stage-alt.png');
    const C = { x: 102, y: 340, w: 815, h: 347 }, groundRel = 268; // measured
    const s = 1024 / C.w;
    const top = Math.round(480 - groundRel * s);
    const [cv, g] = this._cv(1024, 576);
    // sky: sample content top rows
    const sd = this._srcData(img, { x: C.x, y: C.y, w: C.w, h: 4 });
    let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < sd.id.data.length; i += 16) { r += sd.id.data[i]; gg += sd.id.data[i + 1]; b += sd.id.data[i + 2]; n++; }
    r /= n; gg /= n; b /= n;
    const grad = g.createLinearGradient(0, 0, 0, top + 6);
    grad.addColorStop(0, `rgb(${Math.round(r * 0.30)},${Math.round(gg * 0.30)},${Math.round(b * 0.34)})`);
    grad.addColorStop(1, `rgb(${Math.round(r)},${Math.round(gg)},${Math.round(b)})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, top + 6);
    let seed = 20260704;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 48; i++) {
      g.fillStyle = rnd() < 0.3 ? 'rgba(216,182,166,0.8)' : 'rgba(150,110,100,0.7)';
      g.fillRect(Math.round(rnd() * 1024), Math.round(rnd() * top * 0.82), 2, 2);
    }
    g.drawImage(img, C.x, C.y, C.w, C.h, 0, top, Math.round(C.w * s), Math.round(C.h * s));
    return { cv, w: 1024, h: 576 };
  },

  // 9-slice with tiled edges/center: corners keep aspect at borderScale
  nine(ctx, A, x, y, w, h, bs = 0.16, inset = 56) {
    const iw = inset * bs;
    const tile = (sx, sy, sw, sh, dx, dy, dw, dh) => {
      if (dw <= 0 || dh <= 0 || sw <= 0 || sh <= 0) return;
      const tw = sw * bs, th = sh * bs;
      for (let ty = dy; ty < dy + dh - 0.01; ty += th) {
        for (let tx = dx; tx < dx + dw - 0.01; tx += tw) {
          const cw = Math.min(tw, dx + dw - tx), ch = Math.min(th, dy + dh - ty);
          ctx.drawImage(A.cv, sx, sy, cw / bs, ch / bs, tx, ty, cw, ch);
        }
      }
    };
    const sw = A.w, sh = A.h, mI = inset + 12; // center patch margin
    // corners
    ctx.drawImage(A.cv, 0, 0, inset, inset, x, y, iw, iw);
    ctx.drawImage(A.cv, sw - inset, 0, inset, inset, x + w - iw, y, iw, iw);
    ctx.drawImage(A.cv, 0, sh - inset, inset, inset, x, y + h - iw, iw, iw);
    ctx.drawImage(A.cv, sw - inset, sh - inset, inset, inset, x + w - iw, y + h - iw, iw, iw);
    // edges
    tile(inset, 0, sw - 2 * inset, inset, x + iw, y, w - 2 * iw, iw);
    tile(inset, sh - inset, sw - 2 * inset, inset, x + iw, y + h - iw, w - 2 * iw, iw);
    tile(0, inset, inset, sh - 2 * inset, x, y + iw, iw, h - 2 * iw);
    tile(sw - inset, inset, inset, sh - 2 * inset, x + w - iw, y + iw, iw, h - 2 * iw);
    // center
    tile(mI, mI, sw - 2 * mI, sh - 2 * mI, x + iw, y + iw, w - 2 * iw, h - 2 * iw);
  },
};
