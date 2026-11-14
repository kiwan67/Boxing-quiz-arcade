import { drawPixelText } from "./hud.js";
import { PLAYER_ACTION_COOLDOWN } from "./cooldown.js";

export function drawCooldown(ctx, state) {
    if (state.phase === "victory" || state.phase === "defeat") return;
    const stunned = state.stun.remaining > 0;
    const active = state.playerCombat.state === "action_cooldown" || stunned;
    const ready = state.playerCombat.state === "idle" && state.playerCooldown.readyMessageRemaining > 0;
    if (!active && !ready) return;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#71899f";
    ctx.fillRect(12, 282, 160, 66);
    ctx.fillStyle = "#142036";
    ctx.fillRect(14, 284, 156, 62);
    drawPixelText(ctx, active ? "RECUPERANDO..." : "LUTAR!", 92, 291, 1, "#fff1a0", "center");
    const remaining = stunned ? state.stun.remaining : state.playerCooldown.remaining;
    const seconds = (Math.ceil(remaining * 10) / 10).toFixed(1);
    drawPixelText(ctx, `${seconds} S`, 92, 306, 2, "#f7ecd0", "center");
    ctx.fillStyle = "#354762";
    ctx.fillRect(22, 330, 140, 8);
    const progress = Math.max(0, Math.min(1, 1 - remaining / (stunned ? state.stun.total : PLAYER_ACTION_COOLDOWN)));
    ctx.fillStyle = ready ? "#76cc7a" : "#efbe3b";
    ctx.fillRect(22, 330, Math.round(140 * progress), 8);
    ctx.restore();
}
