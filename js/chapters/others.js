// Chapter 6: other torches. Two that need no shop-bought cells at the moment you need them.
// Shake torch (Faraday's law; Wikipedia "Mechanically powered flashlight"): a strong magnet slides
//   through a coil; the changing flux drives a current through a rectifier into a capacitor, which
//   feeds a white LED. Model: flux through each turn Φ(z) = Φm ÷ (1 + (z/a)²)^1.5 (the on-axis field
//   shape of a small magnet), EMF = −N dΦ/dt = N Φm · 3z/a² · (1 + (z/a)²)^-2.5 · v.
//   Illustrative values (no maker prints them): N = 1,500 turns, Φm = 70 µWb (a 12 mm neodymium
//   magnet, about 1.2 T × 113 mm² × ½), a = 12 mm, stroke ±38 mm, coil 120 Ω, two diode drops 0.6 V,
//   capacitor 0.22 F, LED starts to conduct at 2.6 V through 150 Ω, about 90 lm per watt.
//   Stored energy = ½ C V². The magnet moves as a sine wave at the shake rate.
// Emergency light (the power-cut lamp common in Indian homes): a sealed lead-acid battery of
//   6 V, 4.5 Ah (27 Wh, a very common size) or a lithium pack, kept charged from the mains. A relay
//   or transistor switches the LEDs on the moment the mains fails. Model: charges at 0.45 A
//   (a tenth of its capacity per hour, the usual gentle rate), about 80% of the stored energy
//   reaches the LEDs, so run time = 27 Wh × 0.8 ÷ watts. Time runs 1,200 times faster than life.
import { THREE, M, rod, latheX, box, sphere, beam, tube, clamp, approach } from '../kit.js';
import { makePath, makeDots, board, panelBg, text, fitNarrow, inReel, slim, fmt, hrs, COL, HEX, TAU } from '../torch.js';

const SH = { N: 1500, phi: 70e-6, a: 0.012, A: 0.038, Rc: 120, Vd: 0.6, C: 0.22, Vled: 2.6, Rled: 150, lmW: 90 };
const EM = { V: 6, Ah: 4.5, Ichg: 0.45, eff: 0.8, speed: 1200 };
EM.Wh = EM.V * EM.Ah;
const emfAt = (z, v) => { const u = z / SH.a; return SH.N * SH.phi * (3 * z / (SH.a * SH.a)) * Math.pow(1 + u * u, -2.5) * v; };
const VIEWS = { shake: { pos: [0.6, 6.4, 13.5], target: [0.6, 5.9, 0] }, power: { pos: [0.6, 6.6, 13.5], target: [0.6, 5.9, 0] } };
const NARROW = { shake: { pos: [0, 6.0, 13.5], target: [0, 5.6, 0] }, power: { pos: [0, 6.2, 13.5], target: [0, 5.6, 0] } };

