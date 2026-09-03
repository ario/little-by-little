import {icon} from './icons.js';
import {readVolume,writeVolume} from './transport.js';
import {unlock} from './audio.js';

const control=document.getElementById('sound-control'),button=document.getElementById('volume-button');
const panel=document.getElementById('volume-panel'),slider=document.getElementById('volume-slider');
const value=document.getElementById('volume-value'),status=document.getElementById('volume-status');
let revision=0,pending=null,writing=false,timer;
function render(percent){
  slider.value=String(percent);slider.style.setProperty('--level',`${percent}%`);
  slider.setAttribute('aria-valuetext',`${percent} percent`);value.value=`${percent}%`;
  button.innerHTML=icon(percent===0?'mute':'speaker');button.setAttribute('aria-label',`Volume, ${percent}%`);
}
async function refresh(){
  if(writing||pending!==null)return;
  const at=revision;
  try{const percent=await readVolume();if(at===revision){render(percent);status.textContent='';}}
  catch{if(at===revision)status.textContent='Could not reach the speaker. Try again.';}
}
async function flush(){
  clearTimeout(timer);if(writing)return;writing=true;
  try{
    while(pending!==null){
      const percent=pending,at=revision;pending=null;
      try{const saved=await writeVolume(percent);if(at===revision){render(saved);status.textContent='';}}
      catch{
        if(at===revision){
          status.textContent='Could not save the volume. Try again.';
          try{const actual=await readVolume();if(at===revision)render(actual);}catch{}
        }
      }
    }
  }finally{writing=false;}
}
function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');}
button.addEventListener('click',()=>{
  panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));
  if(!panel.hidden){refresh();slider.focus({preventScroll:true});}
});
slider.addEventListener('input',()=>{
  revision++;pending=Number(slider.value);render(pending);unlock();status.textContent='';
  clearTimeout(timer);timer=setTimeout(flush,120);
});
slider.addEventListener('change',flush);
document.addEventListener('pointerdown',e=>{if(!control.contains(e.target))close();});
control.addEventListener('keydown',e=>{if(e.key==='Escape'){close();button.focus();}});
render(70);refresh();
