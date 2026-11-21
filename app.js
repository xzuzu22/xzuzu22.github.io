import { CFG } from './config.js';

// ---------- Profil (yerel önbellek; veritabanıyla eşitlenir) ----------
const COLORS=['#d63a2a','#2a62d6','#f2c230','#1f9d55','#ffffff','#111111','#ff7a1a','#7b3fd1','#18b6c9','#e64a8f','#7a1f2b','#0e2a5c'];
const NAME_COLORS=['#ffffff','#f2c230','#ff6b5a','#5ab8ff','#6bf28a','#d38bff','#ff9a3d','#7ff4ff'];
const PATTERNS=[['solid','Düz'],['stripes','Çizgili'],['half','Yarım'],['hoop','Bant'],['sash','Kuşak']];
const DEF={name:'',avatar:'10',nameColor:'#ffffff',team:'Antrenman',abbr:'SEN',p:'#d63a2a',s:'#ffffff',pat:'solid',size:1,diff:1,time:180,skin:'classic',ambOn:true,amb:60,cel:'none',cam:1};
const SLOT=(new URLSearchParams(location.search).get('u')||'').replace(/[^a-z0-9]/gi,'').slice(0,8);
let prof={...DEF};
try{const s=JSON.parse(localStorage.getItem('uzk-profile'+SLOT)||'null'); if(s) prof={...DEF,...s};}catch(e){}
const save=()=>{try{localStorage.setItem('uzk-profile'+SLOT,JSON.stringify(prof));}catch(e){}};

// ---------- Ekranlar ----------
const $=id=>document.getElementById(id);
const screens=['gate','main','roomScr','game'];
let curTab='rooms';
function show(id){screens.forEach(s=>$(s).hidden=s!==id);
  if(id==='main')showTab(curTab);
  if(id==='roomScr')renderRoom();
  if(id==='game'){const on=!!(G&&G.net);$('chatBtn').hidden=!on;$('gchat').hidden=!on;if(!on)closeChat();}}
function showTab(t){curTab=t;document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===t)));
  ['rooms','profile','team','league'].forEach(x=>$('tab-'+x).hidden=x!==t);
  if(t==='rooms')renderOnline();if(t==='profile')renderProfile();if(t==='team')renderTeam();if(t==='league')renderLeague();}
function showMain(t){if(t)curTab=t;show('main');}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('meChip').onclick=()=>showTab('profile');

function bindChips(id,key,num=true){
  const box=$(id);
  const sync=()=>box.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',String(String(prof[key])===c.dataset.v)));
  box.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{prof[key]=num?Number(c.dataset.v):c.dataset.v;save();sync();});
  sync();
}
bindChips('optSize','size');bindChips('optDiff','diff');bindChips('optTime','time');bindChips('optSkin','skin',false);
document.querySelectorAll('#hostPanel .htab').forEach(t=>t.onclick=()=>{document.querySelectorAll('#hostPanel .htab').forEach(x=>x.setAttribute('aria-selected',String(x===t)));document.querySelectorAll('#hostPanel .hgroup').forEach(g=>g.hidden=g.dataset.hg!==t.dataset.ht);});bindChips('celChips','cel',false);document.getElementById('celChips').addEventListener('click',()=>{try{pushTag();}catch(e){}});
['optSkin','hsSkin'].forEach(id=>document.getElementById(id)?.addEventListener('click',e=>{const c=e.target.closest('.chip');if(c)skinImg(c.dataset.v);}));
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

// ---------- Renk yardımcıları ----------
function hex2rgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function lum(h){const [r,g,b]=hex2rgb(h);return (0.299*r+0.587*g+0.114*b)/255;}
function cdist(a,b){const x=hex2rgb(a),y=hex2rgb(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2]);}

