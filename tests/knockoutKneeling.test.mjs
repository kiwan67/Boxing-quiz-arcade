import test from 'node:test';import assert from 'node:assert/strict';
import {knockoutFrameOrigin} from '../js/knockoutSprites.js';
import {createInitialGameState,gameState} from '../js/gameState.js';
import {prepareKnockoutDebug} from '../js/knockoutDebug.js';
import {readDebugSnapshot,setDebugEnabled} from '../js/debug.js';
import {KO_DURATION,KO_TIMING,knockout,updateKnockout,startKnockout,resetKnockout,knockoutFrame} from '../js/knockout.js';
test('recortes de larguras diferentes mantêm o mesmo eixo do corpo',()=>{
 const axis=140,baseline=620;
 for(const bounds of [{left:20,top:40,width:240},{left:60,top:180,width:170},{left:15,top:250,width:260}]){
  const origin=knockoutFrameOrigin(bounds,axis,baseline);
  assert.equal(origin.x+(axis-bounds.left),0);assert.equal(origin.y+baseline-bounds.top,0);
 }
});
test('fixture de derrota contém os campos numéricos necessários ao F3',()=>{
 const before=gameState.defense.lastResult;setDebugEnabled(true);
 prepareKnockoutDebug(gameState,'player','special');
 assert.equal(gameState.defense.lastResult.damageMultiplier,1);assert.doesNotThrow(()=>readDebugSnapshot());
 assert.equal(gameState.counterAttack.type,'uppercut');assert.equal(gameState.counterAttack.source,'counter_chain');
 gameState.defense.lastResult=before;setDebugEnabled(false);
});
test('joelhos são intermediários; queda termina no chão após pausa e transição',()=>{
 for(const fps of [30,60]){
  const s=createInitialGameState(fps);resetKnockout();startKnockout(s,Object.freeze({outcome:'defeat',loser:'player',winner:'bot'}));
  let n=0;const frames=new Set();while(s.phase==='knockout_cinematic'){
   const frame=knockoutFrame();frames.add(frame.frame);if(frame.scene==='ground'||frame.scene==='transition')assert.ok([9,10].includes(frame.frame));
   updateKnockout(s,1/fps);n++;
  }
  assert.equal(s.phase,'defeat');assert.ok(frames.has(5)&&frames.has(7)&&frames.has(8)&&frames.has(9));assert.ok(Math.abs(n/fps-KO_DURATION)<1/fps+1e-8);
  const expected=KO_TIMING.impact*.32+KO_TIMING.stagger*.55+KO_TIMING.fall*.45*.75+(n/fps-KO_TIMING.impact-KO_TIMING.stagger-KO_TIMING.fall*.45);
  assert.ok(Math.abs(knockout.animationTime-expected)<1e-8);
 }
});
test('impacto abandona a guarda nos primeiros 100 ms em 30 e 60 FPS',()=>{
 for(const fps of [30,60]){
  const s=createInitialGameState(fps);resetKnockout();
  startKnockout(s,{outcome:'defeat',loser:'player',winner:'bot'});
  assert.equal(knockoutFrame().frame,0);
  for(let n=0;n<fps/10;n++)updateKnockout(s,1/fps);
  assert.equal(knockoutFrame().scene,'impact');
  assert.equal(knockoutFrame().frame,1);
 }
});
