// v1.78: i pedali della Chocolate Plus comandano l'app, su due pagine scelte da Giovanni (15/10/2026):
// LOOPER = REC/PLAY · STOP · TRIGGER · UNDO, SUONO = Rig − · Rig + · FREEZE · MORPH.
// A, B e C partono alla pressione (per il Looper conta il tempo; REC, STOP e TRIGGER restano premuti finché
// il pedale è giù, come i pulsanti dello schermo). D aspetta il rilascio: tocco = UNDO o MORPH,
// tenuto 0,8 s = cambio pagina (un tocco normale dura 0,2–0,3 s: prova del 15/10/2026).
// Il pedale è un tocco dell'utente: ogni comando passa dalle stesse funzioni dello schermo e aspetta la conferma
// del Player. Lo stato del Looper resta una stima dell'app, aggiornata come per i tocchi.

import { neighborRig } from "../kemper-midi.js";
import { toast, ui } from "./dom.js";
import { session } from "./state.js";
import { handleQuantizedRecord, looper, looperSendKey, looperSwitchReleases, sendLooperSwitch } from "./looper.js";
import { selectRigSlot } from "./rig.js";
import { toggleMorphFromApp } from "./morph.js";
import { toggleRevFreeze } from "./fixed-fx.js";

export const PEDAL_LETTERS = ["A", "B", "C", "D"];
export const PEDAL_PAGES = [
  { name: "LOOPER", pedals: [
    { label: "REC/PLAY", looper: "record" },
    { label: "STOP", looper: "stop" },
    { label: "TRIGGER", looper: "trigger" },
    { label: "UNDO", tap: "undo" },
  ] },
  { name: "SUONO", pedals: [
    { label: "RIG −", rig: -1 },
    { label: "RIG +", rig: 1 },
    { label: "FREEZE", freeze: true },
    { label: "MORPH", tap: "morph" },
  ] },
];
const PAGE_PEDAL = 3; // D
export const PEDAL_LONG_PRESS_MS = 800;
const TAP_RELEASE_MS = 90;
const MAX_ACTIONS = 30;

session.pedalControl = { page: 0, held: new Map(), actions: [] };

function noteAction(pedal, page, action, sent) {
  const control = session.pedalControl;
  control.actions.push({ time: new Date().toISOString(), pedal: PEDAL_LETTERS[pedal], page: PEDAL_PAGES[page].name, action, sent });
  control.actions = control.actions.slice(-MAX_ACTIONS);
  ui.copy.disabled = false;
}

// Looper: pressione e rilascio come i pulsanti REC, STOP e TRIGGER dello schermo (looper-touch.js).
function pressLooper(key) {
  if (key === "record" && (looper.pendingClose || looper.state === "recording") && handleQuantizedRecord()) return { sent: true, release: null };
  const sentKey = looperSendKey(key);
  if (!sendLooperSwitch(sentKey, true, key)) return { sent: false, release: null };
  let done = false;
  const release = () => {
    if (done) return;
    done = true;
    looperSwitchReleases.delete(release);
    sendLooperSwitch(sentKey, false, key);
  };
  looperSwitchReleases.add(release);
  return { sent: true, release };
}

function stepRig(delta) {
  if (session.rigSelectPending !== null) return false;
  if (session.rigSelectedBank === null || session.rigSelectedSlot === null) {
    toast("Pedale: Rig in uso non ancora letto");
    return false;
  }
  const next = neighborRig(session.rigSelectedBank, session.rigSelectedSlot, delta, session.maxBanks);
  if (!next) return false;
  session.rigTargetBank = next.bank;
  selectRigSlot(next.slot);
  return session.rigSelectPending !== null;
}

function pressAction(pedal, page) {
  const action = PEDAL_PAGES[page].pedals[pedal];
  if (action.looper) {
    const { sent, release } = pressLooper(action.looper);
    noteAction(pedal, page, action.label, sent);
    return release;
  }
  if (action.rig) {
    noteAction(pedal, page, action.label, stepRig(action.rig));
    return null;
  }
  if (action.freeze) {
    const free = session.freezeRevPending === null;
    if (free) toggleRevFreeze();
    noteAction(pedal, page, action.label, free);
  }
  return null;
}

function tapAction(pedal, page) {
  const action = PEDAL_PAGES[page].pedals[pedal];
  let sent = false;
  if (action.tap === "undo") {
    sent = sendLooperSwitch("undo", true);
    if (sent) window.setTimeout(() => sendLooperSwitch("undo", false), TAP_RELEASE_MS);
  } else if (action.tap === "morph" && session.morphPendingLevel === null) {
    toggleMorphFromApp();
    sent = true;
  }
  noteAction(pedal, page, action.label, sent);
}

function switchPage() {
  const control = session.pedalControl;
  control.page = (control.page + 1) % PEDAL_PAGES.length;
  noteAction(PAGE_PEDAL, control.page, `PAGINA ${PEDAL_PAGES[control.page].name}`, false);
  navigator.vibrate?.(40);
  toast(`Pedale · pagina ${PEDAL_PAGES[control.page].name}`);
  paintPedalPage();
}

// Pressione o rilascio di un pedale (0 = A … 3 = D).
export function handlePedalSwitch(pedal, pressed) {
  const control = session.pedalControl;
  if (pressed) {
    if (control.held.has(pedal)) return; // pressione ripetuta senza rilascio
    const hold = { page: control.page, release: null, timer: null, long: false };
    control.held.set(pedal, hold);
    if (pedal === PAGE_PEDAL) {
      hold.timer = window.setTimeout(() => { hold.long = true; switchPage(); }, PEDAL_LONG_PRESS_MS);
    } else {
      hold.release = pressAction(pedal, control.page);
    }
    paintPedalPage();
    return;
  }
  const hold = control.held.get(pedal);
  if (!hold) return;
  control.held.delete(pedal);
  window.clearTimeout(hold.timer);
  if (pedal === PAGE_PEDAL) {
    if (!hold.long) tapAction(pedal, hold.page);
  } else {
    hold.release?.();
  }
  paintPedalPage();
}

// Pedale scollegato: si rilascia tutto ciò che era tenuto premuto (un REC tenuto non deve restare premuto).
export function releaseAllPedals() {
  const control = session.pedalControl;
  for (const hold of control.held.values()) {
    window.clearTimeout(hold.timer);
    hold.release?.();
  }
  control.held.clear();
  paintPedalPage();
}

export function nextPedalPage() {
  switchPage();
}

// Riga del pedale in PALCO: pagina in uso e funzione di ogni pedale; il pedale premuto si illumina.
export function paintPedalPage() {
  const control = session.pedalControl;
  const page = PEDAL_PAGES[control.page];
  ui.stagePedalPage.textContent = page.name;
  ui.stagePedalPage.setAttribute("aria-label", `Pagina pedale ${page.name}: tocca per cambiare`);
  ui.stagePedalCells.forEach((cell, pedal) => {
    cell.querySelector("span").textContent = page.pedals[pedal].label;
    cell.dataset.pressed = String(control.held.has(pedal));
  });
}

export function pedalControlDiagnostics() {
  const control = session.pedalControl;
  return {
    mapping: "CC 20…23 = pedali A…D (127 premuto, 0 rilasciato); D tenuto 0,8 s = cambio pagina",
    page: PEDAL_PAGES[control.page].name,
    held: [...control.held.keys()].map((pedal) => PEDAL_LETTERS[pedal]),
    actions: control.actions,
  };
}
