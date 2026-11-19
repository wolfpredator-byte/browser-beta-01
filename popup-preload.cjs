// Preload del livello di menu e dialoghi (popup.html): riceve cosa mostrare, risponde con la scelta.
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('popupAPI',{
  onOpen:cb=>{ipcRenderer.on('popup:open',(_,message)=>cb(message));},
  onClose:cb=>{ipcRenderer.on('popup:close',()=>cb());},
  choose:choice=>ipcRenderer.send('popup:choose',choice),
  dismiss:()=>ipcRenderer.send('popup:dismiss'),
  // Beta 0.45: finestrella che resta aperta (scudo del blocco)
  act:payload=>ipcRenderer.send('popup:act',payload),
  onUpdate:cb=>{ipcRenderer.on('popup:update',(_,message)=>cb(message));}
});
