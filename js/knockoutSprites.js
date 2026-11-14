import {bruisedSprite} from './fighterWear.js';
const sheets=new Map();let preload;
export const KO_CONTINUATION_POSES=Object.freeze(['ko_kneel_to_fall','ko_falling','ko_ground_idle','ko_ground_idle_breath']);
export function knockoutFrameOrigin(bounds,axis,baseline){return {x:bounds.left-axis,y:bounds.top-baseline};}
export function preloadKnockoutSprites(){
 if(typeof Image!=='function')return null;
 return preload??=Promise.all(['player','bot'].map(async role=>{
 await new Promise(resolve=>{
  const image=new Image();image.onload=()=>{
   try{
    const frames=[],cell=image.naturalWidth/7;let standingHeight=1,axis=cell/2,baseline=0;
    for(let f=0;f<7;f++){
     const canvas=document.createElement('canvas');canvas.width=Math.floor(cell);canvas.height=image.naturalHeight;
     const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(image,f*cell,0,cell,image.naturalHeight,0,0,canvas.width,canvas.height);
     const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,right=-1,top=canvas.height,bottom=-1;
     for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>200){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
     if(right<left)throw Error('Empty knockout frame');
     if(f===0){
      standingHeight=bottom-top+1;baseline=bottom+1;
      let footLeft=canvas.width,footRight=0;
      for(let y=bottom-Math.ceil(standingHeight*.07);y<=bottom;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>200){footLeft=Math.min(footLeft,x);footRight=Math.max(footRight,x);}
      axis=(footLeft+footRight)/2;
     }
     const trimmed=document.createElement('canvas');trimmed.width=right-left+1;trimmed.height=bottom-top+1;
     trimmed.naturalWidth=trimmed.width;trimmed.naturalHeight=trimmed.height;trimmed.url=`${role}-ko-kneel-${f}`;
     trimmed.getContext('2d').drawImage(canvas,left,top,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);
     frames.push({image:trimmed,left,top});
    }
    sheets.set(role,{frames,standingHeight,axis,baseline});
   }catch(error){console.warn('KO atlas unavailable:',role,error.message);}
   resolve();
  };image.onerror=()=>resolve();image.src=new URL(`../assets/sprites/knockout/${role}_ko_kneel.png`,import.meta.url).href;
 });
 // The continuation is drawn at the existing knee pose's anatomical scale.
 // One canvas axis/baseline is shared by every cell, including wider prone poses.
 const sheet=sheets.get(role);if(!sheet)return;
 await new Promise(resolve=>{
  const image=new Image();image.onload=()=>{
   try{
   const cell=image.naturalWidth/4,frames=[];let baseline=0;
   for(let i=0;i<4;i++){
    const canvas=document.createElement('canvas');canvas.width=Math.floor(cell);canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,i*cell,0,cell,image.naturalHeight,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
    let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
     const p=(y*canvas.width+x)*4;
     if(d[p+3]<200){d[p+3]=0;continue;}
     left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    if(right<left)throw Error(`Empty continuation frame ${i}`);
    ctx.putImageData(pixels,0,0);baseline=Math.max(baseline,bottom+1);
    const trimmed=document.createElement('canvas');trimmed.width=right-left+1;trimmed.height=bottom-top+1;
    trimmed.naturalWidth=trimmed.width;trimmed.naturalHeight=trimmed.height;trimmed.url=`${role}-ko-ground-${i}`;
    trimmed.getContext('2d').drawImage(canvas,left,top,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);
    frames.push({image:trimmed,left,top});
   }
   const knee=sheet.frames[5],ratio=knee.image.height/frames[0].image.height;
   for(const [i,frame]of frames.entries())sheet.frames.push({...frame,name:`${role==='bot'?'opponent':role}_${KO_CONTINUATION_POSES[i]}`,scaleRatio:ratio,axis:cell/2,baseline});
   }catch(error){console.error('KO continuation unavailable:',role,error.message);}
   resolve();
  };image.onerror=()=>{console.error('Missing KO continuation:',role);resolve();};
  image.src=new URL(`../assets/sprites/knockout/${role}_ko_ground.png`,import.meta.url).href;
 });
 }));
}
export function drawKnockoutPose(ctx,role,index,{x=320,floor=276,standingHeight=180,direction=1}={}){
 const sheet=sheets.get(role),frame=sheet?.frames[index];if(!frame)return false;
 const scale=standingHeight/sheet.standingHeight*(frame.scaleRatio??1),origin=knockoutFrameOrigin(frame,frame.axis??sheet.axis,frame.baseline??sheet.baseline);
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(x,floor);ctx.scale(direction,1);
 ctx.drawImage(bruisedSprite(frame.image,role),Math.round(origin.x*scale),Math.round(origin.y*scale),Math.round(frame.image.width*scale),Math.round(frame.image.height*scale));
 ctx.restore();return true;
}
export function drawKneelingKnockout(ctx,role,x,floor,standingHeight,time=0){
 return drawKnockoutPose(ctx,role,Math.floor(time/.8)%2?6:5,{x,floor,standingHeight,direction:1});
}
export function knockoutSpriteAudit(){return [...sheets].map(([role,s])=>({role,frames:s.frames.length,axis:s.axis,baseline:s.baseline,standingHeight:s.standingHeight,framesBounds:s.frames.map(f=>({name:f.name,left:f.left,top:f.top,width:f.image.width,height:f.image.height,axis:f.axis??s.axis,baseline:f.baseline??s.baseline,scaleRatio:f.scaleRatio??1}))}));}
