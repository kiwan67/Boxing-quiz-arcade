import { test, beforeEach, afterEach, mock } from "node:test";
import {tutorialFrame,tutorialAction} from '../js/tutorial.js';
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

class Element extends EventTarget {
    constructor(tagName = "SECTION") { super(); this.tagName = tagName; }
    hidden = false; disabled = false; dataset = {}; textContent = "";
    querySelectorAll() { return []; } setAttribute() {} focus() {}
}
class Canvas extends Element {
    constructor() {
        super("CANVAS");
        this.width = 640; this.height = 360; this.style = {}; this.draws = []; this.stack = [];
        const canvas = this;
        this.ctx = { globalAlpha: 1, tx: 0, ty: 0, sx: 1, sy: 1,
            fillRect() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, rotate() {},
            translate(x, y) { this.tx += x * this.sx; this.ty += y * this.sy; },
            scale(x, y) { this.sx *= x; this.sy *= y; },
            save() { canvas.stack.push([this.globalAlpha, this.tx, this.ty, this.sx, this.sy]); },
            restore() { [this.globalAlpha, this.tx, this.ty, this.sx, this.sy] = canvas.stack.pop(); },
            drawImage(...args) { args.alpha = this.globalAlpha; canvas.draws.push(args); }
        };
    }
    getContext() { return this.ctx; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 640, height: 360 }; }
}
const canvas = new Canvas(), start = new Element("BUTTON"), skip = new Element("BUTTON");
const controls = new Element(), caption = new Element("P"), lobby = new Element();
const options = ["easy", "normal", "hard"].map(difficulty => Object.assign(new Element("BUTTON"), { dataset: { difficulty } }));
lobby.querySelectorAll = () => options; lobby.querySelector = () => start;
const doc = new EventTarget();
const elements = { "game-canvas": canvas, "punch-controls": controls, "difficulty-lobby": lobby, "skip-intro": skip, "intro-caption": caption };
doc.getElementById = id => elements[id] || null;
doc.createElement = () => new Canvas();
globalThis.document = doc; globalThis.HTMLCanvasElement = Canvas;
let frameRequests = 0;
globalThis.requestAnimationFrame = () => { frameRequests++; };
globalThis.Image = class {
    set src(value) {
        this.url = value;
        const data = readFileSync(new URL(value));
        this.naturalWidth = data.readUInt32BE(16); this.naturalHeight = data.readUInt32BE(20);
        this.onload();
    }
};
const { gameState } = await import("../js/gameState.js");
const { restartFight } = await import("../js/restart.js");
const { beginMatchIntro, finishMatchIntro, updateMatchIntro, introFrame, matchIntro, INTRO_CUES, MATCH_INTRO_DURATION } = await import("../js/matchIntro.js");
const { update } = await import('./helpers/main.mjs');
const { render } = await import("../js/render.js");
await (await import("../js/fighterSprites.js")).preloadFighterSprites();
await (await import("../js/ceremony.js")).preloadCeremonySprites();
await Promise.resolve();
const { requestPunch, updateCombat } = await import('./helpers/combat.mjs');
const { beginAttackQTE } = await import("../js/qte.js");
const { beginDefense } = await import('./helpers/defenseApi.mjs');
const { beginSpontaneousAttack } = await import("../js/counterAttack.js");
const { applyImpactDamage } = await import("../js/match.js");
const { updateOffensiveClock } = await import("../js/ai.js");
const { selectPunch, consumePunchCooldown } = await import("../js/punches.js");
const { setDebugEnabled, setDebugGameSpeed } = await import("../js/debug.js");
const { CHARACTER_LAYOUT } = await import("../js/characters.js");
beforeEach(() => { restartFight(); canvas.draws.length = 0; });
afterEach(() => { mock.restoreAll(); setDebugEnabled(false); });

