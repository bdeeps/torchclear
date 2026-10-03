// TorchClear's shared parts: the lamp, cell and circuit sums, the parabola ray tracer, the 3D torch
// (a generic two-cell hand torch: no brand shapes or logos), chart boards and layout helpers.
//
// Sources for the numbers
//  - Bulb: the PR2 miniature lamp for two D cells: 2.38 V, 0.50 A (1.19 W), 0.80 mean spherical
//    candlepower, 15 hours average life (lamp makers' catalogues, e.g. bulbs.com "PR2", Sylvania PR2).
//    One mean spherical candela is 4π lumens, so 0.80 MSCP = 10.05 lm and 8.4 lm/W.
//  - How a filament lamp answers to voltage ("Lamp rerating", Wikipedia, after the lamp makers'
//    handbooks): light ∝ V^3.4, power ∝ V^1.6 (so current ∝ V^0.6), life ∝ V^-12 to V^-16 (we use -14),
//    colour temperature ∝ V^0.42.
//  - Filament temperature at rated volts: about 2,450 K. This is our estimate from its efficacy
//    (a black body at 2,450 K gives about 8 lm/W); makers do not print it.
//  - Alkaline D cell: Energizer E95 data sheet (form E95NA0323): 150 to 300 mΩ fresh, 139 g,
//    capacity to 0.8 V of about 17,500 mAh at 25 mA, 15,300 at 100 mA, 12,500 at 250 mA and
//    9,200 mAh at 500 mA (read off its bar chart); loaded voltage falls 1.5 → 1.2 → 1.0 → 0.8 V.
//  - Zinc-carbon D cell: Eveready 1250 "Super Heavy Duty" data sheet (form EBC-3111H): 89 g,
//    8,000 mAh at 25 mA to 0.8 V; on 2.2 Ω for an hour a day it lasts about 11.6 h (about 5.5 Ah);
//    its constant-current chart gives roughly 5 to 6 hours at 500 mA without rests, so about 3 Ah.
//    Its internal resistance is not printed: 0.35 Ω rising to about 1 Ω is our assumption.
//  - NiMH D cell: 1.2 V nominal, about 8,000 mAh for a full-size cell, a few tens of mΩ (typical
//    maker figures; they vary by brand).
//  - Lithium-ion 18650: 18 mm × 65 mm, 3.6 V nominal, 4.2 V full, cut off near 2.5 to 2.75 V,
//    about 3,000 mAh, about 48 g (typical of maker data sheets such as Samsung INR18650-30Q).
//  - White LED: a "1 watt" emitter at 350 mA drops about 3.0 V and gives about 140 lm (typical of
//    power-LED data sheets of the 2010s and 2020s, e.g. Cree XLamp XP-G families); at 1 A it gives
//    about 2.5 times the light at about 3.25 V. 683 lm/W is the most any light can give (555 nm green).
//  - ANSI/NEMA FL 1 (2009; now ANSI/PLATO FL 1): beam distance is where the beam falls to 0.25 lux,
//    so distance = √(peak candela ÷ 0.25); run time ends when the light falls to 10% of its value
//    30 seconds after switch-on.
import { THREE, M, rod, latheX, box, sphere, beam, tube, canvasTexture, clamp } from './kit.js';

export { clamp };
export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;

// ------------------------------------------------------------------ colours
export const COL = { conv: '#ffb547', elec: '#8ef0ff', volt: '#7be08c', light: '#ffe08a', warm: '#ffb86b', bad: '#ff5a8a', good: '#7be08c', soft: 'rgba(255,255,255,.62)', grid: 'rgba(255,255,255,.12)', text: '#e8eef8', ray: '#ffd166', spill: '#8fb8ff', blue: '#5aa0ff' };
export const HEX = { conv: 0xffb547, elec: 0x8ef0ff, brass: 0xd4a94e, steel: 0xc9ced8, copper: 0xd08a4a, ray: 0xffd166, spill: 0x8fb8ff, zinc: 0xaab4c0, carbon: 0x2a2c31, mno2: 0x3a3536 };

// ------------------------------------------------------------------ the filament bulb
export const BULB = { V: 2.38, I: 0.5, mscp: 0.8, life: 15, T: 2450 };
BULB.lm = BULB.mscp * 4 * Math.PI;                 // 10.05 lm
BULB.W = BULB.V * BULB.I;                          // 1.19 W
export const bulbI = (V) => (V <= 0 ? 0 : BULB.I * Math.pow(V / BULB.V, 0.6));
export const bulbLm = (V) => (V <= 0 ? 0 : BULB.lm * Math.pow(V / BULB.V, 3.4));
export const bulbLife = (V) => (V <= 0 ? Infinity : BULB.life * Math.pow(V / BULB.V, -14));
export const bulbT = (V) => (V <= 0 ? 300 : Math.max(300, BULB.T * Math.pow(V / BULB.V, 0.42)));

