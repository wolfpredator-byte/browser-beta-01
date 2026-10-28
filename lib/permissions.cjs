'use strict';

/**
 * Permessi dei siti (Beta 0.10). Quando un sito chiede fotocamera, microfono,
 * notifiche, posizione o lettura degli appunti, il browser ti chiede se consentirlo.
 * Con "Ricorda la scelta" la risposta vale per sempre per quel sito (in
 * browser-data.json → sitePermissions); senza, solo fino alla chiusura del browser.
 * Le regole sono in permission-rules.cjs.
 */
const {dialog}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const rules=require('./permission-rules.cjs');

/** Risposte date senza "Ricorda": origine → {tipo: 'allow'|'deny'}, solo per questa sessione. */
const sessionDecisions=new Map();
/** Una sola domanda alla volta per la stessa richiesta (i siti spesso la ripetono). */
const pending=new Map();

const saved=origin=>({...state.data.sitePermissions[origin],...sessionDecisions.get(origin)});

function setup(ses){
  ses.setPermissionRequestHandler((contents,permission,callback,details)=>{
    const kinds=rules.requestKinds(permission,details);
    const origin=rules.originOf(details?.requestingUrl||contents.getURL());
    if(kinds===null||(kinds.length&&!origin))return callback(false);
    const verdict=rules.decide(saved(origin),kinds);
    if(verdict!=='ask')return callback(verdict==='allow');
    ask(contents,origin,kinds).then(callback,()=>callback(false));
  });
  // Verifiche silenziose (Notification.permission, permissions.query): mai una domanda.
  // Electron risponde solo sì/no, e "no" diventa "denied": siti come Discord, letto
  // "microfono negato", non chiederebbero nemmeno. Per fotocamera e microfono non
  // ancora decisi rispondiamo quindi "sì": l'uso vero passa comunque dalla richiesta,
  // cioè dalla nostra domanda. Per notifiche & co. serve un "consenti" esplicito,
  // altrimenti il sito le invierebbe senza chiedere.
  ses.setPermissionCheckHandler((_contents,permission,requestingOrigin,details)=>{
    if(rules.ALWAYS_ALLOWED.has(permission))return true;
    const kind=rules.checkKind(permission,details),origin=rules.originOf(requestingOrigin);
    if(!kind||!origin)return false;
    const value=saved(origin)[kind];
    return ['camera','microphone'].includes(kind)?value!=='deny':value==='allow';
  });
}

function ask(contents,origin,kinds){
  const key=origin+'|'+kinds.join(',');
  if(pending.has(key))return pending.get(key);
  const promise=(async()=>{
    const tab=state.tabs.find(t=>t.view?.webContents===contents);
    const owner=(tab&&windows.windowForTab(tab))||windows.focusedWindow();
    const options={type:'question',title:'Permesso del sito',message:rules.describeRequest(origin,kinds),
      detail:'Puoi cambiare idea quando vuoi dal pannello del sito: lo scudo ⛉ accanto alla barra degli indirizzi.',
      buttons:['Consenti','Blocca'],defaultId:1,cancelId:1,noLink:true,
      checkboxLabel:'Ricorda la scelta per questo sito',checkboxChecked:true};
    const answer=owner?await dialog.showMessageBox(owner.win,options):await dialog.showMessageBox(options);
    const value=answer.response===0?'allow':'deny';
    if(answer.checkboxChecked){
      const site=state.data.sitePermissions[origin]??={};
      for(const kind of kinds)site[kind]=value;
      save();
    }else{
      const site=sessionDecisions.get(origin)||{};
      for(const kind of kinds)site[kind]=value;
      sessionDecisions.set(origin,site);
    }
    windows.emitAll();
    return value==='allow';
  })();
  pending.set(key,promise);
  promise.finally(()=>pending.delete(key));
  return promise;
}

/** Dal pannello del sito: 'allow', 'deny' oppure 'ask' (dimentica la scelta). */
function setPermission(origin,kind,value){
  if(!rules.originOf(origin)||!rules.ASKABLE[kind])return {ok:false,error:'Permesso non valido.'};
  sessionDecisions.get(origin)&&delete sessionDecisions.get(origin)[kind];
  if(value==='ask'){
    const site=state.data.sitePermissions[origin];
    if(site){delete site[kind];if(!Object.keys(site).length)delete state.data.sitePermissions[origin];}
  }else (state.data.sitePermissions[origin]??={})[kind]=value;
  save();windows.emitAll();
  return {ok:true};
}
function forgetSite(origin){
  delete state.data.sitePermissions[origin];sessionDecisions.delete(origin);
  save();windows.emitAll();
  return {ok:true};
}

/** Per il pannello del sito: permessi del sito attivo e tutti i siti con scelte salvate. */
function snapshot(origin){
  const current=origin?saved(origin):{};
  return {
    permissions:Object.entries(rules.ASKABLE).map(([kind,label])=>({kind,label,value:current[kind]||'ask'})),
    sites:Object.entries(state.data.sitePermissions).map(([site,kinds])=>({origin:site,
      summary:Object.entries(kinds).map(([kind,value])=>`${rules.ASKABLE[kind]}: ${value==='allow'?'consentito':'bloccato'}`).join(' · ')}))
  };
}

module.exports={setup,setPermission,forgetSite,snapshot};
