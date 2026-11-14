import {gameState} from './gameState.js';
import {beginMatchIntro} from './matchIntro.js';
import {PUNCH_TYPES,PUNCH_ORDER} from './punchTypes.js';

// Presentation inside the protected lobby phase, not a new combat/training mode.
const tutorial={matchId:null,screen:null,page:0,animationElapsed:0};
const approvalDurations=Object.freeze([.2,.3,.2,.85,.35,.2]);
export const TUTORIAL_TIMING=Object.freeze({talk:1.5,approval:approvalDurations.reduce((sum,t)=>sum+t,0),hold:.85});
function wrapParagraphs(paragraphs,gaps=true){
 return paragraphs.flatMap((paragraph,index)=>{
  const lines=[];
  for(const word of paragraph.split(' ')){
   const last=lines.length-1;
   if(last<0||lines[last].length+word.length+1>35)lines.push(word);else lines[last]+=' '+word;
  }
  return index&&gaps?['',...lines]:lines;
 });
}
const networkText=[
 'RESPONDA ÀS PERGUNTAS SOBRE NOÇÕES BÁSICAS DE REDES DE COMPUTADORES, BASEADAS NOS CONTEÚDOS DA CISCO NETWORKING ACADEMY.',
 'ACERTAR AS RESPOSTAS PERMITE EXECUTAR ATAQUES E APROVEITAR OPORTUNIDADES ESPECIAIS.',
 'ERRAR PODE FAZER VOCÊ PERDER A OPORTUNIDADE DE ATACAR.'
];
const defenseText=[
 'QUANDO O OPONENTE ATACAR, PRESTE ATENÇÃO À DIREÇÃO DO GOLPE.',
 'USE O BOTÃO ESQUERDO OU DIREITO DO MOUSE PARA DEFENDER O LADO CORRESPONDENTE.',
 'ESCOLHA O LADO CORRETO NO MOMENTO CERTO PARA REALIZAR A DEFESA.'
];
const listeners=new Set();
export function onTutorialChange(listener){listeners.add(listener);return()=>listeners.delete(listener);}
const notify=()=>{for(const listener of listeners)listener();};
export const TUTORIAL_PAGES=Object.freeze([
 {title:'COMO LUTAR',lines:[
  'Escolha o golpe nos botões abaixo',
  'do ringue: Jab, Direto, Gancho',
  'ou Uppercut. Depois, no ringue:',
  'Mouse esquerdo: braço esquerdo.',
  'Mouse direito: braço direito.',
  'Em recarga? Tente outros golpes.'
 ]},
 {title:'CONHEÇA SEUS GOLPES',lines:[
  ...PUNCH_ORDER.map(type=>`${PUNCH_TYPES[type].label}: ${PUNCH_TYPES[type].damage}${type==='jab'?' dano • rápido, sem recarga.':` de dano • ${PUNCH_TYPES[type].cooldownActions} turnos.`}`),
  'Após usar, recarregue tentando',
  'outros golpes. Esperar não conta.'
 ]},
 {title:'RESPONDA PARA ATACAR',compact:true,lines:wrapParagraphs(networkText)},
 {title:'DEFENDA-SE!',compact:true,lines:[...wrapParagraphs(defenseText,false),'',
  'CURSOR NA BORDA DO RINGUE:',
  'MOUSE ESQUERDO: LADO ESQUERDO.',
  'MOUSE DIREITO: LADO DIREITO.'
 ]},
 {title:'VIRE O JOGO!',lines:[
  'COUNTER RUSH: após uma defesa',
  'perfeita, ataque na janela',
  'especial e acerte a pergunta.',
  'COUNTER CHAIN: golpes Rush podem',
  'encadear até 4 etapas. Responda',
  'bem e repita a defesa perfeita.'
 ]}
].map(page=>Object.freeze({...page,lines:Object.freeze(page.lines)})));

