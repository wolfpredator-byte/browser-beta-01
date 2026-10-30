# VARCO Beta 0.23 — Aggiornamenti automatici, workspace eliminabili, giochi e app trovati da soli

Installer: `dist\VARCO Setup 0.23.0.exe`.

## Aggiornamenti automatici
- VARCO controlla le versioni pubblicate su GitHub (le **release** del repository) 30 secondi dopo l'avvio e poi ogni 6 ore.
- Se ne trova una nuova, la **scarica in background** e controlla che il file sia integro (dimensione e impronta SHA-256).
- Poi compare la notifica **"VARCO X è pronto"** con il pulsante **Riavvia e aggiorna**. Il pulsante resta anche nel centro notifiche.
- Premendolo:
  1. compare "Preparo VARCO X…": l'installer si sta scompattando, e può volerci un paio di minuti. VARCO intanto resta aperto e usabile;
  2. quando l'installer è pronto, VARCO si chiude da solo e compare una piccola finestra "Aggiorno VARCO…";
  3. i file vengono sostituiti in pochi secondi e VARCO si riapre.

  Schede, workspace e dati restano.
- Nulla si installa senza il tuo clic.
- Impostazioni → **Aggiornamenti**: versione attuale, **Controlla ora**, le novità della versione e l'interruttore "Controlla e scarica da solo".
- Funziona solo con VARCO installato, non con `npm start`.
- **Si attiva da questa versione in poi:** la 0.23 va installata a mano, poi le successive arrivano da sole.

**Perché serve la release su GitHub:** VARCO legge `releases/latest` del repository pubblico. Quando dici "Unisci e pusha", oltre al push creo la release `v0.23.0` con l'installer allegato.

## Eliminare un workspace
- Tasto destro su un workspace → **Elimina workspace…**, poi conferma. Prima non esisteva proprio un comando per farlo.
- Si chiudono le sue schede e spariscono note, disposizioni e sfondo del workspace. I comandi del progetto in esecuzione si fermano.
- **Non** viene toccata la cartella del progetto sul disco.
- La sua finestra passa a un workspace senza finestre aperte; se non ce n'è, si chiude.
- I giochi che aprivano quel workspace restano, senza workspace: assegnagliene uno nuovo.
- L'ultimo workspace rimasto non si può eliminare.

## Giochi e programmi trovati da soli
- **Giochi** → Aggiungi gioco → **Giochi installati…**.
  - Trovati da soli: i giochi di **Steam** (tutte le librerie, anche su altri dischi) e di **Epic Games**.
  - Scrivi per cercare. Scegliendo un gioco si compilano eseguibile e, se è vuoto, il nome.
- **Progetto** → Ambiente di lavoro → **Dai programmi installati…**. Elenca i programmi del **menu Start**, senza gli strumenti di Windows e senza disinstallatori o programmi di aggiornamento.
- **＋ Cartella…** aggiunge una cartella tua (per esempio `D:\Giochi` o `C:\Tools`). Ogni sottocartella diventa un programma, e VARCO ne sceglie l'eseguibile principale. Le cartelle valgono sia per i giochi sia per i programmi.
- **Aggiorna** ripete la ricerca. Il risultato resta in memoria 2 minuti.

## Piccole cose
- La schermata di caricamento all'avvio usa logo e colori del preset in uso.

## Modalità insegnamento
- **Perché non electron-updater:** il nostro installer è personalizzato (un'app Electron "portable"), non NSIS. Quindi l'aggiornamento lo fa lui stesso, con l'opzione `--update <cartella> --pid <processo>`:
  1. aspetta che quel VARCO si chiuda;
  2. copia i file;
  3. aggiorna la voce in "App installate";
  4. lo riapre.

  Se qualcosa va storto, il motivo è in `%TEMP%\varco-update.log`.
- **Eseguibile principale di una cartella:** vince il nome più simile alla cartella, poi il file più grande e meno profondo. Installer, crash reporter, anti-cheat e redistribuibili sono esclusi. Per i giochi Unreal sceglie `…-Win64-Shipping.exe`, che è il vero processo del gioco.
- **Steam** scrive le sue librerie in `libraryfolders.vdf` e un `appmanifest_*.acf` per ogni gioco, in un formato suo (KeyValues) che VARCO legge senza librerie esterne.

**Stato:** 133 test superati, di cui 11 nuovi: eliminazione dei workspace, scelta dell'eseguibile, file di Steam ed Epic, versioni e release. Provato:
- **aggiornamento completo**, con un VARCO impacchettato in una cartella di prova e una finta release "0.23.1" servita in locale (registro sotto una chiave di prova). Controllo automatico dopo 30 secondi, download con impronta verificata, notifica, VARCO aperto finché l'installer è pronto, file sostituiti, voce in "App installate" aggiornata e VARCO riaperto col suo profilo;
- **ricerca sul tuo PC:** 5 giochi Steam (Destiny 2 → `destiny2.exe`, Elden Ring → `eldenring.exe`, The Finals → `Discovery.exe`…) e 140 programmi dal menu Start;
- **eliminazione di un workspace** con la sua scheda: dati puliti, finestra passata a un altro workspace.

**Corretto durante le prove:**
- l'installer impiega circa 2 minuti a scompattarsi: prima VARCO spariva subito e sembrava rotto, ora aspetta l'installer;
- dopo l'aggiornamento VARCO si riapriva senza il profilo con cui era avviato;
- nel centro notifiche mancava il pulsante "Riavvia e aggiorna";
- tra i programmi comparivano gli strumenti di Windows e programmi come "EA app Updater".

## Test da fare
- [ ] **T128** — Tasto destro su un workspace di prova → Elimina workspace…: conferma, sparisce con le sue schede. Il workspace attivo passa a un altro.
- [ ] **T129** — Giochi → Aggiungi gioco → Giochi installati…: cerca "destiny", sceglilo. Eseguibile `destiny2.exe` e nome compilati. **📸**
- [ ] **T130** — ＋ Cartella… con una tua cartella di giochi o programmi: compaiono le sue sottocartelle.
- [ ] **T131** — Progetto → Ambiente di lavoro → Dai programmi installati…: aggiungi VS Code (o un altro) dall'elenco.
- [ ] **T132** — Impostazioni → Aggiornamenti: "VARCO 0.23.0 è l'ultima versione" (dopo la release su GitHub). **📸**
- [ ] **T133** — Con un preset attivo, riavvia VARCO: la schermata di caricamento ha il logo del preset.
- [ ] **T134** — Quando uscirà la 0.24: arriva la notifica, premi Riavvia e aggiorna e VARCO si riapre aggiornato.