// ------------------------------------------------------------------ the white LED and its driver
export const LED = { I: 0.35, V: 3.0, lm: 140, drv: 0.85 };
export const ledV = (i) => (i <= 0 ? 2.6 : 3.0 + 0.22 * Math.log10(i / 0.35) + 0.25 * (i - 0.35));   // volts across the LED
export const ledLm = (i) => (i <= 0 ? 0 : LED.lm * Math.pow(i / LED.I, 0.873));                       // droop: 2.5× the light at 1 A
// The current an LED would take if you simply gave it V volts (the inverse of ledV), by bisection.
export function ledIatV(V) { let a = 1e-4, b = 6; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ledV(m) > V) b = m; else a = m; } return (a + b) / 2; }
export const LED_W = LED.V * LED.I;                // 1.05 W into the LED
export const DRV_W = LED_W / LED.drv;              // 1.24 W drawn from the cells

// ------------------------------------------------------------------ Planck: what a hot filament radiates
const H = 6.62607015e-34, CL = 299792458, KB = 1.380649e-23;
export const planck = (nm, T) => { const l = nm * 1e-9; return (2 * H * CL * CL) / Math.pow(l, 5) / (Math.exp((H * CL) / (l * KB * T)) - 1); };
// The eye's daylight sensitivity V(λ), as a Gaussian fit (peak 1 near 555 to 559 nm).
export const eyeV = (nm) => 1.019 * Math.exp(-285.4 * Math.pow(nm / 1000 - 0.559, 2));
// Share of a black body's power that is visible light (400 to 700 nm), and its efficacy in lm/W.
export function bodyLight(T) {
  let all = 0, vis = 0, lum = 0;
  for (let nm = 100; nm <= 30000; nm += nm < 2000 ? 10 : 100) {
    const p = planck(nm, T) * (nm < 2000 ? 10 : 100);
    all += p; if (nm >= 400 && nm <= 700) vis += p; if (nm >= 380 && nm <= 780) lum += p * eyeV(nm);
  }
  return { vis: vis / all, lmW: (683 * lum) / all };
}
// A rough colour for a glowing body at T kelvin (after Tanner Helland's fit to the black-body locus).
export function kelvinRGB(T) {
  const t = clamp(T, 1000, 12000) / 100;
  const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
  const g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  return [clamp(r, 0, 255) / 255, clamp(g, 0, 255) / 255, clamp(b, 0, 255) / 255];
}

