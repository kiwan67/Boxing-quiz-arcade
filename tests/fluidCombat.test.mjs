import { updateKnockout, KO_DURATION } from '../js/knockout.js';
import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { gameState as s } from '../js/gameState.js';
import { restartFight } from '../js/restart.js';
import { requestPunch, submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { selectPunch } from '../js/punches.js';
import { beginSpontaneousAttack } from '../js/counterAttack.js';
import { selectDefenseSide, submitDefenseAnswer, registerDefenseImpact, beginDefense } from './helpers/defenseApi.mjs';
import { beginAttackQTE } from '../js/qte.js';
import { resolvePlayerImpact, applyImpactDamage } from '../js/match.js';
import { PUNCH_TYPES } from '../js/punchTypes.js';
import { chainDifficulty, chainMultiplier } from '../js/chainRules.js';
import { finishCounterChain } from '../js/counterRush.js';
import { startStunRecovery } from '../js/stun.js';
import { setDebugEnabled, readDebugSnapshot, debugState } from '../js/debug.js';
import { simulationDelta } from '../js/simulationClock.js';
import { setDebugGameSpeed } from '../js/debug.js';
import { enemyAccuracyDebug } from '../js/enemyAccuracy.js';
import { drawStun } from '../js/stunView.js';
import { QUESTIONS } from '../js/questions.js';

beforeEach(() => { restartFight(); s.offensiveAI.remaining = 1000000; mock.method(Math, 'random', () => 0.99); });
afterEach(() => { mock.restoreAll(); setDebugEnabled(false); enemyAccuracyDebug.forceOutcome = null; });
const total = type => Object.values(PUNCH_TYPES[type].timing).reduce((a,b) => a+b, 0);
const answerAttack = () => { const q = s.qte.question; return submitAttackAnswer(q.correctAnswer, q.id); };
function ready() { if (s.playerCombat.state === 'action_cooldown') updateCombat(s.playerCooldown.remaining); }
function defend(side = true, answer = true) {
    selectDefenseSide(side ? s.defense.expectedSide : s.defense.expectedSide === 'left' ? 'right' : 'left');
    const q = s.qte.question;
    if (answer === 'timeout') updateCombat(10);
    else submitDefenseAnswer(answer ? q.correctAnswer : q.alternatives.find(v => v !== q.correctAnswer), q.id);
    updateCombat(0.55 - s.opponentCombat.elapsed);
}
function window() { beginSpontaneousAttack(); defend(); updateCombat(3.12); assert.equal(s.playerCombat.state, 'counter_rush_window'); }

test('comuns alternam sem/com pergunta; Uppercut não participa; nenhum QTE oculto', () => {
    for (const [type, count, question] of [['jab',1,false], ['uppercut',1,true], ['straight',2,true], ['jab',3,false], ['hook',4,true], ['jab',5,false], ['jab',6,true]]) {
        ready(); selectPunch(type);
        const sequence = s.qte.sequence;
        assert.equal(requestPunch('left'), true);
        assert.equal(s.commonAttackCount, count);
        assert.equal(Boolean(s.qte.question), question);
        assert.equal(s.qte.sequence, sequence + (question ? 1 : 0));
        if (question) { assert.equal(s.qte.remaining, 10); answerAttack(); }
        else { assert.equal(s.lastAttackResult.noQTE, true); assert.equal(s.pendingRiskBonus, 0); }
        updateCombat(total(type));
        assert.equal(s.playerCooldown.remaining, 2);
    }
});
test('seleção, indisponibilidade, spam, defesa, Rush e stun não avançam comuns', () => {
    selectPunch('hook'); s.punches.cooldowns.hook = 3;
    assert.equal(requestPunch('left'), false); assert.equal(s.commonAttackCount, 0);
    selectPunch('jab'); requestPunch('left');
    assert.equal(requestPunch('right'), false); assert.equal(s.commonAttackCount, 1);
    updateCombat(total('jab')); ready(); window();
    selectPunch('jab'); requestPunch('left'); answerAttack(); updateCombat(total('jab'));
    assert.equal(s.commonAttackCount, 1);
});
test('sem QTE preserva dano, esquiva, bloqueio, IDs únicos e turnos', () => {
    for (const [roll, outcome, damage] of [[0.99,'hit',5], [0.01,'dodged',0], [0.99,'blocked',1.25]]) {
        restartFight(); selectPunch('jab'); s.punches.cooldowns.uppercut = 5;
        let n = 0; const random = mock.method(Math, 'random', () => outcome === 'blocked' ? (++n === 1 ? 0.99 : 0) : roll);
        requestPunch('left'); random.mock.restore();
        assert.equal(s.qte.question, null); assert.equal(s.qte.sequence, 0);
        updateCombat(total('jab'));
        assert.equal(s.lastAttackResult.outcome, outcome);
        assert.equal(s.enemyHealth, 100 - damage);
        assert.equal(resolvePlayerImpact(), false);
        assert.equal(s.punches.cooldowns.uppercut, 4); assert.equal(s.punches.cooldowns.jab, 0);
    }
});
test('falha do segundo comum mantém risco e contra-ataque; todos os Uppercuts perguntam', () => {
    selectPunch('jab'); requestPunch('left'); updateCombat(total('jab')); ready();
    selectPunch('hook'); requestPunch('right');
    const q = s.qte.question; submitAttackAnswer(q.alternatives.find(v => v !== q.correctAnswer), q.id);
    assert.equal(s.pendingRiskBonus, 0.25); assert.equal(s.counterAttack.pending, true);
    assert.equal(s.commonAttackCount, 2);
    restartFight(); selectPunch('uppercut'); requestPunch('left');
    assert.ok(s.qte.question); assert.equal(s.commonAttackCount, 0);
    updateCombat(10); assert.equal(s.counterAttack.pending, true);
    assert.equal(s.pendingRiskBonus, 0.5);
});
test('cadeia real chega a quatro: metadados, provisórias e bônus aditivo sem quinto', () => {
    window(); selectPunch('jab');
    let damage = 0;
    for (let stage = 1; stage <= 4; stage++) {
        assert.equal(s.counterChain.count, stage);
        assert.equal(s.counterChain.difficulty, chainDifficulty(stage));
        requestPunch('left'); const q = s.qte.question;
        assert.equal(q.chainDifficulty, chainDifficulty(stage));
        assert.equal(q.difficulty, chainDifficulty(stage));
        const source = QUESTIONS.find(item => item.id === q.bankId);
        assert.equal(q.statement, source.statement);
        assert.deepEqual(q.alternatives, ['A','B','C','D']);
        assert.equal(q.options[q.correctIndex], source.options[source.correctIndex]);
        answerAttack(); updateCombat(total('jab'));
        damage += 5 * (1 + 0.5 * stage);
        assert.equal(s.enemyHealth, 100 - damage);
        assert.equal(s.lastAttackResult.rushMultiplier, 1 + 0.5 * stage);
        if (stage < 4) { assert.equal(s.stun.remaining, 0); updateCombat(0.22); defend(); updateCombat(0.5); }
    }
    assert.equal(s.counterChain.active, false); assert.equal(s.stun.additional, 5);
    assert.equal(s.stun.total, 7); assert.equal(s.stun.remaining, 7);
    assert.equal(s.playerCooldown.remaining, 0);
    assert.equal(requestPunch('left'), false); assert.equal(beginSpontaneousAttack(), false);
    assert.equal(beginDefense(), false); assert.equal(beginAttackQTE('left'), false);
    updateCombat(7); assert.equal(s.playerCombat.state, 'idle');
    assert.equal(s.counterChain.count, 4); assert.equal(chainMultiplier(999), 3);
});
test('todos os golpes usam base original × 1.5/2/2.5/3, inclusive bloqueio', () => {
    for (const type of Object.keys(PUNCH_TYPES)) for (let stage=1; stage<=4; stage++) {
        restartFight(); window(); s.counterChain.count = stage; selectPunch(type); requestPunch('left'); answerAttack();
        updateCombat(PUNCH_TYPES[type].timing.preparation + PUNCH_TYPES[type].timing.advance);
        assert.equal(s.enemyHealth, 100 - PUNCH_TYPES[type].damage * (1 + 0.5 * stage));
        assert.equal(resolvePlayerImpact(), false);
    }
    restartFight(); window(); s.counterChain.count = 4; selectPunch('uppercut'); requestPunch('left');
    const random = mock.method(Math, 'random', () => 0); answerAttack(); random.mock.restore(); updateCombat(total('uppercut'));
    assert.equal(s.enemyHealth, 81.25); assert.equal(s.counterChain.endReason, 'blocked'); assert.equal(s.stun.remaining, 0);
});
test('recuperação reutilizável soma 2 s base a +2/+3/+4/+5 sem duplicar', () => {
    for (let stage=1; stage<=4; stage++) {
        restartFight(); window(); s.counterChain.count = stage; selectPunch('jab'); requestPunch('left'); answerAttack(); updateCombat(0.11);
        finishCounterChain('completed', true);
        assert.equal(s.stun.additional, stage+1); assert.equal(s.stun.total, stage+3);
        const id = s.stun.impactId;
        assert.equal(startStunRecovery('enemy','COUNTER_CHAIN',9,id), false);
        assert.equal(s.stun.total, stage+3);
    }
});
test('defesa completamente errada/timeout causa dano integral e 4 s; parciais e erro natural não', () => {
    for (const [side, answer, miss, expected, damage] of [[false,false,false,4,20],[false,'timeout',false,4,20],[true,false,false,0,5],[false,true,false,0,10],[true,true,false,0,2],[false,false,true,0,0]]) {
        restartFight(); enemyAccuracyDebug.forceOutcome = miss ? 'miss' : 'normal';
        beginSpontaneousAttack(); defend(side, answer);
        assert.equal(s.playerHealth, 100-damage);
        assert.equal(s.stun.remaining, expected);
        if (expected) {
            assert.equal(s.stun.source, 'FAILED_DEFENSE'); assert.equal(s.stun.additional, 2);
            registerDefenseImpact(s.counterAttack.lastImpact); assert.equal(s.stun.remaining, 4); assert.equal(s.playerHealth, 80);
        }
        if (miss) assert.equal(s.defense.lastResult.naturalMiss, true);
    }
});
test('bloqueio, QTE errado, janela perdida e KO não iniciam stun do Rush', () => {
    for (const reason of ['wrong','window','ko']) {
        restartFight(); window();
        if (reason === 'window') updateCombat(2.5);
        else if (reason === 'ko') { s.enemyHealth=1; selectPunch('jab'); requestPunch('left'); answerAttack(); updateCombat(0.4); updateKnockout(s,KO_DURATION); assert.equal(s.phase,'victory'); }
        else { selectPunch('jab'); requestPunch('left'); const q=s.qte.question; submitAttackAnswer(q.alternatives.find(v=>v!==q.correctAnswer),q.id); }
        assert.equal(s.stun.remaining,0);
    }
    restartFight(); s.playerHealth=1; beginSpontaneousAttack(); defend(false,false);
    updateKnockout(s,KO_DURATION); assert.equal(s.phase,'defeat'); assert.equal(s.stun.remaining,0);
    restartFight(); assert.equal(s.commonAttackCount,0); assert.equal(s.stun.source,null);
});
test('slow motion e pausa desaceleram recuperação; debug usa valores e resposta reais', () => {
    setDebugEnabled(true); setDebugGameSpeed(0.25); beginSpontaneousAttack();
    selectDefenseSide(s.defense.expectedSide); debugState.showAnswers=true;
    let snapshot=readDebugSnapshot(); assert.ok(snapshot.answer.endsWith(s.qte.question.correctAnswer));
    restartFight(); setDebugGameSpeed(0.25); startStunRecovery('player','FAILED_DEFENSE',2,'test-stun');
    updateCombat(simulationDelta(4)); assert.equal(s.stun.remaining,3);
    s.phase='paused'; updateCombat(simulationDelta(4)); assert.equal(s.stun.remaining,3); s.phase='idle';
    snapshot=readDebugSnapshot();
    assert.equal(snapshot.stunSource,'FAILED_DEFENSE'); assert.equal(snapshot.stunAdditional,'2 s');
    assert.equal(snapshot.stunTotal,'4 s'); assert.equal(snapshot.stunRemaining,'3 s'); assert.equal(snapshot.nextCommonQuestion,'NÃO');
    applyImpactDamage('player',100,'ko'); assert.equal(s.stun.remaining,0);
});
test('estrelinhas seguem cabeça das duas perspectivas e usam tempo simulado', () => {
    const rects=[]; const ctx={ save(){},restore(){}, fillRect(...r){rects.push(r);} };
    for (const facingDirection of ['front','back']) {
        const pose={facingDirection,torsoX:2,headRecoilX:1,autoDodgeX:0,breathOffset:1,recoilY:0,shoulderOffset:1};
        drawStun(ctx,pose,{x:320,y:110,scale:2},{remaining:4,elapsed:0}); const first=rects[0]; rects.length=0;
        drawStun(ctx,pose,{x:320,y:110,scale:2},{remaining:3,elapsed:1}); assert.notDeepEqual(rects[0],first); rects.length=0;
        drawStun(ctx,pose,{x:320,y:110,scale:2},{remaining:0,elapsed:4}); assert.equal(rects.length,0);
    }
});

