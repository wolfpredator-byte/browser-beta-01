# Beta 0.4.1 — Ripristino della barra schede

## Diagnosi
Nella Beta 0.4 `snapshot()` costruiva un array di schede da inviare al renderer, ma senza includere il campo `workspace`. Immediatamente dopo, `tabStripItems()` applicava il filtro `tab.workspace===workspace`. Il filtro scartava ogni scheda perché il campo risultava `undefined`. Il risultato era una barra schede completamente vuota, anche con la Home attiva.

## Correzione (modalità insegnamento)

Nel nuovo file `tab-advanced.cjs`, la funzione `toTabSnapshot(tab,activeId)` trasforma una scheda Electron in un oggetto di soli dati:
- `id`: identifica la scheda, serve per clic/chiusura.
- `workspace`: **indispensabile** per filtrare le schede nella barra. Ometterlo ricrea il bug.
- `title` e `url`: testo e indirizzo.
- `isHome`: distingue la pagina iniziale da una pagina remota.
- `active`: confronto `tab.id===activeId` per evidenziare la scheda attiva.
- `pinned`: flag di fissaggio trasformato in booleano.
- `group`: nome del Tab Stack normalizzato.
- `view`: intenzionalmente esclusa; è un oggetto Electron e non deve essere inviato al renderer.

`snapshot()` di `main.cjs` ora chiama questa funzione. Questa singola fonte di verità è verificata dai nuovi test di regressione.

## Prova su Windows

```powershell
git fetch origin
git switch beta-0.4.1-tab-strip-fix
npm run check
npm start
```

Verifica:
- [ ] La scheda `Home` è visibile nella barra inferiore.
- [ ] Aprendo Google o Bungie compaiono le relative schede.
- [ ] Creando uno stack viene mostrata l'intestazione con il conteggio.
- [ ] Comprimi/espandi: il gruppo resta visibile e non chiude pagine.
- [ ] `Ctrl+Shift+T`, spostamento tra workspace e pulsante `+` continuano a funzionare.
- [ ] Riavvio: schede e gruppi sono ripristinati.

**Stato:** parsing JavaScript e test mirati sui dati serializzati superati; prova grafica Electron su Windows ancora da confermare. Non modificare `main` finché non approvato.