// ------------------------------------------------------------------ cells
// x is the share of the cell's charge already used (0 fresh, 1 "flat"). e is the open-circuit
// voltage of one cell and r its internal resistance. The tables are shaped so that, on a torch load
// of about 0.5 A, the loaded voltage follows the data-sheet curves quoted at the top of this file.
const tab = (xs, ys) => (x) => { if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + ((ys[i] - ys[i - 1]) * (x - xs[i - 1])) / (xs[i] - xs[i - 1]); return Math.max(0, ys[ys.length - 1] - (x - xs[xs.length - 1]) * 5); };
export const CELLS = {
  zc: { name: 'Zinc-carbon', short: 'Zinc-carbon D', n: 2, Ah: 3.0, g: 89, nom: 1.5, col: '#ff9a6b', e: tab([0, 0.08, 0.3, 0.55, 0.8, 0.97, 1], [1.62, 1.5, 1.46, 1.44, 1.41, 1.27, 1.22]), r: (x) => 0.35 + 0.6 * Math.min(x, 1.2), re: false },
  alk: { name: 'Alkaline', short: 'Alkaline D', n: 2, Ah: 9.2, g: 139, nom: 1.5, col: '#8ef0ff', e: tab([0, 0.04, 0.2, 0.5, 0.75, 0.92, 1], [1.6, 1.42, 1.3, 1.22, 1.14, 1.06, 0.95]), r: (x) => 0.15 + 0.25 * Math.min(x, 1.2), re: false },
  nimh: { name: 'NiMH', short: 'NiMH D', n: 2, Ah: 8.0, g: 160, nom: 1.2, col: '#7be08c', e: tab([0, 0.05, 0.5, 0.9, 1], [1.4, 1.32, 1.26, 1.2, 1.05]), r: () => 0.025, re: true },
  li: { name: 'Lithium-ion', short: 'Li-ion 18650', n: 1, Ah: 3.0, g: 48, nom: 3.6, col: '#c49bff', e: tab([0, 0.1, 0.5, 0.9, 1], [4.2, 4.05, 3.7, 3.45, 3.0]), r: () => 0.05, re: true, cut: 2.75 },
};
// Solve the loop: n cells in series (EMF E, resistance R) feeding a lamp.
//   bulb: I = I₀ (V/V₀)^0.6 with V = E − I R (found by iteration)
//   led:  a driver that draws a steady power P from the cells while they can supply it
// opts.E and opts.R override the cell model (used for a reversed cell).
export function solve(chem, x, lamp = 'bulb', opts = {}) {
  const c = CELLS[chem];
  const E = opts.E ?? c.n * c.e(x), R = opts.R ?? c.n * c.r(x) + 0.05;       // 0.05 Ω for the spring, strips and switch
  let V = 0, I = 0, lm = 0, reg = false;
  if (E <= 0.01) return { E: Math.max(0, E), R, V: 0, I: 0, lm: 0, W: 0, reg };
  if (lamp === 'bulb') {
    V = E; for (let k = 0; k < 60; k++) V = 0.5 * V + 0.5 * Math.max(0, E - bulbI(V) * R);
    I = bulbI(V); lm = bulbLm(V);
  } else {
    const vmin = c.n === 1 ? (c.cut || 2.75) : 1.8, voff = vmin - 0.5;         // below vmin the driver can no longer hold the light up
    const at = (P) => { const d = E * E - 4 * P * R; return d < 0 ? null : (E + Math.sqrt(d)) / 2; };
    V = at(DRV_W);
    if (V !== null && V >= vmin) { reg = true; I = DRV_W / V; lm = LED.lm; }
    else if (c.cut) { V = E; I = 0; lm = 0; }                                 // a protected lithium cell switches itself off
    else {
      let k = 1; V = E;
      for (let it = 0; it < 40; it++) { k = clamp((V - voff) / (vmin - voff), 0, 1) ** 2; const v2 = at(DRV_W * k); V = 0.5 * V + 0.5 * (v2 === null ? E / 2 : v2); }
      I = V > 0 ? (DRV_W * k) / V : 0; lm = LED.lm * k;
    }
  }
  return { E, R, V, I, lm, W: V * I, reg };
}
// Leave the torch on: step through the discharge. Returns hours, volts, lumens and amps at each step,
// the FL 1 run time (to 10% of the light at 30 s) and the light-hours delivered.
export function runDown(chem, lamp, hMax = 40, dt = 0.02) {
  const c = CELLS[chem], t = [], V = [], lm = [], I = [], X = [];
  let x = 0, lm0 = 0, fl1 = null, lmh = 0;
  for (let h = 0; h <= hMax + 1e-9; h += dt) {
    const s = solve(chem, x, lamp);
    if (h === 0) lm0 = solve(chem, (s.I * (30 / 3600)) / c.Ah, lamp).lm;
    t.push(h); V.push(s.V); lm.push(s.lm); I.push(s.I); X.push(x);
    if (fl1 === null && s.lm < 0.1 * lm0) fl1 = h;
    if (fl1 === null) lmh += s.lm * dt;
    x += (s.I * dt) / c.Ah;
  }
  return { t, V, lm, I, X, lm0, fl1: fl1 ?? hMax, lmh, dt };
}
export const sampleRun = (run, h) => { const i = clamp(Math.round(h / run.dt), 0, run.t.length - 1); return { V: run.V[i], lm: run.lm[i], I: run.I[i], x: run.X[i] }; };

