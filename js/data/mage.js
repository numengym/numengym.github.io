// Mage data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - spell damage (base points + points per level to 60), coefficients, cast
//                                            times, costs, cooldowns; talent rank curves (generatedCurves)
//   sim/mage/*.go                          - how the spells, procs and talents behave
// Values marked APPROX are not stated in wowsims and are read from the game files' class masks.
import { TALENT_TREE_DATA, TALENT_TREES } from './mage-talent-tree.js';

export { TALENT_TREE_DATA, TALENT_TREES };

export const SPELL_MISS = 0.17;     // a level 63 boss (sim/core/target.go spellMissChance)
export const SPELL_CRIT_BONUS = 0.5; // a spell crit deals 150%; crit damage talents raise the bonus
export const MAGE_GCD = 1.5;

// The wowsims presets (ui/specs/mage/dps/presets.ts).
export const DEFAULT_TALENTS = '050205203100311531-53-0533';

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
  missileBarrage: { chance: curve(0.2, 0.4) },                       // 400588: Arcane Blast; half for Fireball, Frostbolt, Arcane Wrath
  arcaneConcentration: { chance: curve(0.02, 0.04, 0.06, 0.08, 0.1) }, // 11213: Clearcasting on a damage spell's hit
  arcaneImpact: { critPct: curve(2, 4, 6) },                         // 11242: arcane spells
  arcaneMeditation: { casting: curve(0.17, 0.33, 0.5) },             // 18462: regen while casting
  arcaneMind: { int: curve(0.02, 0.04, 0.06, 0.08, 0.1), critBonus: curve(0.2, 0.4, 0.6, 0.8, 1) }, // 11232
  arcaneInstability: { dmg: curve(0.01, 0.02, 0.03), critPct: curve(1, 2, 3) }, // 15058
  improvedFireBlast: { cd: curve(1, 2) },                            // 11078: Fire Blast's cooldown
  incineration: { critPct: curve(2, 4, 6, 8, 10) },                  // 18459: Fire Blast, Scorch, Arcane Blast
  accelerant: { cast: curve(0.1, 0.2, 0.3, 0.4, 0.5) },              // 11069: Fireball and Arcane Wrath cast faster
  ignite: { share: curve(0.08, 0.16, 0.24, 0.32, 0.4), duration: 4, period: 2 }, // 11119 / 412538
  improvedScorch: { chance: curve(0.33, 0.67, 1), perStack: 0.03, maxStacks: 5, duration: 30 }, // 11095 / 22959
  masterOfElements: { refund: curve(0.1, 0.2, 0.3) },                // 29074: a Fire or Frost crit refunds the base cost
  criticalMass: { critPct: curve(2, 4, 6) },                         // 11115: Fire spells
  firePower: { perEffect: curve(0.01, 0.02, 0.03), maxEffects: 4 },  // 11124: per Fire effect on the target
  improvedFrostbolt: { cast: curve(0.1, 0.2, 0.3, 0.4, 0.5) },       // 11070
  precision: { hitPct: curve(2, 4, 6) },                             // 29438: every spell
  iceShards: { critBonus: curve(0.2, 0.4, 0.6, 0.8, 1) },            // 11207: Frost spells
  frostbite: { chance: curve(0.05, 0.1, 0.15) },                     // 11071: Fingers of Frost from a Chill
  frostChanneling: { cost: curve(0.05, 0.1, 0.15) },                 // 11160: Frost spells
  shatter: { critPct: curve(17, 33, 50) },                           // 11170: against a Frozen target
  improvedConeOfCold: { dmg: curve(0.12, 0.23, 0.35) },              // 11190
  fingersOfFrost: { charges: curve(1, 2), chance: 0.15, duration: 15 }, // 400647 / 400669
  wintersChill: { chance: curve(0.2, 0.4, 0.6, 0.8, 1), perStack: 0.05, coefPerStack: 0.07, maxStacks: 5, duration: 15 }, // 11180 / 12579
};

