# Browser Beta 0.8 — Più finestre per progetto e disposizioni sui monitor

**Branch:** `beta-0.8-disposizioni` (parte dalla 0.7, non unito a `main`).

## Cosa include

1. **Più finestre dello stesso workspace.** `Ctrl+N` (o menu dei workspace → **Nuova finestra di «…»**) apre la finestra 2, 3… dello stesso workspace. In basso vedi `Destiny Builder · 2`; nella barra delle applicazioni il titolo è `Destiny Builder — Finestra 2`.
2. **Spostare schede tra finestre.** Menu `⋯` di una scheda → **Sposta in un'altra finestra** → Finestra 1/2/3 oppure **Nuova finestra**. La pagina non si ricarica.
3. **Disposizione salvata.** Sistema le finestre del progetto sui monitor, poi **▦ Salva disposizione** (Home del workspace) o click destro sul workspace → **Salva disposizione finestre**. Viene ricordato, per ogni finestra: monitor, posizione, massimizzata o no, schede e scheda attiva.
4. **Ripristino.** **▦ Ripristina disposizione** rimette tutto a posto: le finestre chiuse vengono riaperte con le loro schede, quelle aperte spostate. Le schede in più che hai aperto nel frattempo restano.
5. **Apertura automatica.** Aprire un workspace che non ha finestre aperte (dall'icona nell'area di notifica o da "Apri in una nuova finestra") usa la sua disposizione salvata, se c'è.

## Come si comportano le finestre

| | Finestra 1 (principale) | Finestre 2, 3… |
|---|---|---|
| La chiudi | Le schede restano salvate nel workspace | Si chiudono le sue schede, come in Chrome (`Ctrl+Shift+T` le riapre) |
| Esci dal browser | Riaperta al prossimo avvio | Riaperta al prossimo avvio, con le sue schede |
| Cambi workspace dalla sidebar | Mostra l'altro workspace | Apre (o porta davanti) la finestra principale dell'altro workspace |
| Chiudi o sposti la sua ultima scheda | Si chiude la finestra / compare una Home | Si chiude la finestra |

La disposizione salvata ricorda anche le schede, quindi chiudere una finestra secondaria non fa perdere la configurazione del progetto.

## Modalità insegnamento: com'è fatto

### Finestre numerate (`tab-advanced.cjs`, `windows.cjs`, `tabs.cjs`)
- Ogni scheda ha `pane` (0 = principale). `paneOf(tab)` restituisce 0 per le schede delle beta precedenti, che non hanno il campo: **nessuna migrazione** dei dati.
- `isInWindow(tab, w)` sostituisce ovunque il vecchio confronto `tab.workspace === w.workspace`: una finestra mostra le schede del suo workspace **e** del suo numero.
- `windowFor(workspace, pane=0)`, `windowsOf(workspace)`, `windowForTab(tab)` trovano le finestre.
- `nextPane([0,2])` → `1`: il primo numero libero.
- `workspaceLastActive` usa la chiave `Workspace` per la principale (come prima) e `Workspace#2` per le altre.

### Disposizioni (`layout-rules.cjs`, `layouts.cjs`)
- **Proporzioni, non pixel.** `toRelative()` salva la posizione come frazione dell'area utile del monitor (`{x:0.5, y:0, w:0.5, h:1}` = metà destra). Cambiando risoluzione la finestra resta "metà destra".
- **Quale monitor.** `pickDisplay()` cerca prima lo stesso id di Windows, poi lo stesso posto da sinistra (gli id possono cambiare dopo un aggiornamento dei driver, la scrivania no), infine il principale se quel monitor non c'è più.
- **Mai fuori schermo.** `toAbsolute()` tiene la finestra dentro il monitor e non sotto 760×520 (il minimo delle finestre).
- **Massimizzate.** Salviamo `getNormalBounds()` (la posizione da non massimizzata) e `maximized`. Al ripristino: prima `setBounds` sul monitor giusto, poi `maximize()`, così la finestra si massimizza **su quel** monitor.
- `missingTabs()` aggiunge solo le schede mancanti, confrontando l'indirizzo esatto.

## Prova su Windows

```powershell
git switch beta-0.8-disposizioni
npm run check
npm start
```

Verifica:
- [ ] Nel workspace di un progetto premi `Ctrl+N` due volte: tre finestre, in basso `· 2` e `· 3`.
- [ ] Mettine una per monitor, con pagine diverse (anteprima, GitHub, documentazione).
- [ ] **▦ Salva disposizione**: nella Home compare "Disposizione salvata: 3 finestre su 3 monitor".
- [ ] Sposta e ridimensiona le finestre, chiudi la terza, poi **▦ Ripristina disposizione**: tutto torna com'era, anche la terza con le sue schede.
- [ ] Menu `⋯` di una scheda → **Sposta in un'altra finestra** → Finestra 2.
- [ ] Esci dal browser con 3 finestre aperte e riaprilo: tornano tutte.

**Stato:** 73 test superati. Prova reale sui tuoi 3 monitor (sinistro, centrale principale, destro): tre finestre dello stesso workspace con schede diverse, posizionate una per monitor (una massimizzata, una normale, una sulla metà destra); salvataggio ("3 finestre su 3 monitor"); finestre spostate, ridimensionate e una chiusa (le sue schede finite tra le chiuse); ripristino con posizioni identiche al pixel e la terza finestra riaperta con la sua scheda; spostamento di una scheda tra finestre; uscita e riavvio con le 3 finestre e le loro schede.

## Limiti noti
- Una sola disposizione per workspace (salvarne una nuova sostituisce la precedente).
- Le finestre dei DevTools e i popup di login non fanno parte della disposizione.
- Trascinare una scheda da una finestra all'altra con il mouse non è ancora possibile: si usa il menu `⋯`.
