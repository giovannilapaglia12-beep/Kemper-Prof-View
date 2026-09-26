# Protocollo MIDI effettivamente usato dal codice

I byte sono in esadecimale, separati da spazi. `B0`/`C0` sono MIDI canale 1; nel codice il nibble inferiore cambia in base al canale ricevuto (`B1`/`C1` per il canale 2 e così via). `VV` è un valore 7 bit, `HH LL` sono le parti alto/basso di un valore a 14 bit: `valore=128×HH+LL`. `PP` è un numero programma zero-based. Il prefisso delle richieste/comandi SysEx è `F0 00 20 33 02 7F`; le risposte nei log del Player spesso iniziano `F0 00 20 33 00 00`. I codici qui descrivono **i messaggi generati dal software**, non l'intero protocollo Kemper.

## Letture SysEx

| Dato richiesto | Messaggio trasmesso |
| --- | --- |
| Nome Rig | `F0 00 20 33 02 7F 43 00 00 01 F7` |
| Tempo raw, pagina 4/0 | `F0 00 20 33 02 7F 41 00 04 00 F7` |
| Morph, pagina 0/11 | `F0 00 20 33 02 7F 41 00 00 0B F7` |
| Modalità Tuner, pagina 127/126 | `F0 00 20 33 02 7F 41 00 7F 7E F7` |
| Nota Tuner, pagina 125/84 | `F0 00 20 33 02 7F 41 00 7D 54 F7` |
| Segnale Tuner, pagina 124/81 | `F0 00 20 33 02 7F 41 00 7C 51 F7` |
| Freeze REV, pagina 125/115 | `F0 00 20 33 02 7F 41 00 7D 73 F7` |

Per i moduli sotto, `Type` = `F0 00 20 33 02 7F 41 00 <pagina> 00 F7`; `On/Off` = `F0 00 20 33 02 7F 41 00 <pagina> 03 F7`. Il parser legge risposte tipo 01 (parametro), 03 (stringa) e 3C (valore reso in testo). Esempio di risposta di stato REV attivo: `F0 00 20 33 00 00 01 00 3D 03 00 01 F7`; di nome Rig la stringa ASCII inizia dopo `... 03 00 00 01` e termina con `00 F7`.

| Modulo | Pagina hex | CC ON | CC OFF |
| --- | --- | --- | --- |
| A | `32` | `B0 11 01` | `B0 11 00` |
| B | `33` | `B0 12 01` | `B0 12 00` |
| C | `34` | `B0 13 01` | `B0 13 00` |
| D | `35` | `B0 14 01` | `B0 14 00` |
| X | `38` | `B0 16 01` | `B0 16 00` |
| MOD | `3A` | `B0 18 01` | `B0 18 00` |
| DLY | `3C` | `B0 1B 01` | `B0 1B 00` |
| REV | `3D` | `B0 1D 01` | `B0 1D 00` |

## Scritture SysEx

Schema generale: `F0 00 20 33 02 7F 01 00 <pagina> <parametro> <HH> <LL> F7`. Per stati booleani, OFF=`00 00`, ON=`00 01`. L'app chiede poi la lettura del parametro per conferma.

| Controllo | Lettura | ON | OFF |
| --- | --- | --- | --- |
| Pure Booster (5/16) | `F0 00 20 33 02 7F 41 00 05 10 F7` | `F0 00 20 33 02 7F 01 00 05 10 00 01 F7` | `F0 00 20 33 02 7F 01 00 05 10 00 00 F7` |
| Vintage Chorus (5/26) | `F0 00 20 33 02 7F 41 00 05 1A F7` | `F0 00 20 33 02 7F 01 00 05 1A 00 01 F7` | `F0 00 20 33 02 7F 01 00 05 1A 00 00 F7` |
| Transpose (5/1) | `F0 00 20 33 02 7F 41 00 05 01 F7` | `F0 00 20 33 02 7F 01 00 05 01 00 01 F7` | `F0 00 20 33 02 7F 01 00 05 01 00 00 F7` |
| Double Tracker (5/41) | `F0 00 20 33 02 7F 41 00 05 29 F7` | `F0 00 20 33 02 7F 01 00 05 29 00 01 F7` | `F0 00 20 33 02 7F 01 00 05 29 00 00 F7` |
| Freeze REV (125/115) | `F0 00 20 33 02 7F 41 00 7D 73 F7` | `F0 00 20 33 02 7F 01 00 7D 73 00 01 F7` | `F0 00 20 33 02 7F 01 00 7D 73 00 00 F7` |

