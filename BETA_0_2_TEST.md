# Beta 0.2 — Black Glass / JARVIS Orb
Branch: `beta-0.2-black-glass` (non ancora unito in main)

## Avvio su Windows
```powershell
git fetch origin
git switch beta-0.2-black-glass
npm install
npm run check
npm start
```

## Test manuali
- [ ] Il browser si apre senza errori.
- [ ] Google e YouTube caricano senza pagina bianca.
- [ ] Barra indirizzi superiore: ricerca e URL.
- [ ] Le schede rimangono visibili in basso, anche visitando un sito.
- [ ] Indietro / avanti / ricarica funzionano.
- [ ] Home mostra sfondo nero, vetro leggero, sfera bianca.
- [ ] I tre pulsanti Idle / Thinking / Speaking cambiano l'animazione (solo demo).
- [ ] La sidebar passa da estesa a compatta.
- [ ] I workspace e le loro risorse restano disponibili.
- [ ] Chiudendo e riavviando il browser, le schede precedenti vengono ripristinate.
- [ ] Preferiti e cronologia esistenti non vengono persi.

## Note
- Le animazioni JARVIS non sono collegate al servizio JARVIS reale.
- Il ripristino salva solo indirizzi web e workspace, non la cronologia back/forward di ciascuna scheda.
- Tab stack, download manager, permessi e monitoraggio dei giochi non sono ancora implementati.
- Non è ancora sicuro usarlo per credenziali, banca o login sensibili.
- Le modifiche sono state caricate sul branch ma non ancora testate su Windows in questa sessione.
