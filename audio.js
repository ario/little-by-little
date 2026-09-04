let context, master, volume = 1, speech, speechLevel = 1, speechNodes, speechToken = 0;
const voiceBuffers=new Map();
let finishReading=null,voiceRequest=Promise.resolve();
const choices=new Map();
function pick(key,count){
  let bag=choices.get(key);
  if(!bag?.length){
    bag=Array.from({length:count},(_,i)=>i);
    for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
    const last=choices.get(key+'last');if(bag.at(-1)===last)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];
    choices.set(key,bag);
  }
  const n=bag.pop();choices.set(key+'last',n);return n;
}
export const audioStats = {sounds:0, narrations:0, playbackStarts:0, lastNarration:null, errors:0};
export function setVolume(percent){
  volume=Math.max(0,Math.min(100,Number(percent)))/100;
  audioStats.volumePercent=Math.round(volume*100);
  if(volume===0&&'speechSynthesis' in window)window.speechSynthesis.cancel();
  if(master){
    master.gain.cancelScheduledValues(context.currentTime);
    if(volume===0)master.gain.setValueAtTime(0,context.currentTime);
    else master.gain.setTargetAtTime(volume,context.currentTime,.015);
  }
  if(speech)speech.volume=speechLevel*volume;
}
export function unlock(){
  try {
    context ||= new AudioContext();
    if(!master){master=context.createGain();master.gain.value=volume;master.connect(context.destination);}
    if(context.state==='suspended')context.resume();
  } catch { /* Voice files work even if Web Audio is unavailable. */ }
}
function tone(frequency,time,length,type,gain,endFrequency){
  if(!context)return;
  const osc=context.createOscillator(), env=context.createGain();
  osc.type=type;osc.frequency.setValueAtTime(frequency,time);
  if(endFrequency)osc.frequency.exponentialRampToValueAtTime(endFrequency,time+length);
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(gain,time+.012);
  env.gain.exponentialRampToValueAtTime(.0001,time+length);
  osc.connect(env).connect(master);osc.start(time);osc.stop(time+length+.02);
  osc.onended=()=>{osc.disconnect();env.disconnect();};
}
export function sound(period,party=false){
  if(volume===0)return;unlock();if(!context)return;
  audioStats.sounds++;const t=context.currentTime+.015,g=period==='evening'?.023:.065;
  if(party){
    const tune=pick('party',4);audioStats.lastPartySound=tune;
    const notes=[[523,659,784,1047],[392,523,659,784,659,1047],[523,784,659,1047],[659,784,1047,1319]][tune];
    notes.forEach((n,i)=>{tone(n,t+i*.14,i===notes.length-1?.62:.19,'triangle',g*1.4);tone(n*2,t+i*.14,.17,'sine',g*.17);});return;
  }
  const effect=pick('task',10);audioStats.lastTaskSound=effect;
  if(effect===0){tone(470,t,.19,'sine',g,110);tone(290,t+.16,.22,'sine',g,90);}
  if(effect===1){tone(170,t,.42,'triangle',g,760);tone(670,t+.15,.25,'sine',g*.5,160);}
  if(effect===2){[660,880,1100].forEach((n,i)=>tone(n,t+i*.09,.17,'sine',g*.8));}
  if(effect===3){tone(640,t,.28,'triangle',g,280);tone(300,t+.18,.21,'sine',g*.7,420);}
  if(effect===4){[0,.1,.23].forEach((a,i)=>tone(310-i*40,t+a,.1,'square',g*.22,170));}
  if(effect===5){tone(1000,t,.16,'sine',g*.5,600);tone(1250,t+.1,.2,'sine',g*.5,750);}
  if(effect===6){[0,.18].forEach(a=>tone(380,t+a,.14,'sawtooth',g*.25,220));}
  if(effect===7){[220,440,330,660].forEach((n,i)=>tone(n,t+i*.07,.09,'square',g*.2));}
  if(effect===8){tone(120,t,.35,'sine',g,720);tone(720,t+.3,.16,'sine',g*.5,280);}
  if(effect===9){[0,.13,.26].forEach((a,i)=>tone(900-i*170,t+a,.13,'triangle',g*.55,300-i*50));}
}
export function stopSpeech(){
  const finish=finishReading;finishReading=null;
  if('speechSynthesis' in window)window.speechSynthesis.cancel();
  speechToken++;
  if(speech){speech.pause();speech.currentTime=0;speech=null;}
  if(speechNodes){try{speechNodes.source.stop();}catch{}speechNodes.source.disconnect();speechNodes.gain.disconnect();speechNodes=null;}
  if(finish)finish();
}

