import {gameState} from '../../js/gameState.js';
import {updateCombat} from '../../js/combat.js';
// Existing combat regressions isolate mechanics after the new reading window.
// Reading timing itself is exercised using production APIs in qteReading.test.mjs.
export function finishReading(){
 if(gameState.qte.pendingResult)updateCombat(gameState.qte.feedbackRemaining);
}
