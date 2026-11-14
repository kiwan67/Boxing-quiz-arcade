import assert from 'node:assert/strict';

export async function checkNetworkQuestions(evaluate,saveImage){
 const report=await evaluate(`(async()=>{
  const questions=await import('/js/questions.js'),view=await import('/js/qteView.js');
  const combat=await import('/js/combat.js'),defense=await import('/js/defense.js');
  const counter=await import('/js/counterAttack.js');
  const shots=[],checks=[],canvas=document.getElementById('game-canvas');
  const click=(x,y)=>{const b=canvas.getBoundingClientRect();canvas.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true,clientX:b.left+x*b.width/640,clientY:b.top+y*b.height/360}));};
  const setup=id=>{
   restart();lobby.updateLobby();debugApi.setDebugEnabled(true);panelApi.updateDebugPanel();
   document.querySelector('[data-debug-question-input]').value=id;
   document.querySelector('[data-debug-question-id]').click();
   if(s.questionBank.history.length!==0||s.questionBank.nextId!==id)throw Error('F3 consumed or failed to queue a question');
   document.querySelector('[data-punch="uppercut"]').click();click(320,200);
   if(s.qte.question?.bankId!==id||s.qte.remaining!==10)throw Error('Normal Uppercut QTE failed');
   return s.qte.question;
  };
  const answer=(q,label)=>{const b=view.questionLayout(q).buttons.find(b=>b.answer===label);click(b.x+b.width/2,b.y+b.height/2);};
  const capture=name=>{renderer.render();shots.push({name,data:canvas.toDataURL('image/png').split(',')[1]});};
  if(!questions.validateQuestionBank(questions.QUESTIONS).ok||questions.QUESTION_COUNT!==20)throw Error('Invalid question bank');
  for(const source of questions.QUESTIONS){
   for(const choice of questions.ANSWER_LABELS){
    const q=setup(source.id),layout=view.questionLayout(q);
    if(q.options.length!==4||layout.bottom>330)throw Error('Clipped question '+source.id);
    if(choice==='A')capture('network-'+source.id);
    const expected=choice===q.correctAnswer?'correct':'incorrect';answer(q,choice);
    if(s.qte.lastResult?.outcome!==expected||s.qte.question!==null)throw Error('Wrong answer judgment');
    answer(q,choice);if(s.questionBank.answers.length!==1)throw Error('Double answer recorded');
    mainGame.update(0);
    const review=document.getElementById('question-review-content');
    if(!review.textContent.includes(source.explanation)||document.getElementById('question-review').hidden)throw Error('Missing explanation review');
    if(source.id==='net-08')capture('network-feedback-'+expected);
    const duration=expected==='correct'?2:4;
    if(s.qte.feedbackRemaining!==duration||!s.qte.pendingResult)throw Error('Wrong reading duration');
    const frozen=JSON.stringify({time:s.gameTime,ai:s.offensiveAI,player:s.playerCombat,enemy:s.opponentCombat,hp:[s.playerHealth,s.enemyHealth],chain:s.counterChain,rush:s.counterRush});
    mainGame.update(duration-.01);
    if(!s.qte.pendingResult||JSON.stringify({time:s.gameTime,ai:s.offensiveAI,player:s.playerCombat,enemy:s.opponentCombat,hp:[s.playerHealth,s.enemyHealth],chain:s.counterChain,rush:s.counterRush})!==frozen)throw Error('Combat advanced during reading');
    mainGame.update(.01);if(s.qte.pendingResult||s.playerCombat.state!==(expected==='correct'?'punching_left':'qte_failed'))throw Error('Reading did not resume combat');
    checks.push({id:source.id,choice,outcome:expected,correct:q.correctAnswer});
   }
  }
  const q=setup('net-10');mainGame.update(10);
  if(s.qte.lastResult?.outcome!=='timeout'||!s.qte.pendingResult||s.qte.feedbackRemaining!==4)throw Error('Timeout reading missing');
  answer(q,q.correctAnswer);if(s.questionBank.answers.length!==1||s.qte.lastResult.outcome!=='timeout')throw Error('Late response accepted');
  capture('network-feedback-timeout');
  mainGame.update(4);if(s.qte.pendingResult||s.playerCombat.state!=='qte_failed')throw Error('Timeout did not resume');
  restart();lobby.updateLobby();
  if(s.questionBank.history.length||s.qte.question||s.qte.lastResult)throw Error('Restart did not clear questions');
  mainGame.update(0);if(!document.getElementById('question-review').hidden)throw Error('Old review after restart');
  if(!counter.beginSpontaneousAttack())throw Error('Defense setup failed');
  defense.selectDefenseSide(s.defense.expectedSide);
  const dq=s.qte.question;if(dq?.kind!=='defense'||dq.options.length!==4)throw Error('Defense bank missing');
  capture('network-defense');answer(dq,dq.correctAnswer);
  if(s.defense.result||!s.qte.pendingResult)throw Error('Defensive result applied before reading');
  mainGame.update(2);
  if(!s.defense.result?.questionCorrect)throw Error('Defensive answer was not applied');
  // The same bank state is shared across offensive and defensive QTEs.
  if(s.questionBank.history.length!==1||s.questionBank.answers.length!==1)throw Error('Wrong defensive history');
  debugApi.setDebugEnabled(false);panelApi.updateDebugPanel();
  restart();lobby.updateLobby();
  return {loaded:questions.QUESTION_COUNT,validation:true,answerChecks:checks,timeout:true,defense:true,restart:true,shots};
 })()`);
 assert.equal(report.loaded,20);assert.equal(report.answerChecks.length,80);
 for(const shot of report.shots)await saveImage(shot.name,shot.data);
 delete report.shots;return report;
}
