// Rules own the streak; optional presentation observes definitive events only.
import {emitProfessorEvent} from './professorEvents.js';
export const PROFESSOR_REACTIONS=Object.freeze({});

export function createProfessorState(){
 return {
  consecutiveCorrectAnswers:0,
  professorUnlocked:false,professorPresent:false,professorInRing:false,
  appearanceEventUsed:false,ringEventUsed:false,blocked:false,ended:false,
  lastQuestionSequence:0,pendingEvents:[]
 };
}

// Called only by definitive QTE resolution; sequence is unique within a match.
export function observeProfessorAnswer(state,result,sequence,reactions=PROFESSOR_REACTIONS){
 const egg=state.professorEasterEgg;
 if(egg.ended||state.matchResult||['lobby','paused','match_intro','knockout_cinematic','victory','defeat'].includes(state.phase)
  ||!['correct','incorrect','timeout'].includes(result?.outcome)
  ||!Number.isInteger(sequence)||sequence<=egg.lastQuestionSequence)return;
 egg.lastQuestionSequence=sequence;
 if(result.outcome!=='correct'){
  // Notify before clearing presence so the presenter captures the exact pose.
  if(egg.professorPresent&&!egg.blocked)emitProfessorEvent(state,'professor_disappointed',{outcome:result.outcome});
  egg.consecutiveCorrectAnswers=0;
  egg.professorPresent=false;egg.professorInRing=false;
  if(egg.professorUnlocked)egg.blocked=true;
  egg.pendingEvents.length=0;
  return;
 }
 egg.consecutiveCorrectAnswers++;
 if(egg.blocked)return;
 const streak=egg.consecutiveCorrectAnswers;
 const emit=(type,phrase=null)=>{
  const event={type,matchId:state.matchId,questionSequence:sequence,streak,phrase};
  egg.pendingEvents.push(event);emitProfessorEvent(state,type,event);
 };
 if(streak===5&&!egg.appearanceEventUsed){
  egg.professorUnlocked=true;egg.professorPresent=true;egg.appearanceEventUsed=true;
  emit('professor_appearance');
 }
 if(streak===7&&egg.professorPresent&&!egg.ringEventUsed){
  egg.professorInRing=true;egg.ringEventUsed=true;
  emit('professor_enter_ring');
 }
 if(egg.professorPresent&&Object.hasOwn(reactions,streak)&&typeof reactions[streak]==='string'){
  emit('professor_reaction',reactions[streak]);
 }
 if(egg.professorPresent&&result.kind==='defense')emitProfessorEvent(state,'professor_defense_correct');
}

// Future presentation can consume each notification once, without a frame loop.
export function consumeProfessorEvents(state){
 const egg=state.professorEasterEgg;
 if(egg.ended||state.matchResult||['lobby','knockout_cinematic','victory','defeat'].includes(state.phase)){
  egg.pendingEvents.length=0;return [];
 }
 return egg.pendingEvents.splice(0);
}

export function endProfessorEasterEgg(state){
 emitProfessorEvent(state,'professor_end');
 const egg=state.professorEasterEgg;
 egg.ended=true;egg.professorPresent=false;egg.professorInRing=false;
 egg.pendingEvents.length=0;
}
