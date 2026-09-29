// Riferimenti agli elementi della pagina e piccole utilità di visualizzazione (messaggi brevi, testo).

document.documentElement.lang = "it";
const $ = (selector) => document.querySelector(selector);

export const ui = {
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
  liveBankDown: $("#live-bank-down"),
  liveBankUp: $("#live-bank-up"),
  liveBankPick: $("#live-bank-pick"),
  bankPicker: $("#bank-picker"),
  bankPickerGrid: $("#bank-picker-grid"),
  bankPickerClose: $("#bank-picker-close"),
  bankPickerMax: $("#bank-picker-max"),
  bankPickerLess: $("#bank-picker-less"),
  bankPickerMore: $("#bank-picker-more"),
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
  transposeProbe: $("#transpose-probe-button"),
  transposeProbeResult: $("#transpose-probe-result"),
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
  liveTransposePicker: $("#live-transpose-picker"),
  liveTransposeClose: $("#live-transpose-close"),
  liveTransposeChoices: [...document.querySelectorAll("[data-transpose]")],
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

// v1.38: messaggi brevi in basso, compatti e trasparenti ai tocchi.
// kind: "ok" (conferma), "warn" (problema) o "info". In PALCO le conferme di routine
// non compaiono: lo stato è già visibile sui pulsanti.
export function toast(message, kind) {
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

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function setTextIfChanged(node, text) {
  if (node.textContent !== text) node.textContent = text;
}
