'use strict';
// Schermate dell'installer VARCO: Benvenuto → Licenza → Destinazione → Opzioni → Installazione → Completato.
const $=id=>document.getElementById(id);
const api=window.setupAPI;
const STEPS=[['welcome','Benvenuto'],['license','Licenza'],['destination','Destinazione'],['options','Opzioni'],['progress','Installazione'],['done','Completato']];
const TASKS=[['remove','Rimozione della versione precedente'],['extract','Estrazione dei file'],['components','Installazione dei componenti'],
  ['config','Configurazione del browser'],['shortcuts','Creazione dei collegamenti'],['finish','Finalizzazione']];
let info=null,current='welcome',result=null;

const gb=bytes=>bytes>=1073741824?(bytes/1073741824).toFixed(1).replace('.',',')+' GB':Math.round(bytes/1048576)+' MB';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const icon=name=>{const i=el('span','i i-'+name);return i;};

function show(step){
  current=step;
  const page=['license','destination','options'].includes(step)?'steps':step;
  for(const p of document.querySelectorAll('.page'))p.hidden=p.dataset.page!==page;
  if(page==='steps'){
    for(const d of document.querySelectorAll('[data-step]'))d.hidden=d.dataset.step!==step;
    renderSteps();
    $('stepError').textContent='';
    $('nextButton').replaceChildren(step==='options'?'Installa':'Avanti ',...(step==='options'?[]:[el('span','chev','›')]));
    validate();
  }
}
function renderSteps(){
  const nav=$('steps');nav.replaceChildren();
  const index=STEPS.findIndex(s=>s[0]===current);
  STEPS.forEach(([key,label],i)=>{
    const row=el('div','s'+(i<index?' done':i===index?' now':''));
    const n=el('span','n');if(i<index)n.append(icon('check'));else n.textContent=String(i+1);
    row.append(n,el('span','',label));nav.append(row);
  });
}
function validate(){
  const next=$('nextButton');
  if(current==='license')next.disabled=!$('accept').checked;
  else if(current==='destination')next.disabled=!$('destination').value.trim();
  else next.disabled=false;
}
async function updateSpace(){
  $('required').textContent='Spazio richiesto: '+gb(info.required);
  const free=await api.free($('destination').value.trim());
  $('free').textContent=free===null?'':'Spazio disponibile: '+gb(free);
}

async function next(){
  if(current==='welcome')return show('license');
  if(current==='license')return show('destination');
  if(current==='destination'){
    const free=await api.free($('destination').value.trim());
    if(free!==null&&free<info.required*1.1){$('stepError').textContent='Spazio insufficiente su questo disco.';return;}
    return show('options');
  }
  if(current==='options')return install();
}
function back(){
  const order=['welcome','license','destination','options'];
  show(order[Math.max(0,order.indexOf(current)-1)]);
}

async function install(){
  // VARCO aperto (anche solo nell'area di notifica): va chiuso prima di sostituirne i file.
  if(await api.running()){
    const ok=confirm('VARCO è aperto. Chiuderlo ora per continuare l\'installazione?\n\nSchede e impostazioni sono già salvate.');
    if(!ok)return;
    if(!(await api.closeVarco())){$('stepError').textContent='Non riesco a chiudere VARCO: chiudilo dall\'area di notifica e riprova.';return;}
  }
  show('progress');
  const tasks=$('tasks');tasks.replaceChildren();
  for(const [key,label] of TASKS){
    if(key==='remove'&&!info.installs.length)continue;
    const li=el('li');li.dataset.task=key;li.append(el('span','dot'),el('span','',label));tasks.append(li);
  }
  const options={destination:$('destination').value.trim(),desktop:$('optDesktop').checked,startMenu:$('optStart').checked,
    defaultBrowser:$('optDefault').checked,jarvis:$('optJarvis').checked};
  result=await api.install(options);
  if(!result.ok){
    $('progressTitle').textContent='Installazione non riuscita';
    tasks.append(el('li','',result.error||'Errore sconosciuto'));
    return;
  }
  for(const li of tasks.children){li.className='done';li.firstChild.replaceChildren(icon('check'));}
  setTimeout(()=>show('done'),600);
}

api.onProgress(({step,percent})=>{
  $('bar').style.width=percent+'%';$('percent').textContent=percent+'%';
  // Confronto per posizione nell'elenco: il passaggio corrente può non avere una riga (es. niente da rimuovere).
  const order=TASKS.map(t=>t[0]),now=order.indexOf(step);
  for(const li of $('tasks').children){
    const i=order.indexOf(li.dataset.task);
    if(i<now){li.className='done';li.firstChild.replaceChildren(icon('check'));}
    else if(i===now){li.className='now';li.firstChild.replaceChildren();}
    else{li.className='';li.firstChild.replaceChildren();}
  }
});

document.addEventListener('click',e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='next')next();
  else if(action==='back')back();
  else if(action==='cancel')api.window('close');
  else if(action==='launch')api.finish({launch:true,exe:result?.exe,openDefaultApps:result?.openDefaultApps});
  else if(action==='finish')api.finish({launch:$('launchAfter').checked,exe:result?.exe,openDefaultApps:result?.openDefaultApps});
});
$('accept').onchange=validate;
$('destination').oninput=()=>{validate();updateSpace();};
$('browse').onclick=async()=>{const dir=await api.chooseDir($('destination').value.trim());if(dir){$('destination').value=dir;validate();updateSpace();}};
$('optDefault').onchange=()=>{$('defaultHint').hidden=!$('optDefault').checked;};
$('minimize').onclick=()=>api.window('minimize');
$('close').onclick=()=>{if(current!=='progress')api.window('close');};
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.target.matches('button')&&!$('nextButton').disabled&&['license','destination','options'].includes(current))next();});

(async()=>{
  info=await api.info();
  $('license').textContent=info.license;
  $('destination').value=info.defaultDir;
  updateSpace();
  const old=info.installs.map(x=>x.name).join(', ');
  if(old){$('oldNotice').hidden=false;$('oldNotice').textContent=`Trovato: ${old}. Verrà sostituito; workspace, schede e impostazioni restano.`;
    $('doneTitle').textContent='Aggiornamento completato!';$('doneText').textContent=`VARCO ${info.version} è installato. I tuoi dati sono al loro posto.`;}
  document.querySelector('[data-page="welcome"] .primary').focus();
})();
