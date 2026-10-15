// v1.76: "Prova pedale" in ALTRO, per la pedaliera Bluetooth M-Vave Chocolate Plus (comprata da Giovanni il 15/10/2026).
// Sola lettura: mostra cosa manda ogni pedale e per quanto è stato tenuto premuto, e lo salva nella diagnostica.
// Il pedale arriva in due modi: come porta MIDI di Chrome (se Android lo ha collegato come dispositivo MIDI),
// oppure collegato direttamente dall'app con il Bluetooth di Chrome. Per ora i pedali non comandano nulla:
// questa prova serve a scegliere come usarli (Looper, pagine di funzioni). Non invia niente al Player.

import { BLE_MIDI, bluetoothPedalRequest, describePedalMessage, parseBleMidiPacket } from "../kemper-midi.js";
import { toast, ui } from "./dom.js";
import { session } from "./state.js";

const MAX_MESSAGES = 60;
const SHOWN_MESSAGES = 12;
// Clock e Active Sensing arrivano di continuo: si contano ma non si mostrano.
const IGNORED_STATUS = new Set([0xf8, 0xfe]);

session.pedal = {
  messages: [],
  pressedAt: new Map(),
  ignored: 0,
  midiPorts: [],
  bluetooth: { supported: typeof navigator !== "undefined" && "bluetooth" in navigator, state: "off", name: null, error: null,
    step: null, searchedAll: false },
};

let bluetoothDevice = null;

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
  ui.pedalPorts.textContent = pedal.midiPorts.length
    ? `Pedale visto come porta MIDI: ${pedal.midiPorts.join(", ")}`
    : "Nessun pedale fra le porte MIDI.";
  ui.pedalBluetooth.textContent = bt.state === "connected" ? "Scollega pedale Bluetooth" : "Collega pedale Bluetooth";
  ui.pedalBluetooth.disabled = !bt.supported || bt.state === "searching";
  ui.pedalBluetooth.setAttribute("aria-pressed", String(bt.state === "connected"));
  ui.pedalBluetoothAll.hidden = bt.state === "connected";
  ui.pedalBluetoothAll.disabled = !bt.supported || bt.state === "searching";
  ui.pedalStatus.textContent = !bt.supported
    ? "Il Bluetooth non è disponibile in questo browser: usa Chrome su Android."
    : bt.state === "searching" ? "Ricerca del pedale…"
      : bt.state === "connected" ? `Bluetooth: collegato a ${bt.name ?? "pedale senza nome"}`
        : bt.error ? `Bluetooth: ${bt.error}` : "";
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

// Messaggio di un pedale (porta MIDI o Bluetooth). Solo registrato e mostrato.
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
}

// Porte MIDI che non sono il Player (chiamata da connection.js a ogni cambio di porte).
export function setPedalPorts(names) {
  session.pedal.midiPorts = names;
  paintPedal();
}

function bluetoothDisconnected() {
  const bt = session.pedal.bluetooth;
  if (bt.state === "connected") toast("Pedale Bluetooth scollegato");
  bt.state = "off";
  paintPedal();
}

// Passi del collegamento, per capire dalla diagnostica dove si ferma.
const STEP_ERRORS = {
  connessione: "il pedale non accetta il collegamento (è già collegato a CubeSuite o ad Android?)",
  "servizio MIDI": "questo dispositivo non ha il MIDI Bluetooth: scegli il pedale",
  notifiche: "il pedale non manda i suoi messaggi",
};

// Tocco su "Collega pedale Bluetooth" (all = false) o "Cerca tutti i dispositivi" (all = true).
export async function toggleBluetoothPedal({ all = false } = {}) {
  const bt = session.pedal.bluetooth;
  if (bt.state === "connected") {
    bluetoothDevice?.gatt?.disconnect();
    bluetoothDisconnected();
    return;
  }
  if (!bt.supported || bt.state === "searching") return;
  bt.state = "searching";
  bt.error = null;
  bt.step = "ricerca";
  bt.searchedAll = all;
  paintPedal();
  try {
    const device = await navigator.bluetooth.requestDevice(bluetoothPedalRequest({ all }));
    bt.name = device.name ?? null;
    device.addEventListener("gattserverdisconnected", bluetoothDisconnected);
    bt.step = "connessione";
    const server = await device.gatt.connect();
    bt.step = "servizio MIDI";
    const service = await server.getPrimaryService(BLE_MIDI.service);
    const characteristic = await service.getCharacteristic(BLE_MIDI.characteristic);
    const source = `Bluetooth · ${device.name ?? "pedale"}`;
    characteristic.addEventListener("characteristicvaluechanged", (event) => {
      const view = event.target.value;
      const receivedAt = performance.now();
      for (const message of parseBleMidiPacket(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))) {
        handlePedalMidi(message, source, receivedAt);
      }
    });
    bt.step = "notifiche";
    await characteristic.startNotifications();
    bluetoothDevice = device;
    bt.step = null;
    bt.state = "connected";
    toast(`Pedale collegato: ${bt.name ?? "senza nome"}`);
  } catch (error) {
    bt.state = "off";
    bt.error = bluetoothErrorText(bt.step, error);
    bluetoothDevice?.gatt?.disconnect();
  }
  paintPedal();
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
    ignoredClockMessages: pedal.ignored,
    messages: pedal.messages,
    commandsToPlayer: "nessuno: prova in sola lettura",
  };
}
