const KEMPER_HEADER = [0xf0, 0x00, 0x20, 0x33, 0x02, 0x7f];

export const KEMPER_REQUESTS = {
  rigName: [...KEMPER_HEADER, 0x43, 0x00, 0x00, 0x01, 0xf7],
  tempo: [...KEMPER_HEADER, 0x41, 0x00, 0x04, 0x00, 0xf7],
  morphLevel: [...KEMPER_HEADER, 0x41, 0x00, 0x00, 0x0b, 0xf7],
  tunerMode: [...KEMPER_HEADER, 0x41, 0x00, 0x7f, 0x7e, 0xf7],
  tunerNote: [...KEMPER_HEADER, 0x41, 0x00, 0x7d, 0x54, 0xf7],
  tunerPitch: [...KEMPER_HEADER, 0x41, 0x00, 0x7c, 0x51, 0xf7],
};

export const FREEZE_REV_HOLD = {
  page: 0x7d,
  parameter: 0x73,
  address: "125/115",
};

export const FIXED_FX = [
  { key: "booster", label: "Pure Booster", page: 0x05, parameter: 0x10 },
  { key: "chorus", label: "Vintage Chorus", page: 0x05, parameter: 0x1a },
  { key: "transpose", label: "Transpose", page: 0x05, parameter: 0x01 },
  { key: "doubleTracker", label: "Double Tracker", page: 0x05, parameter: 0x29 },
];

export const EFFECT_MODULES = [
  { key: "A", page: 0x32, cc: 17 },
  { key: "B", page: 0x33, cc: 18 },
  { key: "C", page: 0x34, cc: 19 },
  { key: "D", page: 0x35, cc: 20 },
  { key: "X", page: 0x38, cc: 22 },
  { key: "MOD", page: 0x3a, cc: 24 },
  { key: "DLY", page: 0x3c, cc: 27 },
  { key: "REV", page: 0x3d, cc: 29 },
];

const EFFECT_NAMES = new Map([
  [0, "Empty"], [1, "Wah Wah"], [2, "Wah Low Pass"], [3, "Wah High Pass"], [4, "Wah Vowel Filter"],
  [6, "Wah Phaser"], [7, "Wah Flanger"], [8, "Wah Rate Reducer"], [9, "Wah Ring Modulator"],
  [10, "Wah Freq Shifter"], [11, "Pedal Pitch"], [12, "Wah Formant Shifter"], [13, "Pedal Vinyl Stop"],
  [17, "Bit Shaper"], [18, "Octa Shaper"], [19, "Soft Shaper"], [20, "Hard Shaper"], [21, "Wave Shaper"],
  [34, "Plus DS"], [35, "One DS"], [116, "Wah Pedal Booster"], [132, "Analog Octaver"], [140, "Dual Loop Pitch"],
  [32, "Kemper Drive"], [33, "Green Scream"],
  [36, "Muffin"], [37, "Mouse"], [38, "Kemper Fuzz"], [39, "Metal DS"],
  [42, "Full OC"], [49, "Compressor"], [50, "Auto Swell"], [57, "Noise Gate 2:1"],
  [58, "Noise Gate 4:1"], [64, "Space"], [65, "Vintage Chorus"], [66, "Hyper Chorus"],
  [67, "Air Chorus"], [68, "Vibrato"], [69, "Rotary Speaker"], [70, "Tremolo"],
  [71, "Micro Pitch"], [81, "Phaser"], [82, "Phaser Vibe"], [83, "Phaser Oneway"],
  [89, "Flanger"], [91, "Flanger Oneway"], [97, "Graphic EQ"], [98, "Studio EQ"],
  [99, "Metal EQ"], [100, "Acoustic Simulator"], [101, "Stereo Widener"],
  [102, "Phase Widener"], [103, "Delay Widener"], [104, "Double Tracker"],
  [113, "Treble Booster"], [114, "Lead Booster"], [115, "Pure Booster"],
  [121, "Loop Mono"], [122, "Loop Stereo"], [123, "Loop Distortion"],
  [129, "Transpose"], [130, "Chromatic Pitch"], [131, "Harmonic Pitch"],
  [137, "Dual Chromatic"], [138, "Dual Harmonic"], [139, "Dual Crystal"],
  [145, "Legacy Delay"], [146, "Single Delay"], [147, "Dual Delay"],
  [148, "Two Tap Delay"], [149, "Serial TwoTap"], [150, "Crystal Delay"],
  [151, "Loop Pitch Delay"], [152, "Freq Shifter Delay"], [161, "Rhythm Delay"],
  [162, "Melody Chromatic"], [163, "Melody Harmonic"], [164, "Quad Delay"],
  [165, "Quad Chromatic"], [166, "Quad Harmonic"], [177, "Legacy Reverb"],
  [178, "Natural Reverb"], [179, "Easy Reverb"], [180, "Echo Reverb"],
  [181, "Cirrus Reverb"], [182, "Formant Reverb"], [183, "Ionosphere Reverb"],
  [193, "Spring Reverb"],
]);

