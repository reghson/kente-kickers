/* Kente Kickers — data, generation, league logic, save. All names are invented. */
'use strict';
const KK = window.KK = window.KK || {};

KK.rand = Math.random;
KK.ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
KK.pick = arr => arr[Math.floor(Math.random() * arr.length)];
KK.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
KK.uid = () => Math.random().toString(36).slice(2, 9);

// Seeded RNG (for opponent squads)
KK.seeded = function (seed) {
  let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
};

const FIRST_GH = ['Kwame','Kofi','Yaw','Kwabena','Kojo','Kwaku','Akwasi','Fiifi','Ebo','Nii','Selorm','Elikem','Edem','Mawuli','Kwesi','Yaw','Kobina','Nana','Paa','Atsu','Senyo','Delali','Kekeli','Fafali','Nortey','Ato'];
const LAST_GH = ['Mensah','Owusu','Boateng','Osei','Appiah','Agyeman','Ofori','Quaye','Tetteh','Addo','Amoah','Darko','Badu','Adjei','Gyamfi','Sarpong','Amankwah','Asare','Bonsu','Nyarko','Frimpong','Antwi','Ankrah','Lamptey','Dzokoto','Agbeko','Kpodo','Ocran','Yeboah','Acheampong'];
const FIRST_WA = ['Chidi','Emeka','Tunde','Ade','Seun','Moussa','Ibrahima','Mamadou','Ousmane','Sekou','Kalilou','Obinna','Femi','Bayo','Lamine','Souley','Idrissa','Yaya','Bakary','Kelechi'];
const LAST_WA = ['Okafor','Adeyemi','Diallo','Traore','Kone','Camara','Sow','Balogun','Eze','Nwosu','Ouattara','Bamba','Cisse','Okonkwo','Fofana','Sanogo','Keita','Ibekwe','Ajayi','Ndiaye'];
const FIRST_W = ['Leo','Marco','Tomas','Ivan','Lucas','Rafa','Jonas','Elias','Mateo','Noah','Bruno','Dario','Felix','Oskar','Hugo','Nico','Sami','Teo','Alvaro','Milan'];
const LAST_W = ['Novak','Silva','Moreau','Berg','Costa','Rossi','Weber','Lindqvist','Petrov','Duarte','Varga','Holm','Ferro','Brandt','Castell','Marek','Sorensen','Vidal','Kovac','Laine'];

KK.genName = function (r = Math.random) {
  const p = (a) => a[Math.floor(r() * a.length)];
  const x = r();
  if (x < 0.5) return p(FIRST_GH) + ' ' + p(LAST_GH);
  if (x < 0.78) return p(FIRST_WA) + ' ' + p(LAST_WA);
  return p(FIRST_W) + ' ' + p(LAST_W);
};

const TEAM_A = ['Savanna','Lagoon','Harmattan','Cocoa Valley','Baobab','Atlantic','Sunset','Palm Grove','Iron Hill','Riverside','Mango Park','Red Clay','Ocean Gate','Kola Nut','Akwaaba','Shea Butter','High Ridge','Coral Bay','Market Square','Granite','Lantern','Weaver Bird','Talking Drum','Canoe Beach','Cassava','Plantain','Ebony','Bamboo','Firefly','Copper','Starlight','Sahel','Rainforest','Lighthouse','Hilltop','Groundnut','Thunder Hill','Pepper Town','Seashell','Gold Dust'];
const TEAM_B = ['FC','United','Rovers','Athletic','Hawks','Strikers','Comets','Lions','Warriors','Stars','Wanderers','City','Panthers','Sparks','Royals','Eagles'];
const COLORS = ['#e53935','#1e88e5','#43a047','#fdd835','#fb8c00','#8e24aa','#00acc1','#111111','#ffffff','#6d4c41','#d81b60','#3949ab','#7cb342','#c0ca33','#5e35b1','#00897b'];
KK.COLORS = ['#c62828','#e53935','#ff7043','#fb8c00','#fdd835','#c0ca33','#43a047','#1b5e20','#00897b','#00acc1','#1e88e5','#283593','#5e35b1','#8e24aa','#d81b60','#6d4c41','#111111','#9e9e9e','#ffffff','#ffd54f'];

