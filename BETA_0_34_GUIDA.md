# VARCO Beta 0.34 — Impostazioni a riquadri

Installer PC: `dist\VARCO Setup 0.34.0.exe`. Il telefono non cambia: resta alla 0.33.

La pagina **Impostazioni** non è più un'unica pagina lunga: è una **panoramica** che dice com'è messo VARCO, e ogni parte si apre in un **pannello a destra**. Nasce dal lavoro con `/explore` (varianti, scelte e token in `design/explore/LOG.md`).

## Cosa cambia
- **7 riquadri:** Aspetto, Ricerca e navigazione, Schede, Privacy e sicurezza, Telefono, Estensioni, Sistema.
  - Ognuno dice in parole com'è messa la sua parte: "Google · 14 scorciatoie", "Blocco attivo · 12 password · 3 siti con permessi", "Pixel 8 collegato · visto 4 minuti fa".
  - Alcuni hanno 1–2 **interruttori rapidi** (Tema chiaro, Video in finestrella, Blocca pubblicità, Collegamento in casa, Avvia con Windows…).
- **Da sistemare:** compare in alto quando il telefono non riesce a mettersi in ascolto o il controllo degli aggiornamenti non riesce. **Risolvi →** apre la categoria e fa lampeggiare la sezione in errore.
- **Un clic su un riquadro** apre il pannello a destra con le sezioni di sempre, con gli stessi pulsanti di prima. I riquadri restano cliccabili accanto. **Esc** o **Chiudi** lo chiudono.
- **Ricerca:** come prima, mostra intere tutte le sezioni che contengono il testo. Gli indici a chip in cima non ci sono più.
- **Movimento:** il pannello scorre lento (700 ms). Con Impostazioni → Interfaccia → Animazioni **Ridotte** dura 130 ms, con **Spente** è immediato.

## Modalità insegnamento
- **Le sezioni non sono cambiate.** `renderSettings()` le costruisce come prima; il nuovo `layoutSettings()` decide solo dove metterle: nei riquadri, nel pannello o nei risultati della ricerca. Così ogni pulsante e ogni comando restano quelli già provati.
- **`settings-rules.js`:** a quale categoria va ogni sezione, la riga di stato di ogni riquadro e cosa finisce in "Da sistemare". Come `palette-rules.js` è caricato due volte, dalla cornice e dai test di Node, quindi i riassunti sono verificati da `node --test`. Una sezione nuova senza categoria finisce in Sistema.
- **Token `--s-*`** in `style.css`: colonne, spazi, vetro, pannello, titoli, durata. Sono quelli scelti con il pannello Tweaks e valgono solo dentro le Impostazioni. Accento e sfondo restano quelli di Aspetto.

## Test da fare
- [ ] **T213** — Ctrl+, apre la panoramica con 7 riquadri e le righe di stato con i tuoi dati veri. **📸**
- [ ] **T214** — Clic su Privacy e sicurezza: il pannello entra da destra con Password e Privacy. Esc lo chiude.
- [ ] **T215** — Un interruttore rapido (es. Video in finestrella) cambia la stessa impostazione che c'è nel pannello Schede.
- [ ] **T216** — Scrivi `password` nella ricerca: compaiono intere Telefono, Password, Estensioni e Dati. Scrivi `zzz`: "Nessuna impostazione trovata".
- [ ] **T217** — Con Animazioni → Ridotte il pannello si apre quasi subito.

**Stato:**
- 174 test superati, di cui 4 nuovi (`test/settings-rules.test.cjs`).
- **Provato in VARCO** con un profilo di prova: panoramica, pannello, Esc, ricerca con e senza risultati, "Risolvi →" con errori di telefono e aggiornamenti simulati.
- **Non ancora provato** con i tuoi dati e dall'installer: li vedi tu per primo.
