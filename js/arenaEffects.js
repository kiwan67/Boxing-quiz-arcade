import { presentationSettings } from "./presentationSettings.js";
const intensityByPunch = Object.freeze({ jab: 1, straight: 2, hook: 3, uppercut: 4 });
const lifetime = 0.24;
const rays = [[1, -0.4], [-1, -0.5], [0.8, 0.6], [-0.8, 0.65],
    [0.4, -1], [-0.35, -1], [1, 0.15], [-1, 0.2], [0.3, 1], [-0.35, 1],
    [0.67, -0.72], [-0.74, -0.67], [0.8, -0.6], [-0.9, 0.3], [0.1, -1], [-0.1, 1]];

export const arenaEffects = { matchId: null, time: 0, impactTime: lifetime, intensity: 0, crowdTime: 0,
    decisive: false, rush: false, uppercut: false, side: 1, x: 320, y: 150 };
let seenAttack;
let seenDefense;
let wasStunned = false;
let wasRushing = false;
let seenChain = 0;

export function updateArenaEffects(state, delta, poses) {
    if (state.matchId !== arenaEffects.matchId) {
        arenaEffects.matchId = state.matchId;
        seenAttack = seenDefense = null;
        wasStunned = false;
        wasRushing = false;
        seenChain = 0;
        Object.assign(arenaEffects, { time: 0, impactTime: lifetime, intensity: 0, crowdTime: 0, decisive: false, rush: false, uppercut: false, directPlayerHit: false });
    }
    arenaEffects.time += delta;
    arenaEffects.impactTime = Math.min(lifetime, arenaEffects.impactTime + delta);
    arenaEffects.crowdTime = Math.max(0, arenaEffects.crowdTime - delta);
    const rushing = state.counterRush?.cutsceneRemaining > 0 || state.counterRush?.remaining > 0;
    const chain = state.counterChain.count;
    if ((rushing && !wasRushing) || chain > seenChain) {
        arenaEffects.crowdTime = Math.max(arenaEffects.crowdTime,
            1.2 + Math.min(3, Math.max(0, chain - 1)) * 0.2);
    }
    wasRushing = Boolean(rushing);
    seenChain = chain;
    // Sustain cheering through the cutscene, attack window and chain transitions.
    // An inactive chain may retain its count, so count alone must not sustain it.
    if (rushing || state.counterChain.active) {
        const sustained = 0.85 + (state.counterChain.active ? Math.min(3, Math.max(0, chain - 1)) * 0.1 : 0);
        arenaEffects.crowdTime = Math.max(arenaEffects.crowdTime, sustained);
    }
    const attack = state.lastAttackResult;
    const defense = state.defense.lastResult;
    if (attack?.impactResolved && seenAttack !== attack) {
        seenAttack = attack;
        if (attack.outcome === "hit" && attack.damageApplied > 0) {
            const rush = attack.kind === "counter_rush";
            const intensity = Math.min(5, (intensityByPunch[attack.punchType] ?? 2) + (rush ? 1 : 0)
                + (rush && state.counterChain.count > 1 ? 1 : 0));
            startImpact("enemy", attack.arm, intensity, rush, state, poses?.opponent, attack.punchType);
        }
    }
    if (defense?.impactRegistered && seenDefense !== defense) {
        seenDefense = defense;
        if (defense.damageApplied > 0) {
            startImpact("player", defense.counterArm, intensityByPunch[state.counterAttack.type] ?? 2, false, state, poses?.player, state.counterAttack.type);
        }
    }
    const stunned = state.stun.remaining > 0;
    if (stunned && !wasStunned) arenaEffects.crowdTime = Math.max(arenaEffects.crowdTime, 0.7);
    wasStunned = stunned;
}

function startImpact(target, arm, intensity, rush, state, pose, punchType) {
    arenaEffects.directPlayerHit = target === "enemy";
    const side = arm === "left" ? -1 : 1;
    const scale = target === "enemy" ? 2 : 3;
    const screenSide = target === "player" ? -side : side;
    arenaEffects.impactTime = 0;
    arenaEffects.intensity = intensity;
    arenaEffects.side = screenSide;
    arenaEffects.rush = rush;
    arenaEffects.uppercut = punchType === "uppercut";
    arenaEffects.decisive = state.phase === "victory" || state.phase === "defeat";
    arenaEffects.x = Math.round(320 + (pose?.torsoX ?? 0) * scale + screenSide * 18);
    arenaEffects.y = Math.round((target === "enemy" ? 148 : 218) + (pose?.breathOffset ?? 0) + (pose?.recoilY ?? 0));
    // Strong confirmed hits produce a clear burst of raised arms and head movement.
    // The crowd animation clamps energy to one, then settles as this timer decays.
    const strongReaction = intensity >= 5 ? 1.5 : intensity === 4 ? 1.3 : intensity === 3 ? 1.1 : 0;
    arenaEffects.crowdTime = Math.max(arenaEffects.crowdTime,
        strongReaction, rush ? 1.05 : 0.28 + intensity * 0.11);
}

