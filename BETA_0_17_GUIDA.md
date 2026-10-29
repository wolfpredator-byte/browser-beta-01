# VARCO Beta 0.17 — Workspace su misura, note e anteprima che si ricarica

Installer: `dist\VARCO Setup 0.17.0.exe`. Si installa sopra la 0.16 e i dati restano.

Dalla tua lista di idee: rinomina e personalizzazione dei workspace, un blocco note per ogni progetto e la ricarica automatica quando parte un comando.

## Cosa cambia

1. **Rinominare un workspace.** Click destro sul workspace → **Rinomina…**: nel pannello compare il modulo con il nome attuale già scritto. Con il nome cambiano anche:
   - le schede (anche quelle sospese);
   - le finestre aperte e il loro titolo;
   - le disposizioni sui monitor e gli stack compressi;
   - i giochi che aprono quel workspace e l'ultima scheda usata;
   - le note e il progetto collegato.

   Nomi vuoti o già usati (anche con maiuscole diverse) vengono rifiutati.
2. **Colore del workspace.** Click destro → **Colore**: viola, blu, ciano, verde, giallo, arancio, rosso o rosa (oppure nessuno). Il colore tinge:
   - l'icona e l'evidenziazione nella barra laterale;
   - la scheda attiva in basso;
   - l'icona del selettore dei workspace.
3. **Ordine dei workspace:** trascina un workspace sopra un altro nella barra laterale e si mette prima di lui.
4. **Icona:** se ne hai messa una tua, *Torna all'icona predefinita* la toglie.
5. **Note del workspace** (pulsante **Note** nella barra laterale, oppure "note" nella palette):
   - un blocco note per ogni workspace, che si salva da solo mentre scrivi ("Salvato alle 01:58");
   - resta nei dati del browser, quindi compare anche nei backup e segue il workspace se lo rinomini.
6. **L'anteprima si ricarica quando il server è pronto.**
   - Avvii un comando del progetto (es. `npm run dev`) e la pagina dell'anteprima mostra ancora "server spento".
   - Appena il log dice che il server è pronto, VARCO ricarica da solo le schede dell'anteprima e mostra il toast «*Dev server* è pronto».
   - Se l'anteprima non è aperta, il toast offre **Apri anteprima**.
   - Nel pannello Progetto il comando risulta "pronto".

   Riconosce da solo le frasi tipiche:
   - Vite `Local: http://…`;
   - Next `ready`;
   - webpack `compiled`;
   - Express `listening`;
   - oppure l'indirizzo dell'anteprima nel log (es. `localhost:3000`).

   Per i casi particolari, in `progetto.browser.json`:
   ```json
   "avvio": [
     {"nome": "API", "comando": "npm run api", "pronto": "API pronta"},
     {"nome": "Test", "comando": "npm test", "ricarica": false}
   ]
   ```
   - `pronto`: il testo del log che vuol dire "pronto" (senza maiuscole);
   - `ricarica: false`: per quel comando non ricaricare l'anteprima.

## Modalità insegnamento
- **Il nome del workspace è una chiave.** Schede, disposizioni, stack, giochi, finestre, note e l'ultima scheda usata ("Nome" e "Nome#2" per le finestre secondarie) lo usano per ritrovare il loro workspace. `workspace-rules.cjs → renameWorkspace` li aggiorna tutti insieme, con un test che li controlla uno per uno.
- **Il progetto ha un "osservatore"** della cartella, legato al nome del workspace: alla rinomina viene chiuso e rifatto (`projects.rename`).
- **"Pronto"** è una funzione pura (`project-rules.cjs → isReadyLine`), testata con le frasi vere dei dev server più usati.

## Test da fare

- [x] **T87** — Click destro su un workspace → Rinomina…: cambia nome. Schede, finestre e la sua disposizione salvata ci sono ancora (Ripristina disposizione funziona).
- [x] **T88** — Click destro → Colore → un colore a scelta. **📸** della barra laterale e delle schede.
- [x] **T89** — Trascina un workspace in cima alla lista.
- [x] **T90** — Note: scrivi qualcosa, chiudi e riapri il browser: le note ci sono.
- [ ] **T91** (non passato: server in https, vedi 0.17.1 e T92) — Destiny Builder: apri l'anteprima con il server spento (pagina di errore), poi Progetto → ▶ Avvia: appena il server è su, la pagina si ricarica da sola e compare il toast. **📸**.

