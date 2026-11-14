import { COUNTER_RUSH_CUTSCENE_TIME } from "./counterRush.js";
import { drawPixelText } from "./hud.js";

const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

// Representação visual temporária; não modifica layout ou regras do combate.
export function counterRushCinematicFrame(state) {
    if (state.playerCombat.state !== "counter_rush_cutscene") return null;
    const elapsed = COUNTER_RUSH_CUTSCENE_TIME - state.counterRush.cutsceneRemaining;
    const zoom = elapsed < 1 ? 1 + 0.12 * smooth(elapsed)
        : elapsed < 2 ? 1.12 + 0.06 * smooth(elapsed - 1) : 1.18 + 0.10 * smooth(elapsed - 2);
    return { elapsed, zoom, focusX: 320 + 4 * smooth(elapsed - 1), focusY: 225,
        shade: 0.43 * smooth(elapsed), bars: Math.round(24 * smooth(elapsed) + 8 * smooth(elapsed - 2)),
        preparation: smooth(elapsed - 1) };
}

export function applyCounterRushCamera(ctx, frame) {
    ctx.translate(320, 225);
    ctx.scale(frame.zoom, frame.zoom);
    ctx.translate(-frame.focusX, -frame.focusY);
}

export function drawCounterRushBackgroundShade(ctx, frame) {
    ctx.save(); ctx.globalAlpha = frame.shade;
    ctx.fillStyle = "#080f20"; ctx.fillRect(0, 0, 640, 360);
    ctx.restore();
}

export function drawCounterRushPlayerHighlight(ctx, frame) {
    if (frame.preparation <= 0) return;
    ctx.save(); ctx.globalAlpha = 0.07 * frame.preparation;
    ctx.fillStyle = "#fff1a0";
    ctx.fillRect(210, 212, 220, 148); ctx.fillRect(230, 222, 180, 138);
    ctx.restore();
}

export function drawCounterRushCinematicOverlay(ctx, frame) {
    ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 640, frame.bars);
    ctx.fillRect(0, 360 - frame.bars, 640, frame.bars);
    if (frame.elapsed < 1) {
        drawPixelText(ctx, "DEFESA PERFEITA", 320, 52, 2, "#fff1a0", "center");
    } else if (frame.elapsed < 2) {
        drawPixelText(ctx, "OPORTUNIDADE DE CONTRA-ATAQUE", 320,
            Math.round(88 - 10 * smooth(frame.elapsed - 1)), 2, "#fff1a0", "center");
        drawPixelText(ctx, "PREPARE O CONTRA-ATAQUE", 320, 330, 1, "#f7ecd0", "center");
    } else {
        ctx.save(); ctx.translate(320, 92);
        const scale = 1 + 0.15 * smooth(frame.elapsed - 2);
        ctx.scale(scale, scale);
        drawPixelText(ctx, "COUNTER RUSH!", 0, 0, 4, "#fff1a0", "center");
        ctx.restore();
    }
    ctx.restore();
}
