// Fixed FX (Pure Booster, Vintage Chorus, Transpose, Double Tracker) e Freeze del riverbero.

import {
  buildFixedFxChangeRequest,
  buildFixedFxStateRequests,
  buildRevHoldChangeRequest,
  buildRevHoldRequest,
  FIXED_FX,
  FREEZE_REV_HOLD,
} from "../kemper-midi.js";
import { setSwitchState, toast, ui } from "./dom.js";
import { session } from "./state.js";
import { liveEffectNodes } from "./effects.js";
import { profilerOutputs, sendProfilerRequests } from "./connection.js";
import { confirmationPollAllowed } from "./sync.js";
import { paintTranspose, toggleTranspose, toggleTransposePicker } from "./transpose.js";

const liveFixedFxNodes = new Map();
for (const effect of FIXED_FX) {
  const liveButton = document.createElement("button");
  const liveName = document.createElement("strong");
  const liveState = document.createElement("span");
  liveButton.type = "button";
  liveButton.className = `live-fixed-fx-button live-fixed-fx-${effect.key}`;
  liveButton.dataset.active = "unknown";
  liveButton.dataset.pending = "false";
  liveButton.disabled = true;
  liveName.textContent = effect.label;
  liveState.textContent = "IN LETTURA";
  liveButton.setAttribute("aria-label", `${effect.label}: stato non disponibile`);
  liveButton.append(liveName, liveState);
  liveFixedFxNodes.set(effect.key, { button: liveButton, state: liveState });
  if (effect.key === "transpose") {
    // v1.65: il tocco accende e spegne (con l'ultimo valore scelto); il pulsante ± apre la scelta da −2 a +2 (transpose.js).
    const liveValue = document.createElement("b");
    const cell = document.createElement("div");
    const pick = document.createElement("button");
    liveValue.className = "live-transpose-value";
    liveName.textContent = "Transp."; // v1.68: nome breve, il pulsante ± occupa tutta l'altezza a destra
    liveButton.prepend(liveValue); // v1.68: valore grande in alto, nome in basso
    cell.className = "live-transpose-cell";
    pick.type = "button";
    pick.className = "live-transpose-pick";
    pick.textContent = "±";
    pick.disabled = true;
    pick.setAttribute("aria-label", "Scegli il Transpose da −2 a +2");
    pick.setAttribute("aria-haspopup", "true");
    pick.setAttribute("aria-expanded", "false");
    liveButton.addEventListener("click", () => toggleTranspose());
    pick.addEventListener("click", () => toggleTransposePicker());
    cell.append(liveButton, pick);
    ui.liveFixedFxGrid.append(cell);
  } else {
    liveButton.addEventListener("click", () => toggleFixedFx(effect));
    ui.liveFixedFxGrid.append(liveButton);
  }
}

export function refreshFreezeControls() {
  const hasOutput = profilerOutputs().length > 0;
  const canControl = hasOutput && session.sysex;
  const pending = session.freezeRevPending !== null;
  const known = session.freezeRevSupported === true
    && (session.freezeRevRaw === 0 || session.freezeRevRaw === 1);
  const active = known && session.freezeRevRaw > 0;
  const liveRevNode = liveEffectNodes.get(0x3d);

  ui.liveFreeze.dataset.active = known ? String(active) : "unknown";
  ui.liveFreeze.dataset.pending = String(pending);
  ui.liveFreeze.disabled = !canControl || !known || pending;
  ui.liveFreeze.setAttribute("aria-pressed", String(active));
  ui.liveFreeze.setAttribute("aria-label", known
    ? `Freeze REV ${active ? "attivo" : "disattivato"}`
    : "Freeze REV: stato non disponibile");
  setSwitchState(ui.liveFreezeState, pending
    ? "ATTENDO KEMPER"
    : session.freezeRevSupported === false
      ? "NON DISPONIBILE"
      : known ? active ? "ON" : "OFF" : "IN LETTURA");
  if (liveRevNode) {
    const revEffect = session.lastState?.effects.get(0x3d);
    liveRevNode.card.dataset.freeze = known ? String(active) : "unknown";
    if (!session.effectPending.has(0x3d)) {
      liveRevNode.status.textContent = active
        ? "FREEZE"
        : revEffect?.active === null || revEffect?.active === undefined
          ? "—"
          : revEffect.active ? "ON" : "OFF";
    }
  }
}

export function resetFreezeState() {
  stopFreezeProbe();
  session.freezeRevRaw = null;
  session.freezeRevSupported = null;
  session.freezeRevConfirmedAt = null;
  refreshFreezeControls();
}

