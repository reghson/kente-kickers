/* Dream League Soccer — progression, Gems, Club Rating, 8-Stat DLS Cards, Coaches, Objectives & Achievements */
'use strict';
(function () {
  const KK = window.KK;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const M = KK.meta = {};

  // ---------- save upgrade & migration ----------
  M.ensure = function (s) {
    if (!s) return s;
    if (s.gold == null) s.gold = 50; // Gems
    if (s.xp == null) s.xp = 0;
    s.ach = s.ach || {};
    s.stats = s.stats || { wins: 0, goals: 0, played: 0, clean: 0, motm: 0 };
    s.facilities = s.facilities || { commercial: 0, training: 0, medical: 0, accommodation: 0, recruitment: 0 };
    s.coaches = s.coaches || { tech: { c: 2, r: 1, l: 0 }, fit: { c: 2, r: 1, l: 0 }, gk: { c: 1, r: 0, l: 0 } };
    s.scouted = s.scouted || [];
    const k = s.team.kit;
    if (!k.socks) k.socks = k.shirt;
    if (!k.pattern) k.pattern = 'plain';
    if (!k.c2) k.c2 = s.team.crest.c2;
    if (!s.team.away) s.team.away = { shirt: KK.colorDist(k.shirt, '#ffffff') < 150 ? '#111111' : '#ffffff', shorts: k.shirt, socks: '#ffffff', pattern: 'plain', c2: k.shirt };
    s.unlocks = s.unlocks || {};
    s.story = s.story || { seen: false };
    s.players.forEach(p => {
      if (p.fit == null) p.fit = 100;
      if (!p.nat) p.nat = 'en';
      if (KK.syncStats) KK.syncStats(p);
    });
    if (s.market) s.market.forEach(p => { if (KK.syncStats) KK.syncStats(p); });
    if (!s.roles && s.players.length) {
      const cap = s.players.find(p => p.isCaptain) || s.players.slice().sort((a, b) => b.rating - a.rating)[0];
      s.roles = { captain: cap.id, pk: cap.id, fk: cap.id, ck: cap.id };
    }
    if (!s.obj || s.obj.y !== s.season.year) M.newObjectives(s);
    return s;
  };

  // ---------- club XP & reputation level ----------
  M.levelInfo = function (s) {
    let lv = 1, need = 120, xp = s.xp || 0;
    while (xp >= need) { xp -= need; lv++; need = 120 + (lv - 1) * 60; }
    return { lv, cur: xp, need };
  };

  // ---------- nationality ----------
  M.natInfo = function (nat) {
    if (!nat || nat === 'gh') return { name: 'Ghana', flag: KK.GHANA_FLAG };
    const c = (KK.COUNTRIES || []).find(x => String(x.style || '').split('|').includes(nat));
    return c ? { name: c.name, flag: c.flag } : { name: 'England', flag: 'c:#ffffff,#ce1124' };
  };

  M.stars = r => clamp(Math.round(((r - 42) / 10) * 2) / 2, 1, 5);
  M.starsHTML = function (r) {
    const n = M.stars(r); let h = '';
    for (let i = 1; i <= 5; i++) h += `<span class="st ${n >= i ? 'on' : n >= i - 0.5 ? 'half' : ''}">★</span>`;
    return `<span class="stars">${h}</span>`;
  };

  // Authentic DLS 8-Attribute Grid: SPE, ACC, STA, CON, STR, TAC, PAS, SHO (or GK GKH/GKR)
  M.eight = function (p) {
    if (KK.syncStats) KK.syncStats(p);
    const s = p.stats || {};
    if (p.pos === 'GK') {
      return [
        ['GKH', clamp(s.tac || p.rating, 30, 99)],
        ['GKR', clamp(s.str || p.rating, 30, 99)],
        ['PAS', clamp(s.pas || p.rating - 6, 30, 99)],
        ['CON', clamp(s.con || p.rating - 8, 30, 99)],
        ['SPE', clamp(s.spe || p.rating - 12, 30, 99)],
        ['ACC', clamp(s.acc || p.rating - 10, 30, 99)],
        ['STA', clamp(s.sta || p.rating - 4, 30, 99)],
        ['STR', clamp(s.str || p.rating, 30, 99)],
      ];
    }
    return [
      ['SPE', clamp(s.spe || s.pac || p.rating, 30, 99)],
      ['ACC', clamp(s.acc || s.pac || p.rating, 30, 99)],
      ['STA', clamp(s.sta || p.rating, 30, 99)],
      ['CON', clamp(s.con || p.rating, 30, 99)],
      ['STR', clamp(s.str || s.def || p.rating, 30, 99)],
      ['TAC', clamp(s.tac || s.def || p.rating, 30, 99)],
      ['PAS', clamp(s.pas || p.rating, 30, 99)],
      ['SHO', clamp(s.sho || p.rating, 30, 99)],
    ];
  };

  M.six = function (p) {
    if (KK.syncStats) KK.syncStats(p);
    const s = p.stats;
    return [
      ['SPE', s.spe || s.pac],
      ['SHO', s.sho],
      ['PAS', s.pas],
      ['CON', s.con || Math.round((s.pac + s.pas) / 2)],
      ['TAC', s.tac || s.def],
      ['STR', s.str || Math.round((s.def + s.pac) / 2)]
    ].map(([k, v]) => [k, clamp(v, 1, 99)]);
  };

  // Apply DLS Coach (type: 'tech' | 'fit' | 'gk', tier: 'c' | 'r' | 'l')
  M.applyCoach = function (save, p, type, tier) {
    if (!p || p.rating >= 99) return null;
    KK.syncStats(p);
    const boostCount = tier === 'l' ? 3 : tier === 'r' ? 2 : 1;
    const baseGain = tier === 'l' ? 3 : tier === 'r' ? 2 : 1;
    const breakthrough = Math.random() < (tier === 'l' ? 0.35 : tier === 'r' ? 0.22 : 0.12);
    const gain = baseGain + (breakthrough ? 1 : 0);
    const pool = type === 'fit' ? ['spe', 'acc', 'sta', 'str'] : type === 'gk' ? ['tac', 'str', 'pas', 'con'] : ['sho', 'pas', 'con', 'tac'];
    const upgraded = [];
    const avail = pool.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < boostCount && i < avail.length; i++) {
      const k = avail[i];
      const oldV = p.stats[k] || p.rating;
      p.stats[k] = clamp(oldV + gain, 30, 99);
      upgraded.push([k.toUpperCase(), p.stats[k] - oldV]);
    }
    const ovrGain = tier === 'l' ? (breakthrough ? 3 : 2) : tier === 'r' ? (breakthrough ? 2 : 1) : 1;
    p.rating = clamp(p.rating + ovrGain, 45, 99);
    KK.syncStats(p);
    return { upgraded, ovrGain, breakthrough };
  };

  const FACE_SKIN = [
    ['#4a2a1b', '#361d11', '#633b28', '#3d1f16'],
    ['#5c3624', '#432517', '#754832', '#4c261c'],
    ['#72462f', '#56321f', '#8c5a3e', '#5e3125'],
    ['#8d5b3e', '#6d432b', '#a87152', '#733c2e'],
    ['#ad7653', '#8a5a3b', '#c68e6a', '#8c4b3b'],
    ['#cc9874', '#a87653', '#e2b18e', '#a65c4b'],
    ['#e0b494', '#bd8e6c', '#f2caa9', '#b86858'],
    ['#eec8ab', '#cfa07e', '#ffdec4', '#c47262']
  ];
  const FACE_HAIR = ['#100d0c', '#1f1510', '#362318', '#543620', '#7d522c', '#b5884a', '#d1ae6c', '#6e2918'];

  M.faceSVG = function (p, size = 64, shirtHex) {
    const str = String((p && (p.id || p.name)) || 'p');
    let h = 7;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    const skinI = h % FACE_SKIN.length;
    const [skin, skinDk, skinLt, lip] = FACE_SKIN[skinI];
    const hs = [0, 0, 1, 1, 2, 3, 4, 5][(h >> 3) % 8];
    const hair = FACE_HAIR[skinI >= 5 ? (h >> 5) % FACE_HAIR.length : (h >> 5) % 4];
    const beard = ((h >> 11) % 3 === 0);
    const mustache = ((h >> 9) % 3 !== 0);
    const browTilt = ((h >> 7) % 3 - 1) * 1.4;
    const jawW = 22 + ((h >> 13) % 3);
    const shirt = shirtHex || (p && p.pos === 'GK' ? '#00c853' : '#1e4fd1');
    const uid = 'f' + (h % 99991) + '_' + size;
    let hairBack = '', hairTop = '';
    if (hs === 2) {
      hairBack = `<circle cx="50" cy="36" r="29" fill="${hair}"/>`;
      hairTop = `<path d="M22,38 C20,16 34,8 50,8 C66,8 80,16 78,38 C74,25 63,21 50,21 C37,21 26,25 22,38 Z" fill="${hair}"/>
        <circle cx="29" cy="22" r="7" fill="${hair}"/><circle cx="50" cy="14" r="8" fill="${hair}"/><circle cx="71" cy="22" r="7" fill="${hair}"/>`;
    } else if (hs === 3) {
      hairBack = `<path d="M23,36 L19,68 M27,34 L24,70 M77,36 L81,68 M73,34 L76,70" stroke="${hair}" stroke-width="4.5" stroke-linecap="round"/>`;
      hairTop = `<path d="M24,37 C24,16 35,11 50,11 C65,11 76,16 76,37 C71,24 62,21 50,21 C38,21 29,24 24,37 Z" fill="${hair}"/>`;
    } else if (hs === 4) {
      hairTop = `<path d="M26,33 C26,15 36,10 50,10 C64,10 74,15 74,33 C68,23 60,21 50,21 C40,21 32,23 26,33 Z" fill="${hair}"/>`;
    } else if (hs === 1) {
      hairTop = `<path d="M24,37 C23,17 35,10 51,10 C67,10 77,18 76,37 C72,25 60,20 44,22 C33,23 27,29 24,37 Z" fill="${hair}"/>`;
    } else if (hs === 0) {
      hairTop = `<path d="M25,36 C25,18 35,12 50,12 C65,12 75,18 75,36 C70,25 61,22 50,22 C39,22 30,25 25,36 Z" fill="${hair}"/>`;
    }
    const facialHair = beard
      ? `<path d="M${50 - jawW},49 C${50 - jawW + 2},67 39,75 50,75 C61,75 ${50 + jawW - 2},67 ${50 + jawW},49 C${50 + jawW - 4},61 60,69 50,69 C40,69 ${50 - jawW + 4},61 ${50 - jawW},49 Z" fill="${hair}" opacity="0.82"/>
         <path d="M40,59 Q50,55 60,59 Q58,62 50,61 Q42,62 40,59 Z" fill="${hair}" opacity="0.85"/>`
      : (mustache ? `<path d="M41,58.5 Q50,55.5 59,58.5 Q57,60.5 50,59.5 Q43,60.5 41,58.5 Z" fill="${hair}" opacity="0.65"/>` : '');
    return `<svg class="pface" viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="${uid}sk" cx="46%" cy="38%" r="58%">
          <stop offset="0%" stop-color="${skinLt}"/>
          <stop offset="58%" stop-color="${skin}"/>
          <stop offset="100%" stop-color="${skinDk}"/>
        </radialGradient>
        <linearGradient id="${uid}sh" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${shirt}"/>
          <stop offset="100%" stop-color="#0b152c"/>
        </linearGradient>
      </defs>
      ${hairBack}
      <path d="M10,100 C12,80 26,74 50,74 C74,74 88,80 90,100 Z" fill="url(#${uid}sh)" stroke="#0006" stroke-width="1.5"/>
      <path d="M22,82 L34,76 M78,82 L66,76" stroke="#ffffff77" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M39,65 L38,81 C38,86 62,86 62,81 L61,65 Z" fill="url(#${uid}sk)"/>
      <path d="M39,66 Q50,76 61,66 L61,72 Q50,80 39,72 Z" fill="${skinDk}" opacity="0.45"/>
      <path d="M36,75 Q50,88 64,75" fill="none" stroke="#ffffffcc" stroke-width="3"/>
      <ellipse cx="${48 - jawW}" cy="46" rx="4.5" ry="7.5" fill="${skin}" stroke="${skinDk}" stroke-width="1"/>
      <ellipse cx="${52 + jawW}" cy="46" rx="4.5" ry="7.5" fill="${skin}" stroke="${skinDk}" stroke-width="1"/>
      <path d="M${50 - jawW},36 C${50 - jawW},18 36,14 50,14 C64,14 ${50 + jawW},18 ${50 + jawW},36 C${50 + jawW},54 62,73 50,73 C38,73 ${50 - jawW},54 ${50 - jawW},36 Z" fill="url(#${uid}sk)" stroke="${skinDk}" stroke-width="1.1"/>
      <ellipse cx="37" cy="48" rx="5.5" ry="3.2" fill="${skinLt}" opacity="0.35"/>
      <ellipse cx="63" cy="48" rx="5.5" ry="3.2" fill="${skinLt}" opacity="0.35"/>
      <g>
        <path d="M34,42 Q40,38.5 45,42 Q40,45 34,42 Z" fill="#f7f9fc"/>
        <circle cx="39.8" cy="41.8" r="2.5" fill="#2b1b10"/>
        <circle cx="39.8" cy="41.8" r="1.3" fill="#09090b"/>
        <circle cx="39.0" cy="41.0" r="0.7" fill="#ffffff"/>
        <path d="M33.5,41.8 Q40,38.2 45.5,41.8" fill="none" stroke="#181210" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M55,42 Q60,38.5 66,42 Q60,45 55,42 Z" fill="#f7f9fc"/>
        <circle cx="60.2" cy="41.8" r="2.5" fill="#2b1b10"/>
        <circle cx="60.2" cy="41.8" r="1.3" fill="#09090b"/>
        <circle cx="59.4" cy="41.0" r="0.7" fill="#ffffff"/>
        <path d="M54.5,41.8 Q60,38.2 66.5,41.8" fill="none" stroke="#181210" stroke-width="1.3" stroke-linecap="round"/>
      </g>
      <path d="M33,${37.5 + browTilt} Q39.5,${35 - browTilt * 0.5} 46,37.5" fill="none" stroke="${hair}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M54,37.5 Q60.5,${35 - browTilt * 0.5} 67,${37.5 + browTilt}" fill="none" stroke="${hair}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M49.5,41 L48.5,51.5 Q50,53.5 51.5,51.5" fill="none" stroke="${skinDk}" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M50,41 L50,50" fill="none" stroke="${skinLt}" stroke-width="1.2" opacity="0.55" stroke-linecap="round"/>
      <circle cx="47.2" cy="52" r="1.2" fill="${skinDk}" opacity="0.65"/>
      <circle cx="52.8" cy="52" r="1.2" fill="${skinDk}" opacity="0.65"/>
      ${facialHair}
      <path d="M42.5,61.2 Q50,58.8 57.5,61.2 Q50,64.8 42.5,61.2 Z" fill="${lip}"/>
      <path d="M42.5,61.2 Q50,60.4 57.5,61.2" fill="none" stroke="${skinDk}" stroke-width="1.1" stroke-linecap="round"/>
      ${hairTop}
    </svg>`;
  };

  M.radarSVG = function (p, size = 152, col = '#00e5ff') {
    const st = M.six(p), c = size / 2, R = size * 0.35, pt = (i, f) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [c + Math.cos(a) * R * f, c + Math.sin(a) * R * f]; };
    const ring = f => st.map((_, i) => pt(i, f).map(v => v.toFixed(1)).join(',')).join(' ');
    const poly = st.map(([, v], i) => pt(i, v / 99).map(x => x.toFixed(1)).join(',')).join(' ');
    const labels = st.map(([k, v], i) => { const [x, y] = pt(i, 1.28); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="${size * 0.068}" font-weight="800" fill="#dfe8ff">${k} <tspan fill="${col}">${v}</tspan></text>`; }).join('');
    return `<svg class="radar" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${[1, 0.75, 0.5, 0.25].map(f => `<polygon points="${ring(f)}" fill="${f === 1 ? '#ffffff0d' : 'none'}" stroke="#ffffff30" stroke-width="1"/>`).join('')}${st.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#ffffff22"/>`; }).join('')}<polygon points="${poly}" fill="${col}44" stroke="${col}" stroke-width="2"/>${labels}</svg>`;
  };

  // Authentic Dream League Soccer Player Card (Legendary Gold, Rare Sapphire Blue, Common Silver)
  M.cardHTML = function (p, o = {}) {
    if (KK.syncStats) KK.syncStats(p);
    const n = M.natInfo(p.nat), fl = n.flag;
    const tier = p.rating >= 80 ? 'gold' : p.rating >= 70 ? 'silver' : 'bronze';
    const tierLabel = p.rating >= 80 ? 'LEGENDARY' : p.rating >= 70 ? 'RARE' : 'COMMON';
    const val = KK.playerValue ? KK.playerValue(p) : 0, fit = p.fit == null ? 100 : p.fit;
    const eight = M.eight(p);
    const statCls = v => v >= 85 ? 'st-max' : v >= 75 ? 'st-hi' : v >= 65 ? 'st-md' : 'st-lo';
    const sv = KK.ui && KK.ui.getSave && KK.ui.getSave();
    const shirtCol = o.shirt || (sv && sv.team && sv.team.kit ? sv.team.kit.shirt : '#1e4fd1');
    return `<div class="pcard dls-card ${tier}">
      <div class="pc-tier-badge">${tierLabel}</div>
      <div class="pc-hero">
        <div class="pc-left">
          <div class="pc-ovr">${p.rating}<small>OVR</small></div>
          <div class="pc-pos pos ${p.pos}">${p.pos}</div>
          <div class="pc-flag">${KK.flagSVG(fl, 28, 18)}</div>
          <div class="pc-foot-tag">${p.foot || 'R'} · ${p.height || 180}cm</div>
        </div>
        <div class="pc-portrait">${M.faceSVG(p, 102, p.pos === 'GK' ? '#00c853' : shirtCol)}</div>
      </div>
      <div class="pc-name">${esc(p.name)}</div>
      <div class="pc-meta">${esc(n.name)} · Age ${p.age} · ${M.starsHTML(p.rating)}</div>
      <div class="dls-stats eight-grid">${eight.map(([k, v]) => `<div class="dls-st ${statCls(v)}"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      ${o.compact ? '' : M.radarSVG(p, 140)}
      <div class="pc-fit"><span>STAMINA</span><i><b style="width:${fit}%;background:${fit > 70 ? '#00e676' : fit > 45 ? '#ffd600' : '#ff5252'}"></b></i><span>${fit}%</span></div>
      <div class="pc-foot"><span>⚽ ${p.goals || 0}</span><span>👟 ${p.apps || 0} apps</span><span>🪙 ${(p.price || val).toLocaleString()}</span></div>
      ${o.extra || ''}
    </div>`;
  };

  // ---------- kits ----------
  M.PATTERNS = [['plain', 'Plain'], ['stripes', 'Stripes'], ['hoops', 'Hoops'], ['sash', 'Sash'], ['halves', 'Halves'], ['pinstripe', 'Pinstripe'], ['kente', 'Elite Prism ✦']];
  M.KENTE_COST = 15;
  M.kitSVG = function (k, size = 90) {
    const id = 'k' + Math.random().toString(36).slice(2, 7), c2 = k.c2 || '#ffffff';
    const body = 'M20 6 L10 10 L2 22 L10 28 L14 24 L14 44 L50 44 L50 24 L54 28 L62 22 L54 10 L44 6 C42 11 37 13 32 13 C27 13 22 11 20 6Z';
    let pat = '';
    if (k.pattern === 'stripes') pat = [16, 26, 36, 46].map(x => `<rect x="${x - 2.5}" y="0" width="5" height="64" fill="${c2}"/>`).join('');
    else if (k.pattern === 'hoops') pat = [14, 24, 34].map(y => `<rect x="0" y="${y}" width="64" height="5" fill="${c2}"/>`).join('');
    else if (k.pattern === 'sash') pat = `<path d="M8 6 L20 6 L58 44 L46 44Z" fill="${c2}"/>`;
    else if (k.pattern === 'halves') pat = `<rect x="32" y="0" width="32" height="64" fill="${c2}"/>`;
    else if (k.pattern === 'pinstripe') pat = [12, 17, 22, 27, 32, 37, 42, 47, 52].map(x => `<rect x="${x}" y="0" width="1.2" height="64" fill="${c2}"/>`).join('');
    else if (k.pattern === 'kente') pat = `<path d="M0 16 L64 4 L64 16 L0 28 Z" fill="${c2}"/><path d="M0 32 L64 20 L64 28 L0 40 Z" fill="#00e5ff" opacity="0.85"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 96" width="${size}" height="${size * 1.5}"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>
      <path d="${body}" fill="${k.shirt}"/><g clip-path="url(#${id})">${pat}</g><path d="${body}" fill="none" stroke="#0008" stroke-width="1.5"/>
      <path d="M26 7 C28 10 36 10 38 7" fill="none" stroke="${c2}" stroke-width="2"/>
      <path d="M16 46 L48 46 L50 64 L35 64 L32 56 L29 64 L14 64Z" fill="${k.shorts}" stroke="#0008" stroke-width="1.5"/>
      <rect x="17" y="68" width="10" height="20" rx="2" fill="${k.socks || k.shirt}" stroke="#0008"/><rect x="37" y="68" width="10" height="20" rx="2" fill="${k.socks || k.shirt}" stroke="#0008"/>
      <rect x="17" y="70" width="10" height="2.5" fill="${c2}"/><rect x="37" y="70" width="10" height="2.5" fill="${c2}"/></svg>`;
  };

  // ---------- season board objectives ----------
  const OBJ = [
    { k: 'wins', n: 5, txt: 'Win 5 League or Cup matches', r: 450, g: 8 },
    { k: 'goals', n: 12, txt: 'Score 12 goals this season', r: 400, g: 6 },
    { k: 'clean', n: 3, txt: 'Keep 3 clean sheets', r: 350, g: 6 },
    { k: 'played', n: 4, txt: 'Play 4 full matches in 3D/2D', r: 350, g: 5 },
    { k: 'motm', n: 2, txt: 'Earn Man of the Match twice', r: 400, g: 8 },
    { k: 'big', n: 1, txt: 'Win a match by 3+ goals', r: 400, g: 6 },
  ];
  M.newObjectives = function (s) {
    const y = s.season ? s.season.year : 1, start = (y * 2) % OBJ.length;
    s.obj = { y, list: [0, 1, 2].map(i => { const o = OBJ[(start + i * 2 + (i === 2 ? 1 : 0)) % OBJ.length]; return { k: o.k, n: o.n, txt: o.txt, r: o.r, g: o.g || 5, p: 0, done: false }; }) };
    if (new Set(s.obj.list.map(o => o.k)).size < 3) s.obj.list = OBJ.slice(0, 3).map(o => ({ ...o, p: 0, done: false }));
  };

  // ---------- DLS career achievements ----------
  M.ACH = [
    { id: 'first_win', ic: '🥇', name: 'First Dream Win', txt: 'Win your first career match', c: 300, g: 10 },
    { id: 'first_goal', ic: '⚽', name: 'Opening Goal', txt: 'Score your first goal', c: 200, g: 5 },
    { id: 'hat_trick', ic: '🎩', name: 'Hat-Trick Hero', txt: 'Score 3+ goals in a single match', c: 500, g: 15 },
    { id: 'clean', ic: '🧤', name: 'Golden Glove', txt: 'Keep a clean sheet', c: 250, g: 8 },
    { id: 'motm', ic: '🌟', name: 'Star Performer', txt: 'Win Man of the Match with a club player', c: 250, g: 8 },
    { id: 'ten_wins', ic: '🔟', name: 'Unstoppable', txt: 'Win 10 career matches', c: 1000, g: 25 },
    { id: 'promoted', ic: '⬆️', name: 'Division Climber', txt: 'Win promotion to a higher division', c: 1200, g: 25 },
    { id: 'champion', ic: '🏆', name: 'Division Champions', txt: 'Win a division title', c: 2000, g: 40 },
    { id: 'cup', ic: '👑', name: 'Global Cup Glory', txt: 'Win the Global Challenge or Diamond Cup', c: 3000, g: 50 },
    { id: 'stadium', ic: '🏟️', name: 'Arena Architect', txt: 'Upgrade your Stadium or Club Facility', c: 400, g: 10 },
    { id: 'signing', ic: '✍️', name: 'Blockbuster Transfer', txt: 'Sign a player on the Live Transfer Market', c: 250, g: 8 },
    { id: 'level5', ic: '⭐', name: 'Elite Franchise', txt: 'Reach Club Reputation Level 5', c: 1500, g: 30 },
    { id: 'kit', ic: '👕', name: 'Custom Identity', txt: 'Customize your Club Kit or Crest', c: 150, g: 5 },
  ];

  M.unlock = function (s, id, out) {
    if (s.ach[id]) return; const a = M.ACH.find(x => x.id === id); if (!a) return;
    s.ach[id] = (s.season && s.season.year) || 1; s.coins += a.c; s.gold += a.g;
    if (out) out.push(a); return a;
  };
  M.event = function (s, id) { const out = []; M.unlock(s, id, out); M.levelChecks(s, out); return out; };
  M.levelChecks = function (s, out) { if (M.levelInfo(s).lv >= 5) M.unlock(s, 'level5', out); };

  // After any league/cup match
  M.afterMatch = function (s, o) {
    M.ensure(s);
    const res = o.my > o.op ? 'W' : o.my < o.op ? 'L' : 'D', ach = [], objDone = [];
    const before = M.levelInfo(s).lv;
    const xp = (res === 'W' ? 45 : res === 'D' ? 22 : 12) + o.my * 6 + (o.played ? 18 : 0);
    s.xp += xp;
    let gems = 0; if (res === 'W' && o.played) gems += 3; else if (res === 'W') gems += 1; if (o.motmMine) gems += 2;
    s.gold += gems;
    const st = s.stats; st.goals += o.my; if (res === 'W') st.wins++; if (o.op === 0) st.clean++; if (o.played) st.played++; if (o.motmMine) st.motm++;
    const inc = { wins: res === 'W' ? 1 : 0, goals: o.my, clean: o.op === 0 ? 1 : 0, played: o.played ? 1 : 0, motm: o.motmMine ? 1 : 0, big: o.my - o.op >= 3 ? 1 : 0 };
    for (const ob of s.obj.list) {
      if (ob.done) continue;
      ob.p = Math.min(ob.n, ob.p + (inc[ob.k] || 0));
      if (ob.p >= ob.n) { ob.done = true; s.coins += ob.r; s.gold += (ob.g || 5); objDone.push(ob); }
    }
    if (res === 'W') M.unlock(s, 'first_win', ach);
    if (st.goals > 0) M.unlock(s, 'first_goal', ach);
    if (o.my >= 3) M.unlock(s, 'hat_trick', ach);
    if (o.op === 0) M.unlock(s, 'clean', ach);
    if (o.motmMine) M.unlock(s, 'motm', ach);
    if (st.wins >= 10) M.unlock(s, 'ten_wins', ach);
    const after = M.levelInfo(s), levelUp = after.lv > before ? after.lv : 0;
    let lvCoins = 0; if (levelUp) { lvCoins = 500 * (after.lv - before); s.coins += lvCoins; s.gold += 10 * (after.lv - before); }
    M.levelChecks(s, ach);
    // Stamina drain reduced by Medical Facility level + player STA attribute
    const medLv = (s.facilities && s.facilities.medical) || 0;
    const xi = new Set(s.lineup);
    s.players.forEach(p => {
      const staFactor = Math.max(0.55, 1 - ((p.stats && p.stats.sta ? p.stats.sta : 70) - 50) / 140) * (1 - medLv * 0.08);
      const drain = Math.round((o.played ? 14 : 10) * staFactor);
      p.fit = xi.has(p.id) ? Math.max(35, (p.fit == null ? 100 : p.fit) - drain) : Math.min(100, (p.fit == null ? 100 : p.fit) + 18 + medLv * 2);
    });
    s.players.filter(p => xi.has(p.id)).forEach(p => { p.fit = Math.min(100, p.fit + 4); });
    (o.knocks || []).forEach(id => { const p = s.players.find(q => q.id === id); if (p) p.fit = Math.max(30, p.fit - Math.max(4, 10 - medLv)); });
    return { res, xp, gold: gems + (levelUp ? 10 * (after.lv - before) : 0) + objDone.reduce((a, x) => a + (x.g || 5), 0) + ach.reduce((a, x) => a + x.g, 0), levelUp, lvCoins, ach, objDone, lv: after };
  };

  // Man of the Match
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

  // ---------- DLS Welcome Briefing ----------
  M.STORY = [
    { ic: '⚽', h: 'WELCOME TO DREAM LEAGUE SOCCER', p: 'The board of {club} has appointed you to build a world-class Dream Team from the Academy Division all the way to the <b>Legendary Division</b>.' },
    { ic: '🌟', h: 'YOUR CAPTAIN & LIVE TRANSFERS', p: 'Your marquee <b>Captain</b> leads the dressing room. Scout Common, Rare, and <b>Legendary</b> players on the Live Transfer Market or unveil stars with Secret Agents.' },
    { ic: '🏟️', h: 'STADIUM & CLUB COMPLEX', p: 'Upgrade your <b>Stadium capacity</b> to meet promotion requirements and expand your Training, Commercial, Medical, Recruitment, and Accommodation facilities.' },
    { ic: '🏆', h: 'ROAD TO LEGENDARY GLORY', p: 'Train your squad with Technical, Fitness, and GK <b>Coaches</b>, conquer the Global Challenge Cup, and lift the Legendary Division trophy!' },
  ];
})();
