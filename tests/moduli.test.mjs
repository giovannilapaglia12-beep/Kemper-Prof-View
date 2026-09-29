// Test aggiunti con il riordino in moduli (v1.60): parti che prima non avevano test.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { importPure, snippet } from './moduli.mjs';

const midi = await importPure('kemper-midi.js');
const text = await importPure('js/text.js');

const node = () => ({ textContent: '', hidden: false, disabled: false, dataset: {}, style: { setProperty() {} }, setAttribute() {} });

// ── Modalità bidirezionale ──────────────────────────────────────────────────
// L'orologio parte da 1 s: a 0 ms l'app considererebbe "nessun beacon ancora inviato".
const T0 = 1000;
function bidiContext() {
  const clock = { now: T0 };
  const sent = [];
  const toasts = [];
  const session = { sysex: true, requestedAt: new Map(), requestRateSamples: [], requestsSent: 0 };
  const context = {
    session, clock, sent, toasts, Date, Map, Set,
    EFFECT_MODULES: midi.EFFECT_MODULES, FIXED_FX: midi.FIXED_FX, BIDI_KEY: 'prova',
    buildBeaconRequest: midi.buildBeaconRequest, decodedKey: midi.decodedKey,
    profilerOutputs: () => [{}], profilerInputs: () => [{}],
    sendProfilerRequests: (requests) => { for (const request of requests) sent.push(midi.bytesToHex(request.bytes)); },
    toast: (message, kind) => toasts.push({ message, kind }),
    paintBidi() {},
    performance: { now: () => clock.now },
    document: { body: { dataset: { view: 'live' } }, visibilityState: 'visible' },
    window: { setInterval: () => 1 },
  };
  vm.runInNewContext(`${snippet('js/bidi.js', 'const BIDI_LEASE_SECONDS', 'function bidiCovers(')}
this.bidiTick = bidiTick; this.handleBidirectional = handleBidirectional;`, context);
  const tickUntil = (until, { sensing = false } = {}) => {
    let step = 0;
    while (clock.now < T0 + until) {
      clock.now += 250;
      step += 1;
      if (sensing && step % 2 === 0) context.handleBidirectional({ type: 'Kemper Heartbeat' }); // sensing ogni 500 ms
      context.bidiTick();
    }
  };
  return { context, session, clock, sent, toasts, tickUntil };
}

const INIT = 'F0 00 20 33 02 7F 7E 00 40 02 03 0F F7';
const KEEP_ALIVE = 'F0 00 20 33 02 7F 7E 00 40 02 02 0F F7';

test('Bidirezionale: beacon INIT, attiva col sensing, rinnovo ogni 12 s, persa dopo 4 s senza sensing (v1.37)', () => {
  const { context, session, clock, sent, toasts, tickUntil } = bidiContext();
  context.bidiTick();
  assert.equal(session.bidi.state, 'starting');
  assert.deepEqual(sent, [INIT]);
  clock.now = T0 + 100;
  context.handleBidirectional({ type: 'Kemper Heartbeat' });
  assert.equal(session.bidi.state, 'active');
  assert.match(toasts.at(-1).message, /Bidirezionale attiva/);
  tickUntil(12500, { sensing: true });
  assert.equal(session.bidi.state, 'active');
  assert.deepEqual(sent, [INIT, KEEP_ALIVE], 'un solo rinnovo nei primi 12 s');
  tickUntil(12500 + 4250); // il Player tace
  assert.equal(session.bidi.state, 'lost');
  assert.equal(session.bidi.drops, 1);
  assert.equal(toasts.at(-1).kind, 'warn');
  // Nuovo INIT dopo 5 s dall'ultimo; se il Player risponde subito, niente secondo avviso "attiva".
  const toastsBefore = toasts.length;
  tickUntil(12500 + 4250 + 1000);
  assert.equal(sent.at(-1), INIT);
  context.handleBidirectional({ type: 'Kemper Heartbeat' });
  assert.equal(session.bidi.state, 'active');
  assert.equal(toasts.length, toastsBefore, 'ritorno breve: nessun messaggio');
});

