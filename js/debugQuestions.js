import { gameState } from './gameState.js';
import { debugState } from './debug.js';
import { QUESTIONS, QUESTION_COUNT, questionRandom } from './questions.js';
import { submitAttackAnswer, updateCombat } from './combat.js';
import { submitDefenseAnswer } from './defense.js';

export function queueDebugQuestion(id=null){
 if(!debugState.enabled)return 'ATIVE O F3.';
 const bank=gameState.questionBank;
 const available=bank.remaining.length?bank.remaining:QUESTIONS.map(q=>q.id).filter(id=>id!==bank.lastId);
 const selected=id??available[Math.floor(questionRandom()*available.length)];
 if(!available.includes(selected))return 'ID INVÁLIDO OU JÁ UTILIZADO NESTE CICLO.';
 bank.nextId=selected;
 return `${QUESTION_COUNT} PERGUNTAS. ${selected} NO PRÓXIMO QTE NORMAL.`;
}
export function simulateDebugAnswer(outcome){
 if(!debugState.enabled||gameState.phase==='paused')return false;
 const q=gameState.qte.question;if(!q)return false;
 if(outcome==='timeout'){updateCombat(gameState.qte.remaining);return gameState.qte.lastResult?.questionId===q.id;}
 const answer=outcome==='correct'?q.correctAnswer:q.alternatives.find(v=>v!==q.correctAnswer);
 return (q.kind==='defense'?submitDefenseAnswer:submitAttackAnswer)(answer,q.id);
}
