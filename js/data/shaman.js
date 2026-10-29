// Shaman (Elemental) data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - spell damage (base points + points per level to 60), coefficients, cast
//                                            times, costs, cooldowns; talent rank curves (generatedCurves)
//   sim/shaman/*.go                        - how the spells, totems and talents behave
// Not modelled: Chain Lightning's and Magma Totem's other targets beyond what the trainer's targets give, Fire Nova,
// Water Shield (a Restoration talent the preset does not take), Elemental Devastation (melee crit).
import { TALENT_TREE_DATA, TALENT_TREES } from './shaman-talent-tree.js';

export { TALENT_TREE_DATA, TALENT_TREES };

export const SPELL_MISS = 0.17;      // a level 63 boss (sim/core/target.go spellMissChance)
export const SPELL_CRIT_BONUS = 0.5; // a spell crit deals 150%; Elemental Fury raises the bonus

// The wowsims Elemental preset (ui/specs/shaman/elemental/builds/testing.build.json).
export const DEFAULT_TALENTS = '5500331023001351-053002001-053';

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
  convection: { cost: curve(0.02, 0.04, 0.06, 0.08, 0.1) },          // 16039: Lightning Bolt, Chain Lightning, the shocks, Lava Burst
  concussion: { dmg: curve(0.01, 0.02, 0.03, 0.04, 0.05) },          // 16035: Lightning Bolt, Chain Lightning, Earth Shock
  elementalAlacrity: { cast: curve(0.17, 0.33, 0.5) },               // 16578: Lightning Bolt, Chain Lightning, Lava Burst
  callOfFlame: { dmg: curve(0.05, 0.1, 0.15), flameShockTicks: curve(1, 2, 3) }, // 16038: Flame Shock, Lava Burst, Searing Totem; +3 s each
  elementalFocus: { chance: 0.1, duration: 15 },                     // 16164 / 16246: Clearcasting
  lightningOverload: { chance: curve(0.03, 0.07, 0.1) },             // 408438
  elementalFury: { critBonus: curve(0.2, 0.4, 0.6, 0.8, 1) },        // 16089: crit damage of the shaman's spells
  thunderingStrikes: { critPct: curve(1, 2, 3, 4, 5) },              // 16255: spell and melee crit with a melee weapon
  ancestralKnowledge: { int: curve(0.02, 0.04, 0.06, 0.08, 0.1) },   // 17485: Intellect
  tidalFocus: { hitPct: curve(1, 2, 3, 4, 5) },                      // 16179: spell hit
  mindfulness: { casting: curve(0.17, 0.33, 0.5) },                  // 1223033: regen while casting
};

