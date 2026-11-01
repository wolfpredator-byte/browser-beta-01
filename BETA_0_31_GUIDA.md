# VARCO Beta 0.31 — Telefono e PC collegati

Installer PC: `dist\VARCO Setup 0.31.0.exe`. APK: `dist\VARCO-Android-0.31.0.apk`. Vanno aggiornati tutti e due.

Apri una scheda sul telefono e, con un tasto, la mandi al PC scegliendo dove aprirla. Oppure il contrario: dal PC al telefono. La pagina arriva **dove eri**: stesso punto della pagina, stesso minuto del video.

## Collegare il telefono (una volta sola)
1. **PC:** Impostazioni → **Telefono** → **Collega un telefono**. Compare un QR, valido 10 minuti.
2. **Telefono:** Menu → **Collega al PC** → **Inquadra il QR**.
   - Il lettore è quello di Google Play Services, quindi VARCO non chiede il permesso della fotocamera.
   - Se il QR non si legge: sul PC premi **Copia il codice**, mandalo al telefono (Telegram, mail…), copialo e scegli **Incolla il codice**.
3. Telefono e PC devono essere sulla **stessa Wi-Fi**, con VARCO aperto sul PC (va bene anche solo l'icona nell'area di notifica).
4. **La prima volta Windows chiede il permesso del firewall** per VARCO: consenti sulle **reti private**. Se la tua Wi-Fi è impostata come "pubblica", consenti anche lì, oppure cambiala in privata (Impostazioni di Windows → Rete → Wi-Fi → Profilo di rete).

## Dal telefono al PC
- **Menu → Manda al PC**, poi scegli dove si apre:
  - **Scheda nuova nella finestra aperta**: quella davanti sul PC;
  - **Finestra nuova**;
  - **Chiedi sul PC**: sul PC compare un avviso con **Apri qui** / **Finestra nuova**, e decidi lì;
  - **In un workspace del PC**: l'elenco dei tuoi workspace, coi loro colori.
- **Tieni premuto il pulsante del menu** (le tre righe): la manda subito, con l'ultima destinazione scelta.
- Se sei fuori casa la scheda resta **in coda** e parte da sola appena torni sulla Wi-Fi di casa con VARCO aperto. Menu → **PC collegato** mostra cosa c'è in coda.

## Dal PC al telefono
- **Tasto destro su una scheda → Manda a <telefono>**, oppure tasto destro dentro la pagina. Su un link c'è **Manda link a <telefono>**.
- Arriva fra pochi secondi se VARCO è aperto sul telefono; altrimenti appena lo apri.
- Sul telefono si apre dietro, nel workspace in cui sei, e compare l'avviso **Da <PC>: titolo** con **Apri**.

## Dove eri
- **Scroll:** la pagina si apre allo stesso punto, in proporzione. Telefono e PC impaginano diversamente, quindi è vicino ma non al pixel.
- **Video:** riparte dallo stesso minuto. Su YouTube il minuto va anche nell'indirizzo (`&t=125s`), così funziona sempre.

## Gestione
- **PC, Impostazioni → Telefono:** interruttore del collegamento, telefoni collegati (con "visto 2 minuti fa" e le schede in attesa), **Scollega**, **Collega un altro telefono**.
- **Telefono, Menu → PC collegato:** raggiungibile o no, coda, **Controlla adesso**, **Collega di nuovo**, **Scollega**.

## Modalità insegnamento
- **Niente server esterni.** Il PC apre un piccolo server sulla rete di casa (porta 47820). Mentre VARCO è aperto, il telefono gli chiede le novità ogni 5 secondi ("hello"), e nella stessa occasione consegna le schede in coda. Quando l'app va in secondo piano smette, per non consumare batteria.
- **Trovare il PC:** il router può cambiargli indirizzo. Il telefono prova l'ultimo indirizzo buono, poi quelli del QR, poi grida sulla rete (broadcast UDP, porta 47821) "VARCO?" con l'id del tuo PC. Risponde solo il tuo PC, con la porta.
- **Cifratura:** il QR contiene un segreto di 32 byte che non passa mai in rete. Da quello nasce la chiave (HKDF-SHA256), e ogni messaggio è cifrato con AES-256-GCM. Chi è sulla tua Wi-Fi vede passare solo dati illeggibili, e senza aver visto il QR non può mandarti schede.
  - Ogni messaggio porta l'ora e un id: il PC scarta quelli più vecchi di 10 minuti e quelli già visti, così una busta registrata non si può "rigiocare".
  - Sul PC il segreto è salvato cifrato con la protezione dati di Windows, come le password.
- **Due lingue, una regola:** il protocollo è scritto due volte, in `lib/link-rules.cjs` (PC) e in `LinkRules.kt` (telefono). I test dei due lati usano gli stessi vettori: il telefono deve aprire una busta cifrata dal PC e calcolare la stessa chiave. Così, se uno dei due cambia, un test si rompe.

## Test da fare
- [ ] **T189** — Installa le due versioni. PC: Impostazioni → Telefono → Collega un telefono: compare il QR. **📸**
- [ ] **T190** — Telefono: Menu → Collega al PC → Inquadra il QR. Arriva "Collegato a <PC>" e sul PC l'avviso "Telefono collegato". Se Windows chiede il firewall, consenti.
- [ ] **T191** — Sul telefono apri una pagina lunga e scorri a metà. Menu → Manda al PC → Scheda nuova: sul PC si apre a metà pagina.
- [ ] **T192** — Prova Finestra nuova, poi un workspace del PC: si apre nel posto giusto.
- [ ] **T193** — Chiedi sul PC: compare l'avviso con Apri qui / Finestra nuova. **📸**
- [ ] **T194** — Video di YouTube sul telefono al minuto 2: tieni premuto il menu. Sul PC riparte da lì.
- [ ] **T195** — PC: tasto destro su una scheda → Manda a <telefono>. Sul telefono, con VARCO aperto, arriva entro pochi secondi l'avviso "Da <PC>". **📸**
- [ ] **T196** — Telefono in dati mobili (Wi-Fi spenta): Manda al PC dice "In coda". Riaccendi la Wi-Fi: la scheda arriva sul PC.
- [ ] **T197** — PC: Scollega il telefono. Sul telefono, al controllo successivo, compare "Il PC non riconosce più questo telefono".

**Stato:**
- 165 test sul PC (8 nuovi sul collegamento) e 16 sul telefono, più una prova dal vivo.
- **Provato sul PC con un telefono simulato** (Node) che parla lo stesso protocollo:
  - abbinamento, scoperta via broadcast, rifiuto di chi non è abbinato;
  - schede nelle quattro destinazioni; la pagina riparte al 40% dello scroll;
  - toast "Chiedi sul PC" con i pulsanti;
  - coda PC → telefono con conferma.
- **Codice di rete del telefono provato dal vivo** contro VARCO acceso: `LinkLiveTest`, che parte con la variabile `VARCO_LINK_CODE`. Abbinamento, invio di una scheda e scoperta via broadcast sono riusciti.
- **Non ancora provato su un telefono vero:** l'interfaccia Android (menu, lettore QR, avvisi) la vedi tu per primo.
