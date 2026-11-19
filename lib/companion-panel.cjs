'use strict';

/**
 * Companion compatto (Beta 0.43.4): una finestra piccola accanto al gioco, senza le barre del browser.
 * Mostra i widget della board del gioco (partita, timer, obiettivi, note, catture, link) e, nella misura «estesa»,
 * una pagina web alla volta (i siti del preset). Trasparenza, sempre in primo piano e «attraversabile» per preset.
 * Ctrl+Shift+G: lo mostra o nasconde; se è attraversabile, lo rende di nuovo usabile.
 * Parla con il processo principale su un canale suo ('companion'), con pochi comandi: non ha accesso al bus della cornice.
 */
const path=require('node:path');
const {BrowserWindow,WebContentsView,ipcMain,globalShortcut,screen,shell}=require('electron');
const {state}=require('./state.cjs');
const store=require('./board-store.cjs');
const R=require('./board-rules.cjs');

const panels=new Map(); // id gioco → {win,view,game,page,through,hidden}
const HOTKEY='CommandOrControl+Shift+G';
const gameOf=id=>state.data.games.find(g=>String(g.id)===String(id))||null;

function config(game){
  const ctx=store.context('game',game.id);if(!ctx)return {index:null,cfg:R.defaultComp('amici')};
  const index=store.readIndex(ctx),p=index.presets[index.session?.preset||index.lastPreset];
  return {ctx,index,preset:p,cfg:p?.comp||R.defaultComp(index.session?.preset||index.lastPreset)};
}
/** Rettangolo sul monitor del gioco: lato e larghezza del preset, tutta l'altezza utile. */
function rectFor(game,cfg){
  const display=require('./companion.cjs').companionRect(game).display||screen.getPrimaryDisplay();
  const a=display.workArea,w=Math.round(Math.max(cfg.mode==='wide'?560:300,a.width*cfg.size/100)),m=12;
  return {x:cfg.side==='left'?a.x+m:a.x+a.width-w-m,y:a.y+m,width:Math.min(w,a.width-2*m),height:a.height-2*m};
}
function layoutView(p){
  if(!p.view||p.win.isDestroyed())return;
  const {cfg}=config(p.game),[w,h]=p.win.getContentSize();
  const show=cfg.mode==='wide'&&!!p.page&&!p.covered;   // coperta mentre è aperto un menu del companion
  p.view.setVisible(show);
  if(show)p.view.setBounds({x:300,y:84,width:Math.max(100,w-300),height:Math.max(100,h-84-34)});
}
function apply(id){
  const p=panels.get(String(id));if(!p||p.win.isDestroyed())return;
  const {cfg,index}=config(p.game);
  p.win.setBounds(rectFor(p.game,cfg));
  // «screen-saver»: l'unico livello che resta sopra i giochi a schermo intero senza bordi (con «floating» Windows lo ignora).
  p.win.setAlwaysOnTop(!!cfg.top,'screen-saver');
  p.win.setOpacity(p.hover?1:cfg.op/100);
  p.through=!!cfg.through&&!p.forceUse;
  p.win.setIgnoreMouseEvents(p.through,{forward:true});
  // Beta 0.43.5: le pagine sono quelle del preset più quelle aperte al volo (un indirizzo qualsiasi).
  const names=[...((index?.presets?.[index.session?.preset||index.lastPreset]?.open)||[]),...p.temp.map(t=>t.n)];
  if(p.page&&!names.includes(p.page))p.page=null;
  if(!p.page&&cfg.mode==='wide')p.page=names[0]||null;
  const url=p.page?(index.quick.find(q=>q.n===p.page)?.u||p.temp.find(t=>t.n===p.page)?.u):null;
  // Si ricarica solo se cambia pagina: se navighi dentro la pagina, resti dove sei.
  if(url&&p.view&&p.loaded!==p.page+'|'+url){p.loaded=p.page+'|'+url;p.view.webContents.loadURL(url).catch(()=>{});}
  layoutView(p);
  send(p);
}
function send(p){if(!p.win.isDestroyed())p.win.webContents.send('companion:poke');}

