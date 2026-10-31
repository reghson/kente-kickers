/* Dream League Soccer — core data, 8-stat player model, Captains, 8-tier DLS Division pyramid, Facilities, Scouts, Agents & Coaches. */
'use strict';
const KK = window.KK = window.KK || {};

KK.rand = Math.random;
KK.ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
KK.pick = arr => arr[Math.floor(Math.random() * arr.length)];
KK.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
KK.uid = () => Math.random().toString(36).slice(2, 9);

// Seeded RNG (for deterministic opponent squads)
KK.seeded = function (seed) {
  let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
};

const FIRST_INT = ['Mateo','Lucas','Kylian','Erling','Jude','Vinicius','Bukayo','Pedri','Jamal','Rafael','Lautaro','Julian','Federico','Rodri','Martin','Bruno','Declan','Cole','Florian','Nico','Achraf','Theo','Ruben','William','Josko','Alisson','Thibaut','Mike','Diogo','Victor','Marcus','Gavi','Alejandro','Lamine','Joao','Goncalo','Darwin','Khvicha','heung-Min','Takefusa','Mohammed','Sadio','Riyad','Victor','Ousmane','Eduardo','Aurelien','Dayot','Ibrahima','Trent'];
const LAST_INT = ['Silva','Moreira','Valverde','Bellingham','Santana','Haland','Mbappe','Saka','Musiala','Leao','Martinez','Alvarez','De Bruyne','Odegaard','Fernandes','Rice','Palmer','Wirtz','Williams','Hakimi','Hernandez','Dias','Saliba','Gvardiol','Becker','Courtois','Maignan','Costa','Osimhen','Rashford','Torres','Yamal','Neves','Ramos','Nunez','Kvaratskhelia','Son','Kubo','Kudus','Salah','Mahrez','Boniface','Dembele','Camavinga','Tchouameni','Upamecano','Konate','Alexander'];
const FIRST_AF = ['Kwame','Kofi','Yaw','Kojo','Akwasi','Ebo','Nii','Selorm','Mawuli','Chidi','Emeka','Tunde','Moussa','Ibrahima','Ousmane','Sekou','Lamine','Idrissa','Kelechi','Tariq'];
const LAST_AF = ['Mensah','Owusu','Boateng','Osei','Appiah','Agyeman','Ofori','Tetteh','Addo','Amoah','Okafor','Adeyemi','Diallo','Traore','Kone','Camara','Balogun','Eze','Fofana','Ndiaye'];

KK.genName = function (r = Math.random) {
  const p = (a) => a[Math.floor(r() * a.length)];
  const x = r();
  if (x < 0.72) return p(FIRST_INT) + ' ' + p(LAST_INT);
  return p(FIRST_AF) + ' ' + p(LAST_AF);
};

const TEAM_A = ['Royal','Metropolitan','Athletic','Sporting','Olympic','Dynamo','United','Inter','Real','Victoria','Phoenix','Titans','Vanguard','Celestial','Imperial','Apex','Crown','Falcon','Thunder','Orion','Eclipse','Nova','Zenith','Atlas','Horizon','Harbor','Emerald','Sapphire','Valiant','Sovereign','Monarch','Pinnacle','Liberty','Solstice','Tempest','Legacy','Citadel','Velocity','Meridian','Aurora'];
const TEAM_B = ['FC','United','City','Athletic','Rovers','Wanderers','Sporting','Albion','Dynamo','County','Hotspur','CF','SC','AC','Stars','Royals'];
const COLORS = ['#e53935','#1e88e5','#00c853','#fdd835','#fb8c00','#8e24aa','#00acc1','#111111','#ffffff','#d81b60','#3949ab','#00e5ff','#ff3d00','#5e35b1','#00897b','#f5b800'];
KK.COLORS = ['#00e5ff','#00e676','#2979ff','#1e40af','#c62828','#e53935','#ff6d00','#fdd835','#f5b800','#43a047','#00897b','#7b1fa2','#d81b60','#111827','#374151','#ffffff','#90a4ae','#ff1744','#651fff','#aeea00'];

KK.genTeamName = function (used) {
  for (let i = 0; i < 240; i++) {
    const n = KK.pick(TEAM_A) + ' ' + KK.pick(TEAM_B);
    if (!used.has(n)) { used.add(n); return n; }
  }
  return 'Dream FC ' + KK.uid();
};

