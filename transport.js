// Static preview: this module has no network, device, calendar or storage access.
import {scenarios,graceSeconds,celebrationSeconds} from './scenarios.js';
let current,selected,listeners=[],serial=0,started,closeDeadline=null;
let awards=new Set(),celebrated=new Set();
const select=document.getElementById('preview-scenario');
for(const example of scenarios){
  const option=document.createElement('option');option.value=example.id;option.textContent=example.label;select.append(option);
}
function snapshot(){
  const now=Date.now();
  current.server_time=current.example_time+(now-started)/1000;
  if(closeDeadline!==null&&now>=closeDeadline){
    current.context=null;current.children=[];current.close_at=null;current.dismissed=true;closeDeadline=null;
  }
  return structuredClone(current);
}
function publish(){const next=snapshot();for(const listener of listeners)listener(next);}
function choose(id){
  const example=scenarios.find(s=>s.id===id)||scenarios[0];selected=example.id;
  current=structuredClone(example.state);current.example_time=current.server_time;
  current.context.key=`preview:${++serial}:${selected}`;started=Date.now();
  awards=new Set();celebrated=new Set();closeDeadline=null;select.value=selected;
  history.replaceState(null,'',`#${selected}`);publish();
}
choose(location.hash.slice(1));
select.addEventListener('change',()=>{choose(select.value);window.scrollTo(0,0);});
document.getElementById('preview-reset').addEventListener('click',()=>choose(selected));
document.getElementById('preview-again').addEventListener('click',()=>{choose(selected);window.scrollTo(0,0);});
addEventListener('hashchange',()=>choose(location.hash.slice(1)));
export function subscribe(listener){listeners.push(listener);}
export async function request(path,body){
  snapshot();
  if(path==='/api/state')return {ok:true,payload:snapshot()};
  if(path!=='/api/task')return {ok:false,payload:{error:'Choose a routine in the preview bar.'}};
  const child=current.children.find(c=>c.id===body?.child);
  const task=child?.tasks.find(t=>t.id===body?.task);
  if(!current.context||body?.occurrence!==current.context.key||!task||body.version!==task.version||typeof body.done!=='boolean'){
    return {ok:false,payload:{error:'This preview has changed. Try again.',state:snapshot()}};
  }
  const key=`${child.id}:${task.id}`,reward=body.done&&!awards.has(key);
  task.done=body.done;task.version++;current.revision++;
  if(body.done)awards.add(key);
  child.complete=child.tasks.every(t=>t.done);
  const celebrate=child.complete&&!celebrated.has(child.id);
  if(celebrate)celebrated.add(child.id);
  if(current.children.every(c=>c.complete)){
    if(closeDeadline===null){
      const delay=graceSeconds+(celebrate?celebrationSeconds:0);
      closeDeadline=Date.now()+delay*1000;current.close_at=current.server_time+delay;
    }
  }else{closeDeadline=null;current.close_at=null;}
  return {ok:true,payload:{state:snapshot(),reward,celebrate,child:child.id}};
}
