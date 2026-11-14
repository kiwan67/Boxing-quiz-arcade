import { ceremonySprite } from './ceremony.js';
import { bruisedSprite } from './fighterWear.js';
import { drawWearPortrait } from './fighterWear.js';
// HUD visual: nomes configurÃ¡veis, vida e rodada lidas do estado a cada quadro.
export const hudConfig = {
    playerName: "PLAYER",
    enemyName: "RIVAL"
};

// Fonte bitmap original 5 x 7. Cada ponto Ã© um retÃ¢ngulo na grade do Canvas.
const GLYPHS = {
    "Ã—": [0,17,10,4,10,17,0],
    A: [14,17,17,31,17,17,17], B: [30,17,17,30,17,17,30],
    C: [14,17,16,16,16,17,14], D: [30,17,17,17,17,17,30],
    E: [31,16,16,30,16,16,31], F: [31,16,16,30,16,16,16],
    G: [14,17,16,23,17,17,15], H: [17,17,17,31,17,17,17],
    I: [31,4,4,4,4,4,31], J: [7,2,2,2,18,18,12],
    K: [17,18,20,24,20,18,17], L: [16,16,16,16,16,16,31],
    M: [17,27,21,21,17,17,17], N: [17,25,21,19,17,17,17],
    O: [14,17,17,17,17,17,14], P: [30,17,17,30,16,16,16],
    Q: [14,17,17,17,21,18,13], R: [30,17,17,30,20,18,17],
    S: [15,16,16,14,1,1,30], T: [31,4,4,4,4,4,4],
    U: [17,17,17,17,17,17,14], V: [17,17,17,17,17,10,4],
    W: [17,17,17,21,21,21,10], X: [17,17,10,4,10,17,17],
    Y: [17,17,10,4,4,4,4], Z: [31,1,2,4,8,16,31],
    0: [14,17,19,21,25,17,14], 1: [4,12,4,4,4,4,14],
    2: [14,17,1,2,4,8,31], 3: [30,1,1,14,1,1,30],
    4: [2,6,10,18,31,2,2], 5: [31,16,16,30,1,1,30],
    6: [14,16,16,30,17,17,14], 7: [31,1,2,4,8,8,8],
    8: [14,17,17,14,17,17,14], 9: [14,17,17,15,1,1,14],
    ":": [0,4,4,0,4,4,0], "-": [0,0,0,31,0,0,0],
    "!": [4,4,4,4,4,0,4],
    "+": [0,4,4,31,4,4,0], "%": [25,26,2,4,8,11,19],
    "Ã": [2,4,14,17,31,17,17],
    ".": [0,0,0,0,0,6,6],
    ",": [0,0,0,0,0,6,4],
    " ": [0,0,0,0,0,0,0], "?": [14,17,1,2,4,0,4]
};

let hudFrame;
// Rastro visual do dano; a vida real continua exclusivamente no gameState.
const barTrails = { player: 100, enemy: 100 };
const trailDelay = { player: 0, enemy: 0 };
const lastHP = { player: 100, enemy: 100 };

export function resetHUDVisuals() {
    trailDelay.player = trailDelay.enemy = 0; lastHP.player = lastHP.enemy = 100;
    barTrails.player = 100;
    barTrails.enemy = 100;
}

export function updateHUD(state, deltaTime) {
    for (const role of ['player','enemy']) {
        const hp=role==='player'?state.playerHealth:state.enemyHealth;
        if(hp<lastHP[role]) trailDelay[role]=.3;
        trailDelay[role]=Math.max(0,trailDelay[role]-deltaTime);
        if(!trailDelay[role]) barTrails[role]=Math.max(hp,barTrails[role]-45*deltaTime);
        lastHP[role]=hp;
    }
}
function rect(ctx, color, x, y, width, height) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

export function drawPixelText(ctx, text, x, y, scale, color, align = "left") {
    const width = (text.length * 6 - 1) * scale;
    if (align === "center") x -= Math.floor(width / 2);
    if (align === "right") x -= width;
    ctx.fillStyle = color;
    for (let i = 0; i < text.length; i += 1) {
        const glyph = GLYPHS[text[i]] || GLYPHS["?"];
        for (let row = 0; row < 7; row += 1) {
            for (let col = 0; col < 5; col += 1) {
                if (glyph[row] & (1 << (4 - col))) {
                    ctx.fillRect(x + (i * 6 + col) * scale, y + row * scale, scale, scale);
                }
            }
        }
    }
}

function drawPortrait(ctx, x, isPlayer) {
    const y = 8;
    // Moldura de 44 x 46; retratos frontais com o mesmo cabelo e tom de pele.
    rect(ctx, "#080f20", x - 1, y - 1, 46, 48);
    rect(ctx, "#e5dfcb", x, y, 44, 46);
    rect(ctx, "#71899f", x + 2, y + 2, 40, 42);
    rect(ctx, isPlayer ? "#243b70" : "#633e88", x + 3, y + 3, 38, 40);
    rect(ctx, isPlayer ? "#354f87" : "#79549a", x + 4, y + 4, 36, 8);
}

