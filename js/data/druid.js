// Druid (Balance) data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - spell damage (base points + points per level to 60), coefficients, cast
//                                            times, costs, cooldowns; talent rank curves (generatedCurves)
//   sim/druid/*.go                         - how the spells, forms and talents behave
// Not modelled: Hurricane (the APL casts it on 4+ targets), Entangling Roots, the healing spells, Improved Starfire's
// stun, Dreamstate (Innervate is cast on yourself here).
import { TALENT_TREE_DATA, TALENT_TREES } from './druid-talent-tree.js';

export { TALENT_TREE_DATA, TALENT_TREES };

export const SPELL_MISS = 0.17;      // a level 63 boss (sim/core/target.go spellMissChance)
export const SPELL_CRIT_BONUS = 0.5; // a spell crit deals 150%; Vengeance raises the bonus

// The wowsims Balance preset (ui/specs/druid/balance/defaults.siml, Moonkin), for the push 114344 rework (wowsims
// 0300ff9). OLD_PRESET_TALENTS: the presets before it, which a saved character still on one trades for this one.
export const DEFAULT_TALENTS = '5532220115001351--505302';
export const OLD_PRESET_TALENTS = new Set(['5232220115501351--5053']);

export function parseTalents(str) {
  const out = {};
  const trees = String(str || '').split('-');
  TALENT_TREES.forEach((names, t) => {
    const digits = trees[t] || '';
    names.forEach((name, i) => { out[name] = Number(digits[i] || 0); });
  });
  return out;
}

// The druid tree before hotfix 113531 (wowsims 55089744) reordered it, Berserk, Improved Shifting Power and Gift of the
// Earthmother with it. A talent string saved before then reads by this order: oldDruidTalents turns it into the order
// of hotfix 113531 to push 114344 (PRE_114344_TREES), each talent's ranks moved by name (capped at that tree's
// maximum), the removed ones dropped; druidTalents114344 then takes it to today's tree.
const OLD_TALENT_TREES = [
  ['improvedWrath', 'genesis', 'moonglow', 'improvedMoonfire', 'naturesMajesty', 'naturesReach', 'improvedEntanglingRoots', 'naturesSplendor',
    'insectSwarm', 'vengeance', 'improvedStarfire', 'overgrowth', 'naturesGrace', 'eclipse', 'moonfury', 'moonkinForm'],
  ['ferocity', 'heartOfTheWild', 'feralSwiftness', 'feralInstinct', 'brutalImpact', 'thickHide', 'shreddingAttacks', 'savageFury', 'feralCharge',
    'sharpenedClaws', 'shiftingPower', 'primalBite', 'predatoryStrikes', 'bloodFrenzy', 'improvedShiftingPower', 'leaderOfThePack',
    'naturalInstinct', 'naturalReaction', 'rendAndTear', 'berserk'],
  ['naturesFocus', 'furor', 'naturalist', 'subtlety', 'naturalShapeshifter', 'reflection', 'giftOfNature', 'giftOfTheEarthmother',
    'tranquilSpirit', 'improvedRejuvenation', 'swiftmend', 'naturesSwiftness', 'livingSpirit', 'improvedTranquility', 'improvedRegrowth', 'wildGrowth'],
];
// The Balance tree from hotfix 113531 to push 114344: today's places, with Improved Wrath, Improved Moonfire, Improved
// Starfire at 5 ranks and Moonfury where Starlight Wrath, Moon and Stars, Improved Starfire (2) and Dreamstate are now.
const PRE_114344_MAX = { improvedWrath: 5, improvedMoonfire: 2, improvedStarfire: 5, moonfury: 5 };
const PRE_114344_TREES = TALENT_TREES.map((names, t) => (t ? names : OLD_TALENT_TREES[0]));
export function oldDruidTalents(str) {
  const ranks = {};
  String(str || '').split('-').forEach((digits, t) => (OLD_TALENT_TREES[t] || []).forEach((name, i) => { ranks[name] = Number(digits[i] || 0); }));
  const max = { ...Object.fromEntries(TALENT_TREE_DATA.flatMap((t) => t.talents.map((x) => [x.key, x.max]))), ...PRE_114344_MAX };
  return PRE_114344_TREES.map((names) => names.map((n) => Math.min(ranks[n] || 0, max[n] || 0)).join('').replace(/0+$/, '')).join('-').replace(/-+$/, '');
}