export default {
  id: 'others',
  short: 'Other torches',
  title: 'Other torches: shake or wait',
  subtitle: 'A torch that makes its own electricity, and a lamp that switches itself on.',
  view: VIEWS.shake,
  learn: `<p>Every torch so far ran on cells you buy. Some torches make or store their own power.</p>
    <p>A <b>shake torch</b> has a strong magnet that slides through a <b>coil</b> of fine wire. Whenever the magnetic field through a coil <b>changes</b>, a voltage appears across it. That is <b>Faraday's law of induction</b>, and you can explore it in <a href="https://glassbox.how/faradayclear/">FaradayClear</a>. The faster the magnet moves, the bigger the voltage. A <b>rectifier</b> turns the back-and-forth pulses one way, and a <b>capacitor</b> stores the charge to feed an LED. A crank torch does the same job with a small spinning generator. You are the battery: the light is dim, but it never needs new cells.</p>
    <p>The <b>emergency light</b> found in many Indian homes works the other way. It stays plugged in, keeping a rechargeable battery full. A small circuit watches the mains. The moment the power fails, it switches the LEDs on by itself. It is a tiny cousin of the machine in <a href="https://glassbox.how/upsclear/">UPSClear</a>.</p>
    <p>You carry other torches too. A phone's <b>flash</b> is a white LED of the same kind, run from the phone's lithium-ion battery. A <b>head torch</b> is an LED torch on a strap. A <b>laser pointer</b> is different: its beam hardly spreads at all, so even a weak one is dangerous to eyes.</p>
    <p><b>Take care:</b> never stare into a bright LED torch or shine one into anyone's eyes, and never look into a laser.</p>
    <p class="tip"><b>Try it:</b> shake slowly and the pulses are too small to charge the capacitor. Shake faster and watch it fill. Then switch to the emergency light and cut the power.</p>`,
  terms: [
    { t: 'Induction', d: 'Making a voltage in a coil by changing the magnetic field through it.' },
    { t: 'EMF', d: 'The voltage a source such as a coil or a cell produces, in volts.' },
    { t: 'Rectifier', d: 'Diodes arranged so that current pushed either way comes out flowing one way.' },
    { t: 'Capacitor', d: 'A part that stores electric charge. Its energy is half its capacitance times its voltage squared.' },
    { t: 'Watt-hour (Wh)', d: 'A unit of stored energy: one watt for one hour. Volts × amp-hours gives watt-hours.' },
  ],
  defaults: { mode: 'shake', rate: 3, mains: true, watts: 5 },
  onChange(s, key) { if (key === 'mode' || key === null) this.view = VIEWS[s.mode]; },
  controls: [
    { key: 'mode', type: 'seg', label: 'Torch', options: [{ v: 'shake', label: 'Shake torch' }, { v: 'power', label: 'Emergency light' }], fmt: (v) => (v === 'shake' ? 'you are the battery' : 'waits for a power cut') },
    { key: 'rate', type: 'range', label: 'Shake torch: shakes per second', min: 0, max: 6, step: 0.1, ends: ['still', 'frantic'], fmt: (v) => v.toFixed(1) + ' a second' },
    { key: 'mains', type: 'toggle', label: 'Emergency light: mains power on', hint: 'Switch it off to make a power cut.' },
    { key: 'watts', type: 'range', label: 'Emergency light: LED power', min: 1, max: 10, step: 0.5, ends: ['1 W', '10 W'], fmt: (v) => v.toFixed(1) + ' W' },
  ],
  quiz: [
    { q: 'What makes the voltage in a shake torch?', options: ['Friction warming the magnet', 'A magnet’s field changing through a coil of wire', 'Static from your hand', 'A hidden battery'], answer: 1, why: 'Faraday’s law: a changing magnetic field through a coil induces a voltage. A still magnet makes none.' },
    { q: 'You shake twice as fast with the same stroke. The peak voltage…', options: ['stays the same', 'roughly doubles', 'halves', 'drops to zero'], answer: 1, why: 'The voltage depends on how fast the flux changes. Twice the magnet speed gives about twice the voltage.' },
    { q: 'A 6 V, 4.5 Ah battery stores 27 Wh. With 80% of that reaching 5 W of LEDs, how long is the light?', options: ['About 40 minutes', 'About 4 hours', 'About 27 hours', 'About 13 hours'], answer: 1, why: '27 Wh × 0.8 = 21.6 Wh. At 5 W that is 21.6 ÷ 5 ≈ 4.3 hours.' },
  ],
  reel: [
    { ms: 5600, caption: 'A shake torch needs no cells: a magnet sliding through a coil makes the electricity.', set: { mode: 'shake', mains: true, watts: 5 }, anim: { rate: [1.5, 5.5] }, view: { pos: [0, 5.1, 13.2], target: [0, 4.9, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const tall = () => inReel() || stage.host.clientWidth < 560;
    // ================================================================= shake torch (1 unit = 20 mm)
    const SG = new THREE.Group(); root.add(SG);
    const tubeM = rod(-4.6, 3.1, 0.78, 0.78, M.clear(0xcfe8ff, 0.14, { roughness: 0.05 }), 40, true); tubeM.castShadow = false; SG.add(tubeM);
    SG.add(rod(-4.75, -4.6, 0.8, 0.8, M.plastic(0x20242c), 32));
    for (const x of [-3.05, 3.05]) SG.add(rod(x - 0.12, x + 0.12, 0.55, 0.55, M.matte(0x15171b), 24));            // rubber stops
    const coil = latheX([[-0.65, 0.6], [0.65, 0.6], [0.65, 0.77], [-0.65, 0.77], [-0.65, 0.6]], M.metal(HEX.copper, { roughness: 0.4, side: THREE.DoubleSide }), { phiStart: Math.PI / 2, phiLength: Math.PI }); SG.add(coil);
    for (let i = 0; i < 9; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.775, 0.012, 6, 40), M.metal(0x8a5a2c)); ring.rotation.y = Math.PI / 2; ring.position.x = -0.56 + i * 0.14; SG.add(ring); }
    const mag = new THREE.Group(); SG.add(mag);
    mag.add(rod(-0.6, 0, 0.5, 0.5, M.metal(0xd4483c, { roughness: 0.35 }), 32), rod(0, 0.6, 0.5, 0.5, M.metal(0x4a78d0, { roughness: 0.35 }), 32));
    // head: circuit board, capacitor, LED, lens
    SG.add(latheX([[3.1, 0.8], [4.6, 1.0], [5.0, 1.0], [5.0, 0.92], [4.6, 0.92], [3.1, 0.72], [3.1, 0.8]], M.plastic(0x2b5fa8, { side: THREE.DoubleSide }), { phiStart: Math.PI / 2, phiLength: Math.PI }));
    const pcb = box(0.06, 1.2, 1.2, M.plastic(0x1f6b45)); pcb.position.set(3.45, 0, 0); SG.add(pcb);
    const cap = rod(3.5, 4.0, 0.3, 0.3, M.plastic(0x23262f, { roughness: 0.3 }), 24); cap.position.y = -0.3; SG.add(cap);
    const rect = box(0.22, 0.26, 0.3, M.plastic(0x0f1014)); rect.position.set(3.6, 0.36, 0.2); SG.add(rect);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0xe9eef6, emissive: 0, roughness: 0.2, transparent: true, opacity: 0.9 });
    const led = sphere(0.16, ledMat, 16); led.position.set(4.35, 0.2, 0); SG.add(led); SG.add(rod(4.05, 4.35, 0.16, 0.16, ledMat, 16).translateY(0.2));
    const sGlow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10), M.ghost(0xdfeaff, 0, { blending: THREE.AdditiveBlending })); sGlow.position.set(4.4, 0.2, 0); sGlow.castShadow = false; SG.add(sGlow);
    const sBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 0.9, 4, 32, 1, true), M.ghost(0xdfeaff, 0, { blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); sBeam.rotation.z = -Math.PI / 2; sBeam.position.set(7.0, 0, 0); sBeam.castShadow = false; SG.add(sBeam);
    const wirePts = [[-0.6, 0.8, 0], [-0.6, 0.98, 0], [3.3, 0.98, 0], [3.42, 0.5, 0], [3.5, 0.36, 0.2], [3.6, -0.1, 0], [3.75, -0.3, 0], [3.6, -0.62, 0], [0.6, -0.98, 0], [0.6, -0.8, 0]];
    for (let i = 1; i < wirePts.length; i++) SG.add(beam(wirePts[i - 1], wirePts[i], 0.018, M.metal(HEX.copper), 6));
    const sPath = makePath(wirePts), sDots = makeDots(SG, 26, HEX.elec, 0.05);
    const sL = [
      stage.label('Magnet', [0, 1.0, 0], mag, 'hot'), stage.label('Coil: 1,500 turns', [0, -1.45, 0], SG), stage.label('Rectifier and capacitor', [3.2, -1.5, 0], SG), stage.label('White LED', [4.9, 1.4, 0], SG), stage.label('Rubber stop', [-3.05, -1.2, 0], SG),
    ];
    // ================================================================= emergency light
    const PG = new THREE.Group(); root.add(PG);
    const wall = box(0.25, 4.2, 3.6, M.matte(0xd9d2c4)); wall.position.set(-5.4, 2.1, 0); PG.add(wall);
    const shelf = box(10.6, 0.14, 3.6, M.matte(0x6b4f3a)); shelf.position.set(-0.3, -0.07, 0); PG.add(shelf);
    const plate = box(0.08, 0.9, 0.9, M.plastic(0xf4f4f0)); plate.position.set(-5.24, 2.6, 0); PG.add(plate);
    const plug = box(0.4, 0.5, 0.5, M.plastic(0x23262f)); plug.position.set(-5.0, 2.6, 0); PG.add(plug);
    const mainsLamp = sphere(0.09, M.glow(0x7be08c), 12); mainsLamp.position.set(-5.19, 2.92, 0.3); PG.add(mainsLamp);
    const cordPts = [[-4.8, 2.6, 0], [-4.2, 1.2, 0.3], [-3.0, 0.25, 0.6], [-1.4, 0.2, 0.5], [-0.2, 0.6, 0.2], [0.0, 1.0, 0]];
    PG.add(tube(cordPts, 0.045, M.plastic(0x23262f), false, 80));
    const lantern = new THREE.Group(); lantern.position.set(1.5, 0, 0); PG.add(lantern);
    const shellMat = M.plastic(0xd94a3a, { roughness: 0.4, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    const shell = box(3.2, 3.6, 1.7, shellMat); shell.position.y = 1.9; shell.castShadow = false; lantern.add(shell);
    lantern.add(tube([[-1.1, 3.7, 0], [-1.0, 4.4, 0], [0, 4.65, 0], [1.0, 4.4, 0], [1.1, 3.7, 0]], 0.09, M.plastic(0x20242c), false, 60));
    const batt = box(2.2, 1.3, 1.1, M.plastic(0x2c3038, { roughness: 0.5 })); batt.position.set(0.25, 0.85, -0.1); lantern.add(batt);
    for (const x of [-0.5, 1.0]) { const tp = box(0.14, 0.16, 0.2, M.metal(HEX.steel)); tp.position.set(x, 1.58, -0.1); lantern.add(tp); }
    const chg = box(0.9, 0.07, 0.9, M.plastic(0x1f6b45)); chg.position.set(-0.95, 2.1, -0.1); lantern.add(chg);
    const relay = box(0.4, 0.34, 0.5, M.plastic(0x3f7fbf)); relay.position.set(-0.95, 2.3, -0.1); lantern.add(relay);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0xdfe3ea, emissive: 0, roughness: 0.4 });
    const panel = box(2.6, 1.0, 0.06, panelMat); panel.position.set(0, 3.0, 0.86); lantern.add(panel);
    const leds = []; for (let i = 0; i < 12; i++) { const m = sphere(0.07, new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0 }), 10); m.position.set(-1.0 + (i % 6) * 0.4, 2.8 + Math.floor(i / 6) * 0.4, 0.9); lantern.add(m); leds.push(m); }
    const pGlow = new THREE.Mesh(new THREE.SphereGeometry(1.9, 24, 16), M.ghost(0xffe9b0, 0, { blending: THREE.AdditiveBlending })); pGlow.position.set(0, 3.0, 1.4); pGlow.castShadow = false; lantern.add(pGlow);
    const inPts = [[-1.5, 1.0, 0], [-0.95, 1.6, -0.1], [-0.95, 2.1, -0.1], [-0.5, 2.1, -0.1], [-0.5, 1.66, -0.1]];          // cord → charger → battery
    const outPts = [[1.0, 1.66, -0.1], [1.0, 2.3, -0.1], [-0.75, 2.36, -0.1], [-0.6, 2.9, 0.4], [0, 3.0, 0.8]];              // battery → relay → LEDs
    for (const pts of [inPts, outPts]) for (let i = 1; i < pts.length; i++) lantern.add(beam(pts[i - 1], pts[i], 0.02, M.metal(HEX.copper), 6));
    const cordPath = makePath([...cordPts, ...inPts.map(([x, y, z]) => [x + 1.5, y, z])]), outPath = makePath(outPts);
    const cDots = makeDots(PG, 30, 0x7be08c, 0.06), oDots = makeDots(lantern, 16, 0xffe27a, 0.06);
    const pL = [
      stage.label('Mains socket', [-4.3, 3.6, 0], PG), stage.label('Battery: 6 V, 4.5 Ah', [0.25, 0.1, 1.0], lantern, 'hot'), stage.label('Charger and relay', [-2.9, 1.5, 1.0], lantern), stage.label('LED panel', [1.9, 3.75, 0.9], lantern),
    ];

    // ================================================================= boards
    const st = { mode: 'shake', hist: new Float32Array(240), hi: 0, vc: 2.6, rate: 3, peak: 0, soc: 1, mains: true, watts: 5 };
    const bd = board(root, 8.8, 4.4, 840, 420, (g, W, H) => {
      panelBg(g, W, H);
      if (st.mode === 'shake') {
        text(g, 'Voltage from the coil', 22, 40, { font: 'bold 30px sans-serif', col: COL.text });
        const x0 = 70, x1 = 590, ym = 235, sc = 15;      // 15 px per volt
        g.strokeStyle = COL.grid; g.lineWidth = 1; g.font = '19px sans-serif';
        for (const v of [-10, -5, 0, 5, 10]) { g.beginPath(); g.moveTo(x0, ym - v * sc); g.lineTo(x1, ym - v * sc); g.stroke(); g.fillStyle = COL.soft; g.textAlign = 'right'; g.fillText(v + ' V', x0 - 8, ym - v * sc + 6); g.textAlign = 'left'; }
        const thr = st.vc + SH.Vd;
        g.fillStyle = 'rgba(123,224,140,.12)'; g.fillRect(x0, ym - 11.5 * sc, x1 - x0, (11.5 - thr) * sc); g.fillRect(x0, ym + thr * sc, x1 - x0, (11.5 - thr) * sc);
        g.strokeStyle = COL.good; g.setLineDash([6, 6]); g.lineWidth = 2; for (const sgn of [1, -1]) { g.beginPath(); g.moveTo(x0, ym - sgn * thr * sc); g.lineTo(x1, ym - sgn * thr * sc); g.stroke(); } g.setLineDash([]);
        text(g, 'green zones: strong enough to charge', x1, 84, { font: '18px sans-serif', col: COL.good, align: 'right' });
        g.strokeStyle = COL.elec; g.lineWidth = 3; g.beginPath();
        for (let i = 0; i < 240; i++) { const v = clamp(st.hist[(st.hi + i) % 240], -11.5, 11.5), x = x0 + (i / 239) * (x1 - x0), y = ym - v * sc; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
        text(g, 'last 2 seconds', x1, H - 14, { font: '18px sans-serif', col: COL.soft, align: 'right' });
        // capacitor gauge
        const gx = 650, gy = 70, gw = 70, gh = 290, fill = clamp(st.vc / 5.5, 0, 1);
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3; g.strokeRect(gx, gy, gw, gh);
        g.fillStyle = st.vc > SH.Vled ? COL.light : COL.blue; g.fillRect(gx + 4, gy + gh - 4 - fill * (gh - 8), gw - 8, fill * (gh - 8));
        const yl = gy + gh - 4 - (SH.Vled / 5.5) * (gh - 8); g.strokeStyle = '#fff'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(gx - 8, yl); g.lineTo(gx + gw + 8, yl); g.stroke(); g.setLineDash([]);
        text(g, 'LED lights', gx + gw + 12, yl + 6, { font: '18px sans-serif', col: COL.soft });
        text(g, 'Capacitor', gx + gw / 2, 52, { font: 'bold 22px sans-serif', col: COL.text, align: 'center' });
        text(g, st.vc.toFixed(2) + ' V', gx + gw / 2, H - 14, { font: 'bold 26px sans-serif', col: COL.light, align: 'center' });
      } else {
        text(g, st.mains ? 'Mains on: the battery charges, the lamp waits' : 'Power cut: the battery runs the LEDs', 22, 42, { font: 'bold 28px sans-serif', col: st.mains ? COL.good : COL.light });
        const bx = 40, by = 90, bw = W - 80, bh = 90;
        g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 4; g.strokeRect(bx, by, bw, bh); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(bx + bw, by + 26, 12, bh - 52);
        g.fillStyle = st.soc > 0.2 ? COL.good : COL.bad; g.fillRect(bx + 6, by + 6, (bw - 12) * st.soc, bh - 12);
        text(g, `Battery ${Math.round(st.soc * 100)}%`, W / 2, by + 58, { font: 'bold 38px sans-serif', col: '#fff', align: 'center' });
        const left = (EM.Wh * EM.eff * st.soc) / st.watts, toFull = ((1 - st.soc) * EM.Ah) / EM.Ichg;
        text(g, `${EM.V} V × ${EM.Ah} Ah = ${EM.Wh} Wh stored when full`, 40, 240, { font: '26px sans-serif', col: COL.text });
        text(g, st.mains ? (st.soc > 0.995 ? 'Full: a trickle keeps it topped up' : `Full again in about ${hrs(toFull)}`) : (st.soc <= 0.001 ? 'Battery empty: the light is out' : `Light left at ${st.watts.toFixed(1)} W: ${hrs(left)}`), 40, 290, { font: 'bold 30px sans-serif', col: st.mains ? COL.good : COL.light });
        text(g, `run time = ${EM.Wh} Wh × ${EM.eff} ÷ ${st.watts.toFixed(1)} W = ${hrs((EM.Wh * EM.eff) / st.watts)} from full`, 40, 338, { font: '24px sans-serif', col: COL.soft });
        text(g, 'time here runs 1,200 times faster than life', 40, 386, { font: '20px sans-serif', col: COL.soft });
      }
    }, [0.6, 2.35, 0]);

    let t = 0, th = 0, vc = 2.6, emf = 0, iChg = 0, peak = 0, peakT = 0, ph = 0, soc = 0.85, on = 0, pc = 0, po = 0, acc = 0, sampleT = 0, mode = '', wasTall = null, redrawT = 0, magV = 0;
    const P = new THREE.Vector3();
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const tl = tall(), isS = s.mode === 'shake';
        const narrow = fitNarrow(stage, [sL[4], sL[2], pL[2]], -0.1, NARROW[s.mode]);
        if (s.mode !== mode || tl !== wasTall) {
          if (mode && s.mode !== mode && !inReel()) { const v = narrow ? NARROW[s.mode] : VIEWS[s.mode]; stage.setView(v.pos, v.target, 0.9); }
          mode = s.mode; wasTall = tl;
          SG.position.set(tl ? -0.9 : -0.3, inReel() ? 7.4 : 6.5, 0); SG.scale.setScalar(tl ? 0.92 : 1);
          PG.position.set(tl ? 0.6 : 1.4, inReel() ? 6.0 : 4.75, 0); PG.scale.setScalar(0.8);
          bd.mesh.position.set(tl ? 0 : 0.6, inReel() ? 2.9 : 2.35, 0); bd.mesh.scale.setScalar(inReel() ? 1.25 : 1);
        }
        SG.visible = isS; PG.visible = !isS;
        sL.forEach((l, i) => { l.visible = isS && !(narrow && (i === 4 || i === 2)); }); pL.forEach((l, i) => { l.visible = !isS && !(narrow && i === 2); });
        if (isS) {
          // ---- magnet motion and the circuit, in small steps
          const n = 8, h = dt / n; let q = 0;
          for (let i = 0; i < n; i++) {
            th += TAU * s.rate * h;
            const z = SH.A * Math.sin(th); magV = SH.A * TAU * s.rate * Math.cos(th);
            emf = emfAt(z, magV);
            iChg = Math.max(0, Math.abs(emf) - vc - SH.Vd) / SH.Rc;
            const iLed = Math.max(0, vc - SH.Vled) / SH.Rled;
            vc = clamp(vc + ((iChg - iLed) * h) / SH.C, 0, 5.5); q += iChg * h;
            if (Math.abs(emf) > peak) { peak = Math.abs(emf); peakT = t; }
            sampleT += h; if (sampleT >= 2 / 240) { sampleT = 0; st.hist[st.hi] = emf; st.hi = (st.hi + 1) % 240; }
          }
          if (t - peakT > 0.7) peak *= Math.exp(-3 * dt);
          mag.position.x = (SH.A * Math.sin(th)) / 0.02;
          const iLed = Math.max(0, vc - SH.Vled) / SH.Rled, lit = clamp(iLed / 0.006, 0, 1.4);
          ledMat.emissive.setRGB(0.9 * lit, 0.95 * lit, 1.1 * lit); sGlow.material.opacity = 0.4 * Math.min(1, lit); sBeam.material.opacity = 0.12 * Math.min(1, lit);
          ph += Math.sign(emf || 1) * (q / Math.max(dt, 1e-4)) * 22 * dt;
          const flowing = iChg > 0.0005;
          for (let i = 0; i < 26; i++) { sPath.at(i / 26 + ph, P); sDots.put(i, P.x, P.y, P.z, flowing ? 1 : 0.45); }
          sDots.done();
        } else {
          // ---- emergency light: charge on mains, discharge in a power cut
          const hrsStep = (dt * EM.speed) / 3600;
          if (s.mains) soc = Math.min(1, soc + (EM.Ichg * hrsStep) / EM.Ah);
          else soc = Math.max(0, soc - (s.watts * hrsStep) / (EM.Wh * EM.eff));
          const want = !s.mains && soc > 0 ? 1 : 0; on = approach(on, want, 14, dt);
          const lv = on * (0.45 + 0.55 * (s.watts / 10));
          panelMat.emissive.setRGB(1.0 * lv, 0.95 * lv, 0.8 * lv); leds.forEach((m) => m.material.emissive.setRGB(2 * lv, 1.9 * lv, 1.5 * lv)); pGlow.material.opacity = 0.07 * lv;
          mainsLamp.visible = s.mains; shellMat.opacity = 0.3;
          pc += (s.mains && soc < 0.999 ? 0.22 : s.mains ? 0.03 : 0) * dt; po += on * (0.15 + 0.05 * s.watts) * dt;
          for (let i = 0; i < 30; i++) { cordPath.at(i / 30 + pc, P); cDots.put(i, P.x, P.y, P.z, s.mains ? 1 : 0); }
          for (let i = 0; i < 16; i++) { outPath.at(i / 16 + po, P); oDots.put(i, P.x, P.y, P.z, on > 0.5 ? 1 : 0); }
          cDots.done(); oDots.done();
        }
        redrawT += dt;
        if (redrawT > 0.066 || st.mode !== s.mode) { redrawT = 0; Object.assign(st, { mode: s.mode, vc, rate: s.rate, peak, soc, mains: s.mains, watts: s.watts }); bd.redraw(); }
      },
      readout(s) {
        if (s.mode === 'shake') {
          const iLed = Math.max(0, vc - SH.Vled) / SH.Rled, vmax = SH.A * TAU * s.rate, J = 0.5 * SH.C * vc * vc, lm = SH.lmW * iLed * Math.max(vc - iLed * SH.Rled, SH.Vled);
          const head = s.rate < 0.05 ? 'Magnet still: no voltage' : peak < vc + SH.Vd ? 'Too slow to charge' : 'Charging in pulses';
          return slim(stage, `<div class="big">${head}</div>
            <div class="row"><span>Peak coil voltage</span><b>${fmt(peak, 1)} V</b></div>
            <div class="row"><span>Capacitor</span><b>${vc.toFixed(2)} V, ${J.toFixed(2)} J</b></div>
            <div class="row"><span>LED</span><b>${iLed > 0.0002 ? (iLed * 1000).toFixed(1) + ' mA, ' + fmt(lm, 1) + ' lm' : 'dark'}</b></div>
            <div class="row"><span>Magnet’s top speed</span><b>${vmax.toFixed(2)} m/s</b></div>
            <small>Needs ${(vc + SH.Vd).toFixed(1)} V to charge right now. Typical values, not one product.</small>`);
        }
        const left = (EM.Wh * EM.eff * soc) / s.watts;
        return slim(stage, `<div class="big">${s.mains ? 'Mains on: lamp waits' : soc > 0 ? 'Power cut: lamp on' : 'Battery empty'}</div>
          <div class="row"><span>Battery</span><b>${Math.round(soc * 100)}% of ${EM.Wh} Wh</b></div>
          <div class="row"><span>${s.mains ? 'Charging at' : 'LEDs drawing'}</span><b>${s.mains ? (soc < 0.999 ? EM.Ichg + ' A' : 'a trickle') : s.watts.toFixed(1) + ' W'}</b></div>
          <div class="row"><span>Light left</span><b>${hrs(left)}</b></div>
          <small>A relay joins the battery to the LEDs the moment the mains fails.</small>`);
      },
    };
  },
};
