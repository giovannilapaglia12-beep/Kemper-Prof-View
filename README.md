# Kemper Stage View v1.31

Web app/PWA in italiano per **Kemper Profiler Player MK2, Level III**, con Web MIDI e SysEx.

## Novità v1.31 (dopo la prova sul Player del 25/09/2026)

- **Stato del Looper visibile**: REGISTRAZIONE (rosso lampeggiante, con secondi), RIPRODUZIONE, OVERDUB, FERMO, LOOP VUOTO; durata del loop e indicatori REVERSE / ½ SPEED. È uno **stato stimato** dall'app in base ai comandi inviati secondo la logica Kemper (il Player non lo comunica); pulsante SEGNA COME VUOTO per riallinearlo. Sulla schermata PALCO compare un indicatore del loop che porta alla scheda LOOPER.
- **CANCELLA LOOP**: ora si conferma con un secondo tocco (niente pressione lunga, che su Android poteva annullarsi) e invia sia il comando Erase (NRPN 125/94) sia STOP tenuto premuto 2,2 s, come indicato nel manuale Kemper.
- **Nomi dei Rig ricordati** sul telefono: una volta visto, il nome resta nella scheda RIG anche dopo il riavvio dell'app.
- **Orizzontale**: nomi degli effetti più piccoli per restare nei riquadri.
- **Diagnostica su file**: ALTRO → "Salva diagnostica (file)" salva un .json nei Download, da allegare in chat (la copia negli appunti poteva essere tagliata).

## Novità v1.30

- **Schermata PALCO** (ex LIVE): tutto in una schermata senza scorrere, provata a 360×760 (OPPO A9 2020) e 412×880 (OPPO Reno 12 Pro), anche in orizzontale. Nome del Rig grande, Bank/Rig, BPM con −1/+1/BPM INTERO/TAP, Morph su una riga, gli 8 effetti 4×2, Fixed FX + Freeze + Tuner 3×2.
- **Scheda RIG**: scelta Bank e Rig spostata in una scheda dedicata; dopo la conferma del Kemper l'app torna da sola a PALCO.
- **Accordatore a tutto schermo** quando il Player è in modalità Tuner (nota grande, lancetta, CENTRATA in verde, pulsante CHIUDI TUNER).
- **Schermo sempre acceso** (Screen Wake Lock) dopo Connetti MIDI; riattivato quando l'app torna in primo piano.
- Messaggi brevi in alto, così non coprono i pulsanti; rimosso il messaggio automatico "REV Hold rilevato".
- **Modalità demo** (pulsante "Prova senza Player"): un Kemper simulato in `dist/demo.js` per provare l'interfaccia senza il Player; nessun messaggio va a dispositivi reali.
- La vista COMPLETA si chiama ora **ALTRO**. Logica MIDI invariata rispetto alla v1.29.

## Funzioni ereditate dalla v1.29

La vista PALCO mostra gli otto moduli A, B, C, D, X, MOD, DLY, REV, i quattro fixed FX, Freeze REV, Tuner, TAP, selezione Bank/Rig, tempo ±1 e arrotondamento, e Morph con pulsante BASE/MORPH e livello regolabile. La vista LOOPER offre REC/PLAY/OVERDUB, STOP, TRIGGER, REVERSE, HALF SPEED, UNDO/REDO e cancellazione con pressione lunga. La vista COMPLETA comprende diagnostica e controlli dettagliati.

**URL del Site originale:** <https://kemper-stage-view.giovannilapaglia.chatgpt.site>. Il file visibile `configurazione-sites/hosting.json` conserva il project ID originale; per una futura pubblicazione Sites va copiato nel percorso `.openai/hosting.json`. Un repository GitHub importato da questo archivio non aggiorna automaticamente il Site.

## Stato delle verifiche

- La v1.30 cambia solo interfaccia, accordatore a schermo intero e wake lock; i messaggi MIDI trasmessi sono identici alla v1.29. Il codice v1.29 era completo e passa le verifiche locali di sintassi e sei test MIDI automatici (`node --test tests/midi.test.mjs`). Il Looper è implementato con comandi MIDI momentanei e la UI indica soltanto il comando inviato: **non riceve uno stato confermato del loop**.
- I log v1.26/v1.28 forniti dall'utente confermano scambi reali col Player per lettura Rig, BPM, moduli, vari fixed FX, Freeze REV, TAP e Program Change. Non sono una verifica hardware di v1.29.
- La risposta sonora del Looper sul Player Level III, il livello Morph intermedio, la gestione hotplug e il precedente problema audio Freeze → Vintage Chorus **richiedono ancora prova diretta sul dispositivo**. Dettagli in [`docs/TESTING.md`](docs/TESTING.md). Il codice pronto per il test non equivale a una funzione già verificata sul Player.

## Struttura completa

| File | Ruolo |
| --- | --- |
| `dist/index.html` | Tre viste e controlli |
| `dist/styles.css` | Layout responsive |
| `dist/app.js` | UI, gestione porte, azioni MIDI, polling, diagnostica |
| `dist/demo.js` | Kemper simulato per la modalità demo |
| `dist/kemper-midi.js` | Parser MIDI/SysEx, mapping effetti, costruttori di messaggi |
| `dist/manifest.webmanifest` | PWA |
| `dist/sw.js` | Service worker e cache offline |
| `dist/icon.svg` | Icona SVG |
| `configurazione-sites/hosting.json` | Copia visibile della configurazione Site originale (directory `dist`) |
| `gitignore.txt` | Regole Git visibili; per usarle come esclusioni Git, rinominare in `.gitignore` |
| `tests/midi.test.mjs` | Prove locali per parser, Morph, Looper, tempo e Program Change |
| `docs/MIDI.md` | Tabella dei comandi e codici esadecimali |
| `docs/TESTING.md` | Prove hardware, limiti e problemi aperti |
| `docs/GITHUB.md` | Guida all'importazione su GitHub e ripristino dei nomi tecnici |

Non ci sono dipendenze npm, backend, chiavi né file generati da una build. Nessun file sorgente è abbreviato.

## Avvio locale

```bash
python3 -m http.server 8000 --directory dist
```

Aprire <http://localhost:8000/> in un browser Web MIDI compatibile, con il Kemper connesso e permesso SysEx autorizzato. Usare `localhost` o HTTPS; non `file://`. Per eseguire i test: `node --test tests/midi.test.mjs` (Node.js moderno).

**Controlli Looper:** i pulsanti sono momentanei, quindi inviano PRESS quando vengono premuti e RELEASE al rilascio, anche al cambio vista/perdita del focus. CANCELLA LOOP richiede un secondo di pressione; l'accessibilità via click richiede una conferma. Queste scelte d'interazione vanno provate con il Player prima dell'uso sul palco.

## Licenza

Non è stata scelta una licenza open source. Prima di pubblicare il repository al pubblico, decidere se aggiungere `LICENSE`; in mancanza, i diritti sul codice restano riservati.
