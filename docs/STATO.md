# Kemper Profiler View (ex Kemper Stage View) – stato del progetto (29/09/2026)

> Copia nel repository della scheda di stato del progetto, così ogni sessione di Claude (anche le sessioni cloud collegate a GitHub) parte informata. Da aggiornare a ogni versione.

App web (PWA) per Kemper Profiler Player MK2 Level III, su telefono Android (OPPO Reno 12 Pro, OPPO A9 2020) via USB/OTG e Web MIDI in Chrome. Pubblicata con GitHub Pages da repository pubblico (cartella `dist`, workflow "Static HTML" con `path: 'dist'`). Versione attuale: **v1.63** (comprende v1.60 codice in moduli, v1.61 ALTRO senza doppioni + prova Leggi Transpose, v1.62 correzioni dopo la prova lunga, v1.63 grafica divisa per schermata). **Prova lunga sulla v1.52 fatta il 28/09/2026: stabile.** Prossimo passo di Giovanni: fare le checklist in `docs/TESTING.md`, con la prova Transpose.

Dalla v1.37 il nome è **Kemper Profiler View** (icona installata: "Profiler View"). Le chiavi di memoria del telefono restano `kemper-stage-view-…`, quindi nomi e impostazioni non si perdono. Rinominare il repository non è necessario; se lo si fa, cambia l'indirizzo Pages e l'app va reinstallata.

## Come arrivano le nuove versioni (dal 29/09/2026)
- Claude lavora collegato al repository GitHub (sessioni cloud di Claude Code): prepara la versione su un ramo e apre una **pull request**. Giovanni la unisce (Merge) da GitHub, anche dal telefono; il workflow Pages pubblica `dist/` da solo (Actions verde in 1–2 minuti).
- Regole per Claude: `CLAUDE.md` nella cartella principale.
- Prima (fino alla v1.61): ZIP scaricato e caricato a mano con Add file → Upload files (`dist/js/` con tutti i file, altrimenti l'app non parte).
- Sul telefono la nuova versione compare alla 2ª–3ª riapertura (ALTRO in alto).

## Prova lunga v1.52 — esito (28/09/2026, diagnostica 09:50)
- Giovanni: "sembra tutto stabile e funzionante".
- Diagnostica: app aperta ~1 h 07 min (collegata col bidirezionale ~1 h 03 min), schermo sempre acceso ok; 143.666 messaggi dal Player e solo 95 ridisegni; 65 richieste/min; nessun errore. Effetti, Fixed FX (16 comandi), Freeze (14), Looper (REC/OVERDUB, STOP, TRIGGER → PLAY a loop fermo ×3, REVERSE ×2, CANCELLA), Tuner (E2 A2 D3 G3…), Rig nella Bank 8 e 9 (6 cambi Rig: meno dei 20+ della checklist).
- Porte MS-1…MS-4 "dev-core" viste accanto al Profiler: ignorate correttamente dall'app.
- **2 falsi "bidirezionale persa"** rientrati in 7–15 ms: Giovanni era in un'altra app e ha risposto a una chiamata WhatsApp → corretto nella v1.62.
- **REVERSE**: l'app diceva ON ma registrando non lo era; Giovanni ha ritoccato REVERSE per rimetterlo a posto. Causa confermata: il Player era stato spento (torna a REVERSE/½ SPEED OFF, l'app li ricordava ON) → corretto nella v1.62.

## v1.62 – correzioni dopo la prova lunga
- **Bidirezionale**: al ritorno in primo piano (visibilità tornata o timer fermi > 1 s tra due controlli) 2 s di tolleranza prima di dichiarare "persa"; se il Player tace davvero, "persa" dopo i 2 s come prima. Diagnostica `bidirectional.resumesFromBackground`.
- **Looper**: REVERSE e ½ SPEED ripartono da OFF all'apertura se l'ultimo contatto col Player (chiave `kemper-stage-view-player-seen`, scritta al massimo ogni 30 s, la demo non conta) è più vecchio di 10 minuti o sconosciuto; messaggio breve "REVERSE e ½ SPEED azzerati: il Player era spento" e nota in LOOPER. "NON CORRISPONDE? INVERTI" resta.
- Verifica: prova registrata identica alla v1.61 (MIDI, memoria, schede; diagnostica con un campo in più); controllo nel browser del ripristino (20 min → OFF, 2 min → resta ON); avvio offline e aggiornamento ok. **Test: 40**.
- Checklist v1.62 in `docs/TESTING.md` (~5 min).

