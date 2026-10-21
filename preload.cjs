const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('browserAPI',{
action:(action,args)=>ipcRenderer.invoke('action',action,args),onState:(cb)=>{ipcRenderer.on('state',(_,data)=>cb(data));}});
