import { gameState } from "./gameState.js";
import { isMatchOver } from "./match.js";

export const AUTO_DODGE_TIMING = Object.freeze({ advance: 0.04, hold: 0.08, recovery: 0.16 });
export const AUTO_DODGE_DISTANCE = 6;
const holdEnd = AUTO_DODGE_TIMING.advance + AUTO_DODGE_TIMING.hold;
const total = holdEnd + AUTO_DODGE_TIMING.recovery;
const smooth = t => t * t * (3 - 2 * t);

export function startAutoDodge(enemyArm, impactAge = 0) {
    if (isMatchOver()) return;
    // Braço esquerdo inimigo chega à direita visual: sair para a esquerda.
    Object.assign(gameState.autoDodge, { direction: enemyArm === "left" ? "left" : "right", elapsed: 0, amount: 0 });
    updateAutoDodge(impactAge);
}

export function updateAutoDodge(deltaTime) {
    if (isMatchOver() || gameState.phase === "paused") return;
    const dodge = gameState.autoDodge;
    if (!dodge.direction) return;
    dodge.elapsed += deltaTime;
    if (dodge.elapsed + 1e-9 >= total) {
        Object.assign(dodge, { direction: null, elapsed: 0, amount: 0 });
    } else {
        dodge.amount = dodge.elapsed < AUTO_DODGE_TIMING.advance
            ? smooth(dodge.elapsed / AUTO_DODGE_TIMING.advance)
            : dodge.elapsed < holdEnd ? 1 : 1 - smooth((dodge.elapsed - holdEnd) / AUTO_DODGE_TIMING.recovery);
    }
}
