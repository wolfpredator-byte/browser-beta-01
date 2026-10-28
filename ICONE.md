# Icone e logo — VARCO

> **Fatto (Beta 0.13):** il VARCO Icon System v1 è in `assets/icons/` (SVG) e `assets/app-icon.*`, `assets/tray-icon*.png`, ed è collegato all'interfaccia. Questo elenco resta come riferimento per nuove icone.

Questo è l'elenco di **tutte** le icone del browser, così puoi disegnarle tu (o farle disegnare). Oggi quasi tutte sono **caratteri Unicode** (◈ ⌂ ☆ …). Funzionano, ma hanno spessori e dimensioni diverse tra loro e cambiano aspetto da un font all'altro: è il motivo per cui alcune sembrano "fuori posto".

## Come consegnarle

- **Formato:** SVG, con viewBox `0 0 24 24`, a tratto (stroke) e senza riempimenti pesanti. Spessore del tratto uniforme, consigliato **1.75 px**, angoli arrotondati.
- **Colore:** un solo colore, `currentColor`. Il browser le colora da solo: bianco, grigio, giallo per gli avvisi e così via. Niente sfumature.
- **Dimensioni d'uso:** 16 px (schede, suggerimenti), 18–20 px (barra in alto, barra laterale). Prova sempre il disegno a 16 px: i dettagli fini spariscono.
- **Nomi file:** quelli della colonna "File" qui sotto. Vanno messi in `assets/icons/` e il collegamento all'interfaccia lo faccio io.
- **Stile:** coerente con il logo. Oggi il simbolo è il rombo ◈; se cambi il logo, le icone dovrebbero seguirne il carattere (geometriche, rotonde o spigolose).

## 1. Logo (priorità alta)

| File | Dove si vede | Dimensioni | Note |
|---|---|---|---|
| `logo.svg` | Barra del titolo, in alto a sinistra nella toolbar, Home | 24–32 px | Versione monocromatica, su sfondo scuro |
| `app-icon.png` | Icona del programma: barra delle applicazioni, menu Start, installer | 256×256 (meglio anche 512) | A colori se vuoi; deve leggersi anche a 16 px. Oggi è `assets/app-icon.png` |
| `tray-icon.png` + `tray-icon@2x.png` | Area di notifica di Windows | 16×16 e 32×32 | Deve leggersi su barra **chiara e scura**: oggi bianco con bordo scuro. Oggi è generata da `scripts/make-icons.cjs` |

## 2. Barra in alto (toolbar)

| File | Oggi | Azione |
|---|---|---|
| `sidebar-toggle.svg` | ▥ | Mostra / nascondi la barra laterale |
| `back.svg` | ← | Indietro |
| `forward.svg` | → | Avanti |
| `reload.svg` | ↻ | Ricarica (usata anche in "Riprova" nella pagina di errore) |
| `home.svg` | ⌂ | Home |
| `shield.svg` | ⛉ | Scudo del sito: blocco pubblicità e permessi (con un pallino numerato sopra) |
| `shield-warning.svg` | ⛉ giallo | Variante per i siti non protetti (http). Facoltativa: oggi cambia solo il colore |
| `commands.svg` | ⌘ | Comandi (F1) |
| `bookmark.svg` / `bookmark-filled.svg` | ☆ | Aggiungi ai preferiti / già nei preferiti |
| `download.svg` | ↓ | Download (con pallino quando un download è in corso) |
| `jarvis.svg` | sfera bianca animata | Torna alla Home di JARVIS. **Resta animata in CSS**: serve solo se vuoi un'icona statica |

## 3. Barra laterale

| File | Oggi | Voce |
|---|---|---|
| `menu.svg` | ☰ | Espandi / riduci la barra |
| `workspace-add.svg` | ＋ | Nuovo spazio |
| `bookmarks.svg` | ☆ | Preferiti |
| `history.svg` | ◷ | Cronologia |
| `tabs.svg` | ▤ | Schede aperte |
| `downloads.svg` | ↓ | Download |
| `games.svg` | ♞ | Giochi (companion) |
| `project.svg` | ⧉ | Progetto del workspace |
| `jarvis-panel.svg` | ◉ | JARVIS (server MCP) |
| `settings.svg` | ⚙ | Impostazioni |

### Icone predefinite dei workspace
Ogni workspace può già avere un'immagine tua (click destro → Cambia icona). Senza immagine si usano queste:

| File | Oggi | Workspace |
|---|---|---|
| `ws-personal.svg` | ⌂ | Personale |
| `ws-project.svg` | ◈ | Destiny Builder (in generale: un progetto) |
| `ws-gaming.svg` | ♜ | Gaming |
| `ws-default.svg` | ▣ | Tutti gli altri |

## 4. Barra delle schede (in basso)

| File | Oggi | Uso |
|---|---|---|
| `workspace-switch.svg` | ◈ … ▾ | Scelta del workspace, a sinistra |
| `tab-new.svg` | ＋ | Nuova scheda |
| `tab-reopen.svg` | ↶ | Riapri l'ultima scheda chiusa |
| `tab-more.svg` | ⋯ | Menu della scheda |
| `close.svg` | × | Chiudi (schede, pannelli, ricerca nella pagina) |
| `stack-open.svg` / `stack-closed.svg` | ▾ / ▸ | Stack di schede aperto / compresso |
| `home-tab.svg` | ⌂ | Titolo della scheda Home |
| `settings-tab.svg` | ⚙ | Titolo della scheda Impostazioni (può coincidere con `settings.svg`) |
| — | cerchio che gira | Caricamento: resta in CSS, non serve un file |

## 5. Suggerimenti della barra degli indirizzi e altro

| File | Oggi | Uso |
|---|---|---|
| `search.svg` | ⌕ | Riga "Cerca «…»", barra di ricerca nella pagina, ricerca della Home |
| `command.svg` | › | Righe dei comandi |
| `find-prev.svg` / `find-next.svg` | ↑ / ↓ | Risultato precedente / successivo (Ctrl+F) |
| `warning.svg` | ⚠ | Pagina di errore |
| `lock.svg` | 🔒 | "Connessione protetta" nel pannello del sito (oggi è un'emoji a colori) |
| `external.svg` | ↗ | Pulsante di ricerca della Home; workspace aperto in un'altra finestra |

Le **etichette** dei suggerimenti (SCHEDA, COMANDO, PREFERITO…) sono testo e restano testo.

## Priorità consigliata

1. **Logo**, `app-icon.png` e icona dell'area di notifica: sono le prime cose che si vedono.
2. **Barra in alto** e **barra laterale**: sono le icone sempre visibili.
3. Tutte le altre.

Quando hai i file, mandameli: li collego, tolgo i caratteri Unicode e rigenero l'installer.
