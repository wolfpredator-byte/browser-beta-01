// Visualizzatore di file di VARCO (Beta 0.20). Gira come pagina varco-view://app/viewer.html?p=<percorso>:
// legge le informazioni e i byte del file dallo stesso protocollo, e lo mostra secondo il tipo.
// Le librerie pesanti si caricano solo quando servono (three.js solo per i modelli 3D, ecc.).
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const params=new URLSearchParams(location.search);
const filePath=params.get('p')||'';
const main=$('content');
const TEXT_LIMIT=3*1024*1024;

const size=b=>b>=1073741824?(b/1073741824).toFixed(2)+' GB':b>=1048576?(b/1048576).toFixed(1)+' MB':b>=1024?(b/1024).toFixed(1)+' KB':b+' B';
const loadScript=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Libreria non caricata: '+src));document.head.append(s);});
const loadCss=href=>{const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.append(l);};
let purifier=null;
async function sanitize(html){
  if(!purifier)purifier=(await import('./vendor/dompurify/purify.es.mjs')).default;
  return purifier.sanitize(html,{USE_PROFILES:{html:true}});
}
function fail(message){main.replaceChildren(el('div','message error',message));}
async function bytes(info,limit){
  const r=await fetch(info.url,limit&&info.size>limit?{headers:{Range:`bytes=0-${limit-1}`}}:{});
  if(!r.ok&&r.status!==206)throw new Error(await r.text()||('Errore '+r.status));
  return r.arrayBuffer();
}
async function text(info){
  const buf=await bytes(info,TEXT_LIMIT);
  return {text:new TextDecoder('utf-8',{fatal:false}).decode(buf),cut:info.size>TEXT_LIMIT};
}

