'use strict';

/**
 * Beta 0.38 — command center (F1, Ctrl+Shift+P).
 *
 * Il processo principale prepara i risultati per sezione (schede, progetti, fast link, comandi,
 * web, JARVIS, crea), ognuno con un'azione principale e azioni secondarie. Le azioni restano qui:
 * alla cornice arrivano solo le etichette, e lei chiede "esegui l'azione N del risultato X"
 * (ccAction). Così la cornice non può far aprire percorsi o indirizzi qualunque.
 *
 * L'ordine e le sezioni li calcola la cornice (command-center-rules.js) mentre scrivi.
 * Le anteprime (miniatura della scheda, ultime modifiche del progetto, righe del file) arrivano
 * a richiesta, al passaggio del mouse (ccPreview).
 */
const fs=require('node:fs');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {shell,clipboard,net}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const {paneOf}=require('./tab-advanced.cjs');
const {SEARCH_ENGINES,safeUrl}=require('./web-rules.cjs');
const ccRules=require('../command-center-rules.js');

let bus=null;
const run=(w,command,args={})=>bus.dispatch(command,args,{window:w,source:'command-center'});
const hostOf=url=>{try{return new URL(url).host.replace(/^www\./,'');}catch{return '';}};
const iconOf=url=>{try{return state.data.siteIcons?.[new URL(url).origin]||null;}catch{return null;}};
const favOf=t=>typeof t.favicon==='string'&&t.favicon.startsWith('data:image/')?t.favicon:iconOf(t.url);
const tabs=()=>require('./tabs.cjs');
const isWeb=url=>/^https?:\/\//i.test(url||'');

/** Per ogni finestra: id → {item, actions:[fn]} dell'ultima apertura. */
const registry=new WeakMap();

