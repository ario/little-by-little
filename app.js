import {icon,cat,bricks} from './icons.js';
import {unlock,sound,narrate,stopSpeech,setMuted,audioStats} from './audio.js';
import {request,subscribe} from './transport.js';
const $=id=>document.getElementById(id);
function textIfChanged(el,value){if(el.textContent!==value)el.textContent=value;}
let state=null, queue=Promise.resolve(), inflight=0, muted=false, practiceSchool=true, noticeTimer, partyTimer;
const pointers=new Map(), rows=new Map(), metrics={feedback:[], commits:[], frames:[], errors:[], gestures:0};
const partyNames=new Set();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let particles=[], raf=0,lastFrame=0;
const canvas=$('confetti'), ctx=canvas.getContext('2d',{alpha:true});
const colors=['#edacc8','#f2bd70','#7abed7','#b8d5a0','#b8a5da'];
function setPeriod(period){
  document.body.dataset.period=period;
  const root=document.documentElement;if(root.dataset.period===period)return;
  root.dataset.period=period;root.style.colorScheme=period==='evening'?'dark':'light';
  const base={morning:'#fff9e9',afternoon:'#e4d4b8',evening:'#1d1612'}[period];
  root.style.backgroundColor=base;
  document.querySelector('meta[name="theme-color"]').content=base;
}
function canvasSize(){canvas.width=Math.round(innerWidth*.5);canvas.height=Math.round(innerHeight*.5);}
canvasSize();addEventListener('resize',canvasSize);
function confetti(x,y,large=false){
  if(reduced.matches)return;
  const night=state?.context?.routine==='evening';
  const palette=night?['#b17e59','#c09563','#ba8c73','#958773','#cca176']:colors;
  const count=large?(night?60:130):18;
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2;
    particles.push({x:x*.5,y:y*.5,vx:Math.cos(a)*(large?145:75),vy:Math.sin(a)*(large?170:100)-(large?90:40),age:0,life:large?3.8:1,color:palette[i%5],r:Math.random()*6.3,size:large?5:3});
  }
  particles=particles.slice(-240);
  if(!raf){lastFrame=performance.now();raf=requestAnimationFrame(draw);}
}
function draw(now){
  const delta=now-lastFrame,dt=Math.min(delta/1000,.05);lastFrame=now;
  metrics.frames.push(delta);if(metrics.frames.length>2400)metrics.frames.shift();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  particles=particles.filter(p=>p.age<p.life);
  for(const p of particles){p.age+=dt;p.vy+=100*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=dt*3;
    ctx.globalAlpha=Math.min(1,(p.life-p.age)*2);ctx.fillStyle=p.color;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*1.5);ctx.restore();}
  ctx.globalAlpha=1;if(particles.length)raf=requestAnimationFrame(draw);else{raf=0;ctx.clearRect(0,0,canvas.width,canvas.height);}
}
function notice(text){$('notice').textContent=text;$('notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').classList.remove('visible'),4500);}
function party(child){
  const name=state.children.find(c=>c.id===child)?.name;if(!name)return;
  partyNames.add(name);$('party-name').textContent=[...partyNames].join(' & ');
  $('party-kicker').textContent=state.context.routine==='evening'?'Ready for sweet dreams':'Look at you go!';
  $('party').classList.add('visible');confetti(innerWidth*.5,innerHeight*.48,true);sound(state.context.routine,true);
  clearTimeout(partyTimer);partyTimer=setTimeout(()=>{$('party').classList.remove('visible');partyNames.clear();},4000);
}
async function api(path,body){
  const {ok,payload}=await request(path,body);
  if(!ok){if(payload.state)render(payload.state,true);throw new Error(payload.error||'Please try again.');}
  return payload;
}
function timeLabel(seconds){return new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',minute:'2-digit'}).format(new Date(seconds*1000));}
function buildChild(child){
  const el=document.createElement('section');el.className=`child ${child.theme}`;el.dataset.child=child.id;
  el.innerHTML=`<div class="child-head"><div class="mascot"></div><div class="name-block"><h2></h2><p></p></div><div class="progress-wrap"><div class="progress-text"></div><div class="progress-dots"></div></div></div><div class="task-list"></div><div class="child-foot"><span></span><strong></strong></div>`;
  el.querySelector('h2').textContent=child.name;
  el.querySelector('.child-foot span').textContent=child.narration?'Tap to hear · swipe to finish':'Swipe to finish · tap a check to undo';
  for(const task of child.tasks){
    const row=document.createElement('button');row.className='task';row.dataset.task=task.id;row.dataset.child=child.id;
    row.innerHTML=`<span class="task-fill"></span><span class="task-icon">${icon(task.icon)}</span><span class="task-text"></span><span class="task-affordance"></span>`;
    row.querySelector('.task-text').textContent=task.text;
    row.addEventListener('pointerdown',pointerDown);row.addEventListener('pointermove',pointerMove);
    row.addEventListener('pointerup',pointerUp);row.addEventListener('pointercancel',pointerCancel);
    row.addEventListener('lostpointercapture',pointerCancel);
    row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();unlock();const t=findTask(child.id,task.id);if(t)complete(row,!t.done);}});
    row.addEventListener('click',e=>e.preventDefault());
    rows.set(`${child.id}:${task.id}`,row);el.querySelector('.task-list').append(row);
  }
  return el;
}
function render(next,force=false){
  if(!force&&state&&state.context?.key===next.context?.key&&next.revision<state.revision)return;
  const keyChanged=state?.context?.key!==next.context?.key;
  if(keyChanged){for(const p of pointers.values())resetDrag(p.row);pointers.clear();stopSpeech();clearTimeout(partyTimer);partyNames.clear();$('party').classList.remove('visible');particles=[];ctx.clearRect(0,0,canvas.width,canvas.height);}
  state=next;textIfChanged($('clock'),timeLabel(state.server_time));
  const current=state.context;
  $('board').hidden=!current;$('pause').hidden=!!current;
  $('practice-bar').hidden=!current?.practice;document.body.classList.toggle('practice',!!current?.practice);
  if(!current){
    const period=document.body.dataset.period||'morning';setPeriod(period);$('greeting').textContent='Little by little';$('day-label').textContent='One small thing at a time.';
    $('period-icon').innerHTML=icon(period==='evening'?'moon':period==='afternoon'?'afternoon':'sun');$('pause-art').innerHTML=cat(true);
    if(state.calendar_unknown)$('pause-copy').textContent='Your calendar needs an update. You can still practice a routine.';
    return;
  }
  setPeriod(current.routine);
  const greetings={morning:'Hello, new day!',afternoon:'Welcome home!',evening:'Time to wind down'};
  $('greeting').textContent=greetings[current.routine];
  if(keyChanged)$('period-icon').innerHTML=icon(current.routine==='morning'?'sun':current.routine==='evening'?'moon':'afternoon');
  $('day-label').textContent=current.preview_label||(current.practice?'A fresh list to try together':new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',weekday:'long',month:'short',day:'numeric'}).format(new Date(state.server_time*1000))+(current.school_today?' · A school day':' · An easy day'));
  if(keyChanged||!$('board').children.length){rows.clear();$('board').replaceChildren(...state.children.map(buildChild));}
  for(const child of state.children){
    const section=$('board').querySelector(`[data-child="${child.id}"]`),done=child.tasks.filter(t=>t.done).length;
    section.classList.toggle('finished',child.complete);
    const mascot=section.querySelector('.mascot');if(keyChanged||!mascot.innerHTML)mascot.innerHTML=child.theme==='cat'?cat(current.routine==='evening'):bricks(current.routine==='evening');
    section.querySelector('.name-block p').textContent=child.complete?(current.routine==='evening'?'Cozy, ready, all done.':'You did every little thing!'):(current.routine==='morning'?'Let’s get ready.':current.routine==='afternoon'?'A little reset, then play.':'Let’s get cozy.');
    textIfChanged(section.querySelector('.progress-text'),child.complete?'All done!':`${done} of ${child.tasks.length} done`);
    const dots=section.querySelector('.progress-dots'),pattern=child.tasks.map(t=>t.done?'1':'0').join('');
    if(dots.dataset.pattern!==pattern){dots.innerHTML=child.tasks.map(t=>`<i class="${t.done?'filled':''}"></i>`).join('');dots.dataset.pattern=pattern;}
    let foot=child.complete?'Beautifully done.':'';
    if(state.close_at&&!current.practice){const left=Math.max(0,Math.ceil((state.close_at-state.server_time)/60));foot=`Newspaper in ${left} min`;}
    textIfChanged(section.querySelector('.child-foot strong'),foot);
    for(const task of child.tasks){
      const row=rows.get(`${child.id}:${task.id}`);if(row.classList.contains('pending'))continue;
      row.classList.toggle('done',task.done);
      if(row.dataset.visual!==String(task.done)){
        row.setAttribute('aria-pressed',String(task.done));
        row.setAttribute('aria-label',`${task.text}. ${task.done?'Done. Tap to undo.':child.narration?'Tap to hear. Swipe to finish.':'Swipe to finish.'}`);
        row.querySelector('.task-affordance').innerHTML=icon(task.done?'check':child.narration?'speaker':'arrow');
        row.dataset.visual=String(task.done);
      }
    }
  }
}
function findTask(child,id){return state?.children.find(c=>c.id===child)?.tasks.find(t=>t.id===id);}
function threshold(){return Math.min(innerWidth*.33,Math.hypot(innerWidth,innerHeight)/49*3.5);}
function pointerDown(e){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const row=e.currentTarget;if(row.classList.contains('pending')||[...pointers.values()].some(p=>p.row===row))return;
  unlock();row.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{row,x:e.clientX,y:e.clientY,dx:0,dy:0,vertical:false,started:performance.now()});
}
function pointerMove(e){
  const p=pointers.get(e.pointerId);if(!p)return;
  p.dx=e.clientX-p.x;p.dy=e.clientY-p.y;
  if(Math.abs(p.dy)>22&&Math.abs(p.dy)>Math.abs(p.dx)*1.2)p.vertical=true;
  if(p.vertical||p.row.classList.contains('done'))return;
  if(Math.abs(p.dx)>6){
    const start=performance.now(),progress=Math.min(1,Math.abs(p.dx)/threshold());
    p.row.classList.add('dragging');p.row.classList.toggle('ready',progress>=1);
    const fill=p.row.querySelector('.task-fill');fill.style.transformOrigin=p.dx<0?'right':'left';fill.style.transform=`scaleX(${progress})`;
    requestAnimationFrame(()=>{metrics.feedback.push(performance.now()-start);if(metrics.feedback.length>1000)metrics.feedback.shift();});
  }
}
function resetDrag(row){row.classList.remove('dragging','ready');row.querySelector('.task-fill').style.transform='scaleX(0)';}
function pointerCancel(e){const p=pointers.get(e.pointerId);if(p){resetDrag(p.row);pointers.delete(e.pointerId);}}
function pointerUp(e){
  const p=pointers.get(e.pointerId);if(!p)return;pointers.delete(e.pointerId);resetDrag(p.row);
  const task=findTask(p.row.dataset.child,p.row.dataset.task);if(!task)return;
  const isTap=Math.hypot(e.clientX-p.x,e.clientY-p.y)<12&&!p.vertical;
  if(task.done&&isTap){stopSpeech();complete(p.row,false);return;}
  if(!task.done&&!p.vertical&&Math.abs(e.clientX-p.x)>=threshold()&&Math.abs(e.clientY-p.y)<threshold()*.65){metrics.gestures++;stopSpeech();complete(p.row,true);return;}
  if(!task.done&&isTap&&state.children.find(c=>c.id===p.row.dataset.child)?.narration)narrate(task,state.context.routine,notice);
}
function complete(row,done){
  if(row.classList.contains('pending'))return;
  const child=row.dataset.child,tid=row.dataset.task,key=state.context.key;
  row.classList.add('pending');row.classList.toggle('done',done);inflight++;
  const started=performance.now();
  queue=queue.then(async()=>{
    try{
      if(state.context?.key!==key)throw new Error('The routine has changed.');
      const task=findTask(child,tid);
      const result=await api('/api/task',{occurrence:key,child,task:tid,done,version:task.version});
      metrics.commits.push(performance.now()-started);row.classList.remove('pending');render(result.state);
      if(result.reward){const r=row.getBoundingClientRect();confetti(r.right-50,r.top+r.height/2);if(!result.celebrate)sound(state.context.routine);}
      if(result.celebrate)party(child);
    }catch(error){row.classList.remove('pending');metrics.errors.push(error.message);notice(`Not saved. ${error.message}`);try{render(await api('/api/state'),true);}catch{row.classList.toggle('done',!done);}}
    finally{inflight--;}
  });
}
function muteRender(){$('mute').innerHTML=icon(muted?'mute':'speaker');$('mute').setAttribute('aria-pressed',String(muted));$('mute').setAttribute('aria-label',muted?'Unmute celebration sounds':'Mute celebration sounds');}
$('mute').addEventListener('click',()=>{muted=!muted;setMuted(muted);try{localStorage.setItem('routines-muted',String(muted));}catch{}muteRender();notice(muted?'Celebrations are quiet. Tap-to-hear still works.':'Celebration sounds are on.');});
try{muted=localStorage.getItem('routines-muted')==='true';}catch{}setMuted(muted);muteRender();
$('practice-open').addEventListener('click',()=>$('practice-dialog').showModal());
$('practice-cancel').addEventListener('click',()=>$('practice-dialog').close());
for(const button of document.querySelectorAll('[data-kind]'))button.addEventListener('click',()=>{practiceSchool=button.dataset.kind==='school';for(const b of document.querySelectorAll('[data-kind]'))b.setAttribute('aria-pressed',String(b===button));document.querySelector('[data-routine="afternoon"]').disabled=!practiceSchool;});
for(const button of document.querySelectorAll('[data-routine]'))button.addEventListener('click',async()=>{try{const s=await api('/api/practice',{routine:button.dataset.routine,school:practiceSchool});$('practice-dialog').close();render(s,true);}catch(e){notice(e.message);}});
$('practice-stop').addEventListener('click',async()=>{stopSpeech();try{render(await api('/api/practice',{routine:null}),true);}catch(e){notice(e.message);}});
$('pause-exit').addEventListener('click',async()=>{try{await api('/api/dismiss',{});notice('Back to Newspaper.');}catch(e){notice(e.message);}});
async function poll(){if(inflight||pointers.size)return;try{render(await api('/api/state'));}catch(e){notice('Reconnecting. Your saved progress is safe.');}}
subscribe(next=>render(next,true));
await poll();setInterval(poll,1200);
// Read-only diagnostics. Inputs are still exercised through actual pointer events.
window.__ROUTINES_QA__={snapshot:()=>structuredClone(state),metrics:()=>structuredClone(metrics),audio:()=>({...audioStats}),threshold,particleCount:()=>particles.length};
addEventListener('error',e=>metrics.errors.push(e.message));
