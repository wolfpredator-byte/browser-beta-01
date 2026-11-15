# VARCO — Guida delle beta

Un solo documento per tutte le versioni: la più recente è in cima. Le guide fino alla 0.36 sono nei file `BETA_X_Y_GUIDA.md`.

---

## Beta 0.37 — Rifinitura, velocità e contenuti protetti

Installer PC: `dist\VARCO Setup 0.37.0.exe`. Il telefono non cambia.

### Aggiunte prima della prova
- **Spotify, Netflix e gli altri contenuti protetti.**
  - VARCO ora usa *Electron for Content Security* di castLabs: lo stesso Electron 39.8.10, con in più il modulo Widevine di Google. È gratuito.
  - Il modulo non è nell'installer: VARCO lo scarica da Google al primo avvio (pochi MB) e poi lo aggiorna da solo. Quando è pronto compare una notifica; una pagina già aperta va ricaricata.
  - L'avviso "Spotify non può riprodurre" nel widget Pagina web della Home compare solo mentre il modulo si prepara, o se non arriva.
  - Copia diagnostica: nuova riga "Contenuti protetti" con lo stato del modulo e della firma.
  - **La firma VMP.** Netflix, Prime Video e Disney+ (a volte anche Spotify) vogliono anche che l'eseguibile sia firmato. La firma è gratuita, ma serve un account castLabs EVS, che va creato a tuo nome (vedi *Da fare tu*). Senza firma Widevine funziona lo stesso, ma questi servizi possono rifiutare la riproduzione.
  - Netflix e Prime nei browser diversi da Chrome/Edge di solito arrivano al massimo a 720p: è una loro regola, non di VARCO.
- **Screenshot con anteprima.**
  - Dopo lo scatto compare l'immagine: il titolo della pagina, le dimensioni e "copiato negli appunti".
  - Pulsanti:
    - **Salva…**: PNG o JPEG. Il nome del file contiene data e titolo della pagina, e la cartella proposta è l'ultima usata. Dopo il salvataggio, "Mostra nella cartella".
    - **Copia**.
    - **Apri in una scheda**: nel visualizzatore di VARCO, con lo zoom.
    - **Nuovo screenshot**.
  - La pagina intera si scorre dentro l'anteprima. Esc o un clic fuori chiudono.
  - Se la pagina intera non si può fare (per esempio con gli strumenti per sviluppatori aperti), resta la parte visibile e un avviso lo spiega. Prima l'errore non veniva mostrato.
- **Suggerimenti nella ricerca della Home.** Scrivendo compaiono gli stessi suggerimenti della barra degli indirizzi: ricerca sul web, schede aperte, preferiti, cronologia, comandi e progetti. Frecce e Invio per scegliere, Esc per chiudere.
  - Anche preferiti e cronologia hanno ora l'icona del sito, sia qui sia nella barra degli indirizzi.
- **I pannelli web seguono gli account separati.** WhatsApp, Gmail e gli altri pannelli usano la sessione del workspace, come le schede: in un workspace con account separati il pannello è un altro WhatsApp, con un altro accesso.
  - Cambiando workspace nella stessa finestra, il pannello aperto passa da solo alla sessione giusta.
  - Lo stesso succede accendendo o spegnendo gli account separati.
- **Pulizia visiva.**
  - Barra laterale compatta: gruppi e separatori sono la stessa linea corta e centrata. Prima alcuni erano puntini di 3 px.
  - La barra di scorrimento della barra laterale compare solo passandoci sopra.
  - I pulsanti della barra laterale sono un po' più bassi: con la tua lista ora ci sta anche il pannello WhatsApp.
  - Barra degli indirizzi: a barra ferma niente "https://" e "www." (es. `wikipedia.org`). Cliccandoci torna l'indirizzo completo, già selezionato.

### Da fare tu (una volta sola, per la firma VMP)
In un terminale:
```bash
python -m pip install --upgrade castlabs-evs
```
```bash
python -m castlabs_evs.account signup
```
Il comando chiede email, password, nome e organizzazione (puoi scrivere "uso personale"), poi manda una mail di conferma. Fatto questo, dimmelo: rifaccio l'installer e `npm run setup` firma da solo il motore (`VARCO.exe.sig`). Quando l'accesso scade: `python -m castlabs_evs.account reauth`.

