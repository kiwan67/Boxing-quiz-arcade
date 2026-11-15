// Standalone asset review. No game modules, counters, animation states or audio.
(() => {
 const manifest=window.PROFESSOR_CLIMB_PREVIEW;
 const byId=id=>document.getElementById(id),stage=byId('stage'),ctx=stage.getContext('2d');
 const images=[],buttons=[],status=byId('status');
 let frame=0,playing=false,accumulator=0,previousTime=null,ready=false;
 const controls=['play','previous','next','restart'];
 function render(){
  const item=manifest.frames[frame],image=images[frame];
  ctx.clearRect(0,0,stage.width,stage.height);ctx.imageSmoothingEnabled=false;
  // One proportional draw of the complete PNG. No simulated character motion.
  const scale=Math.min(stage.width/image.naturalWidth,stage.height/image.naturalHeight);
  const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
  ctx.drawImage(image,(stage.width-width)/2,(stage.height-height)/2,width,height);
  byId('frame-number').textContent=`QUADRO ${frame+1} / ${manifest.frames.length}`;
  byId('pose-name').textContent=item.name;byId('pose-description').textContent=item.description;
  byId('dimensions').textContent=`${image.naturalWidth} × ${image.naturalHeight} px · PNG transparente`;
  byId('original').href=item.file;
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===frame)));
  byId('play').textContent=playing?'PAUSAR':'REPRODUZIR';
 }
 function pause(){playing=false;accumulator=0;}
 function select(index){if(!ready)return;pause();frame=Math.max(0,Math.min(manifest.frames.length-1,index));render();}
 function toggle(){
  if(!ready)return;
  if(playing)pause();else{if(frame===manifest.frames.length-1)frame=0;playing=true;accumulator=0;}
  render();
 }
 function loop(timestamp){
  const delta=previousTime===null?0:Math.max(0,Math.min(.1,(timestamp-previousTime)/1000));previousTime=timestamp;
  if(playing&&!document.hidden){
   accumulator+=delta;
   const duration=1/Number(byId('speed').value);
   if(accumulator>=duration){
    accumulator%=duration;
    if(frame<manifest.frames.length-1)frame++;
    else if(byId('repeat').checked)frame=0;else pause();
    render();
   }
  }
  requestAnimationFrame(loop);
 }
 byId('play').onclick=toggle;byId('previous').onclick=()=>select(frame-1);
 byId('next').onclick=()=>select(frame+1);byId('restart').onclick=()=>select(0);
 byId('speed').onchange=()=>{accumulator=0;};
 byId('background').onchange=()=>{document.body.dataset.background=byId('background').value;};
 document.addEventListener('keydown',event=>{
  if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(event.target?.tagName))return;
  if(['ArrowLeft','ArrowRight',' '].includes(event.key))event.preventDefault();
  if(event.key===' ')toggle();if(event.key==='ArrowLeft')select(frame-1);if(event.key==='ArrowRight')select(frame+1);
 });
 Promise.all(manifest.frames.map((item,i)=>new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>{images[i]=image;resolve();};
  image.onerror=()=>reject(Error('Não foi possível carregar '+item.file));image.src=item.file;
 }))).then(()=>{
  manifest.frames.forEach((item,i)=>{
   const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Selecionar quadro ${i+1}: ${item.name}`);
   const image=document.createElement('img');image.src=item.file;image.alt=item.name;image.className='thumbnail';
   const label=document.createElement('span');label.textContent=`${i+1}. ${item.name}`;
   button.append(image,label);button.onclick=()=>select(i);buttons.push(button);byId('filmstrip').append(button);
  });
  ready=true;controls.forEach(id=>byId(id).disabled=false);
  status.textContent=`${manifest.frames.length} PNGs carregados. Selecione um quadro ou reproduza a sequência.`;
  render();requestAnimationFrame(loop);
 }).catch(error=>{status.textContent=error.message;});
})();
