# VARCO — Guida delle beta

Un solo documento per tutte le versioni: la più recente è in cima. Le guide fino alla 0.36 sono nei file `BETA_X_Y_GUIDA.md`.

---

## Beta 0.43.1 — Tipi di progetto (0.43, fase B)

Installer PC: `dist\VARCO Setup 0.43.1.exe` (con la firma VMP). Seguono la pagina del progetto (0.43.2) e la sessione di gioco (0.43.3).

### Cosa cambia
- **Ogni progetto ha un tipo**, che cambia azioni rapide, pannelli consigliati e file importanti (pannello Progetto → «Tipo di progetto»):
  - **Web e app** — anteprima, editor, build, repository;
  - **Game dev** — avvia il motore, apri repo, build, log ed errori;
  - **3D** — apri Blender (l’ultimo .blend), cartella asset, render, reference;
  - **Video** — apri progetto (l’ultimo Premiere/DaVinci/…), footage, export, musica;
  - **Musica** — apri la DAW (l’ultimo progetto FL Studio/Ableton/Reaper/…), sample, testi, mix;
  - **Studio** — apri PDF, appunti, bibliografia, tesi;
  - **Gaming** — wiki, build, Discord, stream (dai siti del gioco collegato).
- **VARCO propone il tipo guardando la cartella:** Unity (anche in una sottocartella), Unreal, Godot, package.json/Gradle/.sln/pyproject, .blend e HDRI, progetti di montaggio, DAW, PDF e bibliografia; un workspace collegato a un gioco è «Gaming». Provato sulle cartelle di C:\Projects: riconosciute tutte tranne quelle di soli dati (lì scegli tu).
- **Lo scegli tu:** la scelta si salva in **`.varco/project.json` dentro la cartella del progetto**, così viaggia con il progetto (e con git).
- **Unity si apre con l’editor della versione giusta** (letta da ProjectSettings/ProjectVersion.txt; se non c’è, Unity Hub). «Log ed errori» apre l’Editor.log di Unity (o i log di Unreal) nel visualizzatore di VARCO.
- **Apri repo** apre il repository remoto (da .git/config, senza credenziali nell’indirizzo).
- **Pannelli consigliati** del tipo (es. 3D → ArtStation, Pinterest, YouTube, Poly Haven): un clic e diventano pannelli web.
- **File importanti a gruppi** (es. Scene / Script / Asset, Texture / Render, MIDI / Stems / Export) e **modificati di recente**: un clic e si aprono.
- Funziona anche **senza progetto.browser.json** (serve solo per i comandi, ora facoltativo per i progetti non web).

### Test da fare
- [ ] **T319** — Collega la cartella di un progetto Unity: tipo «Game dev» proposto, «Avvia Unity» apre l’editor della versione del progetto. **📸**
- [ ] **T320** — «Log ed errori» su un progetto Unity: si apre l’Editor.log.
- [ ] **T321** — Una cartella con un .blend: «Apri Blender» apre l’ultimo file; «Render» apre la cartella dei render.
- [ ] **T322** — Cambia il tipo dal menu: in .varco/project.json c’è il tipo, e riaprendo VARCO resta quello.
- [ ] **T323** — «＋ Pinterest» tra i pannelli consigliati: diventa un pannello web.
- [ ] **T324** — «Apri repo» su un progetto con git: si apre la pagina GitHub del repository.

**Stato:**
- 270 test superati (5 nuovi: riconoscimento dei tipi, file importanti, cartelle, versione di Unity, repository).
- **Provato in VARCO** su C:\Projects\Car_Highway (3D proposto, azioni, pannelli, 190 texture e 182 render a gruppi) e sul cambio di tipo in una cartella di prova (.varco/project.json scritto, azioni della musica). Riconoscimento provato su tutte le cartelle di C:\Projects.
- **Non provati** (aprono programmi sul PC): l’avvio di Unity/Blender/DAW, l’Editor.log, l’installer.

---

## Beta 0.43.0 — Dev server affidabili e companion sul monitor giusto (0.43, fase A)

Installer PC: `dist\VARCO Setup 0.43.0.exe` (con la firma VMP). Prima parte della 0.43 (workbench): seguono i tipi di progetto (0.43.1), la pagina del progetto (0.43.2) e la sessione di gioco (0.43.3).

### Cosa cambia — dev server
- **VARCO osserva il server invece di aprire un indirizzo fisso:** avvio → legge il log → trova indirizzo e porta → **aspetta che risponda** → apre la pagina. Mai più la pagina aperta prima che il server sia pronto.
- **Indirizzo trovato in due modi:**
  - dal log, per Vite, Next.js, webpack, Angular, Astro, Python, Django, Flask, Rails, PHP, Hugo, Express («listening on port 3000»), anche con i colori del terminale;
  - **chiedendo a Windows su quali porte ascolta** il processo e i suoi figli: funziona anche se il server **non stampa niente** o **usa un’altra porta**.
