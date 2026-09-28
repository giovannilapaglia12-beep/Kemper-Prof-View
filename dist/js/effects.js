// Gli 8 effetti del Rig (A, B, C, D, X, MOD, DLY, REV): pulsanti, colori delle categorie, nomi sillabati.

import { buildEffectStateRequests, bytesToHex, EFFECT_MODULES } from "../kemper-midi.js";
import { toast, ui } from "./dom.js";
import { session } from "./state.js";
import { describePort, profilerOutputs, sendProfilerRequests } from "./connection.js";
import { confirmationPollAllowed } from "./sync.js";

export const liveEffectNodes = new Map();
for (const module of EFFECT_MODULES) {
  const liveCard = document.createElement("button");
  const liveLabel = document.createElement("span");
  const liveName = document.createElement("strong");
  const liveStatus = document.createElement("small");
  liveCard.type = "button";
  liveCard.className = "live-effect-button";
  liveCard.dataset.active = "unknown";
  liveCard.dataset.pending = "false";
  if (module.key === "REV") liveCard.dataset.freeze = "unknown";
  liveCard.disabled = true;
  liveLabel.textContent = module.key;
  liveName.textContent = "—";
  liveStatus.textContent = "IN LETTURA";
  liveCard.setAttribute("aria-label", `${module.key}: stato non disponibile`);
  liveCard.addEventListener("click", () => toggleEffect(module));
  liveCard.append(liveLabel, liveName, liveStatus);
  ui.liveEffectsGrid.append(liveCard);
  liveEffectNodes.set(module.page, { card: liveCard, name: liveName, status: liveStatus });
}

export function refreshEffectButton(page) {
  const liveNode = liveEffectNodes.get(page);
  const effect = session.lastState?.effects.get(page);
  const pending = session.effectPending.has(page);
  if (liveNode) {
    const freezeActive = effect?.key === "REV" && session.freezeRevRaw === 1;
    liveNode.card.dataset.active = effect?.active === null || effect?.active === undefined
      ? "unknown"
      : String(effect.active);
    liveNode.card.dataset.pending = String(pending);
    if (effect?.key === "REV") {
      liveNode.card.dataset.freeze = session.freezeRevRaw === null
        ? "unknown"
        : String(freezeActive);
    }
    liveNode.status.textContent = pending
      ? "ATTENDO"
      : freezeActive ? "FREEZE ON"
        : effect?.active === null || effect?.active === undefined
          ? "—"
          : effect.active ? "ON" : "OFF";
    liveNode.card.disabled = pending
      || !session.sysex
      || profilerOutputs().length === 0
      || effect?.active === null
      || effect?.active === undefined;
    liveNode.card.setAttribute("aria-pressed", String(effect?.active === true));
  }
}

function stopEffectConfirmation(page) {
  const pending = session.effectPending.get(page);
  if (pending) {
    window.clearInterval(pending.pollTimer);
    window.clearTimeout(pending.timeout);
  }
  session.effectPending.delete(page);
  refreshEffectButton(page);
}

export function stopAllEffectConfirmations() {
  for (const page of [...session.effectPending.keys()]) stopEffectConfirmation(page);
}

export function handleEffectState(decoded) {
  if (decoded?.type !== "Kemper Parameter" || decoded.parameter !== 0x03) return;
  const pending = session.effectPending.get(decoded.page);
  if (!pending || (decoded.value > 0) !== pending.target) return;
  stopEffectConfirmation(decoded.page);
  toast(`${pending.key} ${pending.target ? "attivato" : "disattivato"} · confermato dal Kemper`);
}

function toggleEffect(module) {
  const outputs = profilerOutputs();
  const effect = session.lastState?.effects.get(module.page);
  if (!outputs.length) {
    toast("Collega prima il Profiler");
    return;
  }
  if (!session.sysex || effect?.active === null || effect?.active === undefined) {
    toast("Sincronizza prima lo stato degli effetti");
    return;
  }

  stopEffectConfirmation(module.page);
  const target = !effect.active;
  const value = target ? 1 : 0;
  const channel = Math.max(1, Math.min(16, session.lastState?.channel ?? 1));
  const bytes = [0xb0 | (channel - 1), module.cc, value];
  const command = {
    time: new Date().toISOString(),
    module: module.key,
    channel,
    controller: module.cc,
    value,
    targetActive: target,
  };

  for (const output of outputs) {
    output.send(bytes);
    session.transmitted.push({
      time: command.time,
      output: describePort(output),
      label: `${module.key} ${target ? "ON" : "OFF"} (CC${module.cc})`,
      hex: bytesToHex(bytes),
    });
  }
  session.transmitted = session.transmitted.slice(-100);
  session.effectLastCommands.push(command);
  session.effectLastCommands = session.effectLastCommands.slice(-20);

  const effectStartedAt = performance.now();
  const requestConfirmation = () => {
    if (confirmationPollAllowed(effectStartedAt)) sendProfilerRequests(buildEffectStateRequests([module.page]), { record: false });
  };
  const pending = {
    key: module.key,
    target,
    pollTimer: window.setInterval(requestConfirmation, 400),
    timeout: window.setTimeout(() => {
      stopEffectConfirmation(module.page);
      toast(`${module.key}: nessuna conferma dal Kemper`);
    }, 3000),
  };
  session.effectPending.set(module.page, pending);
  refreshEffectButton(module.page);
  window.setTimeout(requestConfirmation, 150);
  ui.copy.disabled = false;
}
