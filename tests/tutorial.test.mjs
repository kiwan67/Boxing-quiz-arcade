import test from 'node:test';
import assert from 'node:assert/strict';
import {gameState as s} from '../js/gameState.js';
import {restartFight} from '../js/restart.js';
import {finishMatchIntro,matchIntro} from '../js/matchIntro.js';
import {TUTORIAL_PAGES,TUTORIAL_TIMING,updateTutorial,tutorialInstructorFrame,beginTutorialPrompt,tutorialFrame,tutorialButtons,tutorialAction,isTutorialActive,handleTutorialMouse,initializeTutorialControls} from '../js/tutorial.js';
import {PUNCH_TYPES,PUNCH_ORDER} from '../js/punchTypes.js';
import {requestPunch,updateCombat} from './helpers/combat.mjs';
import {beginAttackQTE} from '../js/qte.js';
import {selectPunch} from '../js/punches.js';
import {beginSpontaneousAttack} from '../js/counterAttack.js';
import {updateOffensiveClock} from '../js/ai.js';
import {initializeInput} from '../js/input.js';
import {beginDefense} from './helpers/defenseApi.mjs';

test('cinco páginas documentam danos e recargas reais, sem atalhos de ataque inventados',()=>{
 assert.equal(TUTORIAL_PAGES.length,5);
 for(const [index,type]of PUNCH_ORDER.entries()){
  assert.ok(TUTORIAL_PAGES[1].lines[index].includes(String(PUNCH_TYPES[type].damage)));
  if(type!=='jab')assert.ok(TUTORIAL_PAGES[1].lines[index].includes(`${PUNCH_TYPES[type].cooldownActions} turnos`));
 }
 assert.match(TUTORIAL_PAGES[0].lines.join(' '),/Mouse esquerdo: braço esquerdo/);
 assert.match(TUTORIAL_PAGES[0].lines.join(' '),/Mouse direito: braço direito/);
 assert.ok(TUTORIAL_PAGES.every(p=>p.lines.every(line=>line.length<=35)));
 for(const page of TUTORIAL_PAGES)if(page.compact){
  const height=page.lines.reduce((sum,line)=>sum+(line?18:4),0);
  assert.ok(90+height<=282,'full text fits above the buttons');
 }
});

for(const difficulty of ['easy','normal','hard'])test(`tutorial mantém ${difficulty}, bloqueia combate e chama a intro original uma vez`,()=>{
 restartFight();s.difficulty=difficulty;
 assert.equal(beginTutorialPrompt(),true);assert.equal(tutorialFrame().screen,'prompt');
 assert.equal(beginTutorialPrompt(),false);
 const before=JSON.stringify(s);
 assert.equal(requestPunch('left'),false);assert.equal(requestPunch('right'),false);
 assert.equal(beginAttackQTE('left'),false);assert.equal(beginSpontaneousAttack(),false);assert.equal(selectPunch('uppercut'),false);
 updateOffensiveClock(100);updateCombat(100);
 assert.equal(JSON.stringify(s),before);assert.equal(s.matchIntro,null);
 tutorialAction('view');assert.equal(tutorialFrame().page,0);
 assert.ok(!tutorialButtons().some(b=>b.action==='back'));
 tutorialAction('next');tutorialAction('back');assert.equal(tutorialFrame().page,0);
 for(let page=0;page<5;page++){
  assert.equal(tutorialFrame().page,page);assert.equal(s.phase,'lobby');
  assert.equal(tutorialButtons().find(b=>b.action==='next').label,page===4?'COMEÇAR LUTA':'PRÓXIMO');
  tutorialAction('next');
 }
 assert.equal(s.phase,'lobby');assert.equal(tutorialFrame().screen,'approval');
 assert.equal(tutorialAction('next'),false);assert.equal(tutorialAction('skip'),false);
 updateTutorial(TUTORIAL_TIMING.approval-.001);assert.equal(s.phase,'lobby');assert.equal(s.matchIntro,null);
 updateTutorial(.001);
 assert.equal(s.phase,'match_intro');assert.equal(matchIntro.time,0);assert.equal(s.difficulty,difficulty);
 assert.equal(tutorialAction('next'),false);assert.equal(isTutorialActive(),false);
 finishMatchIntro();assert.equal(s.phase,'idle');
});

