import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('standalone preview loads eight frames, pauses, steps, selects thumbnails and finishes playback',async()=>{
 const elements=new Map(),queue=[],handlers={},draws=[];
 const element=()=>({disabled:true,value:'2',checked:false,children:[],attrs:{},append(...items){this.children.push(...items);},
  setAttribute(k,v){this.attrs[k]=v;},getContext(){return {clearRect(){},drawImage(...args){draws.push(args);},set imageSmoothingEnabled(v){assert.equal(v,false);}};}});
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 Object.assign(get('stage'),{width:1024,height:1024});
 const context={window:{},document:{hidden:false,body:{dataset:{}},getElementById:get,createElement:element,addEventListener(name,fn){handlers[name]=fn;}},
  Image:class{naturalWidth=1280;naturalHeight=1280;set src(value){this.onload();}},
  requestAnimationFrame:fn=>queue.push(fn)};
 vm.createContext(context);
 for(const file of ['frames.js','preview.js'])vm.runInContext(readFileSync(new URL(file,import.meta.url),'utf8'),context);
 await new Promise(setImmediate);
 assert.equal(get('filmstrip').children.length,8);assert.equal(queue.length,1);assert.equal(get('play').disabled,false);
 assert.match(get('frame-number').textContent,/1 \/ 8/);
 get('next').onclick();assert.match(get('frame-number').textContent,/2 \/ 8/);
 get('previous').onclick();assert.match(get('frame-number').textContent,/1 \/ 8/);
 get('filmstrip').children[4].onclick();assert.match(get('frame-number').textContent,/5 \/ 8/);
 let time=0;function tick(n){for(let i=0;i<n;i++){time+=100;queue.shift()(time);assert.equal(queue.length,1);}}
 get('play').onclick();tick(7);assert.match(get('frame-number').textContent,/6 \/ 8/);
 get('play').onclick();const frozen=get('frame-number').textContent;tick(20);assert.equal(get('frame-number').textContent,frozen);
 get('restart').onclick();assert.match(get('frame-number').textContent,/1 \/ 8/);
 get('play').onclick();tick(50);assert.match(get('frame-number').textContent,/8 \/ 8/);assert.equal(get('play').textContent,'REPRODUZIR');
 assert.ok(draws.every(args=>args.length===5&&args[3]===args[4]),'whole square frame, no pose distortion or artificial motion');
 get('previous').onclick();assert.match(get('frame-number').textContent,/7 \/ 8/);
});
