import {gameState} from './gameState.js';
import {resetFrameTimestamp} from './simulationClock.js';
import {isTutorialActive} from './tutorial.js';
import {restartFight} from './restart.js';
import {beginMatchIntro,syncIntroControls} from './matchIntro.js';
import {returnToLobby,updateLobby} from './lobby.js';
import {updatePunchControls} from './punchControls.js';

let view;
export function canPause(){
 return !isTutorialActive()&&!gameState.matchResult&&['idle','match_intro'].includes(gameState.phase);
}
export function syncPauseControls(){
 if(!view)return;
 const paused=gameState.phase==='paused';
 view.root.hidden=!paused&&!canPause();
 view.button.hidden=paused;view.menu.hidden=!paused;
}
function sync(){syncIntroControls();updatePunchControls();syncPauseControls();}

export function pauseMatch(){
 if(!canPause())return false;
 gameState.phaseBeforePause=gameState.phase;gameState.phase='paused';
 resetFrameTimestamp();sync();view?.continueButton.focus();return true;
}
export function resumeMatch(){
 if(gameState.phase!=='paused'||!['idle','match_intro'].includes(gameState.phaseBeforePause))return false;
 gameState.phase=gameState.phaseBeforePause;gameState.phaseBeforePause=null;
 resetFrameTimestamp();sync();view?.button.focus();return true;
}
export function restartPausedMatch(){
 if(gameState.phase!=='paused')return false;
 restartFight();beginMatchIntro();updateLobby();sync();return true;
}
export function leavePausedMatch(){
 if(gameState.phase!=='paused')return false;
 returnToLobby();sync();view?.doc.querySelector?.('[data-menu-play]')?.focus();return true;
}
function onKeyDown(event){
 if(event.defaultPrevented||event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.isComposing)return;
 if(event.key==='Escape'){
  const handled=gameState.phase==='paused'?resumeMatch():pauseMatch();
  if(handled)event.preventDefault();return;
 }
 if(event.key==='Tab'&&gameState.phase==='paused'&&view){
  const buttons=[view.continueButton,view.restartButton,view.leaveButton];
  const index=buttons.indexOf(view.doc.activeElement);
  const next=index<0?(event.shiftKey?buttons.length-1:0):(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length;
  event.preventDefault();buttons[next].focus();
 }
}
export function initializePauseControls(doc=globalThis.document){
 if(view?.doc===doc){syncPauseControls();return;}
 const root=doc?.getElementById('match-pause-ui');if(!root?.querySelector)return;
 const button=root.querySelector('[data-pause]'),menu=root.querySelector('[data-pause-menu]');
 const continueButton=root.querySelector('[data-pause-continue]'),restartButton=root.querySelector('[data-pause-restart]'),leaveButton=root.querySelector('[data-pause-leave]');
 view?.doc.removeEventListener('keydown',onKeyDown);
 view={doc,root,button,menu,continueButton,restartButton,leaveButton};
 button.addEventListener('click',pauseMatch);continueButton.addEventListener('click',resumeMatch);
 restartButton.addEventListener('click',restartPausedMatch);leaveButton.addEventListener('click',leavePausedMatch);
 doc.addEventListener('keydown',onKeyDown);syncPauseControls();
}
