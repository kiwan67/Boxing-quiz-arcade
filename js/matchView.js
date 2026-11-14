import { drawPixelText } from "./hud.js";
import { ceremonyFrame } from "./ceremony.js";

export const RESTART_BUTTON = Object.freeze({ x: 76, y: 310, width: 232, height: 36 });
export const LOBBY_BUTTON = Object.freeze({ x: 332, y: 310, width: 232, height: 36 });

export function isLobbyButtonAt(x, y) {
    return x >= LOBBY_BUTTON.x && x < LOBBY_BUTTON.x + LOBBY_BUTTON.width
        && y >= LOBBY_BUTTON.y && y < LOBBY_BUTTON.y + LOBBY_BUTTON.height;
}

export function isRestartButtonAt(x, y) {
    return x >= RESTART_BUTTON.x && x < RESTART_BUTTON.x + RESTART_BUTTON.width
        && y >= RESTART_BUTTON.y && y < RESTART_BUTTON.y + RESTART_BUTTON.height;
}

const ACCENTS = { "Ó": "O", "Ê": "E" };
function resultText(ctx, value, y, scale, color, center = 320) {
    const start = center - Math.floor((value.length * 6 - 1) * scale / 2);
    for (let i = 0; i < value.length; i++) {
        const char = value[i], x = start + i * 6 * scale;
        drawPixelText(ctx, ACCENTS[char] || char, x, y, scale, color);
        ctx.fillStyle = color;
        if (char === "Ó") {
            ctx.fillRect(x + 3 * scale, y - 3 * scale, scale, scale);
            ctx.fillRect(x + 2 * scale, y - 2 * scale, scale, scale);
        } else if (char === "Ê") {
            ctx.fillRect(x + 2 * scale, y - 3 * scale, scale, scale);
            ctx.fillRect(x + scale, y - 2 * scale, scale, scale);
            ctx.fillRect(x + 3 * scale, y - 2 * scale, scale, scale);
        }
    }
}

export function drawMatchResult(ctx, state) {
    const frame = ceremonyFrame(state);
    if (!frame || frame.time < 3.5) return;
    ctx.save();
    const entrance = Math.min(1, (frame.time - 3.5) / 0.32);
    ctx.globalAlpha = entrance;
    ctx.fillStyle = "#142036";
    ctx.fillRect(215, 8, 210, 34);
    const victory = state.phase === "victory";
    const y = 16 + Math.round((1 - entrance) * 4);
    resultText(ctx, victory ? "VITÓRIA!" : "DERROTA!", y, 3, victory ? "#76cc7a" : "#f47b78");
    if (frame.phase === "menu") {
        for (const [button, label, color] of [
            [RESTART_BUTTON, "JOGAR NOVAMENTE", "#fff1a0"],
            [LOBBY_BUTTON, "VOLTAR AO LOBBY", "#f7ecd0"]
        ]) {
            ctx.fillStyle = "#a6bacb";
            ctx.fillRect(button.x, button.y, button.width, button.height);
            ctx.fillStyle = "#293e5c";
            ctx.fillRect(button.x + 2, button.y + 2, button.width - 4, button.height - 4);
            resultText(ctx, label, button.y + 11, 2, color, button.x + button.width / 2);
        }
    }
    ctx.restore();
}
