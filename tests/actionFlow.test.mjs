import assert from "node:assert/strict";
import { test, beforeEach, afterEach, mock } from "node:test";
import { restartFight } from "../js/restart.js";
import { gameState } from "../js/gameState.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { selectDefenseSide, submitDefenseAnswer } from './helpers/defenseApi.mjs';
import { PLAYER_ACTION_COOLDOWN } from "../js/cooldown.js";
import { AI_ATTACK_INTERVAL_MIN, AI_ATTACK_INTERVAL_MAX, offensiveAIConfig } from "../js/ai.js";
import { applyImpactDamage } from "../js/match.js";
import { updateCharacters, characters } from "../js/characters.js";
import { selectPunch } from "../js/punches.js";
import { expireCounterRushForTest } from "./helpers/fight.mjs";

// Regressões da integração futura usam opt-in apenas dentro desta suíte.
beforeEach(() => { restartFight(); offensiveAIConfig.enabled = true; });
afterEach(() => { offensiveAIConfig.enabled = false; });
mock.method(Math, "random", () => 0.5);

function validAttack() {
    assert.equal(requestPunch("left"), true);
    const q = gameState.qte.question;
    assert.equal(submitAttackAnswer(q.correctAnswer, q.id), true);
}

function resolveDefense() {
    assert.equal(selectDefenseSide(gameState.defense.expectedSide), true);
    const q = gameState.qte.question;
    assert.equal(submitDefenseAnswer(q.correctAnswer, q.id), true);
    updateCombat(0.55 - gameState.opponentCombat.elapsed);
    expireCounterRushForTest();
}

test("soco acertado ou esquivado só inicia 2 segundos após toda a recuperação", () => {
    assert.equal(PLAYER_ACTION_COOLDOWN, 2);
    for (const roll of [0.5, 0]) {
        restartFight(); gameState.offensiveAI.remaining = 1000;
        const random = mock.method(Math, "random", () => roll);
        validAttack();
        updateCombat(0.30);
        assert.equal(gameState.playerCombat.state, "recovering");
        assert.equal(gameState.playerCooldown.remaining, 0);
        updateCombat(0.12); updateCharacters(0.12);
        assert.equal(gameState.playerCombat.state, "action_cooldown");
        assert.equal(gameState.playerCooldown.remaining, 2);
        assert.equal(characters.player.animationState, "idle");
        for (let i = 0; i < 30; i++) {
            assert.equal(requestPunch("left"), false);
            assert.equal(requestPunch("right"), false);
        }
        assert.equal(gameState.playerCooldown.remaining, 2);
        updateCombat(1.999);
        assert.equal(gameState.playerCombat.state, "action_cooldown");
        updateCombat(0.001);
        assert.equal(gameState.playerCombat.state, "idle");
        assert.equal(gameState.playerCooldown.remaining, 0);
        assert.ok(gameState.playerCooldown.readyMessageRemaining > 0);
        selectPunch("jab"); // O cooldown geral acabou; outro golpe já está disponível.
        assert.equal(requestPunch("right"), true);
        random.mock.restore();
    }
});

test("erro e timeout aguardam defesa e recuperação antes de iniciar countdown", () => {
    for (const timeout of [false, true]) {
        restartFight(); gameState.offensiveAI.remaining = 1000;
        requestPunch("left");
        const q = gameState.qte.question;
        if (timeout) updateCombat(10);
        else submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
        assert.equal(gameState.playerCooldown.remaining, 0);
        updateCombat(0.9);
        assert.equal(gameState.playerCombat.state, "defense_direction_qte");
        updateCombat(2);
        assert.equal(gameState.playerCooldown.remaining, 0);
        resolveDefense();
        assert.equal(gameState.opponentCombat.state, "idle");
        assert.equal(gameState.playerCombat.state, "action_cooldown");
        assert.ok(Math.abs(gameState.playerCooldown.remaining - 2) < 1e-9);
    }
});

