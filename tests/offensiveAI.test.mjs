import assert from "node:assert/strict";
import { test, beforeEach, afterEach, mock } from "node:test";
import { offensiveAIConfig, ENEMY_ATTACK_INTERVAL_MIN, ENEMY_ATTACK_INTERVAL_MAX } from "../js/ai.js";
import { gameState } from "../js/gameState.js";
import { restartFight } from "../js/restart.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { selectDefenseSide, submitDefenseAnswer, registerDefenseImpact } from './helpers/defenseApi.mjs';
import { beginSpontaneousAttack, onCounterImpact } from "../js/counterAttack.js";
import { expireCounterRushForTest } from "./helpers/fight.mjs";

const enabledByDefault = offensiveAIConfig.enabled;
beforeEach(() => { offensiveAIConfig.enabled = true; restartFight(); });
afterEach(() => { offensiveAIConfig.enabled = enabledByDefault; });
mock.method(Math, "random", () => 0.5);

test("11B ativa por padrão: sem cliques, a IA abre a defesa ao vencer o intervalo", () => {
    assert.equal(enabledByDefault, true);
    assert.equal(ENEMY_ATTACK_INTERVAL_MIN, 4);
    assert.equal(ENEMY_ATTACK_INTERVAL_MAX, 7);
    updateCombat(0);
    const interval = gameState.offensiveAI.remaining;
    assert.equal(interval, 5.5);
    updateCombat(interval - 0.001);
    assert.equal(gameState.playerCombat.state, "idle");
    assert.equal(gameState.offensiveAI.sequence, 0);
    updateCombat(0.001);
    assert.equal(gameState.counterAttack.source, "spontaneous");
    assert.equal(gameState.playerCombat.state, "defense_direction_qte");
    assert.equal(gameState.defense.remaining, 3);
    assert.equal(gameState.offensiveAI.sequence, 1);
    assert.equal(gameState.playerHealth, 100);
});

test("ataques espontâneos reutilizam pergunta de 10 s e causam só um dano no impacto", () => {
    updateCombat(5.5);
    const counterId = gameState.counterAttack.questionId;
    selectDefenseSide(gameState.defense.expectedSide);
    const q = gameState.qte.question;
    assert.equal(q.kind, "defense");
    assert.equal(gameState.qte.remaining, 10);
    updateCombat(9);
    assert.equal(gameState.playerHealth, 100);
    assert.equal(gameState.counterAttack.impactResolved, false);
    const impacts = [];
    const unsubscribe = onCounterImpact(event => impacts.push(event));
    assert.equal(submitDefenseAnswer(q.correctAnswer, q.id), true);
    updateCombat(0.12);
    assert.equal(impacts.length, 1);
    assert.equal(impacts[0].questionId, counterId);
    assert.equal(gameState.playerHealth, 98);
    registerDefenseImpact(impacts[0]);
    assert.equal(gameState.playerHealth, 98);
    updateCombat(0.31);
    expireCounterRushForTest();
    assert.equal(gameState.playerCombat.state, "action_cooldown");
    assert.equal(gameState.playerCooldown.remaining, 2);
    assert.equal(gameState.opponentCombat.state, "idle");
    assert.equal(gameState.offensiveAI.remaining, null);
    updateCombat(0);
    assert.equal(gameState.offensiveAI.remaining, 5.5);
    updateCombat(2);
    assert.equal(gameState.playerCombat.state, "idle");
    assert.equal(gameState.offensiveAI.sequence, 1);
    assert.equal(gameState.playerHealth, 98);
    unsubscribe();
});

test("pausa suspende oportunidades e bloqueia até a entrada direta do ataque", () => {
    updateCombat(1);
    const remaining = gameState.offensiveAI.remaining;
    gameState.phase = "paused";
    updateCombat(100);
    assert.equal(gameState.offensiveAI.remaining, remaining);
    assert.equal(beginSpontaneousAttack(), false);
    gameState.phase = "idle";
    updateCombat(remaining);
    assert.equal(gameState.playerCombat.state, "defense_direction_qte");
    assert.equal(gameState.offensiveAI.sequence, 1);
});

test("QTE vencido conserva o contra-ataque tradicional mesmo com oportunidade ofensiva pronta", () => {
    gameState.offensiveAI.remaining = 0;
    requestPunch("left");
    const attack = gameState.qte.question;
    submitAttackAnswer(attack.alternatives.find(answer => answer !== attack.correctAnswer), attack.id);
    updateCombat(0.9);
    assert.equal(gameState.counterAttack.source, "qte_failure");
    assert.equal(gameState.counterAttack.questionId, attack.id);
    assert.equal(gameState.offensiveAI.sequence, 0);
    assert.equal(gameState.offensiveAI.remaining, null);
    assert.equal(gameState.playerCombat.state, "defense_direction_qte");
});
