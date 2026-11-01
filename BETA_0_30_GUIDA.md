# VARCO Beta 0.30 — VARCO per Android

APK: `dist\VARCO-Android-0.30.0.apk`. Si rifà con `npm run android`: compila `mobile/`, fa girare i test e copia l'APK in `dist\`.

Il browser per PC non cambia in questa versione. La 0.30 è la prima del telefono, e prepara la 0.31: mandare le schede tra telefono e PC.

## Installarla sul telefono
1. Copia l'APK sul telefono (cavo USB, Drive, Telegram…) e aprilo.
2. Android ti chiede di permettere l'installazione da quella app (File, Drive…): consenti.
3. Se Play Protect avvisa che l'app è sconosciuta, scegli "Installa comunque". Succede perché l'app non viene dal Play Store.
4. Per usarla come browser di serie: **Impostazioni di Android → App → App predefinite → Browser → VARCO**.

## Com'è fatta
- **Una barra sola, in basso**, come le schede del PC. Ci sono l'indirizzo (col lucchetto se il sito è sicuro), il pulsante delle schede col numero e il menu.
  - Tocca l'indirizzo per scrivere.
  - Scorri l'indirizzo a destra o a sinistra per passare alla scheda vicina.
  - Ricarica col pulsante a destra dell'indirizzo.
- **Scrivere:** il pannello sale sopra la tastiera e mentre scrivi propone:
  - la scorciatoia (`!yt gatti`, `gatti !w`… le stesse del PC);
  - le schede già aperte che corrispondono ("Passa alla scheda");
  - "Vai" per un indirizzo, oppure "Cerca" col tuo motore.
  - Funzionano anche gli indirizzi dei PC di casa: `192.168.1.20:3000`.
- **Home:** sfondo e logo del tema, orologio, data e la barra di ricerca. In alto a sinistra c'è il workspace in cui sei.
- **Pagine:** hanno gli angoli tondi e un piccolo margine, come la cornice del PC.

## Schede e workspace
- **Pulsante schede** (il quadrato col numero): apre la griglia delle schede del workspace, con l'anteprima di ogni pagina.
  - Tocca una scheda per aprirla, × per chiuderla.
  - Tieni premuta una scheda per spostarla in un altro workspace.
  - In alto ci sono i workspace: tocca per cambiare, tieni premuto per rinominare, cambiare colore o eliminare, **+** per crearne uno nuovo.
  - Se tieni premuto il pulsante schede (senza aprire la griglia), apri subito una scheda nuova.
- Chiudendo l'ultima scheda di un workspace torni alla Home, come sul PC.
- **Indietro** (gesto o tasto di Android): torna alla pagina precedente. Quando la cronologia è finita la scheda torna alla Home, e dalla Home esci da VARCO.
- **Schede che dormono:** restano vive al massimo 4 pagine insieme. Le altre si "addormentano": tengono indirizzo e cronologia avanti/indietro, ma liberano la memoria. Quando ci torni si ricaricano.
- Schede, workspace e impostazioni restano anche se chiudi l'app.

## Menu
- In alto: indietro, avanti, ricarica, Home, nuova scheda.
- **Condividi** l'indirizzo con un'altra app.
- **Versione desktop:** i siti ti vedono come Chrome per Windows.
- **Tema:** i 16 preset e le 7 tinte del PC, con gli stessi colori, sfondi e loghi. Tocca un tema e cambia subito.
- **Motore di ricerca:** Google, DuckDuckGo, Bing, Brave, Startpage, Ecosia.

## Il resto
- **Link dalle altre app:** con VARCO come browser di serie, i link si aprono in VARCO. Riusa la scheda se è una Home vuota, altrimenti ne apre una nuova. "Condividi → VARCO" da un'altra app apre il link o cerca il testo.
- **Download:** finiscono nella cartella Download del telefono, con la notifica di Android.
- **Caricare file** nei siti (foto, documenti) usa la scelta file di Android.
- **Video a schermo intero:** nasconde le barre di sistema.
- I link a telefono, mail, Maps e Play Store aprono l'app giusta.
- I popup aperti senza un tuo tocco sono bloccati, come sul PC.

