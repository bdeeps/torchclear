// Chapter 4: the reflector. A parabola y² = 4 f x turned about its axis, cut in half so the rays show.
// Every ray is traced from the geometry (traceRay in torch.js): solve the quadratic for where it
// meets the parabola, take the normal from the gradient (−4f, 2y), reflect with d' = d − 2(d·n)n.
// A ray from the focus therefore leaves exactly parallel to the axis: that is the defining property
// of a parabola, and here it falls out of the arithmetic rather than being drawn in.
// Sizes (mm): rim radius 27 (a 54 mm reflector, typical of a two-D-cell torch), lamp hole radius 5.5,
// focal length 4 to 10 (6 by default). The lamp: a coiled filament 1.5 mm long and 0.4 mm across, or an
// LED whose 1 mm chip looks about 2 mm wide through its clear dome (typical sizes, not one product).
// The beam (beamProfile): tens of thousands of rays traced in 3D off the paraboloid, weighted for how
// the lamp shines (filament: evenly all round; LED: forwards, Lambertian), binned by exit angle and
// divided by each bin's solid angle to give candela per lumen. Mirror returns 85%, window passes 92%
// (typical). The mirror here is perfectly smooth; real ones are slightly rough or textured, which
// widens the hotspot and shortens the reach, so read the candela as an upper limit.
// Then: peak candela = lumens × peak; lux on the wall = candela ÷ distance² (inverse-square law);
// beam distance = √(candela ÷ 0.25 lux) (ANSI/NEMA FL 1). Lamp light: bulb 10 lm, LED 140 lm.
import { THREE, M, rod, latheX, box, sphere, clamp } from '../kit.js';
import { traceRay, beamProfile, cdAt, BULB, LED, REFL, rayPool, board, panelBg, text, fitNarrow, inReel, slim, fmt, COL, D2R, TAU } from '../torch.js';

const R = 27, H0 = 5.5, K = 0.08, AX = 5.6, XEND = 134, YMAX = 38, WALL = 1.0;     // WALL: half-width of the wall picture, metres
const NARROW = { pos: [0, 6.0, 14], target: [0, 5.4, 0] };
const LM = { bulb: BULB.lm, led: LED.lm }, SIZE = { bulb: 1.5, led: 2.0 };

function beamOf(s) {
  const prof = beamProfile({ f: s.f, R, h0: H0, off: s.off, size: SIZE[s.kind], kind: s.kind, mirror: s.mirror });
  const cd = LM[s.kind] * prof.peak;
  return { prof, cd, lux: cd / (s.dist * s.dist), reach: Math.sqrt(cd / 0.25) };
}

