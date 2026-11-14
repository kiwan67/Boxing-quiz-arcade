import { restartFight, finishPlayerCooldown, expectIdleAfterCooldown } from "./helpers/fight.mjs";
beforeEach(restartFight);
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { gameState } from "../js/gameState.js";
import { startPunch, submitAttackAnswer, updateCombat, QTE_FAILURE_DURATION } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { updateCharacters, characters } from "../js/characters.js";
import { resolveDefenseForTest } from "./helpers/defense.mjs";

test("acerto libera exclusivamente o braço pendente com quatro alternativas", () => {
    for (const arm of ["left", "right"]) {
        assert.equal(requestPunch(arm), true);
        const q = gameState.qte.question;
        assert.ok(q.statement.length > 0);
        assert.deepEqual(q.alternatives, ["A", "B", "C", "D"]);
        assert.equal(q.options.length, 4);
        const answer = q.correctAnswer;
        assert.equal(gameState.qte.remaining, 10);
        assert.equal(startPunch(arm), false);
        updateCombat(2); updateCharacters(2);
        assert.equal(gameState.playerCombat.state, "attack_qte");
        assert.equal(characters.player.animationState, "idle");
        assert.equal(characters.player.leftPunchExtension, 0);
        assert.equal(characters.player.rightPunchExtension, 0);
        assert.equal(submitAttackAnswer(answer, q.id), true);
        assert.equal(gameState.playerCombat.state, `punching_${arm}`);
        assert.equal(gameState.qte.pendingPunch, null);
        const result = gameState.qte.lastResult;
        assert.equal(result.outcome, "correct");
        assert.equal(result.arm, arm);
        assert.equal(submitAttackAnswer(answer, q.id), false);
        updateCombat(0.42);
        expectIdleAfterCooldown();
        assert.equal(gameState.qte.remaining, 0);
        assert.equal(gameState.qte.lastResult, result);
    }
});

test("erro cancela o soco e volta ao idle após mensagem breve", () => {
    requestPunch("left");
    const q = gameState.qte.question;
    const wrong = q.alternatives.find(answer => answer !== q.correctAnswer);
    assert.equal(submitAttackAnswer(wrong, q.id), true);
    assert.equal(gameState.playerCombat.state, "qte_failed");
    assert.equal(gameState.qte.lastResult.outcome, "incorrect");
    assert.equal(gameState.qte.pendingPunch, null);
    assert.equal(gameState.playerCombat.arm, null);
    assert.equal(requestPunch("right"), false);
    updateCharacters(0);
    assert.equal(characters.player.animationState, "idle");
    updateCombat(QTE_FAILURE_DURATION);
    assert.equal(gameState.opponentCombat.state, "counter_preparing");
    assert.equal(gameState.playerCombat.state, "defense_direction_qte");
    resolveDefenseForTest();
    assert.equal(gameState.playerCombat.state, "counter_wait");
    updateCombat(0.55);
    expectIdleAfterCooldown();
});

test("dez segundos expiram sem tempo negativo nem resolução duplicada", () => {
    requestPunch("right");
    const q = gameState.qte.question;
    updateCombat(9.9);
    assert.ok(gameState.qte.remaining > 0);
    updateCombat(0.1);
    assert.equal(gameState.playerCombat.state, "qte_failed");
    assert.equal(gameState.qte.lastResult.outcome, "timeout");
    assert.equal(gameState.qte.remaining, 0);
    assert.equal(gameState.qte.pendingPunch, null);
    assert.equal(submitAttackAnswer(q.correctAnswer, q.id), false);
    const result = gameState.qte.lastResult;
    updateCombat(20);
    expectIdleAfterCooldown();
    assert.equal(gameState.lastAttackResult.questionId, result.questionId);
    assert.equal(gameState.qte.remaining, 0);
});

test("spam, respostas inválidas e IDs antigos não alteram o QTE atual", () => {
    const previous = "old-question-id";
    requestPunch("left");
    const q = gameState.qte.question;
    const sequence = gameState.qte.sequence;
    for (let i = 0; i < 20; i++) {
        assert.equal(requestPunch("left"), false);
        assert.equal(requestPunch("right"), false);
    }
    assert.equal(gameState.qte.question, q);
    assert.equal(gameState.qte.sequence, sequence);
    assert.equal(submitAttackAnswer(q.correctAnswer, previous), false);
    assert.equal(submitAttackAnswer("INVALID", q.id), false);
    assert.equal(submitAttackAnswer(q.correctAnswer, q.id), true);
    updateCombat(0.42);
    expectIdleAfterCooldown();
    assert.equal(gameState.playerHealth, 100);
    assert.ok([90, 97.5, 100].includes(gameState.enemyHealth)); // Hit, bloqueio ou esquiva.
    assert.equal(gameState.round, 1);
});

test("expiração independe da taxa de quadros e aceita quadros lentos", () => {
    for (const fps of [30, 60, 144]) {
        finishPlayerCooldown();
        requestPunch("left");
        for (let i = 0; i < fps * 10; i++) updateCombat(1 / fps);
        assert.equal(gameState.playerCombat.state, "qte_failed");
        assert.equal(gameState.qte.remaining, 0);
        updateCombat(QTE_FAILURE_DURATION + 0.55);
        resolveDefenseForTest(); updateCombat(0.55);
    }
    finishPlayerCooldown(); requestPunch("right");
    updateCombat(30);
    assert.equal(gameState.qte.lastResult.outcome, "timeout");
    assert.equal(gameState.playerCombat.state, "qte_failed");
    updateCombat(QTE_FAILURE_DURATION + 0.55);
    resolveDefenseForTest(); updateCombat(0.55);
});
