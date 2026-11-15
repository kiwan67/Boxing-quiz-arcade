import {preloadProfessorSprites} from '../../js/professorSprites.js';
export async function loadProfessorSprites(){
 return preloadProfessorSprites(class {
  naturalWidth=1254;naturalHeight=1254;
  set src(value){this.url=value;this.onload();}
 });
}
