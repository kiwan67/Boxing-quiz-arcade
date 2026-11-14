import { gameState } from "./gameState.js";
import { isMatchOver } from "./match.js";
import { beginCounterRushQTE } from "./qte.js";
import { isPunchReady, consumePunchCooldown } from "./punches.js";
import { startPlayerCooldown, updatePlayerCooldown } from "./cooldown.js";
import { startCounterRushEffects, resetCounterRushEffects, updateCounterRushEffects } from "./counterRushEffects.js";
import { beginChainEnemyResponse } from "./counterAttack.js";
import { chainDifficulty, chainStunAdditional } from "./chainRules.js";
import { startStunRecovery } from "./stun.js";

export const COUNTER_RUSH_WINDOW_TIME = 2.5;
export const COUNTER_RUSH_CUTSCENE_TIME = 3;
export const COUNTER_RUSH_QTE_TIME = 5;
export const COUNTER_RUSH_DAMAGE_MULTIPLIER = 1.5;

export function isCounterRushActive() {
    return gameState.counterChain.active || gameState.playerCombat.state.startsWith("counter_rush_");
}

export function beginCounterRushCutscene() {
    const result = gameState.defense.lastResult;
    const rush = gameState.counterRush;
    if (isMatchOver() || gameState.phase === "match_intro" || gameState.stun.remaining > 0 || gameState.phase === "paused" || gameState.qte.question
        || gameState.opponentCombat.state !== "idle" || !result?.impactRegistered
        || result.counterId !== gameState.counterAttack.questionId || result.naturalMiss
        || !result.defenseSideCorrect || !result.questionCorrect || rush.defenseId === result.counterId) return false;
    rush.defenseId = result.counterId;
    const chain = gameState.counterChain;
    if (chain.active) {
        if (chain.state !== "counter_chain_enemy_response" || chain.count >= 4) return false;
        chain.count += 1;
        chain.difficulty = chainDifficulty(chain.count);
        chain.state = "counter_chain_transition";
        chain.remaining = 0.5;
        chain.responsePending = false;
        gameState.playerCombat.state = "counter_chain_transition";
        result.counterRushActivated = true;
        return true;
    }
    Object.assign(chain, { active: true, count: 1, state: "counter_rush_cutscene", remaining: 0, responsePending: false, lastResult: null, endReason: null, difficulty: chainDifficulty(1) });
    rush.remaining = 0;
    rush.cutsceneRemaining = COUNTER_RUSH_CUTSCENE_TIME;
    rush.feedbackRemaining = 0;
    gameState.playerCooldown.remaining = 0;
    gameState.playerCooldown.readyMessageRemaining = 0;
    gameState.offensiveAI.remaining = null;
    Object.assign(gameState.attackFeedback, { remaining: 0, delay: 0, rush: false });
    resetCounterRushEffects();
    gameState.playerCombat.state = "counter_rush_cutscene";
    result.counterRushActivated = true;
    return true;
}

export function beginCounterRushWindow() {
    if (isMatchOver() || gameState.phase === "paused" || gameState.playerCombat.state !== "counter_rush_flash"
        || gameState.counterRush.flashRemaining > 0 || gameState.qte.question) return false;
    gameState.counterRush.remaining = COUNTER_RUSH_WINDOW_TIME;
    gameState.counterChain.state = "counter_rush_window";
    gameState.playerCombat.state = "counter_rush_window";
    return true;
}

export function isCounterRushIntro() {
    const state = gameState.playerCombat.state;
    return state === "counter_rush_cutscene" || state === "counter_rush_flash";
}

