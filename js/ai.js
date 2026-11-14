import { gameState } from "./gameState.js";
import { isMatchOver } from "./match.js";
import { beginSpontaneousAttack } from "./counterAttack.js";
import { PUNCH_TYPES, DEFAULT_PUNCH } from "./punchTypes.js";
import { BLOCK_CHANCES, BLOCK_DAMAGE_REDUCTION, BLOCK_RECOVERY_TIME, blockingArmForPlayerArm } from "./enemyDefense.js";
export { DODGE_CHANCES } from "./enemyDefense.js";
import { chainMultiplier } from "./chainRules.js";
import { consumeRushDebugOutcome } from "./debug.js";
import { activeDifficulty, DIFFICULTIES } from "./difficulty.js";

export const ENEMY_ATTACK_INTERVAL_MIN = DIFFICULTIES.normal.min;
export const ENEMY_ATTACK_INTERVAL_MAX = DIFFICULTIES.normal.max;
// Mantém compatibilidade com as referências da integração anterior.
export const AI_ATTACK_INTERVAL_MIN = ENEMY_ATTACK_INTERVAL_MIN;
export const AI_ATTACK_INTERVAL_MAX = ENEMY_ATTACK_INTERVAL_MAX;
// Parte 11B: oportunidades ofensivas independentes ativas por padrão.
export const offensiveAIConfig = { enabled: true };

export function updateOffensiveClock(deltaTime) {
    if (!offensiveAIConfig.enabled || isMatchOver() || gameState.phase === "paused" || gameState.phase === "lobby" || gameState.phase === "match_intro") return;
    const player = gameState.playerCombat.state;
    const opponent = gameState.opponentCombat.state;
    const offense = gameState.offensiveAI;
    if (gameState.counterChain.active || gameState.stun.remaining > 0 || gameState.counterAttack.pending || opponent.startsWith("counter_") || player.startsWith("counter_rush_") || player === "qte_failed"
        || player === "defense_direction_qte" || player === "defense_question_qte" || player === "counter_wait") {
        // O próximo intervalo começa após esta sequência, sem formar fila.
        offense.remaining = null;
        return;
    }
    if (offense.remaining === null) {
        const { min, max } = activeDifficulty();
        offense.remaining = min + Math.random() * (max - min);
    }
    offense.remaining = Math.max(0, offense.remaining - deltaTime);
}

export function tryOffensiveAttack() {
    if (!offensiveAIConfig.enabled || isMatchOver() || gameState.phase === "paused" || gameState.phase === "match_intro"
        || gameState.offensiveAI.remaining === null || gameState.offensiveAI.remaining > 1e-9) return false;
    if (!beginSpontaneousAttack()) return false;
    gameState.offensiveAI.remaining = null;
    return true;
}

export const DODGE_TIMING = Object.freeze({ advance: 0.10, hold: 0.12, recovery: 0.18 });
const HOLD_END = DODGE_TIMING.advance + DODGE_TIMING.hold;
const TOTAL = HOLD_END + DODGE_TIMING.recovery;

export function clearAttackFeedback() {
    const feedback = gameState.attackFeedback;
    feedback.remaining = 0;
    feedback.delay = 0;
    feedback.outcome = null;
    feedback.rush = false;
}

