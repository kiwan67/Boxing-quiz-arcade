import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const roles = ["player", "bot"];
const pngDimensions = roles.flatMap(role => {
    const folder = new URL(`../assets/sprites/${role}/`, import.meta.url);
    return readdirSync(folder).filter(name => name.endsWith(".png")).map(name => readFileSync(new URL(name, folder)));
});

function mockImage(missing = null) {
    return class {
        set src(url) {
            const role = roles.find(role => url.includes(`/assets/sprites/${role}/`));
            if (role === missing) {
                this.onerror();
                return;
            }
            const png = readFileSync(new URL(url));
            this.naturalWidth = png.readUInt32BE(16);
            this.naturalHeight = png.readUInt32BE(20);
            this.url = url;
            this.onload();
        }
    };
}

function installImage(t, ImageClass) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "Image");
    Object.defineProperty(globalThis, "Image", { value: ImageClass, configurable: true });
    t.after(() => {
        if (previous) Object.defineProperty(globalThis, "Image", previous);
        else delete globalThis.Image;
    });
}

const pose = { animationState: "idle", torsoX: 0, breathOffset: 0 };
const layout = { x: 320, scale: 2, alpha: 1 };

test("PNGs com alpha carregam e sÃ£o desenhados com proporÃ§Ã£o e pixels nÃ­tidos", async t => {
    assert.equal(pngDimensions.length, 22);
    for (const png of pngDimensions) {
        assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
        assert.equal(png[25], 6);
    }
    installImage(t, mockImage());
    const { preloadFighterSprites, drawFighterSprite } = await import("../js/fighterSprites.js");
    const preload = preloadFighterSprites();
    assert.equal(preloadFighterSprites(), preload);
    await preload;
    const calls = [];
    const ctx = {
        save() {}, restore() {},
        drawImage(...args) {
            assert.equal(this.imageSmoothingEnabled, false);
            calls.push(args);
        }
    };
    for (const role of roles) {
        assert.equal(drawFighterSprite(ctx, role, pose, layout), true);
        const [image, x, y, width, height] = calls.at(-1);
        assert.ok(Math.abs(width - height * image.naturalWidth / image.naturalHeight) < 1);
        assert.ok(Math.abs(x + width / 2 - 320) <= 0.5);
        assert.equal(y, role === "player" ? 190 : 92);
        assert.equal(height, role === "player" ? 254 : 180);
        assert.equal(y + height > 360, role === "player");
    }
    assert.equal(drawFighterSprite(ctx, "player", { ...pose, animationState: "punch_left" }, layout), false);

    const flips = [];
    ctx.translate = () => {};
    ctx.scale = (...values) => flips.push(values);
    for (const role of roles) for (const punchType of ["jab", "straight", "hook", "uppercut"]) {
        const animationState = role === "player" ? "punch_right" : "counter_left";
        const attack = { ...pose, animationState, punchType, counterSide: "left", rightPunchExtension: 1, counterExtension: 1 };
        assert.equal(drawFighterSprite(ctx, role, attack, layout), true);
        assert.ok(calls.at(-1)[0].url.endsWith(role === "player" && punchType === "straight" ? "/straight-forward-right.png" : `/${punchType}-left.png`));
        if (!(role === "player" && punchType === "straight")) assert.deepEqual(flips.at(-1), [-1, 1]);
        drawFighterSprite(ctx, role, { ...attack, rightPunchExtension: 0, counterExtension: 0 }, layout);
        assert.ok(calls.at(-1)[0].url.endsWith("/idle.png"));
    }
    // Regression: Jab uses its original PNG and original side mapping.
    for (const side of ['left', 'right']) {
        const before = flips.length;
        drawFighterSprite(ctx, 'player', { ...pose, animationState: `punch_${side}`, punchType: 'jab', leftPunchExtension: 1, rightPunchExtension: 1 }, layout);
        assert.ok(calls.at(-1)[0].url.endsWith('/jab-left.png'));
        assert.equal(flips.length - before, side === 'right' ? 1 : 0);
    }
    for (const side of ['left', 'right']) {
        for (const extension of [0, .3, .6, 1, .6, .3, 0]) {
            const before = flips.length;
            drawFighterSprite(ctx, 'player', { ...pose, animationState: `punch_${side}`, punchType: 'straight', leftPunchExtension: extension, rightPunchExtension: extension }, layout);
            assert.ok(calls.at(-1)[0].url.endsWith(extension >= .55 ? '/straight-forward-right.png' : '/idle.png'));
            assert.equal(flips.length - before, extension >= .55 && side === 'left' ? 1 : 0);
        }
    }
    for (const [state, file] of [["block_left", "block"], ["dodge_left", "dodge-left"], ["hit", "hit"],
        ["stunned", "hit"], ["victory", "victory"], ["defeat", "defeat"]]) {
        assert.equal(drawFighterSprite(ctx, "bot", { ...pose, animationState: state, animationTime: 0.2 }, { ...layout, y: 150 }), true);
        assert.ok(calls.at(-1)[0].url.endsWith(`/${file}.png`));
    }
});

test("imagem ausente permite concluir o carregamento e manter o outro sprite", async t => {
    installImage(t, mockImage("bot"));
    const { preloadFighterSprites, drawFighterSprite } = await import("../js/fighterSprites.js?missing");
    await preloadFighterSprites();
    const ctx = { save() {}, restore() {}, drawImage() {} };
    assert.equal(drawFighterSprite(ctx, "bot", pose, layout), false);
    assert.equal(drawFighterSprite(ctx, "player", pose, layout), true);
});




