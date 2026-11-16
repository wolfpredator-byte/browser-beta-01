# Brief — Command center di VARCO (0.38)

Dominio: app
Data: 2026-11-16

## 1. Estetica
Dentro lo stile di VARCO (vetro scuro, accento del tema: Cyan Flash), con una famiglia della board per variante:
pro-dock (sezioni), file-commander (colonne), radial-command (anello), soft-glass/widget (bacheca), island/neon (isola).
In questo round cambia soprattutto la **struttura**; lo stile resta vicino a VARCO per confrontare il flusso.

## 2. Riferimenti
- Board "Website design", pin recenti: 7/8/13/15 (anello e sottomenu a ventaglio), 1/18 (file manager, barra che si espande), 2/22/23 (capsule, segmentati, isola dalla tacca), 14 (ventaglio di nodi).
- Command center attuale (Beta 0.12.1, lib/palette.cjs): barra al centro sopra la pagina sfocata, al massimo 6 risultati in una lista piatta.

## 3. Intento
- Cosa: il command center (F1 / Ctrl+Shift+P) diventa il punto da cui **trovare, aprire e creare** tutto.
- Per chi: l'utente di VARCO con più workspace (sviluppo, gaming, studio), progetti con dev server, tante schede, Jarvis.
- Azioni:
  - risultati in **sezioni espandibili**: Apri subito, Schede, Progetti (anche cartelle e dev server), Comandi, Fast link (fissati, gruppi, scorciatoie), Web (Google con suggerimenti), Jarvis, Crea;
  - per ogni risultato un'**azione principale** (Invio) e **azioni secondarie** (Tab o ←/→);
  - **prima il workspace attivo**, poi il resto; un selettore "Dove cercare";
  - **anteprima** al passaggio del mouse: miniatura del sito o della scheda, percorso del file, ultime modifiche del progetto;
  - **creare**: nota, task, fast link, workspace, sessione, prompt;
  - **Jarvis**: Chiedi a Jarvis, Riassumi la pagina, Salva nel progetto (oggi scritti, domani a voce).
- Passi: aprire qualcosa = F1, 2–3 lettere, Invio. Azione secondaria = + Tab.

## 4. Guardrail
Sempre:
- tutto da tastiera: ↑/↓ risultati, Tab/←/→ azioni, Invio esegue, Esc chiude, scorciatoie di sezione
- stati disegnati: vuoto (nessun testo), nessun risultato, tanti risultati (100+ schede), titoli lunghissimi, Jarvis non avviato
- la pagina dietro resta riconoscibile (sfocata), come oggi
- funziona con tutti i temi di VARCO (accento del tema)

Mai:
- gradienti viola→rosa decorativi, blob 3D, emoji come icone
- loghi, testi o immagini presi dai pin
- una lista piatta senza gerarchia

## Round
Varianti al round 1: 5 (struttura diversa per variante)
