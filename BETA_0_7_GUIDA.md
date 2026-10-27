# Browser Beta 0.7 — Workspace progetto

**Branch:** `beta-0.7-progetti` (parte dalla 0.6, non unito a `main`).

Qualunque workspace diventa un **workspace progetto** se gli colleghi una cartella: il browser legge `progetto.browser.json` da lì. Destiny Builder, JARVIS o il prossimo progetto funzionano allo stesso modo.

## Come si usa

1. Nel workspace: **Collega cartella** (Home) e scegli la cartella del progetto.
2. Apri il pannello **⧉ Progetto** (sidebar o Home). Se il file non c'è, vedi una **proposta** ricavata da `package.json` (nome, `npm run dev`, porta di Vite/Next/Astro…, link GitHub): **Crea il file**.
3. Modifica il file quando vuoi, anche in VS Code: il browser **lo rilegge da solo**.
4. Se il file contiene comandi, un editor o monitor, il browser chiede **"Ti fidi di questo progetto?"** e mostra esattamente cosa farà. Se comandi o monitor cambiano, lo richiede.

## Esempio per Destiny Builder

```json
{
  "nome": "Destiny Builder",
  "anteprima": "http://localhost:5173",
  "avvio": [
    { "nome": "Dev server", "comando": "npm run dev" },
    { "nome": "Test", "comando": "npm test" }
  ],
  "editor": "code",
  "link": [
    { "nome": "GitHub", "url": "https://github.com/tuo-nome/destiny-builder" },
    { "nome": "Bungie API", "url": "https://bungie-net.github.io/multi/" }
  ],
  "ricerche": {
    "lg": "https://www.light.gg/db/search/?q=%s",
    "api": "https://bungie-net.github.io/multi/index.html#q=%s"
  },
  "segreti": ["BUNGIE_API_KEY"],
  "monitor": [
    {
      "nome": "Manifest Destiny 2",
      "url": "https://www.bungie.net/Platform/Destiny2/Manifest/",
      "campo": "Response.version",
      "header": { "X-API-Key": "{{BUNGIE_API_KEY}}" },
      "intervalloMinuti": 30
    }
  ]
}
```

| Chiave | Cosa fa |
|---|---|
| `anteprima` | Pulsante **Anteprima**: apre il dev server, o mostra la scheda se è già aperta. |
| `avvio` | Comandi con **▶ Avvia / ■ Ferma** e log (ultime 500 righe). Partono nella cartella del progetto. Massimo 8. |
| `editor` | Pulsante **Apri in code**: solo il nome del programma (`code`, `cursor`, `zed`). |
| `link` | Collegamenti rapidi nel pannello. |
| `ricerche` | Nella barra degli indirizzi `lg ace of spades` cerca su light.gg. `%s` è il testo cercato. Valgono solo nel workspace del progetto. |
| `segreti` | Solo i **nomi**. I valori li imposti nel pannello. |
| `monitor` | Controlla un'API ogni `intervalloMinuti` (minimo 5, predefinito 30) e ti avvisa dall'icona quando `campo` cambia. Senza `campo` verifica solo che risponda. |

## I segreti

- Li scrivi nel pannello (**Imposta**). Sono cifrati con `safeStorage`, che su Windows usa la protezione del tuo account (DPAPI): copiare `browser-data.json` su un altro PC o account non li rende leggibili.
- **Non tornano mai alla cornice**: il pannello sa solo "impostato" o "mancante".
- I comandi li ricevono come **variabili d'ambiente** (`process.env.BUNGIE_API_KEY` in Node, `os.environ` in Python): niente `.env` in chiaro nel progetto.
- I monitor li usano con `{{NOME}}` negli header o nell'URL. Un monitor può usare solo segreti dichiarati nel file.
- Se un comando stampa il valore di un segreto, nel log compare `••••`.

## Modalità insegnamento: i nuovi file

