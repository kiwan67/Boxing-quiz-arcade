import { drawPixelText } from "./hud.js";
import { COUNTER_RUSH_WINDOW_TIME } from "./counterRush.js";

export function drawCounterRush(ctx, state) {
    if (state.counterChain.active) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#000";
        ctx.fillRect(174, 304, 292, 24);
        drawPixelText(ctx, `COUNTER CHAIN ${state.counterChain.count}×`, 320, 309, 2, "#fff", "center");
        ctx.restore();
    }
    const window = state.playerCombat.state === "counter_rush_window";
    const lost = state.counterRush.feedbackRemaining > 0;
    if (!window && !lost) return;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#080f20";
    ctx.fillRect(150, 74, 340, window ? 92 : 34);
    ctx.fillStyle = "#efbe3b";
    ctx.fillRect(152, 76, 336, 2);
    drawPixelText(ctx, window ? "COUNTER RUSH!" : "OPORTUNIDADE PERDIDA", 320, 86,
        2, "#fff1a0", "center");
    if (window) {
        drawPixelText(ctx, "ESCOLHA O LADO DO SOCO", 320, 112, 1, "#f7ecd0", "center");
        const seconds = (Math.ceil(state.counterRush.remaining * 10) / 10).toFixed(1).replace(".", ",");
        drawPixelText(ctx, `${seconds} SEGUNDOS`, 320, 132, 2, "#f7ecd0", "center");
        ctx.fillStyle = "#efbe3b";
        ctx.fillRect(170, 154, Math.round(300 * state.counterRush.remaining / COUNTER_RUSH_WINDOW_TIME), 4);
    }
    ctx.restore();
}
