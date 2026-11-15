# VARCO — Guida delle beta

Un solo documento per tutte le versioni: la più recente è in cima. Le guide fino alla 0.36 sono nei file `BETA_X_Y_GUIDA.md`.

---

## Beta 0.37 — Rifinitura e velocità

Installer PC: `dist\VARCO Setup 0.37.0.exe`. Il telefono non cambia. Nessuna funzione nuova: VARCO fa le stesse cose con meno fatica.

### Cosa cambia
- **I salvataggi non fermano più VARCO.**
  - Prima, a ogni modifica (una scheda, una pagina caricata, un preferito) VARCO riscriveva tutto il file dei dati, 784 KB, e restava fermo circa 30 ms ogni volta.
  - Ora la scrittura sul disco avviene di lato, mentre VARCO continua a rispondere.
  - Le icone dei siti (erano due terzi del file) stanno in un file loro, `site-icons.json`, che si riscrive solo quando arriva un'icona nuova.
  - Il file dei dati senza icone e senza spazi inutili passa da 784 KB a circa 226 KB.
  - Quando chiudi VARCO, un salvataggio ancora in corso viene completato prima di uscire.
- **Aggiornamenti della barra 7 volte più leggeri.**
  - Ogni volta che cambia qualcosa (titolo, caricamento, scheda), la barra riceve lo stato di VARCO. Prima conteneva anche tutte le icone come immagini intere: 268 KB ogni volta, 3 MB per aprire due pagine.
  - Ora ogni icona viaggia come un indirizzo corto (`varco-icon://…`), la barra la carica una volta e poi la ritrova da sé: 36 KB per aggiornamento.
  - Gli aggiornamenti che arrivano a raffica durante un caricamento vengono raggruppati.
- **Avvio:** il file dei dati si legge una volta sola invece di due.

### Misure (copia dei tuoi dati, prima → dopo)
| | 0.36 | 0.37 |
|---|---|---|
| Peso di un aggiornamento della barra | 268 KB | 36 KB |
| Dati spediti alla barra aprendo due pagine | 3,1 MB | 0,65 MB |
| VARCO fermo per un salvataggio | ~30 ms | ~2 ms |
| Blocco più lungo del processo principale durante i caricamenti | ~100 ms | ~14 ms |
| File dei dati | 784 KB | 226 KB (+ 527 KB di icone, a parte) |
| Finestra pronta dall'avvio | ~1,8 s | ~1,7 s |

L'avvio migliora poco: il tempo va quasi tutto nell'avvio di Electron e nel blocco pubblicità, che deve essere pronto prima della prima pagina.

### Memoria
Il tuo VARCO aperto usava circa 3 GB in 14 processi. Ho guardato da dove arriva:
- Il codice di VARCO nel processo principale occupa circa 14 MB. Il resto del processo principale (170–380 MB) è Chromium stesso, che cresce con le schede e le sessioni separate dei workspace.
- La gran parte dei 3 GB sono le pagine aperte (un processo per sito) e la scheda video.
- Per ridurla davvero servono più schede che dormono: Impostazioni → Schede → "Sospendi le schede non guardate" a 15 minuti invece di 30.
- Il servizio "acquisizione video" che vedevi in Gestione attività lo apre un sito che chiede la lista delle webcam (di solito WhatsApp, Discord o Meet), non VARCO.

### Modalità insegnamento
- `lib/storage.cjs`:
  - `save()` resta sincrono: si usa all'uscita, per l'importazione di un backup e nei test.
  - `saveAsync()` scrive con `fs.promises`; le richieste che arrivano durante una scrittura diventano una sola.
  - Ogni salvataggio ha un numero (`generation`): il controllo e la rinomina del file avvengono nello stesso passo sincrono, così un salvataggio vecchio non sovrascrive mai uno più nuovo.
- `lib/icon-urls.cjs`:
  - trasforma ogni immagine `data:` dello snapshot in `varco-icon://i/<n>`, sempre lo stesso numero per la stessa immagine;
  - risponde solo nella sessione delle cornici (`session.defaultSession`), dove non gira nessun sito.
- `lib/windows.cjs` → `emit()`: il primo aggiornamento parte subito, quelli dei 16 ms seguenti diventano uno solo. `sendUi()` manda prima l'aggiornamento in attesa, così la barra non riceve un comando prima dello stato a cui si riferisce.

### Test da fare
- [ ] **T238** — Installa la 0.37 sopra la 0.36 (o aspetta l'aggiornamento automatico). Si apre con tutte le tue schede, workspace e preferiti. In `%APPDATA%\personal-workspace-browser` compare `site-icons.json`.
- [ ] **T239** — Le icone ci sono tutte: schede in basso, icone dei workspace nella barra laterale, preferiti e siti della Home, pannelli web. Nessuna immagine rotta. **📸**
- [ ] **T240** — Usa VARCO normalmente per qualche minuto: apri e chiudi schede, carica pagine pesanti (YouTube, GitHub), cambia workspace. Non ci sono scatti, e l'indirizzo, il titolo e la rotella di caricamento si aggiornano come prima.
- [ ] **T241** — Aggiungi un preferito e chiudi **subito** VARCO dall'icona nell'area di notifica → Esci. Riaprilo: il preferito c'è.
- [ ] **T242** — Ctrl+T e scrivi subito un indirizzo: la barra degli indirizzi prende il cursore come prima.
- [ ] **T243** — Impostazioni → Dati → Esporta… un backup, poi importa lo stesso backup: VARCO si riavvia con i dati giusti e le icone.

**Stato:**
- 211 test superati (nuovi: `icon-urls`, più casi in `storage`: icone a parte, passaggio dai dati della 0.36, salvataggio asincrono, salvataggio all'uscita durante una scrittura).
- **Provato in VARCO** con una copia dei tuoi dati (senza telefono, JARVIS e programmi automatici):
  - 23 icone nella Home, nelle schede e nella barra laterale, nessuna rotta;
  - aprendo due pagine, nessuna icona richiesta di nuovo;
  - nessun file temporaneo rimasto;
  - le icone passano da sole in `site-icons.json` al primo salvataggio.
- **Non provato:** dall'installer, con il mouse sulla tua finestra vera, l'aggiornamento automatico dalla 0.36.
