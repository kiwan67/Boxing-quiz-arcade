import assert from "node:assert/strict";
import { test, beforeEach, afterEach, mock } from "node:test";
import { restartFight } from "../js/restart.js";
import { gameState } from "../js/gameState.js";
import { beginSpontaneousAttack } from "../js/counterAttack.js";
import { selectDefenseSide, submitDefenseAnswer } from './helpers/defenseApi.mjs';
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { beginCounterRushWindow } from "../js/counterRush.js";
import { selectPunch } from "../js/punches.js";
import { applyImpactDamage } from "../js/match.js";
import { counterRushEffectsConfig, initializeCounterRushEffects, syncCounterRushEffects, drawCounterRushFlash } from "../js/counterRushEffects.js";
import { drawCounterRush } from "../js/counterRushView.js";

let target, draws, ctx, writes;
beforeEach(() => {
    restartFight(); gameState.offensiveAI.remaining = 1000000;
    Object.assign(counterRushEffectsConfig, { flashEnabled: true, flashDuration: 0.12, flashOpacity: 0.6 });
    mock.method(Math, "random", () => 0.99);
    writes = 0;
    let filter = "";
    target = { style: { get filter() { return filter; }, set filter(value) { filter = value; writes++; } } };
    initializeCounterRushEffects(target);
    draws = [];
    const stack = [];
    ctx = { globalAlpha: 1, fillStyle: "", save() { stack.push([this.globalAlpha, this.fillStyle]); },
        restore() { [this.globalAlpha, this.fillStyle] = stack.pop(); },
        fillRect(x, y, w, h) { draws.push({ color: this.fillStyle, alpha: this.globalAlpha, x, y, w, h }); } };
});
afterEach(() => { mock.restoreAll(); restartFight(); Object.assign(counterRushEffectsConfig, { flashEnabled: true, flashDuration: 0.12, flashOpacity: 0.6 }); });

function window() {
    assert.equal(beginSpontaneousAttack(), true);
    selectDefenseSide(gameState.defense.expectedSide);
    const q = gameState.qte.question;
    submitDefenseAnswer(q.correctAnswer, q.id);
    updateCombat(0.55);
    assert.equal(gameState.playerCombat.state, "counter_rush_cutscene");
    updateCombat(3);
    assert.ok(["counter_rush_flash", "counter_rush_window"].includes(gameState.playerCombat.state));
}
function special() {
    selectPunch("jab"); assert.equal(requestPunch("left"), true);
    return gameState.qte.question;
}

test("flash branco único dura 120 ms, desvanece e então ativa grayscale sem acumular filtros", () => {
    window();
    assert.equal(gameState.counterRush.flashRemaining, 0.12);
    assert.equal(target.style.filter, "");
    drawCounterRushFlash(ctx, 640, 360);
    assert.deepEqual(draws.find(d => d.color === "#ffffff"), { color: "#ffffff", alpha: 0.6, x: 0, y: 0, w: 640, h: 360 });
    assert.equal(ctx.globalAlpha, 1);
    updateCombat(0.06); draws.length = 0; drawCounterRushFlash(ctx, 640, 360);
    assert.ok(Math.abs(draws.find(d => d.color === "#ffffff").alpha - 0.3) < 1e-12);
    updateCombat(0.06);
    assert.equal(gameState.counterRush.flashRemaining, 0);
    assert.equal(target.style.filter, "grayscale(1)");
    const prior = writes;
    for (let frame = 0; frame < 1000; frame++) syncCounterRushEffects();
    assert.equal(writes, prior); // Sem atribuições CSS por frame quando nada muda.
    assert.equal(beginCounterRushWindow(), false);
    special();
    assert.equal(gameState.counterRush.flashRemaining, 0); // Abrir QTE não dispara outro flash.
    assert.equal(gameState.qte.remaining, 5);
    draws.length = 0; drawCounterRushFlash(ctx, 640, 360);
    assert.equal(draws.length, 0);
});