test('mouse escalonado, pular em qualquer página e reinício limpam a apresentação',()=>{
 const canvas={width:640,height:360,getBoundingClientRect:()=>({left:10,top:20,width:320,height:180})};
 const click=action=>{const b=tutorialButtons().find(b=>b.action===action);handleTutorialMouse({button:0,clientX:10+(b.x+5)/2,clientY:20+(b.y+5)/2},canvas);};
 for(let page=-1;page<5;page++){
  restartFight();beginTutorialPrompt();
  if(page>=0){click('view');for(let i=0;i<page;i++)click('next');}
  handleTutorialMouse({button:2},canvas);assert.equal(isTutorialActive(),true);
  click('skip');assert.equal(s.phase,'match_intro');assert.equal(matchIntro.time,0);
 }
 restartFight();beginTutorialPrompt();tutorialAction('view');tutorialAction('next');
 restartFight();assert.equal(isTutorialActive(),false);
 beginTutorialPrompt();assert.equal(tutorialFrame().screen,'prompt');assert.equal(tutorialFrame().page,0);
 tutorialAction('skip');finishMatchIntro();
});

test('teclado navega sem permitir que Enter também pule a cutscene',()=>{
 const doc=new EventTarget();initializeTutorialControls(doc);initializeTutorialControls(doc);
 const key=value=>{const event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'key',{value});doc.dispatchEvent(event);};
 restartFight();beginTutorialPrompt();key('Enter');assert.equal(tutorialFrame().page,0);
 key('ArrowRight');assert.equal(tutorialFrame().page,1);key('ArrowLeft');assert.equal(tutorialFrame().page,0);
 for(let i=0;i<5;i++)key('Enter');
 assert.equal(tutorialFrame().screen,'approval');key('Escape');key('Enter');
 assert.equal(s.phase,'lobby');updateTutorial(TUTORIAL_TIMING.approval);
 assert.equal(s.phase,'match_intro');assert.equal(matchIntro.time,0);
 finishMatchIntro();
});

test('texto Cisco completo e defesa por mouse sem instrução para botões na tela',()=>{
 const network=TUTORIAL_PAGES[2].lines.join(' ').replace(/\s+/g,' ');
 assert.match(network,/RESPONDA ÀS PERGUNTAS SOBRE NOÇÕES BÁSICAS DE REDES DE COMPUTADORES, BASEADAS NOS CONTEÚDOS DA CISCO NETWORKING ACADEMY\./);
 assert.match(network,/ACERTAR AS RESPOSTAS PERMITE EXECUTAR ATAQUES E APROVEITAR OPORTUNIDADES ESPECIAIS\./);
 assert.match(network,/ERRAR PODE FAZER VOCÊ PERDER A OPORTUNIDADE DE ATACAR\./);
 assert.doesNotMatch(network,/CERTIFICA|APROVAÇÃO OFICIAL/);
 const defense=TUTORIAL_PAGES[3].lines.join(' ');
 assert.match(defense,/MOUSE ESQUERDO: LADO ESQUERDO/);assert.match(defense,/MOUSE DIREITO: LADO DIREITO/);
 assert.doesNotMatch(defense,/botões da defesa|botões na tela/i);
});

test('pose corporal fixa por página, três bocas calmas e término aos 1,5 s',()=>{
 restartFight();beginTutorialPrompt();tutorialAction('view');
 for(const [page,pose]of ['explain','demonstrate','point','guard','finish'].entries()){
  assert.equal(tutorialFrame().page,page);assert.equal(tutorialInstructorFrame().name,'referee_tutorial_'+pose);
  const index=tutorialInstructorFrame().index;assert.equal(tutorialInstructorFrame().mouthState,'closed');
  updateTutorial(.26);assert.equal(tutorialInstructorFrame().mouthState,'slight');assert.equal(tutorialInstructorFrame().index,index);
  updateTutorial(.29);assert.equal(tutorialInstructorFrame().mouthState,'moderate');assert.equal(tutorialInstructorFrame().index,index);
  updateTutorial(.95);assert.equal(tutorialInstructorFrame().clip,'idle');
  if(page<4)tutorialAction('next');
 }
 tutorialAction('back');assert.equal(tutorialFrame().animationElapsed,0);
 tutorialAction('back');tutorialAction('next');assert.equal(tutorialInstructorFrame().name,'referee_tutorial_guard');
 restartFight();assert.equal(tutorialInstructorFrame(),null);
});