// 10 Authentic DLS Formations (unlocked progressively or available in Team Management)
KK.FORMATIONS = {
  '4-4-2': [['GK',0.02,.5],['DF',.2,.15],['DF',.18,.38],['DF',.18,.62],['DF',.2,.85],['MF',.42,.12],['MF',.4,.38],['MF',.4,.62],['MF',.42,.88],['FW',.62,.38],['FW',.62,.62]],
  '4-3-3': [['GK',0.02,.5],['DF',.2,.15],['DF',.18,.38],['DF',.18,.62],['DF',.2,.85],['MF',.38,.3],['MF',.35,.5],['MF',.38,.7],['FW',.61,.16],['FW',.65,.5],['FW',.61,.84]],
  '4-2-3-1': [['GK',0.02,.5],['DF',.2,.15],['DF',.18,.38],['DF',.18,.62],['DF',.2,.85],['MF',.33,.36],['MF',.33,.64],['MF',.5,.16],['MF',.5,.5],['MF',.5,.84],['FW',.66,.5]],
  '3-5-2': [['GK',0.02,.5],['DF',.18,.24],['DF',.16,.5],['DF',.18,.76],['MF',.4,.09],['MF',.35,.32],['MF',.33,.5],['MF',.35,.68],['MF',.4,.91],['FW',.62,.38],['FW',.62,.62]],
  '4-1-2-1-2': [['GK',0.02,.5],['DF',.2,.15],['DF',.18,.38],['DF',.18,.62],['DF',.2,.85],['MF',.31,.5],['MF',.43,.22],['MF',.43,.78],['MF',.53,.5],['FW',.64,.37],['FW',.64,.63]],
  '3-4-3': [['GK',0.02,.5],['DF',.18,.24],['DF',.16,.5],['DF',.18,.76],['MF',.4,.12],['MF',.38,.38],['MF',.38,.62],['MF',.4,.88],['FW',.61,.18],['FW',.65,.5],['FW',.61,.82]],
  '5-3-2': [['GK',0.02,.5],['DF',.24,.08],['DF',.17,.3],['DF',.16,.5],['DF',.17,.7],['DF',.24,.92],['MF',.4,.28],['MF',.38,.5],['MF',.4,.72],['FW',.62,.38],['FW',.62,.62]],
  '4-5-1': [['GK',0.02,.5],['DF',.2,.15],['DF',.18,.38],['DF',.18,.62],['DF',.2,.85],['MF',.42,.1],['MF',.38,.3],['MF',.35,.5],['MF',.38,.7],['MF',.42,.9],['FW',.65,.5]],
};

// DLS 8-Stat Model: SPE, ACC, STA, CON, STR, TAC, PAS, SHO (plus pac & def aliases for engine physics)
KK.tierOf = r => r >= 80 ? 'legendary' : r >= 70 ? 'rare' : 'common';

KK.statsFor = function (pos, rating, r = Math.random) {
  const v = (b) => KK.clamp(Math.round(rating + b + (r() * 10 - 5)), 30, 99);
  let spe, acc, sta, con, str, tac, pas, sho;
  if (pos === 'GK') {
    spe = v(-14); acc = v(-12); sta = v(-6); con = v(-10);
    str = v(2); tac = v(5); pas = v(-4); sho = v(-25);
  } else if (pos === 'DF') {
    spe = v(-1); acc = v(-2); sta = v(3); con = v(-4);
    str = v(6); tac = v(7); pas = v(-3); sho = v(-16);
  } else if (pos === 'MF') {
    spe = v(1); acc = v(2); sta = v(4); con = v(6);
    str = v(-2); tac = v(-3); pas = v(7); sho = v(0);
  } else {
    spe = v(5); acc = v(6); sta = v(0); con = v(5);
    str = v(0); tac = v(-18); pas = v(-1); sho = v(7);
  }
  const pac = Math.round((spe + acc) / 2);
  const def = pos === 'GK' ? tac : Math.round((tac * 0.65 + str * 0.35));
  return { spe, acc, sta, con, str, tac, pas, sho, pac, def };
};

KK.syncStats = function (p) {
  if (!p || !p.stats) return;
  const s = p.stats;
  if (s.spe == null) s.spe = s.pac || p.rating;
  if (s.acc == null) s.acc = KK.clamp((s.pac || p.rating) + ((p.name ? p.name.length % 5 : 2) - 2), 30, 99);
  if (s.sta == null) s.sta = KK.clamp(p.rating + (p.pos === 'MF' ? 3 : 0), 40, 99);
  if (s.con == null) s.con = KK.clamp(Math.round(((s.pas || p.rating) + (s.pac || p.rating)) / 2), 30, 99);
  if (s.str == null) s.str = KK.clamp(Math.round(((s.def || p.rating) + p.rating) / 2), 35, 99);
  if (s.tac == null) s.tac = s.def || p.rating;
  s.pac = Math.round((s.spe + s.acc) / 2);
  s.def = p.pos === 'GK' ? s.tac : Math.round(s.tac * 0.65 + s.str * 0.35);
  p.tier = KK.tierOf(p.rating);
  if (!p.foot) p.foot = ['R', 'R', 'L', 'B'][(p.name ? p.name.charCodeAt(0) : 0) % 4];
  if (!p.height) p.height = p.pos === 'GK' ? 188 + (p.age % 7) : p.pos === 'DF' ? 182 + (p.age % 9) : 173 + (p.age % 12);
};

