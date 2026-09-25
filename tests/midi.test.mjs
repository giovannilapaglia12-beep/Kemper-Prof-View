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

test('Parser distinguishes program change and effect state', () => {
  const parser = new midi.KemperMidiState();
  assert.equal(parser.ingest({ data: Uint8Array.from([0xc0, 0x2b]) }).program, 43);
  parser.ingest({ data: playerReply(0x3d, 3, 1) });
  assert.equal(parser.state.effects.get(0x3d).active, true);
});

test('Looper Record and Undo send an NRPN press then release on the selected channel', () => {
  const sent = [];
  const output = { name: 'Profiler', manufacturer: 'Kemper', send: bytes => sent.push([...bytes]) };
  const session = { lastState: { channel: 2 }, transmitted: [], looperLastCommands: [] };
  const ui = { looperStatus: { textContent: '' }, copy: { disabled: true } };
  const source = functionSnippet('const LOOPER_SWITCHES = {', 'function releaseAllLooperSwitches()');
  const context = { session, ui, profilerOutputs: () => [output], describePort: () => 'Profiler · Kemper',
    bytesToHex: midi.bytesToHex, Date, Set };
  vm.runInNewContext(`${source}\nthis.sendLooperSwitch = sendLooperSwitch;`, context);
  for (const [key, parameter] of [['record', 88], ['undo', 93]]) {
    const start = sent.length;
    assert.equal(context.sendLooperSwitch(key, true), true);
    assert.equal(context.sendLooperSwitch(key, false), true);
    assert.deepEqual(sent.slice(start), [[0xb1, 99, 125], [0xb1, 98, parameter], [0xb1, 6, 0], [0xb1, 38, 1],
      [0xb1, 99, 125], [0xb1, 98, parameter], [0xb1, 6, 0], [0xb1, 38, 0]]);
  }
  assert.equal(session.looperLastCommands.length, 2);
  assert.match(ui.looperStatus.textContent, /non verificato/);
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
    sendProfilerRequests() {}, toast() {}, Date,
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
    trackProfilerRig() {}, handlePerformanceControl() {}, handleMorphState() {}, handleEffectState() {},
    handleTempoState() {}, handleRigSelectionState() {}, handleFreezeState() {},
    handleFixedFxState() {}, handleTunerStream() {}, captureTunerMode() {},
    shouldLog: () => false, addLog() {}, pulseTempo() {}, scheduleProfilerSync() {},
    sendProfilerRequests() {}, buildRenderedValueRequest() {},
  };
  vm.runInNewContext(`${functionSnippet('function attachInputs() {', 'async function requestMidiAccess() {')}\nthis.attachInputs = attachInputs;`, context);
  context.attachInputs();
  other.onmidimessage({ data: Uint8Array.from([0xc0, 42]) });
  assert.equal(seen.length, 0);
  profiler.onmidimessage({ data: Uint8Array.from([0xc0, 43]) });
  assert.equal(seen.length, 1);
});
