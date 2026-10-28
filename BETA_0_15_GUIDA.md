# VARCO Beta 0.15 — Menu, dialoghi e pannelli

Installer: `dist\VARCO Setup 0.15.0.exe`.

Dalla cartella `Reference\Da implementare`: mock-up *Page Slider and Context Menus* e *Notification System*.

## Cosa cambia

1. **Menu del click destro VARCO** al posto di quelli di Windows: vetro scuro, icone a sinistra, scorciatoie a destra, sottomenu, frecce e Invio da tastiera, Esc per chiudere.
   - **Pagina:** Indietro, Avanti, Ricarica, Salva pagina con nome…, Stampa…, Aggiungi ai preferiti, Ispeziona.
   - **Link:** Apri link in nuova scheda, in nuova finestra, Copia indirizzo link, Aggiungi link ai preferiti.
   - **Immagine:** Apri in nuova scheda, Salva immagine con nome…, Copia immagine, Copia indirizzo immagine, Cerca con Google Lens.
   - **Testo selezionato:** Copia, Cerca «…» con il tuo motore di ricerca.
   - **Campi di testo:** Annulla, Taglia, Copia, Incolla, Seleziona tutto.
   - **Scheda:**
     - nuove voci: Nuova scheda, Disattiva/Riattiva audio sito, Chiudi altre schede, Chiudi schede a destra (quelle fissate restano);
     - restano: stack, sposta nel workspace o in un'altra finestra, riapri, chiudi.
   - **Workspace:**
     - nuove voci: Nuova scheda nel workspace, Chiudi le finestre del workspace;
     - restano: apri in nuova finestra, disposizioni, cambia icona.
   - **File scaricato** (click destro nel pannello Download): Apri file, Apri cartella, Copia percorso, Copia indirizzo di origine, Riprova, Rimuovi dalla lista, **Elimina file** (in rosso, con conferma), Annulla download.
2. **Dialoghi VARCO** al posto di quelli di Windows:
   - **permessi del sito**: *Blocca* / *Consenti* in viola, con "Ricorda la scelta";
   - **"Vuoi salvare questo file?"**: Annulla / Salva in… / Salva;
   - **conferma prima di eliminare un file** (pulsante rosso);
   - **importazione di un backup**;
   - **comandi chiesti da JARVIS**.

   Esc o × equivalgono ad "Annulla". La scelta di cartella in "Salva in…" resta la finestra di Windows, che serve a sfogliare il disco.
3. **Pannello Download con le schede** Tutti / In corso / Completati / Annullati / Errori, con il numero di elementi.
   - Ogni file ha l'icona del suo stato e la barra di avanzamento.
   - Un pulsante rapido: mostra nella cartella, annulla o riprova.
   - Doppio clic apre il file; click destro apre il menu del file.
4. **Centro notifiche** (pulsante *Notifiche* nella barra laterale, con il numero di quelle non lette):
   - ogni toast resta qui, insieme alle scelte sui permessi (categoria *Sito*) e ai collegamenti di JARVIS (categoria *JARVIS*);
   - filtri Tutte / Download / Sito / JARVIS / Sistema, × per togliere una voce, "Cancella tutto";
   - vale per la sessione: si svuota quando chiudi il browser.
5. **Transizione tra le schede**: la nuova pagina entra scorrendo da destra (circa 150 ms). Si spegne in Impostazioni → Schede → "Animazione a scorrimento quando cambi scheda".

## Modalità insegnamento
- **Menu e dialoghi** usano un secondo livello trasparente sopra la pagina (`popup.html`, `lib/popup.cjs`), come i toast.
  - Copre tutta la finestra solo mentre è aperto.
  - Le funzioni delle voci restano nel processo principale: la pagina del menu riceve solo i testi e risponde con il numero della voce scelta. Una pagina web non può quindi inventarsi un'azione.
- **Le API ricalcano quelle di Electron.** `popup.menu(w, template)` accetta le stesse voci di `Menu.buildFromTemplate`, più `icon` e `danger`. `popup.dialog(w, options)` risponde come `dialog.showMessageBox`. Per questo convertire i vecchi menu è stato quasi solo cambiare la chiamata.
- **Animazione:** si sposta solo la posizione della pagina, mai la larghezza, così il sito non si ridisegna a ogni passo.

## Test da fare

- [ ] **T74** — Click destro su un link, su un'immagine, su un testo selezionato, in un campo di testo e sulla pagina vuota: menu VARCO con le voci giuste. **📸** di uno o due.
- [ ] **T75** — Click destro su una scheda: Disattiva audio (su YouTube), Chiudi altre schede.
- [ ] **T76** — Un sito che chiede le notifiche o il microfono: dialogo VARCO Blocca / Consenti. **📸**.
- [ ] **T77** — Scarica un file: dialogo VARCO, poi nel pannello Download schede e click destro → Elimina file (con conferma).
- [ ] **T78** — Centro notifiche: numero sul pulsante, filtri, Cancella tutto.
- [ ] **T79** — Cambia scheda tra due siti: la pagina scorre. Spegni l'animazione dalle Impostazioni e riprova.

**Stato:** 103 test superati. Provato nell'app (profilo di prova), con catture dello schermo:
- menu di un link sopra Wikipedia; menu della scheda con 15 voci; Esc chiude;
- dialogo dei permessi come nel mock-up, con "Consenti" + "Ricorda" restituiti al browser;
- download vero: dialogo VARCO → Salva → toast "Download completato";
- pannello Download con le schede (Completati 1, Errori 1);
- centro notifiche con il numero 3, che sparisce aprendolo;
- animazione: pagina da x=246 a x=206 in 7 passi.

Installer controllato: nell'eseguibile il menu dei workspace si apre con le sue voci.

**Non fatto:**
- dal mock-up mancano "Traduci", "Visualizza sorgente", "Apri in finestra privata" e le voci con JARVIS ("Apri in JARVIS", "Genera variante con JARVIS"): richiedono funzioni che il browser non ha ancora;
- "Rinomina workspace" e "Colore workspace" sono nella lista delle tue idee (personalizzazione dei workspace) e arriveranno con quella.

## Prossime
- **0.16:** installer personalizzato come il mock-up.
- **Poi, dalla tua lista:**
  - rinomina e personalizzazione dei workspace;
  - blocco note per progetto;
  - ricarica automatica dell'anteprima;
  - stack compatti;
  - vista divisa.
