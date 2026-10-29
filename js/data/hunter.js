// Hunter data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - shot damage, cast times, costs, cooldowns; talent rank curves
//   sim/hunter/*.go, sim/core/attack.go    - Auto Shot, the shots, stings, aspects and talents
// The turret builds: you stand at range and shoot. Not modelled: the tamed pet and the hawks (Beast Mastery), melee
// weaving (Raptor Strike, Mongoose Bite, Wing Clip), traps, Sniper Shot, Volley, Scorpid Sting.
import { TALENT_TREE_DATA, TALENT_TREES } from './hunter-talent-tree.js';

export { TALENT_TREE_DATA, TALENT_TREES };

// The wowsims presets (ui/specs/hunter/dps/presets.ts): MM and SV, both with no pet (Lone Wolf).
export const MM_TALENTS = '5-005355251152205-5';
export const SV_TALENTS = '1-00531500114-52225303000021005';
export const DEFAULT_TALENTS = MM_TALENTS;

export function parseTalents(str) {
  const out = {};
  const trees = String(str || '').split('-');
  TALENT_TREES.forEach((names, t) => {
    const digits = trees[t] || '';
    names.forEach((name, i) => { out[name] = Number(digits[i] || 0); });
  });
  return out;
}

// Ranged attacks against a level 63 boss: 8% miss before hit, no dodge, parry or glancing, crits 4.8% fewer (the wowsims
// sim's ranged crits against it).
export const RANGED = { miss: 0.08, critSuppression: 0.048, minRange: 8, maxRange: 35, retry: 0.5 };
// Thorium Headed Arrows (17.5 damage per second of the weapon's speed) and the Ancient Sinew Wrapped Lamina quiver
// (15% faster shots), as the presets carry (sim/hunter/ammo_auto_gen.go).
export const AMMO_DPS = 17.5;
export const QUIVER_HASTE = 0.15;
// Biznicks 247x128 Accurascope (2523): 3% hit with ranged attacks.
export const SCOPES = { 2523: { hitPct: 3 } };
// Aspect of the Hawk (25296): 120 ranged attack power, held through the fight; its Quick Shots (6150, Deadly Aspects'
// chance on Auto Shot): 30% faster shots for 12 s. Trueshot Aura (20906): 50 ranged attack power for the raid.
export const HAWK = { rap: 120, quickShots: 0.3, quickShotsDuration: 12 };
export const TRUESHOT_RAP = 50;
// Beaststalker Armor 5 pieces (450577): a landed autoattack has a 5% chance to restore 200 mana (Sudden Insight).
export const BEASTSTALKER = { chance: 0.05, mana: 200 };

// Talent values per rank (the wowsims rank curves), index = rank. Percent values as fractions unless named Pct.
const curve = (...v) => [0, ...v];
export const TALENT = {
  deadlyAspects: { quickShots: curve(0.02, 0.04, 0.06, 0.08, 0.1) },   // 19552: Quick Shots off Auto Shot
  lethalAttacks: { critPct: curve(1, 2, 3, 4, 5) },                     // 19426
  improvedStings: { serpent: curve(0.06, 0.13, 0.2) },                  // 1310661: Serpent Sting's ticks
  efficiency: { cost: curve(0.03, 0.06, 0.09, 0.12, 0.15) },            // 19416: the shots' and stings' mana
  carefulAim: { rapPerInt: curve(0.2, 0.4, 0.6, 0.8, 1) },              // 1223984: ranged attack power from Intellect
  rapidKilling: { rapidFireCd: curve(60, 120) },                        // 415405
  improvedArcaneShot: { cd: curve(0.3, 0.6, 0.9, 1.2, 1.5) },           // 19454
  loneWolf: { dmg: 0.2 },                                               // 415370: no pet out
  mortalShots: { critBonus: curve(0.06, 0.12, 0.18, 0.24, 0.3) },       // 19485: the shots' crit bonus
  rapidRecuperation: { casting: curve(0.25, 0.5), duration: 15 },       // 1223987 / 1242512: after a Serpent Sting lands
  barrage: { dmg: curve(0.03, 0.07, 0.1) },                             // 19461: Aimed Shot and Multi-Shot
  rangedWeaponSpecialization: { dmg: curve(0.01, 0.02, 0.03, 0.04, 0.05) }, // 19507
  improvedTracking: { dmg: curve(0.01, 0.02, 0.03, 0.04, 0.05) },       // 24293: the target taken as tracked
  surefooted: { hitPct: curve(1, 2, 3) },                               // 19290
  lightningReflexes: { agi: curve(0.02, 0.04, 0.06, 0.08, 0.1) },       // 19168
};

