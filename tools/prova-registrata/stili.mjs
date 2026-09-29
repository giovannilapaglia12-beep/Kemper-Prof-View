// Confronto dello stile (v1.63): apre due versioni dell'app affiancate (prima/dopo) in Chrome automatico,
// con il Player DEMO e l'orologio controllato, le porta negli stessi stati (schede, Tuner, griglia Bank,
// pulsanti in attesa, Looper, messaggi brevi…) e in ogni stato confronta, in tema SCURO e SOLE,
// lo stile calcolato di OGNI elemento della pagina (anche ::before e ::after) e la sua posizione.
// Serve a dimostrare che un riordino del CSS non cambia l'aspetto dell'app.
//
// Uso:  node stili.mjs <cartella dist prima> <cartella dist dopo> [--max 20]
// Esce con codice 0 se tutto è identico, 1 se trova differenze (elenca le prime).
// Richiede il pacchetto "playwright" (vedi README).

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const [distA, distB] = args.filter((arg) => !arg.startsWith("--") && !/^\d+$/.test(arg));
const maxIndex = args.indexOf("--max");
const MAX_REPORT = maxIndex >= 0 ? Number(args[maxIndex + 1]) : 20;
if (!distA || !distB) {
  console.error("Uso: node stili.mjs <dist prima> <dist dopo> [--max 20]");
  process.exit(2);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png" };
async function serve(dir) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const file = path.join(dir, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}/` };
}

// Come in registra.mjs: caso ripetibile, niente blocco schermo reale.
function initScript() {
  let seed = 12345;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const origin = Date.parse("2026-09-28T10:00:00+02:00");
  performance.now = () => Date.now() - origin;
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request: async () => ({ released: false, release: async () => {}, addEventListener() {} }) },
  });
  window.__errors = [];
  window.addEventListener("error", (event) => window.__errors.push(String(event.message)));
}

// Nella pagina: animazioni ferme all'inizio, transizioni concluse, poi stile e posizione di ogni elemento.
function snapshotInPage() {
  for (const animation of document.getAnimations()) {
    try {
      if (animation instanceof CSSTransition) animation.finish();
      else { animation.pause(); animation.currentTime = 0; }
    } catch { /* animazione già conclusa */ }
  }
  const describe = (element) => {
    const id = element.id ? `#${element.id}` : "";
    const classes = element.classList.length ? `.${[...element.classList].join(".")}` : "";
    const data = element.dataset && Object.keys(element.dataset).length
      ? `[${Object.entries(element.dataset).map(([k, v]) => `${k}=${v}`).join(",")}]` : "";
    return `${element.tagName.toLowerCase()}${id}${classes}${data}`;
  };
  const pathOf = (element) => {
    const parts = [];
    for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
      parts.unshift([...node.parentElement.children].indexOf(node));
    }
    return parts.join("/");
  };
  const serialize = (style) => {
    const out = [];
    for (let i = 0; i < style.length; i += 1) {
      const name = style[i];
      out.push(`${name}:${style.getPropertyValue(name)}`);
    }
    return out.join(";");
  };
  const result = [];
  for (const element of document.querySelectorAll("body, body *")) {
    if (["SCRIPT", "STYLE", "LINK", "META", "TEMPLATE"].includes(element.tagName)) continue;
    const rect = element.getBoundingClientRect();
    const round = (value) => Math.round(value * 100) / 100;
    result.push({
      key: pathOf(element),
      desc: describe(element),
      rect: `${round(rect.x)},${round(rect.y)},${round(rect.width)},${round(rect.height)}`,
      style: serialize(getComputedStyle(element)),
      before: serialize(getComputedStyle(element, "::before")),
      after: serialize(getComputedStyle(element, "::after")),
    });
  }
  return result;
}

function diffStyle(a, b) {
  const map = (text) => new Map(text.split(";").filter(Boolean).map((pair) => {
    const at = pair.indexOf(":");
    return [pair.slice(0, at), pair.slice(at + 1)];
  }));
  const ma = map(a);
  const mb = map(b);
  const out = [];
  for (const key of new Set([...ma.keys(), ...mb.keys()])) {
    if (ma.get(key) !== mb.get(key)) out.push(`${key}: «${ma.get(key)}» → «${mb.get(key)}»`);
  }
  return out;
}

