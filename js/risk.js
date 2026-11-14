import { gameState } from "./gameState.js";
import { isMatchOver } from "./match.js";

export const PUNCH_RISK_BONUSES = Object.freeze({ jab: 0, straight: 0.10, hook: 0.25, uppercut: 0.50 });
const MAX_RISK_BONUS = Math.max(...Object.values(PUNCH_RISK_BONUSES));

// Recebe somente o resultado validado do QTE ofensivo, antes de enfileirar o bot.
export function registerAttackRisk(result) {
    if (isMatchOver() || result?.kind !== "attack"
        || (result.outcome !== "incorrect" && result.outcome !== "timeout")
        || !Object.hasOwn(PUNCH_RISK_BONUSES, result.punchType)) return false;
    gameState.pendingRiskBonus = Math.min(MAX_RISK_BONUS,
        Math.max(gameState.pendingRiskBonus, PUNCH_RISK_BONUSES[result.punchType]));
    return true;
}

export function consumeRiskBonus() {
    const bonus = gameState.pendingRiskBonus;
    gameState.pendingRiskBonus = 0;
    return bonus;
}