test("lobby inicia a introducao nas tres dificuldades sem alterar o perfil", () => {
    for (const difficulty of ["easy", "normal", "hard"]) {
        restartFight(); gameState.phase = "lobby"; gameState.difficulty = difficulty;
        start.dispatchEvent(new Event("click"));
        assert.equal(tutorialFrame()?.screen,'prompt');tutorialAction('skip');
        assert.equal(gameState.phase, "match_intro");
        assert.equal(gameState.difficulty, difficulty);
        assert.equal(gameState.gameTime, 0);
        assert.equal(skip.hidden, false); assert.equal(controls.hidden, true);
        finishMatchIntro();
    }
});
test("intro bloqueia golpes, dano, cooldowns, QTE, defesa e IA, inclusive chamadas diretas", () => {
    beginMatchIntro();
    const before = structuredClone(gameState);
    assert.equal(requestPunch("left"), false);
    assert.equal(beginAttackQTE("left"), false);
    assert.equal(beginDefense(), false);
    assert.equal(beginSpontaneousAttack(), false);
    assert.equal(selectPunch("uppercut"), false);
    assert.equal(consumePunchCooldown("jab"), false);
    assert.equal(applyImpactDamage("enemy", 100, "early"), 0);
    updateOffensiveClock(100); updateCombat(100);
    assert.deepEqual(gameState, before);
    update(5);
    assert.equal(gameState.gameTime, 0);
    assert.equal(gameState.offensiveAI.remaining, null);
    assert.equal(gameState.qte.question, null);
    assert.equal(gameState.counterChain.active, false);
    assert.equal(gameState.counterRush.remaining, 0);
});
test("sequencia tem seis cenas, juiz central, legendas e camera que retorna exatamente", () => {
    beginMatchIntro();
    const layout = JSON.stringify(CHARACTER_LAYOUT);
    for (const [time, scene] of [[0, "arena"], [3, "fighters"], [6, "referee-entry"], [8, "announcement"], [11.5, "referee-exit"], [13.5, "fight"]]) {
        matchIntro.time = time;
        const frame = introFrame();
        assert.equal(frame.scene, scene);
        render();
        assert.equal(canvas.ctx.tx, 0); assert.equal(canvas.ctx.ty, 0);
        assert.equal(canvas.ctx.sx, 1); assert.equal(canvas.ctx.sy, 1);
        assert.equal(canvas.stack.length, 0);
    }
    matchIntro.time = 7.5;
    const frame = introFrame();
    assert.equal(frame.refereeX, 320); assert.equal(frame.arms, 1);
    assert.ok(frame.subtitle); assert.equal(frame.speaking, true);
    assert.ok(canvas.draws.some(([image]) => image.url?.endsWith("referee-neutral.png")));
    assert.ok(canvas.draws.some(([image]) => image.url?.includes("/player/")));
    assert.ok(canvas.draws.some(([image]) => image.url?.includes("/bot/")));
    matchIntro.time = MATCH_INTRO_DURATION;
    assert.equal(introFrame().zoom, 1); assert.equal(introFrame().returnAmount, 1);
    render();
    const finalIntroPlayer = canvas.draws.filter(([image]) => image.url?.endsWith("/player/idle.png")).at(-1);
    const finalIntroBot = canvas.draws.filter(([image]) => image.url?.endsWith("/bot/idle.png")).at(-1);
    updateMatchIntro(0);
    assert.equal(gameState.phase, "idle"); assert.equal(gameState.gameTime, 0);
    assert.equal(JSON.stringify(CHARACTER_LAYOUT), layout);
    render();
    assert.deepEqual(canvas.draws.filter(([image]) => image.url?.endsWith("/player/idle.png")).at(-1), finalIntroPlayer);
    assert.deepEqual(canvas.draws.filter(([image]) => image.url?.endsWith("/bot/idle.png")).at(-1), finalIntroBot);
});
test("voz local e legendas seguem os mesmos tres marcos sem enfileirar falas", t => {
    assert.deepEqual(INTRO_CUES.map(cue => cue.text), ["Lutadores, preparem-se!", "Respeitem as regras!", "Que comece a luta!"]);
    const spoken = [], cancelled = [];
    const originals = ["speechSynthesis", "SpeechSynthesisUtterance"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
    t.after(() => { for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    } });
    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", { configurable: true, value: class { constructor(text) { this.text = text; } } });
    Object.defineProperty(globalThis, "speechSynthesis", { configurable: true, value: {
        getVoices: () => [{ lang: "pt-BR", localService: true, name: "Test local voice" }],
        speak(utterance) { spoken.push(utterance); }, cancel() { cancelled.push(true); }, pause() {}, resume() {}
    } });
    beginMatchIntro();
    for (const cue of INTRO_CUES) {
        update(cue.at + 0.01 - matchIntro.time);
        assert.equal(spoken.at(-1).text, cue.text);
        assert.equal(caption.textContent, cue.text);
        assert.equal(spoken.at(-1).rate, 1.15);
    }
    assert.equal(spoken.length, 3);
    assert.ok(cancelled.length >= 3);
    skip.dispatchEvent(new Event("click"));
    assert.equal(spoken.at(-1).onend, null);
    const count = spoken.length; updateMatchIntro(100);
    assert.equal(spoken.length, count);
});
test("sem suporte a voz, legendas continuam e intro termina normalmente", () => {
    beginMatchIntro();
    for (const cue of INTRO_CUES) {
        const delta = cue.at + 0.01 - matchIntro.time;
        update(delta);
        assert.equal(introFrame().subtitle, cue.text);
        assert.equal(caption.textContent, cue.text);
    }
    update(MATCH_INTRO_DURATION);
    assert.equal(gameState.phase, "idle"); assert.equal(gameState.gameTime, 0);
    update(0.1); assert.equal(gameState.gameTime, 0.1);
});
test("botao PULAR INTRO cancela sequencia uma vez e nao produz eventos atrasados", () => {
    beginMatchIntro(); update(7.1);
    skip.dispatchEvent(new Event("click"));
    assert.equal(gameState.phase, "idle"); assert.equal(skip.hidden, true);
    assert.equal(controls.hidden, false); assert.equal(caption.textContent, "");
    const id = gameState.matchId;
    updateMatchIntro(100);
    assert.equal(gameState.matchIntro, null); assert.equal(gameState.matchId, id);
    assert.equal(finishMatchIntro(), false);
});
test("Enter pula a introducao e nao atua durante combate", () => {
    beginMatchIntro();
    const key = new Event("keydown", { cancelable: true });
    Object.defineProperty(key, "key", { value: "Enter" }); doc.dispatchEvent(key);
    assert.equal(gameState.phase, "idle"); assert.equal(key.defaultPrevented, true);
    const id = gameState.matchId; doc.dispatchEvent(key);
    assert.equal(gameState.matchId, id);
});
test("Slow Motion desacelera introducao sem mover o cronometro do combate", () => {
    beginMatchIntro(); setDebugEnabled(true); setDebugGameSpeed(0.25);
    update(8); assert.equal(matchIntro.time, 2);
    assert.equal(gameState.gameTime, 0);
    gameState.phase = "paused"; update(10); assert.equal(matchIntro.time, 2);
    gameState.phase = "match_intro";
    restartFight(); updateMatchIntro(100);
    assert.equal(gameState.matchIntro, null); assert.equal(gameState.phase, "idle");
});
test("30, 60 e 144 FPS iniciam combate uma vez sem criar outro loop", () => {
    const loops = frameRequests;
    for (const fps of [30, 60, 144]) {
        restartFight(); beginMatchIntro();
        for (let tick = 0; tick < Math.round(MATCH_INTRO_DURATION * fps); tick++) update(1 / fps);
        assert.equal(gameState.phase, "idle");
        assert.equal(gameState.gameTime, 0);
        assert.equal(finishMatchIntro(), false);
    }
    assert.equal(frameRequests, loops);
});
test("sequenciador nao cria timers e quadros atrasados nao executam falas antigas", () => {
    mock.method(globalThis, "setTimeout", () => { throw Error("intro must use the simulation clock"); });
    mock.method(globalThis, "setInterval", () => { throw Error("intro must not schedule intervals"); });
    beginMatchIntro(); updateMatchIntro(100);
    assert.equal(gameState.phase, "idle");
    assert.equal(gameState.gameTime, 0);
    assert.equal(gameState.matchIntro, null);
    updateMatchIntro(100);
    assert.equal(gameState.phase, "idle");
});
