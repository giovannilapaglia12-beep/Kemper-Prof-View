// v1.76: "Prova pedale" in ALTRO, per la pedaliera Bluetooth M-Vave Chocolate Plus (comprata da Giovanni il 15/10/2026).
// Sola lettura: mostra cosa manda ogni pedale e per quanto è stato tenuto premuto, e lo salva nella diagnostica.
// Il pedale arriva in due modi: come porta MIDI di Chrome (se Android lo ha collegato come dispositivo MIDI),
// oppure collegato direttamente dall'app con il Bluetooth di Chrome (così funziona: prova del 15/10/2026).
// v1.78: i pedali A…D (CC 20…23) comandano l'app, vedi pedal-control.js; gli altri messaggi restano solo qui.

import {
  BLE_MIDI,
  bluetoothPedalRequest,
  describePedalMessage,
  isPedalSourceName,
  parseBleMidiPacket,
  pedalSwitchFromMessage,
} from "../kemper-midi.js";
import { PEDAL_KEY } from "./config.js";
import { toast, ui } from "./dom.js";
import { session } from "./state.js";
import { handlePedalSwitch, paintPedalPage, pedalControlDiagnostics, releaseAllPedals } from "./pedal-control.js";

const MAX_MESSAGES = 60;
const SHOWN_MESSAGES = 12;
// Clock e Active Sensing arrivano di continuo: si contano ma non si mostrano.
const IGNORED_STATUS = new Set([0xf8, 0xfe]);
const RECONNECT_MS = 2000;
const RECONNECT_TRIES = 15;

session.pedal = {
  messages: [],
  pressedAt: new Map(),
  ignored: 0,
  midiPorts: [],
  // v1.78: pedale già collegato una volta su questo telefono: la riga PEDALE resta in PALCO per ricollegarlo.
  remembered: readRemembered(),
  bluetooth: { supported: typeof navigator !== "undefined" && "bluetooth" in navigator, state: "off", name: null, error: null,
    step: null, searchedAll: false, reconnectTries: 0 },
};

let bluetoothDevice = null;
let reconnectTimer = null;

function readRemembered() {
  try { return localStorage.getItem(PEDAL_KEY) === "1"; } catch { return false; }
}