test('Bidirezionale: senza risposta dopo 3 beacon il Player risulta "non risponde" e si riprova più piano', () => {
  const { session, sent, tickUntil } = bidiContext();
  tickUntil(15250);
  assert.equal(sent.filter((hex) => hex === INIT).length, 4, 'beacon a 0,25 s · 5,25 s · 10,25 s · 15,25 s');
  assert.equal(session.bidi.state, 'unavailable');
  tickUntil(15250 + 9750);
  assert.equal(sent.length, 4, 'da "non risponde" il tentativo successivo arriva dopo 10 s');
  tickUntil(15250 + 10250);
  assert.equal(sent.length, 5);
});

test('Bidirezionale: le risposte alle letture dell\'app non contano come invii spontanei', () => {
  const { context, session, clock } = bidiContext();
  context.bidiTick();
  clock.now = T0 + 1000;
  session.requestedAt.set('par:50/3', T0 + 900);
  const reply = { type: 'Kemper Parameter', page: 50, parameter: 3, value: 1 };
  context.handleBidirectional(reply);
  assert.equal(session.bidi.pushed.size, 0, 'risposta a una lettura di 100 ms prima');
  clock.now = T0 + 2000;
  context.handleBidirectional(reply);
  assert.equal(session.bidi.pushed.get('par:50/3').count, 1);
  assert.ok(session.bidi.covered.has('par:50/3'));
});

// ── Conferma del cambio Rig ─────────────────────────────────────────────────
function rigContext(view = 'rig') {
  const sent = [];
  const calls = [];
  const timers = [];
  const session = { rigTargetBank: 30, lastState: { channel: 1 }, transmitted: [], rigSelectPollTimer: null,
    rigSelectTimeout: null, rigSelectPending: null, rigSelectLastCommand: null, rigSelectAwaitingReply: false,
    rigSelectPollsSent: 0, rigSelectRepliesReceived: 0, rigSelectedBank: null, rigSelectedSlot: null };
  const output = { name: 'Profiler', manufacturer: 'Kemper', send: (bytes) => sent.push([...bytes]) };
  const context = {
    session, sent, calls, timers, Date,
    ui: { program: node(), copy: node() },
    document: { body: { dataset: { view } } },
    profilerOutputs: () => [output], describePort: () => 'Profiler · Kemper',
    buildRigSelectMessages: midi.buildRigSelectMessages, bytesToHex: midi.bytesToHex,
    buildRigNameRequest: midi.buildRigNameRequest,
    sendProfilerRequests: (requests) => calls.push(['lettura', midi.bytesToHex(requests[0].bytes)]),
    resetFreezeState: () => calls.push(['resetFreeze']), resetFixedFxState: () => calls.push(['resetFixedFx']),
    refreshRigControls() {}, toast: (message) => calls.push(['toast', message]),
    rememberRigName: (bank, slot, name) => calls.push(['nome', bank, slot, name]),
    setAppView: (next) => calls.push(['vista', next]),
    syncAfterChange: () => calls.push(['sync']),
    window: {
      setTimeout: (fn, ms) => { timers.push({ fn, ms, kind: 'timeout' }); return timers.length; },
      setInterval: (fn, ms) => { timers.push({ fn, ms, kind: 'interval' }); return timers.length; },
      clearTimeout() {}, clearInterval() {},
    },
  };
  vm.runInNewContext(`${snippet('js/rig.js', 'function stopRigSelectionConfirmation() {', 'function trackProfilerRig(')}
${snippet('js/rig.js', 'function selectRigSlot(slot) {')}
this.selectRigSlot = selectRigSlot; this.handleRigSelectionState = handleRigSelectionState;`, context);
  return context;
}

const rigName = (name) => ({ type: 'Kemper String', page: 0, parameter: 1, text: name });

