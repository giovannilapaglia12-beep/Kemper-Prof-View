// Confronta due registrazioni di registra.mjs e mostra la prima differenza di ogni scenario.
// Uso:  node confronta.mjs <prima.json> <dopo.json> [--solo-midi | --schede]
// --solo-midi: confronta messaggi MIDI, memoria del telefono ed errori, non la pagina
// (per versioni che cambiano apposta la grafica ma non i comandi).
// --schede: come --solo-midi, più le schede PALCO, RIG, LOOPER, Tuner, griglia Bank e messaggi brevi
// (per versioni che cambiano solo ALTRO).
// Esce con codice 0 se sono identiche, 1 se differiscono.

import fs from "node:fs";

const [fileA, fileB] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const tabsOnly = process.argv.includes("--schede");
const midiOnly = tabsOnly || process.argv.includes("--solo-midi");
const a = JSON.parse(fs.readFileSync(fileA, "utf8")).scenarios;
const b = JSON.parse(fs.readFileSync(fileB, "utf8")).scenarios;

function firstDifference(x, y) {
  const length = Math.min(x.length, y.length);
  for (let i = 0; i < length; i += 1) if (x[i] !== y[i]) return i;
  return x.length === y.length ? -1 : length;
}

function around(text, index) {
  return JSON.stringify(text.slice(Math.max(0, index - 120), index + 120));
}

let differences = 0;
for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
  const stepsA = a[name] ?? [];
  const stepsB = b[name] ?? [];
  if (stepsA.length !== stepsB.length) {
    console.log(`✗ ${name}: numero di passi diverso (${stepsA.length} / ${stepsB.length})`);
    differences += 1;
    continue;
  }
  let ok = true;
  for (let i = 0; i < stepsA.length && ok; i += 1) {
    const sa = stepsA[i];
    const sb = stepsB[i];
    const where = `${name} · passo ${i} "${sa.step}"`;
    if (sb.errors.length) { console.log(`✗ ${where}: errori nella pagina: ${sb.errors.join(" | ")}`); ok = false; break; }
    const midi = firstDifference(sa.sent, sb.sent);
    if (midi >= 0) {
      console.log(`✗ ${where}: MIDI diverso al messaggio ${midi}\n   prima: ${sa.sent[midi]?.slice(0, 300)}\n   dopo:  ${sb.sent[midi]?.slice(0, 300)}`);
      ok = false; break;
    }
    const storageA = JSON.stringify(sa.storage);
    const storageB = JSON.stringify(sb.storage);
    if (storageA !== storageB) { console.log(`✗ ${where}: memoria del telefono diversa\n   prima: ${storageA}\n   dopo:  ${storageB}`); ok = false; break; }
    if (tabsOnly) {
      const selector = Object.keys(sa.parts ?? {}).find((key) => sa.parts[key] !== sb.parts?.[key]);
      if (selector) {
        const x = sa.parts[selector] ?? "";
        const y = sb.parts?.[selector] ?? "";
        const index = firstDifference([...x], [...y]);
        console.log(`✗ ${where}: ${selector} diverso al carattere ${index}\n   prima: ${around(x, index)}\n   dopo:  ${around(y, index)}`);
        ok = false; break;
      }
    }
    if (!midiOnly && sa.html !== sb.html) {
      const index = firstDifference([...sa.html], [...sb.html]);
      console.log(`✗ ${where}: pagina diversa al carattere ${index}\n   prima: ${around(sa.html, index)}\n   dopo:  ${around(sb.html, index)}`);
      ok = false; break;
    }
  }
  if (ok) console.log(`✓ ${name}: ${stepsA.length} passi identici${tabsOnly ? " (MIDI, memoria e schede)" : midiOnly ? " (MIDI e memoria)" : ""} (${stepsA.reduce((n, s) => n + s.sent.length, 0)} messaggi MIDI)`);
  else differences += 1;
}
process.exit(differences ? 1 : 0);
