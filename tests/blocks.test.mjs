import assert from "node:assert/strict";
import { test, afterEach, mock } from "node:test";
import { restartFight } from "../js/restart.js";
import { gameState } from "../js/gameState.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { resolvePlayerImpact } from "../js/match.js";
import { PUNCH_TYPES, PUNCH_ORDER } from "../js/punchTypes.js";
import { selectPunch } from "../js/punches.js";
import { characters, updateCharacters } from "../js/characters.js";
import { BLOCK_CHANCES, BLOCK_DAMAGE_REDUCTION, DODGE_CHANCES } from "../js/enemyDefense.js";
import { decideOpponentResponse } from "../js/ai.js";

afterEach(() => mock.restoreAll());
const total = type => Object.values(PUNCH_TYPES[type].timing).reduce((a, b) => a + b, 0);
const impact = type => PUNCH_TYPES[type].timing.preparation + PUNCH_TYPES[type].timing.advance;

function start(type, arm = "left", rolls = [0.99, 0]) {
    mock.restoreAll(); restartFight(); gameState.offensiveAI.remaining = 1000000;
    const random = mock.method(Math, "random", () => rolls.shift() ?? 0.99);
    selectPunch(type); assert.equal(requestPunch(arm), true);
    const question = gameState.qte.question;
    assert.equal(submitAttackAnswer(question.correctAnswer, question.id), true);
    return { random, question };
}

test("configuração mantém esquiva de 15%, bloqueios condicionais e redução de 75%", () => {
    assert.equal(DODGE_CHANCES.normal, 0.15);
    assert.deepEqual(BLOCK_CHANCES, { jab: 0.05, straight: 0.10, hook: 0.20, uppercut: 0.30 });
    assert.equal(BLOCK_DAMAGE_REDUCTION, 0.75);
    for (const type of PUNCH_ORDER) {
        for (const [roll, expected] of [[BLOCK_CHANCES[type] - 0.000001, "blocked"], [BLOCK_CHANCES[type], "hit"]]) {
            const { random } = start(type, "left", [0.15, roll]);
            assert.equal(gameState.lastAttackResult.outcome, expected);
            assert.equal(random.mock.callCount(), 2);
        }
    }
});

test("bloqueio aplica 1,25 / 2,5 / 3,75 / 6,25 HP somente no impacto e uma vez", () => {
    for (const type of PUNCH_ORDER) for (const arm of ["left", "right"]) {
        const { question, random } = start(type, arm);
        assert.equal(gameState.lastAttackResult.outcome, "blocked");
        assert.equal(gameState.lastAttackResult.blockArm, arm === "left" ? "right" : "left");
        assert.equal(gameState.enemyHealth, 100);
        assert.equal(submitAttackAnswer(question.correctAnswer, question.id), false);
        assert.equal(decideOpponentResponse(gameState.qte.lastResult, impact(type)), false);
        assert.equal(requestPunch("right"), false);
        updateCombat(impact(type) - 0.001);
        assert.equal(gameState.enemyHealth, 100);
        updateCombat(0.001); updateCharacters(0);
        assert.equal(gameState.enemyHealth, 100 - PUNCH_TYPES[type].damage * 0.25);
        assert.equal(gameState.lastAttackResult.damageApplied, PUNCH_TYPES[type].damage * 0.25);
        assert.equal(resolvePlayerImpact(), false);
        assert.equal(gameState.reactions.enemy.remaining, 0);
        assert.equal(characters.opponent.animationState, `block_${gameState.lastAttackResult.blockArm}`);
        const raised = arm === "left" ? "leftArmOffset" : "rightArmOffset";
        const other = arm === "left" ? "rightArmOffset" : "leftArmOffset";
        assert.ok(characters.opponent[raised] < characters.opponent[other]);
        assert.equal(characters.opponent.torsoX, 0);
        assert.equal(gameState.attackFeedback.outcome, "blocked");
        updateCombat(total(type) - impact(type)); updateCharacters(0);
        assert.equal(gameState.opponentCombat.state, "idle");
        assert.equal(characters.opponent.animationState, "idle");
        assert.equal(gameState.playerCombat.state, "action_cooldown");
        assert.equal(gameState.playerCooldown.remaining, 2);
        assert.equal(gameState.counterAttack.pending, false);
        assert.equal(random.mock.callCount(), 2);
    }
});

