// Prova registrata (v1.60): esegue una sequenza fissa di tocchi sull'app con il Player DEMO,
// in Chrome automatico e con orologio controllato, e salva per ogni passo:
//   - i messaggi MIDI inviati dall'app (byte per byte, in ordine)
//   - la pagina intera (HTML) e la memoria del telefono (localStorage)
//   - gli errori della pagina
// Serve a dimostrare che un riordino del codice non cambia il comportamento:
// due registrazioni (prima/dopo) devono essere identiche. Vedi confronta.mjs.
//
// Uso:  node registra.mjs <cartella dist> <file di uscita.json>
// Richiede il pacchetto "playwright" (non serve per usare l'app né per i test normali).

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [distDir, outFile] = process.argv.slice(2);
if (!distDir || !outFile) {
  console.error("Uso: node registra.mjs <cartella dist> <uscita.json>");
  process.exit(2);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const file = path.join(distDir, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    res.end(data);
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

// Eseguito nella pagina prima dell'app: caso ripetibile, registratore MIDI, niente blocco schermo reale.
function initScript() {
  let seed = 12345;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // performance.now dall'orologio finto (fermo), senza lo scarto del caricamento reale della pagina.
  const origin = Date.parse("2026-09-28T10:00:00+02:00");
  performance.now = () => Date.now() - origin;
  window.__sent = [];
  window.__errors = [];
  window.addEventListener("error", (event) => window.__errors.push(String(event.message)));
  window.addEventListener("unhandledrejection", (event) => window.__errors.push(`rejection: ${event.reason}`));
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request: async () => ({ released: false, release: async () => {}, addEventListener() {} }) },
  });
  let inner = null;
  Object.defineProperty(navigator, "requestMIDIAccess", {
    configurable: true,
    get() {
      if (!inner) return undefined;
      return async (...args) => {
        const access = await inner(...args);
        for (const output of access.outputs.values()) {
          if (output.__wrapped) continue;
          const send = output.send.bind(output);
          output.send = (data) => { window.__sent.push(Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join(" ")); return send(data); };
          output.__wrapped = true;
        }
        return access;
      };
    },
    set(fn) { inner = fn; },
  });
  // Web MIDI "esiste" come in Chrome su Android (la demo sostituisce la funzione).
  inner = async () => { throw new Error("Nessun MIDI reale nella prova registrata"); };
}

const browser = await chromium.launch();
const results = { scenarios: {} };

