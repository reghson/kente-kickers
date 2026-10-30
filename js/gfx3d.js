/* Kente Kickers — 3D match renderer (three.js r180, vendored, MIT).
   Pure view layer: reads the 2D simulation state from KK.Match each frame and draws it in 3D.
   Sim coords: x 0..105 (length), y 0..68 (width). Three coords: X = x - 52.5, Z = y - 34, Y up. */
import * as THREE from './vendor/three.module.min.js';

const L = 105, W = 68, CY = 34, GH = 3.66, GHT = 2.44, HL = L / 2;
const PS = 1.2; // player model scale (slightly larger than life for readability on phones)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const angLerp = (a, b, k) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  return t;
}
function lum(hex) { const c = new THREE.Color(hex); return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; }

export function create(canvas, opts = {}) {
  const high = opts.quality === 'high';
  // probe first so we fail fast (caller falls back to 2D)
  const probe = canvas.getContext('webgl2', { antialias: high }) || canvas.getContext('webgl', { antialias: high });
  if (!probe) throw new Error('WebGL unavailable');
  const renderer = new THREE.WebGLRenderer({ canvas, context: probe, antialias: high, powerPreference: 'high-performance' });
  const maxPR = high ? 1.5 : 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPR));
  renderer.shadowMap.enabled = high; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const aniso = high ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;

  const scene = new THREE.Scene();
  const sky = new THREE.Color('#8fbfe6'); scene.background = sky; scene.fog = new THREE.Fog(sky, 140, 300);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 450);
  const disposables = [];
  const keep = (o) => { disposables.push(o); return o; };

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight('#eaf4ff', '#3d5c2c', 1.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff6e8', 2.4); sun.position.set(-25, 50, 20); scene.add(sun); scene.add(sun.target);
  if (high) {
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28; sc.near = 1; sc.far = 140;
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
  }

  // ---------- ground + pitch ----------
  const MARGIN = 5, TW = high ? 2048 : 1024, PW = L + MARGIN * 2, PH = W + MARGIN * 2, TH = Math.round(TW * PH / PW);
  const pitchTex = keep(canvasTex(TW, TH, (g, w, h) => {
    const k = w / PW; g.scale(k, k); g.translate(MARGIN, MARGIN);
    g.fillStyle = '#2f7a33'; g.fillRect(-MARGIN, -MARGIN, PW, PH);
    for (let i = 0; i < 18; i++) { g.fillStyle = i % 2 ? '#2f8236' : '#38913c'; g.fillRect(i * L / 18, 0, L / 18 + 0.02, W); }
    // subtle noise
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},0.035)`; g.fillRect(Math.random() * PW - MARGIN, Math.random() * PH - MARGIN, 0.6, 0.6); }
    g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 0.14;
    g.strokeRect(0, 0, L, W); g.beginPath(); g.moveTo(HL, 0); g.lineTo(HL, W); g.stroke();
    g.beginPath(); g.arc(HL, CY, 9.15, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(HL, CY, 0.22, 0, 7); g.fill();
    [[0, 1], [L, -1]].forEach(([x, d]) => {
      g.strokeRect(Math.min(x, x + d * 16.5), CY - 20.16, 16.5, 40.32);
      g.strokeRect(Math.min(x, x + d * 5.5), CY - 9.16, 5.5, 18.32);
      g.beginPath(); g.arc(x + d * 11, CY, 9.15, d > 0 ? -0.93 : Math.PI - 0.93, d > 0 ? 0.93 : Math.PI + 0.93); g.stroke();
      g.beginPath(); g.arc(x + d * 11, CY, 0.2, 0, 7); g.fill();
    });
    [[0, 0, 0], [L, 0, Math.PI / 2], [L, W, Math.PI], [0, W, -Math.PI / 2]].forEach(([x, y, a]) => { g.beginPath(); g.arc(x, y, 1, a, a + Math.PI / 2); g.stroke(); });
  }));
  pitchTex.anisotropy = aniso;
  const pitch = new THREE.Mesh(keep(new THREE.PlaneGeometry(PW, PH)), keep(new THREE.MeshLambertMaterial({ map: pitchTex })));
  pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = high; scene.add(pitch);
  const outer = new THREE.Mesh(keep(new THREE.PlaneGeometry(220, 170)), keep(new THREE.MeshLambertMaterial({ color: '#2a5a2c' })));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; scene.add(outer);
  // running track / concourse ring
  const track = new THREE.Mesh(keep(new THREE.PlaneGeometry(PW + 10, PH + 10)), keep(new THREE.MeshLambertMaterial({ color: '#7b4a33' })));
  track.rotation.x = -Math.PI / 2; track.position.y = -0.01; scene.add(track);

  // ---------- goals ----------
  const postMat = keep(new THREE.MeshLambertMaterial({ color: '#ffffff' }));
  const netTex = keep(canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 16); g.lineTo(w, i * 16); g.stroke(); } }, { repeat: [1, 1] }));
  const postGeo = keep(new THREE.CylinderGeometry(0.07, 0.07, 1, 8));
  const DEPTH = 2.2;
  function netMat(rx, ry) { const t = netTex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); keep(t); return keep(new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85 })); }
  [0, L].forEach((gx) => {
    const d = gx === 0 ? -1 : 1, grp = new THREE.Group(); grp.position.set(gx - HL, 0, 0);
    const bar = (len, x, y, z, rot) => { const m = new THREE.Mesh(postGeo, postMat); m.scale.y = len; m.position.set(x, y, z); if (rot === 'z') m.rotation.x = Math.PI / 2; if (rot === 'x') m.rotation.z = Math.PI / 2; m.castShadow = high; grp.add(m); };
    bar(GHT, 0, GHT / 2, -GH); bar(GHT, 0, GHT / 2, GH); bar(GH * 2, 0, GHT, 0, 'z');
    bar(GHT, d * DEPTH, GHT / 2, -GH); bar(GHT, d * DEPTH, GHT / 2, GH); bar(GH * 2, d * DEPTH, GHT, 0, 'z');
    bar(DEPTH, d * DEPTH / 2, GHT, -GH, 'x'); bar(DEPTH, d * DEPTH / 2, GHT, GH, 'x');
    const back = new THREE.Mesh(keep(new THREE.PlaneGeometry(GH * 2, GHT)), netMat(10, 3.4)); back.position.set(d * DEPTH, GHT / 2, 0); back.rotation.y = Math.PI / 2; grp.add(back);
    const top = new THREE.Mesh(keep(new THREE.PlaneGeometry(DEPTH, GH * 2)), netMat(3, 10)); top.position.set(d * DEPTH / 2, GHT, 0); top.rotation.x = Math.PI / 2; grp.add(top);
    [-GH, GH].forEach((z) => { const s = new THREE.Mesh(keep(new THREE.PlaneGeometry(DEPTH, GHT)), netMat(3, 3.4)); s.position.set(d * DEPTH / 2, GHT / 2, z); grp.add(s); });
    scene.add(grp);
  });

  // ---------- stands with crowd ----------
  const crowdTex = keep(canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#39404d'; g.fillRect(0, 0, w, h);
    const cols = ['#e53935', '#fdd835', '#43a047', '#ffffff', '#1e88e5', '#fb8c00', '#8e24aa', '#212121', '#ce1126'];
    for (let r = 0; r < 8; r++) { g.fillStyle = '#2b313b'; g.fillRect(0, r * 16 + 12, w, 4); for (let i = 0; i < 32; i++) { g.fillStyle = cols[(i * 7 + r * 3 + (i * r) % 5) % cols.length]; g.fillRect(i * 8 + 1, r * 16 + 3 + ((i + r) % 2), 6, 7); g.fillStyle = '#c68a5a'; g.fillRect(i * 8 + 2, r * 16 + 0 + ((i + r) % 2), 4, 3); } }
  }, { repeat: [1, 1] }));
  const standMatFor = (len) => { const t = crowdTex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / 14, 2.2); keep(t); return keep(new THREE.MeshLambertMaterial({ map: t })); };
  const roofMat = keep(new THREE.MeshLambertMaterial({ color: '#d7dde5' }));
  const wallMat = keep(new THREE.MeshLambertMaterial({ color: '#545b68' }));
  function stand(cx, cz, len, rotY) {
    const grp = new THREE.Group(); grp.position.set(cx, 0, cz); grp.rotation.y = rotY;
    const geo = keep(new THREE.BufferGeometry());
    const D = 18, H0 = 1.2, H1 = 14;
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-len / 2, H0, 0, len / 2, H0, 0, -len / 2, H1, -D, len / 2, H1, -D], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    geo.setIndex([0, 1, 2, 2, 1, 3]); geo.computeVertexNormals();
    grp.add(new THREE.Mesh(geo, standMatFor(len)));
    const front = new THREE.Mesh(keep(new THREE.BoxGeometry(len, H0, 0.4)), wallMat); front.position.set(0, H0 / 2, 0.1); grp.add(front);
    const back = new THREE.Mesh(keep(new THREE.BoxGeometry(len, H1 + 4, 0.6)), wallMat); back.position.set(0, (H1 + 4) / 2, -D - 0.3); grp.add(back);
    const roof = new THREE.Mesh(keep(new THREE.BoxGeometry(len, 0.4, 12)), roofMat); roof.position.set(0, H1 + 4.5, -D + 4); roof.rotation.x = -0.12; grp.add(roof);
    scene.add(grp);
  }
  stand(0, -(CY + 9), L + 20, 0); stand(0, CY + 9, L + 20, Math.PI);
  stand(-(HL + 10), 0, W + 8, Math.PI / 2); stand(HL + 10, 0, W + 8, -Math.PI / 2);

  // ---------- advertising boards ----------
  const boardTex = keep(canvasTex(512, 64, (g, w, h) => {
    const k = ['#ce1126', '#fcd116', '#006b3f', '#111111']; for (let i = 0; i < 16; i++) { g.fillStyle = k[i % 4]; g.fillRect(i * 32, 0, 32, h); }
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 10, w, 44);
    g.font = '900 34px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fcd116'; g.fillText('KENTE KICKERS', w / 2, h / 2 + 1);
  }, { repeat: [1, 1] }));
  const boardMatFor = (len) => { const t = boardTex.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(Math.round(len / 12), 1); keep(t); return keep(new THREE.MeshLambertMaterial({ map: t, emissive: '#222', emissiveMap: t })); };
  [[0, -(CY + 3.2), L + 6, 0], [0, CY + 3.2, L + 6, Math.PI], [-(HL + 4), -19, 26, Math.PI / 2], [-(HL + 4), 19, 26, Math.PI / 2], [HL + 4, -19, 26, -Math.PI / 2], [HL + 4, 19, 26, -Math.PI / 2]].forEach(([x, z, len, ry]) => {
    const m = new THREE.Mesh(keep(new THREE.BoxGeometry(len, 0.9, 0.15)), boardMatFor(len)); m.position.set(x, 0.45, z); m.rotation.y = ry; scene.add(m);
  });

  // ---------- floodlights ----------
  const poleMat = keep(new THREE.MeshLambertMaterial({ color: '#9aa3ad' })), lampMat = keep(new THREE.MeshBasicMaterial({ color: '#fffbe0' }));
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
    const pole = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.35, 0.6, 34, 6)), poleMat); pole.position.set(sx * (HL + 16), 17, sz * (CY + 16)); scene.add(pole);
    const head = new THREE.Mesh(keep(new THREE.BoxGeometry(5, 3, 0.6)), lampMat); head.position.set(sx * (HL + 15), 34, sz * (CY + 15)); head.lookAt(0, 0, 0); scene.add(head);
  });

  // ---------- ball ----------
  const BR = 0.22;
  const ballGeo = keep(new THREE.IcosahedronGeometry(BR, 1));
  { const n = ballGeo.attributes.position.count, col = new Float32Array(n * 3); for (let f = 0; f < n / 3; f++) { const dark = [0, 5, 9, 14, 22, 27, 33, 38, 45, 51, 56, 62, 68, 73].includes(f); for (let v = 0; v < 3; v++) col.set(dark ? [0.08, 0.08, 0.1] : [1, 1, 1], (f * 3 + v) * 3); } ballGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  const ball = new THREE.Mesh(ballGeo, keep(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  ball.castShadow = high; scene.add(ball);
  const blobTex = keep(canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }));
  const blobMat = keep(new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  const blobGeo = keep(new THREE.PlaneGeometry(1, 1)); blobGeo.rotateX(-Math.PI / 2);
  const ballShadow = new THREE.Mesh(blobGeo, blobMat); ballShadow.renderOrder = 1; scene.add(ballShadow);

  // ---------- controlled-player marker ----------
  const ringGeo = keep(new THREE.RingGeometry(0.75, 1.0, 36)); ringGeo.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, keep(new THREE.MeshBasicMaterial({ color: '#ffeb3b', transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })));
  ring.renderOrder = 2; scene.add(ring);
  const coneGeo = keep(new THREE.ConeGeometry(0.22, 0.42, 10)); coneGeo.rotateX(Math.PI);
  const cone = new THREE.Mesh(coneGeo, keep(new THREE.MeshBasicMaterial({ color: '#ffeb3b' }))); scene.add(cone);

  // ---------- humanoid ----------
  const G = {
    torso: keep(new THREE.CapsuleGeometry(0.17, 0.3, 4, 10)),
    shorts: keep(new THREE.CylinderGeometry(0.19, 0.21, 0.2, 10)),
    head: keep(new THREE.SphereGeometry(0.125, 12, 10)),
    hair: keep(new THREE.SphereGeometry(0.132, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    uArm: keep(new THREE.CapsuleGeometry(0.052, 0.2, 2, 6).translate(0, -0.15, 0)),
    fArm: keep(new THREE.CapsuleGeometry(0.046, 0.19, 2, 6).translate(0, -0.13, 0)),
    thigh: keep(new THREE.CapsuleGeometry(0.078, 0.3, 2, 8).translate(0, -0.2, 0)),
    shin: keep(new THREE.CapsuleGeometry(0.062, 0.3, 2, 8).translate(0, -0.2, 0)),
    boot: keep(new THREE.BoxGeometry(0.11, 0.08, 0.26).translate(0, -0.04, 0.05)),
    num: keep(new THREE.PlaneGeometry(0.24, 0.24)),
  };
  const SKIN = ['#5a3825', '#6e4630', '#8d5a3b', '#b07650', '#d9a77c', '#f1c9a5'].map((c) => keep(new THREE.MeshLambertMaterial({ color: c })));
  const HAIR = ['#1a1310', '#2c1d14', '#5a3a1e', '#a0702a', '#d8b46a'].map((c) => keep(new THREE.MeshLambertMaterial({ color: c })));
  const bootMat = keep(new THREE.MeshLambertMaterial({ color: '#141414' }));
  let teamMats = [], figs = new Map(), perMatch = [];

  function numberTex(n, bg, fg) {
    return canvasTex(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.font = '900 48px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = bg; g.strokeText(String(n), 32, 35); g.fillStyle = fg; g.fillText(String(n), 32, 35); });
  }
  function makeFig(p, tm, mats) {
    const gk = p.pos === 'GK';
    const shirt = gk ? mats.gk : mats.shirt;
    const r = (p.sp.id ? [...String(p.sp.id)].reduce((a, c) => a + c.charCodeAt(0), 0) : p.i * 7 + p.t * 3);
    const skin = SKIN[r % SKIN.length], hair = HAIR[(r >> 2) % (skin === SKIN[5] || skin === SKIN[4] ? HAIR.length : 2)];
    const root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); root.scale.setScalar(PS);
    const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = high; parent.add(m); return m; };
    hips.position.y = 0.93;
    const chest = new THREE.Group(); hips.add(chest);
    mesh(G.torso, shirt, chest, 0, 0.36, 0).scale.set(1.12, 1, 0.78);
    mesh(G.shorts, mats.shorts, hips, 0, -0.02, 0).scale.set(1.05, 1, 0.8);
    const headG = new THREE.Group(); headG.position.y = 0.79; chest.add(headG);
    mesh(G.head, skin, headG); const hr = mesh(G.hair, hair, headG, 0, 0.02, -0.01); hr.rotation.x = -0.25;
    // number on back
    const shirtHex = gk ? tm.gk : tm.shirt, fg = lum(shirtHex) > 0.6 ? '#111111' : '#ffffff', bg = fg === '#111111' ? '#ffffff' : '#000000';
    const nt = numberTex(p.i === 0 ? 1 : p.i + 1, bg, fg); perMatch.push(nt);
    const nm = new THREE.MeshBasicMaterial({ map: nt, transparent: true, depthWrite: false }); perMatch.push(nm);
    const num = new THREE.Mesh(G.num, nm); num.position.set(0, 0.42, -0.14); num.rotation.y = Math.PI; chest.add(num);
    const limb = (side) => {
      const sh = new THREE.Group(); sh.position.set(side * 0.235, 0.58, 0); chest.add(sh);
      mesh(G.uArm, shirt, sh); const el = new THREE.Group(); el.position.y = -0.29; sh.add(el); mesh(G.fArm, gk ? mats.gkGlove : skin, el);
      const hp = new THREE.Group(); hp.position.set(side * 0.1, -0.06, 0); hips.add(hp);
      mesh(G.thigh, skin, hp); const kn = new THREE.Group(); kn.position.y = -0.41; hp.add(kn);
      mesh(G.shin, mats.socks, kn); mesh(G.boot, bootMat, kn, 0, -0.42, 0);
      return { sh, el, hp, kn };
    };
    const Lb = limb(1), Rb = limb(-1);
    let blob = null; if (!high) { blob = new THREE.Mesh(blobGeo, blobMat); blob.scale.setScalar(1.3); blob.renderOrder = 1; scene.add(blob); }
    scene.add(root);
    return { root, hips, chest, headG, L: Lb, R: Rb, blob, yaw: Math.atan2(p.fx, p.fy), phase: Math.random() * 6, kick: 0, kickDur: 0.35, kickShot: false, slide: 0, dive: 0, diveSide: 1, pk: 0, pt: 0, pl: 0, celT: 0, spin: 0 };
  }

  // pose: plain object of joint targets
  function basePose() { return { hy: 0, hx: 0, hz: 0, hyaw: 0, hsx: 0, cx: 0, lh: 0, rh: 0, lk: 0, rk: 0, ls: 0, rs: 0, lsz: 0.08, rsz: -0.08, le: -0.35, re: -0.35, lift: 0 }; }
  function mixPose(a, b, w) { if (w <= 0) return a; for (const k in a) a[k] = lerp(a[k], b[k], w); return a; }

  function animate(f, p, m, dt, t) {
    const b = m.ball, spd = Math.hypot(p.vx, p.vy), gk = p.pos === 'GK';
    // event detection from sim state
    if (p.kickCd > f.pk + 0.1) { f.kick = 0.0001; f.kickShot = !!(b.shot && b.lastKicker === p); f.kickDur = f.kickShot ? 0.5 : 0.36; }
    if (!gk && ((p.tackleCd > f.pt + 0.3 && spd > 2) || (p.lunge > 0 && f.pl <= 0))) f.slide = 0.0001;
    f.pk = p.kickCd; f.pt = p.tackleCd; f.pl = p.lunge;
    if (gk && !f.dive && !b.owner && b.shot && b.shotT !== p.t) {
      const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
      if (d < 8 && Math.abs(dy) > 0.9) { f.dive = 0.0001; const side = Math.sign(dy) * Math.sign(p.fx || 1); f.diveSide = side > 0 ? -1 : 1; }
    }
    // facing
    let tyaw = Math.atan2(p.fx, p.fy);
    if (f.dive) tyaw = Math.atan2(p.t === 0 ? 1 : -1, 0);
    f.yaw = angLerp(f.yaw, tyaw, 1 - Math.exp(-dt * 14));
    // locomotion
    const sprint = spd > 11, a = clamp(spd / 7.5, 0, 1.15);
    f.phase += dt * spd * Math.PI / (sprint ? 2.6 : 2.1);
    const s = Math.sin(f.phase), P = basePose();
    if (a < 0.06) { // idle: breathing, keeper ready stance
      P.hy = Math.sin(t * 2.2 + p.i) * 0.012; P.cx = 0.03;
      if (gk) { P.hy -= 0.08; P.lk = P.rk = 0.35; P.lh = P.rh = -0.3; P.hx = 0.15; P.lsz = 0.5; P.rsz = -0.5; P.le = P.re = -0.6; }
      P.lift = 0;
    } else {
      const lean = sprint ? 0.32 : 0.14 * a;
      P.hx = lean; P.hy = -0.03 * a + 0.05 * a * Math.abs(Math.cos(f.phase));
      P.lh = 0.75 * a * s - lean; P.rh = -0.75 * a * s - lean;
      P.lk = a * (0.15 + 1.15 * Math.max(0, s)); P.rk = a * (0.15 + 1.15 * Math.max(0, -s));
      P.ls = -0.7 * a * s; P.rs = 0.7 * a * s; P.le = P.re = -(0.5 + 0.7 * a);
      P.hyaw = 0.14 * a * s;
    }
    if (p.stun > 0) { P.hz = Math.sin(t * 9) * 0.18; P.hx = -0.1; P.lsz = 0.6; P.rsz = -0.6; }
    // kick / shot
    if (f.kick) {
      f.kick += dt; const u = f.kick / f.kickDur, K = basePose(), sh = f.kickShot ? 1.35 : 1;
      if (u < 0.4) { const v = smooth(0, 0.4, u); K.rh = 0.95 * sh * v; K.rk = 1.5 * v; }
      else { const v = smooth(0.4, 0.7, u); K.rh = lerp(0.95 * sh, -1.25 * sh, v); K.rk = lerp(1.5, 0.1, v); }
      K.lh = -0.15; K.lk = 0.3; K.hy = -0.05; K.hx = f.kickShot ? -0.12 : 0.05; K.lsz = 0.8; K.rsz = -0.5; K.ls = 0.3; K.rs = -0.5; K.hyaw = -0.25 * (u > 0.4 ? 1 : 0);
      const w = smooth(0, 0.12, u) * (1 - smooth(0.82, 1, u)); mixPose(P, K, w);
      if (u >= 1) f.kick = 0;
    }
    // slide tackle
    if (f.slide) {
      f.slide += dt; const u = f.slide / 0.62, K = basePose();
      K.hy = -0.6; K.hx = -0.95; K.rh = -0.65; K.rk = 0.05; K.lh = -0.15; K.lk = 1.5; K.ls = -0.4; K.lsz = 1.0; K.rsz = -1.0; K.re = -0.2; K.hz = 0.25;
      const w = smooth(0, 0.18, u) * (1 - smooth(0.75, 1, u)); mixPose(P, K, w);
      if (u >= 1) f.slide = 0;
    }
    // keeper dive
    if (f.dive) {
      f.dive += dt; const u = f.dive / 0.85, K = basePose(), sd = f.diveSide;
      const up = Math.sin(clamp(u / 0.6, 0, 1) * Math.PI);
      K.hz = -sd * 1.3; K.hsx = sd * 1.1; K.hy = -0.35 + up * 0.35; K.ls = K.rs = -2.9; K.lsz = 0.2; K.rsz = -0.2; K.le = K.re = -0.1; K.lh = -0.2; K.rh = 0.15; K.lk = 0.3; K.rk = 0.4;
      const w = smooth(0, 0.15, u) * (1 - smooth(0.8, 1, u)); mixPose(P, K, w);
      if (u >= 1) f.dive = 0;
    }
    // celebrations
    if (m.state === 'goal') {
      f.celT += dt; const ct = f.celT, K = basePose(); let w = smooth(0, 0.25, ct);
      if (p.t === m.goalTeam) {
        if (p === b.lastKicker) { K.lift = Math.abs(Math.sin(ct * 5.5)) * 0.45; K.lsz = 1.45; K.rsz = -1.45; K.le = K.re = 0; K.ls = K.rs = 0; f.spin += dt * 5; }
        else { K.lift = Math.abs(Math.sin(ct * 6.5 + p.i)) * 0.32; K.ls = K.rs = -2.85; K.lsz = 0.25; K.rsz = -0.25; K.le = K.re = -0.15; K.lk = K.rk = 0.3 * (1 - K.lift); K.lh = K.rh = -0.15; }
      } else { K.ls = K.rs = 0.35; K.lsz = 0.5; K.rsz = -0.5; K.le = K.re = -1.35; K.hx = 0.12; K.lh = K.rh = -0.12; K.cx = 0.35; }
      // keep the legs running if still moving
      if (a > 0.06 && !(p === b.lastKicker && p.t === m.goalTeam)) { K.lh = P.lh; K.rh = P.rh; K.lk = P.lk; K.rk = P.rk; K.lift *= 0.5; }
      mixPose(P, K, w);
    } else { f.celT = 0; f.spin *= Math.exp(-dt * 6); }
    // apply
    f.root.position.set(p.x - HL, P.lift * PS, p.y - CY);
    f.root.rotation.y = f.yaw + f.spin;
    const h = f.hips; h.position.set(P.hsx, 0.93 + P.hy, 0); h.rotation.set(P.hx, P.hyaw, P.hz);
    f.chest.rotation.x = P.cx;
    f.L.hp.rotation.x = P.lh; f.R.hp.rotation.x = P.rh; f.L.kn.rotation.x = P.lk; f.R.kn.rotation.x = P.rk;
    f.L.sh.rotation.set(P.ls, 0, P.lsz); f.R.sh.rotation.set(P.rs, 0, P.rsz); f.L.el.rotation.x = P.le; f.R.el.rotation.x = P.re;
    if (f.blob) { f.blob.position.set(p.x - HL, 0.02, p.y - CY); }
  }

  // ---------- camera ----------
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  let vertical = true, snap = true, cssW = 1, cssH = 1, fx = 0, fz = 0;
  function cameraTarget(m, dt) {
    const b = m.ball; let tx = b.x - HL, tz = b.y - CY, close = 0;
    if ((m.state === 'goal' || m.state === 'end') && b.lastKicker && m.state === 'goal') { tx = b.lastKicker.x - HL; tz = b.lastKicker.y - CY; close = 1; }
    const k = snap ? 1 : 1 - Math.exp(-dt * 3.2);
    fx = lerp(fx, tx, k); fz = lerp(fz, tz, k);
    const X = clamp(fx, -HL + (vertical ? 4 : 14), HL - (vertical ? 4 : 14));
    if (vertical) {
      const z = api.zoom, back = lerp(19, 9, close) * z, hgt = lerp(27, 10, close) * z;
      tmpP.set(X - back, hgt, fz * 0.8); tmpL.set(X + lerp(6, 1.5, close) * z, 0, fz * 0.85);
      camera.fov = 64;
    } else {
      const z = api.zoom, dist = lerp(33, 16, close) * z, hgt = lerp(19, 8, close) * z;
      tmpP.set(X, hgt, fz * 0.45 + dist); tmpL.set(X, 0, fz * 0.55 - lerp(3, 0, close));
      camera.fov = 42;
    }
    const kc = snap ? 1 : 1 - Math.exp(-dt * 4.5);
    camPos.lerp(tmpP, kc); camLook.lerp(tmpL, kc); snap = false;
    camera.position.copy(camPos); camera.lookAt(camLook); camera.updateProjectionMatrix();
    sun.position.set(camLook.x - 22, 48, camLook.z + 18); sun.target.position.copy(camLook);
  }

  const q = new THREE.Quaternion(), axis = new THREE.Vector3(), proj = new THREE.Vector3();
  let curMatch = null, t = 0;
  const api = {
    q: high ? 'high' : 'low', zoom: 1, renderer, scene, camera,
    begin(m) {
      this.end();
      curMatch = m; snap = true; fx = m.ball.x - HL; fz = m.ball.y - CY;
      teamMats = m.teams.map((tm) => {
        const mk = (c) => { const x = new THREE.MeshLambertMaterial({ color: c }); perMatch.push(x); return x; };
        return { shirt: mk(tm.shirt), shorts: mk(tm.shorts || '#ffffff'), socks: mk(tm.shirt), gk: mk(tm.gk || '#7cb342'), gkGlove: mk('#f5f5f5') };
      });
      for (const p of m.ents) figs.set(p, makeFig(p, m.teams[p.t], teamMats[p.t]));
      this.resize();
    },
    end() {
      for (const f of figs.values()) { scene.remove(f.root); if (f.blob) scene.remove(f.blob); }
      figs.clear(); perMatch.forEach((o) => o.dispose()); perMatch = []; curMatch = null;
    },
    resize() {
      const r = canvas.getBoundingClientRect(); cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
      vertical = cssH >= cssW; renderer.setSize(cssW, cssH, false); camera.aspect = cssW / cssH; camera.updateProjectionMatrix(); snap = true;
    },
    render(m, dt) {
      if (m !== curMatch) this.begin(m);
      const r = canvas.getBoundingClientRect(); if (Math.abs(r.width - cssW) > 1 || Math.abs(r.height - cssH) > 1) this.resize();
      t += dt;
      for (const [p, f] of figs) animate(f, p, m, dt, t);
      const b = m.ball, bx = b.x - HL, bz = b.y - CY;
      const dx = bx - ball.position.x, dz = bz - ball.position.z, dist = Math.hypot(dx, dz);
      if (dist > 0.0001 && dist < 5) { axis.set(dz, 0, -dx).normalize(); q.setFromAxisAngle(axis, dist / BR); ball.quaternion.premultiply(q); }
      ball.position.set(bx, BR + Math.max(0, b.z), bz);
      ballShadow.position.set(bx + b.z * 0.25, 0.015, bz + b.z * 0.15); const ss = 0.75 + b.z * 0.12; ballShadow.scale.set(ss, 1, ss); ballShadow.material.opacity = 1;
      const c = m.ctrl;
      ring.visible = cone.visible = !!c;
      if (c) { const pulse = 1 + Math.sin(t * 6) * 0.08; ring.position.set(c.x - HL, 0.06, c.y - CY); ring.scale.set(pulse, 1, pulse); cone.position.set(c.x - HL, 2.75 * PS + Math.sin(t * 4) * 0.12, c.y - CY); cone.rotation.y += dt * 2; }
      cameraTarget(m, dt);
      renderer.render(scene, camera);
    },
    project(x, y, h) {
      proj.set(x - HL, h * PS, y - CY).project(camera);
      if (proj.z > 1 || proj.z < -1) return null;
      return [(proj.x + 1) / 2 * cssW, (1 - proj.y) / 2 * cssH];
    },
    dispose() { this.end(); disposables.forEach((o) => o.dispose && o.dispose()); renderer.dispose(); },
  };
  return api;
}
