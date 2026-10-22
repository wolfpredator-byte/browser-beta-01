# Modalità insegnamento — Browser Beta 0.3

Questa guida accompagna i commenti direttamente nel codice. Le spiegazioni riguardano le parti nuove o modifiche di questa iterazione.

## 1. Architettura: Home e siti come schede
- `tabs`: array che rappresenta **tutte** le schede, indipendentemente dal contenuto.
- `activeId`: identificatore della scheda selezionata; `null` significa nessuna scheda.
- `isHome`: valore booleano. `true` indica la homepage locale; `false` una pagina web.
- `view`: per i siti è una `WebContentsView`; per Home è `null`, dato che Home è disegnata dal renderer locale.
- `newHomeTab()`: crea una scheda Home, la aggiunge a `tabs` e la attiva.
- `show(id)`: rimuove la vista web precedente, poi aggiunge quella della scheda scelta solo se ne possiede una. Se la scheda è Home, il renderer mostra `#dashboard`.
- `persistTabs()`: salva schede e workspace su disco, compreso `isHome`. Senza salvare questa proprietà Home sparirebbe al riavvio.
- `#dashboard[hidden]`: nasconde il DOM della home quando navighi in una scheda web; così non riappare se apri un menu.
- Per cambiare sfondo e stile della Home si modifica `style.css`, **non** il motore di navigazione.

## 2. Dimensioni delle pagine
In `main.cjs`:
- `HEADER = 64` pixel: altezza della barra indirizzi; se passi a 80 la pagina parte 16 pixel più sotto. Modifica anche il CSS per restare sincronizzato.
- `FOOTER = 43` pixel: altezza delle schede inferiori; se passi a 50, la pagina perde 7 pixel in basso.
- `downloadsOpen ? 340 : 0`: se il pannello download è aperto, sottrae 340 pixel alla larghezza disponibile al sito. Non cambia l'altezza.
- Il menu delle schede usa il menu nativo di Windows e **non** deve cambiare le dimensioni della pagina.

## 3. Click destro → Salva immagine
Il listener `context-menu` è collegato al `webContents` della singola scheda.
- `params.mediaType === 'image'`: mostra la voce specifica solo se il clic è su un'immagine.
- `params.srcURL`: URL dell'immagine effettiva (può differire dall'URL della pagina).
- `isWebUrl`: accetta solo `http:` e `https:` per questa funzione.
- `downloadURL(params.srcURL)`: avvia una richiesta di download; **non** cambia la scheda corrente.
- Limite: immagini `blob:` / `data:`, risorse che richiedono header particolari e protezioni anti-download possono richiedere una gestione separata. Non aggiriamo tali protezioni.

## 4. Download e destinazione
`session.on('will-download')` riceve gli scaricamenti del profilo locale.
- `item.pause()`: tenta di fermare il trasferimento finché non decidi che fare.
- `dialog.showMessageBox`: presenta Salva / Salva in… / Annulla. `defaultId:0` seleziona Salva per impostazione iniziale; `cancelId:2` associa il tasto Esc a Annulla.
- **Salva** usa la cartella Download di Windows. In presenza di un file omonimo suggerisce un nome numerato.
- **Salva in…** apre il selettore nativo con `dialog.showSaveDialog`.
- **Annulla** invoca `item.cancel()`; nessun file dovrebbe essere salvato.
- `item.setSavePath(destination)` sceglie il percorso e `item.resume()` riprende lo scaricamento.
- `updated` aggiorna il progresso; `done` registra il risultato.

> Non considerare le credenziali importanti o i download rischiosi sicuri solo perché esiste una finestra di conferma. Il browser è sperimentale.

## 5. Come eseguire i test
```powershell
git fetch origin
git switch beta-0.3-browser-experience
git pull origin beta-0.3-browser-experience
npm run check
npm start
```
1. Apri Home: deve esistere la scheda Home in basso.
2. Apri Google o YouTube: Home non deve restare visibile sotto il sito.
3. Clicca `⋯`: il sito non deve rimpicciolirsi.
4. Clicca col destro su una normale immagine HTTPS: scegli **Salva immagine con nome…**.
5. Verifica **Salva**, **Salva in…**, **Annulla**, e la barra di progresso.
6. Chiudi e riavvia l'app; controlla che la scheda Home e le schede web vengano ripristinate.

### Stato
Le modifiche sono state pubblicate nel branch di sviluppo e non sono ancora state convalidate sul computer Windows dell'utente. Non unire su `main` finché non passano i test.
