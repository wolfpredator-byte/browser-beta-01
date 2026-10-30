# VARCO Beta 0.25 — Gestore delle password

Installer: `dist\VARCO Setup 0.25.0.exe`. Contiene anche la 0.24 / 0.24.1, cioè il gestore delle schede e la barra senza barre di scorrimento.

## Come funziona
- **Dopo un accesso** compare la notifica **"Salvare la password per sito?"** con il nome utente:
  - **Salva**;
  - **Mai per questo sito**;
  - la × vuol dire "non ora".
  - Se la password di un account salvato cambia, la notifica chiede **"Aggiornare?"**.
- **Accessi in due passaggi** (prima l'email, poi la password in un'altra pagina, come Google): VARCO ricorda l'email per 10 minuti e la abbina alla password.
- **Compilazione:** cliccando nel campo email/utente o password di un sito di cui hai account salvati, sotto il campo compare **"VARCO · account salvati"**. Scegli l'account e vengono compilati nome utente e password. Esc chiude l'elenco.
- **Impostazioni → Password:**
  - elenco con ricerca;
  - **Mostra** (per 30 secondi), **Copia** (resta negli appunti 30 secondi, poi viene tolta) ed **Elimina**;
  - siti esclusi, con × per tornare a proporre il salvataggio;
  - interruttore "Proponi di salvare".
- **Importa da Chrome, Edge o Firefox:** prima esporti le password in CSV dal vecchio browser, poi le importi qui. In Chrome: Impostazioni → Password → Esporta password. Gli account già presenti vengono aggiornati.

## Sicurezza (modalità insegnamento)
- **Cifratura:** le password sono cifrate con la **protezione dati di Windows** (DPAPI, tramite `safeStorage` di Electron) in `passwords.json`, nella cartella dei dati. Solo il tuo account Windows sul tuo PC può decifrarle: copiato su un altro PC, il file è illeggibile. In chiaro restano solo sito e nome utente.
- **Il sito lo decide VARCO**, dall'indirizzo vero della pagina, non da ciò che la pagina dichiara. Una pagina non può farsi dare le password di un altro sito.
- Solo **https** (e `localhost` per lo sviluppo): sui siti http in chiaro su Internet VARCO non salva e non compila. Solo la pagina principale, non i riquadri incorporati di altri siti.
- La pagina **non vede l'elenco degli account**: sta in uno shadow DOM chiuso, creato dallo script isolato di VARCO. La password arriva alla pagina **solo dopo un clic vero** su un account (`isTrusted`), mai da sola.
- **Mostra e Copia** funzionano solo dalla cornice di VARCO: JARVIS e gli altri client MCP non possono leggere le password.
- La password appena digitata resta **solo in memoria** finché non premi Salva, al massimo 5 minuti, e non passa dalla notifica: la notifica ha solo un codice casuale.

## Test da fare
- [ ] **T144** — Accedi a un sito (per esempio GitHub o Reddit): compare "Salvare la password per …?". Premi **Salva**. **📸**
- [ ] **T145** — Esci e torna alla pagina di accesso. Clicca nel campo email: compare l'elenco **VARCO · account salvati**. Sceglilo: email e password compilate. **📸**
- [ ] **T146** — Accesso Google (email, poi password in un'altra pagina): la notifica propone l'account con l'email giusta.
- [ ] **T147** — Impostazioni → Password: Mostra, Copia (incolla da qualche parte, dopo 30 secondi gli appunti sono vuoti), Elimina.
- [ ] **T148** — Esporta le password da Chrome o Edge in CSV e importale: "Importate N nuove…". Poi cancella il file CSV, che contiene le password in chiaro.
- [ ] **T149** — Su un sito: "Mai per questo sito". In Impostazioni compare tra i siti esclusi; la × lo toglie.

**Stato:** 139 test superati, di cui 3 nuovi: origini, quando salvare o aggiornare, CSV di Chrome e Firefox con virgolette e a capo. Provato nell'app con una pagina di accesso locale di prova e credenziali finte:
- dopo l'invio la notifica propone il salvataggio con l'email giusta;
- nel file la password non compare in chiaro;
- ricaricando la pagina, un clic vero nel campo mostra l'elenco, e lo shadow DOM non è leggibile dalla pagina;
- scegliendo l'account vengono compilati email e password;
- Mostra funziona;
- l'importazione CSV ha aggiunto il nuovo account, lasciato invariato quello identico e scartato quello http.

Il profilo di prova è stato ripulito.
