/* Kente Kickers — real-time top-down match engine (HTML5 canvas). */
'use strict';
(function () {
  const KK = window.KK;
  const L = 105, W = 68, GH = 3.66, CY = 34, BOX_D = 16.5, BOX_H = 20.16;
  const SPEED = 1.25, DT = 1 / 60;
  const clamp = KK.clamp, hyp = Math.hypot;
  const norm = (x, y) => { const d = hyp(x, y) || 1; return [x / d, y / d]; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function segDist(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
    const t = clamp(((px - ax) * vx + (py - ay) * vy) / l2, 0, 1);
    return hyp(px - ax - t * vx, py - ay - t * vy);
  }

  class Match {
    constructor(canvas, cfg) {
      this.cv = canvas; this.g = canvas.getContext('2d'); this.cfg = cfg; this.r3 = cfg.r3 || null; this.fps = 0; this.frameDt = 1 / 60;
      this.total = (cfg.lengthMin || 3) * 60; this.elapsed = 0; this.half = 1;
      this.score = [0, 0]; this.scorers = []; this.events = [];
      this.st = { poss: [0, 0], shots: [0, 0], sot: [0, 0], passes: [0, 0], tackles: [0, 0], saves: [0, 0], fouls: [0, 0] }; this.chain = 0; this.sayT = 0;
      const S = KK.settings || {};
      this.diff = clamp(cfg.diff != null ? cfg.diff : (S.diff != null ? +S.diff : 1), 0, 3);
      this.dq = [-0.22, 0, 0.15, 0.3][this.diff];
      this.offsideOn = cfg.offside != null ? !!cfg.offside : S.offside !== false;
      this.replaysOn = S.replays !== false;
      this.cards = []; this.knocks = []; this.rec = []; this.recN = 0; this.replayData = null; this.offEnts = []; this.offLine = [L, 0]; this.support = [null, null];
      this.teams = [cfg.my, cfg.opp].map((tm, t) => {
        const q = clamp((tm.rating - 40) / 50 + (t === 1 ? this.dq : 0), 0, 1.3);
        return { ...tm, t, q, dir: t === 0 ? 1 : -1, goalX: t === 0 ? 0 : L };
      });
      this.ents = [];
      this.teams.forEach((tm, t) => {
        const slots = KK.FORMATIONS[tm.formation] || KK.FORMATIONS['4-4-2'];
        tm.players.forEach((sp, i) => {
          const s = slots[i];
          this.ents.push({ t, i, slot: s, pos: s[0], sp, x: 0, y: 0, vx: 0, vy: 0, fx: t === 0 ? 1 : -1, fy: 0, tackleCd: 0, kickCd: 0, stun: 0, dec: Math.random() * 0.4, stam: Math.max(0.55, Math.min(1, (sp.fit == null ? 100 : sp.fit) / 100)), lunge: 0, yc: 0, runT: 0, runCd: 1 + Math.random() * 3, tgt: null, ps: { g: 0, as: 0, sh: 0, pa: 0, tk: 0, sv: 0 } });
        });
      });
      this.ball = { x: L / 2, y: CY, vx: 0, vy: 0, owner: null, last: 0, protect: 0, tried: new Set(), passTo: null, shot: false, z: 0, vz: 0, spin: 0 };
      this.input = { jx: 0, jy: 0, sprint: false, sprintBtn: false, edge: false, press: false, shootDown: false, shootT: 0, keys: new Set() };
      this.ment = [1, 1]; this.mentT = 0; this.btnMode = {};
      this.ctrl = null; this.switchCd = 0; this.cam = { x: L / 2, y: CY };
      this.allE = this.ents.slice();
      this.state = 'pre'; this.stateT = 0; this.paused = false; this.banner = '';
      this.kickoff(cfg.kickoffTeam || 0);
      if (this.r3) this.r3.begin(this);
      this.resize(); this._onResize = () => this.resize(); window.addEventListener('resize', this._onResize);
      this.last = performance.now(); this.acc = 0; this.running = true;
      this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
      KK.sfx.crowdStart();
    }
    destroy() { this.running = false; window.removeEventListener('resize', this._onResize); KK.sfx.crowdStop(); if (this.r3) this.r3.end(this); }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), r = this.cv.getBoundingClientRect();
      this.cv.width = Math.max(1, Math.round(r.width * dpr)); this.cv.height = Math.max(1, Math.round(r.height * dpr));
      this.dpr = dpr; this.vertical = r.height >= r.width;
      this.sc = Math.min(r.width, r.height) / 40 * dpr;
      if (this.r3) this.r3.resize();
    }
    team(t) { return this.teams[t]; }
    maxSpeed(p) { return (5 + p.sp.stats.pac * 0.045) * SPEED * (p.pos === 'GK' ? 0.85 : 1) * (p.t === 1 ? 1 + this.dq * 0.1 : 1); }
    homeSpot(p) {
      const tm = this.teams[p.t], b = this.ball, slot = p.slot;
      if (p.pos === 'GK') return null;
      const has = b.owner && b.owner.t === p.t, opp = b.owner && b.owner.t !== p.t;
      let depth = slot[1] + (has ? 0.1 : opp ? -0.04 : 0.03) + (this.ment[p.t] - 1) * (has ? 0.08 : 0.06);
      let x = tm.goalX + tm.dir * depth * L + (b.x - L / 2) * 0.45;
      const minX = tm.goalX + tm.dir * 4, maxX = tm.goalX + tm.dir * (L * 0.92);
      x = tm.dir > 0 ? clamp(x, minX, maxX) : clamp(x, maxX, minX);
      if (this.offsideOn && has) { const lx = this.offLine[p.t] - tm.dir * 0.6; if ((x - lx) * tm.dir > 0) x = lx; }
      let y = slot[2] * W * 0.86 + W * 0.07; y += (b.y - y) * 0.22;
      return [x, y];
    }
    kickoff(t) {
      this.ents.forEach(p => {
        const tm = this.teams[p.t], s = p.slot;
        const depth = p.pos === 'GK' ? 0.015 : s[1] / 0.68 * 0.44;
        p.x = tm.goalX + tm.dir * depth * L; p.y = s[2] * W * 0.86 + W * 0.07; p.vx = p.vy = 0; p.fx = tm.dir; p.fy = 0; p.stun = 0; p.kickCd = 0;
      });
      const kt = this.teams[t];
      const fw = this.ents.filter(p => p.t === t && p.pos !== 'GK').sort((a, b) => (b.x - a.x) * kt.dir)[0];
      fw.x = L / 2 - kt.dir * 0.8; fw.y = CY;
      const b = this.ball; Object.assign(b, { x: L / 2, y: CY, vx: 0, vy: 0, owner: fw, last: t, protect: 1.5, passTo: null, shot: false, z: 0, vz: 0 }); b.tried = new Set();
      if (t === 0) this.ctrl = fw; else this.ctrl = this.nearestTo(0, L / 2, CY, true);
      this.state = 'kickoff'; this.stateT = 1.3; this.banner = 'KICK OFF';
      this.cam.x = L / 2; this.cam.y = CY;
    }
    nearestTo(t, x, y, noGK, except) {
      let best = null, bd = 1e9;
      for (const p of this.ents) { if (p.t !== t || (noGK && p.pos === 'GK') || p === except) continue; const d = hyp(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
      return best;
    }
    // ---------- input ----------
    worldDir(sx, sy) { return this.vertical ? [-sy, sx] : [sx, sy]; }
    inputVec() {
      let { jx, jy } = this.input; const k = this.input.keys;
      let kx = (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0);
      let ky = (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0) - (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0);
      if (kx || ky) { const n = norm(kx, ky); jx = n[0]; jy = n[1]; }
      const [wx, wy] = this.worldDir(jx, jy); return [wx, wy, hyp(jx, jy)];
    }
    pressPass() {
      if (this.state !== 'play' && this.state !== 'kickoff') return;
      if (this.state === 'kickoff') { if (this.ball.owner && this.ball.owner.t === 0) this.startPlay(); else return; }
      const p = this.ctrl, b = this.ball;
      if (b.owner === p) {
        let [dx, dy, m] = this.inputVec(); if (m < 0.3) { dx = p.fx; dy = p.fy; }
        const r = this.pickReceiver(p, dx, dy);
        if (r) this.passTo(p, r); else this.kickTo(p, p.x + dx * 20, p.y + dy * 20, 20, this.passNoise(p), null);
      } else if (!b.owner || b.owner.t !== 0) {
        const n = this.nearestTo(0, b.x, b.y, true, p); if (n) { this.ctrl = n; this.switchCd = 0.6; }
      }
    }
    pressShoot(down) {
      const p = this.ctrl, b = this.ball;
      if (down) { this.input.shootDown = true; this.input.shootT = 0; return; }
      if (!this.input.shootDown) return; this.input.shootDown = false;
      if (this.state === 'kickoff' && b.owner === p) this.startPlay();
      if (this.state !== 'play' || b.owner !== p) return;
      const power = 0.72 + Math.min(this.input.shootT, 0.6) / 0.6 * 0.33;
      const [, wy, m] = this.inputVec();
      let ty = CY + (m > 0.25 ? clamp(wy * 4, -3.3, 3.3) : (Math.random() < 0.5 ? -2.6 : 2.6));
      this.shoot(p, ty, power);
    }
    pressTackle(down) { this.input.sprintBtn = down; if (down) this.slide(); } // legacy
    sprinting() { const i = this.input; return !!(i.sprint || i.sprintBtn || i.edge || i.keys.has('ShiftLeft') || i.keys.has('ShiftRight') || i.keys.has('KeyL')); }
    // contextual buttons: attack = user's team has (or is receiving) the ball
    mode() {
      const b = this.ball;
      if (b.owner) return b.owner.t === 0 ? 'att' : 'def';
      if (b.passTo) return b.passTo.t === 0 ? 'att' : 'def';
      return this.state === 'kickoff' ? 'def' : (b.last === 0 && hyp(b.x - this.ctrl.x, b.y - this.ctrl.y) < 4 ? 'att' : 'def');
    }
    labels() { return this.mode() === 'att' ? { A: 'HARD KICK', B: 'LOW KICK', C: 'LOFTED KICK' } : { A: 'SLIDE TACKLE', B: 'PRESSURE', C: 'SWITCH PLAYER' }; }
    btn(k, down) {
      if (this.state === 'replay') { if (down) this.skipReplay(); return; }
      if (this.pen && !this.pen.kicked) { if (down && this.pen.t === 0 && this.ball.owner === this.ctrl) this.penShot(k === 'A' ? 1 : k === 'C' ? 0.8 : 0.9); return; }
      if (down) this.btnMode[k] = (this.state === 'kickoff' && this.ball.owner && this.ball.owner.t === 0) ? 'att' : this.mode();
      const md = this.btnMode[k] || this.mode(); this.lastBtn = k + ':' + md;
      if (k === 'A') { if (md === 'att') this.pressShoot(down); else if (down) this.slide(); }
      else if (k === 'B') { if (md === 'att') { if (down) this.pressPass(); } else this.input.press = down; }
      else if (k === 'C') { if (!down) return; if (md === 'att') this.pressLob(); else this.switchPlayer(); }
      if (!down) delete this.btnMode[k];
    }
    switchPlayer() {
      if (this.state !== 'play') return; const b = this.ball, p = this.ctrl;
      if (b.owner && b.owner.t === 0) return;
      const n = this.nearestTo(0, b.x + b.vx * 0.2, b.y + b.vy * 0.2, true, p); if (n) { this.ctrl = n; this.switchCd = 0.9; this.switches = (this.switches || 0) + 1; }
    }
    slide() {
      if (this.state !== 'play') return;
      const p = this.ctrl, b = this.ball; if (p.tackleCd > 0 || p.stun > 0) return;
      const o = b.owner && b.owner.t === 1 ? b.owner : null, tx = o ? o.x : b.x, ty = o ? o.y : b.y;
      const [dx, dy] = norm(tx - p.x, ty - p.y), d = hyp(tx - p.x, ty - p.y);
      p.lunge = 0.35; p.tackleCd = 0.75; p.slideT = 0.45; p.vx = dx * 9; p.vy = dy * 9; p.fx = dx; p.fy = dy; this.slides = (this.slides || 0) + 1;
      if (o && d < 3.0) {
        const prob = 0.6 + (p.sp.stats.def - (o.sp.stats.pac + o.sp.stats.pas) / 2) / 150 - (d > 2.2 ? 0.15 : 0);
        if (Math.random() < prob && b.protect <= 0.2) { b.owner = null; b.vx = dx * 7 + (Math.random() - 0.5) * 3; b.vy = dy * 7 + (Math.random() - 0.5) * 3; b.last = 0; b.passTo = null; b.tried = new Set([o]); o.stun = 0.6; KK.sfx.tackle(); this.flash('SLIDE TACKLE!'); this.st.tackles[0]++; p.ps.tk++; this.say(`Superb slide tackle by ${p.sp.name.split(' ').pop()}!`); }
        else { p.stun = 0.5; const behind = o.fx * (p.x - o.x) + o.fy * (p.y - o.y) < -0.4 * d; if (Math.random() < (behind ? 0.5 : 0.22)) this.foul(p, o, behind ? 0.5 : 0.18); }
      } else if (!o && !b.owner && d < 2.6 && b.z < 1) { this.take(p); this.flash('SLIDE TACKLE!'); }
      else p.stun = 0.25;
    }
    pressLob() {
      if (this.state !== 'play' && this.state !== 'kickoff') return;
      const p = this.ctrl, b = this.ball; if (b.owner !== p) return;
      if (this.state === 'kickoff') this.startPlay();
      let [dx, dy, m] = this.inputVec(); if (m < 0.3) { dx = p.fx; dy = p.fy; }
      const gx = L, wide = Math.abs(p.y - CY) > 11 && p.x > 68;
      let r = null, tx, ty;
      if (wide) { // cross into the box
        let bs = -1e9; for (const e of this.ents) { if (e.t !== 0 || e === p || e.pos === 'GK') continue; if (e.x < 80) continue; const s = -Math.abs(e.y - CY) * 0.3 + this.openness(p, e) + (e.x - 80) * 0.1; if (s > bs) { bs = s; r = e; } }
        tx = r ? r.x + 1 : gx - 9; ty = r ? r.y : CY + (p.y < CY ? 3 : -3);
      } else {
        let bs = -1e9;
        for (const e of this.ents) { if (e.t !== 0 || e === p || e.pos === 'GK') continue; const vx = e.x - p.x, vy = e.y - p.y, d = hyp(vx, vy); if (d < 10 || d > 62) continue; const cos = (vx * dx + vy * dy) / d; if (cos < 0.4) continue; const s = cos * 3 + this.openness(p, e) * 0.5 + d * 0.03; if (s > bs) { bs = s; r = e; } }
        if (r) { tx = r.x + r.vx * 1.2; ty = r.y + r.vy * 1.2; } else { tx = p.x + dx * 30; ty = p.y + dy * 30; }
      }
      this.lob(p, clamp(tx, 1, L - 1), clamp(ty, 1, W - 1), r);
      if (r) { this.ctrl = r; this.switchCd = 0.8; }
      this.lobs = (this.lobs || 0) + 1;
    }
    lob(p, tx, ty, recv) {
      const d = hyp(tx - p.x, ty - p.y), vz = clamp(4.5 + d * 0.17, 6, 12.5), T = 2 * vz / 14;
      const sp = d / T * 1.04;
      this.kickTo(p, tx, ty, sp, this.passNoise(p) * 0.6, recv);
      const b = this.ball; b.vz = vz; b.z = 0.05; b.lob = true;
    }
    // ---------- actions ----------
    passNoise(p) { const tm = this.teams[p.t]; return (1 - p.sp.stats.pas / 110) * 0.16 * (p.t === 0 ? 0.8 + this.dq * 0.5 : 1.35 - 0.6 * tm.q); }
    pickReceiver(p, dx, dy) {
      let best = null, bs = -1e9;
      for (const m of this.ents) {
        if (m.t !== p.t || m === p) continue;
        const vx = m.x - p.x, vy = m.y - p.y, d = hyp(vx, vy); if (d < 3 || d > 45) continue;
        const cos = (vx * dx + vy * dy) / d; if (cos < 0.45) continue;
        const open = this.openness(p, m);
        const s = cos * 4 - d * 0.05 + open * 0.35 - (m.pos === 'GK' ? 3 : 0);
        if (s > bs) { bs = s; best = m; }
      }
      return best;
    }
    openness(p, m) {
      let o = 8;
      for (const e of this.ents) if (e.t !== p.t) o = Math.min(o, segDist(e.x, e.y, p.x, p.y, m.x, m.y), hyp(e.x - m.x, e.y - m.y) * 0.8);
      return o;
    }
    passTo(p, r) {
      const d = hyp(r.x - p.x, r.y - p.y), sp = clamp(11 + d * 0.65, 13, 27), t = d / sp, dir = this.teams[p.t].dir;
      const thru = r.runT > 0 && (r.x - p.x) * dir > 3;
      let tx = r.x + r.vx * t * (thru ? 1.1 : 0.7) + (thru ? dir * 3.5 : 0), ty = r.y + r.vy * t * (thru ? 1.1 : 0.7);
      tx = clamp(tx, 2, L - 2); ty = clamp(ty, 1.5, W - 1.5); if (thru) { this.thru = (this.thru || 0) + 1; if (Math.random() < 0.5) this.say(pick(['Through ball!', `Lovely ball in behind for ${r.sp.name.split(' ').pop()}!`])); }
      this.kickTo(p, tx, ty, sp, this.passNoise(p), r);
      if (p.t === 0) { this.ctrl = r; this.switchCd = 0.4; }
    }
    kickTo(p, tx, ty, speed, noise, recv, shot) {
      const b = this.ball; let [dx, dy] = norm(tx - p.x, ty - p.y);
      const a = (Math.random() * 2 - 1) * noise, c = Math.cos(a), s = Math.sin(a);
      [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
      b.owner = null; b.vx = dx * speed; b.vy = dy * speed; b.x = p.x + dx * 1.0; b.y = p.y + dy * 1.0;
      b.last = p.t; b.lastKicker = p; b.tried = new Set([p]); b.passTo = recv; b.shot = !!shot; b.shotT = p.t;
      b.vz = shot ? 2 + Math.random() * 3 : (speed > 22 ? 3 : 0); b.z = 0.01; b.lob = false;
      p.kickCd = 0.35;
      b.offside = (this.offsideOn && recv && recv.t === p.t && !shot && !this.noOffKick && this.isOffside(recv, p.t)) ? recv : null; this.noOffKick = false;
      if (this.pen && p === this.pen.taker && !this.pen.kicked) { const P = this.pen, side = Math.sign(ty - CY) || 1; P.kicked = true; P.after = 0; P.dive = Math.random() < 0.38 + (P.gk ? P.gk.sp.rating / 600 : 0) ? side : (Math.random() < 0.2 ? 0 : -side); }
      if (shot) KK.sfx.kick(1); else KK.sfx.pass();
    }
    shoot(p, ty, power) {
      const tm = this.teams[p.t], gx = tm.goalX === 0 ? L : 0;
      const d = hyp(gx - p.x, CY - p.y);
      const noise = ((1 - p.sp.stats.sho / 110) * 0.13 + d / 40 * 0.05) * (p.t === 0 ? 0.9 : 1.3 - 0.5 * tm.q) * (0.8 + power * 0.25);
      this.kickTo(p, gx, ty, (21 + p.sp.stats.sho * 0.12) * power, noise, null, true);
      this.st.shots[p.t]++; p.ps.sh++; this.chain = 0;
      const sn = p.sp.name.split(' ').pop();
      this.say(d > 22 ? pick([`${sn} tries his luck from distance!`, `Long-range effort from ${sn}!`]) : pick([`${sn} shoots!`, `${sn} lets fly!`, `Chance for ${sn}!`]));
    }
    isOffside(r, t) {
      const dir = this.teams[t].dir; if ((r.x - L / 2) * dir <= 0) return false;
      return r.x * dir > Math.max(this.lineOf(t) * dir, this.ball.x * dir) + 0.4;
    }
    lineOf(t) { // second-last defender of the team t is attacking (in x, world coords)
      const dir = this.teams[t].dir; let a = -1e9, c = -1e9;
      for (const e of this.ents) if (e.t !== t) { const v = e.x * dir; if (v > a) { c = a; a = v; } else if (v > c) c = v; }
      return (c < -1e8 ? L / 2 * dir : c) * dir;
    }
    say(txt, force) { if (!force && this.sayT > 0) return; this.sayT = force ? 3.2 : 2.6; this.lastSay = txt; if (this.cfg.onSay) this.cfg.onSay(txt); }
    startPlay() { if (this.state === 'kickoff') { this.state = 'play'; this.banner = ''; KK.sfx.whistle(1); if (this.elapsed < 1) this.say(pick(['And we are under way!', 'The referee gets us started!']), true); else if (this.half === 2 && Math.abs(this.elapsed - this.total / 2) < 0.5) this.say('The second half is under way!', true); } }
    flash(txt) { this.flashTxt = txt; this.flashT = 0.9; }
    // ---------- loop ----------
    loop(now) {
      if (!this.running) return;
      const raw = (now - this.last) / 1000; let dt = Math.min(0.1, raw); this.last = now;
      if (raw > 0) this.fps = this.fps ? this.fps * 0.95 + 0.05 / raw : 1 / raw;
      this.frameDt = this.paused ? 0 : dt;
      if (!this.paused) { this.acc += dt; let n = 0; while (this.acc >= DT && n < 6) { this.step(DT); this.acc -= DT; n++; } if (n === 6) this.acc = 0; }
      this.draw(); if (this.cfg.onHud) this.cfg.onHud(this);
      requestAnimationFrame(this.loop);
    }
    step(dt) {
      const b = this.ball;
      if (this.input.shootDown) this.input.shootT += dt;
      if (this.flashT > 0) this.flashT -= dt;
      if (this.sayT > 0) this.sayT -= dt;
      if (this.state === 'play') { const o = this.ball.owner; if (o) this.st.poss[o.t] += dt; else if (this.ball.passTo) this.st.poss[this.ball.passTo.t] += dt; }
      if (this.state === 'replay') return this.replayStep(dt);
      if (this.state === 'kickoff') { this.stateT -= dt; if (this.stateT <= 0) this.startPlay(); this.camFollow(dt); return; }
      if (this.state === 'goal' || this.state === 'half' || this.state === 'restart') {
        this.stateT -= dt; this.ents.forEach(p => { p.vx *= 0.9; p.vy *= 0.9; p.x += p.vx * dt; p.y += p.vy * dt; });
        if (this.state !== 'restart') this.ballPhysics(dt, true);
        if (this.state === 'goal' && this.replayData && this.replayData.extra < 24 && (this.recN++ & 1)) { this.replayData.frames.push(this.frame()); this.replayData.extra++; }
        if (this.stateT <= 0) { const f = this.after; this.after = null; f && f(); }
        this.camFollow(dt); return;
      }
      if (this.state === 'end') { this.stateT -= dt; if (this.stateT <= 0 && !this.ended) { this.ended = true; this.cfg.onEnd && this.cfg.onEnd(this.result()); } return; }
      if (this.pen && !this.pen.kicked) { // penalty: everyone waits for the taker
        const P = this.pen; P.T += dt;
        for (const e of this.ents) { e.tackleCd -= dt; e.kickCd -= dt; this.steer(e, 0, 0, dt); if (e === P.taker) { e.fx = this.teams[P.t].dir; e.fy = 0; } }
        if (b.owner !== P.taker) { P.kicked = true; P.after = 0; }
        else if ((P.t === 1 && P.T > 1.3) || P.T > 8) this.penShot(1, P.t === 1 ? (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 2) : null);
        this.ballPhysics(dt, false); this.camFollow(dt); return;
      }
      if (this.pen) { this.pen.after += dt; if (this.pen.after > 1.4 || b.owner) { this.pen = null; b.protect = 0; } }
      if ((this.recN++ & 1) === 0) { this.rec.push(this.frame()); if (this.rec.length > 165) this.rec.shift(); }
      this.offLine[0] = this.lineOf(0); this.offLine[1] = this.lineOf(1);
      // clock
      this.elapsed += dt;
      if (this.pen) this.elapsed -= dt;
      if (!this.pen && this.half === 1 && this.elapsed >= this.total / 2) { this.half = 2; this.elapsed = this.total / 2; KK.sfx.whistle(2); this.state = 'half'; this.banner = 'HALF TIME'; this.stateT = 2; this.say(`Half time: ${this.score[0]} - ${this.score[1]}.`, true); if (this.cfg.onHalf) this.cfg.onHalf(this); this.after = () => this.kickoff(1); return; }
      if (!this.pen && this.elapsed >= this.total) { this.elapsed = this.total; this.state = 'end'; this.stateT = 2.4; this.banner = 'FULL TIME'; this.say('The referee blows for full time!', true); KK.sfx.whistle(3); return; }
      b.protect -= dt;
      this.mentT -= dt; if (this.mentT <= 0) { this.mentT = 4; const df = this.score[1] - this.score[0], late = this.elapsed / this.total > 0.55; this.ment[1] = df < 0 && late ? 2 : df > 0 && late ? 0 : 1; }
      // control switching
      this.switchCd -= dt;
      if (b.owner && b.owner.t === 0) this.ctrl = b.owner;
      else if (this.switchCd <= 0 && !(b.passTo && b.passTo.t === 0 && !b.owner)) {
        const n = this.nearestTo(0, b.x + b.vx * 0.2, b.y + b.vy * 0.2, true);
        if (n && n !== this.ctrl && (this.ctrl.pos === 'GK' || hyp(n.x - b.x, n.y - b.y) + 2 < hyp(this.ctrl.x - b.x, this.ctrl.y - b.y))) { this.ctrl = n; this.switchCd = 0.35; }
      }
      // chasers
      this.chasers = [new Set(), new Set()];
      for (let t = 0; t < 2; t++) {
        if (b.owner && b.owner.t === t) continue;
        const list = this.ents.filter(p => p.t === t && p.pos !== 'GK' && p !== this.ctrl).sort((a, c) => hyp(a.x - b.x, a.y - b.y) - hyp(c.x - b.x, c.y - b.y));
        const nCh = t === 0 ? (this.ment[0] === 2 && b.owner ? 2 : 1) : (b.owner ? (this.ment[1] === 0 ? 1 : 2 + (this.diff >= 2 && b.owner.x < L * 0.55 ? 1 : 0)) : 1);
        list.slice(0, nCh).forEach(p => this.chasers[t].add(p));
      }
      this.support = [null, null];
      if (b.owner) { const o = b.owner; let bd = 1e9; for (const e of this.ents) if (e.t === o.t && e !== o && e.pos !== 'GK' && e !== this.ctrl) { const d = hyp(e.x - o.x, e.y - o.y); if (d < bd) { bd = d; this.support[o.t] = e; } } }
      for (const p of this.ents) { this.think(p, dt); if (this.state !== 'play') break; }
      if (this.state !== 'play') { this.camFollow(dt); return; }
      this.collide();
      this.ballPhysics(dt, false);
      this.camFollow(dt);
      KK.sfx.crowdLevel(Math.max(0, 1 - Math.abs(b.x - (L)) / 30) * 0.7);
    }
    moveToward(p, tx, ty, spdFrac, dt) {
      const dx = tx - p.x, dy = ty - p.y, d = hyp(dx, dy);
      let tvx = 0, tvy = 0;
      if (d > 0.4) { const sp = this.maxSpeed(p) * spdFrac * Math.min(1, d / 2.5); tvx = dx / d * sp; tvy = dy / d * sp; }
      this.steer(p, tvx, tvy, dt);
    }
    steer(p, tvx, tvy, dt) {
      const acc = 32 * dt; let ax = tvx - p.vx, ay = tvy - p.vy; const m = hyp(ax, ay);
      if (m > acc) { ax = ax / m * acc; ay = ay / m * acc; }
      p.vx += ax; p.vy += ay; p.x += p.vx * dt; p.y += p.vy * dt;
      p.x = clamp(p.x, -2, L + 2); p.y = clamp(p.y, -2, W + 2);
      const s = hyp(p.vx, p.vy); if (s > 0.5) { p.fx = p.vx / s; p.fy = p.vy / s; }
    }
    think(p, dt) {
      const b = this.ball, tm = this.teams[p.t];
      p.tackleCd -= dt; p.kickCd -= dt; p.lunge -= dt; if (p.slideT > 0) p.slideT -= dt;
      if (p.stun > 0) { p.stun -= dt; this.steer(p, p.vx * 0.5, p.vy * 0.5, dt); return; }
      if (p === this.ctrl) return this.userMove(p, dt);
      if (p.pos === 'GK') return this.gkThink(p, dt);
      if (b.owner === p) return this.ownerThink(p, dt);
      if (!b.owner && b.passTo === p) {
        const [ux, uy] = norm(b.vx, b.vy), s = Math.max(0, (p.x - b.x) * ux + (p.y - b.y) * uy);
        return this.moveToward(p, b.x + ux * s, b.y + uy * s, 1, dt);
      }
      if (this.chasers[p.t].has(p)) {
        const first = [...this.chasers[p.t]][0] === p;
        if (b.owner && !first) { // cover between ball and own goal
          const gx = tm.goalX; return this.moveToward(p, b.x + (gx - b.x) * 0.3, b.y + (CY - b.y) * 0.3, 0.9, dt);
        }
        const tx = b.owner ? b.owner.x + b.owner.vx * 0.25 : b.x + b.vx * 0.3, ty = b.owner ? b.owner.y + b.owner.vy * 0.25 : b.y + b.vy * 0.3;
        this.moveToward(p, tx, ty, p.t === 1 ? 0.88 + tm.q * 0.14 : 0.95, dt);
        if (b.owner && b.owner.t !== p.t) this.aiTackle(p);
        return;
      }
      const has = b.owner && b.owner.t === p.t, dir = tm.dir;
      if (has && this.support[p.t] === p && hyp(b.owner.x - p.x, b.owner.y - p.y) < 22) { // offer a short option
        const o = b.owner, side = o.y < CY ? 1 : -1, sx = clamp(o.x - dir * 5, 3, L - 3), sy = clamp(o.y + side * 9, 3, W - 3);
        return this.moveToward(p, sx, sy, 0.85, dt);
      }
      p.runCd -= dt; if (p.runT > 0) p.runT -= dt;
      if (has && (p.pos === 'FW' || p.pos === 'MF') && p.runCd <= 0 && (b.owner.x - L / 2) * dir > -L * 0.2) {
        p.runCd = 2.5 + Math.random() * 3; if (Math.random() < (p.pos === 'FW' ? 0.6 : 0.3) + this.ment[p.t] * 0.1) p.runT = 1.8;
      }
      if (has && p.runT > 0) { // timed run in behind: hug the line, then burst once the ball is played
        const line = this.offsideOn ? this.offLine[p.t] : (tm.goalX === 0 ? L - 12 : 12), gx = tm.goalX === 0 ? L : 0;
        const rx = clamp(line - dir * (this.offsideOn ? 0.5 : 0) + dir * 2, 2, L - 2), ry = p.y + (CY - p.y) * 0.25;
        return this.moveToward(p, (rx - gx) * dir > -6 ? gx - dir * 6 : rx, ry, 1.0, dt);
      }
      const h = this.homeSpot(p); this.moveToward(p, h[0], h[1], 0.75, dt);
      if (b.owner && b.owner.t !== p.t && hyp(b.owner.x - p.x, b.owner.y - p.y) < 1.8) this.aiTackle(p);
    }
    aiTackle(p) {
      const b = this.ball, o = b.owner; if (!o || p.tackleCd > 0 || b.protect > 0) return;
      if (hyp(o.x - p.x, o.y - p.y) > 1.7) return;
      const tm = this.teams[p.t];
      let prob = 0.28 + (p.sp.stats.def - (o.sp.stats.pac + o.sp.stats.pas) / 2) / 180 + tm.q * 0.15;
      if (o.t === 0) prob *= 0.85 + this.dq * 0.6;
      p.tackleCd = 0.9 + Math.random() * 0.5;
      if (Math.random() < prob) {
        b.owner = null; const [dx, dy] = norm(p.x - o.x + (Math.random() - 0.5), p.y - o.y + (Math.random() - 0.5));
        b.vx = -dx * 3 + p.vx * 0.3; b.vy = -dy * 3 + p.vy * 0.3; b.last = p.t; b.tried = new Set([o]); b.passTo = null; b.shot = false;
        o.stun = 0.45; KK.sfx.tackle(); this.st.tackles[p.t]++; p.ps.tk++; if (Math.random() < 0.4) this.say(`Strong challenge from ${p.sp.name.split(' ').pop()}.`);
      } else {
        p.stun = 0.35; const d = hyp(o.x - p.x, o.y - p.y) || 1, behind = o.fx * (p.x - o.x) + o.fy * (p.y - o.y) < -0.4 * d;
        if (Math.random() < (behind ? 0.16 : 0.05)) this.foul(p, o, behind ? 0.32 : 0.08);
      }
    }
    foul(f, v, cardP) {
      if (this.state !== 'play' || this.pen) return;
      const ft = f.t, vt = v.t, tmD = this.teams[ft], fn = f.sp.name.split(' ').pop(), vn = v.sp.name.split(' ').pop();
      this.st.fouls[ft]++; v.stun = 0.8; KK.sfx.whistle(1);
      const inBox = Math.abs(v.x - tmD.goalX) < BOX_D && Math.abs(v.y - CY) < BOX_H;
      const danger = Math.abs(v.x - tmD.goalX) < 30 && Math.abs(v.y - CY) < 20;
      let card = null; const r = Math.random();
      if (r < 0.015 + (danger ? 0.02 : 0)) card = 'R'; else if (r < cardP + (inBox ? 0.08 : 0)) card = 'Y';
      if (card === 'Y' && ++f.yc >= 2) card = 'R2';
      if (card && card !== 'Y' && f.pos === 'GK') card = 'Y';
      let msg = card === 'Y' ? `Yellow card for ${fn}.` : card === 'R2' ? `Second yellow! ${fn} is sent off!` : card === 'R' ? `Straight red card! ${fn} has to go!` : pick([`Foul by ${fn} on ${vn}.`, `${fn} brings down ${vn}. Free kick.`, `The referee blows for a foul by ${fn}.`]);
      if (card) { this.cards.push({ t: ft, min: this.minute(), name: f.sp.name, id: f.sp.id, card: card === 'Y' ? 'Y' : 'R' }); this.cardShow = { c: card === 'Y' ? 'Y' : 'R', name: f.sp.name, T: 2.2 }; KK.sfx.whistle(2); }
      if (Math.random() < 0.12) { v.stam = Math.max(0.25, v.stam - 0.25); v.knock = true; this.knocks.push({ t: vt, id: v.sp.id, name: v.sp.name }); msg += ` ${vn} takes a knock but can carry on.`; }
      this.say(msg, true);
      if (card === 'R' || card === 'R2') this.sendOff(f);
      if (inBox) return this.penalty(vt);
      this.restart(vt, v.x, v.y, 'FREE KICK', false, 9.15, v, 1.5);
    }
    sendOff(p) {
      p.off = true; p.vx = p.vy = 0; p.x = L / 2; p.y = -4; const b = this.ball;
      this.ents = this.ents.filter(e => e !== p); this.offEnts.push(p);
      if (b.owner === p) b.owner = null; if (b.passTo === p) b.passTo = null;
      if (this.ctrl === p) this.ctrl = this.nearestTo(0, b.x, b.y, true);
    }
    penalty(t) {
      const b = this.ball, tm = this.teams[t], gx = tm.goalX === 0 ? L : 0, dir = tm.dir, spotX = gx - dir * 11;
      this.state = 'restart'; this.stateT = 1.8; this.flash('PENALTY!');
      b.vx = b.vy = b.vz = 0; b.owner = null; b.x = spotX; b.y = CY; b.z = 0; b.passTo = null; b.shot = false; b.offside = null;
      this.after = () => {
        const def = 1 - t, gk = this.ents.find(e => e.t === def && e.pos === 'GK');
        const cand = this.ents.filter(e => e.t === t && e.pos !== 'GK').sort((a, c) => c.sp.stats.sho - a.sp.stats.sho), taker = cand[0];
        let k = 0;
        for (const e of this.ents) {
          e.vx = e.vy = 0; e.stun = 0; e.slideT = 0;
          if (e === taker) { e.x = spotX - dir * 0.85; e.y = CY; e.fx = dir; e.fy = 0; }
          else if (e === gk) { e.x = gx - dir * 0.5; e.y = CY; e.fx = -dir; e.fy = 0; }
          else if (e.pos !== 'GK') { k++; e.x = gx - dir * (BOX_D + 1.5 + (k % 3) * 1.6); e.y = CY + ((k % 2) ? 1 : -1) * (2 + (k >> 1) * 2.2); }
        }
        this.take(taker); b.protect = 99; this.pen = { t, taker, gk, T: 0, kicked: false }; this.state = 'play';
        if (t === 0) this.ctrl = taker;
        this.say(t === 0 ? 'Penalty! Aim with the joystick and shoot.' : `${taker.sp.name.split(' ').pop()} steps up to take the penalty...`, true);
      };
    }
    penShot(power, aim) {
      const P = this.pen, p = P.taker; if (this.ball.owner !== p) return;
      let off = aim;
      if (off == null) { const [, wy, m] = this.inputVec(); off = m > 0.25 ? clamp(wy * 3.4, -3.2, 3.2) : (Math.random() < 0.5 ? -2.4 : 2.4); }
      this.shoot(p, CY + off, power);
    }
    userMove(p, dt) {
      const b = this.ball, [dx, dy, m] = this.inputVec();
      if (m < 0.15 && !b.owner && b.passTo === p) {
        const [ux, uy] = norm(b.vx, b.vy), s = Math.max(0, (p.x - b.x) * ux + (p.y - b.y) * uy);
        return this.moveToward(p, b.x + ux * s, b.y + uy * s, 1, dt);
      }
      if (p.slideT > 0) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; return; }
      const sprint = this.sprinting() && p.stam > 0.05;
      if (this.input.press && (b.owner ? b.owner.t === 1 : b.passTo ? b.passTo.t === 1 : true)) { // PRESSURE: auto close-down
        const o = b.owner, tx = o ? o.x + o.vx * 0.3 : b.x + b.vx * 0.3, ty = o ? o.y + o.vy * 0.3 : b.y + b.vy * 0.3;
        this.pressT = (this.pressT || 0) + dt; p.stam = Math.max(0, p.stam - dt * 0.1);
        this.moveToward(p, tx, ty, sprint ? 1.15 : 1.0, dt);
        if (o && hyp(o.x - p.x, o.y - p.y) < 1.6) this.aiTackle(p);
        return;
      }
      if (sprint && m > 0.15) p.stam = Math.max(0, p.stam - dt * 0.28); else p.stam = Math.min(1, p.stam + dt * 0.12);
      let sp = this.maxSpeed(p) * Math.min(1, m) * (sprint ? 1.3 : 0.92) * (b.owner === p ? 0.9 : 1) * (p.lunge > 0 ? 1.4 : 1);
      if (m < 0.15) { this.steer(p, 0, 0, dt); return; }
      this.steer(p, dx / m * sp, dy / m * sp, dt);
    }
    gkThink(p, dt) {
      const b = this.ball, tm = this.teams[p.t], gx = tm.goalX, dir = tm.dir;
      if (b.owner === p) {
        p.hold = (p.hold || 0) + dt; this.moveToward(p, gx + dir * 6, CY, 0.4, dt);
        if (p.hold > 1.0) {
          p.hold = 0; const mates = this.ents.filter(m => m.t === p.t && m !== p);
          let best = null, bs = -1e9; mates.forEach(m => { const s = this.openness(p, m) * 2 + (m.x - p.x) * dir * 0.08 + Math.random() * 3; if (s > bs) { bs = s; best = m; } });
          this.passTo(p, best); b.protect = 0;
        }
        return;
      }
      p.hold = 0;
      if (this.pen && this.pen.gk === p) { if (!this.pen.kicked) return this.steer(p, 0, 0, dt); return this.moveToward(p, gx + dir * 0.6, CY + this.pen.dive * 3.2, 1.6, dt); }
      const inBox = Math.abs(b.x - gx) < BOX_D && Math.abs(b.y - CY) < BOX_H;
      const ballSpeed = hyp(b.vx, b.vy);
      if (!b.owner && b.vx * -dir > 3 && Math.abs(b.x - gx) < 40) { // incoming
        const t = (gx + dir * 1.2 - b.x) / b.vx; const ty = clamp(b.y + b.vy * Math.max(0, t), CY - GH - 1, CY + GH + 1);
        return this.moveToward(p, gx + dir * 1.2, ty, 1.35, dt);
      }
      if (!b.owner && inBox && ballSpeed < 15) {
        const opp = this.nearestTo(1 - p.t, b.x, b.y), dme = hyp(b.x - p.x, b.y - p.y);
        if (!opp || dme < hyp(opp.x - b.x, opp.y - b.y) + 3) return this.moveToward(p, b.x, b.y, 1.1, dt);
      }
      if (b.owner && b.owner.t !== p.t && inBox && hyp(b.owner.x - p.x, b.owner.y - p.y) < 5) { this.moveToward(p, b.owner.x, b.owner.y, 1.1, dt); this.aiTackle(p); return; }
      // stand on the line between the ball and the centre of goal; come off the line further when the ball is far
      const bx = b.owner ? b.owner.x : b.x, by = b.owner ? b.owner.y : b.y, dist = hyp(bx - gx, by - CY) || 1;
      let ux = (bx - gx) / dist, uy = (by - CY) / dist; if (ux * dir < 0.25) { ux = 0.25 * dir; uy = Math.sign(uy) * 0.97; }
      const depth = dist > 50 ? 7 : clamp(1 + dist * 0.1, 1.2, 4.5);
      const tx = gx + ux * depth, ty = CY + clamp(uy * depth, -GH + 0.3, GH - 0.3);
      this.moveToward(p, tx, ty, 0.85, dt);
    }
    ownerThink(p, dt) {
      const b = this.ball, tm = this.teams[p.t], gx = tm.goalX === 0 ? L : 0, dir = tm.dir;
      p.dec -= dt;
      let np = 99, nOpp = null; for (const e of this.ents) if (e.t !== p.t) { const d = hyp(e.x - p.x, e.y - p.y); if (d < np) { np = d; nOpp = e; } }
      const dg = hyp(gx - p.x, CY - p.y);
      if (p.dec <= 0) {
        p.dec = 0.45 - 0.25 * tm.q + Math.random() * 0.25;
        const range = 18 + p.sp.stats.sho / 10;
        let blocked = 0; for (const e of this.ents) if (e.t !== p.t && e.pos !== 'GK' && (e.x - p.x) * dir > 0 && segDist(e.x, e.y, p.x, p.y, gx, CY) < 0.9) blocked++;
        if (dg < range && Math.abs(p.y - CY) < dg * 0.85 && Math.random() < (0.35 + tm.q * 0.35 + (dg < 12 ? 0.3 : 0)) * (blocked && dg > 10 ? 0.35 : 1)) {
          const gk = this.ents.find(e => e.t !== p.t && e.pos === 'GK'), away = gk ? (gk.y > CY ? -1 : 1) : 1, side = Math.random() < 0.72 ? away : -away;
          return this.shoot(p, CY + side * (1.4 + Math.random() * 1.9), 0.9 + Math.random() * 0.12);
        }
        if ((p.x - L / 2) * dir > -10 && Math.random() < 0.25 + tm.q * 0.3) { // through ball to a runner
          const run = this.ents.find(m => m.t === p.t && m !== p && m.runT > 0 && (m.x - p.x) * dir > 4 && hyp(m.x - p.x, m.y - p.y) < 32 && !(this.offsideOn && this.isOffside(m, p.t)));
          if (run) { let free = true; for (const e of this.ents) if (e.t !== p.t && e.pos !== 'GK' && hyp(e.x - (run.x + dir * 6), e.y - run.y) < 3.5) free = false; if (free) return this.passTo(p, run); }
        }
        if (Math.abs(p.y - CY) > 14 && (gx - p.x) * dir < 26 && Math.random() < 0.35) {
          const box = this.ents.filter(e => e.t === p.t && e !== p && e.pos !== 'GK' && Math.abs(gx - e.x) < 18 && Math.abs(e.y - CY) < 12);
          if (box.length) { const r = box[Math.floor(Math.random() * box.length)]; return this.lob(p, r.x, r.y, r); }
        }
        const fwd = this.ment[p.t] === 2 ? 0.75 : this.ment[p.t] === 0 ? 0.3 : 0.5;
        const wantPass = (np < 3.4 && Math.random() < 0.6) || Math.random() < 0.1;
        if (wantPass) {
          let best = null, bs = -1e9;
          for (const m of this.ents) {
            if (m.t !== p.t || m === p || m.pos === 'GK') continue;
            const d = hyp(m.x - p.x, m.y - p.y); if (d < 5 || d > 35) continue;
            if (this.offsideOn && this.isOffside(m, p.t) && Math.random() < (p.t === 1 ? 0.8 + this.dq * 0.6 : 0.95)) continue;
            const s = (m.x - p.x) * dir * fwd + this.openness(p, m) * 2.2 - d * 0.08 + Math.random() * 2.5;
            if (s > bs) { bs = s; best = m; }
          }
          if (best && (bs > 4 || np < 2.5)) return this.passTo(p, best);
        }
      }
      let [tx, ty] = [gx, CY + (p.y - CY) * 0.55];
      let [dx, dy] = norm(tx - p.x, ty - p.y);
      if (nOpp && np < 6) { const ax = p.x - nOpp.x, ay = p.y - nOpp.y; const [ox, oy] = norm(ax, ay); const w = (6 - np) / 6 * 1.2; [dx, dy] = norm(dx + ox * w, dy + oy * w); }
      if ((p.y < 3 && dy < 0) || (p.y > W - 3 && dy > 0)) dy = 0;
      const sp = this.maxSpeed(p) * 0.82;
      this.steer(p, dx * sp, dy * sp, dt);
    }
    collide() {
      const E = this.ents;
      for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
        const a = E[i], c = E[j], dx = c.x - a.x, dy = c.y - a.y, d = hyp(dx, dy);
        if (d < 1.3 && d > 0.001) { const push = (1.3 - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * push; a.y -= uy * push; c.x += ux * push; c.y += uy * push; }
      }
    }
    ballPhysics(dt, dead) {
      const b = this.ball;
      if (b.owner) {
        const o = b.owner; b.x = o.x + o.fx * 0.85; b.y = o.y + o.fy * 0.85; b.vx = o.vx; b.vy = o.vy; b.z = 0; b.spin += hyp(o.vx, o.vy) * dt;
        return;
      }
      const sp = hyp(b.vx, b.vy);
      if (sp > 0) { const air = b.z > 0.3; const ns = Math.max(0, sp - (air ? sp * 0.05 : sp * 0.55 + 1.6) * dt); b.vx *= ns / sp; b.vy *= ns / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.spin += sp * dt;
      if (b.z > 0 || b.vz > 0) { b.vz -= 14 * dt; b.z += b.vz * dt; if (b.z < 0) { b.z = 0; b.vz = Math.abs(b.vz) > 2 ? -b.vz * 0.35 : 0; } }
      if (dead) return;
      // goal / out
      if (b.x < 0 || b.x > L) {
        const side = b.x < 0 ? 0 : 1; // goal of team side
        if (Math.abs(b.y - CY) < GH && b.z < 2.44) return this.goal(1 - side);
        if (Math.abs(Math.abs(b.y - CY) - GH) < 0.35) { b.vx = -b.vx * 0.5; b.x = clamp(b.x, 0.1, L - 0.1); KK.sfx.post(); return; }
        const defTeam = side; // team defending that end
        if (b.last === defTeam) return this.restart(1 - defTeam, side === 0 ? 0.6 : L - 0.6, b.y < CY ? 0.6 : W - 0.6, 'CORNER');
        return this.restart(defTeam, side === 0 ? 5.5 : L - 5.5, CY + (b.y < CY ? -9 : 9), 'GOAL KICK', true);
      }
      if (b.y < 0 || b.y > W) return this.restart(1 - b.last, clamp(b.x, 1, L - 1), b.y < 0 ? 0.4 : W - 0.4, 'THROW IN');
      // pickup
      for (const p of this.ents) {
        if (p.stun > 0 || p.kickCd > 0 || b.tried.has(p)) continue;
        const isGK = p.pos === 'GK', d = hyp(p.x - b.x, p.y - b.y), reach = isGK ? 1.9 : 1.1;
        if (!isGK && b.lob && d < 1.2 && b.z > 1.4 && b.z < 2.5 && b.vz < 0 && p.t === b.last) { // header
          const tm = this.teams[p.t], gx = tm.goalX === 0 ? L : 0, dg = hyp(gx - p.x, CY - p.y);
          b.tried.add(p); if (dg < 17 && Math.random() < 0.8) { this.shoot(p, CY + (Math.random() - 0.5) * 5, 0.8); this.ball.vz = 1 + Math.random() * 2; this.ball.z = b.z; this.flash('HEADER!'); }
          else { b.vx = (gx - p.x) / (dg || 1) * 8; b.vy = (CY - p.y) / (dg || 1) * 8; b.vz = 2; b.lob = false; b.lastKicker = p; }
          break;
        }
        if (d > reach || b.z > (isGK ? 2.6 : 1.4)) continue;
        if (sp < 12 && !isGK) { this.take(p); break; }
        b.tried.add(p);
        let chance = isGK ? 0.5 + p.sp.rating / 220 - Math.max(0, sp - 18) / 45 : 0.32 + p.sp.stats.def / 300 - sp / 90;
        if (isGK && b.shot && b.shotT === p.t) chance = 1;
        if (sp < 12) chance = 1;
        if (Math.random() < chance) {
          if (isGK && sp > 20 && Math.random() < 0.4) { // parry
            b.vx = -b.vx * 0.35 + (Math.random() - 0.5) * 4; b.vy = b.vy * 0.4 + (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 5); if (b.shot && b.shotT !== p.t) this.saved(p); b.last = p.t; b.shot = false; KK.sfx.tackle(); this.flash('SAVE!'); break;
          }
          if (isGK && b.shot && b.shotT !== p.t) { this.flash('SAVE!'); this.saved(p); }
          this.take(p); break;
        }
      }
    }
    take(p) {
      const b = this.ball, k = b.lastKicker;
      if (b.offside === p && k && k.t === p.t && b.last === p.t && this.state === 'play' && !this.pen) {
        b.offside = null; this.offsides = (this.offsides || 0) + 1; KK.sfx.whistle(1);
        this.say(pick([`Flag up! ${p.sp.name.split(' ').pop()} was offside.`, 'Offside! The assistant raises the flag.']), true);
        return this.restart(1 - p.t, p.x, p.y, 'OFFSIDE', false, 6, null, 1.3);
      }
      b.offside = null;
      if (k && k !== p && k.t === p.t && b.passTo !== undefined && !b.shot && !b.owner && b.lastKicker !== b.counted) { this.st.passes[p.t]++; k.ps.pa++; this.chain = (k.t === this.chainT ? this.chain : 0) + 1; this.chainT = k.t; if (this.chain === 6) this.say(pick(['Lovely passing move here!', 'They are keeping the ball beautifully!', 'Six passes in a row. Patient build-up!'])); }
      else if (k && k.t !== p.t) this.chain = 0;
      b.counted = k;
      b.owner = p; b.last = p.t; b.protect = 0.4; b.passTo = null; b.shot = false; b.z = 0; b.vz = 0; if (p.t === 0) this.ctrl = p; }
    saved(p) { this.st.saves[p.t]++; this.st.sot[1 - p.t]++; p.ps.sv++; this.say(pick([`Great save by ${p.sp.name.split(' ').pop()}!`, `Denied! The keeper stands tall.`, `What a stop from ${p.sp.name.split(' ').pop()}!`]), true); }
    restart(t, x, y, label, gk, dist = 6, taker = null, T = 0.9) {
      const b = this.ball; this.state = 'restart'; this.stateT = T; this.flash(label);
      b.vx = b.vy = b.vz = 0; b.owner = null; b.x = clamp(x, 0.3, L - 0.3); b.y = clamp(y, 0.3, W - 0.3); b.z = 0; b.offside = null; b.passTo = null; b.shot = false;
      this.after = () => {
        let p = gk ? this.ents.find(e => e.t === t && e.pos === 'GK') : null;
        if (!p) p = taker && !taker.off && taker.pos !== 'GK' ? taker : this.nearestTo(t, b.x, b.y, true);
        p.x = b.x - this.teams[t].dir * 0.5; p.y = b.y; p.vx = p.vy = 0; p.stun = 0;
        // push opponents away
        this.ents.forEach(e => { if (e.t !== t) { const d = hyp(e.x - b.x, e.y - b.y); if (d < dist) { const [ux, uy] = norm(e.x - b.x || 1, e.y - b.y); e.x = b.x + ux * dist; e.y = clamp(b.y + uy * dist, 0, W); } } });
        if (label === 'FREE KICK') { // defensive wall when it is in shooting range
          const tmA = this.teams[t], gx = tmA.goalX === 0 ? L : 0, dg = hyp(gx - b.x, CY - b.y);
          if (dg < 32) {
            const [ux, uy] = norm(gx - b.x, CY - b.y), wall = this.ents.filter(e => e.t !== t && e.pos !== 'GK').sort((a, c) => hyp(a.x - b.x, a.y - b.y) - hyp(c.x - b.x, c.y - b.y)).slice(0, dg < 24 ? 3 : 2);
            wall.forEach((e, i) => { const o = (i - (wall.length - 1) / 2) * 0.75; e.x = b.x + ux * 9.15 - uy * o; e.y = clamp(b.y + uy * 9.15 + ux * o, 0.5, W - 0.5); e.vx = e.vy = 0; e.fx = -ux; e.fy = -uy; e.stun = 0.5; });
          }
        }
        this.noOffKick = label === 'CORNER' || label === 'THROW IN' || label === 'GOAL KICK';
        this.take(p); b.protect = label === 'FREE KICK' || label === 'OFFSIDE' ? 1.6 : 1.2; this.state = 'play';
      };
    }
    goal(t) {
      const b = this.ball; this.score[t]++; const k = b.lastKicker;
      const scorer = k && k.t === t ? k : null;
      const name = scorer ? scorer.sp.name : 'Own goal';
      if (t === 0 && scorer) this.scorers.push(scorer.sp.id);
      this.st.sot[t]++; if (scorer) { scorer.ps.g++; const a = b.counted; if (a && a !== scorer && a.t === t) a.ps.as++; }
      this.say(scorer ? pick([`GOAL! ${name} finds the net!`, `GOAL! What a finish from ${name}!`, `It's in! ${name} scores!`]) : 'GOAL! An own goal!', true);
      this.events.push({ t, min: this.minute(), name });
      this.state = 'goal'; this.stateT = 2.6; this.banner = 'GOAL!'; this.goalName = name + ' ' + this.minute() + "'"; this.goalTeam = t;
      b.vx *= 0.3; b.vy *= 0.3; b.x = clamp(b.x, -1.5, L + 1.5);
      KK.sfx.whistle(1); if (t === 0) KK.sfx.cheer(); else KK.sfx.groan();
      this.replayData = { frames: this.rec.slice(-150), extra: 0, t, name: this.goalName };
      this.pen = null;
      this.after = () => { this.goalName = ''; const go = () => this.kickoff(1 - t); if (this.replaysOn && this.replayData.frames.length > 20) this.startReplay(go); else go(); };
      if (this.cfg.onGoal) this.cfg.onGoal(t, name);
    }
    clock() { const t = Math.min(90 * 60, Math.floor(this.elapsed / this.total * 90 * 60)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
    setMent(v) { this.ment[0] = v; }
    minute() { return Math.min(90, Math.floor(this.elapsed / this.total * 90) + 1); }
    result() {
      const mo = KK.meta ? KK.meta.motm(this.ents.concat(this.offEnts), this.score) : null;
      const pl = mo ? mo.ratings.map(x => ({ t: x.e.t, id: x.e.sp.id, name: x.e.sp.name, pos: x.e.pos, r: x.r, ps: x.e.ps, rating: x.e.sp.rating })) : [];
      const tot = this.st.poss[0] + this.st.poss[1] || 1;
      return { my: this.score[0], opp: this.score[1], scorers: this.scorers, events: this.events, played: true, cards: this.cards, knocks: this.knocks, diff: this.diff,
        stats: { ...this.st, possPct: [Math.round(this.st.poss[0] / tot * 100), 100 - Math.round(this.st.poss[0] / tot * 100)] },
        motm: mo && mo.best ? { t: mo.best.t, id: mo.best.sp.id, name: mo.best.sp.name, pos: mo.best.pos, r: mo.rating, ps: mo.best.ps, sp: mo.best.sp } : null, ratings: pl,
        teams: this.teams.map(t => ({ name: t.name, short: t.short })) };
    }
    simRest() {
      const left = 1 - this.elapsed / this.total; const r0 = this.teams[0].rating, r1 = this.teams[1].rating;
      const [a, c] = KK.simScore(r0, r1);
      const g0 = Math.round(a * left), g1 = Math.round(c * left);
      const fw = this.ents.filter(e => e.t === 0 && e.pos !== 'GK');
      for (let i = 0; i < g0; i++) { const s = fw[Math.floor(Math.random() * fw.length)]; this.scorers.push(s.sp.id); this.events.push({ t: 0, min: '-', name: s.sp.name }); }
      this.score[0] += g0; this.score[1] += g1; this.elapsed = this.total; this.state = 'end'; this.stateT = 0.01; this.paused = false;
    }
    substitute(slot, sp) { const e = this.ents.find(x => x.t === 0 && x.i === slot); if (e) { e.sp = sp; e.yc = 0; e.knock = false; e.stam = Math.max(0.55, Math.min(1, (sp.fit == null ? 100 : sp.fit) / 100)); } }
    // ---------- replays ----------
    frame() {
      const E = this.allE, f = new Float32Array(E.length * 11 + 10), b = this.ball;
      E.forEach((e, i) => { const o = i * 11; f[o] = e.x; f[o + 1] = e.y; f[o + 2] = e.vx; f[o + 3] = e.vy; f[o + 4] = e.fx; f[o + 5] = e.fy; f[o + 6] = e.kickCd; f[o + 7] = e.tackleCd; f[o + 8] = e.lunge; f[o + 9] = e.stun; f[o + 10] = e.slideT || 0; });
      const o = E.length * 11; f[o] = b.x; f[o + 1] = b.y; f[o + 2] = b.z; f[o + 3] = b.vx; f[o + 4] = b.vy; f[o + 5] = b.vz; f[o + 6] = b.owner ? E.indexOf(b.owner) : -1; f[o + 7] = b.shot ? 1 : 0; f[o + 8] = b.lastKicker ? E.indexOf(b.lastKicker) : -1; f[o + 9] = b.spin;
      return f;
    }
    applyFrame(f) {
      const E = this.allE, b = this.ball;
      E.forEach((e, i) => { const o = i * 11; e.x = f[o]; e.y = f[o + 1]; e.vx = f[o + 2]; e.vy = f[o + 3]; e.fx = f[o + 4]; e.fy = f[o + 5]; e.kickCd = f[o + 6]; e.tackleCd = f[o + 7]; e.lunge = f[o + 8]; e.stun = f[o + 9]; e.slideT = f[o + 10]; });
      const o = E.length * 11; b.x = f[o]; b.y = f[o + 1]; b.z = f[o + 2]; b.vx = f[o + 3]; b.vy = f[o + 4]; b.vz = f[o + 5]; b.owner = f[o + 6] >= 0 ? E[f[o + 6]] : null; b.shot = !!f[o + 7]; b.lastKicker = f[o + 8] >= 0 ? E[f[o + 8]] : null; b.spin = f[o + 9];
    }
    hasReplay() { return !!(this.replayData && this.replayData.frames.length > 20); }
    startReplay(done) {
      if (!this.hasReplay() || this.state === 'replay') return false;
      const b = this.ball;
      const snap = done ? null : { f: this.frame(), state: this.state, stateT: this.stateT, after: this.after, ctrl: this.ctrl, banner: this.banner, b: { passTo: b.passTo, tried: b.tried, protect: b.protect, last: b.last, lob: b.lob, counted: b.counted, offside: b.offside, shotT: b.shotT } };
      this.rp = { i: 0, frames: this.replayData.frames, done, snap }; this.state = 'replay'; this.banner = ''; this.paused = false; this.replays = (this.replays || 0) + 1;
      return true;
    }
    replayStep(dt) {
      const rp = this.rp; rp.i += dt * 30 * 0.8;
      const i = Math.floor(rp.i); if (i >= rp.frames.length) return this.skipReplay();
      this.applyFrame(rp.frames[i]); this.camFollow(dt);
    }
    skipReplay() {
      const rp = this.rp; if (this.state !== 'replay' || !rp) return; this.rp = null;
      if (rp.done) { this.state = 'goal'; rp.done(); return; }
      const s = rp.snap; this.applyFrame(s.f); this.state = s.state; this.stateT = s.stateT; this.after = s.after; this.ctrl = s.ctrl; this.banner = s.banner; Object.assign(this.ball, s.b);
    }
    camFollow(dt) {
      const b = this.ball, k = 1 - Math.exp(-dt * 5);
      const lead = this.vertical ? 8 : 10;
      this.cam.x += (b.x + (b.owner ? b.owner.fx * 4 : 0) + (this.vertical ? 4 : 0) - this.cam.x) * k;
      this.cam.y += (b.y - this.cam.y) * k;
      const cw = this.cv.width / this.sc, ch = this.cv.height / this.sc;
      const vl = this.vertical ? ch : cw, vw = this.vertical ? cw : ch;
      const M = 5;
      this.cam.x = vl > L + 2 * M ? L / 2 : clamp(this.cam.x, vl / 2 - M, L - vl / 2 + M);
      this.cam.y = vw > W + 2 * M ? W / 2 : clamp(this.cam.y, vw / 2 - M, W - vw / 2 + M);
      void lead;
    }
    // ---------- render ----------
    toScreen(x, y) {
      const s = this.sc, cx = this.cv.width / 2, cy = this.cv.height / 2;
      if (this.vertical) return [cx + (y - this.cam.y) * s, cy - (x - this.cam.x) * s + this.cv.height * 0.06];
      return [cx + (x - this.cam.x) * s, cy + (y - this.cam.y) * s];
    }
    worldTransform() {
      const s = this.sc, cx = this.cv.width / 2, cy = this.cv.height / 2, g = this.g;
      if (this.vertical) g.setTransform(0, -s, s, 0, cx - s * this.cam.y, cy + this.cv.height * 0.06 + s * this.cam.x);
      else g.setTransform(s, 0, 0, s, cx - s * this.cam.x, cy - s * this.cam.y);
    }
    draw() {
      const g = this.g, cv = this.cv, s = this.sc, dpr = this.dpr;
      if (this.r3) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); this.r3.render(this, this.frameDt); this.drawOverlay3D(); this.drawRadar(); this.drawBanners(); return; }
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#183d20'; g.fillRect(0, 0, cv.width, cv.height);
      this.worldTransform();
      // stands area
      g.fillStyle = '#1a2334'; g.fillRect(-12, -12, L + 24, 5); g.fillRect(-12, W + 7, L + 24, 5);
      for (let i = 0; i < 70; i++) { g.fillStyle = ['#e53935', '#fdd835', '#00e676', '#fff', '#00b0ff'][i % 5]; g.fillRect(-10 + i * 1.8, -10.5 + (i % 3) * 0.7, 0.7, 0.7); g.fillRect(-10 + i * 1.8, W + 8 + (i % 3) * 0.7, 0.7, 0.7); }
      // DLS checkered lush grass
      for (let i = 0; i < 20; i++) { g.fillStyle = i % 2 ? '#31892c' : '#3ea336'; g.fillRect(i * L / 20, 0, L / 20 + 0.02, W); }
      for (let j = 0; j < 10; j++) { g.fillStyle = j % 2 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.025)'; g.fillRect(0, j * W / 10, L, W / 10); }
      g.fillStyle = '#265c29'; g.fillRect(-4, -4, L + 8, 4); g.fillRect(-4, W, L + 8, 4); g.fillRect(-4, 0, 4, W); g.fillRect(L, 0, 4, W);
      g.strokeStyle = 'rgba(255,255,255,.88)'; g.lineWidth = 0.18;
      g.strokeRect(0, 0, L, W); g.beginPath(); g.moveTo(L / 2, 0); g.lineTo(L / 2, W); g.stroke();
      g.beginPath(); g.arc(L / 2, CY, 9.15, 0, Math.PI * 2); g.stroke();
      [[0, 1], [L, -1]].forEach(([x, d]) => {
        g.strokeRect(Math.min(x, x + d * BOX_D), CY - BOX_H, BOX_D, BOX_H * 2);
        g.strokeRect(Math.min(x, x + d * 5.5), CY - 9.16, 5.5, 18.32);
        g.beginPath(); g.arc(x + d * 11, CY, 9.15, d > 0 ? -0.93 : Math.PI - 0.93, d > 0 ? 0.93 : Math.PI + 0.93); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x + d * 11, CY, 0.25, 0, 7); g.fill();
        // goal
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(Math.min(x, x - d * 2.2), CY - GH, 2.2, GH * 2);
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.06;
        for (let k = -GH; k <= GH; k += 0.6) { g.beginPath(); g.moveTo(x, CY + k); g.lineTo(x - d * 2.2, CY + k); g.stroke(); }
        g.strokeStyle = '#fff'; g.lineWidth = 0.3; g.strokeRect(Math.min(x, x - d * 2.2), CY - GH, 2.2, GH * 2);
        g.lineWidth = 0.18; g.strokeStyle = 'rgba(255,255,255,.88)';
      });
      g.fillStyle = '#fff'; g.beginPath(); g.arc(L / 2, CY, 0.25, 0, 7); g.fill();
      g.setTransform(1, 0, 0, 1, 0, 0);
      // Articulated 2D human footballers in screen space
      const R = 0.95 * s, b = this.ball;
      const SKIN2D = ['#3d2316', '#4e2f1e', '#633d28', '#815236', '#a46d4b', '#c9936e', '#e3b592'];
      const HAIR2D = ['#110e0d', '#241710', '#422917', '#7b4f25', '#c8a258'];
      const sorted = this.ents.slice().sort((a, c) => this.toScreen(a.x, a.y)[1] - this.toScreen(c.x, c.y)[1]);
      if (this.ctrl) {
        const [x, y] = this.toScreen(this.ctrl.x, this.ctrl.y);
        g.fillStyle = 'rgba(0,230,118,.22)'; g.strokeStyle = this.sprinting() ? '#00e5ff' : '#00e676'; g.lineWidth = 2.2 * dpr;
        g.beginPath(); g.ellipse(x, y + R * 0.72, R * 1.65, R * 0.85, 0, 0, 7); g.fill(); g.stroke();
      }
      for (const p of sorted) {
        const [x, y] = this.toScreen(p.x, p.y), tm = this.teams[p.t];
        const spd = hyp(p.vx, p.vy), ph = (this.elapsed * 9 + p.i * 1.7), stride = Math.sin(ph) * Math.min(1, spd / 5);
        const hSeed = p.sp && p.sp.id ? [...String(p.sp.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) : p.i * 7 + p.t * 3;
        const skinCol = SKIN2D[hSeed % SKIN2D.length], hairCol = HAIR2D[(hSeed >> 3) % HAIR2D.length];
        const shirt = p.pos === 'GK' ? (tm.gk || '#7cb342') : tm.shirt;
        const shorts = p.pos === 'GK' ? '#1e242b' : (tm.shorts || '#ffffff');
        const socks = p.pos === 'GK' ? (tm.gk || '#7cb342') : (tm.socks || shirt);
        const [fx, fy] = this.vertical ? [p.fy, -p.fx] : [p.fx, p.fy];
        // Ground shadow
        g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.ellipse(x + R * 0.15, y + R * 0.82, R * 0.95, R * 0.45, 0, 0, 7); g.fill();
        // Articulated legs, socks & boots
        [-1, 1].forEach(side => {
          const lx = x + side * R * 0.32 + fx * stride * side * R * 0.32;
          const ly = y + R * 0.48 + fy * stride * side * R * 0.22;
          // Thigh skin
          g.strokeStyle = skinCol; g.lineWidth = R * 0.34; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x + side * R * 0.26, y + R * 0.15); g.lineTo(lx, ly); g.stroke();
          // Sock
          g.strokeStyle = socks; g.lineWidth = R * 0.32;
          g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx, ly + R * 0.25); g.stroke();
          // Boot
          g.fillStyle = '#181818'; g.beginPath(); g.ellipse(lx + fx * R * 0.12, ly + R * 0.28, R * 0.22, R * 0.14, 0, 0, 7); g.fill();
        });
        // Shorts
        g.fillStyle = shorts;
        g.beginPath(); g.roundRect ? g.roundRect(x - R * 0.56, y - R * 0.05, R * 1.12, R * 0.44, R * 0.16) : g.rect(x - R * 0.56, y - R * 0.05, R * 1.12, R * 0.44); g.fill();
        // Swinging human arms & hands
        [-1, 1].forEach(side => {
          const ax0 = x + side * R * 0.68, ay0 = y - R * 0.42;
          const ax1 = ax0 - fx * stride * side * R * 0.28 + side * R * 0.12;
          const ay1 = ay0 + R * 0.38 - fy * stride * side * R * 0.2;
          g.strokeStyle = skinCol; g.lineWidth = R * 0.28; g.lineCap = 'round';
          g.beginPath(); g.moveTo(ax0, ay0); g.lineTo(ax1, ay1); g.stroke();
          g.strokeStyle = shirt; g.lineWidth = R * 0.34;
          g.beginPath(); g.moveTo(ax0, ay0); g.lineTo((ax0 + ax1) * 0.5, (ay0 + ay1) * 0.5); g.stroke();
          g.fillStyle = p.pos === 'GK' ? '#f5f5f5' : skinCol;
          g.beginPath(); g.arc(ax1, ay1, R * 0.16, 0, 7); g.fill();
        });
        // Athletic torso (jersey)
        g.fillStyle = shirt;
        g.beginPath();
        g.moveTo(x - R * 0.68, y - R * 0.55);
        g.lineTo(x + R * 0.68, y - R * 0.55);
        g.lineTo(x + R * 0.52, y + R * 0.08);
        g.lineTo(x - R * 0.52, y + R * 0.08);
        g.closePath();
        g.fill();
        g.lineWidth = 1.2 * dpr; g.strokeStyle = 'rgba(0,0,0,.45)'; g.stroke();
        // Jersey number
        g.fillStyle = KK.colorDist(shirt, '#ffffff') < 200 ? '#111' : '#fff';
        g.font = `900 ${Math.round(R * 0.58)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(p.i === 0 ? 1 : p.i + 1), x, y - R * 0.24);
        // Human neck & head with hair and facial orientation
        const hx = x + fx * R * 0.14, hy = y - R * 0.88 + fy * R * 0.08;
        g.fillStyle = skinCol;
        g.beginPath(); g.arc(hx, hy, R * 0.44, 0, 7); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = dpr; g.stroke();
        // Eyes facing play direction
        const ex = hx + fx * R * 0.18, ey = hy + fy * R * 0.14;
        g.fillStyle = '#151515';
        g.beginPath(); g.arc(ex - fy * R * 0.13, ey + fx * R * 0.13, R * 0.065, 0, 7);
        g.arc(ex + fy * R * 0.13, ey - fx * R * 0.13, R * 0.065, 0, 7); g.fill();
        // Hairstyle crown
        if ((hSeed >> 5) % 6 !== 5) {
          g.fillStyle = hairCol;
          g.beginPath();
          g.arc(hx - fx * R * 0.08, hy - R * 0.08 - fy * R * 0.06, R * 0.43, Math.PI * 0.85, Math.PI * 2.15);
          g.fill();
        }
        if (p.stun > 0) { g.fillStyle = '#fff'; g.font = `${Math.round(R * 0.9)}px Arial`; g.fillText('✶', x + R, y - R); }
      }
      if (this.ctrl) {
        const p = this.ctrl, [x, y] = this.toScreen(p.x, p.y);
        g.fillStyle = '#00e676'; g.beginPath(); g.moveTo(x, y - R * 1.48); g.lineTo(x - R * 0.52, y - R * 2.25); g.lineTo(x + R * 0.52, y - R * 2.25); g.closePath(); g.fill();
        g.font = `bold ${Math.round(11 * dpr)}px Arial`; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3 * dpr; const nm = p.sp.name.split(' ').pop();
        g.strokeText(nm, x, y - R * 2.85); g.fillText(nm, x, y - R * 2.85);
        g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x - R * 1.2, y + R * 1.15, R * 2.4, 3 * dpr); g.fillStyle = p.stam > 0.3 ? '#00e676' : '#ff5252'; g.fillRect(x - R * 1.2, y + R * 1.15, R * 2.4 * p.stam, 3 * dpr);
        if (this.input.shootDown && this.ball.owner === p) { const pw = Math.min(this.input.shootT, 0.6) / 0.6; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x - R * 1.2, y + R * 1.15 + 4 * dpr, R * 2.4, 4 * dpr); g.fillStyle = '#ff9100'; g.fillRect(x - R * 1.2, y + R * 1.15 + 4 * dpr, R * 2.4 * pw, 4 * dpr); }
      }
      // ball
      const [bx, by] = this.toScreen(b.x, b.y), br = Math.max(3 * dpr, 0.5 * s), lift = b.z * s * 0.5;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(bx + br * 0.4, by + br * 0.5, br, br * 0.6, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by - lift, br * (1 + b.z * 0.08), 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 1 * dpr; g.stroke();
      g.fillStyle = '#222'; g.beginPath(); g.arc(bx + Math.cos(b.spin) * br * 0.4, by - lift + Math.sin(b.spin) * br * 0.4, br * 0.35, 0, 7); g.fill();
      this.drawRadar();
      this.drawBanners();
    }
    drawOverlay3D() {
      const p = this.ctrl; if (!p) return;
      const g = this.g, dpr = this.dpr, b = this.ball, r3 = this.r3;
      // 1. DLS Under-foot player ring + directional arrow at ground level
      const foot = r3.project(p.x, p.y, 0.02);
      if (foot) {
        const fx = foot[0] * dpr, fy = foot[1] * dpr;
        const ringCol = this.sprinting() ? '#00e5ff' : (b.owner === p ? '#00e676' : '#ffd600');
        g.save();
        g.strokeStyle = ringCol;
        g.lineWidth = 2.6 * dpr;
        g.fillStyle = this.sprinting() ? 'rgba(0,229,255,0.16)' : 'rgba(0,230,118,0.16)';
        g.beginPath();
        g.ellipse(fx, fy, 18 * dpr, 8.5 * dpr, 0, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        // Inner stamina ring arc
        g.strokeStyle = p.stam > 0.35 ? '#ffffffcc' : '#ff5252';
        g.lineWidth = 1.6 * dpr;
        g.beginPath();
        g.ellipse(fx, fy, 14 * dpr, 6.5 * dpr, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.stam);
        g.stroke();
        // Directional aim chevron in front of foot ring
        const fwd = r3.project(p.x + p.fx * 1.15, p.y + p.fy * 1.15, 0.02);
        if (fwd) {
          const ang = Math.atan2(fwd[1] * dpr - fy, fwd[0] * dpr - fx);
          const cx = fx + Math.cos(ang) * 22 * dpr, cy = fy + Math.sin(ang) * 10.5 * dpr;
          g.fillStyle = ringCol;
          g.beginPath();
          g.moveTo(cx + Math.cos(ang) * 6 * dpr, cy + Math.sin(ang) * 6 * dpr);
          g.lineTo(cx + Math.cos(ang + 2.3) * 5 * dpr, cy + Math.sin(ang + 2.3) * 5 * dpr);
          g.lineTo(cx + Math.cos(ang - 2.3) * 5 * dpr, cy + Math.sin(ang - 2.3) * 5 * dpr);
          g.closePath();
          g.fill();
        }
        g.restore();
      }
      // Pass target ring in DLS style
      if (b.passTo && b.passTo !== p) {
        const tf = r3.project(b.passTo.x, b.passTo.y, 0.02);
        if (tf) {
          g.save();
          g.strokeStyle = 'rgba(0, 229, 255, 0.85)';
          g.lineWidth = 2 * dpr;
          g.setLineDash([4 * dpr, 3 * dpr]);
          g.beginPath();
          g.ellipse(tf[0] * dpr, tf[1] * dpr, 15 * dpr, 7 * dpr, 0, 0, Math.PI * 2);
          g.stroke();
          g.restore();
        }
      }
      // 2. DLS Broadcast Nameplates & Stamina / Power Bars
      const set = new Set([p]); if (b.owner) set.add(b.owner); if (b.passTo) set.add(b.passTo);
      const near = this.ents.filter(e => !set.has(e)).sort((a, c) => hyp(a.x - b.x, a.y - b.y) - hyp(c.x - b.x, c.y - b.y));
      for (const e of near) { if (set.size >= 4 || hyp(e.x - b.x, e.y - b.y) > 14) break; set.add(e); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const placed = [];
      for (const e of set) {
        const top = r3.project(e.x, e.y, 2.25); if (!top) continue;
        const isCtrl = e === p;
        g.font = `${isCtrl ? '800' : '700'} ${Math.round((isCtrl ? 11.5 : 10.5) * dpr)}px system-ui, -apple-system, Arial, sans-serif`;
        const nm = e.sp.name.split(' ').pop().toUpperCase();
        const x = top[0] * dpr, y = top[1] * dpr - (isCtrl ? 24 : 8) * dpr;
        const tw = g.measureText(nm).width, pw = tw + 14 * dpr, ph = (isCtrl ? 18 : 15) * dpr;
        if (placed.some(q => Math.abs(q[0] - x) < q[2] + pw / 2 && Math.abs(q[1] - y) < 16 * dpr)) continue;
        placed.push([x, y, pw / 2]);
        // DLS sleek angled pill background
        g.fillStyle = isCtrl ? 'rgba(6, 20, 46, 0.88)' : 'rgba(10, 18, 36, 0.68)';
        g.strokeStyle = isCtrl ? (e.t === 0 ? '#00e676' : '#ff5252') : 'rgba(255,255,255,0.25)';
        g.lineWidth = (isCtrl ? 1.5 : 1) * dpr;
        g.beginPath();
        if (g.roundRect) g.roundRect(x - pw / 2, y - ph / 2, pw, ph, 4 * dpr);
        else g.rect(x - pw / 2, y - ph / 2, pw, ph);
        g.fill(); g.stroke();
        g.fillStyle = isCtrl ? '#ffffff' : '#dce6f7';
        g.fillText(nm, x, y - (isCtrl ? 1.5 : 0) * dpr);
        // Integrated stamina bar inside controlled player's pill
        if (isCtrl) {
          const bw = pw - 8 * dpr, bx0 = x - bw / 2, by0 = y + ph / 2 - 3.5 * dpr;
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.fillRect(bx0, by0, bw, 2.2 * dpr);
          g.fillStyle = e.stam > 0.45 ? '#00e676' : e.stam > 0.25 ? '#ffd600' : '#ff5252';
          g.fillRect(bx0, by0, bw * e.stam, 2.2 * dpr);
        }
      }
      // DLS floating triangular pointer over controlled player
      const top = r3.project(p.x, p.y, 2.25); if (!top) return;
      const x = top[0] * dpr, y = top[1] * dpr - 4 * dpr, rr = 6 * dpr;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - rr, y - rr * 1.45);
      g.lineTo(x + rr, y - rr * 1.45);
      g.closePath();
      g.fillStyle = this.sprinting() ? '#00e5ff' : '#00e676';
      g.fill();
      g.lineWidth = 1.4 * dpr; g.strokeStyle = '#06142e'; g.stroke();
      // DLS Shot Power Bar above controlled player when charging kick
      if (this.input.shootDown && b.owner === p) {
        const pw = Math.min(this.input.shootT, 0.6) / 0.6;
        const w = 44 * dpr, h = 6 * dpr, px0 = x - w / 2, py0 = y - 38 * dpr;
        g.fillStyle = 'rgba(6, 20, 46, 0.9)';
        g.strokeStyle = '#ffffffaa';
        g.lineWidth = 1.2 * dpr;
        g.fillRect(px0, py0, w, h);
        g.strokeRect(px0, py0, w, h);
        const grad = g.createLinearGradient(px0, 0, px0 + w, 0);
        grad.addColorStop(0, '#00e676');
        grad.addColorStop(0.6, '#ffd600');
        grad.addColorStop(1, '#ff1744');
        g.fillStyle = grad;
        g.fillRect(px0 + dpr, py0 + dpr, (w - 2 * dpr) * pw, h - 2 * dpr);
      }
    }
    drawBanners() {
      const g = this.g, cv = this.cv, dpr = this.dpr;
      if (this.state === 'replay') {
        const x = cv.width / 2, y = 58 * dpr;
        g.fillStyle = 'rgba(6, 20, 46, 0.92)';
        g.strokeStyle = '#00e5ff';
        g.lineWidth = 2 * dpr;
        g.fillRect(x - 95 * dpr, y - 16 * dpr, 190 * dpr, 32 * dpr);
        g.strokeRect(x - 95 * dpr, y - 16 * dpr, 190 * dpr, 32 * dpr);
        g.fillStyle = '#ff1744';
        g.beginPath(); g.arc(x - 74 * dpr, y, 5 * dpr, 0, Math.PI * 2); g.fill();
        g.font = `italic 900 ${Math.round(15 * dpr)}px Arial Black, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
        g.fillText('ACTION REPLAY', x + 8 * dpr, y);
        g.font = `700 ${Math.round(11 * dpr)}px system-ui, Arial`; g.fillStyle = '#00e5ff';
        g.fillText((this.replayData && this.replayData.name ? '⚽ ' + this.replayData.name + '  ·  ' : '') + 'TAP ANY BUTTON TO SKIP', x, y + 26 * dpr);
      }
      if (this.cardShow && this.cardShow.T > 0) {
        const c = this.cardShow; c.T -= this.frameDt || 0.016; const x = cv.width / 2, y = cv.height * 0.2;
        g.save(); g.translate(x - 60 * dpr, y); g.rotate(-0.12); g.fillStyle = c.c === 'Y' ? '#ffd600' : '#e53935'; g.strokeStyle = '#000'; g.lineWidth = 2 * dpr; g.fillRect(-12 * dpr, -17 * dpr, 24 * dpr, 34 * dpr); g.strokeRect(-12 * dpr, -17 * dpr, 24 * dpr, 34 * dpr); g.restore();
        g.font = `bold ${Math.round(14 * dpr)}px Arial`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineWidth = 4 * dpr; g.strokeStyle = 'rgba(0,0,0,.75)';
        const t2 = c.name.split(' ').pop() + (c.c === 'Y' ? ' · Yellow card' : ' · Sent off'); g.strokeText(t2, x - 40 * dpr, y); g.fillStyle = '#fff'; g.fillText(t2, x - 40 * dpr, y);
      }
      if (this.banner || (this.flashT > 0 && this.flashTxt)) {
        const txt = this.banner || this.flashTxt, big = !!this.banner;
        const y = cv.height * (big ? 0.36 : 0.28);
        if (big) {
          // DLS Broadcast ribbon backdrop
          const bw = 280 * dpr, bh = (this.state === 'goal' && this.goalName ? 76 : 52) * dpr;
          const gr = g.createLinearGradient(cv.width / 2 - bw / 2, y - 26 * dpr, cv.width / 2 + bw / 2, y + bh - 26 * dpr);
          gr.addColorStop(0, 'rgba(6, 20, 46, 0.0)');
          gr.addColorStop(0.18, 'rgba(6, 20, 46, 0.92)');
          gr.addColorStop(0.82, 'rgba(13, 38, 84, 0.92)');
          gr.addColorStop(1, 'rgba(6, 20, 46, 0.0)');
          g.fillStyle = gr;
          g.fillRect(cv.width / 2 - bw / 2, y - 26 * dpr, bw, bh);
          g.fillStyle = txt === 'GOAL!' ? '#00e676' : '#00e5ff';
          g.fillRect(cv.width / 2 - bw * 0.35, y - 26 * dpr, bw * 0.7, 2.5 * dpr);
        }
        g.font = `italic 900 ${Math.round((big ? 42 : 22) * dpr)}px Arial Black, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 5 * dpr; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(txt, cv.width / 2, y);
        g.fillStyle = txt === 'GOAL!' ? '#00e676' : '#ffffff'; g.fillText(txt, cv.width / 2, y);
        if (this.state === 'goal' && this.goalName) { g.font = `800 ${Math.round(15 * dpr)}px system-ui, Arial`; g.lineWidth = 3 * dpr; g.strokeText('⚽ ' + this.goalName.toUpperCase(), cv.width / 2, y + 32 * dpr); g.fillStyle = '#ffd166'; g.fillText('⚽ ' + this.goalName.toUpperCase(), cv.width / 2, y + 32 * dpr); }
        if (this.state === 'kickoff' && this.ball.owner && this.ball.owner.t === 0) { g.font = `700 ${Math.round(12 * dpr)}px system-ui, Arial`; g.fillStyle = '#00e5ff'; g.fillText('TAP B (PASS) OR A (SHOOT) TO KICK OFF', cv.width / 2, y + 34 * dpr); }
      }
    }
    drawRadar() {
      const mc = this.cfg.mini;
      if (!mc || !mc.offsetWidth) return this.drawRadarOld();
      const r = mc.getBoundingClientRect(), dpr = this.dpr, wv = Math.round(r.width * dpr), hv = Math.round(r.height * dpr);
      if (mc.width !== wv || mc.height !== hv) { mc.width = wv; mc.height = hv; }
      const g = mc.getContext('2d'), vert = hv > wv, pad = 3 * dpr, rw = wv - 2 * pad, rh = hv - 2 * pad;
      g.clearRect(0, 0, wv, hv); g.fillStyle = 'rgba(20,60,30,.35)'; g.fillRect(0, 0, wv, hv);
      const map = (x, y) => vert ? [pad + y / W * rw, pad + (1 - x / L) * rh] : [pad + x / L * rw, pad + y / W * rh];
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1, dpr);
      const rect = (x0, y0, x1, y1) => { const [a, c] = map(x0, y0), [d, e] = map(x1, y1); g.strokeRect(Math.min(a, d), Math.min(c, e), Math.abs(d - a), Math.abs(e - c)); };
      rect(0, 0, L, W); rect(0, CY - BOX_H, BOX_D, CY + BOX_H); rect(L - BOX_D, CY - BOX_H, L, CY + BOX_H);
      const [m0x, m0y] = map(L / 2, 0), [m1x, m1y] = map(L / 2, W); g.beginPath(); g.moveTo(m0x, m0y); g.lineTo(m1x, m1y); g.stroke();
      const [cx, cy] = map(L / 2, CY); g.beginPath(); g.arc(cx, cy, 9.15 / L * (vert ? rh : rw), 0, 7); g.stroke();
      for (const p of this.ents) {
        const [x, y] = map(p.x, p.y), tm = this.teams[p.t];
        g.fillStyle = p.pos === 'GK' ? tm.gk : tm.shirt; g.beginPath(); g.arc(x, y, (p === this.ctrl ? 3.4 : 2.6) * dpr, 0, 7); g.fill();
        g.lineWidth = dpr; g.strokeStyle = p === this.ctrl ? '#35e06a' : 'rgba(0,0,0,.7)'; if (p === this.ctrl) g.lineWidth = 2 * dpr; g.stroke();
      }
      const [bx, by] = map(this.ball.x, this.ball.y); g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, 2 * dpr, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = dpr; g.stroke();
    }
    drawRadarOld() {
      const g = this.g, dpr = this.dpr, cv = this.cv;
      const rw = (this.vertical ? 56 : 92) * dpr, rh = (this.vertical ? 86 : 60) * dpr, x0 = cv.width - rw - 8 * dpr, y0 = (this.vertical ? 64 : 52) * dpr;
      g.fillStyle = 'rgba(0,40,0,.55)'; g.fillRect(x0, y0, rw, rh); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.strokeRect(x0, y0, rw, rh);
      const map = (x, y) => this.vertical ? [x0 + y / W * rw, y0 + (1 - x / L) * rh] : [x0 + x / L * rw, y0 + y / W * rh];
      for (const p of this.ents) { const [x, y] = map(p.x, p.y); g.fillStyle = p === this.ctrl ? '#ffeb3b' : this.teams[p.t].shirt; g.beginPath(); g.arc(x, y, 2.2 * dpr, 0, 7); g.fill(); }
      const [bx, by] = map(this.ball.x, this.ball.y); g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, 1.6 * dpr, 0, 7); g.fill();
    }
  }
  KK.Match = Match;
})();
