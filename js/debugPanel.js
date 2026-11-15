import { prepareKnockoutDebug } from './knockoutDebug.js';
import {seekKnockoutPreview,updateKnockout,knockoutFrame} from './knockout.js';
import {previewDefeatExpression,updateCeremony} from './ceremony.js';
import { applyImpactDamage } from './match.js';
import { restartFight } from './restart.js';
import { updateLobby } from './lobby.js';
import { previewRefereeExpression } from './refereeExpressions.js';
import { previewVisualDamage, updateWear } from './fighterWear.js';
import { debugState, setDebugEnabled, armPerfectDefense, setRushDebugOutcome, readDebugSnapshot, armChainContinuation } from "./debug.js";
import { gameState } from "./gameState.js";
import { setDebugGameSpeed } from "./debug.js";
import { getGameSpeed } from "./simulationClock.js";
import { queueDebugQuestion, simulateDebugAnswer } from './debugQuestions.js';
import { QUESTION_COUNT } from './questions.js';
import {setProfessorDebugMode,previewProfessorPresentation} from './debug.js';
import {professorRenderInfo} from './professorView.js';

let root, keyboard, controls, toggleButton, values = [], bindings = [];
function bind(target, name, listener) {
    target.addEventListener(name, listener);
    bindings.push([target, name, listener]);
}
function onKey(event) {
    if (event.key !== "F3" && event.code !== "F3") return;
    event.preventDefault();
    if (event.repeat) return;
    toggleDebug();
}
function toggleDebug() {
    setDebugEnabled(!debugState.enabled);
    if (!debugState.enabled) previewRefereeExpression(null);
    updateDebugPanel();
}

export function initializeDebugPanel(target = document.getElementById("debug-panel"), keyTarget = document) {
    if (!target || typeof target.querySelector !== "function") return;
    if (root === target && keyboard === keyTarget) { updateDebugPanel(); return; }
    for (const [element, name, listener] of bindings) element.removeEventListener(name, listener);
    bindings = [];
    if (root && root !== target) root.hidden = true;
    root = target; keyboard = keyTarget;
    const find = name => root.querySelector(`[data-debug-${name}]`);
    toggleButton=keyTarget.getElementById?.('debug-toggle');
    const repeatProfessor=find('professor-repeat');
    if(repeatProfessor)bind(repeatProfessor,'click',()=>{setProfessorDebugMode('entry');updateDebugPanel();});
    for(const action of ['appearance','entry','strong','defense','sequence','sadExit']){
        const button=root.querySelector(`[data-debug-professor-action="${action}"]`);
        if(button)bind(button,'click',()=>{previewProfessorPresentation(action);updateDebugPanel();});
    }
    if(toggleButton)bind(toggleButton,'click',toggleDebug);
    for(const [name,mode] of [['professor','outside'],['professor-entry','entry'],['professor-inside','inside']]){
        const control=find(name);
        if(control)bind(control,'change',()=>{setProfessorDebugMode(control.checked?mode:null);updateDebugPanel();});
    }
    controls = { body: find("body"), collapse: find("collapse"), side: find("side"), answers: find("answers"),
        perfect: find("perfect"), rush: find("rush"), sideValue: find("side-value"), answerValue: find("answer-value") };
    if (Object.values(controls).some(value => !value)) { controls = null; return; }
    values = [...root.querySelectorAll("[data-debug-value]")];
    const questionStatus=find('question-status');
    if(questionStatus)questionStatus.textContent=`${QUESTION_COUNT} PERGUNTAS CARREGADAS.`;
    for(const action of ['random','id','correct','incorrect','timeout']){
        const button=find(`question-${action}`);
        if(button)bind(button,'click',()=>{
            if(!debugState.enabled)return;
            const message=action==='random'?queueDebugQuestion():action==='id'?queueDebugQuestion(find('question-input')?.value.trim()):
                simulateDebugAnswer(action)?'RESPOSTA APLICADA AO QTE ATIVO.':'SEM QTE ATIVO.';
            if(questionStatus)questionStatus.textContent=message;
            updateDebugPanel();
        });
    }
    for(const role of ['player','bot']) {
        const control=find(`wear-${role}`);
        if(control) bind(control,'change',()=>{ if(debugState.enabled) previewVisualDamage(role,control.value==='auto'?null:Number(control.value)); });
    }
    const koControl=find('ko');
    if(koControl)bind(koControl,'click',()=>{
        if(!debugState.enabled)return;
        const target=find('ko-target')?.value||'enemy',chosen=find('ko-punch')?.value||'jab';
        restartFight();updateLobby();
        if(!prepareKnockoutDebug(gameState,target,chosen))return;
        applyImpactDamage(target,100,'debug-ko',gameState.matchId);updateWear(gameState,0);
        previewDefeatExpression(gameState,find('ko-expression')?.value||'auto');
        const stage=find('ko-stage')?.value||'full';
        if(stage==='ceremony'){
            updateKnockout(gameState,knockoutFrame().total);
            updateCeremony(gameState,0);
        }else if(stage!=='full')seekKnockoutPreview(gameState,stage);
    });
    const expressionControl=find('ko-expression');
    if(expressionControl)bind(expressionControl,'change',()=>{
        if(debugState.enabled)previewDefeatExpression(gameState,expressionControl.value);
    });
    const faceControl=find('referee-expression');
    if(faceControl)bind(faceControl,'change',()=>{if(debugState.enabled)previewRefereeExpression(faceControl.value==='auto'?null:faceControl.value);});
    const chainControl = find("chain");
    const speedSlider = find("speed");
    if (speedSlider) bind(speedSlider, "input", () => { setDebugGameSpeed(Number(speedSlider.value)); updateDebugPanel(); });
    for (const percent of [10, 25, 50, 75, 100]) {
        const button = find(`speed-${percent}`);
        if (button) bind(button, "click", () => { setDebugGameSpeed(percent / 100); updateDebugPanel(); });
    }
    if (chainControl) bind(chainControl, "click", () => { armChainContinuation(); updateDebugPanel(); });
    bind(keyboard, "keydown", onKey);
    bind(controls.collapse, "click", () => { debugState.expanded = !debugState.expanded; updateDebugPanel(); });
    bind(controls.side, "change", () => { if (debugState.enabled) debugState.showAttackSide = controls.side.checked; updateDebugPanel(); });
    bind(controls.answers, "change", () => { if (debugState.enabled) debugState.showAnswers = controls.answers.checked; updateDebugPanel(); });
    bind(controls.perfect, "click", () => { armPerfectDefense(); updateDebugPanel(); });
    bind(controls.rush, "change", () => { setRushDebugOutcome(controls.rush.value); updateDebugPanel(); });
    bind(root, "mousedown", event => event.stopPropagation());
    updateDebugPanel();
}

