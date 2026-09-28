// Looper: comandi al Player (NRPN), stato stimato, aggancio al tempo, ½ SPEED e REVERSE ricordati,
// cerchio di avanzamento e posizione INGRESSO/USCITA.

import { buildParameterChangeRequest, buildParameterRequest, bytesToHex } from "../kemper-midi.js";
import { LOOPER_HALF_KEY, LOOPER_REVERSE_KEY, QUANTIZE_KEY, TEMPO_UNITS_PER_BPM } from "./config.js";
import { setTextIfChanged, toast, ui } from "./dom.js";
import { session } from "./state.js";
import { describePort, profilerOutputs, sendProfilerRequests } from "./connection.js";
import { confirmationPollAllowed } from "./sync.js";
import { cancelLooperErase } from "./looper-touch.js";

// Looper Location (globale, pagina 127 parametro 53): 0 = Input, 1 = Output (verificato 26/09/2026)
const LOOPER_LOCATION = { page: 0x7f, parameter: 53 };
session.looperLocation = null;
session.looperLocationPending = null;
session.looperLocationTimers = null;

export function paintLooperLocation() {
  const value = session.looperLocation;
  const pending = session.looperLocationPending;
  const canControl = session.sysex && profilerOutputs().length > 0;
  for (const button of ui.locationButtons) {
    const target = Number(button.dataset.looperLocation);
    button.setAttribute("aria-pressed", String(value === target));
    button.dataset.pending = String(pending === target);
    button.disabled = !canControl || pending !== null || value === null;
  }
  ui.locationNote.textContent = pending !== null
    ? "Attendo la conferma del Kemper…"
    : value === 1
      ? "USCITA: il loop registra il suono finito; gli effetti che cambi dopo non lo modificano."
      : value === 0
        ? "INGRESSO: il loop registra la chitarra pulita e passa ogni volta dagli effetti attuali."
        : canControl ? "Lettura dell’impostazione dal Kemper…" : "Collega il Kemper per leggere l’impostazione.";
}

export function requestLooperLocation() {
  if (!session.sysex || !profilerOutputs().length) return;
  sendProfilerRequests([buildParameterRequest(LOOPER_LOCATION.page, LOOPER_LOCATION.parameter, "Looper Location 127/53")], { record: false });
}

function stopLooperLocationConfirmation() {
  if (session.looperLocationTimers) {
    window.clearInterval(session.looperLocationTimers.interval);
    window.clearTimeout(session.looperLocationTimers.timeout);
  }
  session.looperLocationTimers = null;
  session.looperLocationPending = null;
  paintLooperLocation();
}

export function setLooperLocation(target) {
  if (session.looperLocationPending !== null || session.looperLocation === target) return;
  sendProfilerRequests([buildParameterChangeRequest(LOOPER_LOCATION.page, LOOPER_LOCATION.parameter, target,
    `Looper Location ${target ? "OUTPUT" : "INPUT"}`)]);
  session.looperLocationPending = target;
  paintLooperLocation();
  const startedAt = performance.now();
  const poll = () => { if (confirmationPollAllowed(startedAt)) requestLooperLocation(); };
  window.setTimeout(poll, 150);
  session.looperLocationTimers = {
    interval: window.setInterval(poll, 400),
    timeout: window.setTimeout(() => {
      stopLooperLocationConfirmation();
      toast("Posizione Looper non confermata dal Kemper");
    }, 2800),
  };
}

export function handleLooperLocation(decoded) {
  if (decoded?.type !== "Kemper Parameter" || decoded.page !== LOOPER_LOCATION.page || decoded.parameter !== LOOPER_LOCATION.parameter) return;
  if (decoded.value !== 0 && decoded.value !== 1) return;
  session.looperLocation = decoded.value;
  if (session.looperLocationPending === decoded.value) {
    stopLooperLocationConfirmation();
    toast(`Looper in ${decoded.value ? "USCITA" : "INGRESSO"} · confermato dal Kemper`);
  } else {
    paintLooperLocation();
  }
}

