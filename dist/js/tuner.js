// Accordatore: apertura/chiusura, nota e intonazione, schermo intero.

import { buildTunerModeRequest, buildTunerStreamRequests, bytesToHex } from "../kemper-midi.js";
import { TUNER_STREAM_INTERVAL } from "./config.js";
import { setSwitchState, toast, ui } from "./dom.js";
import { median, midiNoteName } from "./text.js";
import { session } from "./state.js";
import { confirmMorphLevel } from "./morph.js";
import { describePort, profilerOutputs, sendProfilerRequests } from "./connection.js";
import { bidiTunerPushing } from "./bidi.js";
import { confirmationPollAllowed } from "./sync.js";

function renderTuner(active, sourceName) {
  session.performanceState.tunerActive = active;
  session.performanceState.tunerSource = sourceName;
  ui.liveTuner.dataset.active = String(active);
  ui.liveTuner.disabled = profilerOutputs().length === 0 || session.tunerPendingMode !== null;
  ui.liveTuner.setAttribute("aria-pressed", String(active));
  ui.liveTuner.setAttribute("aria-label", active ? "Chiudi accordatore" : "Apri accordatore");
  setSwitchState(ui.liveTunerState, session.tunerPendingMode !== null
    ? "ATTENDO KEMPER"
    : active ? "ON" : "OFF");
  if (!active) {
    ui.liveTunerNote.textContent = "APRI";
  }
  else if (active && !session.performanceState.tunerCandidateNote) {
    ui.liveTunerNote.textContent = "SUONA";
  }
  paintTunerOverlay();
}

export function paintTunerOverlay() {
  const state = session.performanceState;
  const open = state.tunerActive === true;
  const visible = open && document.body.dataset.view === "live";
  ui.tunerOverlay.hidden = !visible;
  document.body.dataset.tuner = String(visible);
  if (!visible) return;
  const zone = state.tunerCents === null ? "waiting" : state.tunerZone;
  ui.tunerOverlay.dataset.zone = zone;
  ui.tunerOverlayNote.textContent = state.tunerCandidateNote ?? "SUONA";
  const cents = state.tunerCents;
  ui.tunerOverlayNeedle.style.setProperty("--pos", String(cents === null ? 50 : Math.max(0, Math.min(100, cents + 50))));
  ui.tunerOverlayCents.textContent = cents === null
    ? "—"
    : zone === "in-tune" ? "CENTRATA" : `${cents > 0 ? "+" : ""}${cents} cent`;
  ui.tunerOverlayClose.disabled = profilerOutputs().length === 0 || session.tunerPendingMode !== null;
  ui.tunerOverlayClose.textContent = session.tunerPendingMode === "closed" ? "ATTENDO KEMPER" : "CHIUDI TUNER";
}

export function stopTunerConfirmation() {
  window.clearInterval(session.tunerConfirmPollTimer);
  window.clearTimeout(session.tunerConfirmTimeout);
  session.tunerConfirmPollTimer = null;
  session.tunerConfirmTimeout = null;
}

function confirmTunerCommand(mode) {
  if (session.tunerPendingMode !== mode) return;
  stopTunerConfirmation();
  session.tunerPendingMode = null;
  ui.liveTuner.disabled = profilerOutputs().length === 0;
  setSwitchState(ui.liveTunerState, mode === "open" ? "ON" : "OFF");
  paintTunerOverlay();
  toast(mode === "open" ? "Tuner aperto dal Kemper" : "Tuner chiuso dal Kemper");
}

export function stopTunerStreamPolling() {
  window.clearInterval(session.tunerStreamTimer);
  session.tunerStreamTimer = null;
}

function startTunerStreamPolling() {
  if (session.tunerStreamTimer !== null) return;
  session.tunerStreamStartedAt = performance.now();
  const poll = () => {
    if (session.bidi.state === "active") {
      const now = performance.now();
      // Il Player invia da solo nota e intonazione (124/15): non serve leggerle.
      if (bidiTunerPushing(now)) return;
      // Primo mezzo secondo: ascolta se arrivano da sole prima di iniziare le letture.
      if (now - session.tunerStreamStartedAt < 500) return;
    }
    sendProfilerRequests(buildTunerStreamRequests(), { record: false });
    session.tunerStreamPollsSent += 1;
  };
  poll();
  session.tunerStreamTimer = window.setInterval(poll, TUNER_STREAM_INTERVAL);
}

