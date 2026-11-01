'use strict';
// Livello della vista divisa (Beta 0.28). Riceve le zone dal processo principale; mentre trascini
// una scheda sopra la pagina, con Shift, mostra il lato più vicino. Rilasciando, lo comunica.
const LABELS={left:'A sinistra',right:'A destra',top:'In alto',bottom:'In basso'};
const preview=document.getElementById('preview'),hint=document.getElementById('hint');
let info=null,zone=null;

window.splitDropAPI.onInfo(next=>{info=next;zone=null;preview.hidden=true;hint.hidden=false;});

/** Il lato più vicino al mouse (solo con Shift e solo dove la scheda ci sta). */
function zoneAt(event){
  const x=event.clientX/innerWidth,y=event.clientY/innerHeight;
  const near={left:x,right:1-x,top:y,bottom:1-y};
  return event.shiftKey?Object.keys(near).filter(z=>info.zones[z]).sort((a,b)=>near[a]-near[b])[0]||null:null;
}
function show(next){
  hint.hidden=!!next;
  if(next===zone)return;
  zone=next;
  preview.hidden=!zone;
  if(!zone)return;
  const r=info.zones[zone];
  Object.assign(preview.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});
  preview.textContent=LABELS[zone];
}
document.addEventListener('dragover',event=>{
  if(!info)return;
  event.preventDefault();
  event.dataTransfer.dropEffect='move';
  show(zoneAt(event));
});
// Chromium manda dragleave anche passando da un elemento all'altro: conta solo se il mouse è uscito davvero.
document.addEventListener('dragleave',event=>{
  const out=event.clientX<=0||event.clientY<=0||event.clientX>=innerWidth||event.clientY>=innerHeight;
  if(out)show(null);
});
document.addEventListener('drop',event=>{
  event.preventDefault();
  // La zona è quella che stai vedendo (aggiornata a ogni dragover).
  window.splitDropAPI.drop(zone);
  show(null);
});