// ------------------------------------------------------------------ the parabolic reflector
// The mirror is the parabola y² = 4 f x, turned about the x axis: vertex at the origin, focus at
// (f, 0). It runs from the lamp hole (radius h0) to the rim (radius R). Lengths in millimetres.
// One ray: start s = [x, y], direction angle a (radians from +x). Reflection is exact: we solve the
// quadratic for where the ray meets the parabola, take the surface normal from the gradient of
// y² − 4 f x, which is (−4f, 2y), and mirror the direction in it: d' = d − 2 (d·n) n.
export function traceRay(f, R, h0, s, a, mirror = true) {
  let p = [s[0], s[1]], d = [Math.cos(a), Math.sin(a)], I = 1, bounces = 0;
  const pts = [p], xr = (R * R) / (4 * f);
  for (let k = 0; k < 4 && mirror; k++) {
    const A = d[1] * d[1], B = 2 * p[1] * d[1] - 4 * f * d[0], C = p[1] * p[1] - 4 * f * p[0];
    let t = null;
    if (Math.abs(A) < 1e-12) { if (Math.abs(B) > 1e-12) { const t0 = -C / B; if (t0 > 1e-6) t = t0; } }
    else { const disc = B * B - 4 * A * C; if (disc >= 0) { const q = Math.sqrt(disc), t1 = (-B - q) / (2 * A), t2 = (-B + q) / (2 * A); const lo = Math.min(t1, t2), hi = Math.max(t1, t2); t = lo > 1e-6 ? lo : hi > 1e-6 ? hi : null; } }
    if (t === null) break;
    const q = [p[0] + d[0] * t, p[1] + d[1] * t];
    if (q[0] > xr) break;                                         // beyond the rim: it misses the mirror
    if (Math.abs(q[1]) < h0) { pts.push(q); return { pts, d, I: 0, bounces, lost: true }; }   // into the lamp hole
    let n = [-4 * f, 2 * q[1]]; const nl = Math.hypot(n[0], n[1]); n = [n[0] / nl, n[1] / nl];
    const c = d[0] * n[0] + d[1] * n[1];
    d = [d[0] - 2 * c * n[0], d[1] - 2 * c * n[1]];
    p = q; pts.push(q); I *= REFL; bounces++;
  }
  if (d[0] <= 1e-6) return { pts, d, I: 0, bounces, lost: true };   // heading backwards: lost in the torch
  if (mirror) { const yl = p[1] + ((xr - p[0]) / d[0]) * d[1]; if (p[0] < xr && Math.abs(yl) > R) return { pts, d, I: 0, bounces, lost: true }; }
  return { pts, d, I: I * LENS_T, bounces, lost: false };
}
export const REFL = 0.85;     // an aluminised plastic reflector returns about 85% (typical; 80 to 90%)
export const LENS_T = 0.92;   // a clear window loses about 4% at each face (Fresnel, n ≈ 1.5)
// One ray in 3D off the paraboloid y² + z² = 4 f x. Same law, one more dimension: the normal is the
// gradient of y² + z² − 4 f x, which is (−4f, 2y, 2z). Returns the final direction and what is left.
function trace3(f, R, h0, p, d, mirror) {
  let px = p[0], py = p[1], pz = p[2], dx = d[0], dy = d[1], dz = d[2], I = 1, bounces = 0;
  const xr = (R * R) / (4 * f);
  for (let k = 0; k < 4 && mirror; k++) {
    const A = dy * dy + dz * dz, B = 2 * (py * dy + pz * dz) - 4 * f * dx, C = py * py + pz * pz - 4 * f * px;
    let t = -1;
    if (A < 1e-12) { if (Math.abs(B) > 1e-12) t = -C / B; }
    else { const disc = B * B - 4 * A * C; if (disc >= 0) { const q = Math.sqrt(disc), t1 = (-B - q) / (2 * A), t2 = (-B + q) / (2 * A); t = t1 > 1e-6 ? t1 : t2; } }
    if (!(t > 1e-6)) break;
    const qx = px + dx * t, qy = py + dy * t, qz = pz + dz * t;
    if (qx > xr) break;
    if (qy * qy + qz * qz < h0 * h0) return null;
    let nx = -4 * f, ny = 2 * qy, nz = 2 * qz; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const c = dx * nx + dy * ny + dz * nz;
    dx -= 2 * c * nx; dy -= 2 * c * ny; dz -= 2 * c * nz; px = qx; py = qy; pz = qz; I *= REFL; bounces++;
  }
  if (dx <= 1e-6) return null;
  if (mirror && px < xr) { const t = (xr - px) / dx; if (Math.hypot(py + dy * t, pz + dz * t) > R) return null; }
  return { dx, I: I * LENS_T, bounces };
}
// The whole beam, traced in 3D: several thousand rays from each of a few points on a lamp of width
// `size` mm centred `off` mm ahead of the focus, with directions spread evenly over the sphere.
// kind 'bulb': a short coiled filament lying across the axis, shining evenly in every direction (the lamp's
// base blocks what goes backwards into the hole). kind 'led': a flat square chip facing forwards
// (Lambertian: each ray weighted by cos θ, front hemisphere only).
// Returns intensity per lumen of lamp light (cd/lm) in 0.5° bins of angle from the axis, plus shares.
const COIL_R = 0.2;     // the filament is a coil about 0.4 mm across (typical of small torch bulbs)
const DIRS = (() => { const n = 2400, out = [], ga = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < n; i++) { const u = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - u * u), a = i * ga; out.push([u, r * Math.cos(a), r * Math.sin(a)]); } return out; })();
export function beamProfile({ f, R, h0, off, size, kind, mirror = true }) {
  const NB = 180, BW = 0.5, bins = new Float64Array(NB), led = kind === 'led';
  const src = [];
  if (led) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) src.push([f + off, (y * size) / 3, (z * size) / 3]);
  else for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const a = (j / 3) * TAU + i; src.push([f + off + COIL_R * Math.cos(a), COIL_R * Math.sin(a), ((i + 0.5) / 5 - 0.5) * size]); }
  let total = 0, spot = 0, spill = 0;
  for (const p of src) for (const d of DIRS) {
    const w = led ? (d[0] > 0 ? d[0] : 0) : 1;
    if (w <= 0) continue;
    total += w;
    const r = trace3(f, R, h0, p, d, mirror);
    if (!r) continue;
    const b = Math.floor(Math.acos(Math.min(1, r.dx)) / D2R / BW);
    if (b < NB) bins[b] += w * r.I;
    if (r.bounces) spot += w * r.I; else spill += w * r.I;
  }
  // flux share per bin → candela per lumen: divide by the bin's solid angle 2π (cos a₀ − cos a₁)
  const cd = new Float64Array(NB);
  for (let b = 0; b < NB; b++) cd[b] = bins[b] / total / (TAU * (Math.cos(b * BW * D2R) - Math.cos((b + 1) * BW * D2R)));
  // the innermost bins hold few rays, so average the first degree for the peak
  const core = (bins[0] + bins[1]) / total / (TAU * (1 - Math.cos(2 * BW * D2R)));
  cd[0] = cd[1] = core;
  // smooth the sampling noise further out with a short running average
  const raw = Array.from(cd); for (let b = 2; b < NB - 2; b++) cd[b] = (raw[b - 2] + 2 * raw[b - 1] + 3 * raw[b] + 2 * raw[b + 1] + raw[b + 2]) / 9;
  let peak = core; for (let b = 2; b < 60; b++) peak = Math.max(peak, cd[b]);
  let half = BW; for (let b = 0; b < NB; b++) if (cd[b] >= peak / 2) half = (b + 1) * BW;      // the outer edge of the bright part
  return { cd, BW, peak, half, spot: spot / total, spill: spill / total, lost: 1 - (spot + spill) / total };
}
// Intensity at an angle, read smoothly between bin centres.
export const cdAt = (prof, deg) => { const u = Math.abs(deg) / prof.BW - 0.5, b = Math.max(0, Math.floor(u)), n = prof.cd.length; if (b >= n - 1) return 0; const k = Math.max(0, u - b); return prof.cd[b] * (1 - k) + prof.cd[b + 1] * k; };

