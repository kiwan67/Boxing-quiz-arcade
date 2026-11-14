import { gameState } from "./gameState.js";
import { createQuestion } from "./questions.js";
import { isMatchOver } from "./match.js";
import { PUNCH_TYPES } from "./punchTypes.js";
import { chainDifficulty } from "./chainRules.js";
export const QTE_READING_SECONDS = Object.freeze({ correct: 2, incorrect: 4, timeout: 4 });

export function isReadingQuestion(){return gameState.qte.pendingResult !== null;}
export function updateQuestionReading(deltaTime){
    const qte=gameState.qte;
    if(!qte.pendingResult||gameState.phase==='paused'||!Number.isFinite(deltaTime)||deltaTime<0)return null;
    qte.feedbackRemaining=Math.max(0,qte.feedbackRemaining-deltaTime);
    if(qte.feedbackRemaining>1e-9)return null;
    const result=qte.pendingResult;qte.pendingResult=null;qte.feedbackRemaining=0;
    return result;
}

// Sem estado paralelo: playerCombat.state é a autoridade da tentativa.
export function beginAttackQTE(arm, punchType = gameState.punches.selected, kind = "attack", requiredState = "idle", timeLimit = 10) {
    const qte = gameState.qte;
    if (isMatchOver() || gameState.phase === "lobby" || gameState.phase === "match_intro" || gameState.stun.remaining > 0 || gameState.playerCombat.state !== requiredState || qte.question
        || isReadingQuestion() || !Object.hasOwn(PUNCH_TYPES, punchType)) return false;
    qte.sequence += 1;
    qte.question = createQuestion(qte.sequence, kind, gameState.matchId);
    qte.feedbackRemaining = 0;
    qte.question.timeLimit = timeLimit;
    qte.pendingPunch = arm;
    qte.pendingPunchType = punchType;
    qte.question.punchType = punchType;
    qte.question.difficulty = kind === "counter_rush" ? chainDifficulty(gameState.counterChain.count) : PUNCH_TYPES[punchType].difficulty;
    if (kind === "counter_rush") qte.question.chainDifficulty = chainDifficulty(gameState.counterChain.count);
    qte.remaining = qte.question.timeLimit;
    return true;
}

export function beginCounterRushQTE(arm, type, timeLimit) {
    return beginAttackQTE(arm, type, "counter_rush", "counter_rush_window", timeLimit);
}

export function beginDefenseQuestion() {
    const qte = gameState.qte;
    if (isMatchOver() || isReadingQuestion() || gameState.stun.remaining > 0 || gameState.playerCombat.state !== "defense_direction_qte" || qte.question) return false;
    qte.sequence += 1;
    qte.question = createQuestion(qte.sequence, "defense", gameState.matchId);
    qte.feedbackRemaining = 0;
    qte.pendingPunch = null;
    qte.pendingPunchType = null;
    qte.remaining = qte.question.timeLimit;
    gameState.playerCombat.state = "defense_question_qte";
    return true;
}

function isQuestionActive() {
    if (isMatchOver() || ['paused','lobby','match_intro'].includes(gameState.phase)) return false;
    const state = gameState.playerCombat.state;
    return (state === "attack_qte" && gameState.qte.question?.kind === "attack")
        || (state === "counter_rush_qte" && gameState.qte.question?.kind === "counter_rush")
        || (state === "defense_question_qte" && gameState.qte.question?.kind === "defense");
}

function finishQTE(outcome, answer) {
    const qte = gameState.qte;
    const result = {
        questionId: qte.question.id,
        bankId: qte.question.bankId,
        category: qte.question.category,
        statement: qte.question.statement,
        options: [...qte.question.options],
        explanation: qte.question.explanation,
        correctIndex: qte.question.correctIndex,
        kind: qte.question.kind,
        arm: qte.pendingPunch,
        punchType: qte.pendingPunchType,
        outcome,
        answer,
        correctAnswer: qte.question.correctAnswer,
        remainingTime: qte.remaining
    };
    qte.lastResult = result;
    qte.feedbackRemaining = QTE_READING_SECONDS[outcome];
    qte.pendingResult = result;
    gameState.questionBank.answers.push(result);
    qte.question = null;
    qte.pendingPunch = null;
    qte.pendingPunchType = null;
    qte.remaining = 0;
    return result;
}

export function answerQTE(answer, questionId) {
    const qte = gameState.qte;
    if (!isQuestionActive() || !qte.question
        || qte.question.id !== questionId || !qte.question.alternatives.includes(answer)) return null;
    if (qte.remaining <= 1e-9) return finishQTE("timeout", null);
    return finishQTE(answer === qte.question.correctAnswer ? "correct" : "incorrect", answer);
}

export function updateQTE(deltaTime) {
    const qte = gameState.qte;
    if (!isQuestionActive() || !qte.question || !Number.isFinite(deltaTime) || deltaTime < 0) return null;
    qte.remaining = Math.max(0, qte.remaining - deltaTime);
    return qte.remaining <= 1e-9 ? finishQTE("timeout", null) : null;
}