KK.genPlayer = function (pos, rating, r = Math.random, style) {
  rating = KK.clamp(Math.round(rating), 45, 99);
  KK._nat = 'en';
  const nm = KK.natName ? KK.natName(r, style || 'en|es|it|de|fr|pt|nl') : KK.genName(r);
  const foot = r() < 0.68 ? 'R' : r() < 0.88 ? 'L' : 'B';
  const height = pos === 'GK' ? 186 + Math.floor(r() * 10) : pos === 'DF' ? 180 + Math.floor(r() * 12) : 171 + Math.floor(r() * 16);
  const p = {
    id: KK.uid() + Math.floor(r() * 1e6).toString(36),
    name: nm,
    nat: KK._nat || 'en',
    fit: 100,
    pos,
    foot,
    height,
    rating,
    tier: KK.tierOf(rating),
    age: 18 + Math.floor(r() * 14),
    stats: KK.statsFor(pos, rating, r),
    goals: 0,
    assists: 0,
    apps: 0
  };
  KK.syncStats(p);
  return p;
};

// 9 Marquee Star Captains for DLS New Career Onboarding
KK.CAPTAINS = [
  { id: 'cap_striker_1', name: 'Kylian Moreau', nat: 'fr', pos: 'FW', foot: 'R', height: 180, age: 25, rating: 83, stats: { spe: 91, acc: 90, sta: 82, con: 86, str: 76, tac: 42, pas: 79, sho: 87 } },
  { id: 'cap_striker_2', name: 'Erling Lindqvist', nat: 'no', pos: 'FW', foot: 'L', height: 194, age: 24, rating: 83, stats: { spe: 88, acc: 84, sta: 83, con: 79, str: 91, tac: 45, pas: 73, sho: 90 } },
  { id: 'cap_winger_1', name: 'Vinicius Duarte', nat: 'pt', pos: 'FW', foot: 'R', height: 176, age: 24, rating: 82, stats: { spe: 92, acc: 93, sta: 81, con: 89, str: 70, tac: 40, pas: 80, sho: 83 } },
  { id: 'cap_mid_1', name: 'Jude Ashby', nat: 'en', pos: 'MF', foot: 'R', height: 186, age: 22, rating: 83, stats: { spe: 82, acc: 83, sta: 89, con: 86, str: 84, tac: 78, pas: 85, sho: 82 } },
  { id: 'cap_mid_2', name: 'Kevin DeGroot', nat: 'nl', pos: 'MF', foot: 'B', height: 181, age: 28, rating: 82, stats: { spe: 77, acc: 78, sta: 84, con: 87, str: 76, tac: 68, pas: 92, sho: 85 } },
  { id: 'cap_mid_3', name: 'Pedri Villalba', nat: 'es', pos: 'MF', foot: 'R', height: 174, age: 22, rating: 81, stats: { spe: 80, acc: 84, sta: 86, con: 90, str: 68, tac: 72, pas: 89, sho: 75 } },
  { id: 'cap_def_1', name: 'Virgil VanDijk', nat: 'nl', pos: 'DF', foot: 'R', height: 193, age: 27, rating: 82, stats: { spe: 81, acc: 77, sta: 84, con: 76, str: 92, tac: 89, pas: 78, sho: 60 } },
  { id: 'cap_def_2', name: 'Achraf Bamba', nat: 'fr', pos: 'DF', foot: 'R', height: 181, age: 25, rating: 81, stats: { spe: 91, acc: 89, sta: 88, con: 81, str: 78, tac: 80, pas: 79, sho: 68 } },
  { id: 'cap_gk_1', name: 'Alisson Costa', nat: 'pt', pos: 'GK', foot: 'R', height: 193, age: 28, rating: 82, stats: { spe: 66, acc: 68, sta: 78, con: 74, str: 84, tac: 88, pas: 80, sho: 52 } },
].map(c => { KK.syncStats(c); return c; });

KK.genSquad = function (base = 57, style, captainId) {
  const plan = ['GK','GK','DF','DF','DF','DF','DF','DF','MF','MF','MF','MF','MF','FW','FW','FW'];
  const seen = new Set();
  const capTpl = KK.CAPTAINS.find(c => c.id === captainId) || KK.CAPTAINS[0];
  seen.add(capTpl.name.split(' ').pop());
  const list = plan.map((p, i) => {
    let pl;
    for (let k = 0; k < 25; k++) {
      pl = KK.genPlayer(p, base + KK.ri(-3, 4) + (i < 11 ? 2 : -1), Math.random, style);
      const sn = pl.name.split(' ').pop();
      if (!seen.has(sn)) { seen.add(sn); break; }
    }
    return pl;
  });
  // Insert chosen Star Captain into the starting squad
  const cap = JSON.parse(JSON.stringify(capTpl));
  cap.id = 'cap_' + KK.uid();
  cap.isCaptain = true;
  const replaceIdx = list.findIndex(x => x.pos === cap.pos);
  if (replaceIdx >= 0) list[replaceIdx] = cap;
  else list[list.length - 1] = cap;
  return list;
};

