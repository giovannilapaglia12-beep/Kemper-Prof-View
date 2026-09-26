import {
  EFFECT_MODULES,
  FIXED_FX,
  FREEZE_REV_HOLD,
  KemperMidiState,
  buildEffectStateRequests,
  buildFixedFxChangeRequest,
  buildFixedFxStateRequests,
  buildMorphLevelRequest,
  buildTempoChangeRequest,
  buildTempoRequest,
  buildTunerModeRequest,
  buildParameterRequest,
  buildTunerStreamRequests,
  buildProfilerPollRequests,
  buildProfilerStateRequests,
  buildRenderedValueRequest,
  buildRigNameRequest,
  buildRevHoldChangeRequest,
  buildRevHoldRequest,
  bytesToHex,
} from "./kemper-midi.js";

const APP_VERSION = "1.35";
document.documentElement.lang = "it";
const $ = (selector) => document.querySelector(selector);
const AUTO_SYNC_INTERVAL = 1500;
const FIXED_FX_SYNC_INTERVAL = 4500;
const TUNER_STREAM_INTERVAL = 100;
const TEMPO_UNITS_PER_BPM = 64;

const ui = {
  connect: $("#connect-button"),
  identity: $("#identity-button"),
  auto: $("#auto-button"),
  clear: $("#clear-button"),
  copy: $("#copy-button"),
  pill: $("#connection-pill"),
  connectionLabel: $("#connection-label"),
  support: $("#support-note"),
  inputs: $("#input-list"),
  outputs: $("#output-list"),
  inputCount: $("#input-count"),
  outputCount: $("#output-count"),
  sysexBadge: $("#sysex-badge"),
  sysexNote: $("#sysex-note"),
  capability: $(".capability-card"),
  rigTitle: $("#rig-title"),
  program: $("#program-label"),
  channel: $("#channel-label"),
  bpm: $("#bpm-value"),
  tempoBlock: $(".tempo-block"),
  tempoDown: $("#tempo-down-button"),
  tempoTap: $("#tempo-tap-button"),
  tempoUp: $("#tempo-up-button"),
  tempoRound: $("#tempo-round-button"),
  tempoStatus: $("#tempo-status"),
  rigControlPanel: $(".rig-control-panel"),
  rigControlStatus: $("#rig-control-status"),
  rigBankDown: $("#rig-bank-down"),
  rigBankUp: $("#rig-bank-up"),
  rigBankValue: $("#rig-bank-value"),
  rigSlots: [...document.querySelectorAll("[data-rig-slot]")],
  liveBankDown: $("#live-bank-down"),
  liveBankUp: $("#live-bank-up"),
  liveBankValue: $("#live-bank-value"),
  liveBankName: $("#live-bank-name"),
  liveRigStatus: $("#live-rig-status"),
  liveRigPosition: $("#live-rig-position"),
  stageLooper: $("#stage-looper"),
  looperState: $("#looper-state"),
  looperStateLabel: $("#looper-state-label"),
  looperStateTime: $("#looper-state-time"),
  looperStateFlags: $("#looper-state-flags"),
  looperStateReset: $("#looper-state-reset"),
  looperHalf: $("#looper-half"),
  looperHalfLabel: $("#looper-half-label"),
  looperHalfNote: $("#looper-half-note"),
  looperHalfFix: $("#looper-half-fix"),
  looperProbe: $("#looper-probe-button"),
  looperProbeResult: $("#looper-probe-result"),
  forgetNames: $("#forget-names-button"),
  quantizeButtons: [...document.querySelectorAll("[data-quantize]")],
  quantizeNote: $("#looper-quantize-note"),
  saveDiagnostics: $("#save-diagnostics-button"),
  tunerOverlay: $("#tuner-overlay"),
  tunerOverlayNote: $("#tuner-overlay-note"),
  tunerOverlayNeedle: $("#tuner-overlay-needle"),
  tunerOverlayCents: $("#tuner-overlay-cents"),
  tunerOverlayClose: $("#tuner-overlay-close"),
  morphLevelDetails: $(".stage-morph-level"),
  liveRigSlots: [...document.querySelectorAll("[data-live-rig-slot]")],
  lastEvent: $("#last-event"),
  lastValue: $("#last-value"),
  messageCount: $("#message-count"),
  log: $("#midi-log"),
  logEmpty: $("#log-empty"),
  toast: $("#toast"),
  effectsGrid: $("#effects-grid"),
  syncStatus: $("#sync-status"),
  morphCard: $("#morph-card"),
  morphPercent: $("#morph-percent"),
  morphMode: $("#morph-mode"),
  morphMeter: $("#morph-meter"),
  morphFill: $("#morph-fill"),
  morphSource: $("#morph-source"),
  morphProbe: $("#morph-probe-button"),
  tunerCard: $("#tuner-card"),
  tunerStatus: $("#tuner-status"),
  tunerNote: $("#tuner-note"),
  tunerGauge: $("#tuner-gauge"),
  tunerCents: $("#tuner-cents"),
  tunerRaw: $("#tuner-raw"),
  tunerSignal: $("#tuner-signal"),
  tunerHint: $("#tuner-hint"),
  tunerHistory: $("#tuner-history"),
  tunerControl: $("#tuner-control-button"),
  freezePanel: $("#freeze-panel"),
  freezeStatus: $("#freeze-status"),
  freezeAddress: $("#freeze-address"),
  freezeRev: $("#freeze-rev-button"),
  fixedFxPanel: $("#fixed-fx-panel"),
  fixedFxGrid: $("#fixed-fx-grid"),
  fixedFxStatus: $("#fixed-fx-status"),
  viewButtons: [...document.querySelectorAll("[data-view-button]")],
  livePanel: $(".live-panel"),
  liveRigName: $("#live-rig-name"),
  liveBpm: $("#live-bpm-value"),
  liveMorph: $("#live-morph"),
  liveMorphMode: $("#live-morph-mode"),
  liveMorphPercent: $("#live-morph-percent"),
  liveMorphMeter: $("#live-morph-meter"),
  liveMorphFill: $("#live-morph-fill"),
  liveMorphToggle: $("#live-morph-toggle"),
  liveMorphSlider: $("#live-morph-slider"),
  liveMorphTarget: $("#live-morph-target"),
  liveMorphApply: $("#live-morph-apply"),
  looperButtons: [...document.querySelectorAll("[data-looper-switch]")],
  looperErase: $("#looper-erase"),
  looperStatus: $("#looper-status"),
  liveConnectionStatus: $("#live-connection-status"),
  liveConnect: $("#live-connect-button"),
  liveDemo: $("#live-demo-button"),
  liveSync: $("#live-sync-button"),
  liveEffectsGrid: $("#live-effects-grid"),
  liveFixedFxGrid: $("#live-fixed-fx-grid"),
  liveFreeze: $("#live-freeze-button"),
  liveFreezeState: $("#live-freeze-state"),
  liveTuner: $("#live-tuner-button"),
  liveTunerNote: $("#live-tuner-note"),
  liveTunerState: $("#live-tuner-state"),
  liveTap: $("#live-tap-button"),
  liveTapState: $("#live-tap-state"),
  liveTempoDown: $("#live-tempo-down-button"),
  liveTempoRound: $("#live-tempo-round-button"),
  liveTempoUp: $("#live-tempo-up-button"),
};

const session = {
  access: null,
  sysex: false,
  messages: [],
  total: 0,
  startedAt: new Date().toISOString(),
  transmitted: [],
  syncTimer: null,
  autoSyncTimer: null,
  autoSync: true,
  effectPending: new Map(),
  effectLastCommands: [],
  tempoPendingRaw: null,
  tempoLastCommand: null,
  tempoLastTapCommand: null,
  tempoConfirmedAt: null,
  tempoConfirmPollTimer: null,
  tempoConfirmTimeout: null,
  tempoTapPollTimer: null,
  tempoTapPollTimeout: null,
  tempoPollsSent: 0,
  tempoRepliesReceived: 0,
  rigTargetBank: 1,
  rigSelectedBank: null,
  rigSelectedSlot: null,
  rigNames: new Map(),
  slotNames: new Map(),
  bankNames: new Map(),
  pendingBankList: null,
  bankListsReceived: [],
  rigSelectPending: null,
  rigSelectLastCommand: null,
  rigSelectConfirmedAt: null,
  rigSelectPollTimer: null,
  rigSelectTimeout: null,
  rigSelectAwaitingReply: false,
  rigSelectPollsSent: 0,
  rigSelectRepliesReceived: 0,
  lastProfilerProgramAt: 0,
  lastProfilerRigNameEvent: null,
  profilerProgramAwaitsName: false,
  morphControlRig: null,
  morphCommandLevel: null,
  morphLastCommand: null,
  morphPendingLevel: null,
  morphConfirmedRaw: null,
  morphConfirmedAt: null,
  morphConfirmPollTimer: null,
  morphConfirmTimeout: null,
  liveMorphDraft: false,
  looperLastCommands: [],
  profilerPresent: false,
  lastRigName: null,
  fullSyncUntil: 0,
  lastFullSyncAt: 0,
  rigChangeSyncTimer: null,
  lastTempoRenderRequested: null,
  lastLoggedValues: new Map(),
  lastState: null,
  performanceState: {
    morphLevel: null,
    morphMode: "unknown",
    morphSource: null,
    tunerActive: null,
    tunerSource: null,
    tunerCandidateNote: null,
    tunerCandidateRaw: null,
    tunerBackgroundSignal: null,
    tunerSignalRaw: null,
    tunerCents: null,
    tunerZone: "waiting",
    tunerModeRaw: null,
    tunerMode: "unknown",
  },
  tunerOffTimer: null,
  tunerNoteWindow: [],
  tunerRawNotes: new Map(),
  tunerStableNotes: new Map(),
  tunerModeTransitions: [],
  tunerOpenedAt: null,
  tunerLiveNoteRaw: null,
  tunerSignalSamples: [],
  tunerSignalWindow: [],
  lastTunerSignalSampleAt: 0,
  tunerPendingMode: null,
  tunerLastCommand: null,
  tunerConfirmPollTimer: null,
  tunerConfirmTimeout: null,
  tunerStreamTimer: null,
  tunerStreamPollsSent: 0,
  tunerStreamRepliesReceived: 0,
  freezeRevRaw: null,
  freezeRevSupported: null,
  freezeRevPending: null,
  freezeRevConfirmedAt: null,
  freezeProbePollTimer: null,
  freezeProbeTimeout: null,
  freezePollsSent: 0,
  freezeRepliesReceived: 0,
  freezeLastCommands: [],
  fixedFxState: new Map(FIXED_FX.map((effect) => [effect.key, {
    raw: null,
    supported: null,
    confirmedAt: null,
  }])),
  fixedFxPending: new Map(),
  fixedFxPollTimers: new Map(),
  fixedFxPollsSent: 0,
  fixedFxRepliesReceived: 0,
  fixedFxLastCommands: [],
  lastFixedFxAutoPollAt: 0,
  wakeLock: null,
  wakeLockError: null,
};

