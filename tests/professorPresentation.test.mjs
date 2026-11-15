import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createInitialGameState,gameState} from '../js/gameState.js';
import {observeProfessorAnswer,consumeProfessorEvents,endProfessorEasterEgg} from '../js/professorEasterEgg.js';
import {updateProfessorAnimation,PROFESSOR_ENTRY_DURATION,PROFESSOR_ENTRY_TIMING} from '../js/professorAnimation.js';
import {professorFrame,professorSpeech,professorRenderInfo} from '../js/professorView.js';
import {PROFESSOR_SPEECH,PROFESSOR_EXIT,updateProfessorPresentation,professorPresentationSnapshot,clearProfessorPresentation} from '../js/professorPresentation.js';
import {emitProfessorEvent} from '../js/professorEvents.js';
import {setDebugEnabled,setProfessorDebugMode,previewProfessorPresentation,updateProfessorDebugAnimation,debugState} from '../js/debug.js';
import {preloadProfessorSadSprites,PROFESSOR_SAD_CLIPS,professorSadFrame,professorSadLeftExtent} from '../js/professorSadSprites.js';
import {professorBubbleLayout} from '../js/professorDialogueView.js';
import {loadProfessorSprites} from './helpers/professorSprites.mjs';
import {resetMatch,resolvePlayerImpact} from '../js/match.js';
await loadProfessorSprites();
await preloadProfessorSadSprites(class {naturalWidth=1774;naturalHeight=887;set src(value){this.onload();}});
function answer(s,outcome='correct',kind='attack'){observeProfessorAnswer(s,{outcome,kind},++s.qte.sequence);}
function setup(count=5){const s=createInitialGameState();for(let i=0;i<count;i++)answer(s);return s;}
function advance(s,delta){updateProfessorAnimation(s,delta);updateProfessorPresentation(s,delta);}
test('approved entry implementation and high resolution sources remain byte-for-byte unchanged',()=>{
 const expected={
  'js/professorAnimation.js':'F33EFAC522791661732953577DC2BEAE5411237D6CDAB5140473BAAD712CF2ED',
  'assets/sprites/professor/professor_caminhando_lado_v2.png':'A9C093F3E6BFB674390BCF61CD320BF830755C6DB860FCC494502FC9FB4756B3',
  'assets/sprites/professor/professor_observando_v2.png':'173075E22A8628694689835A34C409E85AB85C91B8C4FAEF870737FA867F7261'
 };
 for(const [file,hash] of Object.entries(expected))assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase(),hash,file);
});
test('five and seven cue their exact speech once; menu phrase is never a combat balloon',()=>{
 const s=setup(4);assert.equal(professorFrame(s),null);assert.equal(professorSpeech(s),null);
 answer(s);assert.equal(professorSpeech(s).text,'Opa! Esse aí sabe das coisas!');
 assert.equal(consumeProfessorEvents(s).length,1);
 answer(s);assert.equal(professorSpeech(s).kind,'appearance');
 answer(s);assert.equal(professorSpeech(s).text,'Agora fiquei interessado!');
 updateProfessorPresentation(s,.4);const age=professorSpeech(s).age;
 answer(s);assert.equal(professorSpeech(s).age,age);
 assert.ok(Object.values(PROFESSOR_SPEECH).every(f=>!f.text.includes('ALGUÉM TEM QUE VER')));
});
const climbStart=PROFESSOR_ENTRY_TIMING.prepare+PROFESSOR_ENTRY_TIMING.approach+PROFESSOR_ENTRY_TIMING.edge+PROFESSOR_ENTRY_TIMING.stop;
for(const outcome of ['incorrect','timeout'])for(const progress of [null,.3,6.5,climbStart+.4,climbStart+.8,PROFESSOR_ENTRY_DURATION]){
 test(`${outcome} snapshots visible position and exits once from ${progress}`,()=>{
  const s=setup(progress===null?5:7);if(progress!==null)advance(s,progress);
  const before=professorFrame(s);answer(s,outcome);
  const exit=professorFrame(s);assert.equal(exit.stage,'disappointed');
  for(const key of ['x','floor','height','elapsed','clip'])assert.equal(exit[key],before[key],key);
  assert.equal(professorSpeech(s).text,'Poxa... eu esperava mais de você.');
  assert.equal(s.professorEasterEgg.professorPresent,false);assert.equal(s.professorEasterEgg.blocked,true);
  advance(s,1);assert.equal(professorFrame(s).clip,'sadReaction');
  assert.equal(professorFrame(s).floor,before.floor);assert.equal(professorFrame(s).height,before.height);
  assert.equal(professorRenderInfo(s).file,'professor_sad_exit_v1.png');
  const snapshot=professorPresentationSnapshot(s.professorEasterEgg);
  emitProfessorEvent(s,'professor_connected_hit',{punchType:'uppercut',chainCount:4});
  answer(s,outcome);assert.deepEqual(professorPresentationSnapshot(s.professorEasterEgg),snapshot);
  advance(s,1.1);assert.equal(professorFrame(s).stage,'sad_exit');assert.ok(professorFrame(s).x>=before.x);
  assert.equal(professorRenderInfo(s).walkingFrameFrequency,4);assert.ok(professorRenderInfo(s).stageDuration>0);
  advance(s,100);assert.equal(professorFrame(s),null);
  for(let i=0;i<10;i++)answer(s);assert.equal(professorFrame(s),null);
  const fresh=setup(5);assert.equal(professorFrame(fresh).stage,'observing');
 });
}
test('failures before five neither materialize the professor nor start a departure',()=>{
 for(const outcome of ['incorrect','timeout']){
  const s=setup(4);answer(s,outcome);assert.equal(professorFrame(s),null);
  assert.equal(professorPresentationSnapshot(s.professorEasterEgg),null);assert.equal(s.professorEasterEgg.blocked,false);
 }
});
test('defensive answer uses the real definitive question event and respects priority/cooldown',()=>{
 const s=setup(5);answer(s,'correct','defense');assert.equal(professorSpeech(s).kind,'appearance');
 advance(s,3.1);answer(s,'correct','attack'); // seven: entry has priority
 assert.equal(professorSpeech(s).kind,'entry');advance(s,3.1);
 answer(s,'correct','defense');assert.equal(professorSpeech(s).kind,'defense');
 advance(s,2.6);emitProfessorEvent(s,'professor_connected_hit',{punchType:'hook'});assert.equal(professorSpeech(s),null);
 advance(s,2.5);emitProfessorEvent(s,'professor_connected_hit',{punchType:'hook'});assert.equal(professorSpeech(s).kind,'strong');
});
test('strong hit and sequence speech come only from real connected damaging impacts',()=>{
 resetMatch();for(let i=0;i<5;i++)answer(gameState);advance(gameState,3.1);
 const impact=(outcome,punchType,sequence=false)=>{
  gameState.counterChain.active=sequence;gameState.counterChain.count=sequence?2:0;
  gameState.lastAttackResult={questionId:`impact-${gameState.attackSequence++}`,outcome,punchType,kind:sequence?'counter_rush':'attack'};
  return resolvePlayerImpact();
 };
 impact('dodged','uppercut');assert.equal(professorSpeech(gameState),null);
 impact('blocked','hook');assert.equal(professorSpeech(gameState),null);
 impact('hit','jab');assert.equal(professorSpeech(gameState),null);
 impact('hit','hook');assert.equal(professorSpeech(gameState).kind,'strong');
 const speech=professorSpeech(gameState);assert.equal(resolvePlayerImpact(),false);assert.deepEqual(professorSpeech(gameState),speech);
 advance(gameState,5.1);impact('hit','jab',true);assert.equal(professorSpeech(gameState).kind,'sequence');
});
test('question overlays, pause and Counter Rush preserve dialogue and exit clocks exactly',()=>{
 const s=setup(7);advance(s,.4);answer(s,'incorrect');advance(s,.5);
 for(const block of ['paused','question','review','counter_rush_cutscene','counter_rush_flash']){
  const before=professorPresentationSnapshot(s.professorEasterEgg),frame=professorFrame(s);
  if(block==='paused')s.phase='paused';
  else if(block==='question')s.qte.question={id:'visible-question'};
  else if(block==='review')s.qte.pendingResult={outcome:'incorrect'};
  else s.playerCombat.state=block;
  advance(s,100);assert.deepEqual(professorPresentationSnapshot(s.professorEasterEgg),before);assert.deepEqual(professorFrame(s),frame);
  if(['question','review'].includes(block))assert.equal(professorSpeech(s),null);
  s.phase='idle';s.qte.question=s.qte.pendingResult=null;s.playerCombat.state='idle';
 }
 advance(s,.2);assert.ok(professorPresentationSnapshot(s.professorEasterEgg).departure.age>.5);
});
test('pixel balloons wrap, follow head/camera and fit below HUD on desktop and narrow viewports',()=>{
 for(const width of [320,640])for(const x of [-10,20,320,494,641])for(const floor of [182,208,266])for(const spec of Object.values(PROFESSOR_SPEECH)){
  const frame={x,floor,height:120},blockers=[{x:210,y:72,width:220,height:50}];
  const b=professorBubbleLayout(frame,spec.text,width,360,null,blockers);
  assert.ok(b.x-6>=0&&b.x+b.width+6<=width);assert.ok(b.y-6>=74&&b.y+b.height+6<=360);
  assert.equal(b.lines.join(' '),spec.text);
 }
 const a=professorBubbleLayout({x:200,floor:240,height:120},PROFESSOR_SPEECH.strong.text);
 const b=professorBubbleLayout({x:220,floor:240,height:120},PROFESSOR_SPEECH.strong.text);
 assert.equal(b.target.x-a.target.x,20);
 const c=professorBubbleLayout({x:200,floor:240,height:120},'Oi!',640,360,{a:2,b:0,c:0,d:2,e:-20,f:-30});
 assert.equal(c.target.x,380);assert.equal(c.target.y,234);
 const combat={x:210,y:76,width:220,height:270};
 for(const spec of Object.values(PROFESSOR_SPEECH)){
  const box=professorBubbleLayout({x:470,floor:266,height:171},spec.text,640,360,null,[combat]);
  assert.ok(box.x>=combat.x+combat.width||box.x+box.width<=combat.x,'opponent face/fighting lane stays visible');
 }
});
test('all six debug actions leave real match state untouched and exit preview cannot restart entry',()=>{
 Object.assign(gameState,createInitialGameState());setDebugEnabled(true);setProfessorDebugMode('inside');
 const before=JSON.stringify(gameState);
 for(const kind of ['appearance','entry','strong','defense','sequence']){
  assert.equal(previewProfessorPresentation(kind),true);
  updateProfessorDebugAnimation(gameState,.2);assert.equal(professorSpeech(gameState).kind,kind);
 }
 const frame=professorFrame(gameState);assert.equal(previewProfessorPresentation('sadExit'),true);
 assert.equal(professorFrame(gameState).x,frame.x);const clock=debugState.professorAnimation.entryElapsed;
 updateProfessorDebugAnimation(gameState,2.3);assert.equal(debugState.professorAnimation.entryElapsed,clock);
 assert.equal(previewProfessorPresentation('strong'),false);
 updateProfessorDebugAnimation(gameState,100);assert.equal(professorFrame(gameState),null);
 assert.equal(JSON.stringify(gameState),before);setDebugEnabled(false);
});
test('sad walk cadence is independent of displacement and match end clears presentation',()=>{
 assert.equal(PROFESSOR_EXIT.framesPerSecond,4);
 assert.equal(professorSadFrame('sadWalking',.01),professorSadFrame('sadWalking',1.01));
 assert.equal(PROFESSOR_SAD_CLIPS.sadWalking.frames.length,4);
 const s=setup(5);answer(s,'incorrect');advance(s,2.2);const a=professorFrame(s);advance(s,.1);const b=professorFrame(s);
 assert.ok(Math.abs(b.x-a.x-PROFESSOR_EXIT.speed*.1)<1e-8);
 endProfessorEasterEgg(s);assert.equal(professorFrame(s),null);assert.equal(professorSpeech(s),null);
});
test('outside exit walks behind the existing ring until the whole body is off screen',()=>{
 const s=setup(5);answer(s,'incorrect');
 const exit=professorPresentationSnapshot(s.professorEasterEgg).departure;
 advance(s,PROFESSOR_EXIT.reaction+exit.walkDuration-1e-6);
 const frame=professorFrame(s);
 assert.equal(frame.layer,'OUTSIDE');assert.equal(frame.behindRopes,true);assert.equal(frame.floor,182);
 assert.ok(frame.x-professorSadLeftExtent(frame.height)>640,'entire silhouette leaves visible area');
 advance(s,1);assert.equal(professorFrame(s),null);
});
