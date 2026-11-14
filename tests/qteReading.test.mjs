import {test,beforeEach,afterEach,mock} from 'node:test';
import assert from 'node:assert/strict';
import {gameState as s} from '../js/gameState.js';
import {restartFight} from '../js/restart.js';
import {requestPunch,submitAttackAnswer,updateCombat,startPunch} from '../js/combat.js';
import {selectDefenseSide,submitDefenseAnswer} from '../js/defense.js';
import {beginSpontaneousAttack} from '../js/counterAttack.js';
import {selectPunch} from '../js/punches.js';
import {QTE_READING_SECONDS,updateQuestionReading} from '../js/qte.js';
import {QUESTIONS} from '../js/questions.js';
import {drawQTE,wrapQuestionText} from '../js/qteView.js';

beforeEach(()=>{restartFight();s.offensiveAI.remaining=100;mock.method(Math,'random',()=>.99);});
afterEach(()=>mock.restoreAll());
const finishReading=()=>updateCombat(s.qte.feedbackRemaining);
function ask(){selectPunch('uppercut');assert.equal(requestPunch('left'),true);return s.qte.question;}
function frozen(){return JSON.stringify({time:s.gameTime,health:[s.playerHealth,s.enemyHealth],player:s.playerCombat,opponent:s.opponentCombat,
 ai:s.offensiveAI,counter:s.counterAttack,rush:s.counterRush,chain:s.counterChain,stun:s.stun,defense:s.defense,punches:s.punches,last:s.lastAttackResult});}

for(const outcome of ['correct','incorrect','timeout'])test(`${outcome}: leitura configurada, combate congelado e resultado aplicado uma vez`,()=>{
 const q=ask();
 if(outcome==='timeout')updateCombat(q.timeLimit);
 else assert.equal(submitAttackAnswer(outcome==='correct'?q.correctAnswer:q.alternatives.find(a=>a!==q.correctAnswer),q.id),true);
 assert.equal(s.qte.lastResult.outcome,outcome);assert.equal(s.qte.feedbackRemaining,QTE_READING_SECONDS[outcome]);
 assert.equal(s.playerCombat.state,'attack_qte');assert.equal(s.qte.remaining,0);assert.equal(s.lastAttackResult,null);assert.equal(s.counterAttack.pending,false);
 const snapshot=frozen();updateCombat(QTE_READING_SECONDS[outcome]-.001);assert.equal(frozen(),snapshot);
 assert.equal(submitAttackAnswer(q.correctAnswer,q.id),false);assert.equal(requestPunch('right'),false);assert.equal(startPunch('left'),false);
 assert.equal(beginSpontaneousAttack(),false);assert.equal(s.questionBank.answers.length,1);
 updateCombat(.001);assert.equal(s.qte.pendingResult,null);assert.equal(s.qte.feedbackRemaining,0);
 assert.equal(s.playerCombat.state,outcome==='correct'?'punching_left':'qte_failed');
 const applied=s.qte.lastResult;assert.equal(updateQuestionReading(100),null);assert.equal(s.qte.lastResult,applied);
 if(outcome==='correct'){updateCombat(.55);assert.equal(s.enemyHealth,75);updateCombat(0);assert.equal(s.enemyHealth,75);}
 else assert.equal(s.counterAttack.pending,true);
});

for(const fps of [30,60,144])for(const correct of [true,false])test(`leitura ${correct?'correta':'incorreta'} a ${fps} FPS`,()=>{
 const q=ask();submitAttackAnswer(correct?q.correctAnswer:q.alternatives.find(a=>a!==q.correctAnswer),q.id);
 const duration=correct?2:4;
 for(let n=0;n<duration*fps-1;n++){updateCombat(1/fps);assert.ok(s.qte.pendingResult);}
 updateCombat(1/fps);assert.equal(s.qte.pendingResult,null);
 assert.equal(s.playerCombat.state,correct?'punching_left':'qte_failed');
});

for(const outcome of ['correct','incorrect','timeout'])test(`defesa ${outcome} só libera o contra-ataque depois da leitura`,()=>{
 assert.equal(beginSpontaneousAttack(),true);selectDefenseSide(s.defense.expectedSide);const q=s.qte.question;
 if(outcome==='timeout')updateCombat(10);else submitDefenseAnswer(outcome==='correct'?q.correctAnswer:q.alternatives.find(a=>a!==q.correctAnswer),q.id);
 assert.equal(s.defense.result,null);const snapshot=frozen();
 updateCombat(QTE_READING_SECONDS[outcome]-.001);assert.equal(frozen(),snapshot);
 assert.equal(submitDefenseAnswer(q.correctAnswer,q.id),false);updateCombat(.001);
 assert.equal(s.playerCombat.state,'counter_wait');assert.equal(s.defense.result.questionOutcome,outcome);
 assert.equal(s.playerHealth,100);updateCombat(.55);assert.ok(s.playerHealth<100);
});

test('Counter Rush e Chain mantêm janela, tempo de resposta, dano e próxima etapa',()=>{
 beginSpontaneousAttack();selectDefenseSide(s.defense.expectedSide);let q=s.qte.question;submitDefenseAnswer(q.correctAnswer,q.id);finishReading();
 updateCombat(.55);updateCombat(3);updateCombat(.12);
 assert.equal(s.playerCombat.state,'counter_rush_window');selectPunch('jab');requestPunch('right');q=s.qte.question;
 assert.equal(q.kind,'counter_rush');assert.equal(q.timeLimit,5);submitAttackAnswer(q.correctAnswer,q.id);
 const snapshot=frozen();updateCombat(1.99);assert.equal(frozen(),snapshot);updateCombat(.01);
 assert.equal(s.playerCombat.state,'counter_rush_resolution');assert.equal(s.counterChain.count,1);
 updateCombat(.40);assert.equal(s.enemyHealth,92.5);assert.equal(s.counterChain.state,'counter_chain_recovery');
 updateCombat(.22);assert.equal(s.playerCombat.state,'defense_direction_qte');
});

test('pausa manual segura leitura e reinício elimina resultado pendente sem timers atrasados',()=>{
 const q=ask();submitAttackAnswer(q.correctAnswer,q.id);s.phase='paused';const snapshot=JSON.stringify(s);updateCombat(30);assert.equal(JSON.stringify(s),snapshot);
 s.phase='idle';updateCombat(1);assert.equal(s.qte.feedbackRemaining,1);restartFight();
 updateCombat(10);assert.equal(s.qte.pendingResult,null);assert.equal(s.qte.lastResult,null);assert.equal(s.enemyHealth,100);
});

test('todas as explicações cabem em fonte 2 e opções corretas/escolhidas são destacadas',()=>{
 const rectangles=[],ctx={save(){},restore(){},fillRect(x,y,w,h){rectangles.push({color:this.fillStyle,x,y,w,h});}};
 for(const source of QUESTIONS){
  restartFight();s.questionBank.nextId=source.id;const q=ask();submitAttackAnswer(q.alternatives.find(a=>a!==q.correctAnswer),q.id);
  assert.ok(wrapQuestionText(source.explanation,46).length<=3);rectangles.length=0;drawQTE(ctx,s);
  assert.ok(rectangles.some(r=>r.color==='#5ee08b'&&r.w===272));assert.ok(rectangles.some(r=>r.color==='#ff7a87'&&r.w===272));
  assert.ok(rectangles.every(r=>r.x>=0&&r.y>=0&&r.x+r.w<=640&&r.y+r.h<=360));
 }
});