const hex = (value) => value.toString(16).padStart(2, "0").toUpperCase();

export function bytesToHex(bytes) {
  return Array.from(bytes, hex).join(" ");
}

export class KemperMidiState {
  constructor(onChange = () => {}) {
    this.onChange = onChange;
    this.state = {
      program: null,
      channel: null,
      bpm: null,
      rigName: null,
      identity: null,
      controls: new Map(),
      effects: new Map(EFFECT_MODULES.map(({ key, page }) => [page, { key, type: null, name: "—", active: null }])),
      tempoRaw: null,
      tempoRendered: null,
    };
    this.nrpn = new Map();
  }

  ingest(event) {
    const bytes = Array.from(event.data);
    if (!bytes.length) return null;

    const status = bytes[0];
    const family = status & 0xf0;
    const channel = (status & 0x0f) + 1;
    let decoded;

    if (status === 0xf0) {
      decoded = this.decodeSysex(bytes);
    } else if (family === 0xc0) {
      const program = bytes[1] ?? 0;
      // v1.48: oltre il 128° Rig (Bank 26 Rig 3) il Player usa il Bank Select LSB (CC 32) inviato prima del Program Change.
      const bankSelect = this.bankSelectLsb ?? 0;
      const rigIndex = bankSelect * 128 + program;
      this.state.program = program;
      this.state.rigIndex = rigIndex;
      this.state.channel = channel;
      decoded = { type: "Program Change", detail: `CH ${channel} · Program ${program}${bankSelect ? ` · Bank Select ${bankSelect}` : ""}`,
        channel, program, bankSelect, rigIndex };
    } else if (family === 0xb0) {
      const controller = bytes[1] ?? 0;
      const value = bytes[2] ?? 0;
      this.state.channel = channel;
      this.state.controls.set(controller, value);
      if (controller === 32) this.bankSelectLsb = value;
      this.applyEffectCc(controller, value);
      const nrpn = this.trackNrpn(channel, controller, value);
      decoded = nrpn ?? { type: "Control Change", detail: `CH ${channel} · CC ${controller} = ${value}`, channel, controller, value };
    } else if (family === 0x90 || family === 0x80) {
      const note = bytes[1] ?? 0;
      const velocity = bytes[2] ?? 0;
      const noteOn = family === 0x90 && velocity > 0;
      decoded = { type: noteOn ? "Note On" : "Note Off", detail: `CH ${channel} · Nota ${note} · Vel ${velocity}` };
    } else if (family === 0xe0) {
      const value = ((bytes[2] ?? 0) << 7) | (bytes[1] ?? 0);
      decoded = { type: "Pitch Bend", detail: `CH ${channel} · ${value}` };
    } else if (status === 0xf8) {
      decoded = { type: "MIDI Clock", detail: "Clock tick" };
    } else {
      decoded = { type: "MIDI", detail: bytesToHex(bytes) };
    }

    this.onChange({ ...this.state, controls: new Map(this.state.controls), effects: new Map(this.state.effects) });
    return { ...decoded, bytes, hex: bytesToHex(bytes), receivedAt: event.receivedTime ?? performance.now() };
  }

