export const PROFESSOR_REFERENCE_HEIGHT=600;
import {PROFESSOR_ACTION_FRAMES} from './professorActionFrames.js';
import {PROFESSOR_CLIMB_FRAMES,PROFESSOR_CLIMB_URLS} from './professorClimbFrames.js';
const actionFrames=indices=>indices.map(i=>({...PROFESSOR_ACTION_FRAMES[i],sheet:'actions'}));
const frames=(axes,feet,referenceHeight=600,sheet)=>Object.freeze(axes.map((anchorX,i)=>Object.freeze({
 x:(i%2)*627,y:Math.floor(i/2)*627,width:627,height:627,anchorX,footY:feet[i],referenceHeight,sheet
})));
const observingFrames=frames([312,312,312,312],[607,607,607,607],594,'observing');
const sideFrames=frames([313,313,313,313],[587,587,586,586],560,'walkingSide');
export const PROFESSOR_CLIPS=Object.freeze({
 observing:{secondsPerFrame:.8,frames:observingFrames},
 preparing:{secondsPerFrame:.15,once:true,frames:actionFrames([4,5,6,7])},
 climbing:{secondsPerFrame:.9/8,once:true,frames:PROFESSOR_CLIMB_FRAMES},
 returning:{secondsPerFrame:.16,once:true,frames:observingFrames.slice(0,2)},
 walkingSide:{secondsPerFrame:1/6,frames:sideFrames},
 walkingFront:{secondsPerFrame:1/6,frames:frames([312,312.5,312,312.5],[612,612,614,613])}
});
export const PROFESSOR_SPRITE_URLS=Object.freeze({
 ...PROFESSOR_CLIMB_URLS,
 actions:new URL('../assets/sprites/professor/professor_actions_v3.png',import.meta.url).href,
 observing:new URL('../assets/sprites/professor/professor_observando_v2.png',import.meta.url).href,
 walkingSide:new URL('../assets/sprites/professor/professor_caminhando_lado_v2.png',import.meta.url).href,
 walkingFront:new URL('../assets/sprites/professor/professor_caminhando_frente_v2.png',import.meta.url).href
});
const textures={};let preload;
export function professorTexture(clip='observing'){return textures[clip]??null;}
export function professorSpritesheet(clip='observing'){return professorTexture(clip);}
export function professorSpriteFrame(clip='observing',elapsed=0){
 const animation=PROFESSOR_CLIPS[clip]??PROFESSOR_CLIPS.observing;
 const time=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
 const index=Math.floor(time/animation.secondsPerFrame);
 return animation.frames[animation.once?Math.min(index,animation.frames.length-1):index%animation.frames.length];
}
export function preloadProfessorSprites(ImageType=globalThis.Image){
 if(typeof ImageType!=='function')return Promise.resolve(null);
 return preload??=Promise.all(Object.entries(PROFESSOR_SPRITE_URLS).map(([clip,url])=>new Promise(resolve=>{
  const image=new ImageType();let finished=false;
  const deadline=setTimeout(()=>finish(false),15000);
  function finish(loaded){
   if(finished)return;finished=true;clearTimeout(deadline);image.onload=null;image.onerror=null;
   if(loaded)textures[clip]=image;
   else console.warn('[PROFESSOR] Novo sprite ausente ou inválido; animação oculta:',url);
   resolve();
  }
  image.onload=()=>finish(image.naturalWidth===1254&&image.naturalHeight===1254);
  image.onerror=()=>finish(false);
  try{image.src=url;}catch{finish(false);}
 }))).then(()=>textures);
}
