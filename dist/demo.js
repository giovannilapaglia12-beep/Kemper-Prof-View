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
  const ccPage = { 17: 0x32, 18: 0x33, 19: 0x34, 20: 0x35, 22: 0x38, 24: 0x3a, 26: 0x3c, 27: 0x3c, 28: 0x3d, 29: 0x3d };
  const input = { id: "demo-in", name: "Profiler Player DEMO", manufacturer: "Kemper", state: "connected", type: "input", onmidimessage: null };
  const emit = (bytes) => setTimeout(() => input.onmidimessage?.({ data: new Uint8Array(bytes), receivedTime: performance.now() }), 12);
  const H = [0xf0, 0x00, 0x20, 0x33, 0x00, 0x00];
  const text = (t) => [...t].map((c) => c.charCodeAt(0) & 0x7f);
  const param = (p, q, v) => emit([...H, 0x01, 0x00, p, q, (v >> 7) & 0x7f, v & 0x7f, 0xf7]);
  const cents = () => -22 * Math.exp(-(performance.now() - st.tunerAt) / 3500) + (Math.random() - 0.5) * 1.6;
  const output = {
    id: "demo-out", name: "Profiler Player DEMO", manufacturer: "Kemper", state: "connected", type: "output",
    send(data) {
      const b = Array.from(data);
      if (b[0] === 0xf0) {
        const fn = b[6]; const p = b[8]; const q = b[9];
        if (fn === 0x43 && p === 0 && q === 1) return emit([...H, 0x03, 0x00, 0, 1, ...text(rigName()), 0x00, 0xf7]);
        if (fn === 0x41) {
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
        const newBank = Math.floor((b[1] % 50) / 5);
        if (newBank !== Math.floor(st.program / 5)) {
          const names = [`Bank ${newBank + 1}`, "Clean", "Edge", "Breakup", "Drive", "Swells"];
          names.forEach((name, index) => emit([...H, 0x07, 0x00, 0x00, 0x00, 0x01, 0x00, index, ...text(name), 0x00, 0xf7]));
        }
        st.program = b[1] % 50;
        st.fx = structuredClone(fxSets[st.program % 2]);
        st.morph = 0; st.freeze = 0;
        emit([0xc0, b[1]]);
      }
      if (family === 0xb0) {
        if (ccPage[b[1]]) st.fx[ccPage[b[1]]][1] = b[2] ? 1 : 0;
        if (b[1] === 11) st.morph = Math.round(b[2] / 127 * 16383);
        if (b[1] === 31) { st.tuner = b[2] ? 1 : 3; st.tunerAt = performance.now(); }
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
