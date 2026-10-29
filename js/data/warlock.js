// Warlock data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - spell damage (base points + points per level to 60), coefficients, cast
//                                            times, costs, cooldowns; talent rank curves (generatedCurves)
//   sim/warlock/*.go                       - how the spells, banes, curses, demons and talents behave
// Not modelled: Hellfire, Rain of Fire, Drain Life and Drain Soul, Bane of Havoc's share (one target), Curse of
// Recklessness and Weakness, the Voidwalker and Felhunter, summoning in the fight, Fel Domination.
import { TALENT_TREE_DATA, TALENT_TREES } from './warlock-talent-tree.js';

export { TALENT_TREE_DATA, TALENT_TREES };

export const SPELL_MISS = 0.17;      // a level 63 boss (sim/core/target.go spellMissChance)
export const SPELL_CRIT_BONUS = 0.5; // a spell crit deals 150%; Ruin and Pandemic double the bonus

// The wowsims builds (ui/specs/warlock/dps/builds/*.build.json).
export const AFF_TALENTS = '25300020135201351--0550005003';
export const DEMO_TALENTS = '011-0305003201220301351-0050055003';
export const DESTRO_TALENTS = '2550002013--0050355103101351';
export const DEFAULT_TALENTS = AFF_TALENTS;

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
  improvedLifeTap: { mana: curve(0.1, 0.2) },                                  // 18182
  suppression: { hitPct: curve(1, 2, 3, 4, 5) },                               // 18174: spell hit
  improvedCorruption: { cast: curve(0.4, 0.8, 1.2, 1.6, 2), dot: curve(0.02, 0.04, 0.06, 0.08, 0.1) }, // 17810
  improvedBaneOfAgony: { dot: curve(0.05, 0.1) },                              // 18827
  amplifyCurse: { mult: 1.5, duration: 30, cd: 180 },                          // 18288: the next Bane of Agony
  pandemic: { critBonus: curve(0.33, 0.67, 1) },                               // 427712: the shadow dots' crit bonus
  malevolence: { critPct: curve(1, 2, 3, 4, 5) },                              // 1310949: shadow spells and Lash of Pain
  nightfall: { chance: curve(0.02, 0.04), duration: 10 },                      // 18094 / 17941: an instant Shadow Bolt
  soulSiphon: { perEffect: curve(0.04, 0.08, 0.12), maxEffects: 3 },           // 17804: Wrack per affliction on the target
  shadowMastery: { direct: curve(0.02, 0.04, 0.06, 0.08, 0.1), dot: curve(0.02, 0.04, 0.06, 0.08, 0.1) }, // 18271
  improvedImp: { firebolt: curve(0.1, 0.2, 0.3) },                             // 18694
  unholyPower: { pet: curve(0.02, 0.04, 0.06, 0.08, 0.1) },                    // 18769: the demons' damage
  felVitality: { mana: curve(0.05, 0.1, 0.15) },                               // 18731: your maximum mana
  demonicEnergies: { petShare: curve(0.5, 1) },                                // 1225214: Life Tap's mana to the demon too
  decimation: { soulFireCd: curve(0.45, 0.9), below: 0.35, dmg: curve(0.03, 0.06), soulFireCast: curve(0.2, 0.4), duration: 10 }, // 440870 / 440873
  demonicBrand: { charges: curve(2, 4, 6), duration: 10, base: 34 * 1.5, low: 14, high: 17, coef: 0.078 }, // 1293695 / 1293696
  soulLink: { dmg: 0.03 },                                                     // 25228: you and the demon
  demonicKnowledge: { spellPowerPerLevel: curve(0.33, 0.67, 1) },              // 412732: you and the demon
  masterDemonologist: { dmg: curve(0.02, 0.04, 0.06, 0.08, 0.1) },             // 23785: Imp Fire, Succubus Shadow
  improvedShadowBolt: { shadow: curve(0.04, 0.08, 0.12, 0.16, 0.2), duration: 12 }, // 17793 / 17794: Shadow Vulnerability
  bane: { cast: curve(0.1, 0.2, 0.3, 0.4, 0.5), soulFire: curve(0.4, 0.8, 1.2, 1.6, 2) }, // 17788
  cataclysm: { cost: curve(0.03, 0.06, 0.1) },                                 // 17778
  aftermath: { immolate: curve(0.1, 0.2, 0.3, 0.4, 0.5) },                     // 18119: Immolate's first hit
  ruin: { critBonus: curve(0.2, 0.4, 0.6, 0.8, 1) },                           // 17959: the Destruction spells' crit bonus
  agonizingFlames: { searingCrit: curve(3, 7, 10), dmg: curve(0.03, 0.07, 0.1), dot: curve(0.03, 0.07, 0.1) }, // 17927
  fireAndBrimstone: { conflagrateCrit: curve(8, 17, 25) },                     // 412751
  shadowAndFlame: { keepImmolate: curve(0.2, 0.4, 0.6, 0.8, 1), buff: curve(0.02, 0.04, 0.06, 0.08, 0.1), duration: 20 }, // 426316
};

