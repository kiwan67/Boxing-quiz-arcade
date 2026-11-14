import test from "node:test";
import assert from "node:assert/strict";
import { arenaEffects, arenaShakeX, drawArenaImpact, drawDecisiveFlash, updateArenaEffects } from "../js/arenaEffects.js";
import { createScenery, drawAudienceMotion } from "../js/scenery.js";
import { resetSimulationClock, setGameSpeed, simulationDelta } from "../js/simulationClock.js";

function fight(matchId) {
    return { matchId, phase: "fight", counterChain: { count: 0 }, defense: {},
        counterAttack: { type: "hook" }, stun: { remaining: 0 } };
}

function attack(punchType, outcome = "hit", kind = "attack") {
    return { punchType, outcome, kind, arm: "left", impactResolved: true, damageApplied: 5 };
}

test("efeitos observam dano confirmado uma vez e graduam a intensidade por golpe", () => {
    const state = fight(1);
    for (const outcome of ["blocked", "dodged"]) {
        state.lastAttackResult = attack("uppercut", outcome);
        updateArenaEffects(state, 0);
        assert.equal(arenaEffects.intensity, 0);
        assert.equal(arenaEffects.crowdTime, 0);
    }
    for (const [index, punch] of ["jab", "straight", "hook", "uppercut"].entries()) {
        state.lastAttackResult = attack(punch);
        const before = structuredClone(state);
        updateArenaEffects(state, 0);
        assert.deepEqual(state, before);
        assert.equal(arenaEffects.intensity, index + 1);
        assert.equal(Math.abs(arenaShakeX()), Math.max(0, index - 1));
        updateArenaEffects(state, 0.03);
        assert.equal(arenaEffects.impactTime, 0.03);
    }
});

test("cadeia intensifica o efeito, Slow Motion controla sua duraÃ§Ã£o e reinÃ­cio limpa a arena", () => {
    const state = fight(2);
    state.counterChain.count = 3;
    state.lastAttackResult = attack("hook", "hit", "counter_rush");
    updateArenaEffects(state, 0);
    assert.equal(arenaEffects.intensity, 5);
    assert.equal(Math.abs(arenaShakeX()), 2);
    assert.equal(arenaEffects.rush, true);
    const ctx = { save() {}, restore() {}, calls: 0, fillRect() { this.calls++; } };
    drawArenaImpact(ctx);
    assert.ok(ctx.calls > 0 && ctx.calls <= 26);
    setGameSpeed(0.25);
    try {
        updateArenaEffects(state, simulationDelta(0.4));
        assert.equal(arenaEffects.impactTime, 0.1);
        updateArenaEffects(state, simulationDelta(0.56));
        const calls = ctx.calls;
        drawArenaImpact(ctx);
        assert.equal(ctx.calls, calls);
        assert.equal(arenaShakeX(), 0);
    } finally {
        resetSimulationClock();
    }
    updateArenaEffects(fight(3), 0);
    assert.equal(arenaEffects.crowdTime, 0);
});

test("impacto do bot, atordoamento e nocaute acionam reaÃ§Ãµes distintas", () => {
    const state = fight(4);
    state.defense.lastResult = { impactRegistered: true, damageApplied: 0 };
    updateArenaEffects(state, 0);
    assert.equal(arenaEffects.crowdTime, 0);
    state.defense.lastResult = { impactRegistered: true, damageApplied: 20, counterArm: "right" };
    state.stun.remaining = 2;
    updateArenaEffects(state, 0);
    assert.equal(arenaEffects.intensity, 3);
    assert.equal(arenaEffects.crowdTime, 1.1);
    updateArenaEffects(state, 0.1);
    assert.equal(arenaEffects.crowdTime, 1);
    state.phase = "defeat";
    state.defense.lastResult = { impactRegistered: true, damageApplied: 20 };
    updateArenaEffects(state, 0);
    const flashes = [];
    const ctx = { save() {}, restore() {}, fillRect(...args) { flashes.push(args); } };
    drawDecisiveFlash(ctx);
    updateArenaEffects(state, 0.1);
    drawDecisiveFlash(ctx);
    assert.deepEqual(flashes, [[0, 0, 640, 360]]);
});

