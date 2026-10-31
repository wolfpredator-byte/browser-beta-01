'use strict';

/**
 * Sospensione delle schede inattive (Beta 0.10). Una volta al minuto: le
 * schede caricate ma non guardate da N minuti tornano dormienti. La scheda resta
 * nella barra (con titolo e icona, un po' attenuata) e si ricarica quando la apri.
 * Regola ed eccezioni (audio, fissate, DevTools): shouldSleep in tab-advanced.cjs.
 */
const {state}=require('./state.cjs');
const windows=require('./windows.cjs');
const tabs=require('./tabs.cjs');
const adblock=require('./adblock.cjs');
const {shouldSleep}=require('./tab-advanced.cjs');

let timer=null;

function tick(){
  const minutes=state.data.settings.sleepAfterMinutes,now=Date.now();
  let changed=false;
  for(const t of state.tabs){
    if(!t.view)continue;
    const contents=t.view.webContents;
    const visible=state.windows.some(w=>w.attached===t.view||w.splitViews?.includes(t.view));
    if(visible||!t.lastVisibleAt){t.lastVisibleAt=now;continue;}
    if(!shouldSleep({visible,audible:contents.isCurrentlyAudible(),pinned:t.pinned,
      devtools:contents.isDevToolsOpened(),lastVisibleAt:t.lastVisibleAt},now,minutes))continue;
    adblock.resetCount(contents.id);
    contents.close();
    t.view=null;t.loading=false;
    changed=true;
  }
  if(changed){tabs.persistTabs();windows.emitAll();}
}

/**
 * Beta 0.28 — archivio automatico (se attivo): le schede non guardate da N giorni si chiudono e
 * finiscono in data.archivedTabs, da cui si riaprono. Restano sempre: fissate, negli stack, nella
 * vista divisa, mostrate in una finestra, Home.
 */
function archiveTick(now=Date.now()){
  const {enabled,days}=state.data.settings.autoArchive||{};
  if(!enabled)return 0;
  const limit=days*86400000,shown=new Set(state.windows.flatMap(w=>[w.activeId,...(w.split?.ids||[])]));
  const old=state.tabs.filter(t=>!t.isHome&&!t.pinned&&!t.group&&!shown.has(t.id)&&now-(t.lastSeen||now)>limit);
  if(!old.length)return 0;
  const archive=state.data.archivedTabs;
  for(const t of old){
    archive.unshift({url:t.url,title:t.title||t.url,favicon:t.favicon&&t.favicon.length<6000?t.favicon:null,workspace:t.workspace,archivedAt:now});
    tabs.closeTabAnywhere(t.id);
  }
  state.data.archivedTabs=archive.slice(0,200);
  tabs.persistTabs();windows.emitAll();
  require('./toasts.cjs').show({id:'archive',kind:'info',title:`${old.length} ${old.length===1?'scheda archiviata':'schede archiviate'}`,
    text:`Non le aprivi da più di ${days} ${days===1?'giorno':'giorni'}: le ritrovi in Schede → Archivio.`,timeout:6000});
  return old.length;
}

let archiveTimer=null;
function start(){
  if(!timer)timer=setInterval(tick,60000);
  if(!archiveTimer){archiveTimer=setInterval(()=>archiveTick(),30*60000);setTimeout(()=>archiveTick(),90000);}
}
function stop(){clearInterval(timer);timer=null;}

module.exports={start,stop,tick,archiveTick};
