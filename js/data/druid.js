// Druid (Balance) data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - spell damage (base points + points per level to 60), coefficients, cast
//                                            times, costs, cooldowns; talent rank curves (generatedCurves)
//   sim/druid/*.go                         - how the spells, forms and talents behave
// Not modelled: Hurricane (the APL casts it on 4+ targets), Entangling Roots, the healing spells, Improved Starfire's
// stun.
import { TALENT_TREE_DATA, TALENT_TREES } from './druid-talent-tree.js';

export { TALENT_TREE_DATA, TALENT_TREES };

export const SPELL_MISS = 0.17;      // a level 63 boss (sim/core/target.go spellMissChance)
export const SPELL_CRIT_BONUS = 0.5; // a spell crit deals 150%; Vengeance raises the bonus

// The wowsims Balance preset (ui/specs/druid/balance/presets.ts, Moonkin).
export const DEFAULT_TALENTS = '5232220115501351--505003';

export function parseTalents(str) {
  const out = {};
  const trees = String(str || '').split('-');
  TALENT_TREES.forEach((names, t) => {
    const digits = trees[t] || '';
    names.forEach((name, i) => { out[name] = Number(digits[i] || 0); });
  });
  return out;
}

// Talent values per rank (the wowsims rank curves), index = rank. Percent values as fractions unless named Pct.
const curve = (...v) => [0, ...v];
export const TALENT = {
  improvedWrath: { cast: curve(0.1, 0.2, 0.3, 0.4, 0.5), cost: curve(0.1, 0.2, 0.3, 0.4, 0.5) }, // 16814
  genesis: { periodic: curve(0.01, 0.02, 0.03, 0.04, 0.05) },        // 1223081: Moonfire's and Insect Swarm's ticks
  moonglow: { cost: curve(0.08, 0.17, 0.25) },                       // 16845: Wrath, Moonfire, Starfire, Insect Swarm
  improvedMoonfire: { critPct: curve(5, 10), dmg: curve(0.05, 0.1) },  // 16821: Moonfire's crit, hit and ticks
  naturesMajesty: { critPct: curve(2, 4) },                          // 1223082: spell and melee crit
  naturesReach: { hitPct: curve(2, 4) },                             // 16819: spell and melee hit
  naturesSplendor: { moonfireTicks: 1, insectSwarmTicks: 1 },        // 1223083: +3 s Moonfire, +2 s Insect Swarm
  vengeance: { critBonus: curve(0.2, 0.4, 0.6, 0.8, 1) },            // 16909: Arcane and Nature crit damage
  improvedStarfire: { cast: curve(0.1, 0.2, 0.3, 0.4, 0.5) },        // 16850
  naturesGrace: { haste: 0.1, gcdCut: 0.1, duration: 3 },            // 16880 / 16886: after a direct spell crit
  eclipse: { cast: curve(0.17, 0.33, 0.5), charges: 2, maxCharges: 4, duration: 15 }, // 408248 / 408255
  moonfury: { dmg: curve(0.02, 0.04, 0.06, 0.08, 0.1) },             // 16896: Arcane and Nature damage
  naturalist: { dmg: curve(0.01, 0.02, 0.03, 0.04, 0.05) },          // 17069: all damage
  reflection: { casting: curve(0.17, 0.33, 0.5) },                   // 17106: regen while casting
};