export function decideOpponentResponse(qteResult, impactTime) {
    const opponent = gameState.opponentCombat;
    if (isMatchOver() || qteResult.outcome !== "correct" || opponent.state !== "idle"
        || gameState.lastAttackResult?.questionId === qteResult.questionId) return false;
    // Counter Rush pula o sorteio de esquiva; ataques normais mantêm a ordem anterior.
    const rush = qteResult.kind === "counter_rush";
    const dodged = !rush && Math.random() < activeDifficulty().dodge;
    const direction = dodged ? (Math.random() < 0.5 ? "left" : "right") : null;
    const punchType = qteResult.punchType || DEFAULT_PUNCH;
    const debugOutcome = rush ? consumeRushDebugOutcome() : null;
    const blocked = !dodged && (debugOutcome ? debugOutcome === "blocked" : Math.random() < BLOCK_CHANCES[punchType]);
    gameState.lastAttackResult = {
        questionId: qteResult.questionId,
        arm: qteResult.arm,
        punchType: qteResult.punchType || DEFAULT_PUNCH,
        kind: qteResult.kind,
        noQTE: qteResult.noQTE === true,
        rushMultiplier: rush ? chainMultiplier(gameState.counterChain.count) : 1,
        debugOverride: debugOutcome,
        baseDamage: PUNCH_TYPES[qteResult.punchType || DEFAULT_PUNCH].damage
            * (rush ? chainMultiplier(gameState.counterChain.count) : 1),
        outcome: dodged ? "dodged" : blocked ? "blocked" : "hit",
        damageMultiplier: dodged ? 0 : blocked ? 1 - BLOCK_DAMAGE_REDUCTION : 1,
        blockArm: blocked ? blockingArmForPlayerArm(qteResult.arm) : null,
        dodgeDirection: direction,
        qteOutcome: qteResult.outcome,
        impactResolved: false,
        damageApplied: 0
    };
    if (dodged) {
        opponent.state = direction === "left" ? "dodge_left" : "dodge_right";
        opponent.direction = direction;
        opponent.elapsed = 0;
        opponent.offset = 0;
    } else if (blocked) {
        opponent.blockArm = gameState.lastAttackResult.blockArm;
        opponent.state = `block_${opponent.blockArm}`;
        opponent.elapsed = 0;
        opponent.blockImpactTime = impactTime;
        opponent.blockAmount = 0;
    }
    const feedback = gameState.attackFeedback;
    feedback.outcome = gameState.lastAttackResult.outcome;
    feedback.rush = qteResult.kind === "counter_rush";
    feedback.delay = impactTime;
    feedback.remaining = 0.75;
    return true;
}

export function registerFailedAttack(qteResult) {
    gameState.lastAttackResult = {
        questionId: qteResult.questionId,
        arm: qteResult.arm,
        outcome: "failed_qte",
        punchType: qteResult.punchType || DEFAULT_PUNCH,
        dodgeDirection: null,
        qteOutcome: qteResult.outcome
    };
    clearAttackFeedback();
}

function smooth(t) { return t * t * (3 - 2 * t); }

export function updateAI(deltaTime) {
    if (isMatchOver()) return;
    const feedback = gameState.attackFeedback;
    const feedbackStep = Math.max(0, deltaTime - feedback.delay);
    feedback.delay = Math.max(0, feedback.delay - deltaTime);
    feedback.remaining = Math.max(0, feedback.remaining - feedbackStep);

    const opponent = gameState.opponentCombat;
    if (opponent.state.startsWith("block_")) {
        opponent.elapsed += deltaTime;
        const recovery = Math.max(0, opponent.elapsed - opponent.blockImpactTime);
        if (recovery + 1e-9 >= BLOCK_RECOVERY_TIME) {
            Object.assign(opponent, { state: "idle", elapsed: 0, blockArm: null, blockAmount: 0, blockImpactTime: 0 });
        } else {
            opponent.blockAmount = opponent.elapsed < opponent.blockImpactTime
                ? smooth(Math.min(1, opponent.elapsed / opponent.blockImpactTime))
                : 1 - smooth(recovery / BLOCK_RECOVERY_TIME);
        }
        return;
    }
    if (!opponent.state.startsWith("dodge_")) return;
    opponent.elapsed += deltaTime;
    if (opponent.elapsed + 1e-9 >= TOTAL) {
        opponent.state = "idle";
        opponent.elapsed = 0;
        opponent.direction = null;
        opponent.offset = 0;
        return;
    }
    const direction = opponent.direction === "left" ? -1 : 1;
    if (opponent.elapsed + 1e-9 >= HOLD_END) {
        opponent.state = "dodge_recovering";
        const t = Math.max(0, (opponent.elapsed - HOLD_END) / DODGE_TIMING.recovery);
        opponent.offset = direction * (1 - smooth(t));
    } else if (opponent.elapsed >= DODGE_TIMING.advance) {
        opponent.offset = direction;
    } else {
        opponent.offset = direction * smooth(opponent.elapsed / DODGE_TIMING.advance);
    }
}