const browser = await chromium.launch();
const servers = [await serve(distA), await serve(distB)];
let checked = 0;
let elementsChecked = 0;
const problems = [];
const distinct = new Map(); // tipo di differenza → quante volte

async function scenario(name, viewport, steps) {
  const pages = [];
  for (const { base } of servers) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "it-IT",
      timezoneId: "Europe/Rome", serviceWorkers: "block" });
    const page = await context.newPage();
    await page.clock.install({ time: new Date("2026-09-28T10:00:00+02:00") });
    await page.clock.pauseAt(new Date("2026-09-28T10:00:02+02:00"));
    await page.addInitScript(initScript);
    await page.goto(base);
    await page.clock.runFor(500);
    pages.push(page);
  }
  const both = (fn) => Promise.all(pages.map(fn));
  const helpers = {
    run: (ms) => both((page) => page.clock.runFor(ms)),
    click: (selector) => both((page) => page.$eval(selector, (element) => element.click())),
    eval: (fn, arg) => both((page) => page.evaluate(fn, arg)),
    press: (selector, ms) => both(async (page) => {
      const box = await page.locator(selector).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.clock.runFor(ms);
      await page.mouse.up();
    }),
    demo: () => both(async (page) => {
      await page.$eval("#live-demo-button", (element) => element.click());
      for (let i = 0; i < 200; i += 1) {
        if (await page.evaluate(() => window.__kemperDemo === true)) break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }),
  };
  const check = async (label) => {
    for (const theme of ["dark", "sun"]) {
      await helpers.eval((t) => { document.body.dataset.theme = t; }, theme);
      const [a, b] = await both((page) => page.evaluate(snapshotInPage));
      checked += 1;
      const where = `${name} · ${label} · tema ${theme === "sun" ? "SOLE" : "SCURO"}`;
      if (a.length !== b.length) {
        problems.push(`${where}: numero di elementi diverso (${a.length} / ${b.length})`);
        continue;
      }
      for (let i = 0; i < a.length; i += 1) {
        elementsChecked += 1;
        if (a[i].key !== b[i].key) { problems.push(`${where}: struttura diversa a ${a[i].desc}`); break; }
        const lines = [];
        if (a[i].rect !== b[i].rect) lines.push(`posizione: «${a[i].rect}» → «${b[i].rect}»`);
        for (const part of ["style", "before", "after"]) {
          if (a[i][part] !== b[i][part]) {
            for (const line of diffStyle(a[i][part], b[i][part])) lines.push(`${part === "style" ? "" : `::${part} `}${line}`);
          }
        }
        if (lines.length) {
          problems.push(`${where}: ${a[i].desc}\n      ${lines.slice(0, 6).join("\n      ")}`);
          const kind = `${a[i].desc.replace(/\[.*\]$/, "")} — ${lines[0].replace(/«[^»]*»/g, "…")}`;
          distinct.set(kind, (distinct.get(kind) ?? 0) + 1);
        }
      }
    }
    await helpers.eval(() => { document.body.dataset.theme = localStorage.getItem("kemper-stage-view-theme") ?? "dark"; });
    const errors = await both((page) => page.evaluate(() => window.__errors.splice(0)));
    if (errors.flat().length) problems.push(`${name} · ${label}: errori nella pagina: ${errors.flat().join(" | ")}`);
  };
  for (const [label, action] of steps) {
    await action(helpers);
    await check(label);
  }
  for (const page of pages) await page.context().close();
}

const view = (name) => ({ click, run }) => click(`[data-view-button="${name}"]`).then(() => run(300));

