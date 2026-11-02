'use strict';

/**
 * Beta 0.31: regole del collegamento telefono ↔ PC. Niente Electron, quindi si verificano con `node --test`.
 * La stessa logica è scritta in Kotlin nell'app Android (mobile/…/LinkRules.kt): se cambi qui, cambia anche là.
 *
 * Come funziona:
 * - Abbinamento: il PC mostra un QR "varco-link:<base64url(JSON)>" con indirizzi, porta e un segreto di 32 byte.
 *   Il segreto non passa mai in rete: chi non ha visto il QR non può parlare col PC.
 * - Ogni messaggio è JSON cifrato con AES-256-GCM. Chiave = HKDF-SHA256(segreto, "varco-link-v1", "aes").
 *   Busta in rete: {d: id del telefono, n: nonce (12 byte), c: testo cifrato + tag}, tutto in base64url.
 *   L'id del telefono è anche il dato associato (AAD): una busta non si può spostare su un altro telefono.
 * - Ogni messaggio ha t (ora) e id: il PC scarta i vecchi di oltre 10 minuti e quelli già visti (niente replay).
 * - Beta 0.32, fuori casa: le stesse buste passano da ntfy.sh, un servizio pubblico che le tiene 12 ore.
 *   Ogni abbinamento ha due "argomenti" (indirizzi) segreti, derivati dal segreto del QR: uno verso il PC e uno verso
 *   il telefono. ntfy vede solo buste cifrate su un nome casuale; per i messaggi dal relay la finestra è di 13 ore.
 */
const crypto=require('node:crypto');

const VERSION=1;
const HTTP_PORT=47820;
const DISCOVERY_PORT=47821;
const MAX_SKEW_MS=10*60*1000;
const QR_PREFIX='varco-link:';
const TARGET_KINDS=['tab','window','workspace','ask'];
const RELAY_SERVER='https://ntfy.sh';
const RELAY_MAX_AGE_MS=13*60*60*1000;
/** ntfy.sh trasforma in allegato i messaggi oltre 4096 byte: le buste restano sotto. */
const RELAY_MAX_BODY=3900;

const b64u=buf=>Buffer.from(buf).toString('base64url');
const fromB64u=s=>Buffer.from(String(s||''),'base64url');

const hkdf=(secret,info,length)=>Buffer.from(crypto.hkdfSync('sha256',secret,Buffer.from('varco-link-v1'),Buffer.from(info),length));
const deriveKey=secret=>hkdf(secret,'aes',32);

/** I due argomenti di ntfy di un abbinamento: pc = messaggi per il PC, phone = per il telefono. */
function relayTopics(secret){
  return {pc:'varco-'+hkdf(secret,'relay-pc',16).toString('hex'),phone:'varco-'+hkdf(secret,'relay-phone',16).toString('hex')};
}

/** Il testo da pubblicare su ntfy: la busta come in rete, oppure null se è troppo lunga. */
function relayBody(deviceId,box){
  const text=JSON.stringify({d:deviceId,n:box.n,c:box.c});
  return text.length<=RELAY_MAX_BODY?text:null;
}

function newSecret(){return crypto.randomBytes(32);}
const newId=(bytes=8)=>crypto.randomBytes(bytes).toString('hex');

/** Cifra un messaggio: restituisce {n, c} (base64url). */
function seal(key,aad,message){
  const nonce=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,nonce);
  cipher.setAAD(Buffer.from(String(aad)));
  const body=Buffer.concat([cipher.update(JSON.stringify(message),'utf8'),cipher.final(),cipher.getAuthTag()]);
  return {n:b64u(nonce),c:b64u(body)};
}

/** Decifra {n, c}: il messaggio, oppure null se la chiave è sbagliata o la busta è stata toccata. */
function open(key,aad,envelope){
  try{
    const nonce=fromB64u(envelope?.n),body=fromB64u(envelope?.c);
    if(nonce.length!==12||body.length<17)return null;
    const decipher=crypto.createDecipheriv('aes-256-gcm',key,nonce);
    decipher.setAAD(Buffer.from(String(aad)));
    decipher.setAuthTag(body.subarray(body.length-16));
    const text=Buffer.concat([decipher.update(body.subarray(0,body.length-16)),decipher.final()]).toString('utf8');
    const message=JSON.parse(text);
    return message&&typeof message==='object'&&!Array.isArray(message)?message:null;
  }catch{return null;}
}

