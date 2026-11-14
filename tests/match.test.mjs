import { updateKnockout, KO_DURATION } from '../js/knockout.js';
import assert from "node:assert/strict";
import { test, beforeEach, mock } from "node:test";
import { gameState } from "../js/gameState.js";
import { restartFight, finishPlayerCooldown, expectIdleAfterCooldown } from "./helpers/fight.mjs";
import { MAX_HEALTH, PLAYER_BASE_DAMAGE, ENEMY_BASE_DAMAGE, applyImpactDamage, isMatchOver, resolvePlayerImpact } from "../js/match.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { selectDefenseSide, submitDefenseAnswer, registerDefenseImpact, DEFENSE_DIRECTION_TIME } from './helpers/defenseApi.mjs';
import { queueCounterAttack, updateCounterAttack } from "../js/counterAttack.js";
import { decideOpponentResponse } from "../js/ai.js";
import { characters, updateCharacters } from "../js/characters.js";
import { selectPunch } from "../js/punches.js";

beforeEach(restartFight);
mock.method(Math, "random", () => 0.99);

function attack(arm = "left") {
    finishPlayerCooldown();
    assert.equal(requestPunch(arm), true);
    const q = gameState.qte.question;
    assert.equal(submitAttackAnswer(q.correctAnswer, q.id), true);
    return q;
}

function defense() {
    finishPlayerCooldown();
    const selected = gameState.punches.selected;
    selectPunch("jab"); // A regressão de vida base usa contra-ataque sem risco.
    assert.equal(requestPunch("right"), true);
    selectPunch(selected);
    const q = gameState.qte.question;
    submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
    updateCombat(0.9);
}

test("defesa tem exatamente 3 segundos, seguida da pergunta de 10 segundos", () => {
    assert.equal(DEFENSE_DIRECTION_TIME, 3);
    defense();
    assert.equal(gameState.defense.remaining, 3);
    updateCombat(2.999);
    assert.equal(gameState.playerCombat.state, "defense_direction_qte");
    assert.ok(gameState.defense.remaining > 0);
    updateCombat(0.001);
    assert.equal(gameState.playerCombat.state, "defense_question_qte");
    assert.ok(Math.abs(gameState.qte.remaining - 10) < 1e-9);
    assert.equal(gameState.playerHealth, 100);
    assert.equal(gameState.counterAttack.impactResolved, false);
});

test("socos dos dois braços retiram 10 HP no impacto, nunca antes ou em duplicidade", () => {
    assert.equal(PLAYER_BASE_DAMAGE, 10);
    for (const [index, arm] of ["left", "right"].entries()) {
        attack(arm);
        const before = 100 - index * 10;
        assert.equal(gameState.enemyHealth, before);
        updateCombat(0.159);
        assert.equal(gameState.enemyHealth, before);
        updateCombat(0.001); updateCharacters(0);
        assert.equal(gameState.enemyHealth, before - 10);
        assert.equal(gameState.lastAttackResult.damageApplied, 10);
        assert.equal(characters.opponent.animationState, "hit");
        assert.equal(resolvePlayerImpact(), false);
        updateCombat(0.26); updateCharacters(0.26);
        assert.equal(gameState.enemyHealth, before - 10);
        assert.equal(characters.opponent.animationState, "idle");
        assert.equal(characters.opponent.recoilY, 0);
    }
});

test("esquiva, erro e timeout de ataque não retiram vida do adversário", () => {
    const random = mock.method(Math, "random", () => 0);
    attack(); updateCombat(0.42);
    assert.equal(gameState.enemyHealth, 100);
    assert.equal(gameState.lastAttackResult.damageApplied, 0);
    assert.equal(gameState.lastAttackResult.outcome, "dodged");
    assert.equal(gameState.counterAttack.pending, false);
    random.mock.restore();
    defense();
    assert.equal(gameState.enemyHealth, 100);
    restartFight(); requestPunch("left"); updateCombat(10);
    assert.equal(gameState.lastAttackResult.outcome, "failed_qte");
    assert.equal(gameState.enemyHealth, 100);
});