export function updateDebugPanel() {
    if (!root || !controls) return;
    toggleButton?.setAttribute('aria-expanded',String(debugState.enabled));
    for(const [name,mode] of [['professor','outside'],['professor-entry','entry'],['professor-inside','inside']]){
        const control=root.querySelector(`[data-debug-${name}]`);
        if(control){
            control.checked=debugState.professorMode===mode;
            control.disabled=!debugState.enabled||!['idle','paused'].includes(gameState.phase)||Boolean(gameState.matchResult);
        }
    }
    const speed = getGameSpeed();
    const slider = root.querySelector("[data-debug-speed]");
    if (slider) slider.value = String(speed);
    const slow = root.querySelector("[data-debug-slow]");
    if (slow) slow.hidden = !debugState.enabled || speed === 1;
    for (const percent of [10, 25, 50, 75, 100]) {
        root.querySelector(`[data-debug-speed-${percent}]`)?.setAttribute("aria-pressed", String(speed === percent / 100));
    }
    if (!debugState.enabled) {
        controls.answerValue.hidden = true;
        controls.answerValue.textContent = "";
        if (!root.hidden) {
            root.hidden = true;
            for (const element of values) element.textContent = "";
        }
        return;
    }
    root.hidden = false;
    const professorInfo=root.querySelector('[data-debug-professor-info]');
    if(professorInfo){
        const info=professorRenderInfo(gameState);
        professorInfo.textContent=info?`ESTADO: ${info.stage} · ANIMAÇÃO: ${info.animation} · FRAME: ${info.frame}/${info.totalFrames}\nETAPA: ${info.entryStep} · SITUAÇÃO: ${info.entryStatus} · POSIÇÃO DOS PÉS: ${info.positionZone}\nFRAME SUBIDA: ${info.climbFrame??'—'}/${info.climbTotalFrames}\nFPS CAMINHADA: ${info.walkingFrameFrequency.toFixed(2)} · DURAÇÃO ETAPA: ${info.stageDuration===null?'CONTÍNUA':info.stageDuration.toFixed(3)+' s'}\nARQUIVO: ${info.file} · CARREGADO: ${info.loaded?'SIM':'NÃO'}\nRECORTE: ${info.crop}\nESCALA: ${info.scale.toFixed(4)} · X: ${info.x.toFixed(2)} · Y (PÉS): ${info.y.toFixed(2)}\nCAMADA: ${info.layer}\nLATERAL: ${info.availableWidth.toFixed(0)} PX LIVRES / ${info.requiredWidth.toFixed(1)} PX NECESSÁRIOS${info.orderWarning?'\nORDEM INVÁLIDA: '+info.orderWarning:''}`:'PROFESSOR INVISÍVEL';
        if(info)professorInfo.textContent+=`\nFALA: ${info.dialogue??'—'} · SAÍDA: ${info.departure?'SIM':'NÃO'} · OPACIDADE: ${info.alpha.toFixed(2)}${info.missingSad?'\nAVISO: FOLHA TRISTE AUSENTE; POSE ORIGINAL PRESERVADA':''}`;
    }
    const repeatProfessor=root.querySelector('[data-debug-professor-repeat]');
    if(repeatProfessor)repeatProfessor.disabled=!['idle','paused'].includes(gameState.phase)||Boolean(gameState.matchResult);
    controls.body.hidden = !debugState.expanded;
    controls.collapse.textContent = debugState.expanded ? "RECOLHER" : "EXPANDIR";
    controls.collapse.setAttribute("aria-expanded", String(debugState.expanded));
    controls.side.checked = debugState.showAttackSide;
    controls.answers.checked = debugState.showAnswers;
    controls.sideValue.hidden = !debugState.showAttackSide;
    controls.answerValue.hidden = !debugState.showAnswers || !gameState.qte.question;
    controls.rush.value = debugState.rushOutcome;
    const over = gameState.phase === "victory" || gameState.phase === "defeat";
    controls.perfect.disabled = over || debugState.perfectNext || debugState.perfectAttackId !== null;
    controls.rush.disabled = over;
    const chainControl = root.querySelector("[data-debug-chain]");
    if (chainControl) chainControl.disabled = over || debugState.chainNext;
    const snapshot = readDebugSnapshot();
    for (const element of values) {
        const text = snapshot[element.dataset.debugValue] ?? "—";
        if (element.textContent !== text) element.textContent = text;
    }
}