function renderTunerPitch(rawValue) {
  const note = session.performanceState.tunerCandidateRaw;
  if (session.performanceState.tunerMode !== "open" || note === null || session.tunerLiveNoteRaw !== note) return;

  const now = performance.now();
  session.tunerSignalWindow.push({ value: rawValue, time: now, note });
  session.tunerSignalWindow = session.tunerSignalWindow
    .filter((item) => now - item.time <= 420 && item.note === note)
    .slice(-9);
  if (session.tunerSignalWindow.length < 3) return;

  const smoothedRaw = median(session.tunerSignalWindow.map((item) => item.value));
  const cents = (smoothedRaw - 8192) / 81.92;
  const rounded = Math.round(cents * 10) / 10;
  // v1.39: isteresi, così lo schermo verde non lampeggia al limite: entra entro ±3 cent, esce oltre ±5.
  const wasInTune = session.performanceState.tunerZone === "in-tune";
  const zone = Math.abs(cents) <= 3 || (wasInTune && Math.abs(cents) <= 5) ? "in-tune" : cents < 0 ? "flat" : "sharp";

  session.performanceState.tunerSignalRaw = Math.round(smoothedRaw);
  session.performanceState.tunerCents = rounded;
  session.performanceState.tunerZone = zone;
  setSwitchState(ui.liveTunerState, zone === "in-tune"
    ? "CENTRATA"
    : `${rounded > 0 ? "+" : ""}${rounded} CENT`);
  paintTunerOverlay();
}

export function handlePerformanceControl(decoded, sourceName) {
  if (decoded?.type !== "Control Change") return;
  if (decoded.controller === 11) {
    const raw = Math.round(Math.max(0, Math.min(127, decoded.value)) / 127 * 16383);
    confirmMorphLevel(raw, sourceName);
  }
  if (decoded.controller === 31) {
    renderTuner(decoded.value > 0, sourceName);
  }
}

export function isTunerStream(decoded) {
  if (decoded?.type !== "Kemper Parameter") return false;
  return (decoded.page === 0x7c && (decoded.parameter === 0x51 || decoded.parameter === 0x0f))
    || (decoded.page === 0x7d && decoded.parameter === 0x54);
}

function updateNoteRecord(map, value) {
  const now = new Date().toISOString();
  const current = map.get(value) ?? {
    midiNote: value,
    note: midiNoteName(value),
    count: 0,
    firstSeenAt: now,
    lastSeenAt: now,
  };
  current.count += 1;
  current.lastSeenAt = now;
  map.set(value, current);
}

function processTunerNote(value) {
  if (session.performanceState.tunerMode !== "open") return;
  session.tunerLiveNoteRaw = value;
  updateNoteRecord(session.tunerRawNotes, value);
  ui.copy.disabled = false;

  const now = performance.now();
  session.tunerNoteWindow.push({ value, time: now });
  session.tunerNoteWindow = session.tunerNoteWindow
    .filter((item) => now - item.time <= 750 && item.value >= 35 && item.value <= 88)
    .slice(-12);

  if (session.tunerOpenedAt !== null && now - session.tunerOpenedAt < 350) return;

  const counts = new Map();
  for (const item of session.tunerNoteWindow) counts.set(item.value, (counts.get(item.value) ?? 0) + 1);
  const stable = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!stable || stable[1] < 4 || stable[1] / session.tunerNoteWindow.length < 0.65) return;

  const [stableValue] = stable;
  const stableName = midiNoteName(stableValue);
  if (stableValue !== session.performanceState.tunerCandidateRaw) {
    session.tunerSignalWindow = [];
    session.performanceState.tunerCents = null;
    session.performanceState.tunerZone = "waiting";
  }
  session.performanceState.tunerCandidateNote = stableName;
  session.performanceState.tunerCandidateRaw = stableValue;
  updateNoteRecord(session.tunerStableNotes, stableValue);
  ui.liveTunerNote.textContent = stableName;
  paintTunerOverlay();
}

function captureTunerSignal(decoded) {
  session.performanceState.tunerBackgroundSignal = {
    page: decoded.page,
    parameter: decoded.parameter,
    value: decoded.value,
  };

  if (session.performanceState.tunerMode !== "open") return;
  renderTunerPitch(decoded.value);

  const now = performance.now();
  if (now - session.lastTunerSignalSampleAt < 55) return;
  session.lastTunerSignalSampleAt = now;
  session.tunerSignalSamples.push({
    time: new Date().toISOString(),
    page: decoded.page,
    parameter: decoded.parameter,
    value: decoded.value,
    liveNoteRaw: session.tunerLiveNoteRaw,
    liveNote: session.tunerLiveNoteRaw === null ? null : midiNoteName(session.tunerLiveNoteRaw),
    stableNoteRaw: session.performanceState.tunerCandidateRaw,
    stableNote: session.performanceState.tunerCandidateNote,
  });
  session.tunerSignalSamples = session.tunerSignalSamples.slice(-600);
}

