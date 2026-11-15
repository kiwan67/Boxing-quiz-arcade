import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadProfessorSprites} from './helpers/professorSprites.mjs';
import {PROFESSOR_CLIPS,PROFESSOR_SPRITE_URLS,professorTexture,professorSpriteFrame} from '../js/professorSprites.js';
import {createInitialGameState} from '../js/gameState.js';
import {drawProfessor} from '../js/professorView.js';
import {updateProfessorAnimation,PROFESSOR_ENTRY_TIMING as timing,PROFESSOR_ENTRY_DURATION} from '../js/professorAnimation.js';

test('real RGBA sheets have isolated crops and preserve proportional rendering',async()=>{
 await loadProfessorSprites();
 for(const [clip,url] of Object.entries(PROFESSOR_SPRITE_URLS)){
  assert.ok(!url.endsWith('/professor_spritesheet.png'));
  const png=readFileSync(new URL(url));
  assert.equal(png[25],6);assert.equal(png.readUInt32BE(16),1254);assert.equal(png.readUInt32BE(20),1254);
 }
 for(const [clip,animation] of Object.entries(PROFESSOR_CLIPS)){
  for(const frame of animation.frames){
   if(frame.sheet?.startsWith('climb')){assert.equal(frame.width,1254);assert.equal(frame.height,1254);continue;}
   if(frame.sheet==='actions'){assert.ok(frame.referenceHeight===275);continue;}
   assert.equal(frame.width,627);assert.equal(frame.height,627);
   assert.ok(frame.x+frame.width<=1254&&frame.y+frame.height<=1254);
  }
  if(clip.startsWith('walking'))assert.equal(professorSpriteFrame(clip,0),professorSpriteFrame(clip,animation.secondsPerFrame*4));
 }
 const s=createInitialGameState();Object.assign(s.professorEasterEgg,{professorPresent:true,professorUnlocked:true});
 const calls=[],ctx={save(){},restore(){},translate(){},scale(){},drawImage(...args){calls.push(args);}};
 drawProfessor(ctx,s);assert.equal(calls.at(-1)[0],professorTexture('observing'));
 s.professorEasterEgg.professorInRing=true;updateProfessorAnimation(s,.8);
 drawProfessor(ctx,s);assert.equal(calls.at(-1)[0],professorTexture('walkingSide'));
 updateProfessorAnimation(s,timing.prepare+timing.approach+.1-.8);drawProfessor(ctx,s);assert.equal(calls.at(-1)[0],professorTexture('walkingFront'));
 updateProfessorAnimation(s,PROFESSOR_ENTRY_DURATION);drawProfessor(ctx,s);assert.equal(calls.at(-1)[0],professorTexture('observing'));
 assert.equal(ctx.imageSmoothingEnabled,false);
 for(const args of calls){assert.equal(args.length,9);assert.ok(Math.abs(args[3]/args[4]-args[7]/args[8])<1e-9);}
});
test('loader caches four sheets and all eight independent climb PNGs',async()=>{
 const loader=await import('../js/professorSprites.js?cached');let requests=0;
 class ImageMock{naturalWidth=1254;naturalHeight=1254;set src(value){requests++;this.onload();}}
 const result=await loader.preloadProfessorSprites(ImageMock);
 assert.equal(await loader.preloadProfessorSprites(ImageMock),result);assert.equal(requests,12);
});
for(const mode of ['missing','invalid','throw','timeout'])test(`${mode} assets warn and never fall back to the old image`,async t=>{
 const loader=await import(`../js/professorSprites.js?${mode}`);
 const warn=t.mock.method(console,'warn',()=>{});
 class ImageMock{naturalWidth=1;naturalHeight=1;set src(value){
  if(mode==='missing')this.onerror();if(mode==='invalid')this.onload();if(mode==='throw')throw Error('Missing');
 }}
 if(mode==='timeout')t.mock.timers.enable({apis:['setTimeout']});
 const pending=loader.preloadProfessorSprites(ImageMock);
 if(mode==='timeout')t.mock.timers.tick(15000);
 await pending;assert.equal(warn.mock.callCount(),12);
 for(const clip of Object.keys(PROFESSOR_CLIPS))assert.equal(loader.professorTexture(clip),null);
});
