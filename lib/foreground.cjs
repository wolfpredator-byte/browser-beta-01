'use strict';

/**
 * Beta 0.39 — quale programma è in primo piano (per il profilo del launcher).
 *
 * Windows lo dice con GetForegroundWindow: lo chiediamo a un PowerShell che resta aperto in
 * background (prepararlo costa ~1 s la prima volta, poi ogni domanda ~30–80 ms). Niente moduli
 * nativi da compilare. Se qualcosa va storto la risposta è null e il launcher usa il profilo generale.
 *
 * La domanda va fatta PRIMA di mostrare il launcher, altrimenti in primo piano ci sarebbe lui.
 */
const {spawn}=require('node:child_process');

const SCRIPT=String.raw`
$ErrorActionPreference='SilentlyContinue'
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public static class VarcoFg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
}
"@
$script:mgr=$null
function Init-Media{
  if($script:mgr){return $true}
  try{
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $script:asTask=([System.WindowsRuntimeSystemExtensions].GetMethods()|?{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -like 'IAsyncOperation*'})[0]
    [void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
    $script:mgr=Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  }catch{$script:mgr=$null}
  return [bool]$script:mgr
}
function Await($op,$type){$t=$script:asTask.MakeGenericMethod($type).Invoke($null,@($op));[void]$t.Wait(2000);$t.Result}
[Console]::Out.WriteLine('{"ready":true}')
while($true){
  $line=[Console]::In.ReadLine()
  if($line -eq $null){break}
  $parts=$line.Split(' ',3); $id=$parts[0]; $cmd=if($parts.Count -gt 1){$parts[1]}else{'fg'}
  if($cmd -eq 'ports'){
    # Beta 0.43: porte in ascolto di un processo e di tutti i suoi figli (anche se il comando è già finito:
    # Windows ricorda il ParentProcessId dei processi rimasti accesi).
    $out=@{id=$id;pids=@();ports=@()}
    try{
      $root=[int]$parts[2]
      $all=@(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId)
      $ids=New-Object 'System.Collections.Generic.HashSet[int]'; [void]$ids.Add($root)
      do{$n=$ids.Count; foreach($p in $all){ if($ids.Contains([int]$p.ParentProcessId)){ [void]$ids.Add([int]$p.ProcessId) } } }while($ids.Count -ne $n)
      $alive=@($all | ForEach-Object { [int]$_.ProcessId } | Where-Object { $ids.Contains($_) })
      $out.pids=$alive
      $out.ports=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ids.Contains([int]$_.OwningProcess) } | ForEach-Object { [int]$_.LocalPort } | Sort-Object -Unique)
    }catch{}
    [Console]::Out.WriteLine(($out | ConvertTo-Json -Compress)); continue
  }
  if($cmd -eq 'newports'){
    # Beta 0.43: porte aperte da processi nati dopo un certo momento (server rimasti staccati da un comando già finito).
    $out=@{id=$id;pids=@();ports=@()}
    try{
      $since=[DateTimeOffset]::FromUnixTimeMilliseconds([int64]$parts[2]).LocalDateTime
      $seen=@{}
      foreach($c in @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue)){
        $op=[int]$c.OwningProcess
        if(-not $seen.ContainsKey($op)){ $pr=Get-Process -Id $op -ErrorAction SilentlyContinue; $seen[$op]=($pr -and $pr.StartTime -gt $since) }
        if($seen[$op]){ $out.pids+=$op; $out.ports+=[int]$c.LocalPort }
      }
      $out.pids=@($out.pids | Sort-Object -Unique); $out.ports=@($out.ports | Sort-Object -Unique)
    }catch{}
    [Console]::Out.WriteLine(($out | ConvertTo-Json -Compress)); continue
  }
  if($cmd -eq 'portowner'){
    $out=@{id=$id;pid=0;name=''}
    try{
      $c=Get-NetTCPConnection -State Listen -LocalPort ([int]$parts[2]) -ErrorAction SilentlyContinue | Select-Object -First 1
      if($c){$out.pid=[int]$c.OwningProcess; $pr=Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; if($pr){$out.name=$pr.ProcessName+'.exe'}}
    }catch{}
    [Console]::Out.WriteLine(($out | ConvertTo-Json -Compress)); continue
  }
  if($cmd -eq 'media'){
    # Beta 0.40: media delle app (Spotify, lettori…) dai controlli multimediali di Windows.
    $out=@{id=$id;sessions=@();available=(Init-Media)}
    if($out.available){
      foreach($sn in $script:mgr.GetSessions()){
        try{
          $pr=Await ($sn.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
          $pb=$sn.GetPlaybackInfo()
          $out.sessions+=@{app=$sn.SourceAppUserModelId;title=$pr.Title;artist=$pr.Artist;album=$pr.AlbumTitle;status=[string]$pb.PlaybackStatus;
            next=$pb.Controls.IsNextEnabled;prev=$pb.Controls.IsPreviousEnabled;toggle=($pb.Controls.IsPlayPauseToggleEnabled -or $pb.Controls.IsPlayEnabled -or $pb.Controls.IsPauseEnabled)}
        }catch{}
      }
    }
    [Console]::Out.WriteLine(($out | ConvertTo-Json -Compress -Depth 4)); continue
  }
  if($cmd -eq 'mediacmd'){
    $ok=$false
    if((Init-Media) -and $parts.Count -gt 2){
      $what,$app=$parts[2].Split(' ',2)
      foreach($sn in $script:mgr.GetSessions()){
        if($sn.SourceAppUserModelId -ne $app){continue}
        try{
          $op=switch($what){'next'{$sn.TrySkipNextAsync()} 'prev'{$sn.TrySkipPreviousAsync()} default{$sn.TryTogglePlayPauseAsync()}}
          $ok=[bool](Await $op ([bool]))
        }catch{}
        break
      }
    }
    [Console]::Out.WriteLine((@{id=$id;ok=$ok} | ConvertTo-Json -Compress)); continue
  }
  $out=@{id=$id;exe='';title='';cls='';path='';desc=''}
  try{
    $h=[VarcoFg]::GetForegroundWindow()
    $procId=[uint32]0
    [void][VarcoFg]::GetWindowThreadProcessId($h,[ref]$procId)
    $t=New-Object System.Text.StringBuilder 512; [void][VarcoFg]::GetWindowText($h,$t,512)
    $c=New-Object System.Text.StringBuilder 256; [void][VarcoFg]::GetClassName($h,$c,256)
    $out.title=$t.ToString(); $out.cls=$c.ToString()
    $p=Get-Process -Id $procId
    if($p){
      $out.exe=$p.ProcessName+'.exe'
      try{$out.path=$p.Path}catch{}
      try{$out.desc=$p.MainModule.FileVersionInfo.FileDescription}catch{}
    }
  }catch{}
  [Console]::Out.WriteLine(($out | ConvertTo-Json -Compress))
}
`;

