// Dati delle Impostazioni di VARCO 0.33, raggruppati in categorie.
// Stessi testi e opzioni di renderer.js; usati da tutte le varianti del round 1.
// window.DEMO dice in che stato mostrare la pagina: normal | error | many.

window.DEMO = new URLSearchParams(location.search).get('stato') || 'normal';

const HOSTS = ['github.com','discord.com','google.com','steamcommunity.com','reddit.com','amazon.it','netflix.com','twitch.tv','notion.so','figma.com',
  'nexusmods.com','epicgames.com','paypal.com','ilpost.it','poste.it','spotify.com','youtube.com','x.com','linkedin.com','openai.com'];
const USERS = ['wolfpredator','nobel.gaming','wolf_dev','n.ilmigliore','wolfpredator.alt'];
function passwords(n){
  return Array.from({length:n},(_,i)=>({id:i,host:(i>=HOSTS.length?`account${i}.`:'')+HOSTS[i%HOSTS.length],
    user:i===7?'':USERS[i%USERS.length]+(i>=HOSTS.length?i:'')}));
}

window.SETTINGS = [
  { id:'aspetto', title:'Aspetto', icon:'palette', summary:()=> 'Preset Cosmic · tema scuro · sfondo Celestial Fjord',
    groups:[
      { title:'Preset', items:[
        { type:'presets', label:'Preset', value:'cosmic', options:[['cosmic','Cosmic'],['vice-city','Vice City'],['ember','Ember'],['midnight-ink','Midnight Ink'],['aurora-forest','Aurora Forest'],['oxford-rose','Oxford Rose']] },
        { type:'action', label:'Salva l’aspetto attuale come preset…' },
      ]},
      { title:'Tema e colori', items:[
        { type:'select', label:'Tema', value:'dark', options:[['dark','Scuro'],['light','Chiaro'],['auto','Come Windows']] },
        { type:'color', label:'Colore accento', value:'#7c6cff' },
        { type:'toggle', label:'Prendi i colori dall’immagine di sfondo', value:false },
        { type:'range', label:'Bagliore', value:60 },
        { type:'range', label:'Grana', value:0 },
      ]},
      { title:'Sfondo', items:[
        { type:'select', label:'Sfondo', value:'img', options:[['img','Immagine'],['gen','Generato'],['none','Tinta unita']] },
        { type:'range', label:'Sfocatura', value:18 },
        { type:'range', label:'Luminosità', value:62 },
        { type:'action', label:'Scegli un’immagine…' },
      ]},
      { title:'Interfaccia', items:[
        { type:'select', label:'Carattere', value:'segoe', options:[['segoe','Segoe UI Variable'],['inter','Inter'],['mono','Cascadia Mono']] },
        { type:'select', label:'Dimensione interfaccia', value:'100', options:[['90','90%'],['100','100%'],['110','110%'],['125','125%']] },
        { type:'select', label:'Animazioni', value:'auto', options:[['auto','Come Windows'],['full','Complete'],['reduced','Ridotte'],['off','Spente']] },
        { type:'toggle', label:'Schede in verticale', value:true },
      ]},
      { title:'Home', items:[
        { type:'toggle', label:'Orologio nella Home', value:true },
        { type:'toggle', label:'Collegamenti rapidi', value:true },
        { type:'toggle', label:'Note del workspace', value:false },
      ]},
    ]},
  { id:'navigazione', title:'Ricerca e navigazione', icon:'search', summary:()=> 'Google · 6 scorciatoie di ricerca',
    groups:[
      { title:'Ricerca', items:[
        { type:'select', label:'Motore di ricerca', value:'google', options:[['google','Google'],['ddg','DuckDuckGo'],['bing','Bing'],['startpage','Startpage'],['brave','Brave Search']],
          hint:'Per le frasi scritte nella barra degli indirizzi e nella Home. Le ricerche rapide dei progetti non cambiano.' },
      ]},
      { title:'Scorciatoie di ricerca', items:[
        { type:'chips', label:'Scorciatoie', value:['!yt YouTube','!gh GitHub','!w Wikipedia','!a Amazon','!r Reddit','!nm Nexus Mods'] },
        { type:'action', label:'Aggiungi scorciatoia…' },
      ]},
      { title:'Stili dei siti', items:[
        { type:'chips', label:'Siti con uno stile', value:['youtube.com','reddit.com'] },
        { type:'hint', text:'Per aggiungerne uno: tasto destro su una pagina → Stile per questo sito…' },
      ]},
    ]},
  { id:'schede', title:'Schede', icon:'tabs', summary:()=> 'Sospese dopo 30 min · archivio dopo 7 giorni',
    groups:[
      { title:'Schede', items:[
        { type:'select', label:'Sospendi le schede non guardate', value:'30', options:[['0','Mai'],['5','Dopo 5 minuti'],['15','Dopo 15 minuti'],['30','Dopo 30 minuti'],['60','Dopo 1 ora']],
          hint:'Mai sospese: la scheda che guardi, quelle fissate, quelle che suonano e quelle con i DevTools aperti.' },
        { type:'toggle', label:'Animazione a scorrimento quando cambi scheda', value:true },
        { type:'toggle', label:'Video in finestrella quando cambi scheda', value:true },
        { type:'toggle', label:'Archivia da sole le schede non usate', value:true },
        { type:'select', label:'Dopo', value:'7', options:[['1','1 giorno'],['3','3 giorni'],['7','7 giorni'],['14','14 giorni']],
          hint:'Le schede archiviate si chiudono e restano in Schede → Archivio. Mai archiviate: fissate, negli stack, nella vista divisa.' },
      ]},
    ]},
  { id:'privacy', title:'Privacy e sicurezza', icon:'shield', summary:()=> `Blocco attivo · ${DEMO==='many'?120:14} password · 3 siti con permessi`,
    groups:[
      { title:'Pubblicità e tracker', items:[
        { type:'toggle', label:'Blocca pubblicità e tracker', value:true, hint:'2 siti esclusi dal blocco · 3 siti con permessi salvati. Si gestiscono dallo scudo ⛉ accanto alla barra degli indirizzi.' },
      ]},
      { title:'Password', items:[
        { type:'toggle', label:'Proponi di salvare le password dopo un accesso', value:true },
        { type:'passwords', label:'Password salvate', value:()=>passwords(DEMO==='many'?120:14) },
        { type:'action', label:'Importa da Chrome, Edge o Firefox (CSV)…' },
        { type:'hint', text:'Cifrate con la protezione dati di Windows: solo il tuo account può leggerle.' },
      ]},
      { title:'Dati di navigazione', items:[
        { type:'danger', label:'Cancella la cronologia (1.284)', confirm:'Conferma: cancella la cronologia' },
        { type:'danger', label:'Cancella cookie e dati dei siti', confirm:'Conferma: esci da tutti i siti', hint:'Cancellare i cookie ti fa uscire da tutti gli account (Google, Discord…).' },
      ]},
    ]},
  { id:'telefono', title:'Telefono', icon:'phone', summary:()=> DEMO==='error'?'Il PC non riesce a mettersi in ascolto':'Pixel 8 collegato · visto 4 min fa',
    status:()=> DEMO==='error'?'error':'ok',
    groups:[
      { title:'Collegamento', items:[
        { type:'toggle', label:'Collegamento col telefono sulla rete di casa', value:true },
        { type:'status', value:()=> DEMO==='error'
            ? {error:true,text:'Il PC non riesce a mettersi in ascolto: porta 47615 già in uso'}
            : {text:'In ascolto sulla rete di casa: 192.168.1.23 · porta 47615'} },
        { type:'toggle', label:'Anche fuori casa (le schede passano da ntfy.sh, cifrate)', value:true },
        { type:'toggle', label:'Sincronizza le password col telefono (solo sulla rete di casa)', value:false },
        { type:'devices', value:[{name:'Pixel 8',meta:'visto 4 minuti fa · 2 schede in attesa'}] },
        { type:'action', label:'Collega un altro telefono', primary:true },
      ]},
    ]},
  { id:'estensioni', title:'Estensioni', icon:'puzzle', summary:()=> '3 estensioni',
    groups:[
      { title:'Estensioni', items:[
        { type:'devices', value:[{name:'uBlock Origin Lite 2026.1',meta:'Blocco contenuti'},{name:'Dark Reader 4.9',meta:'Tema scuro per ogni sito'},{name:'Bitwarden 2026.10',meta:'Gestore di password'}], remove:'Rimuovi' },
        { type:'action', label:'Apri il Chrome Web Store', primary:true },
      ]},
    ]},
  { id:'sistema', title:'Sistema', icon:'cpu', summary:()=> DEMO==='error'?'Controllo aggiornamenti non riuscito':'VARCO 0.33.0 è l’ultima versione',
    status:()=> DEMO==='error'?'error':'ok',
    groups:[
      { title:'Aggiornamenti', items:[
        { type:'status', value:()=> DEMO==='error'
            ? {error:true,text:'Controllo non riuscito: GitHub non risponde (ETIMEDOUT)'}
            : {text:'VARCO 0.33.0 è l’ultima versione · controllato 2 ore fa'} },
        { type:'action', label:'Controlla ora' },
        { type:'toggle', label:'Controlla e scarica da solo gli aggiornamenti', value:true },
      ]},
      { title:'Avvio e background', items:[
        { type:'toggle', label:'Resta nell’area di notifica quando chiudo le finestre', value:true },
        { type:'toggle', label:'Avvia con Windows (solo l’icona, nessuna finestra)', value:false },
        { type:'toggle', label:'Rileva l’avvio dei giochi', value:true },
      ]},
      { title:'Browser e file', items:[
        { type:'action', label:'Apri le App predefinite di Windows' },
        { type:'hint', text:'VARCO compare in "Apri con" per i file che sa mostrare (PDF, immagini, video, codice, modelli 3D…).' },
      ]},
      { title:'JARVIS', items:[
        { type:'status', value:()=>({text:'Server MCP attivo.'}) },
        { type:'action', label:'Apri il pannello JARVIS' },
      ]},
      { title:'Dati', items:[
        { type:'action', label:'Esporta…' }, { type:'action', label:'Importa…' }, { type:'action', label:'Apri la cartella dei dati' },
        { type:'hint', text:'Il backup contiene workspace, preferiti, cronologia, giochi, disposizioni, permessi e impostazioni. Non contiene le password dei siti.' },
      ]},
      { title:'Informazioni', items:[
        { type:'status', value:()=>({text:'VARCO 0.33.0 · Electron 39.2 · Chromium 142'}) },
        { type:'action', label:'Copia la diagnostica' },
      ]},
    ]},
];

// Impostazioni più usate (per le varianti che le mettono in evidenza).
window.FREQUENT = [['aspetto','Tema'],['navigazione','Motore di ricerca'],['schede','Sospendi le schede non guardate'],
  ['privacy','Blocca pubblicità e tracker'],['aspetto','Animazioni'],['sistema','Avvia con Windows (solo l’icona, nessuna finestra)']];
