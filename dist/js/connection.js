// Collegamento MIDI: porte del Player, accesso Web MIDI, invio delle richieste, schermo sempre acceso.

import { buildRenderedValueRequest, bytesToHex, EFFECT_MODULES, requestKey } from "../kemper-midi.js";
import { toast, ui } from "./dom.js";
import { session } from "./state.js";
import { addLog, shouldLog } from "./diagnostics.js";
import { handleTempoState, pulseTempo, refreshTempoControls } from "./tempo.js";
import { handleMorphState, refreshLiveMorphControls } from "./morph.js";
import {
  captureTunerMode,
  handlePerformanceControl,
  handleTunerStream,
  paintTunerOverlay,
  stopTunerStreamPolling,
} from "./tuner.js";
import { handleEffectState, refreshEffectButton } from "./effects.js";
import { handleFixedFxState, handleFreezeState, refreshFixedFxControls, refreshFreezeControls } from "./fixed-fx.js";
import { handleBankNames, handleRigStack } from "./rig-names.js";
import {
  handleRigSelectionState,
  refreshRigControls,
  refreshRigControlsOnBankNames,
  trackProfilerRig,
} from "./rig.js";
import { kemper, setConnection } from "./screen.js";
import { handleBidirectional, startBidiTimer } from "./bidi.js";
import { requestProfilerState, scheduleProfilerSync, startAutoSync } from "./sync.js";
import { handleLooperLocation, paintLooperLocation, refreshLooperControls, releaseAllLooperSwitches } from "./looper.js";
import { captureTransposeProbe } from "./transpose-probe.js";

export function describePort(port) {
  const parts = [port.name, port.manufacturer].filter(Boolean);
  return parts.length ? [...new Set(parts)].join(" · ") : "Porta MIDI senza nome";
}

function isProfilerPort(port) {
  const identity = `${port.name ?? ""} ${port.manufacturer ?? ""}`.toLowerCase();
  return identity.includes("profiler") || identity.includes("kemper");
}

export function profilerOutputs() {
  return session.access ? [...session.access.outputs.values()].filter((port) => isProfilerPort(port) && port.state !== "disconnected") : [];
}

export function profilerInputs() {
  return session.access ? [...session.access.inputs.values()].filter((port) => isProfilerPort(port) && port.state !== "disconnected") : [];
}

function paintPorts() {
  if (!session.access) return;
  const inputs = [...session.access.inputs.values()];
  const outputs = [...session.access.outputs.values()];

  const paint = (node, ports) => {
    node.replaceChildren();
    if (!ports.length) {
      const item = document.createElement("li");
      item.textContent = "Nessuna porta rilevata";
      node.append(item);
      return;
    }
    for (const port of ports) {
      const item = document.createElement("li");
      item.className = port.state === "connected" ? "device-live" : "";
      item.textContent = `${describePort(port)} · ${port.state}`;
      node.append(item);
    }
  };

  paint(ui.inputs, inputs);
  paint(ui.outputs, outputs);
  ui.inputCount.textContent = inputs.length;
  ui.outputCount.textContent = outputs.length;
  ui.identity.disabled = profilerOutputs().length === 0 || !session.sysex;
  ui.auto.disabled = profilerOutputs().length === 0 || !session.sysex;
  ui.transposeProbe.disabled = profilerOutputs().length === 0 || !session.sysex || session.transposeProbe.pending !== null;
  paintLooperLocation();
  refreshLiveMorphControls();
  refreshLooperControls();
  paintTunerOverlay();
  refreshFreezeControls();
  refreshFixedFxControls();
  refreshTempoControls();
  refreshRigControls();
  for (const module of EFFECT_MODULES) refreshEffectButton(module.page);

  const profilerOutputCount = profilerOutputs().length;
  const profilerInputCount = profilerInputs().length;
  const connectionLabel = profilerOutputCount && profilerInputCount
    ? "Kemper collegato"
    : profilerOutputCount ? "Kemper: ingresso MIDI non disponibile"
      : "Kemper non collegato";
  setConnection(profilerOutputCount && profilerInputCount ? "connected" : "idle", connectionLabel);
}

