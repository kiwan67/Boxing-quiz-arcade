export * from '../../js/main.js';
import * as main from '../../js/main.js';
import {gameState} from '../../js/gameState.js';
export function update(...args){main.update(...args);if(gameState.qte.pendingResult)main.update(gameState.qte.feedbackRemaining);}
