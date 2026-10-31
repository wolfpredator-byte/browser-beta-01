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
- **Modalità compatta** (Ctrl+Shift+K, oppure la casella in Disposizione):
  - le barre si chiudono e la pagina occupa quasi tutta la finestra;
  - resta un filo sottile del colore d'accento sui bordi;
  - avvicina il mouse a un bordo e le barre tornano; torna sulla pagina e si richiudono;
  - mentre scrivi nella barra degli indirizzi (anche con Ctrl+L) restano aperte.

## Schede
- **Tutte della stessa larghezza** nella barra orizzontale.
- **Niente più "⋯"** sulle schede: tutto è nel clic destro. Anche sul titolo di uno stack.
- **Trascinando una scheda** vedi dove andrà: una linea prima o dopo, oppure il riquadro dello stack se la lasci sopra un'altra scheda.
- **Stack:** clic destro → **Sciogli lo stack** (le schede restano, separate) oppure **Chiudi lo stack** (le chiude tutte).
- **Archivio automatico** (Impostazioni → Schede, spento di serie):
  - le schede che non apri da un certo numero di giorni (7 di serie) si chiudono da sole e finiscono nell'archivio;
  - non tocca le schede fissate, quelle negli stack e quelle in vista;
  - le ritrovi in **Schede → Archivio**, da dove le riapri con un clic.
- **Video in finestrella automatico** (Impostazioni → Schede, acceso di serie): se lasci una scheda con un video in riproduzione, il video continua in una finestrella. Quando torni sulla scheda, rientra nella pagina.

## Vista divisa fino a 4 pagine
- **Tieni premuto Shift mentre trascini una scheda** sopra la pagina: compaiono le zone (sinistra, destra, sopra, sotto) e un'anteprima ti mostra quanto spazio prenderà. Lasciala e si affianca.
- Fino a **4 pagine**: due affiancate, due una sopra l'altra, una grande più due piccole, oppure una griglia 2×2.
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
- Lo stile di un sito, una volta messo, non si riusciva più a togliere senza ricaricare. Electron non permette di rimuovere il CSS inserito come "stile dell'utente": ora lo inseriamo come stile normale.
- Le Impostazioni non si aprivano più dopo l'aggiunta delle scorciatoie di ricerca (un modulo usato prima di caricarlo).

## Modalità insegnamento
- **Una regola sola per due processi:** `lib/frame-layout-rules.cjs` calcola dove sta ogni barra. Il processo principale la usa per mettere le pagine, la cornice per disegnare le barre. Così non possono mai andare fuori sincrono.
- **Vista divisa come dati:** `split-rules.js` descrive la vista divisa con un modo (colonne, righe, una grande più due, griglia) e l'elenco delle pagine. Da lì calcola i rettangoli e decide se una pagina in più ci sta. Lo stesso file gira sia nel processo principale sia nella cornice, per l'anteprima.
- **Account separati = partizioni:** ogni workspace isolato ha una sua sessione di Chromium (`persist:varco-ws-…`), con cookie e archivio propri. Permessi, blocco pubblicità, estensioni e download vanno configurati per ogni sessione.
- **Modalità compatta senza ridisegnare:** le barre restano dove sono. Cambia solo il rettangolo della pagina, che le copre e si ritira quando il mouse arriva sul bordo.

## Test da fare
- [ ] **T162** — Impostazioni → Disposizione: prova **Colonna unica**, **Icone + colonna schede** e **Una barra sola**, poi torna a Classico. **📸**
- [ ] **T163** — Su misura: schede a destra e barra laterale in alto. Le schede diventano verticali.
- [ ] **T164** — Ctrl+Shift+K: le barre si chiudono. Avvicina il mouse in alto: tornano. Torna sulla pagina: si richiudono. Ctrl+L: restano aperte mentre scrivi. **📸**
- [ ] **T165** — Trascina una scheda nella barra: compare la linea dove andrà. Lasciala sopra un'altra: diventano uno stack. Clic destro → Sciogli lo stack, poi rifallo e Chiudi lo stack.
- [ ] **T166** — Trascina una scheda tenendo Shift sopra la pagina: zone e anteprima. Lasciala a destra, poi un'altra sotto, fino a 4. Trascina un divisore. **📸**
- [ ] **T167** — Clic destro su una pagina della vista divisa → Togli dalla vista divisa. Con due pagine: Scambia i lati.
- [ ] **T168** — Clic destro su un workspace → Account separati. Accedi a un sito lì: negli altri workspace non risulti collegato. Poi "Esci da tutti i siti del workspace".
- [ ] **T169** — Scrivi `!yt lofi` e poi `ricetta carbonara !w`. Aggiungi una scorciatoia tua in Impostazioni → Ricerca e usala.
- [ ] **T170** — Apri un video su YouTube, fallo partire e cambia scheda: va in finestrella. Torna: rientra.
- [ ] **T171** — Impostazioni → Schede: attiva l'archivio automatico con 1 giorno. Il controllo gira un minuto e mezzo dopo l'avvio e poi ogni mezz'ora: le schede che non apri da più di un giorno finiscono in Schede → Archivio. Riaprine una.
- [ ] **T172** — Ctrl+Shift+S: trascina un'area, incollala in Paint. Riprova con Pagina intera e Salva…. **📸**
- [ ] **T173** — Tasto destro su un sito → Stile per questo sito…: scrivi `body { background: #202020 !important; }`. La pagina cambia mentre scrivi. Salva, ricarica: resta. Elimina: sparisce. **📸**

**Stato:** 154 test superati (12 nuovi su disposizione, vista divisa, scorciatoie di ricerca e stili dei siti). Provato nell'app con il profilo di prova:
- le disposizioni Colonna unica, Icone + colonna, Workspace in basso, Schede in alto e Una barra sola;
- vista divisa a griglia di 4 pagine (la quinta viene rifiutata), uscita di una pagina e anteprima delle zone;
- account separati: sessione propria, i cookie di un workspace non si vedono nell'altro;
- screenshot di area, pagina visibile e pagina intera (1696×6362);
- stile per sito: anteprima dal vivo, Ripristina, Salva (resta dopo il riavvio), Elimina, rimozione dalle Impostazioni;
- modalità compatta: la pagina passa da 1706×925 a 1898×1050 e torna al suo posto quando le barre si aprono;
- archivio automatico: una scheda vecchia di 10 giorni archiviata, quella in vista no, ripristino;
- video in finestrella: parte lasciando la scheda e rientra tornandoci.
- Il passaggio vero del mouse sul bordo, in modalità compatta, è da provare a mano (T164).