const LOOPER_SWITCHES = {
  record: { parameter: 88, label: "REC / PLAY / OVERDUB" },
  stop: { parameter: 89, label: "STOP" },
  trigger: { parameter: 90, label: "TRIGGER" },
  reverse: { parameter: 91, label: "REVERSE" },
  half: { parameter: 92, label: "½ SPEED" },
  undo: { parameter: 93, label: "UNDO / REDO" },
  erase: { parameter: 94, label: "CANCELLA LOOP" },
};
export const looperSwitchReleases = new Set();
export const LOOPER_LABELS = {
  empty: "LOOP VUOTO",
  recording: "REGISTRAZIONE",
  playing: "RIPRODUZIONE",
  overdub: "OVERDUB",
  stopped: "FERMO",
};
export const looper = { state: "empty", since: 0, loopLength: null, stopPresses: 0, reverse: false, half: false, timer: null,
  // v1.41: posizione stimata nel giro (0…1) per il cerchio di avanzamento.
  recordedHalf: false, phaseAt: 0, phaseTime: 0, phaseRate: 0, ringTimer: null };
try { looper.half = localStorage.getItem(LOOPER_HALF_KEY) === "1"; } catch { /* facoltativo */ }
// v1.42: anche REVERSE resta attivo sul Player dopo la cancellazione (prova del 26/09/2026): lo si ricorda.
try { looper.reverse = localStorage.getItem(LOOPER_REVERSE_KEY) === "1"; } catch { /* facoltativo */ }
const QUANTIZE_MODES = {
  off: { label: "OFF", beats: 0 },
  beat: { label: "MOVIMENTO", beats: 1 },
  bar4: { label: "BATTUTA 4/4", beats: 4 },
  bar3: { label: "BATTUTA 3/4", beats: 3 },
};
looper.quantize = "off";
looper.pendingClose = null;
try {
  const stored = localStorage.getItem(QUANTIZE_KEY);
  if (stored in QUANTIZE_MODES) looper.quantize = stored;
} catch { /* facoltativo */ }

function currentBpm() {
  const raw = session.lastState?.tempoRaw;
  return Number.isInteger(raw) && raw > 0 ? raw / TEMPO_UNITS_PER_BPM : null;
}

function beatsPerBar() {
  return looper.quantize === "bar3" ? 3 : 4;
}

export function setQuantizeMode(mode) {
  if (!(mode in QUANTIZE_MODES)) return;
  looper.quantize = mode;
  try { localStorage.setItem(QUANTIZE_KEY, mode); } catch { /* facoltativo */ }
  paintLooperState();
}

// Chiusura del primo giro agganciata al tempo: il Player non quantizza,
// quindi l'app ritarda il comando REC fino alla fine della battuta/movimento in corso.
function planQuantizedClose() {
  const mode = QUANTIZE_MODES[looper.quantize];
  const bpm = currentBpm();
  if (!mode.beats || looper.state !== "recording" || !bpm) return null;
  const beatMs = 60000 / bpm;
  const gridMs = beatMs * mode.beats;
  const elapsed = performance.now() - looper.since;
  // Tocco in ritardo fino a mezzo movimento (max 250 ms): chiudi subito invece di aggiungere un giro.
  const lateTolerance = Math.min(beatMs * 0.5, 250);
  const units = Math.max(1, Math.ceil((elapsed - lateTolerance) / gridMs));
  const target = units * gridMs;
  return { wait: target - elapsed, target, units, gridMs, beatMs };
}

function closeLoopNow() {
  if (looper.pendingClose) {
    window.clearTimeout(looper.pendingClose.timer);
    looper.pendingClose = null;
  }
  if (!sendLooperSwitch("record", true)) return;
  window.setTimeout(() => sendLooperSwitch("record", false), 60);
}

// Restituisce true se il tocco su REC è stato gestito dall'aggancio al tempo.
export function handleQuantizedRecord() {
  if (looper.pendingClose) {
    // Secondo tocco durante l'attesa: chiudi subito.
    closeLoopNow();
    return true;
  }
  const plan = planQuantizedClose();
  if (!plan) return false;
  if (plan.wait <= 0) {
    closeLoopNow();
    ui.looperStatus.textContent = `Chiuso in ritardo di ${Math.round(-plan.wait)} ms · loop ${(plan.target / 1000).toFixed(2)} s`;
    return true;
  }
  looper.pendingClose = {
    at: performance.now() + plan.wait,
    target: plan.target,
    timer: window.setTimeout(() => {
      looper.pendingClose = null;
      closeLoopNow();
      ui.looperStatus.textContent = `Loop agganciato al tempo · ${(plan.target / 1000).toFixed(2)} s`;
    }, plan.wait),
  };
  navigator.vibrate?.(15);
  paintLooperState();
  return true;
}

