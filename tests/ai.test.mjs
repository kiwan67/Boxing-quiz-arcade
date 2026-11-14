import { restartFight, finishPlayerCooldown, expectIdleAfterCooldown } from "./helpers/fight.mjs";
beforeEach(restartFight);
import assert from "node:assert/strict";
import { test, mock, beforeEach } from "node:test";
import { gameState } from "../js/gameState.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { characters, updateCharacters } from "../js/characters.js";
import { DODGE_CHANCES, decideOpponentResponse } from "../js/ai.js";
import { resolveDefenseForTest } from "./helpers/defense.mjs";

function answerCorrectly(arm = "left") {
    finishPlayerCooldown();
    assert.equal(requestPunch(arm), true);
    const q = gameState.qte.question;
    assert.equal(submitAttackAnswer(q.correctAnswer, q.id), true);
    return q;
}

test("erro e expiração registram failed_qte sem sorteio de esquiva", () => {
    const random = mock.method(Math, "random", () => 0.75);
    requestPunch("left");
    const q = gameState.qte.question;
    updateCombat(2);
    assert.equal(gameState.opponentCombat.state, "idle");
    submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
    assert.equal(gameState.lastAttackResult.outcome, "failed_qte");
    assert.equal(gameState.lastAttackResult.qteOutcome, "incorrect");
    assert.equal(gameState.playerCombat.arm, null);
    assert.equal(random.mock.callCount(), 2); // Braço e precisão; sem sorteio de esquiva.
    updateCombat(0.9 + 0.55);
    resolveDefenseForTest(); updateCombat(0.55);
    finishPlayerCooldown(); requestPunch("right"); updateCombat(10);
    assert.equal(gameState.lastAttackResult.outcome, "failed_qte");
    assert.equal(gameState.lastAttackResult.qteOutcome, "timeout");
    assert.equal(gameState.opponentCombat.state, "idle");
    assert.equal(random.mock.callCount(), 4);
    updateCombat(0.9 + 0.55);
    resolveDefenseForTest(); updateCombat(0.55);
    random.mock.restore();
});

test("hit é decidido uma vez e feedback só aparece no momento do impacto", () => {
    const random = mock.method(Math, "random", () => 0.15);
    const q = answerCorrectly("right");
    assert.equal(gameState.lastAttackResult.outcome, "hit");
    assert.equal(gameState.lastAttackResult.arm, "right");
    assert.equal(gameState.opponentCombat.state, "idle");
    assert.equal(gameState.playerCombat.state, "punching_right");
    assert.equal(submitAttackAnswer(q.correctAnswer, q.id), false);
    assert.equal(decideOpponentResponse(gameState.qte.lastResult, 0.16), false);
    updateCombat(0.15);
    assert.ok(gameState.attackFeedback.delay > 0);
    updateCombat(0.01);
    assert.ok(gameState.attackFeedback.delay < 1e-9);
    assert.equal(random.mock.callCount(), 2); // Esquiva e, somente se falhar, bloqueio.
    updateCombat(0.26);
    expectIdleAfterCooldown();
    updateCombat(1);
    assert.equal(gameState.attackFeedback.remaining, 0);
    random.mock.restore();
});

test("esquivas dos dois lados mantêm direção e desvio no pico do soco", () => {
    for (const [directionRoll, direction] of [[0.2, "left"], [0.8, "right"]]) {
        const rolls = [0.149999, directionRoll];
        const random = mock.method(Math, "random", () => {
            assert.ok(rolls.length, "nenhum sorteio por quadro");
            return rolls.shift();
        });
        answerCorrectly();
        assert.equal(gameState.lastAttackResult.outcome, "dodged");
        assert.equal(gameState.opponentCombat.state, `dodge_${direction}`);
        assert.equal(requestPunch("right"), false);
        updateCombat(0.10); updateCharacters(0.10);
        assert.equal(Math.abs(gameState.opponentCombat.offset), 1);
        updateCombat(0.06); updateCharacters(0.06);
        assert.equal(gameState.playerCombat.extension, 1);
        assert.equal(gameState.opponentCombat.direction, direction);
        assert.equal(characters.opponent.animationState, `dodge_${direction}`);
        assert.equal(characters.opponent.torsoX, direction === "left" ? -8 : 8);
        updateCombat(0.06); updateCharacters(0.06);
        assert.equal(gameState.opponentCombat.state, "dodge_recovering");
        assert.equal(characters.opponent.animationState, `dodge_${direction}`);
        updateCombat(0.09);
        assert.ok(Math.abs(gameState.opponentCombat.offset) > 0 && Math.abs(gameState.opponentCombat.offset) < 1);
        assert.equal(gameState.opponentCombat.direction, direction);
        assert.equal(requestPunch("right"), false);
        updateCombat(0.09); updateCharacters(0.09);
        assert.equal(gameState.opponentCombat.state, "idle");
        assert.equal(gameState.opponentCombat.offset, 0);
        assert.equal(characters.opponent.torsoX, 0);
        assert.equal(characters.opponent.animationState, "idle");
        updateCombat(0.02);
        expectIdleAfterCooldown();
        assert.equal(random.mock.callCount(), 2);
        random.mock.restore();
    }
});

test("normal ativo, limite de 15% e ataques consecutivos sem decisões extras", () => {
    assert.equal(gameState.difficulty, "normal");
    assert.deepEqual(DODGE_CHANCES, { easy: 0.10, normal: 0.15, hard: 0.20 });
    let nextRoll = 0, choosingDirection = false, choosingBlock = false, decisions = 0, directions = 0;
    const random = mock.method(Math, "random", () => {
        if (choosingDirection) { choosingDirection = false; directions++; return 0.75; }
        if (choosingBlock) { choosingBlock = false; return 0.99; }
        decisions++;
        const roll = nextRoll / 1000;
        choosingDirection = roll < 0.15;
        choosingBlock = !choosingDirection;
        return roll;
    });
    let dodged = 0;
    for (nextRoll = 0; nextRoll < 1000; nextRoll++) {
        restartFight(); // Amostras independentes: uma luta real termina ao zerar HP.
        answerCorrectly(nextRoll % 2 === 0 ? "left" : "right");
        if (gameState.lastAttackResult.outcome === "dodged") dodged++;
        for (let frame = 0; frame < 42; frame++) updateCombat(0.01);
        expectIdleAfterCooldown();
        assert.equal(gameState.opponentCombat.state, "idle");
    }
    // Amostras controladas verificam o limiar; a produção continua aleatória.
    assert.equal(dodged, 150);
    assert.equal(decisions, 1000);
    assert.equal(directions, 150);
    assert.equal(random.mock.callCount(), 2000);
    assert.equal(gameState.playerHealth, 100);
    assert.equal(gameState.enemyHealth, 90);
    assert.equal(gameState.round, 1);
    random.mock.restore();
});

test("quadros lentos e taxas diferentes terminam a esquiva sem prender estados", () => {
    const random = mock.method(Math, "random", () => 0);
    for (const fps of [30, 60, 144]) {
        answerCorrectly();
        for (let frame = 0; frame < Math.ceil(0.42 * fps); frame++) updateCombat(1 / fps);
        expectIdleAfterCooldown();
        assert.equal(gameState.opponentCombat.state, "idle");
    }
    answerCorrectly();
    updateCombat(5); updateCharacters(5);
    assert.equal(gameState.opponentCombat.state, "idle");
    assert.equal(characters.opponent.torsoX, 0);
    assert.equal(gameState.attackFeedback.remaining, 0);
    random.mock.restore();
});
