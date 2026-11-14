import { audioManifest } from './audioManifest.js';
import { presentationSettings, onPresentationSetting } from './presentationSettings.js';
export function createAudioManager({manifest=audioManifest, create=()=>new Audio(), fetchFile=(url)=>fetch(url), objectURL=blob=>URL.createObjectURL(blob), revoke=url=>URL.revokeObjectURL(url)}={}) {
 const cache=new Map(), active=new Set(), missing=new Set();
 let unlocked=false, paused=false, generation=0, musicId=null, musicGeneration=0;
 const limits={effects:8,crowd:3,music:1};
 const volume=entry=>presentationSettings.muted?0:Math.max(0,Math.min(1,entry.volume*presentationSettings.masterVolume*(entry.category==='music'?presentationSettings.musicVolume:entry.category==='crowd'?presentationSettings.ambienceVolume:presentationSettings.effectsVolume)));
 function stopVoice(v){v.node.pause(); v.node.onended=null; active.delete(v); v.node.removeAttribute?.('src'); v.node.load?.();}
 async function load(id){
  if(!manifest[id]||missing.has(id)) return null;
  if(!cache.has(id)) cache.set(id,(async()=>{try{
   const response=await fetchFile(new URL('../'+manifest[id].path,import.meta.url));
   if(!response.ok) throw Error('missing'); return objectURL(await response.blob());
  }catch{missing.add(id); return null;}})());
  return cache.get(id);
 }
 async function play(id, music=false){
  const entry=manifest[id]; if(!unlocked||paused||!entry||volume(entry)===0) return false;
  if(entry.loop&&[...active].some(v=>v.id===id))return false;
  const epoch=generation, musicEpoch=musicGeneration, url=await load(id);
  if(!url||epoch!==generation||paused||music&&musicEpoch!==musicGeneration) return false;
  if([...active].filter(v=>v.id===id).length>=entry.maxSimultaneous||[...active].filter(v=>v.entry.category===entry.category).length>=(limits[entry.category]||4)) return false;
  let voice;
  try {
   const node=create(); node.src=url; node.volume=volume(entry); node.loop=Boolean(entry.loop);
   voice={id,entry,node}; active.add(voice); node.onended=()=>stopVoice(voice); node.onerror=()=>{missing.add(id);stopVoice(voice);};
   await node.play(); return true;
  }catch{if(voice)stopVoice(voice); return false;}
 }
 function stop(id){for(const v of [...active])if(!id||v.id===id)stopVoice(v);}
 function stopMusic(){musicGeneration++; musicId=null; for(const v of [...active])if(v.entry.category==='music')stopVoice(v);}
 async function playMusic(id){if(musicId===id)return; stopMusic(); musicId=id; const success=await play(id,true); if(!success&&!missing.has(id)&&musicId===id)musicId=null;}
 function pause(){if(paused)return; paused=true; generation++;for(const v of active)v.node.pause();}
 function resume(){if(!paused)return;paused=false;for(const v of active)Promise.resolve(v.node.play()).catch(()=>stopVoice(v));}
 function stopAll(){generation++;stopMusic();stop();}
 const unsubscribe=onPresentationSetting(()=>{for(const v of active)v.node.volume=volume(v.entry);});
 return {play,load,playMusic,stopMusic,stop,stopAll,pause,resume,
  unlock(){unlocked=true;resume();},
  dispose(){stopAll();unsubscribe();for(const promise of cache.values())promise.then(url=>{if(url)revoke(url);});cache.clear();missing.clear();},
  diagnostics(){return {unlocked,paused,active:active.size,missing:[...missing]};}
 };
}
export const audioManager=createAudioManager();