function stopFreezeProbe({ keepPending = false } = {}) {
  window.clearInterval(session.freezeProbePollTimer);
  window.clearTimeout(session.freezeProbeTimeout);
  session.freezeProbePollTimer = null;
  session.freezeProbeTimeout = null;
  if (!keepPending) session.freezeRevPending = null;
  refreshFreezeControls();
}

function requestRevHoldProbe({ record = false } = {}) {
  if (!session.sysex || !profilerOutputs().length) return;
  session.freezePollsSent += 1;
  sendProfilerRequests([buildRevHoldRequest()], { record });
}

export function beginRevHoldProbe({ pendingTarget = null, record = true } = {}) {
  stopFreezeProbe({ keepPending: pendingTarget !== null });
  session.freezeRevPending = pendingTarget;
  if (pendingTarget === null) {
    session.freezeRevSupported = null;
    session.freezeRevRaw = null;
  }
  refreshFreezeControls();
  const startedAt = performance.now();
  const commanded = pendingTarget !== null;
  if (!commanded || confirmationPollAllowed(startedAt)) requestRevHoldProbe({ record });
  session.freezeProbePollTimer = window.setInterval(() => {
    if (!commanded || confirmationPollAllowed(startedAt)) requestRevHoldProbe();
  }, 400);
  session.freezeProbeTimeout = window.setTimeout(() => {
    const wasCommand = session.freezeRevPending !== null;
    stopFreezeProbe();
    if (!wasCommand) session.freezeRevSupported = false;
    refreshFreezeControls();
    toast(wasCommand
      ? "REV Hold non confermato dal Kemper"
      : "Il Player non ha risposto all’indirizzo REV Hold 125/115");
  }, 2800);
  ui.copy.disabled = false;
}

export function handleFreezeState(decoded) {
  if (decoded?.type !== "Kemper Parameter"
    || decoded.page !== FREEZE_REV_HOLD.page
    || decoded.parameter !== FREEZE_REV_HOLD.parameter) return;

  session.freezeRepliesReceived += 1;
  session.freezeRevRaw = decoded.value;
  if (decoded.value !== 0 && decoded.value !== 1) {
    session.freezeRevSupported = false;
    stopFreezeProbe();
    toast(`REV Hold: risposta inattesa ${decoded.value} · nessun comando abilitato`);
    return;
  }
  session.freezeRevSupported = true;
  const active = decoded.value > 0;
  const pending = session.freezeRevPending;
  if (pending === null || active === pending) {
    if (pending !== null) {
      session.freezeRevConfirmedAt = new Date().toISOString();
      toast(`Freeze REV ${active ? "attivato" : "disattivato"} · confermato`);
    }
    stopFreezeProbe();
  } else {
    refreshFreezeControls();
  }
}

export function toggleRevFreeze() {
  if (!session.sysex
    || !profilerOutputs().length
    || session.freezeRevSupported !== true
    || (session.freezeRevRaw !== 0 && session.freezeRevRaw !== 1)) {
    toast("Prima rileva lo stato REV Hold");
    return;
  }
  const target = session.freezeRevRaw === 0;
  const time = new Date().toISOString();
  const command = {
    time,
    mode: "module",
    module: "REV",
    page: FREEZE_REV_HOLD.page,
    parameter: FREEZE_REV_HOLD.parameter,
    targetActive: target,
  };
  session.freezeLastCommands.push(command);
  session.freezeLastCommands = session.freezeLastCommands.slice(-20);
  sendProfilerRequests([
    buildRevHoldChangeRequest(target, `REV Freeze ${target ? "ON" : "OFF"} · Hold 125/115`),
  ]);
  beginRevHoldProbe({ pendingTarget: target, record: false });
}

export function refreshFixedFxControls() {
  const hasOutput = profilerOutputs().length > 0;
  const canControl = hasOutput && session.sysex;
  for (const effect of FIXED_FX) {
    if (effect.key === "transpose") {
      paintTranspose();
      continue;
    }
    const liveNode = liveFixedFxNodes.get(effect.key);
    const current = session.fixedFxState.get(effect.key);
    if (!liveNode || !current) continue;
    const pending = session.fixedFxPending.has(effect.key);
    const known = current.supported === true && (current.raw === 0 || current.raw === 1);
    const active = known && current.raw > 0;
    liveNode.button.dataset.active = known ? String(active) : "unknown";
    liveNode.button.dataset.pending = String(pending);
    liveNode.button.disabled = !canControl || !known || pending;
    liveNode.button.setAttribute("aria-pressed", String(active));
    liveNode.button.setAttribute(
      "aria-label",
      `${effect.label}: ${pending ? "in attesa del Kemper" : known ? active ? "attivo" : "disattivato" : "stato non disponibile"}`,
    );
    setSwitchState(liveNode.state, pending
      ? "ATTENDO KEMPER"
      : current.supported === false
        ? "NON DISPONIBILE"
        : known ? active ? "ON" : "OFF" : "IN LETTURA");
  }
}

