// Presentation only: the existing easter egg owns activation and the streak.
import {FIGHTER_SPRITE_BOUNDS} from './fighterSprites.js';
import {REAR_RIGHT_POST,REAR_RING_FLOOR,RING_FLOOR_BOUNDARY} from './ringGeometry.js';
import {PROFESSOR_CLIPS,professorSpriteFrame} from './professorSprites.js';
import {PROFESSOR_CLIMB_FRAMES,PROFESSOR_CLIMB_STEP_RATIO} from './professorClimbFrames.js';
const bot=FIGHTER_SPRITE_BOUNDS.bot;
const rearHeight=floor=>bot.height*floor/(bot.top+bot.height);
const outsideHeight=rearHeight(REAR_RING_FLOOR-2);
// Keep the former stop as the reference for the requested extra 1.5 body widths.
// Measure opaque bounds, not the full PNG rectangle and transparent margins.
const climbExtent=Math.max(...PROFESSOR_CLIMB_FRAMES.map(f=>Math.max(f.anchorX-f.bounds.x,f.bounds.x+f.bounds.width-f.anchorX)/f.referenceHeight));
const previousSideX=REAR_RIGHT_POST.left-Math.ceil(outsideHeight*Math.max(climbExtent,182/560))-2;
const visualWidth=Math.max(...PROFESSOR_CLIMB_FRAMES.map(f=>f.bounds.width*outsideHeight/f.referenceHeight));
const extraX=1.5*visualWidth,sideX=previousSideX+extraX;
const outsideX=494,outsideFloor=REAR_RING_FLOOR-2;
const previousWalkSpeed=(previousSideX-outsideX)/1.5;
const walkSpeedMultiplier=1.75;
const walkSpeed=previousWalkSpeed*walkSpeedMultiplier;
const previousLowerFloor=REAR_RING_FLOOR+outsideHeight*PROFESSOR_CLIMB_STEP_RATIO;
const edgeSpeed=(previousLowerFloor-outsideFloor)/.7;
// Record the last active trajectory for diagnostics. Its floor incorrectly
// included the whole character height; drawProfessor already anchors the feet.
const previousUpperFloor=REAR_RING_FLOOR+outsideHeight+2;
const previousEdgeFloor=previousUpperFloor+outsideHeight*PROFESSOR_CLIMB_STEP_RATIO;
// Step onto the actual side immediately below the existing post footplate.
const upperFloor=REAR_RIGHT_POST.bottom+2;
const lowerFloor=upperFloor+outsideHeight*PROFESSOR_CLIMB_STEP_RATIO;
const sideDepth=Math.max(0,Math.min(1,(upperFloor-RING_FLOOR_BOUNDARY.rearY)/(RING_FLOOR_BOUNDARY.frontY-RING_FLOOR_BOUNDARY.rearY)));
const sideBoundary=RING_FLOOR_BOUNDARY.rearRight+(RING_FLOOR_BOUNDARY.frontRight-RING_FLOOR_BOUNDARY.rearRight)*sideDepth;
// Preserve the vertical stage duration; only its destination changes.
const originalEdgeFloor=REAR_RIGHT_POST.bottom+outsideHeight+2+outsideHeight*PROFESSOR_CLIMB_STEP_RATIO;
const lastClimb=PROFESSOR_CLIMB_FRAMES.at(-1);
// Also leave room for the widest approved forward-walk stride (130 / 600).
const landingRadius=Math.max((lastClimb.anchorX-lastClimb.bounds.x)*outsideHeight/lastClimb.referenceHeight,130*outsideHeight/600);
const landingX=sideBoundary-landingRadius-2;
const insideWaypointX=REAR_RIGHT_POST.left-Math.ceil(130*bot.height*.95/600)-2;
export const PROFESSOR_WALK_ADJUSTMENT=Object.freeze({visualWidth,extraX,previousStopX:previousSideX,stopX:sideX,previousWalkSpeed,walkSpeedMultiplier,walkSpeed});
export const PROFESSOR_ENTRY_HEIGHT_ADJUSTMENT=Object.freeze({previousLowestY:previousEdgeFloor,lowestY:lowerFloor,reduction:previousEdgeFloor-lowerFloor});
export const PROFESSOR_POSITIONS=Object.freeze({
 outside:Object.freeze({x:outsideX,floor:outsideFloor,height:outsideHeight}),
 corner:Object.freeze({x:sideX,floor:REAR_RING_FLOOR-2,height:outsideHeight}),
 edge:Object.freeze({x:sideX,floor:lowerFloor,height:outsideHeight}),
 landing:Object.freeze({x:landingX,floor:upperFloor,height:outsideHeight}),
 inside:Object.freeze({x:470,floor:266,height:bot.height*.95})
});
export const PROFESSOR_ENTRY_TIMING=Object.freeze({prepare:.6,approach:(sideX-outsideX)/walkSpeed,edge:(originalEdgeFloor-outsideFloor)/edgeSpeed,stop:.2,climb:PROFESSOR_CLIPS.climbing.secondsPerFrame*PROFESSOR_CLIMB_FRAMES.length,settle:1,recover:.32});
export const PROFESSOR_ENTRY_DURATION=Object.values(PROFESSOR_ENTRY_TIMING).reduce((a,b)=>a+b,0);
const animations=new WeakMap();
export function createProfessorAnimation(mode='outside'){
 return {elapsed:0,entryElapsed:mode==='outside'?null:mode==='inside'?
  PROFESSOR_ENTRY_DURATION:0};
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function between(from,to,t){
 const p=smooth(t);
 return {x:from.x+(to.x-from.x)*p,floor:from.floor+(to.floor-from.floor)*p,height:from.height+(to.height-from.height)*p};
}
function animation(state){
 const egg=state.professorEasterEgg;
 if(!egg?.professorPresent||egg.blocked||egg.ended||state.matchResult){
  if(egg)animations.delete(egg);return null;
 }
 let current=animations.get(egg);
 if(!current){current=createProfessorAnimation();animations.set(egg,current);}
 if(egg.professorInRing&&current.entryElapsed===null)current.entryElapsed=0;
 return current;
}
export function canAdvanceProfessorAnimation(state,delta){
 return state.phase==='idle'&&!state.qte.pendingResult&&Number.isFinite(delta)&&delta>=0
  &&!['counter_rush_cutscene','counter_rush_flash'].includes(state.playerCombat.state);
}
export function advanceProfessorAnimation(current,delta){
 if(!current)return;
 current.elapsed+=delta;
 if(current.entryElapsed!==null)current.entryElapsed=Math.min(
  PROFESSOR_ENTRY_DURATION,current.entryElapsed+delta);
}
export function updateProfessorAnimation(state,delta){
 if(canAdvanceProfessorAnimation(state,delta))advanceProfessorAnimation(animation(state),delta);
}
export function professorAnimationFrame(state){
 return professorPresentationFrame(animation(state));
}
export function professorPresentationFrame(current){
 if(!current)return null;
 const {outside,corner,edge,landing,inside}=PROFESSOR_POSITIONS;
 const {prepare,approach,stop,edge:edgeTime,climb,settle,recover}=PROFESSOR_ENTRY_TIMING;
 let t=current.entryElapsed;
 if(t===null)return {...outside,layer:'OUTSIDE',behindRopes:true,stage:'observing',clip:'observing',elapsed:current.elapsed};
 if(t>=PROFESSOR_ENTRY_DURATION-1e-9)
  return {...inside,layer:'INSIDE',behindRopes:false,stage:'observing',clip:'observing',elapsed:current.elapsed};
 if(t<prepare)return {...outside,layer:'OUTSIDE',behindRopes:true,stage:'prepare',clip:'preparing',elapsed:t};
 t-=prepare;
 // Movement and sprite cadence are independent. The clip owns its 6 fps clock;
 // only the position/duration use walkSpeed. The shared clock is never scaled.
 if(t<approach){const p=t/approach;return {...outside,x:outside.x+(corner.x-outside.x)*p,layer:'OUTSIDE',behindRopes:true,stage:'approach',clip:'walkingSide',elapsed:t};}
 t-=approach;
 if(t<edgeTime)return {...between(corner,edge,t/edgeTime),layer:'OUTSIDE',behindRopes:true,stage:'edge',clip:'walkingFront',elapsed:t};
 t-=edgeTime;
 if(t<stop)return {...edge,layer:'OUTSIDE',behindRopes:true,stage:'stop',clip:'preparing',elapsed:prepare,facing:-1};
 t-=stop;
 if(t<climb){
  const pose=professorSpriteFrame('climbing',t);
  const i=PROFESSOR_CLIMB_FRAMES.indexOf(pose);
  // Existing leading shoe centers: place the raised foot on the side edge.
  // Frames 1-3 remain at the new stop; frame 8 completes entry fully inside.
  const shoeX=[null,null,null,790,790,800,650,null];
  const x=i<3?edge.x:i===7?landing.x:sideBoundary+(shoeX[i]-pose.anchorX)*outsideHeight/pose.referenceHeight;
  return {...(pose.upperSupport?landing:edge),x,layer:i===7?'INSIDE':i<3?'OUTSIDE':'ENTERING',behindRopes:i!==7,
   stage:'climb',clip:'climbing',elapsed:t,facing:-1};
 }
 t-=climb;
 if(t<settle){
  const waypoint={...landing,x:insideWaypointX},p=t/settle;
  // Clear the post along the side first, then walk to the unchanged final spot.
  return {...(p<.5?between(landing,waypoint,p*2):between(waypoint,inside,(p-.5)*2)),
   layer:'INSIDE',behindRopes:false,stage:'settle',clip:'walkingFront',elapsed:t};
 }
 t-=settle;
 if(t<recover)return {...inside,layer:'INSIDE',behindRopes:false,stage:'recover',clip:'returning',elapsed:t};
 return {...inside,layer:'INSIDE',behindRopes:false,stage:'observing',clip:'observing',elapsed:current.elapsed};
}
