# VARCO Beta 0.13 — Nuova identità

Installer: `dist\VARCO Setup 0.13.0.exe`.

Il browser si chiama **VARCO**: *Your space. Beyond the web.* Grafica e icone vengono dalla cartella `Reference` (mock-up e VARCO Icon System v1), con le tue scelte:
- tutto come nel mock-up, ma **senza i riquadri delle app** (YouTube, Twitch…) e con le **schede in basso**;
- lo sfondo della Home arriverà con la tua immagine;
- l'installer personalizzato è in una versione dedicata;
- al centro della Home c'è il logo, che diventa la sfera quando JARVIS è collegato.

## Cosa cambia

1. **Nome e icone di sistema:**
   - finestre, barra delle applicazioni, menu Start, area di notifica, installer e collegamenti si chiamano VARCO;
   - l'icona del programma è il portale viola-vetro (`.ico` multi-dimensione); quella dell'area di notifica è la versione con bordo scuro.
2. **Icone dell'interfaccia:** tutti i caratteri Unicode (◈ ⌂ ☆ ⛉ ⌘ …) sono sostituiti dalle 43 icone SVG del set.
   - Sono usate come *maschera CSS*, quindi prendono il colore del testo: bianche normalmente, viola dove sono in evidenza, gialle nell'avviso http.
   - Le icone predefinite dei workspace: Personale (casa), Gaming, progetto (per i workspace con una cartella), le altre.
3. **Tema vetro scuro con accento viola** su barra del titolo, barra degli indirizzi a pillola (con scudo e stella dentro, come nel mock-up), barra laterale, schede, pannelli, palette, Impostazioni e pagina di errore.
4. **Nuova Home:**
   - logo VARCO con il motto e la barra di ricerca a pillola;
   - tre riquadri:
     - **Progetti**: i workspace con una cartella collegata (oppure tutti), con il pulsante per aprirli in una nuova finestra;
     - **Accesso rapido**: Download, Documenti, Immagini, Desktop;
     - **JARVIS**: spento, in attesa o "Pronto ad aiutarti.", con il pulsante "Apri JARVIS";
   - sotto, il riquadro del workspace attivo, con cartella, risorse, disposizione e preferiti come prima.
   - **Logo → sfera:** quando JARVIS è collegato, al posto del logo compare la sfera animata (ora viola-vetro), che segue i suoi stati idle, pensa e parla.
5. **Schermata di caricamento** all'avvio: logo, motto e barra animata.
   - Le finestre nascono nascoste e compaiono quando sono pronte, così non si vede mai una finestra vuota.
   - Resta almeno 0,6 secondi (niente lampi) e al massimo 8.
   - Non compare all'avvio con Windows, perché in quel caso non si apre nessuna finestra.

## Sfondo della Home
Metti la tua immagine in `assets\home-bg.jpg` (meglio 2560×1440 o più): viene usata da sola, con una sfumatura scura in basso perché i riquadri restino leggibili. Finché non c'è, si vede il cielo stellato disegnato in CSS. Mandamela e la inserisco io, ottimizzata.

## I tuoi dati
- La cartella dei dati resta `%APPDATA%\personal-workspace-browser`: workspace, schede, preferiti, giochi e impostazioni ci sono tutti.
- L'identità per Windows (`appId`) non cambia, quindi l'installer VARCO dovrebbe sostituire "Personal Browser" invece di installarsi accanto.
  - Non l'ho provato sul tuo PC per non toccare l'installazione che usi.
  - Se dopo l'installazione vedi ancora "Personal Browser" tra le app, disinstallalo: i dati restano.
- **JARVIS:** il server MCP ora si presenta come `varco`; url e token non cambiano. Se in un client hai incollato la configurazione con il nome `personal-browser`, funziona lo stesso.

## Test da fare

- [ ] **T62** — Installa `VARCO Setup 0.13.0.exe`: icona VARCO nel menu Start, sulla barra delle applicazioni e nell'area di notifica. "Personal Browser" non c'è più tra le app (o disinstallalo). **📸** di menu Start o barra.
- [ ] **T63** — All'avvio compare la schermata di caricamento, poi le finestre. **📸** se riesci.
- [ ] **T64** — Home: logo, VARCO, ricerca, Progetti / Accesso rapido / JARVIS. Clic su "Download" in Accesso rapido apre la cartella. **📸** della Home.
- [ ] **T65** — Avvia JARVIS: al posto del logo compare la sfera viola, il riquadro dice "Pronto ad aiutarti.".
- [ ] **T66** — Giro generale: icone di barra laterale, schede, scudo, palette (F1), Impostazioni, pagina di errore. Segnalami le icone che a 16 px non si leggono bene.

**Stato:** 103 test superati. Provato nell'app (profilo di prova):
- Home completa;
- sfera al posto del logo con un client MCP collegato ("Pronto ad aiutarti. Collegato: JARVIS");
- schermata di caricamento, chiusa da sola quando le 4 finestre erano pronte;
- `VARCO.exe` impacchettato con icone e logo caricati.

**Corretti durante le prove:**
- la ricerca della Home finiva sotto i riquadri;
- in alto nella barra laterale si vedeva l'etichetta "W" tagliata.

**Prossime:**
- 0.14: installer personalizzato come il mock-up;
- dopo: personalizzazione dei workspace, blocco note per progetto, ricarica automatica dell'anteprima, stack compatti, vista divisa.
