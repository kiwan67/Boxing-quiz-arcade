// Shared native Canvas coordinates used by the scene and ringside presentation.
export const REAR_ROPES=Object.freeze([
 Object.freeze({y:114,top:113,bottom:122,base:'#c94351',light:'#f17a78',shadow:'#812b43'}),
 Object.freeze({y:141,top:140,bottom:149,base:'#d3dce0',light:'#ffffff',shadow:'#7f91a4'}),
 Object.freeze({y:168,top:167,bottom:176,base:'#366fc5',light:'#70abe7',shadow:'#23467e'})
]);
export const REAR_RIGHT_POST_LEFT=578;
export const REAR_RING_FLOOR=184;
export const ARENA_WIDTH=640;
// Bounds measured from drawRearStructures, including the existing post foot.
export const REAR_RIGHT_POST=Object.freeze({left:578,right:608,top:94,bottom:206});
// Outer floor polygon in drawFloor(): rear corners and the front flare.
// Presentation diagnostics only; this does not change the scenery.
export const RING_FLOOR_BOUNDARY=Object.freeze({rearLeft:43,rearRight:597,rearY:184,frontLeft:0,frontRight:640,frontY:326,bottom:360});
