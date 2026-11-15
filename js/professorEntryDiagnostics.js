import {ARENA_WIDTH,REAR_RIGHT_POST,RING_FLOOR_BOUNDARY} from './ringGeometry.js';
import {PROFESSOR_CLIMB_FRAMES} from './professorClimbFrames.js';
import {PROFESSOR_CLIPS} from './professorSprites.js';

// Compare the real footprint with the drawn floor, independently of draw order.
export function professorFootInsideRing(frame){
 const b=RING_FLOOR_BOUNDARY;
 if(frame.floor<b.rearY||frame.floor>b.bottom)return false;
 const depth=Math.min(1,(frame.floor-b.rearY)/(b.frontY-b.rearY));
 const left=b.rearLeft+(b.frontLeft-b.rearLeft)*depth;
 const right=b.rearRight+(b.frontRight-b.rearRight)*depth;
 return frame.x>=left&&frame.x<=right;
}

export function professorRightEntrySpace(height){
 const requiredWidth=Math.max(...PROFESSOR_CLIMB_FRAMES.map(f=>f.bounds.width*height/f.referenceHeight));
 const availableWidth=ARENA_WIDTH-REAR_RIGHT_POST.right;
 return {availableWidth,requiredWidth,fits:requiredWidth<=availableWidth};
}

export function professorEntryDiagnostics(frame){
 const inside=professorFootInsideRing(frame),climbing=frame.stage==='climb';
 const prematureEntry=inside&&['prepare','approach','stop','edge'].includes(frame.stage);
 const clip=PROFESSOR_CLIPS.climbing;
 return {
  entryStep:frame.stage,
  positionZone:inside?'DENTRO':'FORA',
  entryStatus:climbing?'SUBINDO':inside?'DENTRO':'FORA',
  climbFrame:climbing?Math.min(clip.frames.length,Math.floor(Math.max(0,frame.elapsed)/clip.secondsPerFrame)+1):null,
  climbTotalFrames:clip.frames.length,
  prematureEntry,
  orderWarning:prematureEntry?'ENTROU ANTES DA SUBIDA':null,
  ...professorRightEntrySpace(frame.height)
 };
}
