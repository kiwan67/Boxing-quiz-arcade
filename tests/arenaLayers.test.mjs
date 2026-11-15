import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenery,drawArenaScene,drawAudienceMotion,rearRingLayer} from '../js/scenery.js';
import {arenaLife,resetArenaLife} from '../js/arenaLife.js';

test('plateia animada precede a camada traseira transparente, que precede os atores',()=>{
 const previous=globalThis.document,canvases=[];
 globalThis.document={createElement(){
  const ctx={rects:[],fillRect(...rect){this.rects.push([this.fillStyle,...rect]);},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){}};
  const canvas={getContext:()=>ctx};canvases.push(canvas);return canvas;
 }};
 try{
  const scenery=createScenery(640,360),rear=rearRingLayer(scenery);
  assert.equal(canvases.length,2);assert.equal(rear,canvases[1]);
  assert.deepEqual([rear.width,rear.height],[640,360]);
  const ringRects=rear.getContext('2d').rects;
  assert.ok(ringRects.some(([color,x,y])=>color==='#f17a78'&&x===48&&y===114));
  assert.ok(ringRects.some(([color,x,y])=>color==='#93a4af'&&x===41&&y===99));
  assert.ok(ringRects.every(([,x,y,w,h])=>y>=94&&y+h<=206),'only existing rear structures belong to this layer');
  const calls=[];
  drawArenaScene({drawImage(image){calls.push(image);},fillRect(){calls.push('spectator');}},scenery,.2,1,.2);
  assert.equal(calls[0],scenery);assert.equal(calls.at(-1),rear);
  assert.ok(calls.slice(1,-1).every(call=>call==='spectator'));
  calls.length=0;
  drawArenaScene({drawImage(image){calls.push(image);},fillRect(){calls.push('spectator');}},scenery,.2,1,.2,()=>calls.push('professor'));
  assert.equal(calls[0],scenery);assert.equal(calls.at(-2),'professor');assert.equal(calls.at(-1),rear);
  assert.ok(calls.slice(1,-2).every(call=>call==='spectator'),'professor stays in front of the audience');
  assert.equal(canvases.length,2,'frames reuse both caches without allocating another canvas');
 }finally{globalThis.document=previous;}
});

test('todos os espectadores permanecem nas arquibancadas ao saltar e levantar os braços',()=>{
 resetArenaLife(15);
 const ctx={rects:[],fillRect(...rect){this.rects.push([this.fillStyle,...rect]);}};
 for(const strength of [0,.4,.9,1.5])for(let sample=0;sample<120;sample++){
  arenaLife.reaction.strength=strength;arenaLife.reaction.age=sample/60;
  ctx.rects.length=0;drawAudienceMotion(ctx,sample/30,strength,sample/60);
  assert.equal(ctx.rects.filter(([color])=>color==='#111827').length,48,'no spectator removed');
  assert.ok(ctx.rects.every(([,x,y,w,h])=>y>=60&&y+h<=163),'no animated pixel invades the ring');
 }
});
