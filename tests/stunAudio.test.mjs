import test from 'node:test';
import assert from 'node:assert/strict';
import { playStunSound, getAudioContext } from '../js/audio.js';
test('atordoamento não gera osciladores nem áudio substituto',()=>{assert.equal(playStunSound(),false);assert.equal(getAudioContext(),undefined);});
