'use strict';

/**
 * Disposizione dell'interfaccia (Beta 0.28), senza Electron.
 *
 * Due blocchi si possono mettere dove vuoi:
 *   - le schede (barra delle schede): in basso, in alto, a sinistra o a destra;
 *   - la barra laterale (workspace e strumenti): a sinistra, a destra, in alto o in basso.
 * Se finiscono dallo stesso lato si uniscono: in una colonna (come Arc e Zen: workspace in alto,
 * schede al centro, strumenti in basso) o in una barra sola. Con merge:false, ai lati, restano
 * due colonne affiancate (barra di icone + colonna delle schede).
 * Le strisce in alto/in basso occupano tutta la larghezza; le colonne stanno tra le strisce.
 *
 * Una sola regola per processo principale (dove mettere le pagine) e cornice (dove disegnare le barre).
 */
const HEADER=94;                                   // barra del titolo (30) + barra degli indirizzi (64)
const SIDEBAR_WIDTHS={hidden:0,compact:62,expanded:198};
const TABS_BAR=43,TABS_COLUMN=240,SIDEBAR_STRIP=46,MERGED_COLUMN=250;
const SIDES=['bottom','top','left','right'];
const vertical=side=>side==='left'||side==='right';

/** Combinazioni pronte (Impostazioni → Disposizione). */
const PRESETS={
  classico:{label:'Classico',tabs:'bottom',sidebar:'left',merge:true},
  'schede-alto':{label:'Schede in alto',tabs:'top',sidebar:'left',merge:true},
  colonna:{label:'Colonna unica',tabs:'left',sidebar:'left',merge:true},
  'icone-colonna':{label:'Icone + colonna schede',tabs:'left',sidebar:'left',merge:false},
  'workspace-basso':{label:'Workspace in basso',tabs:'left',sidebar:'bottom',merge:true},
  destra:{label:'Tutto a destra',tabs:'right',sidebar:'right',merge:true},
  'barra-unica':{label:'Una barra sola',tabs:'bottom',sidebar:'bottom',merge:true}
};

function normalizeLayout(raw){
  const r=raw&&typeof raw==='object'?raw:{};
  return {tabs:SIDES.includes(r.tabs)?r.tabs:'bottom',sidebar:SIDES.includes(r.sidebar)?r.sidebar:'left',merge:r.merge!==false,
    compact:r.compact===true};
}

/**
 * Modalità compatta: le barre restano al loro posto, ma la pagina le copre lasciando solo un bordo
 * sottile su ogni lato che ne ha una. Passandoci sopra col mouse, la pagina si ritira e le barre tornano.
 */
const COMPACT_EDGE=6;
function compactInsets(f){
  const edge=v=>v>0?COMPACT_EDGE:0;
  return {...f,top:edge(f.top),bottom:edge(f.bottom),left:edge(f.left),right:edge(f.right)};
}
/** Il nome della combinazione pronta che corrisponde (o '' se è una disposizione tua). */
function presetOf(layout){
  const l=normalizeLayout(layout);
  const found=Object.entries(PRESETS).find(([,p])=>p.tabs===l.tabs&&p.sidebar===l.sidebar&&(p.merge===l.merge||!(l.tabs===l.sidebar&&vertical(l.tabs))));
  return found?found[0]:'';
}

/**
 * Dove sta ogni blocco nella finestra.
 * @param {{width:number,height:number}} content - Area della finestra.
 * @param {object} layout - Disposizione (normalizeLayout).
 * @param {'hidden'|'compact'|'expanded'} sidebarMode
 * @returns {{top:number,bottom:number,left:number,right:number,
 *   tabs:{x,y,width,height,orientation}|null, sidebar:{x,y,width,height,orientation,merged}|null}}
 *   top/bottom/left/right: spazio occupato dalle barre su ogni lato (top comprende la barra degli indirizzi).
 */
function frameLayout(content,layout,sidebarMode='compact'){
  const l=normalizeLayout(layout);
  const sidebarOn=sidebarMode!=='hidden';
  const merged=sidebarOn&&l.tabs===l.sidebar&&(!vertical(l.tabs)||l.merge);
  const blocks=merged?[{kind:'sidebar',side:l.sidebar,merged:true}]
    :[{kind:'sidebar',side:l.sidebar,merged:false},{kind:'tabs',side:l.tabs}].filter(b=>b.kind==='tabs'||sidebarOn);
  const sizeOf=b=>vertical(b.side)
    ?(b.merged?MERGED_COLUMN:b.kind==='tabs'?TABS_COLUMN:SIDEBAR_WIDTHS[sidebarMode]??SIDEBAR_WIDTHS.compact)
    :(b.kind==='tabs'?TABS_BAR:SIDEBAR_STRIP);
  const out={top:HEADER,bottom:0,left:0,right:0,tabs:null,sidebar:null};
  // offset: distanza dal bordo a cui il blocco è attaccato (non cambia se la finestra cambia misura).
  const place=(b,rect)=>{
    const offset={top:rect.y,bottom:content.height-rect.y-rect.height,left:rect.x,right:content.width-rect.x-rect.width}[b.side];
    const value={...rect,offset,size:vertical(b.side)?rect.width:rect.height,orientation:vertical(b.side)?'vertical':'horizontal',side:b.side};
    if(b.kind==='tabs')out.tabs=value;else out.sidebar={...value,merged:!!b.merged};
  };
  // Strisce in alto e in basso, larghe quanto la finestra (la barra laterale è la più esterna).
  for(const b of blocks.filter(x=>x.side==='top').sort((a,c)=>a.kind==='sidebar'?-1:1)){
    const h=sizeOf(b);place(b,{x:0,y:out.top,width:content.width,height:h});out.top+=h;
  }
  for(const b of blocks.filter(x=>x.side==='bottom').sort((a,c)=>a.kind==='sidebar'?-1:1)){
    const h=sizeOf(b);out.bottom+=h;place(b,{x:0,y:content.height-out.bottom,width:content.width,height:h});
  }
  // Colonne tra le strisce (la barra laterale resta sul bordo, le schede vicino alla pagina).
  const y=out.top,height=Math.max(0,content.height-out.top-out.bottom);
  for(const b of blocks.filter(x=>x.side==='left').sort((a,c)=>a.kind==='sidebar'?-1:1)){
    const w=sizeOf(b);place(b,{x:out.left,y,width:w,height});out.left+=w;
  }
  for(const b of blocks.filter(x=>x.side==='right').sort((a,c)=>a.kind==='sidebar'?-1:1)){
    const w=sizeOf(b);out.right+=w;place(b,{x:content.width-out.right,y,width:w,height});
  }
  return out;
}

module.exports={HEADER,SIDEBAR_WIDTHS,TABS_BAR,TABS_COLUMN,SIDEBAR_STRIP,MERGED_COLUMN,COMPACT_EDGE,SIDES,PRESETS,normalizeLayout,presetOf,frameLayout,compactInsets};
