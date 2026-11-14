import assert from "node:assert/strict";
import { test, beforeEach, afterEach, mock } from "node:test";
import { gameState } from "../js/gameState.js";
import { restartFight } from "../js/restart.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { beginSpontaneousAttack } from "../js/counterAttack.js";
import { selectDefenseSide, submitDefenseAnswer } from './helpers/defenseApi.mjs';
import { beginCounterRushCutscene, beginCounterRushWindow, COUNTER_RUSH_CUTSCENE_TIME } from "../js/counterRush.js";
import { counterRushCinematicFrame } from "../js/counterRushCutscene.js";
import { counterRushEffectsConfig } from "../js/counterRushEffects.js";
import { setDebugEnabled, armPerfectDefense, readDebugSnapshot } from "../js/debug.js";
import { enemyAccuracyDebug } from "../js/enemyAccuracy.js";
import { selectPunch } from "../js/punches.js";
import { applyImpactDamage } from "../js/match.js";

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
beforeEach(() => {
    setDebugEnabled(false); restartFight(); gameState.offensiveAI.remaining = 1000000;
    Object.assign(counterRushEffectsConfig, { flashEnabled: true, flashDuration: 0.12, flashOpacity: 0.6 });
    mock.method(Math, "random", () => 0.99);
});
afterEach(() => { setDebugEnabled(false); mock.restoreAll(); counterRushEffectsConfig.flashEnabled = true; });