test('Cambio Rig: Bank 30 Rig 4 invia Bank Select 1 + PC 21, poi la conferma arriva col nome del Rig (v1.48)', () => {
  const context = rigContext('rig');
  const { session, sent, calls, timers } = context;
  context.selectRigSlot(4);
  assert.deepEqual(sent, [[0xb0, 0, 0], [0xb0, 32, 1], [0xc0, 20]]);
  assert.deepEqual({ bank: session.rigSelectPending.bank, slot: session.rigSelectPending.slot }, { bank: 30, slot: 4 });
  // Un nome Rig arrivato prima della lettura di conferma non conta (poteva essere del Rig precedente).
  context.handleRigSelectionState(rigName('Vecchio'));
  assert.notEqual(session.rigSelectPending, null);
  timers.find((timer) => timer.ms === 150).fn(); // lettura di conferma
  assert.deepEqual(calls.at(-1), ['lettura', 'F0 00 20 33 02 7F 43 00 00 01 F7']);
  context.handleRigSelectionState(rigName('Drive'));
  assert.equal(session.rigSelectPending, null);
  assert.deepEqual([session.rigSelectedBank, session.rigSelectedSlot], [30, 4]);
  assert.ok(calls.some((call) => call[0] === 'nome' && call[3] === 'Drive'));
  assert.ok(calls.some((call) => call[0] === 'vista' && call[1] === 'live'), 'dalla scheda RIG torna a PALCO');
  assert.equal(context.ui.program.textContent, 'Bank 30 · Rig 4');
});

test('Cambio Rig: senza risposta entro 3 s avvisa che il Kemper non ha confermato', () => {
  const context = rigContext('live');
  context.selectRigSlot(2);
  context.timers.find((timer) => timer.ms === 3000).fn();
  assert.equal(context.session.rigSelectPending, null);
  assert.ok(context.calls.some((call) => call[0] === 'toast' && /non ha confermato Bank 30 · Rig 2/.test(call[1])));
});

// ── Accordatore: cent e zona verde ──────────────────────────────────────────
function tunerContext() {
  const clock = { now: 0 };
  const session = {
    performanceState: { tunerMode: 'open', tunerCandidateRaw: 45, tunerZone: 'waiting', tunerSignalRaw: null, tunerCents: null },
    tunerLiveNoteRaw: 45, tunerSignalWindow: [],
  };
  const context = {
    session, clock, median: text.median, paintTunerOverlay() {}, performance: { now: () => clock.now },
    ui: { liveTunerState: node() },
  };
  vm.runInNewContext(`${snippet('js/tuner.js', 'function renderTunerPitch(rawValue) {', 'function handlePerformanceControl(')}
this.renderTunerPitch = renderTunerPitch;`, context);
  // Tre letture uguali (serve una finestra di almeno 3), poi mezzo secondo di pausa per svuotarla.
  context.play = (raw) => {
    for (let i = 0; i < 3; i += 1) { clock.now += 100; context.renderTunerPitch(raw); }
    clock.now += 500;
    return { zone: session.performanceState.tunerZone, cents: session.performanceState.tunerCents, live: context.ui.liveTunerState.textContent };
  };
  return context;
}

test('Tuner: centro 8192 e circa 82 unità per cent; verde entro ±3, resta verde fino a ±5 (v1.39)', () => {
  const tuner = tunerContext();
  assert.deepEqual(tuner.play(8192 + 164), { zone: 'in-tune', cents: 2, live: 'CENTRATA' });
  assert.equal(tuner.play(8192 + 328).zone, 'in-tune', '4 cent: resta verde (isteresi)');
  assert.deepEqual(tuner.play(8192 + 512), { zone: 'sharp', cents: 6.3, live: '+6.3 CENT' });
  assert.equal(tuner.play(8192 + 328).zone, 'sharp', '4 cent venendo da fuori: non ancora verde');
  assert.deepEqual(tuner.play(8192 - 819), { zone: 'flat', cents: -10, live: '-10 CENT' });
});

test('Tuner: con due sole letture non si mostra ancora nulla; letture di un\'altra nota ignorate', () => {
  const tuner = tunerContext();
  tuner.renderTunerPitch(8192); tuner.clock.now += 100; tuner.renderTunerPitch(8192);
  assert.equal(tuner.session.performanceState.tunerZone, 'waiting');
  tuner.session.tunerLiveNoteRaw = 47; // il Player sta già misurando un'altra nota
  tuner.clock.now += 100; tuner.renderTunerPitch(8192);
  assert.equal(tuner.session.performanceState.tunerZone, 'waiting');
});

