'use strict';

/**
 * Ricerca della palette dei comandi (Beta 0.11). Lo stesso file serve alla
 * cornice (caricato con <script>) e ai test di Node (module.exports): per
 * questo non usa né Electron né il DOM.
 */
(function(root){
  /** Minuscolo e senza accenti: "Velocità" si trova scrivendo "velocita". */
  const plain=text=>String(text||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

  /**
   * Quanto bene una parola cercata corrisponde a un testo.
   * Inizio del testo > inizio di una parola > dentro una parola > lettere in ordine sparse.
   * @returns {number} 0 = nessuna corrispondenza.
   */
  function wordScore(word,text){
    const index=text.indexOf(word);
    if(index===0)return 100;
    if(index>0)return /[a-z0-9]/.test(text[index-1])?50:80;
    // "nsch" trova "Nuova scheda": ogni lettera nell'ordine giusto.
    let at=0;
    for(const char of word){at=text.indexOf(char,at);if(at===-1)return 0;at++;}
    return word.length>=2?10:0;
  }

  /**
   * Punteggio di un elemento: TUTTE le parole cercate devono comparire.
   * L'etichetta conta più del resto (parole chiave, indirizzo, workspace).
   */
  function score(query,item){
    const words=plain(query).split(/\s+/).filter(Boolean);
    if(!words.length)return 1;
    const label=plain(item.label),rest=plain([item.keywords,item.detail].filter(Boolean).join(' '));
    let total=0;
    for(const word of words){
      const value=Math.max(wordScore(word,label),wordScore(word,rest)*0.6);
      if(!value)return 0;
      total+=value;
    }
    // A parità, etichette più corte (più precise) e tipi più utili vengono prima.
    return total+(KIND_BONUS[item.kind]||0)-Math.min(label.length,60)/20;
  }
  const KIND_BONUS={tab:6,command:5,workspace:4,project:4,game:3,bookmark:2,history:0};

  /**
   * Elementi da mostrare per un testo. Senza testo: l'ordine del processo principale.
   * @param {Array<{kind:string,label:string,detail?:string,keywords?:string}>} items
   */
  function filterItems(items,query,limit=50){
    if(!String(query||'').trim())return items.slice(0,limit);
    return items.map((item,index)=>({item,index,value:score(query,item)}))
      .filter(x=>x.value>0)
      .sort((a,b)=>b.value-a.value||a.index-b.index)
      .slice(0,limit).map(x=>x.item);
  }

  const api={plain,wordScore,score,filterItems};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.paletteRules=api;
})(typeof window!=='undefined'?window:globalThis);
