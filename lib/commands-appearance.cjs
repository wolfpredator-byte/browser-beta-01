'use strict';

/**
 * Comandi della personalizzazione (Beta 0.21): tema e colore, sfondo (anche per
 * workspace), interfaccia (densità, testo, angoli, pulsanti) e Home (riquadri, link rapidi).
 */
const {dialog}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const appearance=require('./appearance.cjs');
const rules=require('./appearance-rules.cjs');

function registerAppearanceCommands(bus){
  const {data}=state;
  const a=()=>data.appearance;
  // Dopo ogni scelta: salva, ridisegna le cornici, aggiorna menu, notifiche e angoli delle pagine.
  const changed=()=>{data.appearance=rules.normalizeAppearance(data.appearance);save();windows.emitAll();appearance.refreshOverlays();windows.layoutAll();};
  const add=(name,args,description,run)=>bus.register(name,{args,description,run:(ctx,x)=>{
    const result=run(x,ctx.window||windows.focusedWindow(),ctx);
    return result;
  }});

  add('setTheme',{theme:Object.keys(rules.THEMES)},'Tema pronto (colore d\'accento e tinta dello sfondo).',({theme})=>{a().theme=theme;a().accent='';changed();});
  add('setAccent',{color:'string'},'Colore d\'accento personalizzato (#rrggbb), vuoto per quello del tema.',({color})=>{
    if(color&&!/^#[0-9a-f]{6}$/i.test(color))return {ok:false,error:'Colore non valido.'};
    a().accent=color.toLowerCase();changed();return {ok:true};
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
