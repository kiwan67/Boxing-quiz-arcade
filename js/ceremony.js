import { bruisedSprite } from './fighterWear.js';
import { drawArenaScene, drawFighterShadow } from "./scenery.js";
import { drawCameraFlashes, drawArenaLighting, announceArenaWinner } from "./arenaLife.js";

const MENU_TIME = 5;
const floorY = 292;
const winnerX = 320;
const refereeX = 214;
const defeatedX = 478;

// Shared sprite coordinates keep the referee's fingers on the winner's wrist.
const wristAnchors = {
    player: [[198, 226], [200, 133], [208, 58]],
    bot: [[195, 229], [195, 119], [195, 75]]
};

function drawWristGrip(ctx, x, y, time) {
    const squeeze = time >= 1.65 && time < 2 ? 1 : 0;
    const pixel = (color, dx, dy, w, h) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + dx, y + dy, w, h);
    };
    // Palm behind the cuff; fingers and thumb overlap it in the foreground.
    pixel("#271c20", -7, -6, 5, 13);
    pixel("#c88a5d", -6, -5, 4, 11);
    pixel("#f2bb85", -5, -5, 2, 9);
    for (let finger = 0; finger < 3; finger += 1) {
        const dy = -4 + finger * 3;
        pixel("#513025", -2, dy, 8 - squeeze, 3);
        pixel("#efb37e", -2, dy, 7 - squeeze, 2);
        pixel("#ffd19a", -2, dy, 5 - squeeze, 1);
    }
    pixel("#513025", 3 - squeeze, -7, 4, 6);
    pixel("#efb37e", 4 - squeeze, -6, 2, 4);
}

const images = new Map();
export function ceremonySprite(name) { return images.get(name); }
let preload;
let currentResult;
let elapsed = 0;
let defeatPreview = { matchId: null, expression: 'auto' };
export function previewDefeatExpression(state, expression='auto') {
    if (!['auto','sad','frustrated','exhausted'].includes(expression)) return false;
    defeatPreview = { matchId: state.matchId, expression };
    return true;
}
export function defeatResultPose(state, time=0) {
    const role=state.matchResult?.loser;if(!['player','bot'].includes(role))return null;
    const prefix=role==='player'?'player':'opponent';
    const forced=defeatPreview.matchId===state.matchId?defeatPreview.expression:'auto';
    const pose=forced!=='auto'?forced:time<.7?'defeated_front':time<1.4?'exhausted':time<2.1?'frustrated':time<3?'sad':Math.floor(time/.9)%2?'sad_idle':'sad_idle_breath';
    return {role,perspective:'front',pose,asset:`${prefix}_result_${pose}`};
}

const assetNames = [...['player','opponent'].flatMap(role=>['defeated_front','sad','frustrated','exhausted','sad_idle','sad_idle_breath'].map(pose=>`${role}_result_${pose}`)), "referee-signal","referee-walk-transparent", "bot-relaxed","referee-neutral", "player-neutral", ...["bot", "player"].flatMap(role =>
    ["grip-low", "grip-mid", "grip-high", "defeated"].map(pose => `${role}-${pose}`))];

export function preloadCeremonySprites() {
    if (typeof Image !== "function") return null;
    preload ??= Promise.all(assetNames.map(name => new Promise(resolve => {
        const image = new Image();
        // Release a failed/slow preload without discarding a later successful load.
        const deadline = setTimeout(resolve, 15000);
        function finish(loaded) {
            clearTimeout(deadline);
            image.onload = null;
            image.onerror = null;
            if (loaded && image.naturalWidth && image.naturalHeight) images.set(name, image);
            resolve();
        }
        image.onload = () => finish(true);
        image.onerror = () => finish(false);
        image.src = new URL(`../assets/sprites/ceremony/${name}.png`, import.meta.url).href;
    })));
    return preload;
}

export function updateCeremony(state, delta) {
    if (!state.matchResult || !['victory','defeat'].includes(state.phase)) return;
    if (currentResult !== state.matchResult) {
        currentResult = state.matchResult;
        elapsed = 0;
    }
    const previous = elapsed;
    elapsed += delta;
    if (previous < 3.5 && elapsed >= 3.5) announceArenaWinner(state.phase === "victory");
}