const RIG_NAMES_KEY = "kemper-stage-view-rig-names";
// v1.35: la demo delle versioni 1.31–1.34 salvava nomi finti; azzera una volta i nomi memorizzati.
try {
  if (!localStorage.getItem("kemper-stage-view-names-reset-v135")) {
    localStorage.removeItem(RIG_NAMES_KEY);
    localStorage.removeItem("kemper-stage-view-bank-names");
    localStorage.setItem("kemper-stage-view-names-reset-v135", "1");
  }
} catch { /* facoltativo */ }
try {
  const stored = JSON.parse(localStorage.getItem(RIG_NAMES_KEY) ?? "{}");
  for (const [key, name] of Object.entries(stored)) {
    if (/^\d+:[1-5]$/.test(key) && typeof name === "string" && name) session.rigNames.set(key, name);
  }
} catch { /* nomi ricordati facoltativi */ }

const BANK_NAMES_KEY = "kemper-stage-view-bank-names";
try {
  const stored = JSON.parse(localStorage.getItem(BANK_NAMES_KEY) ?? "{}");
  for (const [key, name] of Object.entries(stored.banks ?? {})) if (typeof name === "string") session.bankNames.set(key, name);
  for (const [key, name] of Object.entries(stored.slots ?? {})) if (/^\d+:[1-5]$/.test(key) && typeof name === "string") session.slotNames.set(key, name);
} catch { /* facoltativo */ }

function rememberBankList(bank, list) {
  if (list.bankName) session.bankNames.set(String(bank), list.bankName);
  for (const [slot, name] of Object.entries(list.slots)) {
    if (Number(slot) >= 1 && Number(slot) <= 5 && name) session.slotNames.set(`${bank}:${slot}`, name);
  }
  session.bankListsReceived.push({ time: new Date().toISOString(), bank, ...list });
  session.bankListsReceived = session.bankListsReceived.slice(-10);
  if (window.__kemperDemo) return; // la demo non salva nomi finti sul telefono
  try {
    localStorage.setItem(BANK_NAMES_KEY, JSON.stringify({
      banks: Object.fromEntries(session.bankNames),
      slots: Object.fromEntries(session.slotNames),
    }));
  } catch { /* facoltativo */ }
}

function handleBankNames(decoded) {
  if (decoded?.type !== "Kemper Bank Names") return;
  const now = performance.now();
  if (decoded.index === 0 || !session.pendingBankList || now - session.pendingBankList.at > 1000) {
    session.pendingBankList = { bankName: null, slots: {}, at: now };
  }
  if (decoded.index === 0) session.pendingBankList.bankName = decoded.text;
  else session.pendingBankList.slots[decoded.index] = decoded.text;
  session.pendingBankList.at = now;
}

function forgetAllNames() {
  session.rigNames.clear();
  session.slotNames.clear();
  session.bankNames.clear();
  try {
    localStorage.removeItem(RIG_NAMES_KEY);
    localStorage.removeItem(BANK_NAMES_KEY);
  } catch { /* facoltativo */ }
  refreshRigControls();
}

function rememberRigName(bank, slot, name) {
  if (!name) return;
  session.rigNames.set(`${bank}:${slot}`, name);
  if (window.__kemperDemo) return;
  try { localStorage.setItem(RIG_NAMES_KEY, JSON.stringify(Object.fromEntries(session.rigNames))); } catch { /* facoltativo */ }
}

const effectNodes = new Map();
const liveEffectNodes = new Map();
for (const module of EFFECT_MODULES) {
  const card = document.createElement("button");
  const label = document.createElement("span");
  const name = document.createElement("span");
  const status = document.createElement("span");
  const hold = module.key === "REV" ? document.createElement("span") : null;
  let longPressTimer = null;
  let longPressTriggered = false;
  card.type = "button";
  card.className = "effect-slot";
  card.dataset.active = "unknown";
  card.dataset.pending = "false";
  if (hold) {
    card.dataset.freeze = "unknown";
    card.dataset.holding = "false";
    card.title = "Tocco: REV ON/OFF · pressione lunga: Freeze REV";
  }
  card.disabled = true;
  label.className = "effect-slot-label";
  name.className = "effect-slot-name";
  status.className = "effect-slot-state";
  label.textContent = module.key;
  name.textContent = "—";
  status.textContent = "—";
  card.setAttribute("aria-label", `${module.key}: stato non disponibile`);
  card.addEventListener("click", (event) => {
    if (longPressTriggered) {
      longPressTriggered = false;
      event.preventDefault();
      return;
    }
    toggleEffect(module);
  });
  if (hold) {
    hold.className = "effect-slot-hold";
    hold.textContent = "TIENI PREMUTO · FREEZE";
    const cancelLongPress = () => {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
      card.dataset.holding = "false";
    };
    card.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || card.disabled) return;
      longPressTriggered = false;
      card.dataset.holding = "true";
      longPressTimer = window.setTimeout(() => {
        longPressTimer = null;
        longPressTriggered = true;
        card.dataset.holding = "false";
        navigator.vibrate?.(25);
        toggleRevFreeze();
        window.setTimeout(() => { longPressTriggered = false; }, 900);
      }, 650);
    });
    card.addEventListener("pointerup", cancelLongPress);
    card.addEventListener("pointercancel", cancelLongPress);
    card.addEventListener("pointerleave", cancelLongPress);
    card.addEventListener("contextmenu", (event) => event.preventDefault());
  }
  card.append(label, name, status);
  if (hold) card.append(hold);
  ui.effectsGrid.append(card);
  effectNodes.set(module.page, { card, name, status, hold });

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

const fixedFxNodes = new Map();
const liveFixedFxNodes = new Map();
for (const effect of FIXED_FX) {
  const button = document.createElement("button");
  const name = document.createElement("span");
  const address = document.createElement("span");
  const state = document.createElement("span");
  button.type = "button";
  button.className = "fixed-fx-button";
  button.dataset.active = "unknown";
  button.dataset.pending = "false";
  button.disabled = true;
  name.className = "fixed-fx-name";
  address.className = "fixed-fx-address";
  state.className = "fixed-fx-state";
  name.textContent = effect.label;
  address.textContent = `Page ${effect.page} · Param ${effect.parameter}`;
  state.textContent = "IN LETTURA";
  button.setAttribute("aria-label", `${effect.label}: stato non disponibile`);
  button.addEventListener("click", () => toggleFixedFx(effect));
  button.append(name, address, state);
  ui.fixedFxGrid.append(button);
  fixedFxNodes.set(effect.key, { button, state });

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
  liveButton.addEventListener("click", () => toggleFixedFx(effect));
  liveButton.append(liveName, liveState);
  ui.liveFixedFxGrid.append(liveButton);
  liveFixedFxNodes.set(effect.key, { button: liveButton, state: liveState });
}

function effectTone(type) {
  if (type === 0) return "empty";
  if (type >= 177) return "reverb";
  if (type >= 145) return "delay";
  if (type >= 129) return "pitch";
  if (type >= 64 && type <= 104) return "modulation";
  if (type >= 113 && type <= 123 || type >= 32 && type <= 42) return "drive";
  if (type >= 49 && type <= 58) return "dynamics";
  return "standard";
}

const kemper = new KemperMidiState((state) => {
  session.lastState = state;
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
    ui.bpm.textContent = state.bpm.toFixed(1);
    ui.liveBpm.textContent = state.bpm.toFixed(1);
  }
  refreshTempoControls();
  refreshRigControls();
  for (const [page, effect] of state.effects) {
    const node = effectNodes.get(page);
    const liveNode = liveEffectNodes.get(page);
    if (!node) continue;
    node.name.textContent = effect.name;
    node.card.dataset.active = effect.active === null ? "unknown" : String(effect.active);
    if (!session.effectPending.has(page)) {
      node.status.textContent = effect.active === null ? "—" : effect.active ? "ON" : "OFF";
      node.card.disabled = !session.sysex || effect.active === null || profilerOutputs().length === 0;
    }
    node.card.setAttribute("aria-pressed", String(effect.active === true));
    const freezeLabel = effect.key === "REV"
      ? `, Freeze ${session.freezeRevRaw === 1 ? "attivo" : session.freezeRevRaw === 0 ? "disattivato" : "in lettura"}; pressione lunga per cambiare Freeze`
      : "";
    node.card.setAttribute("aria-label", `${effect.key}: ${effect.name}, ${effect.active === null ? "stato non disponibile" : effect.active ? "attivo" : "disattivato"}${freezeLabel}`);
    if (liveNode) {
      const pending = session.effectPending.has(page);
      const freezeActive = effect.key === "REV" && session.freezeRevRaw === 1;
      const empty = effect.type === 0;
      liveNode.name.textContent = empty ? "Slot vuoto" : effect.name;
      liveNode.card.dataset.tone = effectTone(effect.type);
      liveNode.card.dataset.active = empty ? "false" : effect.active === null ? "unknown" : String(effect.active);
      liveNode.card.dataset.pending = String(pending);
      if (effect.key === "REV") liveNode.card.dataset.freeze = session.freezeRevRaw === null ? "unknown" : String(freezeActive);
      liveNode.status.textContent = pending
        ? "ATTENDO"
        : empty ? "VUOTO" : freezeActive ? "FREEZE ON" : effect.active === null ? "—" : effect.active ? "ON" : "OFF";
      liveNode.card.disabled = !session.sysex || effect.active === null || empty || profilerOutputs().length === 0 || pending;
      liveNode.card.setAttribute("aria-pressed", String(!empty && effect.active === true));
      liveNode.card.setAttribute("aria-label", empty
        ? `${effect.key}: slot vuoto`
        : `${effect.key}: ${effect.name}, ${effect.active === null ? "stato non disponibile" : effect.active ? "attivo" : "disattivato"}${freezeLabel}`);
    }
  }
  if (state.rigName) ui.syncStatus.textContent = state.tempoRaw === null
    ? "Rig sincronizzato"
    : `${session.autoSync ? "Auto sync attivo" : "Rig sincronizzato"} · Tempo ${state.bpm ?? "…"} BPM`;

  if (state.rigName && session.lastRigName === null) {
    session.lastRigName = state.rigName;
  } else if (state.rigName && state.rigName !== session.lastRigName) {
    stopTempoConfirmation();
    stopTempoTapPolling();
    stopAllEffectConfirmations();
    resetFreezeState();
    resetFixedFxState();
    if (session.rigSelectPending === null && !session.profilerProgramAwaitsName) {
      session.rigSelectedBank = null;
      session.rigSelectedSlot = null;
      refreshRigControls();
    }
    session.lastRigName = state.rigName;
    if (performance.now() > session.fullSyncUntil) scheduleRigChangeSync();
  }
});