// All UI narration shares task/calendar cancellation and volume, including on iOS.
// Serialize generation so a rapid new tap never races an older Pi voice job.
export async function readAloud(text,period,load,onError){
  text=String(text||'').replace(/\s*[·•]\s*/g,'. ').replace(/\s+[–—]\s+/g,' to ').replace(/[☾‹›]|\p{Extended_Pictographic}|[\uFE0F\u200D]/gu,' ').replace(/\s+/g,' ').trim();
  if(!text)return;
  stopSpeech();const token=speechToken;unlock();
  audioStats.lastSpokenText=text;audioStats.readings=(audioStats.readings||0)+1;
  const chunks=[];let rest=text;
  while(rest.length){let end=Math.min(260,rest.length);if(end<rest.length){const space=rest.lastIndexOf(' ',end);if(space>0)end=space;}chunks.push(rest.slice(0,end));rest=rest.slice(end).trimStart();}
  function queuedLoad(chunk){
    const request=voiceRequest.catch(()=>{}).then(async()=>{
      const deadline=performance.now()+8000;
      while(token===speechToken){
        let timer;
        const left=deadline-performance.now();if(left<=0)throw Error('Voice timed out');
        let result;
        try{result=await Promise.race([load(chunk),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Voice timed out')),left))]);}
        finally{clearTimeout(timer);}
        if(token!==speechToken)return null;
        if(!result.busy)return result;
        await new Promise(resolve=>setTimeout(resolve,250));
      }
      return null;
    });
    voiceRequest=request;request.catch(()=>{});return request;
  }
  try{
    let pending=queuedLoad(chunks[0]);
    for(let index=0;index<chunks.length;index++){
      const result=await pending;if(!result||token!==speechToken)return;
      // Generate only one chunk ahead while the current chunk is being spoken.
      if(index+1<chunks.length)pending=queuedLoad(chunks[index+1]);
      if(result.text&&'speechSynthesis' in window){
        await new Promise((resolve,reject)=>{
          const words=new SpeechSynthesisUtterance(result.text);words.volume=volume*(period==='evening'?.55:.85);words.rate=.88;
          const finish=()=>{if(finishReading===finish)finishReading=null;resolve();};finishReading=finish;
          words.onstart=()=>{audioStats.playbackStarts++;};words.onend=finish;
          words.onerror=e=>{if(token!==speechToken||e.error==='canceled'||e.error==='interrupted')finish();else{if(finishReading===finish)finishReading=null;reject(Error('Speech unavailable'));}};
          window.speechSynthesis.speak(words);
        });
      }else{
        if(!context)throw Error('Audio unavailable');
        const raw=Uint8Array.from(atob(result.audio),c=>c.charCodeAt(0));
        const buffer=await context.decodeAudioData(raw.buffer);if(token!==speechToken)return;
        await context.resume();if(token!==speechToken)return;
        await new Promise(resolve=>{
          const source=context.createBufferSource(),gain=context.createGain();
          source.buffer=buffer;gain.gain.value=period==='evening'?.55:.85;source.connect(gain).connect(master);
          const nodes={source,gain};speechNodes=nodes;
          const finish=()=>{if(finishReading===finish)finishReading=null;if(speechNodes===nodes){source.disconnect();gain.disconnect();speechNodes=null;}resolve();};
          finishReading=finish;source.onended=finish;source.start();audioStats.playbackStarts++;
        });
      }
    }
    return token===speechToken?true:undefined;
  }catch{if(token===speechToken){audioStats.errors++;onError('The voice couldn’t play. Tap to try again.');return false;}}
}
export async function narrate(task,period,onError){
  stopSpeech();const token=speechToken;
  audioStats.narrations++;audioStats.lastNarration=task.id;
  const voice=task.voice_key||task.id;
  const url=new URL(`./voice/${voice}.mp3`,import.meta.url),level=period==='evening'?.55:.85;
  try{
    unlock();
    if(context){
      // Decode each short bundled clip once. A gain node also works on iOS,
      // where HTMLMediaElement.volume is ignored.
      if(!voiceBuffers.has(voice)){
        const pending=fetch(url,{signal:AbortSignal.timeout(6000)}).then(r=>{
          if(!r.ok)throw new Error('Voice unavailable');return r.arrayBuffer();
        }).then(data=>context.decodeAudioData(data));
        voiceBuffers.set(voice,pending);
        pending.catch(()=>voiceBuffers.delete(voice));
      }
      const buffer=await voiceBuffers.get(voice);
      if(token!==speechToken)return;
      await context.resume();if(token!==speechToken)return;
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=buffer;gain.gain.value=level;source.connect(gain).connect(master);
      speechNodes={source,gain};source.onended=()=>{if(token===speechToken)stopSpeech();};
      source.start();audioStats.playbackStarts++;
    }else{
      speech=new Audio(url);speechLevel=level;speech.volume=level*volume;
      speech.addEventListener('playing',()=>{audioStats.playbackStarts++;},{once:true});
      speech.addEventListener('ended',()=>{if(token===speechToken)stopSpeech();},{once:true});
      await speech.play();
    }
  }catch{if(token===speechToken){audioStats.errors++;onError('The voice couldn’t play. Tap to try again.');}}
}

