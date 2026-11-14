import test from 'node:test';
import assert from 'node:assert/strict';
import {gameState as s} from '../js/gameState.js';
import {resetMatch,applyImpactDamage} from '../js/match.js';
import {KO_TIMING,KO_DURATION,knockout,knockoutFrame,updateKnockout,seekKnockoutPreview,startKnockout} from '../js/knockout.js';
import {ceremonyFrame,updateCeremony,defeatResultPose,previewDefeatExpression} from '../js/ceremony.js';
import {drawMatchResult} from '../js/matchView.js';
import {wear,updateWear} from '../js/fighterWear.js';

for(const fps of [30,60])for(const target of ['player','enemy'])test(`queda completa ${target}, ${fps} FPS: bloqueia resultado até chão + pausa + fade`,()=>{
 resetMatch();applyImpactDamage(target,100,'complete');updateWear(s,0);
 const result=s.matchResult,damage=JSON.stringify(wear),scenes=new Set();let ground=0;
 assert.equal(startKnockout(s,result),false);
 for(let n=0;n<Math.ceil(KO_DURATION*fps);n++){
  if(s.phase!=='knockout_cinematic')break;
  const frame=knockoutFrame();scenes.add(frame.scene);
  assert.equal(ceremonyFrame(s),null);
  assert.doesNotThrow(()=>drawMatchResult({},s));
  updateCeremony(s,10); // Direct accidental calls may not advance ceremony either.
  if(frame.scene==='ground'){
   ground++;assert.ok([9,10].includes(frame.frame));assert.equal(frame.fade,0);
   assert.ok(Math.abs(frame.panY)<1e-8&&Math.abs(frame.zoom-1)<1e-8);
  }
  assert.equal(applyImpactDamage(target,100,'extra'),0);
  updateKnockout(s,1/fps);
 }
 assert.deepEqual([...scenes],['impact','stagger','fall','collapse','ground','transition']);
 assert.ok(Math.abs(ground/fps-KO_TIMING.ground)<=1/fps);
 assert.equal(s.phase,target==='player'?'defeat':'victory');
 assert.equal(s.matchResult,result);assert.equal(ceremonyFrame(s).time,0);
 assert.equal(JSON.stringify(wear),damage);
 assert.equal(defeatResultPose(s).perspective,'front');
 assert.equal(defeatResultPose(s).role,result.loser);
 assert.match(defeatResultPose(s,8).asset,/_sad_idle/);
});

test('F3 usa os mesmos marcos de queda e não reinicia a cinematográfica',()=>{
 for(const [stage,scene]of [['knees','fall'],['collapse','collapse'],['ground','ground'],['transition','transition']]){
  resetMatch();applyImpactDamage('enemy',100,'preview');
  assert.equal(seekKnockoutPreview(s,stage),true);assert.equal(knockoutFrame().scene,scene);
  const elapsed=knockout.elapsed;assert.equal(startKnockout(s,s.matchResult),false);assert.equal(knockout.elapsed,elapsed);
  updateKnockout(s,KO_DURATION);assert.equal(s.phase,'victory');
 }
});

test('expressões frontais pertencem só ao derrotado; reinício remove preview',()=>{
 for(const target of ['player','enemy']){
  resetMatch();applyImpactDamage(target,100,'face');updateKnockout(s,KO_DURATION);
  for(const expression of ['sad','frustrated','exhausted']){
   assert.equal(previewDefeatExpression(s,expression),true);
   const pose=defeatResultPose(s,9);assert.equal(pose.pose,expression);
   assert.equal(pose.role,target==='player'?'player':'bot');assert.notEqual(pose.role,s.matchResult.winner);
   assert.equal(pose.perspective,'front');
  }
  resetMatch();assert.equal(defeatResultPose(s),null);
  applyImpactDamage(target,100,'new-face');updateKnockout(s,KO_DURATION);
  assert.match(defeatResultPose(s,9).pose,/sad_idle/);
 }
});
