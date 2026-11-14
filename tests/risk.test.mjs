import { updateKnockout, KO_DURATION } from '../js/knockout.js';
import assert from "node:assert/strict";
import { test, beforeEach, afterEach, mock } from "node:test";
import { gameState } from "../js/gameState.js";
import { restartFight } from "../js/restart.js";
import { PUNCH_RISK_BONUSES, registerAttackRisk } from "../js/risk.js";
import { ENEMY_BASE_DAMAGE, applyImpactDamage } from "../js/match.js";
import { defenseConfig, selectDefenseSide, submitDefenseAnswer, registerDefenseImpact } from './helpers/defenseApi.mjs';
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { beginSpontaneousAttack, beginCounterAttack, queueCounterAttack } from "../js/counterAttack.js";
import { selectPunch } from "../js/punches.js";
import { enemyAccuracyDebug, ENEMY_ACCURACY } from "../js/enemyAccuracy.js";
import { PUNCH_TYPES } from "../js/punchTypes.js";
import { expireCounterRushForTest } from "./helpers/fight.mjs";

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const reset = () => { restartFight(); gameState.offensiveAI.remaining = 1000000; };
const failedResult = type => ({ kind: "attack", outcome: "incorrect", punchType: type });
beforeEach(() => { reset(); enemyAccuracyDebug.forceOutcome = null; mock.method(Math, "random", () => 0.99); });
afterEach(() => { mock.restoreAll(); enemyAccuracyDebug.forceOutcome = null; });

function fail(type, timeout = false) {
    selectPunch(type); assert.equal(requestPunch("right"), true);
    const q = gameState.qte.question;
    selectPunch("jab"); // O risco pertence ao golpe registrado, não à seleção atual.
    if (timeout) updateCombat(10);
    else assert.equal(submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id), true);
    assert.equal(submitAttackAnswer(q.correctAnswer, q.id), false);
    return q;
}

