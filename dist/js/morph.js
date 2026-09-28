// Morph: comando dall'app, conferma dal Player, colori BASE/MORPH.

import { buildMorphLevelRequest, bytesToHex } from "../kemper-midi.js";
import { toast, ui } from "./dom.js";
import { session } from "./state.js";
import { describePort, profilerInputs, profilerOutputs, sendProfilerRequests } from "./connection.js";
import { confirmationPollAllowed } from "./sync.js";

export function refreshLiveMorphControls() {
  const enabled = session.sysex && profilerOutputs().length > 0 && profilerInputs().length > 0
    && session.morphPendingLevel === null;
  ui.liveMorphToggle.disabled = !enabled;
  ui.liveMorphSlider.disabled = !enabled;
  ui.liveMorphApply.disabled = !enabled;
  ui.liveMorphToggle.textContent = session.morphPendingLevel !== null
    ? "ATTENDO KEMPER"
    : session.morphConfirmedRaw === null ? "ALLINEA BASE"
      : session.morphConfirmedRaw > 0 ? "TORNA A BASE" : "ATTIVA MORPH";
  ui.liveMorphToggle.setAttribute("aria-pressed", String((session.morphConfirmedRaw ?? 0) > 0));
}

function renderMorph(level, sourceName) {
  const percent = Math.max(0, Math.min(100, Math.round(level)));
  const mode = percent === 0 ? "BASE" : percent === 100 ? "MORPH" : "PARZIALE";
  session.performanceState.morphLevel = percent;
  session.performanceState.morphMode = mode;
  session.performanceState.morphSource = sourceName;
  ui.liveMorph.dataset.active = String(percent > 0);
  // Colore Kemper: rosso in BASE, blu con Morph pieno, sfumato nei livelli intermedi.
  ui.liveMorph.style.setProperty("--morph", String(percent));
  ui.liveMorphMode.textContent = mode;
  ui.liveMorphPercent.textContent = `${percent}%`;
  ui.liveMorphFill.style.width = `${percent}%`;
  ui.liveMorphMeter.setAttribute("aria-valuenow", String(percent));
  if (!session.liveMorphDraft) {
    ui.liveMorphSlider.value = String(percent);
    ui.liveMorphTarget.textContent = `${percent}%`;
  }
  refreshLiveMorphControls();
}

function setMorphUnknown(message) {
  session.performanceState.morphLevel = null;
  session.performanceState.morphMode = "unknown";
  session.performanceState.morphSource = null;
  session.morphCommandLevel = null;
  session.morphPendingLevel = null;
  session.morphConfirmedRaw = null;
  session.morphConfirmedAt = null;
  session.liveMorphDraft = false;
  ui.liveMorph.dataset.active = "unknown";
  ui.liveMorphMode.textContent = "IN LETTURA";
  ui.liveMorphPercent.textContent = "—";
  ui.liveMorphFill.style.width = "0%";
  ui.liveMorphMeter.removeAttribute("aria-valuenow");
  ui.liveMorphSlider.value = "0";
  ui.liveMorphTarget.textContent = "0%";
  refreshLiveMorphControls();
}

function stopMorphConfirmation() {
  window.clearInterval(session.morphConfirmPollTimer);
  window.clearTimeout(session.morphConfirmTimeout);
  session.morphConfirmPollTimer = null;
  session.morphConfirmTimeout = null;
}

function resetMorphControl(rigName) {
  stopMorphConfirmation();
  session.morphControlRig = rigName;
  session.morphLastCommand = null;
  setMorphUnknown(`Premi Allinea BASE per sincronizzare l’app con ${rigName}. Poi usa questo pulsante per cambiare stato.`);
}

export function confirmMorphLevel(rawValue, sourceName) {
  const raw = Math.max(0, Math.min(16383, rawValue));
  const percent = raw / 16383 * 100;
  const pending = session.morphPendingLevel;
  const reachedTarget = pending === null
    || Math.abs(raw - Math.round(pending / 127 * 16383)) <= 129;

  session.morphConfirmedRaw = raw;
  session.morphConfirmedAt = new Date().toISOString();
  renderMorph(percent, sourceName);

  if (!reachedTarget) return;

  stopMorphConfirmation();
  session.morphPendingLevel = null;
  session.morphCommandLevel = Math.round(raw / 16383 * 127);
  const isMorph = raw > 0;
  refreshLiveMorphControls();
  if (pending !== null) toast(isMorph ? "MORPH confermato dal Kemper" : "BASE confermata dal Kemper");
}

export function handleMorphState(decoded, sourceName) {
  if (decoded?.type === "Kemper String" && decoded.page === 0x00 && decoded.parameter === 0x01) {
    if (decoded.text !== session.morphControlRig) resetMorphControl(decoded.text);
    return;
  }
  if (decoded?.type === "Kemper Parameter" && decoded.page === 0x00 && decoded.parameter === 0x0b) {
    confirmMorphLevel(decoded.value, sourceName);
  }
}

export function sendMorphCommand(value) {
  if (!Number.isInteger(value) || value < 0 || value > 127) return;
  const outputs = profilerOutputs();
  if (!outputs.length) {
    toast("Collega prima il Profiler");
    return;
  }
  stopMorphConfirmation();
  const channel = Math.max(1, Math.min(16, session.lastState?.channel ?? 1));
  const bytes = [0xb0 | (channel - 1), 11, value];
  const label = value === 0 ? "Morph BASE (CC11)" : value === 127
    ? "Morph MORPH (CC11)" : `Morph ${Math.round(value / 127 * 100)}% (CC11)`;
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
  session.morphCommandLevel = value;
  session.morphPendingLevel = value;
  session.liveMorphDraft = false;
  session.morphLastCommand = { time: new Date().toISOString(), channel, value };
  ui.liveMorphMode.textContent = "ATTENDO KEMPER";
  refreshLiveMorphControls();
  ui.copy.disabled = false;

  const morphStartedAt = performance.now();
  const requestConfirmation = () => {
    if (confirmationPollAllowed(morphStartedAt)) sendProfilerRequests([buildMorphLevelRequest()], { record: false });
  };
  window.setTimeout(requestConfirmation, 180);
  session.morphConfirmPollTimer = window.setInterval(requestConfirmation, 450);
  session.morphConfirmTimeout = window.setTimeout(() => {
    stopMorphConfirmation();
    session.morphPendingLevel = null;
    ui.liveMorphMode.textContent = "NON CONFERMATO";
    refreshLiveMorphControls();
    toast("Nessuna conferma dal Kemper");
  }, 3000);
}

export function toggleMorphFromApp() {
  const target = session.morphConfirmedRaw === null || session.morphConfirmedRaw > 0 ? 0 : 127;
  sendMorphCommand(target);
}
