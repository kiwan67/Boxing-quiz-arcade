import { updateKnockout, KO_DURATION } from '../js/knockout.js';
import assert from "node:assert/strict";
import { test, beforeEach, afterEach, mock } from "node:test";
import { restartFight } from "../js/restart.js";
import { gameState } from "../js/gameState.js";
import { beginSpontaneousAttack, beginCounterAttack } from "../js/counterAttack.js";
import { selectDefenseSide, submitDefenseAnswer } from './helpers/defenseApi.mjs';
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { selectPunch } from "../js/punches.js";
import { PUNCH_ORDER, PUNCH_TYPES } from "../js/punchTypes.js";
import { beginCounterRushWindow, COUNTER_RUSH_WINDOW_TIME, COUNTER_RUSH_QTE_TIME, COUNTER_RUSH_DAMAGE_MULTIPLIER } from "../js/counterRush.js";
import { enemyAccuracyDebug } from "../js/enemyAccuracy.js";
import { applyImpactDamage, resolvePlayerImpact } from "../js/match.js";
import { updateCharacters, characters } from "../js/characters.js";
import { finishCounterRushIntroForTest } from "./helpers/fight.mjs";

const timing = type => PUNCH_TYPES[type].timing;
const impact = type => timing(type).preparation + timing(type).advance;
const total = type => Object.values(timing(type)).reduce((a, b) => a + b, 0);
const reset = () => { restartFight(); gameState.offensiveAI.remaining = 1000000; };
beforeEach(() => { reset(); enemyAccuracyDebug.forceOutcome = null; mock.method(Math, "random", () => 0.99); });
afterEach(() => { mock.restoreAll(); enemyAccuracyDebug.forceOutcome = null; });

