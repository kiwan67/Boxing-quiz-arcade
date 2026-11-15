import test from 'node:test';
import assert from 'node:assert/strict';
let canvasPaints=0;

class Element extends EventTarget{
 hidden=false;style={};dataset={};
 focus(){doc.activeElement=this;}
}
class Canvas extends Element{
 width=640;height=360;
 context=new Proxy({fillRect(){canvasPaints++;},createLinearGradient(){return {addColorStop(){}};}},{get:(target,key)=>key in target?target[key]:()=>{}});
 getContext(){return this.context;}
 getBoundingClientRect(){return {left:0,top:0,width:640,height:360};}
}
const doc=new EventTarget(),canvas=new Canvas(),root=new Element();canvas.ownerDocument=doc;
const entries=Object.fromEntries(['pause','pause-menu','pause-continue','pause-restart','pause-leave'].map(key=>[key,new Element()]));
root.querySelector=selector=>entries[selector.slice(6,-1)];
doc.getElementById=id=>({'game-canvas':canvas,'match-pause-ui':root}[id]??null);
doc.createElement=()=>new Canvas();
globalThis.document=doc;globalThis.HTMLCanvasElement=Canvas;
let frameRequests=0;globalThis.requestAnimationFrame=()=>{frameRequests++;};
const {update}=await import('../js/main.js');
const {gameState:s}=await import('../js/gameState.js');
const {restartFight}=await import('../js/restart.js');
const {pauseMatch,resumeMatch,initializePauseControls,syncPauseControls}=await import('../js/pause.js');
const {realFrameDelta}=await import('../js/simulationClock.js');
const {beginAttackQTE,answerQTE,beginDefenseQuestion}=await import('../js/qte.js');
const {requestPunch}=await import('../js/combat.js');
const {selectDefenseSide,beginDefense}=await import('../js/defense.js');
const {applyImpactDamage}=await import('../js/match.js');
const {characters}=await import('../js/characters.js');
const {arenaLife}=await import('../js/arenaLife.js');
const {render}=await import('../js/render.js');
const {beginMatchIntro,matchIntro}=await import('../js/matchIntro.js');
const {beginTutorialPrompt}=await import('../js/tutorial.js');
const {professorAnimationFrame}=await import('../js/professorAnimation.js');
function key(key,extra={}){
 const event=new Event('keydown',{cancelable:true});Object.assign(event,{key,...extra});doc.dispatchEvent(event);return event;
}
function start(){s.difficulty='normal';restartFight();s.offensiveAI.remaining=100;syncPauseControls();}
function ask(){assert.equal(beginAttackQTE('left','jab'),true);s.playerCombat.state='attack_qte';return s.qte.question;}

test('main loop freezes professor animation during pause and resumes the same entry',()=>{
 start();Object.assign(s.professorEasterEgg,{professorUnlocked:true,professorPresent:true,professorInRing:true});
 update(.2);const before=professorAnimationFrame(s);pauseMatch();update(100);
 assert.deepEqual(professorAnimationFrame(s),before);resumeMatch();update(.1);
 assert.ok(professorAnimationFrame(s).elapsed>before.elapsed);
});

