/* Kente Kickers — skinned 3D footballers.
   Mesh: Quaternius "Universal Base Characters" (CC0) + hair; locomotion clips: Quaternius "Universal Animation Library" (CC0).
   Football actions (kicks, tackles, keeper dives, throw-ins, celebrations…) are authored here as keyframed AnimationClips
   on the same skeleton. See assets/LICENSES.md. */
import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader, SkeletonUtils, MeshoptDecoder } from './vendor/three-addons.min.js';

const D2R = Math.PI / 180;
let assetsP = null;
function b64ToBuf(s) { const bin = atob(s.trim()), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function i16(b64) { const buf = b64ToBuf(b64); return new Int16Array(buf); }

export function loadAssets(base = 'assets/models/') {
  if (assetsP) return assetsP;
  assetsP = (async () => {
    const [glbTxt, anims] = await Promise.all([
      fetch(base + 'player.glb.b64').then((r) => { if (!r.ok) throw new Error('model ' + r.status); return r.text(); }),
      fetch(base + 'ual-anims.json').then((r) => { if (!r.ok) throw new Error('anims ' + r.status); return r.json(); }),
    ]);
    await MeshoptDecoder.ready;
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await new Promise((res, rej) => loader.parse(b64ToBuf(glbTxt), '', res, rej));
    const clips = {};
    for (const [name, c] of Object.entries(anims.clips)) {
      const times = new Float32Array(c.n); for (let i = 0; i < c.n; i++) times[i] = Math.min(i / anims.fps, c.d);
      const tracks = [];
      for (const [bone, kind, constant, data] of c.t) {
        const raw = i16(data), C = kind === 'q' ? 4 : 3, sc = kind === 'q' ? 1 / 32767 : 1 / 10000;
        const n = constant ? 1 : c.n, vals = new Float32Array(n * C);
        for (let i = 0; i < n * C; i++) vals[i] = raw[i] * sc;
        const tt = constant ? new Float32Array([0]) : times;
        tracks.push(kind === 'q' ? new THREE.QuaternionKeyframeTrack(bone + '.quaternion', tt, vals) : new THREE.VectorKeyframeTrack(bone + '.position', tt, vals));
      }
      clips[name] = new THREE.AnimationClip(name, c.d, tracks);
    }
    return { gltf, clips };
  })();
  assetsP.catch(() => { assetsP = null; });
  return assetsP;
}

// ---------------------------------------------------------------------------------------------
// constants / helpers
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const fract = (x) => x - Math.floor(x);
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
// UAL locomotion: measured foot ground speed (m/s at timeScale 1), duration, left-foot-forward phase offset
const LOCO = [
  { name: 'Walk_Loop', v: 1.03, d: 1.3333, off: 0.0 },
  { name: 'Jog_Fwd_Loop', v: 6.22, d: 0.9333, off: 0.95 },
  { name: 'Sprint_Loop', v: 9.45, d: 0.6667, off: 0.85 },
];
const BN = { P: 'pelvis', S1: 'spine_01', S2: 'spine_02', S3: 'spine_03', N: 'neck_01', H: 'Head', CL: 'clavicle_l', CR: 'clavicle_r', UL: 'upperarm_l', UR: 'upperarm_r', LL: 'lowerarm_l', LR: 'lowerarm_r', HL: 'hand_l', HR: 'hand_r', TL: 'thigh_l', TR: 'thigh_r', KL: 'calf_l', KR: 'calf_r', FL: 'foot_l', FR: 'foot_r', BL: 'ball_l', BR: 'ball_r' };
const MIRROR = { CL: 'CR', CR: 'CL', UL: 'UR', UR: 'UL', LL: 'LR', LR: 'LL', HL: 'HR', HR: 'HL', TL: 'TR', TR: 'TL', KL: 'KR', KR: 'KL', FL: 'FR', FR: 'FL', BL: 'BR', BR: 'BL' };
const PAT = { plain: 0, stripes: 1, hoops: 2, halves: 3, sash: 4, pinstripe: 5, kente: 6 };
export const SKIN = ['#3a2118', '#4b2b1d', '#5e3724', '#74472e', '#8f5d3d', '#b07a55', '#cf9f7c', '#e6bc9c'];
export const HAIR = ['#0e0b0a', '#1c1410', '#2e1f16', '#4a3020', '#6b4428', '#a87a45', '#c9a46a', '#7a2f1c'];
export const BOOTS = ['#111111', '#f5f5f5', '#ff3d00', '#ffd600', '#00e5ff', '#76ff03', '#d500f9', '#1565c0'];

// ---------------------------------------------------------------------------------------------
// authored football clips (char-space FK deltas, degrees, applied on top of the idle stance)
// sign conventions (character faces +Z, +X = character's left):
//  thigh flex fwd = -X, knee bend = +X, foot toes-down = +X, arm raise fwd = -X, elbow bend = -X,
//  left arm out = +Z, right arm out = -Z, spine bend fwd = +X, twist to the left = +Y, body tilt to the left = -Z
function D(o) { return o; }
const KICK = (back, cont, fol, opt = {}) => [
  [0, D({})],
  [0.14, D({ TL: [-28, 0, 0], KL: [25, 0, 0], TR: [back * 0.5, 0, 0], KR: [back * 1.2, 0, 0], UL: [-15, 0, 30], UR: [15, 0, -12], S1: [-4, 10, 0], pos: [0, -0.03, 0] })],
  [0.24, D({ TL: [-12, 0, 0], KL: [18, 0, 0], FL: [-8, 0, 0], TR: [back, opt.tw || 0, 0], KR: [back * 1.5 + 15, 0, 0], FR: [30, 0, 0], UL: [-25, 0, 55], UR: [30, 0, -28], S1: [opt.leanB || -6, 18, 0], S2: [0, 6, 0], pos: [0, -0.05, 0] })],
  [0.30, D({ TL: [-10, 0, 0], KL: [20, 0, 0], FL: [-8, 0, 0], TR: [cont, opt.tw || 0, 0], KR: [opt.kc || 22, 0, 0], FR: [opt.fc == null ? 25 : opt.fc, 0, 0], UL: [-20, 0, 60], UR: [-10, 0, -35], S1: [opt.leanC == null ? 10 : opt.leanC, -12, 0], S2: [4, -6, 0], H: [12, 0, 0], pos: [0, -0.06, 0.03] })],
  [0.42, D({ TL: [-6, 0, 0], KL: [14, 0, 0], FL: [5, 0, 0], TR: [fol, (opt.tw || 0) * 0.5, 0], KR: [opt.kf || 18, 0, 0], FR: [opt.fc == null ? 20 : opt.fc, 0, 0], UL: [-10, 0, 50], UR: [-25, 0, -30], S1: [opt.leanF == null ? 6 : opt.leanF, -18, 0], S2: [2, -6, 0], H: [8, 0, 0], pos: [0, opt.hop || -0.02, 0.1] })],
  [0.62, D({ TL: [-4, 0, 0], KL: [8, 0, 0], TR: [fol * 0.25, 0, 0], KR: [30, 0, 0], UL: [-5, 0, 22], UR: [-8, 0, -12], S1: [3, -6, 0], pos: [0, -0.01, 0.06] })],
  [0.8, D({})],
];
const TPL = {
  Pass: { d: 0.72, c: 0.30, keys: KICK(30, -32, -55, { tw: -32, kc: 15, fc: 5 }) },
  Shot: { d: 0.8, c: 0.30, keys: KICK(62, -42, -100, { kc: 25, fc: 50, kf: 25, leanC: 16, leanF: 12, hop: 0.06 }) },
  Lofted: { d: 0.8, c: 0.30, keys: KICK(55, -48, -112, { kc: 12, fc: 40, kf: 8, leanB: -14, leanC: -10, leanF: -14, hop: 0.03 }) },
  Poke: { d: 0.5, c: 0.2, keys: [[0, {}], [0.12, { TR: [10, 0, 0], KR: [60, 0, 0], S1: [10, 0, 0], pos: [0, -0.06, 0] }], [0.2, { TR: [-55, 0, 0], KR: [10, 0, 0], FR: [-10, 0, 0], TL: [10, 0, 0], KL: [45, 0, 0], S1: [18, 0, 0], UL: [-30, 0, 40], UR: [10, 0, -30], pos: [0, -0.22, 0.15] }], [0.34, { TR: [-40, 0, 0], KR: [20, 0, 0], KL: [35, 0, 0], S1: [12, 0, 0], UL: [-20, 0, 35], pos: [0, -0.15, 0.12] }], [0.5, {}]] },
  Slide: { d: 1.05, c: 0.2, keys: [[0, {}],
    [0.1, { TL: [-20, 0, 0], KL: [60, 0, 0], TR: [-40, 0, 0], KR: [30, 0, 0], P: [-20, 0, 0], S1: [10, 0, 0], UL: [-40, 0, 50], UR: [-30, 0, -40], pos: [0, -0.3, 0] }],
    [0.2, { P: [-62, 0, -18], S1: [22, 0, 0], S2: [10, 0, 0], H: [15, 0, 0], TR: [-8, 0, 0], KR: [5, 0, 0], FR: [-15, 0, 0], TL: [-5, 0, 10], KL: [95, 0, 0], UL: [-20, 0, 70], UR: [-70, 0, -35], LL: [-20, 0, 0], pos: [0, -0.72, 0.1] }],
    [0.62, { P: [-60, 0, -20], S1: [24, 0, 0], S2: [10, 0, 0], H: [15, 0, 0], TR: [-12, 0, 0], KR: [8, 0, 0], FR: [-15, 0, 0], TL: [0, 0, 10], KL: [100, 0, 0], UL: [-18, 0, 72], UR: [-60, 0, -40], LL: [-20, 0, 0], pos: [0, -0.74, 0.25] }],
    [0.85, { P: [-15, 0, -5], S1: [25, 0, 0], TL: [-60, 0, 0], KL: [110, 0, 0], TR: [-30, 0, 0], KR: [90, 0, 0], UL: [-30, 0, 40], UR: [-30, 0, -30], pos: [0, -0.45, 0.2] }],
    [1.05, {}]] },
  Header: { d: 0.9, c: 0.36, keys: [[0, {}],
    [0.14, { TL: [-40, 0, 0], TR: [-40, 0, 0], KL: [70, 0, 0], KR: [70, 0, 0], FL: [-25, 0, 0], FR: [-25, 0, 0], P: [18, 0, 0], UL: [10, 0, 25], UR: [10, 0, -25], pos: [0, -0.2, 0] }],
    [0.3, { TL: [-15, 0, 0], TR: [-5, 0, 0], KL: [40, 0, 0], KR: [30, 0, 0], FL: [30, 0, 0], FR: [30, 0, 0], S1: [-18, 0, 0], S2: [-8, 0, 0], H: [-10, 0, 0], UL: [-70, 0, 45], UR: [-70, 0, -45], LL: [-40, 0, 0], LR: [-40, 0, 0], pos: [0, 0.38, 0] }],
    [0.38, { TL: [-20, 0, 0], TR: [-10, 0, 0], KL: [50, 0, 0], KR: [40, 0, 0], FL: [30, 0, 0], FR: [30, 0, 0], S1: [20, 0, 0], S2: [10, 0, 0], H: [25, 0, 0], UL: [-40, 0, 55], UR: [-40, 0, -55], LL: [-30, 0, 0], LR: [-30, 0, 0], pos: [0, 0.42, 0.05] }],
    [0.6, { TL: [-30, 0, 0], TR: [-30, 0, 0], KL: [45, 0, 0], KR: [45, 0, 0], FL: [-10, 0, 0], FR: [-10, 0, 0], S1: [8, 0, 0], UL: [-15, 0, 35], UR: [-15, 0, -35], pos: [0, -0.08, 0.08] }],
    [0.9, {}]] },
  ThrowHold: { d: 1, loop: true, keys: [[0, { UL: [-165, 0, 22], UR: [-165, 0, -22], LL: [-95, 0, 0], LR: [-95, 0, 0], S1: [-8, 0, 0], S2: [-6, 0, 0], H: [-6, 0, 0], TL: [-12, 0, 0], KL: [8, 0, 0], TR: [8, 0, 0] }], [0.5, { UL: [-168, 0, 22], UR: [-168, 0, -22], LL: [-100, 0, 0], LR: [-100, 0, 0], S1: [-10, 0, 0], S2: [-7, 0, 0], H: [-6, 0, 0], TL: [-12, 0, 0], KL: [8, 0, 0], TR: [8, 0, 0] }], [1, { UL: [-165, 0, 22], UR: [-165, 0, -22], LL: [-95, 0, 0], LR: [-95, 0, 0], S1: [-8, 0, 0], S2: [-6, 0, 0], H: [-6, 0, 0], TL: [-12, 0, 0], KL: [8, 0, 0], TR: [8, 0, 0] }]] },
  Throw: { d: 1.0, c: 0.4, keys: [[0, { UL: [-165, 0, 22], UR: [-165, 0, -22], LL: [-95, 0, 0], LR: [-95, 0, 0], S1: [-8, 0, 0], S2: [-6, 0, 0], TL: [-12, 0, 0], KL: [8, 0, 0], TR: [8, 0, 0] }],
    [0.28, { UL: [-175, 0, 22], UR: [-175, 0, -22], LL: [-115, 0, 0], LR: [-115, 0, 0], S1: [-20, 0, 0], S2: [-12, 0, 0], H: [-10, 0, 0], TL: [-15, 0, 0], KL: [12, 0, 0], TR: [12, 0, 0], KR: [10, 0, 0], pos: [0, 0, -0.04] }],
    [0.4, { UL: [-140, 0, 18], UR: [-140, 0, -18], LL: [-40, 0, 0], LR: [-40, 0, 0], S1: [12, 0, 0], S2: [6, 0, 0], TL: [-15, 0, 0], KL: [12, 0, 0], TR: [10, 0, 0] }],
    [0.55, { UL: [-95, 0, 14], UR: [-95, 0, -14], LL: [-10, 0, 0], LR: [-10, 0, 0], S1: [22, 0, 0], S2: [8, 0, 0], H: [5, 0, 0], TL: [-15, 0, 0], KL: [12, 0, 0], TR: [10, 0, 0], pos: [0, -0.03, 0.04] }],
    [1.0, {}]] },
  GK_Set: { d: 1.6, loop: true, keys: [0, 0.8, 1.6].map((t, i) => [t, { pos: [0, i === 1 ? -0.2 : -0.18, 0], TL: [-38, 0, 9], TR: [-38, 0, -9], KL: [62, 0, 0], KR: [62, 0, 0], FL: [-22, 0, 0], FR: [-22, 0, 0], S1: [i === 1 ? 26 : 24, 0, 0], S2: [6, 0, 0], H: [-22, 0, 0], UL: [-40, 0, 28], UR: [-40, 0, -28], LL: [-55, 0, 0], LR: [-55, 0, 0], HL: [0, 0, 0] }]) },
  Dive_L: { d: 1.7, c: 0.32, keys: [[0, { pos: [0, -0.18, 0], TL: [-38, 0, 9], TR: [-38, 0, -9], KL: [62, 0, 0], KR: [62, 0, 0], FL: [-22, 0, 0], FR: [-22, 0, 0], S1: [24, 0, 0], H: [-22, 0, 0], UL: [-40, 0, 28], UR: [-40, 0, -28], LL: [-55, 0, 0], LR: [-55, 0, 0] }],
    [0.1, { pos: [0.18, -0.3, 0], P: [0, 0, -15], TL: [-30, 0, 20], KL: [55, 0, 0], TR: [-45, 0, -5], KR: [80, 0, 0], S1: [15, 0, 0], UL: [-90, 0, 40], UR: [-90, 0, -10], LL: [-30, 0, 0], LR: [-30, 0, 0] }],
    [0.32, { pos: [0.95, 0.05, 0], P: [0, 0, -72], S1: [0, 0, -8], TL: [0, 0, 8], TR: [-10, 0, -15], KR: [25, 0, 0], KL: [10, 0, 0], FL: [30, 0, 0], FR: [30, 0, 0], UL: [-170, 0, 10], UR: [-168, 0, -5], LL: [-10, 0, 0], LR: [-10, 0, 0], H: [0, 0, -15] }],
    [0.55, { pos: [1.35, -0.55, 0], P: [0, 0, -86], S1: [0, 0, -6], TL: [-5, 0, 5], TR: [-20, 0, -10], KR: [35, 0, 0], KL: [15, 0, 0], FL: [30, 0, 0], FR: [30, 0, 0], UL: [-170, 0, 8], UR: [-165, 0, -2], LL: [-15, 0, 0], LR: [-15, 0, 0], H: [0, 0, -10] }],
    [0.95, { pos: [1.4, -0.68, 0], P: [0, 0, -88], S1: [10, 0, 0], TL: [-20, 0, 5], TR: [-35, 0, -10], KL: [40, 0, 0], KR: [50, 0, 0], UL: [-120, 0, 30], UR: [-130, 0, -10], LL: [-70, 0, 0], LR: [-70, 0, 0] }],
    [1.3, { pos: [1.0, -0.5, 0], P: [20, 0, -35], S1: [20, 0, 0], TL: [-70, 0, 0], KL: [120, 0, 0], TR: [-10, 0, 0], KR: [110, 0, 0], UL: [-50, 0, 30], UR: [-50, 0, -30], LL: [-50, 0, 0], LR: [-50, 0, 0] }],
    [1.7, { pos: [0.6, 0, 0] }]] },
  Catch: { d: 0.8, c: 0.22, keys: [[0, { pos: [0, -0.15, 0], TL: [-30, 0, 8], TR: [-30, 0, -8], KL: [50, 0, 0], KR: [50, 0, 0], FL: [-15, 0, 0], FR: [-15, 0, 0], S1: [22, 0, 0], UL: [-40, 0, 25], UR: [-40, 0, -25], LL: [-55, 0, 0], LR: [-55, 0, 0] }],
    [0.2, { pos: [0, -0.12, 0], TL: [-25, 0, 6], TR: [-25, 0, -6], KL: [45, 0, 0], KR: [45, 0, 0], FL: [-15, 0, 0], FR: [-15, 0, 0], S1: [25, 0, 0], S2: [6, 0, 0], UL: [-75, 0, 8], UR: [-75, 0, -8], LL: [-25, 0, 0], LR: [-25, 0, 0], H: [5, 0, 0] }],
    [0.45, { pos: [0, -0.05, 0], TL: [-10, 0, 0], TR: [-10, 0, 0], KL: [20, 0, 0], KR: [20, 0, 0], S1: [18, 0, 0], UL: [-40, 0, 14], UR: [-40, 0, -14], LL: [-105, 0, 0], LR: [-105, 0, 0], H: [10, 0, 0] }],
    [0.8, { S1: [6, 0, 0], UL: [-30, 0, 14], UR: [-30, 0, -14], LL: [-100, 0, 0], LR: [-100, 0, 0] }]] },
  Fall: { d: 1.9, keys: [[0, {}], [0.18, { P: [20, 0, 0], S1: [15, 0, 0], TL: [-30, 0, 0], KL: [40, 0, 0], UL: [-50, 0, 30], UR: [-50, 0, -30], pos: [0, -0.15, 0.15] }],
    [0.42, { P: [60, 0, 0], TL: [-50, 0, 0], TR: [-35, 0, 0], KL: [95, 0, 0], KR: [90, 0, 0], UL: [-85, 0, 20], UR: [-85, 0, -20], LL: [-20, 0, 0], LR: [-20, 0, 0], H: [-35, 0, 0], pos: [0, -0.62, 0.35] }],
    [0.7, { P: [78, 0, 0], TL: [-60, 0, 0], TR: [-60, 0, 0], KL: [100, 0, 0], KR: [100, 0, 0], UL: [-95, 0, 20], UR: [-95, 0, -20], LL: [-15, 0, 0], LR: [-15, 0, 0], H: [-45, 0, 0], pos: [0, -0.7, 0.45] }],
    [1.3, { P: [40, 0, 0], TL: [-80, 0, 0], TR: [-60, 0, 0], KL: [120, 0, 0], KR: [115, 0, 0], UL: [-40, 0, 20], UR: [-40, 0, -20], H: [-20, 0, 0], pos: [0, -0.55, 0.3] }],
    [1.9, {}]] },
  // celebrations / reactions (looping)
  Cel_Knee: { d: 1.2, loop: true, keys: [0, 0.6, 1.2].map((t, i) => [t, { pos: [0, -0.5, 0], P: [-22, 0, 0], S1: [-10, 0, 0], S2: [-6, 0, 0], H: [-18, 0, 0], TL: [12, 0, 6], TR: [12, 0, -6], KL: [105, 0, 0], KR: [105, 0, 0], FL: [40, 0, 0], FR: [40, 0, 0], UL: [-120 - i * 8, 0, 62], UR: [-120 - i * 8, 0, -62], LL: [-15, 0, 0], LR: [-15, 0, 0] }]) },
  Cel_Arms: { d: 0.8, loop: true, upper: true, keys: [0, 0.4, 0.8].map((t, i) => [t, { UL: [-160 + i * 12, 0, 30], UR: [-160 + i * 12, 0, -30], LL: [-10, 0, 0], LR: [-10, 0, 0], H: [-15, 0, 0], S1: [-6, 0, 0] }]) },
  Cel_Plane: { d: 1.0, loop: true, upper: true, keys: [0, 0.5, 1.0].map((t, i) => [t, { UL: [0, 0, 82], UR: [0, 0, -82], LL: [0, 0, 0], LR: [0, 0, 0], P: [0, 0, i === 1 ? 14 : -14], S1: [8, 0, 0] }]) },
  Cel_Fist: { d: 0.7, loop: true, keys: [[0, { UR: [-150, 0, -20], LR: [-30, 0, 0], UL: [-20, 0, 20], LL: [-80, 0, 0], S1: [-8, 0, 0], H: [-20, 0, 0], TR: [-35, 0, 0], KR: [70, 0, 0] }], [0.35, { UR: [-120, 0, -20], LR: [-120, 0, 0], UL: [-30, 0, 20], LL: [-90, 0, 0], S1: [10, 0, 0], H: [-10, 0, 0], TR: [-10, 0, 0], KR: [20, 0, 0], pos: [0, -0.05, 0] }], [0.7, { UR: [-150, 0, -20], LR: [-30, 0, 0], UL: [-20, 0, 20], LL: [-80, 0, 0], S1: [-8, 0, 0], H: [-20, 0, 0], TR: [-35, 0, 0], KR: [70, 0, 0] }]] },
  Cel_Jump: { d: 0.9, loop: true, keys: [[0, { TL: [-35, 0, 0], TR: [-35, 0, 0], KL: [70, 0, 0], KR: [70, 0, 0], FL: [-20, 0, 0], FR: [-20, 0, 0], P: [15, 0, 0], UL: [-30, 0, 20], UR: [-30, 0, -20], pos: [0, -0.22, 0] }], [0.3, { TL: [-10, 0, 0], TR: [-10, 0, 0], KL: [30, 0, 0], KR: [30, 0, 0], FL: [35, 0, 0], FR: [35, 0, 0], S1: [-12, 0, 0], H: [-20, 0, 0], UL: [-170, 0, 25], UR: [-170, 0, -25], pos: [0, 0.45, 0] }], [0.55, { TL: [-15, 0, 0], TR: [-15, 0, 0], KL: [30, 0, 0], KR: [30, 0, 0], FL: [25, 0, 0], FR: [25, 0, 0], UL: [-165, 0, 25], UR: [-165, 0, -25], pos: [0, 0.2, 0] }], [0.9, { TL: [-35, 0, 0], TR: [-35, 0, 0], KL: [70, 0, 0], KR: [70, 0, 0], FL: [-20, 0, 0], FR: [-20, 0, 0], P: [15, 0, 0], UL: [-30, 0, 20], UR: [-30, 0, -20], pos: [0, -0.22, 0] }]] },
  Dejected: { d: 2.4, loop: true, upper: true, keys: [0, 1.2, 2.4].map((t, i) => [t, { UL: [-150, 0, 40], UR: [-150, 0, -40], LL: [-150, 0, 0], LR: [-150, 0, 0], S1: [14 + i * 3, 0, 0], H: [22, 0, 0] }]) },
  Hands_Hips: { d: 2.0, loop: true, upper: true, keys: [0, 1, 2].map((t, i) => [t, { UL: [10, 0, 40], UR: [10, 0, -40], LL: [-80, 30, 0], LR: [-80, -30, 0], S1: [6 + i * 2, 0, 0], H: [12 + i * 3, 0, 0] }]) },
  Ref_Point: { d: 1, loop: true, upper: true, keys: [0, 1].map((t) => [t, { UR: [-95, 0, -25], LR: [-5, 0, 0], H: [0, -20, 0] }]) },
  GK_Hold: { d: 1, loop: true, upper: true, keys: [0, 1].map((t) => [t, { UL: [-32, 0, 14], UR: [-32, 0, -14], LL: [-102, 0, 0], LR: [-102, 0, 0], S1: [4, 0, 0] }]) },
};
// mirror a key list (left-foot versions / dive right)
function mirrorKeys(keys) {
  return keys.map(([t, k]) => { const o = {}; for (const [b, v] of Object.entries(k)) { const nb = MIRROR[b] || b; o[nb] = b === 'pos' ? [-v[0], v[1], v[2]] : [v[0], -v[1], -v[2]]; } return [t, o]; });
}
TPL.Dive_R = { ...TPL.Dive_L, keys: mirrorKeys(TPL.Dive_L.keys) };
for (const k of ['Pass', 'Shot', 'Lofted', 'Poke', 'Slide']) TPL[k + '_M'] = { ...TPL[k], keys: mirrorKeys(TPL[k].keys) };

// sample the key list at time t with Catmull-Rom (Hermite) per channel
function sampleKeys(keys, t, chan) {
  const n = keys.length; let i = 0; while (i < n - 2 && keys[i + 1][0] <= t) i++;
  const [t0, k0] = keys[i], [t1, k1] = keys[Math.min(n - 1, i + 1)];
  const get = (k) => (k[chan[0]] ? k[chan[0]][chan[1]] : 0);
  const p0 = get(k0), p1 = get(k1); if (t1 <= t0) return p1;
  const u = clamp((t - t0) / (t1 - t0), 0, 1), h = t1 - t0;
  const tan = (j) => { if (j <= 0 || j >= n - 1) return 0; return (get(keys[j + 1][1]) - get(keys[j - 1][1])) / (keys[j + 1][0] - keys[j - 1][0]); };
  const m0 = tan(i) * h, m1 = tan(Math.min(n - 1, i + 1)) * h;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
}

// ---------------------------------------------------------------------------------------------
// kit / human skin shader (one material per player, one shared GPU program)
const VERT_PARS = `
attribute float _region;
uniform vec4 uK1; uniform mat4 uDQ; uniform vec3 uHideP; uniform vec3 uAfroC;
varying vec3 vBind; varying vec3 vBindN; varying float vReg;`;
const VERT_MAIN = `
vReg = _region;
vBind = (uDQ * vec4(position, 1.0)).xyz;
vBindN = normalize(mat3(uDQ) * objectNormal);
{ float hs = uK1.z, rg = _region; bool hide = false;
  if (rg > 2.5 && rg < 3.5) hide = !(hs < 0.5 || (hs > 1.5 && hs < 2.5));
  else if (rg > 3.5 && rg < 4.5) hide = !(hs > 0.5 && hs < 1.5);
  else if (rg > 4.5 && rg < 5.5) hide = !(hs > 2.5 && hs < 3.5);
  else if (rg > 5.5) hide = uK1.w < 0.5;
  if (hide) transformed = uHideP;
  else if (rg > 2.5 && rg < 3.5 && hs > 1.5) transformed = uAfroC + (transformed - uAfroC) * vec3(1.24, 1.22, 1.26);
}`;
const FRAG_PARS = `
uniform vec4 uK1; uniform vec3 uSkin, uHair, uShirt, uC2, uShorts, uSocks, uBoots, uGlove, uNumC, uNumO; uniform vec3 uNum; uniform sampler2D uNumTex;
varying vec3 vBind; varying vec3 vBindN; varying float vReg;
vec3 humanSkin(vec3 base, vec3 p, vec3 n, float det) {
  // Subsurface scattering warmth in mid/shadow tones + realistic anatomical muscle/face contours
  vec3 sss = mix(base * vec3(1.12, 0.78, 0.68), base, smoothstep(0.45, 1.05, det));
  float anatomical = 1.0;
  // Calf and quad muscle definition on legs
  if (p.y > 0.46 && p.y < 0.64) {
    anatomical += 0.08 * sin((p.y - 0.46) * 28.0) * (1.0 - smoothstep(0.02, 0.11, abs(abs(p.x) - 0.085)));
  }
  // Forearm & bicep definition
  if (abs(p.x) > 0.34 && p.y > 1.25) {
    anatomical += 0.06 * clamp(n.y, -0.5, 0.8);
  }
  vec3 col = sss * clamp(det * anatomical, 0.42, 1.45);
  // Realistic human facial features on front of head (p.y ~ 1.56..1.77, p.z > 0)
  if (p.y > 1.54 && p.y < 1.78 && p.z > -0.02) {
    float ax = abs(p.x), y = p.y;
    // Cheekbone & forehead natural highlight
    float cheek = exp(-pow((ax - 0.036) / 0.022, 2.0) - pow((y - 1.635) / 0.022, 2.0));
    float browBone = exp(-pow(ax / 0.048, 2.0) - pow((y - 1.678) / 0.012, 2.0));
    col += vec3(0.055, 0.04, 0.03) * (cheek * 0.7 + browBone * 0.5) * step(0.03, p.z);
    // Eye sockets subtle depth
    float socket = exp(-pow((ax - 0.027) / 0.016, 2.0) - pow((y - 1.660) / 0.011, 2.0)) * step(0.04, p.z);
    col *= 1.0 - 0.18 * socket;
    // Eyebrows
    float browY = 1.677 + (ax - 0.014) * 0.08;
    float brow = smoothstep(0.0045, 0.0015, abs(y - browY)) * smoothstep(0.011, 0.015, ax) * (1.0 - smoothstep(0.040, 0.046, ax)) * step(0.045, p.z);
    col = mix(col, uHair * 0.65, brow * 0.88);
    // Eyes (sclera, iris, pupil, upper lash line)
    vec2 eyeD = vec2((ax - 0.026) / 0.0115, (y - 1.659) / 0.0058);
    float eyeR = length(eyeD);
    if (eyeR < 1.0 && p.z > 0.045) {
      vec3 sclera = vec3(0.94, 0.93, 0.92);
      float irisR = length(vec2((ax - 0.0255) / 0.0058, (y - 1.659) / 0.0055));
      vec3 iris = mix(vec3(0.22, 0.13, 0.07), vec3(0.04, 0.04, 0.05), smoothstep(0.55, 0.25, irisR));
      // Eye catchlight
      float glint = smoothstep(0.28, 0.05, length(vec2((ax - 0.024) / 0.004, (y - 1.6605) / 0.004)));
      iris += vec3(0.75) * glint;
      vec3 eyeCol = mix(sclera, iris, smoothstep(1.0, 0.72, irisR));
      float lash = smoothstep(0.75, 1.0, eyeR) * step(1.659, y);
      eyeCol = mix(eyeCol, uHair * 0.35, lash * 0.75);
      col = mix(col, eyeCol, smoothstep(1.0, 0.78, eyeR));
    }
    // Nose bridge highlight & nostrils
    float bridge = exp(-pow(ax / 0.007, 2.0)) * smoothstep(1.622, 1.662, y) * (1.0 - smoothstep(1.662, 1.675, y)) * step(0.05, p.z);
    col += vec3(0.045, 0.035, 0.028) * bridge;
    float nostril = exp(-pow((ax - 0.0085) / 0.0045, 2.0) - pow((y - 1.620) / 0.0032, 2.0)) * step(0.048, p.z);
    col *= 1.0 - 0.38 * nostril;
    // Natural lips & mouth line
    float lipDist = abs(y - 1.596), lipW = smoothstep(0.022, 0.015, ax) * step(0.045, p.z);
    vec3 lipTone = mix(base * vec3(0.88, 0.56, 0.54), base * vec3(0.76, 0.52, 0.50), 0.5);
    col = mix(col, lipTone, smoothstep(0.0065, 0.002, lipDist) * lipW * 0.72);
    col *= 1.0 - 0.28 * smoothstep(0.0018, 0.0004, abs(y - 1.5965)) * lipW;
    // Subtle jawline & stubble/beard shadow
    if (uK1.w > 0.5 && y < 1.625 && p.z > 0.01) {
      float jaw = smoothstep(1.625, 1.595, y) * smoothstep(0.0, 0.035, p.z);
      float mustache = smoothstep(0.0055, 0.0015, abs(y - 1.606)) * smoothstep(0.022, 0.012, ax);
      col = mix(col, uHair * 0.72, clamp(jaw * 0.45 + mustache * 0.55, 0.0, 0.75));
    }
  }
  return col;
}
vec3 kitCol(vec3 p, float reg, float det) {
  vec3 skin = humanSkin(uSkin, p, vBindN, det);
  if (reg > 0.5) {
    float strand = 0.92 + 0.16 * sin(p.x * 190.0 + p.z * 170.0 + p.y * 90.0);
    if (reg < 1.5) return uHair * 0.82 * (0.65 + 0.38 * det) * strand;
    if (reg < 2.5) return vec3(0.95) * det;
    return uHair * (0.68 + 0.42 * det) * strand;
  }
  float ax = abs(p.x), y = p.y, mode = uK1.y;
  // Realistic jersey fabric micro-folds & shading
  float fold = 0.96 + 0.045 * sin(p.y * 55.0 + p.x * 28.0) + 0.03 * cos(p.x * 48.0 - p.z * 35.0);
  float kd = mix(1.0, det, 0.26) * fold;
  vec3 sleeveC = mode > 1.5 ? uShorts : uShirt;
  if (ax > 0.205 && y > 1.30) {
    if (ax > 0.70) return mode > 0.5 && mode < 1.5 ? uGlove * kd : skin;
    float sl = mode > 0.5 ? 0.69 : 0.37;
    if (ax < sl) {
      // Captain's armband on left sleeve for outfield captain
      if (mode < 0.5 && p.x > 0.27 && p.x < 0.325) return vec3(0.98, 0.78, 0.05) * kd;
      return (ax > sl - 0.025 && mode < 1.5 ? uC2 : sleeveC) * kd;
    }
    return skin;
  }
  float top = ax < 0.075 ? (p.z > 0.0 ? 1.455 : 1.5) : (ax < 0.13 ? 1.52 : 1.58);
  if (y > top) return skin;
  if (y > 0.965) {
    vec3 c = uShirt; float pat = uK1.x;
    if (y > top - 0.024 && mode < 1.5) return uC2 * kd;
    if (pat > 0.5 && pat < 1.5) c = mix(c, uC2, step(0.5, fract(p.x / 0.1 + 0.25)));
    else if (pat < 2.5 && pat > 1.5) c = mix(c, uC2, step(0.5, fract((y - 0.965) / 0.11)));
    else if (pat < 3.5 && pat > 2.5) c = mix(c, uC2, step(0.0, p.x));
    else if (pat < 4.5 && pat > 3.5) c = mix(c, uC2, step(abs(p.x * 0.85 - (y - 1.22)), 0.055));
    else if (pat < 5.5 && pat > 4.5) c = mix(c, uC2, step(0.82, fract(p.x / 0.045)));
    else if (pat < 6.5 && pat > 5.5) { vec2 cc = floor(vec2(p.x / 0.07, (y - 0.965) / 0.07)); float k = mod(cc.x + cc.y, 3.0); c = k < 0.5 ? uC2 : (k < 1.5 ? vec3(0.95, 0.68, 0.03) : uShirt); float ln = step(0.86, fract((y - 0.965) / 0.07)); c = mix(c, vec3(0.02), ln); }
    else if (pat > 6.5) { float yy = mod(y - 1.08, 0.1); c = mix(c, vec3(0.6, 0.62, 0.6), step(yy, 0.022) * step(y, 1.3)); }
    // Shoulder three-stripe athletic trim
    if (mode < 1.5 && y > 1.44 && ax > 0.11 && ax < 0.20) {
      float st = step(0.62, fract(ax * 55.0));
      c = mix(c, uC2, st * 0.7);
    }
    if (uNum.z > 0.5 && p.z < -0.03 && ax < 0.15 && y > 1.07 && y < 1.37) {
      vec2 uv = vec2(0.5 - p.x / 0.3, (y - 1.07) / 0.3); vec4 n = texture2D(uNumTex, (uNum.xy + uv) / 10.0);
      c = mix(c, uNumO, n.g); c = mix(c, uNumC, n.r);
    }
    if (mode < 1.5 && p.z > 0.05 && length(vec2(p.x - 0.085, y - 1.33)) < 0.03) c = length(vec2(p.x - 0.085, y - 1.33)) < 0.022 ? uC2 : vec3(0.95, 0.75, 0.1);
    return c * kd;
  }
  if (y > 0.62) {
    if (mode < 1.5 && (y < 0.642 || (ax > 0.165 && abs(p.z) < 0.025))) return uC2 * kd;
    return uShorts * kd;
  }
  if (y > 0.495) return mode > 1.5 ? uShorts * kd : skin;
  if (y > 0.115) {
    // Sock fold-over cuff + ankle tape
    if (y > 0.44 && y < 0.478 && mode < 1.5) return uC2 * kd;
    if (y < 0.155 && mode < 1.5) return vec3(0.94, 0.94, 0.96) * kd;
    return uSocks * kd;
  }
  // Sculpted football boots with soleplate & heel counter
  if (y < 0.024) return mix(vec3(0.12), uBoots * 0.45, step(0.012, y)) * kd;
  return (p.z > 0.04 && y > 0.045 && y < 0.075 ? mix(uBoots, vec3(0.95), 0.35) : uBoots) * kd;
}`;
const FRAG_MAP = `
{ vec4 texel = texture2D(map, vMapUv); float lu = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
  float det = clamp(lu / 0.2284, 0.38, 1.62); diffuseColor.rgb *= kitCol(vBind, vReg, det); }`;

let numAtlas = null;
function numberAtlas() {
  if (numAtlas) return numAtlas;
  const c = document.createElement('canvas'); c.width = c.height = 640; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 640, 640); g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let n = 0; n < 100; n++) {
    const cx = (n % 10) * 64 + 32, cy = Math.floor(n / 10) * 64 + 34, s = String(n);
    g.font = `900 ${s.length > 1 ? 40 : 46}px Arial Black, Arial, sans-serif`;
    g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = '#00ff00'; g.strokeText(s, cx, cy); g.fillStyle = '#ff0000'; g.fillText(s, cx, cy);
  }
  numAtlas = new THREE.CanvasTexture(c); numAtlas.colorSpace = THREE.NoColorSpace; numAtlas.anisotropy = 2; return numAtlas;
}
const col = (h) => new THREE.Color(h);
function lumHex(h) { const c = new THREE.Color(h); return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; }
function makeMaterials(sys, look) {
  const U = {
    uK1: { value: new THREE.Vector4(PAT[look.pattern] || (look.pattern === 'hivis' ? 7 : 0), look.mode || 0, look.hairStyle || 0, look.beard ? 1 : 0) },
    uDQ: { value: sys.dq[0].DQ }, uHideP: { value: sys.dq[0].hideP }, uAfroC: { value: sys.dq[0].afroC },
    uSkin: { value: col(look.skin) }, uHair: { value: col(look.hair) }, uShirt: { value: col(look.shirt) }, uC2: { value: col(look.c2 || '#ffffff') },
    uShorts: { value: col(look.shorts) }, uSocks: { value: col(look.socks) }, uBoots: { value: col(look.boots) }, uGlove: { value: col(look.gloves || '#f0f0f0') },
    uNumC: { value: col('#ffffff') }, uNumO: { value: col('#000000') }, uNum: { value: new THREE.Vector3(0, 0, 0) }, uNumTex: { value: numberAtlas() },
  };
  if (look.number != null) {
    const n = clamp(look.number | 0, 0, 99), light = lumHex(look.shirt) > 0.45;
    U.uNum.value.set(n % 10, 9 - Math.floor(n / 10), 1);
    U.uNumC.value = col(light ? '#111111' : '#ffffff'); U.uNumO.value = col(light ? '#ffffff' : '#111111');
    if (look.c2 && Math.abs(lumHex(look.c2) - lumHex(look.shirt)) > 0.35 && PAT[look.pattern] === 0) U.uNumC.value = col(look.c2);
  }
  const mat = new THREE.MeshPhongMaterial({
    map: sys.skinTex,
    specular: new THREE.Color('#26221e'),
    shininess: 22,
  });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>' + VERT_PARS).replace('#include <begin_vertex>', '#include <begin_vertex>' + VERT_MAIN);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + FRAG_PARS).replace('#include <map_fragment>', FRAG_MAP);
  };
  mat.customProgramCacheKey = () => 'kk_player_human_v2';
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float _region; uniform vec4 uK1; uniform vec3 uHideP; uniform vec3 uAfroC; uniform mat4 uDQ; varying vec3 vBind; varying vec3 vBindN; varying float vReg;').replace('#include <begin_vertex>', '#include <begin_vertex>' + VERT_MAIN);
  };
  depth.customProgramCacheKey = () => 'kk_player_depth_v2';
  return { mat, depth, U };
}

