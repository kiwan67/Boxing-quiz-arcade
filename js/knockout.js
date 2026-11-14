export const KNOCKOUT_CINEMATIC='knockout_cinematic';
export const KO_TIMING={impact:.75,stagger:.7,fall:1.05,collapse:.9,ground:1,transition:.4,impactSpeed:.32,staggerSpeed:.55,fallStartSpeed:.75};
export const KO_DURATION=KO_TIMING.impact+KO_TIMING.stagger+KO_TIMING.fall+KO_TIMING.collapse+KO_TIMING.ground+KO_TIMING.transition;
export const knockout={matchId:null,result:null,elapsed:0,animationTime:0};
export function resetKnockout(){Object.assign(knockout,{matchId:null,result:null,elapsed:0,animationTime:0});}
export function startKnockout(state,result){if(knockout.matchId===state.matchId&&knockout.result)return false;Object.assign(knockout,{matchId:state.matchId,result,elapsed:0,animationTime:0});state.phase=KNOCKOUT_CINEMATIC;return true;}
export function knockoutFrame(){const t=knockout.elapsed,c=KO_TIMING;const stagger=c.impact,fall=stagger+c.stagger,collapse=fall+c.fall,ground=collapse+c.collapse,transition=ground+c.ground,total=transition+c.transition;
 const scene=t<stagger?'impact':t<fall?'stagger':t<collapse?'fall':t<ground?'collapse':t<transition?'ground':'transition';
 const visualStagger=Math.max(0,knockout.animationTime-c.impact*c.impactSpeed);
 const visualFall=Math.max(0,visualStagger-c.stagger*c.staggerSpeed);
 // The first cell is the contact silhouette, not a slow-motion guard hold.
 // Compare against the visual duration of this segment (already slowed).
 const frame=scene==='impact'?(knockout.animationTime<c.impact*c.impactSpeed*.12?0:1)
  :scene==='stagger'?(visualStagger<c.stagger*.28?1:2)
  :scene==='fall'?(visualFall<c.fall*.33?3:visualFall<c.fall*.62?4:5)
  :scene==='collapse'?7+Math.min(2,Math.floor((t-collapse)/c.collapse*3))
  :9+(Math.floor(Math.max(0,t-ground)/.8)%2);
 return {scene,frame,total,fade:Math.max(0,Math.min(1,(t-transition)/c.transition)),panY:-3*Math.sin(Math.min(1,Math.max(0,(t-c.impact)/(c.stagger+c.fall)))*Math.PI),zoom:1+.025*Math.sin(Math.min(1,t/(c.impact+c.stagger))*Math.PI),elapsed:t};
}
// F3 previews use the same timeline and end condition as a real lethal blow.
export function seekKnockoutPreview(state,stage){
 const c=KO_TIMING,starts={knees:c.impact+c.stagger+c.fall*.95,collapse:c.impact+c.stagger+c.fall,ground:c.impact+c.stagger+c.fall+c.collapse,transition:c.impact+c.stagger+c.fall+c.collapse+c.ground};
 if(!(stage in starts)||state.phase!==KNOCKOUT_CINEMATIC)return false;
 const target=starts[stage];if(target<knockout.elapsed)return false;
 updateKnockout(state,target-knockout.elapsed);
 knockout.elapsed=target;return true;
}
export function updateKnockout(state,realDelta){
 if(state.phase!==KNOCKOUT_CINEMATIC||knockout.matchId!==state.matchId||!knockout.result)return false;
 let remaining=Number.isFinite(realDelta)?Math.max(0,realDelta):0;
 // Integrate visual slow motion exactly across boundaries, independent of FPS.
 const c=KO_TIMING,segments=[[c.impact,c.impactSpeed],[c.impact+c.stagger,c.staggerSpeed],[c.impact+c.stagger+c.fall*.45,c.fallStartSpeed],[Infinity,1]];
 for(const [end,speed]of segments){
  if(remaining<=0)break;if(knockout.elapsed>=end-1e-9)continue;
  const step=Math.min(remaining,end-knockout.elapsed);
  knockout.animationTime+=step*speed;knockout.elapsed+=step;remaining-=step;
 }
 if(knockout.elapsed+1e-9>=knockoutFrame().total){state.phase=knockout.result.outcome;return true;}return false;
}
