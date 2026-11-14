import { drawPixelText } from './hud.js';
import { ANSWER_LABELS, DEBUG_QTE } from './questions.js';
import { gameState } from './gameState.js';

export function wrapQuestionText(value, columns=46){
 const lines=[];let line='';
 for(const word of String(value).split(/\s+/)){
  if(line&&line.length+word.length+1>columns){lines.push(line);line='';}
  let rest=word;
  while(rest.length>columns){if(line){lines.push(line);line='';}lines.push(rest.slice(0,columns));rest=rest.slice(columns);}
  line+=(line?' ':'')+rest;
 }
 if(line)lines.push(line);
 return lines;
}
// Same 5x7 arcade font, with Portuguese accents on the bitmap grid.
function text(ctx,value,x,y,scale=2,color='#f7ecd0'){
 for(const [i,char] of [...value.toUpperCase()].entries()){
  const left=x+i*6*scale,parts=char.normalize('NFD');
  if(char==='['||char===']'){const edge=char==='['?0:3;ctx.fillStyle=color;ctx.fillRect(left+edge*scale,y,scale,7*scale);ctx.fillRect(left,y,4*scale,scale);ctx.fillRect(left,y+6*scale,4*scale,scale);continue;}
  if(char===')'){ctx.fillStyle=color;ctx.fillRect(left+2*scale,y,scale,scale);ctx.fillRect(left+3*scale,y+scale,scale,5*scale);ctx.fillRect(left+2*scale,y+6*scale,scale,scale);continue;}
  if(char!=='/')drawPixelText(ctx,parts[0],left,y,scale,color);ctx.fillStyle=color;
  if(parts.includes('\u0301')){ctx.fillRect(left+3*scale,y-3*scale,scale,scale);ctx.fillRect(left+2*scale,y-2*scale,scale,scale);}
  if(parts.includes('\u0302')){ctx.fillRect(left+2*scale,y-3*scale,scale,scale);ctx.fillRect(left+scale,y-2*scale,scale,scale);ctx.fillRect(left+3*scale,y-2*scale,scale,scale);}
  if(parts.includes('\u0303')){ctx.fillRect(left+scale,y-3*scale,2*scale,scale);ctx.fillRect(left+3*scale,y-2*scale,scale,scale);}
  if(parts.includes('\u0327')){ctx.fillRect(left+2*scale,y+7*scale,scale,scale);ctx.fillRect(left+scale,y+8*scale,scale,scale);}
  if(char==='/'){for(let n=0;n<5;n++)ctx.fillRect(left+(4-n)*scale,y+(n+1)*scale,scale,scale);}
 }
}
function rect(ctx,color,x,y,width,height){ctx.fillStyle=color;ctx.fillRect(x,y,width,height);}
export function questionLayout(question, result=false){
 const scale=result?1.5:2, lineHeight=scale*9;
 const lines=wrapQuestionText(question?.statement??'',result?92:46);
 const top=result?Math.max(140,112+lines.length*10+10):Math.max(174,112+lines.length*20+8);
 const buttons=ANSWER_LABELS.map((answer,i)=>({answer,x:40+(i%2)*288,y:0,width:272,height:0,
  lines:wrapQuestionText(`[${i+1}] ${answer}) ${question?.options?.[i]??''}`,Math.floor(262/(6*scale))),scale,lineHeight}));
 let y=top;
 for(let row=0;row<2;row++){
  const pair=buttons.slice(row*2,row*2+2),height=Math.max(result?40:64,...pair.map(b=>b.lines.length*lineHeight+14));
  for(const b of pair){b.y=y;b.height=height;}
  y+=height+8;
 }
 return {lines,buttons,bottom:y};
}
// Drawing and hit testing use the same grid.
export const QTE_BUTTONS=Object.freeze(questionLayout(null).buttons.map(b=>Object.freeze(b)));
export function qteAnswerAt(x,y,question=gameState.qte.question){
 if(!question)return null;
 return questionLayout(question).buttons.find(b=>x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+b.height)?.answer??null;
}
export function questionResultLabel(result){return result.outcome==='correct'?'RESPOSTA CORRETA!':result.outcome==='timeout'?'TEMPO ESGOTADO!':'RESPOSTA INCORRETA!';}
export function drawQTE(ctx,state,debug=DEBUG_QTE){
 const mode=state.playerCombat.state,qte=state.qte;
 const active=['attack_qte','counter_rush_qte','defense_question_qte'].includes(mode)&&qte.question;
 const result=qte.lastResult;
 if(!active){
  if(!result||qte.feedbackRemaining<=0)return;
  // The resolved question stays on screen while only combat time is held.
  ctx.save();ctx.globalAlpha=1;
  rect(ctx,'#e5dfcb',24,76,592,276);rect(ctx,'#142036',28,80,584,268);
  const color=result.outcome==='correct'?'#5ee08b':'#ff7a87';
  text(ctx,questionResultLabel(result),40,88,2,color);
  const layout=questionLayout(result,true);
  layout.lines.forEach((line,i)=>text(ctx,line,40,112+i*10,1));
  for(const button of layout.buttons){
   const correct=button.answer===result.correctAnswer,selected=button.answer===result.answer;
   const border=correct?'#5ee08b':selected?'#ff7a87':'#71899f';
   rect(ctx,border,button.x,button.y,button.width,button.height);
   rect(ctx,correct?'#193f32':selected?'#612633':'#293e5c',button.x+2,button.y+2,button.width-4,button.height-4);
   button.lines.forEach((line,i)=>text(ctx,line,button.x+5,button.y+9+i*button.lineHeight,button.scale,correct?'#5ee08b':selected?'#ff7a87':'#c8d5df'));
   // Marker remains visible even when the selected answer is also correct.
   if(selected)rect(ctx,'#fff1a0',button.x+4,button.y+3,button.width-8,2);
  }
  const feedbackY=layout.bottom+2;
  text(ctx,`CORRETA: ${result.correctAnswer} / SUA ESCOLHA: ${result.answer??'-'}`,40,feedbackY,1,'#fff1a0');
  wrapQuestionText(result.explanation,46).forEach((line,i)=>text(ctx,line,40,feedbackY+20+i*20,2));
  text(ctx,`RETOMANDO EM ${Math.ceil(qte.feedbackRemaining)} S`,40,337,1,'#fff1a0');
  ctx.restore();return;
 }
 const layout=questionLayout(qte.question);
 ctx.save();ctx.globalAlpha=.58;rect(ctx,'#080f20',0,74,640,286);ctx.globalAlpha=1;
 rect(ctx,'#e5dfcb',24,76,592,276);rect(ctx,'#142036',28,80,584,268);
 text(ctx,mode==='counter_rush_qte'?'COUNTER RUSH':mode==='defense_question_qte'?'DEFESA - REDES':'ATAQUE - REDES',40,90,2,'#fff1a0');
 text(ctx,`${String(Math.ceil(qte.remaining)).padStart(2,'0')} S`,536,90,2,'#fff1a0');
 layout.lines.forEach((line,i)=>text(ctx,line,40,112+i*20));
 for(const button of layout.buttons){
  rect(ctx,'#a6bacb',button.x,button.y,button.width,button.height);
  rect(ctx,'#293e5c',button.x+2,button.y+2,button.width-4,button.height-4);
  button.lines.forEach((line,i)=>text(ctx,line,button.x+5,button.y+9+i*button.lineHeight));
 }
 text(ctx,'TECLAS 1 2 3 4 OU MOUSE',40,324,1,'#c8d5df');
 rect(ctx,'#354762',40,334,560,6);
 rect(ctx,'#efbe3b',40,334,Math.round(560*Math.max(0,Math.min(1,qte.remaining/qte.question.timeLimit))),6);
 if(debug)text(ctx,`DEBUG: ${qte.question.correctAnswer}`,400,322,1,'#899bb4');
 ctx.restore();
}

let reviewResult,reviewMatch;
export function updateQuestionReview(doc=globalThis.document){
 const root=doc?.getElementById?.('question-review');if(!root)return;
 const result=gameState.qte.lastResult;
 if(reviewResult===result&&reviewMatch===gameState.matchId)return;
 reviewResult=result;reviewMatch=gameState.matchId;root.hidden=!result;
 root.setAttribute?.('data-outcome',result?.outcome??'');
 const summary=root.querySelector?.('summary');
 if(summary)summary.textContent=result?`${questionResultLabel(result)} — EXPLICAÇÃO`:'ÚLTIMA RESPOSTA — EXPLICAÇÃO';
 const content=doc.getElementById('question-review-content');
 if(content)content.textContent=result?`${questionResultLabel(result)}\n${result.statement}\n${result.answer?`Escolhida ${result.answer}: ${result.options[ANSWER_LABELS.indexOf(result.answer)]}\n`:''}Correta ${result.correctAnswer}: ${result.options[result.correctIndex]}\n${result.explanation}`:'';
 if(!result)root.open=false;
}
