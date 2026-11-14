import { arenaLife, crowdSectorEnergy } from "./arenaLife.js";
// Cena fixa em 640 Ã— 360. Elementos estÃ¡ticos sÃ£o compostos uma Ãºnica vez.
function rect(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function polygon(ctx, color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(...points[i]);
    ctx.closePath();
    ctx.fill();
}

function drawStadium(ctx) {
    rect(ctx, "#101426", 0, 0, 640, 360);
    rect(ctx, "#191f35", 0, 20, 640, 5);
    rect(ctx, "#272f48", 0, 25, 640, 2);
    for (let x = 32; x < 640; x += 96) {
        rect(ctx, "#232d43", x, 0, 4, 45);
        rect(ctx, "#38475a", x - 12, 36, 30, 8);
        rect(ctx, "#b3c9ce", x - 10, 44, 26, 4);
        rect(ctx, "#ecedd3", x - 6, 44, 18, 2);
    }
    polygon(ctx, "#1c253b", [[120, 52], [144, 52], [196, 79], [68, 79]]);
    polygon(ctx, "#1c253b", [[504, 52], [528, 52], [580, 79], [452, 79]]);
}

const shirts = ["#354366", "#624254", "#345455", "#655345", "#4e466a", "#36465a"];
const faces = ["#9e7869", "#c39980", "#795d56", "#ad8c78"];
const movingSpectators = [];
// The rear ring occludes spectators, but must stay behind every ring actor.
const rearRingLayers = new WeakMap();
export function rearRingLayer(scenery) { return rearRingLayers.get(scenery); }
export function drawArenaScene(ctx, scenery, time, cheer=0, announcementTime=null) {
    ctx.drawImage(scenery,0,0);
    drawAudienceMotion(ctx,time,cheer,announcementTime);
    const rear=rearRingLayers.get(scenery);
    if(rear)ctx.drawImage(rear,0,0);
}

function drawHead(ctx, x, y, skin) {
    rect(ctx, "#111827", x + 3, y - 2, 10, 10);
    rect(ctx, skin, x + 5, y + 1, 6, 6);
    rect(ctx, "#202333", x + 5, y, 6, 2);
    rect(ctx, "#252335", x + 8, y + 3, 2, 1);
}

export function drawAudienceMotion(ctx, time, cheer = 0, announcementTime = null) {
    // Only the selected spectators animate; the remaining crowd stays in the cache.
    // No images, canvases or particle objects are allocated in this frame loop.
    const energy = Math.max(0, Math.min(1, cheer));
    for (const { x, y, skin, shirt, group, phase, pace, gesture } of movingSpectators) {
        // Neighbours share a rhythm; personal phase and pace break synchronization.
        const waveEnergy = crowdSectorEnergy(group);
        const localEnergy = Math.max(energy * (0.25 + (group % 4) * 0.2), waveEnergy, arenaLife.intro ? 0.3 + (group % 3) * 0.14 : 0);
        const beat = (time * pace + phase + group * 0.37) % 2;
        // One burst follows the announcement, with a short stagger per group.
        const reactionAge = announcementTime === null ? -1 : announcementTime - (group % 3) * 0.035;
        const collective = reactionAge >= 0 && reactionAge < 0.9 + gesture * 0.1;
        const active = collective || beat < 0.25 + Math.min(0.64, localEnergy);
        // Three head heights make a nod readable instead of a binary flicker.
        const nod = beat < 0.22 ? 1 : beat < 0.48 ? 2 : beat < 0.76 ? 1 : 0;
        const headLift = collective
            ? 2 + Math.floor(reactionAge * (4 + pace) + phase) % 2
            : localEnergy > 0.5 ? nod : Math.min(1, nod);
        const sway = gesture === 2 && beat < 0.9
            ? (beat < 0.45 ? -1 : 1) : 0;
                const mode = waveEnergy > 0.95 ? 'CELEBRATING' : waveEnergy > 0.65 ? 'CHEERING'
            : waveEnergy > 0.25 ? 'SURPRISED' : beat < .38 && (group + gesture) % 3 === 0 ? 'CLAPPING' : 'IDLE';
        const jump = mode === 'CELEBRATING' ? Math.floor(beat * 7) % 3 : 0;
        drawHead(ctx, x + sway, y - headLift - jump, skin);
        rect(ctx, shirt, x + 3, y + 7 - jump, 10, 7);
        rect(ctx, '#192335', x + 6, y + 13, 4, 4);
        if (mode === 'SURPRISED') {
            rect(ctx, skin, x + 1, y + 3, 3, 3); rect(ctx, skin, x + 12, y + 3, 3, 3);
            continue;
        }
        if ((mode === "CLAPPING" || gesture === 1 && localEnergy > 0.45) && beat < 1.2 && !collective) {
            const gap = Math.floor(beat * 8) % 2 ? 3 : 0;
            rect(ctx, skin, x + 5 - gap, y + 10, 3, 2);
            rect(ctx, skin, x + 8 + gap, y + 10, 3, 2);
            continue;
        }
        if (active || beat > 1.62) {
            const raised = collective || localEnergy > 0.5;
            const left = collective ? (gesture + group) % 2 === 0 : active;
            const hand = x + (left ? 0 : 14);
            // Lift, hold and lower each arm in pixel steps; waving fans add a beat.
            const lift = collective
                ? 3 + (gesture + Math.floor(reactionAge * pace * 4)) % 3
                : active ? (beat < 0.12 ? 2 : beat < 0.55 ? 4 : 2) : 0;
            const wave = gesture === 1 && Math.floor(beat * 12) % 2 === 0 ? 2 : 0;
            const handY = raised ? y - 1 - lift - (group % 3) - wave : y + 5 - lift - wave;
            rect(ctx, shirt, hand, handY + 2, 2, y + 12 - handY - 2);
            rect(ctx, skin, hand, handY, 2, 2);
            if (gesture === 0 && raised && active) {
                // A few fans lift both arms; others wave or sway independently.
                const otherHand = x + (left ? 14 : 0);
                rect(ctx, shirt, otherHand, handY + 4, 2, y + 8 - handY);
                rect(ctx, skin, otherHand, handY + 2, 2, 2);
            }
        }
    }
}

function drawAudience(ctx) {
    movingSpectators.length = 0;
    for (let row = 0; row < 4; row += 1) {
        const y = 72 + row * 22;
        rect(ctx, "#252b40", 0, y + 17, 640, 3);
        rect(ctx, "#101725", 0, y + 20, 640, 2);
        for (let col = 0; col < 36; col += 1) {
            // DistribuiÃ§Ã£o determinÃ­stica; nenhuma aleatoriedade por quadro.
            const seed = col * 17 + row * 31;
            const x = col * 19 - (row % 2) * 9;
            const headY = y + seed % 3;
            const skin = faces[seed % faces.length];
            const shirt = shirts[seed % shirts.length];
            if ((col + row * 2) % 3 === 0) {
                movingSpectators.push({
                    x, y: headY, skin, shirt,
                    group: Math.floor(col / 6) + row * 6,
                    phase: (seed % 11) * 0.13,
                    pace: 0.88 + (seed % 7) * 0.09,
                    gesture: Math.floor(col / 3 + row) % 3
                });
            } else {
                drawHead(ctx, x, headY, skin);
            }
            rect(ctx, shirt, x + 2, headY + 8, 12, 10);
            rect(ctx, "#192335", x + 6, headY + 14, 4, 4);
        }
    }
    rect(ctx, "#101c30", 0, 163, 640, 23);
    rect(ctx, "#34435a", 0, 166, 640, 3);
    for (let x = 8; x < 640; x += 32) rect(ctx, "#25344a", x, 174, 20, 3);
}

function drawRearStructures(ctx) {
    for (const x of [39, 585]) {
        rect(ctx, "#101929", x - 3, 99, 22, 106);
        rect(ctx, "#536478", x, 99, 16, 103);
        rect(ctx, "#93a4af", x + 2, 99, 4, 103);
        rect(ctx, "#bac9cc", x - 2, 97, 20, 4);
        rect(ctx, "#394b62", x + 9, 103, 6, 81);
        // Stepped cap, welded collar and footplate anchor the steel post.
        rect(ctx, "#172438", x - 4, 94, 24, 3);
        rect(ctx, "#d1dce0", x - 1, 95, 18, 2);
        rect(ctx, "#33485e", x - 1, 187, 18, 5);
        rect(ctx, "#9cabb6", x, 187, 16, 1);
        rect(ctx, "#18293e", x - 7, 201, 30, 5);
        rect(ctx, "#8295a5", x - 5, 200, 26, 3);
        rect(ctx, "#c3cfd4", x - 4, 200, 24, 1);
        for (const boltX of [x - 2, x + 16]) {
            rect(ctx, "#25384c", boltX, 201, 3, 2);
            rect(ctx, "#d7e1e3", boltX, 201, 1, 1);
        }
        for (const scratchY of [128, 154, 180]) {
            rect(ctx, "#b3c3cd", x + 5, scratchY, 1, 4);
            rect(ctx, "#30465c", x + 12, scratchY + 2, 2, 3);
        }
        for (const y of [113, 140, 167]) {
            rect(ctx, "#172136", x - 6, y - 5, 27, 16);
            rect(ctx, x < 320 ? "#a83e54" : "#315fa5", x - 4, y - 4, 23, 13);
            rect(ctx, x < 320 ? "#ef7880" : "#79ade2", x - 3, y - 3, 4, 11);
            rect(ctx, "#d8e3e3", x + 15, y + 1, 2, 3);
            // Padded face, stitched edge and retaining strap share the corner palette.
            rect(ctx, x < 320 ? "#712c41" : "#244776", x, y + 6, 18, 2);
            rect(ctx, x < 320 ? "#582536" : "#1b345d", x + 16, y - 2, 2, 8);
            rect(ctx, x < 320 ? "#f3a0a0" : "#a9cce9", x + 2, y - 2, 13, 1);
            for (let stitchX = x + 3; stitchX < x + 14; stitchX += 4) {
                rect(ctx, "#e2d8cf80", stitchX, y + 5, 1, 1);
            }
            rect(ctx, "#243448", x + 18, y - 1, 2, 7);
            rect(ctx, "#9aaebc", x + 18, y, 1, 5);
        }
        rect(ctx, "#ced6d7", x + 10, 105, 2, 2);
        rect(ctx, "#a5b9c7", x + 10, 179, 2, 2);
    }
}

function drawRearRopes(ctx) {
    const ropes = [
        { y: 114, base: "#c94351", light: "#f17a78", shadow: "#812b43" },
        { y: 141, base: "#d3dce0", light: "#ffffff", shadow: "#7f91a4" },
        { y: 168, base: "#366fc5", light: "#70abe7", shadow: "#23467e" }
    ];
    for (const rope of ropes) {
        rect(ctx, "#111c30", 48, rope.y - 1, 544, 9);
        rect(ctx, rope.base, 48, rope.y, 544, 6);
        rect(ctx, rope.light, 48, rope.y, 544, 2);
        rect(ctx, rope.shadow, 48, rope.y + 5, 544, 1);
        // Short diagonal stitches suggest braided material at the native resolution.
        for (let x = 62; x < 578; x += 12) {
            rect(ctx, "#19233866", x, rope.y + 3, 2, 1);
            rect(ctx, "#19233866", x + 2, rope.y + 4, 2, 1);
            rect(ctx, "#ffffff60", x + 4, rope.y + 2, 2, 1);
        }
        // Tape wraps join the three ropes without obscuring their silhouettes.
        for (const x of [142, 496]) {
            rect(ctx, "#18243a", x - 1, rope.y - 1, 6, 8);
            rect(ctx, "#bbc9ce", x, rope.y - 1, 4, 7);
            rect(ctx, "#edf2e9", x, rope.y - 1, 1, 6);
            rect(ctx, "#728697", x + 3, rope.y, 1, 6);
            rect(ctx, "#8296a5", x + 1, rope.y + 3, 2, 1);
        }
        for (const x of [43, 581]) {
            rect(ctx, "#18243a", x, rope.y - 3, 16, 12);
            rect(ctx, rope.base, x + 1, rope.y - 2, 14, 9);
            rect(ctx, rope.light, x + 2, rope.y - 2, 3, 8);
            rect(ctx, rope.shadow, x + 5, rope.y + 5, 9, 2);
            // Metal eyelet and tension connector at the padded corner.
            const connectorX = x < 320 ? x + 11 : x + 1;
            rect(ctx, "#172136", connectorX, rope.y + 1, 4, 4);
            rect(ctx, "#c9d7dc", connectorX + 1, rope.y + 1, 2, 1);
            rect(ctx, "#8296a5", connectorX + 1, rope.y + 3, 2, 1);
        }
    }
}

function drawFloor(ctx) {
    // Borda traseira abaixo da corda azul: o piso nÃ£o encobre as cordas.
    polygon(ctx, "#263f62", [[43, 184], [597, 184], [640, 326], [640, 360], [0, 360], [0, 326]]);
    polygon(ctx, "#75aec9", [[51, 186], [589, 186], [640, 332], [640, 360], [0, 360], [0, 332]]);
    polygon(ctx, "#82bbd3", [[48, 205], [592, 205], [640, 338], [640, 360], [0, 360], [0, 338]]);
    polygon(ctx, "#8ec8dc", [[34, 249], [606, 249], [640, 342], [640, 360], [0, 360], [0, 342]]);
    polygon(ctx, "#99d2e2", [[19, 300], [621, 300], [640, 353], [640, 360], [0, 360], [0, 353]]);
    polygon(ctx, "#b5e2e9", [[51, 186], [589, 186], [590, 190], [50, 190]]);
    polygon(ctx, "#538ba9", [[51, 190], [56, 190], [0, 354], [0, 337]]);
    polygon(ctx, "#538ba9", [[584, 190], [589, 190], [640, 337], [640, 354]]);
}

function drawCentralArcadeLight(ctx) {
    // Two overhead fixtures converge on the central fighting area.
    for (const x of [248, 360]) {
        rect(ctx, "#101929", x - 3, 30, 38, 16);
        rect(ctx, "#40536b", x, 32, 32, 10);
        rect(ctx, "#8ebfce", x + 2, 38, 28, 5);
        rect(ctx, "#e4faff", x + 5, 40, 22, 3);
        rect(ctx, "#ffffff", x + 10, 41, 12, 1);
    }
    // Pixel-stepped cones remain behind the crowd and ropes.
    polygon(ctx, "#8edfff20", [[253, 46], [275, 46], [344, 164], [180, 164]]);
    polygon(ctx, "#8edfff20", [[365, 46], [387, 46], [460, 164], [296, 164]]);
    polygon(ctx, "#d8f5ff16", [[258, 46], [270, 46], [310, 130], [220, 130]]);
    polygon(ctx, "#d8f5ff16", [[370, 46], [382, 46], [420, 130], [330, 130]]);
}

function drawFloorDetails(ctx) {
    // Broad cool pool, then a warmer core; texture is drawn over the light.
    polygon(ctx, "#9bdcff28", [[190, 192], [450, 192], [556, 360], [84, 360]]);
    polygon(ctx, "#d9faff38", [[224, 192], [416, 192], [506, 360], [134, 360]]);
    polygon(ctx, "#f6f4d530", [[265, 192], [375, 192], [434, 360], [206, 360]]);
    polygon(ctx, "#ffffff18", [[291, 192], [349, 192], [382, 360], [258, 360]]);
    // Canvas weave grows toward the foreground with the floor perspective.
    // Integer rectangles keep the texture crisp; fixed seeds avoid frame noise.
    for (let row = 0, y = 194; y < 360; row += 1) {
        const depth = (y - 186) / 174;
        const unit = depth < 0.45 ? 1 : 2;
        const inset = Math.max(0, Math.ceil(51 * (1 - depth)));
        const spacing = 7 + Math.floor(depth * 5);
        for (let col = 0, x = inset + (row % 2) * 4; x < 640 - inset - 4; col += 1, x += spacing) {
            const seed = (row * 31 + col * 17) % 13;
            rect(ctx, seed < 5 ? "#315a7334" : "#efffff48", x, y, unit * 2, unit);
            if (seed === 0) rect(ctx, "#315a732a", x + unit, y + unit, unit, unit * 2);
        }
        y += 3 + Math.floor(depth * 3);
    }
        // Stitched edge and worn corner canvas remain part of the static scenery cache.
    for (let x = 75; x < 570; x += 13) {
        rect(ctx, '#dff5ef70', x, 196, 5, 1);
        rect(ctx, '#315a7338', x + 1, 197, 5, 1);
    }
    // Sparse stepped scuffs sit on the canvas instead of forming a grid.
    for (const [x, y, length] of [[113, 218, 11], [489, 227, 9], [169, 279, 17],
        [452, 304, 21], [86, 336, 25], [548, 267, 13]]) {
        rect(ctx, "#315a7340", x, y, length, 1);
        rect(ctx, "#315a732c", x + 3, y + 1, length - 5, 1);
        rect(ctx, "#efffff48", x + 2, y + 2, length - 3, 1);
    }
    // Emblema original: losango alado achatado pela perspectiva.
    // Baixo contraste preserva a legibilidade dos futuros personagens.
    polygon(ctx, "#73afc9", [[218, 239], [277, 239], [294, 250], [244, 250]]);
    polygon(ctx, "#73afc9", [[422, 239], [363, 239], [346, 250], [396, 250]]);
    polygon(ctx, "#609dbb", [[320, 222], [369, 244], [320, 266], [271, 244]]);
    polygon(ctx, "#b5dce5", [[320, 227], [357, 244], [320, 261], [283, 244]]);
    polygon(ctx, "#7bb5cf", [[320, 233], [344, 244], [320, 255], [296, 244]]);
    polygon(ctx, "#c3e6eb", [[320, 237], [334, 244], [320, 251], [306, 244]]);
}

export function drawFighterShadow(ctx, x, y, halfWidth) {
    const center = Math.round(x);
    const floor = Math.round(y);
    const radius = Math.max(4, Math.round(halfWidth));
    const depth = Math.max(3, Math.round(radius * 0.13));
    // Stepped oval: broad translucent edge, denser center, crisp pixel edges.
    for (let row = -depth; row <= depth; row += 1) {
        const normalized = row / (depth + 0.5);
        const span = Math.max(1, Math.round(radius * Math.sqrt(1 - normalized * normalized)));
        rect(ctx, "#132d4826", center - span, floor + row, span * 2, 1);
    }
    const inner = Math.round(radius * 0.72);
    rect(ctx, "#132d482b", center - inner, floor - 2, inner * 2, 5);
    // Two contact patches ground the stance under the soles.
    const footOffset = Math.round(radius * 0.52);
    const footWidth = Math.max(3, Math.round(radius * 0.38));
    for (const side of [-1, 1]) {
        const footX = center + side * footOffset - Math.round(footWidth / 2);
        rect(ctx, "#10283e52", footX, floor - 1, footWidth, 3);
    }
}

export function createScenery(width, height) {
    const cache = document.createElement("canvas");
    cache.width = width;
    cache.height = height;
    const ctx = cache.getContext("2d");
    if (!ctx) throw new Error("Canvas auxiliar do cenÃ¡rio indisponÃ­vel.");
    ctx.imageSmoothingEnabled = false;
    drawStadium(ctx);
    drawCentralArcadeLight(ctx);
    drawAudience(ctx);
    drawFloor(ctx);
    drawFloorDetails(ctx);
    const rear = document.createElement('canvas');
    rear.width=width;rear.height=height;
    const rearContext=rear.getContext('2d');
    if(!rearContext)throw new Error('Canvas da camada traseira do ringue indisponível.');
    rearContext.imageSmoothingEnabled=false;
    drawRearStructures(rearContext);
    drawRearRopes(rearContext);
    rearRingLayers.set(cache,rear);
    return cache;
}


