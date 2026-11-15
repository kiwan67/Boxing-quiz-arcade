import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFESSOR_WALK_ADJUSTMENT as walk,PROFESSOR_ENTRY_HEIGHT_ADJUSTMENT as height,PROFESSOR_POSITIONS as positions,PROFESSOR_ENTRY_TIMING as timing,PROFESSOR_ENTRY_DURATION,professorPresentationFrame} from '../js/professorAnimation.js';
import {professorSpriteFrame,PROFESSOR_CLIPS} from '../js/professorSprites.js';
import {REAR_RIGHT_POST,RING_FLOOR_BOUNDARY} from '../js/ringGeometry.js';
const at=t=>professorPresentationFrame({elapsed:t,entryElapsed:t});
const climbStart=timing.prepare+timing.approach+timing.edge+timing.stop;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('horizontal speed remains 28 px/s while the walk clip independently loops at 6 fps',()=>{
 assert.equal(walk.previousWalkSpeed,16);assert.equal(walk.walkSpeed,28);
 near(timing.approach,9.190446710198657/1.75);
 assert.equal(positions.outside.x,494);near(positions.corner.x,641.0471473631785);
 assert.equal(positions.outside.floor,182);assert.equal(positions.corner.floor,182);
 for(const oldTime of [.15,.7,1.51,3.01,7.01]){
  const frame=at(timing.prepare+oldTime/1.75);
  near(frame.x,494+16*oldTime);near(frame.elapsed,oldTime/1.75);
  assert.equal(professorSpriteFrame(frame.clip,frame.elapsed),professorSpriteFrame('walkingSide',oldTime/1.75));
 }
 assert.equal(1/PROFESSOR_CLIPS.walkingSide.secondsPerFrame,6);
 assert.equal(professorSpriteFrame('walkingSide',.02),professorSpriteFrame('walkingSide',4/6+.02));
 const a=at(timing.prepare+.05),b=at(timing.prepare+.12);
 assert.equal(professorSpriteFrame(a.clip,a.elapsed),professorSpriteFrame(b.clip,b.elapsed));
 near(b.x-a.x,28*.07);
 near(timing.edge,3.7808541939965807);assert.equal(timing.prepare,.6);assert.equal(timing.stop,.2);
 assert.equal(timing.climb,.9);assert.equal(timing.settle,1);assert.equal(timing.recover,.32);
});
test('feet start beside the post instead of a body height below it; poses and scale are unchanged',()=>{
 near(height.previousLowestY,337.25961485252617);near(height.lowestY,238.8184383819379);
 near(height.reduction,98.44117647058823);
 assert.equal(positions.landing.floor,REAR_RIGHT_POST.bottom+2);
 const side=RING_FLOOR_BOUNDARY.rearRight+(RING_FLOOR_BOUNDARY.frontRight-RING_FLOOR_BOUNDARY.rearRight)*(positions.landing.floor-RING_FLOOR_BOUNDARY.rearY)/(RING_FLOOR_BOUNDARY.frontY-RING_FLOOR_BOUNDARY.rearY);
 const shoeXs=[null,null,null,790,790,800,650,null];
 for(let i=0;i<8;i++){
  const frame=at(climbStart+(i+.5)*.9/8),crop=professorSpriteFrame(frame.clip,frame.elapsed);
  if(i<3)near(frame.x,641.0471473631785);
  if(i>=3&&i<7)near(frame.x-(shoeXs[i]-crop.anchorX)*frame.height/crop.referenceHeight,side);
  near(frame.floor,i<4?238.8184383819379:208);
  assert.equal(crop,PROFESSOR_CLIPS.climbing.frames[i]);near(frame.height,120.44117647058823);
 }
 for(const t of [timing.prepare+timing.approach,timing.prepare+timing.approach+timing.edge,climbStart,climbStart+.9]){
  const a=at(t-1e-7),b=at(t+1e-7);
  for(const key of ['x','floor','height'])assert.ok(Math.abs(a[key]-b[key])<.001,`${key} discontinuity at ${t}`);
 }
 const final=at(PROFESSOR_ENTRY_DURATION);assert.equal(final.x,470);assert.equal(final.floor,266);
 assert.equal(final.height,171);assert.equal(final.clip,'observing');
});
