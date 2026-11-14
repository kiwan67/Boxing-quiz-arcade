import { gameState } from "./gameState.js";
import { beginAttackQTE, answerQTE, updateQTE, isReadingQuestion, updateQuestionReading } from "./qte.js";
import { decideOpponentResponse, registerFailedAttack, updateAI, clearAttackFeedback, updateOffensiveClock, tryOffensiveAttack } from "./ai.js";
import { queueCounterAttack, beginCounterAttack, updateCounterAttack } from "./counterAttack.js";
import { isDefenseActive, updateDefense, updateDefenseFeedback, finishDefense } from "./defense.js";
import { checkMatchEnd, isMatchOver, resolvePlayerImpact, updateHitReactions } from "./match.js";
import { startPlayerCooldown, updatePlayerCooldown, updateReadyMessage } from "./cooldown.js";
import { PUNCH_TYPES, DEFAULT_PUNCH } from "./punchTypes.js";
import { isPunchReady, consumePunchCooldown } from "./punches.js";
import { updateAutoDodge } from "./autoDodge.js";
import { registerAttackRisk } from "./risk.js";
import { requestCounterRush, updateCounterRushWindow, loseCounterRush, isCounterRushIntro, updateCounterRushIntro, updateCounterChain, completeChainRush } from "./counterRush.js";
import { updateCounterRushEffects, syncCounterRushEffects } from "./counterRushEffects.js";
import { isStunned, updateStun } from "./stun.js";

export const PUNCH_TIMING = PUNCH_TYPES[DEFAULT_PUNCH].timing;
const EPSILON = 1e-9;
export const QTE_FAILURE_DURATION = 0.9;

// Valida a tentativa antes de consumir turno ou abrir pergunta.
export function requestPunch(arm) {
    if (isReadingQuestion()) return false;
    if (gameState.phase === "match_intro" || gameState.phase === "lobby" || checkMatchEnd() || isStunned()) return false;
    if (gameState.playerCombat.state === "counter_rush_window") return requestCounterRush(arm);
    const punchType = gameState.punches.selected;
    if (checkMatchEnd() || gameState.phase === "paused" || gameState.playerCooldown.remaining > 0
        || (arm !== "left" && arm !== "right") || gameState.opponentCombat.state !== "idle"
        || gameState.playerCombat.state !== "idle" || gameState.counterChain.active
        || gameState.qte.question || !isPunchReady(punchType)) return false;
    const common = punchType !== "uppercut";
    const needsQuestion = !common || (gameState.commonAttackCount + 1) % 2 === 0;
    if (needsQuestion && !beginAttackQTE(arm, punchType)) return false;
    if (common) gameState.commonAttackCount += 1;
    gameState.playerCombat.state = "attack_qte";
    consumePunchCooldown(punchType);
    clearAttackFeedback();
    if (!needsQuestion) {
        gameState.attackSequence += 1;
        return launchPunch({ questionId: `direct-${gameState.matchId}-${gameState.attackSequence}`, kind: "attack", arm, punchType, outcome: "correct", noQTE: true });
    }
    return true;
}

export function startPunch(arm) {
    if (isReadingQuestion()) return false;
    const combat = gameState.playerCombat;
    const result = gameState.qte.lastResult;
    const rush = result?.kind === "counter_rush";
    if (isMatchOver() || combat.state !== (rush ? "counter_rush_qte" : "attack_qte") || gameState.qte.question
        || !result || result.outcome !== "correct" || result.arm !== arm) return false;
    return launchPunch(result);
}

function launchPunch(result) {
    const combat = gameState.playerCombat;
    const { arm } = result;
    const rush = result.kind === "counter_rush";
    combat.arm = arm;
    combat.punchType = result.punchType;
    combat.elapsed = 0;
    combat.extension = 0;
    combat.preparation = 0;
    combat.state = rush ? "counter_rush_resolution" : arm === "left" ? "punching_left" : "punching_right";
    if (rush) gameState.counterChain.state = "counter_rush_resolution";
    const timing = PUNCH_TYPES[combat.punchType].timing;
    decideOpponentResponse(result, timing.preparation + timing.advance);
    return true;
}

function applyQTEResult(result) {
    if (!result) return false;
    if (isReadingQuestion()) return true;
    if (result.outcome === "correct") return startPunch(result.arm);
    if (result.kind === "counter_rush") {
        registerFailedAttack(result);
        loseCounterRush(0, "qte_failed");
        return true;
    }
    registerFailedAttack(result);
    registerAttackRisk(result);
    queueCounterAttack(result);
    const combat = gameState.playerCombat;
    combat.state = "qte_failed";
    combat.arm = null;
    combat.elapsed = 0;
    combat.extension = 0;
    combat.preparation = 0;
    return true;
}

