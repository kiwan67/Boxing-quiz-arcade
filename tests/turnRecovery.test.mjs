import assert from "node:assert/strict";
import { test, beforeEach, mock } from "node:test";
import { restartFight } from "../js/restart.js";
import { gameState } from "../js/gameState.js";
import { selectPunch, isPunchReady, onPunchCooldownChange } from "../js/punches.js";
import { PUNCH_TYPES } from "../js/punchTypes.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { beginSpontaneousAttack } from "../js/counterAttack.js";
import { selectDefenseSide, submitDefenseAnswer } from './helpers/defenseApi.mjs';
import { enemyAccuracyDebug } from "../js/enemyAccuracy.js";

mock.method(Math, "random", () => 0.99);
beforeEach(() => { restartFight(); gameState.offensiveAI.remaining = 1000000; enemyAccuracyDebug.forceOutcome = null; });
const counts = () => ({ ...gameState.punches.cooldowns });

function begin(type, arm = "left") {
    selectPunch(type);
    assert.equal(requestPunch(arm), true);
    return gameState.qte.question;
}

function finish() {
    if (gameState.playerCombat.state === "attack_qte") {
        const q = gameState.qte.question;
        assert.equal(submitAttackAnswer(q.correctAnswer, q.id), true);
    }
    // Usa atualizações reais: não limpa nem modifica recargas para avançar o teste.
    for (let frame = 0; frame < 800 && gameState.playerCombat.state !== "action_cooldown"; frame++) updateCombat(0.01);
    assert.equal(gameState.playerCombat.state, "action_cooldown");
    assert.ok(Math.abs(gameState.playerCooldown.remaining - 2) < 1e-8);
    const before = counts();
    assert.equal(requestPunch("left"), false);
    assert.equal(requestPunch("right"), false);
    assert.deepEqual(counts(), before);
    updateCombat(2);
    assert.equal(gameState.playerCombat.state, "idle");
    assert.deepEqual(counts(), before);
    gameState.offensiveAI.remaining = 1000000;
}

function defend() {
    selectDefenseSide(gameState.defense.expectedSide);
    const q = gameState.qte.question;
    submitDefenseAnswer(q.correctAnswer, q.id);
    finish();
}

test("A: oito Jabs seguidos, alternando braços, respeitam somente cooldown geral", () => {
    for (let i = 0; i < 8; i++) {
        begin("jab", i % 2 ? "right" : "left");
        assert.equal(gameState.punches.cooldowns.jab, 0);
        assert.equal(isPunchReady("jab"), true);
        finish();
        assert.equal(gameState.punches.cooldowns.jab, 0);
    }
    assert.equal(gameState.enemyHealth, 60);
});

test("B/C/D: Uppercut, Direto e Gancho recuperam após exatamente 5, 2 e 3 Jabs", () => {
    for (const type of ["uppercut", "straight", "hook"]) {
        restartFight(); gameState.offensiveAI.remaining = 1000000;
        const turns = PUNCH_TYPES[type].cooldownActions;
        begin(type); finish();
        const sequence = [gameState.punches.cooldowns[type]];
        for (let i = 1; i <= turns; i++) {
            selectPunch(type);
            assert.equal(requestPunch("left"), false);
            assert.equal(gameState.punches.cooldowns[type], turns - i + 1);
            begin("jab");
            sequence.push(gameState.punches.cooldowns[type]);
            assert.equal(gameState.punches.cooldowns.jab, 0);
            const once = counts();
            for (let click = 0; click < 10; click++) {
                assert.equal(requestPunch("left"), false);
                assert.equal(requestPunch("right"), false);
            }
            assert.deepEqual(counts(), once);
            if (i === turns) selectPunch(type); // Selecionado antes da resolução do último Jab.
            finish();
            assert.equal(gameState.punches.cooldowns[type], turns - i);
        }
        assert.deepEqual(sequence, Array.from({ length: turns + 1 }, (_, i) => turns - i));
        assert.equal(gameState.punches.selected, type);
        assert.equal(isPunchReady(type), true);
        assert.equal(requestPunch("right"), true); // Sem trocar novamente a seleção.
        assert.equal(gameState.qte.pendingPunchType, type);
    }
});

test("F: espera, seleção, tentativa indisponível e cliques no QTE não avançam turnos", () => {
    begin("uppercut"); finish();
    const before = counts();
    updateCombat(20);
    assert.deepEqual(counts(), before);
    selectPunch("hook"); selectPunch("uppercut");
    for (let i = 0; i < 20; i++) assert.equal(requestPunch(i % 2 ? "left" : "right"), false);
    assert.deepEqual(counts(), before);
    begin("jab");
    const once = counts();
    assert.equal(gameState.punches.cooldowns.uppercut, 4);
    updateCombat(5);
    assert.equal(requestPunch("left"), false);
    assert.deepEqual(counts(), once);
});

test("G: erro ou timeout de um Jab reduz outras recargas uma única vez, antes do QTE", () => {
    for (const timeout of [false, true]) {
        restartFight(); gameState.offensiveAI.remaining = 1000000;
        begin("uppercut"); finish();
        const q = begin("jab");
        assert.equal(gameState.punches.cooldowns.uppercut, 4);
        if (timeout) updateCombat(10);
        else submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
        assert.equal(gameState.punches.cooldowns.uppercut, 4);
        updateCombat(0.9);
        assert.equal(gameState.defense.remaining, 3);
        const once = counts();
        defend();
        assert.deepEqual(counts(), once);
        assert.equal(gameState.punches.cooldowns.jab, 0);
    }
});

test("H/I: ataque normal ou erro natural do bot não avança turnos; reinício zera tudo", () => {
    for (const outcome of ["normal", "miss"]) {
        restartFight(); gameState.offensiveAI.remaining = 1000000;
        begin("uppercut"); finish();
        const before = counts();
        enemyAccuracyDebug.forceOutcome = outcome;
        assert.equal(beginSpontaneousAttack(), true);
        enemyAccuracyDebug.forceOutcome = null;
        defend();
        assert.deepEqual(counts(), before);
        assert.equal(gameState.playerHealth, outcome === "miss" ? 100 : 98);
        restartFight();
        assert.deepEqual(counts(), { jab: 0, straight: 0, hook: 0, uppercut: 0 });
        assert.equal(gameState.punches.selected, "straight");
        assert.equal(gameState.playerCooldown.remaining, 0);
        assert.equal(requestPunch("left"), true);
    }
});

test("turnos e notificação da interface ocorrem uma única vez por tentativa aceita", () => {
    let changes = 0;
    const unsubscribe = onPunchCooldownChange(() => {
        changes++;
        assert.equal(gameState.playerCombat.state, "attack_qte");
        assert.equal(requestPunch("right"), false); // Reentrada não consome outra ação.
    });
    try {
        const q = begin("uppercut");
        assert.equal(changes, 1);
        submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
        assert.equal(changes, 1);
        updateCombat(0.9); defend();
        assert.equal(changes, 1);
        assert.equal(requestPunch("right"), false); // Uppercut ainda em recarga.
        assert.equal(changes, 1);
        begin("jab");
        assert.equal(changes, 2);
        assert.equal(gameState.punches.cooldowns.uppercut, 4);
        finish();
        assert.equal(changes, 2);
    } finally { unsubscribe(); }
});