test("plateia tem fases alternadas e orÃ§amento limitado de desenho por quadro", () => {
    const oldDocument = globalThis.document;
    const ctx = { calls: [], fillRect(...args) { this.calls.push([this.fillStyle, ...args]); },
        beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {} };
    globalThis.document = { createElement() { return { getContext: () => ctx }; } };
    try {
        const cache = createScenery(640, 360);
        assert.deepEqual([cache.width, cache.height], [640, 360]);
        assert.equal(ctx.imageSmoothingEnabled, false);
    } finally {
        globalThis.document = oldDocument;
    }
    function frame(time, cheer) {
        ctx.calls.length = 0;
        drawAudienceMotion(ctx, time, cheer);
        assert.ok(ctx.calls.length <= 700);
        return ctx.calls.slice();
    }
    const resting = frame(0, 0);
    const moved = frame(0.28, 0);
    const heads = calls => calls.filter(([color]) => color === "#111827");
    const shifts = heads(resting).filter((head, index) => head[2] !== heads(moved)[index][2]);
    assert.ok(shifts.length > 0 && shifts.length < heads(resting).length);
    assert.ok(frame(0, 0.7).length > resting.length);
    ctx.calls.length = 0;
    drawAudienceMotion(ctx, 3.7, 1, 0.2);
    const announced = ctx.calls.slice();
    assert.equal(heads(announced).length, heads(resting).length);
    assert.ok(heads(announced).every((head, index) => head[2] < heads(resting)[index][2]),
        "all animated groups react together to the announcement");
    const headHeights = heads(announced).map((head, index) => heads(resting)[index][2] - head[2]);
    assert.ok(new Set(headHeights).size > 1, "spectators react with different head movements");
    assert.ok(announced.length < heads(announced).length * 16,
        "one-arm and two-arm gestures coexist during the collective reaction");
    assert.ok(announced.length <= 700, "collective cheer retains a bounded draw budget");
    // Sample different phases and reaction strengths, including the announcement.
    for (const cheer of [0, 0.4, 0.85, 1]) {
        for (let sample = 0; sample < 120; sample += 1) {
            ctx.calls.length = 0;
            drawAudienceMotion(ctx, sample / 12, cheer);
            assert.ok(ctx.calls.length <= 700, "crowd stays within 700 pixel rectangles per frame");
        }
    }
    for (let sample = 0; sample < 60; sample += 1) {
        ctx.calls.length = 0;
        drawAudienceMotion(ctx, 3.5 + sample / 30, 1, sample / 30);
        assert.ok(ctx.calls.length <= 700, "announcement respects the same drawing limit");
    }
});

test("plateia comemora a abertura do Rush e a progressÃ£o da Chain sem esperar novo dano", () => {
    const state = fight(20);
    state.counterRush = { cutsceneRemaining: 3, remaining: 0 };
    const before = structuredClone(state);
    updateArenaEffects(state, 0);
    assert.deepEqual(state, before);
    assert.equal(arenaEffects.crowdTime, 1.2);
    updateArenaEffects(state, 2);
    assert.equal(arenaEffects.crowdTime, 0.85);
    state.counterRush.cutsceneRemaining = 0;
    state.counterChain.count = 2;
    updateArenaEffects(state, 0.1);
    assert.equal(arenaEffects.crowdTime, 1.4);
    updateArenaEffects(state, 2);
    assert.equal(arenaEffects.crowdTime, 0);
});

test("golpes fortes provocam torcida prolongada sem repetir o gatilho", () => {
    const state = fight(31);
    state.lastAttackResult = attack("jab");
    updateArenaEffects(state, 0);
    const lightReaction = arenaEffects.crowdTime;
    updateArenaEffects(state, 2);
    state.lastAttackResult = attack("uppercut");
    updateArenaEffects(state, 0);
    assert.equal(arenaEffects.crowdTime, 1.3);
    assert.ok(arenaEffects.crowdTime > lightReaction);
    updateArenaEffects(state, 0.5);
    assert.equal(arenaEffects.crowdTime, 0.8);
    updateArenaEffects(state, 0.8);
    assert.equal(arenaEffects.crowdTime, 0);
    state.lastAttackResult = attack("uppercut", "blocked");
    updateArenaEffects(state, 0);
    assert.equal(arenaEffects.crowdTime, 0);
});

test("torcida acompanha toda a Chain e desacelera ao encerrar", () => {
    const state = fight(32);
    state.counterChain = { active: true, count: 1 };
    updateArenaEffects(state, 0);
    assert.equal(arenaEffects.crowdTime, 1.2);
    updateArenaEffects(state, 3);
    assert.equal(arenaEffects.crowdTime, 0.85);
    state.counterChain.count = 3;
    updateArenaEffects(state, 0);
    assert.equal(arenaEffects.crowdTime, 1.6);
    updateArenaEffects(state, 3);
    assert.equal(arenaEffects.crowdTime, 1.05);
    state.counterChain.active = false;
    updateArenaEffects(state, 2);
    assert.equal(arenaEffects.crowdTime, 0);
});

