import { updateKnockout, KO_DURATION } from '../js/knockout.js';
import assert from "node:assert/strict";
import { test, beforeEach, afterEach, mock } from "node:test";
import { gameState } from "../js/gameState.js";
import { restartFight } from "../js/restart.js";
import { ENEMY_ACCURACY, ENEMY_MISS_CHANCE, enemyAccuracyDebug } from "../js/enemyAccuracy.js";
import { beginSpontaneousAttack, queueCounterAttack } from "../js/counterAttack.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { selectDefenseSide, submitDefenseAnswer, registerDefenseImpact } from './helpers/defenseApi.mjs';
import { updateCharacters, characters } from "../js/characters.js";
import { applyImpactDamage } from "../js/match.js";

beforeEach(() => { enemyAccuracyDebug.forceOutcome = null; restartFight(); gameState.offensiveAI.remaining = 1000000; });
afterEach(() => { mock.restoreAll(); enemyAccuracyDebug.forceOutcome = null; });

function start(source, arm, miss) {
    const rolls = [arm === "left" ? 0.1 : 0.9, miss ? 0.1 : 0.9];
    const random = mock.method(Math, "random", () => rolls.shift() ?? 0.9);
    if (source === "spontaneous") assert.equal(beginSpontaneousAttack(), true);
    else {
        assert.equal(requestPunch("left"), true);
        const q = gameState.qte.question;
        submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
        updateCombat(0.9);
    }
    assert.equal(gameState.counterAttack.side, arm);
    assert.equal(gameState.counterAttack.naturalMiss, miss);
    assert.equal(gameState.defense.remaining, 3);
    assert.equal(random.mock.callCount(), source === "spontaneous" ? 3 : 2);
    return random;
}

