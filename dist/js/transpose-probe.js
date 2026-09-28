// v1.61: prova "Leggi Transpose" (sola lettura, ALTRO). Serve a trovare l'indirizzo MIDI dei semitoni
// del Fixed FX Transpose, che Kemper non ha pubblicato (è noto solo l'On/Off: pagina 5, parametro 1).
// Ogni lettura prende tutta la pagina 5 (Fixed FX) con la lettura multipla 0x42 (se il Player non risponde:
// letture singole 0…63) e il Rig Transpose 4/4 (documentato: 28–100). Confrontando due letture
// (Transpose a 0, poi a +2 sul Player) si vede quale parametro cambia; per i valori cambiati l'app chiede
// al Player il testo mostrato (0x7c), per esempio "+2". Non invia nessun comando.

import {
  buildMultiParameterRequest,
  buildParameterRequest,
  buildRenderedValueRequest,
} from "../kemper-midi.js";
import { toast, ui } from "./dom.js";
import { session } from "./state.js";
import { profilerOutputs, sendProfilerRequests } from "./connection.js";

const FIXED_FX_PAGE = 0x05;
const RIG_TRANSPOSE = { page: 0x04, parameter: 0x04 };
const SINGLE_READ_COUNT = 64;
const MULTI_WAIT_MS = 1200;
const FINISH_MS = 2600;
const RENDER_WAIT_MS = 800;
const MAX_READINGS = 12;
const MAX_RENDERED = 8;

session.transposeProbe = { readings: [], pending: null };

// Valori della pagina 5 di una lettura, come { parametro: valore }.
export function probeValues(reading) {
  if (reading.multi) {
    const values = {};
    reading.multi.values.forEach((value, index) => { values[reading.multi.first + index] = value; });
    return values;
  }
  return { ...reading.single };
}

// Parametri con valore diverso fra due letture (solo quelli presenti in entrambe).
export function changedParameters(before, after) {
  const a = probeValues(before);
  const b = probeValues(after);
  return Object.keys(b)
    .map(Number)
    .filter((parameter) => parameter in a && a[parameter] !== b[parameter])
    .sort((x, y) => x - y)
    .map((parameter) => ({ parameter, from: a[parameter], to: b[parameter] }));
}

export function captureTransposeProbe(decoded) {
  const reading = session.transposeProbe.pending;
  if (!reading || !decoded) return;
  if (decoded.type === "Kemper Multi Parameter" && decoded.page === FIXED_FX_PAGE) {
    reading.multi = { first: decoded.first, values: decoded.values, hex: decoded.hex };
  } else if (decoded.type === "Kemper Parameter" && decoded.page === FIXED_FX_PAGE && reading.singleRequested) {
    reading.single[decoded.parameter] = decoded.value;
  } else if (decoded.type === "Kemper Parameter"
    && decoded.page === RIG_TRANSPOSE.page && decoded.parameter === RIG_TRANSPOSE.parameter) {
    reading.rigTranspose = decoded.value;
  } else if (decoded.type === "Kemper Rendered" && decoded.page === FIXED_FX_PAGE) {
    reading.rendered[`${decoded.parameter}:${decoded.value}`] = decoded.rendered;
  }
}

function describeChange(reading, change) {
  const text = (value) => reading.rendered[`${change.parameter}:${value}`];
  const from = text(change.from) ? `${change.from} («${text(change.from)}»)` : String(change.from);
  const to = text(change.to) ? `${change.to} («${text(change.to)}»)` : String(change.to);
  return `5/${change.parameter}: ${from} → ${to}`;
}

function paintResult(reading, previous) {
  const head = `Lettura ${reading.n} · ${reading.rigName ?? "Rig ?"} · Transpose ${reading.fixedTransposeOn === null ? "?" : reading.fixedTransposeOn ? "ON" : "OFF"}`;
  const count = Object.keys(probeValues(reading)).length;
  if (!count) {
    ui.transposeProbeResult.textContent = `${head} · il Player non ha risposto alla lettura della pagina 5.`;
    return;
  }
  const source = reading.multi ? "lettura multipla" : "letture singole";
  const rig = reading.rigTranspose === null ? "Rig Transpose: nessuna risposta" : `Rig Transpose 4/4 = ${reading.rigTranspose}`;
  if (!previous) {
    ui.transposeProbeResult.textContent = `${head} · ${count} valori salvati (${source}) · ${rig}. Ora cambia il Transpose sul Player e tocca di nuovo.`;
    return;
  }
  const rigChange = previous.rigTranspose !== null && reading.rigTranspose !== null && previous.rigTranspose !== reading.rigTranspose
    ? ` · Rig Transpose 4/4: ${previous.rigTranspose} → ${reading.rigTranspose}`
    : "";
  ui.transposeProbeResult.textContent = reading.changes.length
    ? `${head} · cambiati rispetto alla lettura ${previous.n}: ${reading.changes.map((change) => describeChange(reading, change)).join(" · ")}${rigChange}`
    : `${head} · nessun valore della pagina 5 è cambiato rispetto alla lettura ${previous.n}${rigChange}.`;
}

function finishReading(reading) {
  const probe = session.transposeProbe;
  const previous = probe.readings.at(-1) ?? null;
  reading.changes = previous ? changedParameters(previous, reading) : [];
  const toRender = reading.changes.slice(0, MAX_RENDERED)
    .flatMap((change) => [change.from, change.to].map((value) => buildRenderedValueRequest(FIXED_FX_PAGE, change.parameter, value)));
  const done = () => {
    probe.pending = null;
    delete reading.singleRequested;
    probe.readings = [...probe.readings, reading].slice(-MAX_READINGS);
    paintResult(reading, previous);
    ui.transposeProbe.disabled = false;
    ui.copy.disabled = false;
  };
  if (!toRender.length) { done(); return; }
  sendProfilerRequests(toRender, { record: false });
  window.setTimeout(done, RENDER_WAIT_MS);
}

export function startTransposeProbe() {
  const probe = session.transposeProbe;
  if (probe.pending) return;
  if (!session.sysex || !profilerOutputs().length) {
    toast("Collega prima il Player");
    return;
  }
  const fixed = session.fixedFxState.get("transpose");
  const reading = {
    n: (probe.readings.at(-1)?.n ?? 0) + 1,
    at: new Date().toISOString(),
    rigName: session.lastState?.rigName ?? null,
    bank: session.rigSelectedBank,
    slot: session.rigSelectedSlot,
    fixedTransposeOn: fixed?.raw === null || fixed?.raw === undefined ? null : fixed.raw > 0,
    multi: null,
    single: {},
    singleRequested: false,
    rigTranspose: null,
    rendered: {},
  };
  probe.pending = reading;
  ui.transposeProbe.disabled = true;
  ui.transposeProbeResult.textContent = `Lettura ${reading.n} in corso…`;
  sendProfilerRequests([
    buildMultiParameterRequest(FIXED_FX_PAGE, "Transpose probe · pagina 5"),
    buildParameterRequest(RIG_TRANSPOSE.page, RIG_TRANSPOSE.parameter, "Transpose probe · Rig Transpose 4/4"),
  ]);
  window.setTimeout(() => {
    if (reading.multi) return;
    reading.singleRequested = true;
    sendProfilerRequests(Array.from({ length: SINGLE_READ_COUNT },
      (_, parameter) => buildParameterRequest(FIXED_FX_PAGE, parameter, `Transpose probe 5/${parameter}`)), { record: false });
  }, MULTI_WAIT_MS);
  window.setTimeout(() => finishReading(reading), FINISH_MS);
}
