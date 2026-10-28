// Preload del livello dei toast (overlay.html): solo i tre canali che gli servono.
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('overlayAPI',{
  onToast:cb=>{ipcRenderer.on('overlay:toast',(_,toast)=>cb(toast));},
  resize:height=>ipcRenderer.send('overlay:resize',height),
  action:(name,args)=>ipcRenderer.invoke('overlay:action',name,args)
});
