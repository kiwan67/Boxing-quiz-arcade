import { restartFight, finishPlayerCooldown, expectIdleAfterCooldown } from "./helpers/fight.mjs";
beforeEach(restartFight);
import assert from "node:assert/strict";
import { test, mock, beforeEach } from "node:test";
import { gameState } from "../js/gameState.js";
import { submitAttackAnswer, updateCombat, QTE_FAILURE_DURATION } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { COUNTER_TIMING, isCounterActive, onCounterImpact, queueCounterAttack } from "../js/counterAttack.js";
import { characters, updateCharacters } from "../js/characters.js";
import { ARM_LENGTHS, solveCounterArmPose } from "../js/armPose.js";
import { resolveDefenseForTest } from "./helpers/defense.mjs";

function failQTE(timeout = false) {
    finishPlayerCooldown();
    assert.equal(requestPunch("left"), true);
    const question = gameState.qte.question;
    if (timeout) updateCombat(10);
    else submitAttackAnswer(question.alternatives.find(answer => answer !== question.correctAnswer), question.id);
    return question;
}

test("erro e timeout geram um contra-ataque cada, bloqueiam comandos e emitem impacto único", () => {
    assert.deepEqual(COUNTER_TIMING, { preparation: 0.12, advance: 0.12, retract: 0.16, recovery: 0.15 });
    for (const [timeout, roll, side] of [[false, 0.49, "left"], [true, 0.5, "right"]]) {
        const healthBefore = gameState.playerHealth;
        const random = mock.method(Math, "random", () => roll);
        const impacts = [];
        const unsubscribe = onCounterImpact(event => {
            impacts.push(event);
            assert.equal(gameState.counterAttack.impactResolved, true);
            assert.equal(gameState.opponentCombat.extension, 1);
        });
        const q = failQTE(timeout);
        assert.equal(gameState.counterAttack.pending, true);
        assert.equal(gameState.counterAttack.side, side);
        assert.equal(gameState.playerCombat.arm, null);
        assert.equal(gameState.lastAttackResult.outcome, "failed_qte");
        assert.equal(submitAttackAnswer(q.correctAnswer, q.id), false);
        assert.equal(queueCounterAttack(gameState.qte.lastResult), false);
        updateCombat(QTE_FAILURE_DURATION); updateCharacters(0);
        assert.equal(isCounterActive(), true);
        assert.equal(gameState.counterAttack.pending, true);
        resolveDefenseForTest();
        assert.equal(gameState.counterAttack.pending, false);
        assert.equal(gameState.opponentCombat.state, "counter_preparing");
        assert.equal(characters.opponent.animationState, `counter_${side}`);
        assert.equal(characters.player.animationState, "idle");
        for (let i = 0; i < 20; i++) {
            assert.equal(requestPunch("left"), false);
            assert.equal(requestPunch("right"), false);
        }
        updateCombat(0.12); updateCharacters(0.12);
        assert.equal(gameState.opponentCombat.state, "counter_attacking");
        assert.equal(impacts.length, 0);
        updateCombat(0.12); updateCharacters(0.12);
        assert.equal(impacts.length, 1);
        assert.equal(impacts[0].side, side);
        assert.equal(impacts[0].questionId, q.id);
        assert.equal(impacts[0].at, gameState.counterAttack.startedAt + 0.24);
        assert.equal(characters.opponent.counterSide, side);
        assert.ok(side === "left" ? characters.opponent.counterArmPose.wristX > 40
            : characters.opponent.counterArmPose.wristX < 40);
        assert.equal(requestPunch("right"), false);
        updateCombat(0.16);
        assert.equal(gameState.opponentCombat.state, "counter_recovering");
        assert.equal(requestPunch("left"), false);
        updateCombat(0.149);
        assert.equal(isCounterActive(), true);
        updateCombat(0.001); updateCharacters(0.15);
        assert.equal(gameState.opponentCombat.state, "idle");
        expectIdleAfterCooldown();
        assert.equal(characters.opponent.animationState, "idle");
        assert.equal(characters.opponent.counterSide, null);
        assert.equal(gameState.counterAttack.finishedAt, gameState.counterAttack.startedAt + 0.55);
        assert.equal(queueCounterAttack(gameState.qte.lastResult), false);
        updateCombat(1);
        assert.equal(impacts.length, 1);
        assert.equal(random.mock.callCount(), 2); // Braço e precisão únicos.
        assert.equal(gameState.playerHealth, healthBefore - 2.2);
        assert.equal(gameState.enemyHealth, 100);
        unsubscribe(); random.mock.restore();
    }
});

test("acerto e esquiva não agendam contra-ataques", () => {
    for (const roll of [0.99, 0]) {
        finishPlayerCooldown();
        const random = mock.method(Math, "random", () => roll);
        const previous = gameState.counterAttack.questionId;
        requestPunch("right");
        const q = gameState.qte.question;
        submitAttackAnswer(q.correctAnswer, q.id);
        assert.equal(gameState.lastAttackResult.outcome, roll ? "hit" : "dodged");
        updateCombat(0.42);
        assert.equal(gameState.counterAttack.questionId, previous);
        assert.equal(gameState.counterAttack.pending, false);
        assert.equal(isCounterActive(), false);
        random.mock.restore();
    }
});

test("braços do adversário preservam segmentos, anatomia e avanço em direção à câmera", () => {
    for (const side of ["left", "right"]) {
        const pose = {};
        solveCounterArmPose(side, 0, 0, 0, 0, pose);
        const guardY = pose.gloveY;
        for (let frame = 0; frame <= 100; frame++) {
            solveCounterArmPose(side, frame / 100, 0, 0, 0, pose);
            assert.ok(Math.abs(Math.hypot(pose.elbowX - pose.shoulderX, pose.elbowY - pose.shoulderY) - ARM_LENGTHS.upper) < 1e-9);
            assert.ok(Math.abs(Math.hypot(pose.wristX - pose.elbowX, pose.wristY - pose.elbowY) - ARM_LENGTHS.forearm) < 1e-9);
            assert.ok(side === "left" ? pose.wristX > 40 : pose.wristX < 40);
        }
        assert.ok(pose.gloveY > guardY);
    }
});

test("contra-ataque termina em diferentes taxas de quadros e atravessa quadros lentos", () => {
    const random = mock.method(Math, "random", () => 0);
    for (const fps of [30, 60, 144]) {
        failQTE();
        const impacts = [];
        const unsubscribe = onCounterImpact(event => impacts.push(event));
        updateCombat(QTE_FAILURE_DURATION);
        resolveDefenseForTest();
        for (let frame = 0; frame < Math.ceil(0.55 * fps); frame++) updateCombat(1 / fps);
        expectIdleAfterCooldown();
        assert.equal(gameState.opponentCombat.state, "idle");
        assert.equal(impacts.length, 1);
        unsubscribe();
    }
    failQTE(true);
    let count = 0;
    const unsubscribe = onCounterImpact(() => count++);
    updateCombat(20);
    assert.equal(count, 1);
    assert.equal(gameState.counterAttack.impactResolved, true);
    expectIdleAfterCooldown();
    assert.equal(gameState.opponentCombat.state, "idle");
    unsubscribe(); random.mock.restore();
});
