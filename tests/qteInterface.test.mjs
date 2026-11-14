import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {gameState as s} from '../js/gameState.js';
import {restartFight} from '../js/restart.js';
import {requestPunch,updateCombat} from '../js/combat.js';
import {selectPunch} from '../js/punches.js';
import {initializeInput} from '../js/input.js';
import {beginSpontaneousAttack} from '../js/counterAttack.js';
import {selectDefenseSide} from '../js/defense.js';
import {beginTutorialPrompt} from '../js/tutorial.js';
import {QUESTIONS} from '../js/questions.js';
import {questionLayout,drawQTE,wrapQuestionText} from '../js/qteView.js';
const keys=new Map(),mouse=new Map();
const canvas={width:640,height:360,ownerDocument:{addEventListener:(k,f)=>keys.set(k,f),removeEventListener:k=>keys.delete(k)},
 addEventListener:(k,f)=>mouse.set(k,f),removeEventListener:k=>mouse.delete(k),
 getBoundingClientRect:()=>({left:23,top:41,width:960,height:540})};
initializeInput(canvas);
beforeEach(()=>{restartFight();s.offensiveAI.remaining=100;});
function ask(){selectPunch('uppercut');assert.equal(requestPunch('left'),true);return s.qte.question;}
function key(code,extra={}){keys.get('keydown')({code,key:code.slice(-1),preventDefault(){},...extra});}
function click(x,y){mouse.get('mousedown')({button:0,clientX:23+x*1.5,clientY:41+y*1.5});}
for(const prefix of ['Digit','Numpad'])for(let n=1;n<=4;n++)test(`${prefix}${n} selects ${'ABCD'[n-1]} once`,()=>{
 const q=ask();key(prefix+n);assert.equal(s.qte.lastResult.answer,'ABCD'[n-1]);
 assert.equal(s.qte.lastResult.outcome,q.correctAnswer==='ABCD'[n-1]?'correct':'incorrect');
 key(prefix+n);click(50,185);assert.equal(s.questionBank.answers.length,1);
});
test('resized canvas mouse targets all four drawn buttons; gaps and explanation do not answer',()=>{
 for(let n=0;n<4;n++){
  restartFight();const q=ask(),b=questionLayout(q).buttons[n];
  click(320,190);click(50,335);assert.equal(s.qte.question,q);
  click(b.x+b.width/2,b.y+b.height/2);assert.equal(s.qte.lastResult.answer,b.answer);
  click(50,290);assert.equal(s.questionBank.answers.length,1);
 }
});
test('shortcuts ignore repeat, modifiers, text fields, other phases and combat states',()=>{
 const q=ask();
 for(const extra of [{repeat:true},{ctrlKey:true},{altKey:true},{metaKey:true},{target:{tagName:'INPUT'}}])key('Digit1',extra);
 for(const phase of ['lobby','paused','match_intro','knockout_cinematic','victory','defeat']){s.phase=phase;key('Digit1');}
 s.phase='idle';for(const state of ['idle','counter_rush_cutscene','knockout']){s.playerCombat.state=state;key('Digit1');}
 assert.equal(s.qte.question,q);assert.equal(s.questionBank.answers.length,0);
});
test('every bank entry fits the grid, statement and exclusive explanation region at 640x360',()=>{
 for(const q of QUESTIONS)for(const result of [false,true]){
  const l=questionLayout(q,result);assert.equal(l.buttons.length,4);
  const statementBottom=112+l.lines.length*(result?10:20);
  for(const b of l.buttons){
   assert.ok(b.y>=statementBottom+3);assert.ok(b.x>=40&&b.x+b.width<=600&&b.y+b.height<=322);
   assert.ok(b.lines.every(line=>line.length*6*b.scale<=b.width-10));
   assert.ok(b.y+9+(b.lines.length-1)*b.lineHeight+9*b.scale<=b.y+b.height);
  }
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
   const a=l.buttons[i],b=l.buttons[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);
  }
  if(result)assert.ok(l.bottom+22+(wrapQuestionText(q.explanation,46).length-1)*20+18<=334);
  restartFight();s.qte.question={...q,timeLimit:10};s.qte.remaining=10;s.playerCombat.state='attack_qte';
  const rectangles=[],ctx={save(){},restore(){},fillRect(x,y,w,h){rectangles.push({x,y,w,h});}};
  drawQTE(ctx,s);assert.ok(rectangles.every(r=>r.x>=0&&r.y>=0&&r.x+r.w<=640&&r.y+r.h<=360));
 }
});

test('keyboard uses defensive submission and tutorial blocks numeric shortcuts',()=>{
 assert.equal(beginSpontaneousAttack(),true);selectDefenseSide(s.defense.expectedSide);
 const q=s.qte.question;key('Numpad'+('ABCD'.indexOf(q.correctAnswer)+1));
 assert.equal(s.qte.lastResult.kind,'defense');assert.equal(s.qte.lastResult.outcome,'correct');
 assert.equal(s.defense.result,null);updateCombat(2);assert.equal(s.playerCombat.state,'counter_wait');
 restartFight();const attack=ask();beginTutorialPrompt();key('Digit1');
 assert.equal(s.qte.question,attack);assert.equal(s.questionBank.answers.length,0);
});
