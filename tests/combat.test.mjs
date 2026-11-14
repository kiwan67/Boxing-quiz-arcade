import { updateKnockout, KO_DURATION } from '../js/knockout.js';
import { restartFight, finishPlayerCooldown, expectIdleAfterCooldown, expireCounterRushForTest, finishCounterRushIntroForTest } from "./helpers/fight.mjs";
beforeEach(restartFight);
import assert from "node:assert/strict";
import { test, mock, beforeEach, afterEach } from "node:test";
import { offensiveAIConfig } from "../js/ai.js";
afterEach(() => { offensiveAIConfig.enabled = false; });
mock.method(Math, "random", () => 0.99);
import { gameState } from "../js/gameState.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestAttack } from './helpers/fight.mjs';
import { drawQTE, QTE_BUTTONS, questionResultLabel } from "../js/qteView.js";
import {finishReading} from './helpers/reading.mjs';
import { resolveDefenseForTest } from "./helpers/defense.mjs";
import { drawHUD, updateHUD, drawPixelText } from "../js/hud.js";
import { RESTART_BUTTON } from "../js/matchView.js";
import { restartFight as restartOffensiveFight } from "../js/restart.js";
import { applyImpactDamage } from "../js/match.js";
import { PUNCH_TYPES, PUNCH_ORDER } from "../js/punchTypes.js";
import { selectPunch } from "../js/punches.js";
import { enemyAccuracyDebug } from "../js/enemyAccuracy.js";
import { beginSpontaneousAttack } from "../js/counterAttack.js";
import { setDebugEnabled, armPerfectDefense, setDebugGameSpeed } from "../js/debug.js";
import { getGameSpeed } from "../js/simulationClock.js";
import { finishMatchIntro } from "../js/matchIntro.js";
import { selectDefenseSide, submitDefenseAnswer } from './helpers/defenseApi.mjs';

function answerCorrectly() {
    return submitAttackAnswer(gameState.qte.question.correctAnswer, gameState.qte.question.id);
}

function requestPunch(arm) {
    if (!requestAttack(arm)) return false;
    return answerCorrectly();
}

// DOM/Canvas mínimos para testar a integração sem dependências de navegador.
class TestCanvas extends EventTarget {
    style = {};
    width = 640;
    height = 360;
    draws = [];
    rectangles = [];
    stack = [];
    constructor() {
        super();
        const canvas = this;
        this.context = {
            globalAlpha: 1, fillStyle: "", imageSmoothingEnabled: true, tx: 0, ty: 0, sx: 1, sy: 1,
            fillRect(x, y, w, h) { canvas.rectangles.push([this.fillStyle, x * this.sx + this.tx, y * this.sy + this.ty, w * this.sx, h * this.sy]); },
            clearRect() { canvas.rectangles.length = 0; },
            beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {},
            save() { canvas.stack.push([this.globalAlpha, this.fillStyle, this.tx, this.ty, this.sx, this.sy]); },
            restore() { [this.globalAlpha, this.fillStyle, this.tx, this.ty, this.sx, this.sy] = canvas.stack.pop(); },
            translate(x, y) { this.tx += x * this.sx; this.ty += y * this.sy; },
            scale(x, y) { this.sx *= x; this.sy *= y; },
            drawImage(...args) {
                // A cópia opaca do cenário substitui os desenhos do quadro anterior.
                if (args.length === 3 && args[0].width === 640 && args[0].height === 360) {
                    canvas.rectangles.length = 0;
                }
                canvas.draws.push({ alpha: this.globalAlpha, sx: this.sx, sy: this.sy, tx: this.tx, args });
            }
        };
    }
    getContext() { return this.context; }
    getBoundingClientRect() { return { left: 10, top: 20, width: 320, height: 180 }; }
}

const canvas = new TestCanvas();
const caches = [];
const documentTarget = new EventTarget();
const frames = [];
globalThis.HTMLCanvasElement = TestCanvas;
globalThis.document = {
    getElementById: () => canvas,
    createElement: () => { const c = new TestCanvas(); caches.push(c); return c; },
    addEventListener: (...args) => documentTarget.addEventListener(...args)
};
globalThis.requestAnimationFrame = callback => frames.push(callback);
const { initializeGame, update } = await import('./helpers/main.mjs');
const { render } = await import("../js/render.js");
const { characters, CHARACTER_LAYOUT } = await import("../js/characters.js");
const { initializeInput } = await import("../js/input.js");

function click(button, target = canvas, x = 0, y = 0) {
    // Estes cenários antigos isolam a interação com perguntas no Canvas.
    if (gameState.playerCombat.state === "idle") gameState.commonAttackCount |= 1;
    const event = new Event("mousedown", { cancelable: true });
    Object.defineProperties(event, { button: { value: button }, clientX: { value: x }, clientY: { value: y } });
    target.dispatchEvent(event);
    finishReading();
}

// Exercita a entrada real de main.update: todos os subsistemas recebem o mesmo delta.
function advanceReal(seconds) {
    const count = Math.round(seconds * 100);
    for (let n = 0; n < count; n++) update(0.01);
}
function untilState(expected, maxReal = 100) {
    for (let n = 0; n < maxReal * 100 && gameState.playerCombat.state !== expected; n++) update(0.01);
    assert.equal(gameState.playerCombat.state, expected);
}
function perfectCurrentDefense() {
    selectDefenseSide(gameState.defense.expectedSide);
    const q = gameState.qte.question;
    submitDefenseAnswer(q.correctAnswer, q.id);
}

test("impacto forte desloca a arena sem deslocar HUD ou deixar transformação ativa", () => {
    selectPunch("uppercut");
    assert.equal(requestPunch("left"), true);
    for (let frame = 0; frame < 100 && !gameState.lastAttackResult?.impactResolved; frame++) update(0.01);
    assert.equal(gameState.lastAttackResult?.damageApplied, 25);
    render();
    const [arena, , , , hud] = canvas.draws.slice(-5);
    assert.equal(Math.abs(arena.tx), 2);
    assert.equal(hud.tx, 0);
    assert.equal(canvas.context.tx, 0);
    update(0.24);
    render();
    assert.equal(canvas.draws.at(-5).tx, 0);
});

test("mouse real alterna ataques sem/com pergunta e desenha stun sem iniciar outro QTE", () => {
    restartOffensiveFight();
    selectPunch("jab");
    const rawClick = () => {
        const event = new Event("mousedown");
        Object.defineProperties(event, { button: { value: 0 }, clientX: { value: 10 }, clientY: { value: 20 } });
        canvas.dispatchEvent(event);
    };
    rawClick();
    assert.equal(gameState.playerCombat.state, "punching_left");
    assert.equal(gameState.qte.question, null);
    update(0.42); update(2);
    rawClick(); assert.equal(gameState.playerCombat.state, "attack_qte");
    assert.equal(gameState.commonAttackCount, 2);
    restartOffensiveFight(); beginSpontaneousAttack();
    selectDefenseSide(gameState.defense.expectedSide === "left" ? "right" : "left");
    const q = gameState.qte.question;
    submitDefenseAnswer(q.alternatives.find(a => a !== q.correctAnswer), q.id);
    update(0.55); update(0.5); render();
    assert.equal(gameState.playerCombat.state, "stun_recovery");
    assert.ok(canvas.rectangles.some(r => r[0] === "#fff1a0" && r[3] === 3 && r[4] === 9));
    rawClick(); assert.equal(gameState.qte.question, null);
    for (const [, x, y, w, h] of caches[3].rectangles) {
        assert.ok(x >= 0 && y >= 0 && x + w <= 80 && y + h <= 108);
    }
});