test('Funzioni di calcolo: nome delle note e mediana', () => {
  assert.equal(text.median([5, 1, 3]), 3);
  assert.equal(text.median([4, 1, 3, 2]), 2.5);
  assert.equal(typeof text.midiNoteName(45), 'string');
});

// ── Prova "Leggi Transpose" (v1.61) ─────────────────────────────────────────
test('Lettura multipla: richiesta 0x42 della pagina 5 e risposta 0x02 con un valore per parametro', () => {
  assert.equal(midi.bytesToHex(midi.buildMultiParameterRequest(5).bytes), 'F0 00 20 33 02 7F 42 00 05 00 F7');
  const parser = new midi.KemperMidiState();
  const values = [0, 1, 64, 8192, 16383];
  const reply = [0xf0, 0, 0x20, 0x33, 0, 0, 0x02, 0, 5, 0, ...values.flatMap((v) => [(v >> 7) & 0x7f, v & 0x7f]), 0xf7];
  const decoded = parser.ingest({ data: Uint8Array.from(reply) });
  assert.equal(decoded.type, 'Kemper Multi Parameter');
  assert.equal(decoded.page, 5);
  assert.equal(decoded.first, 0);
  assert.deepEqual(decoded.values, values);
});

function transposeContext() {
  const sent = [];
  const timers = [];
  const session = { sysex: true, fixedFxState: new Map([['transpose', { raw: 1 }]]), lastState: { rigName: 'Clean' },
    rigSelectedBank: 2, rigSelectedSlot: 1 };
  const context = {
    session, sent, timers, Date, Object, Array, Number, String,
    ui: { transposeProbe: node(), transposeProbeResult: node(), copy: node() },
    toast() {}, profilerOutputs: () => [{}],
    buildMultiParameterRequest: midi.buildMultiParameterRequest, buildParameterRequest: midi.buildParameterRequest,
    buildRenderedValueRequest: midi.buildRenderedValueRequest,
    sendProfilerRequests: (requests) => { for (const request of requests) sent.push(midi.bytesToHex(request.bytes)); },
    window: { setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; } },
  };
  vm.runInNewContext(`${snippet('js/transpose-probe.js', 'const FIXED_FX_PAGE')}
this.start = startTransposeProbe; this.capture = captureTransposeProbe; this.changed = changedParameters;`, context);
  context.runTimers = () => { while (timers.length) timers.shift().fn(); };
  context.fire = (ms) => timers.splice(timers.findIndex((timer) => timer.ms === ms), 1)[0].fn();
  return context;
}

const multiReply = (values) => ({ type: 'Kemper Multi Parameter', page: 5, first: 0, values });

test('Leggi Transpose: due letture, il parametro cambiato viene mostrato con il testo del Player', () => {
  const probe = transposeContext();
  probe.start();
  assert.deepEqual(probe.sent, ['F0 00 20 33 02 7F 42 00 05 00 F7', 'F0 00 20 33 02 7F 41 00 04 04 F7']);
  probe.capture(multiReply([0, 1, 0, 64, 0]));
  probe.capture({ type: 'Kemper Parameter', page: 4, parameter: 4, value: 64 });
  probe.runTimers();
  assert.match(probe.ui.transposeProbeResult.textContent, /Lettura 1 · Clean · Transpose ON · 5 valori salvati \(lettura multipla\) · Rig Transpose 4\/4 = 64/);
  // Sul Player: Transpose +2 → il parametro 3 passa da 64 a 66
  probe.sent.length = 0;
  probe.start();
  probe.capture(multiReply([0, 1, 0, 66, 0]));
  probe.capture({ type: 'Kemper Parameter', page: 4, parameter: 4, value: 64 });
  probe.fire(2600); // fine della lettura → chiede i testi dei valori cambiati
  assert.deepEqual(probe.sent.slice(-2), ['F0 00 20 33 02 7F 7C 00 05 03 00 40 F7', 'F0 00 20 33 02 7F 7C 00 05 03 00 42 F7']);
  probe.capture({ type: 'Kemper Rendered', page: 5, parameter: 3, value: 64, rendered: '0' });
  probe.capture({ type: 'Kemper Rendered', page: 5, parameter: 3, value: 66, rendered: '+2' });
  probe.runTimers();
  assert.match(probe.ui.transposeProbeResult.textContent, /cambiati rispetto alla lettura 1: 5\/3: 64 \(«0»\) → 66 \(«\+2»\)/);
  assert.equal(probe.session.transposeProbe.readings.length, 2);
  assert.equal(probe.ui.transposeProbe.disabled, false);
});