// Push 114344's Balance rework (wowsims b57a61d): Improved Wrath is Starlight Wrath and Improved Moonfire Moon and
// Stars in their places, Improved Starfire has 2 ranks, and Moonfury (16896) is gone for Dreamstate (408258).
// druidTalents114344 keeps the renamed talents' ranks, caps Improved Starfire at 2 and gives Moonfury's points back
// (Dreamstate is another talent), and returns null when the result breaks the tree's rules (a row opens after 5
// points per row above it, a prerequisite must be maxed), as one that reached Moonkin Form through Moonfury does: the
// caller then falls back to the spec's default.
export function druidTalents114344(str) {
  const next = String(str || '').split('-').map((d) => [...d].map(Number));
  const tree = TALENT_TREE_DATA[0].talents;
  const bal = tree.map((x, i) => (x.key === 'dreamstate' ? 0 : Math.min((next[0] || [])[i] || 0, x.max)));
  for (const [i, x] of tree.entries()) {
    if (!bal[i]) continue;
    const above = tree.reduce((s, y, j) => s + (y.row < x.row ? bal[j] : 0), 0);
    const p = x.prereq ? tree.findIndex((y) => y.row === x.prereq[0] && y.col === x.prereq[1]) : -1;
    if (above < x.row * 5 || (p >= 0 && bal[p] < tree[p].max)) return null;
  }
  next[0] = bal;
  return next.map((r) => r.join('').replace(/0+$/, '')).join('-').replace(/-+$/, '');
}

// Talent values per rank (the wowsims rank curves), index = rank. Percent values as fractions unless named Pct.
const curve = (...v) => [0, ...v];
export const TALENT = {
  // 16814 (push 114344, wowsims b57a61d): Wrath's and Starfire's cast time (class mask 5), Wrath's mana cost.
  starlightWrath: { cast: curve(0.1, 0.2, 0.3, 0.4, 0.5), cost: curve(0.1, 0.2, 0.3, 0.4, 0.5) },
  genesis: { periodic: curve(0.02, 0.04, 0.06, 0.08, 0.1) },         // 1223081: Moonfire's and Insect Swarm's ticks, Hurricane (push 114405)
  moonglow: { cost: curve(0.08, 0.17, 0.25) },                       // 16845: Wrath, Moonfire, Starfire, Insect Swarm
  // 16821: Moonfire's crit, hit and ticks; since push 114344 (effect 4) Starfire is pushed back 50/100% less.
  moonAndStars: { critPct: curve(5, 10), dmg: curve(0.05, 0.1), starfirePushback: curve(0.5, 1) },
  naturesMajesty: { critPct: curve(2, 4) },                          // 1223082: spell and melee crit
  naturesReach: { hitPct: curve(2, 4) },                             // 16819: spell and melee hit
  naturesSplendor: { moonfireTicks: 1, insectSwarmTicks: 1 },        // 1223083: +3 s Moonfire, +2 s Insect Swarm
  vengeance: { critBonus: curve(0.2, 0.4, 0.6, 0.8, 1) },            // 16909: Arcane and Nature crit damage
  improvedStarfire: { stunPct: curve(8, 15) },                       // 16850: since push 114344 only the stun (not modelled)
  naturesGrace: { haste: 0.1, gcdCut: 0.1, duration: 3 },            // 16880 / 16886: after a direct spell crit
  // 408248 / 408255; effect 5 (push 114344): Wrath's crit chance.
  eclipse: { cast: curve(0.17, 0.33, 0.5), wrathCritPct: curve(7, 13, 20), charges: 2, maxCharges: 4, duration: 15 },
  dreamstate: { share: curve(0.2, 0.4, 0.6, 0.8, 1) },               // 408258: your share of an Innervate on another player
  // Moonkin Form (Passive) 24905, effect 4 (push 114344, Moonfury's damage moved there): Arcane and Nature damage.
  moonkinForm: { dmg: 0.1 },
  naturalist: { dmg: curve(0.02, 0.04, 0.06, 0.08, 0.1) },           // 17069: all damage
  reflection: { casting: curve(0.17, 0.33, 0.5) },                   // 17106: regen while casting
};

