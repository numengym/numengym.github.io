// Rogue data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - ability costs, cooldowns and damage, talent rank curves (generatedCurves)
//   sim/rogue/*.go                         - how the abilities, poisons and talents behave
//   sim/core/energy.go                     - 10 energy per second (1 per 0.1 s tick)
// Values marked APPROX are not stated in wowsims and are read from the game files' effect masks.
import { TALENT_TREE_DATA, TALENT_TREES } from './rogue-talent-tree.js';

export { TALENT_TREE_DATA, TALENT_TREES };

export const ENERGY = { max: 100, regen: 10 }; // energy.go: EnergyPerTick 1 every 100 ms
export const MAX_COMBO_POINTS = 5;
export const ROGUE_GCD = 1; // GCDMs 1000 on every rogue ability
export const THREAT_MULT = 0.71; // Rogue Passive 21184: -29% threat
export const REFUND_ON_MISS = 0.8; // APPROX: share of the energy given back when an attack misses (IssueRefund)

// The wowsims presets (ui/specs/rogue/dps/presets.ts).
export const DEFAULT_TALENTS = '00532310151501031-302303202014';

export function parseTalents(str) {
  const out = {};
  const trees = String(str || '').split('-');
  TALENT_TREES.forEach((names, t) => {
    const digits = trees[t] || '';
    names.forEach((name, i) => { out[name] = Number(digits[i] || 0); });
  });
  return out;
}

// Talent values per rank: the wowsims rank curves (generatedCurves), index = rank. Percent values as fractions.
const curve = (...v) => [0, ...v];
export const TALENT = {
  malice: { crit: curve(1, 2, 3, 4, 5) },                          // 14138: +crit
  ruthlessness: { chance: curve(0.2, 0.4, 0.6) },                  // 14156: +1 combo point after a finisher
  improvedSliceAndDice: { duration: curve(0.15, 0.3, 0.45) },      // 14165
  relentlessStrikes: { chancePerPoint: 0.2, energy: 25 },          // 14179 / 14181
  lethality: { critDamage: curve(0.04, 0.08, 0.12, 0.16, 0.2) },   // 14128: SS, BS, Gouge, GS, Hemo, Mutilate
  vilePoisons: { damage: curve(0.04, 0.08, 0.12, 0.16, 0.2) },     // 16513: poison damage
  improvedPoisons: { chance: curve(0.02, 0.04, 0.06, 0.08, 0.1) }, // 14113: poison proc chance
  vigor: { energy: curve(5, 10) },                                 // 14983: maximum energy
  sealFate: { chance: curve(0.2, 0.4, 0.6, 0.8, 1), icd: 0.5 },    // 14186: a builder's crit adds a combo point
  improvedEviscerate: { damage: curve(0.07, 0.13, 0.2) },          // 14162
  improvedSinisterStrike: { cost: curve(3, 5) },                   // 13732
  // 1224716: Backstab +10/20/30% crit and 15/30/45% chance for a combo point; Mutilate +5/10/15% crit.
  puncturingWounds: { backstabCrit: curve(10, 20, 30), cpChance: curve(0.15, 0.3, 0.45), mutilateCrit: curve(5, 10, 15) },
  precision: { hit: curve(1, 2, 3) },                              // 13705: melee and spell hit
  flawlessExecution: { eviscerateCost: 10 },                       // 1310711
  dualWieldSpecialization: { ohDamage: curve(0.05, 0.1, 0.15, 0.2, 0.25) }, // 13715
  // 13960: axe/sword: a chance on a melee hit for an extra attack (200 ms cooldown); fist/dagger: +crit; mace: armor ignored.
  hackAndSlash: { extraChance: curve(0.01, 0.02, 0.03, 0.04, 0.05), crit: curve(1, 2, 3, 4, 5), armorIgnore: curve(0.03, 0.06, 0.09, 0.12, 0.15), icd: 0.2 },
  weaponExpertise: { expertise: curve(1, 2) },                     // 30919: expertise percent
  aggression: { damage: curve(0.02, 0.04, 0.06) },                 // 18427: SS, BS, Eviscerate
  opportunity: { damage: curve(0.05, 0.1) },                       // 14057: BS, Ambush, Mutilate; Garrote's ticks
  improvedAmbush: { crit: curve(15, 30, 45) },                     // 14079
  initiative: { chance: curve(0.33, 0.67, 1) },                    // 13976: Garrote / Ambush add a combo point
  serratedBlades: { armorIgnore: curve(0.03, 0.06, 0.09), rupture: curve(0.1, 0.2, 0.3) }, // 14171
  dirtyDeeds: { cost: curve(10, 20) },                             // 14082: Garrote
  quietus: { damage: curve(0.02, 0.04, 0.06, 0.08, 0.1), below: 0.35 }, // 1310728: SS, Hemo, GS below 35% health
  cutthroat: { chance: curve(0.03, 0.06, 0.09, 0.12, 0.15), duration: 10 }, // 462708 / 462707: Ambush without stealth
  thousandCuts: { cost: 3, maxStacks: 5, duration: 10, icd: 1.9 }, // 1310721 / 1310723: Rupture ticks; BS and Hemo cost less
};

