import test from 'node:test';
import assert from 'node:assert/strict';
import {professorPresentationFrame,PROFESSOR_ENTRY_TIMING as timing,PROFESSOR_POSITIONS} from '../js/professorAnimation.js';
import {professorEntryDiagnostics,professorFootInsideRing,professorRightEntrySpace} from '../js/professorEntryDiagnostics.js';
import {professorSpriteFrame} from '../js/professorSprites.js';
const edgeStart=timing.prepare+timing.approach;
const climbStart=edgeStart+timing.edge+timing.stop;
const at=t=>professorPresentationFrame({elapsed:t,entryElapsed:t});

test('extended walk stops outside before the first climb frame',()=>{
 const outside=at(edgeStart),stopped=at(climbStart-.01);
 assert.equal(professorFootInsideRing(outside),false);
 assert.equal(stopped.layer,'OUTSIDE');assert.equal(stopped.stage,'stop');
 assert.equal(professorFootInsideRing(stopped),false);
 const info=professorEntryDiagnostics(stopped);
 assert.equal(info.entryStatus,'FORA');assert.equal(info.prematureEntry,false);
 assert.equal(info.orderWarning,null);assert.equal(info.climbFrame,null);
 assert.equal(at(climbStart+.001).clip,'climbing');
});

test('right corridor is narrower than the existing body and must not be treated as an entrance',()=>{
 const info=professorRightEntrySpace(PROFESSOR_POSITIONS.outside.height);
 assert.equal(info.availableWidth,32);assert.ok(info.requiredWidth>82);assert.equal(info.fits,false);
});

test('debug distinguishes climb frame and position from the compositing layer',()=>{
 for(let i=0;i<8;i++){
  const frame=at(climbStart+(i+.5)*timing.climb/8),info=professorEntryDiagnostics(frame);
  assert.equal(info.entryStatus,'SUBINDO');assert.equal(info.climbFrame,i+1);
  assert.equal(info.climbTotalFrames,8);
  assert.match(professorSpriteFrame(frame.clip,frame.elapsed).sheet,/^climb[1-8]$/);
 }
 assert.equal(professorEntryDiagnostics(at(climbStart+timing.climb+.01)).entryStatus,'DENTRO');
});
