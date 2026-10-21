# Beta 0.3 — Browser Experience
Branch di prova: `beta-0.3-browser-experience`. Non ancora integrato in `main`.

## Avvio
```powershell
git fetch origin
git switch beta-0.3-browser-experience
npm install
npm run check
npm start
```

## Checklist Windows
- [ ] Google, YouTube e navigazione normale funzionano.
- [ ] Crea 3 schede e usa ⋯ per duplicare una scheda.
- [ ] Fissa/sblocca con ⋯, poi chiudi e riapri: deve restare fissata.
- [ ] Assegna a due schede lo stesso nome gruppo con ⋯ → G. Entrambe mostrano l'etichetta.
- [ ] Trascina una scheda prima di un'altra e controlla l'ordine.
- [ ] Crea schede in Personale e Destiny Builder, passa da uno all'altro, verifica che ritorni all'ultima scheda usata.
- [ ] Chiudi e riavvia il browser, verifica ripristino e gruppo.
- [ ] Scarica un file non sensibile e verifica che compaia nell'elenco Download in homepage e nella cartella Download di Windows.
- [ ] Controlla che homepage, animazione della sfera, preferiti e cronologia siano invariati.

## Limiti di questa iterazione
Gli stack sono **etichette di raggruppamento** e non ancora stack comprimibili o Tab Tiling come Vivaldi. Download: elenco in memoria (non sopravvive al riavvio), progresso e cartella locale; niente pausa/ripresa o conferma destinazione. I permessi dei siti restano negati e la gestione dei popup è limitata. La sicurezza non è ancora sufficiente per l'uso quotidiano con credenziali importanti.

Non spostare il branch su main senza la conferma dei test su Windows.