## Basi dal telefono attraverso il Player (scoperta di Giovanni, 28/09/2026)
- Dal telefono collegato via USB Giovanni può mandare le basi: l'audio esce dalle casse attraverso il Player (il Player fa da scheda audio USB).
- Consigli dati: "Non disturbare"/modalità aereo durante il servizio (anche l'audio di chiamate e notifiche può uscire dalle casse; l'app funziona anche offline); provare il livello; verificare se con Looper in posizione USCITA la base finisce nel loop (se sì, usare INGRESSO); base e chitarra probabilmente escono dagli stessi canali verso l'X32 — da verificare.
- Idea per la v2.0: la scaletta potrebbe anche far partire la base del brano. Solo idea, non decisa.

## Riordino del codice — piano concordato (28/09/2026)
Decisioni di Giovanni: prova lunga sulla v1.52 (fatta); ALTRO senza controlli doppi come v1.61; CSS riordinato per schermata come **v1.63**.

- **v1.60 – riordino del JavaScript: FATTO.** `app.js` da 3.961 a ~190 righe (solo pulsanti + avvio); moduli ES in `dist/js/`: config (versione, tempi, chiavi di memoria), dom, text (funzioni di solo calcolo), state, views, screen (messaggi → stato → schermata), connection, bidi, sync, rig, rig-names (nomi + AMP/CAB), effects, fixed-fx (+ Freeze), tempo, morph, tuner, looper, looper-touch, diagnostics, transpose-probe (20 file). `kemper-midi.js` e `demo.js` al loro posto.
  - **Prova registrata** (`tools/prova-registrata/`, Playwright + Player demo + orologio controllato): 4 situazioni (completa, senza bidirezionale, Player che non risponde al beacon, orizzontale); dopo ogni passo MIDI byte per byte + pagina intera + localStorage + errori + singole schede. `confronta.mjs` con `--solo-midi` / `--schede`.
  - Test: struttura (ogni file in cache `sw.js`, ogni import esiste, ogni id cercato è nella pagina, ogni `ui.x` definito in dom.js), bidirezionale, conferma cambio Rig, Tuner, prova Transpose, correzioni v1.62.
- **v1.61 – FATTO.** ALTRO: tolti RIG ATTUALE+BPM, Selezione diretta, Morph e Accordatore, Effetti del Rig, Fixed FX, Freeze, "Leggi parametri Looper". Restano: bidirezionale, Collega il Player (riga "RIG IN USO"), Prove sul Player (Leggi Transpose + Cancella nomi), Tema, Messaggi/diagnostica (Salva, Copia, Pulisci log), guida. Corretta la scritta del registro sempre visibile. `kemper-midi.js`: `buildMultiParameterRequest` (0x42) e parser 0x02 ("Kemper Multi Parameter").
- **v1.63 – FATTO.** `styles.css` (2.142 righe) diviso in `dist/css/`: base (variabili, pagina, barra schede, pulsanti comuni, toast), palco, rig, looper (anche indicatore Looper in PALCO), tuner, altro, tema-sole (solo differenze, caricato per ultimo); totale ~1.500 righe. Tolte 181 regole morte (classi/id assenti da HTML e JS, soprattutto pannelli tolti da ALTRO nella v1.61) e unite 15 regole doppie dove l'ordine non conta (30 gruppi lasciati separati perché l'ordine conta). Regole con selettori di schermate diverse → base.css.
  - Verifica: nuovo `tools/prova-registrata/stili.mjs` (stile calcolato + `::before`/`::after` + posizione di ogni elemento, 122 stati: schede, Tuner, griglia Bank, Looper, attese, guida; SCURO e SOLE; verticale 412×915, orizzontale 915×412, piccolo 360×800) identico alla v1.62 (82.508 elementi); prova registrata identica (MIDI, memoria, pagina salvo i `<link>`); avvio offline e aggiornamento da v1.62 ok. Test: 41 (nuovo: ogni css/ caricato, base primo, tema-sole ultimo).
  - Checklist v1.63 in `docs/TESTING.md` (~5 min, solo guardare).
