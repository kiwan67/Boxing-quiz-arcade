import { gameState } from "./gameState.js";
import { PUNCH_TYPES, PUNCH_ORDER } from "./punchTypes.js";
import { enemyAccuracyDebug } from "./enemyAccuracy.js";
import { getGameSpeed, setGameSpeed } from "./simulationClock.js";
import { chainMultiplier } from "./chainRules.js";
import { activeDifficulty, usesCautiousGuard } from "./difficulty.js";
import {createProfessorAnimation,canAdvanceProfessorAnimation,advanceProfessorAnimation,professorPresentationFrame} from './professorAnimation.js';
import {clearProfessorPresentation,cueProfessorSpeech,startProfessorDeparture,professorIsDeparting,updateProfessorPresentation,professorVisualFrame} from './professorPresentation.js';

// Estado de ferramentas de teste, separado do estado/regras normais da luta.
export const debugState = {
    enabled: false, expanded: true, showAttackSide: false, showAnswers: false, chainNext: false,
    professorForced: false, professorPreviewMatchId: null,
    professorMode: null, professorAnimation: null,
    perfectNext: false, perfectAttackId: null, rushOutcome: "normal", lastOverride: "NENHUMA SUBSTITUIÇÃO"
};
const live = () => gameState.phase !== "victory" && gameState.phase !== "defeat";

export function clearDebugForces(clearLog = false) {
    clearProfessorPresentation(debugState.professorAnimation);
    debugState.professorForced = false;
    debugState.professorPreviewMatchId = null;
    debugState.professorMode=null;debugState.professorAnimation=null;
    gameState.questionBank.nextId = null;
    debugState.chainNext = false;
    debugState.perfectNext = false;
    debugState.perfectAttackId = null;
    debugState.rushOutcome = "normal";
    enemyAccuracyDebug.forceOutcome = null;
    if (clearLog) debugState.lastOverride = "NENHUMA SUBSTITUIÇÃO";
}

export function setDebugEnabled(enabled) {
    debugState.enabled = Boolean(enabled);
    if (debugState.enabled) logProfessorDebug();
    if (!debugState.enabled) {
        setGameSpeed(1);
        clearDebugForces(true);
        debugState.showAttackSide = false;
        debugState.showAnswers = false;
    }
}

export function logProfessorDebug(message = 'ESTADO DO EASTER EGG') {
    if (!debugState.enabled) return;
    const egg = gameState.professorEasterEgg;
    // Copy primitive values so the console preserves the state at this instant.
    console.log(`[EASTER EGG] ${message}`, {
        consecutiveCorrectAnswers: egg.consecutiveCorrectAnswers,
        professorUnlocked: egg.professorUnlocked,
        professorPresent: egg.professorPresent,
        professorInRing: egg.professorInRing,
        professorEventUsed: egg.appearanceEventUsed
    });
}

export function logProfessorAnswerDebug(outcome) {
    if (!debugState.enabled) return;
    const egg = gameState.professorEasterEgg;
    let message = 'ESTADO DO EASTER EGG';
    if (outcome === 'incorrect' || outcome === 'timeout') message = 'SEQUÊNCIA INTERROMPIDA';
    else {
        // Observe notifications without consuming or changing the easter egg.
        const event = egg.pendingEvents.find(event => event.questionSequence === gameState.qte.sequence
            && (event.type === 'professor_appearance' || event.type === 'professor_enter_ring'));
        if (event) message = event.type === 'professor_appearance'
            ? 'PROFESSOR DESBLOQUEADO' : 'PROFESSOR ENTROU NO RINGUE';
    }
    logProfessorDebug(message);
}

export function setDebugGameSpeed(value) {
    return debugState.enabled && setGameSpeed(value);
}

export function armPerfectDefense() {
    if (!debugState.enabled || !live() || debugState.perfectNext || debugState.perfectAttackId) return false;
    debugState.perfectNext = true;
    return true;
}

export function claimPerfectDefense(attackId) {
    if (!debugState.enabled || !debugState.perfectNext || !live() || !attackId) return;
    debugState.perfectNext = false;
    debugState.perfectAttackId = attackId;
}

export function consumePerfectDefense(attackId, naturalMiss) {
    if (!debugState.enabled || !live() || !debugState.perfectAttackId || debugState.perfectAttackId !== attackId) return false;
    debugState.perfectAttackId = null;
    debugState.lastOverride = `TESTE: DEFESA PERFEITA SUBSTITUÍDA. ERRO NATURAL IGNORADO: ${naturalMiss ? "SIM" : "NÃO"}`;
    return true;
}

export function setRushDebugOutcome(outcome) {
    if (!debugState.enabled || !live() || !["normal", "hit", "blocked"].includes(outcome)) return false;
    debugState.rushOutcome = outcome;
    return true;
}