function rememberPedal() {
  session.pedal.remembered = true;
  try { localStorage.setItem(PEDAL_KEY, "1"); } catch { /* facoltativo */ }
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(2).replace(".", ",")} s`;
}

function messageLine(record) {
  const held = record.heldMs === null ? "" : ` · tenuto ${formatSeconds(record.heldMs)}`;
  return `${record.text}${held}`;
}

export function paintPedal() {
  const pedal = session.pedal;
  const bt = pedal.bluetooth;
  // v1.78: le porte "MS-1 … MS-4 · dev-core" del telefono non sono il pedale (diagnostiche del 15/10/2026).
  ui.pedalPorts.textContent = pedal.midiPorts.length
    ? `Altre porte MIDI (non il Player): ${pedal.midiPorts.join(", ")}`
    : "Nessun'altra porta MIDI oltre al Player.";
  const linked = bt.state === "connected" || bt.state === "reconnecting";
  ui.pedalBluetooth.textContent = linked ? "Scollega pedale Bluetooth" : "Collega pedale Bluetooth";
  ui.pedalBluetooth.disabled = !bt.supported || bt.state === "searching";
  ui.pedalBluetooth.setAttribute("aria-pressed", String(linked));
  ui.pedalBluetoothAll.hidden = linked;
  ui.pedalBluetoothAll.disabled = !bt.supported || bt.state === "searching";
  ui.pedalStatus.textContent = !bt.supported
    ? "Il Bluetooth non è disponibile in questo browser: usa Chrome su Android."
    : bt.state === "searching" ? "Ricerca del pedale…"
      : bt.state === "connected" ? `Bluetooth: collegato a ${bt.name ?? "pedale senza nome"}`
        : bt.state === "reconnecting" ? `Bluetooth: ricollego ${bt.name ?? "il pedale"}… (tentativo ${bt.reconnectTries + 1} di ${RECONNECT_TRIES})`
          : bt.error ? `Bluetooth: ${bt.error}` : "";
  // Riga PEDALE in PALCO: pagina e funzioni se collegato, altrimenti un pulsante per (ri)collegarlo.
  ui.stagePedal.hidden = !bt.supported || (!pedal.remembered && bt.state === "off");
  ui.stagePedal.dataset.state = bt.state;
  ui.stagePedalConnect.hidden = bt.state === "connected";
  ui.stagePedalConnect.disabled = bt.state === "searching";
  ui.stagePedalConnect.textContent = bt.state === "reconnecting" ? "PEDALE · RICOLLEGO… (TOCCA PER RIPROVARE)"
    : bt.state === "searching" ? "PEDALE · COLLEGAMENTO…" : "PEDALE SCOLLEGATO · TOCCA PER COLLEGARE";
  paintPedalPage();
  const last = pedal.messages.at(-1);
  ui.pedalLast.textContent = last ? messageLine(last) : "Premi un pedale…";
  ui.pedalLog.replaceChildren(...pedal.messages.slice(-SHOWN_MESSAGES).reverse().map((record) => {
    const row = document.createElement("li");
    const time = document.createElement("time");
    const text = document.createElement("span");
    time.textContent = new Date(record.time).toLocaleTimeString("it-IT", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    text.textContent = `${messageLine(record)} · ${record.source}`;
    row.append(time, text);
    return row;
  }));
}

// Messaggio di un pedale (porta MIDI o Bluetooth): registrato, mostrato e, se è uno dei pedali A…D
// della Chocolate Plus, passato ai comandi (pedal-control.js).
export function handlePedalMidi(data, source, receivedAt = performance.now()) {
  const pedal = session.pedal;
  const bytes = Array.from(data);
  if (!bytes.length) return;
  if (IGNORED_STATUS.has(bytes[0])) {
    pedal.ignored += 1;
    return;
  }
  const message = describePedalMessage(bytes);
  let heldMs = null;
  const pressKey = message.key && `${source}|${message.key}`;
  if (message.pressed === true) {
    pedal.pressedAt.set(pressKey, receivedAt);
  } else if (message.pressed === false && pedal.pressedAt.has(pressKey)) {
    heldMs = Math.round(receivedAt - pedal.pressedAt.get(pressKey));
    pedal.pressedAt.delete(pressKey);
  }
  pedal.messages.push({
    time: new Date().toISOString(),
    source,
    text: message.text,
    kind: message.kind,
    channel: message.channel,
    number: message.number,
    value: message.value,
    pressed: message.pressed,
    heldMs,
    hex: bytes.map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" "),
  });
  pedal.messages = pedal.messages.slice(-MAX_MESSAGES);
  ui.copy.disabled = false;
  paintPedal();
  // Solo dal pedale (Bluetooth o porta con il suo nome): altre porte MIDI non comandano nulla.
  const pedalSwitch = source.startsWith("Bluetooth") || isPedalSourceName(source) ? pedalSwitchFromMessage(bytes) : null;
  if (pedalSwitch) handlePedalSwitch(pedalSwitch.pedal, pedalSwitch.pressed);
}

// Porte MIDI che non sono il Player (chiamata da connection.js a ogni cambio di porte).
export function setPedalPorts(names) {
  session.pedal.midiPorts = names;
  paintPedal();
}

// Passi del collegamento, per capire dalla diagnostica dove si ferma.
const STEP_ERRORS = {
  connessione: "il pedale non accetta il collegamento (è già collegato a CubeSuite o ad Android?)",
  "servizio MIDI": "questo dispositivo non ha il MIDI Bluetooth: scegli il pedale",
  notifiche: "il pedale non manda i suoi messaggi",
};

function onPedalPacket(event) {
  const view = event.target.value;
  const receivedAt = performance.now();
  const source = `Bluetooth · ${bluetoothDevice?.name ?? "pedale"}`;
  for (const message of parseBleMidiPacket(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))) {
    handlePedalMidi(message, source, receivedAt);
  }
}

async function attachDevice(device) {
  const bt = session.pedal.bluetooth;
  bt.step = "connessione";
  const server = await device.gatt.connect();
  bt.step = "servizio MIDI";
  const service = await server.getPrimaryService(BLE_MIDI.service);
  const characteristic = await service.getCharacteristic(BLE_MIDI.characteristic);
  characteristic.addEventListener("characteristicvaluechanged", onPedalPacket);
  bt.step = "notifiche";
  await characteristic.startNotifications();
  bt.step = null;
  bt.error = null;
  bt.name = device.name ?? null;
  bt.state = "connected";
  rememberPedal();
}

// v1.78: sul palco il pedale può spegnersi o allontanarsi: l'app prova da sola a ricollegarlo per 30 s
// (stesso pedale già scelto: non serve un tocco). Intanto i pedali tenuti premuti vengono rilasciati.
function bluetoothDisconnected() {
  releaseAllPedals();
  const bt = session.pedal.bluetooth;
  if (bt.state !== "connected") return; // durante un collegamento o dopo "Scollega"
  bt.state = "reconnecting";
  bt.reconnectTries = 0;
  toast("Pedale scollegato · provo a ricollegarlo");
  scheduleReconnect();
  paintPedal();
}

function scheduleReconnect() {
  window.clearTimeout(reconnectTimer);
  reconnectTimer = window.setTimeout(async () => {
    const bt = session.pedal.bluetooth;
    if (bt.state !== "reconnecting" || !bluetoothDevice) return;
    bt.reconnectTries += 1;
    try {
      await attachDevice(bluetoothDevice);
      toast(`Pedale ricollegato: ${bt.name ?? "senza nome"}`);
    } catch (error) {
      bt.error = bluetoothErrorText(bt.step, error);
      if (bt.state === "reconnecting" && bt.reconnectTries < RECONNECT_TRIES) {
        scheduleReconnect();
      } else if (bt.state === "reconnecting") {
        bt.state = "off";
        toast("Pedale non ricollegato: tocca la riga PEDALE");
      }
    }
    paintPedal();
  }, RECONNECT_MS);
}

export function disconnectBluetoothPedal() {
  const bt = session.pedal.bluetooth;
  window.clearTimeout(reconnectTimer);
  bt.state = "off"; // prima di scollegare: così non parte il ricollegamento
  bluetoothDevice?.gatt?.disconnect();
  releaseAllPedals();
  paintPedal();
}

// Collega il pedale: quello già scelto in questa sessione, altrimenti la finestra di scelta di Chrome
// (all = true: tutti i dispositivi vicini, "Cerca tutti i dispositivi").
export async function connectBluetoothPedal({ all = false } = {}) {
  const bt = session.pedal.bluetooth;
  if (!bt.supported || bt.state === "searching" || bt.state === "connected") return;
  window.clearTimeout(reconnectTimer);
  bt.state = "searching";
  bt.error = null;
  bt.searchedAll = all;
  paintPedal();
  let device = all ? null : bluetoothDevice;
  try {
    if (!device) {
      bt.step = "ricerca";
      device = await navigator.bluetooth.requestDevice(bluetoothPedalRequest({ all }));
    }
    bt.name = device.name ?? null;
    device.addEventListener("gattserverdisconnected", bluetoothDisconnected);
    bluetoothDevice = device;
    await attachDevice(device);
    toast(`Pedale collegato: ${bt.name ?? "senza nome"}`);
  } catch (error) {
    bt.error = bluetoothErrorText(bt.step, error);
    bt.state = "off";
    if (bt.step !== "ricerca") {
      device?.gatt?.disconnect();
      bluetoothDevice = null; // la prossima volta si sceglie di nuovo dalla finestra di Chrome
    }
  }
  paintPedal();
}

// Pulsante di ALTRO: collega o scollega.
export function toggleBluetoothPedal(options = {}) {
  const state = session.pedal.bluetooth.state;
  if (state === "connected" || state === "reconnecting") disconnectBluetoothPedal();
  else connectBluetoothPedal(options);
}

// All'avvio: se Chrome ricorda il pedale già usato, l'app prova a ricollegarlo senza la finestra di scelta.
export async function restoreBluetoothPedal() {
  const bt = session.pedal.bluetooth;
  if (!bt.supported || !session.pedal.remembered || typeof navigator.bluetooth.getDevices !== "function") return;
  try {
    const devices = await navigator.bluetooth.getDevices();
    const device = devices.find((candidate) => isPedalSourceName(candidate.name));
    if (!device || bt.state !== "off") return;
    device.addEventListener("gattserverdisconnected", bluetoothDisconnected);
    bluetoothDevice = device;
    bt.name = device.name ?? null;
    bt.state = "reconnecting";
    bt.reconnectTries = 0;
    scheduleReconnect();
    paintPedal();
  } catch { /* facoltativo: si collega col tocco */ }
}

export function bluetoothErrorText(step, error) {
  // NotFoundError durante la ricerca: finestra chiusa senza scegliere (il pedale non compariva).
  if (step === "ricerca" && error?.name === "NotFoundError") {
    return "nessun pedale scelto. Se non compariva: interruttore su H, CubeSuite chiusa, pedale non abbinato nelle impostazioni Bluetooth di Android, Posizione attiva; poi prova «Cerca tutti i dispositivi».";
  }
  const detail = error?.message ?? String(error);
  return STEP_ERRORS[step] ? `${STEP_ERRORS[step]} (${detail})` : detail;
}

export function clearPedalLog() {
  session.pedal.messages = [];
  session.pedal.pressedAt.clear();
  session.pedal.ignored = 0;
  paintPedal();
}

export function pedalDiagnostics() {
  const pedal = session.pedal;
  return {
    midiPorts: pedal.midiPorts,
    bluetooth: { ...pedal.bluetooth },
    remembered: pedal.remembered,
    ignoredClockMessages: pedal.ignored,
    messages: pedal.messages,
    control: pedalControlDiagnostics(),
  };
}