## Modalità insegnamento
- **Kotlin e WebView di sistema:** su Android, VARCO usa la WebView di sistema, cioè lo stesso motore Chromium di Chrome, aggiornato dal Play Store. Non c'è niente di Electron. L'interfaccia è costruita nel codice (`Ui.kt`), senza file di layout, così cambiare tema vuol dire semplicemente ridisegnarla.
- **Regole senza Android:** `UrlRules.kt` (indirizzi, ricerche, scorciatoie) e `Model.kt` (schede, workspace, chi dorme) non usano Android. Così si verificano con JUnit sul PC, come i test `node --test` del browser per PC.
- **Asset condivisi:** sfondi e loghi non sono copiati nel repository. A ogni build Gradle li prende da `assets/` del PC (`copyVarcoAssets` in `mobile/app/build.gradle.kts`).
- **User agent:** tolgo `; wv` e `Version/4.0`, che dicono ai siti "sono una WebView". Alcuni siti, se lo vedono, mostrano pagine ridotte.

## Test da fare
- [ ] **T181** — Installa l'APK. Si apre la Home con orologio, data, logo e sfondo VARCO. **📸**
- [ ] **T182** — Tocca la barra, scrivi `gatti` e premi Invio: si apre la ricerca. La barra mostra "gatti" e non l'indirizzo. Scrivi `!yt gatti`: va su YouTube.
- [ ] **T183** — Apri 3 schede, poi il pulsante schede: vedi le anteprime. Scorri la barra dell'indirizzo a sinistra e a destra: passi da una scheda all'altra. **📸**
- [ ] **T184** — Crea il workspace "Lavoro" con un colore. Sposta lì una scheda tenendola premuta. Passando da un workspace all'altro, le schede sono separate.
- [ ] **T185** — Menu → Tema → Vice City: cambiano colori, sfondo e logo. Chiudi l'app dalle app recenti e riaprila: tema, schede e workspace ci sono ancora. **📸**
- [ ] **T186** — Apri 6 schede con siti diversi e torna alla prima: si ricarica, perché dormiva, e Indietro funziona ancora.
- [ ] **T187** — Video di YouTube a schermo intero: le barre spariscono. Indietro esce dallo schermo intero.
- [ ] **T188** — Imposta VARCO come browser di serie, poi tocca un link in un'altra app (Telegram, mail…): si apre in VARCO. Scarica un file: arriva in Download.

**Prima prova sul telefono (2 novembre):** Home, menu e temi a posto. Corretti:
- la barra restava sopra il video a schermo intero e sopra la griglia delle schede, coprendo "Nuova scheda" e "Fatto". Su Android un elemento con l'ombra (elevation) si disegna sopra a tutto: ho tolto l'ombra;
- la griglia era semitrasparente e si vedevano la Home e la pagina sotto: ora è opaca;
- le anteprime erano nere: ora la foto si copia dallo schermo (PixelCopy) mentre la pagina è visibile;
- le schede mai aperte da quando hai avviato l'app mostrano l'icona e il nome del sito al posto della foto;
- il bordo della scheda aperta si vedeva solo in alto: ora sta sopra la miniatura e la circonda tutta.

**Stato:** 11 test JUnit superati (regole della barra, user agent, schede e workspace, schede che dormono). L'APK compila.
- **Non ancora provato su un telefono vero.** L'emulatore non parte su questo PC: manca l'accelerazione hardware. Per attivarla: Windows → "Attiva o disattiva funzionalità di Windows" → **Piattaforma hypervisor Windows**, poi riavvia. Il telefono virtuale di prova `VARCO_Test` è già creato.
- In alternativa, con il **debug wireless** del telefono (Opzioni sviluppatore → Debug wireless) posso installare l'app e leggerne gli errori direttamente dal PC.
