import test from 'node:test';
import assert from 'node:assert/strict';
import { audioManifest } from '../js/audioManifest.js';
import { speakReferee, playArenaBell } from '../js/arenaAudio.js';
test('manifesto contém todos os arquivos opcionais e nenhuma voz',()=>{
 assert.equal(Object.keys(audioManifest).length,37);
 for(const [id,item] of Object.entries(audioManifest)){assert.ok(item.path.endsWith(id+'.mp3'));assert.ok(item.maxSimultaneous>=1);assert.ok(item.volume>=0&&item.volume<=1);}
 assert.equal(speakReferee('Não falar'),false);assert.equal(playArenaBell(),false);
});