test("velocidade global preserva 1×, desacelera QTE e animação e troca velocidade sem reiniciar", () => {
    try {
        setDebugEnabled(true);
        for (const speed of [1, 0.5]) {
            restartOffensiveFight(); gameState.offensiveAI.remaining = 1000000;
            setDebugGameSpeed(speed); requestAttack("left");
            const q = gameState.qte.question;
            const idle = characters.player.idleTime;
            advanceReal(2);
            assert.ok(Math.abs(gameState.qte.remaining - (10 - 2 * speed)) < 1e-8);
            assert.ok(Math.abs(gameState.gameTime - 2 * speed) < 1e-8);
            assert.ok(Math.abs(characters.player.idleTime - idle - 2 * speed) < 1e-8);
            assert.equal(gameState.qte.question, q);
        }
        const q = gameState.qte.question;
        const remaining = gameState.qte.remaining;
        setDebugGameSpeed(0.25); advanceReal(4);
        assert.ok(Math.abs(gameState.qte.remaining - (remaining - 1)) < 1e-8);
        assert.equal(gameState.qte.question, q);
        const before = JSON.stringify(gameState);
        setDebugEnabled(false);
        assert.equal(getGameSpeed(), 1);
        assert.equal(JSON.stringify(gameState), before);
        advanceReal(1);
        assert.ok(Math.abs(gameState.qte.remaining - (remaining - 2)) < 1e-8);
        setDebugEnabled(true); setDebugGameSpeed(0.1);
        restartOffensiveFight();
        assert.equal(getGameSpeed(), 1);
        assert.equal(gameState.playerCombat.state, "idle");
    } finally { setDebugEnabled(false); }
});

test("0.25×: cutscene, flash, janela e QTE de 5 s duram quatro vezes o tempo real", () => {
    try {
        restartOffensiveFight(); setDebugEnabled(true); setDebugGameSpeed(0.25);
        beginSpontaneousAttack();
        advanceReal(4); assert.ok(Math.abs(gameState.defense.remaining - 2) < 1e-8);
        selectDefenseSide(gameState.defense.expectedSide);
        advanceReal(4); assert.ok(Math.abs(gameState.qte.remaining - 9) < 1e-8);
        const q = gameState.qte.question; submitDefenseAnswer(q.correctAnswer, q.id);
        untilState("counter_rush_cutscene");
        const intro = gameState.counterRush.cutsceneRemaining;
        advanceReal(4);
        assert.ok(Math.abs(gameState.counterRush.cutsceneRemaining - intro + 1) < 1e-8);
        untilState("counter_rush_flash");
        const flash = gameState.counterRush.flashRemaining;
        advanceReal(0.2);
        assert.ok(Math.abs(gameState.counterRush.flashRemaining - flash + 0.05) < 1e-8);
        untilState("counter_rush_window");
        const windowTime = gameState.counterRush.remaining;
        advanceReal(4); assert.ok(Math.abs(gameState.counterRush.remaining - windowTime + 1) < 1e-8);
        selectPunch("jab"); requestAttack("left");
        const special = gameState.qte.question;
        advanceReal(19.96);
        assert.equal(gameState.qte.question, special);
        assert.ok(Math.abs(gameState.qte.remaining - 0.01) < 1e-8);
        advanceReal(0.05);
        assert.equal(gameState.qte.question, null);
        assert.equal(gameState.qte.lastResult.outcome, "timeout");
        assert.equal(gameState.playerCombat.state, "action_cooldown");
    } finally { setDebugEnabled(false); }
});

test("ataques espontâneos respeitam tempo simulado sem alterar precisão ou gerar fila", () => {
    try {
        restartOffensiveFight(); offensiveAIConfig.enabled = true;
        setDebugEnabled(true); setDebugGameSpeed(0.5);
        gameState.offensiveAI.remaining = 4;
        advanceReal(7.98);
        assert.equal(gameState.playerCombat.state, "idle");
        advanceReal(0.03);
        assert.equal(gameState.playerCombat.state, "defense_direction_qte");
        assert.equal(gameState.offensiveAI.sequence, 1);
        assert.equal(gameState.counterAttack.naturalMiss, false);
        advanceReal(1);
        assert.equal(gameState.offensiveAI.sequence, 1);
    } finally { setDebugEnabled(false); }
});

test("Counter Chain completo a 0.10× preserva dano, quatro Rush, turnos, stun e cooldown", () => {
    try {
        restartOffensiveFight(); setDebugEnabled(true); setDebugGameSpeed(0.1);
        beginSpontaneousAttack(); perfectCurrentDefense(); untilState("counter_rush_window");
        gameState.punches.cooldowns.uppercut = 5;
        selectPunch("jab");
        for (let count = 1; count <= 4; count++) {
            assert.equal(gameState.counterChain.count, count);
            assert.equal(requestAttack("left"), true);
            const turns = { ...gameState.punches.cooldowns };
            assert.equal(turns.uppercut, 5 - count);
            advanceReal(1); // 0,1 s da pergunta, sem consumir outro turno.
            assert.deepEqual(gameState.punches.cooldowns, turns);
            answerCorrectly();
            untilState(count === 4 ? "stun_recovery" : "counter_chain_recovery");
            assert.equal(gameState.enemyHealth, 100 - 5 * (count + 0.25 * count * (count + 1)));
            if (count < 4) {
                untilState("defense_direction_qte"); perfectCurrentDefense();
                untilState("counter_chain_transition");
                const time = gameState.counterChain.remaining;
                advanceReal(2);
                assert.ok(Math.abs(gameState.counterChain.remaining - time + 0.2) < 1e-8);
                untilState("counter_rush_window");
            }
        }
        assert.equal(gameState.counterChain.active, false);
        assert.equal(gameState.stun.remaining, 7);
        advanceReal(10);
        assert.ok(Math.abs(gameState.stun.remaining - 6) < 1e-8);
        assert.equal(gameState.playerCooldown.remaining, 0);
        assert.equal(requestAttack("left"), false);
        advanceReal(60.01);
        assert.equal(gameState.stun.remaining, 0);
        assert.equal(gameState.playerCombat.state, "idle");
        assert.equal(gameState.counterChain.count, 4);
        assert.equal(gameState.punches.cooldowns.uppercut, 1);
        assert.equal(frames.length, 1);
    } finally { setDebugEnabled(false); }
});

