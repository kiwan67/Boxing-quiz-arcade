import { MENU_CONFIG, menuImageRect } from './menuConfig.js';

// All requests start together; the configured order survives out-of-order loads.
export async function preloadMenuImages(config=MENU_CONFIG,ImageType=globalThis.Image){
 if(typeof ImageType!=='function')return [];
 const images=await Promise.all([...new Set(config.backgroundImages)].map(path=>new Promise(resolve=>{
  const image=new ImageType();
  image.onload=()=>resolve(image.naturalWidth>0&&image.naturalHeight>0?image:null);
  image.onerror=()=>resolve(null);
  image.src=new URL(path,import.meta.url).href;
 })));
 return images.filter(Boolean);
}

export function createMenuCarousel(images,config=MENU_CONFIG){
 const hold=Math.max(0,config.imageDisplaySeconds),fade=Math.max(0,config.imageFadeSeconds);
 const cycle=hold+fade;
 let elapsed=0,index=0;
 return {
  reset(){elapsed=0;index=0;},
  update(delta){
   if(images.length<2||cycle<=0||!Number.isFinite(delta)||delta<=0)return false;
   const wasFading=elapsed>hold;
   elapsed+=delta;
   const steps=Math.floor(elapsed/cycle);
   if(steps){index=(index+steps)%images.length;elapsed%=cycle;}
   return Boolean(steps)||wasFading||elapsed>hold;
  },
  frame(){return {current:images[index]??null,next:images.length>1?images[(index+1)%images.length]:null,
   progress:fade>0?Math.max(0,Math.min(1,(elapsed-hold)/fade)):0};},
  draw(ctx){
   const {current,next,progress}=this.frame();if(!current)return false;
   const paint=image=>{const r=menuImageRect(image.naturalWidth,image.naturalHeight,640,360,config);ctx.drawImage(image,r.x,r.y,r.width,r.height);};
   ctx.save();ctx.globalAlpha=1;paint(current);
   // Source-over blends to (1-progress)*current + progress*next without a dark gap.
   if(next&&progress>0){ctx.globalAlpha=progress;paint(next);}
   ctx.restore();return true;
  }
 };
}
