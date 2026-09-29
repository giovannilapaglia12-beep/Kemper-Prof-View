# Kemper Profiler View v1.64

Web app/PWA in italiano per **Kemper Profiler Player MK2, Level III**, con Web MIDI e SysEx. Fino alla v1.36 si chiamava *Kemper Stage View*.

## Novità v1.64 — Transpose da −2 a +2 in PALCO

- **Esito della prova "Leggi Transpose" (29/09/2026)**: i semitoni del Fixed FX Transpose sono il parametro 4/4 del Player (64 = 0, 66 = +2, 62 = −2); l'On/Off (5/1) si accende quando il valore non è 0. Cambiando Rig il Player torna al valore salvato nel Rig.
- **Il riquadro Transpose di PALCO scrive sempre i semitoni** (es. *Transpose +2*). Toccandolo si apre una fila **−2 −1 0 +1 +2 ✕** sopra i riquadri in basso: un tocco sceglie il valore (0 = spento), ✕ chiude senza cambiare. Il riquadro mostra ATTENDO KEMPER finché il Player non conferma; senza conferma entro 2,8 s compare "non confermato dal Kemper".
- **Il valore scelto resta cambiando Rig**, come deciso: se il nuovo Rig lo riporta al suo valore, l'app lo rimette (solo se il nuovo Rig viene letto entro 8 s dal cambio) e scrive "Transpose +2 rimesso dopo il cambio Rig". Se il Transpose viene cambiato sul Player, da quel momento vale quello del Player. All'apertura dell'app nessun valore è scelto: l'app mostra quello del Player e non invia nulla finché non si tocca.
- Il riquadro non accende e spegne più il Transpose con un tocco: si spegne scegliendo 0.
- Diagnostica: nuova sezione `transposeControl`. Il Player DEMO simula 4/4 e il ritorno a 0 cambiando Rig.
- Test: 48 (7 nuovi sul Transpose: comandi, conferma, cambio Rig, cambio fatto sul Player, nessun comando senza una scelta o dopo 8 s).

## Novità v1.63 — grafica riordinata per schermata, nessuna modifica visibile

- **`styles.css` (2.142 righe) è stato diviso in 7 file** nella nuova cartella `dist/css/`: `base.css` (colori e misure comuni, barra delle schede, pulsanti comuni), `palco.css`, `rig.css`, `looper.css`, `tuner.css`, `altro.css` e `tema-sole.css` (solo le differenze del tema SOLE, caricato per ultimo). Totale: circa 1.500 righe.
- **Tolte 181 regole che non potevano più applicarsi**: riguardavano elementi che non esistono più nella pagina (soprattutto i pannelli tolti da ALTRO nella v1.61). Unite 15 regole doppie dello stesso elemento, solo dove l'ordine non conta.
- **Nulla cambia sullo schermo.** Lo dimostra la nuova prova `tools/prova-registrata/stili.mjs`: in Chrome automatico confronta lo stile finale di ogni elemento (colori, misure, posizione, anche `::before` e `::after`) fra la v1.62 e la v1.63, in 122 situazioni: 4 schede, Tuner, griglia Bank, Looper in registrazione, effetti in attesa, guida aperta…, ognuna con tema SCURO e SOLE, telefono in verticale, in orizzontale e piccolo (OPPO A9). Risultato: identico, 82.508 elementi. Anche messaggi MIDI, memoria del telefono e pagina sono identici (prova registrata), e l'app parte senza rete.
- Test: 41 (uno nuovo: ogni file di `css/` è caricato dalla pagina, con `base.css` per primo e `tema-sole.css` per ultimo).

## Novità v1.62 — due correzioni dopo la prova lunga del 28/09/2026

