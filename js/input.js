/* Keyboard state + buffered edge presses + double-tap dash detection.
   Presses live in a 180ms buffer instead of being wiped every render frame —
   on 120Hz+ displays render frames outnumber logic ticks, and the old
   clear-per-frame approach ate ~half of all key presses. The buffer also
   gives natural fighting-game input buffering. */
'use strict';

const Input = (() => {
  const down = {};        // held keys
  const pressed = {};     // code -> press timestamp (ms)
  const tapTimes = { KeyA: 0, KeyD: 0 };
  const dashFlag = { left: 0, right: 0 };   // timestamp of detected double-tap
  const DTAP_MS = 240;
  const BUFFER_MS = 180;

  const GAME_KEYS = new Set([
    'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyJ', 'KeyK', 'KeyU', 'KeyI',
    'KeyM', 'KeyH', 'KeyP', 'KeyR', 'KeyT', 'Escape', 'Enter', 'Space',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  ]);

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    const now = performance.now();
    down[e.code] = true;
    pressed[e.code] = now;
    if (e.code === 'KeyA' || e.code === 'KeyD') {
      if (now - tapTimes[e.code] < DTAP_MS) {
        dashFlag[e.code === 'KeyA' ? 'left' : 'right'] = now;
      }
      tapTimes[e.code] = now;
    }
  });

  window.addEventListener('keyup', (e) => { down[e.code] = false; });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(down)) down[k] = false;
  });

  function isDown(code) { return !!down[code]; }

  function consume(code) {
    const t = pressed[code];
    if (t === undefined) return false;
    delete pressed[code];
    return performance.now() - t <= BUFFER_MS;
  }

  function consumeDash(dir) {
    const t = dashFlag[dir];
    if (!t) return false;
    dashFlag[dir] = 0;
    return performance.now() - t <= BUFFER_MS;
  }

  /* expire stale entries; called once per render frame */
  function expire() {
    const now = performance.now();
    for (const k of Object.keys(pressed)) {
      if (now - pressed[k] > BUFFER_MS) delete pressed[k];
    }
    if (dashFlag.left && now - dashFlag.left > BUFFER_MS) dashFlag.left = 0;
    if (dashFlag.right && now - dashFlag.right > BUFFER_MS) dashFlag.right = 0;
  }

  // clearFrame kept as an alias so any stale-cached caller still works
  return { isDown, consume, consumeDash, expire, clearFrame: expire };
})();

function emptyPad() {
  return {
    left: false, right: false, jump: false, crouch: false,
    light: false, heavy: false, special: false, super: false,
    dashL: false, dashR: false,
  };
}

/* Build the human pad for this tick from raw keyboard state.
   Blocking is directional (hold away from the opponent) — no block button. */
function humanPad() {
  const p = emptyPad();
  p.left = Input.isDown('KeyA');
  p.right = Input.isDown('KeyD');
  p.crouch = Input.isDown('KeyS');
  p.jump = Input.consume('KeyW');
  p.light = Input.consume('KeyJ');
  p.heavy = Input.consume('KeyK');
  p.special = Input.consume('KeyU');
  p.super = Input.consume('KeyI');
  p.dashL = Input.consumeDash('left');
  p.dashR = Input.consumeDash('right');
  return p;
}
