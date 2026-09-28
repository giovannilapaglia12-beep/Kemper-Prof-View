# Prova registrata (v1.60)

Serve a dimostrare che un riordino del codice **non cambia il comportamento** dell'app.

`registra.mjs` apre l'app in Chrome automatico con il Player DEMO e un orologio controllato: il tempo avanza solo quando lo dice la prova, e il caso è ripetibile. Esegue una sequenza fissa di tocchi in 4 situazioni:

- sequenza completa di 65 passi;
- senza bidirezionale;
- Player che non risponde al beacon;
- telefono in orizzontale.

Dopo ogni passo salva i messaggi MIDI inviati (byte per byte), la pagina intera, la memoria del telefono e gli eventuali errori. Salva anche il file della diagnostica.

`confronta.mjs` confronta due registrazioni e mostra la prima differenza. Con `--solo-midi` ignora la pagina, con `--schede` confronta anche PALCO, RIG, LOOPER, Tuner, griglia Bank e messaggi brevi, ma non ALTRO.

## Uso

Serve Node.js 20+ e il pacchetto Playwright con Chromium. Non serve per usare l'app né per `node --test`.

```bash
cd tools/prova-registrata
npm install playwright
npx playwright install chromium
node registra.mjs ../../dist prima.json      # sulla versione di riferimento
# … modifiche al codice …
node registra.mjs ../../dist dopo.json
node confronta.mjs prima.json dopo.json      # ✓ identici / ✗ prima differenza
```

La versione dell'app compare nella diagnostica e nella pagina. Per confrontare due versioni diverse, rimetti temporaneamente la stessa `APP_VERSION` in `js/config.js` e lo stesso numero in `index.html`.

## Esito v1.60

La v1.60 (codice diviso in `dist/js/`), con il numero di versione riportato a 1.52, è identica alla v1.52 in tutte e 4 le situazioni: 88 passi e 1.698 messaggi MIDI.

## Esito v1.61

Rispetto alla versione precedente, con ALTRO ancora completa e la stessa sequenza di passi (i passi sui controlli tolti da ALTRO sono stati sostituiti dalla prova Leggi Transpose), il confronto `--schede` è identico. Le uniche differenze sono volute: nella diagnostica non c'è più `looper.probeResults`, e dal riquadro REV è tolta la frase "pressione lunga per cambiare Freeze".

