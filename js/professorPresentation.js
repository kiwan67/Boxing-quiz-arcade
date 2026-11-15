import {subscribeProfessorEvents} from './professorEvents.js';
import {professorAnimationFrame} from './professorAnimation.js';
import {ARENA_WIDTH,REAR_RIGHT_POST,RING_FLOOR_BOUNDARY} from './ringGeometry.js';
import {professorSadRightExtent,professorSadLeftExtent} from './professorSadSprites.js';

export const PROFESSOR_SPEECH=Object.freeze({
 appearance:Object.freeze({text:'Opa! Esse aí sabe das coisas!',duration:3,priority:60}),
 entry:Object.freeze({text:'Agora fiquei interessado!',duration:3,priority:70}),
 strong:Object.freeze({text:'EITA, QUE PANCADA!',duration:2.5,priority:40}),
 defense:Object.freeze({text:'Boa leitura de jogo!',duration:2.5,priority:30}),
 sequence:Object.freeze({text:'Tá querendo humilhar, é?',duration:2.5,priority:40}),
 disappointment:Object.freeze({text:'Poxa... eu esperava mais de você.',duration:2,priority:100})
});
export const PROFESSOR_EXIT=Object.freeze({reaction:2,speed:18,framesPerSecond:4,fade:.8});
const sessions=new WeakMap();
function session(key){
 let value=sessions.get(key);
 if(!value){value={time:0,speech:null,nextCommon:0,departure:null};sessions.set(key,value);}
 return value;
}
export function clearProfessorPresentation(key){if(key)sessions.delete(key);}
export function professorQuestionObscuresScene(state){
 return Boolean(state.qte?.question||state.qte?.pendingResult||state.qte?.feedbackRemaining>0);
}
export function canAdvanceProfessorPresentation(state,delta){
 return state.phase==='idle'&&!state.matchResult&&!professorQuestionObscuresScene(state)
  &&!['counter_rush_cutscene','counter_rush_flash'].includes(state.playerCombat?.state)
  &&Number.isFinite(delta)&&delta>=0;
}
export function professorIsDeparting(key){return Boolean(key&&sessions.get(key)?.departure);}
export function cueProfessorSpeech(key,kind,frame){
 const spec=PROFESSOR_SPEECH[kind];if(!key||!spec||!frame)return false;
 const current=session(key);
 if(current.departure&&kind!=='disappointment')return false;
 if(current.speech&&current.speech.age<current.speech.duration&&current.speech.priority>=spec.priority)return false;
 if(spec.priority<60&&current.time<current.nextCommon)return false;
 current.speech={...spec,kind,age:0};
 if(spec.priority<60)current.nextCommon=current.time+5;
 return true;
}
export function startProfessorDeparture(key,frame){
 if(!key||!frame||session(key).departure)return false;
 const current=session(key);
 current.speech=null;
 const source={...frame};
 // At the lateral boundary there is no room for a convincing complete exit.
 // Fade before the post/side, rather than reversing the climb or crossing ropes.
 const radius=professorSadRightExtent(source.height);
 const depth=Math.max(0,Math.min(1,(source.floor-RING_FLOOR_BOUNDARY.rearY)/(RING_FLOOR_BOUNDARY.frontY-RING_FLOOR_BOUNDARY.rearY)));
 const side=RING_FLOOR_BOUNDARY.rearRight+(RING_FLOOR_BOUNDARY.frontRight-RING_FLOOR_BOUNDARY.rearRight)*depth;
 const behindRear=source.layer==='OUTSIDE'&&source.floor<RING_FLOOR_BOUNDARY.rearY;
 // Behind the rear ropes, use the same existing depth as the approved walk:
 // the post hides passing pixels, and the whole silhouette leaves the Canvas.
 const safeLimit=behindRear?ARENA_WIDTH+professorSadLeftExtent(source.height)+2:
  Math.min(ARENA_WIDTH,side,REAR_RIGHT_POST.left)-radius-2;
 const distance=Math.max(0,safeLimit-source.x);
 current.departure={source,age:0,distance,walkDuration:distance/PROFESSOR_EXIT.speed,done:false};
 cueProfessorSpeech(key,'disappointment',frame);
 return true;
}
export function updateProfessorPresentation(state,delta,key=state.professorEasterEgg){
 const current=key&&sessions.get(key);if(!current||!canAdvanceProfessorPresentation(state,delta))return;
 current.time+=delta;
 if(current.speech){current.speech.age=Math.min(current.speech.duration,current.speech.age+delta);if(current.speech.age>=current.speech.duration)current.speech=null;}
 const exit=current.departure;
 if(exit){exit.age+=delta;exit.done=exit.age>=PROFESSOR_EXIT.reaction+exit.walkDuration+PROFESSOR_EXIT.fade;}
}
export function professorVisualFrame(state,normal,key=state.professorEasterEgg){
 const exit=key&&sessions.get(key)?.departure;if(!exit)return normal;
 if(exit.done)return null;
 const {source,age,distance,walkDuration}=exit;
 // Keep the exact interrupted pose briefly; its entry clock is never restarted.
 if(age<.12)return {...source,departure:true,stage:'disappointed',alpha:1};
 const moving=age>=PROFESSOR_EXIT.reaction,walkAge=Math.max(0,age-PROFESSOR_EXIT.reaction);
 const progress=Math.min(distance,walkAge*PROFESSOR_EXIT.speed);
 const fadeAge=Math.max(0,walkAge-walkDuration);
 return {...source,departure:true,stage:moving?'sad_exit':'disappointed',stageDuration:moving?walkDuration+PROFESSOR_EXIT.fade:PROFESSOR_EXIT.reaction,
  clip:moving&&distance>0?'sadWalking':'sadReaction',elapsed:moving&&distance>0?Math.min(walkAge,walkDuration):Math.min(.99,age),
  x:source.x+progress,facing:1,alpha:1-Math.min(1,fadeAge/PROFESSOR_EXIT.fade),fallback:source};
}
export function professorSpeechFrame(state,key=state.professorEasterEgg){
 if(professorQuestionObscuresScene(state))return null;
 const speech=key&&sessions.get(key)?.speech;
 if(!speech)return null;
 return {...speech,alpha:Math.max(0,Math.min(1,speech.age/.12,(speech.duration-speech.age)/.15))};
}
export function professorPresentationSnapshot(key){
 const value=key&&sessions.get(key);if(!value)return null;
 return {time:value.time,speech:value.speech?{...value.speech}:null,departure:value.departure?{...value.departure,source:{...value.departure.source}}:null};
}

subscribeProfessorEvents((state,event)=>{
 const key=state.professorEasterEgg;if(!key)return;
 if(event.type==='professor_end'){clearProfessorPresentation(key);return;}
 if(key.ended||state.matchResult||state.phase!=='idle')return;
 const frame=key.professorPresent&&!key.blocked?professorAnimationFrame(state):null;
 if(event.type==='professor_disappointed'){startProfessorDeparture(key,frame);return;}
 if(!frame)return;
 if(event.type==='professor_appearance')cueProfessorSpeech(key,'appearance',frame);
 else if(event.type==='professor_enter_ring')cueProfessorSpeech(key,'entry',frame);
 else if(event.type==='professor_defense_correct')cueProfessorSpeech(key,'defense',frame);
 else if(event.type==='professor_connected_hit'){
  if(event.chainCount>=2)cueProfessorSpeech(key,'sequence',frame);
  else if(['hook','uppercut'].includes(event.punchType))cueProfessorSpeech(key,'strong',frame);
 }
});