- **Niente falso "collegamento bidirezionale perso" tornando all'app.** Nella prova lunga, dopo una chiamata WhatsApp, l'app ha segnalato due volte la modalità bidirezionale come persa, ed è rientrata in pochi millesimi di secondo. Il motivo: in secondo piano Chrome trattiene i messaggi del Player, e al ritorno l'app vedeva più di 4 s senza sensing prima di leggerli. Ora, quando l'app torna in primo piano (o dopo che il telefono l'ha sospesa), per 2 s non dichiara la modalità persa. Se il Player tace davvero, dopo i 2 s la segnala come prima. La diagnostica conta questi ritorni (`resumesFromBackground`).
- **REVERSE e ½ SPEED ripartono da OFF quando il Player è stato spento.** L'app li ricorda perché il Player li tiene attivi anche dopo aver cancellato il loop, ma spegnendolo tornano OFF, e il Player non comunica lo stato del Looper. Nella prova lunga l'app diceva REVERSE ON mentre il Player registrava normale. Ora, se l'app non sente il Player da più di 10 minuti, all'apertura riparte da OFF e lo dice (messaggio breve e nota nella scheda LOOPER). "NON CORRISPONDE? INVERTI" resta per i casi dubbi. Il Player DEMO non conta come contatto.
- Il resto non cambia: nella prova registrata messaggi MIDI, memoria del telefono e schede sono identici alla v1.61. Test: 40.

## Novità v1.61 — ALTRO più corta, prova del Transpose

- **ALTRO senza controlli doppi**: tolti RIG ATTUALE con i BPM, Selezione diretta Player, Morph e Accordatore, Effetti del Rig, Effetti rapidi (Fixed FX) e Freeze. Sono già tutti in PALCO e RIG. La pagina passa da circa 5.200 a 2.900 pixel.
- **Cosa resta in ALTRO, nell'ordine**:
  1. modalità bidirezionale;
  2. Collega il Player, con una riga "RIG IN USO: nome · Bank/Program · Canale";
  3. Prove sul Player;
  4. Tema;
  5. messaggi e diagnostica (Salva, Copia, Pulisci log);
  6. guida, riscritta.
- **Nuova prova "Leggi Transpose" (sola lettura)**. Serve a scoprire l'indirizzo MIDI dei semitoni del Fixed FX Transpose, che Kemper non ha pubblicato: è il primo passo per scegliere da −2 a +2 dall'app. Ogni tocco legge tutta la pagina 5 dei Fixed FX e il Rig Transpose (pagina 4, parametro 4). Dalla seconda lettura l'app mostra quali valori sono cambiati, con il testo del Player (per esempio «+2»). Le letture sono nella diagnostica (`transposeProbe`). Come farla: `docs/TESTING.md`.
- **Tolta "Leggi parametri Looper"**: la prova si è conclusa il 26/09 (lo stato del Looper non è leggibile).
- **Corretto**: nel registro dei messaggi la scritta "Cambia Rig o premi un footswitch…" restava sempre visibile, anche con i messaggi presenti (anche nella v1.52).
- **Accessibilità**: il riquadro REV in PALCO non dice più "pressione lunga per cambiare Freeze" (la pressione lunga c'era solo nella griglia di ALTRO).
- **PALCO, RIG e LOOPER non cambiano.** Nella prova registrata le tre schede, i messaggi MIDI e la memoria del telefono sono identici alla versione precedente in tutti i passi, a parte la frase REV qui sopra.
- Test: 37 (36 più uno nuovo: ogni `ui.<nome>` usato nel codice esiste in `js/dom.js`).

## Novità v1.60 — codice riordinato, nessuna modifica visibile

- **`app.js` (3.961 righe) è stato diviso in 19 file per argomento** nella nuova cartella `dist/js/` (elenco in "Struttura completa"). `app.js` ora contiene solo l'accensione: collega i pulsanti e avvia l'app (circa 190 righe).
- **Il comportamento non cambia.** Il codice è stato spostato, non riscritto: nessuna funzione modificata, nessun nome cambiato. Lo dimostra una **prova registrata** (`tools/prova-registrata/`): in Chrome automatico, con il Player demo e un orologio controllato, 88 passi in 4 situazioni (con e senza bidirezionale, Player che non risponde al beacon, telefono in orizzontale). Tocchi su tutte le funzioni, compresi Rig nella Bank 30 con Bank Select, Looper completo e diagnostica. Il risultato è identico alla v1.52 byte per byte: circa 1.700 messaggi MIDI, pagina e memoria del telefono dopo ogni passo.
- **Nomi e impostazioni restano**: le chiavi di memoria `kemper-stage-view-…` sono le stesse, ora raccolte in `js/config.js`.
- **Test**: da 22 a 33. Tre controllano la struttura (ogni file è nella cache offline, ogni import esiste, ogni pulsante cercato è nella pagina); otto sono nuovi e riguardano modalità bidirezionale, conferma del cambio Rig e cent del Tuner. I test che prima ritagliavano `app.js` come testo ora leggono i moduli.
- Sul Player basta una verifica breve (circa 15 minuti, checklist in `docs/TESTING.md`), da fare dopo la prova lunga sulla v1.52.

## Novità v1.52 (versione per la prova lunga)

- **REVERSE, ½ SPEED e UNDO partono solo con un tocco vero**: il comando parte quando alzi il dito, e solo se non l'hai trascinato. Il 27/09/2026 un REVERSE è partito senza volerlo (tocco di 38 ms subito dopo STOP; il pulsante è accanto a TRIGGER). Uno sfioramento o una scrollata che parte sopra il pulsante non inviano più nulla. REC, STOP e TRIGGER restano immediati alla pressione, perché lì conta il tempo.
- **Diagnostica più chiara**: TRIGGER a loop fermo compare come "Looper TRIGGER → PLAY (loop fermo)" (prima "REC / PLAY / OVERDUB", che sembrava un tocco su REC).

## Novità v1.51

- Tolto da ALTRO il pulsante "Prova pallini Morph": la prova è conclusa. Sul Player i valori degli effetti letti in BASE e in MORPH sono identici, quindi dal MIDI non si può sapere quali effetti sono legati al Morph (dettagli in `docs/MIDI.md`). Il comando del Morph dall'app resta com'era.
- Nessun'altra modifica: è la versione da usare per la prova lunga.

## Novità v1.50

- Corretto: il pulsante "Prova pallini Morph" della v1.49 restava sempre disattivato. Aveva lo stesso identificativo del pulsante Morph già presente in ALTRO, per cui la prova partiva anche toccando quel pulsante. Ora ha un identificativo suo; un nuovo test controlla che nella pagina non ci siano identificativi ripetuti.

## Novità v1.49

- **Prova pallini Morph** (ALTRO → "Prova pallini Morph (sola lettura)"). Rig Manager mostra due pallini rosso/blu sugli effetti che cambiano con il Morph; per mostrarli anche nell'app serve sapere quali parametri hanno un valore Morph diverso. Le risposte che l'app riceve oggi (funzione 0x01, 13 byte) non lo contengono. La prova chiede per gli 8 effetti la lettura multipla documentata (0x42 → 0x02) e la variante con i valori Morph (0x48 → 0x08, non documentata) e salva le risposte grezze nella diagnostica (`morphProbe`). Sola lettura: non cambia nulla sul Player.

## Novità v1.48

- **Tutte le 125 Bank del Level III** (prima solo le prime 10). Il cambio Rig ora invia, come fa il Player stesso, CC 0 = 0, **CC 32 (Bank Select)** e Program Change: dal Rig 129 (Bank 26 Rig 4) in su il CC 32 vale 1, 2, 3, 4. Anche i cambi fatti sul Player oltre la Bank 26 vengono riconosciuti.
- **Scelta rapida della Bank**: nella scheda RIG tocca "BANK ▾" (il numero) → griglia di tutte le Bank, 5 per riga, con il colore e il nome se già noto; la Bank in uso è piena, quella scelta ha il bordo. In fondo "BANK MOSTRATE: 1 – N" con −5/+5 per mostrare solo le Bank che usi (anche i pulsanti −/+ si fermano lì; scelta memorizzata).
- **Colori delle Bank come sul Player** (manuale del Player): Bank 1 blu, 2 giallo, 3 rosso, 4 verde, 5 viola, poi si ripete (6 blu, 7 giallo…). Numero della Bank colorato nella scheda RIG e "BANK · RIG" colorato con pallino in PALCO. Nel tema SOLE i colori sono più scuri per restare leggibili.

## Novità v1.47

- **AMP/CAB: tre casi distinti** (richiesta di Giovanni: "OFF" da solo non diceva se il cabinet è spento o se non c'è):
  - **NON PRESENTE** (pallino vuoto): il Rig non ha quel blocco — il Player scrive "N/A" in nome, marca e modello (profili diretti/DI, es. i Rig acustici "TT - 10/11").
  - **SPENTO · nome** (pallino grigio): il cabinet c'è ma è disattivato.
  - **nome** (pallino verde): presente e acceso; "senza nome" se il Player non ne dà il nome.

## Novità v1.46 (dopo la prova della v1.45 del 27/09/2026)

- AMP/CAB **funziona sul Player**: basso (High Watt Two Hundred · custom made 2*15), elettrica (Vox AC30/6 TB, Bogie Dual Recto…), acustica (L+R Brick Venice DI, cabinet spento).
- Nei Rig senza cabinet il Player scrive "N/A" (dalla v1.47: NON PRESENTE).
- Cabinet acceso ma senza nome (es. Rig RT FIRESPIT): ora si legge **"senza nome"** invece di "—". Di solito è un cabinet importato senza nome.
- Diagnostica `rigStack.log`: tiene le ultime 80 risposte (prima le prime 40).

## Novità v1.45

- **Ampli e cabinet del Rig in uso** (scheda RIG, sotto "IN USO"): due righe AMP e CAB con il nome e un pallino verde se sono accesi, grigio con "OFF" se sono spenti. Dopo ogni cambio Rig l'app li chiede al Player (0,9 s dopo, con un secondo tentativo se non risponde): nomi con le stringhe 0x43 pagina 0 (0x10 nome ampli, 0x15 marca, 0x18 modello; 0x20 nome cabinet, 0x25 marca, 0x2A modello; indirizzi trovati dagli utenti del forum Kemper) e interruttori Amp On/Off 10/2 e Cabinet On/Off 12/2. Se manca il nome si mostrano marca e modello. Nessun allarme: con la chitarra acustica AMP o CAB spenti possono essere normali. Se il Player non risponde le righe non compaiono. Diagnostica: sezione `rigStack`.
- Tema SOLE: il numero del Rig in uso (cerchio nero nel riquadro verde) ora è leggibile.

## Novità v1.44 (dopo la prova della v1.43 del 26/09/2026)

- **TRIGGER con il loop fermo**: sul Player, a loop FERMO, TRIGGER fa suonare il loop solo finché è tenuto premuto (con un tocco breve non si sentiva nulla, ma l'app faceva ripartire il cerchio). Ora, se l'app sa che il loop è FERMO, il tocco su TRIGGER invia PLAY: il loop riparte dall'inizio con un solo tocco. Mentre il loop suona, TRIGGER resta TRIGGER (ripartenza dall'inizio). Nella scheda LOOPER compare "TRIGGER · loop fermo: riparte dall'inizio (inviato PLAY)".

## Novità v1.43

- **Looper ancora più leggero**: durante la registrazione il cronometro aggiorna solo il tempo e il battito (non più tutta la scheda LOOPER dieci volte al secondo); l'anello di avanzamento si aggiorna ogni 80 ms invece di 50 e si ferma quando l'app non è in primo piano. Insieme alla v1.42 serve a togliere i rallentamenti dei pulsanti durante il loop.

## Novità v1.42 (dopo la prova sul Player del 26/09/2026)

- **Looper: tolta la regola "tre STOP = loop cancellato"**. Non è vera sul Player: l'app segnava LOOP VUOTO mentre il loop c'era ancora. STOP ora ferma soltanto; per cancellare c'è CANCELLA LOOP (Erase + STOP tenuto premuto).
- **Looper: REVERSE ricordato** come ½ SPEED. Sul Player REVERSE resta attivo anche dopo la cancellazione del loop (il nuovo loop suonava al contrario). La scheda LOOPER mostra sempre REVERSE: ON/OFF con "NON CORRISPONDE? INVERTI"; l'app segue REVERSE anche a loop vuoto e lo ricorda sul telefono.
- **App più leggera durante l'uso**: in modalità bidirezionale il Player invia circa 40 messaggi al secondo (dati del Tuner anche a Tuner chiuso, battito, valori ripetuti) e l'app ridisegnava tutta la schermata per ognuno. Ora ridisegna solo quando cambia qualcosa di visibile, al massimo ogni 60 ms (nella prova con il Player simulato: 6 ridisegni invece di 498). Diagnostica: `bidirectional.screenRedraws`.

## Novità v1.41

Prima tappa verso la 2.0 (vedi in fondo "Strada verso la 2.0").

- **Nomi della Bank sempre completi**: cambiando Bank dall'app il Player inviava solo il nome della Bank e di uno slot (prova del 26/09/2026). Ora, se mancano nomi, l'app li chiede al Player (stringhe estese `F0 00 20 33 02 7F 47 00 00 00 01 00 0N F7`, N = 0 Bank, 1…5 slot; indirizzi trovati dagli utenti del forum Kemper) e li memorizza.
- **Cerchio di avanzamento del Looper**: nella scheda LOOPER un anello mostra a che punto è il giro; sull'indicatore LOOP in PALCO c'è un piccolo anello. È una stima dell'app: parte quando chiudi la registrazione, riparte con STOP → PLAY e TRIGGER, gira all'indietro con REVERSE, rallenta o accelera con ½ SPEED.
- **Nuova icona** (quattro riquadri colorati come la schermata PALCO) anche in PNG 192/512 e versione "maskable" per Android: per vederla sul telefono bisogna reinstallare l'app dalla pagina.
- **Tema SOLE** (ALTRO → Aspetto): fondo chiaro, testo nero, bordi marcati; effetti spenti bianchi con bordo del loro colore, accesi pieni con bordo nero. Scelta memorizzata.
- **Meno messaggi**: con la modalità bidirezionale le letture di conferma dopo un comando partono solo se il Player non conferma entro 700 ms (di solito conferma in 25 ms); dopo un cambio Rig la lettura dei valori mancanti parte una volta sola.

## Novità v1.40

- **Double Tracker giallo** (categoria EQ, come sul Kemper).
- **Morph con i colori del Kemper**: **rosso** in BASE, **blu** con Morph pieno; nei livelli intermedi il colore sfuma dal rosso al blu (bordo, scritta, barra e pulsante), come fa il Kemper. Livello intermedio indicato come PARZIALE (prima TRANSIZIONE, che si sovrapponeva al pulsante %). Stessi colori nella scheda Morph in ALTRO.

## Novità v1.39

**Esito della prova sul Player (26/09/2026, v1.38):** nessuna caduta del collegamento bidirezionale in 3 cambi di Rig; nomi della Bank ricevuti all'avvio e memorizzati; **accordatore in modalità bidirezionale funzionante** (le 6 corde riconosciute, nota e intonazione inviate dal Player: 22 letture dell'app contro circa 7000 invii del Player). Riquadri pieni e scheda RIG approvati.

- **Colori come sul Kemper** (riquadri effetti in PALCO): Wah arancio · Distorsione, Booster, Shaper rosso · EQ, Widener, Double Tracker giallo · Compressore, Gate ciano · Chorus, Vibrato, Rotary, Tremolo blu · Phaser, Flanger viola · Pitch (Transpose, Octaver…) bianco · Delay verde · Delay con pitch verde chiaro · Riverbero verde (tonalità leggermente diversa per distinguerlo dal Delay) · Effect Loop rosa.
- **Fixed FX colorati**: Pure Booster rosso, Vintage Chorus blu, Transpose bianco, Double Tracker blu (giallo dalla v1.40).
- **Morph (proposta 3)**: prima prova con BASE neutro e MORPH azzurro; sostituita nella v1.40 dai colori del Kemper (rosso → blu).
- **Accordatore leggibile da lontano (proposta 5)**: quando la corda è centrata tutto lo schermo diventa **verde** con la nota nera; calante = sfondo ambra scuro, crescente = sfondo rosso scuro; nota più grande. Isteresi: diventa verde entro ±3 cent ed esce oltre ±5, così non lampeggia al limite.
- **Meno richieste**: all'apertura del Tuner il Player rimanda il Program Change del Rig già in uso e l'app rileggeva tutto (24 richieste) ogni volta. Con la modalità bidirezionale attiva, dopo un Program Change o un cambio Rig l'app legge solo i valori ancora sconosciuti, dopo 1 s (in diagnostica: `bidirectional.gapFillsInsteadOfFullSync`). Senza modalità bidirezionale tutto resta come prima.

## Novità v1.38

**Esito della prova sul Player (26/09/2026, v1.37):** la modalità bidirezionale funziona. Il Player ha risposto al beacon in 2 s e invia da solo **tutti** i parametri che l'app usa (effetti A–REV con tipo e stato, Fixed FX, Freeze REV, BPM, Morph, Tuner, posizione Looper, nome Rig, battito del tempo). Le richieste dell'app sono scese da circa 450 a **49 al minuto**; le conferme dei comandi arrivano in circa 25 ms.

- **Correzioni dalla prova**
  - Durante il caricamento di un Rig il Player sospende il sensing per circa 2 s: l'app segnalava "collegamento perso". Ora aspetta 4 s e non mostra il messaggio per riconnessioni brevi.
  - All'avvio della modalità il Player invia i nomi della Bank **dopo** il Program Change (il contrario del cambio Bank dal Player): prima andavano persi, ora vengono assegnati alla Bank giusta.
  - Scheda RIG: mentre un Rig si caricava lo stato mostrava "BANK undefined" (errore già presente nelle versioni precedenti in ALTRO).
- **Effetti in PALCO (proposta 1)**: effetto acceso = riquadro pieno del colore della categoria con testo scuro; spento = riquadro scuro con testo attenuato; slot vuoto tratteggiato; in attesa = bordo ambra pulsante; Freeze REV = riquadro azzurro. Il nome si adatta alla larghezza e le parole lunghe vanno a capo per sillabe (Com-pres-sor), mai a metà a caso. Stesso stile per Fixed FX, REV FREEZE e TUNER.
- **Messaggi brevi (proposta 2)**: pillola compatta in basso, colorata per tipo (verde conferma, ambra problema), non copre più la barra PALCO/RIG/LOOPER/ALTRO e lascia passare i tocchi. In PALCO le conferme di routine non compaiono più (lo stato si vede sui riquadri).
- **Scheda RIG (proposta 4)**: numero della Bank e nome della Bank in grande; i 5 Rig riempiono lo schermo come pulsanti; il Rig in uso è pieno di verde con "IN USO", quello in caricamento ha il bordo ambra con "CARICO…"; in alto "IN USO: Bank · Rig · nome" e, se stai guardando un'altra Bank, il pulsante TORNA ALLA BANK IN USO. In orizzontale i 5 Rig sono affiancati.

## Novità v1.37

- **Nuovo nome: Kemper Profiler View** (titolo, icona installata "Profiler View", diagnostica). Le chiavi di memoria del telefono restano quelle di prima (`kemper-stage-view-…`): nomi di Bank/Rig, ½ SPEED, aggancio al tempo e scheda aperta non si perdono.
- **Modalità bidirezionale** (ALTRO → prima scheda, accesa di serie). L'app invia al Player un *beacon* (`F0 00 20 33 02 7F 7E 00 40 02 03 0F F7`: set 2, INIT + SysEx, validità 30 s) e lo rinnova ogni 12 s. Il Player risponde con un *sensing* circa ogni 500 ms e invia da solo i parametri che cambiano.
  - L'app **scopre da sola** quali parametri il Player invia (quelli che arrivano senza che l'app li abbia chiesti) e smette di leggerli di continuo; tutto il resto (probabilmente DLY, REV, Fixed FX) resta letto come prima. Un controllo completo di sicurezza ogni 10 s.
  - Accordatore: se il Player invia da solo nota e intonazione (124/15), l'app non fa più letture ogni 100 ms.
  - Se il sensing si interrompe per più di 4 s (dalla v1.38; era 2 s) l'app torna subito alle letture periodiche e riprova ogni 5 s (10 s dopo tre tentativi senza risposta).
  - Sulla schermata PALCO, accanto a COLLEGATO compare **⇄** quando la modalità è attiva. Accanto al BPM compare un **pallino che batte il tempo** se il Player invia il battito (124/0).
  - Nella scheda: stato (ATTIVA / AVVIO / PERSA / NON RISPONDE / SPENTA), elenco "Inviati dal Player" e "Letti dall'app", richieste al minuto, pulsante per spegnerla.
  - Diagnostica: nuova sezione `bidirectional` con beacon inviati, sensing ricevuti, parametri arrivati spontaneamente, cadute del collegamento e SysEx sconosciuti ricevuti in modalità bidirezionale.
- Demo aggiornata: il Kemper simulato risponde al beacon (con `window.__demoNoBidi = true` simula un Player che non risponde).
- **Da verificare sul Player**: vedi [`docs/TESTING.md`](docs/TESTING.md). Il formato del beacon viene dal firmware PySwitch per MIDI Captain, usato con i Kemper Player; non è nella documentazione ufficiale Kemper (dove la funzione `0x7E` è indicata come "reserved").

## Novità v1.36

- **Posizione Looper (Looper Location) dall'app**: nella scheda LOOPER, INGRESSO / USCITA, letta dal Kemper all'apertura della scheda e a ogni sincronizzazione, cambiata con conferma del Kemper. Parametro globale 127/53: **0 = Input, 1 = Output** (verificato sul Player il 26/09/2026).
- Scheda LOOPER riordinata: stato e comandi in alto, impostazioni (aggancio al tempo, posizione, ½ SPEED) sotto CANCELLA LOOP.

## Novità v1.35

- **Correzione**: la modalità demo (v1.31–v1.34) salvava sul telefono i suoi nomi finti di Bank/Rig mescolandoli a quelli reali. Ora la demo non salva nulla; al primo avvio della v1.35 i nomi memorizzati vengono azzerati una volta (si ripopolano cambiando Bank sul Player e scegliendo i Rig).
- **Cancella nomi Bank/Rig memorizzati** (ALTRO), con conferma a doppio tocco.
- **Leggi parametri Looper** mostra subito il risultato sotto i pulsanti (risposte del Player o "Nessuna risposta") e lo salva nella diagnostica.
- Verificato sul Player (26/09/2026): aggancio al tempo BATTUTA 4/4 a 68 BPM → primo giro di 14,119 s = 4 battute (scarto 1,4 ms).

## Novità v1.34

- **Aggancio al tempo del Looper** (scheda LOOPER, impostazione ricordata sul telefono): OFF, MOVIMENTO, BATTUTA 4/4, BATTUTA 3/4. Il Kemper non quantizza il Looper; l'app, che conosce il BPM del Rig e l'istante di inizio registrazione, ritarda il comando REC di chiusura fino alla fine esatta della battuta (o del movimento) in corso, così il primo giro dura un numero intero di battute al tempo del Rig. Durante la registrazione mostra BATTUTA n · movimento, con il pallino che batte il tempo (più grande sull'1).
  - Regola: la chiusura avviene alla fine della battuta/movimento in corso. Se il tocco arriva in ritardo di al massimo mezzo movimento (max 250 ms) il loop si chiude subito, per non aggiungere un giro intero.
  - Un secondo tocco su REC durante l'attesa chiude subito.
  - Vale solo per la chiusura del primo giro; overdub e altri comandi restano immediati.

## Novità v1.33

- **½ SPEED sempre visibile** nella scheda LOOPER (ON/OFF) con avviso: se è ON la registrazione avviene a metà velocità e spegnendolo il loop suona al doppio. Prova sul Player del 25/09/2026: ½ SPEED **resta attivo anche dopo la cancellazione del loop**, quindi l'app non lo azzera più; il valore è ricordato sul telefono e si corregge con "NON CORRISPONDE? INVERTI".
- **Leggi parametri Looper** (ALTRO): invia solo letture di 125/88…94 e 127/52–53 per verificare se il Player comunica lo stato del Looper.
- Nomi completi dei tipi di effetto dalla documentazione Kemper (es. 19 = Soft Shaper, 132 = Analog Octaver).

## Novità v1.32

- **Nomi di Bank e slot dal Player**: quando si cambia Bank sul Player, il Player invia da solo (SysEx funzione `0x07`, non documentata) il nome della Bank e i nomi dei 5 slot, seguiti dal Program Change. L'app li associa alla Bank del Program Change, li mostra nella scheda RIG (nome dello slot grande, nome del Rig piccolo sotto) e li ricorda sul telefono. Scoperto nella diagnostica del 25/09/2026.

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
| `dist/index.html` | Schede PALCO, RIG, LOOPER, ALTRO e controlli |
| `dist/css/base.css` | Grafica comune: colori e misure (variabili), pagina, barra delle schede, pulsanti comuni, messaggi brevi |
| `dist/css/palco.css` | Grafica della scheda PALCO |
| `dist/css/rig.css` | Grafica della scheda RIG e della griglia Bank |
| `dist/css/looper.css` | Grafica della scheda LOOPER e dell'indicatore Looper in PALCO |
| `dist/css/tuner.css` | Grafica dell'accordatore a tutto schermo |
| `dist/css/altro.css` | Grafica della scheda ALTRO |
| `dist/css/tema-sole.css` | Tema SOLE: solo le differenze dal tema SCURO (caricato per ultimo) |
| `dist/app.js` | Accensione: collega i pulsanti alle funzioni dei moduli e avvia l'app |
| `dist/kemper-midi.js` | Protocollo: parser MIDI/SysEx, mapping effetti, costruttori di messaggi (anche beacon bidirezionale) |
| `dist/demo.js` | Kemper simulato per la modalità demo |
| `dist/js/config.js` | Nome, versione, tempi e chiavi di memoria del telefono |
| `dist/js/dom.js` | Riferimenti agli elementi della pagina, messaggi brevi |
| `dist/js/text.js` | Funzioni di solo calcolo: semitoni, sillabazione, colori delle categorie, note, mediana |
| `dist/js/state.js` | Stato condiviso (ciò che l'app sa del Player e dei comandi in corso) |
| `dist/js/views.js` | Schede e tema |
| `dist/js/screen.js` | Messaggi del Player → stato → schermata; stato del collegamento |
| `dist/js/connection.js` | Porte MIDI, accesso Web MIDI, invio delle richieste, schermo sempre acceso |
| `dist/js/bidi.js` | Modalità bidirezionale |
| `dist/js/sync.js` | Letture dal Player: completa, auto sync, dopo un cambio, conferme |
| `dist/js/rig.js` | Scelta di Bank e Rig, 125 Bank, griglia, colori, conferma del cambio |
| `dist/js/rig-names.js` | Nomi di Bank e Rig ricordati; AMP/CAB del Rig in uso |
| `dist/js/effects.js` | Gli 8 effetti del Rig |
| `dist/js/fixed-fx.js` | Fixed FX e Freeze del riverbero |
| `dist/js/tempo.js` | BPM, TAP, BPM INTERO |
| `dist/js/morph.js` | Morph |
| `dist/js/tuner.js` | Accordatore |
| `dist/js/looper.js` | Looper: comandi, stato stimato, aggancio al tempo, cerchio, posizione |
| `dist/js/looper-touch.js` | Pulsanti del Looper: pressione/rilascio, tocco vero, CANCELLA LOOP |
| `dist/js/diagnostics.js` | Registro dei messaggi e diagnostica |
| `dist/js/transpose.js` | Transpose −2…+2 in PALCO: scelta, conferma, valore mantenuto cambiando Rig (v1.64) |
| `dist/js/transpose-probe.js` | Prova "Leggi Transpose" (v1.61, sola lettura) |
| `dist/manifest.webmanifest` | PWA |
| `dist/sw.js` | Service worker e cache offline (elenco di **tutti** i file: un test lo controlla) |
| `dist/icon*.svg`, `dist/icon*.png` | Icone |
| `tests/midi.test.mjs` | Prove di protocollo, Looper, Morph, tempo, colori, 125 Bank |
| `tests/moduli.test.mjs` | Prove di bidirezionale, conferma cambio Rig, Tuner (v1.60), Transpose (v1.64) |
| `tests/struttura.test.mjs` | Cache offline, import, id della pagina (v1.60), file di grafica caricati (v1.63) |
| `tests/moduli.mjs` | Aiuti per i test (lettura dei moduli) |
| `tools/prova-registrata/` | Prova registrata prima/dopo (richiede Playwright; vedi il suo README) |
| `configurazione-sites/hosting.json` | Copia visibile della configurazione Site originale (directory `dist`) |
| `gitignore.txt` | Regole Git visibili; per usarle come esclusioni Git, rinominare in `.gitignore` |
| `docs/MIDI.md` | Tabella dei comandi e codici esadecimali |
| `docs/TESTING.md` | Prove hardware, limiti e problemi aperti |
| `docs/GITHUB.md` | Guida all'importazione su GitHub, cambio nome del repository e ripristino dei nomi tecnici |

Nessun backend, chiave o build: i file in `dist/` sono pubblicati così come sono. I moduli in `dist/js/` sono moduli JavaScript standard caricati direttamente dal browser.

## Avvio locale

```bash
python3 -m http.server 8000 --directory dist
```

Aprire <http://localhost:8000/> in un browser Web MIDI compatibile, con il Kemper connesso e permesso SysEx autorizzato. Usare `localhost` o HTTPS; non `file://`. Per eseguire i test: `node --test` dalla cartella principale (Node.js 20 o successivo).

**Controlli Looper:** i pulsanti sono momentanei, quindi inviano PRESS quando vengono premuti e RELEASE al rilascio, anche al cambio vista/perdita del focus. CANCELLA LOOP richiede un secondo di pressione; l'accessibilità via click richiede una conferma. Queste scelte d'interazione vanno provate con il Player prima dell'uso sul palco.

## Licenza

Non è stata scelta una licenza open source. Prima di pubblicare il repository al pubblico, decidere se aggiungere `LICENSE`; in mancanza, i diritti sul codice restano riservati.


## Strada verso la 2.0

1. **v1.4x** – grafica completata (cerchio Looper, icona, tema SOLE: fatto nella v1.41), nomi Bank completi (v1.41), pulizia tecnica (v1.41).
2. **Prova lunga** sul Player: una prova o un servizio intero (vedi `docs/TESTING.md`, "Prova lunga").
3. **Riordino del codice**: v1.60 JavaScript diviso in moduli (fatto), v1.61 ALTRO senza controlli doppi (fatto), v1.62 correzioni dopo la prova lunga (fatto), v1.63 `styles.css` riordinato per schermata (fatto). v1.64 Transpose −2…+2 in PALCO (fatto, da provare sul Player).
4. **v2.0 – pronta per il servizio**: scaletta del servizio (brani con Bank/Rig, BPM e note, avanti/indietro con un tocco), affidabilità dimostrata su entrambi i telefoni, guida d'uso di una pagina.
5. Dopo la 2.0: pedale MIDI Bluetooth.