  applyEffectCc(controller, value) {
    const pages = new Map([[17, 0x32], [18, 0x33], [19, 0x34], [20, 0x35], [22, 0x38], [24, 0x3a], [26, 0x3c], [27, 0x3c], [28, 0x3d], [29, 0x3d]]);
    const page = pages.get(controller);
    if (page === undefined) return;
    const current = this.state.effects.get(page);
    this.state.effects.set(page, { ...current, active: value > 0 });
  }

  trackNrpn(channel, controller, value) {
    const current = this.nrpn.get(channel) ?? { msb: null, lsb: null, dataMsb: null };
    if (controller === 99) current.msb = value;
    if (controller === 98) current.lsb = value;
    if (controller === 6) current.dataMsb = value;
    if (controller === 38 && current.msb !== null && current.lsb !== null) {
      const number = current.msb * 128 + current.lsb;
      const data = (current.dataMsb ?? 0) * 128 + value;
      this.nrpn.set(channel, current);
      return { type: "NRPN", detail: `CH ${channel} · #${number} = ${data}` };
    }
    this.nrpn.set(channel, current);
    return null;
  }

  decodeSysex(bytes) {
    const isKemper = bytes.length >= 8 && bytes[1] === 0x00 && bytes[2] === 0x20 && bytes[3] === 0x33;
    if (isKemper) {
      const functionCode = bytes[6];
      const page = bytes[8];
      const parameter = bytes[9];

      if (functionCode === 0x03) {
        const terminator = bytes.indexOf(0x00, 10);
        const end = terminator === -1 ? bytes.length - 1 : terminator;
        const value = String.fromCharCode(...bytes.slice(10, end)).trim();
        if (page === 0x00 && parameter === 0x01) this.state.rigName = value || "Rig senza nome";
        return { type: "Kemper String", detail: `Page ${page} · Param ${parameter} · ${value || "(vuoto)"}`, page, parameter, text: value };
      }

      if (functionCode === 0x01 && bytes.length >= 13) {
        const value = ((bytes[10] ?? 0) << 7) | (bytes[11] ?? 0);
        const hasMorphValue = bytes.length >= 15 && bytes[14] === 0xf7;
        const morphValue = hasMorphValue
          ? ((bytes[12] ?? 0) << 7) | (bytes[13] ?? 0)
          : null;
        if (page === 0x04 && parameter === 0x00) this.state.tempoRaw = value;
        if (this.state.effects.has(page) && (parameter === 0x00 || parameter === 0x03)) {
          const current = this.state.effects.get(page);
          this.state.effects.set(page, parameter === 0x00
            ? { ...current, type: value, name: EFFECT_NAMES.get(value) ?? `Effect #${value}` }
            : { ...current, active: value > 0 });
        }
        const morphDetail = morphValue === null ? "" : ` · Morph ${morphValue}`;
        return {
          type: "Kemper Parameter",
          detail: `Page ${page} · Param ${parameter} = ${value}${morphDetail}`,
          page,
          parameter,
          value,
          morphValue,
          hasMorphValue,
        };
      }

      if (functionCode === 0x3c && bytes.length >= 14) {
        const value = ((bytes[10] ?? 0) << 7) | (bytes[11] ?? 0);
        const terminator = bytes.indexOf(0x00, 12);
        const end = terminator === -1 ? bytes.length - 1 : terminator;
        const rendered = String.fromCharCode(...bytes.slice(12, end)).trim();
        if (page === 0x04 && parameter === 0x00) {
          const match = rendered.replace(",", ".").match(/\d+(?:\.\d+)?/);
          this.state.tempoRendered = rendered;
          if (match) this.state.bpm = Number(match[0]);
        }
        return { type: "Kemper Rendered", detail: `Page ${page} · Param ${parameter} · ${rendered || "(vuoto)"}`, page, parameter, value, rendered };
      }

      if (functionCode === 0x7e) {
        const data = bytes.slice(7, -1);
        // "Sensing" della modalità bidirezionale: F0 00 20 33 00 00 7E 00 7F … F7,
        // inviato dal Player circa ogni 500 ms finché il beacon dell'app è valido.
        const heartbeat = data[0] === 0x00 && data[1] === 0x7f;
        return {
          type: heartbeat ? "Kemper Heartbeat" : "Kemper Live Data",
          detail: bytesToHex(bytes),
          functionCode,
          data,
        };
      }

      if (functionCode === 0x07 && bytes.length >= 14) {
        // Non documentato: il Player lo invia da solo al cambio Bank.
        // Indice 0 = nome della Bank, 1…5 = nomi degli slot.
        const index = bytes[12];
        const terminator = bytes.indexOf(0x00, 13);
        const end = terminator === -1 ? bytes.length - 1 : terminator;
        const text = String.fromCharCode(...bytes.slice(13, end)).trim();
        return {
          type: "Kemper Bank Names",
          detail: `${index === 0 ? "Bank" : `Slot ${index}`} · ${text || "(vuoto)"}`,
          index,
          text,
        };
      }

      if (functionCode === 0x02 && bytes.length >= 12) {
        // v1.61: risposta alla lettura multipla 0x42 (tutti i valori di una pagina, 14 bit ciascuno).
        // Formato: … 02 00 <pagina> <primo parametro> [MSB LSB]… F7 (27/09/2026: pagina intera = 110 valori).
        const page = bytes[8];
        const first = bytes[9];
        const data = bytes.slice(10, bytes.length - 1);
        const values = [];
        for (let i = 0; i + 1 < data.length; i += 2) values.push((data[i] << 7) | data[i + 1]);
        return {
          type: "Kemper Multi Parameter",
          detail: `Page ${page} · dal Param ${first} · ${values.length} valori`,
          page,
          first,
          values,
          hex: bytesToHex(bytes),
        };
      }

      return { type: "Kemper SysEx", detail: bytesToHex(bytes) };
    }

    const isIdentityReply = bytes[1] === 0x7e && bytes[3] === 0x06 && bytes[4] === 0x02;
    if (isIdentityReply) {
      const manufacturer = bytes[5] === 0x00
        ? bytes.slice(5, 8).map(hex).join(" ")
        : hex(bytes[5] ?? 0);
      this.state.identity = `Manufacturer ${manufacturer}`;
      return { type: "Identity Reply", detail: `${this.state.identity} · ${bytesToHex(bytes)}` };
    }
    return { type: "SysEx", detail: bytesToHex(bytes) };
  }
}

