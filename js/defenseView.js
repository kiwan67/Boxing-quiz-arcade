import { drawPixelText } from "./hud.js";
import { DEFENSE_DIRECTION_TIME } from "./defense.js";

// As áreas visuais e o hit-test retornam o mesmo lado canônico do defensor.
export const DEFENSE_BUTTONS = Object.freeze([
    Object.freeze({ side: "left", x: 144, y: 196, width: 164, height: 40, label: "ESQUERDA", hint: "CLIQUE OU MOUSE ESQ" }),
    Object.freeze({ side: "right", x: 332, y: 196, width: 164, height: 40, label: "DIREITA", hint: "CLIQUE OU MOUSE DIR" })
]);

export function defenseSideAt(x, y) {
    return DEFENSE_BUTTONS.find(button => x >= button.x && x < button.x + button.width
        && y >= button.y && y < button.y + button.height)?.side ?? null;
}

function rect(ctx, color, x, y, width, height) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

// Pontuação própria desta janela; a fonte e o desenho da HUD ficam intactos.
const PUNCTUATION = { ".": [0,0,0,0,0,6,6], "%": [25,26,2,4,8,11,19] };
function text(ctx, value, x, y, scale, color) {
    const start = x - Math.floor((value.length * 6 - 1) * scale / 2);
    for (let i = 0; i < value.length; i++) {
        const glyph = PUNCTUATION[value[i]];
        if (!glyph) drawPixelText(ctx, value[i], start + i * 6 * scale, y, scale, color);
        else {
            for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
                if (glyph[row] & (1 << (4 - col))) rect(ctx, color,
                    start + (i * 6 + col) * scale, y + row * scale, scale, scale);
            }
        }
    }
}

export function drawDefense(ctx, state) {
    const directionPhase = state.playerCombat.state === "defense_direction_qte";
    const defense = state.defense;
    const showResult = defense.result && defense.feedbackRemaining > 0
        && (state.playerCombat.state === "counter_wait" || state.playerCombat.state === "action_cooldown"
            || state.playerCombat.state === "idle");
    if (!directionPhase && !showResult) return;
    ctx.save();
    ctx.globalAlpha = 1;
    if (directionPhase) {
        ctx.globalAlpha = 0.58;
        rect(ctx, "#080f20", 0, 0, 640, 360);
        ctx.globalAlpha = 1;
        rect(ctx, "#080f20", 102, 74, 436, 228);
        rect(ctx, "#e5dfcb", 104, 76, 432, 224);
        rect(ctx, "#536b88", 107, 79, 426, 218);
        rect(ctx, "#142036", 110, 82, 420, 212);
        text(ctx, "DEFESA!", 320, 98, 3, "#fff1a0");
        const seconds = (Math.ceil(defense.remaining * 10) / 10).toFixed(1);
        text(ctx, `${seconds} S`, 320, 140, 3, "#f7ecd0");
        for (const { x, y, width, height, label, hint } of DEFENSE_BUTTONS) {
            rect(ctx, "#080f20", x - 2, y - 2, width + 4, height + 4);
            rect(ctx, "#a6bacb", x, y, width, height);
            rect(ctx, "#293e5c", x + 2, y + 2, width - 4, height - 4);
            text(ctx, label, x + 82, 209, 2, "#f7ecd0");
            text(ctx, hint, x + 82, 244, 1, "#a6bacb");
        }
        rect(ctx, "#080f20", 138, 266, 364, 12);
        rect(ctx, "#354762", 140, 268, 360, 8);
        const width = Math.round(360 * Math.max(0, Math.min(1, defense.remaining / DEFENSE_DIRECTION_TIME)));
        rect(ctx, "#efbe3b", 140, 268, width, 8);
        rect(ctx, "#fff1a0", 140, 268, width, 2);
    } else {
        const result = defense.result;
        const label = result.naturalMiss ? "ESQUIVOU!" : result.defenseSideCorrect && result.questionCorrect ? "DEFESA PERFEITA!"
            : result.defenseSideCorrect || result.questionCorrect ? "DEFESA PARCIAL!" : "DEFESA FALHOU!";
        rect(ctx, "#080f20", 174, 292, 292, 52);
        rect(ctx, "#71899f", 176, 294, 288, 48);
        rect(ctx, "#142036", 178, 296, 284, 44);
        text(ctx, label, 320, 302, 2, "#fff1a0");
        text(ctx, `DANO: ${result.damagePercent}%`, 320, 324, 1, "#f7ecd0");
    }
    ctx.restore();
}
