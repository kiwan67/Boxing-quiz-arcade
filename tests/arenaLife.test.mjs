import { test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { createInitialGameState } from "../js/gameState.js";
import { arenaLife, resetArenaLife, updateArenaLife, CAMERA_SEATS, drawCameraFlashes, crowdSectorEnergy, drawArenaLighting } from "../js/arenaLife.js";
import { presentationSettings, setPresentationSetting } from "../js/presentationSettings.js";

beforeEach(() => { resetArenaLife(70); presentationSettings.flashes = "normal"; });
afterEach(() => { mock.restoreAll(); presentationSettings.flashes = "normal"; });
test("flashes ficam na plateia, duram 80â€“150 ms e usam tres slots sem sortear combate", () => {
    const state = createInitialGameState(70), before = structuredClone(state);
    const random = mock.method(Math, "random", () => { throw Error("combat PRNG must not be consumed"); });
    const slots = arenaLife.flashes.slice();
    let flashes = 0;
    for (let frame = 0; frame < 600; frame++) {
        updateArenaLife(state, 1 / 60);
        for (const slot of slots) if (slot.remaining === slot.duration) {
            flashes++;
            assert.ok(slot.duration >= 0.08 && slot.duration <= 0.15);
            const [x, y] = CAMERA_SEATS[slot.seat];
            assert.ok(x > 50 && x < 600 && y >= 78 && y <= 130);
        }
    }
    assert.ok(flashes >= 2 && flashes < 10);
    assert.deepEqual(arenaLife.flashes, slots);
    assert.deepEqual(state, before);
    assert.equal(random.mock.callCount(), 0);
});
test("flash reduzido diminui a frequencia e desativado limpa flashes ativos", () => {
    const state = createInitialGameState(70);
    updateArenaLife(state, 0.8);
    assert.ok(arenaLife.flashes.some(f => f.remaining > 0));
    const normalWait = arenaLife.nextFlash;
    resetArenaLife(70); setPresentationSetting("flashes", "reduced", false);
    updateArenaLife(state, 0.8);
    assert.ok(arenaLife.nextFlash > normalWait * 2);
    setPresentationSetting("flashes", "off", false);
    updateArenaLife(state, 0.01);
    assert.ok(arenaLife.flashes.every(f => f.remaining === 0));
    const ctx = { save() { throw Error("disabled flash should not draw"); } };
    drawCameraFlashes(ctx);
});
test("onda atravessa setores apenas apos eventos reais e nao repete o impacto", () => {
    const state = createInitialGameState(70);
    for (const [outcome, kind] of [['dodged', 'dodge'], ['blocked', 'block']]) {
        const before = arenaLife.reaction.id;
        state.lastAttackResult = { impactResolved: true, outcome, damageApplied: 0 };
        updateArenaLife(state, 0);
        assert.equal(arenaLife.reaction.kind, kind);
        assert.ok(arenaLife.reaction.strength < .3);
        const id = arenaLife.reaction.id;
        updateArenaLife(state, 0); assert.equal(arenaLife.reaction.id, id);
    }
    const base = arenaLife.reaction.id;
    state.lastAttackResult = { impactResolved: true, outcome: "hit", punchType: "uppercut", damageApplied: 25 };
    updateArenaLife(state, 0);
    assert.equal(arenaLife.reaction.id, base + 1);
    assert.ok(crowdSectorEnergy(0) > 0);
    assert.equal(crowdSectorEnergy(5), 0);
    updateArenaLife(state, 0.6);
    assert.ok(crowdSectorEnergy(5) > 0);
    assert.equal(arenaLife.reaction.id, base + 1);
    state.counterChain.active = true; state.counterChain.count = 3;
    updateArenaLife(state, 0);
    assert.equal(arenaLife.reaction.kind, "chain");
    assert.ok(arenaLife.reaction.strength > 1);
});
test("iluminacao dinamica usa transparencia baixa e nenhum filtro", () => {
    const alphas = [];
    const ctx = { save() {}, restore() {}, fillRect() { alphas.push(this.globalAlpha); },
        beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() { alphas.push(this.globalAlpha); } };
    drawArenaLighting(ctx, 1);
    assert.ok(alphas.every(value => value <= 0.5));
    assert.equal(ctx.filter, undefined);
});
test("pausa congela os flashes e reinicio limpa todas as reacoes", () => {
    const state = createInitialGameState(70);
    updateArenaLife(state, 0.8);
    state.phase = "paused";
    const before = structuredClone(arenaLife);
    updateArenaLife(state, 100);
    assert.deepEqual(arenaLife, before);
    resetArenaLife(71);
    assert.ok(arenaLife.flashes.every(f => f.remaining === 0));
    assert.equal(arenaLife.reaction.id, 0);
    assert.equal(arenaLife.time, 0);
});

