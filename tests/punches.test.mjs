import assert from "node:assert/strict";
import { test, beforeEach, mock } from "node:test";
import { restartFight } from "../js/restart.js";
import { gameState } from "../js/gameState.js";
import { PUNCH_TYPES, PUNCH_ORDER, DEFAULT_PUNCH } from "../js/punchTypes.js";
import { selectPunch } from "../js/punches.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { selectDefenseSide, submitDefenseAnswer } from './helpers/defenseApi.mjs';
import { applyImpactDamage, resolvePlayerImpact } from "../js/match.js";
import { updateCharacters, characters } from "../js/characters.js";
import { solveArmPose, ARM_LENGTHS } from "../js/armPose.js";
import { offensiveAIConfig } from "../js/ai.js";
import { expireCounterRushForTest } from "./helpers/fight.mjs";

beforeEach(() => { restartFight(); gameState.offensiveAI.remaining = 1000000; });
mock.method(Math, "random", () => 0.99);

function attempt(type, arm = "left") {
    assert.equal(selectPunch(type), true);
    assert.equal(requestPunch(arm), true);
    return gameState.qte.question;
}

function correct(q) { assert.equal(submitAttackAnswer(q.correctAnswer, q.id), true); }
function impactTime(type) { const t = PUNCH_TYPES[type].timing; return t.preparation + t.advance; }
function totalTime(type) { return Object.values(PUNCH_TYPES[type].timing).reduce((sum, value) => sum + value, 0); }

test("configuração central define danos, cooldowns, dificuldades e Direto inicial", () => {
    assert.equal(DEFAULT_PUNCH, "straight");
    assert.equal(gameState.punches.selected, "straight");
    assert.deepEqual(PUNCH_ORDER.map(type => [PUNCH_TYPES[type].damage, PUNCH_TYPES[type].cooldownActions, PUNCH_TYPES[type].difficulty]),
        [[5,0,"easy"],[10,2,"normal"],[15,3,"hard"],[25,5,"very_hard"]]);
    for (const type of PUNCH_ORDER) {
        assert.equal(selectPunch(type), true);
        assert.equal(gameState.punches.selected, type);
        assert.equal(gameState.punches.cooldowns[type], 0);
    }
    assert.equal(selectPunch("invalid"), false);
});

test("cada golpe e braço aplica seu dano no impacto, sem duplicação ou inversão", () => {
    for (const type of PUNCH_ORDER) for (const arm of ["left", "right"]) {
        restartFight(); gameState.offensiveAI.remaining = 1000000;
        const q = attempt(type, arm);
        assert.equal(gameState.qte.pendingPunchType, type);
        assert.equal(q.difficulty, PUNCH_TYPES[type].difficulty);
        assert.equal(q.timeLimit, 10);
        assert.ok(q.statement.length > 0);
        correct(q);
        assert.equal(gameState.playerCombat.punchType, type);
        updateCombat(impactTime(type) - 0.001);
        assert.equal(gameState.enemyHealth, 100);
        updateCombat(0.001); updateCharacters(0);
        assert.equal(gameState.enemyHealth, 100 - PUNCH_TYPES[type].damage);
        assert.equal(gameState.lastAttackResult.punchType, type);
        assert.equal(gameState.lastAttackResult.damageApplied, PUNCH_TYPES[type].damage);
        assert.equal(characters.player.punchType, type);
        assert.ok(arm === "left" ? characters.player.leftArmPose.wristX < 40 : characters.player.rightArmPose.wristX > 40);
        assert.equal(characters.player[arm === "left" ? "rightPunchExtension" : "leftPunchExtension"], 0);
        assert.equal(resolvePlayerImpact(), false);
        updateCombat(totalTime(type) - impactTime(type));
        assert.equal(gameState.enemyHealth, 100 - PUNCH_TYPES[type].damage);
        assert.equal(gameState.playerCombat.state, "action_cooldown");
        assert.ok(Math.abs(gameState.playerCooldown.remaining - 2) < 1e-9);
    }
});

