import { startKnockout, resetKnockout, KNOCKOUT_CINEMATIC } from './knockout.js';
import { gameState, resetGameState } from "./gameState.js";
import { PUNCH_TYPES, DEFAULT_PUNCH } from "./punchTypes.js";
import { resetCounterRushEffects } from "./counterRushEffects.js";
import { clearDebugForces } from "./debug.js";
import { resetSimulationClock } from "./simulationClock.js";
import { stopCombatAudio } from "./audio.js";

export const MAX_HEALTH = 100;
export const PLAYER_BASE_DAMAGE = PUNCH_TYPES[DEFAULT_PUNCH].damage;
export const ENEMY_BASE_DAMAGE = 20;
export const HIT_REACTION_TIME = 0.22;
const appliedImpacts = new Set();

export function isMatchOver() {
    return gameState.phase === KNOCKOUT_CINEMATIC || gameState.phase === "victory" || gameState.phase === "defeat";
}

function cancelPendingActions() {
    Object.assign(gameState.counterChain, { active: false, state: "counter_chain_finish", responsePending: false, remaining: 0, endReason: "knockout" });
    gameState.stun.remaining = 0;
    stopCombatAudio();
    clearDebugForces();
    resetCounterRushEffects();
    Object.assign(gameState.counterRush, { defenseId: null, remaining: 0, cutsceneRemaining: 0, feedbackRemaining: 0 });
    gameState.pendingRiskBonus = 0;
    gameState.counterAttack.riskBonus = 0;
    gameState.counterAttack.baseDamage = null;
    Object.assign(gameState.autoDodge, { direction: null, elapsed: 0, amount: 0 });
    gameState.counterAttack.naturalMiss = null;
    gameState.qte.question = null;
    gameState.qte.pendingPunch = null;
    gameState.qte.pendingPunchType = null;
    gameState.qte.remaining = 0;
    gameState.counterAttack.pending = false;
    gameState.defense.remaining = 0;
    gameState.defense.feedbackRemaining = 0;
    gameState.attackFeedback.remaining = 0;
    gameState.playerCooldown.remaining = 0;
    gameState.playerCooldown.readyMessageRemaining = 0;
    gameState.offensiveAI.remaining = null;
    Object.assign(gameState.playerCombat, { state: "idle", arm: null, punchType: null, elapsed: 0, extension: 0, preparation: 0 });
    Object.assign(gameState.opponentCombat, { state: "idle", direction: null, elapsed: 0, offset: 0, extension: 0, preparation: 0, blockArm: null, blockAmount: 0, blockImpactTime: 0 });
}

export function checkMatchEnd(cinematic = false, target = null) {
    gameState.playerHealth = Math.max(0, Math.min(MAX_HEALTH, gameState.playerHealth));
    gameState.enemyHealth = Math.max(0, Math.min(MAX_HEALTH, gameState.enemyHealth));
    if (isMatchOver()) return true;
    if (gameState.playerHealth > 0 && gameState.enemyHealth > 0) return false;
    gameState.phase = gameState.playerHealth <= 0 ? "defeat" : "victory";
        const loser = gameState.phase === 'victory' ? 'bot' : 'player';
    const attack = gameState.lastAttackResult;
    const result = Object.freeze({ outcome: gameState.phase, at: gameState.gameTime,
        loser, winner: loser === 'bot' ? 'player' : 'bot', attacker: loser === 'bot' ? 'player' : 'bot',
        punchType: loser === 'bot' ? attack?.punchType || gameState.playerCombat.punchType || 'jab' : gameState.counterAttack.type || 'jab',
        arm: loser === 'bot' ? attack?.arm || gameState.playerCombat.arm || 'left' : gameState.counterAttack.side || 'left',
        impactDirection: (loser === 'bot' ? attack?.arm || gameState.playerCombat.arm : gameState.counterAttack.side) === 'right' ? -1 : 1,
        special: loser === 'bot' ? attack?.kind === 'counter_rush' : gameState.counterAttack.source === 'counter_chain' });
    gameState.matchResult = result;
    if(cinematic) startKnockout(gameState,result);
    cancelPendingActions();
    return true;
}

export function applyImpactDamage(target, amount, impactId, matchId = gameState.matchId, impactAge = 0, hitReaction = true) {
    if (gameState.phase === "match_intro" || matchId !== gameState.matchId || isMatchOver() || !impactId
        || (target !== "player" && target !== "enemy") || !Number.isFinite(amount) || amount < 0) return 0;
    const key = `${gameState.matchId}:${target}:${impactId}`;
    if (appliedImpacts.has(key)) return 0;
    appliedImpacts.add(key);
    const healthKey = target === "player" ? "playerHealth" : "enemyHealth";
    const before = Math.max(0, Math.min(MAX_HEALTH, gameState[healthKey]));
    gameState[healthKey] = Math.max(0, before - amount);
    const applied = before - gameState[healthKey];
    if (applied > 0 && hitReaction) gameState.reactions[target].remaining = Math.max(0, HIT_REACTION_TIME - impactAge);
    checkMatchEnd(applied > 0 && hitReaction, target);
    return applied;
}

export function resolvePlayerImpact(impactAge = 0) {
    const result = gameState.lastAttackResult;
    if (isMatchOver() || !result || result.outcome === "failed_qte" || result.impactResolved) return false;
    result.impactResolved = true;
    if (result.kind === "counter_rush") gameState.counterChain.lastResult = result.outcome;
    const damaging = result.outcome === "hit" || result.outcome === "blocked";
    const damage = (result.baseDamage ?? PUNCH_TYPES[result.punchType || DEFAULT_PUNCH].damage) * (result.damageMultiplier ?? 1);
    result.damageApplied = damaging
        ? applyImpactDamage("enemy", damage,
            `player-${result.questionId}`, gameState.matchId, impactAge, result.outcome !== "blocked") : 0;
    return true;
}

export function updateHitReactions(deltaTime) {
    gameState.reactions.player.remaining = Math.max(0, gameState.reactions.player.remaining - deltaTime);
    gameState.reactions.enemy.remaining = Math.max(0, gameState.reactions.enemy.remaining - deltaTime);
}

export function resetMatch() {
    stopCombatAudio();
    resetSimulationClock();
    clearDebugForces(true);
    appliedImpacts.clear();
    resetKnockout();
    resetGameState();
    resetCounterRushEffects();
}