// Spells. school; castTime in seconds; cost in mana (costPct: of base mana); base: damage at level 60, variance: the
// roll's spread; coef: spell power coefficient. dot: a periodic effect (ticks can crit).
export const ABILITIES = {
  // 9912 (Rank 8): 2 s, 120 mana, 91 + 1 x 6 levels, 57.1%.
  wrath: { name: 'Wrath', spellId: 9912, icon: 'spell_nature_abolishmagic', key: '1', school: 'nature', castTime: 2, cost: 120, base: 97, variance: 0.112, coef: 0.571, gcd: true, spell: true },
  // 9876 (Rank 6 in the game files): 3.5 s, 315 mana, 337 + 2.3 x 2 levels, 100%.
  starfire: { name: 'Starfire', spellId: 9876, icon: 'spell_arcane_starfire', key: '2', school: 'arcane', castTime: 3.5, cost: 315, base: 341.6, variance: 0.165, coef: 1, gcd: true, spell: true },
  // 9835 (Rank 10): instant, 375 mana: 139.6 + 15% now, then 60 + 13% every 3 s for 12 s.
  moonfire: { name: 'Moonfire', spellId: 9835, icon: 'spell_nature_starfall', key: '3', school: 'arcane', cost: 375, base: 139.6, variance: 0.1561, coef: 0.15, dot: { tick: 60, coef: 0.13, period: 3, ticks: 4 }, gcd: true, spell: true },
  // 24977 (Rank 5, talent): instant, 160 mana: 31 + 15.8% every 2 s for 12 s.
  insectSwarm: { name: 'Insect Swarm', spellId: 24977, icon: 'spell_nature_insectswarm', key: '4', school: 'nature', cost: 160, dot: { tick: 31, coef: 0.158, period: 2, ticks: 6 }, talent: 'insectSwarm', gcd: true, spell: true },
  // 29166: 6 min, 5% of base mana: for 20 s your mana regenerates 5 times as fast, all of it while casting.
  innervate: { name: 'Innervate', spellId: 29166, icon: 'spell_nature_lightning', key: 'R', costPct: 0.05, cd: 360, duration: 20, regen: 5, gcd: true },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  potion: { name: 'Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  conjured: { name: 'Demonic Rune', icon: 'inv_misc_rune_04', key: '0', cost: 0, item: 'conjured' },
  explosive: { name: 'Explosive', icon: 'spell_fire_selfdestruct', key: 'C', cost: 0, item: 'explosive' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};

// Talent reach by spell (the class masks of the wowsims rows).
export const MOONGLOW = new Set(['wrath', 'starfire', 'moonfire', 'insectSwarm']);
// Idol of the Moon (23197): Moonfire deals 33 more.
export const IDOL_OF_THE_MOON = { id: 23197, base: 33 };

export const ACTION_BAR = [
  ['wrath', 'starfire', 'moonfire', 'insectSwarm'],
  ['innervate', 'racial', 'trinket1', 'trinket2', 'potion', 'conjured', 'explosive'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  eclipse: { name: 'Eclipse', icon: 'ability_druid_eclipse' },
  naturesGrace: { name: "Nature's Grace", icon: 'spell_nature_naturesblessing' },
  innervate: { name: 'Innervate', icon: 'spell_nature_lightning' },
};

export const METER_NAMES = {};
export const METER_ICONS = {};
export const THREAT_NAMES = {};

// The wowsims P1 gear (ui/specs/druid/balance/gear_sets/p1.gear.json).
export const GEAR = [
  { id: 21353 }, { id: 18814 }, { id: 21354 }, { id: 21409 }, { id: 21357 }, { id: 21594 }, { id: 21585 }, { id: 19162 },
  { id: 21356 }, { id: 21355 }, { id: 21709 }, { id: 23031 }, { id: 19379 }, { id: 23046 }, { id: 21407 }, { id: 19366 }, { id: 23197 },
];

// The wowsims default consumables, raid buffs and debuffs for Balance. The potion is the Major Spellblasting Potion, the
// one the wowsims sim drinks at the pull. Moonkin Aura comes from your own Moonkin Form.
export const CONSUMABLES = {
  conjuredId: 12662, elixirIds: [13454, 250343, 250337, 250341], explosiveId: 260814, flaskId: 13512, foodId: 13933,
  mhImbueId: 20749, offensivePotId: 250937,
};
export const RAID_BUFFS = { arcaneBrilliance: true, giftOfTheWild: true, prayerOfFortitude: true, prayerOfSpirit: true, moonkinAura: true };
export const PARTY_BUFFS = { manaSpringTotem: 1 };
export const BUFFS = { greaterBlessingOfKings: true, greaterBlessingOfWisdom: true };
export const DEBUFFS = { curseOfElements: true, judgementOfWisdom: true };

export const BUILT_IN_BUILDS = [
  { id: 'balance', name: 'Moonkin (wowsims preset)', talents: DEFAULT_TALENTS, playable: true, spec: 'balance' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  improvedWrath: (p) => `Wrath casts ${T.improvedWrath.cast[p]} sec faster and costs ${pct(T.improvedWrath.cost[p])} less mana.`,
  genesis: (p) => `Moonfire's and Insect Swarm's ticks deal ${pct(T.genesis.periodic[p])} more.`,
  moonglow: (p) => `Wrath, Moonfire, Starfire and Insect Swarm cost ${pct(T.moonglow.cost[p])} less mana.`,
  improvedMoonfire: (p) => `Moonfire crits ${T.improvedMoonfire.critPct[p]}% more and deals ${pct(T.improvedMoonfire.dmg[p])} more.`,
  naturesMajesty: (p) => `+${T.naturesMajesty.critPct[p]}% crit with spells and attacks.`,
  naturesReach: (p) => `+${T.naturesReach.hitPct[p]}% hit with spells and attacks.`,
  naturesSplendor: () => 'Moonfire lasts 3 sec longer and Insect Swarm 2 sec longer.',
  insectSwarm: () => 'Learn Insect Swarm.',
  vengeance: (p) => `Your Arcane and Nature crits deal ${pct(T.vengeance.critBonus[p])} more bonus damage.`,
  improvedStarfire: (p) => `Starfire casts ${T.improvedStarfire.cast[p]} sec faster.`,
  naturesGrace: () => 'A spell crit makes you cast 10% faster, with a 10% shorter global cooldown, for 3 sec.',
  eclipse: (p) => `Each Wrath that lands makes your next 2 Starfires (up to 4) cast ${T.eclipse.cast[p]} sec faster.`,
  moonfury: (p) => `Your Arcane and Nature spells deal ${pct(T.moonfury.dmg[p])} more damage.`,
  moonkinForm: () => 'Learn Moonkin Form: Moonkin Aura gives your party 3% spell crit.',
  naturalist: (p) => `You deal ${pct(T.naturalist.dmg[p])} more damage.`,
  reflection: (p) => `${pct(T.reflection.casting[p])} of your mana regeneration continues while casting.`,
};
export const NO_DPS_EFFECT = new Set(['improvedEntanglingRoots', 'overgrowth', 'ferocity', 'heartOfTheWild', 'feralSwiftness', 'feralInstinct',
  'brutalImpact', 'thickHide', 'shreddingAttacks', 'savageFury', 'feralCharge', 'sharpenedClaws', 'shiftingPower', 'primalBite', 'predatoryStrikes',
  'bloodFrenzy', 'improvedShiftingPower', 'leaderOfThePack', 'naturalInstinct', 'naturalReaction', 'rendAndTear', 'berserk', 'naturesFocus',
  'furor', 'subtlety', 'naturalShapeshifter', 'giftOfNature', 'giftOfTheEarthmother', 'tranquilSpirit', 'improvedRejuvenation', 'swiftmend',
  'naturesSwiftness', 'livingSpirit', 'improvedTranquility', 'improvedRegrowth', 'wildGrowth']);

export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Potion', icon: 'inv_potion_76' },
    { id: 'conjured', name: 'Demonic Rune', icon: 'inv_misc_rune_04' }, { id: 'explosive', name: 'Explosive', icon: 'spell_fire_selfdestruct' },
  ] },
  { name: 'Balance', spells: [
    { id: 'wrath', name: 'Wrath', spellId: 9912, icon: 'spell_nature_abolishmagic' },
    { id: 'starfire', name: 'Starfire', spellId: 9876, icon: 'spell_arcane_starfire' },
    { id: 'moonfire', name: 'Moonfire', spellId: 9835, icon: 'spell_nature_starfall' },
    { id: 'insectSwarm', name: 'Insect Swarm', spellId: 24977, icon: 'spell_nature_insectswarm', talent: 'insectSwarm' },
  ] },
  { name: 'Restoration', spells: [
    { id: 'innervate', name: 'Innervate', spellId: 29166, icon: 'spell_nature_lightning' },
  ] },
];
