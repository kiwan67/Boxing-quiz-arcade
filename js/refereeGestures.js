// Complete source-frame sequences. Reactions reuse compatible drawn poses rather
// than articulating limbs. Intro and final-ceremony assets are never replaced.
export const REFEREE_CLIPS = {
 referee_idle:{sheet:'concerned',frames:[0,1,0],durations:[.5,.5,.5],loop:true},
 referee_facepalm:{sheet:'facepalm',frames:[0,1,2,3,4,5,6],durations:[.15,.25,.35,.3,.4,.45,.3]},
 referee_shocked:{sheet:'shocked',frames:[0,1,2,3,4,5],durations:[.04,.06,.16,.28,.14,.12]},
 referee_clap:{sheet:'clap',frames:[0,1,2,3,4,3,4,3,4,5,0],durations:[.12,.2,.16,.16,.16,.16,.16,.16,.16,.2,.2]},
 referee_concerned:{sheet:'concerned',frames:[0,2,3,2],durations:[.2,.35,.95,.5]},
 referee_approval:{sheet:'approval',frames:[0,1,2,3,3,4,0],durations:[.1,.18,.22,.25,.25,.28,.22]},
 referee_reaction_light:{sheet:'concerned',frames:[0,1,0],durations:[.12,.55,.28]},
 referee_reaction_medium:{sheet:'shocked',frames:[0,1,2,1,0],durations:[.1,.14,.5,.18,.18]},
 referee_reaction_strong:{sheet:'shocked',frames:[0,1,2,3,4,5],durations:[.04,.06,.16,.28,.14,.12]}
};
export function refereeClipDuration(clip) { return clip.durations.reduce((sum,time)=>sum+time,0); }
export function refereeFrameIndex(clip,elapsed) {
 const duration=refereeClipDuration(clip);
 let time=clip.loop?Math.max(0,elapsed)%duration:Math.max(0,elapsed);
 for(let i=0;i<clip.frames.length;i++){if(time<clip.durations[i]-1e-9)return i;time-=clip.durations[i];}
 return clip.frames.length-1;
}
const counts={facepalm:7,shocked:6,clap:6,concerned:4,approval:5};
const sheets=new Map();let preload;
export function preloadRefereeReactions(){
 if(typeof Image!=='function')return null;
 return preload??=Promise.all(Object.entries(counts).map(([name,count])=>new Promise(resolve=>{
  const image=new Image();image.onload=()=>{
   const cell=image.naturalWidth/count,canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   try{
    ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data, anchors=[];let tallest=0;
    for(let f=0;f<count;f++){
     let top=canvas.height,bottom=0;
     for(let y=0;y<canvas.height;y++)for(let x=Math.ceil(f*cell);x<Math.floor((f+1)*cell);x++)if(data[(y*canvas.width+x)*4+3]>200){top=Math.min(top,y);bottom=Math.max(bottom,y);}
     let l=(f+1)*cell,r=f*cell;
     for(let y=Math.max(top,bottom-Math.ceil((bottom-top)*.055));y<=bottom;y++)for(let x=Math.ceil(f*cell);x<Math.floor((f+1)*cell);x++)if(data[(y*canvas.width+x)*4+3]>200){l=Math.min(l,x);r=Math.max(r,x);}
     tallest=Math.max(tallest,bottom-top+1);anchors.push({footX:(l+r)/2-f*cell,bottom:bottom+1});
    }
    sheets.set(name,{image,cell,height:canvas.height,tallest,anchors});
   }catch{/* Missing/unsupported imagery falls back to the intact neutral sprite. */}
   resolve();
  };image.onerror=()=>resolve();image.src=new URL(`../assets/sprites/referee-reactions/referee_${name}.png`,import.meta.url).href;
 })));
}
export function drawRefereeReaction(ctx,frame,x,floor,height){
 const clip=REFEREE_CLIPS[frame.clip],sheet=clip&&sheets.get(clip.sheet);if(!sheet)return false;
 const index=clip.frames[refereeFrameIndex(clip,frame.elapsed)];
 const anchor=sheet.anchors[index],scale=height/sheet.tallest;
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(sheet.image,index*sheet.cell,0,sheet.cell,sheet.height,Math.round(x-anchor.footX*scale),Math.round(floor-anchor.bottom*scale),Math.round(sheet.cell*scale),Math.round(sheet.height*scale));
 ctx.restore();return true;
}

