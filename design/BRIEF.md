# Brief — Pagina Impostazioni di VARCO

Dominio: app
Data: 2026-11-02

## 1. Estetica
varco-cosmic-glass (identità attuale): fondo notturno, pannelli di vetro scuro, un solo accento viola usato con parsimonia. Nel round 1 lo stile resta fisso: si confronta la **struttura**.

## 2. Riferimenti
- `Reference/Implementati/VARCO Cosmic Browser UI System.png` — titoli in maiuscolo spaziato, card con bordo sottile, la calma della composizione
- `Reference/Reference altri browser/Vivaldi.png` — pannelli che riassumono uno stato con numeri grandi
- Windows 11 Impostazioni / macOS System Settings — navigazione per categorie (solo come schema, da confrontare)

## 3. Intento
- Cosa: la scheda interna `app://settings` (Ctrl+, · ⚙ · `>impost`)
- Per chi: l'utente di VARCO (uso quotidiano, Windows 11, anche gaming e progetti)
- Azione desiderata: trovare e cambiare un'impostazione in **≤ 2 passi** (un clic o una ricerca + un clic), capire subito lo stato delle cose importanti (aggiornamenti, telefono, blocco pubblicità, password)
- Contesto: oggi ~25 sezioni in un'unica pagina a due colonne con indice a chip e ricerca; è lunga e tutto ha lo stesso peso

## 4. Guardrail
Sempre:
- ricerca nelle impostazioni, raggiungibile da tastiera
- azioni pericolose (cancella cronologia/cookie, elimina password) con conferma in due passi, come oggi
- stati disegnati: ricerca senza risultati, errore (es. aggiornamento non riuscito), elenco lungo (100+ password), sezione non disponibile
- testi in italiano, nello stile delle guide: frasi brevi e concrete
- token esistenti di `style.css` (`--v-*`, `--r-*`, `--fs-*`, `--dur-*`)

Mai:
- gradienti viola decorativi, blob, glow ovunque
- 4 card KPI in alto "perché le dashboard ce l'hanno"
- emoji come icone di sezione
- tutto con lo stesso peso visivo

## Round
Varianti al round 1: 5 (struttura)
