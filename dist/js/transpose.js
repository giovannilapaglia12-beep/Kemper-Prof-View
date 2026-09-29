// v1.64: Transpose da −2 a +2 dal riquadro Transpose di PALCO (Fixed FX Transpose, non il Rig Transpose del menu).
// Prova "Leggi Transpose" sul Player (29/09/2026): i semitoni sono il parametro 4/4 (64 = 0) e l'On/Off 5/1 si accende
// quando il valore non è 0; cambiando Rig il Player torna al valore salvato nel Rig (vedi kemper-midi.js).
// Deciso con Giovanni (28/09/2026, docs/STATO.md): il valore scelto con un tocco resta anche cambiando Rig, finché
// non lo cambia lui (dall'app o dal Player); se il Player lo riporta al valore del Rig, l'app lo reimposta.
// Ogni comando aspetta la conferma del Player (lettura di 4/4 e 5/1).
// v1.65 (prova di Giovanni del 29/09/2026, diagnostica 09:55): il tocco sul riquadro torna ad accendere e spegnere
// (con l'ultimo valore scelto), la scelta −2…+2 si apre con il pulsante ±; dopo un cambio Rig il valore scelto viene
// rimandato subito, senza aspettare 1 s la lettura del nuovo Rig (si sentiva il Rig a 0 per circa un secondo).
// v1.66 (prova del 29/09/2026, diagnostica 13:39): anche con il comando partito 20 ms dopo il cambio Rig si sente il
// passaggio di tonalità, perché è il Player che carica il Rig con il suo Transpose. Deciso con Giovanni: cambiando Rig
// l'app NON rimanda più nulla; il valore resta in memoria e si riaccende con un tocco sul riquadro.

import {
  buildFixedFxStateRequests,
  buildTransposeCommands,
  buildTransposeValueRequest,
  FIXED_FX,
  TRANSPOSE_SEMITONES,
  transposeMatches,
  transposeRawToSemitones,
} from "../kemper-midi.js";
import { toast, ui } from "./dom.js";
import { signedSemitones } from "./text.js";
import { session } from "./state.js";
import { profilerOutputs, sendProfilerRequests } from "./connection.js";
import { confirmationPollAllowed } from "./sync.js";

const SWITCH = FIXED_FX.find((effect) => effect.key === "transpose");
const CONFIRM_POLL_MS = 400;
const CONFIRM_TIMEOUT_MS = 2800;
// Dopo un cambio Rig: lettura del Transpose del nuovo Rig (sola lettura). Il Player risponde subito (29/09/2026:
// nome del Rig 25 ms dopo il Program Change, valori letti in 5 ms).
const RIG_READ_DELAY_MS = 250;

session.transpose = {
  raw: null, // semitoni letti dal Player (4/4, 64 = 0)
  memory: null, // ultimo valore diverso da 0 (scelto o visto sul Player): lo riaccende il tocco sul riquadro
  pending: null, // comando in attesa di conferma: { semitones, reason, startedAt }
  lastRigIndex: null,
  pollTimer: null,
  timeout: null,
  readTimer: null,
  pollsSent: 0,
  repliesReceived: 0,
  lastCommands: [],
};

// Riquadro Transpose creato da fixed-fx.js (cercato al primo uso: i due moduli si importano a vicenda).
let tile = null;
function transposeTile() {
  if (!tile) {
    const button = ui.liveFixedFxGrid.querySelector(".live-fixed-fx-transpose");
    if (button) {
      tile = { button, value: button.querySelector(".live-transpose-value"), state: button.querySelector("span"),
        pick: ui.liveFixedFxGrid.querySelector(".live-transpose-pick") };
    }
  }
  return tile;
}

function switchRaw() {
  const current = session.fixedFxState.get(SWITCH.key);
  return current?.supported === true && (current.raw === 0 || current.raw === 1) ? current.raw : null;
}

function canControl() {
  return session.sysex && profilerOutputs().length > 0;
}

export function closeTransposePicker() {
  ui.liveTransposePicker.hidden = true;
  transposeTile()?.pick.setAttribute("aria-expanded", "false");
}