const BAD_SHORT = /^(SUX|SEX|ASS|FUK|FUC|DIK|DIC|COK|CUM|FAG|NIG|TIT|POO|WTF|KKK|GAY|PIS|XXX)$/;
KK.shortName = function (name, teams = []) {
  const words = name.toUpperCase().replace(/[^A-Z ]/g, '').split(' ').filter(Boolean);
  if (!words.length) return 'DLS';
  const cands = [words[0].slice(0, 3), words[0].slice(0, 2) + (words[1] || 'F')[0], words[0][0] + (words[1] || 'FC').slice(0, 2), words[0][0] + words[0].slice(2, 4)];
  for (const c of cands) if (c.length === 3 && !BAD_SHORT.test(c) && !teams.some(t => t.short === c)) return c;
  return 'D' + KK.ri(10, 99);
};

KK.playerValue = p => {
  const r = Math.max(p.rating, 45);
  const base = Math.round(((r - 42) ** 2.15) * 0.65 / 5) * 5 + 120;
  return p.rating >= 80 ? Math.round(base * 1.25 / 10) * 10 : base;
};
KK.trainCost = (p, save) => {
  const trLv = save && save.facilities ? (save.facilities.training || 0) : 0;
  const disc = 1 - trLv * 0.06;
  return Math.max(25, Math.round((45 + (p.rating - 45) * 7 + Math.max(0, p.rating - 75) * 22) * disc / 5) * 5);
};

// 8-Tier Dream League Soccer Division Pyramid (div 8 = Academy Division .. div 1 = Legendary Division)
KK.DLS_DIVISIONS = {
  8: { name: 'Academy Division', base: 56, reqCap: 0, prize: 600, gems: 8 },
  7: { name: 'Amateur Division', base: 61, reqCap: 15000, prize: 900, gems: 12 },
  6: { name: 'Division 4', base: 65, reqCap: 25000, prize: 1300, gems: 16 },
  5: { name: 'Division 3', base: 69, reqCap: 35000, prize: 1800, gems: 22 },
  4: { name: 'Division 2', base: 73, reqCap: 45000, prize: 2500, gems: 30 },
  3: { name: 'Division 1', base: 77, reqCap: 55000, prize: 3500, gems: 40 },
  2: { name: 'Elite Division', base: 81, reqCap: 70000, prize: 5000, gems: 55 },
  1: { name: 'Legendary Division', base: 86, reqCap: 85000, prize: 8000, gems: 80 },
};
KK.DIV_RATING = { 8: 56, 7: 61, 6: 65, 5: 69, 4: 73, 3: 77, 2: 81, 1: 86 };

// 8-Level DLS Stadium Progression (up to 85,000 seats for Legendary Division)
KK.STADIUM = [
  { name: 'Academy Ground', cap: 5000, cost: 0, bonus: 15 },
  { name: 'Junior Municipal Park', cap: 15000, cost: 650, bonus: 35 },
  { name: 'Challenger Stadium', cap: 25000, cost: 1200, bonus: 60 },
  { name: 'Centurion Arena', cap: 35000, cost: 2000, bonus: 90 },
  { name: 'Metropolitan Bowl', cap: 45000, cost: 3200, bonus: 125 },
  { name: 'Grand Continental Park', cap: 55000, cost: 4800, bonus: 165 },
  { name: 'Elite Crown Colosseum', cap: 70000, cost: 7000, bonus: 215 },
  { name: 'Legendary Dream Arena', cap: 85000, cost: 10000, bonus: 280 },
];

// 5 Additional Club Complex Facilities (Levels 0..5, upgraded with Gems or Coins)
KK.FACILITIES = {
  commercial: {
    name: 'Commercial Facility',
    icon: '💼',
    desc: 'Increases shirt sponsorship & matchday coin bonuses after every game.',
    effect: lv => `+${lv * 12}% Match Coin Bonus`,
    costs: [0, 25, 55, 95, 145, 210], // Gems
    coinCosts: [0, 600, 1300, 2200, 3500, 5000]
  },
  training: {
    name: 'Training Facility',
    icon: '🏋️',
    desc: 'Unlocks all tactical formations and discounts Coach training costs.',
    effect: lv => `-${lv * 7}% Coach Cost · All Formations`,
    costs: [0, 25, 55, 95, 145, 210],
    coinCosts: [0, 600, 1300, 2200, 3500, 5000]
  },
  medical: {
    name: 'Medical Facility',
    icon: '🩺',
    desc: 'Reduces player stamina drain per match and discounts Physio recovery.',
    effect: lv => `-${lv * 10}% Fatigue & Physio Cost`,
    costs: [0, 20, 45, 80, 125, 180],
    coinCosts: [0, 500, 1100, 1900, 3000, 4400]
  },
  accommodation: {
    name: 'Accommodation',
    icon: '🏢',
    desc: 'Expands your Club Player Quarters to hold a bigger squad roster.',
    effect: lv => `Max Squad Size: ${20 + lv * 3} Players`,
    costs: [0, 20, 45, 80, 125, 180],
    coinCosts: [0, 500, 1100, 1900, 3000, 4400]
  },
  recruitment: {
    name: 'Recruitment Center',
    icon: '🔭',
    desc: 'Lowers Live Transfer Market fees and Scout hiring costs.',
    effect: lv => `-${lv * 5}% Transfer & Scout Fees`,
    costs: [0, 25, 55, 95, 145, 210],
    coinCosts: [0, 600, 1300, 2200, 3500, 5000]
  }
};