// ── Intestazione ────────────────────────────────────────────────────────
function header(info){
  document.title=info.name;
  $('fileName').textContent=info.name;
  const date=new Date(info.modified).toLocaleString('it-IT',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  $('fileMeta').textContent=`${size(info.size)} · modificato il ${date} · ${info.dir}`;
  $('fileMeta').title=info.path;
  $('openExternal').onclick=()=>window.varcoViewer?.openExternal(info.path);
  $('showFolder').onclick=()=>window.varcoViewer?.showInFolder(info.path);
}

// ── Codice e testo ──────────────────────────────────────────────────────
const LANGS={js:'javascript',mjs:'javascript',cjs:'javascript',jsx:'javascript',ts:'typescript',tsx:'typescript',py:'python',pyw:'python',
  cs:'csharp',csproj:'xml',sln:'plaintext',xaml:'xml',xml:'xml',html:'xml',htm:'xml',vue:'xml',svelte:'xml',uxml:'xml',css:'css',uss:'css',
  scss:'scss',sass:'scss',less:'less',json:'json',jsonc:'json',geojson:'json',webmanifest:'json',asmdef:'json',yaml:'yaml',yml:'yaml',
  toml:'ini',ini:'ini',cfg:'ini',conf:'ini',env:'ini',editorconfig:'ini',gitignore:'plaintext',sh:'bash',bash:'bash',ps1:'powershell',
  psm1:'powershell',bat:'dos',cmd:'dos',sql:'sql',java:'java',kt:'kotlin',kts:'kotlin',c:'c',h:'c',cpp:'cpp',cc:'cpp',hpp:'cpp',rs:'rust',
  go:'go',rb:'ruby',php:'php',lua:'lua',swift:'swift',scala:'scala',r:'r',pl:'perl',vb:'vbnet',md:'markdown',markdown:'markdown',
  dockerfile:'dockerfile',makefile:'makefile',graphql:'graphql',gql:'graphql',diff:'diff',patch:'diff',gradle:'gradle',
  shader:'glsl',hlsl:'glsl',glsl:'glsl',compute:'glsl',gd:'python',cmake:'cmake',proto:'protobuf'};
async function highlight(code,ext){
  try{
    if(!window.hljs){loadCss('./vendor/highlight/github-dark.min.css');await loadScript('./vendor/highlight/highlight.min.js');}
    const lang=LANGS[ext];
    if(lang&&lang!=='plaintext'&&window.hljs.getLanguage(lang))return window.hljs.highlight(code,{language:lang,ignoreIllegals:true}).value;
    if(!lang&&code.length<200000)return window.hljs.highlightAuto(code).value;
  }catch{}
  return null;
}
async function showCode(info,{pretty=false}={}){
  let {text:code,cut}=await text(info);
  if(pretty){try{code=JSON.stringify(JSON.parse(code),null,2);}catch{}}
  const lines=code.split('\n');
  const view=el('div','code-view');
  const gutter=el('pre','gutter');gutter.textContent=lines.map((_,i)=>i+1).join('\n');
  const pre=el('pre','code');const codeEl=el('code','hljs');
  const html=await highlight(code,pretty?'json':info.ext);
  if(html!==null)codeEl.innerHTML=html;else codeEl.textContent=code; // innerHTML: escape fatto da highlight.js
  pre.append(codeEl);view.append(gutter,pre);
  const tools=$('tools');
  const wrap=el('button','tool','A capo');wrap.onclick=()=>{view.classList.toggle('wrap');wrap.classList.toggle('on');};
  const copy=el('button','tool','Copia tutto');copy.onclick=async()=>{await navigator.clipboard.writeText(code);copy.textContent='Copiato';setTimeout(()=>copy.textContent='Copia tutto',1500);};
  tools.append(el('span','badge',`${lines.length.toLocaleString('it-IT')} righe`),wrap,copy);
  main.replaceChildren(...(cut?[el('div','message','File grande: mostro i primi 3 MB.')]:[]),view);
}

// ── Markdown ────────────────────────────────────────────────────────────
async function showMarkdown(info){
  const {text:md}=await text(info);
  const {marked}=await import('./vendor/marked/marked.esm.js');
  const article=el('article','markdown');
  article.innerHTML=await sanitize(marked.parse(md,{gfm:true}));
  // Immagini e link relativi: dalla cartella del file.
  for(const img of article.querySelectorAll('img[src]')){const src=img.getAttribute('src');if(!/^[a-z]+:/i.test(src))img.src=new URL(src,info.url).href;}
  for(const a of article.querySelectorAll('a[href]')){
    const href=a.getAttribute('href');
    if(/^https?:/i.test(href))a.target='_blank';
    else if(!href.startsWith('#'))a.removeAttribute('href'); // i link a file locali non si seguono dalla pagina
  }
  main.replaceChildren(article);
  for(const block of article.querySelectorAll('pre code')){
    const lang=(block.className.match(/language-(\w+)/)||[])[1];
    const html=await highlight(block.textContent,lang||'');
    if(html!==null){block.innerHTML=html;block.classList.add('hljs');}
  }
  const raw=el('button','tool','Testo');raw.onclick=()=>{$('tools').replaceChildren();showCode(info);};
  $('tools').append(raw);
}

// ── CSV ─────────────────────────────────────────────────────────────────
function parseCsv(source,delimiter){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(quoted){if(c==='"'){if(source[i+1]==='"'){field+='"';i++;}else quoted=false;}else field+=c;continue;}
    if(c==='"')quoted=true;
    else if(c===delimiter){row.push(field);field='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&source[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field='';if(rows.length>=5001)break;}
    else field+=c;
  }
  if(field||row.length){row.push(field);rows.push(row);}
  return rows;
}
function table(rows,limit=5000){
  const wrap=el('div','table-wrap'),t=el('table','grid');
  const [head,...body]=rows;
  const thead=el('thead'),tr=el('tr');tr.append(el('th','num',''));
  for(const h of head||[])tr.append(el('th','',h));
  thead.append(tr);
  const tbody=el('tbody');
  body.slice(0,limit).forEach((r,i)=>{const row=el('tr');row.append(el('td','num',String(i+1)));for(const c of r)row.append(el('td','',c==null?'':String(c)));tbody.append(row);});
  t.append(thead,tbody);wrap.append(t);
  return wrap;
}
async function showCsv(info){
  const {text:source}=await text(info);
  const first=source.split('\n')[0]||'';
  const delimiter=info.ext==='tsv'?'\t':(first.split(';').length>first.split(',').length?';':',');
  const rows=parseCsv(source,delimiter);
  $('tools').append(el('span','badge',`${Math.max(0,rows.length-1).toLocaleString('it-IT')} righe${rows.length>5000?' (prime 5000)':''}`));
  main.replaceChildren(table(rows));
}

// ── Immagini, video, audio, PDF, font ───────────────────────────────────
function showImage(info){
  const stage=el('div','stage checker'),img=el('img');
  img.src=info.url;img.alt=info.name;
  img.onload=()=>$('tools').prepend(el('span','badge',`${img.naturalWidth} × ${img.naturalHeight}`));
  img.onerror=()=>fail('Immagine non leggibile.');
  img.title='Clic: dimensione reale / adatta';
  img.onclick=()=>stage.classList.toggle('actual');
  stage.append(img);main.replaceChildren(stage);
}
function showMedia(info,tag){
  const stage=el('div','stage media'),media=el(tag);
  media.src=info.url;media.controls=true;media.autoplay=false;
  media.onerror=()=>fail('Formato non supportato da Chromium: prova "Apri con il programma predefinito".');
  stage.append(media);main.replaceChildren(stage);
}
function showPdf(info){
  const frame=el('embed','pdf');frame.type='application/pdf';frame.src=info.url;
  main.replaceChildren(frame);main.classList.add('fill');
}
async function showFont(info){
  const family='varco-font-'+Date.now();
  try{const face=new FontFace(family,`url("${info.url}")`);await face.load();document.fonts.add(face);}
  catch{return fail('Font non leggibile.');}
  const box=el('div','font-preview');box.style.fontFamily=`"${family}"`;
  for(const px of [56,36,24,16,12]){const p=el('p','',px>24?'VARCO · Your space, beyond the web':'Ma la volpe col suo balzo ha raggiunto il quieto Fido. 0123456789 !?&@');p.style.fontSize=px+'px';box.append(p);}
  main.replaceChildren(box);
}

// ── Word, Excel, PowerPoint ─────────────────────────────────────────────
async function showDocx(info){
  await loadScript('./vendor/mammoth/mammoth.browser.min.js');
  const result=await window.mammoth.convertToHtml({arrayBuffer:await bytes(info)});
  const paper=el('article','paper');paper.innerHTML=await sanitize(result.value);
  main.replaceChildren(paper);
  $('tools').append(el('span','badge','Anteprima in sola lettura'));
}
async function showSheet(info){
  await loadScript('./vendor/xlsx/xlsx.full.min.js');
  const book=window.XLSX.read(await bytes(info),{type:'array',cellDates:true});
  const tabs=el('div','sheet-tabs'),holder=el('div','sheet-holder');
  const open=name=>{
    for(const b of tabs.children)b.classList.toggle('on',b.textContent===name);
    const rows=window.XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,raw:false,defval:''});
    const width=Math.max(1,...rows.slice(0,200).map(r=>r.length));
    const letters=i=>{let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;};
    holder.replaceChildren(table([Array.from({length:width},(_,i)=>letters(i)),...rows],3000));
  };
  for(const name of book.SheetNames){const b=el('button','tab',name);b.onclick=()=>open(name);tabs.append(b);}
  main.replaceChildren(tabs,holder);
  open(book.SheetNames[0]);
}
async function showPptx(info){
  const {unzipSync}=await import('./vendor/fflate/browser.js');
  const files=unzipSync(new Uint8Array(await bytes(info)));
  const dec=new TextDecoder();
  const xml=name=>files[name]?new DOMParser().parseFromString(dec.decode(files[name]),'application/xml'):null;
  const slides=Object.keys(files).map(n=>n.match(/^ppt\/slides\/slide(\d+)\.xml$/)).filter(Boolean).sort((a,b)=>a[1]-b[1]);
  const deck=el('div','deck');
  const mime=n=>({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',svg:'image/svg+xml',webp:'image/webp'})[n.split('.').pop().toLowerCase()];
  for(const [name,num] of slides){
    const doc=xml(name);if(!doc)continue;
    const rels={};
    const relDoc=xml(`ppt/slides/_rels/slide${num}.xml.rels`);
    for(const r of relDoc?.getElementsByTagName('Relationship')||[])rels[r.getAttribute('Id')]=r.getAttribute('Target');
    const paragraphs=[...doc.getElementsByTagNameNS('*','p')].map(p=>[...p.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join('')).filter(t=>t.trim());
    const card=el('section','slide');
    card.append(el('span','slide-num',String(num)));
    if(paragraphs[0])card.append(el('h2','',paragraphs[0]));
    if(paragraphs.length>1){const ul=el('ul');for(const p of paragraphs.slice(1,14))ul.append(el('li','',p));card.append(ul);}
    const pics=el('div','slide-pics');
    for(const blip of doc.getElementsByTagNameNS('*','blip')){
      const id=blip.getAttribute('r:embed')||blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed');
      const target=rels[id];if(!target)continue;
      const media='ppt/'+target.replace(/^\.\.\//,'');
      if(files[media]&&mime(media)){const img=el('img');img.src=URL.createObjectURL(new Blob([files[media]],{type:mime(media)}));pics.append(img);}
    }
    if(pics.childElementCount)card.append(pics);
    deck.append(card);
  }
  $('tools').append(el('span','badge',`${slides.length} diapositive · anteprima semplificata`));
  main.replaceChildren(deck);
}

// ── Archivi ZIP ─────────────────────────────────────────────────────────
async function showZip(info){
  if(info.size>500*1048576)return fail('Archivio troppo grande per l’anteprima (oltre 500 MB).');
  const {unzipSync}=await import('./vendor/fflate/browser.js');
  const data=new Uint8Array(await bytes(info));
  const entries=[];
  unzipSync(data,{filter(f){entries.push({name:f.name,size:f.originalSize,packed:f.size});return false;}}); // solo l'elenco
  const files=entries.filter(e=>!e.name.endsWith('/')).sort((a,b)=>a.name.localeCompare(b.name));
  const total=files.reduce((s,e)=>s+e.size,0);
  $('tools').append(el('span','badge',`${files.length} file · ${size(total)} estratti`));
  const layout=el('div','zip'),list=el('div','zip-list'),preview=el('div','zip-preview');
  preview.append(el('p','message','Scegli un file per vederne l’anteprima (testo e immagini).'));
  for(const e of files.slice(0,3000)){
    const row=el('button','zip-row');row.append(el('span','zip-name',e.name),el('span','zip-size',size(e.size)));
    row.onclick=()=>{
      for(const r of list.children)r.classList.remove('on');row.classList.add('on');
      const one=unzipSync(data,{filter:f=>f.name===e.name})[e.name];
      const ext=e.name.split('.').pop().toLowerCase();
      if(['png','jpg','jpeg','gif','webp','svg','bmp'].includes(ext)){
        const img=el('img');img.src=URL.createObjectURL(new Blob([one],{type:ext==='svg'?'image/svg+xml':'image/'+ext}));preview.replaceChildren(img);
      }else if(e.size<2*1048576){
        const pre=el('pre','zip-text');pre.textContent=new TextDecoder().decode(one);preview.replaceChildren(pre);
      }else preview.replaceChildren(el('p','message','File troppo grande per l’anteprima.'));
    };
    list.append(row);
  }
  layout.append(list,preview);main.replaceChildren(layout);
}

// ── Modelli 3D ──────────────────────────────────────────────────────────
async function showModel(info){
  const THREE=await import('three');
  const {OrbitControls}=await import('three/addons/controls/OrbitControls.js');
  const stage=el('div','model');main.replaceChildren(stage);main.classList.add('fill');
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(devicePixelRatio);renderer.outputColorSpace=THREE.SRGBColorSpace;
  stage.append(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,1,0.01,10000);
  scene.add(new THREE.HemisphereLight(0xffffff,0x334466,2.2));
  const sun=new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(3,6,4);scene.add(sun);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
  let model;
  try{
    if(info.ext==='glb'||info.ext==='gltf'){const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');model=(await new GLTFLoader().loadAsync(info.url)).scene;}
    else if(info.ext==='obj'){const {OBJLoader}=await import('three/addons/loaders/OBJLoader.js');model=await new OBJLoader().loadAsync(info.url);}
    else{const {FBXLoader}=await import('three/addons/loaders/FBXLoader.js');model=await new FBXLoader().loadAsync(info.url);}
  }catch(e){return fail('Modello non leggibile: '+(e.message||e)+(String(e).includes('DRACO')?' (compressione Draco non supportata)':''));}
  scene.add(model);
  // Centra il modello e porta la camera a una distanza che lo inquadra tutto.
  const box=new THREE.Box3().setFromObject(model),sizeV=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const radius=Math.max(sizeV.x,sizeV.y,sizeV.z)||1;
  camera.position.set(radius*1.1,radius*0.8,radius*1.4);camera.near=radius/1000;camera.far=radius*100;camera.updateProjectionMatrix();
  const grid=new THREE.GridHelper(radius*2,20,0x6f5ff5,0x2a2850);grid.position.y=-sizeV.y/2;scene.add(grid);
  let meshes=0,triangles=0;
  model.traverse(o=>{if(o.isMesh){meshes++;const g=o.geometry;triangles+=g.index?g.index.count/3:(g.attributes.position?.count||0)/3;}});
  $('tools').append(el('span','badge',`${meshes} mesh · ${Math.round(triangles).toLocaleString('it-IT')} triangoli`),
    Object.assign(el('span','badge','Trascina per ruotare · rotella per lo zoom'),{}));
  const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
  new ResizeObserver(resize).observe(stage);resize();
  renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
}

// ── File sconosciuti: le prime righe in esadecimale ─────────────────────
async function showBinary(info){
  const buf=new Uint8Array(await bytes(info,16384));
  const lines=[];
  for(let i=0;i<buf.length;i+=16){
    const chunk=[...buf.slice(i,i+16)];
    lines.push(i.toString(16).padStart(8,'0')+'  '+chunk.map(b=>b.toString(16).padStart(2,'0')).join(' ').padEnd(48)+'  '+chunk.map(b=>b>31&&b<127?String.fromCharCode(b):'.').join(''));
  }
  main.replaceChildren(el('div','message','Tipo di file senza anteprima: ecco i primi byte. "Apri con il programma predefinito" lo apre nel suo programma.'),
    Object.assign(el('pre','hex'),{textContent:lines.join('\n')}));
}

// ── Avvio ───────────────────────────────────────────────────────────────
(async()=>{
  if(!filePath)return fail('Nessun file indicato.');
  const r=await fetch('info?p='+encodeURIComponent(filePath));
  if(!r.ok)return fail(await r.text()||'File non leggibile.');
  const info=await r.json();
  header(info);
  try{
    const show={code:()=>showCode(info),text:()=>showCode(info),json:()=>showCode(info,{pretty:true}),markdown:()=>showMarkdown(info),
      csv:()=>showCsv(info),image:()=>showImage(info),video:()=>showMedia(info,'video'),audio:()=>showMedia(info,'audio'),
      pdf:()=>showPdf(info),docx:()=>showDocx(info),sheet:()=>showSheet(info),pptx:()=>showPptx(info),zip:()=>showZip(info),
      model:()=>showModel(info),font:()=>showFont(info)}[info.kind]||(()=>showBinary(info));
    await show();
  }catch(e){fail('Non riesco a mostrare il file: '+(e.message||e));}
})();
