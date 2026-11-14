import { drawPixelText } from "./hud.js";

export function drawStun(ctx, pose, layout, stun) {
    if (stun.remaining <= 0) return;
    const x = layout.x + ((pose.facingDirection === "front" ? pose.torsoX : 0) + pose.headRecoilX + pose.autoDodgeX) * layout.scale;
    const y = layout.y + pose.breathOffset + (pose.recoilY + pose.shoulderOffset) * layout.scale;
    ctx.save();
    ctx.globalAlpha = 1;
    for (let n = 0; n < 3; n++) {
        const angle = stun.elapsed * 4 + n * Math.PI * 2 / 3;
        const sx = Math.round(x + Math.cos(angle) * 23);
        const sy = Math.round(y - 12 + Math.sin(angle) * 5);
        ctx.fillStyle = "#fff1a0";
        ctx.fillRect(sx - 1, sy - 4, 3, 9);
        ctx.fillRect(sx - 4, sy - 1, 9, 3);
        ctx.fillStyle = "#fff";
        ctx.fillRect(sx, sy, 1, 1);
    }
    drawPixelText(ctx, "ATORDOADO!", x, y - 31, 1, "#fff1a0", "center");
    ctx.restore();
}