export function setLooperReverse(value) {
  looper.reverse = value;
  try { localStorage.setItem(LOOPER_REVERSE_KEY, value ? "1" : "0"); } catch { /* facoltativo */ }
  rebaseLooperPhase();
  paintLooperState();
}

export function setLooperHalf(value) {
  looper.half = value;
  try { localStorage.setItem(LOOPER_HALF_KEY, value ? "1" : "0"); } catch { /* facoltativo */ }
  paintLooperState();
}

// ── Cerchio di avanzamento del Looper (v1.41) ─────────────────────────────
// Stima: il giro parte quando si chiude la registrazione (o dopo STOP → PLAY / TRIGGER),
// REVERSE lo fa girare all'indietro, ½ SPEED rispetto alla registrazione lo rallenta o lo accelera.
function looperRate() {
  if (!looper.loopLength || (looper.state !== "playing" && looper.state !== "overdub")) return 0;
  const speed = looper.half === looper.recordedHalf ? 1 : looper.half ? 0.5 : 2;
  return (looper.reverse ? -1 : 1) * speed / (looper.loopLength * 1000);
}

function looperPhase(now = performance.now()) {
  const phase = looper.phaseAt + (now - looper.phaseTime) * looper.phaseRate;
  return ((phase % 1) + 1) % 1;
}

function rebaseLooperPhase({ restart = false } = {}) {
  const now = performance.now();
  looper.phaseAt = restart ? (looper.reverse ? 1 : 0) : looperPhase(now);
  looper.phaseTime = now;
  looper.phaseRate = looperRate();
  window.clearInterval(looper.ringTimer);
  looper.ringTimer = looper.phaseRate ? window.setInterval(paintLooperRing, 80) : null;
  paintLooperRing();
}

function paintLooperRing() {
  if (document.visibilityState !== "visible" && looper.ringTimer !== null) return;
  const show = looper.loopLength !== null && looper.state !== "empty" && looper.state !== "recording";
  const phase = show ? looperPhase() : 0;
  for (const node of [ui.looperState, ui.stageLooper]) {
    node.dataset.ring = String(show);
    node.style.setProperty("--p", phase.toFixed(4));
  }
}

export function setLooperState(next) {
  const now = performance.now();
  const previous = looper.state;
  if (previous === "empty" && next === "recording") looper.recordedHalf = looper.half;
  if (looper.state === "recording" && next !== "recording") looper.loopLength = (now - looper.since) / 1000;
  // ½ SPEED resta attivo sul Player anche dopo la cancellazione (prova del 25/09/2026)
  // e anche REVERSE (prova del 26/09/2026): nessuno dei due si azzera con la cancellazione.
  if (next === "empty") looper.loopLength = null;
  if (next !== looper.state) looper.since = now;
  looper.state = next;
  window.clearInterval(looper.timer);
  // v1.43: durante la registrazione il timer aggiorna solo contatore e battito (non tutta la scheda).
  looper.timer = next === "recording" ? window.setInterval(paintLooperClock, 50) : null;
  if (next !== "recording" && looper.pendingClose) {
    window.clearTimeout(looper.pendingClose.timer);
    looper.pendingClose = null;
  }
  // Il giro riparte da capo quando si chiude la registrazione o si riparte da FERMO.
  rebaseLooperPhase({ restart: next === "playing" && (previous === "recording" || previous === "stopped") });
  paintLooperState();
}

function paintLooperClock() {
  if (looper.state !== "recording") { paintLooperState(); return; }
  if (document.visibilityState !== "visible") return;
  const mode = QUANTIZE_MODES[looper.quantize];
  const bpm = currentBpm();
  const elapsed = performance.now() - looper.since;
  let time = `${(elapsed / 1000).toFixed(1)} s`;
  let beatLabel = "";
  let beatState = "none";
  if (mode.beats && bpm) {
    const beatMs = 60000 / bpm;
    const beatIndex = Math.floor(elapsed / beatMs);
    const perBar = beatsPerBar();
    const beat = (beatIndex % perBar) + 1;
    beatLabel = `BATTUTA ${Math.floor(beatIndex / perBar) + 1} · ${beat}/${perBar}`;
    time = beatLabel;
    beatState = elapsed - beatIndex * beatMs < 140 ? (beat === 1 ? "down" : "on") : "off";
  }
  if (looper.pendingClose) time = `CHIUDO TRA ${(Math.max(0, looper.pendingClose.at - performance.now()) / 1000).toFixed(1)} s`;
  if (ui.looperState.dataset.beat !== beatState) ui.looperState.dataset.beat = beatState;
  setTextIfChanged(ui.looperStateTime, time);
  setTextIfChanged(ui.looperStateLabel, looper.pendingClose ? "CHIUSURA A TEMPO" : LOOPER_LABELS.recording);
  setTextIfChanged(ui.stageLooper, looper.pendingClose ? "● CHIUDO…"
    : beatLabel ? `● REC ${beatLabel.replace("BATTUTA ", "").replace(" · ", ".")}` : `● REC ${Math.floor(elapsed / 1000)}s`);
}