KK.genTeamName = function (used) {
  for (let i = 0; i < 200; i++) {
    const n = KK.pick(TEAM_A) + ' ' + KK.pick(TEAM_B);
    if (!used.has(n)) { used.add(n); return n; }
  }
  return 'Team ' + KK.uid();
};

KK.FORMATIONS = {
  // slots: [pos, depth(0=own goal..1), width(0..1)]
  '4-4-2': [['GK',0.02,.5],['DF',.2,.15],['DF',.18,.38],['DF',.18,.62],['DF',.2,.85],['MF',.42,.12],['MF',.4,.38],['MF',.4,.62],['MF',.42,.88],['FW',.62,.38],['FW',.62,.62]],
  '4-3-3': [['GK',0.02,.5],['DF',.2,.15],['DF',.18,.38],['DF',.18,.62],['DF',.2,.85],['MF',.38,.3],['MF',.36,.5],['MF',.38,.7],['FW',.6,.15],['FW',.64,.5],['FW',.6,.85]],
  '3-5-2': [['GK',0.02,.5],['DF',.18,.25],['DF',.17,.5],['DF',.18,.75],['MF',.38,.08],['MF',.36,.32],['MF',.34,.5],['MF',.36,.68],['MF',.38,.92],['FW',.62,.38],['FW',.62,.62]],
  '4-2-3-1': [['GK',0.02,.5],['DF',.2,.15],['DF',.18,.38],['DF',.18,.62],['DF',.2,.85],['MF',.33,.38],['MF',.33,.62],['MF',.5,.15],['MF',.5,.5],['MF',.5,.85],['FW',.66,.5]],
  '5-3-2': [['GK',0.02,.5],['DF',.24,.07],['DF',.17,.3],['DF',.16,.5],['DF',.17,.7],['DF',.24,.93],['MF',.4,.28],['MF',.38,.5],['MF',.4,.72],['FW',.62,.38],['FW',.62,.62]],
};

KK.statsFor = function (pos, rating, r = Math.random) {
  const v = (b) => KK.clamp(Math.round(rating + b + (r() * 12 - 6)), 20, 99);
  if (pos === 'GK') return { pac: v(-15), sho: v(-30), pas: v(-8), def: v(4) };
  if (pos === 'DF') return { pac: v(-2), sho: v(-18), pas: v(-4), def: v(6) };
  if (pos === 'MF') return { pac: v(0), sho: v(-3), pas: v(6), def: v(-6) };
  return { pac: v(4), sho: v(7), pas: v(-3), def: v(-20) };
};

KK.genPlayer = function (pos, rating, r = Math.random, style) {
  rating = KK.clamp(Math.round(rating), 30, 99);
  return { id: KK.uid() + Math.floor(r() * 1e6).toString(36), name: KK.natName ? KK.natName(r, style) : KK.genName(r), pos, rating, age: 17 + Math.floor(r() * 17), stats: KK.statsFor(pos, rating, r), goals: 0, apps: 0 };
};

KK.genSquad = function (base = 50, style) {
  const plan = ['GK','GK','DF','DF','DF','DF','DF','DF','MF','MF','MF','MF','MF','FW','FW','FW'];
  const seen = new Set();
  return plan.map((p, i) => {
    let pl; for (let k = 0; k < 20; k++) { pl = KK.genPlayer(p, base + KK.ri(-5, 6) + (i < 11 ? 2 : -2), Math.random, style); const sn = pl.name.split(' ').pop(); if (!seen.has(sn)) { seen.add(sn); break; } }
    return pl;
  });
};
const BAD_SHORT = /^(SUX|SEX|ASS|FUK|FUC|DIK|DIC|COK|CUM|FAG|NIG|TIT|POO|WTF|KKK|GAY|PIS|XXX)$/;
KK.shortName = function (name, teams = []) {
  const words = name.toUpperCase().replace(/[^A-Z ]/g, '').split(' ').filter(Boolean);
  const cands = [words[0].slice(0, 3), words[0].slice(0, 2) + (words[1] || 'X')[0], words[0][0] + (words[1] || 'XX').slice(0, 2), words[0][0] + words[0].slice(2, 4)];
  for (const c of cands) if (c.length === 3 && !BAD_SHORT.test(c) && !teams.some(t => t.short === c)) return c;
  return 'K' + KK.ri(10, 99);
};

