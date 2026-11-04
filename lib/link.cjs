'use strict';

/**
 * Beta 0.31: collegamento col telefono (VARCO per Android) sulla rete di casa.
 *
 * - Server HTTP sulla porta 47820 (o la prima libera dopo): una sola rotta, POST /v1, con buste cifrate
 *   (regole e formato in link-rules.cjs).
 * - Il telefono trova il PC anche se cambia indirizzo: manda "VARCO?<id del PC>" in broadcast UDP sulla 47821
 *   e il PC risponde "VARCO!<id>:<porta>". Chi non conosce l'id del PC non riceve risposta.
 * - Il telefono chiede le novità ogni pochi secondi mentre VARCO è aperto (hello): le schede mandate dal PC
 *   aspettano qui (data.link.inbox) finché il telefono non le prende.
 *
 * - Beta 0.32, fuori casa: se il telefono non trova il PC sulla rete, la busta passa da ntfy.sh (link-relay.cjs).
 *   Il PC ascolta gli argomenti dei telefoni abbinati; le schede per il telefono vanno anche sul suo argomento.
 *
 * - Beta 0.33: preferiti e password si sincronizzano col telefono, solo sulla rete di casa (mai dal relay).
 *   Nell'hello il PC manda l'impronta dei suoi elenchi; se è cambiata, o il telefono ha novità, il telefono
 *   manda "sync" con i suoi elenchi e riceve quelli fusi (sync-rules.cjs).
 *
 * data.link = {pcId, port, enabled, devices:[{id,name,key,pairedAt,lastSeen}], inbox:{idTelefono:[schede]},
 *   relay, relaySince (ultimo messaggio di ntfy letto), relaySeen (id già aperti, contro i replay)}
 * key è il segreto dell'abbinamento, cifrato con safeStorage (come le password) quando Windows lo permette.
 */
const http=require('node:http');
const dgram=require('node:dgram');
const os=require('node:os');
const {safeStorage,clipboard}=require('electron');
const {state,save,saveSoon}=require('./state.cjs');
const windows=require('./windows.cjs');
const rules=require('./link-rules.cjs');
const relay=require('./link-relay.cjs');
const {WORKSPACE_COLORS}=require('./workspace-rules.cjs');

let server=null,udp=null,listeningPort=0,lastError='';
/** Il relay: ascolto aperto su ntfy, se funziona, e l'ultimo errore. */
let relayListener=null,relayOk=false,relayError='';
/** Abbinamento in corso: il segreto del QR, valido 10 minuti. */
let pairing=null;
const seen=new Map();
/** Schede arrivate con "Chiedi sul PC": aspettano la tua scelta nel toast. */
const asked=new Map();

const data=()=>state.data.link;
const tabsModule=()=>require('./tabs.cjs');
const toasts=()=>require('./toasts.cjs');

const canEncrypt=()=>{try{return safeStorage.isEncryptionAvailable();}catch{return false;}};
function storeKey(secret){
  return canEncrypt()?'enc:'+safeStorage.encryptString(rules.b64u(secret)).toString('base64'):'raw:'+rules.b64u(secret);
}
function secretOf(device){
  try{
    const s=device.key.startsWith('enc:')?safeStorage.decryptString(Buffer.from(device.key.slice(4),'base64')):device.key.slice(4);
    const secret=rules.fromB64u(s);
    return secret.length===32?secret:null;
  }catch{return null;}
}
function keyOf(device){
  const secret=secretOf(device);
  return secret&&rules.deriveKey(secret);
}

const pcInfo=()=>({id:data().pcId,name:os.hostname()});
const sync=require('./sync-rules.cjs');
const passwords=()=>require('./passwords.cjs');
/** Le impronte di preferiti e password (null = password non sincronizzate). */
function syncInfo(){
  const pw=data().syncPasswords&&passwords().available();
  return {bm:sync.version(sync.bookmarkItems(state.data),sync.bookmarkKey),pw:pw?passwords().syncVersion():null};
}
const relayServer=()=>data().relay?rules.RELAY_SERVER:'';
const workspacesInfo=()=>state.data.workspaces.map(w=>({name:w.name,color:WORKSPACE_COLORS[w.color]||null}));

