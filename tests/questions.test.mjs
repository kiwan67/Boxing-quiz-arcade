import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS, QUESTION_COUNT, QUESTION_CATEGORIES, validateQuestionBank, createQuestion, createQuestionHistory } from '../js/questions.js';
import { gameState as s } from '../js/gameState.js';
import { restartFight } from '../js/restart.js';
import { beginAttackQTE, beginDefenseQuestion, answerQTE, updateQTE } from '../js/qte.js';
import { questionLayout, qteAnswerAt, drawQTE, questionResultLabel, updateQuestionReview } from '../js/qteView.js';
import { queueDebugQuestion, simulateDebugAnswer } from '../js/debugQuestions.js';
import { setDebugEnabled } from '../js/debug.js';
import { requestPunch, updateCombat } from './helpers/combat.mjs';
import { selectPunch } from '../js/punches.js';

const expected=['Rede','7','TCP','32','128','255.255.255.0','192.168.1.10','TRADUZIR NOMES DE DOMÍNIO EM ENDEREÇOS IP','DHCP','UTILIZA TLS PARA PROTEGER A COMUNICAÇÃO','80','SWITCH','INTERLIGAR REDES E ENCAMINHAR PACOTES','48 BITS','RESOLVER IPv4 EM ENDEREÇO MAC','TRADUZIR ENDEREÇOS IP','IEEE 802.11','ping','FILTRAR TRÁFEGO CONFORME REGRAS','ESTRELA'];
expected.push('INTERLIGA DISPOSITIVOS EM ÁREA LIMITADA','WAN','FORNECER SERVIÇOS AOS CLIENTES','CAPACIDADE DE TRANSMISSÃO',
 'CONECTAR CLIENTES SEM FIO','PLACA DE REDE (NIC)','REPETE NAS DEMAIS PORTAS','TRANSPORTE','INTERNET','ADICIONAR CONTROLE AOS DADOS',
 'FIBRA ÓPTICA','PARA REDUZIR INTERFERÊNCIAS','USAR SENHAS LONGAS E ÚNICAS','ENGANAR PARA ROUBAR DADOS',
 'CONCEDER SÓ O ACESSO NECESSÁRIO','CORRIGIR VULNERABILIDADES','ipconfig','tracert','nslookup','NÃO, O ICMP PODE SER BLOQUEADO');