function resolve(sideCorrect, questionCorrect) {
    assert.equal(gameState.defense.remaining, 3);
    updateCombat(0.12); // Preparação é mantida enquanto a escolha está aberta.
    const expected = gameState.defense.expectedSide;
    selectDefenseSide(sideCorrect ? expected : expected === "left" ? "right" : "left");
    assert.equal(gameState.qte.remaining, 10);
    const q = gameState.qte.question;
    submitDefenseAnswer(questionCorrect ? q.correctAnswer : q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
    updateCombat(0.12);
    assert.equal(gameState.counterAttack.impactResolved, true);
    const result = gameState.defense.lastResult;
    const health = gameState.playerHealth;
    registerDefenseImpact(gameState.counterAttack.lastImpact);
    assert.equal(gameState.playerHealth, health);
    updateCombat(0.31);
    expireCounterRushForTest();
    assert.equal(gameState.opponentCombat.state, "idle");
    assert.equal(gameState.playerCombat.state, result.stunAdditional ? "stun_recovery" : "action_cooldown");
    return result;
}

test("Jab/Direto/Gancho/Uppercut falhos ou expirados geram 0/10/25/50% antes do contra-ataque", () => {
    assert.deepEqual(PUNCH_RISK_BONUSES, { jab: 0, straight: 0.10, hook: 0.25, uppercut: 0.50 });
    for (const [type, bonus] of Object.entries(PUNCH_RISK_BONUSES)) for (const timeout of [false, true]) {
        reset(); fail(type, timeout);
        const turns = { ...gameState.punches.cooldowns };
        assert.equal(gameState.pendingRiskBonus, bonus);
        assert.equal(gameState.counterAttack.riskBonus, 0);
        assert.equal(queueCounterAttack(gameState.qte.lastResult), false);
        assert.equal(gameState.pendingRiskBonus, bonus);
        updateCombat(0.9);
        assert.equal(gameState.pendingRiskBonus, 0);
        assert.equal(gameState.counterAttack.riskBonus, bonus);
        assert.equal(gameState.counterAttack.baseDamage, 20 * (1 + bonus));
        const result = resolve(false, false);
        near(result.damage, 20 * (1 + bonus));
        near(gameState.playerHealth, 100 - result.damage);
        assert.deepEqual(gameState.punches.cooldowns, turns);
        assert.equal(ENEMY_BASE_DAMAGE, 20);
        assert.equal(defenseConfig.baseDamage, 20);
    }
});

test("defesa reduz base 30 do Uppercut para 3 / 7,5 / 15 / 30, sem arredondar", () => {
    for (const [side, question, damage] of [[true,true,3],[true,false,7.5],[false,true,15],[false,false,30]]) {
        reset(); fail("uppercut"); updateCombat(0.9);
        const result = resolve(side, question);
        assert.equal(result.baseDamage, 30);
        assert.equal(result.riskBonus, 0.5);
        near(result.damage, damage);
        near(result.damageApplied, damage);
        near(gameState.playerHealth, 100 - damage);
    }
});

test("QTE correto com hit, esquiva ou bloqueio não cria penalidade", () => {
    for (const [rolls, outcome] of [[[0.99,0.99],"hit"], [[0.1,0.9],"dodged"], [[0.99,0],"blocked"]]) {
        reset();
        const random = mock.method(Math, "random", () => rolls.shift() ?? 0.99);
        selectPunch("uppercut"); assert.equal(gameState.pendingRiskBonus, 0);
        requestPunch("left");
        const q = gameState.qte.question;
        submitAttackAnswer(q.correctAnswer, q.id);
        assert.equal(gameState.lastAttackResult.outcome, outcome);
        updateCombat(0.58);
        assert.equal(gameState.pendingRiskBonus, 0);
        assert.equal(gameState.counterAttack.pending, false);
        random.mock.restore();
    }
});

test("múltiplas falhas mantêm somente o maior bônus; seleção e turnos são independentes", () => {
    for (const type of ["straight", "hook", "straight", "jab", "uppercut", "hook"]) {
        const before = gameState.pendingRiskBonus;
        const turns = { ...gameState.punches.cooldowns };
        registerAttackRisk(failedResult(type));
        assert.equal(gameState.pendingRiskBonus, Math.max(before, PUNCH_RISK_BONUSES[type]));
        assert.deepEqual(gameState.punches.cooldowns, turns);
    }
    assert.equal(gameState.pendingRiskBonus, 0.5);
    for (const result of [{ ...failedResult("uppercut"), outcome: "correct" }, { ...failedResult("uppercut"), kind: "defense" }, failedResult("invalid")]) {
        assert.equal(registerAttackRisk(result), false);
        assert.equal(gameState.pendingRiskBonus, 0.5);
    }
});

test("ataque espontâneo consome uma vez; bônus posterior não altera ataque já iniciado", () => {
    registerAttackRisk(failedResult("straight"));
    assert.equal(beginSpontaneousAttack(), true);
    assert.equal(gameState.counterAttack.baseDamage, 22);
    assert.equal(gameState.pendingRiskBonus, 0);
    registerAttackRisk(failedResult("uppercut"));
    assert.equal(beginSpontaneousAttack(), false);
    assert.equal(beginCounterAttack(), false);
    assert.equal(gameState.pendingRiskBonus, 0.5);
    assert.equal(gameState.counterAttack.baseDamage, 22);
    resolve(false, false);
    assert.equal(gameState.pendingRiskBonus, 0.5);
    updateCombat(gameState.stun.remaining);
    assert.equal(beginSpontaneousAttack(), true);
    assert.equal(gameState.counterAttack.baseDamage, 30);
    assert.equal(gameState.pendingRiskBonus, 0);
    resolve(true, true);
    assert.equal(beginSpontaneousAttack(), true);
    assert.equal(gameState.counterAttack.baseDamage, 20);
    assert.equal(gameState.counterAttack.riskBonus, 0);
});

test("erro natural preserva precisão de 80%, causa zero e consome risco definitivamente", () => {
    assert.equal(ENEMY_ACCURACY, 0.8);
    enemyAccuracyDebug.forceOutcome = "miss";
    fail("uppercut"); updateCombat(0.9);
    assert.equal(gameState.counterAttack.baseDamage, 30);
    assert.equal(gameState.counterAttack.naturalMiss, true);
    const result = resolve(false, false);
    assert.equal(result.damage, 0);
    assert.equal(result.defenseDamage, 30);
    assert.equal(result.damageApplied, 0);
    assert.equal(gameState.playerHealth, 100);
    assert.equal(gameState.pendingRiskBonus, 0);
    assert.equal(beginSpontaneousAttack(), true);
    assert.equal(gameState.counterAttack.riskBonus, 0);
    assert.equal(gameState.counterAttack.baseDamage, 20);
});

test("consumo do risco não altera turnos nem permite ataques durante cooldown ou QTE", () => {
    fail("hook");
    const turns = { ...gameState.punches.cooldowns };
    for (let i = 0; i < 10; i++) assert.equal(requestPunch("left"), false);
    updateCombat(0.9); resolve(true, false);
    assert.deepEqual(gameState.punches.cooldowns, turns);
    assert.equal(gameState.punches.cooldowns.jab, 0);
    assert.equal(gameState.punches.cooldowns.hook, PUNCH_TYPES.hook.cooldownActions);
    assert.equal(requestPunch("right"), false);
    updateCombat(2);
    gameState.offensiveAI.remaining = 1000000;
    assert.equal(requestPunch("right"), true); // Jab selecionado por fail().
    assert.equal(gameState.punches.cooldowns.hook, 2);
    assert.equal(gameState.pendingRiskBonus, 0);
});

test("vitória, derrota e reinício limpam risco pendente e o bônus do ataque", () => {
    for (const target of ["player", "enemy"]) {
        reset(); registerAttackRisk(failedResult("uppercut"));
        beginSpontaneousAttack(); registerAttackRisk(failedResult("hook"));
        applyImpactDamage(target, 100, `finish-${target}`);
        assert.equal(gameState.pendingRiskBonus, 0);
        assert.equal(gameState.counterAttack.riskBonus, 0);
        assert.equal(gameState.counterAttack.baseDamage, null);
        assert.equal(registerAttackRisk(failedResult("uppercut")), false);
        assert.equal(beginSpontaneousAttack(), false);
        updateCombat(100);
        restartFight();
        assert.equal(gameState.pendingRiskBonus, 0);
        assert.equal(gameState.counterAttack.riskBonus, 0);
        assert.equal(gameState.playerHealth, 100);
    }
    reset(); fail("uppercut"); restartFight();
    assert.equal(gameState.pendingRiskBonus, 0);
    assert.equal(gameState.counterAttack.baseDamage, null);
});

test("selecionar ou tentar golpe indisponível não gera risco nem avança turnos", () => {
    selectPunch("uppercut");
    assert.equal(gameState.pendingRiskBonus, 0);
    requestPunch("left");
    const q = gameState.qte.question;
    submitAttackAnswer(q.correctAnswer, q.id);
    updateCombat(0.58); updateCombat(2);
    const turns = { ...gameState.punches.cooldowns };
    assert.equal(requestPunch("left"), false);
    assert.equal(gameState.pendingRiskBonus, 0);
    assert.deepEqual(gameState.punches.cooldowns, turns);
    selectPunch("hook"); selectPunch("uppercut");
    assert.equal(gameState.pendingRiskBonus, 0);
    assert.equal(requestPunch("right"), false);
    assert.deepEqual(gameState.punches.cooldowns, turns);
});

test("contra-ataque com risco pode encerrar a luta sem dano negativo ou impacto repetido", () => {
    fail("uppercut"); updateCombat(0.9); updateCombat(0.12);
    gameState.playerHealth = 30;
    selectDefenseSide(gameState.defense.expectedSide === "left" ? "right" : "left");
    const q = gameState.qte.question;
    submitDefenseAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
    updateCombat(0.12);
    updateKnockout(gameState,KO_DURATION); assert.equal(gameState.phase,"defeat");
    assert.equal(gameState.playerHealth, 0);
    assert.equal(gameState.defense.lastResult.damageApplied, 30);
    assert.equal(gameState.pendingRiskBonus, 0);
    assert.equal(gameState.counterAttack.riskBonus, 0);
    registerDefenseImpact(gameState.counterAttack.lastImpact);
    updateCombat(100);
    assert.equal(gameState.playerHealth, 0);
    assert.equal(requestPunch("left"), false);
});