- **Più indirizzi:** si apre quello locale (0.0.0.0 diventa localhost); quello di rete si vede a parte («Dalla rete (telefono)»).
- **Server che cambia porta da solo** (es. «Port 5173 is in use, trying another one»): VARCO segue il nuovo indirizzo.
- **Comando che finisce ma lascia il server acceso** (processo staccato): VARCO lo ritrova e «Ferma» lo spegne davvero.
- **Una scheda di anteprima per progetto:** si ricarica invece di aprirne una nuova; se il server cambia porta, la scheda va al nuovo indirizzo restando sulla stessa pagina.
- **Stato sempre visibile** nel pannello del progetto: Avvio… → In attesa di localhost:5173… → **Pronto** (pallino verde) / **Errore** con il motivo.
- **Errori riconosciuti:** porta occupata («la porta 3000 è usata da node.exe»), programma non installato, dipendenze mancanti (npm install), script inesistente, errore di compilazione (il server resta acceso).
- **Pulsanti:** Apri anteprima (se il server è spento lo avvia e apre la pagina quando risponde; se si sta avviando la apre appena è pronto), Riavvia, Ferma, Termina tutto, Apri cartella, Modifica file; Riavvia anche su ogni comando.
- Un comando che non è un server (build, script) dopo qualche secondo dice «In esecuzione» invece di restare su «Avvio…».

### Cosa cambia — posizione delle finestre (bug del companion)
- **Il bug:** il companion si apriva sull’ultimo monitor usato da VARCO. Succedeva perché il monitor era salvato solo con l’id di Electron, che su Windows **cambia** (riavvio, driver, monitor ricollegato): non trovandolo, la finestra nasceva accanto all’ultima finestra di VARCO.
- **Ora il monitor si riconosce dall’impronta** (id, nome, risoluzione, posizione): provato con 3 monitor e un id cambiato, il companion va comunque sul monitor giusto e l’id si aggiorna da solo.
- **Monitor scollegato → principale.** Il companion **non eredita mai** la posizione dell’ultima finestra di VARCO.
- **Per ogni gioco:** monitor, **lato dello schermo** (tutto, metà sinistra/destra/alto/basso, centro) e **dimensione** (25–100%). «Dove l’hai lasciato l’ultima volta» ricorda davvero la posizione del companion.
- **Dal companion, nella palette (F1):** «Apri sempre qui», «Sposta sull’altro monitor», «Ricorda la posizione».
- **Impostazioni → Companion dei giochi:** monitor, lato e dimensione predefiniti per i giochi senza un monitor scelto.

### Test da fare
- [ ] **T311** — Un progetto Vite o Next: Apri anteprima con il server spento. Lo stato passa da Avvio… a In attesa… a Pronto e la pagina si apre solo allora. **📸**
- [ ] **T312** — Avvia due volte lo stesso server (la seconda trova la porta occupata): il secondo segue la nuova porta, oppure l’errore dice chi usa la porta.
- [ ] **T313** — Riavvia: la stessa scheda di anteprima si ricarica, nessuna scheda nuova.
- [ ] **T314** — Un server che non scrive l’indirizzo nel log: VARCO lo trova dalle porte.
- [ ] **T315** — Ferma / Termina tutto: nessun node.exe resta acceso (Gestione attività).
- [ ] **T316** — Companion di Destiny 2 su un monitor scelto, metà destra: si apre lì anche se usavi VARCO su un altro monitor. **📸**
- [ ] **T317** — Dal companion: F1 → «Sposta sull’altro monitor», chiudi, riapri il gioco: si apre sul nuovo monitor.
- [ ] **T318** — Impostazioni → Companion dei giochi: cambia la posizione predefinita e prova un gioco senza monitor scelto.

**Stato:**
- 265 test superati (16 nuovi: indirizzi dai log di 12 tool, porte, errori, stati; monitor per impronta, lato e dimensione, monitor scollegato, «Apri sempre qui»).
- **Provato in VARCO** con un progetto di prova: server senza indirizzo nel log che risponde dopo 3 s (trovato dalla porta, scheda aperta al momento giusto), server che cambia porta (5790 → 5791, con indirizzo di rete), comando che finisce lasciando il server acceso (trovato, «Ferma» lo spegne). Companion con i 3 monitor veri del PC e un id cambiato: monitor giusto, metà destra; monitor scollegato → principale.
- **Non provati:** un progetto Next/Vite vero, HTTPS locale, l’installer.

---

## Beta 0.42 — Tutorial: setup, tour e suggerimenti

Installer PC: `dist\VARCO Setup 0.42.0.exe` (con la firma VMP). Il telefono non cambia.

