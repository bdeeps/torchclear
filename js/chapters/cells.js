// Chapter 5: the cells. Four kinds, each cut open, and a torch left switched on until they are flat.
// What is drawn inside each cell (Wikipedia "Zinc–carbon battery", "Alkaline battery",
// "Nickel–metal hydride battery", "Lithium-ion battery"; Energizer and Eveready data sheets):
//  - Zinc-carbon: the zinc can is the − electrode and also the container; inside it a paper
//    separator, a black mix of manganese dioxide and carbon wet with ammonium or zinc chloride, and
//    a carbon rod to the + cap. Using the cell eats the can, which is why old ones leak.
//  - Alkaline: turned inside out. Zinc powder in a gel fills the middle around a brass pin (−);
//    manganese dioxide lines a steel can (+); the electrolyte is potassium hydroxide.
//  - NiMH and lithium-ion: two long coated foils and a separator rolled up like a Swiss roll.
// The run-down (runDown in torch.js) steps the loop of chapter 2 through time: each step it solves
// for the current, takes that charge out of the cells, and looks up the new voltage and resistance.
// Capacities at torch currents: zinc-carbon about 3 Ah, alkaline 9.2 Ah, NiMH 8 Ah, 18650 3 Ah
// (sources at the top of torch.js). Run time follows ANSI/NEMA FL 1: until the light is 10% of what
// it was 30 seconds after switch-on. Lamp: the PR2 bulb straight on the cells, or a 1 W LED whose
// driver draws a steady 1.24 W while the cells can supply it.
import { THREE, M, latheX, clamp, lerp } from '../kit.js';
import { CELLS, runDown, sampleRun, bulbLife, bulbT, BULB, makeDots, board, panelBg, text, axes, plot, dot, fitNarrow, inReel, slim, fmt, hrs, COL, HEX, TAU } from '../torch.js';

const HMAX = 30, ORDER = ['zc', 'alk', 'nimh', 'li'];
const NARROW = { pos: [0, 6.0, 13.5], target: [0, 5.6, 0] };
const SIZE = { zc: [1.39, 5.0], alk: [1.39, 5.0], nimh: [1.39, 5.0], li: [0.73, 5.28] };       // radius, height: 12.3 mm to a unit

// One layer of a cut-away cell: a lathe with a quarter removed, plus flat faces on the two cuts.
function layer(parent, poly, mat) {
  const g = new THREE.Group(); parent.add(g);
  const m = latheX([...poly, poly[0]], mat, { phiStart: Math.PI / 2, phiLength: Math.PI * 1.5, seg: 48 }); g.add(m);
  const sh = new THREE.Shape(poly.map(([x, r]) => new THREE.Vector2(x, r)));
  for (const rx of [Math.PI, Math.PI / 2]) { const c = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat); c.rotation.x = rx; g.add(c); }
  return g;
}
const mat = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, metalness: 0, side: THREE.DoubleSide, ...o });
const met = (col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.85, side: THREE.DoubleSide });

