import {PROFESSOR_SAD_FRAMES,PROFESSOR_SAD_IMAGE_SIZE} from './professorSadFrames.js';
export const PROFESSOR_SAD_URL=new URL('../assets/sprites/professor/professor_sad_exit_v1.png',import.meta.url).href;
export const PROFESSOR_SAD_CLIPS=Object.freeze({
 sadReaction:{frames:PROFESSOR_SAD_FRAMES.slice(0,4),secondsPerFrame:.25,once:true},
 sadWalking:{frames:PROFESSOR_SAD_FRAMES.slice(4),secondsPerFrame:.25}
});
export function professorSadRightExtent(height){
 return Math.max(...PROFESSOR_SAD_FRAMES.map(f=>(f.bounds.x+f.bounds.width-f.x-f.anchorX)*height/f.referenceHeight));
}
export function professorSadLeftExtent(height){
 return Math.max(...PROFESSOR_SAD_FRAMES.map(f=>(f.anchorX-(f.bounds.x-f.x))*height/f.referenceHeight));
}
let texture=null,preload;
export function professorSadTexture(){return texture;}
export function professorSadFrame(clip,elapsed=0){
 const config=PROFESSOR_SAD_CLIPS[clip];if(!config)return null;
 const index=Math.floor(Math.max(0,elapsed)/config.secondsPerFrame);
 return config.frames[config.once?Math.min(index,config.frames.length-1):index%config.frames.length];
}
export function preloadProfessorSadSprites(ImageType=globalThis.Image){
 if(typeof ImageType!=='function')return Promise.resolve(null);
 return preload??=new Promise(resolve=>{
  const image=new ImageType();let done=false;
  const timer=setTimeout(()=>finish(false),15000);
  function finish(ok){
   if(done)return;done=true;clearTimeout(timer);image.onload=image.onerror=null;
   if(ok)texture=image;
   else console.warn('[PROFESSOR] Sprite de saída triste ausente/inválido; pose interrompida preservada:',PROFESSOR_SAD_URL);
   resolve(texture);
  }
  image.onload=()=>finish(image.naturalWidth===PROFESSOR_SAD_IMAGE_SIZE.width&&image.naturalHeight===PROFESSOR_SAD_IMAGE_SIZE.height);
  image.onerror=()=>finish(false);
  try{image.src=PROFESSOR_SAD_URL;}catch{finish(false);}
 });
}