export function submitAttackAnswer(answer, questionId) {
    if (isMatchOver() || (gameState.playerCombat.state !== "attack_qte" && gameState.playerCombat.state !== "counter_rush_qte")) return false;
    return applyQTEResult(answerQTE(answer, questionId));
}

export function updateCombat(deltaTime) {
    if (gameState.phase === "paused" || gameState.phase === "lobby" || gameState.phase === "match_intro") return;
    if(isReadingQuestion()){
        const result=updateQuestionReading(deltaTime);
        if(result)(result.kind==='defense'?finishDefense:applyQTEResult)(result);
        return;
    }
    updateHitReactions(deltaTime);
    if (checkMatchEnd()) return;
    if (isStunned()) { updateStun(deltaTime); return; }
    if (!isCounterRushIntro()) updateCounterRushEffects(deltaTime);
    updateAutoDodge(deltaTime);
    gameState.counterRush.feedbackRemaining = Math.max(0, gameState.counterRush.feedbackRemaining - deltaTime);
    updateReadyMessage(deltaTime);
    updateOffensiveClock(deltaTime);
    advanceCombat(deltaTime);
    if(isReadingQuestion())return;
    if (!checkMatchEnd()) tryOffensiveAttack();
    syncCounterRushEffects();
}

function advanceCombat(deltaTime) {
    updateAI(deltaTime);
    updateDefenseFeedback(deltaTime);
    const combat = gameState.playerCombat;
    if (isCounterRushIntro()) { updateCounterRushIntro(deltaTime); return; }
    if (updateCounterChain(deltaTime)) return;
    if (combat.state === "counter_rush_window") { updateCounterRushWindow(deltaTime); return; }
    if (combat.state === "action_cooldown") {
        updatePlayerCooldown(deltaTime);
        return;
    }
    if (isDefenseActive()) {
        const consumed = updateDefense(deltaTime);
        updateCounterAttack(consumed, true);
        if (!isDefenseActive()) updateCounterAttack(Math.max(0, deltaTime - consumed));
        return;
    }
    if (combat.state === "counter_wait") {
        updateCounterAttack(deltaTime);
        return;
    }
    if (combat.state === "attack_qte" || combat.state === "counter_rush_qte") {
        applyQTEResult(updateQTE(deltaTime));
        return;
    }
    if (combat.state === "qte_failed") {
        combat.elapsed += deltaTime;
        if (combat.elapsed + EPSILON >= QTE_FAILURE_DURATION) {
            const overflow = Math.max(0, combat.elapsed - QTE_FAILURE_DURATION);
            combat.elapsed = 0;
            beginCounterAttack(gameState.gameTime - overflow);
            const consumed = updateDefense(overflow);
            updateCounterAttack(consumed, true);
            if (!isDefenseActive()) updateCounterAttack(Math.max(0, overflow - consumed));
        }
        return;
    }
    if (combat.state === "idle") return;
    const timing = PUNCH_TYPES[combat.punchType || DEFAULT_PUNCH].timing;
    const advanceEnd = timing.preparation + timing.advance;
    const retractEnd = advanceEnd + timing.retract;
    const total = retractEnd + timing.recovery;
    combat.elapsed += deltaTime;
    if (combat.elapsed + EPSILON >= advanceEnd) {
        resolvePlayerImpact(Math.max(0, combat.elapsed - advanceEnd));
        if (isMatchOver()) return;
    }
    // Tempo acumulado atravessa várias fases num quadro lento sem perder tempo.
    if (combat.elapsed + EPSILON >= total) {
        if (combat.state === "counter_rush_resolution" && completeChainRush()) return;
        const overflow = Math.max(0, combat.elapsed - total);
        startPlayerCooldown();
        updatePlayerCooldown(overflow);
    } else if (combat.elapsed + EPSILON >= retractEnd) {
        if (combat.state !== "counter_rush_resolution") combat.state = "recovering";
        combat.extension = 0;
        combat.preparation = 0;
    } else if (combat.elapsed < timing.preparation) {
        const t = combat.elapsed / timing.preparation;
        combat.preparation = t * t * (3 - 2 * t);
        combat.extension = 0;
    } else if (combat.elapsed < advanceEnd) {
        const t = (combat.elapsed - timing.preparation) / timing.advance;
        combat.preparation = 1 - t;
        combat.extension = 1 - (1 - t) * (1 - t);
    } else {
        const t = (combat.elapsed - advanceEnd) / timing.retract;
        combat.preparation = 0;
        combat.extension = 1 - t * t * (3 - 2 * t);
    }
}
