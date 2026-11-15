// Isolated proposal. No game module imports this file.
import {ARENA_WIDTH,REAR_RIGHT_POST,REAR_ROPES,RING_FLOOR_BOUNDARY} from '../../js/ringGeometry.js';
import {PROFESSOR_POSITIONS,PROFESSOR_ENTRY_TIMING,PROFESSOR_ENTRY_DURATION} from '../../js/professorAnimation.js';
import {PROFESSOR_CLIMB_FRAMES,PROFESSOR_CLIMB_STEP_RATIO} from '../../js/professorClimbFrames.js';
const height=PROFESSOR_POSITIONS.outside.height;
const radius=Math.ceil(Math.max(...PROFESSOR_CLIMB_FRAMES.map(f=>Math.max(f.anchorX-f.bounds.x,f.bounds.x+f.bounds.width-f.anchorX)*height/f.referenceHeight)));
const gap=2;
// The full character clears the rear post vertically before entering sideways.
const upperFloor=REAR_RIGHT_POST.bottom+height+gap;
const lowerFloor=upperFloor+height*PROFESSOR_CLIMB_STEP_RATIO;
const side=RING_FLOOR_BOUNDARY.frontRight;
const externalX=side+radius+gap;
const last=PROFESSOR_CLIMB_FRAMES.at(-1);
const landingX=side-(last.anchorX-last.bounds.x)*height/last.referenceHeight-gap;
const waypointX=REAR_RIGHT_POST.left-Math.ceil(130*PROFESSOR_POSITIONS.inside.height/600)-gap;
export const PROPOSAL_GEOMETRY=Object.freeze({width:externalX+radius+gap,height:Math.max(360,Math.ceil(lowerFloor+gap)),externalX,upperFloor,lowerFloor,landingX,ropeBottom:Math.max(...REAR_ROPES.map(r=>r.bottom)),originalWidth:ARENA_WIDTH});
const mix=(a,b,t)=>a+(b-a)*Math.max(0,Math.min(1,t));
const climbStart=PROFESSOR_ENTRY_TIMING.prepare+PROFESSOR_ENTRY_TIMING.approach+PROFESSOR_ENTRY_TIMING.stop+PROFESSOR_ENTRY_TIMING.edge;
// Measured leading shoe centers in the unchanged source PNGs, frames 4-7.
const shoeX=[null,null,null,790,790,800,650,null];
export function proposalFrame(original,time){
 let f={...original};
 if(time===null||time<PROFESSOR_ENTRY_TIMING.prepare){
  return {...f,x:externalX,floor:PROFESSOR_POSITIONS.outside.floor,positionZone:'FORA'};
 }
 if(time<climbStart){
  const p=(time-PROFESSOR_ENTRY_TIMING.prepare)/PROFESSOR_ENTRY_TIMING.approach;
  return {...f,x:externalX,floor:mix(PROFESSOR_POSITIONS.outside.floor,lowerFloor,p),
   ...(f.stage==='edge'?{clip:'preparing',elapsed:PROFESSOR_ENTRY_TIMING.prepare}:{}),positionZone:'FORA'};
 }
 if(time<climbStart+PROFESSOR_ENTRY_TIMING.climb){
  const i=Math.min(7,Math.floor((time-climbStart)/(PROFESSOR_ENTRY_TIMING.climb/8))),crop=PROFESSOR_CLIMB_FRAMES[i];
  const x=i<3?externalX:i===7?landingX:side+(shoeX[i]-crop.anchorX)*height/crop.referenceHeight;
  return {...f,x,floor:i<4?lowerFloor:upperFloor,facing:-1,layer:i===7?'INSIDE':i<3?'OUTSIDE':'ENTERING',
   behindRopes:i<3,positionZone:i===7?'DENTRO':i<3?'FORA':'SUBINDO'};
 }
 const t=time-climbStart-PROFESSOR_ENTRY_TIMING.climb;
 if(t<PROFESSOR_ENTRY_TIMING.settle){
  const p=t/PROFESSOR_ENTRY_TIMING.settle;
  const x=p<.5?mix(landingX,waypointX,p*2):mix(waypointX,PROFESSOR_POSITIONS.inside.x,(p-.5)*2);
  return {...f,x,floor:p<.5?upperFloor:mix(upperFloor,PROFESSOR_POSITIONS.inside.floor,(p-.5)*2),
   height:p<.5?height:mix(height,PROFESSOR_POSITIONS.inside.height,(p-.5)*2),positionZone:'DENTRO'};
 }
 return {...f,positionZone:'DENTRO'};
}
export {climbStart,PROFESSOR_ENTRY_DURATION};
