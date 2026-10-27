const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('browserAPI',{
action:(action,args)=>ipcRenderer.invoke('action',action,args),onState:(cb)=>{ipcRenderer.on('state',(_,data)=>cb(data));},
// Messaggi puntuali dal processo principale, es. {type:'focusAddress'} per Ctrl+L.
onUi:(cb)=>{ipcRenderer.on('ui',(_,message)=>cb(message));}});
