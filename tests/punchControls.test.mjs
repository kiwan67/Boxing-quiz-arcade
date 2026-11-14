import assert from "node:assert/strict";
import { test, beforeEach, mock } from "node:test";
import { gameState } from "../js/gameState.js";
import { restartFight } from "../js/restart.js";
import { PUNCH_TYPES, PUNCH_ORDER } from "../js/punchTypes.js";
import { initializePunchControls, updatePunchControls } from "../js/punchControls.js";
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { applyImpactDamage } from "../js/match.js";
import { consumePunchCooldown, isPunchReady } from "../js/punches.js";

class Element extends EventTarget {
    textContent = "";
    style = {};
    disabled = false;
    attrs = new Map();
    classes = new Set();
    addedClicks = 0;
    classList = { toggle: (name, value) => { if (value) this.classes.add(name); else this.classes.delete(name); } };
    getAttribute(name) { return this.attrs.get(name) ?? null; }
    setAttribute(name, value) { this.attrs.set(name, value); }
    addEventListener(name, listener, options) {
        if (name === "click") this.addedClicks++;
        super.addEventListener(name, listener, options);
    }
}

function controls() {
    const buttons = PUNCH_ORDER.map(type => {
        const button = new Element();
        button.dataset = { punch: type };
        button.parts = Object.fromEntries(["name", "damage", "status", "progress"].map(name => [name, new Element()]));
        button.querySelector = selector => button.parts[selector.slice(6, -1)];
        return button;
    });
    const container = new Element();
    container.querySelectorAll = () => buttons;
    initializePunchControls(container);
    return { buttons, container };
}

function click(button, mouseButton = 0) {
    const event = new Event("click", { cancelable: true, bubbles: true });
    Object.defineProperty(event, "button", { value: mouseButton });
    button.dispatchEvent(event);
    return event;
}

beforeEach(() => { restartFight(); gameState.offensiveAI.remaining = 1000000; });

test("quatro botões mostram configuração, destacam seleção e nunca iniciam socos", () => {
    const { buttons, container } = controls();
    initializePunchControls(container);
    assert.deepEqual(buttons.map(b => b.addedClicks), [1,1,1,1]);
    assert.equal(buttons[1].getAttribute("aria-pressed"), "true");
    for (const button of buttons) {
        const type = button.dataset.punch;
        assert.equal(button.parts.name.textContent, PUNCH_TYPES[type].label);
        assert.equal(button.parts.damage.textContent, `${PUNCH_TYPES[type].damage} HP`);
        assert.equal(button.parts.status.textContent, "PRONTO");
        assert.equal(button.parts.progress.style.width, "100%");
        const event = click(button);
        assert.equal(event.defaultPrevented, true);
        assert.equal(gameState.punches.selected, type);
        assert.equal(button.getAttribute("aria-pressed"), "true");
        assert.equal(button.classes.has("is-selected"), true);
        assert.equal(gameState.playerCombat.state, "idle");
        assert.equal(gameState.qte.question, null);
        assert.equal(gameState.qte.sequence, 0);
        assert.deepEqual(Object.values(gameState.punches.cooldowns), [0,0,0,0]);
        updateCombat(0.1); updatePunchControls();
        assert.equal(gameState.punches.selected, type);
    }
    assert.equal(buttons.filter(b => b.classes.has("is-selected")).length, 1);
    click(buttons[0], 2);
    assert.equal(gameState.punches.selected, "uppercut");
});

