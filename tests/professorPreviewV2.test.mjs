import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';

test('standalone preview loads new PNGs, plays, steps, zooms and never imports the game',async()=>{
 const html=readFileSync('professor-preview-v2.html','utf8');
 const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(scripts,['./assets/sprites/professor/preview-v2-data.js','./assets/sprites/professor/preview-v2.js']);
 for(const [,path] of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))assert.ok(existsSync(path),path);
 class Element{
  constructor(tagName){this.tagName=tagName.toUpperCase();this.children=[];this.dataset={};this.style={};this.attributes={};this.draws=[];
   this.classList={toggle(){}};this.width=320;this.height=360;
  }
  append(...elements){this.children.push(...elements);}
  replaceChildren(){this.children=[];}
  setAttribute(key,value){this.attributes[key]=value;}
  getContext(){return {clearRect:()=>{this.draws=[];},drawImage:(...args)=>this.draws.push(args)};}
 }
 const elements=new Map([...html.matchAll(/<([a-z0-9]+)[^>]*\bid="([^"]+)"[^>]*>/g)].map(([,tag,id])=>[id,new Element(tag)]));
 const listeners=new Map(),frames=[];
 const document={hidden:false,body:new Element('body'),getElementById:id=>elements.get(id),
  createElement:tag=>new Element(tag),addEventListener:(name,fn)=>listeners.set(name,fn)};
 const requests=[];
 class ImageMock{
  set src(path){requests.push(path);const data=readFileSync(resolve(path));this.naturalWidth=data.readUInt32BE(16);this.naturalHeight=data.readUInt32BE(20);queueMicrotask(()=>this.onload());}
 }
 const sandbox={document,Image:ImageMock,requestAnimationFrame:fn=>frames.push(fn),console};sandbox.window=sandbox;
 const context=vm.createContext(sandbox);
 for(const script of scripts)vm.runInContext(readFileSync(script,'utf8'),context,{filename:script});
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(elements.get('status').textContent,/3 PNGs carregadas/);
 assert.equal(requests.length,4);assert.ok(requests.slice(0,3).every(path=>path.endsWith('_v2.png')));
 assert.equal(elements.get('animations').children.length,3);assert.equal(elements.get('filmstrip').children.length,4);
 function frame(time){assert.equal(frames.length,1);frames.shift()(time);assert.equal(frames.length,1);}
 frame(0);assert.ok(elements.get('face').draws.length);assert.equal(elements.get('comparison').draws.length,2);
 elements.get('play').onclick();assert.equal(elements.get('play').textContent,'REPRODUZIR ANIMAÇÕES');
 elements.get('next').onclick();frame(16);assert.match(elements.get('detail-label').textContent,/QUADRO 2/);
 elements.get('previous').onclick();frame(32);assert.match(elements.get('detail-label').textContent,/QUADRO 1/);
 elements.get('animations').children[1].children[0].children[1].onclick();frame(48);
 assert.match(elements.get('detail-label').textContent,/CAMINHANDO DE LADO/);
 elements.get('background').onchange({target:{value:'light'}});assert.equal(document.body.dataset.background,'light');
 elements.get('height').onchange({target:{value:'180'}});frame(64);
 elements.get('filmstrip').children[3].onclick();frame(80);assert.match(elements.get('detail-label').textContent,/QUADRO 4/);
 elements.get('play').onclick();frame(96);frame(196);assert.equal(elements.get('play').textContent,'PAUSAR ANIMAÇÕES');
});