let child=null,ready=null,buffer='',seq=0;
const pending=new Map();

function start(){
  if(child||process.platform!=='win32')return;
  const encoded=Buffer.from(SCRIPT,'utf16le').toString('base64');
  child=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',encoded],
    {windowsHide:true,stdio:['pipe','pipe','ignore']});
  let markReady;ready=new Promise(r=>{markReady=r;});
  child.stdout.setEncoding('utf8');
  child.stdout.on('data',chunk=>{
    buffer+=chunk;let i;
    while((i=buffer.indexOf('\n'))>=0){
      const line=buffer.slice(0,i).trim();buffer=buffer.slice(i+1);
      if(!line)continue;
      let msg;try{msg=JSON.parse(line);}catch{continue;}
      if(msg.ready){markReady(true);continue;}
      const done=pending.get(String(msg.id));
      if(done){pending.delete(String(msg.id));done(msg);}
    }
  });
  const reset=()=>{child=null;ready=null;buffer='';for(const done of pending.values())done(null);pending.clear();markReady(false);};
  child.on('exit',reset);child.on('error',reset);
  child.stdin.on('error',()=>{});
}

/** Manda una richiesta al PowerShell e aspetta la sua risposta (o null). */
async function ask(command,timeoutMs=1500,answerMs=600){
  if(process.platform!=='win32')return null;
  start();
  if(!child)return null;
  const ok=await Promise.race([ready,new Promise(r=>setTimeout(()=>r(false),timeoutMs))]);
  if(!ok)return null;
  const id=String(++seq);
  return new Promise(resolve=>{
    const timer=setTimeout(()=>{pending.delete(id);resolve(null);},answerMs);
    pending.set(id,msg=>{clearTimeout(timer);resolve(msg);});
    try{child.stdin.write((command?`${id} ${command}`:id)+'\n');}catch{clearTimeout(timer);pending.delete(id);resolve(null);}
  });
}
/**
 * @returns {Promise<{exe:string,title:string,cls:string,path:string,desc:string}|null>}
 */
const query=(timeoutMs=1500)=>ask('',timeoutMs);
/** Beta 0.40: media delle app di Windows. La prima volta prepara le API (fino a ~2 s). */
async function media(){const r=await ask('media',1500,4000);return r?.available?(Array.isArray(r.sessions)?r.sessions:[r.sessions].filter(Boolean)):[];}
/** Beta 0.40: play/pausa, avanti, indietro di un'app (per AppUserModelId). */
async function mediaCommand(appId,what){
  if(!/^[\w.!\-\: ()]+$/.test(String(appId||''))||!['toggle','next','prev'].includes(what))return {ok:false};
  const r=await ask(`mediacmd ${what} ${appId}`,1500,3000);return {ok:!!r?.ok};
}

/** Beta 0.43: processi vivi dell'albero di `pid` e loro porte in ascolto. */
async function processPorts(pid){
  const r=await ask(`ports ${Number(pid)|0}`,1500,4000);
  const arr=v=>Array.isArray(v)?v:v==null?[]:[v];
  return r?{pids:arr(r.pids).map(Number),ports:arr(r.ports).map(Number)}:null;
}
/** Beta 0.43: porte in ascolto di processi avviati dopo `sinceMs` (escluso VARCO stesso). */
async function newPorts(sinceMs,excludePids=[]){
  const r=await ask(`newports ${Math.floor(sinceMs)}`,1500,5000);
  const arr=v=>Array.isArray(v)?v:v==null?[]:[v];
  if(!r)return null;
  const skip=new Set(excludePids.map(Number));
  return {pids:arr(r.pids).map(Number).filter(p=>!skip.has(p)),ports:arr(r.ports).map(Number)};
}
/** Beta 0.43: chi usa una porta (per «la porta 3000 è usata da node.exe»). */
async function portOwner(port){const r=await ask(`portowner ${Number(port)|0}`,1500,3000);return r&&r.pid?{pid:r.pid,name:r.name}:null;}

function stop(){if(child){try{child.stdin.end();child.kill();}catch{}child=null;}}

module.exports={start,query,media,mediaCommand,processPorts,newPorts,portOwner,stop,ask};
