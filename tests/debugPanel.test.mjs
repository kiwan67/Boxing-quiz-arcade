import { updateKnockout, KO_DURATION } from '../js/knockout.js';
import { updateCeremony, ceremonyFrame } from '../js/ceremony.js';
import assert from "node:assert/strict";
import { test, beforeEach, afterEach, mock } from "node:test";
import { initializeDebugPanel, updateDebugPanel } from "../js/debugPanel.js";
import { debugState, setDebugEnabled } from "../js/debug.js";
import { restartFight } from "../js/restart.js";
import { gameState } from "../js/gameState.js";
import { beginSpontaneousAttack } from "../js/counterAttack.js";
import { selectDefenseSide, submitDefenseAnswer } from './helpers/defenseApi.mjs';
import { submitAttackAnswer, updateCombat } from './helpers/combat.mjs';
import { requestQTEPunch as requestPunch } from './helpers/fight.mjs';
import { finishCounterRushIntroForTest } from "./helpers/fight.mjs";
import { selectPunch } from "../js/punches.js";
import { getGameSpeed } from "../js/simulationClock.js";

class Element extends EventTarget {
    textContent = ""; hidden = false; checked = false; disabled = false; value = "normal"; attrs = new Map();
    setAttribute(name, value) { this.attrs.set(name, value); }
    getAttribute(name) { return this.attrs.get(name); }
}
function panel() {
    const root = new Element(); root.hidden = true;
    const keyboard = new EventTarget();
    const parts = Object.fromEntries(["ko", "ko-target", "ko-punch", "body", "collapse", "side", "answers", "perfect", "rush", "chain", "side-value", "answer-value", "speed", "slow", "speed-10", "speed-25", "speed-50", "speed-75", "speed-100"].map(key => [key, new Element()]));
    const names = ["gameSpeed", "combat", "opponent", "selected", "turns", "cooldown", "playerHP", "enemyHP", "qte", "counterRush", "rushTime", "cutscene", "cutsceneTime", "cutsceneNext", "stunned", "stunTime", "override", "perfect"];
    const outputs = Object.fromEntries(names.map(name => [name, Object.assign(new Element(), { dataset: { debugValue: name } })]));
    for (const name of ["commonAttackCount", "nextCommonQuestion", "chainDifficulty", "chainMultiplier", "stunSource", "stunAdditional", "stunTotal", "stunRemaining"]) {
        outputs[name] = Object.assign(new Element(), { dataset: { debugValue: name } });
    }
    for (const name of ["lastDefenseSide", "lastDefenseSelectedSide", "lastDefenseSideCorrect", "lastDefenseCorrectAnswer", "lastDefenseSelectedAnswer", "lastDefenseAnswerCorrect", "lastDefenseAccuracy", "lastDefenseMultiplier", "lastDefenseDamage", "lastDefensePerfect", "lastDefenseRush", "lastDefenseOverride"]) {
        outputs[name] = Object.assign(new Element(), { dataset: { debugValue: name } });
    }
    outputs.attackSide = parts["side-value"]; outputs.answer = parts["answer-value"];
    for (const key of ["attackSide", "answer"]) outputs[key].dataset = { debugValue: key };
    root.querySelector = selector => parts[selector.slice(12, -1)];
    root.querySelectorAll = () => Object.values(outputs);
    initializeDebugPanel(root, keyboard);
    return { root, keyboard, parts, outputs };
}
function f3(keyboard, repeat = false) {
    const event = new Event("keydown", { cancelable: true });
    Object.defineProperties(event, { key: { value: "F3" }, code: { value: "F3" }, repeat: { value: repeat } });
    keyboard.dispatchEvent(event); return event;
}
const fire = (element, name) => element.dispatchEvent(new Event(name, { cancelable: true }));

