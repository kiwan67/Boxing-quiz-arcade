import test from 'node:test';
import assert from 'node:assert/strict';
import {gameState,createInitialGameState} from '../js/gameState.js';
import {observeProfessorAnswer} from '../js/professorEasterEgg.js';
import {professorFrame,drawProfessor,drawProfessorAtSide} from '../js/professorView.js';
import {updateProfessorAnimation,PROFESSOR_ENTRY_TIMING} from '../js/professorAnimation.js';
import {setDebugEnabled,setProfessorDebugMode,updateProfessorDebugAnimation} from '../js/debug.js';
import {loadProfessorSprites} from './helpers/professorSprites.mjs';
await loadProfessorSprites();
const total=Object.values(PROFESSOR_ENTRY_TIMING).reduce((a,b)=>a+b,0);
function setup(count){const s=createInitialGameState();for(let n=0;n<count;n++)observeProfessorAnswer(s,{outcome:'correct'},++s.qte.sequence);return s;}
for(const progress of [null,.2,PROFESSOR_ENTRY_TIMING.approach+.2,total-PROFESSOR_ENTRY_TIMING.settle-PROFESSOR_ENTRY_TIMING.recover-.2,total+1])test(`Counter Rush preserves visible frame and resumes progress ${progress}`,()=>{
 const s=setup(progress===null?5:7);if(progress!==null)updateProfessorAnimation(s,progress);
 const before=professorFrame(s),egg=JSON.stringify(s.professorEasterEgg);
 for(const state of ['counter_rush_cutscene','counter_rush_flash']){
  s.playerCombat.state=state;updateProfessorAnimation(s,100);
  assert.deepEqual(professorFrame(s),before);assert.equal(JSON.stringify(s.professorEasterEgg),egg);
  const calls=[],ctx={save(){},restore(){},translate(){},scale(){},drawImage(...args){calls.push(args);},beginPath(){},rect(){},clip(){}};
  if(!drawProfessorAtSide(ctx,s,{width:640,height:360}))drawProfessor(ctx,s,'OUTSIDE');
  drawProfessor(ctx,s,'INSIDE');assert.ok(calls.length>=1);
 }
 s.playerCombat.state='idle';updateProfessorAnimation(s,.01);
 assert.ok(professorFrame(s).elapsed>=before.elapsed);
 s.phase='paused';const paused=professorFrame(s);updateProfessorAnimation(s,100);assert.deepEqual(professorFrame(s),paused);
});
test('all visual debug modes freeze through Rush and pause, leaving real match untouched',()=>{
 Object.assign(gameState,createInitialGameState());setDebugEnabled(true);
 for(const mode of ['outside','entry','inside']){
  setProfessorDebugMode(mode);updateProfessorDebugAnimation(gameState,.2);
  const frame=professorFrame(gameState),before=JSON.stringify(gameState);
  gameState.playerCombat.state='counter_rush_cutscene';updateProfessorDebugAnimation(gameState,100);
  assert.deepEqual(professorFrame(gameState),frame);
  gameState.playerCombat.state='idle';assert.equal(JSON.stringify(gameState),before);
  gameState.phase='paused';updateProfessorDebugAnimation(gameState,100);assert.deepEqual(professorFrame(gameState),frame);
  gameState.phase='idle';updateProfessorDebugAnimation(gameState,total+1);
  assert.equal(professorFrame(gameState).layer,mode==='outside'?'OUTSIDE':'INSIDE');
  setProfessorDebugMode(null);assert.equal(professorFrame(gameState),null);
 }
 setDebugEnabled(false);
});
