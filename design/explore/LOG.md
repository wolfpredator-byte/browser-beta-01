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


