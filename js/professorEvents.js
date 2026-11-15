// Presentation-only notifications. No combat state, counters or persistence.
const listeners=new Set();
export function subscribeProfessorEvents(listener){listeners.add(listener);return ()=>listeners.delete(listener);}
export function emitProfessorEvent(state,type,detail={}){
 for(const listener of listeners){
  try{listener(state,{type,...detail});}
  catch(error){console.warn('[PROFESSOR] Falha na apresentação opcional:',error);}
 }
}
