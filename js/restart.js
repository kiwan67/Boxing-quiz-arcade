import { resetRefereeExpressions } from './refereeExpressions.js';
import { resetWear } from './fighterWear.js';
import { resetMatch } from "./match.js";
import { resetCharacters } from "./characters.js";
import { resetHUDVisuals } from "./hud.js";
import { updatePunchControls } from "./punchControls.js";
import { updateDebugPanel } from "./debugPanel.js";
import { cancelMatchIntro } from "./matchIntro.js";
import { resetArenaLife } from "./arenaLife.js";
import { gameState } from "./gameState.js";

export function restartFight() {
    resetMatch();
    cancelMatchIntro();
    resetArenaLife(gameState.matchId);
    resetRefereeExpressions(gameState.matchId);
    resetWear(gameState.matchId);
    resetCharacters();
    resetHUDVisuals(gameState);
    updatePunchControls();
    updateDebugPanel();
}



