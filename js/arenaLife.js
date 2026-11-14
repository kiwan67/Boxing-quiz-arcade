import { presentationSettings } from "./presentationSettings.js";

// Fixed seats behind the ropes. A private PRNG never consumes combat randomness.
export const CAMERA_SEATS = Object.freeze([
    [78, 80], [174, 85], [288, 80], [402, 84], [553, 78],
    [105, 105], [231, 104], [365, 106], [518, 102],
    [87, 126], [194, 130], [441, 128], [555, 127]
].map(point => Object.freeze(point)));
export const arenaLife = { matchId: null, time: 0, nextFlash: 1, seed: 1,
    flashes: Array.from({ length: 3 }, () => ({ seat: 0, remaining: 0, duration: 0.1 })),
    reaction: { id: 0, age: 10, strength: 0, kind: "idle" }, intro: false };
let seenAmbientOutcome, seenAttack, seenDefense, previousChain = 0, wasStunned = false, wasRush = false;
function random() { arenaLife.seed = (Math.imul(arenaLife.seed, 1664525) + 1013904223) >>> 0; return arenaLife.seed / 4294967296; }
function react(kind, strength) {
    Object.assign(arenaLife.reaction, { id: arenaLife.reaction.id + 1, age: 0, strength, kind });
}
export function announceArenaWinner(victory) { react("winner", victory ? 1.4 : 1); }
export function resetArenaLife(matchId) {
    Object.assign(arenaLife, { matchId, time: 0, nextFlash: 0.8, seed: (matchId + 17) >>> 0, intro: false });
    Object.assign(arenaLife.reaction, { id: 0, age: 10, strength: 0, kind: "idle" });
    for (const flash of arenaLife.flashes) flash.remaining = 0;
    seenAmbientOutcome = seenAttack = seenDefense = null;
    previousChain = 0; wasStunned = wasRush = false;
}
export function updateArenaLife(state, delta) {
    if (arenaLife.matchId !== state.matchId) resetArenaLife(state.matchId);
    if (state.phase === "paused") return;
    if (state.phase === "lobby") { for (const flash of arenaLife.flashes) flash.remaining = 0; return; }
    arenaLife.intro = state.phase === "match_intro";
    arenaLife.time += delta;
    arenaLife.reaction.age += delta;
    const attack = state.lastAttackResult;
    if (attack?.impactResolved && attack !== seenAttack) {
        seenAttack = attack;
        if (attack.outcome === "hit" && attack.damageApplied > 0)
            react(attack.kind === "counter_rush" ? "rush-hit" : "hit", ({ jab: 0.22, straight: 0.45, hook: 0.75, uppercut: 1.2 }[attack.punchType] ?? 0.5));
    }
        if (attack?.impactResolved && attack !== seenAmbientOutcome && attack.outcome !== 'hit') {
        seenAmbientOutcome = attack;
        if (attack.outcome === 'dodged') react('dodge', 0.2);
        else if (attack.outcome === 'blocked') react('block', 0.15);
    }
    const defense = state.defense.lastResult;
    if (defense?.impactRegistered && defense !== seenDefense) {
        seenDefense = defense;
        if (defense.perfectDefense) react('perfect-defense', 0.95);
        else if (defense.damageApplied === 0) react('defense', 0.25);
        else if (defense.damageApplied > 0) react("hit", ["hook", "uppercut"].includes(state.counterAttack.type) ? 1 : 0.6);
    }
    const rush = state.counterRush.cutsceneRemaining > 0 || state.counterRush.remaining > 0;
    if (rush && !wasRush) react("rush", 0.8);
    wasRush = rush;
    const chain = state.counterChain.count;
    if (chain > previousChain && chain > 0) react("chain", Math.min(1.5, 0.35 + chain * 0.3));
    previousChain = chain;
    const stunned = state.stun.remaining > 0;
    if (stunned && !wasStunned) react("stun", 0.8);
    wasStunned = stunned;
    for (const flash of arenaLife.flashes) flash.remaining = Math.max(0, flash.remaining - delta);
    if (presentationSettings.flashes === "off") { for (const flash of arenaLife.flashes) flash.remaining = 0; return; }
    arenaLife.nextFlash -= delta;
    if (arenaLife.nextFlash > 0) return;
    const excited = arenaLife.reaction.age < 1.2 && arenaLife.reaction.strength >= 0.75 || arenaLife.intro || rush || state.counterChain.active || Boolean(state.matchResult);
    const reduced = presentationSettings.flashes === "reduced";
    arenaLife.nextFlash = (excited ? 0.65 + random() * 1.1 : 1.5 + random() * 3.2) * (reduced ? 2.5 : 1);
    const slot = arenaLife.flashes.find(flash => flash.remaining <= 0);
    if (slot) {
        slot.seat = Math.floor(random() * CAMERA_SEATS.length);
        slot.duration = 0.08 + random() * 0.07;
        slot.remaining = slot.duration;
    }
}
export function crowdSectorEnergy(group) {
    const age = arenaLife.reaction.age - (group % 6) * 0.095 - (group % 3) * 0.025;
    return age >= 0 && age < 1.1 ? arenaLife.reaction.strength * (1 - age / 1.1) : 0;
}
export function drawCameraFlashes(ctx) {
    if (presentationSettings.flashes === "off") return;
    ctx.save();
    for (const flash of arenaLife.flashes) {
        if (flash.remaining <= 0) continue;
        const [x, y] = CAMERA_SEATS[flash.seat];
        ctx.globalAlpha = (presentationSettings.flashes === "reduced" ? 0.45 : 0.85) * Math.min(1, flash.remaining / flash.duration * 2);
        ctx.fillStyle = "#81bce9";
        ctx.fillRect(x - 4, y - 1, 9, 3); ctx.fillRect(x - 1, y - 4, 3, 9);
        ctx.fillStyle = "#f5fdff"; ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fillStyle = "#1a2739"; ctx.fillRect(x - 3, y + 4, 6, 3);
    }
    ctx.restore();
}
export function drawArenaLighting(ctx, highlight = 0) {
    const beat = 0.5 + Math.sin(arenaLife.time * 0.7) * 0.5;
    const strength = Math.max(highlight, Math.min(1, arenaLife.reaction.strength * Math.max(0, 1 - arenaLife.reaction.age)));
    ctx.save();
    ctx.globalAlpha = 0.025 + beat * 0.025 + strength * 0.055;
    ctx.fillStyle = "#cef4ff";
    ctx.beginPath(); ctx.moveTo(256, 46); ctx.lineTo(276, 46);
    ctx.lineTo(440, 302); ctx.lineTo(161, 302); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(366, 46); ctx.lineTo(386, 46);
    ctx.lineTo(479, 302); ctx.lineTo(200, 302); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.08 + strength * 0.07; ctx.fillRect(224, 289, 192, 3);
        // Rope glints and ringside bulbs share the arena pulse, below character layers.
    ctx.globalAlpha = 0.12 + strength * 0.12;
    ctx.fillStyle = '#e0f9ff';
    for (const x of [66, 153, 469, 552]) ctx.fillRect(x, 133, 21, 1);
    ctx.globalAlpha = 0.08 + beat * 0.035;
    ctx.fillStyle = '#8ebbe5'; ctx.fillRect(0, 62, 640, 3);
    ctx.globalAlpha = 0.25 + beat * 0.2;
    for (const [x, y] of [[52, 99], [599, 99], [266, 41], [376, 41]]) ctx.fillRect(x, y, 2, 1);
    ctx.restore();
}


