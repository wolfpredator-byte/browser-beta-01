# Browser Beta 0.10 — Permessi, blocco pubblicità, schede sospese

Installer: `dist\Personal Browser Setup 0.10.0.exe` (si installa sopra, i dati restano).

## Cosa cambia

1. **Scudo ⛉ accanto alla barra degli indirizzi.** Il numero verde conta pubblicità e tracker bloccati nella pagina. Diventa **giallo** sulle pagine `http` non protette (localhost escluso). Un clic apre il **pannello del sito**.
2. **Blocco di pubblicità e tracker** con le liste di uBlock Origin (EasyList, EasyPrivacy e altre), tramite `@ghostery/adblocker-electron`. Blocca le richieste e nasconde i riquadri rimasti vuoti. Si spegne:
   - **su un solo sito**, dal pannello del sito, se una pagina non funziona: la scheda si ricarica da sola;
   - **ovunque**, dal pannello o dal menu dell'icona ◈.
3. **Permessi sito per sito.** Quando un sito chiede fotocamera, microfono, notifiche, posizione o lettura degli appunti, compare una domanda con **Consenti / Blocca** e la casella **Ricorda la scelta per questo sito**. Senza la casella, la risposta vale fino alla chiusura del browser. Dal pannello del sito puoi cambiare ogni permesso (Chiedi / Consenti / Blocca) o dimenticare un sito. Restano sempre concessi schermo intero, pulsanti "Copia" e blocco del puntatore (giochi nel browser); tutto il resto (USB, seriale, condivisione schermo…) resta negato.
4. **Schede sospese.** Una scheda caricata ma non guardata da **30 minuti** chiude la sua pagina per liberare memoria: resta nella barra, attenuata e con l'icona in grigio, e si ricarica quando la apri. Non vengono mai sospese le schede che suonano (musica, chiamate), quelle **fissate** (utile per Discord web) e quelle con i DevTools aperti. Il tempo si sceglie dal menu dell'icona ◈ → **Sospendi schede inattive** (mai, 15, 30, 60, 120 minuti).

## Modalità insegnamento

### Blocco pubblicità (`adblock.cjs`)
- Non usiamo `enableBlockingInSession()` della libreria: colleghiamo noi i suoi tre punti d'ingresso (`onBeforeRequest`, `onHeadersReceived`, filtri cosmetici via `ipcMain.handle`). Così possiamo saltare il blocco per i siti in `settings.adblock.allowlist` e contare i blocchi per scheda (`request-blocked` → `counts`, azzerato a ogni nuova pagina).
- Electron ammette **un solo ascoltatore per tipo di evento di rete**: il blocco usa `onBeforeRequest`/`onHeadersReceived`, il login Google `onBeforeSendHeaders`. Se un giorno servisse un altro ascoltatore sugli stessi eventi, andrebbe fatta una "catena" unica.
- Le liste (~7 MB già compilate) si scaricano al primo avvio e restano in `adblock-engine.bin` nella cartella dati; dopo 7 giorni vengono riscaricate. Senza rete al primo avvio il browser funziona normalmente, senza blocco, e riprova al riavvio. Il motore occupa alcune decine di MB nel processo principale.
- L'"eccezione per sito" guarda il sito della **scheda** (`pageHost`), non quello del singolo file: escludere `ilmeteo.it` sblocca anche le pubblicità servite da altri domini dentro quella pagina.

### Permessi (`permission-rules.cjs`, `permissions.cjs`)
- `requestKinds()` divide la richiesta "media" di Electron in **fotocamera** e **microfono**; `decide()` concede solo se tutti i permessi richiesti sono "consenti" e nega se anche uno solo è "blocca".
- Electron fa due cose diverse: la **richiesta** (`setPermissionRequestHandler`, può aspettare la tua risposta) e la **verifica silenziosa** (`setPermissionCheckHandler`, deve rispondere subito sì/no). Per fotocamera e microfono non ancora decisi la verifica risponde "sì": altrimenti siti come Discord leggerebbero "negato" e non chiederebbero nemmeno. L'uso vero passa comunque dalla richiesta, quindi dalla domanda. Per le notifiche serve un "consenti" esplicito, o un sito potrebbe inviarle senza chiedere.
- Se un sito ripete la stessa richiesta mentre la domanda è aperta, la domanda resta una sola (`pending`).

### Sospensione (`tab-advanced.cjs` → `shouldSleep`, `sleeper.cjs`)
Ogni minuto: le schede visibili aggiornano `lastVisibleAt`; quelle nascoste da troppo tempo, senza audio, non fissate e senza DevTools tornano dormienti (stessa forma delle schede ripristinate all'avvio: `view:null`). Non c'è nessuna differenza tra una scheda sospesa e una appena ripristinata.

## Test da fare

- [ ] **T42** — Apri un sito con pubblicità (es. un sito di notizie): lo scudo mostra un numero verde e le pubblicità mancano. **📸** della pagina.
- [ ] **T43** — Pannello del sito → togli **Blocca su questo sito**: la pagina si ricarica con le pubblicità; riattivalo.
- [ ] **T44** — Discord web (o un sito di videochiamate): alla richiesta del microfono compare la domanda. **Consenti** con "Ricorda": la chiamata funziona e al prossimo accesso non chiede più. **📸** della domanda.
- [ ] **T45** — Pannello del sito → Microfono **Blocca**: il sito non riceve più il microfono.
- [ ] **T46** — Apri un sito `http://` (non https): lo scudo è giallo e il pannello avvisa.
- [ ] **T47** — Menu dell'icona ◈ → **Sospendi schede inattive → Dopo 15 minuti**. Lascia alcune schede in secondo piano per 15–16 minuti: diventano attenuate; aprendole si ricaricano. Una scheda **fissata** o con musica non viene sospesa.
- [ ] **T48** — Task Manager con molte schede aperte, prima e dopo la sospensione: la memoria scende. **📸** se vuoi confrontare.

**Stato:** 92 test superati. Provato nell'app (profilo di prova): liste scaricate al primo avvio (6,8 MB in cache), 6 elementi bloccati su ilmeteo.it → 0 con l'eccezione per il sito → 14 dopo averla tolta; domanda "example.com vuole inviarti notifiche" con "Ricorda", seconda richiesta concessa senza domanda, cambio a "Blocca" dal pannello e la pagina vede subito "denied"; fotocamera non decisa vista come disponibile dalla verifica silenziosa; scheda in secondo piano sospesa e risvegliata al clic, scheda fissata non sospesa. Installer controllato: contiene la libreria e il suo preload, e nell'eseguibile il blocco funziona (6 elementi su ilmeteo.it).
**Non provati:** fotocamera e microfono veri (non ho acceso i tuoi dispositivi) e la sospensione con il tempo reale di 15 minuti (simulata spostando l'orario dell'ultima visita).