function attachInputs() {
  for (const input of session.access.inputs.values()) {
    if (input.state === "disconnected") continue;
    input.onmidimessage = (event) => {
      // Controller and virtual ports may emit PC/CC; only the Profiler owns app state.
      if (!isProfilerPort(input)) return;
      const sourceName = describePort(input);
      const decoded = kemper.ingest(event);
      handleBidirectional(decoded);
      handleBankNames(decoded);
      handleRigStack(decoded);
      captureTransposeProbe(decoded);
      trackProfilerRig(decoded);
      refreshRigControlsOnBankNames(decoded);
      handlePerformanceControl(decoded, sourceName);
      handleMorphState(decoded, sourceName);
      handleEffectState(decoded);
      handleTempoState(decoded);
      handleRigSelectionState(decoded);
      handleFreezeState(decoded);
      handleFixedFxState(decoded);
      handleLooperLocation(decoded);
      handleTunerStream(decoded, sourceName);
      captureTunerMode(decoded, sourceName);
      if (decoded?.type === "Kemper Parameter" && decoded.page === 0x7c && decoded.parameter === 0x00 && decoded.value > 0) {
        ui.liveBpmBox.dataset.beatSeen = "true";
        pulseTempo();
      }
      if (decoded && shouldLog(decoded)) addLog(decoded, sourceName);
      if (decoded?.type === "Kemper Parameter" && decoded.page === 0x04 && decoded.parameter === 0x00) {
        if (decoded.value !== session.lastTempoRenderRequested) {
          session.lastTempoRenderRequested = decoded.value;
          sendProfilerRequests([buildRenderedValueRequest(decoded.page, decoded.parameter, decoded.value)], { record: true });
        }
      }
      if (decoded?.type === "Program Change"
        || (decoded?.type === "Control Change" && decoded.controller >= 50 && decoded.controller <= 54)) {
        scheduleProfilerSync();
      }
    };
  }
}

export async function keepScreenOn() {
  if (!("wakeLock" in navigator) || document.visibilityState !== "visible" || !session.access) return;
  if (session.wakeLock && !session.wakeLock.released) return;
  try {
    session.wakeLock = await navigator.wakeLock.request("screen");
    session.wakeLockError = null;
    session.wakeLock.addEventListener("release", () => { session.wakeLock = null; });
  } catch (error) {
    session.wakeLockError = error?.message ?? String(error);
  }
}

async function requestMidiAccess() {
  if (!("requestMIDIAccess" in navigator)) {
    throw new Error("Web MIDI non è disponibile in questo browser. Apri la pagina con Chrome su Android o desktop.");
  }

  try {
    const access = await navigator.requestMIDIAccess({ sysex: true, software: false });
    session.sysex = access.sysexEnabled === true;
    return access;
  } catch (sysexError) {
    const access = await navigator.requestMIDIAccess({ sysex: false, software: false });
    session.sysex = false;
    return access;
  }
}

export async function connect() {
  ui.connect.disabled = true;
  ui.liveConnect.disabled = true;
  ui.connect.textContent = "Connessione…";
  ui.liveConnect.textContent = "Connessione…";
  setConnection("idle", "Autorizzazione MIDI…");
  try {
    session.access = await requestMidiAccess();
    session.access.onstatechange = () => {
      const wasPresent = session.profilerPresent;
      session.profilerPresent = profilerOutputs().length > 0 && profilerInputs().length > 0;
      if (!session.profilerPresent) {
        releaseAllLooperSwitches();
        window.clearInterval(session.autoSyncTimer);
        stopTunerStreamPolling();
      }
      attachInputs();
      paintPorts();
      if (session.profilerPresent && !wasPresent) {
        requestProfilerState({ force: true });
        startAutoSync();
      }
    };
    attachInputs();
    paintPorts();
    session.profilerPresent = profilerOutputs().length > 0 && profilerInputs().length > 0;

    ui.sysexBadge.textContent = session.sysex ? "OK" : "NO";
    ui.sysexNote.textContent = session.sysex
      ? "Autorizzato: possiamo interrogare il Player in modo bidirezionale."
      : "MIDI standard attivo, ma SysEx non è stato autorizzato.";
    ui.capability.dataset.enabled = String(session.sysex);
    ui.connect.textContent = "Rileggi porte";
    if (session.profilerPresent) {
      requestProfilerState({ force: true });
      startAutoSync();
    }
    keepScreenOn();
    startBidiTimer();
    toast(session.sysex ? "MIDI collegato con SysEx" : "MIDI collegato senza SysEx");
  } catch (error) {
    setConnection("error", "Connessione fallita");
    const message = "requestMIDIAccess" in navigator
      ? `Accesso MIDI non riuscito (${error?.message ?? error}). Controlla il permesso MIDI di Chrome, oppure prova la demo.`
      : error.message;
    ui.support.textContent = message;
    toast(message);
  } finally {
    ui.connect.disabled = false;
    ui.liveConnect.disabled = false;
  }
}

export function sendProfilerRequests(requests, { record = true } = {}) {
  if (!session.access || !session.sysex) return;
  const outputs = profilerOutputs();
  if (!outputs.length || !requests.length) return;
  const now = performance.now();
  for (const request of requests) {
    const key = requestKey(request.bytes);
    if (key) session.requestedAt.set(key, now);
  }
  session.requestsSent += requests.length;
  session.lastRequestAt = now;
  for (const output of outputs) {
    for (const request of requests) {
      output.send(request.bytes);
      if (record) {
        session.transmitted.push({
          time: new Date().toISOString(),
          output: describePort(output),
          label: request.label,
          hex: bytesToHex(request.bytes),
        });
      }
    }
  }
  session.transmitted = session.transmitted.slice(-100);
}
