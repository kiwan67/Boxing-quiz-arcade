import { gameState } from "./gameState.js";
import { isMatchOver } from "./match.js";
import { PLAYER_ACTION_COOLDOWN } from "./cooldown.js";
import { playStunSound } from "./audio.js";

export function isStunned() { return gameState.stun.remaining > 0; }

// Um único relógio substitui apenas a contagem concorrente, preservando os 2 s base.
export function startStunRecovery(target, source, additional, impactId) {
    const stun = gameState.stun;
    if (isMatchOver() || gameState.phase === "paused" || isStunned() || !impactId
        || stun.impactId === impactId || !["player", "enemy"].includes(target)
        || !Number.isFinite(additional) || additional <= 0) return false;
    const total = PLAYER_ACTION_COOLDOWN + additional;
    Object.assign(stun, { target, source, additional, total, remaining: total, elapsed: 0, impactId });
    Object.assign(gameState.playerCombat, { state: "stun_recovery", arm: null, punchType: null, elapsed: 0, extension: 0, preparation: 0 });
    gameState.playerCooldown.remaining = 0;
    gameState.playerCooldown.readyMessageRemaining = 0;
    gameState.offensiveAI.remaining = null;
    playStunSound();
    return true;
}

export function updateStun(deltaTime) {
    if (!isStunned() || gameState.phase === "paused" || isMatchOver()) return;
    const stun = gameState.stun;
    const step = Math.min(deltaTime, stun.remaining);
    stun.elapsed += step;
    stun.remaining = Math.max(0, stun.remaining - step);
    if (stun.remaining < 1e-9) {
        stun.remaining = 0;
        gameState.playerCombat.state = "idle";
        gameState.playerCooldown.readyMessageRemaining = 0.5;
        gameState.offensiveAI.remaining = null;
    }
}