test('Leggi Transpose: senza risposta alla lettura multipla usa le letture singole 0…63', () => {
  const probe = transposeContext();
  probe.start();
  probe.fire(1200);
  assert.equal(probe.sent.length, 2 + 64);
  assert.equal(probe.sent.at(-1), 'F0 00 20 33 02 7F 41 00 05 3F F7');
  probe.capture({ type: 'Kemper Parameter', page: 5, parameter: 1, value: 1 });
  probe.capture({ type: 'Kemper Parameter', page: 5, parameter: 3, value: 64 });
  probe.runTimers();
  assert.match(probe.ui.transposeProbeResult.textContent, /2 valori salvati \(letture singole\)/);
  const changes = probe.changed({ single: { 1: 1, 3: 64 } }, { single: { 1: 1, 3: 62, 9: 5 } });
  assert.equal(JSON.stringify(changes), JSON.stringify([{ parameter: 3, from: 64, to: 62 }]));
});

// ── v1.62: ritorno in primo piano e REVERSE/½ SPEED dopo il Player spento ──
test('Bidirezionale: tornando all\'app dopo un\'altra app (o una chiamata) niente falso "persa" (v1.62)', () => {
  const { context, session, clock, toasts, tickUntil } = bidiContext();
  context.bidiTick();
  clock.now = T0 + 100;
  context.handleBidirectional({ type: 'Kemper Heartbeat' });
  tickUntil(5000, { sensing: true });
  assert.equal(session.bidi.state, 'active');
  // Chiamata WhatsApp: l'app va in secondo piano 20 s; i messaggi del Player arrivano solo al ritorno.
  context.document.visibilityState = 'hidden';
  tickUntil(25000);
  context.document.visibilityState = 'visible';
  const toastsBefore = toasts.length;
  clock.now += 250;
  context.bidiTick(); // primo controllo al ritorno: sensing vecchio di 20 s, ma c'è la tolleranza
  assert.equal(session.bidi.state, 'active');
  clock.now += 15;
  context.handleBidirectional({ type: 'Kemper Heartbeat' }); // messaggi arretrati
  tickUntil(30000, { sensing: true });
  assert.equal(session.bidi.state, 'active');
  assert.equal(session.bidi.drops, 0);
  assert.equal(toasts.length, toastsBefore, 'nessun avviso');
  assert.equal(session.bidi.resumes, 1);
});

test('Bidirezionale: timer fermi (telefono che sospende l\'app) → stessa tolleranza; se il Player tace davvero, "persa" dopo 2 s', () => {
  const { context, session, clock, toasts, tickUntil } = bidiContext();
  context.bidiTick();
  clock.now = T0 + 100;
  context.handleBidirectional({ type: 'Kemper Heartbeat' });
  tickUntil(5000, { sensing: true });
  clock.now += 20000; // nessun controllo per 20 s
  context.bidiTick();
  assert.equal(session.bidi.state, 'active', 'tolleranza al ritorno');
  const resumedAt = clock.now;
  while (clock.now < resumedAt + 2250) { clock.now += 250; context.bidiTick(); }
  assert.equal(session.bidi.state, 'lost', 'il Player non ha più mandato sensing: collegamento davvero perso');
  assert.equal(toasts.at(-1).kind, 'warn');
});

