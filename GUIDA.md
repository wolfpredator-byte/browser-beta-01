# VARCO — Guida delle beta

Un solo documento per tutte le versioni: la più recente è in cima. Le guide fino alla 0.36 sono nei file `BETA_X_Y_GUIDA.md`.

---

## Beta 0.37.2 — Verifiche anti-bot ed estensioni

Installer PC: `dist\VARCO Setup 0.37.2.exe` (con la firma VMP). Il telefono non cambia.

### Cosa cambia
- **Verifiche "sei umano?"** (CAPTCHA, controlli prima di un download, "Verifica di essere umano" di Cloudflare). Le cause trovate:
  - **Due identità nella stessa pagina.** La pagina vedeva un browser normale, ma i riquadri di verifica, che girano in un processo a parte, vedevano "personal-workspace-browser … Electron". È il segnale più forte di "browser sospetto". Ora VARCO usa la stessa identità ovunque, impostata all'avvio prima di qualsiasi pagina. Il login Google continua a usare quella originale, che vuole apposta.
  - **reCAPTCHA non poteva usare i propri cookie.** VARCO gli negava l'accesso (`requestStorageAccess`). Ora lo concede, come Chrome; i cookie di terze parti erano già permessi, quindi non perdi privacy.
  - **VARCO lasciava tracce nelle pagine.** Gli agganci per notifiche e lettore cambiavano funzioni del browser e creavano una variabile globale (`__varcoMedia`), proprio ciò che i sistemi anti-bot controllano.
    - Ora le funzioni risultano originali e la variabile non c'è più.
    - Nei siti dei servizi di verifica VARCO non aggancia proprio nulla: Cloudflare, reCAPTCHA, hCaptcha, Arkose/FunCaptcha, GeeTest, DataDome, PerimeterX, AWS WAF, Friendly Captcha, MTCaptcha.
  - **Il blocco pubblicità** non blocca mai le richieste di questi servizi.
- **Estensioni che si installano ma non agiscono sul sito.** Le cause trovate:
  - **Permessi letti male.** La libreria delle estensioni confrontava i permessi come testo: "https://sito.it/*" non è letteralmente "tutti i siti", quindi l'estensione si sentiva dire "non hai il permesso" anche quando l'aveva. Ignorava anche i siti delle estensioni più vecchie (Manifest V2). Ora il confronto è quello vero.
  - **Estensioni che in Chrome agiscono "quando clicchi l'icona"** o chiedono il sito mentre le usi. Electron non sa concedere l'accesso un sito alla volta, quindi venivano respinte dalla pagina. Ora per queste estensioni c'è **Accesso ai siti**:
    - **Su tutti i siti** (predefinito): funzionano come in Chrome, ma possono leggere e cambiare ogni pagina;
    - **Solo i siti dichiarati**: più chiuse, ma potrebbero non fare nulla.
    - Si sceglie all'installazione e si cambia in Impostazioni → Estensioni.
  - **File .crx** (estensioni scaricate da un sito, fuori dal Chrome Web Store). Prima restavano un file nei Download. Ora:
    - a download finito il toast ha **Installa estensione**;
    - in Impostazioni → Estensioni ci sono **Installa da file .crx o .zip…** e **Da una cartella…**;
    - c'è sempre la domanda prima di installare;
    - le estensioni da file si ricaricano a ogni avvio e sono segnate "da file".

### Modalità insegnamento
- `lib/identity.cjs`: all'avvio `app.userAgentFallback` diventa l'identità pulita; l'originale resta per il login Google. Prima i riquadri in un altro processo prendevano la versione grezza.
- `lib/verification-rules.cjs`: elenco dei servizi di verifica. `page-preload.cjs` ne ha una copia, perché gira isolato, e un test controlla che coincidano.
- `page-preload.cjs`:
  - gli agganci ora sono `Proxy` sul prototipo con lo stesso descrittore, e risultano "codice nativo";
  - i comandi del lettore arrivano con `WebFrameMain.send('media:cmd')`, dopo il gesto dell'utente dato con `executeJavaScript('void 0', true)`, e non serve più una variabile globale.
