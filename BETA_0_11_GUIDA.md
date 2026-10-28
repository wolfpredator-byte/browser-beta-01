# Browser Beta 0.11 — Palette dei comandi e Impostazioni

Installer: `dist\Personal Browser Setup 0.11.0.exe` (si installa sopra, i dati restano).

## Cosa cambia

1. **Palette dei comandi**: si apre con **F1**, **Ctrl+Shift+P** (come in VS Code) o con il pulsante **⌘** nella barra in alto. Scrivi e scegli con ↑↓ e Invio; Esc chiude. Trova:
   - **schede di tutti i workspace e di tutte le finestre**: scegliendone una vai alla sua finestra, e se è chiusa la riapre;
   - **comandi** con la loro scorciatoia (nuova scheda, cerca nella pagina, zoom, DevTools, pannelli…);
   - **workspace**: "Vai a…" e "Apri … in una nuova finestra";
   - **progetto** del workspace: avvia o ferma i comandi di `progetto.browser.json` e apre l'anteprima;
   - **giochi**: apre il companion;
   - **preferiti e cronologia**;
   - qualunque testo come **indirizzo o ricerca** in una nuova scheda.

   La ricerca ignora maiuscole e accenti e accetta lettere sparse ("nsch" → Nuova scheda).

   Non è Ctrl+K perché Discord, GitHub e Slack lo usano già per le loro ricerche.
2. **Impostazioni** (pulsante ⚙ in fondo alla barra laterale, oppure **Ctrl+,**), tutto in un posto:
   - **motore di ricerca**: Google, DuckDuckGo, Bing, Brave Search, Startpage, Ecosia;
   - avvio e background: area di notifica, avvio con Windows, rilevamento giochi;
   - sospensione delle schede;
   - privacy:
     - blocco pubblicità;
     - **cancella la cronologia**;
     - **cancella cookie e dati dei siti**, che fa uscire da tutti gli account.

     Entrambe le cancellazioni chiedono un secondo clic di conferma.
   - JARVIS;
   - **Dati**: esporta un backup, importa un backup, apri la cartella dei dati;
   - **Informazioni**: versioni, errori di questa sessione, **Copia la diagnostica**.
3. **Backup**: un file JSON con workspace, preferiti, cronologia, giochi, disposizioni, permessi dei siti, impostazioni e schede salvate.
   - Importandolo, i dati attuali vengono prima copiati in `browser-data.before-import-<data>.json` e il browser si riavvia.
   - **Non** contiene i segreti dei progetti, perché sono cifrati con il tuo account Windows e altrove non servono.
   - **Non** contiene nemmeno le fiducie nei progetti: un backup ricevuto da altri non può far partire comandi senza che tu lo confermi.
4. **Diagnostica**: gli ultimi 100 errori e avvisi restano in memoria, mai su disco. "Copia la diagnostica" mette negli appunti:
   - versioni e Windows;
   - la memoria di ogni processo;
   - finestre e schede;
   - le impostazioni e gli errori.

   Non contiene token né segreti. Se qualcosa non va, incollamela.

## Modalità insegnamento

### Palette (`lib/palette.cjs`, `palette-rules.js`)
- Le pagine web sono `WebContentsView` **sopra** la cornice: una finestra HTML nella cornice finirebbe sotto il sito. Per questo, all'apertura:
  1. il processo principale fotografa la pagina (`capturePage`, rimpicciolita a metà e in JPEG);
  2. nasconde la vista (`setVisible(false)` in `windows.layout`);
  3. la cornice mostra la foto sfocata nello stesso punto. Sembra la pagina dietro un vetro, ma è un'immagine.
- `palette-rules.js` è caricato due volte, dalla cornice con `<script>` e dai test con `require`. Lo stesso codice di ricerca è quindi verificato da `node --test`.
- La palette non ha comandi propri: ogni voce è `{command, args}` e passa dal **bus dei comandi**, come pulsanti, scorciatoie e JARVIS. È solo un'altra porta d'ingresso.

### Importazione sicura (`backup-rules.cjs`, `commands-settings.cjs`)
Dopo aver scritto il file importato, `state.frozen=true` blocca ogni salvataggio. All'uscita il browser salva sempre le schede aperte: senza il blocco riscriverebbe i dati vecchi sopra quelli appena importati.

## Test da fare

- [ ] **T49** — Premi **F1** su una pagina: la pagina si vela, compare la palette. Scrivi parte del titolo di una scheda di **un altro workspace** e premi Invio: si apre la sua finestra, con quella scheda. **📸** della palette.
- [ ] **T50** — Palette → scrivi `light.gg` → "Apri light.gg" è la prima voce; scrivi una frase → "Cerca «…» sul web" in fondo.
- [ ] **T51** — In un workspace con progetto: palette → "Avvia «…»" avvia il comando (lo vedi nel pannello Progetto).
- [ ] **T52** — Impostazioni → motore **DuckDuckGo**; cerca una frase dalla barra degli indirizzi: si apre DuckDuckGo. Rimetti quello che preferisci.
- [ ] **T53** — Impostazioni → **Esporta…**: salva il file e si apre la cartella. (Facoltativo: **Importa…** lo stesso file; il browser si riavvia uguale a prima.)
- [ ] **T54** — Impostazioni → **Copia la diagnostica** e incollala in un blocco note: versioni, memoria e impostazioni, senza token.
- [ ] **T55** — Discord web: **Ctrl+K** apre ancora la ricerca di Discord, non la palette.

**Stato:** 101 test superati (9 nuovi: ricerca della palette, motori di ricerca, scorciatoie, esportazione e importazione).

Provato nell'app (profilo di prova):
- palette aperta in 33 ms, con la pagina nascosta e la sua foto sfocata dietro;
- "impost" + Invio apre le Impostazioni e la pagina torna visibile;
- dalla finestra "Test 0.5", una scheda di "Gaming" porta in primo piano la finestra Gaming con quella scheda;
- frase cercata con DuckDuckGo; motore non valido rifiutato;
- diagnostica negli appunti;
- backup esportato senza segreti né fiducie;
- importazione dello stesso backup modificato: preferito nuovo presente dopo il riavvio, fiducia "estranea" del file ignorata, copia `before-import` creata;
- cronologia 160 → 0, cookie 19 → 0.

Installer controllato: contiene i file nuovi e la palette si apre e si chiude nell'eseguibile.

**Non provati:** l'avvio dei comandi del progetto dalla palette con un progetto vero (la voce è la stessa del pulsante ▶ Avvia), e Ctrl+K dentro Discord.

**Rimandati:**
- avviso di aggiornamento di Electron: per ora la versione si vede in Informazioni;
- cookie separati per workspace;
- suggerimenti nella barra degli indirizzi;
- trascinare schede tra finestre;
- notifiche nella cornice.