test("tipo e braço ficam registrados, mesmo alterando a seleção durante o QTE", () => {
    const q = attempt("uppercut", "right");
    selectPunch("jab");
    assert.equal(gameState.punches.selected, "jab");
    assert.equal(gameState.punches.cooldowns.jab, 0);
    assert.equal(gameState.qte.pendingPunchType, "uppercut");
    assert.equal(q.difficulty, "very_hard");
    correct(q); updateCombat(impactTime("uppercut"));
    assert.equal(gameState.playerCombat.arm, "right");
    assert.equal(gameState.lastAttackResult.punchType, "uppercut");
    assert.equal(gameState.enemyHealth, 75);
});

test("Jab sem recarga; recargas de 2, 3 e 5 ações não diminuem por espera", () => {
    for (const type of PUNCH_ORDER) {
        restartFight(); gameState.offensiveAI.remaining = 1000000;
        const q = attempt(type);
        const duration = PUNCH_TYPES[type].cooldownActions;
        assert.equal(gameState.punches.cooldowns[type], duration);
        const sequence = gameState.qte.sequence;
        for (let i = 0; i < 20; i++) assert.equal(requestPunch("right"), false);
        assert.equal(gameState.punches.cooldowns[type], duration);
        assert.equal(gameState.qte.sequence, sequence);
        correct(q);
        updateCombat(totalTime(type));
        assert.equal(gameState.punches.cooldowns[type], duration);
        updateCombat(2);
        assert.equal(gameState.playerCombat.state, "idle");
        const frozen = { ...gameState.punches.cooldowns };
        if (duration > 0) assert.equal(requestPunch("left"), false);
        updateCombat(20);
        assert.deepEqual(gameState.punches.cooldowns, frozen);
        assert.equal(requestPunch("right"), duration === 0);
        assert.equal(gameState.punches.cooldowns[type], duration);
    }
    restartFight(); gameState.offensiveAI.remaining = 1000000;
    const q = attempt("uppercut"); correct(q); updateCombat(totalTime("uppercut")); updateCombat(2);
    assert.ok(gameState.punches.cooldowns.uppercut > 0);
    assert.equal(selectPunch("jab"), true);
    assert.equal(requestPunch("right"), true);
    assert.equal(gameState.punches.cooldowns.jab, 0);
    assert.equal(gameState.punches.cooldowns.uppercut, 4);
});

test("cinco tentativas com outros golpes liberam Uppercut, incluindo uma resposta errada", () => {
    correct(attempt("uppercut")); updateCombat(totalTime("uppercut")); updateCombat(2);
    const chain = ["jab", "straight", "jab", "hook", "jab"];
    for (const [index, type] of chain.entries()) {
        const q = attempt(type, index % 2 ? "right" : "left");
        assert.equal(gameState.punches.cooldowns.uppercut, 4 - index);
        if (index === 0) {
            submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
            updateCombat(0.9);
            selectDefenseSide(gameState.defense.expectedSide);
            const defense = gameState.qte.question;
            submitDefenseAnswer(defense.correctAnswer, defense.id);
            for (let frame = 0; frame < 80; frame++) updateCombat(0.01);
            expireCounterRushForTest();
            gameState.offensiveAI.remaining = 1000000;
        } else {
            correct(q); updateCombat(totalTime(type));
        }
        updateCombat(2.001); // Margem para arredondamento das fases geométricas.
        assert.equal(gameState.playerCombat.state, "idle");
        assert.equal(gameState.punches.cooldowns.uppercut, 4 - index);
    }
    assert.equal(gameState.punches.cooldowns.jab, 0);
    assert.equal(selectPunch("uppercut"), true);
    assert.equal(requestPunch("right"), true);
    assert.equal(gameState.punches.cooldowns.uppercut, 5);
});