// ------------------------------------------------------------------ canvas boards
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.92)'; g.fillRect(0, 0, w, h); }
export function text(g, s, x, y, { font = '20px sans-serif', col = 'rgba(255,255,255,.82)', align = 'left' } = {}) { g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const b = canvasTexture(pxW, pxH, draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: b.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return { ...b, mesh: m };
}
export function axes(g, { x0, x1, y0, y1, xMin = 0, xMax, yMin = 0, yMax, xTicks = [], yTicks = [], xFmt = String, yFmt = String, font = '20px sans-serif' }) {
  const X = (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0), Y = (y) => y0 - ((y - yMin) / (yMax - yMin)) * (y0 - y1);
  g.strokeStyle = COL.grid; g.lineWidth = 1; g.font = font; g.fillStyle = COL.soft;
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); g.textAlign = 'center'; g.fillText(xFmt(t), X(t), y0 + 26); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); g.textAlign = 'right'; g.fillText(yFmt(t), x0 - 8, Y(t) + 7); }
  g.textAlign = 'left'; g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  return { X, Y };
}
export function plot(g, pts, X, Y, col, lw = 4, dash = null) {
  if (pts.length < 2) return;
  g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.setLineDash(dash || []); g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke(); g.setLineDash([]);
}
export function dot(g, x, y, col, r = 9) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }

// ------------------------------------------------------------------ layout helpers for phones and the reel
export const inReel = () => document.body.classList.contains('gb-reel');
// On a phone the readout covers the top of the stage. There we hide minor labels, slide the picture
// down, and (if the chapter gives one) switch to a view that is pulled further back.
export function fitNarrow(stage, minor = [], y0 = -0.14, view = null) {
  const narrow = stage.host.clientWidth < 560 && !inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow ? y0 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  if (narrow && view && !stage.moved && stage.home && stage.home.pos !== view.pos) stage.setView(view.pos, view.target, 0.5);
  return narrow;
}
// Phones get a shorter readout: the first three rows, and no small print.
export function slim(stage, html) {
  if (stage.host.clientWidth >= 560) return html;
  let n = 0;
  return html.replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<div class="row">[\s\S]*?<\/div>/g, (m) => (++n > 3 ? '' : m));
}
export const fmt = (v, d = 1) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(d));
export const hrs = (h) => (h < 1 / 60 ? Math.round(h * 3600) + ' s' : h < 1 ? Math.round(h * 60) + ' min' : h < 10 ? h.toFixed(1) + ' h' : Math.round(h) + ' h');

