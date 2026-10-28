# Browser Beta 0.9 — JARVIS

**Branch:** `beta-0.9-jarvis` (parte dalla 0.8, non unito a `main`).

Il browser diventa uno **strumento di JARVIS**: un piccolo server MCP (Model Context Protocol) sul tuo PC permette a JARVIS, o a qualunque client MCP come Claude Code, di aprire e leggere pagine, guidare i progetti e muovere la sfera della Home.

## Come si attiva

1. Sidebar → **◉ JARVIS** → **Server MCP attivo** (oppure dal menu dell'icona nell'area di notifica).
2. Il browser scrive indirizzo e token in `%APPDATA%\personal-workspace-browser\jarvis-mcp.json`.
3. JARVIS legge quel file e si collega. Esempio pronto: [examples/jarvis_browser.py](examples/jarvis_browser.py) (`pip install "mcp>=1.9"`), provato con l'SDK ufficiale `mcp` 2.3.0 e scritto per funzionare anche con la 1.x. Per un altro file di configurazione: variabile `JARVIS_BROWSER_CONFIG`.
4. Per **Claude Code** o un altro client: **Copia configurazione** e incollala nel suo `.mcp.json`.

È **spento** finché non lo attivi. Quando lo spegni, il file `jarvis-mcp.json` viene cancellato e la porta chiusa.

## Gli strumenti

| Strumento | Cosa fa |
|---|---|
| `list_workspaces` | Workspace, finestre aperte, schede, progetto, disposizione salvata |
| `list_tabs` | Schede con `tab_id`, titolo, indirizzo, finestra, se è caricata |
| `open_url` | Apre un indirizzo (workspace, finestra, in background) |
| `search` | Cerca sul web; valgono le ricerche rapide del progetto (`lg …`) |
| `activate_tab` / `close_tab` | Mostra o chiude una scheda |
| `read_page` | Testo di una pagina caricata (disattivabile) |
| `open_workspace` / `apply_layout` | Apre un workspace / ne ripristina la disposizione sui monitor |
| `project_status` | Comandi, monitor delle API, segreti impostati (mai i valori) |
| `project_logs` | Ultime righe di log di un comando |
| `project_run` | Avvia un comando: **il browser ti chiede conferma ogni volta** |
| `project_stop` | Ferma un comando |
| `set_orb_state` | Sfera `idle` / `thinking` / `speaking` con un messaggio; torna idle da sola dopo 2 minuti |

Quando JARVIS è collegato, la sfera della Home segue il suo stato in tutte le finestre (anche quella piccola in alto a destra) e i pulsanti dimostrativi scompaiono.

## Sicurezza

- **Solo questo PC:** il server ascolta su `127.0.0.1`, non è raggiungibile dalla rete.
- **Token:** 64 caratteri casuali, obbligatori in ogni richiesta (`Authorization: Bearer …`). **Rigenera token** invalida quello vecchio.
- **Le pagine web non possono usarlo:** richieste con `Origin` di un sito vengono rifiutate (403), così come quelle con un `Host` diverso da `127.0.0.1`/`localhost` (difesa dal "DNS rebinding"). Una pagina aperta nel browser che prova a chiamare il server fallisce prima ancora di arrivarci.
- **Comandi solo con il tuo sì:** `project_run` apre una finestra di conferma con il comando esatto e la cartella. Valgono anche le regole della 0.7: il progetto deve essere "fidato".
- **Lettura delle pagine disattivabile:** con l'interruttore spento, `read_page` restituisce un errore. Il testo viene letto in un **mondo isolato** (lo script della pagina non può falsificarlo) e arriva a JARVIS con l'avviso che sono dati e non istruzioni. Le istruzioni del server lo ricordano al modello: una pagina può contenere testo scritto per ingannare un assistente.
- **I segreti non escono mai:** `project_status` dice solo se un segreto è impostato.

## Modalità insegnamento

