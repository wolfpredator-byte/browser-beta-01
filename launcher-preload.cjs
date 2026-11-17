// Beta 0.39 — preload del launcher (launcher.html): solo i canali che gli servono.
const {contextBridge,ipcRenderer,webUtils}=require('electron');
const CHANNELS=['launcher:open','launcher:close','launcher:leave','launcher:switch','launcher:refresh','launcher:pool','launcher:media'];
contextBridge.exposeInMainWorld('launcherAPI',{
  invoke:(op,args)=>ipcRenderer.invoke('launcher:invoke',op,args),
  on:(channel,cb)=>{if(CHANNELS.includes(channel))ipcRenderer.on(channel,(_,data)=>cb(data));},
  // File trascinati sul launcher: il percorso serve per aggiungerli al profilo.
  pathOf:file=>{try{return webUtils.getPathForFile(file);}catch{return '';}}
});
