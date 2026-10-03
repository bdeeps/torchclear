// Chapter 3: the lamp, old and new. A filament bulb and a white LED, each drawn large.
// Filament (PR2: 2.38 V, 0.5 A, 10 lm, 15 h; see torch.js): at V volts the current is 0.5 × (V/2.38)^0.6,
//   the light 10 × (V/2.38)^3.4 lm, the life 15 × (V/2.38)^-14 h and the temperature 2,450 × (V/2.38)^0.42 K
//   ("Lamp rerating"; the 2,450 K is our estimate from the bulb's 8.4 lm/W). The spectrum drawn is
//   Planck's law for that temperature, and "visible share" is the part of it between 400 and 700 nm.
//   Tungsten is close to, not exactly, a black body, so treat the share as a good guide.
// LED (a 1 W class white emitter; see torch.js): 350 mA, about 3.0 V, about 140 lm; light rises less
//   than in step with current (droop: 2.5× the light at 1 A). A white LED is a blue InGaN chip
//   (peak near 450 nm) under a yellow Ce:YAG phosphor (broad hump near 560 nm) (Nobel Prize 2014
//   material; Wikipedia "Light-emitting diode"). Its spectrum here is two Gaussians of that shape.
//   Its light carries about 320 lm for every watt of light (a typical figure for cool-white phosphor
//   LEDs), so radiant share ≈ (lm/W) ÷ 320. The rest leaves as heat through the back of the chip.
// 683 lm/W: the most light a watt can make, at 555 nm green (the SI definition of the candela).
import { THREE, M, rod, latheX, box, sphere, beam, tube, clamp } from '../kit.js';
import { BULB, LED, bulbI, bulbLm, bulbLife, bulbT, ledV, ledLm, ledIatV, planck, eyeV, bodyLight, kelvinRGB, makeDots, board, panelBg, text, fitNarrow, inReel, slim, fmt, hrs, COL, TAU } from '../torch.js';

const N = 120, LED_LER = 320;
const NARROW = { pos: [0, 6.0, 13.5], target: [0, 5.6, 0] };
const cache = new Map();
const body = (T) => { const k = Math.round(T / 10) * 10; if (!cache.has(k)) cache.set(k, bodyLight(k)); return cache.get(k); };

function state(s) {
  const d = s.drive / 100;
  if (s.lamp === 'bulb') {
    const V = BULB.V * d, I = bulbI(V), W = V * I, lm = bulbLm(V), T = bulbT(V), b = body(T);
    return { V, I, W, lm, eff: lm / W, T, vis: b.vis, life: bulbLife(V), up: Math.pow(1.1, 0.6) };
  }
  const I = LED.I * d, V = ledV(I), W = V * I, lm = ledLm(I);
  return { V, I, W, lm, eff: lm / W, T: 0, vis: clamp(lm / W / LED_LER, 0, 1), life: 50000, up: ledIatV(V * 1.1) / I };
}
const ledSpec = (nm) => Math.exp(-0.5 * ((nm - 450) / 10) ** 2) + 0.62 * Math.exp(-0.5 * ((nm - 565) / 52) ** 2);
function waveCol(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = (510 - nm) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = (645 - nm) / 65; } else r = 1;
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

