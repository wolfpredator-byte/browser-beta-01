# VARCO — Your space. Beyond the web.

Browser personale per Windows 11 (ex "Personal Browser").

## Avvio
Apri questa cartella in VS Code. Dal terminale PowerShell:

```powershell
npm install
npm run check
npm start
```

Serve Node.js già installato. Non ci sono account, server, chiavi API o costi obbligatori.

## Cosa funziona nella base
- Navigazione reale via Chromium, barra URL/ricerca, indietro, avanti, ricarica.
- Schede multiple e passaggio tra schede.
- Workspace separati con schede in memoria, selezione e nuove aree.
- Homepage del workspace, collegamenti web, preferiti, cronologia essenziale.
- Collegamento opzionale a cartella locale (aperta in Esplora file).
- Dati locali in browser-data.json nella cartella userData di Electron.

## Limiti dichiarati
Questa e' una **base sperimentale**, non una beta pronta per l'utilizzo quotidiano. Le schede non sono ancora ripristinate dopo un riavvio. Mancano tab stack, download manager, UI permessi, estensioni, riconoscimento giochi, lancio VS Code, tab tiling e gestione completa di pop-up/redirect. Link che richiedono permessi o funzioni browser specifiche potrebbero non funzionare; i popup vengono bloccati. Le pagine Web rimangono senza accesso alle API locali.

**Sicurezza:** Non usare per siti bancari, password importanti o login sensibili. Motore Electron aggiornato, Node integration disabilitata, context isolation e sandbox abilitati, permessi di sito negati finché non sviluppiamo un'interfaccia di consenso. Nessun sito remoto ha accesso alla gestione dei file. Il browser resta un esperimento con rischi da correggere prima dell'uso quotidiano.

## Prossimi checkpoint
1. Avvio e navigazione corretta su Windows.
2. Sessioni persistenti, gestione schede e stack stile Vivaldi.
3. Download e richieste di permessi gestite con UI dedicata.
4. Progetto associato a VS Code con lancio autorizzato dall'utente.
5. Associazione gioco-processo → workspace e avvio opzionale.

Separare sempre l'interfaccia browser (`renderer.js`) dai siti esterni (`WebContentsView`).
\n## Aggiornamento 0.1.1\n- Ricerca testuale con Google, URL espliciti caricati direttamente.\n- Nuova scheda: Google invece di Wikipedia.\n- Errori di caricamento principali mostrati nell'interfaccia per diagnosi.\n- Google/YouTube: la compatibilità non è garantita; se vedi ancora una pagina bianca, copia il messaggio di errore o l'output del terminale.\n- Attenzione: questa resta una base sperimentale, non un browser sicuro per account sensibili.\n# browser-beta-01

by WolfPredator
## Struttura (dalla Beta 0.5)
`main.cjs` avvia l'app e collega i moduli in `lib/`; ogni azione passa dal bus dei comandi (`lib/command-bus.cjs`). I test delle regole pure sono in `test/`. Dettagli e prova: [BETA_0_5_GUIDA.md](BETA_0_5_GUIDA.md) (architettura) e [BETA_0_6_GUIDA.md](BETA_0_6_GUIDA.md) (gaming companion, area di notifica), [BETA_0_7_GUIDA.md](BETA_0_7_GUIDA.md) (workspace progetto), [BETA_0_8_GUIDA.md](BETA_0_8_GUIDA.md) (più finestre e disposizioni sui monitor), [BETA_0_9_GUIDA.md](BETA_0_9_GUIDA.md) (JARVIS e server MCP).

## Eseguibile per Windows
`npm run setup` crea l'installer VARCO `dist\VARCO Setup <versione>.exe` (grafica personalizzata, per utente, senza permessi di amministratore); `npm run dist` crea quello classico `VARCO Setup <versione> (classico).exe`. L'eseguibile usa la stessa cartella dati di `npm start`. Lista di prove: [TEST_ESEGUIBILE.md](TEST_ESEGUIBILE.md); correzioni della 0.9.1: [BETA_0_9_1_GUIDA.md](BETA_0_9_1_GUIDA.md); permessi, blocco pubblicità e schede sospese: [BETA_0_10_GUIDA.md](BETA_0_10_GUIDA.md); palette dei comandi e impostazioni: [BETA_0_11_GUIDA.md](BETA_0_11_GUIDA.md); barra intelligente e pagina Impostazioni: [BETA_0_12_GUIDA.md](BETA_0_12_GUIDA.md); icone: [ICONE.md](ICONE.md); nuova identità VARCO: [BETA_0_13_GUIDA.md](BETA_0_13_GUIDA.md); cornice, sfondo e notifiche: [BETA_0_14_GUIDA.md](BETA_0_14_GUIDA.md); menu, dialoghi e pannelli: [BETA_0_15_GUIDA.md](BETA_0_15_GUIDA.md); installer personalizzato: [BETA_0_16_GUIDA.md](BETA_0_16_GUIDA.md); workspace su misura, note e anteprima: [BETA_0_17_GUIDA.md](BETA_0_17_GUIDA.md); stack compatti e vista divisa: [BETA_0_18_GUIDA.md](BETA_0_18_GUIDA.md); orologio, zen e ambiente di lavoro: [BETA_0_19_GUIDA.md](BETA_0_19_GUIDA.md); visualizzatore di file: [BETA_0_20_GUIDA.md](BETA_0_20_GUIDA.md); personalizzazione e "Apri con": [BETA_0_21_GUIDA.md](BETA_0_21_GUIDA.md); preset: [BETA_0_22_GUIDA.md](BETA_0_22_GUIDA.md); aggiornamenti automatici, workspace eliminabili e giochi trovati da soli: [BETA_0_23_GUIDA.md](BETA_0_23_GUIDA.md); gestore delle schede: [BETA_0_24_GUIDA.md](BETA_0_24_GUIDA.md); password: [BETA_0_25_GUIDA.md](BETA_0_25_GUIDA.md).