KK.maxSquadSize = save => 20 + ((save && save.facilities && save.facilities.accommodation) || 0) * 3;
KK.transferDiscount = save => 1 - ((save && save.facilities && save.facilities.recruitment) || 0) * 0.05;

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

// Career helpers: mode 'dls' (8-tier Dream League pyramid, 8..1) or 'eu' (European country leagues)
KK.career = save => save.career || { mode: 'dls' };
KK.numTiers = save => KK.career(save).mode === 'eu' ? KK.country(save.career.country).tiers : 8;
KK.leagueBase = (save, div) => {
  if (KK.career(save).mode === 'eu') return KK.tierBase(KK.country(save.career.country), div);
  return (KK.DLS_DIVISIONS[div] && KK.DLS_DIVISIONS[div].base) || 56;
};
KK.leagueName = (save, div) => {
  div = div || (save.season && save.season.div) || 8;
  if (KK.career(save).mode === 'eu') return KK.tierName(KK.country(save.career.country), div);
  return (KK.DLS_DIVISIONS[div] && KK.DLS_DIVISIONS[div].name) || ('Division ' + div);
};
KK.careerStyle = save => KK.career(save).mode === 'eu' ? KK.country(save.career.country).style : 'en|es|it|de|fr|pt|nl';
KK.levelOf = (save, div) => KK.clamp((KK.leagueBase(save, div) - 54) / 5, 0, 7);

KK.newSeason = function (save, div, year) {
  const used = new Set([save.team.name]);
  const base = KK.leagueBase(save, div);
  const teams = [{ id: 'ME', name: save.team.name, short: save.team.short, c1: save.team.crest.c1, c2: save.team.crest.c2 }];
  if (KK.career(save).mode === 'eu') {
    const clubs = KK.leagueClubs(save.career.country, div).filter(t => t.name !== save.team.name);
    const drop = Math.floor(Math.random() * clubs.length);
    clubs.filter((t, i) => i !== drop).slice(0, 7).forEach(t => { const c = { ...t }; if (c.short === save.team.short) c.short = KK.shortName(c.name + ' X', teams); teams.push(c); });
  } else {
    const allClubs = KK.allLeagues ? KK.allLeagues().flatMap(l => KK.leagueClubs(l.code, l.tier)) : [];
    const near = allClubs.filter(c => Math.abs(c.rating - base) <= 5 && !used.has(c.name));
    for (let i = 0; i < 7; i++) {
      if (near.length > i * 2) {
        const pickC = near.splice(Math.floor(Math.random() * near.length), 1)[0];
        used.add(pickC.name);
        teams.push({ id: 'T' + i + KK.uid(), name: pickC.name, short: KK.shortName(pickC.name, teams), c1: pickC.c1, c2: pickC.c2, rating: KK.clamp(base + KK.ri(-3, 4), 48, 92), form: pickC.form || KK.pick(Object.keys(KK.FORMATIONS)), style: pickC.style, country: pickC.country });
      } else {
        const name = KK.genTeamName(used);
        const c1 = KK.pick(COLORS); let c2 = KK.pick(COLORS); if (c2 === c1) c2 = c1 === '#ffffff' ? '#111111' : '#ffffff';
        teams.push({ id: 'T' + i + KK.uid(), name, short: KK.shortName(name, teams), c1, c2, rating: KK.clamp(base + KK.ri(-3, 4), 48, 92), form: KK.pick(Object.keys(KK.FORMATIONS)) });
      }
    }
  }
  const order = teams.map(t => t.id).sort(() => Math.random() - 0.5);
  save.season = { div, year, teams, fixtures: KK.makeFixtures(order), round: 0, done: false };
  save.market = KK.genMarket(save);
  if (KK.makeCups) KK.makeCups(save, year);
};

// Live Transfer Market: mixes Common, Rare, and Legendary players scaled to Club Reputation & Division
KK.genMarket = function (save) {
  const myOvr = save && save.players && save.players.length ? KK.myRating(save) : 62;
  const disc = KK.transferDiscount(save);
  const posList = ['GK','DF','DF','DF','MF','MF','MF','FW','FW','FW','MF','FW'];
  return posList.map((p, idx) => {
    let targetOvr;
    if (idx >= 10) targetOvr = KK.ri(80, Math.max(84, Math.min(93, myOvr + 14))); // Guaranteed Legendary stars
    else if (idx >= 6) targetOvr = KK.ri(71, 79); // Rare stars
    else targetOvr = KK.ri(Math.max(56, myOvr - 5), Math.min(72, myOvr + 5)); // Common squad builders
    const pl = KK.genPlayer(p, targetOvr, Math.random, 'en|es|it|de|fr|pt|nl');
    pl.price = Math.max(90, Math.round(KK.playerValue(pl) * disc / 5) * 5);
    return pl;
  }).sort((a, b) => b.rating - a.rating);
};

