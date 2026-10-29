# VARCO Beta 0.16 — Installer personalizzato

Installer: `dist\VARCO Setup 0.16.0.exe` (91 MB), costruito con **`npm run setup`**.
Quello classico resta disponibile con `npm run dist` → `VARCO Setup 0.16.0 (classico).exe`.

**Risultato dei test della 0.15.1:** permessi a posto, unita a `main`.

## L'installer (mock-up *Futuristic Installer Walkthrough*)

Sei schermate con lo sfondo del fiordo e il vetro VARCO:

1. **Benvenuto:** logo e motto a sinistra; a destra le quattro caratteristiche. Se c'è già una versione installata (anche il vecchio "Personal Browser"), lo dice: *"Verrà sostituito; workspace, schede e impostazioni restano."*
2. **Licenza:** testo d'uso personale e casella "Ho letto e accetto". *Avanti* resta spento finché non la spunti.
3. **Destinazione:** cartella proposta `%LOCALAPPDATA%\Programs\VARCO`, *Sfoglia…*, spazio richiesto e spazio libero sul disco.
4. **Opzioni:**
   - collegamento sul desktop;
   - menu Start;
   - **VARCO come browser predefinito**;
   - **collegamento con JARVIS**, che accende il server MCP;
   - lingua (solo italiano, per ora).
5. **Installazione:** barra di avanzamento e passaggi che si spuntano uno alla volta:
   - rimozione della versione precedente;
   - estrazione dei file;
   - componenti;
   - configurazione;
   - collegamenti;
   - finalizzazione.
6. **Completato:** *Avvia VARCO*, *Chiudi* e "Avvia VARCO al termine". Se è un aggiornamento: "Aggiornamento completato! I tuoi dati sono al loro posto."

Tutto vale solo per il tuo utente: niente permessi di amministratore.

