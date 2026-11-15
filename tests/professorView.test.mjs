import test from 'node:test';
import {loadProfessorSprites} from './helpers/professorSprites.mjs';
await loadProfessorSprites();
import assert from 'node:assert/strict';
import {createInitialGameState} from '../js/gameState.js';
import {observeProfessorAnswer} from '../js/professorEasterEgg.js';
import {professorFrame,drawProfessor,drawProfessorDebug} from '../js/professorView.js';
import {updateProfessorAnimation,PROFESSOR_ENTRY_DURATION} from '../js/professorAnimation.js';
import {updateProfessorPresentation} from '../js/professorPresentation.js';

function answer(s,outcome='correct'){observeProfessorAnswer(s,{outcome},++s.qte.sequence);}
function correct(s,n){for(let i=0;i<n;i++)answer(s);}
function context(){
 const calls=[];
 const ctx={calls,drawImage(...args){calls.push(['drawImage',...args]);},save(){},restore(){},translate(...args){calls.push(['translate',...args]);},scale(){},
  beginPath(){},arc(...args){calls.push(['arc',...args]);},fill(){},stroke(){},moveTo(){},lineTo(){},
  fillRect(...args){calls.push(['fillRect',this.fillStyle,...args]);},
  strokeRect(...args){calls.push(['strokeRect',...args]);}};
 return ctx;
}

test('4 invisible, 5 behind ropes, 6 fixed, 7 starts entry and finishes behind the bot',()=>{
 const s=createInitialGameState(),ctx=context();correct(s,4);
 assert.equal(professorFrame(s),null);drawProfessor(ctx,s);assert.deepEqual(ctx.calls,[]);
 answer(s);const outside=professorFrame(s);assert.equal(outside.inRing,false);
 answer(s);assert.deepEqual(professorFrame(s),outside);
 answer(s);assert.equal(professorFrame(s).stage,'prepare');
 updateProfessorAnimation(s,PROFESSOR_ENTRY_DURATION);const inside=professorFrame(s);assert.equal(inside.inRing,true);
 assert.ok(outside.x>320&&inside.x>320);assert.ok(inside.x<outside.x);
 assert.ok(outside.floor<272&&inside.floor<272);assert.ok(inside.floor>outside.floor);
 assert.ok(outside.floor<184,'outside feet do not reach the ring floor');
 assert.ok(inside.floor>184,'inside feet stand on the ring floor');
 for(const frame of [outside,inside]){
  assert.ok(frame.x-26*frame.height/128>400);assert.ok(frame.x+26*frame.height/128<640);
  assert.ok(frame.floor-frame.height>=60,'head remains below the HUD while observing');
 }
 const before=JSON.stringify(s);drawProfessor(ctx,s);assert.equal(JSON.stringify(s),before);
 assert.ok(ctx.calls.some(c=>c[0]==='drawImage'&&c.length===10));
 assert.equal(ctx.calls.filter(c=>c[0]==='arc').length,0);
 assert.equal(ctx.imageSmoothingEnabled,false);
 correct(s,5);assert.deepEqual(professorFrame(s),inside);
});

for(const outcome of ['incorrect','timeout'])test(`${outcome} reacts before leaving and stays hidden until next match`,()=>{
 const s=createInitialGameState();correct(s,10);answer(s,outcome);
 assert.equal(professorFrame(s).stage,'disappointed');
 updateProfessorPresentation(s,100);assert.equal(professorFrame(s),null);correct(s,10);assert.equal(professorFrame(s),null);
 const next=createInitialGameState(s.matchId+1);assert.equal(professorFrame(next),null);
 correct(next,5);assert.equal(professorFrame(next).inRing,false);
});

test('debug indicator is opt-in; presenter stays hidden in cutscenes and after match end',()=>{
 const s=createInitialGameState(),ctx=context();correct(s,5);
 drawProfessorDebug(ctx,s,false);assert.deepEqual(ctx.calls,[]);
 drawProfessorDebug(ctx,s,true);assert.ok(ctx.calls.some(c=>c[0]==='fillRect'&&c[1]==='#fff1a0'));
 for(const phase of ['lobby','match_intro','knockout_cinematic','victory','defeat']){
  s.phase=phase;assert.equal(professorFrame(s),null);
 }
 s.phase='idle';s.playerCombat.state='counter_rush_cutscene';assert.ok(professorFrame(s));
 s.playerCombat.state='counter_rush_flash';assert.ok(professorFrame(s));
 s.playerCombat.state='idle';s.matchResult={outcome:'victory'};assert.equal(professorFrame(s),null);
});
