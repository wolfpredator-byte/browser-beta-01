# VARCO Beta 0.22 — Preset

Installer: `dist\VARCO Setup 0.22.0.exe`.

I 15 preset con le immagini che hai generato (sfondo, logo, icona), più i preset creati da te.

## Preset pronti (Impostazioni, in cima)
- **16 schede**: VARCO più i 15 della tabella, da Vice City a Minimal Green. Ogni scheda mostra la miniatura dello sfondo, il logo e i due colori.
- Un preset cambia:
  - **colori**: accento e un nuovo **secondo colore**, usato in gradienti e barre di avanzamento (linea di caricamento, download, notifiche);
  - **sfondo**: il suo, nella Home e dietro le barre;
  - **logo**: grande al centro della Home e piccolo nella barra del titolo;
  - **icona della finestra** nella barra delle applicazioni di Windows.
- Scegliendo un preset, il suo sfondo prende il posto dell'immagine che avevi messo per tutti. Gli sfondi messi per un singolo workspace restano.
- I vecchi temi della 0.21 (Oceano, Aurora…) restano come **Tinte**: cambiano solo i colori e tengono lo sfondo che hai.
- **Secondo colore**: come per l'accento, puoi sceglierne uno tuo o tornare a quello del tema.

## Preset per workspace
Sotto le schede: **Preset di «nome del workspace»**. Puoi dare a un workspace un preset pronto o uno tuo, per esempio Cyber Protocol per un progetto e Ember per Gaming. La sua finestra cambia colori, sfondo, logo e icona; gli altri workspace restano come sono.

## I miei preset
- **Salva l'aspetto attuale** con un nome. Il preset ricorda:
  - colori;
  - sfondo, compresa un'immagine tua;
  - opacità delle barre;
  - testo, angoli e densità.
- Pulsanti e riquadri nascosti non fanno parte del preset.
- Per ogni preset:
  - **Usa** lo applica a tutti;
  - **Aggiorna** lo sovrascrive con l'aspetto attuale (anche salvare con lo stesso nome lo aggiorna);
  - **Elimina** chiede conferma. I workspace che lo usavano tornano come gli altri.
- **Esporta…** salva tutti i tuoi preset in un file `.json`, con dentro gli sfondi: puoi portarli su un altro PC. **Importa…** li rilegge, e un preset con lo stesso nome viene sostituito.
- Al massimo 30.

## Modalità insegnamento
- **Asset preparati da uno script:** `scripts/build-presets.cjs` usa Electron, perché `nativeImage` sa ridimensionare senza librerie extra. Prende le tue immagini da `Reference/Da implementare/NN-nome/` e crea `assets/presets/<nome>/`:
  - sfondo da 2560 px;
  - miniatura;
  - logo da 256 e 64 px;
  - icona da 256 px.

  In tutto 5,8 MB invece di circa 40. Se rigeneri un'immagine, rilancialo: `npx electron scripts/build-presets.cjs`.
- **Angoli delle icone:** le icone di Vice City, Neon Pulse, Cyber Protocol, Cyan Flash, Lime ed Ember avevano gli angoli pieni. Lo script ci applica una maschera arrotondata, sfumata sul bordo, così nella barra delle applicazioni non compare un quadrato scuro.
- **Aspetto "efficace":** l'aspetto salvato resta uno solo. Per ogni finestra si calcola quello comune più il preset del workspace (`effectiveAppearance`), e da lì escono colori, sfondo, logo, icona e angoli delle pagine. Un preset eliminato o rinominato non rompe niente: il workspace torna semplicemente come gli altri.

## Test da fare

- [ ] **T121** — Installa la 0.22. Impostazioni → Preset: prova Vice City, poi Cyber Protocol. Cambiano Home, logo piccolo nella barra del titolo e **icona nella barra delle applicazioni**. **📸** della Home.
- [ ] **T122** — Con un preset attivo, apri un menu (tasto destro su una scheda), avvia un download e guarda una notifica: hanno i colori del preset.
- [ ] **T123** — Scegli un **secondo colore** tuo, poi "Usa quello del tema".
- [ ] **T124** — Dai a Destiny Builder un preset diverso da quello di Gaming e apri le due finestre una accanto all'altra: colori, sfondo e icona sono diversi. **📸**
- [ ] **T125** — I miei preset: personalizza qualcosa (anche un'immagine tua come sfondo), salva come «Prova». Cambia preset, poi **Usa** su «Prova»: tutto torna come l'avevi salvato.
- [ ] **T126** — **Esporta…** «Prova», **Elimina** «Prova», poi **Importa…** il file: torna, con il suo sfondo.
- [ ] **T127** — Riavvia VARCO: preset, preset dei workspace e icona restano.

**Stato:** 125 test superati, di cui 3 nuovi sui preset. Tra le cose controllate: ogni preset ha tutti i suoi file, nomi doppi e preset del workspace che non esistono più. Provato nell'app con un profilo di prova:
- Vice City: Home, logo, barra del titolo e icona della finestra;
- salvataggio, aggiornamento con lo stesso nome, Usa ed Elimina;
- preset per workspace, sia pronto sia tuo; un preset che non esiste viene rifiutato;
- esporta e importa con un'immagine tua: lo sfondo era stato cancellato e torna dal file.

**Corretto durante le prove:** con un preset, la riga dello sfondo diceva ancora "Sfondo VARCO".

## Non ancora fatto (dalle idee della 0.22)
Sfondi a gradiente generati, intensità del bagliore e grana, colori presi da un'immagine, font. Il tema chiaro resta da decidere. Se vuoi, possono essere la 0.23.
