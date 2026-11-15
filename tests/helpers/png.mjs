import {inflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
export function decodeRGBA(png){
 const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
 assert.equal(png[24],8);assert.equal(png[25],6);assert.equal(png[28],0);
 const chunks=[];
 for(let p=8;p<png.length;){const size=png.readUInt32BE(p);if(png.toString('ascii',p+4,p+8)==='IDAT')chunks.push(png.subarray(p+8,p+8+size));p+=size+12;}
 const raw=inflateSync(Buffer.concat(chunks)),pixels=new Uint8Array(width*height*4);let p=0;
 const paeth=(a,b,c)=>{const n=a+b-c,x=Math.abs(n-a),y=Math.abs(n-b),z=Math.abs(n-c);return x<=y&&x<=z?a:y<=z?b:c;};
 for(let y=0;y<height;y++){
  const filter=raw[p++];assert.ok(filter<=4);
  for(let x=0;x<width*4;x++){
   const i=y*width*4+x,a=x>=4?pixels[i-4]:0,b=y?pixels[i-width*4]:0,c=y&&x>=4?pixels[i-width*4-4]:0;
   pixels[i]=(raw[p++]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;
  }
 }
 return {width,height,pixels};
}