test("IA ataca mesmo com todas as respostas de ataque corretas", () => {
    validAttack(); updateCombat(0.42);
    assert.equal(gameState.lastAttackResult.outcome, "hit");
    updateCombat(2);
    assert.equal(gameState.playerCombat.state, "idle");
    updateCombat(gameState.offensiveAI.remaining);
    assert.equal(gameState.counterAttack.source, "spontaneous");
    assert.equal(gameState.offensiveAI.sequence, 1);
    assert.equal(gameState.playerCombat.state, "defense_direction_qte");
    assert.equal(gameState.defense.remaining, 3);
    selectDefenseSide(gameState.defense.expectedSide);
    assert.equal(gameState.qte.question.kind, "defense");
    assert.equal(gameState.qte.remaining, 10);
    assert.equal(gameState.lastAttackResult.outcome, "hit");
});

test("ataque durante countdown suspende o contador e devolve 2 segundos completos", () => {
    gameState.offensiveAI.remaining = 0.8;
    validAttack(); updateCombat(0.42);
    updateCombat(0.4);
    assert.equal(gameState.playerCombat.state, "defense_direction_qte");
    assert.ok(Math.abs(gameState.playerCooldown.remaining - 1.6) < 1e-9);
    const suspended = gameState.playerCooldown.remaining;
    updateCombat(2);
    assert.equal(gameState.playerCooldown.remaining, suspended);
    selectDefenseSide(gameState.defense.expectedSide);
    const q = gameState.qte.question;
    updateCombat(9);
    assert.equal(gameState.qte.question, q);
    assert.equal(gameState.playerCooldown.remaining, suspended);
    assert.equal(gameState.counterAttack.impactResolved, false);
    submitDefenseAnswer(q.correctAnswer, q.id);
    updateCombat(0.55 - gameState.opponentCombat.elapsed);
    expireCounterRushForTest();
    assert.equal(gameState.playerCombat.state, "action_cooldown");
    assert.ok(Math.abs(gameState.playerCooldown.remaining - 2) < 1e-9);
    assert.equal(gameState.playerHealth, 98);
});

test("oportunidade vencida aguarda QTE, soco e reação sem interrompê-los", () => {
    gameState.offensiveAI.remaining = 0;
    requestPunch("right");
    const q = gameState.qte.question;
    updateCombat(5);
    assert.equal(gameState.qte.question, q);
    assert.equal(gameState.offensiveAI.sequence, 0);
    submitAttackAnswer(q.correctAnswer, q.id);
    updateCombat(0.16);
    assert.ok(gameState.reactions.enemy.remaining > 0);
    assert.equal(gameState.offensiveAI.sequence, 0);
    updateCombat(0.22);
    assert.equal(gameState.playerCombat.state, "recovering");
    assert.equal(gameState.offensiveAI.sequence, 0);
    updateCombat(0.04);
    assert.equal(gameState.playerCombat.state, "defense_direction_qte");
    assert.equal(gameState.offensiveAI.sequence, 1);
    assert.equal(gameState.reactions.enemy.remaining, 0);
});

test("IA não ataca enquanto há reação, nem gera ataque obrigatório ao receber golpe", () => {
    gameState.offensiveAI.remaining = 0;
    gameState.reactions.enemy.remaining = 0.15;
    updateCombat(0.1);
    assert.equal(gameState.offensiveAI.sequence, 0);
    updateCombat(0.05);
    assert.equal(gameState.offensiveAI.sequence, 1);
    restartFight(); gameState.offensiveAI.remaining = 1000;
    validAttack(); updateCombat(0.42);
    assert.equal(gameState.offensiveAI.sequence, 0);
    assert.equal(gameState.counterAttack.pending, false);
});

