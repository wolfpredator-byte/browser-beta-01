# Browser Beta 0.3.1 — Vivaldi-inspired Shell
**Stato:** codice caricato nel branch `beta-0.3.1-vivaldi-shell`; test dell'interfaccia Windows ancora da eseguire. Branch precedente e `main` non modificati.

## Obiettivo
Conservare la navigazione e la homepage Black Glass già funzionanti, avvicinando l'ergonomia a Vivaldi **senza copiarne branding o codice**.

## Nuove funzioni e principi tecnici

### 1. Barra laterale permanente (main.cjs + renderer.js + index.html + style.css)
La sidebar è *sorella* della dashboard Home, non sua figlia. Le pagine remote sono `WebContentsView`, che Electron disegna in una superficie distinta dal DOM della cornice.
- `data.sidebarMode`: `hidden`, `compact`, `expanded`. Salvato nel file locale `browser-data.json`.
- `SIDEBAR_WIDTHS`: `{hidden:0,compact:62,expanded:198}` rappresenta le larghezze in pixel. Cambiarle richiede modificare `--side-width` in `style.css`.
- `bounds()`: calcola geometria dei siti. La coordinata `x` include sidebar + pannello laterale. Se la dimentichi, il sito si sovrappone alle icone.
- `setSidebarMode`: azione IPC validata, aggiorna preferenza, geometria e interfaccia.
- Il pulsante **▥** della barra superiore nasconde o mostra la sidebar; **☰** passa da icone a icone+testo.
- `workspace-button`: ognuno ha un nodo icona separato dal nome; in compact si nasconde solo il nome, *senza ridurre il font di tutto il bottone*.
- Click destro su un workspace: `chooseWorkspaceIcon` apre la scelta di un file PNG/JPG/WebP. Un'immagine locale fino a **4 MiB** viene ridotta a **48×48 px**, convertita in PNG e conservata nei dati del browser. Non diventa una risorsa del sito web.

### 2. Pannelli Preferiti / Cronologia / Schede
- `sidePanelOpen`: `bookmarks`, `history`, `tabs` o `null`.
- `toggleSidePanel`: apre o richiude il pannello della barra sinistra.
- `renderSidePanel()`: rende gli elementi nel DOM del browser, quindi visibili anche durante la navigazione.
- Il pannello misura **300px**: sia il CSS sia `bounds()` riservano lo stesso spazio.
- Per questa iterazione il pannello laterale e quello dei download sono mutuamente esclusivi.

### 3. Schede inferiori
- `#tabs` usa `flex: 0 1 auto` anziché `flex: 1`. Prima occupava tutto lo spazio libero, spingendo il `+` all'estrema destra. Ora il pulsante segue l'ultima scheda.
- `newTab` senza URL crea Home, non apre Google automaticamente. Puoi sempre digitare una ricerca o un indirizzo dalla toolbar.
- `placeTab(tab)` inserisce le nuove schede subito dopo quella attiva dello stesso workspace.
- `closeTab(id)`: se non rimangono schede nell'intera app, salva la sessione vuota e chiude Windows. Al nuovo avvio viene creata una Home. Se restano schede in altri workspace, una Home temporanea impedisce uno schermo vuoto nel workspace corrente.
- `showWorkspaceMenu`: menu nativo nell'angolo inferiore per cambiare workspace senza espandere la sidebar.

### 4. Cornice Windows integrata
- `titleBarStyle:'hidden'` rimuove la barra Windows tradizionale.
- `titleBarOverlay:{color:'#0b0b0b',symbolColor:'#eeeeee',height:30}` mantiene i pulsanti standard Windows. Non sono pulsanti HTML inventati.
- `.window-titlebar { app-region:drag; }` permette di trascinare la finestra dalla fascia alta.
- `HEADER = 94`: **30px** di titlebar + **64px** di barra URL. Se aumenti la titlebar a 34px, devi aggiornare il totale a 98px e i corrispondenti `top` CSS.
- `FOOTER = 43`: spazio dedicato alle tab inferiori.
- La nuova cornice è attivata solo su Windows; altre piattaforme mantengono la cornice predefinita.

### 5. Menu contestuale per immagini
Sono stati aggiunti **Apri immagine in nuova scheda**, **Copia indirizzo immagine**, **Copia immagine** e **Salva immagine con nome…**, quando la risorsa supporta queste azioni. La voce Salva passa nel sistema di download preesistente.
Non funzionano necessariamente tutte le immagini `blob:`, canvas o con protezioni del sito.

## Test di accettazione Windows
Avvia il terminale dalla cartella già collegata a GitHub:
```powershell
git fetch origin
git switch beta-0.3.1-vivaldi-shell
npm run check
npm start
```
- [ ] La titlebar non è rossa e Windows consente di minimizzare, massimizzare, chiudere e trascinare la finestra.
- [ ] Home, Google e YouTube si aprono e la sidebar resta visibile anche sui siti.
- [ ] **☰** alterna larghezze; le icone NON cambiano grandezza e il testo scompare nella modalità compatta.
- [ ] **▥** nasconde e ripristina tutta la sidebar.
- [ ] Click destro su Destiny Builder nella sidebar → scegli icona PNG: appare a 20px e resta dopo il riavvio.
- [ ] Preferiti, Cronologia e Schede aprono un pannello anche quando sei su un sito.
- [ ] `+` resta subito dopo l'ultima scheda e crea una Home.
- [ ] Nuove schede appaiono subito dopo la scheda selezionata.
- [ ] Il selettore in basso cambia workspace.
- [ ] Chiudere **tutte** le schede chiude la finestra; riaprirla riparte da Home.
- [ ] Il menu `⋯` delle schede non ridimensiona il sito.
- [ ] Click destro su un'immagine HTTPS offre Apri/Copia/Salva.
- [ ] Il salvataggio e la barra Download della versione precedente continuano a funzionare.

## Funzionalità richieste da pianificare, non presenti in questa revisione
1. **Gestione avanzata schede**: veri Tab Stacks comprimibili, rinomina, muting, hibernate, sposta su workspace, riapri schede chiuse, tiling.
2. **Pannelli personalizzabili**: collegamenti web laterali con favicon, mail/contatti/calendario/task via integrazioni con autorizzazione dell'utente, note, traduzione, reading list.
3. **Comandi inferiori**: screenshot della pagina senza UI, zoom e reset, auto-hide (con hover), orologio, azioni pagina, tiling.
4. **Browser core e sicurezza**: gestione permessi per sito, download avanzati, supporto estensioni da studiare attentamente, aggiornamento di Electron/dipendenze e valutazione delle vulnerabilità.
5. **Context awareness**: apertura progetti VS Code e workspace giochi in base a processi monitorati localmente e con consenso.

> Questa revisione è una base di interfaccia, non una clonazione 1:1 di Vivaldi né un browser pronto per account sensibili.
