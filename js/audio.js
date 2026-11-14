import { audioManager } from './audioManager.js';
const listeners=new Set(); let initialized=false;
export function getAudioContext(){return undefined;}
export function onStopCombatAudio(listener){listeners.add(listener);return()=>listeners.delete(listener);}
export function unlockAudio(){audioManager.unlock();}
export function initializeAudio(target=document){if(initialized)return;initialized=true;target.addEventListener('pointerdown',unlockAudio);target.addEventListener('keydown',unlockAudio);}
export function playStunSound(){return false;} // No synthesized substitute or unlisted file.
export function stopCombatAudio(){audioManager.stopAll();for(const listener of listeners)listener();}
