import assert from 'node:assert/strict';

export async function checkTutorial(evaluate,saveImage){
 await evaluate(`(async()=>{
  window.tutorialApi=await import('/js/tutorial.js');
  window.combatApi=await import('/js/combat.js');
  window.tutorialSpriteApi=await import('/js/tutorialSprites.js');
  await tutorialSpriteApi.preloadTutorialSprites();
 })()`);
 const atlas=await evaluate('tutorialSpriteApi.tutorialSpriteAudit()');
 assert.equal(atlas.length,3);assert.ok(atlas.filter(clip=>clip.clip!=='speech').every(clip=>clip.frames===6));
 assert.equal(atlas.find(clip=>clip.clip==='speech').mouthStates,3);
 const speechPixels=await evaluate(`(async()=>{
  const audit=tutorialSpriteApi.tutorialSpriteAudit().find(clip=>clip.clip==='speech'),checks=[];
  const original=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src='/assets/sprites/tutorial/referee_tutorial_instructor.png';});
  const source=document.createElement('canvas');source.width=original.naturalWidth/6;source.height=original.naturalHeight;
  const sourceContext=source.getContext('2d',{willReadFrequently:true});
  for(const region of audit.mouthRegions){
   const canvas=tutorialSpriteApi.tutorialSpeechSprite(region.pose,0),ctx=canvas.getContext('2d',{willReadFrequently:true});
   const base=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   sourceContext.clearRect(0,0,source.width,source.height);sourceContext.drawImage(original,region.pose*source.width,0,source.width,source.height,0,0,source.width,source.height);
   const raw=sourceContext.getImageData(0,0,source.width,source.height).data;
   for(let state=0;state<3;state++){
    const variant=tutorialSpriteApi.tutorialSpeechSprite(region.pose,state);
    if(variant.width!==canvas.width||variant.height!==canvas.height)throw Error('Speech body dimensions changed');
    const data=variant.getContext('2d').getImageData(0,0,variant.width,variant.height).data;let changed=0;
    for(let y=0;y<variant.height;y++)for(let x=0;x<variant.width;x++){
     const p=(y*variant.width+x)*4,q=((y+region.top)*source.width+x+region.left)*4;
     const inMouth=x>=region.x&&x<region.x+region.width&&y>=region.y&&y<region.y+region.height;
     const expectedAlpha=raw[q+3]<200?0:raw[q+3];
     if(data[p+3]!==expectedAlpha)throw Error('Speech silhouette changed');
     if(!inMouth&&expectedAlpha&&[0,1,2].some(c=>data[p+c]!==raw[q+c]))throw Error('Head, eyes or body changed outside mouth');
     if(inMouth){
      const nx=(x-region.x-(region.width-1)/2)/((region.width-1)/2);
      const ny=(y-region.y-(region.height-1)/2)/((region.height-1)/2);
      if(Math.hypot(nx,ny)>=1&&expectedAlpha&&[0,1,2].some(c=>data[p+c]!==raw[q+c]))throw Error('Visible rectangular mouth boundary');
     }
     if([0,1,2].some(c=>data[p+c]!==base[p+c]))changed++;
    }
    if(state&&changed===0)throw Error('Missing distinct mouth state');
    checks.push({pose:region.pose,state,changedPixels:changed,bodyAndEyesUnchanged:true});
   }
  }
  return checks;
 })()`);
 assert.equal(speechPixels.length,15);
 const faces=await evaluate(`(()=>{
  const audit=tutorialSpriteApi.tutorialSpriteAudit().find(clip=>clip.clip==='speech');
  const canvas=document.createElement('canvas');canvas.width=360;canvas.height=500;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#142036';ctx.fillRect(0,0,360,500);ctx.imageSmoothingEnabled=false;
  audit.mouthRegions.forEach((region,row)=>{
   for(let mouth=0;mouth<3;mouth++)ctx.drawImage(tutorialSpriteApi.tutorialSpeechSprite(region.pose,mouth),region.x-36,region.y-70,108,100,mouth*120,row*100,108,100);
  });
  return canvas.toDataURL('image/png').split(',')[1];
 })()`);
 await saveImage('tutorial-speech-faces',faces);
 const cases=[];
 for(const difficulty of ['easy','normal','hard'])for(const route of ['skip','pages']){
  const result=await evaluate(`(()=>{
   restart();s.phase='lobby';lobby.updateLobby();
   const canvas=document.getElementById('game-canvas'),shots=[];
   const key=value=>document.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
   const click=action=>{
    const button=tutorialApi.tutorialButtons().find(b=>b.action===action);if(!button)throw Error('Missing button '+action);
    const bounds=canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true,clientX:bounds.left+(button.x+button.width/2)*bounds.width/640,clientY:bounds.top+(button.y+button.height/2)*bounds.height/360}));
   };
   const capture=name=>{renderer.render();shots.push({name,data:canvas.toDataURL('image/png').split(',')[1]});};
   document.querySelector('[data-difficulty="${difficulty}"]').click();
   document.querySelector('[data-menu-play]').click();
   document.querySelector('[data-start-fight]').click();
   if(tutorialApi.tutorialFrame()?.screen!=='prompt'||s.matchIntro!==null||s.phase!=='lobby')throw Error('Prompt must precede intro');
   if(!document.getElementById('difficulty-lobby').hidden||canvas.hidden||!document.getElementById('punch-controls').hidden||!document.getElementById('skip-intro').hidden)throw Error('Wrong tutorial visibility');
   const matchId=s.matchId,snapshot=JSON.stringify(s);
   document.querySelector('[data-start-fight]').click();
   document.querySelector('[data-difficulty="${difficulty==='easy'?'hard':'easy'}"]').click();
   mainGame.update(120);combatApi.updateCombat(120);
   if(combatApi.requestPunch('left')||combatApi.requestPunch('right'))throw Error('Tutorial accepted an attack');
   if(JSON.stringify(s)!==snapshot||s.matchId!==matchId)throw Error('Match advanced behind tutorial');
   const beforeClick=s.attackSequence;
   canvas.dispatchEvent(new MouseEvent('mousedown',{button:2,bubbles:true}));
   if(s.attackSequence!==beforeClick||!tutorialApi.isTutorialActive())throw Error('Right mouse changed tutorial/combat');
   if('${difficulty}'==='normal'&&'${route}'==='pages')capture('tutorial-prompt');
   if('${route}'==='skip')click('skip');
   else{
    if('${difficulty}'==='hard')key('Enter');else click('view');
    if(tutorialApi.tutorialFrame()?.page!==0)throw Error('View tutorial failed');
    click('next');click('back');
    if(tutorialApi.tutorialFrame()?.page!==0)throw Error('Back failed');
    for(let page=0;page<5;page++){
     const frame=tutorialApi.tutorialFrame();if(frame?.page!==page||frame.title!==tutorialApi.TUTORIAL_PAGES[page].title)throw Error('Wrong tutorial page');
     if(tutorialApi.tutorialFrame().animationElapsed!==0)throw Error('Page gesture was not reset');
     if('${difficulty}'==='normal')capture('tutorial-page-'+(page+1));
     const fixedPose=tutorialApi.tutorialInstructorFrame().index;
     const frozen=JSON.stringify(s);mainGame.update(.26);
     if(tutorialApi.tutorialInstructorFrame()?.mouthState!=='slight'||tutorialApi.tutorialInstructorFrame().index!==fixedPose)throw Error('Calm mouth animation missing');
     if('${difficulty}'==='normal')capture('tutorial-talk-page-'+(page+1));
     mainGame.update(.29);
     if(tutorialApi.tutorialInstructorFrame()?.mouthState!=='moderate'||tutorialApi.tutorialInstructorFrame().index!==fixedPose)throw Error('Moderate mouth or stable pose missing');
     if('${difficulty}'==='normal')capture('tutorial-moderate-page-'+(page+1));
     mainGame.update(30);if(JSON.stringify(s)!==frozen)throw Error('Page advanced combat');
     if(tutorialApi.tutorialInstructorFrame()?.clip!=='idle')throw Error('Explanation did not return to idle');
     if('${difficulty}'==='hard')key('Enter');else click('next');
    }
   }
   let approvalSeconds=0,holdSeconds=0;
   if('${route}'==='pages'){
    if(tutorialApi.tutorialFrame()?.screen!=='approval'||s.phase!=='lobby'||s.matchIntro!==null)throw Error('Final button skipped thumbs up');
    if(tutorialApi.tutorialButtons().length!==0||tutorialApi.tutorialAction('next')||tutorialApi.tutorialAction('skip'))throw Error('Approval accepts repeated clicks');
    key('Enter');key('Escape');
    if(tutorialApi.tutorialFrame()?.screen!=='approval')throw Error('Keyboard bypassed approval');
    const frozen=JSON.stringify(s),fps='${difficulty}'==='easy'?30:60,indices=new Set();
    let n=0,hold=0,next=0;const checkpoints=[0,.25,.55,.9,1.3,1.7,2];
    while(tutorialApi.isTutorialActive()&&n<fps*3){
     const pose=tutorialApi.tutorialInstructorFrame();indices.add(pose.index);if(pose.phase==='hold')hold++;
     if('${difficulty}'==='normal'&&next<checkpoints.length&&pose.elapsed>=checkpoints[next]){
      capture('tutorial-approval-'+checkpoints[next]);next++;
     }
     if(combatApi.requestPunch('left')||combatApi.requestPunch('right'))throw Error('Attack during approval');
     mainGame.update(1/fps);n++;
     if(tutorialApi.isTutorialActive()&&JSON.stringify(s)!==frozen)throw Error('Combat advanced during approval');
    }
    approvalSeconds=n/fps;holdSeconds=hold/fps;
    if(Math.abs(approvalSeconds-2.1)>1/fps+1e-8||Math.abs(holdSeconds-.85)>1/fps+1e-8||indices.size!==6)throw Error('Wrong approval timing or frames');
   }
   if(s.phase!=='match_intro'||s.matchIntro?.time!==0||tutorialApi.isTutorialActive())throw Error('Original intro did not start at zero');
   if(s.difficulty!=='${difficulty}'||s.matchId!==matchId)throw Error('Difficulty/match was lost');
   if('${difficulty}'==='normal'&&'${route}'==='pages')capture('tutorial-original-intro');
   // Run the unchanged cutscene to its natural end, then use real fight input.
   mainGame.update(intro.MATCH_INTRO_DURATION);
   if(s.phase!=='idle'||s.gameTime!==0||document.getElementById('punch-controls').hidden)throw Error('Fight did not begin normally');
   document.querySelector('[data-punch="jab"]').click();
   const bounds=canvas.getBoundingClientRect();
   canvas.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true,clientX:bounds.left+bounds.width/2,clientY:bounds.top+bounds.height/2}));
   if(s.commonAttackCount!==1||s.attackSequence!==1)throw Error('Fight controls failed after tutorial');
   return {difficulty:'${difficulty}',route:'${route}',approvalSeconds,holdSeconds,introStartedAt:0,difficultyPreserved:true,combatInput:true,shots};
  })()`);
  for(const shot of result.shots)await saveImage(shot.name,shot.data);
  delete result.shots;cases.push(result);
 }
 assert.equal(cases.length,6);
 // Explicit skip on every intermediate page, using native keyboard events.
 const skipPages=await evaluate(`(()=>{
  let checks=0;
  for(let page=0;page<5;page++){
   restart();s.phase='lobby';lobby.updateLobby();document.querySelector('[data-menu-play]').click();document.querySelector('[data-start-fight]').click();
   tutorialApi.tutorialAction('view');for(let n=0;n<page;n++)tutorialApi.tutorialAction('next');
   document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
   if(s.phase!=='match_intro'||s.matchIntro?.time!==0)throw Error('Skip failed on page '+page);
   checks++;
  }
  return checks;
 })()`);
 assert.equal(skipPages,5);
 return {cases,skipPages,atlas,speechPixels};
}