const percorso = [
  ["PALCO, non collegato", async () => {}],
  ["RIG, non collegato", view("rig")],
  ["LOOPER, non collegato", view("looper")],
  ["ALTRO, non collegato", view("full")],
  ["PALCO, collegato (demo)", async (h) => { await h.click('[data-view-button="live"]'); await h.run(300); await h.demo(); await h.run(3000); }],
  ["PALCO, effetto in attesa", async (h) => { await h.click("#live-effects-grid button:nth-child(1)"); await h.run(20); }],
  ["PALCO, Fixed FX e Freeze accesi", async (h) => {
    await h.run(1500);
    await h.click("#live-fixed-fx-grid button:nth-child(3)"); await h.run(1500);
    await h.click("#live-freeze-button"); await h.run(1500);
  }],
  ["PALCO, Morph acceso e livello aperto", async (h) => {
    await h.click("#live-morph-toggle"); await h.run(1500);
    await h.click(".stage-morph-level summary"); await h.run(200);
  }],
  ["PALCO, TAP in ascolto", async (h) => { await h.click("#live-tap-button"); await h.run(200); }],
  ["Tuner a schermo intero", async (h) => { await h.run(3000); await h.click("#live-tuner-button"); await h.run(3000); }],
  ["Tuner chiuso", async (h) => { await h.click("#tuner-overlay-close"); await h.run(1500); }],
  ["RIG, collegato", view("rig")],
  ["RIG, griglia delle Bank", async (h) => { await h.click("#live-bank-pick"); await h.run(300); }],
  ["RIG, altra Bank scelta", async (h) => { await h.click('[data-pick-bank="7"]'); await h.run(300); }],
  ["RIG, cambio Rig in attesa", async (h) => { await h.click('[data-live-rig-slot="2"]'); await h.run(20); }],
  ["PALCO dopo il cambio Rig", async (h) => { await h.run(3000); }],
  ["LOOPER, vuoto con aggancio", async (h) => { await h.click('[data-view-button="looper"]'); await h.run(300); await h.click('[data-quantize="bar4"]'); await h.run(300); }],
  ["LOOPER, registrazione", async (h) => { await h.press('[data-looper-switch="record"]', 80); await h.run(1500); }],
  ["LOOPER, riproduzione con REVERSE e ½ SPEED", async (h) => {
    await h.press('[data-looper-switch="record"]', 80); await h.run(4000);
    await h.press('[data-looper-switch="reverse"]', 60); await h.run(300);
    await h.press('[data-looper-switch="half"]', 60); await h.run(300);
  }],
  ["LOOPER, CANCELLA in conferma", async (h) => { await h.click("#looper-erase"); await h.run(200); }],
  ["PALCO con il Looper attivo", async (h) => { await h.click('[data-view-button="live"]'); await h.run(300); }],
  ["ALTRO, collegato con registro e prova Transpose", async (h) => {
    await h.click('[data-view-button="full"]'); await h.run(300);
    await h.click("#transpose-probe-button"); await h.run(3500);
  }],
  ["ALTRO, guida aperta", async (h) => { await h.eval(() => { document.querySelector(".help-panel").open = true; }); await h.run(100); }],
  ["ALTRO, bidirezionale spenta", async (h) => { await h.click("#bidi-toggle"); await h.run(4000); }],
];

await scenario("Telefono in verticale", { width: 412, height: 915 }, percorso);
await scenario("Telefono in orizzontale", { width: 915, height: 412 }, percorso);
await scenario("Telefono piccolo (OPPO A9)", { width: 360, height: 800 }, percorso.slice(0, 13));

await browser.close();
for (const { server } of servers) server.close();

if (problems.length) {
  console.log(`✗ ${problems.length} differenze (${checked} stati confrontati). Le prime ${Math.min(MAX_REPORT, problems.length)}:`);
  for (const problem of problems.slice(0, MAX_REPORT)) console.log(`  - ${problem}`);
  console.log(`Tipi di differenza (${distinct.size}):`);
  for (const [kind, count] of [...distinct].sort((x, y) => y[1] - x[1]).slice(0, 40)) console.log(`  ${count}× ${kind}`);
  process.exit(1);
}
console.log(`✓ Stile identico: ${checked} stati confrontati (schede × temi × formati), ${elementsChecked} elementi con stile, ::before, ::after e posizione.`);
