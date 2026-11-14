// Compatibility API for existing presentation callers. No synthesis or narration.
import { audioManager } from './audioManager.js';
import { updateAudioEvents } from './audioEvents.js';
let hidden=false;
export function cancelArenaSpeech(){try{globalThis.speechSynthesis?.cancel();}catch{}}
export function speakReferee(){return false;}
export function pauseArenaSpeech(){}
export function setArenaAudioHidden(value){hidden=value;if(hidden)audioManager.pause();else audioManager.resume();}
export function stopArenaAudio(){audioManager.stopAll();}
export function stopArenaTransients(){audioManager.stopAll();}
export function playArenaBell(){return false;} // fight_start is emitted once on entering combat.
export function playCrowdAccent(strength=1,applause=false){return audioManager.play(applause?'crowd_clap':'crowd_cheer');}
export function updateArenaAudio(state,delta,life){if(hidden)return;updateAudioEvents(state,life);}


