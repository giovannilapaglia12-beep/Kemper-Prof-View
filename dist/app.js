// Kemper Profiler View — accensione dell'app.
// Collega i pulsanti della pagina alle funzioni dei moduli in js/ e avvia l'app.
// Il resto del codice è diviso per argomento in js/ (v1.60); il protocollo MIDI è in kemper-midi.js.

import { THEME_KEY } from "./js/config.js";
import { toast, ui } from "./js/dom.js";
import { session } from "./js/state.js";
import { applyTheme, setAppView } from "./js/views.js";
import { clearLog, copyDiagnostics, saveDiagnostics } from "./js/diagnostics.js";
import { changeTempoBy, roundTempoToInteger, tapTempo } from "./js/tempo.js";
import { refreshLiveMorphControls, sendMorphCommand, toggleMorphFromApp } from "./js/morph.js";
import { sendTunerCommand, toggleTunerFromApp } from "./js/tuner.js";
import { refreshFixedFxControls, refreshFreezeControls, toggleRevFreeze } from "./js/fixed-fx.js";
import { forgetAllNames } from "./js/rig-names.js";
import {
  changeRigTargetBank,
  closeBankPicker,
  openBankPicker,
  refreshRigControls,
  selectRigSlot,
  setMaxBanks,
} from "./js/rig.js";
import { setConnection } from "./js/screen.js";
import { connect, keepScreenOn } from "./js/connection.js";
import { paintBidi, toggleBidirectional } from "./js/bidi.js";
import { requestProfilerState, toggleAutoSync } from "./js/sync.js";
import {
  looper,
  paintLooperState,
  refreshLooperControls,
  releaseAllLooperSwitches,
  setLooperHalf,
  setLooperLocation,
  setLooperReverse,
  setLooperState,
  setQuantizeMode,
} from "./js/looper.js";
import { bindLooperErase, bindLooperSwitch } from "./js/looper-touch.js";
import { startTransposeProbe } from "./js/transpose-probe.js";

// ── Pulsanti: ogni tocco chiama la funzione del modulo che se ne occupa ──────────
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

// v1.51: tolta la prova dei pallini Morph (v1.49–1.50). Esito sul Player il 27/09/2026: i valori dei moduli
// letti con 0x42 sono identici in BASE e MORPH e 0x48 non esiste, quindi dal MIDI non si sa quali effetti
// hanno il Morph (vedi docs/MIDI.md).

ui.transposeProbe.addEventListener("click", startTransposeProbe);
ui.stageLooper.addEventListener("click", () => setAppView("looper"));
bindLooperErase();
window.addEventListener("blur", releaseAllLooperSwitches);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") releaseAllLooperSwitches();
  else keepScreenOn();
});
ui.tunerOverlayClose.addEventListener("click", () => sendTunerCommand(false));
ui.liveTempoDown.addEventListener("click", () => changeTempoBy(-1));
ui.liveTempoRound.addEventListener("click", roundTempoToInteger);
ui.liveTempoUp.addEventListener("click", () => changeTempoBy(1));
ui.liveBankDown.addEventListener("click", () => changeRigTargetBank(-1));
ui.liveBankUp.addEventListener("click", () => changeRigTargetBank(1));
ui.liveBankPick.addEventListener("click", openBankPicker);
ui.liveBankPick.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openBankPicker(); }
});
ui.bankPickerClose.addEventListener("click", closeBankPicker);
ui.bankPickerLess.addEventListener("click", () => setMaxBanks(session.maxBanks - 5));
ui.bankPickerMore.addEventListener("click", () => setMaxBanks(session.maxBanks + 5));
ui.bankPickerGrid.addEventListener("click", (event) => {
  const cell = event.target.closest("[data-pick-bank]");
  if (!cell || session.rigSelectPending !== null) return;
  session.rigTargetBank = Number(cell.dataset.pickBank);
  closeBankPicker();
  refreshRigControls();
});
ui.rigCurrentJump.addEventListener("click", () => {
  if (session.rigSelectedBank === null || session.rigSelectPending !== null) return;
  session.rigTargetBank = session.rigSelectedBank;
  refreshRigControls();
});
for (const button of ui.liveRigSlots) {
  button.addEventListener("click", () => selectRigSlot(Number(button.dataset.liveRigSlot)));
}
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
for (const button of ui.themeButtons) button.addEventListener("click", () => applyTheme(button.dataset.themeChoice));
try { applyTheme(localStorage.getItem(THEME_KEY) ?? "dark", { remember: false }); } catch { applyTheme("dark", { remember: false }); }

// ── Avvio ─────────────────────────────────────────────────────────────────────
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