function build(w){
  const {data}=state;
  const list=[],map=new Map();
  let seq=0;
  /**
   * @param {string} sec - sezione
   * @param {string} kind - tipo (icona e anteprima)
   * @param {Array<[string,Function]>} actions - la prima è l'azione principale (Invio)
   */
  const add=(sec,kind,label,extra,actions)=>{
    const id=++seq;
    const item={id,sec,kind,label:String(label||'').slice(0,300),...extra,actions:actions.map(a=>a[0])};
    list.push(item);map.set(id,{item,actions:actions.map(a=>a[1])});
    return item;
  };
  const ws=w.workspace;
  const wsRecord=data.workspaces.find(x=>x.name===ws);

  // ── Schede: prima quelle di questa finestra, poi le altre finestre del workspace, poi gli altri workspace.
  const allTabs=state.tabs.filter(t=>!t.isHome&&t.id!==w.activeId&&data.workspaces.some(x=>x.name===t.workspace));
  const order=t=>t.workspace!==ws?2:paneOf(t)===w.pane?0:1;
  const sortedTabs=allTabs.map((t,i)=>({t,i})).sort((a,b)=>order(a.t)-order(b.t)||a.i-b.i).map(o=>o.t);
  const nowTabs=[];
  for(const t of sortedTabs){
    const same=t.workspace===ws,here=same&&paneOf(t)===w.pane;
    const actions=same
      ?[['Vai alla scheda',()=>run(w,'focusTab',{id:t.id})],
        ...(here?[['Affianca',()=>run(w,'splitWithTab',{id:t.id})]]:[]),
        ['Copia il link',()=>clipboard.writeText(t.url)],
        ['Chiudi',()=>run(windows.windowForTab(t)||w,'closeTab',{id:t.id})]]
      :[['Vai (cambia workspace)',()=>run(w,'focusTab',{id:t.id})],
        ['Porta qui',async()=>{await run(w,'moveTabToWorkspace',{id:t.id,workspace:ws});run(w,'focusTab',{id:t.id});}],
        ['Copia il link',()=>clipboard.writeText(t.url)],
        ['Chiudi',()=>{const tw=windows.windowForTab(t);if(tw)run(tw,'closeTab',{id:t.id});}]];
    const item=add('tabs','tab',t.title||t.url,{detail:hostOf(t.url)||t.url,keywords:t.url,ws:t.workspace,
      favicon:favOf(t),audible:!!t.audible,pv:'tab',window:paneOf(t)+1},actions);
    item.tabId=t.id;
    if(here&&nowTabs.length<2)nowTabs.push(item);
  }

  // ── Progetti: il progetto di ogni workspace; per quello attivo anche comandi (dev server) e file.
  const projects=require('./projects.cjs');
  const processes=require('./project-processes.cjs');
  const nowProject=[];
  for(const x of data.workspaces){
    if(!x.projectPath)continue;
    const entry=projects.get(x.name);
    const name=entry?.config?.nome||path.basename(x.projectPath)||x.name;
    const same=x.name===ws;
    const actions=same
      ?[['Apri il pannello del progetto',()=>run(w,'openSidePanel',{panel:'project'})],
        ['Apri la cartella',()=>shell.openPath(x.projectPath)],
        ...(entry?.config?.editor?[['Apri nell’editor',()=>run(w,'projectOpenEditor')]]:[]),
        ['File del progetto',()=>run(w,'openSidePanel',{panel:'files'})]]
      :[['Vai al workspace',()=>run(w,'workspace',{name:x.name})],['Apri la cartella',()=>shell.openPath(x.projectPath)]];
    const item=add('projects','project',name,{detail:x.projectPath,ws:x.name,pv:'project',keywords:'progetto '+x.name},actions);
    item.path=x.projectPath;
    if(same)nowProject.push(item);
  }
  if(wsRecord?.projectPath){
    const entry=projects.get(ws);
    const usable=projects.isUsable(entry);
    if(usable){
      const name=entry.config.nome||ws;
      if(entry.config.anteprima)nowProject.unshift(add('projects','preview',`Anteprima di ${name}`,{detail:entry.config.anteprima,ws,pv:'project',keywords:'dev server anteprima localhost'},
        [['Apri l’anteprima',()=>run(w,'projectOpenPreview')],['Pannello del progetto',()=>run(w,'openSidePanel',{panel:'project'})]]));
      for(const cmd of processes.snapshot(ws)){
        const on=cmd.status==='running';
        const item=add('projects','server',cmd.name,{detail:`${name} · ${on?'attivo':'fermo'} · ${cmd.command}`,ws,on,pv:'server',keywords:'dev server comando avvia ferma '+cmd.command},
          on?[...(entry.config.anteprima?[['Apri l’anteprima',()=>run(w,'projectOpenPreview')]]:[]),['Mostra i log',()=>run(w,'openSidePanel',{panel:'project'})],['Ferma',()=>run(w,'projectStop',{index:cmd.index})]]
            :[['Avvia',()=>run(w,'projectRun',{index:cmd.index})],['Mostra i log',()=>run(w,'openSidePanel',{panel:'project'})]]);
        item.cmdIndex=cmd.index;
        if(nowProject.length<3)nowProject.push(item);
      }
    }
    // Cartelle e file: il primo livello e il secondo delle cartelle "leggere" (niente node_modules, dist…).
    const viewer=require('./file-viewer.cjs');
    // Un disco intero (C:\) o la cartella utente non sono un progetto: niente elenco di file di sistema.
    const folder=path.resolve(wsRecord.projectPath);
    const tooBroad=path.parse(folder).root.toLowerCase()===folder.toLowerCase()||folder.toLowerCase()===require('node:os').homedir().toLowerCase();
    const top=tooBroad?{ok:false}:viewer.listDir(wsRecord.projectPath);
    const files=[];
    if(top.ok){
      for(const e of top.items){if(files.length<160)files.push(e);}
      for(const e of top.items.filter(e=>e.dir&&!e.heavy)){
        const sub=viewer.listDir(e.path);
        if(sub.ok)for(const s of sub.items){if(files.length>=160)break;files.push({...s,rel:e.name+'/'+s.name});}
      }
    }
    for(const f of files){
      if(f.heavy||/^\$|^(System Volume Information|desktop\.ini|thumbs\.db)$/i.test(f.name))continue;
      const rel=f.rel||f.name;
      const item=f.dir
        ?add('projects','folder',rel+'/',{detail:wsRecord.projectPath,ws,pv:'folder',keywords:'cartella'},
          [['Apri in Esplora file',()=>shell.openPath(f.path)],['File del progetto',()=>run(w,'openSidePanel',{panel:'files'})],['Copia il percorso',()=>clipboard.writeText(f.path)]])
        :add('projects','file',rel,{detail:path.dirname(f.path),ws,pv:'file',keywords:'file '+f.kind},
          [['Apri',()=>viewer.openFile(w,f.path)],['Mostra nella cartella',()=>shell.showItemInFolder(f.path)],['Copia il percorso',()=>clipboard.writeText(f.path)]]);
      item.path=f.path;
    }
  }

  // ── Fast link: i link rapidi di ogni workspace (fissati, scorciatoia Alt+1…9) e le sessioni salvate.
  const nowLinks=[];
  for(const x of data.workspaces){
    (x.homeLinks||[]).forEach((link,index)=>{
      const same=x.name===ws;
      const freeKey=()=>{for(let k=1;k<=9;k++)if(!x.homeLinks.some(l=>l.key===k))return k;return 0;};
      const item=add('links','link',link.title,{detail:hostOf(link.url),keywords:link.url,ws:x.name,pinned:!!link.pinned,
        keys:link.key?'Alt+'+link.key:'',favicon:iconOf(link.url),pv:'site',url:link.url,group:link.pinned?'Fissati':x.name},
        [['Apri',()=>run(w,'newTab',{url:link.url})],
         ['Apri qui',()=>run(w,'navigate',{url:link.url})],
         [link.pinned?'Togli dai fissati':'Fissa',()=>editLink(x,link.url,l=>{if(l.pinned)delete l.pinned;else l.pinned=true;})],
         ...(link.key?[[`Togli Alt+${link.key}`,()=>editLink(x,link.url,l=>{delete l.key;})]]
           :freeKey()?[[`Scorciatoia Alt+${freeKey()}`,()=>editLink(x,link.url,l=>{l.key=freeKey();})]]:[]),
         ['Copia il link',()=>clipboard.writeText(link.url)],
         ['Togli dai fast link',()=>editLinks(x,links=>links.filter(l=>l.url!==link.url))]]);
      item.linkIndex=index;
      if(same&&link.pinned&&nowLinks.length<2)nowLinks.push(item);
    });
  }
  data.savedSessions.forEach((s,index)=>{
    add('links','session',s.name,{detail:`${s.tabs.length} schede · sessione di ${s.workspace}`,ws:s.workspace,pv:'session',
      keywords:'sessione '+s.tabs.map(t=>t.title).join(' ').slice(0,300)},
      [['Riapri le schede',()=>{for(const t of s.tabs)tabs().newTab(t.url,w.workspace,{pane:w.pane,activate:false});windows.emitAll();}],
       ['Elimina la sessione',()=>{data.savedSessions.splice(data.savedSessions.indexOf(s),1);save();}]]).sessionIndex=index;
  });

  // ── Comandi (gli stessi della palette di prima) e workspace.
  const palette=require('./palette.cjs');
  for(const [label,command,args,keys,keywords] of palette.COMMANDS)
    add('commands','command',label,{keys,keywords,pv:'command'},[['Esegui',()=>run(w,command,args)]]);
  add('commands','command',data.settings.adblock.enabled?'Spegni il blocco pubblicità su tutti i siti':'Attiva il blocco pubblicità',{keywords:'adblock tracker',pv:'command'},
    [['Esegui',()=>run(w,'setAdblockEnabled',{enabled:!data.settings.adblock.enabled})]]);
  add('commands','command',data.settings.commandCenter.style==='ring'?'Command center: passa alla bacheca':'Command center: passa all’anello',{keywords:'stile command center palette bacheca anello',pv:'command'},
    [['Esegui',()=>{setStyle(data.settings.commandCenter.style==='ring'?'board':'ring');require('./palette.cjs').open(w,'palette');}]]);
  // Beta 0.43: questa finestra è il companion di un gioco → dove si apre la prossima volta.
  if(w.companionGameId){
    const g=data.games.find(x=>x.id===w.companionGameId);
    if(g){
      add('commands','command',`Companion di ${g.name}: apri sempre qui`,{keywords:'monitor posizione companion fissa',pv:'command'},[['Esegui',()=>run(w,'companionPinHere')]]);
      add('commands','command',`Companion di ${g.name}: sposta sull’altro monitor`,{keywords:'monitor schermo companion',pv:'command'},[['Esegui',()=>run(w,'companionMoveMonitor')]]);
      add('commands','command',`Companion di ${g.name}: ricorda la posizione`,{keywords:'monitor posizione companion ultima',pv:'command'},[['Esegui',()=>run(w,'companionRemember')]]);
    }
  }
  for(const x of data.workspaces){
    if(x.name!==ws)add('commands','workspace','Vai a '+x.name,{detail:'workspace',keywords:'workspace',pv:'command'},
      [['Vai',()=>run(w,'workspace',{name:x.name})],['In una nuova finestra',()=>run(w,'openWorkspaceWindow',{name:x.name})]]);
  }

  // ── Web: preferiti e cronologia (la ricerca e i suggerimenti li aggiunge la cornice mentre scrivi).
  const seen=new Set();
  const site=(kind,title,url,extra={})=>add('web',kind,title||url,{detail:hostOf(url),keywords:url,favicon:iconOf(url),pv:'site',url,...extra},
    [['Apri in una nuova scheda',()=>run(w,'newTab',{url})],['Apri qui',()=>run(w,'navigate',{url})],['Copia il link',()=>clipboard.writeText(url)]]);
  for(const b of data.bookmarks){seen.add(b.url);site('bookmark',b.title,b.url,{favicon:b.favicon||iconOf(b.url)});}
  let count=0;
  for(const h of data.history){
    if(count>=80||seen.has(h.url))continue;
    seen.add(h.url);count++;site('history',h.title,h.url);
  }

  // ── JARVIS: riassumi la pagina, salva nel progetto, prompt salvati (la domanda libera la aggiunge la cornice).
  const jarvisOn=data.settings.jarvis.enabled;
  const active=state.tabs.find(t=>t.id===w.activeId);
  const pageOk=active&&!active.isHome&&isWeb(active.url);
  const off=[['Accendi JARVIS',()=>run(w,'openSidePanel',{panel:'jarvis'})]];
  add('jarvis','jsum','Riassumi la pagina',{detail:jarvisOn?(pageOk?active.title||active.url:'Apri prima una pagina web'):'JARVIS è spento',off:!jarvisOn||!pageOk,keywords:'jarvis riassunto'},
    jarvisOn?(pageOk?[['Riassumi',()=>jarvis().request('summarize',{tab:active,workspace:ws})],['Riassumi e salva nelle note',()=>jarvis().request('summarize',{tab:active,workspace:ws,toNotes:true})]]:[]):off);
  add('jarvis','jsave','Salva nel progetto',{detail:pageOk?`«${(active.title||active.url).slice(0,60)}» nelle risorse di ${ws}`:'Apri prima una pagina web',off:!pageOk,keywords:'jarvis salva risorsa progetto'},
    pageOk?[['Salva la pagina',()=>saveToProject(w,active)],...(jarvisOn?[['Salva e chiedi a JARVIS di annotarla',async()=>{await saveToProject(w,active);jarvis().request('save',{tab:active,workspace:ws});}]]:[])]:[]);
  data.jarvisPrompts.forEach((p,index)=>add('jarvis','prompt',p,{detail:'prompt salvato',off:!jarvisOn,keywords:'prompt jarvis'},
    jarvisOn?[['Manda a JARVIS',()=>jarvis().request('ask',{text:p,tab:pageOk?active:null,workspace:ws})],['Elimina il prompt',()=>{data.jarvisPrompts.splice(index,1);save();}]]
      :[...off,['Elimina il prompt',()=>{data.jarvisPrompts.splice(index,1);save();}]]));

  // ── Crea (senza testo): cosa si può creare. Con il testo la cornice propone «Nota "…"» ecc.
  add('create','note','Nota',{detail:`nelle note di ${ws}`,keywords:'appunto',fill:'+ '},[['Scrivi la nota…',()=>{}],['Apri le note',()=>run(w,'openSidePanel',{panel:'notes'})]]);
  add('create','task','Task',{detail:`nella lista di ${ws}`,keywords:'attività da fare todo',fill:'+ '},[['Scrivi il task…',()=>{}],['Apri le note',()=>run(w,'openSidePanel',{panel:'notes'})]]);
  add('create','link','Fast link dalla scheda attiva',{detail:pageOk?active.title||active.url:'Apri prima una pagina web',off:!pageOk,keywords:'link rapido preferito'},
    pageOk?[['Crea',()=>createLink(w,active.url,active.title)],['Crea e fissa',()=>createLink(w,active.url,active.title,true)]]:[]);
  add('create','workspace','Workspace',{detail:'scrivi il nome',keywords:'spazio',fill:'+ '},[['Scrivi il nome…',()=>{}],['Pannello nuovo workspace',()=>run(w,'openSidePanel',{panel:'newWorkspace'})]]);
  add('create','session','Sessione dalle schede aperte',{detail:`salva le schede di questa finestra`,keywords:'salva schede gruppo'},
    [['Salva',()=>createSession(w,'')]]);
  add('create','prompt','Prompt per JARVIS',{detail:'scrivi il testo, lo ritrovi nella sezione JARVIS',keywords:'jarvis',fill:'+ '},[['Scrivi il prompt…',()=>{}]]);

  // ── Apri subito (senza testo): ciò che serve adesso nel workspace attivo.
  for(const item of [...nowProject.slice(0,2),...nowLinks,...nowTabs])item.now=true;

  registry.set(w,{map,builtAt:Date.now()});
  return list;
}
const jarvis=()=>require('./jarvis.cjs');

