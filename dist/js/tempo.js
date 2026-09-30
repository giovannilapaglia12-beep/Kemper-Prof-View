// Tempo (BPM): −1 / +1, BPM INTERO, TAP, conferme dal Player e battito sulla schermata.

import { buildTempoChangeRequest, buildTempoRequest, bytesToHex } from "../kemper-midi.js";
import { TEMPO_UNITS_PER_BPM } from "./config.js";
import { toast, ui } from "./dom.js";
import { session } from "./state.js";
import { describePort, profilerOutputs, sendProfilerRequests } from "./connection.js";
import { confirmationPollAllowed } from "./sync.js";

export function refreshTempoControls() {
  const hasOutput = profilerOutputs().length > 0;
  const hasTempo = Number.isInteger(session.lastState?.tempoRaw);
  const pending = session.tempoPendingRaw !== null;
  // v1.67: −1/+1 restano attivi anche mentre si aspetta la conferma (prova del 30/09/2026: bisognava aspettare
  // circa 1 s fra un tocco e l'altro). I tocchi si sommano al valore inviato; conta la conferma dell'ultimo.
  const stepDisabled = !session.sysex || !hasOutput || !hasTempo;
  ui.liveTempoDown.disabled = stepDisabled;
  ui.liveTempoUp.disabled = stepDisabled;
  ui.liveTempoRound.disabled = stepDisabled || pending;
  ui.liveTap.disabled = !hasOutput;
  // In attesa di conferma si vede il valore inviato (con TAP che scrive ATTENDO KEMPER).
  ui.liveBpm.textContent = pending
    ? (session.tempoPendingRaw / TEMPO_UNITS_PER_BPM).toFixed(1)
    : session.lastState?.bpm === null || session.lastState?.bpm === undefined
      ? "—"
      : session.lastState.bpm.toFixed(1);
  if (pending) {
    ui.liveTapState.textContent = "ATTENDO KEMPER";
  } else if (!hasOutput) {
    ui.liveTapState.textContent = "COLLEGA IL KEMPER";
  } else if (!hasTempo) {
    ui.liveTapState.textContent = "SINCRONIZZA";
  } else if (session.tempoTapPollTimer !== null) {
    ui.liveTapState.textContent = "ASCOLTO TEMPO";
  } else {
    ui.liveTapState.textContent = "PRONTO";
  }
}

export function stopTempoConfirmation() {
  window.clearInterval(session.tempoConfirmPollTimer);
  window.clearTimeout(session.tempoConfirmTimeout);
  session.tempoConfirmPollTimer = null;
  session.tempoConfirmTimeout = null;
  session.tempoPendingRaw = null;
  refreshTempoControls();
}

export function stopTempoTapPolling() {
  window.clearInterval(session.tempoTapPollTimer);
  window.clearTimeout(session.tempoTapPollTimeout);
  session.tempoTapPollTimer = null;
  session.tempoTapPollTimeout = null;
  refreshTempoControls();
}

function requestTempoConfirmation() {
  session.tempoPollsSent += 1;
  sendProfilerRequests([buildTempoRequest()], { record: false });
}

export function handleTempoState(decoded) {
  if (decoded?.type === "Kemper Parameter" && decoded.page === 0x04 && decoded.parameter === 0x00) {
    if (session.tempoConfirmPollTimer !== null || session.tempoTapPollTimer !== null) {
      session.tempoRepliesReceived += 1;
    }
    if (session.tempoPendingRaw !== null && decoded.value === session.tempoPendingRaw) {
      const command = session.tempoLastCommand;
      session.tempoConfirmedAt = new Date().toISOString();
      stopTempoConfirmation();
      toast(`${command?.confirmationLabel ?? "Tempo"} · confermato dal Kemper`);
    }
  }
  if (decoded?.type === "Kemper Rendered" && decoded.page === 0x04 && decoded.parameter === 0x00) {
    refreshTempoControls();
  }
}

export function pulseTempo() {
  ui.liveBpmBox.dataset.pulse = "true";
  clearTimeout(pulseTempo.timeout);
  pulseTempo.timeout = setTimeout(() => {
    delete ui.liveBpmBox.dataset.pulse;
  }, 130);
}

