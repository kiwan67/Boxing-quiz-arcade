// Standalone art review. No imports, writes, or connections to the combat game.
(() => {
 const manifest=window.PROFESSOR_PREVIEW_V2,base='./assets/sprites/professor/';
 const images=new Map(),cards=new Map(),status=document.getElementById('status');
 const animationRoot=document.getElementById('animations'),filmstrip=document.getElementById('filmstrip');
 const face=document.getElementById('face'),comparison=document.getElementById('comparison');
 let selected=manifest.clips[0],playing=true,time=0,previousTime=null,manualFrame=0,height=330,speed=1,dirty=true;
 function load(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Falha ao carregar '+src));image.src=src;});}
 function index(clip){return playing?Math.floor(time*clip.fps)%clip.frames.length:manualFrame;}
 function drawFrame(canvas,clip,n,targetHeight=height,center=canvas.width/2,floor=canvas.height-14,clear=true){
  const ctx=canvas.getContext('2d'),image=images.get(clip.id);if(clear)ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!image)return;
  const frame=clip.frames[n],scale=targetHeight/manifest.referenceHeight;ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,frame.x,frame.y,frame.width,frame.height,
   center-(frame.axisX-frame.x)*scale,floor-(frame.footY-frame.y)*scale,frame.width*scale,frame.height*scale);
 }
 function select(clip){selected=clip;dirty=true;buildFilmstrip();}
 function buildFilmstrip(){
  filmstrip.replaceChildren();
  selected.frames.forEach((frame,n)=>{
   const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','Ver quadro '+(n+1));
   const box=document.createElement('div');box.className='surface';
   const canvas=document.createElement('canvas');canvas.width=240;canvas.height=300;box.append(canvas);
   const text=document.createElement('span');text.textContent='QUADRO '+(n+1);button.append(box,text);
   button.onclick=()=>{playing=false;manualFrame=n;syncPlay();dirty=true;};filmstrip.append(button);
   drawFrame(canvas,selected,n,270);
  });
 }
 function syncPlay(){document.getElementById('play').textContent=playing?'PAUSAR ANIMAÇÕES':'REPRODUZIR ANIMAÇÕES';}
 function render(){
  for(const clip of manifest.clips){
   const entry=cards.get(clip.id),n=index(clip);entry.card.classList.toggle('selected',clip===selected);
   entry.select.setAttribute('aria-pressed',String(clip===selected));
   if(dirty||n!==entry.last){drawFrame(entry.canvas,clip,n);entry.output.textContent=`QUADRO ${n+1} / 4 · ${clip.cellWidth} × ${clip.cellHeight} px`;entry.last=n;}
  }
  const n=index(selected),frame=selected.frames[n],image=images.get(selected.id),ctx=face.getContext('2d');
  ctx.clearRect(0,0,face.width,face.height);ctx.imageSmoothingEnabled=false;
  const size=frame.bounds.height*.39;
  ctx.drawImage(image,frame.axisX-size/2,frame.bounds.y,size,size,20,0,280,280);
  document.getElementById('detail-label').textContent=`${selected.label} · QUADRO ${n+1}`;
  const cmp=comparison.getContext('2d');cmp.clearRect(0,0,comparison.width,comparison.height);cmp.imageSmoothingEnabled=false;
  drawFrame(comparison,manifest.clips[0],index(manifest.clips[0]),171,210,270,false);
  const bot=images.get('bot');if(bot)cmp.drawImage(bot,510-bot.naturalWidth/bot.naturalHeight*90,90,bot.naturalWidth/bot.naturalHeight*180,180);
  for(const [i,button] of [...filmstrip.children].entries())button.setAttribute('aria-pressed',String(i===n));
  dirty=false;
 }
 function loop(timestamp){
  const delta=previousTime===null?0:Math.min(.1,Math.max(0,(timestamp-previousTime)/1000));previousTime=timestamp;
  if(playing&&!document.hidden)time+=delta*speed;
  const changed=manifest.clips.some(clip=>cards.get(clip.id).last!==index(clip));
  if(dirty||changed)render();requestAnimationFrame(loop);
 }
 function step(amount){manualFrame=(index(selected)+amount+4)%4;playing=false;syncPlay();dirty=true;}
 document.getElementById('play').onclick=()=>{if(!playing)time=manualFrame/selected.fps;playing=!playing;syncPlay();dirty=true;};
 document.getElementById('previous').onclick=()=>step(-1);document.getElementById('next').onclick=()=>step(1);
 document.getElementById('speed').oninput=event=>{speed=Number(event.target.value);document.getElementById('speed-value').textContent=speed+'×';};
 document.getElementById('background').onchange=event=>{document.body.dataset.background=event.target.value;};
 document.getElementById('height').onchange=event=>{height=Number(event.target.value);dirty=true;};
 document.addEventListener('visibilitychange',()=>{previousTime=null;});
 document.addEventListener('keydown',event=>{if(['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();step(event.key==='ArrowLeft'?-1:1);}
 });
 Promise.all([...manifest.clips.map(async clip=>{
  images.set(clip.id,await load(base+clip.file));
  const card=document.createElement('article');card.className='card';
  const header=document.createElement('header'),title=document.createElement('h2');title.textContent=clip.label;
  const button=document.createElement('button');button.type='button';button.textContent='AMPLIAR';button.onclick=()=>select(clip);header.append(title,button);
  const surface=document.createElement('div');surface.className='surface';const canvas=document.createElement('canvas');canvas.width=320;canvas.height=360;canvas.setAttribute('aria-label',clip.label);surface.append(canvas);
  const output=document.createElement('p'),link=document.createElement('a');link.href=base+clip.file;link.target='_blank';link.rel='noopener';link.textContent='Abrir PNG original';
  card.append(header,surface,output,link);cards.set(clip.id,{card,canvas,output,select:button,last:-1});
 }),load('./assets/sprites/bot/idle.png').then(image=>images.set('bot',image))]).then(()=>{
  for(const clip of manifest.clips)animationRoot.append(cards.get(clip.id).card);
  buildFilmstrip();status.textContent='3 PNGs carregadas · transparência real · 4 quadros por animação · nenhuma integração ao combate';requestAnimationFrame(loop);
 }).catch(error=>{status.textContent=error.message;status.style.color='#ff9ba7';});
})();
