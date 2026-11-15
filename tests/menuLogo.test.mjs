import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeMainMenu} from '../js/mainMenu.js';

test('five embedded logos stay single through the carousel; menu buttons still navigate',async()=>{
 const original=globalThis.Image;
 const originalDocument=globalThis.document;
 globalThis.Image=class {
  naturalWidth=1600;naturalHeight=900;
  set src(value){this.path=value;queueMicrotask(()=>value.endsWith('/menu_background.png')?this.onerror():this.onload());}
  get src(){return this.path;}
 };
 try{
  let titlePixels=0;
  const context=()=>new Proxy({globalAlpha:1,fillStyle:null,
   fillRect(){if(this.fillStyle==='#fff1a0')titlePixels++;},
   createLinearGradient(){return {addColorStop(){}};}
  },{get:(target,key)=>key in target?target[key]:()=>{}});
  const mainContext=context();
  globalThis.document={createElement:()=>({getContext:()=>context()})};
  function element(label){
   const listeners={},ctx=context();
   return {hidden:false,dataset:{},style:{setProperty(){}},
    addEventListener(type,fn){listeners[type]=fn;},
    click(){listeners.click?.();},
    focus(){doc.activeElement=this;listeners.focus?.();},
    key(key){listeners.keydown?.({key,preventDefault(){}});},
    getAttribute(){return label;},
    querySelector(){return {width:174,height:32,getContext:()=>ctx};}
   };
  }
  const play=element('JOGAR'),optionsButton=element('OPÇÕES'),creditsButton=element('CRÉDITOS');
  const entries=[play,optionsButton,creditsButton],buttons=element();buttons.querySelectorAll=()=>entries;
  const options=element(),credits=element(),back=element(),creditsBack=element(),difficultyBack=element();
  const selectors={'[data-menu-buttons]':buttons,'[data-menu-options]':options,'[data-menu-credits]':credits,
   '[data-menu-play]':play,'[data-menu-options-button]':optionsButton,'[data-menu-credits-button]':creditsButton,
   '[data-menu-back]':back,'[data-credits-back]':creditsBack};
  const root=element();root.hidden=true;root.querySelector=selector=>selectors[selector];
  const doc={hidden:false,getElementById(id){return {'main-menu':root,'menu-canvas':{getContext:()=>mainContext},'difficulty-back':difficultyBack}[id];}};
  let menu;menu=initializeMainMenu(doc,()=>menu.sync(true));
  await new Promise(resolve=>setImmediate(resolve));menu.sync(true);
  for(let i=0;i<5;i++){
   titlePixels=0;menu.draw();assert.equal(titlePixels,0);
   menu.update(5.5);assert.equal(titlePixels,0);menu.update(.5);
  }
  play.click();assert.equal(menu.screen,'difficulty');assert.equal(root.hidden,true);
  difficultyBack.click();assert.equal(menu.screen,'main');
  optionsButton.click();assert.equal(menu.screen,'options');assert.equal(options.hidden,false);
  back.click();assert.equal(menu.screen,'main');
  creditsButton.click();assert.equal(menu.screen,'credits');assert.equal(credits.hidden,false);
  creditsBack.click();assert.equal(menu.screen,'main');assert.equal(doc.activeElement,creditsButton);
  play.focus();play.key('ArrowDown');assert.equal(doc.activeElement,optionsButton);
  optionsButton.key('ArrowDown');assert.equal(doc.activeElement,creditsButton);
 }finally{globalThis.Image=original;globalThis.document=originalDocument;}
});
