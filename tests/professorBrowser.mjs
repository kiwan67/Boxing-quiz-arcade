// Optional real Canvas smoke test, using an installed Chromium browser and no packages.
// Screenshots/profile stay under the OS temp directory, outside the repository.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve,extname,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),artifacts=resolve(tmpdir(),'boxing-professor-'+process.pid);
const sidePreview=process.env.BOXING_SIDE_PREVIEW==='1';
await mkdir(artifacts,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+new URL(req.url,'http://local').pathname);
  if(!path.startsWith(root+sep))throw Error('Invalid path');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[extname(path)]||'application/octet-stream');
  res.end(await readFile(path));
 }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=spawn(process.env.BOXING_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
 '--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
 '--password-store=basic','--disable-features=AppBoundEncryption',
 '--user-data-dir='+resolve(artifacts,'profile'),'about:blank'
],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let socket,stderr='';browser.stderr.on('data',data=>stderr=(stderr+data).slice(-2000));
browser.on('error',error=>stderr+=error.message);
try{
 let target;
 for(let n=0;n<100;n++){
  try{
   let port;
   try{port=(await readFile(resolve(artifacts,'profile/DevToolsActivePort'),'utf8')).split('\n')[0];}
   catch{port=/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/.exec(stderr)?.[1];}
   if(!port)throw Error('Waiting for DevTools');
   target=(await(await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(1000)})).json()).find(t=>t.type==='page');
   if(target)break;
  }catch{await new Promise(r=>setTimeout(r,100));}
 }
 assert.ok(target,'Browser unavailable: '+stderr);
 socket=new WebSocket(target.webSocketDebuggerUrl);await once(socket,'open');
 let id=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',({data})=>{
  const message=JSON.parse(data);
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);
  const callback=pending.get(message.id);if(!callback)return;
  pending.delete(message.id);clearTimeout(callback.timer);
  if(message.error)callback.reject(Error(JSON.stringify(message.error)));else callback.resolve(message.result);
 });
 const call=(method,params={})=>new Promise((resolve,reject)=>{
  const request=++id,timer=setTimeout(()=>{pending.delete(request);reject(Error('Timed out: '+method));},45000);
  pending.set(request,{resolve,reject,timer});socket.send(JSON.stringify({id:request,method,params}));
 });
 const evaluate=async expression=>{
  const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;
 };
 await call('Runtime.enable');await call('Page.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:1000,height:800,deviceScaleFactor:1,mobile:false});
 await call('Page.addScriptToEvaluateOnNewDocument',{source:'window.requestAnimationFrame=()=>0;'});
 await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/${sidePreview?'docs/professor-side-entry-preview/index.html':'index.html'}`});
 for(let n=0;n<100;n++){
  if(await evaluate('document.readyState==="complete"&&Boolean(document.getElementById("game-canvas"))'))break;
  await new Promise(r=>setTimeout(r,50));
 }
 if(sidePreview){
  for(let n=0;n<100;n++){
   if(await evaluate('Boolean(window.sidePreview?.ready)'))break;
   await new Promise(r=>setTimeout(r,100));
  }
  const result=await evaluate(`(()=>{
   const api=window.sidePreview,info=[],sheet=document.createElement('canvas');sheet.width=2040;sheet.height=2576;
   const ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
   const times=[0,api.climbStart-.01,...Array.from({length:8},(_,i)=>api.climbStart+(i+.5)*.9/8),api.duration];
   for(let i=0;i<times.length;i++){
    const f=api.at(times[i]);if(!f.loaded)throw Error('Missing PNG');info.push(f);
    ctx.drawImage(api.canvas,420,40,340,322,(i%3)*680,Math.floor(i/3)*644,680,644);
   }
   window.previewSheet=sheet.toDataURL('image/png').split(',')[1];return info;
  })()`);
  const climb=result.filter(f=>f.stage==='climb');assert.equal(climb.length,8);
  assert.deepEqual(climb.map(f=>f.file),Array.from({length:8},(_,i)=>`frame_0${i+1}.png`));
  await writeFile(resolve(artifacts,'side-entry-proposal.png'),Buffer.from(await evaluate('previewSheet'),'base64'));
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate('sidePreview.at(sidePreview.climbStart+.85).frame'),8);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({proposal:true,appliedToGame:false,frames:result,mobileViewport:true,runtimeErrors:errors,preview:resolve(artifacts,'side-entry-proposal.png')},null,2));
 }else{
 const result=await evaluate(`(async()=>{
  await import('/js/main.js');
  window.s=(await import('/js/gameState.js')).gameState;
  window.debugApi=await import('/js/debug.js');window.panel=await import('/js/debugPanel.js');
  window.view=await import('/js/professorView.js');window.renderer=await import('/js/render.js');
  const anim=await import('/js/professorAnimation.js');
  await(await import('/js/professorSprites.js')).preloadProfessorSprites();
  await(await import('/js/professorSadSprites.js')).preloadProfessorSadSprites();
  await(await import('/js/fighterSprites.js')).preloadFighterSprites();
  (await import('/js/restart.js')).restartFight();s.phase='idle';s.matchResult=null;
  document.getElementById('game-canvas').hidden=false;
  document.getElementById('main-menu').hidden=true;document.getElementById('difficulty-lobby').hidden=true;
  (await import('/js/pause.js')).syncPauseControls();debugApi.setDebugEnabled(true);panel.updateDebugPanel();
  const baseline=JSON.stringify(s),sheet=document.createElement('canvas');sheet.width=1440;sheet.height=2520;
  const ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
  const start=anim.PROFESSOR_ENTRY_TIMING.prepare+anim.PROFESSOR_ENTRY_TIMING.approach+anim.PROFESSOR_ENTRY_TIMING.stop+anim.PROFESSOR_ENTRY_TIMING.edge;
  window.professorClimbStart=start;window.professorClimbDuration=anim.PROFESSOR_ENTRY_TIMING.climb;
  const oldStopTime=anim.PROFESSOR_ENTRY_TIMING.prepare+(anim.PROFESSOR_WALK_ADJUSTMENT.previousStopX-anim.PROFESSOR_POSITIONS.outside.x)/anim.PROFESSOR_WALK_ADJUSTMENT.walkSpeed;
  const checkpoints=[null,oldStopTime,start-.01,...Array.from({length:8},(_,i)=>start+(i+.5)*anim.PROFESSOR_ENTRY_TIMING.climb/8),anim.PROFESSOR_ENTRY_DURATION];
  const info=[];
  const cadence=[];
  for(const offset of [.05,.12]){
   debugApi.setProfessorDebugMode('entry');debugApi.updateProfessorDebugAnimation(s,anim.PROFESSOR_ENTRY_TIMING.prepare+offset);
   renderer.render();panel.updateDebugPanel();cadence.push(view.professorRenderInfo(s));
  }
  if(cadence[0].frame!==cadence[1].frame||cadence[0].walkingFrameFrequency!==6||Math.abs(cadence[1].x-cadence[0].x-28*.07)>.001)throw Error('Walk cadence is coupled to movement');
  if(!document.querySelector('[data-debug-professor-info]').textContent.includes('FPS CAMINHADA: 6.00'))throw Error('Debug missing walk frequency');
  for(let i=0;i<checkpoints.length;i++){
   debugApi.setProfessorDebugMode(checkpoints[i]===null?'outside':'entry');
   if(checkpoints[i]!==null)debugApi.updateProfessorDebugAnimation(s,checkpoints[i]);
   renderer.render();panel.updateDebugPanel();const current=view.professorRenderInfo(s);info.push(current);
   if(!current.loaded)throw Error('Missing real browser texture: '+current.file);
   if(current.stage!=='observing'&&!(current.stageDuration>0))throw Error('Debug missing stage duration');
   if(i===1&&Math.abs(current.x-anim.PROFESSOR_WALK_ADJUSTMENT.previousStopX)>.001)throw Error('Old stop checkpoint moved');
   if(i===2&&(current.stage!=='stop'||Math.abs(current.x-anim.PROFESSOR_WALK_ADJUSTMENT.stopX)>.001))throw Error('New stop is not reached before climbing');
   if(i>=3&&i<11){
    if(current.file!=='frame_0'+(i-2)+'.png'||current.frame!==i-2||current.totalFrames!==8)throw Error('Incorrect climb PNG: '+JSON.stringify(current));
    if(!document.querySelector('[data-debug-professor-info]').textContent.includes(current.file))throw Error('Debug missing PNG filename');
   }
   ctx.drawImage(document.getElementById('game-canvas'),400,45,240,315,(i%3)*480,Math.floor(i/3)*630,480,630);
   const before=JSON.stringify(view.professorFrame(s));
   s.playerCombat.state='counter_rush_cutscene';debugApi.updateProfessorDebugAnimation(s,99);renderer.render();
   if(JSON.stringify(view.professorFrame(s))!==before)throw Error('Rush reset the professor');
   s.playerCombat.state='idle';
  }
  if(JSON.stringify(s)!==baseline)throw Error('Visual debug changed real progress');
  window.professorSheet=sheet.toDataURL('image/png').split(',')[1];
  debugApi.setDebugEnabled(false);panel.updateDebugPanel();return info;
 })()`);
 // Exercise the real desktop key and touch path on the same panel.
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'F3',code:'F3',windowsVirtualKeyCode:114});
 await call('Input.dispatchKeyEvent',{type:'keyUp',key:'F3',code:'F3',windowsVirtualKeyCode:114});
 assert.equal(await evaluate('debugApi.debugState.enabled'),true);
 await evaluate('debugApi.setDebugEnabled(false);panel.updateDebugPanel()');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 const touch=async selector=>{
  const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 };
 await touch('#debug-toggle');assert.equal(await evaluate('debugApi.debugState.enabled'),true);
 await touch('[data-debug-professor-repeat]');assert.equal(await evaluate('debugApi.debugState.professorMode'),'entry');
 const mobileFrames=await evaluate(`(()=>{
  const files=[];
  for(let i=0;i<8;i++){
   debugApi.setProfessorDebugMode('entry');debugApi.updateProfessorDebugAnimation(s,professorClimbStart+(i+.5)*professorClimbDuration/8);
   renderer.render();panel.updateDebugPanel();const info=view.professorRenderInfo(s);
   if(!info.loaded||info.totalFrames!==8)throw Error('Missing mobile climb PNG');files.push(info.file);
  }
  return files;
 })()`);
 assert.equal(new Set(mobileFrames).size,8);
 let presentation=null;
 if(process.env.BOXING_PROFESSOR_PRESENTATION==='1'){
  await evaluate(`(()=>{
   window.presentationBaseline=JSON.stringify(s);window.presentationShots=document.createElement('canvas');
   presentationShots.width=1280;presentationShots.height=1800;
   window.capturePresentation=(i)=>{const c=presentationShots.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(document.getElementById('game-canvas'),(i%2)*640,Math.floor(i/2)*360);};
  })()`);
  const lines=[];
  for(const [i,action] of ['appearance','entry','strong','defense','sequence'].entries()){
   await evaluate(`debugApi.setProfessorDebugMode('inside');panel.updateDebugPanel()`);
   await touch(`[data-debug-professor-action="${action}"]`);
   const info=await evaluate(`(()=>{
    debugApi.updateProfessorDebugAnimation(s,.3);renderer.render();panel.updateDebugPanel();capturePresentation(${i});
    return {kind:view.professorSpeech(s)?.kind,text:view.professorSpeech(s)?.text,info:view.professorRenderInfo(s)};
   })()`);
   assert.equal(info.kind,action);lines.push(info);
   if(i===0){
    await evaluate(`debugApi.debugState.expanded=false;panel.updateDebugPanel();document.getElementById('game-canvas').scrollIntoView({block:'start'})`);
    const shot=await call('Page.captureScreenshot',{format:'png'});
    await writeFile(resolve(artifacts,'professor-dialogue-mobile.png'),Buffer.from(shot.data,'base64'));
    await evaluate(`debugApi.debugState.expanded=true;panel.updateDebugPanel()`);
   }
  }
  await evaluate(`debugApi.setProfessorDebugMode('inside');panel.updateDebugPanel()`);
  await touch('[data-debug-professor-action="sadExit"]');
  const exit=await evaluate(`(()=>{
   const frames=[];
   for(const [i,dt] of [.4,.9,1.2,3.2,100].entries()){
    debugApi.updateProfessorDebugAnimation(s,dt);renderer.render();panel.updateDebugPanel();capturePresentation(i+5);frames.push(view.professorRenderInfo(s));
    if(i===1){
     const frame=JSON.stringify(view.professorFrame(s)),speech=JSON.stringify(view.professorSpeech(s));
     for(const mode of ['counter_rush_cutscene','counter_rush_flash']){
      s.playerCombat.state=mode;debugApi.updateProfessorDebugAnimation(s,99);renderer.render();
      if(JSON.stringify(view.professorFrame(s))!==frame||JSON.stringify(view.professorSpeech(s))!==speech)throw Error('Rush advanced presentation');
     }
     s.playerCombat.state='idle';s.phase='paused';debugApi.updateProfessorDebugAnimation(s,99);
     if(JSON.stringify(view.professorFrame(s))!==frame)throw Error('Pause advanced exit');s.phase='idle';
    }
   }
   if(frames[0].file!=='professor_sad_exit_v1.png'||frames[0].stage!=='disappointed')throw Error('Sad reaction sheet not used');
   if(frames[2].animation!=='sadWalking'||frames.at(-1)!==null)throw Error('Sad exit did not finish');
   if(JSON.stringify(s)!==presentationBaseline)throw Error('Presentation debug mutated real match');
   window.presentationSheet=presentationShots.toDataURL('image/png').split(',')[1];
   return frames;
  })()`);
  // A live question must cover the scene without a balloon on top of answers.
  const overlay=await evaluate(`(()=>{
   debugApi.setProfessorDebugMode('inside');debugApi.previewProfessorPresentation('defense');debugApi.updateProfessorDebugAnimation(s,.3);
   const oldQuestion=s.qte.question,oldRemaining=s.qte.remaining,oldMode=s.playerCombat.state;
   s.qte.question={id:'visual-overlay',statement:'QUAL CAMADA ENCAMINHA PACOTES?',options:['Física','Rede','Aplicação','Sessão'],alternatives:['A','B','C','D'],correctAnswer:'B',timeLimit:10};
   s.qte.remaining=10;s.playerCombat.state='attack_qte';renderer.render();
   const hidden=view.professorSpeech(s)===null;
   window.questionOverlayShot=document.getElementById('game-canvas').toDataURL('image/png').split(',')[1];
   s.qte.question=oldQuestion;s.qte.remaining=oldRemaining;s.playerCombat.state=oldMode;
   if(JSON.stringify(s)!==presentationBaseline)throw Error('Question overlay test leaked state');
   return hidden;
  })()`);
  assert.equal(overlay,true);
  const interruptions=await evaluate(`(()=>{
   const sheet=document.createElement('canvas');sheet.width=1280;sheet.height=1440;const ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
   const result=[];let cell=0;
   const capture=()=>{ctx.drawImage(document.getElementById('game-canvas'),(cell%2)*640,Math.floor(cell/2)*360);cell++;};
   for(const mode of ['outside','entry']){
    debugApi.setProfessorDebugMode(mode);
    debugApi.updateProfessorDebugAnimation(s,mode==='entry'?professorClimbStart+.5:.2);renderer.render();capture();
    const before=view.professorFrame(s),clock=debugApi.debugState.professorAnimation.entryElapsed;
    document.querySelector('[data-debug-professor-action="sadExit"]').click();
    const interrupted=view.professorFrame(s);
    for(const key of ['x','floor','height','clip','elapsed'])if(before[key]!==interrupted[key])throw Error('Exit teleported '+mode+'/'+key);
    debugApi.updateProfessorDebugAnimation(s,.4);renderer.render();capture();
    const reaction=view.professorRenderInfo(s);
    if(reaction.file!=='professor_sad_exit_v1.png'||reaction.stage!=='disappointed')throw Error('Missing sad pose '+mode);
    debugApi.updateProfessorDebugAnimation(s,mode==='outside'?5.6:2.1);renderer.render();capture();
    const walking=view.professorRenderInfo(s);
    if(mode==='outside'&&(!(walking.x>before.x)||walking.layer!=='OUTSIDE'))throw Error('External exit lost depth');
    debugApi.updateProfessorDebugAnimation(s,100);renderer.render();capture();
    if(view.professorFrame(s)!==null||debugApi.debugState.professorAnimation.entryElapsed!==clock)throw Error('Exit restarted '+mode);
    result.push({mode,original:{x:before.x,y:before.floor,stage:before.stage,layer:before.layer},reaction,walking,finished:true});
   }
   if(JSON.stringify(s)!==presentationBaseline)throw Error('Interruption debug changed match');
   window.interruptionSheet=sheet.toDataURL('image/png').split(',')[1];return result;
  })()`);
  await writeFile(resolve(artifacts,'professor-dialogue-exit.png'),Buffer.from(await evaluate('presentationSheet'),'base64'));
  await writeFile(resolve(artifacts,'professor-question-overlay.png'),Buffer.from(await evaluate('questionOverlayShot'),'base64'));
  await writeFile(resolve(artifacts,'professor-interrupted-exits.png'),Buffer.from(await evaluate('interruptionSheet'),'base64'));
  presentation={lines,exit,interruptions,questionOverlaySafe:overlay,debugStateUnchanged:true,counterRushFrozen:true,pauseFrozen:true,
   preview:resolve(artifacts,'professor-dialogue-exit.png'),mobile:resolve(artifacts,'professor-dialogue-mobile.png'),questionOverlay:resolve(artifacts,'professor-question-overlay.png'),interrupted:resolve(artifacts,'professor-interrupted-exits.png')};
 }
 assert.equal(await evaluate('s.professorEasterEgg.consecutiveCorrectAnswers'),0);
 assert.deepEqual(errors,[]);
 await writeFile(resolve(artifacts,'entry.png'),Buffer.from(await evaluate('professorSheet'),'base64'));
 console.log(JSON.stringify({frames:result,mobileFrames,presentation,desktopF3:true,mobileTouch:true,runtimeErrors:errors,preview:resolve(artifacts,'entry.png')},null,2));
 }
}finally{
 if(socket?.readyState===1)socket.send(JSON.stringify({id:0,method:'Browser.close'}));
 socket?.close();browser.kill();browser.stderr.destroy();browser.unref();server.closeAllConnections();server.close();
}
