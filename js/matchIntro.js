import { gameState } from './gameState.js';
import { cancelArenaSpeech, playArenaBell, playCrowdAccent } from './arenaAudio.js';
import { resetCharacters } from './characters.js';
import { unlockAudio } from './audio.js';
import { stopArenaTransients } from './arenaAudio.js';
export const MATCH_INTRO = 'match_intro';
export const MATCH_INTRO_DURATION = 14.5;
export const matchIntro = { time: 0, line: -1 };
let button, controls, caption, boundDocument;
const introListeners = new Set();
let lastIntroActive = false;
export function onIntroChange(listener) { introListeners.add(listener); return () => introListeners.delete(listener); }
export function cancelMatchIntro() { cancelArenaSpeech(); if (button) button.hidden = true; matchIntro.time = 0; matchIntro.line = -1; gameState.matchIntro = null; }
export function finishMatchIntro() {
    if (gameState.phase !== 'match_intro') return false;
    cancelMatchIntro(); stopArenaTransients(); gameState.phase = 'idle';
    resetCharacters(); syncIntroControls(); return true;
}
export function beginMatchIntro() {
    cancelMatchIntro(); gameState.phase = 'match_intro'; resetCharacters();
    gameState.matchIntro = matchIntro; matchIntro.matchId = gameState.matchId;
    syncIntroControls();
    playCrowdAccent(1.2, true);
}
const lines = ['Lutadores, preparem-se!', 'Respeitem as regras!', 'Que comece a luta!'];
export const INTRO_CUES = [
    { at: 7, until: 8.25, text: lines[0] },
    { at: 8.25, until: 9.5, text: lines[1] },
    { at: 9.5, until: 10.8, text: lines[2] }
];
const smooth = value => { value = Math.max(0, Math.min(1, value)); return value * value * (3 - 2 * value); };
export function introFrame(state = gameState) {
    if (state.phase !== MATCH_INTRO || !state.matchIntro) return null;
    const time = state.matchIntro.time;
    const cue = INTRO_CUES.find(entry => time >= entry.at && time < entry.until);
    const scene = time < 2 ? 'arena' : time < 5 ? 'fighters' : time < 7 ? 'referee-entry'
        : time < 10.8 ? 'announcement' : time < 12.4 ? 'referee-exit' : 'fight';
    const returnAmount = smooth((time - 12.4) / 2.1);
    const stageZoom = time < 2 ? 1
        : time < 5 ? 1 + 0.075 * smooth((time - 2) / 3)
        : time < 7 ? 1.075 + 0.045 * smooth((time - 5) / 2)
        : time < 10.8 ? 1.12 + 0.02 * smooth((time - 7) / 3.8)
        : 1.14 - 0.065 * smooth((time - 10.8) / 1.6);
    const zoom = stageZoom * (1 - returnAmount) + returnAmount;
    const guardAmount = smooth((time - 7) / 0.7);
    return { guardAmount, fighterState: time < 7 ? 'INTRO_RELAXED' : time < 7.7 ? 'INTRO_RAISING_GUARD' : 'INTRO_GUARD', time, scene, subtitle: '', speaking: false, returnAmount, zoom,
        arms: time < 7 ? smooth((time - 6.2) / 0.8) : 1 - smooth((time - 10.4) / 0.6),
        refereeX: time < 7 ? 80 + 240 * smooth((time - 5) / 1.5) : 320 - 225 * smooth((time - 11) / 1.4),
        refereeVisible: time >= 5 };
}
export function syncIntroControls() {
    const active = gameState.phase === MATCH_INTRO;
    if (button) button.hidden = !active;
    if (controls && gameState.phase !== 'lobby') controls.hidden = active;
    if (caption) {
        const text = active ? (introFrame()?.subtitle || '') : '';
        if (caption.textContent !== text) caption.textContent = text;
    }
    if (active !== lastIntroActive) {
        lastIntroActive = active;
        for (const listener of introListeners) listener();
    }
}
function onIntroKey(event) {
    if (event.key !== 'Enter' || event.repeat || gameState.phase !== MATCH_INTRO) return;
    event.preventDefault(); unlockAudio(); finishMatchIntro();
}
export function initializeIntroControls(doc = document) {
    if (boundDocument === doc) return;
    boundDocument?.removeEventListener?.('keydown', onIntroKey); boundDocument = doc;
    const candidate = doc.getElementById('skip-intro'); button = candidate?.tagName === 'BUTTON' ? candidate : null;
    const live = doc.getElementById('intro-caption'); caption = live?.tagName === 'P' ? live : null;
    const panel = doc.getElementById('punch-controls'); controls = panel?.tagName === 'SECTION' ? panel : null;
    button?.addEventListener('click', () => { unlockAudio(); finishMatchIntro(); });
    doc.addEventListener('keydown', onIntroKey); syncIntroControls();
}
export function updateMatchIntro(delta) {
    if (gameState.phase !== MATCH_INTRO || gameState.matchIntro !== matchIntro || matchIntro.matchId !== gameState.matchId) return;
    matchIntro.time = Math.min(MATCH_INTRO_DURATION, matchIntro.time + Math.max(0, delta));
    const line = INTRO_CUES.findIndex(cue => matchIntro.time >= cue.at && matchIntro.time < cue.until);
    if (line !== matchIntro.line) { cancelArenaSpeech(); matchIntro.line = line;  }
    if (matchIntro.time >= 13 && matchIntro.time - delta < 13) { playArenaBell(); playCrowdAccent(1.5, true); }
    if (matchIntro.time >= MATCH_INTRO_DURATION - 1e-9) finishMatchIntro();
    syncIntroControls();
}


