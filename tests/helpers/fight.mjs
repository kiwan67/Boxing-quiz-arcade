import assert from "node:assert/strict";
import { restartFight as restartProductionFight } from "../../js/restart.js";
import { gameState } from "../../js/gameState.js";
import { updateCombat, requestPunch } from "./combat.mjs";

// Isola os cenários antigos que testam QTE; o ciclo real tem suíte própria.
export function requestQTEPunch(arm) {
    if (gameState.playerCombat.state === "idle" && gameState.playerCooldown.remaining === 0
        && gameState.punches.selected !== "uppercut" && gameState.punches.cooldowns[gameState.punches.selected] === 0
        && gameState.opponentCombat.state === "idle") {
        gameState.commonAttackCount |= 1;
    }
    return requestPunch(arm);
}

// As regressões antigas isolam golpes/QTEs. A IA ofensiva tem testes próprios.
export function restartFight() {
    restartProductionFight();
    gameState.offensiveAI.remaining = 1000000;
}

export function finishPlayerCooldown() {
    expireCounterRushForTest();
    if (gameState.stun.remaining > 0) updateCombat(gameState.stun.remaining);
    if (gameState.playerCombat.state === "action_cooldown") {
        gameState.offensiveAI.remaining = 1000000;
        updateCombat(gameState.playerCooldown.remaining);
    }
    // Regressões antigas isolam o soco escolhido. Recargas por turnos têm suíte própria.
    if (gameState.playerCombat.state === "idle") {
        gameState.punches.cooldowns[gameState.punches.selected] = 0;
    }
}

// As regressões anteriores deixam passar a oportunidade nova sem consumir turnos.
// A suíte Counter Rush exercita janela, QTE e golpes sem este helper.
export function expireCounterRushForTest() {
    finishCounterRushIntroForTest();
    if (gameState.playerCombat.state !== "counter_rush_window") return;
    const before = { ...gameState.punches.cooldowns };
    updateCombat(gameState.counterRush.remaining);
    assert.deepEqual(gameState.punches.cooldowns, before);
}

export function finishCounterRushIntroForTest() {
    if (gameState.playerCombat.state === "counter_rush_cutscene") updateCombat(gameState.counterRush.cutsceneRemaining);
    if (gameState.playerCombat.state === "counter_rush_flash") updateCombat(gameState.counterRush.flashRemaining);
}

export function expectIdleAfterCooldown() {
    finishPlayerCooldown();
    assert.equal(gameState.playerCombat.state, "idle");
}
