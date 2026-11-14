import {drawFighterShadow} from './scenery.js';

// These atlases belong only to the tutorial. Ring/ceremony referee art is untouched.
const clips=new Map();let preload;
export function preloadTutorialSprites(){
 if(typeof Image!=='function')return null;
 return preload??=Promise.all(['instructor','approval'].map(clip=>new Promise(resolve=>{
  const image=new Image();image.onload=()=>{
   try{
    const frames=[],cell=image.naturalWidth/6;let baseline=0,height=0,width=0;
    for(let index=0;index<6;index++){
     const canvas=document.createElement('canvas');canvas.width=Math.floor(cell);canvas.height=image.naturalHeight;
     const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
     ctx.drawImage(image,index*cell,0,cell,image.naturalHeight,0,0,canvas.width,canvas.height);
     const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
     let left=canvas.width,right=-1,top=canvas.height,bottom=-1;
     for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const p=(y*canvas.width+x)*4;if(data[p+3]<200){data[p+3]=0;continue;}
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
     }
     if(right<left)throw Error(`Empty ${clip} frame ${index}`);
     ctx.putImageData(pixels,0,0);
     const trimmed=document.createElement('canvas');trimmed.width=right-left+1;trimmed.height=bottom-top+1;
     trimmed.getContext('2d').drawImage(canvas,left,top,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);
     frames.push({image:trimmed,left,top});baseline=Math.max(baseline,bottom+1);
     height=Math.max(height,bottom-top+1);width=Math.max(width,right-left+1);
    }
    clips.set(clip,{frames,axis:cell/2,baseline,height,width});
   }catch(error){console.warn('Tutorial atlas unavailable:',clip,error.message);}
   resolve();
  };
  image.onerror=()=>{console.error('Missing tutorial atlas:',clip);resolve();};
  image.src=new URL(`../assets/sprites/tutorial/referee_tutorial_${clip}.png`,import.meta.url).href;
 }))).then(preloadSpeechVariants);
}
// Atlas registration measured on the existing 362×724 pose cells. Only the
// lower-face artwork is imported; every other source pixel stays identical.
const speechMouths={
 1:{x:173,y:108,width:37,height:26,sourceX:250},
 2:{x:173,y:116,width:37,height:29,sourceX:420},
 3:{x:172,y:116,width:39,height:24,sourceX:590},
 4:{x:174,y:110,width:36,height:24,sourceX:760},
 5:{x:174,y:110,width:36,height:24,sourceX:930}
};
function preloadSpeechVariants(){
 const base=clips.get('instructor');if(!base)return;
 return new Promise(resolve=>{
  const image=new Image();image.onload=()=>{
   try{
    const variants={},regions=[];
    for(const [poseValue,region]of Object.entries(speechMouths)){
     const pose=Number(poseValue),original=base.frames[pose],x=region.x-original.left,y=region.y-original.top;
     variants[pose]=[];regions.push({pose,x,y,width:region.width,height:region.height,left:original.left,top:original.top});
     for(let mouth=0;mouth<3;mouth++){
      const canvas=document.createElement('canvas');canvas.width=original.image.width;canvas.height=original.image.height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(original.image,0,0);
      const patch=document.createElement('canvas');patch.width=region.width;patch.height=region.height;
      const patchContext=patch.getContext('2d',{willReadFrequently:true});patchContext.imageSmoothingEnabled=false;
      patchContext.drawImage(image,region.sourceX*image.naturalWidth/1024,(mouth*512+104)*image.naturalHeight/1536,36*image.naturalWidth/1024,18*image.naturalHeight/1536,0,0,patch.width,patch.height);
      if(mouth===1){
       // The middle atlas row has almost closed lips. Use the open artwork
       // with a smaller vertical aperture so this state reads as slight speech.
       patchContext.drawImage(image,region.sourceX*image.naturalWidth/1024,(2*512+104)*image.naturalHeight/1536,36*image.naturalWidth/1024,18*image.naturalHeight/1536,0,patch.height*.25,patch.width,patch.height*.55);
      }
      const pixels=ctx.getImageData(x,y,region.width,region.height),data=pixels.data;
      const artwork=patchContext.getImageData(0,0,patch.width,patch.height).data;
      // Match surrounding skin: the generated sheet has different lighting.
      // Copying its rectangle directly leaves a visible tile on the face.
      const correction=[0,0,0];let samples=0;
      for(let py=0;py<region.height;py++)for(let px=0;px<region.width;px++){
       if(px>1&&px<region.width-2&&py>1&&py<region.height-2)continue;
       const p=(py*region.width+px)*4;
       if(data[p+3]<200||artwork[p+3]<200)continue;
       for(let c=0;c<3;c++)correction[c]+=data[p+c]-artwork[p+c];
       samples++;
      }
      if(samples)for(let c=0;c<3;c++)correction[c]=Math.max(-8,Math.min(8,correction[c]/samples));
      for(let py=0;py<region.height;py++)for(let px=0;px<region.width;px++){
       const p=(py*region.width+px)*4;
       const nx=(px-(region.width-1)/2)/((region.width-1)/2);
       const ny=(py-(region.height-1)/2)/((region.height-1)/2);
       const radius=Math.hypot(nx,ny);
       if(radius>=1||data[p+3]<200||artwork[p+3]<200)continue;
       // Keep lip detail in the centre and blend into the original skin.
       // The boundary stays unchanged; no separate mouth is drawn at runtime.
       const blend=Math.min(1,(1-radius)/.3),weight=blend*blend*(3-2*blend);
       for(let c=0;c<3;c++){
        const color=Math.max(0,Math.min(255,artwork[p+c]+correction[c]));
        data[p+c]=Math.round(data[p+c]+(color-data[p+c])*weight);
       }
       // Keep original alpha: facial art never changes the silhouette.
      }
      ctx.putImageData(pixels,x,y);variants[pose].push({...original,image:canvas});
     }
    }
    clips.set('speech',{...base,variants,regions});
   }catch(error){console.warn('Tutorial speech unavailable:',error.message);}
   resolve();
  };
  image.onerror=()=>{console.error('Missing calm speech atlas');resolve();};
  image.src=new URL('../assets/sprites/tutorial/referee_tutorial_speech_variants.png',import.meta.url).href;
 });
}
export function tutorialSpeechSprite(pose,mouth){return clips.get('speech')?.variants[pose]?.[mouth]?.image;}
export function drawTutorialInstructor(ctx,frame,{x=92,floor=287,height=182}={}){
 if(!frame||frame.clip==='idle')return false;
 const clip=clips.get(frame.clip),sprite=clip?.variants?clip.variants[frame.index]?.[frame.mouth]:clip?.frames[frame.index];if(!sprite)return false;
 const scale=Math.min(height/clip.height,116/clip.width);
 drawFighterShadow(ctx,x,floor,24);
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(sprite.image,Math.round(x+(sprite.left-clip.axis)*scale),Math.round(floor+(sprite.top-clip.baseline)*scale),Math.round(sprite.image.width*scale),Math.round(sprite.image.height*scale));
 ctx.restore();return true;
}
export function tutorialSpriteAudit(){
 return [...clips].map(([clip,data])=>({clip,frames:data.variants?15:data.frames.length,axis:data.axis,baseline:data.baseline,height:data.height,width:data.width,...(data.variants?{mouthStates:3,mouthRegions:data.regions}:{})}));
}
