/* Kente Kickers — real-time top-down match engine (HTML5 canvas). */
'use strict';
(function () {
  const KK = window.KK;
  const L = 105, W = 68, GH = 3.66, CY = 34, BOX_D = 16.5, BOX_H = 20.16;
  const SPEED = 1.25, DT = 1 / 60;
  const clamp = KK.clamp, hyp = Math.hypot;
  const norm = (x, y) => { const d = hyp(x, y) || 1; return [x / d, y / d]; };
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
      this.teams = [cfg.my, cfg.opp].map((tm, t) => {
        const q = clamp((tm.rating - 40) / 50, 0, 1);
        return { ...tm, t, q, dir: t === 0 ? 1 : -1, goalX: t === 0 ? 0 : L };
      });
      this.ents = [];
      this.teams.forEach((tm, t) => {
        const slots = KK.FORMATIONS[tm.formation] || KK.FORMATIONS['4-4-2'];
        tm.players.forEach((sp, i) => {
          const s = slots[i];
          this.ents.push({ t, i, slot: s, pos: s[0], sp, x: 0, y: 0, vx: 0, vy: 0, fx: t === 0 ? 1 : -1, fy: 0, tackleCd: 0, kickCd: 0, stun: 0, dec: Math.random() * 0.4, stam: 1, lunge: 0, tgt: null });
        });
      });
      this.ball = { x: L / 2, y: CY, vx: 0, vy: 0, owner: null, last: 0, protect: 0, tried: new Set(), passTo: null, shot: false, z: 0, vz: 0, spin: 0 };
      this.input = { jx: 0, jy: 0, sprint: false, shootDown: false, shootT: 0, keys: new Set() };
      this.ctrl = null; this.switchCd = 0; this.cam = { x: L / 2, y: CY };
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
    maxSpeed(p) { return (5 + p.sp.stats.pac * 0.045) * SPEED * (p.pos === 'GK' ? 0.85 : 1); }
    homeSpot(p) {
      const tm = this.teams[p.t], b = this.ball, slot = p.slot;
      if (p.pos === 'GK') return null;
      const has = b.owner && b.owner.t === p.t, opp = b.owner && b.owner.t !== p.t;
      let depth = slot[1] + (has ? 0.1 : opp ? -0.04 : 0.03);
      let x = tm.goalX + tm.dir * depth * L + (b.x - L / 2) * 0.45;
      const minX = tm.goalX + tm.dir * 4, maxX = tm.goalX + tm.dir * (L * 0.92);
      x = tm.dir > 0 ? clamp(x, minX, maxX) : clamp(x, maxX, minX);
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
    pressTackle(down) {
      this.input.sprint = down;
      if (!down || this.state !== 'play') return;
      const p = this.ctrl, b = this.ball;
      if (b.owner && b.owner.t === 1) {
        const o = b.owner, d = hyp(o.x - p.x, o.y - p.y);
        p.lunge = 0.25;
        if (d < 2.4 && p.tackleCd <= 0) {
          p.tackleCd = 0.6;
          const prob = 0.58 + (p.sp.stats.def - (o.sp.stats.pac + o.sp.stats.pas) / 2) / 150;
          if (Math.random() < prob) { b.owner = p; b.last = 0; b.protect = 0.5; o.stun = 0.5; KK.sfx.tackle(); this.flash('TACKLE!'); }
          else { p.stun = 0.4; }
        }
      }
    }
    // ---------- actions ----------
    passNoise(p) { const tm = this.teams[p.t]; return (1 - p.sp.stats.pas / 110) * 0.16 * (p.t === 0 ? 0.8 : 1.35 - 0.6 * tm.q); }
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
      const d = hyp(r.x - p.x, r.y - p.y), sp = clamp(11 + d * 0.65, 13, 27), t = d / sp;
      const tx = r.x + r.vx * t * 0.7, ty = r.y + r.vy * t * 0.7;
      this.kickTo(p, tx, ty, sp, this.passNoise(p), r);
      if (p.t === 0) { this.ctrl = r; this.switchCd = 0.4; }
    }
    kickTo(p, tx, ty, speed, noise, recv, shot) {
      const b = this.ball; let [dx, dy] = norm(tx - p.x, ty - p.y);
      const a = (Math.random() * 2 - 1) * noise, c = Math.cos(a), s = Math.sin(a);
      [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
      b.owner = null; b.vx = dx * speed; b.vy = dy * speed; b.x = p.x + dx * 1.0; b.y = p.y + dy * 1.0;
      b.last = p.t; b.lastKicker = p; b.tried = new Set([p]); b.passTo = recv; b.shot = !!shot; b.shotT = p.t;
      b.vz = shot ? 2 + Math.random() * 3 : (speed > 22 ? 3 : 0); b.z = 0.01;
      p.kickCd = 0.35;
      if (shot) KK.sfx.kick(1); else KK.sfx.pass();
    }
    shoot(p, ty, power) {
      const tm = this.teams[p.t], gx = tm.goalX === 0 ? L : 0;
      const d = hyp(gx - p.x, CY - p.y);
      const noise = ((1 - p.sp.stats.sho / 110) * 0.13 + d / 40 * 0.05) * (p.t === 0 ? 0.9 : 1.3 - 0.5 * tm.q) * (0.8 + power * 0.25);
      this.kickTo(p, gx, ty, (21 + p.sp.stats.sho * 0.12) * power, noise, null, true);
    }
    startPlay() { if (this.state === 'kickoff') { this.state = 'play'; this.banner = ''; KK.sfx.whistle(1); } }
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
      if (this.state === 'kickoff') { this.stateT -= dt; if (this.stateT <= 0) this.startPlay(); this.camFollow(dt); return; }
      if (this.state === 'goal' || this.state === 'half' || this.state === 'restart') {
        this.stateT -= dt; this.ents.forEach(p => { p.vx *= 0.9; p.vy *= 0.9; p.x += p.vx * dt; p.y += p.vy * dt; });
        if (this.state !== 'restart') this.ballPhysics(dt, true);
        if (this.stateT <= 0) { const f = this.after; this.after = null; f && f(); }
        this.camFollow(dt); return;
      }
      if (this.state === 'end') { this.stateT -= dt; if (this.stateT <= 0 && !this.ended) { this.ended = true; this.cfg.onEnd && this.cfg.onEnd(this.result()); } return; }
      // clock
      this.elapsed += dt;
      if (this.half === 1 && this.elapsed >= this.total / 2) { this.half = 2; this.elapsed = this.total / 2; KK.sfx.whistle(2); this.state = 'half'; this.banner = 'HALF TIME'; this.stateT = 2; this.after = () => this.kickoff(1); return; }
      if (this.elapsed >= this.total) { this.elapsed = this.total; this.state = 'end'; this.stateT = 2.4; this.banner = 'FULL TIME'; KK.sfx.whistle(3); return; }
      b.protect -= dt;
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
        const nCh = t === 0 ? 1 : (b.owner ? 2 : 1);
        list.slice(0, nCh).forEach(p => this.chasers[t].add(p));
      }
      for (const p of this.ents) this.think(p, dt);
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
      p.tackleCd -= dt; p.kickCd -= dt; p.lunge -= dt;
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
      const h = this.homeSpot(p); this.moveToward(p, h[0], h[1], 0.75, dt);
      if (b.owner && b.owner.t !== p.t && hyp(b.owner.x - p.x, b.owner.y - p.y) < 1.8) this.aiTackle(p);
    }
    aiTackle(p) {
      const b = this.ball, o = b.owner; if (!o || p.tackleCd > 0 || b.protect > 0) return;
      if (hyp(o.x - p.x, o.y - p.y) > 1.7) return;
      const tm = this.teams[p.t];
      let prob = 0.28 + (p.sp.stats.def - (o.sp.stats.pac + o.sp.stats.pas) / 2) / 180 + tm.q * 0.15;
      if (o.t === 0) prob *= 0.85;
      p.tackleCd = 0.9 + Math.random() * 0.5;
      if (Math.random() < prob) {
        b.owner = null; const [dx, dy] = norm(p.x - o.x + (Math.random() - 0.5), p.y - o.y + (Math.random() - 0.5));
        b.vx = -dx * 3 + p.vx * 0.3; b.vy = -dy * 3 + p.vy * 0.3; b.last = p.t; b.tried = new Set([o]); b.passTo = null; b.shot = false;
        o.stun = 0.45; KK.sfx.tackle();
      } else p.stun = 0.35;
    }
    userMove(p, dt) {
      const b = this.ball, [dx, dy, m] = this.inputVec();
      if (m < 0.15 && !b.owner && b.passTo === p) {
        const [ux, uy] = norm(b.vx, b.vy), s = Math.max(0, (p.x - b.x) * ux + (p.y - b.y) * uy);
        return this.moveToward(p, b.x + ux * s, b.y + uy * s, 1, dt);
      }
      const sprint = this.input.sprint && p.stam > 0.05;
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
      const ty = CY + clamp((b.y - CY) * 0.2, -GH + 0.5, GH - 0.5), tx = gx + dir * (1.2 + clamp(Math.abs(b.x - gx) / 30, 0, 1) * 3);
      this.moveToward(p, tx, ty, 0.8, dt);
    }
    ownerThink(p, dt) {
      const b = this.ball, tm = this.teams[p.t], gx = tm.goalX === 0 ? L : 0, dir = tm.dir;
      p.dec -= dt;
      let np = 99, nOpp = null; for (const e of this.ents) if (e.t !== p.t) { const d = hyp(e.x - p.x, e.y - p.y); if (d < np) { np = d; nOpp = e; } }
      const dg = hyp(gx - p.x, CY - p.y);
      if (p.dec <= 0) {
        p.dec = 0.45 - 0.25 * tm.q + Math.random() * 0.25;
        const range = 18 + p.sp.stats.sho / 10;
        if (dg < range && Math.abs(p.y - CY) < dg * 0.85 && Math.random() < 0.35 + tm.q * 0.35 + (dg < 12 ? 0.3 : 0)) {
          return this.shoot(p, CY + (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 2.3), 0.9 + Math.random() * 0.12);
        }
        const wantPass = (np < 3.4 && Math.random() < 0.6) || Math.random() < 0.1;
        if (wantPass) {
          let best = null, bs = -1e9;
          for (const m of this.ents) {
            if (m.t !== p.t || m === p || m.pos === 'GK') continue;
            const d = hyp(m.x - p.x, m.y - p.y); if (d < 5 || d > 35) continue;
            const s = (m.x - p.x) * dir * 0.5 + this.openness(p, m) * 2.2 - d * 0.08 + Math.random() * 2.5;
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
      if (sp > 0) { const ns = Math.max(0, sp - (sp * 0.55 + 1.6) * dt); b.vx *= ns / sp; b.vy *= ns / sp; }
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
        if (d > reach || b.z > (isGK ? 2.6 : 1.4)) continue;
        if (sp < 12 && !isGK) { this.take(p); break; }
        b.tried.add(p);
        let chance = isGK ? 0.5 + p.sp.rating / 220 - Math.max(0, sp - 18) / 45 : 0.32 + p.sp.stats.def / 300 - sp / 90;
        if (isGK && b.shot && b.shotT === p.t) chance = 1;
        if (sp < 12) chance = 1;
        if (Math.random() < chance) {
          if (isGK && sp > 20 && Math.random() < 0.4) { // parry
            b.vx = -b.vx * 0.35 + (Math.random() - 0.5) * 4; b.vy = b.vy * 0.4 + (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 5); b.last = p.t; b.shot = false; KK.sfx.tackle(); this.flash('SAVE!'); break;
          }
          if (isGK && b.shot && b.shotT !== p.t) this.flash('SAVE!');
          this.take(p); break;
        }
      }
    }
    take(p) { const b = this.ball; b.owner = p; b.last = p.t; b.protect = 0.4; b.passTo = null; b.shot = false; b.z = 0; b.vz = 0; if (p.t === 0) this.ctrl = p; }
    restart(t, x, y, label, gk) {
      const b = this.ball; this.state = 'restart'; this.stateT = 0.9; this.flash(label);
      b.vx = b.vy = 0; b.owner = null; b.x = clamp(x, 0.3, L - 0.3); b.y = clamp(y, 0.3, W - 0.3); b.z = 0;
      this.after = () => {
        const p = gk ? this.ents.find(e => e.t === t && e.pos === 'GK') : this.nearestTo(t, b.x, b.y, true);
        p.x = b.x - this.teams[t].dir * 0.5; p.y = b.y; p.vx = p.vy = 0;
        // push opponents away
        this.ents.forEach(e => { if (e.t !== t) { const d = hyp(e.x - b.x, e.y - b.y); if (d < 6) { const [ux, uy] = norm(e.x - b.x || 1, e.y - b.y); e.x = b.x + ux * 6; e.y = clamp(b.y + uy * 6, 0, W); } } });
        this.take(p); b.protect = 1.2; this.state = 'play';
      };
    }
    goal(t) {
      const b = this.ball; this.score[t]++; const k = b.lastKicker;
      const scorer = k && k.t === t ? k : null;
      const name = scorer ? scorer.sp.name : 'Own goal';
      if (t === 0 && scorer) this.scorers.push(scorer.sp.id);
      this.events.push({ t, min: this.minute(), name });
      this.state = 'goal'; this.stateT = 2.6; this.banner = 'GOAL!'; this.goalName = name + ' ' + this.minute() + "'"; this.goalTeam = t;
      b.vx *= 0.3; b.vy *= 0.3; b.x = clamp(b.x, -1.5, L + 1.5);
      KK.sfx.whistle(1); if (t === 0) KK.sfx.cheer(); else KK.sfx.groan();
      this.after = () => { this.goalName = ''; this.kickoff(1 - t); };
      if (this.cfg.onGoal) this.cfg.onGoal(t, name);
    }
    minute() { return Math.min(90, Math.floor(this.elapsed / this.total * 90) + 1); }
    result() { return { my: this.score[0], opp: this.score[1], scorers: this.scorers, events: this.events }; }
    simRest() {
      const left = 1 - this.elapsed / this.total; const r0 = this.teams[0].rating, r1 = this.teams[1].rating;
      const [a, c] = KK.simScore(r0, r1);
      const g0 = Math.round(a * left), g1 = Math.round(c * left);
      const fw = this.ents.filter(e => e.t === 0 && e.pos !== 'GK');
      for (let i = 0; i < g0; i++) { const s = fw[Math.floor(Math.random() * fw.length)]; this.scorers.push(s.sp.id); this.events.push({ t: 0, min: '-', name: s.sp.name }); }
      this.score[0] += g0; this.score[1] += g1; this.elapsed = this.total; this.state = 'end'; this.stateT = 0.01; this.paused = false;
    }
    substitute(slot, sp) { const e = this.ents.find(x => x.t === 0 && x.i === slot); e.sp = sp; }
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
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#1d4d24'; g.fillRect(0, 0, cv.width, cv.height);
      this.worldTransform();
      // stands area
      g.fillStyle = '#2a2f3a'; g.fillRect(-12, -12, L + 24, 5); g.fillRect(-12, W + 7, L + 24, 5);
      for (let i = 0; i < 70; i++) { g.fillStyle = ['#e53935', '#fdd835', '#43a047', '#fff', '#1e88e5'][i % 5]; g.fillRect(-10 + i * 1.8, -10.5 + (i % 3) * 0.7, 0.7, 0.7); g.fillRect(-10 + i * 1.8, W + 8 + (i % 3) * 0.7, 0.7, 0.7); }
      // grass
      for (let i = 0; i < 20; i++) { g.fillStyle = i % 2 ? '#2e7d32' : '#348a38'; g.fillRect(i * L / 20, 0, L / 20 + 0.02, W); }
      g.fillStyle = '#2b7330'; g.fillRect(-4, -4, L + 8, 4); g.fillRect(-4, W, L + 8, 4); g.fillRect(-4, 0, 4, W); g.fillRect(L, 0, 4, W);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 0.18;
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
        g.lineWidth = 0.18; g.strokeStyle = 'rgba(255,255,255,.85)';
      });
      g.fillStyle = '#fff'; g.beginPath(); g.arc(L / 2, CY, 0.25, 0, 7); g.fill();
      g.setTransform(1, 0, 0, 1, 0, 0);
      // entities in screen space
      const R = 0.95 * s, b = this.ball;
      const sorted = this.ents.slice().sort((a, c) => this.toScreen(a.x, a.y)[1] - this.toScreen(c.x, c.y)[1]);
      if (this.ctrl) { const [x, y] = this.toScreen(this.ctrl.x, this.ctrl.y); g.fillStyle = 'rgba(255,235,59,.35)'; g.strokeStyle = '#ffeb3b'; g.lineWidth = 2 * dpr; g.beginPath(); g.ellipse(x, y + R * 0.6, R * 1.6, R * 0.9, 0, 0, 7); g.fill(); g.stroke(); }
      for (const p of sorted) {
        const [x, y] = this.toScreen(p.x, p.y), tm = this.teams[p.t];
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + R * 0.3, y + R * 0.7, R, R * 0.5, 0, 0, 7); g.fill();
        const shirt = p.pos === 'GK' ? tm.gk : tm.shirt;
        g.fillStyle = tm.shorts; g.beginPath(); g.arc(x, y + R * 0.2, R * 0.9, 0, 7); g.fill();
        g.fillStyle = shirt; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
        g.lineWidth = 1.5 * dpr; g.strokeStyle = 'rgba(0,0,0,.55)'; g.stroke();
        // facing nub
        const [fx, fy] = this.vertical ? [p.fy, -p.fx] : [p.fx, p.fy];
        g.fillStyle = '#f5d0a9'; g.beginPath(); g.arc(x + fx * R * 0.55, y + fy * R * 0.55, R * 0.38, 0, 7); g.fill();
        g.fillStyle = KK.colorDist(shirt, '#ffffff') < 200 ? '#111' : '#fff'; g.font = `bold ${Math.round(R * 0.85)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(p.i === 0 ? 1 : p.i + 1), x - fx * R * 0.15, y - fy * R * 0.15 + 1);
        if (p.stun > 0) { g.fillStyle = '#fff'; g.font = `${Math.round(R)}px Arial`; g.fillText('✶', x + R, y - R); }
      }
      if (this.ctrl) {
        const p = this.ctrl, [x, y] = this.toScreen(p.x, p.y);
        g.fillStyle = '#ffeb3b'; g.beginPath(); g.moveTo(x, y - R * 1.5); g.lineTo(x - R * 0.6, y - R * 2.4); g.lineTo(x + R * 0.6, y - R * 2.4); g.fill();
        g.font = `bold ${Math.round(11 * dpr)}px Arial`; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3 * dpr; const nm = p.sp.name.split(' ').pop();
        g.strokeText(nm, x, y - R * 3.1); g.fillText(nm, x, y - R * 3.1);
        // stamina + shot power
        g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x - R * 1.2, y + R * 1.5, R * 2.4, 3 * dpr); g.fillStyle = p.stam > 0.3 ? '#76ff03' : '#ff5252'; g.fillRect(x - R * 1.2, y + R * 1.5, R * 2.4 * p.stam, 3 * dpr);
        if (this.input.shootDown && this.ball.owner === p) { const pw = Math.min(this.input.shootT, 0.6) / 0.6; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x - R * 1.2, y + R * 1.5 + 5 * dpr, R * 2.4, 4 * dpr); g.fillStyle = '#ff9800'; g.fillRect(x - R * 1.2, y + R * 1.5 + 5 * dpr, R * 2.4 * pw, 4 * dpr); }
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
      const g = this.g, dpr = this.dpr, top = this.r3.project(p.x, p.y, 3.2), foot = this.r3.project(p.x, p.y, 0);
      if (!top || !foot) return;
      const x = top[0] * dpr, y = top[1] * dpr, fx = foot[0] * dpr, fy = foot[1] * dpr, w = 34 * dpr;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `bold ${Math.round(12 * dpr)}px Arial`; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3 * dpr; const nm = p.sp.name.split(' ').pop();
      g.strokeText(nm, x, y - 8 * dpr); g.fillText(nm, x, y - 8 * dpr);
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(fx - w / 2, fy + 8 * dpr, w, 3 * dpr); g.fillStyle = p.stam > 0.3 ? '#76ff03' : '#ff5252'; g.fillRect(fx - w / 2, fy + 8 * dpr, w * p.stam, 3 * dpr);
      if (this.input.shootDown && this.ball.owner === p) { const pw = Math.min(this.input.shootT, 0.6) / 0.6; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(fx - w / 2, fy + 13 * dpr, w, 4 * dpr); g.fillStyle = '#ff9800'; g.fillRect(fx - w / 2, fy + 13 * dpr, w * pw, 4 * dpr); }
    }
    drawBanners() {
      const g = this.g, cv = this.cv, dpr = this.dpr;
      if (this.banner || (this.flashT > 0 && this.flashTxt)) {
        const txt = this.banner || this.flashTxt, big = !!this.banner;
        g.font = `900 ${Math.round((big ? 44 : 22) * dpr)}px Arial Black, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const y = cv.height * (big ? 0.38 : 0.3);
        g.lineWidth = 6 * dpr; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(txt, cv.width / 2, y);
        g.fillStyle = txt === 'GOAL!' ? '#ffeb3b' : '#fff'; g.fillText(txt, cv.width / 2, y);
        if (this.state === 'goal' && this.goalName) { g.font = `bold ${Math.round(16 * dpr)}px Arial`; g.lineWidth = 4 * dpr; g.strokeText('⚽ ' + this.goalName, cv.width / 2, y + 38 * dpr); g.fillStyle = '#fff'; g.fillText('⚽ ' + this.goalName, cv.width / 2, y + 38 * dpr); }
        if (this.state === 'kickoff' && this.ball.owner && this.ball.owner.t === 0) { g.font = `bold ${Math.round(13 * dpr)}px Arial`; g.fillStyle = '#fff'; g.fillText('Tap PASS or SHOOT to start', cv.width / 2, y + 34 * dpr); }
      }
    }
    drawRadar() {
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