// ---------- Disk çizimi (oyunda ve önizlemede ortak) ----------
function drawDisc(ctx,x,y,r,kit,text,opts={}){
  ctx.save();
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.closePath();
  ctx.save();ctx.clip();
  ctx.fillStyle=kit.p;ctx.fillRect(x-r,y-r,2*r,2*r);
  ctx.fillStyle=kit.s;
  if(kit.pat==='stripes'){const w=r*0.32;for(let i=-3;i<=3;i+=2)ctx.fillRect(x+i*w-w/2,y-r,w,2*r);}
  else if(kit.pat==='half'){ctx.fillRect(x-r,y-r,r,2*r);}
  else if(kit.pat==='hoop'){ctx.fillRect(x-r,y-r*0.3,2*r,r*0.6);}
  else if(kit.pat==='sash'){ctx.beginPath();ctx.moveTo(x-r,y+r*0.25);ctx.lineTo(x+r*0.25,y-r);ctx.lineTo(x+r*0.75,y-r);ctx.lineTo(x-r,y+r*0.95);ctx.closePath();ctx.fill();}
  ctx.restore();
  ctx.lineWidth=opts.kick?r*0.2:r*0.13;
  ctx.strokeStyle=opts.kick?'#ffffff':'#000000';
  ctx.beginPath();ctx.arc(x,y,r-ctx.lineWidth/2+0.5,0,Math.PI*2);ctx.stroke();
  if(text){
    const base=kit.pat==='half'?kit.p:(kit.pat==='solid'?kit.p:kit.p);
    const light=lum(base)>0.6;
    ctx.font=`800 ${text.length>1?r*0.82:r*1.0}px "Saira Condensed","Arial Narrow",sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.lineWidth=r*0.18;ctx.strokeStyle=light?'rgba(255,255,255,.7)':'rgba(0,0,0,.75)';
    ctx.strokeText(text,x,y+r*0.06);
    ctx.fillStyle=light?'#111':'#fff';ctx.fillText(text,x,y+r*0.06);
  }
  if(opts.name){
    ctx.font=`700 ${r*0.62}px Inter,system-ui,sans-serif`;ctx.textBaseline='top';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.65)';
    const tg=opts.tag?opts.tag+' ':'',wt=ctx.measureText(tg).width,wn=ctx.measureText(opts.name).width,x0=x-(wt+wn)/2;ctx.textAlign='left';
    if(tg){ctx.strokeText(tg,x0,y+r+3);ctx.fillStyle='#f2c230';ctx.fillText(tg,x0,y+r+3);}
    ctx.strokeText(opts.name,x0+wt,y+r+3);ctx.fillStyle=opts.nameColor||'#fff';ctx.fillText(opts.name,x0+wt,y+r+3);
  }
  ctx.restore();
}
const userKit=()=>({p:prof.p,s:prof.s,pat:prof.pat});


// ---------- Ses ----------
let ac=null;
function audio(){try{if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){}}
// bazı sahalarda arka plan ortam sesi (döngü): yağmur, bahçe
const AMB_SRC={rain:['assets/rain-ambience.mp3',0.6],drizzle:['assets/drizzle-ambience.mp3',0.5],sakura:['assets/garden-ambience.mp3',0.5],snow:['assets/wind-ambience.mp3',0.5],beach:['assets/beach-ambience.mp3',0.5]};
const AMB={bufs:{},loading:{},src:null,gain:null,url:''};
function ambWanted(){if(!G||G.ended||G.state==='over'||document.hidden)return 0;const g=document.getElementById('game');if(!g||g.hidden)return 0;const a=AMB_SRC[G.skin];return a?a[1]*ambLevel():0;}
const ambLevel=()=>prof.ambOn===false?0:Math.max(0,Math.min(100,Number(prof.amb??60)))/60;
const hasAmb=()=>!!G&&!!AMB_SRC[G.skin];
async function ambTick(){
  let want=ambWanted();const url=want?AMB_SRC[G.skin][0]:'';
  if(AMB.src&&url!==AMB.url)want=0; // saha değişti: önce eskisini kapat
  if(want&&!AMB.src){
    audio();if(!ac)return;
    if(!AMB.bufs[url]){if(AMB.loading[url])return;AMB.loading[url]=true;try{const r=await fetch(url);AMB.bufs[url]=await ac.decodeAudioData(await r.arrayBuffer());}catch(e){console.warn('ortam sesi yüklenemedi',e);}AMB.loading[url]=false;if(!AMB.bufs[url]||!ambWanted())return;}
    const buf=AMB.bufs[url];AMB.url=url;
    const src=ac.createBufferSource();src.buffer=buf;src.loop=true;src.loopStart=0.06;src.loopEnd=buf.duration-0.06;
    const g=ac.createGain();g.gain.setValueAtTime(0,ac.currentTime);g.gain.linearRampToValueAtTime(want,ac.currentTime+1.5);
    src.connect(g).connect(ac.destination);src.start(0,0.06);AMB.src=src;AMB.gain=g;AMB.vol=want;
  }else if(AMB.src&&!want){
    const src=AMB.src,g=AMB.gain;AMB.src=null;AMB.gain=null;
    try{g.gain.cancelScheduledValues(ac.currentTime);g.gain.setValueAtTime(g.gain.value,ac.currentTime);g.gain.linearRampToValueAtTime(0,ac.currentTime+0.8);src.stop(ac.currentTime+0.9);}catch(e){}
  }else if(AMB.src&&want!==AMB.vol){AMB.vol=want;AMB.gain.gain.linearRampToValueAtTime(want,ac.currentTime+0.6);}
}
setInterval(ambTick,400);document.addEventListener('visibilitychange',ambTick);
function sKick(power=1){if(!ac)return;const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(60,t+0.09);g.gain.setValueAtTime(0.35*power,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.12);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+0.13);}
function sWhistle(len=0.35,times=1){if(!ac)return;for(let i=0;i<times;i++){const t=ac.currentTime+i*(len+0.08),o=ac.createOscillator(),l=ac.createOscillator(),lg=ac.createGain(),g=ac.createGain();o.type='square';o.frequency.value=2900;l.frequency.value=28;lg.gain.value=120;l.connect(lg).connect(o.frequency);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.06,t+0.02);g.gain.setValueAtTime(0.06,t+len-0.04);g.gain.linearRampToValueAtTime(0,t+len);o.connect(g).connect(ac.destination);o.start(t);l.start(t);o.stop(t+len);l.stop(t+len);}}
// gol sesi: kayıttan (assets/goal-sound.mp3); yüklenemezse eski uğultu çalar
const GOALSND={buf:null,loading:false};
function loadGoalSnd(){if(GOALSND.buf||GOALSND.loading||!ac)return;GOALSND.loading=true;fetch('assets/goal-sound.mp3').then(r=>r.arrayBuffer()).then(b=>ac.decodeAudioData(b)).then(b=>{GOALSND.buf=b;}).catch(()=>{}).finally(()=>{GOALSND.loading=false;});}
function sCrowd(){if(!ac)return;loadGoalSnd();
  if(GOALSND.buf){const s=ac.createBufferSource();s.buffer=GOALSND.buf;const g=ac.createGain();g.gain.value=0.9;s.connect(g).connect(ac.destination);s.start();return;}
  sCrowdNoise();}
function sCrowdNoise(){if(!ac)return;const t=ac.currentTime,len=1.6,buf=ac.createBuffer(1,ac.sampleRate*len,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);const s=ac.createBufferSource();s.buffer=buf;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=900;f.Q.value=0.6;const g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.25,t+0.15);g.gain.exponentialRampToValueAtTime(0.001,t+len);s.connect(f).connect(g).connect(ac.destination);s.start(t);}

// ---------- Saha ve fizik ----------
const PR=15,BR=10,POSTR=8;
// Haxball'un varsayılan haritaları: dış sınır (oyuncular), saha (top), kale ağzı yarısı, başlama çemberi
const MAPS={classic:{name:'Classic',bx:420,by:200,fw:370,fh:170,gh:64,kr:75},big:{name:'Big',bx:600,by:270,fw:550,fh:240,gh:80,kr:80},huge:{name:'Huge',bx:750,by:350,fw:700,fh:320,gh:100,kr:80}};
let FW,FH,GH,GD=30,KR,BX,BY,VW,VH,SPAWN;
const posts=[];
function setMap(k){const m=MAPS[k];FW=m.fw;FH=m.fh;GH=m.gh;KR=m.kr;BX=m.bx;BY=m.by;VW=BX;VH=BY;SPAWN=Math.min(400,0.75*FW);
  posts.length=0;for(const sx of[-1,1])for(const sy of[-1,1])posts.push({x:sx*FW,y:sy*GH,r:POSTR,im:0,vx:0,vy:0,team:sx<0?0:1});}
setMap('classic');
window.__uzk={G:()=>G,step:()=>step(),keys:()=>keys};
// Haxball varsayılanları: acceleration .1, kickingAcceleration .07, damping/kickingDamping .96, top damping .99, kickStrength 5
const P_ACC=0.1,P_ACC_K=0.07,P_DAMP=0.96,B_DAMP=0.99,KICK=5;
const DIFF=[{acc:0.82,react:14,noise:0.55,kick:0.25},{acc:0.94,react:7,noise:0.28,kick:0.55},{acc:1.0,react:3,noise:0.12,kick:0.85}];
const BOT_NAMES=['Kaan','Mert','Efe','Arda','Deniz','Barış','Ozan','Emir','Can','Umut'];
let G=null;if(location.hash==="#dbg"){window.__G=()=>G;window.__wx=()=>bolt;window.__amb=()=>AMB;} // yerel test için


// Haxball gibi: herkes kendi yarısında SPAWN çizgisinde, 0, +55, -55, +110 ... dizilir
function formation(n){const ys=[0,55,-55,110,-110];return Array.from({length:n},(_,i)=>[-SPAWN,ys[i]]);}

function mkPlayer(t,i,o){return {x:0,y:0,vx:0,vy:0,r:PR,im:0.5,team:t,idx:i,pid:o.pid||('p'+t+i),human:!!o.human,local:!!o.local,remote:!!o.remote,gk:!!o.gk,
  avatar:o.avatar,name:o.name,nameColor:o.nameColor||'#ffffff',tag:cleanTag(o.tag),cel:cleanCel(o.cel),g:0,a:0,kick:false,armed:true,ix:0,iy:0,tick:Math.floor(Math.random()*10),tx:0,ty:0,wantKick:false};}
function startMatch(opt={}){
  audio();
  const players=[];let size,training=false,kits;
  if(opt.roster){
    setMap(opt.map||'classic');kits=opt.kits;const cnt=[0,0];
    opt.roster.forEach(r=>{const i=cnt[r.team]++;players.push(mkPlayer(r.team,i,r));});
    size=Math.max(cnt[0],cnt[1],1);
    for(const t of[0,1]){const tp=players.filter(p=>p.team===t);if(tp.length>=2){const lb=[...tp].reverse().find(p=>!p.human);if(lb)lb.gk=true;}}
  } else {
    size=opt.size??prof.size;setMap(size<=2?'classic':size<=4?'big':'huge');training=size===0;
    const uk=userKit();
    let rk=opt.rival||null;
    if(!rk){const base=cdist(uk.p,'#2a62d6')<140?{p:'#d63a2a',s:'#ffffff'}:{p:'#2a62d6',s:'#ffffff'};rk={name:'Bot FK',abbr:'BOT',p:base.p,s:base.s,pat:'solid'};}
    else if(cdist(uk.p,rk.p)<110){rk={...rk,p:rk.s,s:rk.p};}
    kits=[{...uk,name:prof.team,abbr:prof.abbr},{...rk}];
    const names=[...BOT_NAMES].sort(()=>Math.random()-0.5);
    for(let t=0;t<2;t++){
      if(training&&t===1)continue;
      formation(training?1:size).forEach((pos,i)=>{
        const human=t===0&&i===0;
        players.push(mkPlayer(t,i,{human,local:human,gk:size>=2&&i===size-1,avatar:human?prof.avatar:String(i+1),name:human?prof.name:names.pop(),nameColor:human?prof.nameColor:'#ffffff',tag:human?myTag():'',cel:human?prof.cel:''}));
      });
    }
    if(training)size=1;
  }
  G={size,training,diff:DIFF[opt.diff??prof.diff],time:opt.time||prof.time,clock:opt.time||prof.time,score:[0,0],kits,
    players,ball:{x:0,y:0,vx:0,vy:0,r:BR,im:1},
    kickoff:true,kickTeam:training?0:(Math.random()<0.5?0:1),state:'play',stateT:0,golden:false,paused:false,opt,
    net:opt.net||null,skin:opt.skin||prof.skin,mapKey:opt.map||'classic',myTeam:opt.myTeam??0,goalLimit:opt.goals||0,kseq:0,gseq:0,lastGoal:-1,gi:-1,ai:-1,t1:null,t2:null,bubbles:{},tick:0};
  CELFX=[];preloadCels();loadGoalSnd();
  resetPositions();
  show('game');$('endOv').hidden=true;$('pauseOv').hidden=true;
  $('againBtn').textContent=G.net?'Odaya dön':'Rövanş';$('endMenu').textContent=G.net?'Odadan çık':'Menü';
  $('resumeBtn').textContent='Devam';$('quitBtn').textContent=G.net?'Maçı bitir, odaya dön':'Maçı bırak';
  resize();renderHud();sWhistle(0.45,1);
  last=performance.now();acc=0;
  if(G.net&&G.net.role==='host')ensureBgTicker();
}
function resetPositions(){
  const f=formation(G.size);
  G.players.forEach(p=>{const s=p.team===0?1:-1;const [fx,fy]=f[p.idx];p.x=fx*s;p.y=fy*s;p.vx=p.vy=0;p.armed=true;});
  G.ball.x=G.ball.y=G.ball.vx=G.ball.vy=0;G.kickoff=true;G.t1=G.t2=null;
}
// topa son dokunan ve ondan önceki: gol ve asist hesabı için
function touch(p){if(G.t1!==p){G.t2=G.t1;G.t1=p;}}

function collide(a,b,bounce){
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),rs=a.r+b.r;
  if(d>=rs||d===0)return false;
  const nx=dx/d,ny=dy/d,pen=rs-d,im=a.im+b.im;if(im===0)return false;
  a.x-=nx*pen*a.im/im;a.y-=ny*pen*a.im/im;b.x+=nx*pen*b.im/im;b.y+=ny*pen*b.im/im;
  const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
  if(rv<0){const j=-(1+bounce)*rv/im;a.vx-=j*nx*a.im;a.vy-=j*ny*a.im;b.vx+=j*nx*b.im;b.vy+=j*ny*b.im;}
  return true;
}
function ballWalls(b){
  // duvar: top 0.5 × duvar 1 = 0.5 sekme; sadece duvara doğru giden hız yansır
  const r=b.r,E=0.5;let hit=false;
  if(Math.abs(b.y)>GH-2){ if(Math.abs(b.x)>FW-r){const s=Math.sign(b.x);b.x=s*(FW-r);if(b.vx*s>0)b.vx*=-E;hit=true;} }
  else if(Math.abs(b.x)>FW-1){
    if(Math.abs(b.y)>GH-r){const s=Math.sign(b.y);b.y=s*(GH-r);if(b.vy*s>0)b.vy*=-0.05;}
    if(Math.abs(b.x)>FW+GD-r){const s=Math.sign(b.x);b.x=s*(FW+GD-r);if(b.vx*s>0)b.vx*=-0.05;}
  }
  if(Math.abs(b.y)>FH-r){const s=Math.sign(b.y);b.y=s*(FH-r);if(b.vy*s>0)b.vy*=-E;hit=true;}
  return hit;
}

// ---------- Girdi ----------
const keys={};
const isTyping=e=>{const t=e.target;return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA');};
addEventListener('keydown',e=>{if(isTyping(e))return;if(e.key==='Enter'&&G&&G.net&&!$('game').hidden){e.preventDefault();openChat();return;}keys[e.code]=true;if(G&&!$('game').hidden&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&G&&!$('game').hidden)togglePause();});
addEventListener('keyup',e=>{if(isTyping(e))return;keys[e.code]=false;});
const joy={id:null,ox:0,oy:0,x:0,y:0};let kickTouch=false;
const gameEl=$('game');
gameEl.addEventListener('pointerdown',e=>{
  audio();
  if(e.target.closest('button'))return;
  if(e.pointerType==='mouse')return;
  if(e.clientX<innerWidth*0.55&&joy.id===null){joy.id=e.pointerId;joy.ox=e.clientX;joy.oy=e.clientY;joy.x=joy.y=0;}
  else if(e.clientX>=innerWidth*0.55){kickTouch=true;e.target.dataset.kp=e.pointerId;}
});
gameEl.addEventListener('pointermove',e=>{if(e.pointerId===joy.id){let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy;const m=Math.hypot(dx,dy),R=50;if(m>R){joy.ox+= (dx/m)*(m-R);joy.oy+=(dy/m)*(m-R);dx=e.clientX-joy.ox;dy=e.clientY-joy.oy;}joy.x=dx/R;joy.y=dy/R;}});
const endPtr=e=>{if(e.pointerId===joy.id){joy.id=null;joy.x=joy.y=0;} if(e.target&&e.target.dataset&&e.target.dataset.kp==String(e.pointerId)){kickTouch=false;delete e.target.dataset.kp;}};
gameEl.addEventListener('pointerup',endPtr);gameEl.addEventListener('pointercancel',endPtr);
const kb=$('kickBtn');
kb.addEventListener('pointerdown',e=>{e.preventDefault();audio();kickTouch=true;kb.classList.add('down');try{kb.setPointerCapture(e.pointerId);}catch(_){}});
const kup=()=>{kickTouch=false;kb.classList.remove('down');};
kb.addEventListener('pointerup',kup);kb.addEventListener('pointercancel',kup);

function humanInput(p){
  let x=0,y=0;
  if(keys.ArrowLeft||keys.KeyA)x-=1;if(keys.ArrowRight||keys.KeyD)x+=1;if(keys.ArrowUp||keys.KeyW)y-=1;if(keys.ArrowDown||keys.KeyS)y+=1;
  if(joy.id!==null){const m=Math.hypot(joy.x,joy.y);if(m>0.18){x=joy.x;y=joy.y;}}
  const m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}
  p.ix=x;p.iy=y;p.kick=!!(keys.Space||keys.KeyX||kickTouch);
}

// ---------- Yapay zekâ ----------
function aiAssign(team){
  const ps=G.players.filter(p=>p.team===team),b=G.ball;
  const d=p=>Math.hypot(p.x-b.x,p.y-b.y);
  const human=ps.find(p=>p.human);
  const field=ps.filter(p=>!p.human&&!p.gk).sort((a,c)=>d(a)-d(c));
  ps.forEach(p=>{if(!p.human)p.role=p.gk?'gk':'sup';});
  if(field.length){ if(!human||d(field[0])<d(human)-10) field[0].role='chase'; }
}
function aiThink(p){
  const D=G.diff,b=G.ball,dir=p.team===0?1:-1;
  p.tick++;
  if(p.tick%D.react===0){
    const ownX=-dir*FW;
    const dGoalBall=Math.hypot(b.x-ownX,b.y);
    let role=p.role;
    if(role==='gk'&&dGoalBall<170)role='chase';
    if(role==='sup'&&G.players.filter(q=>q.team===p.team&&q.role==='chase').length===0)role='chase';
    if(role==='chase'){
      const gx=dir*(FW+10),gy=(Math.random()-0.5)*GH*1.2;
      let ax=gx-b.x,ay=gy-b.y;const am=Math.hypot(ax,ay)||1;ax/=am;ay/=am;
      const n=(Math.random()-0.5)*D.noise,c=Math.cos(n),s=Math.sin(n);[ax,ay]=[ax*c-ay*s,ax*s+ay*c];
      const tbx=b.x-p.x,tby=b.y-p.y;
      const along=tbx*ax+tby*ay;const perp=Math.abs(-tbx*ay+tby*ax);
      const bx=b.x-ax*(PR+BR+3),by=b.y-ay*(PR+BR+3);
      if(along>0&&perp<11){p.tx=b.x+ax*12;p.ty=b.y+ay*12;
        const close=Math.hypot(tbx,tby)<PR+BR+6, distGoal=Math.hypot(gx-b.x,gy-b.y);
        p.wantKick=close&&(distGoal<430||Math.random()<0.08)&&Math.random()<D.kick+0.3;}
      else{ const side=Math.sign(-tbx*ay+tby*ax)||1;
        if(along<=0){p.tx=bx-ay*side*38;p.ty=by+ax*side*38;}else{p.tx=bx;p.ty=by;}
        p.wantKick=false;
        // tehlike: top kendi kalesine yakın ve önündeysek uzaklaştır
        if(dGoalBall<120&&Math.hypot(tbx,tby)<PR+BR+6&&Math.random()<D.kick){p.wantKick=(b.x-p.x)*dir>-4;}
      }
    } else if(role==='gk'){
      p.tx=ownX+dir*28;p.ty=Math.max(-GH+6,Math.min(GH-6,b.y*0.55));p.wantKick=false;
    } else {
      const sp=(p.idx%2?-1:1)*(90+45*Math.floor(p.idx/2));p.tx=Math.max(-FW+30,Math.min(FW-30,b.x-dir*(90+20*p.idx)));p.ty=Math.max(-FH+30,Math.min(FH-30,b.y+sp));p.wantKick=false;
    }
    p.tx=Math.max(-BX+PR,Math.min(BX-PR,p.tx));p.ty=Math.max(-BY+PR,Math.min(BY-PR,p.ty));
  }
  let dx=p.tx-p.x,dy=p.ty-p.y;const m=Math.hypot(dx,dy);
  if(m>4){p.ix=dx/m*D.acc;p.iy=dy/m*D.acc;}else{p.ix=dx/8;p.iy=dy/8;}
  p.kick=p.wantKick&&p.armed;
  if(!p.armed)p.wantKick=false;
}

// ---------- Simülasyon adımı ----------
function step(){
  if(G.state==='goal'){G.stateT--;if(G.stateT<=0){if(G.over){endMatch();return;}resetPositions();G.state='play';$('banner').classList.remove('on');}
    integrate(false);return;}
  if(G.tick%10===0){aiAssign(0);aiAssign(1);}
  G.tick=(G.tick||0)+1;
  const NI=G.net?netHostInputs():null;
  for(const p of G.players){if(p.local)humanInput(p);else if(p.human){const i=NI&&NI[p.pid];if(Array.isArray(i)){p.ix=Math.max(-1,Math.min(1,Number(i[0])/10||0));p.iy=Math.max(-1,Math.min(1,Number(i[1])/10||0));p.kick=!!i[2];}else{p.ix=p.iy=0;p.kick=false;}}else aiThink(p);}
  integrate(true);
  if(!G.kickoff&&!G.golden&&!G.training){G.clock-=1/60;if(G.clock<=0){G.clock=0;if(G.score[0]!==G.score[1]){sWhistle(0.5,3);endMatch();return;}else{G.golden=true;}}}
  if(Math.abs(G.ball.x)>FW+G.ball.r&&Math.abs(G.ball.y)<GH){goal(G.ball.x>0?0:1);}
  if(G.tick%15===0)renderHud();
}
function integrate(live){
  // Haxball sırası: 1) girdi + şut  2) hareket + sürtünme  3) çarpışmalar (önce top)
  const b=G.ball,ps=G.players;
  for(const p of ps){
    if(live){
      const a=p.kick?P_ACC_K:P_ACC;p.vx+=p.ix*a;p.vy+=p.iy*a;
      if(p.kick&&p.armed){
        const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy);
        if(d>0&&d-p.r-b.r<4){b.vx+=dx/d*KICK*b.im;b.vy+=dy/d*KICK*b.im;p.armed=false;G.kickoff=false;sKick(1);G.kseq++;touch(p);}
      }
    }
    if(!p.kick)p.armed=true;
  }
  for(const p of ps){p.x+=p.vx;p.y+=p.vy;p.vx*=P_DAMP;p.vy*=P_DAMP;}
  b.x+=b.vx;b.y+=b.vy;b.vx*=B_DAMP;b.vy*=B_DAMP;
  // sekme katsayısı iki cismin katsayılarının çarpımı: oyuncu 0.5 × top 0.5 = 0.25
  for(const p of ps){if(collide(p,b,0.25)){G.kickoff=false;touch(p);}}
  for(const q of posts){if(collide(q,b,0.25))sKick(0.4);}
  ballWalls(b);
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)collide(ps[i],ps[j],0.25);
  for(const q of posts)for(const p of ps)collide(q,p,0.25);
  for(const p of ps){
    const mx=BX-PR,my=BY-PR;
    if(Math.abs(p.x)>mx){p.x=Math.sign(p.x)*mx;p.vx=0;}if(Math.abs(p.y)>my){p.y=Math.sign(p.y)*my;p.vy=0;}
    if(G.kickoff&&G.state==='play'){
      const s=p.team===0?-1:1;if(p.x*s<p.r-1){p.x=s*(p.r-1);p.vx=0;}
      if(p.team!==G.kickTeam){const d=Math.hypot(p.x,p.y);if(d<KR+p.r){p.x=p.x/d*(KR+p.r);p.y=p.y/d*(KR+p.r);}}
    }
  }
}
function goal(team){
  G.score[team]++;G.state='goal';G.stateT=110;G.kickTeam=G.training?0:1-team;G.gseq++;G.lastGoal=team;
  const sc=G.t1,as=G.t2;G.gi=G.ai=-1;
  if(sc&&sc.team===team){sc.g=(sc.g||0)+1;G.gi=G.players.indexOf(sc);if(as&&as.team===team&&as!==sc){as.a=(as.a||0)+1;G.ai=G.players.indexOf(as);}}
  startCel(G.players[G.gi],team);
  goalBanner((G.training||G.myTeam<0||team===G.myTeam)?'GOL!':'GOL YEDİK',G.gi,G.ai,sc&&sc.team!==team?G.players.indexOf(sc):-1);
  sCrowd();renderHud();
  if(G.golden||(G.goalLimit&&G.score[team]>=G.goalLimit)){G.over=true;}
}
// ---------- Gol sevinçleri (premium efektler) ----------
const CELS={none:'Yok',confetti:'Konfeti',fireworks:'Havai fişek',fire:'Ateş izi',banner:'Altın pankart'};
function cleanCel(c){return typeof c==='string'&&CELS[c]&&c!=='none'?c:'';}
const CEL_IMG={};const celImg=k=>{if(!CEL_IMG[k]){const im=new Image();im.src='assets/cel-'+k+'.webp';CEL_IMG[k]=im;}return CEL_IMG[k];};
const imgOk=im=>im&&im.complete&&im.naturalWidth>0;
let CELFX=[];
function preloadCels(){if(!G)return;const need=new Set(G.players.map(p=>p.cel).filter(Boolean));
  if(need.has('confetti'))celImg('confetti');if(need.has('fireworks')){celImg('firework');celImg('sparks');}if(need.has('fire')){celImg('flame');celImg('sparks');}if(need.has('banner'))celImg('banner');}
function startCel(p,team){
  if(!p||!p.cel||!G)return;const t0=performance.now(),k=p.cel,kit=G.kits[p.team]||{p:'#fff',s:'#fff'};
  if(k==='confetti'){const parts=[];for(let i=0;i<90;i++){const a=Math.random()*Math.PI*2,v=2+Math.random()*6;parts.push({x:p.x,y:p.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,f:i%10,r:Math.random()*6.28,vr:(Math.random()-.5)*0.4,s:9+Math.random()*7,ph:Math.random()*6.28});}
    CELFX.push({k,t0,dur:3200,parts});}
  else if(k==='fireworks'){const sx=team===0?1:-1,bursts=[];for(let i=0;i<6;i++)bursts.push({x:sx*(FW*(0.55+Math.random()*0.35)),y:(Math.random()*2-1)*FH*0.75,d:i*240+Math.random()*120,s:FH*(0.9+Math.random()*0.5),rot:Math.random()*6.28,hue:i});
    CELFX.push({k,t0,dur:2600,bursts});}
  else if(k==='fire'){CELFX.push({k,t0,dur:3500,p,parts:[]});}
  else if(k==='banner'){CELFX.push({k,t0,dur:2800,name:p.name,num:p.avatar,col:kit.p});}
}
const TINTS=[null,'#ff6a4a','#59c3ff','#8cff7a','#ff7ad9'];
function drawCel(layer){
  if(!CELFX.length)return;const now=performance.now();
  CELFX=CELFX.filter(fx=>now-fx.t0<fx.dur);
  for(const fx of CELFX){const t=(now-fx.t0)/1000,life=(now-fx.t0)/fx.dur;
    if(fx.k==='fire'&&layer==='under'){const p=fx.p,fl=celImg('flame'),sp=celImg('sparks');
      if(life<0.85)for(let i=0;i<2;i++)fx.parts.push({x:p.x+(Math.random()-.5)*p.r*1.2,y:p.y+(Math.random()-.5)*p.r*1.2,vx:(Math.random()-.5)*0.6,vy:(Math.random()-.5)*0.6,b:now,sz:p.r*(1.6+Math.random()*0.8),sp:Math.random()<0.25,f:Math.floor(Math.random()*10),rot:Math.random()*6.28});
      fx.parts=fx.parts.filter(q=>now-q.b<650);ctx.save();ctx.globalCompositeOperation='lighter';
      for(const q of fx.parts){const a=1-(now-q.b)/650;q.x+=q.vx;q.y+=q.vy;const sz=q.sz*(q.sp?0.5:0.4+a*0.6);ctx.globalAlpha=a*(q.sp?1:0.85);
        if(q.sp&&imgOk(sp)){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.rot);ctx.drawImage(sp,q.f*64,0,64,64,-sz/2,-sz/2,sz,sz);ctx.restore();}
        else if(imgOk(fl))ctx.drawImage(fl,q.x-sz/2,q.y-sz*0.62,sz,sz);
        else{ctx.fillStyle='rgba(255,140,40,.6)';ctx.beginPath();ctx.arc(q.x,q.y,sz*0.3,0,Math.PI*2);ctx.fill();}}
      ctx.restore();}
    if(layer!=='over')continue;
    if(fx.k==='confetti'){const im=celImg('confetti');const fade=life>0.75?1-(life-0.75)/0.25:1;ctx.save();ctx.globalAlpha=fade;
      for(const q of fx.parts){q.vx*=0.95;q.vy*=0.95;q.x+=q.vx+Math.sin(t*3+q.ph)*0.25;q.y+=q.vy+0.25;q.r+=q.vr;const sq=Math.abs(Math.cos(t*4+q.ph));
        ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.r);ctx.scale(1,0.35+0.65*sq);
        if(imgOk(im))ctx.drawImage(im,q.f*72,0,72,72,-q.s/2,-q.s/2,q.s,q.s);else{ctx.fillStyle=['#e33','#fd3','#39f','#f6c','#fff'][q.f%5];ctx.fillRect(-q.s/3,-q.s/5,q.s*0.66,q.s*0.4);}
        ctx.restore();}
      ctx.restore();}
    else if(fx.k==='fireworks'){const im=celImg('firework');ctx.save();ctx.globalCompositeOperation='lighter';
      for(const b of fx.bursts){const e=(now-fx.t0-b.d)/1000;if(e<0||e>1.3)continue;const grow=1-Math.pow(1-Math.min(1,e/0.45),3),a=e<0.45?1:Math.max(0,1-(e-0.45)/0.85),sz=b.s*(0.25+0.75*grow);
        ctx.globalAlpha=a;ctx.save();ctx.translate(b.x,b.y+e*12);ctx.rotate(b.rot);
        if(imgOk(im))ctx.drawImage(im,-sz/2,-sz/2,sz,sz);else{ctx.strokeStyle='#ffd27a';ctx.beginPath();ctx.arc(0,0,sz/2,0,Math.PI*2);ctx.stroke();}
        const tint=TINTS[b.hue%TINTS.length];if(tint){ctx.globalCompositeOperation='source-atop';}
        ctx.restore();
        if(tint&&e<0.9){const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,sz*0.5);g.addColorStop(0,tint+'66');g.addColorStop(1,tint+'00');ctx.fillStyle=g;ctx.globalAlpha=a*0.9;ctx.beginPath();ctx.arc(b.x,b.y,sz*0.5,0,Math.PI*2);ctx.fill();}
        if(e<0.12){ctx.globalAlpha=(0.12-e)/0.12*0.5;ctx.fillStyle='#fff6dc';ctx.beginPath();ctx.arc(b.x,b.y,sz*0.18,0,Math.PI*2);ctx.fill();}}
      ctx.restore();}
    else if(fx.k==='banner'){const im=celImg('banner');ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
      const W=Math.min(innerWidth*0.62,620),H=W*282/900,cx=innerWidth/2,cy=innerHeight*0.7;
      const pop=t<0.35?1-Math.pow(1-t/0.35,3)*1:1,sc=t<0.35?0.4+0.75*pop-(t>0.25?0.15*(t-0.25)/0.1:0):1,a=life>0.82?1-(life-0.82)/0.18:Math.min(1,t/0.15);
      ctx.globalAlpha=a;ctx.translate(cx,cy);ctx.scale(sc,sc);
      if(imgOk(im))ctx.drawImage(im,-W/2,-H/2,W,H);else{ctx.fillStyle='#d9a93a';ctx.fillRect(-W*0.35,-H*0.2,W*0.7,H*0.4);}
      ctx.textAlign='center';ctx.textBaseline='middle';const fs=Math.round(H*0.22);
      ctx.font=`800 ${fs}px "Saira Condensed",Impact,sans-serif`;const txt=(fx.num?fx.num+' · ':'')+String(fx.name||'').toLocaleUpperCase('tr-TR');
      ctx.fillStyle='rgba(60,35,0,.55)';ctx.fillText(txt,2,-H*0.035+2);ctx.fillStyle='#fffbea';ctx.fillText(txt,0,-H*0.035);
      // parıltı
      const sh=((t*0.9)%1.4)-0.2;ctx.globalCompositeOperation='lighter';const g=ctx.createLinearGradient(-W*0.3+sh*W*0.6-40,0,-W*0.3+sh*W*0.6+40,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,250,220,.35)');g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g;ctx.fillRect(-W*0.33,-H*0.22,W*0.66,H*0.36);ctx.restore();}
  }
}
function goalBanner(txt,gi,ai,og=-1){
  const bn=$('banner');bn.textContent=txt;const P=G.players;let sub='';
  if(P[gi]&&P[gi].cel==='banner')sub='';else if(P[gi])sub=P[gi].name+(P[ai]?' · asist '+P[ai].name:'');else if(P[og])sub='Kendi kalesine: '+P[og].name;
  if(sub){const s=document.createElement('span');s.className='bsub';s.textContent=sub;bn.appendChild(s);}
  bn.classList.add('on');
}
function renderEndStats(){
  const box=$('endStats');box.innerHTML='';if(!G||G.training)return;
  const rows=G.players.filter(p=>p.human||(p.g||0)+(p.a||0)>0).sort((x,y)=>(y.g||0)-(x.g||0)||(y.a||0)-(x.a||0));
  for(const p of rows){const d=document.createElement('div');const n=nickEl(p.tag,p.name+(p.human?'':' (bot)'),p.local?'var(--flood)':p.nameColor,'span');
    const e=document.createElement('em');e.textContent=`${p.g||0} gol · ${p.a||0} asist`;d.append(n,e);box.appendChild(d);}
}
async function recordMyMatch(){
  if(!G||!G.net||G.recorded)return;const me=G.players.find(p=>p.local);if(!me)return;
  if(G.players.filter(p=>p.human).length<2)return; // tek başına botlara karşı maçlar sayılmaz
  G.recorded=true;
  try{await DB.recordMatch(me.g||0,me.a||0,G.score[me.team],G.score[1-me.team],G.mapKey||'classic');}catch(e){console.warn('istatistik kaydedilemedi',e);}
}
function endMatch(){
  G.state='over';$('banner').classList.remove('on');
  if(G.net){netHostPublish();showEnd();return;}
  adAfterMatch();
  const [a,c]=G.score;
  $('endScore').textContent=`${a} – ${c}`;
  $('endLbl').textContent=`${G.kits[0].abbr||'SEN'} · ${G.kits[1].abbr}`;
  $('endMsg').textContent=a>c?'Kazandın. Bir zorluk seviyesi yukarı çıkmayı dene.':a<c?'Bu sefer olmadı. Rövanşta görüşürüz.':'Berabere.';
  renderEndStats();$('endOv').hidden=false;
}
function renderHud(){
  if(!G)return;
  const m=Math.floor(G.clock/60),s=Math.floor(G.clock%60);
  const k=G.kits;
  if(G.training){$('hud').innerHTML=`<span class="kit" style="background:${k[0].p}"></span>ANTRENMAN · GOL ${G.score[0]}<span class="clock">${G.score[1]?'KENDİ KALENE '+G.score[1]:'∞'}</span>`;return;}
  $('hud').innerHTML=`<span class="kit" style="background:${k[0].p}"></span>${esc(k[0].abbr||'SEN')} ${G.score[0]} – ${G.score[1]} ${esc(k[1].abbr)}<span class="kit" style="background:${k[1].p}"></span><span class="clock">${G.golden?'ALTIN GOL':m+':'+String(s).padStart(2,'0')}</span>`;
}

// ---------- Çizim ----------
const cv=$('cv'),ctx=cv.getContext('2d');let scale=1,dpr=1;
function resize(){dpr=Math.min(devicePixelRatio||1,2,Math.sqrt(3.4e6/Math.max(1,innerWidth*innerHeight)));cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;scale=Math.min(innerWidth/(2*VW),(innerHeight-40)/(2*VH));}
addEventListener('resize',()=>{if(G)resize();});
// ---------- Saha görünümleri (premium) ----------
const SKINS={classic:{name:'Klasik',price:''},night:{name:'Gece Işıkları',price:'19,90 TL'},beach:{name:'Plaj',price:'19,90 TL'},snow:{name:'Kar Fırtınası',price:'34,90 TL'},rain:{name:'Sağanak',price:'34,90 TL'},drizzle:{name:'Çisenti',price:'34,90 TL'},sakura:{name:'Kiraz Bahçesi',price:'34,90 TL'}};
const curSkin=()=>{const s=(G&&G.skin)||prof.skin;return SKINS[s]?s:'classic';};
const SKIN_PAL={classic:{bg:'#163019',out:'#2f6630',a:'#3d7c39',b:'#43853f',line:'rgba(243,241,232,.85)'},
  night:{bg:'#050d07',out:'#0b1f10',a:'#143a1a',b:'#18421e',line:'rgba(243,241,232,.72)'},
  snow:{bg:'#5f7f97',out:'#8fa9bd',a:'#2f7a34',b:'#37853b',line:'rgba(255,255,255,.95)'},
  rain:{bg:'#030706',out:'#0a170d',a:'#12321a',b:'#163b1e',line:'rgba(215,228,222,.62)'},
  drizzle:{bg:'#030706',out:'#0a170d',a:'#12321a',b:'#163b1e',line:'rgba(215,228,222,.66)'},
  beach:{bg:'#0e5a78',out:'#d8bd80',a:'#e4cc93',b:'#ebd6a2',line:'rgba(255,255,255,.92)'},
  sakura:{bg:'#24361f',out:'#36522c',a:'#3b6a31',b:'#417336',line:'rgba(240,238,228,.78)'}};
const hash=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
// görsel tabanlı sahalar: çizgileri silinmiş resim, saha dikdörtgeni oyundaki sahaya oturtulur; çizgi ve kaleyi oyun çizer
const SKIN_IMG={sakura:{src:'assets/pitch-sakura.webp',L:400/2576,R:2173/2576,T:206/1438,B:1237/1438},
  snow:{src:'assets/pitch-snow.webp',L:102/1024,R:921/1024,T:54/572,B:530/572},
  rain:{src:'assets/pitch-rain.webp',L:96/1024,R:928/1024,T:33/572,B:540/572}};
SKIN_IMG.drizzle=SKIN_IMG.rain;
// HD görseller yalnızca o saha seçilince indirilir
function skinImg(k){const SI=SKIN_IMG[k];if(!SI)return null;if(!SI.img){const im=new Image();im.decoding='async';im.src=SI.src;SI.img=im;}return SI.img;}
// ---------- Kamera (1-7 tuşları / telefonda kamera düğmesi) ----------
const CAMS={1:'Tüm saha',2:'Top takibi',3:'Oyuncu takibi',4:'Yakın plan',5:'Akıllı kamera',6:'Yayın kamerası',7:'Sinematik'};
const CAM={x:0,y:0,z:1,vx:0,vy:0,mode:0};
const camMode=()=>CAMS[prof.cam]?Number(prof.cam):1;
function camUpdate(){
  if(!G){CAM.x=CAM.y=0;CAM.z=1;return;}
  const m=camMode(),b=G.ball,me=G.players.find(p=>p.local&&p.team>=0)||null,tgt=me||b;
  const bvx=(b.x-(CAM.bx??b.x)),bvy=(b.y-(CAM.by??b.y));CAM.bx=b.x;CAM.by=b.y;
  CAM.vx=CAM.vx*0.9+bvx*0.1;CAM.vy=CAM.vy*0.9+bvy*0.1; // topun yumuşatılmış hızı
  let tx=0,ty=0,tz=1,ease=0.14;
  if(m===2){tx=b.x;ty=b.y;tz=1.55;}
  else if(m===3){tx=tgt.x;ty=tgt.y;tz=1.55;}
  else if(m===4){tx=tgt.x;ty=tgt.y;tz=2.2;}
  else if(m===5){ // oyuncu ve topu birlikte kadraja alır, aralarındaki mesafeye göre yakınlaşır
    tx=tgt.x*0.45+b.x*0.55;ty=tgt.y*0.45+b.y*0.55;
    const dx=Math.abs(tgt.x-b.x)+140,dy=Math.abs(tgt.y-b.y)+110;
    tz=Math.max(1,Math.min(2,Math.min(VW/dx,VH/dy)));ease=0.08;}
  else if(m===6){ // yayın: yatay kaydırma, topun gidişine göre önden bakar
    tx=b.x+CAM.vx*26;ty=b.y*0.3;tz=1.4;ease=0.06;}
  else if(m===7){ // sinematik: kaleye yaklaştıkça yakınlaşır, orta sahada uzaklaşır
    const gd=Math.max(0,1-Math.abs(FW-Math.abs(b.x))/(FW*0.55));
    tx=b.x+CAM.vx*18+Math.sign(b.x)*gd*40;ty=b.y*(0.5+0.4*gd);tz=1.2+0.85*gd*gd;ease=0.045;}
  if(CAM.mode!==m){CAM.mode=m;}
  CAM.z+=(tz-CAM.z)*Math.min(1,ease*0.9);
  // görüş alanını sahanın dışına taşırma
  const hw=innerWidth/(2*scale*CAM.z),hh=(innerHeight-24)/(2*scale*CAM.z);
  const lx=Math.max(0,VW+30-hw),ly=Math.max(0,VH+30-hh);
  tx=Math.max(-lx,Math.min(lx,tx));ty=Math.max(-ly,Math.min(ly,ty));
  CAM.x+=(tx-CAM.x)*ease;CAM.y+=(ty-CAM.y)*ease;
}
// yakın kameralarda kendi oyuncun ekran dışındaysa kenarda yönünü gösteren ok
function drawOffMe(){
  const me=G&&G.players.find(p=>p.local&&p.team>=0);if(!me||CAM.z<1.05)return;
  const z=scale*dpr*CAM.z,sx=cv.width/2+(me.x-CAM.x)*z,sy=cv.height/2+16*dpr+(me.y-CAM.y)*z,m=34*dpr;
  if(sx>m&&sx<cv.width-m&&sy>m+40*dpr&&sy<cv.height-m)return;
  const cx=Math.max(m,Math.min(cv.width-m,sx)),cy=Math.max(m+40*dpr,Math.min(cv.height-m,sy)),a=Math.atan2(sy-cy,sx-cx);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.translate(cx,cy);
  const kit=G.kits[me.team]||{p:'#fff'};ctx.fillStyle=kit.p;ctx.strokeStyle='#fff';ctx.lineWidth=2*dpr;
  ctx.beginPath();ctx.arc(0,0,11*dpr,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.rotate(a);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(19*dpr,0);ctx.lineTo(12*dpr,-6*dpr);ctx.lineTo(12*dpr,6*dpr);ctx.fill();
  ctx.restore();
}
function setCam(m){if(!CAMS[m])return;prof.cam=m;save();const t=$('camToast');if(t){t.textContent=m+' · '+CAMS[m];t.classList.remove('on');void t.offsetWidth;t.classList.add('on');}const bt=$('camBtn');if(bt)bt.textContent='🎥 '+m;}
addEventListener('keydown',e=>{if(isTyping(e)||!G||$('game').hidden)return;const m=/^(Digit|Numpad)([1-7])$/.exec(e.code);if(m){e.preventDefault();setCam(Number(m[2]));}});
function drawField(){
  const sk=curSkin(),P=SKIN_PAL[sk];
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=P.bg;ctx.fillRect(0,0,cv.width,cv.height);
  camUpdate();const z=scale*dpr*CAM.z;
  ctx.setTransform(z,0,0,z,cv.width/2-CAM.x*z,cv.height/2+16*dpr-CAM.y*z);
  const SI=SKIN_IMG[sk];
  const SIm=SI&&skinImg(sk);
  if(SIm&&SIm.complete&&SIm.naturalWidth){const w=2*FW/(SI.R-SI.L),h=2*FH/(SI.B-SI.T);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(SIm,-FW-SI.L*w,-FH-SI.T*h,w,h);return P.line;}
  if(sk==='beach'){ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=6;ctx.strokeRect(-VW-4,-VH-4,2*VW+8,2*VH+8);}
  ctx.fillStyle=P.out;ctx.fillRect(-VW,-VH,2*VW,2*VH);
  const sw=2*FW/10;for(let i=0;i<10;i++){ctx.fillStyle=i%2?P.a:P.b;ctx.fillRect(-FW+i*sw,-FH,sw,2*FH);}
  if(sk==='beach'){for(let i=0;i<120;i++){ctx.fillStyle='rgba(150,110,50,.12)';ctx.beginPath();ctx.arc(-FW+hash(i)*2*FW,-FH+hash(i+50)*2*FH,1.5+hash(i+9)*2,0,Math.PI*2);ctx.fill();}}
  if(sk==='snow'){ // çimde hafif beyazlıklar; çizgiler temiz kalır
    for(let i=0;i<18;i++){ctx.fillStyle='rgba(240,246,250,'+(0.07+hash(i+200)*0.08)+')';ctx.beginPath();ctx.ellipse(-FW*0.85+hash(i+300)*1.7*FW,-FH*0.8+hash(i+400)*1.6*FH,10+hash(i+500)*18,5+hash(i+600)*8,hash(i+700)*3,0,Math.PI*2);ctx.fill();}}
  if(sk==='rain'){ // ıslak zemin: ışık vuran su birikintileri
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<16;i++){const x=-FW*0.85+hash(i+800)*1.7*FW,y=-FH*0.85+hash(i+900)*1.7*FH,r=14+hash(i+950)*30,near=Math.min(1,(Math.abs(x)/FW+Math.abs(y)/FH)/1.4),
      g=ctx.createRadialGradient(x-r*0.2,y-r*0.15,0,x,y,r);g.addColorStop(0,`rgba(190,220,225,${0.05+near*0.16})`);g.addColorStop(0.6,`rgba(120,160,165,${0.03+near*0.06})`);g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,r,r*0.62,hash(i+990)*3,0,Math.PI*2);ctx.fill();}
    ctx.restore();}
  if(sk==='night'){ // saha kenarında projektör direkleri
    const poles=[[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1]];
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(const [px,py] of poles){const lx=px*(FW+20),ly=py*(FH+16),R=px?440:300,gr=ctx.createRadialGradient(lx,ly,0,lx,ly,R);gr.addColorStop(0,'rgba(255,244,214,.34)');gr.addColorStop(.5,'rgba(140,170,140,.08)');gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.fillRect(-VW,-VH,2*VW,2*VH);}
    ctx.restore();
    for(const [px,py] of poles){const lx=px*(FW+20),ly=py*(FH+16);ctx.fillStyle='#1c2420';ctx.beginPath();ctx.arc(lx,ly,7,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.translate(lx,ly);ctx.rotate(Math.atan2(-ly,-lx));ctx.fillStyle='#2b332e';ctx.fillRect(2,-9,8,18);ctx.fillStyle='#fff6da';ctx.shadowColor='#fff3c4';ctx.shadowBlur=14;ctx.fillRect(9,-7,3,14);ctx.restore();}}
  if(sk==='snow')drawSnowBanks();
  if(sk==='sakura')drawSakura();
  if(sk==='rain'){ctx.save();ctx.globalCompositeOperation='lighter';
    for(const [px,py] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const lx=px*(VW+30),ly=py*(VH+30),gr=ctx.createRadialGradient(lx,ly,0,lx,ly,FW*0.75);gr.addColorStop(0,'rgba(210,235,240,.42)');gr.addColorStop(.35,'rgba(150,190,200,.13)');gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.fillRect(-VW,-VH,2*VW,2*VH);}
    ctx.restore();}
  return P.line;
}
// kiraz bahçesi: çakıl yollar, taşlar, bank, köşelerde çiçek açmış ağaçlar, yerde yapraklar
function drawSakura(){
  const ox=VW-FW,oy=VH-FH;
  // çimde güneş huzmesi ve hafif doku
  ctx.save();ctx.globalCompositeOperation='lighter';
  const g=ctx.createLinearGradient(-FW*0.9,-FH,-FW*0.1,FH*0.4);g.addColorStop(0,'rgba(255,240,190,.10)');g.addColorStop(.5,'rgba(255,240,190,.05)');g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-FW*0.95,-VH);ctx.lineTo(-FW*0.55,-VH);ctx.lineTo(-FW*0.05,FH*0.5);ctx.lineTo(-FW*0.45,FH*0.5);ctx.fill();ctx.restore();
  // kalelerin arkasında çakıl yol
  ctx.fillStyle='#7d8178';for(const sx of[-1,1]){ctx.fillRect(sx>0?FW+GD:-VW,-GH-14,ox-GD,2*GH+28);}
  ctx.fillStyle='rgba(255,255,255,.12)';for(let i=0;i<60;i++){const sx=i%2?1:-1;ctx.fillRect(sx*(FW+GD+hash(i)*(ox-GD))-1,-GH-12+hash(i+70)*(2*GH+24),2,2);}
  // yosunlu taşlar ve taş fenerler kenarlarda
  for(let i=0;i<10;i++){const sx=i%2?1:-1,y=(hash(i+120)*2-1)*(FH-20);if(Math.abs(y)<GH+30)continue;const x=sx*(FW+ox*0.55);
    ctx.fillStyle='#5f625c';ctx.beginPath();ctx.ellipse(x,y,9+hash(i+130)*6,7+hash(i+140)*4,hash(i)*3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#5b7f3a';ctx.beginPath();ctx.ellipse(x-2,y-2,6,4,0,0,Math.PI*2);ctx.fill();}
  for(const [x,y] of [[-FW*0.25,-(FH+oy*0.55)],[FW*0.3,FH+oy*0.55]]){ctx.fillStyle='#6d5038';ctx.fillRect(x-22,y-5,44,10);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x-22,y+3,44,2);}
  for(const [x,y] of [[-FW*0.55,-(FH+oy*0.5)],[FW*0.6,FH+oy*0.5],[-(FW+ox*0.5),FH*0.62],[FW+ox*0.5,-FH*0.62]]){ctx.fillStyle='#8d918a';ctx.fillRect(x-7,y-7,14,14);ctx.fillStyle='#5d615a';ctx.fillRect(x-4,y-4,8,8);ctx.fillStyle='rgba(255,220,150,.5)';ctx.fillRect(x-1.5,y-1.5,3,3);}
  // yere düşmüş yapraklar
  for(let i=0;i<Math.round(FW*FH/600);i++){const x=(hash(i+3000)*2-1)*VW,y=(hash(i+3100)*2-1)*VH;ctx.fillStyle=hash(i+3200)<0.25?'rgba(255,245,248,.7)':'rgba(240,170,196,.65)';
    ctx.beginPath();ctx.ellipse(x,y,1.9,1.1,hash(i+3300)*3,0,Math.PI*2);ctx.fill();}
  // ağaçlar: önce gölge, sonra taç
  const trees=[[-1,-1,1],[1,-1,1],[-1,1,1],[1,1,1],[-0.42,-1,0.8],[0.5,-1,0.75],[-0.5,1,0.75],[0.42,1,0.8]].map(([px,py,k],i)=>{
    const corner=Math.abs(px)===1,r=(corner?Math.max(62,FW*0.15):Math.max(40,FW*0.1))*k;return {x:corner?px*(VW-ox*0.3):px*FW,y:corner?py*(VH-oy*0.2):py*(VH+r*0.25),r,i,white:i%3===1};});
  for(const t of trees){const gr=ctx.createRadialGradient(t.x+t.r*0.25,t.y+t.r*0.3,t.r*0.2,t.x+t.r*0.25,t.y+t.r*0.3,t.r*1.25);gr.addColorStop(0,'rgba(0,10,0,.32)');gr.addColorStop(1,'rgba(0,10,0,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(t.x+t.r*0.25,t.y+t.r*0.3,t.r*1.25,0,Math.PI*2);ctx.fill();}
  for(const t of trees){const base=t.white?['#d9c7cd','#eadde1','#f7f0f2','#ffffff']:['#c86a8e','#df86a8','#ee9fbd','#f6b9cf','#fbd3e1'];
    // dallar
    ctx.strokeStyle='#4a3326';ctx.lineCap='round';
    for(let k=0;k<6;k++){const a=hash(t.i*30+k+900)*Math.PI*2;ctx.lineWidth=t.r*0.06;ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(t.x+Math.cos(a)*t.r*0.8,t.y+Math.sin(a)*t.r*0.8);ctx.stroke();}
    // katman katman çiçek kümeleri: koyudan açığa
    for(let layer=0;layer<base.length;layer++){ctx.fillStyle=base[layer];const n=60-layer*8,sh=layer*0.06;
      for(let k=0;k<n;k++){const id=t.i*1000+layer*100+k,a=hash(id)*Math.PI*2,d=Math.sqrt(hash(id+37))*t.r*(1-layer*0.1),rr=t.r*(0.07+hash(id+71)*0.08);
        ctx.beginPath();ctx.arc(t.x+Math.cos(a)*d-t.r*sh,t.y+Math.sin(a)*d-t.r*sh,rr,0,Math.PI*2);ctx.fill();}}
  }
}
// saha çizgilerinin dışında kar yığınları, köşelerde daha fazla; bir kardan adam
function drawSnowBanks(){
  const ox=VW-FW,oy=VH-FH,blob=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();};
  ctx.fillStyle='#c9d8e3';
  let i=0;
  for(let x=-VW;x<=VW;x+=13){i++;const r=oy*0.45+hash(i)*oy*0.35;blob(x,-VH+r*0.3,r+2);blob(x,VH-r*0.3,r+2);}
  for(let y=-VH;y<=VH;y+=13){i++;if(Math.abs(y)<GH+26)continue;const r=ox*0.32+hash(i)*ox*0.22;blob(-VW+r*0.4,y,r+2);blob(VW-r*0.4,y,r+2);}
  ctx.fillStyle='#f4f8fb';i=0;
  for(let x=-VW;x<=VW;x+=13){i++;const r=oy*0.45+hash(i)*oy*0.35;blob(x,-VH+r*0.3,r);blob(x,VH-r*0.3,r);}
  for(let y=-VH;y<=VH;y+=13){i++;if(Math.abs(y)<GH+26)continue;const r=ox*0.32+hash(i)*ox*0.22;blob(-VW+r*0.4,y,r);blob(VW-r*0.4,y,r);}
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])for(let k=0;k<5;k++)blob(sx*(VW-6-hash(k+40)*18),sy*(VH-6-hash(k+50)*14),12+hash(k+60)*10);
  // kardan adam (sol alt köşe, saha dışı)
  const x=-FW-ox*0.5,y=FH-24;
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(x+3,y+14,13,5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffffff';ctx.strokeStyle='#b7c6d1';ctx.lineWidth=1;
  for(const [dy,r] of [[6,11],[-9,8]]){ctx.beginPath();ctx.arc(x,y+dy,r,0,Math.PI*2);ctx.fill();ctx.stroke();}
  ctx.fillStyle='#b73a2e';ctx.fillRect(x-7,y-3,14,3);ctx.fillRect(x+3,y-3,3,8);
  ctx.fillStyle='#2b3d66';ctx.beginPath();ctx.arc(x,y-14,6,Math.PI,0);ctx.fill();ctx.fillRect(x-7,y-14,14,2);
  ctx.fillStyle='#222';ctx.fillRect(x-3,y-11,1.6,1.6);ctx.fillRect(x+1.5,y-11,1.6,1.6);ctx.fillRect(x-0.8,y+3,1.6,1.6);ctx.fillRect(x-0.8,y+7,1.6,1.6);
  ctx.fillStyle='#ee7a1f';ctx.beginPath();ctx.moveTo(x,y-9);ctx.lineTo(x+6,y-8);ctx.lineTo(x,y-7);ctx.fill();
  ctx.strokeStyle='#5a3b22';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x-8,y+3);ctx.lineTo(x-15,y-2);ctx.moveTo(x+8,y+3);ctx.lineTo(x+15,y-3);ctx.stroke();
}
let flakes=null,drops=null,splashes=[],wxKey='',bolt={next:0,t:-1,seq:[]};
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function sThunder(delay){if(!ac)return;const lv=ambLevel();if(!lv)return;const t=ac.currentTime+delay,len=2.8,buf=ac.createBuffer(1,ac.sampleRate*len,ac.sampleRate),d=buf.getChannelData(0);let last=0;
  for(let i=0;i<d.length;i++){last=(last+0.02*(Math.random()*2-1))/1.02;d[i]=last*3.5;}
  const s=ac.createBufferSource();s.buffer=buf;const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=160;const g=ac.createGain();
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.55*Math.min(1.6,lv),t+0.12);g.gain.exponentialRampToValueAtTime(0.001,t+len);s.connect(f).connect(g).connect(ac.destination);s.start(t);}
function drawWeather(){
  const sk=curSkin(),key=sk+VW+'x'+VH;
  if(wxKey!==key){wxKey=key;flakes=drops=null;splashes=[];bolt.next=performance.now()+6000+Math.random()*6000;bolt.t=-1;}
  const t=performance.now()/1000;
  if(sk==='snow'){
    if(!flakes)flakes=Array.from({length:Math.round(VW*VH/1300)},(_,i)=>({x:(hash(i)*2-1)*VW,y:(hash(i+1000)*2-1)*VH,r:0.8+hash(i+2000)*2.2,s:0.22+hash(i+3000)*0.55,ph:hash(i+4000)*6.28}));
    ctx.fillStyle='rgba(255,255,255,.85)';
    for(const f of flakes){f.y+=f.s;f.x+=0.12+Math.sin(t*0.9+f.ph)*0.45;if(f.y>VH+10){f.y=-VH-10;f.x=(Math.random()*2-1)*VW;}if(f.x>VW+10)f.x=-VW-10;if(f.x<-VW-10)f.x=VW+10;
      ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();}
    return;}
  if(sk==='sakura'){
    if(!flakes)flakes=Array.from({length:Math.round(VW*VH/2600)},(_,i)=>({x:(hash(i)*2-1)*VW,y:(hash(i+1000)*2-1)*VH,s:0.35+hash(i+3000)*0.55,ph:hash(i+4000)*6.28,sz:2.2+hash(i+5000)*2.4,w:hash(i+6000)<0.25,k:0.2+hash(i+7000)*1.4,sp:0}));
    // ara ara rüzgâr: bazı yapraklar savrulur, döner
    const gc=t%9,gust=gc<3?Math.sin(gc/3*Math.PI)**2:0;
    for(const f of flakes){f.y+=f.s*(1-gust*0.3*f.k);f.x+=0.35+Math.sin(t*1.1+f.ph)*0.5+gust*f.k*3.2;f.y+=gust*f.k*Math.sin(t*3+f.ph)*0.9;f.sp+=0.02+gust*f.k*0.12;
      if(f.y>VH+10){f.y=-VH-10;f.x=(Math.random()*2-1)*VW;}if(f.x>VW+10){f.x=-VW-10;f.y=(Math.random()*2-1)*VH;}
      const rot=t*1.6+f.ph+f.sp,sq=Math.abs(Math.cos(t*2.2+f.ph+f.sp*1.5));
      ctx.fillStyle='rgba(0,0,0,.12)';ctx.beginPath();ctx.ellipse(f.x+5,f.y+6,f.sz,f.sz*0.55*sq+0.3,rot,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=f.w?'rgba(255,246,249,.95)':'rgba(248,170,198,.95)';ctx.beginPath();ctx.ellipse(f.x,f.y,f.sz,f.sz*0.55*sq+0.3,rot,0,Math.PI*2);ctx.fill();}
    return;}
  if(sk!=='rain'&&sk!=='drizzle')return;
  const heavy=sk==='rain';
  if(!drops)drops=Array.from({length:Math.round(VW*VH/(heavy?430:1300))},(_,i)=>heavy?{x:(hash(i)*2-1)*VW,y:(hash(i+1000)*2-1)*VH,l:10+hash(i+2000)*16,s:10+hash(i+3000)*8,a:0.24+hash(i+4000)*0.36}
    :{x:(hash(i)*2-1)*VW,y:(hash(i+1000)*2-1)*VH,l:3+hash(i+2000)*5,s:4+hash(i+3000)*3,a:0.14+hash(i+4000)*0.22});
  ctx.lineWidth=1;ctx.lineCap='round';
  for(const d of drops){d.y+=d.s;d.x+=d.s*0.12;if(d.y>VH+20){d.y=-VH-20-Math.random()*40;d.x=(Math.random()*2.2-1.1)*VW;}
    ctx.strokeStyle=`rgba(205,225,240,${d.a})`;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-d.l*0.12,d.y-d.l);ctx.stroke();}
  // yere düşen damlaların halkaları
  for(let k=0;k<(heavy?4:(Math.random()<0.5?1:0));k++)splashes.push({x:(Math.random()*2-1)*FW,y:(Math.random()*2-1)*FH,t:0});
  ctx.lineWidth=0.8;
  splashes=splashes.filter(p=>{p.t++;const r=1+p.t*0.45,a=0.32*(1-p.t/22);if(a<=0)return false;ctx.strokeStyle=`rgba(210,232,240,${a})`;ctx.beginPath();ctx.ellipse(p.x,p.y,r,r*0.55,0,0,Math.PI*2);ctx.stroke();return true;});
  // şimşek: arada bir ekran hafifçe aydınlanır
  const now=performance.now();
  if(heavy&&now>bolt.next&&bolt.t<0){bolt.t=now;bolt.seq=[[0,1],[90,0.35],[160,0.8]];bolt.next=now+9000+Math.random()*14000;sThunder(0.4+Math.random()*0.9);}
  if(bolt.t>=0){const dt=now-bolt.t;let a=0;for(const [st,amp] of bolt.seq){const e=dt-st;if(e>=0)a=Math.max(a,amp*Math.exp(-e/(st?140:90)));}
    if(dt>1400)bolt.t=-1;
    a*=reduceMotion?0.12:0.32;
    if(a>0.01){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=`rgba(225,235,255,${a})`;ctx.fillRect(0,0,cv.width,cv.height);ctx.restore();}}
}
function draw(){
  ctx.strokeStyle=drawField();ctx.lineWidth=3;
  ctx.strokeRect(-FW,-FH,2*FW,2*FH);
  ctx.beginPath();ctx.moveTo(0,-FH);ctx.lineTo(0,FH);ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,KR,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='rgba(243,241,232,.85)';ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();
  // kaleler
  for(const s of[-1,1]){
    const x0=s*FW,x1=s*(FW+GD);
    ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(Math.min(x0,x1),-GH,GD,2*GH);
    ctx.strokeStyle='rgba(243,241,232,.25)';ctx.lineWidth=1;
    for(let y=-GH;y<=GH;y+=10){ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();}
    for(let k=0;k<=GD;k+=10){ctx.beginPath();ctx.moveTo(x0+s*k,-GH);ctx.lineTo(x0+s*k,GH);ctx.stroke();}
    ctx.strokeStyle='#f3f1e8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x0,-GH);ctx.lineTo(x1,-GH);ctx.lineTo(x1,GH);ctx.lineTo(x0,GH);ctx.stroke();
  }
  for(const q of posts){ctx.fillStyle=G.kits[q.team].p;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,Math.PI*2);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#000';ctx.stroke();}
  drawCel('under');
  // oyuncular
  for(const p of G.players){
    if(p.local){ctx.strokeStyle='rgba(242,194,48,.9)';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(p.x,p.y,p.r+6,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    drawDisc(ctx,p.x,p.y,p.r,G.kits[p.team],p.avatar,{kick:p.kick,name:p.name,nameColor:p.nameColor,tag:p.tag});
  }
  const b=G.ball;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#000';ctx.stroke();
  drawWeather();
  drawCel('over');
  drawOffMe();
  drawBubbles();
  if(G.paused&&G.net){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,innerWidth,innerHeight);ctx.fillStyle='#f2c230';ctx.font='800 42px "Saira Condensed",sans-serif';ctx.textAlign='center';ctx.fillText('DURAKLATILDI',innerWidth/2,innerHeight/2);}
  // joystick
  if(joy.id!==null){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(joy.ox,joy.oy,50,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(joy.ox+joy.x*50,joy.oy+joy.y*50,22,0,Math.PI*2);ctx.fill();}
}

let last=performance.now(),acc=0;
// Oda sahibinin sekmesi arka plana geçince requestAnimationFrame durur; maç bir Worker zamanlayıcısıyla sürer.
let bgWorker=null;
function ensureBgTicker(){
  if(bgWorker)return;
  try{bgWorker=new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),16)'],{type:'text/javascript'})));
    bgWorker.onmessage=()=>{if(!document.hidden||!G||!G.net||G.net.role!=='host')return;
      const t=performance.now(),dt=Math.min(0.1,(t-last)/1000);last=t;
      if(!G.paused&&G.state!=='over'){acc+=dt;while(acc>=1/60){step();acc-=1/60;if(!G||G.state==='over')break;}}
      if(G)netHostPublish();};}catch(e){}
}
function loop(t){
  requestAnimationFrame(loop);
  if(!G){last=t;return;}
  const dt=Math.min(0.1,(t-last)/1000);last=t;
  if(G.net&&G.net.role==='client'){if(!$('game').hidden){clientFrame();if(G)draw();}return;}
  const host=G.net&&G.net.role==='host';
  if($('game').hidden&&!host)return;
  if(!G.paused&&G.state!=='over'){acc+=dt;while(acc>=1/60){step();acc-=1/60;if(!G||G.state==='over')break;}}
  if(host&&G)netHostPublish();
  if(G&&!$('game').hidden)draw();
}
requestAnimationFrame(loop);

// ---------- Oyun düğmeleri ----------
function togglePause(){if(!G||G.state==='over')return;if(G.net&&G.net.role==='client'){$('resumeBtn').textContent='Oyuna dön';$('quitBtn').textContent='Oda ekranına git';$('pauseOv').hidden=!$('pauseOv').hidden;return;}G.paused=!G.paused;$('pauseOv').hidden=!G.paused;}
$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=()=>{if(G&&G.net&&G.net.role==='client'){$('pauseOv').hidden=true;return;}togglePause();};
$('quitBtn').onclick=()=>{if(G&&G.net){$('pauseOv').hidden=true;if(G.net.role==='host'){G.paused=false;hostBackToRoom();}else show('roomScr');return;}G=null;showMain('rooms');};
$('endMenu').onclick=()=>{if(G&&G.net){if(G.net.role==='host')hostBackToRoom();G=null;leaveRoom(false);return;}G=null;showMain('rooms');};
$('againBtn').onclick=()=>{if(G&&G.net){if(G.net.role==='host')hostBackToRoom();else{G=null;show('roomScr');}return;}startMatch(G?G.opt:{});};
$('playBtn').onclick=()=>startMatch({});
$('rotateOk').onclick=()=>{$('rotate').style.display='none';};
// ortam sesi: aç/kapa ve ses yüksekliği (yağmurlu sahalarda görünür)
function syncAmbUI(){const b=$('ambBtn');if(!b)return;b.hidden=!hasAmb();const on=prof.ambOn!==false&&Number(prof.amb??60)>0;b.textContent=on?'🔊 Ortam':'🔇 Ortam';
  $('ambOn').checked=prof.ambOn!==false;$('ambVol').value=prof.amb??60;$('ambVolTxt').textContent='%'+($('ambVol').value);}
$('ambBtn').onclick=()=>{$('ambPanel').hidden=!$('ambPanel').hidden;syncAmbUI();};
$('ambOn').onchange=e=>{prof.ambOn=e.target.checked;save();syncAmbUI();ambTick();};
$('ambVol').onchange=e=>e.target.blur();
$('ambVol').oninput=e=>{prof.amb=Number(e.target.value);if(prof.amb>0&&prof.ambOn===false)prof.ambOn=true;save();syncAmbUI();ambTick();};
setInterval(()=>{const b=$('ambBtn');if(b&&b.hidden===hasAmb())syncAmbUI();if(!hasAmb())$('ambPanel').hidden=true;},500);
$('camBtn').onclick=()=>setCam(camMode()%7+1);$('camBtn').textContent='🎥 '+camMode();
$('fsBtn').onclick=async()=>{try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen();try{await screen.orientation.lock('landscape');}catch(e){}}else await document.exitFullscreen();}catch(e){$('fsBtn').textContent='Tam ekran yok';}};


// =====================================================================
// ---------- Arka uç: Supabase (canlı) ya da yerel deneme ----------
// =====================================================================
const LIVE=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey);
const TAB=Math.random().toString(36).slice(2,10);
let sb=null,uid=null,isAnon=true,userEmail='';
const cleanStr=(s,n)=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f]/g,'').slice(0,n);
const cleanCol=c=>/^#[0-9a-f]{6}$/i.test(c)?c:'#ffffff';
const cleanKit=k=>({p:cleanCol(k&&k.p),s:cleanCol(k&&k.s),pat:PATTERNS.some(x=>x[0]===(k&&k.pat))?k.pat:'solid'});

async function backendInit(){
  if(LIVE){
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
    sb=createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{realtime:{params:{eventsPerSecond:40}}});
    let {data:{session}}=await sb.auth.getSession();
    if(!session){const r=await sb.auth.signInAnonymously();if(r.error)throw r.error;session=r.data.session;}
    uid=session.user.id;isAnon=!!session.user.is_anonymous;userEmail=session.user.email||'';
  } else {
    try{uid=localStorage.getItem('uzk-uid'+SLOT);}catch(e){}
    if(!uid){uid='u'+Math.random().toString(36).slice(2,10);try{localStorage.setItem('uzk-uid'+SLOT,uid);}catch(e){}}
  }
}
async function googleSignIn(){
  if(!LIVE){alertMsg('Google girişi canlı sitede çalışır.');return;}
  const opts={provider:'google',options:{redirectTo:location.origin+location.pathname}};
  const r=isAnon&&uid?await sb.auth.linkIdentity(opts):await sb.auth.signInWithOAuth(opts);
  if(r.error)alertMsg(/provider is not enabled|Unsupported provider|not enabled/i.test(r.error.message)?'Google girişi henüz açılmadı. Şimdilik nick ile devam et.':'Google bağlantısı başarısız: '+r.error.message);
}
function alertMsg(t){const el=curTab&&!$('main').hidden?$('netMsg'):$('gateMsg');if(el)el.textContent=t;}

// ---------- Veritabanı (profil, takım, lig) ----------
const MOCKDB={load(){try{return JSON.parse(localStorage.getItem('uzk-db')||'')||null;}catch(e){return null;}},
  get(){return this.load()||{profiles:{},teams:{},members:[]};},put(d){try{localStorage.setItem('uzk-db',JSON.stringify(d));}catch(e){}}};
const rcode=()=>Math.random().toString(36).slice(2,8);
const DB={
  async getProfile(){
    if(!LIVE){const d=MOCKDB.get();return d.profiles[uid]||null;}
    const {data,error}=await sb.from('profiles').select('nick,avatar,name_color').eq('id',uid).maybeSingle();if(error)throw error;return data;},
  async saveProfile(){
    const row={nick:cleanStr(prof.name,14)||'Oyuncu',avatar:cleanStr(prof.avatar,2)||'10',name_color:cleanCol(prof.nameColor)};
    if(!LIVE){const d=MOCKDB.get();d.profiles[uid]={...row};MOCKDB.put(d);return;}
    const {error}=await sb.from('profiles').upsert({id:uid,...row,updated_at:new Date().toISOString()});if(error)throw error;},
  async myTeam(){
    if(!LIVE){const d=MOCKDB.get();const m=d.members.find(m=>m.user_id===uid);return m?{role:m.role,team:d.teams[m.team_id]}:null;}
    const {data,error}=await sb.from('team_members').select('role,teams(id,name,abbr,kit,tier,points,played,won,drawn,lost,gf,ga,owner)').eq('user_id',uid).maybeSingle();
    if(error)throw error;return data&&data.teams?{role:data.role,team:data.teams}:null;},
  async teams(){
    if(!LIVE){return Object.values(MOCKDB.get().teams);}
    const {data,error}=await sb.from('teams').select('id,name,abbr,kit,tier,points,played,won,drawn,lost,gf,ga').order('tier').order('points',{ascending:false}).limit(600);if(error)throw error;return data;},
  async members(teamId){
    if(!LIVE){const d=MOCKDB.get();return d.members.filter(m=>m.team_id===teamId).map(m=>({...m,...(d.profiles[m.user_id]||{nick:'?'})}));}
    const {data,error}=await sb.from('team_members').select('user_id,role,joined_at').eq('team_id',teamId).order('joined_at');if(error)throw error;
    const ids=data.map(m=>m.user_id);let ps=[];if(ids.length){const r=await sb.from('profiles').select('id,nick,avatar,name_color').in('id',ids);ps=r.data||[];}
    return data.map(m=>({...m,...(ps.find(p=>p.id===m.user_id)||{nick:'?'})}));},
  async createTeam(name,abbr,kit){
    if(!LIVE){const d=MOCKDB.get();if(d.members.some(m=>m.user_id===uid))throw new Error('Zaten bir takımdasın.');
      if(Object.values(d.teams).some(t=>t.name.toLowerCase()===name.toLowerCase()))throw new Error('Bu isimde bir takım var.');
      const id='t'+rcode();d.teams[id]={id,name,abbr,kit,tier:6,points:0,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,owner:uid,join_code:rcode()};
      d.members.push({team_id:id,user_id:uid,role:'kaptan',joined_at:Date.now()});MOCKDB.put(d);return id;}
    const {data,error}=await sb.rpc('create_team',{p_name:name,p_abbr:abbr,p_kit:kit});if(error)throw error;return data;},
  async joinTeam(code){
    if(!LIVE){const d=MOCKDB.get();const t=Object.values(d.teams).find(t=>t.join_code===code);if(!t)throw new Error('Bu kodla bir takım yok.');
      if(d.members.some(m=>m.user_id===uid))throw new Error('Zaten bir takımdasın.');d.members.push({team_id:t.id,user_id:uid,role:'oyuncu',joined_at:Date.now()});MOCKDB.put(d);return t.id;}
    const {data,error}=await sb.rpc('join_team',{p_code:code});if(error)throw error;return data;},
  async leaveTeam(){
    if(!LIVE){const d=MOCKDB.get();const m=d.members.find(m=>m.user_id===uid);if(!m)return;d.members=d.members.filter(x=>x!==m);
      const rest=d.members.filter(x=>x.team_id===m.team_id);if(!rest.length)delete d.teams[m.team_id];else if(m.role==='kaptan'){rest[0].role='kaptan';d.teams[m.team_id].owner=rest[0].user_id;}MOCKDB.put(d);return;}
    const {error}=await sb.rpc('leave_team');if(error)throw error;},
  async kick(teamId,userId){
    if(!LIVE){const d=MOCKDB.get();d.members=d.members.filter(m=>!(m.team_id===teamId&&m.user_id===userId));MOCKDB.put(d);return;}
    const {error}=await sb.from('team_members').delete().eq('team_id',teamId).eq('user_id',userId);if(error)throw error;},
  async teamCode(teamId){
    if(!LIVE){return MOCKDB.get().teams[teamId]?.join_code||'';}
    const {data,error}=await sb.rpc('team_code',{p_team:teamId});if(error)throw error;return data;},
  async recordMatch(goals,assists,gf,ga,map){
    if(!LIVE){const d=MOCKDB.get();(d.matches=d.matches||[]).push({user_id:uid,played_at:new Date().toISOString(),goals,assists,gf,ga,result:gf>ga?'W':gf===ga?'D':'L',map});MOCKDB.put(d);return;}
    const {error}=await sb.rpc('record_match',{p_goals:goals,p_assists:assists,p_gf:gf,p_ga:ga,p_map:map});if(error)throw error;},
  async playerSummary(u){
    if(!LIVE){const d=MOCKDB.get();const ms=(d.matches||[]).filter(m=>m.user_id===u).reverse();
      return {played:ms.length,goals:ms.reduce((s,m)=>s+m.goals,0),assists:ms.reduce((s,m)=>s+m.assists,0),won:ms.filter(m=>m.result==='W').length,last:ms.slice(0,10)};}
    const {data,error}=await sb.rpc('player_summary',{p_user:u});if(error)throw error;return data;},
  async updateKit(teamId,kit){
    if(!LIVE){const d=MOCKDB.get();if(d.teams[teamId])d.teams[teamId].kit=kit;MOCKDB.put(d);return;}
    const {error}=await sb.from('teams').update({kit}).eq('id',teamId);if(error)throw error;},
};
const errText=e=>{const m=(e&&(e.message||e.error_description))||String(e);
  if(/duplicate key|unique/i.test(m))return 'Bu isimde bir takım zaten var.';
  if(/already in a team|zaten/i.test(m))return 'Zaten bir takımdasın.';
  if(/team is full/i.test(m))return 'Takım dolu (en fazla 12 kişi).';
  if(/no team with this code/i.test(m))return 'Bu kodla bir takım yok.';
  if(/fetch|network/i.test(m))return 'Sunucuya ulaşılamadı. Bağlantını kontrol et.';
  return m;};

// =====================================================================
// ---------- Canlı kanal: presence + yayın (aynı arayüz, iki uygulama) ----------
// =====================================================================
function makeRoomSB(name){
  const ch=sb.channel(name,{config:{presence:{key:TAB},broadcast:{self:false}}});
  let mine={},hs=new Set(),evs={},cached=Object.freeze([]),subscribed=false,timer=null,lastSent='';
  const selfEntry=()=>Object.freeze({peer:TAB,sameTab:true,isMe:true,kind:'viewer',presence:Object.freeze(JSON.parse(JSON.stringify(mine)))});
  const fire=()=>hs.forEach(h=>{try{h({peers:cached});}catch(e){console.error(e);}});
  const rebuild=()=>{const st=ch.presenceState();const arr=[];
    for(const k in st){if(k===TAB)continue;const metas=st[k];const m=metas&&metas[metas.length-1];if(!m)continue;const {presence_ref,...p}=m;
      arr.push(Object.freeze({peer:k,sameTab:false,isMe:false,kind:'viewer',presence:Object.freeze(p)}));}
    arr.push(selfEntry());cached=Object.freeze(arr);fire();};
  ch.on('presence',{event:'sync'},rebuild);
  for(const ev of ['sig','g','in'])ch.on('broadcast',{event:ev},({payload})=>{const f=evs[ev];if(f)f(payload);});
  const flush=()=>{timer=null;if(!subscribed)return;const s=JSON.stringify(mine);if(s===lastSent)return;lastSent=s;ch.track(mine).catch(()=>{});};
  const api={name,
    presence(patch){for(const k in patch){if(patch[k]===null)delete mine[k];else mine[k]=patch[k];}
      cached=Object.freeze(cached.filter(p=>!p.sameTab).concat([selfEntry()]));fire();
      if(!timer)timer=setTimeout(flush,100);return Promise.resolve();},
    peers:()=>cached,
    onPeers(h){hs.add(h);setTimeout(()=>h({peers:cached}));return()=>hs.delete(h);},
    on(ev,fn){evs[ev]=fn;},
    send(ev,payload){if(!subscribed)return;ch.send({type:'broadcast',event:ev,payload}).catch(()=>{});},
    leave(){subscribed=false;try{ch.untrack();}catch(e){}return sb.removeChannel(ch);},
    ready:null};
  api.ready=new Promise(res=>{let done=false;ch.subscribe(st=>{
    if(st==='SUBSCRIBED'){subscribed=true;lastSent='';flush();if(!done){done=true;res(true);}}
    else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'||st==='CLOSED'){if(!done){done=true;res(false);}}});
    setTimeout(()=>{if(!done){done=true;res(false);}},12000);});
  return api;
}
// Yerel deneme: aynı tarayıcının sekmeleri arasında BroadcastChannel
function makeRoomBC(name){
  const bc=new BroadcastChannel('uzk-'+name),peers=new Map(),hs=new Set(),evs={};let mine={},cached=null,pend=false,closed=false;
  const snap=()=>Object.freeze([...peers.entries()].map(([peer,v])=>Object.freeze({peer,isMe:peer===TAB,sameTab:peer===TAB,kind:'viewer',presence:v})));
  const notify=()=>{cached=snap();hs.forEach(h=>{try{h({peers:cached});}catch(e){console.error(e);}});};
  peers.set(TAB,Object.freeze({}));
  bc.onmessage=e=>{const m=e.data;if(closed)return;
    if(m.t==='p'){const was=peers.has(m.peer);peers.set(m.peer,Object.freeze(m.p));notify();if(!was)bc.postMessage({t:'p',peer:TAB,p:mine});}
    else if(m.t==='bye'){peers.delete(m.peer);notify();}
    else if(m.t==='hi'){bc.postMessage({t:'p',peer:TAB,p:mine});}
    else if(m.t==='ev'){const f=evs[m.ev];if(f)f(m.d);}};
  bc.postMessage({t:'hi'});
  addEventListener('beforeunload',()=>{try{bc.postMessage({t:'bye',peer:TAB});}catch(e){}});
  return {name,ready:Promise.resolve(true),
    presence(patch){for(const k in patch){if(patch[k]===null)delete mine[k];else mine[k]=patch[k];}mine={...mine};peers.set(TAB,Object.freeze(JSON.parse(JSON.stringify(mine))));
      notify();if(!pend){pend=true;setTimeout(()=>{pend=false;if(!closed)bc.postMessage({t:'p',peer:TAB,p:mine});},60);}return Promise.resolve();},
    peers(){return cached||(cached=snap());},
    onPeers(h){hs.add(h);setTimeout(()=>h({peers:this.peers()}),0);return()=>hs.delete(h);},
    on(ev,fn){evs[ev]=fn;},
    send(ev,d){if(!closed)bc.postMessage({t:'ev',ev,d});},
    leave(){closed=true;try{bc.postMessage({t:'bye',peer:TAB});bc.close();}catch(e){}return Promise.resolve();}};
}
const makeRoom=name=>LIVE?makeRoomSB(name):makeRoomBC(name);

// =====================================================================
// ---------- Oyuncudan oyuncuya bağlantı (WebRTC), yedek: kanal yayını ----------
// =====================================================================
const ICE=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun.cloudflare.com:3478']}];
const RTC={pcs:new Map(),dcs:new Map(),pend:new Map()};
function rtcReset(){for(const pc of RTC.pcs.values()){try{pc.close();}catch(e){}}RTC.pcs.clear();RTC.dcs.clear();RTC.pend.clear();}
function rtcDrop(peer){const pc=RTC.pcs.get(peer);if(pc){try{pc.close();}catch(e){}}RTC.pcs.delete(peer);RTC.dcs.delete(peer);RTC.pend.delete(peer);}
function rtcSetupDc(peer,dc){
  dc.onopen=()=>{RTC.dcs.set(peer,dc);schedule(renderRoom);};
  dc.onclose=()=>{RTC.dcs.delete(peer);schedule(renderRoom);};
  dc.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(_){return;}
    if(NET.isHost){if(Array.isArray(m.in))NET.inputs[peer]=m.in;}
    else if(m.g)acceptSnap(m.g);};
}
function rtcHostEnsure(peer){ // oda sahibi her oyuncuya bağlantı teklif eder
  if(RTC.pcs.has(peer)||typeof RTCPeerConnection==='undefined')return;
  const pc=new RTCPeerConnection({iceServers:ICE});RTC.pcs.set(peer,pc);
  rtcSetupDc(peer,pc.createDataChannel('g',{ordered:false,maxRetransmits:0}));
  pc.onicecandidate=e=>{if(e.candidate&&NET.room)NET.room.send('sig',{to:peer,from:TAB,c:e.candidate.toJSON()});};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'||pc.connectionState==='closed'){rtcDrop(peer);schedule(renderRoom);}};
  pc.createOffer().then(o=>pc.setLocalDescription(o)).then(()=>{if(NET.room)NET.room.send('sig',{to:peer,from:TAB,sdp:pc.localDescription.toJSON()});}).catch(()=>rtcDrop(peer));
}
async function rtcOnSignal(m){
  if(!m||m.to!==TAB||typeof m.from!=='string'||typeof RTCPeerConnection==='undefined')return;
  const peer=m.from;
  try{
    if(m.sdp&&m.sdp.type==='offer'){ // istemci: oda sahibinden teklif
      rtcDrop(peer);const pc=new RTCPeerConnection({iceServers:ICE});RTC.pcs.set(peer,pc);
      pc.ondatachannel=e=>rtcSetupDc(peer,e.channel);
      pc.onicecandidate=e=>{if(e.candidate&&NET.room)NET.room.send('sig',{to:peer,from:TAB,c:e.candidate.toJSON()});};
      await pc.setRemoteDescription(m.sdp);for(const c of RTC.pend.get(peer)||[])await pc.addIceCandidate(c).catch(()=>{});RTC.pend.delete(peer);
      const a=await pc.createAnswer();await pc.setLocalDescription(a);NET.room.send('sig',{to:peer,from:TAB,sdp:pc.localDescription.toJSON()});
    } else if(m.sdp&&m.sdp.type==='answer'){const pc=RTC.pcs.get(peer);if(pc&&!pc.currentRemoteDescription){await pc.setRemoteDescription(m.sdp);for(const c of RTC.pend.get(peer)||[])await pc.addIceCandidate(c).catch(()=>{});RTC.pend.delete(peer);}}
    else if(m.c){const pc=RTC.pcs.get(peer);if(pc&&pc.remoteDescription)await pc.addIceCandidate(m.c).catch(()=>{});else{const q=RTC.pend.get(peer)||[];q.push(m.c);RTC.pend.set(peer,q);}}
  }catch(e){console.warn('rtc',e);}
}
const dcOpen=peer=>{const d=RTC.dcs.get(peer);return d&&d.readyState==='open'?d:null;};

// =====================================================================
// ---------- Lobi, odalar, takımlar, sohbet, maç senkronu ----------
// =====================================================================
const NET={lobby:null,room:null,code:null,isHost:false,state:'off',
  cfg:null,teams:{},wantSeen:{},bots:[],phase:'lobby',ro:null,inputs:{},
  want:'spec',ready:false,lobbyChat:[],roomChat:[],logs:{lobby:new Map(),room:new Map()},seq:0,
  joinedAt:0,hostSeenAt:0,roKey:null,snap:null,snapN:-1,lastSnap:null,lastIn:'',lastInAt:0,lastChatAt:0,botN:0,menuFor:null,pubN:0};
const QUICK=['Pas ver!','Geri dön!','Şut çek!','Benim!','Güzel!','Kaleye!','😂','GG'];
const KITS=[{n:'Kırmızı',a:'KRM',p:'#d63a2a',s:'#ffffff',pat:'solid'},{n:'Mavi',a:'MAV',p:'#2a62d6',s:'#ffffff',pat:'solid'},{n:'Sarı-Lacivert',a:'SRL',p:'#f2c230',s:'#0e2a5c',pat:'hoop'},{n:'Yeşil-Beyaz',a:'YŞB',p:'#1f9d55',s:'#ffffff',pat:'stripes'},{n:'Siyah-Beyaz',a:'SYB',p:'#111111',s:'#ffffff',pat:'stripes'},{n:'Mor',a:'MOR',p:'#7b3fd1',s:'#e64a8f',pat:'sash'},{n:'Turuncu',a:'TRN',p:'#ff7a1a',s:'#111111',pat:'half'},{n:'Bordo-Mavi',a:'BRM',p:'#7a1f2b',s:'#18b6c9',pat:'half'}];
const kitOf=i=>{const k=KITS[i]||KITS[0];return {name:k.n,abbr:k.a,p:k.p,s:k.s,pat:k.pat};};
let roomDraft={map:'classic',max:4,time:180,goals:3};
const randCode=()=>{const a='abcdefghjkmnpqrstuvwxyz23456789';let s='';for(let i=0;i<4;i++)s+=a[Math.floor(Math.random()*a.length)];return s;};
// rAF arka plandaki sekmede durur; ağ olayları için setTimeout kullanılır
let rafQ=new Set();function schedule(fn){if(rafQ.has(fn))return;rafQ.add(fn);setTimeout(()=>{rafQ.delete(fn);try{fn();}catch(e){console.error(e);}},16);}
const myPeer=()=>TAB;
const named=ps=>ps.filter(p=>p.kind!=='agent'&&p.presence&&typeof p.presence.nick==='string');
// takım etiketi: takımdaysan adının önünde sarı kısaltma (örn. SKC furkan)
function cleanTag(t){return typeof t==='string'?t.toLocaleUpperCase('tr-TR').replace(/[^A-Z0-9ÇĞİÖŞÜ]/g,'').slice(0,3):'';}
const myTag=()=>cleanTag(myTeamCache&&myTeamCache.team?myTeamCache.team.abbr:'');
function nickEl(tag,nick,color,tagName='b'){const b=document.createElement(tagName);const t=cleanTag(tag);
  if(t){const s=document.createElement('span');s.className='ttag';s.textContent=t;b.appendChild(s);}
  const n=document.createElement('span');n.textContent=nick;if(color)n.style.color=color;b.appendChild(n);return b;}
function pushTag(){pushLobby();if(NET.room)pushRoom();}

async function netConnect(){
  if(NET.state==='on'||NET.state==='connecting')return;
  NET.state='connecting';renderNetState();
  let lobby;try{lobby=makeRoom('uzk-lobby');}catch(e){lobby=null;}
  const ok=lobby&&await lobby.ready;
  if(!ok){NET.state='bad';renderNetState('Canlı sunucuya bağlanılamadı. Biraz sonra tekrar dene; botlara karşı antrenman açık.');setTimeout(()=>{NET.state='off';netConnect();},8000);return;}
  NET.lobby=lobby;NET.state='on';
  lobby.onPeers(()=>schedule(renderOnline));
  pushLobby();renderNetState('');renderOnline();
}
function pushLobby(){
  if(!NET.lobby)return;
  const host=NET.isHost&&NET.room&&NET.cfg?{code:NET.code,name:NET.cfg.name,map:NET.cfg.map,n:hostHumanCount(),max:NET.cfg.max,ph:NET.phase,priv:NET.cfg.priv?1:0}:null;
  NET.lobby.presence({nick:prof.name,av:prof.avatar,nc:prof.nameColor,tg:myTag(),u:uid,cel:prof.cel,chat:NET.lobbyChat,host,inRoom:NET.room?1:0});
}
function renderNetState(msg){
  const el=$('netState');if(!el)return;
  el.className='netdot'+(NET.state==='on'?' on':NET.state==='bad'?' bad':'');
  el.textContent=NET.state==='on'?'çevrimiçi':NET.state==='bad'?'bağlantı yok':'bağlanıyor';
  if(msg!==undefined)$('netMsg').textContent=msg;
  const dis=NET.state!=='on';['createRoom','joinCode','quickBtn'].forEach(id=>$(id).disabled=dis);
}
function lobbyRooms(){
  if(!NET.lobby)return[];
  return named(NET.lobby.peers()).filter(p=>p.presence.host&&typeof p.presence.host.code==='string'&&!p.presence.host.priv&&/^[a-z0-9]{4}$/.test(p.presence.host.code))
    .map(p=>({...p.presence.host,hostNick:p.presence.nick}));
}
function renderOnline(){
  if(!NET.lobby||$('main').hidden)return;
  const ps=named(NET.lobby.peers());
  $('onlineCount').textContent=ps.length+' çevrimiçi';
  const rooms=lobbyRooms().sort((a,b)=>(b.n||0)-(a.n||0));
  $('roomCount').textContent=rooms.length;
  const list=$('roomList');list.innerHTML='';
  if(!rooms.length){list.innerHTML='<div class="empty">Şu an açık oda yok. İlk odayı sen kur ya da Hızlı eşleş\'e bas.</div>';}
  rooms.forEach(r=>{const b=document.createElement('button');b.className='roomcard';
    const full=(r.n||0)>=(r.max||0);
    b.innerHTML=`<b></b><span class="cnt">${Number(r.n)||0}/${Number(r.max)||0}</span><span class="meta"><span class="tag">${esc(MAPS[r.map]?MAPS[r.map].name:'?')}</span>${r.ph==='game'?'<span class="tag live">Maçta</span>':'<span class="tag">Lobide</span>'}<span class="hn"></span></span>`;
    b.querySelector('b').textContent=cleanStr(r.name,28)||'Oda';b.querySelector('.hn').textContent='Kuran: '+cleanStr(r.hostNick,14);
    if(full){b.disabled=true;b.style.opacity=.55;}
    b.onclick=()=>enterRoom(r.code);list.appendChild(b);});
  renderChat('lobby',NET.lobby,$('lcLog'));
  const ol=$('onlineList');ol.innerHTML='';
  ps.sort((x,y)=>(y.sameTab?1:0)-(x.sameTab?1:0)).slice(0,60).forEach(p=>{const pr=p.presence;const b=document.createElement('button');b.type='button';b.className='oplayer';
    const av=document.createElement('span');av.className='av';av.textContent=cleanStr(pr.av,2)||'?';
    const st=document.createElement('span');st.className='st';st.textContent=p.sameTab?'sen':pr.host?'oda kurdu':pr.inRoom?'odada':'lobide';
    b.append(av,nickEl(pr.tg,cleanStr(pr.nick,14),cleanCol(pr.nc),'span'),st);
    b.onclick=()=>openStats(pr.u,cleanStr(pr.nick,14),pr.tg);ol.appendChild(b);});
}

// ---------- Sohbet ----------
function sendChat(scope,text){
  text=cleanStr(text,80).trim();if(!text)return;
  const now=Date.now();if(now-NET.lastChatAt<600)return;NET.lastChatAt=now;
  const arr=scope==='lobby'?NET.lobbyChat:NET.roomChat;
  arr.push([++NET.seq,text]);while(arr.length>6)arr.shift();
  if(scope==='lobby')pushLobby();else pushRoom();
}
function renderChat(scope,room,logEl){
  if(!room)return[];const log=NET.logs[scope];let fresh=[];
  for(const p of named(room.peers())){const ch=p.presence.chat;if(!Array.isArray(ch))continue;
    for(const m of ch){if(!Array.isArray(m)||typeof m[0]!=='number')continue;const key=p.peer+':'+m[0];
      if(!log.has(key)){const e={nick:cleanStr(p.presence.nick,14),tg:cleanTag(p.presence.tg),text:cleanStr(m[1],80),me:p.sameTab,peer:p.peer,col:cleanCol(p.presence.nc)};log.set(key,e);fresh.push(e);}}}
  while(log.size>80)log.delete(log.keys().next().value);
  if(!logEl)return fresh;
  if(fresh.length||!logEl.childElementCount){
    const atBottom=logEl.scrollHeight-logEl.scrollTop-logEl.clientHeight<30;
    logEl.innerHTML='';
    if(!log.size){const d=document.createElement('div');d.className='m sys';d.textContent='Henüz mesaj yok.';logEl.appendChild(d);}
    for(const e of log.values()){const d=document.createElement('div');d.className='m';const b=nickEl(e.tg,e.nick+':',e.me?'var(--flood)':e.col);d.appendChild(b);d.appendChild(document.createTextNode(e.text));logEl.appendChild(d);}
    if(atBottom||fresh.some(e=>e.me))logEl.scrollTop=logEl.scrollHeight;
  }
  return fresh;
}
$('lcForm').addEventListener('submit',e=>{e.preventDefault();sendChat('lobby',$('lcIn').value);$('lcIn').value='';});
$('rcForm').addEventListener('submit',e=>{e.preventDefault();sendChat('room',$('rcIn').value);$('rcIn').value='';});
QUICK.forEach(q=>{const b=document.createElement('button');b.className='chip';b.type='button';b.textContent=q;b.onclick=()=>sendChat('room',q);$('rcQuick').appendChild(b);});

// ---------- Oda kurma / girme / çıkma ----------
function bindDraft(id,key,num=true){const box=$(id);const sync=()=>box.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',String(String(roomDraft[key])===c.dataset.v)));
  box.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{roomDraft[key]=num?Number(c.dataset.v):c.dataset.v;sync();});sync();}
bindDraft('rdMap','map',false);bindDraft('rdMax','max');bindDraft('rdTime','time');bindDraft('rdGoals','goals');
function createRoom(cfg){
  NET.isHost=true;
  NET.cfg={kits:[0,1],free:true,skin:SKINS[prof.skin]?prof.skin:'classic',...cfg};
  NET.teams={};NET.wantSeen={};NET.bots=[];NET.phase='lobby';NET.ro=null;NET.want='red';
  enterRoom(randCode());
}
$('createRoom').onclick=()=>createRoom({name:cleanStr($('inRoomName').value,28).trim()||(prof.name+' odası'),map:roomDraft.map,max:roomDraft.max,time:roomDraft.time,goals:roomDraft.goals,priv:$('rdPriv').checked});
$('joinCode').onclick=()=>{const c=cleanStr($('inCode').value,6).toLowerCase().replace(/[^a-z0-9]/g,'');if(c.length===4)enterRoom(c);else $('netMsg').textContent='Oda kodu 4 karakter olmalı.';};
$('quickBtn').onclick=()=>{ // en kalabalık, yeri olan, lobideki odaya gir; yoksa oda aç
  const r=lobbyRooms().filter(r=>r.ph!=='game'&&(r.n||0)<(r.max||0)).sort((a,b)=>(b.n||0)-(a.n||0))[0]
       ||lobbyRooms().filter(r=>(r.n||0)<(r.max||0)).sort((a,b)=>(b.n||0)-(a.n||0))[0];
  if(r){NET.want='red';enterRoom(r.code,true);}
  else createRoom({name:prof.name+' · hızlı maç',map:'classic',max:4,time:180,goals:3,priv:false});
};
async function enterRoom(code,autoTeam){
  if(!NET.lobby)return;
  if(NET.room)await leaveRoom(true);
  const room=makeRoom('uzk-r-'+code);
  $('netMsg').textContent='Odaya bağlanılıyor…';
  const ok=await room.ready;
  if(!ok){NET.isHost=false;room.leave();$('netMsg').textContent='Odaya bağlanılamadı. Tekrar dene.';return;}
  $('netMsg').textContent='';
  NET.room=room;NET.code=code;NET.roomChat=[];NET.logs.room=new Map();NET.ready=false;NET.joinedAt=Date.now();NET.hostSeenAt=0;NET.roKey=null;NET.snap=null;NET.snapN=-1;NET.menuFor=null;NET.inputs={};
  if(!NET.isHost){NET.want=autoTeam?(Math.random()<0.5?'red':'blue'):'spec';}
  rtcReset();
  room.on('sig',rtcOnSignal);
  room.on('g',d=>{if(!NET.isHost&&d&&d.to===undefined)acceptSnap(d);});
  room.on('in',d=>{if(NET.isHost&&d&&typeof d.from==='string'&&Array.isArray(d.q))NET.inputs[d.from]=d.q;});
  room.onPeers(()=>schedule(onRoomPeers));
  pushRoom();pushLobby();
  $('rCode').textContent=code;show('roomScr');renderRoom();
}
async function leaveRoom(silent){
  const r=NET.room;if(!r)return;
  NET.room=null;NET.isHost=false;NET.cfg=null;NET.ro=null;NET.phase='lobby';NET.roKey=null;
  if(G&&G.net){G=null;}
  rtcReset();
  try{await r.leave();}catch(e){}
  pushLobby();
  if(!silent){showMain('rooms');}
}
function closeRoom(msg){leaveRoom(false);$('netMsg').textContent=msg;}
$('leaveRoom').onclick=()=>leaveRoom(false);
$('copyCode').onclick=()=>{const t=NET.code||'';const done=ok=>{const b=$('copyCode');b.textContent=ok?'Kopyalandı':'Kod: '+t;setTimeout(()=>{b.innerHTML='Kod: <b id="rCode"></b>';$('rCode').textContent=NET.code||'';},1400);};
  try{navigator.clipboard.writeText(t).then(()=>done(true),()=>done(false));}catch(e){done(false);}};

function pushRoom(){
  if(!NET.room)return;
  const pr={nick:prof.name,av:prof.avatar,nc:prof.nameColor,tg:myTag(),u:uid,cel:prof.cel,want:NET.want,ready:NET.ready,chat:NET.roomChat};
  if(NET.isHost)Object.assign(pr,{H:1,code:NET.code,cfg:NET.cfg,teams:NET.teams,bots:NET.bots,phase:NET.phase,ro:NET.ro});
  NET.room.presence(pr);
}
const hostPeerOf=r=>r?named(r.peers()).find(p=>p.presence.H===1&&p.presence.code===NET.code):null;
function hostHumanCount(){if(!NET.room)return 0;return named(NET.room.peers()).filter(p=>{const t=NET.teams[p.peer];return t!=='full'&&t!=='kicked';}).length;}

// ---------- Host: takım düzeni ----------
function hostReconcile(){
  const ps=named(NET.room.peers());const ids=new Set(ps.map(p=>p.peer));const T=NET.teams;let ch=false;
  for(const k of Object.keys(T))if(!ids.has(k)){delete T[k];delete NET.wantSeen[k];delete NET.inputs[k];rtcDrop(k);ch=true;}
  for(const p of ps){
    if(!(p.peer in T)){const n=Object.values(T).filter(v=>v!=='full'&&v!=='kicked').length;T[p.peer]=n>=NET.cfg.max?'full':'spec';ch=true;}
    const w=p.presence.want;
    if((w==='red'||w==='blue'||w==='spec')&&NET.wantSeen[p.peer]!==w){NET.wantSeen[p.peer]=w;
      if((NET.cfg.free||p.sameTab)&&NET.phase==='lobby'&&T[p.peer]!=='full'&&T[p.peer]!=='kicked'&&T[p.peer]!==w){T[p.peer]=w;ch=true;}}
    if(!p.sameTab&&T[p.peer]!=='full'&&T[p.peer]!=='kicked')rtcHostEnsure(p.peer);
  }
  return ch;
}
function onRoomPeers(){
  if(!NET.room)return;
  if(NET.isHost){if(hostReconcile())pushRoom();pushLobby();}
  else{
    const h=hostPeerOf(NET.room);
    if(h){NET.hostSeenAt=Date.now();const t=h.presence.teams&&h.presence.teams[TAB];
      if(t==='kicked'){closeRoom('Oda sahibi seni odadan çıkardı.');return;}
      if(t==='full'){closeRoom('Oda dolu.');return;}
      clientSync(h);}
  }
  const fresh=renderChat('room',NET.room,$('rcLog'))||[];
  if(G&&G.net){const now=performance.now();for(const e of fresh){G.bubbles[e.peer]={text:e.text,until:now+4200};pushGameChat(e);}}
  renderRoom();
}
setInterval(()=>{ // oda sahibi gitti mi?
  if(!NET.room||NET.isHost)return;const now=Date.now();
  // oda sahibi görünüyorsa saati her saniye tazele: varlık bilgisi güncellenirken (ör. maç başlarken) bir an kaybolması odayı kapatmasın
  if(hostPeerOf(NET.room)){NET.hostSeenAt=now;return;}
  if(!NET.hostSeenAt&&now-NET.joinedAt>10000)closeRoom('Bu kodla açık bir oda bulunamadı.');
  else if(NET.hostSeenAt&&now-NET.hostSeenAt>12000)closeRoom('Oda sahibi ayrıldı, oda kapandı.');
},1000);

// ---------- Oda ekranı ----------
function roomView(){
  if(NET.isHost)return {cfg:NET.cfg,teams:NET.teams,bots:NET.bots,phase:NET.phase,host:TAB,me:TAB};
  const h=hostPeerOf(NET.room);if(!h)return null;const pr=h.presence;
  return {cfg:pr.cfg||{},teams:pr.teams||{},bots:Array.isArray(pr.bots)?pr.bots:[],phase:pr.phase,host:h.peer,me:TAB};
}
function miniKit(cv,k){const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);drawDisc(x,cv.width/2,cv.height/2,cv.width/2-2,k,'');}
function renderRoom(){
  if(!NET.room||$('roomScr').hidden)return;
  const v=roomView();
  if(!v){$('rName').textContent='Odaya bağlanılıyor…';$('rMeta').textContent='';$('rStatus').textContent='Oda sahibi bekleniyor.';return;}
  const cfg=v.cfg,kits=[kitOf(cfg.kits?cfg.kits[0]:0),kitOf(cfg.kits?cfg.kits[1]:1)];
  $('rName').textContent=cleanStr(cfg.name,28)||'Oda';
  $('rMeta').textContent=`${MAPS[cfg.map]?MAPS[cfg.map].name:'?'} saha · ${(SKINS[cfg.skin]||SKINS.classic).name} · ${Math.round((cfg.time||0)/60)} dk · ${cfg.goals?cfg.goals+' gol sınırı':'gol sınırı yok'} · en fazla ${cfg.max} kişi${cfg.priv?' · gizli oda':''}${cfg.free?' · serbest takım seçimi':' · takımları oda sahibi dağıtır'}`;
  const ps=named(NET.room.peers());const cols={red:[],spec:[],blue:[]};
  for(const p of ps){const t=v.teams[p.peer]||'spec';if(t==='full'||t==='kicked')continue;(cols[t]||cols.spec).push({p});}
  for(const b of v.bots){if(b&&(b.team===0||b.team===1))cols[b.team===0?'red':'blue'].push({bot:b});}
  [['red','col0',0],['spec','colS',-1],['blue','col1',1]].forEach(([key,id,ti])=>{
    const col=$(id);
    if(ti>=0){col.style.setProperty('--tc',kits[ti].p);col.querySelector('h3 span').textContent=kits[ti].name;miniKit(col.querySelector('canvas'),kits[ti]);}
    col.querySelector('h3 em').textContent=cols[key].length;
    const list=col.querySelector('.plist');list.innerHTML='';
    cols[key].forEach(it=>{
      const c=document.createElement(NET.isHost?'button':'div');c.className='pchip'+(NET.isHost?' hostable':'');
      const av=document.createElement('span');av.className='av';const nm=document.createElement('span');nm.className='nm';const st=document.createElement('span');st.className='st';
      const k=ti>=0?kits[ti]:{p:'#55625a',s:'#55625a',pat:'solid'};av.style.background=k.p;av.style.color=lum(k.p)>0.6?'#111':'#fff';
      if(it.bot){av.textContent=cleanStr(it.bot.av,2);nm.textContent=cleanStr(it.bot.name,14)+' (bot)';st.textContent='🤖';
        if(NET.isHost)c.onclick=()=>{NET.bots=NET.bots.filter(b=>b!==it.bot);pushRoom();renderRoom();};}
      else{const pr=it.p.presence;av.textContent=cleanStr(pr.av,2)||'?';nm.textContent='';nm.appendChild(nickEl(pr.tg,cleanStr(pr.nick,14)+(it.p.peer===v.host?' 👑':''),cleanCol(pr.nc),'span'));
        if(it.p.sameTab)c.classList.add('me');
        const link=NET.isHost&&!it.p.sameTab?(dcOpen(it.p.peer)?' ·P2P':' ·yedek'):'';
        st.textContent=(v.phase==='lobby'&&pr.ready?'hazır':'')+link;if(pr.ready)st.classList.add('ok');
        if(NET.isHost)c.onclick=()=>openPlayerMenu(it.p.peer,cleanStr(pr.nick,14),pr.u,pr.tg);else{c.style.cursor='pointer';c.onclick=()=>openStats(pr.u,cleanStr(pr.nick,14),pr.tg);}}
      c.append(av,nm,st);list.appendChild(c);});
    const jb=col.querySelector('.join');const myT=v.teams[v.me]||'spec';
    jb.disabled=myT===key||v.phase!=='lobby'||(!cfg.free&&!NET.isHost);
    jb.title=!cfg.free&&!NET.isHost?'Takımları oda sahibi dağıtıyor':'';
  });
  const st=$('rStatus');st.innerHTML='';
  const myT=v.teams[v.me]||'spec';
  const line=document.createElement('div');line.className='row';line.style.alignItems='center';
  const txt=document.createElement('span');txt.style.flex='1';
  if(v.phase==='game'){
    const inGame=G&&G.net;txt.textContent=myT==='spec'?'Maç sürüyor. İzleyebilirsin, maç bitince takıma geçebilirsin.':'Maç sürüyor.';
    const b=document.createElement('button');b.className='big';b.textContent=myT==='spec'||!inGame?'Maçı izle':'Maça dön';b.disabled=!inGame;
    b.onclick=()=>{if(G&&G.net){show('game');resize();}};line.append(txt,b);
  }else{
    txt.textContent=myT==='spec'?'İzleyicisin. Bir takıma geç, sonra "Hazırım" de.':'Takımdasın. Hazır olunca işaretle, oda sahibi maçı başlatsın.';
    const r=document.createElement('button');r.className='chip';r.setAttribute('aria-pressed',String(!!NET.ready));r.textContent=NET.ready?'Hazırım ✓':'Hazırım';
    r.onclick=()=>{NET.ready=!NET.ready;pushRoom();renderRoom();};line.append(txt,r);
  }
  st.appendChild(line);
  if(!NET.isHost){const h=hostPeerOf(NET.room);const n=document.createElement('p');n.className='note';n.style.margin='8px 0 0';
    n.textContent=dcOpen(h&&h.peer)?'Oda sahibine doğrudan bağlısın (en düşük gecikme).':'Oda sahibine sunucu üzerinden bağlısın. Doğrudan bağlantı kuruluyor…';st.appendChild(n);}
  $('hostPanel').hidden=!NET.isHost;
  if(NET.isHost)renderHostPanel();
  if(NET.isHost&&NET.menuFor&&!(NET.menuFor in NET.teams)){NET.menuFor=null;$('pMenu').hidden=true;}
}
function renderHostPanel(){
  const cfg=NET.cfg;
  [['hsMap','map',false],['hsTime','time',true],['hsGoals','goals',true],['hsSkin','skin',false]].forEach(([id,k,num])=>{
    $(id).querySelectorAll('.chip').forEach(c=>{c.setAttribute('aria-pressed',String(String(cfg[k])===c.dataset.v));c.disabled=NET.phase!=='lobby';
      c.onclick=()=>{cfg[k]=num?Number(c.dataset.v):c.dataset.v;pushRoom();pushLobby();renderRoom();};});});
  [0,1].forEach(t=>{const box=$('hsKit'+t);if(!box.childElementCount){KITS.forEach((k,i)=>{const b=document.createElement('button');b.title=k.n;b.setAttribute('aria-label',k.n);const cv=document.createElement('canvas');cv.width=60;cv.height=60;b.appendChild(cv);miniKit(cv,kitOf(i));
      b.onclick=()=>{if(NET.cfg.kits[1-t]===i)NET.cfg.kits[1-t]=NET.cfg.kits[t];NET.cfg.kits[t]=i;pushRoom();renderRoom();};box.appendChild(b);});}
    [...box.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(cfg.kits[t]===i)));});
  $('hsFree').checked=!!cfg.free;
  $('hsStart').disabled=NET.phase!=='lobby';
}
$('hsFree').onchange=e=>{NET.cfg.free=e.target.checked;pushRoom();renderRoom();};
function addBot(t){if(NET.bots.length>=10)return;const used=new Set(NET.bots.map(b=>b.name));const name=BOT_NAMES.find(n=>!used.has(n))||'Bot';NET.bots.push({id:'b'+(++NET.botN),team:t,name,av:String(NET.bots.filter(b=>b.team===t).length+1)});pushRoom();renderRoom();}
$('hsBot0').onclick=()=>addBot(0);$('hsBot1').onclick=()=>addBot(1);
$('hsBotClear').onclick=()=>{NET.bots=[];pushRoom();renderRoom();};
$('hsShuffle').onclick=()=>{
  const ps=named(NET.room.peers()).filter(p=>{const t=NET.teams[p.peer];return t!=='full'&&t!=='kicked';});
  const all=[...ps.map(p=>({p})),...NET.bots.map(b=>({b}))].sort(()=>Math.random()-0.5);
  all.forEach((it,i)=>{const t=i%2;if(it.p)NET.teams[it.p.peer]=t?'blue':'red';else it.b.team=t;});
  pushRoom();renderRoom();sendSys('Takımlar karıştırıldı.');
};
function sendSys(t){sendChat('room','📣 '+t);}
function openPlayerMenu(peer,nick,u,tg){
  const m=$('pMenu');NET.menuFor=peer;m.hidden=false;m.innerHTML='';
  const l=document.createElement('b');l.textContent=nick+':';m.appendChild(l);
  [['red','Sol takıma'],['spec','İzleyiciye'],['blue','Sağ takıma']].forEach(([t,lab])=>{const b=document.createElement('button');b.className='chip';b.textContent=lab;b.onclick=()=>{NET.teams[peer]=t;m.hidden=true;NET.menuFor=null;pushRoom();renderRoom();};m.appendChild(b);});
  if(peer!==TAB){const k=document.createElement('button');k.className='chip';k.textContent='Odadan çıkar';k.style.borderColor='var(--danger)';k.onclick=()=>{NET.teams[peer]='kicked';m.hidden=true;NET.menuFor=null;pushRoom();renderRoom();sendSys(nick+' odadan çıkarıldı.');};m.appendChild(k);}
  const sb2=document.createElement('button');sb2.className='chip';sb2.textContent='İstatistik';sb2.onclick=()=>openStats(u,nick,tg);m.appendChild(sb2);
  const c=document.createElement('button');c.className='chip';c.textContent='Kapat';c.onclick=()=>{m.hidden=true;NET.menuFor=null;};m.appendChild(c);
}
document.querySelectorAll('#roomScr .join').forEach(b=>b.onclick=()=>{NET.want=b.dataset.team;if(NET.isHost){NET.teams[TAB]=NET.want;}pushRoom();renderRoom();});

// ---------- Maç: host ----------
$('hsStart').onclick=()=>{
  const ps=named(NET.room.peers());const roster=[];
  for(const p of ps){const t=NET.teams[p.peer];if(t!=='red'&&t!=='blue')continue;const pr=p.presence;
    roster.push({pid:p.peer,team:t==='red'?0:1,human:true,local:p.sameTab,remote:!p.sameTab,avatar:cleanStr(pr.av,2)||'?',name:cleanStr(pr.nick,14),nameColor:cleanCol(pr.nc),tag:cleanTag(pr.tg),cel:cleanCel(pr.cel)});}
  for(const b of NET.bots)roster.push({pid:b.id,team:b.team,human:false,local:false,remote:false,avatar:cleanStr(b.av,2),name:cleanStr(b.name,14),nameColor:'#ffffff'});
  if(!roster.some(r=>r.team===0)||!roster.some(r=>r.team===1)){$('rStatus').textContent='Maç için iki takımda da en az bir oyuncu ya da bot olmalı.';return;}
  NET.ro=roster.map(r=>[r.pid,r.team,r.avatar,r.name,r.nameColor,r.human?1:0,r.tag||'',r.cel||'']);NET.phase='game';NET.pubN=0;
  pushRoom();pushLobby();
  const mt=NET.teams[TAB];
  startMatch({roster,map:NET.cfg.map,kits:[kitOf(NET.cfg.kits[0]),kitOf(NET.cfg.kits[1])],time:NET.cfg.time,goals:NET.cfg.goals,skin:NET.cfg.skin,net:{role:'host'},myTeam:mt==='red'?0:mt==='blue'?1:-1,diff:1});
  sendSys('Maç başladı!');
};
function netHostInputs(){return NET.inputs;}
function netHostPublish(){
  if(!NET.room||!G)return;
  NET.pubN++;if(NET.pubN%2)return; // 30 Hz
  const s=[];for(const p of G.players)s.push(Math.round(p.x),Math.round(p.y),p.kick?1:0);
  const g={n:NET.pubN,s,b:[Math.round(G.ball.x),Math.round(G.ball.y)],sc:G.score,c:Math.round(G.clock*10)/10,st:G.state,gd:G.golden?1:0,ks:G.kseq,gs:G.gseq,lg:G.lastGoal,gi:G.gi,ai:G.ai,pg:G.players.map(p=>[p.g||0,p.a||0]),pa:G.paused?1:0};
  const msg=JSON.stringify({g});let needRelay=false;
  for(const p of named(NET.room.peers())){if(p.sameTab)continue;const t=NET.teams[p.peer];if(t==='full'||t==='kicked')continue;const dc=dcOpen(p.peer);
    if(dc){try{dc.send(msg);}catch(e){needRelay=true;}}else needRelay=true;}
  if(needRelay&&NET.pubN%4===0)NET.room.send('g',g); // doğrudan bağlanamayanlar için 15 Hz yedek
}
function hostBackToRoom(){NET.phase='lobby';NET.ro=null;pushRoom();pushLobby();G=null;show('roomScr');renderRoom();}

// ---------- Maç: istemci ----------
function clientSync(h){
  const pr=h.presence;
  if(pr.phase==='game'&&Array.isArray(pr.ro)&&pr.cfg){
    const key=JSON.stringify(pr.ro)+'|'+pr.cfg.map;
    if(NET.roKey!==key){NET.roKey=key;buildClientGame(pr);}
  } else if(NET.roKey){NET.roKey=null;
    if(G&&G.net&&G.net.role==='client'){const showingEnd=!$('game').hidden&&!$('endOv').hidden;if(!showingEnd){G=null;show('roomScr');}}}
}
function buildClientGame(pr){
  setMap(MAPS[pr.cfg.map]?pr.cfg.map:'classic');
  const kits=[kitOf(pr.cfg.kits?pr.cfg.kits[0]:0),kitOf(pr.cfg.kits?pr.cfg.kits[1]:1)];
  const cnt=[0,0];const players=pr.ro.filter(r=>Array.isArray(r)&&(r[1]===0||r[1]===1)).map(r=>{const t=r[1];const i=cnt[t]++;
    return {pid:String(r[0]),team:t,idx:i,human:!!r[5],local:r[0]===TAB,remote:false,avatar:cleanStr(r[2],2),name:cleanStr(r[3],14),nameColor:cleanCol(r[4]),tag:cleanTag(r[6]),cel:cleanCel(r[7]),g:0,a:0,x:0,y:0,tx:0,ty:0,r:PR,kick:false};});
  const mine=players.find(p=>p.local);
  G={net:{role:'client'},players,ball:{x:0,y:0,tx:0,ty:0,r:BR},kits,score:[0,0],clock:pr.cfg.time||180,state:'play',golden:false,paused:false,
    skin:SKINS[pr.cfg.skin]?pr.cfg.skin:'classic',mapKey:MAPS[pr.cfg.map]?pr.cfg.map:'classic',myTeam:mine?mine.team:-1,training:false,bubbles:{},ks:-1,gs:-1,snap:true,ended:false,size:Math.max(cnt[0],cnt[1],1),kickoff:true};
  NET.snap=null;NET.snapN=-1;NET.lastSnap=null;$('endOv').hidden=true;$('pauseOv').hidden=true;
  CELFX=[];preloadCels();loadGoalSnd();
  if(mine){show('game');resize();sWhistle(0.45,1);}else renderRoom();
}
function acceptSnap(g){if(!g||!Array.isArray(g.s)||typeof g.n!=='number')return;if(g.n<NET.snapN&&NET.snapN-g.n<5000)return;NET.snapN=g.n;NET.snap=g;}
function clientFrame(){
  const g=NET.snap;
  if(g&&g!==NET.lastSnap){
    NET.lastSnap=g;
    G.players.forEach((p,i)=>{const x=g.s[3*i],y=g.s[3*i+1];if(typeof x==='number'&&typeof y==='number'){p.tx=x;p.ty=y;p.kick=!!g.s[3*i+2];}});
    if(Array.isArray(g.b)){G.ball.tx=g.b[0];G.ball.ty=g.b[1];}
    if(Array.isArray(g.sc))G.score=[Number(g.sc[0])||0,Number(g.sc[1])||0];
    G.clock=Number(g.c)||0;G.golden=!!g.gd;G.paused=!!g.pa;
    if(Array.isArray(g.pg))G.players.forEach((p,i)=>{const v=g.pg[i];if(Array.isArray(v)){p.g=Math.max(0,Number(v[0])||0);p.a=Math.max(0,Number(v[1])||0);}});
    if(G.ks>=0&&g.ks>G.ks)sKick(1);G.ks=g.ks;
    if(G.gs>=0&&g.gs>G.gs){const t=g.lg;startCel(G.players[Number(g.gi)],t);goalBanner(G.myTeam<0||t===G.myTeam?'GOL!':'GOL YEDİK',Number(g.gi),Number(g.ai));sCrowd();}
    if(g.st==='play'||g.st==='over')$('banner').classList.remove('on');
    G.gs=g.gs;
    if(g.st==='over'&&!G.ended){G.ended=true;G.state='over';showEnd();}
    renderHud();
  }
  const k=G.snap?1:0.5;G.snap=false;
  for(const o of [...G.players,G.ball]){if(Math.hypot(o.tx-o.x,o.ty-o.y)>70){o.x=o.tx;o.y=o.ty;}else{o.x+=(o.tx-o.x)*k;o.y+=(o.ty-o.y)*k;}}
  const me=G.players.find(p=>p.local);
  if(me&&!chatOpen()){const t={};humanInput(t);const q=[Math.round(t.ix*10),Math.round(t.iy*10),t.kick?1:0];const s=q.join(',');const now=performance.now();
    if(s!==NET.lastIn||now-NET.lastInAt>120){NET.lastIn=s;NET.lastInAt=now;
      const h=hostPeerOf(NET.room);const dc=h&&dcOpen(h.peer);
      if(dc){try{dc.send(JSON.stringify({in:q}));}catch(e){}}else if(s!==NET.lastInRelay||now-(NET.lastRelayAt||0)>300){NET.lastInRelay=s;NET.lastRelayAt=now;NET.room.send('in',{from:TAB,q});}}}
}
function showEnd(){
  const [a,c]=G.score,my=G.myTeam;
  $('endScore').textContent=`${a} – ${c}`;$('endLbl').textContent=`${G.kits[0].abbr} · ${G.kits[1].abbr}`;
  $('endMsg').textContent=my<0?(a===c?'Berabere.':(a>c?G.kits[0].name:G.kits[1].name)+' kazandı.'):((my===0?a>c:c>a)?'Kazandınız!':a===c?'Berabere.':'Kaybettiniz. Rövanş isteyin.');
  $('againBtn').textContent='Odaya dön';$('endMenu').textContent='Odadan çık';renderEndStats();$('endOv').hidden=false;
  recordMyMatch();adAfterMatch();
}

// ---------- Oyun içi sohbet ----------
const gIn=$('gchatIn'),gForm=$('gchatForm'),gQuick=$('gchatQuick');
QUICK.forEach(q=>{const b=document.createElement('button');b.className='chip';b.type='button';b.textContent=q;b.onclick=()=>{sendChat('room',q);closeChat();};gQuick.appendChild(b);});
function chatOpen(){return !gForm.hidden;}
function openChat(){if(!G||!G.net)return;gForm.hidden=false;gQuick.hidden=false;gIn.value='';setTimeout(()=>gIn.focus(),0);for(const k in keys)keys[k]=false;}
function closeChat(){gForm.hidden=true;gQuick.hidden=true;gIn.blur();}
gForm.addEventListener('submit',e=>{e.preventDefault();sendChat('room',gIn.value);closeChat();});
gIn.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeChat();}e.stopPropagation();});
$('chatBtn').onclick=()=>chatOpen()?closeChat():openChat();
function pushGameChat(e){const log=$('gchatLog');const d=document.createElement('div');const b=nickEl(e.tg,e.nick+': ',e.me?'var(--flood)':e.col);d.append(b,document.createTextNode(e.text));log.appendChild(d);
  while(log.childElementCount>6)log.firstChild.remove();setTimeout(()=>d.classList.add('old'),7000);setTimeout(()=>d.remove(),7800);}
function drawBubbles(){
  if(!G||!G.bubbles)return;const now=performance.now();
  for(const p of G.players){const bb=G.bubbles[p.pid];if(!bb||bb.until<now)continue;
    const a=Math.min(1,(bb.until-now)/400);ctx.save();ctx.globalAlpha=a;ctx.font='600 12px Inter,system-ui,sans-serif';
    const t=bb.text.length>28?bb.text.slice(0,27)+'…':bb.text;const w=ctx.measureText(t).width+14,h=20,x=p.x-w/2,y=p.y-p.r-h-10;
    ctx.fillStyle='rgba(255,255,255,.95)';ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,8):ctx.rect(x,y,w,h);ctx.fill();
    ctx.beginPath();ctx.moveTo(p.x-5,y+h);ctx.lineTo(p.x+5,y+h);ctx.lineTo(p.x,y+h+6);ctx.fill();
    ctx.fillStyle='#111';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,p.x,y+h/2+1);ctx.restore();}
}

// =====================================================================
// ---------- Profil sekmesi ----------
// =====================================================================
let saveT=null;
function queueSave(){$('saveState').textContent='Kaydediliyor…';clearTimeout(saveT);saveT=setTimeout(async()=>{try{await DB.saveProfile();$('saveState').textContent='Kaydedildi.';}catch(e){$('saveState').textContent='Kaydedilemedi: '+errText(e);}},700);
  renderMe();pushLobby();if(NET.room)pushRoom();}
function renderMe(){const mn=$('meNick');mn.textContent='';mn.appendChild(nickEl(myTag(),prof.name,'','span'));if(NET.lobby)pushTag();$('meAv').textContent=prof.avatar;const k=myTeamCache&&myTeamCache.team?cleanKit(myTeamCache.team.kit):{p:prof.p};$('meAv').style.background=k.p;$('meAv').style.color=lum(k.p)>0.6?'#111':'#fff';}
// ---------- Oyuncu istatistikleri ----------
const ago=t=>{const s=(Date.now()-new Date(t).getTime())/1000;if(!(s>=0))return'';if(s<3600)return Math.max(1,Math.round(s/60))+' dk önce';if(s<86400)return Math.round(s/3600)+' sa önce';return Math.round(s/86400)+' gün önce';};
function statsView(box,d){
  box.innerHTML='';
  const tiles=document.createElement('div');tiles.className='stattiles';
  [['Maç',d.played],['Gol',d.goals],['Asist',d.assists],['Galibiyet',d.won]].forEach(([l,v])=>{const t=document.createElement('div');const b=document.createElement('b');b.textContent=Number(v)||0;const s=document.createElement('span');s.textContent=l;t.append(b,s);tiles.appendChild(t);});
  box.appendChild(tiles);
  const last=Array.isArray(d.last)?d.last:[];
  const h=document.createElement('div');h.className='lbl';h.textContent='Son 10 maç';box.appendChild(h);
  if(!last.length){const e=document.createElement('div');e.className='empty';e.textContent='Henüz kayıtlı maç yok. Başka oyuncularla oynanan oda maçları sayılır.';box.appendChild(e);return;}
  const tb=document.createElement('table');tb.className='lastm';tb.innerHTML='<thead><tr><th></th><th>Skor</th><th>Gol</th><th>Asist</th><th>Saha</th><th></th></tr></thead><tbody></tbody>';
  const RL={W:'G',D:'B',L:'M'};
  for(const m of last){const tr=document.createElement('tr');const r=['W','D','L'].includes(m.result)?m.result:'D';
    [[RL[r],'r '+r],[`${Number(m.gf)||0}–${Number(m.ga)||0}`],[Number(m.goals)||0],[Number(m.assists)||0],[MAPS[m.map]?MAPS[m.map].name:'?'],[ago(m.played_at),'muted']].forEach(([v,c])=>{const td=document.createElement('td');td.textContent=v;if(c)td.className=c;tr.appendChild(td);});
    tb.tBodies[0].appendChild(tr);}
  box.appendChild(tb);
}
async function openStats(u,nick,tg){
  const ov=$('statOv'),body=$('statBody');ov.hidden=false;body.innerHTML='';
  const h=document.createElement('h2');h.style.justifyContent='center';h.appendChild(nickEl(tg,nick||'Oyuncu','','span'));body.appendChild(h);
  const box=document.createElement('div');box.innerHTML='<p class="note">Yükleniyor…</p>';body.appendChild(box);
  const c=document.createElement('button');c.className='ghost';c.style.justifyContent='center';c.textContent='Kapat';c.onclick=()=>ov.hidden=true;body.appendChild(c);
  if(typeof u!=='string'||!u){box.innerHTML='<p class="note">Bu oyuncunun istatistikleri görünmüyor (eski sürümü kullanıyor olabilir).</p>';return;}
  try{statsView(box,await DB.playerSummary(u));}catch(e){box.innerHTML='';const p=document.createElement('p');p.className='err';p.textContent='İstatistik alınamadı: '+errText(e);box.appendChild(p);}
}
$('statOv').addEventListener('click',e=>{if(e.target.id==='statOv')$('statOv').hidden=true;});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('statOv').hidden)$('statOv').hidden=true;});
async function renderMyStats(){const box=$('myStats');if(!box)return;box.innerHTML='<p class="note">Yükleniyor…</p>';
  try{statsView(box,await DB.playerSummary(uid));}catch(e){box.innerHTML='';const p=document.createElement('p');p.className='err';p.textContent='İstatistik alınamadı: '+errText(e);box.appendChild(p);}}
function renderProfile(){renderMyStats();
  $('inName').value=prof.name;$('inAvatar').value=prof.avatar;
  const box=$('nameColors');box.innerHTML='';
  NAME_COLORS.forEach(col=>{const b=document.createElement('button');b.className='sw';b.style.background=col;b.setAttribute('aria-label',col);b.setAttribute('aria-pressed',String(prof.nameColor===col));
    b.onclick=()=>{prof.nameColor=col;save();renderProfile();queueSave();};box.appendChild(b);});
  drawPreview();
  $('acctInfo').textContent=!LIVE?'Yerel deneme modu: veriler sadece bu tarayıcıda.':isAnon?'Misafir hesapla oynuyorsun. Profilin ve takımın bu tarayıcıya bağlı. Google ile bağlarsan her cihazdan girersin.':'Google hesabınla bağlısın'+(userEmail?' ('+userEmail+')':'')+'.';
  $('googleLink').hidden=LIVE&&!isAnon;$('changeNick').hidden=!LIVE||isAnon;
}
function drawPreview(){
  const c=$('prevCv'),x=c.getContext('2d');x.clearRect(0,0,300,300);
  const k=myTeamCache&&myTeamCache.team?cleanKit(myTeamCache.team.kit):userKit();
  drawDisc(x,150,128,80,k,prof.avatar,{name:prof.name,nameColor:prof.nameColor});
}
$('inName').addEventListener('input',e=>{prof.name=cleanStr(e.target.value,14).trim()||'Oyuncu';save();drawPreview();queueSave();});
$('inAvatar').addEventListener('input',e=>{const v=e.target.value.toLocaleUpperCase('tr-TR');e.target.value=v;prof.avatar=cleanStr(v,2).trim()||'10';save();drawPreview();queueSave();});
$('googleLink').onclick=googleSignIn;$('gateGoogle').onclick=googleSignIn;
$('changeNick').onclick=async()=>{if(LIVE){await sb.auth.signOut();}try{localStorage.removeItem('uzk-profile'+SLOT);}catch(e){}location.reload();};

// =====================================================================
// ---------- Takım sekmesi ----------
// =====================================================================
let myTeamCache=null;
function kitPicker(cur,onPick){
  const wrap=document.createElement('div');wrap.style.display='flex';wrap.style.flexDirection='column';wrap.style.gap='8px';
  const k={...cur};
  const prev=document.createElement('canvas');prev.width=120;prev.height=120;prev.style.cssText='width:60px;height:60px';
  const redraw=()=>{const x=prev.getContext('2d');x.clearRect(0,0,120,120);drawDisc(x,60,60,54,k,'10');};
  const row=(label,list,key)=>{const l=document.createElement('div');l.className='lbl';l.textContent=label;const r=document.createElement('div');r.className='row';
    list.forEach(col=>{const b=document.createElement('button');b.type='button';b.className='sw';b.style.background=col;b.setAttribute('aria-label',col);b.setAttribute('aria-pressed',String(k[key]===col));
      b.onclick=()=>{k[key]=col;[...r.children].forEach(x=>x.setAttribute('aria-pressed',String(x===b)));redraw();onPick({...k});};r.appendChild(b);});wrap.append(l,r);};
  wrap.appendChild(prev);row('Ana renk',COLORS,'p');row('İkinci renk',COLORS,'s');
  const l=document.createElement('div');l.className='lbl';l.innerHTML='Desen <span class="pro">Premium</span>';const r=document.createElement('div');r.className='row';
  PATTERNS.forEach(([v,lab])=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=lab;b.setAttribute('aria-pressed',String(k.pat===v));b.onclick=()=>{k.pat=v;[...r.children].forEach(x=>x.setAttribute('aria-pressed',String(x===b)));redraw();onPick({...k});};r.appendChild(b);});
  wrap.append(l,r);redraw();onPick({...k});return wrap;
}
async function renderTeam(){
  const P=$('tab-team');P.innerHTML='<div class="panel"><p class="note">Yükleniyor…</p></div>';
  let mt;try{mt=await DB.myTeam();}catch(e){P.innerHTML='';const d=document.createElement('div');d.className='panel';d.innerHTML='<h2>Takım</h2><p class="err"></p>';d.querySelector('.err').textContent='Takım bilgisi alınamadı: '+errText(e);P.appendChild(d);return;}
  myTeamCache=mt;renderMe();P.innerHTML='';
  if(!mt){
    const grid=document.createElement('div');grid.className='cols2';
    const a=document.createElement('form');a.className='panel';
    a.innerHTML='<h2>Takım kur</h2><div class="row"><div class="field"><label class="lbl" for="tName">Takım adı</label><input id="tName" type="text" maxlength="24" required minlength="2"></div><div class="field" style="flex:0 1 110px"><label class="lbl" for="tAbbr">Kısaltma</label><input id="tAbbr" type="text" maxlength="3" minlength="2" required></div></div><div id="tKit"></div><button class="big" type="submit">Takımı kur</button><p class="err" id="tErr"></p><p class="note">Takımın 6. Lig\'den başlar. Kaptan sensin; arkadaşlarını takım koduyla davet edersin.</p>';
    let kit={p:prof.p,s:prof.s,pat:'solid'};a.querySelector('#tKit').appendChild(kitPicker(kit,k=>kit=k));
    a.querySelector('#tAbbr').addEventListener('input',e=>{e.target.value=e.target.value.toLocaleUpperCase('tr-TR');});
    a.onsubmit=async e=>{e.preventDefault();const name=cleanStr(a.querySelector('#tName').value,24).trim(),abbr=cleanStr(a.querySelector('#tAbbr').value,3).trim().toLocaleUpperCase('tr-TR');
      if(name.length<2||abbr.length<2){a.querySelector('#tErr').textContent='Takım adı ve kısaltma en az 2 karakter olmalı.';return;}
      try{await DB.createTeam(name,abbr,cleanKit(kit));renderTeam();}catch(err){a.querySelector('#tErr').textContent=errText(err);}};
    const b=document.createElement('form');b.className='panel';
    b.innerHTML='<h2>Takıma katıl</h2><p class="note">Kaptandan takım kodunu iste.</p><div class="field"><label class="lbl" for="tCode">Takım kodu</label><input id="tCode" type="text" maxlength="12" autocomplete="off"></div><button class="chip" type="submit">Katıl</button><p class="err" id="jErr"></p>';
    b.onsubmit=async e=>{e.preventDefault();const c=cleanStr(b.querySelector('#tCode').value,12).trim().toLowerCase();if(!c)return;try{await DB.joinTeam(c);renderTeam();}catch(err){b.querySelector('#jErr').textContent=errText(err);}};
    grid.append(a,b);P.appendChild(grid);return;
  }
  const t=mt.team,cap=mt.role==='kaptan',kit=cleanKit(t.kit);
  const head=document.createElement('div');head.className='panel';
  head.innerHTML='<h2><canvas width="56" height="56" style="width:28px;height:28px"></canvas><span class="tn"></span> <span class="tag ab"></span></h2><div class="note info"></div>';
  head.querySelector('.tn').textContent=t.name;head.querySelector('.ab').textContent=t.abbr;miniKit(head.querySelector('canvas'),kit);
  head.querySelector('.info').textContent=`${t.tier}. Lig · ${t.points} puan · ${t.played} maç (${t.won}G ${t.drawn}B ${t.lost}M) · averaj ${t.gf-t.ga>=0?'+':''}${t.gf-t.ga} · rolün: ${cap?'Kaptan':'Oyuncu'}`;
  P.appendChild(head);
  const grid=document.createElement('div');grid.className='cols2';P.appendChild(grid);
  const ros=document.createElement('div');ros.className='panel';ros.innerHTML='<h2>Kadro <span class="tag cnt"></span></h2><div class="roster"></div>';grid.appendChild(ros);
  const side=document.createElement('div');side.className='panel';grid.appendChild(side);
  try{const ms=await DB.members(t.id);ros.querySelector('.cnt').textContent=ms.length+'/12';const R=ros.querySelector('.roster');
    ms.forEach(m=>{const r=document.createElement('div');r.className='r';const av=document.createElement('span');av.className='av';av.style.cssText=`width:24px;height:24px;border-radius:50%;border:2px solid #000;display:grid;place-items:center;font-family:var(--f-display);font-weight:800;font-size:12px;background:${kit.p};color:${lum(kit.p)>0.6?'#111':'#fff'}`;av.textContent=cleanStr(m.avatar,2)||'?';
      const nm=document.createElement('span');nm.className='nm';nm.textContent=cleanStr(m.nick,14)+(m.user_id===uid?' (sen)':'');nm.style.color=cleanCol(m.name_color);
      const ro=document.createElement('span');ro.className='role';ro.textContent=m.role;r.append(av,nm,ro);
      if(cap&&m.user_id!==uid){const k=document.createElement('button');k.className='chip';k.textContent='Çıkar';k.onclick=async()=>{try{await DB.kick(t.id,m.user_id);renderTeam();}catch(e){alert(errText(e));}};r.appendChild(k);}
      R.appendChild(r);});}catch(e){ros.querySelector('.roster').textContent='Kadro alınamadı: '+errText(e);}
  if(cap){side.innerHTML='<h2>Davet</h2><p class="note">Bu kodu takım arkadaşlarına gönder. Takım sekmesinde "Takıma katıl"a yazsınlar.</p><div class="row" style="align-items:center"><span class="codebox" id="tcode">…</span><button class="chip" id="tcopy">Kopyala</button></div><h2 style="margin-top:8px">Takım forması</h2><div id="tkit"></div><button class="chip" id="tkitSave">Formayı kaydet</button><p class="note" id="tkitMsg"></p>';
    DB.teamCode(t.id).then(c=>{side.querySelector('#tcode').textContent=c||'—';}).catch(()=>{side.querySelector('#tcode').textContent='alınamadı';});
    side.querySelector('#tcopy').onclick=()=>{const c=side.querySelector('#tcode').textContent;try{navigator.clipboard.writeText(c);side.querySelector('#tcopy').textContent='Kopyalandı';}catch(e){}};
    let nk=kit;side.querySelector('#tkit').appendChild(kitPicker(kit,k=>nk=k));
    side.querySelector('#tkitSave').onclick=async()=>{try{await DB.updateKit(t.id,cleanKit(nk));side.querySelector('#tkitMsg').textContent='Forma kaydedildi.';myTeamCache.team.kit=cleanKit(nk);renderMe();}catch(e){side.querySelector('#tkitMsg').textContent=errText(e);}};
  } else side.innerHTML='<h2>Takım</h2><p class="note">Formayı ve kadroyu kaptan yönetir. Lig maçları için kaptanınla haberleş.</p>';
  const lv=document.createElement('button');lv.className='ghost';lv.style.justifyContent='center';lv.textContent=cap?'Takımdan ayrıl (kaptanlık en eski oyuncuya geçer)':'Takımdan ayrıl';
  let sure=false;lv.onclick=async()=>{if(!sure){sure=true;lv.textContent='Emin misin? Tekrar bas.';return;}try{await DB.leaveTeam();myTeamCache=null;renderTeam();}catch(e){lv.textContent=errText(e);}};
  side.appendChild(lv);
}

