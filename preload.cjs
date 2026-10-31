const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('browserAPI',{
action:(action,args)=>ipcRenderer.invoke('action',action,args),onState:(cb)=>{ipcRenderer.on('state',(_,data)=>cb(data));},
// Messaggi puntuali dal processo principale, es. {type:'focusAddress'} per Ctrl+L.
onUi:(cb)=>{ipcRenderer.on('ui',(_,message)=>cb(message));},
// Beta 0.20: percorso di un file trascinato sulla finestra (per il visualizzatore).
pathForFile:file=>{try{return webUtils.getPathForFile(file);}catch{return '';}}});

// Beta 0.26: "ponte" per le icone delle estensioni (<browser-action-list>, electron-chrome-extensions).
// È la parte di browser-action.js che parla col processo principale; gli elementi grafici li carica
// index.html da viewer/vendor/frame/ (estratti da scripts/vendor.cjs): la cornice resta in sandbox.
{
  const {EventEmitter}=require('events');
  const emitter=new EventEmitter();
  const actions=new Map(),observers=new Map();
  const invoke=(name,partition,...args)=>ipcRenderer.invoke('crx-msg-remote',partition,name,...args);
  const browserAction={
    addEventListener:(name,listener)=>emitter.addListener('-actions-'+name,listener),
    removeEventListener:(name,listener)=>emitter.removeListener('-actions-'+name,listener),
    getAction:id=>actions.get(id),
    async getState(partition){
      const result=await invoke('browserAction.getState',partition);
      for(const action of result.actions)actions.set(action.id,action);
      queueMicrotask(()=>emitter.emit('-actions-update',result));
      return result;
    },
    activate:(partition,details)=>invoke('browserAction.activate',partition,details),
    addObserver(partition){
      const count=(observers.get(partition)||0)+1;
      observers.set(partition,count);
      if(count===1)invoke('browserAction.addObserver',partition);
    },
    removeObserver(partition){
      const count=Math.max((observers.get(partition)||0)-1,0);
      observers.set(partition,count);
      if(count===0){invoke('browserAction.removeObserver',partition);observers.delete(partition);}
    }
  };
  ipcRenderer.on('browserAction.update',()=>{for(const partition of observers.keys())browserAction.getState(partition);});
  contextBridge.exposeInMainWorld('browserAction',browserAction);
}
