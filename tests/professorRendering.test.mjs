import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfessorAnimation,professorPresentationFrame,PROFESSOR_ENTRY_TIMING as timing,PROFESSOR_ENTRY_DURATION,PROFESSOR_POSITIONS} from '../js/professorAnimation.js';
import {professorSpriteFrame,PROFESSOR_SPRITE_URLS,PROFESSOR_CLIPS} from '../js/professorSprites.js';
import {REAR_RIGHT_POST,REAR_ROPES,ARENA_WIDTH} from '../js/ringGeometry.js';
const at=t=>professorPresentationFrame({elapsed:t,entryElapsed:t});
test('travel is continuous and side-entry layers preserve the existing post occlusion',()=>{
 let sum=0;const times=Object.values(timing).map(t=>sum+=t);
 const start=timing.prepare+timing.approach+timing.stop+timing.edge;
 for(const time of times){
  const a=at(time-1e-7),b=at(time+1e-7);
  for(const key of ['x','floor','height'])assert.ok(Math.abs(a[key]-b[key])<.001,`${key} at ${time}`);
 }
 assert.ok(PROFESSOR_POSITIONS.corner.x>ARENA_WIDTH,'requested extra walking reaches the external side');
 assert.ok(PROFESSOR_POSITIONS.edge.floor>REAR_RIGHT_POST.bottom);
 assert.equal(PROFESSOR_POSITIONS.landing.floor,REAR_RIGHT_POST.bottom+2);
 for(let i=0;i<90;i++){
  const f=at(start+(i+.5)/100),crop=professorSpriteFrame(f.clip,f.elapsed);
  assert.equal(f.height,PROFESSOR_POSITIONS.outside.height,'fixed scale throughout the lift');
  assert.match(crop.sheet,/^climb[1-8]$/);
  const scale=f.height/crop.referenceHeight;
  const top=f.floor+(crop.bounds.y-crop.footY)*scale;
  const left=f.x-(crop.bounds.x+crop.bounds.width-crop.anchorX)*scale;
  const right=f.x+(crop.anchorX-crop.bounds.x)*scale;
  if(top<REAR_RIGHT_POST.bottom&&left<REAR_RIGHT_POST.right&&right>REAR_RIGHT_POST.left){
   if(f.layer==='INSIDE')assert.ok(f.floor>REAR_RIGHT_POST.bottom,'inside feet clear the post base');
   else assert.equal(f.behindRopes,true,'the existing post stays in front of external and entering poses');
  }
  if(f.layer==='OUTSIDE')assert.ok(left>592,'early poses remain to the right of the rear ropes');
  assert.equal(f.floor,crop.upperSupport?PROFESSOR_POSITIONS.landing.floor:PROFESSOR_POSITIONS.edge.floor);
  assert.equal(f.facing,-1);assert.equal(f.foregroundRopes,undefined);
 }
 assert.equal(PROFESSOR_CLIPS.entering,undefined,'obsolete between-rope clip is disabled');
});
test('before and after entry, observation and recovery reuse the approved detailed source',()=>{
 const outside=professorPresentationFrame(createProfessorAnimation());
 const inside=professorPresentationFrame(createProfessorAnimation('inside'));
 for(const f of [outside,inside,at(PROFESSOR_ENTRY_DURATION-.1)]){
  const crop=professorSpriteFrame(f.clip,f.elapsed);
  assert.equal(crop.sheet,'observing');assert.equal(crop.referenceHeight,594);
  assert.equal(crop.width,627);assert.equal(crop.height,627);
  assert.match(PROFESSOR_SPRITE_URLS[crop.sheet],/professor_observando_v2.png$/);
 }
});