function setTempoRaw(targetRaw, command) {
  const outputs = profilerOutputs();
  const currentRaw = session.lastState?.tempoRaw;
  if (!outputs.length) {
    toast("Collega prima il Profiler");
    return;
  }
  if (!session.sysex || !Number.isInteger(currentRaw)) {
    toast("Sincronizza prima il tempo del Kemper");
    return;
  }

  stopTempoConfirmation();
  stopTempoTapPolling();
  const safeTargetRaw = Math.max(0, Math.min(0x3fff, targetRaw));
  const fullCommand = { time: new Date().toISOString(), fromRaw: currentRaw, targetRaw: safeTargetRaw, ...command };
  session.tempoPendingRaw = safeTargetRaw;
  session.tempoLastCommand = fullCommand;
  sendProfilerRequests([
    buildTempoChangeRequest(safeTargetRaw, fullCommand.transmitLabel),
  ]);
  refreshTempoControls();

  const tempoStartedAt = performance.now();
  const pollTempo = () => { if (confirmationPollAllowed(tempoStartedAt)) requestTempoConfirmation(); };
  window.setTimeout(pollTempo, 150);
  session.tempoConfirmPollTimer = window.setInterval(pollTempo, 400);
  session.tempoConfirmTimeout = window.setTimeout(() => {
    stopTempoConfirmation();
    toast("Il Kemper non ha confermato il nuovo tempo");
  }, 3000);
  ui.copy.disabled = false;
}

export function changeTempoBy(delta) {
  const currentRaw = session.lastState?.tempoRaw;
  if (!Number.isInteger(currentRaw)) {
    toast("Sincronizza prima il tempo del Kemper");
    return;
  }
  // Tocchi rapidi: si parte dal valore già inviato e non ancora confermato.
  const baseRaw = session.tempoPendingRaw ?? currentRaw;
  const direction = delta > 0 ? "+1" : "−1";
  setTempoRaw(baseRaw + delta * TEMPO_UNITS_PER_BPM, {
    action: "step",
    delta,
    transmitLabel: `Tempo ${direction} BPM`,
    confirmationLabel: `Tempo ${direction} BPM`,
  });
}

export function roundTempoToInteger() {
  const currentRaw = session.lastState?.tempoRaw;
  if (!Number.isInteger(currentRaw)) {
    toast("Sincronizza prima il tempo del Kemper");
    return;
  }
  const integerBpm = Math.round(currentRaw / TEMPO_UNITS_PER_BPM);
  const targetRaw = integerBpm * TEMPO_UNITS_PER_BPM;
  if (targetRaw === currentRaw) {
    toast(`Tempo già impostato a ${integerBpm}.0 BPM`);
    return;
  }
  setTempoRaw(targetRaw, {
    action: "round",
    roundedBpm: integerBpm,
    transmitLabel: `Tempo intero ${integerBpm} BPM`,
    confirmationLabel: `Tempo ${integerBpm}.0 BPM`,
  });
}

function startTempoTapPolling() {
  window.clearTimeout(session.tempoTapPollTimeout);
  if (session.tempoTapPollTimer === null) {
    session.tempoTapPollTimer = window.setInterval(requestTempoConfirmation, 350);
  }
  session.tempoTapPollTimeout = window.setTimeout(stopTempoTapPolling, 2600);
  window.setTimeout(requestTempoConfirmation, 140);
  refreshTempoControls();
}

export function tapTempo() {
  const outputs = profilerOutputs();
  if (!outputs.length) {
    toast("Collega prima il Profiler");
    return;
  }
  stopTempoConfirmation();
  const channel = Math.max(1, Math.min(16, session.lastState?.channel ?? 1));
  const bytes = [0xb0 | (channel - 1), 30, 0];
  const time = new Date().toISOString();
  for (const output of outputs) {
    output.send(bytes);
    session.transmitted.push({
      time,
      output: describePort(output),
      label: "TAP Tempo (CC30)",
      hex: bytesToHex(bytes),
    });
  }
  session.transmitted = session.transmitted.slice(-100);
  session.tempoLastTapCommand = { time, channel, controller: 30, value: 0 };
  startTempoTapPolling();
  pulseTempo();
  ui.copy.disabled = false;
}