- `lib/permission-rules.cjs`: `storage-access` e `top-level-storage-access` sono sempre concessi.
- `lib/extension-rules.cjs` (con test): confronto dei match pattern di Chrome, siti MV2/MV3, `needsSiteAccess`/`widenManifest`, lettura dei .crx (CRX2 e CRX3 contengono uno ZIP).
- `lib/extensions.cjs`:
  - sostituisce i gestori `permissions.*` della libreria (`ctx.router.handle`);
  - con "Su tutti i siti" aggiunge `<all_urls>` al manifest della copia installata (l'originale resta in `manifest.varco-original.json`) e la ricarica in tutte le sessioni, anche dopo un aggiornamento dal Web Store;
  - installa da file in `userData/ExtensionsLocal`.

### Test da fare
- [ ] **T260** — Un sito con la verifica di Cloudflare (o il download che prima falliva): la verifica passa come negli altri browser. **📸** se non passa, con l'indirizzo.
- [ ] **T261** — Un modulo con reCAPTCHA o hCaptcha (es. registrazione a un sito): il riquadro si carica e la verifica va.
- [ ] **T262** — L'estensione .crx che non funzionava: dal toast del download "Installa estensione" (oppure Impostazioni → Estensioni → Installa da file…). Scegli "Su tutti i siti" e usala sul sito: ora agisce. **📸**
- [ ] **T263** — Impostazioni → Estensioni: per quella estensione passa a "Solo i siti dichiarati" e poi di nuovo a "Su tutti i siti". Riavvia VARCO: resta installata con la scelta fatta.
- [ ] **T264** — Un'estensione dal Chrome Web Store che prima non agiva sul sito: dopo l'aggiornamento prova di nuovo. Se non va ancora, scrivimi il nome.
- [ ] **T265** — Lettore multimediale: tutto come nella 0.37.1 (pausa, salti, volume, finestrella).

**Stato:**
- 222 test superati (nuovi: `verification-rules`, `extension-rules`).
- **Provato in VARCO** con una copia dei tuoi dati:
  - **Verifiche:** sulle pagine dimostrative di reCAPTCHA, hCaptcha e Turnstile l'identità è la stessa ovunque (prima il riquadro di Cloudflare vedeva "Electron"). Niente più accesso ai cookie negato, nessuna funzione modificata, nessuna variabile di VARCO. Non ho risolto CAPTCHA: ho solo guardato cosa vedevano del browser.
  - **Estensioni:** con un'estensione di prova che agisce sui siti in tutti i modi comuni (script nella pagina, messaggi col background, `tabs.query`, `scripting.executeScript`, messaggi alla scheda, storage) funziona tutto. `permissions.contains` prima diceva "no" con "tutti i siti", ora dice il vero.
  - **Estensione "al clic":** prima veniva respinta. Installata da .zip con "Su tutti i siti" entra nella pagina; con "Solo i siti dichiarati" resta fuori e dice onestamente di no. Dopo un riavvio resta installata con la sua scelta.
  - **Lettore:** pausa, ripresa, brano successivo, salto, volume e finestrella col nuovo canale dei comandi.
- **Non provato:** CAPTCHA "veri" su siti reali, la tua estensione .crx, l'installer.
- **Limite noto:** una funzione agganciata ora risulta "nativa" ma senza il suo nome. Solo un controllo molto pignolo se ne accorge.

---

## Beta 0.37.1 — Lettore multimediale

**Pubblicata (v0.37.1) e unita in main il 2026-11-16, dopo la tua prova.**

Installer PC: `dist\VARCO Setup 0.37.1.exe` (con la firma VMP). Il telefono non cambia.

### Cosa cambia
- **Un lettore per tutti i media di VARCO.** Audio e video in riproduzione in qualsiasi scheda, pannello web (WhatsApp, Spotify…) o widget della Home, di **qualsiasi workspace**, si comandano da un solo posto.
- **Il design** l'hai scelto tu dagli esempi interattivi: struttura "Dock compatto" (V4), vestita da VARCO ("4b · Vetro"), con la barra "minima". Gli esempi restano in `design/explore/lettore-final/`. Le scelte sono in `design/explore/LOG.md`.
- **Nella barra delle schede, a destra**, c'è una copertina rotonda per **ogni sorgente che suona** (fino a 4, poi "+N"), larga circa 32 px. La barra non diventa più alta e alle schede resta quasi tutto lo spazio.
  - L'anello intorno alla copertina mostra a che punto sei; brilla del colore del tema quando suona.
  - **Clic sulla copertina**: pausa o riproduci.
  - **Mouse sopra la copertina**: compare la scheda della sorgente, sopra la barra, con:
    - titolo, artista, dove suona (scheda / pannello web / widget e workspace);
    - la barra della posizione, trascinabile;
    - **i comandi del sito**: YouTube −10 s, pausa, +10 s; Spotify brano precedente, pausa, successivo, **shuffle** e **ripeti**;
    - **volume** (cursore con la percentuale) e muto;
    - finestrella (PiP) per i video, "Vai alla scheda" e **× per chiudere la scheda** (o il pannello web) da lì.
  - "+N" o l'icona ⤢ nella scheda aprono il **lettore completo**.
- **Lettore completo** (anche dalla palette: *Lettore multimediale*). Si apre sopra la barra, a destra:
  - a sinistra l'elenco di tutto ciò che suona, con il workspace; passando sopra una riga compare la × per chiuderla;
  - al centro la sorgente scelta: copertina, barra, comandi del sito, shuffle e ripeti, volume;
  - a destra la barra a pillola: finestrella del video, vai alla scheda, **Finestrella automatica** (la stessa delle Impostazioni), chiudi.
  - Tasti: Spazio pausa, ← → ±10 s, Esc chiude. Un clic fuori lo chiude.
- **Chiudere dal lettore:**
  - una scheda si chiude e si riapre con Ctrl+Shift+T;
  - un pannello web si scarica e si riapre dalla barra laterale;
  - un widget della Home si ferma.
- **Spotify.** Shuffle, ripeti e volume non passano dal sistema come gli altri comandi: VARCO usa i pulsanti e il cursore della pagina di Spotify, come faresti tu, e ne legge lo stato.
  - Ripeti fa: spento → playlist → brano.
  - Se Spotify cambia la sua pagina, questi tre comandi potrebbero smettere di funzionare. Gli altri restano.
- Il lettore segue il **tema** (Cyan Flash nel tuo VARCO) ed è vetro scuro come i menu.

### Modalità insegnamento
- `page-preload.cjs` gira in ogni pagina e riquadro di tutte le sessioni (quindi anche pannelli web e widget):
  - annota gli elementi audio/video che partono e le azioni che il sito registra con `navigator.mediaSession.setActionHandler`, con titolo e copertina;
  - c'è un adattatore per Spotify (`open.spotify.com`): shuffle, ripeti e volume dai pulsanti della sua barra, osservata solo lei con un MutationObserver;
  - per gli altri siti il volume è quello dell'elemento audio/video;
  - lo stato arriva al processo principale come `media:state`.
- `lib/media.cjs` tiene una voce per riquadro e:
  - capisce se è scheda, pannello o widget;
  - scarica la copertina;
  - manda i comandi con `WebFrameMain.executeJavaScript(…, true)`;
  - chiude ciò che suona: `closeTabAnywhere`, `webpanels.unload`, oppure stop per un widget.
- `lib/media-overlay.cjs` + `media-overlay.html/.css/.js`: la pagina sta sopra la cornice, quindi scheda e lettore completo sono una vista trasparente a parte, come i toast.
  - La vista è grande solo quanto ciò che mostra: fuori, i clic arrivano al sito.
  - La scheda resta aperta finché il mouse è sulla copertina o sulla scheda stessa.
  - Il lettore completo si chiude quando perde il focus.
- `lib/media-rules.cjs` (con test): pulisce lo stato e sceglie i controlli per sito (volume, shuffle e ripeti solo se la pagina li manda).

### Test da fare
- [ ] **T252** — Fai partire YouTube in una scheda e Spotify (scheda o pannello) in un altro workspace. Nella barra compaiono due copertine con l'anello. **📸**
- [ ] **T253** — Mouse sulla copertina di YouTube: la scheda ha −10 / pausa / +10, barra, volume, PiP. Su quella di Spotify: precedente / pausa / successivo, shuffle e ripeti. Accendi shuffle e ripeti dal lettore: sulla pagina di Spotify si accendono anche lì. **📸**
- [ ] **T254** — Volume: abbassa Spotify al 30% dal lettore; il cursore di Spotify scende. Fai lo stesso con YouTube.
- [ ] **T255** — Clic su una copertina: pausa; altro clic: riprende.
- [ ] **T256** — Apri il lettore completo ("+N" nella barra o ⤢ nella scheda): elenco, dettaglio, Spazio / ← → / Esc. Passa sopra una riga e chiudi la scheda con la ×: sparisce, e Ctrl+Shift+T la riapre. **📸**
- [ ] **T257** — Chiudi un pannello web (es. Spotify) dal lettore: la musica si ferma; riaprendo il pannello riparte da capo.
- [ ] **T258** — Video di YouTube in riproduzione, cambia scheda: va in finestrella. "Finestrella automatica" nella barra a pillola: spegnila e riprova.
- [ ] **T259** — "Vai alla scheda" su un media di un altro workspace: VARCO apre quel workspace e mostra la scheda.

**Stato:**
- 216 test superati (`media-rules`: anche volume, shuffle e ripeti).
- **Provato in VARCO** con una copia dei tuoi dati e una pagina di prova (lettore con Media Session):
  - nella barra una copertina con l'anello;
  - volume portato al 30% dal lettore;
  - la scheda al passaggio ha precedente, −10, pausa, +10, successivo, PiP, volume, vai e chiudi, e sparisce quando il mouse esce;
  - il lettore completo si apre a destra sopra la barra con i colori del tuo tema (Cyan Flash);
  - chiudi dal lettore chiude la scheda e la toglie dall'elenco.
  - Prima, nelle prove precedenti: YouTube (titolo, canale, copertina, salti), finestrella automatica, "Vai alla scheda".
- **Non provato:**
  - **Spotify vero**: shuffle, ripeti e volume dipendono dai pulsanti della sua pagina, e senza il tuo account non ho potuto provarli;
  - il tema chiaro (il lettore resta scuro);
  - l'installer.

---

## Beta 0.37 — Rifinitura, velocità e contenuti protetti

**Provata da te: funziona** (contenuti protetti compresi).

Installer PC: `dist\VARCO Setup 0.37.0.exe`. Il telefono non cambia.

### Aggiunte prima della prova
- **Spotify, Netflix e gli altri contenuti protetti.**
  - VARCO ora usa *Electron for Content Security* di castLabs: lo stesso Electron 39.8.10, con in più il modulo Widevine di Google. È gratuito.
  - Il modulo non è nell'installer: VARCO lo scarica da Google al primo avvio (pochi MB) e poi lo aggiorna da solo. Quando è pronto compare una notifica; una pagina già aperta va ricaricata.
  - L'avviso "Spotify non può riprodurre" nel widget Pagina web della Home compare solo mentre il modulo si prepara, o se non arriva.
  - Copia diagnostica: nuova riga "Contenuti protetti" con lo stato del modulo e della firma.
  - **Firma VMP inclusa.** Netflix, Prime Video e Disney+ (a volte anche Spotify) vogliono che l'eseguibile sia firmato. L'installer ora porta `VARCO.exe.sig`, fatta con il tuo account castLabs EVS (gratuito). La firma è di tipo "streaming" e vale 1340 giorni; `npm run setup` la rinnova da sola a ogni installer.
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

### Firma VMP: come funziona (account già creato)
In un terminale:
```bash
python -m pip install --upgrade castlabs-evs
```
```bash
python -m castlabs_evs.account signup
```
Questi due comandi sono già stati fatti. Se `signup` dà "Exceeded daily email limit", non è colpa tua: castLabs può mandare solo 50 email al giorno per tutti. Riprova dopo le 10:00 ora italiana, quando il limite si azzera.

`npm run setup` firma da solo il motore (`VARCO.exe.sig`). Se un giorno l'accesso scade, il build lo dice; si rinnova con `python -m castlabs_evs.account reauth`.

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
  - Netflix e Prime con la firma: la firma è valida, ma solo la tua prova con un account vero dice se il servizio accetta VARCO.
- **Firma VMP provata:**
  - il motore è firmato ("streaming, 1340 days left");
  - copiato come VARCO.exe con VARCO.exe.sig, come fa l'installer, la verifica di castLabs lo dà valido;
  - avviato così con l'app vera, il modulo Widevine arriva e il video protetto di prova parte (6 secondi, 153 fotogrammi).
