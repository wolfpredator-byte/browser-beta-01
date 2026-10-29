'use strict';

/**
 * Regole del file `progetto.browser.json`, senza Electron.
 *
 * Il file vive nella cartella del progetto, accanto al codice, e descrive:
 *   nome, anteprima (URL del dev server), avvio (comandi), editor, link,
 *   ricerche (scorciatoie della barra), segreti (solo i NOMI), monitor (API da controllare).
 * I valori dei segreti NON stanno mai nel file: restano cifrati nel browser.
 */
const crypto=require('node:crypto');
const {isWebUrl}=require('./web-rules.cjs');

const FILE_NAME='progetto.browser.json';
const LIMITS={commands:8,links:20,searches:20,secrets:20,monitors:10,commandLength:300};
/** Nomi dei segreti come variabili d'ambiente: BUNGIE_API_KEY, DB_URL... */
const SECRET_NAME=/^[A-Z][A-Z0-9_]{0,63}$/;
/** L'editor è il nome di un programma (code, cursor, zed): niente spazi né simboli di shell. */
const EDITOR_NAME=/^[\w.-]{1,40}$/;
const SEARCH_KEY=/^[a-z0-9]{1,12}$/i;

const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v,max=120)=>typeof v==='string'?v.trim().slice(0,max):'';

/**
 * Legge e valida il file. Raccoglie TUTTI gli errori invece di fermarsi al
 * primo: nel pannello li vedi insieme e li correggi in una volta.
 * @param {string} raw - Contenuto del file.
 * @returns {{ok:true,config:object}|{ok:false,errors:string[]}}
 */