**Stato:** 107 test superati (4 nuovi: rinomina, nomi rifiutati, ordine, frasi "pronto"). Provato nell'app (profilo di prova):
- anteprima con il server spento → pagina di errore dopo circa 2,5 s (Chromium riprova prima di arrendersi) → ▶ Avvia → entro un secondo la scheda mostra la pagina vera, con il toast «Dev server è pronto · Anteprima ricaricata (1 scheda)»;
- "Test 0.5" rinominato dal modulo in "Test 0.17":
  - le 3 finestre, le 15 schede, la disposizione e il progetto lo seguono;
  - il titolo della finestra cambia;
  - nessuna scheda resta sul vecchio nome;
- colore verde e spostamento in cima;
- note salvate da sole ("Salvato alle 01:58");
- menu del workspace con il sottomenu dei colori.

**Corretto durante le prove:** nel sottomenu dei colori il pallino usciva dalla colonna delle icone.

## Prossima
- **0.18:** stack compatti (due schede in una sola icona) e vista divisa (due schede affiancate nella stessa finestra).

**Risultato dei tuoi test:** con Destiny Builder l'anteprima non tornava: il server Next.js gira in **https** (`https://localhost:3000`), mentre il file del progetto dice `http://`. In più la barra degli indirizzi non si poteva modificare.

## 0.17.1 — Indirizzo dal log e barra degli indirizzi modificabile

Installer: `dist\VARCO Setup 0.17.1.exe`.

- **L'anteprima usa l'indirizzo che scrive il server.** VARCO legge dal log la riga `Local: https://localhost:3000` (o qualunque indirizzo locale) e porta lì le schede dell'anteprima.
  - Se cambia solo il protocollo o la porta, la pagina resta la stessa: `http://localhost:3000/build/123` diventa `https://localhost:3000/build/123`.
  - Anche il pulsante **Anteprima** del pannello Progetto usa quell'indirizzo finché il server è acceso.
  - Non serve cambiare `progetto.browser.json`, ma puoi comunque scriverci `https://`.
- **Certificati dei server locali:** i dev server in https (come il tuo Next.js con `--experimental-https`) usano un certificato fatto in casa. VARCO lo accetta **solo** per `localhost` e `127.0.0.1`, come Chrome con l'opzione per sviluppatori. Per tutti gli altri siti il controllo resta quello normale.
- **Pagina di errore:**
  - via il pulsante vuoto accanto a "Riprova" (era un difetto di stile);
  - se un indirizzo locale in http riceve la connessione chiusa (`ERR_EMPTY_RESPONSE`, tipico di un server in https), compare **Prova con https://**.
- **Barra degli indirizzi modificabile**, come in Chrome:
  - mostra l'indirizzo della pagina;
  - un clic lo seleziona tutto: scrivi per sostituirlo, oppure clicca di nuovo per modificarne un pezzo;
  - **Invio** apre l'indirizzo modificato;
  - **Esc**, o un clic altrove, annulla e torna all'indirizzo della pagina;
  - i suggerimenti compaiono come prima mentre scrivi.

Provato nell'app:
- `https://example.com/` + `?modificato=1` + Invio apre l'indirizzo modificato; Esc annulla un testo scritto a metà;
- server https con certificato fatto in casa sulla porta 8766, aperto in `http://localhost:8766/build/123`: pagina di errore `ERR_EMPTY_RESPONSE` con "Prova con https://";
- quando il log dice `Local: https://localhost:8766` e "Ready", la scheda passa a `https://localhost:8766/build/123` e mostra la pagina, con il toast «Dev server è pronto».

108 test superati (nuovo: indirizzo letto dal log di Next.js, Vite e 0.0.0.0).

- [ ] **T92** — Destiny Builder: pagina dell'anteprima aperta (anche in http e con il server spento) → ▶ Avvia: la scheda passa a `https://localhost:3000` e mostra il sito.
- [ ] **T93** — Barra degli indirizzi: clic, modifica una parte dell'indirizzo o della ricerca, Invio.