function stopFixedFxConfirmation(key, { keepPending = false } = {}) {
  const timers = session.fixedFxPollTimers.get(key);
  if (timers) {
    window.clearInterval(timers.interval);
    window.clearTimeout(timers.timeout);
    session.fixedFxPollTimers.delete(key);
  }
  if (!keepPending) session.fixedFxPending.delete(key);
  refreshFixedFxControls();
}

export function stopAllFixedFxConfirmations() {
  for (const effect of FIXED_FX) stopFixedFxConfirmation(effect.key);
}

export function resetFixedFxState() {
  stopAllFixedFxConfirmations();
  session.fixedFxState = new Map(FIXED_FX.map((effect) => [effect.key, {
    raw: null,
    supported: null,
    confirmedAt: null,
  }]));
  refreshFixedFxControls();
}

export function requestFixedFxState(effects = FIXED_FX, { record = false } = {}) {
  if (!session.sysex || !profilerOutputs().length) return;
  session.fixedFxPollsSent += effects.length;
  sendProfilerRequests(buildFixedFxStateRequests(effects), { record });
}

function beginFixedFxConfirmation(effect, target) {
  stopFixedFxConfirmation(effect.key, { keepPending: true });
  session.fixedFxPending.set(effect.key, target);
  refreshFixedFxControls();
  const startedAt = performance.now();
  const poll = () => { if (confirmationPollAllowed(startedAt)) requestFixedFxState([effect]); };
  poll();
  const interval = window.setInterval(poll, 400);
  const timeout = window.setTimeout(() => {
    stopFixedFxConfirmation(effect.key);
    toast(`${effect.label}: comando non confermato dal Kemper`);
  }, 2800);
  session.fixedFxPollTimers.set(effect.key, { interval, timeout });
}

export function handleFixedFxState(decoded) {
  if (decoded?.type !== "Kemper Parameter" || decoded.page !== 0x05) return;
  const effect = FIXED_FX.find((item) => item.parameter === decoded.parameter);
  if (!effect) return;

  session.fixedFxRepliesReceived += 1;
  const current = session.fixedFxState.get(effect.key) ?? {};
  const valid = decoded.value === 0 || decoded.value === 1;
  session.fixedFxState.set(effect.key, {
    ...current,
    raw: decoded.value,
    supported: valid,
    confirmedAt: valid ? new Date().toISOString() : current.confirmedAt ?? null,
  });

  if (!valid) {
    const firstInvalidReply = current.supported !== false || current.raw !== decoded.value;
    const wasPending = session.fixedFxPending.has(effect.key);
    stopFixedFxConfirmation(effect.key);
    if (firstInvalidReply || wasPending) {
      toast(`${effect.label}: risposta inattesa ${decoded.value} · comando bloccato`);
    }
    return;
  }

  const pending = session.fixedFxPending.get(effect.key);
  if (pending !== undefined && (decoded.value > 0) === pending) {
    stopFixedFxConfirmation(effect.key);
    toast(`${effect.label} ${pending ? "ON" : "OFF"} · confermato`);
  } else {
    refreshFixedFxControls();
  }
}

function toggleFixedFx(effect) {
  const current = session.fixedFxState.get(effect.key);
  if (!session.sysex
    || !profilerOutputs().length
    || session.fixedFxPending.has(effect.key)
    || current?.supported !== true
    || (current.raw !== 0 && current.raw !== 1)) {
    toast(`Prima sincronizza ${effect.label}`);
    return;
  }
  const target = current.raw === 0;
  const command = {
    time: new Date().toISOString(),
    key: effect.key,
    label: effect.label,
    page: effect.page,
    parameter: effect.parameter,
    targetActive: target,
  };
  session.fixedFxLastCommands.push(command);
  session.fixedFxLastCommands = session.fixedFxLastCommands.slice(-20);
  sendProfilerRequests([
    buildFixedFxChangeRequest(effect, target, `${effect.label} ${target ? "ON" : "OFF"}`),
  ]);
  beginFixedFxConfirmation(effect, target);
  ui.copy.disabled = false;
}