// Damage bonuses by ability (the game files' class masks on each talent effect).
export const LETHALITY = new Set(['sinisterStrike', 'backstab', 'ghostlyStrike', 'hemorrhage', 'mutilateMh', 'mutilateOh']);
export const COLD_BLOODED = new Set(['sinisterStrike', 'backstab', 'ambush', 'eviscerate', 'mutilateMh', 'mutilateOh']);
export const BUILDERS = new Set(['sinisterStrike', 'backstab', 'ghostlyStrike', 'hemorrhage', 'mutilateMh', 'mutilateOh', 'ambush', 'garrote']);
export const FINISHERS = new Set(['eviscerate', 'sliceAndDice', 'rupture', 'venom']);
export const QUIETUS = new Set(['sinisterStrike', 'hemorrhage', 'ghostlyStrike']);
export const AGGRESSION = new Set(['sinisterStrike', 'backstab', 'eviscerate']);
export const OPPORTUNITY = new Set(['backstab', 'ambush', 'mutilateMh', 'mutilateOh']);

// Poisons (sim/rogue/poisons.go): Instant Poison VI 11337 on the main hand (20%), Deadly Poison on the off hand
// (30%), each off its own weapon's melee hits. Instant: 88 +/- 13.8% + 0.5% of attack power, nature, can crit.
// Deadly: stacks to 5, 12 s, a tick every 3 s for (23 + 0.45% of attack power / 4) per stack.
export const POISONS = {
  instant: { name: 'Instant Poison', icon: 'ability_poisons', chance: 0.2, base: 88, variance: 0.2769, apCoef: 0.005 },
  deadly: { name: 'Deadly Poison', icon: 'ability_rogue_dualweild', chance: 0.3, tick: 23, period: 3, duration: 12, maxStacks: 5, apCoef: 0.0045 },
};
// Poison items (poisons.go deadlyPoisonItemIDs / instantPoisonItemIDs) by wowsims consumable id.
export const POISON_ITEMS = {
  6947: 'instant', 6949: 'instant', 6950: 'instant', 8926: 'instant', 8927: 'instant', 8928: 'instant',
  2892: 'deadly', 2893: 'deadly', 8984: 'deadly', 8985: 'deadly', 20844: 'deadly',
};
// Each poison item's rank (2818 ... 25349 and 8680 ... 11337): Deadly Poison's tick, Instant Poison's damage.
export const DEADLY_TICKS = { 2892: 6, 2893: 9, 8984: 14, 8985: 18, 20844: 23 };
export const INSTANT_BASE = { 6947: 15, 6949: 23, 6950: 33, 8926: 51, 8927: 71, 8928: 88 };

