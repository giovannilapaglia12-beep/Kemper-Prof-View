// Pulsanti del Looper: pressione/rilascio, tocco vero per REVERSE/½ SPEED/UNDO (v1.52), CANCELLA LOOP.

import { ui } from "./dom.js";
import {
  handleQuantizedRecord,
  looper,
  looperSendKey,
  looperSwitchReleases,
  sendLooperSwitch,
  setLooperState,
} from "./looper.js";

export let cancelLooperErase = () => {};

// v1.52: REVERSE, ½ SPEED e UNDO partono solo con un tocco vero (dito alzato senza trascinare):
// il 27/09/2026 un REVERSE è partito senza volerlo (tocco di 38 ms subito dopo STOP, pulsante accanto a TRIGGER).
// REC, STOP e TRIGGER restano immediati alla pressione, perché lì conta il tempo.
const LOOPER_TAP_ONLY = new Set(["reverse", "half", "undo"]);
const LOOPER_TAP_SLOP_PX = 12;

export function bindLooperSwitch(button) {
  const key = button.dataset.looperSwitch;
  const tapOnly = LOOPER_TAP_ONLY.has(key);
  let held = false;
  let lastDirectAt = 0;
  let sentKey = key;
  let tap = null;
  const note = () => {
    if (sentKey !== key) ui.looperStatus.textContent = "TRIGGER · loop fermo: riparte dall’inizio (inviato PLAY)";
  };
  const press = () => {
    if (button.disabled || held) return;
    if (key === "record" && (looper.pendingClose || looper.state === "recording") && handleQuantizedRecord()) return;
    sentKey = looperSendKey(key);
    if (!sendLooperSwitch(sentKey, true, key)) return;
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
    sendLooperSwitch(sentKey, false, key);
  };
  const cancelTap = () => {
    tap = null;
    button.dataset.pressed = "false";
  };
  const fireTap = () => {
    if (button.disabled) return;
    if (sendLooperSwitch(key, true, key)) window.setTimeout(() => sendLooperSwitch(key, false, key), 90);
  };
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    lastDirectAt = Date.now();
    if (tapOnly) {
      if (button.disabled) return;
      tap = { id: event.pointerId, x: event.clientX, y: event.clientY };
      button.dataset.pressed = "true";
      return;
    }
    press();
    if (held) button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointermove", (event) => {
    if (!tap || event.pointerId !== tap.id) return;
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > LOOPER_TAP_SLOP_PX) cancelTap();
  });
  button.addEventListener("pointerup", (event) => {
    lastDirectAt = Date.now();
    if (tapOnly) {
      const valid = tap && event.pointerId === tap.id
        && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) <= LOOPER_TAP_SLOP_PX;
      cancelTap();
      if (valid) fireTap();
      return;
    }
    release();
  });
  button.addEventListener("pointercancel", () => { if (tapOnly) cancelTap(); else release(); });
  button.addEventListener("pointerleave", () => { if (tapOnly) cancelTap(); });
  button.addEventListener("lostpointercapture", () => { if (!tapOnly) release(); });
  button.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    lastDirectAt = Date.now();
    if (!event.repeat && !tapOnly) press();
  });
  button.addEventListener("keyup", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    lastDirectAt = Date.now();
    if (tapOnly) fireTap(); else release();
  });
  button.addEventListener("blur", () => { if (tapOnly) cancelTap(); else release(); });
  button.addEventListener("click", () => {
    if (button.disabled || Date.now() - lastDirectAt < 600) return;
    if (key === "record" && (looper.pendingClose || looper.state === "recording") && handleQuantizedRecord()) return;
    const clickKey = looperSendKey(key);
    if (sendLooperSwitch(clickKey, true, key)) {
      if (clickKey !== key) ui.looperStatus.textContent = "TRIGGER · loop fermo: riparte dall’inizio (inviato PLAY)";
      window.setTimeout(() => sendLooperSwitch(clickKey, false, key), 90);
    }
  });
}

export function bindLooperErase() {
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