// ---------------------------------------------------------------------------------------------
// the system: shared assets, baked authored clips, per-player rigs
export function createPlayerSystem(scene, A, opts = {}) {
  const sys = { scene, A, scale: opts.scale || 1.12, high: !!opts.high, rigs: new Set(), t: 0, lodDist: opts.lodDist || (opts.high ? 56 : 40), blobGeo: opts.blobGeo, blobMat: opts.blobMat };
  const tpl = A.gltf.scene;
  // skin texture + dequantisation matrix (mesh positions are quantised; bones hold the metric transform)
  let sm0 = null; sys.dq = [];
  tpl.updateMatrixWorld(true);
  tpl.traverse((o) => {
    if (!o.isSkinnedMesh) return; if (!sm0) sm0 = o;
    const DQ = new THREE.Matrix4().multiplyMatrices(o.skeleton.bones[0].matrixWorld, o.skeleton.boneInverses[0]), DQi = DQ.clone().invert();
    sys.dq[o.name.includes('lod1') ? 1 : 0] = { DQ, hideP: new THREE.Vector3(0, 1.66, -0.02).applyMatrix4(DQi), afroC: new THREE.Vector3(0, 1.69, -0.03).applyMatrix4(DQi) };
  });
  if (!sys.dq[1]) sys.dq[1] = sys.dq[0];
  sys.skinTex = sm0.material.map; sys.skinTex.anisotropy = 4;
  // base pose = Idle_Loop frame 0
  const probe = SkeletonUtils.clone(tpl), pm = new THREE.AnimationMixer(probe);
  pm.clipAction(A.clips.Idle_Loop).play(); pm.setTime(0);
  const base = {}, baseW = {}, q = new THREE.Quaternion();
  const worldQ = (bone, out) => { out.identity(); for (let n = bone; n && n !== probe; n = n.parent) out.premultiply(n.quaternion); return out; };
  // note: premultiply walks child->parent so result = parent...child
  for (const [k, name] of Object.entries(BN)) {
    const b = probe.getObjectByName(name); base[k] = b.quaternion.clone();
    const pw = new THREE.Quaternion(); worldQ(b.parent, pw); baseW[k] = pw; // parent world rotation (char space)
  }
  const pel = probe.getObjectByName('pelvis'); probe.updateMatrixWorld(true);
  const basePos = pel.position.clone();
  const toPelvisParent = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().copy(probe.matrixWorld).invert().multiply(pel.parent.matrixWorld)).invert();
  sys.base = base; sys.baseW = baseW;
  // bake authored templates into AnimationClips (+ keep raw quats for overlays)
  const e = new THREE.Euler(), R = new THREE.Quaternion(), tmp = new THREE.Quaternion(), v = new THREE.Vector3();
  function poseQuat(k, dx, dy, dz, out) {
    e.set(dx * D2R, dy * D2R, dz * D2R, 'XYZ'); R.setFromEuler(e);
    tmp.copy(baseW[k]).invert(); out.copy(tmp).multiply(R).multiply(baseW[k]).multiply(base[k]); return out;
  }
  sys.poseQuat = poseQuat;
  const clips = { ...A.clips }, overlay = {};
  for (const [name, T] of Object.entries(TPL)) {
    const n = Math.max(2, Math.round(T.d * 30) + 1), times = new Float32Array(n), tracks = [];
    for (let i = 0; i < n; i++) times[i] = (T.d * i) / (n - 1);
    const used = new Set(); T.keys.forEach(([, k]) => Object.keys(k).forEach((b) => used.add(b)));
    const ov = {};
    for (const k of Object.keys(BN)) {
      const vals = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { poseQuat(k, sampleKeys(T.keys, times[i], [k, 0]), sampleKeys(T.keys, times[i], [k, 1]), sampleKeys(T.keys, times[i], [k, 2]), tmp.identity()); const o = tmp.clone(); vals.set([o.x, o.y, o.z, o.w], i * 4); }
      tracks.push(new THREE.QuaternionKeyframeTrack(BN[k] + '.quaternion', times, vals));
      if (T.upper && used.has(k)) ov[k] = vals;
    }
    const pv = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { v.set(sampleKeys(T.keys, times[i], ['pos', 0]), sampleKeys(T.keys, times[i], ['pos', 1]), sampleKeys(T.keys, times[i], ['pos', 2])).applyMatrix3(toPelvisParent).add(basePos); pv.set([v.x, v.y, v.z], i * 3); }
    tracks.push(new THREE.VectorKeyframeTrack('pelvis.position', times, pv));
    clips[name] = new THREE.AnimationClip(name, T.d, tracks);
    if (T.upper) overlay[name] = { n, d: T.d, q: ov };
  }
  sys.clips = clips; sys.overlay = overlay;
  sys.TPL = TPL;
  sys.dispose = () => { for (const r of sys.rigs) r.dispose(); sys.rigs.clear(); };
  sys.add = (look) => { const r = new Rig(sys, look); sys.rigs.add(r); return r; };
  sys.remove = (r) => { r.dispose(); sys.rigs.delete(r); };
  sys.update = (m, dt, camera, entries) => updateAll(sys, m, dt, camera, entries);
  sys.ballPos = () => sys.ballOv;
  return sys;
}