// =====================================================================
// ---------- Lig sekmesi ----------
// =====================================================================
const TIER_NAMES=['Elit Lig','2. Lig','3. Lig','4. Lig','5. Lig','6. Lig'];
async function renderLeague(){
  const box=$('leagueGrid');box.innerHTML='<p class="note">Yükleniyor…</p>';
  let ts,mt;try{[ts,mt]=await Promise.all([DB.teams(),DB.myTeam().catch(()=>null)]);}catch(e){box.innerHTML='';const p=document.createElement('p');p.className='err';p.textContent='Lig bilgisi alınamadı: '+errText(e);box.appendChild(p);return;}
  myTeamCache=mt;box.innerHTML='';const myId=mt&&mt.team&&mt.team.id;
  for(let tier=1;tier<=6;tier++){
    const list=ts.filter(t=>t.tier===tier).sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf);
    const sec=document.createElement('section');sec.className='ltier'+(list.some(t=>t.id===myId)?' mine':'');
    sec.innerHTML=`<header><img src="assets/tier${tier}.webp" alt=""><b>${tier}. Kademe · ${TIER_NAMES[tier-1]}</b><span>${list.length} takım${tier===1?' · şampiyonluk':tier===6?' · herkes buradan başlar':' · ↑ ilk 2 · ↓ son 2'}</span></header>`;
    if(list.length){const wrap=document.createElement('div');wrap.style.overflowX='auto';const tb=document.createElement('table');
      tb.innerHTML='<tr><th>#</th><th>Takım</th><th class="n">O</th><th class="n">G</th><th class="n">B</th><th class="n">M</th><th class="n">AV</th><th class="n">P</th></tr>';
      list.forEach((t,i)=>{const tr=document.createElement('tr');if(t.id===myId)tr.className='me';
        tr.innerHTML=`<td>${i+1}</td><td></td><td class="n">${t.played}</td><td class="n">${t.won}</td><td class="n">${t.drawn}</td><td class="n">${t.lost}</td><td class="n">${t.gf-t.ga}</td><td class="n">${t.points}</td>`;
        tr.children[1].textContent=t.name+' ('+t.abbr+')';tb.appendChild(tr);});
      wrap.appendChild(tb);sec.appendChild(wrap);}
    box.appendChild(sec);}
}

