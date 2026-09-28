// Modalità DEMO: Kemper Player simulato, per provare l'app senza il Player.
// Non invia nulla a dispositivi reali. I valori imitano quelli visti nei log del Player.
export function installDemoKemper() {
  const rigs = [
    ["TH Amb Cln", "3P Black T", "56 Pro 8", "63 BMaster ODR", "72 Marshall 1 2"],
    ["RT FIRESPIT 4", "Worship Clean Amb", "AC30 Edge Lead", "Plexi Crunch", "Deluxe Swell"],
  ];
  const fxSets = [
    { 0x32: [49, 1], 0x33: [32, 1], 0x34: [0, 0], 0x35: [36, 0], 0x38: [97, 1], 0x3a: [65, 0], 0x3c: [146, 1], 0x3d: [178, 1] },
    { 0x32: [49, 0], 0x33: [114, 1], 0x34: [42, 0], 0x35: [0, 0], 0x38: [98, 1], 0x3a: [81, 1], 0x3c: [147, 0], 0x3d: [181, 1] },
  ];
  const st = { program: 5, tempo: 4288, morph: 0, tuner: 3, tunerAt: 0, freeze: 0, fx: structuredClone(fxSets[1]),
    fixed: { 0x10: 0, 0x1a: 1, 0x01: 0, 0x29: 0 }, location: 1 };
  const rigName = () => rigs[Math.floor(st.program / 5) % 2][st.program % 5];
  // v1.48: come il Player, CC 0 e CC 32 (Bank Select) prima del Program Change: 625 Rig in 125 Bank.
  let bankSelect = 0;
  const emitProgram = () => { emit([0xb0, 0, 0]); emit([0xb0, 32, Math.floor(st.program / 128)]); emit([0xc0, st.program % 128]); };
  // v1.45: ampli e cabinet simulati (il primo Rig di ogni Bank ha il cabinet spento, come un Rig acustico).
  const amps = [["Fender", "Deluxe Reverb"], ["Vox", "AC30"], ["Marshall", "JCM800"], ["Matchless", "DC-30"], ["Mesa", "Mark IV"]];
  const stackStrings = () => {
    const [maker, model] = amps[st.program % 5];
    // Come sul Player (27/09/2026): Rig acustico con cabinet "N/A", Rig 5 con cabinet acceso ma senza nome.
    const slot = st.program % 5;
    const cab = slot === 0 ? ["N/A", "N/A", "N/A"] : slot === 4 ? ["", "", ""] : ["4x12 Greenback", "Celestion", "G12M"];
    return { 0x10: `${maker} ${model}`, 0x15: maker, 0x18: model, 0x20: cab[0], 0x25: cab[1], 0x2a: cab[2] };
  };
  const ccPage = { 17: 0x32, 18: 0x33, 19: 0x34, 20: 0x35, 22: 0x38, 24: 0x3a, 26: 0x3c, 27: 0x3c, 28: 0x3d, 29: 0x3d };
  const input = { id: "demo-in", name: "Profiler Player DEMO", manufacturer: "Kemper", state: "connected", type: "input", onmidimessage: null };
  const emit = (bytes) => setTimeout(() => input.onmidimessage?.({ data: new Uint8Array(bytes), receivedTime: performance.now() }), 12);
  const H = [0xf0, 0x00, 0x20, 0x33, 0x00, 0x00];
  const text = (t) => [...t].map((c) => c.charCodeAt(0) & 0x7f);
  const param = (p, q, v) => emit([...H, 0x01, 0x00, p, q, (v >> 7) & 0x7f, v & 0x7f, 0xf7]);
  const cents = () => -22 * Math.exp(-(performance.now() - st.tunerAt) / 3500) + (Math.random() - 0.5) * 1.6;
  // Modalità bidirezionale simulata (set 2): sensing ogni 500 ms, invio spontaneo di nome Rig,
  // effetti A–MOD, Tuner e battito del tempo. DLY/REV e Fixed FX NON vengono inviati, come probabilmente sul Player.
  const bidi = { until: 0, timer: null, beatTimer: null, tunerTimer: null };
  // window.__demoNoBidi = true simula un Player che non risponde (per provare il ritorno alle letture periodiche).
  const bidiOn = () => performance.now() < bidi.until && !window.__demoNoBidi;
  const BIDI_PAGES = [0x32, 0x33, 0x34, 0x35, 0x38, 0x3a];
  const pushRig = () => {
    emit([...H, 0x03, 0x00, 0, 1, ...text(rigName()), 0x00, 0xf7]);
    for (const page of BIDI_PAGES) { param(page, 0, st.fx[page][0]); param(page, 3, st.fx[page][1]); }
  };
  const pushTuner = () => {
    if (!bidiOn() || st.tuner !== 1) return;
    param(0x7d, 0x54, 45);
    param(0x7c, 0x0f, 8192 + Math.round(cents() * 81.92));
  };
  const beat = () => {
    if (!bidiOn()) return;
    param(0x7c, 0x00, 1);
    setTimeout(() => param(0x7c, 0x00, 0), 90);
  };
  const startBidi = (flags, lease) => {
    bidi.until = performance.now() + Math.max(1, lease) * 2000;
    if (!bidi.timer) {
      bidi.timer = setInterval(() => {
        if (!bidiOn()) { clearInterval(bidi.timer); clearInterval(bidi.beatTimer); clearInterval(bidi.tunerTimer); bidi.timer = null; return; }
        if (!window.__demoNoBidi) emit([...H, 0x7e, 0x00, 0x7f, 0x00, 0xf7]);
      }, 500);
      bidi.tunerTimer = setInterval(pushTuner, 80);
    }
    clearInterval(bidi.beatTimer);
    bidi.beatTimer = setInterval(beat, 60000 / (st.tempo / 64));
    if (flags & 0x01) {
      // Come sul Player reale: stato completo, poi Program Change e SOLO DOPO i nomi della Bank.
      pushRig(); param(0x7f, 0x7e, st.tuner);
      setTimeout(() => {
        emitProgram();
        const bank = Math.floor(st.program / 5);
        [`Bank ${bank + 1}`, "Clean", "Edge", "Breakup", "Drive", "Swells"]
          .forEach((name, index) => emit([...H, 0x07, 0x00, 0x00, 0x00, 0x01, 0x00, index, ...text(name), 0x00, 0xf7]));
      }, 60);
    }
  };
  const output = {
    id: "demo-out", name: "Profiler Player DEMO", manufacturer: "Kemper", state: "connected", type: "output",
    send(data) {
      const b = Array.from(data);
      if (b[0] === 0xf0) {
        const fn = b[6]; const p = b[8]; const q = b[9];
        if (fn === 0x47 && p === 0x00 && b[9] === 0x00 && b[10] === 0x01) {
          // Nomi della Bank in uso (stringhe estese 00 00 01 00 n)
          const bank = Math.floor(st.program / 5);
          const names = [`Bank ${bank + 1}`, "Clean", "Edge", "Breakup", "Drive", "Swells"];
          const index = b[12];
          return emit([...H, 0x07, 0x00, 0x00, 0x00, 0x01, 0x00, index, ...text(names[index] ?? ""), 0x00, 0xf7]);
        }
        // v1.61: lettura multipla della pagina 5 (Fixed FX): valori On/Off noti, gli altri 0.
        if (fn === 0x42 && p === 5) {
          const values = Array.from({ length: 64 }, (_, index) => st.fixed[index] ?? 0);
          return emit([...H, 0x02, 0x00, 5, 0, ...values.flatMap((v) => [(v >> 7) & 0x7f, v & 0x7f]), 0xf7]);
        }
        if (fn === 0x7c && p === 5) return emit([...H, 0x3c, 0x00, 5, q, b[10], b[11], ...text(String((b[10] << 7) | b[11])), 0x00, 0xf7]);
        if (fn === 0x7e && p === 0x40) return window.__demoNoBidi ? undefined : startBidi(b[10], b[11]);
        if (fn === 0x43 && p === 0 && q === 1) return emit([...H, 0x03, 0x00, 0, 1, ...text(rigName()), 0x00, 0xf7]);
        if (fn === 0x43 && p === 0 && q in stackStrings()) return emit([...H, 0x03, 0x00, 0, q, ...text(stackStrings()[q]), 0x00, 0xf7]);
        if (fn === 0x41) {
          if (p === 0x0a && q === 2) return param(0x0a, 2, 1);
          if (p === 0x0c && q === 2) return param(0x0c, 2, st.program % 5 === 0 || st.program % 5 === 1 ? 0 : 1);
          if (p === 4 && q === 0) return param(4, 0, st.tempo);
          if (p === 0 && q === 0x0b) return param(0, 0x0b, st.morph);
          if (p === 0x7f && q === 0x7e) return param(0x7f, 0x7e, st.tuner);
          if (p === 0x7d && q === 0x54) return st.tuner === 1 && param(0x7d, 0x54, 45);
          if (p === 0x7c && q === 0x51) return st.tuner === 1 && param(0x7c, 0x51, 8192 + Math.round(cents() * 81.92));
          if (p === 0x7d && q === 0x73) return param(0x7d, 0x73, st.freeze);
          if (p === 0x7f && q === 53) return param(0x7f, 53, st.location);
          if (p === 5 && q in st.fixed) return param(5, q, st.fixed[q]);
          if (st.fx[p]) return param(p, q, q === 0 ? st.fx[p][0] : st.fx[p][1]);
        }
        if (fn === 0x01) {
          const v = (b[10] << 7) | b[11];
          if (p === 4 && q === 0) st.tempo = v;
          if (p === 0x7d && q === 0x73) st.freeze = v;
          if (p === 5 && q in st.fixed) st.fixed[q] = v;
          if (p === 0x7f && q === 53) st.location = v;
        }
        if (fn === 0x7c && p === 4) {
          const v = (b[10] << 7) | b[11];
          return emit([...H, 0x3c, 0x00, 4, 0, b[10], b[11], ...text(`${(v / 64).toFixed(1)} BPM`), 0x00, 0xf7]);
        }
        return;
      }
      const family = b[0] & 0xf0;
      if (family === 0xc0) {
        const index = Math.min(624, bankSelect * 128 + b[1]);
        const newBank = Math.floor(index / 5);
        if (newBank !== Math.floor(st.program / 5)) {
          const names = [`Bank ${newBank + 1}`, "Clean", "Edge", "Breakup", "Drive", "Swells"];
          // Come il Player reale quando la Bank cambia dall'app: solo nome Bank e slot 2.
          [0, 2].forEach((index) => emit([...H, 0x07, 0x00, 0x00, 0x00, 0x01, 0x00, index, ...text(names[index]), 0x00, 0xf7]));
        }
        st.program = index;
        st.fx = structuredClone(fxSets[st.program % 2]);
        st.morph = 0; st.freeze = 0;
        emitProgram();
        if (bidiOn()) setTimeout(pushRig, 30);
      }
      if (family === 0xb0) {
        if (b[1] === 32) bankSelect = b[2];
        if (ccPage[b[1]]) st.fx[ccPage[b[1]]][1] = b[2] ? 1 : 0;
        if (b[1] === 11) st.morph = Math.round(b[2] / 127 * 16383);
        if (b[1] === 31) {
          st.tuner = b[2] ? 1 : 3; st.tunerAt = performance.now();
          if (bidiOn()) param(0x7f, 0x7e, st.tuner);
        }
        if (b[1] === 30) st.tempo = Math.round((st.tempo + 64 * (Math.random() * 6 - 3)) );
      }
    },
  };
  const access = {
    sysexEnabled: true,
    inputs: new Map([[input.id, input]]),
    outputs: new Map([[output.id, output]]),
    onstatechange: null,
  };
  navigator.requestMIDIAccess = async () => access;
  window.__kemperDemo = true;
}
