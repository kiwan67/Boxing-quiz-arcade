// Inspect generated assets without modifying their pixels. Node built-ins only.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';

function decodePNG(buffer){
 const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20);
 assert.equal(buffer[24],8,'8-bit PNG required');assert.equal(buffer[25],6,'real RGBA required');assert.equal(buffer[28],0);
 const chunks=[];
 for(let p=8;p<buffer.length;){const n=buffer.readUInt32BE(p);
  if(buffer.toString('ascii',p+4,p+8)==='IDAT')chunks.push(buffer.subarray(p+8,p+8+n));p+=n+12;
 }
 const raw=inflateSync(Buffer.concat(chunks)),pixels=new Uint8Array(width*height*4);let p=0;
 function paeth(a,b,c){const n=a+b-c,x=Math.abs(n-a),y=Math.abs(n-b),z=Math.abs(n-c);return x<=y&&x<=z?a:y<=z?b:c;}
 for(let y=0;y<height;y++){
  const filter=raw[p++];assert.ok(filter<=4);
  for(let x=0;x<width*4;x++){
   const i=y*width*4+x,a=x>=4?pixels[i-4]:0,b=y?pixels[i-width*4]:0,c=y&&x>=4?pixels[i-width*4-4]:0;
   pixels[i]=(raw[p++]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;
  }
 }
 return {width,height,pixels};
}

const files=[
 ['observing','OBSERVANDO','professor_observando_v2.png',2.5],
 ['side','CAMINHANDO DE LADO','professor_caminhando_lado_v2.png',6],
 ['front','CAMINHANDO DE FRENTE','professor_caminhando_frente_v2.png',6]
];
const manifest={version:2,integrated:false,referenceHeight:0,clips:[]};
for(const [id,label,file,fps] of files){
 const bytes=readFileSync(new URL(file,import.meta.url)),{width,height,pixels}=decodePNG(bytes);
 assert.equal(width%2,0);assert.equal(height%2,0);
 const cw=width/2,ch=height/2,frames=[];let transparent=0,visible=0;
 for(let i=3;i<pixels.length;i+=4){if(pixels[i]===0)transparent++;if(pixels[i]>16)visible++;}
 assert.ok(transparent>width*height*.5,'background must be genuinely transparent');
 for(let n=0;n<4;n++){
  const x0=n%2*cw,y0=Math.floor(n/2)*ch;
  let left=x0+cw,top=y0+ch,right=x0,bottom=y0,count=0;
  for(let y=y0;y<y0+ch;y++)for(let x=x0;x<x0+cw;x++){
   if(pixels[(y*width+x)*4+3]<=16)continue;
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;
  }
  assert.ok(count>1000&&count<cw*ch*.7,'one isolated character per cell');
  assert.ok(left>x0+4&&right<x0+cw-4&&top>y0+4&&bottom<y0+ch-4,'character does not touch a neighboring cell');
  let headLeft=right,headRight=left;
  for(let y=top;y<top+(bottom-top)*.16;y++)for(let x=left;x<=right;x++){
   if(pixels[(y*width+x)*4+3]>128){headLeft=Math.min(headLeft,x);headRight=Math.max(headRight,x);}
  }
  const h=bottom-top+1;manifest.referenceHeight=Math.max(manifest.referenceHeight,h);
  frames.push({x:x0,y:y0,width:cw,height:ch,axisX:(headLeft+headRight)/2,footY:bottom+1,
   bounds:{x:left,y:top,width:right-left+1,height:h},visiblePixels:count});
 }
 assert.equal(new Set(frames.map(f=>f.visiblePixels)).size>1,true,'poses must differ');
 const clip={id,label,file,fps,width,height,cellWidth:cw,cellHeight:ch,frames,
  alpha:{transparentPixels:transparent,visiblePixels:visible},sha256:createHash('sha256').update(bytes).digest('hex')};
 manifest.clips.push(clip);
 console.log(`${file}: ${width}x${height}, RGBA, 4 frames of ${cw}x${ch}, ${Math.round(100*transparent/(width*height))}% fully transparent`);
}
assert.equal(new Set(manifest.clips.map(c=>`${c.cellWidth}x${c.cellHeight}`)).size,1,'all animation cells share uniform dimensions');
if(process.argv.includes('--write')){
 writeFileSync(new URL('preview-v2-data.js',import.meta.url),'// Preview only. No game module imports this file.\nwindow.PROFESSOR_PREVIEW_V2 = '+JSON.stringify(manifest,null,2)+';\n');
 console.log('Preview metadata written; PNGs remain unmodified.');
}
console.log('PASS: alpha, frame gutters, uniform dimensions and distinct poses.');
