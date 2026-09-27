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
  buildParameterChangeRequest,
  buildTunerStreamRequests,
  buildProfilerPollRequests,
  buildProfilerStateRequests,
  buildRenderedValueRequest,
  buildRigNameRequest,
  buildRevHoldChangeRequest,
  buildRevHoldRequest,
  buildBeaconRequest,
  buildBankNamesRequests,
  buildRigStackRequests,
  rigStackField,
  rigStackLabel,
  bytesToHex,
  decodedKey,
  requestKey,
} from "./kemper-midi.js";

const APP_NAME = "Kemper Profiler View";
const APP_VERSION = "1.45";
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
  rigStack: $("#rig-stack"),
  rigStackAmp: $("#rig-stack-amp"),
  rigStackAmpName: $("#rig-stack-amp-name"),
  rigStackCab: $("#rig-stack-cab"),
  rigStackCabName: $("#rig-stack-cab-name"),
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
  looperReverse: $("#looper-reverse"),
  looperReverseLabel: $("#looper-reverse-label"),
  looperReverseNote: $("#looper-reverse-note"),
  looperReverseFix: $("#looper-reverse-fix"),
  looperProbe: $("#looper-probe-button"),
  looperProbeResult: $("#looper-probe-result"),
  locationButtons: [...document.querySelectorAll("[data-looper-location]")],
  locationNote: $("#looper-location-note"),
  forgetNames: $("#forget-names-button"),
  quantizeButtons: [...document.querySelectorAll("[data-quantize]")],
  quantizeNote: $("#looper-quantize-note"),
  saveDiagnostics: $("#save-diagnostics-button"),
  bidiCard: $("#bidi-card"),
  bidiState: $("#bidi-state"),
  bidiNote: $("#bidi-note"),
  bidiCovered: $("#bidi-covered"),
  bidiToggle: $("#bidi-toggle"),
  liveBpmBox: $(".stage-bpm"),
  rigCurrentJump: $("#rig-current-jump"),
  themeButtons: [...document.querySelectorAll("[data-theme-choice]")],
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
  // v1.45: ampli e cabinet del Rig in uso (letti dal Player dopo ogni cambio Rig).
  rigStack: { rig: null, values: {}, timer: null, retryTimer: null, requestsSent: 0, replies: 0, cache: new Map(), log: [] },
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
  // Ultima lettura inviata per ogni indirizzo (per distinguere le risposte dai messaggi spontanei del Player)
  requestedAt: new Map(),
  requestsSent: 0,
  requestRateSamples: [],
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
    session.pendingBankList = { bankName: null, slots: {}, at: now, startedAt: now };
  }
  const list = session.pendingBankList;
  if (decoded.index === 0) list.bankName = decoded.text;
  else list.slots[decoded.index] = decoded.text;
  list.at = now;
  // Risposta alla richiesta dei nomi fatta dall'app (v1.41): va alla Bank richiesta.
  const asked = session.bankNameRequest;
  if (asked && now - asked.at < 4000) {
    if (decoded.index === 5) {
      rememberBankList(asked.bank, list);
      session.pendingBankList = null;
      session.bankNameRequest = null;
      session.bankNameRepliesComplete = (session.bankNameRepliesComplete ?? 0) + 1;
      refreshRigControls();
    }
    return;
  }
  // In modalità bidirezionale (invio iniziale) i nomi arrivano DOPO il Program Change
  // (prova sul Player del 26/09/2026): li si assegna alla Bank dell'ultimo Program Change.
  const program = session.lastProgramEvent;
  if (decoded.index === 5 && program && list.startedAt >= program.at && now - program.at < 3000) {
    rememberBankList(program.bank, list);
    session.pendingBankList = null;
    refreshRigControls();
  }
}

function bankNamesComplete(bank) {
  if (!session.bankNames.has(String(bank))) return false;
  for (let slot = 1; slot <= 5; slot += 1) if (!session.slotNames.has(`${bank}:${slot}`)) return false;
  return true;
}

// v1.41: cambiando Bank dall'app il Player invia solo il nome della Bank e di uno slot;
// se mancano nomi, l'app li chiede (una richiesta per nome, sei in tutto).
function requestBankNames(bank) {
  if (!session.sysex || !profilerOutputs().length || window.__kemperDemoNoNames) return;
  session.bankNameRequest = { bank, at: performance.now() };
  session.bankNameRequestsSent = (session.bankNameRequestsSent ?? 0) + 1;
  sendProfilerRequests(buildBankNamesRequests(), { record: false });
}

function scheduleBankNamesCheck(bank) {
  window.clearTimeout(session.bankNamesTimer);
  session.bankNamesTimer = window.setTimeout(() => {
    if (session.rigSelectedBank === bank && !bankNamesComplete(bank)) requestBankNames(bank);
  }, 1200);
}

// ── Ampli e cabinet del Rig in uso (v1.45) ─────────────────────────────────
// Letti dopo ogni cambio Rig (0,9 s: il Rig ha finito di caricarsi). Solo informazione:
// con la chitarra acustica AMP o CAB spenti possono essere normali, quindi nessun allarme.
const RIG_STACK_DELAY_MS = 900;
const RIG_STACK_RETRY_MS = 1500;

function scheduleRigStackRequest(rigName) {
  const stack = session.rigStack;
  window.clearTimeout(stack.timer);
  window.clearTimeout(stack.retryTimer);
  stack.rig = rigName;
  // Se il Rig è già stato visto in questa sessione si mostra subito l'ultimo dato, poi si rilegge.
  stack.values = { ...(stack.cache.get(rigName) ?? {}) };
  paintRigStack();
  stack.timer = window.setTimeout(() => requestRigStack(rigName, true), RIG_STACK_DELAY_MS);
}

