import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFESSOR_WALK_ADJUSTMENT as adjustment,PROFESSOR_POSITIONS as positions,PROFESSOR_ENTRY_TIMING as timing,PROFESSOR_ENTRY_DURATION,professorPresentationFrame} from '../js/professorAnimation.js';
import {PROFESSOR_CLIMB_FRAMES} from '../js/professorClimbFrames.js';
import {professorFootInsideRing} from '../js/professorEntryDiagnostics.js';
const at=t=>professorPresentationFrame({elapsed:t,entryElapsed:t});
const climbStart=timing.prepare+timing.approach+timing.edge+timing.stop;
test('new stop retains exactly 1.5 rendered opaque body widths with the requested 75 percent faster walk',()=>{
 const width=Math.max(...PROFESSOR_CLIMB_FRAMES.map(f=>f.bounds.width*positions.outside.height/f.referenceHeight));
 assert.equal(adjustment.visualWidth,width);
 assert.equal(adjustment.extraX,1.5*width);
 assert.equal(positions.corner.x,adjustment.previousStopX+1.5*width);
 const oldSpeed=(adjustment.previousStopX-positions.outside.x)/1.5;
 assert.equal((positions.corner.x-positions.outside.x)/timing.approach,oldSpeed*1.75);
 const a=at(timing.prepare+1),b=at(timing.prepare+1.1);
 assert.ok(Math.abs((b.x-a.x)/.1-oldSpeed*1.75)<1e-8);
});
test('walking, stop and climb meet without teleport; every pre-climb foot position stays outside',()=>{
 for(const t of [timing.prepare+timing.approach,timing.prepare+timing.approach+timing.edge,climbStart]){
  const a=at(t-1e-7),b=at(t+1e-7);
  for(const key of ['x','floor','height'])assert.ok(Math.abs(a[key]-b[key])<.001,`${key} at ${t}`);
 }
 for(let t=0;t<climbStart;t+=1/144)assert.equal(professorFootInsideRing(at(t)),false,`premature entry at ${t}`);
 assert.equal(at(climbStart-.01).stage,'stop');assert.equal(at(climbStart+.01).stage,'climb');
 assert.equal(timing.climb,.9);
});
test('last climb frame is inside; final crossed-arm position remains the original one',()=>{
 const frame=at(climbStart+timing.climb-.01);
 assert.equal(frame.layer,'INSIDE');assert.equal(professorFootInsideRing(frame),true);
 const final=at(PROFESSOR_ENTRY_DURATION);
 assert.equal(final.clip,'observing');assert.equal(final.x,470);assert.equal(final.floor,266);assert.equal(final.height,171);
});
