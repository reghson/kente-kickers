/* Kente Kickers — 3D match renderer (three.js r180, vendored, MIT).
   Pure view layer: reads the 2D simulation state from KK.Match each frame and draws it in 3D.
   Sim coords: x 0..105 (length), y 0..68 (width). Three coords: X = x - 52.5, Z = y - 34, Y up. */
import * as THREE from './vendor/three.module.min.js';

const L = 105, W = 68, CY = 34, GH = 3.66, GHT = 2.44, HL = L / 2;
const PS = 1.22; // player scale: slim proportions, drawn a bit larger than life so they read like a broadcast game on a phone
const HIPY = 0.98;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const angLerp = (a, b, k) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };
const angDiff = (b, a) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

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
  const sky = new THREE.Color('#0b1222'); scene.background = sky; scene.fog = new THREE.Fog(sky, 150, 320);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 450);
  const disposables = [];
  const keep = (o) => { disposables.push(o); return o; };

  // ---------- lights (night match under floodlights) ----------
  const hemi = new THREE.HemisphereLight('#f4f8ff', '#41622f', 1.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 2.2); sun.position.set(-25, 50, 20); scene.add(sun); scene.add(sun.target);
  if (high) {
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 140;
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
  }

  // ---------- ground + pitch: concentric mowing rings + faint stripes ----------
  const MARGIN = 3, TW = high ? 2048 : 1024, PW = L + MARGIN * 2, PH = W + MARGIN * 2, TH = Math.round(TW * PH / PW);
  const pitchTex = keep(canvasTex(TW, TH, (g, w, h) => {
    const k = w / PW; g.scale(k, k); g.translate(MARGIN, MARGIN);
    g.fillStyle = '#4f9a32'; g.fillRect(-MARGIN, -MARGIN, PW, PH);
    const R = Math.hypot(HL + MARGIN, CY + MARGIN), band = 3.6;
    for (let r = Math.ceil(R / band) * band, i = 0; r > 0; r -= band, i++) { g.fillStyle = i % 2 ? '#5aa83a' : '#4d9a31'; g.beginPath(); g.arc(HL, CY, r, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 20; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.03)'; g.fillRect(i * L / 20 - (i === 0 ? MARGIN : 0), -MARGIN, L / 20 + (i === 0 || i === 19 ? MARGIN : 0) + 0.02, PH); }
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,30,0' : '220,255,200'},0.05)`; g.fillRect(Math.random() * PW - MARGIN, Math.random() * PH - MARGIN, 0.5, 0.5); }
  }));
  pitchTex.anisotropy = Math.max(aniso, Math.min(4, renderer.capabilities.getMaxAnisotropy()));
  const pitch = new THREE.Mesh(keep(new THREE.PlaneGeometry(PW, PH)), keep(new THREE.MeshLambertMaterial({ map: pitchTex })));
  pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = high; scene.add(pitch);
  // crisp line markings as real geometry (sharp at any resolution)
  {
    const pos = [], LW = 0.12, Y = 0.012;
    const quad = (x0, z0, x1, z1) => { const dx = x1 - x0, dz = z1 - z0, d = Math.hypot(dx, dz) || 1, nx = -dz / d * LW / 2, nz = dx / d * LW / 2; pos.push(x0 + nx, Y, z0 + nz, x1 - nx, Y, z1 - nz, x1 + nx, Y, z1 + nz, x0 + nx, Y, z0 + nz, x0 - nx, Y, z0 - nz, x1 - nx, Y, z1 - nz); };
    const S = (x, y) => [x - HL, y - CY];
    const line = (x0, y0, x1, y1) => { const a = S(x0, y0), b = S(x1, y1); quad(a[0], a[1], b[0], b[1]); };
    const rect = (x0, y0, x1, y1) => { line(x0, y0, x1, y0); line(x1, y0, x1, y1); line(x1, y1, x0, y1); line(x0, y1, x0, y0); };
    const arc = (cx, cy, r, a0, a1, n) => { for (let i = 0; i < n; i++) { const u0 = a0 + (a1 - a0) * i / n, u1 = a0 + (a1 - a0) * (i + 1) / n; line(cx + Math.cos(u0) * r, cy + Math.sin(u0) * r, cx + Math.cos(u1) * r, cy + Math.sin(u1) * r); } };
    const spot = (cx, cy, r) => { for (let i = 0; i < 12; i++) { const u0 = i / 12 * 6.2832, u1 = (i + 1) / 12 * 6.2832, c = S(cx, cy); pos.push(c[0], Y, c[1], c[0] + Math.cos(u1) * r, Y, c[1] + Math.sin(u1) * r, c[0] + Math.cos(u0) * r, Y, c[1] + Math.sin(u0) * r); } };
    rect(0, 0, L, W); line(HL, 0, HL, W); arc(HL, CY, 9.15, 0, Math.PI * 2, 64); spot(HL, CY, 0.25);
    [[0, 1], [L, -1]].forEach(([x, d]) => {
      rect(x, CY - 20.16, x + d * 16.5, CY + 20.16); rect(x, CY - 9.16, x + d * 5.5, CY + 9.16);
      const a0 = d > 0 ? -0.93 : Math.PI - 0.93; arc(x + d * 11, CY, 9.15, a0, a0 + 1.86, 20); spot(x + d * 11, CY, 0.2);
    });
    [[0, 0, 0], [L, 0, Math.PI / 2], [L, W, Math.PI], [0, W, -Math.PI / 2]].forEach(([x, y, a]) => arc(x, y, 1, a, a + Math.PI / 2, 6));
    const lg = keep(new THREE.BufferGeometry()); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lines = new THREE.Mesh(lg, keep(new THREE.MeshBasicMaterial({ color: '#f4f7f2', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    lines.renderOrder = 1; scene.add(lines);
  }
  const outerMat = keep(new THREE.MeshLambertMaterial({ color: '#3f7f2a' }));
  const outer = new THREE.Mesh(keep(new THREE.PlaneGeometry(220, 170)), outerMat);
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; scene.add(outer);
  const surroundMat = keep(new THREE.MeshLambertMaterial({ color: '#46872e' }));
  const track = new THREE.Mesh(keep(new THREE.PlaneGeometry(PW + 14, PH + 14)), surroundMat);
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
  const crowdTex = keep(canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#151a26'; g.fillRect(0, 0, w, h);
    const cols = ['#e53935', '#fdd835', '#43a047', '#eeeeee', '#1e88e5', '#fb8c00', '#8e24aa', '#263238', '#ce1126', '#90a4ae'];
    const skin = ['#5a3825', '#8d5a3b', '#c68a5a', '#e0b38a'];
    for (let r = 0; r < 16; r++) { g.fillStyle = '#0e121b'; g.fillRect(0, r * 16 + 13, w, 3); for (let i = 0; i < 85; i++) { if (Math.random() < 0.07) continue; const x = i * 6 + (r % 2) * 3 + Math.random(); g.fillStyle = cols[Math.floor(Math.random() * cols.length)]; g.fillRect(x, r * 16 + 6, 4.5, 7); g.fillStyle = skin[Math.floor(Math.random() * skin.length)]; g.fillRect(x + 0.8, r * 16 + 2.5, 3, 3.2); } }
  }, { repeat: [1, 1] }));
  const standMatFor = (len) => { const t = crowdTex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / 22, 1.6); keep(t); return keep(new THREE.MeshLambertMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.25 })); };
  const roofMat = keep(new THREE.MeshLambertMaterial({ color: '#2a3140' }));
  const wallMat = keep(new THREE.MeshLambertMaterial({ color: '#1c2230' }));
  const standGrp = new THREE.Group(); scene.add(standGrp);
  let stadiumLevel = -1;
  function stand(cx, cz, len, rotY, H1, D) {
    const grp = new THREE.Group(); grp.position.set(cx, 0, cz); grp.rotation.y = rotY;
    const geo = keep(new THREE.BufferGeometry());
    const H0 = 1.6;
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-len / 2, H0, 0, len / 2, H0, 0, -len / 2, H1, -D, len / 2, H1, -D], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1 * D / 18, 1, 1 * D / 18], 2));
    geo.setIndex([0, 1, 2, 2, 1, 3]); geo.computeVertexNormals();
    grp.add(new THREE.Mesh(geo, standMatFor(len)));
    const front = new THREE.Mesh(keep(new THREE.BoxGeometry(len, H0, 0.4)), wallMat); front.position.set(0, H0 / 2, 0.1); grp.add(front);
    const back = new THREE.Mesh(keep(new THREE.BoxGeometry(len, H1 + 4, 0.6)), wallMat); back.position.set(0, (H1 + 4) / 2, -D - 0.3); grp.add(back);
    const roof = new THREE.Mesh(keep(new THREE.BoxGeometry(len, 0.4, 12)), roofMat); roof.position.set(0, H1 + 4.5, -D + 4); roof.rotation.x = -0.12; grp.add(roof);
    standGrp.add(grp);
  }
  // stadium level 0..4 → bigger stands (my club's stadium upgrades)
  function buildStands(lv) {
    if (lv === stadiumLevel) return; stadiumLevel = lv;
    while (standGrp.children.length) standGrp.remove(standGrp.children[0]);
    const H = 8 + lv * 3, D = 10 + lv * 3;
    stand(0, -(CY + 9), L + 20, 0, H, D); stand(0, CY + 9, L + 20, Math.PI, H, D);
    stand(-(HL + 10), 0, W + 8, Math.PI / 2, H * 0.8, D * 0.8); stand(HL + 10, 0, W + 8, -Math.PI / 2, H * 0.8, D * 0.8);
  }
  buildStands(2);

  // ---------- animated LED advertising boards (invented sponsors only) ----------
  const SPONSORS = ['KENTE KICKERS', 'PLAY FAIR', 'GHANA ROAD TO GLORY'];
  const ledTex = (pal) => keep(canvasTex(1536, 64, (g, w, h) => {
    SPONSORS.forEach((txt, i) => {
      const x0 = i * 512, gr = g.createLinearGradient(x0, 0, x0 + 512, h);
      gr.addColorStop(0, pal[i % 3][0]); gr.addColorStop(1, pal[i % 3][1]); g.fillStyle = gr; g.fillRect(x0, 0, 512, h);
      g.fillStyle = 'rgba(255,255,255,.12)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x0 + k * 90, h); g.lineTo(x0 + k * 90 + 40, 0); g.lineTo(x0 + k * 90 + 70, 0); g.lineTo(x0 + k * 90 + 30, h); g.fill(); }
      g.font = '900 34px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText(txt, x0 + 256, h / 2 + 2);
    });
  }));
  const LED = [ledTex([['#0b1640', '#c2185b'], ['#003c2a', '#00bcd4'], ['#3a0d0d', '#fcd116']]), ledTex([['#ce1126', '#fcd116'], ['#1a237e', '#7c4dff'], ['#006b3f', '#111111']])];
  LED.forEach((t) => { t.wrapS = THREE.RepeatWrapping; });
  const boardMats = [];
  const boardMatFor = (len, i) => {
    const mk = (src) => { const t = src.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(len / 24)), 1); return keep(t); };
    const t0 = mk(LED[0]), t1 = mk(LED[1]); const m = keep(new THREE.MeshBasicMaterial({ map: i % 2 ? t1 : t0, color: '#e8e8e8' })); m.userData = { t0, t1, alt: i % 2 }; boardMats.push(m); return m; };
  [[0, -(CY + 4.5), L + 10, 0], [0, CY + 4.5, L + 10, Math.PI], [-(HL + 4.5), -19, 26, Math.PI / 2], [-(HL + 4.5), 19, 26, Math.PI / 2], [HL + 4.5, -19, 26, -Math.PI / 2], [HL + 4.5, 19, 26, -Math.PI / 2]].forEach(([x, z, len, ry], i) => {
    const m = new THREE.Mesh(keep(new THREE.BoxGeometry(len, 0.95, 0.12)), boardMatFor(len, i)); m.position.set(x, 0.48, z); m.rotation.y = ry; scene.add(m);
  });
  let ledT = 0, ledSwap = 0;
  function updateLED(dt) {
    ledT += dt; ledSwap += dt; const swap = ledSwap > 7; if (swap) ledSwap = 0;
    for (const m of boardMats) { const u = m.userData; if (swap) { u.alt ^= 1; m.map = u.alt ? u.t1 : u.t0; } u.t0.offset.x = u.t1.offset.x = (ledT * 0.035 + (u.alt ? 0.5 : 0)) % 1; m.color.setHSL(0, 0, 0.84 + 0.12 * Math.sin(ledT * 3)); }
  }

  // ---------- floodlights ----------
  const poleMat = keep(new THREE.MeshLambertMaterial({ color: '#5b6573' })), lampMat = keep(new THREE.MeshBasicMaterial({ color: '#fffbe8' }));
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
    const pole = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.35, 0.6, 40, 6)), poleMat); pole.position.set(sx * (HL + 22), 20, sz * (CY + 22)); scene.add(pole);
    const head = new THREE.Mesh(keep(new THREE.BoxGeometry(6, 3.5, 0.6)), lampMat); head.position.set(sx * (HL + 21), 40, sz * (CY + 21)); head.lookAt(0, 0, 0); scene.add(head);
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

  // ---------- humanoid (slim, realistic; parts merged per bone with vertex colours = few draw calls) ----------
  const seg = high ? 10 : 7;
  const G = {
    pelvis: keep(new THREE.CylinderGeometry(0.15, 0.165, 0.2, seg)),
    torso: keep(new THREE.CylinderGeometry(0.2, 0.15, 0.5, seg)),
    shoulder: keep(new THREE.SphereGeometry(0.068, seg, 5)),
    neck: keep(new THREE.CylinderGeometry(0.048, 0.055, 0.12, 6)),
    head: keep(new THREE.SphereGeometry(0.104, seg + 2, seg)),
    capTop: keep(new THREE.SphereGeometry(0.112, seg + 2, 5, 0, Math.PI * 2, 0, Math.PI * 0.52)),
    afro: keep(new THREE.SphereGeometry(0.14, seg, seg - 2)),
    longBack: keep(new THREE.BoxGeometry(0.2, 0.26, 0.06)),
    bun: keep(new THREE.SphereGeometry(0.05, 6, 5)),
    sleeve: keep(new THREE.CylinderGeometry(0.056, 0.05, 0.16, seg)),
    uArm: keep(new THREE.CapsuleGeometry(0.038, 0.2, 2, 6)),
    fArm: keep(new THREE.CapsuleGeometry(0.033, 0.2, 2, 6)),
    hand: keep(new THREE.SphereGeometry(0.042, 6, 5)),
    shortLeg: keep(new THREE.CylinderGeometry(0.088, 0.08, 0.22, seg)),
    thigh: keep(new THREE.CapsuleGeometry(0.066, 0.3, 2, seg)),
    shin: keep(new THREE.CylinderGeometry(0.058, 0.045, 0.4, seg)),
    calf: keep(new THREE.SphereGeometry(0.062, 6, 6)),
    boot: keep(new THREE.BoxGeometry(0.09, 0.07, 0.25)),
    num: keep(new THREE.PlaneGeometry(0.2, 0.2)),
  };
  const SKIN = ['#4a2c1c', '#5a3825', '#6e4630', '#8d5a3b', '#b07650', '#d9a77c', '#f1c9a5'];
  const HAIRC = ['#141010', '#2a1b12', '#4a2f1a', '#8a5a2b', '#d8b46a', '#b5562a', '#e8d9a0'];
  const BOOTC = ['#141414', '#f5f5f5', '#ff5722', '#00e5ff', '#c6ff00', '#1e88e5'];
  const vcMat = keep(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const _m = new THREE.Matrix4(), _n = new THREE.Matrix3(), _c = new THREE.Color(), _v = new THREE.Vector3();
  // merge [{geo, color, pos:[x,y,z], scale:[x,y,z], rot:[x,y,z]}] into one vertex-coloured geometry
  function merge(parts) {
    const P = [], N = [], C = [];
    for (const pt of parts) {
      const g = pt.geo.index ? pt.geo.toNonIndexed() : pt.geo;
      const e = new THREE.Euler(...(pt.rot || [0, 0, 0])), qq = new THREE.Quaternion().setFromEuler(e);
      _m.compose(new THREE.Vector3(...(pt.pos || [0, 0, 0])), qq, new THREE.Vector3(...(pt.scale || [1, 1, 1])));
      if (pt.mat) _m.premultiply(pt.mat);
      _n.getNormalMatrix(_m); _c.set(pt.color);
      const pa = g.attributes.position, na = g.attributes.normal;
      for (let i = 0; i < pa.count; i++) {
        _v.fromBufferAttribute(pa, i).applyMatrix4(_m); P.push(_v.x, _v.y, _v.z);
        _v.fromBufferAttribute(na, i).applyMatrix3(_n).normalize(); N.push(_v.x, _v.y, _v.z);
        C.push(_c.r, _c.g, _c.b);
      }
      if (g !== pt.geo) g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    return out;
  }
  let figs = new Map(), perMatch = [], extras = [];
  function numberTex(n, bg, fg) {
    return canvasTex(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.font = '900 50px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 4; g.strokeStyle = bg; g.strokeText(String(n), 32, 35); g.fillStyle = fg; g.fillText(String(n), 32, 35); });
  }
  function hairParts(style, hc) {
    const hp = [];
    if (style === 0) hp.push({ geo: G.capTop, color: hc, pos: [0, 0.012, -0.008], rot: [-0.25, 0, 0] });
    else if (style === 1) hp.push({ geo: G.capTop, color: hc, pos: [0, 0.0, -0.004], rot: [-0.2, 0, 0], scale: [0.96, 0.9, 0.96] });
    else if (style === 2) hp.push({ geo: G.afro, color: hc, pos: [0, 0.05, -0.02] });
    else if (style === 3) { hp.push({ geo: G.capTop, color: hc, pos: [0, 0.012, -0.008], rot: [-0.25, 0, 0], scale: [1.05, 1, 1.05] }); hp.push({ geo: G.longBack, color: hc, pos: [0, -0.1, -0.075], rot: [0.12, 0, 0] }); }
    else if (style === 4) { hp.push({ geo: G.capTop, color: hc, pos: [0, 0.012, -0.008], rot: [-0.25, 0, 0] }); hp.push({ geo: G.bun, color: hc, pos: [0, 0.07, -0.11] }); }
    else if (style === 5) hp.push({ geo: G.capTop, color: hc, pos: [0, 0.03, -0.0], scale: [1, 1.25, 1.02], rot: [-0.1, 0, 0] });
    return hp; // style 6 = bald
  }
  // generic figure. look = {shirt, shorts, socks, boots, skin, hair, hairStyle, gloves, sleeveLong}
  function buildFigure(look, opt = {}) {
    const root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); root.scale.setScalar(PS * (look.size || 1));
    const add = (parent, parts) => { const m = new THREE.Mesh(merge(parts), vcMat); m.castShadow = high && !opt.noShadow; parent.add(m); perMatch.push(m.geometry); return m; };
    hips.position.y = HIPY;
    add(hips, [{ geo: G.pelvis, color: look.shorts, pos: [0, -0.02, 0], scale: [1, 1, 0.72] }]);
    const chest = new THREE.Group(); chest.position.y = 0.06; hips.add(chest);
    const torso = [{ geo: G.torso, color: look.shirt, pos: [0, 0.27, 0], scale: [1, 1, 0.6] }, { geo: G.shoulder, color: look.shirt, pos: [0.19, 0.48, 0] }, { geo: G.shoulder, color: look.shirt, pos: [-0.19, 0.48, 0] }, { geo: G.neck, color: look.skin, pos: [0, 0.56, 0] }];
    if (look.vest) torso.push({ geo: G.torso, color: look.vest, pos: [0, 0.29, 0], scale: [1.06, 0.82, 0.66] });
    add(chest, torso);
    const headG = new THREE.Group(); headG.position.y = 0.68; chest.add(headG);
    add(headG, [{ geo: G.head, color: look.skin, scale: [0.92, 1.12, 1] }, ...hairParts(look.hairStyle, look.hair)]);
    let num = null;
    if (look.number != null) {
      const fg = lum(look.shirt) > 0.6 ? '#111111' : '#ffffff', bg = fg === '#111111' ? '#ffffff' : '#000000';
      const nt = numberTex(look.number, bg, fg); perMatch.push(nt);
      const nm = new THREE.MeshBasicMaterial({ map: nt, transparent: true, depthWrite: false }); perMatch.push(nm);
      num = new THREE.Mesh(G.num, nm); num.position.set(0, 0.32, -0.125); num.rotation.y = Math.PI; chest.add(num);
    }
    const limb = (side) => {
      const sh = new THREE.Group(); sh.position.set(side * 0.215, 0.47, 0); chest.add(sh);
      add(sh, [{ geo: G.sleeve, color: look.shirt, pos: [0, -0.06, 0], scale: look.sleeveLong ? [0.9, 1.6, 0.9] : [1, 1, 1] }, { geo: G.uArm, color: look.sleeveLong ? look.shirt : look.skin, pos: [0, -0.14, 0] }]);
      const el = new THREE.Group(); el.position.y = -0.28; sh.add(el);
      add(el, [{ geo: G.fArm, color: look.sleeveLong ? look.shirt : look.skin, pos: [0, -0.12, 0] }, { geo: G.hand, color: look.gloves || look.skin, pos: [0, -0.255, 0.005], scale: [0.85, 1.1, 1] }]);
      const hp = new THREE.Group(); hp.position.set(side * 0.09, -0.08, 0); hips.add(hp);
      add(hp, [{ geo: G.shortLeg, color: look.shorts, pos: [0, -0.07, 0] }, { geo: G.thigh, color: look.thighSkin || look.skin, pos: [0, -0.24, 0] }]);
      const kn = new THREE.Group(); kn.position.y = -0.45; hp.add(kn);
      add(kn, [{ geo: G.shin, color: look.socks, pos: [0, -0.2, 0] }, { geo: G.calf, color: look.socks, pos: [0, -0.1, -0.02], scale: [0.95, 1.6, 0.95] }, { geo: G.boot, color: look.boots, pos: [0, -0.425, 0.045] }]);
      return { sh, el, hp, kn };
    };
    const Lb = limb(1), Rb = limb(-1);
    let blob = null; if (!high && !opt.noBlob) { blob = new THREE.Mesh(blobGeo, blobMat); blob.scale.setScalar(1.2); blob.renderOrder = 1; scene.add(blob); }
    scene.add(root);
    return { root, hips, chest, headG, L: Lb, R: Rb, blob, num, yaw: 0, phase: Math.random() * 6, kick: 0, kickDur: 0.35, kickShot: false, slide: 0, dive: 0, diveSide: 1, pk: 0, pt: 0, pl: 0, celT: 0, spin: 0 };
  }
  function hashOf(p) { return p.sp && p.sp.id ? [...String(p.sp.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) : p.i * 7 + p.t * 3; }
  // kit pattern overlay (shirt torso). Cylinder UV: u=0 front(+z), 0.25 left(+x), 0.5 back; v=0 bottom.
  const patMats = new Map();
  function patternMat(tm) {
    const pat = tm.pattern; if (!pat || pat === 'plain') return null;
    const key = pat + (tm.c2 || '') + tm.shirt; if (patMats.has(key)) return patMats.get(key);
    const c2 = tm.c2 || '#ffffff', W2 = 256, H2 = 128;
    const tex = canvasTex(W2, H2, (g) => {
      g.clearRect(0, 0, W2, H2); g.fillStyle = c2;
      if (pat === 'stripes') for (let i = 0; i < 10; i++) g.fillRect(i * W2 / 10, 0, W2 / 20, H2);
      else if (pat === 'pinstripe') for (let i = 0; i < 28; i++) g.fillRect(i * W2 / 28, 0, 2, H2);
      else if (pat === 'hoops') for (let i = 0; i < 3; i++) g.fillRect(0, H2 * (0.12 + i * 0.3), W2, H2 * 0.14);
      else if (pat === 'halves') g.fillRect(0, 0, W2 / 2, H2);
      else if (pat === 'sash') { for (const o of [-W2, 0, W2]) { g.beginPath(); g.moveTo(o + W2 * 0.16, 0); g.lineTo(o + W2 * 0.3, 0); g.lineTo(o + W2 * -0.06, H2); g.lineTo(o + W2 * -0.2, H2); g.closePath(); g.fill(); } }
      else if (pat === 'kente') { for (let r = 0; r < 4; r++) for (let i = 0; i < 16; i++) { const x = i * W2 / 16, y = r * H2 / 4; g.fillStyle = (i + r) % 2 ? c2 : '#fdd835'; g.fillRect(x, y + 4, W2 / 16, H2 / 9); g.fillStyle = '#111111'; g.fillRect(x + 5, y + H2 / 9 + 6, W2 / 32, H2 / 12); g.fillStyle = '#2e7d32'; if ((i + r) % 3 === 0) g.fillRect(x, y + H2 / 4 - 6, W2 / 16, 3); } }
    }, { repeat: [1, 1] });
    tex.wrapS = THREE.RepeatWrapping; perMatch.push(tex);
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5 }); perMatch.push(mat); patMats.set(key, mat); return mat;
  }
  const torsoSkin = keep(new THREE.CylinderGeometry(0.2, 0.15, 0.5, 14, 1, true));
  function makeFig(p, tm) {
    const gk = p.pos === 'GK', r = hashOf(p);
    const skinI = r % SKIN.length, light = skinI >= 4;
    const hairStyle = [0, 0, 1, 2, 3, 4, 5, 6, 0, 1, 3][(r >> 3) % 11];
    const hair = HAIRC[light ? (r >> 5) % HAIRC.length : (r >> 5) % 3];
    const look = { shirt: gk ? (tm.gk || '#7cb342') : tm.shirt, shorts: gk ? '#222831' : (tm.shorts || '#ffffff'), socks: gk ? (tm.gk || '#7cb342') : (tm.socks || tm.shirt), boots: BOOTC[(r >> 7) % BOOTC.length], skin: SKIN[skinI], hair, hairStyle, gloves: gk ? '#f5f5f5' : null, sleeveLong: gk, number: p.i === 0 ? 1 : p.i + 1, size: 0.97 + ((r >> 9) % 7) * 0.01 };
    const f = buildFigure(look); f.yaw = Math.atan2(p.fx, p.fy);
    const pm = gk ? null : patternMat(tm);
    if (pm) { const o = new THREE.Mesh(torsoSkin, pm); o.position.set(0, 0.27, 0); o.scale.set(1.025, 1.0, 0.6 * 1.04); f.chest.add(o); }
    return f;
  }
  // static extras (stewards in hi-vis, camera operators) — baked into one mesh each
  function bake(group) {
    group.updateMatrixWorld(true); const parts = [];
    group.traverse((o) => { if (o.isMesh && o.geometry.attributes.color) parts.push({ geo: o.geometry, color: '#ffffff', mat: o.matrixWorld.clone(), vc: true }); });
    // merge keeps per-vertex colours: multiply by white
    const P = [], N = [], C = [];
    for (const pt of parts) { const g = pt.geo, pa = g.attributes.position, na = g.attributes.normal, ca = g.attributes.color; _n.getNormalMatrix(pt.mat); for (let i = 0; i < pa.count; i++) { _v.fromBufferAttribute(pa, i).applyMatrix4(pt.mat); P.push(_v.x, _v.y, _v.z); _v.fromBufferAttribute(na, i).applyMatrix3(_n).normalize(); N.push(_v.x, _v.y, _v.z); C.push(ca.getX(i), ca.getY(i), ca.getZ(i)); } }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    return out;
  }
  function staticPerson(look, x, z, yaw, pose) {
    const f = buildFigure(look, { noShadow: true, noBlob: true });
    f.root.position.set(x, 0, z); f.root.rotation.y = yaw;
    if (pose === 'cam') { f.L.sh.rotation.set(-1.3, 0, 0.2); f.R.sh.rotation.set(-1.3, 0, -0.2); f.L.el.rotation.x = -1.2; f.R.el.rotation.x = -1.2; }
    else if (pose === 'kneel') { f.hips.position.y = HIPY - 0.45; f.L.hp.rotation.x = -1.5; f.L.kn.rotation.x = 1.6; f.R.hp.rotation.x = -0.1; f.R.kn.rotation.x = 1.5; f.L.sh.rotation.set(-1.3, 0, 0.2); f.R.sh.rotation.set(-1.3, 0, -0.2); f.L.el.rotation.x = -1.2; f.R.el.rotation.x = -1.2; }
    else { f.L.sh.rotation.z = 0.12; f.R.sh.rotation.z = -0.12; f.L.el.rotation.x = f.R.el.rotation.x = -0.25; }
    const geo = bake(f.root); scene.remove(f.root);
    const m = new THREE.Mesh(geo, vcMat); perMatch.push(geo); scene.add(m); extras.push(m); return m;
  }
  const camBodyMat = keep(new THREE.MeshLambertMaterial({ color: '#202124' }));
  const camBoxGeo = keep(new THREE.BoxGeometry(0.32, 0.3, 0.6)), lensGeo = keep(new THREE.CylinderGeometry(0.08, 0.1, 0.3, 8).rotateX(Math.PI / 2)), legGeo = keep(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 4));
  function cameraRig(x, z, yaw, tall) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw;
    const h = (tall ? 1.55 : 0.85) * PS;
    const body = new THREE.Mesh(camBoxGeo, camBodyMat); body.position.set(0, h, 0); g.add(body);
    const lens = new THREE.Mesh(lensGeo, camBodyMat); lens.position.set(0, h, 0.42); g.add(lens);
    [0, 2.1, 4.2].forEach((a) => { const l = new THREE.Mesh(legGeo, camBodyMat); l.scale.y = h / 1.3; l.position.set(Math.sin(a) * 0.25, h / 2, Math.cos(a) * 0.25); l.rotation.set(Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2); g.add(l); });
    scene.add(g); extras.push(g);
  }
  function buildExtras(seed) {
    let r = seed || 1; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    const steward = () => ({ shirt: '#2b2f38', shorts: '#1d2027', socks: '#1d2027', boots: '#111111', skin: SKIN[Math.floor(rnd() * SKIN.length)], hair: HAIRC[Math.floor(rnd() * 3)], hairStyle: Math.floor(rnd() * 7), vest: '#e6ff1a', sleeveLong: true, thighSkin: '#1d2027' });
    const crew = () => ({ shirt: '#1b1e25', shorts: '#2b2f38', socks: '#2b2f38', boots: '#111111', skin: SKIN[Math.floor(rnd() * SKIN.length)], hair: HAIRC[Math.floor(rnd() * 3)], hairStyle: Math.floor(rnd() * 7), sleeveLong: true, thighSkin: '#2b2f38' });
    // stewards just behind the near and far boards, facing the crowd
    for (let x = -46; x <= 46; x += 13 + rnd() * 6) { staticPerson(steward(), x + rnd() * 2, CY + 5.6, 0); }
    for (let x = -40; x <= 40; x += 20 + rnd() * 8) { staticPerson(steward(), x, -(CY + 5.6), Math.PI); }
    // camera operators: touchline and behind each goal
    [[-14, CY + 3.0, Math.PI], [16, CY + 3.0, Math.PI], [-HL - 3, 9, -Math.PI / 2], [HL + 3, -9, Math.PI / 2]].forEach(([x, z, yaw], i) => {
      staticPerson(crew(), x, z, yaw, i < 2 ? 'cam' : 'kneel'); cameraRig(x + Math.sin(yaw) * 0.5, z + Math.cos(yaw) * 0.5, yaw, i < 2);
    });
    // big broadcast camera dolly at halfway (near side)
    const dolly = new THREE.Group(); dolly.position.set(2, 0, CY + 6.5);
    const base = new THREE.Mesh(keep(new THREE.BoxGeometry(2.4, 0.5, 1.2)), camBodyMat); base.position.y = 0.25; dolly.add(base);
    const arm = new THREE.Mesh(keep(new THREE.BoxGeometry(0.25, 2.2, 0.25)), camBodyMat); arm.position.y = 1.5; dolly.add(arm);
    const cam = new THREE.Mesh(camBoxGeo, camBodyMat); cam.scale.set(1.6, 1.6, 1.6); cam.position.y = 2.7; dolly.add(cam);
    scene.add(dolly); extras.push(dolly);
  }

  // ---------- referee (visual only, follows play) ----------
  let refFig = null; const ref = { x: HL, y: CY + 10, vx: 0, vy: 0, fx: 1, fy: 0, kickCd: 0, tackleCd: 0, lunge: 0, stun: 0, pos: 'REF', t: 2, i: 99, ref: true };
  function updateRef(m, dt) {
    const b = m.ball, dirx = b.owner ? (b.owner.t === 0 ? 1 : -1) : Math.sign(b.vx || 1);
    const tx = clamp(b.x - dirx * 10, 10, L - 10), ty = clamp(b.y + (b.y < CY ? 9 : -9), 6, W - 6);
    const dx = tx - ref.x, dy = ty - ref.y, d = Math.hypot(dx, dy), sp = d > 0.6 ? Math.min(7.5, d * 0.9) : 0;
    const k = Math.min(1, dt * 3); ref.vx += ((d ? dx / d : 0) * sp - ref.vx) * k; ref.vy += ((d ? dy / d : 0) * sp - ref.vy) * k;
    ref.x += ref.vx * dt; ref.y += ref.vy * dt;
    const s = Math.hypot(ref.vx, ref.vy);
    if (s > 0.6) { ref.fx = ref.vx / s; ref.fy = ref.vy / s; } else { const fx = b.x - ref.x, fy = b.y - ref.y, fd = Math.hypot(fx, fy) || 1; ref.fx = fx / fd; ref.fy = fy / fd; }
  }

  // ---------- weather ----------
  let wx = null;
  function setWeather(kind) {
    if (wx) { scene.remove(wx.obj); wx.obj.geometry.dispose(); wx.obj.material.dispose(); wx = null; }
    scene.fog.near = 150; scene.fog.far = 320;
    surroundMat.color.set('#46872e'); outerMat.color.set('#3f7f2a');
    if (kind !== 'snow' && kind !== 'rain') return;
    const N = kind === 'snow' ? (high ? 2200 : 900) : (high ? 1400 : 550), BX = 80, BY = 30, BZ = 70;
    const pos = new Float32Array(N * (kind === 'rain' ? 6 : 3)), seed = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { seed[i * 3] = (Math.random() - 0.5) * BX; seed[i * 3 + 1] = Math.random() * BY; seed[i * 3 + 2] = (Math.random() - 0.5) * BZ; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    let obj;
    if (kind === 'snow') {
      const tex = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 1, 16, 16, 15); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }); keep(tex);
      obj = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.5, map: tex, transparent: true, depthWrite: false, opacity: 0.95 }));
      surroundMat.color.set('#dfe7ea'); outerMat.color.set('#cfd8dc'); scene.fog.near = 90; scene.fog.far = 260;
    } else {
      obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#cfe3ff', transparent: true, opacity: 0.4, depthWrite: false }));
      scene.fog.near = 80; scene.fog.far = 240; surroundMat.color.set('#3a6f27');
    }
    obj.frustumCulled = false; scene.add(obj);
    wx = { kind, obj, seed, N, BX, BY, BZ, t: 0 };
  }
  function updateWeather(dt) {
    if (!wx) return; wx.t += dt; const { seed, N, BX, BY, BZ } = wx, a = wx.obj.geometry.attributes.position.array, cx = camLook.x, cz = camLook.z + 12;
    const wrap = (v, s) => ((v % s) + s * 1.5) % s - s / 2;
    for (let i = 0; i < N; i++) {
      if (wx.kind === 'snow') { seed[i * 3 + 1] -= dt * (1.4 + (i % 5) * 0.25); seed[i * 3] += Math.sin(wx.t * 0.9 + i) * dt * 0.6 + dt * 0.4; }
      else { seed[i * 3 + 1] -= dt * 24; seed[i * 3] += dt * 3; }
      if (seed[i * 3 + 1] < 0) seed[i * 3 + 1] += BY;
      const x = cx + wrap(seed[i * 3] - cx, BX), y = seed[i * 3 + 1], z = cz + wrap(seed[i * 3 + 2] - cz, BZ);
      if (wx.kind === 'snow') { a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z; }
      else { const o = i * 6; a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = x - 0.08; a[o + 4] = y + 0.7; a[o + 5] = z; }
    }
    wx.obj.geometry.attributes.position.needsUpdate = true;
  }

  // pose: plain object of joint targets
  function basePose() { return { hy: 0, hx: 0, hz: 0, hyaw: 0, hsx: 0, cx: 0, lh: 0, rh: 0, lk: 0, rk: 0, ls: 0, rs: 0, lsz: 0.08, rsz: -0.08, le: -0.35, re: -0.35, lift: 0 }; }
  function mixPose(a, b, w) { if (w <= 0) return a; for (const k in a) a[k] = lerp(a[k], b[k], w); return a; }

  function animate(f, p, m, dt, t) {
    const b = m.ball, spd = Math.hypot(p.vx, p.vy), gk = p.pos === 'GK', isRef = !!p.ref;
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
    if (m.state === 'goal' && !isRef) {
      f.celT += dt; const ct = f.celT, K = basePose(); let w = smooth(0, 0.25, ct);
      if (p.t === m.goalTeam) {
        if (p === b.lastKicker) { K.lift = Math.abs(Math.sin(ct * 5.5)) * 0.45; K.lsz = 1.45; K.rsz = -1.45; K.le = K.re = 0; K.ls = K.rs = 0; f.spin += dt * 5; }
        else { K.lift = Math.abs(Math.sin(ct * 6.5 + p.i)) * 0.32; K.ls = K.rs = -2.85; K.lsz = 0.25; K.rsz = -0.25; K.le = K.re = -0.15; K.lk = K.rk = 0.3 * (1 - K.lift); K.lh = K.rh = -0.15; }
      } else { K.ls = K.rs = 0.35; K.lsz = 0.5; K.rsz = -0.5; K.le = K.re = -1.35; K.hx = 0.12; K.lh = K.rh = -0.12; K.cx = 0.35; }
      // keep the legs running if still moving
      if (a > 0.06 && !(p === b.lastKicker && p.t === m.goalTeam)) { K.lh = P.lh; K.rh = P.rh; K.lk = P.lk; K.rk = P.rk; K.lift *= 0.5; }
      mixPose(P, K, w);
    } else { f.celT = 0; f.spin *= Math.exp(-dt * 6); }
    // blend toward the target pose so state changes (idle/run/kick/turn) are smooth
    const turn = angDiff(tyaw, f.yaw); P.hz += clamp(turn, -0.6, 0.6) * 0.22 * a;
    if (!f.P) f.P = P; else { const kb = 1 - Math.exp(-dt * (f.kick || f.dive || f.slide ? 30 : 16)); for (const k in P) f.P[k] += (P[k] - f.P[k]) * kb; }
    const Q = f.P;
    // apply
    f.root.visible = !p.off; if (f.blob) f.blob.visible = !p.off;
    f.root.position.set(p.x - HL, Q.lift * PS, p.y - CY);
    f.root.rotation.y = f.yaw + f.spin;
    const h = f.hips; h.position.set(Q.hsx, HIPY + Q.hy, 0); h.rotation.set(Q.hx, Q.hyaw, Q.hz);
    f.chest.rotation.x = Q.cx;
    f.L.hp.rotation.x = Q.lh; f.R.hp.rotation.x = Q.rh; f.L.kn.rotation.x = Q.lk; f.R.kn.rotation.x = Q.rk;
    f.L.sh.rotation.set(Q.ls, 0, Q.lsz); f.R.sh.rotation.set(Q.rs, 0, Q.rsz); f.L.el.rotation.x = Q.le; f.R.el.rotation.x = Q.re;
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
    const X = clamp(fx, -HL + (vertical ? 4 : 18), HL - (vertical ? 4 : 18));
    if (vertical) {
      const z = api.zoom, back = lerp(19, 9, close) * z, hgt = lerp(27, 10, close) * z;
      tmpP.set(X - back, hgt, fz * 0.8); tmpL.set(X + lerp(6, 1.5, close) * z, 0, fz * 0.85);
      camera.fov = 64;
    } else {
      // broadcast side camera on the near (+Z) touchline, elevated, follows the ball
      const z = api.zoom, LZ = clamp(fz * 0.7 + 3, -18, 24), dist = lerp(25, 12, close) * z, hgt = lerp(13.5, 5.5, close) * z;
      tmpP.set(X, hgt, LZ + dist); tmpL.set(X, 0, LZ - lerp(0, 1, close));
      camera.fov = 36;
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
      for (const p of m.ents) figs.set(p, makeFig(p, m.teams[p.t]));
      refFig = buildFigure({ shirt: '#111111', shorts: '#111111', socks: '#111111', boots: '#111111', skin: SKIN[2], hair: HAIRC[0], hairStyle: 1, size: 0.98 });
      Object.assign(ref, { x: HL - 8, y: CY + 10, vx: 0, vy: 0 }); refFig.yaw = 0;
      buildExtras(7 + (m.cfg.seed || 0));
      buildStands(clamp(m.cfg.stadiumLevel == null ? 2 : m.cfg.stadiumLevel, 0, 4));
      this.weather = m.cfg.weather || 'clear'; setWeather(this.weather);
      this.resize();
    },
    end() {
      for (const f of figs.values()) { scene.remove(f.root); if (f.blob) scene.remove(f.blob); }
      if (refFig) { scene.remove(refFig.root); if (refFig.blob) scene.remove(refFig.blob); refFig = null; }
      extras.forEach((o) => scene.remove(o)); extras = []; setWeather('clear');
      figs.clear(); patMats.clear(); perMatch.forEach((o) => o.dispose()); perMatch = []; curMatch = null;
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
      if (refFig) { if (m.state !== 'kickoff') updateRef(m, dt); animate(refFig, ref, m, dt, t); }
      updateLED(dt);
      const b = m.ball, bx = b.x - HL, bz = b.y - CY;
      const dx = bx - ball.position.x, dz = bz - ball.position.z, dist = Math.hypot(dx, dz);
      if (dist > 0.0001 && dist < 5) { axis.set(dz, 0, -dx).normalize(); q.setFromAxisAngle(axis, dist / BR); ball.quaternion.premultiply(q); }
      ball.position.set(bx, BR + Math.max(0, b.z), bz);
      ballShadow.position.set(bx + b.z * 0.25, 0.015, bz + b.z * 0.15); const ss = 0.75 + b.z * 0.12; ballShadow.scale.set(ss, 1, ss); ballShadow.material.opacity = 1;
      cameraTarget(m, dt);
      updateWeather(dt);
      renderer.render(scene, camera);
    },
    setStadium(lv) { buildStands(clamp(lv, 0, 4)); },
    project(x, y, h) {
      proj.set(x - HL, h * PS, y - CY).project(camera);
      if (proj.z > 1 || proj.z < -1) return null;
      return [(proj.x + 1) / 2 * cssW, (1 - proj.y) / 2 * cssH];
    },
    dispose() { this.end(); disposables.forEach((o) => o.dispose && o.dispose()); renderer.dispose(); },
  };
  return api;
}
