'use strict';

/**
 * Script eseguito prima delle pagine web (non della cornice), in un mondo isolato.
 * Agisce SOLO sulle pagine di accesso di Google; su tutti gli altri siti non fa nulla.
 * - Completa l'identità "Firefox" (vedi FIREFOX_UA in lib/web-rules.cjs) togliendo
 *   navigator.userAgentData, che Firefox non ha e che rivelerebbe Chromium.
 * - Nasconde le passkey (WebAuthn): Google prova subito l'accesso con passkey, che
 *   in Electron fallisce con la finestra "Sicurezza di Windows". Senza, Google usa
 *   il flusso classico email + password (+ verifica in due passaggi sul telefono).
 */
const {contextBridge,ipcRenderer}=require('electron');

/**
 * Beta 0.15.1 — notifiche. Electron sa rispondere ai siti solo "concesso" o "negato":
 * per un sito che non hai ancora deciso, Notification.permission diceva "denied" e
 * quasi tutti i siti (che chiedono solo se lo stato è "default") non chiedevano mai.
 * Qui mostriamo alla pagina lo stato vero: "default" finché non decidi; la richiesta
 * vera passa comunque dal dialogo VARCO (lib/permissions.cjs).
 */
if(/^https?:$/.test(location.protocol)){
  let choice='ask';
  try{choice=ipcRenderer.sendSync('varco:notification-permission')||'ask';}catch{}
  contextBridge.executeInMainWorld({args:[choice],func:initial=>{
    const N=window.Notification;
    if(!N)return;
    let current=initial;
    const toWeb={allow:'granted',deny:'denied',ask:'default'};
    try{Object.defineProperty(N,'permission',{get:()=>toWeb[current]||'default',configurable:true});}catch{}
    const request=N.requestPermission.bind(N);
    N.requestPermission=function(callback){
      return request().then(result=>{
        current=result==='granted'?'allow':result==='denied'?'deny':current;
        if(typeof callback==='function')callback(result);
        return result;
      });
    };
    const permissions=navigator.permissions;
    if(permissions?.query){
      const query=permissions.query.bind(permissions);
      permissions.query=descriptor=>query(descriptor).then(status=>{
        if(descriptor?.name==='notifications'&&current==='ask'){
          try{Object.defineProperty(status,'state',{get:()=>toWeb[current]==='default'?'prompt':toWeb[current],configurable:true});}catch{}
        }
        return status;
      });
    }
  }});
}

if(location.hostname==='accounts.google.com'){
  contextBridge.executeInMainWorld({func:()=>{
    try{Object.defineProperty(Navigator.prototype,'userAgentData',{get:()=>undefined,configurable:true});}catch{}
    try{delete window.PublicKeyCredential;}catch{}
    try{
      // navigator.credentials resta (serve anche alle password), ma senza passkey.
      const credentials=navigator.credentials;
      if(credentials){
        const refuse=()=>Promise.reject(new DOMException('Passkey non disponibili in questo browser','NotAllowedError'));
        credentials.get=options=>options&&options.publicKey?refuse():CredentialsContainer.prototype.get.call(credentials,options);
        credentials.create=options=>options&&options.publicKey?refuse():CredentialsContainer.prototype.create.call(credentials,options);
      }
    }catch{}
  }});
}

/**
 * Beta 0.20 — pagina del visualizzatore di file (varco-view://app): due pulsanti che
 * chiedono al browser di aprire il file con il programma predefinito o di mostrarlo
 * nella cartella. Il browser controlla che la richiesta arrivi davvero da lì.
 */
if(location.protocol==='varco-view:'&&location.host==='app'){
  contextBridge.exposeInMainWorld('varcoViewer',{
    openExternal:file=>ipcRenderer.invoke('viewer:action','open',file),
    showInFolder:file=>ipcRenderer.invoke('viewer:action','folder',file)
  });
}
