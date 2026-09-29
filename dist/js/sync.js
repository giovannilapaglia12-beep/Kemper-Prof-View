// Letture dal Player: lettura completa, auto sync periodico, letture dopo un cambio e conferme dei comandi.

import {
  buildMorphLevelRequest,
  buildParameterRequest,
  buildProfilerPollRequests,
  buildProfilerStateRequests,
  buildRigNameRequest,
  buildTempoRequest,
  buildTransposeValueRequest,
  FIXED_FX,
} from "../kemper-midi.js";
import { AUTO_SYNC_INTERVAL, FIXED_FX_SYNC_INTERVAL } from "./config.js";
import { toast, ui } from "./dom.js";
import { session } from "./state.js";
import { beginRevHoldProbe, requestFixedFxState } from "./fixed-fx.js";
import { profilerOutputs, sendProfilerRequests } from "./connection.js";
import { BIDI_SAFETY_POLL_MS, bidiCovers } from "./bidi.js";
import { requestLooperLocation } from "./looper.js";
import { requestTransposeState } from "./transpose.js";

export function requestProfilerState({ silent = false, force = false } = {}) {
  if (!profilerOutputs().length) {
    if (!silent) toast("Porta Profiler non trovata");
    return;
  }
  const now = performance.now();
  if (!force && now - session.lastFullSyncAt < 900) return;
  session.lastFullSyncAt = now;
  session.fullSyncUntil = performance.now() + 600;
  sendProfilerRequests(buildProfilerStateRequests());
  if (session.sysex && session.freezeRevPending === null) {
    window.setTimeout(() => beginRevHoldProbe({ record: false }), 140);
  }
  if (session.sysex && session.fixedFxPending.size === 0) {
    window.setTimeout(() => requestFixedFxState(FIXED_FX, { record: true }), 190);
    if (session.transpose.pending === null) {
      window.setTimeout(() => requestTransposeState({ withSwitch: false, record: true }), 190);
    }
    window.setTimeout(requestLooperLocation, 240);
  }
  if (!silent) toast("Sincronizzazione inviata al Profiler");
}

// v1.39: con la modalità bidirezionale attiva il Player invia già tutto dopo un cambio Rig
// (e all'apertura del Tuner rimanda il Program Change del Rig in uso): invece della lettura
// completa (24 richieste) si leggono solo i valori ancora sconosciuti, dopo 1 s.
function fillUnknownState() {
  if (!session.sysex || !profilerOutputs().length) return;
  const state = session.lastState;
  const requests = [];
  if (!state?.rigName) requests.push(buildRigNameRequest("Rig Name (mancante)"));
  if (!Number.isInteger(state?.tempoRaw)) requests.push(buildTempoRequest("Tempo (mancante)"));
  if (session.morphConfirmedRaw === null && session.morphPendingLevel === null) requests.push(buildMorphLevelRequest("Morph (mancante)"));
  for (const [page, effect] of state?.effects ?? []) {
    if (effect.type === null) requests.push(buildParameterRequest(page, 0, `${effect.key} Type (mancante)`));
    if (effect.active === null && !session.effectPending.has(page)) requests.push(buildParameterRequest(page, 3, `${effect.key} On/Off (mancante)`));
  }
  if (requests.length) sendProfilerRequests(requests);
  if (session.freezeRevRaw === null && session.freezeRevPending === null && session.freezeProbePollTimer === null) {
    beginRevHoldProbe({ record: false });
  }
  const unknownFx = FIXED_FX.filter((effect) => (session.fixedFxState.get(effect.key)?.raw ?? null) === null
    && !session.fixedFxPending.has(effect.key));
  if (unknownFx.length) requestFixedFxState(unknownFx, { record: true });
  if (session.transpose.raw === null && session.transpose.pending === null) {
    requestTransposeState({ withSwitch: false, record: true });
  }
  session.gapFills = (session.gapFills ?? 0) + 1;
}

export function syncAfterChange(delay = 240, options = { silent: true }) {
  if (session.bidi.state === "active") {
    // Un solo controllo dei valori mancanti anche se Program Change, nome Rig e conferma arrivano insieme (v1.41).
    window.clearTimeout(session.gapFillTimer);
    session.gapFillTimer = window.setTimeout(fillUnknownState, 1000);
    return session.gapFillTimer;
  }
  return window.setTimeout(() => requestProfilerState(options), delay);
}

// v1.41: con la modalità bidirezionale il Player conferma da solo i comandi in circa 25 ms:
// le letture di conferma partono solo se la conferma non è arrivata entro 700 ms.
export function confirmationPollAllowed(startedAt) {
  return session.bidi.state !== "active" || performance.now() - startedAt >= 700;
}

export function scheduleRigChangeSync() {
  window.clearTimeout(session.rigChangeSyncTimer);
  session.rigChangeSyncTimer = syncAfterChange(240);
}

function pollProfilerState() {
  if (!session.autoSync || document.visibilityState !== "visible") return;
  const now = performance.now();
  if (now < (session.bidi.quietUntil ?? 0)) return;
  // Modalità bidirezionale: si leggono solo i parametri che il Player non invia da solo,
  // più un controllo completo di sicurezza ogni 10 s.
  const safety = session.bidi.state === "active" && now - session.bidi.lastSafetyPollAt >= BIDI_SAFETY_POLL_MS;
  if (safety) session.bidi.lastSafetyPollAt = now;
  const keep = (request) => safety || !bidiCovers(request);
  sendProfilerRequests(buildProfilerPollRequests().filter(keep), { record: false });
  // Keep the four fixed effects aligned when hardware or another MIDI controller changes them.
  // Confirmation polling already owns an effect while an app command is pending.
  if (now - session.lastFixedFxAutoPollAt >= FIXED_FX_SYNC_INTERVAL) {
    session.lastFixedFxAutoPollAt = now;
    const available = FIXED_FX.filter((effect) => !session.fixedFxPending.has(effect.key)
      && keep(buildParameterRequest(effect.page, effect.parameter)));
    if (available.length) requestFixedFxState(available);
    // v1.64: semitoni del Transpose (4/4), per seguire anche i cambi fatti sul Player.
    if (session.transpose.pending === null && keep(buildTransposeValueRequest())) {
      requestTransposeState({ withSwitch: false });
    }
  }
}

export function startAutoSync() {
  window.clearInterval(session.autoSyncTimer);
  if (!session.autoSync) return;
  session.autoSyncTimer = window.setInterval(pollProfilerState, AUTO_SYNC_INTERVAL);
  ui.auto.setAttribute("aria-pressed", "true");
  ui.auto.textContent = "Auto sync: ON";
}

export function toggleAutoSync() {
  session.autoSync = !session.autoSync;
  if (session.autoSync) {
    startAutoSync();
    pollProfilerState();
    toast("Auto sync attivato");
  } else {
    window.clearInterval(session.autoSyncTimer);
    ui.auto.setAttribute("aria-pressed", "false");
    ui.auto.textContent = "Auto sync: OFF";
    toast("Auto sync disattivato");
  }
}

export function scheduleProfilerSync() {
  window.clearTimeout(session.syncTimer);
  session.syncTimer = syncAfterChange(180, {});
}
