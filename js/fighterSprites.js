import { bruisedSprite, drawWear, wearIdleOffset } from './fighterWear.js';
export const FIGHTER_SPRITE_BOUNDS = {
    player: { top: 190, width: 300, height: 254 },
    bot: { top: 92, width: 174, height: 180 }
};

const frameNames = [
    "idle", "jab-left", "straight-left", "hook-left", "uppercut-left",
    "block", "dodge-left", "hit", "victory", "defeat"
];
const straightAnchor = { player: 0.60, bot: 0.57 };
const frames = { player: {}, bot: {} };
export function fighterSprite(role, name = "idle") { return frames[role]?.[name]; }
let preload;

export function preloadFighterSprites() {
    if (typeof Image !== "function") return null;
    preload ??= Promise.all(Object.keys(frames).flatMap(role => frameNames.map(frame => new Promise(resolve => {
        const image = new Image();
        function finish(loaded) {
            clearTimeout(deadline);
            image.onload = null;
            image.onerror = null;
            if (loaded && image.naturalWidth > 0 && image.naturalHeight > 0) frames[role][frame] = image;
            resolve();
        }
        const deadline = setTimeout(resolve, 15000);
        image.onload = () => finish(true);
        image.onerror = () => finish(false);
        const filename = role === "player" && frame === "straight-left" ? "straight-forward-right" : frame;
        image.src = new URL(`../assets/sprites/${role}/${filename}.png`, import.meta.url).href;
    }))));
    return preload;
}

export function drawFighterSprite(ctx, role, pose, layout) {
    const images = frames[role];
    if (!images.idle) return false;
    const state = pose.animationState;
    const isResult = state === "victory" || state === "defeat";
    let frame = "idle";
    let mirrored = false;
    if (state.startsWith("punch_") || state.startsWith("counter_")) {
        const right = role === "player" ? state === "punch_right" : pose.counterSide === "left";
        const extension = role === "player"
            ? (right ? pose.rightPunchExtension : pose.leftPunchExtension) : pose.counterExtension;
        const contactFrame = `${pose.punchType}-left`;
        if (!images[contactFrame]) return false;
        if (extension >= 0.55) {
            frame = contactFrame;
            mirrored = role === "player" && pose.punchType === "straight" ? !right : right;
        }
    } else if (state.startsWith("block_") || pose.cinematicGuardAmount > 0) {
        frame = "block";
    } else if (state.startsWith("dodge_")) {
        frame = "dodge-left";
        mirrored = state === "dodge_right";
    } else if (state === "hit" || state === "stunned") {
        frame = "hit";
    } else if (isResult && pose.animationTime >= 0.14) {
        frame = state;
    }
    const image = images[frame];
    if (!image) return false;

    const bounds = isResult ? { top: layout.y, width: 82, height: 84 } : FIGHTER_SPRITE_BOUNDS[role];
    const crouch = frame === "uppercut-left" || frame === "dodge-left" ? 0.94 : 1;
    const scale = Math.min(bounds.width / image.naturalWidth, bounds.height * crouch / image.naturalHeight);
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);
    const anchor = frame === "straight-left" && role !== "player" ? straightAnchor[role] : 0.5;
    const x = Math.round(layout.x + pose.torsoX * layout.scale - width * (mirrored ? 1 - anchor : anchor));
    const fatigueOffset = isResult ? 0 : wearIdleOffset(role, pose);
    const y = bounds.top + bounds.height - height + pose.breathOffset + (pose.recoilY ?? 0) + fatigueOffset;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = layout.alpha;
    if (mirrored) {
        ctx.translate(x + width, y);
        ctx.scale(-1, 1);
        ctx.drawImage(bruisedSprite(image, role), 0, 0, width, height);
    } else {
        ctx.drawImage(bruisedSprite(image, role), x, y, width, height);
    }
    ctx.restore();
    if (!isResult) { ctx.save(); ctx.globalAlpha = layout.alpha; drawWear(ctx, role, layout.x + pose.torsoX * layout.scale, y, width, height); ctx.restore(); }
    return true;
}