// =====================================================================
// ---------- Açılış ----------
// =====================================================================
$('gateForm').addEventListener('submit',async e=>{e.preventDefault();
  const n=cleanStr($('gNick').value,14).trim();if(n.length<2){$('gateMsg').textContent='Takma ad en az 2 karakter olmalı.';return;}
  prof.name=n;save();DB.saveProfile().catch(()=>{});enterMain();});
function enterMain(){renderMe();showMain('rooms');netConnect();DB.myTeam().then(m=>{myTeamCache=m;renderMe();}).catch(()=>{});}
(async()=>{
  show('gate');$('gNick').value=prof.name||'';$('gateGo').disabled=true;$('gateMsg').textContent='Bağlanıyor…';
  try{await backendInit();
    const p=await DB.getProfile().catch(()=>null);
    if(p){prof.name=p.nick||prof.name;prof.avatar=p.avatar||prof.avatar;prof.nameColor=p.name_color||prof.nameColor;save();}
    $('gateGo').disabled=false;$('gateMsg').textContent='Nick\'le hemen girersin. Google ile bağlarsan profilin, takımın ve satın aldıkların her cihazda seninle gelir.';
    if(prof.name&&p){$('gNick').value=prof.name;enterMain();}
  }catch(e){console.error(e);$('gateGo').disabled=false;$('gateMsg').textContent='Sunucuya bağlanılamadı ('+errText(e)+'). Yine de girip botlara karşı oynayabilirsin.';}
})();