test("particulas usam pixels inteiros, encolhem e desaparecem sem alterar a luta", () => {
    const state = fight(41);
    state.lastAttackResult = attack("uppercut", "hit", "counter_rush");
    const before = structuredClone(state);
    updateArenaEffects(state, 0, { opponent: { torsoX: 0.3, breathOffset: 0.25, recoilY: 0.5 } });
    const calls = [];
    const ctx = { save() {}, restore() {}, fillRect(...rect) { calls.push(rect); } };
    drawArenaImpact(ctx);
    assert.ok(calls.length > 0 && calls.length <= 26);
    assert.ok(calls.every(rect => rect.every(Number.isInteger)));
    calls.length = 0;
    updateArenaEffects(state, 0.18);
    drawArenaImpact(ctx);
    assert.ok(calls.length > 0);
    assert.ok(calls.every(([, , width, height]) => width === 1 && height === 1));
    updateArenaEffects(state, 0.1);
    calls.length = 0;
    drawArenaImpact(ctx);
    assert.equal(calls.length, 0);
    assert.deepEqual(state, before);
});

test("flash local dura 50 ms e nao ocupa a tela inteira", () => {
    const state = fight(42);
    state.lastAttackResult = attack("hook");
    updateArenaEffects(state, 0);
    const calls = [];
    const ctx = { save() {}, restore() {}, fillRect(...rect) {
        calls.push({ color: this.fillStyle, alpha: this.globalAlpha, rect });
    } };
    drawArenaImpact(ctx);
    const flash = calls.find(call => call.color === "#fff0bf");
    assert.ok(flash);
    assert.ok(flash.alpha <= 0.28);
    assert.ok(flash.rect[2] < 40 && flash.rect[3] < 25);
    calls.length = 0;
    updateArenaEffects(state, 0.05);
    drawArenaImpact(ctx);
    assert.equal(calls.some(call => call.color === "#fff0bf"), false);
    calls.length = 0;
    drawDecisiveFlash(ctx);
    assert.equal(calls.length, 0);
});

test("linhas de movimento seguem o lado do golpe e expiram antes das particulas", () => {
    function streaks(arm, matchId) {
        const state = fight(matchId);
        state.lastAttackResult = { ...attack("uppercut"), arm };
        updateArenaEffects(state, 0);
        updateArenaEffects(state, 0.08);
        const calls = [];
        const ctx = { save() {}, restore() {}, fillRect(...rect) { calls.push(rect); } };
        drawArenaImpact(ctx);
        const lines = calls.filter(rect => rect[3] === 1);
        assert.equal(lines.length, 8);
        assert.ok(lines.every(rect => rect.every(Number.isInteger)));
        const center = arenaEffects.x;
        const offsets = lines.map(([x, , width]) => x + (width - 1) / 2 - center);
        updateArenaEffects(state, 0.06);
        calls.length = 0;
        drawArenaImpact(ctx);
        assert.ok(calls.length > 0);
        assert.equal(calls.some(rect => rect[3] === 1), false);
        return offsets;
    }
    const left = streaks("left", 43);
    const right = streaks("right", 44);
    assert.ok(left.every((x, index) => Math.abs(x + right[index]) <= 1));
});

test("tremor discreto fica em dois pixels e retorna a camera base em 100 ms", () => {
    const state = fight(45);
    state.lastAttackResult = attack("uppercut", "hit", "counter_rush");
    updateArenaEffects(state, 0);
    const before = structuredClone(state);
    const offsets = [];
    for (let frame = 0; frame < 20; frame += 1) {
        const offset = arenaShakeX();
        assert.ok(Number.isInteger(offset) && Math.abs(offset) <= 2);
        offsets.push(offset);
        updateArenaEffects(state, 0.01);
    }
    assert.ok(offsets.some(offset => offset < 0) && offsets.some(offset => offset > 0));
    assert.ok(offsets.slice(10).every(offset => offset === 0));
    assert.equal(arenaShakeX(), 0);
    assert.deepEqual(state, before);
});

test("Uppercut projeta particulas para cima e Rush amplia a explosao ciano", () => {
    function burst(punch, kind, matchId) {
        const state = fight(matchId);
        state.lastAttackResult = attack(punch, "hit", kind);
        updateArenaEffects(state, 0);
        updateArenaEffects(state, 0.14);
        const calls = [];
        const ctx = { save() {}, restore() {}, fillRect(x, y, width, height) {
            calls.push({ color: this.fillStyle, x, y, width, height });
        } };
        drawArenaImpact(ctx);
        assert.ok(calls.length <= 26);
        assert.ok(Math.abs(arenaShakeX()) <= 2);
        return { calls, uppercut: arenaEffects.uppercut };
    }
    const hook = burst("hook", "attack", 50);
    const uppercut = burst("uppercut", "attack", 51);
    assert.equal(uppercut.uppercut, true);
    assert.ok(uppercut.calls.length > hook.calls.length);
    assert.ok(uppercut.calls.slice(0, hook.calls.length).every((call, i) => call.y < hook.calls[i].y));
    const rush = burst("uppercut", "counter_rush", 52);
    assert.ok(rush.calls.length > uppercut.calls.length);
    assert.ok(rush.calls.every(call => ["#edffff", "#75dcff"].includes(call.color)));
    updateArenaEffects(fight(53), 0);
    assert.equal(arenaEffects.uppercut, false);
});


