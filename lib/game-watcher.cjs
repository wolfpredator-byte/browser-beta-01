'use strict';

/**
 * Rilevatore dei giochi. Ogni pochi secondi chiede quali processi sono attivi
 * e avvisa quando un gioco configurato parte o si chiude.
 * Non importa Electron: la lettura dei processi viene passata dall'esterno,
 * così nei test usiamo un elenco finto.
 */
const {diffRunning}=require('./game-rules.cjs');

/**
 * @param {object} options
 * @param {() => object[]} options.games - Giochi configurati (letti a ogni controllo).
 * @param {(exeNames:string[]) => Promise<Set<string>>} options.findRunning - Restituisce i nomi attivi in minuscolo.
 * @param {(game:object) => void} options.onStart
 * @param {(game:object) => void} options.onStop
 * @param {number} [options.intervalMs] - 5 secondi: il companion compare mentre il gioco carica.
 */
function createGameWatcher({games,findRunning,onStart,onStop,intervalMs=5000}){
  let running=new Set(),timer=null,enabled=true,busy=false;

  /** Un controllo. `busy` evita due controlli sovrapposti se Windows è lento. */
  async function tick(){
    if(busy)return;
    const list=games();
    const watched=enabled?list.filter(g=>g.enabled):[];
    // Nessun gioco da guardare: non lanciamo alcun processo, consumo zero.
    if(!watched.length&&!running.size)return;
    busy=true;
    try{
      const names=watched.length?await findRunning([...new Set(watched.map(g=>g.exe.toLowerCase()))]):new Set();
      const effective=enabled?list:list.map(g=>({...g,enabled:false}));
      const diff=diffRunning(running,names,effective);
      running=diff.running;
      for(const game of diff.started)onStart(game);
      for(const game of diff.stopped)onStop(game);
    }catch(error){console.warn('Rilevamento giochi non riuscito',error);}
    finally{busy=false;}
  }

  return {
    tick,
    start(){if(!timer){timer=setInterval(tick,intervalMs);tick();}},
    stop(){clearInterval(timer);timer=null;},
    setEnabled(value){enabled=!!value;},
    get enabled(){return enabled;},
    isRunning(id){return running.has(id);},
    runningIds(){return [...running];}
  };
}

module.exports={createGameWatcher};
