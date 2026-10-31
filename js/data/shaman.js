// Shaman (Elemental, Enhancement) data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
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
  shamanisticFocus: { cost: 0.45 },                                  // 1223030: the shocks' mana
  reverberation: { cd: curve(0.2, 0.4, 0.6, 0.8, 1) },               // 16040: the shocks' cooldown
  trialByFire: { fireNova: curve(0.1, 0.2), fireNovaCd: curve(2, 4), magmaTotem: curve(10, 20) }, // 16086
  elementalDevastation: { critPct: curve(3, 6, 9), duration: 10 },   // 30160 / 30165: melee crit after a direct spell crit
  elementalWeapons: { flametongue: curve(0.05, 0.1, 0.15) },         // 16266: Flametongue Weapon's damage
  mentalDexterity: { apPerInt: curve(0.33, 0.67, 1) },               // 415140: attack power from Intellect
  mentalQuickness: { spPerInt: curve(0.15, 0.3) },                   // 30812: spell damage from Intellect
  flurry: { haste: curve(0.05, 0.1, 0.15, 0.2, 0.25), charges: 3, icd: 0.5, duration: 15 }, // 16256 / 16257
  maelstromWeapon: { perStack: curve(0.04, 0.08, 0.12, 0.16, 0.2), ppm: 10, maxStacks: 5, duration: 30 }, // 408498 / 408505
  improvedStormstrike: { chance: curve(0.5, 1), casting: 0.5, duration: 15 }, // 1223031 / 1238931: regen while casting
};

