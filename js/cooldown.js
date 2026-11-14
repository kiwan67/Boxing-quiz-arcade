import { gameState } from "./gameState.js";
import { isMatchOver } from "./match.js";

export const PLAYER_ACTION_COOLDOWN = 2.0;

export function startPlayerCooldown() {
    if (isMatchOver() || gameState.phase === "paused") return;
    Object.assign(gameState.playerCombat, { state: "action_cooldown", arm: null, punchType: null, elapsed: 0, extension: 0, preparation: 0 });
    gameState.playerCooldown.remaining = PLAYER_ACTION_COOLDOWN;
    gameState.playerCooldown.readyMessageRemaining = 0;
}

export function updatePlayerCooldown(deltaTime) {
    if (isMatchOver() || gameState.phase === "paused" || gameState.playerCombat.state !== "action_cooldown") return;
    const cooldown = gameState.playerCooldown;
    const overflow = Math.max(0, deltaTime - cooldown.remaining);
    cooldown.remaining = Math.max(0, cooldown.remaining - deltaTime);
    if (cooldown.remaining <= 1e-9) {
        cooldown.remaining = 0;
        cooldown.readyMessageRemaining = Math.max(0, 0.5 - overflow);
        gameState.playerCombat.state = "idle";
    }
}

export function updateReadyMessage(deltaTime) {
    if (isMatchOver() || gameState.phase === "paused") return;
    const cooldown = gameState.playerCooldown;
    cooldown.readyMessageRemaining = Math.max(0, cooldown.readyMessageRemaining - deltaTime);
}
