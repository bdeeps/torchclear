// Chapter 2: the loop. The torch is cut in half so the whole circuit shows.
// Path (conventional current, + to −): front cell's + cap → bulb tip → filament → bulb shell →
// lamp holder → front strip → switch bridge → long strip → tail plate → spring → rear cell's − base,
// then through both cells. Electrons go the other way round.
// Model (torch.js): two D cells in series, each with an open-circuit voltage e(x) and an internal
// resistance r(x) that depend on how much charge is used (x), shaped on the Energizer E95 and
// Eveready 1250 data sheets. The PR2 bulb takes I = 0.5 A × (V ÷ 2.38)^0.6 and gives
// 10 lm × (V ÷ 2.38)^3.4 ("Lamp rerating"). The loop is solved for V = E − I R.
// Electrons per second = I ÷ 1.602 × 10⁻¹⁹ C. Real electrons drift at well under a millimetre a
// second (see CurrentClear); the beads here are drawn far faster so that the direction shows.
// A reversed cell: the two voltages oppose, so E = e − e = 0 and nothing flows.
import { THREE, M, approach, arrow } from '../kit.js';
import { makeTorch, makePath, makeDots, TORCH_PATH, TG, CELLS, solve, bulbT, bulbLm, BULB, board, panelBg, text, axes, plot, dot, fitNarrow, inReel, slim, fmt, COL, HEX, clamp } from '../torch.js';

const Y0 = 6.7, N = 84;
const NARROW = { pos: [0.6, 6.2, 14.2], target: [0.6, 5.6, 0] };
const E_CHARGE = 1.602176634e-19;

function loop(s) {
  const c = CELLS[s.chem], x = s.used / 100;
  if (s.order === 'flip') return { ...solve(s.chem, x, 'bulb', { E: 0, R: 2 * c.r(x) + 0.05 }), e1: c.e(x) };
  return { ...solve(s.chem, x, 'bulb'), e1: c.e(x) };
}

