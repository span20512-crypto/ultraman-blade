/* AI opponent: plans an action every few ticks (reaction time scales with
   difficulty), reacts to threats, follows up combos, spends meter. */
'use strict';

class AIController {
  constructor(fighter, opp, diffKey, world) {
    this.f = fighter;
    this.opp = opp;
    this.d = AI_DIFFS[diffKey];
    this.world = world;
    this.plan = 'idle';
    this.planT = 10;
    this.fired = false;       // one-shot button already pressed this plan
    this.chainFired = false;
    this.cornerDefends = 0;   // consecutive defensive plans while pinned
  }

  update() {
    const p = emptyPad();
    const f = this.f, o = this.opp, d = this.d;
    if (f.dead || o.dead) return p;

    const dist = Math.abs(o.x - f.x);
    const toward = o.x >= f.x ? 1 : -1;

    // --- combo follow-up: ride the FULL chain, one press per NEW hit -----
    // 旧逻辑每套只追 1 下(chainFired 布尔) -> AI 只打 2hit、伤害低、被格挡后随手反打就赢。
    // 现在每次"新命中"(move 对象变了)都续下一段, 打满 J-J-K-K 击倒 / 接必杀(Eric: 更善进攻)。
    if (f.state === 'attack' && f.move && f.move.contact) {
      const step = this.chainStep || 0;
      if (this.chainMove !== f.move && step < 3 && Math.random() < d.comboFollow) {
        this.chainMove = f.move;             // 本次命中的续招已排, 不重复按
        this.chainStep = step + 1;
        const cur = f.move.def.kind;
        if (f.superReady() && step >= 1 && Math.random() < d.superUse) p.super = true;
        else if (cur === 'light') { if (Math.random() < 0.4) p.light = true; else p.heavy = true; } // J→J→K
        else if (cur === 'heavy') {                        // K→K 回升斩(击倒), 或 mack 接必杀
          if (Math.random() < 0.7) p.heavy = true;
          else if (f.c.id === 'mack' && f.specialReady()) p.special = true;
        }
      }
      return p;
    }
    if (f.state !== 'attack') { this.chainStep = 0; this.chainMove = null; }

    // busy states: nothing to decide
    if (f.busy() && f.state !== 'walk') return p;

    // --- threat reactions (checked every tick, gated by chance) ----------
    const cornered = toward > 0 ? f.x <= STAGE.left + 14 : f.x >= STAGE.right - 14;
    if (!cornered) this.cornerDefends = 0;

    // enemy attack winding up close by -> block or dodge — but a pinned AI
    // must not turtle forever: after two defensive plans in the corner it
    // forces an escape (leap over the attacker or swing back)
    if (o.state === 'attack' && o.move && o.move.t <= o.move.def.startup + 3 && dist < 300 && f.grounded) {
      const r = Math.random();
      const guardHigh = f.guard >= 65; // near crush: stop turtling, get out instead
      if (cornered && this.cornerDefends >= 2) {
        this.cornerDefends = 0;
        if (Math.random() < 0.55) this.setPlan('jumpIn', 40);
        else this.setPlan(Math.random() < 0.5 ? 'attackL' : 'attackH', 12);
      } else if ((r < d.dodgeChance || (guardHigh && r < d.dodgeChance + d.blockChance)) &&
                 f.backdashCd <= 0 && !cornered) {
        this.setPlan('backdash', 6);
      } else if (r < d.dodgeChance + d.blockChance && !guardHigh && this.plan !== 'block') {
        // don't re-arm an existing block plan every tick — planT must run
        // down so think() (and its corner-escape branch) gets a turn
        this.setPlan('block', (o.move.def.total || 40) - o.move.t + 6);
        if (cornered) this.cornerDefends++;
      }
    }
    // 对手放大招 -> 高概率架起来(Eric: 我放必杀它也有概率防掉); block 执行会随传送翻转朝向
    if (o.state === 'attack' && o.move && o.move.def.kind === 'super' &&
        dist < 340 && f.grounded && !f.busy() && Math.random() < d.blockChance) {
      this.setPlan('block', 48);
    }
    // opponent jumping in -> crouching rising slash (anti-air)
    if (!o.grounded && o.y < STAGE.ground - 40 && dist < 230 && f.grounded &&
        Math.random() < d.aggression * 0.2) { // 反空近乎必中(Eric: 最高难度)
      this.setPlan('antiair', 12);
    }
    // 惩罚落空: 对手攻击已过判定且没打中(你 whiff 了)、就在近处 -> 瞬移冲进反打(Eric: 更善进攻)
    if (o.state === 'attack' && o.move && !o.move.contact &&
        o.move.t > o.move.def.startup + (o.move.def.active || 3) &&
        dist < 300 && f.grounded && !f.busy() && f.backdashCd >= 0 &&
        Math.random() < d.aggression * 0.7) {
      this.setPlan('dashIn', 12);
    }
    // 读冲刺: 对手正朝我冲进近距 -> 抢先迎击/格挡(专治玩家用前冲进场; 困难更常触发)
    if (o.state === 'dash' && o.vx !== 0 && Math.sign(o.vx) === Math.sign(f.x - o.x) &&
        dist < 215 && f.grounded && !f.busy() && Math.random() < d.aggression * 0.7) {
      this.setPlan(Math.random() < 0.45 ? 'attackL' : 'block', 10);
    }
    // incoming projectile -> jump or block
    for (const pr of this.world.projectiles) {
      if (pr.owner !== f && Math.abs(pr.x - f.x) < 250 && Math.sign(pr.vx) === Math.sign(f.x - pr.x)) {
        const r = Math.random();
        if (r < 0.5) this.setPlan('jump', 8);
        else if (r < 0.5 + d.blockChance) this.setPlan('block', 30);
        break;
      }
    }

    // self-healing guardrail: no plan may persist beyond 90 ticks, no matter
    // what keeps re-arming it — guarantees the AI can never truly stall
    this.planAge = (this.planAge || 0) + 1;
    if (--this.planT <= 0 || this.planAge > 90) this.think(dist, toward);

    // --- execute current plan --------------------------------------------
    switch (this.plan) {
      case 'approach': if (toward > 0) p.right = true; else p.left = true; break;
      case 'retreat': if (toward > 0) p.left = true; else p.right = true; break;
      case 'dashIn':
        if (!this.fired) { this.fired = true; if (toward > 0) p.dashR = true; else p.dashL = true; }
        // 瞬移贴身即出招(dash-cancel): kenji 的 dash+J = dashslash 突进斩(Eric: 擅用 AA/DD)
        else if (f.state === 'dash' && f.dashT > 5 && dist < (f.c.id === 'mack' ? 180 : 165)) {
          if (Math.random() < 0.55) p.light = true; else p.heavy = true;
        }
        break;
      case 'backdash':
        if (!this.fired) { this.fired = true; if (toward > 0) p.dashL = true; else p.dashR = true; }
        break;
      case 'jump': if (!this.fired) { this.fired = true; p.jump = true; } break;
      case 'jumpIn':
        if (!this.fired) { this.fired = true; p.jump = true; }
        if (toward > 0) p.right = true; else p.left = true;
        if (!f.grounded && dist < 200 && Math.abs(o.y - f.y) < 200) {
          if (Math.random() < 0.35) p.heavy = true; // dive slam
          else p.light = true;
        }
        break;
      case 'attackL': if (!this.fired) { this.fired = true; p.light = true; } break;
      case 'attackH': if (!this.fired) { this.fired = true; p.heavy = true; } break;
      case 'special': if (!this.fired) { this.fired = true; p.special = true; } break;
      case 'super': if (!this.fired) { this.fired = true; p.super = true; } break;
      case 'block': if (toward > 0) p.left = true; else p.right = true; break; // hold away = directional guard
      case 'antiair':
        p.crouch = true;
        if (!this.fired) { this.fired = true; p.heavy = true; }
        break;
      case 'idle': default: break;
    }
    return p;
  }