// ---------------------------------------------------------------------------------------------
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
class Rig {
  constructor(sys, look) {
    this.sys = sys; this.look = look;
    this.root = new THREE.Group();
    this.model = SkeletonUtils.clone(sys.A.gltf.scene); this.root.add(this.model);
    const s = (look.size || 1) * sys.scale; this.sc = s; this.model.scale.set(s * 1.0, s * 1.01, s * 0.99);
    const M = makeMaterials(sys, look); this.M = M;
    this.meshes = [];
    this.model.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      o.material = M.mat; o.customDepthMaterial = M.depth; o.frustumCulled = false;
      o.castShadow = sys.high && !look.noShadow; o.receiveShadow = false;
      if (o.name.includes('lod1')) this.lod1 = o; else this.lod0 = o;
      this.meshes.push(o);
    });
    this.setLod(look.forceLod1 ? 1 : 0);
    this.bones = {}; for (const [k, n] of Object.entries(BN)) this.bones[k] = this.model.getObjectByName(n);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.acts = {};
    this.phase = Math.random(); this.idleT = Math.random() * 2.5; this.yaw = 0; this.yawRate = 0; this.prevSpd = 0; this.accF = 0;
    this.shots = []; this.stanceW = {}; this.stance = null; this.upper = null; this.upperW = 0; this.upperT = 0; this.ovW = {};
    this.tw = 0; this.lean = 0; this.pitch = 0; this.acc = 0; this.skip = 0; this.left = !!look.leftFoot;
    this.headYaw = 0; this.headPitch = 0;
    if (opts_blob(sys)) { this.blob = new THREE.Mesh(sys.blobGeo, sys.blobMat); this.blob.renderOrder = 1; this.blob.scale.setScalar(1.15); sys.scene.add(this.blob); }
    sys.scene.add(this.root);
  }
  setLod(l) {
    if (this.lod === l) return; this.lod = l; if (this.lod0) this.lod0.visible = l === 0 || !this.lod1; if (this.lod1) this.lod1.visible = l === 1 || !this.lod0;
    const Q = this.sys.dq[l === 1 && this.lod1 ? 1 : 0], U = this.M.U; U.uDQ.value = Q.DQ; U.uHideP.value = Q.hideP; U.uAfroC.value = Q.afroC;
  }
  act(name) {
    let a = this.acts[name]; if (a) return a;
    const clip = this.sys.clips[name]; if (!clip) return null;
    a = this.mixer.clipAction(clip); a.setLoop(THREE.LoopRepeat, Infinity); a.play(); a.setEffectiveWeight(0); a.paused = false; a.timeScale = 0;
    this.acts[name] = a; return a;
  }
  // full-body one-shot with crossfade; t0 = start time inside the clip
  play(name, { t0 = 0, rate = 1, fadeIn = 0.08, fadeOut = 0.2 } = {}) {
    const clip = this.sys.clips[name]; if (!clip) return;
    for (const s of this.shots) s.out = true;
    this.shots.push({ name, a: this.act(name), t: t0, d: clip.duration, rate, w: 0, fi: fadeIn, fo: fadeOut, out: false });
  }
  busy() { return this.shots.some((s) => !s.out); }
  current() { const s = this.shots.find((x) => !x.out); return s ? s.name : null; }
  setStance(name) { this.stance = name; }
  setUpper(name) { if (name !== this.upper) { this.upper = name; this.upperT = 0; } }
  // world position of a bone (after update)
  bonePos(k, out) { this.root.updateMatrixWorld(true); return this.bones[k].getWorldPosition(out); }
  rotChar(k, x, y, z, w = 1) {
    const b = this.bones[k]; if (!b || w <= 0) return;
    _e.set(x * w, y * w, z * w, 'XYZ'); _q.setFromEuler(_e);
    _q2.identity(); for (let n = b.parent; n && n !== this.model; n = n.parent) _q2.premultiply(n.quaternion);
    // local' = Pw^-1 R Pw local
    _q3.copy(_q2).invert().multiply(_q).multiply(_q2); b.quaternion.premultiply(_q3);
  }
  // drive from a sim entity ({x,y,vx,vy,fx,fy}) in world units; X = sim x - HL, Z = sim y - CY
  drive(p, wx, wz, dt, opt = {}) {
    const spd = Math.hypot(p.vx, p.vy);
    // facing
    const tyaw = opt.yaw != null ? opt.yaw : Math.atan2(p.fx, p.fy);
    const prev = this.yaw, kY = this.busy() ? 7 : 13;
    this.yaw += angDiff(tyaw, this.yaw) * (1 - Math.exp(-dt * kY));
    const yr = dt > 0 ? angDiff(this.yaw, prev) / dt : 0; this.yawRate += (yr - this.yawRate) * Math.min(1, dt * 8);
    const acc = dt > 0 ? (spd - this.prevSpd) / dt : 0; this.prevSpd = spd; this.acc += (acc - this.acc) * Math.min(1, dt * 5);
    this.root.position.set(wx, 0, wz); this.root.rotation.y = this.yaw;
    if (this.blob) this.blob.position.set(wx, 0.02, wz);
    // ---- weights ----
    let S = 0;
    for (const s of this.shots) {
      s.t += dt * s.rate;
      if (!s.out && s.t >= s.d - s.fo) s.out = true;
      s.w = s.out ? Math.max(0, s.w - dt / s.fo) : Math.min(1, s.w + dt / s.fi);
      S += s.w;
    }
    this.shots = this.shots.filter((s) => { if (s.out && s.w <= 0) { s.a.setEffectiveWeight(0); return false; } return true; });
    const norm = S > 1 ? 1 / S : 1, rest = Math.max(0, 1 - S);
    for (const s of this.shots) { s.a.time = clamp(s.t, 0, s.d - 0.001); s.a.setEffectiveWeight(s.w * norm); }
    // stance loops (GK set, celebrations, throw-in hold)
    let SW = 0;
    if (this.stance && !(this.stance in this.stanceW)) this.stanceW[this.stance] = 0;
    for (const k of Object.keys(this.stanceW)) {
      const on = k === this.stance; let w = this.stanceW[k] + (on ? dt : -dt) / 0.25; w = clamp(w, 0, 1); this.stanceW[k] = w;
      const a = this.act(k); a.time = this.idleT % a.getClip().duration; a.setEffectiveWeight(w * rest);
      if (w <= 0 && !on) { a.setEffectiveWeight(0); delete this.stanceW[k]; }
      SW += w;
    }
    SW = Math.min(1, SW);
    const locoW = rest * (1 - SW);
    // ---- locomotion with foot-plant phase sync ----
    const sc = this.sc; let ms = spd;
    const vyaw = Math.atan2(p.vx, p.vy); let rel = spd > 0.6 ? angDiff(vyaw, this.yaw) : 0, back = false;
    if (Math.abs(rel) > 1.95) { back = true; rel = angDiff(rel, Math.PI); }
    let turnStep = 0;
    if (spd < 0.6 && Math.abs(this.yawRate) > 1.4) { turnStep = clamp((Math.abs(this.yawRate) - 1.4) / 2, 0, 1); ms = Math.max(ms, 0.9 * turnStep); }
    const u = ms / sc; // speed in clip units
    let wI = 1 - smooth((u - 0.12) / 0.6), wW = 0, wJ = 0, wS = 0;
    if (u <= 1.7) wW = 1; else if (u <= 4.4) { wJ = smooth((u - 1.7) / 2.7); wW = 1 - wJ; } else if (u <= 7.0) wJ = 1; else if (u <= 9.2) { wS = smooth((u - 7.0) / 2.2); wJ = 1 - wS; } else wS = 1;
    const strideC = wW * LOCO[0].v * LOCO[0].d + wJ * LOCO[1].v * LOCO[1].d + wS * LOCO[2].v * LOCO[2].d;
    this.phase += (back ? -1 : 1) * dt * (u / strideC);
    this.idleT += dt;
    const ia = this.act(opt.idle || 'Idle_Loop'); ia.time = this.idleT % ia.getClip().duration; ia.setEffectiveWeight(locoW * wI);
    if (opt.idle && opt.idle !== 'Idle_Loop' && this.acts.Idle_Loop) this.acts.Idle_Loop.setEffectiveWeight(0);
    const mw = locoW * (1 - wI);
    [wW, wJ, wS].forEach((w, i) => { const L = LOCO[i], a = this.act(L.name); a.time = fract(this.phase + L.off) * L.d; a.setEffectiveWeight(mw * w); });
    // ---- evaluate (half rate for far players) ----
    this.mixer.update(0);
    // ---- additive layers ----
    const lw = locoW * (1 - wI * 0.7);
    const twT = spd > 0.6 ? clamp(rel, -1.3, 1.3) : 0; this.tw += (twT - this.tw) * Math.min(1, dt * 8);
    if (Math.abs(this.tw) > 0.01 && lw > 0) {
      this.rotChar('P', 0, this.tw * lw, 0); this.rotChar('S1', 0, -this.tw * 0.4 * lw, 0); this.rotChar('S2', 0, -this.tw * 0.35 * lw, 0); this.rotChar('S3', 0, -this.tw * 0.25 * lw, 0);
    }
    // Natural human head & neck tracking toward the ball + chest breathing
    if (opt.lookX != null && locoW > 0.2) {
      const bdx = opt.lookX - wx, bdz = opt.lookZ - wz, bd = Math.hypot(bdx, bdz);
      let tHY = 0, tHP = 0;
      if (bd > 0.35 && bd < 32) {
        const bAng = angDiff(Math.atan2(bdx, bdz), this.yaw);
        if (Math.abs(bAng) < 1.35) {
          tHY = clamp(bAng * 0.65, -0.72, 0.72);
          const bH = (opt.lookY || 0.22) - 1.58 * sc;
          tHP = clamp(-Math.atan2(bH, Math.max(1.2, bd)) * 0.55, -0.35, 0.42);
        }
      }
      this.headYaw += (tHY - this.headYaw) * Math.min(1, dt * 7);
      this.headPitch += (tHP - this.headPitch) * Math.min(1, dt * 7);
      const hw = locoW * (1 - S);
      this.rotChar('N', this.headPitch * 0.4 * hw, this.headYaw * 0.4 * hw, 0);
      this.rotChar('H', this.headPitch * 0.6 * hw, this.headYaw * 0.6 * hw, 0);
    }
    const breath = Math.sin(this.idleT * 2.6) * 0.025 * locoW * wI;
    if (Math.abs(breath) > 0.002) this.rotChar('S2', breath, 0, 0);
    const leanT = clamp(-this.yawRate * spd * 0.028, -0.38, 0.38) * (back ? 0.4 : 1), pitchT = clamp(this.acc * 0.025, -0.12, 0.2) * (back ? -0.5 : 1);
    this.lean += (leanT - this.lean) * Math.min(1, dt * 6); this.pitch += (pitchT - this.pitch) * Math.min(1, dt * 5);
    this.model.rotation.set(this.pitch * lw, 0, this.lean * lw);
    // upper-body overlays (celebration arms, hands on head, GK holding the ball, referee pointing)
    const ovName = this.upper; this.upperW += ((ovName ? 1 : 0) - this.upperW) * Math.min(1, dt * 7); this.upperT += dt;
    if (ovName) this.lastUpper = ovName;
    const on = this.lastUpper && this.sys.overlay[this.lastUpper];
    if (on && this.upperW > 0.01) {
      const fi = Math.floor(((this.upperT % on.d) / on.d) * (on.n - 1)), w = this.upperW * (1 - S * 0.85);
      for (const [k, vals] of Object.entries(on.q)) { _q.fromArray(vals, fi * 4); this.bones[k].quaternion.slerp(_q, w); }
    }
    return { spd, wI };
  }
  dispose() {
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model);
    this.sys.scene.remove(this.root); if (this.blob) this.sys.scene.remove(this.blob);
    this.M.mat.dispose(); this.M.depth.dispose();
  }
}
function opts_blob(sys) { return !sys.high && sys.blobGeo && sys.blobMat; }

