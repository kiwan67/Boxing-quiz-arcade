import { createMenuCarousel,preloadMenuImages } from './menuCarousel.js';
import { MENU_CONFIG } from './menuConfig.js';
import { createScenery,drawArenaScene } from './scenery.js';
import { drawPixelText } from './hud.js';
import { unlockAudio } from './audio.js';
import { audioManager } from './audioManager.js';

const menus=new WeakMap();

export function initializeMainMenu(doc,onNavigate){
 if(menus.has(doc))return menus.get(doc);
 const root=doc.getElementById('main-menu');if(!root?.querySelector)return null;
 const canvas=doc.getElementById('menu-canvas'),ctx=canvas.getContext('2d');
 const buttons=root.querySelector('[data-menu-buttons]'),options=root.querySelector('[data-menu-options]');
 const credits=root.querySelector('[data-menu-credits]');
 const quote=credits.querySelector('[data-credits-quote]');
 if(quote){
  const ink=quote.getContext('2d');ink.imageSmoothingEnabled=false;
  ['ALGUEM TEM QUE','VER ISSO AI!'].forEach((line,i)=>{
   const x=(quote.width-(line.length*6-1)*3)/2,y=8+i*32;
   drawPixelText(ink,line,x,y,3,'#fff1a0');
   // Acute accents match the existing pixel alphabet.
   ink.fillStyle='#fff1a0';
   const accent=x+(i===0?4:10)*18;
   ink.fillRect(accent+6,y-6,3,3);ink.fillRect(accent+3,y-3,3,3);
  });
 }
 const settings=doc.getElementById('arena-settings'),home=settings?.parentNode;
 const scenery=createScenery(640,360);let carousel=createMenuCarousel([]),visible=false,settingsWasOpen=settings?.open;
 for(const [key,value]of Object.entries({'--menu-options-x':MENU_CONFIG.optionsX/640*100,'--menu-options-y':MENU_CONFIG.optionsY/360*100,'--menu-options-width':MENU_CONFIG.optionsWidth/640*100}))root.style.setProperty(key,`${value}%`);
 const buttonCount=buttons.querySelectorAll('button').length;
 buttons.style.aspectRatio=`${MENU_CONFIG.optionsWidth} / ${buttonCount*MENU_CONFIG.optionHeight+(buttonCount-1)*MENU_CONFIG.optionGap}`;
 const backgroundsWithLogo=new Set(MENU_CONFIG.backgroundImagesWithLogo.map(path=>new URL(path,import.meta.url).href));
 function draw(){
  ctx.clearRect(0,0,640,360);
  ctx.imageSmoothingEnabled=false;
  if(!carousel.draw(ctx))drawArenaScene(ctx,scenery,0,0);
  const shade=ctx.createLinearGradient(0,0,640*MENU_CONFIG.leftShadeWidth,0);
  shade.addColorStop(0,`rgba(8,15,32,${MENU_CONFIG.leftShadeOpacity})`);shade.addColorStop(1,'rgba(8,15,32,0)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,640*MENU_CONFIG.leftShadeWidth,360);
  const {current,next,progress}=carousel.frame();
  const titleOpacity=image=>backgroundsWithLogo.has(image?.src)?0:1;
  ctx.save();
  ctx.globalAlpha=titleOpacity(current)*(1-progress)+titleOpacity(next)*progress;
  if(ctx.globalAlpha>0)['BOXING','QUIZ','ARCADE'].forEach((line,i)=>drawPixelText(ctx,line,MENU_CONFIG.titleX,MENU_CONFIG.titleY+i*MENU_CONFIG.titleLineHeight,MENU_CONFIG.titleScale,'#fff1a0'));
  ctx.restore();
 }
 const menu={screen:'main',draw,update(delta){
  if(visible&&!root.hidden&&!doc.hidden&&carousel.update(delta))draw();
 },sync(open){
  const showing=open&&menu.screen!=='difficulty';
  if(showing&&!visible){carousel.reset();draw();}
  visible=showing;
  root.hidden=!visible||menu.screen==='difficulty';buttons.hidden=menu.screen!=='main';options.hidden=menu.screen!=='options';
  credits.hidden=menu.screen!=='credits';
  if(settings){
   if(visible&&menu.screen==='options'){
    const host=options.querySelector('[data-menu-settings-host]');
    if(settings.parentNode!==host){settingsWasOpen=settings.open;host.append(settings);}
    settings.hidden=false;settings.open=true;
   }else{
    if(settings.parentNode!==home){home.append(settings);settings.open=settingsWasOpen;}
    settings.hidden=open;
   }
  }
 }};
 function navigate(screen){
  unlockAudio();audioManager.play('menu_select');menu.screen=screen;onNavigate();
  if(screen==='main')root.querySelector('[data-menu-play]').focus();
  if(screen==='options')root.querySelector('[data-menu-back]').focus();
  if(screen==='credits')root.querySelector('[data-credits-back]').focus();
 }
 root.querySelector('[data-menu-play]').addEventListener('click',()=>navigate('difficulty'));
 root.querySelector('[data-menu-options-button]').addEventListener('click',()=>navigate('options'));
 root.querySelector('[data-menu-credits-button]').addEventListener('click',()=>navigate('credits'));
 root.querySelector('[data-credits-back]').addEventListener('click',()=>{
  navigate('main');root.querySelector('[data-menu-credits-button]').focus();
 });
 credits.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();root.querySelector('[data-credits-back]').click();}
 });
 root.querySelector('[data-menu-back]').addEventListener('click',()=>navigate('main'));
 doc.getElementById('difficulty-back')?.addEventListener('click',()=>navigate('main'));
 const entries=[...buttons.querySelectorAll('button')];let selected=0;
 function select(index){
  selected=index;
  entries.forEach((button,i)=>{
   const label=button.querySelector('canvas'),context=label.getContext('2d'),active=i===selected;
   context.clearRect(0,0,label.width,label.height);context.imageSmoothingEnabled=false;
   const title=button.getAttribute('aria-label'),color=active?'#fff1a0':'#f7ecd0';
   button.dataset.selected=String(active);
   drawPixelText(context,title.normalize('NFD').replace(/\p{M}/gu,''),18,9,2,color);
   context.fillStyle=color;
   if(title==='OPÇÕES'){
    context.fillRect(46,23,2,2);context.fillRect(44,25,2,2);
    context.fillRect(56,3,4,2);context.fillRect(60,5,2,2);
   }
   if(title==='CRÉDITOS'){context.fillRect(46,5,2,2);context.fillRect(48,3,2,2);}
   if(active){
    // Pixel chevrons: « OPTION ». Keep the text fixed when selection moves.
    const right=18+title.length*12+4;
    for(let y=0;y<5;y++){
     const offset=Math.abs(y-2)*2;
     context.fillRect(2+offset,11+y*2,2,2);context.fillRect(8+offset,11+y*2,2,2);
     context.fillRect(right+4-offset,11+y*2,2,2);context.fillRect(right+10-offset,11+y*2,2,2);
    }
   }
  });
 }
 entries.forEach((button,i)=>{
  button.addEventListener('pointerenter',()=>select(i));button.addEventListener('focus',()=>select(i));
  button.addEventListener('keydown',event=>{
   if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
   event.preventDefault();
   const next=event.key==='Home'?0:event.key==='End'?entries.length-1:(i+(event.key==='ArrowDown'?1:-1)+entries.length)%entries.length;
   select(next);
   entries[next].focus();
  });
 });
 select(0);
 draw();
 menus.set(doc,menu);
 root.dataset.background='default';
 preloadMenuImages().then(images=>{
  carousel=createMenuCarousel(images);root.dataset.background=images.length?'custom':'default';
  if(!root.hidden)draw();
 });
 return menu;
}
