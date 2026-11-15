// Metadata inspection only: never modifies pixels or the approved v2 sprites.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
const decoder=readFileSync(new URL('validate-v2.mjs',import.meta.url),'utf8');
const decodePNG=new Function('assert','inflateSync',decoder.slice(decoder.indexOf('function decodePNG'),decoder.indexOf('const files='))+'return decodePNG;')(assert,inflateSync);
const bytes=readFileSync(new URL('professor_actions_v3.png',import.meta.url));
const {width,height,pixels}=decodePNG(bytes),frames=[];
for(let n=0;n<16;n++){
 const x=Math.floor(n%4*width/4),y=Math.floor(Math.floor(n/4)*height/4);
 const right=Math.floor((n%4+1)*width/4),bottom=Math.floor((Math.floor(n/4)+1)*height/4);
 let l=right,t=bottom,r=x,b=y,count=0;
 for(let py=y;py<bottom;py++)for(let px=x;px<right;px++)if(pixels[(py*width+px)*4+3]>16){
  l=Math.min(l,px);t=Math.min(t,py);r=Math.max(r,px);b=Math.max(b,py);count++;
 }
 assert.ok(count>1000);assert.ok(l>x+5&&r<right-5&&t>y+5&&b<bottom-5,'transparent gutter '+n);
 frames.push({x,y,width:right-x,height:bottom-y,anchorX:156,footY:b-y+1,referenceHeight:275,
  bounds:{x:l,y:t,width:r-l+1,height:b-t+1}});
}
if(process.argv.includes('--write'))writeFileSync(new URL('../../../js/professorActionFrames.js',import.meta.url),
 '// Measured supplemental poses; original v2 assets preserved.\nexport const PROFESSOR_ACTION_FRAMES='+JSON.stringify(frames,null,1)+';\n');
console.log('PASS: 16 isolated RGBA poses, transparent gutters; '+width+'x'+height);
console.log(frames.map((f,i)=>[i,f.footY,f.bounds.height]));