export function ceremonyFrame(state) {
    const victory = state.phase === "victory";
    if (!victory && state.phase !== "defeat") return null;
    const time = currentResult === state.matchResult ? elapsed : 0;
    const phase = time < 1 ? "transition" : time < 2 ? "preparation"
        : time < 3.5 ? "arm-raise" : time < MENU_TIME ? "celebration" : "menu";
    const grip = time < 2.4 ? "grip-low"
        : time < 3.12 ? "grip-mid" : "grip-high";
    return { time, phase, grip, announcementTime: time >= 3.5 ? time - 3.5 : null, winner: victory ? "player" : "bot", defeated: victory ? "bot" : "player" };
}

function drawAtFloor(ctx, image, center, scale, anchor = image.naturalWidth / 2, bob = 0) {
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);
    ctx.drawImage(image, Math.round(center - anchor * scale), floorY - height + bob, width, height);
}

function drawSolo(ctx, asset, center, height, bob = 0) {
    const image = images.get(asset);
    if (image) { const role = asset.startsWith("player-") ? "player" : asset.startsWith("bot-") ? "bot" : null; drawAtFloor(ctx, role ? bruisedSprite(image, role, true) : image, center, height / image.naturalHeight, undefined, bob); }
}

export function drawCeremony(ctx, state, scenery) {
    const frame = ceremonyFrame(state);
    if (!frame) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    drawArenaScene(ctx,scenery,frame.time,frame.announcementTime === null ? 0 : 1,frame.announcementTime);
    drawCameraFlashes(ctx);
    if (ctx.beginPath) drawArenaLighting(ctx, frame.announcementTime === null ? 0 : 0.6);
    for (const [x, width] of [[refereeX, 37], [winnerX, 48], [defeatedX, 46]]) {
        drawFighterShadow(ctx, x, floorY, width);
    }
    if (frame.phase === "celebration") {
        ctx.fillStyle = "#fdf2bf2a";
        ctx.fillRect(winnerX - 71, floorY - 5, 142, 12);
        ctx.fillRect(winnerX - 53, floorY - 8, 106, 18);
    }
    const pair = frame.grip && images.get(`${frame.winner}-${frame.grip}`);
    if (pair) {
        // MÃ£o e pulso jÃ¡ estÃ£o em contato no mesmo quadro. Os pÃ©s usam a mesma linha do ringue.
        const anchors = frame.winner === "player" ? [298, 301, 302] : [284, 296, 284];
        const index = ["grip-low", "grip-mid", "grip-high"].indexOf(frame.grip);
        // Register both torso centers, rather than centering the entire two-person image.
        // A single sprite owns both arms and their shared wrist contact in every pose.
        const scaleX = (winnerX - refereeX) / (anchors[index] - 82);
        const height = Math.round(pair.naturalHeight * 0.49);
        const left = Math.round(refereeX - 82 * scaleX);
        const top = floorY - height;
        const width = Math.round(pair.naturalWidth * scaleX);
        ctx.drawImage(bruisedSprite(pair, frame.winner, true), left, top, width, height);
        const [wristX, wristY] = wristAnchors[frame.winner][index];
        drawWristGrip(ctx,
            Math.round(left + wristX * width / pair.naturalWidth),
            Math.round(top + wristY * height / pair.naturalHeight), frame.time);
    } else {
        drawSolo(ctx, "referee-neutral", refereeX, 204);
        drawSolo(ctx, `${frame.winner}-defeated`, winnerX, 224);
    }
    // The blackout separates combat perspective/ground pose from this front view.
    // Only the loser receives these integrated facial expressions.
    const defeated=defeatResultPose(state,frame.time),image=images.get(defeated?.asset);
    // Uniform sizing only for the player's front-facing defeat presentation.
    const defeatedHeight=frame.defeated==='player'?176:190;
    if(image)drawAtFloor(ctx,bruisedSprite(image,frame.defeated,true),defeatedX,defeatedHeight/image.naturalHeight);
    if (frame.phase === "transition") {
        ctx.globalAlpha = 1 - frame.time;
        ctx.fillStyle = "#080f20";
        ctx.fillRect(0, 0, 640, 360);
    }
    ctx.restore();
}



