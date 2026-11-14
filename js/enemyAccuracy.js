export const ENEMY_ACCURACY = 0.80;
export const ENEMY_MISS_CHANCE = 1 - ENEMY_ACCURACY;

// null: produção; "miss" e "normal": testes manuais, sem revelar no QTE.
export const enemyAccuracyDebug = { forceOutcome: null };

export function rollEnemyMiss(accuracy = ENEMY_ACCURACY) {
    if (enemyAccuracyDebug.forceOutcome === "miss") return true;
    if (enemyAccuracyDebug.forceOutcome === "normal") return false;
    return Math.random() < 1 - accuracy;
}
