import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { gameState as s } from '../js/gameState.js';
import { restartFight } from '../js/restart.js';
import { initializeInput } from '../js/input.js';
import { beginSpontaneousAttack } from '../js/counterAttack.js';
import { updateCombat, requestPunch, submitAttackAnswer } from './helpers/combat.mjs';
import { QTE_BUTTONS } from '../js/qteView.js';
import {finishReading} from './helpers/reading.mjs';
import { debugState, setDebugEnabled, readDebugSnapshot, armPerfectDefense, setDebugGameSpeed } from '../js/debug.js';
import { selectPunch } from '../js/punches.js';
import { enemyAccuracyDebug } from '../js/enemyAccuracy.js';
import { simulationDelta } from '../js/simulationClock.js';
import { selectDefenseSide, submitDefenseAnswer, registerDefenseImpact } from './helpers/defenseApi.mjs';
import { updateQTE } from '../js/qte.js';
import { DEFENSE_BUTTONS, defenseSideAt } from '../js/defenseView.js';

class Canvas extends EventTarget {
    width=640; height=360;
    getBoundingClientRect(){return {left:10,top:20,width:320,height:180};}
}
const canvas=new Canvas(); initializeInput(canvas);
function click(x,y,button=0) {
    const event=new Event('mousedown',{cancelable:true});
    Object.defineProperties(event,{button:{value:button},clientX:{value:10+x/2},clientY:{value:20+y/2}});
    canvas.dispatchEvent(event);
    finishReading();
}
function open(arm) {
    let roll=0;
    const random=mock.method(Math,'random',()=>roll++===0 && arm==='left' ? 0 : 0.99);
    assert.equal(beginSpontaneousAttack(),true); random.mock.restore();
}
function answerShown() {
    const snapshot=readDebugSnapshot();
    const answer=snapshot.answer.split('RESPOSTA CORRETA: ')[1];
    assert.equal(answer,s.qte.question.correctAnswer);
    const button=QTE_BUTTONS.find(b=>b.answer===answer);
    click(button.x+10,button.y+10);
}
beforeEach(()=>{restartFight();setDebugEnabled(true);debugState.showAttackSide=true;debugState.showAnswers=true;mock.method(Math,'random',()=>0.99);});
afterEach(()=>{mock.restoreAll();setDebugEnabled(false);enemyAccuracyDebug.forceOutcome=null;});

for(const [arm,side,label] of [['right','left','ESQUERDA'],['left','right','DIREITA']]) {
    test(`clique esquerdo no botão ${label} indicado pelo debug aplica 10% e abre Rush`,()=>{
        open(arm);
        assert.ok(readDebugSnapshot().attackSide.includes(label));
        click(side==='left'?226:414,216); answerShown(); updateCombat(0.55);
        assert.equal(s.defense.lastResult.selectedSide,side);
        assert.equal(s.playerHealth,98);
        assert.equal(s.playerCombat.state,'counter_rush_cutscene');
        const diagnostic=readDebugSnapshot();
        assert.equal(diagnostic.lastDefenseSide,label);
        assert.equal(diagnostic.lastDefenseSelectedSide,label);
        assert.equal(diagnostic.lastDefenseSideCorrect,'SIM');
        assert.equal(diagnostic.lastDefenseAnswerCorrect,'SIM');
        assert.equal(diagnostic.lastDefenseMultiplier,'0.1×');
        assert.equal(diagnostic.lastDefenseDamage,'2 HP');
        assert.equal(diagnostic.lastDefensePerfect,'SIM');
        assert.equal(diagnostic.lastDefenseRush,'SIM');
        assert.equal(s.defense.lastResult.counterRushActivated,true);
    });
}

test('geometria da seleção compartilha lados do desenho e respeita limites',()=>{
    for(const button of DEFENSE_BUTTONS) {
        assert.equal(defenseSideAt(button.x,button.y),button.side);
        assert.equal(defenseSideAt(button.x+button.width-1,button.y+button.height-1),button.side);
        assert.equal(defenseSideAt(button.x+button.width,button.y+button.height),null);
    }
    assert.equal(defenseSideAt(0,0),null);
});

test('ambos os lados preservam tabela 10/25/50/100 e stun apenas no erro completo',()=>{
    for(const arm of ['left','right']) for(const [sideCorrect,answerCorrect,multiplier] of [[true,true,.1],[true,false,.25],[false,true,.5],[false,false,1]]) {
        restartFight();open(arm);
        const expected=s.defense.expectedSide;
        const side=sideCorrect?expected:expected==='left'?'right':'left';
        click(side==='left'?226:414,216);
        const q=s.qte.question;
        const before=readDebugSnapshot().answer;
        const answer=answerCorrect?q.correctAnswer:q.alternatives.find(v=>v!==q.correctAnswer);
        assert.equal(readDebugSnapshot().answer,before);
        const button=QTE_BUTTONS.find(v=>v.answer===answer);click(button.x+10,button.y+10);
        updateCombat(.55);
        const result=s.defense.lastResult;
        assert.equal(result.expectedSide,expected);assert.equal(result.selectedSide,side);
        assert.equal(result.correctAnswer,q.correctAnswer);assert.equal(result.selectedAnswer,answer);
        assert.equal(result.questionId,q.id);assert.equal(result.damageMultiplier,multiplier);
        assert.equal(result.damageApplied,20*multiplier);assert.equal(s.playerHealth,100-20*multiplier);
        assert.equal(result.perfectDefense,sideCorrect&&answerCorrect);
        assert.equal(result.counterRushActivated,sideCorrect&&answerCorrect);
        assert.equal(s.stun.additional,!sideCorrect&&!answerCorrect?2:0);
        assert.equal(s.stun.remaining,!sideCorrect&&!answerCorrect?4:0);
        const snapshot=readDebugSnapshot();
        assert.equal(snapshot.lastDefenseCorrectAnswer,q.correctAnswer);
        assert.equal(snapshot.lastDefenseSelectedAnswer,answer);
        assert.equal(snapshot.lastDefenseDamage,`${20*multiplier} HP`);
        registerDefenseImpact(s.counterAttack.lastImpact);
        assert.equal(s.defense.lastResult,result);assert.equal(result.damageApplied,20*multiplier);
    }
});