| File | Electron? | Cosa fa |
|---|---|---|
| `project-rules.cjs` | no | Validazione del file (raccoglie **tutti** gli errori), `trustKey`, segnaposto `{{NOME}}`, campi annidati, ricerche rapide, proposta da `package.json`, log con colori tolti e segreti oscurati. |
| `projects.cjs` | sì | Legge e osserva il file, fiducia, segreti cifrati. |
| `project-processes.cjs` | solo Node | Avvia e ferma i comandi, raccoglie i log, apre l'editor. |
| `monitors.cjs` | sì | Un timer al minuto per tutti i monitor, `net.fetch` con 15 s di timeout. |
| `commands-projects.cjs` | sì | I comandi del pannello nel bus. |

### Perché la fiducia (`trustKey`)
Un progetto clonato da GitHub potrebbe contenere un `progetto.browser.json` con un comando dannoso, o un monitor che invia la tua chiave a un altro sito. `trustKey()` è un'impronta SHA-256 solo di **comandi, editor e monitor (URL + header)**: cambiare nome, link o ricerche non la modifica; cambiare un comando o l'indirizzo di un monitor sì. La fiducia è salvata per percorso del file in `trustedProjects`. Un file senza comandi, editor né monitor non la richiede.

### Fermare davvero un dev server (`killTree`)
Su Windows `npm run dev` crea una catena di processi (shell → npm → node → vite). `child.kill()` chiuderebbe solo la shell e lascerebbe Vite sulla porta. `taskkill /pid … /T /F` chiude l'intero albero. All'uscita dal browser lo facciamo per tutti i comandi in esecuzione (`stopAll`). In background (icona nell'area di notifica) i dev server **continuano**: si fermano quando esci dal browser.

### Il file che si rilegge da solo (`watchFolder`)
Molti editor salvano scrivendo un file temporaneo e rinominandolo: osservare il file perderebbe la modifica. Osserviamo la **cartella** e rileggiamo dopo 300 ms senza altre modifiche.

### Un pannello che si aggiorna senza disturbare (`renderProject`)
Lo stato arriva più volte al secondo. Il pannello si ricostruisce solo se i suoi dati cambiano davvero (confronto JSON), **mai mentre stai scrivendo** in un suo campo, e mantiene lo scorrimento: un log che stavi leggendo resta fermo, uno in fondo continua a scorrere.

## Prova su Windows

```powershell
git switch beta-0.7-progetti
npm run check
npm start
```

Verifica:
- [ ] Workspace Destiny Builder → **Collega cartella** → **⧉ Progetto**: la proposta ha il comando e la porta giusti → **Crea il file**.
- [ ] **▶ Avvia** il dev server: il log scorre; **Anteprima** apre il sito.
- [ ] **■ Ferma**: la porta si libera (il sito non risponde più).
- [ ] Aggiungi `segreti` e un `monitor` dal tuo editor: il pannello chiede di nuovo la fiducia.
- [ ] **Imposta** `BUNGIE_API_KEY`: il dev server, riavviato, la riceve in `process.env`.
- [ ] **Controlla ora** sul Manifest: compare la versione.
- [ ] Scrivi `lg gjallarhorn` nella barra.

**Stato:** 63 test superati. Prova reale su un progetto finto (dev server Node con chiave e "manifest"): proposta da `package.json`, creazione del file, rilettura automatica dopo una modifica esterna, nuova richiesta di fiducia, segreto cifrato (assente in chiaro dal JSON salvato e dallo stato della cornice), segreto ricevuto dal dev server e oscurato nel log, anteprima senza schede doppie, monitor con cambio di versione 1 → 2, ricerca rapida, arresto con porta liberata, nessun processo orfano all'uscita. Da provare a mano: VS Code dal pulsante, il Manifest Bungie vero con la tua chiave.

## Limiti noti
- I log restano solo in memoria (ultime 500 righe per comando) e non sopravvivono al riavvio del browser.
- Un comando che chiede input da tastiera (es. una domanda di `npm init`) resta in attesa: il pannello non ha un terminale interattivo.
- I segreti sono legati all'account Windows: dopo una reinstallazione di Windows vanno reimpostati.