function setConnection(status, label) {
  document.body.dataset.connected = String(status === "connected");
  ui.pill.dataset.status = status;
  ui.connectionLabel.textContent = label;
  ui.liveConnectionStatus.dataset.status = status;
  ui.liveConnectionStatus.textContent = status === "connected"
    ? window.__kemperDemo ? "● DEMO" : "● COLLEGATO"
    : label;
  ui.liveConnect.textContent = status === "connected" ? "MIDI collegato" : "Connetti MIDI";
  ui.liveSync.disabled = status !== "connected" || !session.sysex || profilerOutputs().length === 0;
}

function setAppView(view, { remember = true } = {}) {
  const next = ["full", "looper", "rig"].includes(view) ? view : "live";
  if (document.body.dataset.view === "looper" && next !== "looper") releaseAllLooperSwitches();
  document.body.dataset.view = next;
  if (next !== "live" && ui.morphLevelDetails) ui.morphLevelDetails.open = false;
  paintTunerOverlay();
  window.scrollTo(0, 0);
  for (const button of ui.viewButtons) {
    const active = button.dataset.viewButton === next;
    button.setAttribute("aria-pressed", String(active));
  }
  if (remember) {
    try { localStorage.setItem("kemper-stage-view-mode", next); } catch { /* preference is optional */ }
  }
}

function toast(message) {
  ui.toast.textContent = message;
  ui.toast.dataset.visible = "true";
  window.clearTimeout(toast.timeout);
  toast.timeout = window.setTimeout(() => { ui.toast.dataset.visible = "false"; }, 2600);
}

function describePort(port) {
  const parts = [port.name, port.manufacturer].filter(Boolean);
  return parts.length ? [...new Set(parts)].join(" · ") : "Porta MIDI senza nome";
}

function isProfilerPort(port) {
  const identity = `${port.name ?? ""} ${port.manufacturer ?? ""}`.toLowerCase();
  return identity.includes("profiler") || identity.includes("kemper");
}

function profilerOutputs() {
  return session.access ? [...session.access.outputs.values()].filter((port) => isProfilerPort(port) && port.state !== "disconnected") : [];
}

function profilerInputs() {
  return session.access ? [...session.access.inputs.values()].filter((port) => isProfilerPort(port) && port.state !== "disconnected") : [];
}

function refreshTempoControls() {
  const hasOutput = profilerOutputs().length > 0;
  const hasTempo = Number.isInteger(session.lastState?.tempoRaw);
  const pending = session.tempoPendingRaw !== null;
  ui.tempoBlock.dataset.pending = String(pending);
  ui.tempoDown.disabled = !session.sysex || !hasOutput || !hasTempo || pending;
  ui.tempoUp.disabled = !session.sysex || !hasOutput || !hasTempo || pending;
  ui.tempoRound.disabled = !session.sysex || !hasOutput || !hasTempo || pending;
  ui.liveTempoDown.disabled = ui.tempoDown.disabled;
  ui.liveTempoUp.disabled = ui.tempoUp.disabled;
  ui.liveTempoRound.disabled = ui.tempoRound.disabled;
  ui.tempoTap.disabled = !hasOutput;
  ui.liveTap.disabled = !hasOutput;
  ui.liveBpm.textContent = session.lastState?.bpm === null || session.lastState?.bpm === undefined
    ? "—"
    : session.lastState.bpm.toFixed(1);
  if (pending) {
    ui.tempoStatus.textContent = "ATTENDO KEMPER";
    ui.liveTapState.textContent = "ATTENDO KEMPER";
  } else if (!hasOutput) {
    ui.tempoStatus.textContent = "Collega il Kemper";
    ui.liveTapState.textContent = "COLLEGA IL KEMPER";
  } else if (!hasTempo) {
    ui.tempoStatus.textContent = "Sincronizza il tempo";
    ui.liveTapState.textContent = "SINCRONIZZA";
  } else if (session.tempoTapPollTimer !== null) {
    ui.tempoStatus.textContent = "TAP · ascolto tempo";
    ui.liveTapState.textContent = "ASCOLTO TEMPO";
  } else {
    ui.tempoStatus.textContent = "Tempo sincronizzato";
    ui.liveTapState.textContent = "PRONTO";
  }
}

