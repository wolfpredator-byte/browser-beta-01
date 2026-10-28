# Browser Beta 0.9.1 — Correzioni dai test e funzioni di base

Nasce dai test dell'eseguibile 0.9.0 (`TEST_ESEGUIBILE.md`). Installer: `dist\Personal Browser Setup 0.9.1.exe` (si installa sopra la 0.9.0, i dati restano).

## Cosa cambia

1. **Download: una sola domanda.** Prima comparivano insieme "Vuoi salvare questo file?" e la finestra "Salva con nome" di Windows. Ora c'è solo la domanda; il file intanto si scarica in una cartella temporanea e, dopo la risposta, viene spostato in Download (o cancellato se annulli).
2. **Login Google.** Sulle sole pagine `accounts.google.com` il browser si presenta come Firefox, che Google accetta. Su tutti gli altri siti resta un normale Chrome.
3. **Cerca nella pagina** con `Ctrl+F`: la barra degli indirizzi diventa la barra di ricerca, con "3 di 12", `Invio`/`Shift+Invio` per avanti/indietro ed `Esc` per chiudere.
4. **Zoom** con `Ctrl +`, `Ctrl -`, `Ctrl 0`. Quando non è al 100%, nella barra compare la percentuale: un clic la riporta al 100%.
5. **Stampa** con `Ctrl+P`.
6. **Icone dei siti** sulle schede e un **cerchio che gira** mentre la pagina carica. Le icone piccole sono salvate con la sessione, così anche le schede dormienti le mostrano.
7. **Home:** la barra degli indirizzi non mostra più `app://home`.
8. **Pannello Download:** **Apri** e **Mostra nella cartella** a download finito, **Annulla** durante, **Svuota elenco**, e un pallino verde sul pulsante ↓ mentre si scarica.

## Modalità insegnamento

### Perché comparivano due finestre (`download-rules.cjs`, `web-session.cjs`)
Electron apre la sua finestra "Salva con nome" se, **dentro** l'evento `will-download`, nessuno ha deciso la destinazione. Il vecchio codice aspettava la tua risposta (`await`) e solo dopo chiamava `setSavePath`: troppo tardi. Ora `setSavePath` punta subito a `%TEMP%\personal-browser-downloads`, e `nextStep({decision, finished})` decide cosa fare qualunque cosa arrivi prima, la tua risposta o la fine del download:

| Risposta \ Download | in corso | finito | interrotto |
|---|---|---|---|
| nessuna ancora | aspetta | aspetta | niente |
| Salva | aspetta | **sposta** nella destinazione | niente |
| Annulla | **interrompi** | **cancella** il file temporaneo | niente |

Lo spostamento prova `rename` e, se la cartella Download è su un altro disco, copia e cancella.
Durante i test è emerso anche un caso nascosto: un nome con `:` (es. `a:b.txt`) veniva letto da Windows come un'unità disco. `safeFilename` ora divide il nome solo su `/` e `\`.

### Identità Firefox solo per Google (`web-rules.cjs`, `page-preload.cjs`)
Google riconosce i browser basati su Electron anche con lo user agent di Chrome. Per sembrare davvero Firefox servono tre cose coerenti, tutte limitate ad `accounts.google.com`:
- **intestazioni:** `User-Agent` di Firefox e niente `Sec-CH-UA*` (Firefox non le invia): `firefoxHeaders()`;
- **pagina:** `navigator.userAgent` di Firefox: `applyIdentity()` cambia lo user agent della scheda (e dei popup) quando entra in quel sito e lo ripristina quando esce;
- **`navigator.userAgentData`:** Firefox non ce l'ha. `page-preload.cjs` lo nasconde prima che partano gli script di Google. È l'unico script che il browser aggiunge alle pagine web, e altrove non fa nulla.

### La trappola di `findNext`
In `webContents.findInPage(testo, {findNext})` di Electron, `findNext: true` **avvia** una nuova ricerca e `false` passa al risultato successivo. Il nome suggerisce il contrario: nei primi test la prima ricerca non mostrava il conteggio. È documentato nel comando `findInPage`.

### Icone senza aprire la cornice a Internet
La cornice ha una CSP che le vieta di caricare immagini da Internet. Le icone le scarica il processo principale (`loadFavicon`, massimo 100 KB, solo `image/*`) e le passa come `data:`; una cache evita di riscaricarle.

## Test da rifare

- [ ] **T11** — "Accedi con Google" (es. su YouTube): l'accesso deve riuscire. **📸** se compare ancora "This browser or app may not be secure".
- [ ] **T12** — Scarica un'immagine (click destro → Salva immagine con nome…): **una sola** finestra, la domanda. **Salva** → il file è in Download; **Annulla** → nessun file.
- [ ] **T12b** — Pannello Download: **Apri**, **Mostra nella cartella**, **Svuota elenco**.
- [ ] **T38** — `Ctrl+F` su una pagina, cerca una parola: conteggio, `Invio`, `Shift+Invio`, `Esc`.
- [ ] **T39** — `Ctrl +` due volte: compare "120%"; un clic lo riporta al 100%.
- [ ] **T40** — `Ctrl+P` apre la stampa di Windows.
- [ ] **T41** — Le schede mostrano l'icona del sito e il cerchio mentre caricano. **📸** della barra delle schede.

**Stato:** 86 test superati. Provato nell'app su un profilo di prova: segnaposto della Home, cerchio di caricamento e icona di GitHub, ricerca "1 di 34" → avanti/indietro → "Nessun risultato" → `Esc`, zoom 120% e ritorno al 100%, download con risposta "Salva" (file in Download, cartella temporanea vuota) e "Annulla" (nessun file), pagina di accesso Google con identità Firefox coerente (intestazioni, `navigator.userAgent`, niente `userAgentData`) e GitHub con identità Chrome. Pacchetto controllato: contiene `page-preload.cjs` e `download-rules.cjs`.
**Non provato:** l'accesso Google vero (serve il tuo account) e la finestra di stampa.

## 0.9.2 — dopo i test della 0.9.1

- **Cerchio di caricamento schiacciato:** la regola delle prime beta `.tab span{flex:1}` stirava ogni `span` della scheda, compreso il cerchio. Ora `.tab span.tab-spinner` (più specifica) lo tiene a 13×13 px.
- **Login Google e passkey:** con l'identità Firefox Google mostrava la pagina di accesso, ma provava subito una passkey e Windows rispondeva "Something went wrong". Su `accounts.google.com` (solo lì) `page-preload.cjs` ora nasconde le passkey: `PublicKeyCredential` non esiste e le richieste WebAuthn vengono rifiutate prima di arrivare a Windows. Google usa il flusso classico: email, password, eventuale conferma sul telefono.

**Risultato sul tuo PC (installer 0.9.2):** accesso Google riuscito (T11) e cerchio di caricamento corretto (T41). Gli altri test della 0.9.1 erano già superati.
Se un giorno Google tornasse a rifiutare l'accesso, il punto da cui ripartire è `page-preload.cjs` insieme a `FIREFOX_UA` in `lib/web-rules.cjs`.