- Per dopo la 2.0: tema SOLE con colori definiti una volta sola (variabili).

## Transpose −2…+2 del Fixed FX (richiesta di Giovanni, 28/09/2026)
- Giovanni vuole scegliere dall'app il transpose da −2 a +2 **del Fixed FX Transpose** (non il Rig Transpose).
- Deciso: il valore **resta uguale cambiando Rig** finché non lo cambia lui (vale per il brano); scritto sempre in PALCO (es. TRANSPOSE +2), 0 raggiungibile al volo; se il Player lo riporta al valore del Rig a ogni cambio, l'app lo reimposta. In futuro salvato per brano nella scaletta v2.0.
- Indirizzo dei semitoni del Fixed FX non pubblicato da Kemper (noto solo On/Off 5/1). Rig Transpose = 4/4, valori 28–100 (Burkhard, forum Kemper; probabile 64 = 0, da verificare).
- Prova di sola lettura "Leggi Transpose" (ALTRO, dalla v1.61): lettura multipla pagina 5 + 4/4, differenze tra letture con testo del Player. Procedura: Transpose 0 → leggi; +2 → leggi; −2 → leggi; cambia Rig e torna → leggi; salva diagnostica e manda a Claude.
- Dopo l'esito: comando −2…+2 nel riquadro Transpose di PALCO.