function requestRigStack(rigName, allowRetry) {
  const stack = session.rigStack;
  if (stack.rig !== rigName || !session.sysex || !profilerOutputs().length) return;
  stack.repliesAtRequest = stack.replies;
  stack.requestsSent += 1;
  sendProfilerRequests(buildRigStackRequests(), { record: false });
  if (allowRetry) {
    stack.retryTimer = window.setTimeout(() => {
      if (stack.rig === rigName && stack.replies === stack.repliesAtRequest) requestRigStack(rigName, false);
    }, RIG_STACK_RETRY_MS);
  }
}

function handleRigStack(decoded) {
  const field = rigStackField(decoded);
  if (!field) return;
  const stack = session.rigStack;
  stack.replies += 1;
  stack.values[field.key] = field.value;
  if (stack.rig) stack.cache.set(stack.rig, { ...stack.values });
  if (stack.log.length < 40) {
    stack.log.push({ time: new Date().toISOString(), rig: stack.rig, key: field.key, value: field.raw ?? field.value });
  }
  paintRigStack();
}

function paintRigStack() {
  if (!ui.rigStack) return;
  const values = session.rigStack.values;
  const known = Object.keys(values).length > 0;
  ui.rigStack.hidden = !known;
  if (!known) return;
  for (const [prefix, node, nameNode] of [["amp", ui.rigStackAmp, ui.rigStackAmpName], ["cab", ui.rigStackCab, ui.rigStackCabName]]) {
    const on = values[`${prefix}On`];
    const label = rigStackLabel(values, prefix);
    node.dataset.on = on === undefined ? "unknown" : String(on);
    nameNode.textContent = on === false ? (label ? `OFF · ${label}` : "OFF") : (label || "—");
    node.title = label;
  }
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

function longestWord(text) {
  return Math.max(5, ...String(text).replace(/\u00ad/g, "").split(/\s+/).map((word) => word.length));
}

// Punti di sillabazione (trattino morbido) per le parole lunghe: se il nome non entra,
// il browser va a capo in quel punto mostrando "-" (es. Com-pres-sor), mai a metà a caso.
const isVowel = (char) => "aeiouy".includes(char);
// Gruppi di consonanti che in inglese iniziano una sillaba (Com-pres-sor, Chro-ma-tic).
const SYLLABLE_ONSETS = new Set(["pr", "br", "tr", "dr", "cr", "gr", "fr", "pl", "bl", "cl", "gl", "fl", "sh", "ch", "th", "ph", "wh"]);
function softHyphenate(text) {
  return String(text).split(" ").map((word) => {
    if (word.length < 7 || /[^a-z]/i.test(word)) return word;
    const w = word.toLowerCase();
    const cuts = [];
    let i = 0;
    while (i < w.length) {
      if (!isVowel(w[i])) { i += 1; continue; }
      let j = i;
      while (j < w.length && isVowel(w[j])) j += 1; // prima consonante dopo le vocali
      let k = j;
      while (k < w.length && !isVowel(w[k])) k += 1; // vocale successiva
      if (k >= w.length || k === j) break;
      const cluster = w.slice(j, k);
      const cut = cluster.endsWith("ck") ? k : cluster.length === 1 ? j : SYLLABLE_ONSETS.has(cluster.slice(-2)) ? k - 2 : k - 1;
      if (cut >= 3 && w.length - cut >= 3 && (!cuts.length || cut - cuts[cuts.length - 1] >= 2)) cuts.push(cut);
      i = k;
    }
    let out = "";
    let from = 0;
    for (const cut of cuts) { out += `${word.slice(from, cut)}\u00ad`; from = cut; }
    return out + word.slice(from);
  }).join(" ");
}

// v1.39: colori delle categorie come sul Kemper (manuale Profiler/Player):
// Wah arancio, Distorsione/Booster/Shaper rosso, EQ e Widener giallo, Compressore/Gate ciano,
// Chorus/Vibrato/Rotary/Tremolo blu, Phaser/Flanger viola, Pitch bianco, Delay verde,
// Delay con pitch verde chiaro, Riverbero verde, Effect Loop rosa.
function effectTone(type) {
  if (type === null || type === undefined) return "standard";
  if (type === 0) return "empty";
  if (type === 11 || type === 13) return "pitch"; // Pedal Pitch, Pedal Vinyl Stop
  if (type >= 1 && type <= 16) return "wah";
  if (type >= 17 && type <= 48) return "drive";
  if (type >= 49 && type <= 63) return "dynamics";
  if (type >= 64 && type <= 80) return "chorus";
  if (type >= 81 && type <= 96) return "phaser";
  if (type >= 97 && type <= 112) return "eq";
  if (type >= 113 && type <= 120) return "drive";
  if (type >= 121 && type <= 128) return "loop";
  if (type >= 129 && type <= 144) return "pitch";
  if ([150, 151, 152, 162, 163, 165, 166].includes(type)) return "pitchdelay";
  if (type >= 145 && type <= 176) return "delay";
  if (type >= 177) return "reverb";
  return "standard";
}

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
      liveNode.name.textContent = empty ? "Slot vuoto" : softHyphenate(effect.name);
      // v1.38: la dimensione del nome si adatta alla parola più lunga, senza spezzarla.
      // Oltre 8 lettere la parola va a capo in sillabe (Com-pres-sor) invece di rimpicciolirsi troppo.
      liveNode.card.style.setProperty("--chars", String(Math.min(8, longestWord(liveNode.name.textContent))));
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
}