// Spells. school; castTime / channel in seconds; cost in mana (costPct: of base mana); base: damage at level 60
// (base points + points per level), variance: the roll's spread around it; coef: spell power coefficient; speed:
// travel speed in yards per second. chill: a Chill effect (Fingers of Frost, Winter's Chill).
export const ABILITIES = {
  // 10181 (Rank 10, the last trainer rank): 3 s, 260 mana, 386 + 2.9 x 4 levels, 81.4% of spell power.
  frostbolt: { name: 'Frostbolt', spellId: 10181, icon: 'spell_frost_frostbolt02', key: '1', school: 'frost', castTime: 3, cost: 260, base: 397.6, variance: 0.0762, coef: 0.814, speed: 28, chill: true, gcd: true, spell: true },
  // 10151 (Rank 11): 3.5 s, 395 mana, 451, 100%; burns for 14 every 2 s for 8 s.
  fireball: { name: 'Fireball', spellId: 10151, icon: 'spell_fire_flamebolt', key: '1', school: 'fire', castTime: 3.5, cost: 395, base: 451, variance: 0.2414, coef: 1, speed: 24, dot: { tick: 14, period: 2, ticks: 4 }, gcd: true, spell: true },
  // 10207 (Rank 7): 1.5 s, 150 mana, 181, 42.9%.
  scorch: { name: 'Scorch', spellId: 10207, icon: 'spell_fire_soulburn', key: '2', school: 'fire', castTime: 1.5, cost: 150, base: 181.4, variance: 0.1654, coef: 0.429, gcd: true, spell: true },
  // 10199 (Rank 7): instant, 8 s cooldown, 340 mana, 453, 42.9%.
  fireBlast: { name: 'Fire Blast', spellId: 10199, icon: 'spell_fire_fireball', key: '3', school: 'fire', cost: 340, cd: 8, base: 453, variance: 0.166, coef: 0.429, gcd: true, spell: true },
  // 18809 (Rank 8, talent): 6 s, 440 mana, 583, 100%; 53 + 15% of spell power every 3 s for 12 s.
  pyroblast: { name: 'Pyroblast', spellId: 18809, icon: 'spell_fire_fireball02', key: '4', school: 'fire', castTime: 6, cost: 440, base: 583, variance: 0.2167, coef: 1, speed: 24, dot: { tick: 53, coef: 0.15, period: 3, ticks: 4 }, talent: 'pyroblast', gcd: true, spell: true },
  // 1239700 (Rank 5, talent): 1.5 s, 15% of base mana (+175% per Arcane Charge), 236, 42.9%; adds an Arcane Charge.
  arcaneBlast: { name: 'Arcane Blast', spellId: 1239700, icon: 'spell_arcane_blast', key: '2', school: 'arcane', castTime: 1.5, costPct: 0.15, base: 236, variance: 0.151, coef: 0.429, talent: 'arcaneBlast', gcd: true, spell: true },
  // 10212 (Rank 7): a 5 s channel, 595 mana, a missile every second of 175, 28.6% of spell power, flying at 20 yd/s.
  arcaneMissiles: { name: 'Arcane Missiles', spellId: 10212, icon: 'spell_nature_starfall', key: '5', school: 'arcane', channel: 5, ticks: 5, cost: 595, base: 174.6, coef: 0.286, speed: 20, gcd: true, spell: true },
  // 1326082 (Rank 4, talent): 3.5 s, 6 s cooldown, 395 mana, 451, 100%, plus 5% of your maximum mana as spell power.
  arcaneWrath: { name: 'Arcane Wrath', spellId: 1326082, icon: 'ability_mage_netherwindpresence', key: '3', school: 'arcane', castTime: 3.5, cd: 6, cost: 395, base: 451, variance: 0.201, coef: 1, manaShare: 0.05, speed: 24, talent: 'arcaneWrath', gcd: true, spell: true },
  // 10161 (Rank 5): instant, 10 s cooldown, 555 mana, 343, 12.9%, to every enemy within 10 yards in front.
  coneOfCold: { name: 'Cone of Cold', spellId: 10161, icon: 'spell_frost_glacier', key: 'Q', school: 'frost', cost: 555, cd: 10, base: 343, variance: 0.0857, coef: 0.129, range: 10, chill: true, gcd: true, spell: true },
  // 1240047 (Rank 6, talent): instant, 160 mana, 149, 14.3%; triple damage against a Frozen target.
  iceLance: { name: 'Ice Lance', spellId: 1240047, icon: 'spell_frost_frostblast', key: 'E', school: 'frost', cost: 160, base: 148.6, variance: 0.1667, coef: 0.1429, frozen: 3, speed: 38, talent: 'iceLance', gcd: true, spell: true },
  // 12042 (talent): 3 min: 30% more spell damage and 30% more mana cost for 15 s.
  arcanePower: { name: 'Arcane Power', spellId: 12042, icon: 'spell_nature_lightning', key: 'R', cost: 0, cd: 180, duration: 15, dmg: 0.3, costMore: 0.3, talent: 'arcanePower' },
  // 12043 (talent): 3 min from when it is spent: your next spell with a cast time is instant.
  presenceOfMind: { name: 'Presence of Mind', spellId: 12043, icon: 'spell_nature_enchantarmor', key: 'F', cost: 0, cd: 180, talent: 'presenceOfMind' },
  // 11129 (talent): 3 min from when it ends: each Fire hit adds 10% crit to your Fire spells until 3 of them crit.
  combustion: { name: 'Combustion', spellId: 11129, icon: 'spell_fire_sealoffire', key: 'T', cost: 0, cd: 180, charges: 3, critPerStack: 10, talent: 'combustion' },
  // 12472 (talent): 10 min: finishes the cooldowns of your Frost spells (Cone of Cold, Ice Barrier).
  coldSnap: { name: 'Cold Snap', spellId: 12472, icon: 'spell_frost_wizardmark', key: 'G', cost: 0, cd: 600, talent: 'coldSnap' },
  // 13033 (Rank 4, talent): 30 s cooldown, 480 mana: a shield for 60 s; while it holds, Frost spells deal 3% more.
  iceBarrier: { name: 'Ice Barrier', spellId: 13033, icon: 'spell_ice_lament', key: 'Z', cost: 480, cd: 30, duration: 60, frostDmg: 0.03, talent: 'iceBarrier', gcd: true },
  // 12051: 8 min: an 8 s channel; your mana regenerates 16 times as fast, casting or not.
  evocation: { name: 'Evocation', spellId: 12051, icon: 'spell_nature_purge', key: 'V', cost: 0, cd: 480, channel: 8, ticks: 8, regen: 16, gcd: true },
  // 22783 (Rank 3): 30 min: 50% of your mana regeneration continues while casting.
  mageArmor: { name: 'Mage Armor', spellId: 22783, icon: 'spell_magearmor', key: 'X', cost: 490, duration: 1800, casting: 0.5, gcd: true },
  // A Mana Ruby (10058): 1100 mana (±9%), 2 min cooldown shared with the other conjured items; one per fight.
  manaGem: { name: 'Mana Ruby', spellId: 10058, icon: 'inv_misc_gem_ruby_01', key: 'C', cost: 0, cd: 120, mana: 1100, variance: 0.18, once: true },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  potion: { name: 'Resource Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  offensivePotion: { name: 'Offensive Potion', icon: 'inv_potion_41', key: '', cost: 0, item: 'offensivePotion' },
  defensivePotion: { name: 'Defensive Potion', icon: 'inv_potion_69', key: '', cost: 0, item: 'defensivePotion' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};

// The Fire effects Fire Power counts on a target.
export const FIRE_SCHOOLS = new Set(['fire']);
// Talent crit by spell: Critical Mass (Fire), Incineration (Fire Blast, Scorch, Arcane Blast, Ice Lance), Arcane Impact (Arcane).
export const CRITICAL_MASS = new Set(['fireball', 'fireBlast', 'scorch', 'pyroblast']);
export const INCINERATION = new Set(['fireBlast', 'scorch', 'arcaneBlast', 'iceLance']);
// Missile Barrage procs (full chance off Arcane Blast, half off these).
export const BARRAGE_HALF = new Set(['fireball', 'frostbolt', 'arcaneWrath']);
// Heating Up stacks from these spells' crits (and every Fire Blast that lands).
export const HEATING_UP = new Set(['fireball', 'fireBlast', 'scorch']);

export const ACTION_BAR = [
  ['frostbolt', 'fireball', 'arcaneBlast', 'arcaneMissiles', 'arcaneWrath', 'scorch', 'fireBlast', 'pyroblast', 'coneOfCold', 'iceLance'],
  ['arcanePower', 'presenceOfMind', 'combustion', 'coldSnap', 'iceBarrier', 'evocation', 'mageArmor', 'manaGem', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  arcaneCharges: { name: 'Arcane Charges', icon: 'spell_arcane_arcanetorrent' },
  missileBarrage: { name: 'Missile Barrage', icon: 'ability_mage_missilebarrage' },
  clearcasting: { name: 'Clearcasting', icon: 'spell_shadow_manaburn' },
  heatingUp: { name: 'Heating Up', icon: 'spell_fire_firebolt' },
  fingersOfFrost: { name: 'Fingers of Frost', icon: 'ability_mage_wintersgrasp' },
  arcanePower: { name: 'Arcane Power', icon: 'spell_nature_lightning' },
  presenceOfMind: { name: 'Presence of Mind', icon: 'spell_nature_enchantarmor' },
  combustion: { name: 'Combustion', icon: 'spell_fire_sealoffire' },
  iceBarrier: { name: 'Ice Barrier', icon: 'spell_ice_lament' },
  mageArmor: { name: 'Mage Armor', icon: 'spell_magearmor' },
  evocation: { name: 'Evocation', icon: 'spell_nature_purge' },
};

export const METER_NAMES = { fireballDot: 'Fireball (DoT)', pyroblastDot: 'Pyroblast (DoT)', ignite: 'Ignite' };
export const METER_ICONS = { fireballDot: 'spell_fire_flamebolt', pyroblastDot: 'spell_fire_fireball02', ignite: 'spell_fire_incinerate' };
export const THREAT_NAMES = {};

// The wowsims P1 Arcane gear set (ui/specs/mage/dps/gear_sets/p1Arcane.gear.json), used by every preset.
export const GEAR = [
  { id: 16686 }, { id: 23057 }, { id: 22068 }, { id: 21415 }, { id: 16688 }, { id: 16683 }, { id: 16684 }, { id: 16685 },
  { id: 16687 }, { id: 16682 }, { id: 275982 }, { id: 18543 }, { id: 18820 }, { id: 19379 }, { id: 23451 }, { id: 19366 }, { id: 279246 },
];

// The wowsims DefaultConsumables, raid buffs and debuffs for the mage, without its Scroll of Imbue Precision: a staff's
// scroll, which wowsims does not put on the Mageblade.
export const CONSUMABLES = {
  flaskId: 13512, elixirIds: [13454, 13447, 250348, 20007], foodId: 13931, mhImbueId: 20749, resourcePotId: 13444,
};
export const RAID_BUFFS = { prayerOfSpirit: true, arcaneBrilliance: true, giftOfTheWild: true, prayerOfFortitude: true, moonkinAura: true };
export const PARTY_BUFFS = { manaSpringTotem: 1, darkInspiration: 1 }; // counts in wowsims
export const BUFFS = { greaterBlessingOfKings: true, greaterBlessingOfWisdom: true };
export const DEBUFFS = { curseOfElements: true };

export const BUILT_IN_BUILDS = [
  { id: 'arcane-frost', name: 'Arcane Frost (wowsims preset)', talents: '050205203100311531-53-0533', playable: true, spec: 'arcane' },
  { id: 'arcane-fire', name: 'Arcane Fire', talents: '050205203100311531-505103010001-003', playable: true, spec: 'arcane' },
  { id: 'fire', name: 'Fire (wowsims preset)', talents: '0502052001001-55500001230133031-003', playable: true, spec: 'fire' },
  { id: 'frost', name: 'Frost (wowsims preset)', talents: '0502052011003--053500021100331251', playable: true, spec: 'frost' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  missileBarrage: (p) => `Arcane Blast has a ${pct(T.missileBarrage.chance[p])} chance (Fireball, Frostbolt and Arcane Wrath half that) to make your next Arcane Missiles free and twice as fast.`,
  arcaneConcentration: (p) => `A ${pct(T.arcaneConcentration.chance[p])} chance on a damage spell's hit to make your next spell free (Clearcasting).`,
  arcaneImpact: (p) => `+${T.arcaneImpact.critPct[p]}% crit with Arcane spells.`,
  arcaneBlast: () => 'Learn Arcane Blast: each cast adds an Arcane Charge (15% of your Intellect as spell power, Arcane Blast costs 175% more).',
  arcaneMeditation: (p) => `${pct(T.arcaneMeditation.casting[p])} of your mana regeneration continues while casting.`,
  arcaneWrath: () => 'Learn Arcane Wrath: 451 Arcane damage plus spell power and 5% of your maximum mana.',
  presenceOfMind: () => 'Learn Presence of Mind: your next spell with a cast time is instant.',
  arcaneMind: (p) => `+${pct(T.arcaneMind.int[p])} Intellect; your Arcane crits deal ${pct(T.arcaneMind.critBonus[p])} more bonus damage.`,
  arcaneInstability: (p) => `Your spells deal ${pct(T.arcaneInstability.dmg[p])} more damage and crit ${T.arcaneInstability.critPct[p]}% more.`,
  arcanePower: () => 'Learn Arcane Power: 30% more damage and 30% more mana cost for 15 sec.',
  improvedFireBlast: (p) => `Fire Blast's cooldown is ${T.improvedFireBlast.cd[p]} sec shorter.`,
  incineration: (p) => `+${T.incineration.critPct[p]}% crit with Fire Blast, Scorch and Arcane Blast.`,
  accelerant: (p) => `Fireball and Arcane Wrath cast ${T.accelerant.cast[p]} sec faster.`,
  ignite: (p) => `Your Fire crits burn the target for ${pct(T.ignite.share[p])} of their damage over ${T.ignite.duration} sec.`,
  pyroblast: () => 'Learn Pyroblast.',
  improvedScorch: (p) => `Scorch has a ${pct(T.improvedScorch.chance[p])} chance to make the target take 3% more Fire damage from you, stacking to 5.`,
  heatingUp: () => 'Crits with Fireball, Fire Blast and Scorch (and every Fire Blast) stack Heating Up: each stack makes Pyroblast cast 25% faster.',
  masterOfElements: (p) => `Your Fire and Frost crits refund ${pct(T.masterOfElements.refund[p])} of the spell's base mana cost.`,
  criticalMass: (p) => `+${T.criticalMass.critPct[p]}% crit with Fire spells.`,
  firePower: (p) => `Your Fire spells deal ${pct(T.firePower.perEffect[p])} more damage per Fire effect on the target, up to 4.`,
  combustion: () => 'Learn Combustion.',
  improvedFrostbolt: (p) => `Frostbolt casts ${T.improvedFrostbolt.cast[p]} sec faster.`,
  precision: (p) => `+${T.precision.hitPct[p]}% hit with spells.`,
  iceShards: (p) => `Your Frost crits deal ${pct(T.iceShards.critBonus[p])} more bonus damage.`,
  frostbite: (p) => `Your Chill effects have an extra ${pct(T.frostbite.chance[p])} chance to grant Fingers of Frost.`,
  frostChanneling: (p) => `Your Frost spells cost ${pct(T.frostChanneling.cost[p])} less mana.`,
  iceLance: () => 'Learn Ice Lance: triple damage against a Frozen target.',
  shatter: (p) => `+${T.shatter.critPct[p]}% crit against a Frozen target.`,
  improvedConeOfCold: (p) => `Cone of Cold deals ${pct(T.improvedConeOfCold.dmg[p])} more damage.`,
  coldSnap: () => 'Learn Cold Snap: finishes the cooldowns of your Frost spells.',
  fingersOfFrost: (p) => `Your Chill effects have a 15% chance to make your next ${T.fingersOfFrost.charges[p]} spells treat the target as Frozen.`,
  wintersChill: (p) => `Frostbolt has a ${pct(T.wintersChill.chance[p])} chance to stack Winter's Chill: your next Cone of Cold deals 5% more and gains 7% of your spell power per stack.`,
  iceBarrier: () => 'Learn Ice Barrier: a shield; while it holds your Frost spells deal 3% more.',
};
export const NO_DPS_EFFECT = new Set(['wandSpecialization', 'improvedChanneling', 'arcaneSubtlety', 'magicAbsorption', 'arcaneResilience',
  'arcaneGeometry', 'arcaneShielding', 'improvedCounterspell', 'flameThrowing', 'impact', 'burningSoul', 'improvedFlamestrike',
  'improvedFireWard', 'blastWave', 'frostWarding', 'improvedFrostNova', 'permafrost', 'improvedBlizzard', 'arcticReach', 'iceBlock']);

export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Resource Potion', icon: 'inv_potion_76' }, { id: 'offensivePotion', name: 'Offensive Potion', icon: 'inv_potion_41' },
    { id: 'defensivePotion', name: 'Defensive Potion', icon: 'inv_potion_69' },
    { id: 'manaGem', name: 'Mana Ruby', icon: 'inv_misc_gem_ruby_01' },
  ] },
  { name: 'Arcane', spells: [
    { id: 'arcaneMissiles', name: 'Arcane Missiles', spellId: 10212, icon: 'spell_nature_starfall' },
    { id: 'evocation', name: 'Evocation', spellId: 12051, icon: 'spell_nature_purge' },
    { id: 'mageArmor', name: 'Mage Armor', spellId: 22783, icon: 'spell_magearmor' },
    { id: 'arcaneBlast', name: 'Arcane Blast', spellId: 1239700, icon: 'spell_arcane_blast', talent: 'arcaneBlast' },
    { id: 'arcaneWrath', name: 'Arcane Wrath', spellId: 1326082, icon: 'ability_mage_netherwindpresence', talent: 'arcaneWrath' },
    { id: 'presenceOfMind', name: 'Presence of Mind', spellId: 12043, icon: 'spell_nature_enchantarmor', talent: 'presenceOfMind' },
    { id: 'arcanePower', name: 'Arcane Power', spellId: 12042, icon: 'spell_nature_lightning', talent: 'arcanePower' },
  ] },
  { name: 'Fire', spells: [
    { id: 'fireball', name: 'Fireball', spellId: 10151, icon: 'spell_fire_flamebolt' },
    { id: 'fireBlast', name: 'Fire Blast', spellId: 10199, icon: 'spell_fire_fireball' },
    { id: 'scorch', name: 'Scorch', spellId: 10207, icon: 'spell_fire_soulburn' },
    { id: 'pyroblast', name: 'Pyroblast', spellId: 18809, icon: 'spell_fire_fireball02', talent: 'pyroblast' },
    { id: 'combustion', name: 'Combustion', spellId: 11129, icon: 'spell_fire_sealoffire', talent: 'combustion' },
  ] },
  { name: 'Frost', spells: [
    { id: 'frostbolt', name: 'Frostbolt', spellId: 10181, icon: 'spell_frost_frostbolt02' },
    { id: 'coneOfCold', name: 'Cone of Cold', spellId: 10161, icon: 'spell_frost_glacier' },
    { id: 'iceLance', name: 'Ice Lance', spellId: 1240047, icon: 'spell_frost_frostblast', talent: 'iceLance' },
    { id: 'coldSnap', name: 'Cold Snap', spellId: 12472, icon: 'spell_frost_wizardmark', talent: 'coldSnap' },
    { id: 'iceBarrier', name: 'Ice Barrier', spellId: 13033, icon: 'spell_ice_lament', talent: 'iceBarrier' },
  ] },
];
