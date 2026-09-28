// Schede PALCO / RIG / LOOPER / ALTRO e tema SCURO / SOLE.

import { THEME_KEY } from "./config.js";
import { ui } from "./dom.js";
import { paintTunerOverlay } from "./tuner.js";
import { releaseAllLooperSwitches, requestLooperLocation } from "./looper.js";

export function setAppView(view, { remember = true } = {}) {
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

// v1.41: tema SCURO / SOLE (ricordato sul telefono)
export function applyTheme(theme, { remember = true } = {}) {
  const next = theme === "sun" ? "sun" : "dark";
  document.body.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "sun" ? "#e9ede7" : "#07110d");
  for (const button of ui.themeButtons) button.setAttribute("aria-pressed", String(button.dataset.themeChoice === next));
  if (remember) {
    try { localStorage.setItem(THEME_KEY, next); } catch { /* facoltativo */ }
  }
}
