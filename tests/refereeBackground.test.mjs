import test from 'node:test';
import assert from 'node:assert/strict';
import { refereeBackgroundFrame, REFEREE_MARK } from '../js/refereeBackground.js';
test('juiz mantém posição escala e repouso durante reações e passagem do tempo', () => {
    for (let time = 0; time < 90; time += .1) for (const age of [0, .2, .5, 1, 10]) {
        const frame = refereeBackgroundFrame({time, reaction: {age, strength: 1}});
        assert.equal(frame.x, REFEREE_MARK.x); assert.equal(frame.floor, REFEREE_MARK.floor);
        assert.equal(frame.height, REFEREE_MARK.height); assert.equal(frame.walking, false);
        assert.ok(frame.reaction >= 0 && frame.reaction <= 1);
        if (age >= .75) assert.equal(frame.reaction, 0);
    }
});
