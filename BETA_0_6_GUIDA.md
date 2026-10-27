# Browser Beta 0.6 — Gaming companion e area di notifica

**Branch:** `beta-0.6-gaming-companion` (parte dalla 0.5, non unito a `main`).

## Cosa include

1. **Icona nell'area di notifica (◈).** Chiudendo l'ultima finestra il browser resta attivo lì, così riconosce i giochi. Click sull'icona → riapre le finestre della volta scorsa. Click destro → menu con: Apri workspace, Rilevamento giochi, Resta attivo quando chiudo le finestre, Avvia con Windows, Esci. La prima volta compare un avviso che spiega dove è finito.
2. **Avvia con Windows** (dal menu dell'icona). All'accensione parte con `--background`: solo l'icona, nessuna finestra e nessuna pagina caricata.
3. **Una sola copia.** Se riapri il browser mentre è nell'area di notifica, si mostrano le sue finestre invece di avviarne un secondo.
4. **Pannello Giochi** (♞ nella sidebar). Per ogni gioco imposti:
   - **eseguibile** (es. `destiny2.exe`): scrivilo, cercalo con **Sfoglia…**, oppure, con il gioco aperto, sceglilo da **Programmi aperti**;
   - **workspace** da aprire e **siti** (uno per riga, massimo 10);
   - **monitor**: i tuoi schermi sono numerati da sinistra a destra, con il principale indicato;
   - **sempre in primo piano** mentre giochi;
   - **chiudi la finestra** quando esci dal gioco (le schede restano salvate).
   **Prova** apre il companion come se il gioco fosse partito, **Attivo** lo esclude senza eliminarlo.
5. **Quando parte il gioco** (entro 5 secondi) il browser apre la finestra del workspace sul monitor scelto **senza togliere il focus al gioco**, aggiunge i siti mancanti nell'ordine del pannello e mostra il primo. I siti già aperti non vengono duplicati: conta il sito, non la pagina (DIM aperto su un altro inventario resta quello).

## Consumo misurato (Windows 11, questo PC)

| Situazione | Memoria privata | CPU |
|---|---|---|
| Avvio con Windows (`--background`) | **117 MB** (principale 36, GPU 66, rete 15) | — |
| Dopo aver chiuso tutte le finestre | ~190 MB (la GPU tiene le sue cache) | — |
| Controllo dei giochi, ogni 5 s | — | **6 ms** per controllo |
| Processo principale a riposo | — | 47 ms ogni 30 s (< 0,2% di un core) |

Il Task Manager di Windows mostra la "memoria" (working set), che è più alta di quella privata perché include parti condivise con altri processi.
**Nessun gioco attivo = nessun controllo**: il rilevatore non avvia `tasklist` finché non c'è almeno un gioco attivo.

## Modalità insegnamento: i nuovi file

| File | Electron? | Cosa fa |
|---|---|---|
| `game-rules.cjs` | no | Lettura di `tasklist`, avvii/chiusure, validazione dei giochi, siti mancanti, nomi dei monitor. |
| `game-watcher.cjs` | no | Il ciclo dei 5 secondi. La lettura dei processi gli viene passata, così i test usano un elenco finto. |
| `processes.cjs` | no (solo Node) | Esegue `tasklist`. |
| `companion.cjs` | sì | Apre o chiude la finestra del gioco, posizione sul monitor, siti. |
| `tray.cjs` | sì | Icona, menu, avvisi. |
| `autostart.cjs` | sì | Avvio con Windows. |
| `commands-games.cjs` | sì | Comandi del pannello Giochi e dell'icona. |
| `scripts/make-icons.cjs` | no | Disegna le icone in `assets/` (`npm run icons`). |

### Perché `tasklist` e non altro (`processes.cjs`)
Tempi misurati qui: `tasklist /fi "IMAGENAME eq x.exe"` **~95 ms**, elenco completo **~360 ms**, PowerShell `Get-Process` ~370 ms, filtro per utente **8,8 s** (inutilizzabile). Con fino a `TARGETED_LIMIT = 3` giochi facciamo una domanda mirata per gioco, in sequenza; oltre, un solo elenco completo. Le righe di `tasklist` che non iniziano con `"` vengono ignorate: il messaggio "nessuna attività" è tradotto nella lingua di Windows e non si può riconoscere dal testo.

### Il rilevatore (`game-watcher.cjs`)
- `tick()` è un controllo singolo. `busy` impedisce due controlli sovrapposti se Windows è lento.
- `diffRunning(prima, processi, giochi)` restituisce `started`/`stopped`: ogni avvio viene segnalato **una volta sola**, non ogni 5 secondi.
- Mettere in pausa il rilevamento, o disattivare un gioco mentre è aperto, conta come "gioco chiuso": il "sempre in primo piano" viene tolto e, se impostato, la finestra si chiude.

### Non rubare il focus (`companion.cjs`, `windows.cjs`)
Un gioco a schermo intero si minimizza se un'altra finestra gli passa davanti. Per questo:
- le finestre nuove del companion nascono con `show:false` e poi `showInactive()`;
- niente `maximize()`, che su Windows attiva la finestra: la finestra prende le dimensioni dell'**area utile** del monitor scelto;
- una finestra già aperta viene spostata con `setBounds` e mostrata con `showInactive()`.
Il pulsante **Prova** invece porta la finestra davanti, perché lì sei tu a chiederlo.

### Background (`main.cjs`)
- `window-all-closed`: con "Resta attivo" il processo continua; le pagine delle finestre chiuse sono già state distrutte (`onClosed` in `windows.cjs`).
- `requestSingleInstanceLock()` + `second-instance` → comando `openBrowser`.
- I comandi che servono all'icona (`openBrowser`, `openWorkspaceWindow`, `setGameWatcher`...) non richiedono una finestra.

## Prova su Windows

```powershell
git switch beta-0.6-gaming-companion
npm run check
npm start
```

Verifica:
- [ ] Chiudi tutte le finestre: compare l'avviso e l'icona ◈ resta nell'area di notifica.
- [ ] Click sull'icona: tornano le finestre. Click destro → **Esci** chiude davvero.
- [ ] ♞ **Giochi** → **＋ Aggiungi gioco**: Destiny 2, `destiny2.exe`, workspace Gaming, siti `app.destinyitemmanager.com` e `light.gg`, monitor a scelta.
- [ ] **Prova**: si apre la finestra con i siti, sul monitor scelto.
- [ ] Avvia Destiny 2: entro 5 secondi la finestra compare sull'altro monitor e **il gioco resta in primo piano**.
- [ ] Chiudi il gioco: con "Chiudi la finestra" attivo, la finestra si chiude.
- [ ] Menu dell'icona → **Avvia con Windows**, riavvia il PC: solo l'icona, nessuna finestra.

**Stato:** 52 test superati. Prove reali su un profilo di prova: modulo con errori (eseguibile, sito non valido), rilevamento di un processo vero (`PING.EXE`) con apertura del companion senza focus e chiusura automatica all'uscita, 3 monitor riconosciuti, background dopo la chiusura dell'ultima finestra, seconda copia che riapre le finestre, uscita pulita. Da provare a mano: un gioco vero a schermo intero, il menu dell'icona, l'avvio con Windows.

## Limiti noti
- In background restano 3 processi Electron (principale, GPU, rete): non si possono chiudere singolarmente senza rischiare che Chromium disattivi l'accelerazione grafica.
- Dopo che hai usato il browser, la GPU tiene ~35 MB di cache in più rispetto a un avvio pulito (190 contro 117 MB).
- Il companion riconosce il gioco dal nome dell'eseguibile: due giochi con lo stesso `.exe` non sono distinguibili (il pannello lo impedisce).
