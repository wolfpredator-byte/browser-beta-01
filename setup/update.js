// Finestra dell'aggiornamento (Beta 0.23): versione e avanzamento, nient'altro.
const version=new URLSearchParams(location.search).get('version')||'';
document.getElementById('title').textContent=`Aggiorno VARCO alla ${version}…`;
const STEPS={remove:'Aspetto che VARCO si chiuda',extract:'Copio i file nuovi',config:'Aggiorno le impostazioni di Windows',finish:'Fatto: riapro VARCO'};
window.setupAPI.onProgress(({step,percent})=>{
  document.getElementById('step').textContent=STEPS[step]||'';
  document.getElementById('bar').style.width=Math.max(2,percent)+'%';
});