test("defesa aplica 2, 5, 10 ou 20 HP uma única vez no impacto e retorna à guarda", () => {
    assert.equal(ENEMY_BASE_DAMAGE, 20);
    for (const [sideCorrect, questionCorrect, damage] of [[true,true,2],[true,false,5],[false,true,10],[false,false,20]]) {
        restartFight(); defense();
        const correctSide = gameState.defense.expectedSide;
        selectDefenseSide(sideCorrect ? correctSide : correctSide === "left" ? "right" : "left");
        const q = gameState.qte.question;
        updateCombat(1);
        assert.equal(gameState.playerHealth, 100);
        submitDefenseAnswer(questionCorrect ? q.correctAnswer : q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
        updateCombat(0.119);
        assert.equal(gameState.playerHealth, 100);
        updateCombat(0.001); updateCharacters(0);
        assert.equal(gameState.playerHealth, 100 - damage);
        assert.equal(gameState.defense.lastResult.damageApplied, damage);
        assert.equal(characters.player.animationState, "hit");
        const event = gameState.counterAttack.lastImpact;
        registerDefenseImpact(event);
        updateCombat(0.31); updateCharacters(0.31);
        assert.equal(gameState.playerHealth, 100 - damage);
        assert.equal(characters.player.animationState, gameState.stun.remaining > 0 ? "stunned" : "idle");
        assert.equal(characters.player.recoilY, 0);
        expectIdleAfterCooldown();
    }
});

test("dez golpes válidos vencem; vitória cancela pendências e impede novas ações", () => {
    for (let i = 0; i < 10; i++) { attack(i % 2 ? "right" : "left"); updateCombat(0.42); }
    assert.equal(gameState.enemyHealth, 0);
    updateKnockout(gameState,KO_DURATION); assert.equal(gameState.phase,"victory");
    assert.equal(gameState.matchResult.outcome, "victory");
    assert.equal(requestPunch("left"), false);
    assert.equal(gameState.qte.question, null);
    assert.equal(gameState.counterAttack.pending, false);
    const result = gameState.qte.lastResult;
    assert.equal(submitAttackAnswer(result.correctAnswer, result.questionId), false);
    assert.equal(decideOpponentResponse(result, 0.16), false);
    updateCombat(100);
    updateKnockout(gameState,KO_DURATION); assert.equal(gameState.phase,"victory");
    assert.equal(gameState.enemyHealth, 0);
});

test("cinco defesas falhas causam derrota sem vida negativa ou dano após o encerramento", () => {
    for (let i = 0; i < 5; i++) {
        defense(); updateCombat(14); // Ambos os temporizadores expiram, depois vem o impacto.
    }
    assert.equal(gameState.playerHealth, 0);
    updateKnockout(gameState,KO_DURATION); assert.equal(gameState.phase,"defeat");
    assert.equal(isMatchOver(), true);
    assert.equal(gameState.qte.question, null);
    assert.equal(gameState.counterAttack.pending, false);
    assert.equal(requestPunch("right"), false);
    assert.equal(queueCounterAttack(gameState.qte.lastResult), false);
    updateCounterAttack(100);
    assert.equal(gameState.playerHealth, 0);
});

test("HP tem limites e um mesmo ID de impacto nunca aplica dano duas vezes", () => {
    assert.equal(MAX_HEALTH, 100);
    gameState.enemyHealth = 150;
    assert.equal(applyImpactDamage("enemy", 10, "once"), 10);
    assert.equal(gameState.enemyHealth, 90);
    assert.equal(applyImpactDamage("enemy", 10, "once"), 0);
    assert.equal(applyImpactDamage("enemy", -1, "negative"), 0);
    assert.equal(applyImpactDamage("enemy", 1000, "overkill"), 90);
    assert.equal(gameState.enemyHealth, 0);
});

test("reinício limpa estados, relógios, resultados e rejeita eventos da luta anterior", () => {
    defense(); selectDefenseSide(gameState.defense.expectedSide);
    const oldQuestion = gameState.qte.question;
    const oldMatchId = gameState.matchId;
    gameState.gameTime = 123;
    applyImpactDamage("player", 100, "end-now");
    restartFight();
    assert.ok(gameState.matchId > oldMatchId);
    assert.equal(gameState.playerHealth, 100);
    assert.equal(gameState.enemyHealth, 100);
    assert.equal(gameState.gameTime, 0);
    assert.equal(gameState.phase, "idle");
    assert.equal(gameState.matchResult, null);
    assert.equal(gameState.lastAttackResult, null);
    assert.equal(gameState.counterAttack.lastImpact, null);
    assert.equal(gameState.defense.lastResult, null);
    assert.equal(gameState.defense.result, null);
    assert.equal(gameState.qte.sequence, 0);
    assert.equal(gameState.qte.question, null);
    expectIdleAfterCooldown();
    assert.equal(gameState.opponentCombat.state, "idle");
    assert.equal(characters.player.idleTime, 0);
    assert.equal(characters.opponent.torsoX, 0);
    assert.equal(applyImpactDamage("player", 20, "old-event", oldMatchId), 0);
    attack(); updateCombat(0.42);
    assert.equal(gameState.enemyHealth, 90);
    assert.equal(submitDefenseAnswer(oldQuestion.correctAnswer, oldQuestion.id), false);
    assert.equal(gameState.playerHealth, 100);
});

