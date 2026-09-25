# Importare Kemper Stage View v1.29 su GitHub

Questo archivio è un repository sorgente completo: estrarlo e usare la cartella `Kemper-Stage-View/`. La v1.29 è direttamente in `dist/`; non occorre spostare una bozza o una versione precedente.

## Con Git (consigliato)

1. Accedere a <https://github.com/new> e creare un repository vuoto, preferibilmente **privato**, senza aggiungere README, `.gitignore` o licenza dal sito.
2. Copiare l'URL HTTPS del nuovo repository e, dentro la cartella estratta, eseguire:

```bash
cd Kemper-Stage-View
git init -b main
git add .
git commit -m "Import Kemper Stage View v1.29"
git remote add origin https://github.com/TUO-UTENTE/kemper-stage-view.git
git push -u origin main
```

Se Git chiede identità, usare `git config user.name "Nome"` e `git config user.email "email@example.com"`. Usare GitHub CLI o un credential manager per l'autenticazione, senza salvare token nel progetto.

## Dal browser

Creare lo stesso repository vuoto, scegliere **Add file → Upload files**, quindi caricare **tutti i file interni** alla cartella estratta, conservando i percorsi `dist/`, `docs/`, `tests/` e `configurazione-sites/`. Lo ZIP non contiene nomi che iniziano con un punto: anche configurazione e regole Git sono visibili.

## Continuazione dello sviluppo

```bash
node --test tests/midi.test.mjs
python3 -m http.server 8000 --directory dist
```

Aprire <http://localhost:8000/> e, prima di modificare o pubblicare comandi Looper, testare col Player Level III le azioni press/release e la cancellazione. Aggiornare `docs/TESTING.md` con i risultati reali. Cambiare la stringa `CACHE` in `dist/sw.js` a ogni successiva release per invalidare la cache PWA.

## Indirizzo Sites

GitHub e Sites sono due destinazioni separate. `configurazione-sites/hosting.json` conserva il **project ID del Site esistente**: ripristinarlo in `.openai/hosting.json` prima di usare la pubblicazione Sites e mantenere lo stesso ID se si vuole mantenere <https://kemper-stage-view.giovannilapaglia.chatgpt.site>. Un push sul nuovo GitHub non avvia da solo un deploy Sites; un eventuale GitHub Pages avrebbe un altro indirizzo. Non pubblicare token, esportazioni diagnostiche private o credenziali.

## Ripristinare i due nomi tecnici, quando servono

La versione pronta per essere caricata dal browser GitHub usa soltanto nomi visibili:

| Nel nuovo ZIP | Nome richiesto dal software | Quando serve |
| --- | --- | --- |
| `configurazione-sites/hosting.json` | `.openai/hosting.json` | Prima di una nuova pubblicazione con Sites sul progetto originale |
| `gitignore.txt` | `.gitignore` | Per attivare le regole di esclusione di Git |

Dopo l'importazione, GitHub permette **Add file → Create new file**: creare il file `.openai/hosting.json` incollando *integralmente* il contenuto di `configurazione-sites/hosting.json`, e creare `.gitignore` incollando il contenuto di `gitignore.txt`. Si può conservare anche la copia visibile, così è semplice ritrovare entrambi. Oppure in una copia locale del repository:

```bash
mkdir -p .openai
cp configurazione-sites/hosting.json .openai/hosting.json
cp gitignore.txt .gitignore
git add .openai/hosting.json .gitignore
git commit -m "Ripristina configurazione Sites e gitignore"
git push
```

Questa operazione non è richiesta per avviare l'app da `dist/` o per caricare lo ZIP su GitHub.