test("cliques escolhem o braço, sem reinício, sobreposição ou fila", () => {
    const beforeHealth = [gameState.playerHealth, gameState.enemyHealth, gameState.round];
    click(1);
    expectIdleAfterCooldown();
    for (const [button, arm, other] of [[0, "left", "right"], [2, "right", "left"]]) {
        // Coordenadas distintas não influenciam o comando dentro do Canvas.
        click(button, canvas, button === 0 ? 1 : 639, button === 0 ? 1 : 359);
        assert.equal(gameState.playerCombat.state, "attack_qte");
        assert.equal(gameState.qte.pendingPunch, arm);
        answerCorrectly();
        assert.equal(gameState.playerCombat.state, `punching_${arm}`);
        update(0.11);
        assert.ok(characters.player[`${arm}PunchExtension`] > 0);
        assert.equal(characters.player[`${other}PunchExtension`], 0);
        const elapsed = gameState.playerCombat.elapsed;
        for (let i = 0; i < 20; i++) { click(0); click(2); }
        assert.equal(gameState.playerCombat.elapsed, elapsed);
        assert.equal(gameState.playerCombat.arm, arm);
        update(0.05);
        assert.equal(gameState.playerCombat.extension, 1);
        render();
        const sprite = caches[3];
        // Nenhum bloco desenhado é cortado pelo Canvas do sprite estendido.
        for (const [, x, y, w, h] of sprite.rectangles) {
            assert.ok(x >= 0 && y >= 0 && x + w <= sprite.width && y + h <= sprite.height);
        }
        update(0.07);
        assert.ok(gameState.playerCombat.extension > 0 && gameState.playerCombat.extension < 1);
        update(0.07);
        assert.equal(gameState.playerCombat.state, "recovering");
        assert.equal(gameState.playerCombat.extension, 0);
        click(button);
        assert.equal(gameState.playerCombat.state, "recovering");
        update(0.119);
        assert.equal(gameState.playerCombat.state, "recovering");
        update(0.001);
        expectIdleAfterCooldown();
        assert.equal(gameState.playerCombat.arm, null);
        assert.equal(characters.player.animationState, "idle");
        assert.equal(characters.player.leftPunchExtension, 0);
        assert.equal(characters.player.rightPunchExtension, 0);
        update(1);
        expectIdleAfterCooldown();
    }
    assert.deepEqual([gameState.playerHealth, gameState.enemyHealth, gameState.round], [beforeHealth[0], beforeHealth[1] - 20, beforeHealth[2]]);
    assert.equal(characters.opponent.animationState, "idle");
    assert.equal(characters.opponent.leftPunchExtension, 0);
    assert.equal(characters.opponent.rightPunchExtension, 0);
    assert.ok(characters.opponent.idleTime > 0);
});

test("duração independe da taxa de quadros, inclusive quadros lentos", () => {
    for (const fps of [30, 60, 144]) {
        assert.equal(requestPunch("left"), true);
        for (let i = 0; i < Math.floor(0.42 * fps); i++) updateCombat(1 / fps);
        assert.notEqual(gameState.playerCombat.state, "idle");
        updateCombat(1 / fps);
        expectIdleAfterCooldown();
    }
    requestPunch("right");
    updateCombat(0.35);
    assert.equal(gameState.playerCombat.state, "recovering");
    updateCombat(0.07);
    expectIdleAfterCooldown();
    requestPunch("left");
    updateCombat(2);
    expectIdleAfterCooldown();
    assert.equal(requestPunch("invalid"), false);
});

test("menu bloqueado só no Canvas; cliques externos não atacam", () => {
    const inside = new Event("contextmenu", { cancelable: true });
    canvas.dispatchEvent(inside);
    assert.equal(inside.defaultPrevented, true);
    const outside = new Event("contextmenu", { cancelable: true });
    documentTarget.dispatchEvent(outside);
    assert.equal(outside.defaultPrevented, false);
    click(0, documentTarget);
    expectIdleAfterCooldown();
    initializeInput(canvas);
    click(2);
    answerCorrectly();
    assert.equal(gameState.playerCombat.state, "punching_right");
    update(0.42);
});

test("cenário, HUD, respiração, alpha e loop único preservados", () => {
    render();
    const beforeHUD = JSON.stringify(canvas.rectangles.filter(r => r[2] < 32 && (r[1] < 278 || r[1] > 362)));
    const idleBefore = characters.player.idleTime;
    const beforeClock = JSON.stringify(caches[4].rectangles);
    click(0);
    answerCorrectly();
    update(0.12);
    render();
    assert.ok(characters.player.idleTime > idleBefore);
    assert.equal(JSON.stringify(canvas.rectangles.filter(r => r[2] < 32 && (r[1] < 278 || r[1] > 362))), beforeHUD);
    assert.equal(JSON.stringify(caches[4].rectangles), beforeClock);
    assert.deepEqual(canvas.draws.slice(-5).map(d => d.args[0]), caches);
    assert.deepEqual(canvas.draws.slice(-5).map(d => d.alpha), [1, 1, 1, 0.65, 1]);
    assert.equal(canvas.context.globalAlpha, 1);
    assert.equal(canvas.width, 640);
    assert.equal(canvas.height, 360);
    initializeGame();
    assert.equal(frames.length, 1);
    frames.shift()(100);
    frames.shift()(116);
    assert.equal(frames.length, 1);
    const elapsed = gameState.playerCombat.elapsed;
    documentTarget.dispatchEvent(new Event("visibilitychange"));
    frames.shift()(99999);
    assert.equal(gameState.playerCombat.elapsed, elapsed);
    assert.equal(caches.length, 5);
});

test("QTE no Canvas escalonado: clique inicial isolado, botões e debug", () => {
    update(1); // Finaliza o soco do teste anterior.
    for (const button of [0, 2]) {
        const b = QTE_BUTTONS[0];
        click(button, canvas, 10 + (b.x + 10) / 2, 20 + (b.y + 10) / 2);
        assert.equal(gameState.playerCombat.state, "attack_qte");
        const question = gameState.qte.question;
        for (let i = 0; i < 10; i++) click(2, canvas, 10 + (b.x + 10) / 2, 20 + (b.y + 10) / 2);
        click(0, canvas, 11, 21); // Fora dos botões: não responde nem cria QTE.
        assert.equal(gameState.qte.question, question);
        assert.equal(gameState.qte.remaining, 10);
        update(2);
        assert.equal(characters.player.animationState, "idle");
        render();
        assert.equal(canvas.context.globalAlpha, 1);
        assert.ok(!canvas.rectangles.some(r => r[0] === "#899bb4"));
        drawQTE(canvas.context, gameState, true); // Revelação explícita apenas neste teste.
        assert.ok(canvas.rectangles.some(r => r[0] === "#899bb4"));
        assert.ok(canvas.rectangles.some(r => r[0] === "#efbe3b" && r[1] === 40 && r[2] === 334 && r[3] === 448));
        canvas.rectangles.length = 0;
        drawQTE(canvas.context, gameState, false);
        assert.ok(!canvas.rectangles.some(r => r[0] === "#899bb4"));
        const correct = QTE_BUTTONS.find(b => b.answer === question.correctAnswer);
        click(0, canvas, 10 + (correct.x + 10) / 2, 20 + (correct.y + 10) / 2);
        assert.equal(gameState.playerCombat.state, button === 0 ? "punching_left" : "punching_right");
        assert.equal(gameState.qte.question, null);
        click(0, canvas, 10 + (correct.x + 10) / 2, 20 + (correct.y + 10) / 2);
        assert.equal(gameState.qte.lastResult.questionId, question.id);
        update(0.42);
        expectIdleAfterCooldown();
    }
});