function refreshRigControls() {
  const hasOutput = profilerOutputs().length > 0;
  const pending = session.rigSelectPending !== null;
  ui.rigControlPanel.dataset.pending = String(pending);
  ui.rigBankValue.textContent = String(session.rigTargetBank);
  ui.liveBankValue.textContent = String(session.rigTargetBank);
  ui.liveBankName.textContent = session.bankNames.get(String(session.rigTargetBank)) ?? "";
  ui.rigBankDown.disabled = pending || session.rigTargetBank <= 1;
  ui.rigBankUp.disabled = pending || session.rigTargetBank >= 10;
  ui.liveBankDown.disabled = pending || session.rigTargetBank <= 1;
  ui.liveBankUp.disabled = pending || session.rigTargetBank >= 10;
  for (const button of ui.rigSlots) {
    const slot = Number(button.dataset.rigSlot);
    const active = session.rigSelectedBank === session.rigTargetBank && session.rigSelectedSlot === slot;
    button.disabled = !hasOutput || !session.sysex || pending;
    button.dataset.active = String(active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", `Carica Bank ${session.rigTargetBank}, Rig ${slot}`);
  }
  for (const button of ui.liveRigSlots) {
    const slot = Number(button.dataset.liveRigSlot);
    const active = session.rigSelectedBank === session.rigTargetBank && session.rigSelectedSlot === slot;
    const rigName = session.rigNames.get(`${session.rigTargetBank}:${slot}`);
    const slotName = session.slotNames.get(`${session.rigTargetBank}:${slot}`);
    const name = slotName ?? rigName;
    button.disabled = !hasOutput || !session.sysex || pending;
    button.dataset.active = String(active);
    button.dataset.pending = String(pending && session.rigSelectPending.slot === slot);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", `Carica Bank ${session.rigTargetBank}, Rig ${slot}${name ? `, ${name}` : ""}`);
    button.querySelector("span").textContent = name || `RIG ${slot}`;
    button.querySelector("small").textContent = slotName && rigName && rigName !== slotName ? rigName : "";
  }
  if (pending) {
    ui.rigControlStatus.textContent = `ATTENDO · BANK ${pending.bank} · RIG ${pending.slot}`;
  } else if (!hasOutput) {
    ui.rigControlStatus.textContent = "Collega il Kemper";
  } else if (!session.sysex) {
    ui.rigControlStatus.textContent = "Autorizza SysEx";
  } else if (session.rigSelectedBank === session.rigTargetBank) {
    ui.rigControlStatus.textContent = `BANK ${session.rigSelectedBank} · RIG ${session.rigSelectedSlot}`;
  } else if (session.rigSelectedBank !== null) {
    ui.rigControlStatus.textContent = `ATTUALE ${session.rigSelectedBank}/${session.rigSelectedSlot} · scegli Bank ${session.rigTargetBank}`;
  } else {
    ui.rigControlStatus.textContent = `RIG NON RILEVATO · scegli Bank ${session.rigTargetBank}`;
  }
  ui.liveRigStatus.textContent = ui.rigControlStatus.textContent;
  ui.liveRigPosition.textContent = pending
    ? `→ BANK ${pending.bank} · RIG ${pending.slot}`
    : session.rigSelectedBank !== null
      ? `BANK ${session.rigSelectedBank} · RIG ${session.rigSelectedSlot}`
      : "BANK — · RIG —";
}

function stopRigSelectionConfirmation() {
  window.clearInterval(session.rigSelectPollTimer);
  window.clearTimeout(session.rigSelectTimeout);
  session.rigSelectPollTimer = null;
  session.rigSelectTimeout = null;
  session.rigSelectAwaitingReply = false;
  session.rigSelectPending = null;
  refreshRigControls();
}

function requestRigSelectionConfirmation() {
  session.rigSelectPollsSent += 1;
  session.rigSelectAwaitingReply = true;
  sendProfilerRequests([buildRigNameRequest()], { record: false });
}

function refreshRigControlsOnBankNames(decoded) {
  if (decoded?.type === "Program Change") refreshRigControls();
}

function handleRigSelectionState(decoded) {
  if (decoded?.type !== "Kemper String" || decoded.page !== 0x00 || decoded.parameter !== 0x01) return;
  if (session.rigSelectPollTimer === null || session.rigSelectPending === null || !session.rigSelectAwaitingReply) return;
  session.rigSelectRepliesReceived += 1;
  const pending = session.rigSelectPending;
  session.rigSelectedBank = pending.bank;
  session.rigSelectedSlot = pending.slot;
  rememberRigName(pending.bank, pending.slot, decoded.text);
  session.rigSelectConfirmedAt = new Date().toISOString();
  session.rigSelectLastCommand = { ...session.rigSelectLastCommand, confirmedRigName: decoded.text };
  stopRigSelectionConfirmation();
  ui.program.textContent = `Bank ${pending.bank} · Rig ${pending.slot}`;
  toast(`Bank ${pending.bank} · Rig ${pending.slot} · ${decoded.text}`);
  if (document.body.dataset.view === "rig") setAppView("live");
  window.setTimeout(() => requestProfilerState({ silent: true, force: true }), 120);
}

function trackProfilerRig(decoded) {
  if (decoded?.type === "Program Change") {
    if (!Number.isInteger(decoded.program) || decoded.program < 0 || decoded.program >= 50) return;
    const bank = Math.floor(decoded.program / 5) + 1;
    const slot = decoded.program % 5 + 1;
    const list = session.pendingBankList;
    if (list && performance.now() - list.at < 1500) {
      rememberBankList(bank, list);
      session.pendingBankList = null;
    }
    if (session.rigSelectPending !== null) {
      if (session.rigSelectPending.bank === bank && session.rigSelectPending.slot === slot) return;
      stopRigSelectionConfirmation();
    }
    const previousProgramAt = session.lastProfilerProgramAt;
    session.lastProfilerProgramAt = performance.now();
    session.profilerProgramAwaitsName = true;
    session.rigSelectedBank = bank;
    session.rigSelectedSlot = slot;
    session.rigTargetBank = bank;
    const recentName = session.lastProfilerRigNameEvent;
    if (recentName && session.lastProfilerProgramAt - recentName.at < 250
      && session.lastProfilerProgramAt >= recentName.at && recentName.at - previousProgramAt > 1000) {
      rememberRigName(bank, slot, recentName.name);
      session.profilerProgramAwaitsName = false;
    }
    refreshRigControls();
    return;
  }
  if (decoded?.type === "Kemper String" && decoded.page === 0x00 && decoded.parameter === 0x01) {
    const now = performance.now();
    session.lastProfilerRigNameEvent = { name: decoded.text, at: now };
    if (session.rigSelectedBank !== null && now - session.lastProfilerProgramAt < 1000) {
      rememberRigName(session.rigSelectedBank, session.rigSelectedSlot, decoded.text);
      session.profilerProgramAwaitsName = false;
      refreshRigControls();
    }
  }
}

function stopTempoConfirmation() {
  window.clearInterval(session.tempoConfirmPollTimer);
  window.clearTimeout(session.tempoConfirmTimeout);
  session.tempoConfirmPollTimer = null;
  session.tempoConfirmTimeout = null;
  session.tempoPendingRaw = null;
  refreshTempoControls();
}

function stopTempoTapPolling() {
  window.clearInterval(session.tempoTapPollTimer);
  window.clearTimeout(session.tempoTapPollTimeout);
  session.tempoTapPollTimer = null;
  session.tempoTapPollTimeout = null;
  ui.tempoBlock.dataset.tapping = "false";
  refreshTempoControls();
}

function requestTempoConfirmation() {
  session.tempoPollsSent += 1;
  sendProfilerRequests([buildTempoRequest()], { record: false });
}

function handleTempoState(decoded) {
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

function refreshEffectButton(page) {
  const node = effectNodes.get(page);
  const liveNode = liveEffectNodes.get(page);
  const effect = session.lastState?.effects.get(page);
  if (!node) return;
  const pending = session.effectPending.has(page);
  node.card.dataset.pending = String(pending);
  node.status.textContent = pending
    ? "ATTENDO"
    : effect?.active === null || effect?.active === undefined
      ? "—"
      : effect.active ? "ON" : "OFF";
  node.card.disabled = pending
    || !session.sysex
    || profilerOutputs().length === 0
    || effect?.active === null
    || effect?.active === undefined;
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

function stopAllEffectConfirmations() {
  for (const page of [...session.effectPending.keys()]) stopEffectConfirmation(page);
}

function handleEffectState(decoded) {
  if (decoded?.type !== "Kemper Parameter" || decoded.parameter !== 0x03) return;
  const pending = session.effectPending.get(decoded.page);
  if (!pending || (decoded.value > 0) !== pending.target) return;
  stopEffectConfirmation(decoded.page);
  toast(`${pending.key} ${pending.target ? "attivato" : "disattivato"} · confermato dal Kemper`);
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
  ui.looperProbe.disabled = profilerOutputs().length === 0 || !session.sysex;
  ui.morphProbe.disabled = profilerOutputs().length === 0 || session.morphPendingLevel !== null;
  refreshLiveMorphControls();
  refreshLooperControls();
  ui.tunerControl.disabled = profilerOutputs().length === 0 || session.tunerPendingMode !== null;
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

function refreshFreezeControls() {
  const hasOutput = profilerOutputs().length > 0;
  const canControl = hasOutput && session.sysex;
  const pending = session.freezeRevPending !== null;
  const known = session.freezeRevSupported === true
    && (session.freezeRevRaw === 0 || session.freezeRevRaw === 1);
  const active = known && session.freezeRevRaw > 0;
  const revNode = effectNodes.get(0x3d);
  const liveRevNode = liveEffectNodes.get(0x3d);

  ui.freezePanel.dataset.supported = session.freezeRevSupported === null
    ? "unknown"
    : String(session.freezeRevSupported);
  ui.freezePanel.dataset.active = known ? String(active) : "unknown";
  ui.freezePanel.dataset.pending = String(pending);
  ui.freezeAddress.textContent = `REV Hold · Page ${FREEZE_REV_HOLD.address}`;
  ui.freezeRev.disabled = !canControl || !known || pending;
  ui.freezeRev.setAttribute("aria-pressed", String(active));
  ui.freezeRev.textContent = pending
    ? "ATTENDO KEMPER"
    : active ? "Disattiva Freeze REV" : "Attiva Freeze REV";
  ui.liveFreeze.dataset.active = known ? String(active) : "unknown";
  ui.liveFreeze.dataset.pending = String(pending);
  ui.liveFreeze.disabled = !canControl || !known || pending;
  ui.liveFreeze.setAttribute("aria-pressed", String(active));
  ui.liveFreeze.setAttribute("aria-label", known
    ? `Freeze REV ${active ? "attivo" : "disattivato"}`
    : "Freeze REV: stato non disponibile");
  ui.liveFreezeState.textContent = pending
    ? "ATTENDO KEMPER"
    : session.freezeRevSupported === false
      ? "NON DISPONIBILE"
      : known ? active ? "ON" : "OFF" : "IN LETTURA";
  if (revNode) {
    revNode.card.dataset.freeze = known ? String(active) : "unknown";
    if (revNode.hold) {
      revNode.hold.textContent = pending
        ? "FREEZE · ATTENDO"
        : active ? "FREEZE ON" : "TIENI PREMUTO · FREEZE";
    }
  }
  if (liveRevNode) {
    const revEffect = session.lastState?.effects.get(0x3d);
    liveRevNode.card.dataset.freeze = known ? String(active) : "unknown";
    if (!session.effectPending.has(0x3d)) {
      liveRevNode.status.textContent = active
        ? "FREEZE ON"
        : revEffect?.active === null || revEffect?.active === undefined
          ? "—"
          : revEffect.active ? "ON" : "OFF";
    }
  }

  if (pending) {
    ui.freezeStatus.textContent = `ATTENDO · REV ${session.freezeRevPending ? "ON" : "OFF"}`;
  } else if (!hasOutput) {
    ui.freezeStatus.textContent = "Collega il Kemper";
  } else if (!session.sysex) {
    ui.freezeStatus.textContent = "Autorizza SysEx";
  } else if (session.freezeRevSupported === false) {
    ui.freezeStatus.textContent = Number.isInteger(session.freezeRevRaw)
      ? `Risposta inattesa: ${session.freezeRevRaw} · comando bloccato`
      : "REV Hold non disponibile";
  } else if (known) {
    ui.freezeStatus.textContent = `REV Freeze ${active ? "ON" : "OFF"} · sincronizzato`;
  } else {
    ui.freezeStatus.textContent = "Lettura stato REV…";
  }
}

function resetFreezeState() {
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

function beginRevHoldProbe({ pendingTarget = null, record = true } = {}) {
  stopFreezeProbe({ keepPending: pendingTarget !== null });
  session.freezeRevPending = pendingTarget;
  if (pendingTarget === null) {
    session.freezeRevSupported = null;
    session.freezeRevRaw = null;
  }
  refreshFreezeControls();
  requestRevHoldProbe({ record });
  session.freezeProbePollTimer = window.setInterval(() => requestRevHoldProbe(), 400);
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

function handleFreezeState(decoded) {
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

function toggleRevFreeze() {
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

function refreshFixedFxControls() {
  const hasOutput = profilerOutputs().length > 0;
  const canControl = hasOutput && session.sysex;
  let knownCount = 0;
  let unsupportedCount = 0;

  for (const effect of FIXED_FX) {
    const node = fixedFxNodes.get(effect.key);
    const liveNode = liveFixedFxNodes.get(effect.key);
    const current = session.fixedFxState.get(effect.key);
    if (!node || !current) continue;
    const pending = session.fixedFxPending.has(effect.key);
    const known = current.supported === true && (current.raw === 0 || current.raw === 1);
    const active = known && current.raw > 0;
    if (known) knownCount += 1;
    if (current.supported === false) unsupportedCount += 1;
    node.button.dataset.active = known ? String(active) : "unknown";
    node.button.dataset.pending = String(pending);
    node.button.disabled = !canControl || !known || pending;
    node.button.setAttribute("aria-pressed", String(active));
    node.button.setAttribute(
      "aria-label",
      `${effect.label}: ${pending ? "in attesa del Kemper" : known ? active ? "attivo" : "disattivato" : "stato non disponibile"}`,
    );
    node.state.textContent = pending
      ? "ATTENDO KEMPER"
      : current.supported === false
        ? "NON DISPONIBILE"
        : known ? active ? "ON" : "OFF" : "IN LETTURA";
    if (liveNode) {
      liveNode.button.dataset.active = known ? String(active) : "unknown";
      liveNode.button.dataset.pending = String(pending);
      liveNode.button.disabled = !canControl || !known || pending;
      liveNode.button.setAttribute("aria-pressed", String(active));
      liveNode.button.setAttribute(
        "aria-label",
        `${effect.label}: ${pending ? "in attesa del Kemper" : known ? active ? "attivo" : "disattivato" : "stato non disponibile"}`,
      );
      liveNode.state.textContent = node.state.textContent;
    }
  }

  if (!hasOutput) {
    ui.fixedFxStatus.textContent = "Collega il Kemper";
  } else if (!session.sysex) {
    ui.fixedFxStatus.textContent = "Autorizza SysEx";
  } else if (session.fixedFxPending.size) {
    ui.fixedFxStatus.textContent = `ATTENDO · ${session.fixedFxPending.size} comando${session.fixedFxPending.size > 1 ? "i" : ""}`;
  } else if (knownCount === FIXED_FX.length) {
    ui.fixedFxStatus.textContent = `${knownCount}/${FIXED_FX.length} sincronizzati`;
  } else if (unsupportedCount) {
    ui.fixedFxStatus.textContent = `${knownCount}/${FIXED_FX.length} disponibili · ${unsupportedCount} non validi`;
  } else {
    ui.fixedFxStatus.textContent = `Lettura stato · ${knownCount}/${FIXED_FX.length}`;
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

function stopAllFixedFxConfirmations() {
  for (const effect of FIXED_FX) stopFixedFxConfirmation(effect.key);
}

function resetFixedFxState() {
  stopAllFixedFxConfirmations();
  session.fixedFxState = new Map(FIXED_FX.map((effect) => [effect.key, {
    raw: null,
    supported: null,
    confirmedAt: null,
  }]));
  refreshFixedFxControls();
}

function requestFixedFxState(effects = FIXED_FX, { record = false } = {}) {
  if (!session.sysex || !profilerOutputs().length) return;
  session.fixedFxPollsSent += effects.length;
  sendProfilerRequests(buildFixedFxStateRequests(effects), { record });
}

function beginFixedFxConfirmation(effect, target) {
  stopFixedFxConfirmation(effect.key, { keepPending: true });
  session.fixedFxPending.set(effect.key, target);
  refreshFixedFxControls();
  const poll = () => requestFixedFxState([effect]);
  poll();
  const interval = window.setInterval(poll, 400);
  const timeout = window.setTimeout(() => {
    stopFixedFxConfirmation(effect.key);
    toast(`${effect.label}: comando non confermato dal Kemper`);
  }, 2800);
  session.fixedFxPollTimers.set(effect.key, { interval, timeout });
}

function handleFixedFxState(decoded) {
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

function addLog(decoded, sourceName) {
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

function shouldLog(decoded) {
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

function pulseTempo() {
  ui.tempoBlock.dataset.pulse = "true";
  clearTimeout(pulseTempo.timeout);
  pulseTempo.timeout = setTimeout(() => {
    delete ui.tempoBlock.dataset.pulse;
  }, 130);
}

function refreshLiveMorphControls() {
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
  const mode = percent === 0 ? "BASE" : percent === 100 ? "MORPH" : "TRANSIZIONE";
  session.performanceState.morphLevel = percent;
  session.performanceState.morphMode = mode;
  session.performanceState.morphSource = sourceName;
  ui.morphCard.dataset.active = String(percent > 0);
  ui.morphPercent.textContent = `${percent}%`;
  ui.morphMode.textContent = mode;
  ui.morphFill.style.width = `${percent}%`;
  ui.morphMeter.setAttribute("aria-valuenow", String(percent));
  ui.morphSource.textContent = `Segnale ricevuto da ${sourceName}`;
  ui.liveMorph.dataset.active = String(percent > 0);
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
  ui.morphCard.dataset.active = "unknown";
  ui.morphPercent.textContent = "—";
  ui.morphMode.textContent = "DA ALLINEARE";
  ui.morphFill.style.width = "0%";
  ui.morphMeter.setAttribute("aria-valuenow", "0");
  ui.morphSource.textContent = message;
  ui.liveMorph.dataset.active = "unknown";
  ui.liveMorphMode.textContent = "IN LETTURA";
  ui.liveMorphPercent.textContent = "—";
  ui.liveMorphFill.style.width = "0%";
  ui.liveMorphMeter.removeAttribute("aria-valuenow");
  ui.liveMorphSlider.value = "0";
  ui.liveMorphTarget.textContent = "0%";
  refreshLiveMorphControls();
  ui.morphProbe.textContent = "Allinea BASE";
  ui.morphProbe.setAttribute("aria-pressed", "false");
  ui.morphProbe.disabled = profilerOutputs().length === 0;
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

function confirmMorphLevel(rawValue, sourceName) {
  const raw = Math.max(0, Math.min(16383, rawValue));
  const percent = raw / 16383 * 100;
  const pending = session.morphPendingLevel;
  const reachedTarget = pending === null
    || Math.abs(raw - Math.round(pending / 127 * 16383)) <= 129;

  session.morphConfirmedRaw = raw;
  session.morphConfirmedAt = new Date().toISOString();
  renderMorph(percent, sourceName);

  if (!reachedTarget) {
    ui.morphSource.textContent = `Transizione confermata dal Kemper · ${Math.round(percent)}%.`;
    return;
  }

  stopMorphConfirmation();
  session.morphPendingLevel = null;
  session.morphCommandLevel = Math.round(raw / 16383 * 127);
  const isMorph = raw > 0;
  ui.morphSource.textContent = raw === 0
    ? "BASE confermata dal Kemper · pronto per attivare MORPH."
    : raw >= 16382
      ? "MORPH confermato dal Kemper · pronto per tornare a BASE."
      : `Livello Morph confermato dal Kemper · ${Math.round(percent)}%.`;
  ui.morphProbe.textContent = isMorph ? "Torna a BASE" : "Attiva MORPH";
  ui.morphProbe.setAttribute("aria-pressed", String(isMorph));
  ui.morphProbe.disabled = profilerOutputs().length === 0;
  refreshLiveMorphControls();
  if (pending !== null) toast(isMorph ? "MORPH confermato dal Kemper" : "BASE confermata dal Kemper");
}

function handleMorphState(decoded, sourceName) {
  if (decoded?.type === "Kemper String" && decoded.page === 0x00 && decoded.parameter === 0x01) {
    if (decoded.text !== session.morphControlRig) resetMorphControl(decoded.text);
    return;
  }
  if (decoded?.type === "Kemper Parameter" && decoded.page === 0x00 && decoded.parameter === 0x0b) {
    confirmMorphLevel(decoded.value, sourceName);
  }
}

function midiNoteName(note) {
  const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  const name = names[note % 12];
  return `${name}${Math.floor(note / 12) - 1}`;
}

function renderTuner(active, sourceName) {
  session.performanceState.tunerActive = active;
  session.performanceState.tunerSource = sourceName;
  ui.tunerCard.dataset.active = String(active);
  ui.tunerStatus.textContent = active ? "ON" : "OFF";
  ui.tunerControl.textContent = active ? "Chiudi Tuner" : "Apri Tuner";
  ui.tunerControl.setAttribute("aria-pressed", String(active));
  ui.tunerControl.disabled = profilerOutputs().length === 0 || session.tunerPendingMode !== null;
  ui.liveTuner.dataset.active = String(active);
  ui.liveTuner.disabled = profilerOutputs().length === 0 || session.tunerPendingMode !== null;
  ui.liveTuner.setAttribute("aria-pressed", String(active));
  ui.liveTuner.setAttribute("aria-label", active ? "Chiudi accordatore" : "Apri accordatore");
  ui.liveTunerState.textContent = session.tunerPendingMode !== null
    ? "ATTENDO KEMPER"
    : active ? "ON" : "OFF";
  if (!active) {
    ui.tunerNote.textContent = "CHIUSO";
    ui.tunerCard.dataset.zone = "waiting";
    ui.tunerGauge.style.setProperty("--tuner-position", "50");
    ui.tunerGauge.setAttribute("aria-valuenow", "0");
    ui.tunerCents.textContent = "—";
    ui.tunerRaw.textContent = "—";
    ui.tunerSignal.textContent = "—";
    ui.liveTunerNote.textContent = "APRI";
  }
  else if (active && !session.performanceState.tunerCandidateNote) {
    ui.tunerNote.textContent = "SUONA UNA CORDA";
    ui.liveTunerNote.textContent = "SUONA";
  }
  paintTunerOverlay();
  ui.tunerHint.textContent = active
    ? "Accordatore aperto · lettura diretta dal Profiler."
    : `Accordatore chiuso · ultimo segnale da ${sourceName}`;
}

function paintTunerOverlay() {
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

function stopTunerConfirmation() {
  window.clearInterval(session.tunerConfirmPollTimer);
  window.clearTimeout(session.tunerConfirmTimeout);
  session.tunerConfirmPollTimer = null;
  session.tunerConfirmTimeout = null;
}

function confirmTunerCommand(mode) {
  if (session.tunerPendingMode !== mode) return;
  stopTunerConfirmation();
  session.tunerPendingMode = null;
  ui.tunerControl.disabled = profilerOutputs().length === 0;
  ui.liveTuner.disabled = profilerOutputs().length === 0;
  ui.liveTunerState.textContent = mode === "open" ? "ON" : "OFF";
  paintTunerOverlay();
  toast(mode === "open" ? "Tuner aperto dal Kemper" : "Tuner chiuso dal Kemper");
}

function stopTunerStreamPolling() {
  window.clearInterval(session.tunerStreamTimer);
  session.tunerStreamTimer = null;
}

function startTunerStreamPolling() {
  if (session.tunerStreamTimer !== null) return;
  const poll = () => {
    sendProfilerRequests(buildTunerStreamRequests(), { record: false });
    session.tunerStreamPollsSent += 1;
  };
  poll();
  session.tunerStreamTimer = window.setInterval(poll, TUNER_STREAM_INTERVAL);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
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
  const position = Math.max(0, Math.min(100, cents + 50));
  const zone = Math.abs(cents) <= 3 ? "in-tune" : cents < 0 ? "flat" : "sharp";

  session.performanceState.tunerSignalRaw = Math.round(smoothedRaw);
  session.performanceState.tunerCents = rounded;
  session.performanceState.tunerZone = zone;
  ui.tunerCard.dataset.zone = zone;
  ui.tunerGauge.style.setProperty("--tuner-position", String(position));
  ui.tunerGauge.setAttribute("aria-valuenow", String(Math.max(-50, Math.min(50, rounded))));
  ui.tunerCents.textContent = zone === "in-tune"
    ? `CENTRATA · ${rounded > 0 ? "+" : ""}${rounded} cent`
    : `${rounded > 0 ? "+" : ""}${rounded} cent`;
  ui.liveTunerState.textContent = zone === "in-tune"
    ? "CENTRATA"
    : `${rounded > 0 ? "+" : ""}${rounded} CENT`;
  paintTunerOverlay();
  ui.tunerHint.textContent = zone === "in-tune"
    ? "Intonazione centrata."
    : zone === "flat"
      ? "Nota calante · aumenta leggermente la tensione."
      : "Nota crescente · diminuisci leggermente la tensione.";
}

function handlePerformanceControl(decoded, sourceName) {
  if (decoded?.type !== "Control Change") return;
  if (decoded.controller === 11) {
    const raw = Math.round(Math.max(0, Math.min(127, decoded.value)) / 127 * 16383);
    confirmMorphLevel(raw, sourceName);
  }
  if (decoded.controller === 31) {
    renderTuner(decoded.value > 0, sourceName);
  }
}

function isTunerStream(decoded) {
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

function paintStableNotes() {
  const recent = [...session.tunerStableNotes.values()]
    .sort((a, b) => a.lastSeenAt.localeCompare(b.lastSeenAt))
    .slice(-6)
    .map((item) => item.note);
  ui.tunerHistory.textContent = recent.length ? recent.join(" · ") : "—";
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
    ui.tunerCard.dataset.zone = "waiting";
    ui.tunerCents.textContent = "—";
  }
  session.performanceState.tunerCandidateNote = stableName;
  session.performanceState.tunerCandidateRaw = stableValue;
  updateNoteRecord(session.tunerStableNotes, stableValue);
  paintStableNotes();
  ui.tunerNote.textContent = stableName;
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
  ui.tunerSignal.textContent = String(decoded.value);
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

function captureTunerMode(decoded, sourceName) {
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
    ui.tunerRaw.textContent = "—";
    ui.tunerSignal.textContent = "—";
    ui.tunerCents.textContent = "—";
    ui.tunerCard.dataset.zone = "waiting";
    ui.tunerGauge.style.setProperty("--tuner-position", "50");
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

function handleTunerStream(decoded, sourceName) {
  if (!isTunerStream(decoded)) return;
  session.tunerStreamRepliesReceived += 1;
  if (decoded.page === 0x7d && decoded.parameter === 0x54) {
    if (session.performanceState.tunerMode !== "open") return;
    processTunerNote(decoded.value);
    ui.tunerRaw.textContent = String(decoded.value);
  } else {
    captureTunerSignal(decoded);
  }
}

function attachInputs() {
  for (const input of session.access.inputs.values()) {
    if (input.state === "disconnected") continue;
    input.onmidimessage = (event) => {
      // Controller and virtual ports may emit PC/CC; only the Profiler owns app state.
      if (!isProfilerPort(input)) return;
      const sourceName = describePort(input);
      const decoded = kemper.ingest(event);
      handleBankNames(decoded);
      captureLooperProbe(decoded);
      trackProfilerRig(decoded);
      refreshRigControlsOnBankNames(decoded);
      handlePerformanceControl(decoded, sourceName);
      handleMorphState(decoded, sourceName);
      handleEffectState(decoded);
      handleTempoState(decoded);
      handleRigSelectionState(decoded);
      handleFreezeState(decoded);
      handleFixedFxState(decoded);
      handleTunerStream(decoded, sourceName);
      captureTunerMode(decoded, sourceName);
      if (decoded?.type === "Kemper Parameter" && decoded.page === 0x7c && decoded.parameter === 0x00 && decoded.value === 1) {
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

async function keepScreenOn() {
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

async function connect() {
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
        ui.syncStatus.textContent = "Kemper scollegato · dati precedenti";
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

function sendProfilerRequests(requests, { record = true } = {}) {
  if (!session.access || !session.sysex) return;
  const outputs = profilerOutputs();
  if (!outputs.length) return;
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

  window.setTimeout(requestTempoConfirmation, 150);
  session.tempoConfirmPollTimer = window.setInterval(requestTempoConfirmation, 400);
  session.tempoConfirmTimeout = window.setTimeout(() => {
    stopTempoConfirmation();
    ui.tempoStatus.textContent = "NON CONFERMATO";
    toast("Il Kemper non ha confermato il nuovo tempo");
  }, 3000);
  ui.copy.disabled = false;
}

function changeTempoBy(delta) {
  const currentRaw = session.lastState?.tempoRaw;
  if (!Number.isInteger(currentRaw)) {
    toast("Sincronizza prima il tempo del Kemper");
    return;
  }
  const direction = delta > 0 ? "+1" : "−1";
  setTempoRaw(currentRaw + delta * TEMPO_UNITS_PER_BPM, {
    action: "step",
    delta,
    transmitLabel: `Tempo ${direction} BPM`,
    confirmationLabel: `Tempo ${direction} BPM`,
  });
}

function roundTempoToInteger() {
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
  ui.tempoBlock.dataset.tapping = "true";
  refreshTempoControls();
}

function tapTempo() {
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

function changeRigTargetBank(delta) {
  if (session.rigSelectPending !== null) return;
  session.rigTargetBank = Math.max(1, Math.min(10, session.rigTargetBank + delta));
  refreshRigControls();
}

function selectRigSlot(slot) {
  const outputs = profilerOutputs();
  if (!outputs.length) {
    toast("Collega prima il Profiler");
    return;
  }
  if (!Number.isInteger(slot) || slot < 1 || slot > 5) return;

  stopRigSelectionConfirmation();
  resetFreezeState();
  resetFixedFxState();
  const bank = session.rigTargetBank;
  const program = (bank - 1) * 5 + (slot - 1);
  const channel = Math.max(1, Math.min(16, session.lastState?.channel ?? 1));
  const bytes = [0xc0 | (channel - 1), program];
  const time = new Date().toISOString();
  const command = { time, bank, slot, channel, program, displayedProgram: program + 1 };
  session.rigSelectPending = command;
  session.rigSelectLastCommand = command;
  for (const output of outputs) {
    output.send(bytes);
    session.transmitted.push({
      time,
      output: describePort(output),
      label: `Bank ${bank} · Rig ${slot} (PC ${program + 1})`,
      hex: bytesToHex(bytes),
    });
  }
  session.transmitted = session.transmitted.slice(-100);
  refreshRigControls();

  window.setTimeout(requestRigSelectionConfirmation, 150);
  session.rigSelectPollTimer = window.setInterval(requestRigSelectionConfirmation, 400);
  session.rigSelectTimeout = window.setTimeout(() => {
    const target = session.rigSelectPending;
    stopRigSelectionConfirmation();
    ui.rigControlStatus.textContent = "CAMBIO NON CONFERMATO";
    toast(`Il Kemper non ha confermato Bank ${target?.bank} · Rig ${target?.slot}`);
  }, 3000);
  ui.copy.disabled = false;
}

function requestProfilerState({ silent = false, force = false } = {}) {
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
  }
  ui.syncStatus.textContent = "Richiesta inviata al Profiler…";
  if (!silent) toast("Sincronizzazione inviata al Profiler");
}

function scheduleRigChangeSync() {
  window.clearTimeout(session.rigChangeSyncTimer);
  session.rigChangeSyncTimer = window.setTimeout(() => requestProfilerState({ silent: true }), 240);
}

function pollProfilerState() {
  if (!session.autoSync || document.visibilityState !== "visible") return;
  sendProfilerRequests(buildProfilerPollRequests(), { record: false });
  // Keep the four fixed effects aligned when hardware or another MIDI controller changes them.
  // Confirmation polling already owns an effect while an app command is pending.
  const now = performance.now();
  if (now - session.lastFixedFxAutoPollAt >= FIXED_FX_SYNC_INTERVAL) {
    session.lastFixedFxAutoPollAt = now;
    const available = FIXED_FX.filter((effect) => !session.fixedFxPending.has(effect.key));
    if (available.length) requestFixedFxState(available);
  }
}

function startAutoSync() {
  window.clearInterval(session.autoSyncTimer);
  if (!session.autoSync) return;
  session.autoSyncTimer = window.setInterval(pollProfilerState, AUTO_SYNC_INTERVAL);
  ui.auto.setAttribute("aria-pressed", "true");
  ui.auto.textContent = "Auto sync: ON";
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

  const requestConfirmation = () => sendProfilerRequests(buildEffectStateRequests([module.page]), { record: false });
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

function sendMorphCommand(value) {
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
  ui.morphMode.textContent = "ATTENDO KEMPER";
  ui.liveMorphMode.textContent = "ATTENDO KEMPER";
  ui.morphSource.textContent = value === 0
    ? "Comando BASE inviato · attendo la conferma del Kemper…"
    : "Comando MORPH inviato · attendo la conferma del Kemper…";
  ui.morphProbe.textContent = "Conferma in corso…";
  ui.morphProbe.disabled = true;
  refreshLiveMorphControls();
  ui.copy.disabled = false;

  const requestConfirmation = () => sendProfilerRequests([buildMorphLevelRequest()], { record: false });
  window.setTimeout(requestConfirmation, 180);
  session.morphConfirmPollTimer = window.setInterval(requestConfirmation, 450);
  session.morphConfirmTimeout = window.setTimeout(() => {
    stopMorphConfirmation();
    session.morphPendingLevel = null;
    ui.morphMode.textContent = "NON CONFERMATO";
    ui.liveMorphMode.textContent = "NON CONFERMATO";
    ui.morphSource.textContent = "Il comando è stato inviato, ma il Kemper non ha confermato lo stato.";
    ui.morphProbe.textContent = session.morphConfirmedRaw !== null && session.morphConfirmedRaw > 0
      ? "Torna a BASE"
      : "Allinea BASE";
    ui.morphProbe.disabled = profilerOutputs().length === 0;
    refreshLiveMorphControls();
    toast("Nessuna conferma dal Kemper");
  }, 3000);
}

function sendTunerCommand(open) {
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
  ui.tunerStatus.textContent = "ATTENDO";
  ui.tunerHint.textContent = open
    ? "Comando di apertura inviato · attendo la conferma del Kemper…"
    : "Comando di chiusura inviato · attendo la conferma del Kemper…";
  ui.tunerControl.textContent = "Conferma in corso…";
  ui.tunerControl.disabled = true;
  ui.liveTuner.disabled = true;
  ui.liveTunerState.textContent = "ATTENDO KEMPER";
  ui.copy.disabled = false;
  paintTunerOverlay();

  const requestConfirmation = () => sendProfilerRequests([buildTunerModeRequest()], { record: false });
  window.setTimeout(requestConfirmation, 180);
  session.tunerConfirmPollTimer = window.setInterval(requestConfirmation, 450);
  session.tunerConfirmTimeout = window.setTimeout(() => {
    stopTunerConfirmation();
    session.tunerPendingMode = null;
    ui.tunerStatus.textContent = "NON CONFERMATO";
    ui.tunerHint.textContent = "Il comando è stato inviato, ma il Kemper non ha confermato lo stato Tuner.";
    ui.tunerControl.textContent = session.performanceState.tunerMode === "open" ? "Chiudi Tuner" : "Apri Tuner";
    ui.tunerControl.disabled = profilerOutputs().length === 0;
    ui.liveTuner.disabled = profilerOutputs().length === 0;
    ui.liveTunerState.textContent = "NON CONFERMATO";
    paintTunerOverlay();
    toast("Nessuna conferma Tuner dal Kemper");
  }, 3000);
}

function toggleTunerFromApp() {
  sendTunerCommand(session.performanceState.tunerMode !== "open");
}

function toggleMorphFromApp() {
  const target = session.morphConfirmedRaw === null || session.morphConfirmedRaw > 0 ? 0 : 127;
  sendMorphCommand(target);
}

const LOOPER_SWITCHES = {
  record: { parameter: 88, label: "REC / PLAY / OVERDUB" },
  stop: { parameter: 89, label: "STOP" },
  trigger: { parameter: 90, label: "TRIGGER" },
  reverse: { parameter: 91, label: "REVERSE" },
  half: { parameter: 92, label: "½ SPEED" },
  undo: { parameter: 93, label: "UNDO / REDO" },
  erase: { parameter: 94, label: "CANCELLA LOOP" },
};
const looperSwitchReleases = new Set();
const LOOPER_LABELS = {
  empty: "LOOP VUOTO",
  recording: "REGISTRAZIONE",
  playing: "RIPRODUZIONE",
  overdub: "OVERDUB",
  stopped: "FERMO",
};
const LOOPER_HALF_KEY = "kemper-stage-view-looper-half";
const looper = { state: "empty", since: 0, loopLength: null, stopPresses: 0, reverse: false, half: false, timer: null };
try { looper.half = localStorage.getItem(LOOPER_HALF_KEY) === "1"; } catch { /* facoltativo */ }
const QUANTIZE_KEY = "kemper-stage-view-looper-quantize";
const QUANTIZE_MODES = {
  off: { label: "OFF", beats: 0 },
  beat: { label: "MOVIMENTO", beats: 1 },
  bar4: { label: "BATTUTA 4/4", beats: 4 },
  bar3: { label: "BATTUTA 3/4", beats: 3 },
};
looper.quantize = "off";
looper.pendingClose = null;
try {
  const stored = localStorage.getItem(QUANTIZE_KEY);
  if (stored in QUANTIZE_MODES) looper.quantize = stored;
} catch { /* facoltativo */ }

function currentBpm() {
  const raw = session.lastState?.tempoRaw;
  return Number.isInteger(raw) && raw > 0 ? raw / TEMPO_UNITS_PER_BPM : null;
}

function beatsPerBar() {
  return looper.quantize === "bar3" ? 3 : 4;
}

function setQuantizeMode(mode) {
  if (!(mode in QUANTIZE_MODES)) return;
  looper.quantize = mode;
  try { localStorage.setItem(QUANTIZE_KEY, mode); } catch { /* facoltativo */ }
  paintLooperState();
}

// Chiusura del primo giro agganciata al tempo: il Player non quantizza,
// quindi l'app ritarda il comando REC fino alla fine della battuta/movimento in corso.
function planQuantizedClose() {
  const mode = QUANTIZE_MODES[looper.quantize];
  const bpm = currentBpm();
  if (!mode.beats || looper.state !== "recording" || !bpm) return null;
  const beatMs = 60000 / bpm;
  const gridMs = beatMs * mode.beats;
  const elapsed = performance.now() - looper.since;
  // Tocco in ritardo fino a mezzo movimento (max 250 ms): chiudi subito invece di aggiungere un giro.
  const lateTolerance = Math.min(beatMs * 0.5, 250);
  const units = Math.max(1, Math.ceil((elapsed - lateTolerance) / gridMs));
  const target = units * gridMs;
  return { wait: target - elapsed, target, units, gridMs, beatMs };
}

function closeLoopNow() {
  if (looper.pendingClose) {
    window.clearTimeout(looper.pendingClose.timer);
    looper.pendingClose = null;
  }
  if (!sendLooperSwitch("record", true)) return;
  window.setTimeout(() => sendLooperSwitch("record", false), 60);
}

// Restituisce true se il tocco su REC è stato gestito dall'aggancio al tempo.
function handleQuantizedRecord() {
  if (looper.pendingClose) {
    // Secondo tocco durante l'attesa: chiudi subito.
    closeLoopNow();
    return true;
  }
  const plan = planQuantizedClose();
  if (!plan) return false;
  if (plan.wait <= 0) {
    closeLoopNow();
    ui.looperStatus.textContent = `Chiuso in ritardo di ${Math.round(-plan.wait)} ms · loop ${(plan.target / 1000).toFixed(2)} s`;
    return true;
  }
  looper.pendingClose = {
    at: performance.now() + plan.wait,
    target: plan.target,
    timer: window.setTimeout(() => {
      looper.pendingClose = null;
      closeLoopNow();
      ui.looperStatus.textContent = `Loop agganciato al tempo · ${(plan.target / 1000).toFixed(2)} s`;
    }, plan.wait),
  };
  navigator.vibrate?.(15);
  paintLooperState();
  return true;
}

function setLooperHalf(value) {
  looper.half = value;
  try { localStorage.setItem(LOOPER_HALF_KEY, value ? "1" : "0"); } catch { /* facoltativo */ }
  paintLooperState();
}

function setLooperState(next) {
  const now = performance.now();
  if (looper.state === "recording" && next !== "recording") looper.loopLength = (now - looper.since) / 1000;
  // ½ SPEED resta attivo sul Player anche dopo la cancellazione (prova del 25/09/2026)
  if (next === "empty") { looper.loopLength = null; looper.reverse = false; }
  if (next !== looper.state) looper.since = now;
  looper.state = next;
  window.clearInterval(looper.timer);
  looper.timer = next === "recording" ? window.setInterval(paintLooperState, 50) : null;
  if (next !== "recording" && looper.pendingClose) {
    window.clearTimeout(looper.pendingClose.timer);
    looper.pendingClose = null;
  }
  paintLooperState();
}

function paintLooperState() {
  const { state } = looper;
  const seconds = state === "recording"
    ? (performance.now() - looper.since) / 1000
    : looper.loopLength;
  const mode = QUANTIZE_MODES[looper.quantize];
  const bpm = currentBpm();
  let time = seconds === null ? "" : `${state === "recording" ? "" : "LOOP "}${seconds.toFixed(1)} s`;
  let beatLabel = "";
  ui.looperState.dataset.beat = "none";
  if (state === "recording" && mode.beats && bpm) {
    const beatMs = 60000 / bpm;
    const elapsed = performance.now() - looper.since;
    const beatIndex = Math.floor(elapsed / beatMs);
    const perBar = beatsPerBar();
    const bar = Math.floor(beatIndex / perBar) + 1;
    const beat = (beatIndex % perBar) + 1;
    beatLabel = `BATTUTA ${bar} · ${beat}/${perBar}`;
    time = beatLabel;
    const inBeat = elapsed - beatIndex * beatMs;
    ui.looperState.dataset.beat = inBeat < 140 ? (beat === 1 ? "down" : "on") : "off";
  }
  if (looper.pendingClose) {
    const left = Math.max(0, looper.pendingClose.at - performance.now()) / 1000;
    time = `CHIUDO TRA ${left.toFixed(1)} s`;
  }
  for (const button of ui.quantizeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.quantize === looper.quantize));
  }
  ui.quantizeNote.textContent = !mode.beats
    ? "Il loop si chiude nel momento esatto in cui tocchi REC."
    : bpm
      ? `${bpm.toFixed(1)} BPM · ${mode.beats === 1 ? "1 movimento" : "1 battuta"} = ${(60 / bpm * mode.beats).toFixed(2)} s. Per chiudere tocca REC durante l’ultimo ${mode.beats === 1 ? "movimento" : "movimento della battuta"}: l’app aspetta la fine esatta. Un secondo tocco chiude subito.`
      : "BPM non ancora letto dal Player: il loop si chiuderà senza aggancio.";
  const flags = [looper.reverse ? "REVERSE" : "", looper.half && state !== "empty" ? "½ SPEED" : ""].filter(Boolean).join(" · ");
  ui.looperHalf.dataset.active = String(looper.half);
  ui.looperHalfLabel.textContent = `½ SPEED: ${looper.half ? "ON" : "OFF"}`;
  ui.looperHalfNote.textContent = looper.half
    ? state === "empty" || state === "recording"
      ? "La registrazione avviene a metà velocità: spegnendo ½ SPEED il loop suonerà al doppio."
      : "Toccando ½ SPEED il loop torna alla velocità di registrazione."
    : "";
  ui.looperState.dataset.state = state;
  ui.looperStateLabel.textContent = looper.pendingClose ? "CHIUSURA A TEMPO" : LOOPER_LABELS[state];
  ui.looperStateTime.textContent = time;
  ui.looperStateFlags.textContent = flags;
  ui.stageLooper.hidden = state === "empty";
  ui.stageLooper.dataset.state = state;
  ui.stageLooper.textContent = state === "recording"
    ? looper.pendingClose ? "● CHIUDO…" : beatLabel ? `● REC ${beatLabel.replace("BATTUTA ", "").replace(" · ", ".")}` : `● REC ${Math.floor(seconds)}s`
    : { playing: "▶ LOOP", overdub: "● DUB", stopped: "■ LOOP" }[state] ?? "LOOP";
}

function trackLooperPress(key) {
  if (key !== "stop") looper.stopPresses = 0;
  switch (key) {
    case "record":
      setLooperState({ empty: "recording", recording: "playing", playing: "overdub", overdub: "playing", stopped: "playing" }[looper.state]);
      break;
    case "stop":
      looper.stopPresses += 1;
      // Manuale Kemper: premere STOP tre volte cancella il loop.
      if (looper.stopPresses >= 3) { looper.stopPresses = 0; setLooperState("empty"); }
      else if (looper.state !== "empty") setLooperState("stopped");
      break;
    case "undo":
      if (looper.state === "overdub") setLooperState("playing");
      break;
    case "reverse":
      if (looper.state !== "empty") { looper.reverse = !looper.reverse; paintLooperState(); }
      break;
    case "half":
      setLooperHalf(!looper.half);
      break;
    case "erase":
      setLooperState("empty");
      break;
    default:
      break;
  }
}
let cancelLooperErase = () => {};

function refreshLooperControls() {
  const connected = profilerOutputs().length > 0;
  for (const button of [...ui.looperButtons, ui.looperErase]) button.disabled = !connected;
  if (!connected) ui.looperStatus.textContent = "Player scollegato · comandi Looper disattivati";
  else if (ui.looperStatus.textContent.startsWith("Player scollegato")
    || ui.looperStatus.textContent.startsWith("Collega il Kemper")) {
    ui.looperStatus.textContent = "Player collegato · comandi pronti";
  }
}

function sendLooperSwitch(key, pressed) {
  const command = LOOPER_SWITCHES[key];
  const outputs = profilerOutputs();
  if (!command || !outputs.length) return false;
  const channel = Math.max(1, Math.min(16, session.lastState?.channel ?? 1));
  const status = 0xb0 | (channel - 1);
  // NRPN page 125: address, data MSB and press/release value on data LSB.
  const messages = [[status, 99, 125], [status, 98, command.parameter],
    [status, 6, 0], [status, 38, pressed ? 1 : 0]];
  const time = new Date().toISOString();
  for (const output of outputs) {
    for (const bytes of messages) {
      output.send(bytes);
      session.transmitted.push({ time, output: describePort(output),
        label: `Looper ${command.label} ${pressed ? "PRESS" : "RELEASE"}`, hex: bytesToHex(bytes) });
    }
  }
  session.transmitted = session.transmitted.slice(-100);
  if (pressed) {
    trackLooperPress(key);
    session.looperLastCommands.push({ time, key, parameter: command.parameter, channel, estimatedState: looper.state });
    session.looperLastCommands = session.looperLastCommands.slice(-20);
    ui.looperStatus.textContent = `${command.label} · comando inviato`;
    ui.copy.disabled = false;
  }
  return true;
}

function releaseAllLooperSwitches() {
  for (const release of [...looperSwitchReleases]) release();
  cancelLooperErase();
}

function bindLooperSwitch(button) {
  const key = button.dataset.looperSwitch;
  let held = false;
  let lastDirectAt = 0;
  const press = () => {
    if (button.disabled || held) return;
    if (key === "record" && (looper.pendingClose || looper.state === "recording") && handleQuantizedRecord()) return;
    if (!sendLooperSwitch(key, true)) return;
    held = true;
    button.dataset.pressed = "true";
    looperSwitchReleases.add(release);
  };
  const release = () => {
    if (!held) return;
    held = false;
    button.dataset.pressed = "false";
    looperSwitchReleases.delete(release);
    sendLooperSwitch(key, false);
  };
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    lastDirectAt = Date.now();
    press();
    if (held) button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointerup", () => { lastDirectAt = Date.now(); release(); });
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
  button.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    lastDirectAt = Date.now();
    if (!event.repeat) press();
  });
  button.addEventListener("keyup", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    lastDirectAt = Date.now();
    release();
  });
  button.addEventListener("blur", release);
  button.addEventListener("click", () => {
    if (button.disabled || Date.now() - lastDirectAt < 600) return;
    if (key === "record" && (looper.pendingClose || looper.state === "recording") && handleQuantizedRecord()) return;
    if (sendLooperSwitch(key, true)) window.setTimeout(() => sendLooperSwitch(key, false), 90);
  });
}

function bindLooperErase() {
  const button = ui.looperErase;
  let armTimer = null;
  let busy = false;
  const idleLabel = "CANCELLA LOOP";
  cancelLooperErase = () => {
    window.clearTimeout(armTimer);
    armTimer = null;
    button.dataset.arming = "false";
    if (!busy) button.textContent = idleLabel;
  };
  const erase = () => {
    busy = true;
    button.dataset.arming = "false";
    button.textContent = "CANCELLAZIONE…";
    // 1) comando dedicato Erase (NRPN 125/94), pressione breve
    if (!sendLooperSwitch("erase", true)) { busy = false; cancelLooperErase(); return; }
    window.setTimeout(() => sendLooperSwitch("erase", false), 250);
    // 2) come sul Player: STOP tenuto premuto 2 secondi cancella il loop
    window.setTimeout(() => {
      sendLooperSwitch("stop", true);
      looper.stopPresses = 0;
      setLooperState("empty");
      window.setTimeout(() => {
        sendLooperSwitch("stop", false);
        busy = false;
        button.textContent = idleLabel;
        ui.looperStatus.textContent = "CANCELLA LOOP · comando inviato (Erase + STOP tenuto 2 s)";
      }, 2200);
    }, 450);
  };
  button.addEventListener("click", () => {
    if (button.disabled || busy) return;
    if (armTimer === null) {
      button.dataset.arming = "true";
      button.textContent = "TOCCA DI NUOVO PER CANCELLARE";
      navigator.vibrate?.(20);
      armTimer = window.setTimeout(cancelLooperErase, 3000);
      return;
    }
    window.clearTimeout(armTimer);
    armTimer = null;
    erase();
  });
}

function toggleAutoSync() {
  session.autoSync = !session.autoSync;
  if (session.autoSync) {
    startAutoSync();
    pollProfilerState();
    toast("Auto sync attivato");
  } else {
    window.clearInterval(session.autoSyncTimer);
    ui.auto.setAttribute("aria-pressed", "false");
    ui.auto.textContent = "Auto sync: OFF";
    ui.syncStatus.textContent = "Auto sync disattivato";
    toast("Auto sync disattivato");
  }
}

function scheduleProfilerSync() {
  window.clearTimeout(session.syncTimer);
  session.syncTimer = window.setTimeout(requestProfilerState, 180);
}

function clearLog() {
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
  ui.tunerCard.dataset.active = "unknown";
  ui.tunerStatus.textContent = "—";
  ui.tunerNote.textContent = "IN ATTESA";
  ui.tunerCard.dataset.zone = "waiting";
  ui.tunerGauge.style.setProperty("--tuner-position", "50");
  ui.tunerGauge.setAttribute("aria-valuenow", "0");
  ui.tunerCents.textContent = "—";
  ui.tunerRaw.textContent = "—";
  ui.tunerSignal.textContent = "—";
  ui.tunerHint.textContent = "Apri l’accordatore e suona le tre note.";
  ui.tunerHistory.textContent = "—";
  ui.tunerControl.textContent = "Apri Tuner";
  ui.tunerControl.setAttribute("aria-pressed", "false");
  ui.tunerControl.disabled = profilerOutputs().length === 0;
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
    app: `Kemper Stage View v${APP_VERSION}`,
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
      quantize: looper.quantize,
      probeResults: session.looperProbeResults ?? [],
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
      received: session.bankListsReceived,
      remembered: Object.fromEntries(session.bankNames),
      slots: Object.fromEntries(session.slotNames),
    },
    rigControl: {
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

function saveDiagnostics() {
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

async function copyDiagnostics() {
  const payload = buildDiagnostics();
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast("Diagnostica copiata");
  } catch {
    toast("Impossibile copiare automaticamente");
  }
}

ui.connect.addEventListener("click", connect);
ui.liveConnect.addEventListener("click", connect);
ui.liveDemo.addEventListener("click", async () => {
  if (session.access && !window.__kemperDemo) return;
  const { installDemoKemper } = await import("./demo.js");
  installDemoKemper();
  await connect();
  toast("Modalità DEMO · Kemper simulato, nessun Player collegato");
});
ui.identity.addEventListener("click", () => requestProfilerState({ force: true }));
ui.liveSync.addEventListener("click", () => requestProfilerState({ force: true }));
ui.auto.addEventListener("click", toggleAutoSync);
ui.morphProbe.addEventListener("click", toggleMorphFromApp);
ui.liveMorphToggle.addEventListener("click", toggleMorphFromApp);
ui.liveMorphSlider.addEventListener("input", () => {
  session.liveMorphDraft = true;
  ui.liveMorphTarget.textContent = `${ui.liveMorphSlider.value}%`;
});
ui.liveMorphApply.addEventListener("click", () => {
  sendMorphCommand(Math.round(Number(ui.liveMorphSlider.value) / 100 * 127));
});
for (const button of ui.looperButtons) bindLooperSwitch(button);
ui.looperStateReset.addEventListener("click", () => { looper.stopPresses = 0; setLooperState("empty"); });
ui.looperHalfFix.addEventListener("click", () => setLooperHalf(!looper.half));
for (const button of ui.quantizeButtons) button.addEventListener("click", () => setQuantizeMode(button.dataset.quantize));
let forgetArmTimer = null;
ui.forgetNames.addEventListener("click", () => {
  if (forgetArmTimer === null) {
    ui.forgetNames.textContent = "Tocca ancora per cancellare i nomi";
    forgetArmTimer = window.setTimeout(() => { forgetArmTimer = null; ui.forgetNames.textContent = "Cancella nomi Bank/Rig memorizzati"; }, 3000);
    return;
  }
  window.clearTimeout(forgetArmTimer);
  forgetArmTimer = null;
  forgetAllNames();
  ui.forgetNames.textContent = "Cancella nomi Bank/Rig memorizzati";
  toast("Nomi memorizzati cancellati");
});
session.looperProbe = null;
function captureLooperProbe(decoded) {
  const probe = session.looperProbe;
  if (!probe || decoded?.type !== "Kemper Parameter") return;
  const looperParam = decoded.page === 0x7d && decoded.parameter >= 88 && decoded.parameter <= 94;
  const globalParam = decoded.page === 0x7f && (decoded.parameter === 52 || decoded.parameter === 53);
  if (looperParam || globalParam) probe.replies[`${decoded.page}/${decoded.parameter}`] = decoded.value;
}
ui.looperProbe.addEventListener("click", () => {
  session.looperProbe = { at: new Date().toISOString(), estimatedState: looper.state, replies: {} };
  ui.looperProbeResult.textContent = "Lettura in corso…";
  window.setTimeout(() => {
    const probe = session.looperProbe;
    if (!probe) return;
    const entries = Object.entries(probe.replies);
    const names = { "125/88": "Rec/Play/Dub", "125/89": "Stop", "125/90": "Trigger", "125/91": "Reverse",
      "125/92": "½ Speed", "125/93": "Undo", "125/94": "Erase", "127/52": "Volume", "127/53": "Location" };
    ui.looperProbeResult.textContent = entries.length
      ? `Risposte (loop stimato: ${LOOPER_LABELS[probe.estimatedState]}): ${entries.map(([key, value]) => `${names[key] ?? key} = ${value}`).join(" · ")}`
      : "Nessuna risposta dal Player ai parametri del Looper.";
    session.looperProbeResults = [...(session.looperProbeResults ?? []), probe].slice(-10);
    session.looperProbe = null;
  }, 2500);
  // Sola lettura: verifica se il Player comunica lo stato del Looper.
  const reads = [88, 89, 90, 91, 92, 93, 94].map((parameter) => buildParameterRequest(0x7d, parameter, `Looper probe 125/${parameter}`));
  reads.push(buildParameterRequest(0x7f, 52, "Looper Volume 127/52"), buildParameterRequest(0x7f, 53, "Looper Location 127/53"));
  sendProfilerRequests(reads);
  toast("Lettura parametri Looper inviata · poi salva la diagnostica");
});
ui.stageLooper.addEventListener("click", () => setAppView("looper"));
bindLooperErase();
window.addEventListener("blur", releaseAllLooperSwitches);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") releaseAllLooperSwitches();
  else keepScreenOn();
});
ui.tunerOverlayClose.addEventListener("click", () => sendTunerCommand(false));
ui.tunerControl.addEventListener("click", toggleTunerFromApp);
ui.tempoDown.addEventListener("click", () => changeTempoBy(-1));
ui.tempoTap.addEventListener("click", tapTempo);
ui.tempoUp.addEventListener("click", () => changeTempoBy(1));
ui.tempoRound.addEventListener("click", roundTempoToInteger);
ui.liveTempoDown.addEventListener("click", () => changeTempoBy(-1));
ui.liveTempoRound.addEventListener("click", roundTempoToInteger);
ui.liveTempoUp.addEventListener("click", () => changeTempoBy(1));
ui.rigBankDown.addEventListener("click", () => changeRigTargetBank(-1));
ui.rigBankUp.addEventListener("click", () => changeRigTargetBank(1));
ui.liveBankDown.addEventListener("click", () => changeRigTargetBank(-1));
ui.liveBankUp.addEventListener("click", () => changeRigTargetBank(1));
for (const button of ui.rigSlots) {
  button.addEventListener("click", () => selectRigSlot(Number(button.dataset.rigSlot)));
}
for (const button of ui.liveRigSlots) {
  button.addEventListener("click", () => selectRigSlot(Number(button.dataset.liveRigSlot)));
}
ui.freezeRev.addEventListener("click", toggleRevFreeze);
ui.liveFreeze.addEventListener("click", toggleRevFreeze);
ui.liveTuner.addEventListener("click", toggleTunerFromApp);
ui.liveTap.addEventListener("click", tapTempo);
for (const button of ui.viewButtons) {
  button.addEventListener("click", () => setAppView(button.dataset.viewButton));
}
ui.clear.addEventListener("click", clearLog);
ui.copy.addEventListener("click", copyDiagnostics);
ui.saveDiagnostics.addEventListener("click", saveDiagnostics);

if ("requestMIDIAccess" in navigator) {
  ui.support.textContent = "Web MIDI disponibile. Collega il cavo e autorizza l’accesso.";
} else {
  ui.support.textContent = "Web MIDI non disponibile: usa Chrome su Android o desktop.";
  setConnection("error", "Browser non compatibile");
  ui.connect.disabled = true;
}

refreshRigControls();
refreshFreezeControls();
refreshFixedFxControls();
refreshLiveMorphControls();
refreshLooperControls();
paintLooperState();
try {
  setAppView(localStorage.getItem("kemper-stage-view-mode") ?? "live", { remember: false });
} catch {
  setAppView("live", { remember: false });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
