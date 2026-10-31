# VARCO Beta 0.27 — Fluidità, stile e ordine, più anteprima dei link e pannelli web

Installer: `dist\VARCO Setup 0.27.0.exe`.

## Movimento
- **Barra delle schede viva:**
  - una scheda nuova entra con un piccolo rimbalzo;
  - una chiusa esce sfumando e le altre scorrono al loro posto;
  - anche il riordino è animato.
- **Pannelli che scorrono:** il pannello laterale e il cassetto dei download entrano ed escono scorrendo, e la pagina si allarga o si restringe insieme, invece di saltare.
- **Cambio scheda** a scorrimento più fluido (a tempo, non più a passi fissi).
- **Cambio di tema o di workspace:** i colori sfumano e lo sfondo nuovo compare in dissolvenza.
- **Home:** logo, nome, ricerca e riquadri entrano uno dopo l'altro. Anche le Impostazioni, quando le apri.
- **Pulsanti:** tutti rispondono al passaggio del mouse e al clic.
- Palette, suggerimenti e menu compaiono con una breve entrata.
- **Impostazioni → Interfaccia → Animazioni:**
  - **Automatiche** segue "Effetti animazione" di Windows;
  - **Complete**;
  - **Ridotte**, cioè più brevi;
  - **Spente**.

## Stile e ordine
- **Una scala unica** per angoli, testo, ombre e tempi: le parti dell'interfaccia ora si somigliano.
- **Impostazioni:** in cima ci sono la **ricerca** (per esempio "password", "sfondo", "schede"; Esc la svuota) e l'**indice delle sezioni**. Un clic su una voce porta alla sezione e la evidenzia.
- **Barra laterale in gruppi:** Navigazione, Lavoro, Altro e Pannelli. Con la barra espansa si leggono i nomi dei gruppi; con le sole icone c'è una linea sottile.
- **Schede più pulite:**
  - il pulsante "⋯" compare solo passandoci sopra, senza spostare niente;
  - la × delle schede non attive è attenuata;
  - il clic destro funziona come prima.

## Anteprima dei link
- **Shift+clic** su un link, oppure tasto destro → **Anteprima del link**: la pagina si apre in un riquadro sopra quella attuale, che resta sfocata sotto.
- **Apri in scheda:** la pagina diventa una scheda vera **senza ricaricarsi**, quindi restano scorrimento, accessi e video in corso.
- **Affianca:** la mette accanto alla pagina attuale, in vista divisa.
- **Esc**, la × o un clic fuori dal riquadro la chiudono. Cambiando scheda si chiude da sola.

## Pannelli web
- Barra laterale → **Aggiungi pannello**. Ci sono i siti suggeriti (WhatsApp, Discord, Telegram, Spotify, YouTube Music, ChatGPT, Claude, Gmail, Calendar, Notion) oppure un indirizzo qualsiasi.
- Il sito si apre in una **colonna a destra** e la pagina si restringe per fargli posto. Un clic sull'icona nella barra laterale lo apre o lo chiude.
- **Resta carico** anche quando lo chiudi: la musica continua e la chat resta collegata.
- I **messaggi non letti** compaiono come numerino sull'icona, se il sito li scrive nel titolo come fanno WhatsApp e Gmail.
- **Barra del pannello:** ricarica, apri in una scheda, chiudi.
- **Clic destro** sull'icona: larghezza (stretto, medio, largo), **versione mobile del sito** e rimuovi.
- I link che il pannello vuole aprire in una nuova finestra diventano schede.

## Corretto durante le prove
- Una scheda aperta in background (anche da "Affianca") poteva diventare attiva da sola. La libreria delle estensioni la dichiarava attiva nel momento in cui la registrava.

## Modalità insegnamento
- **Animare elementi che non si ricreano:** la barra delle schede ora tiene ogni scheda come lo stesso elemento finché non cambia, e misura dove stava prima e dove sta dopo (la tecnica **FLIP**). Per questo può animare chi entra, chi esce e chi si sposta. Prima veniva ricostruita da zero a ogni aggiornamento, e niente si poteva animare.
- **Le pagine web non hanno transizioni CSS:** sono WebContentsView del processo principale. `lib/motion.cjs` le sposta un fotogramma alla volta (circa 60 al secondo) con una curva che rallenta all'arrivo.
- **Anteprima e pannelli** sono pagine vere messe sopra o accanto alle altre. Sfondo sfocato, barre e pulsanti li disegna la cornice, come già per la palette.

## Test da fare
- [ ] **T155** — Apri e chiudi qualche scheda, trascinane una: entrano, escono e scorrono. Apri e chiudi il pannello Preferiti: la pagina segue morbida.
- [ ] **T156** — Cambia preset e cambia workspace: colori e sfondo sfumano. Torna alla Home: gli elementi entrano a scaglioni.
- [ ] **T157** — Impostazioni → Animazioni: prova Spente e Ridotte, poi Automatiche.
- [ ] **T158** — Impostazioni: cerca "password", poi clicca una voce dell'indice. **📸**
- [ ] **T159** — Shift+clic su un link (per esempio da Google): anteprima. Scorri un po', poi **Apri in scheda**: la scheda resta dov'eri. Riprova con **Affianca**. **📸**
- [ ] **T160** — Aggiungi WhatsApp come pannello web: colonna a destra, accedi, poi chiudi e riapri il pannello: resta collegato. Arriva un messaggio: compare il numerino. **📸**
- [ ] **T161** — Clic destro sul pannello: larghezza Largo, poi versione mobile, poi Rimuovi.

**Stato:** 142 test superati, di cui 3 nuovi su pannelli web e layout. Provato nell'app con il profilo di prova:
- schede: entrata, uscita e riuso degli elementi;
- ricerca nelle Impostazioni ("password" → Password, Estensioni, Dati);
- anteprima: si apre, diventa scheda senza ricaricarsi (stessa pagina) e si affianca in vista divisa;
- pannello web: aggiunta, la pagina si restringe di 428 px, chiusura e riapertura con la stessa pagina ancora carica, rimozione completa.
