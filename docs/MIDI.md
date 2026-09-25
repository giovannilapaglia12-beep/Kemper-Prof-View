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
