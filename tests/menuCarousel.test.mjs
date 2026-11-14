import test from 'node:test';
import assert from 'node:assert/strict';
import {MENU_CONFIG} from '../js/menuConfig.js';
import {createMenuCarousel,preloadMenuImages} from '../js/menuCarousel.js';
const images=[{naturalWidth:1280,naturalHeight:720,id:0},{naturalWidth:300,naturalHeight:900,id:1},{naturalWidth:1000,naturalHeight:1000,id:2}];
test('five second hold, continuous fade, wrap and reset without timers',()=>{
 const c=createMenuCarousel(images);
 assert.equal(c.frame().current,images[0]);assert.equal(c.update(5),false);assert.equal(c.frame().progress,0);
 c.update(.25);assert.equal(c.frame().progress,.25);c.update(.25);assert.equal(c.frame().progress,.5);
 c.update(.5);assert.equal(c.frame().current,images[1]);assert.equal(c.frame().progress,0);
 c.update(12);assert.equal(c.frame().current,images[0]);c.update(100*18+.5);assert.equal(c.frame().current,images[0]);
 c.reset();assert.equal(c.frame().current,images[0]);assert.equal(c.frame().progress,0);
});
test('single image and empty image list stay fixed; invalid deltas are ignored',()=>{
 for(const list of [[],images.slice(0,1)]){
  const c=createMenuCarousel(list),before=c.frame();assert.equal(c.update(10000),false);assert.deepEqual(c.frame(),before);
  assert.equal(c.frame().next,null);
 }
 const c=createMenuCarousel(images);for(const n of [NaN,Infinity,-1,0])assert.equal(c.update(n),false);
});
test('crossfade covers the canvas proportionally, preserves opacity for title and gradient, no dark gap',()=>{
 const c=createMenuCarousel(images),calls=[],ctx={globalAlpha:1,save(){this.alpha=this.globalAlpha;},restore(){this.globalAlpha=this.alpha;},drawImage(image,x,y,w,h){calls.push({image,x,y,w,h,alpha:this.globalAlpha});}};
 c.update(5.5);assert.equal(c.draw(ctx),true);assert.deepEqual(calls.map(x=>x.alpha),[1,.5]);assert.equal(ctx.globalAlpha,1);
 for(const r of calls){assert.equal(r.w/r.h,r.image.naturalWidth/r.image.naturalHeight);assert.ok(r.x<=0&&r.y<=0&&r.x+r.w>=640&&r.y+r.h>=360);}
 assert.equal(createMenuCarousel([]).draw(ctx),false);
});
test('preload skips missing/corrupt images, deduplicates and retains configured order',async()=>{
 const pending=[],requests=[];
 class ImageMock{set src(src){this.url=src;requests.push(src);pending.push(()=>{this.naturalWidth=src.includes('broken')?0:640;this.naturalHeight=360;src.includes('missing')?this.onerror():this.onload();});}}
 const promise=preloadMenuImages({...MENU_CONFIG,backgroundImages:['a.png','missing.png','b.png','broken.png','a.png']},ImageMock);
 assert.equal(requests.length,4);pending.reverse().forEach(f=>f());const result=await promise;assert.equal(result.length,2);assert.ok(result[0].url.endsWith('/a.png'));assert.ok(result[1].url.endsWith('/b.png'));
 assert.equal(await preloadMenuImages(MENU_CONFIG,null).then(r=>r.length),0);
});
test('default list accepts five numbered images and the legacy filename',()=>{
 assert.equal(MENU_CONFIG.backgroundImages.length,6);assert.equal(MENU_CONFIG.backgroundImages[5],MENU_CONFIG.backgroundPath);
 assert.equal(MENU_CONFIG.imageDisplaySeconds,5);assert.equal(MENU_CONFIG.imageFadeSeconds,1);
});