async function scenario(name, { bidi = true, noBidiReply = false, landscape = false } = {}, steps) {
  const context = await browser.newContext({
    viewport: landscape ? { width: 915, height: 412 } : { width: 412, height: 915 },
    deviceScaleFactor: 1, locale: "it-IT", timezoneId: "Europe/Rome", serviceWorkers: "block", acceptDownloads: true,
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-09-28T10:00:00+02:00") });
  await page.addInitScript(initScript);
  await page.addInitScript(({ bidi, noBidiReply }) => {
    if (!bidi) localStorage.setItem("kemper-stage-view-bidi", "0");
    if (noBidiReply) window.__demoNoBidi = true;
  }, { bidi, noBidiReply });
  // L'orologio resta fermo: il tempo avanza solo con run(ms), così ogni esecuzione è identica.
  await page.clock.pauseAt(new Date("2026-09-28T10:00:02+02:00"));
  await page.goto(base);
  await page.clock.runFor(500);

  const record = [];
  const snap = async (label) => {
    const data = await page.evaluate(() => {
      const sent = window.__sent.splice(0);
      const errors = window.__errors.splice(0);
      const storage = {};
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        storage[key] = localStorage.getItem(key);
      }
      // Le schede usate sul palco, per confronti che ignorano ALTRO (--schede in confronta.mjs).
      const parts = {};
      for (const selector of [".live-panel", ".rig-panel", ".looper-panel", "#tuner-overlay", "#bank-picker", "#toast", ".view-switcher"]) {
        parts[selector] = document.querySelector(selector)?.outerHTML ?? null;
      }
      return { sent, errors, storage, parts, html: document.documentElement.outerHTML };
    });
    record.push({ step: label, ...data });
  };
  const run = (ms) => page.clock.runFor(ms);
  // Tocco = click() sull'elemento: nessuna attesa che il pulsante sia attivo (l'orologio è fermo) e
  // nessun rischio di colpire la barra delle schede; un pulsante disattivato non risponde, come sul telefono.
  // I pulsanti del Looper (pressione/rilascio) usano invece il mouse vero: hold() e drag().
  const click = (selector) => page.$eval(selector, (element) => element.click());
  const tap = async (selector, wait = 400) => { await click(selector); await run(wait); };
  const hold = async (selector, holdMs, wait = 400) => {
    const box = await page.locator(selector).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await run(holdMs);
    await page.mouse.up();
    await run(wait);
  };
  const drag = async (selector, dx, wait = 400) => {
    const box = await page.locator(selector).boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await run(30);
    await page.mouse.move(x + dx, y, { steps: 4 });
    await run(30);
    await page.mouse.up();
    await run(wait);
  };
  // La demo si carica con import(): un'attesa vera (non dell'orologio finto) finché è collegata.
  const demo = async (wait) => {
    await click("#live-demo-button");
    for (let i = 0; i < 200; i += 1) {
      if (await page.evaluate(() => window.__kemperDemo === true && window.__sent.length > 0)) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await run(wait);
  };
  const helpers = { page, run, tap, hold, drag, snap, demo, click };
  await snap("apertura");
  for (const [label, action] of steps) {
    try {
      await action(helpers);
    } catch (error) {
      const shot = `${outFile}.errore.png`;
      await page.screenshot({ path: shot });
      console.error(`Scenario "${name}", passo "${label}": ${error.message.split("\n")[0]} (schermata: ${shot})`);
      throw error;
    }
    await snap(label);
  }
  results.scenarios[name] = record;
  await context.close();
}

const view = (name) => async ({ tap }) => tap(`[data-view-button="${name}"]`, 300);

const principale = [
  ["demo: collega Player simulato", async ({ demo }) => demo(3000)],
  ["attesa 13 s (rinnovo beacon, sync)", async ({ run }) => run(13000)],
  ["effetto 1", async ({ tap }) => tap("#live-effects-grid button:nth-child(1)", 1500)],
  ["effetto 5", async ({ tap }) => tap("#live-effects-grid button:nth-child(5)", 1500)],
  ["effetto 8", async ({ tap }) => tap("#live-effects-grid button:nth-child(8)", 1500)],
  ["Fixed FX 1", async ({ tap }) => tap("#live-fixed-fx-grid button:nth-child(1)", 1500)],
  ["Fixed FX 3", async ({ tap }) => tap("#live-fixed-fx-grid button:nth-child(3)", 1500)],
  ["Freeze on", async ({ tap }) => tap("#live-freeze-button", 1500)],
  ["Freeze off", async ({ tap }) => tap("#live-freeze-button", 1500)],
  ["BPM +1", async ({ tap }) => tap("#live-tempo-up-button", 1500)],
  ["BPM −1 ×2", async ({ click, run }) => { await click("#live-tempo-down-button"); await run(150); await click("#live-tempo-down-button"); await run(800); }],
  ["TAP ×4", async ({ click, run }) => { for (let i = 0; i < 4; i += 1) { await click("#live-tap-button"); await run(500); } await run(1500); }],
  ["BPM intero", async ({ tap }) => tap("#live-tempo-round-button", 1500)],
  ["Morph on", async ({ tap }) => tap("#live-morph-toggle", 1000)],
  ["Morph off", async ({ tap }) => tap("#live-morph-toggle", 1000)],
  ["Morph 40%", async ({ page, click, run }) => {
    await click(".stage-morph-level summary"); await run(200);
    await page.fill("#live-morph-slider", "40", { force: true }); await run(100);
    await click("#live-morph-apply"); await run(1000);
  }],
  ["Tuner apri", async ({ tap }) => tap("#live-tuner-button", 3000)],
  ["Tuner chiudi", async ({ tap }) => tap("#tuner-overlay-close", 1500)],
  ["vista RIG", view("rig")],
  ["Rig 3", async ({ tap }) => tap('[data-live-rig-slot="3"]', 3000)],
  ["torna a RIG, Bank +1", async ({ tap }) => { await tap('[data-view-button="rig"]', 300); await tap("#live-bank-up", 300); }],
  ["Rig 2 (Bank 2)", async ({ tap }) => tap('[data-live-rig-slot="2"]', 3000)],
  ["torna a RIG, griglia Bank", async ({ tap }) => { await tap('[data-view-button="rig"]', 300); await tap("#live-bank-pick", 300); }],
  ["Bank mostrate −5", async ({ tap }) => tap("#bank-picker-less", 300)],
  ["griglia: Bank 30", async ({ tap }) => tap('[data-pick-bank="30"]', 300)],
  ["Rig 4 (Bank 30, Bank Select 1)", async ({ tap }) => tap('[data-live-rig-slot="4"]', 3000)],
  ["torna a RIG, Bank −1 e torna alla Bank in uso", async ({ tap }) => { await tap('[data-view-button="rig"]', 300); await tap("#live-bank-down", 300); await tap("#rig-current-jump", 300); }],
  ["vista LOOPER", view("looper")],
  ["aggancio battuta", async ({ tap }) => tap('[data-quantize="bar4"]', 300)],
  ["posizione INGRESSO", async ({ tap }) => tap('[data-looper-location="0"]', 1500)],
  ["REC (inizio)", async ({ hold }) => hold('[data-looper-switch="record"]', 80, 4000)],
  ["REC (chiusura agganciata)", async ({ hold }) => hold('[data-looper-switch="record"]', 80, 4000)],
  ["REC (overdub)", async ({ hold }) => hold('[data-looper-switch="record"]', 80, 2000)],
  ["PALCO, poi icona Looper", async ({ tap }) => { await tap('[data-view-button="live"]', 300); await tap("#stage-looper", 300); }],
  ["UNDO tocco", async ({ hold }) => hold('[data-looper-switch="undo"]', 60, 500)],
  ["REVERSE trascinato (non deve partire)", async ({ drag }) => drag('[data-looper-switch="reverse"]', 40, 500)],
  ["REVERSE tocco", async ({ hold }) => hold('[data-looper-switch="reverse"]', 60, 1500)],
  ["½ SPEED tocco", async ({ hold }) => hold('[data-looper-switch="half"]', 60, 1500)],
  ["STOP", async ({ hold }) => hold('[data-looper-switch="stop"]', 80, 1000)],
  ["TRIGGER a loop fermo", async ({ hold }) => hold('[data-looper-switch="trigger"]', 80, 1500)],
  ["TRIGGER mentre suona", async ({ hold }) => hold('[data-looper-switch="trigger"]', 80, 1500)],
  ["½ SPEED inverti", async ({ tap }) => tap("#looper-half-fix", 300)],
  ["REVERSE inverti", async ({ tap }) => tap("#looper-reverse-fix", 300)],
  ["CANCELLA (doppio tocco)", async ({ click, run }) => { await click("#looper-erase"); await run(300); await click("#looper-erase"); await run(3500); }],
  ["vista ALTRO", view("full")],
  ["tema SOLE", async ({ tap }) => tap('[data-theme-choice="sun"]', 300)],
  ["Leggi Transpose (1ª lettura)", async ({ tap }) => tap("#transpose-probe-button", 3500)],
  ["PALCO: Transpose ON/OFF, poi ALTRO", async ({ tap }) => {
    await tap('[data-view-button="live"]', 300);
    await tap("#live-fixed-fx-grid button:nth-child(3)", 1500);
    await tap('[data-view-button="full"]', 300);
  }],
  ["Leggi Transpose (2ª lettura)", async ({ tap }) => tap("#transpose-probe-button", 3800)],
  ["sync manuale", async ({ tap }) => tap("#identity-button", 1500)],
  ["auto sync off/on", async ({ tap }) => { await tap("#auto-button", 2000); await tap("#auto-button", 2000); }],
  ["salva diagnostica", async ({ page, click, run }) => {
    const downloadPromise = page.waitForEvent("download");
    await click("#save-diagnostics-button");
    const download = await downloadPromise;
    const text = fs.readFileSync(await download.path(), "utf8");
    await page.evaluate((t) => { window.__sent.push(`DIAGNOSTICA ${t}`); }, text);
    await run(300);
  }],
  ["bidirezionale off", async ({ tap }) => tap("#bidi-toggle", 4000)],
  ["attesa 12 s senza bidirezionale", async ({ run }) => run(12000)],
  ["bidirezionale on", async ({ tap }) => tap("#bidi-toggle", 4000)],
  ["cancella nomi (doppio tocco)", async ({ click, run }) => { await click("#forget-names-button"); await run(300); await click("#forget-names-button"); await run(300); }],
  ["svuota registro", async ({ tap }) => tap("#clear-button", 300)],
  ["tema SCURO", async ({ tap }) => tap('[data-theme-choice="dark"]', 300)],
  ["vista PALCO", view("live")],
  ["attesa finale 20 s", async ({ run }) => run(20000)],
];

const senzaBidi = [
  ["demo: collega Player simulato", async ({ demo }) => demo(3000)],
  ["attesa 10 s (letture periodiche)", async ({ run }) => run(10000)],
  ["effetto 3", async ({ tap }) => tap("#live-effects-grid button:nth-child(3)", 1500)],
  ["Fixed FX 2", async ({ tap }) => tap("#live-fixed-fx-grid button:nth-child(2)", 1500)],
  ["Morph on", async ({ tap }) => tap("#live-morph-toggle", 1500)],
  ["BPM +1", async ({ tap }) => tap("#live-tempo-up-button", 1500)],
  ["Tuner apri", async ({ tap }) => tap("#live-tuner-button", 3000)],
  ["Tuner chiudi", async ({ tap }) => tap("#tuner-overlay-close", 1500)],
  ["vista RIG", view("rig")],
  ["Rig 5", async ({ tap }) => tap('[data-live-rig-slot="5"]', 3000)],
  ["attesa 10 s", async ({ run }) => run(10000)],
];

const playerMuto = [
  ["demo: collega Player che non risponde al beacon", async ({ demo }) => demo(3000)],
  ["attesa 20 s (nuovi tentativi, ritorno alle letture)", async ({ run }) => run(20000)],
  ["effetto 1", async ({ tap }) => tap("#live-effects-grid button:nth-child(1)", 1500)],
  ["vista ALTRO", view("full")],
  ["attesa 10 s", async ({ run }) => run(10000)],
];

const orizzontale = [
  ["demo: collega Player simulato", async ({ demo }) => demo(3000)],
  ["vista RIG", view("rig")],
  ["Rig 2", async ({ tap }) => tap('[data-live-rig-slot="2"]', 3000)],
  ["vista LOOPER", view("looper")],
];

await scenario("principale", {}, principale);
await scenario("senza bidirezionale", { bidi: false }, senzaBidi);
await scenario("Player che non risponde al beacon", { noBidiReply: true }, playerMuto);
await scenario("orizzontale", { landscape: true }, orizzontale);

await browser.close();
server.close();
fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
const summary = Object.entries(results.scenarios).map(([name, steps]) =>
  `${name}: ${steps.length} passi, ${steps.reduce((n, s) => n + s.sent.length, 0)} messaggi MIDI, ${steps.reduce((n, s) => n + s.errors.length, 0)} errori`);
console.log(summary.join("\n"));