// Generate Scout results (3 discounted targets based on Scout tier: 'common' | 'rare' | 'legendary')
KK.runScout = function (save, tier) {
  const disc = KK.transferDiscount(save) * 0.82; // 18% Scout discount
  const ranges = { common: [60, 72], rare: [71, 81], legendary: [80, 91] };
  const [lo, hi] = ranges[tier] || [62, 75];
  const positions = ['GK', 'DF', 'MF', 'FW'];
  return [0, 1, 2].map(i => {
    const pos = i === 0 ? KK.pick(['FW', 'MF']) : KK.pick(positions);
    const ovr = KK.ri(lo, hi + (i === 0 && tier === 'legendary' ? 2 : 0));
    const pl = KK.genPlayer(pos, ovr, Math.random, 'en|es|it|de|fr|pt|nl');
    pl.price = Math.max(80, Math.round(KK.playerValue(pl) * disc / 5) * 5);
    pl.scouted = tier;
    return pl;
  }).sort((a, b) => b.rating - a.rating);
};

// Sign a player via Secret Agent ('rare' = 73..81 OVR, 'legendary' = 81..91 OVR)
KK.openAgent = function (save, tier) {
  const [lo, hi] = tier === 'legendary' ? [81, 90] : [73, 80];
  const pos = KK.pick(['FW', 'FW', 'MF', 'MF', 'DF', 'GK']);
  const pl = KK.genPlayer(pos, KK.ri(lo, hi), Math.random, 'en|es|it|de|fr|pt|nl');
  pl.fit = 100;
  return pl;
};

KK.teamById = (save, id) => save.season.teams.find(t => t.id === id);
KK.lineupPlayers = function (save) { return save.lineup.map(id => save.players.find(p => p.id === id)).filter(Boolean); };

KK.myRating = function (save) {
  const slots = KK.FORMATIONS[save.formation] || KK.FORMATIONS['4-4-2'];
  const xi = save.lineup.map(id => save.players.find(p => p.id === id));
  let sum = 0;
  xi.forEach((p, i) => {
    if (!p) return;
    let r = p.rating;
    const want = slots[i] ? slots[i][0] : p.pos;
    if (want !== p.pos) r -= (want === 'GK' || p.pos === 'GK') ? 25 : 6;
    sum += r;
  });
  return Math.round(sum / 11);
};

KK.teamStars = ovr => KK.clamp(Math.round(((ovr - 45) / 9) * 2) / 2, 1, 5);
KK.ratingOf = (save, id) => id === 'ME' ? KK.myRating(save) + (save.stadium || 0) * 0.5 : KK.teamById(save, id).rating;

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

// Record user's result, sim the rest of the round, pay DLS Coins + Commercial & Stadium bonuses.
KK.recordResult = function (save, myGoals, oppGoals, scorers) {
  const s = save.season, f = KK.nextFixture(save);
  const home = f.h === 'ME';
  f.hs = home ? myGoals : oppGoals; f.as = home ? oppGoals : myGoals;
  s.fixtures[s.round].forEach(o => { if (o !== f && o.hs == null) { const [a, b] = KK.simScore(KK.ratingOf(save, o.h) + 1.5, KK.ratingOf(save, o.a)); o.hs = a; o.as = b; } });
  KK.lineupPlayers(save).forEach(p => p.apps = (p.apps || 0) + 1);
  (scorers || []).forEach(id => { const p = save.players.find(x => x.id === id); if (p) p.goals = (p.goals || 0) + 1; });
  const res = myGoals > oppGoals ? 'W' : myGoals < oppGoals ? 'L' : 'D';
  const commLv = (save.facilities && save.facilities.commercial) || 0;
  const mult = 1 + (save.stadium || 0) * 0.1 + KK.levelOf(save, s.div) * 0.1 + commLv * 0.12;
  const base = res === 'W' ? 140 : res === 'D' ? 75 : 40;
  const stObj = KK.STADIUM[Math.min(KK.STADIUM.length - 1, save.stadium || 0)];
  const gate = home ? stObj.bonus : 0;
  const coins = Math.round((base + myGoals * 22) * mult + gate);
  save.coins += coins;
  save.history = (save.history || []).concat([{ y: s.year, d: s.div, opp: KK.teamById(save, home ? f.a : f.h).name, my: myGoals, op: oppGoals, res }]).slice(-30);
  s.round++;
  // Refresh Live Transfer Market every round in DLS style (keeping locked player if any)
  const locked = (save.market || []).filter(p => p.locked);
  save.market = locked.concat(KK.genMarket(save).slice(0, 12 - locked.length));
  let end = null;
  const cupMsgs = KK.cupAutoAdvance ? KK.cupAutoAdvance(save) : [];
  if (s.round >= s.fixtures.length) end = KK.endSeason(save);
  KK.save(save);
  return { res, coins, gate, commBonus: Math.round((base + myGoals * 22) * commLv * 0.12), end, cupMsgs };
};