test("falhas fecham a pergunta, desenham mensagem e preservam HUD e vida", () => {
    click(0);
    const wrong = QTE_BUTTONS.find(b => b.answer !== gameState.qte.question.correctAnswer);
    click(0, canvas, 10 + (wrong.x + 10) / 2, 20 + (wrong.y + 10) / 2);
    assert.equal(gameState.playerCombat.state, "qte_failed");
    render();
    // The reading panel has its own production timing/color tests; this helper
    // has already completed reading to isolate the following combat transition.
    assert.equal(gameState.qte.pendingResult, null);
    assert.ok(!canvas.rectangles.some(r => r[1] === 128 && r[2] === 118));
    const errorMessage = questionResultLabel(gameState.qte.lastResult);
    update(0.9 + 0.55);
    resolveDefenseForTest(); update(0.55);
    finishPlayerCooldown();
    click(2);
    update(10);
    assert.equal(gameState.qte.lastResult.outcome, "timeout");
    render();
    const timeoutMessage = questionResultLabel(gameState.qte.lastResult);
    assert.notDeepEqual(timeoutMessage, errorMessage);
    assert.deepEqual(canvas.draws.slice(-5).map(d => d.args[0]), caches);
    assert.equal(gameState.playerHealth, 97.8); // Falha no Direto aumenta a base para 22.
    assert.equal(gameState.enemyHealth, 100);
    assert.equal(canvas.context.globalAlpha, 1);
    update(0.9 + 0.55);
    resolveDefenseForTest(); update(0.55);
    expectIdleAfterCooldown();
});

test("mouse esquerdo/direito anima a luva do mesmo lado da tela em oito socos alternados", () => {
    for (let attempt = 0; attempt < 8; attempt++) {
        const left = attempt % 2 === 0;
        click(left ? 0 : 2);
        assert.equal(gameState.qte.pendingPunch, left ? "left" : "right");
        answerCorrectly(); // Preserva o fluxo já existente no projeto.
        for (let frame = 1; frame <= 42; frame++) {
            update(0.01);
            render();
            const player = characters.player;
            // Ombros e punhos conservam os lados durante todo o movimento.
            assert.ok(player.leftArmPose.shoulderX < 40);
            assert.ok(player.rightArmPose.shoulderX > 40);
            assert.ok(player.leftArmPose.wristX < 40);
            assert.ok(player.rightArmPose.wristX > 40);
            if (frame === 16) {
                const active = left ? player.leftArmPose : player.rightArmPose;
                const guard = left ? player.rightArmPose : player.leftArmPose;
                assert.ok(active.gloveY < guard.gloveY - 10);
                // Confere os pixels realmente enviados ao Canvas do jogador.
                for (const arm of [player.leftArmPose, player.rightArmPose]) {
                    assert.ok(caches[3].rectangles.some(r => r[0] === "#cf3f50"
                        && r[1] === arm.gloveX + 3 && r[2] === arm.gloveY + 26
                        && r[3] === 10 && r[4] === 11));
                }
                const centerX = active.gloveX + 8;
                assert.ok(left ? centerX < 40 : centerX > 40);
            }
        }
        expectIdleAfterCooldown();
        assert.equal(characters.player.animationState, "idle");
        assert.equal(characters.player.leftPunchExtension, 0);
        assert.equal(characters.player.rightPunchExtension, 0);
    }
});

test("esquiva desloca cabeça e guarda, mantém base fixa e exibe feedback temporário", () => {
    const random = mock.method(Math, "random", () => 0);
    try {
        update(0); render();
        const headX = caches[2].rectangles.find(r => r[0] === "#292533")[1];
        const gloveX = caches[2].rectangles.find(r => r[0] === "#32935c")[1];
        const shorts = caches[2].rectangles.find(r => r[0] === "#633e88");
        const feet = caches[2].rectangles.filter(r => r[0] === "#455671");
        click(0); answerCorrectly();
        update(0.16); render();
        assert.equal(caches[2].rectangles.find(r => r[0] === "#292533")[1], headX - 8);
        assert.equal(caches[2].rectangles.find(r => r[0] === "#32935c")[1], gloveX - 8);
        assert.deepEqual(caches[2].rectangles.find(r => r[0] === "#633e88"), shorts);
        assert.deepEqual(caches[2].rectangles.filter(r => r[0] === "#455671"), feet);
        for (const [, x, y, w, h] of caches[2].rectangles) {
            assert.ok(x >= 0 && y >= 0 && x + w <= 80 && y + h <= 84);
        }
        assert.ok(canvas.rectangles.some(r => r[0] === "#efbe3b" && r[1] === 240 && r[2] === 94));
        assert.equal(canvas.context.globalAlpha, 1);
        update(0.26); render();
        assert.equal(characters.opponent.animationState, "idle");
        assert.equal(caches[2].rectangles.find(r => r[0] === "#292533")[1], headX);
        update(1); render();
        assert.ok(!canvas.rectangles.some(r => r[1] === 240 && r[2] === 94));
        assert.equal(gameState.playerHealth, 100);
        assert.equal(gameState.enemyHealth, 100);
    } finally {
        random.mock.restore();
    }
});

