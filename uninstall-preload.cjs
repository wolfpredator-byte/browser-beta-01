// Preload della finestra di disinstallazione (lib/uninstall.cjs).
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('uninstallAPI',{
  run:options=>ipcRenderer.invoke('uninstall:run',options),
  close:()=>ipcRenderer.send('uninstall:close')
});
