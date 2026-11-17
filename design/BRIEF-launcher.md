# Brief — Launcher e fast link di VARCO (0.39)

Dominio: app
Data: 2026-11-16

## 1. Estetica
Vetro scuro di VARCO con l'accento del tema (Cyan Flash). Una famiglia della board per variante:
island (barra che scende dall'alto), side-rail (colonna sul bordo dello schermo), radial-command (anello, già scelto nella 0.38), frosted-tiles (tessere di vetro).
Il launcher deve stare **sopra qualsiasi cosa**: un gioco a schermo intero, il desktop o VARCO stesso. Si vede cosa c'è dietro.

## 2. Riferimenti
- Board "Website design", pin recenti: frosted / clear / blur, colonna di widget rotondi sul bordo, manopola radiale con ventaglio, isola dalla tacca.
- Command center 0.38 (Bacheca e Anello): stesse sezioni, azioni con Tab, anteprime. Il launcher è il fratello **leggero e veloce**.
- Idea dell'utente (memoria fast-link-vision): fast link globali / workspace / sessione, scorciatoie, gruppi, "in Home".

## 3. Intento
- Cosa: un launcher che si apre con **una combinazione di tasti anche fuori da VARCO** (in gioco, sul desktop) e trova tutto: fast link, app del PC, file e cartelle, siti, comandi dei progetti, pannelli web, companion dei giochi, note, JARVIS, ricerche salvate (`!lg testo`).
- Per chi: l'utente che gioca, sviluppa e studia, e vuole fare una ricerca veloce senza uscire da quello che sta facendo.
- Azioni:
  - combinazione (proposta `Ctrl+Alt+Spazio`, cambiabile) → appare sopra; Esc → torna dov'eri;
  - a vuoto: **Fissati** (1–9 li aprono subito) e **Frequenti** (uso + recenza) del contesto;
  - **contesto**: se in primo piano c'è un gioco, prima i suoi companion e il workspace Gaming;
  - scrivendo: risultati da tutte le fonti, filtri per tipo (chip), azione principale (Invio) e secondarie (Tab);
  - aggiungere: "Fissa", trascinare un file, "Aggiungi la pagina corrente" da VARCO;
  - casi: collegamento rotto ("Non trovato · Cambia percorso"), file eseguibile (chiede conferma).
- Passi: combinazione → 2–3 lettere → Invio. Fast link fissato → combinazione → numero.

## 4. Guardrail
Sempre:
- tutto da tastiera; il testo si scrive di fila (niente focus perso, lezione della 0.38.1)
- compatto sopra un gioco: occupa poco e si chiude subito
- la scorciatoia è mostrata e cambiabile; avviso sui conflitti (Alt+Spazio di PowerToys / Windows)
- .exe / .bat / .ps1 chiedono conferma

Mai:
- gradienti viola→rosa decorativi, blob 3D, emoji come icone
- loghi, testi o immagini presi dai pin o dai giochi reali (scene di gioco disegnate in CSS)
- coprire tutto lo schermo senza motivo quando si è in gioco

## Round
Varianti al round 1: 4, ognuna con una struttura diversa; si possono provare sopra Gioco / Desktop / VARCO.