function editLinks(x,fn){
  const rules=require('./appearance-rules.cjs');
  x.homeLinks=rules.normalizeLinks(fn(x.homeLinks.map(l=>({...l}))));
  save();windows.emitAll();
}
function editLink(x,url,fn){editLinks(x,links=>{const l=links.find(l=>l.url===url);if(l)fn(l);return links;});}

async function createLink(w,url,title,pinned=false){
  const x=state.data.workspaces.find(x=>x.name===w.workspace);
  if(!x)return {ok:false,error:'Workspace non trovato.'};
  const rules=require('./appearance-rules.cjs');
  if(x.homeLinks.some(l=>l.url===url)){if(pinned)editLink(x,url,l=>{l.pinned=true;});return {ok:true};}
  if(x.homeLinks.length>=rules.MAX_LINKS)return {ok:false,error:`Al massimo ${rules.MAX_LINKS} fast link per workspace.`};
  editLinks(x,links=>[...links,{url,title:title||'',...(pinned?{pinned:true}:{})}]);
  toast(w,{kind:'success',title:'Fast link creato',text:title||url});
  return {ok:true};
}
function createSession(w,name){
  const list=require('./tabs.cjs').tabsOf(w).filter(t=>!t.isHome&&isWeb(t.url));
  if(!list.length)return {ok:false,error:'Nessuna pagina web aperta in questa finestra.'};
  const when=new Date().toLocaleString('it-IT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  state.data.savedSessions.push({name:(name||`${w.workspace} · ${when}`).slice(0,60),workspace:w.workspace,createdAt:Date.now(),
    tabs:list.slice(0,60).map(t=>({url:t.url,title:t.title||''}))});
  if(state.data.savedSessions.length>30)state.data.savedSessions.shift();
  save();
  toast(w,{kind:'success',title:'Sessione salvata',text:`${list.length} schede · la ritrovi in Fast link`});
  return {ok:true};
}
async function saveToProject(w,tab){
  const r=await run(w,'addResource',{url:tab.url});
  const err=r.ok?r.result?.ok===false&&r.result.error:r.error;
  toast(w,err?{kind:'info',title:'Salva nel progetto',text:err}:{kind:'success',title:'Salvata nel workspace',text:tab.title||tab.url});
}
function toast(w,t){require('./toasts.cjs').show({id:'cc-'+Date.now(),category:'sistema',timeout:5000,...t},w);}