export function consumeRushDebugOutcome() {
    if (!debugState.enabled || !live() || debugState.rushOutcome === "normal") return null;
    const outcome = debugState.rushOutcome;
    debugState.rushOutcome = "normal";
    debugState.lastOverride = `TESTE: COUNTER RUSH COM ${outcome === "hit" ? "ACERTO COMPLETO" : "BLOQUEIO"} FORÇADO`;
    return outcome;
}

const number = value => Number.isFinite(value) ? String(Number(value.toFixed(3))) : "—";
// Visual override only; the real match and its streak remain untouched.
export function setProfessorDebugForced(enabled) {
    return setProfessorDebugMode(enabled?'outside':null);
}
export function setProfessorDebugMode(mode) {
    if(![null,'outside','entry','inside'].includes(mode))return false;
    if(mode && (!debugState.enabled || !['idle','paused'].includes(gameState.phase) || gameState.matchResult))return false;
    clearProfessorPresentation(debugState.professorAnimation);
    debugState.professorForced=Boolean(mode);
    debugState.professorMode=mode;
    debugState.professorAnimation=mode?createProfessorAnimation(mode):null;
    debugState.professorPreviewMatchId=mode?gameState.matchId:null;
    return true;
}
export function updateProfessorDebugAnimation(state,delta){
    if(!isProfessorDebugForced(state))return;
    if(!professorIsDeparting(debugState.professorAnimation)&&canAdvanceProfessorAnimation(state,delta))advanceProfessorAnimation(debugState.professorAnimation,delta);
    updateProfessorPresentation(state,delta,debugState.professorAnimation);
}
export function previewProfessorPresentation(action){
    if(!debugState.enabled||!['idle','paused'].includes(gameState.phase)||gameState.matchResult)return false;
    if(!isProfessorDebugForced(gameState))setProfessorDebugMode(action==='entry'?'entry':'outside');
    const key=debugState.professorAnimation,base=professorDebugFrame(gameState);
    if(action==='sadExit'){
        const current=professorVisualFrame(gameState,base,key)??base;
        clearProfessorPresentation(key);return startProfessorDeparture(key,current);
    }
    if(professorIsDeparting(key))return false;
    // Each explicit speech button previews that line immediately. Real event
    // priorities/cooldowns remain unchanged; an ongoing departure still wins.
    clearProfessorPresentation(key);
    return cueProfessorSpeech(key,action,base);
}
export function professorDebugFrame(state){
    if(!isProfessorDebugForced(state))return null;
    const frame=professorPresentationFrame(debugState.professorAnimation);
    return {...frame,inRing:!frame.behindRopes};
}
export function isProfessorDebugForced(state) {
    return debugState.enabled && debugState.professorForced && state.matchId===debugState.professorPreviewMatchId
        && ['idle','paused'].includes(state.phase) && !state.matchResult;
}
export function armChainContinuation() {
    if (!debugState.enabled || !live()) return false;
    debugState.chainNext = true;
    return true;
}

export function consumeChainContinuation() {
    if (!debugState.enabled || !live() || !debugState.chainNext) return false;
    debugState.chainNext = false;
    debugState.lastOverride = "TESTE: REAÇÃO ESPECIAL SEM ERRO NATURAL";
    return true;
}