  setPlan(plan, ticks) {
    this.plan = plan;
    // clamp: a NaN or huge duration would freeze the AI forever
    this.planT = Number.isFinite(ticks) ? Math.min(70, Math.max(2, ticks)) : 20;
    this.planAge = 0;
    this.fired = false;
  }

  think(dist, toward) {
    const f = this.f, o = this.opp, d = this.d;
    const react = () => d.reactMin + Math.random() * (d.reactMax - d.reactMin);
    const r = Math.random();

    // back to the wall: retreating/turtling just walks into the clamp and
    // looks frozen — fight or escape instead
    const cornered = toward > 0 ? f.x <= STAGE.left + 14 : f.x >= STAGE.right - 14;
    if (cornered && dist < 300 && !['down', 'getup'].includes(o.state)) {
      if (r < 0.4) this.setPlan(Math.random() < 0.6 ? 'attackL' : 'attackH', react());
      else if (r < 0.62) this.setPlan('jumpIn', 40);          // leap over to escape
      else if (r < 0.78) this.setPlan('dashIn', 10);
      else if (f.superReady() && r < 0.9) this.setPlan('super', 6);
      else this.setPlan(Math.random() < 0.5 ? 'attackL' : 'jumpIn', react());
      return;
    }

    // opponent knocked down: reposition, don't whiff on a body
    if (o.state === 'down' || o.state === 'getup') {
      if (dist < 170 && !cornered) this.setPlan('retreat', react() + 8);
      else this.setPlan('idle', react());
      return;
    }

    // super when it will connect
    if (f.superReady() && r < d.superUse && dist < 380 && o.state !== 'block') {
      this.setPlan('super', 6);
      return;
    }

    const inRange = dist < (f.c.id === 'mack' ? 175 : 150);

    if (inRange) {
      if (r < d.aggression) {
        this.setPlan(Math.random() < 0.62 ? 'attackL' : 'attackH', react());
      } else if (r < d.aggression + 0.15) {
        this.setPlan('backdash', 8);
      } else if (r < d.aggression + 0.15 + d.blockChance * 0.4 && f.guard < 65) {
        this.setPlan('block', 26);
      } else {
        this.setPlan('retreat', react());
      }
      return;
    }

    if (dist < 330) { // mid range
      if (f.c.id === 'mack' && f.specialReady() && r < 0.3) this.setPlan('special', 6);
      else if (r < d.jumpiness) this.setPlan('jumpIn', 40);
      else if (r < d.aggression) this.setPlan(Math.random() < 0.7 ? 'dashIn' : 'approach', react() + 8); // 多用冲刺瞬移(Eric)
      // 少原地站桩(Eric: 会移动) — 大多数时候仍向前压
      else this.setPlan(Math.random() < 0.82 ? 'approach' : 'idle', react());
      return;
    }

    // far range —— 多靠冲刺瞬移拉近(Eric: 擅用 AA/DD), 少走路
    if (f.c.id === 'kenji' && f.specialReady() && r < 0.4) this.setPlan('special', 6);
    else if (r < 0.6) this.setPlan('dashIn', 12);
    else this.setPlan('approach', react() + 10);
  }
}
