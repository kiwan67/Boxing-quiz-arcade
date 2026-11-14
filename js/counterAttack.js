import { gameState } from "./gameState.js";
import { beginDefense, isDefenseActive, registerDefenseImpact, defenseConfig } from "./defense.js";
import { isMatchOver } from "./match.js";
import { startPlayerCooldown, updatePlayerCooldown } from "./cooldown.js";
import { ENEMY_ACCURACY, rollEnemyMiss } from "./enemyAccuracy.js";
import { activeDifficulty, chooseBotAttack } from "./difficulty.js";
import { consumeRiskBonus } from "./risk.js";
import { beginCounterRushCutscene, updateCounterRushIntro, finishCounterChain } from "./counterRush.js";
import { claimPerfectDefense, consumeChainContinuation } from "./debug.js";
import { startStunRecovery, updateStun } from "./stun.js";

export const COUNTER_TIMING = Object.freeze({ preparation: 0.12, advance: 0.12, retract: 0.16, recovery: 0.15 });
const IMPACT_TIME = COUNTER_TIMING.preparation + COUNTER_TIMING.advance;
const RETRACT_END = IMPACT_TIME + COUNTER_TIMING.retract;
const TOTAL = RETRACT_END + COUNTER_TIMING.recovery;
const impactListeners = new Set();

export function isCounterActive() {
    return gameState.opponentCombat.state.startsWith("counter_");
}

export function onCounterImpact(listener) {
    impactListeners.add(listener);
    return () => impactListeners.delete(listener);
}

export function queueCounterAttack(result) {
    if (result.kind === "counter_rush") return false;
    if (result.outcome !== "incorrect" && result.outcome !== "timeout") return false;
    return queueOpponentAttack(result.questionId, "qte_failure");
}

function queueOpponentAttack(id, source) {
    const counter = gameState.counterAttack;
    if (isMatchOver() || gameState.phase === "lobby" || gameState.phase === "match_intro"
        || gameState.opponentCombat.state !== "idle" || counter.pending
        || counter.questionId === id) return false;
    counter.questionId = id;
    counter.source = source;
    // Lado anatômico do adversário de frente: left aparece à direita da tela.
    counter.side = Math.random() < 0.5 ? "left" : "right";
    counter.accuracy = source === "counter_chain" ? ENEMY_ACCURACY : activeDifficulty().accuracy;
    counter.naturalMiss = rollEnemyMiss(counter.accuracy);
    counter.type = source === "spontaneous" ? chooseBotAttack() : "straight";
    counter.riskBonus = 0;
    counter.baseDamage = null;
    counter.pending = true;
    counter.startedAt = null;
    counter.finishedAt = null;
    counter.impactResolved = false;
    return true;
}

export function beginChainEnemyResponse() {
    const chain = gameState.counterChain;
    if (!chain.active || !chain.responsePending || chain.count >= 4
        || gameState.playerCombat.state !== "counter_chain_recovery") return false;
    if (!queueOpponentAttack(`chain-${gameState.matchId}-${gameState.counterRush.defenseId}-${chain.count}`, "counter_chain")) return false;
    if (consumeChainContinuation()) gameState.counterAttack.naturalMiss = false;
    return beginCounterAttack();
}

export function beginSpontaneousAttack() {
    const playerState = gameState.playerCombat.state;
    if (isMatchOver() || gameState.phase === "paused" || (playerState !== "idle" && playerState !== "action_cooldown")
        || gameState.counterChain.active || gameState.stun.remaining > 0 || gameState.qte.question || gameState.reactions.enemy.remaining > 0
        || gameState.reactions.player.remaining > 0 || gameState.counterAttack.pending
        || gameState.opponentCombat.state !== "idle") return false;
    const sequence = gameState.offensiveAI.sequence + 1;
    if (!queueOpponentAttack(`spontaneous-${gameState.matchId}-${sequence}`, "spontaneous")) return false;
    gameState.offensiveAI.sequence = sequence;
    return beginCounterAttack();
}

