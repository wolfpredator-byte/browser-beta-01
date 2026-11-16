// Preload della vista del lettore (media-overlay.html): solo i canali che le servono.
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('mediaAPI',{
  onState:cb=>{ipcRenderer.on('mediaov:state',(_,s)=>cb(s));},
  action:(name,args)=>ipcRenderer.invoke('mediaov:action',name,args),
  resize:height=>ipcRenderer.send('mediaov:resize',height),
  hover:inside=>ipcRenderer.send('mediaov:hover',inside),
  close:()=>ipcRenderer.send('mediaov:close')
});
