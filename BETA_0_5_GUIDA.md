# Browser Beta 0.5 — Architettura

**Branch:** `beta-0.5-architettura` (non unito a `main`).
Prima versione della roadmap: fondamenta per gaming companion, progetti e JARVIS.

## Cosa cambia per te

1. **Più finestre.** Click destro su un workspace → **Apri in una nuova finestra**, oppure dal selettore in basso a sinistra. Ogni finestra mostra un workspace; puoi metterle sui tuoi 3 monitor. Al riavvio si riaprono tutte nella stessa posizione. Se un monitor è scollegato, la finestra torna su quello principale.
2. **Un workspace sta in una sola finestra.** Se lo selezioni mentre è già aperto altrove, il browser porta in primo piano quella finestra. Nella sidebar lo riconosci dall'icona attenuata e dalla freccia `↗`.
3. **Schede dormienti.** All'avvio si carica solo la scheda che stai guardando; le altre si caricano quando le apri. Chiudendo una finestra, le sue pagine vengono chiuse (niente RAM usata) ma restano nella sessione.
4. **Login con popup.** "Accedi con Bungie/Google" apre una vera finestra di login collegata alla pagina (`window.opener`), invece di una scheda che non riusciva a completare l'accesso.
5. **Schermo intero** per i video (YouTube, Twitch) e pulsanti **Copia** dei siti ora funzionano. Webcam, microfono, posizione e notifiche restano negati.
6. **Strumenti per sviluppatori:** `F12` o `Ctrl+Shift+I` sulla scheda attiva, in una finestra separata. Sulla Home aprono quelli della cornice. Click destro su una pagina → **Ispeziona elemento**.
7. **Scorciatoie:** `Ctrl+T` nuova scheda, `Ctrl+W` chiudi, `Ctrl+L` barra indirizzi, `F5`/`Ctrl+R` ricarica, `Alt+←/→` indietro/avanti, `Ctrl+Shift+T` riapri.
8. **`localhost:5173`** (senza `http://`) apre il dev server in `http`, non più in `https`.
9. **User agent "pulito":** i siti vedono un normale Chrome, non "Electron". Aiuta con i login Google.

## Modalità insegnamento: com'è organizzato il codice

`main.cjs` ora contiene solo l'avvio e i collegamenti. Tutto il resto è in `lib/`:

| File | Electron? | Cosa fa |
|---|---|---|
| `command-bus.cjs` | no | **Bus dei comandi.** Ogni azione ha nome, schema dei parametri e funzione. |
| `commands.cjs` | sì | L'elenco dei comandi (il vecchio grande `switch`). |
| `windows.cjs` | sì | Finestre multiple, posizione della pagina, invio dello stato alla cornice. |
| `tabs.cjs` | sì | Schede, workspace, stack, popup, schede dormienti. |
| `web-session.cjs` | sì | Permessi, user agent, download. |
| `menus.cjs` | sì | Menu nativi (scheda, workspace). |
| `state.cjs` | no | Stato condiviso + salvataggio ritardato. |
| `storage.cjs` | no | `browser-data.json`: salvataggio atomico, backup, migrazioni. |
| `web-rules.cjs` | no | Regole su URL, popup, permessi, user agent. |
| `window-rules.cjs` | no | Spazio della pagina, monitor visibili, scorciatoie. |
| `tab-advanced.cjs`, `tab-lifecycle.cjs` | no | Regole delle schede (dalla 0.4). |

I file "no Electron" sono testati in `test/` con `node --test`.

### Il bus dei comandi (`command-bus.cjs`)

```js
bus.register('closeTab',{args:{id:'int'},description:'Chiude una scheda.',run:(ctx,{id})=>...});
await bus.dispatch('closeTab',{id:4},{window:w,source:'ui'}); // → {ok:true,result} o {ok:false,error}
```

- **Schema:** `'int'`, `'string'`, `'bool'`; con `?` finale il campo è facoltativo (`'string?'`); un array (`['compact','hidden']`) ammette solo quei valori. I campi non dichiarati vengono **scartati**.
- **`dispatch` non lancia mai eccezioni**: un comando rotto non blocca la cornice.
- **`ctx.window`** dice da quale finestra arriva il comando. Se manca (es. JARVIS), si usa la finestra in primo piano.
- **`bus.list()`** restituisce nomi, parametri e descrizioni: nella 0.9 diventerà l'elenco degli strumenti MCP per JARVIS.