test('Looper: REVERSE e ½ SPEED ricordati ripartono da OFF se il Player non si sente da più di 10 minuti (v1.62)', () => {
  const context = {};
  vm.runInNewContext(`${snippet('js/looper.js', 'const PLAYER_RESTART_PAUSE_MS', 'let looperFlagsReset')}
this.needReset = looperFlagsNeedReset;`, context);
  const now = Date.parse('2026-09-28T10:00:00Z');
  const minutes = (m) => now - m * 60 * 1000;
  assert.equal(context.needReset({ reverse: true, half: false, seenAt: minutes(2), now }), false, 'app riaperta subito: resta ON');
  assert.equal(context.needReset({ reverse: true, half: false, seenAt: minutes(11), now }), true, 'Player spento da ieri: OFF');
  assert.equal(context.needReset({ reverse: false, half: true, seenAt: minutes(60 * 14), now }), true);
  assert.equal(context.needReset({ reverse: true, half: true, seenAt: 0, now }), true, 'contatto sconosciuto: OFF');
  assert.equal(context.needReset({ reverse: false, half: false, seenAt: 0, now }), false, 'niente da azzerare');
});

// ── v1.64: Transpose −2…+2 in PALCO ─────────────────────────────────────────
test('Transpose: semitoni = 4/4 con 64 = 0; On/Off 5/1 inviato solo se deve cambiare (prova sul Player del 29/09/2026)', () => {
  const hex = (requests) => requests.map((request) => midi.bytesToHex(request.bytes));
  assert.equal(midi.bytesToHex(midi.buildTransposeValueRequest().bytes), 'F0 00 20 33 02 7F 41 00 04 04 F7');
  // Valori letti sul Player: 0 → 64 (spento), +2 → 66 (acceso), −2 → 62 (acceso)
  assert.equal(midi.transposeRawToSemitones(64), 0);
  assert.equal(midi.transposeRawToSemitones(66), 2);
  assert.equal(midi.transposeRawToSemitones(62), -2);
  assert.ok(midi.transposeMatches(0, 64, 0));
  assert.ok(midi.transposeMatches(2, 66, 1));
  assert.ok(midi.transposeMatches(-2, 62, 1));
  assert.ok(!midi.transposeMatches(2, 66, 0));
  assert.ok(!midi.transposeMatches(0, 64, 1));
  assert.deepEqual(hex(midi.buildTransposeCommands(2, 0)),
    ['F0 00 20 33 02 7F 01 00 04 04 00 42 F7', 'F0 00 20 33 02 7F 01 00 05 01 00 01 F7']);
  assert.deepEqual(hex(midi.buildTransposeCommands(-1, 1)), ['F0 00 20 33 02 7F 01 00 04 04 00 3F F7']);
  assert.deepEqual(hex(midi.buildTransposeCommands(0, 1)),
    ['F0 00 20 33 02 7F 01 00 04 04 00 40 F7', 'F0 00 20 33 02 7F 01 00 05 01 00 00 F7']);
  assert.deepEqual([2, 1, 0, -1, -2].map(text.signedSemitones), ['+2', '+1', '0', '−1', '−2']);
});

