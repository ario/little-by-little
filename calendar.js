import {cat,bricks,icon} from './icons.js';
import {add,number,monday,monthMove,monthCells,label,bounds,clock,until,dayDistance,localDay} from './calendar-date.js';
import {readCalendar,calendarVoice} from './transport.js';
import {readAloud,stopSpeech} from './audio.js';

const profiles=[{id:'negaan',name:'Negaan',theme:'cat'},{id:'neev',name:'Neev',theme:'bricks'}];
const $=id=>document.getElementById(id);
let active=false,data=null,loading=false,stamp='',timer,requestID=0;
const views=new Map(),metrics={renders:[],errors:[]};
const weekNames=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function button(text,action,cls=''){const e=node('button',cls,text);e.type='button';e.dataset.action=action;return e;}
function pictureButton(text,action,cls,glyph,caption=false){const e=button('',action,cls+' picture-control');e.innerHTML=icon(glyph,'control-glyph');if(caption)e.append(node('span','control-caption',text));e.setAttribute('aria-label',text);e.title=text;return e;}
function pict(title){const t=title.toLowerCase();if(/halloween|costume/.test(t))return '🎃';if(/christmas|santa/.test(t))return '🎄';if(/nowruz|norooz|new year/.test(t))return '🌱';if(/birthday|party/.test(t))return '🎂';if(/swim|pool/.test(t))return '🏊';if(/soccer|football|sport/.test(t))return '⚽';if(/dance|ballet/.test(t))return '🩰';if(/school|class|library|read/.test(t))return '📚';if(/trip|travel|vacation|flight/.test(t))return '🧳';if(/doctor|dentist|checkup/.test(t))return '🩺';if(/music|piano/.test(t))return '🎵';if(/park|play|friend/.test(t))return '🛝';return '⭐';}
function events(view,day){return (data?.children?.[view.id]||[]).filter(e=>{const [a,b]=bounds(e);return a<=day&&day<b;}).sort((a,b)=>Number(b.all_day)-Number(a.all_day)||a.start.localeCompare(b.start)||a.title.localeCompare(b.title));}
function available(day){return data?.available&&day>=data.range_start&&day<data.range_end;}
function selectedToday(){return data?.today||localDay(new Date());}
function eventTime(e){if(!e.all_day&&Date.parse(e.start)===Date.parse(e.end))return clock(e.start);if(e.all_day){const [a,b]=bounds(e);return number(b)-number(a)>1?`${label(a,{month:'short',day:'numeric'})} – ${label(add(b,-1),{month:'short',day:'numeric'})} · All day`:'All day';}const [a,b]=bounds(e);return number(b)-number(a)>1?`${label(a,{month:'short',day:'numeric'})}, ${clock(e.start)} – ${label(localDay(e.end),{month:'short',day:'numeric'})}, ${clock(e.end)}`:`${clock(e.start)} – ${clock(e.end)}`;}
function eventButton(event,upcoming=false){const e=button('','event','calendar-event');e.dataset.event=event.id;e.append(node('span','event-picture',pict(event.title)));const words=node('span','event-words');words.append(node('strong','',event.title),node('span','event-time',upcoming?`${label(bounds(event)[0],{weekday:'short',month:'short',day:'numeric'})} · ${until(event,selectedToday()).text}`:eventTime(event)));e.append(words,node('span','event-open','›'));return e;}
function build(profile){const section=node('section',`child calendar-child ${profile.theme}`);section.dataset.calendarChild=profile.id;section.setAttribute('aria-label',`${profile.name}’s calendar`);
 const head=node('div','calendar-head'),mascot=node('div','mascot');mascot.innerHTML=profile.theme==='cat'?cat(false):bricks(false);const names=node('div');names.append(node('h2','',profile.name),node('p','calendar-subtitle','A little look ahead'));head.append(mascot,names);
 const home=pictureButton('Today','today','calendar-today','today',true);home.setAttribute('aria-label',`${profile.name}: Go to today`);head.append(home);
 const tools=node('nav','calendar-controls');tools.setAttribute('aria-label',`${profile.name} calendar view`);const zoom=node('div','calendar-zoom');for(const kind of ['day','week','month']){const b=pictureButton(kind[0].toUpperCase()+kind.slice(1),'zoom','',kind==='month'?'calendar':kind,true);b.dataset.zoom=kind;zoom.append(b);}tools.append(zoom);
 const nav=node('div','calendar-paging');for(const [text,action] of [['‹','previous'],['›','next']]){const b=button(text,action);b.setAttribute('aria-label',`${profile.name}: ${action} period`);nav.append(b);}tools.append(nav);
 const content=node('div','calendar-content');content.tabIndex=0;content.setAttribute('aria-label',`${profile.name} calendar dates and events`);
 const status=node('p','calendar-status');status.setAttribute('role','status');section.append(head,tools,content,status);
 const view={...profile,section,day:selectedToday(),zoom:'day',detail:null,opener:null};views.set(profile.id,view);
 section.addEventListener('click',e=>click(view,e));
 let pointer=null;
 content.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(pointer){pointer=null;return;}pointer={id:e.pointerId,x:e.clientX,y:e.clientY,vertical:false};});
 content.addEventListener('pointermove',e=>{if(pointer?.id===e.pointerId&&Math.abs(e.clientY-pointer.y)>15)pointer.vertical=true;});
 content.addEventListener('pointercancel',()=>pointer=null);
 content.addEventListener('pointerup',e=>{if(pointer?.id!==e.pointerId)return;const p=pointer;pointer=null;if(p.vertical){view.suppressClick=true;setTimeout(()=>view.suppressClick=false,0);return;}if(!p.vertical&&!view.detail&&Math.abs(e.clientX-p.x)>70&&Math.abs(e.clientY-p.y)<25){view.suppressClick=true;setTimeout(()=>view.suppressClick=false,0);move(view,e.clientX<p.x?1:-1);}});
 return section;
}
function move(view,n){stopSpeech();view.detail=null;const next=view.zoom==='month'?monthMove(view.day,n):add(view.day,n*(view.zoom==='week'?7:1));if(available(next)){view.day=next;render(view);readWords(view,viewWords(view));}else{view.section.querySelector('.calendar-status').textContent='That date is outside your saved calendar.';readWords(view,'That date is outside your saved calendar.','That date is outside your saved calendar.');}}
async function readWords(view,text,restore=null){
 if(view.id!=='neev'||!text)return;
 const reading=(view.reading||0)+1;view.reading=reading;
 view.section.querySelector('.calendar-status').textContent='Getting your voice ready…';
 const ok=await readAloud(text,document.body.dataset.period,ui_text=>calendarVoice({child:'neev',ui_text}),msg=>{if(view.reading===reading)view.section.querySelector('.calendar-status').textContent=msg;});
 if(view.reading===reading&&ok!==false){if(restore)view.section.querySelector('.calendar-status').textContent=restore;else statusText(view);}
}
function viewWords(view){return view.detail?view.section.querySelector('.calendar-detail').innerText.replace('‹ Back to calendar','').replace('Hear it again',''):view.zoom==='day'?`${dayDistance(view.day,selectedToday())}. ${label(view.day)}.`:view.section.querySelector('.calendar-range')?.textContent;}
function speak(view,event=null){return readWords(view,event?viewWords(view):`${label(view.day)}. ${view.section.querySelector('.calendar-agenda')?.innerText||''}`);}
function staticWords(view,target){
 if(target.closest('.mascot'))return `${view.name}. A little look ahead.`;
 if(target.closest('.date-number'))return label(view.day);
 if(target.closest('.sleep-moons'))return view.section.querySelector('.detail-countdown').textContent;
 const words=target.closest('h2,h3,p,strong,span,button');
 return words?.getAttribute('aria-label')||words?.innerText||viewWords(view);
}
function click(view,e){if(view.suppressClick){e.preventDefault();return;}const target=e.target.closest('button[data-action]');
 if(!target){readWords(view,staticWords(view,e.target));return;}
 const action=target.dataset.action;
 if(action==='hear'){speak(view,view.detail);return;}
 stopSpeech();
 if(action==='previous'||action==='next'){move(view,action==='next'?1:-1);return;}
 if(action==='today'){view.day=selectedToday();view.zoom='day';view.detail=null;}
 if(action==='zoom'){view.zoom=target.dataset.zoom;view.detail=null;}
 if(action==='date'){view.day=target.dataset.date;view.zoom='day';view.detail=null;}
 if(action==='event'){view.opener=target.dataset.event;view.detail=(data?.children[view.id]||[]).find(x=>x.id===target.dataset.event);}
 if(action==='close')view.detail=null;
 render(view);
 if(action==='event'&&view.detail){view.section.querySelector('.detail-close').focus({preventScroll:true});speak(view,view.detail);}
 else if(view.zoom==='day')speak(view);else readWords(view,`${view.zoom}. ${viewWords(view)}`);
 if(action==='close'&&view.opener)view.section.querySelector(`[data-event="${view.opener}"]`)?.focus({preventScroll:true});
}
function statusText(view){const e=view.section.querySelector('.calendar-status');e.classList.toggle('needs-update',Boolean(data?.stale));if(!data?.available)e.textContent=data?.expired?'Your calendar needs an update. Ask a grown-up to reconnect it.':'Your calendar is connecting. Ask a grown-up to check back.';else if(data.stale)e.textContent=`Plans may have changed. Ask a grown-up to check. Saved calendar · last updated ${label(localDay(data.generated_at),{month:'short',day:'numeric'})} at ${clock(data.generated_at)}`;else e.textContent=data.demo?'Example calendar · real plans stay private':view.id==='neev'?'Tap anything in your section to hear it.':'Tap an event to see more.';}
function render(view){const start=performance.now(),content=view.section.querySelector('.calendar-content');content.replaceChildren();content.scrollTop=0;view.section.classList.toggle('show-detail',!!view.detail);
 for(const b of view.section.querySelectorAll('[data-zoom]'))b.setAttribute('aria-pressed',String(b.dataset.zoom===view.zoom));
 for(const b of view.section.querySelectorAll('[data-action="previous"],[data-action="next"]')){const n=b.dataset.action==='next'?1:-1;b.disabled=!available(view.zoom==='month'?monthMove(view.day,n):add(view.day,n*(view.zoom==='week'?7:1)));}
 statusText(view);
 if(view.detail){detail(view,content);return;}
 if(!data?.available){content.append(node('div','calendar-empty',data?.expired?'Let’s check with a grown-up for today’s plans.':'Your plans will appear here when the calendar connects.'));return;}
 if(view.zoom==='day')day(view,content);else if(view.zoom==='week')week(view,content);else month(view,content);
 metrics.renders.push(performance.now()-start);if(metrics.renders.length>100)metrics.renders.shift();
}
function day(view,content){const layout=node('div','calendar-day'),anchor=node('div','date-anchor');anchor.append(node('span','date-relative',dayDistance(view.day,selectedToday())),node('h3','',label(view.day,{weekday:'long'})),node('strong','date-number',String(Number(view.day.slice(8)))),node('span','date-month',label(view.day,{month:'long',year:'numeric'})));
 if(view.id==='neev'){const hear=pictureButton('Hear this day','hear','hear-day','speaker');anchor.append(hear);}layout.append(anchor);
 const agenda=node('div','calendar-agenda');agenda.append(node('h3','',view.day===selectedToday()?'On your day':'On this day'));const list=events(view,view.day);
 if(!available(view.day))agenda.append(node('p','calendar-empty','That date is outside the saved calendar.'));
 else if(!list.length)agenda.append(node('p','calendar-empty',data.stale?'No plans in the saved calendar. It may need an update.':'No plans on your calendar. Room for a little adventure!'));
 else for(const event of list)agenda.append(eventButton(event));layout.append(agenda);content.append(layout);
 const future=(data.children[view.id]||[]).filter(e=>bounds(e)[0]>selectedToday()).sort((a,b)=>a.start.localeCompare(b.start));
 const big=future.filter(e=>/birthday|halloween|christmas|nowruz|norooz/i.test(e.title)).slice(0,4);
 if(big.length){const section=node('section','big-days');section.append(node('h3','','Big days ahead'));const cards=node('div','big-day-grid');for(const e of big){const b=button('','event','big-day');b.dataset.event=e.id;b.append(node('span','',pict(e.title)),node('strong','',e.title),node('span','',until(e,selectedToday()).text));cards.append(b);}section.append(cards);content.append(section);}
 const next=future.filter(e=>!big.includes(e)).slice(0,4);
 if(next.length){const ahead=node('div','calendar-ahead');ahead.append(node('h3','','Coming up'));for(const e of next)ahead.append(eventButton(e,true));content.append(ahead);}
}
function week(view,content){const first=monday(view.day),heading=node('h3','calendar-range',`${label(first,{month:'short',day:'numeric'})} – ${label(add(first,6),{month:'short',day:'numeric',year:'numeric'})}`);content.append(heading);const grid=node('div','calendar-week');
 for(let i=0;i<7;i++){const d=add(first,i),row=button('','date','week-day');row.dataset.date=d;row.disabled=!available(d);row.classList.toggle('is-today',d===selectedToday());row.classList.toggle('weekend',i>4);const date=node('span','week-date');date.append(node('strong','',weekNames[i]),node('span','',label(d,{month:'short',day:'numeric'})+(d===selectedToday()?' · Today':i>4?' · Weekend':'')));row.append(date);const list=events(view,d),plans=node('span','week-plans');plans.textContent=!available(d)?'Not saved':list.length?list.slice(0,2).map(e=>`${pict(e.title)} ${e.title}`).join(' · ')+(list.length>2?` +${list.length-2} more`:''):'No plans';row.append(plans);grid.append(row);}content.append(grid);
}
function month(view,content){content.append(node('h3','calendar-range',label(view.day,{month:'long',year:'numeric'})));const grid=node('div','calendar-month');for(const name of weekNames){const h=node('span','month-weekday',name.slice(0,3));h.setAttribute('aria-label',name);grid.append(h);}for(const d of monthCells(view.day)){const cell=button('','date','month-day');cell.dataset.date=d;cell.disabled=!available(d);cell.classList.toggle('is-today',d===selectedToday());cell.classList.toggle('outside-month',d.slice(0,7)!==view.day.slice(0,7));const list=events(view,d);cell.setAttribute('aria-label',`${label(d)}${d===selectedToday()?', Today':''}, ${list.length} events`);cell.append(node('strong','month-number',String(Number(d.slice(8)))));if(d.slice(0,7)!==view.day.slice(0,7))cell.append(node('span','outside-label',label(d,{month:'short'})));if(d===selectedToday())cell.append(node('span','today-label','Today'));if(list.length){cell.append(node('span','month-pictures',list.slice(0,2).map(e=>pict(e.title)).join(' ')),node('span','month-event-title',list[0].title));if(list.length>1)cell.append(node('span','month-count',`+${list.length-1}`));}grid.append(cell);}content.append(grid);}
function detail(view,content){const e=view.detail,box=node('article','calendar-detail');box.append(pictureButton('Back to calendar','close','detail-close','back'));box.append(node('div','detail-picture',pict(e.title)),node('h3','detail-title',e.title));const count=until(e,selectedToday());box.append(node('p','detail-countdown',count.text));if(count.n>0&&count.n<=14)box.append(node('div','sleep-moons','☾ '.repeat(count.n).trim()));if(count.n>=14){const weeks=Math.floor(count.n/7),days=count.n%7;box.append(node('p','sleep-weeks',`${weeks} weeks${days?` and ${days} ${days===1?'day':'days'}`:''}`));}box.append(node('p','detail-date',label(bounds(e)[0])),node('p','detail-time',eventTime(e)));if(e.location)box.append(node('p','detail-location',`📍 ${e.location}`));if(e.description)box.append(node('p','detail-description',e.description));if(view.id==='neev')box.append(pictureButton('Hear it again','hear','hear-day','speaker'));content.append(box);}
async function load(){if(loading)return;loading=true;const id=++requestID;try{const next=await readCalendar();if(id!==requestID)return;const token=JSON.stringify(next);data=next;if(token!==stamp){stamp=token;for(const view of views.values()){if(view.day===view.lastToday||!view.lastToday)view.day=selectedToday();view.lastToday=selectedToday();if(view.detail){view.detail=(data.children[view.id]||[]).find(e=>e.id===view.detail.id)||null;}render(view);}}}catch(error){metrics.errors.push(error.message);if(error.status===401){data=null;stamp='';for(const v of views.values()){v.detail=null;render(v);v.section.querySelector('.calendar-status').textContent='Connect this phone again in Parents.';}stopSpeech();}else if(data){stamp='';data={...data,stale:true};const expires=!data.expired&&!data.demo&&Date.now()-Date.parse(data.generated_at)>=72*3600000;if(expires){data={...data,available:false,expired:true,children:{negaan:[],neev:[]}};for(const view of views.values())view.detail=null;stopSpeech();}for(const view of views.values())expires?render(view):statusText(view);}else for(const v of views.values())statusText(v);}finally{loading=false;}}
export function showCalendar(show){active=show;$('calendar-board').hidden=!show;document.body.classList.toggle('calendar-mode',show);stopSpeech();if(show){if(!views.size)$('calendar-board').replaceChildren(...profiles.map(build));load();clearInterval(timer);timer=setInterval(load,60000);}else{clearInterval(timer);}}
export function calendarVisible(){return active;}
export function refreshCalendar(){if(active)load();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSpeech();else refreshCalendar();});
window.__CALENDAR_QA__={views:()=>[...views.values()].map(({id,day,zoom,detail})=>({id,day,zoom,event:detail?.id||null})),metrics:()=>structuredClone(metrics),snapshot:()=>structuredClone(data)};
