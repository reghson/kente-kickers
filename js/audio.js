/* WebAudio-generated sounds: no recorded or licensed audio. */
'use strict';
(function () {
  const KK = window.KK;
  let ctx = null, master = null, crowd = null, crowdGain = null, noiseBuf = null;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = muted() ? 0 : 0.8; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  const muted = () => !!(KK.settings && KK.settings.mute);
  function noise(dur, freq, q, vol, attack = 0.01, type = 'bandpass', when = 0) {
    const c = ensure(); if (!c || muted()) return;
    const t = c.currentTime + when, s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
    return f;
  }
  function tone(freq, dur, vol, type = 'sine', when = 0, slideTo) {
    const c = ensure(); if (!c || muted()) return;
    const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function whistleOne(when, dur) {
    const c = ensure(); if (!c || muted()) return;
    const t = c.currentTime + when, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
    o.type = 'square'; o.frequency.value = 2900; lfo.frequency.value = 38; lg.gain.value = 140;
    lfo.connect(lg); lg.connect(o.frequency);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2900; f.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.setValueAtTime(0.25, t + dur - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }
  KK.sfx = {
    unlock() { ensure(); },
    setMute(m) { KK.settings.mute = m; if (master) master.gain.value = m ? 0 : 0.8; if (m) this.crowdStop(); },
    whistle(n = 1) { for (let i = 0; i < n; i++) whistleOne(i * 0.42, n === 3 && i === 2 ? 0.75 : 0.3); },
    kick(power = 1) { tone(150, 0.12, 0.5 * power, 'sine', 0, 55); noise(0.06, 1800, 1, 0.25 * power, 0.003); },
    pass() { tone(220, 0.08, 0.25, 'sine', 0, 90); noise(0.04, 2200, 1, 0.12, 0.003); },
    tackle() { noise(0.15, 500, 0.8, 0.35, 0.005, 'lowpass'); },
    post() { tone(880, 0.25, 0.2, 'triangle'); tone(1320, 0.2, 0.1, 'triangle'); },
    click() { tone(660, 0.05, 0.12, 'triangle'); },
    coin() { tone(988, 0.08, 0.15, 'square'); tone(1319, 0.2, 0.12, 'square', 0.08); },
    cheer() {
      noise(2.8, 900, 0.4, 0.5, 0.25); noise(2.4, 1700, 0.6, 0.25, 0.35); noise(2.0, 400, 0.5, 0.3, 0.2, 'lowpass');
      for (let i = 0; i < 6; i++) tone(500 + Math.random() * 500, 0.3, 0.03, 'sawtooth', 0.2 + i * 0.25, 400 + Math.random() * 300);
    },
    groan() { const c = ensure(); if (!c || muted()) return; noise(1.4, 300, 0.7, 0.35, 0.15, 'lowpass'); },
    crowdStart() {
      const c = ensure(); if (!c || muted() || crowd) return;
      crowd = c.createBufferSource(); crowd.buffer = noiseBuf; crowd.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.5;
      crowdGain = c.createGain(); crowdGain.gain.value = 0.05;
      crowd.connect(f); f.connect(crowdGain); crowdGain.connect(master); crowd.start();
    },
    crowdLevel(v) { if (crowdGain && ctx) crowdGain.gain.setTargetAtTime(0.03 + v * 0.1, ctx.currentTime, 0.3); },
    crowdStop() { if (crowd) { try { crowd.stop(); } catch (e) {} crowd = null; } },
  };
})();
