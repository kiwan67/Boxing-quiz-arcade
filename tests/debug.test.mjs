import assert from "node:assert/strict";
import { test, beforeEach, afterEach, mock } from "node:test";
import { debugState, setDebugEnabled, armPerfectDefense, setRushDebugOutcome, readDebugSnapshot } from "../js/debug.js";
import { gameState } from "../js/gameState.js";
import { restartFight } from "../js/restart.js";
import { beginSpontaneousAttack } from "../js/counterAttack.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { selectDefenseSide, submitDefenseAnswer, registerDefenseImpact } from './helpers/defenseApi.mjs';
import { selectPunch } from "../js/punches.js";
import { applyImpactDamage } from "../js/match.js";
import { enemyAccuracyDebug, ENEMY_ACCURACY, ENEMY_MISS_CHANCE } from "../js/enemyAccuracy.js";
import { BLOCK_CHANCES, DODGE_CHANCES } from "../js/enemyDefense.js";
import { DEBUG_QTE } from "../js/questions.js";
import { finishCounterRushIntroForTest } from "./helpers/fight.mjs";

const reset = () => { restartFight(); gameState.offensiveAI.remaining = 1000000; };
beforeEach(() => { setDebugEnabled(false); reset(); mock.method(Math, "random", () => 0.99); });
afterEach(() => { setDebugEnabled(false); mock.restoreAll(); });
function incoming(miss = false) {
    if (gameState.stun.remaining > 0) updateCombat(gameState.stun.remaining);
    const rolls = [0.99, miss ? 0.01 : 0.99];
    const random = mock.method(Math, "random", () => rolls.shift() ?? 0.99);
    assert.equal(beginSpontaneousAttack(), true);
    random.mock.restore();
}
function answerDefense(correct = true) {
    const side = gameState.defense.expectedSide;
    selectDefenseSide(correct ? side : side === "left" ? "right" : "left");
    const q = gameState.qte.question;
    submitDefenseAnswer(correct ? q.correctAnswer : q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
}
function window() {
    incoming(); answerDefense(); updateCombat(0.55);
    finishCounterRushIntroForTest();
    assert.equal(gameState.playerCombat.state, "counter_rush_window");
}
function rush(type = "uppercut") {
    selectPunch(type); assert.equal(requestPunch("left"), true);
    return gameState.qte.question;
}

test("debug inicia desativado e não permite armar substituições ou revelar informações", () => {
    assert.equal(debugState.enabled, false);
    assert.equal(DEBUG_QTE, false);
    assert.equal(readDebugSnapshot(), null);
    assert.equal(armPerfectDefense(), false);
    assert.equal(setRushDebugOutcome("hit"), false);
    incoming(); answerDefense(false); updateCombat(0.55);
    assert.equal(gameState.playerHealth, 80);
    assert.equal(gameState.defense.lastResult.debugOverride, undefined);
});

test("revelações consultam lado visual e respostas reais sem sortear ou responder", () => {
    setDebugEnabled(true); debugState.showAttackSide = true; debugState.showAnswers = true;
    assert.equal(readDebugSnapshot().attackSide, "AGUARDANDO ATAQUE");
    for (const [roll, expected] of [[0.1, "DIREITA"], [0.9, "ESQUERDA"]]) {
        reset(); const rolls = [roll, 0.99];
        const random = mock.method(Math, "random", () => rolls.shift() ?? 0.99);
        beginSpontaneousAttack();
        const count = random.mock.callCount();
        assert.equal(readDebugSnapshot().attackSide, `DEFENDA: ${expected}`);
        const side = gameState.defense.expectedSide;
        selectDefenseSide(side);
        const question = gameState.qte.question;
        const before = JSON.stringify(gameState);
        for (let i = 0; i < 50; i++) assert.equal(readDebugSnapshot().answer, `QTE ATUAL: DEFENSIVO\nRESPOSTA CORRETA: ${question.correctAnswer}`);
        assert.equal(JSON.stringify(gameState), before);
        assert.equal(random.mock.callCount(), count);
        assert.equal(readDebugSnapshot().attackSide, "AGUARDANDO ATAQUE");
        random.mock.restore();
    }
    reset(); requestPunch("left");
    assert.equal(readDebugSnapshot().answer, `QTE ATUAL: OFENSIVO\nRESPOSTA CORRETA: ${gameState.qte.question.correctAnswer}`);
    reset(); window(); rush("jab");
    assert.equal(readDebugSnapshot().answer, `QTE ATUAL: COUNTER RUSH\nCOUNTER CHAIN 1×\nRESPOSTA CORRETA: ${gameState.qte.question.correctAnswer}`);
    assert.equal(readDebugSnapshot().qte.startsWith("counter_rush"), true);
});

test("defesa perfeita forçada ignora erro natural só no alvo, preserva QTEs e abre Counter Rush", () => {
    setDebugEnabled(true); assert.equal(armPerfectDefense(), true);
    incoming(true);
    assert.equal(debugState.perfectNext, false);
    assert.equal(debugState.perfectAttackId, gameState.counterAttack.questionId);
    assert.equal(gameState.counterAttack.naturalMiss, true); // Sorteio original permanece registrado.
    assert.equal(gameState.defense.remaining, 3);
    const turns = { ...gameState.punches.cooldowns };
    updateCombat(3);
    assert.equal(gameState.qte.remaining, 10);
    updateCombat(10); // Não é necessário acertar nenhuma das duas escolhas.
    assert.equal(gameState.qte.lastResult.outcome, "timeout");
    assert.equal(gameState.playerHealth, 100);
    updateCombat(0.12);
    assert.equal(gameState.playerHealth, 98);
    const result = gameState.defense.lastResult;
    assert.equal(result.debugOverride, "perfect_defense");
    assert.equal(result.defenseSideCorrect, true);
    assert.equal(result.questionCorrect, true);
    assert.equal(result.naturalMiss, false);
    assert.deepEqual(result.debugOriginalDefense, { sideCorrect: false, questionCorrect: false, naturalMiss: true });
    assert.equal(gameState.counterAttack.lastImpact.naturalMiss, false);
    assert.equal(debugState.perfectAttackId, null);
    assert.ok(debugState.lastOverride.includes("IGNORADO: SIM"));
    registerDefenseImpact(gameState.counterAttack.lastImpact);
    assert.equal(gameState.playerHealth, 98);
    updateCombat(0.31);
    assert.equal(gameState.playerCombat.state, "counter_rush_cutscene");
    assert.equal(readDebugSnapshot().cutscene, "COUNTER_RUSH_CUTSCENE");
    finishCounterRushIntroForTest();
    assert.equal(gameState.playerCombat.state, "counter_rush_window");
    assert.equal(gameState.counterRush.flashRemaining, 0);
    assert.deepEqual(gameState.punches.cooldowns, turns);
    assert.equal(ENEMY_ACCURACY, 0.8);
    assert.ok(Math.abs(ENEMY_MISS_CHANCE - 0.2) < 1e-12);
    updateCombat(2.5); updateCombat(2);
    incoming(true); answerDefense(false); updateCombat(0.55);
    assert.equal(gameState.defense.lastResult.debugOverride, undefined);
    assert.equal(gameState.defense.lastResult.naturalMiss, true);
    assert.equal(gameState.playerHealth, 98);
});

test("armar durante ataque atual aguarda o próximo ataque válido", () => {
    setDebugEnabled(true); incoming();
    armPerfectDefense();
    assert.equal(debugState.perfectAttackId, null);
    assert.equal(beginSpontaneousAttack(), false);
    answerDefense(false); updateCombat(0.55);
    assert.equal(gameState.playerHealth, 80);
    assert.equal(debugState.perfectNext, true);
    incoming(); answerDefense(false); updateCombat(0.55);
    assert.equal(gameState.playerHealth, 78);
    finishCounterRushIntroForTest();
    assert.equal(gameState.playerCombat.state, "counter_rush_window");
    assert.equal(debugState.perfectNext, false);
});

test("desativar debug cancela defesa perfeita reservada antes do impacto, sem reiniciar a luta", () => {
    setDebugEnabled(true); armPerfectDefense(); incoming(); answerDefense(false);
    const before = JSON.stringify(gameState);
    setDebugEnabled(false);
    assert.equal(JSON.stringify(gameState), before);
    assert.equal(readDebugSnapshot(), null);
    updateCombat(0.55);
    assert.equal(gameState.playerHealth, 80);
    assert.equal(gameState.defense.lastResult.debugOverride, undefined);
    assert.equal(gameState.counterRush.remaining, 0);
});

test("acerto completo e bloqueio forçados afetam somente próximo Rush correto, sem alterar probabilidades", () => {
    const normal = JSON.stringify({ BLOCK_CHANCES, DODGE_CHANCES, ENEMY_ACCURACY });
    for (const [outcome, damage] of [["hit", 37.5], ["blocked", 9.375]]) {
        reset(); setDebugEnabled(true); window(); setRushDebugOutcome(outcome);
        const q = rush(); const turns = { ...gameState.punches.cooldowns };
        const random = mock.method(Math, "random", () => { throw new Error("Resultado forçado não sorteia bloqueio"); });
        submitAttackAnswer(q.correctAnswer, q.id); random.mock.restore();
        assert.equal(debugState.rushOutcome, "normal");
        assert.equal(gameState.lastAttackResult.debugOverride, outcome);
        updateCombat(0.58);
        assert.equal(gameState.enemyHealth, 100 - damage);
        assert.deepEqual(gameState.punches.cooldowns, turns);
        assert.ok(debugState.lastOverride.includes("FORÇADO"));
        // Mesmo em modo debug ligado, a próxima tentativa usa probabilidades normais.
        if (gameState.counterChain.active) {
            updateCombat(0.22); answerDefense(false); updateCombat(0.55);
        }
        window(); const next = rush("jab");
        const roll = mock.method(Math, "random", () => outcome === "hit" ? 0 : 0.99);
        submitAttackAnswer(next.correctAnswer, next.id);
        assert.equal(gameState.lastAttackResult.outcome, outcome === "hit" ? "blocked" : "hit");
        assert.equal(gameState.lastAttackResult.debugOverride, null);
        assert.equal(roll.mock.callCount(), 1);
        roll.mock.restore();
    }
    assert.equal(JSON.stringify({ BLOCK_CHANCES, DODGE_CHANCES, ENEMY_ACCURACY }), normal);
});

test("janela expirada, QTE errado e ataque normal não consomem resultado reservado ao Rush correto", () => {
    setDebugEnabled(true); setRushDebugOutcome("blocked");
    requestPunch("left"); const normal = gameState.qte.question;
    submitAttackAnswer(normal.correctAnswer, normal.id); updateCombat(0.42);
    assert.equal(debugState.rushOutcome, "blocked");
    window(); updateCombat(2.5);
    assert.equal(debugState.rushOutcome, "blocked");
    window(); const q = rush("jab");
    submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
    assert.equal(debugState.rushOutcome, "blocked");
    window(); const correct = rush("jab");
    submitAttackAnswer(correct.correctAnswer, correct.id);
    assert.equal(debugState.rushOutcome, "normal");
    assert.equal(gameState.lastAttackResult.outcome, "blocked");
});

test("desativação, encerramento e reinício limpam substituições pendentes, incluindo debug antigo", () => {
    for (const action of ["disable", "restart", "victory", "defeat"]) {
        reset(); setDebugEnabled(true); armPerfectDefense(); setRushDebugOutcome("hit");
        enemyAccuracyDebug.forceOutcome = "miss";
        if (action === "disable") setDebugEnabled(false);
        if (action === "restart") restartFight();
        if (action === "victory" || action === "defeat") applyImpactDamage(action === "victory" ? "enemy" : "player", 100, action);
        assert.equal(debugState.perfectNext, false);
        assert.equal(debugState.perfectAttackId, null);
        assert.equal(debugState.rushOutcome, "normal");
        assert.equal(enemyAccuracyDebug.forceOutcome, null);
    }
});

test("painel distingue cutscene real de atordoamento ausente", () => {
    setDebugEnabled(true);
    const before = JSON.stringify(gameState);
    const snapshot = readDebugSnapshot();
    assert.equal(snapshot.cutscene, "INATIVA");
    assert.equal(snapshot.stunned, "NÃO");
    assert.equal(snapshot.stunTime, "0 s");
    assert.equal(snapshot.cutsceneTime, "0 s");
    assert.equal(JSON.stringify(gameState), before);
});

test("defesa perfeita de teste também funciona no contra-ataque com risco, sem alterar recargas", () => {
    setDebugEnabled(true); armPerfectDefense();
    selectPunch("uppercut"); requestPunch("right");
    const q = gameState.qte.question;
    submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
    const turns = { ...gameState.punches.cooldowns };
    assert.equal(gameState.pendingRiskBonus, 0.5);
    updateCombat(0.9);
    assert.equal(gameState.counterAttack.baseDamage, 30);
    assert.equal(debugState.perfectAttackId, gameState.counterAttack.questionId);
    answerDefense(false); updateCombat(0.55);
    assert.equal(gameState.playerHealth, 97);
    assert.equal(gameState.defense.lastResult.damage, 3);
    assert.equal(gameState.playerCombat.state, "counter_rush_cutscene");
    finishCounterRushIntroForTest();
    assert.equal(gameState.playerCombat.state, "counter_rush_window");
    assert.deepEqual(gameState.punches.cooldowns, turns);
    assert.equal(debugState.perfectAttackId, null);
});
