'use strict';

/**
 * Beta 0.43 — regole del dev server (senza Electron, per i test).
 *
 * VARCO non apre più un indirizzo fisso: osserva il processo. Da qui arrivano
 *  - gli indirizzi scritti nel log (Vite, Next.js, webpack, Angular, Astro, Python, Django, Flask, Rails, PHP, Hugo…),
 *    divisi in locali e di rete, anche senza "http://" ("listening on port 3000");
 *  - la scelta dell'indirizzo da aprire (prima localhost; 0.0.0.0 diventa localhost);
 *  - gli errori riconosciuti (porta occupata, programma mancante, dipendenze, compilazione);
 *  - le fasi: avvio → in attesa → pronto / errore, con il testo per il pannello.
 */
const LOCAL_HOSTS=new Set(['localhost','127.0.0.1','[::1]','::1','0.0.0.0','[::]']);
const strip=s=>String(s||'').replace(/\u001b\[[0-9;?]*[A-Za-z]/g,'');

/** Normalizza un indirizzo trovato nel log: 0.0.0.0/[::] → localhost, niente punteggiatura finale. */
function cleanUrl(raw){
  let s=String(raw||'').trim().replace(/[),.;'"\]]+$/,'');
  try{
    const u=new URL(s);
    if(!/^https?:$/.test(u.protocol)||!u.port&&!/^https?:\/\/[^/]+\/?/.test(s))return null;
    if(u.hostname==='0.0.0.0'||u.hostname==='[::]'||u.hostname==='::')u.hostname='localhost';
    return u.href;
  }catch{return null;}
}
const isLocalHost=h=>LOCAL_HOSTS.has(String(h||'').toLowerCase());
const isPrivateIp=h=>/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(h);

/**
 * Indirizzi in un pezzo di log.
 * @returns {{url:string,host:string,port:number,kind:'local'|'network'}[]}
 */
function urlsFromLog(text){
  const out=[],seen=new Set();
  const add=(raw,hint)=>{
    const url=cleanUrl(raw);if(!url)return;
    const u=new URL(url);
    if(u.hostname==='localhost'||isLocalHost(u.hostname)||isPrivateIp(u.hostname)||hint==='network'){
      const port=Number(u.port)||(u.protocol==='https:'?443:80);
      const kind=isLocalHost(u.hostname)&&hint!=='network'?'local':isPrivateIp(u.hostname)||hint==='network'?'network':'local';
      if(!seen.has(url)){seen.add(url);out.push({url,host:u.hostname,port,kind});}
    }
  };
  for(const line0 of strip(text).split(/\r?\n/)){
    const line=line0.trim();if(!line)continue;
    const network=/\bnetwork\b|on your network|lan\b/i.test(line);
    for(const m of line.matchAll(/\bhttps?:\/\/[^\s'"<>`]+/gi))add(m[0],network?'network':null);
    // Senza schema: "listening on localhost:4200", "started server on 0.0.0.0:3000", "Serving HTTP on 0.0.0.0 port 8000"
    let m=line.match(/\b(?:listening|running|started|serving|available|server)\b[^\n]*?\b(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\])(?::|\s+port\s+)(\d{2,5})\b/i);
    if(m&&!/https?:\/\//i.test(line))add(`http://${m[1]}:${m[2]}`);
    m=!/https?:\/\//i.test(line)&&line.match(/\b(?:listening|running|started|serving|server)\b[^\n]*?\bport\s*:?\s*(\d{2,5})\b/i);
    if(m)add(`http://localhost:${m[1]}`);
  }
  return out;
}

/** L'indirizzo da aprire: il primo locale (https se il server lo usa), altrimenti null. Quello di rete a parte. */
function pickUrl(found){
  const local=found.find(f=>f.kind==='local');
  const network=found.find(f=>f.kind==='network');
  return {url:local?local.url:null,network:network?network.url:null};
}
/** Porte in ascolto trovate da Windows → indirizzo (http, oppure https se il log ha parlato di https). */
function urlFromPorts(ports,{https=false,preferPort=null}={}){
  const list=[...new Set((ports||[]).map(Number).filter(p=>p>0&&p<65536))];
  if(!list.length)return null;
  // Porte di servizio che i tool aprono accanto al server (HMR, debugger) vengono dopo.
  const score=p=>(p===preferPort?-1000:0)+(p===9229||p===9230?500:0)+(p>=30000?100:0);
  const port=list.sort((a,b)=>score(a)-score(b)||a-b)[0];
  return `${https?'https':'http'}://localhost:${port}/`;
}

/** Errori riconosciuti in una riga di log → {code, text, port?}. */
function errorFromLine(line0){
  const line=strip(line0);
  let m=line.match(/EADDRINUSE[^\n]*?:(\d{2,5})|address already in use[^\n]*?(\d{2,5})|port (\d{2,5}) is (?:already )?in use|porta (\d{2,5}) (?:è )?(?:già )?in uso/i);
  if(m){const port=Number(m[1]||m[2]||m[3]||m[4]);return {code:'port',port,text:`La porta ${port} è già usata da un altro programma.`};}
  if(/is not recognized as an internal or external command|non è riconosciuto come comando|command not found|: not found$/i.test(line)){
    const name=(line.match(/^'?([\w.\-]+)'? (?:is not|non è)/i)||line.match(/([\w.\-]+): (?:command )?not found/i)||[])[1];
    return {code:'missing',text:name?`«${name}» non è installato o non è nel PATH.`:'Un programma del comando non è installato.'};
  }
  if(/Cannot find module|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND|missing dependencies|npm ERR! missing script/i.test(line)){
    if(/missing script/i.test(line))return {code:'script',text:'Lo script non esiste in package.json.'};
    return {code:'deps',text:'Mancano delle dipendenze: prova «npm install».'};
  }
  if(/ENOENT[^\n]*package\.json/i.test(line))return {code:'nopkg',text:'Nella cartella non c’è package.json.'};
  if(/EACCES[^\n]*listen|permission denied[^\n]*port/i.test(line))return {code:'perm',text:'Windows non permette di usare quella porta.'};
  if(/Failed to compile|Build failed|error TS\d+|SyntaxError:|Module build failed|✘ \[ERROR\]/i.test(line))return {code:'compile',text:'Errore di compilazione: il server resta acceso, guarda il log.',soft:true};
  return null;
}
/** Il server ha cambiato porta da solo (Vite: "Port 5173 is in use, trying another one..."). */
const portChanged=line=>/port \d{2,5} is in use, trying another one|using port \d{2,5} instead|is in use, using/i.test(strip(line));

/** Testo dello stato per il pannello. */
const PHASES={idle:'Fermo',starting:'Avvio…',running:'In esecuzione',waiting:'In attesa che risponda…',ready:'Pronto',error:'Errore',stopped:'Fermato',exited:'Terminato',detached:'Pronto (processo staccato)'};
function phaseLabel(r){
  if(!r)return PHASES.idle;
  if(r.phase==='waiting'&&r.url)return `In attesa di ${new URL(r.url).host}…`;
  if(r.phase==='ready'&&r.url)return `Pronto · ${new URL(r.url).host}`;
  if(r.phase==='error'&&r.error)return r.error.text;
  return PHASES[r.phase]||PHASES.idle;
}

/**
 * Prossima porta libera da proporre quando quella scelta è occupata.
 * @param {number} port
 * @param {number[]} busy
 */
const nextFreePort=(port,busy=[])=>{let p=port+1;while(busy.includes(p)&&p<65535)p++;return p;};

module.exports={urlsFromLog,pickUrl,urlFromPorts,errorFromLine,portChanged,phaseLabel,PHASES,nextFreePort,cleanUrl,isLocalHost};
