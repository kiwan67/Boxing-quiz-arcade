import assert from 'node:assert/strict';
export async function checkMenu(evaluate,screenshot,reload,setFixture){
 const checks=[];
 for(const mode of ['missing','custom']){
  await setFixture(mode);await reload();
  for(let n=0;n<100;n++){
   if(await evaluate(`document.getElementById('main-menu')?.dataset.background===${JSON.stringify(mode==='custom'?'custom':'default')}&&!document.getElementById('main-menu').hidden`))break;
   await new Promise(r=>setTimeout(r,50));
  }
  const result=await evaluate(`(async()=>{
   const root=document.getElementById('main-menu');
   if(root.hidden||root.dataset.background!=='${mode==='custom'?'custom':'default'}')throw Error('Wrong background fallback/load');
   const bounds=root.getBoundingClientRect();
   if(bounds.width>640||bounds.height>362)throw Error('Menu exceeds internal viewport');
   const visibleButtons=[...root.querySelectorAll('[data-menu-buttons] button')];
   if(visibleButtons.length!==2||visibleButtons.some(b=>{const r=b.getBoundingClientRect();return r.left<bounds.left||r.right>bounds.right||r.top<bounds.top||r.bottom>bounds.bottom;}))throw Error('Clipped menu buttons');
   const nav=root.querySelector('[data-menu-buttons]'),style=getComputedStyle(nav);
   if(style.backgroundColor!=='rgba(0, 0, 0, 0)'||parseFloat(style.borderWidth)||style.boxShadow!=='none')throw Error('Old central panel remains');
   const first=visibleButtons[0].getBoundingClientRect(),second=visibleButtons[1].getBoundingClientRect();
   if(Math.abs((first.left-bounds.left)/bounds.width*640-30)>1||Math.abs((first.top-bounds.top)/bounds.height*360-181)>1||second.top<=first.bottom)throw Error('Menu options are not aligned to the left');
   if(getComputedStyle(visibleButtons[0]).backgroundColor!=='rgba(0, 0, 0, 0)'||parseFloat(getComputedStyle(visibleButtons[0]).borderWidth))throw Error('Boxed main menu buttons');
   visibleButtons[1].dispatchEvent(new PointerEvent('pointerenter'));
   if(visibleButtons[1].dataset.selected!=='true'||visibleButtons[0].dataset.selected!=='false')throw Error('Mouse selection indicator failed');
   visibleButtons[1].focus();visibleButtons[1].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));
   if(document.activeElement!==visibleButtons[0]||visibleButtons[0].dataset.selected!=='true')throw Error('Keyboard up selection failed: '+JSON.stringify({focused:document.activeElement?.outerHTML,selection:visibleButtons.map(b=>b.dataset.selected)}));
   visibleButtons[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));
   if(document.activeElement!==visibleButtons[1]||visibleButtons[1].dataset.selected!=='true')throw Error('Keyboard down selection failed: '+JSON.stringify({focused:document.activeElement?.outerHTML,selection:visibleButtons.map(b=>b.dataset.selected)}));
   const wasOpen=document.getElementById('arena-settings').open;
   document.querySelector('[data-menu-options-button]').click();
   if(root.querySelector('[data-menu-options]').hidden)throw Error('Options did not open');
   const settings=await import('/js/presentationSettings.js');
   const volume=document.querySelector('[data-arena-setting="masterVolume"]'),old=volume.value;
   volume.value='.25';volume.dispatchEvent(new Event('input',{bubbles:true}));
   if(settings.presentationSettings.masterVolume!==.25)throw Error('Volume control is fake');
   volume.value=old;volume.dispatchEvent(new Event('input',{bubbles:true}));
   document.querySelector('[data-menu-back]').click();
   if(document.getElementById('arena-settings').open!==wasOpen)throw Error('Options left audio settings expanded in the fight');
   document.querySelector('[data-menu-play]').click();
   const difficulty=document.getElementById('difficulty-lobby');if(difficulty.hidden)throw Error('Play did not open difficulty');
   document.querySelector('[data-difficulty="hard"]').click();
   if((await import('/js/gameState.js')).gameState.difficulty!=='hard')throw Error('Difficulty selection failed');
   document.getElementById('difficulty-back').click();if(root.hidden)throw Error('Back to menu failed');
   return {background:'${mode}',leftAligned:true,noCentralPanel:true,mouseSelection:true,keyboardSelection:true,play:true,options:true,volume:true,difficulty:true};
  })()`);
  checks.push(result);await screenshot('menu-'+mode);
  if(mode==='missing'){
   await evaluate(`document.querySelector('[data-menu-options-button]').click()`);
   await screenshot('menu-options');
   await evaluate(`document.querySelector('[data-menu-back]').click()`);
  }
 }
 await evaluate(`(async()=>{
  const game=await import('/js/main.js'),state=(await import('/js/gameState.js')).gameState;
  const tutorial=await import('/js/tutorial.js'),intro=await import('/js/matchIntro.js');
  document.querySelector('[data-menu-play]').click();
  document.querySelector('[data-difficulty="normal"]').click();
  for(let i=0;i<200&&document.querySelector('[data-start-fight]').disabled;i++)await new Promise(r=>setTimeout(r,25));
  document.querySelector('[data-start-fight]').click();
  if(tutorial.tutorialFrame()?.screen!=='prompt')throw Error('Missing tutorial prompt');
  tutorial.tutorialAction('view');for(let i=0;i<5;i++)tutorial.tutorialAction('next');
  if(tutorial.tutorialFrame()?.screen!=='approval')throw Error('Missing thumbs-up');
  game.update(2.1);if(state.phase!=='match_intro'||state.matchIntro.time!==0)throw Error('Intro did not follow approval');
  game.update(intro.MATCH_INTRO_DURATION);if(state.phase!=='idle')throw Error('Fight did not start');
  state.phase='victory';(await import('/js/lobby.js')).returnToLobby();
  if(state.phase!=='lobby'||document.getElementById('main-menu').hidden||!document.getElementById('game-canvas').hidden)throw Error('Return to menu failed');
 })()`);
 await setFixture(null);await reload();
 assert.equal(checks.length,2);return {checks,tutorial:true,thumbsUp:true,intro:true,returnToLobby:true};
}