export function buildProfilerStateRequests() {
  const requests = [
    { label: "Rig Name", bytes: KEMPER_REQUESTS.rigName },
    { label: "Tempo", bytes: KEMPER_REQUESTS.tempo },
    { label: "Morph Level", bytes: KEMPER_REQUESTS.morphLevel },
    { label: "Tuner Mode", bytes: KEMPER_REQUESTS.tunerMode },
  ];
  for (const module of EFFECT_MODULES) {
    requests.push({ label: `${module.key} Type`, bytes: [...KEMPER_HEADER, 0x41, 0x00, module.page, 0x00, 0xf7] });
    requests.push({ label: `${module.key} On/Off`, bytes: [...KEMPER_HEADER, 0x41, 0x00, module.page, 0x03, 0xf7] });
  }
  return requests;
}

export function buildProfilerPollRequests() {
  return [
    { label: "Rig Name Poll", bytes: KEMPER_REQUESTS.rigName },
    { label: "Tuner Mode Poll", bytes: KEMPER_REQUESTS.tunerMode },
    ...buildEffectStateRequests(),
  ];
}

export function buildMorphLevelRequest(label = "Morph Confirmation") {
  return { label, bytes: KEMPER_REQUESTS.morphLevel };
}

export function buildRigNameRequest(label = "Rig Name Confirmation") {
  return { label, bytes: KEMPER_REQUESTS.rigName };
}

export function buildTempoRequest(label = "Tempo Confirmation") {
  return { label, bytes: KEMPER_REQUESTS.tempo };
}

export function buildTempoChangeRequest(value, label = "Set Tempo") {
  const normalized = Math.max(0, Math.min(0x3fff, Math.round(value)));
  const valueMsb = (normalized >> 7) & 0x7f;
  const valueLsb = normalized & 0x7f;
  return {
    label,
    bytes: [...KEMPER_HEADER, 0x01, 0x00, 0x04, 0x00, valueMsb, valueLsb, 0xf7],
  };
}

