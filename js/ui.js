/* Kente Kickers — screens & controls */
'use strict';
(function () {
  const KK = window.KK, $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let save = KK.load();
  KK.settings = save ? save.settings : { mute: false, len: 3 };
  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 3;
  if (!KK.settings.gfx) KK.settings.gfx = '3d';
  if (!KK.settings.q) KK.settings.q = lowEnd ? 'low' : 'high';
  let view = 'hub', selSlot = null, match = null, draft = null, cupTab = null, euFilter = '';
  const PATTERNS = ['plain', 'halves', 'stripes', 'chevron', 'kente'], EMBLEMS = ['star', 'ball', 'drum', 'bird', 'letters'];

  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 2200); }
  function modal(html) { $('#modal-card').innerHTML = html; $('#modal').classList.remove('hidden'); }
  function closeModal() { $('#modal').classList.add('hidden'); }
  KK.ui = { toast, modal, closeModal };
  const persist = () => KK.save(save);
  KK.ui.getSave = () => save; // read-only hook used by automated tests
  const surname = n => n.split(' ').slice(-1)[0];
  const crestOf = (t, size) => t.id === 'ME' ? KK.crestSVG(save.team.crest, size, save.team.short) : KK.crestSVG({ c1: t.c1, c2: t.c2, pattern: PATTERNS[t.name.length % 5], emblem: EMBLEMS[t.name.charCodeAt(0) % 5] }, size, t.short);

  function updateTop() {
    const on = !!save && view !== 'builder';
    $('#topbar').classList.toggle('hidden', !on); $('#bottomnav').classList.toggle('hidden', !on);
    $('#tb-mute').textContent = KK.settings.mute ? '🔇' : '🔊';
    if (!on) return;
    $('#tb-crest').innerHTML = KK.crestSVG(save.team.crest, 34, save.team.short);
    $('#tb-name').textContent = save.team.name;
    $('#tb-div').innerHTML = `${flagOf(save, 16, 11)} ${esc(KK.leagueName(save))} · Season ${save.season.year}`;
    $('#tb-coins').textContent = save.coins.toLocaleString();
    document.querySelectorAll('#bottomnav button').forEach(b => b.classList.toggle('on', b.dataset.go === view));
  }
  const flagOf = (sv, w = 24, h = 16) => KK.flagSVG(KK.career(sv).mode === 'eu' ? KK.country(sv.career.country).flag : KK.GHANA_FLAG, w, h);
  function go(v) { view = v; selSlot = null; render(); window.scrollTo(0, 0); }
  KK.go = go;

  function render() {
    updateTop();
    const el = $('#screen');
    if (!save || view === 'builder') el.innerHTML = builderHTML();
    else el.innerHTML = ({ hub: hubHTML, squad: squadHTML, market: marketHTML, league: leagueHTML, club: clubHTML, cups: cupsHTML }[view] || hubHTML)();
  }

  // ---------- builder ----------
  function newDraft() {
    draft = { name: 'Sewa United', short: 'SEW', crest: { c1: '#c62828', c2: '#fdd835', pattern: 'kente', emblem: 'star' }, kit: { shirt: '#c62828', shorts: '#111111' }, players: KK.genSquad(50), career: { mode: 'gh' } };
  }
  function draftSquad() {
    const c = draft.career;
    if (c.mode === 'eu') { const co = KK.country(c.country); draft.players = KK.genSquad(KK.tierBase(co, c.tier) - 4, co.style); }
    else draft.players = KK.genSquad(50);
  }
  function careerHTML() {
    const c = draft.career;
    let eu = '';
    if (c.mode === 'eu') {
      const q = euFilter.toLowerCase();
      const list = KK.COUNTRIES.filter(x => !q || x.name.toLowerCase().includes(q) || x.brand.toLowerCase().includes(q));
      const co = c.country && KK.country(c.country);
      eu = `<input type="text" id="f-eusearch" placeholder="Search ${KK.COUNTRIES.length} countries…" value="${esc(euFilter)}" style="margin-top:10px">
      <div class="clist" id="clist">${list.map(x => `<button data-country="${x.code}" class="${c.country === x.code ? 'on' : ''}">${KK.flagSVG(x.flag, 30, 20)}<span><b>${esc(x.name)}</b><small>${esc(x.brand)} · ${x.tiers} tier${x.tiers > 1 ? 's' : ''}</small></span><span class="lv">OVR ${x.top}</span></button>`).join('')}</div>
      ${co ? `<label class="lbl">Start in</label><div class="chips">${Array.from({ length: co.tiers }, (_, i) => i + 1).map(t => `<button class="chip ${c.tier === t ? 'on' : ''}" data-tier="${t}">${esc(KK.tierName(co, t))} <small>~${KK.tierBase(co, t)}</small></button>`).join('')}</div>
      <p style="font-size:12px;color:var(--mute);margin:6px 0 0">${co.tiers > 1 ? 'Top 2 go up, bottom 2 go down. ' : ''}Finish high in the top tier to qualify for the Continental Crown Cup or the Continental Shield.</p>` : '<p style="font-size:13px;color:var(--mute)">Pick a country to see its leagues.</p>'}`;
    }
    return `<div class="card"><h3>0. Where do you start?</h3>
      <div class="chips"><button class="chip ${c.mode === 'gh' ? 'on' : ''}" data-mode="gh">${KK.flagSVG(KK.GHANA_FLAG, 20, 13)} Ghana Road to Glory</button><button class="chip ${c.mode === 'eu' ? 'on' : ''}" data-mode="eu">🌍 European leagues (${KK.allLeagues().length})</button></div>
      ${c.mode === 'gh' ? '<p style="font-size:13px;color:var(--mute);margin:8px 0 0">Start in Division 6 and climb all the way to Division 1.</p>' : eu}
    </div>`;
  }
  function builderHTML() {
    if (!draft) newDraft();
    const sw = (key, val) => KK.COLORS.map(c => `<button class="sw ${val === c ? 'on' : ''}" style="background:${c}" data-sw="${key}" data-c="${c}" aria-label="colour ${c}"></button>`).join('');
    const d = draft;
    return `<div class="hero"><div class="logo">⚽ KENTE KICKERS</div><div class="kente"></div><div style="color:var(--mute)">Build your club. Climb to the top, at home or across Europe.</div></div>
    ${careerHTML()}
    <div class="card"><h3>1. Club name</h3>
      <input type="text" id="f-name" maxlength="22" value="${esc(d.name)}" placeholder="Your club name">
      <label class="lbl">Short name (3 letters)</label><input type="text" id="f-short" maxlength="3" value="${esc(d.short)}" style="text-transform:uppercase">
    </div>
    <div class="card"><h3>2. Crest</h3>
      <div class="preview" id="pv">${KK.crestSVG(d.crest, 96, d.short)}${KK.kitSVG(d.kit.shirt, d.kit.shorts, 80)}</div>
      <label class="lbl">Main colour</label><div class="swatches">${sw('c1', d.crest.c1)}</div>
      <label class="lbl">Second colour</label><div class="swatches">${sw('c2', d.crest.c2)}</div>
      <label class="lbl">Pattern</label><div class="chips">${PATTERNS.map(p => `<button class="chip ${d.crest.pattern === p ? 'on' : ''}" data-pat="${p}">${p}</button>`).join('')}</div>
      <label class="lbl">Badge</label><div class="chips">${EMBLEMS.map(p => `<button class="chip ${d.crest.emblem === p ? 'on' : ''}" data-emb="${p}">${p}</button>`).join('')}</div>
      <button class="btn sm alt" id="f-randcrest" style="margin-top:10px">🎲 Random crest</button>
    </div>
    <div class="card"><h3>3. Kit</h3>
      <label class="lbl">Shirt</label><div class="swatches">${sw('shirt', d.kit.shirt)}</div>
      <label class="lbl">Shorts</label><div class="swatches">${sw('shorts', d.kit.shorts)}</div>
    </div>
    <div class="card"><div class="row between"><h3>4. Starting squad (${d.players.length})</h3><button class="btn sm alt" id="f-reroll">🎲 New squad</button></div>
      <ul class="plist">${d.players.map(p => `<li><span class="pos ${p.pos}">${p.pos}</span><div class="pname"><b>${esc(p.name)}</b><small>Age ${p.age} · PAC ${p.stats.pac} SHO ${p.stats.sho} PAS ${p.stats.pas} DEF ${p.stats.def}</small></div><span class="rt">${p.rating}</span></li>`).join('')}</ul>
    </div>
    <button class="btn block" id="f-start" style="margin:14px 0 30px">START CAREER ▶</button>`;
  }

  // ---------- hub ----------
  function hubHTML() {
    const s = save.season, f = KK.nextFixture(save), t = KK.table(save), pos = t.findIndex(r => r.id === 'ME') + 1;
    const len = KK.settings.len || 3;
    let next = '<p>Season finished.</p>';
    if (f) {
      const home = f.h === 'ME', opp = KK.teamById(save, home ? f.a : f.h);
      next = `<div class="next"><div>${KK.crestSVG(save.team.crest, 60, save.team.short)}<b>${esc(save.team.short)}</b><small>OVR ${KK.myRating(save)}</small></div><div><div class="vs">VS</div><small>${home ? 'HOME' : 'AWAY'}</small></div><div>${crestOf(opp, 60)}<b>${esc(opp.short)}</b><small>OVR ${opp.rating}</small></div></div>
      <div style="text-align:center;margin-bottom:8px"><b>${esc(opp.name)}</b></div>
      <label class="lbl">Match length</label><div class="chips" style="margin-bottom:10px">${[2, 3, 5].map(m => `<button class="chip ${len === m ? 'on' : ''}" data-len="${m}">${m} min</button>`).join('')}</div>
      <button class="btn block" id="h-play">▶ PLAY MATCH</button>
      <button class="btn alt block" id="h-sim" style="margin-top:8px">⏩ Quick sim</button>`;
    }
    const hist = (save.history || []).slice(-6).reverse();
    const cupCards = ['crown', 'shield'].map(k => {
      const cup = save.cups && save.cups[k]; if (!cup || !cup.userIn) return '';
      const def = KK.CUPS[k], uf = KK.cupUserFixture(save, cup);
      if (!uf) return `<div class="card cupcard"><div class="cuphead"><span class="ic">${def.icon}</span><div><h3>${def.name}</h3><small>${cup.winner === 'ME' ? '🏆 You won it!' : cup.userOut ? 'Your run is over this season.' : 'Waiting for the next round.'}</small></div></div></div>`;
      const home = uf.h === 'ME', opp = KK.cupTeam(cup, home ? uf.a : uf.h), due = KK.cupDue(save, cup);
      return `<div class="card cupcard"><div class="cuphead"><span class="ic">${def.icon}</span><div><h3>${def.name}</h3><small>${KK.CUP_STAGE[cup.md]} · ${home ? 'HOME' : 'AWAY'} vs <b>${esc(opp.name)}</b> ${opp.country ? KK.flagSVG(KK.country(opp.country).flag, 16, 11) : ''} (OVR ${opp.rating})</small></div></div>
        ${due ? `<button class="btn block" data-cupplay="${k}" style="margin-top:10px">▶ PLAY CUP MATCH</button><button class="btn alt block" data-cupsim="${k}" style="margin-top:8px">⏩ Quick sim</button>` : `<p style="font-size:13px;color:var(--mute)">Opens after league round ${KK.CUP_DUE[cup.md]}.</p>`}</div>`;
    }).join('');
    return `<div class="card"><div class="row between"><h3>Round ${Math.min(s.round + 1, s.fixtures.length)} of ${s.fixtures.length}</h3><span class="tag">${pos}${['st', 'nd', 'rd'][pos - 1] || 'th'} · ${esc(KK.leagueName(save))}</span></div>${next}</div>
    ${cupCards}
    <div class="card"><div class="row between"><div><h3>🤝 Friendly</h3><small style="color:var(--mute)">Any club vs any club, from ${KK.allLeagues().length} leagues. No effect on your season.</small></div><button class="btn sm" id="h-friendly">Play</button></div></div>
    <div class="row"><div class="stat"><small>Team OVR</small><span class="big-num">${KK.myRating(save)}</span></div><div class="stat"><small>Coins</small><span class="big-num">${save.coins.toLocaleString()}</span></div><div class="stat"><small>Trophies</small><span class="big-num">${(save.trophies || []).length}</span></div></div>
    <div class="card"><h3>Recent results</h3>${hist.length ? hist.map(h => `<div class="fx"><span><span class="res ${h.res}">${h.res}</span>${h.cup ? KK.CUPS[h.cup].icon + ' ' : ''}vs ${esc(h.opp)}</span><span class="sc">${h.my} - ${h.op}</span></div>`).join('') : '<p style="color:var(--mute)">No matches yet. Kick off your first game!</p>'}</div>
    <div class="card"><h3>How to play</h3><p style="font-size:14px;line-height:1.5;color:var(--mute)">Drag the left side of the screen to run. <b>PASS</b> passes in the direction you are running (or switches player when defending). Hold and release <b>SHOOT</b> for power. <b>TACKLE</b> steals the ball near an opponent; hold it to sprint. Keyboard: arrows/WASD, J pass, K shoot, L tackle/sprint, P pause.</p></div>`;
  }

  // ---------- squad ----------
  function squadHTML() {
    const slots = KK.FORMATIONS[save.formation];
    const xi = save.lineup.map(id => save.players.find(p => p.id === id));
    const dots = slots.map((s, i) => {
      const p = xi[i]; const bad = p && p.pos !== s[0];
      return `<div class="slot ${selSlot === i ? 'sel' : ''} ${bad ? 'bad' : ''}" data-slot="${i}" style="left:${s[2] * 100}%;top:${(1 - s[1] / 0.72) * 88 + 6}%"><div class="dot" style="background:${s[0] === 'GK' ? '#fb8c00' : save.team.kit.shirt}">${p ? p.rating : '-'}</div><span>${p ? esc(surname(p.name)) : '?'}</span></div>`;
    }).join('');
    const inXI = new Set(save.lineup);
    const order = { GK: 0, DF: 1, MF: 2, FW: 3 };
    const list = save.players.slice().sort((a, b) => (inXI.has(b.id) - inXI.has(a.id)) || order[a.pos] - order[b.pos] || b.rating - a.rating);
    return `<div class="card"><div class="row between"><h3>Formation</h3><button class="btn sm alt" id="s-auto">Auto pick</button></div>
      <div class="chips">${Object.keys(KK.FORMATIONS).map(f => `<button class="chip ${save.formation === f ? 'on' : ''}" data-form="${f}">${f}</button>`).join('')}</div>
      <p style="font-size:13px;color:var(--mute);margin:8px 0">${selSlot === null ? 'Tap a shirt, then tap a player below to swap them in.' : 'Now tap a player below to put them in this spot.'} Team OVR <b style="color:var(--gold)">${KK.myRating(save)}</b></p>
      <div class="mini-pitch" id="minipitch">${dots}</div></div>
    <div class="card"><h3>Players (${save.players.length})</h3><ul class="plist">${list.map(p => {
      const slot = save.lineup.indexOf(p.id), cost = KK.trainCost(p);
      return `<li class="${slot >= 0 ? 'xi' : ''}" data-pid="${p.id}"><span class="pos ${p.pos}">${p.pos}</span><div class="pname"><b>${esc(p.name)}</b><small>${slot >= 0 ? 'XI · ' : 'SUB · '}Age ${p.age} · PAC ${p.stats.pac} SHO ${p.stats.sho} PAS ${p.stats.pas} DEF ${p.stats.def}${p.goals ? ' · ⚽' + p.goals : ''}</small></div><span class="rt">${p.rating}</span>
      <div style="display:flex;flex-direction:column;gap:4px"><button class="btn sm" data-train="${p.id}" ${p.rating >= 99 || save.coins < cost ? 'disabled' : ''}>Train +1<br><small>🪙${cost}</small></button>${slot < 0 ? `<button class="btn sm red" data-sell="${p.id}">Sell 🪙${Math.round(KK.playerValue(p) / 2)}</button>` : ''}</div></li>`;
    }).join('')}</ul></div>`;
  }

  // ---------- market ----------
  function marketHTML() {
    return `<div class="card"><div class="row between"><h3>Transfer market</h3><button class="btn sm alt" id="mk-refresh">New list 🪙100</button></div>
    <p style="font-size:13px;color:var(--mute);margin:4px 0">Buy players with coins you earn from matches. The list changes every 4 rounds. Squad limit 24 (you have ${save.players.length}).</p>
    <ul class="plist">${save.market.map(p => `<li><span class="pos ${p.pos}">${p.pos}</span><div class="pname"><b>${esc(p.name)}</b><small>Age ${p.age} · PAC ${p.stats.pac} SHO ${p.stats.sho} PAS ${p.stats.pas} DEF ${p.stats.def}</small></div><span class="rt">${p.rating}</span><button class="btn sm" data-buy="${p.id}" ${save.coins < p.price || save.players.length >= 24 ? 'disabled' : ''}>Buy<br><small>🪙${p.price.toLocaleString()}</small></button></li>`).join('') || '<li>No players listed.</li>'}</ul></div>`;
  }

  // ---------- league ----------
  function leagueHTML() {
    const s = save.season, t = KK.table(save);
    const nT = KK.numTiers(save), top = s.div === 1 ? (KK.leagueBase(save, 1) >= 80 ? 4 : KK.leagueBase(save, 1) >= 73 ? 2 : 1) : 0;
    const rows = t.map((r, i) => `<tr class="${r.id === 'ME' ? 'me' : ''} ${(i < 2 && s.div > 1) || i < top ? 'up' : ''} ${i >= 6 && s.div < nT ? 'down' : ''}"><td>${i + 1}</td><td class="tn">${esc(r.name)}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF - r.GA > 0 ? '+' : ''}${r.GF - r.GA}</td><td><b>${r.Pts}</b></td></tr>`).join('');
    const name = id => esc(KK.teamById(save, id).name);
    const shown = Math.min(s.round, s.fixtures.length - 1);
    const rd = (n) => s.fixtures[n].map(f => `<div class="fx ${f.h === 'ME' || f.a === 'ME' ? 'me' : ''}"><span class="grow" style="text-align:right">${name(f.h)}</span><span class="sc" style="margin:0 8px">${f.hs == null ? 'v' : f.hs + ' - ' + f.as}</span><span class="grow">${name(f.a)}</span></div>`).join('');
    const mine = s.fixtures.map((r, i) => { const f = r.find(x => x.h === 'ME' || x.a === 'ME'); const home = f.h === 'ME'; const opp = KK.teamById(save, home ? f.a : f.h); const my = home ? f.hs : f.as, op = home ? f.as : f.hs; const res = my == null ? '' : my > op ? 'W' : my < op ? 'L' : 'D'; return `<div class="fx"><span>R${i + 1} ${home ? '🏠' : '✈️'} ${esc(opp.name)}</span><span class="sc">${res ? `<span class="res ${res}">${res}</span>${my}-${op}` : '–'}</span></div>`; }).join('');
    return `<div class="card"><h3>${flagOf(save)} ${esc(KK.leagueName(save))}</h3><table class="tbl"><tr><th>#</th><th style="text-align:left">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>${rows}</table>
    <p style="font-size:12px;color:var(--mute)">${s.div > 1 ? '🟩 Top 2 are promoted. ' : `🏆 Win the league to be champions. 🟩 Top ${top} qualify for the 👑 Crown Cup, the next 2 for the 🛡️ Shield. `}${s.div < nT ? '🟥 Bottom 2 are relegated.' : ''}</p></div>
    <div class="card"><h3>Round ${shown + 1} ${s.round > shown ? 'results' : 'fixtures'}</h3>${rd(s.round > 0 && s.round >= s.fixtures.length ? s.fixtures.length - 1 : (s.round > 0 ? s.round - 1 : 0))}</div>
    <div class="card"><h3>Your season</h3>${mine}</div>`;
  }

  // ---------- club ----------
  function clubHTML() {
    const st = KK.STADIUM[save.stadium], nx = KK.STADIUM[save.stadium + 1];
    return `<div class="card" style="text-align:center">${KK.crestSVG(save.team.crest, 90, save.team.short)}<h2>${esc(save.team.name)}</h2>${KK.kitSVG(save.team.kit.shirt, save.team.kit.shorts, 60)}</div>
    <div class="card"><h3>🏟️ Stadium — level ${save.stadium + 1}/5</h3><p><b>${st.name}</b> · ${st.cap.toLocaleString()} seats</p>
    <p style="font-size:13px;color:var(--mute)">Bigger stadiums earn more coins from every match and give a home boost.</p>
    ${nx ? `<button class="btn block" id="c-stadium" ${save.coins < nx.cost ? 'disabled' : ''}>Upgrade to ${nx.name} (${nx.cap.toLocaleString()}) — 🪙${nx.cost.toLocaleString()}</button>` : '<p>🏆 Max level reached!</p>'}</div>
    <div class="card"><h3>🏆 Trophy cabinet</h3>${(save.trophies || []).length ? save.trophies.map(t => `<div class="fx"><span>${t.cup ? KK.CUPS[t.cup].icon : '🏆'} ${esc(t.name || `Division ${t.d} champions`)}</span><span>Season ${t.y}</span></div>`).join('') : '<p style="color:var(--mute)">Win a league or a continental cup to lift your first trophy.</p>'}</div>
    <div class="card"><h3>⚙️ Settings</h3>
      <div class="row between"><span>Graphics</span><div class="chips"><button class="chip ${KK.settings.gfx === '3d' ? 'on' : ''}" data-gfx="3d">3D</button><button class="chip ${KK.settings.gfx === '2d' ? 'on' : ''}" data-gfx="2d">Classic 2D</button></div></div>
      <div class="row between" style="margin-top:10px"><span>3D quality</span><div class="chips"><button class="chip ${KK.settings.q === 'high' ? 'on' : ''}" data-q="high">High</button><button class="chip ${KK.settings.q === 'low' ? 'on' : ''}" data-q="low">Low</button></div></
      <div class="row between" style="margin-top:10px"><span>3D camera</span><div class="chips"><button class="chip ${KK.settings.cam !== 'close' ? 'on' : ''}" data-cam="wide">Wide</button><button class="chip ${KK.settings.cam === 'close' ? 'on' : ''}" data-cam="close">Close</button></div></div>
      <div class="row between" style="margin-top:10px"><span>Sound effects</span><button class="chip ${KK.settings.mute ? '' : 'on'}" id="c-mute">${KK.settings.mute ? 'Off' : 'On'}</button></div>
      <div class="row between" style="margin-top:10px"><span>Install app</span><button class="chip" id="c-install">How?</button></div>
      <div class="row between" style="margin-top:10px"><span>Start a new career</span><button class="btn sm red" id="c-reset">Reset</button></div>
      <p style="font-size:12px;color:var(--mute);margin-top:12px">Kente Kickers is free: no ads, no payments. All clubs, leagues, cups and players are made up. Progress is saved on this device.</p></div>`;
  }

  // ---------- cups ----------
  function cupsHTML() {
    const cups = save.cups || {};
    const k = cupTab || (cups.shield && cups.shield.userIn ? 'shield' : 'crown'), cup = cups[k], def = KK.CUPS[k];
    const tabs = `<div class="chips" style="margin-bottom:10px">${['crown', 'shield'].map(x => `<button class="chip ${x === k ? 'on' : ''}" data-cuptab="${x}">${KK.CUPS[x].icon} ${KK.CUPS[x].name}</button>`).join('')}</div>`;
    if (!cup) return tabs + '<div class="card"><p>No cup this season.</p></div>';
    const T = id => KK.cupTeam(cup, id), fl = id => { const t = T(id); return t.country && t.country !== 'GHA' ? KK.flagSVG(KK.country(t.country).flag, 14, 10) : KK.flagSVG(KK.GHANA_FLAG, 14, 10); };
    const nm = id => `${fl(id)} ${id === 'ME' ? `<b style="color:var(--gold)">${esc(T(id).name)}</b>` : esc(T(id).name)}`;
    const status = cup.userIn ? (cup.winner === 'ME' ? '🏆 You are the champions!' : cup.userOut ? 'You are out of this season\'s competition.' : '✅ You are in! Play your cup games from Home.') : `Not qualified this season. ${k === 'crown' ? 'Win your top-tier league (or finish in its top places in the strongest leagues) to qualify.' : 'Finish just below the Crown Cup places of a top-tier league to qualify.'}`;
    const groups = cup.groups.map((g, gi) => `<div><h4 style="margin:4px 0">Group ${'ABCD'[gi]}</h4><table class="tbl"><tr><th style="text-align:left">Club</th><th>P</th><th>GD</th><th>Pts</th></tr>${KK.groupTable(cup, gi).map((r, i) => `<tr class="${r.id === 'ME' ? 'me' : ''} ${i < 2 && cup.md >= 6 ? 'up' : ''}"><td class="tn">${fl(r.id)} ${esc(r.short)}</td><td>${r.P}</td><td>${r.GF - r.GA}</td><td><b>${r.Pts}</b></td></tr>`).join('')}</table></div>`).join('');
    const ko = ['Quarter-finals', 'Semi-finals', 'Final'].map((n, i) => cup.ko[i] ? `<h4>${n}</h4>${cup.ko[i].map(f => `<div class="fx ${f.h === 'ME' || f.a === 'ME' ? 'me' : ''}"><span class="grow" style="text-align:right">${nm(f.h)}</span><span class="sc" style="margin:0 8px">${f.hs == null ? 'v' : f.hs + ' - ' + f.as}${f.pen ? '<small> p</small>' : ''}</span><span class="grow">${nm(f.a)}</span></div>`).join('')}` : `<h4>${n}</h4><p style="font-size:12px;color:var(--mute);margin:0">To be decided</p>`).join('');
    return tabs + `<div class="card cupcard"><div class="cuphead"><span class="ic">${def.icon}</span><div><h2 style="margin:0">${def.name}</h2><small style="color:var(--mute)">Season ${cup.year} · ${cup.winner ? 'Winners: ' + esc(T(cup.winner).name) : 'Next: ' + KK.CUP_STAGE[Math.min(cup.md, 8)]}</small></div></div>
      <p style="font-size:14px">${status}</p>
      <p style="font-size:12px;color:var(--mute)">16 clubs · 4 groups of 4 (home and away) · top 2 reach the quarter-finals · one-match knockouts and a final (penalties if level). Prize: 🪙${def.win} a win, 🪙${def.prize.toLocaleString()} for the winners.</p></div>
      <div class="card"><h3>Group stage</h3><div class="grp">${groups}</div></div>
      <div class="card ko"><h3>Knockouts</h3>${ko}</div>`;
  }

  // ---------- friendly ----------
  function leagueOptions(sel) {
    let o = `<option value="ME" ${sel === 'ME' ? 'selected' : ''}>⭐ My club</option><option value="CUR" ${sel === 'CUR' ? 'selected' : ''}>My league: ${esc(KK.leagueName(save))}</option>`;
    o += `<optgroup label="Europe">` + KK.allLeagues().map(l => `<option value="${l.code}:${l.tier}" ${sel === l.code + ':' + l.tier ? 'selected' : ''}>${esc(l.country.name)} · ${esc(l.name)}</option>`).join('') + '</optgroup>';
    return o;
  }
  function clubsOf(v) {
    if (v === 'ME') return [{ id: 'ME', name: save.team.name, short: save.team.short }];
    if (v === 'CUR') return save.season.teams.filter(t => t.id !== 'ME');
    const [c, t] = v.split(':'); return KK.leagueClubs(c, +t);
  }
  function fillClubs(i) { const v = $('#fr-l' + i).value; $('#fr-c' + i).innerHTML = clubsOf(v).map((t, j) => `<option value="${t.id}" ${i === 1 && j === 0 ? '' : ''}>${esc(t.name)}${t.rating ? ' (' + t.rating + ')' : ''}</option>`).join(''); }
  function friendlyModal() {
    modal(`<h3>🤝 Friendly match</h3><div style="text-align:left"><label class="lbl">Home club</label><select class="sel" id="fr-l0">${leagueOptions('ME')}</select><select class="sel" id="fr-c0"></select>
      <label class="lbl">Away club</label><select class="sel" id="fr-l1">${leagueOptions('ENG:1')}</select><select class="sel" id="fr-c1"></select>
      <p style="font-size:12px;color:var(--mute)">You control the home side (or your own club if it plays). Friendlies don't change your season or coins.</p></div>
      <button class="btn block" id="fr-play">▶ PLAY FRIENDLY</button><button class="btn alt block" id="fr-sim" style="margin-top:8px">⏩ Quick result</button><button class="btn alt block" data-close style="margin-top:8px">Cancel</button>`);
    fillClubs(0); fillClubs(1);
  }
  const friendlyTeam = i => { const v = $('#fr-l' + i).value, id = $('#fr-c' + i).value; return id === 'ME' ? { id: 'ME', name: save.team.name, short: save.team.short, c1: save.team.crest.c1, c2: save.team.crest.c2 } : clubsOf(v).find(t => t.id === id); };
  document.addEventListener('change', e => { if (e.target.id === 'fr-l0') fillClubs(0); if (e.target.id === 'fr-l1') fillClubs(1); });
  document.addEventListener('input', e => { if (e.target.id === 'f-eusearch') { euFilter = e.target.value; const y = window.scrollY; const pos = e.target.selectionStart; render(); window.scrollTo(0, y); const n = $('#f-eusearch'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } });

  // ---------- actions ----------
  document.addEventListener('click', e => {
    const b = e.target.closest('button,[data-slot],li[data-pid]'); if (!b) return;
    KK.sfx.unlock();
    const d = b.dataset;
    if (b.closest('#match')) return;
    if (d.go) { KK.sfx.click(); return go(d.go); }
    if (b.id === 'tb-mute' || b.id === 'c-mute') { KK.sfx.setMute(!KK.settings.mute); if (save) persist(); return render(); }
    if (d.sw) { if (d.sw === 'c1' || d.sw === 'c2') draft.crest[d.sw] = d.c; else draft.kit[d.sw] = d.c; return keepBuilder(); }
    if (d.pat) { draft.crest.pattern = d.pat; return keepBuilder(); }
    if (d.emb) { draft.crest.emblem = d.emb; return keepBuilder(); }
    if (b.id === 'f-randcrest') { draft.crest = { c1: KK.pick(KK.COLORS), c2: KK.pick(KK.COLORS), pattern: KK.pick(PATTERNS), emblem: KK.pick(EMBLEMS) }; draft.kit.shirt = draft.crest.c1; return keepBuilder(); }
    if (b.id === 'f-reroll') { draftSquad(); return keepBuilder(); }
    if (d.mode) { draft.career = d.mode === 'eu' ? { mode: 'eu', country: draft.career.country || null, tier: draft.career.tier || null } : { mode: 'gh' }; if (d.mode === 'gh' || draft.career.country) draftSquad(); return keepBuilder(); }
    if (d.country) { const co = KK.country(d.country); const sc = $('#clist') ? $('#clist').scrollTop : 0; draft.career = { mode: 'eu', country: co.code, tier: co.tiers }; draftSquad(); keepBuilder(); if ($('#clist')) $('#clist').scrollTop = sc; return; }
    if (d.tier) { const sc = $('#clist') ? $('#clist').scrollTop : 0; draft.career.tier = +d.tier; draftSquad(); keepBuilder(); if ($('#clist')) $('#clist').scrollTop = sc; return; }
    if (d.cuptab) { cupTab = d.cuptab; return render(); }
    if (d.gfx) { KK.settings.gfx = d.gfx; persist(); return render(); }
    if (d.q) { KK.settings.q = d.q; persist(); return render(); }
    if (d.cam) { KK.settings.cam = d.cam; persist(); return render(); }
    if (d.cupplay) return startMatch({ kind: 'cup', cup: d.cupplay });
    if (d.cupsim) return cupSim(d.cupplay || d.cupsim);
    if (b.id === 'h-friendly') return friendlyModal();
    if (b.id === 'fr-play') { const A = friendlyTeam(0), B = friendlyTeam(1); if (!A || !B || A.id === B.id) return toast('Pick two different clubs'); closeModal(); return startMatch({ kind: 'friendly', A, B }); }
    if (b.id === 'fr-sim') { const A = friendlyTeam(0), B = friendlyTeam(1); if (!A || !B || A.id === B.id) return toast('Pick two different clubs'); const rA = A.id === 'ME' ? KK.myRating(save) : A.rating, rB = B.id === 'ME' ? KK.myRating(save) : B.rating; const [x, y] = KK.simScore(rA + 1.5, rB); return resultModal({ A, B, a: x, b: y, coins: 0, label: 'Friendly' }); }
    if (b.id === 'f-start') {
      readBuilder(); if (!draft.name.trim()) return toast('Please type a club name');
      if (draft.career.mode === 'eu' && (!draft.career.country || !draft.career.tier)) return toast('Pick a country and a league');
      save = KK.newCareer({ name: draft.name.trim(), short: (/^[A-Z]{3}$/.test(draft.short) && !/^(SUX|SEX|ASS|FUK|FUC|DIK|DIC|COK|CUM|FAG|NIG|TIT|POO|WTF|KKK|GAY|PIS|XXX)$/.test(draft.short)) ? draft.short : KK.shortName(draft.name.trim() || 'Kente'), crest: draft.crest, kit: draft.kit }, draft.players, draft.career);
      save.settings.gfx = save.settings.gfx || KK.settings.gfx; save.settings.q = save.settings.q || KK.settings.q;
      KK.settings = save.settings; persist(); KK.sfx.whistle(1); toast('Welcome to the ' + KK.leagueName(save) + '!'); return go('hub');
    }
    if (d.len) { KK.settings.len = +d.len; persist(); return render(); }
    if (b.id === 'h-play') return startMatch({ kind: 'league' });
    if (b.id === 'h-sim') return quickSim();
    if (d.form) { save.formation = d.form; KK.autoPick(save); persist(); toast('Formation ' + d.form); return render(); }
    if (b.id === 's-auto') { KK.autoPick(save); persist(); toast('Best XI picked'); return render(); }
    if (d.slot !== undefined) { selSlot = selSlot === +d.slot ? null : +d.slot; return render(); }
    if (d.train) {
      const p = save.players.find(x => x.id === d.train), c = KK.trainCost(p); if (save.coins < c || p.rating >= 99) return;
      save.coins -= c; p.rating++; ['pac', 'sho', 'pas', 'def'].forEach(k => p.stats[k] = Math.min(99, p.stats[k] + 1)); const k = KK.pick(['pac', 'sho', 'pas', 'def']); p.stats[k] = Math.min(99, p.stats[k] + 1);
      persist(); KK.sfx.coin(); toast(`${surname(p.name)} trained to ${p.rating}`); return render();
    }
    if (d.sell) {
      const p = save.players.find(x => x.id === d.sell); if (save.players.length <= 14) return toast('You need at least 14 players');
      const v = Math.round(KK.playerValue(p) / 2);
      modal(`<h3>Sell ${esc(p.name)}?</h3><p>You get 🪙${v}.</p><div class="row"><button class="btn alt grow" data-close>Cancel</button><button class="btn red grow" data-confirmsell="${p.id}">Sell</button></div>`); return;
    }
    if (d.confirmsell) { const p = save.players.find(x => x.id === d.confirmsell); save.players = save.players.filter(x => x !== p); save.coins += Math.round(KK.playerValue(p) / 2); persist(); closeModal(); KK.sfx.coin(); toast('Player sold'); return render(); }
    if (d.buy) {
      const p = save.market.find(x => x.id === d.buy); if (!p || save.coins < p.price || save.players.length >= 24) return;
      save.coins -= p.price; save.market = save.market.filter(x => x !== p); const np = { ...p }; delete np.price; save.players.push(np); persist(); KK.sfx.coin(); toast(`Signed ${np.name}!`); return render();
    }
    if (b.id === 'mk-refresh') { if (save.coins < 100) return toast('Not enough coins'); save.coins -= 100; save.market = KK.genMarket(save); persist(); return render(); }
    if (b.id === 'c-stadium') { const nx = KK.STADIUM[save.stadium + 1]; if (!nx || save.coins < nx.cost) return; save.coins -= nx.cost; save.stadium++; persist(); KK.sfx.cheer(); toast('Stadium upgraded!'); return render(); }
    if (b.id === 'c-install') return modal(`<h3>Install Kente Kickers</h3><p style="text-align:left;line-height:1.6">On Android Chrome: tap the ⋮ menu, then <b>Add to Home screen</b> or <b>Install app</b>.<br>On iPhone Safari: tap Share, then <b>Add to Home Screen</b>.<br>After the first load it works offline.</p><button class="btn block" data-close>OK</button>`);
    if (b.id === 'c-reset') return modal(`<h3>Start again?</h3><p>This deletes your club and all progress on this device.</p><div class="row"><button class="btn alt grow" data-close>Cancel</button><button class="btn red grow" id="c-reset2">Delete & restart</button></div>`);
    if (b.id === 'c-reset2') { localStorage.removeItem(KK.SAVE_KEY); save = null; draft = null; closeModal(); return go('builder'); }
    if (d.close !== undefined) { closeModal(); return; }
    if (d.cont !== undefined) { closeModal(); return go('hub'); }
    if (d.pid && selSlot !== null) {
      const pid = d.pid, other = save.lineup.indexOf(pid);
      if (other >= 0) { [save.lineup[selSlot], save.lineup[other]] = [save.lineup[other], save.lineup[selSlot]]; } else save.lineup[selSlot] = pid;
      selSlot = null; persist(); KK.sfx.click(); return render();
    }
  });
  document.addEventListener('input', e => { if (e.target.id === 'f-short') draft.shortEdited = true; if (e.target.id === 'f-name' && !draft.shortEdited) { const sh = $('#f-short'), v = e.target.value.trim(); if (sh && v) sh.value = KK.shortName(v); } if (e.target.id === 'f-name' || e.target.id === 'f-short') { readBuilder(); $('#pv').innerHTML = KK.crestSVG(draft.crest, 96, draft.short) + KK.kitSVG(draft.kit.shirt, draft.kit.shorts, 80); } });
  function readBuilder() { const n = $('#f-name'), s = $('#f-short'); if (n) draft.name = n.value; if (s) draft.short = s.value.toUpperCase(); if (n && !s.value && n.value) draft.short = n.value.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(); }
  function keepBuilder() { readBuilder(); const y = window.scrollY; render(); window.scrollTo(0, y); }

  // ---------- matches ----------
  const meTeam = () => ({ id: 'ME', name: save.team.name, short: save.team.short, c1: save.team.crest.c1, c2: save.team.crest.c2 });
  function fixtureInfo() {
    const f = KK.nextFixture(save), home = f.h === 'ME', opp = KK.teamById(save, home ? f.a : f.h);
    return { f, home, opp };
  }
  const ord = n => n + (['st', 'nd', 'rd'][n - 1] || 'th');
  // A = home club, B = away club, a/b their goals
  function resultModal({ A, B, a, b, coins, end, events, label, extra }) {
    const meSide = A.id === 'ME' ? 0 : B.id === 'ME' ? 1 : -1;
    const my = meSide === 1 ? b : a, op = meSide === 1 ? a : b;
    const r = my > op ? 'W' : my < op ? 'L' : 'D';
    const title = meSide < 0 ? 'FULL TIME' : r === 'W' ? 'VICTORY!' : r === 'D' ? 'DRAW' : 'DEFEAT';
    const names = (events || []).filter(e => e.t === 0).map(e => `${esc(e.name)} ${e.min}'`).join(', ');
    let endHTML = '';
    if (end) {
      const e = end, msg = e.outcome === 'up' ? `🎉 PROMOTED to the ${esc(e.newName)}!` : e.outcome === 'down' ? `😞 Relegated to the ${esc(e.newName)}.` : e.outcome === 'champ' ? `🏆 CHAMPIONS of the ${esc(e.oldName)}!` : `You stay in the ${esc(e.newName)}.`;
      endHTML = `<div class="card"><h3>Season ${e.year} over</h3><p>You finished <b>${ord(e.pos)}</b> in the ${esc(e.oldName)}.</p><p style="font-size:18px"><b>${msg}</b></p>${e.qual ? `<p>✨ Qualified for the <b>${esc(e.qual)}</b> next season!</p>` : ''}<p>Prize money: 🪙${e.prize.toLocaleString()}</p></div>`;
    }
    modal(`${label ? `<small style="color:var(--gold)">${esc(label)}</small>` : ''}<h2 style="color:${meSide < 0 ? '#fff' : r === 'W' ? '#76ff03' : r === 'L' ? '#ff5252' : '#fff'}">${title}</h2>
      <div class="next"><div>${crestOf(A, 54)}<b>${esc(A.short)}</b></div><div class="vs" style="font-size:34px">${a} - ${b}</div><div>${crestOf(B, 54)}<b>${esc(B.short)}</b></div></div>
      ${names ? `<p style="font-size:13px">⚽ ${names}</p>` : ''}${extra || ''}
      ${coins ? `<p style="font-size:18px">+🪙${coins.toLocaleString()} coins</p>` : ''}${endHTML}
      <button class="btn block" data-cont id="res-cont">CONTINUE</button>`);
    KK.sfx.coin();
  }
  function scorersFor(n) {
    const xi = KK.lineupPlayers(save).filter(p => p.pos !== 'GK'), ev = [];
    for (let i = 0; i < n; i++) { const w = xi.filter(p => p.pos === 'FW').concat(xi); const s = KK.pick(w); ev.push({ t: 0, name: s.name, min: KK.ri(2, 90), id: s.id }); }
    return ev.sort((x, y) => x.min - y.min);
  }
  function leagueDone(my, op, home, opp, ids, events) {
    const info = KK.recordResult(save, my, op, ids);
    render();
    const msgs = (info.cupMsgs || []).filter(Boolean);
    resultModal({ A: home ? meTeam() : opp, B: home ? opp : meTeam(), a: home ? my : op, b: home ? op : my, coins: info.coins, end: info.end, events, label: KK.leagueName(save, info.end ? info.end.oldDiv : save.season.div), extra: msgs.length ? `<p style="font-size:13px">${msgs.map(esc).join('<br>')}</p>` : '' });
  }
  function cupDone(k, my, op, events, ids) {
    const cup = save.cups[k], f = KK.cupUserFixture(save, cup), home = f.h === 'ME', opp = KK.cupTeam(cup, home ? f.a : f.h), stage = KK.CUP_STAGE[cup.md];
    const info = KK.cupPlayMd(save, cup, { my, op });
    (ids || events.filter(e => e.t === 0 && e.id).map(e => e.id)).forEach(id => { const p = save.players.find(x => x.id === id); if (p) p.goals = (p.goals || 0) + 1; });
    const more = KK.cupAutoAdvance(save); persist(); render();
    const msgs = [info.pens ? 'Decided on penalties.' : '', info.msg].concat(more.filter(m => m !== info.msg)).filter(Boolean);
    resultModal({ A: home ? meTeam() : opp, B: home ? opp : meTeam(), a: home ? my : op, b: home ? op : my, coins: info.coins, events, label: `${KK.CUPS[k].icon} ${KK.CUPS[k].name} · ${stage}`, extra: msgs.length ? `<p style="font-size:14px"><b>${msgs.map(esc).join('<br>')}</b></p>` : '' });
  }
  function quickSim() {
    const { home, opp } = fixtureInfo();
    const mr = KK.myRating(save) + (home ? 1.5 + save.stadium * 0.6 : 0), orr = opp.rating + (home ? 0 : 1.5);
    const [my, op] = KK.simScore(mr, orr), events = scorersFor(my);
    leagueDone(my, op, home, opp, events.map(e => e.id), events);
  }
  function cupSim(k) {
    const cup = save.cups[k], f = KK.cupUserFixture(save, cup); if (!f) return;
    const home = f.h === 'ME', opp = KK.cupTeam(cup, home ? f.a : f.h);
    const [my, op] = KK.simScore(KK.myRating(save) + (home ? 1.5 + save.stadium * 0.6 : 0), opp.rating + (home ? 0 : 1.5));
    cupDone(k, my, op, scorersFor(my));
  }
  function myCfgOf(home) { return { name: save.team.name, short: save.team.short, shirt: save.team.kit.shirt, shorts: save.team.kit.shorts, gk: '#fb8c00', players: KK.lineupPlayers(save), formation: save.formation, rating: KK.myRating(save) + (home ? 1.5 + save.stadium * 0.6 : 0) }; }
  function aiCfgOf(t, home, vsShirt) {
    let shirt = t.c1, shorts = t.c2;
    if (vsShirt && KK.colorDist(shirt, vsShirt) < 120) { shirt = KK.colorDist(vsShirt, '#ffffff') < 150 ? '#111111' : '#ffffff'; shorts = t.c1; }
    return { name: t.name, short: t.short, shirt, shorts, gk: '#fb8c00', players: KK.oppSquad(t), formation: t.form || '4-4-2', rating: t.rating + (home ? 1.5 : 0) };
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
    // T0 = the side you control, T1 = the other. homeIs0 = T0 plays at home.
    let T0, T1, homeIs0, label;
    if (ctx.kind === 'league') { const fi = fixtureInfo(); T0 = meTeam(); T1 = fi.opp; homeIs0 = fi.home; label = KK.leagueName(save); }
    else if (ctx.kind === 'cup') { const cup = save.cups[ctx.cup], f = KK.cupUserFixture(save, cup); if (!f) return; homeIs0 = f.h === 'ME'; T0 = meTeam(); T1 = KK.cupTeam(cup, homeIs0 ? f.a : f.h); label = KK.CUPS[ctx.cup].name; }
    else { if (ctx.B.id === 'ME') { T0 = ctx.B; T1 = ctx.A; homeIs0 = false; } else { T0 = ctx.A; T1 = ctx.B; homeIs0 = true; } label = 'Friendly'; }
    const cfg0 = T0.id === 'ME' ? myCfgOf(homeIs0) : aiCfgOf(T0, homeIs0);
    const cfg1 = T1.id === 'ME' ? myCfgOf(!homeIs0) : aiCfgOf(T1, !homeIs0, cfg0.shirt);
    if (T1.id === 'ME' && KK.colorDist(cfg1.shirt, cfg0.shirt) < 120) { cfg0.shirt = KK.colorDist(cfg1.shirt, '#ffffff') < 150 ? '#111111' : '#ffffff'; }
    cfg1.gk = KK.colorDist(cfg0.gk, cfg1.shirt) < 120 || KK.colorDist(cfg0.gk, cfg0.shirt) < 120 ? '#00e5ff' : '#c6ff00';
    const H = homeIs0 ? T0 : T1, Aw = homeIs0 ? T1 : T0;
    $('#match').classList.remove('hidden'); document.body.style.overflow = 'hidden';
    $('#h-crest').innerHTML = crestOf(H, 22); $('#a-crest').innerHTML = crestOf(Aw, 22);
    $('#h-name').textContent = H.short; $('#a-name').textContent = Aw.short;
    $('#m-mute').textContent = KK.settings.mute ? '🔇' : '🔊';
    $('#m-overlay').classList.add('hidden');
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('any').catch(() => {}); } catch (e) {}
    let r3 = null;
    if (KK.settings.gfx === '3d') {
      try { r3 = await get3D(); } catch (e) { console.warn('3D unavailable, using 2D', e && e.message); KK.r3fail = String(e && e.message || e); toast('3D not supported here, using Classic 2D'); r3 = null; }
    }
    if (r3) r3.zoom = KK.settings.cam === 'close' ? 0.72 : 1;
    $('#pitch3d').classList.toggle('hidden', !r3); $('#match').classList.toggle('is3d', !!r3);
    let lastHud = '';
    match = new KK.Match($('#pitch'), {
      my: cfg0, opp: cfg1, lengthMin: KK.settings.len || 3, kickoffTeam: homeIs0 ? 0 : 1, r3,
      onHud(m) {
        const sc = homeIs0 ? `${m.score[0]} - ${m.score[1]}` : `${m.score[1]} - ${m.score[0]}`, tm = m.minute() + "'";
        const key = sc + tm + (m.ball.owner && m.ball.owner.t === 0 ? 1 : 0);
        if (key !== lastHud) { lastHud = key; $('#h-score').textContent = sc; $('#h-time').textContent = m.state === 'end' ? 'FT' : tm; $('#b-tackle').innerHTML = m.ball.owner && m.ball.owner.t === 0 ? 'SPRINT<br><small>hold</small>' : 'TACKLE<br><small>/ sprint</small>'; }
      },
      onEnd(res) {
        closeMatch();
        if (ctx.kind === 'league') return leagueDone(res.my, res.opp, homeIs0, T1, res.scorers, res.events);
        if (ctx.kind === 'cup') return cupDone(ctx.cup, res.my, res.opp, res.events, res.scorers);
        render();
        resultModal({ A: H, B: Aw, a: homeIs0 ? res.my : res.opp, b: homeIs0 ? res.opp : res.my, coins: 0, events: T0.id === 'ME' ? res.events : [], label });
      },
    });
    match.subsUsed = 0; match.bench = T0.id === 'ME' ? save.players.filter(p => !save.lineup.includes(p.id)) : [];
    KK.currentMatch = match;
  }
  function closeMatch() { if (match) match.destroy(); match = null; KK.currentMatch = null; $('#match').classList.add('hidden'); document.body.style.overflow = ''; }

  // pause / subs
  function pauseMenu() {
    if (!match || match.state === 'end') return; match.paused = true;
    const ov = $('#m-overlay'); ov.classList.remove('hidden');
    ov.innerHTML = `<div class="modal-card"><h2>Paused</h2><p>${$('#h-name').textContent} ${$('#h-score').textContent} ${$('#a-name').textContent} · ${match.minute()}'</p>
      <button class="btn block" id="p-resume">▶ Resume</button>
      <button class="btn alt block" id="p-subs" style="margin-top:8px">🔁 Substitutions (${3 - match.subsUsed} left)</button>
      <button class="btn alt block" id="p-sim" style="margin-top:8px">⏩ Sim rest of match</button>
      <p style="font-size:12px;color:var(--mute);margin-top:12px">Move: drag left side / WASD · Pass: J · Shoot: K (hold for power) · Tackle/Sprint: L</p></div>`;
  }
  function subsMenu(selOn) {
    const ov = $('#m-overlay'); const on = match.ents.filter(e => e.t === 0);
    ov.innerHTML = `<div class="modal-card" style="text-align:left"><h3>Substitutions (${3 - match.subsUsed} left)</h3>
      <p style="font-size:13px;color:var(--mute)">${selOn == null ? '1. Tap the player coming OFF.' : '2. Tap the player coming ON.'}</p>
      <ul class="plist">${selOn == null ? on.map(e => `<li data-off="${e.i}"><span class="pos ${e.pos}">${e.pos}</span><div class="pname"><b>${esc(e.sp.name)}</b></div><span class="rt">${e.sp.rating}</span></li>`).join('') :
        match.bench.map(p => `<li data-on="${p.id}" data-slot2="${selOn}"><span class="pos ${p.pos}">${p.pos}</span><div class="pname"><b>${esc(p.name)}</b></div><span class="rt">${p.rating}</span></li>`).join('') || '<li>No subs on the bench</li>'}</ul>
      <button class="btn alt block" id="p-back" style="margin-top:10px">Back</button></div>`;
  }
  $('#m-overlay').addEventListener('click', e => {
    const t = e.target.closest('button,li'); if (!t || !match) return;
    if (t.id === 'p-resume') { match.paused = false; match.last = performance.now(); $('#m-overlay').classList.add('hidden'); }
    else if (t.id === 'p-sim') { $('#m-overlay').classList.add('hidden'); match.simRest(); }
    else if (t.id === 'p-subs') { if (match.subsUsed >= 3) return toast('No substitutions left'); subsMenu(null); }
    else if (t.id === 'p-back') pauseMenu();
    else if (t.dataset.off !== undefined) subsMenu(+t.dataset.off);
    else if (t.dataset.on) {
      const slot = +t.dataset.slot2, p = match.bench.find(x => x.id === t.dataset.on), e2 = match.ents.find(x => x.t === 0 && x.i === slot);
      match.bench = match.bench.filter(x => x !== p).concat([e2.sp]); match.substitute(slot, p); match.subsUsed++; toast(`${surname(p.name)} on for ${surname(e2.sp.name)}`); pauseMenu();
    }
  });
  $('#m-pause').addEventListener('click', pauseMenu);
  $('#m-mute').addEventListener('click', () => { KK.sfx.setMute(!KK.settings.mute); $('#m-mute').textContent = KK.settings.mute ? '🔇' : '🔊'; if (!KK.settings.mute && match) KK.sfx.crowdStart(); persist(); });

  // joystick
  const jz = $('#joyzone'), base = $('#joybase'), knob = $('#joyknob'); let joyId = null, jx0 = 0, jy0 = 0;
  const R = 50;
  function joyHome() { base.style.left = '30px'; base.style.top = ''; base.style.bottom = 'calc(30px + env(safe-area-inset-bottom))'; knob.style.transform = ''; }
  jz.addEventListener('pointerdown', e => {
    e.preventDefault(); KK.sfx.unlock(); joyId = e.pointerId; jz.setPointerCapture(e.pointerId);
    const r = jz.getBoundingClientRect(); jx0 = e.clientX; jy0 = e.clientY;
    const bw = base.offsetWidth; base.style.left = (e.clientX - r.left - bw / 2) + 'px'; base.style.top = (e.clientY - r.top - bw / 2) + 'px'; base.style.bottom = 'auto';
    $('#joyhint').classList.add('hidden');
  });
  jz.addEventListener('pointermove', e => {
    if (e.pointerId !== joyId || !match) return;
    let dx = e.clientX - jx0, dy = e.clientY - jy0; const d = Math.hypot(dx, dy); if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; match.input.jx = dx / R; match.input.jy = dy / R;
  });
  const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; if (match) { match.input.jx = 0; match.input.jy = 0; } joyHome(); };
  jz.addEventListener('pointerup', joyEnd); jz.addEventListener('pointercancel', joyEnd);
  function hold(id, down, up) {
    const el = $(id);
    el.addEventListener('pointerdown', e => { e.preventDefault(); KK.sfx.unlock(); el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (x) {} if (match) down(); });
    const end = e => { if (!el.classList.contains('down')) return; el.classList.remove('down'); if (match) up(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  hold('#b-pass', () => match.pressPass(), () => {});
  hold('#b-shoot', () => match.pressShoot(true), () => match.pressShoot(false));
  hold('#b-tackle', () => match.pressTackle(true), () => match.pressTackle(false));
  const MOVE = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
  window.addEventListener('keydown', e => {
    if (!match) return; if (e.repeat && !MOVE.includes(e.code)) { e.preventDefault(); return; }
    KK.sfx.unlock();
    if (MOVE.includes(e.code)) { match.input.keys.add(e.code); e.preventDefault(); }
    else if (e.code === 'KeyJ' || e.code === 'Space') { match.pressPass(); e.preventDefault(); }
    else if (e.code === 'KeyK' || e.code === 'Enter') { match.pressShoot(true); e.preventDefault(); }
    else if (e.code === 'KeyL' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { match.pressTackle(true); e.preventDefault(); }
    else if (e.code === 'KeyP' || e.code === 'Escape') { if (match.paused) { $('#p-resume') && $('#p-resume').click(); } else pauseMenu(); }
  });
  window.addEventListener('keyup', e => {
    if (!match) return;
    if (MOVE.includes(e.code)) match.input.keys.delete(e.code);
    else if (e.code === 'KeyK' || e.code === 'Enter') match.pressShoot(false);
    else if (e.code === 'KeyL' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') match.pressTackle(false);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && match && !match.paused) pauseMenu(); });

  if (!save) view = 'builder';
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