test("sequência Uppercut, Gancho e Direto sempre permite recuperar usando Jab", () => {
    for (const type of ["uppercut", "hook", "straight", "jab"]) {
        correct(attempt(type)); updateCombat(totalTime(type)); updateCombat(2);
    }
    const frozen = { jab: 0, straight: 1, hook: 1, uppercut: 2 };
    assert.deepEqual(gameState.punches.cooldowns, frozen);
    for (const type of PUNCH_ORDER.filter(type => type !== "jab")) {
        selectPunch(type);
        assert.equal(requestPunch("left"), false);
    }
    updateCombat(20);
    assert.deepEqual(gameState.punches.cooldowns, frozen);
    correct(attempt("jab"));
    assert.deepEqual(gameState.punches.cooldowns, { jab: 0, straight: 0, hook: 0, uppercut: 1 });
    restartFight();
    assert.deepEqual(gameState.punches.cooldowns, { jab: 0, straight: 0, hook: 0, uppercut: 0 });
    assert.equal(gameState.punches.selected, "straight");
});

test("tentativas impedidas, seleção, pausa e fim não consomem recargas", () => {
    assert.equal(requestPunch("invalid"), false);
    for (const type of PUNCH_ORDER) assert.equal(gameState.punches.cooldowns[type], 0);
    const q = attempt("straight");
    selectPunch("hook");
    assert.equal(requestPunch("right"), false);
    assert.equal(gameState.punches.cooldowns.hook, 0);
    correct(q); updateCombat(totalTime("straight"));
    assert.equal(requestPunch("left"), false);
    assert.equal(gameState.punches.cooldowns.hook, 0);
    gameState.phase = "paused"; updateCombat(100);
    assert.equal(selectPunch("jab"), false);
    assert.ok(gameState.punches.cooldowns.straight > 0);
    gameState.phase = "idle";
    applyImpactDamage("enemy", 100, "finish");
    const frozen = { ...gameState.punches.cooldowns };
    updateCombat(100);
    assert.deepEqual(gameState.punches.cooldowns, frozen);
    assert.equal(requestPunch("left"), false);
    assert.equal(selectPunch("jab"), false);
});

test("erro e timeout consomem a ação; tempo, defesa e QTEs não reduzem recargas", () => {
    const q = attempt("uppercut");
    updateCombat(0.2);
    submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
    assert.equal(gameState.punches.cooldowns.uppercut, 5);
    updateCombat(0.9);
    assert.equal(gameState.defense.remaining, 3);
    const before = gameState.punches.cooldowns.uppercut;
    selectDefenseSide(gameState.defense.expectedSide);
    assert.equal(gameState.qte.remaining, 10);
    const defense = gameState.qte.question;
    updateCombat(1);
    assert.equal(gameState.punches.cooldowns.uppercut, before);
    submitDefenseAnswer(defense.alternatives.find(answer => answer !== defense.correctAnswer), defense.id);
    assert.equal(gameState.defense.result.baseDamage, 30);
    assert.equal(gameState.defense.result.damage, 7.5);
    updateCombat(0.43);
    assert.equal(gameState.playerHealth, 92.5);
    assert.equal(gameState.enemyHealth, 100);
    restartFight(); gameState.offensiveAI.remaining = 1000000;
    attempt("hook"); assert.equal(gameState.punches.cooldowns.hook, 3);
    updateCombat(10);
    assert.equal(gameState.lastAttackResult.outcome, "failed_qte");
    assert.equal(gameState.lastAttackResult.punchType, "hook");
    assert.equal(gameState.punches.cooldowns.hook, 3);
    assert.equal(gameState.enemyHealth, 100);
});

test("esquiva preserva HP, consome recarga e mantém chance de 15%", () => {
    const random = mock.method(Math, "random", () => 0.149999);
    const q = attempt("uppercut"); correct(q); updateCombat(totalTime("uppercut"));
    assert.equal(gameState.lastAttackResult.outcome, "dodged");
    assert.equal(gameState.lastAttackResult.damageApplied, 0);
    assert.equal(gameState.enemyHealth, 100);
    assert.equal(gameState.punches.cooldowns.uppercut, 5);
    assert.equal(random.mock.callCount(), 2);
    random.mock.restore();
});