KK.playerValue = p => Math.round(((Math.max(p.rating, 35) - 30) ** 2) * 0.9 / 10) * 10 + 100;
KK.trainCost = p => Math.round((30 + (p.rating - 30) * 6 + Math.max(0, p.rating - 70) * 18) / 5) * 5;

KK.DIV_RATING = { 6: 48, 5: 55, 4: 62, 3: 69, 2: 76, 1: 83 };
KK.STADIUM = [
  { name: 'Community Ground', cap: 800, cost: 0 },
  { name: 'Town Park', cap: 3000, cost: 1500 },
  { name: 'Riverside Bowl', cap: 9000, cost: 4000 },
  { name: 'City Arena', cap: 22000, cost: 8000 },
  { name: 'Grand Kente Stadium', cap: 45000, cost: 15000 },
];

// Round-robin double schedule
KK.makeFixtures = function (ids) {
  const n = ids.length, arr = ids.slice(), rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      round.push(r % 2 === 0 ? { h: a, a: b } : { h: b, a: a });
    }
    rounds.push(round);
    arr.splice(1, 0, arr.pop());
  }
  const second = rounds.map(rd => rd.map(f => ({ h: f.a, a: f.h })));
  return rounds.concat(second).map(rd => rd.map(f => ({ ...f, hs: null, as: null })));
};

// career helpers: mode 'gh' (Ghana Road to Glory, divisions 6..1) or 'eu' (a European country, tiers 1..n)
KK.career = save => save.career || { mode: 'gh' };
KK.numTiers = save => KK.career(save).mode === 'eu' ? KK.country(save.career.country).tiers : 6;
KK.leagueBase = (save, div) => KK.career(save).mode === 'eu' ? KK.tierBase(KK.country(save.career.country), div) : KK.DIV_RATING[div];
KK.leagueName = (save, div) => { div = div || save.season.div; return KK.career(save).mode === 'eu' ? KK.tierName(KK.country(save.career.country), div) : 'Division ' + div; };
KK.careerStyle = save => KK.career(save).mode === 'eu' ? KK.country(save.career.country).style : 'gh';
KK.levelOf = (save, div) => KK.clamp((KK.leagueBase(save, div) - 48) / 7, 0, 6); // 0 (Ghana Div 6) .. ~5
KK.newSeason = function (save, div, year) {
  const used = new Set([save.team.name]);
  const base = KK.leagueBase(save, div);
  const teams = [{ id: 'ME', name: save.team.name, short: save.team.short, c1: save.team.crest.c1, c2: save.team.crest.c2 }];
  if (KK.career(save).mode === 'eu') {
    const clubs = KK.leagueClubs(save.career.country, div).filter(t => t.name !== save.team.name);
    const drop = Math.floor(Math.random() * clubs.length);
    clubs.filter((t, i) => i !== drop).slice(0, 7).forEach(t => { const c = { ...t }; if (c.short === save.team.short) c.short = KK.shortName(c.name + ' X', teams); teams.push(c); });
  } else for (let i = 0; i < 7; i++) {
    const name = KK.genTeamName(used);
    const c1 = KK.pick(COLORS); let c2 = KK.pick(COLORS); if (c2 === c1) c2 = c1 === '#ffffff' ? '#111111' : '#ffffff';
    teams.push({ id: 'T' + i + KK.uid(), name, short: KK.shortName(name, teams), c1, c2, rating: base + KK.ri(-5, 6), form: KK.pick(Object.keys(KK.FORMATIONS)) });
  }
  const order = teams.map(t => t.id).sort(() => Math.random() - 0.5);
  save.season = { div, year, teams, fixtures: KK.makeFixtures(order), round: 0, done: false };
  save.market = KK.genMarket(save);
  if (KK.makeCups) KK.makeCups(save, year);
};

