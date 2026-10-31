# VARCO Beta 0.28 — Interfaccia su misura, vista divisa a 4, account per workspace e strumenti nuovi

Installer: `dist\VARCO Setup 0.28.0.exe`.

## Disposizione libera
- **Impostazioni → Disposizione:** sette combinazioni pronte, ognuna con la sua miniatura:
  - **Classico** (schede in basso, barra laterale a sinistra);
  - **Schede in alto**;
  - **Colonna unica**, come Arc e Zen: workspace in alto, schede al centro, strumenti in basso;
  - **Icone + colonna schede**;
  - **Workspace in basso**;
  - **Tutto a destra**;
  - **Una barra sola**.
- **Su misura:** scegli tu dove stanno le **schede** e la **barra laterale** (in basso, in alto, a sinistra, a destra). Se finiscono dallo stesso lato si uniscono; ai lati puoi anche tenerle in due colonne affiancate.
- **Schede verticali:** con le schede a sinistra o a destra diventano una colonna con il titolo intero.
- **Modalità compatta** (Ctrl+Shift+K, oppure la casella in Disposizione), come "UI Auto-Hide" di Vivaldi:
  - la pagina occupa tutta la finestra, da bordo a bordo;
  - porta il mouse sul bordo della finestra: la barra di quel lato compare **sopra** la pagina, senza spostarla (in alto indirizzi, in basso o di lato schede e barra laterale, secondo la tua disposizione);
  - torna sulla pagina e la barra si richiude;
  - mentre scrivi nella barra degli indirizzi (anche con Ctrl+L) resta aperta.

## Schede
- **Tutte della stessa larghezza** nella barra orizzontale.
- **Niente più "⋯"** sulle schede: tutto è nel clic destro. Anche sul titolo di uno stack.
- **Trascinando una scheda** vedi dove andrà: una linea prima o dopo, oppure il riquadro dello stack se la lasci sopra un'altra scheda.
- **Stack:** clic destro → **Sciogli lo stack** (le schede restano, separate) oppure **Chiudi lo stack** (le chiude tutte).
- **Archivio automatico** (Impostazioni → Schede, spento di serie):
  - le schede che non apri da un certo numero di giorni (7 di serie) si chiudono da sole e finiscono nell'archivio;
  - non tocca le schede fissate, quelle negli stack e quelle in vista;
  - le ritrovi in **Schede → Archivio**, da dove le riapri con un clic.
- **Video in finestrella automatico** (Impostazioni → Schede, acceso di serie): se lasci una scheda con un video in riproduzione, il video continua in una finestrella. Quando torni sulla scheda, rientra nella pagina. Il pulsante **"Torna alla scheda"** della finestrella ti riporta alla scheda del video; la × la chiude e mette in pausa.

## Vista divisa fino a 4 pagine
- **Tieni premuto Shift mentre trascini una scheda** sopra la pagina: una zona grigia, con il lato scritto al centro, ti mostra quanto spazio prenderà. Lasciala e si affianca.
- Fino a **4 pagine**: due affiancate, due una sopra l'altra, **tre colonne**, **tre righe**, una grande più due piccole, oppure una griglia 2×2.
- **Ogni riquadro ha la sua barretta** (come Vivaldi), con icona e titolo: un clic lo rende attivo, **↗** lo toglie dalla vista divisa, **×** chiude la scheda, il clic destro apre il menu della scheda.
- I **divisori** si trascinano per cambiare le misure.
- Clic destro su una scheda della vista divisa: **Togli dalla vista divisa**; con due pagine anche **Scambia i lati**.

## Account separati per workspace
- Clic destro su un workspace → **Account separati**: quel workspace ha cookie, accessi e dati dei siti tutti suoi. Per esempio, due account Google diversi in due workspace.
- Le estensioni e il blocco pubblicità funzionano anche lì.
- **Esci da tutti i siti del workspace** cancella gli accessi solo di quel workspace.

## Scorciatoie di ricerca
- Scrivi **!yt gatti** (oppure **gatti !yt**) nella barra degli indirizzi e cerchi direttamente su YouTube.
- Pronte: !yt YouTube, !w Wikipedia, !we Wikipedia inglese, !gh GitHub, !r Reddit, !a Amazon, !m Maps, !i Immagini, !tr Traduttore, !so Stack Overflow, !npm, !mdn, !x, !tw Twitch.
- **Impostazioni → Ricerca:** aggiungi le tue (chiave, nome e indirizzo con `%s` al posto delle parole cercate).

## Screenshot
- **Ctrl+Shift+S**, oppure tasto destro sulla pagina → **Screenshot…**:
  - trascina per scegliere un'**area**;
  - oppure scegli **Pagina visibile** o **Pagina intera** (anche la parte da scorrere).
- L'immagine va negli **appunti**: incollala dove vuoi. La notifica ha **Salva…** per tenerla come file PNG.

## Stile per sito
- Tasto destro su una pagina → **Stile per questo sito…**: si apre un pannello dove scrivi un CSS tuo. Ogni modifica si vede **subito** sulla pagina.
- **Salva** lo tiene per tutte le pagine di quel sito, anche ai prossimi avvii. **Ripristina** torna allo stile salvato. **Elimina** lo toglie.
- **Impostazioni → Stili dei siti:** l'elenco dei siti con uno stile, con la × per toglierlo.
- Con `!important` vinci sullo stile del sito (esempio: `header { display: none !important; }`).