export function initializeHUD() {
    if (hudFrame) return;
    const cache = document.createElement("canvas");
    cache.width = 640;
    cache.height = 65;
    const ctx = cache.getContext("2d");
    if (!ctx) throw new Error("Canvas auxiliar da HUD indisponÃ­vel.");
    ctx.imageSmoothingEnabled = false;
    // Two stepped metal wings and a raised central clock, rather than a flat strip.
    for (const right of [false,true]) {
        const x=right?368:0;
        rect(ctx,'#080c19',x,0,272,58); rect(ctx,'#273c58',x+2,2,268,52);
        rect(ctx,'#8ba1b1',x+3,3,266,2); rect(ctx,'#101c31',x+4,7,264,43);
        rect(ctx,'#d8ae53',x+4,51,250,2); rect(ctx,'#263d58',x+12,55,242,5);
        for(let i=0;i<5;i++) rect(ctx,'#516980',x+61+i*8,5,5,2);
        for(const bolt of [6,262]) {rect(ctx,'#8ba1b1',x+bolt,47,3,3);rect(ctx,'#101c31',x+bolt+1,48,1,1);}
    }
    rect(ctx,'#080c19',270,0,100,62); rect(ctx,'#d8ae53',273,2,94,55);
    rect(ctx,'#fff0a2',275,3,90,2); rect(ctx,'#364a61',276,6,88,49);
    rect(ctx,'#080f20',279,9,82,43); rect(ctx,'#162c45',282,12,76,28);
    rect(ctx,'#283c52',286,57,68,5);
    drawPortrait(ctx, 8, true);
    drawPortrait(ctx, 588, false);
    hudFrame = cache;
}

export function drawHealthBar(ctx, x, y, width, height, health, trailHealth = health, reversed = false) {
    const percent = Number.isFinite(health) ? Math.max(0, Math.min(100, health)) : 0;
    const filled = Math.round((width - 6) * percent / 100);
    rect(ctx, "#080f20", x, y, width, height);
    rect(ctx, "#71899f", x + 1, y + 1, width - 2, height - 2);
    rect(ctx, "#29263a", x + 3, y + 3, width - 6, height - 6);
    const trail = Math.round((width - 6) * Math.max(percent, Math.min(100, trailHealth)) / 100);
    if (trail > filled) rect(ctx, "#c94351", reversed ? x + width - 3 - trail : x + 3 + filled, y + 3, trail - filled, height - 6);
    if (filled === 0) return;
    const start = reversed ? x + width - 3 - filled : x + 3;
    rect(ctx, percent <= 25 ? '#d77b59' : '#e8c75e', start, y+3, filled, height-6);
    for(let tick=12;tick<filled;tick+=13) rect(ctx,'#684b3c',start+tick,y+5,1,height-10);
    rect(ctx, "#fff1a0", reversed ? x + width - 3 - filled : x + 3, y + 3, filled, 2);
    rect(ctx, "#b9802b", reversed ? x + width - 3 - filled : x + 3, y + height - 5, filled, 2);
}

function drawName(ctx, value, x, align) {
    // Nomes longos usam a grade menor e sÃ£o limitados Ã  largura do painel.
    const text = String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 33);
    const scale = text.length <= 16 ? 2 : 1;
    drawPixelText(ctx, text, x + 1, 13, scale, "#080f20", align);
    drawPixelText(ctx, text, x, 12, scale, "#f7ecd0", align);
}

export function drawHUD(ctx, gameState) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(hudFrame, 0, 0);
    for (const [role,x] of [['player',8],['bot',588]]) {
        const source=ceremonySprite(role==='player'?'player-neutral':'bot-relaxed');
        if(source) {
            const image=bruisedSprite(source,role,true);
            // Square source window: exact source identity, no aspect stretching.
            const side=Math.min(source.naturalWidth * .65,source.naturalHeight);
            ctx.imageSmoothingEnabled=false;
            ctx.drawImage(image,Math.round((source.naturalWidth-side)/2),0,side,side,x+3,11,38,38);
        }
        drawWearPortrait(ctx,role,x);
    }
    drawName(ctx, hudConfig.playerName, 62, "left");
    drawName(ctx, hudConfig.enemyName, 578, "right");
    drawHealthBar(ctx, 62, 32, 202, 16, gameState.playerHealth, barTrails.player);
    drawHealthBar(ctx, 376, 32, 202, 16, gameState.enemyHealth, barTrails.enemy, true);
    const seconds = Math.floor(Math.max(0, gameState.gameTime));
    const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    drawPixelText(ctx, clock, 320, 14, 2, "#f7ecd0", "center");
    const round = Number.isFinite(gameState.round) ? Math.max(1, Math.floor(gameState.round)) : 1;
    const label = "FIGHT";
    drawPixelText(ctx, label, 320, 38, 1, "#efbe3b", "center");
    const chain=gameState.counterChain;
    if(chain?.active) drawPixelText(ctx,`CHAIN X${chain.count}`,376,54,1,'#b5edff');
    else if(gameState.counterRush?.remaining>0) drawPixelText(ctx,'COUNTER RUSH',376,54,1,'#b5edff');
    if(gameState.playerHealth<=25) drawPixelText(ctx,'DANGER',62,54,1,'#f7ab76');
    if (gameState.pendingRiskBonus > 0) {
        drawPixelText(ctx, `VULNERÃVEL +${Math.round(gameState.pendingRiskBonus * 100)}%`,
            62, 53, 1, "#f47b78");
    }
    ctx.restore();
}