KK.genMarket = function (save) {
  const base = save.season ? KK.leagueBase(save, save.season.div) : 48, style = KK.careerStyle(save);
  const pos = ['GK','DF','DF','DF','MF','MF','MF','FW','FW','FW'];
  return pos.map(p => { const pl = KK.genPlayer(p, base + KK.ri(-4, 12), Math.random, Math.random() < 0.7 ? style : 'gh'); pl.price = Math.round(KK.playerValue(pl) * (1.1 + Math.random() * 0.3) / 10) * 10; return pl; });
};

KK.teamById = (save, id) => save.season.teams.find(t => t.id === id);

KK.lineupPlayers = function (save) { return save.lineup.map(id => save.players.find(p => p.id === id)).filter(Boolean); };

KK.myRating = function (save) {
  const slots = KK.FORMATIONS[save.formation];
  const xi = save.lineup.map(id => save.players.find(p => p.id === id));
  let sum = 0;
  xi.forEach((p, i) => { if (!p) return; let r = p.rating; const want = slots[i][0]; if (want !== p.pos) r -= (want === 'GK' || p.pos === 'GK') ? 25 : 8; sum += r; });
  return Math.round(sum / 11);
};

KK.ratingOf = (save, id) => id === 'ME' ? KK.myRating(save) + (save.stadium) * 0.6 : KK.teamById(save, id).rating;

function poisson(l) { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L && k < 12); return k - 1; }
KK.simScore = function (rh, ra) {
  const d = (rh - ra) / 14;
  return [Math.min(7, poisson(Math.max(0.2, 1.35 * Math.exp(d) + 0.15))), Math.min(7, poisson(Math.max(0.2, 1.15 * Math.exp(-d))))];
};

KK.table = function (save) {
  const rows = {};
  save.season.teams.forEach(t => rows[t.id] = { id: t.id, name: t.name, short: t.short, c1: t.c1, c2: t.c2, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 });
  save.season.fixtures.forEach(rd => rd.forEach(f => {
    if (f.hs == null) return;
    const h = rows[f.h], a = rows[f.a];
    h.P++; a.P++; h.GF += f.hs; h.GA += f.as; a.GF += f.as; a.GA += f.hs;
    if (f.hs > f.as) { h.W++; a.L++; h.Pts += 3; } else if (f.hs < f.as) { a.W++; h.L++; a.Pts += 3; } else { h.D++; a.D++; h.Pts++; a.Pts++; }
  }));
  return Object.values(rows).sort((x, y) => y.Pts - x.Pts || (y.GF - y.GA) - (x.GF - x.GA) || y.GF - x.GF || x.name.localeCompare(y.name));
};

KK.nextFixture = function (save) {
  const s = save.season; if (s.round >= s.fixtures.length) return null;
  return s.fixtures[s.round].find(f => f.h === 'ME' || f.a === 'ME');
};

// Record user's result, sim the rest of the round, pay coins. Returns reward info.
KK.recordResult = function (save, myGoals, oppGoals, scorers) {
  const s = save.season, f = KK.nextFixture(save);
  const home = f.h === 'ME';
  f.hs = home ? myGoals : oppGoals; f.as = home ? oppGoals : myGoals;
  s.fixtures[s.round].forEach(o => { if (o !== f && o.hs == null) { const [a, b] = KK.simScore(KK.ratingOf(save, o.h) + 1.5, KK.ratingOf(save, o.a)); o.hs = a; o.as = b; } });
  KK.lineupPlayers(save).forEach(p => p.apps = (p.apps || 0) + 1);
  (scorers || []).forEach(id => { const p = save.players.find(x => x.id === id); if (p) p.goals = (p.goals || 0) + 1; });
  const res = myGoals > oppGoals ? 'W' : myGoals < oppGoals ? 'L' : 'D';
  const mult = 1 + save.stadium * 0.15 + KK.levelOf(save, s.div) * 0.12;
  const base = res === 'W' ? 300 : res === 'D' ? 150 : 80;
  const gate = home ? Math.round(KK.STADIUM[save.stadium].cap / 40) : 0;
  const coins = Math.round((base + myGoals * 40) * mult + gate);
  save.coins += coins;
  save.history = (save.history || []).concat([{ y: s.year, d: s.div, opp: KK.teamById(save, home ? f.a : f.h).name, my: myGoals, op: oppGoals, res }]).slice(-30);
  s.round++;
  if (s.round % 4 === 0) save.market = KK.genMarket(save);
  let end = null;
  const cupMsgs = KK.cupAutoAdvance ? KK.cupAutoAdvance(save) : [];
  if (s.round >= s.fixtures.length) end = KK.endSeason(save);
  KK.save(save);
  return { res, coins, end, cupMsgs };
};

