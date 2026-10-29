# VARCO Beta 0.21 — Personalizzazione, più "Apri con → VARCO"

Installer: `dist\VARCO Setup 0.21.0.exe`.

Contiene le due correzioni che hai segnalato sulla 0.20 e la personalizzazione.

## Correzioni della 0.20
1. **VARCO in "Apri con"**: nel menu "Apri con" di Esplora file compare VARCO per tutti i file che il visualizzatore sa mostrare: XML, PDF, immagini, video, codice, modelli 3D, ZIP… (129 tipi).
2. **App predefinite → VARCO**: sotto HTTP e HTTPS ora c'è l'elenco dei tipi di file. Lì puoi scegliere VARCO come programma predefinito, tipo per tipo.
   - VARCO **non** diventa predefinito da solo per nessun file: si offre come scelta, decidi tu.
   - Programmi e script (`.exe`, `.bat`, `.ps1`…) sono esclusi.
   - Impostazioni → **Browser e file** → "Apri le App predefinite di Windows" porta direttamente a quella pagina.
   - La registrazione la fa VARCO installato all'avvio: basta installare la 0.21 e aprirlo una volta (dopo circa 8 secondi).
   - La disinstallazione toglie tutto.

## Personalizzazione (Impostazioni, in cima)
- **Tema e colori**
  - 8 temi pronti: VARCO, Oceano, Aurora, Smeraldo, Tramonto, Cremisi, Sakura, Grafite.
  - Un **colore d'accento** a scelta libera.
  - **Opacità delle barre**: più bassa = barre più trasparenti.
  - I colori valgono anche per menu, dialoghi e notifiche.
- **Sfondo**
  - Per **tutti i workspace**: un'immagine tua, lo sfondo VARCO o nessuno (tinta unita).
  - **Solo per il workspace attivo**: per esempio uno sfondo di Destiny per Destiny Builder.
  - **Sfocatura** e **luminosità** regolabili.
  - Lo sfondo scelto compare anche nella Home.
  - L'immagine viene copiata nella cartella dei dati: puoi spostare l'originale.
- **Interfaccia**
  - **Densità**: compatta, normale o ariosa.
  - **Dimensione del testo**: 85–130%.
  - **Angoli delle pagine**: da 0 a 20 px.
  - **Pulsanti**: puoi nascondere quelli della barra laterale (Preferiti, Giochi, JARVIS, Note…) e delle barre (stella, palette, download, zen, **orologio**…). Restano raggiungibili da F1 e dalle scorciatoie.
- **Home**
  - Togli i riquadri che non usi: logo, ricerca, progetti, cartelle, JARVIS, pannello del workspace. Quelli che restano si allargano.
  - Nuovo riquadro **Link rapidi**, diverso per ogni workspace: scrivi un sito e premi **Aggiungi**; la × lo toglie.
- **Ripristina l'aspetto predefinito** in fondo alla sezione Home: chiede conferma, e gli sfondi dei workspace restano.

Le scelte si vedono subito, anche mentre trascini un cursore.

## Modalità insegnamento
- **Perché VARCO non si imposta da solo come predefinito:** da Windows 10 un programma non può più farlo, per evitare che le app si rubino i tipi di file. Si può solo *candidare*. Lo fa scrivendo nel registro (solo per il tuo utente):
  - `OpenWithProgids` per ogni estensione, che lo fa comparire in "Apri con";
  - `Capabilities\FileAssociations`, che riempie la pagina App predefinite.
- **Un solo processo:** le voci per 129 estensioni vanno in un file `.reg` importato una volta (`reg import`), non con centinaia di comandi.
- **Colori come variabili CSS:** il viola fisso è diventato `var(--v-accent)`. Il processo principale calcola le variabili dal tema e la cornice le applica. Per menu e notifiche (pagine separate) le inietta con `insertCSS`.

## Test da fare

- [ ] **T114** — Installa la 0.21 e apri VARCO, poi chiudilo dopo una decina di secondi. In Esplora file, tasto destro su `AndroidManifest.xml` (o un PDF) → **Apri con** → c'è **VARCO**. Aprilo: il file si apre nel visualizzatore. **📸**
- [ ] **T115** — Impostazioni → Browser e file → **Apri le App predefinite di Windows**: sotto HTTPS compare l'elenco dei tipi di file. **📸**
- [ ] **T116** — Impostazioni → Tema: prova Oceano e Tramonto, poi un colore tuo. Cambiano anche un menu (tasto destro su una scheda) e una notifica.
- [ ] **T117** — Sfondo → Immagine… per tutti; poi, in Destiny Builder, Immagine… solo per lui. Passando da un workspace all'altro lo sfondo cambia. Muovi sfocatura e luminosità. **📸**
- [ ] **T118** — Interfaccia: densità compatta, testo 115%, angoli 0, nascondi Note e Orologio.
- [ ] **T119** — Home: aggiungi 2–3 link rapidi, togli il riquadro "Cartelle di Windows". **📸** della Home.
- [ ] **T120** — Riavvia VARCO: tutto resta com'era. Poi "Ripristina l'aspetto predefinito".

**Stato:** 122 test superati, di cui 7 nuovi su tipi di file e aspetto. Provato:
- **registro:** con l'eseguibile impacchettato in modalità di prova (sotto una chiave separata) scrive 129 tipi, `.xml` compreso, con il comando giusto; la disinstallazione li toglie e lascia intatti gli altri programmi;
- **app (profilo di prova):** temi, opacità, link rapidi (un indirizzo non valido viene rifiutato), Note nascosta, riquadro tolto, sfondo solo per un workspace (gli altri restano col loro), ripristino.

**Corretto durante le prove:**
- la Home mostrava sempre lo sfondo VARCO, anche con un'immagine scelta;
- togliendo un riquadro restava un buco.

## Prossime
Dalla tua lista non resta nulla in sospeso: dimmi tu cosa viene dopo.