// ── Server ─────────────────────────────────────────────────────────────

function start(){
  stop();
  if(!data().enabled)return;
  listen(data().port,0);
  udp=dgram.createSocket({type:'udp4',reuseAddr:true});
  udp.on('message',(msg,from)=>{
    const text=msg.toString('utf8');
    if(text!=='VARCO?'+data().pcId||!listeningPort)return;
    udp.send(`VARCO!${data().pcId}:${listeningPort}`,from.port,from.address);
  });
  udp.on('error',()=>{try{udp.close();}catch{}udp=null;});
  udp.bind(rules.DISCOVERY_PORT);
  startRelay();
}

/** Se la porta è occupata prova le successive (47822, 47824…) e ricorda quella buona. */
function listen(port,attempt){
  const s=http.createServer(onRequest);
  s.on('error',err=>{
    if(err.code==='EADDRINUSE'&&attempt<6)return listen(port+2,attempt+1);
    lastError=err.message;listeningPort=0;windows.emitAll();
  });
  s.listen(port,'0.0.0.0',()=>{
    server=s;listeningPort=port;lastError='';
    if(data().port!==port){data().port=port;save();}
    windows.emitAll();
  });
  s.requestTimeout=10000;
}

function stop(){
  try{server?.close();}catch{}
  try{udp?.close();}catch{}
  server=null;udp=null;listeningPort=0;
  stopRelay();
}

function onRequest(req,res){
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  if(req.method!=='POST'||req.url!=='/v1')return reply(404,{error:'not found'});
  let size=0;const chunks=[];
  req.on('data',c=>{size+=c.length;if(size>4*1024*1024){reply(413,{error:'too big'});req.destroy();}else chunks.push(c);});
  req.on('end',()=>{
    if(res.writableEnded)return;
    let envelope;
    try{envelope=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return reply(400,{error:'bad json'});}
    try{const [status,body]=handle(envelope);reply(status,body);}
    catch(e){reply(500,{error:'internal'});}
  });
}

