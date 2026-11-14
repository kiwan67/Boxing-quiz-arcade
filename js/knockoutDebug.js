// Complete debug fixtures. "special" is an Uppercut with simulated Rush/Chain metadata.
export function prepareKnockoutDebug(state,target,chosen){
 if(!['player','enemy'].includes(target)||!['jab','straight','hook','uppercut','special'].includes(chosen))return false;
 const special=chosen==='special',type=special?'uppercut':chosen;
 if(target==='enemy')state.lastAttackResult={outcome:'hit',impactResolved:true,punchType:type,arm:'left',kind:special?'counter_rush':'attack',damageApplied:100};
 else{
  Object.assign(state.counterAttack,{type,side:'left',source:special?'counter_chain':'spontaneous'});
  state.defense.lastResult={impactRegistered:true,damageApplied:100,damage:100,damageMultiplier:1,attackAccuracy:1,naturalMiss:false,perfectDefense:false,expectedSide:'left',selectedSide:null,defenseSideCorrect:false,questionCorrect:false,correctAnswer:null,selectedAnswer:null,counterRushActivated:false,counterArm:'left'};
 }
 return true;
}
