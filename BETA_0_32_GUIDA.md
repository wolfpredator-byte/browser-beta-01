# VARCO Beta 0.32 — Collegamento anche fuori casa

Installer PC: `dist\VARCO Setup 0.32.0.exe`. APK: `dist\VARCO-Android-0.32.0.apk`. Vanno aggiornati tutti e due. Il telefono collegato con la 0.31 resta collegato: niente QR nuovo.

Con la 0.31 le schede passavano solo sulla Wi-Fi di casa. Adesso, se il telefono non trova il PC, le schede passano **via internet**, e arrivano anche se il PC in quel momento è spento.

## Come si usa
- Non cambia niente: **Menu → Manda al PC** e scegli dove aprirla, come prima.
  - In casa compare "Scheda nuova: mandata".
  - Fuori casa compare "Mando via internet…", poi "Scheda nuova: mandata via internet".
- **Dal PC al telefono:** tasto destro → **Manda a <telefono>**. Arriva appena apri VARCO sul telefono, anche fuori casa.
- Se il PC è spento, la scheda lo aspetta **fino a 12 ore**: la apre quando accendi VARCO sul PC. Lo stesso vale nell'altro verso.
- **PC, Impostazioni → Telefono → Anche fuori casa:** è acceso di default. Spegnilo e il collegamento torna solo sulla rete di casa.
  - Sotto c'è lo stato: "Fuori casa: in ascolto su ntfy.sh", oppure l'errore.
- **Telefono, Menu → PC collegato:** in casa "Raggiungibile", fuori "Fuori casa: le schede passano via internet".

## Modalità insegnamento
- **Il relay è ntfy.sh**, un servizio pubblico e gratuito di messaggi. Non serve un account.
  - Il telefono ci pubblica una busta e il PC la riceve. È come una cassetta postale con un nome segreto.
- **Le cassette:** ogni abbinamento ne ha due, una per verso. I nomi nascono dal segreto del QR (HKDF, come la chiave), per esempio `varco-3a5d5d12…`.
  - Chi non ha visto il QR non conosce i nomi, e senza la chiave non può né leggere né scrivere buste valide.
- **Cosa vede ntfy:** solo buste cifrate con AES-256-GCM, la stessa cifratura di casa. Vede anche l'ora e l'indirizzo IP da cui arrivano, ma non le pagine.
  - L'intestazione `Firebase: no` evita che ntfy inoltri le buste alle notifiche di Google.
- **Il PC ascolta, il telefono chiede:**
  - il PC tiene aperta una sola connessione con ntfy, che gli manda le buste appena arrivano;
  - il telefono, mentre VARCO è aperto, chiede le novità ogni 15 secondi, e solo quando non trova il PC in casa;
  - il PC ricorda l'ultima busta letta, così alla riaccensione riceve solo quelle nuove.
- **Contro i replay:** in casa si scartano i messaggi vecchi di oltre 10 minuti. Dal relay possono arrivare fino a 13 ore dopo, quindi il PC salva gli id già aperti e scarta i doppioni.
- **Due strade, una scheda:** il PC manda la scheda per il telefono sia sulla rete di casa sia sul relay. Il telefono ricorda le schede già aperte e la apre una volta sola.
- **Limite:** ntfy accetta buste fino a 4 KB, quindi gli indirizzi lunghissimi (oltre circa 2500 caratteri) restano in coda finché torni a casa.

## Test da fare
- [ ] **T198** — Installa le due versioni. PC: Impostazioni → Telefono: c'è **Anche fuori casa** acceso, e sotto "Fuori casa: in ascolto su ntfy.sh". **📸**
- [ ] **T199** — Telefono in dati mobili (Wi-Fi spenta): Menu → Manda al PC → Scheda nuova. Compare "mandata via internet" e la pagina si apre sul PC entro pochi secondi.
- [ ] **T200** — Sempre fuori casa: Chiedi sul PC. Sul PC compare l'avviso con Apri qui / Finestra nuova.
- [ ] **T201** — PC: tasto destro su una scheda → Manda a <telefono>, col telefono in dati mobili e VARCO aperto. Entro 15 secondi arriva l'avviso "Da <PC>". **📸**
- [ ] **T202** — Chiudi VARCO sul PC. Dal telefono, fuori casa, manda una scheda. Riapri VARCO sul PC: la scheda si apre.
- [ ] **T203** — Torna sulla Wi-Fi di casa. Una scheda mandata dal PC arriva **una volta sola**, anche se passa da tutte e due le strade.
- [ ] **T204** — PC: spegni Anche fuori casa. Dal telefono, fuori casa: Manda al PC dice "In coda", e Menu → PC collegato spiega come riaccenderlo.

**Stato:**
- 167 test sul PC (2 nuovi sul relay) e 17 sul telefono, più la prova dal vivo.
- **Provato sul PC** con il telefono simulato (Node) e con ntfy.sh vero:
  - scheda dal telefono via relay;
  - scheda mandata mentre il relay era spento, che arriva alla riaccensione (con la finestra nuova scelta);
  - scheda dal PC al telefono, letta e decifrata.
- **Codice del telefono provato dal vivo** (`LinkLiveTest` con `VARCO_LINK_CODE`): abbinamento, poi pubblicazione e lettura su ntfy.sh. La scheda è arrivata sul PC.
- **Non ancora provato su un telefono vero fuori casa:** dati mobili, telefono che passa dalla Wi-Fi ai dati.
