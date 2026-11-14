import test from 'node:test';
import assert from 'node:assert/strict';
import { wear, resetWear, updateWear, drawWear, drawWearPortrait, wearIdleOffset } from '../js/fighterWear.js';
const state=()=>({matchId:99,phase:'idle',playerHealth:100,enemyHealth:100,defense:{}});
test('limiares independentes, suavização, estabilidade e reinício',()=>{
 const s=state(); resetWear(99); updateWear(s,1); assert.equal(wear.player.level,0);
 s.playerHealth=65; updateWear(s,.1); assert.equal(wear.player.level,1); assert.equal(wear.bot.level,0); assert.ok(wear.player.blend<1);
 s.enemyHealth=25; updateWear(s,1); assert.equal(wear.bot.level,2); assert.equal(wear.player.level,1);
 s.playerHealth=71; updateWear(s,.1); assert.equal(wear.player.level,1);
 resetWear(100); assert.equal(wear.player.blend,0); assert.equal(wear.bot.reaction,0);
});
test('não altera combate, preserva ataques e desenha suor/retratos visíveis',()=>{
 const s=state(); s.playerHealth=20; s.enemyHealth=20; resetWear(99); const before=structuredClone(s); updateWear(s,1); assert.deepEqual(s,before);
 assert.equal(wearIdleOffset('player',{animationState:'punch_left'}),0);
 assert.equal(wearIdleOffset('bot',{animationState:'stunned'}),0);
 let calls=0; const ctx={globalAlpha:1,save(){},restore(){},fillRect(){calls++;}};
 drawWear(ctx,'player',320,190,160,254); drawWearPortrait(ctx,'bot',588); assert.ok(calls>10);
 for(const phase of ['match_intro','victory','defeat','paused']) {s.phase=phase; const before=structuredClone(wear); updateWear(s,10); assert.deepEqual(wear,before);}
});
test('hematomas exigem dano recebido, independentes e sem repetição',()=>{
 const s=state(); resetWear(99);
 s.lastAttackResult={impactResolved:true,outcome:'dodged',damageApplied:0}; updateWear(s,.1); assert.equal(wear.bot.bruises,0);
 s.lastAttackResult={impactResolved:true,outcome:'hit',damageApplied:15}; updateWear(s,.1); assert.equal(wear.bot.bruises,1); assert.equal(wear.player.bruises,0);
 updateWear(s,.1); assert.equal(wear.bot.receivedDamage,15);
 s.lastAttackResult={impactResolved:true,outcome:'hit',damageApplied:35}; updateWear(s,.1); assert.equal(wear.bot.bruises,2);
 s.phase='victory'; updateWear(s,1); assert.equal(wear.bot.bruises,2);
 resetWear(100); assert.equal(wear.bot.bruises,0);
});
test('quatro estágios compartilhados, preview só visual e reset',async()=>{
 const {visualDamageLevel,previewVisualDamage}=await import('../js/fighterWear.js');
 const s=state(); resetWear(99); const before=structuredClone(s);
 for(const [damage,stage] of [[12,1],[33,2],[30,3]]) { s.lastAttackResult={impactResolved:true,outcome:'hit',damageApplied:damage}; updateWear(s,0); assert.equal(visualDamageLevel('bot'),stage); assert.equal(visualDamageLevel('player'),0); }
 for(const stage of [0,1,2,3]) { previewVisualDamage('player',stage); assert.equal(visualDamageLevel('player'),stage); assert.equal(s.playerHealth,before.playerHealth); }
 previewVisualDamage('player',null); assert.equal(visualDamageLevel('player'),0); resetWear(100); assert.equal(visualDamageLevel('bot'),0);
});
