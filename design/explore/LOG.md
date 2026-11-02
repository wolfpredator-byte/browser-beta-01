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