test("slider e atalhos respondem imediatamente; F3 e reinício restauram velocidade", () => {
    const { keyboard, parts, outputs } = panel(); f3(keyboard);
    assert.equal(outputs.gameSpeed.textContent, "1.00×");
    assert.equal(parts.slow.hidden, true);
    requestPunch("left"); const q = gameState.qte.question;
    const remaining = gameState.qte.remaining;
    for (const percent of [10, 25, 50, 75, 100]) {
        fire(parts[`speed-${percent}`], "click");
        assert.equal(getGameSpeed(), percent / 100);
        assert.equal(outputs.gameSpeed.textContent, `${(percent / 100).toFixed(2)}×`);
        assert.equal(parts.slow.hidden, percent === 100);
        assert.equal(parts[`speed-${percent}`].getAttribute("aria-pressed"), "true");
        assert.equal(gameState.qte.question, q);
        assert.equal(gameState.qte.remaining, remaining);
    }
    parts.speed.value = "0.37"; fire(parts.speed, "input");
    assert.equal(getGameSpeed(), 0.37);
    fire(parts.collapse, "click");
    assert.equal(parts.body.hidden, true);
    assert.equal(outputs.gameSpeed.textContent, "0.37×");
    f3(keyboard);
    assert.equal(getGameSpeed(), 1);
    assert.equal(parts.slow.hidden, true);
    assert.equal(gameState.qte.question, q);
    f3(keyboard); fire(parts["speed-10"], "click");
    restartFight();
    assert.equal(getGameSpeed(), 1);
    assert.equal(parts.speed.value, "1");
    assert.equal(outputs.gameSpeed.textContent, "1.00×");
    assert.equal(parts.slow.hidden, true);
});
beforeEach(() => { setDebugEnabled(false); debugState.expanded = true; restartFight(); gameState.offensiveAI.remaining = 1000000; mock.method(Math, "random", () => 0.99); });
afterEach(() => { setDebugEnabled(false); updateDebugPanel(); mock.restoreAll(); });

test("F3 abre e fecha uma vez, ignora repetição e recolhe sem mudar o combate", () => {
    const { root, keyboard, parts, outputs } = panel();
    initializeDebugPanel(root, keyboard); // Não duplicar o listener de F3.
    const before = JSON.stringify(gameState);
    assert.equal(root.hidden, true);
    assert.equal(f3(keyboard).defaultPrevented, true);
    assert.equal(debugState.enabled, true);
    assert.equal(root.hidden, false);
    assert.equal(outputs.combat.textContent, "idle");
    assert.equal(outputs.commonAttackCount.textContent, "0");
    assert.equal(outputs.nextCommonQuestion.textContent, "NÃO");
    assert.equal(outputs.stunRemaining.textContent, "0 s");
    f3(keyboard, true);
    assert.equal(root.hidden, false);
    fire(parts.collapse, "click");
    assert.equal(parts.body.hidden, true);
    assert.equal(parts.collapse.textContent, "EXPANDIR");
    assert.equal(root.hidden, false); // Indicador DEBUG MODE continua no cabeçalho.
    f3(keyboard);
    assert.equal(root.hidden, true);
    assert.equal(outputs.combat.textContent, "");
    assert.equal(JSON.stringify(gameState), before);
});

test("opções revelam lado visual e resposta atual sem selecionar ou responder automaticamente", () => {
    const { keyboard, parts, outputs } = panel(); f3(keyboard);
    parts.side.checked = true; fire(parts.side, "change");
    assert.equal(outputs.attackSide.textContent, "AGUARDANDO ATAQUE");
    beginSpontaneousAttack(); updateDebugPanel();
    assert.equal(outputs.attackSide.textContent, "DEFENDA: ESQUERDA"); // Braço direito anatômico.
    assert.equal(gameState.defense.selectedSide, null);
    selectDefenseSide(gameState.defense.expectedSide);
    parts.answers.checked = true; fire(parts.answers, "change");
    const q = gameState.qte.question;
    assert.equal(outputs.answer.textContent, `QTE ATUAL: DEFENSIVO\nRESPOSTA CORRETA: ${q.correctAnswer}`);
    assert.equal(gameState.qte.question, q);
    assert.equal(gameState.qte.remaining, 10);
    assert.equal(parts["answer-value"].hidden, false);
    parts.answers.checked = false; fire(parts.answers, "change");
    assert.equal(parts["answer-value"].hidden, true);
    assert.equal(outputs.answer.textContent, "SEM QTE ATIVO");
});