function defense(sideCorrect = true, questionCorrect = true) {
    assert.equal(beginSpontaneousAttack(), true);
    updateCombat(0.12);
    const side = gameState.defense.expectedSide;
    selectDefenseSide(sideCorrect ? side : side === "left" ? "right" : "left");
    const q = gameState.qte.question;
    submitDefenseAnswer(questionCorrect ? q.correctAnswer : q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
    updateCombat(0.12);
    assert.notEqual(gameState.playerCombat.state, "counter_rush_window");
    updateCombat(0.31);
}

function window() {
    defense();
    finishCounterRushIntroForTest();
    assert.equal(gameState.playerCombat.state, "counter_rush_window");
    assert.equal(gameState.counterRush.remaining, 2.5);
    assert.equal(gameState.playerCooldown.remaining, 0);
    assert.equal(gameState.reactions.player.remaining, 0);
}

function rush(type = "jab", arm = "left") {
    selectPunch(type);
    assert.equal(requestPunch(arm), true);
    assert.equal(gameState.playerCombat.state, "counter_rush_qte");
    assert.equal(gameState.qte.remaining, 5);
    assert.equal(gameState.qte.question.kind, "counter_rush");
    assert.equal(gameState.counterRush.remaining, 0);
    return gameState.qte.question;
}

test("defesa perfeita preserva 90% de redução e abre uma única janela de 2,5 s após recuperar", () => {
    assert.equal(COUNTER_RUSH_WINDOW_TIME, 2.5);
    assert.equal(COUNTER_RUSH_QTE_TIME, 5);
    assert.equal(COUNTER_RUSH_DAMAGE_MULTIPLIER, 1.5);
    window();
    assert.equal(gameState.playerHealth, 98);
    assert.equal(beginCounterRushWindow(), false);
    updateCombat(2.499);
    assert.equal(gameState.playerCombat.state, "counter_rush_window");
    updateCombat(0.001);
    assert.equal(gameState.playerCombat.state, "action_cooldown");
    assert.equal(gameState.playerCooldown.remaining, 2);
    assert.equal(beginCounterRushWindow(), false);
    assert.ok(gameState.counterRush.feedbackRemaining > 0);
    assert.deepEqual(gameState.punches.cooldowns, { jab: 0, straight: 0, hook: 0, uppercut: 0 });
});

test("defesas parciais, falhas, timeouts e erro natural não abrem Counter Rush", () => {
    for (const [side, question] of [[true,false],[false,true],[false,false]]) {
        reset(); defense(side, question);
        assert.equal(gameState.playerCombat.state, !side && !question ? "stun_recovery" : "action_cooldown");
        assert.equal(gameState.counterRush.remaining, 0);
    }
    reset(); beginSpontaneousAttack(); updateCombat(13.55);
    assert.equal(gameState.counterRush.remaining, 0);
    reset(); enemyAccuracyDebug.forceOutcome = "miss"; defense();
    assert.equal(gameState.playerHealth, 100);
    assert.equal(gameState.playerCombat.state, "action_cooldown");
});

test("quatro golpes, ambos os braços, aplicam 1,5× uma única vez e mantêm recargas", () => {
    for (const type of PUNCH_ORDER) for (const arm of ["left", "right"]) {
        reset(); window();
        const q = rush(type, arm);
        const once = { ...gameState.punches.cooldowns };
        assert.equal(once[type], PUNCH_TYPES[type].cooldownActions);
        selectPunch("jab");
        assert.equal(submitAttackAnswer(q.correctAnswer, q.id), true);
        assert.equal(gameState.playerCombat.state, "counter_rush_resolution");
        assert.equal(submitAttackAnswer(q.correctAnswer, q.id), false);
        assert.equal(requestPunch("right"), false);
        updateCombat(impact(type) - 0.001);
        assert.equal(gameState.enemyHealth, 100);
        updateCombat(0.001); updateCharacters(0);
        assert.equal(gameState.enemyHealth, 100 - PUNCH_TYPES[type].damage * 1.5);
        assert.equal(gameState.lastAttackResult.kind, "counter_rush");
        assert.equal(characters.player.animationState, `punch_${arm}`);
        assert.equal(characters.opponent.animationState, "hit");
        assert.equal(resolvePlayerImpact(), false);
        updateCombat(total(type) - impact(type));
        assert.equal(gameState.playerCombat.state, "counter_chain_recovery");
        assert.equal(gameState.playerCooldown.remaining, 0);
        assert.deepEqual(gameState.punches.cooldowns, once);
        assert.equal(gameState.pendingRiskBonus, 0);
    }
});

test("falha e timeout de 5 s não causam dano, risco ou outro contra-ataque", () => {
    for (const timeout of [false,true]) {
        reset(); window(); const q = rush("uppercut", "right");
        const once = { ...gameState.punches.cooldowns };
        const counter = gameState.counterAttack.questionId;
        if (timeout) {
            updateCombat(4.999);
            assert.equal(gameState.playerCombat.state, "counter_rush_qte");
            updateCombat(0.001);
        } else submitAttackAnswer(q.alternatives.find(answer => answer !== q.correctAnswer), q.id);
        assert.equal(gameState.playerCombat.state, "action_cooldown");
        assert.equal(gameState.enemyHealth, 100);
        assert.equal(gameState.pendingRiskBonus, 0);
        assert.equal(gameState.counterAttack.pending, false);
        assert.equal(gameState.counterAttack.questionId, counter);
        assert.deepEqual(gameState.punches.cooldowns, once);
        assert.equal(gameState.playerCooldown.remaining, 2);
        assert.equal(submitAttackAnswer(q.correctAnswer, q.id), false);
    }
});

test("Counter Rush ignora esquiva, sorteia somente bloqueio e preserva dano especial", () => {
    for (const type of PUNCH_ORDER) for (const outcome of ["hit", "blocked"]) {
        reset(); window(); const q = rush(type);
        const rolls = outcome === "hit" ? [0.99] : [0];
        const random = mock.method(Math, "random", () => rolls.shift() ?? 0.99);
        submitAttackAnswer(q.correctAnswer, q.id);
        assert.equal(gameState.lastAttackResult.dodgeDirection, null);
        assert.equal(gameState.opponentCombat.state.startsWith("dodge_"), false);
        updateCombat(total(type));
        assert.equal(gameState.lastAttackResult.outcome, outcome);
        assert.equal(gameState.enemyHealth, 100 - PUNCH_TYPES[type].damage * 1.5 * (outcome === "blocked" ? 0.25 : 1));
        assert.equal(gameState.playerCombat.state, outcome === "hit" ? "counter_chain_recovery" : "action_cooldown");
        assert.equal(random.mock.callCount(), 1);
        random.mock.restore();
    }
});

test("seleção indisponível não consome turno; Jab disponível avança outros contadores só ao abrir QTE", () => {
    window();
    gameState.punches.cooldowns.uppercut = 3;
    selectPunch("uppercut");
    const before = { ...gameState.punches.cooldowns };
    assert.equal(requestPunch("right"), false);
    assert.deepEqual(gameState.punches.cooldowns, before);
    assert.equal(gameState.counterRush.remaining, 2.5);
    selectPunch("jab");
    assert.deepEqual(gameState.punches.cooldowns, before);
    const q = rush("jab", "right");
    assert.equal(gameState.punches.cooldowns.uppercut, 2);
    assert.equal(gameState.punches.cooldowns.jab, 0);
    submitAttackAnswer(q.correctAnswer, q.id); updateCombat(total("jab"));
    assert.equal(gameState.punches.cooldowns.uppercut, 2);
});

test("IA e cooldown geral não interrompem janela, QTE ou resolução; relógio ofensivo é reagendado", () => {
    window(); gameState.offensiveAI.remaining = 0;
    updateCombat(1);
    assert.equal(gameState.playerCombat.state, "counter_rush_window");
    assert.equal(gameState.offensiveAI.remaining, null);
    assert.equal(beginSpontaneousAttack(), false);
    const q = rush("jab");
    updateCombat(4); assert.equal(gameState.qte.remaining, 1);
    assert.equal(beginSpontaneousAttack(), false);
    submitAttackAnswer(q.correctAnswer, q.id);
    updateCombat(0.2);
    assert.equal(gameState.playerCombat.state, "counter_rush_resolution");
    assert.equal(beginSpontaneousAttack(), false);
    updateCombat(0.2);
    assert.equal(gameState.playerCooldown.remaining, 0);
    updateCombat(0.22);
    selectDefenseSide(gameState.defense.expectedSide === "left" ? "right" : "left");
    const defenseQ = gameState.qte.question;
    submitDefenseAnswer(defenseQ.correctAnswer, defenseQ.id);
    updateCombat(0.55);
    assert.equal(gameState.playerCooldown.remaining, 2);
    updateCombat(0);
    assert.ok(gameState.offensiveAI.remaining >= 4 && gameState.offensiveAI.remaining <= 7);
    updateCombat(2); assert.equal(gameState.playerCombat.state, "idle");
});

test("fim da luta e reinício cancelam janela, QTE e resolução sem efeitos atrasados", () => {
    for (const phase of ["window", "qte", "resolution"]) for (const target of ["enemy", "player"]) {
        reset(); window();
        if (phase !== "window") {
            const q = rush("uppercut");
            if (phase === "resolution") submitAttackAnswer(q.correctAnswer, q.id);
        }
        applyImpactDamage(target, 100, `end-${phase}-${target}`);
        updateCombat(100);
        assert.equal(gameState.counterRush.remaining, 0);
        assert.equal(gameState.qte.question, null);
        assert.equal(requestPunch("left"), false);
        assert.equal(beginCounterRushWindow(), false);
        restartFight(); updateCharacters(0);
        assert.equal(gameState.counterRush.defenseId, null);
        assert.equal(gameState.playerCombat.state, "idle");
        assert.equal(gameState.playerHealth, 100);
        assert.equal(gameState.enemyHealth, 100);
        assert.equal(characters.player.torsoX, 0);
    }
});

test("pausa e diferentes taxas de quadros preservam temporizadores e dano especial único", () => {
    for (const fps of [30, 60, 144, 0.2]) {
        reset(); window(); const q = rush("jab");
        submitAttackAnswer(q.correctAnswer, q.id);
        for (let frame = 0; frame < Math.ceil(total("jab") * fps); frame++) updateCombat(1 / fps);
        assert.equal(gameState.enemyHealth, 92.5);
        assert.equal(gameState.opponentCombat.state, "idle");
        assert.equal(resolvePlayerImpact(), false);
        assert.ok(["counter_chain_recovery", "defense_direction_qte"].includes(gameState.playerCombat.state));
    }
    reset(); window();
    gameState.phase = "paused"; updateCombat(100);
    assert.equal(gameState.counterRush.remaining, 2.5);
    gameState.phase = "idle"; const q = rush("jab");
    gameState.phase = "paused"; updateCombat(100);
    assert.equal(gameState.qte.question, q);
    assert.equal(gameState.qte.remaining, 5);
    gameState.phase = "idle"; updateCombat(5);
    assert.equal(gameState.playerCombat.state, "action_cooldown");
    assert.equal(gameState.playerCooldown.remaining, 2);
});

test("Uppercut especial pode vencer; reinício restaura dano normal sem multiplicador acumulado", () => {
    window(); gameState.enemyHealth = 37.5;
    const q = rush("uppercut", "right"); submitAttackAnswer(q.correctAnswer, q.id);
    updateCombat(impact("uppercut"));
    updateKnockout(gameState,KO_DURATION); assert.equal(gameState.phase,"victory");
    assert.equal(gameState.enemyHealth, 0);
    assert.equal(gameState.lastAttackResult.damageApplied, 37.5);
    assert.equal(gameState.counterRush.remaining, 0);
    assert.equal(requestPunch("left"), false);
    reset(); requestPunch("left");
    const normal = gameState.qte.question; submitAttackAnswer(normal.correctAnswer, normal.id);
    updateCombat(impact("straight"));
    assert.equal(gameState.enemyHealth, 90);
    assert.equal(gameState.lastAttackResult.kind, "attack");
    assert.equal(gameState.attackFeedback.rush, false);
});

test("sorteio de 8% verifica somente bloqueio no especial, mas ainda permite esquiva normal", () => {
    for (const type of PUNCH_ORDER) {
        reset(); window(); const q = rush(type);
        const random = mock.method(Math, "random", () => 0.08);
        submitAttackAnswer(q.correctAnswer, q.id);
        assert.equal(random.mock.callCount(), 1);
        assert.equal(gameState.lastAttackResult.outcome, type === "jab" ? "hit" : "blocked");
        assert.equal(gameState.lastAttackResult.dodgeDirection, null);
        random.mock.restore();
    }
    reset(); selectPunch("jab"); requestPunch("left");
    const q = gameState.qte.question;
    const random = mock.method(Math, "random", () => 0.08);
    submitAttackAnswer(q.correctAnswer, q.id);
    assert.equal(random.mock.callCount(), 2); // Esquiva normal e direção.
    assert.equal(gameState.lastAttackResult.outcome, "dodged");
    updateCombat(total("jab"));
    assert.equal(gameState.enemyHealth, 100);
    random.mock.restore();
});

