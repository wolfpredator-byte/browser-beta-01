# VARCO Beta 0.14 — Cornice e sfondo

Installer: `dist\VARCO Setup 0.14.0.exe`.

**Risultato dei test della 0.13:** tutto va bene, tranne l'icona in alto a destra, "un pugno in un occhio". Questa versione parte da lì e dalle cartelle `Reference\Background`, `Reference\Da implementare` e `Reference\Reference altri browser`.

## Cosa cambia

1. **Icona JARVIS in alto a destra:** non più la pastiglia viola luminosa, ma un'icona come le altre (`jarvis.svg`).
   - Diventa viola, con un leggero bagliore, solo quando JARVIS è collegato.
   - Pulsa piano mentre JARVIS pensa o parla.
2. **Il tuo sfondo** (*Celestial Fjord at Dawn*): nitido nella Home e sfocato e scurito dietro barre, barra laterale e schede, che ora sono vetro semitrasparente.
3. **Cornice come Vivaldi:** il sito sta in un **riquadro con angoli arrotondati**, staccato di 8 px dai bordi, con lo sfondo che si vede intorno.
   - Home, Impostazioni e pagina di errore usano lo stesso riquadro.
   - A schermo intero (video) la pagina torna a coprire tutto.
4. **Barre di scorrimento minimal** (mock-up *Cosmic Browser UI System*): sottili e viola-grigie, viola pieno quando ci passi sopra o le trascini. Valgono nella cornice e nei siti.
5. **Linea di caricamento** sotto la barra degli indirizzi (mock-up *Neon Browser Sliders*):
   - avanza mentre la pagina carica;
   - si completa e sfuma quando ha finito;
   - diventa rossa se il caricamento fallisce.
6. **Notifiche toast** in basso a destra (mock-up *Notification System*):

   | Evento | Cosa mostra | Pulsanti |
   |---|---|---|
   | Download in corso | barra di avanzamento | Annulla |
   | Download completato | | Apri, Mostra |
   | Download annullato o con errore | | Riprova |
   | Scheda chiusa | | **Annulla**, che la riapre |
   | Aggiunto ai preferiti | | **Annulla**, che lo toglie |
   | Disposizione salvata o non salvata | | |

   - Spariscono da sole dopo qualche secondo, ma non mentre ci tieni sopra il mouse; × le chiude.
   - Al massimo 4 alla volta.

## Modalità insegnamento

- **Riquadro arrotondato:** `pageBounds` (`window-rules.cjs`) lascia `GAP=8` px intorno alla pagina e `view.setBorderRadius(10)` arrotonda la WebContentsView. Il CSS usa gli stessi valori (`--gap`, `--page-radius`), così Home e pagina di errore coincidono al pixel con il sito.
- **Toast sopra il sito:**
  - Le pagine stanno sopra la cornice, quindi i toast hanno un loro livello: una seconda WebContentsView **trasparente** (`overlay.html`) appoggiata sopra la pagina.
  - Il livello è grande solo quanto i toast: `overlay.js` misura la propria altezza e la comunica al processo principale. Fuori da quel rettangolo i clic arrivano al sito.
  - Ogni volta che una pagina viene mostrata, il livello viene rimesso in cima.
  - Nella 0.15 lo stesso livello servirà per i menu del click destro e i dialoghi.
- **Barre di scorrimento nei siti:** sono inserite come foglio di stile *dell'utente* (`insertCSS` con `cssOrigin:'user'`), che ha la priorità più bassa: i siti che disegnano le proprie barre (es. Discord) le tengono.

## Test da fare

- [ ] **T67** — Apri un sito qualsiasi: angoli arrotondati, sfondo visibile intorno, barre semitrasparenti. **📸** a finestra intera.
- [ ] **T68** — Home: lo sfondo è il fiordo, nitido. **📸**.
- [ ] **T69** — Scarica un file: toast con l'avanzamento, poi "Download completato" con Apri / Mostra.
- [ ] **T70** — Chiudi una scheda (×) e premi **Annulla** nel toast: la scheda torna.
- [ ] **T71** — ☆ sulla barra: toast "Aggiunto ai preferiti", **Annulla** lo toglie.
- [ ] **T72** — Apri un sito lento e uno inesistente: linea che avanza e sfuma, poi linea rossa.
- [ ] **T73** — Icona JARVIS in alto a destra: grigia con JARVIS spento, viola quando è collegato.

**Stato:** 103 test superati. Provato nell'app (profilo di prova), con catture dello schermo:
- riquadro arrotondato con lo sfondo intorno; Home con il fiordo;
- toast sopra Wikipedia, con gli angoli trasparenti;
- "Scheda chiusa" → Annulla riapre la scheda (anche quando era l'ultima ed era comparsa la Home);
- download vero da 3 MB: toast con l'avanzamento, poi "Download completato · Apri · Mostra".

Installer controllato: il livello dei toast, lo sfondo e le icone nuove sono nell'eseguibile.

**Corretto durante le prove:** i toast dei download finivano nella finestra che Windows considerava in primo piano, non in quella del download.

**Non fatto:** le barre di scorrimento che spariscono dopo qualche secondo di inattività (stato 4 del mock-up). Senza un programma dentro ogni sito non si può fare, e preferisco non aggiungerlo a tutte le pagine. Tutti gli altri stati del mock-up ci sono.

## Prossime
- **0.15 — Menu, dialoghi e pannelli:**
  - menu del click destro VARCO (pagina, link, immagine, scheda, workspace, file scaricato);
  - dialoghi VARCO per permessi, sito non sicuro, conferme ed errore;
  - pannello download con le schede "In corso / Completati / Annullati / Errori";
  - centro notifiche;
  - transizione a scorrimento tra le pagine.
- **0.16 — Installer personalizzato.**