// ---------------------------------------------------------------------------------------------
// Match brain: turns simulation state changes into animation events.
const L_ = 105, W_ = 68, HL_ = 52.5, CY_ = 34;
function hashP(p) { return p.sp && p.sp.id ? [...String(p.sp.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) : (p.i || 0) * 7 + (p.t || 0) * 3; }
const _bw = new THREE.Vector3(), _cw = new THREE.Vector3();
function brain(rg, p, m, dt) {
  const b = m.ball, B = rg.B || (rg.B = { kc: p.kickCd || 0, tc: p.tackleCd || 0, lunge: 0, stun: 0, lk: null, own: null, dive: 0, st: m.state, cel: null, celSeed: hashP(p) });
  const gk = p.pos === 'GK', isRef = !!p.ref, left = rg.left, M = left ? '_M' : '';
  let yaw = null, idle = null;
  rg.setStance(null); rg.setUpper(null);
  if (!isRef) {
    // ---- kicks ----
    const kicked = (p.kickCd || 0) > B.kc + 0.1;
    const headed = !kicked && b.lastKicker === p && B.lk !== p && b.z > 0.8;
    if (headed) { rg.play('Header', { t0: 0.28, fadeIn: 0.06 }); }
    else if (kicked) {
      let name;
      if (B.throwHold) name = 'Throw';
      else if (gk && B.own === p) name = 'Lofted' + M;
      else if (b.shot && b.lastKicker === p) name = 'Shot' + M;
      else if (b.vz > 2.5 || b.lob || Math.hypot(b.vx, b.vy) > 24) name = 'Lofted' + M;
      else name = 'Pass' + M;
      const c = rg.sys.TPL[name.replace('_M', '')].c;
      rg.play(name, { t0: Math.max(0, c - 0.1), fadeIn: 0.05 });
      yaw = Math.atan2(b.vx, b.vy); rg.yaw = yaw; // face the kick direction
      const bs = Math.hypot(b.vx, b.vy) || 1;
      rg.sys.pin = { rg, t: 0, from: rg.lastBall ? rg.lastBall.clone() : new THREE.Vector3(p.x - HL_ + b.vx / bs * 0.55, 0.11, p.y - CY_ + b.vy / bs * 0.55) };
      B.throwHold = false;
    }
    // ---- tackles ----
    if (p.lunge > 0 && B.lunge <= 0) rg.play('Slide' + M, { t0: 0.04, rate: 1.15, fadeIn: 0.06 });
    else if ((p.tackleCd || 0) > B.tc + 0.3 && !(p.lunge > 0)) rg.play('Poke' + M, { fadeIn: 0.06 });
    if (m.state === 'play' && p.stun >= 0.55 && B.stun < 0.55) rg.play('Fall', { fadeIn: 0.08 });
    // ---- keeper ----
    if (gk) {
      if (!b.owner && b.shot && b.shotT !== p.t && !rg.busy()) {
        const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), ap = (b.vx * -dx + b.vy * -dy) > 0;
        const lat = dx * p.fy - dy * p.fx;
        if (d < 9 && ap) {
          if (Math.abs(lat) > 0.9) { rg.play(lat > 0 ? 'Dive_L' : 'Dive_R', { t0: 0.12, fadeIn: 0.06 }); }
          else if (d < 3.5) rg.play('Catch', { fadeIn: 0.06 });
        }
      }
      if (b.owner === p && B.own !== p && !rg.busy()) rg.play('Catch', { t0: 0.18, fadeIn: 0.06 });
      if (b.owner === p) rg.setUpper('GK_Hold');
      else if (m.state === 'play' && Math.hypot(p.vx, p.vy) < 2.2) {
        const own = m.teams && m.teams[p.t] && m.teams[p.t].goalX != null ? m.teams[p.t].goalX : (p.x < HL_ ? 0 : L_);
        if (Math.abs(b.x - own) < 34) rg.setStance('GK_Set');
      }
    }
    // ---- throw-in hold ----
    if (b.owner === p && m.noOffKick && (p.y < 1.4 || p.y > W_ - 1.4) && !gk) { B.throwHold = true; rg.setStance('ThrowHold'); }
    else if (b.owner !== p) B.throwHold = false;
    // ---- celebrations ----
    if (m.state === 'goal' || (m.state === 'end' && m.score && m.score[0] !== m.score[1])) {
      const win = m.state === 'goal' ? m.goalTeam : (m.score[0] > m.score[1] ? 0 : 1), r = B.celSeed;
      if (p.t === win) {
        if (m.state === 'goal' && p === b.lastKicker) { if (Math.hypot(p.vx, p.vy) < 1.5) rg.setStance(r % 2 ? 'Cel_Knee' : 'Cel_Jump'); else rg.setUpper('Cel_Plane'); }
        else if (Math.hypot(p.vx, p.vy) < 1.2 && r % 3 === 0) rg.setStance(r % 2 ? 'Cel_Jump' : 'Cel_Fist');
        else rg.setUpper(r % 2 ? 'Cel_Arms' : 'Cel_Plane');
      } else if (!gk || m.state === 'end') rg.setUpper(r % 2 ? 'Dejected' : 'Hands_Hips');
    }
  } else if (m.state === 'restart' || (m.flashT > 0 && m.state !== 'play')) rg.setUpper('Ref_Point');
  B.kc = p.kickCd || 0; B.tc = p.tackleCd || 0; B.lunge = p.lunge || 0; B.stun = p.stun || 0; B.lk = b.lastKicker; B.own = b.owner; B.st = m.state;
  return { yaw, idle, lookX: b.x - HL_, lookZ: b.y - CY_, lookY: 0.22 + Math.max(0, b.z || 0) };
}
function updateAll(sys, m, dt, camera, entries) {
  sys.t = (sys.t || 0) + dt; sys.ballOv = null;
  const b = m.ball;
  for (const [p, rg] of entries) {
    const wx = p.x - HL_, wz = p.y - CY_;
    rg.root.visible = !p.off; if (rg.blob) rg.blob.visible = !p.off;
    if (p.off) continue;
    const d = camera ? Math.hypot(camera.position.x - wx, camera.position.y, camera.position.z - wz) : 0;
    rg.setLod(rg.look.forceLod1 || d > sys.lodDist ? 1 : 0);
    const o = brain(rg, p, m, dt);
    // far players: evaluate at half rate
    rg.acc2 = (rg.acc2 || 0) + dt;
    if (d > 44 && !rg.busy() && (rg.skip = !rg.skip)) { rg.root.position.set(wx, 0, wz); if (rg.blob) rg.blob.position.set(wx, 0.02, wz); continue; }
    rg.drive(p, wx, wz, rg.acc2, o); rg.acc2 = 0;
  }
  // ---- ball presentation: kick pin, keeper hands, throw-in, dribble touches ----
  const pin = sys.pin;
  if (pin) {
    pin.t += dt; const rg = pin.rg;
    if (!pin.from) pin.from = _bw.set(b.x - HL_, 0.11, b.y - CY_).clone();
    if (pin.t < 0.1) sys.ballOv = pin.from.clone();
    else if (pin.t < 0.22) { const u = smooth((pin.t - 0.1) / 0.12); sys.ballOv = pin.from.clone().lerp(_cw.set(b.x - HL_, 0.11 + Math.max(0, b.z), b.y - CY_), u); }
    else sys.pin = null;
    if (b.owner) sys.pin = null;
  }
  if (!sys.ballOv && b.owner) {
    const o = b.owner, rg = entries.get ? entries.get(o) : null;
    if (rg && !o.off) {
      const B = rg.B || {};
      if (o.pos === 'GK' || B.throwHold) {
        rg.root.updateMatrixWorld(true);
        const a = rg.bones.HL.getWorldPosition(new THREE.Vector3()), c = rg.bones.HR.getWorldPosition(new THREE.Vector3());
        sys.ballOv = a.add(c).multiplyScalar(0.5); if (B.throwHold) sys.ballOv.y += 0.1; else sys.ballOv.addScaledVector(_cw.set(Math.sin(rg.yaw), 0, Math.cos(rg.yaw)), 0.08);
      } else {
        const spd = Math.hypot(o.vx, o.vy), u = fract(rg.phase - 0.5), k = clamp((spd - 1) / 4, 0, 1);
        const dd = lerp(0.55, 0.38 + 0.75 * Math.pow(Math.sin(Math.PI * u), 0.8) * (0.6 + 0.4 * clamp(spd / 9, 0, 1)), k) * rg.sc;
        const fx = Math.sin(rg.yaw), fz = Math.cos(rg.yaw);
        sys.ballOv = new THREE.Vector3(o.x - HL_ + fx * dd - fz * 0.08, 0.11, o.y - CY_ + fz * dd + fx * 0.08);
      }
      rg.lastBall = sys.ballOv.clone();
    }
  }
  if (!sys.ballOv) for (const rg of sys.rigs) rg.lastBall = null;
  return sys.ballOv;
}
export { THREE, SkeletonUtils };