export function readDebugSnapshot() {
    if (!debugState.enabled) return null;
    const state = gameState.playerCombat.state;
    const side = state === "defense_direction_qte" ? gameState.defense.expectedSide : null;
    const question = gameState.qte.question;
    const defense = gameState.defense.lastResult;
    const profile = activeDifficulty();
    const history = gameState.offensiveAI.playerHistory;
    const attack = gameState.counterAttack;
    const sideLabel = side => side === "left" ? "ESQUERDA" : side === "right" ? "DIREITA" : "NÃO ESCOLHIDO";
    const yesNo = value => value ? "SIM" : "NÃO";
    return {
        difficulty: profile.label,
        aiProfile: profile.profile,
        aiAccuracy: `${Math.round(profile.accuracy * 100)}%`,
        aiDodge: `${Math.round(profile.dodge * 100)}%`,
        aiInterval: `${profile.min}–${profile.max} s`,
        aiAttack: attack.type && (attack.pending || gameState.opponentCombat.state.startsWith("counter_"))
            ? PUNCH_TYPES[attack.type].label : "—",
        aiHistory: history.map(type => PUNCH_TYPES[type].label).join(", ") || "—",
        aiMemory: gameState.difficulty === "hard"
            ? `${history.length}/5 · ${usesCautiousGuard() ? "Guarda cautelosa" : "Guarda normal"}` : "Desativada",
        lastDefenseSide: defense ? sideLabel(defense.expectedSide) : "—",
        lastDefenseSelectedSide: defense ? sideLabel(defense.selectedSide) : "—",
        lastDefenseSideCorrect: defense ? yesNo(defense.defenseSideCorrect) : "—",
        lastDefenseCorrectAnswer: defense?.correctAnswer ?? "—",
        lastDefenseSelectedAnswer: defense ? defense.selectedAnswer ?? "SEM RESPOSTA (TEMPO ESGOTADO)" : "—",
        lastDefenseAnswerCorrect: defense ? yesNo(defense.questionCorrect) : "—",
        lastDefenseAccuracy: defense ? `${Math.round(defense.attackAccuracy * 100)}% — ${defense.naturalMiss ? "ERRO NATURAL" : "ACERTO"}` : "—",
        lastDefenseMultiplier: defense ? `${number(defense.damageMultiplier)}×` : "—",
        lastDefenseDamage: defense ? `${number(defense.damageApplied)} HP` : "—",
        lastDefensePerfect: defense ? yesNo(defense.perfectDefense) : "—",
        lastDefenseRush: defense ? yesNo(defense.counterRushActivated) : "—",
        lastDefenseOverride: defense?.debugOverride === "perfect_defense" ? "DEFESA PERFEITA FORÇADA (ESCOLHAS ORIGINAIS ACIMA)" : "NENHUMA",
        gameSpeed: `${getGameSpeed().toFixed(2)}×`,
        chainCount: String(gameState.counterChain.count),
        commonAttackCount: String(gameState.commonAttackCount),
        nextCommonQuestion: (gameState.commonAttackCount + 1) % 2 === 0 ? "SIM" : "NÃO",
        chainDifficulty: gameState.counterChain.difficulty ?? "—",
        chainMultiplier: `${chainMultiplier(gameState.counterChain.count).toFixed(1)}×`,
        stunSource: gameState.stun.source ?? "—",
        stunAdditional: `${number(gameState.stun.additional)} s`,
        stunTotal: `${number(gameState.stun.total)} s`,
        stunRemaining: `${number(gameState.stun.remaining)} s`,
        chainState: gameState.counterChain.state,
        chainPending: gameState.counterChain.responsePending ? "SIM" : "NÃO",
        chainResult: gameState.counterChain.lastResult ?? "—",
        chainEnd: gameState.counterChain.endReason ?? "—",
        combat: state, opponent: gameState.opponentCombat.state,
        selected: PUNCH_TYPES[gameState.punches.selected].label,
        turns: PUNCH_ORDER.map(type => `${PUNCH_TYPES[type].label}: ${gameState.punches.cooldowns[type]}`).join(" | "),
        cooldown: `${number(gameState.playerCooldown.remaining)} s`,
        playerHP: number(gameState.playerHealth), enemyHP: number(gameState.enemyHealth),
        qte: question ? `${question.kind} — ${number(gameState.qte.remaining)} s` : "SEM QTE ATIVO",
        counterRush: state.startsWith("counter_rush_") ? state : "INATIVO",
        rushTime: `${number(gameState.counterRush.remaining)} s`,
        cutscene: state === "counter_rush_cutscene" ? "COUNTER_RUSH_CUTSCENE" : state === "counter_rush_flash" ? "FLASH" : "INATIVA",
        cutsceneTime: `${number(gameState.counterRush.cutsceneRemaining)} s`,
        cutsceneNext: state === "counter_rush_cutscene" || state === "counter_rush_flash" ? "COUNTER_RUSH_WINDOW" : "—",
        stunned: gameState.stun.remaining > 0 ? "SIM" : "NÃO", stunTime: `${number(gameState.stun.remaining)} s`,
        attackSide: debugState.showAttackSide && side ? `DEFENDA: ${sideLabel(side)}` : "AGUARDANDO ATAQUE",
        answer: readActiveAnswer(),
        perfect: debugState.perfectNext ? "ARMADA PARA O PRÓXIMO ATAQUE" : debugState.perfectAttackId ? "RESERVADA AO ATAQUE ATUAL" : "NÃO ARMADA",
        override: debugState.lastOverride
    };
}

// Somente leitura: a mesma pergunta e o mesmo valor usados por answerQTE.
export function readActiveAnswer() {
    const question = gameState.qte.question;
    if (!debugState.enabled || !debugState.showAnswers || !question) return "SEM QTE ATIVO";
    const label = { attack: "OFENSIVO", defense: "DEFENSIVO", counter_rush: "COUNTER RUSH" }[question.kind] ?? question.kind;
    const chain = gameState.counterChain;
    const sequence = chain.active ? `\nCOUNTER CHAIN ${chain.count}×` : "";
    return `QTE ATUAL: ${label}${sequence}\nRESPOSTA CORRETA: ${question.correctAnswer}`;
}