/** Una busta dal telefono: [stato HTTP, risposta]. Le risposte buone sono cifrate. */
function handle(envelope){
  const deviceId=String(envelope?.d||'');
  if(!/^[a-f0-9]{16,64}$/.test(deviceId))return [400,{error:'bad device'}];
  const device=data().devices.find(d=>d.id===deviceId);
  // Prima la chiave del telefono già abbinato, poi quella del QR mostrato adesso (anche per riabbinarsi).
  const keys=[];
  const own=device&&keyOf(device);
  if(own)keys.push({key:own,viaQr:false});
  if(pairing&&Date.now()<pairing.until)keys.push({key:pairing.key,viaQr:true});
  let msg=null,key=null,viaQr=false;
  for(const k of keys){msg=rules.open(k.key,deviceId,envelope);if(msg){key=k.key;viaQr=k.viaQr;break;}}
  if(!msg)return [403,{error:'unknown'}];
  if(viaQr!==(msg.type==='pair'))return [403,{error:'unknown'}];
  const stale=rules.checkFresh(msg,seen);
  if(stale)return [409,{error:stale}];
  const answer=fields=>[200,rules.seal(key,deviceId,rules.message('reply',{ok:true,...fields}))];

  if(msg.type==='pair'){
    const record={id:deviceId,name:rules.deviceName(msg.name),key:storeKey(pairing.secret),pairedAt:Date.now(),lastSeen:Date.now()};
    data().devices=data().devices.filter(d=>d.id!==deviceId).concat(record).slice(-8);
    data().inbox[deviceId]=[];
    pairing=null;save();windows.emitAll();
    toasts().show({id:'link-paired',kind:'success',title:'Telefono collegato',text:`«${record.name}» ora può mandarti le schede, e tu a lui.`,timeout:8000});
    setImmediate(startRelay);
    return answer({pc:pcInfo(),workspaces:workspacesInfo(),relay:relayServer()});
  }
  device.lastSeen=Date.now();
  if(msg.name)device.name=rules.deviceName(msg.name);
  if(msg.type==='hello'){
    save();
    return answer({pc:pcInfo(),workspaces:workspacesInfo(),relay:relayServer(),inbox:data().inbox[deviceId]||[],sync:syncInfo()});
  }
  if(msg.type==='ack'){
    const ids=new Set(Array.isArray(msg.ids)?msg.ids:[]);
    data().inbox[deviceId]=(data().inbox[deviceId]||[]).filter(t=>!ids.has(t.id));
    save();windows.emitAll();
    return answer({});
  }
  if(msg.type==='tab'){
    const tab=rules.normalizeTab(msg.tab);
    if(!tab)return answer({ok:false,error:'Indirizzo non valido'});
    const target=rules.normalizeTarget(msg.target,state.data.workspaces.map(w=>w.name));
    save();
    // Il telefono riceve la risposta subito: la finestra si apre un attimo dopo.
    setImmediate(()=>receive(tab,target,device.name));
    return answer({});
  }
  if(msg.type==='unpair'){
    removeDevice(deviceId);
    return answer({});
  }
  if(msg.type==='sync'){
    const fields={};
    if(Array.isArray(msg.bookmarks)){
      const before=sync.version(sync.bookmarkItems(state.data),sync.bookmarkKey);
      fields.bookmarks=sync.applyBookmarks(state.data,msg.bookmarks);
      if(sync.version(sync.bookmarkItems(state.data),sync.bookmarkKey)!==before){save();windows.emitAll();}
    }
    if(Array.isArray(msg.passwords)&&data().syncPasswords){
      const merged=passwords().applySync(msg.passwords);
      if(merged)fields.passwords=merged;
    }
    return answer({...fields,sync:syncInfo()});
  }
  return answer({ok:false,error:'tipo sconosciuto'});
}

// ── Relay (fuori casa) ─────────────────────────────────────────────────

/** Ascolta su ntfy gli argomenti "verso il PC" di tutti i telefoni abbinati. */
function startRelay(){
  stopRelay();
  if(!data().enabled||!data().relay)return;
  const byTopic=new Map();
  for(const d of data().devices){const secret=secretOf(d);if(secret)byTopic.set(rules.relayTopics(secret).pc,d.id);}
  if(!byTopic.size)return;
  relayListener=relay.listen({server:rules.RELAY_SERVER,topics:[...byTopic.keys()],since:data().relaySince,
    onState:(ok,error)=>{if(ok!==relayOk||error!==relayError){relayOk=ok;relayError=error;windows.emitAll();}},
    onMessage:event=>{
      data().relaySince=event.id;
      handleRelay(byTopic.get(event.topic),event.message);
      saveSoon();
    }});
}
function stopRelay(){
  relayListener?.stop();
  relayListener=null;relayOk=false;relayError='';
}

/** Una busta arrivata dal relay. Più severa di handle: solo telefoni già abbinati, solo schede e scollegamento. */
function handleRelay(deviceId,text){
  let envelope;
  try{envelope=JSON.parse(text);}catch{return 'bad json';}
  if(!deviceId||envelope?.d!==deviceId)return 'unknown';
  const device=data().devices.find(d=>d.id===deviceId);
  const key=device&&keyOf(device);
  const msg=key&&rules.open(key,deviceId,envelope);
  if(!msg)return 'unknown';
  const stale=rules.checkFreshRelay(msg,data().relaySeen);
  if(stale)return stale;
  if(msg.name)device.name=rules.deviceName(msg.name);
  if(msg.type==='tab'){
    const tab=rules.normalizeTab(msg.tab);
    if(!tab)return 'bad tab';
    receive(tab,rules.normalizeTarget(msg.target,state.data.workspaces.map(w=>w.name)),device.name);
    return null;
  }
  if(msg.type==='unpair'){removeDevice(deviceId);return null;}
  return 'tipo sconosciuto';
}

