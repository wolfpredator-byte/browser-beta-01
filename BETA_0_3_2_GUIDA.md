# Beta 0.3.2 — Correzioni al ciclo di vita delle schede

Questa revisione nasce dai test Windows della Beta 0.3.1. Non introduce nuovi pannelli, layout o dipendenze: corregge soltanto due comportamenti delle schede.

## Comportamenti attesi

1. **Chiudi ultima scheda visibile:** la finestra si chiude, anche se altri workspace conservano le proprie schede. Gli altri workspace non vengono svuotati: restano nel salvataggio della sessione e ritornano al successivo avvio.
2. **Ricerca da Home:** la Home si trasforma nella pagina cercata, senza creare una Home aggiuntiva a sinistra.
3. **Pulsante Home:** rimane disponibile e può creare nuovamente la Home.
4. **Pulsante `+`:** continua a creare una nuova scheda Home.
5. **Schede web normali:** una ricerca dalla barra indirizzi resta nella stessa scheda e non chiude Home presenti altrove.
6. **Risorse cliccate dalla Home:** aprono il sito al posto della Home, come le scorciatoie della pagina iniziale.

## Come leggere il codice (modalità insegnamento)

### `tab-lifecycle.cjs`

`shouldCloseWindow(tabs, workspace)`

- **Input `tabs`:** array di tutte le schede del browser. Include anche schede di workspace nascosti.
- **Input `workspace`:** nome del contesto attualmente selezionato, ad esempio `Personale`.
- **Output `true`:** in quel workspace non è rimasta nessuna scheda.
- **Perché funziona:** usa `some` per controllare le schede del workspace, anziché `tabs.length` che conta anche gli altri workspace.
- **Cosa cambia se modifichi la regola:** usando `tabs.length === 0` il bug ritorna: i workspace non attivi impediscono di chiudere la finestra.

`discardHomeAfterNavigation(tabs, homeId, webId, workspace)`

- **`homeId`:** quale Home vogliamo rimpiazzare.
- **`webId`:** ID della scheda web nuova, restituito da `newTab()`.
- **`workspace`:** impedisce di eliminare una Home in un altro contesto.
- **Prima di eliminare:** controlla che la scheda web nuova esista davvero. Se il suo caricamento iniziale non è stato avviato, la Home resta.
- **`splice(homeIndex, 1)`:** rimuove un elemento dall'array. Il valore `1` significa rimuovere **una** scheda. Aumentarlo rischierebbe di rimuovere schede vicine.
- **Cosa non fa:** non salva su disco. La funzione `persistTabs()` è richiamata nel processo principale dopo il cambiamento.

### `main.cjs`

`closeTab(id)`:

- Rimuove soltanto una scheda del workspace attivo.
- Chiude la `WebContentsView` se la scheda è un sito.
- Reimposta `activeId` se è stata chiusa proprio la scheda attiva.
- Chiama `shouldCloseWindow`; se ritorna `true`, salva la sessione e chiama `win.close()`.
- Se restano altre schede nello stesso workspace, ne seleziona una.

`navigateFromHome(raw)`:

- Accetta una ricerca testuale o URL.
- `safeUrl(raw)` converte una frase in URL di ricerca Google o verifica un indirizzo diretto.
- Usa `newTab()` per creare la vista web nello stesso workspace, subito dopo la Home.
- Rimuove la Home **soltanto dopo** la creazione della scheda web.
- Aggiorna `browser-data.json` e la barra inferiore tramite `persistTabs()` e `emit()`.

`case 'navigate'`: distingue Home (`navigateFromHome`), scheda web (`loadURL`), e nessuna scheda (`newTab`).

`case 'resource'`: apre nuove schede normalmente, ma sostituisce Home se la risorsa è stata selezionata dalla pagina iniziale.

### Test automatici

Il file `test-tab-lifecycle.cjs` contiene sei test per queste regole, senza installare alcuna libreria esterna. `npm run check` ora esegue la verifica sintattica **e** i test.

## Come provarla su Windows

```powershell
git fetch origin
git switch beta-0.3.2-tab-lifecycle
npm run check
npm start
```

Checklist:
- [ ] Apri Personale e poi uno o più tab in Destiny Builder.
- [ ] Ritorna a Personale, chiudi tutte le sue schede: **la finestra del browser si chiude**.
- [ ] Riapri il browser: Personale mostra una nuova Home; Destiny Builder conserva le sue schede precedenti.
- [ ] Da Home cerca `come creare un gioco in Unity`: la stessa posizione della Home mostra i risultati, senza lasciare Home a sinistra.
- [ ] Clicca sull'icona Home superiore: deve tornare una scheda Home.
- [ ] Clicca sul `+`: deve creare un'altra Home.
- [ ] Da un sito normale, cerca un nuovo indirizzo nella barra superiore: naviga nella scheda corrente.
- [ ] Verifica che barra laterale, menu contestuali, scaricamento immagini e workspace continuino a funzionare.

**Nota tecnica:** se il sito non riesce a caricarsi dopo aver creato la scheda web, la scheda rimane e mostra l'errore di navigazione. Questo è intenzionale: non equivale alla mancata creazione della scheda.

**Stato:** modifiche caricate su branch separato, controlli JavaScript e regole puramente logiche verificati; test UI su Windows in attesa di conferma. La Beta 0.3.1 rimane intatta.
