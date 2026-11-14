import { KNOCKOUT_CINEMATIC } from './knockout.js';
import { drawKnockout } from './knockoutView.js';
import { drawContactFlash } from './arenaEffects.js';
import { refereeBackgroundFrame } from './refereeBackground.js';
import { drawMatchIntro } from './matchIntroView.js';
import { drawReferee } from './refereeView.js';
import { arenaLife } from './arenaLife.js';
import {isTutorialActive} from './tutorial.js';
import {drawTutorial} from './tutorialView.js';
let canvas;
import { createScenery, drawArenaScene, drawFighterShadow } from "./scenery.js";
import { drawCameraFlashes, drawArenaLighting } from "./arenaLife.js";
import { CHARACTER_LAYOUT, characters, initializeCharacters, drawOpponent, drawPlayer } from "./characters.js";
import { arenaEffects, arenaShakeX, drawArenaImpact, drawDecisiveFlash, drawRushLight } from "./arenaEffects.js";
import { initializeHUD, drawHUD } from "./hud.js";
import { gameState } from "./gameState.js";
import { drawQTE } from "./qteView.js";
import { drawAttackFeedback } from "./attackFeedback.js";
import { drawDefense } from "./defenseView.js";
import { drawMatchResult } from "./matchView.js";
import { isMatchOver } from "./match.js";
import { drawCeremony } from "./ceremony.js";
import { drawCooldown } from "./cooldownView.js";
import { drawCounterRush } from "./counterRushView.js";
import { initializeCounterRushEffects, syncCounterRushEffects, drawCounterRushFlash } from "./counterRushEffects.js";
import { counterRushCinematicFrame, applyCounterRushCamera, drawCounterRushBackgroundShade, drawCounterRushPlayerHighlight, drawCounterRushCinematicOverlay } from "./counterRushCutscene.js";
let context;
let scenery;

export function initializeRenderer(gameCanvas) {
    if (!(gameCanvas instanceof HTMLCanvasElement)) {
        throw new Error("Canvas do jogo não encontrado.");
    }

    const gameContext = gameCanvas.getContext("2d");
    if (!gameContext) {
        throw new Error("Renderização Canvas 2D indisponível.");
    }

    canvas = gameCanvas;
    initializeCounterRushEffects(canvas);
    context = gameContext;
    context.imageSmoothingEnabled = false;
    scenery = createScenery(canvas.width, canvas.height);
    initializeCharacters();
    initializeHUD();
}

export function render() {
    if(isTutorialActive()){drawTutorial(context);return;}
    syncCounterRushEffects();
    if (gameState.phase === "match_intro") { drawMatchIntro(context, gameState, scenery); return; }
    if(gameState.phase===KNOCKOUT_CINEMATIC){drawKnockout(context,gameState,scenery);return;}
    const currentEffects = arenaEffects.matchId === gameState.matchId;
    if (isMatchOver()) {
        drawCeremony(context, gameState, scenery);
        if (currentEffects) drawDecisiveFlash(context);
        drawMatchResult(context, gameState);
        return;
    }
    const cinematic = counterRushCinematicFrame(gameState);
    const shake = currentEffects && !cinematic ? arenaShakeX() : 0;
    context.save();
    if (cinematic) applyCounterRushCamera(context, cinematic);
    if (shake) {
        context.fillStyle = "#101426";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.translate(shake, 0);
    }
    drawArenaScene(context,scenery,currentEffects ? arenaEffects.time : 0,currentEffects ? arenaEffects.crowdTime : 0);
    drawCameraFlashes(context);
    drawArenaLighting(context);
    if (cinematic) drawCounterRushBackgroundShade(context, cinematic);
    if (currentEffects) drawRushLight(context);
    drawFighterShadow(context, CHARACTER_LAYOUT.opponent.x + characters.opponent.torsoX * CHARACTER_LAYOUT.opponent.scale, 272, 46);
    drawFighterShadow(context, CHARACTER_LAYOUT.player.x + characters.player.torsoX * CHARACTER_LAYOUT.player.scale, 358, 92);
    drawOpponent(context);
    drawReferee(context, refereeBackgroundFrame(arenaLife));
    if (cinematic) drawCounterRushPlayerHighlight(context, cinematic);
    drawPlayer(context);
    if (currentEffects && !cinematic) drawArenaImpact(context);
    context.restore();
    // Effects use screen coordinates, but remain below gameplay text and controls.
    if (cinematic) drawCounterRushCinematicOverlay(context, cinematic);
    drawCounterRushFlash(context, canvas.width, canvas.height);

    if (currentEffects) drawContactFlash(context);
    drawHUD(context, gameState);
    drawAttackFeedback(context, gameState);
    drawDefense(context, gameState);
    drawCooldown(context, gameState);
    drawCounterRush(context, gameState);
    drawQTE(context, gameState);
}