### Protocollo (`mcp-protocol.cjs`, senza Electron)
- MCP è **JSON-RPC 2.0**. Metodi gestiti: `initialize`, `ping`, `tools/list`, `tools/call`. Le notifiche (senza `id`, es. `notifications/initialized`) non ricevono risposta: HTTP **202**.
- **Versione:** se il client chiede `2025-06-18`, `2025-03-26` o `2024-11-05` la usiamo; altrimenti rispondiamo con la più recente e decide il client.
- **Errori:** un errore di uno strumento (scheda inesistente, argomento sbagliato) è un risultato con `isError: true`, così il modello lo legge e si corregge. Uno strumento o un metodo sconosciuto è invece un errore JSON-RPC.
- `validateArguments()` controlla un sottoinsieme di JSON Schema (`type`, `enum`, `minimum`, `maximum`, `maxLength`, `required`) e **rifiuta gli argomenti non dichiarati**.
- `checkHttpRequest()` raccoglie i controlli di Host, Origin, token e metodo.

### L'SDK Python tra 1.x e 2.x (`examples/jarvis_browser.py`)
Provando l'esempio con `mcp` 2.3.0 sono emerse tre differenze rispetto alla 1.x, ora gestite nell'esempio:
- il trasporto si chiama `streamable_http_client` (prima `streamablehttp_client`) e restituisce 2 valori invece di 3;
- gli header non si passano più direttamente: servono a `create_mcp_http_client(headers=...)`, il cui client va dato a `streamable_http_client(http_client=...)`;
- i campi del risultato sono `is_error` e `structured_content` (prima `isError` e `structuredContent`).
`terminate_on_close=False` evita la richiesta DELETE di chiusura sessione, che un server senza sessioni non usa.

### Trasporto (`jarvis.cjs`)
- **Streamable HTTP** su `POST /mcp` con risposte `application/json`. `GET` (stream SSE) risponde 405, come previsto dal protocollo per i server senza stream.
- **Senza sessioni** (nessun `Mcp-Session-Id`): se il browser si riavvia, JARVIS continua senza ricollegarsi. Basta che legga di nuovo il file se la porta è cambiata.
- **Porta 37201**; se è occupata ne prende una libera e la scrive nel file.
- Richieste oltre 1 MB vengono rifiutate (413).

## Prova su Windows

```powershell
git switch beta-0.9-jarvis
npm run check
npm start
```

Verifica:
- [ ] ◉ **JARVIS** → **Server MCP attivo**: compare "In ascolto su http://127.0.0.1:37201/mcp".
- [ ] `pip install "mcp>=1.9"` e `python examples/jarvis_browser.py`: la sfera passa a *thinking*, si apre una ricerca, la sfera parla e torna idle.
- [ ] Nel pannello, **Attività** mostra le richieste.
- [ ] Da JARVIS, `project_run` su Destiny Builder: compare la conferma; **Nega** → JARVIS riceve "L'utente ha negato l'avvio".
- [ ] Spegni **Può leggere il testo delle pagine**: `read_page` viene rifiutato.

**Stato:** 81 test superati. Prova reale con un client MCP scritto per il test (stesso protocollo dell'SDK Python): `initialize` (versione 2025-06-18), notifica → 202, 14 strumenti, sfera *thinking* in tutte e 3 le finestre con il messaggio, `open_url` nella finestra 2, `read_page` del testo di example.com, `search` con ricerca rapida del progetto, `project_status` (comandi, monitor, segreti senza valori), `close_tab`, errori chiari (scheda inesistente, argomento sbagliato, Home non leggibile, strumento sconosciuto), token sbagliato → 401, Origin di un sito → 403, Host estraneo → 403, GET → 405, richiesta da una pagina web aperta nel browser bloccata, lettura disattivata rifiutata, server spento con file cancellato e porta chiusa.
**Esempio Python con l'SDK vero:** `mcp` 2.3.0 in un ambiente virtuale di prova (Python 3.12): connessione, 14 strumenti, `list_workspaces`, `search`, `read_page` (2000 caratteri, titolo corretto), sfera *thinking* → *speaking* → *idle*; nel pannello il client compare come `mcp` e tutte le chiamate risultano riuscite.
**Non provato:** la finestra di conferma di `project_run` (è una finestra di Windows da cliccare a mano).

## Limiti noti
- Niente notifiche dal browser a JARVIS (es. "il Manifest è cambiato"): JARVIS deve chiedere con `project_status`. Servirebbe lo stream SSE, previsto più avanti.
- Un solo token per tutti i client.