// Spells. school; castTime in seconds; cost in mana (costPct: of base mana); base: damage at level 60, variance: the
// roll's spread; coef: spell power coefficient. dot: a periodic effect (ticks can crit).
export const ABILITIES = {
  // 9912 (Rank 8): 2 s, 120 mana, 91 + 1 x 6 levels, 57.1%.
  wrath: { name: 'Wrath', spellId: 9912, icon: 'spell_nature_abolishmagic', key: '1', school: 'nature', castTime: 2, cost: 120, base: 97, variance: 0.112, coef: 0.571, gcd: true, spell: true },
  // 9876 (Rank 6 in the game files): 3.5 s, 315 mana, 471 + 3.2 x 2 levels, 100%.
  starfire: { name: 'Starfire', spellId: 9876, icon: 'spell_arcane_starfire', key: '2', school: 'arcane', castTime: 3.5, cost: 315, base: 477.4, variance: 0.165, coef: 1, gcd: true, spell: true },
  // 9835 (Rank 10): instant, 375 mana: 139.6 + 15% now, then 60 + 13% every 3 s for 12 s.
  moonfire: { name: 'Moonfire', spellId: 9835, icon: 'spell_nature_starfall', key: '3', school: 'arcane', cost: 375, base: 139.6, variance: 0.1561, coef: 0.15, dot: { tick: 60, coef: 0.13, period: 3, ticks: 4 }, gcd: true, spell: true },
  // 24977 (Rank 5, talent): instant, 160 mana: 31 + 15.8% every 2 s for 12 s.
  insectSwarm: { name: 'Insect Swarm', spellId: 24977, icon: 'spell_nature_insectswarm', key: '4', school: 'nature', cost: 160, dot: { tick: 31, coef: 0.158, period: 2, ticks: 6 }, talent: 'insectSwarm', gcd: true, spell: true },
  // 17402 (Rank 3): a 10 s channel, 1495 mana: 132 + 3% of spell power Nature to every enemy in an 8 yard area at your
  // target each second (1278759; the ticks can crit), and they attack 20% slower.
  hurricane: { name: 'Hurricane', spellId: 17402, icon: 'spell_nature_cyclone', key: '', school: 'nature', cost: 1495, channel: 10, ticks: 10, tick: 132, coef: 0.03, radius: 8, slow: 0.2, gcd: true, spell: true },
  // 29166: 6 min, 5% of base mana: for 20 s your mana regenerates 5 times as fast, all of it while casting.
  innervate: { name: 'Innervate', spellId: 29166, icon: 'spell_nature_lightning', key: 'R', costPct: 0.05, cd: 360, duration: 20, regen: 5, gcd: true },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  weapon: { name: 'Weapon', icon: 'inv_misc_questionmark', key: '', cost: 0, item: 'weapon' },
  swapWeapons: { name: 'Swap Weapons', icon: 'inv_sword_27', key: '', cost: 0 },
  potion: { name: 'Resource Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  offensivePotion: { name: 'Offensive Potion', icon: 'inv_potion_41', key: '', cost: 0, item: 'offensivePotion' },
  defensivePotion: { name: 'Defensive Potion', icon: 'inv_potion_69', key: '', cost: 0, item: 'defensivePotion' },
  conjured: { name: 'Demonic Rune', icon: 'inv_misc_rune_04', key: '0', cost: 0, item: 'conjured' },
  explosive: { name: 'Explosive', icon: 'spell_fire_selfdestruct', key: 'C', cost: 0, item: 'explosive' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};

// Talent reach by spell (the class masks of the wowsims rows).
export const MOONGLOW = new Set(['wrath', 'starfire', 'moonfire', 'insectSwarm']);
// Idol of the Moon (23197): Moonfire deals 33 more.
// Omen of Clarity (16864), every druid's (wowsims sim/druid/omen_of_clarity.go): a druid spell that lands rolls 2 procs a
// minute at its cast time after the talent cuts (no haste, no Eclipse; an instant 1.5 s), 10 s apart. Hurricane's ticks
// never roll it, its cast once for each enemy, a proc ending the rolls (wowsims 333653b, fcdf20d); Innervate once in
// Moonkin Form (wowsims bfd3bd5). Clearcasting (16870, 15 s) comes after the cast that procs it and makes the next
// Starfire, Moonfire, Insect Swarm or Hurricane free; its class mask holds no Wrath and no Innervate.
export const OMEN = { ppm: 2, icd: 10, duration: 15, instant: 1.5, free: new Set(['starfire', 'moonfire', 'insectSwarm', 'hurricane']) };

export const IDOL_OF_THE_MOON = { id: 23197, base: 33 };

export const ACTION_BAR = [
  ['wrath', 'starfire', 'moonfire', 'insectSwarm', 'hurricane'],
  ['innervate', 'racial', 'trinket1', 'trinket2', 'weapon', 'swapWeapons', 'potion', 'offensivePotion', 'defensivePotion', 'conjured', 'explosive'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  eclipse: { name: 'Eclipse', icon: 'ability_druid_eclipse' },
  naturesGrace: { name: "Nature's Grace", icon: 'spell_nature_naturesblessing' },
  innervate: { name: 'Innervate', icon: 'spell_nature_lightning' },
  clearcasting: { name: 'Clearcasting', icon: 'spell_shadow_manaburn' },
};

export const METER_NAMES = {};
export const METER_ICONS = {};
export const THREAT_NAMES = {};

// The wowsims P1 gear (ui/specs/druid/balance/gear_sets/p1.gear.json).
export const GEAR = [
  { id: 21353 }, { id: 18814 }, { id: 21354 }, { id: 21409 }, { id: 21357 }, { id: 21594 }, { id: 21585 }, { id: 19162 },
  { id: 21356 }, { id: 21355 }, { id: 21709 }, { id: 23031 }, { id: 19379 }, { id: 23046 }, { id: 21407 }, { id: 19366 }, { id: 23197 },
];

// The wowsims Default Balance gear (ui/specs/druid/balance/defaults.siml gear:, wowsims b41e53b, 8cb194d, e7da04f; the
// P1 and Pre-BiS sets are gone): six Feralheart pieces, Orb of the Darkmoon, Arcanoweave Cloak, Belt of the Archmage,
// Ironfeather Leggings, Songstone of Ironforge, Rune Band of Wizardry, Weakness Analyzer, Eye of the Beast, Ironbark Staff
// with Spellblasting (7662), no off-hand, Swarming Idol. No other enchants, as wowsims sims it. (Restoration keeps GEAR.)
export const BALANCE_GEAR = [
  { id: 226773 }, { id: 19426 }, { id: 226778 }, { id: 272411 }, { id: 226776 }, { id: 226775 }, { id: 226777 }, { id: 18405 },
  { id: 252486 }, { id: 226774 }, { id: 12543 }, { id: 22339 }, { id: 272438 }, { id: 13968 }, { id: 20220, enchant: 7662 }, {}, { id: 272430 },
];

// The wowsims default consumables, raid buffs and debuffs for Balance. The potion is the Major Spellblasting Potion; the
// Balance spec adds the Major Mana Potion its APL drinks instead when mana runs short (specs.js). Moonkin Aura comes
// from your own Moonkin Form.
export const CONSUMABLES = {
  conjuredId: 12662, elixirIds: [13454, 250343, 250337, 250341], flaskId: 13512, foodId: 13933, // Elixir of the Owl again since wowsims 490b3bc
  mhImbueId: 20750, offensivePotId: 250937, // Wizard Oil and no Saf-T Clever Dynamite since wowsims abad5d1, e7da04f
};
export const RAID_BUFFS = { arcaneBrilliance: true, giftOfTheWild: true, prayerOfFortitude: true, prayerOfSpirit: true, moonkinAura: true };
export const PARTY_BUFFS = { manaSpringTotem: 1 };
export const BUFFS = { greaterBlessingOfKings: true, greaterBlessingOfWisdom: 1 };
export const DEBUFFS = { curseOfElements: true, judgementOfWisdom: true };

export const BUILT_IN_BUILDS = [
  { id: 'balance', name: 'Moonkin (wowsims preset)', talents: DEFAULT_TALENTS, playable: true, spec: 'balance' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  starlightWrath: (p) => `Wrath and Starfire cast ${T.starlightWrath.cast[p]} sec faster, and Wrath costs ${pct(T.starlightWrath.cost[p])} less mana.`,
  genesis: (p) => `Moonfire's and Insect Swarm's ticks and Hurricane deal ${pct(T.genesis.periodic[p])} more.`,
  moonglow: (p) => `Wrath, Moonfire, Starfire and Insect Swarm cost ${pct(T.moonglow.cost[p])} less mana.`,
  moonAndStars: (p) => `Moonfire crits ${T.moonAndStars.critPct[p]}% more and deals ${pct(T.moonAndStars.dmg[p])} more; Starfire is pushed back ${pct(T.moonAndStars.starfirePushback[p])} less.`,
  naturesMajesty: (p) => `+${T.naturesMajesty.critPct[p]}% crit with spells and attacks.`,
  naturesReach: (p) => `+${T.naturesReach.hitPct[p]}% hit with spells and attacks.`,
  naturesSplendor: () => 'Moonfire lasts 3 sec longer and Insect Swarm 2 sec longer.',
  insectSwarm: () => 'Learn Insect Swarm.',
  vengeance: (p) => `Your Arcane and Nature crits deal ${pct(T.vengeance.critBonus[p])} more bonus damage.`,
  improvedStarfire: (p) => `Starfire has a ${T.improvedStarfire.stunPct[p]}% chance to stun its target for 3 sec (bosses are immune).`,
  naturesGrace: () => 'A spell crit makes you cast 10% faster, with a 10% shorter global cooldown, for 3 sec.',
  eclipse: (p) => `Wrath crits ${T.eclipse.wrathCritPct[p]}% more, and each Wrath that lands makes your next 2 Starfires (up to 4) cast ${T.eclipse.cast[p]} sec faster.`,
  dreamstate: (p) => `Innervate cast on another player also gives you ${pct(T.dreamstate.share[p])} of its effect.`,
  moonkinForm: () => 'Learn Moonkin Form: your Arcane and Nature spells deal 10% more damage, and Moonkin Aura gives your party 3% crit with spells and attacks; not on top of Leader of the Pack.',
  naturalist: (p) => `You deal ${pct(T.naturalist.dmg[p])} more damage.`,
  reflection: (p) => `${pct(T.reflection.casting[p])} of your mana regeneration continues while casting.`,
};
export const NO_DPS_EFFECT = new Set(['improvedEntanglingRoots', 'improvedStarfire', 'dreamstate', 'overgrowth', 'ferocity', 'furor', 'feralSwiftness', 'feralInstinct',
  'brutalImpact', 'thickHide', 'shreddingAttacks', 'savageFury', 'feralCharge', 'sharpenedClaws', 'predatoryStrikes', 'lacerate',
  'predatoryDiscipline', 'bloodFrenzy', 'leaderOfThePack', 'naturalInstinct', 'rendAndTear', 'naturalReaction', 'primalBite', 'shiftingPower',
  'naturesFocus', 'heartOfTheWild', 'naturalShapeshifter', 'subtlety', 'giftOfNature', 'bloom', 'tranquilSpirit', 'improvedRejuvenation',
  'swiftmend', 'naturesSwiftness', 'livingSpirit', 'improvedTranquility', 'improvedRegrowth', 'wildGrowth']);

export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'weapon', name: 'Weapon', icon: 'inv_misc_questionmark' }, { id: 'swapWeapons', name: 'Swap Weapons', icon: 'inv_sword_27' }, { id: 'potion', name: 'Resource Potion', icon: 'inv_potion_76' }, { id: 'offensivePotion', name: 'Offensive Potion', icon: 'inv_potion_41' },
    { id: 'defensivePotion', name: 'Defensive Potion', icon: 'inv_potion_69' },
    { id: 'conjured', name: 'Demonic Rune', icon: 'inv_misc_rune_04' }, { id: 'explosive', name: 'Explosive', icon: 'spell_fire_selfdestruct' },
  ] },
  { name: 'Balance', spells: [
    { id: 'wrath', name: 'Wrath', spellId: 9912, icon: 'spell_nature_abolishmagic' },
    { id: 'starfire', name: 'Starfire', spellId: 9876, icon: 'spell_arcane_starfire' },
    { id: 'moonfire', name: 'Moonfire', spellId: 9835, icon: 'spell_nature_starfall' },
    { id: 'insectSwarm', name: 'Insect Swarm', spellId: 24977, icon: 'spell_nature_insectswarm', talent: 'insectSwarm' },
    { id: 'hurricane', name: 'Hurricane', spellId: 17402, icon: 'spell_nature_cyclone' },
  ] },
  { name: 'Restoration', spells: [
    { id: 'innervate', name: 'Innervate', spellId: 29166, icon: 'spell_nature_lightning' },
  ] },
];