export function paintLooperState() {
  const { state } = looper;
  const seconds = state === "recording"
    ? (performance.now() - looper.since) / 1000
    : looper.loopLength;
  const mode = QUANTIZE_MODES[looper.quantize];
  const bpm = currentBpm();
  let time = seconds === null ? "" : `${state === "recording" ? "" : "LOOP "}${seconds.toFixed(1)} s`;
  let beatLabel = "";
  ui.looperState.dataset.beat = "none";
  if (state === "recording" && mode.beats && bpm) {
    const beatMs = 60000 / bpm;
    const elapsed = performance.now() - looper.since;
    const beatIndex = Math.floor(elapsed / beatMs);
    const perBar = beatsPerBar();
    const bar = Math.floor(beatIndex / perBar) + 1;
    const beat = (beatIndex % perBar) + 1;
    beatLabel = `BATTUTA ${bar} · ${beat}/${perBar}`;
    time = beatLabel;
    const inBeat = elapsed - beatIndex * beatMs;
    ui.looperState.dataset.beat = inBeat < 140 ? (beat === 1 ? "down" : "on") : "off";
  }
  if (looper.pendingClose) {
    const left = Math.max(0, looper.pendingClose.at - performance.now()) / 1000;
    time = `CHIUDO TRA ${left.toFixed(1)} s`;
  }
  for (const button of ui.quantizeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.quantize === looper.quantize));
  }
  ui.quantizeNote.textContent = !mode.beats
    ? "Il loop si chiude nel momento esatto in cui tocchi REC."
    : bpm
      ? `${bpm.toFixed(1)} BPM · ${mode.beats === 1 ? "1 movimento" : "1 battuta"} = ${(60 / bpm * mode.beats).toFixed(2)} s. Per chiudere tocca REC durante l’ultimo ${mode.beats === 1 ? "movimento" : "movimento della battuta"}: l’app aspetta la fine esatta. Un secondo tocco chiude subito.`
      : "BPM non ancora letto dal Player: il loop si chiuderà senza aggancio.";
  const flags = [looper.reverse ? "REVERSE" : "", looper.half ? "½ SPEED" : ""].filter(Boolean).join(" · ");
  ui.looperReverse.dataset.active = String(looper.reverse);
  ui.looperReverseLabel.textContent = `REVERSE: ${looper.reverse ? "ON" : "OFF"}`;
  ui.looperReverseNote.textContent = looper.reverse
    ? "Il loop suona al contrario. REVERSE resta attivo sul Player anche dopo aver cancellato il loop: tocca REVERSE per tornare normale."
    : "";
  ui.looperHalf.dataset.active = String(looper.half);
  ui.looperHalfLabel.textContent = `½ SPEED: ${looper.half ? "ON" : "OFF"}`;
  ui.looperHalfNote.textContent = looper.half
    ? state === "empty" || state === "recording"
      ? "La registrazione avviene a metà velocità: spegnendo ½ SPEED il loop suonerà al doppio."
      : "Toccando ½ SPEED il loop torna alla velocità di registrazione."
    : "";
  ui.looperState.dataset.state = state;
  ui.looperStateLabel.textContent = looper.pendingClose ? "CHIUSURA A TEMPO" : LOOPER_LABELS[state];
  ui.looperStateTime.textContent = time;
  ui.looperStateFlags.textContent = flags;
  ui.stageLooper.hidden = state === "empty";
  ui.stageLooper.dataset.state = state;
  ui.stageLooper.textContent = state === "recording"
    ? looper.pendingClose ? "● CHIUDO…" : beatLabel ? `● REC ${beatLabel.replace("BATTUTA ", "").replace(" · ", ".")}` : `● REC ${Math.floor(seconds)}s`
    : { playing: "▶ LOOP", overdub: "● DUB", stopped: "■ LOOP" }[state] ?? "LOOP";
}