// Consome cada intervalo uma única vez, inclusive em quadros que atravessam fases.
export function updateCounterRushIntro(deltaTime) {
    if (isMatchOver() || gameState.phase === "paused" || !isCounterRushIntro()) return;
    const rush = gameState.counterRush;
    let step = deltaTime;
    if (gameState.playerCombat.state === "counter_rush_cutscene") {
        const consumed = Math.min(step, rush.cutsceneRemaining);
        rush.cutsceneRemaining = Math.max(0, rush.cutsceneRemaining - consumed);
        step -= consumed;
        if (rush.cutsceneRemaining > 1e-9) return;
        rush.cutsceneRemaining = 0;
        gameState.playerCombat.state = "counter_rush_flash";
        startCounterRushEffects();
    }
    const consumed = Math.min(step, rush.flashRemaining);
    updateCounterRushEffects(consumed);
    step -= consumed;
    if (rush.flashRemaining > 1e-9) return;
    if (beginCounterRushWindow() && step > 0) updateCounterRushWindow(step);
}

export function requestCounterRush(arm) {
    const type = gameState.punches.selected;
    if (isMatchOver() || gameState.phase === "paused" || gameState.playerCombat.state !== "counter_rush_window"
        || gameState.counterRush.remaining <= 0 || (arm !== "left" && arm !== "right")
        || gameState.opponentCombat.state !== "idle" || !isPunchReady(type)
        || !beginCounterRushQTE(arm, type, COUNTER_RUSH_QTE_TIME)) return false;
    gameState.counterRush.remaining = 0;
    gameState.playerCombat.state = "counter_rush_qte";
    gameState.counterChain.state = "counter_rush_qte";
    consumePunchCooldown(type);
    return true;
}

export function loseCounterRush(overflow = 0, reason = "opportunity_lost") {
    if (reason === "qte_failed") gameState.counterChain.lastResult = "failed_qte";
    resetCounterRushEffects();
    gameState.counterRush.remaining = 0;
    gameState.counterRush.feedbackRemaining = Math.max(0, 0.8 - overflow);
    finishCounterChain(reason);
    updatePlayerCooldown(overflow);
}

export function finishCounterChain(reason, stun = false) {
    const chain = gameState.counterChain;
    if (!chain.active || isMatchOver()) return false;
    Object.assign(chain, { active: false, state: "counter_chain_finish", responsePending: false, remaining: 0, endReason: reason });
    resetCounterRushEffects();
    gameState.offensiveAI.remaining = null;
    if (stun && gameState.lastAttackResult?.outcome === "hit" && gameState.lastAttackResult.impactResolved) {
        startStunRecovery("enemy", chain.count === 1 ? "COUNTER_RUSH" : "COUNTER_CHAIN", chainStunAdditional(chain.count), `rush-${gameState.lastAttackResult.questionId}`);
    } else startPlayerCooldown();
    return true;
}

export function completeChainRush() {
    const chain = gameState.counterChain;
    if (!chain.active || gameState.playerCombat.state !== "counter_rush_resolution") return false;
    chain.lastResult = gameState.lastAttackResult.outcome;
    if (chain.lastResult !== "hit") return finishCounterChain("blocked");
    if (chain.count >= 4) return finishCounterChain("limit", true);
    Object.assign(chain, { state: "counter_chain_recovery", remaining: 0.22, responsePending: true });
    Object.assign(gameState.playerCombat, { state: "counter_chain_recovery", elapsed: 0, extension: 0, preparation: 0 });
    return true;
}

export function updateCounterChain(deltaTime) {
    const chain = gameState.counterChain;
    if (!chain.active || !["counter_chain_transition", "counter_chain_recovery"].includes(gameState.playerCombat.state)) return false;
    chain.remaining = Math.max(0, chain.remaining - deltaTime);
    if (chain.remaining > 1e-9) return true;
    if (chain.state === "counter_chain_transition") {
        chain.state = "counter_rush_window";
        gameState.counterRush.remaining = COUNTER_RUSH_WINDOW_TIME;
        gameState.playerCombat.state = "counter_rush_window";
    } else if (beginChainEnemyResponse()) {
        chain.state = "counter_chain_enemy_response";
        chain.responsePending = false;
    }
    return true;
}

export function updateCounterRushWindow(deltaTime) {
    const rush = gameState.counterRush;
    const overflow = Math.max(0, deltaTime - rush.remaining);
    rush.remaining = Math.max(0, rush.remaining - deltaTime);
    if (rush.remaining <= 1e-9) loseCounterRush(overflow);
}
