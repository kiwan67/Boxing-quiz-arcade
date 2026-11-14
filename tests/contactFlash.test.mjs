import test from 'node:test';
import assert from 'node:assert/strict';
import { updateArenaEffects, drawContactFlash } from '../js/arenaEffects.js';
import { presentationSettings } from '../js/presentationSettings.js';
let id = 20000;
const fight = () => ({matchId: id++, phase:'fight', counterChain:{count:0}, defense:{}, counterAttack:{type:'jab'}, stun:{remaining:0}});
function flash() { const calls=[]; drawContactFlash({save(){},restore(){},fillRect(...r){calls.push({r,alpha:this.globalAlpha});}}); return calls; }
test('flash somente no contato confirmado, uma vez, para golpes e Rush/Chain', () => {
    for (const punchType of ['jab','straight','hook','uppercut']) for (const kind of ['attack','counter_rush']) {
        const s=fight(); s.lastAttackResult={punchType,kind,outcome:'hit',impactResolved:true,damageApplied:5};
        updateArenaEffects(s,0); assert.equal(flash().length,1); assert.ok(flash()[0].alpha <= .28);
        updateArenaEffects(s,.101); assert.equal(flash().length,0);
        updateArenaEffects(s,0); assert.equal(flash().length,0);
    }
    for (const outcome of ['blocked','dodged','failed_qte','cancelled']) {
        const s=fight(); s.lastAttackResult={outcome,impactResolved:true,damageApplied:0};
        updateArenaEffects(s,0); assert.equal(flash().length,0);
    }
});
test('configuração reduz e desativa só o flash de contato', () => {
    const s=fight(); s.lastAttackResult={punchType:'jab',outcome:'hit',impactResolved:true,damageApplied:5}; updateArenaEffects(s,0);
    presentationSettings.impactFlash='reduced'; assert.ok(flash()[0].alpha <= .07);
    presentationSettings.impactFlash='off'; assert.equal(flash().length,0);
    presentationSettings.impactFlash='normal';
});
