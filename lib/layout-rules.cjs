'use strict';

/**
 * Disposizioni delle finestre (Beta 0.8), senza Electron.
 *
 * Una disposizione ricorda, per ogni finestra di un workspace: su quale
 * monitor sta, dove (in proporzione all'area del monitor), se è massimizzata
 * e quali schede contiene. Le proporzioni rendono la disposizione valida anche
 * se cambi risoluzione: "metà sinistra del monitor 3" resta metà sinistra.
 */

const MIN_WIDTH=760,MIN_HEIGHT=520; // Uguali a minWidth/minHeight in windows.cjs.

/** Monitor ordinati da sinistra a destra (come in displayLabels di game-rules.cjs). */
const sortDisplays=displays=>[...displays].sort((a,b)=>a.bounds.x-b.bounds.x||a.bounds.y-b.bounds.y);

/** Monitor che contiene il centro della finestra; se nessuno, il più vicino. */
function displayForBounds(bounds,displays){
  const cx=bounds.x+bounds.width/2,cy=bounds.y+bounds.height/2;
  const inside=displays.find(d=>cx>=d.bounds.x&&cx<d.bounds.x+d.bounds.width&&cy>=d.bounds.y&&cy<d.bounds.y+d.bounds.height);
  if(inside)return inside;
  const distance=d=>Math.hypot(cx-(d.bounds.x+d.bounds.width/2),cy-(d.bounds.y+d.bounds.height/2));
  return [...displays].sort((a,b)=>distance(a)-distance(b))[0]||null;
}

const round=n=>Math.round(n*10000)/10000;

/**
 * Posizione di una finestra in proporzione all'area utile del suo monitor.
 * @param {{x,y,width,height}} bounds - Posizione "normale" (non massimizzata) della finestra.
 * @param {Array<{id,bounds,workArea}>} displays
 * @returns {{displayId:number,displayIndex:number,rect:{x,y,w,h}}}
 */
function toRelative(bounds,displays){
  const sorted=sortDisplays(displays);
  const display=displayForBounds(bounds,sorted);
  const a=display.workArea;
  return {displayId:display.id,displayIndex:sorted.indexOf(display),
    rect:{x:round((bounds.x-a.x)/a.width),y:round((bounds.y-a.y)/a.height),
      w:round(bounds.width/a.width),h:round(bounds.height/a.height)}};
}

/**
 * Sceglie il monitor di una finestra salvata:
 * 1. lo stesso monitor (stesso id di Windows);
 * 2. altrimenti quello nella stessa posizione da sinistra (gli id possono cambiare
 *    dopo un aggiornamento dei driver, la disposizione fisica no);
 * 3. altrimenti il principale.
 */
function pickDisplay(saved,displays,primaryId){
  const sorted=sortDisplays(displays);
  return sorted.find(d=>d.id===saved.displayId)||sorted[saved.displayIndex]||
    sorted.find(d=>d.id===primaryId)||sorted[0]||null;
}

/**
 * Da proporzioni a pixel, sempre dentro il monitor e mai più piccola del minimo.
 * @returns {{x,y,width,height}}
 */
function toAbsolute(rect,workArea){
  const width=Math.min(workArea.width,Math.max(MIN_WIDTH,Math.round(rect.w*workArea.width)));
  const height=Math.min(workArea.height,Math.max(MIN_HEIGHT,Math.round(rect.h*workArea.height)));
  const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);
  return {x:clamp(Math.round(workArea.x+rect.x*workArea.width),workArea.x,workArea.x+workArea.width-width),
    y:clamp(Math.round(workArea.y+rect.y*workArea.height),workArea.y,workArea.y+workArea.height-height),width,height};
}

/**
 * Schede da aggiungere a una finestra per completare la disposizione.
 * Non chiude nulla: le schede in più che hai aperto restano.
 * @param {Array<{url:string,home?:boolean}>} wanted - Schede salvate della finestra.
 * @param {string[]} openUrls - Indirizzi già aperti in quella finestra.
 */
function missingTabs(wanted,openUrls){
  const open=new Set(openUrls);
  return wanted.filter(t=>!t.home&&!open.has(t.url));
}

/** Breve descrizione per menu e Home: "3 finestre su 3 monitor". */
function describeLayout(layout){
  if(!layout?.windows?.length)return '';
  const windows=layout.windows.length,monitors=new Set(layout.windows.map(w=>w.displayIndex)).size;
  return `${windows} ${windows===1?'finestra':'finestre'} su ${monitors} ${monitors===1?'monitor':'monitor'}`;
}

module.exports={sortDisplays,displayForBounds,toRelative,pickDisplay,toAbsolute,missingTabs,describeLayout,MIN_WIDTH,MIN_HEIGHT};