// Enhancement: Stormstrike's debuff (17364 effect 2): your next Lightning Bolt, Chain Lightning or Earth Shock on the
// target deals 20% more, one charge for 12 s. Flametongue Weapon (16342: 16344 and 10444): every main-hand hit adds
// 28.1 Fire damage per second of weapon speed plus 10% of your spell power. Rage of the Farseer (425336): 30% attack
// speed for 25 s.
export const STORMSTRIKE = { bonus: 0.2, duration: 12, reach: new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning', 'earthShock']) };
export const FLAMETONGUE = { perSpeed: 28.1, coef: 0.1 };
export const FARSEER = { haste: 0.3 };
export const SHAMANISTIC_FOCUS = new Set(['flameShock', 'earthShock']);

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
  chainLightning: { name: 'Chain Lightning', spellId: 10605, icon: 'spell_nature_chainlightning', key: '5', school: 'nature', castTime: 2, cd: 6, cost: 315, base: 126.2, variance: 0.1111, coef: 0.571, jumps: 3, jumpMult: 0.7, jumpRange: 12, gcd: true, spell: true },
  // 10438 (Rank 6): 170 mana, a 1 s GCD, 55 s: the totem attacks its target every 2.2 s for 47 + 1.7% (10436).
  searingTotem: { name: 'Searing Totem', spellId: 10438, icon: 'spell_fire_searingtotem', key: 'Q', school: 'fire', cost: 170, gcd: true, gcdTime: 1, totem: 'fire', duration: 55, attack: { base: 47, variance: 0.2979, coef: 0.017, period: 2.2 } },
  // 10497 (Rank 4): 100 mana, 5 min: 10 mana every 2 s to the party (10494).
  // 1325256 (Rank 4, talent): 5 min cooldown, 60 mana: a water totem for 12 sec, 290 mana to you every 3 sec (1325257).
  manaTideTotem: { name: 'Mana Tide Totem', spellId: 1325256, icon: 'spell_frost_summonwaterelemental', key: '', cost: 60, cd: 300, gcd: true, gcdTime: 1, totem: 'water', duration: 12, pulse: { mana: 290, period: 3 }, talent: 'manaTideTotem' },
  // 408510 (talent): free, 10 min: 3 globes; a hit taken or one of your spells' crits spends one (once in 3.5 sec) for
  // 2% of your maximum mana (408511).
  waterShield: { name: 'Water Shield', spellId: 408510, icon: 'ability_shaman_watershield', key: '', cost: 0, gcd: true, duration: 600, charges: 3, icd: 3.5, manaPct: 0.02, talent: 'waterShield' },
  manaSpringTotem: { name: 'Mana Spring Totem', spellId: 10497, icon: 'spell_nature_manaregentotem', key: 'E', cost: 100, gcd: true, gcdTime: 1, totem: 'water', duration: 300, manaPerSec: 5 },
  // 25361 (Rank 5) and 10614 (Rank 3): 275 and 250 mana, 5 min: Strength and Windfury for the party's melee.
  // 8143: 60 mana, 1 sec GCD, an earth totem for 5 min (wowsims/forever); every 4 sec it shakes off fear (the classic
  // pulse; main.js breaks yours).
  tremorTotem: { name: 'Tremor Totem', spellId: 8143, icon: 'spell_nature_tremortotem', key: '', cost: 60, gcd: true, gcdTime: 1, totem: 'earth', duration: 300, tremor: { period: 4 } },
  strengthOfEarthTotem: { name: 'Strength of Earth Totem', spellId: 25361, icon: 'spell_nature_earthbindtotem', key: 'R', cost: 275, gcd: true, gcdTime: 1, totem: 'earth', duration: 300 },
  windfuryTotem: { name: 'Windfury Totem', spellId: 10614, icon: 'spell_nature_windfury', key: 'T', cost: 250, gcd: true, gcdTime: 1, totem: 'air', duration: 300 },
  // 66842: a 3 s cast that drops the four totems you set for it (one per element: the totem bar), at their mana.
  callOfTheElements: { name: 'Call of the Elements', spellId: 66842, icon: 'spell_shaman_dropall_01', key: '', castTime: 3, gcd: true, callTotems: true },
  // 36936: instant, takes your totems down and gives back 25% of their mana cost.
  totemicRecall: { name: 'Totemic Recall', spellId: 36936, icon: 'spell_shaman_totemrecall', key: '', gcd: true, refund: 0.25 },
  // 437009: instant, 60 s cooldown, 25% of base mana: your totems move (to where you stand: the trainer has no ground
  // targeting).
  totemicProjection: { name: 'Totemic Projection', spellId: 437009, icon: 'ability_shaman_totemrelocation', key: '', costPct: 0.25, cd: 60, gcd: true },
  // 10587 (Rank 4): 650 mana, a 1 s GCD, 20 s: every 2 s 73 + 3.3% Fire damage to the enemies within 8 yards (10581).
  magmaTotem: { name: 'Magma Totem', spellId: 10587, icon: 'spell_fire_selfdestruct', key: 'Shift+Q', school: 'fire', cost: 650, gcd: true, gcdTime: 1, totem: 'fire', duration: 20, attack: { base: 73, variance: 0, coef: 0.033, period: 2, radius: 8 } },
  // 17364 (talent): 8% of base mana, 8 s: a strike for normalized weapon damage; the debuff makes your next Lightning
  // Bolt, Chain Lightning or Earth Shock on the target deal 20% more.
  stormstrike: { name: 'Stormstrike', spellId: 17364, icon: 'ability_shaman_stormstrike', key: '6', costPct: 0.08, cd: 8, melee: true, talent: 'stormstrike', gcd: true },
  // 408345 (Rank 5): 375 mana, 10 s: 245.5 + 14.3% Fire damage to the enemies within 10 yards of your fire totem (408428).
  fireNova: { name: 'Fire Nova', spellId: 408345, icon: 'spell_fire_sealoffire', key: 'G', school: 'fire', cost: 375, cd: 10, base: 245.5, variance: 0.1098, coef: 0.143, radius: 10, gcd: true },
  // 425336 (talent): 3 min: 30% attack speed for 25 s.
  rageOfTheFarseer: { name: 'Rage of the Farseer', spellId: 425336, icon: 'spell_nature_bloodlust', key: 'V', cost: 0, cd: 180, duration: 25, talent: 'rageOfTheFarseer' },
  // 16166 (talent): 3 min, 15 s: Lightning Bolt and Lava Burst cast 0.5 s faster.
  elementalMastery: { name: 'Elemental Mastery', spellId: 16166, icon: 'spell_nature_wispheal', key: 'F', cost: 0, cd: 180, duration: 15, castCut: 0.5, talent: 'elementalMastery' },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  potion: { name: 'Resource Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  offensivePotion: { name: 'Offensive Potion', icon: 'inv_potion_41', key: '', cost: 0, item: 'offensivePotion' },
  defensivePotion: { name: 'Defensive Potion', icon: 'inv_potion_69', key: '', cost: 0, item: 'defensivePotion' },
  conjured: { name: 'Demonic Rune', icon: 'inv_misc_rune_04', key: '0', cost: 0, item: 'conjured' },
  weapon: { name: 'Weapon', icon: 'inv_misc_questionmark', key: 'Shift+7', cost: 0, item: 'weapon' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};

// Talent and item reach by spell (the class masks of the wowsims rows).
export const LIGHTNING = new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning']);   // Totem of the Storm, Lightning Overload
export const CONVECTION = new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning', 'flameShock', 'earthShock', 'lavaBurst']);
export const CONCUSSION = new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning', 'earthShock']);
export const ALACRITY = new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning', 'lavaBurst']);
// Call of Flame's reach (the wowsims logs: Magma Totem and Fire Nova take its 15% too).
export const CALL_OF_FLAME = new Set(['flameShock', 'lavaBurst', 'searingTotem', 'magmaTotem', 'fireNova']);
// Clearcasting makes the next of these free.
export const CLEARCASTING = new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning', 'flameShock', 'earthShock', 'lavaBurst']);
// Enchant Weapon - Revelation (the shaman's 1323418): a sure crit on the next of these.
export const REVELATION = { trigger: 1248806, duration: 15, spells: new Set(['lightningBolt', 'lightningBoltR8', 'chainLightning', 'earthShock', 'lavaBurst']) };
// Totem of the Storm (23199): 33 more base damage on Lightning Bolt, Chain Lightning and the overloads.
export const TOTEM_OF_THE_STORM = { id: 23199, base: 33 };
export const TOTEM_SLOTS = ['earth', 'fire', 'water', 'air'];
// The totems Call of the Elements drops until you set others (the totem bar).
export const DEFAULT_TOTEM_SET = { earth: 'strengthOfEarthTotem', fire: 'searingTotem', water: 'manaSpringTotem', air: 'windfuryTotem' };

export const ACTION_BAR = [
  ['lightningBolt', 'lavaBurst', 'flameShock', 'earthShock', 'chainLightning', 'lightningBoltR8', 'searingTotem', 'stormstrike', 'fireNova', 'magmaTotem'],
  ['manaSpringTotem', 'manaTideTotem', 'waterShield', 'strengthOfEarthTotem', 'tremorTotem', 'windfuryTotem', 'callOfTheElements', 'totemicRecall', 'totemicProjection', 'elementalMastery', 'rageOfTheFarseer', 'racial', 'trinket1', 'trinket2', 'weapon', 'potion', 'offensivePotion', 'defensivePotion', 'conjured'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  clearcasting: { name: 'Clearcasting', icon: 'spell_shadow_manaburn' },
  elementalMastery: { name: 'Elemental Mastery', icon: 'spell_nature_wispheal' },
  maelstromWeapon: { name: 'Maelstrom Weapon', icon: 'spell_shaman_maelstromweapon' },
  flurry: { name: 'Flurry', icon: 'ability_ghoulfrenzy' },
  elementalDevastation: { name: 'Elemental Devastation', icon: 'spell_fire_elementaldevastation' },
  improvedStormstrike: { name: 'Improved Stormstrike', icon: 'spell_shaman_improvedstormstrike' },
  rageOfTheFarseer: { name: 'Rage of the Farseer', icon: 'spell_nature_bloodlust' },
  revelation: { name: 'Revelation', icon: 'inv_misc_note_01' },
  waterShield: { name: 'Water Shield', icon: 'ability_shaman_watershield' },
};

export const METER_NAMES = { searingTotem: 'Searing Totem', magmaTotem: 'Magma Totem', overload: 'Lightning Overload', flametongue: 'Flametongue Attack' };
export const METER_ICONS = { searingTotem: 'spell_fire_searingtotem', magmaTotem: 'spell_fire_selfdestruct', overload: 'spell_nature_lightningoverload', flametongue: 'spell_fire_flametounge' };
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
export const DEBUFFS = {
  curseOfElements: true, curseOfRecklessness: true, exposeArmor: true, faerieFire: true, giftOfArthas: true, judgementOfWisdom: true, sunderArmor: true,
};

// The wowsims Enhancement testing build (ui/specs/shaman/enhancement/builds/testing.build.json): Windshaper Skyborne,
// the Manual Crowd Pummeler with Flametongue Weapon, its consumables, raid buffs and debuffs. Not modelled: Hunter's
// Mark, Dragonbreath Chili, a second explosive.
export const ENH_TALENTS = '053303102-053030031005102251-03';
export const ENH_GEAR = [
  { id: 252604, enchant: 1509 }, { id: 22149, enchant: 8218 }, { id: 19050 }, { id: 279270, enchant: 849 }, { id: 22102, enchant: 1893 },
  { id: 22095, enchant: 1901 }, { id: 12632, enchant: 8213 }, { id: 18405 }, { id: 252486, enchant: 1509 }, { id: 22096, enchant: 8492 },
  { id: 275972 }, { id: 272406 }, { id: 272438 }, { id: 249469 }, { id: 9449, enchant: 8211 }, {}, { id: 23199 },
];
export const ENH_CONSUMABLES = {
  flaskId: 13512, foodId: 13935, conjuredId: 12662, mhImbueId: 20750, resourcePotId: 13444,
  elixirIds: [250343, 13454, 250351, 13452, 250337, 250338, 250341, 12820], extraIds: [8423],
};
export const ENH_RAID_BUFFS = {
  arcaneBrilliance: true, battleShout: 1, giftOfTheWild: true, graceOfAirTotem: true, leaderOfThePack: true, moonkinAura: true,
  prayerOfFortitude: true, prayerOfSpirit: true,
};
export const ENH_BUFFS = { greaterBlessingOfKings: true, greaterBlessingOfMight: true, greaterBlessingOfWisdom: true };
export const ENH_DEBUFFS = {
  curseOfElements: true, curseOfRecklessness: true, exposeArmor: true, faerieFire: true, giftOfArthas: true, judgementOfWisdom: true, sunderArmor: true,
};

// Restoration (wowsims has no Restoration preset): 5/46, a deep healer. Ancestral Knowledge for mana, then every
// Restoration talent a healer wants down to Riptide (Healing Way first), without Improved Reincarnation and with 2 of
// Totemic Focus.
export const RESTO_TALENTS = '-005-5533203315513151';

export const BUILT_IN_BUILDS = [
  { id: 'elemental', name: 'Elemental (wowsims preset)', talents: DEFAULT_TALENTS, playable: true, spec: 'elemental' },
  { id: 'enhancement', name: 'Enhancement (wowsims preset)', talents: ENH_TALENTS, playable: true, spec: 'enhancement' },
  { id: 'restoration', name: 'Restoration (5/46, Riptide)', talents: RESTO_TALENTS, playable: true, spec: 'restoShaman' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  convection: (p) => `Lightning Bolt, Chain Lightning, the shocks and Lava Burst cost ${pct(T.convection.cost[p])} less mana.`,
  concussion: (p) => `Lightning Bolt, Chain Lightning and Earth Shock deal ${pct(T.concussion.dmg[p])} more damage.`,
  elementalAlacrity: (p) => `Lightning Bolt, Chain Lightning and Lava Burst cast ${T.elementalAlacrity.cast[p]} sec faster.`,
  callOfFlame: (p) => `Flame Shock, Lava Burst, Fire Nova and your Searing and Magma Totems deal ${pct(T.callOfFlame.dmg[p])} more; Flame Shock lasts ${3 * T.callOfFlame.flameShockTicks[p]} sec longer.`,
  elementalFocus: () => 'Your Fire, Frost and Nature damage spells have a 10% chance to make your next spell free (Clearcasting).',
  lavaBurst: () => 'Learn Lava Burst.',
  lightningOverload: (p) => `Lightning Bolt and Chain Lightning have a ${pct(T.lightningOverload.chance[p])} chance to cast a second, half-strength copy.`,
  elementalFury: (p) => `Your spells' crits deal ${pct(T.elementalFury.critBonus[p])} more bonus damage.`,
  elementalMastery: () => 'Learn Elemental Mastery: Lightning Bolt and Lava Burst cast 0.5 sec faster for 15 sec.',
  thunderingStrikes: (p) => `+${T.thunderingStrikes.critPct[p]}% crit with spells and attacks while a melee weapon is equipped.`,
  ancestralKnowledge: (p) => `+${pct(T.ancestralKnowledge.int[p])} Intellect.`,
  tidalFocus: (p) => `+${T.tidalFocus.hitPct[p]}% hit with spells.`,
  waterShield: () => 'Learn Water Shield: globes of water that give mana on a hit taken or a spell crit.',
  manaTideTotem: () => 'Learn Mana Tide Totem: a water totem that gives mana every 3 sec for 12 sec.',
  mindfulness: (p) => `${pct(T.mindfulness.casting[p])} of your mana regeneration continues while casting.`,
  shamanisticFocus: () => `Your shocks cost ${pct(T.shamanisticFocus.cost)} less mana.`,
  reverberation: (p) => `The shocks' cooldown is ${T.reverberation.cd[p]} sec shorter.`,
  trialByFire: (p) => `Fire Nova deals ${pct(T.trialByFire.fireNova[p])} more and recharges ${T.trialByFire.fireNovaCd[p]} sec sooner; Magma Totem lasts ${T.trialByFire.magmaTotem[p]} sec longer.`,
  elementalDevastation: (p) => `A direct spell crit gives you ${T.elementalDevastation.critPct[p]}% melee crit for 10 sec.`,
  elementalWeapons: (p) => `Flametongue Weapon deals ${pct(T.elementalWeapons.flametongue[p])} more.`,
  mentalDexterity: (p) => `You gain attack power equal to ${pct(T.mentalDexterity.apPerInt[p])} of your Intellect.`,
  mentalQuickness: (p) => `You gain spell damage equal to ${pct(T.mentalQuickness.spPerInt[p])} of your Intellect.`,
  flurry: (p) => `A melee crit makes your next 3 swings ${pct(T.flurry.haste[p])} faster.`,
  stormstrike: () => 'Learn Stormstrike: a strike, and your next Lightning Bolt, Chain Lightning or Earth Shock on the target deals 20% more.',
  improvedStormstrike: (p) => `Stormstrike has a ${pct(T.improvedStormstrike.chance[p])} chance to let 50% of your mana regeneration continue while casting for 15 sec.`,
  maelstromWeapon: (p) => `Your melee hits can give Maelstrom Weapon (5 stacks): each makes your next Lightning Bolt cast ${pct(T.maelstromWeapon.perStack[p])} faster and cost that much less.`,
  rageOfTheFarseer: () => 'Learn Rage of the Farseer: 30% attack speed for 25 sec.',
};
export const NO_DPS_EFFECT = new Set(['elementalWarding', 'eyeOfTheStorm', 'earthbound',
  'elementalReach', 'earthsGrasp', 'guardianTotems', 'improvedGhostWolf', 'improvedLightningShield',
  'anticipation', 'toughness', 'spiritWeapons', 'improvedHealingWave', 'naturalGrace', 'totemicFocus', 'improvedReincarnation', 'ancestralHealing',
  'healingFocus', 'tidalMastery', 'restorativeTotems', 'healingWay', 'naturesSwiftness', 'purification', 'riptide']);

export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Resource Potion', icon: 'inv_potion_76' }, { id: 'offensivePotion', name: 'Offensive Potion', icon: 'inv_potion_41' },
    { id: 'defensivePotion', name: 'Defensive Potion', icon: 'inv_potion_69' },
    { id: 'weapon', name: 'Weapon', icon: 'inv_misc_questionmark' },
    { id: 'conjured', name: 'Demonic Rune', icon: 'inv_misc_rune_04' },
  ] },
  { name: 'Elemental Combat', spells: [
    { id: 'lightningBolt', name: 'Lightning Bolt', spellId: 15208, icon: 'spell_nature_lightning' },
    { id: 'lightningBoltR8', name: 'Lightning Bolt (Rank 8)', spellId: 10392, icon: 'spell_nature_lightning' },
    { id: 'chainLightning', name: 'Chain Lightning', spellId: 10605, icon: 'spell_nature_chainlightning' },
    { id: 'flameShock', name: 'Flame Shock', spellId: 10448, icon: 'spell_fire_flameshock' },
    { id: 'earthShock', name: 'Earth Shock', spellId: 10414, icon: 'spell_nature_earthshock' },
    { id: 'searingTotem', name: 'Searing Totem', spellId: 10438, icon: 'spell_fire_searingtotem' },
    { id: 'magmaTotem', name: 'Magma Totem', spellId: 10587, icon: 'spell_fire_selfdestruct' },
    { id: 'callOfTheElements', name: 'Call of the Elements', spellId: 66842, icon: 'spell_shaman_dropall_01' },
    { id: 'totemicRecall', name: 'Totemic Recall', spellId: 36936, icon: 'spell_shaman_totemrecall' },
    { id: 'totemicProjection', name: 'Totemic Projection', spellId: 437009, icon: 'ability_shaman_totemrelocation' },
    { id: 'fireNova', name: 'Fire Nova', spellId: 408345, icon: 'spell_fire_sealoffire' },
    { id: 'lavaBurst', name: 'Lava Burst', spellId: 1326047, icon: 'spell_shaman_lavaburst', talent: 'lavaBurst' },
    { id: 'elementalMastery', name: 'Elemental Mastery', spellId: 16166, icon: 'spell_nature_wispheal', talent: 'elementalMastery' },
  ] },
  { name: 'Enhancement', spells: [
    { id: 'stormstrike', name: 'Stormstrike', spellId: 17364, icon: 'ability_shaman_stormstrike', talent: 'stormstrike' },
    { id: 'rageOfTheFarseer', name: 'Rage of the Farseer', spellId: 425336, icon: 'spell_nature_bloodlust', talent: 'rageOfTheFarseer' },
    { id: 'strengthOfEarthTotem', name: 'Strength of Earth Totem', spellId: 25361, icon: 'spell_nature_earthbindtotem' },
    { id: 'windfuryTotem', name: 'Windfury Totem', spellId: 10614, icon: 'spell_nature_windfury' },
  ] },
  { name: 'Restoration', spells: [
    { id: 'manaSpringTotem', name: 'Mana Spring Totem', spellId: 10497, icon: 'spell_nature_manaregentotem' },
    { id: 'tremorTotem', name: 'Tremor Totem', spellId: 8143, icon: 'spell_nature_tremortotem' },
    { id: 'manaTideTotem', name: 'Mana Tide Totem', spellId: 1325256, icon: 'spell_frost_summonwaterelemental', talent: 'manaTideTotem' },
    { id: 'waterShield', name: 'Water Shield', spellId: 408510, icon: 'ability_shaman_watershield', talent: 'waterShield' },
  ] },
];
