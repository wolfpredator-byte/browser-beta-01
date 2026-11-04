# VARCO Beta 0.36 — Import, schermo compatto, Home con widget, incognito, cronologia

Installer PC: `dist\VARCO Setup 0.36.0.exe`. Il telefono non cambia.

## Cosa cambia
- **Import da altri browser** (Impostazioni → Sistema → *Importa da un altro browser*). VARCO trova Chrome, Edge, Opera, Opera GX, Brave e Vivaldi, con i loro profili. Scegli tu cosa importare:
  - **Preferiti**, aggiunti in fondo ai tuoi senza doppioni (al massimo 500).
  - **Estensioni** del Chrome Web Store, reinstallate in VARCO. Quelle di altri negozi (es. Edge Add-ons) sono elencate come non disponibili.
  - **Attenzione:** alcune estensioni potrebbero non funzionare in VARCO. Usano funzioni di Chrome che VARCO (Electron) non ha ancora, come i cookie o le notifiche delle estensioni: si installano ma possono restare ferme. Lo dice anche un avviso nella sezione. Esempio provato: "Microsoft Bing Search with Rewards" si installa ma non parte.
  - **Motore di ricerca**.
  - **Pagine di avvio**, che diventano link rapidi della Home.
  - Le **password** non si possono leggere da altri browser: la sezione spiega come esportarle in CSV e importarle.
  - Il browser d'origine non viene modificato.
- **Modalità compatta** (Ctrl+Shift+K):
  - Il bordo che fa comparire le barre è più largo. Si sceglie in Aspetto → Disposizione: Stretto 3 px, Medio 12 px (predefinito), Ampio 24 px.
  - I pulsanti della finestra (–, □, ×) restano nascosti e compaiono solo con la barra in alto.
  - **I video non si fermano più.** Prima la pagina veniva sostituita da una sua foto mentre la barra era aperta; ora la pagina vera scivola di lato e continua a muoversi.
- **Home su misura.** Il pulsante **Personalizza la Home** aggiunge, sposta e toglie i widget:
  - Orologio e data.
  - Meteo, con la città che scegli, da Open-Meteo.
  - Note veloci.
  - Preferiti e siti più visitati.
  - Schede recenti e chiuse di recente.
  - Pagina web in un riquadro, con gli stessi accessi del workspace.
  - Animazioni, ognuna spegnibile in Aspetto → Home: entrata morbida, sfondo animato, effetto al passaggio del mouse.
- **Navigazione in incognito** (Ctrl+Shift+N, menu dei workspace o palette):
  - Finestra viola con la scritta "In incognito".
  - Niente cronologia, niente schede da riaprire, nessuna proposta di salvare le password, niente salvato su disco.
  - Cookie e accessi stanno solo in memoria e spariscono quando chiudi l'ultima finestra in incognito.
- **Cronologia selettiva** (pannello Cronologia):
  - Tiene fino a 5000 visite, raggruppate per giorno.
  - Ricerca.
  - Selezione multipla con "Elimina selezionati".
  - "Elimina tutto di questo sito" (anche i sottodomini).
  - "Elimina un periodo": ultima ora, 24 ore, 7 giorni, 30 giorni, tutta.
- **OLED tiene lo sfondo:** barre, pannelli, menu e riquadri restano nero puro, lo sfondo che hai scelto resta visibile.

## Correzioni dopo la prima prova (stesso numero di versione)
- **Bordo della modalità compatta:** la scelta c'era, ma la pagina Impostazioni non si aggiornava quando accendevi la compatta. Ora la riga "Modalità compatta: bordo che fa comparire le barre" è sempre visibile sotto la casella.
- **Pulsante "Personalizza la Home"** ben visibile: pieno, scritta bianca e bordo del colore del tema.
- **Tutti i riquadri si tolgono e si spostano**, anche quelli di sempre (Link rapidi, Progetti, Accesso rapido, JARVIS, Workspace attivo). Quelli tolti tornano nel menu "Aggiungi un widget". Logo e ricerca si nascondono da Aspetto → Home.
- **Widget Pagina web su misura:** in Personalizza, trascina l'angolo in basso a destra. La larghezza scatta a 1, 2 o 3 colonne, l'altezza è libera (160–1000 px).
- **Preferiti con la loro icona** (quella vista nelle schede, oppure il favicon del sito).
- **Anteprima al passaggio del mouse:** fermo mezzo secondo su un preferito o un sito più visitato, compare una finestrella con il sito vero (rimpicciolito, con i tuoi accessi). Sparisce quando il mouse esce.
- **YouTube: schermo nero al click sul video (schede e widget).** Colpa del blocco pubblicità: alcuni filtri per YouTube venivano iniettati come script separati che dichiaravano tutti la stessa cosa (`JSONPath`). Dal secondo in poi la pagina andava in errore e il player non si creava. Ora ogni filtro gira chiuso in sé e nel riquadro (iframe) che lo chiede, una volta sola. Il blocco pubblicità su YouTube resta acceso.
- **Spotify e siti con contenuti protetti nel widget:** compare un avviso: VARCO non ha ancora il modulo per i contenuti protetti (Widevine), quindi l'audio di Spotify (e di Netflix, Prime Video, Disney+…) non parte. Per ora apri questi siti nel loro programma o in un altro browser.