test("contra-ataques respeitam anatomia frontal, bloqueiam cliques e preservam HUD", () => {
    for (const roll of [0, 0.99]) {
        finishPlayerCooldown();
        const healthBefore = gameState.playerHealth;
        let calls = 0;
        const random = mock.method(Math, "random", () => calls++ === 1 ? 0.99 : roll);
        try {
            update(0); render();
            const hud = JSON.stringify(canvas.rectangles.filter(r => r[2] >= 12 && r[2] < 32 && (r[1] < 278 || r[1] > 362)));
            const shorts = caches[2].rectangles.find(r => r[0] === "#633e88");
            click(0);
            const question = gameState.qte.question;
            submitAttackAnswer(question.alternatives.find(answer => answer !== question.correctAnswer), question.id);
            update(0.9); render();
            resolveDefenseForTest(); update(0); render();
            assert.ok(canvas.rectangles.some(r => r[1] === 216 && r[2] === 72));
            assert.equal(characters.player.animationState, "idle");
            const side = roll === 0 ? "left" : "right";
            for (let frame = 1; frame <= 55; frame++) {
                click(0); click(2);
                assert.equal(gameState.qte.question, null);
                update(0.01); render();
                // Compara os nomes, excluindo o flash sobre a cena inteira em y=0.
                assert.equal(JSON.stringify(canvas.rectangles.filter(r => r[2] >= 12 && r[2] < 32 && (r[1] < 278 || r[1] > 362))), hud);
                assert.deepEqual(caches[2].rectangles.find(r => r[0] === "#633e88"), shorts);
                for (const [, x, y, w, h] of caches[2].rectangles) {
                    assert.ok(x >= 0 && y >= 0 && x + w <= 80 && y + h <= 84);
                }
                if (frame === 24) {
                    const pose = characters.opponent;
                    assert.equal(pose.counterSide, side);
                    assert.equal(pose.animationState, `counter_${side}`);
                    const x = pose.counterArmPose.gloveX + pose.torsoX;
                    assert.ok(side === "left" ? x + 8 > 40 : x + 8 < 40);
                    assert.ok(caches[2].rectangles.some(r => r[0] === "#32935c"
                        && r[1] === x + 3 && r[2] === pose.counterArmPose.gloveY + 2));
                    assert.ok(pose.counterArmPose.gloveY > 20);
                }
            }
            assert.equal(random.mock.callCount(), 2); // Braço e precisão.
            expectIdleAfterCooldown();
            assert.equal(gameState.opponentCombat.state, "idle");
            assert.equal(characters.opponent.counterSide, null);
            assert.ok(!canvas.rectangles.some(r => r[1] === 216 && r[2] === 72));
            assert.equal(gameState.playerHealth, healthBefore - 2.2);
            assert.equal(gameState.enemyHealth, 100);
            click(2);
            assert.equal(gameState.playerCombat.state, "attack_qte");
            answerCorrectly(); update(0.42);
        } finally {
            random.mock.restore();
        }
    }
});

test("mouse escolhe guarda lateral, responde defesa em Canvas escalonado e libera novo ataque", () => {
    for (const [button, side, percent] of [[0, "left", 10], [2, "right", 50]]) {
        finishPlayerCooldown();
        const healthBefore = gameState.playerHealth;
        const enemyHealthBefore = gameState.enemyHealth;
        click(0);
        const attack = gameState.qte.question;
        submitAttackAnswer(attack.alternatives.find(answer => answer !== attack.correctAnswer), attack.id);
        update(0.9); render();
        assert.equal(gameState.playerCombat.state, "defense_direction_qte");
        const hudSnapshot = JSON.stringify(caches[4].rectangles);
        const sequence = gameState.qte.sequence;
        assert.ok(canvas.rectangles.some(r => r[1] === 140 && r[2] === 268 && r[3] === 360));
        assert.equal(canvas.context.globalAlpha, 1);
        const target = QTE_BUTTONS[0];
        // O mesmo clique escolhe o lado, mas não responde ao QTE que acaba de abrir.
        click(button, canvas, 10 + (target.x + 10) / 2, 20 + (target.y + 10) / 2);
        assert.equal(gameState.playerCombat.state, "defense_question_qte");
        assert.equal(gameState.defense.selectedSide, side);
        const question = gameState.qte.question;
        assert.equal(question.kind, "defense");
        assert.equal(gameState.qte.sequence, sequence + 1);
        assert.equal(gameState.qte.remaining, 10);
        click(2, canvas, 10 + (target.x + 10) / 2, 20 + (target.y + 10) / 2);
        click(0, canvas, 11, 21);
        assert.equal(gameState.qte.question, question);
        update(0.1); render();
        assert.equal(characters.player.animationState, `block_${side}`);
        assert.equal(characters.player.defenseGuardAmount, 1);
        assert.equal(gameState.counterAttack.impactResolved, false);
        assert.ok(!canvas.rectangles.some(r => r[0] === "#899bb4"));
        drawQTE(canvas.context, gameState, true); // Modo normal não revela respostas.
        assert.ok(canvas.rectangles.some(r => r[0] === "#899bb4"));
        canvas.rectangles.length = 0;
        drawQTE(canvas.context, gameState, false);
        assert.ok(!canvas.rectangles.some(r => r[0] === "#899bb4"));
        const correct = QTE_BUTTONS.find(b => b.answer === question.correctAnswer);
        click(0, canvas, 10 + (correct.x + 10) / 2, 20 + (correct.y + 10) / 2);
        const result = gameState.defense.result;
        assert.equal(result.damagePercent, percent);
        assert.equal(result.impactRegistered, false);
        for (let i = 0; i < 10; i++) { click(0); click(2); }
        assert.equal(gameState.defense.result, result);
        assert.equal(gameState.qte.sequence, sequence + 1);
        render();
        assert.ok(canvas.rectangles.some(r => r[1] === 174 && r[2] === 292));
        update(0.55); render();
        assert.equal(gameState.defense.lastResult, result);
        expectIdleAfterCooldown();
        assert.equal(characters.player.defenseGuardAmount, 0);
        assert.equal(JSON.stringify(caches[4].rectangles), hudSnapshot);
        assert.deepEqual(canvas.draws.slice(-5).map(d => d.args[0]), caches);
        assert.equal(canvas.context.globalAlpha, 1);
        assert.equal(gameState.playerHealth, healthBefore - result.damage);
        assert.equal(gameState.enemyHealth, enemyHealthBefore);
        update(1); render();
        assert.ok(!canvas.rectangles.some(r => r[1] === 174 && r[2] === 292));
        click(2);
        assert.equal(gameState.playerCombat.state, "attack_qte");
        answerCorrectly(); update(0.42);
    }
});

test("HUD reflete HP imediatamente, limita o preenchimento e suaviza apenas o rastro", () => {
    gameState.enemyHealth = 90;
    updateHUD(gameState, 0.05);
    canvas.rectangles.length = 0;
    drawHUD(canvas.context, gameState);
    assert.ok(canvas.rectangles.some(r => r[0] === "#efbe3b" && r[1] === 379 && r[2] === 35 && r[3] === 176));
    assert.ok(canvas.rectangles.some(r => r[0] === "#c94351" && r[1] >= 379 && r[2] === 35));
    updateHUD(gameState, 1);
    canvas.rectangles.length = 0;
    drawHUD(canvas.context, gameState);
    assert.ok(!canvas.rectangles.some(r => r[0] === "#c94351" && r[2] === 35));
    assert.equal(gameState.enemyHealth, 90);
});

