import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {PROFESSOR_CLIMB_INTEGRATED,PROFESSOR_CLIMB_FRAMES,PROFESSOR_CLIMB_URLS} from '../js/professorClimbFrames.js';
import {PROFESSOR_CLIPS,professorSpriteFrame,professorTexture} from '../js/professorSprites.js';
import {PROFESSOR_ENTRY_TIMING as timing,PROFESSOR_ENTRY_DURATION,PROFESSOR_POSITIONS,professorPresentationFrame,updateProfessorAnimation} from '../js/professorAnimation.js';
import {gameState,createInitialGameState} from '../js/gameState.js';
import {observeProfessorAnswer} from '../js/professorEasterEgg.js';
import {professorFrame,professorRenderInfo,drawProfessor} from '../js/professorView.js';
import {setDebugEnabled,setProfessorDebugMode,updateProfessorDebugAnimation} from '../js/debug.js';
import {REAR_RIGHT_POST,REAR_ROPES,ARENA_WIDTH} from '../js/ringGeometry.js';
import {loadProfessorSprites} from './helpers/professorSprites.mjs';
await loadProfessorSprites();
const start=timing.prepare+timing.approach+timing.stop+timing.edge;
const context={window:{}};
vm.runInNewContext(readFileSync(new URL('../assets/sprites/professor/preview-v2-data.js',import.meta.url),'utf8'),context);
const boundsBySheet=Object.fromEntries(context.window.PROFESSOR_PREVIEW_V2.clips.map(c=>[
 {observing:'observing',side:'walkingSide',front:'walkingFront'}[c.id],c.frames.map(f=>f.bounds)
]));
function bounds(crop,sheet){
 if(crop.bounds)return crop.bounds;
 const index=crop.y/627*2+crop.x/627;
 return boundsBySheet[sheet][index];
}
function checkClear(frame){
 const crop=professorSpriteFrame(frame.clip,frame.elapsed),sheet=crop.sheet??frame.clip;
 const b=bounds(crop,sheet),scale=frame.height/crop.referenceHeight;
 const left=b.x-crop.x-crop.anchorX,right=left+b.width;
 const min=frame.x+(frame.facing===-1?-right:left)*scale;
 const max=frame.x+(frame.facing===-1?-left:right)*scale;
 const top=frame.floor+(b.y-crop.y-crop.footY)*scale,bottom=top+b.height*scale;
 const overlapsPost=min<REAR_RIGHT_POST.right&&max>REAR_RIGHT_POST.left&&top<REAR_RIGHT_POST.bottom&&bottom>REAR_RIGHT_POST.top;
 if(overlapsPost&&frame.layer!=='OUTSIDE'&&frame.layer!=='ENTERING'){
  assert.equal(frame.layer,'INSIDE','foreground overlap only after entry');
  assert.ok(frame.floor>REAR_RIGHT_POST.bottom,'feet remain in front of the post base');
 }
 if(frame.stage==='climb'&&frame.layer==='OUTSIDE')assert.ok(min>592&&frame.behindRopes,'initial poses clear the rear ropes and remain behind the existing post');
 if(frame.layer==='INSIDE')assert.ok(max<ARENA_WIDTH,'last climb pose and internal walk fit completely inside');
}
test('all eight integrated RGBA PNGs are requested, decoded by the loader and selected in order',async()=>{
 assert.equal(PROFESSOR_CLIMB_INTEGRATED,true);
 const loader=await import('../js/professorSprites.js?real-png-metadata'),requested=[];
 class ImageFromPNG{
  set src(url){this.url=url;requested.push(url);const png=readFileSync(new URL(url));
   this.naturalWidth=png.readUInt32BE(16);this.naturalHeight=png.readUInt32BE(20);assert.equal(png[25],6);this.onload();}
 }
 await loader.preloadProfessorSprites(ImageFromPNG);
 for(let i=0;i<8;i++){
  const crop=professorSpriteFrame('climbing',(i+.5)*PROFESSOR_CLIPS.climbing.secondsPerFrame);
  assert.equal(crop,PROFESSOR_CLIMB_FRAMES[i]);
  assert.equal(requested.filter(url=>url===PROFESSOR_CLIMB_URLS[crop.sheet]).length,1);
  assert.equal(loader.professorTexture(crop.sheet).url,PROFESSOR_CLIMB_URLS[crop.sheet]);
  assert.equal(crop.width,1254);assert.equal(crop.height,1254);
 }
});
test('the side path uses post occlusion before entry and keeps the complete inside pose on screen',()=>{
 for(let tick=0;tick<=Math.ceil(PROFESSOR_ENTRY_DURATION*144);tick++){
  const t=tick/144;checkClear(professorPresentationFrame({elapsed:t,entryElapsed:t}));
 }
});
test('real gameplay displays all eight PNGs at 30, 60 and 144 fps without a whole-body hop',()=>{
 for(const fps of [30,60,144]){
  const s=createInitialGameState();for(let i=1;i<=7;i++)observeProfessorAnswer(s,{outcome:'correct'},i);
  const seen=new Set(),before=JSON.stringify(s);
  for(let tick=0;tick<(PROFESSOR_ENTRY_DURATION+1)*fps;tick++){
   updateProfessorAnimation(s,1/fps);const frame=professorFrame(s);
   if(frame.stage!=='climb')continue;
   const info=professorRenderInfo(s);seen.add(info.file);
   assert.match(info.file,/^frame_0[1-8]\.png$/);assert.equal(info.totalFrames,8);assert.equal(info.loaded,true);
   assert.equal(frame.floor,info.frame<=4?PROFESSOR_POSITIONS.edge.floor:PROFESSOR_POSITIONS.landing.floor,'only the supporting surface changes, never an up/down arc');
   const calls=[],ctx={save(){},restore(){},translate(){},scale(){},drawImage(...args){calls.push(args);}};
   drawProfessor(ctx,s);assert.equal(calls.length,1);
   assert.equal(calls[0][0],professorTexture(`climb${info.frame}`));
   assert.equal(ctx.imageSmoothingEnabled,false);
  }
  assert.equal(seen.size,8);assert.equal(professorFrame(s).layer,'INSIDE');assert.equal(JSON.stringify(s),before);
 }
});
test('7-answer debug uses every PNG and preserves exact pose, position and scale through Rush',()=>{
 Object.assign(gameState,createInitialGameState());setDebugEnabled(true);
 const before=JSON.stringify(gameState);
 for(let i=0;i<8;i++){
  setProfessorDebugMode('entry');updateProfessorDebugAnimation(gameState,start+(i+.5)*timing.climb/8);
  const info=professorRenderInfo(gameState);
  assert.equal(info.frame,i+1);assert.equal(info.file,`frame_0${i+1}.png`);assert.equal(info.totalFrames,8);
  for(const rush of ['counter_rush_cutscene','counter_rush_flash']){
   gameState.playerCombat.state=rush;updateProfessorDebugAnimation(gameState,99);
   assert.deepEqual(professorRenderInfo(gameState),info);
  }
  gameState.playerCombat.state='idle';updateProfessorDebugAnimation(gameState,.001);
  assert.equal(professorRenderInfo(gameState).file,info.file);
 }
 assert.equal(JSON.stringify(gameState),before);setDebugEnabled(false);
});
