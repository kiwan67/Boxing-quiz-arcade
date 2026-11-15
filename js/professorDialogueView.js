import {drawPixelText} from './hud.js';
import {professorFrame,professorSpeech} from './professorView.js';
export function wrapProfessorText(value,columns){
 const lines=[];let line='';
 for(const word of String(value).split(/\s+/)){
  if(line&&line.length+1+word.length>columns){lines.push(line);line='';}
  let rest=word;
  while(rest.length>columns){if(line){lines.push(line);line='';}lines.push(rest.slice(0,columns));rest=rest.slice(columns);}
  line+=(line?' ':'')+rest;
 }
 if(line)lines.push(line);return lines;
}
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
export function professorBubbleLayout(frame,text,width=640,height=360,camera=null,blockers=[]){
 const original={x:frame.x,y:frame.floor-frame.height*.9};
 const target={x:camera?camera.a*original.x+camera.c*original.y+camera.e:original.x,
  y:camera?camera.b*original.x+camera.d*original.y+camera.f:original.y};
 // Leave the central fighting lane visible, especially the opponent's face.
 const useRight=target.x>=width/2&&width-458>=120;
 const sideRoom=useRight?width-458:182;
 const scale=2,padding=12,maxWidth=Math.min(280,width-28,Math.max(120,sideRoom)),columns=Math.max(8,Math.floor((maxWidth-padding*2)/(6*scale)));
 const lines=wrapProfessorText(text,columns),w=Math.max(72,Math.max(...lines.map(line=>line.length))*6*scale+padding*2),h=lines.length*18+padding*2;
 const safeX=useRight?width-w-14:14;
 const head={x:target.x-12,y:target.y-12,width:24,height:24};
 const candidates=[{x:target.x+14,y:target.y+18},{x:target.x-w-14,y:target.y+18},
  {x:target.x-w-14,y:target.y-h/2},{x:target.x+14,y:target.y-h/2},
  {x:target.x-w/2,y:target.y-h-14},{x:target.x-w/2,y:target.y+14},
  {x:safeX,y:target.y+18},{x:safeX,y:target.y-h-18},
  {x:safeX,y:Math.max(82,...blockers.filter(b=>b.height<100).map(b=>b.y+b.height+8))}];
 const boxes=candidates.map(p=>({x:Math.round(clamp(p.x,14,width-w-14)),y:Math.round(clamp(p.y,82,height-h-14)),width:w,height:h}));
 const box=boxes.find(b=>!overlap(b,head)&&!blockers.some(r=>overlap(b,r)))??boxes.find(b=>!blockers.some(r=>overlap(b,r)))??boxes.at(-1);
 return {...box,lines,scale,padding,target};
}
// Portuguese bitmap accents, local to the professor's balloons.
function pixelText(ctx,value,x,y,scale){
 for(const [i,char] of [...value.toUpperCase()].entries()){
  const left=x+i*6*scale,parts=char.normalize('NFD');drawPixelText(ctx,parts[0],left,y,scale,'#fff4d3');ctx.fillStyle='#fff4d3';
  if(parts.includes('\u0301')){ctx.fillRect(left+3*scale,y-3*scale,scale,scale);ctx.fillRect(left+2*scale,y-2*scale,scale,scale);}
  if(parts.includes('\u0302')){ctx.fillRect(left+2*scale,y-3*scale,scale,scale);ctx.fillRect(left+scale,y-2*scale,scale,scale);ctx.fillRect(left+3*scale,y-2*scale,scale,scale);}
  if(parts.includes('\u0303')){ctx.fillRect(left+scale,y-3*scale,2*scale,scale);ctx.fillRect(left+3*scale,y-2*scale,scale,scale);}
  if(parts.includes('\u0327'))ctx.fillRect(left+2*scale,y+7*scale,scale,scale);
 }
}
function rect(ctx,color,x,y,w,h){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
export function drawProfessorDialogue(ctx,state,camera=null){
 const frame=professorFrame(state),speech=professorSpeech(state);if(!frame||!speech)return null;
 const blockers=[{x:210,y:76,width:220,height:270}];
 if(state.attackFeedback?.remaining>0||state.opponentCombat?.state?.startsWith('counter_'))blockers.push({x:210,y:72,width:220,height:50});
 const box=professorBubbleLayout(frame,speech.text,ctx.canvas?.width??640,ctx.canvas?.height??360,camera,blockers);
 const {x,y,width:w,height:h,target}=box;
 ctx.save();ctx.globalAlpha=speech.alpha;ctx.imageSmoothingEnabled=false;
 rect(ctx,'#080f20',x+3,y+3,w,h);
 rect(ctx,'#e5dfcb',x+2,y,w-4,h);rect(ctx,'#e5dfcb',x,y+2,w,h-4);
 rect(ctx,'#142036',x+3,y+3,w-6,h-6);rect(ctx,'#536478',x+4,y+4,w-8,2);
 const tx=clamp(target.x,x+12,x+w-12),ty=clamp(target.y,y+12,y+h-12);
 for(let step=0;step<3;step++){
  const size=6-step*2;
  if(target.x>x+w)rect(ctx,'#e5dfcb',x+w+step*2,ty-size/2,2,size);
  else if(target.x<x)rect(ctx,'#e5dfcb',x-2-step*2,ty-size/2,2,size);
  else if(target.y<y)rect(ctx,'#e5dfcb',tx-size/2,y-2-step*2,size,2);
  else rect(ctx,'#e5dfcb',tx-size/2,y+h+step*2,size,2);
 }
 box.lines.forEach((line,i)=>pixelText(ctx,line,x+(w-line.length*6*box.scale)/2,y+box.padding+i*18,box.scale));
 ctx.restore();return box;
}
