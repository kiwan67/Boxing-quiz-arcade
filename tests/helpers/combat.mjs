export * from '../../js/combat.js';
import * as combat from '../../js/combat.js';
import {finishReading} from './reading.mjs';
import {gameState as s} from '../../js/gameState.js';
export function submitAttackAnswer(...args){const result=combat.submitAttackAnswer(...args);finishReading();return result;}
export function updateCombat(delta){
 const mode=s.playerCombat.state;
 const until=mode==='defense_question_qte'?s.qte.remaining:mode==='defense_direction_qte'?s.defense.remaining+10:
  mode==='qte_failed'?Math.max(0,.9-s.playerCombat.elapsed)+3+10:Infinity;
 combat.updateCombat(delta);
 const defense=s.qte.pendingResult?.kind==='defense';finishReading();
 if(defense&&delta>until)combat.updateCombat(delta-until);
}
