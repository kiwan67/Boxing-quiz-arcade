import test from 'node:test';
import assert from 'node:assert/strict';
import {gameState} from '../js/gameState.js';
import {resetMatch} from '../js/match.js';
import {setDebugEnabled} from '../js/debug.js';
import {beginAttackQTE,answerQTE,updateQTE} from '../js/qte.js';

function answer(outcome='correct'){
 gameState.qte.pendingResult=null;gameState.playerCombat.state='idle';
 assert.equal(beginAttackQTE('left','jab'),true);gameState.playerCombat.state='attack_qte';
 const q=gameState.qte.question;
 if(outcome==='timeout')return updateQTE(10);
 const choice=outcome==='correct'?q.correctAnswer:q.alternatives.find(a=>a!==q.correctAnswer);
 return answerQTE(choice,q.id);
}

test('F3 debug logs snapshots, milestones, interruptions and reset without consuming events',t=>{
 setDebugEnabled(false);resetMatch();
 const log=t.mock.method(console,'log',()=>{});
 const before=JSON.stringify(gameState);setDebugEnabled(true);
 assert.equal(JSON.stringify(gameState),before);
 assert.deepEqual(log.mock.calls[0].arguments[1],{
  consecutiveCorrectAnswers:0,professorUnlocked:false,professorPresent:false,professorInRing:false,professorEventUsed:false
 });
 for(let i=0;i<6;i++)answer();
 assert.equal(gameState.professorEasterEgg.professorInRing,false);
 answer();assert.equal(log.mock.calls.at(-1).arguments[0],'[EASTER EGG] PROFESSOR ENTROU NO RINGUE');
 for(let i=0;i<3;i++)answer();
 const messages=()=>log.mock.calls.map(call=>call.arguments[0]);
 assert.equal(messages().filter(m=>m==='[EASTER EGG] PROFESSOR DESBLOQUEADO').length,1);
 assert.equal(messages().filter(m=>m==='[EASTER EGG] PROFESSOR ENTROU NO RINGUE').length,1);
 const snapshot=log.mock.calls.at(-1).arguments[1];
 assert.equal(snapshot.consecutiveCorrectAnswers,10);assert.equal(snapshot.professorInRing,true);
 assert.equal(gameState.professorEasterEgg.pendingEvents.length,2);
 const calls=log.mock.callCount();
 assert.equal(answerQTE('A',gameState.qte.lastResult.questionId),null);
 assert.equal(log.mock.callCount(),calls);
 answer('incorrect');
 assert.equal(messages().at(-1),'[EASTER EGG] SEQUÊNCIA INTERROMPIDA');
 assert.equal(snapshot.professorInRing,true); // Previously logged values stay unchanged.
 for(let i=0;i<10;i++)answer();
 assert.equal(messages().filter(m=>m==='[EASTER EGG] PROFESSOR DESBLOQUEADO').length,1);
 answer('timeout');assert.equal(messages().at(-1),'[EASTER EGG] SEQUÊNCIA INTERROMPIDA');
 resetMatch();assert.equal(messages().at(-1),'[EASTER EGG] EASTER EGG REINICIADO');
 assert.equal(log.mock.calls.at(-1).arguments[1].professorEventUsed,false);
 setDebugEnabled(false);
});

test('disabled debug stays silent through milestones, failure, timeout and reset',t=>{
 setDebugEnabled(false);resetMatch();const log=t.mock.method(console,'log',()=>{});
 for(let i=0;i<10;i++)answer();
 answer('incorrect');answer('timeout');resetMatch();
 assert.equal(log.mock.callCount(),0);
});
