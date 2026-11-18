# Log di /explore — VARCO

## 2026-11-02 · Impostazioni · Round 1 (struttura)
Brief: [../BRIEF.md](../BRIEF.md). Stile fisso (varco-cosmic-glass), si confronta solo la struttura. Dati e testi reali della 0.33, raggruppati in 7 categorie (Aspetto, Ricerca e navigazione, Schede, Privacy e sicurezza, Telefono, Estensioni, Sistema).

| Variante | Struttura |
|---|---|
| v1-categorie | colonna di categorie con riassunto di stato, una categoria alla volta |
| v2-registro | pagina unica numerata, indice fisso che segue lo scorrimento, filtro sul posto |
| v3-ricerca | ricerca al centro, risultati = controlli, "usate spesso" + riquadri categoria |
| v4-panoramica | riassunti di stato in parole, "da sistemare" in alto, categoria in pannello laterale |
| v5-anteprima | schede di categoria + VARCO in miniatura che riflette l'aspetto dal vivo |

Stati da provare in ogni variante (barra in basso a destra): Normale · Errori (telefono e aggiornamenti in errore) · Molti dati (120 password). Ricerca senza risultati: scrivere `zzz`.

**Scelta:** V4 · Panoramica di stato ("mi piace molto").

## 2026-11-02 · Impostazioni · Round 2 (dalla V4)
Asse scelto (l'utente non ne ha indicato uno): **come si passa dalla panoramica al dettaglio di una categoria**, il punto più incerto della V4. In tutte e tre: "Da sistemare" porta direttamente alla riga in errore, e ogni riquadro ha fino a 2 interruttori rapidi.

| Variante | Passaggio al dettaglio |
|---|---|
| 4a-pannello | pannello laterale largo; la panoramica resta visibile e cliccabile accanto |
| 4b-sul-posto | il riquadro si allarga sul posto a tutta riga e mostra tutte le impostazioni; nessuna sovrapposizione |
| 4c-diventa-colonna | la griglia si restringe in una colonna di riquadri a sinistra e il dettaglio occupa il resto |

**Scelta:** 4a · Pannello laterale, "per la sua semplicità".

## 2026-11-02 · Impostazioni · Fase 5 (tweak)
`final/` = 4a con tutte le decisioni estetiche esposte come token CSS (`--t-*`) e un pannello "Tweaks" per regolarle dal vivo. "Copia token" esporta il blocco `:root` da portare in `style.css`.

**Token scelti** (dal pannello Tweaks, salvati come default in `final/tokens.css`):

```css
--t-cols:4; --t-accent:#6f8cff; --t-gap:6px; --t-tile-pad:10px; --t-tile-min:175px; --t-hover-glow:.5;
--t-glass-a:.5; --t-glass-blur:40px; --t-line-a:.28; --t-wall-blur:23px; --t-wall-bright:.49;
--t-sheet-w:570px; --t-sheet-a:.65; --t-dim:.46; --t-title-weight:400; --t-title-track:.28em; --t-sum-size:14px; --t-dur:700ms;
```

Direzione: riquadri fitti e alti su 4 colonne, vetro più trasparente e sfocato, pannello molto trasparente, titoli leggeri e spaziati, movimento lento.

## 2026-11-02 · Portato in VARCO
- `settings-rules.js` (+ `test/settings-rules.test.cjs`): categorie, riassunti in parole, "Da sistemare".
- `renderer.js`: le sezioni di sempre, raggruppate; panoramica a riquadri con interruttori rapidi; pannello `#settingsSheet`; la ricerca mostra intere le sezioni che contengono il testo (come prima). Tolto l'indice a chip.
- `style.css`: token `--s-*` validi solo dentro le Impostazioni.
- Provato in VARCO con un profilo di prova: panoramica, apertura, Esc, ricerca, "Risolvi →" con errori simulati.

**Controllo anti-slop (Fase 6)**
- Corretto: con "Animazioni ridotte" il pannello usava comunque 700 ms → ora 130 ms; riassunti con la maiuscola; ordine delle sezioni nel pannello; colonne troppo strette a pannello aperto (ora si adattano).
- Scelte consapevoli: titoli in maiuscolo spaziato e accento viola (identità VARCO, usato solo per stato attivo e focus); bagliore al passaggio a metà intensità; 700 ms di movimento (scelto nei Tweaks: "pesante" e lento).
- Da tenere d'occhio: nessuna icona "telefono" nel set di VARCO (uso `external`); "Sistema" resta da solo nell'ultima riga a 4 colonne.

Nel portarlo in VARCO: accento, sfocatura e luminosità dello sfondo restano quelli scelti dall'utente in Impostazioni → Aspetto (sono già impostazioni dell'app); gli altri token valgono solo dentro la pagina Impostazioni.

