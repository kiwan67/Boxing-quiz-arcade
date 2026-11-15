export const MENU_CONFIG=Object.freeze({
 backgroundPath:'../assets/images/menu/menu_background.png', // Legacy path retained for compatibility.
 backgroundImages:Object.freeze([
  '../assets/images/menu/menu_background_01.png',
  '../assets/images/menu/menu_background_02.png',
  '../assets/images/menu/menu_background_03.png',
  '../assets/images/menu/menu_background_04.png',
  '../assets/images/menu/menu_background_05.png',
  '../assets/images/menu/menu_background.png'
 ]),
 // Only images visually confirmed to contain the logo belong here.
 backgroundImagesWithLogo:Object.freeze([
  '../assets/images/menu/menu_background_01.png',
  '../assets/images/menu/menu_background_02.png',
  '../assets/images/menu/menu_background_03.png',
  '../assets/images/menu/menu_background_04.png',
  '../assets/images/menu/menu_background_05.png'
 ]),
 imageDisplaySeconds:5,imageFadeSeconds:1,
 imageScale:1,imagePositionX:.5,imagePositionY:.5,
 leftShadeOpacity:.65,leftShadeWidth:.48,
 titleX:30,titleY:35,titleScale:3,titleLineHeight:34,
 optionsX:30,optionsY:181,optionsWidth:174,optionHeight:32,optionGap:8
});
export function menuImageRect(imageWidth,imageHeight,width=640,height=360,config=MENU_CONFIG){
 const scale=Math.max(width/imageWidth,height/imageHeight)*Math.max(1,config.imageScale);
 const w=imageWidth*scale,h=imageHeight*scale;
 return {x:(width-w)*config.imagePositionX||0,y:(height-h)*config.imagePositionY||0,width:w,height:h};
}
