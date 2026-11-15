import test from 'node:test';
import assert from 'node:assert/strict';
import {gameState,createInitialGameState} from '../js/gameState.js';
import {setDebugEnabled,setProfessorDebugForced,debugState} from '../js/debug.js';
import {professorFrame} from '../js/professorView.js';
import {observeProfessorAnswer} from '../js/professorEasterEgg.js';
import {updateProfessorAnimation} from '../js/professorAnimation.js';
import {updateProfessorPresentation} from '../js/professorPresentation.js';
const answer=outcome=>observeProfessorAnswer(gameState,{outcome},++gameState.qte.sequence);
test('visual override never changes any match progress and restores legitimate entry',()=>{
 Object.assign(gameState,createInitialGameState());setDebugEnabled(true);
 const before=JSON.stringify(gameState);setProfessorDebugForced(true);
 assert.equal(professorFrame(gameState).behindRopes,true);assert.equal(JSON.stringify(gameState),before);
 for(let i=0;i<7;i++)answer('correct');updateProfessorAnimation(gameState,.3);
 assert.equal(professorFrame(gameState).clip,'observing');
 setProfessorDebugForced(false);const real=professorFrame(gameState);assert.equal(real.stage,'prepare');
 setProfessorDebugForced(true);setProfessorDebugForced(false);assert.deepEqual(professorFrame(gameState),real);
 for(const outcome of ['incorrect','timeout']){
  answer(outcome);updateProfessorPresentation(gameState,100);assert.equal(professorFrame(gameState),null);
  const blocked=JSON.stringify(gameState);setProfessorDebugForced(true);assert.ok(professorFrame(gameState));
  setProfessorDebugForced(false);assert.equal(professorFrame(gameState),null);assert.equal(JSON.stringify(gameState),blocked);
 }
 for(let i=0;i<10;i++)answer('correct');assert.equal(professorFrame(gameState),null);
 setProfessorDebugForced(true);setDebugEnabled(false);assert.equal(debugState.professorForced,false);
 assert.equal(professorFrame(gameState),null);
});
test('new match and noncombat screens cannot inherit a forced appearance',()=>{
 Object.assign(gameState,createInitialGameState());setDebugEnabled(true);setProfessorDebugForced(true);
 for(const phase of ['lobby','match_intro','victory','defeat','knockout_cinematic']){
  gameState.phase=phase;assert.equal(professorFrame(gameState),null);
 }
 Object.assign(gameState,createInitialGameState(gameState.matchId+1));assert.equal(professorFrame(gameState),null);
 setDebugEnabled(false);assert.equal(setProfessorDebugForced(true),false);
});
