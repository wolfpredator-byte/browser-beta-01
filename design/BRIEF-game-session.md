# Brief — Pagina del gioco e sessione (0.43.3, fase D, prima parte)

Dominio: app
Data: 2026-11-18

## 1. Estetica
Stessa tela e stesso stile «Strumento» della pagina del progetto (0.43.2), con i colori del tema di VARCO.
Più «apparecchio» dove serve al gioco:
- i timer sono blocchi di colore pieno con numeri grossi (pin dei quattro timer);
- gli avvisi sono schede compatte come il pannello «Alerts»;
- la scelta del preset è a tasti grossi, come gli interruttori Yodzi.

## 2. Riferimenti (board «Website design»)
- **Timer a blocchi di colore** (lime, giallo, arancio, rosso su nero) → riquadro Timer.
- **Termometro giallo su nero** → barra della sessione (tempo passato, tacche).
- **Manopola / «Instruments»** → scelta del preset all'avvio.
- **Pannello avvisi** → avviso di fine sessione.

## 3. Intento
Esempio: **Destiny 2** (Steam, FPS · MMO), workspace Gaming.
- **Pagina del gioco (tela):**
  - scheda del gioco: stato, monitor, companion, sessione in corso, preset;
  - obiettivi della sessione;
  - timer (reset settimanale, fase DPS);
  - note tattiche;
  - link rapidi (wiki, DIM, light.gg, raid.report, Discord, YouTube);
  - catture (screenshot e clip della sessione, da Steam / Xbox Game Bar / NVIDIA);
  - build (equipaggiamento);
  - sessioni passate.
- **Preset di gioco:** Raid, PvP, Streaming, Giocatore singolo. Decidono quali siti e pannelli aprire, il companion, i timer e le note.
- **Avvio:** quando il gioco parte compare la scelta del preset in un angolo dello schermo, sopra il gioco come l'overlay multimediale. Dopo 10 secondi si usa l'ultimo preset.
- **Fine:** quando il gioco si chiude, compare l'avviso «Salvare note e catture nella sessione di oggi?» con il riepilogo (durata, preset, catture da scegliere, note).
- **Dove si salva:** se il workspace del gioco ha una cartella, in `.varco/sessioni/`. Altrimenti in `Documenti\VARCO\Giochi\<gioco>\`.

## 4. Varianti
Una sola tela (lo stile è già scelto). Nell'esempio i due momenti si provano con i pulsanti «Simula avvio» e «Simula chiusura».
