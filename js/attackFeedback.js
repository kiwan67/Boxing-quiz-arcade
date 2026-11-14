import { drawPixelText } from "./hud.js";

export function drawAttackFeedback(ctx, state) {
    if (state.opponentCombat.state.startsWith("counter_")) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#080f20";
        ctx.fillRect(216, 72, 208, 24);
        ctx.fillStyle = "#f47b78";
        ctx.fillRect(216, 94, 208, 2);
        drawPixelText(ctx, "CONTRA-ATAQUE!", 320, 77, 2, "#fff1a0", "center");
        ctx.restore();
        return;
    }
    const feedback = state.attackFeedback;
    if (feedback.delay > 1e-9 || feedback.remaining <= 0 || state.playerCombat.state === "attack_qte"
        || state.playerCombat.state === "qte_failed") return;
    ctx.save();
    ctx.globalAlpha = 1;
    if (feedback.rush) {
        ctx.fillStyle = "#080f20";
        ctx.fillRect(218, 72, 204, 48);
        ctx.fillStyle = "#efbe3b";
        ctx.fillRect(220, 74, 200, 2);
        drawPixelText(ctx, "COUNTER RUSH!", 320, 82, 2, "#fff1a0", "center");
        drawPixelText(ctx, feedback.outcome === "dodged" ? "ESQUIVOU!" : feedback.outcome === "blocked" ? "BLOQUEADO!" : "+50% DE DANO",
            320, 104, 1, "#f7ecd0", "center");
        if (feedback.outcome === "hit" && feedback.remaining > 0.5) {
            ctx.fillStyle = "#fff1a0";
            for (const x of [278, 358]) {
                ctx.fillRect(x, 162, 4, 16);
                ctx.fillRect(x - 4, 168, 12, 4);
            }
        }
        ctx.restore();
        return;
    }
    ctx.fillStyle = "#080f20";
    ctx.fillRect(240, 72, 160, 24);
    ctx.fillStyle = feedback.outcome === "hit" ? "#76cc7a" : "#efbe3b";
    ctx.fillRect(240, 94, 160, 2);
    drawPixelText(ctx, feedback.outcome === "hit" ? "ACERTOU!" : feedback.outcome === "blocked" ? "BLOQUEADO!" : "ESQUIVOU!",
        320, 77, 2, "#f7ecd0", "center");
    ctx.restore();
}
