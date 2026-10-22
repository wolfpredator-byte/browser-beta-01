# Browser Beta 0.4 — Advanced Tabs

**Branch:** `beta-0.4-advanced-tabs` (non unito a `main`).
La Beta 0.3.2 rimane il checkpoint confermato funzionante.

## Cosa include

1. **Tab Stacks comprimibili**: assegna due o più schede allo stesso stack; l'intestazione `▾ Ricerca (3)` apre/chiude visivamente il gruppo. Collassare **non** sospende o distrugge alcuna pagina.
2. **Stack via trascinamento**: `Shift + trascina` una tab su un'altra per creare uno stack `Stack 1`, `Stack 2`, ecc. Oppure trascina una tab su un'intestazione stack già esistente. Il semplice trascinamento continua a riordinare le schede.
3. **Spostamento fra workspace**: menu `⋯` → **Sposta nel workspace** → scegli destinazione. La `WebContentsView` rimane la stessa: non reimpostiamo la pagina da zero.
4. **Riapertura delle schede chiuse**: `Ctrl+Shift+T`, pulsante `↶` in basso o voce del menu `⋯`. Manteniamo fino alle ultime **20** chiusure e riapriamo nel contesto originale.
5. **Menu nativo Windows migliorato**: Ricarica, Duplica, Fissa, Assegna a stack, Comprimi/Espandi, Sposta, Copia indirizzo, Riapri, Chiudi.
6. **Persistenza**: nomi stack, stato compresso/espanso e cronologia schede chiuse restano in `browser-data.json`. Non è prevista una sincronizzazione cloud.

## Modalità insegnamento: come funzionano i nuovi file

### `tab-advanced.cjs` (logica testabile senza Electron)

**`groupName(name)`**: normalizza un nome, rimuove gli spazi esterni e limita a **35 caratteri**. Se cambi il 35 devi valutare anche il layout CSS delle etichette.

**`toggleCollapsed(state, workspace, group)`**: aggiorna l'array `state[workspace]` e restituisce `true` quando lo stack è compresso. Cambiare `previous.splice(index,1)` in una rimozione più larga rischierebbe di espandere altri gruppi involontariamente.

**`tabStripItems(tabs, workspace, collapsed, activeId)`**: crea una struttura di soli dati, senza Electron. Uno stack compare una sola volta; da espanso contiene i suoi figli visibili, da compresso mostra soltanto la sua intestazione. La proprietà `active` evidenzia lo stack della scheda selezionata.

**`moveTab(tabs, id, target, knownWorkspaces)`**: cambia esclusivamente `tab.workspace` dopo aver validato la destinazione. Questo è il motivo per cui non perdiamo la pagina aperta. Le modifiche al processo Electron (selezione, sessione, stato) sono gestite in `main.cjs`.

**`rememberClosed(closed, tab, max=20)`**: salva i soli metadati necessari a ricreare una scheda. Il limite predefinito è **20**: alzarlo conserva più elementi nel JSON, ma aumenta dati e durata delle operazioni. Non archivia contenuto della pagina, scroll, credenziali o media.

### `main.cjs` (processo principale)

**`snapshot()`** prepara i dati passati al renderer. Non contiene mai oggetti `WebContentsView`, solo campi serializzabili e `tabStrip` costruita dalla funzione di sopra.

**`stackTwoTabs(fromId, targetId)`** assegna lo stesso nome alle due schede. Se nessuna è già in un gruppo, crea un nome numerato disponibile e lascia lo stack inizialmente **espanso**.

**`moveTabToWorkspace(id, destination)`** sposta la vista web originale; se lascia vuoto il workspace di partenza, crea una Home per evitare uno schermo nero. Spostare non equivale a chiudere la finestra.

**`reopenClosedTab()`** legge l'elemento più recente, imposta il workspace di origine e ricrea la scheda. Dato che la scheda precedente è stata distrutta, la navigazione riparte dal suo URL.

**`registerReopenShortcut(contents)`** ascolta la combinazione `Ctrl + Shift + T` sia nella cornice locale sia nelle pagine remote. `input.control` e `input.shift` devono essere veri, `input.alt` falso. Il carattere `t` determina il tasto; cambiarlo cambierebbe la scorciatoia.

**`case 'tabContextMenu'`** usa `Menu.buildFromTemplate`: le voci si disegnano sul livello di sistema Windows, per cui non rimpiccioliscono la pagina e restano cliccabili sopra al rendering web.

### `renderer.js` e `style.css`

- `.stack-heading` è l'intestazione del gruppo; il triangolo cambia da `▾` a `▸` quando viene compresso.
- `.stack-heading.contains-active` evidenzia uno stack compresso la cui pagina è attiva.
- `tab.draggable=true` consente il trascinamento: **Shift + drop** manda `stackTabs`; il drop senza Shift manda `reorderTab`.
- `#reopenClosed` viene disabilitato automaticamente quando `canReopenClosed` è falso.
- Le dimensioni delle viste Internet restano calcolate da `bounds()` in `main.cjs`: questa revisione non cambia HEADER, FOOTER o larghezza sidebar.

## Avvio su Windows

```powershell
git fetch origin
git switch beta-0.4-advanced-tabs
npm install
npm run check
npm start
```

`npm run check` ora esegue verifiche sintattiche e i test automatici sia della 0.3.2 sia della 0.4.

## Checklist manuale di accettazione

- [ ] Google, YouTube, barra di navigazione e homepage funzionano come nella 0.3.2.
- [ ] Apri tre schede, poi tieni **Shift** premuto e trascinane una sopra un'altra.
- [ ] Compare **Stack 1 (2)**; comprimi ed espandi: i siti devono rimanere caricati.
- [ ] Trascina una terza scheda sull'intestazione dello stack, verifica il conteggio.
- [ ] Clicca `⋯` su una scheda e seleziona **Assegna a stack** → Ricerca.
- [ ] Comprimi lo stack che contiene la scheda attiva: il sito deve restare visualizzato e lo stack deve risultare evidenziato.
- [ ] Sposta una scheda in Gaming e torna al workspace Gaming: la pagina deve essere presente.
- [ ] Chiudi una scheda e premi `Ctrl+Shift+T` con il focus su un sito web: deve riaprirsi.
- [ ] Ripeti usando il pulsante `↶`.
- [ ] Riavvia il browser e verifica persistenza gruppi, compressione e workspace.
- [ ] Chiudi l'ultima scheda: la finestra deve ancora chiudersi come nella 0.3.2.
- [ ] Sidebar, download e menu immagini continuano a funzionare.

## Limiti intenzionali

Questa è una prima implementazione di stack comprimibili, **non** ancora l'intera UX Vivaldi: niente seconda riga di tab, hibernation, tiling o rinomina tramite dialogo libero. Gli stack si possono creare con **Shift+trascina**, o assegnare ai nomi esistenti dal menu. Il prossimo sprint potrà aggiungere rinomina e gestione visuale più sofisticata.

Il browser è ancora sperimentale: non considerarlo sicuro per servizi bancari o autenticazioni sensibili. Il controllo finale delle interazioni di Electron va effettuato su Windows prima di approvare la Beta 0.4.
