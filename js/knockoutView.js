import {drawKnockoutPose} from './knockoutSprites.js';
export {preloadKnockoutSprites} from './knockoutSprites.js';
import {knockout,knockoutFrame,KO_TIMING} from './knockout.js';
import {drawFighterSprite} from './fighterSprites.js';

import {drawArenaScene,drawFighterShadow} from './scenery.js';
import {drawCameraFlashes,drawArenaLighting} from './arenaLife.js';
import {drawRefereeReaction} from './refereeGestures.js';
import {drawReferee} from './refereeView.js';
import {REFEREE_MARK,REFEREE_BACKGROUND} from './refereeBackground.js';
import {drawArenaImpact,drawContactFlash,arenaShakeX} from './arenaEffects.js';
import {drawHUD,drawPixelText} from './hud.js';

function drawActor(ctx,role,defeated,frame){
 const floor=role==='player'?(defeated?340:444):276,fullHeight=role==='player'?(defeated?220:254):180;
 const direction=knockout.result.impactDirection||1;
 if(defeated){
  drawFighterShadow(ctx,320,floor,role==='player'?48:36);
  if(drawKnockoutPose(ctx,role,frame.frame,{x:320,floor,standingHeight:fullHeight,direction}))return;
 }
 const result=knockout.result;const extension=frame.scene==='impact'?Math.max(.56,1-knockout.animationTime*.5):0;
 const pose={animationState:defeated?'hit':role==='player'?`punch_${result.arm}`:'counter_left',punchType:result.punchType,torsoX:0,breathOffset:0,recoilY:0,leftPunchExtension:extension,rightPunchExtension:extension,counterExtension:extension,counterSide:result.arm};
 if(role==='player'){
  ctx.save();ctx.translate(320,floor);ctx.scale(fullHeight/254,fullHeight/254);ctx.translate(-320,-444);
  // Clear the foreground during the opponent's fall, so his prone silhouette
  // remains visible. The loser and camera anchor never move horizontally.
  const focus=result.loser==='bot'?Math.max(0,Math.min(1,1-(frame.elapsed-KO_TIMING.impact-KO_TIMING.stagger)/KO_TIMING.fall)):1;
  drawFighterSprite(ctx,role,pose,{x:320,y:190,scale:3,alpha:.65*focus});ctx.restore();
 }else drawFighterSprite(ctx,role,pose,{x:320,y:92,scale:2,alpha:1});
}
export function drawKnockout(ctx,state,scenery){
 const frame=knockoutFrame(),result=knockout.result;if(!result)return;
 ctx.save();ctx.imageSmoothingEnabled=false;
 const shake=frame.scene==='impact'?arenaShakeX():0;
 ctx.translate(320+shake,210+frame.panY);ctx.scale(frame.zoom,frame.zoom);ctx.translate(-320,-210);
 drawArenaScene(ctx,scenery,knockout.elapsed,1);drawCameraFlashes(ctx);drawArenaLighting(ctx,.65);
 drawActor(ctx,'bot',result.loser==='bot',frame);
 drawFighterShadow(ctx,REFEREE_MARK.x,REFEREE_MARK.floor,20);
 if(!drawRefereeReaction(ctx,{clip:frame.scene==='impact'||frame.scene==='stagger'?'referee_shocked':'referee_concerned',elapsed:frame.elapsed},REFEREE_MARK.x,REFEREE_MARK.floor,REFEREE_MARK.height))drawReferee(ctx,{...REFEREE_MARK,state:REFEREE_BACKGROUND});
 drawActor(ctx,'player',result.loser==='player',frame);
 if(frame.scene==='impact'){drawArenaImpact(ctx);drawContactFlash(ctx);}
 ctx.restore();drawHUD(ctx,state);
 if(frame.scene==='ground'){drawPixelText(ctx,'K.O.',320,74,4,'#ffe8a1','center');}
 if(frame.fade>0){ctx.save();ctx.globalAlpha=frame.fade;ctx.fillStyle='#080f20';ctx.fillRect(0,0,640,360);ctx.restore();}
}






