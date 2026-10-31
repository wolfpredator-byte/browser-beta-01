'use strict';

/**
 * Vista divisa a più riquadri (Beta 0.28), senza Electron e senza DOM: lo stesso file serve
 * al processo principale e ai test (module.exports) e alla cornice (<script>, window.splitRules),
 * che lo usa per le anteprime e mentre trascini un divisore.
 *
 * split = {mode, ids, ratioX, ratioY}
 *   cols   [A | B]                    ratioX
 *   rows   [A / B]                    ratioY
 *   main3  [A | B / C]  A alta tutta  ratioX, ratioY (colonna di destra)
 *   main3r [A / B | C]  C alta tutta  ratioX, ratioY (colonna di sinistra)
 *   grid   [A B / C D]                ratioX, ratioY
 * Trascinando una scheda verso un lato della pagina (con Shift) la si aggiunge da quel lato:
 * addToSplit decide la disposizione nuova, layoutSplit dove sta ogni riquadro.
 */
(function(root){
const MODES={cols:2,rows:2,main3:3,main3r:3,grid:4};
const ZONES=['left','right','top','bottom'];
const clampRatio=r=>Number.isFinite(r)?Math.min(.8,Math.max(.2,r)):.5;

/** Vista divisa salvata o vecchia ({leftId,rightId,ratio} della 0.18) → forma attuale, o null. */
function normalizeSplit(raw){
  if(!raw||typeof raw!=='object')return null;
  if(Number.isInteger(raw.leftId)&&Number.isInteger(raw.rightId))
    return raw.leftId===raw.rightId?null:{mode:'cols',ids:[raw.leftId,raw.rightId],ratioX:clampRatio(raw.ratio),ratioY:.5};
  if(!Object.hasOwn(MODES,raw.mode)||!Array.isArray(raw.ids))return null;
  const ids=raw.ids.filter(Number.isInteger);
  if(ids.length!==MODES[raw.mode]||new Set(ids).size!==ids.length)return null;
  return {mode:raw.mode,ids,ratioX:clampRatio(raw.ratioX),ratioY:clampRatio(raw.ratioY)};
}

/** Divide una lunghezza in due parti con uno spazio in mezzo. */
const cut=(start,length,ratio,gap)=>{const first=Math.round((Math.max(2,length-gap))*ratio);return [[start,first],[start+first+gap,Math.max(1,length-gap-first)]];};

/**
 * Dove sta ogni riquadro e ogni divisore.
 * @returns {{rects:Object<number,{x,y,width,height}>, dividers:{axis:'x'|'y',key:'ratioX'|'ratioY',rect:object,span:object}[]}}
 *   span: l'area che il divisore spartisce (serve alla cornice per trascinarlo).
 */
function layoutSplit(full,split,gap=8){
  const s=normalizeSplit(split);
  if(!s)return {rects:{},dividers:[]};
  const R=(x,w,y,h)=>({x,y,width:w,height:h});
  const [[x1,w1],[x2,w2]]=cut(full.x,full.width,s.ratioX,gap);
  const [[y1,h1],[y2,h2]]=cut(full.y,full.height,s.ratioY,gap);
  const rects={},dividers=[];
  const vertical=(y,h)=>dividers.push({axis:'x',key:'ratioX',rect:R(x1+w1,gap,y,h),span:R(full.x,full.width,y,h)});
  const horizontal=(x,w)=>dividers.push({axis:'y',key:'ratioY',rect:R(x,w,y1+h1,gap),span:R(x,w,full.y,full.height)});
  const [a,b,c,d]=s.ids;
  if(s.mode==='cols'){rects[a]=R(x1,w1,full.y,full.height);rects[b]=R(x2,w2,full.y,full.height);vertical(full.y,full.height);}
  if(s.mode==='rows'){rects[a]=R(full.x,full.width,y1,h1);rects[b]=R(full.x,full.width,y2,h2);horizontal(full.x,full.width);}
  if(s.mode==='main3'){rects[a]=R(x1,w1,full.y,full.height);rects[b]=R(x2,w2,y1,h1);rects[c]=R(x2,w2,y2,h2);vertical(full.y,full.height);horizontal(x2,w2);}
  if(s.mode==='main3r'){rects[a]=R(x1,w1,y1,h1);rects[b]=R(x1,w1,y2,h2);rects[c]=R(x2,w2,full.y,full.height);vertical(full.y,full.height);horizontal(x1,w1);}
  if(s.mode==='grid'){rects[a]=R(x1,w1,y1,h1);rects[b]=R(x2,w2,y1,h1);rects[c]=R(x1,w1,y2,h2);rects[d]=R(x2,w2,y2,h2);vertical(full.y,full.height);horizontal(full.x,full.width);}
  return {rects,dividers};
}

/**
 * Aggiunge una scheda alla vista divisa, dal lato indicato.
 * Nessuna vista: si affianca alla scheda attiva. Due riquadri: diventano tre. Tre: diventano quattro.
 * @returns {object|null} la vista nuova, o null se non si può (già 4, scheda già dentro…).
 */
function addToSplit(split,activeId,newId,zone){
  if(!ZONES.includes(zone)||!Number.isInteger(newId))return null;
  const s=normalizeSplit(split);
  const keep={ratioX:s?.ratioX??.5,ratioY:.5};
  if(!s){
    if(!Number.isInteger(activeId)||activeId===newId)return null;
    if(zone==='left')return {mode:'cols',ids:[newId,activeId],...keep};
    if(zone==='right')return {mode:'cols',ids:[activeId,newId],...keep};
    if(zone==='top')return {mode:'rows',ids:[newId,activeId],...keep};
    return {mode:'rows',ids:[activeId,newId],...keep};
  }
  if(s.ids.includes(newId)||s.ids.length>=4)return null;
  const [a,b,c]=s.ids;
  if(s.mode==='cols'){
    // La nuova va sotto (o sopra) il lato più vicino; a sinistra/destra diventa una colonna intera.
    if(zone==='right')return {mode:'main3r',ids:[a,b,newId],ratioX:.5,ratioY:.5};
    if(zone==='left')return {mode:'main3',ids:[newId,a,b],ratioX:.5,ratioY:.5};
    if(zone==='bottom')return {mode:'main3',ids:[a,b,newId],ratioX:s.ratioX,ratioY:.5};
    return {mode:'main3',ids:[a,newId,b],ratioX:s.ratioX,ratioY:.5};
  }
  if(s.mode==='rows'){
    // Sopra e sotto c'è già una riga intera: la nuova diventa una colonna a sinistra o a destra.
    if(zone==='right')return {mode:'main3r',ids:[a,b,newId],ratioX:.5,ratioY:s.ratioY};
    if(zone==='left')return {mode:'main3',ids:[newId,a,b],ratioX:.5,ratioY:s.ratioY};
    return null;
  }
  // Tre riquadri → griglia 2×2: la nuova prende l'angolo libero dal lato scelto.
  if(s.mode==='main3'){ // [a | b / c] → [a b / n c] o [n b / a c]
    return zone==='top'?{mode:'grid',ids:[newId,b,a,c],ratioX:s.ratioX,ratioY:s.ratioY}:{mode:'grid',ids:[a,b,newId,c],ratioX:s.ratioX,ratioY:s.ratioY};
  }
  if(s.mode==='main3r'){ // [a / b | c] → [a n / b c] o [a c / b n]
    return zone==='bottom'?{mode:'grid',ids:[a,c,b,newId],ratioX:s.ratioX,ratioY:s.ratioY}:{mode:'grid',ids:[a,newId,b,c],ratioX:s.ratioX,ratioY:s.ratioY};
  }
  return null;
}

/** Toglie una scheda: quattro → tre, tre → due, due → nessuna vista (null). */
function removeFromSplit(split,id){
  const s=normalizeSplit(split);
  if(!s||!s.ids.includes(id))return s;
  const rest=s.ids.filter(x=>x!==id);
  if(rest.length<2)return null;
  if(rest.length===2)return {mode:s.mode==='rows'?'rows':'cols',ids:rest,ratioX:.5,ratioY:.5};
  const keep={ratioX:s.ratioX,ratioY:s.ratioY};
  // Da griglia a tre: il riquadro rimasto solo nella sua colonna diventa alto tutta la finestra.
  const [tl,tr,bl,br]=s.ids;
  if(id===tl)return {mode:'main3',ids:[bl,tr,br],...keep};
  if(id===bl)return {mode:'main3',ids:[tl,tr,br],...keep};
  if(id===tr)return {mode:'main3r',ids:[tl,bl,br],...keep};
  return {mode:'main3r',ids:[tl,bl,tr],...keep};
}

const api={MODES,ZONES,clampRatio,normalizeSplit,layoutSplit,addToSplit,removeFromSplit};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.splitRules=api;
})(typeof window!=='undefined'?window:globalThis);