## Modalità insegnamento
- **Regole senza Electron, con test:**
  - `lib/import-rules.cjs`: file Bookmarks, Preferences e Secure Preferences.
  - `lib/history-rules.cjs`.
  - `lib/home-widgets-rules.cjs`.
  - `peekShift` e `COMPACT_EDGES` in `lib/frame-layout-rules.cjs`.
- **Incognito** (`lib/incognito.cjs`): è un workspace che *non* sta in `data.workspaces`, quindi non compare negli elenchi e non si salva. La partizione `varco-incognito` non ha `persist:`, quindi vive solo in memoria. `state.persistable` toglie le ultime tracce prima di scrivere su disco.
- **Widget "Pagina web":** è un `<webview>` nella cornice (`webviewTag`). `guardWebviews` in `windows.cjs` ammette solo pagine http(s), senza preload né Node, nella sessione del workspace. Le finestre che apre diventano schede.

## Test da fare
- [ ] **T226** — Impostazioni → Sistema → Importa: "Cerca i browser installati", scegli Chrome, spunta Preferiti ed estensioni, Importa. Compaiono nei Preferiti e in Estensioni. **📸**
- [ ] **T227** — Modalità compatta con un video di YouTube: porta il mouse in alto. La barra scende, i pulsanti –, □, × compaiono e il video **continua**. Allontanati: la barra e i pulsanti spariscono.
- [ ] **T228** — Aspetto → Disposizione → Bordo "Ampio": le barre compaiono già a 2 cm dal bordo.
- [ ] **T229** — Personalizza la Home: aggiungi Meteo (la tua città), Note, Pagina web (es. calendar.google.com, già collegato). Chiudi e riapri VARCO: restano. **📸**
- [ ] **T230** — Aspetto → Home: spegni "Sfondo animato" ed "Effetto al passaggio del mouse": la Home torna ferma.
- [ ] **T231** — Ctrl+Shift+N: finestra viola "In incognito". Accedi a un sito, chiudi la finestra, riaprila con Ctrl+Shift+N: non sei più collegato. La cronologia normale non ha quelle pagine.
- [ ] **T232** — Cronologia: cerca un sito, "Elimina tutto di …", poi "Elimina un periodo → Ultima ora".
- [ ] **T233** — Tema OLED con uno sfondo tuo: lo sfondo si vede, barre e riquadri sono neri.
- [ ] **T234** — Aspetto → Disposizione: sotto "Modalità compatta" c'è la riga del bordo. Scegli "Ampia (24 px)".
- [ ] **T235** — Personalizza la Home: togli JARVIS e Accesso rapido, sposta Link rapidi in alto, poi rimetti Accesso rapido da "Aggiungi un widget".
- [ ] **T236** — Widget Pagina web: in Personalizza trascina l'angolo: 2 colonne e più alto. Chiudi e riapri VARCO: resta così.
- [ ] **T237** — Passa con il mouse su un preferito della Home e resta fermo: compare l'anteprima del sito. Allontanati: sparisce. Le icone sono quelle vere dei siti. **📸**

**Stato:**
- 203 test superati (dopo le correzioni: `adblock-rules` e l'avviso contenuti protetti) (nuovi: `import-rules`, `history-rules`, `home-widgets-rules`, più casi in frame-layout, appearance, command-bus e window-rules).
- **Provato in VARCO** con un profilo di prova:
  - Import: browser trovati Chrome, Edge, Vivaldi, Opera GX; importati da Chrome 7 preferiti, Google ed estensione Microsoft Bing installata dallo Store.
  - Compatta: video che continua, pulsanti nascosti o visibili.
  - Cronologia: ricerca, elimina sito, elimina periodo.
  - Incognito: sessione solo in memoria, cookie cancellati alla chiusura, nulla nel file dei dati.
  - Home: tutti i widget, meteo reale, pagina web con la sessione giusta, animazioni accese e spente.
  - OLED con sfondo.
  - Dopo la tua prima prova, provato con una copia del tuo file dei dati: riga del bordo visibile, pulsante Personalizza leggibile sul tuo sfondo, riquadri di sempre tolti, spostati e rimessi, angolo del widget web (2 colonne · 413 px salvati), icone vere, anteprima di GitHub al passaggio del mouse.
  - YouTube con il blocco pubblicità acceso e la copia dei tuoi dati: prima nessun player ed errori `JSONPath`; ora il video parte, sia in una scheda sia nel widget della Home (nessun errore nella pagina).
- **Non provato:** con il mouse vero sulla tua finestra (la compatta l'ho guidata dall'interno) e dall'installer.