// ------------------------------------------------------------------ 3D pieces
// A pool of glowing rods drawn as light rays. draw(segs): seg = { a: [x,y,z], b: [x,y,z], I (0 to 1), col? }.
export function rayPool(parent, n = 120, r = 0.03, color = COL.ray) {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  const up = new THREE.Vector3(0, 1, 0), A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3();
  const items = Array.from({ length: n }, () => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.visible = false; m.renderOrder = 5; parent.add(m); return m;
  });
  return {
    draw(segs, rr = r) {
      let used = 0;
      for (const s of segs) {
        if (used >= n) break;
        if (s.I < 0.01) continue;
        A.set(...s.a); B.set(...s.b); D.subVectors(B, A);
        const L = D.length(); if (L < 1e-5) continue;
        const m = items[used++];
        m.visible = true; m.position.copy(A).addScaledVector(D, 0.5); m.quaternion.setFromUnitVectors(up, D.normalize());
        const w = (s.r ?? rr); m.scale.set(w, L, w);
        m.material.color.set(s.col || color); m.material.opacity = clamp(s.I, 0, 1);
      }
      for (let i = used; i < n; i++) items[i].visible = false;
    },
  };
}
// A path of straight runs with a point for any distance along it (0 to 1, looping).
export function makePath(pts) {
  const P = pts.map((p) => new THREE.Vector3(...p)), L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
  const len = L[L.length - 1];
  return {
    len, pts: P,
    at(u, out = new THREE.Vector3()) {
      const d = (((u % 1) + 1) % 1) * len; let i = 1; while (i < L.length - 1 && L[i] < d) i++;
      return out.lerpVectors(P[i - 1], P[i], (d - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]));
    },
  };
}
// Small glowing beads, placed one at a time: put(i, x, y, z, scale).
export function makeDots(parent, n = 60, color = HEX.elec, size = 0.05) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 10, 8), M.glow(color, { transparent: true, opacity: 1, depthTest: true }), n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.castShadow = false; mesh.frustumCulled = false; mesh.renderOrder = 6; parent.add(mesh);
  const o = new THREE.Object3D();
  mesh.put = (i, x, y, z, s = 1) => { o.position.set(x, y, z); o.scale.setScalar(Math.max(0.0001, s)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
  mesh.done = () => { mesh.instanceMatrix.needsUpdate = true; };
  mesh.n = n;
  return mesh;
}
// A coil spring along X whose radius tapers from R0 (at x0) to R1 (at x1), like the one in a torch's tail.
export function coneSpring(x0, x1, R0, R1, r, turns, mat) {
  const pts = [], N = turns * 20;
  for (let i = 0; i <= N; i++) { const t = i / N, a = t * turns * TAU, R = R0 + (R1 - R0) * t; pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, R * Math.cos(a), R * Math.sin(a))); }
  return tube(pts, r, mat, false, N * 2);
}
// One cylindrical cell, negative base at x = 0, positive cap at x = L + nub. A plain jacket: no brand colours.
export function makeCell({ L = 3.0, R = 0.84, jacket = 0x2a7d8c, band = 0xd9dde4 } = {}) {
  const g = new THREE.Group();
  g.add(rod(0.03, L - 0.5, R, R, M.plastic(jacket, { roughness: 0.35 }), 40));
  g.add(rod(L - 0.5, L, R, R, M.metal(band, { roughness: 0.35 }), 40));
  g.add(rod(0, 0.03, R * 0.62, R * 0.62, M.metal(HEX.steel), 32));
  g.add(rod(L, L + 0.1, 0.24, 0.24, M.metal(HEX.steel), 24));
  // + and − marks on the jacket
  const mark = (ch, x) => { const t = canvasTexture(64, 64, (c) => { c.clearRect(0, 0, 64, 64); c.fillStyle = '#fff'; c.font = 'bold 60px sans-serif'; c.textAlign = 'center'; c.fillText(ch, 32, 54); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, toneMapped: false })); m.position.set(x, 0, R + 0.012); g.add(m); };
  mark('+', L - 0.9); mark('−', 0.45);
  return g;
}

