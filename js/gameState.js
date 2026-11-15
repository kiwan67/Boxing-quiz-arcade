import { createPunchState } from "./punchTypes.js";
import { createProfessorState } from './professorEasterEgg.js';

export function createInitialGameState(matchId = 0) {
    return {
        matchId,
        professorEasterEgg: createProfessorState(),
        playerHealth: 100,
        enemyHealth: 100,
        enemyMaxHealth: 100,
        botBalance: { healthMultiplier: 1, damageDealtMultiplier: 1, damageTakenMultiplier: 1 },
        round: 1,
        gameTime: 0,
        phase: "idle",
        phaseBeforePause: null,
        matchResult: null,
        matchIntro: null,
        pendingRiskBonus: 0,
        commonAttackCount: 0,
        attackSequence: 0,
        questionBank: { remaining: [], usedIds: [], history: [], answers: [], cycle: 0, lastId: null, nextId: null },
        stun: { target: null, source: null, additional: 0, total: 0, remaining: 0, elapsed: 0, impactId: null },
        counterChain: { active: false, count: 0, state: "idle", remaining: 0, responsePending: false, lastResult: null, endReason: null, difficulty: null },
        counterRush: { defenseId: null, remaining: 0, cutsceneRemaining: 0, feedbackRemaining: 0, flashRemaining: 0, flashDuration: 0 },
        reactions: { player: { remaining: 0 }, enemy: { remaining: 0 } },
        autoDodge: { direction: null, elapsed: 0, amount: 0 },
        difficulty: "normal",
        punches: createPunchState(),
        playerCooldown: { remaining: 0, readyMessageRemaining: 0 },
        offensiveAI: { remaining: null, sequence: 0, playerHistory: [], botHistory: [] },
        counterAttack: {
            type: null,
            accuracy: null,
            riskBonus: 0,
            baseDamage: null,
            naturalMiss: null,
            source: null,
            pending: false,
            side: null,
            questionId: null,
            startedAt: null,
            finishedAt: null,
            pausedDuration: 0,
            impactResolved: false,
            lastImpact: null
        },
        opponentCombat: {
            blockArm: null,
            blockAmount: 0,
            blockImpactTime: 0,
            state: "idle",
            direction: null,
            elapsed: 0,
            offset: 0,
            extension: 0,
            preparation: 0
        },
        lastAttackResult: null,
        defense: {
            counterId: null,
            expectedSide: null,
            selectedSide: null,
            sideCorrect: false,
            directionTimedOut: false,
            remaining: 0,
            result: null,
            lastResult: null,
            feedbackRemaining: 0
        },
        attackFeedback: { outcome: null, delay: 0, remaining: 0, rush: false },
        qte: {
            pendingResult: null,
            feedbackRemaining: 0,
            sequence: 0,
            question: null,
            pendingPunch: null,
            pendingPunchType: null,
            remaining: 0,
            lastResult: null
        },
        playerCombat: {
            punchType: null,
            state: "idle",
            arm: null,
            elapsed: 0,
            extension: 0,
            preparation: 0
        }
    };
}

export const gameState = createInitialGameState();
gameState.phase = "lobby";

export function resetGameState() {
    const difficulty = gameState.difficulty;
    Object.assign(gameState, createInitialGameState(gameState.matchId + 1), { difficulty });
}
