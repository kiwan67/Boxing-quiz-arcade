// Read-only PNG validation with Node built-ins. Does not import the game.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const context={window:{}};
vm.runInNewContext(readFileSync(new URL('frames.js',import.meta.url),'utf8'),context);
const frames=context.window.PROFESSOR_CLIMB_PREVIEW.frames;
assert.equal(frames.length,8);assert.equal(new Set(frames.map(f=>f.file)).size,8);
const hashes=[];
function paeth(a,b,c){const n=a+b-c,x=Math.abs(n-a),y=Math.abs(n-b),z=Math.abs(n-c);return x<=y&&x<=z?a:y<=z?b:c;}
for(const frame of frames){
 const png=readFileSync(new URL(frame.file,import.meta.url)),width=png.readUInt32BE(16),height=png.readUInt32BE(20);
 assert.equal(png[24],8);assert.equal(png[25],6,'RGBA required');assert.equal(png[28],0);
 const chunks=[];
 for(let p=8;p<png.length;){const size=png.readUInt32BE(p);if(png.toString('ascii',p+4,p+8)==='IDAT')chunks.push(png.subarray(p+8,p+8+size));p+=size+12;}
 const raw=inflateSync(Buffer.concat(chunks)),pixels=new Uint8Array(width*height*4);let p=0;
 for(let y=0;y<height;y++){
  const filter=raw[p++];assert.ok(filter<=4);
  for(let x=0;x<width*4;x++){
   const i=y*width*4+x,a=x>=4?pixels[i-4]:0,b=y?pixels[i-width*4]:0,c=y&&x>=4?pixels[i-width*4-4]:0;
   pixels[i]=(raw[p++]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;
  }
 }
 let transparent=0,count=0,left=width,top=height,right=0,bottom=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const alpha=pixels[(y*width+x)*4+3];if(alpha===0)transparent++;
  if(alpha>16){count++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 }
 assert.ok(count>1000);assert.ok(transparent>width*height*.15,'real transparent background');
 assert.ok(left>4&&top>4&&right<width-5&&bottom<height-5,'complete character with transparent margins');
 hashes.push(createHash('sha256').update(pixels).digest('hex'));
 console.log(`${frame.file}: ${width}×${height} RGBA, ${Math.round(transparent/width/height*100)}% transparente, limites ${left},${top}–${right},${bottom}`);
}
assert.equal(new Set(hashes).size,8,'eight distinct PNGs required');
console.log('PASS: 8 PNGs diferentes, alfa real e personagens completos com margens.');