## 2026-11-16 · Lettore multimediale · Round 1 (struttura + famiglia)
Brief: [../BRIEF-lettore.md](../BRIEF-lettore.md). Stile dalla board Pinterest dell'utente "Website design" ([../inspiration/pinterest-website-design/notes.md](../inspiration/pinterest-website-design/notes.md)).
Correzioni richieste dall'utente presenti in tutte le varianti: YouTube con −10/+10 nella barra; Spotify con shuffle e ripeti (spento → playlist → brano); pannello che si apre dalla barra in basso.

| Variante | Struttura | Famiglia |
|---|---|---|
| v1-isola | pillola che si allarga in un'isola centrata sopra la barra; altre fonti come pillole | liquid-glass |
| v2-scaffale | scaffale a tutta larghezza, una card comandabile per media; shuffle/ripeti anche nel mini | neon-glass |
| v3-console | deck ancorato a destra: cassette a sinistra, tasti in rilievo, interruttori arancioni | tactile-hardware |
| v4-dock | popover ancorato al mini: elenco denso + dettaglio + barra verticale a pillola | pro-dock |
| v5-editoriale | cassetto a tutta larghezza: titolo enorme, indice numerato, accento lime | brutalist-editorial |

Stati (barra in alto a destra di ogni variante): Normale · Solo YouTube · Molti (12) · Titoli lunghi · Niente. Tasti a lettore aperto: Spazio, ← →, Esc.

**Scelta:** V4 · Dock compatto. L'utente: «rendiamolo inerente allo stile del browser senza fargli perdere troppo la propria identità».