function defend(correct = true) {
    assert.equal(beginSpontaneousAttack(), true);
    updateCombat(0.12);
    const side = gameState.defense.expectedSide;
    selectDefenseSide(correct ? side : side === "left" ? "right" : "left");
    const q = gameState.qte.question;
    submitDefenseAnswer(correct ? q.correctAnswer : q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
    updateCombat(0.12);
    assert.equal(gameState.playerCombat.state, "counter_wait");
    updateCombat(0.31);
}

test("defesa perfeita inicia 3 s de cutscene, depois flash completo e só então janela de 2,5 s", () => {
    assert.equal(COUNTER_RUSH_CUTSCENE_TIME, 3);
    defend();
    assert.equal(gameState.playerCombat.state, "counter_rush_cutscene");
    assert.equal(gameState.counterRush.cutsceneRemaining, 3);
    assert.equal(gameState.counterRush.remaining, 0);
    assert.equal(gameState.counterRush.flashRemaining, 0);
    assert.equal(beginCounterRushWindow(), false);
    assert.equal(beginCounterRushCutscene(), false);
    updateCombat(2.999);
    assert.equal(gameState.playerCombat.state, "counter_rush_cutscene");
    assert.equal(gameState.counterRush.remaining, 0);
    assert.equal(gameState.qte.question, null);
    updateCombat(0.001);
    assert.equal(gameState.playerCombat.state, "counter_rush_flash");
    near(gameState.counterRush.flashRemaining, 0.12);
    assert.equal(gameState.counterRush.remaining, 0);
    assert.equal(requestPunch("left"), false);
    updateCombat(0.119);
    assert.equal(gameState.playerCombat.state, "counter_rush_flash");
    updateCombat(0.001);
    assert.equal(gameState.playerCombat.state, "counter_rush_window");
    near(gameState.counterRush.remaining, 2.5);
    selectPunch("jab"); requestPunch("right");
    assert.equal(gameState.qte.remaining, 5);
    const q = gameState.qte.question;
    submitAttackAnswer(q.correctAnswer, q.id); updateCombat(0.11);
    assert.equal(gameState.enemyHealth, 92.5);
});

test("debug força a defesa pelo mesmo caminho e mostra estado, relógio e próxima janela", () => {
    setDebugEnabled(true); armPerfectDefense(); enemyAccuracyDebug.forceOutcome = "miss";
    defend(false);
    assert.equal(gameState.playerHealth, 98);
    assert.equal(gameState.playerCombat.state, "counter_rush_cutscene");
    assert.equal(readDebugSnapshot().cutscene, "COUNTER_RUSH_CUTSCENE");
    assert.equal(readDebugSnapshot().cutsceneTime, "3 s");
    assert.equal(readDebugSnapshot().cutsceneNext, "COUNTER_RUSH_WINDOW");
    updateCombat(1);
    assert.equal(readDebugSnapshot().cutsceneTime, "2 s");
    setDebugEnabled(false); updateCombat(1.999);
    assert.equal(gameState.playerCombat.state, "counter_rush_cutscene");
    updateCombat(0.001);
    assert.equal(gameState.playerCombat.state, "counter_rush_flash");
    assert.equal(gameState.counterRush.remaining, 0);
});

test("zoom e enquadramento evoluem nos três momentos, sem modificar o estado do jogo", () => {
    defend(); const zooms = [], preparation = [];
    for (const step of [0.5, 1, 1]) {
        updateCombat(step);
        const before = JSON.stringify(gameState);
        const frame = counterRushCinematicFrame(gameState);
        zooms.push(frame.zoom); preparation.push(frame.preparation);
        assert.ok(frame.shade > 0);
        assert.ok(frame.bars > 0);
        assert.equal(JSON.stringify(gameState), before);
    }
    assert.ok(zooms[0] > 1 && zooms[1] > zooms[0] && zooms[2] > zooms[1]);
    assert.deepEqual(preparation, [0, 0.5, 1]);
    updateCombat(0.5);
    assert.equal(counterRushCinematicFrame(gameState), null);
});

test("cutscene e flash bloqueiam ataques, QTEs, dano e turnos, mas preservam a seleção", () => {
    selectPunch("uppercut"); requestPunch("left");
    const first = gameState.qte.question;
    submitAttackAnswer(first.correctAnswer, first.id); updateCombat(0.58);
    defend();
    const before = { hp: [gameState.playerHealth, gameState.enemyHealth], turns: { ...gameState.punches.cooldowns }, sequence: gameState.qte.sequence };
    assert.equal(before.turns.uppercut, 5);
    for (let i = 0; i < 30; i++) {
        assert.equal(requestPunch("left"), false);
        assert.equal(requestPunch("right"), false);
        assert.equal(beginSpontaneousAttack(), false);
        updateCombat(0.1);
        assert.equal(gameState.qte.question, null);
        assert.deepEqual(gameState.punches.cooldowns, before.turns);
        assert.deepEqual([gameState.playerHealth, gameState.enemyHealth], before.hp);
    }
    assert.equal(gameState.playerCombat.state, "counter_rush_flash");
    assert.equal(gameState.qte.sequence, before.sequence);
    assert.equal(gameState.punches.selected, "uppercut");
    near(gameState.counterRush.flashRemaining, 0.12);
});

test("duração de 3 s independe de 30/60/144 FPS; quadros lentos repartem o tempo sem pular contadores", () => {
    for (const fps of [30,60,144]) {
        restartFight(); gameState.offensiveAI.remaining = 1000000; defend();
        for (let frame = 0; frame < fps * 3; frame++) updateCombat(1 / fps);
        assert.equal(gameState.playerCombat.state, "counter_rush_flash");
        near(gameState.counterRush.flashRemaining, 0.12);
        assert.equal(gameState.counterRush.remaining, 0);
        updateCombat(0.12);
        near(gameState.counterRush.remaining, 2.5);
    }
    restartFight(); gameState.offensiveAI.remaining = 1000000; defend(); updateCombat(4);
    assert.equal(gameState.playerCombat.state, "counter_rush_window");
    near(gameState.counterRush.remaining, 1.62); // 4 - 3 - 0,12 = 0,88 s da janela.
});

test("pausa congela a cutscene; reinício e encerramento cancelam a introdução", () => {
    defend(); updateCombat(1.5);
    gameState.phase = "paused"; updateCombat(100);
    assert.equal(gameState.counterRush.cutsceneRemaining, 1.5);
    gameState.phase = "idle"; restartFight();
    assert.equal(gameState.counterRush.cutsceneRemaining, 0);
    assert.equal(counterRushCinematicFrame(gameState), null);
    for (const target of ["player", "enemy"]) {
        restartFight(); gameState.offensiveAI.remaining = 1000000; defend();
        applyImpactDamage(target, 100, `end-${target}`); updateCombat(100);
        assert.equal(gameState.counterRush.cutsceneRemaining, 0);
        assert.equal(gameState.counterRush.flashRemaining, 0);
        assert.equal(gameState.counterRush.remaining, 0);
        assert.equal(gameState.qte.question, null);
        assert.equal(counterRushCinematicFrame(gameState), null);
    }
});

test("desativar flash por acessibilidade mantém os 3 segundos completos da cutscene", () => {
    counterRushEffectsConfig.flashEnabled = false; defend(); updateCombat(2.999);
    assert.equal(gameState.playerCombat.state, "counter_rush_cutscene");
    updateCombat(0.001);
    assert.equal(gameState.playerCombat.state, "counter_rush_window");
    near(gameState.counterRush.remaining, 2.5);
    assert.equal(gameState.counterRush.flashRemaining, 0);
});
