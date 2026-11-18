# Brief — Pagina del progetto (0.43.2, fase C)

Dominio: app
Data: 2026-11-17

## 1. Estetica
Dentro VARCO: vetro scuro, accento del tema (viola #7c6cff, secondo accento azzurro #6fd3ff), bordi sottili.
Una pagina interna per progetto, non solo il pannello laterale. Funziona come una bacheca: i riquadri si spostano col mouse e restano dove li lasci.

## 2. Riferimenti (board «Website design», pin scelti fuori dai soliti)
- **#14 schermata a flusso di dati**: nodi collegati da fili luminosi su fondo scuro → la tela libera (fili tra server, build e log).
- **#1 Dark Admin Panel (glassmorphism)**: tessere-cartella e tabella dei file recenti → riquadri «File recenti» e «Screenshot».
- **#27 Smart Calendar Dashboard**: lista attività con la striscia colorata a sinistra → riquadro «Attività».
- **#9 Floating UIs (Sebastian Stapelfeldt)**: pannelli che galleggiano, etichette piccole e calme → intestazioni dei riquadri, tanta aria.
- **#62 Habit tracker scuro**: monocromo, bordi a filo, griglia precisa → la bacheca a griglia.

## 3. Intento
Contenuto d'esempio: **Destiny Builder** (Unity 2022.3, repo GitHub).
Riquadri:
- **Stato del server** con gli errori accanto (fase, indirizzo, porte, ultimo errore);
- **Azioni**: apri anteprima, Visual Studio / Unity, build, log;
- **File recenti**;
- **Note** (si scrivono lì);
- **Attività**: spunta, elimina, aggiungi;
- **Risorse**: GitHub, Unity Docs, Trello, Asset;
- **Screenshot**: conteggio e caricamento delle immagini (trascina o scegli).
Si possono aggiungere riquadri (file, screenshot, stati, note in più).
Tutto (posizioni, note, attività, screenshot) va nella cartella **`.varco`** del progetto, che viaggia con git.

## 4. Varianti
- **v1-tela** — tela libera «come i nodi di Blender»: si trascina, si ingrandisce e rimpicciolisce, i riquadri hanno prese collegate da fili (server → anteprima, build → log).
- **v2-bacheca** — bacheca a griglia: i riquadri si agganciano a una griglia a 12 colonne, si spostano e si ridimensionano; gli altri si fanno da parte.
L'utente vuole vederle entrambe: nella versione finale la pagina può avere **tutte e due le viste con un interruttore** (stessi riquadri, due disposizioni).