function transposeControlContext() {
  const clock = { now: 1000 };
  const sent = [];
  const toasts = [];
  const timers = new Map();
  let nextTimer = 1;
  const addTimer = (fn, ms, repeat) => { const id = nextTimer++; timers.set(id, { fn, at: clock.now + ms, ms, repeat }); return id; };
  const value = node();
  const state = node();
  const button = { ...node(), querySelector: (selector) => (selector === 'span' ? state : value) };
  const choices = midi.TRANSPOSE_CHOICES.map((choice) => ({ ...node(), dataset: { transpose: String(choice) } }));
  const session = { sysex: true, fixedFxPollsSent: 0,
    fixedFxState: new Map([['transpose', { raw: 0, supported: true, confirmedAt: null }]]) };
  const context = {
    session, Date, Number, String, Map,
    FIXED_FX: midi.FIXED_FX, TRANSPOSE_SEMITONES: midi.TRANSPOSE_SEMITONES,
    buildFixedFxStateRequests: midi.buildFixedFxStateRequests, buildTransposeCommands: midi.buildTransposeCommands,
    buildTransposeValueRequest: midi.buildTransposeValueRequest, transposeMatches: midi.transposeMatches,
    transposeRawToSemitones: midi.transposeRawToSemitones, signedSemitones: text.signedSemitones,
    ui: { liveFixedFxGrid: { querySelector: () => button }, liveTransposePicker: { hidden: true }, liveTransposeChoices: choices, copy: node() },
    toast: (message) => toasts.push(message),
    profilerOutputs: () => [{}],
    sendProfilerRequests: (requests) => { for (const request of requests) sent.push(midi.bytesToHex(request.bytes)); },
    confirmationPollAllowed: (startedAt) => clock.now - startedAt >= 700, // come con il bidirezionale attivo
    performance: { now: () => clock.now },
    window: {
      setTimeout: (fn, ms) => addTimer(fn, ms, false), setInterval: (fn, ms) => addTimer(fn, ms, true),
      clearTimeout: (id) => timers.delete(id), clearInterval: (id) => timers.delete(id),
    },
  };
  vm.runInNewContext(`${snippet('js/transpose.js', 'const SWITCH')}
this.choose = chooseTranspose; this.handle = handleTransposeState; this.rigChanged = transposeRigChanged;
this.toggle = toggleTransposePicker; this.diagnostics = transposeDiagnostics; this.paint = paintTranspose;`, context);
  // Il tempo avanza a passi di 50 ms eseguendo i timer scaduti.
  context.advance = (ms) => {
    const until = clock.now + ms;
    while (clock.now < until) {
      clock.now += 50;
      for (const [id, timer] of [...timers]) {
        if (!timers.has(id) || timer.at > clock.now) continue;
        if (timer.repeat) timer.at += timer.ms; else timers.delete(id);
        timer.fn();
      }
    }
  };
  // Risposta del Player a una lettura o invio spontaneo: aggiorna 5/1 come fa fixed-fx.js, poi transpose.js.
  context.reply = (page, parameter, raw) => {
    if (page === 5) session.fixedFxState.set('transpose', { raw, supported: true, confirmedAt: null });
    context.handle({ type: 'Kemper Parameter', page, parameter, value: raw });
  };
  context.playerState = (semitones, on) => { context.reply(4, 4, 64 + semitones); context.reply(5, 1, on); };
  Object.assign(context, { sent, toasts, clock, button, value, state, choices });
  return context;
}

test('Transpose: il tocco su +2 invia semitoni e On, mostra ATTENDO e poi +2 quando il Player conferma', () => {
  const t = transposeControlContext();
  t.playerState(0, 0);
  assert.equal(t.value.textContent, '0');
  assert.equal(t.state.textContent, 'OFF');
  t.toggle();
  assert.equal(t.ui.liveTransposePicker.hidden, false);
  t.choose(2);
  assert.equal(t.ui.liveTransposePicker.hidden, true);
  assert.deepEqual(t.sent, ['F0 00 20 33 02 7F 01 00 04 04 00 42 F7', 'F0 00 20 33 02 7F 01 00 05 01 00 01 F7']);
  assert.equal(t.state.textContent, 'ATTENDO KEMPER');
  assert.equal(t.button.disabled, true);
  t.advance(850); // senza conferma spontanea: dal controllo dopo 700 ms l'app rilegge 4/4 e 5/1
  assert.deepEqual(t.sent.slice(2), ['F0 00 20 33 02 7F 41 00 04 04 F7', 'F0 00 20 33 02 7F 41 00 05 01 F7']);
  t.playerState(2, 1);
  assert.equal(t.value.textContent, '+2');
  assert.equal(t.state.textContent, 'ON');
  assert.equal(t.button.dataset.active, 'true');
  assert.equal(t.session.transpose.pending, null);
  assert.equal(t.choices.find((choice) => choice.dataset.transpose === '2').dataset.selected, 'true');
  assert.deepEqual(t.toasts, ['Transpose +2 · confermato']);
});

