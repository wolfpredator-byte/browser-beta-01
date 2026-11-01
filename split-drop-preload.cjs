// Preload del livello della vista divisa (split-drop.html): solo i due canali che gli servono.
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('splitDropAPI',{
  onInfo:cb=>{ipcRenderer.on('splitdrop:info',(_,info)=>cb(info));},
  drop:zone=>ipcRenderer.send('splitdrop:drop',zone)
});
