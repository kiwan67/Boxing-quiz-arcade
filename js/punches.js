import { gameState } from "./gameState.js";
import { PUNCH_TYPES, PUNCH_ORDER } from "./punchTypes.js";
import { isMatchOver } from "./match.js";
import { recordPlayerAttack } from "./difficulty.js";

const cooldownListeners = new Set();
export function onPunchCooldownChange(listener) {
    cooldownListeners.add(listener);
    return () => cooldownListeners.delete(listener);
}

export function selectPunch(type) {
    if (!Object.hasOwn(PUNCH_TYPES, type) || isMatchOver() || gameState.phase === "paused" || gameState.phase === "lobby" || gameState.phase === "match_intro") return false;
    gameState.punches.selected = type;
    return true;
}

export function isPunchReady(type) {
    return Object.hasOwn(PUNCH_TYPES, type) && gameState.punches.cooldowns[type] === 0;
}

export function consumePunchCooldown(type) {
    if (isMatchOver() || gameState.phase === "paused" || gameState.phase === "lobby" || gameState.phase === "match_intro" || !isPunchReady(type)) return false;
    // Uma tentativa válida avança somente os outros golpes. Não existe timer.
    for (const other of PUNCH_ORDER) {
        if (other !== type) gameState.punches.cooldowns[other] = Math.max(0, gameState.punches.cooldowns[other] - 1);
    }
    gameState.punches.cooldowns[type] = PUNCH_TYPES[type].cooldownActions;
    recordPlayerAttack(type);
    for (const listener of cooldownListeners) listener();
    return true;
}
