# VARCO Beta 0.33 — Preferiti e password sul telefono, sincronizzati col PC

Installer PC: `dist\VARCO Setup 0.33.0.exe`. APK: `dist\VARCO-Android-0.33.0.apk`. Vanno aggiornati tutti e due. Il telefono resta collegato: niente QR nuovo.

Il telefono ora ha **preferiti** e **password**, e quando è sulla Wi-Fi di casa li tiene allineati col PC da solo: aggiungi un preferito su uno e compare sull'altro, togli una password e sparisce anche di là.

## Preferiti
- **Telefono, Menu → Aggiungi ai preferiti** (o **Togli dai preferiti**) sulla pagina aperta.
- **Menu → Preferiti:** l'elenco. Un tocco apre la pagina, tenendo premuto la apri in una scheda nuova o la togli.
- **Home:** i preferiti stanno in una fila sotto la ricerca. Si scorre di lato, e tenendo premuto ne togli uno.
- Sul PC restano dove erano: pannello Preferiti, palette, tasto destro → Aggiungi ai preferiti.

## Password sul telefono
- **Compilare:** tocca il campo del nome utente o della password. Sopra la tastiera compare **🔑 Accedi come …**, oppure **Scegli un account** se ne hai più di uno. Toccalo: il telefono chiede l'impronta, il volto o il PIN, poi VARCO compila i campi.
  - Dopo lo sblocco restano disponibili per 5 minuti senza chiederlo di nuovo.
- **Salvare:** dopo un accesso compare **Salvare la password per …?** con **Salva** e **Mai**. Se la password è cambiata, la domanda diventa **Aggiorna**.
  - Funziona anche con gli accessi in due passaggi (prima l'email, poi la password).
- **Menu → Password** (con lo sblocco): l'elenco per sito. Per ogni account puoi **Mostrare**, **Copiare** la password o il nome utente, **Aprire il sito**, **Eliminare**. In fondo ci sono i **Siti esclusi**.
- Serve un blocco schermo impostato (PIN, sequenza o impronta). Senza, VARCO non mostra le password.

## Sincronizzazione
- Parte da sola mentre VARCO è aperto sul telefono e il PC è sulla stessa Wi-Fi: al controllo dei 5 secondi, quando c'è qualcosa di nuovo.
- **Solo in casa:** preferiti e password non passano mai da ntfy.sh. Fuori casa passano solo le schede, come nella 0.32.
- **PC, Impostazioni → Telefono → Sincronizza le password col telefono:** acceso di default. Spento, si sincronizzano solo i preferiti.
- La prima volta il telefono riceve tutti i preferiti e tutte le password del PC.

## Modalità insegnamento
- **Lapidi:** se togli un preferito, VARCO non lo dimentica subito. Lascia una "lapide" con l'ora: senza, alla sincronizzazione l'altro lato lo rimetterebbe ("ce l'ho io!"). Le lapidi spariscono dopo 90 giorni.
- **Vince l'ultimo:** ogni preferito e ogni password ha l'ora dell'ultima modifica. Fondendo i due elenchi, per ogni indirizzo (o sito + nome utente) vince la modifica più recente. A parità vince la lapide.
  - La regola è scritta due volte, in `lib/sync-rules.cjs` e in `SyncRules.kt`, e i test dei due lati usano gli stessi casi.
- **Impronte:** a ogni controllo il PC manda un'impronta corta dei suoi elenchi (SHA-256 di indirizzi e ore, senza password). Se l'impronta è uguale all'ultima e sul telefono non è cambiato niente, non si manda nulla.
- **Le password sul telefono:**
  - stanno in un file cifrato con AES-256-GCM, con la chiave nel **Keystore** di Android: la chiave non esce dal telefono e VARCO la può solo usare, non leggere;
  - per vederle o compilarle serve lo sblocco (BiometricPrompt di Android), mentre la sincronizzazione scrive nel file anche col telefono bloccato;
  - in rete viaggiano dentro le buste cifrate del collegamento, sulla Wi-Fi di casa.
- **Chi decide il sito:** lo script nella pagina dice solo "hai toccato un campo di accesso". Il sito lo legge VARCO dall'indirizzo vero della pagina, e la password entra nella pagina solo dopo lo sblocco, e solo se la pagina è ancora sullo stesso sito.
- **Copiare:** la password copiata è segnata come "sensibile", quindi Android non la mostra nell'anteprima degli appunti.

## Test da fare
- [ ] **T205** — Installa le due versioni, con telefono e PC sulla stessa Wi-Fi. Entro pochi secondi Menu → Preferiti sul telefono mostra i preferiti del PC. **📸**
- [ ] **T206** — Telefono: apri una pagina → Menu → Aggiungi ai preferiti. Compare sulla Home del telefono e, entro pochi secondi, nei Preferiti del PC.
- [ ] **T207** — PC: togli quel preferito. Sul telefono sparisce, e non torna dopo il controllo successivo.
- [ ] **T208** — Telefono: Menu → Password. Chiede l'impronta o il PIN, poi mostra le password del PC.
- [ ] **T209** — Apri il sito di un account salvato e tocca il campo dell'email: compare "🔑 Accedi come …". Toccalo, sblocca, e i campi si compilano. **📸**
- [ ] **T210** — Accedi a un sito nuovo scrivendo la password a mano: compare "Salvare la password?". Salva. Entro pochi secondi la password è anche sul PC, in Impostazioni → Password.
- [ ] **T211** — Telefono: elimina quella password. Sparisce anche dal PC.
- [ ] **T212** — PC: spegni Sincronizza le password. Una password nuova salvata sul PC non arriva più sul telefono, mentre i preferiti sì.

**Stato:**
- 170 test sul PC (3 nuovi sulla sincronizzazione) e 20 sul telefono, più la prova dal vivo.
- **Provato dal vivo** con il codice Kotlin (`LinkLiveTest`) contro un VARCO di prova: abbinamento, preferito e password mandati col messaggio sync, che il PC ha salvato e rimandato fusi.
- **Non ancora provato su un telefono vero:** compilazione e salvataggio nelle pagine, sblocco con l'impronta, fila dei preferiti sulla Home. Li vedi tu per primo.
