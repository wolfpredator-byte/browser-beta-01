# VARCO Beta 0.19 — Orologio, modalità zen, ambiente di lavoro

Installer: `dist\VARCO Setup 0.19.0.exe`. Contiene anche la 0.18.2 (barra laterale per finestra, vedi la guida 0.18).

Dalla tua nuova lista. Le prossime: 0.20 visualizzatore di file, 0.21 personalizzazione.

## Cosa cambia

1. **Orologio in basso a destra**: ora e data ("23:42 · gio 29 ott"); passandoci sopra, la data completa. Si aggiorna allo scoccare del minuto.
2. **Modalità zen** — **F11**, il pulsante accanto all'orologio, oppure "zen" nella palette:
   - la finestra va a schermo intero e il sito occupa tutto, senza barra del titolo, barra in alto, barra laterale né schede;
   - **niente notifiche**: i toast non compaiono (finiscono comunque nel centro notifiche), i siti non possono mandare notifiche, l'area di notifica tace;
   - le richieste di permesso compaiono lo stesso, perché aspettano una tua risposta;
   - **F11** per uscire; all'uscita un toast ti ricorda che le notifiche arrivate intanto sono nel centro notifiche;
   - funziona anche con la vista divisa.
3. **Ambiente di lavoro** (pannello **Progetto**, prima sezione): il companion dei giochi al contrario. Scegli i programmi che usi per il progetto.
   - **＋ Programma…**: scegli un `.exe`, un collegamento `.lnk` o uno script `.bat`/`.cmd`.
   - **Trovati sul PC**: VARCO riconosce da solo **VS Code, Visual Studio, Unity Hub**, Cursor e Blender, e li aggiunge con un clic. Sul tuo PC ha trovato VS Code, Unity Hub e Visual Studio.
   - **"Apri la cartella del progetto"**: per gli editor, il programma si apre già sul progetto. Vale per VS Code, Visual Studio e simili; è attiva da sola per gli editor riconosciuti.
   - **▶ Inizia a lavorare** avvia tutti i programmi; c'è anche nella palette ("inizia a lavorare").
   - **"Avvia da solo quando apro il workspace"**: aprendo il workspace (o passando a lui) i programmi partono da soli, **una volta per sessione** del browser, non a ogni cambio di scheda.
   - I programmi restano aperti anche se chiudi VARCO.
   - Funziona anche nei workspace senza cartella progetto (per esempio Gaming con Discord o OBS).

## Modalità insegnamento
- **Zen:** la pagina usa le stesse misure del "video a schermo intero" (`pageBounds` con `fullscreen`), ma con un interruttore separato (`w.zen`). Così uscendo da un video si resta in zen.
- **Notifiche dei siti in zen:** durante la zen il controllo dei permessi risponde "negato" alle notifiche, quindi Chromium non le mostra.
- **Sicurezza dell'ambiente di lavoro:** i programmi li sceglie solo tu, da Esplora file o dai suggeriti. Nessun sito e nessun comando di JARVIS può aggiungerli. Si avviano senza passare per la riga di comando, con la sola cartella del progetto come argomento.

## Test da fare

- [ ] **T101** — L'orologio in basso a destra mostra ora e data.
- [ ] **T102** — **F11** su un sito: schermo intero, nessuna barra. Fatti arrivare una notifica (es. un download): niente toast. F11 per uscire: è nel centro notifiche. **📸** della zen.
- [ ] **T103** — Destiny Builder → Progetto → Trovati sul PC → **＋ VS Code** (e/o Visual Studio) → **▶ Inizia a lavorare**: VS Code si apre sulla cartella del progetto. **📸** del pannello.
- [ ] **T104** — Spunta "Avvia da solo quando apro il workspace", chiudi e riapri VARCO (o apri il workspace): i programmi partono da soli, una volta sola.

**Stato:** 109 test superati. Provato nell'app (profilo di prova), con catture dello schermo:
- orologio "23:42 · gio 29 ott";
- ambiente di lavoro con uno script di prova: parte con la cartella del progetto come argomento, con il toast «Ambiente di lavoro avviato»;
- riconosciuti VS Code, Unity Hub e Visual Studio sul tuo PC;
- zen: pagina 1920×1080 senza barre; un toast di prova non compare; all'uscita la finestra torna com'era.

**Corretto durante le prove:** con molte schede aperte, la data dell'orologio andava a capo.

## Prossime
- **0.20 — Visualizzatore di file:**
  - codice e testo con i colori della sintassi;
  - Markdown impaginato e CSV come tabella;
  - immagini, video e audio;
  - PDF;
  - Word, Excel e PowerPoint in lettura;
  - modelli 3D (GLB/GLTF/OBJ/FBX) e archivi ZIP.
- **0.21 — Personalizzazione:** colori e temi, sfondi (anche per workspace), Home su misura, densità e barre.
