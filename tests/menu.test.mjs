import test from 'node:test';
import assert from 'node:assert/strict';
import {MENU_CONFIG,menuImageRect} from '../js/menuConfig.js';
test('fundo cobre 640x360 proporcionalmente, inclusive formatos quadrados e retrato',()=>{
 for(const [w,h]of [[640,360],[1920,1080],[1000,1000],[300,900],[2400,600]]){
  const r=menuImageRect(w,h);assert.ok(Math.abs(r.width/r.height-w/h)<1e-9);
  assert.ok(r.width>=640&&r.height>=360);assert.ok(r.x<=0&&r.y<=0);assert.ok(r.x+r.width>=640&&r.y+r.height>=360);
 }
});
test('escala, posição e camada escura são configurações únicas e fundo é opcional',()=>{
 const config={...MENU_CONFIG,imageScale:2,imagePositionX:0,imagePositionY:1};
 const r=menuImageRect(640,360,640,360,config);assert.deepEqual(r,{x:0,y:-360,width:1280,height:720});
 assert.equal(MENU_CONFIG.backgroundPath,'../assets/images/menu/menu_background.png');assert.ok(MENU_CONFIG.leftShadeOpacity>=0&&MENU_CONFIG.leftShadeOpacity<=1);
 assert.ok(MENU_CONFIG.leftShadeWidth<=.5);
 assert.equal(MENU_CONFIG.titleX,30);assert.equal(MENU_CONFIG.titleY,35);
 assert.ok(MENU_CONFIG.titleY+2*MENU_CONFIG.titleLineHeight+7*MENU_CONFIG.titleScale<MENU_CONFIG.optionsY);
 assert.ok(MENU_CONFIG.optionsX+MENU_CONFIG.optionsWidth<320);
 assert.ok(MENU_CONFIG.optionsY+2*MENU_CONFIG.optionHeight+MENU_CONFIG.optionGap<360);
});
