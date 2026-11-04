# VARCO Beta 0.35 — Fix e miglioramenti

Installer PC: `dist\VARCO Setup 0.35.0.exe`. Il telefono non cambia.

## Cosa cambia
- **Installazione pulita.** Alla prima installazione VARCO parte con un solo workspace vuoto, "Personale". Spariti "Destiny Builder" (con Bungie e GitHub) e "Gaming", che erano scritti nel codice. I tuoi dati in `%APPDATA%\personal-workspace-browser` non vengono toccati.
- **Notifiche toast per categoria.** Impostazioni → Sistema → **Notifiche**: quattro interruttori (Download, Siti, JARVIS, Sistema). Una categoria spenta non mostra toast, ma le notifiche restano nel centro notifiche. Le domande ("Salvare la password?", "Scheda dal telefono", "Riavvia ora") compaiono sempre.
- **Modalità OLED.** Aspetto → Tema e colori → Tema: **OLED (nero puro)**. Cornice, Home, menu e toast diventano nero puro (niente sfondo, barre opache). Sui siti accende lo **scuro forzato** di Chromium, che scurisce anche le pagine senza un loro tema scuro: per attivarlo o toglierlo serve un riavvio (compare un toast con **Riavvia ora**).
- **Pannelli web non più tagliati.**
  - **Adatta il sito**: se un sito è più largo del pannello (WhatsApp, Discord, Spotify…), il sito "vede" uno schermo largo 900 px e viene rimpicciolito per starci intero. Si spegne dal menu del pannello (clic destro sull'icona) → "Adatta il sito alla larghezza".
  - Nuova larghezza **Molto largo** (720 px).
  - **Bordo trascinabile**: trascina lo spazio tra pagina e pannello per scegliere la larghezza (da 280 a 1400 px). Doppio clic: di nuovo Medio.
- **Login Google sugli account separati.** Google ora rifiuta le identità camuffate: il vecchio trucco "Firefox" funzionava solo su sessioni già accettate (il tuo primo account). Ogni sessione nuova, come quella di un workspace con account separati, veniva bloccata con "Questo browser o app potrebbe non essere sicuro". Ora sulle pagine di accesso (accounts.google.com e accounts.youtube.com) VARCO si presenta com'è davvero (Electron), e Google mostra il login per app integrate. Gli altri siti continuano a vedere un Chrome normale.

## Modalità insegnamento
- **`lib/toast-rules.cjs`** decide se un toast si vede (`shouldShow`): `force` sempre, zen niente, `ask` (domande) sempre, il resto secondo la categoria. Ogni toast può dichiarare `category` e `ask`; senza categoria vale "download" per gli id `download*`, altrimenti "sistema".
- **OLED** = terzo valore di `MODES` in `appearance-rules.cjs`: le variabili CSS diventano nere. Le varianti per menu e toast stanno in `popup.css` e `overlay.css` (`@container style(--v-mode: oled)`). **`lib/force-dark.cjs`** legge il tema salvato *prima* che Electron parta e aggiunge `WebContentsForceDark` + `blink-settings=forceDarkModeEnabled=true` (servono tutti e due). Per questo cambia solo al riavvio.
- **Pannelli:** `fitFor()` in `webpanel-rules.cjs` calcola lo schermo virtuale; `webpanels.cjs` lo applica con `enableDeviceEmulation` solo dopo aver misurato che il sito esce dal pannello (1,5 s e 6 s dopo il caricamento), così i siti che già ci stanno restano nitidi.
- **Google:** `userAgentFor()` e `loginHeaders()` in `web-rules.cjs`. La regola di Google non è documentata e può cambiare ancora. Misure di riferimento: https://github.com/stablyai/orca/issues/11518

## Test da fare
- [ ] **T218** — Installa su un PC (o un utente Windows) mai usato: un solo workspace "Personale", nessun link. Sul tuo PC i workspace restano i tuoi.
- [ ] **T219** — Impostazioni → Sistema → Notifiche: spegni "Siti", aggiungi un preferito: niente toast, ma la notifica è nel centro notifiche. Salva una password: la domanda compare lo stesso.
- [ ] **T220** — Tema → OLED: cornice e Home nero puro. Riavvia ora: Wikipedia ed example.com diventano scuri. **📸**
- [ ] **T221** — Torna a Scuro → Riavvia: i siti tornano normali.
- [ ] **T222** — Pannello WhatsApp e Discord a larghezza Media: si vedono interi, senza barra orizzontale. **📸**
- [ ] **T223** — Trascina il bordo del pannello: la larghezza resta dopo il riavvio. Doppio clic: torna Medio.
- [ ] **T224** — Workspace con **Account separati**: login Google con il secondo account fino in fondo (password e verifica in due passaggi).
- [ ] **T225** — Workspace normale: il primo account è ancora collegato (Gmail, YouTube). Se Google ti chiede di rientrare una volta, è normale: l'identità sulle pagine di accesso è cambiata.

**Stato:**
- 180 test superati (nuovi: `test/toast-rules.test.cjs`, più casi in storage, appearance, webpanel e web-rules).
- **Provato in VARCO** con un profilo di prova: prima installazione pulita, pannelli WhatsApp/Discord/Spotify adattati e trascinamento del bordo, OLED su cornice, toast e siti (dopo il riavvio), login Google con sessione nuova non più rifiutato in nessuno dei due workspace (prima: rifiutato in entrambi).
- **Non provato:** un login Google completo con un account vero (lo fai tu, T224), e l'installazione dall'installer.