test('Transpose: senza conferma entro 2,8 s avvisa e lascia il valore letto dal Player', () => {
  const t = transposeControlContext();
  t.playerState(0, 0);
  t.choose(-1);
  t.advance(3000);
  assert.equal(t.session.transpose.pending, null);
  assert.deepEqual(t.toasts, ['Transpose −1 non confermato dal Kemper']);
  assert.equal(t.value.textContent, '0');
  assert.equal(t.state.textContent, 'OFF');
});

test('Transpose: cambiando Rig il Player torna a 0 → l\'app rimette il valore scelto e aspetta la conferma', () => {
  const t = transposeControlContext();
  t.handle({ type: 'Program Change', program: 42, rigIndex: 42 });
  t.playerState(0, 0);
  t.choose(2);
  t.playerState(2, 1);
  t.sent.length = 0;
  // Il Player rimanda il Program Change del Rig in uso (Tuner, beacon): non è un cambio Rig.
  t.handle({ type: 'Program Change', program: 42, rigIndex: 42 });
  assert.equal(t.value.textContent, '+2');
  // Cambio Rig: i valori del nuovo Rig arrivano (spento, 64) → l'app rimette +2.
  t.handle({ type: 'Program Change', program: 41, rigIndex: 41 });
  assert.equal(t.state.textContent, 'IN LETTURA');
  t.advance(1000);
  assert.deepEqual(t.sent, ['F0 00 20 33 02 7F 41 00 04 04 F7', 'F0 00 20 33 02 7F 41 00 05 01 F7']);
  t.playerState(0, 0);
  assert.deepEqual(t.sent.slice(2), ['F0 00 20 33 02 7F 01 00 04 04 00 42 F7', 'F0 00 20 33 02 7F 01 00 05 01 00 01 F7']);
  assert.equal(t.state.textContent, 'ATTENDO KEMPER');
  t.playerState(2, 1);
  assert.equal(t.toasts.at(-1), 'Transpose +2 rimesso dopo il cambio Rig');
  assert.equal(t.diagnostics().reappliedAfterRigChange, 1);
  assert.equal(t.diagnostics().chosen, 2);
});

test('Transpose: senza una scelta fatta con un tocco, o con il nuovo Rig già giusto, nessun comando dopo il cambio Rig', () => {
  const t = transposeControlContext();
  t.playerState(0, 0);
  t.rigChanged();
  t.playerState(2, 1); // Rig salvato con +2: l'app lo mostra e basta
  assert.deepEqual(t.sent, []);
  assert.equal(t.value.textContent, '+2');
  t.choose(0);
  t.playerState(0, 0);
  t.sent.length = 0;
  t.rigChanged();
  t.playerState(0, 0);
  assert.deepEqual(t.sent, []);
});

test('Transpose: valori del nuovo Rig letti dopo più di 8 s → nessun comando a sorpresa', () => {
  const t = transposeControlContext();
  t.playerState(0, 0);
  t.choose(1);
  t.playerState(1, 1);
  t.rigChanged();
  t.advance(9000);
  t.sent.length = 0;
  t.playerState(0, 0);
  assert.deepEqual(t.sent, []);
  assert.equal(t.diagnostics().chosen, 0); // da ora vale il valore del Player
});

test('Transpose: cambiato sul Player, da ora vale quello (anche per i Rig successivi)', () => {
  const t = transposeControlContext();
  t.playerState(0, 0);
  t.choose(2);
  t.playerState(2, 1);
  t.playerState(-1, 1); // Giovanni gira il Transpose sul Player
  assert.equal(t.diagnostics().chosen, -1);
  t.rigChanged();
  t.sent.length = 0;
  t.playerState(0, 0);
  assert.deepEqual(t.sent, ['F0 00 20 33 02 7F 01 00 04 04 00 3F F7', 'F0 00 20 33 02 7F 01 00 05 01 00 01 F7']);
  t.playerState(-1, 1);
  t.reply(5, 1, 0); // spento dal Player: nessun transpose
  assert.equal(t.diagnostics().chosen, 0);
});
