import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const midiSource = fs.readFileSync(new URL('../dist/kemper-midi.js', import.meta.url), 'utf8');
const midi = await import(`data:text/javascript,${encodeURIComponent(midiSource)}`);
const appSource = fs.readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');

function functionSnippet(start, end) {
  const from = appSource.indexOf(start);
  const to = appSource.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Function boundaries ${start} / ${end} found`);
  return appSource.slice(from, to);
}

function playerReply(page, parameter, value) {
  return Uint8Array.from([0xf0, 0, 0x20, 0x33, 0, 0, 1, 0, page, parameter,
    (value >> 7) & 0x7f, value & 0x7f, 0xf7]);
}

test('Parser keeps the real 14-bit Morph and tempo values', () => {
  const parser = new midi.KemperMidiState();
  const morph = parser.ingest({ data: playerReply(0, 11, 8192) });
  assert.equal(morph.value, 8192);
  const tempo = parser.ingest({ data: playerReply(4, 0, 4290) });
  assert.equal(tempo.value, 4290);
  assert.equal(parser.state.tempoRaw, 4290);
});

test('Parser reads bank and slot names sent by the Player (function 0x07, real log bytes)', () => {
  const parser = new midi.KemperMidiState();
  const hex = str => Uint8Array.from(str.split(' ').map(h => parseInt(h, 16)));
  const bank = parser.ingest({ data: hex('F0 00 20 33 00 00 07 00 00 00 01 00 00 52 54 20 46 49 52 45 53 50 49 54 00 F7') });
  assert.equal(bank.type, 'Kemper Bank Names');
  assert.equal(bank.index, 0);
  assert.equal(bank.text, 'RT FIRESPIT');
  const slot = parser.ingest({ data: hex('F0 00 20 33 00 00 07 00 00 00 01 00 03 42 72 65 61 6B 75 70 00 F7') });
  assert.equal(slot.index, 3);
  assert.equal(slot.text, 'Breakup');
});

test('Parser distinguishes program change and effect state', () => {
  const parser = new midi.KemperMidiState();
  assert.equal(parser.ingest({ data: Uint8Array.from([0xc0, 0x2b]) }).program, 43);
  parser.ingest({ data: playerReply(0x3d, 3, 1) });
  assert.equal(parser.state.effects.get(0x3d).active, true);
});

function looperContext(sent, channel = 2) {
  const output = { name: 'Profiler', manufacturer: 'Kemper', send: bytes => sent.push([...bytes]) };
  const session = { lastState: { channel }, transmitted: [], looperLastCommands: [] };
  const node = () => ({ textContent: '', hidden: false, dataset: {}, style: { setProperty() {} } });
  const ui = { looperStatus: node(), copy: { disabled: true }, looperState: node(), looperStateLabel: node(),
    looperStateTime: node(), looperStateFlags: node(), stageLooper: node(),
    looperHalf: node(), looperHalfLabel: node(), looperHalfNote: node(), quantizeButtons: [], quantizeNote: node(),
    looperReverse: node(), looperReverseLabel: node(), looperReverseNote: node() };
  const source = functionSnippet('const LOOPER_SWITCHES = {', 'function releaseAllLooperSwitches()');
  const clock = { now: 1000 };
  const timers = [];
  const context = { session, ui, profilerOutputs: () => [output], describePort: () => 'Profiler · Kemper',
    bytesToHex: midi.bytesToHex, Date, Set, TEMPO_UNITS_PER_BPM: 64, navigator: {},
    performance: { now: () => clock.now }, document: { visibilityState: "visible" },
    window: { setInterval: () => 1, clearInterval() {}, clearTimeout() {},
      setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; } } };
  vm.runInNewContext(`${source}\nthis.sendLooperSwitch = sendLooperSwitch; this.looper = looper;
this.handleQuantizedRecord = handleQuantizedRecord; this.looperSendKey = looperSendKey; this.setQuantizeMode = setQuantizeMode;`, context);
  context.clock = clock;
  context.timers = timers;
  return context;
}

test('Looper Record and Undo send an NRPN press then release on the selected channel', () => {
  const sent = [];
  const context = looperContext(sent);
  for (const [key, parameter] of [['record', 88], ['undo', 93]]) {
    const start = sent.length;
    assert.equal(context.sendLooperSwitch(key, true), true);
    assert.equal(context.sendLooperSwitch(key, false), true);
    assert.deepEqual(sent.slice(start), [[0xb1, 99, 125], [0xb1, 98, parameter], [0xb1, 6, 0], [0xb1, 38, 1],
      [0xb1, 99, 125], [0xb1, 98, parameter], [0xb1, 6, 0], [0xb1, 38, 0]]);
  }
  assert.equal(context.session.looperLastCommands.length, 2);
  assert.match(context.ui.looperStatus.textContent, /comando inviato/);
});

test('Looper estimated state follows the Kemper Rec/Play/Dub and Stop logic', () => {
  const context = looperContext([]);
  const press = key => context.sendLooperSwitch(key, true);
  assert.equal(context.looper.state, 'empty');
  press('record'); assert.equal(context.looper.state, 'recording');
  assert.equal(context.ui.stageLooper.hidden, false);
  press('record'); assert.equal(context.looper.state, 'playing');
  press('record'); assert.equal(context.looper.state, 'overdub');
  press('undo'); assert.equal(context.looper.state, 'playing');
  press('stop'); assert.equal(context.looper.state, 'stopped');
  press('record'); assert.equal(context.looper.state, 'playing');
  // v1.42: tre STOP non cancellano il loop (prova sul Player del 26/09/2026)
  press('stop'); press('stop'); press('stop');
  assert.equal(context.looper.state, 'stopped');
  press('erase');
  assert.equal(context.looper.state, 'empty');
  assert.equal(context.ui.stageLooper.hidden, true);
  // REVERSE resta attivo sul Player anche dopo la cancellazione (prova reale 26/09/2026)
  press('reverse'); press('record'); press('erase');
  assert.equal(context.looper.reverse, true);
  assert.equal(context.ui.looperReverseLabel.textContent, 'REVERSE: ON');
  press('reverse');
  assert.equal(context.looper.reverse, false);
  // ½ SPEED resta attivo sul Player anche dopo la cancellazione (prova reale 25/09/2026)
  press('half'); press('erase');
  assert.equal(context.looper.half, true);
  assert.equal(context.ui.looperHalfLabel.textContent, '½ SPEED: ON');
  press('half');
  assert.equal(context.looper.half, false);
});

test('Quantized close waits for the end of the current bar at the rig tempo', () => {
  const sent = [];
  const context = looperContext(sent, 1);
  context.session.lastState.tempoRaw = 120 * 64; // 120 BPM: 1 movimento = 500 ms, 1 battuta 4/4 = 2000 ms
  context.setQuantizeMode('bar4');
  context.sendLooperSwitch('record', true); // inizio registrazione a t=1000
  assert.equal(context.looper.state, 'recording');
  context.clock.now = 1000 + 7600; // tocco durante l'ultimo movimento della 4ª battuta
  const before = sent.length;
  assert.equal(context.handleQuantizedRecord(), true);
  assert.equal(sent.length, before, 'nessun comando inviato subito');
  const close = context.timers.at(-1);
  assert.equal(Math.round(close.ms), 400, 'attende la fine della battuta (8000 ms)');
  context.clock.now = 1000 + 8000;
  close.fn();
  assert.equal(context.looper.state, 'playing');
  assert.equal(context.looper.loopLength, 8);
});

test('Quantized close sends immediately when slightly late', () => {
  const sent = [];
  const context = looperContext(sent, 1);
  context.session.lastState.tempoRaw = 120 * 64;
  context.setQuantizeMode('beat');
  context.sendLooperSwitch('record', true);
  context.clock.now = 1000 + 2080; // 80 ms dopo il 4° movimento
  const before = sent.length;
  assert.equal(context.handleQuantizedRecord(), true);
  assert.ok(sent.length > before, 'chiusura immediata');
  assert.equal(context.looper.state, 'playing');
});

test('Morph slider sends the requested CC11 value and waits for a reply', () => {
  const sent = [];
  const output = { send: bytes => sent.push([...bytes]) };
  const session = { lastState: { channel: 1 }, transmitted: [], morphPendingLevel: null,
    morphConfirmedRaw: 0, liveMorphDraft: true };
  const ui = { morphMode: { textContent: '' }, liveMorphMode: { textContent: '' },
    morphSource: { textContent: '' }, morphProbe: { textContent: '', disabled: false },
    copy: { disabled: true } };
  const context = { session, ui, profilerOutputs: () => [output], stopMorphConfirmation() {},
    describePort: () => 'Profiler · Kemper', bytesToHex: midi.bytesToHex,
    refreshLiveMorphControls() {}, buildMorphLevelRequest: midi.buildMorphLevelRequest,
    sendProfilerRequests() {}, toast() {}, Date, performance: { now: () => 0 },
    confirmationPollAllowed: () => true,
    window: { setTimeout: () => 1, setInterval: () => 2 } };
  vm.runInNewContext(`${functionSnippet('function sendMorphCommand(value) {', 'function sendTunerCommand(open) {')}\nthis.sendMorphCommand = sendMorphCommand;`, context);
  context.sendMorphCommand(64);
  assert.deepEqual(sent, [[0xb0, 11, 64]]);
  assert.equal(session.morphPendingLevel, 64);
  assert.equal(session.liveMorphDraft, false);
  assert.equal(ui.morphMode.textContent, 'ATTENDO KEMPER');
});

test('Tempo conversion retains exact raw units and rounds 67.03125 to 67 BPM', () => {
  const request = midi.buildTempoChangeRequest(67 * 64);
  assert.deepEqual(request.bytes.slice(-3), [0x21, 0x40, 0xf7]);
  assert.equal(Math.round(4290 / 64), 67);
});

test('Only the Kemper input can update live MIDI state', () => {
  const other = { name: 'MS-1', manufacturer: 'dev-core', state: 'connected' };
  const profiler = { name: 'Profiler', manufacturer: 'Kemper', state: 'connected' };
  const seen = [];
  const context = {
    session: { access: { inputs: new Map([['other', other], ['profiler', profiler]]) },
      lastTempoRenderRequested: null },
    isProfilerPort: input => input === profiler,
    describePort: input => input.name,
    kemper: { ingest: event => { seen.push([...event.data]); return { type: 'Control Change', controller: 10 }; } },
    handleBidirectional() {}, handleBankNames() {}, handleRigStack() {}, refreshRigControlsOnBankNames() {}, captureLooperProbe() {}, captureMorphProbe() {},
    trackProfilerRig() {}, handlePerformanceControl() {}, handleMorphState() {}, handleEffectState() {},
    handleTempoState() {}, handleRigSelectionState() {}, handleFreezeState() {}, handleLooperLocation() {},
    handleFixedFxState() {}, handleTunerStream() {}, captureTunerMode() {},
    shouldLog: () => false, addLog() {}, pulseTempo() {}, ui: { liveBpmBox: { dataset: {} } }, scheduleProfilerSync() {},
    sendProfilerRequests() {}, buildRenderedValueRequest() {},
  };
  vm.runInNewContext(`${functionSnippet('function attachInputs() {', 'async function requestMidiAccess() {')}\nthis.attachInputs = attachInputs;`, context);
  context.attachInputs();
  other.onmidimessage({ data: Uint8Array.from([0xc0, 42]) });
  assert.equal(seen.length, 0);
  profiler.onmidimessage({ data: Uint8Array.from([0xc0, 43]) });
  assert.equal(seen.length, 1);
});

test('Beacon bidirezionale: INIT + SYSEX, set 2, lease 30 s (v1.37)', () => {
  const init = midi.buildBeaconRequest({ init: true, leaseSeconds: 30 });
  assert.equal(midi.bytesToHex(init.bytes), 'F0 00 20 33 02 7F 7E 00 40 02 03 0F F7');
  const keepAlive = midi.buildBeaconRequest({ leaseSeconds: 30 });
  assert.equal(midi.bytesToHex(keepAlive.bytes), 'F0 00 20 33 02 7F 7E 00 40 02 02 0F F7');
  const tuner = midi.buildBeaconRequest({ init: true, tuneMode: true, leaseSeconds: 10 });
  assert.equal(midi.bytesToHex(tuner.bytes), 'F0 00 20 33 02 7F 7E 00 40 02 23 05 F7');
});

test('Sensing del Player riconosciuto (7E 00 7F), anche con lunghezze diverse', () => {
  const parser = new midi.KemperMidiState();
  const hex = str => Uint8Array.from(str.split(' ').map(h => parseInt(h, 16)));
  assert.equal(parser.ingest({ data: hex('F0 00 20 33 00 00 7E 00 7F 00 F7') }).type, 'Kemper Heartbeat');
  assert.equal(parser.ingest({ data: hex('F0 00 20 33 00 00 7E 00 7F F7') }).type, 'Kemper Heartbeat');
  assert.equal(parser.ingest({ data: hex('F0 00 20 33 00 00 7E 00 40 02 03 0F F7') }).type, 'Kemper Live Data');
});

test('Chiavi di richiesta e risposta coincidono (per riconoscere gli invii spontanei)', () => {
  const parser = new midi.KemperMidiState();
  const request = midi.buildParameterRequest(0x3c, 3);
  const reply = parser.ingest({ data: playerReply(0x3c, 3, 1) });
  assert.equal(midi.requestKey(request.bytes), 'par:60/3');
  assert.equal(midi.decodedKey(reply), 'par:60/3');
  const rigName = midi.buildRigNameRequest();
  const nameReply = parser.ingest({ data: Uint8Array.from([0xf0, 0, 0x20, 0x33, 0, 0, 3, 0, 0, 1, 0x41, 0x42, 0, 0xf7]) });
  assert.equal(midi.requestKey(rigName.bytes), 'str:0/1');
  assert.equal(midi.decodedKey(nameReply), 'str:0/1');
  assert.equal(midi.requestKey(midi.buildBeaconRequest().bytes), null);
});

test('Sillabazione dei nomi effetto: mai spezzati a caso (v1.38)', () => {
  const start = appSource.indexOf('const isVowel');
  const end = appSource.indexOf('function effectTone');
  const context = {};
  vm.runInNewContext(`${appSource.slice(start, end)}\nthis.softHyphenate = softHyphenate;`, context);
  const show = (name) => context.softHyphenate(name).replace(/­/g, '-');
  assert.equal(show('Compressor'), 'Com-pres-sor');
  assert.equal(show('Transpose'), 'Trans-pose');
  assert.equal(show('Double Tracker'), 'Double Tracker');
  assert.equal(show('Studio EQ'), 'Studio EQ');
  assert.equal(show('Chromatic Pitch'), 'Chro-ma-tic Pitch');
});

test('Colori delle categorie come sul Kemper (v1.39)', () => {
  const start = appSource.indexOf('function effectTone(type) {');
  const end = appSource.indexOf('const STATE_PAINT_INTERVAL');
  const context = {};
  vm.runInNewContext(`${appSource.slice(start, end)}\nthis.effectTone = effectTone;`, context);
  const tone = context.effectTone;
  assert.equal(tone(1), 'wah');          // Wah Wah → arancio
  assert.equal(tone(33), 'drive');       // Green Scream → rosso
  assert.equal(tone(115), 'drive');      // Pure Booster → rosso
  assert.equal(tone(49), 'dynamics');    // Compressor → ciano
  assert.equal(tone(65), 'chorus');      // Vintage Chorus → blu
  assert.equal(tone(81), 'phaser');      // Phaser → viola
  assert.equal(tone(98), 'eq');          // Studio EQ → giallo
  assert.equal(tone(104), 'eq');         // Double Tracker (effetto) → giallo come sul Kemper
  assert.equal(tone(129), 'pitch');      // Transpose → bianco
  assert.equal(tone(146), 'delay');      // Single Delay → verde
  assert.equal(tone(150), 'pitchdelay'); // Crystal Delay → verde chiaro
  assert.equal(tone(181), 'reverb');     // Cirrus Reverb → verde
  assert.equal(tone(122), 'loop');       // Loop Stereo → rosa
  assert.equal(tone(0), 'empty');
});

test('Morph: il colore segue la percentuale (rosso BASE → blu MORPH, v1.40)', () => {
  const css = fs.readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
  assert.match(css, /--morph-color: color-mix\(in srgb, #4f8dff calc\(var\(--morph, 0\) \* 1%\), #ff5f55\)/);
  assert.match(css, /\.live-fixed-fx-doubleTracker \{ --fx: #ffd84d;/);
  assert.match(appSource, /ui\.liveMorph\.style\.setProperty\("--morph", String\(percent\)\)/);
});

test('Richiesta dei nomi della Bank in uso con stringhe estese 0x47 (v1.41)', () => {
  const requests = midi.buildBankNamesRequests();
  assert.equal(requests.length, 6);
  assert.equal(midi.bytesToHex(requests[0].bytes), 'F0 00 20 33 02 7F 47 00 00 00 01 00 00 F7');
  assert.equal(midi.bytesToHex(requests[5].bytes), 'F0 00 20 33 02 7F 47 00 00 00 01 00 05 F7');
  assert.equal(midi.requestKey(requests[3].bytes), 'ext:0.0.1.0.3');
});

test('Cerchio del Looper: la posizione avanza, REVERSE la fa tornare indietro (v1.41)', () => {
  const start = appSource.indexOf('function looperRate() {');
  const end = appSource.indexOf('function setLooperState(next) {');
  const clock = { now: 0 };
  const looper = { state: 'playing', loopLength: 4, half: false, recordedHalf: false, reverse: false, phaseAt: 0, phaseTime: 0, phaseRate: 0, ringTimer: null };
  const node = () => ({ dataset: {}, style: { setProperty() {} } });
  const context = { looper, ui: { looperState: node(), stageLooper: node() }, performance: { now: () => clock.now }, document: { visibilityState: "visible" },
    window: { setInterval: () => 1, clearInterval() {} } };
  vm.runInNewContext(`${appSource.slice(start, end)}\nthis.looperPhase = looperPhase; this.rebase = rebaseLooperPhase;`, context);
  context.rebase({ restart: true });
  clock.now = 1000;
  assert.equal(Math.round(context.looperPhase() * 100), 25);
  looper.reverse = true; context.rebase();
  clock.now = 1500;
  assert.equal(Math.round(context.looperPhase() * 1000), 125);
  looper.reverse = false; looper.half = true; context.rebase();
  clock.now = 3500; // metà velocità: 2 s = un quarto di giro
  assert.equal(Math.round(context.looperPhase() * 1000), 375);
});

test('TRIGGER da loop FERMO invia PLAY (il Player suonerebbe solo tenendolo premuto, v1.44)', () => {
  const sent = [];
  const context = looperContext(sent);
  assert.equal(context.looperSendKey('trigger'), 'trigger');
  context.sendLooperSwitch('record', true); context.sendLooperSwitch('record', false);
  context.sendLooperSwitch('record', true); context.sendLooperSwitch('record', false);
  assert.equal(context.looper.state, 'playing');
  assert.equal(context.looperSendKey('trigger'), 'trigger');
  context.sendLooperSwitch('stop', true); context.sendLooperSwitch('stop', false);
  assert.equal(context.looper.state, 'stopped');
  const key = context.looperSendKey('trigger');
  assert.equal(key, 'record');
  const start = sent.length;
  context.sendLooperSwitch(key, true);
  assert.deepEqual(sent.slice(start, start + 2), [[0xb1, 99, 125], [0xb1, 98, 88]]);
  assert.equal(context.looper.state, 'playing');
  assert.equal(context.looperSendKey('trigger'), 'trigger');
});

test('Ampli e cabinet: richieste, risposte e testo mostrato (v1.45)', () => {
  const requests = midi.buildRigStackRequests().map(r => midi.bytesToHex(r.bytes));
  assert.deepEqual(requests, [
    'F0 00 20 33 02 7F 43 00 00 10 F7', 'F0 00 20 33 02 7F 43 00 00 15 F7', 'F0 00 20 33 02 7F 43 00 00 18 F7',
    'F0 00 20 33 02 7F 43 00 00 20 F7', 'F0 00 20 33 02 7F 43 00 00 25 F7', 'F0 00 20 33 02 7F 43 00 00 2A F7',
    'F0 00 20 33 02 7F 41 00 0A 02 F7', 'F0 00 20 33 02 7F 41 00 0C 02 F7']);
  const parser = new midi.KemperMidiState();
  const text = s => [...s].map(c => c.charCodeAt(0));
  const amp = parser.ingest({ data: Uint8Array.from([0xf0, 0, 0x20, 0x33, 0, 0, 0x03, 0, 0, 0x10, ...text('Marshall JCM800'), 0, 0xf7]) });
  assert.deepEqual(midi.rigStackField(amp), { key: 'ampName', value: 'Marshall JCM800' });
  assert.equal(parser.state.rigName ?? null, null, 'il nome ampli non diventa nome del Rig');
  assert.deepEqual(midi.rigStackField(parser.ingest({ data: playerReply(0x0c, 2, 0) })), { key: 'cabOn', value: false, raw: 0 });
  assert.equal(midi.rigStackField(parser.ingest({ data: playerReply(0x32, 3, 1) })), null);
  assert.equal(midi.rigStackLabel({ cabName: '', cabMaker: 'Celestion', cabModel: 'G12M' }, 'cab'), 'Celestion G12M');
  assert.equal(midi.rigStackLabel({ ampName: ' Vox AC30 ', ampMaker: 'Vox' }, 'amp'), 'Vox AC30');
  assert.equal(midi.rigStackLabel({}, 'amp'), '');
  // Rig acustico reale (27/09/2026): cabinet "N/A" → vuoto
  assert.equal(midi.rigStackLabel({ cabName: 'N/A', cabMaker: 'N/A', cabModel: 'N/A' }, 'cab'), '');
  assert.equal(midi.rigStackLabel({ ampName: 'L+R Brick Venice DI' }, 'amp'), 'L+R Brick Venice DI');
  // v1.47: N/A = blocco non presente; nomi presenti = presente (acceso o spento); niente dati = non si sa
  assert.equal(midi.rigStackMissing({ cabName: 'N/A', cabMaker: 'N/A', cabModel: 'N/A' }, 'cab'), true);
  assert.equal(midi.rigStackMissing({ cabName: '4x12', cabMaker: 'Celestion', cabModel: 'G12M' }, 'cab'), false);
  assert.equal(midi.rigStackMissing({ cabName: '', cabMaker: '', cabModel: '' }, 'cab'), false);
  assert.equal(midi.rigStackMissing({}, 'cab'), false);
});

test('125 Bank: Bank Select CC 32 + Program Change e colori delle Bank (v1.48)', () => {
  assert.equal(midi.PLAYER_MAX_BANKS, 125);
  // Bank 1 Rig 1 → CC32 0, PC 0; Bank 26 Rig 3 → indice 127 (ultimo del primo gruppo); Bank 26 Rig 4 → CC32 1, PC 0
  assert.deepEqual(midi.buildRigSelectMessages(1, 1, 1).messages, [[0xb0, 0, 0], [0xb0, 32, 0], [0xc0, 0]]);
  assert.deepEqual(midi.buildRigSelectMessages(26, 3, 1).messages, [[0xb0, 0, 0], [0xb0, 32, 0], [0xc0, 127]]);
  assert.deepEqual(midi.buildRigSelectMessages(26, 4, 1).messages, [[0xb0, 0, 0], [0xb0, 32, 1], [0xc0, 0]]);
  assert.deepEqual(midi.buildRigSelectMessages(125, 5, 2).messages, [[0xb1, 0, 0], [0xb1, 32, 4], [0xc1, 624 % 128]]);
  // Il Player invia CC 32 prima del Program Change: l'indice tiene conto del gruppo di 128
  const parser = new midi.KemperMidiState();
  parser.ingest({ data: Uint8Array.from([0xb0, 0, 0]) });
  parser.ingest({ data: Uint8Array.from([0xb0, 32, 2]) });
  const pc = parser.ingest({ data: Uint8Array.from([0xc0, 10]) });
  assert.equal(pc.rigIndex, 266);
  assert.deepEqual(midi.rigIndexToBankSlot(pc.rigIndex), { bank: 54, slot: 2 });
  parser.ingest({ data: Uint8Array.from([0xb0, 32, 0]) });
  assert.deepEqual(midi.rigIndexToBankSlot(parser.ingest({ data: Uint8Array.from([0xc0, 44]) }).rigIndex), { bank: 9, slot: 5 });
  assert.equal(midi.rigIndexToBankSlot(625), null);
  // Colori: 1 blu, 2 giallo, 3 rosso, 4 verde, 5 viola, 6 di nuovo blu
  assert.deepEqual([1, 2, 3, 4, 5, 6, 12, 125].map(b => midi.bankColor(b).key),
    ['blue', 'yellow', 'red', 'green', 'violet', 'blue', 'yellow', 'violet']);
});