// A strip that fades from white to black: wrapped on a beam cone so the light thins out with distance.
export function fadeMap() {
  const t = canvasTexture(4, 64, (g) => { const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#fff'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); });
  return t.tex;
}

// The torch. Long axis X, lens at +X, switch on top (+Y). 1 unit = 20 mm, so it is about 195 mm long
// with two D cells (61.5 mm × 34.2 mm each: IEC R20/LR20 size). Built in parts so it can be taken apart.
//   cut: true slices the case, tail cap, bezel and reflector in half (the half nearer +Z is removed)
// The current path (see TORCH_PATH): cell + cap → bulb tip → filament → bulb shell → lamp holder →
// front strip → switch bridge → long strip → tail plate → spring → cell − base → through both cells.
export const TG = { rearX: -3.2, frontX: -0.1, nub: 3.0, focus: 4.0, f: 0.3, lens: 5.34, stripY: 0.89, aEnd: 1.3, bStart: 1.6, swOff: 1.0, swOn: 1.45 };
export const TORCH_PATH = [
  [3.0, 0, 0], [3.1, 0, 0], [3.5, 0, 0.07], [3.97, 0, 0.09], [3.97, 0, -0.09], [3.5, 0.12, -0.07], [3.5, 0.33, 0], [3.48, 0.44, 0],
  [3.25, TG.stripY, 0], [TG.bStart, TG.stripY, 0], [TG.aEnd, TG.stripY, 0], [-3.88, TG.stripY, 0], [-3.88, 0.45, 0], [-3.85, 0, 0], [-3.2, 0, 0], [3.0, 0, 0],
];
export function makeTorch({ cut = false, caseCol = 0x2b5fa8, lamp = 'bulb' } = {}) {
  const group = new THREE.Group();
  const phi = cut ? { phiStart: Math.PI / 2, phiLength: Math.PI } : {};
  const caseMat = M.plastic(caseCol, { roughness: 0.42, side: THREE.DoubleSide, transparent: true, opacity: 1 });
  const darkMat = M.plastic(0x20242c, { roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 1 });
  const brass = M.metal(HEX.brass, { roughness: 0.3 }), steel = M.metal(HEX.steel, { roughness: 0.3 });
  // ---- case: a tube that flares into the head
  const body = new THREE.Group(); group.add(body);
  body.add(latheX([[-3.7, 0.92], [3.0, 0.92], [4.0, 1.47], [5.2, 1.47], [5.2, 1.55], [4.0, 1.55], [3.0, 1.0], [-3.7, 1.0], [-3.7, 0.92]], caseMat, phi));
  // grip rings
  for (let i = 0; i < 6; i++) body.add(latheX([[-2.9 + i * 0.5, 1.0], [-2.9 + i * 0.5, 1.035], [-2.72 + i * 0.5, 1.035], [-2.72 + i * 0.5, 1.0]], caseMat, phi));
  // ---- tail cap
  const tail = new THREE.Group(); group.add(tail);
  tail.add(latheX([[-4.25, 0], [-4.25, 0.98], [-4.18, 1.06], [-3.62, 1.06], [-3.62, 1.01], [-4.1, 1.01], [-4.1, 0]], darkMat, phi));
  // ---- tail plate and spring (they carry the current from the long strip to the rear cell)
  const springG = new THREE.Group(); group.add(springG);
  springG.add(rod(-3.92, -3.85, 0.8, 0.8, brass, 32));
  springG.add(coneSpring(-3.85, TG.rearX, 0.6, 0.3, 0.035, 4, steel));
  // ---- two cells in series, both + ends towards the lamp
  const cells = [makeCell(), makeCell()];
  cells[0].position.x = TG.rearX; cells[1].position.x = TG.frontX; group.add(cells[0], cells[1]);
  // ---- strips along the inside top of the case, and the lamp holder
  const strips = new THREE.Group(); group.add(strips);
  const sA = box(TG.aEnd + 3.88, 0.03, 0.16, brass); sA.position.set((TG.aEnd - 3.88) / 2, TG.stripY, 0); strips.add(sA);
  const sA2 = box(0.03, TG.stripY - 0.4, 0.16, brass); sA2.position.set(-3.88, (TG.stripY + 0.4) / 2, 0); strips.add(sA2);
  const sB = box(3.25 - TG.bStart, 0.03, 0.16, brass); sB.position.set((3.25 + TG.bStart) / 2, TG.stripY, 0); strips.add(sB);
  const sB2 = beam([3.25, TG.stripY, 0], [3.48, 0.44, 0], 0.035, brass, 8); strips.add(sB2);
  const holder = latheX([[3.42, 0.34], [3.42, 0.46], [3.5, 0.46], [3.5, 0.34]], brass); strips.add(holder);
  // ---- slide switch: a button outside, a brass bridge inside
  const sw = new THREE.Group(); sw.position.set(TG.swOff, 0, 0); group.add(sw);
  const knob = box(0.55, 0.16, 0.4, M.plastic(0xe8eaef, { roughness: 0.5 })); knob.position.y = 1.1; sw.add(knob);
  const stem = box(0.12, 0.2, 0.1, M.plastic(0xe8eaef)); stem.position.y = 1.0; sw.add(stem);
  const bridge = box(0.5, 0.035, 0.2, M.metal(HEX.copper, { roughness: 0.3 })); bridge.position.y = TG.stripY + 0.035; sw.add(bridge);
  // ---- the lamp: a filament bulb, or an LED module on the same base
  const lampG = new THREE.Group(); group.add(lampG);
  lampG.add(rod(3.02, 3.1, 0.09, 0.09, steel, 16));                    // tip contact, touching the cell's + cap
  lampG.add(rod(3.1, 3.5, 0.22, 0.22, brass, 24));                     // shell
  lampG.add(rod(3.5, 3.54, 0.33, 0.33, brass, 24));                    // flange, sitting in the holder
  const bulb = new THREE.Group(), led = new THREE.Group(); lampG.add(bulb, led);
  const globe = latheX([[3.54, 0.2], [3.75, 0.22], [3.9, 0.27], [4.05, 0.27], [4.18, 0.2], [4.26, 0.1], [4.28, 0]], M.clear(0xdfefff, 0.28, { roughness: 0.05 })); globe.castShadow = false; bulb.add(globe);
  bulb.add(beam([3.54, 0, 0.07], [3.97, 0, 0.09], 0.012, steel, 6), beam([3.54, 0, -0.07], [3.97, 0, -0.09], 0.012, steel, 6));
  const filMat = new THREE.MeshStandardMaterial({ color: 0x55504a, emissive: 0x000000, roughness: 0.6 });
  const fpts = []; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * 9 * TAU; fpts.push(new THREE.Vector3(3.97 + 0.022 * Math.cos(a), 0.022 * Math.sin(a), 0.09 - 0.18 * t)); }
  const fil = tube(fpts, 0.008, filMat, false, 120); fil.castShadow = false; bulb.add(fil);
  const ledDisc = rod(3.54, 3.6, 0.3, 0.3, M.metal(0xe9edf2, { roughness: 0.5 }), 24); led.add(ledDisc);
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xf2d34a, emissive: 0x000000, roughness: 0.3 });
  const die = box(0.05, 0.16, 0.16, ledMat); die.position.x = 3.63; led.add(die);
  const dome = sphere(0.13, M.clear(0xffffff, 0.3, { roughness: 0.05 }), 20); dome.position.x = 3.64; dome.castShadow = false; led.add(dome);
  // ---- reflector: a true parabola with its focus at the filament (x = 4.0): y² = 4 f (x − 3.7), f = 0.3
  const refl = new THREE.Group(); group.add(refl);
  const prof = []; for (let i = 0; i <= 40; i++) { const y = 0.3 + (1.38 - 0.3) * (i / 40); prof.push([TG.focus - TG.f + (y * y) / (4 * TG.f), y]); }
  const mirror = latheX(prof, M.metal(0xe6eaf0, { roughness: 0.22, side: THREE.DoubleSide }), { ...phi, seg: 72 }); mirror.receiveShadow = false; refl.add(mirror);
  refl.add(latheX([[3.56, 0.3], [3.775, 0.3], [3.775, 0.35], [3.56, 0.35]], M.metal(0xdfe3ea, { roughness: 0.2, side: THREE.DoubleSide }), phi));
  // ---- O-ring, lens and the bezel ring that screws on to hold them
  const og = new THREE.TorusGeometry(1.42, 0.045, 10, 64, cut ? Math.PI : TAU); if (cut) og.rotateZ(-Math.PI / 2);
  const oring = new THREE.Mesh(og, M.matte(0x121316)); oring.rotation.y = Math.PI / 2; oring.position.x = 5.27; group.add(oring);
  const lens = rod(TG.lens - 0.03, TG.lens + 0.03, 1.44, 1.44, M.clear(0xcfe8ff, 0.16, { roughness: 0.03 }), 48); lens.castShadow = false; group.add(lens);
  const bezel = new THREE.Group(); group.add(bezel);
  bezel.add(latheX([[5.0, 1.56], [5.0, 1.68], [5.52, 1.68], [5.52, 1.34], [5.44, 1.34], [5.44, 1.56], [5.0, 1.56]], darkMat, phi));
  // ---- light: a glow at the lamp and a faint beam out of the lens
  const glowMat = M.ghost(0xffd9a0, 0, { blending: THREE.AdditiveBlending }); const glow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 12), glowMat); glow.position.x = 3.97; glow.castShadow = false; glow.renderOrder = 4; group.add(glow);
  const beamMat = M.ghost(0xffe6b0, 0, { blending: THREE.AdditiveBlending, side: THREE.DoubleSide, map: fadeMap() });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 1.38, 7, 40, 1, true), beamMat); cone.rotation.z = -Math.PI / 2; cone.position.x = TG.lens + 3.5; cone.castShadow = false; cone.renderOrder = 3; group.add(cone);
  let kind = lamp, on = false;
  const api = {
    group, body, tail, springG, cells, strips, sw, lampG, bulb, led, refl, oring, lens, bezel, caseMat, darkMat, knob, cone, glow,
    setLamp(k) { kind = k; bulb.visible = k === 'bulb'; led.visible = k === 'led'; glow.position.x = k === 'led' ? 3.66 : 3.97; },
    // slide the switch: k from 0 (off) to 1 (on). The bridge joins the two strips once k passes 0.67.
    setSwitch(k) { sw.position.x = TG.swOff + (TG.swOn - TG.swOff) * clamp(k, 0, 1); on = k > 0.67; return on; },
    // lit 0 to about 1.5 (1 = rated brightness); T is the filament temperature in kelvin
    setLight(lit, T = BULB.T) {
      const v = clamp(lit, 0, 2), [r, g, b] = kind === 'led' ? [0.86, 0.93, 1] : kelvinRGB(T);
      const e = Math.pow(v, 0.45);
      filMat.emissive.setRGB(r * e * 3, g * e * 3, b * e * 3); ledMat.emissive.setRGB(r * e * 2.2, g * e * 2.2, b * e * 2.2);
      glowMat.color.setRGB(r, g, b); glowMat.opacity = 0.5 * Math.min(1.2, e);
      beamMat.color.setRGB(r, g * 0.92, b * 0.8); beamMat.opacity = 0.22 * Math.min(1.3, e);
    },
    setCase(op) { for (const m of [caseMat, darkMat]) { m.opacity = op; m.depthWrite = op > 0.9; } },
  };
  api.setLamp(lamp); api.setLight(0);
  return api;
}