function answer(sideCorrect, questionCorrect) {
    const side = gameState.defense.expectedSide;
    selectDefenseSide(sideCorrect ? side : side === "left" ? "right" : "left");
    assert.equal(gameState.qte.remaining, 10);
    const q = gameState.qte.question;
    submitDefenseAnswer(questionCorrect ? q.correctAnswer : q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
    assert.equal(submitDefenseAnswer(q.correctAnswer, q.id), false);
}

test("precisão tem fonte única e debug desativado; limiar de erro é de 20%", () => {
    assert.equal(ENEMY_ACCURACY, 0.8);
    assert.ok(Math.abs(ENEMY_MISS_CHANCE - 0.2) < 1e-12);
    assert.equal(enemyAccuracyDebug.forceOutcome, null);
    for (const [roll, miss] of [[0, true], [0.199999, true], [0.2, false], [0.999999, false]]) {
        mock.restoreAll(); restartFight(); gameState.offensiveAI.remaining = 1000000;
        const rolls = [0.9, roll];
        mock.method(Math, "random", () => rolls.shift() ?? 0.9);
        beginSpontaneousAttack();
        assert.equal(gameState.counterAttack.naturalMiss, miss);
    }
});

test("erro natural nos dois tipos de ataque mantém QTEs e esquiva para ambos os lados, sem dano", () => {
    for (const source of ["spontaneous", "counter"]) for (const arm of ["left", "right"]) {
        mock.restoreAll(); restartFight(); gameState.offensiveAI.remaining = 1000000;
        const random = start(source, arm, true);
        const turns = { ...gameState.punches.cooldowns };
        updateCombat(0.1); updateCharacters(0.1);
        assert.equal(gameState.autoDodge.direction, null);
        assert.equal(gameState.counterAttack.impactResolved, false);
        answer(false, false); // Mesmo a defesa completamente errada não sofre dano.
        assert.equal(gameState.defense.result.questionCorrect, false);
        assert.equal(gameState.defense.result.damage, source === "counter" ? 22 : 20);
        assert.equal(gameState.defense.result.naturalMiss, undefined);
        updateCharacters(0);
        assert.equal(characters.player.autoDodgeX, 0);
        updateCombat(0.14);
        assert.equal(gameState.counterAttack.impactResolved, true);
        assert.equal(gameState.playerHealth, 100);
        assert.equal(gameState.defense.lastResult.damage, 0);
        assert.equal(gameState.defense.lastResult.damageApplied, 0);
        assert.equal(gameState.defense.lastResult.defenseDamage, source === "counter" ? 22 : 20);
        updateCombat(0.04); updateCharacters(0.04);
        assert.equal(characters.player.animationState, `dodge_${arm}`);
        assert.equal(characters.player.autoDodgeX, arm === "left" ? -6 : 6);
        assert.equal(gameState.reactions.player.remaining, 0);
        assert.equal(requestPunch("left"), false);
        assert.equal(requestPunch("right"), false);
        const result = gameState.defense.lastResult;
        registerDefenseImpact(gameState.counterAttack.lastImpact);
        assert.equal(gameState.defense.lastResult, result);
        assert.equal(gameState.playerHealth, 100);
        const initialRolls = source === "spontaneous" ? 3 : 2;
        assert.equal(random.mock.callCount(), initialRolls); // Sem novo sorteio durante a resolução.
        for (let i = 0; i < 30; i++) updateCombat(0.01);
        updateCharacters(0);
        assert.equal(gameState.autoDodge.direction, null);
        assert.equal(characters.player.autoDodgeX, 0);
        assert.equal(gameState.opponentCombat.state, "idle");
        assert.equal(gameState.playerCombat.state, "action_cooldown");
        assert.deepEqual(gameState.punches.cooldowns, turns);
        assert.equal(random.mock.callCount(), initialRolls + 1); // Próximo intervalo após recuperar.
        random.mock.restore();
    }
});

test("ataques normais preservam danos de 2, 5, 10 e 20 e não executam esquiva", () => {
    for (const [side, question, damage] of [[true,true,2],[true,false,5],[false,true,10],[false,false,20]]) {
        mock.restoreAll(); restartFight(); gameState.offensiveAI.remaining = 1000000;
        const random = start("spontaneous", "right", false);
        answer(side, question);
        updateCombat(0.24); updateCharacters(0);
        assert.equal(gameState.playerHealth, 100 - damage);
        assert.equal(gameState.autoDodge.direction, null);
        assert.equal(characters.player.animationState, "hit");
        registerDefenseImpact(gameState.counterAttack.lastImpact);
        assert.equal(gameState.playerHealth, 100 - damage);
        assert.equal(random.mock.callCount(), 3);
    }
});

test("resultado não muda no QTE, no impacto ou ao alterar o debug", () => {
    const random = start("spontaneous", "left", true);
    enemyAccuracyDebug.forceOutcome = "normal";
    assert.equal(beginSpontaneousAttack(), false);
    assert.equal(queueCounterAttack({ outcome: "incorrect", questionId: "duplicate" }), false);
    updateCombat(3);
    assert.equal(gameState.qte.remaining, 10);
    assert.equal(gameState.autoDodge.direction, null);
    updateCombat(10); updateCombat(0.12);
    assert.equal(gameState.playerHealth, 100);
    assert.equal(gameState.defense.lastResult.questionTimedOut, true);
    assert.equal(gameState.defense.lastResult.directionTimedOut, true);
    assert.equal(gameState.defense.lastResult.naturalMiss, true);
    assert.equal(random.mock.callCount(), 3);
});

test("debug pode forçar ambos resultados sem modificar a precisão de produção", () => {
    for (const outcome of ["miss", "normal"]) {
        mock.restoreAll(); restartFight(); gameState.offensiveAI.remaining = 1000000;
        enemyAccuracyDebug.forceOutcome = outcome;
        const random = mock.method(Math, "random", () => 0.9);
        beginSpontaneousAttack();
        assert.equal(gameState.counterAttack.naturalMiss, outcome === "miss");
        assert.equal(random.mock.callCount(), 2); // Braço e tipo; precisão forçada.
    }
    assert.equal(ENEMY_ACCURACY, 0.8);
});

test("fim cancela esquiva e reinício limpa resultado, pose, recargas e permite novo sorteio", () => {
    start("spontaneous", "right", true); answer(false, false);
    updateCombat(0.28); updateCharacters(0);
    assert.notEqual(characters.player.autoDodgeX, 0);
    applyImpactDamage("enemy", 100, "finish");
    updateCombat(100); updateCharacters(0);
    updateKnockout(gameState,KO_DURATION); assert.equal(gameState.phase,"victory");
    assert.equal(gameState.autoDodge.direction, null);
    assert.equal(characters.player.autoDodgeX, 0);
    assert.equal(beginSpontaneousAttack(), false);
    restartFight(); updateCharacters(0);
    assert.equal(gameState.counterAttack.naturalMiss, null);
    assert.equal(gameState.counterAttack.lastImpact, null);
    assert.equal(gameState.defense.lastResult, null);
    assert.equal(gameState.playerHealth, 100);
    assert.equal(gameState.playerCooldown.remaining, 0);
    assert.ok(Object.values(gameState.punches.cooldowns).every(value => value === 0));
    assert.equal(characters.player.autoDodgeX, 0);
    assert.equal(beginSpontaneousAttack(), true);
});

test("esquiva respeita pausa e termina antes da recuperação inimiga em várias taxas de quadros", () => {
    for (const fps of [30, 60, 144, 0.2]) {
        mock.restoreAll(); restartFight(); gameState.offensiveAI.remaining = 1000000;
        start("spontaneous", "left", true); answer(false, false);
        for (let frame = 0; frame < Math.ceil(0.55 * fps); frame++) updateCombat(1 / fps);
        updateCharacters(0);
        assert.equal(gameState.autoDodge.direction, null);
        assert.equal(characters.player.autoDodgeX, 0);
        assert.equal(gameState.playerHealth, 100);
        assert.equal(gameState.opponentCombat.state, "idle");
    }
    mock.restoreAll(); restartFight(); gameState.offensiveAI.remaining = 1000000;
    start("spontaneous", "right", true); answer(false, false);
    updateCombat(0.28);
    const dodge = { ...gameState.autoDodge };
    gameState.phase = "paused"; updateCombat(20);
    assert.deepEqual(gameState.autoDodge, dodge);
    gameState.phase = "idle"; updateCombat(0.27);
    assert.equal(gameState.autoDodge.direction, null);
    assert.equal(gameState.playerCombat.state, "action_cooldown");
    assert.ok(Math.abs(gameState.playerCooldown.remaining - 2) < 1e-9);
});