// Firma di ciò che la schermata mostra: se non cambia (Tuner, battito, valori ripetuti) niente ridisegno.
let lastPaintSignature = "";
function stateSignature(state) {
  let text = `${state.rigName}|${state.program}|${state.channel}|${state.bpm}|${state.tempoRaw}`;
  for (const effect of state.effects.values()) text += `|${effect.type}:${effect.active}`;
  return text;
}

const kemper = new KemperMidiState((state) => {
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
  ui.liveConnectionStatus.dataset.label = label;
  paintLiveConnection();
  ui.liveConnect.textContent = status === "connected" ? "MIDI collegato" : "Connetti MIDI";
  ui.liveSync.disabled = status !== "connected" || !session.sysex || profilerOutputs().length === 0;
}

function paintLiveConnection() {
  const node = ui.liveConnectionStatus;
  const connected = node.dataset.status === "connected";
  const bidi = connected && session.bidi?.state === "active";
  node.dataset.bidi = String(bidi);
  node.textContent = connected
    ? `● ${window.__kemperDemo ? "DEMO" : "COLLEGATO"}${bidi ? " ⇄" : ""}`
    : node.dataset.label ?? "Non collegato";
  node.title = bidi ? "Modalità bidirezionale attiva: il Player invia i cambiamenti" : "";
}

function setAppView(view, { remember = true } = {}) {
  const next = ["full", "looper", "rig"].includes(view) ? view : "live";
  if (document.body.dataset.view === "looper" && next !== "looper") releaseAllLooperSwitches();
  document.body.dataset.view = next;
  if (next !== "live" && ui.morphLevelDetails) ui.morphLevelDetails.open = false;
  if (next === "looper") requestLooperLocation();
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

// v1.38: messaggi brevi in basso, compatti e trasparenti ai tocchi.
// kind: "ok" (conferma), "warn" (problema) o "info". In PALCO le conferme di routine
// non compaiono: lo stato è già visibile sui pulsanti.
function toast(message, kind) {
  const resolved = kind ?? (/\b(non|nessun[ao]?|impossibile|prima|fallit[ao]|inattes[ao]|pers[ao])\b/i.test(message)
    ? "warn"
    : /confermat|attivato|disattivato/i.test(message) ? "ok" : "info");
  if (resolved === "ok" && document.body.dataset.view === "live") return;
  ui.toast.textContent = message;
  ui.toast.dataset.kind = resolved;
  ui.toast.dataset.visible = "true";
  window.clearTimeout(toast.timeout);
  toast.timeout = window.setTimeout(() => { ui.toast.dataset.visible = "false"; }, resolved === "warn" ? 3200 : 2200);
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
  const target = session.rigSelectPending;
  if (pending) {
    ui.rigControlStatus.textContent = `ATTENDO · BANK ${target.bank} · RIG ${target.slot}`;
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
  ui.liveRigStatus.textContent = pending
    ? `CARICO BANK ${target.bank} · RIG ${target.slot}…`
    : session.rigSelectedBank === null
      ? ui.rigControlStatus.textContent
      : `IN USO: BANK ${session.rigSelectedBank} · RIG ${session.rigSelectedSlot}${session.lastState?.rigName ? ` · ${session.lastState.rigName}` : ""}`;
  ui.rigCurrentJump.hidden = pending || session.rigSelectedBank === null || session.rigSelectedBank === session.rigTargetBank;
  ui.liveRigSlots[0]?.closest(".live-rig-selector")?.setAttribute("data-other-bank", String(!ui.rigCurrentJump.hidden));
  ui.liveRigPosition.textContent = pending
    ? `→ BANK ${target.bank} · RIG ${target.slot}`
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
  syncAfterChange(120, { silent: true, force: true });
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
    scheduleBankNamesCheck(bank);
    if (session.rigSelectPending !== null) {
      if (session.rigSelectPending.bank === bank && session.rigSelectPending.slot === slot) return;
      stopRigSelectionConfirmation();
    }
    const previousProgramAt = session.lastProfilerProgramAt;
    session.lastProfilerProgramAt = performance.now();
    session.lastProgramEvent = { bank, at: session.lastProfilerProgramAt };
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
  paintLooperLocation();
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

// Looper Location (globale, pagina 127 parametro 53): 0 = Input, 1 = Output (verificato 26/09/2026)
const LOOPER_LOCATION = { page: 0x7f, parameter: 53 };
session.looperLocation = null;
session.looperLocationPending = null;
session.looperLocationTimers = null;

function paintLooperLocation() {
  const value = session.looperLocation;
  const pending = session.looperLocationPending;
  const canControl = session.sysex && profilerOutputs().length > 0;
  for (const button of ui.locationButtons) {
    const target = Number(button.dataset.looperLocation);
    button.setAttribute("aria-pressed", String(value === target));
    button.dataset.pending = String(pending === target);
    button.disabled = !canControl || pending !== null || value === null;
  }
  ui.locationNote.textContent = pending !== null
    ? "Attendo la conferma del Kemper…"
    : value === 1
      ? "USCITA: il loop registra il suono finito; gli effetti che cambi dopo non lo modificano."
      : value === 0
        ? "INGRESSO: il loop registra la chitarra pulita e passa ogni volta dagli effetti attuali."
        : canControl ? "Lettura dell’impostazione dal Kemper…" : "Collega il Kemper per leggere l’impostazione.";
}

function requestLooperLocation() {
  if (!session.sysex || !profilerOutputs().length) return;
  sendProfilerRequests([buildParameterRequest(LOOPER_LOCATION.page, LOOPER_LOCATION.parameter, "Looper Location 127/53")], { record: false });
}

function stopLooperLocationConfirmation() {
  if (session.looperLocationTimers) {
    window.clearInterval(session.looperLocationTimers.interval);
    window.clearTimeout(session.looperLocationTimers.timeout);
  }
  session.looperLocationTimers = null;
  session.looperLocationPending = null;
  paintLooperLocation();
}

function setLooperLocation(target) {
  if (session.looperLocationPending !== null || session.looperLocation === target) return;
  sendProfilerRequests([buildParameterChangeRequest(LOOPER_LOCATION.page, LOOPER_LOCATION.parameter, target,
    `Looper Location ${target ? "OUTPUT" : "INPUT"}`)]);
  session.looperLocationPending = target;
  paintLooperLocation();
  const startedAt = performance.now();
  const poll = () => { if (confirmationPollAllowed(startedAt)) requestLooperLocation(); };
  window.setTimeout(poll, 150);
  session.looperLocationTimers = {
    interval: window.setInterval(poll, 400),
    timeout: window.setTimeout(() => {
      stopLooperLocationConfirmation();
      toast("Posizione Looper non confermata dal Kemper");
    }, 2800),
  };
}

function handleLooperLocation(decoded) {
  if (decoded?.type !== "Kemper Parameter" || decoded.page !== LOOPER_LOCATION.page || decoded.parameter !== LOOPER_LOCATION.parameter) return;
  if (decoded.value !== 0 && decoded.value !== 1) return;
  session.looperLocation = decoded.value;
  if (session.looperLocationPending === decoded.value) {
    stopLooperLocationConfirmation();
    toast(`Looper in ${decoded.value ? "USCITA" : "INGRESSO"} · confermato dal Kemper`);
  } else {
    paintLooperLocation();
  }
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
  ui.liveBpmBox.dataset.pulse = "true";
  clearTimeout(pulseTempo.timeout);
  pulseTempo.timeout = setTimeout(() => {
    delete ui.tempoBlock.dataset.pulse;
    delete ui.liveBpmBox.dataset.pulse;
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
  const mode = percent === 0 ? "BASE" : percent === 100 ? "MORPH" : "PARZIALE";
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
  // Colore Kemper: rosso in BASE, blu con Morph pieno, sfumato nei livelli intermedi.
  ui.liveMorph.style.setProperty("--morph", String(percent));
  ui.morphCard.style.setProperty("--morph", String(percent));
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
  session.tunerStreamStartedAt = performance.now();
  const poll = () => {
    if (session.bidi.state === "active") {
      const now = performance.now();
      // Il Player invia da solo nota e intonazione (124/15): non serve leggerle.
      if (bidiTunerPushing(now)) return;
      // Primo mezzo secondo: ascolta se arrivano da sole prima di iniziare le letture.
      if (now - session.tunerStreamStartedAt < 500) return;
    }
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
  // v1.39: isteresi, così lo schermo verde non lampeggia al limite: entra entro ±3 cent, esce oltre ±5.
  const wasInTune = session.performanceState.tunerZone === "in-tune";
  const zone = Math.abs(cents) <= 3 || (wasInTune && Math.abs(cents) <= 5) ? "in-tune" : cents < 0 ? "flat" : "sharp";

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
      handleBidirectional(decoded);
      handleBankNames(decoded);
      handleRigStack(decoded);
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

function sendProfilerRequests(requests, { record = true } = {}) {
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

// ── Modalità bidirezionale (v1.37) ─────────────────────────────────────────
// L'app invia un "beacon" al Player; il Player risponde con un messaggio di "sensing"
// circa ogni 500 ms e invia da solo i parametri che cambiano (set 2: effetti A–MOD,
// nome Rig, Tuner). I parametri che il Player invia da solo non vengono più letti di
// continuo; tutti gli altri (e tutto, se il collegamento cade) restano letti come prima.
const BIDI_KEY = "kemper-stage-view-bidi"; // le chiavi di memoria restano quelle della v1.36: così nomi e impostazioni non si perdono
const BIDI_LEASE_SECONDS = 30;
const BIDI_RESEND_MS = 12000;
const BIDI_INIT_RETRY_MS = 5000;
// Prova sul Player (26/09/2026): durante il caricamento di un Rig il sensing si ferma per circa 2 s.
const BIDI_SENSING_TIMEOUT_MS = 4000;
const BIDI_PUSH_WINDOW_MS = 350;
const BIDI_SAFETY_POLL_MS = 10000;
const BIDI_TICK_MS = 250;
const BIDI_LABELS = {
  disabled: "SPENTA",
  off: "IN ATTESA DEL PLAYER",
  starting: "AVVIO…",
  active: "ATTIVA",
  lost: "PERSA · RIPROVO",
  unavailable: "NON RISPONDE",
};
const KEY_NAMES = new Map([
  ["str:0/1", "Nome Rig"], ["par:127/126", "Tuner"], ["par:125/84", "Nota Tuner"],
  ["par:124/15", "Intonazione"], ["par:124/81", "Intonazione"], ["par:124/0", "Battito"],
  ["par:4/0", "BPM"], ["par:0/11", "Morph"], ["par:125/115", "Freeze REV"], ["par:127/53", "Posizione Looper"],
  ...EFFECT_MODULES.flatMap((module) => [[`par:${module.page}/3`, module.key], [`par:${module.page}/0`, `${module.key} tipo`]]),
  ...FIXED_FX.map((effect) => [`par:${effect.page}/${effect.parameter}`, effect.label]),
]);
const keyName = (key) => KEY_NAMES.get(key) ?? key.replace(/^(par|str):/, "");

session.bidi = {
  enabled: true,
  state: "off",
  timer: null,
  lastInitAt: 0,
  lastBeaconAt: 0,
  initBeaconsSent: 0,
  keepAliveSent: 0,
  attemptsWithoutReply: 0,
  lastSensingAt: 0,
  sensingCount: 0,
  sensingBeforeBeacon: 0,
  activeSince: null,
  drops: 0,
  lastSafetyPollAt: 0,
  pushed: new Map(),
  lastPushAt: new Map(),
  covered: new Set(),
  otherSysex: [],
  transitions: [],
};
try { session.bidi.enabled = localStorage.getItem(BIDI_KEY) !== "0"; } catch { /* facoltativo */ }

function bidiReady() {
  return session.sysex && profilerOutputs().length > 0 && profilerInputs().length > 0;
}

function setBidiState(next, reason = "") {
  const bidi = session.bidi;
  const previous = bidi.state;
  if (previous === next) return;
  bidi.state = next;
  bidi.transitions.push({ time: new Date().toISOString(), from: previous, to: next, reason });
  bidi.transitions = bidi.transitions.slice(-30);
  if (next === "active") {
    bidi.activeSince = new Date().toISOString();
    const brief = previous === "lost" && performance.now() - (bidi.lostAt ?? 0) < 10000;
    if (!brief) toast("Bidirezionale attiva ⇄");
  } else if (previous === "active") {
    bidi.activeSince = null;
    if (next === "lost") {
      bidi.lostAt = performance.now();
      toast("Collegamento bidirezionale perso · torno alle letture periodiche", "warn");
    }
  }
  paintBidi();
}

function sendBeacon(init) {
  const bidi = session.bidi;
  const now = performance.now();
  sendProfilerRequests([buildBeaconRequest({ init, leaseSeconds: BIDI_LEASE_SECONDS })], { record: init });
  bidi.lastBeaconAt = now;
  if (init) {
    // Dopo il beacon INIT il Player invia tutti i parametri del set: per riconoscerli come
    // "inviati da solo" l'app non fa letture per 700 ms.
    bidi.quietUntil = now + 700;
    bidi.lastInitAt = now;
    bidi.initBeaconsSent += 1;
  } else {
    bidi.keepAliveSent += 1;
  }
}

function sampleRequestRate(now) {
  const samples = session.requestRateSamples;
  if (!samples.length || now - samples[samples.length - 1].t >= 2000) {
    samples.push({ t: now, n: session.requestsSent });
    while (samples.length > 2 && now - samples[0].t > 30000) samples.shift();
  }
}

function requestsPerMinute() {
  const samples = session.requestRateSamples;
  if (samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const minutes = (last.t - first.t) / 60000;
  return minutes > 0 ? Math.round((last.n - first.n) / minutes) : null;
}

function bidiTick() {
  const bidi = session.bidi;
  const now = performance.now();
  sampleRequestRate(now);
  if (document.body.dataset.view === "full" && now - (bidiTick.paintedAt ?? 0) > 2000) {
    bidiTick.paintedAt = now;
    paintBidi();
  }
  if (!bidi.enabled) {
    if (bidi.state !== "disabled") {
      bidi.covered.clear();
      setBidiState("disabled", "Spenta dall'utente");
    }
    return;
  }
  if (!bidiReady()) {
    if (bidi.state !== "off") {
      bidi.covered.clear();
      setBidiState("off", "Player non collegato");
    }
    return;
  }
  // Con l'app in secondo piano non si rinnova il beacon: il Player smette da solo dopo il lease.
  if (document.visibilityState !== "visible") return;
  if (bidi.state === "active") {
    if (now - bidi.lastSensingAt > BIDI_SENSING_TIMEOUT_MS) {
      bidi.drops += 1;
      bidi.covered.clear();
      setBidiState("lost", "Nessun sensing dal Player da oltre 4 s");
      return;
    }
    if (now - bidi.lastBeaconAt >= BIDI_RESEND_MS) sendBeacon(false);
    return;
  }
  const retry = bidi.state === "unavailable" ? BIDI_INIT_RETRY_MS * 2 : BIDI_INIT_RETRY_MS;
  if (bidi.lastInitAt && now - bidi.lastInitAt < retry) return;
  // Aspetta un momento senza letture in corso, così le risposte non si confondono con l'invio iniziale del Player.
  // (Se le letture non si fermano, ad esempio con il Tuner aperto, dopo 3 s invia comunque.)
  if (now - (session.lastRequestAt ?? -Infinity) < 400) {
    bidi.deferredSince ??= now;
    if (now - bidi.deferredSince < 3000) return;
  }
  bidi.deferredSince = null;
  if (bidi.state === "off" || bidi.state === "disabled") setBidiState("starting", "Beacon INIT inviato");
  else if (bidi.attemptsWithoutReply >= 3 && bidi.state !== "unavailable") {
    setBidiState("unavailable", "Nessun sensing dopo 3 beacon");
  }
  bidi.attemptsWithoutReply += 1;
  bidi.covered.clear();
  sendBeacon(true);
}

function startBidiTimer() {
  if (session.bidi.timer !== null) return;
  session.bidi.timer = window.setInterval(bidiTick, BIDI_TICK_MS);
  bidiTick();
}

function handleBidirectional(decoded) {
  const bidi = session.bidi;
  if (!decoded) return;
  const now = performance.now();
  if (decoded.type === "Kemper Heartbeat") {
    bidi.sensingCount += 1;
    if (!bidi.lastInitAt) {
      bidi.sensingBeforeBeacon += 1;
      return;
    }
    bidi.lastSensingAt = now;
    bidi.attemptsWithoutReply = 0;
    if (bidi.enabled && bidiReady() && bidi.state !== "active") setBidiState("active", "Sensing ricevuto dal Player");
    return;
  }
  if (bidi.state === "active" && (decoded.type === "Kemper SysEx" || decoded.type === "Kemper Live Data")) {
    bidi.otherSysex.push({ time: new Date().toISOString(), hex: decoded.hex });
    bidi.otherSysex = bidi.otherSysex.slice(-30);
    return;
  }
  const key = decodedKey(decoded);
  if (!key) return;
  const requested = session.requestedAt.get(key);
  if (requested !== undefined && now - requested < BIDI_PUSH_WINDOW_MS) return; // risposta a una lettura dell'app
  const entry = bidi.pushed.get(key) ?? { name: keyName(key), count: 0, firstAt: new Date().toISOString(), lastAt: null, value: null, afterBeacon: false };
  entry.count += 1;
  entry.lastAt = new Date().toISOString();
  entry.value = decoded.value ?? decoded.text ?? null;
  entry.afterBeacon = entry.afterBeacon || bidi.lastInitAt > 0;
  bidi.pushed.set(key, entry);
  bidi.lastPushAt.set(key, now);
  if (bidi.enabled && bidi.lastInitAt > 0 && !bidi.covered.has(key)) {
    bidi.covered.add(key);
    paintBidi();
  }
}

// true se il Player sta già inviando da solo questo parametro: la lettura periodica non serve.
function bidiCovers(request) {
  if (session.bidi.state !== "active") return false;
  const key = requestKey(request.bytes);
  return key !== null && session.bidi.covered.has(key);
}

function bidiTunerPushing(now = performance.now()) {
  if (session.bidi.state !== "active") return false;
  return ["par:124/15", "par:125/84"].some((key) => now - (session.bidi.lastPushAt.get(key) ?? -Infinity) < 400);
}

function pollRequestKeys() {
  return [
    ...buildProfilerPollRequests().map((request) => requestKey(request.bytes)),
    ...buildFixedFxStateRequests().map((request) => requestKey(request.bytes)),
  ].filter(Boolean);
}

function paintBidi() {
  const bidi = session.bidi;
  const active = bidi.state === "active";
  ui.bidiCard.dataset.state = bidi.state;
  ui.bidiState.textContent = BIDI_LABELS[bidi.state] ?? bidi.state;
  ui.bidiToggle.textContent = `Bidirezionale: ${bidi.enabled ? "ON" : "OFF"}`;
  ui.bidiToggle.setAttribute("aria-pressed", String(bidi.enabled));
  const shortName = (key) => keyName(key).replace(/ tipo$/, "");
  const covered = [...new Set([...bidi.covered].map(shortName))];
  const stillPolled = [...new Set(pollRequestKeys().filter((key) => !active || !bidi.covered.has(key)).map(shortName))];
  const rate = requestsPerMinute();
  ui.bidiNote.textContent = {
    disabled: "Spenta: l’app legge lo stato del Player ogni 1,5 s, come nella v1.36.",
    off: "Si avvia da sola quando il Player è collegato con SysEx autorizzato.",
    starting: "Beacon inviato: attendo che il Player risponda…",
    active: "Il Player invia da solo i cambiamenti: meno messaggi e aggiornamenti più rapidi. Controllo di sicurezza ogni 10 s.",
    lost: "Il Player ha smesso di rispondere: l’app è tornata alle letture periodiche e riprova ogni 5 s.",
    unavailable: "Il Player non risponde al beacon: l’app continua con le letture periodiche e riprova ogni 10 s.",
  }[bidi.state] ?? "";
  ui.bidiCovered.textContent = active
    ? `Inviati dal Player: ${covered.length ? covered.join(" · ") : "in attesa del primo invio"}\nLetti dall’app: ${stillPolled.length ? stillPolled.join(" · ") : "nessuno"}${rate === null ? "" : `\nRichieste dell’app: circa ${rate} al minuto`}`
    : rate === null ? "" : `Richieste dell’app: circa ${rate} al minuto`;
  paintLiveConnection();
}

function toggleBidirectional() {
  const bidi = session.bidi;
  bidi.enabled = !bidi.enabled;
  try { localStorage.setItem(BIDI_KEY, bidi.enabled ? "1" : "0"); } catch { /* facoltativo */ }
  if (bidi.enabled) {
    bidi.lastInitAt = 0;
    bidi.attemptsWithoutReply = 0;
    setBidiState("off", "Riaccesa dall'utente");
    if (session.access) startBidiTimer();
    toast("Modalità bidirezionale accesa");
  } else {
    bidi.covered.clear();
    setBidiState("disabled", "Spenta dall'utente");
    toast("Modalità bidirezionale spenta · letture periodiche");
  }
  paintBidi();
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
    window.setTimeout(requestLooperLocation, 240);
  }
  ui.syncStatus.textContent = "Richiesta inviata al Profiler…";
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
  session.gapFills = (session.gapFills ?? 0) + 1;
}

function syncAfterChange(delay = 240, options = { silent: true }) {
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
function confirmationPollAllowed(startedAt) {
  return session.bidi.state !== "active" || performance.now() - startedAt >= 700;
}

function scheduleRigChangeSync() {
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

  const morphStartedAt = performance.now();
  const requestConfirmation = () => {
    if (confirmationPollAllowed(morphStartedAt)) sendProfilerRequests([buildMorphLevelRequest()], { record: false });
  };
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

  const tunerStartedAt = performance.now();
  const requestConfirmation = () => {
    if (confirmationPollAllowed(tunerStartedAt)) sendProfilerRequests([buildTunerModeRequest()], { record: false });
  };
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
const looper = { state: "empty", since: 0, loopLength: null, stopPresses: 0, reverse: false, half: false, timer: null,
  // v1.41: posizione stimata nel giro (0…1) per il cerchio di avanzamento.
  recordedHalf: false, phaseAt: 0, phaseTime: 0, phaseRate: 0, ringTimer: null };
try { looper.half = localStorage.getItem(LOOPER_HALF_KEY) === "1"; } catch { /* facoltativo */ }
// v1.42: anche REVERSE resta attivo sul Player dopo la cancellazione (prova del 26/09/2026): lo si ricorda.
const LOOPER_REVERSE_KEY = "kemper-stage-view-looper-reverse";
try { looper.reverse = localStorage.getItem(LOOPER_REVERSE_KEY) === "1"; } catch { /* facoltativo */ }
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

function setLooperReverse(value) {
  looper.reverse = value;
  try { localStorage.setItem(LOOPER_REVERSE_KEY, value ? "1" : "0"); } catch { /* facoltativo */ }
  rebaseLooperPhase();
  paintLooperState();
}

function setLooperHalf(value) {
  looper.half = value;
  try { localStorage.setItem(LOOPER_HALF_KEY, value ? "1" : "0"); } catch { /* facoltativo */ }
  paintLooperState();
}

// ── Cerchio di avanzamento del Looper (v1.41) ─────────────────────────────
// Stima: il giro parte quando si chiude la registrazione (o dopo STOP → PLAY / TRIGGER),
// REVERSE lo fa girare all'indietro, ½ SPEED rispetto alla registrazione lo rallenta o lo accelera.
function looperRate() {
  if (!looper.loopLength || (looper.state !== "playing" && looper.state !== "overdub")) return 0;
  const speed = looper.half === looper.recordedHalf ? 1 : looper.half ? 0.5 : 2;
  return (looper.reverse ? -1 : 1) * speed / (looper.loopLength * 1000);
}

function looperPhase(now = performance.now()) {
  const phase = looper.phaseAt + (now - looper.phaseTime) * looper.phaseRate;
  return ((phase % 1) + 1) % 1;
}

function rebaseLooperPhase({ restart = false } = {}) {
  const now = performance.now();
  looper.phaseAt = restart ? (looper.reverse ? 1 : 0) : looperPhase(now);
  looper.phaseTime = now;
  looper.phaseRate = looperRate();
  window.clearInterval(looper.ringTimer);
  looper.ringTimer = looper.phaseRate ? window.setInterval(paintLooperRing, 80) : null;
  paintLooperRing();
}

function paintLooperRing() {
  if (document.visibilityState !== "visible" && looper.ringTimer !== null) return;
  const show = looper.loopLength !== null && looper.state !== "empty" && looper.state !== "recording";
  const phase = show ? looperPhase() : 0;
  for (const node of [ui.looperState, ui.stageLooper]) {
    node.dataset.ring = String(show);
    node.style.setProperty("--p", phase.toFixed(4));
  }
}

function setLooperState(next) {
  const now = performance.now();
  const previous = looper.state;
  if (previous === "empty" && next === "recording") looper.recordedHalf = looper.half;
  if (looper.state === "recording" && next !== "recording") looper.loopLength = (now - looper.since) / 1000;
  // ½ SPEED resta attivo sul Player anche dopo la cancellazione (prova del 25/09/2026)
  // e anche REVERSE (prova del 26/09/2026): nessuno dei due si azzera con la cancellazione.
  if (next === "empty") looper.loopLength = null;
  if (next !== looper.state) looper.since = now;
  looper.state = next;
  window.clearInterval(looper.timer);
  // v1.43: durante la registrazione il timer aggiorna solo contatore e battito (non tutta la scheda).
  looper.timer = next === "recording" ? window.setInterval(paintLooperClock, 50) : null;
  if (next !== "recording" && looper.pendingClose) {
    window.clearTimeout(looper.pendingClose.timer);
    looper.pendingClose = null;
  }
  // Il giro riparte da capo quando si chiude la registrazione o si riparte da FERMO.
  rebaseLooperPhase({ restart: next === "playing" && (previous === "recording" || previous === "stopped") });
  paintLooperState();
}

function setTextIfChanged(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

function paintLooperClock() {
  if (looper.state !== "recording") { paintLooperState(); return; }
  if (document.visibilityState !== "visible") return;
  const mode = QUANTIZE_MODES[looper.quantize];
  const bpm = currentBpm();
  const elapsed = performance.now() - looper.since;
  let time = `${(elapsed / 1000).toFixed(1)} s`;
  let beatLabel = "";
  let beatState = "none";
  if (mode.beats && bpm) {
    const beatMs = 60000 / bpm;
    const beatIndex = Math.floor(elapsed / beatMs);
    const perBar = beatsPerBar();
    const beat = (beatIndex % perBar) + 1;
    beatLabel = `BATTUTA ${Math.floor(beatIndex / perBar) + 1} · ${beat}/${perBar}`;
    time = beatLabel;
    beatState = elapsed - beatIndex * beatMs < 140 ? (beat === 1 ? "down" : "on") : "off";
  }
  if (looper.pendingClose) time = `CHIUDO TRA ${(Math.max(0, looper.pendingClose.at - performance.now()) / 1000).toFixed(1)} s`;
  if (ui.looperState.dataset.beat !== beatState) ui.looperState.dataset.beat = beatState;
  setTextIfChanged(ui.looperStateTime, time);
  setTextIfChanged(ui.looperStateLabel, looper.pendingClose ? "CHIUSURA A TEMPO" : LOOPER_LABELS.recording);
  setTextIfChanged(ui.stageLooper, looper.pendingClose ? "● CHIUDO…"
    : beatLabel ? `● REC ${beatLabel.replace("BATTUTA ", "").replace(" · ", ".")}` : `● REC ${Math.floor(elapsed / 1000)}s`);
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
  const flags = [looper.reverse ? "REVERSE" : "", looper.half ? "½ SPEED" : ""].filter(Boolean).join(" · ");
  ui.looperReverse.dataset.active = String(looper.reverse);
  ui.looperReverseLabel.textContent = `REVERSE: ${looper.reverse ? "ON" : "OFF"}`;
  ui.looperReverseNote.textContent = looper.reverse
    ? "Il loop suona al contrario. REVERSE resta attivo sul Player anche dopo aver cancellato il loop: tocca REVERSE per tornare normale."
    : "";
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
      // v1.42: tolta la regola "tre STOP = loop cancellato" (non vera sul Player, prova del 26/09/2026).
      // Il loop si cancella tenendo premuto STOP: lo fa il pulsante CANCELLA LOOP.
      if (looper.state !== "empty") setLooperState("stopped");
      break;
    case "undo":
      if (looper.state === "overdub") setLooperState("playing");
      break;
    case "reverse":
      // Il Player cambia REVERSE anche a loop vuoto: l'app lo segue sempre.
      setLooperReverse(!looper.reverse);
      break;
    case "half":
      setLooperHalf(!looper.half);
      rebaseLooperPhase();
      break;
    case "trigger":
      // TRIGGER fa ripartire dall'inizio il loop che sta suonando. Da FERMO il Player suona solo
      // finché è tenuto premuto: l'app lì invia PLAY (vedi looperSendKey), quindi lo stato non cambia.
      if (looper.loopLength !== null && (looper.state === "playing" || looper.state === "overdub")) {
        rebaseLooperPhase({ restart: true });
      }
      break;
    case "erase":
      setLooperState("empty");
      break;
    default:
      break;
  }
}
// v1.44: con il loop FERMO il Player fa suonare TRIGGER solo finché è tenuto premuto
// (prova del 26/09/2026: tocchi di 80 ms, nessun suono). Da FERMO l'app invia quindi PLAY,
// che fa ripartire il loop dall'inizio con un solo tocco; mentre suona TRIGGER resta TRIGGER.
function looperSendKey(key) {
  if (key === "trigger" && looper.state === "stopped" && looper.loopLength !== null) return "record";
  return key;
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
  let sentKey = key;
  const note = () => {
    if (sentKey !== key) ui.looperStatus.textContent = "TRIGGER · loop fermo: riparte dall’inizio (inviato PLAY)";
  };
  const press = () => {
    if (button.disabled || held) return;
    if (key === "record" && (looper.pendingClose || looper.state === "recording") && handleQuantizedRecord()) return;
    sentKey = looperSendKey(key);
    if (!sendLooperSwitch(sentKey, true)) return;
    note();
    held = true;
    button.dataset.pressed = "true";
    looperSwitchReleases.add(release);
  };
  const release = () => {
    if (!held) return;
    held = false;
    button.dataset.pressed = "false";
    looperSwitchReleases.delete(release);
    sendLooperSwitch(sentKey, false);
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
    const clickKey = looperSendKey(key);
    if (sendLooperSwitch(clickKey, true)) {
      if (clickKey !== key) ui.looperStatus.textContent = "TRIGGER · loop fermo: riparte dall’inizio (inviato PLAY)";
      window.setTimeout(() => sendLooperSwitch(clickKey, false), 90);
    }
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
  session.syncTimer = syncAfterChange(180, {});
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
      probeResults: session.looperProbeResults ?? [],
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
ui.looperReverseFix.addEventListener("click", () => setLooperReverse(!looper.reverse));
for (const button of ui.quantizeButtons) button.addEventListener("click", () => setQuantizeMode(button.dataset.quantize));
for (const button of ui.locationButtons) button.addEventListener("click", () => setLooperLocation(Number(button.dataset.looperLocation)));
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
ui.rigCurrentJump.addEventListener("click", () => {
  if (session.rigSelectedBank === null || session.rigSelectPending !== null) return;
  session.rigTargetBank = session.rigSelectedBank;
  refreshRigControls();
});
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
ui.bidiToggle.addEventListener("click", toggleBidirectional);

// v1.41: tema SCURO / SOLE (ricordato sul telefono)
const THEME_KEY = "kemper-stage-view-theme";
function applyTheme(theme, { remember = true } = {}) {
  const next = theme === "sun" ? "sun" : "dark";
  document.body.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "sun" ? "#e9ede7" : "#07110d");
  for (const button of ui.themeButtons) button.setAttribute("aria-pressed", String(button.dataset.themeChoice === next));
  if (remember) {
    try { localStorage.setItem(THEME_KEY, next); } catch { /* facoltativo */ }
  }
}
for (const button of ui.themeButtons) button.addEventListener("click", () => applyTheme(button.dataset.themeChoice));
try { applyTheme(localStorage.getItem(THEME_KEY) ?? "dark", { remember: false }); } catch { applyTheme("dark", { remember: false }); }

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
paintBidi();
try {
  setAppView(localStorage.getItem("kemper-stage-view-mode") ?? "live", { remember: false });
} catch {
  setAppView("live", { remember: false });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
