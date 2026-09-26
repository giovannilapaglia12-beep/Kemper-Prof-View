# Verifiche hardware, test locali e problemi aperti — v1.38

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