test("vitória e derrota mostram resultado, bloqueiam entradas e reiniciam sem outro loop", () => {
    for (const outcome of ["victory", "defeat"]) {
        restartFight();
        const cachesBefore = caches.length;
        const oldMatchId = gameState.matchId;
        let oldQuestion;
        if (outcome === "victory") {
            gameState.enemyHealth = 10;
            click(0); oldQuestion = gameState.qte.question; answerCorrectly();
            update(0.16);
        } else {
            gameState.playerHealth = 2;
            click(2); oldQuestion = gameState.qte.question;
            submitAttackAnswer(oldQuestion.alternatives.find(answer => answer !== oldQuestion.correctAnswer), oldQuestion.id);
            update(0.9); resolveDefenseForTest(); update(0.24);
        }
        updateKnockout(gameState,KO_DURATION); assert.equal(gameState.phase, outcome);
        assert.equal(gameState.qte.question, null);
        assert.equal(gameState.counterAttack.pending, false);
        render();
        assert.ok(!canvas.rectangles.some(r => r[1] === RESTART_BUTTON.x && r[2] === RESTART_BUTTON.y));
        const earlyX = 10 + (RESTART_BUTTON.x + 10) / 2;
        const earlyY = 20 + (RESTART_BUTTON.y + 10) / 2;
        click(0, canvas, earlyX, earlyY);
        updateKnockout(gameState,KO_DURATION); assert.equal(gameState.phase, outcome);
        updateKnockout(gameState,KO_DURATION); update(5);
        render();
        assert.ok(canvas.rectangles.some(r => r[1] === RESTART_BUTTON.x && r[2] === RESTART_BUTTON.y));
        assert.equal(canvas.context.globalAlpha, 1);
        const stoppedClock = gameState.gameTime;
        update(1);
        assert.equal(gameState.gameTime, stoppedClock);
        click(0, canvas, 11, 21);
        updateKnockout(gameState,KO_DURATION); assert.equal(gameState.phase, outcome);
        const x = 10 + (RESTART_BUTTON.x + 10) / 2;
        const y = 20 + (RESTART_BUTTON.y + 10) / 2;
        click(2, canvas, x, y);
        updateKnockout(gameState,KO_DURATION); assert.equal(gameState.phase, outcome);
        click(0, canvas, x, y);
        assert.equal(gameState.phase, "match_intro");
        assert.equal(gameState.gameTime, 0);
        finishMatchIntro();
        assert.equal(gameState.phase, "idle");
        assert.equal(gameState.playerHealth, 100);
        assert.equal(gameState.enemyHealth, 100);
        assert.equal(gameState.gameTime, 0);
        assert.equal(gameState.matchResult, null);
        assert.equal(gameState.lastAttackResult, null);
        assert.equal(gameState.defense.lastResult, null);
        assert.equal(gameState.qte.question, null);
        assert.equal(characters.player.idleTime, 0);
        assert.equal(characters.opponent.torsoX, 0);
        assert.ok(gameState.matchId > oldMatchId);
        render();
        const fullBars = canvas.rectangles.filter(r => r[0] === "#efbe3b" && r[2] === 35 && r[3] === 196);
        assert.equal(fullBars.length, 2);
        assert.equal(caches.length, cachesBefore);
        assert.equal(frames.length, 1);
        click(2);
        assert.equal(gameState.playerCombat.state, "attack_qte");
        assert.notEqual(gameState.qte.question.id, oldQuestion.id);
        assert.equal(submitAttackAnswer(oldQuestion.correctAnswer, oldQuestion.id), false);
        answerCorrectly(); update(0.42);
        assert.equal(gameState.enemyHealth, 90);
    }
});

test("countdown visual cede à defesa espontânea pelo mouse e reaparece completo", () => {
    offensiveAIConfig.enabled = true; // Exercita só o ponto de integração futuro.
    restartOffensiveFight();
    gameState.offensiveAI.remaining = 0.8;
    click(2); answerCorrectly(); update(0.42); render();
    assert.equal(gameState.playerCombat.state, "action_cooldown");
    assert.equal(gameState.playerCooldown.remaining, 2);
    assert.ok(canvas.rectangles.some(r => r[1] === 12 && r[2] === 282 && r[3] === 160));
    assert.ok(canvas.rectangles.some(r => r[1] === 22 && r[2] === 330 && r[3] === 0));
    click(0); click(2);
    assert.equal(gameState.qte.question, null);
    assert.equal(gameState.playerCooldown.remaining, 2);
    update(0.4); render();
    assert.equal(gameState.counterAttack.source, "spontaneous");
    assert.equal(gameState.playerCombat.state, "defense_direction_qte");
    assert.equal(gameState.defense.remaining, 3);
    assert.ok(!canvas.rectangles.some(r => r[1] === 12 && r[2] === 282));
    // Braço anatômico direito -> defesa visual esquerda.
    click(0, canvas, 11, 21);
    assert.equal(gameState.playerCombat.state, "defense_question_qte");
    assert.equal(gameState.qte.remaining, 10);
    const q = gameState.qte.question;
    update(0.2);
    const correct = QTE_BUTTONS.find(b => b.answer === q.correctAnswer);
    click(0, canvas, 10 + (correct.x + 10) / 2, 20 + (correct.y + 10) / 2);
    update(0.55 - gameState.opponentCombat.elapsed); expireCounterRushForTest(); render();
    assert.equal(gameState.playerCooldown.remaining, 2);
    assert.equal(gameState.playerHealth, 98);
    assert.ok(canvas.rectangles.some(r => r[1] === 12 && r[2] === 282));
    assert.ok(!canvas.rectangles.some(r => r[1] === 174 && r[2] === 292)); // Feedback da defesa expirou durante a janela.
    update(2); render();
    assert.equal(gameState.playerCombat.state, "idle");
    assert.ok(canvas.rectangles.some(r => r[0] === "#76cc7a" && r[1] === 22 && r[2] === 330 && r[3] === 140));
    update(0.5); render();
    assert.ok(!canvas.rectangles.some(r => r[1] === 12 && r[2] === 282));
    applyImpactDamage("enemy", 100, "end-flow"); render();
    assert.ok(!canvas.rectangles.some(r => r[1] === 12 && r[2] === 282));
    updateKnockout(gameState,KO_DURATION); update(5);
    const x = 10 + (RESTART_BUTTON.x + 10) / 2, y = 20 + (RESTART_BUTTON.y + 10) / 2;
    click(0, canvas, x, y);
    assert.equal(gameState.offensiveAI.remaining, null);
    assert.equal(gameState.playerCooldown.remaining, 0);
    assert.equal(gameState.phase, "match_intro");
    finishMatchIntro();
    update(0);
    assert.ok(gameState.offensiveAI.remaining >= 4 && gameState.offensiveAI.remaining <= 7);
    assert.equal(frames.length, 1);
    assert.equal(caches.length, 5);
    assert.equal(canvas.context.globalAlpha, 1);
});

