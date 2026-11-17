/**
 * Beta 0.42 — tutorial di VARCO: passi, suggerimenti della prima volta e progresso salvato.
 * Condiviso da processo principale (storage, comandi), cornice (tour.js) e test.
 *
 * Tre livelli: setup del primo avvio (~60 s), tour completo (8 passi, 3–5 min), suggerimenti contestuali.
 * «Non mostrare più» (never) spegne tutto finché non riapri tour o setup dalle Impostazioni → Guida.
 */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.TourRules=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  /**
   * target: l'elemento vero da evidenziare; hit: cliccandolo il passo si completa (default = target);
   * run: cosa fa il pulsante della scheda (lo esegue tour.js); event: evento che completa il passo.
   */
  const STEPS={
    setup:[
      {id:'s-welcome',title:'Benvenuto in VARCO',text:'Il tuo spazio: web, progetti e strumenti. Un minuto per prepararlo, poi è tuo.',action:'Inizia'},
      {id:'s-ws',title:'Il tuo primo workspace',text:'Un workspace per ogni cosa che fai: studio, gioco, lavoro.',target:'#workspaces',hit:'#addWorkspace,#workspaces',action:'Crea un workspace',run:'click:#addWorkspace'},
      {id:'s-theme',title:'Scegli un tema',text:'Lo cambi quando vuoi in Impostazioni → Aspetto.',themes:true},
      {id:'s-phone',title:'Collega il telefono',text:'Manda le schede dal telefono al PC e viceversa: inquadri un QR con l’app VARCO.',target:'#showSettings',action:'Apri Telefono',run:'settings:telefono'},
      {id:'s-jarvis',title:'Attiva JARVIS',text:'Il tuo assistente legge le pagine e salva nei progetti, solo se lo accendi tu.',target:'#showJarvis',action:'Apri JARVIS',run:'click:#showJarvis'},
      {id:'s-import',title:'Porta i tuoi preferiti',text:'Da Chrome, Edge o Firefox, con la cronologia se vuoi.',target:'#showSettings',action:'Importa i preferiti',run:'settings:sistema'},
      {id:'s-done',title:'Fatto',text:'Il tour completo e questo setup li ritrovi in Impostazioni → Guida.',action:'Inizia a navigare'},
    ],
    tour:[
      {id:'t-welcome',title:'VARCO, il tuo spazio',text:'Web, progetti e strumenti nello stesso posto. Otto passi, uno alla volta.',action:'Avanti'},
      {id:'t-ws',title:'Workspace',text:'Ogni spazio ha schede, account e progetti separati.',target:'#workspaces',hit:'#workspaces,#addWorkspace',action:'Crea o scegli un workspace',run:'click:#addWorkspace'},
      {id:'t-palette',title:'Palette',text:'Premi F1 per cercare qualsiasi cosa.',target:'#paletteButton',action:'Premi F1',run:'action:openPalette',event:'palette'},
      {id:'t-fast',title:'Fast link',text:'I tuoi siti e strumenti sempre a portata di tasto, anche in gioco.',target:'#linksCard',fallback:'#home',action:'Apri il launcher',run:'action:launcherOpen',event:'launcher'},
      {id:'t-proj',title:'Progetti',text:'Collega una cartella e lancia il tuo lavoro da qui.',target:'#showProject',action:'Collega una cartella',run:'click:#showProject'},
      {id:'t-panels',title:'Pannelli',text:'WhatsApp, Discord o Spotify accanto al web.',target:'#addWebPanel',action:'Aggiungi un pannello',run:'click:#addWebPanel'},
      {id:'t-games',title:'Giochi',text:'VARCO riconosce i giochi e apre il companion.',target:'#showGames',action:'Apri Giochi',run:'click:#showGames'},
      {id:'t-sec',title:'Sicurezza',text:'Usa l’incognito (Ctrl+Maiusc+N) e un password manager esterno.',target:'#showSettings',action:'Apri le Impostazioni',run:'settings:privacy'},
    ],
  };
  /** Suggerimenti della prima volta: compaiono una volta sola, quando usi la funzione. */
  const HINTS={
    palette:{target:'#cc .cc-input,#cc',text:'Qui cerchi siti, schede, progetti e comandi. Con «>» solo i comandi.'},
    project:{target:'#showProject',text:'Collega la cartella del progetto: VARCO avvia i dev server e apre l’anteprima.'},
    webpanel:{target:'#addWebPanel',text:'Un pannello resta accanto alla pagina in tutti i workspace.'},
    games:{target:'#showGames',text:'Aggiungi un gioco: quando parte, VARCO apre i suoi siti sul monitor che scegli.'},
    links:{target:'#linksCard',text:'Fissa un link e aprilo con Alt+1…9, o dal launcher anche fuori da VARCO.'},
  };
  /** Temi proposti nel setup (id di appearance-rules THEMES). */
  const THEMES=[['cyan-flash','Cyan Flash','#00e5ff'],['varco','VARCO','#7c6cff'],['ember','Ember','#ff5e2b'],['aurora-forest','Aurora','#3fbf9f'],['oxford-rose','Oxford Rose','#ff36ab'],['grafite','Grafite','#b9bdc9']];
  const LEVELS=['setup','tour'];
  const ids=new Set([...STEPS.setup,...STEPS.tour].map(s=>s.id));

  function normalizeTour(raw){
    const t=raw&&typeof raw==='object'?raw:{};
    const lvl=(x,n)=>({idx:Number.isInteger(x?.idx)&&x.idx>=0&&x.idx<n?x.idx:0,finished:x?.finished===true});
    // pending: il setup è da proporre (deciso una volta, quando lo stato nasce al primo avvio).
    return {never:t.never===true,hints:t.hints!==false,offered:t.offered===true,pending:t.pending===true,
      setup:lvl(t.setup,STEPS.setup.length),tour:lvl(t.tour,STEPS.tour.length),
      done:Array.isArray(t.done)?[...new Set(t.done.filter(x=>ids.has(x)))]:[],
      seenHints:Array.isArray(t.seenHints)?[...new Set(t.seenHints.filter(x=>Object.hasOwn(HINTS,x)))]:[]};
  }
  /** Primo avvio vero: nessuna traccia del tutorial e un profilo vuoto (niente cronologia né preferiti). */
  function isFirstRun(data){return !data?.tour&&!(data?.history?.length)&&!(data?.bookmarks?.length);}
  /** Il setup parte da solo una volta sola, solo al primo avvio e mai con «Non mostrare più». */
  const shouldOffer=tour=>tour.pending&&!tour.never&&!tour.offered&&!tour.setup.finished;
  /** Lo stato del tutorial al caricamento dei dati: se non c'era e il profilo è vuoto, il setup è da proporre. */
  function initTour(data){const fresh=!data?.tour;const t=normalizeTour(data?.tour);if(fresh&&isFirstRun(data))t.pending=true;return t;}
  /** Un suggerimento si mostra se i suggerimenti sono accesi, non è già stato visto e nessun «Non mostrare più». */
  const canHint=(tour,id)=>!!HINTS[id]&&!tour.never&&tour.hints&&!tour.seenHints.includes(id);

  /** Modifiche al progresso (restituiscono uno stato nuovo). */
  function apply(tour,ev){
    const t=normalizeTour(JSON.parse(JSON.stringify(tour)));
    switch(ev.type){
      case 'step':if(LEVELS.includes(ev.level)){t[ev.level].idx=Math.max(0,Math.min(STEPS[ev.level].length-1,ev.idx|0));t.offered=true;}break;
      case 'done':if(ids.has(ev.id)&&!t.done.includes(ev.id))t.done.push(ev.id);break;
      case 'finish':if(LEVELS.includes(ev.level)){t[ev.level].finished=true;t[ev.level].idx=0;}break;
      case 'never':t.never=true;break;
      case 'hint':if(HINTS[ev.id]&&!t.seenHints.includes(ev.id))t.seenHints.push(ev.id);break;
      case 'hints':t.hints=!!ev.on;break;
      case 'restart':if(LEVELS.includes(ev.level)){t.never=false;t[ev.level]={idx:0,finished:false};t.done=t.done.filter(id=>!STEPS[ev.level].some(s=>s.id===id));t.offered=true;}break;
    }
    return t;
  }
  return {STEPS,HINTS,THEMES,LEVELS,normalizeTour,isFirstRun,initTour,shouldOffer,canHint,apply};
});
