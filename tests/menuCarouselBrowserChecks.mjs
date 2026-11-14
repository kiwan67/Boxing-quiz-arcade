import assert from 'node:assert/strict';
export async function checkMenuCarousel(evaluate,reload,setFixture){
 await setFixture('carousel');await reload();
 for(let n=0;n<100;n++){
  if(await evaluate(`document.getElementById('main-menu').dataset.background==='custom'`))break;
  await new Promise(r=>setTimeout(r,50));
 }
 const result=await evaluate(`(async()=>{
  const root=document.getElementById('main-menu'),canvas=document.getElementById('menu-canvas');
  if(root.dataset.background!=='custom')throw Error('Carousel images failed to preload');
  const game=await import('/js/main.js');
  const ctx=canvas.getContext('2d'),draw=ctx.drawImage,fill=ctx.fillRect,calls=[],title=[];
  ctx.drawImage=function(image,...rect){calls.push({src:image.src,alpha:this.globalAlpha,ratio:image.naturalWidth/image.naturalHeight,rect});return draw.call(this,image,...rect);};
  ctx.fillRect=function(...rect){if(rect[0]>=30&&rect[1]>=35&&rect[1]<130)title.push({alpha:this.globalAlpha,rect});return fill.apply(this,rect);};
  const entries=[...root.querySelectorAll('[data-menu-buttons] button')];
  const bounds=()=>JSON.stringify(entries.map(b=>{const r=b.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
  const fixed=bounds();
  const requests=()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/images/menu/')).length;
  const loaded=requests();
  try{
   // Force a fresh entry, then advance the same update path as the existing frame loop.
   entries[0].click();document.getElementById('difficulty-back').click();calls.length=0;title.length=0;
   game.update(5.25);
   if(calls.length!==2||!calls[0].src.endsWith('_01.png')||!calls[1].src.endsWith('_02.png')||calls[0].alpha!==1||calls[1].alpha!==.25)throw Error('First crossfade failed');
   for(const call of calls){const [x,y,w,h]=call.rect;if(x>0||y>0||x+w<640||y+h<360||Math.abs(w/h-call.ratio)>1e-9)throw Error('Background cover distorted');}
   if(!title.length)throw Error('Missing title');
   const firstTitle=JSON.stringify(title);calls.length=0;title.length=0;game.update(.25);
   if(calls[1]?.alpha!==.5||JSON.stringify(title)!==firstTitle||title.some(t=>t.alpha!==1)||bounds()!==fixed)throw Error('Title/buttons moved or faded');
   entries[1].click();if(root.querySelector('[data-menu-options]').hidden)throw Error('Options unavailable during fade');
   root.querySelector('[data-menu-back]').click();calls.length=0;game.update(.5);
   if(!calls[0]?.src.endsWith('_02.png')||calls.length!==1)throw Error('Second image not committed');
   calls.length=0;game.update(5.5);if(!calls[1]?.src.endsWith('_01.png')||calls[1].alpha!==.5)throw Error('Carousel did not loop');
   entries[0].click();if(document.getElementById('difficulty-lobby').hidden)throw Error('Play unavailable during fade');
   calls.length=0;game.update(100);if(calls.length)throw Error('Hidden carousel still draws');
   document.getElementById('difficulty-back').click();if(!calls[0]?.src.endsWith('_01.png'))throw Error('Return did not reset first image');
   calls.length=0;game.update(5);if(calls.length)throw Error('Return did not reset hold time');
   if(requests()!==loaded)throw Error('Images were loaded again during transitions');
   return {automatic:true,fadeQuarter:.25,fadeHalf:.5,titleFixed:true,buttonsFixed:true,buttonsDuringFade:true,loop:true,hiddenStopped:true,returnReset:true,noReloads:true,missingSkipped:true};
  }finally{ctx.drawImage=draw;ctx.fillRect=fill;}
 })()`);
 assert.equal(result.automatic,true);await setFixture(null);await reload();return result;
}
