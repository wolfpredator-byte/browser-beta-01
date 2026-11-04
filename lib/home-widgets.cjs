'use strict';

/**
 * Beta 0.36 — widget della Home (orologio, meteo, note, siti, schede recenti, pagina web) e animazioni.
 * Regole in home-widgets-rules.cjs. Il meteo arriva da Open-Meteo (gratuito, senza chiave):
 * https://open-meteo.com — si aggiorna al massimo ogni 30 minuti per città.
 */
const {net}=require('electron');
const {state,save,saveSoon}=require('./state.cjs');
const rules=require('./home-widgets-rules.cjs');

const WEATHER_MS=30*60*1000;

// ── Icone dei siti (Beta 0.36) ──
// Si ricordano quelle viste nelle schede (per sito, data.siteIcons, al massimo 300) e per i siti mai aperti
// si chiede /favicon.ico una volta sola, con la sessione delle pagine.
const ICON_MAX=60*1024,ICON_KEEP=300;
const asked=new Set();
const originOf=url=>{try{const u=new URL(url);return /^https?:$/.test(u.protocol)?u.origin:'';}catch{return '';}};
function rememberIcon(url,data){
  const origin=originOf(url);
  if(!origin||typeof data!=='string'||!data.startsWith('data:image/')||data.length>ICON_MAX*1.4)return;
  const icons=state.data.siteIcons||(state.data.siteIcons={});
  if(icons[origin]===data)return;
  delete icons[origin];icons[origin]=data;
  const keys=Object.keys(icons);
  for(const k of keys.slice(0,Math.max(0,keys.length-ICON_KEEP)))delete icons[k];
  saveSoon();
}
function iconFor(url){
  const origin=originOf(url);
  if(!origin)return null;
  const known=state.data.siteIcons?.[origin];
  if(known)return known;
  if(!asked.has(origin)){
    asked.add(origin);
    const {session}=require('electron');
    session.fromPartition(require('./web-rules.cjs').PARTITION).fetch(origin+'/favicon.ico',{signal:AbortSignal.timeout(6000)})
      .then(async r=>{
        const type=(r.headers.get('content-type')||'').split(';')[0];
        const body=Buffer.from(await r.arrayBuffer());
        if(!r.ok||!/^image\//.test(type)||!body.length||body.length>ICON_MAX)return;
        rememberIcon(origin,`data:${type};base64,${body.toString('base64')}`);
        require('./windows.cjs').emitAll();
      }).catch(()=>{});
  }
  return null;
}
const withIcon=item=>({...item,icon:iconFor(item.url)});
const weather=new Map(); // "lat,lon" → {at,data,error,loading}

async function getJson(url){
  const r=await net.fetch(url,{headers:{'User-Agent':'VARCO'}});
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
}
/** Cerca una città (Open-Meteo geocoding). */
async function findCity(name){
  const q=encodeURIComponent(String(name).trim().slice(0,80));
  const j=await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=it&format=json`);
  const p=j.results?.[0];
  if(!p)return null;
  return {lat:p.latitude,lon:p.longitude,place:[p.name,p.admin1,p.country].filter(Boolean).join(', ')};
}
function refreshWeather(lat,lon){
  const key=lat.toFixed(2)+','+lon.toFixed(2);
  const cur=weather.get(key);
  if(cur&&(cur.loading||Date.now()-cur.at<WEATHER_MS))return;
  weather.set(key,{...cur,loading:true,at:cur?.at||0});
  getJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=4`)
    .then(j=>{
      const day=i=>({date:j.daily.time[i],max:Math.round(j.daily.temperature_2m_max[i]),min:Math.round(j.daily.temperature_2m_min[i]),code:j.daily.weather_code[i],
        text:rules.weatherText(j.daily.weather_code[i])[0],icon:rules.weatherText(j.daily.weather_code[i])[1]});
      weather.set(key,{at:Date.now(),data:{temp:Math.round(j.current.temperature_2m),code:j.current.weather_code,
        text:rules.weatherText(j.current.weather_code)[0],icon:rules.weatherText(j.current.weather_code)[1],days:[1,2,3].map(day)}});
    })
    .catch(error=>weather.set(key,{at:Date.now()-WEATHER_MS+5*60*1000,error:'Meteo non disponibile ('+error.message+').'}))
    .finally(()=>require('./windows.cjs').emitAll());
}