for(const fps of [30,60])test(`fala calma em ${fps} FPS: pose fixa e intervalos de boca entre 0,2 e 0,3 s`,()=>{
 restartFight();beginTutorialPrompt();tutorialAction('view');
 const changes=[],states=new Set();let last=null;
 for(let frame=0;frame<fps*1.5;frame++){
  const pose=tutorialInstructorFrame();assert.equal(pose.clip,'speech');assert.equal(pose.index,1);
  states.add(pose.mouth);if(last!==pose.mouth){changes.push(frame/fps);last=pose.mouth;}
  updateTutorial(1/fps);
 }
 assert.deepEqual([...states],[0,1,2]);assert.equal(changes.length,6);
 for(let n=1;n<changes.length;n++)assert.ok(changes[n]-changes[n-1]>=.2-1e-8&&changes[n]-changes[n-1]<=.3+1e-8);
 assert.equal(tutorialInstructorFrame().clip,'idle');restartFight();
});

for(const fps of [30,60])test(`joinha completo a ${fps} FPS, hold visível e transição uma única vez`,()=>{
 restartFight();beginTutorialPrompt();tutorialAction('view');for(let n=0;n<5;n++)tutorialAction('next');
 const indices=new Set();let frames=0,hold=0;const before=JSON.stringify(s);
 while(isTutorialActive()&&frames<fps*3){
  assert.equal(tutorialFrame().screen,'approval');assert.deepEqual(tutorialButtons(),[]);
  const pose=tutorialInstructorFrame();indices.add(pose.index);if(pose.phase==='hold')hold++;
  assert.equal(tutorialAction('skip'),false);assert.equal(tutorialAction('next'),false);
  updateCombat(1/fps);assert.equal(JSON.stringify(s),before);
  updateTutorial(1/fps);frames++;
 }
 assert.equal(s.phase,'match_intro');assert.equal(matchIntro.time,0);
 assert.ok(Math.abs(frames/fps-TUTORIAL_TIMING.approval)<=1/fps+1e-8);
 assert.ok(Math.abs(hold/fps-.85)<=1/fps+1e-8);assert.equal(indices.size,6);
 matchIntro.time=.4;updateTutorial(10);assert.equal(matchIntro.time,.4);
 finishMatchIntro();
});

test('reinício durante joinha cancela apresentação sem iniciar intro atrasada',()=>{
 restartFight();beginTutorialPrompt();tutorialAction('view');for(let n=0;n<5;n++)tutorialAction('next');
 updateTutorial(.8);restartFight();updateTutorial(10);
 assert.equal(isTutorialActive(),false);assert.equal(s.phase,'idle');assert.equal(s.matchIntro,null);
});

test('mapeamento real: esquerdo na borda defende esquerda, direito defende direita',()=>{
 const canvas=Object.assign(new EventTarget(),{width:640,height:360,getBoundingClientRect:()=>({left:0,top:0,width:640,height:360})});
 initializeInput(canvas);
 for(const [button,x,y,side]of [[0,600,100,'left'],[2,600,100,'right'],[0,350,210,'right']]){
  restartFight();Object.assign(s.counterAttack,{side:'right',type:'jab',questionId:'tutorial-mouse'});beginDefense();
  const event=new Event('mousedown');Object.defineProperties(event,{button:{value:button},clientX:{value:x},clientY:{value:y}});
  canvas.dispatchEvent(event);assert.equal(s.defense.selectedSide,side);
 }
 restartFight();
});