export function tutorialFrame(){
 if(gameState.phase!=='lobby'||tutorial.matchId!==gameState.matchId||!tutorial.screen)return null;
 return {screen:tutorial.screen,page:tutorial.page,total:TUTORIAL_PAGES.length,animationElapsed:tutorial.animationElapsed,
  compact:tutorial.screen==='pages'&&Boolean(TUTORIAL_PAGES[tutorial.page].compact),
  title:tutorial.screen==='prompt'?'PRONTO PARA LUTAR?':tutorial.screen==='approval'?'BOA LUTA!':TUTORIAL_PAGES[tutorial.page].title,
  lines:tutorial.screen==='prompt'?['Quer aprender os controles e as','mecânicas antes de começar?']:tutorial.screen==='approval'?['TUTORIAL CONCLUÍDO.','PREPARE-SE PARA LUTAR!']:TUTORIAL_PAGES[tutorial.page].lines};
}
export function isTutorialActive(){return tutorialFrame()!==null;}
export function beginTutorialPrompt(){
 if(isTutorialActive())return false;
 Object.assign(tutorial,{matchId:gameState.matchId,screen:'prompt',page:0,animationElapsed:0});
 gameState.phase='lobby';notify();return true;
}
export function tutorialAction(action){
 const frame=tutorialFrame();if(!frame)return false;
 if(frame.screen==='approval')return false;
 if(action==='skip'){
  tutorial.screen=null;beginMatchIntro();notify();return true;
 }
 if(action==='next'&&frame.screen==='pages'&&frame.page===frame.total-1){
  tutorial.screen='approval';tutorial.animationElapsed=0;notify();return true;
 }
 if(action==='view'&&frame.screen==='prompt'){tutorial.screen='pages';tutorial.page=0;}
 else if(action==='next'&&frame.screen==='pages')tutorial.page++;
 else if(action==='back'&&frame.screen==='pages'&&frame.page>0)tutorial.page--;
 else return false;
 tutorial.animationElapsed=0;notify();return true;
}
export function updateTutorial(realDelta){
 const frame=tutorialFrame();if(!frame||!Number.isFinite(realDelta)||realDelta<0)return false;
 if(frame.screen==='pages')tutorial.animationElapsed=Math.min(TUTORIAL_TIMING.talk,tutorial.animationElapsed+realDelta);
 if(frame.screen==='approval'){
  tutorial.animationElapsed+=realDelta;
  if(tutorial.animationElapsed+1e-9>=TUTORIAL_TIMING.approval){
   tutorial.screen=null;beginMatchIntro();notify();return true;
  }
 }
 return false;
}
export function tutorialInstructorFrame(){
 const frame=tutorialFrame();if(!frame)return null;
 const t=frame.animationElapsed;
 if(frame.screen==='approval'){
  let end=0,index=approvalDurations.length-1;
  for(let i=0;i<approvalDurations.length;i++){end+=approvalDurations[i];if(t<end){index=i;break;}}
  const phase=['neutral','prepare','thumbs_up','hold','return','neutral'][index];
  if(phase==='hold')index=2+Math.floor((t-.7)/.28)%2;
  return {clip:'approval',index,phase,name:'referee_tutorial_thumbs_up',elapsed:t};
 }
 if(frame.screen!=='pages'||t+1e-9>=TUTORIAL_TIMING.talk)return {clip:'idle',index:0,name:'referee_tutorial_idle',elapsed:t};
 // Keep the page's complete pose still. Only integrated mouth artwork changes.
 const index=[1,5,2,3,4][frame.page];
 const beats=[[.24,0],[.50,1],[.73,2],[.99,1],[1.23,0],[TUTORIAL_TIMING.talk,1]];
 const mouth=beats.find(([end])=>t<end)?.[1]??0;
 return {clip:'speech',index,mouth,mouthState:['closed','slight','moderate'][mouth],name:['referee_tutorial_talk','referee_tutorial_explain','referee_tutorial_point','referee_tutorial_guard','referee_tutorial_finish','referee_tutorial_demonstrate'][index],elapsed:t};
}
export function tutorialButtons(){
 const frame=tutorialFrame();if(!frame)return [];
 if(frame.screen==='approval')return [];
 if(frame.screen==='prompt')return [
  {action:'view',label:'VER TUTORIAL',x:184,y:211,width:424,height:42},
  {action:'skip',label:'PULAR TUTORIAL',x:184,y:266,width:424,height:42}
 ];
 const y=frame.compact?282:247,height=frame.compact?34:38;
 return [
  ...(frame.page>0?[{action:'back',label:'VOLTAR',x:184,y,width:144,height}]:[]),
  {action:'next',label:frame.page===frame.total-1?'COMEÇAR LUTA':'PRÓXIMO',x:frame.page>0?344:184,y,width:frame.page>0?264:424,height},
  {action:'skip',label:'PULAR TUTORIAL',x:184,y:frame.compact?322:296,width:424,height:frame.compact?26:36}
 ];
}
export function handleTutorialMouse(event,canvas){
 if(!isTutorialActive())return false;
 if(event.button!==0)return true;
 const rect=canvas.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return true;
 const x=(event.clientX-rect.left)*canvas.width/rect.width,y=(event.clientY-rect.top)*canvas.height/rect.height;
 const button=tutorialButtons().find(b=>x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+b.height);
 if(button)tutorialAction(button.action);
 return true;
}
let keyboard;
function onKey(event){
 if(!isTutorialActive()||event.repeat||event.ctrlKey||event.altKey||event.metaKey)return;
 const frame=tutorialFrame();
 const action=event.key==='Escape'?'skip':event.key==='Enter'?(frame.screen==='prompt'?'view':'next')
  :event.key==='ArrowRight'&&frame.screen==='pages'?'next':event.key==='ArrowLeft'&&frame.screen==='pages'?'back':null;
 if(!action)return;
 event.preventDefault();event.stopImmediatePropagation?.();tutorialAction(action);
}
export function initializeTutorialControls(doc=document){
 if(keyboard===doc)return;
 keyboard?.removeEventListener?.('keydown',onKey);keyboard=doc;doc.addEventListener('keydown',onKey);
}
