import { updateKnockout, KO_DURATION } from '../js/knockout.js';
import assert from "node:assert/strict";
import { test, beforeEach, afterEach, mock } from "node:test";
import { readFileSync } from "node:fs";
import { gameState } from "../js/gameState.js";
import { restartFight } from "../js/restart.js";
import { beginSpontaneousAttack } from "../js/counterAttack.js";
import { requestPunch, submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { selectPunch } from "../js/punches.js";
import { selectDefenseSide, submitDefenseAnswer } from './helpers/defenseApi.mjs';
import { applyImpactDamage as rawImpactDamage } from "../js/match.js";
import { beginAttackQTE } from "../js/qte.js";
import { ceremonyFrame, updateCeremony, drawCeremony, preloadCeremonySprites, defeatResultPose } from "../js/ceremony.js";
import { drawMatchResult, RESTART_BUTTON, LOBBY_BUTTON } from "../js/matchView.js";
import { simulationDelta } from "../js/simulationClock.js";
import { setDebugEnabled, setDebugGameSpeed } from "../js/debug.js";

beforeEach(() => {
    restartFight();
    gameState.offensiveAI.remaining = 1000000;
    mock.method(Math, "random", () => 0.99);
});
afterEach(() => { mock.restoreAll(); setDebugEnabled(false); });

function applyImpactDamage(...args){const result=rawImpactDamage(...args);updateKnockout(gameState,KO_DURATION);return result;}
function punch(type) {
    assert.equal(selectPunch(type), true);
    assert.equal(requestPunch("left"), true);
    const question = gameState.qte.question;
    if (question) assert.equal(submitAttackAnswer(question.correctAnswer, question.id), true);
    updateCombat(type === "jab" ? 0.4 : 0.65);
    updateKnockout(gameState,KO_DURATION);
}

function defend() {
    assert.equal(selectDefenseSide(gameState.defense.expectedSide), true);
    const question = gameState.qte.question;
    assert.equal(submitDefenseAnswer(question.correctAnswer, question.id), true);
    updateCombat(0.55);
    updateKnockout(gameState,KO_DURATION);
}

function openRush() {
    assert.equal(beginSpontaneousAttack(), true);
    defend();
    updateCombat(3.12);
}

for (const cause of ["jab", "uppercut", "Counter Rush", "Counter Chain"]) {
    test(`vitória por ${cause} abre a cerimônia com o jogador vencedor`, () => {
        if (cause.startsWith("Counter")) openRush();
        if (cause === "Counter Chain") {
            punch("jab");
            updateCombat(0.22);
            defend();
            updateCombat(0.5);
            assert.equal(gameState.counterChain.count, 2);
        }
        gameState.enemyHealth = 1;
        punch(cause === "uppercut" ? "uppercut" : "jab");
        assert.equal(gameState.phase, "victory");
        assert.equal(ceremonyFrame(gameState).winner, "player");
        assert.equal(ceremonyFrame(gameState).defeated, "bot");
    });
}

for (const special of [false, true]) {
    test(`derrota após ataque ${special ? "especial" : "normal"} abre a cerimônia com o bot vencedor`, () => {
        if (special) {
            openRush();
            punch("jab");
            updateCombat(0.22);
            assert.equal(gameState.counterAttack.source, "counter_chain");
        } else {
            assert.equal(beginSpontaneousAttack(), true);
        }
        gameState.playerHealth = 1;
        defend();
        assert.equal(gameState.phase, "defeat");
        assert.equal(ceremonyFrame(gameState).winner, "bot");
        assert.equal(ceremonyFrame(gameState).defeated, "player");
    });
}

test("tempo simulado controla a cerimônia sem reabrir combate nem QTE", () => {
    setDebugEnabled(true);
    setDebugGameSpeed(0.25);
    applyImpactDamage("enemy", 100, "result");
    const result = gameState.matchResult;
    const before = JSON.stringify(gameState);
    for (const [realDelta, phase] of [[0, "transition"], [4, "preparation"], [4, "arm-raise"], [6, "celebration"], [6, "menu"]]) {
        updateCeremony(gameState, simulationDelta(realDelta));
        assert.equal(ceremonyFrame(gameState).phase, phase);
        assert.equal(gameState.matchResult, result);
    }
    assert.equal(requestPunch("left"), false);
    assert.equal(beginAttackQTE("left"), false);
    assert.equal(beginSpontaneousAttack(), false);
    assert.equal(applyImpactDamage("player", 100, "late-impact"), 0);
    assert.equal(gameState.qte.remaining, 0);
    assert.equal(JSON.stringify(gameState), before);
    restartFight();
    applyImpactDamage("player", 100, "new-result");
    assert.equal(ceremonyFrame(gameState).time, 0);
});

test("arte frontal, contato em três alturas e menu preservam o enquadramento", async t => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "Image");
    Object.defineProperty(globalThis, "Image", { configurable: true, value: class {
        set src(url) {
            const png = readFileSync(new URL(url));
            assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
            assert.equal(png[25], 6);
            this.naturalWidth = png.readUInt32BE(16);
            this.naturalHeight = png.readUInt32BE(20);
            this.name = url.split("/").at(-1);
            this.onload();
        }
    } });
    t.after(() => {
        if (previous) Object.defineProperty(globalThis, "Image", previous);
        else delete globalThis.Image;
    });
    await preloadCeremonySprites();
    for (const [target, winner, loser, title] of [
        ["enemy", "player", "bot", "#76cc7a"], ["player", "bot", "player", "#f47b78"]
    ]) {
        restartFight();
        applyImpactDamage(target, 100, "result-layout");
        const draws = [];
        const rectangles = [];
        const ctx = {
            save() {}, restore() {},
            drawImage(...args) { draws.push(args); },
            fillRect(...rect) { rectangles.push([this.fillStyle, ...rect]); }
        };
        drawCeremony(ctx, gameState, { name: "arena" });
        assert.deepEqual(draws.map(([image]) => image.name), ["arena", `${winner}-grip-low.png`, `${loser==='bot'?'opponent':'player'}_result_defeated_front.png`]);
        assert.ok(draws[1][1] + draws[1][3] < draws[2][1]);
        let previousWristY = Infinity;
        const defeatedHeights = new Set();
        for (const [delta, grip] of [[1.8, "low"], [0.65, "mid"], [0.75, "high"]]) {
            updateCeremony(gameState, delta);
            draws.length = 0;
            rectangles.length = 0;
            drawCeremony(ctx, gameState, { name: "arena" });
            assert.equal(draws[1][0].name, `${winner}-grip-${grip}.png`);
            assert.equal(draws[2][0].name, defeatResultPose(gameState,ceremonyFrame(gameState).time).asset+'.png');
            const [, x, y, width, height] = draws[1];
            assert.equal(y + height, 292);
            assert.ok(y >= 42 && height >= 200 && x > 0 && x + width < draws[2][1]);
            const index = ["low", "mid", "high"].indexOf(grip);
            const winnerAnchor = (winner === "player" ? [298, 301, 302] : [284, 296, 284])[index];
            const scaleX = width / draws[1][0].naturalWidth;
            assert.ok(Math.abs(x + 82 * scaleX - 214) <= 1);
            assert.ok(Math.abs(x + winnerAnchor * scaleX - 320) <= 1);
            const [, loserX, loserY, loserWidth, loserHeight] = draws[2];
            defeatedHeights.add(loserY);
            assert.ok(Math.abs(loserX + loserWidth / 2 - 478) <= 1,
                "defeated fighter stays on the right in all three poses");
            assert.ok(Math.abs(loserY + loserHeight - 292) <= 1,
                "defeated fighter shares the ring floor, allowing one pixel of breathing");
            assert.ok(x + width < loserX, "defeated fighter remains separate from the pair");
            const palm = rectangles.find(([color]) => color === "#271c20");
            assert.ok(palm, "visible palm joins the referee to the winner's cuff");
            const wristX = palm[1] + 7;
            const wristY = palm[2] + 6;
            assert.ok(wristX > 214 && wristX < 320, "shared contact lies between both torsos");
            assert.ok(wristY < previousWristY, "the held wrist rises with each pose");
            previousWristY = wristY;
            assert.equal(rectangles.filter(([color]) => color === "#ffd19a").length, 3,
                "three fingers overlap the wristband");
            assert.equal(ctx.imageSmoothingEnabled, false);
        }
        assert.equal(defeatedHeights.size, 1, "defeated floor anchor stays fixed; breathing is in the kneeling sprite variants");
        assert.ok(Math.max(...defeatedHeights) - Math.min(...defeatedHeights) <= 2,
            "defeated breathing stays within one pixel above or below the floor");
        drawMatchResult(ctx, gameState);
        assert.equal(rectangles.some(([color]) => color === title), false);
        updateCeremony(gameState, 0.8);
        drawMatchResult(ctx, gameState);
        assert.ok(rectangles.some(([color]) => color === title));
        assert.equal(rectangles.some(([, x, y]) => x === RESTART_BUTTON.x && y === RESTART_BUTTON.y), false);
        updateCeremony(gameState, 1.1);
        drawMatchResult(ctx, gameState);
        for (const button of [RESTART_BUTTON, LOBBY_BUTTON]) {
            assert.ok(rectangles.some(([, x, y]) => x === button.x && y === button.y));
        }
    }
});

