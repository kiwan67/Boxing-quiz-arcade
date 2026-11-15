import {drawPixelText} from './hud.js';
import {professorDebugFrame,debugState,isProfessorDebugForced} from './debug.js';
import {professorAnimationFrame,PROFESSOR_ENTRY_TIMING} from './professorAnimation.js';
import {professorTexture,professorSpriteFrame,PROFESSOR_REFERENCE_HEIGHT,PROFESSOR_SPRITE_URLS,PROFESSOR_CLIPS} from './professorSprites.js';
import {REAR_RIGHT_POST} from './ringGeometry.js';
import {professorEntryDiagnostics} from './professorEntryDiagnostics.js';
import {professorVisualFrame,professorSpeechFrame,PROFESSOR_EXIT} from './professorPresentation.js';
import {PROFESSOR_SAD_CLIPS,PROFESSOR_SAD_URL,professorSadFrame,professorSadTexture} from './professorSadSprites.js';

function presentationKey(state){return isProfessorDebugForced(state)?debugState.professorAnimation:state.professorEasterEgg;}
export function professorSpeech(state){return professorSpeechFrame(state,presentationKey(state));}
export function professorVisualSprite(frame){
 const sad=PROFESSOR_SAD_CLIPS[frame.clip];
 if(sad&&professorSadTexture())return {crop:professorSadFrame(frame.clip,frame.elapsed),texture:professorSadTexture(),url:PROFESSOR_SAD_URL,config:sad,facing:frame.facing,spriteElapsed:frame.elapsed};
 const fallback=sad?frame.fallback??frame:frame;
 const crop=professorSpriteFrame(fallback.clip,fallback.elapsed),sheet=crop.sheet??fallback.clip;
 return {crop,texture:professorTexture(sheet),url:PROFESSOR_SPRITE_URLS[sheet],config:PROFESSOR_CLIPS[fallback.clip]??PROFESSOR_CLIPS.observing,
  facing:fallback.facing,missingSad:Boolean(sad),spriteElapsed:fallback.elapsed};
}

export function professorFrame(state){
 const preview=professorDebugFrame(state);if(preview)return professorVisualFrame(state,preview,presentationKey(state));
 const egg=state.professorEasterEgg;
 if(!egg||egg.ended||state.matchResult
  ||['lobby','match_intro','knockout_cinematic','victory','defeat'].includes(state.phase))return null;
 const normal=egg.professorPresent&&!egg.blocked?{...professorAnimationFrame(state),inRing:egg.professorInRing}:null;
 return professorVisualFrame(state,normal,egg);
}

export function drawProfessor(ctx,state,pass){
 const frame=professorFrame(state);if(!frame)return;
 // The support transfer is drawn once, with only the existing post in front.
 if(pass&&frame.layer==='ENTERING')return;
 if(pass==='OUTSIDE'&&!frame.behindRopes||pass==='INSIDE'&&frame.behindRopes)return;
 const {crop,texture,facing}=professorVisualSprite(frame);
 if(texture){
  const scale=frame.height/(crop.referenceHeight??PROFESSOR_REFERENCE_HEIGHT);
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.globalAlpha=(ctx.globalAlpha??1)*(frame.alpha??1);
  if(facing===-1){ctx.translate(frame.x*2,0);ctx.scale(-1,1);}
  const x=frame.x-crop.anchorX*scale,y=frame.floor-crop.footY*scale;
  ctx.drawImage(texture,crop.x,crop.y,crop.width,crop.height,x,y,crop.width*scale,crop.height*scale);
  ctx.restore();return;
 }

}

// Reorder only the cached ring pixels. Each pixel is drawn exactly once;
// character pixels are never split, erased, rescaled again or duplicated.
export function drawProfessorAtSide(ctx,state,rear){
 const frame=professorFrame(state);
 if(frame?.layer!=='ENTERING'||!rear)return false;
 const {left,right,top,bottom}=REAR_RIGHT_POST;
 const draw=(x,y,w,h)=>ctx.drawImage(rear,x,y,w,h,x,y,w,h);
 // Disjoint rectangles compose the unchanged cache once. Only the existing
 // right post (and its connectors) is in front; the ropes are never animated.
 draw(0,0,rear.width,top);draw(0,bottom,rear.width,rear.height-bottom);
 draw(0,top,left,bottom-top);draw(right,top,rear.width-right,bottom-top);
 drawProfessor(ctx,state);
 draw(left,top,right-left,bottom-top);
 return true;
}

export function professorRenderInfo(state){
 const frame=professorFrame(state);if(!frame)return null;
 const {crop,texture,config:clip,url,missingSad,spriteElapsed}=professorVisualSprite(frame);
 const index=Math.floor(Math.max(0,Number.isFinite(spriteElapsed)?spriteElapsed:0)/clip.secondsPerFrame);
 return {stage:frame.stage,animation:frame.clip,frame:(clip.once?Math.min(index,clip.frames.length-1):index%clip.frames.length)+1,totalFrames:clip.frames.length,crop:`${crop.x},${crop.y} (${crop.width}×${crop.height})`,
  loaded:Boolean(texture),file:(texture?.currentSrc||texture?.src||url)?.split('/').pop(),scale:frame.height/(crop.referenceHeight??PROFESSOR_REFERENCE_HEIGHT),missingSad,
  x:frame.x,y:frame.floor,layer:frame.layer,
  walkingFrameFrequency:1/(PROFESSOR_SAD_CLIPS[frame.clip]?.secondsPerFrame??PROFESSOR_CLIPS.walkingSide.secondsPerFrame),
  frameFrequency:1/clip.secondsPerFrame,stageDuration:frame.stageDuration??(frame.stage==='disappointed'?PROFESSOR_EXIT.reaction:PROFESSOR_ENTRY_TIMING[frame.stage]??null),
  dialogue:professorSpeech(state)?.kind??null,departure:Boolean(frame.departure),alpha:frame.alpha??1,
  ...professorEntryDiagnostics(frame)};
}

export function drawProfessorDebug(ctx,state,enabled){
 if(!enabled)return;
 const frame=professorFrame(state);if(!frame)return;
 ctx.save();ctx.fillStyle='#101c31';ctx.fillRect(8,61,158,13);
 const label=frame.stage==='disappointed'?'PROFESSOR DECEPCIONADO':frame.stage==='sad_exit'?'PROFESSOR SAINDO':frame.stage!=='observing'?'PROFESSOR ENTRANDO':frame.inRing?'PROFESSOR NO RINGUE':'PROFESSOR: 5 ACERTOS';
 drawPixelText(ctx,label,12,64,1,'#fff1a0');
 ctx.restore();
}