KK.endSeason = function (save) {
  const s = save.season, t = KK.table(save), pos = t.findIndex(r => r.id === 'ME') + 1, nT = KK.numTiers(save);
  if (KK.cupAutoAdvance) KK.cupAutoAdvance(save, true);
  let newDiv = s.div, outcome = 'stay', stadiumBlocked = false;
  const nextDiv = s.div - 1;
  const stCap = KK.STADIUM[Math.min(KK.STADIUM.length - 1, save.stadium || 0)].cap;
  const reqCap = KK.career(save).mode === 'dls' && KK.DLS_DIVISIONS[nextDiv] ? KK.DLS_DIVISIONS[nextDiv].reqCap : 0;
  if (pos <= 2 && s.div > 1) {
    if (stCap >= reqCap) { newDiv = nextDiv; outcome = 'up'; }
    else { outcome = 'stay_cap'; stadiumBlocked = true; }
  } else if (pos >= 7 && s.div < nT) { newDiv = s.div + 1; outcome = 'down'; }
  else if (pos === 1 && s.div === 1) outcome = 'champ';

  const divDef = KK.DLS_DIVISIONS[s.div] || { prize: 1000, gems: 15 };
  const prize = Math.round((9 - pos) * (divDef.prize / 4)) + (pos === 1 ? divDef.prize : 0);
  const gemPrize = pos === 1 ? divDef.gems : pos <= 2 ? Math.round(divDef.gems * 0.6) : 5;
  save.coins += prize;
  save.gold = (save.gold || 0) + gemPrize;
  save.trophies = save.trophies || [];
  if (pos === 1) save.trophies.push({ y: s.year, d: s.div, name: KK.leagueName(save, s.div) + ' Champions' });
  const qual = KK.cupQualify ? KK.cupQualify(save, pos) : null; save.cupQual = qual;
  save.players.forEach(p => { if (p.age < 33 && Math.random() < 0.5) p.age++; });
  const info = { pos, outcome, stadiumBlocked, reqCap, prize, gemPrize, oldDiv: s.div, newDiv, year: s.year, oldName: KK.leagueName(save, s.div), newName: KK.leagueName(save, newDiv), qual: qual ? KK.CUPS[qual].name : null };
  KK.newSeason(save, newDiv, s.year + 1);
  return info;
};

KK.SAVE_KEY = 'kenteKickers.save.v1';
KK.save = s => { try { localStorage.setItem(KK.SAVE_KEY, JSON.stringify(s)); } catch (e) {} };
KK.load = () => { try { const s = JSON.parse(localStorage.getItem(KK.SAVE_KEY)); return s && s.v === 1 ? KK.migrate(s) : null; } catch (e) { return null; } };

KK.migrate = function (s) {
  if (!s.career || s.career.mode === 'gh') s.career = { mode: 'dls' };
  s.settings = s.settings || {}; if (s.settings.len == null) s.settings.len = 3;
  s.facilities = s.facilities || { commercial: 0, training: 0, medical: 0, accommodation: 0, recruitment: 0 };
  s.coaches = s.coaches || { tech: { c: 1, r: 0, l: 0 }, fit: { c: 1, r: 0, l: 0 }, gk: { c: 1, r: 0, l: 0 } };
  s.scouted = s.scouted || [];
  if (s.players) s.players.forEach(p => KK.syncStats(p));
  if (s.market) s.market.forEach(p => KK.syncStats(p));
  if (!s.roles && s.players && s.players.length) {
    const cap = s.players.find(p => p.isCaptain) || s.players.slice().sort((a, b) => b.rating - a.rating)[0];
    s.roles = { captain: cap.id, pk: cap.id, fk: cap.id, ck: cap.id };
  }
  if (!s.cups && s.season && KK.makeCups) { KK.makeCups(s, s.season.year); KK.cupAutoAdvance(s); }
  return s;
};

KK.newCareer = function (team, players, career, managerName) {
  players.forEach(p => KK.syncStats(p));
  const cap = players.find(p => p.isCaptain) || players.slice().sort((a, b) => b.rating - a.rating)[0];
  const save = {
    v: 1,
    team,
    manager: managerName || 'Manager',
    coins: 1500,
    gold: 75, // Gems
    stadium: 0,
    facilities: { commercial: 0, training: 0, medical: 0, accommodation: 0, recruitment: 0 },
    coaches: { tech: { c: 2, r: 1, l: 0 }, fit: { c: 2, r: 1, l: 0 }, gk: { c: 1, r: 0, l: 0 } },
    scouted: [],
    roles: { captain: cap.id, pk: cap.id, fk: cap.id, ck: cap.id },
    players,
    formation: '4-3-3',
    settings: KK.settings || { mute: false, len: 3 },
    history: [],
    trophies: [],
    career: career || { mode: 'dls' }
  };
  KK.autoPick(save);
  const startDiv = save.career.mode === 'eu' ? (save.career.tier || KK.country(save.career.country).tiers) : 8;
  KK.newSeason(save, startDiv, 1);
  KK.save(save);
  return save;
};

