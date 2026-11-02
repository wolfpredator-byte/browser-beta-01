'use strict';

/**
 * Beta 0.32: il relay per il collegamento fuori casa, su ntfy.sh (https://docs.ntfy.sh).
 * Solo il trasporto: le buste sono già cifrate, qui si pubblicano e si ascoltano e basta.
 *
 * - publish: POST <server>/<argomento> con la busta come testo. "Firebase: no" perché ntfy non la inoltri
 *   alle notifiche push di Google: non serve, il telefono la prende da sé.
 * - listen: una connessione che resta aperta (GET <server>/<a1>,<a2>/json) e riceve una riga JSON per messaggio.
 *   ntfy manda un "keepalive" ogni 45 secondi: se per 2 minuti non arriva niente, la connessione si rifà.
 *   since = l'ultimo messaggio visto, così alla riapertura arrivano solo quelli nuovi (ntfy li tiene 12 ore).
 */

async function publish(server,topic,body){
  const res=await fetch(`${server}/${topic}`,{method:'POST',body,headers:{'Firebase':'no','Content-Type':'text/plain'},signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw new Error('ntfy ha risposto '+res.status);
  return res.json().catch(()=>({}));
}

/**
 * Ascolta gli argomenti finché non chiami stop(). onMessage({id, topic, message}) per ogni messaggio;
 * onState(ok, errore) quando la connessione si apre o cade. Riprova da sola, aspettando sempre di più (fino a 5 minuti).
 */
function listen({server,topics,since,onMessage,onState}){
  let stopped=false,controller=null,retry=null,delay=5000,cursor=since||'12h';
  const run=async()=>{
    if(stopped||!topics.length)return;
    controller=new AbortController();
    let watchdog=null;
    const kick=()=>{clearTimeout(watchdog);watchdog=setTimeout(()=>controller.abort(),120000);};
    try{
      kick();
      const res=await fetch(`${server}/${topics.join(',')}/json?since=${encodeURIComponent(cursor)}`,{signal:controller.signal,headers:{'Cache-Control':'no-store'}});
      if(!res.ok)throw new Error('ntfy ha risposto '+res.status);
      onState(true,'');
      delay=5000;
      const decoder=new TextDecoder();
      let buffer='';
      for await(const chunk of res.body){
        kick();
        buffer+=decoder.decode(chunk,{stream:true});
        let nl;
        while((nl=buffer.indexOf('\n'))>=0){
          const line=buffer.slice(0,nl).trim();buffer=buffer.slice(nl+1);
          if(!line)continue;
          let event;try{event=JSON.parse(line);}catch{continue;}
          if(event.event!=='message')continue;
          cursor=event.id;
          try{onMessage(event);}catch{}
        }
      }
      throw new Error('connessione chiusa');
    }catch(e){
      clearTimeout(watchdog);
      if(stopped)return;
      onState(false,e.name==='AbortError'?'ntfy.sh non risponde':(e.cause?.code==='ENOTFOUND'?'Niente internet':e.message));
      retry=setTimeout(run,delay);
      delay=Math.min(delay*2,5*60*1000);
    }
  };
  run();
  return {stop(){stopped=true;clearTimeout(retry);try{controller?.abort();}catch{}}};
}

module.exports={publish,listen};
