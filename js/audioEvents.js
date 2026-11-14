import { audioManager } from './audioManager.js';
let match, phase, question, result, attack, defense, playerAction, enemyAction, chain=0, rushing=false, wasChain=false, reaction=0;
const punchName=type=>type==='straight'?'direct':type;
export function resetAudioEvents(){match=undefined;phase=undefined;question=result=attack=defense=null;playerAction=enemyAction=null;chain=0;rushing=false;wasChain=false;reaction=0;}
export function updateAudioEvents(s,life,manager=audioManager){
 if(s.matchId!==match){resetAudioEvents();match=s.matchId;}
 if(s.phase==='paused'){manager.pause();return;} manager.resume();
 const scene=s.phase==='lobby'?'menu':s.phase==='victory'?'victory':s.phase==='defeat'?'defeat':s.phase==='match_intro'?'intro':'fight';
 if(scene!==phase){
  manager.stopAll();
  if(scene!=='intro')manager.playMusic(scene==='menu'?'menu_theme':scene+'_theme');
  if(scene==='fight'){manager.play('fight_start');manager.play('crowd_ambient');}
  if(scene==='victory'||scene==='defeat')manager.play(scene);
  phase=scene;
 } else if(scene!=='intro') manager.playMusic(scene==='menu'?'menu_theme':scene+'_theme');
 if(scene==='fight')manager.play('crowd_ambient');
 if(scene==='menu'||scene==='intro')return;
 const q=s.qte?.question;if(q&&q.id!==question){question=q.id;manager.play('qte_appear');}
 const qr=s.qte?.lastResult;if(qr&&qr!==result){result=qr;manager.play(qr.outcome==='correct'?'qte_correct':qr.outcome==='timeout'?'qte_timeout':'qte_wrong');}
 const ps=s.playerCombat?.state;
 if(ps!==playerAction&&(/punching_/.test(ps)||ps==='counter_rush_resolution'))manager.play(punchName(s.playerCombat.punchType)+'_swing');
 playerAction=ps;
 const es=s.opponentCombat?.state;
 if(es==='counter_attacking'&&es!==enemyAction)manager.play(punchName(s.counterAttack?.type)+'_swing');enemyAction=es;
 const a=s.lastAttackResult;
 if(a?.impactResolved&&a!==attack){attack=a;
  if(a.outcome==='hit'&&a.damageApplied>0){manager.play(punchName(a.punchType)+'_hit');if(a.kind==='counter_rush')manager.play('counter_rush_hit');}
  else if(a.outcome==='blocked')manager.play('block');else if(a.outcome==='dodged')manager.play('dodge');
 }
 const d=s.defense?.lastResult;
 if(d?.impactRegistered&&d!==defense){defense=d;
  if(d.perfectDefense)manager.play('perfect_defense');
  else if(d.damageApplied>0)manager.play(punchName(s.counterAttack?.type)+'_hit');
  else manager.play(d.naturalMiss||d.defenseSideCorrect?'dodge':'block');
 }
 const rush=(s.counterRush?.cutsceneRemaining||0)>0;
 if(rush&&!rushing)manager.play('counter_rush_start');rushing=rush;
 const count=s.counterChain?.count||0;
 if(count>chain)manager.play('counter_chain_'+Math.min(4,count));
 if(wasChain&&!s.counterChain?.active)manager.play('counter_chain_finish');chain=count;wasChain=Boolean(s.counterChain?.active);
 if(life&&life.reaction.id!==reaction){reaction=life.reaction.id;
  const kind=life.reaction.kind;
  manager.play(kind==='winner'?'crowd_victory':kind==='rush'||kind==='rush-hit'?'crowd_counter_rush':kind==='chain'?'crowd_cheer':life.reaction.strength>=.75?'crowd_big_hit':'crowd_clap');
 }
}