test("última defesa mostra o registro real e permanece após fechar o QTE", () => {
    const { keyboard, outputs } = panel(); f3(keyboard);
    beginSpontaneousAttack();
    selectDefenseSide(gameState.defense.expectedSide);
    const question = gameState.qte.question;
    submitDefenseAnswer(question.correctAnswer, question.id);
    updateCombat(0.55); updateDebugPanel();
    const result = gameState.defense.lastResult;
    assert.equal(outputs.lastDefenseSide.textContent, "ESQUERDA");
    assert.equal(outputs.lastDefenseSelectedSide.textContent, "ESQUERDA");
    assert.equal(outputs.lastDefenseSideCorrect.textContent, "SIM");
    assert.equal(outputs.lastDefenseCorrectAnswer.textContent, result.correctAnswer);
    assert.equal(outputs.lastDefenseSelectedAnswer.textContent, result.selectedAnswer);
    assert.equal(outputs.lastDefenseAnswerCorrect.textContent, "SIM");
    assert.equal(outputs.lastDefenseAccuracy.textContent, "80% — ACERTO");
    assert.equal(outputs.lastDefenseMultiplier.textContent, "0.1×");
    assert.equal(outputs.lastDefenseDamage.textContent, "2 HP");
    assert.equal(outputs.lastDefensePerfect.textContent, "SIM");
    assert.equal(outputs.lastDefenseRush.textContent, "SIM");
    updateCombat(3.12); updateDebugPanel();
    assert.equal(outputs.lastDefenseCorrectAnswer.textContent, result.correctAnswer);
    f3(keyboard);
    assert.equal(outputs.lastDefenseCorrectAnswer.textContent, "");
    restartFight(); f3(keyboard);
    assert.equal(outputs.lastDefenseDamage.textContent, "—");
});

test("controles armam uma defesa e um resultado Rush; consumo e reinício atualizam o painel", () => {
    const { keyboard, parts, outputs } = panel(); f3(keyboard);
    fire(parts.perfect, "click");
    assert.equal(debugState.perfectNext, true);
    assert.equal(parts.perfect.disabled, true);
    parts.rush.value = "hit"; fire(parts.rush, "change");
    assert.equal(debugState.rushOutcome, "hit");
    beginSpontaneousAttack();
    selectDefenseSide(gameState.defense.expectedSide === "left" ? "right" : "left");
    const defense = gameState.qte.question;
    submitDefenseAnswer(defense.alternatives.find(answer => answer !== defense.correctAnswer), defense.id);
    updateCombat(0.55); updateDebugPanel();
    assert.equal(outputs.cutscene.textContent, "COUNTER_RUSH_CUTSCENE");
    assert.equal(outputs.cutsceneTime.textContent, "3 s");
    assert.equal(outputs.cutsceneNext.textContent, "COUNTER_RUSH_WINDOW");
    finishCounterRushIntroForTest(); updateDebugPanel();
    assert.equal(gameState.playerCombat.state, "counter_rush_window");
    assert.equal(parts.perfect.disabled, false);
    assert.ok(outputs.override.textContent.includes("SUBSTITUÍDA"));
    requestPunch("left"); const q = gameState.qte.question;
    submitAttackAnswer(q.correctAnswer, q.id); updateDebugPanel();
    assert.equal(parts.rush.value, "normal");
    assert.ok(outputs.override.textContent.includes("ACERTO COMPLETO"));
    restartFight();
    assert.equal(debugState.enabled, true);
    assert.equal(parts.rush.value, "normal");
    assert.equal(outputs.override.textContent, "NENHUMA SUBSTITUIÇÃO");
    assert.equal(outputs.playerHP.textContent, "100");
    assert.equal(outputs.cutscene.textContent, "INATIVA");
    assert.equal(outputs.stunned.textContent, "NÃO");
    fire(parts.chain, "click");
    assert.equal(debugState.chainNext, true);
    assert.equal(parts.chain.disabled, true);
    f3(keyboard);
    assert.equal(debugState.chainNext, false);
});

test("fechar por F3 cancela opções pendentes; remontagem remove listeners antigos", () => {
    const first = panel(); f3(first.keyboard);
    fire(first.parts.perfect, "click");
    first.parts.rush.value = "blocked"; fire(first.parts.rush, "change");
    f3(first.keyboard);
    assert.equal(debugState.perfectNext, false);
    assert.equal(debugState.rushOutcome, "normal");
    const second = panel();
    f3(first.keyboard);
    assert.equal(debugState.enabled, false);
    f3(second.keyboard);
    assert.equal(debugState.enabled, true);
    assert.equal(first.root.hidden, true);
    assert.equal(second.root.hidden, false);
});

