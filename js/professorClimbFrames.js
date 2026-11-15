// Existing approved PNGs, measured in their native 1254 x 1254 coordinates.
// Horizontal anchors follow the body axis; vertical anchors follow the shoe.
// Frames 1-4
// keep the rear foot on the lower floor; 5-8 plant the leading foot in the ring.
export const PROFESSOR_CLIMB_INTEGRATED=true;
// Frame 4: rear sole at 1172, leading sole at 900. This measured separation
// defines the step height so the leading shoe meets the existing ring floor.
export const PROFESSOR_CLIMB_STEP_RATIO=(1172-900)/1063;
const measurements=[
 // anchorX, footY, referenceHeight, alpha bounds (inclusive), upper support
 [600,1161,1063,419,98,788,1160,false],
 [650,1145,1063,307,122,946,1144,false],
 [610,1161,1063,334,95,879,1160,false],
 [620,1172,1063,305,91,934,1171,false],
 [760,910,1063,255,159,978,1112,true],
 [650,950,1063,331,93,900,1149,true],
 [650,1045,1063,349,65,900,1044,true],
 [620,1082,962,450,120,787,1081,true]
];
export const PROFESSOR_CLIMB_FRAMES=Object.freeze(measurements.map(([anchorX,footY,referenceHeight,left,top,right,bottom,upperSupport],i)=>Object.freeze({
 x:0,y:0,width:1254,height:1254,anchorX,footY,referenceHeight,
 sheet:`climb${i+1}`,upperSupport,
 bounds:Object.freeze({x:left,y:top,width:right-left+1,height:bottom-top+1})
})));
export const PROFESSOR_CLIMB_URLS=Object.freeze(Object.fromEntries(PROFESSOR_CLIMB_FRAMES.map((frame,i)=>[
 frame.sheet,new URL(`../assets/sprites/professor/subida_preview_v1/frame_0${i+1}.png`,import.meta.url).href
])));
