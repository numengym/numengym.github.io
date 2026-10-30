// Original cosmetic choices; defaults retain each screenshot-derived race/body appearance.
export const HAIR_COLORS={black:0x242127,brown:0x65412b,chestnut:0x8e492b,blonde:0xc6a05e,ginger:0xb45d30,silver:0xbfc3c9,white:0xe4dfcf,red:0x852e38,violet:0x765296,blue:0x385c89,teal:0x286e69,green:0x49713b};
export const EYE_COLORS={brown:0x705036,blue:0x5796bb,green:0x60a579,amber:0xd4a551,violet:0x9e76c4,silver:0xc5dde7};
const styles=['short','swept','bob','long','ponytail','bun','braid','topknot','mohawk','pigtails','bald'];
export function customizationOptions(race){
  return {hairStyle:race==='RaceTauren'?['short','mohawk','topknot','braid','bald']:race==='RaceUndead'?[...styles,'stringy']:styles,
    hairColor:Object.keys(HAIR_COLORS),eyeColor:Object.keys(EYE_COLORS),skinTone:['light','warm','deep'],face:['soft','angular','broad'],
    beard:['none','stubble','goatee','braided'],markings:['none','scar','warpaint'],jewelry:['none','earrings'],
    feature:race==='RaceTauren'?['short-horns','wide-horns']:['RaceOrc','RaceTroll'].includes(race)?['short-tusks','long-tusks']:race==='RaceNightElf'||race?.includes('Skyborne')?['short-ears','long-ears']:[]};
}
export function normalizeCustomization(value={},race){
  const result={},options=customizationOptions(race);
  for(const key of Object.keys(options))if(options[key].includes(value?.[key]))result[key]=value[key];
  return result;
}
export function customizeLook(look,custom={}){
  const out={...look,hair:look.hair?{...look.hair}:null,custom};
  if(custom.hairStyle)out.hair=custom.hairStyle==='bald'?null:{color:look.hair?.color||0x443329,style:custom.hairStyle};
  if(custom.hairColor){if(out.hair)out.hair.color=HAIR_COLORS[custom.hairColor];out.brows=HAIR_COLORS[custom.hairColor];if(out.beard)out.beard=HAIR_COLORS[custom.hairColor];}
  if(custom.eyeColor){out.iris=EYE_COLORS[custom.eyeColor];if(out.eyeGlow)out.eyeGlow=out.iris;}
  if(custom.face)out.jaw={soft:.88,angular:1.02,broad:1.15}[custom.face];
  if(custom.skinTone){const factor={light:1.16,warm:1.03,deep:.72}[custom.skinTone],c=look.skin;out.skin=[16,8,0].reduce((v,shift)=>v|(Math.min(255,Math.round(((c>>shift)&255)*factor))<<shift),0);}
  if(custom.beard){out.beard=null;out.stubble=null;if(custom.beard==='stubble')out.stubble=out.hair?.color||0x47372e;else if(custom.beard!=='none'){out.beard=out.hair?.color||0x47372e;out.beardStyle=custom.beard==='goatee'?'goatee':null;}}
  if(custom.feature==='short-ears')out.earLength=.20;if(custom.feature==='long-ears')out.earLength=.38;
  return out;
}