test('atalhos fora dos botões preservam mouse esquerdo/direito',()=>{
    for(const [button,side] of [[0,'left'],[2,'right']]) {
        restartFight();open(side==='left'?'right':'left');
        click(0,0,button);assert.equal(s.defense.selectedSide,side);answerShown();updateCombat(.55);
        assert.equal(s.playerHealth,98);assert.equal(s.defense.lastResult.counterRushActivated,true);
    }
});

test('resposta válida não é sobrescrita por timeout, spam ou ID anterior; diagnóstico persiste',()=>{
    open('left');click(414,216);
    const q=s.qte.question;answerShown();
    assert.equal(s.qte.question,null);
    assert.equal(updateQTE(100),null);
    assert.equal(submitDefenseAnswer(q.correctAnswer,q.id),false);
    updateCombat(.55);
    const result=s.defense.lastResult;
    const snapshot=readDebugSnapshot();
    updateCombat(3.12);updateCombat(2.5);updateCombat(2);
    assert.equal(s.defense.lastResult,result);
    assert.equal(readDebugSnapshot().lastDefenseCorrectAnswer,snapshot.lastDefenseCorrectAnswer);
    open('right');click(226,216);
    const next=s.qte.question;assert.notEqual(next.id,q.id);
    assert.equal(submitDefenseAnswer(q.correctAnswer,q.id),false);
    assert.equal(s.qte.question,next);answerShown();updateCombat(.55);
    assert.equal(s.defense.lastResult.questionId,next.id);
    assert.equal(s.defense.lastResult.correctAnswer,next.correctAnswer);
});

test('erro natural dá dano zero e não libera Rush; override perfeito preserva escolhas reais',()=>{
    enemyAccuracyDebug.forceOutcome='miss';open('left');click(414,216);answerShown();updateCombat(.55);
    assert.equal(s.playerHealth,100);assert.equal(s.defense.lastResult.damageMultiplier,0);
    assert.equal(s.defense.lastResult.perfectDefense,false);assert.equal(s.defense.lastResult.counterRushActivated,false);
    assert.equal(readDebugSnapshot().lastDefenseAccuracy,'80% — ERRO NATURAL');
    restartFight();enemyAccuracyDebug.forceOutcome='miss';armPerfectDefense();open('left');
    click(226,216);const q=s.qte.question;
    const wrong=q.alternatives.find(v=>v!==q.correctAnswer);submitDefenseAnswer(wrong,q.id);updateCombat(.55);
    const result=s.defense.lastResult;
    assert.equal(s.playerHealth,98);assert.equal(result.perfectDefense,true);assert.equal(result.counterRushActivated,true);
    assert.equal(result.selectedSide,'left');assert.equal(result.selectedAnswer,wrong);
    assert.equal(result.correctAnswer,q.correctAnswer);assert.equal(result.damageMultiplier,.1);
    assert.ok(readDebugSnapshot().lastDefenseOverride.includes('FORÇADA'));
});

test('Slow Motion preserva lado e resposta reais para os dois braços',()=>{
    for(const speed of [1,.5,.25,.1]) for(const arm of ['left','right']) {
        restartFight();setDebugGameSpeed(speed);open(arm);
        const side=s.defense.expectedSide;click(side==='left'?226:414,216);
        const q=s.qte.question;
        for(let n=0;n<10;n++) updateCombat(simulationDelta(.01));
        assert.equal(s.qte.question,q);answerShown();
        for(let n=0;n<600 && !s.defense.lastResult?.counterRushActivated;n++) updateCombat(simulationDelta(.01));
        assert.equal(s.playerHealth,98);assert.equal(s.defense.lastResult.correctAnswer,q.correctAnswer);
        assert.equal(s.defense.lastResult.counterRushActivated,true);
    }
});

test('Counter Chain completa quatro etapas com botões reais e respostas do debug',()=>{
    open('left');click(414,216);answerShown();updateCombat(.55);updateCombat(3.12);selectPunch('jab');
    for(let stage=1;stage<=4;stage++) {
        assert.equal(s.counterChain.count,stage);assert.equal(requestPunch('left'),true);
        const q=s.qte.question;const shown=readDebugSnapshot().answer.split('RESPOSTA CORRETA: ')[1];
        assert.equal(shown,q.correctAnswer);submitAttackAnswer(shown,q.id);updateCombat(.4);
        if(stage<4) {
            updateCombat(.22);const side=s.defense.expectedSide;click(side==='left'?226:414,216);
            answerShown();updateCombat(.55);
            assert.equal(s.defense.lastResult.counterRushActivated,true);
            updateCombat(.5);
        }
    }
    assert.equal(s.counterChain.active,false);assert.equal(s.enemyHealth,55);assert.equal(s.stun.remaining,7);
});