export default {
  id: 'lamp',
  short: 'Bulb and LED',
  title: 'The lamp: hot wire, cool chip',
  subtitle: 'A filament makes light by being hot. An LED makes it without the heat.',
  view: { pos: [0.6, 6.4, 13.5], target: [0.6, 5.9, 0] },
  learn: `<p>The old torch bulb holds a coil of <b>tungsten</b> wire thinner than a hair. Current heats it to about <b>2,400 to 2,500 K</b>, hot enough to glow. But a hot thing radiates mostly <b>infrared</b>, which is heat you cannot see. Only a few percent of the energy comes out as visible light. Bulb makers count light in <b>lumens</b>, and this bulb gives about <b>8 lumens for each watt</b>.</p>
    <p>A <b>white LED</b> works differently. In a tiny chip of the semiconductor <b>indium gallium nitride</b>, electrons drop across an energy gap and each one gives out a particle of <b>blue</b> light. On top sits a yellow <b>phosphor</b>. It soaks up part of the blue and glows yellow. Blue plus yellow looks white to your eyes. Nothing has to be white-hot, so a good LED gives <b>100 to 200 lumens per watt</b>.</p>
    <p>An LED still makes some heat, and it makes it inside the chip, not as rays. So it sits on a metal <b>heat path</b> that carries the heat away. It is also touchy about voltage: a little more volts gives a lot more current. That is why an LED torch has a <b>resistor</b> or a <b>driver</b> circuit to hold the current steady.</p>
    <p class="tip"><b>Try it:</b> switch between the two lamps and compare the charts. Then turn the bulb down to 60% and watch its light crash while its colour slides towards orange.</p>`,
  terms: [
    { t: 'Lumen', d: 'The unit for how much visible light a lamp gives out in all directions together.' },
    { t: 'Efficacy', d: 'Lumens of light for each watt of electricity. The highest possible is 683 lm/W, for pure green light.' },
    { t: 'Infrared', d: 'Light with a longer wavelength than red. We feel it as heat but cannot see it.' },
    { t: 'Kelvin (K)', d: 'A temperature scale that starts at absolute zero. 2,500 K is about 2,230 °C.' },
    { t: 'Phosphor', d: 'A powder that soaks up light of one colour and gives out light of another.' },
    { t: 'Driver', d: 'A small circuit that feeds an LED a steady current, whatever the cells are doing.' },
  ],
  defaults: { lamp: 'bulb', drive: 100 },
  controls: [
    { key: 'lamp', type: 'seg', label: 'Lamp', options: [{ v: 'bulb', label: 'Filament bulb' }, { v: 'led', label: 'White LED' }], fmt: (v) => (v === 'bulb' ? 'PR2 torch bulb' : '1 watt emitter') },
    { key: 'drive', type: 'range', label: 'Drive', min: 40, max: 130, step: 1, ends: ['40%', '130% of rated'], fmt: (v, s) => (s.lamp === 'bulb' ? (BULB.V * v / 100).toFixed(2) + ' V' : Math.round(LED.I * v * 10) + ' mA') },
  ],
  quiz: [
    { q: 'Where does most of a filament bulb’s energy go?', options: ['Into visible light', 'Into infrared, which is heat', 'Into sound', 'Back into the cells'], answer: 1, why: 'At about 2,450 K a glowing wire radiates mostly infrared. Only a few percent is light you can see.' },
    { q: 'How does a white LED make white light?', options: ['A white-hot wire inside it', 'A blue chip plus a yellow phosphor', 'Three filaments', 'A tiny flame'], answer: 1, why: 'The chip gives blue light. The phosphor turns part of it yellow. Blue and yellow together look white.' },
    { q: 'Why does an LED need a resistor or a driver?', options: ['To make it warmer', 'Because a small rise in voltage makes its current shoot up', 'To change its colour', 'It does not need one'], answer: 1, why: 'An LED’s current climbs very steeply with voltage. Without something to limit it, the chip can overheat and fail.' },
  ],
  reel: [
    { ms: 5600, caption: 'A filament bulb turns about 3% of its energy into light; a white LED manages about 40%.', set: { lamp: 'bulb', drive: 100 }, anim: { lamp: ['bulb', 'led'] }, view: { pos: [0, 5.4, 13.2], target: [0, 5.1, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const tall = () => inReel() || stage.host.clientWidth < 560;
    const brass = M.metal(0xd4a94e, { roughness: 0.3 }), steel = M.metal(0xc9ced8, { roughness: 0.3 });
    // ---- the bulb, drawn about 12 times life size, standing upright
    const bulbG = new THREE.Group(); root.add(bulbG);
    const up = new THREE.Group(); up.rotation.z = Math.PI / 2; bulbG.add(up);       // build along X, stand it on end
    up.add(rod(-0.25, 0, 0.3, 0.3, steel, 20), rod(0, 1.3, 0.72, 0.72, brass, 32), rod(1.3, 1.42, 1.05, 1.05, brass, 32));
    const globe = latheX([[1.42, 0.66], [2.0, 0.72], [2.5, 0.9], [3.0, 0.92], [3.45, 0.72], [3.7, 0.4], [3.78, 0]], M.clear(0xdfefff, 0.2, { roughness: 0.04 })); globe.castShadow = false; up.add(globe);
    up.add(beam([1.42, 0, 0.26], [2.6, 0, 0.36], 0.03, steel, 8), beam([1.42, 0, -0.26], [2.6, 0, -0.36], 0.03, steel, 8));
    const bead = sphere(0.14, M.clear(0xbfd8ff, 0.5), 12); bead.position.set(1.95, 0, 0); up.add(bead);
    const filMat = new THREE.MeshStandardMaterial({ color: 0x4a4540, emissive: 0, roughness: 0.6 });
    const fp = []; for (let i = 0; i <= 160; i++) { const t = i / 160, a = t * 14 * TAU; fp.push(new THREE.Vector3(2.6 + 0.07 * Math.cos(a), 0.07 * Math.sin(a), 0.36 - 0.72 * t)); }
    const fil = tube(fp, 0.022, filMat, false, 320); fil.castShadow = false; up.add(fil);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), M.ghost(0xffc070, 0, { blending: THREE.AdditiveBlending })); halo.position.set(0, 2.6, 0); halo.castShadow = false; bulbG.add(halo);
    // ---- the LED emitter, drawn about 60 times life size
    const ledG = new THREE.Group(); root.add(ledG);
    const star = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.14, 6), M.metal(0xe4e8ee, { roughness: 0.45 })); star.position.y = 0.6; ledG.add(star);
    for (let i = 0; i < 9; i++) { const fin = box(0.1, 0.55, 2.6, M.metal(0x8f97a4, { roughness: 0.5 })); fin.position.set(-1.4 + i * 0.35, 0.26, 0); ledG.add(fin); }
    const sub = box(1.3, 0.14, 1.3, M.matte(0xf4f1e8)); sub.position.y = 0.74; ledG.add(sub);
    const chipMat = new THREE.MeshStandardMaterial({ color: 0x2b5fd8, emissive: 0, roughness: 0.3 });
    const chip = box(0.8, 0.08, 0.8, chipMat); chip.position.y = 0.85; ledG.add(chip);
    const phosMat = new THREE.MeshStandardMaterial({ color: 0xf0c020, emissive: 0, roughness: 0.5 });
    const phos = box(0.6, 0.07, 0.6, phosMat); phos.position.y = 0.925; ledG.add(phos);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 16, 0, TAU, 0, Math.PI / 2), M.clear(0xdcecff, 0.16, { roughness: 0.03 })); dome.position.y = 0.81; dome.castShadow = false; ledG.add(dome);
    const lhalo = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 16), M.ghost(0xdfeaff, 0, { blending: THREE.AdditiveBlending })); lhalo.position.y = 1.2; lhalo.castShadow = false; ledG.add(lhalo);
    // ---- light and heat packets
    const lightDots = makeDots(root, N, 0xffe9a8, 0.07), blueDots = makeDots(root, 40, 0x5aa0ff, 0.07), heatDots = makeDots(root, N, 0xc8402a, 0.06);
    const rnd = (() => { let q = 11; return () => { q = (q * 1664525 + 1013904223) >>> 0; return q / 4294967296; }; })();
    const dirs = Array.from({ length: N }, () => { const u = rnd() * 2 - 1, p = rnd() * TAU, r = Math.sqrt(1 - u * u); return [r * Math.cos(p), u, r * Math.sin(p), rnd()]; });

    const st = { lamp: 'bulb', q: state({ lamp: 'bulb', drive: 100 }) };
    const bd = board(root, 9.2, 4.3, 920, 430, (g, W, H) => {
      panelBg(g, W, H);
      const q = st.q, isB = st.lamp === 'bulb';
      text(g, isB ? 'What a white-hot wire gives out' : 'What a white LED gives out', 22, 42, { font: 'bold 30px sans-serif', col: COL.text });
      const x0 = 30, x1 = W - 24, y0 = 252, y1 = 74, nm0 = 300, nm1 = 2500, X = (nm) => x0 + ((nm - nm0) / (nm1 - nm0)) * (x1 - x0);
      // the visible band, as a rainbow strip
      for (let nm = 400; nm < 700; nm += 4) { g.fillStyle = waveCol(nm); g.globalAlpha = 0.3; g.fillRect(X(nm), y1, X(nm + 4) - X(nm) + 1, y0 - y1); }
      g.globalAlpha = 1;
      text(g, 'visible', X(550), y1 - 8, { font: 'bold 20px sans-serif', col: COL.text, align: 'center' });
      text(g, 'infrared: heat you cannot see', X(1500), y1 - 8, { font: '20px sans-serif', col: COL.soft, align: 'center' });
      const f = isB ? (nm) => planck(nm, q.T) : ledSpec;
      let peak = 0; for (let nm = nm0; nm <= nm1; nm += 10) peak = Math.max(peak, f(nm));
      const Y = (v) => y0 - (v / peak) * (y0 - y1 - 14);
      g.beginPath(); g.moveTo(X(nm0), y0); for (let nm = nm0; nm <= nm1; nm += 5) g.lineTo(X(nm), Y(f(nm))); g.lineTo(X(nm1), y0); g.closePath();
      g.fillStyle = isB ? 'rgba(255,120,80,.35)' : 'rgba(200,225,255,.4)'; g.fill();
      g.strokeStyle = isB ? '#ff9a6b' : '#dfeaff'; g.lineWidth = 3; g.beginPath(); for (let nm = nm0; nm <= nm1; nm += 5) { if (nm === nm0) g.moveTo(X(nm), Y(f(nm))); else g.lineTo(X(nm), Y(f(nm))); } g.stroke();
      // the eye's sensitivity
      g.strokeStyle = COL.good; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); for (let nm = 380; nm <= 780; nm += 5) { const y = y0 - eyeV(nm) * (y0 - y1 - 14); if (nm === 380) g.moveTo(X(nm), y); else g.lineTo(X(nm), y); } g.stroke(); g.setLineDash([]);
      text(g, 'what eyes see', X(790), y1 + 34, { font: '19px sans-serif', col: COL.good });
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke();
      for (const nm of [500, 1000, 1500, 2000, 2500]) text(g, nm.toLocaleString('en-US') + (nm === 2500 ? ' nm' : ''), X(nm), y0 + 26, { font: '19px sans-serif', col: COL.soft, align: nm === 2500 ? 'right' : 'center' });
      // of every 100 joules
      const by = 326, bh = 36, bw = x1 - x0, lw = Math.max(4, q.vis * bw);
      text(g, 'Of every 100 joules of electricity', x0, by - 14, { font: 'bold 22px sans-serif', col: COL.text });
      g.fillStyle = '#c8402a'; g.fillRect(x0, by, bw, bh); g.fillStyle = COL.light; g.fillRect(x0, by, lw, bh);
      text(g, `${fmt(q.vis * 100, q.vis < 0.1 ? 1 : 0)} J light`, x0, by + bh + 32, { font: 'bold 24px sans-serif', col: COL.light });
      text(g, `${fmt(100 - q.vis * 100, q.vis < 0.1 ? 1 : 0)} J heat`, x1, by + bh + 32, { font: 'bold 24px sans-serif', col: '#ff8a70', align: 'right' });
      text(g, `${fmt(q.eff, 1)} lumens per watt`, W / 2, by + bh + 34, { font: 'bold 28px sans-serif', col: COL.text, align: 'center' });
    }, [0.6, 2.3, 0]);

    const Ls = {
      fil: stage.label('Tungsten filament', [1.5, 2.5, 0.5], bulbG, 'hot'), glass: stage.label('Glass, no air inside', [-1.7, 3.5, 0], bulbG), base: stage.label('Shell and tip: the two contacts', [-2.5, 0.7, 0.8], bulbG),
      chip: stage.label('Blue chip, 1 mm across', [-1.5, 1.5, 0.6], ledG, 'hot'), phos: stage.label('Yellow phosphor on top', [1.3, 1.9, 0.6], ledG), sink: stage.label('Metal heat path', [0, -0.3, 1.5], ledG),
    };
    let t = 0, key = '', wasTall = null;
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const narrow = fitNarrow(stage, [Ls.glass, Ls.base, Ls.sink], -0.1, NARROW), tl = tall();
        if (tl !== wasTall) { wasTall = tl; bd.mesh.position.set(tl ? 0 : 0.6, inReel() ? 2.8 : 2.3, 0); bd.mesh.scale.setScalar(inReel() ? 1.22 : 1); }
        const mx = tl ? 0 : 3.7, yb = inReel() ? 5.8 : 5.2, isB = s.lamp === 'bulb', q = state(s);
        bulbG.visible = isB; ledG.visible = !isB;
        bulbG.position.set(mx, yb + 0.25, 0); ledG.position.set(mx, yb + 0.4, 0); ledG.scale.setScalar(1.7);
        Object.entries(Ls).forEach(([k, l]) => { const mine = ['fil', 'glass', 'base'].includes(k) === isB; l.visible = mine && !(narrow && ['glass', 'base', 'sink'].includes(k)); });
        const lit = q.lm / (isB ? BULB.lm : LED.lm);
        if (isB) {
          const [r, g, b] = kelvinRGB(q.T), e = Math.pow(lit, 0.4) * 3.2;
          filMat.emissive.setRGB(r * e, g * e, b * e); halo.material.color.setRGB(r, g, b); halo.material.opacity = 0.16 * Math.min(1.3, Math.pow(lit, 0.4));
        } else {
          const e = Math.pow(lit, 0.5);
          chipMat.emissive.setRGB(0.1 * e, 0.3 * e, 1.5 * e); phosMat.emissive.setRGB(0.9 * e, 0.7 * e, 0.1 * e); lhalo.material.opacity = 0.03 * Math.min(1.3, e);
        }
        // packets: light and heat in proportion to the energy split
        const nL = Math.round(N * q.vis), speed = 0.35;
        const ox = mx, oy = isB ? yb + 0.25 + 2.6 : yb + 0.4 + 1.2 * 1.7;
        let bi = 0;
        for (let i = 0; i < N; i++) {
          const d = dirs[i], u = (t * speed + d[3]) % 1;
          if (isB) {
            const R = 0.2 + u * 3.4, sc = (1 - u) * 1.1;
            if (i < nL) { lightDots.put(i, ox + d[0] * R, oy + d[1] * R, d[2] * R, sc * 1.25); heatDots.put(i, 0, -9, 0, 0); }
            else { heatDots.put(i, ox + d[0] * R, oy + d[1] * R, d[2] * R, sc); lightDots.put(i, 0, -9, 0, 0); }
          } else if (i < nL) {
            const R = 0.25 + u * 3.6, dy = Math.abs(d[1]) * 0.8 + 0.2, sc = (1 - u) * 1.2;
            const px = ox + d[0] * R, py = oy - 0.2 + dy * R, pz = d[2] * R;
            if (i % 3 === 0 && bi < 40) { blueDots.put(bi++, px, py, pz, sc); lightDots.put(i, 0, -9, 0, 0); } else lightDots.put(i, px, py, pz, sc);
            heatDots.put(i, 0, -9, 0, 0);
          } else {
            // heat soaks down through the board into the fins
            const sx = d[0] * 0.3, sz = d[2] * 0.3;
            heatDots.put(i, ox + sx + d[0] * u * 2.0, oy - 0.25 - u * 1.25, sz + d[2] * u * 1.4, (1 - u * 0.6) * 0.9); lightDots.put(i, 0, -9, 0, 0);
          }
        }
        for (; bi < 40; bi++) blueDots.put(bi, 0, -9, 0, 0);
        lightDots.material.color.set(isB ? new THREE.Color(...kelvinRGB(q.T + 600)) : new THREE.Color(0xffe27a));
        lightDots.done(); blueDots.done(); heatDots.done();
        const k = `${s.lamp}|${Math.round(s.drive)}`;
        if (k !== key) { key = k; st.lamp = s.lamp; st.q = q; bd.redraw(); }
      },
      readout(s) {
        const q = state(s), isB = s.lamp === 'bulb';
        return slim(stage, `<div class="big">${fmt(q.lm, q.lm < 20 ? 1 : 0)} lumens from ${q.W.toFixed(2)} W</div>
          <div class="row"><span>Efficacy</span><b>${fmt(q.eff, 1)} lm/W</b></div>
          <div class="row"><span>${isB ? 'Filament' : 'Supply'}</span><b>${isB ? 'about ' + (Math.round(q.T / 10) * 10).toLocaleString('en-US') + ' K' : q.V.toFixed(2) + ' V, ' + Math.round(q.I * 1000) + ' mA'}</b></div>
          <div class="row"><span>Leaves as light</span><b>about ${fmt(q.vis * 100, q.vis < 0.1 ? 1 : 0)}%</b></div>
          <div class="row"><span>${isB ? 'Bulb life' : '10% more volts'}</span><b>${isB ? hrs(q.life) : q.up.toFixed(1) + '× the current'}</b></div>
          <small>${isB ? `Rated ${BULB.V} V, ${BULB.lm.toFixed(0)} lm, ${BULB.life} h. 10% more volts: +${Math.round((q.up - 1) * 100)}% current.` : 'A blue chip under a yellow phosphor.'}</small>`);
      },
    };
  },
};
