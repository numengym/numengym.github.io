// Cosmetic profiles only: no stats, class availability, equipment rules or spell IDs.
// Classic references and the public model API are documented in CHARACTER-MODELS.md.
export const STARTER_RACES = {
  RaceHuman: { top: 'shirt', cloth: 0xb5aa8a, pants: 0x635643, leather: 0x59422c, weapon: 9 },
  RaceDwarf: { top: 'shirt', cloth: 0xb5aa8a, pants: 0x635643, leather: 0x59422c, weapon: 1 },
  RaceGnome: { top: 'shirt', cloth: 0xb5aa8a, pants: 0x635643, leather: 0x59422c, weapon: 9 },
  RaceNightElf: { top: 'shirt', cloth: 0x78483b, pants: 0x665645, leather: 0x503a2c, weapon: 9 },
  RaceOrc: { top: 'harness', cloth: 0x72543a, pants: 0x66513a, leather: 0x4a3122, weapon: 1 },
  RaceTroll: { top: 'harness', cloth: 0x72543a, pants: 0x66513a, leather: 0x4a3122, weapon: 1, barefoot: true },
  RaceTauren: { top: 'harness', cloth: 0x72543a, pants: 0x66513a, leather: 0x4a3122, weapon: 4 },
  RaceUndead: { top: 'harness', cloth: 0x675b4b, pants: 0x5c5143, leather: 0x44372c, weapon: 9 },
  // Forever-specific races: restrained placeholders, not claimed as verified starter sets.
  RaceHighOrderSkyborne: { top: 'shirt', cloth: 0xb4b0a2, pants: 0x69717c, leather: 0x5b5345, weapon: 9 },
  RaceWindshaperSkyborne: { top: 'shirt', cloth: 0x8b9e88, pants: 0x56665d, leather: 0x514d3b, weapon: 9 },
};

// These are visual starting points, not finished class implementations. Adding a class outfit
// does not change the rig, race anatomy, combat logic, or transformation renderer.
export const CLASS_OUTFITS = {
  warrior: {},
  paladin: { top: 'shirt', cloth: 0xb6ac8b, weapon: 4 },
  hunter: { top: 'vest', cloth: 0x776747 },
  rogue: { top: 'vest', cloth: 0x625d52, weapon: 2 },
  priest: { top: 'robe', cloth: 0xb5ad94, weapon: 4 },
  mage: { top: 'robe', cloth: 0x65617f, weapon: '2h8' },
  warlock: { top: 'robe', cloth: 0x514e62, weapon: '2h8' },
  druid: { top: 'robe', cloth: 0x74694a, weapon: '2h8' },
  shaman: { top: 'vest', cloth: 0x8d7960, weapon: 4 },
};

export function starterOutfit(race, classId = 'warrior') {
  return { ...(STARTER_RACES[race] || STARTER_RACES.RaceOrc), ...(CLASS_OUTFITS[classId] || CLASS_OUTFITS.warrior) };
}

export function normalizeAppearance({ classId = 'warrior', transform = null } = {}) {
  return {
    classId: Object.hasOwn(CLASS_OUTFITS, classId) ? classId : 'warrior',
    transform: transform === 'noggenfogger' ? 'noggenfogger' : null,
  };
}
