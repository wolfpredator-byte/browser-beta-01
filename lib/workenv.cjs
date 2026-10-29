'use strict';

/**
 * Ambiente di lavoro (Beta 0.19): il companion dei giochi al contrario.
 * Per ogni workspace scegli dei programmi (VS Code, Visual Studio, Unity, Blender…):
 * partono con "▶ Inizia a lavorare" oppure, se lo vuoi, da soli quando apri il
 * workspace (una volta per sessione del browser).
 *
 * workspace.workPrograms = [{name, path, openFolder}]   openFolder: passa la cartella del progetto
 * workspace.workAutoStart = true|false
 * I programmi li scegli tu da Esplora file: nessun sito o comando esterno può aggiungerli.
 */
const fs=require('node:fs');
const path=require('node:path');
const {spawn,execFile}=require('node:child_process');
const {shell}=require('electron');
const {state}=require('./state.cjs');

const EXTENSIONS=['.exe','.lnk','.bat','.cmd'];
const MAX_PROGRAMS=8;
/** Workspace già avviati in questa sessione: l'avvio automatico non si ripete. */
const started=new Set();

const workspaceOf=name=>state.data.workspaces.find(w=>w.name===name)||null;

/** Programma valido: percorso esistente con un'estensione eseguibile. */
function checkProgram(file){
  const ext=path.extname(String(file||'')).toLowerCase();
  if(!EXTENSIONS.includes(ext))return {ok:false,error:'Scegli un programma (.exe), un collegamento (.lnk) o uno script (.bat, .cmd).'};
  if(!fs.existsSync(file))return {ok:false,error:'Il file non esiste più.'};
  return {ok:true};
}

/** Nome leggibile: "Code.exe" → "Code", "devenv.exe" → "Visual Studio". */
function displayName(file){
  const base=path.basename(file,path.extname(file));
  return {code:'VS Code',devenv:'Visual Studio','unity hub':'Unity Hub',unity:'Unity',blender:'Blender',
    rider64:'Rider',idea64:'IntelliJ IDEA',cursor:'Cursor'}[base.toLowerCase()]||base;
}

/** Programmi noti già installati su questo PC, da proporre con un clic. */
async function suggestions(){
  const env=process.env,list=[];
  const candidates=[
    ['VS Code',path.join(env.LOCALAPPDATA||'','Programs','Microsoft VS Code','Code.exe')],
    ['VS Code',path.join(env.ProgramFiles||'','Microsoft VS Code','Code.exe')],
    ['Cursor',path.join(env.LOCALAPPDATA||'','Programs','cursor','Cursor.exe')],
    ['Unity Hub',path.join(env.ProgramFiles||'','Unity Hub','Unity Hub.exe')],
    ['Blender',path.join(env.ProgramFiles||'','Blender Foundation','Blender','blender.exe')]
  ];
  for(const [name,file] of candidates)if(file&&fs.existsSync(file)&&!list.some(x=>x.name===name))list.push({name,path:file,openFolder:name!=='Unity Hub'&&name!=='Blender'});
  // Visual Studio: lo trova vswhere, installato insieme a Visual Studio.
  const vswhere=path.join(env['ProgramFiles(x86)']||'','Microsoft Visual Studio','Installer','vswhere.exe');
  if(fs.existsSync(vswhere)){
    const devenv=await new Promise(resolve=>execFile(vswhere,['-latest','-property','productPath'],{windowsHide:true},(e,out)=>resolve(e?'':String(out).trim())));
    if(devenv&&fs.existsSync(devenv))list.push({name:'Visual Studio',path:devenv,openFolder:true});
  }
  return list;
}

function addProgram(workspaceName,program){
  const ws=workspaceOf(workspaceName);
  if(!ws)return {ok:false,error:'Workspace non trovato.'};
  const checked=checkProgram(program.path);
  if(!checked.ok)return checked;
  ws.workPrograms=Array.isArray(ws.workPrograms)?ws.workPrograms:[];
  if(ws.workPrograms.length>=MAX_PROGRAMS)return {ok:false,error:`Al massimo ${MAX_PROGRAMS} programmi per workspace.`};
  if(ws.workPrograms.some(p=>p.path.toLowerCase()===program.path.toLowerCase()))return {ok:false,error:'Questo programma c’è già.'};
  ws.workPrograms.push({name:String(program.name||displayName(program.path)).slice(0,40),path:program.path,openFolder:!!program.openFolder});
  return {ok:true};
}

/**
 * Avvia i programmi del workspace. I programmi restano aperti anche se chiudi il browser.
 * @returns {{ok:boolean,launched:string[],errors:string[]}}
 */
function launch(workspaceName){
  const ws=workspaceOf(workspaceName);
  const programs=ws?.workPrograms||[];
  const folder=ws?.projectPath&&fs.existsSync(ws.projectPath)?ws.projectPath:null;
  const launched=[],errors=[];
  for(const p of programs){
    if(!checkProgram(p.path).ok){errors.push(`${p.name}: file non trovato`);continue;}
    try{
      const ext=path.extname(p.path).toLowerCase();
      const args=p.openFolder&&folder?[folder]:[];
      if(ext==='.lnk')shell.openPath(p.path);   // i collegamenti si aprono come da Esplora file
      else if(ext==='.exe')spawn(p.path,args,{cwd:folder||path.dirname(p.path),detached:true,stdio:'ignore',windowsHide:false}).unref();
      else spawn('cmd.exe',['/c',p.path,...args],{cwd:folder||path.dirname(p.path),detached:true,stdio:'ignore',windowsHide:true}).unref();
      launched.push(p.name);
    }catch(e){errors.push(`${p.name}: ${e.message}`);}
  }
  started.add(workspaceName);
  return {ok:launched.length>0,launched,errors};
}

/** All'apertura del workspace: parte da solo, una volta per sessione, se l'hai chiesto. */
function maybeAutoStart(workspaceName){
  const ws=workspaceOf(workspaceName);
  if(!ws?.workAutoStart||!ws.workPrograms?.length||started.has(workspaceName))return null;
  const result=launch(workspaceName);
  if(result.launched.length)require('./toasts.cjs').show({id:'workenv-'+workspaceName,kind:'success',
    title:'Ambiente di lavoro avviato',text:result.launched.join(', '),timeout:5000});
  return result;
}

/** Per il pannello Progetto. */
function snapshot(workspaceName){
  const ws=workspaceOf(workspaceName);
  return {programs:(ws?.workPrograms||[]).map((p,index)=>({index,name:p.name,path:p.path,openFolder:!!p.openFolder,missing:!fs.existsSync(p.path)})),
    autoStart:!!ws?.workAutoStart,startedThisSession:started.has(workspaceName),hasFolder:!!ws?.projectPath};
}

module.exports={EXTENSIONS,checkProgram,displayName,suggestions,addProgram,launch,maybeAutoStart,snapshot};
