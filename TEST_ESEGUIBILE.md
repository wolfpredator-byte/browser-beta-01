# Test dell'eseguibile — Personal Browser 0.9.0

Lista per provare il browser installato sul tuo PC. Per ogni test: fai i passi, confronta con **Atteso**, spunta la casella.
Dove vedi **📸**, mandami uno screenshot (anche se il test va bene: serve a me per controllare cose che da qui non vedo).
Se qualcosa non va, scrivimi il numero del test (es. *T14*) e cosa è successo, con uno screenshot se puoi.

Scorciatoia per gli screenshot: `Win + Shift + S` → seleziona l'area → incolla in chat (`Ctrl + V`).

---

## 0. Prima di iniziare

- [ ] **T0** — Chiudi il browser se lo hai aperto con `npm start` (anche dall'icona ◈ nell'area di notifica → **Esci**).
  *Perché:* il browser installato e quello di sviluppo usano la stessa cartella dati; se uno è aperto, l'altro si limita a mostrarne le finestre.

## 1. Installazione

- [ ] **T1** — Apri `dist\Personal Browser Setup 0.9.0.exe`.
  **Atteso:** Windows può mostrare "Windows ha protetto il PC" (l'installer non è firmato). Clicca **Ulteriori informazioni → Esegui comunque**.
  **📸** se compare un messaggio diverso.
- [ ] **T2** — Segui l'installazione (puoi lasciare la cartella proposta; non servono permessi di amministratore).
  **Atteso:** alla fine il browser si apre da solo; c'è un collegamento **Personal Browser** sul desktop e nel menu Start.
  **📸** dell'icona sul desktop e della finestra aperta.
- [ ] **T3** — Guarda la barra delle applicazioni.
  **Atteso:** icona ◈ (non quella di Electron) e titolo della finestra tipo `Personale · Personal Browser`.
  **📸** della barra delle applicazioni.

## 2. I tuoi dati

- [ ] **T4** — Controlla workspace, preferiti e schede.
  **Atteso:** ci sono i workspace e le schede che avevi con `npm start` (stessa cartella dati).
- [ ] **T5** — Chiudi il browser con 2 schede aperte e riaprilo dal collegamento.
  **Atteso:** le schede tornano; si carica solo quella visibile, le altre quando le apri.

## 3. Navigazione di tutti i giorni

- [ ] **T6** — Scrivi `light.gg` nella barra, poi una frase come `build titano warlock`.
  **Atteso:** il primo apre il sito, il secondo una ricerca Google.
- [ ] **T7** — Scorciatoie, con il cursore dentro una pagina: `Ctrl+T`, `Ctrl+L`, `Ctrl+W`, `Alt+←`, `F5`, `Ctrl+Shift+T`.
  **Atteso:** nuova scheda, cursore nella barra, chiusura, indietro, ricarica, riapertura dell'ultima chiusa.
- [ ] **T8** — Un video YouTube a schermo intero, poi `Esc`.
  **Atteso:** riempie tutto il monitor; `Esc` torna alla finestra normale con barre e schede al loro posto.
  **📸** dopo l'uscita dallo schermo intero.
- [ ] **T9** — `F12` su una pagina.
  **Atteso:** strumenti per sviluppatori in una finestra separata.
- [ ] **T10** — Login con popup: su **DIM** (app.destinyitemmanager.com) accedi con Bungie.
  **Atteso:** si apre una finestrella di login Bungie; dopo l'accesso si chiude e DIM mostra il tuo inventario.
  **📸** se la finestrella non si chiude o DIM non risulta collegato.
- [ ] **T11** — Accedi a un sito con "Accedi con Google".
  **Atteso:** l'accesso riesce. **📸** se Google dice che il browser "potrebbe non essere sicuro".
- [ ] **T12** — Scarica un file qualsiasi.
  **Atteso:** domanda "Vuoi salvare questo file?" con nome e destinazione **su due righe**; il pannello Download mostra l'avanzamento.

## 4. Workspace e finestre

- [ ] **T13** — **＋ Nuovo spazio** → scrivi un nome → Invio. Poi prova un nome già usato.
  **Atteso:** il workspace nasce e si apre; con il nome doppio compare l'errore in rosso.
- [ ] **T14** — Click destro su un workspace → **Apri in una nuova finestra**. Poi clicca lo stesso workspace dall'altra finestra.
  **Atteso:** seconda finestra; il clic porta davanti quella giusta invece di duplicarla.
- [ ] **T15** — In un workspace premi `Ctrl+N` due volte e metti una finestra per monitor.
  **Atteso:** in basso `Nome · 2` e `Nome · 3`. **📸** dei tre monitor (o di ognuno).
- [ ] **T16** — Menu `⋯` di una scheda → **Sposta in un'altra finestra** → Finestra 2.
  **Atteso:** la scheda passa all'altra finestra senza ricaricarsi.
- [ ] **T17** — Home del workspace → **▦ Salva disposizione**. Poi sposta e rimpicciolisci le finestre, chiudine una, e **▦ Ripristina disposizione**.
  **Atteso:** tutto torna come l'avevi salvato, anche la finestra chiusa con le sue schede.
  **📸** dopo il ripristino.

## 5. Area di notifica e background

- [ ] **T18** — Chiudi tutte le finestre.
  **Atteso:** la prima volta compare un avviso; l'icona ◈ resta nell'area di notifica (eventualmente sotto la freccia `^`).
  **📸** dell'avviso e dell'icona.
- [ ] **T19** — Click destro sull'icona ◈.
  **Atteso:** menu con Apri, Apri workspace, Rilevamento giochi, JARVIS, Resta attivo, Avvia con Windows, Esci.
  **📸** del menu.
- [ ] **T20** — Con tutte le finestre chiuse apri il **Task Manager → Dettagli** e cerca `Personal Browser.exe`.
  **Atteso:** 3 processi, in totale circa 120–200 MB.
  **📸** delle righe di `Personal Browser.exe` (colonna Memoria).
- [ ] **T21** — Menu dell'icona → **Avvia con Windows**, poi riavvia il PC.
  **Atteso:** dopo l'accesso c'è solo l'icona ◈, nessuna finestra. Un clic la apre.
- [ ] **T22** — Mentre è nell'area di notifica, apri di nuovo il browser dal collegamento sul desktop.
  **Atteso:** compaiono le finestre della copia già attiva (nessun secondo browser).

## 6. Gaming companion

- [ ] **T23** — ♞ **Giochi** → **＋ Aggiungi gioco**: Destiny 2, eseguibile `destiny2.exe` (o da **Programmi aperti** con il gioco avviato), workspace Gaming, siti `app.destinyitemmanager.com` e `light.gg`, il monitor che preferisci.
  **📸** del modulo compilato prima di salvare.
- [ ] **T24** — **Prova**.
  **Atteso:** si apre la finestra Gaming con i due siti sul monitor scelto.
- [ ] **T25** — Avvia Destiny 2 a schermo intero.
  **Atteso:** entro 5 secondi la finestra compare sull'altro monitor e **il gioco resta in primo piano** (non si riduce a icona).
  **📸** del monitor con il companion, mentre giochi.
- [ ] **T26** — Chiudi il gioco.
  **Atteso:** con "Chiudi la finestra quando esci dal gioco" attivo, la finestra si chiude; altrimenti resta, ma non più in primo piano.

## 7. Progetti (Destiny Builder)

- [ ] **T27** — Workspace Destiny Builder → **Collega cartella** → la cartella del progetto → **⧉ Progetto**.
  **Atteso:** proposta di `progetto.browser.json` con il comando e la porta giusti.
  **📸** della proposta.
- [ ] **T28** — **Crea il file** → **▶ Avvia** il dev server → **Anteprima**.
  **Atteso:** il log scorre, l'anteprima apre il sito. **📸** del pannello con il log.
- [ ] **T29** — **Apri in code**.
  **Atteso:** VS Code si apre sulla cartella del progetto.
- [ ] **T30** — Aggiungi al file `"segreti": ["BUNGIE_API_KEY"]` e il monitor del Manifest (esempio in `BETA_0_7_GUIDA.md`). Salva.
  **Atteso:** il pannello si aggiorna da solo e chiede **"Ti fidi di questo progetto?"** → **Mi fido**.
- [ ] **T31** — **Imposta** la tua `BUNGIE_API_KEY` → **Controlla ora** sul monitor del Manifest.
  **Atteso:** compare la versione del Manifest. **📸** della sezione Monitor (la chiave non compare da nessuna parte).
- [ ] **T32** — Scrivi `lg gjallarhorn` nella barra.
  **Atteso:** ricerca su light.gg (con la ricerca `lg` nel file).
- [ ] **T33** — **■ Ferma** il dev server, poi riapri l'anteprima.
  **Atteso:** il sito non risponde più (la porta è libera).

## 8. JARVIS

- [ ] **T34** — ◉ **JARVIS** → **Server MCP attivo**.
  **Atteso:** "In ascolto su http://127.0.0.1:37201/mcp". **📸** del pannello.
- [ ] **T35** — Da JARVIS (o con `examples/jarvis_browser.py`), cambia la sfera e apri una pagina.
  **Atteso:** la sfera della Home segue lo stato; nel pannello **Attività** compaiono le richieste.
- [ ] **T36** — Da JARVIS chiama `project_run` sul dev server.
  **Atteso:** finestra di conferma con il comando esatto. Prova sia **Nega** (JARVIS riceve il rifiuto) sia **Consenti**.
  **📸** della finestra di conferma.

## 9. Disinstallazione (facoltativa, alla fine)

- [ ] **T37** — Impostazioni di Windows → App → **Personal Browser** → Disinstalla.
  **Atteso:** il programma sparisce, ma i tuoi dati restano in `%APPDATA%\personal-workspace-browser` (reinstallando ritrovi tutto).

---

## Come ricostruire l'eseguibile

```powershell
npm run check   # test
npm run pack    # cartella dist\win-unpacked (prova veloce, senza installare)
npm run dist    # installer dist\Personal Browser Setup <versione>.exe
```

L'installer non è firmato digitalmente: per questo Windows mostra l'avviso di T1. Per un programma personale è normale; una firma richiederebbe un certificato a pagamento.
