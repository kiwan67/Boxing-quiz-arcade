import { KNOCKOUT_CINEMATIC, updateKnockout } from './knockout.js';
import { preloadKnockoutSprites } from './knockoutView.js';
import { preloadRefereeReactions } from './refereeGestures.js';
import { updateRefereeExpressions } from './refereeExpressions.js';
import { updateWear } from './fighterWear.js';
import { updateMatchIntro } from './matchIntro.js';
import { updateArenaAudio, pauseArenaSpeech, setArenaAudioHidden } from './arenaAudio.js';
import { initializeIntroControls, syncIntroControls } from './matchIntro.js';
import { arenaLife } from './arenaLife.js';
import { gameState } from "./gameState.js";
import { initializeRenderer, render } from "./render.js";
import { characters, updateCharacters } from "./characters.js";
import { updateCombat } from "./combat.js";
import { initializeInput } from "./input.js";
import { isMatchOver } from "./match.js";
import { updateHUD } from "./hud.js";
import { initializePunchControls, updatePunchControls } from "./punchControls.js";
import { initializeDebugPanel, updateDebugPanel } from "./debugPanel.js";
import { realFrameDelta, simulationDelta, resetFrameTimestamp } from "./simulationClock.js";
import { initializeAudio } from "./audio.js";
import { initializeLobby, updateMenuBackground } from "./lobby.js";
import { preloadFighterSprites } from "./fighterSprites.js";
import { preloadCeremonySprites, updateCeremony } from "./ceremony.js";
import { updateArenaEffects } from "./arenaEffects.js";
import { updateArenaLife } from "./arenaLife.js";
import { initializePresentationSettings } from "./presentationSettings.js";
import {isTutorialActive,initializeTutorialControls,updateTutorial} from './tutorial.js';
import {preloadTutorialSprites} from './tutorialSprites.js';
import { updateQuestionReview } from './qteView.js';
import { isReadingQuestion } from './qte.js';

let initialized = false;

export function update(realDelta) {
    updateQuestionReview();
    if(isReadingQuestion()&&gameState.phase!=='paused'){
        updateCombat(realDelta);updateQuestionReview();updatePunchControls();updateDebugPanel();
        updateArenaAudio(gameState,0,arenaLife);return;
    }
    if (gameState.phase === "lobby") { updateTutorial(realDelta);updateMenuBackground(realDelta);updateArenaAudio(gameState, 0, arenaLife); syncIntroControls(); updateDebugPanel(); return; }
    if(gameState.phase===KNOCKOUT_CINEMATIC){
        updateKnockout(gameState,realDelta);
        updateHUD(gameState,realDelta);
        updateArenaLife(gameState,realDelta*.32);
        updateArenaEffects(gameState,realDelta*.32,characters);
        updateArenaAudio(gameState,realDelta,arenaLife);
        updatePunchControls();updateDebugPanel();return;
    }
    const deltaTime = simulationDelta(realDelta);
    if (gameState.phase === "paused") { pauseArenaSpeech(true); updateArenaAudio(gameState, 0, arenaLife); updatePunchControls(); updateDebugPanel(); return; }
    pauseArenaSpeech(Boolean(document.hidden));
    updateArenaLife(gameState, deltaTime);
    if (gameState.phase === "match_intro") {
        updateMatchIntro(deltaTime); updateArenaAudio(gameState, deltaTime, arenaLife);
        updatePunchControls(); updateDebugPanel(); return;
    }
    if (isMatchOver()) {
        updateCeremony(gameState, deltaTime);
        updateArenaEffects(gameState, deltaTime, characters);
    updateArenaLife(gameState, 0);
        updateArenaAudio(gameState, deltaTime, arenaLife);
        updatePunchControls();
        updateDebugPanel();
        return;
    }
    gameState.gameTime += deltaTime;
    updateCombat(deltaTime);
    updateQuestionReview();
    if(isReadingQuestion()){updatePunchControls();updateDebugPanel();return;}
    if(gameState.phase===KNOCKOUT_CINEMATIC){updateWear(gameState,0);updateArenaEffects(gameState,0,characters);updatePunchControls();updateDebugPanel();return;}
    updateRefereeExpressions(gameState, deltaTime);
    updateWear(gameState, deltaTime);
    updateHUD(gameState, deltaTime);
    updateCharacters(deltaTime);
    updateArenaEffects(gameState, deltaTime, characters);
    updateArenaLife(gameState, 0);
    updateArenaAudio(gameState, deltaTime, arenaLife);
    updatePunchControls();
    updateDebugPanel();
}

function gameLoop(timestamp) {
    // O primeiro quadro estabelece a origem do tempo, em milissegundos.
    const deltaTime = realFrameDelta(timestamp);

    update(deltaTime);
    if (gameState.phase !== "lobby" || isTutorialActive()) render();
    requestAnimationFrame(gameLoop);
}

export function initializeGame() {
    if (initialized) return;

    const canvas = document.getElementById("game-canvas");
    initializeRenderer(canvas);
    initializeInput(canvas);
    initializeAudio();
    initializePresentationSettings();
    initializeIntroControls();
    initializeTutorialControls();
    initializePunchControls();
    initializeDebugPanel();
    const loads = [preloadFighterSprites(), preloadCeremonySprites(), preloadRefereeReactions(), preloadKnockoutSprites(),preloadTutorialSprites()].filter(Boolean);
    initializeLobby(document, loads.length ? Promise.all(loads) : null);
    initialized = true;

    // Não contabiliza o período em que a aba permanece oculta.
    document.addEventListener("visibilitychange", () => {
        resetFrameTimestamp();
        setArenaAudioHidden(Boolean(document.hidden));
    });

    requestAnimationFrame(gameLoop);
}

initializeGame();







