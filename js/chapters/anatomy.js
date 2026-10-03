// Chapter 1: take a hand torch apart. A generic two-cell torch: case, tail cap, spring, two D cells,
// two brass strips, a slide switch, a lamp (filament bulb or LED module), a parabolic reflector,
// an O-ring, a lens and the bezel ring that holds them in.
// Numbers: D cell 61.5 mm × 34.2 mm, 1.5 V (IEC R20/LR20; Energizer E95 data sheet); PR2 bulb
// 2.38 V, 0.5 A, 0.8 MSCP = 10 lm (lamp catalogues); a 1 W white LED gives about 140 lm (see torch.js).
import { THREE, exploder, approach } from '../kit.js';
import { makeTorch, solve, bulbT, BULB, LED, fitNarrow, slim, fmt } from '../torch.js';

const Y0 = 4.3;
const NARROW = { pos: [2.6, 7.2, 17.6], target: [1.65, 5.2, 0] };

export default {
  id: 'anatomy',
  short: 'Inside a torch',
  title: 'Inside a torch',
  subtitle: 'Two cells, a spring, a switch, a lamp and a mirror, in a tube.',
  view: { pos: [3.2, 7.4, 13.4], target: [1.65, 5.6, 0] },
  learn: `<p>A torch (a <b>flashlight</b> in America) is one of the simplest electric machines you own. Slide it apart and you find about ten parts.</p>
    <p>The power comes from two <b>cells</b> stacked nose to tail. A <b>spring</b> in the tail cap pushes them forward, so every metal part stays pressed against the next. That spring is also a wire: it carries the current.</p>
    <p>At the front sits the <b>lamp</b>. Its tip touches the front cell. Old torches use a tiny <b>filament bulb</b>. New ones use a <b>white LED</b>. Around the lamp is a shiny <b>reflector</b>, a mirror shaped to throw the light forward as a beam. A clear <b>lens</b> keeps dust and rain out, and a rubber <b>O-ring</b> seals the gap.</p>
    <p>Two thin <b>brass strips</b> run inside the case. The <b>switch</b> is just a small metal bridge that joins them. In an all-metal torch there are no strips: the case itself does that job.</p>
    <p class="tip"><b>Try it:</b> take the torch apart, then put it back together, make the case see-through and slide the switch. Watch the little copper bridge move.</p>`,
  terms: [
    { t: 'Cell', d: 'One single battery unit, such as a D or AA. Strictly, a "battery" is two or more cells joined together.' },
    { t: 'Filament', d: 'A very thin coil of tungsten wire that glows white-hot when current passes through it.' },
    { t: 'LED', d: 'Light-emitting diode: a small chip of semiconductor that gives off light when current flows through it.' },
    { t: 'Reflector', d: 'The cup-shaped mirror behind the lamp that gathers its light into a beam.' },
    { t: 'O-ring', d: 'A rubber ring squeezed between two parts to keep water and dust out.' },
  ],
  defaults: { explode: 0, see: false, on: true, lamp: 'bulb' },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'see', type: 'toggle', label: 'See-through case' },
    { key: 'on', type: 'toggle', label: 'Slide the switch on' },
    { key: 'lamp', type: 'seg', label: 'Lamp', options: [{ v: 'bulb', label: 'Filament bulb' }, { v: 'led', label: 'White LED' }], fmt: (v) => (v === 'bulb' ? 'old style' : 'new style') },
  ],
  quiz: [
    { q: 'What does the spring in the tail cap do?', options: ['It makes the torch bounce', 'It presses the cells against the lamp and carries the current', 'It stores the electricity', 'It focuses the beam'], answer: 1, why: 'The spring keeps every contact pressed tight, and since it is metal it is also part of the circuit.' },
    { q: 'What is the switch, really?', options: ['A tiny battery', 'A small metal bridge that joins two strips', 'A valve for light', 'A magnet'], answer: 1, why: 'Sliding the switch moves a metal bridge across a gap. When the gap is bridged, current can flow.' },
    { q: 'Why is there a shiny cup around the lamp?', options: ['To keep the lamp cool', 'To look nice', 'To gather light going sideways and send it forward', 'To hold the cells'], answer: 2, why: 'A bare lamp shines in all directions. The reflector turns most of that light into a forward beam.' },
  ],
  reel: [
    { ms: 5600, caption: 'A torch is two cells, a spring, a switch, a lamp and a mirror in a tube.', set: { see: false, on: true, lamp: 'bulb' }, anim: { explode: [0, 1] }, view: { pos: [3.2, 7.8, 15.6], target: [1.65, 4.3, 0] }, spin: 0.2 },
    { ms: 5000, caption: 'The tail spring is not just a spring: it is a wire that carries the current.', set: { explode: 0, see: true, on: true, lamp: 'bulb' }, view: { pos: [-4.4, 6.6, 11.6], target: [0.6, 4.3, 0] }, spin: 0.3 },
  ],

  build({ stage }) {
    const T = makeTorch();
    T.group.position.y = Y0; stage.root.add(T.group);
    const setExplode = exploder([
      { obj: T.body, off: [0, -2.4, 0] }, { obj: T.strips, off: [0, 1.0, 0] }, { obj: T.sw, off: [0, 1.9, 0] },
      { obj: T.tail, off: [-1.4, 0, 0] }, { obj: T.springG, off: [-0.7, 0, 0] }, { obj: T.cells[0], off: [-0.25, 0, 0] },
      { obj: T.lampG, off: [0.8, 0, 0] }, { obj: T.glow, off: [0.8, 0, 0] }, { obj: T.refl, off: [1.8, 0, 0] },
      { obj: T.oring, off: [2.5, 0, 0] }, { obj: T.lens, off: [3.2, 0, 0] }, { obj: T.cone, off: [3.2, 0, 0] }, { obj: T.bezel, off: [3.9, 0, 0] },
    ]);
    const L = (t, obj, pos, cls) => stage.label(t, pos, obj, cls);
    const outer = [L('Slide switch', T.sw, [0, 1.6, 0], 'hot'), L('Lens and bezel ring', T.bezel, [5.3, 2.1, 0]), L('Tail cap', T.tail, [-4.0, -1.5, 0])];
    const lampL = L('Lamp', T.lampG, [3.7, -0.75, 0], 'hot');
    const inner = [
      L('Case', T.body, [-1.5, -1.45, 0]), L('Brass strips', T.strips, [-1.6, 1.3, 0]), L('Spring', T.springG, [-3.5, 1.15, 0]),
      L('Two D cells: 3 V', T.cells[1], [1.5, -1.25, 0]), L('Reflector', T.refl, [4.6, 1.8, 0]), L('O-ring', T.oring, [5.3, -1.85, 0]), L('Lens', T.lens, [5.35, 2.0, 0]), L('Bezel ring', T.bezel, [5.3, -2.1, 0]),
    ];
    let sk = 1;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        setExplode(s.explode);
        const narrow = fitNarrow(stage, [inner[1], inner[5], outer[2]], -0.12, NARROW);
        const apart = s.explode > 0.4;
        inner.forEach((l, i) => { l.visible = apart && !(narrow && (i === 1 || i === 5)); });
        outer[1].visible = !apart; lampL.visible = apart || s.see;
        lampL.element.textContent = s.lamp === 'bulb' ? 'Filament bulb' : 'White LED module';
        T.setLamp(s.lamp);
        T.setCase(s.see || s.explode > 0.03 ? 0.22 : 1);
        sk = approach(sk, s.on ? 1 : 0, 9, dt);
        const closed = T.setSwitch(sk) && s.explode < 0.02;
        const r = solve('alk', 0.1, s.lamp);
        T.setLight(closed ? (s.lamp === 'bulb' ? r.lm / BULB.lm : 1.25) : 0, bulbT(r.V));
        T.lens.material.opacity = 0.16 + (closed ? 0.1 : 0);
      },
      readout(s) {
        const r = solve('alk', 0.1, s.lamp), apart = s.explode >= 0.02;
        const state = apart ? 'Taken apart: no circuit' : s.on ? 'Switched on' : 'Switched off';
        return slim(stage, `<div class="big">${state}</div>
          <div class="row"><span>Cells</span><b>2 × 1.5 V = 3 V</b></div>
          <div class="row"><span>Lamp</span><b>${s.lamp === 'bulb' ? `bulb, ${BULB.V} V ${BULB.I} A` : `LED, ${LED.V.toFixed(1)} V ${LED.I * 1000} mA`}</b></div>
          <div class="row"><span>Light when on</span><b>about ${fmt(r.lm, 0)} lumens</b></div>
          <small>${s.lamp === 'bulb' ? 'A candle gives about 12 lumens.' : 'A small driver feeds the LED a steady current.'}</small>`);
      },
    };
  },
};
