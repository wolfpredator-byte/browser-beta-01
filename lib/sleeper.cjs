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
    const visible=state.windows.some(w=>w.attached===t.view);
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

function start(){if(!timer)timer=setInterval(tick,60000);}
function stop(){clearInterval(timer);timer=null;}

module.exports={start,stop,tick};
