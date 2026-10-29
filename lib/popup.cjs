'use strict';

/**
 * Menu e dialoghi VARCO (Beta 0.15, mock-up "Page Slider and Context Menus"
 * e "Notification System").
 *
 * Come i toast, vivono in una WebContentsView trasparente sopra la pagina
 * (popup.html), che copre tutta la finestra solo mentre un menu o un dialogo
 * è aperto. Le API ricalcano quelle di Electron, così sostituirle è facile:
 * - menu(w, template)   come Menu.buildFromTemplate(template).popup(): stesse voci
 *   (label, click, enabled, type 'separator'|'checkbox'|'radio', checked, submenu,
 *   accelerator, role) più `icon` (nome di un'icona VARCO) e `danger`.
 * - dialog(w, options)  come dialog.showMessageBox(): stessa risposta {response, checkboxChecked}.
 * Le funzioni delle voci restano nel processo principale: alla vista arrivano solo
 * testi e numeri, e la vista risponde con il numero della voce scelta.
 */
const path=require('node:path');
const {ipcMain,WebContentsView,dialog:nativeDialog,screen}=require('electron');
const {state}=require('./state.cjs');

let current=null; // {w, kind:'menu'|'dialog', actions:Map|null, resolve, cancelId}

function viewOf(w){
  if(w.popup&&!w.popup.webContents.isDestroyed())return w.popup;
  const view=new WebContentsView({webPreferences:{preload:path.join(__dirname,'..','popup-preload.cjs'),
    sandbox:true,contextIsolation:true,nodeIntegration:false}});
  view.setBackgroundColor('#00000000');
  view.setVisible(false);
  w.popup=view;
  w.popupReady=new Promise(resolve=>view.webContents.once('did-finish-load',()=>{require('./appearance.cjs').applyTo(view.webContents);resolve();}));
  view.webContents.loadFile(path.join(__dirname,'..','popup.html'));
  w.win.contentView.addChildView(view);
  w.win.once('closed',()=>{if(!view.webContents.isDestroyed())view.webContents.close();});
  // Clic su un'altra finestra: il menu si chiude, come quelli di Windows.
  w.win.on('blur',()=>{if(current?.w===w&&current.kind==='menu')finish(null);});
  return view;
}

async function open(w,message){
  if(current)finish(null); // un solo popup alla volta
  const view=viewOf(w);
  await w.popupReady;
  const [width,height]=w.win.getContentSize();
  view.setBounds({x:0,y:0,width,height});
  view.setVisible(true);
  w.win.contentView.addChildView(view); // sopra pagina e toast
  view.webContents.send('popup:open',message);
  view.webContents.focus();
}

function finish(choice){
  if(!current)return;
  const {w,kind,actions,resolve,cancelId}=current;
  current=null;
  if(w.popup&&!w.popup.webContents.isDestroyed()){w.popup.setVisible(false);w.popup.webContents.send('popup:close');}
  if(kind==='menu'){
    const fn=choice===null?null:actions.get(choice);
    try{fn?.();}catch(error){console.error('Voce di menu non riuscita',error);}
    resolve();
  }else resolve(choice??{response:cancelId,checkboxChecked:false});
}

/** "CommandOrControl+Shift+T" → "Ctrl+Shift+T" */
const keysOf=accelerator=>accelerator?String(accelerator).replace(/CommandOrControl|CmdOrCtrl/g,'Ctrl').replace(/Plus/g,'+'):'';

const ROLES={copy:'Copia',cut:'Taglia',paste:'Incolla',selectAll:'Seleziona tutto',undo:'Annulla',redo:'Ripeti'};
const ROLE_KEYS={copy:'Ctrl+C',cut:'Ctrl+X',paste:'Ctrl+V',selectAll:'Ctrl+A',undo:'Ctrl+Z',redo:'Ctrl+Y'};