export function arenaShakeX() {
    // A short integer offset keeps the established camera and fighter scale intact.
    const duration = 0.1;
    if (arenaEffects.intensity < 3 || arenaEffects.impactTime >= duration) return 0;
    const strength = presentationSettings.reducedShake || presentationSettings.shake === "off" ? 0 : presentationSettings.shake === "reduced" ? 1 : Math.min(2, arenaEffects.intensity - 2);
    const direction = Math.floor(arenaEffects.impactTime * 48) % 2 ? -1 : 1;
    return Math.round(strength * (1 - arenaEffects.impactTime / duration)) * direction * arenaEffects.side;
}

export function drawArenaImpact(ctx) {
    const { impactTime, intensity, rush, uppercut, side, x, y } = arenaEffects;
    if (impactTime >= lifetime) return;
    const progress = impactTime / lifetime;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    // A local flash lasts 50 ms; only a decisive hit may flash the full screen.
    if (impactTime < 0.05 && presentationSettings.flashes !== "off") {
        const radius = 5 + intensity * 2 + (rush ? 2 : 0);
        ctx.globalAlpha = (presentationSettings.flashes === "reduced" ? 0.1 : 0.28) * (1 - impactTime / 0.05);
        ctx.fillStyle = rush ? "#d5f8ff" : "#fff0bf";
        ctx.fillRect(x - radius, y - Math.floor(radius / 2), radius * 2 + 1, radius + 1);
        ctx.globalAlpha = 1 - progress;
    }
    if (impactTime < 0.065) {
        const radius = intensity + 3;
        ctx.fillStyle = "#fff8de";
        ctx.fillRect(x - radius, y - 1, radius * 2 + 1, 3);
        ctx.fillRect(x - 1, y - radius, 3, radius * 2 + 1);
    }
    for (let i = 0; i < 3 + intensity * 2; i += 1) {
        const [rayX, dy] = rays[i];
        const dx = rayX * side;
        const distance = 6 + (20 + intensity * 4) * progress + i % 3;
        const px = Math.round(x + dx * distance * (rush ? 1.18 : 1));
        // Uppercuts throw the burst upward; Rush spreads a wider cyan burst.
        const py = Math.round(y + dy * distance + progress * progress * 10
            - (uppercut ? progress * (14 + intensity * 2) : 0));
        ctx.fillStyle = rush ? (i % 2 ? "#edffff" : "#75dcff")
            : uppercut ? (i % 2 ? "#fff7ca" : "#ffb35a")
            : i % 2 ? "#fff1a0" : "#ffc378";
        // Sparks shrink to single pixels as they fall and fade.
        const size = progress > 0.65 ? 1 : 2;
        ctx.fillRect(px, py, size + (progress <= 0.65 && i % 3 === 0 ? 1 : 0), size);
        if (i < intensity && progress < 0.55) {
            // Two short pixel steps align the streak with its particle trajectory.
            const length = 3 + intensity;
            const trailX = px - Math.round(dx * length);
            const trailY = py - Math.round(dy * length);
            const midX = Math.round((trailX + px) / 2);
            const midY = Math.round((trailY + py) / 2);
            ctx.fillRect(Math.min(trailX, midX), trailY, Math.abs(midX - trailX) + 1, 1);
            ctx.fillRect(Math.min(midX, px), midY, Math.abs(px - midX) + 1, 1);
        }
    }
    ctx.restore();
}

export function drawRushLight(ctx) {
    if (!arenaEffects.rush || arenaEffects.impactTime >= lifetime) return;
    ctx.fillStyle = "#d7f9ff21";
    ctx.fillRect(225, 254, 190, 12);
    ctx.fillRect(248, 250, 144, 4);
    ctx.fillRect(248, 266, 144, 4);
}

export function drawDecisiveFlash(ctx) {
    if (!arenaEffects.decisive || arenaEffects.impactTime >= 0.1 || presentationSettings.flashes === "off") return;
    ctx.save();
    ctx.globalAlpha = (presentationSettings.flashes === "reduced" ? 0.06 : 0.17) * (1 - arenaEffects.impactTime / 0.1);
    ctx.fillStyle = "#fff4d6";
    ctx.fillRect(0, 0, 640, 360);
    ctx.restore();
}


// Separate from camera flashes: one confirmed contact, no queued pulse or timer.
export function drawContactFlash(ctx) {
    const age = arenaEffects.impactTime;
    if (!arenaEffects.directPlayerHit || age >= 0.1 || presentationSettings.impactFlash === 'off') return;
    ctx.save();
    ctx.fillStyle = '#e8f7ff';
    ctx.globalAlpha = (presentationSettings.impactFlash === 'reduced' ? 0.07 : 0.28) * (1 - age / 0.1);
    ctx.fillRect(0, 54, 640, 306);
    ctx.restore();
}
