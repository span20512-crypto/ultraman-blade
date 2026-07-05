/* WebAudio synth: all SFX + chiptune BGM are generated, no audio assets. */
'use strict';

const AudioSys = (() => {
  let ctx = null, master = null, sfxBus = null, bgmBus = null, noiseBuf = null;
  let muted = false;
  const bgm = { playing: false, track: null, step: 0, nextTime: 0, timer: null };

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
      bgmBus = ctx.createGain(); bgmBus.gain.value = 0.16; bgmBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { ctx = null; return false; }
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.6;
    return muted;
  }

  // --- primitive voices -------------------------------------------------
  function tone(freq, dur, { type = 'square', vol = 0.3, slide = 0, delay = 0, curve = 2.5 } = {}) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur * curve / 2.5);
    o.connect(g); g.connect(sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, { freq = 1200, q = 1, vol = 0.3, type = 'bandpass', delay = 0, slide = 0 } = {}) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  // --- named SFX ---------------------------------------------------------
  const SFX = {
    menuMove:  () => tone(620, 0.06, { vol: 0.18 }),
    menuSel:   () => { tone(700, 0.07, { vol: 0.2 }); tone(1180, 0.1, { vol: 0.18, delay: 0.06 }); },
    menuBack:  () => tone(420, 0.08, { vol: 0.16, slide: -180 }),
    jump:      () => tone(280, 0.14, { type: 'sine', vol: 0.22, slide: 320 }),
    land:      () => noise(0.09, { freq: 500, type: 'lowpass', vol: 0.22 }),
    dash:      () => noise(0.13, { freq: 1600, vol: 0.2, slide: -900 }),
    whooshL:   () => noise(0.09, { freq: 2200, vol: 0.22, slide: -800 }),
    whooshH:   () => noise(0.16, { freq: 1100, vol: 0.3, slide: -600 }),
    hitL:      () => { tone(170, 0.09, { vol: 0.34 }); noise(0.07, { freq: 2600, vol: 0.26 }); },
    hitH:      () => { tone(100, 0.17, { vol: 0.42, slide: -45 }); noise(0.12, { freq: 1700, vol: 0.34 }); },
    block:     () => { tone(740, 0.06, { type: 'triangle', vol: 0.26 }); noise(0.05, { freq: 3400, type: 'highpass', vol: 0.14 }); },
    special:   () => { tone(210, 0.2, { type: 'sawtooth', vol: 0.26, slide: 700 }); noise(0.18, { freq: 900, vol: 0.16, slide: 1400 }); },
    projectile:() => tone(320, 0.14, { vol: 0.22, slide: -160 }),
    tele:      () => tone(1250, 0.18, { type: 'sine', vol: 0.24, slide: -1050 }),
    superFlash:() => { tone(75, 0.5, { type: 'sawtooth', vol: 0.3, slide: 560 }); noise(0.5, { freq: 400, vol: 0.2, slide: 2400 }); },
    dodge:     () => noise(0.12, { freq: 2600, vol: 0.2, slide: -1800 }),
    slam:      () => { tone(72, 0.26, { type: 'sine', vol: 0.5, slide: -32 }); noise(0.22, { freq: 520, type: 'lowpass', vol: 0.4 }); },
    crush:     () => { noise(0.3, { freq: 3200, vol: 0.34, slide: -2400 }); tone(880, 0.26, { vol: 0.2, slide: -620 }); tone(1320, 0.18, { vol: 0.14, delay: 0.04, slide: -800 }); },
    ko:        () => { tone(150, 0.7, { type: 'sine', vol: 0.5, slide: -110 }); noise(0.55, { freq: 700, type: 'lowpass', vol: 0.4 }); },
    round:     () => { tone(392, 0.12, { vol: 0.2 }); tone(523, 0.12, { vol: 0.2, delay: 0.1 }); tone(659, 0.2, { vol: 0.22, delay: 0.2 }); },
    fight:     () => { tone(523, 0.1, { vol: 0.24 }); tone(784, 0.24, { vol: 0.26, delay: 0.08 }); },
    beep:      () => tone(1050, 0.07, { vol: 0.18 }),
    getup:     () => noise(0.08, { freq: 800, type: 'lowpass', vol: 0.16 }),
    win:       () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { vol: 0.2, delay: i * 0.12 })); },
    lose:      () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.2, { type: 'triangle', vol: 0.2, delay: i * 0.14 })); },
  };

  function sfx(name) { if (ctx && !muted && SFX[name]) SFX[name](); }

  // --- chiptune BGM -------------------------------------------------------
  // step sequencer: 16 steps per bar, patterns alternate over 2 bars.
  // notes are semitone offsets from the track root; null = rest.
  const TRACKS = {
    battle: {
      bpm: 150, root: 110, // A2
      bass: [
        [0, null, 0, null, 3, null, 3, null, 5, null, 5, null, 3, null, 2, null],
        [0, null, 0, null, 3, null, 3, null, 7, null, 5, null, 3, null, 2, null],
      ],
      lead: [
        [12, null, null, 15, null, 12, null, null, 17, null, 15, null, 12, null, 10, null],
        [12, null, null, 15, null, 19, null, null, 17, null, 15, null, 17, null, 12, null],
      ],
      kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14],
    },
    menu: {
      bpm: 96, root: 110,
      bass: [
        [0, null, null, null, 5, null, null, null, 3, null, null, null, 7, null, null, null],
        [0, null, null, null, 5, null, null, null, 8, null, null, null, 7, null, null, null],
      ],
      lead: [
        [null, null, 12, null, null, null, 15, null, null, null, 12, null, null, null, null, null],
        [null, null, 17, null, null, null, 15, null, null, null, 12, null, null, null, 10, null],
      ],
      kick: [0, 8], snare: [], hat: [4, 12],
    },
  };

  function noteFreq(root, semi) { return root * Math.pow(2, semi / 12); }

  function scheduleStep(tr, step, when) {
    const bar = Math.floor(step / 16) % 2, s = step % 16;
    const stepDur = 60 / tr.bpm / 4;
    const b = tr.bass[bar][s];
    if (b !== null && b !== undefined) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = noteFreq(tr.root, b);
      g.gain.setValueAtTime(0.5, when); g.gain.exponentialRampToValueAtTime(0.01, when + stepDur * 1.7);
      o.connect(g); g.connect(bgmBus); o.start(when); o.stop(when + stepDur * 1.8);
    }
    const l = tr.lead[bar][s];
    if (l !== null && l !== undefined) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = noteFreq(tr.root * 2, l);
      g.gain.setValueAtTime(0.34, when); g.gain.exponentialRampToValueAtTime(0.01, when + stepDur * 2.6);
      o.connect(g); g.connect(bgmBus); o.start(when); o.stop(when + stepDur * 2.7);
    }
    if (tr.kick.includes(s)) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(130, when); o.frequency.exponentialRampToValueAtTime(42, when + 0.1);
      g.gain.setValueAtTime(0.9, when); g.gain.exponentialRampToValueAtTime(0.01, when + 0.12);
      o.connect(g); g.connect(bgmBus); o.start(when); o.stop(when + 0.14);
    }
    if (tr.snare.includes(s)) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.5, when); g.gain.exponentialRampToValueAtTime(0.01, when + 0.09);
      src.connect(f); f.connect(g); g.connect(bgmBus); src.start(when); src.stop(when + 0.1);
    }
    if (tr.hat.includes(s)) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.16, when); g.gain.exponentialRampToValueAtTime(0.01, when + 0.04);
      src.connect(f); f.connect(g); g.connect(bgmBus); src.start(when); src.stop(when + 0.05);
    }
  }

  function playBgm(name) {
    if (!ctx) { bgm.track = name; return; } // will start on ensure+playBgm again
    if (bgm.playing && bgm.track === name) return;
    stopBgm();
    bgm.track = name; bgm.playing = true; bgm.step = 0;
    bgm.nextTime = ctx.currentTime + 0.06;
    const tr = TRACKS[name];
    bgm.timer = setInterval(() => {
      if (!ctx || !bgm.playing) return;
      const stepDur = 60 / tr.bpm / 4;
      while (bgm.nextTime < ctx.currentTime + 0.14) {
        scheduleStep(tr, bgm.step, bgm.nextTime);
        bgm.nextTime += stepDur;
        bgm.step = (bgm.step + 1) % 32;
      }
    }, 30);
  }

  function stopBgm() {
    bgm.playing = false;
    if (bgm.timer) { clearInterval(bgm.timer); bgm.timer = null; }
  }

  return { ensure, sfx, playBgm, stopBgm, toggleMute, get muted() { return muted; }, get ready() { return !!ctx; } };
})();