if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
// ---------- Telefonda yakınlaştırma koruması ----------
['gesturestart','gesturechange'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
{let lastTap=0;$('game').addEventListener('touchend',e=>{const n=Date.now();if(n-lastTap<320&&e.target.tagName!=='INPUT')e.preventDefault();lastTap=n;},{passive:false});}
function resetZoom(){const m=document.querySelector('meta[name=viewport]');if(!m)return;const c=m.content;m.content=c.replace('initial-scale=1,','initial-scale=1.0001,');setTimeout(()=>{m.content=c;},60);}
if(window.visualViewport){let zt=0;visualViewport.addEventListener('resize',()=>{clearTimeout(zt);zt=setTimeout(()=>{if(visualViewport.scale>1.02&&!$('game').hidden&&document.activeElement?.tagName!=='INPUT')resetZoom();},700);});}
// ---------- Ana ekrana ekle (uygulama gibi) ----------
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let installEvt=null;
function showInstall(){let later=0;try{later=Number(localStorage.getItem('uzk-install-later')||0);}catch(e){}
  $('installBox').hidden=isStandalone()||Date.now()-later<3*86400e3||!(installEvt||isIOS);}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;showInstall();});
addEventListener('appinstalled',()=>{installEvt=null;$('installBox').hidden=true;});
$('installBtn').onclick=async()=>{if(installEvt){installEvt.prompt();try{await installEvt.userChoice;}catch(e){}installEvt=null;showInstall();}else $('iosInstall').hidden=false;};
$('installLater').onclick=()=>{try{localStorage.setItem('uzk-install-later',String(Date.now()));}catch(e){}$('installBox').hidden=true;};
$('iosInstallOk').onclick=()=>{$('iosInstall').hidden=true;};
$('iosInstall').addEventListener('click',e=>{if(e.target.id==='iosInstall')$('iosInstall').hidden=true;});
showInstall();