/**
 * @param {object} w - Finestra.
 * @param {Array<object>} template - Voci in stile Electron.
 * @param {{contents?:Electron.WebContents,x?:number,y?:number}} options - contents riceve i ruoli (copia, incolla…);
 *   x/y nella finestra, altrimenti la posizione del mouse.
 */
function menu(w,template,options={}){
  if(!w||w.win.isDestroyed())return Promise.resolve();
  const actions=new Map();let next=1;
  const convert=items=>items.filter(Boolean).filter(i=>i.visible!==false).map(item=>{
    if(item.type==='separator')return {separator:true};
    const id=next++;
    let click=item.click;
    if(!click&&item.role&&options.contents){const c=options.contents;click=()=>c[item.role]?.();}
    if(click)actions.set(id,click);
    return {id,label:item.label||ROLES[item.role]||'',icon:item.icon||null,color:/^#[0-9a-f]{6}$/i.test(item.color||'')?item.color:null,keys:keysOf(item.accelerator)||ROLE_KEYS[item.role]||'',
      enabled:item.enabled!==false,checked:(item.type==='checkbox'||item.type==='radio')?!!item.checked:null,
      danger:!!item.danger,submenu:item.submenu?convert(item.submenu):null};
  });
  const items=convert(template);
  // Togli separatori doppi, iniziali o finali.
  const clean=list=>list.filter((x,i,a)=>!x.separator||(i>0&&i<a.length-1&&!a[i-1].separator));
  const tidy=list=>clean(list).map(x=>x.submenu?{...x,submenu:tidy(x.submenu)}:x);
  let {x,y}=options;
  if(x===undefined||y===undefined){
    const cursor=screen.getCursorScreenPoint(),origin=w.win.getContentBounds();
    x=cursor.x-origin.x;y=cursor.y-origin.y;
  }
  return new Promise(resolve=>{
    open(w,{kind:'menu',items:tidy(items),x:Math.round(x),y:Math.round(y)});
    current={w,kind:'menu',actions,resolve};
  });
}

/**
 * Dialogo VARCO al posto di dialog.showMessageBox (stesse opzioni principali).
 * In più: icon (nome di un'icona VARCO), dangerId (pulsante rosso), primaryId (pulsante viola).
 */
function dialog(w,options){
  if(!w||w.win.isDestroyed())return nativeDialog.showMessageBox(options);
  const cancelId=options.cancelId??options.buttons.length-1;
  return new Promise(resolve=>{
    open(w,{kind:'dialog',title:options.title||'',message:options.message||'',detail:options.detail||'',
      icon:options.icon||{warning:'warning',error:'warning',question:'info',info:'info'}[options.type]||'info',
      tone:options.type==='warning'||options.type==='error'?'warning':'normal',
      buttons:options.buttons,defaultId:options.defaultId??0,cancelId,
      primaryId:options.primaryId??options.defaultId??0,dangerId:options.dangerId??-1,
      checkboxLabel:options.checkboxLabel||'',checkboxChecked:!!options.checkboxChecked});
    current={w,kind:'dialog',resolve,cancelId};
  });
}

function setup(){
  const fromPopup=event=>current&&current.w.popup?.webContents===event.sender;
  ipcMain.on('popup:choose',(event,choice)=>{
    if(!fromPopup(event))return;
    if(current.kind==='menu')finish(Number.isInteger(choice)?choice:null);
    else finish(choice&&Number.isInteger(choice.response)?{response:choice.response,checkboxChecked:!!choice.checkboxChecked}:null);
  });
  ipcMain.on('popup:dismiss',event=>{if(fromPopup(event))finish(null);});
}

/** La finestra cambia dimensione: un menu aperto si chiude, un dialogo si adatta. */
function resized(w){
  if(current?.w!==w)return;
  if(current.kind==='menu')finish(null);
  else if(w.popup){const [width,height]=w.win.getContentSize();w.popup.setBounds({x:0,y:0,width,height});}
}

module.exports={setup,menu,dialog,resized,isOpen:w=>current?.w===w};