### Rifinitura e velocità
- **I salvataggi non fermano più VARCO.**
  - Prima, a ogni modifica (una scheda, una pagina caricata, un preferito) VARCO riscriveva tutto il file dei dati, 784 KB, e restava fermo circa 30 ms ogni volta.
  - Ora la scrittura sul disco avviene di lato, mentre VARCO continua a rispondere.
  - Le icone dei siti (erano due terzi del file) stanno in un file loro, `site-icons.json`, che si riscrive solo quando arriva un'icona nuova.
  - Il file dei dati senza icone e senza spazi inutili passa da 784 KB a circa 226 KB.
  - Quando chiudi VARCO, un salvataggio ancora in corso viene completato prima di uscire.
- **Aggiornamenti della barra 7 volte più leggeri.**
  - Ogni volta che cambia qualcosa (titolo, caricamento, scheda), la barra riceve lo stato di VARCO. Prima conteneva anche tutte le icone come immagini intere: 268 KB ogni volta, 3 MB per aprire due pagine.
  - Ora ogni icona viaggia come un indirizzo corto (`varco-icon://…`), la barra la carica una volta e poi la ritrova da sé: 36 KB per aggiornamento.
  - Gli aggiornamenti che arrivano a raffica durante un caricamento vengono raggruppati.
- **Avvio:** il file dei dati si legge una volta sola invece di due.

### Misure (copia dei tuoi dati, prima → dopo)
| | 0.36 | 0.37 |
|---|---|---|
| Peso di un aggiornamento della barra | 268 KB | 36 KB |
| Dati spediti alla barra aprendo due pagine | 3,1 MB | 0,65 MB |
| VARCO fermo per un salvataggio | ~30 ms | ~2 ms |
| Blocco più lungo del processo principale durante i caricamenti | ~100 ms | ~14 ms |
| File dei dati | 784 KB | 226 KB (+ 527 KB di icone, a parte) |
| Finestra pronta dall'avvio | ~1,8 s | ~1,7 s |

L'avvio migliora poco: il tempo va quasi tutto nell'avvio di Electron e nel blocco pubblicità, che deve essere pronto prima della prima pagina.

### Memoria
Il tuo VARCO aperto usava circa 3 GB in 14 processi. Ho guardato da dove arriva:
- Il codice di VARCO nel processo principale occupa circa 14 MB. Il resto del processo principale (170–380 MB) è Chromium stesso, che cresce con le schede e le sessioni separate dei workspace.
- La gran parte dei 3 GB sono le pagine aperte (un processo per sito) e la scheda video.
- Per ridurla davvero servono più schede che dormono: Impostazioni → Schede → "Sospendi le schede non guardate" a 15 minuti invece di 30.
- Il servizio "acquisizione video" che vedevi in Gestione attività lo apre un sito che chiede la lista delle webcam (di solito WhatsApp, Discord o Meet), non VARCO.

### Modalità insegnamento
- `lib/storage.cjs`:
  - `save()` resta sincrono: si usa all'uscita, per l'importazione di un backup e nei test.
  - `saveAsync()` scrive con `fs.promises`; le richieste che arrivano durante una scrittura diventano una sola.
  - Ogni salvataggio ha un numero (`generation`): il controllo e la rinomina del file avvengono nello stesso passo sincrono, così un salvataggio vecchio non sovrascrive mai uno più nuovo.
- `lib/icon-urls.cjs`:
  - trasforma ogni immagine `data:` dello snapshot in `varco-icon://i/<n>`, sempre lo stesso numero per la stessa immagine;
  - risponde solo nella sessione delle cornici (`session.defaultSession`), dove non gira nessun sito.
- `lib/windows.cjs` → `emit()`: il primo aggiornamento parte subito, quelli dei 16 ms seguenti diventano uno solo. `sendUi()` manda prima l'aggiornamento in attesa, così la barra non riceve un comando prima dello stato a cui si riferisce.

