'use strict';

/**
 * Beta 0.42 — tutorial: progresso salvato e «modalità tour».
 *
 * Il tour vive nella cornice (tour.js): evidenzia i pulsanti veri con un riflettore. La pagina web però sta
 * SOPRA la cornice (è una vista a parte), quindi durante il tour la nascondiamo e al suo posto mostriamo una
 * sua foto, come fa il command center. Le regole (passi, «Non mostrare più», suggerimenti) sono in tour-rules.js.
 */
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const R=require('../tour-rules.js');

function setup(bus){
  const reg=(name,args,description,fn)=>bus.register(name,{args,description,run:(ctx,a)=>fn(ctx.window,a)});
  reg('tourState',{},'Tutorial: stato (progresso, «Non mostrare più», suggerimenti visti).',()=>({tour:state.data.tour,offer:R.shouldOffer(state.data.tour)}));
  reg('tourEvent',{type:'string',level:'string?',idx:'int?',id:'string?',on:'bool?'},'Tutorial: salva un passo, un suggerimento visto, «Non mostrare più»…',
    (_w,ev)=>{state.data.tour=R.apply(state.data.tour,ev);save();windows.emitAll();return {tour:state.data.tour};});
  reg('tourMode',{on:'bool'},'Tutorial: nasconde la pagina (con la sua foto al posto) mentre il riflettore è acceso.',async(w,{on})=>{
    if(!w)return {ok:false};
    w.tourOpen=on;
    if(on){
      const picture=await require('./palette.cjs').backdrop(w);
      windows.sendUi(w,{type:'tourBackdrop',backdrop:picture,bounds:w.attached?.getBounds()||null});
    }
    windows.layout(w);
    return {ok:true};
  });
}
/** Un evento che completa un passo (es. il launcher aperto con la scorciatoia di sistema). */
function event(name){for(const w of state.windows)windows.sendUi(w,{type:'tourEvent',name});}

module.exports={setup,event};
