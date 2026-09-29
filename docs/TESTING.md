# Verifiche hardware, test locali e problemi aperti — v1.66

## Da provare con la v1.66 (circa 3 minuti, volume basso)

- [ ] **Aggiornamento**: in alto in ALTRO compare **v1.66**.
- [ ] **±** → **+2**: la corda suona un tono sopra.
- [ ] **Cambia Rig**: nessun salto di tonalità dopo il cambio; il nuovo Rig suona normale e il riquadro mostra **Transpose +2 · OFF**.
- [ ] **Un tocco sul riquadro**: torna **+2 ON**.
- [ ] Rifallo 2–3 volte, anche col footswitch del Player.

## Esito prova v1.65 (29/09/2026, diagnostica 13:39)

- ON/OFF col tocco e ± ok. Al cambio Rig l'app rimandava il Transpose 20 ms dopo, ma il passaggio di tonalità si sentiva comunque (è il Player che carica il Rig) → v1.66: nessun invio automatico, valore ricordato e riacceso con un tocco (scelta di Giovanni).

## Da provare con la v1.65 — Transpose ON/OFF e cambio Rig (circa 5 minuti, volume basso)

- [ ] **Aggiornamento**: in alto in ALTRO compare **v1.65**.
- [ ] **±**: il pulsante **±** in basso a destra del riquadro Transpose apre la fila −2 … +2. Scegli **+2**: la corda suona un tono sopra.
- [ ] **ON/OFF**: tocca il riquadro (non il ±): si spegne, mostra **Transpose +2 · OFF** e la corda suona normale. Toccalo di nuovo: torna **+2 ON**.
- [ ] **Cambio Rig con Transpose acceso**: cambia Rig 4–5 volte (dall'app e dal footswitch). Ascolta se si sente ancora il salto a 0 e quanto dura (prima circa 1 s). Annota.
- [ ] **Cambio Rig con Transpose spento**: spegnilo col tocco e cambia Rig: resta spento, nessun salto.
- [ ] **Salva diagnostica** e mandala.

## Esito prova v1.64 (29/09/2026, diagnostica 09:55)

- Scelta −2…+2 e conferme ok (11 comandi, tutti confermati in circa 0,8 s). Mancava l'ON/OFF col tocco → v1.65.
- Cambio Rig: il Player riporta il Transpose a 0, l'app lo rimetteva 1,2 s dopo (attesa di 1 s + lettura): si sentiva il Rig a 0 per circa un secondo → v1.65 lo rimanda subito.

## Da provare con la v1.64 — Transpose da −2 a +2 in PALCO (circa 10 minuti)

È la prima volta che l'app **scrive** il Transpose: prova a volume basso, con il Player collegato (⇄) e un Rig salvato senza Transpose. Il riquadro del Transpose è quello bianco in basso in PALCO.

- [ ] **Aggiornamento**: in alto in ALTRO compare **v1.64** (alla 2ª–3ª riapertura).
- [ ] **Si legge**: il riquadro mostra **Transpose 0** e OFF. Sul Player porta il Transpose a +2: entro qualche secondo l'app mostra **Transpose +2** e ON. Rimettilo a 0 sul Player.
- [ ] **Si apre e si chiude**: tocca il riquadro → compare la fila **−2 −1 0 +1 +2 ✕** sopra i riquadri in basso. Tocca **✕**: si chiude e non cambia nulla.
- [ ] **+2 dall'app**: tocca il riquadro → **+2**. Per un attimo ATTENDO KEMPER, poi **Transpose +2** ON (riquadro bianco). Suona una corda a vuoto: deve suonare **un tono sopra**. Guarda il Player: deve indicare Transpose acceso a +2.
- [ ] **−1 e −2**: scegli −1, poi −2; ogni volta il riquadro mostra il valore e la corda scende.
- [ ] **0 al volo**: tocca il riquadro → **0**. Il riquadro torna OFF e la corda suona normale.
- [ ] **Resta cambiando Rig**: scegli **+2**, poi cambia Rig dalla scheda RIG (anche in un'altra Bank). Dopo circa un secondo compare **"Transpose +2 rimesso dopo il cambio Rig"** e il riquadro mostra +2; la corda suona un tono sopra. Rifallo 3–4 volte, e una volta cambiando Rig **dal Player** (footswitch).
- [ ] **Cambiato sul Player**: con +2 scelto dall'app, cambia il Transpose **sul Player** (per esempio a 0). L'app mostra 0; cambiando Rig l'app **non** rimette +2.
- [ ] **Con REV Freeze**: attiva Freeze su un suono, poi scegli +1. Annota se il suono congelato si interrompe (è il problema Kemper già noto dei Fixed FX).
- [ ] **Leggi Transpose** (ALTRO) con +2 scelto dall'app: la riga deve dire **Rig Transpose 4/4 = 66**.
- [ ] **Salva diagnostica** e mandala a Claude (contiene `transposeControl`).

Attenzione: se **salvi il Rig sul Player** mentre è trasposto, il Rig resterà trasposto anche le volte successive. Prima di salvare, rimetti 0.

## Da provare con la v1.63 (solo un colpo d'occhio, circa 5 minuti; si può fare insieme alla v1.64)

La v1.63 cambia solo come è organizzata la grafica: sullo schermo deve essere **tutto uguale** alla v1.62. Basta guardare.

- [ ] **Aggiornamento**: in alto in ALTRO compare **v1.63** (alla 2ª–3ª riapertura). Se la pagina appare senza colori o tutta bianca, chiudi e riapri l'app ancora una volta; se resta così, salva la diagnostica e avvisami.
- [ ] **PALCO, tema SCURO**: nome del Rig, BPM e TAP, Morph, 8 effetti con i loro colori, Fixed FX, REV, pulsante Tuner come prima; niente scorrimento.
- [ ] **RIG**: Bank con il suo colore, Rig IN USO verde, griglia "BANK ▾" che si apre e si chiude.
- [ ] **LOOPER**: pulsanti, cerchio di avanzamento, REVERSE e ½ SPEED come prima.
- [ ] **Tuner**: si apre a tutto schermo, diventa verde quando la corda è intonata.
- [ ] **ALTRO**: riquadri, messaggi e guida come prima.
- [ ] **Tema SOLE**: cambialo in ALTRO e ripassa velocemente PALCO, RIG, LOOPER e Tuner. Poi rimetti il tema che usi.
- [ ] **Telefono in orizzontale**: PALCO come prima.
- [ ] **Senza rete** (modalità aereo): l'app si apre lo stesso, con la grafica completa.

## Da provare con la v1.62 (comprende v1.60 e v1.61; circa 5 minuti in più)

Se non hai ancora provato la v1.61, fai prima le sue prove qui sotto (cerca **v1.62** nella voce Aggiornamento).

- [ ] **Ritorno all'app**: con il collegamento ⇄ attivo, passa a un'altra app (WhatsApp, lettore delle basi) per almeno 20 secondi, poi torna. Non deve comparire "Collegamento bidirezionale perso" e ⇄ resta acceso.
- [ ] **REVERSE dopo il Player spento**: nella scheda LOOPER accendi REVERSE (l'app mostra REVERSE: ON). Chiudi l'app, spegni il Player e aspetta più di 10 minuti. Riaccendi il Player e riapri l'app: compare "REVERSE e ½ SPEED azzerati" e la scheda mostra REVERSE: OFF. Registra un loop breve: suona normale.
- [ ] **REVERSE senza spegnere**: accendi REVERSE, chiudi e riapri l'app entro pochi minuti con il Player acceso: REVERSE resta ON (come sul Player).

## Esito prova "Leggi Transpose" (29/09/2026, app ancora v1.62)

- Transpose 0 → 4/4 = 64 e 5/1 spento; +2 → 4/4 = 66 e 5/1 acceso; −2 → 4/4 = 62 e 5/1 acceso; cambio Rig → spento e 64. I semitoni sono il parametro 4/4: usato dalla v1.64 (dettagli in `docs/MIDI.md`).
- Nella stessa mattina: 11 cambi Rig, anche **Bank 27** (Bank Select 1): confermata dal Player con il nome del Rig. Nessuna perdita del bidirezionale; 55.796 messaggi e 130 ridisegni.

## Esito prova lunga v1.52 (28/09/2026)

- Stabile: circa 1 h collegata con il bidirezionale, schermo sempre acceso, nessun errore, 143.666 messaggi e 95 ridisegni. 6 cambi Rig, Looper, Freeze, Fixed FX, Tuner.
- Due falsi "bidirezionale persa" rientrati subito, dopo una chiamata WhatsApp → corretto nella v1.62.
- REVERSE indicato ON ma il Player registrava normale (Player spento dalla sera prima) → corretto nella v1.62.


## Da provare con la v1.61 (comprende la v1.60; circa 20 minuti, dopo la prova lunga sulla v1.52)

Prima la checklist v1.60 qui sotto: controlla che il codice diviso in file funzioni sul Player. Nella voce **Aggiornamento** cerca **v1.61** invece di v1.60. Poi:

- [ ] **ALTRO**: in ordine bidirezionale, Collega il Player (con la riga RIG IN USO), Prove sul Player, Tema, Messaggi ricevuti, guida. Nessun pannello doppio. Nel registro la scritta "Cambia Rig o premi un footswitch…" sparisce appena arrivano messaggi.
- [ ] **Leggi Transpose**, sola lettura, circa 2 minuti:
  1. Sul Player porta il Transpose (Fixed FX) a 0 → ALTRO → **Leggi Transpose**. Aspetta la riga "Lettura 1 · … valori salvati".
  2. Sul Player imposta il Transpose a **+2** → tocca di nuovo. Annota cosa scrive l'app ("cambiati rispetto alla lettura 1: …").
  3. Imposta **−2** → tocca di nuovo.
  4. Lascia −2 e **cambia Rig**, poi torna al Rig di prima → tocca di nuovo. Così si vede se il Transpose resta o torna a 0.
  5. **Salva diagnostica** e mandala a Claude, con una foto o il testo delle righe mostrate.
  - Se il Transpose del Fixed FX è spento, prova anche con il Transpose **acceso** (e annota se il suono cambia).


## Da provare con la v1.60 (circa 15 minuti, dopo la prova lunga sulla v1.52)

La v1.60 non cambia nulla di visibile: il codice è solo diviso in più file. La prova registrata (`tools/prova-registrata/`) dà gli stessi messaggi MIDI della v1.52. Sul Player si controllano i punti in cui un riordino potrebbe sbagliare: file mancanti, avvio, collegamento.

- [ ] **Aggiornamento**: apri l'app, chiudila e riaprila finché in ALTRO in alto compare **v1.60** (di solito alla 2ª–3ª riapertura: le prime mostrano ancora la v1.52 mentre il telefono scarica la nuova).
- [ ] **Senza rete**: modalità aereo, chiudi e riapri l'app. Si apre normalmente, senza pagina bianca. Poi togli la modalità aereo.
- [ ] **Nomi e impostazioni ricordati**: nomi delle Bank e dei Rig, tema, BANK MOSTRATE, ½ SPEED/REVERSE e aggancio al tempo sono come prima.
- [ ] **Collegamento**: cavo → COLLEGATO ⇄ (bidirezionale) in pochi secondi.
- [ ] **RIG**: cambia Rig 2–3 volte, anche cambiando Bank. Si carica; torna a PALCO; nome, AMP/CAB e colore della Bank sono giusti.
- [ ] **PALCO**: accendi e spegni 2 effetti, un Fixed FX, Freeze; BPM +1, TAP; Morph on/off; apri e chiudi il Tuner.
- [ ] **LOOPER**: REC → REC → STOP → TRIGGER (riparte); un tocco su REVERSE (parte) e una scrollata sopra REVERSE (non parte); CANCELLA LOOP.
- [ ] **Cavo staccato e riattaccato**: l'app si ricollega come prima.
- [ ] **ALTRO → Salva diagnostica**: il file si salva e contiene `"app": "Kemper Profiler View v1.60"`.

Se qualcosa non va: salva la diagnostica e annota il passo. Per tornare alla v1.52 basta ricaricare su GitHub i file della v1.52.

## Test automatici (v1.63)

- `node --test` dalla cartella principale: 41 test (protocollo, Looper, Morph, tempo, colori, 125 Bank, bidirezionale, conferma cambio Rig, Tuner, prova Transpose, correzioni v1.62, struttura dei file e della grafica).
- Prova registrata prima/dopo e confronto dello stile di ogni elemento (`stili.mjs`, v1.63): `tools/prova-registrata/README.md`.

## Esito v1.48–v1.50 sul Player (27/09/2026)

- 125 Bank: dall'app caricati Bank 14 Rig 1 (PC 66) e Bank 10 Rig 1 (PC 46), confermati dal Player; colori delle Bank giusti ("funzionano"). Bank Select > 0 (dalla Bank 26 Rig 4) non ancora provato.
- AMP/CAB: nuovi Rig letti correttamente (66 AC30, Crunch Amp/Crunch Cab…).
- Pallini Morph: non realizzabili via MIDI (valori identici in BASE e MORPH) → prova tolta nella v1.51.
- TRIGGER a loop fermo (v1.44) **funziona**: il loop riparte dall'inizio (Giovanni). Nella diagnostica compariva come REC/PLAY → etichetta chiarita nella v1.52.
- Un REVERSE è partito senza che Giovanni lo toccasse (tocco di 38 ms, 0,6 s dopo STOP) → v1.52: REVERSE, ½ SPEED e UNDO solo con tocco vero.

## Da provare con la v1.50 (comprende v1.48 e v1.49; nella v1.49 il pulsante della prova Morph era disattivato)

- [ ] Carica un Rig che in Rig Manager ha i pallini rosso/blu su qualche effetto (annota quali). Morph in BASE. ALTRO → "Prova pallini Morph", aspetta 6 s, poi salva la diagnostica. Se puoi, ripeti con un Rig senza Morph.

## Da provare con la v1.48 (comprende la v1.47)

- [ ] Scheda RIG → tocca "BANK ▾": compare la griglia; scegli una Bank oltre la 10 e carica un Rig: il Player cambia davvero.
- [ ] Se hai Bank oltre la 26: carica un Rig lì dall'app (serve il Bank Select CC 32) e poi cambialo dal Player: l'app mostra Bank e Rig giusti.
- [ ] Colori: il colore della Bank nell'app corrisponde al LED del Player (anche oltre la Bank 10 — il manuale descrive solo le prime 10).
- [ ] "BANK MOSTRATE": riduci al numero di Bank che usi; − e + si fermano lì.

## Da provare con la v1.47

- [ ] Rig acustico "TT - 10/11": CAB mostra NON PRESENTE (pallino vuoto).
- [ ] Se hai un Rig con cabinet spento: CAB mostra SPENTO · nome (pallino grigio).
- [ ] Rig RT FIRESPIT: CAB mostra "senza nome"; controlla in Rig Manager che cabinet (o IR) usa.
- [ ] TRIGGER dopo STOP (non provato il 27/09: dopo STOP è stato usato REC/PLAY).

## Esito v1.45 sul Player (27/09/2026)

- Il Player risponde a tutte le richieste AMP/CAB (stringhe 0/16, 0/21, 0/24, 0/32, 0/37, 0/42 e interruttori 10/2, 12/2), in circa 0,1 s.
- Basso "WD - Metalbass clean": High Watt Two Hundred · custom made 2*15, entrambi accesi. Elettriche: Vox AC30/6 TB, Stu G's 62 AC (Vox 62 AC30 Coppertop), Bogie Dual Recto 3ch 6L6, Matchless Spitfire. Acustiche "TT - 10/11": L+R Brick Venice DI, cabinet "N/A" e spento.
- RT FIRESPIT (Blue): cabinet acceso ma nome, marca e modello vuoti.
- Modalità bidirezionale: 7 minuti, nessuna caduta, 65 richieste/min, 74 ridisegni su 13.805 messaggi.
- Nomi Bank: le Bank 1, 2 e 3 sul Player si chiamano tutte "Bank 6" e hanno quasi gli stessi slot (probabilmente copie della stessa Performance).

## Da provare con la v1.45 (comprende la v1.44)

- [ ] Scheda RIG, Rig di chitarra elettrica: AMP e CAB con il nome giusto e il pallino verde; confronta con Rig Manager.
- [ ] Rig di basso e Rig acustico: controlla cosa compare (nome, OFF) e se corrisponde a Rig Manager.
- [ ] Un Rig con un IR importato come cabinet: il nome dell'IR compare nella riga CAB?
- [ ] Cambia Rig più volte: le righe si aggiornano entro circa un secondo.
- [ ] Salva la diagnostica: sezione `rigStack` (valori letti e registro delle risposte).

## Da provare con la v1.44

- [ ] Registra un loop, STOP, poi un solo tocco su TRIGGER: il loop riparte dall'inizio e continua a suonare; l'anello riparte insieme.
- [ ] Mentre il loop suona, TRIGGER lo fa ripartire dall'inizio (come prima).

## Esito v1.43 sul Player (26/09/2026, sera)

- "Tutto funziona meglio": nessun rallentamento durante il loop. Diagnostica: 67 ridisegni su 40.736 messaggi del Player in 16 minuti; 46 richieste/min; nessuna caduta della modalità bidirezionale.
- Nomi Bank via 0x47 **funzionano**: passando alla Bank 8 dall'app il Player ha mandato solo lo slot 2, l'app ha chiesto il resto e in 0,1 s aveva tutti e 5 i nomi.
- Nuova icona, cerchio del Looper (a tempo con il loop) e tema SOLE: approvati da Giovanni (27/09/2026).
- Unico problema: TRIGGER a loop fermo suona solo tenendolo premuto (comportamento del Player) → corretto nella v1.44.

## Da provare con la v1.43 (comprende la v1.42)

- [ ] Stesse prove della v1.42 qui sotto, in particolare il loop lungo: pulsanti e schermo sempre pronti anche dopo diversi minuti di registrazione/overdub.

## Da provare con la v1.42

- [ ] Looper: registra, suona, fai overdub per qualche minuto con la schermata PALCO e con la scheda LOOPER aperta: i pulsanti rispondono subito, nessun "impuntamento".
- [ ] Tre STOP di seguito: l'app resta su FERMO (il loop non è cancellato, come sul Player).
- [ ] REVERSE a loop vuoto: l'app mostra REVERSE: ON; il nuovo loop suona al contrario; toccando REVERSE torna normale. Dopo aver chiuso e riaperto l'app lo stato è ricordato.
- [ ] Diagnostica: `bidirectional.screenRedraws` con molti meno ridisegni che messaggi.

## Esito v1.41 sul Player (26/09/2026)

- Modalità bidirezionale stabile 12 minuti, nessuna caduta, 72 richieste/min; accordatore con 6 corde.
- Nomi Bank via 0x47: non provati (nessuna Bank incompleta visitata).
- Looper: "piccole difficoltà durante il loop" (da chiarire: suono o app); tre STOP facevano segnare VUOTO all'app ma il loop restava; REVERSE rimasto attivo dal loop precedente → nuovo loop al contrario. Corretti i due punti nella v1.42; alleggerito il ridisegno dello schermo.


## Da provare con la v1.41

- [ ] Scheda RIG: passa con l'app a una Bank mai aperta dal Player e scegli un Rig; dopo circa 1 s compaiono tutti e 5 i nomi degli slot (in diagnostica `bankNames.requestsSent` e `requestRepliesComplete`).
- [ ] Looper: registra un loop; l'anello si riempie una volta per giro, in tempo con il loop che senti. Prova REVERSE (torna indietro), ½ SPEED (più lento), STOP e poi PLAY (riparte da capo), TRIGGER.
- [ ] Nuova icona: disinstalla e reinstalla l'app dalla pagina; l'icona sono quattro riquadri colorati.
- [ ] ALTRO → Aspetto → SOLE: PALCO, RIG, LOOPER e accordatore leggibili all'aperto; torna a SCURO e la scelta resta dopo aver chiuso l'app.
- [ ] Effetti, Fixed FX, Freeze, Morph, Tuner: i comandi dall'app vengono confermati come prima (con la modalità bidirezionale senza letture in più).

## Prova lunga (prima della 2.0)

Da fare durante una prova o un servizio intero (1–2 ore), con la modalità bidirezionale attiva:

- [ ] Batteria: percentuale all'inizio e alla fine (con cavo OTG il telefono non si ricarica).
- [ ] Lo schermo resta sempre acceso; l'app non si chiude da sola.
- [ ] Almeno 20 cambi di Rig, dal Player e dall'app: nessun "collegamento perso", nessun effetto con stato sbagliato.
- [ ] Stacca e riattacca il cavo una volta: l'app si ricollega da sola (IN ATTESA DEL PLAYER → ATTIVA).
- [ ] Metti l'app in secondo piano per un minuto e torna: tutto si riallinea.
- [ ] Ripetere una parte della prova con l'OPPO A9 2020.
- [ ] Alla fine: Salva diagnostica e allegarla.


## Da provare con la v1.40 (comprende la v1.39)

- [ ] PALCO: i colori degli effetti corrispondono ai LED del Kemper (es. Compressor ciano, Green Scream rosso, Studio EQ giallo, Phaser viola, Delay e Reverb verdi).
- [ ] Fixed FX accesi: Pure Booster rosso, Vintage Chorus blu, Transpose bianco, Double Tracker giallo.
- [ ] Morph: in BASE riquadro rosso; con Morph pieno blu; a metà (tasto %) colore intermedio viola; stessi colori del Kemper.
- [ ] Accordatore: con la corda centrata tutto lo schermo è verde e si legge dal leggio; non lampeggia quando la corda è quasi centrata.
- [ ] Aprendo e chiudendo il Tuner più volte, in ALTRO le richieste al minuto restano basse (circa 50) e in diagnostica cresce `gapFillsInsteadOfFullSync`.
- [ ] Cambiando Rig, Freeze e Fixed FX mostrano subito lo stato giusto (non restano su IN LETTURA).

## Esito v1.38 sul Player (26/09/2026)

- Nessuna caduta del collegamento bidirezionale in 3 cambi di Rig. Nomi Bank 9 ricevuti all'avvio e memorizzati.
- Accordatore in modalità bidirezionale: E2, A2, D3, G3, B3, E4 riconosciute; 22 letture dell'app, circa 7000 invii del Player; 124/15 e 124/81 hanno la stessa scala.
- All'apertura del Tuner il Player invia `B0 2F 7F`, `B0 00 00`, `B0 20 00` e il Program Change del Rig in uso → l'app rileggeva tutto (142 richieste/min) → corretto in v1.39.
- Riquadri pieni e scheda RIG: approvati. Colori da allineare al Kemper → v1.39.


## Da provare con la v1.38 (grafica)

- [ ] PALCO: gli effetti accesi sono riquadri pieni colorati, quelli spenti scuri; si distinguono da lontano (anche col telefono sul leggio).
- [ ] Nomi lunghi (es. Compressor, Transpose): nessuna parola tagliata o spezzata senza trattino, su A9 e Reno, in verticale e orizzontale.
- [ ] I messaggi brevi compaiono in basso e non coprono la barra delle schede; toccando un pulsante sotto il messaggio il tocco funziona.
- [ ] In PALCO, accendendo un effetto non compare più il messaggio "confermato".
- [ ] Scheda RIG: il Rig in uso è verde con IN USO; toccandone un altro diventa ambra (CARICO…) e poi l'app torna a PALCO; in orizzontale i 5 Rig stanno affiancati.
- [ ] Scheda RIG su un'altra Bank: compare TORNA ALLA BANK IN USO.
- [ ] All'avvio con la modalità bidirezionale, la scheda RIG mostra subito nome della Bank e nomi degli slot.
- [ ] Cambiando Rig non compare più "Collegamento bidirezionale perso".

## Esito v1.37 sul Player (26/09/2026, Reno 12 Pro)

- Modalità bidirezionale ATTIVA in 2 s; ⇄ in PALCO; 49 richieste al minuto (prima circa 450). Dettagli in `docs/MIDI.md`.
- Due "perso" di un istante durante i cambi di Rig (sensing sospeso circa 2 s) → v1.38 aspetta 4 s.
- Nomi Bank arrivati dopo il Program Change e non memorizzati → corretto in v1.38.
- Accordatore non provato in quella sessione.

## Da provare con la v1.37 (modalità bidirezionale)

- [ ] Dopo Connetti MIDI, in ALTRO la scheda "Modalità bidirezionale" passa da AVVIO… ad **ATTIVA** entro pochi secondi, e in PALCO compare **● COLLEGATO ⇄**.
- [ ] "Inviati dal Player" elenca almeno Nome Rig e alcuni effetti; annotare quali compaiono in "Letti dall'app" (atteso: DLY, REV, Fixed FX).
- [ ] Cambiando un effetto **dai pulsanti del Player**, la schermata PALCO si aggiorna subito (prima poteva servire fino a 1,5 s).
- [ ] Cambiando Rig dal Player, nome ed effetti si aggiornano.
- [ ] Accordatore: nota e lancetta si muovono bene; in diagnostica `tunerPolling.pollsSent` resta basso (il Player invia da solo).
- [ ] Il pallino accanto al BPM batte a tempo (se il Player invia il battito).
- [ ] Staccando il cavo e ricollegandolo: IN ATTESA DEL PLAYER, poi di nuovo ATTIVA senza toccare nulla.
- [ ] Con "Bidirezionale: OFF" l'app funziona esattamente come la v1.36.
- [ ] Salvare la diagnostica dopo 2–3 minuti di uso e allegarla: la sezione `bidirectional` dice cosa invia davvero il Player.
- [ ] Nessun effetto collaterale sul Player (display, pulsanti, suono) con la modalità attiva.

# Verifiche v1.36

## Da provare con la v1.36

- [ ] Scheda LOOPER: la posizione mostrata (INGRESSO/USCITA) corrisponde a quella del Kemper.
- [ ] Toccando l'altra posizione compare "confermato dal Kemper" e il comportamento del loop cambia di conseguenza.

# Verifiche v1.35

## Esito v1.34 sul Player (26/09/2026)

- Aggancio al tempo BATTUTA 4/4, 68 BPM (battuta 3,529 s): REC 11:37:58.266 → chiusura 11:38:12.385 = 14,119 s = 4 battute; scarto 1,4 ms. OK.
- "Leggi parametri Looper": nessuna risposta nel log (da ripetere con v1.35, che mostra il risultato a schermo).
- Trovato difetto: i nomi della demo finivano nella memoria dei nomi reali → corretto in v1.35.

# Verifiche v1.34

## Da provare con la v1.34 (aggancio al tempo)

- [ ] Con BATTUTA 4/4 e il BPM del brano impostato: registra 2 o 4 battute toccando REC durante l'ultimo movimento; il loop gira senza sfasarsi rispetto a un metronomo allo stesso BPM.
- [ ] Il conteggio BATTUTA · movimento corrisponde al tempo che senti (se parte sfasato è normale: l'1 è il momento in cui tocchi REC).
- [ ] Secondo tocco durante "CHIUDO TRA…" chiude subito.
- [ ] Latenza: se i loop risultano sistematicamente un poco lunghi o corti, segnalarlo (si può aggiungere una compensazione).

# Verifiche v1.33

## Problema noto del Player (non dell'app): Freeze REV + Fixed FX

Verificato dall'utente il 25/09/2026 anche **senza app** (pulsanti del Player e Rig Manager): con REV Freeze attivo, la prima attivazione di un Fixed FX mai attivato prima interrompe il suono congelato. Riattivando Freeze, quel Fixed FX non causa più l'interruzione; un Fixed FX non ancora attivato sì. Attivando prima i Fixed FX e poi Freeze il problema non si presenta. La diagnostica dell'app mostra un solo comando per ogni azione, confermato dal Player. Da segnalare a Kemper; nessun aggiramento nell'app per scelta dell'utente.

## ½ SPEED (prove 25/09/2026)

Doppio tocco dopo la registrazione: primo tocco al doppio, secondo normale. Toccato una volta prima di registrare: loop normale; ritoccato: metà velocità, un'ottava sotto. Conclusione: lo stato ½ SPEED del Player era rimasto ON da prove precedenti e **non si azzera con la cancellazione del loop**. Comportamento coerente con il manuale; v1.33 mostra lo stato e permette di correggerlo.

# Verifiche v1.32

## Da provare con la v1.32

- [ ] Cambiando Bank dai pulsanti del Player, la scheda RIG mostra nome Bank e 5 nomi slot.
- [ ] Cambiando Bank dall'app (scheda RIG, + e −, poi uno slot) arrivano anche i nomi? (vedi `bankNames.received` nella diagnostica)

# Verifiche v1.31

## Esito prova sul Player v1.30 (25/09/2026, Reno 12 Pro)

| Funzione | Esito |
| --- | --- |
| PALCO senza scorrere, effetti ON/OFF, accordatore, scheda RIG, schermo sempre acceso | OK |
| Looper REC/PLAY/OVERDUB, STOP, UNDO, REVERSE | OK |
| Looper ½ SPEED | Suonava al doppio: probabile ½ SPEED attivo durante la registrazione (comportamento Kemper). Da riprovare: registra, poi tocca ½ SPEED una volta |
| Looper CANCELLA | Non funzionava con la pressione lunga → v1.31 doppio tocco + Erase + STOP tenuto 2,2 s |
| Orizzontale | Nomi effetti uscivano dai riquadri → v1.31 carattere ridotto |
| Nomi Rig | Solo dopo aver scelto il Rig → v1.31 li ricorda; lettura di tutta la Bank prevista con la modalità bidirezionale |

## Da provare con la v1.31

- [ ] Stato Looper: REGISTRAZIONE/RIPRODUZIONE/OVERDUB/FERMO corrispondono a ciò che fa il Player.
- [ ] CANCELLA LOOP (due tocchi) con loop in riproduzione e con loop fermo.
- [ ] ½ SPEED toccato una volta dopo aver registrato: il loop rallenta; ritoccato: torna normale.
- [ ] Salva diagnostica (file) crea il .json nei Download.

# Storico v1.30

## Da provare sul Player con la v1.30

La v1.30 è stata provata solo in un browser con un Kemper **simulato** (nessun Player reale): nessuno scorrimento a 360×760, 412×880 e 780×360, nessun errore JavaScript, tocco effetti con conferma, cambio Rig con ritorno a PALCO, apertura/chiusura dell'accordatore a schermo intero.

- [ ] OPPO A9 2020 e Reno 12 Pro: la schermata PALCO entra tutta senza scorrere, in Chrome e da app installata.
- [ ] Lo schermo resta acceso per 10+ minuti dopo Connetti MIDI (in ALTRO → Copia diagnostica, campo `screenWakeLock`).
- [ ] Accordatore: aprendo il Tuner dal Player o dall'app compare la schermata intera; nota e cent si muovono suonando; CHIUDI TUNER lo chiude.
- [ ] Scheda RIG: scelto un Rig, il nome arriva e l'app torna a PALCO.
- [ ] Nomi effetti lunghi (es. "Compressor") vanno a capo col trattino e non escono dal riquadro.

# Storico v1.29

Questa tabella distingue ciò che l'utente ha osservato sul proprio Kemper Profiler Player MK2 Level III, ciò che è verificato dal codice in locale e ciò che resta da provare. Fonte hardware: export diagnostici v1.26 e v1.28 del 24 settembre 2026; la v1.29 è successiva a questi log. Nessuna connessione al Player dell'utente era disponibile per testare la v1.29.

## Riscontri sul dispositivo prima della v1.29

| Funzione | Evidenza dei log | Limite |
| --- | --- | --- |
| SysEx, nome Rig, BPM e otto moduli | Risposte `Profiler · Kemper`, es. `RT FIRESPIT 4`, 67.0 BPM raw4290, tipi e on/off degli otto moduli | Stato di protocollo, non ascolto audio |
| Program Change | Cambi Rig esterni ricevuti (`C0 28`…`C0 2C`); invio `C0 2B` per Bank 9 Rig 4 con risposta del nome | All'avvio senza PC/selezione nell'app, Bank e Slot non sono conoscibili dal solo nome Rig |
| Effetti fissi | Pure Booster, Vintage Chorus e Double Tracker hanno sequenze ON/OFF e risposte pagina 5 con 1/0 | Transpose ha risposte di lettura, ma nessuna commutazione ON/OFF dimostrata in questi export |
| Freeze REV | Set pagina 125 parametro 115, conferme 1/0 | L'utente ha segnalato un taglio audio alla prima attivazione di Vintage Chorus dopo Freeze; causa ignota |
| TAP | `B0 1E 00` seguito da nuove letture del tempo, talvolta con decimali | ±1 BPM e arrotondamento sono implementati, ma questi log non mostrano una verifica completa sul Player |
| Morph | Risposte di stato raw0 e, in precedenti export, raw16383 | Il nuovo slider di v1.29 e i valori intermedi non sono stati misurati sul Player |
| Tuner | Modalità chiusa (`127/126=3`), nessuna nota confermata | Nota e intonazione a Tuner aperto da verificare |

Nel file v1.28 esportato alle 15:22 le liste correnti riportavano solo porte `MS-* · dev-core`, `profilerOutputs=[]`, ma `currentState` conservava dati letti in precedenza. La v1.29 aggiorna gli indicatori di connessione e accetta gli aggiornamenti di stato solo dalla porta che si identifica come Kemper/Profiler; il comportamento con disconnessione/riconnessione fisica va provato.

## Test locali v1.29

Eseguire `node --test tests/midi.test.mjs`. I sei test coprono:

1. Decodifica delle risposte SysEx Morph a 14 bit e tempo raw.
2. Program Change e stato del modulo REV.
3. Sequenze NRPN di pressione e rilascio del Looper per RECORD e UNDO sul canale 2.
4. Invio di CC11 a livello Morph intermedio e stato in attesa di conferma.
5. Conversione raw per arrotondare il tempo a 67 BPM.
6. Esclusione dei messaggi da porte MIDI diverse dal Profiler dallo stato live.

Controllati inoltre sintassi dei file JS, integrità dell'archivio GitHub e presenza dei file statici. Questi test simulano messaggi MIDI e **non** verificano l'audio, la compatibilità del firmware o il touch screen reale. Non esiste una suite di test end-to-end in un browser con Player fisico.

## Problemi aperti e prossimo lavoro

- **Rig corrente al collegamento:** una risposta `Rig Name` non dice Bank/Slot. La UI deve indicare `RIG NON RILEVATO` finché non riceve PC dal Player o non seleziona un Rig dall'app; nel frattempo Bank 1 è soltanto una destinazione per la selezione, non un'affermazione sul Rig corrente. La conferma di un PC può ancora correlare una risposta nome in ritardo al comando appena inviato: da indagare.
- **Freeze → Vintage Chorus:** prima attivazione ha causato un'interruzione sonora riferita dall'utente; i successivi tentativi non l'hanno riprodotta. I log mostrano comandi e conferme, ma non identificano la causa. Ripetere prova audio con condizioni controllate prima di cambiare sequenza MIDI.
- **Porta Kemper che scompare:** l'indicatore v1.29 distingue ora il Kemper dalle altre porte MIDI, e i messaggi da `MS-*` non mutano più lo stato Kemper. Verificare hotplug su Android/desktop, reset dei dati precedenti e conferma dei comandi durante una disconnessione.
- **Looper v1.29:** mappatura NRPN ricavata dalla documentazione Kemper, ma non testata su questo Player. Verificare REC/PLAY/OVERDUB, STOP, TRIGGER, REVERSE, HALF SPEED, UNDO/REDO ed ERASE, la durata press/release e il gesto hold di 1 secondo. La UI non conosce lo stato reale del loop: non mostrare "registrando" o "in riproduzione" senza feedback attendibile.
- **Morph LIVE:** testare toggle BASE/MORPH, slider 0–100%, quantizzazione CC11→raw14, conferma da pagina 0/11 e cambio Rig durante un livello parziale.
- **Tuner, Transpose, tempo:** convalidare nota/cents in modo aperto, toggle Transpose e BPM INTERO/±1 sul Player reale.
- **PWA:** servizio offline con cache-first; aggiornare `CACHE` in `dist/sw.js` per futuri rilasci e verificare l'aggiornamento nei browser installati.

Tutti i codici esadecimali effettivamente trasmessi sono elencati in [`MIDI.md`](MIDI.md).