// Shots at level 60. cost in mana (costPct: of base mana); castTime in seconds before ranged haste; cd in seconds;
// weapon: normalized ranged weapon damage plus base; school.
export const ABILITIES = {
  // 20904 (Rank 6): 2 s, 6 s (shared with Multi-Shot), 310 mana: normalized weapon damage + 166.
  aimedShot: { name: 'Aimed Shot', spellId: 20904, icon: 'inv_spear_07', key: '1', castTime: 2, cd: 6, cdGroup: 'aimedMulti', cost: 310, base: 166, weapon: true, school: 'physical', shot: true, gcd: true },
  // 2643: 0.5 s, 6 s (shared with Aimed Shot), 13.9% of base mana: normalized weapon damage to 3 targets.
  multiShot: { name: 'Multi-Shot', spellId: 2643, icon: 'ability_upgrademoonglaive', key: '2', castTime: 0.5, cd: 6, cdGroup: 'aimedMulti', costPct: 0.139, base: 0, weapon: true, targets: 3, school: 'physical', shot: true, gcd: true },
  // 14287 (Rank 8): instant, 6 s, 190 mana: 217 + 10% of ranged attack power, Arcane.
  arcaneShot: { name: 'Arcane Shot', spellId: 14287, icon: 'ability_impalingbolt', key: '3', cd: 6, cost: 190, base: 217, rapCoef: 0.1, school: 'arcane', shot: true, gcd: true },
  // 25295 (Rank 9): 250 mana: 111 + 3% of ranged attack power every 3 s for 15 s, Nature.
  serpentSting: { name: 'Serpent Sting', spellId: 25295, icon: 'ability_hunter_quickshot', key: '4', cost: 250, dot: { tick: 111, rapCoef: 0.03, period: 3, ticks: 5 }, school: 'nature', shot: true, gcd: true },
  // 14325 (Rank 4): 60 mana: the target gives your ranged attacks 143 more attack power for 2 min.
  huntersMark: { name: "Hunter's Mark", spellId: 14325, icon: 'ability_hunter_snipershot', key: 'Q', cost: 60, rap: 143, duration: 120, gcd: true },
  // 3045: 100 mana, 5 min: 40% faster shots for 15 s.
  rapidFire: { name: 'Rapid Fire', spellId: 3045, icon: 'ability_hunter_runningshot', key: 'R', cost: 100, cd: 300, duration: 15, haste: 0.4 },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  potion: { name: 'Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  conjured: { name: 'Demonic Rune', icon: 'inv_misc_rune_04', key: '0', cost: 0, item: 'conjured' },
  explosive: { name: 'Explosive', icon: 'spell_fire_selfdestruct', key: 'C', cost: 0, item: 'explosive' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};

// Talent reach by shot (the class masks of the wowsims rows).
export const MORTAL_SHOTS = new Set(['auto', 'aimedShot', 'multiShot', 'arcaneShot', 'serpentSting']);
export const EFFICIENCY = new Set(['aimedShot', 'multiShot', 'arcaneShot', 'serpentSting']);
export const BARRAGE = new Set(['aimedShot', 'multiShot']);

export const ACTION_BAR = [
  ['aimedShot', 'multiShot', 'arcaneShot', 'serpentSting', 'huntersMark'],
  ['rapidFire', 'racial', 'trinket1', 'trinket2', 'potion', 'conjured', 'explosive'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  rapidFire: { name: 'Rapid Fire', icon: 'ability_hunter_runningshot' },
  quickShots: { name: 'Quick Shots', icon: 'ability_warrior_innerrage' },
  rapidRecuperation: { name: 'Rapid Recuperation', icon: 'ability_hunter_rapidregeneration' },
};

export const METER_NAMES = { auto: 'Auto Shot' };
export const METER_ICONS = { auto: 'ability_whirlwind' };
export const THREAT_NAMES = {};

// The wowsims P1 set (ui/specs/hunter/dps/gear_sets/p1.gear.json): Beaststalker Armor and Fahrad's Reloading Repeater.
export const GEAR = [
  { id: 16677 }, { id: 19620, enchant: 904 }, { id: 16679 }, { id: 18511, enchant: 849 }, { id: 16674, enchant: 1891 },
  { id: 16681, enchant: 7656 }, { id: 16676, enchant: 2564 }, { id: 16680 }, { id: 16678, enchant: 8491 }, { id: 16675, enchant: 1887 },
  { id: 272408 }, { id: 11990, randomSuffix: 12728 }, { id: 272437 }, { id: 19120 }, { id: 250619, enchant: 2646 }, {}, { id: 22347, enchant: 2523 },
];

// The presets' consumables, raid buffs and debuffs. Not modelled: Dragonbreath Chili, the Goblin Sapper Charge.
export const CONSUMABLES = {
  flaskId: 274274, elixirIds: [13452, 250341], foodId: 250072, resourcePotId: 13444, conjuredId: 12662, explosiveId: 18588,
  mhImbueId: 18262, extraIds: [10310, 12460, 8412],
};
export const RAID_BUFFS = {
  arcaneBrilliance: true, prayerOfSpirit: true, giftOfTheWild: true, graceOfAirTotem: true, strengthOfEarthTotem: true, windfuryTotem: true,
  battleShout: 1, leaderOfThePack: true,
};
export const PARTY_BUFFS = {};
export const BUFFS = { greaterBlessingOfKings: true, greaterBlessingOfMight: true, greaterBlessingOfWisdom: true };
export const DEBUFFS = {
  curseOfElements: true, curseOfRecklessness: true, exposeArmor: true, faerieFire: true, giftOfArthas: true, judgementOfWisdom: true, sunderArmor: true,
};

export const BUILT_IN_BUILDS = [
  { id: 'marksmanship', name: 'MM (wowsims turret)', talents: MM_TALENTS, playable: true, spec: 'marksmanship' },
  { id: 'survival', name: 'SV (wowsims turret, Multi-Shot)', talents: SV_TALENTS, playable: true, spec: 'survival' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  deadlyAspects: (p) => `Auto Shot has a ${pct(T.deadlyAspects.quickShots[p])} chance with Aspect of the Hawk to make your shots 30% faster for 12 sec.`,
  lethalAttacks: (p) => `+${T.lethalAttacks.critPct[p]}% crit.`,
  improvedStings: (p) => `Serpent Sting deals ${pct(T.improvedStings.serpent[p])} more.`,
  efficiency: (p) => `Your shots and stings cost ${pct(T.efficiency.cost[p])} less mana.`,
  carefulAim: (p) => `You gain ranged attack power equal to ${pct(T.carefulAim.rapPerInt[p])} of your Intellect.`,
  rapidKilling: (p) => `Rapid Fire\'s cooldown is ${T.rapidKilling.rapidFireCd[p] / 60} min shorter.`,
  improvedArcaneShot: (p) => `Arcane Shot\'s cooldown is ${T.improvedArcaneShot.cd[p]} sec shorter.`,
  loneWolf: () => 'With no pet out you deal 20% more damage.',
  trueshotAura: () => 'Your raid gains 50 ranged attack power.',
  mortalShots: (p) => `Your shots crit for ${pct(T.mortalShots.critBonus[p])} more bonus damage.`,
  rapidRecuperation: (p) => `Serpent Sting lets ${pct(T.rapidRecuperation.casting[p])} of your mana regeneration continue while casting for 15 sec.`,
  barrage: (p) => `Aimed Shot and Multi-Shot deal ${pct(T.barrage.dmg[p])} more.`,
  rangedWeaponSpecialization: (p) => `You deal ${pct(T.rangedWeaponSpecialization.dmg[p])} more damage.`,
  improvedTracking: (p) => `You deal ${pct(T.improvedTracking.dmg[p])} more to the creature type you track (the target).`,
  surefooted: (p) => `+${T.surefooted.hitPct[p]}% hit.`,
  lightningReflexes: (p) => `+${pct(T.lightningReflexes.agi[p])} Agility.`,
};
export const NO_DPS_EFFECT = new Set(['enduranceTraining', 'focusedFire', 'improvedAspectOfTheMonkey', 'pathfinding', 'improvedRevivePet',
  'bestialSwiftness', 'unleashedFury', 'improvedMendPet', 'ferocity', 'summonHawk', 'spiritBond', 'intimidation', 'bestialDiscipline', 'frenzy',
  'bestialWrath', 'hawkEye', 'improvedConcussiveShot', 'scatterShot', 'sniperShot', 'deflection', 'entrapment', 'savageStrikes', 'survivalist',
  'improvedWingClip', 'cleverTraps', 'deterrence', 'survivalTactics', 'predatorsEdge', 'counterattack', 'resourcefulness', 'exposePrey',
  'survivalistsDiscipline', 'striderKick', 'laceratingStrikes']);

export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Potion', icon: 'inv_potion_76' },
    { id: 'conjured', name: 'Demonic Rune', icon: 'inv_misc_rune_04' }, { id: 'explosive', name: 'Explosive', icon: 'spell_fire_selfdestruct' },
  ] },
  { name: 'Marksmanship', spells: [
    { id: 'aimedShot', name: 'Aimed Shot', spellId: 20904, icon: 'inv_spear_07' },
    { id: 'multiShot', name: 'Multi-Shot', spellId: 2643, icon: 'ability_upgrademoonglaive' },
    { id: 'arcaneShot', name: 'Arcane Shot', spellId: 14287, icon: 'ability_impalingbolt' },
    { id: 'serpentSting', name: 'Serpent Sting', spellId: 25295, icon: 'ability_hunter_quickshot' },
    { id: 'huntersMark', name: "Hunter's Mark", spellId: 14325, icon: 'ability_hunter_snipershot' },
    { id: 'rapidFire', name: 'Rapid Fire', spellId: 3045, icon: 'ability_hunter_runningshot' },
  ] },
];