// Spells at level 60. school; castTime in seconds; cost in mana; base: damage (base points + points per level),
// variance: the roll's spread; coef: spell power coefficient. dot: { tick, coef, period, ticks }.
export const ABILITIES = {
  // 25307 (Rank 10): 3 s, 380 mana: 268 + 85.7%.
  shadowBolt: { name: 'Shadow Bolt', spellId: 25307, icon: 'spell_shadow_shadowbolt', key: '1', school: 'shadow', castTime: 3, cost: 380, base: 268, variance: 0.1098, coef: 0.857, gcd: true, spell: true },
  // 1293813 (talent): 2.5 s, 325 mana: 217 + 71.4%, 25% more against a target with Immolate.
  incinerate: { name: 'Incinerate', spellId: 1293813, icon: 'spell_fire_burnout', key: '1', school: 'fire', castTime: 2.5, cost: 325, base: 217, variance: 0.15, coef: 0.714, immolateBonus: 0.25, talent: 'incinerate', gcd: true, spell: true },
  // 17923 (Rank 6): 1.5 s, 168 mana: 116.4 + 42.9%.
  searingPain: { name: 'Searing Pain', spellId: 17923, icon: 'spell_fire_soulburn', key: '1', school: 'fire', castTime: 1.5, cost: 168, base: 116.4, variance: 0.1622, coef: 0.429, gcd: true, spell: true },
  // 25309 (Rank 8): 2 s, 380 mana: 158 + 20% now, then 55 + 13% every 3 s for 15 s.
  immolate: { name: 'Immolate', spellId: 25309, icon: 'spell_fire_immolation', key: '2', school: 'fire', castTime: 2, cost: 380, base: 158, coef: 0.2, dot: { tick: 55, coef: 0.13, period: 3, ticks: 5 }, gcd: true, spell: true },
  // 25311 (Rank 7): 2 s (Improved Corruption makes it faster), 340 mana: 73 + 20% every 3 s for 18 s.
  corruption: { name: 'Corruption', spellId: 25311, icon: 'spell_shadow_abominationexplosion', key: '3', school: 'shadow', castTime: 2, cost: 340, dot: { tick: 73, coef: 0.2, period: 3, ticks: 6 }, gcd: true, spell: true },
  // 11713 (Rank 6): instant, 215 mana: 46 + 13.3% every 2 s for 24 s, the base at half, whole and one and a half by thirds.
  baneOfAgony: { name: 'Bane of Agony', spellId: 11713, icon: 'spell_shadow_curseofsargeras', key: '4', school: 'shadow', cost: 215, dot: { tick: 46, coef: 0.133, period: 2, ticks: 12 }, bane: true, gcd: true, spell: true },
  // 603: instant, 1 min, 300 mana: 1742 + 400% after 60 s.
  baneOfDoom: { name: 'Bane of Doom', spellId: 603, icon: 'spell_shadow_auraofdarkness', key: '5', school: 'shadow', cost: 300, cd: 60, dot: { tick: 1742, coef: 4, period: 60, ticks: 1 }, bane: true, gcd: true, spell: true },
  // 18881 (Rank 4, talent): instant, 365 mana: 41 + 5% every 3 s for 30 s.
  siphonLife: { name: 'Siphon Life', spellId: 18881, icon: 'spell_shadow_requiem', key: 'Q', school: 'shadow', cost: 365, dot: { tick: 41, coef: 0.05, period: 3, ticks: 10 }, talent: 'siphonLife', gcd: true, spell: true },
  // 1316697 (talent): a 6 s channel, 200 mana: 36 + 14.3% a second, more per affliction on the target (Soul Siphon);
  // meanwhile your Corruption and Bane of Agony deal 10% more to it.
  wrack: { name: 'Wrack', spellId: 1316697, icon: 'spell_shadow_lifedrain02', key: 'E', school: 'shadow', cost: 200, channel: 6, ticks: 6, tick: 36, coef: 0.143, amplify: 0.1, talent: 'wrack', gcd: true, spell: true },
  // 18932 (talent): 10 s, 255 mana: 282 + 42.9%, on your Immolate (which it uses up unless Shadow and Flame keeps it).
  conflagrate: { name: 'Conflagrate', spellId: 18932, icon: 'spell_fire_fireball', key: 'E', school: 'fire', cost: 255, cd: 10, base: 282, variance: 0.2191, coef: 0.429, talent: 'conflagrate', gcd: true, spell: true },
  // 18871 (talent): 15 s, 365 mana and a Soul Shard: 273.2 + 42.9%.
  shadowburn: { name: 'Shadowburn', spellId: 18871, icon: 'spell_shadow_scourgebuild', key: 'R', school: 'shadow', cost: 365, cd: 15, base: 273.2, variance: 0.1092, coef: 0.429, shard: true, talent: 'shadowburn', gcd: true, spell: true },
  // 17924 (Rank 2): 6 s, 1 min, 335 mana and a Soul Shard: 438.6 + 100%.
  soulFire: { name: 'Soul Fire', spellId: 17924, icon: 'spell_fire_fireball02', key: 'R', school: 'fire', castTime: 6, cd: 60, cost: 335, base: 438.6, variance: 0.2247, coef: 1, shard: true, gcd: true, spell: true },
  // 17926 (Rank 3): instant, 2 min, 600 mana: 460 + 21.4%.
  deathCoil: { name: 'Death Coil', spellId: 17926, icon: 'spell_shadow_deathcoil', key: 'F', school: 'shadow', cost: 600, cd: 120, base: 460, coef: 0.214, gcd: true, spell: true },
  // 1311680 (Rank 4): instant, 200 mana: the target takes 10% more magic damage for 5 min.
  curseOfElements: { name: 'Curse of the Elements', spellId: 1311680, icon: 'spell_shadow_chilltouch', key: 'T', school: 'shadow', cost: 200, duration: 300, dmg: 0.1, curse: true, gcd: true, spell: true },
  // 18288 (talent): 3 min: the next Bane of Agony deals 50% more.
  amplifyCurse: { name: 'Amplify Curse', spellId: 18288, icon: 'spell_shadow_contagion', key: 'G', cost: 0, cd: 180, duration: 30, talent: 'amplifyCurse' },
  // 11689 (Rank 6): 424 + your Spirit of health into as much mana (Improved Life Tap more).
  lifeTap: { name: 'Life Tap', spellId: 11689, icon: 'spell_shadow_burningspirit', key: 'V', cost: 0, base: 424, gcd: true },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  potion: { name: 'Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  conjured: { name: 'Demonic Rune', icon: 'inv_misc_rune_04', key: '0', cost: 0, item: 'conjured' },
  explosive: { name: 'Explosive', icon: 'spell_fire_selfdestruct', key: 'C', cost: 0, item: 'explosive' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};

// The demons, at level 60 (sim/warlock/pets.go): their own stats and what they take from you. The Succubus swings
// for 0.698 of the level 60 creature DPS at 2 s (±21.5%) plus attack power (186 + 17% of your spell damage), and
// casts Lash of Pain (11780: 50 + 42.9%, 12 s, 160 mana). The Imp casts Firebolt (11763: 45.2 + 57.1%, 2 s, 115 mana).
// A demon's spell damage is a tenth of yours (and Demonic Knowledge's), its crit your spell crit, its spell hit yours
// and its melee hit 8/17 of it. Its mana regenerates by a share of your Intellect as mana per 5 sec.
export const CREATURE_DPS = 60.45291519165039;
export const PETS = {
  imp: {
    name: 'Imp', mana: 576 + 264 * 5, mp5PerOwnerInt: 0.3, school: 'fire',
    spell: { id: 'firebolt', name: 'Firebolt', spellId: 11763, icon: 'spell_fire_firebolt', castTime: 2, gcd: 1, cost: 115, base: 45.2, variance: 0.1136, coef: 0.571 },
  },
  succubus: {
    name: 'Succubus', mana: 1066 + 70 * 11.5, mp5PerOwnerInt: 0.1, school: 'shadow',
    melee: { avg: 0.698 * CREATURE_DPS * 2, spread: 0.215, speed: 2, ap: 186, apPerSpellDamage: 0.17 },
    spell: { id: 'lashOfPain', name: 'Lash of Pain', spellId: 11780, icon: 'spell_shadow_curse', cd: 12, gcd: 1.5, cost: 160, base: 50, variance: 0, coef: 0.429 },
  },
};
// Demonic Sacrifice (18788): the demon given up before the fight grants its effect while no summon cancels it: the
// Imp 15% more Shadow damage (Burning Shadow, 18789), the Succubus 15% more Fire damage (Touch of Fire, 18791).
export const SACRIFICE = { imp: { school: 'shadow', dmg: 0.15, name: 'Burning Shadow' }, succubus: { school: 'fire', dmg: 0.15, name: 'Touch of Fire' } };
export const SOUL_SHARDS = 32; // a full Felcloth Bag, as the wowsims builds carry

// Talent reach by spell (the class masks of the wowsims rows).
export const SHADOW_DOTS = new Set(['corruption', 'baneOfAgony', 'siphonLife', 'baneOfDoom', 'wrack']); // Pandemic, Shadow Mastery
export const SHADOW_MASTERY_DIRECT = new Set(['shadowBolt', 'shadowburn', 'deathCoil']);
export const MALEVOLENCE = new Set(['shadowBolt', 'corruption', 'shadowburn', 'baneOfAgony', 'deathCoil', 'siphonLife', 'baneOfDoom', 'wrack']);
export const DESTRUCTION = new Set(['shadowBolt', 'immolate', 'soulFire', 'shadowburn', 'searingPain', 'conflagrate', 'incinerate']); // Ruin, Cataclysm
export const AGONIZING_FLAMES = new Set(['shadowBolt', 'immolate', 'shadowburn', 'searingPain', 'incinerate', 'soulFire', 'conflagrate']);
export const BANE_CAST = new Set(['shadowBolt', 'immolate', 'incinerate']);
export const NIGHTFALL = new Set(['corruption', 'wrack']); // their ticks can bring Shadow Trance
export const WRACK_AMPLIFIES = new Set(['corruption', 'baneOfAgony']);

export const ACTION_BAR = [
  ['shadowBolt', 'incinerate', 'searingPain', 'immolate', 'corruption', 'baneOfAgony', 'baneOfDoom', 'siphonLife', 'wrack', 'conflagrate', 'shadowburn', 'soulFire', 'deathCoil'],
  ['curseOfElements', 'amplifyCurse', 'lifeTap', 'racial', 'trinket1', 'trinket2', 'potion', 'conjured', 'explosive'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  shadowTrance: { name: 'Shadow Trance', icon: 'spell_shadow_twilight' },
  amplifyCurse: { name: 'Amplify Curse', icon: 'spell_shadow_contagion' },
  decimation: { name: 'Decimation', icon: 'spell_fire_fireball02' },
  shadowAndFlameShadow: { name: 'Shadow (Shadow and Flame)', icon: 'spell_shadow_shadowandflame' },
  shadowAndFlameFire: { name: 'Flame (Shadow and Flame)', icon: 'spell_shadow_shadowandflame' },
  sacrifice: { name: 'Demonic Sacrifice', icon: 'spell_shadow_psychicscream' },
};

export const METER_NAMES = { petMelee: 'Melee (demon)', lashOfPain: 'Lash of Pain', firebolt: 'Firebolt', demonicBrand: 'Demonic Brand' };
export const METER_ICONS = { petMelee: 'spell_shadow_summonsuccubus', lashOfPain: 'spell_shadow_curse', firebolt: 'spell_fire_firebolt', demonicBrand: 'spell_fire_soulburn' };
export const THREAT_NAMES = {};

// The wowsims pre-raid set (ui/specs/warlock/dps/gear_sets/preraid.gear.json), worn by every build.
export const GEAR = [
  { id: 16698 }, { id: 22149 }, { id: 16701 }, { id: 272413 }, { id: 14153 }, { id: 16703 }, { id: 16705 }, { id: 16702 },
  { id: 16699 }, { id: 16704 }, { id: 275738 }, { id: 19518 }, { id: 272438 }, { id: 270225 }, { id: 22379 }, { id: 249455 }, { id: 15283 },
];

// The builds' consumables, raid buffs and debuffs. Your own Curse of the Elements replaces the raid's.
export const CONSUMABLES = {
  aff: { flaskId: 13512, foodId: 13931, conjuredId: 12662, explosiveId: 18588, mhImbueId: 20749, offensivePotId: 250937 },
  demo: {
    flaskId: 13512, foodId: 13931, conjuredId: 12662, mhImbueId: 20750, mhWeaponImbueId: 13701, resourcePotId: 13444,
    elixirIds: [250341, 250335, 13454, 250337, 250347], extraIds: [18269, 10309],
  },
};
export const RAID_BUFFS = {
  aff: { arcaneBrilliance: true, giftOfTheWild: true, moonkinAura: true, prayerOfFortitude: true, prayerOfSpirit: true },
  demo: {
    arcaneBrilliance: true, giftOfTheWild: true, graceOfAirTotem: true, leaderOfThePack: true, moonkinAura: true, prayerOfFortitude: true,
    prayerOfSpirit: true, windfuryTotem: true,
  },
};
export const PARTY_BUFFS = { aff: { manaSpringTotem: 1 }, demo: {} };
export const BUFFS = { greaterBlessingOfKings: true, greaterBlessingOfWisdom: true };
export const DEBUFFS = {
  aff: { judgementOfWisdom: true },
  demo: { exposeArmor: true, faerieFire: true, giftOfArthas: true, judgementOfWisdom: true, sunderArmor: true },
};

export const BUILT_IN_BUILDS = [
  { id: 'affliction', name: 'Affliction (Wrack, wowsims)', talents: AFF_TALENTS, playable: true, spec: 'affliction' },
  { id: 'demonology', name: 'Demonology (Fire Brand, wowsims)', talents: DEMO_TALENTS, playable: true, spec: 'demonology' },
  { id: 'destruction', name: 'Destruction (wowsims)', talents: DESTRO_TALENTS, playable: true, spec: 'destruction' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  improvedLifeTap: (p) => `Life Tap gives ${pct(T.improvedLifeTap.mana[p])} more mana.`,
  suppression: (p) => `+${T.suppression.hitPct[p]}% hit with spells.`,
  improvedCorruption: (p) => `Corruption casts ${T.improvedCorruption.cast[p]} sec faster and deals ${pct(T.improvedCorruption.dot[p])} more.`,
  improvedBaneOfAgony: (p) => `Bane of Agony deals ${pct(T.improvedBaneOfAgony.dot[p])} more.`,
  amplifyCurse: () => 'Learn Amplify Curse: your next Bane of Agony deals 50% more.',
  pandemic: (p) => `Your shadow damage over time crits for ${pct(T.pandemic.critBonus[p])} more bonus damage.`,
  malevolence: (p) => `+${T.malevolence.critPct[p]}% crit with your shadow spells and your Succubus\'s Lash of Pain.`,
  nightfall: (p) => `Corruption\'s and Wrack\'s ticks have a ${pct(T.nightfall.chance[p])} chance to make your next Shadow Bolt instant.`,
  siphonLife: () => 'Learn Siphon Life.',
  soulSiphon: (p) => `Wrack deals ${pct(T.soulSiphon.perEffect[p])} more per affliction effect on the target (up to 3).`,
  shadowMastery: (p) => `Shadow Bolt, Shadowburn, Death Coil and your shadow damage over time deal ${pct(T.shadowMastery.direct[p])} more.`,
  wrack: () => 'Learn Wrack: a channel that makes your Corruption and Bane of Agony deal 10% more meanwhile.',
  improvedImp: (p) => `Firebolt deals ${pct(T.improvedImp.firebolt[p])} more.`,
  unholyPower: (p) => `Your demons deal ${pct(T.unholyPower.pet[p])} more damage.`,
  felVitality: (p) => `+${pct(T.felVitality.mana[p])} maximum mana.`,
  demonicEnergies: (p) => `Your demon gains ${pct(T.demonicEnergies.petShare[p])} of the mana your Life Tap gives you.`,
  demonicSacrifice: () => 'Sacrifice your demon: the Imp gives 15% more Shadow damage, the Succubus 15% more Fire damage.',
  decimation: (p) => `Soul Fire recharges ${pct(T.decimation.soulFireCd[p])} faster. Below 35% health Shadow Bolt and Searing Pain deal ${pct(T.decimation.dmg[p])} more and make Soul Fire faster and free of its shard.`,
  demonicBrand: (p) => `Searing Pain brands the target: your demon\'s next ${T.demonicBrand.charges[p]} hits on it deal extra damage.`,
  soulLink: () => 'You and your demon deal 3% more damage.',
  demonicKnowledge: (p) => `You and your demon gain spell damage equal to ${pct(T.demonicKnowledge.spellPowerPerLevel[p])} of your level.`,
  masterDemonologist: (p) => `With the Imp out you and it deal ${pct(T.masterDemonologist.dmg[p])} more Fire damage; with the Succubus, Shadow.`,
  demonicPact: () => 'Demonic Sacrifice\'s effect stays with another demon out.',
  improvedShadowBolt: (p) => `Shadow Bolt\'s crits make the target take ${pct(T.improvedShadowBolt.shadow[p])} more Shadow damage from you for 12 sec.`,
  bane: (p) => `Shadow Bolt, Immolate and Incinerate cast ${T.bane.cast[p]} sec faster, Soul Fire ${T.bane.soulFire[p]} sec.`,
  cataclysm: (p) => `Your Destruction spells cost ${pct(T.cataclysm.cost[p])} less mana.`,
  aftermath: (p) => `Immolate\'s first hit deals ${pct(T.aftermath.immolate[p])} more.`,
  ruin: (p) => `Your Destruction spells crit for ${pct(T.ruin.critBonus[p])} more bonus damage.`,
  shadowburn: () => 'Learn Shadowburn.',
  agonizingFlames: (p) => `Your Destruction spells deal ${pct(T.agonizingFlames.dmg[p])} more; Searing Pain crits ${T.agonizingFlames.searingCrit[p]}% more.`,
  conflagrate: () => 'Learn Conflagrate.',
  fireAndBrimstone: (p) => `Conflagrate crits ${T.fireAndBrimstone.conflagrateCrit[p]}% more.`,
  shadowAndFlame: (p) => `Conflagrate keeps Immolate ${pct(T.shadowAndFlame.keepImmolate[p])} of the time; Conflagrate and Shadowburn raise your Shadow and Fire damage ${pct(T.shadowAndFlame.buff[p])} for 20 sec.`,
  incinerate: () => 'Learn Incinerate.',
};
export const NO_DPS_EFFECT = new Set(['grimReach', 'soulHarvest', 'improvedDrains', 'felConcentration', 'curseOfExhaustion', 'improvedHealthFunnel',
  'demonicEmbrace', 'demonicAegis', 'improvedVoidwalker', 'improvedSayaad', 'masterSummoner', 'felDomination', 'improvedFelhunter',
  'destructiveReach', 'moltenSkin', 'intensity', 'pyroclasm', 'baneOfHavoc']);

export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Potion', icon: 'inv_potion_76' },
    { id: 'conjured', name: 'Demonic Rune', icon: 'inv_misc_rune_04' }, { id: 'explosive', name: 'Explosive', icon: 'spell_fire_selfdestruct' },
  ] },
  { name: 'Affliction', spells: [
    { id: 'corruption', name: 'Corruption', spellId: 25311, icon: 'spell_shadow_abominationexplosion' },
    { id: 'baneOfAgony', name: 'Bane of Agony', spellId: 11713, icon: 'spell_shadow_curseofsargeras' },
    { id: 'baneOfDoom', name: 'Bane of Doom', spellId: 603, icon: 'spell_shadow_auraofdarkness' },
    { id: 'curseOfElements', name: 'Curse of the Elements', spellId: 1311680, icon: 'spell_shadow_chilltouch' },
    { id: 'siphonLife', name: 'Siphon Life', spellId: 18881, icon: 'spell_shadow_requiem', talent: 'siphonLife' },
    { id: 'wrack', name: 'Wrack', spellId: 1316697, icon: 'spell_shadow_lifedrain02', talent: 'wrack' },
    { id: 'amplifyCurse', name: 'Amplify Curse', spellId: 18288, icon: 'spell_shadow_contagion', talent: 'amplifyCurse' },
    { id: 'deathCoil', name: 'Death Coil', spellId: 17926, icon: 'spell_shadow_deathcoil' },
    { id: 'lifeTap', name: 'Life Tap', spellId: 11689, icon: 'spell_shadow_burningspirit' },
  ] },
  { name: 'Destruction', spells: [
    { id: 'shadowBolt', name: 'Shadow Bolt', spellId: 25307, icon: 'spell_shadow_shadowbolt' },
    { id: 'immolate', name: 'Immolate', spellId: 25309, icon: 'spell_fire_immolation' },
    { id: 'searingPain', name: 'Searing Pain', spellId: 17923, icon: 'spell_fire_soulburn' },
    { id: 'soulFire', name: 'Soul Fire', spellId: 17924, icon: 'spell_fire_fireball02' },
    { id: 'incinerate', name: 'Incinerate', spellId: 1293813, icon: 'spell_fire_burnout', talent: 'incinerate' },
    { id: 'conflagrate', name: 'Conflagrate', spellId: 18932, icon: 'spell_fire_fireball', talent: 'conflagrate' },
    { id: 'shadowburn', name: 'Shadowburn', spellId: 18871, icon: 'spell_shadow_scourgebuild', talent: 'shadowburn' },
  ] },
];