test("resposta ofensiva aparece antes de responder, permanece recolhida e some ao finalizar ou desligar", () => {
    const { keyboard, parts, outputs } = panel(); f3(keyboard);
    parts.answers.checked = true; fire(parts.answers, "change");
    assert.equal(parts["answer-value"].hidden, true);
    requestPunch("left"); updateDebugPanel();
    const q = gameState.qte.question;
    const before = JSON.stringify(gameState);
    assert.equal(outputs.answer.textContent, `QTE ATUAL: OFENSIVO\nRESPOSTA CORRETA: ${q.correctAnswer}`);
    assert.equal(parts["answer-value"].hidden, false);
    fire(parts.collapse, "click");
    assert.equal(parts.body.hidden, true);
    assert.equal(parts["answer-value"].hidden, false);
    assert.equal(JSON.stringify(gameState), before);
    const shown = outputs.answer.textContent.split("RESPOSTA CORRETA: ")[1];
    assert.equal(submitAttackAnswer(shown, q.id), true);
    assert.equal(gameState.qte.lastResult.outcome, "correct");
    updateDebugPanel(); assert.equal(parts["answer-value"].hidden, true);
    restartFight(); requestPunch("left"); updateDebugPanel();
    f3(keyboard);
    assert.equal(parts["answer-value"].hidden, true);
    assert.equal(outputs.answer.textContent, "");
    assert.notEqual(gameState.qte.question, null);
});

test("painel acompanha defesa e todos os quatro Rush lendo somente a pergunta ativa", () => {
    const { keyboard, parts, outputs } = panel(); f3(keyboard);
    parts.answers.checked = true; fire(parts.answers, "change");
    function revealAndAnswer(defense, count) {
        if (defense) selectDefenseSide(gameState.defense.expectedSide);
        const q = gameState.qte.question;
        const before = JSON.stringify(gameState);
        updateDebugPanel();
        assert.ok(outputs.answer.textContent.startsWith(`QTE ATUAL: ${defense ? "DEFENSIVO" : "COUNTER RUSH"}`));
        if (count) assert.ok(outputs.answer.textContent.includes(`COUNTER CHAIN ${count}×`));
        assert.equal(parts["answer-value"].hidden, false);
        assert.equal(JSON.stringify(gameState), before);
        const shown = outputs.answer.textContent.split("RESPOSTA CORRETA: ")[1];
        assert.equal(shown, q.correctAnswer);
        assert.equal((defense ? submitDefenseAnswer : submitAttackAnswer)(shown, q.id), true);
        assert.equal(gameState.qte.lastResult.outcome, "correct");
        updateDebugPanel();
        assert.equal(parts["answer-value"].hidden, true);
        assert.equal(outputs.answer.textContent, "SEM QTE ATIVO");
    }
    beginSpontaneousAttack(); revealAndAnswer(true, 0); updateCombat(0.55);
    finishCounterRushIntroForTest(); selectPunch("jab");
    for (let count = 1; count <= 4; count++) {
        assert.equal(requestPunch("left"), true);
        revealAndAnswer(false, count); updateCombat(0.4);
        if (count < 4) {
            updateCombat(0.22); revealAndAnswer(true, count); updateCombat(0.55); updateCombat(0.5);
        }
    }
    assert.equal(gameState.counterChain.active, false);
    restartFight(); requestPunch("left"); updateCombat(10); updateDebugPanel();
    assert.equal(parts["answer-value"].hidden, true);
});

test('F3 testa cada alvo e golpe sem travar o painel ou a transição',()=>{
 for(const target of ['player','enemy'])for(const chosen of ['jab','straight','hook','uppercut','special']){
  const {parts}=panel();setDebugEnabled(true);updateDebugPanel();
  parts['ko-target'].value=target;parts['ko-punch'].value=chosen;
  assert.doesNotThrow(()=>fire(parts.ko,'click'));
  assert.equal(gameState.phase,'knockout_cinematic');
  assert.doesNotThrow(()=>updateDebugPanel());
  const result=gameState.matchResult;
  assert.equal(result.loser,target==='player'?'player':'bot');
  assert.equal(result.punchType,chosen==='special'?'uppercut':chosen);
  for(let i=0;i<Math.ceil(KO_DURATION*60)+1;i++){updateKnockout(gameState,1/60);updateDebugPanel();}
  assert.equal(gameState.phase,target==='player'?'defeat':'victory');assert.equal(gameState.matchResult,result);
  updateCeremony(gameState,5);assert.equal(ceremonyFrame(gameState).phase,'menu');
  restartFight();assert.equal(gameState.phase,'idle');
 }
});
