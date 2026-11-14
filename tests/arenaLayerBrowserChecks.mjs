import assert from 'node:assert/strict';

// Pixel checks run in Chrome, not in the Canvas mocks used by the unit suite.
export async function checkArenaLayers(evaluate,saveImage){
 const pixels=await evaluate(`(async()=>{
  window.sceneLayers=await import('/js/scenery.js');
  const base=sceneLayers.createScenery(640,360),rear=sceneLayers.rearRingLayer(base);
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(base,0,0);ctx.drawImage(rear,0,0);
  const expected=ctx.getImageData(0,0,640,360).data;
  const mask=rear.getContext('2d').getImageData(0,0,640,360).data;
  const protectedPixels=[];
  for(let i=0;i<mask.length;i+=4)if(mask[i+3]===255)protectedPixels.push(i);
  let samples=0,legacyViolations=0,movingFrames=0;const shots=[];
  for(const fps of [30,60])for(const strength of [0,.8,1.5])for(let frame=0;frame<fps*2;frame++){
   const time=frame/fps,announcement=strength===1.5?time:null;
   Object.assign(life.arenaLife.reaction,{age:time,strength});
   // Reproduce the original order with exactly the same seats and ring art.
   ctx.drawImage(base,0,0);ctx.drawImage(rear,0,0);
   sceneLayers.drawAudienceMotion(ctx,time,strength,announcement);
   const old=ctx.getImageData(0,0,640,360).data;
   const overwritten=protectedPixels.filter(i=>old[i]!==expected[i]||old[i+1]!==expected[i+1]||old[i+2]!==expected[i+2]).length;
   legacyViolations+=overwritten;
   const capture=overwritten>0&&shots.length===0;
   if(capture)shots.push({name:'arena-layers-before',data:canvas.toDataURL('image/png').split(',')[1]});
   sceneLayers.drawArenaScene(ctx,base,time,strength,announcement);
   const fixed=ctx.getImageData(0,0,640,360).data;
   for(const i of protectedPixels)if(fixed[i]!==expected[i]||fixed[i+1]!==expected[i+1]||fixed[i+2]!==expected[i+2])throw Error('Audience over rear ring at '+i/4);
   for(let i=163*640*4;i<fixed.length;i+=4)if(fixed[i]!==expected[i]||fixed[i+1]!==expected[i+1]||fixed[i+2]!==expected[i+2])throw Error('Audience outside stands');
   if(fixed.some((value,i)=>i<163*640*4&&value!==expected[i]))movingFrames++;
   if(capture)shots.push({name:'arena-layers-after',data:canvas.toDataURL('image/png').split(',')[1]});
   samples++;
  }
  return {samples,protectedPixels:protectedPixels.length,legacyViolations,movingFrames,shots};
 })()`);
 assert.equal(pixels.samples,540);assert.ok(pixels.protectedPixels>10000);
 assert.ok(pixels.legacyViolations>0,'the check must reproduce the reported overlap');
 assert.equal(pixels.movingFrames,pixels.samples,'crowd animation remains visible in every sampled frame');
 for(const shot of pixels.shots)await saveImage(shot.name,shot.data);
 delete pixels.shots;

 const integration=await evaluate(`(()=>{
  const checks=[],shots=[],canvas=document.getElementById('game-canvas');
  const ctx=canvas.getContext('2d'),native=ctx.drawImage;
  function verify(name){
   Object.assign(life.arenaLife.reaction,{age:.2,strength:1.5});
   for(const flash of life.arenaLife.flashes)flash.remaining=0;
   let rearToSkip,legacyActors=[],fixedActors=[],ring;
   // Render the same state using the old order, then the fixed order.
   ctx.drawImage=function(image,...args){
    const rear=sceneLayers.rearRingLayer(image);
    if(rear){ring=rear;rearToSkip=rear;native.call(this,image,...args);native.call(this,rear,...args);}
    else if(image!==rearToSkip){legacyActors.push([image.src||image.url||'cache',...args]);native.call(this,image,...args);}
   };
   try{renderer.render();}finally{ctx.drawImage=native;}
   const old=ctx.getImageData(0,0,640,360).data;
   let rearDrawn=false;
   ctx.drawImage=function(image,...args){
    if(image===ring)rearDrawn=true;
    else if(!sceneLayers.rearRingLayer(image)){
     if(!rearDrawn)throw Error('Actor/interface before rear ring: '+name);
     fixedActors.push([image.src||image.url||'cache',...args]);
    }
    native.call(this,image,...args);
   };
   try{renderer.render();}finally{ctx.drawImage=native;}
   if(JSON.stringify(legacyActors)!==JSON.stringify(fixedActors))throw Error('Actor geometry changed: '+name);
   const fixed=ctx.getImageData(0,0,640,360).data;
   for(let y=0;y<360;y++)if(y<60||y>=210)for(let x=0;x<640;x++){
    const i=(y*640+x)*4;
    for(let c=0;c<4;c++)if(old[i+c]!==fixed[i+c])throw Error('HUD, floor, actors or result buttons changed: '+name+' '+x+','+y);
   }
   shots.push({name:'arena-layers-'+name,data:canvas.toDataURL('image/png').split(',')[1]});
   checks.push({name,actorGeometryUnchanged:true,hudAndFloorUnchanged:true,rearBeforeActors:true});
  }
  restart();lobby.updateLobby();verify('combat');
  for(const target of ['enemy','player']){
   debugApi.setDebugEnabled(true);panelApi.updateDebugPanel();
   document.querySelector('[data-debug-ko-target]').value=target;
   document.querySelector('[data-debug-ko-stage]').value='full';
   document.querySelector('[data-debug-ko-expression]').value='auto';
   document.querySelector('[data-debug-ko]').click();
   ko.updateKnockout(s,3.5);verify('knockout-'+target);
   ko.updateKnockout(s,ko.KO_DURATION);ceremony.updateCeremony(s,5.1);verify('ceremony-'+target);
  }
  return {checks,shots};
 })()`);
 assert.equal(integration.checks.length,5);
 for(const shot of integration.shots)await saveImage(shot.name,shot.data);
 return {pixels,integration:integration.checks};
}
