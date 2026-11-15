import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {proposalFrame,PROPOSAL_GEOMETRY as geometry,climbStart,PROFESSOR_ENTRY_DURATION as duration} from '../docs/professor-side-entry-preview/layout.js';
import {professorPresentationFrame,PROFESSOR_ENTRY_TIMING} from '../js/professorAnimation.js';
import {professorSpriteFrame,PROFESSOR_CLIPS} from '../js/professorSprites.js';
import {REAR_RIGHT_POST,REAR_ROPES} from '../js/ringGeometry.js';
const data={window:{}};vm.runInNewContext(readFileSync(new URL('../assets/sprites/professor/preview-v2-data.js',import.meta.url),'utf8'),data);
const measured=Object.fromEntries(data.window.PROFESSOR_PREVIEW_V2.clips.map(c=>[{observing:'observing',side:'walkingSide',front:'walkingFront'}[c.id],c.frames.map(f=>f.bounds)]));
const at=t=>proposalFrame(professorPresentationFrame({elapsed:t,entryElapsed:t}),t);
function rect(f){
 const crop=professorSpriteFrame(f.clip,f.elapsed),sheet=crop.sheet??f.clip;
 const b=crop.bounds??measured[sheet][crop.y/627*2+crop.x/627];
 const s=f.height/crop.referenceHeight,left=b.x-crop.x-crop.anchorX,right=left+b.width;
 return {left:f.x+(f.facing===-1?-right:left)*s,right:f.x+(f.facing===-1?-left:right)*s,
  top:f.floor+(b.y-crop.y-crop.footY)*s,bottom:f.floor+(b.y+b.height-crop.y-crop.footY)*s};
}
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
test('isolated proposal clears the full body from post and rear ropes before and throughout climbing',()=>{
 for(let i=0;i<=Math.ceil(duration*144);i++){
  const f=at(i/144),r=rect(f);
  assert.ok(r.left>=0&&r.right<=geometry.width&&r.top>=0&&r.bottom<=geometry.height,JSON.stringify({f,r}));
  assert.equal(overlap(r,REAR_RIGHT_POST),false,`post overlap at ${i/144}`);
  if(f.positionZone!=='DENTRO')for(const rope of REAR_ROPES)
   assert.equal(overlap(r,{left:48,right:592,top:rope.top,bottom:rope.bottom}),false,`rope overlap at ${i/144}`);
 }
});
test('proposal keeps the eight unchanged poses, timing and order; the eighth completes side entry',()=>{
 const seen=[];
 for(let i=0;i<8;i++){
  const t=climbStart+(i+.5)*PROFESSOR_ENTRY_TIMING.climb/8,f=at(t);
  const original=professorPresentationFrame({elapsed:t,entryElapsed:t});
  assert.equal(f.clip,original.clip);assert.equal(f.elapsed,original.elapsed);
  assert.equal(professorSpriteFrame(f.clip,f.elapsed),PROFESSOR_CLIPS.climbing.frames[i]);
  seen.push(f.positionZone);if(i<7)assert.equal(f.stage,'climb');
 }
 assert.deepEqual(seen,['FORA','FORA','FORA','SUBINDO','SUBINDO','SUBINDO','SUBINDO','DENTRO']);
 assert.equal(at(climbStart-.01).positionZone,'FORA');
 assert.equal(at(climbStart+.9+.001).stage,'settle');
 assert.ok(rect(at(climbStart+.9-.001)).right<640);
 assert.equal(PROFESSOR_ENTRY_TIMING.climb,.9);
});
