// Modalità bidirezionale (v1.37): beacon, sensing del Player e parametri inviati dal Player da solo.

import {
  buildBeaconRequest,
  buildFixedFxStateRequests,
  buildProfilerPollRequests,
  buildTransposeValueRequest,
  decodedKey,
  EFFECT_MODULES,
  FIXED_FX,
  requestKey,
} from "../kemper-midi.js";
import { BIDI_KEY } from "./config.js";
import { toast, ui } from "./dom.js";
import { session } from "./state.js";
import { paintLiveConnection } from "./screen.js";
import { profilerInputs, profilerOutputs, sendProfilerRequests } from "./connection.js";

// ── Modalità bidirezionale (v1.37) ─────────────────────────────────────────
// L'app invia un "beacon" al Player; il Player risponde con un messaggio di "sensing"
// circa ogni 500 ms e invia da solo i parametri che cambiano (set 2: effetti A–MOD,
// nome Rig, Tuner). I parametri che il Player invia da solo non vengono più letti di
// continuo; tutti gli altri (e tutto, se il collegamento cade) restano letti come prima.
export const BIDI_LEASE_SECONDS = 30;
const BIDI_RESEND_MS = 12000;
const BIDI_INIT_RETRY_MS = 5000;
// Prova sul Player (26/09/2026): durante il caricamento di un Rig il sensing si ferma per circa 2 s.
const BIDI_SENSING_TIMEOUT_MS = 4000;
const BIDI_PUSH_WINDOW_MS = 350;
export const BIDI_SAFETY_POLL_MS = 10000;
const BIDI_TICK_MS = 250;
// v1.62: al ritorno in primo piano (dopo un'altra app o una chiamata) Chrome consegna in ritardo i messaggi
// arrivati nel frattempo: per 2 s l'app non dichiara "persa" la modalità bidirezionale (prova lunga del 28/09/2026:
// due falsi "persa", rientrati in 7–15 ms, dopo una chiamata WhatsApp).
const BIDI_RESUME_GRACE_MS = 2000;
// Se fra due controlli passa più di 1 s, i timer erano fermi: l'app era in secondo piano.
const BIDI_TICK_GAP_MS = 1000;
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
  ["par:4/4", "Transpose semitoni"],
]);
export const keyName = (key) => KEY_NAMES.get(key) ?? key.replace(/^(par|str):/, "");

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

export function requestsPerMinute() {
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
  const gap = bidi.lastTickAt === undefined ? 0 : now - bidi.lastTickAt;
  bidi.lastTickAt = now;
  if (document.visibilityState !== "visible") {
    bidi.hiddenSeen = true;
  } else if (bidi.hiddenSeen || gap > BIDI_TICK_GAP_MS) {
    bidi.hiddenSeen = false;
    bidi.resumeGraceUntil = now + BIDI_RESUME_GRACE_MS;
    bidi.resumes = (bidi.resumes ?? 0) + 1;
  }
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
    if (now - bidi.lastSensingAt > BIDI_SENSING_TIMEOUT_MS && now >= (bidi.resumeGraceUntil ?? 0)) {
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

export function startBidiTimer() {
  if (session.bidi.timer !== null) return;
  session.bidi.timer = window.setInterval(bidiTick, BIDI_TICK_MS);
  bidiTick();
}

export function handleBidirectional(decoded) {
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
export function bidiCovers(request) {
  if (session.bidi.state !== "active") return false;
  const key = requestKey(request.bytes);
  return key !== null && session.bidi.covered.has(key);
}

export function bidiTunerPushing(now = performance.now()) {
  if (session.bidi.state !== "active") return false;
  return ["par:124/15", "par:125/84"].some((key) => now - (session.bidi.lastPushAt.get(key) ?? -Infinity) < 400);
}

function pollRequestKeys() {
  return [
    ...buildProfilerPollRequests().map((request) => requestKey(request.bytes)),
    ...buildFixedFxStateRequests().map((request) => requestKey(request.bytes)),
    requestKey(buildTransposeValueRequest().bytes),
  ].filter(Boolean);
}

export function paintBidi() {
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

export function toggleBidirectional() {
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