export default {
  id: 'reflector',
  short: 'The reflector',
  title: 'The reflector: a parabola',
  subtitle: 'Put the lamp at one special point and every reflected ray leaves parallel.',
  view: { pos: [0.6, 6.2, 13.5], target: [0.6, 5.7, 0] },
  learn: `<p>A bare lamp shines in every direction, so very little of its light lands where you point it. The <b>reflector</b> fixes that. Its curve is a <b>parabola</b>, and a parabola has one special point inside it called the <b>focus</b>. Any ray that leaves the focus and hits the mirror bounces off <b>parallel to the axis</b>. Put the lamp at the focus and its sideways light becomes a tight beam.</p>
    <p>The rays here are not drawn by hand. Each one obeys the <b>law of reflection</b>: it leaves the mirror at the same angle it arrived, measured from the surface's <b>normal</b>. The parabola's shape does the rest. (For light bending instead of bouncing, see <a href="https://glassbox.how/snellclear/">SnellClear</a>.)</p>
    <p>Look closely and you see two kinds of light. Rays that hit the mirror make the bright <b>hotspot</b>. Rays that fly straight out of the front without touching it make the wide, dim <b>spill</b>. Slide the lamp a millimetre or two off the focus and the reflected rays fan out or cross over: the beam spreads into a flood. That is all a <b>focus ring</b> or zoom does.</p>
    <p>Three words measure a beam. <b>Lumens</b> count all the light. <b>Candela</b> say how concentrated it is in one direction. <b>Lux</b> say how much lands on each square metre of the wall. Double the distance and the lux fall to a quarter.</p>
    <p>Many LED torches swap the mirror for a clear plastic <b>TIR lens</b>, a cone that bends the middle rays and bounces the outer ones off its own inside wall.</p>
    <p class="tip"><b>Try it:</b> slide the lamp back and forth and watch the spot on the wall. Then take the reflector away and see what is left.</p>`,
  terms: [
    { t: 'Parabola', d: 'The curve y² = 4fx. Rays from its focus all reflect parallel to its axis.' },
    { t: 'Focus', d: 'The point inside a parabola, a distance f from its tip, where the lamp must sit for a parallel beam.' },
    { t: 'Law of reflection', d: 'A ray leaves a mirror at the same angle to the normal as it arrived.' },
    { t: 'Hotspot and spill', d: 'The bright centre made by the mirror, and the dim wide ring of light that missed it.' },
    { t: 'Candela', d: 'Brightness in one direction: lumens per unit of solid angle. A candle is about one candela.' },
    { t: 'Lux', d: 'Light landing on a surface: lumens per square metre. Full moonlight is roughly a quarter of a lux.' },
  ],
  defaults: { off: 0, f: 6, kind: 'bulb', dist: 3, mirror: true },
  controls: [
    { key: 'off', type: 'range', label: 'Lamp position (focus ring)', min: -3, max: 3, step: 0.1, ends: ['3 mm behind', '3 mm ahead'], fmt: (v) => (Math.abs(v) < 0.05 ? 'at the focus' : Math.abs(v).toFixed(1) + ' mm ' + (v < 0 ? 'behind' : 'ahead')) },
    { key: 'f', type: 'range', label: 'Reflector shape (focal length)', min: 4, max: 10, step: 0.5, ends: ['deep', 'shallow'], fmt: (v) => v.toFixed(1) + ' mm' },
    { key: 'kind', type: 'seg', label: 'Lamp', options: [{ v: 'bulb', label: 'Filament: shines all round' }, { v: 'led', label: 'LED: shines forwards' }], fmt: (v) => LM[v].toFixed(0) + ' lm' },
    { key: 'dist', type: 'log', label: 'Distance to the wall', min: 1, max: 20, ends: ['1 m', '20 m'], fmt: (v) => v.toFixed(1) + ' m' },
    { key: 'mirror', type: 'toggle', label: 'Reflector fitted' },
  ],
  quiz: [
    { q: 'Where must the lamp sit for the reflected rays to leave parallel?', options: ['Touching the mirror', 'At the focus of the parabola', 'At the rim', 'Anywhere on the axis'], answer: 1, why: 'Only rays that start at the focus reflect parallel to the axis. Move the lamp and they fan out or cross.' },
    { q: 'What makes the dim, wide ring of light around a torch’s hotspot?', options: ['Rays that left the front without touching the mirror', 'Dirt on the lens', 'A second bulb', 'Light leaking through the case'], answer: 0, why: 'That is the spill. Rays aimed forwards miss the reflector and spread out in a wide cone.' },
    { q: 'You step back from 2 m to 4 m. The lux on the wall…', options: ['halve', 'fall to a quarter', 'stay the same', 'double'], answer: 1, why: 'The same light covers four times the area: the inverse-square law. Lux = candela ÷ distance².' },
  ],
  reel: [
    { ms: 5600, caption: 'The reflector is a parabola. Rays from its focus all bounce out parallel: a beam.', set: { f: 6, kind: 'bulb', dist: 3, mirror: true }, anim: { off: [2.4, 0] }, view: { pos: [0, 5.2, 13.2], target: [0, 5.0, 0] }, spin: 0 },
    { ms: 5200, caption: 'Slide the lamp two millimetres off the focus and the beam spreads into a flood.', set: { f: 6, kind: 'bulb', dist: 3, mirror: true }, anim: { off: [0, -2.4] }, view: { pos: [0, 5.2, 13.2], target: [0, 5.0, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const tall = () => inReel() || stage.host.clientWidth < 560;
    const G = new THREE.Group(); root.add(G);                       // the optics; origin at the parabola's tip, 1 unit = 1/K mm
    const P = (x, y) => [x * K, y * K, 0];
    // ---- reflector (rebuilt when its focal length changes) and window
    const mirMat = M.metal(0xdfe4ec, { roughness: 0.32, side: THREE.DoubleSide });
    let mirror = null, fNow = 0;
    const win = rod(0, 0.05, R * K, R * K, M.clear(0xcfe8ff, 0.14, { roughness: 0.03 }), 48); win.castShadow = false; G.add(win);
    const neck = latheX([[-0.35, H0 * K], [0.1, H0 * K], [0.1, H0 * K + 0.06], [-0.35, H0 * K + 0.06]], M.metal(0xd4a94e, { roughness: 0.3, side: THREE.DoubleSide }), { phiStart: Math.PI / 2, phiLength: Math.PI }); G.add(neck);
    const bodyT = rod(-2.0, -0.3, 17 * K, 17 * K, M.plastic(0x2b5fa8, { roughness: 0.45 }), 40); G.add(bodyT);
    const setMirror = (f) => {
      if (f === fNow) return; fNow = f;
      if (mirror) { G.remove(mirror); mirror.geometry.dispose(); }
      const prof = []; for (let i = 0; i <= 48; i++) { const y = H0 + (R - H0) * (i / 48); prof.push([((y * y) / (4 * f)) * K, y * K]); }
      mirror = latheX(prof, mirMat, { phiStart: Math.PI / 2, phiLength: Math.PI, seg: 72 }); mirror.receiveShadow = false; mirror.castShadow = false; G.add(mirror);
      win.position.x = ((R * R) / (4 * f)) * K + 0.1;
      neck.position.x = ((H0 * H0) / (4 * f)) * K - 0.1;
    };
    // ---- lamp: a small bulb, or an LED chip on a post
    const lampG = new THREE.Group(); G.add(lampG);
    const bulbG = new THREE.Group(), ledG = new THREE.Group(); lampG.add(bulbG, ledG);
    const globe = sphere(0.42, M.clear(0xfff0cf, 0.22, { roughness: 0.05 }), 20); globe.castShadow = false; bulbG.add(globe);
    const fil = box(0.03, 0.03, 0.16, M.glow(0xffd9a0)); bulbG.add(fil);
    bulbG.add(rod(-1.5, -0.32, 0.3, 0.3, M.metal(0xd4a94e, { roughness: 0.3 }), 20));
    const die = box(0.04, 0.13, 0.13, M.glow(0xf4f8ff)); ledG.add(die);
    ledG.add(rod(-1.5, -0.03, 0.26, 0.26, M.metal(0xdfe3ea, { roughness: 0.4 }), 20));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), M.ghost(0xffd9a0, 0.35, { blending: THREE.AdditiveBlending })); glow.castShadow = false; lampG.add(glow);
    // ---- focus marker and axis
    const focus = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 24), M.glow(0xff7ad9)); G.add(focus);
    const axis = new THREE.Mesh(new THREE.BoxGeometry(XEND * K + 1, 0.012, 0.012), M.glow(0x9fb3c8, { transparent: true, opacity: 0.45 })); axis.position.x = (XEND * K) / 2; G.add(axis);
    const rays = rayPool(G, 96, 0.018);

    // ---- the wall
    const st = { b: null, s: null };
    const img = document.createElement('canvas'); img.width = img.height = 160; const ig = img.getContext('2d');
    const bd = board(root, 9.4, 2.9, 940, 290, (g, W, H) => {
      panelBg(g, W, H);
      if (!st.b) return;
      const { b, s } = st, lm = LM[s.kind];
      // lux at radius r metres: E = I(α) cos³α ÷ D², with tan α = r ÷ D
      const E = (r) => { const al = Math.atan2(r, s.dist); return (lm * cdAt(b.prof, al / D2R) * Math.cos(al) ** 3) / (s.dist * s.dist); };
      const tone = (e) => clamp((Math.log10(Math.max(e, 1e-6)) + 1.3) / 4.4, 0, 1);       // 0.05 lux is black, about 1,000 lux is white
      const id = ig.createImageData(160, 160), col = s.kind === 'led' ? [225, 236, 255] : [255, 214, 150];
      for (let j = 0; j < 160; j++) for (let i = 0; i < 160; i++) { const r = Math.hypot((i - 79.5) / 80, (j - 79.5) / 80) * WALL, v = tone(E(r)), o = (j * 160 + i) * 4; id.data[o] = 18 + (col[0] - 18) * v; id.data[o + 1] = 20 + (col[1] - 20) * v; id.data[o + 2] = 26 + (col[2] - 26) * v; id.data[o + 3] = 255; }
      ig.putImageData(id, 0, 0);
      const wx = 16, wy = 16, ws = 258; g.imageSmoothingEnabled = true; g.drawImage(img, wx, wy, ws, ws);
      g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; g.strokeRect(wx, wy, ws, ws);
      const tx = 300;
      text(g, `The wall, ${s.dist.toFixed(1)} m away`, tx, 44, { font: 'bold 32px sans-serif', col: COL.text });
      text(g, '2 m of it shown', tx, 74, { font: '21px sans-serif', col: COL.soft });
      text(g, `brightest: ${fmt(b.lux, b.lux < 10 ? 1 : 0)} lux`, W - 20, 44, { font: 'bold 28px sans-serif', col: s.kind === 'led' ? '#dfeaff' : COL.warm, align: 'right' });
      // brightness across the middle of the wall
      const x0 = tx, x1 = W - 20, y0 = H - 40, y1 = 96; g.strokeStyle = s.kind === 'led' ? '#dfeaff' : COL.warm; g.lineWidth = 4; g.beginPath();
      for (let i = 0; i <= 240; i++) { const r = Math.abs(i / 120 - 1) * WALL, y = y0 - tone(E(r)) * (y0 - y1), x = x0 + (i / 240) * (x1 - x0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke();
      text(g, 'brightness across the wall', x0, H - 12, { font: '20px sans-serif', col: COL.soft });
      text(g, 'hotspot in the middle, spill at the sides', x1, H - 12, { font: '20px sans-serif', col: COL.soft, align: 'right' });
    }, [0.6, 1.55, 0]);

    const Ls = {
      focus: stage.label('Focus', [0, 0, 0], G, 'hot'), lamp: stage.label('Lamp', [0, 0, 0], G),
      spot: stage.label('Reflected: the hotspot', [XEND * K - 1.9, 1.2, 0], G), spill: stage.label('Missed the mirror: spill', [XEND * K - 3.2, 2.75, 0], G),
      mir: stage.label('Parabolic mirror', [0.6, -2.75, 0], G),
    };
    let key = '', wasTall = null;
    const draw = (s) => {
      setMirror(s.f);
      const src = [s.f + s.off, 0], segs = [], led = s.kind === 'led';
      const angs = []; for (let a = 4; a <= (led ? 86 : 150); a += led ? 6.3 : 7.3) angs.push(a);
      for (const a of angs) for (const sg of [1, -1]) {
        const r = traceRay(s.f, R, H0, src, sg * a * D2R, s.mirror), w = led ? Math.cos(a * D2R) * 0.75 + 0.25 : 0.8;
        const col = r.lost ? '#ff6b6b' : r.bounces ? COL.ray : COL.spill;
        for (let i = 1; i < r.pts.length; i++) segs.push({ a: P(...r.pts[i - 1]), b: P(...r.pts[i]), I: w * 0.3, r: 0.012, col: r.lost ? '#ff6b6b' : r.bounces ? COL.ray : COL.spill });
        if (r.lost) continue;
        const p = r.pts[r.pts.length - 1];
        let L = (XEND - p[0]) / r.d[0]; const ymax = YMAX; if (Math.abs(p[1] + r.d[1] * L) > ymax) L = ((r.d[1] > 0 ? ymax : -ymax) - p[1]) / r.d[1];
        segs.push({ a: P(...p), b: P(p[0] + r.d[0] * L, p[1] + r.d[1] * L), I: w * (r.bounces ? 0.85 : 0.45), col });
      }
      rays.draw(segs);
      mirror.visible = neck.visible = s.mirror;
      lampG.position.set(src[0] * K, 0, 0); bulbG.visible = !led; ledG.visible = led;
      glow.material.color.set(led ? 0xdfeaff : 0xffd9a0);
      focus.position.set(s.f * K, 0, 0);
      Ls.focus.position.set(s.f * K + 0.2, 0.6, 0); Ls.lamp.position.set(src[0] * K - 0.5, -0.75, 0);
      Ls.lamp.element.textContent = led ? 'LED chip' : 'Filament';
    };
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const narrow = fitNarrow(stage, [Ls.mir, Ls.lamp, Ls.spill, Ls.spot], -0.1, NARROW), tl = tall();
        if (tl !== wasTall) {
          wasTall = tl;
          G.position.set(tl ? -5.3 : -4.7, inReel() ? 6.6 : AX, 0);
          bd.mesh.position.set(tl ? 0 : 0.6, inReel() ? 1.9 : 1.55, 0); bd.mesh.scale.setScalar(inReel() ? 1.22 : 1);
        }
        Ls.spot.visible = !narrow && s.mirror; Ls.focus.visible = s.mirror; Ls.mir.visible = !narrow && s.mirror;
        const k = `${s.off.toFixed(2)}|${s.f}|${s.kind}|${s.dist.toFixed(2)}|${s.mirror}`;
        if (k !== key) { key = k; draw(s); st.b = beamOf(s); st.s = { ...s }; bd.redraw(); }
      },
      readout(s) {
        const b = st.b && key ? st.b : beamOf(s), p = b.prof;
        const head = !s.mirror ? 'No reflector: a dim flood' : Math.abs(s.off) < 0.35 ? 'At the focus: a tight beam' : s.off < 0 ? 'Behind the focus: rays fan out' : 'Ahead of the focus: rays cross';
        return slim(stage, `<div class="big">${head}</div>
          <div class="row"><span>Peak</span><b>${fmt(b.cd, 0)} candela</b></div>
          <div class="row"><span>Brightest at ${s.dist.toFixed(1)} m</span><b>${fmt(b.lux, b.lux < 10 ? 1 : 0)} lux</b></div>
          <div class="row"><span>Reaches (0.25 lux)</span><b>${fmt(b.reach, 0)} m</b></div>
          <div class="row"><span>Mirror · spill · lost</span><b>${Math.round(p.spot * 100)} · ${Math.round(p.spill * 100)} · ${Math.round(p.lost * 100)}%</b></div>
          <small>${LM[s.kind].toFixed(0)} lm lamp${s.mirror ? `, hotspot ±${p.half.toFixed(1)}°, perfect mirror` : ''}. 0.25 lux: full moonlight.</small>`);
      },
    };
  },
};