KK.endSeason = function (save) {
  const s = save.season, t = KK.table(save), pos = t.findIndex(r => r.id === 'ME') + 1, nT = KK.numTiers(save);
  // finish any cup games still to play this season
  if (KK.cupAutoAdvance) KK.cupAutoAdvance(save, true);
  let newDiv = s.div, outcome = 'stay';
  if (pos <= 2 && s.div > 1) { newDiv = s.div - 1; outcome = 'up'; }
  else if (pos >= 7 && s.div < nT) { newDiv = s.div + 1; outcome = 'down'; }
  else if (pos === 1 && s.div === 1) outcome = 'champ';
  const prize = Math.round((9 - pos) * 250 * (1 + KK.levelOf(save, s.div) * 0.4)) + (pos === 1 ? 1500 : 0);
  save.coins += prize;
  save.trophies = save.trophies || [];
  if (pos === 1) save.trophies.push({ y: s.year, d: s.div, name: KK.leagueName(save, s.div) + ' champions' });
  const qual = KK.cupQualify ? KK.cupQualify(save, pos) : null; save.cupQual = qual;
  // age players a little
  save.players.forEach(p => { p.age++; });
  const info = { pos, outcome, prize, oldDiv: s.div, newDiv, year: s.year, oldName: KK.leagueName(save, s.div), newName: KK.leagueName(save, newDiv), qual: qual ? KK.CUPS[qual].name : null };
  KK.newSeason(save, newDiv, s.year + 1);
  return info;
};

KK.SAVE_KEY = 'kenteKickers.save.v1';
KK.save = s => { try { localStorage.setItem(KK.SAVE_KEY, JSON.stringify(s)); } catch (e) {} };
KK.load = () => { try { const s = JSON.parse(localStorage.getItem(KK.SAVE_KEY)); return s && s.v === 1 ? KK.migrate(s) : null; } catch (e) { return null; } };
// upgrade older saves in place (v1 saves from before leagues and cups)
KK.migrate = function (s) {
  if (!s.career) s.career = { mode: 'gh' };
  s.settings = s.settings || {}; if (s.settings.len == null) s.settings.len = 3;
  if (!s.cups && s.season && KK.makeCups) { KK.makeCups(s, s.season.year); KK.cupAutoAdvance(s); }
  return s;
};

KK.newCareer = function (team, players, career) {
  const save = { v: 1, team, coins: 1000, stadium: 0, players, formation: '4-4-2', settings: KK.settings || { mute: false, len: 3 }, history: [], trophies: [], career: career || { mode: 'gh' } };
  KK.autoPick(save);
  KK.newSeason(save, save.career.mode === 'eu' ? (save.career.tier || KK.country(save.career.country).tiers) : 6, 1);
  KK.save(save);
  return save;
};

// Best XI for formation
KK.autoPick = function (save) {
  const slots = KK.FORMATIONS[save.formation];
  const pool = save.players.slice().sort((a, b) => b.rating - a.rating);
  const used = new Set(), lineup = [];
  slots.forEach(([pos]) => {
    let p = pool.find(x => !used.has(x.id) && x.pos === pos) || pool.find(x => !used.has(x.id) && x.pos !== 'GK') || pool.find(x => !used.has(x.id));
    used.add(p.id); lineup.push(p.id);
  });
  save.lineup = lineup;
};

