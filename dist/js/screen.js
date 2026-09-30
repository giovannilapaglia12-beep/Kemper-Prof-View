// Messaggi del Player → stato → schermata: il ridisegno (al massimo ogni 60 ms) e lo stato di collegamento.

import { KemperMidiState } from "../kemper-midi.js";
import { ui } from "./dom.js";
import { effectTone, longestWord, shortEffectName } from "./text.js";
import { session } from "./state.js";
import { refreshTempoControls, stopTempoConfirmation, stopTempoTapPolling } from "./tempo.js";
import { liveEffectNodes, stopAllEffectConfirmations } from "./effects.js";
import { resetFixedFxState, resetFreezeState } from "./fixed-fx.js";
import { transposeRigChanged } from "./transpose.js";
import { scheduleRigStackRequest } from "./rig-names.js";
import { refreshRigControls } from "./rig.js";
import { profilerOutputs } from "./connection.js";
import { scheduleRigChangeSync } from "./sync.js";

// v1.42: in modalità bidirezionale il Player invia circa 40 messaggi al secondo (Tuner anche a
// Tuner chiuso, battito, parametri ripetuti). Ridisegnare tutta la schermata a ogni messaggio
// appesantiva il telefono: ora lo stato si aggiorna subito, lo schermo al massimo ogni 60 ms.
const STATE_PAINT_INTERVAL = 60;
let statePaintTimer = null;
session.statePaints = 0;
session.stateMessages = 0;
function scheduleStatePaint() {
  if (statePaintTimer !== null) return;
  statePaintTimer = window.setTimeout(paintKemperState, STATE_PAINT_INTERVAL);
}

function paintKemperState() {
  statePaintTimer = null;
  const state = session.lastState;
  if (!state) return;
  session.statePaints += 1;
  if (state.rigName) {
    ui.rigTitle.textContent = state.rigName;
    ui.liveRigName.textContent = state.rigName;
  }
  if (state.program !== null) {
    ui.rigTitle.textContent = state.rigName ?? `Program ${state.program}`;
    ui.program.textContent = `Program ${state.program}`;
  }
  if (state.channel !== null) ui.channel.textContent = `Canale ${state.channel}`;
  if (state.bpm !== null) {
    ui.liveBpm.textContent = state.bpm.toFixed(1);
  }
  refreshTempoControls();
  refreshRigControls();
  for (const [page, effect] of state.effects) {
    const liveNode = liveEffectNodes.get(page);
    const freezeLabel = effect.key === "REV"
      ? `, Freeze ${session.freezeRevRaw === 1 ? "attivo" : session.freezeRevRaw === 0 ? "disattivato" : "in lettura"}`
      : "";
    if (liveNode) {
      const pending = session.effectPending.has(page);
      const freezeActive = effect.key === "REV" && session.freezeRevRaw === 1;
      const empty = effect.type === 0;
      liveNode.name.textContent = empty ? "Slot vuoto" : shortEffectName(effect.name);
      // v1.38: la dimensione del nome si adatta alla parola più lunga, senza spezzarla.
      // v1.68: niente più sillabe col trattino: le parole lunghe sono abbreviate (shortEffectName).
      liveNode.card.style.setProperty("--chars", String(longestWord(liveNode.name.textContent)));
      liveNode.card.dataset.tone = effectTone(effect.type);
      liveNode.card.dataset.active = empty ? "false" : effect.active === null ? "unknown" : String(effect.active);
      liveNode.card.dataset.pending = String(pending);
      if (effect.key === "REV") liveNode.card.dataset.freeze = session.freezeRevRaw === null ? "unknown" : String(freezeActive);
      liveNode.status.textContent = pending
        ? "ATTENDO"
        : empty ? "VUOTO" : freezeActive ? "FREEZE" : effect.active === null ? "—" : effect.active ? "ON" : "OFF";
      liveNode.card.disabled = !session.sysex || effect.active === null || empty || profilerOutputs().length === 0 || pending;
      liveNode.card.setAttribute("aria-pressed", String(!empty && effect.active === true));
      liveNode.card.setAttribute("aria-label", empty
        ? `${effect.key}: slot vuoto`
        : `${effect.key}: ${effect.name}, ${effect.active === null ? "stato non disponibile" : effect.active ? "attivo" : "disattivato"}${freezeLabel}`);
    }
  }
}

// Firma di ciò che la schermata mostra: se non cambia (Tuner, battito, valori ripetuti) niente ridisegno.
let lastPaintSignature = "";
function stateSignature(state) {
  let text = `${state.rigName}|${state.program}|${state.channel}|${state.bpm}|${state.tempoRaw}`;
  for (const effect of state.effects.values()) text += `|${effect.type}:${effect.active}`;
  return text;
}

export const kemper = new KemperMidiState((state) => {
  session.lastState = state;
  session.stateMessages += 1;
  const signature = stateSignature(state);
  if (signature !== lastPaintSignature) {
    lastPaintSignature = signature;
    scheduleStatePaint();
  }
  if (state.rigName && session.lastRigName === null) {
    session.lastRigName = state.rigName;
    scheduleRigStackRequest(state.rigName);
  } else if (state.rigName && state.rigName !== session.lastRigName) {
    scheduleRigStackRequest(state.rigName);
    stopTempoConfirmation();
    stopTempoTapPolling();
    stopAllEffectConfirmations();
    resetFreezeState();
    resetFixedFxState();
    transposeRigChanged();
    if (session.rigSelectPending === null && !session.profilerProgramAwaitsName) {
      session.rigSelectedBank = null;
      session.rigSelectedSlot = null;
      refreshRigControls();
    }
    session.lastRigName = state.rigName;
    if (performance.now() > session.fullSyncUntil) scheduleRigChangeSync();
  }
});

export function setConnection(status, label) {
  document.body.dataset.connected = String(status === "connected");
  ui.pill.dataset.status = status;
  ui.connectionLabel.textContent = label;
  ui.liveConnectionStatus.dataset.status = status;
  ui.liveConnectionStatus.dataset.label = label;
  paintLiveConnection();
  ui.liveConnect.textContent = status === "connected" ? "MIDI collegato" : "Connetti MIDI";
  ui.liveSync.disabled = status !== "connected" || !session.sysex || profilerOutputs().length === 0;
}

export function paintLiveConnection() {
  const node = ui.liveConnectionStatus;
  const connected = node.dataset.status === "connected";
  const bidi = connected && session.bidi?.state === "active";
  node.dataset.bidi = String(bidi);
  node.textContent = connected
    ? `● ${window.__kemperDemo ? "DEMO" : "COLLEGATO"}${bidi ? " ⇄" : ""}`
    : node.dataset.label ?? "Non collegato";
  node.title = bidi ? "Modalità bidirezionale attiva: il Player invia i cambiamenti" : "";
}