export default {
  id: 'cells',
  short: 'The cells',
  title: 'The cells: inside, and how long',
  subtitle: 'Cut four kinds of cell open, then leave the torch on until it dies.',
  view: { pos: [0.6, 6.4, 13.5], target: [0.6, 5.9, 0] },
  learn: `<p>A cell is a small chemical engine. It holds two materials that would love to react, kept apart by a damp <b>separator</b>. The only way the reaction can go ahead is by sending electrons the long way round, through your torch.</p>
    <p>In a cheap <b>zinc-carbon</b> cell the outer <b>zinc can</b> is one of those materials. Using the cell eats the can from the inside. Leave a flat one in the torch and the can wears through, and the mess leaks out. An <b>alkaline</b> cell is built inside out: the zinc is a powder in the middle, and a strong steel can holds everything in. It stores about three times as much at torch currents.</p>
    <p><b>NiMH</b> and <b>lithium-ion</b> cells can be recharged hundreds of times. Inside, two long coated foils are rolled up like a Swiss roll. A lithium-ion <b>18650</b> cell is smaller than a D cell but gives 3.6 V, more than two ordinary cells together.</p>
    <p>How long will the torch run? Roughly <b>capacity ÷ current</b>. A cell marked 9 Ah can give half an amp for about 18 hours. But a bulb wired straight to the cells dims all the way down, while an LED <b>driver</b> holds the light steady and then drops off sharply.</p>
    <p><b>Take care.</b> Take cells out of a torch you will not use for months. Never try to recharge an ordinary zinc-carbon or alkaline cell. Use lithium-ion cells with built-in protection and the charger made for them, never carry them loose with keys or coins, and stop using one that is dented or swollen.</p>
    <p class="tip"><b>Try it:</b> pick zinc-carbon, slide the time forward and watch the can thin out. Then switch the lamp to the LED and compare how the light fades.</p>`,
  terms: [
    { t: 'Capacity', d: 'How much charge a cell can deliver, in amp-hours (Ah). 1 Ah is one amp for one hour.' },
    { t: 'Electrode', d: 'One of the two active materials in a cell. Electrons leave from the negative one and return to the positive one.' },
    { t: 'Electrolyte', d: 'The damp paste or liquid between the electrodes. Charged atoms (ions) move through it.' },
    { t: 'Separator', d: 'A thin porous sheet that keeps the two electrodes from touching but lets ions pass.' },
    { t: 'Rechargeable', d: 'A cell whose chemical reaction can be run backwards by pushing current into it.' },
    { t: 'Run time', d: 'By the FL 1 torch standard: the time until the light has fallen to 10% of its starting value.' },
  ],
  defaults: { chem: 'zc', lamp: 'bulb', hours: 0 },
  controls: [
    { key: 'chem', type: 'seg', label: 'Cells', options: ORDER.map((k) => ({ v: k, label: CELLS[k].name })), fmt: (v) => (v === 'li' ? '1 × 18650' : '2 × D') },
    { key: 'lamp', type: 'seg', label: 'Lamp', options: [{ v: 'bulb', label: 'Filament bulb' }, { v: 'led', label: 'LED with driver' }], fmt: (v) => (v === 'bulb' ? '1.2 W' : '1.2 W') },
    { key: 'hours', type: 'range', label: 'Time switched on', min: 0, max: HMAX, step: 0.1, ends: ['new cells', HMAX + ' hours'], fmt: (v) => hrs(v) },
  ],
  quiz: [
    { q: 'Why do old zinc-carbon cells so often leak?', options: ['They are filled with water', 'The zinc can is used up as the cell works, and wears through', 'They get too cold', 'The label dissolves'], answer: 1, why: 'In a zinc-carbon cell the can is the fuel. As it is eaten away it gets thin, and the paste inside can escape.' },
    { q: 'An alkaline D cell gives about 9 Ah at torch currents. Roughly how long can it supply 0.5 A?', options: ['About 2 hours', 'About 18 hours', 'About 90 hours', 'About 4.5 hours'], answer: 1, why: 'Run time is roughly capacity ÷ current: 9 Ah ÷ 0.5 A = 18 hours.' },
    { q: 'Which of these can be safely recharged?', options: ['Zinc-carbon', 'Ordinary alkaline', 'NiMH and lithium-ion', 'None of them'], answer: 2, why: 'NiMH and lithium-ion cells are made to be recharged, with the right charger. Ordinary zinc-carbon and alkaline cells are not.' },
  ],
  reel: [
    { ms: 5600, caption: 'In a zinc-carbon cell the can is the fuel. Using the cell eats it, which is why old ones leak.', set: { chem: 'zc', lamp: 'bulb' }, anim: { hours: [0, 7] }, view: { pos: [0, 5.4, 13.2], target: [0, 5.1, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const tall = () => inReel() || stage.host.clientWidth < 560;
    const cellG = new THREE.Group(); cellG.rotation.z = Math.PI / 2; root.add(cellG);     // built along X, stood on end
    // ---- zinc-carbon
    const zc = new THREE.Group(); cellG.add(zc);
    layer(zc, [[0.3, 0.2], [4.3, 0.2], [4.3, 1.13], [0.3, 1.13]], mat(0x5d5759, { roughness: 0.9 }));                 // MnO₂ + carbon mix
    layer(zc, [[0.22, 1.13], [4.45, 1.13], [4.45, 1.18], [0.22, 1.18]], mat(0xe9e2cf));                             // paper separator
    layer(zc, [[0.4, 0], [4.86, 0], [4.86, 0.2], [0.4, 0.2]], mat(0x17181b, { roughness: 0.5 }));                    // carbon rod
    layer(zc, [[4.45, 0.2], [4.62, 0.2], [4.62, 1.36], [4.45, 1.36]], mat(0x7a3b2e));                               // seal
    layer(zc, [[4.86, 0], [5.0, 0], [5.0, 0.3], [4.7, 0.3], [4.7, 0.2], [4.86, 0.2]], met(HEX.brass));               // + cap
    const zincMat = met(HEX.zinc); let zincG = null, zincKey = -1;
    const setZinc = (x) => {
      const q = Math.round(clamp(x, 0, 1.1) * 30); if (q === zincKey) return; zincKey = q;
      if (zincG) { zc.remove(zincG); zincG.traverse((o) => o.geometry?.dispose()); }
      const t = 0.21 * (1 - 0.82 * clamp(q / 30, 0, 1)), ri = 1.39 - t;       // the can starts about 0.2 units thick here (drawn thicker than life) and is eaten from the inside
      zincG = layer(zc, [[0, 0], [0, 1.39], [4.45, 1.39], [4.45, ri], [0.05 + t, ri], [0.05 + t, 0]], zincMat);
    };
    // ---- alkaline
    const alk = new THREE.Group(); cellG.add(alk);
    layer(alk, [[0.12, 1.33], [0.12, 1.39], [5.0, 1.39], [5.0, 0], [4.9, 0], [4.9, 0.3], [4.78, 0.3], [4.78, 1.33]], met(HEX.steel));  // steel can and + cap
    layer(alk, [[0.5, 0.82], [4.7, 0.82], [4.7, 1.33], [0.5, 1.33]], mat(0x5d5759, { roughness: 0.9 }));              // MnO₂ ring
    layer(alk, [[0.42, 0.78], [4.72, 0.78], [4.72, 0.82], [0.42, 0.82]], mat(0xe9e2cf));                             // separator
    const gelMat = mat(0x9aa6b4, { roughness: 0.8 });
    layer(alk, [[0.5, 0.07], [4.5, 0.07], [4.5, 0.78], [0.5, 0.78]], gelMat);                                       // zinc powder gel
    layer(alk, [[0.0, 0], [4.0, 0], [4.0, 0.07], [0.12, 0.07], [0.12, 0.7], [0.0, 0.7]], met(HEX.brass));            // brass pin and − cap
    layer(alk, [[0.12, 0.7], [0.42, 0.7], [0.42, 1.33], [0.12, 1.33]], mat(0x3f7fbf));                              // plastic seal
    // ---- rolled cells (NiMH, lithium-ion)
    const roll = (R, Hh, posCol, negCol, canCol) => {
      const g = new THREE.Group(); cellG.add(g);
      layer(g, [[0, 0], [0, R], [Hh - 0.25, R], [Hh - 0.25, R - 0.05], [0.06, R - 0.05], [0.06, 0]], met(canCol));
      layer(g, [[Hh - 0.25, 0], [Hh, 0], [Hh, R * 0.45], [Hh - 0.12, R * 0.45], [Hh - 0.12, R - 0.05], [Hh - 0.25, R - 0.05]], met(HEX.steel));
      const turns = R > 1 ? 7 : 5, w = (R - 0.05 - 0.12) / turns, lay = [];
      for (let i = 0; i < turns; i++) {
        const r0 = 0.12 + i * w;
        layer(g, [[0.25, r0], [Hh - 0.45, r0], [Hh - 0.45, r0 + w * 0.42], [0.25, r0 + w * 0.42]], mat(posCol, { roughness: 0.85 }));
        layer(g, [[0.2, r0 + w * 0.42], [Hh - 0.4, r0 + w * 0.42], [Hh - 0.4, r0 + w * 0.5], [0.2, r0 + w * 0.5]], mat(0xf1ecdf));
        layer(g, [[0.25, r0 + w * 0.5], [Hh - 0.45, r0 + w * 0.5], [Hh - 0.45, r0 + w * 0.92], [0.25, r0 + w * 0.92]], mat(negCol, { roughness: 0.85 }));
        layer(g, [[0.2, r0 + w * 0.92], [Hh - 0.4, r0 + w * 0.92], [Hh - 0.4, r0 + w], [0.2, r0 + w]], mat(0xf1ecdf));
        lay.push([r0 + w * 0.21, r0 + w * 0.71]);
      }
      g.userData.lay = lay; g.userData.H = Hh;
      return g;
    };
    const nimh = roll(1.39, 5.0, 0x5d7d62, 0x4b4f58, HEX.steel), li = roll(0.73, 5.28, 0x23252b, 0x6a6f7a, 0xb9c0cc);
    const groups = { zc, alk, nimh, li };
    // ions on the cut face of the rolled cells: they sit in the − layers when charged and cross as the cell empties
    const NI = 70, ions = makeDots(cellG, NI, 0xffe27a, 0.035);
    const rnd = (() => { let q = 5; return () => { q = (q * 1664525 + 1013904223) >>> 0; return q / 4294967296; }; })();
    const ionSeed = Array.from({ length: NI }, () => [rnd(), rnd(), rnd()]);
    const ionK = new Float32Array(NI);

    // ---- the chart
    let runs = {}, runLamp = '';
    const ensure = (lamp) => { if (lamp === runLamp) return; runLamp = lamp; runs = {}; for (const k of ORDER) runs[k] = runDown(k, lamp, HMAX); };
    ensure('bulb');
    const st = { chem: 'zc', lamp: 'bulb', hours: 0 };
    const bd = board(root, 9.4, 4.3, 940, 430, (g, W, H) => {
      panelBg(g, W, H);
      const lamp = st.lamp, top = lamp === 'bulb' ? 40 : 160;
      text(g, lamp === 'bulb' ? 'Light from the bulb as the cells run down' : 'Light from the LED as the cells run down', 24, 42, { font: 'bold 30px sans-serif', col: COL.text });
      const a = axes(g, { x0: 78, x1: W - 28, y0: 236, y1: 70, xMax: HMAX, yMax: top, xTicks: [0, 5, 10, 15, 20, 25, 30], yTicks: lamp === 'bulb' ? [0, 10, 20, 30, 40] : [0, 40, 80, 120, 160], xFmt: (v) => v + ' h', yFmt: (v) => v + '' });
      text(g, 'lumens', 84, 66, { font: '19px sans-serif', col: COL.soft });
      ORDER.forEach((k, i) => {
        const r = runs[k], on = k === st.chem, pts = [];
        for (let j = 0; j < r.t.length; j += 5) pts.push([r.t[j], Math.min(top, r.lm[j])]);
        g.globalAlpha = on ? 1 : 0.45; plot(g, pts, a.X, a.Y, CELLS[k].col, on ? 5 : 2.5); g.globalAlpha = 1;
        text(g, CELLS[k].name, 96 + i * 215, 292, { font: (on ? 'bold ' : '') + '21px sans-serif', col: CELLS[k].col });
      });
      const cur = runs[st.chem], q = sampleRun(cur, st.hours);
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(a.X(st.hours), 70); g.lineTo(a.X(st.hours), 236); g.stroke(); g.setLineDash([]);
      dot(g, a.X(st.hours), a.Y(Math.min(top, q.lm)), CELLS[st.chem].col, 9);
      // volts
      const b = axes(g, { x0: 78, x1: W - 28, y0: H - 16, y1: 326, xMax: HMAX, yMax: 4.4, xTicks: [], yTicks: [0, 2, 4], yFmt: (v) => v + ' V' });
      text(g, 'volts the cells deliver', 300, 322, { font: '19px sans-serif', col: COL.soft });
      ORDER.forEach((k) => { const r = runs[k], on = k === st.chem, pts = []; for (let j = 0; j < r.t.length; j += 5) pts.push([r.t[j], r.V[j]]); g.globalAlpha = on ? 1 : 0.4; plot(g, pts, b.X, b.Y, CELLS[k].col, on ? 4 : 2); g.globalAlpha = 1; });
      dot(g, b.X(st.hours), b.Y(q.V), CELLS[st.chem].col, 7);
    }, [0.6, 2.3, 0]);

    const lab = (t, pos, cls) => stage.label(t, pos, root, cls);
    const Ls = {
      zc: [lab('Zinc can: the − end, and the fuel', [0, 0, 0], 'hot'), lab('Carbon rod to the + cap', [0, 0, 0]), lab('Manganese dioxide mix', [0, 0, 0]), lab('Paper separator', [0, 0, 0])],
      alk: [lab('Zinc powder gel: the fuel', [0, 0, 0], 'hot'), lab('Steel can: the + end', [0, 0, 0]), lab('Manganese dioxide', [0, 0, 0]), lab('Brass pin to the − end', [0, 0, 0])],
      nimh: [lab('Two foils and a separator, rolled up', [0, 0, 0], 'hot'), lab('+ nickel hydroxide', [0, 0, 0]), lab('− metal that soaks up hydrogen', [0, 0, 0])],
      li: [lab('Two coated foils, rolled up', [0, 0, 0], 'hot'), lab('+ metal oxide on aluminium', [0, 0, 0]), lab('− graphite on copper', [0, 0, 0]), lab('18 mm × 65 mm', [0, 0, 0])],
    };
    // label spots, relative to the cell's base centre: [x, y]
    const SPOT = { zc: [[-2.9, 1.0], [0.4, 5.5], [-2.6, 2.4], [2.5, 3.4]], alk: [[2.6, 2.8], [0.6, 5.5], [-2.7, 2.2], [2.5, 0.7]], nimh: [[0, 5.5], [-2.8, 2.6], [2.6, 1.6]], li: [[0, 5.8], [-2.9, 2.8], [2.3, 1.8], [2.2, 4.4]] };
    let key = '', wasTall = null, cx = -4.2, cy = 2.0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const narrow = fitNarrow(stage, [], -0.1, NARROW), tl = tall();
        if (tl !== wasTall) { wasTall = tl; cx = tl ? 0 : 3.1; cy = inReel() ? 5.8 : 4.9; bd.mesh.position.set(tl ? 0 : 0.6, inReel() ? 2.8 : 2.3, 0); bd.mesh.scale.setScalar(inReel() ? 1.2 : 1); }
        cellG.position.set(cx, cy, 0); cellG.scale.setScalar(inReel() ? 0.8 : narrow ? 0.85 : 1);
        ensure(s.lamp);
        const q = sampleRun(runs[s.chem], s.hours), x = clamp(q.x, 0, 1.05);
        ORDER.forEach((k) => { groups[k].visible = k === s.chem; Ls[k].forEach((l, i) => { l.visible = k === s.chem && !narrow; const p = narrow ? [0, -0.45] : SPOT[k][i], sc = inReel() ? 0.8 : narrow ? 0.85 : 1; l.position.set(cx + p[0] * sc, cy + p[1] * sc, 1.0); }); });
        setZinc(s.chem === 'zc' ? x : 0);
        gelMat.color.setRGB(lerp(0.60, 0.92, x), lerp(0.65, 0.90, x), lerp(0.71, 0.84, x));                         // zinc turns to pale zinc oxide
        const rolled = s.chem === 'nimh' || s.chem === 'li';
        ions.visible = rolled;
        if (rolled) {
          const g = groups[s.chem], lay = g.userData.lay, Hh = g.userData.H;
          for (let i = 0; i < NI; i++) {
            const sd = ionSeed[i], L = lay[Math.floor(sd[0] * lay.length)], want = sd[2] < x ? 0 : 1;                // 1: in the − layer (charged)
            ionK[i] += (want - ionK[i]) * (1 - Math.exp(-4 * dt));
            const r = lerp(L[0], L[1], ionK[i]);
            ions.put(i, 0.5 + sd[1] * (Hh - 1.1), -r, 0.03, 1);                                                   // on the cut face that looks at the camera
          }
          ions.done();
        }
        const k = `${s.chem}|${s.lamp}|${s.hours.toFixed(1)}`;
        if (k !== key) { key = k; Object.assign(st, { chem: s.chem, lamp: s.lamp, hours: s.hours }); bd.redraw(); }
      },
      readout(s) {
        ensure(s.lamp);
        const c = CELLS[s.chem], run = runs[s.chem], q = sampleRun(run, s.hours), left = clamp(1 - q.x, 0, 1);
        const v0 = run.V[0], burn = s.lamp === 'bulb' && v0 > 3.0;
        const head = q.lm < 0.1 * run.lm0 ? 'Flat: below a tenth of its light' : `${fmt(q.lm, q.lm < 20 ? 1 : 0)} lumens ${s.hours < 0.05 ? 'with new cells' : 'after ' + hrs(s.hours)}`;
        return slim(stage, `<div class="big">${head}</div>
          <div class="row"><span>Run time (to 10%)</span><b>${hrs(run.fl1)}</b></div>
          <div class="row"><span>Charge left</span><b>${Math.round(left * 100)}% of ${c.Ah} Ah</b></div>
          <div class="row"><span>Now</span><b>${q.V.toFixed(2)} V, ${q.I.toFixed(2)} A</b></div>
          <div class="row"><span>Cells</span><b>${c.n} × ${c.nom} V, ${c.n * c.g} g</b></div>
          <small>${burn ? `${v0.toFixed(1)} V on a ${BULB.V} V bulb: it would burn out in about ${hrs(bulbLife(v0))}.` : c.re ? 'Rechargeable.' : 'Single use: do not recharge.'}</small>`);
      },
    };
  },
};
