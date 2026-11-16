# Brief — Lettore multimediale di VARCO (0.37.1)

Dominio: app
Data: 2026-11-16

## 1. Estetica
Dalla board Pinterest dell'utente (`inspiration/pinterest-website-design/`). Una famiglia per variante nel round 1:
liquid-glass, neon-glass, tactile-hardware, pro-dock, brutalist-editorial. Resta il contesto VARCO (fondo notturno, barra delle schede in basso).

## 2. Riferimenti
- Board "Website design": pin 1/3/27 (vetro liquido), 7–12 e 39 (bordi e aloni neon), 5 e 14 (interruttore arancione, comandi fisici), 26/33/48 (dock a pillola), 28/71/72 (tipografia enorme, griglia a vista).
- Lettore attuale della 0.37.1: mini-lettore nella barra delle schede + pannello laterale "In riproduzione" (da spostare in basso).

## 3. Intento
- Cosa: mini-lettore nella barra delle schede in basso + pannello "In riproduzione" che si apre **dalla barra in basso**.
- Per chi: l'utente di VARCO, con musica (Spotify, spesso in un pannello web) e video (YouTube) aperti in workspace diversi.
- Azione desiderata: dalla barra, senza cambiare scheda, in **1 clic**: pausa, ±10 s su YouTube, brano successivo, shuffle e ripetizione su Spotify. Vedere tutto ciò che suona in **1 clic** (apertura del pannello).
- Contesto: mentre si lavora o si gioca; il lettore non deve rubare spazio né attenzione.

## 4. Guardrail
Sempre:
- controlli secondo il sito: YouTube (±10 s, barra, muto, PiP), Spotify (precedente/successivo, shuffle, ripeti: spento → tutta la playlist → un brano), messaggio vocale (solo play e barra), diretta (niente barra)
- stati disegnati: niente in riproduzione, un solo media, tanti media (10+), titoli lunghissimi, media sparito
- PiP e "Finestrella automatica" dentro il lettore
- "Vai alla scheda" anche in un altro workspace
- tastiera: Spazio = pausa, frecce = ±10 s quando il lettore è aperto; Esc chiude

Mai:
- gradienti viola→rosa decorativi, blob 3D
- emoji come icone
- raggio e ombra uguali ovunque
- loghi, testi o immagini presi dai pin

## Round
Varianti al round 1: 5 (struttura + famiglia della board)