function trackLooperPress(key) {
  if (key !== "stop") looper.stopPresses = 0;
  switch (key) {
    case "record":
      setLooperState({ empty: "recording", recording: "playing", playing: "overdub", overdub: "playing", stopped: "playing" }[looper.state]);
      break;
    case "stop":
      // v1.42: tolta la regola "tre STOP = loop cancellato" (non vera sul Player, prova del 26/09/2026).
      // Il loop si cancella tenendo premuto STOP: lo fa il pulsante CANCELLA LOOP.
      if (looper.state !== "empty") setLooperState("stopped");
      break;
    case "undo":
      if (looper.state === "overdub") setLooperState("playing");
      break;
    case "reverse":
      // Il Player cambia REVERSE anche a loop vuoto: l'app lo segue sempre.
      setLooperReverse(!looper.reverse);
      break;
    case "half":
      setLooperHalf(!looper.half);
      rebaseLooperPhase();
      break;
    case "trigger":
      // TRIGGER fa ripartire dall'inizio il loop che sta suonando. Da FERMO il Player suona solo
      // finché è tenuto premuto: l'app lì invia PLAY (vedi looperSendKey), quindi lo stato non cambia.
      if (looper.loopLength !== null && (looper.state === "playing" || looper.state === "overdub")) {
        rebaseLooperPhase({ restart: true });
      }
      break;
    case "erase":
      setLooperState("empty");
      break;
    default:
      break;
  }
}
// v1.44: con il loop FERMO il Player fa suonare TRIGGER solo finché è tenuto premuto
// (prova del 26/09/2026: tocchi di 80 ms, nessun suono). Da FERMO l'app invia quindi PLAY,
// che fa ripartire il loop dall'inizio con un solo tocco; mentre suona TRIGGER resta TRIGGER.
export function looperSendKey(key) {
  if (key === "trigger" && looper.state === "stopped" && looper.loopLength !== null) return "record";
  return key;
}

export function refreshLooperControls() {
  const connected = profilerOutputs().length > 0;
  for (const button of [...ui.looperButtons, ui.looperErase]) button.disabled = !connected;
  if (!connected) ui.looperStatus.textContent = "Player scollegato · comandi Looper disattivati";
  else if (ui.looperStatus.textContent.startsWith("Player scollegato")
    || ui.looperStatus.textContent.startsWith("Collega il Kemper")) {
    ui.looperStatus.textContent = "Player collegato · comandi pronti";
  }
}

export function sendLooperSwitch(key, pressed, via = key) {
  const command = LOOPER_SWITCHES[key];
  // v1.52: nella diagnostica si vede il pulsante toccato e il comando inviato (es. "TRIGGER → PLAY").
  const shownLabel = via === "trigger" && key === "record" ? "TRIGGER → PLAY (loop fermo)"
    : via !== key && LOOPER_SWITCHES[via] ? `${LOOPER_SWITCHES[via].label} → ${command?.label}` : command?.label;
  const outputs = profilerOutputs();
  if (!command || !outputs.length) return false;
  const channel = Math.max(1, Math.min(16, session.lastState?.channel ?? 1));
  const status = 0xb0 | (channel - 1);
  // NRPN page 125: address, data MSB and press/release value on data LSB.
  const messages = [[status, 99, 125], [status, 98, command.parameter],
    [status, 6, 0], [status, 38, pressed ? 1 : 0]];
  const time = new Date().toISOString();
  for (const output of outputs) {
    for (const bytes of messages) {
      output.send(bytes);
      session.transmitted.push({ time, output: describePort(output),
        label: `Looper ${shownLabel} ${pressed ? "PRESS" : "RELEASE"}`, hex: bytesToHex(bytes) });
    }
  }
  session.transmitted = session.transmitted.slice(-100);
  if (pressed) {
    trackLooperPress(key);
    session.looperLastCommands.push({ time, key, ...(via !== key ? { button: via } : {}), parameter: command.parameter, channel, estimatedState: looper.state });
    session.looperLastCommands = session.looperLastCommands.slice(-20);
    ui.looperStatus.textContent = `${shownLabel} · comando inviato`;
    ui.copy.disabled = false;
  }
  return true;
}

export function releaseAllLooperSwitches() {
  for (const release of [...looperSwitchReleases]) release();
  cancelLooperErase();
}
