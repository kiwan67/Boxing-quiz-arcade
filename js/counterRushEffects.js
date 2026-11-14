import { gameState } from "./gameState.js";
import { drawPixelText } from "./hud.js";
import { presentationSettings } from "./presentationSettings.js";

export const counterRushEffectsConfig = { flashEnabled: true, flashDuration: 0.12, flashOpacity: 0.60 };
let canvas;
let originalFilter = "";

function active() {
    return gameState.phase !== "victory" && gameState.phase !== "defeat"
        && gameState.playerCombat.state !== "counter_rush_cutscene"
        && (gameState.counterChain.active || gameState.playerCombat.state.startsWith("counter_rush_"));
}

export function initializeCounterRushEffects(target) {
    if (canvas === target) return;
    if (canvas?.style) canvas.style.filter = originalFilter;
    canvas = target;
    originalFilter = target.style?.filter || "";
    syncCounterRushEffects();
}

export function startCounterRushEffects() {
    const duration = Math.max(0, counterRushEffectsConfig.flashDuration);
    gameState.counterRush.flashDuration = duration;
    gameState.counterRush.flashRemaining = counterRushEffectsConfig.flashEnabled && presentationSettings.flashes !== "off" ? duration : 0;
    syncCounterRushEffects();
}

export function resetCounterRushEffects() {
    gameState.counterRush.flashRemaining = 0;
    gameState.counterRush.flashDuration = 0;
    if (canvas?.style && canvas.style.filter !== originalFilter) canvas.style.filter = originalFilter;
}

export function syncCounterRushEffects() {
    if(gameState.qte.pendingResult){if(canvas?.style)canvas.style.filter=originalFilter;return;}
    if (!active()) { resetCounterRushEffects(); return; }
    if (!counterRushEffectsConfig.flashEnabled || presentationSettings.flashes === "off") gameState.counterRush.flashRemaining = 0;
    const monochrome = gameState.counterRush.flashRemaining <= 0;
    const prefix = originalFilter && originalFilter !== "none" ? originalFilter + " " : "";
    const filter = monochrome ? `${prefix}grayscale(1)` : originalFilter;
    if (canvas?.style && canvas.style.filter !== filter) canvas.style.filter = filter;
}

export function updateCounterRushEffects(deltaTime) {
    if (gameState.phase === "paused") return;
    if (!active()) { resetCounterRushEffects(); return; }
    gameState.counterRush.flashRemaining = Math.max(0, gameState.counterRush.flashRemaining - deltaTime);
    if (gameState.counterRush.flashRemaining < 1e-9) gameState.counterRush.flashRemaining = 0;
    syncCounterRushEffects();
}

export function drawCounterRushFlash(ctx, width, height) {
    const rush = gameState.counterRush;
    if (!active() || rush.flashRemaining <= 0 || !counterRushEffectsConfig.flashEnabled || presentationSettings.flashes === "off") return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, counterRushEffectsConfig.flashOpacity))
        * rush.flashRemaining / rush.flashDuration * (presentationSettings.flashes === "reduced" ? 0.3 : 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    drawPixelText(ctx, "COUNTER RUSH!", width / 2, 86, 2, "#172030", "center");
    ctx.restore();
}