// v1.61: lettura multipla di una pagina intera (0x42): il Player risponde con un solo 0x02.
export function buildMultiParameterRequest(page, label = `Read page ${page} (multi)`) {
  return {
    label,
    bytes: [...KEMPER_HEADER, 0x42, 0x00, page & 0x7f, 0x00, 0xf7],
  };
}

export function buildParameterRequest(page, parameter, label = `Read ${page}/${parameter}`) {
  return {
    label,
    bytes: [...KEMPER_HEADER, 0x41, 0x00, page & 0x7f, parameter & 0x7f, 0xf7],
  };
}

export function buildParameterChangeRequest(page, parameter, value, label = `Set ${page}/${parameter}`) {
  const normalized = Math.max(0, Math.min(0x3fff, Math.round(value)));
  const valueMsb = (normalized >> 7) & 0x7f;
  const valueLsb = normalized & 0x7f;
  return {
    label,
    bytes: [
      ...KEMPER_HEADER,
      0x01,
      0x00,
      page & 0x7f,
      parameter & 0x7f,
      valueMsb,
      valueLsb,
      0xf7,
    ],
  };
}

export function buildRevHoldRequest(label = "REV Hold Probe 125/115") {
  return buildParameterRequest(FREEZE_REV_HOLD.page, FREEZE_REV_HOLD.parameter, label);
}

export function buildRevHoldChangeRequest(active, label = `REV Hold ${active ? "ON" : "OFF"}`) {
  return buildParameterChangeRequest(
    FREEZE_REV_HOLD.page,
    FREEZE_REV_HOLD.parameter,
    active ? 1 : 0,
    label,
  );
}

export function buildFixedFxStateRequests(effects = FIXED_FX) {
  return effects.map((effect) => buildParameterRequest(
    effect.page,
    effect.parameter,
    `${effect.label} State`,
  ));
}

export function buildFixedFxChangeRequest(effect, active, label = `${effect.label} ${active ? "ON" : "OFF"}`) {
  return buildParameterChangeRequest(
    effect.page,
    effect.parameter,
    active ? 1 : 0,
    label,
  );
}

export function buildTunerModeRequest(label = "Tuner Confirmation") {
  return { label, bytes: KEMPER_REQUESTS.tunerMode };
}

export function buildTunerStreamRequests() {
  return [
    { label: "Tuner Note Poll", bytes: KEMPER_REQUESTS.tunerNote },
    { label: "Tuner Pitch Poll", bytes: KEMPER_REQUESTS.tunerPitch },
  ];
}

export function buildEffectStateRequests(pages = EFFECT_MODULES.map((module) => module.page)) {
  const requested = new Set(pages.map(Number));
  return EFFECT_MODULES.filter((module) => requested.has(module.page)).map((module) => ({
    label: `${module.key} On/Off Poll`,
    bytes: [...KEMPER_HEADER, 0x41, 0x00, module.page, 0x03, 0xf7],
  }));
}

// Modalità bidirezionale (beacon). Formato usato anche dal firmware PySwitch per
// MIDI Captain, verificato da quel progetto sui Kemper Player:
// F0 00 20 33 02 7F 7E 00 40 <set> <flag> <lease> F7
//   set   = 0x02 (effetti A–MOD tipo/stato, nome Rig, Tuner)
//   flag  = bit0 INIT (invia subito tutti i parametri del set), bit1 SYSEX (usa SysEx invece di NRPN),
//           bit2 ECHO, bit3 NOFE, bit4 NOCTR, bit5 TUNEMODE (dati Tuner anche fuori dal Tuner)
//   lease = durata in passi di 2 s: se il beacon non viene ripetuto, il Player smette di inviare.
export const BIDIRECTIONAL = {
  parameterSet: 0x02,
  flags: { init: 0x01, sysex: 0x02, echo: 0x04, nofe: 0x08, noctr: 0x10, tuneMode: 0x20 },
};

