export function defenseDamageMultiplier(defenseSideCorrect, questionCorrect) {
    return defenseSideCorrect ? (questionCorrect ? 0.10 : 0.25) : (questionCorrect ? 0.50 : 1);
}

// Cálculo puro; não lê nem modifica a vida ou o estado do jogo.
export function calculateDefenseDamage(defenseSideCorrect, questionCorrect, baseDamage) {
    if (!Number.isFinite(baseDamage) || baseDamage < 0) throw new RangeError("Dano base inválido.");
    return baseDamage * defenseDamageMultiplier(defenseSideCorrect, questionCorrect);
}
