let context, muted = false, speech, speechNodes, speechToken = 0;
const voiceBuffers=new Map();
export const audioStats = {sounds:0, narrations:0, playbackStarts:0, lastNarration:null, errors:0};
export function setMuted(value){ muted=value; }
export function unlock(){
  try { context ||= new AudioContext(); if(context.state==='suspended') context.resume(); } catch { /* Voice files work even if Web Audio is unavailable. */ }
}
function tone(frequency,time,length,type,gain,endFrequency){
  if(!context)return;
  const osc=context.createOscillator(), env=context.createGain();
  osc.type=type;osc.frequency.setValueAtTime(frequency,time);
  if(endFrequency)osc.frequency.exponentialRampToValueAtTime(endFrequency,time+length);
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(gain,time+.012);
  env.gain.exponentialRampToValueAtTime(.0001,time+length);
  osc.connect(env).connect(context.destination);osc.start(time);osc.stop(time+length+.02);
  osc.onended=()=>{osc.disconnect();env.disconnect();};
}
export function sound(period,party=false){
  if(muted)return;unlock();if(!context)return;
  audioStats.sounds++;const t=context.currentTime+.015,g=period==='evening'?.023:.065;
  if(party){[523.25,659.25,783.99,1046.5].forEach((n,i)=>{tone(n,t+i*.15,i===3?.62:.19,'triangle',g*1.4);tone(n*2,t+i*.15,.17,'sawtooth',g*.17);});return;}
  const pick=Math.floor(Math.random()*6);
  if(pick===0){tone(470,t,.19,'sine',g,110);tone(290,t+.16,.22,'sine',g,90);}
  if(pick===1){tone(170,t,.42,'triangle',g,760);tone(670,t+.15,.25,'sine',g*.5,160);}
  if(pick===2){[660,880,1100].forEach((n,i)=>tone(n,t+i*.09,.17,'sine',g*.8));}
  if(pick===3){tone(640,t,.28,'triangle',g,280);tone(300,t+.18,.21,'sine',g*.7,420);}
  if(pick===4){[0,.1,.23].forEach((a,i)=>tone(310-i*40,t+a,.1,'square',g*.22,170));}
  if(pick===5){tone(1000,t,.16,'sine',g*.5,600);tone(1250,t+.1,.2,'sine',g*.5,750);}
}
export function stopSpeech(){
  speechToken++;
  if(speech){speech.pause();speech.currentTime=0;speech=null;}
  if(speechNodes){try{speechNodes.source.stop();}catch{}speechNodes.source.disconnect();speechNodes.gain.disconnect();speechNodes=null;}
}
export async function narrate(task,period,onError){
  stopSpeech();const token=speechToken;
  audioStats.narrations++;audioStats.lastNarration=task.id;
  const url=new URL(`./voice/${task.id}.mp3`,import.meta.url),level=period==='evening'?.55:.85;
  try{
    unlock();
    if(context){
      // Decode each short bundled clip once. A gain node also works on iOS,
      // where HTMLMediaElement.volume is ignored.
      if(!voiceBuffers.has(task.id)){
        const pending=fetch(url,{signal:AbortSignal.timeout(6000)}).then(r=>{
          if(!r.ok)throw new Error('Voice unavailable');return r.arrayBuffer();
        }).then(data=>context.decodeAudioData(data));
        voiceBuffers.set(task.id,pending);
        pending.catch(()=>voiceBuffers.delete(task.id));
      }
      const buffer=await voiceBuffers.get(task.id);
      if(token!==speechToken)return;
      await context.resume();if(token!==speechToken)return;
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=buffer;gain.gain.value=level;source.connect(gain).connect(context.destination);
      speechNodes={source,gain};source.onended=()=>{if(token===speechToken)stopSpeech();};
      source.start();audioStats.playbackStarts++;
    }else{
      speech=new Audio(url);speech.volume=level;
      speech.addEventListener('playing',()=>{audioStats.playbackStarts++;},{once:true});
      speech.addEventListener('ended',()=>{if(token===speechToken)stopSpeech();},{once:true});
      await speech.play();
    }
  }catch{if(token===speechToken){audioStats.errors++;onError('The voice couldn’t play. Tap to try again.');}}
}
