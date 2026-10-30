/* Kente Kickers — club progression: Gold Kente, club level, objectives, achievements, player cards, kits */
'use strict';
(function () {
  const KK = window.KK;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const M = KK.meta = {};

  // ---------- save upgrade ----------
  M.ensure = function (s) {
    if (!s) return s;
    if (s.gold == null) s.gold = 0;
    if (s.xp == null) s.xp = 0;
    s.ach = s.ach || {};
    s.stats = s.stats || { wins: 0, goals: 0, played: 0, clean: 0, motm: 0 };
    const k = s.team.kit;
    if (!k.socks) k.socks = k.shirt;
    if (!k.pattern) k.pattern = 'plain';
    if (!k.c2) k.c2 = s.team.crest.c2;
    if (!s.team.away) s.team.away = { shirt: KK.colorDist(k.shirt, '#ffffff') < 150 ? '#111111' : '#ffffff', shorts: k.shirt, socks: '#ffffff', pattern: 'plain', c2: k.shirt };
    s.unlocks = s.unlocks || {};
    s.story = s.story || { seen: false };
    s.players.forEach(p => { if (p.fit == null) p.fit = 100; if (!p.nat) p.nat = 'gh'; });
    if (!s.obj || s.obj.y !== s.season.year) M.newObjectives(s);
    return s;
  };

  // ---------- club level ----------
  M.levelInfo = function (s) {
    let lv = 1, need = 120, xp = s.xp || 0;
    while (xp >= need) { xp -= need; lv++; need = 120 + (lv - 1) * 60; }
    return { lv, cur: xp, need };
  };

  // ---------- nationality ----------
  M.natInfo = function (nat) {
    if (!nat || nat === 'gh') return { name: 'Ghana', flag: KK.GHANA_FLAG };
    const c = (KK.COUNTRIES || []).find(x => String(x.style || '').split('|').includes(nat));
    return c ? { name: c.name, flag: c.flag } : { name: 'Ghana', flag: KK.GHANA_FLAG };
  };
  M.stars = r => clamp(Math.round(((r - 38) / 11) * 2) / 2, 0.5, 5);
  M.starsHTML = function (r) {
    const n = M.stars(r); let h = '';
    for (let i = 1; i <= 5; i++) h += `<span class="st ${n >= i ? 'on' : n >= i - 0.5 ? 'half' : ''}">★</span>`;
    return `<span class="stars">${h}</span>`;
  };
  M.six = function (p) {
    const s = p.stats; return [['PAC', s.pac], ['SHO', s.sho], ['PAS', s.pas], ['DRI', Math.round((s.pac + s.pas) / 2 + (p.pos === 'FW' ? 3 : 0))], ['DEF', s.def], ['PHY', Math.round((s.def + s.pac) / 2 + (p.pos === 'DF' ? 3 : 0))]].map(([k, v]) => [k, clamp(v, 1, 99)]);
  };
  M.radarSVG = function (p, size = 170, col = '#fdd835') {
    const st = M.six(p), c = size / 2, R = size * 0.36, pt = (i, f) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [c + Math.cos(a) * R * f, c + Math.sin(a) * R * f]; };
    const ring = f => st.map((_, i) => pt(i, f).map(v => v.toFixed(1)).join(',')).join(' ');
    const poly = st.map(([, v], i) => pt(i, v / 99).map(x => x.toFixed(1)).join(',')).join(' ');
    const labels = st.map(([k, v], i) => { const [x, y] = pt(i, 1.28); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="${size * 0.068}" font-weight="800" fill="#dfe8ff">${k} <tspan fill="${col}">${v}</tspan></text>`; }).join('');
    return `<svg class="radar" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${[1, 0.75, 0.5, 0.25].map(f => `<polygon points="${ring(f)}" fill="${f === 1 ? '#ffffff0d' : 'none'}" stroke="#ffffff30" stroke-width="1"/>`).join('')}${st.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#ffffff22"/>`; }).join('')}<polygon points="${poly}" fill="${col}55" stroke="${col}" stroke-width="2"/>${labels}</svg>`;
  };
  M.cardHTML = function (p, o = {}) {
    const n = M.natInfo(p.nat), fl = n.flag, cols = (String(fl).split('|')[0].split(':')[1] || '#ce1126,#fcd116,#006b3f').split(',').filter(c => c[0] === '#');
    const band = `linear-gradient(90deg,${cols.map((c, i) => `${c} ${i * 100 / cols.length}% ${(i + 1) * 100 / cols.length}%`).join(',')})`;
    const tier = p.rating >= 80 ? 'gold' : p.rating >= 65 ? 'silver' : 'bronze';
    const val = KK.playerValue ? KK.playerValue(p) : 0, fit = p.fit == null ? 100 : p.fit;
    return `<div class="pcard ${tier}"><div class="pc-band" style="background:${band}"></div>
      <div class="pc-stripe">${KK.flagSVG(fl, 34, 22)}</div>
      <div class="pc-top"><div class="pc-ovr">${p.rating}<small>OVR</small></div><div class="pc-pos pos ${p.pos}">${p.pos}</div></div>
      <div class="pc-name">${esc(p.name)}</div>
      <div class="pc-meta">${esc(n.name)} · Age ${p.age}</div>
      ${M.starsHTML(p.rating)}
      ${M.radarSVG(p, 176)}
      <div class="pc-fit"><span>Stamina</span><i><b style="width:${fit}%;background:${fit > 70 ? '#76ff03' : fit > 45 ? '#fdd835' : '#ff5252'}"></b></i><span>${fit}%</span></div>
      <div class="pc-foot"><span>⚽ ${p.goals || 0}</span><span>👟 ${p.apps || 0} apps</span><span>🪙 ${val.toLocaleString()}</span></div>
      ${o.extra || ''}
    </div>`;
  };

  // ---------- kits ----------
  M.PATTERNS = [['plain', 'Plain'], ['stripes', 'Stripes'], ['hoops', 'Hoops'], ['sash', 'Sash'], ['halves', 'Halves'], ['pinstripe', 'Pinstripe'], ['kente', 'Kente ✦']];
  M.KENTE_COST = 5;
  M.kitSVG = function (k, size = 90) {
    const id = 'k' + Math.random().toString(36).slice(2, 7), c2 = k.c2 || '#ffffff';
    const body = 'M20 6 L10 10 L2 22 L10 28 L14 24 L14 44 L50 44 L50 24 L54 28 L62 22 L54 10 L44 6 C42 11 37 13 32 13 C27 13 22 11 20 6Z';
    let pat = '';
    if (k.pattern === 'stripes') pat = [16, 26, 36, 46].map(x => `<rect x="${x - 2.5}" y="0" width="5" height="64" fill="${c2}"/>`).join('');
    else if (k.pattern === 'hoops') pat = [14, 24, 34].map(y => `<rect x="0" y="${y}" width="64" height="5" fill="${c2}"/>`).join('');
    else if (k.pattern === 'sash') pat = `<path d="M8 6 L20 6 L58 44 L46 44Z" fill="${c2}"/>`;
    else if (k.pattern === 'halves') pat = `<rect x="32" y="0" width="32" height="64" fill="${c2}"/>`;
    else if (k.pattern === 'pinstripe') pat = [12, 17, 22, 27, 32, 37, 42, 47, 52].map(x => `<rect x="${x}" y="0" width="1.2" height="64" fill="${c2}"/>`).join('');
    else if (k.pattern === 'kente') pat = Array.from({ length: 8 }, (_, i) => `<rect x="${i * 8}" y="${16 + (i % 2) * 6}" width="8" height="6" fill="${c2}"/><rect x="${i * 8 + 2}" y="30" width="4" height="10" fill="#111"/><rect x="${i * 8}" y="${34 - (i % 2) * 6}" width="8" height="3" fill="#fdd835"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 96" width="${size}" height="${size * 1.5}"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>
      <path d="${body}" fill="${k.shirt}"/><g clip-path="url(#${id})">${pat}</g><path d="${body}" fill="none" stroke="#0008" stroke-width="1.5"/>
      <path d="M26 7 C28 10 36 10 38 7" fill="none" stroke="${c2}" stroke-width="2"/>
      <path d="M16 46 L48 46 L50 64 L35 64 L32 56 L29 64 L14 64Z" fill="${k.shorts}" stroke="#0008" stroke-width="1.5"/>
      <rect x="17" y="68" width="10" height="20" rx="2" fill="${k.socks || k.shirt}" stroke="#0008"/><rect x="37" y="68" width="10" height="20" rx="2" fill="${k.socks || k.shirt}" stroke="#0008"/>
      <rect x="17" y="70" width="10" height="2.5" fill="${c2}"/><rect x="37" y="70" width="10" height="2.5" fill="${c2}"/></svg>`;
  };

  // ---------- objectives (per season) ----------
  const OBJ = [
    { k: 'wins', n: 4, txt: 'Win 4 league or cup games', r: 600 },
    { k: 'goals', n: 10, txt: 'Score 10 goals', r: 500 },
    { k: 'clean', n: 2, txt: 'Keep 2 clean sheets', r: 450 },
    { k: 'played', n: 3, txt: 'Play 3 full matches yourself', r: 400 },
    { k: 'motm', n: 2, txt: 'Win Man of the Match twice', r: 500 },
    { k: 'big', n: 1, txt: 'Win a game by 3+ goals', r: 450 },
  ];
  M.newObjectives = function (s) {
    const y = s.season ? s.season.year : 1, start = (y * 2) % OBJ.length;
    s.obj = { y, list: [0, 1, 2].map(i => { const o = OBJ[(start + i * 2 + (i === 2 ? 1 : 0)) % OBJ.length]; return { k: o.k, n: o.n, txt: o.txt, r: o.r, p: 0, done: false }; }) };
    if (new Set(s.obj.list.map(o => o.k)).size < 3) s.obj.list = OBJ.slice(0, 3).map(o => ({ ...o, p: 0, done: false }));
  };
  // ---------- achievements ----------
  M.ACH = [
    { id: 'first_win', ic: '🥇', name: 'First Victory', txt: 'Win your first match', c: 300, g: 2 },
    { id: 'first_goal', ic: '⚽', name: 'Off the Mark', txt: 'Score your first goal', c: 200, g: 1 },
    { id: 'hat_trick', ic: '🎩', name: 'Hat-trick Hero', txt: 'Score 3+ goals in one match', c: 500, g: 3 },
    { id: 'clean', ic: '🧤', name: 'Brick Wall', txt: 'Keep a clean sheet', c: 250, g: 1 },
    { id: 'motm', ic: '🌟', name: 'Star Man', txt: 'One of your players wins Man of the Match', c: 250, g: 1 },
    { id: 'ten_wins', ic: '🔟', name: 'Winning Habit', txt: 'Win 10 matches', c: 1000, g: 5 },
    { id: 'promoted', ic: '⬆️', name: 'Going Up', txt: 'Win promotion', c: 1500, g: 5 },
    { id: 'champion', ic: '🏆', name: 'Champions', txt: 'Win a league title', c: 2500, g: 8 },
    { id: 'cup', ic: '👑', name: 'Continental Glory', txt: 'Win a continental cup', c: 4000, g: 12 },
    { id: 'stadium', ic: '🏟️', name: 'Builder', txt: 'Upgrade your stadium', c: 400, g: 2 },
    { id: 'signing', ic: '✍️', name: 'New Signing', txt: 'Buy a player on the transfer market', c: 200, g: 1 },
    { id: 'level5', ic: '⭐', name: 'Rising Club', txt: 'Reach club level 5', c: 1500, g: 6 },
    { id: 'kit', ic: '👕', name: 'Fresh Threads', txt: 'Design your own kit', c: 150, g: 1 },
  ];
  M.unlock = function (s, id, out) {
    if (s.ach[id]) return; const a = M.ACH.find(x => x.id === id); if (!a) return;
    s.ach[id] = (s.season && s.season.year) || 1; s.coins += a.c; s.gold += a.g;
    if (out) out.push(a); return a;
  };
  M.event = function (s, id) { const out = []; M.unlock(s, id, out); M.levelChecks(s, out); return out; };
  M.levelChecks = function (s, out) { if (M.levelInfo(s).lv >= 5) M.unlock(s, 'level5', out); };

  // after any league/cup match. o = {my, op, played, motmMine, cleanGK}
  M.afterMatch = function (s, o) {
    M.ensure(s);
    const res = o.my > o.op ? 'W' : o.my < o.op ? 'L' : 'D', ach = [], objDone = [];
    const before = M.levelInfo(s).lv;
    const xp = (res === 'W' ? 40 : res === 'D' ? 20 : 10) + o.my * 5 + (o.played ? 15 : 0);
    s.xp += xp;
    let gold = 0; if (res === 'W' && o.played) gold += 1; if (o.motmMine) gold += 1;
    s.gold += gold;
    const st = s.stats; st.goals += o.my; if (res === 'W') st.wins++; if (o.op === 0) st.clean++; if (o.played) st.played++; if (o.motmMine) st.motm++;
    const inc = { wins: res === 'W' ? 1 : 0, goals: o.my, clean: o.op === 0 ? 1 : 0, played: o.played ? 1 : 0, motm: o.motmMine ? 1 : 0, big: o.my - o.op >= 3 ? 1 : 0 };
    for (const ob of s.obj.list) { if (ob.done) continue; ob.p = Math.min(ob.n, ob.p + (inc[ob.k] || 0)); if (ob.p >= ob.n) { ob.done = true; s.coins += ob.r; s.gold += 1; objDone.push(ob); } }
    if (res === 'W') M.unlock(s, 'first_win', ach);
    if (st.goals > 0) M.unlock(s, 'first_goal', ach);
    if (o.my >= 3) M.unlock(s, 'hat_trick', ach);
    if (o.op === 0) M.unlock(s, 'clean', ach);
    if (o.motmMine) M.unlock(s, 'motm', ach);
    if (st.wins >= 10) M.unlock(s, 'ten_wins', ach);
    const after = M.levelInfo(s), levelUp = after.lv > before ? after.lv : 0;
    let lvCoins = 0; if (levelUp) { lvCoins = 400 * (after.lv - before); s.coins += lvCoins; s.gold += 3 * (after.lv - before); }
    M.levelChecks(s, ach);
    // fitness: starters tire, everyone else recovers
    const xi = new Set(s.lineup);
    s.players.forEach(p => { p.fit = xi.has(p.id) ? Math.max(35, (p.fit == null ? 100 : p.fit) - (o.played ? 16 : 12)) : Math.min(100, (p.fit == null ? 100 : p.fit) + 14); });
    s.players.filter(p => xi.has(p.id)).forEach(p => { p.fit = Math.min(100, p.fit + 6); }); // a little recovery before the next game
    return { res, xp, gold: gold + (levelUp ? 3 * (after.lv - before) : 0) + objDone.length + ach.reduce((a, x) => a + x.g, 0), levelUp, lvCoins, ach, objDone, lv: after };
  };
  // Man of the Match from per-player match stats. ents: [{t, sp, ps:{g,sh,pa,tk,sv}}]
  M.motm = function (ents, score) {
    let best = null, bestR = -1;
    const ratings = ents.map(e => {
      const ps = e.ps || {}, won = score[e.t] > score[1 - e.t], cs = score[1 - e.t] === 0;
      let r = 6.0 + (ps.g || 0) * 1.1 + (ps.as || 0) * 0.6 + (ps.sh || 0) * 0.12 + (ps.pa || 0) * 0.05 + (ps.tk || 0) * 0.28 + (ps.sv || 0) * 0.45 + (won ? 0.4 : score[0] === score[1] ? 0.1 : -0.3) + (cs && (e.pos === 'GK' || e.pos === 'DF') ? 0.5 : 0) + (e.sp.rating - 60) / 80;
      r = clamp(Math.round(r * 10) / 10, 4.5, 10);
      if (r > bestR) { bestR = r; best = e; }
      return { e, r };
    });
    return { best, rating: bestR, ratings };
  };

  // ---------- manager story ----------
  M.STORY = [
    { ic: '📜', h: 'A letter arrives', p: 'The board of {club} have one dream: to see their little club on the biggest stage. They have chosen <b>you</b> as their new manager.' },
    { ic: '🏟️', h: 'Humble beginnings', p: 'The stand is small, the kit is faded and the pitch has seen better days. Win matches, earn coins and build a stadium the town can be proud of.' },
    { ic: '🎯', h: 'Your objectives', p: 'Every season the board sets <b>objectives</b>. Complete them for coins and <b>Gold Kente</b>. Unlock achievements as your story grows.' },
    { ic: '👑', h: 'Road to glory', p: 'Climb the league, qualify for the Continental Crown Cup and lift silverware. The story is yours to write. Good luck, boss!' },
  ];
})();
