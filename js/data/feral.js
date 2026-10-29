// Feral Druid (Cat and Bear) data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - ability damage, costs, cooldowns; talent rank curves (generatedCurves)
//   sim/druid/*.go                         - forms, paws, combo points, bleeds, Omen of Clarity, the feral talents
// The druid's talent tree, races and model are the Balance druid's (data/druid.js); a feral spec plays the same class
// in Cat Form (energy, combo points) or Dire Bear Form (rage, a tank).
// Not modelled: Prowl and Ravage/Pounce openers, Faerie Fire (Feral) cast by you (it is a raid debuff here), Dash,
// Feral Charge, Frenzied Regeneration, Barkskin, Demoralizing Roar, Bash, Growl, powershifting (leaving and re-entering
// a form for Furor's energy).
import { TALENT_TREE_DATA, TALENT_TREES, parseTalents } from './druid.js';

export { TALENT_TREE_DATA, TALENT_TREES, parseTalents };

// The wowsims Cat and Bear presets (ui/specs/druid/feralcat/presets.ts, feralbear/presets.ts).
export const CAT_TALENTS = '050022-35200032121130212051-053';
export const BEAR_TALENTS = '050022-25200302120132012051-055';
export const DEFAULT_TALENTS = CAT_TALENTS;

export const ENERGY = { max: 100, regen: 10 }; // sim/core/energy.go: 20 every 2 s
export const MAX_COMBO_POINTS = 5;
export const CAT_GCD = 1;
export const BEAR_GCD = 1.5;
export const REFUND_ON_MISS = 0.8; // the builders' miss refund (IssueRefund)

// The forms (Cat Form (Passive) 3025, Dire Bear Form (Passive) 9635). The paw replaces the weapon: the weapon's DPS
// times the paw's speed, ±20% (forms.go feralWeapon), plus the weapon's flat damage (an enchant, a weightstone).
export const FORMS = {
  cat: { name: 'Cat Form', icon: 'ability_druid_catform', ap: 120, apPerAgi: 1, speed: 1, threat: 0.71 },
  bear: { name: 'Dire Bear Form', icon: 'ability_racial_bearform', ap: 180, apPerAgi: 0, speed: 2.5, threat: 1.5, health: 1240, armorMult: 4.6 },
};
export const PAW_VARIANCE = 0.4;

// Talent values per rank (the wowsims rank curves), index = rank. Percent values as fractions unless named Pct.
const curve = (...v) => [0, ...v];
export const TALENT = {
  naturesMajesty: { critPct: curve(2, 4) },                          // 1223082: crit with spells and attacks
  naturesReach: { hitPct: curve(2, 4) },                             // 16819: hit with spells and attacks
  ferocity: { energy: curve(1, 2, 3, 4, 5), rage: curve(1, 2, 3, 4, 5) }, // 16934: Claw, Rake; Maul, Swipe, Primal Bite
  heartOfTheWild: { int: curve(0.02, 0.04, 0.06, 0.08, 0.1), sta: curve(0.04, 0.08, 0.12, 0.16, 0.2), str: curve(0.02, 0.04, 0.06, 0.08, 0.1) }, // 17003
  shreddingAttacks: { shred: curve(6, 12, 18), lacerate: curve(1, 2, 3) }, // 16966
  savageFury: { dmg: curve(0.05, 0.1), periodic: curve(0.05, 0.1) }, // 16998: Shred, Claw, Rake, Maul, Swipe; Rake's ticks
  sharpenedClaws: { critPct: curve(3, 6) },                          // 16942: in the forms
  predatoryStrikes: { ap: curve(30, 60, 90) },                       // 16972: 50/100/150% of your level, in the forms
  bloodFrenzy: { chance: curve(0.5, 1), rage: 5 },                   // 16958 / 16959: a builder's crit in Cat Form adds a combo point; a crit in Bear Form 5 rage
  improvedShiftingPower: { cd: curve(4, 8) },                        // 1322670
  naturalInstinct: { critBonus: curve(0.1, 0.2) },                   // 1223242: the feral attacks' crit damage bonus
  rendAndTear: { dmg: curve(0.02, 0.04, 0.06, 0.08, 0.1) },          // 1223246: specials and bleeds on a bleeding target
  naturalist: { dmg: curve(0.01, 0.02, 0.03, 0.04, 0.05) },          // 17069: all damage
  thickHide: { armor: curve(60, 120, 180) },                         // 16929: base armor (the bear forms scale it)
};

