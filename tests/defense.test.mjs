import { restartFight, finishPlayerCooldown, expectIdleAfterCooldown } from "./helpers/fight.mjs";
beforeEach(restartFight);
import assert from "node:assert/strict";
import { test, mock, beforeEach } from "node:test";
import { gameState } from "../js/gameState.js";
import { calculateDefenseDamage } from "../js/damage.js";
import { selectDefenseSide, submitDefenseAnswer, defenseSideForCounterArm } from './helpers/defenseApi.mjs';
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { onCounterImpact } from "../js/counterAttack.js";
import { updateCharacters, characters } from "../js/characters.js";
import { selectPunch } from "../js/punches.js";

let defenseRoll = 0;
beforeEach(() => { defenseRoll = 0; });
// Isola a tabela defensiva: braço esquerdo e precisão normal, alternadamente.
mock.method(Math, "random", () => defenseRoll++ % 2 === 0 ? 0 : 0.99);

function openDefense(timeout = false) {
    finishPlayerCooldown();
    const selected = gameState.punches.selected;
    selectPunch("jab"); // Isola a tabela defensiva de base 20, sem penalidade de risco.
    assert.equal(requestPunch("left"), true);
    selectPunch(selected);
    const q = gameState.qte.question;
    if (timeout) updateCombat(10);
    else submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
    assert.equal(gameState.playerCombat.state, "qte_failed");
    updateCombat(0.9);
    assert.equal(gameState.playerCombat.state, "defense_direction_qte");
    assert.equal(gameState.defense.remaining, 3.0);
    assert.equal(gameState.counterAttack.pending, true);
    assert.equal(gameState.counterAttack.impactResolved, false);
}

function finishCounter() {
    const expectedHealth = gameState.playerHealth - gameState.defense.result.damage;
    updateCombat(0.55); updateCharacters(0.55);
    expectIdleAfterCooldown();
    assert.equal(gameState.opponentCombat.state, "idle");
    assert.equal(gameState.defense.lastResult.impactRegistered, true);
    assert.equal(characters.player.defenseGuardAmount, 0);
    assert.equal(gameState.playerHealth, expectedHealth);
    assert.equal(gameState.enemyHealth, 100);
}

test("cálculo puro cobre a tabela, base zero e validação da base", () => {
    for (const [side, question, damage] of [[true,true,2],[true,false,5],[false,true,10],[false,false,20]]) {
        assert.equal(calculateDefenseDamage(side, question, 20), damage);
        assert.equal(calculateDefenseDamage(side, question, 0), 0);
    }
    assert.throws(() => calculateDefenseDamage(true, true, -1), RangeError);
    assert.throws(() => calculateDefenseDamage(true, true, NaN), RangeError);
});

test("conversão explícita da anatomia frontal para o lado visual de defesa", () => {
    assert.equal(defenseSideForCounterArm("left"), "right");
    assert.equal(defenseSideForCounterArm("right"), "left");
    assert.throws(() => defenseSideForCounterArm("invalid"));
});

test("erro e timeout do ataque abrem defesa sem soco ou impacto antecipado", () => {
    for (const timeout of [false, true]) {
        openDefense(timeout);
        assert.equal(gameState.playerCombat.arm, null);
        assert.equal(requestPunch("right"), false);
        updateCombat(2); updateCharacters(2);
        assert.equal(gameState.opponentCombat.state, "counter_preparing");
        assert.equal(gameState.opponentCombat.extension, 0);
        assert.equal(gameState.counterAttack.impactResolved, false);
        assert.equal(characters.player.animationState, "idle");
        selectDefenseSide("right");
        const q = gameState.qte.question;
        assert.equal(q.kind, "defense");
        assert.ok(q.statement.length > 0);
        assert.equal(gameState.qte.remaining, 10);
        updateCombat(9);
        assert.equal(gameState.counterAttack.impactResolved, false);
        assert.equal(gameState.opponentCombat.extension, 0);
        submitDefenseAnswer(q.correctAnswer, q.id);
        finishCounter();
    }
});

