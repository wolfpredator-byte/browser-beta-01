# VARCO Beta 0.20 — Visualizzatore di file

Installer: `dist\VARCO Setup 0.20.0.exe`. Contiene anche la 0.18.2 e la 0.19 (vedi le loro guide).

Dalla tua lista: VARCO apre "praticamente tutti i tipi di file", così diventa un visualizzatore per ogni progetto. Prossima: 0.21 personalizzazione.

## Come si apre un file
- **Ctrl+O** (o "Apri un file…" nella palette): uno o più file da Esplora file.
- **Trascina** un file sulla finestra, anche sopra un sito.
- **Barra degli indirizzi**: scrivi o incolla un percorso (`C:\…\file.pdf`) e premi Invio.
- **Pannello File** (nuova icona a cartella nella barra laterale): l'albero della cartella collegata al workspace.
  - Le cartelle si aprono con un clic.
  - Quelle pesanti (`node_modules`, `.git`, `Library`…) sono attenuate.
  - Un clic su un file lo apre in una scheda.
- **Download**: nel menu di un download c'è **"Apri in VARCO"**.
- **Da Windows**: "Apri con → VARCO", oppure trascina il file sull'icona di VARCO.

Ogni file si apre in una scheda normale: si salva, torna al riavvio e funziona in vista divisa. Se il file è già aperto, VARCO passa alla sua scheda. In alto trovi nome, dimensione, data e cartella, più **"Apri con il programma predefinito"** e **"Mostra nella cartella"**.

## Cosa sa mostrare
| Tipo | Come |
|---|---|
| Codice (JS/TS, C#, Python, C/C++, Rust, Go, shader, …) e testo | colori della sintassi, numeri di riga, "A capo", "Copia tutto" (oltre 3 MB, i primi 3 MB) |
| JSON | formattato e colorato |
| Markdown | impaginato, con le immagini della sua cartella; "Testo" per il sorgente |
| CSV / TSV | tabella (riconosce `,` o `;`), fino a 5000 righe |
| Immagini (PNG, JPG, GIF, WebP, SVG, AVIF, ICO…) | adattate alla finestra; clic per la dimensione reale |
| Video e audio (MP4, WebM, MOV, MP3, WAV, FLAC…) | lettore con avanzamento |
| PDF | lettore PDF di Chromium (pagine, zoom, stampa) |
| Word (.docx) | anteprima impaginata in sola lettura |
| Excel (.xlsx, .xls, .ods) | tabella con una linguetta per foglio |
| PowerPoint (.pptx) | anteprima semplificata: titolo, testi e immagini di ogni diapositiva |
| Modelli 3D (GLB, GLTF, OBJ, FBX) | da ruotare col mouse; conta mesh e triangoli |
| ZIP (anche .jar, .apk, .vsix, .nupkg) | elenco dei file, anteprima dei testi e delle immagini |
| Font (TTF, OTF, WOFF) | frasi di prova in varie misure |
| Tutto il resto | i primi byte in esadecimale, più "Apri con il programma predefinito" |

## Modalità insegnamento
- **Un protocollo tutto suo:** i file passano da `varco-view://app/…`, non da `file://`, che darebbe a una pagina l'accesso a tutto il disco.
- **Cosa può leggere il visualizzatore:** solo i file che hai aperto tu, la loro cartella (per le immagini del Markdown o le texture dei GLTF) e le cartelle dei progetti. Mai un intero disco né l'intera cartella utente.
- **I siti non possono leggere i tuoi file:** un sito che prova a leggere `varco-view://` viene rifiutato, perché le richieste valgono solo dal visualizzatore stesso.
- **Le pagine HTML locali vengono mostrate come codice**, non eseguite.
- **Il visualizzatore non carica nulla da internet:** le librerie (three.js per il 3D, highlight.js, marked, SheetJS, mammoth) sono copiate nella cartella `viewer/vendor` da `npm start` / `npm run setup`, e si caricano solo quando servono.

## Test da fare

- [ ] **T105** — **Ctrl+O** → un `.cs` o `.js` di un tuo progetto: colori, numeri di riga, "A capo". **📸**
- [ ] **T106** — Destiny Builder → icona **File** nella barra laterale: l'albero del progetto. Apri un `README.md` e un'immagine.
- [ ] **T107** — Un **PDF** e un **video** (es. `Portfolio\video\…mp4`): il PDF si sfoglia, il video si può mandare avanti.
- [ ] **T108** — Un **.docx** e un **.xlsx** (cambia foglio dalle linguette).
- [ ] **T109** — Un **modello 3D** (es. il `.glb` del Khvostov): ruota, zoom. **📸**
- [ ] **T110** — Un **.zip**: clic su un file di testo, poi su un'immagine all'interno.
- [ ] **T111** — Trascina un file da Esplora file sopra un sito aperto: si apre in una nuova scheda, il sito resta com'è.
- [ ] **T112** — Scrivi un percorso nella barra degli indirizzi e premi Invio. Poi **"Mostra nella cartella"**: si apre Esplora file sul file.
- [ ] **T113** — Riavvia VARCO: le schede dei file tornano e si riaprono.

**Stato:** 115 test superati. Provato nell'app (profilo di prova), con catture:
- Markdown, CSV con `;` e virgolette, JSON, codice (119 righe colorate), PNG 1280×800;
- Excel con 2 fogli, Word, ZIP con anteprima;
- OBJ (12 triangoli) e il GLB del Khvostov (8 mesh, 25.995 triangoli);
- PDF nel lettore di Chromium, MP4 (durata letta, avanzamento attivo);
- un sito (ilmeteo.it) che prova a leggere un file aperto viene bloccato, mentre il visualizzatore lo legge;
- dopo il riavvio la scheda del CSV torna e mostra di nuovo la tabella.

## Limiti noti
- PowerPoint: solo testi e immagini, senza l'impaginazione originale.
- Word: niente intestazioni, piè di pagina né layout complessi.
- GLB compressi con Draco: non supportati (appare il messaggio).
- Video in formati che Chromium non conosce (es. alcuni MKV/AVI): usa "Apri con il programma predefinito".

## Prossima
- **0.21 — Personalizzazione:**
  - colori e temi: accento, temi pronti, trasparenza del vetro;
  - sfondi: immagini tue, anche diverse per workspace, con sfocatura e luminosità;
  - Home su misura: scegli e aggiungi le schede;
  - interfaccia: densità, dimensione del testo, pulsanti delle barre, raggio degli angoli.
