// Nomi di Bank e Rig ricevuti dal Player e ricordati sul telefono; ampli e cabinet del Rig in uso (AMP/CAB).

import {
  buildBankNamesRequests,
  buildRigStackRequests,
  rigStackField,
  rigStackLabel,
  rigStackMissing,
} from "../kemper-midi.js";
import { BANK_NAMES_KEY, RIG_NAMES_KEY } from "./config.js";
import { ui } from "./dom.js";
import { session } from "./state.js";
import { refreshRigControls } from "./rig.js";
import { profilerOutputs, sendProfilerRequests } from "./connection.js";

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
try {
  const stored = JSON.parse(localStorage.getItem(BANK_NAMES_KEY) ?? "{}");
  for (const [key, name] of Object.entries(stored.banks ?? {})) if (typeof name === "string") session.bankNames.set(key, name);
  for (const [key, name] of Object.entries(stored.slots ?? {})) if (/^\d+:[1-5]$/.test(key) && typeof name === "string") session.slotNames.set(key, name);
} catch { /* facoltativo */ }

export function rememberBankList(bank, list) {
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

export function handleBankNames(decoded) {
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

export function scheduleBankNamesCheck(bank) {
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

export function scheduleRigStackRequest(rigName) {
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

export function handleRigStack(decoded) {
  const field = rigStackField(decoded);
  if (!field) return;
  const stack = session.rigStack;
  stack.replies += 1;
  stack.values[field.key] = field.value;
  if (stack.rig) stack.cache.set(stack.rig, { ...stack.values });
  // v1.46: si tengono le ultime 80 risposte (prima le prime 40: i Rig provati per ultimi mancavano).
  stack.log.push({ time: new Date().toISOString(), rig: stack.rig, key: field.key, value: field.raw ?? field.value });
  if (stack.log.length > 80) stack.log.splice(0, stack.log.length - 80);
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
    const missing = rigStackMissing(values, prefix);
    node.dataset.on = missing ? "none" : on === undefined ? "unknown" : String(on);
    // Acceso ma senza nome (prova del 27/09/2026, Rig RT FIRESPIT): di solito un cabinet importato senza nome.
    const unnamed = !label && [`${prefix}Name`, `${prefix}Maker`, `${prefix}Model`].every((key) => key in values);
    // v1.47: tre casi distinti — NON PRESENTE (N/A), SPENTO (OFF · nome), ACCESO (nome).
    nameNode.textContent = missing
      ? "NON PRESENTE"
      : on === false
        ? `SPENTO · ${label || "senza nome"}`
        : (label || (unnamed ? "senza nome" : "—"));
    node.title = label;
  }
}

export function forgetAllNames() {
  session.rigNames.clear();
  session.slotNames.clear();
  session.bankNames.clear();
  try {
    localStorage.removeItem(RIG_NAMES_KEY);
    localStorage.removeItem(BANK_NAMES_KEY);
  } catch { /* facoltativo */ }
  refreshRigControls();
}

export function rememberRigName(bank, slot, name) {
  if (!name) return;
  session.rigNames.set(`${bank}:${slot}`, name);
  if (window.__kemperDemo) return;
  try { localStorage.setItem(RIG_NAMES_KEY, JSON.stringify(Object.fromEntries(session.rigNames))); } catch { /* facoltativo */ }
}
