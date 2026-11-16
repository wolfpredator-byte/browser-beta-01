'use strict';

/**
 * Beta 0.38 — command center (F1, Ctrl+Shift+P): sezioni e ordine dei risultati.
 * Come palette-rules.js serve sia alla cornice (<script>) sia ai test di Node (module.exports):
 * niente Electron, niente DOM. Il punteggio delle parole è quello della palette (palette-rules.js).
 *
 * Gli elementi arrivano dal processo principale (lib/command-center.cjs) con:
 *   {id, sec, kind, label, detail?, keywords?, ws?, now?, pinned?}
 * sec = sezione: now (solo come "Apri subito"), tabs, projects, links, commands, web, jarvis, create.
 * Web, Jarvis e Crea hanno anche elementi che dipendono dal testo scritto: li aggiunge chi chiama (dynamic).
 */
(function(root){
  const rules=typeof module!=='undefined'&&module.exports?require('./palette-rules.js'):root.paletteRules;

  const SECTIONS=[
    {id:'now',title:'Apri subito'},
    {id:'tabs',title:'Schede',prefix:'@'},
    {id:'projects',title:'Progetti',prefix:'#'},
    {id:'links',title:'Fast link',prefix:'/'},
    {id:'commands',title:'Comandi',prefix:'>'},
    {id:'web',title:'Web',prefix:'g '},
    {id:'jarvis',title:'JARVIS',prefix:'?'},
    {id:'create',title:'Crea',prefix:'+'}
  ];
  /** "Dove cercare": ovunque, solo il workspace attivo, o una sezione. */
  const SCOPES=[['all','Ovunque'],['ws','Questo workspace'],['tabs','Schede'],['projects','Progetti'],['links','Fast link'],['commands','Comandi'],['web','Web'],['jarvis','JARVIS']];

  /** "> zen" → {text:'zen', forced:'commands'}. Il prefisso sceglie la sezione. */
  function parseQuery(raw){
    const text=String(raw||'').trimStart();
    for(const s of SECTIONS){
      if(!s.prefix)continue;
      if(text.toLowerCase().startsWith(s.prefix))return {text:text.slice(s.prefix.length).trim(),forced:s.id};
    }
    return {text:text.trim(),forced:null};
  }

  /** Sembra una domanda: JARVIS sale in cima. */
  const isQuestion=text=>/\?\s*$/.test(text)||/^(come|cosa|perch[eé]|quanto|quanti|quale|quali|dove|chi|quando|spiegami|spiega|riassumi|dimmi)\s/i.test(String(text).trim());

  /**
   * Sezioni da mostrare.
   * @param {object[]} items - dal processo principale.
   * @param {string} raw - testo scritto (con l'eventuale prefisso).
   * @param {{active:string,scope?:string,collapsed?:string[],expanded?:string[],dynamic?:(text:string)=>object[]}} opts
   * @returns {{id,title,prefix,items,shown,more,split,collapsed}[]}
   *   split = posizione della riga "Altri workspace" dentro shown (-1 = nessuna).
   */
  function buildGroups(items,raw,opts={}){
    const {text,forced}=parseQuery(raw);
    const active=opts.active;
    const scope=forced||opts.scope||'all';
    const collapsed=new Set(opts.collapsed||[]),expanded=new Set(opts.expanded||[]);
    const inScope=id=>scope==='all'||scope==='ws'||scope===id;
    const dyn=(opts.dynamic?opts.dynamic(text):[]).filter(Boolean);
    let pool=items.concat(dyn.filter(x=>!x.always));
    if(scope==='ws')pool=pool.filter(x=>!x.ws||x.ws===active);
    const typed=!!text;
    const out=[];
    const push=(id,list)=>{
      if(!list.length||!inScope(id))return;
      const s=SECTIONS.find(s=>s.id===id);
      const limit=expanded.has(id)?200:typed?(id==='now'?3:5):(id==='now'?5:6);
      const shown=list.slice(0,limit);
      const split=shown.findIndex(x=>x.ws&&x.ws!==active);
      out.push({...s,items:list,shown,more:Math.max(0,list.length-limit),
        split:split>0&&shown.slice(0,split).some(x=>x.ws===active)?split:-1,collapsed:collapsed.has(id)});
    };
    const activeFirst=list=>list.map((x,i)=>({x,i})).sort((a,b)=>((a.x.ws&&a.x.ws!==active)-(b.x.ws&&b.x.ws!==active))||a.i-b.i).map(o=>o.x);

    if(!typed){
      const now=forced?[]:pool.filter(x=>x.now).slice(0,5);
      const nowIds=new Set(now.map(x=>x.id));
      push('now',now);
      for(const id of ['tabs','projects','links','commands','jarvis','create']){
        let list=pool.filter(x=>x.sec===id&&!nowIds.has(x.id));
        if(id==='links')list=list.filter(x=>x.pinned||x.kind==='session').concat(list.filter(x=>!x.pinned&&x.kind!=='session'));
        push(id,activeFirst(list));
      }
      // Con il prefisso "g " senza testo, o con Dove cercare = Web: preferiti e cronologia.
      if(scope==='web')push('web',pool.filter(x=>x.sec==='web'));
      return out;
    }

    // Con il testo: punteggio della palette + un vantaggio al workspace attivo.
    const scored=pool.map((x,i)=>({x,i,v:x.always?1:rules.score(text,x)})).filter(o=>o.v>0);
    const value=o=>o.v+(o.x.ws&&o.x.ws===active?15:0)+(o.x.pinned?5:0);
    const bySec=id=>scored.filter(o=>o.x.sec===id).sort((a,b)=>value(b)-value(a)||a.i-b.i).map(o=>o.x);
    let nowIds=new Set();
    if(!forced&&scope==='all'||scope==='ws'){
      const best=scored.filter(o=>['tabs','projects','links'].includes(o.x.sec)&&!o.x.dynamic&&o.v>=60)
        .sort((a,b)=>value(b)-value(a)||a.i-b.i).slice(0,3).map(o=>o.x);
      nowIds=new Set(best.map(x=>x.id));
      push('now',best);
    }
    for(const id of ['tabs','projects','links','commands'])push(id,bySec(id).filter(x=>!nowIds.has(x.id)));
    // Web: prima la ricerca e i suggerimenti (nell'ordine dato), poi preferiti e cronologia.
    push('web',dyn.filter(x=>x.sec==='web').concat(bySec('web').filter(x=>!x.dynamic)));
    push('jarvis',dyn.filter(x=>x.sec==='jarvis').concat(bySec('jarvis').filter(x=>!x.dynamic)));
    push('create',dyn.filter(x=>x.sec==='create'));
    if(isQuestion(text)){const j=out.findIndex(g=>g.id==='jarvis');if(j>0)out.unshift(...out.splice(j,1));}
    return out;
  }

  /** Risultati nell'ordine della tastiera (sezioni aperte, solo quelli mostrati). */
  function flatten(groups){
    const list=[];
    for(const g of groups)if(!g.collapsed)g.shown.forEach(x=>list.push({item:x,group:g.id}));
    return list;
  }

  const api={SECTIONS,SCOPES,parseQuery,isQuestion,buildGroups,flatten};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.commandCenterRules=api;
})(typeof window!=='undefined'?window:globalThis);
