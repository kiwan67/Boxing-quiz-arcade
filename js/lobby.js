import { audioManager } from './audioManager.js';
import { gameState } from "./gameState.js";
import { DIFFICULTIES } from "./difficulty.js";
import { restartFight } from "./restart.js";
import { onIntroChange } from "./matchIntro.js";
import {beginTutorialPrompt,isTutorialActive,onTutorialChange} from './tutorial.js';
import { unlockAudio } from "./audio.js";
import { initializeMainMenu } from './mainMenu.js';

let view;
onIntroChange(updateLobby);
onTutorialChange(updateLobby);

export function initializeLobby(doc = document, assetsReady = null) {
    const panel = doc.getElementById("difficulty-lobby");
    if (!panel?.querySelectorAll) return;
    const options = [...panel.querySelectorAll("[data-difficulty]")];
    view = { panel, options, canvas: doc.getElementById("game-canvas"), controls: doc.getElementById("punch-controls") };
    view.menu=initializeMainMenu(doc,updateLobby);
    for (const option of options) {
        option.addEventListener("click", () => {
            if (gameState.phase !== "lobby" || isTutorialActive() || !Object.hasOwn(DIFFICULTIES, option.dataset.difficulty)) return;
            audioManager.play('menu_select');
            gameState.difficulty = option.dataset.difficulty;
            updateLobby();
        });
    }
    const start = panel.querySelector("[data-start-fight]");
    if (assetsReady) {
        start.disabled = true;
        assetsReady.finally(() => { start.disabled = false; });
    }
    start.addEventListener("click", () => {
        if (start.disabled || gameState.phase !== "lobby" || isTutorialActive() || (view.menu&&view.menu.screen!=='difficulty')) return;
        restartFight();
        unlockAudio(); audioManager.play('menu_confirm');
        beginTutorialPrompt();
        updateLobby();
    });
    updateLobby();
}

export function updateLobby() {
    if (!view) return;
    const open = gameState.phase === "lobby" && !isTutorialActive();
    view.menu?.sync(open);
    view.panel.hidden = !open || Boolean(view.menu&&view.menu.screen!=='difficulty');
    view.canvas.hidden = open;
    view.controls.hidden = gameState.phase === "lobby" || gameState.phase === "match_intro";
    if (open) {
        for (const option of view.options) option.setAttribute("aria-pressed", String(option.dataset.difficulty === gameState.difficulty));
    }
}

export function returnToLobby() {
    if (gameState.phase !== "victory" && gameState.phase !== "defeat") return;
    restartFight();
    gameState.phase = "lobby";
    if(view?.menu)view.menu.screen='main';
    updateLobby();
    view?.options.find(option => option.dataset.difficulty === gameState.difficulty)?.focus();
}


// Uses the game's existing frame loop; no menu-owned timers or animation loops.
export function updateMenuBackground(delta){
 if(gameState.phase==='lobby'&&!isTutorialActive())view?.menu?.update(delta);
}