### Test da fare
- [ ] **T238** — Installa la 0.37 sopra la 0.36 (o aspetta l'aggiornamento automatico). Si apre con tutte le tue schede, workspace e preferiti. In `%APPDATA%\personal-workspace-browser` compare `site-icons.json`.
- [ ] **T239** — Le icone ci sono tutte: schede in basso, icone dei workspace nella barra laterale, preferiti e siti della Home, pannelli web. Nessuna immagine rotta. **📸**
- [ ] **T240** — Usa VARCO normalmente per qualche minuto: apri e chiudi schede, carica pagine pesanti (YouTube, GitHub), cambia workspace. Non ci sono scatti, e l'indirizzo, il titolo e la rotella di caricamento si aggiornano come prima.
- [ ] **T241** — Aggiungi un preferito e chiudi **subito** VARCO dall'icona nell'area di notifica → Esci. Riaprilo: il preferito c'è.
- [ ] **T242** — Ctrl+T e scrivi subito un indirizzo: la barra degli indirizzi prende il cursore come prima.
- [ ] **T243** — Impostazioni → Dati → Esporta… un backup, poi importa lo stesso backup: VARCO si riavvia con i dati giusti e le icone.
- [ ] **T244** — Primo avvio della 0.37: dopo qualche secondo compare la notifica "Contenuti protetti pronti". Apri open.spotify.com, accedi e fai partire un brano: si sente. **📸**
- [ ] **T245** — Netflix (o Prime Video, Disney+): fai partire un film. Senza la firma VMP può dare un errore (es. Netflix M7701-1003): annota il codice. Dopo la firma deve partire.
- [ ] **T246** — Home → widget Pagina web con open.spotify.com: niente avviso rosso, la musica parte dal riquadro.
- [ ] **T247** — Ctrl+Shift+S su una pagina → "Pagina visibile": compare l'anteprima. Prova Salva… (PNG, poi JPEG), Copia (incolla in Paint), Apri in una scheda. **📸**
- [ ] **T248** — Screenshot "Pagina intera" di una pagina lunga: nell'anteprima si scorre tutta.
- [ ] **T249** — Home: scrivi "git" (o un sito che usi) nella ricerca. Compaiono i suggerimenti con le icone; frecce e Invio aprono quello scelto, Esc chiude. **📸**
- [ ] **T250** — Accendi gli account separati in un workspace, apri WhatsApp come pannello: chiede di nuovo il QR (è un'altra sessione). Torna a un workspace normale: il pannello è il WhatsApp di sempre.
- [ ] **T251** — Barra laterale compatta: linee di separazione tutte uguali, nessuna barra di scorrimento finché non ci passi sopra. Barra degli indirizzi: `sito.it` a barra ferma, indirizzo completo cliccandoci. **📸**

**Stato:**
- 211 test superati (nuovi: `icon-urls`, più casi in `storage`: icone a parte, passaggio dai dati della 0.36, salvataggio asincrono, salvataggio all'uscita durante una scrittura).
- **Provato in VARCO** con una copia dei tuoi dati (senza telefono, JARVIS e programmi automatici):
  - 23 icone nella Home, nelle schede e nella barra laterale, nessuna rotta;
  - aprendo due pagine, nessuna icona richiesta di nuovo;
  - nessun file temporaneo rimasto;
  - le icone passano da sole in `site-icons.json` al primo salvataggio.
  - **Widevine:** il modulo è arrivato da Google al primo avvio (Google Widevine Windows CDM 1.0.2738.0). Un video protetto di prova (Shaka Player, server di licenze di prova di Google) parte: 6 secondi, 153 fotogrammi.
  - **Screenshot:** visibile, area e pagina intera (1832×7586) con anteprima; Copia, Apri in una scheda (visualizzatore).
  - **Ricerca della Home:** "git" → ricerca, preferito, schede e cronologia di GitHub; Esc chiude.
  - **Pannelli web:** WhatsApp in "AI" usa la sessione comune; passando a un workspace con account separati usa `varco-ws-…`, e tornando indietro di nuovo la comune, sempre con una sola pagina del pannello nella finestra.
  - **Pulizia:** separatori a 24 px, barra laterale senza barra di scorrimento fissa, indirizzo pulito e completo al clic.
- **Non provato:**
  - dall'installer;
  - l'aggiornamento automatico dalla 0.36;
  - Spotify e Netflix con un account vero;
  - la firma VMP, che aspetta il tuo account EVS. In particolare non ho potuto verificare che la firma resti valida dopo che l'installer copia "VARCO Setup.exe" come VARCO.exe: lo controllo appena c'è l'account.
