import test from 'node:test';import assert from 'node:assert/strict';
import {REFEREE_CLIPS as clips,refereeClipDuration as duration,refereeFrameIndex as index} from '../js/refereeGestures.js';
import {refereeExpression as r,resetRefereeExpressions,updateRefereeExpressions as update} from '../js/refereeExpressions.js';
import {createInitialGameState} from '../js/gameState.js';
test('tempos totais e poses principais legíveis',()=>{
 for(const [name,min,max]of [['facepalm',1.8,2.4],['clap',1.5,2.2],['approval',1.2,1.6],['concerned',1.5,2.5],['reaction_light',.9,1.3],['reaction_medium',.9,1.3],['shocked',.5,.9]]){const c=clips['referee_'+name];assert.ok(duration(c)>=min&&duration(c)<=max,name);}
 assert.ok(Math.abs(clips.referee_facepalm.durations[3]+clips.referee_facepalm.durations[4]-.7)<1e-9);
 assert.equal(clips.referee_concerned.loop,undefined);
});
test('30 e 60 FPS: mesmos frames nos mesmos instantes, mão na testa por 0.7s',()=>{
 const c=clips.referee_facepalm;
 for(const fps of [30,60]) {let hold=0;const entries=[];let prev=-1;
 for(let frame=0;frame<Math.ceil(duration(c)*fps);frame++){const step=index(c,frame/fps);if(step!==prev){entries.push({step,time:frame/fps});prev=step;}if(step===3||step===4)hold+=1/fps;}
 assert.ok(Math.abs(hold-.7)<=1/fps+1e-8);assert.equal(entries.length,7);
 let boundary=0;for(let i=0;i<entries.length;i++){assert.ok(Math.abs(entries[i].time-boundary)<=1/fps+1e-8);boundary+=c.durations[i];}
 }
});
test('Jab não cancela facepalm, Uppercut pode interromper, contatos iguais não reiniciam',()=>{
 const s=createInitialGameState(101);resetRefereeExpressions(101);s.qte.lastResult={outcome:'incorrect'};update(s,0);update(s,.5);
 s.lastAttackResult={impactResolved:true,outcome:'hit',damageApplied:5,punchType:'jab'};update(s,0);assert.equal(r.clip,'referee_facepalm');assert.equal(r.elapsed,.5);
 s.lastAttackResult={impactResolved:true,outcome:'hit',damageApplied:20,punchType:'uppercut'};update(s,0);assert.equal(r.clip,'referee_reaction_strong');update(s,.2);
 s.lastAttackResult={impactResolved:true,outcome:'hit',damageApplied:20,punchType:'uppercut'};update(s,0);assert.equal(r.elapsed,.2);
});
test('último estágio da Chain espera leitura mínima e dura 1.5s',()=>{
 const s=createInitialGameState(102);resetRefereeExpressions(102);s.counterChain.count=3;update(s,0);update(s,.1);s.counterChain.count=4;update(s,0);assert.equal(r.elapsed,.1);assert.equal(r.pendingFinal,true);update(s,.2);assert.equal(r.pendingFinal,false);assert.ok(Math.abs(r.remaining-1.5)<1e-8);
});
