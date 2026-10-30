/* Kente Kickers: invented European leagues, clubs and continental cups.
   Every league, club and player name here is made up and generated procedurally. Country flags are drawn as simple colour stripes. */
'use strict';
(function () {
  const KK = window.KK;
  // name styles: f = first names, l = last names, a/b = town parts, c = club patterns
  const S = {
    en: { f: 'Jack Harry Oliver Callum Liam Ryan Connor Jamie Tom Ben Lewis Owen Kieran Danny Sam Alfie Reece', l: 'Ashby Barlow Carver Denton Elwood Fenwick Garside Hollis Ingham Jessop Kirkby Lowther Medlock Norland Oakes Pemberton Radley Selby Thorne Wardle', a: 'Ash Brack Cold Elm Fen Gras Hart Kings Lang Mar North Red Stan Thorn West Wick Bram Holm Oak Lark', b: 'ford ley ton bury wick field mouth gate by ham well moor brook stead combe', c: '{T} Rovers|{T} Athletic|{T} Town|{T} United|{T} Albion|{T} Wanderers|{T} City|{T} Harriers|{T} Borough|AFC {T}' },
    sco: { f: 'Ewan Callum Fraser Ross Angus Euan Craig Lachlan Stuart Murray Hamish Blair', l: 'McFadyen Galbraith Rennie Moncrieff Baird Dunlop Laidlaw Carnegie Imrie Sinclair Gilmour Ogilvie', a: 'Kil Glen Dun Inver Strath Bal Auch Craig Loch Ard', b: 'more burn kirk ton muir haven brae shiels lochy carron', c: '{T} Thistle|{T} Athletic|{T} Rovers|{T} Academicals|{T} FC|{T} Albion|Royal {T}|{T} Swifts' },
    ie: { f: 'Cian Darragh Eoin Ronan Seamus Padraig Niall Conor Fionn Oisin Cathal', l: 'Brennan Doyle Kavanagh Mulcahy Quigley Tierney Dunne Hegarty Lynch Keane Moran Flood', a: 'Bally Kil Clon Drum Ross Carrig Glen Ard Lis Knock', b: 'more beg na lough ard keen derry cullen rath ane', c: '{T} Rovers|{T} Town|{T} United|{T} Athletic|St {T}|{T} Harps|{T} Wanderers' },
    cy: { f: 'Rhys Dafydd Gethin Iwan Owain Emyr Cai Osian Ifan Tomos', l: 'Pryce Bevan Howells Llewellyn Morgan Rees Vaughan Prosser Gwilym Parry', a: 'Llan Aber Pen Cwm Tre Caer Pont Bryn', b: 'dovey gwyn fach mawr wen ithon teg rhos', c: '{T} Town|{T} FC|{T} Athletic|{T} Rovers|CPD {T}' },
    es: { f: 'Alejandro Pablo Sergio Diego Javier Álvaro Iker Raúl Adrián Mario Hugo Marcos Unai Rubén', l: 'Castañeda Robledo Villalba Montero Quintana Ferrán Galindo Salcedo Arroyo Benítez Ortega Navas Peralta Ibarra', a: 'Val Mon San Al Cas Villa Torre Puer Sier Ribe Fuen Peña', b: 'dera tejo cerro mira llosa verde nueva alta rrubia blanca sol mar', c: 'CD {T}|UD {T}|Atlético {T}|{T} CF|SD {T}|Racing {T}|Deportivo {T}|Real {T}|CF {T}' },
    it: { f: 'Lorenzo Matteo Andrea Davide Simone Federico Riccardo Giacomo Luca Tommaso Edoardo Pietro', l: 'Bellandi Castaldo Fiorelli Gallucci Marchetti Pellegrini Ruggiero Santoro Tedeschi Vitale Zanardi Moretti Ferraro Esposti', a: 'Monte Castel Valle Borgo Rocca Lago Villa Pietra Terra Colle', b: 'fiore nero verde alto mare luce bella rosa santo lungo', c: 'AC {T}|{T} Calcio|US {T}|Virtus {T}|Sporting {T}|Atletico {T}|Pro {T}|FC {T}|SS {T}' },
    de: { f: 'Lukas Jonas Felix Leon Maximilian Paul Niklas Tim Jannik Moritz Fabian Florian Jakob', l: 'Ackermann Baumgart Dreesen Eckhardt Frenzel Gutmann Hartwig Kahlert Lorenz Mahler Pohlmann Reinholt Steiger Vogt Winkler', a: 'Ober Unter Alt Neu Grün Stein Wald Berg Hoch Rot Linden Eich Rosen', b: 'hausen burg feld dorf bach heim stadt tal au brück ingen', c: 'FC {T}|SV {T}|TSV {T}|VfB {T}|SC {T}|Eintracht {T}|SpVgg {T}|Rot-Weiß {T}|Fortuna {T}|VfL {T}' },
    fr: { f: 'Lucas Hugo Théo Mathis Enzo Nathan Louis Clément Maxime Antoine Quentin Bastien Yanis', l: 'Ardouin Beaulieu Chauvet Delmas Fontaine Garnier Lacombe Marchal Perrin Rousseau Thibault Vasseur Brunet Morel', a: 'Mont Beau Ville Belle Clair Roche Font Haut Bois Val', b: 'val mont fort bourg ville lac champ pré rivage ronce', c: 'FC {T}|Olympique {T}|AS {T}|Stade {T}|Racing {T}|US {T}|SC {T}|AJ {T}|En Avant {T}' },
    pt: { f: 'João Tiago Rodrigo Diogo Gonçalo Rúben Duarte Afonso Miguel Rafael Vasco', l: 'Carvalho Mendonça Ferraz Pimentel Sobral Teixeira Valente Barros Antunes Coelho Lourenço Quintela', a: 'Vila_ Vale_ São_ Castelo_ Ribeira_ Monte_ Fonte_ Praia_', b: 'Alva Serra Mar Verde Lobos Pinhal Novo Rio Sardinha Areia', c: 'SC {T}|CD {T}|Académico {T}|União {T}|GD {T}|FC {T}|Sporting {T}|Atlético {T}' },
    nl: { f: 'Daan Sem Luuk Bram Thijs Jesse Milan Ruben Stijn Joost Wout Jens Pieter', l: 'Brouwer Hoekstra Kuipers Molenaar Postma Rietveld Smeets Terpstra Verbeek Wouters de Groot van Aalst Peeters Claes', a: 'Zuid Noord Oost West Hoog Leeuw Molen Dijk Brug Veld Zand', b: 'wijk dam hoven dorp veen burg sloot horst kerke loo', c: 'FC {T}|{T} Boys|SV {T}|VV {T}|{T} Vooruit|SC {T}|Racing {T}|KV {T}' },
    tr: { f: 'Emre Burak Kaan Mert Can Efe Arda Onur Yusuf Barış Serkan Oğuz Deniz', l: 'Aksoy Kaya Demirtaş Yalçın Korkmaz Erdem Çelikkol Bozkurt Tunç Sarıgül Karaca Akın', a: 'Kara Ak Yeşil Deniz Dağ Gül Kum Altın Yıldız Ayva Çam', b: 'köy tepe dere ova kent pınar kaya lı yaka bahçe', c: '{T}spor|{T} SK|{T} Gençlik|{T} Belediyespor|{T} İdman Yurdu|{T} FK' },
    no: { f: 'Erik Lars Magnus Henrik Jonas Anders Mikkel Oskar Emil Sindre Viktor Rasmus Gunnar', l: 'Lindqvist Haugland Brekke Sandvik Nyström Holmberg Strand Dahl Ekdahl Solberg Berglund Aasen Jakobsen', a: 'Björk Sjö Fjell Strand Vik Lund Ek Ås Holm Skog Ny Hav', b: 'by vik sund dal berg holm näs stad fjord eid', c: '{T} IF|{T} BK|IK {T}|{T} FF|{T} SK|{T} IL|FC {T}|{T} Boldklub' },
    fi: { f: 'Eero Aleksi Juho Lauri Ville Mikko Onni Joona Teemu Arttu', l: 'Rantala Salminen Niemi Lehto Kallio Saarinen Heikkilä Koskinen Mäkelä Hiltunen', a: 'Kivi Järvi Koivu Mänty Tuuli Kuusi Lumi', b: 'koski lahti salo vaara niemi järvi mäki', c: 'FC {T}|{T} PS|{T} PK|{T} IK|{T} JK' },
    pl: { f: 'Kacper Jakub Mateusz Bartosz Szymon Filip Wiktor Kamil Dawid Piotr Michał', l: 'Majewski Sobczak Jabłoński Pawlak Wilczek Głowacki Kaczmarek Urbański Sikora Dudek Baran Wójcicki', a: 'Nowa_ Stara_ Biel Zlot Grab Dęb Kamien Lip Bor Wilk', b: 'owo ice ina ówek sko any gród niki', c: 'KS {T}|Unia {T}|{T} Sport|MKS {T}|GKS {T}|Stal {T}|Polonia {T}' },
    slav: { f: 'Luka Marko Ivan Petar Nikola Filip Matej Tomáš Ondřej Stefan Aleksandar Dejan Milan Josip Martin', l: 'Krejčí Hrubý Benko Mlinar Radić Tomić Stanković Lazić Pavlov Georgiev Petrović Jurić Babić Marković Dvořák', a: 'Nova_ Bela_ Zlat Gor Dobr Kamen Velik Lip Bor Sned Topol', b: 'ovo ica ina ovec sko any grad ice ec ište', c: 'FK {T}|NK {T}|SK {T}|MFK {T}|{T} Sport|HNK {T}|FC {T}|PFC {T}|OFK {T}' },
    east: { f: 'Dmytro Oleksandr Andriy Maksym Artem Bohdan Yegor Kirill Nikita Ruslan Timur Arman Pavel', l: 'Hrytsenko Tkachuk Moroz Lysenko Savchenko Orlov Volkov Sokolov Belov Nurlanov Zhaksybekov Petrenko Kuzmin', a: 'Dniv Zor Vol Step Bilo Kras Sosn Yar Kara Ak Lesn', b: 'ivka ograd ovsk yansk tau ozero opil sk ino', c: 'FC {T}|{T} FK|FK {T}|{T} SC|PFC {T}' },
    cauc: { f: 'Giorgi Levan Davit Nika Lasha Aram Tigran Narek Rashad Elvin Kamran Zurab', l: 'Beridze Kapanadze Lomidze Gelashvili Hakobyan Sargsyan Mammadli Aliyev Ghazaryan Tsiklauri Huseynli', a: 'Tsk Mtsk Ara Shir Nor Kura Shak Lank Gor', b: 'aleti vani abad shen ashat eti ovan uri', c: 'FC {T}|{T} FK|FK {T}|{T} SC' },
    gr: { f: 'Giorgos Nikos Kostas Dimitris Yannis Panagiotis Christos Vasilis Stelios Andreas Marios', l: 'Papadakis Kyriakou Antoniou Georgiou Stavrou Charalambous Dimitriou Konstantinou Andreou Michailidis Lazarou', a: 'Agia_ Neo_ Ano_ Kato_ Palaio', b: 'Kastro Chori Nisi Limni Polis Vrysi Platanos Elaia', c: 'AO {T}|AE {T}|PAE {T}|{T} FC|Ethnikos {T}|Doxa {T}' },
    hu: { f: 'Bence Máté Levente Dániel Ádám Balázs Gergő Zsolt Krisztián Márk', l: 'Nagy Szabó Tóth Farkas Balogh Papp Takács Juhász Mészáros Oláh', a: 'Bala Szent Kis Nagy Fehér Vár Tó Kő Rét', b: 'falva háza vár hegy telek szeg halom', c: '{T} FC|{T} SE|{T} TE|{T} AC|{T} Vasutas' },
    ro: { f: 'Andrei Alexandru Mihai Ionuț Răzvan Cristian Vlad Bogdan Florin Sorin', l: 'Dumitrescu Stănescu Munteanu Constantin Moldovan Cojocaru Lungu Ardeleanu Neagu Toma', a: 'Valea_ Câmpu_ Piatra_ Târgu_ Dealu_ Fântâna_', b: 'Mare Nouă Verde Lungă Albă Rece Morii', c: 'CS {T}|FC {T}|ACS {T}|Unirea {T}|CSM {T}|Sportul {T}' },
    baltic: { f: 'Mantas Darius Andris Jānis Kaspar Siim Marten Tomas Rokas Kristaps', l: 'Bērziņš Kalniņš Jankauskas Petrauskas Tamm Saar Kask Ozols Vaitkus Lepp', a: 'Kalna Jūr Ezer Mets Rand Puu Sil Kuld Linn Žal', b: 'ciems pils vere küla iai ėnai mäe ava', c: 'FK {T}|JK {T}|FC {T}|{T} FK|SK {T}' },
    alb: { f: 'Arbër Erion Klevis Ardit Besnik Endrit Florian Dren Gentian Lirim', l: 'Hoxha Krasniqi Berisha Gashi Shala Kelmendi Dervishi Mema Lika Xhafa', a: 'Kal Mal Fush Bregu Lum Gur Qaf Vrri', b: 'aj ishta ova ari ëza ina eci', c: 'KF {T}|FK {T}|KS {T}|{T} FC' },
    il: { f: 'Itay Omer Yonatan Noam Eitan Amit Ido Roy Tal Lior', l: 'Shapira Mizrahi Ben-David Katz Peretz Avraham Azulay Biton Dahan Golan', a: 'Kfar_ Ramat_ Givat_ Beit_ Ein_ Neve_', b: 'Tamar Oren Shalev Dekel Gefen Yarden Arava Rimon', c: 'FC {T}|Ironi {T}|SC {T}|{T} FC|Bnei {T}' },
    mt: { f: 'Luke Kurt Jean Kyle Matthew Ryan Andrea Zach', l: 'Borg Camilleri Farrugia Zammit Grech Galea Vella Micallef Attard Spiteri', a: 'Ħal_ Wied_ Ta\'_ San_', b: 'Lumen Mellieq Qalbun Żgħira Ramla Għarix', c: '{T} FC|{T} Rangers|{T} United|{T} Stars|{T} Saints' },
  };
  for (const k in S) for (const f of ['f', 'l', 'a', 'b']) S[k][f] = S[k][f].split(' ').map(s => s.replace(/_/g, ' '));
  for (const k in S) S[k].c = S[k].c.split('|');
  KK.NAME_STYLES = S;

  // [code, name, flag, style, top rating, tiers, league brand]
  const C = [
    ['ENG', 'England', 'c:#ffffff,#ce1124', 'en', 84, 3, 'Lionheart League'],
    ['ESP', 'Spain', 'h:#aa151b,#f1bf00,#f1bf00,#aa151b', 'es', 84, 3, 'Liga Sol Dorado'],
    ['ITA', 'Italy', 'v:#009246,#ffffff,#ce2b37', 'it', 82, 3, 'Lega Aurora'],
    ['GER', 'Germany', 'h:#000000,#dd0000,#ffce00', 'de', 82, 3, 'Meisterliga'],
    ['FRA', 'France', 'v:#0055a4,#ffffff,#ef4135', 'fr', 80, 3, 'Ligue Étoile'],
    ['POR', 'Portugal', 'v:#046a38,#046a38,#da291c,#da291c,#da291c', 'pt', 77, 2, 'Liga Atlântica'],
    ['NED', 'Netherlands', 'h:#ae1c28,#ffffff,#21468b', 'nl', 76, 2, 'Tulpen Divisie'],
    ['BEL', 'Belgium', 'v:#000000,#fdda24,#ef3340', 'nl|fr', 74, 2, 'Ardennes Liga'],
    ['TUR', 'Turkey', 'h:#e30a17', 'tr', 73, 2, 'Lale Ligi'],
    ['SCO', 'Scotland', 'x:#005eb8,#ffffff', 'sco', 70, 2, 'Thistle League'],
    ['AUT', 'Austria', 'h:#ed2939,#ffffff,#ed2939', 'de', 68, 2, 'Alpen Liga'],
    ['SUI', 'Switzerland', 'g:#d52b1e,#ffffff', 'de|fr|it', 67, 2, 'Gipfel Liga'],
    ['DEN', 'Denmark', 'n:#c8102e,#ffffff', 'no', 67, 2, 'Kyst Liga'],
    ['GRE', 'Greece', 'h:#0d5eaf,#ffffff,#0d5eaf,#ffffff,#0d5eaf,#ffffff,#0d5eaf,#ffffff,#0d5eaf', 'gr', 66, 2, 'Aigaio League'],
    ['CZE', 'Czechia', 'h:#ffffff,#d7141a|t:#11457e', 'slav', 66, 2, 'Vltava Liga'],
    ['CRO', 'Croatia', 'h:#ff0000,#ffffff,#171796', 'slav', 66, 2, 'Lavanda Liga'],
    ['UKR', 'Ukraine', 'h:#0057b7,#ffd700', 'east', 66, 2, 'Steppe League'],
    ['RUS', 'Russia', 'h:#ffffff,#0039a6,#d52b1e', 'east', 65, 2, 'Taiga League'],
    ['SRB', 'Serbia', 'h:#c6363c,#0c4076,#ffffff', 'slav', 65, 2, 'Morava Liga'],
    ['NOR', 'Norway', 'n2:#ba0c2f,#ffffff,#00205b', 'no', 65, 2, 'Fjord Liga'],
    ['POL', 'Poland', 'h:#ffffff,#dc143c', 'pl', 65, 2, 'Bursztyn Liga'],
    ['SWE', 'Sweden', 'n:#006aa7,#fecc00', 'no', 64, 2, 'Norrsken Liga'],
    ['ISR', 'Israel', 'h:#ffffff,#0038b8,#ffffff,#ffffff,#ffffff,#0038b8,#ffffff', 'il', 63, 2, 'Galil League'],
    ['ROU', 'Romania', 'v:#002b7f,#fcd116,#ce1126', 'ro', 63, 2, 'Carpați Liga'],
    ['CYP', 'Cyprus', 'h:#ffffff,#d57800,#ffffff', 'gr', 62, 2, 'Chalkos League'],
    ['HUN', 'Hungary', 'h:#ce2939,#ffffff,#477050', 'hu', 62, 2, 'Duna Liga'],
    ['SVK', 'Slovakia', 'h:#ffffff,#0b4ea2,#ee1c25', 'slav', 61, 1, 'Tatra Liga'],
    ['BUL', 'Bulgaria', 'h:#ffffff,#00966e,#d62612', 'slav', 60, 1, 'Balkan Rose League'],
    ['FIN', 'Finland', 'n:#ffffff,#002f6c', 'fi', 58, 1, 'Revontuli Liiga'],
    ['KAZ', 'Kazakhstan', 'h:#00afca', 'east', 58, 1, 'Altyn Dala League'],
    ['SVN', 'Slovenia', 'h:#ffffff,#005da4,#ed1c24', 'slav', 58, 1, 'Lipa Liga'],
    ['BIH', 'Bosnia and Herzegovina', 'h:#002395|t:#fecb00', 'slav', 57, 1, 'Neretva Liga'],
    ['AZE', 'Azerbaijan', 'h:#00b5e2,#ef3340,#509e2f', 'cauc', 57, 1, 'Odlar League'],
    ['IRL', 'Republic of Ireland', 'v:#169b62,#ffffff,#ff883e', 'ie', 57, 1, 'Emerald League'],
    ['GEO', 'Georgia', 'c:#ffffff,#ff0000', 'cauc', 56, 1, 'Kavkasioni League'],
    ['ALB', 'Albania', 'h:#e41e20', 'alb', 55, 1, 'Ilir League'],
    ['ISL', 'Iceland', 'n2:#02529c,#ffffff,#dc1e35', 'no', 55, 1, 'Eldfjall League'],
    ['MNE', 'Montenegro', 'h:#c40308', 'slav', 55, 1, 'Adria Coast League'],
    ['BLR', 'Belarus', 'h:#c8313e,#c8313e,#4aa657', 'east', 55, 1, 'Belavezha League'],
    ['MKD', 'North Macedonia', 'h:#d20000,#ffe600,#d20000', 'slav', 54, 1, 'Ohrid Pearl League'],
    ['ARM', 'Armenia', 'h:#d90012,#0033a0,#f2a800', 'cauc', 54, 1, 'Apricot League'],
    ['NIR', 'Northern Ireland', 'c:#ffffff,#c8102e', 'ie', 54, 1, 'Causeway League'],
    ['WAL', 'Wales', 'h:#ffffff,#00b140', 'cy', 54, 1, 'Draig League'],
    ['LTU', 'Lithuania', 'h:#fdb913,#006a44,#c1272d', 'baltic', 53, 1, 'Gintaras League'],
    ['KOS', 'Kosovo', 'h:#244aa5', 'alb', 52, 1, 'Dardan Liga'],
    ['LVA', 'Latvia', 'h:#9e3039,#9e3039,#ffffff,#9e3039,#9e3039', 'baltic', 52, 1, 'Baltic Pine League'],
    ['MDA', 'Moldova', 'v:#0046ae,#ffd200,#cc092f', 'ro', 52, 1, 'Nistru League'],
    ['EST', 'Estonia', 'h:#0072ce,#000000,#ffffff', 'baltic', 51, 1, 'Põhjala League'],
    ['LUX', 'Luxembourg', 'h:#ed2939,#ffffff,#00a1de', 'fr|de', 50, 1, 'Grand Duchy League'],
    ['MLT', 'Malta', 'v:#ffffff,#cf142b', 'mt', 49, 1, 'Island League'],
    ['FRO', 'Faroe Islands', 'n2:#ffffff,#0065bd,#ef303e', 'no', 48, 1, 'Oyggjar League'],
    ['AND', 'Andorra', 'v:#10069f,#fedd00,#d50032', 'es|fr', 46, 1, 'Pyrenees League'],
    ['LIE', 'Liechtenstein', 'h:#002b7f,#ce1126', 'de', 46, 1, 'Rhine Valley League'],
    ['SMR', 'San Marino', 'h:#ffffff,#5eb6e4', 'it', 45, 1, 'Titano League'],
    ['GIB', 'Gibraltar', 'h:#ffffff,#ffffff,#da000c', 'en', 45, 1, 'Rock League'],
  ];
  KK.COUNTRIES = C.map(([code, name, flag, style, top, tiers, brand]) => ({ code, name, flag, style, top, tiers, brand }));
  KK.country = code => KK.COUNTRIES.find(c => c.code === code);
  KK.tierName = (c, tier) => c.brand + (tier === 1 ? '' : tier === 2 ? ' II' : ' III');
  KK.tierBase = (c, tier) => c.top - (tier - 1) * 7;

  // simple stripe flag as inline SVG
  KK.flagSVG = function (spec, w = 30, h = 20) {
    const [main, tri] = spec.split('|'); const [type, cols] = main.split(':'); const c = cols.split(',');
    let s = '';
    if (type === 'h') c.forEach((col, i) => s += `<rect x="0" y="${i * 60 / c.length}" width="90" height="${60 / c.length + 0.5}" fill="${col}"/>`);
    else if (type === 'v') c.forEach((col, i) => s += `<rect x="${i * 90 / c.length}" y="0" width="${90 / c.length + 0.5}" height="60" fill="${col}"/>`);
    else if (type === 'c') s = `<rect width="90" height="60" fill="${c[0]}"/><rect x="38" width="14" height="60" fill="${c[1]}"/><rect y="23" width="90" height="14" fill="${c[1]}"/>`;
    else if (type === 'g') s = `<rect width="90" height="60" fill="${c[0]}"/><rect x="39" y="12" width="12" height="36" fill="${c[1]}"/><rect x="27" y="24" width="36" height="12" fill="${c[1]}"/>`;
    else if (type === 'x') s = `<rect width="90" height="60" fill="${c[0]}"/><path d="M0 0 L90 60 M90 0 L0 60" stroke="${c[1]}" stroke-width="11"/>`;
    else if (type === 'n') s = `<rect width="90" height="60" fill="${c[0]}"/><rect x="26" width="12" height="60" fill="${c[1]}"/><rect y="24" width="90" height="12" fill="${c[1]}"/>`;
    else if (type === 'n2') s = `<rect width="90" height="60" fill="${c[0]}"/><rect x="23" width="18" height="60" fill="${c[1]}"/><rect y="21" width="90" height="18" fill="${c[1]}"/><rect x="27" width="10" height="60" fill="${c[2]}"/><rect y="25" width="90" height="10" fill="${c[2]}"/>`;
    if (tri) s += `<path d="M0 0 L40 30 L0 60Z" fill="${tri.split(':')[1]}"/>`;
    return `<svg class="flag" viewBox="0 0 90 60" width="${w}" height="${h}" preserveAspectRatio="none">${s}</svg>`;
  };
  KK.GHANA_FLAG = 'h:#ce1126,#fcd116,#006b3f';

  // ---------- names ----------
  const pk = (r, a) => a[Math.floor(r() * a.length)];
  KK.styleName = function (r, st) { const s = S[st] || S.en; return pk(r, s.f) + ' ' + pk(r, s.l); };
  KK.townName = function (r, st) {
    const s = S[st] || S.en; const a = pk(r, s.a), b = pk(r, s.b);
    if (a.endsWith(' ')) return a + b;
    const t = a + b.toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const STYLE_KEYS = Object.keys(S);
  // player name for a nationality style spec like 'nl|fr' ('gh' keeps the Ghana mix)
  KK.natName = function (r, spec) {
    KK._nat = 'gh';
    if (!spec || spec === 'gh') return KK.genName(r);
    const x = r(), styles = spec.split('|');
    if (x < 0.74) { const st = pk(r, styles); KK._nat = st; return KK.styleName(r, st); }
    if (x < 0.84) return KK.genName(r);
    const st = pk(r, STYLE_KEYS); KK._nat = st; return KK.styleName(r, st);
  };

  // ---------- clubs (deterministic per country and tier) ----------
  const PALETTE = ['#c62828', '#1565c0', '#2e7d32', '#f9a825', '#ef6c00', '#6a1b9a', '#00838f', '#111111', '#ffffff', '#4e342e', '#ad1457', '#283593', '#9e9d24', '#00695c', '#b71c1c', '#0d47a1', '#558b2f', '#ff8f00', '#37474f', '#880e4f'];
  const cache = {};
  KK.leagueClubs = function (code, tier) {
    const key = code + tier; if (cache[key]) return cache[key];
    const c = KK.country(code), r = KK.seeded('club' + key), base = KK.tierBase(c, tier), used = new Set(), styles = c.style.split('|'), list = [];
    for (let i = 0; i < 8; i++) {
      let name = '';
      for (let k = 0; k < 40; k++) { const st = pk(r, styles); name = pk(r, S[st].c).replace('{T}', KK.townName(r, st)); if (!used.has(name)) break; }
      used.add(name);
      const c1 = pk(r, PALETTE); let c2 = pk(r, PALETTE); if (c2 === c1 || KK.colorDist(c1, c2) < 90) c2 = KK.colorDist(c1, '#ffffff') < 200 ? '#111111' : '#ffffff';
      list.push({ id: key + '_' + i, name, c1, c2, rating: Math.round(base + 6 - i * 1.6 + (r() * 3 - 1.5)), form: pk(r, Object.keys(KK.FORMATIONS)), style: c.style, country: code });
    }
    list.forEach(t => t.short = KK.shortName(t.name.replace(/^(FC|SV|TSV|VfB|VfL|SC|SpVgg|AC|US|AS|CD|UD|SD|CF|SS|KS|MKS|GKS|FK|NK|SK|MFK|HNK|PFC|OFK|KF|JK|AO|AE|PAE|CS|ACS|CSM|GD|IK|KV|VV|AFC|AJ|CPD|St|Real|Royal|Stade|Racing|Olympique|Atlético|Atletico|Deportivo|Sporting|Académico|União|Unirea|Unia|Stal|Polonia|Eintracht|Fortuna|Virtus|Pro|Ironi|Bnei|Ethnikos|Doxa|Sportul|En Avant|Rot-Weiß)\s+/, ''), list.filter(x => x.short)));
    return (cache[key] = list);
  };
  KK.allLeagues = () => KK.COUNTRIES.flatMap(c => Array.from({ length: c.tiers }, (_, i) => ({ code: c.code, tier: i + 1, name: KK.tierName(c, i + 1), country: c })));

  // ---------- continental cups ----------
  KK.CUPS = {
    crown: { name: 'Continental Crown Cup', short: 'Crown Cup', icon: '👑', win: 700, draw: 300, prize: 10000, runner: 4000 },
    shield: { name: 'Continental Shield', short: 'Shield', icon: '🛡️', win: 400, draw: 180, prize: 5000, runner: 2000 },
  };
  KK.CUP_DUE = [1, 2, 4, 5, 7, 8, 10, 12, 13]; // league round after which each cup matchday opens
  KK.CUP_STAGE = ['Group MD1', 'Group MD2', 'Group MD3', 'Group MD4', 'Group MD5', 'Group MD6', 'Quarter-final', 'Semi-final', 'Final'];

  function cupPools(year) {
    const r = KK.seeded('cups' + year);
    const pool = KK.COUNTRIES.flatMap(c => KK.leagueClubs(c.code, 1).map(t => ({ t, s: t.rating + r() * 6 }))).sort((a, b) => b.s - a.s);
    const crown = [], shield = [], cnt = {}, cnt2 = {};
    for (const { t } of pool) {
      if (crown.length < 16 && (cnt[t.country] || 0) < 4) { crown.push(t); cnt[t.country] = (cnt[t.country] || 0) + 1; continue; }
      if (shield.length < 16 && !crown.includes(t) && (cnt2[t.country] || 0) < 3) { shield.push(t); cnt2[t.country] = (cnt2[t.country] || 0) + 1; }
      if (crown.length >= 16 && shield.length >= 16) break;
    }
    return { crown, shield };
  }
  KK.makeCups = function (save, year) {
    const pools = cupPools(year), q = save.cupQual || null, out = {};
    for (const kind of ['crown', 'shield']) {
      let teams = pools[kind].map(t => ({ ...t }));
      if (q === kind) {
        const me = { id: 'ME', name: save.team.name, short: save.team.short, c1: save.team.crest.c1, c2: save.team.crest.c2, country: save.career && save.career.country || 'GHA' };
        teams = teams.filter(t => t.id !== 'ME'); teams.sort((a, b) => b.rating - a.rating); teams[teams.length - 1] = me;
      }
      const r = KK.seeded(kind + year), ids = teams.map(t => t.id).sort(() => r() - 0.5);
      const groups = [0, 1, 2, 3].map(g => ids.slice(g * 4, g * 4 + 4));
      const gfix = [[], [], [], [], [], []];
      groups.forEach((g, gi) => KK.makeFixtures(g).forEach((rd, ri) => rd.forEach(f => gfix[ri].push({ ...f, g: gi }))));
      out[kind] = { kind, name: KK.CUPS[kind].name, year, teams, groups, gfix, ko: [], md: 0, winner: null, runner: null, userIn: q === kind, userOut: false };
    }
    save.cupQual = null;
    save.cups = out;
  };
  KK.cupTeam = (cup, id) => cup.teams.find(t => t.id === id);
  KK.cupFixtures = (cup, md) => md < 6 ? cup.gfix[md] : (cup.ko[md - 6] || []);
  KK.groupTable = function (cup, g) {
    const rows = {}; cup.groups[g].forEach(id => { const t = KK.cupTeam(cup, id); rows[id] = { id, name: t.name, short: t.short, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 }; });
    cup.gfix.forEach(rd => rd.forEach(f => { if (f.g !== g || f.hs == null) return; const h = rows[f.h], a = rows[f.a]; h.P++; a.P++; h.GF += f.hs; h.GA += f.as; a.GF += f.as; a.GA += f.hs; if (f.hs > f.as) { h.W++; a.L++; h.Pts += 3; } else if (f.hs < f.as) { a.W++; h.L++; a.Pts += 3; } else { h.D++; a.D++; h.Pts++; a.Pts++; } }));
    return Object.values(rows).sort((x, y) => y.Pts - x.Pts || (y.GF - y.GA) - (x.GF - x.GA) || y.GF - x.GF || x.name.localeCompare(y.name));
  };
  const cupRating = (save, cup, id) => id === 'ME' ? KK.myRating(save) : KK.cupTeam(cup, id).rating;
  KK.cupUserFixture = function (save, cup) {
    if (!cup || !cup.userIn || cup.userOut || cup.md > 8) return null;
    return KK.cupFixtures(cup, cup.md).find(f => f.h === 'ME' || f.a === 'ME') || null;
  };
  KK.cupDue = (save, cup) => cup && cup.md <= 8 && save.season.round >= KK.CUP_DUE[cup.md];
  function koWinner(save, cup, f) {
    if (f.hs > f.as) return f.h; if (f.as > f.hs) return f.a;
    const rh = cupRating(save, cup, f.h), ra = cupRating(save, cup, f.a);
    f.pen = Math.random() < 0.5 + (rh - ra) / 60 ? 'h' : 'a'; return f.pen === 'h' ? f.h : f.a;
  }
  // play every fixture of the current matchday (user's from result if given). Returns user reward info.
  KK.cupPlayMd = function (save, cup, userRes) {
    const list = KK.cupFixtures(cup, cup.md), info = { coins: 0, res: null, msg: '' }, def = KK.CUPS[cup.kind];
    for (const f of list) {
      if (f.hs != null) continue;
      const mine = f.h === 'ME' || f.a === 'ME';
      if (mine && userRes) { const home = f.h === 'ME'; f.hs = home ? userRes.my : userRes.op; f.as = home ? userRes.op : userRes.my; }
      else { const [a, b] = KK.simScore(cupRating(save, cup, f.h) + (cup.md === 8 ? 0 : 1.5), cupRating(save, cup, f.a)); f.hs = a; f.as = b; }
      if (mine) {
        const home = f.h === 'ME', my = home ? f.hs : f.as, op = home ? f.as : f.hs;
        let res = my > op ? 'W' : my < op ? 'L' : 'D';
        if (cup.md >= 6 && res === 'D') { const w = koWinner(save, cup, f); res = w === 'ME' ? 'W' : 'L'; info.pens = true; }
        info.res = res; info.coins += (res === 'W' ? def.win : res === 'D' ? def.draw : 80) + my * 40;
        const opp = KK.cupTeam(cup, home ? f.a : f.h); info.opp = opp.name; info.my = my; info.op = op;
        save.history = (save.history || []).concat([{ y: save.season.year, d: save.season.div, opp: opp.name, my, op, res: my > op ? 'W' : my < op ? 'L' : 'D', cup: cup.kind }]).slice(-30);
      }
    }
    // advance
    const md = cup.md; cup.md++;
    if (md === 5) {
      const t = [0, 1, 2, 3].map(g => KK.groupTable(cup, g));
      cup.ko[0] = [[0, 1], [1, 0], [2, 3], [3, 2]].map(([a, b]) => ({ h: t[a][0].id, a: t[b][1].id, hs: null, as: null }));
      if (cup.userIn && !cup.ko[0].some(f => f.h === 'ME' || f.a === 'ME')) { cup.userOut = true; info.msg = `Out at the group stage of the ${cup.name}.`; }
      else if (cup.userIn) info.msg = `Through to the ${cup.name} quarter-finals!`;
    } else if (md >= 6) {
      const winners = cup.ko[md - 6].map(f => koWinner(save, cup, f));
      if (cup.userIn && !cup.userOut && !winners.includes('ME') && cup.ko[md - 6].some(f => f.h === 'ME' || f.a === 'ME')) { cup.userOut = true; info.msg = md === 8 ? `Runners-up in the ${cup.name}.` : `Knocked out of the ${cup.name}.`; }
      if (md < 8) { cup.ko[md - 5] = []; for (let i = 0; i < winners.length; i += 2) cup.ko[md - 5].push({ h: winners[i], a: winners[i + 1], hs: null, as: null }); if (cup.userIn && winners.includes('ME')) info.msg = md === 6 ? `Into the ${cup.name} semi-finals!` : `Into the ${cup.name} FINAL!`; }
      else {
        const f = cup.ko[2][0]; cup.winner = winners[0]; cup.runner = cup.winner === f.h ? f.a : f.h;
        if (cup.winner === 'ME') { info.coins += def.prize; info.msg = `🏆 WINNERS of the ${cup.name}! +${def.prize} prize`; save.trophies = (save.trophies || []).concat([{ y: cup.year, name: cup.name, cup: cup.kind }]); info.trophy = true; }
        else if (cup.runner === 'ME') { info.coins += def.runner; info.msg += ` +${def.runner} prize`; }
      }
    }
    save.coins += info.coins;
    return info;
  };
  // play all matchdays that are due and don't need the user
  KK.cupAutoAdvance = function (save, force) {
    const msgs = [];
    for (const kind of ['crown', 'shield']) {
      const cup = save.cups && save.cups[kind]; if (!cup) continue;
      while (cup.md <= 8 && (force || KK.cupDue(save, cup)) && (force || !KK.cupUserFixture(save, cup))) { const i = KK.cupPlayMd(save, cup); if (i.msg) msgs.push(i.msg); }
    }
    return msgs;
  };
  // qualification from the final table of a top tier
  KK.cupQualify = function (save, pos) {
    const s = save.season; if (s.div !== 1) return null;
    const base = KK.leagueBase(save, 1), crownSlots = base >= 80 ? 4 : base >= 73 ? 2 : 1;
    if (pos <= crownSlots) return 'crown';
    if (pos <= crownSlots + 2) return 'shield';
    return null;
  };
})();