// =====================================================================
// ---------- Reklam alanları ve çerez onayı ----------
// Reklam ağı onaylanınca config.js içindeki ads ayarı doldurulur; boşken hiçbir reklam yüklenmez.
// =====================================================================
const ADS=Object.assign({provider:'',interstitialEvery:3},CFG.ads||{});
let consent=null;try{consent=localStorage.getItem('uzk-consent');}catch(e){}
function showConsent(){$('consent').hidden=false;}
function setConsent(v){consent=v;try{localStorage.setItem('uzk-consent',v);}catch(e){}$('consent').hidden=true;adsInit();}
$('consentAll').onclick=()=>setConsent('all');$('consentMin').onclick=()=>setConsent('min');$('openConsent').onclick=showConsent;
if(!consent)showConsent();
const adsOn=()=>!!ADS.provider&&!prof.premium&&!!consent;
let adsReady=false,matchesSinceAd=0;
function adsInit(){
  if(!adsOn()||adsReady)return;adsReady=true;
  // Buraya reklam ağının kendi yükleme kodu gelecek (kişiselleştirme: consent==='all').
  $('adLobby').hidden=false;$('adReward').hidden=false;
}
function adAfterMatch(){if(!adsOn())return;if(++matchesSinceAd<ADS.interstitialEvery)return;matchesSinceAd=0;/* ağın maç arası reklam çağrısı */}
$('adReward').onclick=()=>{/* ağın ödüllü video çağrısı; izlenince 1 günlük deneme verilir */};
adsInit();