export function beginCounterAttack(startedAt = gameState.gameTime) {
    const counter = gameState.counterAttack;
    if (isMatchOver() || gameState.stun.remaining > 0 || !counter.pending || gameState.opponentCombat.state !== "idle") return false;
    counter.riskBonus = consumeRiskBonus();
    counter.baseDamage = defenseConfig.baseDamage * (1 + counter.riskBonus);
    counter.startedAt = startedAt;
    claimPerfectDefense(counter.questionId);
    counter.pausedDuration = 0;
    const opponent = gameState.opponentCombat;
    opponent.state = "counter_preparing";
    opponent.elapsed = 0;
    opponent.extension = 0;
    opponent.preparation = 0;
    beginDefense();
    return true;
}

function smooth(t) { return t * t * (3 - 2 * t); }

export function updateCounterAttack(deltaTime, pauseForDefense = false) {
    if (isMatchOver() || !isCounterActive()) return;
    const opponent = gameState.opponentCombat;
    const counter = gameState.counterAttack;
    if (pauseForDefense || isDefenseActive()) {
        // A preparação pode avançar, mas nunca libera o golpe antes da defesa.
        const preparationStep = Math.min(deltaTime, Math.max(0, COUNTER_TIMING.preparation - opponent.elapsed));
        opponent.elapsed += preparationStep;
        counter.pausedDuration += deltaTime - preparationStep;
        opponent.state = "counter_preparing";
        opponent.preparation = smooth(opponent.elapsed / COUNTER_TIMING.preparation);
        opponent.extension = 0;
        return;
    }
    opponent.elapsed += deltaTime;
    const elapsed = opponent.elapsed;
    const impactDue = !counter.impactResolved && elapsed + 1e-9 >= IMPACT_TIME;
    if (elapsed + 1e-9 >= TOTAL) {
        counter.finishedAt = counter.startedAt + counter.pausedDuration + TOTAL;
        opponent.state = "idle";
        opponent.elapsed = 0;
        opponent.extension = 0;
        opponent.preparation = 0;
        gameState.playerCombat.state = "idle";
        gameState.playerCombat.elapsed = 0;
    } else if (elapsed + 1e-9 >= RETRACT_END) {
        opponent.state = "counter_recovering";
        opponent.extension = 0;
        opponent.preparation = 0;
    } else if (elapsed < COUNTER_TIMING.preparation) {
        opponent.state = "counter_preparing";
        opponent.preparation = smooth(elapsed / COUNTER_TIMING.preparation);
        opponent.extension = 0;
    } else if (elapsed < IMPACT_TIME) {
        opponent.state = "counter_attacking";
        const t = (elapsed - COUNTER_TIMING.preparation) / COUNTER_TIMING.advance;
        opponent.extension = 1 - (1 - t) ** 2;
        opponent.preparation = 1 - t;
    } else {
        // Retorno faz parte da animação do ataque; só depois vem a recuperação.
        opponent.state = "counter_attacking";
        opponent.extension = 1 - smooth((elapsed - IMPACT_TIME) / COUNTER_TIMING.retract);
        opponent.preparation = 0;
    }
    if (impactDue) {
        counter.impactResolved = true;
        counter.lastImpact = {
            id: `counter-${counter.questionId}`,
            questionId: counter.questionId,
            side: counter.side,
            naturalMiss: counter.naturalMiss,
            riskBonus: counter.riskBonus,
            baseDamage: counter.baseDamage,
            at: counter.startedAt + counter.pausedDuration + IMPACT_TIME,
            elapsedSinceImpact: Math.max(0, elapsed - IMPACT_TIME)
        };
        // A pose lógica precede o evento; a defesa aplica o dano uma única vez.
        registerDefenseImpact(counter.lastImpact);
        for (const listener of impactListeners) listener(counter.lastImpact);
    }
    if (elapsed + 1e-9 >= TOTAL && !isMatchOver()) {
        const overflow = Math.max(0, elapsed - TOTAL);
        if (beginCounterRushCutscene()) updateCounterRushIntro(overflow);
        else {
            if (gameState.counterChain.active) finishCounterChain(gameState.defense.lastResult?.naturalMiss ? "natural_miss" : "imperfect_defense");
            else startPlayerCooldown();
            const result = gameState.defense.lastResult;
            if (result?.counterId === counter.questionId && result.stunAdditional && !result.stunApplied) {
                result.stunApplied = startStunRecovery("player", "FAILED_DEFENSE", result.stunAdditional, result.impactId);
            }
            if (gameState.stun.remaining > 0) {
                // A animação acabou neste quadro; apenas a sobra pertence à recuperação.
                updateStun(overflow);
            } else updatePlayerCooldown(overflow);
        }
    }
}
