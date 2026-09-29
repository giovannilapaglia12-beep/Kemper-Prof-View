# Prova registrata (v1.60) e confronto dello stile (v1.63)

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

## Stile di ogni elemento (`stili.mjs`, v1.63)

Serve quando si riordina la grafica (i file `.css`). Apre le due versioni una accanto all'altra con il Player DEMO e lo stesso orologio controllato, le porta negli stessi stati (4 schede, Tuner aperto e chiuso, griglia Bank, Looper in registrazione, REVERSE e ½ SPEED, effetto in attesa, guida aperta, bidirezionale spento…), ognuno con tema SCURO e SOLE, in tre formati di telefono (verticale 412×915, orizzontale 915×412, piccolo 360×800 come l'OPPO A9). In ogni stato confronta lo stile calcolato di ogni elemento, anche `::before` e `::after`, e la sua posizione.

```bash
node stili.mjs <cartella dist di prima> <cartella dist di dopo>   # circa 5 minuti
```

Stampa `✓ Stile identico` oppure le prime differenze e un riassunto per tipo.

## Esito v1.60

La v1.60 (codice diviso in `dist/js/`), con il numero di versione riportato a 1.52, è identica alla v1.52 in tutte e 4 le situazioni: 88 passi e 1.698 messaggi MIDI.

## Esito v1.61

Rispetto alla versione precedente, con ALTRO ancora completa e la stessa sequenza di passi (i passi sui controlli tolti da ALTRO sono stati sostituiti dalla prova Leggi Transpose), il confronto `--schede` è identico. Le uniche differenze sono volute: nella diagnostica non c'è più `looper.probeResults`, e dal riquadro REV è tolta la frase "pressione lunga per cambiare Freeze".


## Esito v1.63

`styles.css` diviso in `dist/css/`: `stili.mjs` identico alla v1.62 in 122 stati (82.508 elementi). Prova registrata identica (829 + 452 + 280 + 93 messaggi MIDI); nella pagina cambiano solo le righe `<link>` dei file di grafica.