// Omen of Clarity (16864, baseline in Forever): 2 procs per minute at the paw's speed, 10 s cooldown; Clearcasting
// (16870) makes the next ability free.
export const OMEN = { ppm: 2, icd: 10, duration: 15 };
// Berserk (417141): 15 s, 3 min. Cat: the builders crit 100% more. Bear: Primal Bite has no cooldown and hits 3 more
// targets.
export const BERSERK = { critPct: 100, duration: 15, cd: 180, extraTargets: 3 };
// Enrage (5229): 10 rage now and 2 per second for 10 s; 16% less armor in Dire Bear Form.
export const ENRAGE = { now: 10, perSec: 2, duration: 10, armor: 0.84 };
// Howling Idol (272427): Shifting Power's cooldown 0.5 s shorter.
export const HOWLING_IDOL = { id: 272427, cd: 0.5 };

// Abilities. cost in energy (Cat) or rage (Bear); costPct of base mana; base: flat damage, weapon: the paw's share
// (the flat damage is scaled by it too, as wowsims' WeaponStrike); cd, gcd in seconds. form: where it can be used.
export const ABILITIES = {
  // 9830 (Rank 5): 60 energy, (80 + paw) x 155%, from behind. 1 combo point.
  shred: { name: 'Shred', spellId: 9830, icon: 'spell_shadow_vampiricaura', key: '1', form: 'cat', cost: 60, base: 80, weapon: 1.55, behind: true, cp: 1, builder: true, melee: true, gcd: true },
  // 9850 (Rank 5): 45 energy, (115 + paw) x 110%. 1 combo point.
  claw: { name: 'Claw', spellId: 9850, icon: 'ability_druid_rake', key: '2', form: 'cat', cost: 45, base: 115, weapon: 1.1, cp: 1, builder: true, melee: true, gcd: true },
  // 9904 (Rank 4): 40 energy, 61 now (armor does not reduce it), then 34 + 5.5% of your attack power every 3 s for 9 s.
  rake: { name: 'Rake', spellId: 9904, icon: 'ability_druid_disembowel', key: '3', form: 'cat', cost: 40, base: 61, tick: 34, apCoef: 0.055, period: 3, duration: 9, cp: 1, builder: true, melee: true, gcd: true },
  // 9896 (Rank 6): 30 energy, finisher: 6 ticks of 15 + 25.5 per combo point + 1% of your attack power per combo point
  // (at most 4) every 2 s.
  rip: { name: 'Rip', spellId: 9896, icon: 'ability_ghoulfrenzy', key: '4', form: 'cat', cost: 30, tick: 15, perPoint: 25.5, apPerPoint: 0.01, maxApPoints: 4, period: 2, ticks: 6, finisher: true, melee: true, gcd: true },
  // 22829 (Rank 4): 35 energy, finisher: 70 (±36%) + 128 and 3% of your attack power per combo point, and 2.5 per extra
  // energy, which it spends.
  ferociousBite: { name: 'Ferocious Bite', spellId: 22829, icon: 'ability_druid_ferociousbite', key: 'Q', form: 'cat', cost: 35, base: 70, variance: 0.714, perPoint: 128, apPerPoint: 0.03, perEnergy: 2.5, finisher: true, melee: true, gcd: true },
  // 1322605 (talent): 55% of base mana, 40 energy, 16 s, Cat Form. Not at full energy.
  shiftingPower: { name: 'Shifting Power', spellId: 1322605, icon: 'spell_druid_displacement', key: 'E', form: 'cat', costPct: 0.55, energy: 40, cd: 16, talent: 'shiftingPower', gcd: true, mana: true },
  // 9881 (Rank 7): 15 rage, the next swing deals paw damage + 128.
  maul: { name: 'Maul', spellId: 9881, icon: 'ability_druid_maul', key: '1', form: 'bear', cost: 15, base: 128, weapon: 1, nextSwing: true, melee: true },
  // 1235827 (Rank 3): 15 rage, a bleed of 15 per stack every 3 s for 15 s (5 stacks); 10% paw damage per stack already on.
  lacerate: { name: 'Lacerate', spellId: 1235827, icon: 'ability_druid_lacerate', key: '2', form: 'bear', cost: 15, tick: 15, period: 3, duration: 15, maxStacks: 5, perStack: 0.1, melee: true, gcd: true },
  // 1238073 (talent, Rank 4): 20 rage, (77 + paw) x 100%, 6 s.
  primalBite: { name: 'Primal Bite', spellId: 1238073, icon: 'ability_racial_cannibalize', key: '3', form: 'bear', cost: 20, base: 77, weapon: 1, cd: 6, talent: 'primalBite', melee: true, gcd: true },
  // 9908 (Rank 5): 20 rage, 83 + 3% of your attack power to 3 targets.
  swipe: { name: 'Swipe', spellId: 9908, icon: 'inv_misc_monsterclaw_03', key: '4', form: 'bear', cost: 20, base: 83, apCoef: 0.03, targets: 3, melee: true, gcd: true },
  enrage: { name: 'Enrage', spellId: 5229, icon: 'ability_druid_enrage', key: 'R', form: 'bear', cost: 0, cd: 60 },
  berserk: { name: 'Berserk', spellId: 417141, icon: 'ability_druid_berserk', key: 'T', cost: 0, cd: 180, talent: 'berserk' },
  // 29166: 6 min, 5% of base mana: for 20 s your mana regenerates 5 times as fast.
  innervate: { name: 'Innervate', spellId: 29166, icon: 'spell_nature_lightning', key: 'Shift+R', costPct: 0.05, cd: 360, duration: 20, regen: 5, gcd: true, mana: true },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  potion: { name: 'Resource Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  offensivePotion: { name: 'Offensive Potion', icon: 'inv_potion_41', key: '', cost: 0, item: 'offensivePotion' },
  defensivePotion: { name: 'Defensive Potion', icon: 'inv_potion_69', key: '', cost: 0, item: 'defensivePotion' },
  conjured: { name: 'Demonic Rune', icon: 'inv_misc_rune_04', key: '0', cost: 0, item: 'conjured' },
  explosive: { name: 'Explosive', icon: 'spell_fire_selfdestruct', key: 'C', cost: 0, item: 'explosive' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};

// Talent reach by ability (the class masks of the wowsims rows).
export const SAVAGE_FURY = new Set(['shred', 'claw', 'rake', 'maul', 'swipe']);
export const FEROCITY_ENERGY = new Set(['claw', 'rake']);
export const FEROCITY_RAGE = new Set(['maul', 'swipe', 'primalBite']);
export const BERSERK_CRIT = new Set(['shred', 'claw', 'rake']);
// Clearcasting makes these free (16870's mask): every feral ability with a cost.
export const CLEARCASTING = new Set(['shred', 'claw', 'rake', 'rip', 'ferociousBite', 'maul', 'lacerate', 'primalBite', 'swipe']);

export const ACTION_BAR = [
  ['shred', 'claw', 'rake', 'rip', 'ferociousBite', 'shiftingPower', 'maul', 'lacerate', 'primalBite', 'swipe'],
  ['berserk', 'enrage', 'innervate', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'conjured', 'explosive'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  catForm: { name: 'Cat Form', icon: 'ability_druid_catform' },
  bearForm: { name: 'Dire Bear Form', icon: 'ability_racial_bearform' },
  clearcasting: { name: 'Clearcasting', icon: 'spell_shadow_manaburn' },
  berserk: { name: 'Berserk', icon: 'ability_druid_berserk' },
  enrage: { name: 'Enrage', icon: 'ability_druid_enrage' },
  innervate: { name: 'Innervate', icon: 'spell_nature_lightning' },
};

export const METER_NAMES = {};
export const METER_ICONS = {};
export const THREAT_NAMES = {};

// The wowsims gear sets (ui/specs/druid/feralcat/gear_sets/default.gear.json, feralbear/gear_sets/default.gear.json).
export const GEAR = {
  cat: [
    { id: 279253 }, { id: 18404 }, { id: 272105 }, { id: 18511 }, { id: 252483 }, { id: 19587 }, { id: 19049 }, { id: 272396 },
    { id: 15065 }, { id: 20715 }, { id: 19325 }, { id: 275981 }, { id: 19120 }, {}, { id: 21188 }, {}, { id: 272427 },
  ],
  bear: [
    { id: 252485 }, { id: 19491 }, { id: 271955 }, { id: 18511 }, { id: 252483 }, { id: 272754 }, { id: 19049 }, { id: 272396 },
    { id: 22749 }, { id: 20715 }, { id: 21202 }, { id: 18879 }, { id: 17904 }, { id: 19120 }, { id: 272848 }, {}, {},
  ],
};

// The wowsims default consumables. Cat: the potion slot is the Major Mana Potion (for Shifting Power), Demonic Rune.
// Bear: the Mighty Rage Potion. Not modelled: a second explosive (Goblin Sapper Charge), the defensive potion and the
// Major Healthstone.
export const CONSUMABLES = {
  cat: {
    flaskId: 274274, foodId: 250072, conjuredId: 12662, explosiveId: 260817, mhImbueId: 12643, resourcePotId: 13444,
    elixirIds: [250328, 250338, 250329, 250341, 250351], extraIds: [12460, 8412],
  },
  bear: {
    flaskId: 274275, foodId: 21023, mhImbueId: 18262, offensivePotId: 13442, explosiveId: 10646,
    elixirIds: [9088, 250351, 250328, 250329, 13445], extraIds: [12460, 10307, 8411],
  },
};
// Raid buffs and debuffs as the presets have them; your own Leader of the Pack is on. Rend and Tear assumes another
// raid member keeps a bleed on the target, as the wowsims default (assumeBleedActive).
export const RAID_BUFFS = {
  arcaneBrilliance: true, prayerOfSpirit: true, giftOfTheWild: true, prayerOfFortitude: true, strengthOfEarthTotem: true, graceOfAirTotem: true,
  windfuryTotem: true, battleShout: 1, leaderOfThePack: true,
};
export const PARTY_BUFFS = { manaSpringTotem: 1 };
export const BUFFS = { greaterBlessingOfKings: true, greaterBlessingOfMight: true };
export const DEBUFFS = { judgementOfWisdom: true, sunderArmor: true, faerieFire: true, giftOfArthas: true };

export const BUILT_IN_BUILDS = [
  { id: 'feralCat', name: 'Cat (wowsims preset)', talents: CAT_TALENTS, playable: true, spec: 'feralCat' },
  { id: 'feralBear', name: 'Bear (wowsims preset)', talents: BEAR_TALENTS, playable: true, spec: 'feralBear' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  naturesMajesty: (p) => `+${T.naturesMajesty.critPct[p]}% crit with spells and attacks.`,
  naturesReach: (p) => `+${T.naturesReach.hitPct[p]}% hit with spells and attacks.`,
  ferocity: (p) => `Claw and Rake cost ${T.ferocity.energy[p]} less energy; Maul, Swipe and Primal Bite ${T.ferocity.rage[p]} less rage.`,
  heartOfTheWild: (p) => `+${pct(T.heartOfTheWild.int[p])} Intellect; +${pct(T.heartOfTheWild.str[p])} Strength in Cat Form, +${pct(T.heartOfTheWild.sta[p])} Stamina in Bear Form.`,
  shreddingAttacks: (p) => `Shred costs ${T.shreddingAttacks.shred[p]} less energy, Lacerate ${T.shreddingAttacks.lacerate[p]} less rage.`,
  savageFury: (p) => `Shred, Claw, Rake, Maul and Swipe deal ${pct(T.savageFury.dmg[p])} more; Rake's bleed too.`,
  sharpenedClaws: (p) => `+${T.sharpenedClaws.critPct[p]}% crit in Cat and Bear Form.`,
  shiftingPower: () => 'Learn Shifting Power: 40 energy for mana in Cat Form.',
  primalBite: () => 'Learn Primal Bite: a bear bite on a 6 sec cooldown.',
  predatoryStrikes: (p) => `+${T.predatoryStrikes.ap[p]} attack power in Cat and Bear Form.`,
  bloodFrenzy: (p) => `A builder's crit has a ${pct(T.bloodFrenzy.chance[p])} chance to add a combo point; in Bear Form a crit gives rage.`,
  improvedShiftingPower: (p) => `Shifting Power's cooldown is ${T.improvedShiftingPower.cd[p]} sec shorter.`,
  leaderOfThePack: () => 'In Cat or Bear Form your party has 3% more crit.',
  naturalInstinct: (p) => `Your feral attacks' crits deal ${pct(T.naturalInstinct.critBonus[p])} more bonus damage.`,
  rendAndTear: (p) => `Your attacks and bleeds deal ${pct(T.rendAndTear.dmg[p])} more to a bleeding target.`,
  berserk: () => 'Learn Berserk: 15 sec of 100% more crit for Shred, Claw and Rake; in Bear Form Primal Bite without a cooldown.',
  naturalist: (p) => `You deal ${pct(T.naturalist.dmg[p])} more damage.`,
  thickHide: (p) => `+${T.thickHide.armor[p]} base armor.`,
};
export const NO_DPS_EFFECT = new Set(['improvedWrath', 'genesis', 'moonglow', 'improvedMoonfire', 'improvedEntanglingRoots', 'naturesSplendor',
  'insectSwarm', 'vengeance', 'improvedStarfire', 'overgrowth', 'naturesGrace', 'eclipse', 'moonfury', 'moonkinForm', 'feralSwiftness',
  'feralInstinct', 'brutalImpact', 'feralCharge', 'naturalReaction', 'naturesFocus', 'furor', 'subtlety', 'naturalShapeshifter', 'reflection',
  'giftOfNature', 'giftOfTheEarthmother', 'tranquilSpirit', 'improvedRejuvenation', 'swiftmend', 'naturesSwiftness', 'livingSpirit',
  'improvedTranquility', 'improvedRegrowth', 'wildGrowth']);

export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Resource Potion', icon: 'inv_potion_76' }, { id: 'offensivePotion', name: 'Offensive Potion', icon: 'inv_potion_41' },
    { id: 'defensivePotion', name: 'Defensive Potion', icon: 'inv_potion_69' },
    { id: 'conjured', name: 'Demonic Rune', icon: 'inv_misc_rune_04' }, { id: 'explosive', name: 'Explosive', icon: 'spell_fire_selfdestruct' },
  ] },
  { name: 'Cat Form', spells: [
    { id: 'shred', name: 'Shred', spellId: 9830, icon: 'spell_shadow_vampiricaura' },
    { id: 'claw', name: 'Claw', spellId: 9850, icon: 'ability_druid_rake' },
    { id: 'rake', name: 'Rake', spellId: 9904, icon: 'ability_druid_disembowel' },
    { id: 'rip', name: 'Rip', spellId: 9896, icon: 'ability_ghoulfrenzy' },
    { id: 'ferociousBite', name: 'Ferocious Bite', spellId: 22829, icon: 'ability_druid_ferociousbite' },
    { id: 'shiftingPower', name: 'Shifting Power', spellId: 1322605, icon: 'spell_druid_displacement', talent: 'shiftingPower' },
  ] },
  { name: 'Bear Form', spells: [
    { id: 'maul', name: 'Maul', spellId: 9881, icon: 'ability_druid_maul' },
    { id: 'lacerate', name: 'Lacerate', spellId: 1235827, icon: 'ability_druid_lacerate' },
    { id: 'primalBite', name: 'Primal Bite', spellId: 1238073, icon: 'ability_racial_cannibalize', talent: 'primalBite' },
    { id: 'swipe', name: 'Swipe', spellId: 9908, icon: 'inv_misc_monsterclaw_03' },
    { id: 'enrage', name: 'Enrage', spellId: 5229, icon: 'ability_druid_enrage' },
  ] },
  { name: 'Feral', spells: [
    { id: 'berserk', name: 'Berserk', spellId: 417141, icon: 'ability_druid_berserk', talent: 'berserk' },
    { id: 'innervate', name: 'Innervate', spellId: 29166, icon: 'spell_nature_lightning' },
  ] },
];