## 2026-11-16 · Lettore multimediale · Round 2 (dalla V4)
Asse indicato dall'utente: **quanto stile VARCO, quanto identità del dock**. Struttura identica (shared/dock.js); la cornice finta ha l'aspetto vero di VARCO
(sfondo del preset, barre di vetro). Tema di base **Cyan Flash** (quello in uso: accento #00e5ff), con selettore "VARCO viola" per vedere che il lettore segue il tema.

| Variante | Quanto VARCO |
|---|---|
| 4a-grafite | poco: la V4 com'è (grafite solida); da VARCO accento del tema, titoli spaziati, linee del tema, play pieno |
| 4b-vetro | molto: vetro scuro coprente, sfondo che traspare ai bordi, bagliore dell'accento su ciò che è attivo, raggi morbidi |
| 4c-ibrido | metà: guscio di vetro con anello di luce (come le Impostazioni), elenco grafite solido, alone dal colore della copertina |

Nota: con il vetro trasparente (55%) sopra una pagina bianca il pannello diventava grigio e poco leggibile; portato all'80–84% e pagina scurita a lettore aperto, come i menu di VARCO.

**Scelta:** 4b · Vetro VARCO.

## 2026-11-16 · Lettore · 4b finale (lettore-final/)
Richieste dell'utente sulla 4b, prima di portarla nel browser:
- nella barra in basso i comandi di **ogni sorgente che suona** (fino a 3, poi "+N"), ciascuna con i comandi del suo sito;
- **volume** per sorgente: nella barra un'icona con cursore a comparsa (passaggio del mouse o clic), nel pannello un cursore con percentuale;
- **chiudere** dal lettore: × su ogni riga dell'elenco e nella barra verticale ("Chiudi la scheda" / "Chiudi il pannello web" / "Ferma il widget").

Richiesta successiva: barra più compatta, per non togliere spazio alle schede. Aggiunto il selettore "Barra":
- completa: titolo, comandi, volume (2 sorgenti ≈ 590 px);
- compatta: copertina con anello di avanzamento + 3 comandi del sito (2 sorgenti ≈ 250 px);
- minima: solo la copertina, clic = play/pausa (2 sorgenti ≈ 100 px).
Nelle due strette titolo, barra, shuffle/ripeti e volume compaiono in una scheda sopra la barra al passaggio del mouse.

**Scelta:** barra **minima**. Portata nel browser nella 0.37.1 (lib/media-overlay.cjs, media-overlay.*): scheda al passaggio e lettore completo sono una vista sopra la pagina.



## 2026-11-16 · Command center (0.38) · Round 1 (cc-round-1/)
Brief: `design/BRIEF-command-center.md`. Ispirazione: pin recenti della board (anelli e sottomenu radiali, file manager, capsule, isola) annotati in `inspiration/pinterest-website-design/notes.md` (famiglie 7–9).
Motore comune `cc-round-1/shared/cc.js`: stessi dati, sezioni, ricerca (prefissi > @ # / ? +, "Dove cercare"), workspace attivo prima, azione principale + secondarie (Tab, ← →, Ctrl+Invio), anteprime (miniatura, percorso, ultime modifiche), Crea, Jarvis (in cima se scrivi una domanda).
Stati: Normale · Nessun risultato · Molte schede (120) · Titoli lunghi · Jarvis spento.

| Variante | Struttura | Famiglia |
|---|---|---|
| v1-sezioni | barra al centro + sezioni espandibili, azioni sulla riga, anteprima accanto | pro-dock |
| v2-colonne | tre colonne: dove cercare / risultati a tabella / anteprima + azioni | file-commander |
| v3-anello | settori attorno alla ricerca, risultati a ventaglio, azioni sull'orbita | radial-command |
| v4-bacheca | a tutta pagina: tessere "Apri subito", card-widget, barra azioni in basso | soft-glass widget |
| v5-isola | isola dalla barra del titolo, capsule impilate, dettaglio sul posto | island + neon |

**Scelta:** V3 · Anello e V4 · Bacheca («sono quelli che mi interessano di più»).

## 2026-11-16 · Command center · Round 2 (cc-round-2/, da V3 + V4)
Asse (scelto da me, l'utente non ne ha indicato uno): **come convivono anello e bacheca** — chi fa da navigazione, chi da contenuto, dove stanno le azioni.

| Variante | Anello | Bacheca |
|---|---|---|
| 2a-hub | a sinistra, sempre visibile: sceglie la sezione (← →) | a destra, tutte le card; quella del settore si accende |
| 2b-azioni | anello delle **azioni** attorno al risultato scelto (Tab lo apre) | la V4 com'è, a tutta pagina |
| 2c-dal-centro | da vuoto è al centro con "Apri subito" attorno; scrivendo si rimpicciolisce in un quadrante accanto alla ricerca | appare quando scrivi |

**Scelta:** nessuna delle tre («non mi piacciono»). L'utente: «facciamo le 2 opzioni separate e facciamo che l'utente stesso può scegliere quale volere».
→ Nella 0.38 il command center ha due stili, a scelta nelle Impostazioni: **Bacheca** (V4) e **Anello** (V3), con lo stesso motore (sezioni, azioni, anteprime, Crea, Jarvis).

## 2026-11-16 · Command center · Implementazione 0.38
Portati nel browser i due stili, con lo stesso motore:
- **Bacheca** = V4 (cc-round-1/v4-bacheca), **Anello** = V3 (cc-round-1/v3-anello).
- Scelta in Impostazioni → Command center e dal pulsante rotondo in alto.
- Codice: `command-center.js` e `command-center.css` (cornice), `command-center-rules.js` (sezioni e ordine), `lib/command-center.cjs` (risultati, azioni, anteprime, suggerimenti).
- Colori dai token del tema (--v-accent, --v-bg, --v-ink) invece dei colori fissi degli esempi.

## 2026-11-16 · Launcher e fast link · Round 1 (launcher-round-1/)
Brief: design/BRIEF-launcher.md. Il launcher si apre con una combinazione anche **fuori da VARCO** (gioco, desktop) e trova fast link, app, file, siti, comandi, JARVIS, ricerche salvate (`!lg`).
Ogni esempio si prova sopra **Gioco / Desktop / VARCO** (barra in basso) e ha gli stessi casi: vuoto, risultati, `!lg`, nessun risultato, collegamento rotto, `.exe` con conferma, file trascinato.
Motore comune in shared/lx.js (frecenza = uso × recenza, contesto dalla finestra in primo piano, 1–9 per i fissati, Ctrl+Alt+Spazio apre e chiude).

| Variante | Struttura | Famiglia |
|---|---|---|
| v1-barra | barra che scende dall'alto: fila dei fissati 1–9, frequenti, azioni sulla riga | island |
| v2-colonna | fissati come cerchi sul bordo destro (anello = quanto li usi), pannello accanto | side-rail (pin recente) |
| v3-anello | fissati 1–8 sui settori attorno alla ricerca, ventaglio di frequenti/risultati | radial-command |
| v4-tessere | tessere di vetro 3×3 per i fissati, frequenti a lato; scrivendo, griglia di risultati | frosted-tiles (pin recente) |

**Scelta:** V3 · Anello («per stare in tema con il command center»).
L'utente aggiunge:
- command center e fast launcher **restano due cose diverse**, ma sono due anelli e si passa dall'uno all'altro con un tasto, senza confonderli;
- **profili per app**: se in primo piano c'è un gioco o un programma (Destiny 2, Call of Duty, Unity…), l'anello mostra i siti, le app e i progetti consigliati per quell'app, scelti dall'utente (Destiny 2 → light.gg, DIM, il progetto Destiny Builder…). Sul desktop resta il fast launcher generico.

## 2026-11-16 · Launcher · Round 2 (launcher-round-2/, da V3)
Asse (dato dall'utente): **come convivono i due anelli** — fast launcher e command center — e come si passa dall'uno all'altro. In tutte e tre ci sono i profili per app (Destiny 2, Call of Duty, Unity, Desktop).
Cambio: `Ctrl+Alt+Spazio` apre il fast launcher, premuto di nuovo passa all'altro anello; `F1` apre direttamente il command center; Esc chiude.

| Variante | Come convivono |
|---|---|
| 2a-scambio | un anello solo al centro che si gira (flip) quando cambi; colore diverso per ciascuno |
| 2b-orbite | due anelli concentrici: dentro il fast launcher, fuori il command center; quello attivo si accende |
| 2c-carosello | quello attivo grande, l'altro piccolo accanto (si vede sempre); cambiando scorrono di posto |

**Scelta:** 2a · Scambio («sembra il menu di un videogioco»). L'utente chiede una **versione finale**, rifinita, pronta per essere portata nel browser.

## 2026-11-16 · Launcher · Versione finale (launcher-final/)
Dalla 2a, con tutto quello che serve per portarla in VARCO:
- giro dell'anello in due tempi (si chiude di taglio, cambia, si riapre) e settori che entrano in sequenza, come un menu di gioco; con «riduci movimento» solo dissolvenza;
- al centro il dettaglio del settore scelto (icona grande, nome, dove porta);
- **editor del profilo** (F2, «Modifica» o clic su un posto libero): scegli il posto sull'anello, metti / togli / sposta, aggiungi dai suggeriti o cercando; si attiva con l'eseguibile dell'app;
- app **senza profilo** (Blender): «Crea il profilo» con i suggeriti già pronti;
- stati: nessun risultato, collegamento rotto, .exe con conferma, file trascinato, finestra piccola;
- pannello **Tweaks** (solo negli esempi) con i token da copiare.

File: `launcher-final/index.html` + `final.js` + `final.css` (autonomi, nessuna dipendenza dagli altri giri).
Tasti finali: `Ctrl+Alt+Spazio` apre il Fast launcher / gira l'anello · `F1` Command center · `1`–`8` posti · `← →` anello o sezioni · `↑ ↓` ventaglio · `Tab` azioni · `Ctrl+Invio` seconda azione · `F2` modifica profilo (dentro: `← →` posto, `Alt+← →` sposta, `Canc` svuota, `Invio` metti, `Esc` fatto) · `Esc` passo indietro / chiude.
Controllo anti-slop: niente gradienti decorativi né emoji; colori solo da token (accento del tema per il Command center, colore del profilo per il Fast launcher); movimento con scopo (giro = cambio di anello), ridotto con «riduci movimento».
Scelte consapevoli: Ctrl+E scartato per la modifica (lo prende il browser), F2 come in Windows; l'anello tiene 8 posti, il resto va in «Altro nel profilo».

**Da portare in VARCO (0.39):** finestra sempre in primo piano con scorciatoia di sistema (globalShortcut), app in primo piano rilevata dall'eseguibile, profili e suggeriti salvati in storage, Command center riusato dalla 0.38 (lib/command-center.cjs) come secondo anello.

## 2026-11-17 · Launcher · In VARCO (Beta 0.39)
Portato dalla versione finale (launcher-final/) dentro il browser:
- finestra trasparente sempre in primo piano (`launcher.html/.js/.css`, `lib/launcher.cjs`), regole condivise in `launcher-rules.js`;
- programma in primo piano da un PowerShell che resta aperto (`lib/foreground.cjs`, ~10 ms a domanda);
- scorciatoia di sistema con ripiego automatico se quella di base è occupata (sul PC dell'utente Ctrl+Alt+Spazio era già presa → Ctrl+Maiusc+Spazio);
- tolti dagli esempi: scene finte, barra della demo, Tweaks (token tenuti ai valori di base); sopra il desktop niente sfocatura (la finestra è trasparente), quindi il vetro è più pieno (0.86).

## 2026-11-17 · Launcher · Beta 0.40
Richieste dell'utente dopo la 0.39: cartelle del PC, più anelli «come pagine», chiusura inversa all'entrata, media dei siti e delle app.
- Più anelli: fino a 5 per profilo, pallini sotto l'anello, l'anello gira di 45° cambiando pagina.
- Media: lettore di VARCO + controlli multimediali di Windows (stesso PowerShell del programma in primo piano).
- Chiusura: stesse animazioni dell'entrata al contrario (ordine degli spicchi invertito), ~0,3 s.

## 2026-11-17 · Suggerimenti · Round 1 (suggest-round-1/)
Richiesta: un motore solo per barra degli indirizzi, Home, launcher e command center; risultati per categoria (siti e ricerche → app → progetti → VARCO; nella barra degli indirizzi prima gli indirizzi); archivio interno dei siti più usati; ricerca tollerante; priorità da cronologia, preferiti, fast link e workspace attivo; intenti; ripiego; siti imparati dopo 5 visite.
Il motore è già codice vero (`suggest-rules.js`, `suggest-sites.js`, 194 siti, 10 test) e gli esempi lo usano direttamente. Nessun pin nuovo sulla board (102): stesse famiglie del launcher.

| Variante | Impaginazione |
|---|---|
| v1-sezioni | una lista a sezioni; la riga scelta si apre con pagine principali e azioni |
| v2-colonne | a sinistra il migliore in grande + siti e ricerche; a destra app, progetti, VARCO |
| v3-evidenza | il migliore in evidenza con pagine e azioni a vista; categorie come linguette che filtrano |

**Cambio di idea dell'utente:** troppe cose uguali in troppi posti; ogni casella deve fare una cosa sola.
- Barra degli indirizzi e Home = **solo web**, come un browser normale: indirizzi, siti (archivio, cronologia, preferiti, imparati) e ricerche (anche «Cerca lofi su YouTube»). Niente app, progetti né JARVIS.
- Launcher = PC e fast link; Command center = VARCO (schede, progetti, comandi, JARVIS).
- Motore: `scope:'web'` (predefinito). Esempi aggiornati: solo barra degli indirizzi e Home; in V2 a destra restano le ricerche.

**Scelta dell'impaginazione:** V3 · In evidenza. Portata in VARCO nella Beta 0.41 (barra degli indirizzi e Home; i suggerimenti del motore di ricerca vanno sotto la ricerca normale).

## 2026-11-17 · Tutorial · Round 1 (tutorial-round-1/)
Brief: design/BRIEF-tutorial.md. Tre livelli: primo avvio (~60 s), tour completo (8 passi), suggerimenti della prima volta; «Ripeti il tour» e «Apri il setup» nelle Impostazioni.
Gli esempi stanno sopra la **vera interfaccia** (cattura della 0.41 a 1366×768 con le posizioni reali; `shared/frame-rects.js`). A quella misura Progetti, Giochi, Pannelli e Impostazioni sono sotto il bordo della barra laterale: il tour la fa scorrere (seconda cattura).
Board: 102 pin, nessuno nuovo.

| Variante | Come guida |
|---|---|
| v1-riflettore | penombra con il buco sul pulsante vero (resta cliccabile), scheda con freccia accanto |
| v2-isola | niente penombra: isola dalla barra del titolo, anello che pulsa + «Qui» sul pulsante |
| v3-guida | pannello a destra con tutti i passi (spunte, progresso), faro sul pulsante; si salta a qualsiasi passo |

**Scelta:** V1 · Riflettore («mi sembra perfetto»). Portato in VARCO nella Beta 0.42: `tour.js`, `tour.css`, `tour-rules.js`, `lib/tour.cjs`; durante il tour la pagina è nascosta e al suo posto c'è la sua foto.

## 2026-11-17 · Pagina del progetto · Round 1 (project-round-1/)
Brief: design/BRIEF-project-page.md. Esempio: Destiny Builder (Unity 2022.3). Riquadri: stato del server con errori, azioni, file recenti, note, attività, risorse, screenshot; «+ Riquadro» aggiunge nota, file, stato della build o un'altra galleria.
Pin scelti fuori dai soliti: #14 (flusso di dati a nodi), #1 (Dark Admin Panel), #27 (Smart Calendar), #9 (Floating UIs di Stapelfeldt), #62 (habit tracker scuro).
Note, attività e screenshot sono in comune tra le due viste (in VARCO: `.varco/` nel progetto).

| Variante | Disposizione |
|---|---|
| v1-tela | tela libera tipo nodi di Blender: zoom, spostamento del fondo, fili tra le prese, riquadri ridimensionabili |
| v2-bacheca | griglia a 12 colonne: aggancio, gli altri si spostano e risalgono, ridimensionamento a scatti |

## 2026-11-18 · Pagina del progetto · Round 2 (project-round-2/v1-bento)
Spunto dell'utente: un esempio fatto con Stitch (Google), «Loom Studio Infinite Canvas»: riquadri bento su griglia a 12 colonne dentro una tela infinita, etichette in monospazio, barra degli strumenti a sinistra, dock in basso.
Portato nello stile di VARCO:
- colori = token del tema (viola #7c6cff al posto dell'indaco, azzurro #6fd3ff al posto del ciano);
- contenuto = Destiny Builder, con i riquadri della fase C;
- copertina = ultimo screenshot + stato del server + metriche (errori, attività, build, file cambiati).
Interazioni:
- trascinare per riordinare (gli altri scivolano, la griglia riempie i buchi);
- dimensioni da un menu;
- filtri Tutto / Lavoro / Media / Collegamenti;
- tela: Spazio o rotellina per muoversi, Ctrl+rotellina per lo zoom, «Concentrati» sul riquadro sotto il mouse;
- nota veloce; screenshot caricati o trascinati, «Usa in copertina».

## 2026-11-18 · Pagina del progetto · Round 2 (project-round-2/v2-tela)
Risposta dell'utente alla bacheca bento: «mi piace, ma voglio i collegamenti e la libertà di mettere i riquadri dove voglio, anche lontani». I fili servono a dare ordine (una nota legata a uno screenshot, a una risorsa…).
- Stessi riquadri bento (stile in `shared/bento.css`) su una tela libera, con aggancio ai puntini (si può togliere) e ridimensionamento dall'angolo.
- Fili: si collega trascinando da una presa (4 lati) o con lo strumento Collega (C: clic, clic). Il filo sceglie da solo i lati più vicini e ha una freccia per il verso. Cliccandolo puoi dargli un'etichetta, cambiare colore, invertire il verso o toglierlo. Se rilasci il filo sul vuoto nasce una nota già collegata.
- Passando sopra un riquadro, si accendono i suoi collegati e i fili si animano. «Concentrati» inquadra il riquadro scelto insieme ai suoi collegati.
- Nodi singoli quanti ne vuoi: nota, screenshot, link, file. Le miniature della galleria e i file recenti si trascinano fuori e diventano riquadri già collegati. Le immagini trascinate sulla tela diventano screenshot.
- Aree: riquadri tratteggiati con un nome; spostando l'area si spostano i riquadri che contiene.
- Minimappa nel dock (clic per andarci), filtri che attenuano invece di nascondere, scorciatoie V / H / C / N / F.
Aggiunta (stesso giorno): se rilasci il filo sul vuoto si apre il menu «Cosa vuoi creare?».
- Si può scrivere per cercare.
- Contenuti: nota, screenshot del progetto (si sceglie), screenshot dal PC, file (si sceglie), link.
- Contenitori: cartella screenshot, file recenti, attività, risorse, cronologia, note, stato. Se uno è già sulla tela, lo collega invece di crearne un altro.

## 2026-11-18 · Pagina del progetto · Round 3 (project-round-3/) — stile «meno IA»
Richiesta: stesso funzionamento della tela, ma un aspetto che non sembri fatto dall'intelligenza artificiale, preso da Pinterest.
Tolti in tutti e tre: aloni, vetro sfocato, sfumature viola-azzurro, puntini che pulsano, fili che brillano, arte astratta. Gli screenshot finti adesso sono schermate del builder.
Board: 105 pin. Ci sono pin nuovi in stile apparecchio (telecomandi, pannelli, interruttori, termometro, timer).

| Stile | Pin | Fili |
|---|---|---|
| A · Strumento | 2, 13, 26, 41, 10 — grafite, colori pieni per gli stati, numeri grossi, aree come nastro adesivo | cavi con la spina che pendono un po' |
| B · Brutale | 56, 101, 100, 52 — carta chiara, inchiostro, angoli vivi, ombre piene, titoli larghi | ad angolo retto, come uno schema |
| C · Editoriale | 65, 100, 52, 9 — carta scura calda, serif, righe sottili, sezioni § 01 | tratto d'inchiostro, etichetta in corsivo |
**Scelta:** A · Strumento.

## 2026-11-18 · Pagina del progetto · Round 4 (project-round-4/) — Strumento con i colori dei temi
Richiesta: lo stile Strumento deve seguire i temi di VARCO (colori).
- `shared/strumento-theme.js` → `strumentoTokens({accent,accent2,bg,mode})` calcola le variabili `--s-*` con le stesse regole di `lib/appearance-rules.cjs`. In VARCO andrà accanto a `cssVariables()`.
- **Scuro:** la grafite prende una punta dello sfondo del tema.
- **OLED:** nero puro.
- **Chiaro:** pannello grigio chiaro opaco (alla Stapelfeldt), con testo scuro.
- **Accento del tema:** pulsanti principali, avanzamento a tacche, spie, contorni di selezione, primo colore dei cavi.
- **Secondo colore:** secondo colore dei cavi. Se è troppo simile all'accento (Lime) si sposta da solo.
- **Leggibilità:** sulle scritte l'accento si scurisce o si schiarisce finché si legge (Lime chiaro → verde oliva). Sui pulsanti il testo è bianco, o nero sui colori chiari.
- **Colori di stato fissi** (errore arancio, attenzione giallo, riuscito lime), così un errore resta un errore con ogni tema.
- Il nastro delle aree prende il colore del tema, con la scritta leggibile.
- Provati tutti i 23 temi nelle tre modalità. Negli esempi c'è un pannello «Tema di VARCO» (temi, modalità, accento e secondo colore personalizzati) che in VARCO non serve.

## 2026-11-18 · Pagina del gioco e sessione · Round 1 (game-round-1/) — 0.43.3
Brief: design/BRIEF-game-session.md. Stessa tela e stesso stile «Strumento» (colori del tema) della pagina del progetto. Esempio: Destiny 2.
Pin: i quattro timer a blocchi di colore, il termometro giallo, la manopola «Instruments», il pannello avvisi.
- **Riquadri:** scheda del gioco (stato, monitor, companion, barra della sessione a tacche, sessione/oggi/catture/obiettivi), obiettivi, timer (blocchi pieni: verde in corsa, giallo agli ultimi 10 s, arancio scaduto; anche «Reset settimanale» fino a martedì 18:00), note tattiche, catture (screenshot e clip), build, sessioni passate, link rapidi (pannello o scheda).
- **Avvio:** scheda in un angolo sopra il gioco: «Che sessione è?» con i preset Raid / PvP / Streaming / Giocatore singolo (tasti 1–4); dopo 10 s si usa l'ultimo.
- **Fine:** riepilogo (durata, preset, catture da scegliere, nota, obiettivi) → «Salva nella sessione di oggi» in Documenti\VARCO\Giochi\Destiny 2\sessioni\<data>.md, oppure «Non salvare» / «Ricordamelo dopo».
- Nel pannello dell'esempio: «Simula» avvio, cattura, chiusura.

## 2026-11-18 · Pagina del gioco · Round 2 (game-round-2/) — più generale
Richiesta: meno legata a Destiny, valida per qualsiasi gioco.
- **La pagina è la stessa per ogni gioco**; cambiano solo i contenuti che VARCO propone (profilo del gioco):
  - nome, piattaforma, eseguibile e genere;
  - siti del gioco più quelli suggeriti per tutti (wiki, Reddit, YouTube, Discord);
  - due timer di partenza;
  - righe della configurazione;
  - obiettivi d'esempio.
- **Esempi nel pannello** (scelta «Gioco d'esempio»): Elden Ring, Valorant, Minecraft, Destiny 2.
- **Preset uguali per tutti e modificabili:** Con amici, Competitivo, Streaming, Da solo. Il nuovo editor dei preset (dalla scelta all'avvio o dal pannello) permette di cambiare nome, icona, siti da aprire, companion, timer, note e clip; si possono aggiungere o eliminare preset.
- **Build → «Configurazione»:** righe libere (voce: valore) che scrivi tu, per esempio classe, agente o seme del mondo.
- **Timer «fino a»:** giorno e ora configurabili (non solo il reset del martedì).

## 2026-11-18 · Pagina del gioco · Round 3 (game-round-3/) — personalizzabile, persistente, più board
Richiesta: più personalizzazione (dalle etichette degli obiettivi ai link rapidi); board che non si perde quando chiudi il gioco e fa da storico delle partite; più board per gioco (run diverse) in una collezione.
- **Etichette degli obiettivi:**
  - colorate e in comune tra le board del gioco;
  - clic sull'etichetta per cambiarla;
  - «Gestisci le etichette» per rinominarle (aggiorna gli obiettivi), cambiare colore, aggiungerle o eliminarle.
- **Link rapidi:**
  - aggiungi, modifica o togli;
  - per ognuno: nome, indirizzo, icona, dove si apre (pannello, scheda o companion) e se va nel dock;
  - i suggeriti restano segnati finché non li modifichi.
- **Board persistente:**
  - alla fine della partita la board resta com'è e la partita va nello «Storico partite»: durata, preset, catture scelte, una riga «Com'è andata?», obiettivi fatti;
  - facoltativo: togliere le spunte agli obiettivi per la partita dopo.
- **Storico:** pannello a lato con i totali (partite, ore, catture), l'elenco e il dettaglio di ogni partita.
- **Collezione di board** (pulsante «Board» nella testata):
  - una board per run, stagione o mondo, con copertina, partite, ore, obiettivi, ultima partita;
  - rinomina, duplica, archivia o ripristina, elimina (con conferma);
  - «Nuova board» parte da: la disposizione della board attuale (contenuti vuoti), una board pulita o una copia completa;
  - all'avvio del gioco, nella scelta del preset, si sceglie anche la board su cui giocare.
