export const MAX_REAL_FRAME_DELTA = 0.1;
let previousTimestamp = null;
let gameSpeed = 1;

export function getGameSpeed() { return gameSpeed; }

export function setGameSpeed(value) {
    if (!Number.isFinite(value) || value < 0.1 || value > 1) return false;
    gameSpeed = Math.round(value * 100) / 100;
    return true;
}

export function resetFrameTimestamp() { previousTimestamp = null; }
export function resetSimulationClock() {
    gameSpeed = 1;
    resetFrameTimestamp();
}

// RAF fornece milissegundos; a simulação e seus temporizadores usam segundos.
export function realFrameDelta(timestamp) {
    if (!Number.isFinite(timestamp)) { resetFrameTimestamp(); return 0; }
    const delta = previousTimestamp === null ? 0 : (timestamp - previousTimestamp) / 1000;
    previousTimestamp = timestamp;
    return Math.max(0, Math.min(MAX_REAL_FRAME_DELTA, delta));
}

export function simulationDelta(realDelta) {
    return Number.isFinite(realDelta) ? Math.max(0, realDelta) * gameSpeed : 0;
}