test("Jab rápido ainda espera a esquiva terminar antes do cooldown geral", () => {
    const random = mock.method(Math, "random", () => 0);
    const q = attempt("jab"); correct(q);
    updateCombat(0.30);
    assert.equal(gameState.playerCombat.state, "recovering");
    assert.equal(gameState.opponentCombat.state, "dodge_recovering");
    assert.equal(gameState.playerCooldown.remaining, 0);
    updateCombat(0.10);
    assert.equal(gameState.opponentCombat.state, "idle");
    assert.equal(gameState.playerCombat.state, "action_cooldown");
    assert.ok(Math.abs(gameState.playerCooldown.remaining - 2) < 1e-9);
    random.mock.restore();
});

test("recargas não impedem IA espontânea; defesa, derrota, vitória e reinício preservados", () => {
    assert.equal(offensiveAIConfig.enabled, true);
    const q = attempt("uppercut"); correct(q); updateCombat(totalTime("uppercut"));
    gameState.offensiveAI.remaining = 0;
    updateCombat(0);
    assert.equal(gameState.counterAttack.source, "spontaneous");
    assert.equal(gameState.defense.remaining, 3);
    const before = gameState.punches.cooldowns.uppercut;
    updateCombat(1);
    assert.equal(gameState.punches.cooldowns.uppercut, before);
    selectDefenseSide(gameState.defense.expectedSide);
    const spontaneousQuestion = gameState.qte.question;
    submitDefenseAnswer(spontaneousQuestion.correctAnswer, spontaneousQuestion.id);
    for (let frame = 0; frame < 300; frame++) updateCombat(0.01);
    assert.equal(gameState.punches.cooldowns.uppercut, before);
    for (const target of ["enemy", "player"]) {
        applyImpactDamage(target, 100, "finish");
        const frozen = { ...gameState.punches.cooldowns };
        updateCombat(100);
        assert.deepEqual(gameState.punches.cooldowns, frozen);
        restartFight(); gameState.offensiveAI.remaining = 1000000;
        assert.equal(gameState.punches.selected, "straight");
        for (const type of PUNCH_ORDER) assert.equal(gameState.punches.cooldowns[type], 0);
        assert.equal(gameState.playerHealth, 100);
        assert.equal(gameState.enemyHealth, 100);
        assert.equal(gameState.playerCooldown.remaining, 0);
        if (target === "enemy") {
            const q = attempt("uppercut"); correct(q); updateCombat(totalTime("uppercut"));
        }
    }
});

test("trajetórias são distintas e mantêm os comprimentos e lados de ambos os braços", () => {
    for (const side of ["left", "right"]) {
        const signatures = new Set();
        for (const type of PUNCH_ORDER) {
            const pose = {};
            const frames = [];
            for (let step = 0; step <= 100; step++) {
                solveArmPose(side, step / 100, 0, 0, 0, 0, pose, type);
                assert.ok(Math.abs(Math.hypot(pose.elbowX - pose.shoulderX, pose.elbowY - pose.shoulderY) - ARM_LENGTHS.upper) < 1e-9);
                assert.ok(Math.abs(Math.hypot(pose.wristX - pose.elbowX, pose.wristY - pose.elbowY) - ARM_LENGTHS.forearm) < 1e-9);
                assert.ok(side === "left" ? pose.wristX < 40 : pose.wristX > 40);
                frames.push([pose.gloveX, pose.gloveY]);
            }
            signatures.add(JSON.stringify(frames));
        }
        assert.equal(signatures.size, 4);
    }
});

test("contadores por ação não dependem dos frames em 30, 60 e 144 FPS", () => {
    for (const type of PUNCH_ORDER) for (const fps of [30, 60, 144]) {
        restartFight(); gameState.offensiveAI.remaining = 1000000;
        attempt(type);
        const frames = fps * 2;
        for (let frame = 0; frame < frames - 1; frame++) updateCombat(1 / fps);
        assert.equal(gameState.punches.cooldowns[type], PUNCH_TYPES[type].cooldownActions);
        updateCombat(1 / fps);
        assert.equal(gameState.punches.cooldowns[type], PUNCH_TYPES[type].cooldownActions);
    }
});