test("anuncio dispara a reacao coletiva para qualquer vencedor e reinicia por luta", () => {
    for (const target of ["enemy", "player"]) {
        restartFight();
        applyImpactDamage(target, 100, "announcement");
        assert.equal(ceremonyFrame(gameState).announcementTime, null);
        updateCeremony(gameState, 3.5);
        assert.equal(ceremonyFrame(gameState).announcementTime, 0);
        updateCeremony(gameState, 0.5);
        assert.equal(ceremonyFrame(gameState).announcementTime, 0.5);
    }
});

test("botao reinicia apos a cerimonia de ambos os vencedores e ignora clique antecipado", async () => {
    const { finishMatchIntro } = await import("../js/matchIntro.js");
    const { initializeInput } = await import("../js/input.js");
    const { arenaEffects, updateArenaEffects } = await import("../js/arenaEffects.js");
    const handlers = new Map();
    initializeInput({
        width: 640, height: 360,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 }),
        addEventListener(name, handler) { handlers.set(name, handler); },
        removeEventListener(name) { handlers.delete(name); }
    });
    const click = () => handlers.get("mousedown")({ button: 0,
        clientX: RESTART_BUTTON.x + 10, clientY: RESTART_BUTTON.y + 10 });
    for (const target of ["enemy", "player"]) {
        restartFight();
        applyImpactDamage(target, 100, "restart-ceremony");
        const oldMatchId = gameState.matchId;
        updateCeremony(gameState, 4);
        assert.equal(ceremonyFrame(gameState).phase, "celebration");
        click();
        assert.equal(gameState.matchId, oldMatchId);
        assert.ok(gameState.matchResult);
        updateCeremony(gameState, 1.1);
        assert.equal(ceremonyFrame(gameState).phase, "menu");
        click();
        assert.ok(gameState.matchId > oldMatchId);
        assert.equal(gameState.phase, "match_intro");
        finishMatchIntro();
        assert.equal(gameState.matchResult, null);
        assert.equal(ceremonyFrame(gameState), null);
        assert.equal(gameState.playerHealth, 100);
        assert.equal(gameState.enemyHealth, 100);
        assert.equal(gameState.qte.question, null);
        assert.equal(gameState.counterChain.active, false);
        assert.equal(gameState.counterRush.remaining, 0);
        updateArenaEffects(gameState, 0);
        assert.equal(arenaEffects.crowdTime, 0);
        assert.equal(arenaEffects.intensity, 0);
        applyImpactDamage(target, 100, "next-ceremony");
        assert.equal(ceremonyFrame(gameState).time, 0);
        assert.equal(ceremonyFrame(gameState).announcementTime, null);
    }
});

