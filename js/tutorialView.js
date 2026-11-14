import {drawPixelText} from './hud.js';
import {drawReferee} from './refereeView.js';
import {tutorialFrame,tutorialButtons,tutorialInstructorFrame} from './tutorial.js';
import {drawTutorialInstructor} from './tutorialSprites.js';

// Use the game's bitmap font, adding Portuguese diacritics on the same grid.
function text(ctx,value,x,y,scale=2,color='#f7ecd0',center=false){
 const chars=[...value.toUpperCase()];if(center)x-=Math.floor((chars.length*6-1)*scale/2);
 for(const [index,char]of chars.entries()){
  const left=x+index*6*scale,parts=char.normalize('NFD'),base=parts[0];
  drawPixelText(ctx,base==='•'?'-':base,left,y,scale,color);
  ctx.fillStyle=color;
  if(parts.includes('\u0301')){ctx.fillRect(left+3*scale,y-3*scale,scale,scale);ctx.fillRect(left+2*scale,y-2*scale,scale,scale);}
  if(parts.includes('\u0302')){ctx.fillRect(left+2*scale,y-3*scale,scale,scale);ctx.fillRect(left+scale,y-2*scale,scale,scale);ctx.fillRect(left+3*scale,y-2*scale,scale,scale);}
  if(parts.includes('\u0303')){ctx.fillRect(left+scale,y-3*scale,2*scale,scale);ctx.fillRect(left+3*scale,y-2*scale,scale,scale);}
  if(parts.includes('\u0327')){ctx.fillRect(left+2*scale,y+7*scale,scale,scale);ctx.fillRect(left+scale,y+8*scale,scale,scale);}
 }
}
function panel(ctx,x,y,w,h,color='#142036'){
 ctx.fillStyle='#080f20';ctx.fillRect(x,y,w,h);
 ctx.fillStyle='#71899f';ctx.fillRect(x+2,y+2,w-4,h-4);
 ctx.fillStyle=color;ctx.fillRect(x+4,y+4,w-8,h-8);
}
export function drawTutorial(ctx){
 const frame=tutorialFrame();if(!frame)return;
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#080f20';ctx.fillRect(0,0,640,360);
 panel(ctx,8,8,624,344);
 ctx.fillStyle='#d8ae53';ctx.fillRect(12,12,616,3);
 text(ctx,'BOXING QUIZ ARCADE',320,23,2,'#fff1a0',true);
 panel(ctx,24,54,136,278,'#101c31');
 text(ctx,'JUIZ',92,70,2,'#c8edff',true);
 if(!drawTutorialInstructor(ctx,tutorialInstructorFrame()))drawReferee(ctx,{x:92,floor:287,height:182});
 text(ctx,frame.title,184,62,2,'#fff1a0');
 let lineY=frame.compact?90:frame.screen==='pages'?101:117;
 for(const line of frame.lines){if(line)text(ctx,line,184,lineY);lineY+=frame.compact?(line?18:4):22;}
 for(const button of tutorialButtons()){
  panel(ctx,button.x,button.y,button.width,button.height,button.action==='next'||button.action==='view'?'#364a61':'#293e5c');
  text(ctx,button.label,button.x+button.width/2,button.y+Math.floor((button.height-14)/2),2,button.action==='skip'?'#c8d5df':'#fff1a0',true);
 }
 if(frame.screen==='pages')text(ctx,`${frame.page+1} DE ${frame.total}`,92,307,2,'#fff1a0',true);
 else if(frame.screen==='prompt')text(ctx,'ENTER: VER   ESC: PULAR',396,328,1,'#a6bacb',true);
 else text(ctx,'AGUARDE O JUIZ...',396,272,2,'#fff1a0',true);
 ctx.restore();
}