export function buildBeaconRequest({
  init = false,
  sysex = true,
  echo = false,
  tuneMode = false,
  leaseSeconds = 30,
  parameterSet = BIDIRECTIONAL.parameterSet,
} = {}) {
  const { flags } = BIDIRECTIONAL;
  const flagByte = (init ? flags.init : 0) | (sysex ? flags.sysex : 0)
    | (echo ? flags.echo : 0) | (tuneMode ? flags.tuneMode : 0);
  const lease = Math.max(1, Math.min(0x7f, Math.round(leaseSeconds / 2)));
  return {
    label: `Beacon bidirezionale${init ? " INIT" : ""} · set ${parameterSet} · ${lease * 2} s`,
    bytes: [...KEMPER_HEADER, 0x7e, 0x00, 0x40, parameterSet & 0x7f, flagByte, lease, 0xf7],
  };
}

// Chiave "tipo:pagina/parametro" di una richiesta di lettura (0x41 parametro, 0x43 stringa, 0x47 stringa estesa).
export function requestKey(bytes) {
  const functionCode = bytes[6];
  if (functionCode === 0x41) return `par:${bytes[8]}/${bytes[9]}`;
  if (functionCode === 0x43) return `str:${bytes[8]}/${bytes[9]}`;
  if (functionCode === 0x47) return `ext:${bytes.slice(8, 13).join(".")}`;
  return null;
}

// Nomi della Bank in uso (v1.41): stringhe estese 00 00 01 00 <n>, n = 0 nome Bank, 1…5 slot.
// Indirizzi non documentati da Kemper, trovati dagli utenti del forum Kemper; il Player risponde
// con la funzione 0x07 (lo stesso messaggio che invia da solo al cambio Bank).
export function buildBankNamesRequests() {
  return [0, 1, 2, 3, 4, 5].map((index) => ({
    label: index === 0 ? "Nome Bank (0x47)" : `Nome slot ${index} (0x47)`,
    bytes: [...KEMPER_HEADER, 0x47, 0x00, 0x00, 0x00, 0x01, 0x00, index, 0xf7],
  }));
}

// Stessa chiave per un messaggio ricevuto e decodificato.
export function decodedKey(decoded) {
  if (decoded?.type === "Kemper Parameter") return `par:${decoded.page}/${decoded.parameter}`;
  if (decoded?.type === "Kemper String") return `str:${decoded.page}/${decoded.parameter}`;
  return null;
}

export function buildRenderedValueRequest(page, parameter, value) {
  const valueMsb = (value >> 7) & 0x7f;
  const valueLsb = value & 0x7f;
  return {
    label: `Rendered ${page}/${parameter}`,
    bytes: [...KEMPER_HEADER, 0x7c, 0x00, page, parameter, valueMsb, valueLsb, 0xf7],
  };
}

// v1.45: ampli e cabinet del Rig in uso. Stringhe 0x43 pagina 0 (indirizzi dal forum Kemper:
// 0x10 nome ampli, 0x15 marca, 0x18 modello; 0x20 nome cabinet, 0x25 marca, 0x2A modello)
// e interruttori Amp On/Off (pagina 10, parametro 2) e Cabinet On/Off (pagina 12, parametro 2).
export const RIG_STACK = {
  strings: [
    { key: "ampName", parameter: 0x10, label: "Amp Name" },
    { key: "ampMaker", parameter: 0x15, label: "Amp Manufacturer" },
    { key: "ampModel", parameter: 0x18, label: "Amp Model" },
    { key: "cabName", parameter: 0x20, label: "Cabinet Name" },
    { key: "cabMaker", parameter: 0x25, label: "Cabinet Manufacturer" },
    { key: "cabModel", parameter: 0x2a, label: "Cabinet Model" },
  ],
  switches: [
    { key: "ampOn", page: 0x0a, parameter: 0x02, label: "Amp On/Off 10/2" },
    { key: "cabOn", page: 0x0c, parameter: 0x02, label: "Cabinet On/Off 12/2" },
  ],
};