test("quatro perfis são desenhados com os dois botões sem recorte ou inversão", () => {
    for (const type of PUNCH_ORDER) for (const button of [0, 2]) {
        restartFight(); selectPunch(type);
        click(button); answerCorrectly();
        const timing = PUNCH_TYPES[type].timing;
        const total = Object.values(timing).reduce((sum, value) => sum + value, 0);
        for (let frame = 0; frame < Math.ceil(total * 100); frame++) {
            update(0.01); render();
            const pose = characters.player;
            if (gameState.playerCombat.arm) {
                assert.equal(pose.punchType, type);
                const active = button === 0 ? pose.leftArmPose : pose.rightArmPose;
                assert.ok(button === 0 ? active.wristX < 40 : active.wristX > 40);
            }
            for (const [, x, y, w, h] of caches[3].rectangles) {
                assert.ok(x >= 0 && y >= 0 && x + w <= 80 && y + h <= 108,
                    `${type}, botão ${button}: bloco fora do sprite (${x}, ${y}, ${w}, ${h})`);
            }
        }
        assert.equal(gameState.enemyHealth, 100 - PUNCH_TYPES[type].damage);
        assert.equal(gameState.playerCombat.state, "action_cooldown");
        assert.equal(canvas.context.globalAlpha, 1);
    }
});

test("bloqueios dos dois lados desenham guarda elevada sem recorte e mantêm HUD e loop", () => {
    let roll = 0;
    const random = mock.method(Math, "random", () => roll++ % 2 === 0 ? 0.99 : 0);
    try {
        for (const type of PUNCH_ORDER) for (const button of [0, 2]) {
            restartFight(); selectPunch(type); roll = 0;
            const hud = JSON.stringify(caches[4].rectangles);
            click(button); answerCorrectly();
            const timing = PUNCH_TYPES[type].timing;
            const impact = timing.preparation + timing.advance;
            const total = Object.values(timing).reduce((a, b) => a + b, 0);
            for (let frame = 0; frame < Math.ceil(total * 100); frame++) {
                update(0.01); render();
                for (const [, x, y, w, h] of caches[2].rectangles) {
                    assert.ok(x >= 0 && y >= 0 && x + w <= 80 && y + h <= 84);
                }
                assert.equal(canvas.context.globalAlpha, 1);
                if (Math.abs((frame + 1) / 100 - impact) < 1e-9) {
                    assert.equal(characters.opponent.animationState, button === 0 ? "block_right" : "block_left");
                    assert.equal(gameState.attackFeedback.outcome, "blocked");
                    assert.ok(canvas.rectangles.some(r => r[1] === 240 && r[2] === 72 && r[3] === 160));
                }
            }
            assert.equal(gameState.enemyHealth, 100 - PUNCH_TYPES[type].damage * 0.25);
            assert.equal(JSON.stringify(caches[4].rectangles), hud);
            assert.equal(frames.length, 1);
            assert.equal(caches.length, 5);
        }
    } finally { random.mock.restore(); }
});

test("esquiva automática desenha os dois lados sem recortes, preservando cenário, HUD e loop", () => {
    enemyAccuracyDebug.forceOutcome = "miss";
    try {
        for (const [roll, direction] of [[0, "left"], [0.99, "right"]]) {
            restartFight();
            enemyAccuracyDebug.forceOutcome = "miss";
            const random = mock.method(Math, "random", () => roll);
            try {
                assert.equal(beginSpontaneousAttack(), true);
                render();
                assert.equal(characters.player.autoDodgeX, 0);
                resolveDefenseForTest();
                for (let frame = 0; frame < 55; frame++) {
                    update(0.01); render();
                    for (const [, x, y, w, h] of caches[3].rectangles) {
                        assert.ok(x >= 0 && y >= 0 && x + w <= 80 && y + h <= 108,
                            `esquiva ${direction}: bloco fora da área (${x}, ${y}, ${w}, ${h})`);
                    }
                    if (frame === 27) {
                        assert.equal(characters.player.animationState, `dodge_${direction}`);
                        assert.equal(characters.player.autoDodgeX, direction === "left" ? -6 : 6);
                    }
                    assert.equal(gameState.playerHealth, 100);
                    assert.equal(canvas.context.globalAlpha, 1);
                }
                assert.equal(characters.player.autoDodgeX, 0);
                assert.equal(frames.length, 1);
                assert.equal(caches.length, 5);
            } finally { random.mock.restore(); }
        }
    } finally { enemyAccuracyDebug.forceOutcome = null; }
});

test("HUD mostra vulnerabilidade pendente e remove o indicador ao iniciar o ataque do bot", () => {
    const indicator = () => canvas.rectangles.filter(r => r[0] === "#f47b78" && r[1] >= 62 && r[2] >= 53 && r[2] < 60);
    for (const [type, bonus] of [["straight", 0.1], ["hook", 0.25], ["uppercut", 0.5]]) {
        restartFight(); render();
        assert.equal(indicator().length, 0);
        selectPunch(type); render();
        assert.equal(indicator().length, 0);
        click(0);
        const q = gameState.qte.question;
        submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
        render();
        assert.equal(gameState.pendingRiskBonus, bonus);
        assert.ok(indicator().length > 0);
        assert.ok(indicator().every(([, x, y, w, h]) => x + w <= 264 && y + h <= 60));
        assert.equal(canvas.context.globalAlpha, 1);
        update(0.9); render();
        assert.equal(gameState.pendingRiskBonus, 0);
        assert.equal(gameState.counterAttack.riskBonus, bonus);
        assert.equal(indicator().length, 0);
        assert.equal(frames.length, 1);
        assert.equal(caches.length, 5);
        restartFight(); render();
        assert.equal(indicator().length, 0);
    }
});

test("mouse executa Counter Rush com quatro golpes e dois braços, sem responder no clique inicial", () => {
    for (const type of PUNCH_ORDER) for (const button of [0, 2]) {
        restartFight();
        assert.equal(beginSpontaneousAttack(), true);
        resolveDefenseForTest(); update(0.55); finishCounterRushIntroForTest(); render();
        assert.equal(gameState.playerCombat.state, "counter_rush_window");
        assert.ok(canvas.rectangles.some(r => r[1] === 150 && r[2] === 74 && r[3] === 340 && r[4] === 92));
        selectPunch(type);
        // O clique sobre uma alternativa ainda só escolhe o braço nesta fase.
        const initial = QTE_BUTTONS[0];
        click(button, canvas, 10 + (initial.x + 10) / 2, 20 + (initial.y + 10) / 2);
        assert.equal(gameState.playerCombat.state, "counter_rush_qte");
        assert.equal(gameState.qte.remaining, 5);
        const q = gameState.qte.question;
        assert.equal(gameState.qte.pendingPunch, button === 0 ? "left" : "right");
        render();
        assert.ok(canvas.rectangles.some(r => r[1] === 24 && r[2] === 76));
        click(2, canvas, 10 + (initial.x + 10) / 2, 20 + (initial.y + 10) / 2);
        assert.equal(gameState.qte.question, q);
        const correct = QTE_BUTTONS.find(b => b.answer === q.correctAnswer);
        click(0, canvas, 10 + (correct.x + 10) / 2, 20 + (correct.y + 10) / 2);
        assert.equal(gameState.playerCombat.state, "counter_rush_resolution");
        const duration = Object.values(PUNCH_TYPES[type].timing).reduce((a, b) => a + b, 0);
        const impact = PUNCH_TYPES[type].timing.preparation + PUNCH_TYPES[type].timing.advance;
        for (let frame = 0; frame < Math.ceil(duration * 100); frame++) {
            update(0.01); render();
            for (const [, x, y, w, h] of caches[3].rectangles) {
                assert.ok(x >= 0 && y >= 0 && x + w <= 80 && y + h <= 108);
            }
            if (Math.abs((frame + 1) / 100 - impact) < 1e-9) {
                assert.ok(canvas.rectangles.some(r => r[1] === 218 && r[2] === 72 && r[4] === 48));
                assert.ok(canvas.rectangles.some(r => r[1] === 278 && r[2] === 162));
            }
        }
        assert.equal(gameState.enemyHealth, 100 - PUNCH_TYPES[type].damage * 1.5);
        assert.equal(gameState.playerCombat.state, "counter_chain_recovery");
        assert.equal(canvas.context.globalAlpha, 1);
        assert.equal(frames.length, 1);
        assert.equal(caches.length, 5);
    }
});