test("seleção em recarga persiste e a interface mostra turnos, sem reduzir por tempo", () => {
    const { buttons } = controls();
    const uppercut = buttons[3];
    click(uppercut); requestPunch("right"); updatePunchControls();
    assert.equal(uppercut.parts.status.textContent, "5 TURNOS");
    assert.equal(uppercut.parts.progress.style.width, "0%");
    assert.equal(uppercut.classes.has("is-selected"), true);
    assert.equal(uppercut.classes.has("is-cooling"), true);
    assert.equal(uppercut.disabled, false); // Seleção é permitida; execução aguarda recarga.
    const question = gameState.qte.question;
    click(buttons[0]);
    assert.equal(gameState.punches.selected, "jab");
    assert.equal(gameState.punches.cooldowns.jab, 0);
    assert.equal(gameState.qte.question, question);
    assert.equal(gameState.qte.pendingPunchType, "uppercut");
    click(uppercut);
    updateCombat(2); updatePunchControls();
    assert.equal(uppercut.parts.status.textContent, "5 TURNOS");
    assert.equal(uppercut.parts.progress.style.width, "0%");
    assert.equal(gameState.punches.selected, "uppercut");
    submitAttackAnswer(question.correctAnswer, question.id);
    const upperTiming = Object.values(PUNCH_TYPES.uppercut.timing).reduce((sum, value) => sum + value, 0);
    updateCombat(upperTiming + 2);
    const actions = ["jab", "straight", "jab", "hook", "jab"];
    for (let index = 0; index < actions.length; index++) {
        const type = actions[index];
        click(buttons.find(b => b.dataset.punch === type));
        assert.equal(requestPunch("left"), true);
        updatePunchControls();
        const remaining = 4 - index;
        assert.equal(uppercut.parts.status.textContent, remaining === 0 ? "PRONTO" : `${remaining} ${remaining === 1 ? "TURNO" : "TURNOS"}`);
        assert.equal(uppercut.parts.progress.style.width, `${(index + 1) * 20}%`);
        if (remaining === 0) click(uppercut); // Mantém selecionado durante a última sequência.
        const q = gameState.qte.question;
        submitAttackAnswer(q.correctAnswer, q.id);
        updateCombat(Object.values(PUNCH_TYPES[type].timing).reduce((sum, value) => sum + value, 0) + 2);
    }
    updatePunchControls(); // Nenhum clique adicional após a recuperação.
    assert.equal(uppercut.parts.status.textContent, "PRONTO");
    assert.equal(uppercut.parts.progress.style.width, "100%");
    assert.equal(uppercut.classes.has("is-cooling"), false);
    assert.equal(uppercut.classes.has("is-selected"), true);
    assert.equal(requestPunch("right"), true);
    assert.equal(gameState.qte.pendingPunchType, "uppercut");
});

test("fim congela recargas e bloqueia botões; reinício restaura Direto disponível", () => {
    const { buttons } = controls();
    click(buttons[3]); requestPunch("left"); updateCombat(1); updatePunchControls();
    const frozen = { ...gameState.punches.cooldowns };
    applyImpactDamage("player", 100, "end-ui"); updateCombat(100); updatePunchControls();
    assert.deepEqual(gameState.punches.cooldowns, frozen);
    assert.ok(buttons.every(b => b.disabled));
    click(buttons[0]);
    assert.equal(gameState.punches.selected, "uppercut");
    restartFight();
    assert.equal(gameState.punches.selected, "straight");
    assert.equal(buttons[1].getAttribute("aria-pressed"), "true");
    assert.ok(buttons.every(b => !b.disabled && b.parts.status.textContent === "PRONTO"));
    assert.deepEqual(Object.values(gameState.punches.cooldowns), [0,0,0,0]);
    assert.equal(requestPunch("left"), true);
});

test("contextmenu é bloqueado na faixa de golpes e preservado fora dela", () => {
    const { container } = controls();
    const inside = new Event("contextmenu", { cancelable: true });
    container.dispatchEvent(inside);
    assert.equal(inside.defaultPrevented, true);
    const outside = new Event("contextmenu", { cancelable: true });
    new EventTarget().dispatchEvent(outside);
    assert.equal(outside.defaultPrevented, false);
});