export function buildStringRequest(page, parameter, label = `Read string ${page}/${parameter}`) {
  return { label, bytes: [...KEMPER_HEADER, 0x43, 0x00, page & 0x7f, parameter & 0x7f, 0xf7] };
}

export function buildRigStackRequests() {
  return [
    ...RIG_STACK.strings.map((item) => buildStringRequest(0x00, item.parameter, item.label)),
    ...RIG_STACK.switches.map((item) => buildParameterRequest(item.page, item.parameter, item.label)),
  ];
}

// Chiave del dato ampli/cabinet contenuto in un messaggio decodificato, oppure null.
export function rigStackField(decoded) {
  if (decoded?.type === "Kemper String" && decoded.page === 0x00) {
    const item = RIG_STACK.strings.find((entry) => entry.parameter === decoded.parameter);
    return item ? { key: item.key, value: decoded.text ?? "" } : null;
  }
  if (decoded?.type === "Kemper Parameter") {
    const item = RIG_STACK.switches.find((entry) => entry.page === decoded.page && entry.parameter === decoded.parameter);
    return item ? { key: item.key, value: decoded.value > 0, raw: decoded.value } : null;
  }
  return null;
}

// Testo da mostrare: il nome, altrimenti marca + modello.
// v1.46: il Player scrive "N/A" nei Rig senza cabinet (prova del 27/09/2026 con i Rig acustici): vale come vuoto.
function stackText(value) {
  const text = (value ?? "").trim();
  return /^n\/?a$/i.test(text) ? "" : text;
}

// v1.47: "N/A" in nome, marca e modello = nel Rig quel blocco NON C'È (profilo diretto/DI senza cabinet),
// diverso da un cabinet presente ma spento (nomi presenti, interruttore a 0).
export function rigStackMissing(values, prefix) {
  const parts = [values[`${prefix}Name`], values[`${prefix}Maker`], values[`${prefix}Model`]];
  return parts.some((part) => part !== undefined)
    && parts.every((part) => part === undefined || /^n\/?a$/i.test((part ?? "").trim()));
}

export function rigStackLabel(values, prefix) {
  const name = stackText(values[`${prefix}Name`]);
  if (name) return name;
  return [values[`${prefix}Maker`], values[`${prefix}Model`]].map(stackText).filter(Boolean).join(" ");
}

// ── Bank del Player (v1.48) ───────────────────────────────────────────────
// Level III: 125 Bank × 5 Rig = 625 Rig (FAQ Kemper). Indice Rig = (Bank−1)·5 + (Rig−1);
// Program Change = indice % 128 e Bank Select LSB (CC 32) = indice / 128 (forum Kemper: fino a Bank 26 Rig 3 il CC 32 vale 0).
export const PLAYER_MAX_BANKS = 125;

export function rigIndexToBankSlot(index) {
  if (!Number.isInteger(index) || index < 0 || index >= PLAYER_MAX_BANKS * 5) return null;
  return { bank: Math.floor(index / 5) + 1, slot: (index % 5) + 1 };
}

export function buildRigSelectMessages(bank, slot, channel = 1) {
  const index = (bank - 1) * 5 + (slot - 1);
  const ch = (Math.max(1, Math.min(16, channel)) - 1) & 0x0f;
  // Come fa il Player stesso: CC 0 = 0, CC 32 = gruppo di 128 Rig, poi il Program Change.
  return { index, program: index % 128, bankSelect: Math.floor(index / 128),
    messages: [[0xb0 | ch, 0, 0], [0xb0 | ch, 32, Math.floor(index / 128)], [0xc0 | ch, index % 128]] };
}

// Colori delle Bank sul Player (manuale del Player): Bank 1 blu, 2 giallo, 3 rosso, 4 verde, 5 viola, poi si ripete.
export const BANK_COLORS = [
  { key: "blue", label: "BLU" },
  { key: "yellow", label: "GIALLO" },
  { key: "red", label: "ROSSO" },
  { key: "green", label: "VERDE" },
  { key: "violet", label: "VIOLA" },
];

export function bankColor(bank) {
  if (!Number.isInteger(bank) || bank < 1) return null;
  return BANK_COLORS[(bank - 1) % 5];
}