test("renderer aplica flash e filtro especial sem cobrir permanentemente alternativas ou manter filtro no reinício", () => {
    restartFight(); beginSpontaneousAttack(); resolveDefenseForTest(); update(0.55); update(3); render();
    assert.equal(canvas.style.filter, "");
    assert.ok(canvas.rectangles.some(r => r[0] === "#ffffff" && r[1] === 0 && r[2] === 0 && r[3] === 640 && r[4] === 360));
    update(0.12); render();
    assert.equal(canvas.style.filter, "grayscale(1)");
    assert.ok(!canvas.rectangles.some(r => r[0] === "#ffffff" && r[3] === 640));
    selectPunch("jab"); click(0); render();
    assert.equal(gameState.qte.remaining, 5);
    assert.equal(canvas.style.filter, "grayscale(1)");
    for (const b of QTE_BUTTONS) {
        assert.ok(canvas.rectangles.some(r => r[0] === "#293e5c" && r[1] === b.x + 2 && r[2] === b.y + 2));
    }
    assert.ok(canvas.rectangles.some(r => r[0] === "#fff1a0" && r[2] === 90));
    const q = gameState.qte.question;
    const wrong = QTE_BUTTONS.find(b => b.answer !== q.correctAnswer);
    click(0, canvas, 10 + (wrong.x + 10) / 2, 20 + (wrong.y + 10) / 2);
    assert.equal(canvas.style.filter, "");
    restartFight(); beginSpontaneousAttack(); resolveDefenseForTest(); update(0.55); update(3); update(0.12); render();
    assert.equal(canvas.style.filter, "grayscale(1)");
    restartFight();
    assert.equal(canvas.style.filter, ""); // Não precisa aguardar o próximo frame.
    render();
    assert.equal(canvas.context.globalAlpha, 1);
    assert.equal(frames.length, 1);
    assert.equal(caches.length, 5);
});

test("cutscene real aproxima câmera, prepara jogador e desenha barras/textos antes do flash, inclusive com debug", () => {
    const layout = JSON.stringify(CHARACTER_LAYOUT);
    try {
        for (const forced of [false, true]) {
            restartFight(); setDebugEnabled(forced);
            if (forced) { armPerfectDefense(); enemyAccuracyDebug.forceOutcome = "miss"; }
            assert.equal(beginSpontaneousAttack(), true);
            resolveDefenseForTest(); update(0.55); render();
            assert.equal(gameState.playerCombat.state, "counter_rush_cutscene");
            assert.equal(gameState.counterRush.cutsceneRemaining, 3);
            assert.equal(gameState.counterRush.remaining, 0);
            assert.equal(gameState.counterRush.flashRemaining, 0);
            assert.equal(gameState.defense.lastResult.debugOverride, forced ? "perfect_defense" : undefined);
            let previousZoom = 1;
            for (const [step, elapsed, prep] of [[0.5,0.5,0],[1,1.5,0.5],[1,2.5,1]]) {
                click(0); click(2);
                update(step); render();
                assert.equal(gameState.qte.question, null);
                const scene = canvas.draws.findLast(d => d.args[0] === caches[0]);
                assert.ok(scene.sx > previousZoom);
                assert.equal(scene.sx, scene.sy);
                previousZoom = scene.sx;
                assert.equal(characters.player.cinematicGuardAmount, prep);
                assert.ok(canvas.rectangles.some(r => r[0] === "#000000" && r[1] === 0 && r[2] === 0 && r[3] === 640 && r[4] > 0));
                assert.ok(canvas.rectangles.some(r => r[0] === "#000000" && r[2] + r[4] === 360));
                if (elapsed === 1.5) {
                    const expected = [];
                    drawPixelText({ fillStyle: "", fillRect(...args) { expected.push([this.fillStyle, ...args]); } },
                        "OPORTUNIDADE DE CONTRA-ATAQUE", 320, 83, 2, "#fff1a0", "center");
                    assert.deepEqual(canvas.rectangles.filter(r => r[0] === "#fff1a0" && r[2] >= 83 && r[2] < 97), expected);
                }
                assert.equal(canvas.style.filter, "");
                assert.equal(canvas.context.sx, 1);
                assert.equal(canvas.context.sy, 1);
                assert.equal(canvas.context.tx, 0);
                assert.equal(canvas.context.ty, 0);
                assert.equal(canvas.context.globalAlpha, 1);
                assert.equal(canvas.stack.length, 0);
                assert.equal(JSON.stringify(CHARACTER_LAYOUT), layout);
            }
            update(0.5); render();
            assert.equal(gameState.playerCombat.state, "counter_rush_flash");
            const scene = canvas.draws.findLast(d => d.args[0] === caches[0]);
            assert.equal(scene.sx, 1); // Câmera original antes de liberar a janela.
            assert.ok(canvas.rectangles.some(r => r[0] === "#ffffff" && r[3] === 640 && r[4] === 360));
            assert.equal(gameState.counterRush.remaining, 0);
            update(0.12); render();
            assert.equal(gameState.playerCombat.state, "counter_rush_window");
            assert.equal(gameState.counterRush.remaining, 2.5);
            assert.equal(canvas.style.filter, "grayscale(1)");
            assert.equal(characters.player.cinematicGuardAmount, 0);
            selectPunch("jab"); click(0);
            const q = gameState.qte.question;
            assert.equal(gameState.qte.remaining, 5);
            const correct = QTE_BUTTONS.find(b => b.answer === q.correctAnswer);
            click(0, canvas, 10 + (correct.x + 10) / 2, 20 + (correct.y + 10) / 2);
            update(0.4); render();
            assert.equal(gameState.enemyHealth, 92.5);
            assert.equal(canvas.style.filter, "grayscale(1)");
            assert.equal(canvas.context.sx, 1);
            assert.equal(frames.length, 1);
            assert.equal(caches.length, 5);
        }
    } finally { setDebugEnabled(false); }
});

