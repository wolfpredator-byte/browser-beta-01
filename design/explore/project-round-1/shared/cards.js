/* Contenuto dei riquadri (Destiny Builder) e loro interazioni, comune alle due varianti.
   Le varianti decidono solo DOVE stanno i riquadri. Lo stato finto va in localStorage
   (in VARCO andrà in <progetto>/.varco/pagina.json, note.md, attivita.json, screenshot/). */
(function(){
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fakeShot=(a,b,c)=>`linear-gradient(160deg,${a} 0%,transparent 55%),radial-gradient(circle at 70% 70%,${b},transparent 60%),${c}`;

  const DEFAULT={
    notes:'Builder: il calcolo delle statistiche dei mod va rifatto quando cambia la stagione.\n\n- Esotiche: manca la colonna «slot».\n- Provare il filtro per classe su Steam Deck.',
    tasks:[
      {t:'Filtro per classe (Titano / Cacciatore / Stregone)',done:true,c:'#5fe0a0'},
      {t:'Import dei loadout da DIM',done:false,c:'#7c6cff'},
      {t:'Correggere NullReference in ArmorSlot.cs',done:false,c:'#ff6b7f'},
      {t:'Icone delle esotiche in 2x',done:false,c:'#6fd3ff'}],
    shots:[fakeShot('#7c6cff55','#6fd3ff44','#141226'),fakeShot('#ff6b7f44','#ffc46b33','#1a1220'),fakeShot('#5fe0a044','#7c6cff33','#0f1a1a')],
    extra:[]
  };

  function load(key){try{const s=JSON.parse(localStorage.getItem(key)||'null');return s&&typeof s==='object'?s:null;}catch{return null;}}
  function save(key,v){try{localStorage.setItem(key,JSON.stringify(v));}catch{}}

  const CARDS={
    status:{k:'Stato del server',w:340,h:256,body:()=>`
      <div class="st-row"><span class="pp-dot err"></span><span class="st-phase">Pronto, con errori</span></div>
      <div class="st-meta"><a class="st-url" href="#">http://localhost:5173</a><span class="pp-pill">rete 192.168.1.20</span><span class="pp-pill">porta 5173</span><span class="pp-pill">PID 18244</span></div>
      <div class="st-err"><b>2 errori · ultimo 14:32</b>Assets/Scripts/ArmorSlot.cs(48,17): NullReferenceException: Object reference not set</div>
      <div class="st-acts"><button class="pp-btn">↻ Riavvia</button><button class="pp-btn">■ Ferma</button><button class="pp-btn">Log</button></div>`},
    actions:{k:'Azioni',w:340,h:190,body:()=>`<div class="acts">
      <button class="act"><i>▶</i><span>Apri anteprima<small>localhost:5173</small></span></button>
      <button class="act"><i>◆</i><span>Unity 2022.3<small>apri il progetto</small></span></button>
      <button class="act"><i>⚒</i><span>Build<small>ultima: ieri 22:10</small></span></button>
      <button class="act"><i>≡</i><span>Log ed errori<small>Editor.log</small></span></button></div>`},
    recent:{k:'File recenti',w:320,h:240,body:()=>`<div class="files">${[
      ['◇','Assets/Scripts/','ArmorSlot.cs','2 min'],['◇','Assets/Scripts/','LoadoutImport.cs','25 min'],
      ['▣','Assets/Scenes/','Builder.unity','1 h'],['▤','Docs/','stagioni.md','ieri'],['▣','Assets/Prefabs/','ExoticCard.prefab','ieri']]
      .map(([i,d,n,t])=>`<div class="file"><span class="ic">${i}</span><span class="p"><span>${d}</span>${n}</span><time>${t}</time></div>`).join('')}</div>`},
    notes:{k:'Note',w:300,h:200,body:s=>`<textarea class="notes" spellcheck="false">${esc(s.notes)}</textarea>`},
    tasks:{k:'Attività',w:330,h:250,count:s=>`${s.tasks.filter(x=>x.done).length}/${s.tasks.length}`,body:s=>`
      <ul class="tasks">${s.tasks.map((x,i)=>`<li class="task${x.done?' done':''}" style="--c:${x.c}" data-i="${i}">
        <input type="checkbox"${x.done?' checked':''}><span>${esc(x.t)}</span><button title="Elimina">✕</button></li>`).join('')}</ul>
      <form class="task-add"><input placeholder="Nuova attività…"><button class="pp-btn">+</button></form>`},
    resources:{k:'Risorse',w:300,h:160,body:()=>`<div class="res">${[
      ['GH','#e9e8f5','GitHub','wolf/destiny-builder'],['U','#a99bff','Unity Docs','2022.3'],
      ['T','#6fd3ff','Trello','Destiny Builder'],['A','#ffc46b','Asset','Asset Store']]
      .map(([b,c,n,s])=>`<a class="re" href="#"><b style="background:${c}">${b}</b><span>${n}<small>${s}</small></span></a>`).join('')}</div>`},
    shots:{k:'Screenshot',w:320,h:190,count:s=>String(s.shots.length),body:s=>`
      <div class="shots">${s.shots.map(u=>`<div class="shot" style="background:${u.startsWith('blob:')||u.startsWith('data:')?`url(${u}) center/cover`:u}"></div>`).join('')}
      <button class="shot-add">+ Carica<input type="file" accept="image/*" multiple hidden></button></div>`},
    note2:{k:'Nota',w:240,h:150,body:()=>`<textarea class="notes" spellcheck="false" placeholder="Scrivi qui…"></textarea>`},
    file:{k:'File',w:260,h:110,body:()=>`<div class="file"><span class="ic">▣</span><span class="p"><span>Assets/Scenes/</span>Builder.unity</span><time>1 h</time></div><div class="st-acts"><button class="pp-btn">Apri</button><button class="pp-btn">Mostra nella cartella</button></div>`},
    build:{k:'Stato della build',w:260,h:130,body:()=>`<div class="st-row"><span class="pp-dot"></span><span class="st-phase">Build riuscita</span></div><div class="st-meta"><span class="pp-pill">Windows x64</span><span class="pp-pill">ieri 22:10</span><span class="pp-pill">412 MB</span></div>`}
  };
  const ADDABLE=[['note2','Nota','testo libero'],['file','File','apri al volo'],['build','Stato della build','ultima build'],['shots','Screenshot','altra galleria']];

  /* Crea il contenuto di un riquadro dentro el e collega le interazioni. onChange() salva. */
  function fill(el,type,state,onChange){
    const def=CARDS[type];
    if(!el.querySelector('.card-h'))el.insertAdjacentHTML('afterbegin',`<div class="card-h"><span class="k">${def.k}</span><span class="n"></span><button class="x" title="Togli il riquadro">✕</button></div><div class="card-b"></div>`);
    const b=el.querySelector('.card-b'),cnt=el.querySelector('.n');
    b.innerHTML=def.body(state);
    const refresh=()=>{fill(el,type,state,onChange);onChange();};
    if(type==='notes'){b.querySelector('textarea').addEventListener('input',e=>{state.notes=e.target.value;onChange();});}
    if(type==='tasks'){
      b.querySelectorAll('.task').forEach(li=>{const i=+li.dataset.i;
        li.querySelector('input').addEventListener('change',e=>{state.tasks[i].done=e.target.checked;refresh();});
        li.querySelector('button').addEventListener('click',()=>{state.tasks.splice(i,1);refresh();});});
      b.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const v=e.target.querySelector('input').value.trim();if(!v)return;
        const cs=['#7c6cff','#6fd3ff','#5fe0a0','#ffc46b'];state.tasks.push({t:v,done:false,c:cs[state.tasks.length%cs.length]});refresh();
        el.querySelector('.task-add input').focus();});
    }
    if(type==='shots'){
      const box=b.querySelector('.shots'),inp=b.querySelector('input[type=file]');
      const add=files=>{[...files].filter(f=>f.type.startsWith('image/')).forEach(f=>{const r=new FileReader();r.onload=()=>{state.shots.push(r.result);refresh();};r.readAsDataURL(f);});};
      b.querySelector('.shot-add').addEventListener('click',()=>inp.click());
      inp.addEventListener('change',()=>add(inp.files));
      box.addEventListener('dragover',e=>{e.preventDefault();box.classList.add('over');});
      box.addEventListener('dragleave',()=>box.classList.remove('over'));
      box.addEventListener('drop',e=>{e.preventDefault();box.classList.remove('over');add(e.dataTransfer.files);});
    }
    if(cnt&&def.count)cnt.textContent=def.count(state);
  }

  /* Indicatore «Salvato in .varco» nella barra in alto. */
  function savedFlash(){const s=document.querySelector('.pp-saved');if(!s)return;s.classList.add('on');clearTimeout(savedFlash.t);savedFlash.t=setTimeout(()=>s.classList.remove('on'),1200);}

  function topBar(view){return `<header class="pp-top">
    <div class="pp-icon">DB</div><div><div class="pp-name">Destiny Builder</div><div class="pp-sub">C:\\Projects\\destiny-builder · Game dev · Unity 2022.3</div></div>
    <span class="pp-pill"><span class="pp-dot err"></span>Pronto · 2 errori</span>
    <span class="pp-spacer"></span><span class="pp-saved">Salvato in .varco</span>
    <div class="pp-seg"><button aria-pressed="${view==='tela'}" data-go="../v1-tela/index.html">Tela</button><button aria-pressed="${view==='bacheca'}" data-go="../v2-bacheca/index.html">Bacheca</button></div>
    <button class="pp-btn" id="add">+ Riquadro</button><button class="pp-btn" id="reset" title="Torna alla disposizione iniziale">↺</button></header>
    <div class="add-menu" id="addMenu">${ADDABLE.map(([t,n,s])=>`<button data-t="${t}">${n}<small>${s}</small></button>`).join('')}</div>`;}

  function wireTop(onAdd,onReset){
    document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{if(b.getAttribute('aria-pressed')!=='true')location.href=b.dataset.go;}));
    const m=document.getElementById('addMenu'),a=document.getElementById('add');
    a.addEventListener('click',e=>{e.stopPropagation();const r=a.getBoundingClientRect();m.style.top=r.bottom+6+'px';m.style.left=Math.min(r.left,innerWidth-220)+'px';m.classList.toggle('on');});
    document.addEventListener('click',()=>m.classList.remove('on'));
    m.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>onAdd(b.dataset.t)));
    document.getElementById('reset').addEventListener('click',onReset);
  }

  window.PP={CARDS,DEFAULT,fill,load,save,savedFlash,topBar,wireTop,clone:o=>JSON.parse(JSON.stringify(o))};
})();
