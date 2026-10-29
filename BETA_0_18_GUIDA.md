# VARCO Beta 0.18 — Stack compatti e vista divisa

Installer: `dist\VARCO Setup 0.18.0.exe`. Si installa sopra e i dati restano.

Con questa versione finisce la tua lista di idee: stack più compatti e vista divisa.

## Cosa cambia

1. **Stack compatti.** Uno stack compresso (▾ sul nome dello stack, o "Comprimi / Espandi stack" dal menu della scheda) diventa **una sola pillola** nella barra in basso:
   - le icone dei siti dello stack una accanto all'altra (fino a 5, poi "+n"); **clic su un'icona** = vai a quella scheda;
   - la scheda attiva ha l'icona evidenziata, e il suo titolo compare accanto;
   - **clic sul titolo** apre la scheda attiva dello stack (o la prima), la freccia a sinistra lo riapre;
   - il click destro su un'icona apre il menu di quella scheda;
   - trascina una scheda sulla pillola per aggiungerla allo stack.
2. **Vista divisa: due schede affiancate nella stessa finestra.**
   - **Per aprirla:** click destro su una scheda → **Affianca alla scheda attiva**. La scheda attiva va a sinistra, quella scelta a destra.
   - **Lato attivo:** ha il contorno viola (o del colore del workspace). È quello a cui si riferiscono barra degli indirizzi, Indietro/Avanti, zoom, Ctrl+F e stampa. **Clicca dentro l'altro lato** per renderlo attivo.
   - **Divisore:** trascinalo per cambiare le larghezze, dal 20% all'80%. Doppio clic: metà e metà. Mentre trascini, le due pagine diventano due riquadri col titolo, e tornano al rilascio.
   - **Barra in alto:** con la vista divisa compaiono **⇆ Scambia i lati** e **× Chiudi vista divisa**. Ci sono anche nel menu della scheda e nella palette (F1 → "vista divisa").
   - **Schede della coppia:** nella barra in basso hanno una riga viola a sinistra.
   - **Se apri un'altra scheda** la vista divisa si nasconde. Tornando su una delle due ricompare com'era. Chiudere una delle due schede, o cambiare workspace nella finestra, la chiude.

## Modalità insegnamento
- **Due pagine nella finestra.** Ogni pagina è una WebContentsView: la vista divisa ne mette due, la scheda attiva (`w.attached`) e l'altra (`w.splitView`).
  - Le misure vengono da `splitRects` (`window-rules.cjs`, con test): due riquadri separati dagli stessi 8 px che staccano la pagina dai bordi. In quello spazio la cornice disegna il divisore e il contorno.
  - Cliccare nell'altro lato non stacca e riattacca le pagine: scambia solo quale delle due è "attiva" (`focusSplitPane`), quindi niente sfarfallio.
- **Perché le pagine si nascondono mentre trascini:** quando il mouse passa sopra una pagina web, la cornice non lo "sente" più e il trascinamento si fermerebbe a metà. Per sicurezza, anche un rilascio del mouse altrove o la finestra che perde il focus chiudono il trascinamento.

## Test da fare

- [ ] **T94** — Crea uno stack con 2–3 schede e comprimilo: una pillola con le icone. Clic su ciascuna icona. **📸** della barra in basso.
- [ ] **T95** — Click destro su una scheda → Affianca alla scheda attiva. **📸** della vista divisa.
- [ ] **T96** — Clicca dentro l'altro lato: il contorno e la barra degli indirizzi passano a lui. Indietro/Avanti agiscono sul lato giusto.
- [ ] **T97** — Trascina il divisore e fai doppio clic. Poi ⇆ e ×.
- [ ] **T98** — Con la vista divisa aperta, vai alla Home e torna su una delle due schede: la vista divisa ricompare.

**Stato:** 109 test superati (nuovo: misure della vista divisa). Provato nell'app, con catture dello schermo:
- Wikipedia e light.gg affiancate (849 + 849 px);
- clic dentro il lato destro: diventa attivo e la barra mostra il suo indirizzo;
- 35%, scambio dei lati (la proporzione segue: 65%);
- Home → la vista divisa si nasconde, ma resta ricordata; ritorno su una delle due schede → ricompare;
- divisore trascinato col mouse: da 65% a 44%, pagine nascoste durante e di nuovo visibili dopo;
- stack "Destiny" compresso: una pillola con 3 icone, il titolo della scheda attiva e la sua icona evidenziata.

**Corretto durante le prove:** se il rilascio del mouse non arrivava al divisore, le pagine restavano nascoste. Ora il trascinamento finisce comunque.

**Non fatto:** la vista divisa non viene ricordata alla chiusura del browser (le due schede sì). Dimmi se ti serve.

## La tua lista di idee
Con la 0.18 è completa:
- rinomina e personalizzazione dei workspace, stack compatti, vista divisa;
- icone e logo, blocco note, ricarica dell'anteprima;
- palette minimal (barra fluttuante), Impostazioni in una pagina, Home alla chiusura dell'ultima scheda.
