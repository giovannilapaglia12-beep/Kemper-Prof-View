# Verifiche hardware, test locali e problemi aperti — v1.30

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