function parseProjectFile(raw){
  let input;
  try{input=JSON.parse(raw);}
  catch(e){return {ok:false,errors:['JSON non valido: '+e.message]};}
  if(!isObject(input))return {ok:false,errors:['Il file deve contenere un oggetto { ... }.']};
  const errors=[];
  const config={nome:text(input.nome,60),anteprima:null,avvio:[],editor:null,link:[],ricerche:{},segreti:[],monitor:[]};

  if(input.anteprima!==undefined){
    if(isWebUrl(input.anteprima))config.anteprima=new URL(input.anteprima).href;
    else errors.push('anteprima: serve un indirizzo http(s), es. http://localhost:5173');
  }

  // avvio: ["npm run dev"] oppure [{"nome":"Dev server","comando":"npm run dev"}]
  const commands=input.avvio===undefined?[]:Array.isArray(input.avvio)?input.avvio:[input.avvio];
  if(commands.length>LIMITS.commands)errors.push(`avvio: al massimo ${LIMITS.commands} comandi`);
  commands.slice(0,LIMITS.commands).forEach((entry,i)=>{
    const command=typeof entry==='string'?entry.trim():text(entry?.comando,LIMITS.commandLength+1);
    const name=typeof entry==='string'?command:text(entry?.nome,40)||command;
    if(!command)errors.push(`avvio[${i}]: comando vuoto`);
    else if(command.length>LIMITS.commandLength)errors.push(`avvio[${i}]: comando troppo lungo`);
    // Beta 0.17: "pronto" = testo del log che dice "server pronto"; "ricarica": false = non ricaricare l'anteprima.
    else config.avvio.push({nome:name.slice(0,40),comando:command,
      pronto:typeof entry==='object'&&entry?text(entry.pronto,80)||null:null,
      ricarica:!(typeof entry==='object'&&entry?.ricarica===false)});
  });

  if(input.editor!==undefined){
    if(EDITOR_NAME.test(String(input.editor)))config.editor=String(input.editor);
    else errors.push('editor: solo il nome del programma, es. "code" o "cursor"');
  }

  if(input.link!==undefined){
    if(!Array.isArray(input.link))errors.push('link: serve un elenco di indirizzi');
    else for(const link of input.link.slice(0,LIMITS.links)){
      const url=typeof link==='string'?link:link?.url;
      if(isWebUrl(url))config.link.push({nome:text(link?.nome,60)||url,url:new URL(url).href});
      else errors.push(`link: «${String(url).slice(0,40)}» non è un indirizzo http(s)`);
    }
  }

  if(input.ricerche!==undefined){
    if(!isObject(input.ricerche))errors.push('ricerche: serve un oggetto { "lg": "https://…%s" }');
    else for(const [key,template] of Object.entries(input.ricerche).slice(0,LIMITS.searches)){
      if(!SEARCH_KEY.test(key))errors.push(`ricerche: «${key}» deve essere una parola breve (lettere e numeri)`);
      else if(typeof template!=='string'||!template.includes('%s')||!isWebUrl(template.replace('%s','x')))
        errors.push(`ricerche.${key}: serve un indirizzo con %s al posto del testo cercato`);
      else config.ricerche[key.toLowerCase()]=template;
    }
  }

  if(input.segreti!==undefined){
    if(!Array.isArray(input.segreti))errors.push('segreti: serve un elenco di nomi, es. ["BUNGIE_API_KEY"]');
    else for(const name of input.segreti.slice(0,LIMITS.secrets)){
      if(SECRET_NAME.test(name))config.segreti.push(name);
      else errors.push(`segreti: «${String(name).slice(0,40)}» deve essere MAIUSCOLO_CON_UNDERSCORE`);
    }
  }

  if(input.monitor!==undefined){
    if(!Array.isArray(input.monitor))errors.push('monitor: serve un elenco');
    else input.monitor.slice(0,LIMITS.monitors).forEach((m,i)=>{
      const name=text(m?.nome,60)||`Monitor ${i+1}`;
      if(!isWebUrl(m?.url)){errors.push(`monitor «${name}»: url http(s) mancante`);return;}
      const headers={};
      if(m.header!==undefined&&!isObject(m.header))errors.push(`monitor «${name}»: header deve essere un oggetto`);
      for(const [k,v] of Object.entries(isObject(m.header)?m.header:{})){
        if(/^[\w-]{1,60}$/.test(k)&&typeof v==='string')headers[k]=v.slice(0,500);
        else errors.push(`monitor «${name}»: header «${k}» non valido`);
      }
      const used=placeholders(Object.values(headers).join(' ')+' '+m.url);
      for(const secret of used)if(!config.segreti.includes(secret))
        errors.push(`monitor «${name}»: usa {{${secret}}} ma non è nell'elenco "segreti"`);
      // 5 minuti minimo: un'API non va interrogata di continuo.
      const minutes=Number.isFinite(m.intervalloMinuti)?Math.min(1440,Math.max(5,Math.round(m.intervalloMinuti))):30;
      config.monitor.push({nome:name,url:m.url,campo:text(m.campo,120)||null,intervalloMinuti:minutes,header:headers});
    });
  }

  return errors.length?{ok:false,errors}:{ok:true,config};
}

/** Nomi tra doppie graffe: "Bearer {{TOKEN}}" → ['TOKEN']. */
function placeholders(template){
  return [...new Set([...String(template).matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)].map(m=>m[1]))];
}

/**
 * Sostituisce {{NOME}} con il valore del segreto.
 * @returns {{value:string,missing:string[]}} missing: segreti non ancora impostati.
 */
function fillPlaceholders(template,secrets){
  const missing=[];
  const value=String(template).replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g,(_,name)=>{
    if(typeof secrets[name]==='string')return secrets[name];
    missing.push(name);return '';
  });
  return {value,missing};
}

/**
 * Impronta delle parti "pericolose" del file: comandi, editor e monitor
 * (che possono inviare i segreti a un indirizzo). Se cambiano, il browser
 * chiede di nuovo se ti fidi. Nome, link e ricerche non contano.
 */
function trustKey(config){
  const relevant={avvio:config.avvio.map(c=>c.comando),editor:config.editor,
    monitor:config.monitor.map(m=>({url:m.url,header:m.header}))};
  return crypto.createHash('sha256').update(JSON.stringify(relevant)).digest('hex');
}
/** Serve fiducia solo se il file può eseguire comandi o usare segreti in rete. */
const needsTrust=config=>config.avvio.length>0||!!config.editor||config.monitor.length>0;

/** Legge un campo annidato: readField({Response:{version:'1'}},'Response.version') → '1'. */
function readField(object,fieldPath){
  if(!fieldPath)return object;
  return fieldPath.split('.').reduce((value,key)=>value==null?undefined:value[key],object);
}

