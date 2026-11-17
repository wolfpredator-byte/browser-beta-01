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
