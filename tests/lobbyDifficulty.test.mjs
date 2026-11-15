import { updateKnockout, KO_DURATION } from '../js/knockout.js';
import { finishMatchIntro } from "../js/matchIntro.js";
import assert from "node:assert/strict";
import { test, beforeEach, afterEach, mock } from "node:test";
import { readFileSync } from "node:fs";
import { gameState } from "../js/gameState.js";
import { restartFight } from "../js/restart.js";
import { initializeLobby } from "../js/lobby.js";
import {tutorialFrame,tutorialAction} from '../js/tutorial.js';
import { initializeInput } from "../js/input.js";
import { LOBBY_BUTTON, RESTART_BUTTON } from "../js/matchView.js";
import { updateCeremony } from "../js/ceremony.js";
import { activeDifficulty, chooseBotAttack, usesCautiousGuard } from "../js/difficulty.js";
import { applyImpactDamage } from "../js/match.js";
import { beginSpontaneousAttack } from "../js/counterAttack.js";
import { beginAttackQTE } from "../js/qte.js";
import { requestPunch, submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { selectDefenseSide, submitDefenseAnswer } from './helpers/defenseApi.mjs';
import { selectPunch } from "../js/punches.js";
import { decideOpponentResponse, offensiveAIConfig, updateOffensiveClock } from "../js/ai.js";
import { setDebugEnabled, readDebugSnapshot, setDebugGameSpeed } from "../js/debug.js";
import { simulationDelta } from "../js/simulationClock.js";

const initialPhase = gameState.phase;
const initialDifficulty = gameState.difficulty;

beforeEach(() => {
    gameState.difficulty = "normal";
    restartFight();
});
afterEach(() => {
    mock.restoreAll();
    setDebugEnabled(false);
    offensiveAIConfig.enabled = true;
});

class Element extends EventTarget {
    hidden = false;
    dataset = {};
    attributes = new Map();
    setAttribute(name, value) { this.attributes.set(name, value); }
    focus() {}
}

function mountLobby(assetsReady = null) {
    const panel = new Element();
    const canvas = Object.assign(new Element(), {
        width: 640, height: 360,
        getBoundingClientRect: () => ({ left: 10, top: 20, width: 320, height: 180 })
    });
    const controls = new Element();
    const start = new Element();
    const options = ["easy", "normal", "hard"].map(difficulty => Object.assign(new Element(), { dataset: { difficulty } }));
    panel.querySelectorAll = () => options;
    panel.querySelector = () => start;
    const elements = { "difficulty-lobby": panel, "game-canvas": canvas, "punch-controls": controls };
    initializeLobby({ getElementById: id => elements[id] }, assetsReady);
    initializeInput(canvas);
    const clickResult = ({ x, y }) => {
        const event = new Event("mousedown");
        Object.defineProperties(event, {
            button: { value: 0 },
            clientX: { value: 10 + (x + 5) / 2 },
            clientY: { value: 20 + (y + 5) / 2 }
        });
        canvas.dispatchEvent(event);
    };
    return { panel, canvas, controls, start, options, clickResult };
}

test("iniciar luta espera os sprites terminarem de carregar", async () => {
    gameState.phase = "lobby";
    let finishLoading;
    const loading = new Promise(resolve => { finishLoading = resolve; });
    const { start } = mountLobby(loading);
    assert.equal(start.disabled, true);
    start.dispatchEvent(new Event("click"));
    assert.equal(gameState.phase, "lobby");
    finishLoading();
    await loading;
    assert.equal(start.disabled, false);
    start.dispatchEvent(new Event("click"));
    assert.equal(tutorialFrame()?.screen,'prompt');tutorialAction('skip');
    assert.equal(gameState.phase, "match_intro");
    finishMatchIntro();
    assert.equal(gameState.phase, "idle");
});

test("lobby inicial NORMAL, três opções e início somente pelo botão", () => {
    assert.equal(initialPhase, "lobby");
    assert.equal(initialDifficulty, "normal");
    gameState.phase = initialPhase;
    const { panel, canvas, controls, start, options } = mountLobby();
    assert.equal(options[1].attributes.get("aria-pressed"), "true");
    assert.equal(panel.hidden, false);
    assert.equal(canvas.hidden, true);
    assert.equal(controls.hidden, true);
    setDebugEnabled(true);
    setDebugGameSpeed(0.1);
    for (const [index, label] of ["Fácil", "Normal", "Difícil"].entries()) {
        options[index].dispatchEvent(new Event("click"));
        assert.equal(gameState.phase, "lobby");
        assert.equal(readDebugSnapshot().difficulty, label);
        assert.equal(options[index].attributes.get("aria-pressed"), "true");
        assert.equal(options.filter(option => option.attributes.get("aria-pressed") === "true").length, 1);
        assert.equal(requestPunch("left"), false);
        assert.equal(beginAttackQTE("left"), false);
        assert.equal(beginSpontaneousAttack(), false);
        updateOffensiveClock(1000);
        updateCombat(1000);
        assert.equal(gameState.offensiveAI.remaining, null);
        assert.equal(gameState.qte.question, null);
        assert.equal(gameState.gameTime, 0);
    }
    start.dispatchEvent(new Event("click"));
    assert.equal(tutorialFrame()?.screen,'prompt');tutorialAction('skip');
    assert.equal(gameState.phase, "match_intro");
    finishMatchIntro();
    assert.equal(gameState.phase, "idle");
    assert.equal(gameState.difficulty, "hard");
    assert.equal(panel.hidden, true);
    assert.equal(canvas.hidden, false);
    assert.equal(controls.hidden, false);
    assert.equal(gameState.playerHealth, 100);
    assert.equal(gameState.enemyHealth, 150);
    assert.equal(gameState.commonAttackCount, 0);
    assert.equal(simulationDelta(0.04), 0.04);
    assert.match(readFileSync(new URL("../index.html", import.meta.url), "utf8"), /id="game-canvas" width="640" height="360"/);
});

test("revanche mantém a dificuldade e voltar ao lobby permite escolher outra", () => {
    gameState.difficulty = "hard";
    const { clickResult, panel, options, start } = mountLobby();
    gameState.offensiveAI.playerHistory.push("hook");
    applyImpactDamage("enemy", 100, "win");
    (updateKnockout(gameState,KO_DURATION), updateCeremony)(gameState, 5);
    clickResult(RESTART_BUTTON);
    assert.equal(gameState.phase, "match_intro");
    finishMatchIntro();
    assert.equal(gameState.phase, "idle");
    assert.equal(gameState.difficulty, "hard");
    assert.equal(gameState.enemyHealth, 150);
    assert.deepEqual(gameState.offensiveAI.playerHistory, []);
    applyImpactDamage("player", 100, "loss");
    (updateKnockout(gameState,KO_DURATION), updateCeremony)(gameState, 5);
    clickResult(LOBBY_BUTTON);
    assert.equal(gameState.phase, "lobby");
    assert.equal(panel.hidden, false);
    assert.equal(gameState.counterChain.active, false);
    assert.equal(gameState.stun.remaining, 0);
    options[0].dispatchEvent(new Event("click"));
    start.dispatchEvent(new Event("click"));
    assert.equal(tutorialFrame()?.screen,'prompt');tutorialAction('skip');
    assert.equal(gameState.difficulty, "easy");
    assert.equal(gameState.phase, "match_intro");
    finishMatchIntro();
    assert.equal(gameState.phase, "idle");
});

test("perfis aplicam intervalo, precisão, esquiva antes do bloqueio e pesos", () => {
    const cases = [
        ["easy", 6, 9, 0.65, 0.10, [50, 30, 15, 5]],
        ["normal", 4, 7, 0.80, 0.15, [35, 35, 20, 10]],
        ["hard", 3, 5, 0.90, 0.20, [25, 35, 25, 15]]
    ];
    for (const [difficulty, min, max, accuracy, dodge, weights] of cases) {
        gameState.difficulty = difficulty;
        restartFight();
        assert.deepEqual(activeDifficulty().weights, weights);
        const midpoint = mock.method(Math, "random", () => 0.5);
        updateOffensiveClock(0);
        assert.equal(gameState.offensiveAI.remaining, (min + max) / 2);
        midpoint.mock.restore();
        const rolls = [0.9, 0.22, 0.99];
        const incoming = mock.method(Math, "random", () => rolls.shift());
        assert.equal(beginSpontaneousAttack(), true);
        assert.equal(gameState.counterAttack.accuracy, accuracy);
        assert.equal(gameState.counterAttack.naturalMiss, difficulty === "easy");
        assert.equal(gameState.counterAttack.type, "uppercut");
        assert.equal(gameState.counterAttack.baseDamage, 20);
        setDebugEnabled(true);
        assert.equal(readDebugSnapshot().aiAttack, "UPPERCUT");
        assert.equal(readDebugSnapshot().aiDodge, `${Math.round(dodge * 100)}%`);
        assert.equal(readDebugSnapshot().aiInterval, `${min}–${max} s`);
        incoming.mock.restore();
        for (const [roll, outcome] of [[dodge - 0.001, "dodged"], [dodge, "blocked"]]) {
            restartFight();
            const responseRolls = [roll, 0];
            const random = mock.method(Math, "random", () => responseRolls.shift());
            decideOpponentResponse({ questionId: "profile", outcome: "correct", kind: "attack", punchType: "jab", arm: "left" }, 0.1);
            assert.equal(gameState.lastAttackResult.outcome, outcome);
            assert.equal(random.mock.callCount(), 2);
            random.mock.restore();
        }
    }
});

test("Fácil permite repetição e Normal evita o terceiro golpe idêntico", () => {
    mock.method(Math, "random", () => 0);
    gameState.difficulty = "easy";
    assert.deepEqual([chooseBotAttack(), chooseBotAttack(), chooseBotAttack()], ["jab", "jab", "jab"]);
    assert.deepEqual(gameState.offensiveAI.botHistory, []);
    gameState.difficulty = "normal";
    assert.deepEqual([chooseBotAttack(), chooseBotAttack(), chooseBotAttack()], ["jab", "jab", "straight"]);
});

test("Difícil conserva só cinco tentativas aceitas e adapta guarda e escolha", () => {
    mock.method(Math, "random", () => 0.99);
    offensiveAIConfig.enabled = false;
    gameState.difficulty = "hard";
    const attacks = ["jab", "hook", "jab", "uppercut", "jab", "hook"];
    for (const [index, type] of attacks.entries()) {
        const previous = [...gameState.offensiveAI.playerHistory];
        assert.equal(selectPunch(type), true);
        assert.deepEqual(gameState.offensiveAI.playerHistory, previous);
        assert.equal(requestPunch("invalid"), false);
        assert.deepEqual(gameState.offensiveAI.playerHistory, previous);
        assert.equal(requestPunch("left"), true);
        assert.deepEqual(gameState.offensiveAI.playerHistory, attacks.slice(Math.max(0, index - 4), index + 1));
        if (gameState.qte.question) {
            const { id, correctAnswer } = gameState.qte.question;
            submitAttackAnswer(correctAnswer, id);
        }
        assert.equal(requestPunch("right"), false);
        assert.equal(gameState.lastAttackResult.outcome, "hit");
        updateCombat(0.8);
        updateCombat(2);
    }
    assert.equal(usesCautiousGuard(), true);
    setDebugEnabled(true);
    assert.match(readDebugSnapshot().aiMemory, /^5\/5.*cautelosa/);
    const strategic = mock.method(Math, "random", () => 0.27);
    assert.equal(chooseBotAttack(), "jab"); // Guarda cautelosa sobe o peso de 25 para 30.
    strategic.mock.restore();
    restartFight();
    assert.deepEqual(gameState.offensiveAI.playerHistory, []);
    assert.equal(usesCautiousGuard(), false);
    gameState.difficulty = "easy";
    assert.equal(requestPunch("left"), true);
    assert.deepEqual(gameState.offensiveAI.playerHistory, []);
});

test("Counter Chain em Difícil mantém reações especiais a 80% e termina após quatro etapas", () => {
    gameState.difficulty = "hard";
    mock.method(Math, "random", () => 0.99);
    const defend = () => {
        assert.equal(selectDefenseSide(gameState.defense.expectedSide), true);
        const { id, correctAnswer } = gameState.qte.question;
        assert.equal(submitDefenseAnswer(correctAnswer, id), true);
        updateCombat(0.55);
    };
    assert.equal(beginSpontaneousAttack(), true);
    assert.equal(gameState.counterAttack.accuracy, 0.9);
    defend();
    assert.equal(gameState.counterRush.cutsceneRemaining, 3);
    updateCombat(3.12);
    selectPunch("jab");
    for (let stage = 1; stage <= 4; stage++) {
        assert.equal(gameState.counterChain.count, stage);
        assert.equal(requestPunch("left"), true);
        const { id, correctAnswer } = gameState.qte.question;
        submitAttackAnswer(correctAnswer, id);
        updateCombat(0.4);
        if (stage < 4) {
            updateCombat(0.22);
            assert.equal(gameState.counterAttack.source, "counter_chain");
            assert.equal(gameState.counterAttack.accuracy, 0.8);
            assert.equal(gameState.counterAttack.type, "straight");
            defend();
            updateCombat(0.5);
        }
    }
    assert.equal(gameState.enemyHealth, 55);
    assert.equal(gameState.counterChain.active, false);
    assert.equal(gameState.stun.remaining, 7);
    assert.equal(gameState.offensiveAI.sequence, 1);
});

test("retorno ao lobby apos a cerimonia funciona para ambos os vencedores", () => {
    for (const target of ["enemy", "player"]) {
        gameState.difficulty = "hard";
        restartFight();
        const { panel, canvas, controls, start, clickResult } = mountLobby();
        applyImpactDamage(target, 1000, "ceremony-lobby");
        const oldMatchId = gameState.matchId;
        (updateKnockout(gameState,KO_DURATION), updateCeremony)(gameState, 4);
        clickResult(LOBBY_BUTTON);
        assert.equal(gameState.matchId, oldMatchId);
        assert.notEqual(gameState.phase, "lobby");
        (updateKnockout(gameState,KO_DURATION), updateCeremony)(gameState, 1.1);
        clickResult(LOBBY_BUTTON);
        assert.equal(gameState.phase, "lobby");
        assert.equal(panel.hidden, false);
        assert.equal(canvas.hidden, true);
        assert.equal(controls.hidden, true);
        assert.equal(gameState.difficulty, "hard");
        assert.equal(gameState.matchResult, null);
        assert.equal(gameState.qte.question, null);
        assert.equal(gameState.counterChain.active, false);
        assert.equal(gameState.counterRush.remaining, 0);
        assert.equal(gameState.stun.remaining, 0);
        start.dispatchEvent(new Event("click"));
        assert.equal(tutorialFrame()?.screen,'prompt');tutorialAction('skip');
        assert.equal(gameState.phase, "match_intro");
    finishMatchIntro();
    assert.equal(gameState.phase, "idle");
        assert.equal(panel.hidden, true);
        assert.equal(canvas.hidden, false);
        assert.equal(controls.hidden, false);
        assert.equal(gameState.playerHealth, 100);
        assert.equal(gameState.enemyHealth, 150);
    }
});

