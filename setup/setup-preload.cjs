// Preload dell'installer: solo i canali che servono alle schermate.
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('setupAPI',{
  info:()=>ipcRenderer.invoke('setup:info'),
  free:dir=>ipcRenderer.invoke('setup:free',dir),
  chooseDir:current=>ipcRenderer.invoke('setup:chooseDir',current),
  running:()=>ipcRenderer.invoke('setup:running'),
  closeVarco:()=>ipcRenderer.invoke('setup:closeVarco'),
  install:options=>ipcRenderer.invoke('setup:install',options),
  finish:options=>ipcRenderer.invoke('setup:finish',options),
  onProgress:cb=>{ipcRenderer.on('setup:progress',(_,p)=>cb(p));},
  window:action=>ipcRenderer.send('setup:window',action)
});