## Corretto durante le prove
- "Torna alla scheda" nella finestrella del video non faceva niente.
- I riquadri della vista divisa non si ridisegnavano dopo un cambio (un attributo dei riquadri non veniva impostato).
- Lo stile di un sito, una volta messo, non si riusciva più a togliere senza ricaricare. Electron non permette di rimuovere il CSS inserito come "stile dell'utente": ora lo inseriamo come stile normale.
- Le Impostazioni non si aprivano più dopo l'aggiunta delle scorciatoie di ricerca (un modulo usato prima di caricarlo).

## Modalità insegnamento
- **Una regola sola per due processi:** `lib/frame-layout-rules.cjs` calcola dove sta ogni barra. Il processo principale la usa per mettere le pagine, la cornice per disegnare le barre. Così non possono mai andare fuori sincrono.
- **Vista divisa come dati:** `split-rules.js` descrive la vista divisa con un modo (colonne, righe, una grande più due, griglia) e l'elenco delle pagine. Da lì calcola i rettangoli e decide se una pagina in più ci sta. Lo stesso file gira sia nel processo principale sia nella cornice, per l'anteprima.
- **Account separati = partizioni:** ogni workspace isolato ha una sua sessione di Chromium (`persist:varco-ws-…`), con cookie e archivio propri. Permessi, blocco pubblicità, estensioni e download vanno configurati per ogni sessione.
- **Barre sopra una pagina che sta sopra tutto:** le pagine sono WebContentsView e coprono sempre la cornice. In modalità compatta VARCO fotografa la pagina (JPEG: 8 ms invece dei 181 del PNG), la cornice mette la foto esattamente al suo posto e fa entrare la barra; solo allora la pagina vera si nasconde. La barra compare in circa 110 ms. Il bordo si riconosce dalla posizione del mouse, letta dal processo principale, così la pagina può arrivare fino al bordo.

## Test da fare
- [ ] **T162** — Impostazioni → Disposizione: prova **Colonna unica**, **Icone + colonna schede** e **Una barra sola**, poi torna a Classico. **📸**
- [ ] **T163** — Su misura: schede a destra e barra laterale in alto. Le schede diventano verticali.
- [ ] **T164** — Ctrl+Shift+K: la pagina va a tutta finestra. Porta il mouse sul bordo in alto: la barra degli indirizzi compare sopra la pagina, che non si sposta. Prova anche in basso e a sinistra. Torna sulla pagina: si richiude. Ctrl+L: resta aperta mentre scrivi. **📸**
- [ ] **T165** — Trascina una scheda nella barra: compare la linea dove andrà. Lasciala sopra un'altra: diventano uno stack. Clic destro → Sciogli lo stack, poi rifallo e Chiudi lo stack.
- [ ] **T166** — Trascina una scheda tenendo Shift sopra la pagina: zona grigia con il lato scritto. Lasciala a destra, poi un'altra ancora a destra: tre colonne. Trascina un divisore. Prova ↗ e × sulle barrette dei riquadri. **📸**
- [ ] **T167** — Clic destro su una pagina della vista divisa → Togli dalla vista divisa. Con due pagine: Scambia i lati.
- [ ] **T168** — Clic destro su un workspace → Account separati. Accedi a un sito lì: negli altri workspace non risulti collegato. Poi "Esci da tutti i siti del workspace".
- [ ] **T169** — Scrivi `!yt lofi` e poi `ricetta carbonara !w`. Aggiungi una scorciatoia tua in Impostazioni → Ricerca e usala.
- [ ] **T170** — Apri un video su YouTube, fallo partire e cambia scheda: va in finestrella. Premi "Torna alla scheda" nella finestrella: torni al video. Riprova chiudendola con la ×: resti dove sei.
- [ ] **T171** — Impostazioni → Schede: attiva l'archivio automatico con 1 giorno. Il controllo gira un minuto e mezzo dopo l'avvio e poi ogni mezz'ora: le schede che non apri da più di un giorno finiscono in Schede → Archivio. Riaprine una.
- [ ] **T172** — Ctrl+Shift+S: trascina un'area, incollala in Paint. Riprova con Pagina intera e Salva…. **📸**
- [ ] **T173** — Tasto destro su un sito → Stile per questo sito…: scrivi `body { background: #202020 !important; }`. La pagina cambia mentre scrivi. Salva, ricarica: resta. Elimina: sparisce. **📸**

**Stato:** 155 test superati (13 nuovi su disposizione, vista divisa, scorciatoie di ricerca e stili dei siti). Provato nell'app con il profilo di prova:
- le disposizioni Colonna unica, Icone + colonna, Workspace in basso, Schede in alto e Una barra sola;
- vista divisa a griglia di 4 pagine (la quinta viene rifiutata), uscita di una pagina e anteprima delle zone;
- account separati: sessione propria, i cookie di un workspace non si vedono nell'altro;
- screenshot di area, pagina visibile e pagina intera (1696×6362);
- stile per sito: anteprima dal vivo, Ripristina, Salva (resta dopo il riavvio), Elimina, rimozione dalle Impostazioni;
- modalità compatta: pagina a 1920×1078 (tutta la finestra); barre in alto, in basso e a sinistra sopra la pagina, che non si sposta; Ctrl+L la tiene aperta; cambiando scheda dalla barra la foto si aggiorna;
- vista divisa: tre colonne con le barrette; clic, ↗ e divisori;
- "Torna alla scheda": col video in riproduzione torna alla scheda, chiudendo con la × no;
- archivio automatico: una scheda vecchia di 10 giorni archiviata, quella in vista no, ripristino;
- video in finestrella: parte lasciando la scheda e rientra tornandoci.
- Il passaggio vero del mouse sul bordo, in modalità compatta, l'ho simulato: da provare a mano (T164).