Oggi chiamano il bus: la cornice (`browserAPI.action`), le scorciatoie (`shortcutCommand` in `window-rules.cjs`) e i menu nativi (`run(...)` in `menus.cjs`). Il rilevatore di giochi (0.6) e JARVIS (0.9) useranno lo stesso ingresso.

### Una finestra (`windows.cjs`)

Ogni finestra è un oggetto `{win, workspace, activeId, attached, sidePanelOpen, downloadsOpen, fullscreen}`:
- `attached` è la `WebContentsView` visibile in quel momento (al massimo una).
- `pageBounds()` in `window-rules.cjs` calcola lo spazio: `HEADER=94`, `FOOTER=43`, sidebar 0/62/198, pannelli 300/340. **Se cambi questi numeri, cambia anche `style.css`.**
- `openWindows` in `browser-data.json` ricorda workspace, posizione e "massimizzata". `isVisibleOnScreens()` richiede almeno 100×50px visibili su un monitor, altrimenti ignora la posizione.

### Schede dormienti (`tabs.cjs`)

Una scheda con `view:null` e `isHome:false` è dormiente. `ensureView(t)` crea la pagina solo quando serve (`show`, `navigate`). Tutti i listener della pagina (titolo, cronologia, popup, fullscreen, menu) sono in `ensureView`, quindi valgono sia per le schede nuove sia per quelle ripristinate.

### Popup (`popupAction` in `web-rules.cjs`)

| Richiesta | Risultato |
|---|---|
| `window.open(url,'',"width=…")` (login) | finestra popup vera, stessa sessione dei cookie |
| link `target=_blank`, Ctrl+clic | nuova scheda nello stesso workspace |
| indirizzi non web (`file:`, `javascript:`) | negato |

### Salvataggio (`storage.cjs` + `state.cjs`)

- `save()` scrive su `.tmp` e lo rinomina; il file precedente diventa `.bak`. Se entrambi sono illeggibili, il file rovinato viene rinominato `browser-data.corrupt-<numero>.json` e non cancellato.
- `saveSoon()` raggruppa i salvataggi in 400ms: un caricamento di pagina genera molti eventi (titolo, URL) ma una sola scrittura. All'uscita `flushSave()` scrive quello che manca.

## Prova su Windows

```powershell
git switch beta-0.5-architettura
npm run check
npm start
```

Verifica:
- [ ] Le schede e i workspace della 0.4.1 ci sono ancora (migrazione automatica).
- [ ] Click destro su un workspace → **Apri in una nuova finestra**; spostala su un altro monitor.
- [ ] Selezionare in una finestra un workspace aperto nell'altra porta in primo piano l'altra.
- [ ] Chiudi il browser con 2–3 finestre aperte e riaprilo: tornano tutte, sugli stessi monitor.
- [ ] Un video YouTube va a schermo intero ed `Esc` torna alla finestra normale.
- [ ] `F12` apre i DevTools in una finestra separata.
- [ ] Un login "Accedi con…" in popup si completa (es. DIM con Bungie).
- [ ] `Ctrl+T`, `Ctrl+W`, `Ctrl+L`, `Alt+←` funzionano anche con il focus dentro una pagina.

**Stato:** 39 test superati. Avvio reale verificato su un profilo di prova (copia dei dati 0.4.1): migrazione, finestre multiple con ripristino, schede dormienti, popup con `window.opener`, schermo intero, user agent, validazione dei comandi. Il login Bungie/Google reale e la prova su più monitor sono ancora da fare a mano.

## Limiti noti
- **"Nuovo spazio" non funziona** (anche nelle beta precedenti): usa `prompt()`, che Electron non supporta. Va sostituito con un piccolo campo nella cornice.
- Cambiando workspace in una finestra, le pagine del workspace lasciato restano caricate (per tornarci al volo). Si liberano chiudendo la finestra di quel workspace.
- Tutti i workspace condividono ancora gli stessi cookie.