test("flash pode ser reduzido ou desativado, mantendo indicador textual e monocromático", () => {
    counterRushEffectsConfig.flashOpacity = 0.15;
    window(); drawCounterRushFlash(ctx, 640, 360);
    assert.equal(draws.find(d => d.color === "#ffffff").alpha, 0.15);
    counterRushEffectsConfig.flashEnabled = false;
    syncCounterRushEffects();
    updateCombat(0);
    assert.equal(target.style.filter, "grayscale(1)");
    draws.length = 0; drawCounterRushFlash(ctx, 640, 360);
    assert.equal(draws.length, 0);
    drawCounterRush(ctx, gameState);
    assert.ok(draws.length > 10); // Janela e texto continuam desenhados.
    restartFight(); gameState.offensiveAI.remaining = 1000000;
    window();
    assert.equal(gameState.counterRush.flashRemaining, 0);
    assert.equal(target.style.filter, "grayscale(1)");
});

test("monocromático persiste no QTE e resolução e é removido em cada encerramento", () => {
    for (const outcome of ["window_timeout", "wrong", "qte_timeout", "success", "victory", "defeat", "restart"]) {
        restartFight(); gameState.offensiveAI.remaining = 1000000;
        window(); updateCombat(0.12);
        assert.equal(target.style.filter, "grayscale(1)");
        if (outcome === "window_timeout") updateCombat(2.5);
        else {
            const q = special();
            assert.equal(target.style.filter, "grayscale(1)");
            if (outcome === "wrong") submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
            if (outcome === "qte_timeout") updateCombat(5);
            if (outcome === "success") {
                submitAttackAnswer(q.correctAnswer, q.id);
                updateCombat(0.11);
                assert.equal(target.style.filter, "grayscale(1)");
                updateCombat(0.29);
            }
            if (outcome === "victory" || outcome === "defeat") applyImpactDamage(outcome === "victory" ? "enemy" : "player", 100, outcome);
            if (outcome === "restart") restartFight();
        }
        assert.equal(target.style.filter, outcome === "success" ? "grayscale(1)" : "", outcome);
        assert.equal(gameState.counterRush.flashRemaining, 0);
    }
});

test("cores originais e filtros anteriores são preservados; nenhum efeito fora do especial", () => {
    for (const original of ["contrast(1.1)", "none"]) {
        restartFight(); gameState.offensiveAI.remaining = 1000000;
        const other = { style: { filter: original } };
        initializeCounterRushEffects(other);
        window(); updateCombat(0.12);
        assert.equal(other.style.filter, original === "none" ? "grayscale(1)" : "contrast(1.1) grayscale(1)");
        restartFight();
        assert.equal(other.style.filter, original);
        for (const state of ["idle", "attack_qte", "defense_direction_qte", "defense_question_qte", "action_cooldown"]) {
            gameState.playerCombat.state = state; syncCounterRushEffects();
            assert.equal(other.style.filter, original);
        }
        gameState.playerCombat.state = "idle";
        gameState.opponentCombat.state = "block_left";
        gameState.autoDodge.direction = "right";
        syncCounterRushEffects();
        assert.equal(other.style.filter, original);
    }
});

test("pausa congela flash e reinício o cancela antes de deixar algum filtro ativo", () => {
    window(); gameState.phase = "paused"; updateCombat(10);
    assert.equal(gameState.counterRush.flashRemaining, 0.12);
    assert.equal(target.style.filter, "");
    gameState.phase = "idle"; updateCombat(0.12);
    assert.equal(target.style.filter, "grayscale(1)");
    gameState.phase = "paused"; updateCombat(10);
    assert.equal(target.style.filter, "grayscale(1)");
    restartFight();
    assert.equal(target.style.filter, "");
    assert.equal(gameState.counterRush.flashRemaining, 0);
});
