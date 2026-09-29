# Kemper Profiler View — istruzioni per Claude

Web app (PWA) in italiano per **Kemper Profiler Player MK2 Level III**, usata da Giovanni sul telefono Android
(OPPO Reno 12 Pro, OPPO A9 2020) via USB/OTG e Web MIDI in Chrome, durante i servizi in chiesa.
Pubblicata con GitHub Pages: il workflow `.github/workflows/static.yml` pubblica la cartella `dist/` a ogni push su `main`.

**Leggi sempre prima `docs/STATO.md`** (stato del progetto, decisioni, scoperte sul Player) e, per il protocollo, `docs/MIDI.md`.
Giovanni non è un programmatore: rispondigli in italiano semplice, senza gergo, e digli cosa deve provare sul Player.

## Struttura
- `dist/index.html`, `dist/styles.css`, `dist/app.js` (solo pulsanti e avvio), `dist/js/*.js` (moduli per argomento),
  `dist/kemper-midi.js` (protocollo, funzioni pure), `dist/demo.js` (Player simulato), `dist/sw.js` (cache offline).
- Nessuno strumento di compilazione: i file di `dist/` sono pubblicati così come sono (moduli ES standard).
- Test: `node --test` dalla cartella principale (Node 20+, nessuna dipendenza).
- Prova registrata prima/dopo: `tools/prova-registrata/` (richiede `npm install playwright`; vedi il suo README).

## Regole (non derogare senza chiedere a Giovanni)
1. **Chiavi di memoria del telefono**: restano `kemper-stage-view-…` (in `dist/js/config.js`). Non rinominarle: si perderebbero nomi e impostazioni.
2. **Cache offline**: ogni file in `dist/` deve essere nell'elenco `ASSETS` di `dist/sw.js` (lo controlla `tests/struttura.test.mjs`). Senza rete l'app deve partire.
3. **A ogni nuova versione**: `APP_VERSION` in `dist/js/config.js`, `KEMPER DIRECT · vX.YY` in `dist/index.html`, `CACHE` in `dist/sw.js` (es. `kemper-profiler-view-v1630`), sezione "Novità" in `README.md`, checklist per il Player in `docs/TESTING.md`, aggiornamento di `docs/STATO.md`.
4. **Riordini "senza modifiche visibili"** (spostare codice, CSS): solo spostare, niente riscritture; dimostrarlo con la prova registrata (`registra.mjs` prima e dopo, `confronta.mjs`). Non mescolare riordini e cambi di comportamento nella stessa versione.
5. **Prima di consegnare**: `node --test` tutto verde; se cambia il comportamento, test nuovi che falliscono senza la modifica.
6. **Sicurezza sul palco**: niente che possa inviare comandi al Player senza un tocco dell'utente; le prove sul Player sono "sola lettura" finché non sono verificate. Ogni comando aspetta la conferma del Player.
7. **Il Player non comunica lo stato del Looper**: l'app lo stima. Non presentare stime come certezze.
8. Codice e commenti in italiano, come il resto del progetto; commenti brevi che spiegano il perché (con la data della prova sul Player, se c'è).

## Consegna
Lavora su un ramo, poi apri una pull request verso `main` con un riassunto in italiano semplice: cosa cambia per Giovanni,
cosa è stato verificato, cosa deve provare sul Player. Giovanni la unisce da GitHub; Pages pubblica da solo.
