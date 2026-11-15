import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeRGBA} from '../../../tests/helpers/png.mjs';
const image=decodeRGBA(readFileSync(new URL('professor_sad_exit_v1.png',import.meta.url)));
const {width,height,pixels}=image,frames=[],hashes=[];
for(let i=0;i<8;i++){
 const x=Math.floor((i%4)*width/4),y=Math.floor(Math.floor(i/4)*height/2);
 const w=Math.floor((i%4+1)*width/4)-x,h=Math.floor((Math.floor(i/4)+1)*height/2)-y;
 let left=x+w,top=y+h,right=x,bottom=y,count=0,transparent=0;
 const alpha=[];
 for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++){
  const a=pixels[(py*width+px)*4+3];alpha.push(a);if(a===0)transparent++;
  if(a>16){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);count++;}
 }
 assert.ok(count>1000);assert.ok(transparent>w*h*.3);assert.ok(left>x+4&&right<x+w-4&&top>y+4&&bottom<y+h-4,'isolated full-body pose');
 let shoeLeft=right,shoeRight=left;
 for(let py=Math.floor(top+(bottom-top)*.82);py<=bottom;py++)for(let px=left;px<=right;px++)if(pixels[(py*width+px)*4+3]>16){shoeLeft=Math.min(shoeLeft,px);shoeRight=Math.max(shoeRight,px);}
 frames.push({x,y,width:w,height:h,anchorX:(shoeLeft+shoeRight)/2-x,footY:bottom+1-y,bounds:{x:left,y:top,width:right-left+1,height:bottom-top+1}});
 hashes.push(createHash('sha256').update(Buffer.from(alpha)).digest('hex'));
}
assert.equal(new Set(hashes).size,8);
const referenceHeight=frames[0].bounds.height;
for(const frame of frames)frame.referenceHeight=referenceHeight;
if(process.argv.includes('--write'))writeFileSync(new URL('../../../js/professorSadFrames.js',import.meta.url),
 '// Generated metadata from existing PNG alpha; no image pixels modified.\nexport const PROFESSOR_SAD_IMAGE_SIZE='+JSON.stringify({width,height})+';\nexport const PROFESSOR_SAD_FRAMES='+JSON.stringify(frames,null,1)+';\n');
console.log(JSON.stringify({width,height,referenceHeight,frames},null,2));
console.log('PASS: eight distinct full-body RGBA poses with transparent gutters.');