Il tempo raw si scrive con `F0 00 20 33 02 7F 01 00 04 00 HH LL F7`, dove 64 unità = 1 BPM secondo la convenzione usata dall'app. Per esempio 67 BPM (`4290` raw letto nel log è circa 67.03125) si normalizza a 4288=`21 40`, quindi `F0 00 20 33 02 7F 01 00 04 00 21 40 F7`. Una variazione di un BPM somma/sottrae 64 al valore raw; `BPM INTERO` arrotonda `raw/64` all'intero. Il messaggio di richiesta della rappresentazione leggibile per tempo è `F0 00 20 33 02 7F 7C 00 04 00 HH LL F7`; esempio raw 4290: `F0 00 20 33 02 7F 7C 00 04 00 21 42 F7`.

## CC, Morph, Tuner, Program Change

| Azione | Byte canale 1 | Stato di verifica |
| --- | --- | --- |
| TAP | `B0 1E 00` (CC30, ripetuto a ogni tocco) | Invio e risposte tempo nei log |
| Morph BASE | `B0 0B 00` (CC11=0) | Comando nella v1.28; stato raw0 ricevuto |
| Morph 100% | `B0 0B 7F` (CC11=127) | Schema nel codice, transizione completa da verificare nei log forniti |
| Morph intermedio (v1.29) | `B0 0B VV`, VV=round(percentuale×127/100), 1–126 | Test locale del comando; non provato sul Player |
| Tuner apertura/chiusura | `B0 1F 01` / `B0 1F 00` (CC31) | Modo chiuso letto; controlli apertura da verificare nei log |
| Scelta Rig | `C0 PP`, PP=(Bank−1)×5+(Rig−1), Bank 1…10 e Rig 1…5 | Esempio Bank 9 Rig 4 → PP=43=`2B`, messaggio `C0 2B`; log conferma risposta PC |

Lettura Morph `0/11` restituisce un numero da 0 a 16383 (0=BASE; 16383=MORPH). L’app attende una conferma entro una tolleranza di quantizzazione. I Program Change esterni sono ricevuti e aggiornano la selezione, ma un semplice nome Rig non basta per determinare il numero Bank/Rig.

## LOOPER: v1.29, non verificato sull'hardware

La v1.29 invia per **ogni** pressione quattro Control Change sul canale corrente:

`B0 63 7D` (CC99=125), `B0 62 XX` (CC98=parametro), `B0 06 00` (CC6=0), `B0 26 01` (CC38=1). Al rilascio ripete indirizzo e MSB con `B0 26 00`. Questi sono NRPN della pagina 125, parametri:

| Azione | XX hex | Sequenza esempio press (canale 1) |
| --- | --- | --- |
| REC / PLAY / OVERDUB | `58` (88) | `B0 63 7D` `B0 62 58` `B0 06 00` `B0 26 01` |
| STOP | `59` (89) | `B0 63 7D` `B0 62 59` `B0 06 00` `B0 26 01` |
| TRIGGER | `5A` (90) | `B0 63 7D` `B0 62 5A` `B0 06 00` `B0 26 01` |
| REVERSE | `5B` (91) | `B0 63 7D` `B0 62 5B` `B0 06 00` `B0 26 01` |
| HALF SPEED | `5C` (92) | `B0 63 7D` `B0 62 5C` `B0 06 00` `B0 26 01` |
| UNDO / REDO | `5D` (93) | `B0 63 7D` `B0 62 5D` `B0 06 00` `B0 26 01` |
| ERASE | `5E` (94) | `B0 63 7D` `B0 62 5E` `B0 06 00` `B0 26 01` |

La UI fa seguire la sequenza di rilascio (`CC38=0`) al termine del tocco; ERASE richiede una pressione di 1 secondo, oppure conferma nel percorso click assistivo. Sono codici **implementati**, non codici confermati dal Player in questa sessione. In particolare bisogna verificare che la semantica del dato CC6/CC38 corrisponda davvero al firmware Player Level III usato; non vi è un feedback di stato Looper nel codice.