/** Azione N di un risultato dell'ultima apertura. */
async function action(w,id,index){
  const entry=registry.get(w)?.map.get(id);
  if(!entry)return {ok:false,error:'Risultato non più valido: riapri il command center.'};
  const fn=entry.actions[index]??entry.actions[0];
  if(!fn)return {ok:false,error:'Nessuna azione.'};
  return await fn();
}

/** Elementi che dipendono dal testo (crea, chiedi a JARVIS, cerca): li esegue la cornice con ccDynamic. */
async function dynamic(w,{type,text,option=0}){
  const clean=String(text||'').trim().slice(0,1000);
  if(!clean)return {ok:false,error:'Scrivi qualcosa.'};
  const {data}=state;
  const active=state.tabs.find(t=>t.id===w.activeId);
  const page=active&&!active.isHome&&isWeb(active.url)?active:null;
  switch(type){
    case 'search':return option===1?run(w,'navigate',{url:clean}):run(w,'newTab',{url:clean});
    case 'ask':
      if(!data.settings.jarvis.enabled)return run(w,'openSidePanel',{panel:'jarvis'});
      return jarvis().request('ask',{text:clean,tab:option===1?page:null,workspace:w.workspace});
    case 'note':case 'task':{
      const prev=data.notes[w.workspace]?.text||'';
      const line=type==='task'?`- [ ] ${clean}`:clean;
      const text=(prev&&!prev.endsWith('\n')?prev+'\n':prev)+line;
      await run(w,'saveNotes',{text});
      if(option===1)run(w,'openSidePanel',{panel:'notes'});
      else toast(w,{kind:'success',title:type==='task'?'Task aggiunto':'Nota aggiunta',text:`${clean.slice(0,80)} · note di ${w.workspace}`});
      return {ok:true};
    }
    case 'prompt':
      data.jarvisPrompts.push(clean);if(data.jarvisPrompts.length>50)data.jarvisPrompts.shift();save();
      if(option===1&&data.settings.jarvis.enabled)return jarvis().request('ask',{text:clean,tab:page,workspace:w.workspace});
      toast(w,{kind:'success',title:'Prompt salvato',text:'Lo ritrovi nella sezione JARVIS del command center.'});
      return {ok:true};
    case 'workspace':{
      const r=await run(w,'addWorkspace',{name:clean.slice(0,40)});
      return r;
    }
    case 'link':{
      const url=safeUrl(clean,data.settings.searchEngine);
      if(!url||!isWeb(url))return {ok:false,error:'Indirizzo non valido.'};
      return createLink(w,url,hostOf(url),option===1);
    }
    case 'session':return createSession(w,clean);
  }
  return {ok:false,error:'Tipo sconosciuto.'};
}