// Abilities. cost in energy, cd in seconds, gcd: the 1 s energy global cooldown. cp: combo points it adds.
export const ABILITIES = {
  // 11294 (Rank 8): 45 energy, 68 + normalized main-hand weapon damage.
  sinisterStrike: { name: 'Sinister Strike', spellId: 11294, icon: 'spell_shadow_ritualofsacrifice', key: '1', cost: 45, gcd: true, melee: true, base: 68, cp: 1 },
  // 11281 (Rank 8, the highest trainable): 60 energy, (140 + normalized dagger damage) x 150%, from behind.
  backstab: { name: 'Backstab', spellId: 11281, icon: 'ability_backstab', key: '2', cost: 60, gcd: true, melee: true, base: 140, weapon: 1.5, dagger: true, behind: true, cp: 1 },
  // 1241584 (Rank 4): 60 energy, 2 combo points, a main-hand and an off-hand strike of (67 + normalized weapon
  // damage) x 75%, 20% more on a poisoned target. Two daggers.
  mutilate: { name: 'Mutilate', spellId: 1241584, icon: 'ability_rogue_deadlybrew', key: '1', cost: 60, gcd: true, melee: true, base: 67, weapon: 0.75, poisoned: 0.2, daggers: true, cp: 2, talent: 'mutilate' },
  // 16511: 35 energy, normalized main-hand damage (x 145% with a dagger); the target takes 15% more Rupture damage from you for 15 s.
  hemorrhage: { name: 'Hemorrhage', spellId: 16511, icon: 'spell_shadow_lifedrain', key: '1', cost: 35, gcd: true, melee: true, weapon: 1, daggerWeapon: 1.45, cp: 1, talent: 'hemorrhage', duration: 15, rupture: 0.15 },
  // 14278: 40 energy, 20 s cooldown, main-hand weapon damage x 125% (180% with a dagger), not normalized.
  ghostlyStrike: { name: 'Ghostly Strike', spellId: 14278, icon: 'spell_shadow_curse', key: '3', cost: 40, cd: 20, gcd: true, melee: true, weapon: 1.25, daggerWeapon: 1.8, cp: 1, talent: 'ghostlyStrike' },
  // 11269 (Rank 6): 60 energy, (116 + normalized dagger damage) x 250%, from stealth and behind.
  ambush: { name: 'Ambush', spellId: 11269, icon: 'ability_rogue_ambush', key: 'Q', cost: 60, gcd: true, melee: true, base: 116, weapon: 2.5, dagger: true, behind: true, stealth: true, cp: 1 },
  // 11290 (Rank 6): 50 energy, from stealth and behind: 92 + 3% of attack power every 3 s for 18 s, a bleed.
  garrote: { name: 'Garrote', spellId: 11290, icon: 'ability_rogue_garrote', key: 'E', cost: 50, gcd: true, melee: true, tick: 92, apCoef: 0.03, period: 3, duration: 18, stealth: true, behind: true, cp: 1 },
  // 11300 (Rank 8, the rank wowsims casts): 35 energy, 96 +/- 50% + 151 and 4% of attack power per combo point.
  eviscerate: { name: 'Eviscerate', spellId: 11300, icon: 'ability_rogue_eviscerate', key: '4', cost: 35, gcd: true, melee: true, finisher: true, base: 96, variance: 1, perPoint: 151, apPerPoint: 0.04 },
  // 6774 (Rank 2): 25 energy, 30% attack speed for 6 s + 3 s per combo point.
  sliceAndDice: { name: 'Slice and Dice', spellId: 6774, icon: 'ability_rogue_slicedice', key: '5', cost: 25, gcd: true, finisher: true, base: 6, perPoint: 3, haste: 0.3 },
  // 11275 (Rank 6): 25 energy, a bleed ticking every 2 s, 3 + 1 tick per combo point, 35 + 4.73 per point + a share
  // of attack power (rupture.go ruptureApScaling).
  rupture: { name: 'Rupture', spellId: 11275, icon: 'ability_rogue_rupture', key: '6', cost: 25, gcd: true, melee: true, finisher: true, tick: 35, perPoint: 4.73, period: 2, baseTicks: 3, apScaling: [0, 0.01, 0.02, 0.03, 0.03, 0.03] },
  // 1310703 (talent): 25 energy, 30% more poison damage and 10% more poison chance for 6 s + 3 s per combo point.
  venom: { name: 'Venom', spellId: 1310703, icon: 'inv_sword_31', key: 'R', cost: 25, gcd: true, finisher: true, base: 6, perPoint: 3, damage: 0.3, chance: 0.1, talent: 'venom' },
  // 13877: 25 energy, 2 min: 20% attack speed for 15 s; your melee hits strike a second enemy too.
  bladeFlurry: { name: 'Blade Flurry', spellId: 13877, icon: 'ability_warrior_punishingblow', key: 'F', cost: 25, cd: 120, gcd: true, duration: 15, haste: 0.2, talent: 'bladeFlurry' },
  // 13750: 5 min: 100% more energy regeneration for 15 s.
  adrenalineRush: { name: 'Adrenaline Rush', spellId: 13750, icon: 'spell_shadow_shadowworddominate', key: 'T', cost: 0, cd: 300, gcd: true, duration: 15, talent: 'adrenalineRush' },
  // 14177: 3 min, off the global cooldown: your next Sinister Strike, Backstab, Ambush, Eviscerate or Mutilate crits.
  coldBlood: { name: 'Cold Blood', spellId: 14177, icon: 'spell_ice_lament', key: 'G', cost: 0, cd: 180, talent: 'coldBlood' },
  // 14183: 2 min, off the global cooldown: 2 combo points.
  premeditation: { name: 'Premeditation', spellId: 14183, icon: 'spell_shadow_possession', key: 'Z', cost: 0, cd: 120, cp: 2, talent: 'premeditation' },
  // 14185: 10 min: finishes the cooldowns of Cold Blood, Premeditation, Vanish, Ghostly Strike, Blade Flurry and Adrenaline Rush.
  preparation: { name: 'Preparation', spellId: 14185, icon: 'spell_shadow_antishadow', key: 'X', cost: 0, cd: 600, gcd: true, talent: 'preparation' },
  // 1857 (Rank 2): 5 min, off the global cooldown: back into stealth (your swings stop).
  vanish: { name: 'Vanish', spellId: 1857, icon: 'ability_vanish', key: 'V', cost: 0, cd: 300 },
  // 1787 (Rank 4): 10 s cooldown, out of combat: stealth.
  stealth: { name: 'Stealth', spellId: 1787, icon: 'ability_stealth', key: 'C', cost: 0, cd: 10, outOfCombat: true },
  // 1769 (Rank 4): 25 energy, 10 s: 80 damage and an interrupt.
  kick: { name: 'Kick', spellId: 1769, icon: 'ability_kick', key: 'H', cost: 25, cd: 10, gcd: true, melee: true, damage: 80 },
  // 25302 (Rank 5): 20 energy, 10 s: 4000 less threat on the target.
  feint: { name: 'Feint', spellId: 25302, icon: 'ability_rogue_feint', key: 'Y', cost: 20, cd: 10, gcd: true, melee: true, threat: 4000 },
  // 5277: 5 min, off the global cooldown: 50% dodge for 15 s.
  evasion: { name: 'Evasion', spellId: 5277, icon: 'spell_shadow_shadowward', key: '', cost: 0, cd: 300, duration: 15, dodge: 50 },
  // Item actions: name and icon come from the equipped trinket or the chosen consumable.
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  potion: { name: 'Potion', icon: 'inv_potion_41', key: '9', cost: 0, item: 'potion' },
  conjured: { name: 'Thistle Tea', icon: 'inv_drink_milk_05', key: '0', cost: 0, item: 'conjured' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};

// Gnome Eureka! for rogues (1259812): the class mask's abilities cost 10% less and deal 10% more.
export const EUREKA_ABILITIES = ['sinisterStrike', 'backstab', 'mutilate', 'mutilateMh', 'mutilateOh', 'hemorrhage', 'ghostlyStrike', 'ambush', 'eviscerate'];

export const ACTION_BAR = [
  ['sinisterStrike', 'backstab', 'mutilate', 'hemorrhage', 'ghostlyStrike', 'eviscerate', 'sliceAndDice', 'rupture', 'venom', 'ambush', 'garrote'],
  ['stealth', 'vanish', 'coldBlood', 'premeditation', 'preparation', 'bladeFlurry', 'adrenalineRush', 'kick', 'feint', 'evasion', 'racial', 'trinket1', 'trinket2', 'potion', 'conjured'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  stealth: { name: 'Stealth', icon: 'ability_stealth' },
  sliceAndDice: { name: 'Slice and Dice', icon: 'ability_rogue_slicedice' },
  bladeFlurry: { name: 'Blade Flurry', icon: 'ability_warrior_punishingblow' },
  adrenalineRush: { name: 'Adrenaline Rush', icon: 'spell_shadow_shadowworddominate' },
  coldBlood: { name: 'Cold Blood', icon: 'spell_ice_lament' },
  venom: { name: 'Venom', icon: 'inv_sword_31' },
  cutthroat: { name: 'Cutthroat', icon: 'classicon_rogue' },
  thousandCuts: { name: 'Thousand Cuts', icon: 'ability_rogue_rupture' },
  evasion: { name: 'Evasion', icon: 'spell_shadow_shadowward' },
};

export const METER_NAMES = {
  mh: 'Main Hand', oh: 'Off Hand', mutilateMh: 'Mutilate (Main Hand)', mutilateOh: 'Mutilate (Off Hand)',
  instantPoison: 'Instant Poison', deadlyPoison: 'Deadly Poison', bladeFlurryHit: 'Blade Flurry', extra: 'Hack and Slash',
};
export const METER_ICONS = { mutilateMh: 'ability_rogue_deadlybrew', mutilateOh: 'ability_rogue_deadlybrew', instantPoison: 'ability_poisons', deadlyPoison: 'ability_rogue_dualweild', bladeFlurryHit: 'ability_warrior_punishingblow' };
export const THREAT_NAMES = { feint: 'Feint' };

// The wowsims gear sets (ui/specs/rogue/dps/gear_sets).
export const GEAR = {
  // p1_muti: a dagger in each hand.
  muti: [
    { id: 22005, enchant: 1508 }, { id: 22150 }, { id: 272105 }, { id: 21187, enchant: 7667 }, { id: 22009, enchant: 7645 },
    { id: 22004, enchant: 7656 }, { id: 21278, enchant: 8206 }, { id: 272395 }, { id: 22007, enchant: 1508 }, { id: 18506, enchant: 911 },
    { id: 19325 }, { id: 21189 }, { id: 272437 }, { id: 19120 }, { id: 19324, enchant: 1900 }, { id: 19166, enchant: 2564 }, { id: 22347 },
  ],
  // p1_slowmh: a slow main hand (Persuader) and a sword off hand, for Sinister Strike and Hemorrhage.
  slowMh: [
    { id: 22005, enchant: 1508 }, { id: 22150 }, { id: 272105 }, { id: 21187, enchant: 7667 }, { id: 22009, enchant: 7645 },
    { id: 22004, enchant: 7656 }, { id: 21278, enchant: 8206 }, { id: 272395 }, { id: 22007, enchant: 1508 }, { id: 18506, enchant: 911 },
    { id: 19325 }, { id: 21189 }, { id: 272437 }, { id: 19120 }, { id: 22384, enchant: 1900 }, { id: 17016, enchant: 2564 }, { id: 22347 },
  ],
  // p1_bssub: a dagger main hand for Backstab.
  bsSub: [
    { id: 22005, enchant: 1508 }, { id: 22150 }, { id: 272105 }, { id: 21187, enchant: 7667 }, { id: 22009, enchant: 7645 },
    { id: 22004, enchant: 7656 }, { id: 21278, enchant: 8206 }, { id: 272395 }, { id: 22007, enchant: 1508 }, { id: 18506, enchant: 911 },
    { id: 19325 }, { id: 21189 }, { id: 272437 }, { id: 19120 }, { id: 19324, enchant: 1900 }, { id: 17016, enchant: 2564 }, { id: 22347 },
  ],
};

// The wowsims DefaultConsumables: Mongoose, Greater Fortitude, Ferocity and Juju Might, Swiftstrike Steak, Major
// Frenzy Potion, Thistle Tea, a weightstone and a sharpening stone, Instant Poison VI and Deadly Poison IV.
export const CONSUMABLES = {
  elixirIds: [13452, 250335, 250350, 12460], foodId: 250072, offensivePotId: 250943, conjuredId: 7676,
  mhImbueId: 12643, ohImbueId: 12404, mhWeaponImbueId: 8928, ohWeaponImbueId: 8985,
};

// Builds: the wowsims talent presets.
export const BUILT_IN_BUILDS = [
  { id: 'asn-muti', name: 'Assassination Mutilate (wowsims preset)', talents: '00532310151501031-302303202014', playable: true, spec: 'assassination' },
  { id: 'combat-muti', name: 'Combat Mutilate', talents: '00532310101401-302303202015152-001', playable: true, spec: 'assassination' },
  { id: 'combat-ss', name: 'Combat Sinister Strike (wowsims preset)', talents: '005323101012-32030320201515231', playable: true, spec: 'combat' },
  { id: 'combat-bs', name: 'Combat Backstab', talents: '00532310101-32030320201515231-002', playable: true, spec: 'combat', note: 'Needs a dagger in the main hand' },
  { id: 'sub-hemo', name: 'Subtlety Hemorrhage (wowsims preset)', talents: '005323101014--4323200300013211501', playable: true, spec: 'subtlety' },
  { id: 'sub-bs', name: 'Subtlety Backstab', talents: '0053031-3203-4320203300013211051', playable: true, spec: 'subtlety', note: 'Needs a dagger in the main hand' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  malice: (p) => `+${T.malice.crit[p]}% crit chance.`,
  ruthlessness: (p) => `Your finishers have a ${pct(T.ruthlessness.chance[p])} chance to give a combo point.`,
  improvedSliceAndDice: (p) => `Slice and Dice lasts ${pct(T.improvedSliceAndDice.duration[p])} longer.`,
  relentlessStrikes: () => 'Your finishers have a 20% chance per combo point to restore 25 energy.',
  lethality: (p) => `The crits of Sinister Strike, Backstab, Ghostly Strike, Hemorrhage and Mutilate deal ${pct(T.lethality.critDamage[p])} more damage.`,
  vilePoisons: (p) => `Your poisons deal ${pct(T.vilePoisons.damage[p])} more damage.`,
  coldBlood: () => 'Learn Cold Blood: your next Sinister Strike, Backstab, Ambush, Eviscerate or Mutilate is a critical strike.',
  improvedPoisons: (p) => `Your poisons are ${pct(T.improvedPoisons.chance[p])} more likely to be applied.`,
  vigor: (p) => `+${T.vigor.energy[p]} maximum energy.`,
  mutilate: () => 'Learn Mutilate: strike with both daggers for 2 combo points, 20% more damage on a poisoned target.',
  sealFate: (p) => `Your builders' crits have a ${pct(T.sealFate.chance[p])} chance to add a combo point.`,
  venom: () => 'Learn Venom: a finisher that makes your poisons 30% stronger and 10% more likely.',
  improvedEviscerate: (p) => `Eviscerate deals ${pct(T.improvedEviscerate.damage[p])} more damage.`,
  improvedSinisterStrike: (p) => `Sinister Strike costs ${T.improvedSinisterStrike.cost[p]} less energy.`,
  puncturingWounds: (p) => `Backstab: +${T.puncturingWounds.backstabCrit[p]}% crit and a ${pct(T.puncturingWounds.cpChance[p])} chance for a combo point; Mutilate: +${T.puncturingWounds.mutilateCrit[p]}% crit.`,
  precision: (p) => `+${T.precision.hit[p]}% hit with melee attacks and poisons.`,
  flawlessExecution: () => 'Eviscerate costs 10 less energy.',
  dualWieldSpecialization: (p) => `Your off hand deals ${pct(T.dualWieldSpecialization.ohDamage[p])} more damage.`,
  bladeFlurry: () => 'Learn Blade Flurry: 20% attack speed and your melee hits strike a second enemy for 15 sec.',
  hackAndSlash: (p) => `Axe or sword: a ${pct(T.hackAndSlash.extraChance[p])} chance on a hit for an extra attack. Fist or dagger: +${T.hackAndSlash.crit[p]}% crit with it. Mace: ignore ${pct(T.hackAndSlash.armorIgnore[p])} of the target's armor.`,
  weaponExpertise: (p) => `Your attacks are ${T.weaponExpertise.expertise[p]}% less likely to be dodged.`,
  aggression: (p) => `Sinister Strike, Backstab and Eviscerate deal ${pct(T.aggression.damage[p])} more damage.`,
  adrenalineRush: () => 'Learn Adrenaline Rush: twice the energy regeneration for 15 sec.',
  opportunity: (p) => `Backstab, Ambush, Mutilate and Garrote deal ${pct(T.opportunity.damage[p])} more damage.`,
  improvedAmbush: (p) => `+${T.improvedAmbush.crit[p]}% crit chance on Ambush.`,
  initiative: (p) => `Garrote and Ambush have a ${pct(T.initiative.chance[p])} chance to add a combo point.`,
  ghostlyStrike: () => 'Learn Ghostly Strike.',
  premeditation: () => 'Learn Premeditation: 2 combo points.',
  serratedBlades: (p) => `Your attacks ignore ${pct(T.serratedBlades.armorIgnore[p])} of the target's armor and Rupture deals ${pct(T.serratedBlades.rupture[p])} more damage.`,
  dirtyDeeds: (p) => `Garrote costs ${T.dirtyDeeds.cost[p]} less energy and can be used from the front.`,
  preparation: () => 'Learn Preparation: finishes your other rogue cooldowns.',
  hemorrhage: () => 'Learn Hemorrhage: the target takes 15% more Rupture damage from you for 15 sec.',
  quietus: (p) => `Below 35% health, Sinister Strike, Hemorrhage and Ghostly Strike deal ${pct(T.quietus.damage[p])} more damage.`,
  cutthroat: (p) => `Backstab has a ${pct(T.cutthroat.chance[p])} chance to let you Ambush without stealth for 10 sec.`,
  thousandCuts: () => 'Rupture ticks stack Thousand Cuts: Backstab and Hemorrhage cost 3 energy less per stack.',
};
export const NO_DPS_EFFECT = new Set(['improvedGouge', 'remorselessAttacks', 'murder', 'improvedExposeArmor', 'improvedKidneyShot',
  'lightningReflexes', 'deflection', 'endurance', 'riposte', 'improvedSprint', 'improvedKick', 'camouflage', 'masterOfDeception',
  'setup', 'elusiveness', 'dirtyTricks', 'improvedDistract', 'heightenedSenses']);

// The spellbook at level 60, in the game's tabs; talent spells only when talented.
export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Potion', icon: 'inv_potion_41' },
    { id: 'conjured', name: 'Thistle Tea', icon: 'inv_drink_milk_05' },
  ] },
  { name: 'Assassination', spells: [
    { id: 'eviscerate', name: 'Eviscerate', spellId: 11300, icon: 'ability_rogue_eviscerate' },
    { id: 'sliceAndDice', name: 'Slice and Dice', spellId: 6774, icon: 'ability_rogue_slicedice' },
    { id: 'rupture', name: 'Rupture', spellId: 11275, icon: 'ability_rogue_rupture' },
    { id: 'garrote', name: 'Garrote', spellId: 11290, icon: 'ability_rogue_garrote' },
    { id: 'ambush', name: 'Ambush', spellId: 11269, icon: 'ability_rogue_ambush' },
    { id: 'coldBlood', name: 'Cold Blood', spellId: 14177, icon: 'spell_ice_lament', talent: 'coldBlood' },
    { id: 'mutilate', name: 'Mutilate', spellId: 1241584, icon: 'ability_rogue_deadlybrew', talent: 'mutilate' },
    { id: 'venom', name: 'Venom', spellId: 1310703, icon: 'inv_sword_31', talent: 'venom' },
  ] },
  { name: 'Combat', spells: [
    { id: 'sinisterStrike', name: 'Sinister Strike', spellId: 11294, icon: 'spell_shadow_ritualofsacrifice' },
    { id: 'backstab', name: 'Backstab', spellId: 11281, icon: 'ability_backstab' },
    { id: 'kick', name: 'Kick', spellId: 1769, icon: 'ability_kick' },
    { id: 'feint', name: 'Feint', spellId: 25302, icon: 'ability_rogue_feint' },
    { id: 'evasion', name: 'Evasion', spellId: 5277, icon: 'spell_shadow_shadowward' },
    { id: 'bladeFlurry', name: 'Blade Flurry', spellId: 13877, icon: 'ability_warrior_punishingblow', talent: 'bladeFlurry' },
    { id: 'adrenalineRush', name: 'Adrenaline Rush', spellId: 13750, icon: 'spell_shadow_shadowworddominate', talent: 'adrenalineRush' },
  ] },
  { name: 'Subtlety', spells: [
    { id: 'stealth', name: 'Stealth', spellId: 1787, icon: 'ability_stealth' },
    { id: 'vanish', name: 'Vanish', spellId: 1857, icon: 'ability_vanish' },
    { id: 'ghostlyStrike', name: 'Ghostly Strike', spellId: 14278, icon: 'spell_shadow_curse', talent: 'ghostlyStrike' },
    { id: 'premeditation', name: 'Premeditation', spellId: 14183, icon: 'spell_shadow_possession', talent: 'premeditation' },
    { id: 'preparation', name: 'Preparation', spellId: 14185, icon: 'spell_shadow_antishadow', talent: 'preparation' },
    { id: 'hemorrhage', name: 'Hemorrhage', spellId: 16511, icon: 'spell_shadow_lifedrain', talent: 'hemorrhage' },
  ] },
];
