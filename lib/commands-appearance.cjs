'use strict';

/**
 * Comandi della personalizzazione (Beta 0.21): tema e colore, sfondo (anche per
 * workspace), interfaccia (densità, testo, angoli, pulsanti) e Home (riquadri, link rapidi).
 * Beta 0.22: preset pronti e tuoi, secondo colore, preset per workspace, esporta/importa.
 */
const fs=require('node:fs');
const path=require('node:path');
const {dialog}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const appearance=require('./appearance.cjs');
const rules=require('./appearance-rules.cjs');

function registerAppearanceCommands(bus){
  const {data}=state;
  const a=()=>data.appearance;
  // Dopo ogni scelta: salva, ridisegna le cornici, aggiorna menu, notifiche e angoli delle pagine.
  const changed=()=>{data.appearance=rules.normalizeAppearance(data.appearance);save();windows.emitAll();appearance.refreshOverlays();windows.layoutAll();require('./system-icons.cjs').sync();};
  const add=(name,args,description,run)=>bus.register(name,{args,description,run:(ctx,x)=>{
    const result=run(x,ctx.window||windows.focusedWindow(),ctx);
    return result;
  }});

  // Beta 0.22: un preset con immagini porta anche il suo sfondo; una tinta lascia lo sfondo che hai.
  add('setTheme',{theme:Object.keys(rules.THEMES)},'Tema o preset pronto (colori, e per i preset sfondo, logo e icona).',({theme})=>{
    a().theme=theme;a().accent='';a().accent2='';
    if(rules.THEMES[theme].group==='preset')a().wallpaper={...a().wallpaper,kind:'default',file:''};
    changed();appearance.cleanWallpapers();
  });
  for(const [name,key,what] of [['setAccent','accent','Colore d\'accento'],['setAccent2','accent2','Secondo colore (gradienti e barre)']])
    add(name,{color:'string'},`${what} personalizzato (#rrggbb), vuoto per quello del tema.`,({color})=>{
      if(color&&!/^#[0-9a-f]{6}$/i.test(color))return {ok:false,error:'Colore non valido.'};
      a()[key]=color.toLowerCase();changed();return {ok:true};
    });

  // ── Preset (Beta 0.22) ─────────────────────────────────────────────────
  const presetNamed=name=>data.presets.find(p=>p.name.toLowerCase()===String(name).trim().toLowerCase());
  const presetsChanged=()=>{
    data.presets=rules.normalizePresets(data.presets);
    for(const ws of data.workspaces)ws.preset=rules.normalizeWorkspacePreset(ws.preset,data.presets);
    changed();appearance.cleanWallpapers();
  };
  add('savePreset',{name:'string'},'Salva l\'aspetto attuale come preset (stesso nome: lo aggiorna).',({name})=>{
    const preset=rules.normalizePreset({name,appearance:a()});
    if(!preset)return {ok:false,error:'Scrivi un nome.'};
    const old=presetNamed(preset.name);
    if(old)old.appearance=preset.appearance;
    else if(data.presets.length>=rules.MAX_PRESETS)return {ok:false,error:`Al massimo ${rules.MAX_PRESETS} preset.`};
    else data.presets.push(preset);
    presetsChanged();
    return {ok:true,updated:!!old};
  });
  add('applyPreset',{name:'string'},'Usa un tuo preset per tutti i workspace.',({name})=>{
    const preset=presetNamed(name);
    if(!preset)return {ok:false,error:'Preset non trovato.'};
    Object.assign(a(),structuredClone(preset.appearance));changed();
    return {ok:true};
  });
  add('deletePreset',{name:'string'},'Elimina un tuo preset (i workspace che lo usavano tornano come gli altri).',({name})=>{
    const preset=presetNamed(name);
    if(!preset)return {ok:false,error:'Preset non trovato.'};
    data.presets=data.presets.filter(p=>p!==preset);presetsChanged();
    return {ok:true};
  });
  add('setWorkspacePreset',{preset:'string'},'Preset del workspace attivo: vuoto (come gli altri), theme:<id> o user:<nome>.',({preset},w)=>{
    const ws=data.workspaces.find(x=>x.name===w?.workspace);
    if(!ws)return {ok:false,error:'Workspace non trovato.'};
    const value=rules.normalizeWorkspacePreset(preset,data.presets);
    if(preset&&!value)return {ok:false,error:'Preset non trovato.'};
    ws.preset=value;changed();
    return {ok:true};
  });
  // Esporta i tuoi preset in un file .varco-preset.json, con dentro gli sfondi che usano.
  add('exportPresets',{},'Esporta i tuoi preset in un file (sfondi compresi).',async(_x,w)=>{
    if(!data.presets.length)return {ok:false,error:'Non hai ancora preset da esportare.'};
    const result=await dialog.showSaveDialog(w?.win,{title:'Esporta preset',defaultPath:'VARCO preset.varco-preset.json',
      filters:[{name:'Preset di VARCO',extensions:['json']}]});
    if(result.canceled||!result.filePath)return {ok:true,cancelled:true};
    const presets=data.presets.map(p=>{
      const file=p.appearance.wallpaper.kind==='image'?p.appearance.wallpaper.file:'';
      let image=null;
      try{if(file)image={ext:path.extname(file).slice(1).toLowerCase(),data:fs.readFileSync(file).toString('base64')};}catch{}
      return {name:p.name,appearance:{...p.appearance,wallpaper:{...p.appearance.wallpaper,file:''}},image};
    });
    fs.writeFileSync(result.filePath,JSON.stringify({varcoPresets:1,presets},null,1));
    return {ok:true,count:presets.length};
  });
  add('importPresets',{},'Importa preset da un file esportato (stesso nome: lo sostituisce).',async(_x,w)=>{
    const result=await dialog.showOpenDialog(w?.win,{title:'Importa preset',properties:['openFile'],
      filters:[{name:'Preset di VARCO',extensions:['json']}]});
    if(result.canceled||!result.filePaths[0])return {ok:true,cancelled:true};
    let parsed;
    try{
      if(fs.statSync(result.filePaths[0]).size>200*1024*1024)throw new Error('File troppo grande.');
      parsed=JSON.parse(fs.readFileSync(result.filePaths[0],'utf8'));
      if(parsed?.varcoPresets!==1||!Array.isArray(parsed.presets))throw new Error('Non è un file di preset di VARCO.');
    }catch(error){return {ok:false,error:error.message.startsWith('Unexpected')?'File non leggibile.':error.message};}
    let count=0;
    for(const raw of parsed.presets){
      const appearanceIn=raw?.appearance&&typeof raw.appearance==='object'?structuredClone(raw.appearance):{};
      const wall=appearanceIn.wallpaper&&typeof appearanceIn.wallpaper==='object'?appearanceIn.wallpaper:{};
      wall.file='';
      if(wall.kind==='image'&&raw.image&&typeof raw.image.data==='string'){
        const stored=appearance.storeWallpaper(Buffer.from(raw.image.data,'base64'),String(raw.image.ext).toLowerCase());
        if(stored.ok)wall.file=stored.file;
      }
      appearanceIn.wallpaper=wall;
      const preset=rules.normalizePreset({name:raw?.name,appearance:appearanceIn});
      if(!preset)continue;
      const old=presetNamed(preset.name);
      if(old)old.appearance=preset.appearance;
      else if(data.presets.length<rules.MAX_PRESETS)data.presets.push(preset);
      else continue;
      count++;
    }
    presetsChanged();
    return count?{ok:true,count}:{ok:false,error:'Nessun preset valido nel file.'};
  });
  add('setAppearanceValue',{key:['glass','blur','brightness','fontScale','radius'],value:'int'},
    'Trasparenza delle barre, sfocatura e luminosità dello sfondo, dimensione del testo, raggio degli angoli.',({key,value})=>{
      if(key==='blur'||key==='brightness')a().wallpaper[key]=value;else a()[key]=value;
      changed();
    });
  add('setDensity',{density:rules.DENSITIES},'Densità dell\'interfaccia.',({density})=>{a().density=density;changed();});
  add('setButtonHidden',{id:'string',hidden:'bool'},'Mostra o nasconde un pulsante della barra laterale o delle barre.',({id,hidden})=>{
    const list=a().hidden.filter(x=>x!==id);
    if(hidden)list.push(id);
    a().hidden=list;changed(); // normalizeAppearance scarta gli id sconosciuti
  });
  add('setHomeCard',{card:Object.keys(rules.HOME_CARDS),visible:'bool'},'Mostra o nasconde un riquadro della Home.',({card,visible})=>{a().home[card]=visible;changed();});
  add('resetAppearance',{},'Torna all\'aspetto predefinito di VARCO (gli sfondi dei workspace restano).',()=>{
    data.appearance=rules.defaultAppearance();changed();appearance.cleanWallpapers();
  });

  // ── Disposizione (Beta 0.28) ───────────────────────────────────────────
  const frameRules=require('./frame-layout-rules.cjs');
  const relayout=()=>{save();windows.emitAll();windows.layoutAll({animate:true});};
  add('setLayout',{tabs:'string?',sidebar:'string?',merge:'bool?'},'Dove stanno le schede e la barra laterale.',({tabs,sidebar,merge})=>{
    data.layout=frameRules.normalizeLayout({...data.layout,...(tabs?{tabs}:{}),...(sidebar?{sidebar}:{}),...(typeof merge==='boolean'?{merge}:{})});
    relayout();
  });
  add('toggleCompact',{},'Modalità compatta: le barre si chiudono e tornano quando ci passi sopra col mouse (Ctrl+Shift+K).',(_a,w)=>{
    data.layout=frameRules.normalizeLayout({...data.layout,compact:!data.layout?.compact});
    for(const x of state.windows)x.compactReveal=false;
    if(data.layout.compact)require('./toasts.cjs').show({id:'compact',kind:'info',title:'Modalità compatta',
      text:'Avvicina il mouse a un bordo per vedere le barre. Ctrl+Shift+K per tornare normale.',timeout:4000},w);
    relayout();
  });
  // La cornice chiede di aprire o chiudere le barre (mouse sul bordo, barra degli indirizzi attiva…).
  add('compactReveal',{on:'bool'},'Mostra o chiude le barre in modalità compatta.',({on},w)=>{
    if(!w||!data.layout?.compact||!!w.compactReveal===on)return;
    w.compactReveal=on;
    windows.layout(w,{animate:true});
  });
  add('applyLayoutPreset',{preset:Object.keys(frameRules.PRESETS)},'Disposizione pronta (Classico, Colonna unica…).',({preset})=>{
    const {tabs,sidebar,merge}=frameRules.PRESETS[preset];
    data.layout={tabs,sidebar,merge,compact:!!data.layout?.compact};
    // Con la colonna unica la barra laterale non può essere nascosta, altrimenti sparirebbero i workspace.
    if(preset!=='classico'&&data.sidebarMode==='hidden'||preset==='icone-colonna'){data.sidebarMode='compact';for(const x of state.windows)x.sidebarMode='compact';}
    relayout();
  });

  // ── Sfondo ─────────────────────────────────────────────────────────────
  add('chooseWallpaper',{scope:['all','workspace']},'Sceglie un\'immagine come sfondo di tutti i workspace o solo di quello attivo.',async({scope},w)=>{
    const result=await dialog.showOpenDialog(w?.win,{title:scope==='all'?'Sfondo di VARCO':'Sfondo del workspace',properties:['openFile'],
      filters:[{name:'Immagini',extensions:['jpg','jpeg','png','webp','gif','avif','bmp']}]});
    if(result.canceled||!result.filePaths[0])return {ok:true,cancelled:true};
    const imported=appearance.importWallpaper(result.filePaths[0]);
    if(!imported.ok)return imported;
    if(scope==='all')a().wallpaper={...a().wallpaper,kind:'image',file:imported.file};
    else{
      const ws=data.workspaces.find(x=>x.name===w?.workspace);
      if(!ws)return {ok:false,error:'Workspace non trovato.'};
      ws.wallpaper=imported.file;
    }
    changed();appearance.cleanWallpapers();
    return {ok:true};
  });
  add('setWallpaperKind',{kind:['default','none']},'Sfondo di tutti i workspace: quello di VARCO o nessuno (tinta unita).',({kind})=>{
    a().wallpaper={...a().wallpaper,kind,file:''};changed();appearance.cleanWallpapers();
  });
  add('clearWorkspaceWallpaper',{},'Il workspace attivo torna allo sfondo di tutti.',(_x,w)=>{
    const ws=data.workspaces.find(x=>x.name===w?.workspace);
    if(ws){ws.wallpaper='';changed();appearance.cleanWallpapers();}
  });

  // ── Link rapidi della Home (per workspace) ─────────────────────────────
  add('addHomeLink',{url:'string',title:'string?'},'Aggiunge un link rapido alla Home del workspace attivo.',({url,title},w)=>{
    const ws=data.workspaces.find(x=>x.name===w?.workspace);
    if(!ws)return {ok:false,error:'Workspace non trovato.'};
    let href=url.trim();
    if(href&&!/^https?:\/\//i.test(href))href='https://'+href;
    try{const u=new URL(href);if(!/^https?:$/.test(u.protocol)||!u.hostname.includes('.')&&u.hostname!=='localhost')throw 0;href=u.href;}
    catch{return {ok:false,error:'Indirizzo non valido.'};}
    if(ws.homeLinks.length>=rules.MAX_LINKS)return {ok:false,error:`Al massimo ${rules.MAX_LINKS} link.`};
    ws.homeLinks=rules.normalizeLinks([...ws.homeLinks,{url:href,title:title||''}]);
    save();windows.emitAll();
    return {ok:true};
  });
  add('removeHomeLink',{index:'int'},'Toglie un link rapido dalla Home del workspace attivo.',({index},w)=>{
    const ws=data.workspaces.find(x=>x.name===w?.workspace);
    if(!ws||!ws.homeLinks[index])return {ok:false,error:'Link non trovato.'};
    ws.homeLinks.splice(index,1);save();windows.emitAll();
    return {ok:true};
  });
}

module.exports={registerAppearanceCommands};
