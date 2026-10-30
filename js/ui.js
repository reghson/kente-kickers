/* Kente Kickers — screens & controls */
'use strict';
(function () {
  const KK = window.KK, $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let save = KK.load();
  KK.settings = save ? save.settings : { mute: false, len: 3 };
  let view = 'hub', selSlot = null, match = null, draft = null;
  const PATTERNS = ['plain', 'halves', 'stripes', 'chevron', 'kente'], EMBLEMS = ['star', 'ball', 'drum', 'bird', 'letters'];

  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 2200); }
  function modal(html) { $('#modal-card').innerHTML = html; $('#modal').classList.remove('hidden'); }
  function closeModal() { $('#modal').classList.add('hidden'); }
  KK.ui = { toast, modal, closeModal };
  const persist = () => KK.save(save);
  const surname = n => n.split(' ').slice(-1)[0];
  const crestOf = (t, size) => t.id === 'ME' ? KK.crestSVG(save.team.crest, size, save.team.short) : KK.crestSVG({ c1: t.c1, c2: t.c2, pattern: PATTERNS[t.name.length % 5], emblem: EMBLEMS[t.name.charCodeAt(0) % 5] }, size, t.short);

  function updateTop() {
    const on = !!save && view !== 'builder';
    $('#topbar').classList.toggle('hidden', !on); $('#bottomnav').classList.toggle('hidden', !on);
    $('#tb-mute').textContent = KK.settings.mute ? '🔇' : '🔊';
    if (!on) return;
    $('#tb-crest').innerHTML = KK.crestSVG(save.team.crest, 34, save.team.short);
    $('#tb-name').textContent = save.team.name;
    $('#tb-div').textContent = `Division ${save.season.div} · Season ${save.season.year}`;
    $('#tb-coins').textContent = save.coins.toLocaleString();
    document.querySelectorAll('#bottomnav button').forEach(b => b.classList.toggle('on', b.dataset.go === view));
  }
  function go(v) { view = v; selSlot = null; render(); window.scrollTo(0, 0); }
  KK.go = go;

  function render() {
    updateTop();
    const el = $('#screen');
    if (!save || view === 'builder') el.innerHTML = builderHTML();
    else el.innerHTML = ({ hub: hubHTML, squad: squadHTML, market: marketHTML, league: leagueHTML, club: clubHTML }[view] || hubHTML)();
  }

  // ---------- builder ----------
  function newDraft() {
    draft = { name: 'Sewa United', short: 'SEW', crest: { c1: '#c62828', c2: '#fdd835', pattern: 'kente', emblem: 'star' }, kit: { shirt: '#c62828', shorts: '#111111' }, players: KK.genSquad(50) };
  }
  function builderHTML() {
    if (!draft) newDraft();
    const sw = (key, val) => KK.COLORS.map(c => `<button class="sw ${val === c ? 'on' : ''}" style="background:${c}" data-sw="${key}" data-c="${c}" aria-label="colour ${c}"></button>`).join('');
    const d = draft;
    return `<div class="hero"><div class="logo">⚽ KENTE KICKERS</div><div class="kente"></div><div style="color:var(--mute)">Build your club. Climb from Division 6 to the top.</div></div>
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
    return `<div class="card"><div class="row between"><h3>Round ${Math.min(s.round + 1, s.fixtures.length)} of ${s.fixtures.length}</h3><span class="tag">${pos}${['st', 'nd', 'rd'][pos - 1] || 'th'} in Div ${s.div}</span></div>${next}</div>
    <div class="row"><div class="stat"><small>Team OVR</small><span class="big-num">${KK.myRating(save)}</span></div><div class="stat"><small>Coins</small><span class="big-num">${save.coins.toLocaleString()}</span></div><div class="stat"><small>Trophies</small><span class="big-num">${(save.trophies || []).length}</span></div></div>
    <div class="card"><h3>Recent results</h3>${hist.length ? hist.map(h => `<div class="fx"><span><span class="res ${h.res}">${h.res}</span>vs ${esc(h.opp)}</span><span class="sc">${h.my} - ${h.op}</span></div>`).join('') : '<p style="color:var(--mute)">No matches yet. Kick off your first game!</p>'}</div>
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
    const rows = t.map((r, i) => `<tr class="${r.id === 'ME' ? 'me' : ''} ${i < 2 && s.div > 1 ? 'up' : ''} ${i >= 6 && s.div < 6 ? 'down' : ''}"><td>${i + 1}</td><td class="tn">${esc(r.name)}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF - r.GA > 0 ? '+' : ''}${r.GF - r.GA}</td><td><b>${r.Pts}</b></td></tr>`).join('');
    const name = id => esc(KK.teamById(save, id).name);
    const shown = Math.min(s.round, s.fixtures.length - 1);
    const rd = (n) => s.fixtures[n].map(f => `<div class="fx ${f.h === 'ME' || f.a === 'ME' ? 'me' : ''}"><span class="grow" style="text-align:right">${name(f.h)}</span><span class="sc" style="margin:0 8px">${f.hs == null ? 'v' : f.hs + ' - ' + f.as}</span><span class="grow">${name(f.a)}</span></div>`).join('');
    const mine = s.fixtures.map((r, i) => { const f = r.find(x => x.h === 'ME' || x.a === 'ME'); const home = f.h === 'ME'; const opp = KK.teamById(save, home ? f.a : f.h); const my = home ? f.hs : f.as, op = home ? f.as : f.hs; const res = my == null ? '' : my > op ? 'W' : my < op ? 'L' : 'D'; return `<div class="fx"><span>R${i + 1} ${home ? '🏠' : '✈️'} ${esc(opp.name)}</span><span class="sc">${res ? `<span class="res ${res}">${res}</span>${my}-${op}` : '–'}</span></div>`; }).join('');
    return `<div class="card"><h3>Division ${s.div} table</h3><table class="tbl"><tr><th>#</th><th style="text-align:left">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>${rows}</table>
    <p style="font-size:12px;color:var(--mute)">${s.div > 1 ? '🟩 Top 2 are promoted. ' : '🏆 Win Division 1 to be champions! '}${s.div < 6 ? '🟥 Bottom 2 are relegated.' : ''}</p></div>
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
    <div class="card"><h3>🏆 Trophy cabinet</h3>${(save.trophies || []).length ? save.trophies.map(t => `<div class="fx"><span>🏆 Division ${t.d} champions</span><span>Season ${t.y}</span></div>`).join('') : '<p style="color:var(--mute)">Win a division to lift your first trophy.</p>'}</div>
    <div class="card"><h3>⚙️ Settings</h3>
      <div class="row between"><span>Sound effects</span><button class="chip ${KK.settings.mute ? '' : 'on'}" id="c-mute">${KK.settings.mute ? 'Off' : 'On'}</button></div>
      <div class="row between" style="margin-top:10px"><span>Install app</span><button class="chip" id="c-install">How?</button></div>
      <div class="row between" style="margin-top:10px"><span>Start a new career</span><button class="btn sm red" id="c-reset">Reset</button></div>
      <p style="font-size:12px;color:var(--mute);margin-top:12px">Kente Kickers is free: no ads, no payments. All clubs and players are made up. Progress is saved on this device.</p></div>`;
  }

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
    if (b.id === 'f-reroll') { draft.players = KK.genSquad(50); return keepBuilder(); }
    if (b.id === 'f-start') {
      readBuilder(); if (!draft.name.trim()) return toast('Please type a club name');
      save = KK.newCareer({ name: draft.name.trim(), short: (/^[A-Z]{3}$/.test(draft.short) && !/^(SUX|SEX|ASS|FUK|FUC|DIK|DIC|COK|CUM|FAG|NIG|TIT|POO|WTF|KKK|GAY|PIS|XXX)$/.test(draft.short)) ? draft.short : KK.shortName(draft.name.trim() || 'Kente'), crest: draft.crest, kit: draft.kit }, draft.players);
      KK.settings = save.settings; KK.sfx.whistle(1); toast('Welcome to Division 6!'); return go('hub');
    }
    if (d.len) { KK.settings.len = +d.len; persist(); return render(); }
    if (b.id === 'h-play') return startMatch();
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
  document.addEventListener('input', e => { if (e.target.id === 'f-name' || e.target.id === 'f-short') { readBuilder(); $('#pv').innerHTML = KK.crestSVG(draft.crest, 96, draft.short) + KK.kitSVG(draft.kit.shirt, draft.kit.shorts, 80); } });
  function readBuilder() { const n = $('#f-name'), s = $('#f-short'); if (n) draft.name = n.value; if (s) draft.short = s.value.toUpperCase(); if (n && !s.value && n.value) draft.short = n.value.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(); }
  function keepBuilder() { readBuilder(); const y = window.scrollY; render(); window.scrollTo(0, y); }

  // ---------- matches ----------
  function fixtureInfo() {
    const f = KK.nextFixture(save), home = f.h === 'ME', opp = KK.teamById(save, home ? f.a : f.h);
    return { f, home, opp };
  }
  function resultModal(my, op, info, opp, home, scorers, events) {
    const r = info.res, title = r === 'W' ? 'VICTORY!' : r === 'D' ? 'DRAW' : 'DEFEAT';
    const names = (events || []).filter(e => e.t === 0).map(e => `${esc(e.name)} ${e.min}'`).join(', ');
    let endHTML = '';
    if (info.end) {
      const e = info.end, msg = e.outcome === 'up' ? `🎉 PROMOTED to Division ${e.newDiv}!` : e.outcome === 'down' ? `😞 Relegated to Division ${e.newDiv}.` : e.outcome === 'champ' ? '🏆 CHAMPIONS of Division 1!' : `You stay in Division ${e.newDiv}.`;
      endHTML = `<div class="card"><h3>Season ${e.year} over</h3><p>You finished <b>${e.pos}${['st', 'nd', 'rd'][e.pos - 1] || 'th'}</b> in Division ${e.oldDiv}.</p><p style="font-size:18px"><b>${msg}</b></p><p>Prize money: 🪙${e.prize.toLocaleString()}</p></div>`;
    }
    const L = home ? [save.team.short, my, op, opp.short] : [opp.short, op, my, save.team.short];
    modal(`<h2 style="color:${r === 'W' ? '#76ff03' : r === 'L' ? '#ff5252' : '#fff'}">${title}</h2>
      <div class="next"><div>${home ? KK.crestSVG(save.team.crest, 54, save.team.short) : crestOf(opp, 54)}<b>${esc(L[0])}</b></div><div class="vs" style="font-size:34px">${L[1]} - ${L[2]}</div><div>${home ? crestOf(opp, 54) : KK.crestSVG(save.team.crest, 54, save.team.short)}<b>${esc(L[3])}</b></div></div>
      ${names ? `<p style="font-size:13px">⚽ ${names}</p>` : ''}
      <p style="font-size:18px">+🪙${info.coins.toLocaleString()} coins</p>${endHTML}
      <button class="btn block" data-cont id="res-cont">CONTINUE</button>`);
    KK.sfx.coin();
  }
  function quickSim() {
    const { home, opp } = fixtureInfo();
    const mr = KK.myRating(save) + (home ? 1.5 + save.stadium * 0.6 : 0), orr = opp.rating + (home ? 0 : 1.5);
    let [a, b] = KK.simScore(mr, orr); const my = a, op = b;
    const xi = KK.lineupPlayers(save).filter(p => p.pos !== 'GK'); const events = [];
    for (let i = 0; i < my; i++) { const w = xi.filter(p => p.pos === 'FW').concat(xi); const s = KK.pick(w); events.push({ t: 0, name: s.name, min: KK.ri(2, 90), id: s.id }); }
    events.sort((x, y) => x.min - y.min);
    const info = KK.recordResult(save, my, op, events.map(e => e.id));
    render(); resultModal(my, op, info, opp, home, null, events);
  }
  function startMatch() {
    const { home, opp } = fixtureInfo();
    KK.sfx.unlock();
    const xi = KK.lineupPlayers(save);
    let oppShirt = opp.c1, oppShorts = opp.c2;
    if (KK.colorDist(oppShirt, save.team.kit.shirt) < 120) { oppShirt = KK.colorDist(save.team.kit.shirt, '#ffffff') < 150 ? '#111111' : '#ffffff'; oppShorts = opp.c1; }
    const myCfg = { name: save.team.name, short: save.team.short, shirt: save.team.kit.shirt, shorts: save.team.kit.shorts, gk: '#fb8c00', players: xi, formation: save.formation, rating: KK.myRating(save) + (home ? 1.5 + save.stadium * 0.6 : 0) };
    const oppCfg = { name: opp.name, short: opp.short, shirt: oppShirt, shorts: oppShorts, gk: KK.colorDist(myCfg.gk, oppShirt) < 120 ? '#00e5ff' : '#c6ff00', players: KK.oppSquad(opp), formation: opp.form || '4-4-2', rating: opp.rating + (home ? 0 : 1.5) };
    $('#match').classList.remove('hidden'); document.body.style.overflow = 'hidden';
    $('#h-crest').innerHTML = home ? KK.crestSVG(save.team.crest, 22, save.team.short) : crestOf(opp, 22);
    $('#a-crest').innerHTML = home ? crestOf(opp, 22) : KK.crestSVG(save.team.crest, 22, save.team.short);
    $('#h-name').textContent = home ? save.team.short : opp.short; $('#a-name').textContent = home ? opp.short : save.team.short;
    $('#m-mute').textContent = KK.settings.mute ? '🔇' : '🔊';
    $('#m-overlay').classList.add('hidden');
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('any').catch(() => {}); } catch (e) {}
    let lastHud = '';
    match = new KK.Match($('#pitch'), {
      my: myCfg, opp: oppCfg, lengthMin: KK.settings.len || 3, kickoffTeam: home ? 0 : 1,
      onHud(m) {
        const sc = home ? `${m.score[0]} - ${m.score[1]}` : `${m.score[1]} - ${m.score[0]}`, tm = m.minute() + "'";
        const key = sc + tm + (m.ball.owner && m.ball.owner.t === 0 ? 1 : 0);
        if (key !== lastHud) { lastHud = key; $('#h-score').textContent = sc; $('#h-time').textContent = m.state === 'end' ? 'FT' : tm; $('#b-tackle').innerHTML = m.ball.owner && m.ball.owner.t === 0 ? 'SPRINT<br><small>hold</small>' : 'TACKLE<br><small>/ sprint</small>'; }
      },
      onEnd(res) {
        const info = KK.recordResult(save, res.my, res.opp, res.scorers);
        closeMatch(); render(); resultModal(res.my, res.opp, info, opp, home, res.scorers, res.events);
      },
    });
    match.subsUsed = 0; match.bench = save.players.filter(p => !save.lineup.includes(p.id));
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
