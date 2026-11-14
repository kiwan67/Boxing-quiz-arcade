import { gameState } from "./gameState.js";
import { beginDefenseQuestion, answerQTE, updateQTE, isReadingQuestion } from "./qte.js";
import { calculateDefenseDamage, defenseDamageMultiplier } from "./damage.js";
import { ENEMY_BASE_DAMAGE, applyImpactDamage, isMatchOver } from "./match.js";
import { startAutoDodge } from "./autoDodge.js";
import { consumePerfectDefense } from "./debug.js";
import { ENEMY_ACCURACY } from "./enemyAccuracy.js";

export const DEFENSE_DIRECTION_TIME = 3.0;
export const defenseConfig = { baseDamage: ENEMY_BASE_DAMAGE };

export function defenseSideForCounterArm(arm) {
    // Bot de frente: braço anatômico esquerdo vem da direita da tela.
    // O defensor de costas usa os lados da tela/jogador, não os do bot.
    if (arm === "left") return "right";
    if (arm === "right") return "left";
    throw new Error("Braço de contra-ataque inválido.");
}

export function isDefenseActive() {
    return gameState.playerCombat.state === "defense_direction_qte"
        || gameState.playerCombat.state === "defense_question_qte";
}

export function beginDefense() {
    if (isReadingQuestion()) return false;
    if (isMatchOver() || gameState.phase === "lobby" || gameState.phase === "match_intro" || gameState.stun.remaining > 0) return false;
    const defense = gameState.defense;
    defense.counterId = gameState.counterAttack.questionId;
    defense.expectedSide = defenseSideForCounterArm(gameState.counterAttack.side);
    defense.selectedSide = null;
    defense.sideCorrect = false;
    defense.directionTimedOut = false;
    defense.remaining = DEFENSE_DIRECTION_TIME;
    defense.result = null;
    defense.feedbackRemaining = 0;
    gameState.playerCombat.state = "defense_direction_qte";
    return true;
}

function finishDirection(side) {
    const defense = gameState.defense;
    defense.selectedSide = side;
    defense.sideCorrect = side !== null && side === defense.expectedSide;
    defense.directionTimedOut = side === null;
    defense.remaining = 0;
    beginDefenseQuestion();
}

export function selectDefenseSide(side) {
    if (isMatchOver() || gameState.playerCombat.state !== "defense_direction_qte"
        || (side !== "left" && side !== "right")) return false;
    finishDirection(side);
    return true;
}

export function finishDefense(questionResult) {
    const defense = gameState.defense;
    if (!questionResult || defense.result) return false;
    if (isReadingQuestion()) return true;
    const questionCorrect = questionResult.outcome === "correct";
    const multiplier = defenseDamageMultiplier(defense.sideCorrect, questionCorrect);
    const baseDamage = gameState.counterAttack.baseDamage ?? defenseConfig.baseDamage;
    defense.result = {
        counterId: defense.counterId,
        questionId: questionResult.questionId,
        counterArm: gameState.counterAttack.side,
        expectedSide: defense.expectedSide,
        selectedSide: defense.selectedSide,
        defenseSideCorrect: defense.sideCorrect,
        questionCorrect,
        correctAnswer: questionResult.correctAnswer,
        selectedAnswer: questionResult.answer,
        questionOutcome: questionResult.outcome,
        attackAccuracy: gameState.counterAttack.accuracy ?? ENEMY_ACCURACY,
        damageMultiplier: multiplier,
        perfectDefense: false,
        counterRushActivated: false,
        directionTimedOut: defense.directionTimedOut,
        questionTimedOut: questionResult.outcome === "timeout",
        riskBonus: gameState.counterAttack.riskBonus,
        baseDamage,
        damage: calculateDefenseDamage(defense.sideCorrect, questionCorrect, baseDamage),
        damagePercent: Math.round(multiplier * 100),
        impactRegistered: false
    };
    defense.feedbackRemaining = 1.2;
    gameState.counterAttack.pending = false;
    gameState.playerCombat.state = "counter_wait";
    return true;
}

export function submitDefenseAnswer(answer, questionId) {
    if (isMatchOver() || gameState.playerCombat.state !== "defense_question_qte") return false;
    return finishDefense(answerQTE(answer, questionId));
}

// Retorna o tempo consumido pelos QTEs; o combate usa a sobra na animação.
export function updateDefense(deltaTime) {
    if (isReadingQuestion()) return 0;
    let remainingStep = deltaTime;
    if (gameState.playerCombat.state === "defense_direction_qte") {
        const consumed = Math.min(remainingStep, gameState.defense.remaining);
        gameState.defense.remaining = Math.max(0, gameState.defense.remaining - consumed);
        remainingStep -= consumed;
        if (gameState.defense.remaining <= 1e-9) finishDirection(null);
        else return deltaTime;
    }
    if (gameState.playerCombat.state === "defense_question_qte") {
        const consumed = Math.min(remainingStep, gameState.qte.remaining);
        const result = updateQTE(consumed);
        remainingStep -= consumed;
        if (result) finishDefense(result);
        else return deltaTime;
    }
    return deltaTime - remainingStep;
}

export function registerDefenseImpact(event) {
    const defense = gameState.defense;
    const result = defense.result;
    if (isMatchOver() || !result || result.counterId !== event.questionId || result.impactRegistered) return;
    result.impactRegistered = true;
    result.impactId = event.id;
    result.impactAt = event.at;
    const forcedPerfect = consumePerfectDefense(result.counterId, gameState.counterAttack.naturalMiss);
    if (forcedPerfect) {
        result.debugOriginalDefense = { sideCorrect: result.defenseSideCorrect, questionCorrect: result.questionCorrect,
            naturalMiss: gameState.counterAttack.naturalMiss };
        result.defenseSideCorrect = true;
        result.questionCorrect = true;
        result.damage = calculateDefenseDamage(true, true, result.baseDamage);
        result.damagePercent = defenseDamageMultiplier(true, true) * 100;
        result.damageMultiplier = defenseDamageMultiplier(true, true);
        result.debugOverride = "perfect_defense";
        event.debugOverride = "perfect_defense";
        event.originalNaturalMiss = event.naturalMiss;
        event.naturalMiss = false;
    }
    result.naturalMiss = !forcedPerfect && gameState.counterAttack.naturalMiss === true;
    if (result.naturalMiss) {
        result.defenseDamage = result.damage;
        result.damage = 0;
        result.damagePercent = 0;
        result.damageMultiplier = 0;
        startAutoDodge(result.counterArm, event.elapsedSinceImpact || 0);
        defense.feedbackRemaining = Math.max(0, 1.2 - (event.elapsedSinceImpact || 0));
    }
    result.perfectDefense = !result.naturalMiss && result.defenseSideCorrect && result.questionCorrect;
    defense.lastResult = result;
    result.damageApplied = applyImpactDamage("player", result.damage, event.id, gameState.matchId, event.elapsedSinceImpact || 0);
    result.stunAdditional = !isMatchOver() && !result.naturalMiss && !result.defenseSideCorrect
        && !result.questionCorrect && result.damageApplied > 0 ? 2 : 0;
}

export function updateDefenseFeedback(deltaTime) {
    gameState.defense.feedbackRemaining = Math.max(0, gameState.defense.feedbackRemaining - deltaTime);
}
