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

    // --- combo follow-up: cancel on contact -----------------------------
    if (f.state === 'attack' && f.move && f.move.contact && !this.chainFired) {
      if (Math.random() < d.comboFollow) {
        this.chainFired = true;
        const cur = f.move.def.kind;
        if (f.superReady() && Math.random() < d.superUse) p.super = true;
        else if (cur === 'light') { if (Math.random() < 0.5) p.light = true; else p.heavy = true; }
        else if (cur === 'heavy' && f.c.id === 'mack' && f.specialReady()) p.special = true;
      }
      return p;
    }
    if (f.state !== 'attack') this.chainFired = false;

    // busy states: nothing to decide
    if (f.busy() && f.state !== 'walk') return p;

    // --- threat reactions (checked every tick, gated by chance) ----------
    const cornered = toward > 0 ? f.x <= STAGE.left + 14 : f.x >= STAGE.right - 14;
    if (!cornered) this.cornerDefends = 0;

    // enemy attack winding up close by -> block or dodge — but a pinned AI
    // must not turtle forever: after two defensive plans in the corner it
    // forces an escape (leap over the attacker or swing back)
    if (o.state === 'attack' && o.move && o.move.t < o.move.def.startup + 2 && dist < 300 && f.grounded) {
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
    // opponent jumping in -> crouching rising slash (anti-air)
    if (!o.grounded && o.y < STAGE.ground - 40 && dist < 230 && f.grounded &&
        Math.random() < d.aggression * 0.04) {
      this.setPlan('antiair', 12);
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
      else if (r < d.aggression) this.setPlan(Math.random() < 0.4 ? 'dashIn' : 'approach', react() + 8);
      // pure standing around reads as a freeze — pace forward half the time
      else this.setPlan(Math.random() < 0.5 ? 'approach' : 'idle', react());
      return;
    }

    // far range
    if (f.c.id === 'kenji' && f.specialReady() && r < 0.45) this.setPlan('special', 6);
    else if (r < 0.25) this.setPlan('dashIn', 10);
    else this.setPlan('approach', react() + 14);
  }
}