export default {
  id: 'circuit',
  short: 'The loop',
  title: 'The circuit: one closed loop',
  subtitle: 'Follow the current out of the cells, through the lamp, and all the way back.',
  view: { pos: [0.6, 6.5, 13.5], target: [0.6, 5.9, 0] },
  learn: `<p>Electricity only flows round a <b>closed loop</b>, called a <b>circuit</b>. Follow it. From the <b>+ cap</b> of the front cell the path goes into the bulb's tip, through the hair-thin <b>filament</b>, out through the bulb's metal shell, along a brass strip to the <b>switch</b>, along a second strip to the tail, through the <b>spring</b>, and into the flat <b>− end</b> of the rear cell. Slide the switch off and you open a gap. The flow stops everywhere at once.</p>
    <p>Which way does it go? The moving things are <b>electrons</b>, and they leave the <b>−</b> end and travel round to the <b>+</b> end. But long before anyone knew about electrons, people chose to draw <b>conventional current</b> from + to −. Both pictures describe the same flow. Electrons are not used up: as many come back as went out. What the lamp takes from them is <b>energy</b>. (The beads here race along so you can see the direction. Real electrons in a wire drift slower than a snail.)</p>
    <p>The two cells sit in <b>series</b>, nose to tail, so their pushes add: 1.5 V + 1.5 V = 3 V. But a cell is not perfect. It has some <b>internal resistance</b>, so part of its voltage is lost inside it whenever current flows. As a cell runs down, its push falls and its internal resistance climbs. The lamp gets fewer volts, and a filament's light drops very steeply with voltage. That is why a torch fades to a dull orange.</p>
    <p>For more on what current and resistance are, see <a href="https://glassbox.how/currentclear/">CurrentClear</a> and <a href="https://glassbox.how/ohmslawclear/">OhmsLawClear</a>.</p>
    <p class="tip"><b>Try it:</b> use up the cells and watch the lamp's volts sag. Then flip one cell round: the two pushes cancel and nothing flows at all.</p>`,
  terms: [
    { t: 'Circuit', d: 'A complete loop that current can flow round, from one end of a cell back to the other.' },
    { t: 'Conventional current', d: 'The direction current is drawn on diagrams: from + to −. Electrons really move the opposite way.' },
    { t: 'Series', d: 'Joined end to end, so the same current passes through each part and the cell voltages add up.' },
    { t: 'EMF', d: 'The full push of a cell, measured in volts when no current is flowing.' },
    { t: 'Internal resistance', d: 'The resistance inside a cell itself. It steals some voltage whenever current flows.' },
    { t: 'Volt, ampere', d: 'Volts measure the push; amperes (amps) measure how much charge flows each second.' },
  ],
  defaults: { on: true, show: 'elec', chem: 'alk', used: 10, order: 'ok' },
  controls: [
    { key: 'on', type: 'toggle', label: 'Switch', hint: 'Off opens a gap between the two strips.' },
    { key: 'show', type: 'seg', label: 'Show', options: [{ v: 'elec', label: 'Electrons' }, { v: 'conv', label: 'Conventional current' }], fmt: (v) => (v === 'elec' ? '− to +' : '+ to −') },
    { key: 'used', type: 'range', label: 'How used-up the cells are', min: 0, max: 105, step: 1, ends: ['fresh', 'flat'], fmt: (v) => Math.round(v) + '%' },
    { key: 'chem', type: 'seg', label: 'Cells', options: [{ v: 'zc', label: 'Zinc-carbon' }, { v: 'alk', label: 'Alkaline' }], fmt: (v) => CELLS[v].name },
    { key: 'order', type: 'seg', label: 'Front cell', options: [{ v: 'ok', label: 'Right way' }, { v: 'flip', label: 'Flipped' }], fmt: (v) => (v === 'ok' ? '1.5 + 1.5 V' : '1.5 − 1.5 V') },
  ],
  quiz: [
    { q: 'In the wires of a torch, which way do the electrons move?', options: ['From the + end round to the − end', 'From the − end round to the + end', 'Out of both ends towards the lamp', 'They do not move'], answer: 1, why: 'Electrons carry negative charge, so they leave the − end and return to the + end. Conventional current is drawn the other way.' },
    { q: 'Two 1.5 V cells in series, the right way round, give…', options: ['0.75 V', '1.5 V', '3 V', '15 V'], answer: 2, why: 'In series the voltages add: 1.5 V + 1.5 V = 3 V. Flip one cell and they cancel instead.' },
    { q: 'Why does a torch bulb turn dim and orange as the cells run down?', options: ['The bulb fills with smoke', 'The cells push less and lose more volts inside, so the filament runs cooler', 'Electrons get used up', 'The switch wears out'], answer: 1, why: 'Lower voltage at the lamp means a cooler filament. Its light falls roughly with voltage to the power 3.4, so a small sag dims it a lot.' },
  ],
  reel: [
    { ms: 5600, caption: 'Current needs a closed loop: cell, lamp, strip, switch, strip, spring, and back into the cell.', set: { on: true, show: 'conv', chem: 'alk', used: 10, order: 'ok' }, view: { pos: [0.6, 5.4, 13.2], target: [0.6, 5.1, 0] }, spin: 0 },
    { ms: 5600, caption: 'As cells run down they push less and waste more inside, so the bulb fades to orange.', set: { on: true, show: 'elec', chem: 'zc', order: 'ok' }, anim: { used: [0, 100] }, view: { pos: [0.6, 5.4, 13.2], target: [0.6, 5.1, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const reel = inReel();
    const T = makeTorch({ cut: true });
    T.group.position.y = reel ? 8.0 : Y0; root.add(T.group); if (reel) T.group.scale.setScalar(1.12);
    T.cone.scale.set(0.8, 0.5, 0.8); T.cone.position.x = TG.lens + 1.75;
    // the front cell can be turned round: pivot about its middle
    const front = T.cells[1], pivot = new THREE.Group(); pivot.position.set(TG.frontX + 1.55, 0, 0); T.group.add(pivot);
    T.group.remove(front); front.position.x = -1.55; pivot.add(front);
    const path = makePath(TORCH_PATH);
    const dots = makeDots(T.group, N, HEX.elec, 0.055);
    // direction arrows: on the long strip, in the cells, and on the front strip
    const arrows = [[-1.6, TG.stripY + 0.32, 0, -1], [0.0, -1.2, 0, 1], [2.45, TG.stripY + 0.32, 0, -1]].map(([x, y, z, dir]) => { const a = arrow(HEX.conv, 0.9, 0.26, 0.035); a.position.set(x, y, z); a.userData.dir = dir; T.group.add(a); return a; });
    const gapMat = M.glow(0xff5a8a, { transparent: true, opacity: 0.9 });
    const gap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), gapMat); gap.position.set((TG.aEnd + TG.bStart) / 2, TG.stripY, 0); T.group.add(gap);

    const st = { r: loop({ chem: 'alk', used: 10, order: 'ok' }), chem: 'alk', used: 10, on: true, flip: false };
    const bd = board(root, 9.4, 4.4, 940, 440, (g, W, H) => {
      panelBg(g, W, H);
      const r = st.r, c = CELLS[st.chem], I = st.on ? r.I : 0, V = st.on ? r.V : r.E, lost = st.on ? r.E - r.V : 0;
      text(g, 'Where the volts go', 24, 42, { font: 'bold 32px sans-serif', col: COL.text });
      // the bar: EMF split into volts lost inside the cells and volts across the lamp
      const bx = 24, bw = 430, by = 62, bh = 42, sc = bw / 3.4;
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(bx, by, bw, bh);
      g.fillStyle = COL.volt; g.fillRect(bx, by, V * sc, bh);
      g.fillStyle = COL.bad; g.fillRect(bx + V * sc, by, lost * sc, bh);
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(bx + BULB.V * sc, by - 8); g.lineTo(bx + BULB.V * sc, by + bh + 8); g.stroke(); g.setLineDash([]);
      text(g, `bulb is made for ${BULB.V} V`, bx + BULB.V * sc - 8, by + bh + 28, { font: '20px sans-serif', col: COL.soft, align: 'right' });
      text(g, st.flip ? 'Pushes cancel: 0 V' : `Cells push ${r.E.toFixed(2)} V`, bx, by + bh + 62, { font: 'bold 26px sans-serif', col: COL.text });
      text(g, st.on ? `Lamp gets ${r.V.toFixed(2)} V` : 'Switch open: no current', bx, by + bh + 98, { font: 'bold 26px sans-serif', col: COL.volt });
      text(g, `Lost inside the cells: ${lost.toFixed(2)} V`, bx, by + bh + 134, { font: 'bold 26px sans-serif', col: COL.bad });
      text(g, `= ${I.toFixed(2)} A × ${(r.R).toFixed(2)} Ω`, bx, by + bh + 164, { font: '22px sans-serif', col: COL.soft });
      text(g, `Light: ${fmt(st.on ? r.lm : 0, 1)} lumens`, bx, by + bh + 208, { font: 'bold 30px sans-serif', col: COL.light });
      text(g, `${Math.round((100 * (st.on ? r.lm : 0)) / BULB.lm)}% of the bulb's rated ${BULB.lm.toFixed(0)} lm`, bx, by + bh + 238, { font: '22px sans-serif', col: COL.soft });
      // the chart: lamp volts and light against charge used
      const a = axes(g, { x0: 540, x1: W - 24, y0: H - 62, y1: 78, xMax: 105, yMax: 3.4, xTicks: [0, 25, 50, 75, 100], yTicks: [0, 1, 2, 3], xFmt: (v) => v + '%', yFmt: (v) => v + ' V' });
      text(g, 'charge used', W - 24, H - 10, { font: '20px sans-serif', col: COL.soft, align: 'right' });
      const vp = [], lp = [], ep = [];
      for (let u = 0; u <= 105; u += 1) { const q = st.flip ? { V: 0, E: 0 } : solve(st.chem, u / 100, 'bulb'); vp.push([u, q.V]); ep.push([u, q.E]); lp.push([u, (3.4 * bulbLm(q.V)) / (BULB.lm * 2.3)]); }
      plot(g, ep, a.X, a.Y, 'rgba(255,255,255,.45)', 2, [6, 6]); plot(g, lp, a.X, a.Y, COL.light, 3); plot(g, vp, a.X, a.Y, COL.volt, 4);
      text(g, 'lamp volts', 548, 66, { font: 'bold 20px sans-serif', col: COL.volt }); text(g, 'light', 668, 66, { font: 'bold 20px sans-serif', col: COL.light }); text(g, 'no load', 730, 66, { font: '20px sans-serif', col: COL.soft });
      text(g, c.name, W - 24, 42, { font: 'bold 24px sans-serif', col: c.col, align: 'right' });
      if (!st.flip) dot(g, a.X(st.used), a.Y(r.V > 0 && st.on ? r.V : solve(st.chem, st.used / 100, 'bulb').V), COL.volt, 8);
    }, reel ? [0.6, 3.1, 0] : [0.6, 2.35, 0]);
    if (reel) bd.mesh.scale.setScalar(1.25);

    const Ls = {
      plus: stage.label('+ cap meets the bulb tip', [3.7, -1.32, 0.3], T.group),
      fil: stage.label('Filament', [4.9, 1.35, 0.3], T.group, 'hot'),
      sw: stage.label('Switch bridge', [1.9, 1.6, 0], T.group, 'hot'),
      strip: stage.label('Long brass strip', [-1.0, 1.3, 0], T.group),
      spring: stage.label('Spring', [-4.4, -1.32, 0], T.group),
      minus: stage.label('− base', [-3.0, -1.32, 0.3], T.group),
      ions: stage.label('Ions carry the charge inside', [0.2, -1.32, 0.3], T.group),
    };
    let sk = 1, ph = 0, key = '', flip = 0;
    const P = new THREE.Vector3();
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        fitNarrow(stage, [Ls.plus, Ls.spring, Ls.minus, Ls.ions, Ls.strip], -0.13, NARROW);
        sk = approach(sk, s.on ? 1 : 0, 10, dt);
        const closed = T.setSwitch(sk);
        flip = approach(flip, s.order === 'flip' ? 1 : 0, 7, dt); pivot.rotation.z = flip * Math.PI;
        const r = loop(s), I = closed ? r.I : 0;
        T.setLight(closed ? r.lm / BULB.lm : 0, bulbT(r.V));
        gap.visible = !closed; gapMat.opacity = 0.9; Ls.plus.visible = Ls.plus.visible && s.order !== 'flip';
        // beads: electrons run against the conventional direction
        const dir = s.show === 'elec' ? -1 : 1;
        ph += dir * I * 0.16 * dt;
        dots.material.color.set(s.show === 'elec' ? HEX.elec : HEX.conv);
        for (let i = 0; i < N; i++) { path.at(i / N + ph, P); dots.put(i, P.x, P.y, P.z, 1); }
        dots.done();
        arrows.forEach((a) => { const d = a.userData.dir * dir; a.rotation.z = d > 0 ? -Math.PI / 2 : Math.PI / 2; a.visible = I > 0.02; a.children.forEach((m) => m.material.color.set(s.show === 'elec' ? HEX.elec : HEX.conv)); });
        const k = `${s.chem}|${s.used}|${closed}|${s.order}`;
        if (k !== key) { key = k; Object.assign(st, { r, chem: s.chem, used: clamp(s.used, 0, 105), on: closed, flip: s.order === 'flip' }); bd.redraw(); }
      },
      readout(s) {
        const r = loop(s), I = s.on ? r.I : 0;
        const head = !s.on ? 'Open circuit: nothing flows' : s.order === 'flip' ? 'Cells cancel: nothing flows' : I < 0.05 ? 'Cells are flat' : r.lm < 0.4 * BULB.lm ? 'Dim and orange' : 'Loop closed: current flows';
        return slim(stage, `<div class="big">${head}</div>
          <div class="row"><span>Current</span><b>${I.toFixed(2)} A</b></div>
          <div class="row"><span>Volts at the lamp</span><b>${(s.on ? r.V : 0).toFixed(2)} V</b></div>
          <div class="row"><span>Light</span><b>${fmt(s.on ? r.lm : 0, 1)} lm</b></div>
          <div class="row"><span>Electrons a second</span><b>${I > 0 ? (I / E_CHARGE / 1e18).toFixed(1) + ' × 10¹⁸' : '0'}</b></div>
          <small>${s.show === 'elec' ? 'Blue beads: electrons, − base round to + cap.' : 'Amber beads: conventional current, + to −.'}</small>`);
      },
    };
  },
};