/** Un messaggio nuovo con ora e id. */
const message=(type,fields={})=>({...fields,type,t:Date.now(),id:newId()});

/**
 * Controlla ora e id contro i replay. seen è un Map id→ora; viene ripulito da solo.
 * @returns {string|null} errore, oppure null se va bene.
 */
function checkFresh(msg,seen,now=Date.now()){
  if(!msg||typeof msg.type!=='string'||typeof msg.id!=='string'||!/^[a-f0-9]{8,64}$/.test(msg.id))return 'messaggio non valido';
  if(!Number.isFinite(msg.t)||Math.abs(now-msg.t)>MAX_SKEW_MS)return 'messaggio scaduto (controlla l’ora del telefono)';
  if(seen.has(msg.id))return 'messaggio ripetuto';
  for(const [id,at] of seen)if(now-at>MAX_SKEW_MS*2)seen.delete(id);
  seen.set(msg.id,now);
  return null;
}

/**
 * Come checkFresh, per le buste arrivate dal relay: possono avere fino a 13 ore (il PC era spento),
 * quindi gli id visti si salvano (seen è un oggetto id→ora che finisce in data.link.relaySeen).
 */
function checkFreshRelay(msg,seen,now=Date.now()){
  if(!msg||typeof msg.type!=='string'||typeof msg.id!=='string'||!/^[a-f0-9]{8,64}$/.test(msg.id))return 'messaggio non valido';
  if(!Number.isFinite(msg.t)||msg.t-now>MAX_SKEW_MS||now-msg.t>RELAY_MAX_AGE_MS)return 'messaggio scaduto';
  if(seen[msg.id])return 'messaggio ripetuto';
  for(const id of Object.keys(seen))if(now-seen[id]>RELAY_MAX_AGE_MS*2)delete seen[id];
  seen[msg.id]=now;
  return null;
}

/** Testo del QR. */
function pairingCode({pcId,name,hosts,port,secret}){
  return QR_PREFIX+b64u(JSON.stringify({v:VERSION,pc:pcId,name,hosts,port,k:b64u(secret)}));
}

/** Legge il testo del QR (lo usa anche il test, e l'app Android fa lo stesso). */
function parsePairingCode(text){
  const s=String(text||'').trim();
  if(!s.startsWith(QR_PREFIX))return null;
  try{
    const o=JSON.parse(fromB64u(s.slice(QR_PREFIX.length)).toString('utf8'));
    const secret=fromB64u(o.k);
    if(o.v!==VERSION||typeof o.pc!=='string'||secret.length!==32||!Number.isInteger(o.port))return null;
    return {pcId:o.pc,name:String(o.name||'PC'),hosts:Array.isArray(o.hosts)?o.hosts.filter(h=>typeof h==='string'):[],port:o.port,secret};
  }catch{return null;}
}

/** Indirizzi IPv4 della rete di casa (privati), dalle interfacce di os.networkInterfaces(). */
function lanAddresses(interfaces){
  const out=[];
  for(const [name,list] of Object.entries(interfaces||{})){
    if(/virtual|vmware|vbox|hyper-v|wsl|vethernet|loopback|docker|tailscale|zerotier/i.test(name))continue;
    for(const a of list||[]){
      if(a.internal||(a.family!=='IPv4'&&a.family!==4))continue;
      if(/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address))out.push(a.address);
    }
  }
  return [...new Set(out)];
}

/** Il nome di un telefono, ripulito. */
const deviceName=raw=>String(raw||'').replace(/[\u0000-\u001f]/g,'').trim().slice(0,40)||'Telefono';

/**
 * Una scheda che arriva dall'altro dispositivo: solo http(s), titolo corto,
 * scroll come frazione 0–1 della pagina, time = secondi del video in riproduzione.
 */
function normalizeTab(raw){
  const url=String(raw?.url||'');
  try{if(!['http:','https:'].includes(new URL(url).protocol))return null;}catch{return null;}
  if(url.length>4096)return null;
  const scroll=Number(raw.scroll),time=Number(raw.time);
  return {id:typeof raw.id==='string'&&/^[a-f0-9]{8,64}$/.test(raw.id)?raw.id:newId(),url,
    title:String(raw.title||'').slice(0,200),
    scroll:Number.isFinite(scroll)?Math.min(1,Math.max(0,scroll)):0,
    time:Number.isFinite(time)?Math.min(86400*2,Math.max(0,time)):0};
}