### Cosa fa quando aggiorni da una versione installata con l'installer classico
- Se VARCO è aperto (anche solo nell'area di notifica), chiede di chiuderlo: schede e impostazioni sono già salvate.
- Disinstalla in silenzio la versione vecchia e cancella la sua cartella.
  - Oggi la tua è in `Programs\Personal Browser\VARCO`, retaggio del vecchio nome.
  - La cartella `Personal Browser` viene tolta se resta vuota.
- Installa nella cartella nuova. **I dati in `%APPDATA%\personal-workspace-browser` non vengono toccati.**

### Browser predefinito
Windows non permette più ai programmi di impostarsi da soli come predefiniti. L'installer quindi:
- registra VARCO tra i browser;
- alla fine apre *Impostazioni → App predefinite* con VARCO già in evidenza: lì basta un clic per sceglierlo per http e https.

Da quel momento i link aperti da altri programmi (Discord, email, documenti…) arrivano **in una nuova scheda** della finestra in primo piano, anche se VARCO è già aperto.

### Disinstallazione
Da *Impostazioni → App installate → VARCO → Disinstalla* si apre una piccola finestra VARCO:
- "Disinstallare VARCO?", con la casella **"Elimina anche i miei dati"** (spenta di base);
- toglie collegamenti, voci di registro, avvio con Windows e registrazione come browser;
- la cartella del programma (e i dati, se l'hai chiesto) viene cancellata subito dopo la chiusura della finestra.

Se VARCO è ancora aperto, la finestra lo dice e non procede.

## Modalità insegnamento
- **Un installer fatto con VARCO stesso.** L'installer è una piccola app Electron (cartella `setup\`) distribuita come eseguibile *portable*: Windows la estrae in una cartella temporanea e la avvia.
  - Per non portarsi dietro due motori Electron, l'installazione **copia il motore dell'installer** (`VARCO Setup.exe` → `VARCO.exe`, dll, pak) e ci aggiunge l'app del browser, che viaggia in `resources\payload\app.asar`.
  - Per questo pesa 91 MB invece dei 103 dell'installer classico.
- **`original-fs`:** per Electron i file `.asar` sono cartelle virtuali. Per copiarli come file normali l'installer usa il file system "grezzo".
- **`windowsVerbatimArguments`:** Node aggiunge barre rovesciate alle virgolette degli argomenti, e `cmd.exe` non le capisce. Disinstallatore vecchio e cancellazione della cartella ricevono quindi la riga di comando scritta a mano.
- **Modalità di prova `VARCO_SETUP_TEST=<cartella>`:**
  - registro sotto `HKCU\Software\VARCO-SetupTest`;
  - collegamenti nella cartella indicata;
  - nessuna versione precedente toccata, VARCO vero lasciato aperto.

  Così ho provato tutto senza cambiare la tua installazione.

## Test da fare

- [x] **T80** — Avvia `VARCO Setup 0.16.0.exe`. Benvenuto mostra "Trovato: VARCO 0.15.0. Verrà sostituito…". **📸**.
- [x] **T81** — Licenza → Destinazione (lascia quella proposta) → Opzioni (spunta "browser predefinito") → Installa. Se chiede di chiudere VARCO, conferma. **📸** dell'avanzamento.
- [x] **T82** — Fine: "Aggiornamento completato!" → si apre la pagina App predefinite: scegli VARCO. Avvia VARCO: workspace, schede e preferiti ci sono tutti.
- [x] **T83** — In *App installate* c'è **un solo** VARCO (0.16.0). La cartella `Programs\Personal Browser` non c'è più.
- [x] **T84** — Da Discord o da un'email clicca un link: si apre in una nuova scheda di VARCO.
- [x] **T85** — Collegamento sul desktop e nel menu Start, con l'icona VARCO.
- [x] **T86** — Se avevi "Avvia con Windows" acceso, controlla in Impostazioni → Avvio e background: la vecchia voce puntava al programma nella cartella vecchia. Se è spenta, riaccendila.

**Risultato dei tuoi test:** tutto funziona. Installata sopra la 0.15.0: nel registro c'è un solo VARCO (0.16.0), la cartella `Programs\Personal Browser` non esiste più, il programma è in `Programs\VARCO` e i dati sono al loro posto. Quindi anche la rimozione automatica della versione classica funziona sul PC vero.

**Stato:** 103 test superati. Provato in modalità di prova:
- tutte e sei le schermate (con le foto);
- installazione completa: file, collegamenti sul desktop e nel menu Start, voce di disinstallazione nel registro;
- il **VARCO installato si avvia** (BETA 0.16) e apre il link passato da Windows; un secondo link con VARCO già aperto arriva in una nuova scheda;
- disinstallazione con "Elimina anche i miei dati": registro, collegamenti, cartella del programma e dati del profilo cancellati;
- l'eseguibile portable si apre in circa 3 secondi.

**Corretti durante le prove:**
- la copia si fermava al 27%: i file `.asar` venivano trattati come cartelle;
- i passaggi successivi comparivano già spuntati;
- il pulsante "riduci a icona" era un quadrato;
- la cartella del programma non veniva cancellata alla disinstallazione (virgolette).

**Non provato (non si poteva senza toccare il tuo PC):** la rimozione automatica della tua versione installata con l'installer classico. La riga di comando che le serve l'ho verificata a parte. Se dopo l'aggiornamento vedessi ancora "VARCO 0.15.0" tra le app, disinstallalo da lì: i dati restano.

**Non fatto dal mock-up:**
- "Aggiungi alla barra delle applicazioni": Windows non permette ai programmi di farlo. Dopo il primo avvio: click destro sull'icona → *Aggiungi alla barra delle applicazioni*.
- "Associa i principali tipi di file web": VARCO oggi non apre file locali (solo indirizzi http/https), quindi l'associazione non avrebbe senso. Lo aggiungo quando servirà.
- Altre lingue oltre all'italiano.