/** Mette una scheda sull'argomento "verso il telefono": la prende quando non trova il PC sulla rete. */
function publishToPhone(device,tab){
  const secret=data().relay&&secretOf(device);
  if(!secret)return;
  const body=rules.relayBody(device.id,rules.seal(rules.deriveKey(secret),device.id,rules.message('tab',{tab,pc:pcInfo()})));
  if(body)relay.publish(rules.RELAY_SERVER,rules.relayTopics(secret).phone,body).catch(()=>{});
}

function setSyncPasswords(enabled){
  data().syncPasswords=!!enabled;
  save();windows.emitAll();
  return {ok:true};
}

function setRelay(enabled){
  data().relay=!!enabled;
  save();startRelay();windows.emitAll();
  return {ok:true};
}

// ── Schede che arrivano dal telefono ───────────────────────────────────

function receive(tab,target,from){
  if(target.kind==='ask'){
    asked.set(tab.id,tab);
    if(asked.size>20)asked.delete(asked.keys().next().value);
    const w=windows.focusedWindow();
    const host=(()=>{try{return new URL(tab.url).hostname.replace(/^www\./,'');}catch{return tab.url;}})();
    toasts().show({id:'link-'+tab.id,kind:'info',ask:true,title:`Da ${from}: ${tab.title||host}`,text:host,timeout:60000,
      actions:[{label:'Apri qui',command:'linkOpenIncoming',args:{id:tab.id,how:'tab'}},
        {label:'Finestra nuova',command:'linkOpenIncoming',args:{id:tab.id,how:'window'}}]},w||undefined);
    if(w)w.win.flashFrame(true);
    return;
  }
  openTab(tab,target.kind,target.workspace);
}

/** Apre la scheda: nella finestra davanti, in una finestra nuova o nel workspace scelto. Poi la riporta dov'eri. */
function openTab(tab,how,workspace){
  const tabs=tabsModule();
  let w=windows.focusedWindow();
  if(how==='workspace')w=windows.windowFor(workspace,0)||tabs.openWorkspaceWindow(workspace,{},0);
  if(!w)w=tabs.openWorkspaceWindow(state.data.activeWorkspace,{},0);
  if(!w)return;
  const url=rules.withTime(tab.url,tab.time);
  const id=tabs.newTab(url,w.workspace,{pane:w.pane,title:tab.title||undefined,activate:how!=='window'});
  if(!id)return;
  if(how==='window')tabs.moveTabToWindow(w,id);
  const t=state.tabs.find(x=>x.id===id);
  const owner=t&&windows.windowForTab(t);
  if(owner){
    if(owner.win.isMinimized())owner.win.restore();
    owner.win.show();owner.win.focus();
  }
  if(t)restorePosition(t,tab.scroll,tab.time);
}

/** Aspetta che la pagina sia caricata, poi rimette scroll e minuto del video. */
function restorePosition(t,scroll,time){
  if(!(scroll>0.01)&&!(time>=5))return;
  let tries=0;
  const wait=setInterval(()=>{
    const contents=t.view?.webContents;
    if(contents&&!contents.isDestroyed()){
      clearInterval(wait);
      contents.once('did-finish-load',()=>contents.executeJavaScript(rules.restoreScript(scroll,time),true).catch(()=>{}));
    }else if(++tries>50)clearInterval(wait);
  },100);
}

function openAsked(id,how){
  const tab=asked.get(id);
  if(!tab)return {ok:false,error:'Scheda non più disponibile'};
  asked.delete(id);
  openTab(tab,how==='window'?'window':'tab');
  return {ok:true};
}

// ── Schede che il PC manda al telefono ─────────────────────────────────

async function sendToPhone(w,tabId,deviceId){
  const t=tabsModule().tabIn(w,tabId);
  if(!t||t.isHome)return {ok:false,error:'Questa scheda non ha una pagina da mandare'};
  let where={scroll:0,time:0};
  const contents=t.view?.webContents;
  if(contents&&!contents.isDestroyed()){
    where=await Promise.race([contents.executeJavaScript(rules.CAPTURE_SCRIPT,true).catch(()=>where),new Promise(r=>setTimeout(()=>r(where),800))])||where;
  }
  return sendUrlToPhone(w,{url:t.url,title:t.title,scroll:where.scroll,time:where.time},deviceId);
}

