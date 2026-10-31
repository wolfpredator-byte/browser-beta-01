'use strict';

/**
 * Movimento delle pagine (Beta 0.27). Le pagine web sono WebContentsView: non hanno
 * transizioni CSS, quindi le animiamo noi cambiando la loro posizione un fotogramma alla volta.
 * Impostazioni → Animazioni: auto (segue l'opzione di Windows) · full · reduced · off.
 */
const {systemPreferences}=require('electron');
const {state}=require('./state.cjs');

const FRAME=16;
const timers=new Map(); // "finestra:chiave" → intervallo in corso

/** 'full', 'reduced' o 'off'. */
function level(){
  const chosen=state.data?.settings?.motion||'auto';
  if(chosen!=='auto')return chosen;
  try{if(systemPreferences.getAnimationSettings().prefersReducedMotion)return 'reduced';}catch{}
  return 'full';
}
/** Durata di un'animazione secondo il livello (0 = salta). */
const duration=ms=>({full:ms,reduced:Math.round(ms*.45),off:0})[level()]??ms;
const easeOut=t=>1-Math.pow(1-t,3);
const lerp=(a,b,t)=>Math.round(a+(b-a)*t);

function cancel(owner,key){
  const id=owner.win?.id+':'+key;
  clearInterval(timers.get(id));timers.delete(id);
}
/**
 * Porta una view da `from` a `to` in `ms` millisecondi (rallentando all'arrivo).
 * Una nuova animazione sulla stessa chiave sostituisce quella in corso.
 */
function animateBounds(owner,key,view,from,to,ms){
  cancel(owner,key);
  const total=duration(ms);
  const same=['x','y','width','height'].every(k=>from[k]===to[k]);
  if(!total||same||view.webContents?.isDestroyed()){view.setBounds(to);return;}
  const id=owner.win.id+':'+key,start=Date.now();
  const step=()=>{
    if(view.webContents?.isDestroyed()||owner.win.isDestroyed()){cancel(owner,key);return;}
    const t=Math.min(1,(Date.now()-start)/total),k=easeOut(t);
    view.setBounds({x:lerp(from.x,to.x,k),y:lerp(from.y,to.y,k),width:lerp(from.width,to.width,k),height:lerp(from.height,to.height,k)});
    if(t>=1)cancel(owner,key);
  };
  step();
  timers.set(id,setInterval(step,FRAME));
}

module.exports={level,duration,easeOut,animateBounds,cancel};