// ── Anteprime ──────────────────────────────────────────────────────────
const previewCache=new Map(); // chiave → {at, value}
const CACHE_MS=15000;
function git(folder,args){
  return new Promise(resolve=>execFile('git',['-C',folder,...args],{timeout:2500,windowsHide:true},(err,out)=>resolve(err?null:String(out))));
}
const ago=ms=>{
  const s=Math.max(0,(Date.now()-ms)/1000);
  if(s<60)return 'adesso';if(s<3600)return `${Math.round(s/60)} min fa`;if(s<86400)return `${Math.round(s/3600)} h fa`;
  if(s<86400*30)return `${Math.round(s/86400)} g fa`;return new Date(ms).toLocaleDateString('it-IT');
};
async function capture(view,width=360){
  try{
    if(!view||view.webContents.isDestroyed())return null;
    const image=await view.webContents.capturePage();
    if(image.isEmpty())return null;
    return 'data:image/jpeg;base64,'+image.resize({width}).toJPEG(70).toString('base64');
  }catch{return null;}
}
async function preview(w,id){
  const entry=registry.get(w)?.map.get(id);
  if(!entry)return null;
  const x=entry.item;
  const key=x.pv+':'+(x.tabId||x.path||x.url||x.label);
  const hit=previewCache.get(key);
  if(hit&&Date.now()-hit.at<CACHE_MS)return hit.value;
  let value=null;
  if(x.pv==='tab'){
    const t=state.tabs.find(t=>t.id===x.tabId);
    if(t)value={type:'tab',title:t.title,url:t.url,ws:t.workspace,window:paneOf(t)+1,image:t.view?await capture(t.view):null,
      asleep:!t.view,audible:!!t.audible};
  }else if(x.pv==='site'){
    const open=state.tabs.find(t=>t.url===x.url&&t.view);
    const visit=state.data.history.find(h=>h.url===x.url);
    value={type:'site',title:x.label,url:x.url,image:open?await capture(open.view):null,favicon:x.favicon||null,
      visited:visit?.time?ago(visit.time):null,open:!!open};
  }else if(x.pv==='project'){
    const folder=x.path||state.data.workspaces.find(s=>s.name===x.ws)?.projectPath;
    const [branch,log]=folder?await Promise.all([git(folder,['rev-parse','--abbrev-ref','HEAD']),git(folder,['log','-5','--format=%h%x09%ct%x09%s'])]):[null,null];
    value={type:'project',title:x.label,path:folder,ws:x.ws,branch:branch?.trim()||null,
      commits:log?log.trim().split('\n').filter(Boolean).map(l=>{const [hash,t,...s]=l.split('\t');return {hash,when:ago(Number(t)*1000),subject:s.join('\t')};}):[]};
  }else if(x.pv==='server'){
    const cmd=require('./project-processes.cjs').snapshot(x.ws).find(c=>c.index===x.cmdIndex);
    value={type:'server',title:x.label,command:cmd?.command||'',status:cmd?.status||'stopped',log:(cmd?.log||[]).slice(-6)};
  }else if(x.pv==='file'||x.pv==='folder'){
    try{
      const st=fs.statSync(x.path);
      value={type:x.pv,title:path.basename(x.path),path:x.path,size:st.size,modified:ago(st.mtimeMs)};
      if(x.pv==='folder')value.entries=fs.readdirSync(x.path).filter(n=>!n.startsWith('.')).slice(0,10);
      else if(st.size<300000&&!/\.(png|jpe?g|gif|webp|ico|pdf|zip|exe|dll|mp[34]|wav|ogg|woff2?|ttf|psd|blend|fbx|unitypackage)$/i.test(x.path))
        value.lines=fs.readFileSync(x.path,'utf8').split(/\r?\n/).slice(0,14).map(l=>l.slice(0,120));
    }catch{value={type:x.pv,title:path.basename(x.path),path:x.path,missing:true};}
  }else if(x.pv==='session'){
    const s=state.data.savedSessions[x.sessionIndex];
    value={type:'session',title:x.label,tabs:(s?.tabs||[]).slice(0,8).map(t=>t.title||hostOf(t.url))};
  }else if(x.pv==='command')value={type:'command',title:x.label,keys:x.keys||''};
  previewCache.set(key,{at:Date.now(),value});
  if(previewCache.size>80)previewCache.delete(previewCache.keys().next().value);
  return value;
}