// Best XI for formation
KK.autoPick = function (save) {
  const slots = KK.FORMATIONS[save.formation] || KK.FORMATIONS['4-4-2'];
  const pool = save.players.slice().sort((a, b) => b.rating - a.rating);
  const used = new Set(), lineup = [];
  slots.forEach(([pos]) => {
    let p = pool.find(x => !used.has(x.id) && x.pos === pos) || pool.find(x => !used.has(x.id) && x.pos !== 'GK') || pool.find(x => !used.has(x.id));
    used.add(p.id); lineup.push(p.id);
  });
  save.lineup = lineup;
};

// DLS Crest SVG (Shield with metallic border, geometric patterns & emblems)
KK.crestSVG = function (c, size = 64, short = '') {
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  const shape = 'M32 3 L58 10 C58 34 50 50 32 61 C14 50 6 34 6 10 Z';
  let pattern = '';
  if (c.pattern === 'halves') pattern = `<rect x="32" y="0" width="32" height="64" fill="${c.c2}"/>`;
  else if (c.pattern === 'stripes') pattern = [14, 26, 38, 50].map(x => `<rect x="${x - 3}" y="0" width="6" height="64" fill="${c.c2}"/>`).join('');
  else if (c.pattern === 'chevron') pattern = `<path d="M0 22 L32 40 L64 22 L64 34 L32 52 L0 34 Z" fill="${c.c2}"/>`;
  else if (c.pattern === 'sash' || c.pattern === 'kente') pattern = `<path d="M-4 12 L16 -4 L68 48 L48 64 Z" fill="${c.c2}"/><path d="M0 44 L64 24 L64 32 L0 52 Z" fill="#00e5ff" opacity="0.7"/>`;
  else pattern = `<rect x="0" y="38" width="64" height="26" fill="${c.c2}"/>`;
  let emblem = '';
  const ec = c.ec || '#fff8e1';
  if (c.emblem === 'star') emblem = `<path d="M32 16 l4.5 9.1 10 1.5 -7.2 7 1.7 9.9 -9 -4.7 -9 4.7 1.7 -9.9 -7.2 -7 10 -1.5z" fill="#ffd54f" stroke="#0008" stroke-width="1.2"/>`;
  else if (c.emblem === 'ball') emblem = `<circle cx="32" cy="31" r="11" fill="#fff" stroke="#111" stroke-width="1.5"/><path d="M32 25 l5 3.6 -1.9 5.9 h-6.2 l-1.9 -5.9z" fill="#111"/>`;
  else if (c.emblem === 'crown' || c.emblem === 'drum') emblem = `<path d="M18 38 L21 22 L28 30 L32 20 L36 30 L43 22 L46 38 Z" fill="#ffd54f" stroke="#0008" stroke-width="1.2"/>`;
  else if (c.emblem === 'eagle' || c.emblem === 'bird') emblem = `<path d="M12 28 C21 20 27 25 32 31 C37 25 43 20 52 28 C43 27 38 32 34 40 L32 46 L30 40 C26 32 21 27 12 28Z" fill="#ffd54f" stroke="#0008" stroke-width="1.2"/>`;
  else emblem = `<text x="32" y="38" font-size="16" font-weight="900" font-style="italic" text-anchor="middle" fill="${ec}" stroke="#0009" stroke-width="1" font-family="Arial Black,Arial,sans-serif">${(short || 'DLS').slice(0, 3)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs><g clip-path="url(#${id})"><rect width="64" height="64" fill="${c.c1}"/>${pattern}<path d="M0 0 L64 0 L36 64 L0 64 Z" fill="#ffffff" opacity="0.1"/></g><path d="${shape}" fill="none" stroke="#00e5ff" stroke-width="2.6"/><path d="${shape}" fill="none" stroke="#ffd54f" stroke-width="1.2" opacity="0.8"/>${emblem}</svg>`;
};

KK.kitSVG = function (shirt, shorts, size = 56) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><path d="M20 6 L10 10 L2 22 L10 28 L14 24 L14 42 L50 42 L50 24 L54 28 L62 22 L54 10 L44 6 C42 11 37 13 32 13 C27 13 22 11 20 6Z" fill="${shirt}" stroke="#0008" stroke-width="1.5"/><path d="M15 42 L49 42 L51 60 L35 60 L32 52 L29 60 L13 60Z" fill="${shorts}" stroke="#0008" stroke-width="1.5"/></svg>`;
};

KK.colorDist = function (a, b) {
  const h = x => [1, 3, 5].map(i => parseInt(String(x || '#000000').slice(i, i + 2), 16) || 0);
  const [r1, g1, b1] = h(a), [r2, g2, b2] = h(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
};

// Opponent squad generated from a seed
KK.oppSquad = function (team) {
  const r = KK.seeded(team.id + team.name);
  const slots = KK.FORMATIONS[team.form || '4-4-2'] || KK.FORMATIONS['4-4-2'];
  return slots.map(([pos]) => KK.genPlayer(pos, team.rating + (r() * 6 - 3), r, team.style || 'en|es|it|de|fr'));
};
