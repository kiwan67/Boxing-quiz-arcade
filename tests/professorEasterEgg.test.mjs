import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialGameState,gameState,resetGameState} from '../js/gameState.js';
import {observeProfessorAnswer,consumeProfessorEvents,createProfessorState} from '../js/professorEasterEgg.js';
import {beginAttackQTE,beginDefenseQuestion,answerQTE,updateQTE} from '../js/qte.js';
import {checkMatchEnd,resetMatch} from '../js/match.js';

function answer(state,outcome='correct',reactions){
 observeProfessorAnswer(state,{outcome},++state.qte.sequence,reactions);
}
function correct(state,n){for(let i=0;i<n;i++)answer(state);}

test('4 invisible, 5 unlocked, 6 outside, 7 in ring and 8+ never repeat the events',()=>{
 const s=createInitialGameState(),e=s.professorEasterEgg;
 correct(s,4);assert.equal(e.consecutiveCorrectAnswers,4);assert.deepEqual(consumeProfessorEvents(s),[]);
 answer(s);assert.equal(e.professorUnlocked,true);assert.equal(e.professorPresent,true);
 assert.deepEqual(consumeProfessorEvents(s).map(e=>e.type),['professor_appearance']);
 assert.deepEqual(consumeProfessorEvents(s),[]);
 answer(s);assert.equal(e.consecutiveCorrectAnswers,6);assert.equal(e.professorInRing,false);
 answer(s);assert.equal(e.professorInRing,true);assert.equal(e.ringEventUsed,true);
 assert.deepEqual(consumeProfessorEvents(s).map(e=>e.type),['professor_enter_ring']);
 correct(s,12);assert.equal(e.professorInRing,true);assert.deepEqual(consumeProfessorEvents(s),[]);
});

for(const outcome of ['incorrect','timeout'])for(const streak of [4,5,6,7,10]){
 test(`${outcome} after ${streak}: reset streak and block only after unlock`,()=>{
  const s=createInitialGameState(),e=s.professorEasterEgg;
  correct(s,streak);answer(s,outcome);
  assert.equal(e.consecutiveCorrectAnswers,0);assert.equal(e.professorPresent,false);assert.equal(e.professorInRing,false);
  assert.equal(e.blocked,streak>=5);assert.equal(e.professorUnlocked,streak>=5);
  assert.equal(e.appearanceEventUsed,streak>=5);assert.equal(e.ringEventUsed,streak>=7);
  assert.deepEqual(consumeProfessorEvents(s),[]);
  correct(s,10);
  assert.equal(e.consecutiveCorrectAnswers,10);
  assert.equal(e.professorPresent,streak<5);assert.equal(e.professorInRing,streak<5);
  if(streak>=5)assert.deepEqual(consumeProfessorEvents(s),[]);
 });
}

test('duplicate and stale results cannot increment or reset; phrases are configurable',()=>{
 const s=createInitialGameState();correct(s,5);consumeProfessorEvents(s);
 observeProfessorAnswer(s,{outcome:'correct'},5);
 observeProfessorAnswer(s,{outcome:'incorrect'},1);
 assert.equal(s.professorEasterEgg.consecutiveCorrectAnswers,5);
 answer(s,'correct',{6:'Futura reação'});
 assert.equal(consumeProfessorEvents(s)[0].phrase,'Futura reação');
 assert.deepEqual(consumeProfessorEvents(s),[]);
});

test('definitive attack, defense and Counter Rush answers count once; timeout resets',()=>{
 resetMatch();
 for(const kind of ['attack','defense','counter_rush']){
  gameState.qte.pendingResult=null;gameState.playerCombat.state=kind==='defense'?'defense_direction_qte':'idle';
  if(kind==='defense')assert.equal(beginDefenseQuestion(),true);
  else assert.equal(beginAttackQTE('left','jab',kind),true);
  if(kind==='attack')gameState.playerCombat.state='attack_qte';
  if(kind==='counter_rush')gameState.playerCombat.state='counter_rush_qte';
  const q=gameState.qte.question;
  assert.equal(answerQTE('INVALID',q.id),null);
  assert.ok(answerQTE(q.correctAnswer,q.id));
  assert.equal(answerQTE(q.correctAnswer,q.id),null);
 }
 assert.equal(gameState.professorEasterEgg.consecutiveCorrectAnswers,3);
 gameState.qte.pendingResult=null;gameState.playerCombat.state='idle';
 assert.equal(beginAttackQTE('left','jab'),true);gameState.playerCombat.state='attack_qte';
 assert.equal(updateQTE(10).outcome,'timeout');assert.equal(updateQTE(10),null);
 assert.equal(gameState.professorEasterEgg.consecutiveCorrectAnswers,0);
});

test('match end cancels pending events; new match resets all flags and deduplication',()=>{
 for(const cinematic of [false,true]){
  resetMatch();correct(gameState,10);gameState.enemyHealth=0;
  assert.equal(checkMatchEnd(cinematic),true);
  const e=gameState.professorEasterEgg;
  assert.equal(e.ended,true);assert.equal(e.professorPresent,false);assert.equal(e.professorInRing,false);
  assert.deepEqual(consumeProfessorEvents(gameState),[]);
  answer(gameState);assert.equal(e.consecutiveCorrectAnswers,10);
  const id=gameState.matchId;resetGameState();assert.equal(gameState.matchId,id+1);
  assert.deepEqual(gameState.professorEasterEgg,createProfessorState());
  correct(gameState,5);assert.equal(gameState.professorEasterEgg.professorPresent,true);
 }
});
