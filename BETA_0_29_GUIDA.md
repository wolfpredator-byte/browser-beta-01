# VARCO Beta 0.29 — Il resto dei preset: tema chiaro, sfondi generati, bagliore, grana, carattere, colori dall'immagine

Installer: `dist\VARCO Setup 0.29.0.exe`.

## Tema chiaro
- **Impostazioni → Tema e colori → Tema: Chiaro.** Barre, Home, Impostazioni, menu, dialoghi e notifiche diventano chiari. Lo sfondo prende una punta del tuo colore d'accento.
- Funziona con tutti i preset e le tinte. Se usi uno sfondo a immagine, nel tema chiaro resta più luminoso.
- Si salva nei tuoi preset, quindi puoi avere un workspace chiaro e uno scuro.

## Sfondi generati
- **Impostazioni → Sfondo → Sfondi generati:** quattro sfondi disegnati con i colori del tuo tema, senza immagini:
  - **Aurora:** bande di luce in alto;
  - **Mesh:** quattro macchie di colore negli angoli;
  - **Alba:** una luce che sale dal basso;
  - **Nebula:** due nuvole di colore al centro.
- Le anteprime usano i tuoi colori attuali. Se cambi colore d'accento, lo sfondo cambia insieme.
- Sfocatura e luminosità valgono anche per questi sfondi.

## Bagliore e grana
- **Bagliore** (Tema e colori): quanto brillano i bordi e le ombre colorate, per esempio il contorno della pagina attiva in vista divisa e le schede scelte. 0% spento, 100% il doppio di oggi.
- **Grana** (Sfondo): un velo di rumore leggero sopra l'interfaccia, effetto pellicola. 0% spenta (di serie).

## Colori presi da un'immagine
- **Tema e colori → Prendi i colori dallo sfondo:** VARCO guarda lo sfondo in uso e ne prende i due colori più vivi, come colore d'accento e secondo colore.
- Se lo sfondo non è un'immagine (generato o nessuno), ti chiede di scegliere un'immagine.
- I colori presi finiscono nei campi "Colore d'accento" e "Secondo colore": puoi ritoccarli o tornare a quelli del tema.

## Carattere
- **Interfaccia → Carattere:** Segoe UI (predefinito), Bahnschrift (squadrato), Corbel (morbido), Candara (umanista), Cascadia (tecnico), Georgia (classico).
- Sono tutti caratteri già presenti in Windows: niente da scaricare. Valgono anche per menu e notifiche.

## Modalità insegnamento
- **Un "inchiostro" invece del bianco:** l'interfaccia era scritta per il buio, con un centinaio di bianchi trasparenti (bordi, sfondi dei pulsanti, testi grigi). Uno script li ha trasformati in `rgba(var(--v-ink-rgb), …)`: nel tema scuro l'inchiostro è bianco, quindi tutto resta identico; nel tema chiaro è quasi nero. Allo stesso modo gli sfondi neri trasparenti dei campi usano `--v-field-rgb`.
- **Menu e notifiche** sono pagine a parte: ricevono `--v-mode` e le loro varianti chiare si attivano con una container query sullo stile (`@container style(--v-mode: chiaro)`).
- **Colori da un'immagine:** l'immagine si rimpicciolisce a 64 px di larghezza; i pixel vivi (abbastanza saturi e luminosi) si raggruppano per tinta, pesati per vivacità. Il gruppo più pesante dà il colore d'accento, il primo con una tinta lontana almeno 45° il secondo colore. Se sono scuri si schiariscono moltiplicando i canali, così la tinta non sbiadisce.
- **Bagliore:** le ombre colorate moltiplicano la loro opacità per `--v-glow` con `calc()`.

## Test da fare
- [ ] **T175** — Tema → Chiaro. Guarda Home, Impostazioni, un menu (tasto destro su una scheda) e una notifica. Torna a Scuro: tutto come prima. **📸**
- [ ] **T176** — Sfondo → prova Aurora, Mesh, Alba e Nebula. Cambia colore d'accento: lo sfondo segue. **📸**
- [ ] **T177** — Bagliore a 100%, poi a 0%: in vista divisa il contorno della pagina attiva brilla di più o sparisce. Grana a 60%.
- [ ] **T178** — Metti un'immagine come sfondo, poi "Prendi i colori dallo sfondo": i due colori vengono dall'immagine.
- [ ] **T179** — Carattere → Bahnschrift, poi Georgia: cambia tutta l'interfaccia, compresi i menu.
- [ ] **T180** — Salva un preset in tema chiaro con Bahnschrift, assegnalo a un workspace: passando a quel workspace cambia tutto, tornando agli altri torna scuro.

**Stato:** 157 test superati (2 nuovi sulle regole dell'aspetto). Provato nell'app con il profilo di prova:
- tema chiaro su Impostazioni, Home e menu contestuale;
- sfondi Aurora e Mesh, anteprime dei quattro sfondi;
- carattere Bahnschrift nella cornice;
- colori dallo sfondo VARCO: `#4c51d7` e `#bf76d7`.
- Da guardare con calma nel tema chiaro: i pannelli laterali meno usati (Progetto, File, Note, JARVIS) e la pagina delle impostazioni del sito. Lì potrebbe essere rimasto qualche colore pensato per il buio.
