import test from 'node:test';import assert from 'node:assert/strict';
import {gameState as s} from '../js/gameState.js';
import {resetMatch,applyImpactDamage,checkMatchEnd,isMatchOver} from '../js/match.js';
import {knockout,KO_DURATION,KO_TIMING,knockoutFrame,updateKnockout} from '../js/knockout.js';
for(const target of ['player','enemy'])for(const type of ['jab','straight','hook','uppercut'])test(`KO ${target} por ${type} fixa resultado e bloqueia dano`,()=>{
 resetMatch();s.counterAttack.type=type;s.lastAttackResult={outcome:'hit',impactResolved:true,punchType:type,arm:'right',kind:'counter_rush',damageApplied:100};
 applyImpactDamage(target,100,'final');assert.equal(s.phase,'knockout_cinematic');assert.equal(isMatchOver(),true);assert.equal(knockout.result.punchType,type);assert.equal(knockout.result.loser,target==='enemy'?'bot':'player');assert.equal(Object.isFrozen(s.matchResult),true);
 const result=s.matchResult,time=s.gameTime;assert.equal(applyImpactDamage(target==='enemy'?'player':'enemy',100,'late'),0);checkMatchEnd();assert.equal(s.matchResult,result);assert.equal(s.qte.question,null);
 updateKnockout(s,.5);assert.equal(s.gameTime,time);assert.equal(knockoutFrame().scene,'impact');assert.ok(knockout.animationTime<.2);
 updateKnockout(s,KO_DURATION);assert.equal(s.phase,target==='enemy'?'victory':'defeat');assert.equal(s.matchResult,result);
});
test('30 e 60 FPS: fases e duração equivalentes; reinício limpa KO',()=>{
 for(const fps of [30,60]){resetMatch();applyImpactDamage('enemy',100,'final');let frames=0;const scenes=new Set();while(s.phase==='knockout_cinematic'&&frames<fps*10){scenes.add(knockoutFrame().scene);updateKnockout(s,1/fps);frames++;}assert.ok(Math.abs(frames/fps-KO_DURATION)<=1/fps+1e-8);assert.equal(scenes.size,6);}
 resetMatch();assert.equal(knockout.result,null);assert.equal(s.phase,'idle');
});
test('bloqueio sem reação de acerto não dispara KO cinematográfico',()=>{resetMatch();applyImpactDamage('enemy',20,'block',s.matchId,0,false);assert.equal(s.phase,'idle');assert.equal(knockout.result,null);});
test('comandos e IA permanecem bloqueados durante KO',async()=>{
 const {requestPunch,updateCombat}=await import('./helpers/combat.mjs');const {beginSpontaneousAttack}=await import('../js/counterAttack.js');
 resetMatch();applyImpactDamage('enemy',100,'final');const time=s.gameTime;const winner=s.matchResult;
 assert.equal(requestPunch('left'),false);assert.equal(requestPunch('right'),false);assert.equal(beginSpontaneousAttack(),false);updateCombat(10);
 assert.equal(s.gameTime,time);assert.equal(s.matchResult,winner);assert.equal(s.qte.question,null);assert.equal(s.phase,'knockout_cinematic');
});