/** Mette una pagina (o un link) in coda per il telefono: la prende al prossimo hello. */
function sendUrlToPhone(w,page,deviceId){
  const device=deviceId?data().devices.find(d=>d.id===deviceId):[...data().devices].sort((a,b)=>b.lastSeen-a.lastSeen)[0];
  if(!device)return {ok:false,error:'Nessun telefono collegato: Impostazioni → Telefono'};
  const tab=rules.normalizeTab(page);
  if(!tab)return {ok:false,error:'Questa pagina non si può mandare'};
  const list=data().inbox[device.id]||(data().inbox[device.id]=[]);
  list.push(tab);
  if(list.length>30)list.splice(0,list.length-30);
  save();windows.emitAll();
  publishToPhone(device,tab);
  const recent=Date.now()-device.lastSeen<30000;
  toasts().show({id:'link-sent',kind:'success',title:`Mandata a ${device.name}`,
    text:recent?'Arriva fra pochi secondi.':data().relay?'Arriva appena apri VARCO sul telefono, anche fuori casa.':'Arriva appena apri VARCO sul telefono, sulla Wi-Fi di casa.',timeout:5000},w);
  return {ok:true};
}

// ── Abbinamento e impostazioni ─────────────────────────────────────────

async function startPairing(){
  if(!data().enabled){data().enabled=true;save();start();}
  const secret=rules.newSecret();
  const hosts=rules.lanAddresses(os.networkInterfaces());
  const code=rules.pairingCode({pcId:data().pcId,name:os.hostname(),hosts,port:listeningPort||data().port,secret});
  const qr=await require('qrcode').toDataURL(code,{margin:1,width:280,errorCorrectionLevel:'M',color:{dark:'#0b0b14',light:'#ffffff'}});
  pairing={secret,key:rules.deriveKey(secret),code,qr,hosts,until:Date.now()+10*60*1000};
  setTimeout(()=>{if(pairing&&Date.now()>=pairing.until){pairing=null;windows.emitAll();}},10*60*1000+500);
  windows.emitAll();
  return {ok:true};
}
function stopPairing(){pairing=null;windows.emitAll();}
function copyPairingCode(){
  if(!pairing)return {ok:false,error:'Prima mostra il QR'};
  clipboard.writeText(pairing.code);
  return {ok:true};
}
function removeDevice(id){
  data().devices=data().devices.filter(d=>d.id!==id);
  delete data().inbox[id];
  save();startRelay();windows.emitAll();
  return {ok:true};
}
function setEnabled(enabled){
  data().enabled=!!enabled;
  if(!enabled)pairing=null;
  save();start();windows.emitAll();
  return {ok:true};
}

/** Per la pagina Impostazioni. */
function snapshot(){
  const d=data();
  return {link:{enabled:d.enabled,listening:listeningPort>0,port:listeningPort||d.port,error:lastError,pcName:os.hostname(),
    hosts:rules.lanAddresses(os.networkInterfaces()),
    relay:d.relay,syncPasswords:d.syncPasswords,relayOk,relayError,relayServer:rules.RELAY_SERVER.replace(/^https:\/\//,''),
    devices:d.devices.map(x=>({id:x.id,name:x.name,lastSeen:x.lastSeen,waiting:(d.inbox[x.id]||[]).length})),
    pairing:pairing&&Date.now()<pairing.until?{qr:pairing.qr,until:pairing.until}:null}};
}

/** Telefoni collegati, per i menu "Manda al telefono". */
const devices=()=>data().devices.map(d=>({id:d.id,name:d.name}));

module.exports={start,stop,handle,handleRelay,setRelay,setSyncPasswords,receive,openAsked,sendToPhone,sendUrlToPhone,startPairing,stopPairing,copyPairingCode,removeDevice,setEnabled,snapshot,devices};
