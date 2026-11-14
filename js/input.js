import { requestPunch, submitAttackAnswer } from "./combat.js";
import { gameState } from "./gameState.js";
import { qteAnswerAt } from "./qteView.js";
import { selectDefenseSide, submitDefenseAnswer } from "./defense.js";
import { isMatchOver } from "./match.js";
import { isLobbyButtonAt, isRestartButtonAt } from "./matchView.js";
import { returnToLobby } from "./lobby.js";
import { restartFight } from "./restart.js";
import { defenseSideAt } from "./defenseView.js";
import { ceremonyFrame } from "./ceremony.js";
import { beginMatchIntro } from "./matchIntro.js";
import {isTutorialActive,handleTutorialMouse} from './tutorial.js';
import { isReadingQuestion } from './qte.js';

let boundCanvas;
let boundKeyboard;

function submitQuestionAnswer(answer){
    if(isReadingQuestion()||isTutorialActive()||gameState.phase!=="idle"||isMatchOver()||!gameState.qte.question)return;
    const state=gameState.playerCombat.state;
    if(!["attack_qte","counter_rush_qte","defense_question_qte"].includes(state))return;
    const submit=state==="defense_question_qte"?submitDefenseAnswer:submitAttackAnswer;
    submit(answer,gameState.qte.question.id);
}

function onKeyDown(event){
    if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.isComposing)return;
    if(event.target?.isContentEditable||["INPUT","TEXTAREA","SELECT"].includes(event.target?.tagName))return;
    const digit=/^(?:Digit|Numpad)([1-4])$/.exec(event.code)?.[1]??(/^[1-4]$/.test(event.key)?event.key:null);
    if(!digit||isReadingQuestion()||isTutorialActive()||gameState.phase!=="idle"||isMatchOver()||!gameState.qte.question
        ||!["attack_qte","counter_rush_qte","defense_question_qte"].includes(gameState.playerCombat.state))return;
    event.preventDefault();
    submitQuestionAnswer("ABCD"[Number(digit)-1]);
}

function onMouseDown(event) {
    if(isReadingQuestion())return;
    if(handleTutorialMouse(event,boundCanvas))return;
    if (gameState.phase === "paused" || gameState.phase === "lobby" || gameState.phase === "match_intro") return;
    if (isMatchOver()) {
        if (ceremonyFrame(gameState)?.phase !== "menu") return;
        if (event.button === 0) {
            const bounds = boundCanvas.getBoundingClientRect();
            if (bounds.width <= 0 || bounds.height <= 0) return;
            const x = (event.clientX - bounds.left) * boundCanvas.width / bounds.width;
            const y = (event.clientY - bounds.top) * boundCanvas.height / bounds.height;
            if (isRestartButtonAt(x, y)) { restartFight(); beginMatchIntro(); }
            else if (isLobbyButtonAt(x, y)) returnToLobby();
        }
        return;
    }
    const state = gameState.playerCombat.state;
    if (state === "defense_direction_qte") {
        if (event.button === 0) {
            const bounds = boundCanvas.getBoundingClientRect();
            const side = bounds.width > 0 && bounds.height > 0 ? defenseSideAt(
                (event.clientX - bounds.left) * boundCanvas.width / bounds.width,
                (event.clientY - bounds.top) * boundCanvas.height / bounds.height) : null;
            // Clique no botão visual tem prioridade; fora dele, mantém o atalho.
            selectDefenseSide(side ?? "left");
        }
        else if (event.button === 2) selectDefenseSide("right");
        return;
    }
    if (state === "attack_qte" || state === "counter_rush_qte" || state === "defense_question_qte") {
        if (event.button === 0) {
            const bounds = boundCanvas.getBoundingClientRect();
            if (bounds.width <= 0 || bounds.height <= 0) return;
            const x = (event.clientX - bounds.left) * boundCanvas.width / bounds.width;
            const y = (event.clientY - bounds.top) * boundCanvas.height / bounds.height;
            const answer = qteAnswerAt(x, y);
            if (answer) {
                submitQuestionAnswer(answer);
            }
        }
        return;
    }
    // Sem dependência da posição do cursor, sem teclado e sem repetição ao segurar.
    if (event.button === 0) requestPunch("left");
    else if (event.button === 2) requestPunch("right");
}

function onContextMenu(event) {
    event.preventDefault();
}

export function initializeInput(canvas) {
    if (boundCanvas === canvas) return;
    if (boundCanvas) {
        boundCanvas.removeEventListener("mousedown", onMouseDown);
        boundCanvas.removeEventListener("contextmenu", onContextMenu);
    }
    boundCanvas = canvas;
    const keyboard=canvas.ownerDocument??globalThis.document;
    if(boundKeyboard!==keyboard){
        boundKeyboard?.removeEventListener("keydown",onKeyDown);
        boundKeyboard=keyboard;
        boundKeyboard?.addEventListener("keydown",onKeyDown);
    }
    canvas.addEventListener("mousedown", onMouseDown);
    // O bloqueio fica restrito ao Canvas, sem listener no documento.
    canvas.addEventListener("contextmenu", onContextMenu);
}
