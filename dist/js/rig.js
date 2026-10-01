// Scelta di Bank e Rig (125 Bank, Bank Select), griglia delle Bank, colori, conferma del cambio Rig.

import {
  bankColor,
  buildRigNameRequest,
  buildRigSelectMessages,
  bytesToHex,
  PLAYER_MAX_BANKS,
  rigIndexToBankSlot,
} from "../kemper-midi.js";
import { MAX_BANKS_KEY } from "./config.js";
import { escapeHtml, toast, ui } from "./dom.js";
import { session } from "./state.js";
import { setAppView } from "./views.js";
import { resetFixedFxState, resetFreezeState } from "./fixed-fx.js";
import { rememberBankList, rememberRigName, scheduleBankNamesCheck } from "./rig-names.js";
import { describePort, profilerOutputs, sendProfilerRequests } from "./connection.js";
import { syncAfterChange } from "./sync.js";

export function refreshRigControls() {
  const hasOutput = profilerOutputs().length > 0;
  const pending = session.rigSelectPending !== null;
  ui.liveBankValue.textContent = String(session.rigTargetBank);
  ui.liveBankName.textContent = session.bankNames.get(String(session.rigTargetBank)) ?? "";
  ui.liveBankDown.disabled = pending || session.rigTargetBank <= 1;
  ui.liveBankUp.disabled = pending || session.rigTargetBank >= session.maxBanks;
  paintBankColors();
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
  const notInUse = !hasOutput
    ? "Collega il Kemper"
    : !session.sysex ? "Autorizza SysEx" : `RIG NON RILEVATO · scegli Bank ${session.rigTargetBank}`;
  ui.liveRigStatus.textContent = pending
    ? `CARICO BANK ${target.bank} · RIG ${target.slot}…`
    : session.rigSelectedBank === null
      ? notInUse
      : `IN USO: BANK ${session.rigSelectedBank} · RIG ${session.rigSelectedSlot}${session.lastState?.rigName ? ` · ${session.lastState.rigName}` : ""}`;
  ui.rigCurrentJump.hidden = pending || session.rigSelectedBank === null || session.rigSelectedBank === session.rigTargetBank;
  ui.liveRigSlots[0]?.closest(".live-rig-selector")?.setAttribute("data-other-bank", String(!ui.rigCurrentJump.hidden));
  ui.liveRigPosition.textContent = pending
    ? `→ BANK ${target.bank} · RIG ${target.slot}`
    : session.rigSelectedBank !== null
      ? `BANK ${session.rigSelectedBank} · RIG ${session.rigSelectedSlot}`
      : "BANK — · RIG —";
}

// ── Colori delle Bank e scelta rapida (v1.48) ─────────────────────────────
function paintBankColors() {
  const target = bankColor(session.rigTargetBank);
  for (const row of document.querySelectorAll(".live-bank-row")) {
    if (target) row.dataset.bankColor = target.key;
  }
  const inUse = bankColor(session.rigSelectPending?.bank ?? session.rigSelectedBank);
  if (inUse) ui.liveRigPosition.dataset.bankColor = inUse.key;
  else delete ui.liveRigPosition.dataset.bankColor;
  // v1.72: il Rig in uso nella scheda RIG ha il colore della sua Bank (richiesta di Giovanni, 01/10/2026).
  const slots = ui.liveRigSlots[0]?.parentElement;
  if (slots && inUse) slots.dataset.bankColor = inUse.key;
  else if (slots) delete slots.dataset.bankColor;
  if (!ui.bankPicker.hidden) paintBankPicker();
}

function paintBankPicker() {
  ui.bankPickerMax.textContent = String(session.maxBanks);
  ui.bankPickerLess.disabled = session.maxBanks <= 5;
  ui.bankPickerMore.disabled = session.maxBanks >= PLAYER_MAX_BANKS;
  const cells = [];
  for (let bank = 1; bank <= session.maxBanks; bank += 1) {
    const color = bankColor(bank);
    const name = session.bankNames.get(String(bank)) ?? "";
    const current = bank === session.rigSelectedBank;
    const chosen = bank === session.rigTargetBank;
    cells.push(`<button type="button" data-pick-bank="${bank}" data-bank-color="${color.key}" data-current="${current}" data-chosen="${chosen}"`
      + ` aria-label="Bank ${bank}${name ? `, ${escapeHtml(name)}` : ""}${current ? ", in uso" : ""}">`
      + `<strong>${bank}</strong><small>${escapeHtml(name)}</small></button>`);
  }
  ui.bankPickerGrid.innerHTML = cells.join("");
}

export function openBankPicker() {
  if (session.rigSelectPending !== null) return;
  ui.bankPicker.hidden = false;
  paintBankPicker();
  const chosen = ui.bankPickerGrid.querySelector('[data-chosen="true"]');
  chosen?.scrollIntoView({ block: "center" });
}

export function closeBankPicker() {
  ui.bankPicker.hidden = true;
}

export function setMaxBanks(value) {
  session.maxBanks = Math.max(5, Math.min(PLAYER_MAX_BANKS, value));
  try { localStorage.setItem(MAX_BANKS_KEY, String(session.maxBanks)); } catch { /* facoltativo */ }
  if (session.rigTargetBank > session.maxBanks) session.rigTargetBank = session.maxBanks;
  refreshRigControls();
  paintBankPicker();
}

export function stopRigSelectionConfirmation() {
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

export function refreshRigControlsOnBankNames(decoded) {
  if (decoded?.type === "Program Change") refreshRigControls();
}

export function handleRigSelectionState(decoded) {
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

export function trackProfilerRig(decoded) {
  if (decoded?.type === "Program Change") {
    // v1.48: tutte le 125 Bank (con Bank Select CC 32), non più solo le prime 10.
    const position = rigIndexToBankSlot(decoded.rigIndex ?? decoded.program);
    if (!position) return;
    const { bank, slot } = position;
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

export function changeRigTargetBank(delta) {
  if (session.rigSelectPending !== null) return;
  session.rigTargetBank = Math.max(1, Math.min(session.maxBanks, session.rigTargetBank + delta));
  refreshRigControls();
}

export function selectRigSlot(slot) {
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
  const channel = Math.max(1, Math.min(16, session.lastState?.channel ?? 1));
  // v1.48: CC 0 + CC 32 (Bank Select) + Program Change, come li invia il Player: servono dalla Bank 26 in su.
  const { program, bankSelect, messages } = buildRigSelectMessages(bank, slot, channel);
  const time = new Date().toISOString();
  const command = { time, bank, slot, channel, program, bankSelect, displayedProgram: program + 1 };
  session.rigSelectPending = command;
  session.rigSelectLastCommand = command;
  for (const output of outputs) {
    for (const bytes of messages) {
      output.send(bytes);
      session.transmitted.push({
        time,
        output: describePort(output),
        label: `Bank ${bank} · Rig ${slot} (Bank Select ${bankSelect} · PC ${program + 1})`,
        hex: bytesToHex(bytes),
      });
    }
  }
  session.transmitted = session.transmitted.slice(-100);
  refreshRigControls();

  window.setTimeout(requestRigSelectionConfirmation, 150);
  session.rigSelectPollTimer = window.setInterval(requestRigSelectionConfirmation, 400);
  session.rigSelectTimeout = window.setTimeout(() => {
    const target = session.rigSelectPending;
    stopRigSelectionConfirmation();
    toast(`Il Kemper non ha confermato Bank ${target?.bank} · Rig ${target?.slot}`);
  }, 3000);
  ui.copy.disabled = false;
}
