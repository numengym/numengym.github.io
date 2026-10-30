import {normalizeCustomization} from './customization.js';
// Cosmetic rules verified against the user's Forever creation-screen references.
export const RACE_CLASSES = {
  RaceHuman: ['warrior','hunter','mage','rogue','priest','warlock','paladin'],
  RaceDwarf: ['warrior','hunter','rogue','priest','paladin','shaman'],
  RaceGnome: ['warrior','mage','rogue','priest','warlock'],
  RaceNightElf: ['warrior','hunter','rogue','priest','druid'],
  RaceOrc: ['warrior','hunter','mage','rogue','warlock','shaman'],
  RaceUndead: ['warrior','mage','rogue','priest','warlock','paladin'],
  RaceTauren: ['warrior','hunter','druid','shaman'],
  RaceTroll: ['warrior','hunter','mage','rogue','priest','warlock','shaman'],
  RaceHighOrderSkyborne: ['warrior','hunter','mage','rogue','druid'],
  RaceWindshaperSkyborne: ['warrior','hunter','rogue','druid','shaman'],
};
export const CLASS_OUTFITS = Object.fromEntries(['warrior','hunter','mage','rogue','priest','warlock','paladin','druid','shaman'].map(id => [id, {}]));
export const allowedClasses = race => [...(RACE_CLASSES[race] || RACE_CLASSES.RaceOrc)];
export const defaultBodyType = race => ['RaceHuman','RaceGnome'].includes(race) ? 'body2' : 'body1';
// Garment shapes shared only where the references show matching starter sets.
const sets = {
  recruit: { pattern:'recruit', cloth:0xd3c7a3, pants:0x9c741d, leather:0x352a22, trim:0xa8864a, sleeves:'none', weapon:'starter-sword', offhand:'buckler', kneePatch:true, bootHeight:.29 },
  sentinel: { pattern:'vest', cloth:0x743e39, pants:0x743e39, leather:0x3c2b29, trim:0x636c76, sleeves:'none', weapon:'starter-sword', offhand:'buckler', bootHeight:.27 },
  grunt: { pattern:'harness', cloth:0x4a3020, pants:0x705032, leather:0x3e2c22, trim:0x31552e, sleeves:'none', weapon:'starter-axe', offhand:'buckler', shorts:true, bootHeight:.23 },
  hunt: { pattern:'hunter', cloth:0x7e5533, pants:0x9a733b, leather:0x5c442a, trim:0x6d7650, sleeves:'short', weapon:'bow', offhand:null, bootHeight:.18 },
  huntHorde: { pattern:'hunter', cloth:0x89421e, pants:0x946129, leather:0x4f3021, trim:0xbaa16b, sleeves:'none', weapon:'bow', offhand:null, shorts:true, furCuff:true, bootHeight:.15 },
  shadow: { pattern:'vest', cloth:0x303c39, pants:0x303c39, leather:0x292828, trim:0x733b36, sleeves:'bands', weapon:'starter-dagger', offhand:null, bootHeight:.27 },
  shadowHorde: { pattern:'vest', cloth:0x393047, pants:0x292738, leather:0x25232d, trim:0x57505e, sleeves:'bands', weapon:'starter-dagger', offhand:null, bootHeight:.26, midriff:true },
  apprentice: { pattern:'robe', cloth:0x6152a0, pants:0x6152a0, leather:0x51402c, trim:0x49316e, sleeves:'long', weapon:'staff', offhand:null, skirt:true },
  apprenticeHorde: { pattern:'robe', cloth:0x596e62, pants:0x596e62, leather:0x443b31, trim:0x74616c, sleeves:'long', weapon:'staff', offhand:null, skirt:true },
  acolyte: { pattern:'robe', cloth:0x862b3e, pants:0x862b3e, leather:0x533027, trim:0xa13a31, sleeves:'long', weapon:'starter-dagger', offhand:null, skirt:true },
  acolyteHorde: { pattern:'robe', cloth:0x9d3029, pants:0x9d3029, leather:0x462b25, trim:0x5c242b, sleeves:'short', weapon:'starter-dagger', offhand:null, skirt:true, midriff:true },
  neophyte: { pattern:'priest', cloth:0xd0cead, pants:0xd0cead, leather:0x74583b, trim:0x478395, accent:0xb6935c, sleeves:'bell', weapon:'starter-mace', offhand:null, skirt:true },
  neophyteHorde: { pattern:'robe', cloth:0x84733b, pants:0x84733b, leather:0x5a3b24, trim:0xa47937, sleeves:'long', weapon:'starter-mace', offhand:null, skirt:true },
  squire: { pattern:'buttons', cloth:0x3b587f, pants:0x4a4c68, leather:0x584432, trim:0xb19558, sleeves:'short', weapon:'starter-hammer', offhand:null, bootHeight:.22 },
  shaman: { pattern:'shaman', cloth:0x8d7444, pants:0x75603b, leather:0x4a3523, trim:0xc2a564, sleeves:'short', weapon:'starter-mace', offhand:null, skirt:true, midriff:true },
  druid: { pattern:'druid', cloth:0x344c2b, pants:0x344c2b, leather:0x5b4930, trim:0x8a9274, sleeves:'none', weapon:'staff', offhand:null, skirt:true, leaves:true },
  taurenDruid: { pattern:'druid', cloth:0x95502c, pants:0x95502c, leather:0x654229, trim:0xc5ad6e, accent:0x4a9399, sleeves:'none', weapon:'staff', offhand:null, skirt:true, sash:true },
  sky: { pattern:'sky', cloth:0x337e70, pants:0x337e70, leather:0x66513c, trim:0xc2a15f, accent:0xdec993, sleeves:'short', weapon:'starter-sword', offhand:'buckler', shorts:true, midriff:true, bootHeight:.28 },
};
const raceSets = {
  RaceHuman: {warrior:'recruit',hunter:'hunt',mage:'apprentice',rogue:'shadow',priest:'neophyte',warlock:'acolyte',paladin:'squire'},
  RaceDwarf: {warrior:'recruit',hunter:'hunt',rogue:'shadow',priest:'neophyte',paladin:'squire',shaman:'shaman'},
  RaceGnome: {warrior:'recruit',mage:'apprentice',rogue:'shadow',priest:'neophyte',warlock:'acolyte'},
  RaceNightElf: {warrior:'sentinel',hunter:'hunt',rogue:'shadow',priest:'neophyte',druid:'druid'},
  RaceOrc: {warrior:'grunt',hunter:'huntHorde',mage:'apprenticeHorde',rogue:'shadowHorde',warlock:'acolyteHorde',shaman:'shaman'},
  RaceUndead: {warrior:'grunt',mage:'apprenticeHorde',rogue:'shadowHorde',priest:'neophyteHorde',warlock:'acolyteHorde',paladin:'grunt'},
  RaceTauren: {warrior:'grunt',hunter:'huntHorde',druid:'taurenDruid',shaman:'shaman'},
  RaceTroll: {warrior:'grunt',hunter:'huntHorde',mage:'apprenticeHorde',rogue:'shadowHorde',priest:'neophyteHorde',warlock:'acolyteHorde',shaman:'shaman'},
};
export const STARTER_RACES = Object.fromEntries(Object.keys(RACE_CLASSES).map(race => [race, {...(sets[raceSets[race]?.warrior] || sets.sky)}]));
export function normalizeAppearance({classId='warrior',transform=null,bodyType=null,customization={}}={}, race) {
  return {customization:normalizeCustomization(customization,race),classId:Object.hasOwn(CLASS_OUTFITS,classId) && (!race || allowedClasses(race).includes(classId)) ? classId : 'warrior', transform:transform === 'noggenfogger' ? transform : null, bodyType:['body1','body2'].includes(bodyType) ? bodyType : null};
}
export function starterOutfit(race, classId='warrior', bodyType=defaultBodyType(race)) {
  classId=normalizeAppearance({classId},race).classId;
  const sky=race.includes('Skyborne');
  const o={...sets[sky ? 'sky' : raceSets[race]?.[classId] || 'grunt']};
  if (['RaceDwarf','RaceTauren'].includes(race) && classId==='hunter') o.weapon='gun';
  if (race==='RaceUndead' && classId==='warrior') o.weapon='starter-sword';
  if (race==='RaceDwarf' && classId==='paladin') Object.assign(o,{cloth:0x80663c,pants:0x754e3b});
  if ((race==='RaceTauren' && classId==='warrior') || (race==='RaceUndead' && classId==='paladin')) Object.assign(o,{weapon:'starter-hammer',offhand:null});
  if (race==='RaceNightElf' && classId==='priest') Object.assign(o,{cloth:0x8d8624,pants:0x8d8624,trim:0xb3a65c,sleeves:'bands',pattern:'robe'});
  if (race==='RaceTroll' && classId==='rogue') Object.assign(o,{cloth:0x9e482c,pants:0x9e482c,trim:0x725340});
  if (race==='RaceTroll' && classId==='shaman') Object.assign(o,{cloth:0x4e7986,pants:0x96703a,trim:0xc1934b,accent:0x416e9e,pattern:'trollShaman'});
  if (sky) {
    if (classId==='warrior') o.weapon='starter-scimitar';
    if (classId==='mage') Object.assign(o,{cloth:0x368a9f,pants:0x368a9f,weapon:'staff',offhand:null});
    if (classId==='rogue') Object.assign(o,{cloth:0x354956,pants:0x354956,trim:0x899ba0,weapon:'starter-dagger',offhand:null});
    if (classId==='hunter') Object.assign(o,{weapon:'bow',offhand:null});
    if (classId==='druid') Object.assign(o,{weapon:'staff',offhand:null});
    if (classId==='shaman') Object.assign(o,{cloth:0xd2d2b8,pants:0xd2d2b8,weapon:'mace',offhand:null});
    if (bodyType==='body2' || classId==='warrior') o.sleeves='none';
  }
  o.barefoot=['RaceTroll','RaceTauren'].includes(race); o.undead=race==='RaceUndead'; o.bodyType=bodyType;
  return o;
}
