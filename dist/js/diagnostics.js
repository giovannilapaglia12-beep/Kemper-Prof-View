// Registro dei messaggi MIDI e diagnostica (ALTRO → Salva diagnostica / Copia).

import { buildBeaconRequest, bytesToHex, FIXED_FX, FREEZE_REV_HOLD } from "../kemper-midi.js";
import { APP_NAME, APP_VERSION, TUNER_STREAM_INTERVAL } from "./config.js";
import { toast, ui } from "./dom.js";
import { session } from "./state.js";
import { stopTempoConfirmation, stopTempoTapPolling } from "./tempo.js";
import { isTunerStream, paintTunerOverlay, stopTunerConfirmation, stopTunerStreamPolling } from "./tuner.js";
import { stopAllEffectConfirmations } from "./effects.js";
import {
  beginRevHoldProbe,
  refreshFixedFxControls,
  refreshFreezeControls,
  requestFixedFxState,
  resetFixedFxState,
  resetFreezeState,
  stopAllFixedFxConfirmations,
} from "./fixed-fx.js";
import { stopRigSelectionConfirmation } from "./rig.js";
import { describePort, profilerOutputs } from "./connection.js";
import { BIDI_LEASE_SECONDS, keyName, requestsPerMinute } from "./bidi.js";
import { looper } from "./looper.js";

