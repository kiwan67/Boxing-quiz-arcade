import { gameState } from "./gameState.js";

export const DIFFICULTIES = Object.freeze({
    easy: Object.freeze({ label: "Fácil", profile: "Simples", healthMultiplier: 1, damageDealtMultiplier: 0.9, damageTakenMultiplier: 1.1, min: 6, max: 9, accuracy: 0.65, dodge: 0.10, weights: Object.freeze([50, 30, 15, 5]) }),
    normal: Object.freeze({ label: "Normal", profile: "Equilibrada", healthMultiplier: 1, damageDealtMultiplier: 1, damageTakenMultiplier: 1, min: 4, max: 7, accuracy: 0.80, dodge: 0.15, weights: Object.freeze([35, 35, 20, 10]) }),
    hard: Object.freeze({ label: "Difícil", profile: "Adaptativa", healthMultiplier: 1.5, damageDealtMultiplier: 1.1, damageTakenMultiplier: 0.75, min: 3, max: 5, accuracy: 0.90, dodge: 0.20, weights: Object.freeze([25, 35, 25, 15]) })
});

const attacks = ["jab", "straight", "hook", "uppercut"];

export function activeDifficulty() {
    return DIFFICULTIES[gameState.difficulty];
}

export function recordPlayerAttack(type) {
    if (gameState.difficulty !== "hard") return;
    const history = gameState.offensiveAI.playerHistory;
    history.push(type);
    if (history.length > 5) history.shift();
}

export function usesCautiousGuard() {
    return gameState.difficulty === "hard"
        && gameState.offensiveAI.playerHistory.filter(type => type === "hook" || type === "uppercut").length >= 3;
}

export function chooseBotAttack() {
    const weights = [...activeDifficulty().weights];
    const history = gameState.offensiveAI.botHistory;
    if (usesCautiousGuard()) {
        weights[0] += 5;
        weights[3] -= 5;
    }
    if (gameState.difficulty !== "easy" && history.length === 2 && history[0] === history[1]) {
        weights[attacks.indexOf(history[0])] = 0;
    }
    let roll = Math.random() * weights.reduce((total, weight) => total + weight, 0);
    const index = weights.findIndex(weight => (roll -= weight) < 0);
    const type = attacks[index];
    if (gameState.difficulty !== "easy") {
        history.push(type);
        if (history.length > 2) history.shift();
    }
    return type;
}