/**
 * Scorciatoie della barra: "lg ace of spades" → URL di ricerca su light.gg.
 * @returns {string|null} null se la prima parola non è una scorciatoia del progetto.
 */
function expandSearch(input,searches){
  const match=/^([a-z0-9]{1,12})\s+(.+)$/i.exec(String(input).trim());
  if(!match)return null;
  const template=searches?.[match[1].toLowerCase()];
  return template?template.replace('%s',encodeURIComponent(match[2].trim())):null;
}

/** Porte predefinite dei dev server più comuni. */
const DEV_PORTS=[['vite',5173],['next',3000],['react-scripts',3000],['astro',4321],['nuxt',3000],['@angular/cli',4200],['webpack-dev-server',8080]];

/**
 * Proposta iniziale del file, da mostrare prima di crearlo.
 * @param {string} folderName - Nome della cartella del progetto.
 * @param {string|null} packageJson - Contenuto di package.json, se esiste.
 */
function detectDefaults(folderName,packageJson){
  const config={nome:folderName};
  let pkg=null;
  try{pkg=packageJson?JSON.parse(packageJson):null;}catch{}
  if(pkg){
    if(typeof pkg.name==='string')config.nome=pkg.name;
    const scripts=isObject(pkg.scripts)?pkg.scripts:{};
    if(scripts.dev)config.avvio=[{nome:'Dev server',comando:'npm run dev'}];
    else if(scripts.start)config.avvio=[{nome:'Avvio',comando:'npm start'}];
    const deps={...pkg.dependencies,...pkg.devDependencies};
    const explicit=/--port[= ](\d{2,5})/.exec(String(scripts.dev||scripts.start||''));
    const port=explicit?Number(explicit[1]):DEV_PORTS.find(([name])=>deps[name])?.[1];
    if(port)config.anteprima=`http://localhost:${port}`;
    const repo=typeof pkg.repository==='string'?pkg.repository:pkg.repository?.url;
    const github=repo&&/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(repo);
    if(github)config.link=[{nome:'GitHub',url:`https://github.com/${github[1]}`}];
  }
  config.editor='code';
  config.ricerche={};
  config.segreti=[];
  config.monitor=[];
  return config;
}

/** Toglie i colori del terminale (codici ANSI) dalle righe di log. */
const stripAnsi=s=>String(s).replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g,'');

/**
 * Aggiunge testo a un registro di righe tenendone al massimo `max`.
 * I valori dei segreti vengono oscurati: i log arrivano alla cornice.
 * @param {{lines:string[],partial:string}} log
 */
function appendLog(log,chunk,secretValues=[],max=500){
  const masked=secretValues.filter(v=>v&&v.length>=4).reduce((s,v)=>s.split(v).join('••••'),stripAnsi(chunk));
  const parts=(log.partial+masked).split(/\r?\n/);
  log.partial=parts.pop();
  log.lines.push(...parts);
  if(log.lines.length>max)log.lines.splice(0,log.lines.length-max);
  return log;
}

/**
 * Beta 0.17: una riga del log dice che il dev server è pronto?
 * - con "pronto" nel file conta solo quel testo (senza maiuscole);
 * - altrimenti le frasi tipiche (Vite "Local:", Next "ready", webpack "compiled",
 *   Express "listening") oppure l'indirizzo dell'anteprima (es. localhost:3000).
 * @param {string} line
 * @param {string|null} preview - URL dell'anteprima del progetto.
 * @param {string|null} custom - Testo "pronto" del comando.
 */
function isReadyLine(line,preview,custom){
  const text=String(line||'').toLowerCase();
  if(custom)return text.includes(String(custom).toLowerCase());
  if(/\b(local:\s*https?:|ready\b|compiled successfully|compiled\b|listening\b|server (is )?running|started server|running at)/i.test(text))return true;
  if(preview){try{return text.includes(new URL(preview).host.toLowerCase());}catch{}}
  return false;
}

module.exports={isReadyLine,FILE_NAME,LIMITS,parseProjectFile,placeholders,fillPlaceholders,trustKey,needsTrust,
  readField,expandSearch,detectDefaults,stripAnsi,appendLog};
