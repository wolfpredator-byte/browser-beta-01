# VARCO Beta 0.26 — Estensioni Chrome

Installer: `dist\VARCO Setup 0.26.0.exe`.

## Come si usano
- **Aggiungere:** Impostazioni → **Estensioni** → **Apri il Chrome Web Store**, oppure vai su chromewebstore.google.com. Il pulsante **Aggiungi** funziona anche in VARCO.
  - Prima di installare, VARCO chiede conferma mostrando il nome e i permessi dell'estensione.
  - Le estensioni si caricano a ogni avvio e **si aggiornano da sole**.
- **Icone:** accanto alla barra degli indirizzi. Un clic apre il menu (popup) dell'estensione e il numerino è il suo badge.
- **Menu contestuale:** le voci aggiunte dalle estensioni compaiono nel tasto destro sulle pagine.
- **Impostazioni → Estensioni:** elenco con versione e descrizione, **Impostazioni** dell'estensione (se ne ha) e **Rimuovi**.

## Cosa funziona e cosa no
- Funzionano le estensioni comuni: blocchi di pubblicità, temi scuri, traduttori, gestori di password, strumenti per sviluppatori. In pratica le API più usate: icone e popup, schede, finestre, archiviazione, menu contestuali, notifiche, cookie, messaggi.
- Quelle che usano funzioni rare di Chrome (scorciatoie da tastiera proprie, sincronizzazione con l'account Google, alcune API di sistema) possono funzionare solo in parte.
- Sulla **Home** il popup di un'estensione si apre solo se nella finestra c'è almeno un sito aperto: un'estensione lavora sempre su una pagina web.
- Il blocco pubblicità integrato di VARCO resta attivo. Se installi uBlock Origin o simili, puoi spegnere quello di VARCO da Impostazioni → Privacy.

## Modalità insegnamento
- **Due librerie MIT** dello stesso autore:
  - `electron-chrome-extensions` aggiunge a Electron le API che un browser vero deve avere (Electron da solo supporta soprattutto quelle per DevTools);
  - `electron-chrome-web-store` gestisce installazione e aggiornamenti dal Web Store.
- **Sandbox:** VARCO tiene tutti i processi in sandbox (`app.enableSandbox()`), anche la cornice. Un preload in sandbox non può caricare moduli, quindi il componente delle icone è stato diviso in due parti:
  - il **ponte** verso il processo principale sta in `preload.cjs`;
  - gli **elementi grafici** li estrae dalla libreria `scripts/vendor.cjs` in `viewer/vendor/frame/` e la cornice li carica come uno script normale.
- **Le schede per le estensioni:** VARCO dice alla libreria quali pagine sono schede, a quale finestra appartengono e qual è quella attiva. Quando un'estensione chiede una scheda (`chrome.tabs.create`), VARCO la apre come una scheda normale. Una nuova "finestra" chiesta da un'estensione diventa una scheda nella finestra attiva.

## Test da fare
- [ ] **T150** — Impostazioni → Estensioni → Apri il Chrome Web Store. Aggiungi **Dark Reader**: compare la domanda di VARCO con i permessi, poi l'icona accanto alla barra. **📸**
- [ ] **T151** — Clic sull'icona di Dark Reader su un sito: si apre il suo popup e il tema scuro si applica.
- [ ] **T152** — Aggiungi un'estensione con menu contestuale (per esempio un traduttore come "Google Translate"): tasto destro su una pagina, compare la sua voce.
- [ ] **T153** — Impostazioni → Estensioni: **Impostazioni** di un'estensione si apre in una scheda; **Rimuovi** la toglie anche dalla barra.
- [ ] **T154** — Riavvia VARCO: le estensioni restano.

**Stato:** 139 test superati. Provato nell'app con una piccola estensione di prova (MV3) caricata nel profilo di prova, senza scaricare nulla:
- l'icona compare nella barra;
- il clic apre il popup, e `chrome.tabs.query` vede la scheda attiva giusta;
- la voce nel menu contestuale c'è, e il clic apre una scheda con `chrome.tabs.create`;
- le Impostazioni elencano l'estensione.

Il profilo di prova è stato ripulito. L'installazione dal Web Store vero la verifichi tu (T150).

**Corretto durante le prove:**
- la cornice resta in sandbox: ponte e componente sono separati, come spiegato sopra;
- la libreria va caricata prima che l'app sia pronta, altrimenti le icone `crx://` non si caricano;
- due regole CSS nascondevano l'icona.