export function toggleTransposePicker() {
  if (!ui.liveTransposePicker.hidden) {
    closeTransposePicker();
    return;
  }
  const tile = transposeTile();
  if (!tile || tile.pick.disabled) return;
  ui.liveTransposePicker.hidden = false;
  tile.pick.setAttribute("aria-expanded", "true");
  paintTranspose();
}

// Valore mostrato: quello del Player se acceso; se spento, l'ultimo scelto (quello che riaccende il tocco).
function shownSemitones(semitones, on) {
  return on === 0 && session.transpose.memory !== null ? session.transpose.memory : semitones;
}

export function paintTranspose() {
  const tile = transposeTile();
  if (!tile) return;
  const t = session.transpose;
  const current = session.fixedFxState.get(SWITCH.key);
  const on = switchRaw();
  const semitones = transposeRawToSemitones(t.raw);
  const known = on !== null && semitones !== null;
  const pending = t.pending !== null;
  const disabled = !canControl() || !known || pending;
  const shown = known ? shownSemitones(semitones, on) : null;
  tile.button.dataset.active = on === null ? "unknown" : String(on > 0);
  tile.button.dataset.pending = String(pending);
  tile.button.disabled = disabled;
  tile.pick.disabled = disabled;
  tile.button.setAttribute("aria-pressed", String(on === 1));
  tile.value.textContent = shown === null ? "" : signedSemitones(shown);
  tile.state.textContent = pending
    ? "ATTENDO KEMPER"
    : current?.supported === false
      ? "NON DISPONIBILE"
      : known ? on ? "ON" : "OFF" : "IN LETTURA";
  tile.button.setAttribute("aria-label", pending
    ? "Transpose: in attesa del Kemper"
    : known
      ? `Transpose ${signedSemitones(shown)}, ${on ? "attivo: tocca per spegnere" : "spento: tocca per accendere"}`
      : "Transpose: stato non disponibile");
  for (const button of ui.liveTransposeChoices) {
    const choice = Number(button.dataset.transpose);
    const selected = known && transposeMatches(choice, t.raw, on);
    button.disabled = disabled;
    button.dataset.selected = String(selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  if (disabled) closeTransposePicker();
}

function stopTransposeConfirmation() {
  const t = session.transpose;
  window.clearInterval(t.pollTimer);
  window.clearTimeout(t.timeout);
  t.pollTimer = null;
  t.timeout = null;
  t.pending = null;
}

// Lettura dei semitoni (4/4) e, se serve, dell'On/Off 5/1.
export function requestTransposeState({ withSwitch = true, record = false } = {}) {
  if (!canControl()) return;
  const requests = [buildTransposeValueRequest()];
  if (withSwitch) {
    requests.push(...buildFixedFxStateRequests([SWITCH]));
    session.fixedFxPollsSent += 1;
  }
  session.transpose.pollsSent += 1;
  sendProfilerRequests(requests, { record });
}

function sendTranspose(semitones, reason) {
  const t = session.transpose;
  const from = switchRaw();
  const startedAt = performance.now();
  stopTransposeConfirmation();
  t.pending = { semitones, reason, startedAt };
  t.lastCommands.push({
    time: new Date().toISOString(),
    semitones,
    reason,
    fromSemitones: transposeRawToSemitones(t.raw),
    fromActive: from === null ? null : from > 0,
  });
  t.lastCommands = t.lastCommands.slice(-20);
  sendProfilerRequests(buildTransposeCommands(semitones, from));
  const poll = () => { if (confirmationPollAllowed(startedAt)) requestTransposeState(); };
  poll();
  t.pollTimer = window.setInterval(poll, CONFIRM_POLL_MS);
  t.timeout = window.setTimeout(() => {
    stopTransposeConfirmation();
    paintTranspose();
    toast(`Transpose ${signedSemitones(semitones)} non confermato dal Kemper`);
  }, CONFIRM_TIMEOUT_MS);
  ui.copy.disabled = false;
  paintTranspose();
}

// Tocco su −2 … +2.
export function chooseTranspose(semitones) {
  const t = session.transpose;
  closeTransposePicker();
  const on = switchRaw();
  if (!canControl() || t.pending !== null || t.raw === null || on === null) {
    toast("Prima sincronizza il Transpose");
    return;
  }
  if (transposeMatches(semitones, t.raw, on)) {
    paintTranspose();
    return;
  }
  sendTranspose(semitones, "tocco");
}

// Tocco sul riquadro: spegne se acceso, altrimenti riaccende con l'ultimo valore (se non ce n'è, apre la scelta).
export function toggleTranspose() {
  const t = session.transpose;
  const on = switchRaw();
  if (on === 1) {
    chooseTranspose(0);
    return;
  }
  const semitones = transposeRawToSemitones(t.raw);
  const value = t.memory ?? (semitones !== null && semitones !== 0 ? semitones : null);
  if (value === null) {
    toggleTransposePicker();
    return;
  }
  chooseTranspose(value);
}

// Cambio Rig (nome diverso o Program Change di un altro Rig): i valori letti non valgono più.
export function transposeRigChanged() {
  const t = session.transpose;
  stopTransposeConfirmation();
  closeTransposePicker();
  t.raw = null;
  const current = session.fixedFxState.get(SWITCH.key);
  if (current) session.fixedFxState.set(SWITCH.key, { ...current, raw: null });
  window.clearTimeout(t.readTimer);
  t.readTimer = window.setTimeout(() => {
    if (t.pending === null) requestTransposeState({ withSwitch: switchRaw() === null, record: true });
  }, RIG_READ_DELAY_MS);
  paintTranspose();
}

function checkTranspose() {
  const t = session.transpose;
  const on = switchRaw();
  if (t.raw === null || on === null) return;
  // Ultimo valore acceso (confermato dal Player o scelto sul Player): lo riaccende il tocco sul riquadro.
  if (on && t.raw !== TRANSPOSE_SEMITONES.center) t.memory = transposeRawToSemitones(t.raw);
  if (t.pending !== null) {
    if (!transposeMatches(t.pending.semitones, t.raw, on)) return;
    const { semitones } = t.pending;
    stopTransposeConfirmation();
    toast(`Transpose ${signedSemitones(semitones)} · confermato`);
  }
}

export function handleTransposeState(decoded) {
  const t = session.transpose;
  if (decoded?.type === "Program Change") {
    const index = decoded.rigIndex ?? decoded.program;
    // Il Player rimanda il Program Change del Rig in uso anche all'apertura del Tuner e dopo il beacon: non è un cambio.
    if (t.lastRigIndex !== null && index !== t.lastRigIndex) transposeRigChanged();
    t.lastRigIndex = index;
    return;
  }
  if (decoded?.type !== "Kemper Parameter") return;
  const isValue = decoded.page === TRANSPOSE_SEMITONES.page && decoded.parameter === TRANSPOSE_SEMITONES.parameter;
  const isSwitch = decoded.page === SWITCH.page && decoded.parameter === SWITCH.parameter;
  if (!isValue && !isSwitch) return;
  if (isValue) {
    t.raw = decoded.value;
    t.repliesReceived += 1;
  }
  checkTranspose();
  paintTranspose();
}

export function resetTransposeControl() {
  const t = session.transpose;
  stopTransposeConfirmation();
  window.clearTimeout(t.readTimer);
  t.raw = null;
  t.pollsSent = 0;
  t.repliesReceived = 0;
  t.lastCommands = [];
  paintTranspose();
}

export function transposeDiagnostics() {
  const t = session.transpose;
  const on = switchRaw();
  return {
    address: `semitoni ${TRANSPOSE_SEMITONES.page}/${TRANSPOSE_SEMITONES.parameter} (64 = 0), On/Off ${SWITCH.page}/${SWITCH.parameter}`,
    raw: t.raw,
    semitones: transposeRawToSemitones(t.raw),
    active: on === null ? null : on > 0,
    lastValue: t.memory,
    pending: t.pending,
    pollsSent: t.pollsSent,
    repliesReceived: t.repliesReceived,
    lastCommands: t.lastCommands,
  };
}