/** Per la cornice: widget con i loro dati pronti. */
function snapshot(w){
  const {data}=state;
  const widgets=data.homeWidgets.map(x=>{
    if(x.type==='webframe'&&x.url){const drm=rules.drmService(x.url);if(drm)return {...x,drm};}
    if(x.type==='weather'&&Number.isFinite(x.lat)&&Number.isFinite(x.lon)){
      refreshWeather(x.lat,x.lon);
      const cur=weather.get(x.lat.toFixed(2)+','+x.lon.toFixed(2));
      return {...x,weather:cur?.data||null,weatherError:cur?.error||''};
    }
    return x;
  });
  const types=new Set(widgets.map(x=>x.type));
  const recent=types.has('recent')?state.tabs.filter(t=>!t.isHome&&t.workspace===w.workspace&&t.id!==w.activeId)
    .sort((a,b)=>(b.lastSeen||0)-(a.lastSeen||0)).slice(0,6).map(t=>({id:t.id,title:t.title||t.url,url:t.url,favicon:t.favicon||null})):[];
  return {homeWidgets:widgets,homeMotion:data.homeMotion,widgetTypes:rules.ALL_TYPES,builtinWidgets:Object.keys(rules.BUILTIN),
    homeSites:types.has('sites')?{bookmarks:data.bookmarks.slice(0,8).map(withIcon),top:rules.topSites(data.history,8).map(withIcon)}:null,
    homeRecent:recent,homeClosed:types.has('recent')?data.closedTabs.slice(0,4).map(t=>({url:t.url,title:t.title||t.url})):[]};
}

const windowOf=ctx=>ctx?.window||require('./windows.cjs').focusedWindow();
function register(bus){
  const {data}=state;
  const changed=()=>{save();require('./windows.cjs').emitAll();};
  bus.register('homeWidgetAdd',{args:{type:Object.keys(rules.ALL_TYPES)},description:'Aggiunge un widget alla Home.',run:(_c,{type})=>{
    const r=rules.addWidget(data.homeWidgets,type);
    if(!r.ok)return r;
    data.homeWidgets=r.list;changed();return {ok:true,id:r.widget.id};
  }});
  bus.register('homeWidgetRemove',{args:{id:'string'},description:'Toglie un widget dalla Home.',
    run:(_c,{id})=>{data.homeWidgets=rules.removeWidget(data.homeWidgets,id);changed();}});
  bus.register('homeWidgetMove',{args:{id:'string',dir:'int'},description:'Sposta un widget prima (-1) o dopo (1).',
    run:(_c,{id,dir})=>{data.homeWidgets=rules.moveWidget(data.homeWidgets,id,dir);changed();}});
  bus.register('homeWidgetNotes',{args:{id:'string',text:'string'},description:'Testo del widget Note.',run:(_c,{id,text})=>{
    data.homeWidgets=rules.updateWidget(data.homeWidgets,id,{text});saveSoon(); // niente emitAll: stai scrivendo
  }});
  bus.register('homeWidgetSet',{args:{id:'string',url:'string?',cols:'int?',height:'int?',seconds:'bool?'},description:'Impostazioni di un widget (pagina web, orologio).',
    run:(_c,{id,...changes})=>{
      if(changes.url!==undefined&&changes.url&&!/^https?:\/\//i.test(changes.url))changes.url='https://'+changes.url.trim();
      data.homeWidgets=rules.updateWidget(data.homeWidgets,id,changes);changed();
    }});
  bus.register('homeWidgetCity',{args:{id:'string',city:'string'},description:'Città del widget Meteo.',run:async(_c,{id,city})=>{
    let found;
    try{found=await findCity(city);}catch(error){return {ok:false,error:'Ricerca della città non riuscita: '+error.message};}
    if(!found)return {ok:false,error:`Città «${city}» non trovata.`};
    data.homeWidgets=rules.updateWidget(data.homeWidgets,id,{city,...found});changed();
    return {ok:true,place:found.place};
  }});
  bus.register('sitePreview',{args:{url:'string',x:'int',y:'int'},description:'Anteprima di un sito al passaggio del mouse (Home).',
    run:(ctx,{url,x,y})=>require('./site-preview.cjs').show(windowOf(ctx),{url,x,y})});
  bus.register('sitePreviewHide',{description:'Chiude la finestrella di anteprima del sito.',run:ctx=>{require('./site-preview.cjs').hide(windowOf(ctx));}});
  bus.register('setHomeMotion',{args:{key:Object.keys(rules.MOTION),enabled:'bool'},description:'Animazioni della Home.',
    run:(_c,{key,enabled})=>{data.homeMotion={...data.homeMotion,[key]:enabled};changed();}});
}

module.exports={snapshot,register,findCity,rememberIcon,iconFor};
