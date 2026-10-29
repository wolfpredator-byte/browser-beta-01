const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('browserAPI',{
action:(action,args)=>ipcRenderer.invoke('action',action,args),onState:(cb)=>{ipcRenderer.on('state',(_,data)=>cb(data));},
// Messaggi puntuali dal processo principale, es. {type:'focusAddress'} per Ctrl+L.
onUi:(cb)=>{ipcRenderer.on('ui',(_,message)=>cb(message));},
// Beta 0.20: percorso di un file trascinato sulla finestra (per il visualizzatore).
pathForFile:file=>{try{return webUtils.getPathForFile(file);}catch{return '';}}});
