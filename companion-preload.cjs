// Beta 0.43.4: ponte del companion compatto. Pochi comandi su un canale suo (lib/companion-panel.cjs).
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('companion',{
  call:(cmd,args)=>ipcRenderer.invoke('companion',cmd,args),
  onPoke:cb=>ipcRenderer.on('companion:poke',()=>cb())
});
