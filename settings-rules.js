'use strict';

/**
 * Panoramica delle Impostazioni (Beta 0.34). Raggruppa le sezioni in categorie e
 * scrive per ognuna una riga di stato in parole. Come palette-rules.js serve sia
 * alla cornice (<script>) sia ai test di Node (module.exports): niente DOM né Electron.
 */
(function(root){
  /** Categorie nell'ordine della panoramica; `sections` sono i titoli delle sezioni di renderer.js. */
  const CATEGORIES=[
    {id:'aspetto',title:'Aspetto',icon:'logo',sections:['Disposizione','Preset','Tema e colori','I miei preset','Sfondo','Interfaccia','Home']},
    {id:'navigazione',title:'Ricerca e navigazione',icon:'search',sections:['Ricerca','Scorciatoie di ricerca','Stili dei siti']},
    {id:'schede',title:'Schede',icon:'tabs',sections:['Schede']},
    {id:'privacy',title:'Privacy e sicurezza',icon:'shield',sections:['Privacy e sicurezza','Password']},
    {id:'telefono',title:'Telefono',icon:'external',sections:['Telefono']},
    {id:'estensioni',title:'Estensioni',icon:'commands',sections:['Estensioni']},
    {id:'sistema',title:'Sistema',icon:'settings',sections:['Aggiornamenti','Avvio e background','Browser e file','JARVIS','Dati','Informazioni']},
  ];

  /** Categoria di una sezione dal suo titolo; le sezioni nuove finiscono in Sistema finché non le si assegna. */
  function categoryOf(title){
    return (CATEGORIES.find(c=>c.sections.includes(title))||CATEGORIES[CATEGORIES.length-1]).id;
  }

  const plural=(n,one,many)=>`${n} ${n===1?one:many}`;
  const SLEEP={0:'mai sospese',15:'sospese dopo 15 min',30:'sospese dopo 30 min',60:'sospese dopo 1 ora',120:'sospese dopo 2 ore'};

  /**
   * Riga di stato di ogni categoria.
   * @param {object} st lo stato della cornice (settings, appearanceSettings, passwords, link, extensions, update, bangSettings)
   * @param {(time:number)=>string} [ago] "4 minuti fa"
   * @returns {Record<string,{text:string,error?:boolean}>}
   */
  function summaries(st,ago=()=>''){
    const s=st.settings||{},a=st.appearanceSettings,p=st.passwords,l=st.link,x=st.extensions,u=st.update,b=st.bangSettings;
    const out={};
    if(a){
      const theme=a.themes?.find(t=>t.id===a.theme)?.label;
      const wall=a.wallpaper?.kind==='image'?a.wallpaperName:a.wallpaper?.kind==='none'?'tinta unita':a.wallpaper?.kind==='gradient'?'sfondo generato':'sfondo del tema';
      out.aspetto={text:[theme,a.mode==='chiaro'?'tema chiaro':'tema scuro',wall].filter(Boolean).join(' · ')};
    }else out.aspetto={text:'Preset, colori, sfondo e disposizione'};
    const engine=s.engines?.find(e=>e.id===s.searchEngine)?.label;
    const bangs=b?(b.builtIn?.length||0)+(b.custom?.length||0):0;
    out.navigazione={text:[engine,bangs?plural(bangs,'scorciatoia','scorciatoie'):''].filter(Boolean).join(' · ')||'Motore di ricerca e scorciatoie'};
    out.schede={text:[SLEEP[s.sleepAfterMinutes]||'',s.autoArchive?.enabled?`archivio dopo ${plural(s.autoArchive.days,'giorno','giorni')}`:'nessun archivio automatico']
      .filter(Boolean).join(' · ')};
    out.privacy={text:[s.adblock?(s.adblock.enabled?'Blocco attivo':'Blocco spento'):'',
      p?.available?plural(p.entries?.length||0,'password','password'):'',
      s.sitesWithPermissions?plural(s.sitesWithPermissions,'sito con permessi','siti con permessi'):''].filter(Boolean).join(' · ')};
    if(!l||!l.enabled)out.telefono={text:'Collegamento spento'};
    else if(l.error)out.telefono={text:'Il PC non riesce a mettersi in ascolto',error:true};
    else if(!l.devices?.length)out.telefono={text:'Nessun telefono collegato'};
    else{const d=l.devices[0];out.telefono={text:l.devices.length>1?plural(l.devices.length,'telefono collegato','telefoni collegati'):
      `${d.name} collegato`+(d.lastSeen?' · visto '+ago(d.lastSeen):'')};}
    out.estensioni={text:x?(x.list?.length?plural(x.list.length,'estensione','estensioni'):'Nessuna estensione'):'Estensioni del Chrome Web Store'};
    if(u?.state==='error')out.sistema={text:'Controllo aggiornamenti non riuscito',error:true};
    else if(u?.state==='ready')out.sistema={text:`VARCO ${u.version} è pronto da installare`};
    else if(s.errors)out.sistema={text:plural(s.errors,'errore registrato','errori registrati')+' in questa sessione'};
    else out.sistema={text:u?.current?`VARCO ${u.current}`:'Aggiornamenti, avvio, dati'};
    for(const v of Object.values(out))v.text=v.text.charAt(0).toUpperCase()+v.text.slice(1);
    return out;
  }

  /** Categorie con qualcosa da sistemare, nell'ordine della panoramica. */
  function problems(st){
    const sum=summaries(st);
    return CATEGORIES.filter(c=>sum[c.id]?.error).map(c=>({id:c.id,title:c.title,text:sum[c.id].text}));
  }

  const api={CATEGORIES,categoryOf,summaries,problems};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.settingsRules=api;
})(typeof window!=='undefined'?window:globalThis);