// ── Suggerimenti di ricerca (dal motore scelto, solo se attivi nelle Impostazioni) ──
const SUGGEST={
  google:q=>`https://suggestqueries.google.com/complete/search?client=firefox&hl=it&q=${encodeURIComponent(q)}`,
  duckduckgo:q=>`https://duckduckgo.com/ac/?type=list&q=${encodeURIComponent(q)}`,
  bing:q=>`https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}`,
  brave:q=>`https://search.brave.com/api/suggest?q=${encodeURIComponent(q)}`,
  startpage:q=>`https://www.startpage.com/osuggestions?q=${encodeURIComponent(q)}`,
  ecosia:q=>`https://ac.ecosia.org/autocomplete?type=list&q=${encodeURIComponent(q)}`
};
async function suggest(text){
  const q=String(text||'').trim().slice(0,200);
  const settings=state.data.settings;
  if(!q||!settings.commandCenter.webSuggestions)return [];
  // Indirizzi e percorsi non vanno al motore di ricerca.
  if(/^[a-z]+:\/\//i.test(q)||/^[a-z]:\\/i.test(q)||/^localhost\b/i.test(q))return [];
  const url=(SUGGEST[settings.searchEngine]||SUGGEST.google)(q);
  try{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),1800);
    const res=await net.fetch(url,{signal:controller.signal,credentials:'omit'});
    clearTimeout(timer);
    if(!res.ok)return [];
    const body=await res.json();
    const list=Array.isArray(body)&&Array.isArray(body[1])?body[1]:Array.isArray(body)?body.map(x=>x?.phrase||x?.q):[];
    return list.filter(s=>typeof s==='string'&&s.trim()&&s.toLowerCase()!==q.toLowerCase()).slice(0,5).map(s=>s.slice(0,120));
  }catch{return [];}
}