## Riferimenti del protocollo Looper

- [Documentazione ufficiale Kemper: download dei manuali e MIDI Parameter Documentation](https://www.kemper-amps.com/downloads/5/User-Manuals).
- [Forum Kemper: risposta ufficiale su funzioni Looper e NRPN](https://forum.kemper-amps.com/forum/thread/64104-using-external-4-switches-to-control-all-looper-functions-also-loop-volume/?postID=682503).
- [Forum Kemper: test con Player III per Undo e sequenze PRESS/RELEASE](https://forum.kemper-amps.com/forum/thread/66591-midi-to-undo-in-the-looper/?postID=706518). Le risposte del forum sono un riferimento aggiuntivo: la prova sul Player dell’utente resta necessaria.


## Nomi di Bank e slot inviati dal Player (v1.32)

Osservato sul Player dell'utente il 25/09/2026, non presente nella documentazione ufficiale. Al cambio Bank sul Player arrivano sei messaggi, poi `B0 00 00`, `B0 20 00` e il Program Change:

```
F0 00 20 33 00 00 07 00 00 00 01 00 <indice> <testo ASCII> 00 F7
```

| Indice | Contenuto | Esempio reale |
| --- | --- | --- |
| `00` | Nome Bank | `RT FIRESPIT` |
| `01`…`05` | Nome slot 1…5 | `Clean`, `Edge`, `Breakup`, `Drive`, `Swells` |

Il Program Change che segue (es. `C0 2A` = 42 → Bank 9, slot 3) indica a quale Bank appartengono i nomi. Da verificare se il Player invia questi messaggi anche quando è l'app a cambiare Bank.


## Parametri Looper leggibili (verificato 26/09/2026, v1.35)

Lettura `F0 00 20 33 02 7F 41 00 <pagina> <parametro> F7`:

| Parametro | Risposta osservata | Significato |
| --- | --- | --- |
| 125/88…94 (Rec, Stop, Trigger, Reverse, ½ Speed, Undo, Erase) | sempre 0 | Sono "pulsanti" (press/release), non stati: lo stato del loop **non** è leggibile |
| 127/52 Looper Volume | 14987 (su 16383) | Volume del loop |
| 127/53 Looper Location | Output = **1**, Input = **0** | Posizione del Looper nel percorso del segnale |

Scrittura Location (v1.36): `F0 00 20 33 02 7F 01 00 7F 35 00 <00|01> F7`, poi rilettura per conferma.


## Modalità bidirezionale (v1.37, da verificare sul Player)

Non descritta nella documentazione ufficiale Kemper (funzione `0x7E` "reserved"); formato ripreso dal firmware open source PySwitch per MIDI Captain, che lo usa con i Kemper Player.

**Beacon inviato dall'app** (all'avvio e ogni 5 s finché il Player non risponde; poi rinnovo ogni 12 s):

```
F0 00 20 33 02 7F 7E 00 40 <set> <flag> <lease> F7
```

| Byte | Valore usato | Significato |
| --- | --- | --- |
| set | `02` | Insieme di parametri: tipo e stato effetti A, B, C, D, X, MOD; nome Rig; Tuner (modo, nota, intonazione) |
| flag | `03` al primo invio, poi `02` | bit0 INIT = invia subito tutti i parametri del set; bit1 SYSEX = usa SysEx invece di NRPN; (bit2 ECHO, bit3 NOFE, bit4 NOCTR, bit5 TUNEMODE non usati) |
| lease | `0F` | Validità in passi di 2 s = 30 s; senza rinnovo il Player smette da solo |

Esempi: primo beacon `F0 00 20 33 02 7F 7E 00 40 02 03 0F F7`, rinnovo `F0 00 20 33 02 7F 7E 00 40 02 02 0F F7`.

**Sensing dal Player** (circa ogni 500 ms mentre il beacon è valido): `F0 00 20 33 00 00 7E 00 7F … F7`. Se manca per più di 4 s l'app considera il collegamento perso (durante il caricamento di un Rig il Player lo sospende per circa 2 s).

**Parametri inviati spontaneamente** (stesso formato delle risposte, funzione `01` per i valori e `03` per le stringhe). Attesi secondo PySwitch:

| Parametro | Indirizzo |
| --- | --- |
| Nome Rig | stringa 0/1 |
| Tipo / stato effetti A–MOD | 50…58/0 e /3 (pagine `32`–`3A`) |
| Modo Tuner | 127/126 |
| Nota Tuner | 125/84 |
| Intonazione Tuner | 124/15 (0 … 16383, centro 8192) |
| Battito del tempo | 124/0 (valore > 0 sul movimento) |

L'app non si fida dell'elenco: considera "inviato dal Player" ogni parametro che arriva senza una lettura dell'app nei 350 ms precedenti (dopo il beacon INIT l'app sospende le letture per 700 ms, così l'invio iniziale del Player si riconosce). Solo quei parametri escono dalle letture periodiche; il riepilogo è in ALTRO e nella diagnostica (`bidirectional.pushedByPlayer`).


### Verificato sul Player (26/09/2026, diagnostica v1.37)

- Beacon accettato: sensing dopo 2 s, poi circa 2 messaggi al secondo. Prima del beacon è arrivato un solo sensing (probabilmente il resto di una sessione precedente ancora valida).
- Parametri inviati dal Player senza richiesta (molto più del set 2 atteso): nome Rig; tipo e stato di **tutti** gli effetti A, B, C, D, X, MOD, DLY, REV; Fixed FX (5/1, 5/16, 5/26, 5/41); Freeze REV 125/115; BPM 4/0; Morph 0/11; Looper Location 127/53; Tuner 127/126; nota 125/84 e intonazione 124/15 e 124/81 (inviate di continuo anche con Tuner chiuso); battito 124/0 (1 sul movimento, poi 0).
- I comandi inviati dall'app tornano confermati dal Player in circa 25 ms anche **senza** il flag ECHO.
- Alcuni parametri vengono ripetuti periodicamente anche senza cambiamenti (BPM, Morph, DLY/REV, Double Tracker: circa 1,5 al secondo).
- All'avvio (INIT) l'ordine è: stato dei parametri, `B0 2F 7F`, `B0 00 00`, `B0 20 00`, Program Change, cinque messaggi funzione `06` (`F0 00 20 33 02 00 06 00 00 00 01 00 0N 00 00 00 00 01 F7`, N = 0…4, significato sconosciuto), poi **nome Bank e 5 nomi slot** (funzione `07`).
- Altri parametri visti, non usati dall'app: 4/2, 127/125, 50…61/30, 74/2 e 75/2 (seguono lo stato di DLY e REV).
- Durante il caricamento di un Rig il sensing si interrompe per circa 2 s.
- Richieste dell'app: da circa 450 a 49 al minuto.

### Verificato sul Player (26/09/2026, diagnostica v1.38)

- All'apertura del Tuner (dal Player o con CC31 dall'app) il Player invia `B0 2F 7F`, `B0 00 00`, `B0 20 00`, il Program Change **del Rig già in uso** e poi `127/126 = 1`. Alla chiusura invia solo `127/126 = 3`.
- Con il Tuner aperto: nota 125/84 (0 senza segnale; alcuni valori spuri come 9830 o G1, scartati dal filtro dell'app) e intonazione 124/15 e 124/81, stessa scala (centro 8192, circa 82 unità per cent).
- Dalla v1.39, con la modalità bidirezionale attiva, dopo un Program Change l'app non rifà la lettura completa: legge solo i valori ancora sconosciuti.


## Nomi della Bank in uso (v1.41)

Richiesta (stringa estesa, funzione `47`), una per nome:

```
F0 00 20 33 02 7F 47 00 00 00 01 00 <N> F7      N = 00 nome Bank, 01…05 nomi degli slot
```

Il Player risponde con la funzione `07` (lo stesso formato che invia da solo al cambio Bank dal Player). Indirizzi non documentati da Kemper, trovati dagli utenti del forum Kemper. Osservato il 26/09/2026: cambiando Bank dall'app il Player invia da solo solo il nome della Bank e quello dello slot 2; l'app ora chiede gli altri se mancano.