// Crest SVG
KK.crestSVG = function (c, size = 64, short = '') {
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  const shape = 'M32 3 L58 10 C58 34 50 50 32 61 C14 50 6 34 6 10 Z';
  let pattern = '';
  if (c.pattern === 'halves') pattern = `<rect x="32" y="0" width="32" height="64" fill="${c.c2}"/>`;
  else if (c.pattern === 'stripes') pattern = [14, 26, 38, 50].map(x => `<rect x="${x - 3}" y="0" width="6" height="64" fill="${c.c2}"/>`).join('');
  else if (c.pattern === 'chevron') pattern = `<path d="M0 22 L32 40 L64 22 L64 34 L32 52 L0 34 Z" fill="${c.c2}"/>`;
  else if (c.pattern === 'kente') pattern = [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${i * 8}" y="${(i % 2) * 8}" width="8" height="8" fill="${c.c2}"/><rect x="${i * 8}" y="${16 + ((i + 1) % 2) * 8}" width="8" height="8" fill="${c.c2}"/><rect x="${i * 8}" y="${40 + (i % 2) * 8}" width="8" height="8" fill="${c.c2}"/>`).join('');
  else pattern = `<rect x="0" y="40" width="64" height="24" fill="${c.c2}"/>`;
  let emblem = '';
  const ec = c.ec || '#fff8e1';
  if (c.emblem === 'star') emblem = `<path d="M32 18 l4.2 8.6 9.5 1.4 -6.9 6.7 1.6 9.4 -8.4 -4.4 -8.4 4.4 1.6 -9.4 -6.9 -6.7 9.5 -1.4z" fill="${ec}" stroke="#0006" stroke-width="1"/>`;
  else if (c.emblem === 'ball') emblem = `<circle cx="32" cy="31" r="11" fill="#fff" stroke="#222" stroke-width="1.5"/><path d="M32 25 l5 3.6 -1.9 5.9 h-6.2 l-1.9 -5.9z" fill="#222"/>`;
  else if (c.emblem === 'drum') emblem = `<path d="M23 20 h18 l-4 12 4 12 h-18 l4 -12z" fill="${ec}" stroke="#0006" stroke-width="1"/><line x1="23" y1="20" x2="41" y2="44" stroke="#0005"/><line x1="41" y1="20" x2="23" y2="44" stroke="#0005"/>`;
  else if (c.emblem === 'bird') emblem = `<path d="M14 30 C22 22 28 26 32 32 C36 26 42 22 50 30 C42 28 37 32 34 40 L32 46 L30 40 C27 32 22 28 14 30Z" fill="${ec}" stroke="#0006" stroke-width="1"/>`;
  else emblem = `<text x="32" y="38" font-size="16" font-weight="900" text-anchor="middle" fill="${ec}" stroke="#0007" stroke-width=".8" font-family="Arial,sans-serif">${(short || 'KK').slice(0, 3)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs><g clip-path="url(#${id})"><rect width="64" height="64" fill="${c.c1}"/>${pattern}</g><path d="${shape}" fill="none" stroke="#fdd835" stroke-width="3"/>${emblem}</svg>`;
};

KK.kitSVG = function (shirt, shorts, size = 56) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><path d="M20 6 L10 10 L2 22 L10 28 L14 24 L14 42 L50 42 L50 24 L54 28 L62 22 L54 10 L44 6 C42 11 37 13 32 13 C27 13 22 11 20 6Z" fill="${shirt}" stroke="#0008" stroke-width="1.5"/><path d="M15 42 L49 42 L51 60 L35 60 L32 52 L29 60 L13 60Z" fill="${shorts}" stroke="#0008" stroke-width="1.5"/></svg>`;
};

KK.colorDist = function (a, b) {
  const h = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16));
  const [r1, g1, b1] = h(a), [r2, g2, b2] = h(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
};

// Opponent squad generated from a seed
KK.oppSquad = function (team) {
  const r = KK.seeded(team.id + team.name);
  const slots = KK.FORMATIONS[team.form || '4-4-2'];
  return slots.map(([pos]) => KK.genPlayer(pos, team.rating + (r() * 8 - 4), r, team.style || 'gh'));
};
