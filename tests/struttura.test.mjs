// Controlli sulla struttura dei file (v1.60, riordino del codice in moduli).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, dist), 'utf8');

function cachedAssets() {
  const match = read('sw.js').match(/const ASSETS = (\[[^\]]*\]);/);
  assert.ok(match, 'Elenco ASSETS trovato in sw.js');
  return new Set(JSON.parse(match[1]).map((asset) => path.posix.normalize(asset.replace(/^\.\//, ''))));
}

function listFiles(dir, prefix = '') {
  return fs.readdirSync(new URL(dir, dist), { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix + entry.name;
    return entry.isDirectory() ? listFiles(`${dir}${entry.name}/`, `${rel}/`) : [rel];
  });
}

// Tutti gli import (statici e dinamici) di un file JavaScript, come percorsi relativi a dist/.
function importsOf(file) {
  const source = read(file);
  const found = [];
  for (const match of source.matchAll(/(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\s*\(?\s*["']([^"']+)["']/g)) {
    const spec = match[1] ?? match[2];
    if (spec.startsWith('.')) found.push(path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)));
  }
  return found;
}

test('Ogni file dell\'app è nella cache offline di sw.js (senza rete l\'app deve partire lo stesso)', () => {
  const assets = cachedAssets();
  const files = listFiles('').filter((file) => file !== 'sw.js');
  const missing = files.filter((file) => !assets.has(file));
  assert.deepEqual(missing, [], `File mancanti da ASSETS in sw.js: ${missing.join(', ')}`);
  const ghosts = [...assets].filter((asset) => asset !== '.' && !files.includes(asset));
  assert.deepEqual(ghosts, [], `ASSETS in sw.js cita file che non esistono: ${ghosts.join(', ')}`);
});

test('Ogni import punta a un file esistente e in cache', () => {
  const assets = cachedAssets();
  const jsFiles = listFiles('').filter((file) => file.endsWith('.js') && file !== 'sw.js');
  for (const file of jsFiles) {
    for (const target of importsOf(file)) {
      assert.ok(fs.existsSync(new URL(target, dist)), `${file} importa ${target}, che non esiste`);
      assert.ok(assets.has(target), `${file} importa ${target}, che non è nella cache di sw.js`);
    }
  }
});

test('Ogni id cercato dal codice esiste in index.html', () => {
  const html = read('index.html');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const jsFiles = listFiles('').filter((file) => file.endsWith('.js') && file !== 'sw.js' && file !== 'demo.js');
  const missing = [];
  for (const file of jsFiles) {
    for (const match of read(file).matchAll(/(?:\$|querySelector|getElementById)\(\s*["']#?([A-Za-z][\w-]*)["']\s*\)/g)) {
      const raw = match[0];
      if (!raw.includes('#') && !raw.startsWith('getElementById')) continue;
      if (!ids.has(match[1])) missing.push(`${file}: #${match[1]}`);
    }
  }
  assert.deepEqual(missing, [], `Id non trovati in index.html: ${missing.join(', ')}`);
});

test('Ogni ui.<nome> usato nel codice è definito in js/dom.js (v1.61: pannelli tolti da ALTRO)', () => {
  const dom = read('js/dom.js');
  const block = dom.slice(dom.indexOf('const ui = {'), dom.indexOf('\n};', dom.indexOf('const ui = {')));
  const defined = new Set([...block.matchAll(/^\s{2}(\w+):/gm)].map((match) => match[1]));
  const jsFiles = listFiles('').filter((file) => file.endsWith('.js') && file !== 'sw.js');
  const missing = [];
  for (const file of jsFiles) {
    for (const match of read(file).matchAll(/\bui\.(\w+)/g)) {
      if (!defined.has(match[1])) missing.push(`${file}: ui.${match[1]}`);
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test('Ogni file di grafica in css/ è caricato da index.html; base.css per primo e tema-sole.css per ultimo (v1.63)', () => {
  const html = read('index.html');
  const linked = [...html.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"/g)].map((match) => match[1]);
  const files = listFiles('css/', 'css/').filter((file) => file.endsWith('.css'));
  assert.deepEqual([...linked].sort(), [...files].sort(), 'File .css caricati da index.html diversi da quelli in dist/css/');
  // Il tema SOLE contiene solo le differenze dal tema SCURO: deve venire dopo tutto il resto.
  assert.equal(linked[0], 'css/base.css');
  assert.equal(linked.at(-1), 'css/tema-sole.css');
});