### Cosa cambia
- **Una visita guidata sui pulsanti veri** (stile «Riflettore», scelto negli esempi): tutto in penombra tranne il pulsante di cui si parla, che resta cliccabile. Accanto una scheda con il passo, la freccia, i pallini di avanzamento, Indietro / Avanti, «Non mostrare più» e la ×.
- **Primo avvio (~60 s), 7 passi:** benvenuto, workspace, tema (i colori nella scheda, si applicano subito), telefono, JARVIS, preferiti, fine. Parte da solo **solo al primo avvio** di un profilo nuovo, una volta.
- **Tour completo (3–5 min), 8 passi, un concetto ciascuno:** VARCO, Workspace, Palette (F1), Fast link (launcher), Progetti, Pannelli, Giochi, Sicurezza («usa l’incognito e un password manager esterno»).
- **L’azione vera completa il passo:** cliccare il pulsante evidenziato, premere F1, aprire il launcher. Il pulsante della scheda fa la stessa cosa (es. «Apri Telefono» apre Impostazioni → Telefono). «Avanti» c’è sempre: non blocca mai.
- **Pulsanti fuori vista:** se la barra laterale è lunga, scorre da sola fino al pulsante (Progetti, Giochi, Impostazioni…).
- **Si chiude in ogni momento** con `Esc` o la ×, e **riprende dal passo dove eri**. `←` `→` passano da un passo all’altro.
- **Suggerimenti della prima volta**, una volta sola ciascuno: palette, Progetti, Pannelli, Giochi, link rapidi della Home. «Capito» o «Non mostrare più suggerimenti».
- **«Non mostrare più» rispettato al 100%:** niente setup, tour né suggerimenti finché non li riapri tu.
- **Impostazioni → Sistema → Guida:** «Ripeti il tour», «Apri il setup», «Riprendi il tour (passo N)» se l’hai lasciato a metà, e l’interruttore dei suggerimenti.
- Durante il tour la pagina web è nascosta e al suo posto c’è la sua foto, come con il command center: così il riflettore copre anche lei.

### Test da fare
- [ ] **T303** — Installa su un profilo nuovo (o cancella i dati): al primo avvio parte il setup. Riavvia senza finirlo: non riparte da solo. **📸**
- [ ] **T304** — Setup: scegli un tema nella scheda, si applica subito e il tour prende il suo colore.
- [ ] **T305** — Impostazioni → Guida → Ripeti il tour: al passo Palette premi F1, il passo si spunta; chiudi la palette e il tour riprende.
- [ ] **T306** — Al passo Fast link apri il launcher con la sua scorciatoia: il passo si spunta.
- [ ] **T307** — Al passo Giochi (finestra non massimizzata): la barra laterale scorre fino a Giochi e il riflettore è sul pulsante giusto. **📸**
- [ ] **T308** — `Esc` a metà tour: in Impostazioni → Guida compare «Riprendi il tour (passo N di 8)» e riparte da lì; «Ripeti il tour» ricomincia da capo.
- [ ] **T309** — Primo clic su Progetti: compare il suggerimento, una volta sola.
- [ ] **T310** — «Non mostrare più»: nessun suggerimento né tour finché non premi Ripeti il tour.

**Stato:**
- 255 test superati (6 nuovi per passi, primo avvio, progresso, «Non mostrare più», suggerimenti).
- **Provato in VARCO** con un profilo nuovo: il setup parte da solo, il tema Ember si applica, `Esc` chiude e salva il passo, la pagina torna. Tour completo: F1 spunta il passo Palette e il tour riprende dopo la palette; la barra laterale scorre fino a Giochi e Impostazioni; il clic vero su Giochi completa il passo; suggerimento di Progetti una volta sola; «Non mostrare più» spegne tutto. Sezione Guida nelle Impostazioni.
- **Non provati:** il passo del launcher con la scorciatoia premuta davvero, tema chiaro e OLED, l’installer.

---

## Beta 0.41 — Suggerimenti nuovi nella barra degli indirizzi e nella Home

Installer PC: `dist\VARCO Setup 0.41.0.exe` (con la firma VMP). Il telefono non cambia.