function open(game){
  const key=String(game.id);let p=panels.get(key);
  if(p&&!p.win.isDestroyed()){p.win.showInactive();apply(key);return p;}
  const {cfg}=config(game);
  const win=new BrowserWindow({...rectFor(game,cfg),frame:false,show:false,skipTaskbar:false,resizable:true,minimizable:true,maximizable:false,
    title:game.name+' · Companion',backgroundColor:'#101013',
    webPreferences:{preload:path.join(__dirname,'..','companion-preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false}});
  // Pagine del preset: una alla volta, con la sessione (account) del workspace del gioco.
  const partition=require('./web-session.cjs').partitionFor(game.workspace);
  const view=new WebContentsView({webPreferences:{partition,contextIsolation:true,sandbox:true}});
  view.setVisible(false);win.contentView.addChildView(view);
  view.webContents.setWindowOpenHandler(({url})=>{if(/^https?:/i.test(url))require('./tabs.cjs').newTab(url,game.workspace,{activate:false});return {action:'deny'};});
  p={win,view,game,page:null,temp:[],loaded:'',through:false,hover:false,forceUse:false,hidden:false};panels.set(key,p);
  view.webContents.on('did-navigate',()=>send(p));view.webContents.on('did-navigate-in-page',()=>send(p));
  win.loadFile(path.join(__dirname,'..','companion.html'),{query:{id:key}});
  win.once('ready-to-show',()=>{win.showInactive();apply(key);});
  win.on('resize',()=>layoutView(p));
  win.on('closed',()=>{panels.delete(key);if(!panels.size)globalShortcut.unregister(HOTKEY);});
  if(!globalShortcut.isRegistered(HOTKEY))globalShortcut.register(HOTKEY,hotkey);
  return p;
}
/** Aggiunge (o toglie) una pagina dai siti «Apri» del preset in uso: così la ritrovi la prossima volta. */
function addPage(p,name){const {ctx,index}=config(p.game);if(!ctx)return;const k=index.session?.preset||index.lastPreset,pr=index.presets[k];if(!pr||pr.open.includes(name))return;pr.open.push(name);store.writeIndex(ctx,index);}
function removePage(p,name){const {ctx,index}=config(p.game);if(!ctx)return;const k=index.session?.preset||index.lastPreset,pr=index.presets[k];if(!pr||!pr.open.includes(name))return;pr.open=pr.open.filter(n=>n!==name);store.writeIndex(ctx,index);}
/** «Apri in una scheda»: apre la pagina in VARCO e ci porta (finestra in primo piano, scheda attiva). */
function openInVarco(url,game){
  const windows=require('./windows.cjs'),tabs=require('./tabs.cjs');
  const w=windows.windowFor(game.workspace)||windows.focusedWindow()||state.windows[0];
  if(!w)return;
  const id=tabs.newTab(url,w.workspace,{pane:w.pane});
  if(id)tabs.show(w,id);
  if(w.win.isMinimized())w.win.restore();w.win.show();w.win.focus();
}
function close(game){const p=panels.get(String(game.id));if(p&&!p.win.isDestroyed())p.win.close();}
function hotkey(){
  for(const p of panels.values()){if(p.win.isDestroyed())continue;
    if(p.through){p.forceUse=true;p.through=false;p.win.setIgnoreMouseEvents(false);p.win.setOpacity(1);send(p);continue;}
    if(p.win.isVisible()){p.win.hide();p.hidden=true;}else{p.win.showInactive();p.hidden=false;p.forceUse=false;apply(p.game.id);}}
}

/** Stato per la finestra: board del gioco, partita, preset e colori del tema. */
function snapshot(id){
  const game=gameOf(id);if(!game)return {missing:true};
  const snap=store.snapshot('game',id),{index,cfg}=config(game),p=panels.get(String(id));
  const s=index?.session,pick=!!s&&!s.picked&&Date.now()-s.start<20000;
  const wc=p?.view?.webContents;
  return {game:{id:game.id,name:game.name},index:snap.index,board:snap.board,shots:snap.shots.slice(0,6),rev:snap.rev,cfg,pick,
    page:p?.page||null,temp:p?.temp||[],nav:wc?{url:wc.getURL(),back:wc.navigationHistory.canGoBack(),fwd:wc.navigationHistory.canGoForward()}:null,through:!!p?.through,vars:require('./appearance.cjs').snapshot(game.workspace).vars};
}
function saveComp(id,patch){
  const game=gameOf(id),{ctx,index}=config(game);if(!ctx)return;
  const k=index.session?.preset||index.lastPreset;if(!index.presets[k])return;
  index.presets[k].comp={...(index.presets[k].comp||R.defaultComp(k)),...patch};store.writeIndex(ctx,index);apply(id);
}

function setup(){
  ipcMain.handle('companion',async(event,cmd,args={})=>{
    const p=[...panels.values()].find(x=>!x.win.isDestroyed()&&x.win.webContents===event.sender);
    if(!p)return {ok:false,error:'mittente non autorizzato'};
    const id=p.game.id;
    switch(cmd){
      case 'state':return snapshot(id);
      case 'saveBoard':return store.save('game',id,String(args.board||''),null);
      case 'pick':{const r=require('./game-session.cjs').setPreset(id,String(args.preset||''),{picked:true});apply(id);return r;}
      case 'hover':p.hover=!!args.on;if(!p.win.isDestroyed())p.win.setOpacity(p.hover?1:config(p.game).cfg.op/100);return {ok:true};
      case 'page':p.page=args.name?String(args.name):null;if(p.page)saveComp(id,{mode:'wide'});else apply(id);return {ok:true};
      case 'mode':saveComp(id,{mode:args.mode==='wide'?'wide':'strip'});return {ok:true};
      case 'top':saveComp(id,{top:!config(p.game).cfg.top});return {ok:true};
      case 'link':{const l=config(p.game).index?.quick?.[args.i];if(!l)return {ok:false};
        if(l.w==='scheda')openInVarco(l.u,p.game);else{addPage(p,l.n);p.page=l.n;saveComp(id,{mode:'wide'});}return {ok:true};}
      // Beta 0.43.5: la pagina del companion si cambia: altri link rapidi, un indirizzo qualsiasi, avanti/indietro, apri in VARCO.
      case 'pageAdd':{const name=String(args.name||'');if(!config(p.game).index?.quick?.some(q=>q.n===name))return {ok:false};addPage(p,name);p.page=name;saveComp(id,{mode:'wide'});return {ok:true};}
      case 'pageRemove':{const name=String(args.name||'');p.temp=p.temp.filter(t=>t.n!==name);removePage(p,name);if(p.page===name)p.page=null;apply(id);return {ok:true};}
      case 'pageUrl':{let u=String(args.url||'').trim();if(!u)return {ok:false};if(!/^https?:\/\//i.test(u))u=/\s/.test(u)||!/\./.test(u)?'https://www.google.com/search?q='+encodeURIComponent(u):'https://'+u;
        let n='';try{n=new URL(u).hostname.replace(/^www\./,'');}catch{return {ok:false};}
        p.temp=p.temp.filter(t=>t.n!==n).concat({n,u});p.page=n;p.loaded='';saveComp(id,{mode:'wide'});return {ok:true};}
      case 'nav':{const wc=p.view.webContents,h=wc.navigationHistory;if(args.dir==='back'&&h.canGoBack())h.goBack();else if(args.dir==='forward'&&h.canGoForward())h.goForward();else if(args.dir==='reload')wc.reload();return {ok:true};}
      case 'openTab':{const u=p.view.webContents.getURL();if(/^https?:/i.test(u))openInVarco(u,p.game);return {ok:true};}
      case 'openShot':{const f=store.mediaPath('game',id,args.name);if(f)shell.openPath(f);return {ok:!!f};}
      case 'gamePage':{const w=require('./windows.cjs').focusedWindow()||state.windows[0];if(w){require('./game-session.cjs').openPage(w,id);w.win.show();w.win.focus();}return {ok:true};}
      case 'full':require('./companion.cjs').openCompanion(p.game,{test:true});return {ok:true};
      case 'cover':p.covered=!!args.on;layoutView(p);return {ok:true};
      case 'hide':p.win.hide();p.hidden=true;return {ok:true};
      case 'close':p.win.close();return {ok:true};
      default:return {ok:false};
    }
  });
}

module.exports={setup,open,close,apply,panels};