function setStyle(style){
  if(!['board','ring'].includes(style))return;
  state.data.settings.commandCenter.style=style;save();
}

/** Dati per la cornice all'apertura. */
function snapshot(w){
  const engine=SEARCH_ENGINES[state.data.settings.searchEngine]||SEARCH_ENGINES.google;
  return {items:require('./icon-urls.cjs').rewrite(build(w)),style:state.data.settings.commandCenter.style,active:w.workspace,
    engine:engine.label,jarvis:state.data.settings.jarvis.enabled,workspaces:state.data.workspaces.map(x=>({name:x.name,color:x.color||null})),
    bangs:state.bangs||null};
}

/** Alt+1…9: il fast link con quella scorciatoia nel workspace della finestra. */
function linkForKey(w,key){
  const x=state.data.workspaces.find(x=>x.name===w.workspace);
  return x?.homeLinks?.find(l=>l.key===key)||null;
}

function setup(commandBus){
  bus=commandBus;
  const reg=(name,args,description,fn)=>bus.register(name,{args,description,run:(ctx,a)=>{const w=ctx.window;if(!w)return {ok:false,error:'Nessuna finestra.'};return fn(w,a);}});
  reg('ccAction',{id:'int',action:'int'},'Command center: esegue un’azione di un risultato.',(w,{id,action:i})=>action(w,id,i));
  reg('ccDynamic',{type:['search','ask','note','task','prompt','workspace','link','session'],text:'string',option:'int?'},'Command center: crea, chiede a JARVIS o cerca con il testo scritto.',(w,a)=>dynamic(w,a));
  reg('ccPreview',{id:'int'},'Command center: anteprima di un risultato.',(w,{id})=>preview(w,id));
  reg('ccSuggest',{text:'string'},'Command center: suggerimenti di ricerca.',(_w,{text})=>suggest(text));
  reg('ccSetStyle',{style:['board','ring']},'Command center: bacheca o anello.',(w,{style})=>{setStyle(style);windows.emitAll();return {ok:true};});
  reg('ccSetWebSuggestions',{enabled:'bool'},'Command center: suggerimenti di ricerca dal motore.',(_w,{enabled})=>{state.data.settings.commandCenter.webSuggestions=enabled;save();windows.emitAll();});
  // Beta 0.41: il risultato scelto per un testo nei suggerimenti della barra e della Home.
  reg('suggestChoice',{query:'string',key:'string'},'Suggerimenti: ricorda il risultato scelto per un testo.',(_w,{query,key})=>{
    state.data.suggestChoices=require('../suggest-rules.js').recordChoice(state.data.suggestChoices||{},query.slice(0,80),key.slice(0,2000));save();return {ok:true};});
  reg('copyText',{text:'string'},'Copia un testo negli appunti (es. la risposta di JARVIS).',(_w,{text})=>{clipboard.writeText(text.slice(0,20000));return {ok:true};});
  reg('openFastLink',{key:'int'},'Apre il fast link con la scorciatoia Alt+N del workspace.',(w,{key})=>{
    const link=linkForKey(w,key);if(!link)return {ok:false,error:'Nessun fast link con Alt+'+key};
    return run(w,'newTab',{url:link.url});
  });
}

module.exports={setup,snapshot,build,action,dynamic,preview,suggest,linkForKey,setStyle,_rules:ccRules};
