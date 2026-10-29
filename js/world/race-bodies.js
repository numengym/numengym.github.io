// Body-type anatomy and reference hairstyles, independent of class clothing and combat.
const bodies = {
  RaceHuman: [
    {skin:0xb27e59,width:1.06,head:.76,headY:.22,hair:{color:0x71452c,style:'long'},beard:null,stubble:0x65422d,jaw:1.08},
    {skin:0xb98560,width:.91,head:.70,headY:.23,hair:{color:0x655d4d,style:'bob'},jaw:.88,bust:.085,seat:.045},
  ],
  RaceDwarf: [
    {skin:0xad7b58,width:1.38,head:1.02,headY:.28,hair:{color:0x985021,style:'short'},beard:0x985021},
    {skin:0xb68161,width:1.14,head:.87,headY:.30,hair:{color:0x793d26,style:'braided'},beard:null,bushy:false,jaw:.91,bust:.075,seat:.04},
  ],
  RaceGnome: [
    {skin:0xb27c58,width:.96,head:.91,headY:.50,hair:{color:0x2c6624,style:'mohawk'},beard:0x2c6624,jaw:1.03},
    {skin:0x79503d,width:.89,head:.86,headY:.48,hair:{color:0x935f29,style:'bob'},beard:null,jaw:.90,bust:.10,seat:.05},
  ],
  RaceNightElf: [
    {skin:0x7950ac,width:1.05,head:.80,headY:.22,hair:{color:0x3a1769,style:'long'},beard:0x3a1769,beardStyle:'goatee',earLength:.33,eyeGlow:0xffeb9e},
    {skin:0x9e88ca,width:.83,head:.72,headY:.23,hair:{color:0x351357,style:'bob'},beard:null,earLength:.29,eyeGlow:0xe5f4ff,jaw:.9,bust:.07,seat:.035},
  ],
  RaceOrc: [
    {skin:0x789334,width:1.36,head:.98,hair:{color:0x412137,style:'topknot'}},
    {skin:0x6b8c39,width:1.03,head:.78,headY:.23,hunch:.08,hair:{color:0x382921,style:'long'},jaw:1.04,bust:.075,seat:.035},
  ],
  RaceUndead: [
    {skin:0x92a78b,width:.88,head:.82,hair:{color:0x4a4935,style:'short'}},
    {skin:0x8caa9a,width:.75,head:.72,headY:.23,hair:{color:0x402b4b,style:'long'},jaw:.9,bust:.05,seat:.02},
  ],
  RaceTauren: [
    {skin:0x899c9b,width:1.65,head:1.15,hair:{color:0x302b28,style:'long'}},
    {skin:0x38383c,width:1.12,head:.91,headY:.24,hunch:.10,hair:{color:0x202027,style:'long'},bust:.06,seat:.035},
  ],
  RaceTroll: [
    {skin:0x528d98,width:1.02,head:.89,hair:{color:0xaf3b19,style:'mohawk'}},
    {skin:0x6b9c9a,width:.81,head:.73,headY:.23,hunch:.09,hair:{color:0xad3023,style:'mohawk'},jaw:.87,bust:.065,seat:.035},
  ],
  RaceHighOrderSkyborne: [
    {skin:0xb7c3c3,width:1.02,head:.75,headY:.22,hair:{color:0x9f6ada,style:'swept'},earLength:.24,eyeGlow:0xffdc72},
    {skin:0xb2c8ca,width:.80,head:.68,headY:.23,hair:{color:0x183744,style:'long'},earLength:.22,eyeGlow:0xffdc72,jaw:.88,bust:.07,seat:.035},
  ],
  RaceWindshaperSkyborne: [
    {skin:0x66516f,width:1.02,head:.75,headY:.22,hair:{color:0xdfc28c,style:'swept'},earLength:.24,eyeGlow:0xe1edff},
    {skin:0x614765,width:.80,head:.68,headY:.23,hair:{color:0x9bd3d2,style:'long'},earLength:.22,eyeGlow:0xe1edff,jaw:.88,bust:.07,seat:.035},
  ],
};
export function raceBody(race, base, bodyType) {
  const female=bodyType==='body2';
  return {...base,female,bust:0,seat:0,beard:null,stubble:null,...bodies[race]?.[female?1:0],softEyes:!base.eyeGlow && !base.tauren,brows:base.brows};
}