test('pause button and Escape resume exactly; no lost time, duplicate listeners or loops',()=>{
 start();const q=ask();update(1);const before=JSON.stringify(s),loops=frameRequests;
 initializePauseControls(doc);initializePauseControls(doc);
 entries.pause.dispatchEvent(new Event('click'));
 assert.equal(s.phase,'paused');assert.equal(entries['pause-menu'].hidden,false);
 assert.equal(doc.activeElement,entries['pause-continue']);
 const frozen=JSON.stringify({s,characters,arenaLife}),paintBefore=canvasPaints;update(1000);render();
 assert.equal(canvasPaints,paintBefore);
 assert.equal(JSON.stringify({s,characters,arenaLife}),frozen);
 assert.equal(answerQTE(q.correctAnswer,q.id),null);assert.equal(requestPunch('left'),false);
 assert.equal(applyImpactDamage('player',20,'paused'),0);assert.equal(beginDefense(),false);
 assert.equal(beginAttackQTE('left'),false);assert.equal(beginDefenseQuestion(),false);
 assert.equal(JSON.stringify({s,characters,arenaLife}),frozen);
 realFrameDelta(1000);key('Escape');assert.equal(s.phase,'idle');assert.equal(JSON.stringify(s),before);
 assert.equal(realFrameDelta(1000000),0);update(.1);assert.ok(Math.abs(s.qte.remaining-8.9)<1e-9);
 key('Escape');assert.equal(s.phase,'paused');entries['pause-continue'].dispatchEvent(new Event('click'));
 assert.equal(s.phase,'idle');assert.equal(frameRequests,loops);
});

test('pending feedback, cooldowns, defense and cutscene timers freeze; combat stays blocked',()=>{
 for(const mode of ['reading','defense_direction_qte','action_cooldown','counter_rush_cutscene','counter_rush_flash']){
  start();
  if(mode==='reading'){const q=ask();answerQTE(q.correctAnswer,q.id);}
  else s.playerCombat.state=mode;
  s.playerCooldown.remaining=1.5;s.defense.remaining=2;s.counterRush.cutsceneRemaining=2;s.counterRush.flashRemaining=.1;
  assert.equal(pauseMatch(),true);const snapshot=JSON.stringify(s);update(500);
  assert.equal(selectDefenseSide('left'),false);assert.equal(JSON.stringify(s),snapshot);
  assert.equal(resumeMatch(),true);assert.equal(s.playerCombat.state,mode==='reading'?'attack_qte':mode);
 }
 start();beginMatchIntro();update(2);pauseMatch();update(100);assert.equal(matchIntro.time,2);
 resumeMatch();assert.equal(s.phase,'match_intro');update(.1);assert.equal(matchIntro.time,2.1);
});

test('restart and return to menu use existing flows and reset easter egg',()=>{
 start();s.difficulty='hard';restartFight();s.enemyHealth=42;s.professorEasterEgg.professorPresent=true;
 pauseMatch();entries['pause-restart'].dispatchEvent(new Event('click'));
 assert.equal(s.phase,'match_intro');assert.equal(s.enemyHealth,150);assert.equal(s.playerHealth,100);
 assert.equal(s.difficulty,'hard');assert.equal(s.professorEasterEgg.professorPresent,false);
 assert.equal(s.professorEasterEgg.consecutiveCorrectAnswers,0);assert.equal(s.phaseBeforePause,null);
 pauseMatch();entries['pause-leave'].dispatchEvent(new Event('click'));
 assert.equal(s.phase,'lobby');assert.equal(root.hidden,true);assert.equal(s.phaseBeforePause,null);
});

test('Escape ignores initial/credits, tutorial, results, repeat and previously handled events; Tab stays in dialog',()=>{
 start();s.phase='lobby';key('Escape');assert.equal(s.phase,'lobby');assert.equal(pauseMatch(),false);
 for(const phase of ['victory','defeat','knockout_cinematic']){s.phase=phase;assert.equal(pauseMatch(),false);}
 start();key('Escape',{repeat:true});assert.equal(s.phase,'idle');
 const handled=new Event('keydown',{cancelable:true});Object.assign(handled,{key:'Escape'});handled.preventDefault();doc.dispatchEvent(handled);assert.equal(s.phase,'idle');
 pauseMatch();key('Tab');assert.equal(doc.activeElement,entries['pause-restart']);key('Tab',{shiftKey:true});assert.equal(doc.activeElement,entries['pause-continue']);resumeMatch();
 beginTutorialPrompt();assert.equal(pauseMatch(),false);key('Escape');assert.equal(s.phase,'match_intro');
});
