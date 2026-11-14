import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioManager } from '../js/audioManager.js';
import { updateAudioEvents, resetAudioEvents } from '../js/audioEvents.js';
import { createInitialGameState } from '../js/gameState.js';
import { setPresentationSetting } from '../js/presentationSettings.js';
const manifest={hit:{path:'x.mp3',volume:.5,category:'effects',loop:false,maxSimultaneous:2},theme:{path:'m.mp3',volume:.5,category:'music',loop:true,maxSimultaneous:1}};
function setup(ok=true){let requests=0;const nodes=[];const manager=createAudioManager({manifest,fetchFile:async()=>{requests++;return {ok,blob:async()=>({})};},objectURL:()=> 'blob:test',revoke(){},create(){const node={playCount:0,pauseCount:0,play(){this.playCount++;return Promise.resolve();},pause(){this.pauseCount++;},removeAttribute(){},load(){}};nodes.push(node);return node;}});return {manager,nodes,get requests(){return requests;}};}
test('sem arquivos: falha segura e apenas uma tentativa por ID',async()=>{const x=setup(false);assert.equal(await x.manager.play('hit'),false);assert.equal(x.requests,0);x.manager.unlock();for(let i=0;i<50;i++)assert.equal(await x.manager.play('hit'),false);assert.equal(x.requests,1);assert.deepEqual(x.manager.diagnostics().missing,['hit']);x.manager.dispose();});
test('limites, cache, loop, pausa/continuação, volume e mute',async()=>{const x=setup();x.manager.unlock();assert.equal(await x.manager.play('hit'),true);assert.equal(await x.manager.play('hit'),true);assert.equal(await x.manager.play('hit'),false);assert.equal(x.requests,1);await x.manager.playMusic('theme');assert.equal(x.nodes.at(-1).loop,true);await x.manager.playMusic('theme');assert.equal(x.nodes.length,3);x.manager.pause();x.manager.resume();const count=x.nodes[0].playCount;x.manager.resume();assert.equal(x.nodes[0].playCount,count);setPresentationSetting('muted',true);assert.ok(x.nodes.every(n=>n.volume===0));setPresentationSetting('muted',false);x.manager.stopAll();assert.equal(x.manager.diagnostics().active,0);x.manager.dispose();});
test('carregamento atrasado não toca depois de trocar de cena',async()=>{let release;const m=createAudioManager({manifest,fetchFile:()=>new Promise(r=>release=r),objectURL:()=> 'blob:test',revoke(){},create(){throw Error('Não deve criar voz');}});m.unlock();const pending=m.play('hit');m.stopAll();release({ok:true,blob:async()=>({})});assert.equal(await pending,false);m.dispose();});
test('observador usa eventos confirmados sem duplicar ou escrever no combate',()=>{resetAudioEvents();const s=createInitialGameState(870);const calls=[];const m={play:id=>{if(id!=="crowd_ambient")calls.push(id);},playMusic(){},stopAll(){},pause(){},resume(){}};updateAudioEvents(s,null,m);calls.length=0;
 s.lastAttackResult={impactResolved:true,outcome:'dodged',punchType:'jab',damageApplied:0};updateAudioEvents(s,null,m);assert.deepEqual(calls,['dodge']);calls.length=0;
 s.lastAttackResult={impactResolved:true,outcome:'hit',punchType:'straight',damageApplied:10};const before=structuredClone(s);updateAudioEvents(s,null,m);updateAudioEvents(s,null,m);assert.deepEqual(calls,['direct_hit']);assert.deepEqual(s,before);
 calls.length=0;s.qte.lastResult={outcome:'timeout'};updateAudioEvents(s,null,m);updateAudioEvents(s,null,m);assert.deepEqual(calls,['qte_timeout']);
 calls.length=0;s.defense.lastResult={impactRegistered:true,perfectDefense:true,damageApplied:0};updateAudioEvents(s,null,m);assert.deepEqual(calls,['perfect_defense']);
});