function rng(seed=37){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function active(){restartFight();assert.equal(beginAttackQTE('left'),true);s.playerCombat.state='attack_qte';return s.qte.question;}

test('40 questões únicas, oito categorias de cinco perguntas e gabarito conferido',()=>{
 const result=validateQuestionBank(QUESTIONS,false);
 assert.equal(result.ok,true);assert.equal(QUESTION_COUNT,40);assert.equal(result.valid.length,40);
 assert.equal(new Set(QUESTIONS.map(q=>q.id)).size,40);
 assert.equal(new Set(QUESTIONS.map(q=>q.statement.trim().toUpperCase())).size,40);
 assert.equal(QUESTION_CATEGORIES.length,8);
 for(const category of QUESTION_CATEGORIES)assert.equal(QUESTIONS.filter(q=>q.category===category).length,5,category);
 QUESTIONS.forEach((q,i)=>{assert.equal(q.options.length,4);assert.equal(q.options[q.correctIndex],expected[i]);assert.ok(q.category&&q.explanation);});
});
test('validação ignora itens inválidos e não derruba a seleção, mesmo sem itens válidos',()=>{
 const valid=QUESTIONS[0],warnings=[],original=console.warn;console.warn=(...args)=>warnings.push(args);
 try{
  const invalid=[valid,valid,null,{...valid,id:'empty',options:['','','','']},{...valid,id:'index',correctIndex:4}, {...valid,id:'three',options:['a','b','c']},{...valid,id:'duplicate-statement'}];
  const result=validateQuestionBank(invalid);assert.equal(result.valid.length,1);assert.equal(result.errors.length,6);assert.equal(warnings.length,1);
  assert.equal(validateQuestionBank(null,false).ok,false);
  assert.equal(createQuestion(1,'attack',0,createQuestionHistory(),rng(),[null]).bankId,valid.id);
 }finally{console.warn=original;}
});
test('cem ciclos compartilhados sem repetição, sem repetição na fronteira e com histórico',()=>{
 const history=createQuestionHistory(),random=rng();let previous=null;
 let previousCategory=null;
 for(let cycle=0;cycle<100;cycle++){
  const ids=[];
  for(let n=0;n<40;n++){
   const q=createQuestion(cycle*40+n+1,['attack','defense','counter_rush'][n%3],7,history,random);
   assert.notEqual(q.category,previousCategory);previousCategory=q.category;
   if(!n)assert.notEqual(q.bankId,previous);ids.push(q.bankId);previous=q.bankId;
   const source=QUESTIONS.find(v=>v.id===q.bankId);
   assert.equal(q.options[q.correctIndex],source.options[source.correctIndex]);
  }
  assert.equal(new Set(ids).size,40);assert.equal(history.usedIds.length,40);assert.equal(history.remaining.length,0);
 }
 assert.equal(history.history.length,4000);assert.equal(history.cycle,100);
});
test('embaralhamento varia a sequência e distribui a posição correta pelas quatro letras',()=>{
 const first=[],counts=[0,0,0,0],history=createQuestionHistory(),random=rng(91);
 for(let n=0;n<4000;n++){const q=createQuestion(n,'attack',1,history,random);counts[q.correctIndex]++;if(n<80)first.push(q.bankId);}
 assert.notDeepEqual(first.slice(0,40),first.slice(40));
 counts.forEach(count=>assert.ok(count>850&&count<1150,JSON.stringify(counts)));
});
test('todas as alternativas são julgadas pelo gabarito, com um único registro por QTE',()=>{
 for(const source of QUESTIONS)for(const chosen of ['A','B','C','D']){
  restartFight();s.questionBank.nextId=source.id;beginAttackQTE('left');s.playerCombat.state='attack_qte';
  const q=s.qte.question,result=answerQTE(chosen,q.id);
  assert.equal(q.bankId,source.id);assert.equal(result.outcome,chosen===q.correctAnswer?'correct':'incorrect');
  assert.equal(result.correctIndex,q.correctIndex);assert.equal(result.explanation,source.explanation);
  assert.equal(answerQTE(chosen,q.id),null);assert.equal(s.questionBank.answers.length,1);
 }
});
test('timeout, limite exato, pausa, IDs antigos e entradas inválidas preservam a resolução única',()=>{
 let q=active();assert.equal(answerQTE('A','old'),null);assert.equal(answerQTE('INVALID',q.id),null);
 s.phase='paused';assert.equal(answerQTE(q.correctAnswer,q.id),null);assert.equal(updateQTE(100),null);s.phase='idle';
 s.qte.remaining=0;assert.equal(answerQTE(q.correctAnswer,q.id).outcome,'timeout');assert.equal(updateQTE(100),null);
 q=active();assert.equal(updateQTE(-1),null);assert.equal(updateQTE(NaN),null);
 assert.equal(updateQTE(10).outcome,'timeout');assert.equal(answerQTE(q.correctAnswer,q.id),null);
 restartFight();assert.equal(s.questionBank.remaining.length,40);assert.equal(s.questionBank.history.length,0);
 assert.equal(s.questionBank.answers.length,0);assert.equal(s.questionBank.cycle,1);assert.equal(s.qte.feedbackRemaining,0);
});
test('ataque, defesa e Rush usam o mesmo ciclo mesmo com erro, timeout ou mudança de round',()=>{
 restartFight();const ids=[];
 assert.equal(new Set(s.questionBank.remaining).size,40);
 for(let n=0;n<41;n++){
  s.qte.pendingResult=null;s.playerCombat.state=n%3===1?'defense_direction_qte':'idle';
  if(n===20)s.round++;
  if(n%3===1)assert.equal(beginDefenseQuestion(),true);
  else {assert.equal(beginAttackQTE('left','jab',n%3===2?'counter_rush':'attack'),true);s.playerCombat.state=n%3===2?'counter_rush_qte':'attack_qte';}
  const q=s.qte.question;ids.push(q.bankId);
  if(n%3===2)assert.equal(updateQTE(10).outcome,'timeout');
  else answerQTE(n%3===0?q.correctAnswer:q.alternatives.find(a=>a!==q.correctAnswer),q.id);
  assert.equal(s.questionBank.cycle,n<40?1:2);
 }
 assert.equal(new Set(ids.slice(0,40)).size,40);assert.notEqual(ids[39],ids[40]);
 assert.equal(s.questionBank.answers.length,41);assert.equal(s.questionBank.remaining.length,39);
});
test('enunciados e quatro opções cabem em 640x360 com fonte 2 e hit-test consistente',()=>{
 for(const source of QUESTIONS){
  const q={...source},layout=questionLayout(q);
  assert.ok(layout.bottom<=330);assert.ok(layout.lines.every(v=>v.length<=46));
  assert.equal(layout.buttons.length,4);
  for(const b of layout.buttons){
   assert.ok(b.lines.every(v=>v.length*12-2<=b.width-10));
   assert.equal(qteAnswerAt(b.x+10,b.y+10,q),b.answer);
   assert.equal(qteAnswerAt(b.x+b.width,b.y,q),null);
   assert.ok(b.y+b.height<=330);
  }
 }
});
test('feedback distingue acerto, erro e timeout, destaca opções e mantém explicação consultável',()=>{
 for(const outcome of ['correct','incorrect','timeout']){
  const q=active();outcome==='timeout'?updateQTE(10):answerQTE(outcome==='correct'?q.correctAnswer:q.alternatives.find(a=>a!==q.correctAnswer),q.id);
  const colors=[],ctx={save(){},restore(){},fillRect(){colors.push(this.fillStyle);}};
  drawQTE(ctx,s);assert.ok(colors.includes('#5ee08b'));
  if(outcome==='incorrect')assert.ok(colors.includes('#ff7a87'));
  assert.equal(questionResultLabel(s.qte.lastResult),{correct:'RESPOSTA CORRETA!',incorrect:'RESPOSTA INCORRETA!',timeout:'TEMPO ESGOTADO!'}[outcome]);
  const details={},content={},doc={getElementById:id=>id==='question-review'?details:content};
  updateQuestionReview(doc);assert.equal(details.hidden,false);assert.ok(content.textContent.includes(q.explanation));
  restartFight();updateQuestionReview(doc);assert.equal(details.hidden,true);
 }
});
test('F3 usa os QTEs normais, não consome perguntas ao preparar e simula acerto/erro/timeout',()=>{
 restartFight();setDebugEnabled(false);assert.equal(simulateDebugAnswer('correct'),false);
 assert.equal(s.questionBank.nextId,null);queueDebugQuestion('net-08');assert.equal(s.questionBank.nextId,null);
 for(const outcome of ['correct','incorrect','timeout']){
  restartFight();setDebugEnabled(true);queueDebugQuestion('net-08');assert.equal(s.questionBank.history.length,0);
  selectPunch('uppercut');assert.equal(requestPunch('left'),true);assert.equal(s.qte.question.bankId,'net-08');
  assert.equal(s.qte.remaining,10);assert.equal(simulateDebugAnswer(outcome),true);assert.equal(s.qte.lastResult.outcome,outcome);
  assert.equal(simulateDebugAnswer(outcome),false);
  assert.match(queueDebugQuestion('net-08'),/JÁ UTILIZADO/);
  updateCombat(.01);
 }
 setDebugEnabled(false);restartFight();
 setDebugEnabled(true);queueDebugQuestion('net-01');setDebugEnabled(false);assert.equal(s.questionBank.nextId,null);
});