test("esquiva exclui bloqueio, evita sorteio de bloqueio e causa zero; hit causa dano completo", () => {
    for (const type of PUNCH_ORDER) {
        const { random } = start(type, "right", [0.149999, 0.1]);
        assert.equal(gameState.lastAttackResult.outcome, "dodged");
        assert.equal(gameState.lastAttackResult.blockArm, null);
        updateCombat(total(type));
        assert.equal(gameState.enemyHealth, 100);
        assert.equal(random.mock.callCount(), 2); // Esquiva + direção, sem teste de bloqueio.
        start(type, "right", [0.99, 0.99]); updateCombat(total(type));
        assert.equal(gameState.lastAttackResult.outcome, "hit");
        assert.equal(gameState.enemyHealth, 100 - PUNCH_TYPES[type].damage);
    }
});

test("bloqueio consome turnos, espera não reduz recargas e IA pode atacar após a reação", () => {
    start("uppercut"); updateCombat(total("uppercut")); updateCombat(2);
    assert.equal(gameState.punches.cooldowns.uppercut, 5);
    selectPunch("jab"); assert.equal(requestPunch("left"), true);
    assert.equal(gameState.punches.cooldowns.uppercut, 4);
    const question = gameState.qte.question;
    submitAttackAnswer(question.correctAnswer, question.id);
    gameState.offensiveAI.remaining = 0;
    updateCombat(impact("jab"));
    assert.equal(gameState.counterAttack.pending, false);
    assert.equal(gameState.qte.question, null);
    updateCombat(total("jab") - impact("jab"));
    assert.equal(gameState.counterAttack.source, "spontaneous");
    assert.equal(gameState.defense.remaining, 3);
    assert.equal(gameState.punches.cooldowns.uppercut, 4);
    assert.equal(gameState.punches.cooldowns.jab, 0);
});

test("bloqueio letal vence, limpa reações e reinício restaura todas as recargas", () => {
    start("jab"); gameState.enemyHealth = 1;
    updateCombat(impact("jab"));
    assert.equal(gameState.enemyHealth, 0);
    assert.equal(gameState.phase, "victory");
    assert.equal(gameState.opponentCombat.blockArm, null);
    assert.equal(gameState.opponentCombat.blockAmount, 0);
    assert.equal(requestPunch("left"), false);
    updateCombat(100);
    assert.equal(gameState.counterAttack.pending, false);
    restartFight(); updateCharacters(0);
    assert.equal(gameState.enemyHealth, 100);
    assert.equal(gameState.playerHealth, 100);
    assert.equal(gameState.punches.selected, "straight");
    assert.ok(Object.values(gameState.punches.cooldowns).every(value => value === 0));
    assert.equal(characters.opponent.animationState, "idle");
    assert.equal(gameState.opponentCombat.blockAmount, 0);
});

test("bloqueios terminam em 30, 60 e 144 FPS e em quadros lentos sem dano duplicado", () => {
    for (const type of PUNCH_ORDER) for (const fps of [30, 60, 144, 0.2]) {
        start(type);
        for (let i = 0; i < Math.ceil(total(type) * fps); i++) updateCombat(1 / fps);
        assert.equal(gameState.opponentCombat.state, "idle");
        assert.equal(gameState.enemyHealth, 100 - PUNCH_TYPES[type].damage * 0.25);
        assert.equal(gameState.lastAttackResult.impactResolved, true);
        assert.equal(resolvePlayerImpact(), false);
    }
});
