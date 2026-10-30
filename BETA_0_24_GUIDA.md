# VARCO Beta 0.24 — Tante schede

Installer: `dist\VARCO Setup 0.24.0.exe`. È anche la prima versione che arriva da sola con l'aggiornamento automatico della 0.23, appena pubblico la release.

## Gestore delle schede
- Si apre con **Ctrl+Shift+A**, con il nuovo **contatore** nella barra delle schede (icona e numero, accanto al +) o dalla voce **Schede** della barra laterale.
- **Ricerca** per titolo o indirizzo, mentre scrivi. **Invio** apre la prima scheda trovata, **Esc** chiude.
- **Questo workspace / Tutti**: anche le schede degli altri workspace e delle altre finestre. Un clic ci va.
- Le schede sono **raggruppate per sito**, i siti con più schede in cima. "Chiudi tutte" chiude le schede di quel sito, con conferma.
- Accanto a ogni scheda: workspace, finestra, stack, "fissata" o "sospesa". La × la chiude (compare passandoci sopra).
- **Raggruppa per sito**: le schede libere dello stesso sito diventano uno stack con il nome del sito (Github, Google Docs…). Quelle già in uno stack e quelle fissate restano dove sono.
- **Chiudi doppie (N)**: la stessa pagina aperta più volte nello stesso workspace. Resta quella che stai guardando, o quella fissata.

## Barra delle schede
- **Raggruppa da solo quando sono tante** (interruttore nel gestore, spento di base): da 10 schede in su in una finestra, 3 o più schede dello stesso sito diventano uno stack **compresso**, cioè una sola pillola con le icone. Succede anche quando apri o navighi una scheda.
- La barra **scorre con la rotellina** del mouse.
- La scheda attiva **resta sempre in vista**: cambiando scheda la barra la porta sullo schermo.
- Il contatore si può nascondere da Impostazioni → Interfaccia → Barre.
- Anche dalla palette (F1): "Cerca tra le schede", "Raggruppa le schede per sito", "Chiudi le schede doppie".

## 0.24.1 — Barra delle schede senza barre di scorrimento (dalle tue prove)
Installer: `dist\VARCO Setup 0.24.1.exe`.

Con tante schede o con la finestra stretta comparivano le barre di scorrimento. Ora non ci sono più:
- **avvicina il mouse al bordo sinistro o destro** della barra: le schede scorrono da sole, più veloci quanto più sei vicino al bordo. Al centro si fermano;
- funziona anche **trascinando una scheda** verso il bordo, per spostarla lontano;
- una **sfumatura** sul bordo indica che da quel lato ci sono altre schede;
- la rotellina continua a funzionare.

- [ ] **T142** — Stringi la finestra con molte schede: nessuna barra di scorrimento. Porta il mouse al bordo destro, poi al sinistro: la barra scorre. **📸**
- [ ] **T143** — Trascina una scheda verso il bordo destro: la barra scorre e puoi lasciarla più in là.

## Modalità insegnamento
- **Nome dello stack:** dal dominio si prende la parte principale (`github.com` → Github, `docs.google.com` → Google Docs, `bbc.co.uk` → Bbc). Se due siti danno lo stesso nome (`example.com` ed `example.org`), lo stack prende il nome completo. Così non finiscono insieme.
- **Stessa pagina:** l'indirizzo senza il frammento `#…` e senza la barra finale. `pagina#capitolo` e `pagina/` sono doppie di `pagina`.
- **Il pannello non si ricostruisce tutto:** ricerca e pulsanti restano, si ridisegna solo l'elenco. Per questo puoi scrivere mentre le pagine caricano e i titoli cambiano.

## Test da fare
- [ ] **T135** — Apri una ventina di schede, alcune dello stesso sito. **Ctrl+Shift+A**: elenco per sito con i numeri. Scrivi parte di un titolo e premi Invio. **📸**
- [ ] **T136** — Gestore → **Tutti**: compaiono le schede degli altri workspace. Cliccane una: si apre la sua finestra.
- [ ] **T137** — Apri due volte la stessa pagina: "Chiudi doppie (1)" la chiude e resta quella che guardi.
- [ ] **T138** — **Raggruppa per sito**: nella barra compaiono gli stack col nome del sito.
- [ ] **T139** — Accendi **Raggruppa da solo quando sono tante** con più di 10 schede: i siti con 3+ schede diventano pillole compresse. **📸** della barra.
- [ ] **T140** — Rotellina sulla barra delle schede: scorre. Cambia scheda da Ctrl+Shift+A: la barra la porta in vista.
- [ ] **T141** — Dopo la release v0.24.0 su GitHub: dalla 0.23 installata arriva "VARCO 0.24.0 è pronto". Premi **Riavvia e aggiorna**.

**Stato:** 136 test superati, di cui 3 nuovi (sito e nome dello stack, doppie, raggruppamento) più la scorciatoia. Provato nell'app con 18 schede:
- ricerca "google" → 4 di 18;
- 3 doppie chiuse (`example.com` e `example.com/#x` contano come la stessa);
- 4 stack per sito;
- raggruppamento automatico con 3 stack compressi: la barra passa da 15 schede strette a pillole leggibili.

**Corretto durante le prove:** `example.com` ed `example.org` finivano nello stesso stack "Example".
