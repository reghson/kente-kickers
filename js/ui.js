/* Dream League Soccer — screens, Captain onboarding, Live Transfers, Scouts, Agents, Coaches, Facilities & Match UI */
'use strict';
(function () {
  const KK = window.KK, $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let save = KK.load(); if (save) KK.meta.ensure(save);
  KK.settings = save ? save.settings : { mute: false, len: 3 };
  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 3;
  if (!KK.settings.gfx) KK.settings.gfx = '3d';
  if (!KK.settings.q) KK.settings.q = lowEnd ? 'low' : 'high';
  let view = 'hub', kitTab = 'home', dragged = false, selSlot = null, match = null, draft = null, cupTab = null, euFilter = '', coachType = 'tech';
  const PATTERNS = ['plain', 'halves', 'stripes', 'chevron', 'sash'], EMBLEMS = ['star', 'ball', 'crown', 'eagle', 'letters'];

  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 2400); }
  function modal(html, cls) { const c = $('#modal-card'); c.className = 'modal-card ' + (cls || ''); c.innerHTML = html; c.scrollTop = 0; $('#modal').classList.remove('hidden'); }
  function closeModal() { $('#modal').classList.add('hidden'); }
  KK.ui = { toast, modal, closeModal };
  const persist = () => KK.save(save);
  KK.ui.getSave = () => save;
  const surname = n => String(n || '').split(' ').slice(-1)[0];
  const crestOf = (t, size) => t.id === 'ME' ? KK.crestSVG(save.team.crest, size, save.team.short) : KK.crestSVG({ c1: t.c1, c2: t.c2, pattern: PATTERNS[t.name.length % 5], emblem: EMBLEMS[t.name.charCodeAt(0) % 5] }, size, t.short);
  const GEM = '<i class="gk"></i>';

  function updateTop() {
    const on = !!save && view !== 'builder';
    $('#topbar').classList.toggle('hidden', !on); $('#bottomnav').classList.toggle('hidden', !on);
    $('#tb-mute').textContent = KK.settings.mute ? '🔇' : '🔊';
    if (!on) return;
    $('#tb-crest').innerHTML = KK.crestSVG(save.team.crest, 36, save.team.short);
    $('#tb-name').textContent = save.team.name;
    const ovr = KK.myRating(save);
    $('#tb-div').innerHTML = `${KK.meta.starsHTML(ovr)} <span style="margin-left:4px">${esc(KK.leagueName(save))} · S${save.season.year}</span>`;
    $('#tb-coins').textContent = save.coins.toLocaleString();
    $('#tb-gold').textContent = save.gold.toLocaleString();
    $('#tb-lvl').textContent = 'OVR ' + ovr;
    const nv = { kit: 'club', stadium: 'club', settings: 'club', shop: 'club', cups: 'league' }[view] || view;
    document.querySelectorAll('#bottomnav button').forEach(b => b.classList.toggle('on', b.dataset.go === nv));
  }
  const flagOf = (sv, w = 24, h = 16) => KK.flagSVG(KK.career(sv).mode === 'eu' && sv.career.country ? KK.country(sv.career.country).flag : 'c:#ffffff,#ce1124', w, h);
  function go(v) { view = v; selSlot = null; render(); window.scrollTo(0, 0); }
  KK.go = go;

  function render() {
    updateTop();
    const el = $('#screen');
    if (!save || view === 'builder') el.innerHTML = builderHTML();
    else el.innerHTML = ({ hub: hubHTML, squad: squadHTML, training: trainingHTML, market: marketHTML, league: leagueHTML, club: clubHTML, kit: kitHTML, stadium: stadiumHTML, settings: settingsHTML, cups: cupsHTML, shop: shopHTML }[view] || hubHTML)();
  }

  // ---------- DLS New Career & Captain Selection ----------
  function newDraft() {
    const cap = KK.CAPTAINS[0];
    draft = {
      name: 'Dream FC',
      short: 'DFC',
      manager: 'Alex Hunter',
      captainId: cap.id,
      crest: { c1: '#0d2658', c2: '#00e5ff', pattern: 'sash', emblem: 'crown' },
      kit: { shirt: '#0d2658', shorts: '#071330' },
      players: KK.genSquad(57, 'en|es|it|de|fr', cap.id),
      career: { mode: 'dls' }
    };
  }
  function draftSquad() {
    const c = draft.career;
    if (c.mode === 'eu' && c.country) {
      const co = KK.country(c.country);
      draft.players = KK.genSquad(KK.tierBase(co, c.tier) - 3, co.style, draft.captainId);
    } else {
      draft.players = KK.genSquad(57, 'en|es|it|de|fr', draft.captainId);
    }
  }
  function careerHTML() {
    const c = draft.career;
    let eu = '';
    if (c.mode === 'eu') {
      const q = euFilter.toLowerCase();
      const list = KK.COUNTRIES.filter(x => !q || x.name.toLowerCase().includes(q) || x.brand.toLowerCase().includes(q));
      const co = c.country && KK.country(c.country);
      eu = `<input type="text" id="f-eusearch" placeholder="Search ${KK.COUNTRIES.length} nations…" value="${esc(euFilter)}" style="margin-top:10px">
      <div class="clist" id="clist">${list.map(x => `<button data-country="${x.code}" class="${c.country === x.code ? 'on' : ''}">${KK.flagSVG(x.flag, 30, 20)}<span><b>${esc(x.name)}</b><small>${esc(x.brand)} · ${x.tiers} tier${x.tiers > 1 ? 's' : ''}</small></span><span class="lv">OVR ${x.top}</span></button>`).join('')}</div>
      ${co ? `<label class="lbl">Starting Division</label><div class="chips">${Array.from({ length: co.tiers }, (_, i) => i + 1).map(t => `<button class="chip ${c.tier === t ? 'on' : ''}" data-tier="${t}">${esc(KK.tierName(co, t))} <small>~${KK.tierBase(co, t)}</small></button>`).join('')}</div>` : '<p style="font-size:13px;color:var(--mute)">Select a country to view its divisions.</p>'}`;
    }
    return `<div class="card"><h3>1. Career Pyramid</h3>
      <div class="chips">
        <button class="chip ${c.mode === 'dls' ? 'on' : ''}" data-mode="dls">🏆 Dream League Pyramid (8 Divisions)</button>
        <button class="chip ${c.mode === 'eu' ? 'on' : ''}" data-mode="eu">🌍 National Leagues (${KK.allLeagues().length})</button>
      </div>
      ${c.mode === 'dls' ? '<p style="font-size:13px;color:var(--mute);margin:8px 0 0">Begin in the <b>Academy Division</b> and climb through Amateur, Divisions 4–1, and Elite to reach the <b>Legendary Division</b>, competing in the Global Challenge Cup &amp; Diamond Cup.</p>' : eu}
    </div>`;
  }

  function builderHTML() {
    if (!draft) newDraft();
    const sw = (key, val) => KK.COLORS.map(c => `<button class="sw ${val === c ? 'on' : ''}" style="background:${c}" data-sw="${key}" data-c="${c}" aria-label="colour ${c}"></button>`).join('');
    const d = draft;
    const selCap = KK.CAPTAINS.find(c => c.id === d.captainId) || KK.CAPTAINS[0];
    return `<div class="hero">
      <div class="dls-badge">FIRST TOUCH EDITION · 100% OFFLINE</div>
      <div class="logo">⚽ DREAM LEAGUE SOCCER</div>
      <div class="dls-line"></div>
      <div style="color:var(--mute);font-size:13px">Sign your Captain, build your stadium complex, and lead your Dream Team to Legendary glory.</div>
    </div>
    ${careerHTML()}
    <div class="card"><h3>2. Select Your Marquee Captain</h3>
      <p style="font-size:13px;color:var(--mute);margin:0 0 10px">Choose a Legendary superstar to wear the captain's armband and lead your Academy squad.</p>
      <div class="cap-grid">
        ${KK.CAPTAINS.map(c => {
          const on = c.id === d.captainId;
          const n = KK.meta.natInfo(c.nat);
          return `<button class="cap-card ${on ? 'on' : ''}" data-cap="${c.id}">
            <div class="cap-top"><span class="cap-ovr">${c.rating}</span><span class="pos ${c.pos}">${c.pos}</span></div>
            <div class="cap-face">${KK.meta.faceSVG(c, 58, c.pos === 'GK' ? '#00c853' : d.kit.shirt)}</div>
            <b class="cap-nm">${esc(c.name)}</b>
            <small>${KK.flagSVG(n.flag, 16, 11)} ${c.foot} · ${c.height}cm</small>
            <div class="cap-mini-st"><span>SPE ${c.stats.spe}</span><span>SHO ${c.stats.sho}</span><span>PAS ${c.stats.pas}</span></div>
          </button>`;
        }).join('')}
      </div>
      <div class="cap-spotlight">
        <div><b>Selected Captain: ${esc(selCap.name)} (${selCap.pos} · ${selCap.rating} OVR)</b><small style="display:block;color:var(--mute)">SPE ${selCap.stats.spe} · ACC ${selCap.stats.acc} · STA ${selCap.stats.sta} · CON ${selCap.stats.con} · STR ${selCap.stats.str} · TAC ${selCap.stats.tac} · PAS ${selCap.stats.pas} · SHO ${selCap.stats.sho}</small></div>
        <span class="tag-gold">CAPTAIN ©</span>
      </div>
    </div>
    <div class="card"><h3>3. Club &amp; Manager Identity</h3>
      <div class="row wrap">
        <div class="grow"><label class="lbl" style="margin-top:0">Club Name</label><input type="text" id="f-name" maxlength="22" value="${esc(d.name)}" placeholder="Dream FC"></div>
        <div style="width:110px"><label class="lbl" style="margin-top:0">3-Letter Tag</label><input type="text" id="f-short" maxlength="3" value="${esc(d.short)}" style="text-transform:uppercase"></div>
      </div>
      <label class="lbl">Manager Name</label>
      <input type="text" id="f-mgr" maxlength="22" value="${esc(d.manager || 'Alex Hunter')}" placeholder="Manager Name">
    </div>
    <div class="card"><h3>4. Club Crest &amp; Kit</h3>
      <div class="preview" id="pv">${KK.crestSVG(d.crest, 96, d.short)}${KK.kitSVG(d.kit.shirt, d.kit.shorts, 80)}</div>
      <label class="lbl">Primary Crest Colour</label><div class="swatches">${sw('c1', d.crest.c1)}</div>
      <label class="lbl">Secondary Accent Colour</label><div class="swatches">${sw('c2', d.crest.c2)}</div>
      <label class="lbl">Crest Pattern</label><div class="chips">${PATTERNS.map(p => `<button class="chip ${d.crest.pattern === p ? 'on' : ''}" data-pat="${p}">${p}</button>`).join('')}</div>
      <label class="lbl">Crest Emblem</label><div class="chips">${EMBLEMS.map(p => `<button class="chip ${d.crest.emblem === p ? 'on' : ''}" data-emb="${p}">${p}</button>`).join('')}</div>
      <label class="lbl">Home Shirt</label><div class="swatches">${sw('shirt', d.kit.shirt)}</div>
      <label class="lbl">Home Shorts</label><div class="swatches">${sw('shorts', d.kit.shorts)}</div>
      <button class="btn sm alt" id="f-randcrest" style="margin-top:6px">🎲 Randomize Look</button>
    </div>
    <div class="card"><div class="row between"><h3>5. Academy Squad + Captain (${d.players.length})</h3><button class="btn sm alt" id="f-reroll">🎲 Reroll Squad</button></div>
      <ul class="plist">${d.players.slice().sort((a, b) => b.rating - a.rating).slice(0, 8).map(p => `<li>${KK.meta.faceSVG(p, 36, p.pos === 'GK' ? '#00c853' : d.kit.shirt)}<span class="pos ${p.pos}">${p.pos}</span><div class="pname"><b>${esc(p.name)} ${p.isCaptain ? '<span class="cap-badge">C</span>' : ''}</b><small>Age ${p.age} · SPE ${p.stats.spe} SHO ${p.stats.sho} PAS ${p.stats.pas} TAC ${p.stats.tac}</small></div><span class="rt ${p.rating >= 80 ? 'leg' : ''}">${p.rating}</span></li>`).join('')}</ul>
    </div>
    <button class="playbtn" id="f-start" style="margin:14px 0 32px">BEGIN DREAM LEAGUE CAREER ▶</button>`;
  }

  // ---------- DLS Career Hub (Main Menu) ----------
  function lvBar() {
    const L = KK.meta.levelInfo(save), ovr = KK.myRating(save);
    return `<div class="lvbar">
      <span>REP LV ${L.lv}</span>
      <i><b style="width:${Math.round(L.cur / L.need * 100)}%"></b></i>
      <small>TEAM RATING <b>${ovr}</b> · ${L.cur}/${L.need} XP</small>
    </div>`;
  }

  function hubHTML() {
    const s = save.season, f = KK.nextFixture(save), t = KK.table(save), pos = t.findIndex(r => r.id === 'ME') + 1;
    const len = KK.settings.len || 3, L = KK.meta.levelInfo(save);
    const stObj = KK.STADIUM[Math.min(KK.STADIUM.length - 1, save.stadium || 0)];
    let play = `<div class="playcard"><div class="pl-head"><span>${esc(KK.leagueName(save))}</span></div><p style="text-align:center">Season complete.</p></div>`;
    if (f) {
      const home = f.h === 'ME', opp = KK.teamById(save, home ? f.a : f.h);
      play = `<div class="playcard">
        <div class="pl-head"><span>🏆 ${esc(KK.leagueName(save)).toUpperCase()}</span><span>MATCHDAY ${s.round + 1}/${s.fixtures.length} · ${home ? 'HOME' : 'AWAY'}</span></div>
        <div class="pl-vs">
          <div>${KK.crestSVG(save.team.crest, 64, save.team.short)}<b>${esc(save.team.short)}</b><small>OVR ${KK.myRating(save)} · ${KK.meta.starsHTML(KK.myRating(save))}</small></div>
          <div class="pl-v">VS</div>
          <div>${crestOf(opp, 64)}<b>${esc(opp.short)}</b><small>OVR ${opp.rating} · ${KK.meta.starsHTML(opp.rating)}</small></div>
        </div>
        <div class="pl-opp">${esc(opp.name)} · 🏟️ ${home ? esc(stObj.name) + ' (' + stObj.cap.toLocaleString() + ')' : 'Away Arena'}</div>
        <button class="playbtn" id="h-play"><span>KICK OFF</span> ▶</button>
        <div class="pl-foot">
          <div class="chips">${[2, 3, 5].map(m => `<button class="chip ${len === m ? 'on' : ''}" data-len="${m}">${m} min</button>`).join('')}</div>
          <button class="btn sm alt" id="h-sim">⏩ Quick Sim</button>
        </div>
      </div>`;
    }
    const tile = (go, ic, name, sub, id, cls) => `<button class="tile ${cls || ''}" ${go ? `data-go="${go}"` : ''} ${id ? `id="${id}"` : ''}><span class="ti-ic">${ic}</span><b>${name}</b><small>${sub}</small></button>`;
    const totalCoaches = ['tech', 'fit', 'gk'].reduce((sum, k) => sum + ((save.coaches && save.coaches[k]) ? (save.coaches[k].c + save.coaches[k].r + save.coaches[k].l) : 0), 0);
    const legMarket = (save.market || []).filter(p => p.rating >= 80).length;
    const tiles = [
      tile('squad', '👕', 'Team Mgmt', `XI · ${save.formation} · Roles`),
      tile('market', '⚡', 'Live Transfers', `${legMarket} Legendary · Scouts &amp; Agents`, null, 'hl-cyan'),
      tile('training', '📋', 'Coaches', `${totalCoaches} Coaches · Physio`),
      tile('stadium', '🏟️', 'Stadium &amp; Club', `${esc(stObj.name)} (${(stObj.cap / 1000)}k)`),
      tile('league', '📊', 'Division Table', `${ord(pos)} in ${esc(KK.leagueName(save))}`),
      tile('cups', '🌍', 'Global Cups', 'Global Challenge &amp; Diamond Cup'),
      tile(null, '🤝', 'Exhibition', 'Play any international club', 'h-friendly'),
      tile('shop', '💎', 'Club Vault', 'Exchange Gems &amp; Coach Bundles'),
      tile('settings', '⚙️', 'Settings', 'Camera, Graphics, Save Backup'),
    ].join('');
    const hist = (save.history || []).slice(-5).reverse();
    const cupCards = ['shield', 'crown'].map(k => {
      const cup = save.cups && save.cups[k]; if (!cup || !cup.userIn) return '';
      const def = KK.CUPS[k], uf = KK.cupUserFixture(save, cup);
      if (!uf) return `<div class="card cupcard"><div class="cuphead"><span class="ic">${def.icon}</span><div><h3>${def.name}</h3><small>${cup.winner === 'ME' ? '🏆 Champions!' : cup.userOut ? 'Eliminated this season.' : 'Awaiting next knockout draw.'}</small></div></div></div>`;
      const home = uf.h === 'ME', opp = KK.cupTeam(cup, home ? uf.a : uf.h), due = KK.cupDue(save, cup);
      return `<div class="card cupcard"><div class="cuphead"><span class="ic">${def.icon}</span><div><h3>${def.name}</h3><small>${KK.CUP_STAGE[cup.md]} · ${home ? 'HOME' : 'AWAY'} vs <b>${esc(opp.name)}</b> (OVR ${opp.rating})</small></div></div>
        ${due ? `<div class="row" style="margin-top:10px"><button class="btn grow" data-cupplay="${k}">▶ PLAY CUP MATCH</button><button class="btn alt" data-cupsim="${k}">⏩ Sim</button></div>` : `<p style="font-size:12px;color:var(--mute);margin:6px 0 0">Unlocks after Division Matchday ${KK.CUP_DUE[cup.md]}.</p>`}</div>`;
    }).join('');
    return `${lvBar()}<div class="hubgrid">${play}<div class="tiles">${tiles}</div></div>
    ${cupCards}
    ${objHTML()}
    <div class="card"><h3>Recent Match Results</h3>${hist.length ? hist.map(h => `<div class="fx"><span><span class="res ${h.res}">${h.res}</span>${h.cup ? KK.CUPS[h.cup].icon + ' ' : ''}vs ${esc(h.opp)}</span><span class="sc">${h.my} - ${h.op}</span></div>`).join('') : '<p style="color:var(--mute)">No matches played yet. Tap Kick Off to start your Dream League season!</p>'}</div>`;
  }

  function objHTML() {
    return `<div class="card"><div class="row between"><h3>🎯 Board Season Objectives</h3><small style="color:var(--mute)">Season ${save.season.year}</small></div>${save.obj.list.map(o => `<div class="obj ${o.done ? 'done' : ''}"><div class="row between"><span>${o.done ? '✅' : '🎯'} ${esc(o.txt)}</span><span class="ob-r">🪙${o.r} +${o.g || 5}${GEM}</span></div><div class="bar"><b style="width:${Math.round(o.p / o.n * 100)}%"></b></div><small>${o.p}/${o.n}</small></div>`).join('')}</div>`;
  }

  // ---------- Team Management (Formation, Mentality, Set-Piece Roles & Drag-and-Drop XI) ----------
  const fitCol = f => f > 70 ? '#00e676' : f > 45 ? '#ffd600' : '#ff5252';
  const fitBar = p => { const f = p.fit == null ? 100 : p.fit; return `<i class="fit"><b style="width:${f}%;background:${fitCol(f)}"></b></i>`; };

  function squadHTML() {
    const slots = KK.FORMATIONS[save.formation] || KK.FORMATIONS['4-4-2'];
    const xi = save.lineup.map(id => save.players.find(p => p.id === id));
    const shirtHex = pos => pos === 'GK' ? '#00c853' : save.team.kit.shirt;
    const capId = save.roles && save.roles.captain;
    const dots = slots.map((s, i) => {
      const p = xi[i]; const bad = p && p.pos !== s[0];
      const isCap = p && p.id === capId;
      return `<div class="slot ${selSlot === i ? 'sel' : ''} ${bad ? 'bad' : ''}" data-slot="${i}" data-drag="s${i}" style="left:${s[2] * 100}%;top:${(1 - s[1] / 0.72) * 88 + 6}%"><div class="dot" style="background:${shirtHex(s[0])};color:${KK.colorDist(save.team.kit.shirt, '#ffffff') < 150 && s[0] !== 'GK' ? '#111' : '#fff'}">${p ? `${KK.meta.faceSVG(p, 34, shirtHex(s[0]))}<em class="slot-ovr">${p.rating}</em>${isCap ? '<b class="slot-cap">C</b>' : ''}` : '-'}</div><span>${p ? esc(surname(p.name)) : '?'}</span>${p ? fitBar(p) : ''}</div>`;
    }).join('');
    const inXI = new Set(save.lineup), order = { GK: 0, DF: 1, MF: 2, FW: 3 };
    const bench = save.players.filter(p => !inXI.has(p.id)).sort((a, b) => order[a.pos] - order[b.pos] || b.rating - a.rating);
    const tired = save.players.filter(p => (p.fit == null ? 100 : p.fit) < 100).length;
    const healCost = Math.max(40, Math.round(tired * 20 * (1 - ((save.facilities && save.facilities.medical) || 0) * 0.1)));
    const roles = save.roles || {};
    const roleOpt = roleKey => xi.filter(Boolean).map(p => `<option value="${p.id}" ${roles[roleKey] === p.id ? 'selected' : ''}>${esc(surname(p.name))} (${p.pos} · ${p.rating})</option>`).join('');

    return `<div class="card">
      <div class="row between wrap">
        <h3>👕 Team Management · OVR <span style="color:var(--gold)">${KK.myRating(save)}</span></h3>
        <div class="row" style="gap:6px">
          <button class="btn sm alt" id="s-auto">⚡ Best XI</button>
          <button class="btn sm" id="t-coinphysio" ${!tired || save.coins < healCost ? 'disabled' : ''}>🩺 Heal Squad 🪙${healCost}</button>
        </div>
      </div>
      <label class="lbl">Tactical Formation</label>
      <div class="chips">${Object.keys(KK.FORMATIONS).map(f => `<button class="chip ${save.formation === f ? 'on' : ''}" data-form="${f}">${f}</button>`).join('')}</div>
      <p style="font-size:12px;color:var(--mute);margin:8px 0">${selSlot === null ? 'Drag any player on the pitch or bench to swap positions, or tap two players.' : 'Tap another pitch slot or substitute to complete swap.'}</p>
      <div class="teamwrap">
        <div class="mini-pitch" id="minipitch">${dots}</div>
        <div class="benchbox">
          <h4>SUBSTITUTES (${bench.length}) · SQUAD ${save.players.length}/${KK.maxSquadSize(save)}</h4>
          <div class="bench">${bench.map(p => `<div class="bp" data-pid="${p.id}" data-drag="p${p.id}">${KK.meta.faceSVG(p, 28, shirtHex(p.pos))}<span class="pos ${p.pos}">${p.pos}</span><b>${esc(surname(p.name))}</b><span class="rt ${p.rating >= 80 ? 'leg' : ''}">${p.rating}</span>${fitBar(p)}</div>`).join('')}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <h3>🎯 Club Roles &amp; Set-Piece Takers</h3>
      <div class="roles-grid">
        <div><label class="lbl">Captain ©</label><select class="sel" data-role="captain">${roleOpt('captain')}</select></div>
        <div><label class="lbl">Penalty Taker</label><select class="sel" data-role="pk">${roleOpt('pk')}</select></div>
        <div><label class="lbl">Free Kick Taker</label><select class="sel" data-role="fk">${roleOpt('fk')}</select></div>
        <div><label class="lbl">Corner Taker</label><select class="sel" data-role="ck">${roleOpt('ck')}</select></div>
      </div>
    </div>
    <div class="card"><h3>Starting XI Roster</h3><ul class="plist">${xi.map((p, i) => p ? `<li class="xi" data-pid="${p.id}">${KK.meta.faceSVG(p, 38, shirtHex(p.pos))}<span class="pos ${p.pos}">${p.pos}</span><div class="pname"><b>${esc(p.name)} ${p.id === capId ? '<span class="cap-badge">C</span>' : ''}</b><small>${slots[i][0]} · SPE ${p.stats.spe} SHO ${p.stats.sho} PAS ${p.stats.pas} TAC ${p.stats.tac} · ${fitBar(p)} ${p.fit == null ? 100 : p.fit}%</small></div>${KK.meta.starsHTML(p.rating)}<span class="rt ${p.rating >= 80 ? 'leg' : ''}">${p.rating}</span></li>` : '').join('')}</ul></div>`;
  }

  // ---------- Coaches & Player Development ----------
  function trainingHTML() {
    const order = { GK: 0, DF: 1, MF: 2, FW: 3 }, inXI = new Set(save.lineup);
    const list = save.players.slice().sort((a, b) => (inXI.has(b.id) - inXI.has(a.id)) || order[a.pos] - order[b.pos] || b.rating - a.rating);
    const tired = save.players.filter(p => (p.fit == null ? 100 : p.fit) < 100).length;
    const medLv = (save.facilities && save.facilities.medical) || 0;
    const healCoins = Math.max(40, Math.round(tired * 20 * (1 - medLv * 0.1)));
    const shirtHex = pos => pos === 'GK' ? '#00c853' : save.team.kit.shirt;
    const coaches = save.coaches || { tech: { c: 0, r: 0, l: 0 }, fit: { c: 0, r: 0, l: 0 }, gk: { c: 0, r: 0, l: 0 } };
    const curC = coaches[coachType] || { c: 0, r: 0, l: 0 };
    const trLv = (save.facilities && save.facilities.training) || 0;
    const gemCosts = { c: Math.max(8, Math.round(15 * (1 - trLv * 0.06))), r: Math.max(20, Math.round(35 * (1 - trLv * 0.06))), l: Math.max(45, Math.round(75 * (1 - trLv * 0.06))) };

    return `<div class="card">
      <div class="row between wrap">
        <div><h3>📋 DLS Coaches Center</h3><small style="color:var(--mute)">Use Technical, Fitness &amp; GK Coaches to trigger multi-stat upgrades &amp; breakthroughs.</small></div>
        <span class="tag-gold">Training Lv ${trLv}/5 (-${trLv * 7}% Cost)</span>
      </div>
      <div class="chips" style="margin:10px 0">
        <button class="chip ${coachType === 'tech' ? 'on' : ''}" data-ctype="tech">⚽ Technical (SHO/PAS/CON/TAC)</button>
        <button class="chip ${coachType === 'fit' ? 'on' : ''}" data-ctype="fit">⚡ Fitness (SPE/ACC/STA/STR)</button>
        <button class="chip ${coachType === 'gk' ? 'on' : ''}" data-ctype="gk">🧤 Goalkeeping (GKH/GKR)</button>
      </div>
      <div class="coach-grid">
        ${[['c', 'Common Coach', '+1 OVR · 1 Stat', '#90a4ae'], ['r', 'Rare Coach', '+1–2 OVR · 2 Stats', '#2979ff'], ['l', 'Legendary Coach', '+2–3 OVR · 3 Stats', '#ffd54f']].map(([tier, name, sub, col]) => {
          const owned = curC[tier] || 0, gCost = gemCosts[tier];
          return `<div class="coach-card" style="border-color:${col}">
            <b style="color:${col}">${name}</b>
            <small>${sub}</small>
            <div class="coach-cnt">Owned: <b>${owned}</b></div>
            <button class="btn sm ${owned > 0 ? '' : 'alt'}" data-usecoach="${coachType}:${tier}" ${owned <= 0 && save.gold < gCost ? 'disabled' : ''}>
              ${owned > 0 ? 'Use Coach (1)' : `Hire · ${gCost}${GEM}`}
            </button>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="card">
      <div class="row between wrap">
        <div><h3>🩺 Medical &amp; Physio Room</h3><small style="color:var(--mute)">${tired} player${tired === 1 ? '' : 's'} below 100% stamina · Medical Facility Lv ${medLv}/5</small></div>
        <div class="row" style="gap:6px">
          <button class="btn sm alt" id="t-coinphysio" ${!tired || save.coins < healCoins ? 'disabled' : ''}>Heal All · 🪙${healCoins}</button>
          <button class="btn sm" id="t-physio" ${save.gold < 5 || !tired ? 'disabled' : ''}>Instant · 5${GEM}</button>
        </div>
      </div>
    </div>
    <div class="card"><h3>🏋️ Squad Individual Coaching (${save.players.length}/${KK.maxSquadSize(save)})</h3>
      <p style="font-size:12px;color:var(--mute);margin:4px 0">Tap any player to inspect their 8-stat DLS card, or release surplus players to earn Coach tokens.</p>
      <ul class="plist">${list.map(p => {
        const slot = save.lineup.indexOf(p.id), cost = KK.trainCost(p, save);
        return `<li class="${slot >= 0 ? 'xi' : ''}" data-pid="${p.id}">${KK.meta.faceSVG(p, 38, shirtHex(p.pos))}<span class="pos ${p.pos}">${p.pos}</span><div class="pname"><b>${esc(p.name)}</b><small>${slot >= 0 ? 'XI' : 'SUB'} · SPE ${p.stats.spe} SHO ${p.stats.sho} PAS ${p.stats.pas} TAC ${p.stats.tac} · ${fitBar(p)} ${p.fit == null ? 100 : p.fit}%</small></div><span class="rt ${p.rating >= 80 ? 'leg' : ''}">${p.rating}</span>
        <div style="display:flex;flex-direction:column;gap:4px"><button class="btn sm" data-train="${p.id}" ${p.rating >= 99 || save.coins < cost ? 'disabled' : ''}>+1 OVR<br><small>🪙${cost}</small></button>${slot < 0 ? `<button class="btn sm red" data-sell="${p.id}">Release</button>` : ''}</div></li>`;
      }).join('')}</ul>
    </div>`;
  }

  function cardModal(p) {
    const cost = KK.trainCost(p, save), mine = save.players.includes(p);
    const shirt = p.pos === 'GK' ? '#00c853' : (mine && save.team && save.team.kit ? save.team.kit.shirt : '#1e429f');
    modal(`${KK.meta.cardHTML(p, { shirt })}${mine ? `<div class="row" style="margin-top:10px"><button class="btn alt grow" data-close>Close</button><button class="btn grow" data-train="${p.id}" data-incard="1" ${p.rating >= 99 || save.coins < cost ? 'disabled' : ''}>Coach +1 OVR · 🪙${cost}</button></div>` : '<button class="btn alt block" data-close style="margin-top:10px">Close</button>'}`, 'cardmodal');
  }

  // ---------- Live Transfer Market, Scouts & Secret Agents ----------
  function marketHTML() {
    const maxSq = KK.maxSquadSize(save);
    const recLv = (save.facilities && save.facilities.recruitment) || 0;
    const disc = KK.transferDiscount(save);
    const scCommon = Math.round(120 * disc), scRare = Math.round(350 * disc), scLeg = Math.round(720 * disc);
    const scouted = save.scouted || [];

    return `<div class="card">
      <div class="row between wrap">
        <div><h3>🕵️ Secret Agents &amp; Scouts</h3><small style="color:var(--mute)">Recruitment Lv ${recLv}/5 (-${recLv * 5}% Fees) · Squad ${save.players.length}/${maxSq}</small></div>
      </div>
      <div class="agent-grid">
        <div class="agent-box rare">
          <div class="ag-badge">RARE AGENT</div>
          <b>73–80 OVR Star</b>
          <small>Guaranteed Rare Footballer</small>
          <button class="btn sm alt" id="ag-rare" ${save.gold < 75 || save.players.length >= maxSq ? 'disabled' : ''}>Sign Agent · 75${GEM}</button>
        </div>
        <div class="agent-box leg">
          <div class="ag-badge">LEGENDARY AGENT</div>
          <b>81–90 OVR Superstar</b>
          <small>Guaranteed Gold Foil Legend</small>
          <button class="btn sm" id="ag-leg" ${save.gold < 160 || save.players.length >= maxSq ? 'disabled' : ''}>Sign Agent · 160${GEM}</button>
        </div>
      </div>
      <label class="lbl">Dispatch Transfer Scouts (3 Discounted Targets)</label>
      <div class="row wrap" style="gap:6px">
        <button class="btn sm alt grow" data-scout="common" ${save.coins < scCommon ? 'disabled' : ''}>🔭 Common Scout · 🪙${scCommon}</button>
        <button class="btn sm alt grow" data-scout="rare" ${save.coins < scRare ? 'disabled' : ''}>🔭 Rare Scout · 🪙${scRare}</button>
        <button class="btn sm grow" data-scout="legendary" ${save.coins < scLeg ? 'disabled' : ''}>🌟 Legendary Scout · 🪙${scLeg}</button>
      </div>
      ${scouted.length ? `<div class="scout-results"><h4>🎯 Active Scout Report (${scouted.length})</h4><ul class="plist">${scouted.map(p => `<li data-pid="${p.id}">${KK.meta.faceSVG(p, 40, p.pos === 'GK' ? '#00c853' : '#1e429f')}<span class="pos ${p.pos}">${p.pos}</span><div class="pname"><b>${esc(p.name)} <span class="tier-pill ${p.tier}">${p.tier.toUpperCase()}</span></b><small>Age ${p.age} · SPE ${p.stats.spe} SHO ${p.stats.sho} PAS ${p.stats.pas} TAC ${p.stats.tac}</small></div><span class="rt ${p.rating >= 80 ? 'leg' : ''}">${p.rating}</span><button class="btn sm" data-buyscout="${p.id}" ${save.coins < p.price || save.players.length >= maxSq ? 'disabled' : ''}>Sign<br><small>🪙${p.price.toLocaleString()}</small></button></li>`).join('')}</ul></div>` : ''}
    </div>
    <div class="card">
      <div class="row between wrap">
        <h3>⚡ Live Transfer Market (${(save.market || []).length})</h3>
        <div class="row" style="gap:6px">
          <button class="btn sm alt" id="mk-refresh">🔄 Refresh 🪙80</button>
          <button class="btn sm alt" id="mk-goldref" ${save.gold < 5 ? 'disabled' : ''}>⚡ Instant 5${GEM}</button>
        </div>
      </div>
      <p style="font-size:12px;color:var(--mute);margin:4px 0">Refreshes automatically after every match. Tap 🔒 to lock a target on the market so they don't leave.</p>
      <ul class="plist">${(save.market || []).map(p => {
        const tier = p.rating >= 80 ? 'legendary' : p.rating >= 70 ? 'rare' : 'common';
        return `<li data-pid="${p.id}" class="mk-row ${tier}">${KK.meta.faceSVG(p, 42, p.pos === 'GK' ? '#00c853' : '#1e429f')}<span class="pos ${p.pos}">${p.pos}</span><div class="pname"><b>${esc(p.name)} <span class="tier-pill ${tier}">${tier.toUpperCase()}</span></b><small>Age ${p.age} · ${p.foot || 'R'} · SPE ${p.stats.spe} SHO ${p.stats.sho} PAS ${p.stats.pas} TAC ${p.stats.tac}</small></div><span class="rt ${p.rating >= 80 ? 'leg' : ''}">${p.rating}</span><button class="icon-btn" data-lock="${p.id}" title="Lock player">${p.locked ? '🔒' : '🔓'}</button><button class="btn sm" data-buy="${p.id}" ${save.coins < p.price || save.players.length >= maxSq ? 'disabled' : ''}>Sign<br><small>🪙${p.price.toLocaleString()}</small></button></li>`;
      }).join('') || '<li>No players currently listed.</li>'}</ul>
    </div>`;
  }

  // ---------- Division Table & Fixtures ----------
  function leagueHTML() {
    const s = save.season, t = KK.table(save);
    const nT = KK.numTiers(save), top = s.div === 1 ? 4 : 2;
    const nextDiv = s.div - 1;
    const reqCap = KK.career(save).mode === 'dls' && KK.DLS_DIVISIONS[nextDiv] ? KK.DLS_DIVISIONS[nextDiv].reqCap : 0;
    const myCap = KK.STADIUM[Math.min(KK.STADIUM.length - 1, save.stadium || 0)].cap;
    const rows = t.map((r, i) => `<tr class="${r.id === 'ME' ? 'me' : ''} ${(i < 2 && s.div > 1) || i < top ? 'up' : ''} ${i >= 6 && s.div < nT ? 'down' : ''}"><td>${i + 1}</td><td class="tn">${esc(r.name)}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF - r.GA > 0 ? '+' : ''}${r.GF - r.GA}</td><td><b>${r.Pts}</b></td></tr>`).join('');
    const name = id => esc(KK.teamById(save, id).name);
    const shown = Math.min(s.round, s.fixtures.length - 1);
    const rd = (n) => s.fixtures[n].map(f => `<div class="fx ${f.h === 'ME' || f.a === 'ME' ? 'me' : ''}"><span class="grow" style="text-align:right">${name(f.h)}</span><span class="sc" style="margin:0 8px">${f.hs == null ? 'v' : f.hs + ' - ' + f.as}</span><span class="grow">${name(f.a)}</span></div>`).join('');
    const mine = s.fixtures.map((r, i) => { const f = r.find(x => x.h === 'ME' || x.a === 'ME'); const home = f.h === 'ME'; const opp = KK.teamById(save, home ? f.a : f.h); const my = home ? f.hs : f.as, op = home ? f.as : f.hs; const res = my == null ? '' : my > op ? 'W' : my < op ? 'L' : 'D'; return `<div class="fx"><span>MD${i + 1} ${home ? '🏠' : '✈️'} ${esc(opp.name)}</span><span class="sc">${res ? `<span class="res ${res}">${res}</span>${my}-${op}` : '–'}</span></div>`; }).join('');
    return `<div class="card">
      <div class="row between wrap"><h3>🏆 ${esc(KK.leagueName(save))}</h3><button class="btn sm alt" data-go="cups">🌍 Global Cups</button></div>
      ${reqCap > 0 ? `<div class="cap-req ${myCap >= reqCap ? 'ok' : 'warn'}">${myCap >= reqCap ? '✅' : '⚠️'} Promotion Stadium Requirement: <b>${reqCap.toLocaleString()} seats</b> (Your Stadium: ${myCap.toLocaleString()})</div>` : ''}
      <table class="tbl"><tr><th>#</th><th style="text-align:left">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>${rows}</table>
      <p style="font-size:12px;color:var(--mute)">${s.div > 1 ? '🟩 Top 2 earn promotion (subject to Stadium capacity). ' : '🏆 Finish 1st to be crowned Legendary Division Champions! '}${s.div < nT ? '🟥 Bottom 2 are relegated.' : ''}</p>
    </div>
    <div class="card"><h3>Matchday ${shown + 1} ${s.round > shown ? 'Results' : 'Fixtures'}</h3>${rd(s.round > 0 && s.round >= s.fixtures.length ? s.fixtures.length - 1 : (s.round > 0 ? s.round - 1 : 0))}</div>
    <div class="card"><h3>Season Schedule</h3>${mine}</div>`;
  }

  // ---------- My Club (Stadium & 5 Club Facilities + Kits & Trophies) ----------
  function facilitiesHTML() {
    const stLv = Math.min(KK.STADIUM.length - 1, save.stadium || 0);
    const st = KK.STADIUM[stLv], nxSt = KK.STADIUM[stLv + 1];
    const facs = save.facilities || {};
    return `<div class="card">
      <div class="row between wrap">
        <h3>🏛️ Dream Club Complex &amp; Facilities</h3>
        <button class="btn sm alt" data-go="stadium">🏟️ 3D Stadium View</button>
      </div>
      <div class="fac-grid">
        <div class="fac-card">
          <div class="fac-top"><span class="fac-ic">🏟️</span><div><b>Stadium: ${esc(st.name)}</b><small>Lv ${stLv + 1}/${KK.STADIUM.length} · ${st.cap.toLocaleString()} Capacity · +🪙${st.bonus}/home game</small></div></div>
          <div class="bar"><b style="width:${Math.round((stLv + 1) / KK.STADIUM.length * 100)}%"></b></div>
          ${nxSt ? `<button class="btn sm block" id="c-stadium" style="margin-top:8px" ${save.coins < nxSt.cost ? 'disabled' : ''}>Expand to ${nxSt.cap.toLocaleString()} seats · 🪙${nxSt.cost.toLocaleString()}</button>` : '<small style="color:var(--gold)">🏆 Max Legendary Capacity Reached</small>'}
        </div>
        ${Object.entries(KK.FACILITIES).map(([key, def]) => {
          const lv = facs[key] || 0, max = 5;
          const gCost = def.costs[lv + 1], cCost = def.coinCosts[lv + 1];
          return `<div class="fac-card">
            <div class="fac-top"><span class="fac-ic">${def.icon}</span><div><b>${def.name}</b><small>Lv ${lv}/${max} · ${def.effect(lv)}</small></div></div>
            <div class="bar"><b style="width:${Math.round(lv / max * 100)}%"></b></div>
            <p style="font-size:11px;color:var(--mute);margin:4px 0">${def.desc}</p>
            ${lv < max ? `<div class="row" style="gap:6px;margin-top:6px">
              <button class="btn sm alt grow" data-upfac="${key}:coins" ${save.coins < cCost ? 'disabled' : ''}>🪙${cCost.toLocaleString()}</button>
              <button class="btn sm grow" data-upfac="${key}:gems" ${save.gold < gCost ? 'disabled' : ''}>${gCost}${GEM}</button>
            </div>` : '<small style="color:var(--gold)">✅ Max Level 5</small>'}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  function clubHTML() {
    const st = save.stats || {};
    return `<div class="card clubhead"><div class="row">${KK.crestSVG(save.team.crest, 84, save.team.short)}<div class="grow"><h2 style="margin:0">${esc(save.team.name)}</h2><small style="color:var(--mute)">Manager: <b>${esc(save.manager || 'Alex Hunter')}</b> · ${esc(KK.leagueName(save))} · Season ${save.season.year}</small>${lvBar()}<div class="row wrap" style="gap:6px"><span class="coins">${save.coins.toLocaleString()}</span><span class="goldk">${save.gold.toLocaleString()}</span></div></div></div></div>
    ${facilitiesHTML()}
    <div class="card"><div class="row between"><h3>👕 Custom Kits &amp; Crest</h3><button class="btn sm" data-go="kit">✏️ Customize</button></div><div class="row" style="justify-content:space-around"><div style="text-align:center">${KK.meta.kitSVG(save.team.kit, 54)}<br><small>HOME</small></div><div style="text-align:center">${KK.meta.kitSVG(save.team.away, 54)}<br><small>AWAY</small></div><div style="text-align:center">${KK.crestSVG(save.team.crest, 70, save.team.short)}<br><small>CREST</small></div></div></div>
    <div class="row"><div class="stat"><small>Wins</small><span class="big-num">${st.wins || 0}</span></div><div class="stat"><small>Goals</small><span class="big-num">${st.goals || 0}</span></div><div class="stat"><small>Clean Sheets</small><span class="big-num">${st.clean || 0}</span></div><div class="stat"><small>MOTM</small><span class="big-num">${st.motm || 0}</span></div></div>
    <div class="card"><h3>🏅 Career Achievements (${Object.keys(save.ach).length}/${KK.meta.ACH.length})</h3><div class="achgrid">${KK.meta.ACH.map(a => `<div class="ach ${save.ach[a.id] ? 'on' : ''}"><span>${a.ic}</span><b>${a.name}</b><small>${a.txt}</small><em>🪙${a.c} · +${a.g}${GEM}</em></div>`).join('')}</div></div>
    ${objHTML()}
    <div class="card"><h3>🏆 Club Trophy Cabinet</h3>${(save.trophies || []).length ? save.trophies.map(t => `<div class="fx"><span>${t.cup ? KK.CUPS[t.cup].icon : '🏆'} ${esc(t.name || `Division ${t.d} Champions`)}</span><span>Season ${t.y}</span></div>`).join('') : '<p style="color:var(--mute)">Win a division title or Global Cup to display silverware here.</p>'}</div>`;
  }

  // ---------- Kit & Crest Editor ----------
  function kitHTML() {
    const c = save.team.crest, k = kitTab === 'away' ? save.team.away : save.team.kit;
    const sw = (tgt, key, val) => KK.COLORS.map(col => `<button class="sw ${val === col ? 'on' : ''}" style="background:${col}" data-ksw="${tgt}:${key}" data-c="${col}" aria-label="colour ${col}"></button>`).join('');
    const tabs = `<div class="chips tabs">${[['home', '🏠 Home Kit'], ['away', '✈️ Away Kit'], ['crest', '🛡️ Club Crest']].map(([x, t]) => `<button class="chip ${kitTab === x ? 'on' : ''}" data-kittab="${x}">${t}</button>`).join('')}</div>`;
    const stage = `<div class="kit-stage"><div class="kit-main">${kitTab === 'crest' ? KK.crestSVG(c, 160, save.team.short) : KK.meta.kitSVG(k, 118)}</div><div class="kit-side">${KK.crestSVG(c, 46, save.team.short)}<div>${KK.meta.kitSVG(save.team.kit, 34)}<small>HOME</small></div><div>${KK.meta.kitSVG(save.team.away, 34)}<small>AWAY</small></div></div></div>`;
    let ctl;
    if (kitTab === 'crest') ctl = `<label class="lbl">Primary Colour</label><div class="swatches">${sw('crest', 'c1', c.c1)}</div>
      <label class="lbl">Secondary Colour</label><div class="swatches">${sw('crest', 'c2', c.c2)}</div>
      <label class="lbl">Pattern</label><div class="chips">${PATTERNS.map(p => `<button class="chip ${c.pattern === p ? 'on' : ''}" data-cpat="${p}">${p}</button>`).join('')}</div>
      <label class="lbl">Emblem</label><div class="chips">${EMBLEMS.map(p => `<button class="chip ${c.emblem === p ? 'on' : ''}" data-cemb="${p}">${p}</button>`).join('')}</div>`;
    else ctl = `<label class="lbl">Kit Pattern</label><div class="chips">${KK.meta.PATTERNS.map(([p, n]) => `<button class="chip ${k.pattern === p ? 'on' : ''}" data-kpat="${p}">${n}${p === 'kente' && !save.unlocks.kente ? ` 🔒 ${KK.meta.KENTE_COST}${GEM}` : ''}</button>`).join('')}</div>
      <label class="lbl">Shirt</label><div class="swatches">${sw('kit', 'shirt', k.shirt)}</div>
      <label class="lbl">Trim &amp; Pattern</label><div class="swatches">${sw('kit', 'c2', k.c2)}</div>
      <label class="lbl">Shorts</label><div class="swatches">${sw('kit', 'shorts', k.shorts)}</div>
      <label class="lbl">Socks</label><div class="swatches">${sw('kit', 'socks', k.socks)}</div>`;
    return `<div class="card kited"><div class="row between"><h3>👕 Kit &amp; Crest Studio</h3><button class="btn sm alt" data-go="club">Done</button></div>${tabs}${stage}${ctl}</div>`;
  }

  // ---------- Stadium Architect ----------
  function stadiumSVG(lv) {
    const crowd = (x, y, w, h, n) => { let s = ''; const cols = ['#00e5ff', '#ffd54f', '#00e676', '#1e88e5', '#ffffff', '#ff5252']; for (let i = 0; i < n; i++) { const cx = x + ((i * 37) % 100) / 100 * w, cy = y + ((i * 61) % 100) / 100 * h; s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.3" fill="${cols[i % cols.length]}"/>`; } return s; };
    const stand = (pts, x, y, w, h, n, fill = '#1c356e') => `<polygon points="${pts}" fill="${fill}" stroke="#081430" stroke-width="1"/>${crowd(x, y, w, h, n)}`;
    let s = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#040a1a"/><stop offset="1" stop-color="#11285c"/></linearGradient><linearGradient id="grs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ea336"/><stop offset="1" stop-color="#2c7d26"/></linearGradient></defs><rect width="320" height="190" fill="url(#sky)"/>`;
    for (let i = 0; i < 28; i++) s += `<circle cx="${(i * 47) % 320}" cy="${(i * 29) % 70}" r=".8" fill="#fff" opacity=".6"/>`;
    const fh = 16 + lv * 6.5;
    s += stand(`40,${112 - fh} 280,${112 - fh} 296,112 24,112`, 40, 112 - fh + 3, 240, fh - 6, 40 + lv * 35);
    if (lv >= 3) s += `<polygon points="34,${108 - fh} 286,${108 - fh} 280,${114 - fh} 40,${114 - fh}" fill="#00e5ff" opacity="0.65"/>`;
    if (lv >= 1) { s += stand('4,170 24,112 36,112 26,170', 8, 116, 20, 50, 25 + lv * 8); s += stand('316,170 296,112 284,112 294,170', 290, 116, 20, 50, 25 + lv * 8); }
    s += `<polygon points="36,114 284,114 312,178 8,178" fill="url(#grs)"/>`;
    for (let i = 0; i < 6; i++) s += `<polygon points="${36 + i * 41.3},114 ${36 + (i + 0.5) * 41.3},114 ${8 + (i + 0.5) * 50.7},178 ${8 + i * 50.7},178" fill="#ffffff10"/>`;
    s += `<polygon points="36,114 284,114 312,178 8,178" fill="none" stroke="#fff" stroke-width="1.2"/><line x1="160" y1="114" x2="160" y2="178" stroke="#fff" stroke-width="1"/><ellipse cx="160" cy="144" rx="24" ry="8" fill="none" stroke="#fff" stroke-width="1"/>`;
    if (lv >= 1) s += stand(`0,190 320,190 320,${184 - lv * 1.4} 0,${184 - lv * 1.4}`, 4, 186 - lv * 1.4, 312, 3, 60, '#132654');
    s += `<rect x="40" y="110" width="240" height="4.5" fill="#06122c"/><text x="160" y="113.5" font-size="3.4" fill="#00e5ff" text-anchor="middle" font-weight="900" font-family="Arial">DREAM LEAGUE SOCCER · GLOBAL CHALLENGE CUP · FIRST TOUCH</text>`;
    if (lv >= 2) [[30, 112 - fh - 16], [290, 112 - fh - 16]].forEach(([x, y]) => { s += `<line x1="${x}" y1="${y + 6}" x2="${x}" y2="112" stroke="#8fa3c9" stroke-width="2"/><rect x="${x - 9}" y="${y}" width="18" height="7" rx="1" fill="#fffde7"/><polygon points="${x - 9},${y + 7} ${x + 9},${y + 7} ${x + 60},180 ${x - 60},180" fill="#00e5ff" opacity=".06"/>`; });
    if (lv >= 5) s += `<rect x="124" y="${112 - fh - 22}" width="72" height="20" rx="2" fill="#06122c" stroke="#00e5ff"/><text x="160" y="${112 - fh - 9}" font-size="8" fill="#00e676" text-anchor="middle" font-weight="900" font-family="Arial">${esc(save.team.short)} 3 - 0</text>`;
    return `<svg class="stdsvg" viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice">${s}</svg>`;
  }

  function stadiumHTML() {
    const stLv = Math.min(KK.STADIUM.length - 1, save.stadium || 0);
    const st = KK.STADIUM[stLv], nx = KK.STADIUM[stLv + 1];
    return `<div class="card stadium">
      <div class="row between"><h3 style="margin:0">🏟️ Stadium Complex</h3><button class="btn sm alt" data-go="club">🏛️ All Facilities</button></div>
      <div class="std-view" style="margin-top:8px">${stadiumSVG(stLv)}<div class="std-tag"><b>${esc(st.name)}</b><small>Tier ${stLv + 1}/${KK.STADIUM.length} · ${st.cap.toLocaleString()} Capacity · +🪙${st.bonus} Home Bonus</small></div></div>
      <p style="font-size:13px;color:var(--mute)">Upgrading your Stadium increases home match gate receipts, boosts home pitch advantage, and unlocks higher divisions up to the <b>Legendary Division (85,000 capacity)</b>.</p>
      ${nx ? `<button class="btn block" id="c-stadium" ${save.coins < nx.cost ? 'disabled' : ''}>Upgrade to ${esc(nx.name)} (${nx.cap.toLocaleString()} seats) · 🪙${nx.cost.toLocaleString()}</button>` : '<p style="color:var(--gold);font-weight:800">🏆 Maximum 85,000-seat Legendary Dream Arena completed!</p>'}
    </div>
    <div class="card"><h3>Stadium Expansion Tiers</h3>${KK.STADIUM.map((x, i) => `<div class="fx ${i === stLv ? 'me' : ''}"><span>${i <= stLv ? '✅' : '🔒'} Tier ${i + 1} · ${esc(x.name)}</span><span>${x.cap.toLocaleString()} seats (+🪙${x.bonus})${i ? ' · 🪙' + x.cost.toLocaleString() : ''}</span></div>`).join('')}</div>`;
  }

  // ---------- Settings (with 100% Offline Save Export/Import) ----------
  function settingsHTML() {
    return `<div class="card"><h3>⚙️ Game Settings</h3>
      <div class="row between"><span>Match Engine</span><div class="chips"><button class="chip ${KK.settings.gfx === '3d' ? 'on' : ''}" data-gfx="3d">3D Broadcast</button><button class="chip ${KK.settings.gfx === '2d' ? 'on' : ''}" data-gfx="2d">Classic 2D</button></div></div>
      <div class="row between" style="margin-top:10px"><span>3D Graphics Quality</span><div class="chips"><button class="chip ${KK.settings.q === 'high' ? 'on' : ''}" data-q="high">High (60fps)</button><button class="chip ${KK.settings.q === 'low' ? 'on' : ''}" data-q="low">Battery Saver</button></div></div>
      <div class="row between" style="margin-top:10px"><span>Camera Angle</span><div class="chips"><button class="chip ${KK.settings.cam !== 'close' ? 'on' : ''}" data-cam="wide">TV Broadcast</button><button class="chip ${KK.settings.cam === 'close' ? 'on' : ''}" data-cam="close">Pitchside Close</button></div></div>
      <div class="row between" style="margin-top:10px"><span>Weather</span><div class="chips">${[['auto', 'Dynamic'], ['clear', 'Clear Night'], ['rain', 'Rain'], ['snow', 'Snow']].map(([k, t]) => `<button class="chip ${(KK.settings.weather || 'auto') === k ? 'on' : ''}" data-wx="${k}">${t}</button>`).join('')}</div></div>
      <div class="row between" style="margin-top:10px"><span>AI Difficulty</span><div class="chips">${DIFF.map((t, i) => `<button class="chip ${diffOf() === i ? 'on' : ''}" data-diff="${i}">${t}</button>`).join('')}</div></div>
      <div class="row between" style="margin-top:10px"><span>Offside Rule</span><button class="chip ${KK.settings.offside === false ? '' : 'on'}" id="c-off">${KK.settings.offside === false ? 'Off' : 'On'}</button></div>
      <div class="row between" style="margin-top:10px"><span>Instant Goal Replays</span><button class="chip ${KK.settings.replays === false ? '' : 'on'}" id="c-rep">${KK.settings.replays === false ? 'Off' : 'On'}</button></div>
      <div class="row between" style="margin-top:10px"><span>Controls Tutorial</span><button class="chip" id="c-tut">Show Next Match</button></div>
      <div class="row between" style="margin-top:10px"><span>Match Commentary</span><button class="chip ${KK.settings.noComm ? '' : 'on'}" id="c-comm">${KK.settings.noComm ? 'Off' : 'On'}</button></div>
      <div class="row between" style="margin-top:10px"><span>Stadium Crowd &amp; SFX</span><button class="chip ${KK.settings.mute ? '' : 'on'}" id="c-mute">${KK.settings.mute ? 'Muted' : 'Active'}</button></div>
      <div class="row between" style="margin-top:10px"><span>Career Intro Briefing</span><button class="chip" id="c-story">View</button></div>
      <div class="row between" style="margin-top:10px"><span>Offline Save Backup</span><div class="row" style="gap:6px"><button class="chip" id="c-export">Export JSON</button><button class="chip" id="c-import">Import JSON</button></div></div>
      <div class="row between" style="margin-top:10px"><span>Reset Career</span><button class="btn sm red" id="c-reset">New Career</button></div>
      <p style="font-size:12px;color:var(--mute);margin-top:12px">Dream League Soccer runs 100% offline on local device storage with zero cloud or external SDK dependencies. v${(KK.CONFIG && KK.CONFIG.APP_VERSION) || '2.4.0'}</p></div>`;
  }

  // ---------- Club Vault (Offline Gems-to-Coins & Coach Exchange) ----------
  function shopHTML() {
    const packs = (KK.shop && KK.shop.PACKS) || [];
    return `<div class="card shop">
      <div class="row between"><h3>💎 Club Treasury &amp; Gem Exchange</h3><span class="row" style="gap:6px"><span class="coins">${save.coins.toLocaleString()}</span><span class="goldk">${save.gold.toLocaleString()}</span></span></div>
      <p style="font-size:13px;color:var(--mute);margin:4px 0">Exchange Gems (${GEM}) earned from division titles, objectives, and achievements for Transfer Coins or specialized Coaches. 100% free &amp; offline.</p>
      <div class="shp-grid">${packs.map(p => `<div class="shp">
        ${p.tag ? `<i class="shp-tag">${p.tag}</i>` : ''}
        <div class="shp-ic">${p.ic}</div>
        <b>${p.kind === 'coins' ? '+' + p.amount.toLocaleString() + ' Coins' : p.name}</b>
        <small>${esc(p.name)}</small>
        <button class="btn sm" data-vault="${p.id}" ${save.gold < p.gemCost ? 'disabled' : ''}>Exchange · ${p.gemCost}${GEM}</button>
      </div>`).join('')}</div>
    </div>
    <div class="card"><h3>🏆 How to Earn Coins &amp; Gems</h3><ul class="earn"><li>🪙 <b>Match Payouts</b>: Win league &amp; Global Cup matches (+Stadium &amp; Commercial Facility bonuses)</li><li>💎 <b>Season Objectives &amp; Achievements</b>: Complete board targets for Gems</li><li>⬆️ <b>Division Promotions</b>: Climb from Academy to Legendary Division for huge Gem jackpots</li><li>📋 <b>Release Players</b>: Convert surplus squad players into Technical or Fitness Coaches</li></ul></div>`;
  }

  function showStory(i) {
    const st = KK.meta.STORY, pg = st[i], last = i === st.length - 1;
    modal(`<div class="story"><div class="st-ic">${pg.ic}</div><small style="color:var(--gold)">DREAM LEAGUE BRIEFING · ${i + 1}/${st.length}</small><h2>${pg.h}</h2><p>${pg.p.replace('{club}', '<b>' + esc(save.team.name) + '</b>')}</p><div class="dots">${st.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="row"><button class="btn alt" id="st-skip">Skip</button><button class="btn grow" id="st-next" data-i="${i}">${last ? "ENTER CLUB ▶" : 'NEXT ▶'}</button></div></div>`, 'storymodal');
  }
  function achToast(list) { if (list && list.length) setTimeout(() => toast(`🏅 ${list.map(a => a.name).join(', ')} unlocked!`), 300); }

  // ---------- Global Challenge Cup & Diamond Cup ----------
  function cupsHTML() {
    const cups = save.cups || {};
    const k = cupTab || (cups.crown && cups.crown.userIn ? 'crown' : 'shield'), cup = cups[k], def = KK.CUPS[k];
    const tabs = `<div class="chips" style="margin-bottom:10px">${['shield', 'crown'].map(x => `<button class="chip ${x === k ? 'on' : ''}" data-cuptab="${x}">${KK.CUPS[x].icon} ${KK.CUPS[x].name}</button>`).join('')}</div>`;
    if (!cup) return tabs + '<div class="card"><p>No cup active this season.</p></div>';
    const T = id => KK.cupTeam(cup, id), fl = id => { const t = T(id); return t.country && KK.country(t.country) ? KK.flagSVG(KK.country(t.country).flag, 14, 10) : KK.flagSVG('c:#ffffff,#ce1124', 14, 10); };
    const nm = id => `${fl(id)} ${id === 'ME' ? `<b style="color:var(--gold)">${esc(T(id).name)}</b>` : esc(T(id).name)}`;
    const status = cup.userIn ? (cup.winner === 'ME' ? '🏆 You are the Champions!' : cup.userOut ? 'Eliminated from this season\'s tournament.' : '✅ Competing! Play your next Cup fixture from the Career tab.') : 'Reach Division 3 or higher (or finish in the top places) to enter the Diamond Cup.';
    const groups = cup.groups.map((g, gi) => `<div><h4 style="margin:4px 0">Group ${'ABCD'[gi]}</h4><table class="tbl"><tr><th style="text-align:left">Club</th><th>P</th><th>GD</th><th>Pts</th></tr>${KK.groupTable(cup, gi).map((r, i) => `<tr class="${r.id === 'ME' ? 'me' : ''} ${i < 2 && cup.md >= 6 ? 'up' : ''}"><td class="tn">${fl(r.id)} ${esc(r.short)}</td><td>${r.P}</td><td>${r.GF - r.GA}</td><td><b>${r.Pts}</b></td></tr>`).join('')}</table></div>`).join('');
    const ko = ['Quarter-Finals', 'Semi-Finals', 'Final'].map((n, i) => cup.ko[i] ? `<h4>${n}</h4>${cup.ko[i].map(f => `<div class="fx ${f.h === 'ME' || f.a === 'ME' ? 'me' : ''}"><span class="grow" style="text-align:right">${nm(f.h)}</span><span class="sc" style="margin:0 8px">${f.hs == null ? 'v' : f.hs + ' - ' + f.as}${f.pen ? '<small> p</small>' : ''}</span><span class="grow">${nm(f.a)}</span></div>`).join('')}` : `<h4>${n}</h4><p style="font-size:12px;color:var(--mute);margin:0">TBD</p>`).join('');
    return tabs + `<div class="card cupcard"><div class="cuphead"><span class="ic">${def.icon}</span><div><h2 style="margin:0">${def.name}</h2><small style="color:var(--mute)">Season ${cup.year} · ${cup.winner ? 'Winners: ' + esc(T(cup.winner).name) : 'Stage: ' + KK.CUP_STAGE[Math.min(cup.md, 8)]}</small></div></div>
      <p style="font-size:14px">${status}</p>
      <p style="font-size:12px;color:var(--mute)">16 clubs · 4 groups of 4 · top 2 advance to Quarter-Finals. Match win: 🪙${def.win}, Champion prize: 🪙${def.prize.toLocaleString()}.</p></div>
      <div class="card"><h3>Group Stage</h3><div class="grp">${groups}</div></div>
      <div class="card ko"><h3>Knockout Bracket</h3>${ko}</div>`;
  }

  // ---------- Exhibition Match ----------
  function leagueOptions(sel) {
    let o = `<option value="ME" ${sel === 'ME' ? 'selected' : ''}>⭐ ${esc(save.team.name)}</option><option value="CUR" ${sel === 'CUR' ? 'selected' : ''}>Current Division: ${esc(KK.leagueName(save))}</option>`;
    o += `<optgroup label="International Clubs">` + KK.allLeagues().map(l => `<option value="${l.code}:${l.tier}" ${sel === l.code + ':' + l.tier ? 'selected' : ''}>${esc(l.country.name)} · ${esc(l.name)}</option>`).join('') + '</optgroup>';
    return o;
  }
  function clubsOf(v) {
    if (v === 'ME') return [{ id: 'ME', name: save.team.name, short: save.team.short }];
    if (v === 'CUR') return save.season.teams.filter(t => t.id !== 'ME');
    const [c, t] = v.split(':'); return KK.leagueClubs(c, +t);
  }
  function fillClubs(i) { const v = $('#fr-l' + i).value; $('#fr-c' + i).innerHTML = clubsOf(v).map((t) => `<option value="${t.id}">${esc(t.name)}${t.rating ? ' (OVR ' + t.rating + ')' : ''}</option>`).join(''); }
  function friendlyModal() {
    modal(`<h3>🤝 Exhibition Match</h3><div style="text-align:left"><label class="lbl">Home Club</label><select class="sel" id="fr-l0">${leagueOptions('ME')}</select><select class="sel" id="fr-c0"></select>
      <label class="lbl">Away Club</label><select class="sel" id="fr-l1">${leagueOptions('ENG:1')}</select><select class="sel" id="fr-c1"></select>
      <p style="font-size:12px;color:var(--mute)">Test your tactics against any club in the world with zero stamina drain.</p></div>
      <button class="btn block" id="fr-play">▶ KICK OFF EXHIBITION</button><button class="btn alt block" id="fr-sim" style="margin-top:8px">⏩ Simulate Score</button><button class="btn alt block" data-close style="margin-top:8px">Cancel</button>`);
    fillClubs(0); fillClubs(1);
  }
  const friendlyTeam = i => { const v = $('#fr-l' + i).value, id = $('#fr-c' + i).value; return id === 'ME' ? { id: 'ME', name: save.team.name, short: save.team.short, c1: save.team.crest.c1, c2: save.team.crest.c2 } : clubsOf(v).find(t => t.id === id); };

  document.addEventListener('change', e => {
    if (e.target.id === 'fr-l0') fillClubs(0);
    if (e.target.id === 'fr-l1') fillClubs(1);
    if (e.target.dataset && e.target.dataset.role && save) {
      save.roles = save.roles || {};
      save.roles[e.target.dataset.role] = e.target.value;
      persist();
      toast('Updated ' + e.target.dataset.role.toUpperCase() + ' role!');
      keepScroll();
    }
  });
  document.addEventListener('input', e => { if (e.target.id === 'f-eusearch') { euFilter = e.target.value; const y = window.scrollY; const pos = e.target.selectionStart; render(); window.scrollTo(0, y); const n = $('#f-eusearch'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } });

  // ---------- Interactive Event Handlers ----------
  document.addEventListener('click', e => {
    if (dragged) return;
    const b = e.target.closest('button,[data-slot],[data-pid]'); if (!b) return;
    KK.sfx.unlock();
    const d = b.dataset;
    if (b.closest('#match')) return;
    if (d.go) { KK.sfx.click(); if (b.closest('#modal')) closeModal(); return go(d.go); }
    if (b.id === 'tb-mute' || b.id === 'c-mute') { KK.sfx.setMute(!KK.settings.mute); if (save) persist(); return render(); }
    if (d.cap) { draft.captainId = d.cap; draftSquad(); return keepBuilder(); }
    if (d.sw) { if (d.sw === 'c1' || d.sw === 'c2') draft.crest[d.sw] = d.c; else draft.kit[d.sw] = d.c; return keepBuilder(); }
    if (d.pat) { draft.crest.pattern = d.pat; return keepBuilder(); }
    if (d.emb) { draft.crest.emblem = d.emb; return keepBuilder(); }
    if (b.id === 'f-randcrest') { draft.crest = { c1: KK.pick(KK.COLORS), c2: KK.pick(KK.COLORS), pattern: KK.pick(PATTERNS), emblem: KK.pick(EMBLEMS) }; draft.kit.shirt = draft.crest.c1; return keepBuilder(); }
    if (b.id === 'f-reroll') { draftSquad(); return keepBuilder(); }
    if (d.mode) { draft.career = d.mode === 'eu' ? { mode: 'eu', country: draft.career.country || null, tier: draft.career.tier || null } : { mode: 'dls' }; draftSquad(); return keepBuilder(); }
    if (d.country) { const co = KK.country(d.country); const sc = $('#clist') ? $('#clist').scrollTop : 0; draft.career = { mode: 'eu', country: co.code, tier: co.tiers }; draftSquad(); keepBuilder(); if ($('#clist')) $('#clist').scrollTop = sc; return; }
    if (d.tier) { const sc = $('#clist') ? $('#clist').scrollTop : 0; draft.career.tier = +d.tier; draftSquad(); keepBuilder(); if ($('#clist')) $('#clist').scrollTop = sc; return; }
    if (d.cuptab) { cupTab = d.cuptab; return render(); }
    if (d.ctype) { coachType = d.ctype; return keepScroll(); }
    if (d.gfx) { KK.settings.gfx = d.gfx; persist(); return render(); }
    if (d.q) { KK.settings.q = d.q; persist(); return render(); }
    if (d.cam) { KK.settings.cam = d.cam; persist(); return render(); }
    if (d.wx) { KK.settings.weather = d.wx; persist(); return render(); }
    if (d.cupplay) return prematch({ kind: 'cup', cup: d.cupplay });
    if (d.cupsim) return cupSim(d.cupplay || d.cupsim);
    if (b.id === 'h-friendly') return friendlyModal();
    if (b.id === 'fr-play') { const A = friendlyTeam(0), B = friendlyTeam(1); if (!A || !B || A.id === B.id) return toast('Pick two different clubs'); return prematch({ kind: 'friendly', A, B }); }
    if (b.id === 'fr-sim') { const A = friendlyTeam(0), B = friendlyTeam(1); if (!A || !B || A.id === B.id) return toast('Pick two different clubs'); const rA = A.id === 'ME' ? KK.myRating(save) : A.rating, rB = B.id === 'ME' ? KK.myRating(save) : B.rating; const [x, y] = KK.simScore(rA + 1.5, rB); return resultModal({ A, B, a: x, b: y, coins: 0, label: 'Exhibition', events: [] }); }
    if (b.id === 'f-start') {
      readBuilder(); if (!draft.name.trim()) return toast('Please enter a club name');
      if (draft.career.mode === 'eu' && (!draft.career.country || !draft.career.tier)) return toast('Select a country and division');
      save = KK.newCareer({ name: draft.name.trim(), short: (/^[A-Z]{3}$/.test(draft.short) && !/^(SUX|SEX|ASS|FUK|FUC|DIK|DIC|COK|CUM|FAG|NIG|TIT|POO|WTF|KKK|GAY|PIS|XXX)$/.test(draft.short)) ? draft.short : KK.shortName(draft.name.trim() || 'DLS'), crest: draft.crest, kit: draft.kit }, draft.players, draft.career, draft.manager);
      save.settings.gfx = save.settings.gfx || KK.settings.gfx; save.settings.q = save.settings.q || KK.settings.q;
      KK.settings = save.settings; persist(); KK.sfx.whistle(1); KK.meta.ensure(save); persist(); toast('Welcome to ' + KK.leagueName(save) + '!'); go('hub'); return showStory(0);
    }
    if (d.len) { KK.settings.len = +d.len; persist(); return render(); }
    if (b.id === 'h-play') return prematch({ kind: 'league' });
    if (b.id === 'pm-go') { closeModal(); return startMatch(pendingCtx); }
    if (b.id === 'res-next') { resIdx = Math.min(resPages.length - 1, resIdx + 1); return showResPage(); }
    if (b.id === 'st-next') { const i = +d.i + 1; if (i < KK.meta.STORY.length) return showStory(i); save.story.seen = true; persist(); closeModal(); return; }
    if (b.id === 'st-skip') { save.story.seen = true; persist(); closeModal(); return; }
    if (b.id === 'c-story') return showStory(0);
    if (d.diff != null) { KK.settings.diff = +d.diff; persist(); if ($('#pm-go') && pendingCtx) return prematch(pendingCtx); return render(); }
    if (b.id === 'c-off') { KK.settings.offside = KK.settings.offside === false; persist(); return render(); }
    if (b.id === 'c-rep') { KK.settings.replays = KK.settings.replays === false; persist(); return render(); }
    if (b.id === 'c-tut') { KK.settings.tutDone = false; persist(); return toast('Controls tutorial enabled for your next match.'); }
    if (b.id === 'c-comm') { KK.settings.noComm = !KK.settings.noComm; persist(); return render(); }

    // Offline Save Export / Import
    if (b.id === 'c-export') {
      const json = JSON.stringify(save);
      modal(`<h3>📤 Export Career Backup</h3><p style="font-size:12px;color:var(--mute)">Copy this offline backup code to keep your Dream Team safe.</p><textarea id="bk-txt" rows="5" style="width:100%;background:#06122c;color:#00e5ff;border:1px solid #3555a8;border-radius:8px;padding:8px;font-size:11px" readonly>${esc(json)}</textarea><div class="row" style="margin-top:10px"><button class="btn alt grow" data-close>Close</button><button class="btn grow" id="bk-copy">Copy Backup</button></div>`);
      return;
    }
    if (b.id === 'bk-copy') {
      const tx = $('#bk-txt'); if (tx) { tx.select(); try { navigator.clipboard.writeText(tx.value); } catch (x) {} }
      toast('Career backup copied!'); closeModal(); return;
    }
    if (b.id === 'c-import') {
      modal(`<h3>📥 Import Career Backup</h3><p style="font-size:12px;color:var(--mute)">Paste your saved JSON backup below to restore your club.</p><textarea id="bk-in" rows="5" style="width:100%;background:#06122c;color:#fff;border:1px solid #3555a8;border-radius:8px;padding:8px;font-size:11px" placeholder='{"v":1,...}'></textarea><div class="row" style="margin-top:10px"><button class="btn alt grow" data-close>Cancel</button><button class="btn grow" id="bk-load">Restore Career</button></div>`);
      return;
    }
    if (b.id === 'bk-load') {
      try {
        const parsed = JSON.parse($('#bk-in').value.trim());
        if (!parsed || parsed.v !== 1 || !parsed.team) throw new Error('Invalid save');
        save = KK.migrate(parsed); KK.meta.ensure(save); persist(); closeModal(); toast('Career restored!'); return go('hub');
      } catch (err) { return toast('Invalid backup JSON'); }
    }

    // Club Vault Gem Exchange
    if (d.vault) {
      const pk = (KK.shop && KK.shop.PACKS || []).find(x => x.id === d.vault);
      if (!pk || save.gold < pk.gemCost) return;
      save.gold -= pk.gemCost;
      if (pk.kind === 'coins') save.coins += pk.amount;
      else if (pk.kind === 'coach_rare') { save.coaches.tech.r += 1; save.coaches.fit.r += 1; }
      else if (pk.kind === 'coach_leg') { save.coaches.tech.l += 1; save.coaches.fit.l += 1; }
      persist(); KK.sfx.coin(); toast(`Unlocked ${pk.name}!`); return render();
    }

    // Use DLS Coach (Technical / Fitness / GK)
    if (d.usecoach) {
      const [type, tier] = d.usecoach.split(':');
      const trLv = (save.facilities && save.facilities.training) || 0;
      const gCost = { c: Math.max(8, Math.round(15 * (1 - trLv * 0.06))), r: Math.max(20, Math.round(35 * (1 - trLv * 0.06))), l: Math.max(45, Math.round(75 * (1 - trLv * 0.06))) }[tier];
      const pool = save.players.filter(p => p.rating < 99 && (type === 'gk' ? p.pos === 'GK' : p.pos !== 'GK'));
      if (!pool.length) return toast('No eligible players to train!');
      if ((save.coaches[type][tier] || 0) > 0) save.coaches[type][tier]--;
      else if (save.gold >= gCost) save.gold -= gCost;
      else return toast('Not enough Gems');
      const target = KK.pick(pool);
      const res = KK.meta.applyCoach(save, target, type, tier);
      persist(); KK.sfx.cheer();
      modal(`<div class="walkout-banner">${res.breakthrough ? '⚡ BREAKTHROUGH TRAINING! ⚡' : '📋 COACH SESSION COMPLETE'}</div>
        <p style="margin:4px 0 8px;color:#00e676;font-weight:800">${esc(target.name)} improved +${res.ovrGain} OVR (${res.upgraded.map(([k, v]) => `${k} +${v}`).join(' · ')})</p>
        ${KK.meta.cardHTML(target, { compact: true })}
        <button class="btn block" data-close style="margin-top:10px">CONTINUE</button>`, 'cardmodal');
      return keepScroll();
    }

    // Facility Upgrades
    if (d.upfac) {
      const [key, cur] = d.upfac.split(':'), def = KK.FACILITIES[key];
      const lv = (save.facilities && save.facilities[key]) || 0;
      if (!def || lv >= 5) return;
      if (cur === 'gems') {
        const gCost = def.costs[lv + 1]; if (save.gold < gCost) return;
        save.gold -= gCost;
      } else {
        const cCost = def.coinCosts[lv + 1]; if (save.coins < cCost) return;
        save.coins -= cCost;
      }
      save.facilities[key] = lv + 1;
      achToast(KK.meta.event(save, 'stadium'));
      persist(); KK.sfx.cheer(); toast(`${def.name} upgraded to Level ${lv + 1}!`);
      return keepScroll();
    }

    // Secret Agents & Scouts
    if (b.id === 'ag-rare' || b.id === 'ag-leg') {
      const isLeg = b.id === 'ag-leg', cost = isLeg ? 160 : 75;
      if (save.gold < cost || save.players.length >= KK.maxSquadSize(save)) return;
      save.gold -= cost;
      const np = KK.openAgent(save, isLeg ? 'legendary' : 'rare');
      save.players.push(np);
      achToast(KK.meta.event(save, 'signing'));
      persist(); KK.sfx.cheer();
      modal(`<div class="walkout-banner">${isLeg ? '🌟 LEGENDARY AGENT WALKOUT! 🌟' : '💎 RARE AGENT SIGNING!'}</div>
        ${KK.meta.cardHTML(np)}
        <button class="btn block" data-close style="margin-top:10px">WELCOME TO ${esc(save.team.short)} ▶</button>`, 'cardmodal');
      return render();
    }
    if (d.scout) {
      const disc = KK.transferDiscount(save);
      const cost = { common: Math.round(120 * disc), rare: Math.round(350 * disc), legendary: Math.round(720 * disc) }[d.scout];
      if (save.coins < cost) return toast('Not enough Coins');
      save.coins -= cost;
      save.scouted = KK.runScout(save, d.scout);
      persist(); KK.sfx.coin(); toast(`${d.scout.toUpperCase()} Scout returned with 3 targets!`);
      return render();
    }
    if (d.buyscout) {
      const p = (save.scouted || []).find(x => x.id === d.buyscout);
      if (!p || save.coins < p.price || save.players.length >= KK.maxSquadSize(save)) return;
      save.coins -= p.price;
      save.scouted = save.scouted.filter(x => x !== p);
      const np = { ...p }; delete np.price; delete np.scouted; np.fit = 100;
      save.players.push(np); achToast(KK.meta.event(save, 'signing')); persist(); KK.sfx.cheer();
      modal(`<div class="walkout-banner">✍️ SCOUTED SIGNING COMPLETE</div>${KK.meta.cardHTML(np)}<button class="btn block" data-close style="margin-top:10px">CONTINUE</button>`, 'cardmodal');
      return render();
    }
    if (d.lock) {
      e.stopPropagation();
      const p = (save.market || []).find(x => x.id === d.lock);
      if (p) { p.locked = !p.locked; persist(); toast(p.locked ? `${surname(p.name)} locked on market` : 'Player unlocked'); return keepScroll(); }
    }

    if (d.kittab) { kitTab = d.kittab; return keepScroll(); }
    if (d.ksw) { const [tgt, key] = d.ksw.split(':'), o = tgt === 'crest' ? save.team.crest : kitTab === 'away' ? save.team.away : save.team.kit; o[key] = d.c; kitEdited(); return keepScroll(); }
    if (d.cpat) { save.team.crest.pattern = d.cpat; kitEdited(); return keepScroll(); }
    if (d.cemb) { save.team.crest.emblem = d.cemb; kitEdited(); return keepScroll(); }
    if (d.kpat) {
      if (d.kpat === 'kente' && !save.unlocks.kente) return modal(`<h3>Unlock Elite Prism Kit?</h3><p>Spend ${KK.meta.KENTE_COST}${GEM} Gems (you have ${save.gold}).</p><div class="row"><button class="btn alt grow" data-close>Cancel</button><button class="btn grow" id="k-unlock" ${save.gold < KK.meta.KENTE_COST ? 'disabled' : ''}>Unlock</button></div>`);
      (kitTab === 'away' ? save.team.away : save.team.kit).pattern = d.kpat; kitEdited(); return keepScroll();
    }
    if (b.id === 'k-unlock') { if (save.gold < KK.meta.KENTE_COST) return; save.gold -= KK.meta.KENTE_COST; save.unlocks.kente = true; (kitTab === 'away' ? save.team.away : save.team.kit).pattern = 'kente'; kitEdited(); closeModal(); toast('Elite Prism pattern unlocked!'); return keepScroll(); }
    if (b.id === 't-physio') { if (save.gold < 5) return; save.gold -= 5; save.players.forEach(p => p.fit = 100); persist(); KK.sfx.coin(); toast('Squad restored to 100% Stamina!'); return keepScroll(); }
    if (b.id === 't-coinphysio') {
      const tired = save.players.filter(p => (p.fit == null ? 100 : p.fit) < 100).length;
      const medLv = (save.facilities && save.facilities.medical) || 0;
      const cost = Math.max(40, Math.round(tired * 20 * (1 - medLv * 0.1)));
      if (!tired || save.coins < cost) return;
      save.coins -= cost; save.players.forEach(p => p.fit = 100); persist(); KK.sfx.coin(); toast('Physio healed all players to 100%!'); return keepScroll();
    }
    if (b.id === 'h-sim') return quickSim();
    if (d.form) { save.formation = d.form; KK.autoPick(save); persist(); toast('Formation set to ' + d.form); return render(); }
    if (b.id === 's-auto') { KK.autoPick(save); persist(); toast('Best Starting XI selected'); return render(); }
    if (d.slot !== undefined) { const i = +d.slot; if (selSlot !== null && selSlot !== i) { [save.lineup[selSlot], save.lineup[i]] = [save.lineup[i], save.lineup[selSlot]]; selSlot = null; persist(); KK.sfx.click(); return keepScroll(); } selSlot = selSlot === i ? null : i; return keepScroll(); }
    if (d.train) {
      e.stopPropagation();
      const p = save.players.find(x => x.id === d.train), c = KK.trainCost(p, save); if (save.coins < c || p.rating >= 99) return;
      save.coins -= c; KK.meta.applyCoach(save, p, p.pos === 'GK' ? 'gk' : 'tech', 'c');
      persist(); KK.sfx.coin(); toast(`${surname(p.name)} upgraded to ${p.rating} OVR!`); if (d.incard) cardModal(p); return keepScroll();
    }
    if (d.sell) {
      e.stopPropagation();
      const p = save.players.find(x => x.id === d.sell); if (save.players.length <= 14) return toast('Minimum squad size is 14 players');
      const v = Math.round(KK.playerValue(p) / 2);
      const cTier = p.rating >= 80 ? 'Legendary' : p.rating >= 70 ? 'Rare' : 'Common';
      modal(`<h3>Release ${esc(p.name)} (${p.rating} OVR)?</h3><p>Choose your compensation for releasing this player:</p>
        <div class="row" style="flex-direction:column;gap:8px">
          <button class="btn block" data-coachrelease="${p.id}:tech">📋 Convert to ${cTier} Technical Coach</button>
          <button class="btn alt block" data-coachrelease="${p.id}:fit">⚡ Convert to ${cTier} Fitness Coach</button>
          <button class="btn red block" data-confirmsell="${p.id}">🪙 Sell for ${v.toLocaleString()} Coins</button>
          <button class="btn alt block" data-close>Cancel</button>
        </div>`); return;
    }
    if (d.coachrelease) {
      const [pid, cType] = d.coachrelease.split(':');
      const p = save.players.find(x => x.id === pid); if (!p) return closeModal();
      const tk = p.rating >= 80 ? 'l' : p.rating >= 70 ? 'r' : 'c';
      save.players = save.players.filter(x => x !== p);
      save.coaches[cType][tk] = (save.coaches[cType][tk] || 0) + 1;
      persist(); closeModal(); KK.sfx.coin(); toast(`Received 1 ${tk === 'l' ? 'Legendary' : tk === 'r' ? 'Rare' : 'Common'} ${cType.toUpperCase()} Coach!`); return render();
    }
    if (d.confirmsell) { const p = save.players.find(x => x.id === d.confirmsell); save.players = save.players.filter(x => x !== p); save.coins += Math.round(KK.playerValue(p) / 2); persist(); closeModal(); KK.sfx.coin(); toast('Player released for Coins'); return render(); }
    if (d.buy) {
      e.stopPropagation();
      const p = save.market.find(x => x.id === d.buy); if (!p || save.coins < p.price || save.players.length >= KK.maxSquadSize(save)) return;
      save.coins -= p.price; save.market = save.market.filter(x => x !== p); const np = { ...p }; delete np.price; delete np.locked; np.fit = 100; save.players.push(np); achToast(KK.meta.event(save, 'signing')); persist(); KK.sfx.cheer();
      modal(`<div class="walkout-banner">✍️ NEW DREAM TEAM SIGNING!</div>${KK.meta.cardHTML(np)}<button class="btn block" data-close style="margin-top:10px">CONTINUE</button>`, 'cardmodal');
      return render();
    }
    if (b.id === 'mk-goldref') { if (save.gold < 5) return; save.gold -= 5; save.market = KK.genMarket(save); persist(); toast('Transfer Market refreshed!'); return render(); }
    if (b.id === 'mk-refresh') { if (save.coins < 80) return toast('Not enough Coins'); save.coins -= 80; save.market = KK.genMarket(save); persist(); toast('Transfer Market refreshed!'); return render(); }
    if (b.id === 'c-stadium') { const nx = KK.STADIUM[save.stadium + 1]; if (!nx || save.coins < nx.cost) return; save.coins -= nx.cost; save.stadium++; achToast(KK.meta.event(save, 'stadium')); persist(); KK.sfx.cheer(); toast(`Stadium expanded to ${nx.name}!`); return render(); }
    if (b.id === 'c-reset') return modal(`<h3>Start New Career?</h3><p>This will erase your current club progress on this device.</p><div class="row"><button class="btn alt grow" data-close>Cancel</button><button class="btn red grow" id="c-reset2">Delete &amp; Restart</button></div>`);
    if (b.id === 'c-reset2') { localStorage.removeItem(KK.SAVE_KEY); save = null; draft = null; closeModal(); return go('builder'); }
    if (d.close !== undefined) { closeModal(); return; }
    if (d.cont !== undefined) { closeModal(); return go('hub'); }
    if (d.pid && selSlot !== null && view === 'squad') {
      const pid = d.pid, other = save.lineup.indexOf(pid);
      if (other >= 0) { [save.lineup[selSlot], save.lineup[other]] = [save.lineup[other], save.lineup[selSlot]]; } else save.lineup[selSlot] = pid;
      selSlot = null; persist(); KK.sfx.click(); return keepScroll();
    }
    if (d.pid) { const p = save.players.find(x => x.id === d.pid) || (save.market || []).find(x => x.id === d.pid) || (save.scouted || []).find(x => x.id === d.pid); if (p) return cardModal(p); }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'f-short') draft.shortEdited = true;
    if (e.target.id === 'f-name' && !draft.shortEdited) { const sh = $('#f-short'), v = e.target.value.trim(); if (sh && v) sh.value = KK.shortName(v); }
    if (e.target.id === 'f-name' || e.target.id === 'f-short' || e.target.id === 'f-mgr') {
      readBuilder();
      if ($('#pv')) $('#pv').innerHTML = KK.crestSVG(draft.crest, 96, draft.short) + KK.kitSVG(draft.kit.shirt, draft.kit.shorts, 80);
    }
  });
  function keepScroll() { const y = window.scrollY; render(); window.scrollTo(0, y); }
  function kitEdited() { achToast(KK.meta.event(save, 'kit')); persist(); }

  // Drag-and-drop formation
  let drag = null;
  const dropAt = (x, y, el) => { for (const n of document.elementsFromPoint(x, y)) { if (n.classList && n.classList.contains('dragghost')) continue; const t = n.closest && n.closest('[data-drag]'); if (t && t !== el) return t; } return null; };
  document.addEventListener('pointerdown', e => { const el = e.target.closest('[data-drag]'); if (!el || view !== 'squad' || !save) return; drag = { el, src: el.dataset.drag, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false }; });
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return; drag.moved = true; drag.g = drag.el.cloneNode(true); drag.g.classList.add('dragghost'); document.body.appendChild(drag.g); drag.el.classList.add('dragging'); }
    e.preventDefault(); drag.g.style.left = e.clientX + 'px'; drag.g.style.top = e.clientY + 'px';
    document.querySelectorAll('.drop-on').forEach(x => x.classList.remove('drop-on')); const t = dropAt(e.clientX, e.clientY, drag.el); if (t) t.classList.add('drop-on');
  }, { passive: false });
  const dragEnd = e => {
    if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; if (!d.moved) return;
    dragged = true; setTimeout(() => { dragged = false; }, 60); d.g.remove(); d.el.classList.remove('dragging');
    const t = e.type === 'pointerup' ? dropAt(e.clientX, e.clientY, d.el) : null; if (t) swapDrag(d.src, t.dataset.drag); keepScroll();
  };
  document.addEventListener('pointerup', dragEnd); document.addEventListener('pointercancel', dragEnd);
  function swapDrag(a, b) {
    const slotOf = k => k[0] === 's' ? +k.slice(1) : save.lineup.indexOf(k.slice(1)), idOf = k => k[0] === 's' ? save.lineup[+k.slice(1)] : k.slice(1);
    const sa = slotOf(a), sb = slotOf(b), ia = idOf(a), ib = idOf(b);
    if (sa >= 0 && sb >= 0) [save.lineup[sa], save.lineup[sb]] = [save.lineup[sb], save.lineup[sa]];
    else if (sa >= 0) save.lineup[sa] = ib; else if (sb >= 0) save.lineup[sb] = ia; else return;
    selSlot = null; persist(); KK.sfx.click(); const p = save.players.find(x => x.id === (sa >= 0 ? ib : ia)); if (p) toast(`${surname(p.name)} moved into Starting XI`);
  }
  function readBuilder() {
    const n = $('#f-name'), s = $('#f-short'), m = $('#f-mgr');
    if (n) draft.name = n.value;
    if (s) draft.short = s.value.toUpperCase();
    if (m) draft.manager = m.value;
    if (n && (!s || !s.value) && n.value) draft.short = n.value.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  }
  function keepBuilder() { readBuilder(); const y = window.scrollY; render(); window.scrollTo(0, y); }

  // ---------- Matchday Pre-Match & Post-Match Modals ----------
  const meTeam = () => ({ id: 'ME', name: save.team.name, short: save.team.short, c1: save.team.crest.c1, c2: save.team.crest.c2 });
  function fixtureInfo() {
    const f = KK.nextFixture(save), home = f.h === 'ME', opp = KK.teamById(save, home ? f.a : f.h);
    return { f, home, opp };
  }
  const ord = n => n + (['st', 'nd', 'rd'][n - 1] || 'th');
  function statsHTML(st, flip) {
    const h = flip ? 1 : 0, a = 1 - h, tot = st.poss[0] + st.poss[1] || 1, pp = [Math.round(st.poss[0] / tot * 100)]; pp[1] = 100 - pp[0];
    const row = (lab, x, y, pct) => { const s = x + y || 1; return `<div class="srow"><b>${x}${pct ? '%' : ''}</b><div class="sbar l"><i style="width:${x / s * 100}%"></i></div><span>${lab}</span><div class="sbar r"><i style="width:${y / s * 100}%"></i></div><b>${y}${pct ? '%' : ''}</b></div>`; };
    return `<div class="stats">${row('Possession', pp[h], pp[a], 1)}${row('Shots', st.shots[h], st.shots[a])}${row('On Target', st.sot[h], st.sot[a])}${row('Passes', st.passes[h], st.passes[a])}${row('Tackles', st.tackles[h], st.tackles[a])}${row('Saves', st.saves[h], st.saves[a])}${st.fouls ? row('Fouls', st.fouls[h], st.fouls[a]) : ''}</div>`;
  }
  let resPages = [], resIdx = 0;
  function resultModal({ A, B, a, b, coins, end, events, label, extra, res, flip, rw }) {
    const meSide = A.id === 'ME' ? 0 : B.id === 'ME' ? 1 : -1;
    const my = meSide === 1 ? b : a, op = meSide === 1 ? a : b;
    const r = my > op ? 'W' : my < op ? 'L' : 'D';
    const title = meSide < 0 ? 'FULL TIME' : r === 'W' ? 'VICTORY!' : r === 'D' ? 'DRAW' : 'DEFEAT';
    const ctlSide = flip ? 1 : 0;
    const evs = (events || []).map(e => ({ ...e, side: e.t === 0 ? ctlSide : 1 - ctlSide }));
    const sc = side => evs.filter(e => e.side === side).map(e => `${esc(surname(e.name))} ${e.min}'`).join(', ');
    const head = `${label ? `<small style="color:var(--gold)">${esc(label)}</small>` : ''}<h2 class="ft-title" style="color:${meSide < 0 ? '#fff' : r === 'W' ? '#00e676' : r === 'L' ? '#ff5252' : '#fff'}">${title}</h2>
      <div class="ftbar"><div>${crestOf(A, 44)}<b>${esc(A.short)}</b></div><div class="ftsc">${a} - ${b}</div><div><b>${esc(B.short)}</b>${crestOf(B, 44)}</div></div>
      <div class="ftscorers"><span>${sc(0) ? '⚽ ' + sc(0) : ''}</span><span>${sc(1) ? sc(1) + ' ⚽' : ''}</span></div>`;
    const pages = [];
    pages.push(`<small class="pg">FULL TIME BROADCAST REPORT</small>${head}${res && res.stats ? statsHTML(res.stats, flip) : '<p style="font-size:13px;color:var(--mute)">Simulated Match Result</p>'}`);
    if (res && res.motm) {
      const mo = res.motm, ps = mo.ps || {}, mineP = save && save.players.find(p => p.id === mo.id);
      const side = mo.t === 0 ? ctlSide : 1 - ctlSide, club = side === 0 ? A : B;
      const mine = (res.ratings || []).filter(x => x.t === 0).sort((x, y) => y.r - x.r).slice(0, 11);
      const moShirt = mo.pos === 'GK' ? '#00c853' : (club.c1 || (save && save.team ? save.team.kit.shirt : '#1e429f'));
      pages.push(`<small class="pg">MAN OF THE MATCH</small><div class="motm"><div class="mo-l">${mineP ? KK.meta.cardHTML(mineP, { shirt: moShirt, compact: true }) : `<div class="mo-op">${KK.meta.faceSVG(mo, 78, moShirt)}<div style="margin-top:6px">${crestOf(club, 36)}</div><h3>${esc(mo.name)}</h3><span class="pos ${mo.pos}">${mo.pos}</span></div>`}</div>
        <div class="mo-r"><div class="mo-star">★</div><h2>${esc(mo.name)}</h2><div style="color:var(--mute)">${esc(club.name)}</div><div class="mo-rt">${mo.r.toFixed(1)}</div>
        <div class="mo-st"><span>⚽ <b>${ps.g || 0}</b> goals</span><span>🅰️ <b>${ps.as || 0}</b> assists</span><span>🎯 <b>${ps.sh || 0}</b> shots</span><span>🔁 <b>${ps.pa || 0}</b> passes</span><span>🛡️ <b>${ps.tk || 0}</b> tackles</span><span>🧤 <b>${ps.sv || 0}</b> saves</span></div>
        <h4 style="margin:10px 0 4px">SQUAD MATCH RATINGS</h4><div class="rtgrid">${mine.map(x => `<span class="${x.id === mo.id ? 'best' : ''}"><i class="pos ${x.pos}">${x.pos}</i>${esc(surname(x.name))}<b>${x.r.toFixed(1)}</b></span>`).join('')}</div></div></div>`);
    }
    let endHTML = '';
    if (end) {
      const e = end;
      const msg = e.outcome === 'up' ? `🎉 PROMOTED to the ${esc(e.newName)}!`
        : e.outcome === 'stay_cap' ? `⚠️ Finished ${ord(e.pos)}, but promotion to ${esc(KK.leagueName(save, e.oldDiv - 1))} requires a ${e.reqCap.toLocaleString()}-seat Stadium!`
        : e.outcome === 'down' ? `😞 Relegated to the ${esc(e.newName)}.`
        : e.outcome === 'champ' ? `🏆 CHAMPIONS of the ${esc(e.oldName)}!`
        : `You remain in the ${esc(e.newName)}.`;
      endHTML = `<div class="card"><h3>Season ${e.year} Complete</h3><p>Final Position: <b>${ord(e.pos)}</b> in ${esc(e.oldName)}.</p><p style="font-size:16px"><b>${msg}</b></p><p>Season Prize: 🪙${e.prize.toLocaleString()} + ${e.gemPrize || 10}${GEM}</p></div>`;
    }
    if (rw || coins || end || extra) {
      const L = rw ? rw.lv : null;
      pages.push(`<small class="pg">MATCH REWARDS</small><h2 style="margin:4px 0">${esc(A.short)} ${a} - ${b} ${esc(B.short)}</h2>
        <div class="rw-grid"><div class="rw"><span>🪙</span><b>+${(coins || 0).toLocaleString()}</b><small>Match Coins</small></div>${rw ? `<div class="rw"><i class="gk big"></i><b>+${rw.gold}</b><small>Gems Earned</small></div><div class="rw"><span>⭐</span><b>+${rw.xp}</b><small>Club XP</small></div>` : ''}</div>
        ${L ? `<div class="lvbar"><span>REP LV ${L.lv}</span><i><b style="width:${Math.round(L.cur / L.need * 100)}%"></b></i><small>${L.cur}/${L.need} XP</small></div>` : ''}
        ${rw && rw.levelUp ? `<div class="lvup">⬆️ CLUB REPUTATION LEVEL UP! Level ${rw.levelUp} · +🪙${rw.lvCoins} · +10${GEM}</div>` : ''}
        ${rw && rw.objDone.length ? `<div class="rw-list">${rw.objDone.map(o => `<div>🎯 Objective Complete: <b>${esc(o.txt)}</b> · +🪙${o.r} +${o.g || 5}${GEM}</div>`).join('')}</div>` : ''}
        ${rw && rw.ach.length ? `<div class="rw-list">${rw.ach.map(x => `<div>${x.ic} Achievement: <b>${esc(x.name)}</b> · +🪙${x.c} +${x.g}${GEM}</div>`).join('')}</div>` : ''}
        ${extra || ''}${endHTML}`);
    }
    resPages = pages; resIdx = 0; showResPage();
    KK.sfx.coin();
  }
  function showResPage() {
    const last = resIdx === resPages.length - 1;
    modal(`<div class="steps">${resPages.map((_, i) => `<i class="${i === resIdx ? 'on' : ''}"></i>`).join('')}</div>${resPages[resIdx]}
      ${last ? '<button class="btn block" data-cont id="res-cont">CONTINUE</button>' : '<button class="btn block" id="res-next">NEXT ▶</button>'}`, 'matchday');
  }
  function scorersFor(n) {
    const xi = KK.lineupPlayers(save).filter(p => p.pos !== 'GK'), ev = [];
    for (let i = 0; i < n; i++) { const w = xi.filter(p => p.pos === 'FW').concat(xi); const s = KK.pick(w); ev.push({ t: 0, name: s.name, min: KK.ri(2, 90), id: s.id }); }
    return ev.sort((x, y) => x.min - y.min);
  }
  const motmMine = res => !!(res && res.motm && res.motm.t === 0 && save.players.some(p => p.id === res.motm.id));
  function rewardsFor(my, op, res, end) {
    const rw = KK.meta.afterMatch(save, { my, op, played: !!res, motmMine: motmMine(res), knocks: res && res.knocks ? res.knocks.filter(k => k.t === 0).map(k => k.id) : [] });
    if (end) { if (end.outcome === 'up') rw.ach.push(...KK.meta.event(save, 'promoted')); if (end.outcome === 'champ' || end.pos === 1) rw.ach.push(...KK.meta.event(save, 'champion')); }
    ['crown', 'shield'].forEach(k => { if (save.cups && save.cups[k] && save.cups[k].winner === 'ME') rw.ach.push(...KK.meta.event(save, 'cup')); });
    KK.meta.ensure(save); persist(); return rw;
  }
  function leagueDone(my, op, home, opp, ids, events, res) {
    const info = KK.recordResult(save, my, op, ids);
    const rw = rewardsFor(my, op, res, info.end);
    render();
    const msgs = (info.cupMsgs || []).filter(Boolean);
    resultModal({ A: home ? meTeam() : opp, B: home ? opp : meTeam(), a: home ? my : op, b: home ? op : my, coins: info.coins, end: info.end, events, res, flip: !home, rw, label: KK.leagueName(save, info.end ? info.end.oldDiv : save.season.div), extra: msgs.length ? `<p style="font-size:13px">${msgs.map(esc).join('<br>')}</p>` : '' });
  }
  function cupDone(k, my, op, events, ids, res) {
    const cup = save.cups[k], f = KK.cupUserFixture(save, cup), home = f.h === 'ME', opp = KK.cupTeam(cup, home ? f.a : f.h), stage = KK.CUP_STAGE[cup.md];
    const info = KK.cupPlayMd(save, cup, { my, op });
    (ids || events.filter(e => e.t === 0 && e.id).map(e => e.id)).forEach(id => { const p = save.players.find(x => x.id === id); if (p) p.goals = (p.goals || 0) + 1; });
    const more = KK.cupAutoAdvance(save);
    const rw = rewardsFor(my, op, res, null); render();
    const msgs = [info.pens ? 'Decided on penalties.' : '', info.msg].concat(more.filter(m => m !== info.msg)).filter(Boolean);
    resultModal({ A: home ? meTeam() : opp, B: home ? opp : meTeam(), a: home ? my : op, b: home ? op : my, coins: info.coins, events, res, flip: !home, rw, label: `${KK.CUPS[k].icon} ${KK.CUPS[k].name} · ${stage}`, extra: msgs.length ? `<p style="font-size:14px"><b>${msgs.map(esc).join('<br>')}</b></p>` : '' });
  }
  function quickSim() {
    const { home, opp } = fixtureInfo();
    const mr = KK.myRating(save) + (home ? 1.5 + (save.stadium || 0) * 0.5 : 0), orr = opp.rating + (home ? 0 : 1.5);
    const [my, op] = KK.simScore(mr, orr), events = scorersFor(my);
    leagueDone(my, op, home, opp, events.map(e => e.id), events, null);
  }
  function cupSim(k) {
    const cup = save.cups[k], f = KK.cupUserFixture(save, cup); if (!f) return;
    const home = f.h === 'ME', opp = KK.cupTeam(cup, home ? f.a : f.h);
    const [my, op] = KK.simScore(KK.myRating(save) + (home ? 1.5 + (save.stadium || 0) * 0.5 : 0), opp.rating + (home ? 0 : 1.5));
    cupDone(k, my, op, scorersFor(my), null, null);
  }
  function resolveCtx(ctx) {
    let T0, T1, homeIs0, label;
    if (ctx.kind === 'league') { const fi = fixtureInfo(); T0 = meTeam(); T1 = fi.opp; homeIs0 = fi.home; label = KK.leagueName(save); }
    else if (ctx.kind === 'cup') { const cup = save.cups[ctx.cup], f = KK.cupUserFixture(save, cup); if (!f) return null; homeIs0 = f.h === 'ME'; T0 = meTeam(); T1 = KK.cupTeam(cup, homeIs0 ? f.a : f.h); label = KK.CUPS[ctx.cup].name; }
    else { if (ctx.B.id === 'ME') { T0 = ctx.B; T1 = ctx.A; homeIs0 = false; } else { T0 = ctx.A; T1 = ctx.B; homeIs0 = true; } label = 'Exhibition'; }
    return { T0, T1, homeIs0, label };
  }
  const WX = { clear: '🌙 Floodlit Night', rain: '🌧️ Rain', snow: '❄️ Snow' };
  let pendingCtx = null;
  const DIFF = ['Academy', 'Medium', 'Hard', 'Elite'];
  function diffOf() { const v = KK.settings.diff; return v == null ? 1 : +v; }
  function prematch(ctx) {
    const R = resolveCtx(ctx); if (!R) return;
    const wset = KK.settings.weather || 'auto', rw = Math.random();
    if (!ctx.weather) ctx.weather = wset === 'auto' ? (rw < 0.6 ? 'clear' : rw < 0.82 ? 'rain' : 'snow') : wset;
    pendingCtx = ctx;
    const H = R.homeIs0 ? R.T0 : R.T1, Aw = R.homeIs0 ? R.T1 : R.T0;
    const xiOf = t => t.id === 'ME' ? KK.lineupPlayers(save) : KK.oppSquad(t);
    const ovr = t => t.id === 'ME' ? KK.myRating(save) : t.rating;
    const col = t => { const xi = xiOf(t), me = t.id === 'ME', sh = me ? save.team.kit.shirt : (t.c1 || '#1e429f'); return `<div class="pm-col"><div class="pm-team">${crestOf(t, 46)}<div><b>${esc(t.name)}</b><small>OVR ${ovr(t)} · ${me ? save.formation : (t.form || '4-4-2')}</small></div></div><div class="pm-ovr"><i style="width:${Math.max(8, (ovr(t) - 35) / 60 * 100)}%"></i></div>
      <div class="pm-list">${xi.map(p => `<div>${KK.meta.faceSVG(p, 20, p.pos === 'GK' ? '#00c853' : sh)}<span class="pos ${p.pos}">${p.pos}</span><span class="nm">${esc(surname(p.name))}</span>${me ? fitBar(p) : ''}<span class="rt">${p.rating}</span></div>`).join('')}</div></div>`; };
    const homeSt = R.T0.id === 'ME' ? R.homeIs0 : R.T1.id === 'ME' ? !R.homeIs0 : false;
    const ground = homeSt ? KK.STADIUM[Math.min(KK.STADIUM.length - 1, save.stadium || 0)].name : 'Away Stadium';
    modal(`<small class="pg">LIVE BROADCAST · ${esc(R.label).toUpperCase()}</small>
      <div class="pm"><div class="pm-side">${col(H)}</div><div class="pm-mid"><div class="pm-vs">VS</div><div class="pm-info"><span>${WX[ctx.weather]}</span><span>🏟️ ${esc(ground)}</span><span>⏱️ ${KK.settings.len || 3} min</span><span>🎮 ${esc(R.T0.short)}</span></div><div class="chips pm-diff">${DIFF.map((t, i) => `<button class="chip ${diffOf() === i ? 'on' : ''}" data-diff="${i}">${t}</button>`).join('')}</div><button class="playbtn pm-go" id="pm-go">KICK OFF ▶</button>${R.T0.id === 'ME' ? '<button class="btn sm alt" data-go="squad">👕 Team Mgmt</button>' : ''}<button class="btn sm alt" data-close>Back</button></div><div class="pm-side">${col(Aw)}</div></div>`, 'matchday wide');
  }
  function halfTime(m, homeIs0, H, Aw) {
    if (match !== m || m.state !== 'half') return;
    m.paused = true;
    const ov = $('#m-overlay'); ov.classList.remove('hidden');
    ov.innerHTML = `<div class="modal-card matchday"><small class="pg">HALF TIME REPORT</small><div class="ftbar"><div>${crestOf(H, 36)}<b>${esc(H.short)}</b></div><div class="ftsc">${$('#h-score').textContent}</div><div><b>${esc(Aw.short)}</b>${crestOf(Aw, 36)}</div></div>${statsHTML(m.st, !homeIs0)}
      <div class="row" style="margin-top:10px"><button class="btn alt" id="p-subs">🔁 Substitutions (${5 - m.subsUsed})</button><button class="btn grow" id="ht-go">▶ SECOND HALF</button></div></div>`;
  }
  let sayTO = 0;
  function say(txt) { if (KK.settings.noComm) return; const c = $('#commentary'); c.textContent = txt; c.classList.remove('hidden'); clearTimeout(sayTO); sayTO = setTimeout(() => c.classList.add('hidden'), 2600); }
  function myCfgOf(home, opp) { const k = !home && opp && opp.c1 && KK.colorDist(save.team.kit.shirt, opp.c1) < 120 && save.team.away ? save.team.away : save.team.kit; return { name: save.team.name, short: save.team.short, shirt: k.shirt, shorts: k.shorts, socks: k.socks, pattern: k.pattern || 'plain', c2: k.c2 || '#ffffff', gk: '#00c853', players: KK.lineupPlayers(save), formation: save.formation, rating: KK.myRating(save) + (home ? 1.5 + (save.stadium || 0) * 0.5 : 0) }; }
  function aiCfgOf(t, home, vsShirt) {
    let shirt = t.c1, shorts = t.c2;
    if (vsShirt && KK.colorDist(shirt, vsShirt) < 120) { shirt = KK.colorDist(vsShirt, '#ffffff') < 150 ? '#111111' : '#ffffff'; shorts = t.c1; }
    const hsh = [...t.name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 3), pats = ['plain', 'plain', 'plain', 'stripes', 'hoops', 'plain', 'sash', 'halves', 'pinstripe', 'plain'];
    const pattern = shirt === t.c1 ? pats[hsh % pats.length] : 'plain', c2 = KK.colorDist(t.c2, shirt) > 90 ? t.c2 : (KK.colorDist(shirt, '#ffffff') < 150 ? '#111111' : '#ffffff');
    return { name: t.name, short: t.short, shirt, shorts, pattern, c2, gk: '#fb8c00', players: KK.oppSquad(t), formation: t.form || '4-4-2', rating: t.rating + (home ? 1.5 : 0) };
  }
  async function get3D() {
    const q = KK.settings.q;
    if (KK.r3inst && KK.r3inst.q === q) return KK.r3inst;
    if (KK.r3inst) { try { KK.r3inst.dispose(); } catch (e) {} KK.r3inst = null; const old = $('#pitch3d'), fresh = old.cloneNode(false); old.replaceWith(fresh); }
    const mod = await import('./gfx3d.js');
    KK.r3inst = mod.create($('#pitch3d'), { quality: q });
    return KK.r3inst;
  }
  let starting = false;
  async function startMatch(ctx) {
    if (match || starting) return;
    starting = true;
    try { await startMatchInner(ctx); } finally { starting = false; }
  }
  async function startMatchInner(ctx) {
    KK.sfx.unlock();
    const RC = resolveCtx(ctx); if (!RC) return;
    const { T0, T1, homeIs0, label } = RC;
    const cfg0 = T0.id === 'ME' ? myCfgOf(homeIs0, T1) : aiCfgOf(T0, homeIs0);
    const cfg1 = T1.id === 'ME' ? myCfgOf(!homeIs0, T0) : aiCfgOf(T1, !homeIs0, cfg0.shirt);
    if (T1.id === 'ME' && KK.colorDist(cfg1.shirt, cfg0.shirt) < 120) { cfg0.shirt = KK.colorDist(cfg1.shirt, '#ffffff') < 150 ? '#111111' : '#ffffff'; }
    cfg1.gk = KK.colorDist(cfg0.gk, cfg1.shirt) < 120 || KK.colorDist(cfg0.gk, cfg0.shirt) < 120 ? '#00e5ff' : '#c6ff00';
    const H = homeIs0 ? T0 : T1, Aw = homeIs0 ? T1 : T0;
    $('#match').classList.remove('hidden'); document.body.style.overflow = 'hidden';
    $('#h-crest').innerHTML = crestOf(H, 22); $('#a-crest').innerHTML = crestOf(Aw, 22);
    $('#h-name').textContent = H.short; $('#a-name').textContent = Aw.short;
    $('#m-overlay').classList.add('hidden');
    landscapeFirst();
    let r3 = null;
    if (KK.settings.gfx === '3d') {
      try { r3 = await get3D(); } catch (e) { console.warn('3D unavailable, using 2D', e && e.message); KK.r3fail = String(e && e.message || e); toast('3D not supported here, using Classic 2D'); r3 = null; }
    }
    if (r3) r3.zoom = KK.settings.cam === 'close' ? 0.72 : 1;
    $('#pitch3d').classList.toggle('hidden', !r3); $('#match').classList.toggle('is3d', !!r3);
    let lastHud = '';
    const wset = KK.settings.weather || 'auto', rw = Math.random();
    const weather = ctx.weather || (wset === 'auto' ? (rw < 0.6 ? 'clear' : rw < 0.82 ? 'rain' : 'snow') : wset);
    $('#commentary').classList.add('hidden');
    const homeSt = T0.id === 'ME' ? homeIs0 : T1.id === 'ME' ? !homeIs0 : false;
    match = new KK.Match($('#pitch'), {
      my: cfg0, opp: cfg1, lengthMin: KK.settings.len || 3, kickoffTeam: homeIs0 ? 0 : 1, r3, weather, mini: $('#minimap'),
      roles: save ? save.roles : null,
      stadiumLevel: homeSt && save ? Math.min(7, save.stadium || 0) : 3, seed: Math.floor(Math.random() * 1000),
      onHud(m) {
        const sc = homeIs0 ? `${m.score[0]} - ${m.score[1]}` : `${m.score[1]} - ${m.score[0]}`, tm = m.clock();
        const lb = m.labels(), key = sc + tm + lb.A + m.ment[0];
        if (key !== lastHud) {
          lastHud = key; $('#h-score').textContent = sc; $('#h-time').textContent = m.state === 'end' ? 'FT' : tm;
          for (const k of ['A', 'B', 'C']) { const el = $('#b-' + k.toLowerCase() + ' textPath'); if (el.textContent !== lb[k]) el.textContent = lb[k]; }
          const mb = $('#m-ment'); mb.querySelector('span').textContent = MENT[m.ment[0]]; mb.className = ['def', 'bal', 'att'][m.ment[0]];
        }
        $('#joybase').classList.toggle('sprint', m.sprinting());
        const rpOn = m.state === 'play' && m.hasReplay(); if (rpOn !== m._rpOn) { m._rpOn = rpOn; $('#m-rplus').classList.toggle('hidden', !rpOn); }
        if (m.cfg.onTick) m.cfg.onTick(m);
      },
      onSay: say,
      onHalf(m) { setTimeout(() => halfTime(m, homeIs0, H, Aw), 1300); },
      onEnd(res) {
        closeMatch();
        if (ctx.kind === 'league') return leagueDone(res.my, res.opp, homeIs0, T1, res.scorers, res.events, res);
        if (ctx.kind === 'cup') return cupDone(ctx.cup, res.my, res.opp, res.events, res.scorers, res);
        render();
        resultModal({ A: H, B: Aw, a: homeIs0 ? res.my : res.opp, b: homeIs0 ? res.opp : res.my, coins: 0, events: res.events, res, flip: !homeIs0, label });
      },
    });
    match.setMent(KK.settings.ment == null ? 1 : KK.settings.ment);
    match.subsUsed = 0; match.bench = T0.id === 'ME' ? save.players.filter(p => !save.lineup.includes(p.id)) : [];
    KK.currentMatch = match; $('#m-rplus').classList.add('hidden');
    if (!KK.settings.tutDone && !ctx.noTut) tutorial(0);
  }

  const TUT = [
    ['#joybase', '🕹️ Directional Stick', 'Drag anywhere on the left side to dribble & move. The neon chevron under your player shows your aim direction.'],
    ['#b-b', 'B · Low Kick / Pressure', 'With the ball: crisp ground pass. Without the ball: hold B to press and close down the ball carrier.'],
    ['#b-a', 'A · Hard Kick / Slide Tackle', 'With the ball: hold A to charge the Shot Power Bar and shoot! Without the ball: slide tackle.'],
    ['#b-c', 'C · Lofted Kick / Switch Player', 'With the ball: lob pass, chipped through-ball, or cross into the box. Without the ball: switch active defender.'],
    ['#b-sprint', '⚡ Sprint', 'Hold SPRINT (or push the stick to its outer edge) to burst past defenders. Watch your player stamina bar!'],
    ['#m-ment', '📋 Tactical Mentality', 'Tap below the radar to switch live between Defending, Balanced, and Attacking team mentality.'],
    ['#m-pause', '⏸️ Substitutions & Replays', 'Open the Tactical Pause menu to make up to 5 substitutions or watch multi-angle Instant Replays (R+).'],
  ];
  function tutorial(i) {
    const box = $('#tut'); document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl'));
    if (!match || i >= TUT.length) { box.classList.add('hidden'); KK.settings.tutDone = true; persist(); if (match) { match.paused = false; match.last = performance.now(); } return; }
    match.paused = true; const [sel, h, p] = TUT[i]; const el = $(sel); if (el) el.classList.add('tut-hl');
    box.innerHTML = `<div class="tut-card"><small class="pg">DLS CONTROLS ${i + 1}/${TUT.length}</small><h3>${h}</h3><p>${p}</p><div class="row"><button class="btn sm alt" data-tut="skip">Skip</button><button class="btn sm" data-tut="${i + 1}">${i + 1 < TUT.length ? 'Next ▶' : 'Kick Off!'}</button></div></div>`;
    box.classList.remove('hidden');
  }
  $('#tut').addEventListener('click', e => { const b = e.target.closest('[data-tut]'); if (!b) return; tutorial(b.dataset.tut === 'skip' ? 99 : +b.dataset.tut); });
  $('#m-rplus').addEventListener('click', () => { if (match && match.state === 'play') { match.paused = false; match.last = performance.now(); match.startReplay(null); } });
  $('#match').addEventListener('pointerdown', e => { if (match && match.state === 'replay' && !e.target.closest('#m-pause,#m-tac,#m-overlay,#tut')) { e.preventDefault(); match.skipReplay(); } }, true);
  function closeMatch() { $('#rotate').classList.add('hidden'); $('#tut').classList.add('hidden'); $('#m-rplus').classList.add('hidden'); try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {} if (match) match.destroy(); match = null; KK.currentMatch = null; $('#match').classList.add('hidden'); document.body.style.overflow = ''; }

  // Tactical Pause & 5-Substitution Menu
  function pauseMenu() {
    if (!match || match.state === 'end') return; match.paused = true;
    const ov = $('#m-overlay'); ov.classList.remove('hidden');
    ov.innerHTML = `<div class="modal-card"><h2>TACTICAL PAUSE</h2><p>${$('#h-name').textContent} ${$('#h-score').textContent} ${$('#a-name').textContent} · ${match.minute()}'</p>
      <button class="btn block" id="p-resume">▶ Resume Match</button>
      ${match.hasReplay && match.hasReplay() ? '<button class="btn alt block" id="p-replay" style="margin-top:8px"><b class="rplus">R+</b> Instant Action Replay</button>' : ''}
      <button class="btn alt block" id="p-subs" style="margin-top:8px">🔁 Substitutions (${5 - match.subsUsed} remaining)</button>
      <div class="chips" style="justify-content:center;margin-top:10px">${MENT.map((t, i) => `<button class="chip ${match.ment[0] === i ? 'on' : ''}" data-ment="${i}">${t}</button>`).join('')}</div>
      <button class="btn alt block" id="p-mute" style="margin-top:8px">${KK.settings.mute ? '🔇 Sound Muted' : '🔊 Sound Active'}</button>
      <button class="btn alt block" id="p-sim" style="margin-top:8px">⏩ Sim Remainder of Match</button>
      <p style="font-size:11px;color:var(--mute);margin-top:12px">Controls: Left Stick Move · B Low Kick / Press · A Hard Kick / Slide · C Lofted Kick / Switch</p></div>`;
  }
  function subsMenu(selOn) {
    const ov = $('#m-overlay'); const on = match.ents.filter(e => e.t === 0);
    const sh = save && save.team && save.team.kit ? save.team.kit.shirt : '#1e429f';
    ov.innerHTML = `<div class="modal-card" style="text-align:left"><h3>🔁 Live Substitutions (${5 - match.subsUsed} left)</h3>
      <p style="font-size:13px;color:var(--mute)">${selOn == null ? '1. Tap the pitch player coming OFF.' : '2. Select a substitute coming ON.'}</p>
      <ul class="plist">${selOn == null ? on.map(e => `<li data-off="${e.i}">${KK.meta.faceSVG(e.sp, 34, e.pos === 'GK' ? '#00c853' : sh)}<span class="pos ${e.pos}">${e.pos}</span><div class="pname"><b>${esc(e.sp.name)}</b><small>Stamina ${Math.round((e.stam || 1) * 100)}%</small></div><span class="rt">${e.sp.rating}</span></li>`).join('') :
        match.bench.map(p => `<li data-on="${p.id}" data-slot2="${selOn}">${KK.meta.faceSVG(p, 34, p.pos === 'GK' ? '#00c853' : sh)}<span class="pos ${p.pos}">${p.pos}</span><div class="pname"><b>${esc(p.name)}</b><small>Stamina ${p.fit == null ? 100 : p.fit}%</small></div><span class="rt">${p.rating}</span></li>`).join('') || '<li>No substitutes available</li>'}</ul>
      <button class="btn alt block" id="p-back" style="margin-top:10px">Back</button></div>`;
  }
  $('#m-overlay').addEventListener('click', e => {
    const t = e.target.closest('button,li'); if (!t || !match) return;
    if (t.id === 'ht-go') { match.paused = false; match.last = performance.now(); $('#m-overlay').classList.add('hidden'); }
    else if (t.id === 'p-replay') { $('#m-overlay').classList.add('hidden'); match.paused = false; match.last = performance.now(); match.startReplay(null); }
    else if (t.id === 'p-resume') { match.paused = false; match.last = performance.now(); $('#m-overlay').classList.add('hidden'); }
    else if (t.dataset.ment) { setMent(+t.dataset.ment); pauseMenu(); }
    else if (t.id === 'p-mute') { KK.sfx.setMute(!KK.settings.mute); if (!KK.settings.mute) KK.sfx.crowdStart(); persist(); pauseMenu(); }
    else if (t.id === 'p-sim') { $('#m-overlay').classList.add('hidden'); match.simRest(); }
    else if (t.id === 'p-subs') { if (match.subsUsed >= 5) return toast('All 5 substitutions used'); subsMenu(null); }
    else if (t.id === 'p-back') pauseMenu();
    else if (t.dataset.off !== undefined) subsMenu(+t.dataset.off);
    else if (t.dataset.on) {
      const slot = +t.dataset.slot2, p = match.bench.find(x => x.id === t.dataset.on), e2 = match.ents.find(x => x.t === 0 && x.i === slot); if (!p || !e2 || !e2.sp) return pauseMenu();
      match.bench = match.bench.filter(x => x !== p).concat([e2.sp]); match.substitute(slot, p); match.subsUsed++; toast(`🔁 ${surname(p.name)} replaces ${surname(e2.sp.name)}`); pauseMenu();
    }
  });
  $('#m-pause').addEventListener('click', pauseMenu);
  $('#m-tac').addEventListener('click', pauseMenu);
  const MENT = ['DEFENDING', 'BALANCED', 'ATTACKING'];
  function setMent(v) { if (!match) return; match.setMent(v); KK.settings.ment = v; persist(); const mb = $('#m-ment'); mb.querySelector('span').textContent = MENT[v]; mb.className = ['def', 'bal', 'att'][v]; }
  $('#m-ment').addEventListener('click', () => { if (match) { setMent((match.ment[0] + 1) % 3); toast('Mentality: ' + MENT[match.ment[0]]); } });

  const isTouch = () => matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  async function goLandscape() {
    try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) {}
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) {}
  }
  function landscapeFirst() {
    const rot = $('#rotate'); rot.classList.add('hidden');
    if (!isTouch()) return;
    goLandscape().finally(() => setTimeout(() => {
      if (match && innerHeight > innerWidth && !KK.settings.portraitOk) { rot.classList.remove('hidden'); match.paused = true; }
    }, 350));
  }
  function rotDone() { $('#rotate').classList.add('hidden'); if (match) { match.paused = false; match.last = performance.now(); } }
  $('#rot-go').addEventListener('click', () => goLandscape().finally(() => setTimeout(() => { if (innerWidth > innerHeight) rotDone(); }, 400)));
  $('#rot-skip').addEventListener('click', () => { KK.settings.portraitOk = true; persist(); rotDone(); });
  window.addEventListener('resize', () => { if (!$('#rotate').classList.contains('hidden') && innerWidth > innerHeight) rotDone(); });

  // Virtual Joystick
  const jz = $('#joyzone'), base = $('#joybase'), knob = $('#joyknob'); let joyId = null, jx0 = 0, jy0 = 0;
  function joyHome() { base.style.left = ''; base.style.top = ''; base.style.bottom = ''; knob.style.transform = ''; }
  jz.addEventListener('pointerdown', e => {
    e.preventDefault(); KK.sfx.unlock(); joyId = e.pointerId; try { jz.setPointerCapture(e.pointerId); } catch (x) {}
    const r = jz.getBoundingClientRect(), br = base.getBoundingClientRect(), bw = base.offsetWidth;
    if (Math.hypot(e.clientX - (br.left + bw / 2), e.clientY - (br.top + bw / 2)) > bw / 2) { base.style.left = (e.clientX - r.left - bw / 2) + 'px'; base.style.top = (e.clientY - r.top - bw / 2) + 'px'; base.style.bottom = 'auto'; jx0 = e.clientX; jy0 = e.clientY; }
    else { jx0 = br.left + bw / 2; jy0 = br.top + bw / 2; joyMove(e); }
  });
  function joyMove(e) {
    if (e.pointerId !== joyId || !match) return;
    const R = base.offsetWidth * 0.36;
    let dx = e.clientX - jx0, dy = e.clientY - jy0; const d = Math.hypot(dx, dy);
    match.input.edge = d > R * 1.25;
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; match.input.jx = dx / R; match.input.jy = dy / R;
  }
  jz.addEventListener('pointermove', joyMove);
  const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; if (match) { match.input.jx = 0; match.input.jy = 0; match.input.edge = false; } joyHome(); };
  jz.addEventListener('pointerup', joyEnd); jz.addEventListener('pointercancel', joyEnd);
  function hold(id, down, up) {
    const el = $(id);
    el.addEventListener('pointerdown', e => { e.preventDefault(); KK.sfx.unlock(); el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (x) {} if (match) down(); });
    const end = e => { if (!el.classList.contains('down')) return; el.classList.remove('down'); if (match) up(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  for (const k of ['A', 'B', 'C']) hold('#b-' + k.toLowerCase(), () => match.btn(k, true), () => match.btn(k, false));
  hold('#b-sprint', () => { match.input.sprintBtn = true; }, () => { match.input.sprintBtn = false; });
  const MOVE = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
  window.addEventListener('keydown', e => {
    if (!match) return; if (e.repeat && !MOVE.includes(e.code)) { e.preventDefault(); return; }
    KK.sfx.unlock();
    if (MOVE.includes(e.code)) { match.input.keys.add(e.code); e.preventDefault(); }
    else if (e.code === 'KeyJ' || e.code === 'Space') { match.btn('B', true); e.preventDefault(); }
    else if (e.code === 'KeyK' || e.code === 'Enter') { match.btn('A', true); e.preventDefault(); }
    else if (e.code === 'KeyU' || e.code === 'KeyI') { match.btn('C', true); e.preventDefault(); }
    else if (e.code === 'KeyL' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { match.input.keys.add(e.code); e.preventDefault(); }
    else if (e.code === 'KeyM') { setMent((match.ment[0] + 1) % 3); }
    else if (e.code === 'KeyP' || e.code === 'Escape') { if (match.paused) { $('#p-resume') && $('#p-resume').click(); } else pauseMenu(); }
  });
  window.addEventListener('keyup', e => {
    if (!match) return;
    if (MOVE.includes(e.code)) match.input.keys.delete(e.code);
    else if (e.code === 'KeyK' || e.code === 'Enter') match.btn('A', false);
    else if (e.code === 'KeyJ' || e.code === 'Space') match.btn('B', false);
    else if (e.code === 'KeyU' || e.code === 'KeyI') match.btn('C', false);
    else if (e.code === 'KeyL' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') match.input.keys.delete(e.code);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && match && !match.paused) pauseMenu(); });

  if (!save) view = 'builder';
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
