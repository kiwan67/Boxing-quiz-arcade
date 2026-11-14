import assert from "node:assert/strict";
import { test, beforeEach, afterEach, mock } from "node:test";
import { restartFight } from "../js/restart.js";
import { gameState } from "../js/gameState.js";
import { offensiveAIConfig } from "../js/ai.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { selectDefenseSide, submitDefenseAnswer } from './helpers/defenseApi.mjs';
import { updatePlayerCooldown, updateReadyMessage } from "../js/cooldown.js";
import { applyImpactDamage } from "../js/match.js";
import { selectPunch } from "../js/punches.js";
import { expireCounterRushForTest } from "./helpers/fight.mjs";

// Regressão isolada da Parte 11A; a produção usa IA ofensiva ativa na 11B.
beforeEach(() => { offensiveAIConfig.enabled = false; restartFight(); });
afterEach(() => { offensiveAIConfig.enabled = true; });
mock.method(Math, "random", () => 0.99);

function hit() {
    assert.equal(requestPunch("left"), true);
    const q = gameState.qte.question;
    submitAttackAnswer(q.correctAnswer, q.id);
    updateCombat(0.42);
}

test("11A: nenhuma IA independente enquanto espera ou recupera", () => {
    assert.equal(offensiveAIConfig.enabled, false);
    updateCombat(100);
    assert.equal(gameState.playerCombat.state, "idle");
    assert.equal(gameState.offensiveAI.remaining, null);
    assert.equal(gameState.offensiveAI.sequence, 0);
    hit();
    assert.equal(gameState.playerCooldown.remaining, 2);
    assert.equal(gameState.enemyHealth, 90);
    for (let i = 0; i < 25; i++) {
        assert.equal(requestPunch("left"), false);
        assert.equal(requestPunch("right"), false);
    }
    assert.equal(gameState.playerCooldown.remaining, 2);
    updateCombat(2);
    assert.equal(gameState.playerCombat.state, "idle");
    assert.ok(gameState.playerCooldown.readyMessageRemaining > 0);
    updateCombat(100);
    assert.equal(gameState.counterAttack.pending, false);
    assert.equal(gameState.offensiveAI.sequence, 0);
    assert.equal(gameState.playerHealth, 100);
    selectPunch("jab"); // Direto continua em recarga por ações, mesmo após esperar.
    assert.equal(requestPunch("right"), true);
});

test("pausa conserva exatamente countdown, mensagem e bloqueio de entrada", () => {
    hit(); updateCombat(0.5);
    const remaining = gameState.playerCooldown.remaining;
    gameState.phase = "paused";
    updateCombat(100);
    updatePlayerCooldown(100);
    updateReadyMessage(100);
    assert.equal(gameState.playerCooldown.remaining, remaining);
    assert.equal(gameState.playerCombat.state, "action_cooldown");
    assert.equal(requestPunch("left"), false);
    gameState.phase = "idle";
    updateCombat(remaining);
    assert.equal(gameState.playerCombat.state, "idle");
    const message = gameState.playerCooldown.readyMessageRemaining;
    gameState.phase = "paused"; updateCombat(10); updateReadyMessage(10);
    assert.equal(gameState.playerCooldown.readyMessageRemaining, message);
});

test("falha ou timeout completa defesa e recuperação antes de contar dois segundos", () => {
    for (const timeout of [false, true]) {
        restartFight(); requestPunch("left");
        const q = gameState.qte.question;
        if (timeout) updateCombat(10);
        else submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
        assert.equal(gameState.playerCooldown.remaining, 0);
        updateCombat(0.9);
        assert.equal(gameState.defense.remaining, 3);
        selectDefenseSide(gameState.defense.expectedSide);
        const defense = gameState.qte.question;
        assert.equal(gameState.qte.remaining, 10);
        updateCombat(1);
        assert.equal(gameState.playerCooldown.remaining, 0);
        submitDefenseAnswer(defense.correctAnswer, defense.id);
        updateCombat(0.12);
        assert.equal(gameState.counterAttack.impactResolved, true);
        assert.equal(gameState.playerCooldown.remaining, 0);
        updateCombat(0.31);
        expireCounterRushForTest();
        assert.equal(gameState.playerCombat.state, "action_cooldown");
        assert.ok(Math.abs(gameState.playerCooldown.remaining - 2) < 1e-9);
        assert.equal(gameState.playerHealth, 97.8); // Direto falho: 22 × 10%.
    }
});

test("fim limpa recuperação e reinício permite ataque imediatamente", () => {
    for (const target of ["player", "enemy"]) {
        restartFight(); hit();
        applyImpactDamage(target, 100, "finish");
        updateCombat(100);
        assert.equal(gameState.playerCooldown.remaining, 0);
        assert.equal(gameState.playerCooldown.readyMessageRemaining, 0);
        assert.equal(requestPunch("left"), false);
        restartFight();
        assert.equal(gameState.playerCooldown.remaining, 0);
        assert.equal(gameState.playerCooldown.readyMessageRemaining, 0);
        assert.equal(gameState.playerCombat.state, "idle");
        assert.equal(gameState.offensiveAI.remaining, null);
        assert.equal(offensiveAIConfig.enabled, false);
        assert.equal(requestPunch("right"), true);
    }
});