/** Dove aprire sul PC: scheda nuova, finestra nuova, un workspace preciso, oppure chiedi. */
function normalizeTarget(raw,workspaces){
  const kind=TARGET_KINDS.includes(raw?.kind)?raw.kind:'tab';
  if(kind!=='workspace')return {kind};
  const ws=String(raw.workspace||'');
  return workspaces.includes(ws)?{kind,workspace:ws}:{kind:'tab'};
}

/**
 * YouTube: il minuto del video va anche nell'indirizzo (&t=123s), così riparte da lì anche se lo script non riesce.
 * Gli altri siti restano come sono.
 */
function withTime(url,time){
  if(!(time>=5))return url;
  try{
    const u=new URL(url);
    const host=u.hostname.replace(/^(www|m|music)\./,'');
    const watch=host==='youtube.com'&&(u.pathname==='/watch'||u.pathname.startsWith('/shorts/')||u.pathname.startsWith('/live/'));
    if(!watch&&host!=='youtu.be')return url;
    u.searchParams.set('t',Math.floor(time)+'s');
    return u.href;
  }catch{return url;}
}

/** Lo script che rimette la pagina dove eri: scroll (frazione) e minuto del primo video. Riprova un paio di volte mentre la pagina cresce. */
function restoreScript(scroll,time){
  const s=Number(scroll)||0,t=Number(time)||0;
  return `(()=>{const go=()=>{const h=Math.max(0,document.documentElement.scrollHeight-innerHeight);if(${s}>0)scrollTo(0,Math.round(h*${s}));`+
    `const v=document.querySelector('video');if(${t}>0&&v&&Math.abs(v.currentTime-${t})>3)v.currentTime=${t};};`+
    `setTimeout(go,700);setTimeout(go,2000);setTimeout(go,4000);})()`;
}

/** Lo script che legge scroll e minuto del video (il contrario di restoreScript). */
const CAPTURE_SCRIPT=`(()=>{const h=Math.max(1,document.documentElement.scrollHeight-innerHeight);`+
  `const v=[...document.querySelectorAll('video')].find(x=>!x.paused)||document.querySelector('video');`+
  `return {scroll:Math.min(1,scrollY/h),time:v&&v.currentTime>0?v.currentTime:0};})()`;

/** Dati salvati del collegamento: id del PC, telefoni abbinati, schede in attesa per ogni telefono. */
function normalizeLink(raw){
  const r=raw&&typeof raw==='object'?raw:{};
  const devices=(Array.isArray(r.devices)?r.devices:[]).filter(d=>d&&/^[a-f0-9]{16,64}$/.test(d.id)&&typeof d.key==='string')
    .slice(0,8).map(d=>({id:d.id,name:deviceName(d.name),key:d.key,pairedAt:Number(d.pairedAt)||Date.now(),lastSeen:Number(d.lastSeen)||0}));
  const inbox={},relaySeen={};
  for(const [id,at] of Object.entries(r.relaySeen&&typeof r.relaySeen==='object'?r.relaySeen:{}).slice(-500))
    if(/^[a-f0-9]{8,64}$/.test(id)&&Number.isFinite(at))relaySeen[id]=at;
  for(const d of devices){
    const list=Array.isArray(r.inbox?.[d.id])?r.inbox[d.id]:[];
    inbox[d.id]=list.map(normalizeTab).filter(Boolean).slice(-30);
  }
  return {pcId:typeof r.pcId==='string'&&/^[a-f0-9]{16}$/.test(r.pcId)?r.pcId:newId(),
    port:Number.isInteger(r.port)&&r.port>1024&&r.port<65536?r.port:HTTP_PORT,
    enabled:r.enabled!==false,devices,inbox,
    relay:r.relay!==false,syncPasswords:r.syncPasswords!==false,relaySince:typeof r.relaySince==='string'&&/^[A-Za-z0-9]{1,32}$/.test(r.relaySince)?r.relaySince:'',relaySeen};
}

module.exports={VERSION,HTTP_PORT,DISCOVERY_PORT,MAX_SKEW_MS,TARGET_KINDS,RELAY_SERVER,RELAY_MAX_AGE_MS,RELAY_MAX_BODY,
  deriveKey,relayTopics,relayBody,newSecret,newId,seal,open,message,checkFresh,checkFreshRelay,
  pairingCode,parsePairingCode,lanAddresses,deviceName,normalizeTab,normalizeTarget,withTime,restoreScript,CAPTURE_SCRIPT,normalizeLink,b64u,fromB64u};
