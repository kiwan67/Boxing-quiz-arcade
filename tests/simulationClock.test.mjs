import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { getGameSpeed, realFrameDelta, simulationDelta, resetSimulationClock, resetFrameTimestamp, MAX_REAL_FRAME_DELTA } from '../js/simulationClock.js';
import { setDebugEnabled, setDebugGameSpeed } from '../js/debug.js';

beforeEach(() => { setDebugEnabled(false); resetSimulationClock(); });
test('relógio mantém 1×, aceita apenas 0.10–1.00 e multiplica uma única vez', () => {
    assert.equal(getGameSpeed(), 1);
    assert.equal(simulationDelta(0.04), 0.04);
    assert.equal(setDebugGameSpeed(0.5), false);
    setDebugEnabled(true);
    for (const speed of [0.1, 0.25, 0.5, 0.75, 1]) {
        assert.equal(setDebugGameSpeed(speed), true);
        assert.equal(simulationDelta(0.04), 0.04 * speed);
    }
    for (const invalid of [NaN, Infinity, 0, -1, 1.1, '0.5']) assert.equal(setDebugGameSpeed(invalid), false);
    assert.equal(simulationDelta(-1), 0);
    assert.equal(simulationDelta(NaN), 0);
});
test('RAF limita saltos reais antes de escalar; visibilidade e reinício descartam origem antiga', () => {
    setDebugEnabled(true); setDebugGameSpeed(0.25);
    assert.equal(realFrameDelta(1000), 0);
    assert.equal(realFrameDelta(1040), 0.04);
    assert.equal(simulationDelta(realFrameDelta(6040)), MAX_REAL_FRAME_DELTA * 0.25);
    assert.equal(realFrameDelta(6000), 0);
    resetFrameTimestamp(); assert.equal(realFrameDelta(100000), 0);
    resetSimulationClock(); assert.equal(getGameSpeed(), 1);
    assert.equal(realFrameDelta(200000), 0);
});