export function addLog(decoded, sourceName) {
  session.total += 1;
  const stamp = new Date();
  const record = {
    time: stamp.toISOString(),
    source: sourceName,
    type: decoded.type,
    detail: decoded.detail,
    hex: decoded.hex,
  };
  session.messages.unshift(record);
  session.messages = session.messages.slice(0, 200);

  ui.logEmpty.hidden = true;
  ui.messageCount.textContent = session.total;
  ui.lastEvent.textContent = decoded.type;
  ui.lastValue.textContent = decoded.detail;
  ui.copy.disabled = false;

  const row = document.createElement("li");
  const time = document.createElement("time");
  const type = document.createElement("span");
  const value = document.createElement("code");
  time.textContent = stamp.toLocaleTimeString("it-IT", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  type.className = "message-type";
  type.textContent = decoded.type;
  value.textContent = decoded.detail;
  row.append(time, type, value);
  ui.log.prepend(row);
  while (ui.log.children.length > 200) ui.log.lastElementChild.remove();
}

export function shouldLog(decoded) {
  if (decoded.type === "MIDI Clock" || decoded.type === "Kemper Heartbeat") return false;
  if (decoded.type === "Kemper Parameter" && decoded.page === 0x7c && decoded.parameter === 0x00) return false;
  if (isTunerStream(decoded)) return false;
  if (decoded.page === undefined || decoded.parameter === undefined) return true;
  const key = `${decoded.type}:${decoded.page}:${decoded.parameter}`;
  const value = decoded.value ?? decoded.text ?? decoded.rendered ?? decoded.detail;
  if (session.lastLoggedValues.get(key) === value) return false;
  session.lastLoggedValues.set(key, value);
  return true;
}

export function clearLog() {
  session.messages = [];
  session.total = 0;
  session.lastLoggedValues.clear();
  window.clearTimeout(session.tunerOffTimer);
  stopTunerConfirmation();
  stopTunerStreamPolling();
  stopAllEffectConfirmations();
  stopTempoConfirmation();
  stopTempoTapPolling();
  stopRigSelectionConfirmation();
  stopAllFixedFxConfirmations();
  session.effectLastCommands = [];
  session.tempoLastCommand = null;
  session.tempoLastTapCommand = null;
  session.tempoConfirmedAt = null;
  session.tempoPollsSent = 0;
  session.tempoRepliesReceived = 0;
  session.rigSelectLastCommand = null;
  session.rigSelectConfirmedAt = null;
  session.rigSelectPollsSent = 0;
  session.rigSelectRepliesReceived = 0;
  resetFreezeState();
  session.freezePollsSent = 0;
  session.freezeRepliesReceived = 0;
  session.freezeLastCommands = [];
  resetFixedFxState();
  session.fixedFxPollsSent = 0;
  session.fixedFxRepliesReceived = 0;
  session.fixedFxLastCommands = [];
  session.tunerNoteWindow = [];
  session.tunerRawNotes.clear();
  session.tunerStableNotes.clear();
  session.tunerModeTransitions = [];
  session.tunerOpenedAt = null;
  session.tunerLiveNoteRaw = null;
  session.tunerSignalSamples = [];
  session.tunerSignalWindow = [];
  session.lastTunerSignalSampleAt = 0;
  session.tunerPendingMode = null;
  session.tunerLastCommand = null;
  session.tunerStreamPollsSent = 0;
  session.tunerStreamRepliesReceived = 0;
  session.performanceState.tunerActive = null;
  session.performanceState.tunerSource = null;
  session.performanceState.tunerCandidateNote = null;
  session.performanceState.tunerCandidateRaw = null;
  session.performanceState.tunerBackgroundSignal = null;
  session.performanceState.tunerSignalRaw = null;
  session.performanceState.tunerCents = null;
  session.performanceState.tunerZone = "waiting";
  session.performanceState.tunerModeRaw = null;
  session.performanceState.tunerMode = "unknown";
  ui.liveTuner.dataset.active = "unknown";
  ui.liveTunerNote.textContent = "APRI";
  ui.liveTunerState.textContent = "IN ATTESA";
  ui.liveTuner.setAttribute("aria-pressed", "false");
  ui.liveTuner.disabled = profilerOutputs().length === 0;
  paintTunerOverlay();
  ui.log.replaceChildren();
  ui.logEmpty.hidden = false;
  ui.messageCount.textContent = "0";
  ui.lastEvent.textContent = "—";
  ui.lastValue.textContent = "—";
  ui.copy.disabled = true;
  refreshFreezeControls();
  refreshFixedFxControls();
  if (session.sysex && profilerOutputs().length) {
    window.setTimeout(() => beginRevHoldProbe({ record: false }), 120);
    window.setTimeout(() => requestFixedFxState(FIXED_FX, { record: true }), 170);
  }
}

function buildDiagnostics() {
  return {
    app: `${APP_NAME} v${APP_VERSION}`,
    screenWakeLock: {
      supported: "wakeLock" in navigator,
      active: Boolean(session.wakeLock && !session.wakeLock.released),
      error: session.wakeLockError,
    },
    startedAt: session.startedAt,
    exportedAt: new Date().toISOString(),
    sysexEnabled: session.sysex,
    inputs: session.access ? [...session.access.inputs.values()].map(describePort) : [],
    outputs: session.access ? [...session.access.outputs.values()].map(describePort) : [],
    profilerOutputs: profilerOutputs().map(describePort),
    transmitted: session.transmitted,
    // v1.61: prova "Leggi Transpose" (pagina 5 dei Fixed FX e Rig Transpose 4/4), sola lettura.
    transposeProbe: session.transposeProbe?.readings ?? [],
    currentState: session.lastState ? {
      rigName: session.lastState.rigName,
      bpm: session.lastState.bpm,
      tempoRaw: session.lastState.tempoRaw,
      tempoRendered: session.lastState.tempoRendered,
      effects: [...session.lastState.effects.values()],
    } : null,
    performanceState: session.performanceState,
    morphControl: {
      rigName: session.morphControlRig,
      commandedLevel: session.morphCommandLevel,
      pendingLevel: session.morphPendingLevel,
      confirmedRaw: session.morphConfirmedRaw,
      confirmedAt: session.morphConfirmedAt,
      lastCommand: session.morphLastCommand,
    },
    looperControl: {
      lastCommands: session.looperLastCommands,
      estimatedState: looper.state,
      estimatedLoopSeconds: looper.loopLength,
      estimatedHalfSpeed: looper.half,
      estimatedReverse: looper.reverse,
      quantize: looper.quantize,
      location: session.looperLocation,
      statusFeedback: "stimato dall'app, non letto dal Player",
    },
    effectControl: {
      pending: [...session.effectPending.entries()].map(([page, pending]) => ({
        page,
        key: pending.key,
        targetActive: pending.target,
      })),
      lastCommands: session.effectLastCommands,
    },
    tempoControl: {
      pendingRaw: session.tempoPendingRaw,
      confirmedAt: session.tempoConfirmedAt,
      lastCommand: session.tempoLastCommand,
      lastTapCommand: session.tempoLastTapCommand,
      polling: {
        active: session.tempoConfirmPollTimer !== null || session.tempoTapPollTimer !== null,
        pollsSent: session.tempoPollsSent,
        repliesReceived: session.tempoRepliesReceived,
      },
    },
    bankNames: {
      requestsSent: session.bankNameRequestsSent ?? 0,
      requestRepliesComplete: session.bankNameRepliesComplete ?? 0,
      received: session.bankListsReceived,
      remembered: Object.fromEntries(session.bankNames),
      slots: Object.fromEntries(session.slotNames),
    },
    rigStack: {
      rig: session.rigStack.rig,
      values: session.rigStack.values,
      requestsSent: session.rigStack.requestsSent,
      replies: session.rigStack.replies,
      log: session.rigStack.log,
      addresses: "stringhe 0/16 0/21 0/24 (ampli), 0/32 0/37 0/42 (cabinet); On/Off 10/2 e 12/2",
    },
    rigControl: {
      maxBanks: session.maxBanks,
      targetBank: session.rigTargetBank,
      selectedBank: session.rigSelectedBank,
      selectedSlot: session.rigSelectedSlot,
      pending: session.rigSelectPending,
      confirmedAt: session.rigSelectConfirmedAt,
      lastCommand: session.rigSelectLastCommand,
      polling: {
        active: session.rigSelectPollTimer !== null,
        pollsSent: session.rigSelectPollsSent,
        repliesReceived: session.rigSelectRepliesReceived,
      },
    },
    freezeControl: {
      verifiedParameter: {
        module: "REV",
        page: FREEZE_REV_HOLD.page,
        parameter: FREEZE_REV_HOLD.parameter,
        address: FREEZE_REV_HOLD.address,
        scope: "REV-only",
      },
      supported: session.freezeRevSupported,
      raw: session.freezeRevRaw,
      active: session.freezeRevRaw === 0 || session.freezeRevRaw === 1
        ? session.freezeRevRaw > 0
        : null,
      pendingTarget: session.freezeRevPending,
      confirmedAt: session.freezeRevConfirmedAt,
      pollsSent: session.freezePollsSent,
      repliesReceived: session.freezeRepliesReceived,
      lastCommands: session.freezeLastCommands,
    },
    fixedFxControl: {
      source: "Kemper page 5",
      states: FIXED_FX.map((effect) => {
        const state = session.fixedFxState.get(effect.key);
        return {
          key: effect.key,
          label: effect.label,
          page: effect.page,
          parameter: effect.parameter,
          raw: state?.raw ?? null,
          active: state?.raw === 0 || state?.raw === 1 ? state.raw > 0 : null,
          supported: state?.supported ?? null,
          confirmedAt: state?.confirmedAt ?? null,
        };
      }),
      pending: [...session.fixedFxPending.entries()].map(([key, targetActive]) => ({ key, targetActive })),
      polling: {
        active: session.fixedFxPollTimers.size > 0,
        pollsSent: session.fixedFxPollsSent,
        repliesReceived: session.fixedFxRepliesReceived,
      },
      lastCommands: session.fixedFxLastCommands,
    },
    bidirectional: {
      enabled: session.bidi.enabled,
      state: session.bidi.state,
      leaseSeconds: BIDI_LEASE_SECONDS,
      parameterSet: 2,
      beacon: bytesToHex(buildBeaconRequest({ init: true, leaseSeconds: BIDI_LEASE_SECONDS }).bytes),
      initBeaconsSent: session.bidi.initBeaconsSent,
      keepAliveSent: session.bidi.keepAliveSent,
      sensingReceived: session.bidi.sensingCount,
      sensingBeforeFirstBeacon: session.bidi.sensingBeforeBeacon,
      activeSince: session.bidi.activeSince,
      drops: session.bidi.drops,
      coveredNow: [...session.bidi.covered].map((key) => ({ key, name: keyName(key) })),
      pushedByPlayer: Object.fromEntries(session.bidi.pushed),
      otherSysexWhileActive: session.bidi.otherSysex,
      transitions: session.bidi.transitions,
      sysexRequestsSent: session.requestsSent,
      gapFillsInsteadOfFullSync: session.gapFills ?? 0,
      screenRedraws: { messages: session.stateMessages, redraws: session.statePaints },
      requestsPerMinute: requestsPerMinute(),
    },
    rawTunerNotes: [...session.tunerRawNotes.values()],
    confirmedTunerNotes: [...session.tunerStableNotes.values()],
    tunerSignalSamples: session.tunerSignalSamples,
    tunerModeTransitions: session.tunerModeTransitions,
    tunerControl: {
      pendingMode: session.tunerPendingMode,
      lastCommand: session.tunerLastCommand,
    },
    tunerPolling: {
      active: session.tunerStreamTimer !== null,
      intervalMs: TUNER_STREAM_INTERVAL,
      pollsSent: session.tunerStreamPollsSent,
      repliesReceived: session.tunerStreamRepliesReceived,
    },
    messages: session.messages.slice().reverse(),
  };
}

export function saveDiagnostics() {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const blob = new Blob([JSON.stringify(buildDiagnostics(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kemper-diagnostica-${stamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Diagnostica salvata nei Download");
}

export async function copyDiagnostics() {
  const payload = buildDiagnostics();
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast("Diagnostica copiata");
  } catch {
    toast("Impossibile copiare automaticamente");
  }
}