## Funzioni verificate sul Player
- Schermata PALCO senza scorrimento: nome Rig, Bank/Rig (colorato col colore della Bank), BPM (−1/+1/BPM INTERO/TAP), Morph, 8 effetti, Fixed FX, Freeze REV, Tuner. Schermo sempre acceso (anche nella prova lunga di ~1 h).
- Scheda RIG (grafica v1.38, approvata): Bank e nome Bank grandi, Rig in uso verde "IN USO"; nomi di Bank e slot ricevuti dal Player (SysEx 0x07) e ricordati. Nomi mancanti chiesti con 0x47.
- **125 Bank** (v1.48, provato 27/09 con Bank 10 e 14): cambio Rig con CC 0 = 0, CC 32 Bank Select = indice/128, Program Change = indice%128 (indice = (Bank−1)·5 + Rig−1). Scelta rapida con griglia ("BANK ▾"), "BANK MOSTRATE 1–N". Bank Select > 0 (dalla Bank 26 Rig 4) non ancora provato sul Player.
- **Colori delle Bank** (v1.48, approvati): 1 blu, 2 giallo, 3 rosso, 4 verde, 5 viola, poi si ripete.
- **AMP e CAB del Rig in uso** (v1.45–1.47): nome + NON PRESENTE / SPENTO / acceso. Stringhe 0x43 pagina 0 (0x10/0x15/0x18 ampli, 0x20/0x25/0x2A cabinet) e On/Off 10/2, 12/2.
- Riquadri effetti con i colori delle categorie come sul Kemper (v1.40, approvati). Fixed FX: Pure Booster rosso, Vintage Chorus blu, Transpose bianco, Double Tracker giallo.
- Morph con i colori del Kemper (v1.40): rosso in BASE, blu con Morph pieno. Attivazione del Morph dall'app funzionante — per Giovanni è la cosa importante sul Morph.
- Accordatore a tutto schermo; schermo verde quando centrata.
- Looper: REC/PLAY/OVERDUB, STOP, UNDO, REVERSE, TRIGGER, CANCELLA, stato stimato, ½ SPEED e REVERSE ricordati (dalla v1.62 azzerati se il Player è stato spento), aggancio al tempo; posizione INGRESSO/USCITA; cerchio di avanzamento. **TRIGGER a loop fermo** (l'app invia PLAY) **funziona**.
- Nuova icona e tema SOLE: approvati da Giovanni (27/09/2026).
- Diagnostica salvabile come file .json (ALTRO → Salva diagnostica).
- **Modalità bidirezionale**: beacon `F0 00 20 33 02 7F 7E 00 40 02 03 0F F7`, rinnovo ogni 12 s; sensing `7E 00 7F` ~2/s; il Player invia da solo i parametri usati dall'app e conferma i comandi in ~25 ms.

## Bug Kemper Freeze + Fixed FX — segnalato
- Con REV Freeze attivo, la prima attivazione di un Fixed FX interrompe il suono congelato (anche da Player e Rig Manager).
- Kemper (28/09/2026): comportamento dovuto al progetto; i Fixed FX sono pensati per restare accesi. Rimedio confermato da Giovanni: accendere e spegnere una volta i Fixed FX e **salvare il Rig**.

## Pallini Morph — chiuso (27/09/2026)
- Dal MIDI non si può sapere quali effetti hanno il Morph (valori identici in BASE e MORPH; 0x48 non esiste).

## Ancora da provare
- Bank oltre la 26 (Bank Select 1–4).
- Più cambi Rig di fila (nella prova lunga solo 6).
- Checklist v1.61 + v1.62 in `docs/TESTING.md`, con la prova Leggi Transpose.

## Uscita audio verso il mixer
- Player → Behringer X32. Main Output XLR: dal firmware 12.1 può essere stereo (non bilanciata) con cavo a Y XLR → due canali dell'X32; in stereo non usare un solo canale mono. Alternativa bilanciata: uscite Monitor TRS.

## Scoperte sul Player
- Lo stato del Looper non è leggibile (125/88…94 rispondono sempre 0).
- ½ SPEED e REVERSE restano attivi anche dopo la cancellazione del loop; **spegnendo il Player tornano OFF** (28/09). Tre STOP non cancellano il loop.
- TRIGGER: a loop fermo suona solo tenuto premuto; mentre suona fa ripartire dall'inizio.
- Cambiando Bank dall'app il Player invia da solo solo nome Bank + uno slot (l'app chiede gli altri con 0x47).
- Bank del Player di Giovanni: 1, 2, 3 "Bank 6" (copie); 5 "TJ - Make Room"; 8 "RT FIRESPIT (Blue)"; 9 "RT FIRESPIT"; 10 "Bank10"; 14 "New Performance".
- Rig senza cabinet (profili DI): stringhe cabinet "N/A" e Cabinet On/Off 12/2 = 0.
- Il Player invia `B0 00 00`, `B0 20 nn` (Bank Select) prima di ogni Program Change.
- Richiesta multipla 0x42 `F0 00 20 33 02 7F 42 00 <pagina> 00 F7` → un 0x02 con 110 valori della pagina (231 byte). 0x48 non esiste sul Player.
- I valori letti (0x01 e 0x02) sono quelli memorizzati del Rig, identici in BASE e MORPH.
- In modalità bidirezionale circa 40 messaggi al secondo (nota/intonazione del Tuner anche con Tuner chiuso).
- In secondo piano (altra app, chiamata) Chrome trattiene i messaggi MIDI e li consegna al ritorno (28/09).
- Tuner: 124/15 e 124/81 stessa scala (centro 8192, ~82 unità per cent); nota 0 senza segnale.

## Strada verso la 2.0 (concordata il 26/09/2026)
1. v1.4x: grafica, nomi Bank, AMP/CAB, 125 Bank e colori, Looper più sicuro — fatto (v1.41–1.52).
2. **Prova lunga** sulla v1.52 — **fatta 28/09/2026, stabile**; correzioni nella v1.62.
3. **Riordino del codice**: v1.60 (JS), v1.61 (ALTRO + prova Transpose), v1.62 correzioni — fatti; v1.63 CSS. Poi Transpose −2…+2 dopo l'esito della prova sul Player.
4. **v2.0 "pronta per il servizio"**: scaletta del servizio (brani con Bank/Rig, BPM, note, transpose; avanti/indietro con un tocco; BPM impostato da solo; forse anche la base del brano), affidabilità dimostrata, guida d'uso di una pagina.
5. Dopo la 2.0: pedale MIDI Bluetooth.

## Idee per dopo
- Compensazione della latenza per l'aggancio al tempo, se servisse.
- Pallini Morph segnati a mano (rinviati da Giovanni).
- Tema SOLE con variabili di colore (dopo la 2.0).
- Basi del brano avviate dalla scaletta (v2.0).
