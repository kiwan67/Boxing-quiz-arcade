import test from 'node:test';
import assert from 'node:assert/strict';
import {gameState as s} from '../js/gameState.js';
import {resetMatch,applyImpactDamage,resolvePlayerImpact,checkMatchEnd} from '../js/match.js';
import {registerDefenseImpact} from '../js/defense.js';
import {drawHealthBar} from '../js/hud.js';
import {activeDifficulty} from '../js/difficulty.js';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
for(const [difficulty,hp,dealt,taken] of [['easy',100,18,22],['normal',100,20,20],['hard',150,22,15]]){
 test(`${difficulty}: maximum HP, outgoing/incoming damage and restart without stacking`,()=>{
  s.difficulty=difficulty;resetMatch();const matchId=s.matchId;
  assert.equal(s.playerHealth,100);assert.equal(s.enemyMaxHealth,hp);assert.equal(s.enemyHealth,hp);
  close(applyImpactDamage('player',20,'bot'),dealt);close(applyImpactDamage('enemy',20,'player'),taken);
  const health=[s.playerHealth,s.enemyHealth];
  assert.equal(applyImpactDamage('player',20,'bot'),0);assert.equal(applyImpactDamage('enemy',20,'player'),0);
  assert.deepEqual([s.playerHealth,s.enemyHealth],health);
  assert.equal(applyImpactDamage('enemy',20,'old',matchId-1),0);
  resetMatch();assert.equal(s.difficulty,difficulty);assert.equal(s.enemyHealth,hp);assert.equal(s.enemyMaxHealth,hp);
  close(applyImpactDamage('enemy',20,'player'),taken);
  const profile=activeDifficulty();assert.equal(s.botBalance.damageTakenMultiplier,profile.damageTakenMultiplier);
 });
 test(`${difficulty}: special/blocked hit and defensive reduction use the multiplier once`,()=>{
  s.difficulty=difficulty;resetMatch();
  s.lastAttackResult={questionId:'special',kind:'counter_rush',punchType:'jab',baseDamage:5,
   damageMultiplier:1.5*.25,outcome:'blocked',impactResolved:false};
  assert.equal(resolvePlayerImpact(),true);close(s.lastAttackResult.damageApplied,5*1.5*.25*taken/20);
  assert.equal(resolvePlayerImpact(),false);
  const baseDamage=30;
  s.counterAttack.questionId='counter';s.counterAttack.naturalMiss=false;
  s.defense.result={counterId:'counter',damage:baseDamage*.1,baseDamage,
   defenseSideCorrect:true,questionCorrect:true,impactRegistered:false};
  registerDefenseImpact({questionId:'counter',id:'defended',elapsedSinceImpact:0});
  close(s.defense.lastResult.damageApplied,baseDamage*.1*dealt/20);
  const before=s.playerHealth;registerDefenseImpact({questionId:'counter',id:'defended'});assert.equal(s.playerHealth,before);
 });
}
test('hard bar uses 150 HP as full and 75 HP as half; player keeps 100 HP',()=>{
 for(const [hp,maximum,width] of [[150,150,196],[75,150,98],[100,100,196]]){
  const bars=[],ctx={fillRect(x,y,w,h){if(this.fillStyle==='#fff1a0')bars.push(w);}};
  drawHealthBar(ctx,0,0,202,16,hp,hp,false,maximum);assert.deepEqual(bars,[width]);
 }
 s.difficulty='hard';resetMatch();checkMatchEnd();assert.equal(s.enemyHealth,150);
 close(applyImpactDamage('enemy',1,'weak'),.75);
});
