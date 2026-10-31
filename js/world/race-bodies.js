// Body-type anatomy and reference hairstyles, independent of class clothing and combat, after the game's own race
// models. The build: arms and legs (thickness), hands and feet (size), chest (breadth), belly, shoulders (width),
// stoop (knees kept bent), hunch (the spine bent forward), ears and earScale.
const bodies = {
  RaceHuman: [
    // Bald, a dark goatee and moustache, broad and muscled.
    {skin:0xb27e59,width:1.06,head:.76,headY:.22,hair:null,beard:0x241a14,beardStyle:'goatee',jaw:1.08,arms:1.2,legs:1.1,hands:1.1,chest:1.12,shoulders:1.05},
    // Slim, long dark hair.
    {skin:0xb98560,width:.91,head:.70,headY:.23,hair:{color:0x2a1d18,style:'long'},jaw:.88,bust:.085,seat:.045,arms:.95},
  ],
  RaceDwarf: [
    // Bald, a great red beard, a barrel chest and heavy limbs, big hands and feet.
    {skin:0xad7b58,width:1.38,head:1.02,headY:.28,hair:null,beard:0x985021,arms:1.4,legs:1.3,hands:1.4,feet:1.35,chest:1.15,belly:.03,shoulders:1.08},
    // Sturdy and round, long red hair.
    {skin:0xb68161,width:1.14,head:.87,headY:.30,hair:{color:0x8a3a1a,style:'long'},beard:null,bushy:false,jaw:.91,bust:.075,seat:.04,arms:1.15,legs:1.25,hands:1.15,feet:1.2,belly:.035},
  ],
  RaceGnome: [
    // Bald and beardless, big round ears and nose, strong arms, big hands and feet.
    {skin:0xd2a684,width:.96,head:.91,headY:.50,hair:null,beard:null,nose:'big',earScale:1.6,jaw:1.03,eyeScale:1.3,bigBrows:0x7a5a46,arms:1.25,legs:1.05,hands:1.45,feet:1.4,chest:1.05},
    // A tall lilac bun, small pointed ears, earrings; a cute face: big lashed eyes, full rosy lips, a little blush.
    {skin:0xd8a77f,width:.89,head:.86,headY:.48,hair:{color:0xc59ad8,style:'tallbun'},beard:null,ears:'small',earrings:true,jaw:.84,eyeScale:1.45,lashes:true,lips:0xc4566a,blush:0xe07a8a,bust:.10,seat:.05,hands:1.2,feet:1.25},
  ],
  RaceNightElf: [
    // Tall and powerfully muscled, long green hair, no beard, long ears.
    {skin:0x7950ac,width:1.05,head:.80,headY:.22,hair:{color:0x4f8a1e,style:'long'},beard:null,earLength:.36,eyeGlow:0xffeb9e,arms:1.2,legs:1.1,chest:1.12,shoulders:1.06},
    // Tall and slim, green hair to the shoulders.
    {skin:0x9e88ca,width:.83,head:.72,headY:.23,hair:{color:0x4f8a1e,style:'bob'},beard:null,earLength:.32,eyeGlow:0xe5f4ff,jaw:.9,bust:.07,seat:.035,arms:.9,legs:.95},
  ],
  RaceOrc: [
    // Bald, hulking: huge arms and shoulders, big hands and feet, the knees a little bent.
    {skin:0x789334,width:1.36,head:.98,hair:null,arms:1.55,legs:1.3,hands:1.5,feet:1.35,chest:1.2,shoulders:1.12,stoop:.08},
    // Athletic and strong, a dark topknot.
    {skin:0x6b8c39,width:1.03,head:.78,headY:.23,hunch:.08,hair:{color:0x2a2040,style:'topknot'},jaw:1.04,bust:.075,seat:.035,arms:1.15,legs:1.1,hands:1.15,shoulders:1.04},
  ],
  RaceUndead: [
    // Bald and stooped, a bent back and bent knees, thin limbs with clawed hands.
    {skin:0xb9c2b4,width:.88,head:.82,hunch:.30,stoop:.18,hair:null,arms:.8,legs:.8,hands:1.15,chest:.92},
    // Thin, a slight stoop, spiky olive hair.
    {skin:0xc4ccc4,width:.75,head:.72,headY:.23,hunch:.15,stoop:.06,hair:{color:0x6a6a24,style:'swept'},jaw:.9,bust:.05,seat:.02,arms:.8,legs:.85},
  ],
  RaceTauren: [
    // Shaggy black fur, huge and heavy, pale hooves.
    {skin:0x2e2e33,width:1.65,head:1.15,hair:{color:0x1c1c20,style:'long'},hoofColor:0xcfc6b4,arms:1.45,legs:1.4,hands:1.35,chest:1.15,stoop:.06},
    // Black fur, tall and slimmer, pale hooves.
    {skin:0x2e2e33,width:1.12,head:.91,headY:.24,hunch:.10,hair:{color:0x1c1c20,style:'long'},hoofColor:0xcfc6b4,bust:.06,seat:.035,arms:1.1,legs:1.15,hands:1.2},
  ],
  RaceTroll: [
    // Bald, tall and thin, deeply hunched on bent knees, huge swept ears, big hands and feet.
    {skin:0x528d98,width:1.02,head:.89,hunch:.45,stoop:.22,hair:null,earScale:1.45,arms:.9,legs:.85,hands:1.5,feet:1.35},
    // Slim and upright, a magenta mohawk, earrings.
    {skin:0x6b9c9a,width:.81,head:.73,headY:.23,hunch:.09,hair:{color:0xc0208a,style:'mohawk'},earrings:true,jaw:.87,bust:.065,seat:.035,arms:.85,legs:.85,hands:1.2,feet:1.25},
  ],
  RaceHighOrderSkyborne: [
    // Tall and lean, bald, long ears standing straight up.
    {skin:0xb7c3c3,width:1.02,head:.75,headY:.22,hair:null,ears:'sky',earLength:.26,eyeGlow:0xffdc72,arms:.95,legs:.95},
    // Very slim, long hair, ears standing up.
    {skin:0xb2c8ca,width:.80,head:.68,headY:.23,hair:{color:0x183744,style:'long'},ears:'sky',earLength:.24,eyeGlow:0xffdc72,jaw:.88,bust:.07,seat:.035,arms:.82,legs:.88},
  ],
  RaceWindshaperSkyborne: [
    {skin:0x66516f,width:1.02,head:.75,headY:.22,hair:null,ears:'sky',earLength:.26,eyeGlow:0xe1edff,arms:.95,legs:.95},
    {skin:0x614765,width:.80,head:.68,headY:.23,hair:{color:0x9bd3d2,style:'long'},ears:'sky',earLength:.24,eyeGlow:0xe1edff,jaw:.88,bust:.07,seat:.035,arms:.82,legs:.88},
  ],
};
export function raceBody(race, base, bodyType) {
  const female=bodyType==='body2';
  return {...base,female,bust:0,seat:0,beard:null,stubble:null,...bodies[race]?.[female?1:0],softEyes:!base.eyeGlow && !base.tauren,brows:base.brows};
}
