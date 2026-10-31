'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizePanels,unreadFrom,cleanUrl,MAX_PANELS}=require('../lib/webpanel-rules.cjs');
const {pageBounds,webPanelBounds,GAP}=require('../lib/window-rules.cjs');

test('pannelli web: solo https, id unici, nome dal sito, larghezza nota', ()=>{
  const list=normalizePanels([{id:'a1',url:'web.whatsapp.com'},{id:'a1',url:'https://x.it'},{id:'b2',url:'http://sito.it'},
    {id:'c3',url:'https://open.spotify.com/',title:'  Spotify ',size:'enorme',mobile:true,favicon:'javascript:1'},{id:'NO!',url:'https://y.it'}]);
  assert.deepEqual(list.map(p=>p.id),['a1','c3']);
  assert.equal(list[0].url,'https://web.whatsapp.com/');
  assert.equal(list[0].title,'web.whatsapp.com');
  assert.equal(list[1].title,'Spotify');
  assert.equal(list[1].size,'medio');
  assert.equal(list[1].mobile,true);
  assert.equal(list[1].favicon,'');
  assert.equal(normalizePanels(Array.from({length:20},(_,i)=>({id:'p'+i,url:'https://s'+i+'.it'}))).length,MAX_PANELS);
  assert.equal(cleanUrl('http://localhost:3000'),'http://localhost:3000/');
  assert.equal(cleanUrl('javascript:alert(1)'),'');
});

test('messaggi non letti dal titolo', ()=>{
  assert.equal(unreadFrom('(3) WhatsApp'),3);
  assert.equal(unreadFrom('Inbox (12)'),12);
  assert.equal(unreadFrom('(99+) Discord'),99);
  assert.equal(unreadFrom('Spotify – Web Player'),0);
});

test('il pannello web fa posto a destra, la pagina si restringe', ()=>{
  const content={width:1600,height:900};
  const base={sidebarMode:'compact',sidePanelOpen:false,downloadsOpen:false,fullscreen:false};
  const page=pageBounds(content,base);
  const narrow=pageBounds(content,{...base,webPanelWidth:420});
  assert.equal(page.width-narrow.width,420+GAP);
  const panel=webPanelBounds(content,{...base,webPanelWidth:420});
  assert.equal(panel.x,1600-GAP-420);
  assert.equal(panel.width,420);
  assert.ok(panel.x>=narrow.x+narrow.width,'non si sovrappone alla pagina');
});
