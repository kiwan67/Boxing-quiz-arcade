import { REFEREE_CLIPS, refereeClipDuration } from './refereeGestures.js';
export const REFEREE_EXPRESSIONS=Object.freeze(['NEUTRAL','FOCUSED','SURPRISED','SHOCKED','CONCERNED','DISAPPOINTED','IMPRESSED','HAPPY']);
const expressionClips={NEUTRAL:'referee_idle',FOCUSED:'referee_reaction_light',SURPRISED:'referee_reaction_medium',SHOCKED:'referee_shocked',CONCERNED:'referee_concerned',DISAPPOINTED:'referee_facepalm',IMPRESSED:'referee_clap',HAPPY:'referee_approval'};
export const refereeExpression={matchId:null,expression:'NEUTRAL',clip:'referee_idle',elapsed:0,remaining:0,pendingFinal:false,durationScale:1,priority:0,intensity:0,look:0,preview:null,cooldown:0};
let attack,defense,question,ps,es,chain=0,chainActive=false,rush=false,recognitions=0,misses=0;
export function resetRefereeExpressions(matchId){Object.assign(refereeExpression,{matchId,expression:'NEUTRAL',clip:'referee_idle',elapsed:0,remaining:0,pendingFinal:false,durationScale:1,priority:0,intensity:0,look:0,preview:null,cooldown:0});attack=defense=question=ps=es=null;chain=0;chainActive=rush=false;recognitions=misses=0;}
export function previewRefereeExpression(value){if(value===null){refereeExpression.preview=null;refereeExpression.remaining=0;return;}const clip=REFEREE_CLIPS[value]?value:expressionClips[value];if(clip){refereeExpression.preview=clip;refereeExpression.clip=clip;refereeExpression.elapsed=0;refereeExpression.durationScale=1;}}
function cue(clip,priority,intensity=0,long=false,scale=1){
 const r=refereeExpression;
 if(r.preview||long&&r.cooldown>0)return;
 if(r.remaining>1e-9){
  // Common gestures finish; repeated contacts never restart the same reaction.
  if((r.clip===clip&&!(priority>=10&&r.priority<10))||priority<=r.priority)return;
  if(priority>=9&&r.priority>=9&&r.elapsed<.3){if(priority>=10)r.pendingFinal=true;return;}
 }
 Object.assign(r,{clip,elapsed:0,durationScale:scale,remaining:refereeClipDuration(REFEREE_CLIPS[clip])*scale,priority,intensity});
 if(long)r.cooldown=4;
}
function disappointed(){if(++misses%2===1)cue('referee_facepalm',6,.3,true);}
function hit(type,rushHit=false){cue(rushHit?'referee_shocked':type==='uppercut'||type==='hook'?'referee_reaction_strong':type==='straight'?'referee_reaction_medium':'referee_reaction_light',rushHit?9:type==='uppercut'?8:type==='hook'?5:type==='straight'?4:3,type==='uppercut'?1:type==='hook'?.7:.3);}
export function updateRefereeExpressions(s,dt){
 const r=refereeExpression;if(r.matchId!==s.matchId)resetRefereeExpressions(s.matchId);
 if(['lobby','match_intro','paused','victory','defeat'].includes(s.phase))return;
 r.elapsed+=dt;r.cooldown=Math.max(0,r.cooldown-dt);r.remaining=Math.max(0,r.remaining-dt);
 if(!r.preview&&r.remaining<1e-9){const clip=Math.min(s.playerHealth,s.enemyHealth)<=25?'referee_concerned':'referee_idle';if(r.clip!==clip){r.clip=clip;r.elapsed=0;r.durationScale=1;}r.priority=0;r.intensity=0;}
 if(r.pendingFinal&&r.elapsed>=.3){r.pendingFinal=false;cue('referee_shocked',10,1,false,1.875);}
 const player=s.playerCombat?.state,enemy=s.opponentCombat?.state;
 if(player!==ps&&(/punching_/.test(player)||player==='counter_rush_resolution'))cue('referee_reaction_light',2);
 if(enemy!==es&&enemy==='counter_attacking')cue('referee_reaction_light',2);ps=player;es=enemy;
 const q=s.qte?.lastResult;if(q&&q!==question){question=q;if(q.outcome==='incorrect'||q.outcome==='timeout')disappointed();}
 const a=s.lastAttackResult;if(a?.impactResolved&&a!==attack){attack=a;if(a.outcome==='hit'&&a.damageApplied>0)hit(a.punchType,a.kind==='counter_rush');else if(a.outcome==='missed'||a.outcome==='miss')disappointed();else if(a.outcome==='blocked'||a.outcome==='dodged')cue('referee_reaction_light',2);}
 const d=s.defense?.lastResult;if(d?.impactRegistered&&d!==defense){defense=d;if(d.perfectDefense)cue(++recognitions%2?'referee_clap':'referee_approval',6,.6,true);else if(d.damageApplied>0)hit(s.counterAttack?.type);else if(d.naturalMiss)disappointed();else cue('referee_reaction_light',2);}
 const rushing=s.counterRush?.cutsceneRemaining>0;if(rushing&&!rush)cue('referee_shocked',9,.8);rush=rushing;
 const count=s.counterChain?.count||0;if(count>chain)cue(count>=3?'referee_shocked':count===2?'referee_reaction_strong':'referee_reaction_medium',count>=4?10:9,Math.min(1,count*.25),false,count>=4?1.875:1);
 if(chainActive&&!s.counterChain?.active){if(chain>=4&&s.counterChain?.lastResult==='hit')cue('referee_clap',7,1,true);else if(s.counterChain?.endReason)disappointed();}chain=count;chainActive=Boolean(s.counterChain?.active);
}
export function refereeGestureFrame(){const r=refereeExpression;return {clip:r.preview||r.clip,elapsed:r.elapsed/(r.durationScale||1)};}
// Compatibility export; face geometry has been removed entirely.
export function drawRefereeFace(){}