test("intervalo sorteado é configurável entre 4 e 7 segundos sem fila de ataques", () => {
    assert.equal(AI_ATTACK_INTERVAL_MIN, 4);
    assert.equal(AI_ATTACK_INTERVAL_MAX, 7);
    for (const roll of [0, 0.5, 0.999999]) {
        restartFight();
        const random = mock.method(Math, "random", () => roll);
        updateCombat(0);
        assert.equal(gameState.offensiveAI.remaining, 4 + roll * 3);
        updateCombat(1);
        assert.equal(random.mock.callCount(), 1);
        random.mock.restore();
    }
    restartFight(); updateCombat(100);
    assert.equal(gameState.offensiveAI.sequence, 1);
    assert.equal(gameState.defense.remaining, 3);
    updateCombat(100);
    assert.equal(gameState.offensiveAI.sequence, 1);
    assert.equal(gameState.playerCombat.state, "idle");
    updateCombat(0);
    assert.equal(gameState.offensiveAI.remaining, 5.5);
});

test("falha de ataque e defesa em andamento não acumulam ataques espontâneos", () => {
    gameState.offensiveAI.remaining = 0;
    requestPunch("left"); updateCombat(10);
    assert.equal(gameState.counterAttack.source, "qte_failure");
    const id = gameState.counterAttack.questionId;
    updateCombat(0.9);
    assert.equal(gameState.offensiveAI.remaining, null);
    assert.equal(gameState.offensiveAI.sequence, 0);
    updateCombat(3);
    assert.equal(gameState.playerCombat.state, "defense_question_qte");
    updateCombat(9);
    assert.equal(gameState.counterAttack.questionId, id);
    assert.equal(gameState.offensiveAI.sequence, 0);
    const q = gameState.qte.question;
    submitDefenseAnswer(q.correctAnswer, q.id);
    updateCombat(0.43);
    assert.equal(gameState.playerCombat.state, "action_cooldown");
    assert.equal(gameState.offensiveAI.sequence, 0);
});

test("encerramento limpa relógios e reinício reativa cooldown e IA", () => {
    for (const target of ["enemy", "player"]) {
        restartFight(); gameState.offensiveAI.remaining = 1000;
        validAttack(); updateCombat(0.42);
        assert.equal(gameState.playerCooldown.remaining, 2);
        applyImpactDamage(target, 100, "end");
        assert.equal(gameState.playerCooldown.remaining, 0);
        assert.equal(gameState.offensiveAI.remaining, null);
        updateCombat(100);
        assert.equal(gameState.offensiveAI.sequence, 0);
        assert.equal(gameState.counterAttack.pending, false);
        restartFight();
        assert.equal(gameState.playerCooldown.remaining, 0);
        assert.equal(gameState.offensiveAI.remaining, null);
        updateCombat(5.5);
        assert.equal(gameState.counterAttack.source, "spontaneous");
        resolveDefense();
        assert.equal(gameState.playerCombat.state, "action_cooldown");
        assert.ok(Math.abs(gameState.playerCooldown.remaining - 2) < 1e-9);
    }
});

test("countdown usa deltaTime em várias taxas e não fica negativo em quadros lentos", () => {
    for (const fps of [30, 60, 144]) {
        restartFight(); gameState.offensiveAI.remaining = 1000;
        validAttack(); updateCombat(0.42);
        for (let frame = 0; frame < fps * 2 - 1; frame++) updateCombat(1 / fps);
        assert.equal(gameState.playerCombat.state, "action_cooldown");
        assert.ok(gameState.playerCooldown.remaining > 0);
        updateCombat(1 / fps);
        assert.equal(gameState.playerCombat.state, "idle");
        assert.equal(gameState.playerCooldown.remaining, 0);
    }
    restartFight(); gameState.offensiveAI.remaining = 1000;
    validAttack(); updateCombat(0.62);
    assert.ok(Math.abs(gameState.playerCooldown.remaining - 1.8) < 1e-9);
    updateCombat(20);
    assert.equal(gameState.playerCombat.state, "idle");
    assert.equal(gameState.playerCooldown.remaining, 0);
    assert.equal(gameState.playerCooldown.readyMessageRemaining, 0);
});
