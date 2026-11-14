import test from 'node:test';
import assert from 'node:assert/strict';
import { preloadCeremonySprites } from '../js/ceremony.js';
import { drawReferee } from '../js/refereeView.js';
test('poses completas do juiz em todos os instantes do gesto, sem rotação ou braços duplicados', async () => {
    const original = globalThis.Image;
    globalThis.Image = class { naturalWidth = 340; naturalHeight = 1028; set src(url) { this.url = url; queueMicrotask(() => this.onload?.()); } };
    try {
        await preloadCeremonySprites();
        for (let t = 5; t <= 12.4; t += .05) {
            const draws = [];
            const ctx = { save(){}, restore(){}, translate(){}, scale(){}, fillRect(){}, beginPath(){}, ellipse(){}, fill(){},
                drawImage(...args){ draws.push(args); }, rotate(){ throw Error('Rotação proibida'); } };
            drawReferee(ctx, {x:320, floor:326, height:210, time:t, arms: t > 7 && t < 10.7 ? 1 : 0});
            assert.equal(draws.length, 1);
            assert.equal(draws[0].length, 5);
            assert.ok(draws[0][0].url.endsWith(t > 7 && t < 10.7 ? 'referee-signal.png' : 'referee-neutral.png'));
        }
    } finally { globalThis.Image = original; }
});
