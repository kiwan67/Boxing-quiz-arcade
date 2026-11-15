import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProfessorSprites} from './helpers/professorSprites.mjs';
import {createInitialGameState} from '../js/gameState.js';
import {observeProfessorAnswer} from '../js/professorEasterEgg.js';
import {updateProfessorAnimation,professorAnimationFrame,PROFESSOR_ENTRY_TIMING as timing,PROFESSOR_POSITIONS} from '../js/professorAnimation.js';
import {drawProfessor,drawProfessorAtSide} from '../js/professorView.js';
import {professorSpriteFrame} from '../js/professorSprites.js';
await loadProfessorSprites();
const total=Object.values(timing).reduce((a,b)=>a+b,0);
function answer(s,outcome='correct'){observeProfessorAnswer(s,{outcome},++s.qte.sequence);}
function setup(n=7){const s=createInitialGameState();for(let i=0;i<n;i++)answer(s);return s;}
test('5–6 observe; 7 walks to the right side, stops, steps onto the apron and settles',()=>{
 const s=setup(5);assert.equal(professorAnimationFrame(s).clip,'observing');answer(s);answer(s);
 assert.equal(professorAnimationFrame(s).stage,'prepare');
 updateProfessorAnimation(s,timing.prepare+.1);assert.equal(professorAnimationFrame(s).clip,'walkingSide');
 updateProfessorAnimation(s,timing.approach-.1+.01);let f=professorAnimationFrame(s);
 assert.equal(f.stage,'edge');assert.equal(f.x,PROFESSOR_POSITIONS.edge.x);
 updateProfessorAnimation(s,timing.edge-.01+.05);assert.equal(professorAnimationFrame(s).stage,'stop');
 updateProfessorAnimation(s,timing.stop-.05+.05);f=professorAnimationFrame(s);
 assert.equal(f.clip,'climbing');assert.equal(f.floor,PROFESSOR_POSITIONS.edge.floor,'lower supporting foot stays planted');
 updateProfessorAnimation(s,timing.climb*.5);assert.equal(professorAnimationFrame(s).layer,'ENTERING');
 updateProfessorAnimation(s,total);f=professorAnimationFrame(s);
 assert.equal(f.stage,'observing');assert.equal(f.layer,'INSIDE');assert.equal(f.x,PROFESSOR_POSITIONS.inside.x);
});
test('whole character is drawn once; disjoint cache rectangles put only the post in front',()=>{
 const s=setup();
 const calls=[],ctx={save(){},restore(){},translate(){},scale(){},drawImage(...args){calls.push(args);}};
 const rear={width:640,height:360};
 for(let i=0;i<Math.ceil((total+1)*60);i++){
  updateProfessorAnimation(s,1/60);calls.length=0;
  if(!drawProfessorAtSide(ctx,s,rear))drawProfessor(ctx,s,'OUTSIDE');drawProfessor(ctx,s,'INSIDE');
  const crop=professorSpriteFrame(professorAnimationFrame(s).clip,professorAnimationFrame(s).elapsed);
  const actors=calls.filter(a=>a[0]!==rear);assert.equal(actors.length,1);
  assert.deepEqual(actors[0].slice(1,5),[crop.x,crop.y,crop.width,crop.height]);
  const rectangles=calls.filter(a=>a[0]===rear).map(a=>a.slice(1,5));
  if(rectangles.length){
   assert.equal(rectangles.reduce((sum,[x,y,w,h])=>sum+w*h,0),640*360);
   for(let a=0;a<rectangles.length;a++)for(let b=a+1;b<rectangles.length;b++){
    const [x,y,w,h]=rectangles[a],[xx,yy,ww,hh]=rectangles[b];
    assert.ok(Math.min(x+w,xx+ww)<=Math.max(x,xx)||Math.min(y+h,yy+hh)<=Math.max(y,yy));
   }
   assert.deepEqual(calls.at(-1).slice(1,5),[578,94,30,112]);
  }
 }
});
test('approved high resolution idle preserves detail and fixed foot baseline',()=>{
 const s=setup(5),base=professorAnimationFrame(s);
 const crops=[0,.81,1.61,2.41].map(t=>professorSpriteFrame('observing',t));
 assert.equal(new Set(crops).size,4);assert.equal(new Set(crops.map(c=>c.footY)).size,1);
 updateProfessorAnimation(s,6.5);const f=professorAnimationFrame(s);
 assert.equal(f.x,base.x);assert.equal(f.floor,base.floor);assert.equal(f.height,base.height);
});
test('pause preserves exact progress; wrong/timeout lock real appearance until a new match',()=>{
 for(const outcome of ['incorrect','timeout']){
  const s=setup();updateProfessorAnimation(s,.8);const before=professorAnimationFrame(s);
  s.phase='paused';updateProfessorAnimation(s,100);assert.deepEqual(professorAnimationFrame(s),before);
  s.phase='idle';updateProfessorAnimation(s,.1);assert.ok(professorAnimationFrame(s).x>before.x);
  answer(s,outcome);assert.equal(professorAnimationFrame(s),null);
  for(let n=0;n<10;n++)answer(s);assert.equal(professorAnimationFrame(s),null);
  assert.equal(professorAnimationFrame(setup(5)).layer,'OUTSIDE');
 }
});
test('frame rate changes preserve final presentation and never mutate the real match',()=>{
 for(const fps of [30,60,144]){
  const s=setup(),before=JSON.stringify(s);for(let n=0;n<fps*(total+1);n++)updateProfessorAnimation(s,1/fps);
  assert.equal(professorAnimationFrame(s).stage,'observing');assert.equal(JSON.stringify(s),before);
 }
});