// Spells. school; castTime in seconds; cost in mana; base: damage at level 60 (base points + points per level),
// variance: the roll's spread; coef: spell power coefficient. shock: shares the shocks' 6 s cooldown. dot: a
// periodic effect. totem: the element's slot it stands in.
export const ABILITIES = {
  // 15208 (Rank 10): 2.5 s, 220 mana, 196 + 1.2 x 4 levels, 71.4%. Lightning Overload: 408477, 100.4, 35.7%.
  lightningBolt: { name: 'Lightning Bolt', spellId: 15208, icon: 'spell_nature_lightning', key: '1', school: 'nature', castTime: 2.5, cost: 220, base: 200.8, variance: 0.1084, coef: 0.714, overload: { base: 100.4, variance: 0.1131, coef: 0.357 }, gcd: true, spell: true },
  // 10392 (Rank 8): 2.5 s, 160 mana, 167, 71.4%: the APL's choice below 20% mana.
  lightningBoltR8: { name: 'Lightning Bolt (Rank 8)', spellId: 10392, icon: 'spell_nature_lightning', key: 'Shift+1', school: 'nature', castTime: 2.5, cost: 160, base: 167, variance: 0.1137, coef: 0.714, overload: { base: 83.5, variance: 0.1137, coef: 0.357 }, gcd: true, spell: true, boltRank: true },
  // 1326047 (Rank 4, talent): 2.5 s, 10 s cooldown, 265 mana, 220, 71.4%; 20% more with your Flame Shock on the target.
  lavaBurst: { name: 'Lava Burst', spellId: 1326047, icon: 'spell_shaman_lavaburst', key: '2', school: 'fire', castTime: 2.5, cd: 10, cost: 265, base: 220, variance: 0.2533, coef: 0.714, flameShockBonus: 0.2, talent: 'lavaBurst', gcd: true, spell: true },
  // 10448 (Rank 5): instant, 345 mana, 20 yards: 136.5 + 21.4% now, then 34 + 10% every 3 s for 12 s.
  flameShock: { name: 'Flame Shock', spellId: 10448, icon: 'spell_fire_flameshock', key: '3', school: 'fire', cost: 345, base: 136.5, coef: 0.214, dot: { tick: 34, coef: 0.1, period: 3, ticks: 4 }, range: 20, shock: true, gcd: true, spell: true },
  // 10414 (Rank 7): instant, 450 mana, 20 yards: 301, 38.6%.
  earthShock: { name: 'Earth Shock', spellId: 10414, icon: 'spell_nature_earthshock', key: '4', school: 'nature', cost: 450, base: 301, variance: 0.0527, coef: 0.386, range: 20, shock: true, gcd: true, spell: true },
  // 10605 (Rank 4): 2 s, 6 s cooldown, 315 mana: 126.2, 57.1%, jumping to 2 more targets for 70% each time.
  chainLightning: { name: 'Chain Lightning', spellId: 10605, icon: 'spell_nature_chainlightning', key: '5', school: 'nature', castTime: 2, cd: 6, cost: 315, base: 126.2, variance: 0.1111, coef: 0.571, jumps: 3, jumpMult: 0.7, gcd: true, spell: true },
  // 10438 (Rank 6): 170 mana, a 1 s GCD, 55 s: the totem attacks its target every 2.2 s for 47 + 1.7% (10436).
  searingTotem: { name: 'Searing Totem', spellId: 10438, icon: 'spell_fire_searingtotem', key: 'Q', school: 'fire', cost: 170, gcd: true, gcdTime: 1, totem: 'fire', duration: 55, attack: { base: 47, variance: 0.2979, coef: 0.017, period: 2.2 } },
  // 10497 (Rank 4): 100 mana, 5 min: 10 mana every 2 s to the party (10494).
  manaSpringTotem: { name: 'Mana Spring Totem', spellId: 10497, icon: 'spell_nature_manaregentotem', key: 'E', cost: 100, gcd: true, gcdTime: 1, totem: 'water', duration: 300, manaPerSec: 5 },
  // 25361 (Rank 5) and 10614 (Rank 3): 275 and 250 mana, 5 min: Strength and Windfury for the party's melee.
  strengthOfEarthTotem: { name: 'Strength of Earth Totem', spellId: 25361, icon: 'spell_nature_earthbindtotem', key: 'R', cost: 275, gcd: true, gcdTime: 1, totem: 'earth', duration: 300 },
  windfuryTotem: { name: 'Windfury Totem', spellId: 10614, icon: 'spell_nature_windfury', key: 'T', cost: 250, gcd: true, gcdTime: 1, totem: 'air', duration: 300 },
  // 16166 (talent): 3 min, 15 s: Lightning Bolt and Lava Burst cast 0.5 s faster.
  elementalMastery: { name: 'Elemental Mastery', spellId: 16166, icon: 'spell_nature_wispheal', key: 'F', cost: 0, cd: 180, duration: 15, castCut: 0.5, talent: 'elementalMastery' },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  potion: { name: 'Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  conjured: { name: 'Demonic Rune', icon: 'inv_misc_rune_04', key: '0', cost: 0, item: 'conjured' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};

// Talent and item reach by spell (the class masks of the wowsims rows).
export const LIGHTNING = new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning']);   // Totem of the Storm, Lightning Overload
export const CONVECTION = new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning', 'flameShock', 'earthShock', 'lavaBurst']);
export const CONCUSSION = new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning', 'earthShock']);
export const ALACRITY = new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning', 'lavaBurst']);
export const CALL_OF_FLAME = new Set(['flameShock', 'lavaBurst', 'searingTotem']);
// Clearcasting makes the next of these free.
export const CLEARCASTING = new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning', 'flameShock', 'earthShock', 'lavaBurst']);
// Enchant Weapon - Revelation (the shaman's 1323418): a sure crit on the next of these.
export const REVELATION = { trigger: 1248806, duration: 15, spells: new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning', 'earthShock', 'lavaBurst']) };
// Totem of the Storm (23199): 33 more base damage on Lightning Bolt, Chain Lightning and the overloads.
export const TOTEM_OF_THE_STORM = { id: 23199, base: 33 };
export const TOTEM_SLOTS = ['earth', 'fire', 'water', 'air'];

export const ACTION_BAR = [
  ['lightningBolt', 'lavaBurst', 'flameShock', 'earthShock', 'chainLightning', 'lightningBoltR8', 'searingTotem'],
  ['manaSpringTotem', 'strengthOfEarthTotem', 'windfuryTotem', 'elementalMastery', 'racial', 'trinket1', 'trinket2', 'potion', 'conjured'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  clearcasting: { name: 'Clearcasting', icon: 'spell_shadow_manaburn' },
  elementalMastery: { name: 'Elemental Mastery', icon: 'spell_nature_wispheal' },
  revelation: { name: 'Revelation', icon: 'inv_misc_note_01' },
};

export const METER_NAMES = { searingTotem: 'Searing Totem', overload: 'Lightning Overload' };
export const METER_ICONS = { searingTotem: 'spell_fire_searingtotem', overload: 'spell_nature_lightningoverload' };
export const THREAT_NAMES = {};

// The wowsims testing gear (ui/specs/shaman/elemental/builds/testing.build.json).
export const GEAR = [
  { id: 252604, enchant: 1509 }, { id: 23125, enchant: 8218 }, { id: 19050 }, { id: 279270, enchant: 2621 },
  { id: 10143, randomSuffix: 12734, enchant: 1893 }, { id: 10248, randomSuffix: 12734, enchant: 1901 }, { id: 17721, enchant: 8213 },
  { id: 20047 }, { id: 252486, enchant: 1509 }, { id: 254129, enchant: 8492 }, { id: 272407 }, { id: 19147 }, { id: 272438 },
  { id: 270225 }, { id: 22688, enchant: 8217 }, { id: 15968 }, { id: 23199 },
];

// The build's consumables, raid buffs and debuffs. No party buffs: the shaman's own totems give them.
export const CONSUMABLES = {
  flaskId: 13512, foodId: 13935, conjuredId: 12662, mhImbueId: 20749, elixirIds: [250343, 9155, 250338, 250341, 250337],
  extraIds: [8423], resourcePotId: 13444,
};
export const RAID_BUFFS = { arcaneBrilliance: true, giftOfTheWild: true, moonkinAura: true, prayerOfFortitude: true, prayerOfSpirit: true };
export const PARTY_BUFFS = {};
export const BUFFS = { greaterBlessingOfKings: true, greaterBlessingOfWisdom: true };
export const DEBUFFS = { curseOfElements: true, judgementOfWisdom: true };

export const BUILT_IN_BUILDS = [
  { id: 'elemental', name: 'Elemental (wowsims preset)', talents: DEFAULT_TALENTS, playable: true, spec: 'elemental' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  convection: (p) => `Lightning Bolt, Chain Lightning, the shocks and Lava Burst cost ${pct(T.convection.cost[p])} less mana.`,
  concussion: (p) => `Lightning Bolt, Chain Lightning and Earth Shock deal ${pct(T.concussion.dmg[p])} more damage.`,
  elementalAlacrity: (p) => `Lightning Bolt, Chain Lightning and Lava Burst cast ${T.elementalAlacrity.cast[p]} sec faster.`,
  callOfFlame: (p) => `Flame Shock, Lava Burst and Searing Totem deal ${pct(T.callOfFlame.dmg[p])} more; Flame Shock lasts ${3 * T.callOfFlame.flameShockTicks[p]} sec longer.`,
  elementalFocus: () => 'Your Fire, Frost and Nature damage spells have a 10% chance to make your next spell free (Clearcasting).',
  lavaBurst: () => 'Learn Lava Burst.',
  lightningOverload: (p) => `Lightning Bolt and Chain Lightning have a ${pct(T.lightningOverload.chance[p])} chance to cast a second, half-strength copy.`,
  elementalFury: (p) => `Your spells' crits deal ${pct(T.elementalFury.critBonus[p])} more bonus damage.`,
  elementalMastery: () => 'Learn Elemental Mastery: Lightning Bolt and Lava Burst cast 0.5 sec faster for 15 sec.',
  thunderingStrikes: (p) => `+${T.thunderingStrikes.critPct[p]}% crit with spells and attacks while a melee weapon is equipped.`,
  ancestralKnowledge: (p) => `+${pct(T.ancestralKnowledge.int[p])} Intellect.`,
  tidalFocus: (p) => `+${T.tidalFocus.hitPct[p]}% hit with spells.`,
  mindfulness: (p) => `${pct(T.mindfulness.casting[p])} of your mana regeneration continues while casting.`,
};
export const NO_DPS_EFFECT = new Set(['elementalDevastation', 'reverberation', 'elementalWarding', 'trialByFire', 'eyeOfTheStorm', 'earthbound',
  'elementalReach', 'earthsGrasp', 'guardianTotems', 'mentalDexterity', 'improvedGhostWolf', 'improvedLightningShield', 'elementalWeapons',
  'shamanisticFocus', 'anticipation', 'toughness', 'flurry', 'stormstrike', 'spiritWeapons', 'mentalQuickness', 'improvedStormstrike',
  'maelstromWeapon', 'rageOfTheFarseer', 'improvedHealingWave', 'naturalGrace', 'totemicFocus', 'improvedReincarnation', 'ancestralHealing',
  'healingFocus', 'waterShield', 'tidalMastery', 'restorativeTotems', 'manaTideTotem', 'healingWay', 'naturesSwiftness', 'purification', 'riptide']);

export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Potion', icon: 'inv_potion_76' },
    { id: 'conjured', name: 'Demonic Rune', icon: 'inv_misc_rune_04' },
  ] },
  { name: 'Elemental Combat', spells: [
    { id: 'lightningBolt', name: 'Lightning Bolt', spellId: 15208, icon: 'spell_nature_lightning' },
    { id: 'lightningBoltR8', name: 'Lightning Bolt (Rank 8)', spellId: 10392, icon: 'spell_nature_lightning' },
    { id: 'chainLightning', name: 'Chain Lightning', spellId: 10605, icon: 'spell_nature_chainlightning' },
    { id: 'flameShock', name: 'Flame Shock', spellId: 10448, icon: 'spell_fire_flameshock' },
    { id: 'earthShock', name: 'Earth Shock', spellId: 10414, icon: 'spell_nature_earthshock' },
    { id: 'searingTotem', name: 'Searing Totem', spellId: 10438, icon: 'spell_fire_searingtotem' },
    { id: 'lavaBurst', name: 'Lava Burst', spellId: 1326047, icon: 'spell_shaman_lavaburst', talent: 'lavaBurst' },
    { id: 'elementalMastery', name: 'Elemental Mastery', spellId: 16166, icon: 'spell_nature_wispheal', talent: 'elementalMastery' },
  ] },
  { name: 'Enhancement', spells: [
    { id: 'strengthOfEarthTotem', name: 'Strength of Earth Totem', spellId: 25361, icon: 'spell_nature_earthbindtotem' },
    { id: 'windfuryTotem', name: 'Windfury Totem', spellId: 10614, icon: 'spell_nature_windfury' },
  ] },
  { name: 'Restoration', spells: [
    { id: 'manaSpringTotem', name: 'Mana Spring Totem', spellId: 10497, icon: 'spell_nature_manaregentotem' },
  ] },
];
