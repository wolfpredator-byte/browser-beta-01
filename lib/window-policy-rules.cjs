'use strict';

/**
 * Beta 0.43 — dove si apre una finestra, per tipo (principale, companion, progetto, popup). Senza Electron, per i test.
 *
 * Il monitor si ricorda per «impronta» fisica (id, nome, risoluzione, posizione), non solo per l'id di Electron:
 * su Windows l'id può cambiare dopo un riavvio o ricollegando un monitor. Se il monitor non c'è più → principale.
 * Il companion non eredita mai la posizione dell'ultima finestra di VARCO.
 */
const SIDES=['full','left','right','top','bottom','center','custom'];
const SIDE_LABELS={full:'Tutto lo schermo',left:'Metà sinistra',right:'Metà destra',top:'Metà in alto',bottom:'Metà in basso',center:'Al centro',custom:'Dove l’hai messo tu'};
const SIZES=[25,33,40,50,60,67,75,100];

/** Impronta di un monitor (da salvare). */
function displayKey(d){
  if(!d)return null;
  return {id:d.id,label:String(d.label||'').slice(0,80),w:d.size?.width??d.bounds.width,h:d.size?.height??d.bounds.height,x:d.bounds.x,y:d.bounds.y};
}
function normalizeKey(k){
  if(!k||typeof k!=='object')return null;
  const n=v=>Number.isFinite(v)?Math.round(v):null;
  const out={id:Number.isInteger(k.id)?k.id:null,label:typeof k.label==='string'?k.label.slice(0,80):'',w:n(k.w),h:n(k.h),x:n(k.x),y:n(k.y)};
  return out.w&&out.h?out:null;
}
/**
 * Il monitor salvato tra quelli collegati adesso, o null. Ordine: id + risoluzione, nome + risoluzione,
 * stessa posizione + risoluzione, solo id. Mai un monitor diverso «a caso».
 */
function findDisplay(key,displays){
  const k=normalizeKey(key);if(!k)return null;
  const size=d=>(d.size?.width??d.bounds.width)===k.w&&(d.size?.height??d.bounds.height)===k.h;
  return displays.find(d=>d.id===k.id&&size(d))
    ||(k.label&&displays.find(d=>d.label===k.label&&size(d)))
    ||displays.find(d=>d.bounds.x===k.x&&d.bounds.y===k.y&&size(d))
    ||displays.find(d=>d.id===k.id)
    ||null;
}
/** Rettangolo dentro l'area utile del monitor: lato + dimensione in %, oppure la posizione relativa salvata (custom). */
function placeRect(area,{side='full',size=100,rel=null}={}){
  const pct=Math.max(25,Math.min(100,Number(size)||100))/100;
  const {x,y,width:W,height:H}=area;
  const r=v=>Math.round(v);
  switch(side){
    case 'left':return {x,y,width:r(W*Math.min(pct,1)),height:H};
    case 'right':{const w=r(W*pct);return {x:x+W-w,y,width:w,height:H};}
    case 'top':return {x,y,width:W,height:r(H*pct)};
    case 'bottom':{const h=r(H*pct);return {x,y:y+H-h,width:W,height:h};}
    case 'center':{const w=r(W*pct),h=r(H*pct);return {x:x+r((W-w)/2),y:y+r((H-h)/2),width:w,height:h};}
    case 'custom':{
      if(!rel)return {x,y,width:W,height:H};
      const c=v=>Math.max(0,Math.min(1,Number(v)||0));
      const w=Math.max(480,r(W*c(rel.w))),h=Math.max(360,r(H*c(rel.h)));
      return {x:Math.min(x+W-w,x+r(W*c(rel.x))),y:Math.min(y+H-h,y+r(H*c(rel.y))),width:Math.min(w,W),height:Math.min(h,H)};
    }
    default:return {x,y,width:W,height:H};
  }
}
/** Posizione relativa (0–1) di una finestra nell'area del suo monitor, per «Apri sempre qui». */
function relativeTo(area,b){
  const f=v=>Math.round(v*1000)/1000;
  return {x:f((b.x-area.x)/area.width),y:f((b.y-area.y)/area.height),w:f(b.width/area.width),h:f(b.height/area.height)};
}
/** Regola di posizione salvata (companion di un gioco o predefinita). */
function normalizePlace(p){
  if(!p||typeof p!=='object')return null;
  const side=SIDES.includes(p.side)?p.side:'full';
  const size=SIZES.includes(p.size)?p.size:100;
  const rel=side==='custom'&&p.rel&&typeof p.rel==='object'?{x:+p.rel.x||0,y:+p.rel.y||0,w:+p.rel.w||1,h:+p.rel.h||1}:null;
  return {display:normalizeKey(p.display),side:side==='custom'&&!rel?'full':side,size,rel};
}
/**
 * Dove aprire il companion di un gioco.
 * Ordine: regola del gioco → monitor del gioco (vecchio id) → posizione predefinita del companion → monitor principale.
 * @returns {{display:object, rect:object, maximize:boolean, healed:boolean}}
 */
function companionTarget(game,defaults,displays,primary){
  const place=normalizePlace(game.place)||{display:null,side:null,size:null,rel:null};
  const def=normalizePlace(defaults)||{display:null,side:'full',size:100,rel:null};
  let display=findDisplay(place.display,displays);
  if(!display&&Number.isInteger(game.display))display=displays.find(d=>d.id===game.display)||null;
  if(!display)display=findDisplay(def.display,displays);
  if(!display)display=primary;
  const side=place.side||def.side||'full',size=place.size||def.size||100,rel=place.rel||null;
  const rect=placeRect(display.workArea,{side,size,rel});
  return {display,rect,maximize:side==='full'&&size===100,healed:Number.isInteger(game.display)&&game.display!==display.id&&!!findDisplay(place.display,displays)};
}
/** «Sposta sull'altro monitor»: il successivo da sinistra a destra (si ricomincia dal primo). */
function nextDisplay(current,displays){
  const sorted=[...displays].sort((a,b)=>a.bounds.x-b.bounds.x||a.bounds.y-b.bounds.y);
  const i=sorted.findIndex(d=>d.id===current?.id);
  return sorted[(i+1)%sorted.length]||null;
}

module.exports={SIDES,SIDE_LABELS,SIZES,displayKey,normalizeKey,findDisplay,placeRect,relativeTo,normalizePlace,companionTarget,nextDisplay};