test("quatro combinações calculam 10%, 25%, 50% e 100% uma única vez", () => {
    for (const [sideCorrect, questionCorrect, percent, damage] of [[true,true,10,2],[true,false,25,5],[false,true,50,10],[false,false,100,20]]) {
        openDefense();
        const side = sideCorrect ? "right" : "left";
        assert.equal(selectDefenseSide(side), true);
        assert.equal(selectDefenseSide(side === "right" ? "left" : "right"), false);
        updateCombat(0.1); updateCharacters(0.1);
        assert.equal(characters.player.animationState, `block_${side}`);
        assert.equal(characters.player.defenseGuardSide, side);
        const q = gameState.qte.question;
        const answer = questionCorrect ? q.correctAnswer : q.alternatives.find(answer => answer !== q.correctAnswer);
        const impacts = [];
        const unsubscribe = onCounterImpact(event => impacts.push(event));
        assert.equal(submitDefenseAnswer(answer, q.id), true);
        const result = gameState.defense.result;
        assert.equal(result.damagePercent, percent);
        assert.equal(result.damage, damage);
        assert.equal(result.impactRegistered, false);
        for (let i = 0; i < 20; i++) {
            assert.equal(submitDefenseAnswer(answer, q.id), false);
            assert.equal(requestPunch("left"), false);
        }
        finishCounter();
        assert.equal(gameState.defense.result, result);
        assert.equal(gameState.defense.lastResult, result);
        assert.equal(impacts.length, 1);
        assert.equal(result.impactId, impacts[0].id);
        updateCombat(1);
        assert.equal(impacts.length, 1);
        assert.equal(gameState.defense.feedbackRemaining, 0);
        unsubscribe();
    }
});

test("timeout de direção abre pergunta e ainda permite redução para 50%", () => {
    openDefense();
    updateCombat(3.0); updateCharacters(3.0);
    assert.equal(gameState.playerCombat.state, "defense_question_qte");
    assert.equal(gameState.defense.directionTimedOut, true);
    assert.equal(gameState.defense.selectedSide, null);
    assert.equal(gameState.defense.sideCorrect, false);
    assert.equal(characters.player.defenseGuardAmount, 0);
    assert.equal(gameState.qte.remaining, 10);
    const q = gameState.qte.question;
    submitDefenseAnswer(q.correctAnswer, q.id);
    assert.equal(gameState.defense.result.damage, 10);
    finishCounter();
});

test("timeout da pergunta é falha e respostas antigas não resolvem outra defesa", () => {
    openDefense(); selectDefenseSide("right");
    const old = gameState.qte.question;
    updateCombat(10);
    assert.equal(gameState.playerCombat.state, "counter_wait");
    assert.equal(gameState.defense.result.questionCorrect, false);
    assert.equal(gameState.defense.result.questionTimedOut, true);
    assert.equal(gameState.defense.result.damage, 5);
    assert.equal(submitDefenseAnswer(old.correctAnswer, old.id), false);
    finishCounter();
    openDefense(); selectDefenseSide("left");
    assert.equal(submitDefenseAnswer(old.correctAnswer, old.id), false);
    updateCombat(10);
    assert.equal(gameState.defense.result.damage, 20);
    finishCounter();
});

test("impacto aguarda ambas as fases, inclusive com quadros lentos", () => {
    for (const fps of [30, 60, 144]) {
        openDefense();
        const impacts = [];
        const unsubscribe = onCounterImpact(event => impacts.push(event));
        for (let i = 0; i < fps * 12; i++) updateCombat(1 / fps);
        assert.equal(impacts.length, 0);
        assert.equal(gameState.playerCombat.state, "defense_question_qte");
        assert.equal(gameState.counterAttack.impactResolved, false);
        updateCombat(1.5); // Pergunta expira e a sobra conclui o contra-ataque.
        assert.equal(impacts.length, 1);
        expectIdleAfterCooldown();
        assert.equal(gameState.defense.lastResult.damagePercent, 100);
        const expected = gameState.counterAttack.startedAt + gameState.counterAttack.pausedDuration + 0.24;
        assert.ok(Math.abs(impacts[0].at - expected) < 1e-9);
        unsubscribe();
    }
    openDefense();
    let impacts = 0;
    const unsubscribe = onCounterImpact(() => impacts++);
    updateCombat(30);
    expectIdleAfterCooldown();
    assert.equal(impacts, 1);
    assert.equal(gameState.defense.lastResult.damage, 20);
    unsubscribe();
});
