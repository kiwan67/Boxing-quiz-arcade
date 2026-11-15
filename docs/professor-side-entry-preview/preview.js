import {createScenery,drawArenaScene} from '../../js/scenery.js';
import {gameState} from '../../js/gameState.js';
import {setDebugEnabled,setProfessorDebugMode,updateProfessorDebugAnimation} from '../../js/debug.js';
import {professorFrame} from '../../js/professorView.js';
import {preloadProfessorSprites,professorSpriteFrame,professorTexture,PROFESSOR_CLIPS,PROFESSOR_SPRITE_URLS} from '../../js/professorSprites.js';
import {PROPOSAL_GEOMETRY as geometry,proposalFrame,climbStart,PROFESSOR_ENTRY_DURATION as duration} from './layout.js';
const canvas=document.getElementById('game-canvas'),ctx=canvas.getContext('2d'),slider=document.getElementById('time');
canvas.width=geometry.width;canvas.height=geometry.height;slider.max=duration;
const scenery=createScenery(640,360);
gameState.phase='idle';setDebugEnabled(true);
await preloadProfessorSprites();
let time=0,playing=false,last=0,info;
function at(t){
 time=Math.max(0,Math.min(duration,t));slider.value=time;
 // Use the real 7-answer visual debug clock and actual frame selector.
 setProfessorDebugMode('entry');updateProfessorDebugAnimation(gameState,time);
 const frame=proposalFrame(professorFrame(gameState),time),crop=professorSpriteFrame(frame.clip,frame.elapsed);
 const key=crop.sheet??frame.clip,texture=professorTexture(key),scale=frame.height/crop.referenceHeight;
 ctx.imageSmoothingEnabled=false;ctx.fillStyle='#101426';ctx.fillRect(0,0,canvas.width,canvas.height);
 drawArenaScene(ctx,scenery,0);
 if(texture){
  ctx.save();if(frame.facing===-1){ctx.translate(frame.x*2,0);ctx.scale(-1,1);}
  ctx.drawImage(texture,crop.x,crop.y,crop.width,crop.height,frame.x-crop.anchorX*scale,frame.floor-crop.footY*scale,crop.width*scale,crop.height*scale);ctx.restore();
 }
 const clip=PROFESSOR_CLIPS[frame.clip];
 const index=clip.once?Math.min(clip.frames.length-1,Math.floor(frame.elapsed/clip.secondsPerFrame)):Math.floor(frame.elapsed/clip.secondsPerFrame)%clip.frames.length;
 info={time,stage:frame.stage,zone:frame.positionZone,file:PROFESSOR_SPRITE_URLS[key].split('/').pop(),frame:index+1,total:clip.frames.length,x:frame.x,y:frame.floor,scale,layer:frame.layer,loaded:Boolean(texture)};
 document.getElementById('info').textContent='PRÉVIA — NÃO APLICADA AO JOGO\n'+JSON.stringify(info,null,2);
 return info;
}
document.getElementById('force').onclick=()=>{playing=false;at(0);};
document.getElementById('play').onclick=()=>{if(time>=duration)at(0);playing=!playing;};
slider.oninput=()=>{playing=false;at(Number(slider.value));};
const step=direction=>{playing=false;const i=time<climbStart?0:Math.floor((time-climbStart)/(PROFESSOR_CLIPS.climbing.secondsPerFrame));at(climbStart+(Math.max(0,Math.min(7,i+direction))+.5)*PROFESSOR_CLIPS.climbing.secondsPerFrame);};
document.getElementById('previous').onclick=()=>step(-1);document.getElementById('next').onclick=()=>step(1);
window.sidePreview={at,canvas,geometry,climbStart,duration,ready:true};at(0);
function tick(now){const delta=last?Math.min(.05,(now-last)/1000):0;last=now;if(playing){at(time+delta);if(time>=duration)playing=false;}requestAnimationFrame(tick);}
requestAnimationFrame(tick);