### Cosa cambia
- **Ogni posto fa una cosa sola.** La barra degli indirizzi e la ricerca della Home suggeriscono **solo il web**, come un browser: indirizzi, siti e ricerche. App, progetti e comandi restano nel launcher e nel command center. (Il `>` nella barra per i comandi c'è ancora.)
- **Il risultato migliore in evidenza** (impaginazione V3 scelta negli esempi):
  - in alto il sito con le sue **pagine principali** (es. Epic Games → Negozio, Giochi gratis, Libreria) e le azioni: Apri, Nuova scheda, Cerca sul sito…, Copia il link;
  - `Tab` passa tra le azioni, `Invio` esegue quella scelta, `Ctrl+Invio` apre in una nuova scheda;
  - sotto le **linguette** Tutto · Indirizzi (o Siti) · Ricerche, con il conteggio, per filtrare.
- **Archivio di ~200 siti tra i più usati**, dentro VARCO (nessuna rete): nome, dominio, nomi alternativi, categoria, pagine principali, ricerca sul sito. Niente loghi: l'icona vera compare quando il sito l'hai già visitato, altrimenti l'iniziale sul suo colore.
- **Ricerca tollerante:** «epic», «epc», «egs», «epic game store», «epci gmaes» trovano Epic Games; «yt» YouTube; «spotfy» Spotify.
- **Cerca direttamente su un sito:** «youtube lofi», «yt lofi» o «lofi su youtube» → «Cerca lofi su YouTube». Vale per i siti dell'archivio con una ricerca (Amazon, Reddit, GitHub, Wikipedia, Steam…). Le scorciatoie `!` della 0.28 funzionano come prima.
- **Priorità:** cronologia (visite e quanto di recente), preferiti, fast link, schede aperte e il workspace attivo.
- **Impara da solo:** un sito che non è nell'archivio, dopo **5 visite**, diventa un sito suggerito con il suo nome (es. «D2 Foundry»). Niente localhost né indirizzi di rete.
- **Ricorda le tue scelte:** se per «dis» scegli Discord qualche volta, la volta dopo è primo.
- **Ripiego:** se non riconosce nulla, la ricerca sul web. I suggerimenti del motore di ricerca arrivano sotto, solo se attivi in Impostazioni → Command center.

### Test da fare
- [ ] **T296** — Nella barra scrivi «epic»: in alto Epic Games con Negozio, Giochi gratis, Libreria. `Tab` passa sulle azioni, `Invio` apre quella scelta. **📸**
- [ ] **T297** — Scrivi «egs», «epc» ed «epic game store»: sempre Epic Games in alto.
- [ ] **T298** — Nella Home scrivi «youtube lofi»: in alto «Cerca lofi su YouTube», `Invio` apre la ricerca su YouTube.
- [ ] **T299** — Linguette: clic su «Ricerche» mostra solo le ricerche; «Tutto» le riporta tutte.
- [ ] **T300** — Un sito non famoso visitato 5 volte: scrivendo il suo nome compare tra i siti.
- [ ] **T301** — Scegli due volte lo stesso risultato per un testo corto (es. «dis» → Discord): la volta dopo è primo.
- [ ] **T302** — Tema chiaro e OLED: la tendina si legge bene.

**Stato:**
- 249 test superati (11 nuovi per il motore: ricerca tollerante, intenti, priorità, siti imparati, scelte, velocità).
- **Provato in VARCO** con un profilo di prova e tasti veri: «epic» nella barra (Epic Games in evidenza con le pagine principali, `Tab` sulle azioni, suggerimenti di Startpage sotto), «youtube lofi» nella Home (ricerca su YouTube con l'icona del sito), «gi» + `Invio` (la scelta viene ricordata).
- **Non provati:** tema chiaro e OLED, l'installer.

---

## Beta 0.40 — Launcher: più anelli, cartelle del PC, media, chiusura animata

Installer PC: `dist\VARCO Setup 0.40.0.exe` (con la firma VMP). Contiene anche tutta la 0.39 (il launcher), che non era stata pubblicata. Il telefono non cambia.

### Cosa cambia
- **Più anelli per profilo, come pagine.** Ogni profilo può avere fino a 5 anelli da 8 posti.
  - In modifica (`F2`): «Nuovo anello» (o il «+» sotto l'anello) e «Togli questo anello». I fast link di un anello tolto passano in «Altro nel profilo».
  - Per passare da un anello all'altro: `PagSu` / `PagGiù`, `Ctrl+← →`, la rotella del mouse sull'anello o i pallini sotto. L'anello gira di un ottavo nella direzione scelta.
  - `1`–`8` aprono i posti dell'anello che vedi. Aggiungendo un fast link, va nel primo posto libero di tutti gli anelli.
- **Cartelle e file del computer.**
  - In modifica, in cima al ventaglio: «Scegli una cartella del PC…» e «Scegli un file del PC…» (Esplora file). Vanno nel posto che stai modificando.
  - Cercando trovi anche Desktop, Documenti, Download, Immagini, Video, Musica, la cartella utente e i dischi (`Disco C:`, `Disco D:`…).
- **Media di siti e app.** In cima al ventaglio, «In riproduzione»:
  - i siti che suonano in VARCO (lettore della 0.37.1): clic sulla copertina per andare alla scheda;
  - le app di Windows che usano i controlli multimediali di sistema (Spotify, lettore multimediale, Chrome, VLC…);
  - indietro, play/pausa e avanti, anche con `F7`, `F8` e `F9` (sul primo, cioè quello che suona). Si aggiorna da solo ogni 2,5 secondi.
- **Chiusura animata:** il contrario dell'entrata. Gli spicchi rientrano in ordine inverso, il centro si rimpicciolisce, il ventaglio scivola via e il velo sparisce. Con «riduci movimento» di Windows solo una dissolvenza.

### Test da fare
- [ ] **T291** — `F2` → «Nuovo anello»: compare il secondo anello. Mettici qualcosa, poi passa da un anello all'altro con `PagGiù`, la rotella e i pallini. Chiudi e riapri: c'è ancora. **📸**
- [ ] **T292** — «Togli questo anello» sul secondo: i suoi fast link sono in «Altro nel profilo».
- [ ] **T293** — «Scegli una cartella del PC…»: scegli una cartella qualsiasi, finisce nel posto. Cerca «documenti» e «disco»: trovi le cartelle di Windows e i dischi.
- [ ] **T294** — Con YouTube che suona in VARCO e Spotify (app) aperto: tutti e due in «In riproduzione». Play/pausa e avanti funzionano dai pulsanti e da `F8` / `F9`. **📸**
- [ ] **T295** — Chiudi il launcher con `Esc`, con un clic fuori e aprendo un fast link: ogni volta esce con l'animazione al contrario.

**Stato:**
- 238 test superati (1 nuovo per gli anelli).
- **Provato in VARCO** con un profilo di prova: «Dal computer» in modifica, nuovo anello, «Documenti» messo nel primo posto del secondo anello e salvato (16 posti), `PagSu` per tornare al primo. Le schede che suonavano comparivano in «In riproduzione» e il pulsante play/pausa le comandava. La chiusura dura circa 0,3 s, poi la finestra si nasconde.
- La lettura dei media delle app di Windows funziona sul PC, ma al momento della prova nessuna app suonava: **comandi di Spotify e simili non provati**.
- **Non provati:** la finestra «Scegli una cartella…» (aperta a mano) e l'installer.

---

## Beta 0.39 — Launcher: due anelli, anche fuori da VARCO

Non pubblicata da sola: è dentro la 0.40 (installer `dist\VARCO Setup 0.40.0.exe`).

### Cosa cambia
- **Una scorciatoia di sistema apre il launcher ovunque:** in gioco, sul desktop, in un altro programma.
  - Di base è `Ctrl+Alt+Spazio`. Se un altro programma la usa già, VARCO prende la prima libera e te lo dice con una notifica (sul PC di prova: `Ctrl+Maiusc+Spazio`).
  - La cambi in **Impostazioni → Launcher**, dove puoi anche spegnerlo.
- **Due anelli, come il menu di un videogioco:**
  - **Fast launcher:** i fast link del programma in primo piano.
  - **Command center:** le sezioni della 0.38 (schede, progetti, fast link, comandi, web, JARVIS, crea) della finestra di VARCO usata per ultima.
  - La scorciatoia premuta di nuovo (o `F1`) gira l'anello sull'altro. Il fast launcher prende il colore del profilo, il command center l'accento del tema.
- **Profili per programma:** VARCO riconosce il programma in primo piano dal suo eseguibile (es. `destiny2.exe`) e mostra i suoi 8 posti.
  - Sul desktop, in VARCO o in Esplora file vale il **profilo generale**. La prima volta parte dai fast link del workspace attivo.
  - Un programma senza profilo mostra **«Crea il profilo»**. Se è un gioco del pannello Giochi, il profilo parte già con i suoi siti.
- **Modifica del profilo:** `F2`, «Modifica» o clic su un posto libero.
  - `← →` scegli il posto, `Alt+← →` lo sposti, `Canc` lo svuoti, scrivi per cercare, `Invio` metti.
  - Puoi metterci siti, app installate, giochi, cartelle e file, comandi dei progetti, note dei workspace, pannelli web, prompt di JARVIS e la pagina aperta in VARCO.
  - Anche trascinando file e cartelle sul launcher.
- **Suggeriti:** i siti del gioco (pannello Giochi) e quello che apri almeno 2 volte dal launcher con quel programma in primo piano. «Aggiungi al profilo» o «Ignora».
- **Ricerca:** scrivendo trovi tutto (profili, fast link, preferiti, progetti, app installate), più «Cerca sul web» e «Chiedi a JARVIS».
- **Casi particolari:**
  - un file o una cartella che non esiste più è segnato in rosso, con «Cambia percorso» o «Togli dal profilo»;
  - un file eseguibile (.exe, .bat, .ps1…) chiede sempre conferma prima di partire; le app trovate da VARCO no;
  - senza finestre di VARCO aperte, il command center offre «Apri VARCO».
- **Tasti dentro il launcher:** `1`–`8` aprono i posti, `← →` girano l'anello (o le sezioni), `↑ ↓` il ventaglio, `Tab` le azioni, `Ctrl+Invio` la seconda azione, `Esc` un passo indietro e poi chiude. Un clic fuori lo chiude.
- Anche dalla palette: «Apri il launcher».

### Test da fare
- [ ] **T283** — Dal desktop premi la scorciatoia: si apre il fast launcher con il profilo generale. `Esc` lo chiude. **📸**
- [ ] **T284** — Con un gioco del pannello Giochi in primo piano (in finestra o a schermo intero senza bordi): il launcher dice il suo nome e propone «Crea il profilo» con i siti del gioco. **📸**
- [ ] **T285** — `F2` nel profilo: riempi un posto libero cercando un'app installata, sposta un posto con `Alt+→`, svuotane uno con `Canc`. Chiudi e riapri: è tutto salvato.
- [ ] **T286** — Premi la scorciatoia due volte: l'anello gira sul command center. Apri una scheda da «Schede»: VARCO viene davanti su quella scheda.
- [ ] **T287** — Trascina un file e una cartella sul launcher: finiscono nel profilo. Un .exe trascinato chiede conferma prima di partire.
- [ ] **T288** — Apri 2 volte lo stesso sito dal launcher (cercandolo) con un programma in primo piano: alla terza apertura è tra i «Suggeriti».
- [ ] **T289** — Impostazioni → Launcher: cambia la scorciatoia, poi spegni e riaccendi il launcher.
- [ ] **T290** — Gioco a schermo intero «esclusivo»: il launcher potrebbe non comparire sopra (Windows lo impedisce). Annota quali giochi.

**Stato:**
- 237 test superati (7 nuovi per profili, suggeriti, ricerca e conferma degli eseguibili).
- **Provato in VARCO** con un profilo di prova: apertura, profilo generale, Destiny 2 simulato in primo piano (profilo creato dai siti del pannello Giochi), ricerca e posto riempito, salvataggio, giro sul command center con le schede vere. Riconoscimento del programma in primo piano provato sul PC (~10 ms dopo la prima volta).
- **Non provato:** la scorciatoia premuta davvero sopra un gioco, il trascinamento di file e l'installer.

---

## Beta 0.38.1 — Correzioni del command center

Installer PC: `dist\VARCO Setup 0.38.1.exe` (con la firma VMP). Contiene tutta la 0.38, che non era stata pubblicata.

### Cosa cambia
- **Si scrive di fila.**
  - Nella 0.38 la casella perdeva il focus dopo ogni lettera, e bisognava ricliccarla.
  - Il command center si ridisegna a ogni lettera, e ridisegnandolo la casella usciva dalla pagina per un attimo.
  - Ora focus e cursore tornano subito al loro posto.
- **Niente riquadro sulla casella.** Lo stile generale di VARCO le disegnava attorno un rettangolo di focus che usciva dalla pillola. Ora il focus si vede dal bordo della barra.
- **Anello: le azioni in una fila sotto l'anello.**
  - Prima stavano su un'orbita: finivano sopra il bordo dell'anello e sopra la riga dei tasti.
  - Al clic, poi, l'effetto "pressione" dei pulsanti di VARCO le faceva saltare di posto.
- **L'anello si adatta alla finestra:** lascia sempre spazio alla barra in alto, alle azioni e ai tasti.
- **Bacheca:** "Dove cercare" va sotto la ricerca quando non ci sta, invece di essere tagliato.
- **Altri allineamenti:** il testo nella casella dell'anello è allineato a sinistra; il messaggio "nessuna anteprima" è centrato.

### Test da fare
- [ ] **T280** — F1 e scrivi una parola intera senza cliccare: tutte le lettere entrano, nella Bacheca e nell'Anello.
- [ ] **T281** — Anello, finestra non massimizzata: anello, azioni sotto e tasti in basso non si sovrappongono. **📸**
- [ ] **T282** — Bacheca in una finestra stretta: "Dove cercare" va sotto la ricerca, intero.
- [ ] T269–T279 della 0.38 valgono anche qui.

**Stato:**
- 230 test superati.
- **Provato in VARCO**, a 1024×700, 1366×768 e 1920×1040, in tutti e due gli stili, scrivendo "unity" con tasti veri: tutte le lettere entrano e la casella resta attiva. Ho guardato gli screenshot di ogni misura.
- **Non provato:** l'installer.

---

## Beta 0.38 — Nuovo command center (F1)

Installer PC: `dist\VARCO Setup 0.38.0.exe` (con la firma VMP). Il telefono non cambia.

Il command center (F1 o Ctrl+Shift+P) non è più una lista piatta: i risultati sono in **sezioni**, ognuno ha un'**azione principale** e delle **azioni secondarie**, e puoi **creare** cose, non solo cercarle. Ha due stili: scegli tu quale usare. Gli esempi da cui è nato sono in `design/explore/cc-round-1` e `cc-round-2`.

### I due stili
- **Bacheca** (predefinito): occupa lo spazio della pagina. In alto ci sono la ricerca e "Dove cercare". Sotto, "Apri subito" come tessere con la miniatura e le altre sezioni come card richiudibili. Le azioni del risultato scelto stanno nella barra in basso.
- **Anello**: le sezioni sono settori attorno alla ricerca. ← → girano l'anello, i risultati del settore escono a ventaglio a destra e le azioni stanno attorno all'anello.
- Lo stile si cambia dal pulsante rotondo in alto nel command center, da Impostazioni → Command center o dal comando "Command center: passa a…". VARCO si ricorda la scelta.

### Le sezioni
- **Apri subito:**
  - senza testo, ciò che serve adesso nel workspace attivo: anteprima o dev server del progetto, fast link fissati, le altre schede della finestra;
  - mentre scrivi, i 3 risultati migliori.
- **Schede:** tutte, di tutti i workspace. Prima quelle del workspace attivo, poi una riga "Altri workspace". Azioni: vai, affianca, copia il link, chiudi; per gli altri workspace anche "Porta qui".
- **Progetti:**
  - il progetto di ogni workspace;
  - per quello attivo anche i comandi (avvia, ferma, log) e le cartelle e i file dei primi due livelli: apri, mostra nella cartella, copia il percorso.
- **Fast link:** sono i link rapidi della Home di ogni workspace, ora con **Fissa** e **scorciatoia Alt+1…9** (una per numero, per workspace). Ci sono anche le **sessioni** salvate (riapri le schede tutte insieme).
- **Comandi:** quelli di prima, più i workspace.
- **Web:** solo quando scrivi.
  - In cima "Cerca «…»" con il tuo motore di ricerca, poi i **suggerimenti** del motore, poi preferiti e cronologia.
  - I suggerimenti si spengono in Impostazioni → Command center. Partono solo dopo 2 lettere; indirizzi e percorsi non vengono mai mandati.
- **JARVIS:** Chiedi a JARVIS, Riassumi la pagina, Salva nel progetto, e i prompt salvati. Se scrivi una domanda ("come si…", "…?"), JARVIS sale in cima.
- **Crea:**
  - nota, task (finiscono nelle note del workspace);
  - fast link (dalla scheda attiva o da un indirizzo scritto);
  - workspace;
  - sessione (salva le schede della finestra);
  - prompt per JARVIS.

### Tastiera
- ↑ ↓ scegli il risultato; **Tab** (o → a fine testo, solo nella Bacheca) passa all'azione successiva; **Invio** esegue; **Ctrl+Invio** fa la seconda azione.
- Alt+↑ ↓ salta da una sezione all'altra (nell'Anello anche ← →).
- Esc: prima torna all'azione principale, poi svuota il testo, poi chiude.
- **Prefissi:** `>` comandi, `@` schede, `#` progetti, `/` fast link, `g ` web, `?` JARVIS, `+` crea.
- Clic sul titolo di una sezione: la chiude o la riapre. "Mostra tutti" la allarga.

### Anteprime
Passando con il mouse (o scegliendo con la tastiera):
- una **scheda** mostra la sua miniatura (se è sospesa no);
- un **progetto** mostra il branch e le **ultime 5 modifiche** (git);
- un **file** mostra le prime righe;
- un **dev server** mostra le ultime righe di log;
- una **sessione** mostra le sue schede.

### JARVIS dal command center
VARCO non ha un'intelligenza sua: JARVIS è il tuo assistente collegato con MCP.
- "Chiedi a JARVIS" e "Riassumi la pagina" diventano **richieste in attesa**. JARVIS le prende con il nuovo strumento `get_user_requests` e risponde con `answer_user_request`.
- La risposta arriva come notifica, con il pulsante "Copia". "Riassumi e salva nelle note" la mette anche nelle note del workspace.
- Le richieste scadono dopo un'ora.
- Se JARVIS è spento, queste voci propongono di accenderlo.
- "Salva nel progetto" funziona anche senza JARVIS: aggiunge la pagina alle risorse del workspace.
- Quando finirai JARVIS, gli basterà chiamare `get_user_requests` per ricevere quello che scrivi (o dirai) qui.

### Test da fare
- [ ] **T269** — F1: si apre la Bacheca, con le sezioni. Clic sul titolo di una sezione la chiude e la riapre. **📸**
- [ ] **T270** — Pulsante rotondo in alto: passa all'Anello. Chiudi e riapri: resta l'Anello. ← → girano le sezioni. **📸**
- [ ] **T271** — Scrivi il nome di una scheda di un altro workspace: compare sotto "Altri workspace". Tab fino a "Porta qui", Invio: la scheda arriva nel workspace attivo.
- [ ] **T272** — Passa con il mouse su una scheda aperta (non sospesa): compare la miniatura. Su un progetto: branch e ultime modifiche.
- [ ] **T273** — Scrivi "destiny": nella sezione Web compaiono i suggerimenti del motore. Spegnili in Impostazioni → Command center: spariscono.
- [ ] **T274** — Scrivi "comprare il latte" → Crea → Task: nelle note del workspace c'è "- [ ] comprare il latte".
- [ ] **T275** — Su una pagina: Crea → "Fast link dalla scheda attiva" → poi nei Fast link Tab fino a "Scorciatoia Alt+1". Alt+1 da qualunque pagina del workspace apre il link.
- [ ] **T276** — Crea → "Sessione dalle schede aperte"; chiudi qualche scheda; Fast link → la sessione → "Riapri le schede".
- [ ] **T277** — `> zen` mostra solo i comandi; `@` solo le schede; `? come si fa…` porta JARVIS in cima.
- [ ] **T278** — (con JARVIS acceso e collegato) "Riassumi la pagina": arriva la notifica "Riassunto chiesto a JARVIS"; JARVIS vede la richiesta con `get_user_requests` e la sua risposta compare come notifica.
- [ ] **T279** — Tema chiaro e un tema con un altro colore: il command center prende i colori del tema.

**Stato:**
- 230 test superati, 8 nuovi per le sezioni e le scorciatoie.
- **Provato in VARCO con una copia dei tuoi dati:**
  - Bacheca e Anello, senza testo e con "unity";
  - tastiera in tutti e due (frecce, Tab, ← →, `> zen`, Esc due volte);
  - suggerimenti di Startpage;
  - nota e task nelle note;
  - fast link fissato con Alt+1;
  - sessione salvata;
  - anteprima di un progetto con le ultime modifiche di git.
- Il workspace "Personale" ha come cartella del progetto `C:\`: per un disco intero (o la cartella utente) i file non vengono elencati.
- **Non provati:** la risposta di un JARVIS vero (non c'è un client collegato qui) e l'installer.

---

## Beta 0.37.3 — Correzioni dopo la prova della 0.37.2

Installer PC: `dist\VARCO Setup 0.37.3.exe` (con la firma VMP). Contiene anche tutto quello della 0.37.2, che non era stata pubblicata. Il telefono non cambia.

Da questa versione ogni richiesta ha il suo numero: una correzione di una funzione che c'è già cambia l'ultima cifra (0.37.2 → 0.37.3).

### Cosa cambia
- **Impostazioni di nuovo funzionanti.**
  - Nella 0.37.2, con almeno un'estensione installata, la pagina si rompeva a metà. Il nuovo menu "Accesso ai siti" riceveva le sue voci nel formato sbagliato e l'errore ("options is not iterable") fermava tutta la pagina.
  - Nelle mie prove non si vedeva, perché il profilo di prova non aveva estensioni.
  - Ora Impostazioni → Estensioni si apre con l'elenco, il menu "Accesso ai siti" e i pulsanti per installare da file.
- **Niente più notifica "Contenuti protetti pronti" all'avvio.** Il modulo per Spotify, Netflix e gli altri si prepara lo stesso, senza avvisare. Lo stato resta nella copia diagnostica.
- **Nel Chrome Web Store VARCO si chiama VARCO** ("Rimuovi da VARCO"), non più "personal-workspace-browser".

### Il caso del video (filecr.com e CRXLauncher)
- **In VARCO un sito riconosce le estensioni installate come in Chrome.** L'ho provato con un'estensione di prova: la pagina legge un file dell'estensione e le parla direttamente, e lei risponde. Sono i due modi che usano i siti.
- **Nel video però il sito cerca la sua estensione ("FileCR Assistant"),** mentre quella installata è CRXLauncher, un'estensione diversa. Il sito quindi ha ragione a dire che la sua non c'è.
- **CRXLauncher usa due funzioni di Chrome che Electron non ha** (`offscreen` e `sidePanel`), quindi il suo lavoro di sottofondo in VARCO non parte.
- **Attenzione:** filecr.com distribuisce gratis programmi che normalmente sono a pagamento. Questi "assistenti" e "launcher" di file .crx sono spesso segnalati come adware. Ti consiglio di togliere CRXLauncher (Impostazioni → Estensioni → Rimuovi).

### Test da fare
- [ ] **T266** — Impostazioni con almeno un'estensione installata: la pagina si apre tutta; Estensioni mostra l'elenco con "Accesso ai siti". **📸**
- [ ] **T267** — Riavvia VARCO: nessuna notifica dei contenuti protetti. Spotify continua a suonare.
- [ ] **T268** — Chrome Web Store, pagina di un'estensione installata: il pulsante dice "Rimuovi da VARCO".
- [ ] T260–T265 della 0.37.2 (verifiche anti-bot ed estensioni) valgono anche qui.

**Stato:**
- 222 test superati.
- **Provato in VARCO:**
  - Impostazioni → Estensioni con un'estensione installata (prima errore, ora la pagina completa);
  - nome dell'app "VARCO" e identità ancora pulita (nessun "Electron" né nome del pacchetto);
  - nessuna notifica dei contenuti protetti all'avvio;
  - estensione di prova riconosciuta dalla pagina: file pubblico letto, messaggio della pagina con risposta.
- **Non provato:** l'installer.

---

## Beta 0.37.2 — Verifiche anti-bot ed estensioni

**Provata da te: Impostazioni rotte con un'estensione installata (corretto nella 0.37.3); il sito del video continuava a chiedere la sua estensione (vedi 0.37.3).** Non pubblicata: il suo contenuto è nella 0.37.3.

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
