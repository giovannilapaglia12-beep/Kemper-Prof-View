// Aiuti per i test (v1.60): leggono i moduli in dist/js/.
// I moduli con pagina e MIDI si provano "a pezzi": si prende il testo di alcune funzioni e lo si esegue
// in un contesto finto (vm), passando al posto degli altri moduli solo ciò che serve.
// I moduli di solo calcolo (kemper-midi.js, js/text.js) si importano direttamente.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(new URL(`../dist/${file}`, import.meta.url), 'utf8');

// Testo di un modulo senza "import" e senza la parola "export": eseguibile in vm.
export function plainSource(file) {
  return read(file)
    .replace(/^import[\s\S]*?from\s+"[^"]+";\n/gm, '')
    .replace(/^import\s+"[^"]+";\n/gm, '')
    .replace(/^export /gm, '');
}

// Pezzo di un modulo dall'inizio di `start` fino a `end` escluso (o alla fine del file).
export function snippet(file, start, end = null) {
  const source = plainSource(file);
  const from = source.indexOf(start);
  const to = end === null ? source.length : source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `In ${file} trovati "${start}" e "${end ?? 'fine del file'}"`);
  return source.slice(from, to);
}

export function source(file) {
  return read(file);
}

// Import di un modulo senza dipendenze (i .js di dist/ non sono moduli per Node senza package.json).
export async function importPure(file) {
  return import(`data:text/javascript,${encodeURIComponent(read(file))}`);
}