export function captureTunerMode(decoded, sourceName) {
  if (decoded?.type !== "Kemper Parameter" || decoded.page !== 0x7f || decoded.parameter !== 0x7e) return;
  const mode = decoded.value === 1 ? "open" : decoded.value === 3 ? "closed" : "unknown";
  confirmTunerCommand(mode);
  if (mode === "open") startTunerStreamPolling();
  else stopTunerStreamPolling();
  if (session.performanceState.tunerModeRaw === decoded.value) return;
  session.performanceState.tunerModeRaw = decoded.value;
  session.performanceState.tunerMode = mode;
  session.tunerModeTransitions.push({ time: new Date().toISOString(), value: decoded.value, mode });
  session.tunerModeTransitions = session.tunerModeTransitions.slice(-20);
  window.clearTimeout(session.tunerOffTimer);
  if (mode === "open") {
    session.tunerNoteWindow = [];
    session.tunerOpenedAt = performance.now();
    session.tunerLiveNoteRaw = null;
    session.tunerSignalWindow = [];
    session.performanceState.tunerCandidateNote = null;
    session.performanceState.tunerCandidateRaw = null;
    session.performanceState.tunerSignalRaw = null;
    session.performanceState.tunerCents = null;
    session.performanceState.tunerZone = "waiting";
    renderTuner(true, sourceName);
  } else if (mode === "closed") {
    session.tunerNoteWindow = [];
    session.tunerSignalWindow = [];
    session.tunerOpenedAt = null;
    session.tunerLiveNoteRaw = null;
    session.performanceState.tunerCandidateNote = null;
    session.performanceState.tunerCandidateRaw = null;
    session.performanceState.tunerSignalRaw = null;
    session.performanceState.tunerCents = null;
    session.performanceState.tunerZone = "waiting";
    renderTuner(false, sourceName);
  }
}

export function handleTunerStream(decoded, sourceName) {
  if (!isTunerStream(decoded)) return;
  session.tunerStreamRepliesReceived += 1;
  if (decoded.page === 0x7d && decoded.parameter === 0x54) {
    if (session.performanceState.tunerMode !== "open") return;
    processTunerNote(decoded.value);
  } else {
    captureTunerSignal(decoded);
  }
}

export function sendTunerCommand(open) {
  const outputs = profilerOutputs();
  if (!outputs.length) {
    toast("Collega prima il Profiler");
    return;
  }
  stopTunerConfirmation();
  const channel = Math.max(1, Math.min(16, session.lastState?.channel ?? 1));
  const value = open ? 1 : 0;
  const targetMode = open ? "open" : "closed";
  const bytes = [0xb0 | (channel - 1), 31, value];
  const label = open ? "Tuner ON (CC31)" : "Tuner OFF (CC31)";
  for (const output of outputs) {
    output.send(bytes);
    session.transmitted.push({
      time: new Date().toISOString(),
      output: describePort(output),
      label,
      hex: bytesToHex(bytes),
    });
  }
  session.transmitted = session.transmitted.slice(-100);
  session.tunerPendingMode = targetMode;
  session.tunerLastCommand = { time: new Date().toISOString(), channel, value, targetMode };
  ui.liveTuner.disabled = true;
  setSwitchState(ui.liveTunerState, "ATTENDO KEMPER");
  ui.copy.disabled = false;
  paintTunerOverlay();

  const tunerStartedAt = performance.now();
  const requestConfirmation = () => {
    if (confirmationPollAllowed(tunerStartedAt)) sendProfilerRequests([buildTunerModeRequest()], { record: false });
  };
  window.setTimeout(requestConfirmation, 180);
  session.tunerConfirmPollTimer = window.setInterval(requestConfirmation, 450);
  session.tunerConfirmTimeout = window.setTimeout(() => {
    stopTunerConfirmation();
    session.tunerPendingMode = null;
    ui.liveTuner.disabled = profilerOutputs().length === 0;
    setSwitchState(ui.liveTunerState, "NON CONFERMATO");
    paintTunerOverlay();
    toast("Nessuna conferma Tuner dal Kemper");
  }, 3000);
}

export function toggleTunerFromApp() {
  sendTunerCommand(session.performanceState.tunerMode !== "open");
}
