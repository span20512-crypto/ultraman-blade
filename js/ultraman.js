/* Local two-player Ultraman arena. Two physical keyboards are supported by
   using independent key zones (browsers intentionally merge keyboard devices). */
'use strict';

const UltramanMode = (() => {
  const HEROES = [
    ['ultraman', '初代奥特曼', '#e53935'], ['seven', '赛文奥特曼', '#ff5a36'],
    ['zero', '赛罗奥特曼', '#4aa3ff'], ['taro', '泰罗奥特曼', '#ffca38'],
    ['tiga', '迪迦奥特曼', '#9b6cff'], ['dyna', '戴拿奥特曼', '#4c8dff'],
    ['gaia', '盖亚奥特曼', '#ff7043'], ['z', '泽塔奥特曼', '#43d7e8'],
  ].map(([id, name, color]) => ({ id, name, color, img: new Image() }));
  HEROES.forEach(h => { h.img.src = `assets/img/ultraman/${h.id}.png`; });

  let phase = 'select1', cursor = [0, 1], chosen = [null, null], players = [], shots = [];
  let timer = 60, winner = '', flash = 0;
  const ground = 486;

  function enter() {
    phase = 'select1'; cursor = [0, 1]; chosen = [null, null]; players = []; shots = [];
    timer = 60; winner = ''; flash = 0;
  }

  function makePlayer(heroIndex, x, face, side) {
    return { heroIndex, x, y: ground, vx: 0, vy: 0, face, side, hp: 100, energy: 100,
      attack: 0, hurt: 0, cooldown: 0, onGround: true };
  }

  function startFight() {
    players = [makePlayer(chosen[0], 260, 1, 0), makePlayer(chosen[1], 764, -1, 1)];
    shots = []; timer = 60; winner = ''; phase = 'fight'; AudioSys.sfx('fight');
  }

  function selectUpdate() {
    const p = phase === 'select1' ? 0 : 1;
    const left = p === 0 ? 'KeyA' : 'ArrowLeft', right = p === 0 ? 'KeyD' : 'ArrowRight';
    const ok = p === 0 ? 'KeyJ' : 'Numpad1';
    if (Input.consume(left)) { cursor[p] = (cursor[p] + 7) % 8; AudioSys.sfx('menuMove'); }
    if (Input.consume(right)) { cursor[p] = (cursor[p] + 1) % 8; AudioSys.sfx('menuMove'); }
    if (Input.consume(ok) || (p === 1 && Input.consume('Enter'))) {
      chosen[p] = cursor[p]; AudioSys.sfx('menuSel');
      if (p === 0) phase = 'select2'; else startFight();
    }
    if (Input.consume('Escape')) { G.screen = 'title'; AudioSys.sfx('menuBack'); }
  }

  function controls(side) {
    if (side === 0) return { left: Input.isDown('KeyA'), right: Input.isDown('KeyD'),
      jump: Input.consume('KeyW'), hit: Input.consume('KeyJ'), beam: Input.consume('KeyU') };
    return { left: Input.isDown('ArrowLeft'), right: Input.isDown('ArrowRight'),
      jump: Input.consume('ArrowUp'), hit: Input.consume('Numpad1'), beam: Input.consume('Numpad4') };
  }

  function hit(target, damage, push) {
    if (target.hurt > 0) return;
    target.hp = Math.max(0, target.hp - damage); target.hurt = 16; target.vx += push;
    flash = 5; AudioSys.sfx(damage > 12 ? 'hitH' : 'hitL');
  }

  function fightUpdate() {
    if (Input.consume('Escape')) { enter(); G.screen = 'title'; return; }
    if (winner) {
      if (Input.consume('KeyJ') || Input.consume('Numpad1') || Input.consume('Enter')) startFight();
      if (Input.consume('KeyK') || Input.consume('Numpad2')) enter();
      return;
    }
    timer = Math.max(0, timer - 1 / 60);
    players.forEach((p, i) => {
      const c = controls(i), foe = players[1 - i];
      if (p.cooldown > 0) p.cooldown--; if (p.attack > 0) p.attack--; if (p.hurt > 0) p.hurt--;
      p.energy = Math.min(100, p.energy + 0.12);
      if (!p.hurt) {
        if (c.left) { p.vx -= 0.75; p.face = -1; }
        if (c.right) { p.vx += 0.75; p.face = 1; }
        if (c.jump && p.onGround) { p.vy = -13; p.onGround = false; AudioSys.sfx('whooshL'); }
        if (c.hit && !p.attack) {
          p.attack = 14;
          if (Math.abs(foe.x - p.x) < 142 && Math.abs(foe.y - p.y) < 95) hit(foe, 9, p.face * 7);
        }
        if (c.beam && p.energy >= 30 && !p.cooldown) {
          p.energy -= 30; p.cooldown = 34;
          shots.push({ owner: i, x: p.x + p.face * 72, y: p.y - 105, vx: p.face * 11, life: 85 });
          AudioSys.sfx('special');
        }
      }
      p.vy += 0.72; p.x += p.vx; p.y += p.vy; p.vx *= p.onGround ? 0.72 : 0.94;
      p.x = Math.max(65, Math.min(959, p.x));
      if (p.y >= ground) { p.y = ground; p.vy = 0; p.onGround = true; }
    });
    shots.forEach(s => {
      s.x += s.vx; s.life--;
      const t = players[1 - s.owner];
      if (s.life > 0 && Math.abs(s.x - t.x) < 62 && Math.abs(s.y - (t.y - 100)) < 82) {
        hit(t, 14, Math.sign(s.vx) * 11); s.life = 0;
      }
    });
    shots = shots.filter(s => s.life > 0 && s.x > -40 && s.x < 1064);
    const [a, b] = players;
    if (a.hp <= 0 || b.hp <= 0 || timer <= 0) {
      winner = a.hp === b.hp ? 'DRAW' : (a.hp > b.hp ? '1P WINS' : '2P WINS'); AudioSys.sfx('ko');
    }
    if (flash > 0) flash--;
  }

  function update() { if (phase.startsWith('select')) selectUpdate(); else fightUpdate(); }

  function panel(ctx, x, y, w, h, color, selected) {
    ctx.fillStyle = selected ? color : '#33282b'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = 'rgba(12,10,16,.92)'; ctx.fillRect(x, y, w, h);
  }

  function drawSelect(ctx) {
    ctx.drawImage(UI.bgCanvas(G), 0, 0); ctx.fillStyle = 'rgba(7,8,12,.78)'; ctx.fillRect(0, 0, 1024, 576);
    UI.pixTextMixed(ctx, '光之对决 · ULTRA DUEL', 512, 55, { size: 25, align: 'center', color: '#ffe27a', outline: true });
    const p = phase === 'select1' ? 0 : 1;
    UI.pixText(ctx, `${p + 1}P CHOOSE YOUR HERO`, 512, 87, { size: 13, align: 'center', color: p ? '#58d8ff' : '#ff675c' });
    HEROES.forEach((h, i) => {
      const col = i % 4, row = Math.floor(i / 4), x = 82 + col * 220, y = 116 + row * 185;
      panel(ctx, x, y, 200, 160, h.color, cursor[p] === i);
      if (h.img.complete) ctx.drawImage(h.img, x + 35, y + 5, 130, 130);
      UI.pixText(ctx, h.name, x + 100, y + 148, { size: 12, align: 'center', color: cursor[p] === i ? '#fff3bd' : '#aaa0a0', maxW: 185 });
      if (chosen[0] === i) UI.pixText(ctx, '1P', x + 12, y + 25, { size: 11, color: '#ff675c', outline: true });
    });
    UI.pixText(ctx, p === 0 ? '1P  A/D SELECT · J CONFIRM' : '2P  ←/→ SELECT · NUM 1 CONFIRM',
      512, 517, { size: 12, align: 'center', color: '#d9a441' });
    UI.pixText(ctx, 'ESC BACK', 512, 546, { size: 10, align: 'center', color: '#66708a' });
  }

  function drawFighter(ctx, p) {
    const h = HEROES[p.heroIndex], bob = p.onGround ? Math.sin(G.tick * .09 + p.side) * 2 : 0;
    ctx.save(); ctx.translate(p.x, p.y + bob); ctx.scale(p.face, 1);
    if (p.hurt && p.hurt % 4 < 2) ctx.globalAlpha = .45;
    if (p.attack > 7) { ctx.strokeStyle = h.color; ctx.lineWidth = 12; ctx.globalAlpha = .75; ctx.beginPath(); ctx.arc(45, -105, 75, -1, 1); ctx.stroke(); ctx.globalAlpha = 1; }
    if (h.img.complete) ctx.drawImage(h.img, -82, -190, 164, 164);
    ctx.restore();
  }

  function bar(ctx, x, y, w, value, color, flip) {
    ctx.fillStyle = '#17151c'; ctx.fillRect(x, y, w, 18); ctx.fillStyle = '#594b4d'; ctx.fillRect(x + 3, y + 3, w - 6, 12);
    ctx.fillStyle = color; const fw = (w - 6) * value / 100; ctx.fillRect(flip ? x + w - 3 - fw : x + 3, y + 3, fw, 12);
  }

  function drawFight(ctx) {
    ctx.drawImage(UI.bgCanvas(G), 0, 0); ctx.fillStyle = 'rgba(5,8,18,.25)'; ctx.fillRect(0, 0, 1024, 576);
    const [a, b] = players; bar(ctx, 48, 42, 390, a.hp, '#ff4c42', false); bar(ctx, 586, 42, 390, b.hp, '#4bc6ff', true);
    bar(ctx, 48, 68, 250, a.energy, '#ffd43b', false); bar(ctx, 726, 68, 250, b.energy, '#ffd43b', true);
    UI.pixText(ctx, HEROES[a.heroIndex].name, 48, 32, { size: 13, color: '#fff0d0' });
    UI.pixText(ctx, HEROES[b.heroIndex].name, 976, 32, { size: 13, align: 'right', color: '#fff0d0' });
    UI.pixText(ctx, String(Math.ceil(timer)).padStart(2, '0'), 512, 65, { size: 28, align: 'center', color: '#ffe27a', outline: true });
    ctx.fillStyle = 'rgba(10,8,15,.55)'; ctx.fillRect(0, ground + 2, 1024, 90); ctx.fillStyle = '#8a6a2f'; ctx.fillRect(0, ground, 1024, 3);
    players.forEach(p => drawFighter(ctx, p));
    shots.forEach(s => { const c = HEROES[players[s.owner].heroIndex].color; ctx.fillStyle = '#fff'; ctx.fillRect(s.x - 25, s.y - 5, 50, 10); ctx.fillStyle = c; ctx.fillRect(s.x - 34, s.y - 2, 68, 4); });
    UI.pixText(ctx, '1P A/D MOVE · W JUMP · J HIT · U BEAM', 20, 553, { size: 9, color: '#c5b8a0' });
    UI.pixText(ctx, '2P ←/→ MOVE · ↑ JUMP · NUM1 HIT · NUM4 BEAM', 1004, 553, { size: 9, align: 'right', color: '#c5b8a0' });
    if (winner) {
      ctx.fillStyle = 'rgba(4,5,10,.78)'; ctx.fillRect(0, 190, 1024, 190);
      UI.pixText(ctx, winner, 512, 275, { size: 38, align: 'center', color: '#ffe27a', outline: true, shadow: 5 });
      UI.pixText(ctx, 'J / NUM1 REMATCH · K / NUM2 HERO SELECT', 512, 330, { size: 12, align: 'center', color: '#c5b8a0' });
    }
    if (flash) { ctx.fillStyle = `rgba(255,255,255,${flash * .06})`; ctx.fillRect(0, 0, 1024, 576); }
  }

  function draw(ctx) { if (phase.startsWith('select')) drawSelect(ctx); else drawFight(ctx); }
  return { enter, update, draw };
})();
