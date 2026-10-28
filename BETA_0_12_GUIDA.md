# Browser Beta 0.12 — Barra intelligente, pagina Impostazioni, Home al posto della chiusura

Installer: `dist\Personal Browser Setup 0.12.0.exe` (si installa sopra, i dati restano).

Questa versione nasce dalla tua lista di idee: la palette più minimal, le impostazioni in una pagina propria, l'ultima scheda che porta alla Home e l'elenco delle icone.

## Cosa cambia

1. **La barra degli indirizzi suggerisce mentre scrivi.** La grande palette della 0.11 non c'è più. Sotto la barra compaiono al massimo 8 righe:
   - la prima è sempre il testo stesso ("Cerca «…»" oppure l'indirizzo);
   - le altre sono schede di tutti i workspace, comandi, workspace, comandi del progetto, preferiti e cronologia.
   - **Invio** fa quello che ha sempre fatto: apre l'indirizzo o la ricerca;
   - **↓ ↑** scelgono un suggerimento, **Esc** chiude.
2. **Solo comandi: scrivi `>`** all'inizio, come in VS Code. **F1**, **Ctrl+Shift+P** e il pulsante **⌘** portano nella barra con `>` già scritto.
3. **Impostazioni in una pagina propria**: si aprono in una scheda, come la Home, dal pulsante ⚙, con **Ctrl+,** o con `>impost`.
   - Le sezioni stanno su due colonne quando la finestra è larga.
   - La scheda viene ricordata alla chiusura del browser, come le altre.
4. **Chiudere l'ultima scheda porta alla Home** invece di chiudere la finestra. La finestra si chiude solo con la sua ×.
5. **[ICONE.md](ICONE.md)**: l'elenco di tutte le icone del browser (logo, barra in alto, barra laterale, schede, suggerimenti), con nomi dei file, dimensioni, formato e priorità. Ti serve per disegnarle. Quando hai i file li collego io.

## Modalità insegnamento

- **I suggerimenti usano la stessa tecnica della palette.** Alla prima lettera, il processo principale:
  1. fotografa la pagina;
  2. la nasconde;
  3. manda alla cornice l'elenco dei suggerimenti, che poi filtra da sola a ogni lettera senza chiedere di nuovo.

  La foto della pagina resta al suo posto, solo più scura: l'elenco non finisce sotto il sito.
- **Pagine interne.** Home e Impostazioni sono lo stesso tipo di scheda (`isHome`, nessuna pagina web). Le distingue l'indirizzo interno, `app://home` o `app://settings`. Così ripristino della sessione, schede chiuse, spostamenti e disposizioni le trattano già in modo corretto, senza codice nuovo.

## Test da fare

- [ ] **T56** — Scrivi `dest` nella barra: sotto compaiono schede, preferiti e cronologia con "Destiny"; **Invio** cerca "dest" sul web. Riprova e scegli una scheda con ↓ + Invio. **📸** dei suggerimenti.
- [ ] **T57** — **F1** mentre sei dentro una pagina: la barra mostra `>` e i comandi. Scrivi `zoom` e scegli "Zoom avanti".
- [ ] **T58** — **Ctrl+,**: si apre la scheda ⚙ Impostazioni. Chiudi e riapri il browser: la scheda c'è ancora.
- [ ] **T59** — In una finestra chiudi tutte le schede una per una: alla fine resta la Home e la finestra non si chiude.
- [ ] **T60** — Esc con i suggerimenti aperti: si chiudono, la pagina torna e la barra si svuota.

**Stato:** 103 test superati. Provato nell'app (profilo di prova):
- `dest` mostra 8 righe, con la ricerca in testa e la pagina nascosta dietro la sua foto;
- F1 mette `>` nella barra; `>impost` + Invio apre la scheda Impostazioni;
- la scheda Impostazioni sopravvive al riavvio;
- chiuse tutte le schede di una finestra, la finestra resta aperta con la Home.

Installer controllato: i suggerimenti funzionano nell'eseguibile. Lì mi sono accorto che `>sett` non trovava "Impostazioni": ho aggiunto la parola chiave "settings".

**Prossime (dalla tua lista):**
- 0.13: rinomina e personalizzazione dei workspace, blocco note per progetto, ricarica automatica dell'anteprima;
- 0.14: stack compatti e vista divisa.
