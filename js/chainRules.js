export const CHAIN_DIFFICULTIES = Object.freeze(["EASY", "MEDIUM", "HARD", "EXPERT"]);
export function chainStage(count) { return Math.max(1, Math.min(4, Math.trunc(count) || 1)); }
export function chainDifficulty(count) { return CHAIN_DIFFICULTIES[chainStage(count) - 1]; }
export function chainMultiplier(count) { return 1 + 0.5 * chainStage(count); }
export function chainStunAdditional(count) { return chainStage(count) + 1; }
