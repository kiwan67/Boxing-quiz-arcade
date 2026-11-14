// Balanceamento defensivo. Bloqueio é condicional à falha da esquiva.
import { DIFFICULTIES } from "./difficulty.js";

export const DODGE_CHANCES = Object.freeze(
    Object.fromEntries(Object.entries(DIFFICULTIES).map(([key, profile]) => [key, profile.dodge]))
);
export const BLOCK_CHANCES = Object.freeze({ jab: 0.05, straight: 0.10, hook: 0.20, uppercut: 0.30 });
export const BLOCK_DAMAGE_REDUCTION = 0.75;
export const BLOCK_RECOVERY_TIME = 0.22;

// Jogador de costas, adversário de frente: braços anatômicos opostos
// ocupam o mesmo lado visual. Esta conversão não altera os desenhos.
export function blockingArmForPlayerArm(arm) {
    return arm === "left" ? "right" : "left";
}
