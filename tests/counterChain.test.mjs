import { updateKnockout, KO_DURATION } from '../js/knockout.js';
import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { gameState as s } from '../js/gameState.js';
import { restartFight } from '../js/restart.js';
import { beginSpontaneousAttack } from '../js/counterAttack.js';
import { selectDefenseSide, submitDefenseAnswer } from './helpers/defenseApi.mjs';
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { selectPunch } from '../js/punches.js';
import { resolvePlayerImpact, applyImpactDamage } from '../js/match.js';
import { enemyAccuracyDebug } from '../js/enemyAccuracy.js';
import { debugState, setDebugEnabled, armChainContinuation, armPerfectDefense, readDebugSnapshot } from '../js/debug.js';
import { finishCounterRushIntroForTest } from './helpers/fight.mjs';
import { beginCounterRushCutscene } from '../js/counterRush.js';
import { drawCounterRush } from '../js/counterRushView.js';

beforeEach(() => { restartFight(); mock.method(Math, 'random', () => 0.99); });
afterEach(() => { mock.restoreAll(); setDebugEnabled(false); enemyAccuracyDebug.forceOutcome = null; });
function defend(perfect = true) {
    selectDefenseSide(perfect ? s.defense.expectedSide : s.defense.expectedSide === 'left' ? 'right' : 'left');
    const q = s.qte.question;
    submitDefenseAnswer(q.correctAnswer, q.id);
    updateCombat(0.55);
}
function start() {
    assert.equal(beginSpontaneousAttack(), true);
    defend();
    assert.equal(s.playerCombat.state, 'counter_rush_cutscene');
    finishCounterRushIntroForTest();
    assert.equal(s.counterChain.count, 1);
}
function hit() {
    selectPunch('jab');
    assert.equal(requestPunch('left'), true);
    const q = s.qte.question;
    assert.equal(requestPunch('right'), false);
    submitAttackAnswer(q.correctAnswer, q.id);
    assert.equal(submitAttackAnswer(q.correctAnswer, q.id), false);
    updateCombat(0.4);
}
function response() {
    assert.equal(s.playerCombat.state, 'counter_chain_recovery');
    assert.equal(requestPunch('left'), false);
    assert.equal(beginSpontaneousAttack(), false);
    updateCombat(0.22);
    assert.equal(s.counterChain.state, 'counter_chain_enemy_response');
    assert.equal(s.playerCombat.state, 'defense_direction_qte');
}
test('defesa perfeita, quatro Rush, transições de 0,5 s, dano único e limite sem quinto', () => {
    start();
    for (let n = 1; n <= 4; n++) {
        assert.equal(s.counterChain.count, n);
        hit();
        assert.equal(s.enemyHealth, 100 - 5 * (n + 0.25 * n * (n + 1)));
        assert.equal(resolvePlayerImpact(), false);
        if (n === 4) break;
        assert.equal(s.playerCooldown.remaining, 0);
        assert.equal(s.stun.remaining, 0);
        response(); defend();
        assert.equal(s.playerCombat.state, 'counter_chain_transition');
        assert.equal(s.counterRush.cutsceneRemaining, 0);
        updateCombat(0.499);
        assert.equal(s.playerCombat.state, 'counter_chain_transition');
        updateCombat(0.001);
        assert.equal(s.playerCombat.state, 'counter_rush_window');
        assert.equal(s.counterRush.flashRemaining, 0);
    }
    assert.equal(s.counterChain.active, false);
    assert.equal(s.counterChain.endReason, 'limit');
    assert.equal(s.stun.remaining, 7);
    assert.equal(s.playerCooldown.remaining, 0);
    assert.equal(requestPunch('left'), false);
    assert.equal(beginSpontaneousAttack(), false);
    updateCombat(7);
    assert.equal(s.stun.remaining, 0);
    assert.equal(s.playerCombat.state, 'idle');
    assert.equal(s.counterChain.count, 4);
});
test('bloqueio reduz 75% e encerra sem atordoar', () => {
    start(); mock.method(Math, 'random', () => 0);
    hit();
    assert.equal(s.enemyHealth, 98.125);
    assert.equal(s.counterChain.endReason, 'blocked');
    assert.equal(s.stun.remaining, 0);
});
test('erro e timeout do QTE, oportunidade e defesa parcial encerram sem stun', () => {
    for (const reason of ['wrong', 'timeout', 'window', 'defense']) {
        restartFight(); start();
        if (reason === 'window') updateCombat(2.5);
        else if (reason === 'defense') { hit(); response(); defend(false); }
        else {
            selectPunch('jab'); requestPunch('left'); const q = s.qte.question;
            if (reason === 'timeout') updateCombat(5);
            else submitAttackAnswer(q.alternatives.find(a => a !== q.correctAnswer), q.id);
        }
        assert.equal(s.counterChain.active, false);
        assert.equal(s.stun.remaining, 0);
        assert.equal(s.playerCooldown.remaining, 2);
    }
});
test('erro natural causa esquiva automática e não abre próxima janela', () => {
    start(); hit(); enemyAccuracyDebug.forceOutcome = 'miss'; response();
    selectDefenseSide(s.defense.expectedSide);
    const q = s.qte.question; submitDefenseAnswer(q.correctAnswer, q.id);
    updateCombat(0.24);
    assert.equal(s.defense.lastResult.naturalMiss, true);
    assert.notEqual(s.autoDodge.direction, null);
    updateCombat(0.31);
    assert.equal(s.counterChain.endReason, 'natural_miss');
    assert.equal(s.stun.remaining, 0);
});
test('debug força reação uma vez, permite defesa perfeita e exibe sequência', () => {
    assert.equal(armChainContinuation(), false);
    start(); hit(); setDebugEnabled(true);
    armChainContinuation(); armPerfectDefense(); enemyAccuracyDebug.forceOutcome = 'miss';
    response(); assert.equal(s.counterAttack.naturalMiss, false);
    assert.equal(debugState.chainNext, false);
    defend(false);
    assert.equal(s.counterChain.count, 2);
    const snapshot = readDebugSnapshot();
    assert.equal(snapshot.chainCount, '2');
    assert.equal(snapshot.chainState, 'counter_chain_transition');
    updateCombat(0.5); hit(); response();
    assert.equal(s.counterAttack.naturalMiss, true);
});
test('recargas só avançam ao iniciar QTE especial; Jab permanece disponível', () => {
    start(); s.punches.cooldowns = { jab: 0, straight: 2, hook: 3, uppercut: 5 };
    hit();
    assert.deepEqual(s.punches.cooldowns, { jab: 0, straight: 1, hook: 2, uppercut: 4 });
    response(); defend(); updateCombat(0.5);
    assert.deepEqual(s.punches.cooldowns, { jab: 0, straight: 1, hook: 2, uppercut: 4 });
    hit(); assert.deepEqual(s.punches.cooldowns, { jab: 0, straight: 0, hook: 1, uppercut: 3 });
});
test('KO, derrota e reinício cancelam todos os estados da sequência', () => {
    for (const stage of ['rush', 'recovery', 'response', 'transition']) for (const target of ['player', 'enemy']) {
        restartFight(); start();
        if (stage !== 'rush') hit();
        if (['response', 'transition'].includes(stage)) response();
        if (stage === 'transition') defend();
        applyImpactDamage(target, 100, `end-${stage}`);
        updateCombat(100); updateKnockout(s,KO_DURATION);
        assert.equal(s.phase, target === 'enemy' ? 'victory' : 'defeat');
        assert.equal(s.counterChain.active, false);
        assert.equal(s.counterChain.responsePending, false);
        assert.equal(s.stun.remaining, 0);
        assert.equal(s.qte.question, null);
        restartFight(); updateCombat(0);
        assert.equal(s.counterChain.count, 0);
        assert.equal(s.playerCombat.state, 'idle');
    }
});

test('pausa congela transição; 30/60/144 FPS mantêm contador e QTE único', () => {
    for (const fps of [30, 60, 144]) {
        restartFight(); start(); hit(); response(); defend();
        assert.equal(beginCounterRushCutscene(), false);
        const before = JSON.stringify(s);
        s.phase = 'paused'; updateCombat(100); s.phase = 'idle';
        assert.equal(JSON.stringify(s), before);
        for (let n = 0; n < fps / 2; n++) updateCombat(1 / fps);
        assert.equal(s.playerCombat.state, 'counter_rush_window');
        assert.equal(s.counterChain.count, 2);
        selectPunch('jab'); requestPunch('left');
        const q = s.qte.question;
        updateCombat(0);
        assert.equal(s.qte.question, q);
        assert.equal(s.counterChain.count, 2);
    }
});

test('indicador aparece durante a sequência e desaparece no encerramento', () => {
    const rects = [];
    const ctx = { save() {}, restore() {}, fillRect(...args) { rects.push(args); } };
    start(); drawCounterRush(ctx, s);
    assert.ok(rects.some(r => r[1] === 304));
    updateCombat(2.5); rects.length = 0;
    drawCounterRush(ctx, s);
    assert.equal(rects.some(r => r[1] === 304), false);
});