test("selecionado passa de recarga a PRONTO e ataca sem novo clique de seleção", () => {
    const otherActions = {
        jab: [],
        straight: ["jab", "hook"],
        hook: ["jab", "straight", "jab"],
        uppercut: ["jab", "straight", "jab", "hook", "jab"]
    };
    for (const type of PUNCH_ORDER) {
        restartFight(); gameState.offensiveAI.remaining = 1000000;
        const { buttons } = controls();
        const selected = buttons.find(button => button.dataset.punch === type);
        click(selected);
        assert.equal(requestPunch("left"), true);
        const question = gameState.qte.question;
        submitAttackAnswer(question.correctAnswer, question.id);
        updateCombat(Object.values(PUNCH_TYPES[type].timing).reduce((a, b) => a + b, 0));
        updateCombat(2);
        updatePunchControls();
        assert.equal(isPunchReady(type), type === "jab");
        if (type !== "jab") assert.equal(requestPunch("right"), false);
        const before = { ...gameState.punches.cooldowns };
        updateCombat(20); updatePunchControls();
        assert.deepEqual(gameState.punches.cooldowns, before);
        // Isola a transição dos turnos da seleção. Em produção esta função é
        // chamada ao aceitar outro ataque; não cria timers nem libera o selecionado.
        for (const other of otherActions[type]) {
            assert.equal(consumePunchCooldown(other), true);
            // A mudança de turno sincroniza a interface, sem clique ou frame extra.
            assert.equal(gameState.punches.selected, type);
            assert.equal(selected.classes.has("is-selected"), true);
        }
        assert.equal(isPunchReady(type), true);
        assert.equal(selected.parts.status.textContent, "PRONTO");
        assert.equal(selected.parts.progress.style.width, "100%");
        assert.equal(selected.classes.has("is-cooling"), false);
        assert.equal(selected.getAttribute("aria-pressed"), "true");
        assert.equal(requestPunch("right"), true);
        assert.equal(gameState.qte.pendingPunchType, type);
        assert.equal(gameState.qte.pendingPunch, "right");
        assert.equal(gameState.punches.cooldowns[type], PUNCH_TYPES[type].cooldownActions);
    }
});

test("fluxo completo libera os quatro golpes sem nova seleção após recuperar, com HUD automática", () => {
    const random = mock.method(Math, "random", () => 0.99);
    const finishAttempt = () => {
        const question = gameState.qte.question;
        const type = gameState.qte.pendingPunchType;
        assert.equal(submitAttackAnswer(question.correctAnswer, question.id), true);
        const duration = Object.values(PUNCH_TYPES[type].timing).reduce((a, b) => a + b, 0);
        updateCombat(duration);
        assert.equal(gameState.playerCombat.state, "action_cooldown");
        const before = { ...gameState.punches.cooldowns };
        assert.equal(requestPunch("left"), false);
        assert.equal(requestPunch("right"), false);
        assert.deepEqual(gameState.punches.cooldowns, before);
        updateCombat(2.001);
        assert.equal(gameState.playerCombat.state, "idle");
    };
    try {
        for (const type of PUNCH_ORDER) {
            restartFight(); gameState.offensiveAI.remaining = 1000000;
            const { buttons } = controls();
            const selected = buttons.find(button => button.dataset.punch === type);
            const jab = buttons.find(button => button.dataset.punch === "jab");
            click(selected);
            assert.equal(requestPunch("left"), true);
            finishAttempt();
            const turns = PUNCH_TYPES[type].cooldownActions;
            const initial = { ...gameState.punches.cooldowns };
            updateCombat(20);
            assert.deepEqual(gameState.punches.cooldowns, initial);
            for (let remaining = turns; remaining > 0; remaining--) {
                assert.equal(requestPunch("right"), false);
                assert.equal(gameState.punches.cooldowns[type], remaining);
                click(jab);
                assert.equal(requestPunch("left"), true);
                // Conferência antes de clicar no alvo ou atualizar a HUD manualmente.
                assert.equal(gameState.punches.cooldowns[type], remaining - 1);
                assert.equal(selected.parts.status.textContent, remaining === 1 ? "PRONTO"
                    : `${remaining - 1} ${remaining === 2 ? "TURNO" : "TURNOS"}`);
                click(selected); // Preserva a seleção durante QTE, animação e cooldown.
                const once = { ...gameState.punches.cooldowns };
                assert.equal(requestPunch("right"), false);
                assert.deepEqual(gameState.punches.cooldowns, once);
                finishAttempt();
            }
            assert.equal(gameState.punches.selected, type);
            assert.equal(selected.parts.status.textContent, "PRONTO");
            assert.equal(selected.classes.has("is-cooling"), false);
            assert.equal(selected.classes.has("is-selected"), true);
            assert.equal(selected.parts.progress.style.width, "100%");
            assert.equal(selected.disabled, false);
            // Nenhuma nova seleção nem chamada a updatePunchControls neste ponto.
            assert.equal(requestPunch("right"), true);
            assert.equal(gameState.qte.pendingPunchType, type);
            assert.equal(gameState.qte.pendingPunch, "right");
            restartFight();
            assert.deepEqual(gameState.punches.cooldowns, { jab: 0, straight: 0, hook: 0, uppercut: 0 });
            assert.ok(buttons.every(button => button.parts.status.textContent === "PRONTO"));
        }
    } finally { random.mock.restore(); }
});
