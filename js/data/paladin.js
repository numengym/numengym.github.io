// Paladin data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - spell damage (base points + points per level to 60), coefficients, costs,
//                                            cooldowns; talent rank curves (generatedCurves)
//   sim/paladin/*.go                       - seals, judgements and the other spells
// Not modelled yet (APPROX): Twist of Light's Echoes, Light's Vigil, Vindication, Iron Creed's damage reduction,
// Retribution Aura's damage, Purifying Power.
import { TALENT_TREE_DATA, TALENT_TREES } from './paladin-talent-tree.js';

export { TALENT_TREE_DATA, TALENT_TREES };

export const SPELL_MISS = 0.17;
export const SEAL_DURATION = 30;

export const DEFAULT_TALENTS = '55003003--05225331101330321';

export function parseTalents(str) {
  const out = {};
  const trees = String(str || '').split('-');
  TALENT_TREES.forEach((names, t) => {
    const digits = trees[t] || '';
    names.forEach((name, i) => { out[name] = Number(digits[i] || 0); });
  });
  return out;
}

const curve = (...v) => [0, ...v];
export const TALENT = {
  divineStrength: { str: curve(0.02, 0.04, 0.06, 0.08, 0.1) },             // 20262
  divineIntellect: { int: curve(0.02, 0.04, 0.06, 0.08, 0.1) },            // 20257
  improvedSeals: { more: curve(0.05, 0.1, 0.15) },                         // 20224: the Righteousness, Command and Fury hits and their judgements
  divinePrecision: { hitPct: curve(6, 12, 18) },                           // 1310904: Holy spells' hit
  consecratedGround: { holyTaken: curve(0.05, 0.1) },                      // 1310905: more Holy damage from you on Consecrated ground
  holyPower: { critPct: curve(1, 2, 3, 4, 5), shockCritPct: curve(3, 6, 9, 12, 15) }, // 5923: Holy spells; Holy Shock / Holy Strike
  precision: { hitPct: curve(1, 2, 3) },                                   // 20189: melee and spell hit
  anticipation: { defense: curve(4, 8, 12, 16, 20) },                      // 20096
  shieldSpecialization: { blockValue: curve(0.1, 0.2, 0.3), manaChance: curve(0.33, 0.66, 1), mana: 0.04, icd: 3 }, // 20150: blocks restore mana
  sacredDuty: { sta: curve(0.02, 0.04) },                                   // 1224697: more Stamina
  reckoning: { blockChance: curve(0.08, 0.16, 0.24, 0.32, 0.4), critChance: curve(0.2, 0.4, 0.6, 0.8, 1), icd: 1.5, max: 4 }, // 20177: extra attacks
  improvedSealOfFury: { mana: 60, perLevel: 0.15, maxLevels: 3 },          // 1314103: the Seal of Fury shield breaking restores mana
  onehandedWeaponSpecialization: { dmg: curve(0.03, 0.07, 0.1) },          // 20196: with a one-hander
  twohandedWeaponSpecialization: { dmg: curve(0.02, 0.04, 0.06) },         // 20111: with a two-hander
  improvedJudgement: { cd: curve(1, 2) },                                  // 25956: Judgement's cooldown
  conviction: { critPct: curve(1, 2, 3, 4, 5) },                           // 20117: weapon crit
  championOfTheLight: { intToSp: curve(0.2, 0.4, 0.6) },                   // 1311084: Intellect as spell damage
  improvedSealOfTheCrusader: { more: curve(0.05, 0.1, 0.15) },             // 20335-20337: Seal and Judgement of the Crusader
  benediction: { cost: curve(0.02, 0.04, 0.06, 0.08, 0.1) },               // 20101: less mana for your spells
  holyConduit: { cost: curve(0.2, 0.4) },                                  // 1237268: Consecration, Hammer of Wrath, Exorcism
  reverence: { casting: curve(0.1, 0.2, 0.3) },                            // 1310899: mana regen while casting
  sacredArbiter: { holyStrike: 0.2 },                                      // 1311087: Holy Strike damage
  sanctifiedJudgement: { chance: curve(0.33, 0.66, 1), refund: curve(0.2, 0.4, 0.6) }, // 1311074: Judgement refunds the seal's mana
  vengeance: { dmg: curve(0.01, 0.02, 0.03), stacks: 3, duration: 30 },   // 20049 / 20050: a stack per crit, Holy and physical damage
};

// Holy damage done (the school), and the two weapon specializations.
export const WEAPON_2H_NORM = 3.3;
export const WEAPON_1H_NORM = 2.4;

// Abilities. Seals last 30 s and one is up at a time; Judgement unleashes the seal's judgement and keeps the seal.
export const ABILITIES = {
  // 20293 (Rank 8): each white hit deals Holy damage: 1880 / 100 x weapon speed x 1.2 (two-hander; one-hander 0.85
  // less 0.2 per second under 2.0) + 12% (10%) of spell power. Judgement of Righteousness 20286: 178 + 42.9%.
  sealOfRighteousness: { name: 'Seal of Righteousness', spellId: 20293, icon: 'ability_thunderbolt', key: '4', cost: 200, gcd: true, seal: true, perHit: 1880,
    judge: { name: 'Judgement of Righteousness', key: 'judgementOfRighteousness', base: 178.2, variance: 0.094, coef: 0.429 } },
  // 20920 (Rank 5, talent): 7 procs a minute (1 s apart) off white hits: 70% of a weapon hit + 29% of spell power, Holy.
  // Judgement of Command 20966: 356 (half on a target that is not stunned) + 42.9%.
  sealOfCommand: { name: 'Seal of Command', spellId: 20920, icon: 'ability_warrior_innerrage', key: '3', cost: 210, gcd: true, seal: true, talent: 'sealOfCommand',
    ppm: 7, icd: 1, weapon: 0.7, coef: 0.29, judge: { name: 'Judgement of Command', key: 'judgementOfCommand', base: 178, variance: 0.0955, coef: 0.429 } },
  // 20308 (Rank 6): +325 attack power and 40% attack speed (swings 40% weaker); Judgement of the Crusader 20303: the
  // target takes 161 more Holy damage per hit for 40 s.
  sealOfTheCrusader: { name: 'Seal of the Crusader', spellId: 20308, icon: 'spell_holy_holysmite', key: '5', cost: 160, gcd: true, seal: true, ap: 325.2, speed: 1.4,
    judge: { name: 'Judgement of the Crusader', key: 'judgementOfTheCrusader', holyTaken: 161, duration: 40 } },
  // 20423 (Rank 7): each white hit deals 35 + 10% of spell power Holy (with a shield, half of it as an absorb shield);
  // Judgement of Fury 20414: 160 + 42.9%, and taunts.
  sealOfFury: { name: 'Seal of Fury', spellId: 20423, icon: 'spell_holy_sealoffury', key: '4', cost: 200, gcd: true, seal: true, procBase: 35, procCoef: 0.1, shieldShare: 0.5,
    judge: { name: 'Judgement of Fury', key: 'judgementOfFury', base: 160.4, variance: 0.0876, coef: 0.429, taunt: true } },
  // 20271: 10 s cooldown (less with Improved Judgement), 6% of base mana, 10 yards, off the global cooldown.
  judgement: { name: 'Judgement', spellId: 20271, icon: 'spell_holy_righteousfury', key: '1', costPct: 0.06, cd: 10, range: 10 },
  // 1310994 (talent): 1 min, off the global cooldown: Judgement is ready again and the next one is free.
  swiftJudgement: { name: 'Swift Judgement', spellId: 1310994, icon: 'ability_paladin_swiftretribution', key: 'R', cost: 0, cd: 60, talent: 'swiftJudgement' },
  // 10333 (Rank 8): 10 s cooldown, 20 mana: (93 +/- 25% + normalized weapon damage + 42.9% of spell power) x 50%, Holy,
  // on the melee table.
  holyStrike: { name: 'Holy Strike', spellId: 10333, icon: 'spell_holy_improvedresistanceauras', key: '2', cost: 20, cd: 10, gcd: true, melee: true, base: 93, variance: 0.25, coef: 0.429, weapon: 0.5 },
  // 20924 (Rank 5): 8 s cooldown, 565 mana: 8 ticks a second apart of 12, and 27 + 4.2% of spell power to the main
  // target; Consecrated Ground raises your Holy damage on it.
  consecration: { name: 'Consecration', spellId: 20924, icon: 'spell_holy_innerfire', key: 'F', cost: 565, cd: 8, gcd: true, ticks: 8, tick: 12, markTick: 27, coef: 0.042, range: 8 },
  // 20930 (Rank 4, talent; its damage spell 25902, 25903 is the heal): 10 s cooldown, 325 mana: 348 +/- 8% + 42.9% of spell power, Holy, 20 yards.
  holyShock: { name: 'Holy Shock', spellId: 25902, icon: 'spell_holy_searinglight', key: 'Q', cost: 325, cd: 10, gcd: true, base: 348, variance: 0.079, coef: 0.429, range: 20, talent: 'holyShock', spell: true },
  // 10314 (Rank 6): 15 s cooldown, 345 mana: 502 +/- 11% + 42.9% of spell power, Holy, 30 yards.
  exorcism: { name: 'Exorcism', spellId: 10314, icon: 'spell_holy_excorcism_02', key: 'E', cost: 345, cd: 15, gcd: true, base: 502, variance: 0.109, coef: 0.429, range: 30, spell: true, undeadOnly: true },
  // 24239 (Rank 3): 1 s cast, 6 s cooldown, 425 mana, below 20% health: 498 +/- 10% + 42.9% of spell power, Holy.
  hammerOfWrath: { name: 'Hammer of Wrath', spellId: 24239, icon: 'ability_thunderclap', key: 'T', cost: 425, cd: 6, gcd: true, castTime: 1, base: 498, variance: 0.098, coef: 0.429, range: 30, execute: true, spell: true },
  // 20928 (Rank 3, talent): 10 s cooldown, 240 mana: +30% block for 10 s or 4 blocks; each block deals 221 + 8% of
  // spell power Holy to the attacker (20% more threat).
  holyShield: { name: 'Holy Shield', spellId: 20928, icon: 'spell_holy_blessingofprotection', key: 'Z', cost: 240, cd: 10, gcd: true, duration: 10, charges: 4, blockPct: 30, damage: 221, coef: 0.08, talent: 'holyShield' },
  // 25780: 30% of base mana: 90% more threat from Holy damage for 30 min.
  righteousFury: { name: 'Righteous Fury', spellId: 25780, icon: 'spell_holy_sealoffury', key: 'X', costPct: 0.3, gcd: true, duration: 1800, holyThreat: 0.9 },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  // A weapon with a use effect (Manual Crowd Pummeler: +50% attack speed for 30 sec, 3 min cooldown).
  weapon: { name: 'Weapon', icon: 'inv_misc_questionmark', key: 'Shift+7', cost: 0, item: 'weapon' },
  potion: { name: 'Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  conjured: { name: 'Demonic Rune', icon: 'inv_misc_rune_04', key: '0', cost: 0, item: 'conjured' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};
export const SEALS = ['sealOfRighteousness', 'sealOfCommand', 'sealOfTheCrusader', 'sealOfFury'];

export const ACTION_BAR = [
  ['judgement', 'holyStrike', 'sealOfCommand', 'sealOfRighteousness', 'sealOfTheCrusader', 'sealOfFury', 'consecration', 'holyShock', 'exorcism', 'hammerOfWrath', 'holyShield'],
  ['swiftJudgement', 'righteousFury', 'racial', 'trinket1', 'trinket2', 'weapon', 'potion', 'conjured'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  sealOfRighteousness: { name: 'Seal of Righteousness', icon: 'ability_thunderbolt' },
  sealOfCommand: { name: 'Seal of Command', icon: 'ability_warrior_innerrage' },
  sealOfTheCrusader: { name: 'Seal of the Crusader', icon: 'spell_holy_holysmite' },
  sealOfFury: { name: 'Seal of Fury', icon: 'spell_holy_sealoffury' },
  swiftJudgement: { name: 'Swift Judgement', icon: 'ability_paladin_swiftretribution' },
  holyShield: { name: 'Holy Shield', icon: 'spell_holy_blessingofprotection' },
  righteousFury: { name: 'Righteous Fury', icon: 'spell_holy_sealoffury' },
  vengeance: { name: 'Vengeance', icon: 'ability_racial_avatar' },
};

export const METER_NAMES = { sealOfRighteousnessProc: 'Seal of Righteousness', sealOfCommandProc: 'Seal of Command', sealOfFuryProc: 'Seal of Fury', holyShieldProc: 'Holy Shield' };
export const METER_ICONS = {
  sealOfRighteousnessProc: 'ability_thunderbolt', sealOfCommandProc: 'ability_warrior_innerrage', sealOfFuryProc: 'spell_holy_sealoffury',
  judgementOfRighteousness: 'spell_holy_righteousfury', judgementOfCommand: 'spell_holy_righteousfury', judgementOfFury: 'spell_holy_righteousfury',
  holyShieldProc: 'spell_holy_blessingofprotection',
};
export const THREAT_NAMES = { judgementOfTheCrusader: 'Judgement of the Crusader' };

// The wowsims gear sets (ui/specs/paladin/*/gear_sets): Retribution Default, Holy Shock, Protection Default.
export const GEAR = {
  ret: [{ id: 12640, enchant: 2543 }, { id: 22150, enchant: 904 }, { id: 22093 }, { id: 279269, enchant: 849 }, { id: 22089, enchant: 1891 },
    { id: 22088, enchant: 2566 }, { id: 22090, enchant: 8206 }, { id: 22086 }, { id: 22385, enchant: 2543 }, { id: 22087, enchant: 1887 },
    { id: 21182 }, { id: 19325 }, { id: 274759 }, { id: 272437 }, { id: 12784, enchant: 1900 }, {}, { id: 272435 }],
  holyShock: [{ id: 16686 }, { id: 15856, enchant: 8218 }, { id: 16729 }, { id: 18510, enchant: 849 }, { id: 16666, enchant: 1891 },
    { id: 16722, enchant: 2566 }, { id: 16672, enchant: 2617 }, { id: 16723 }, { id: 16687, enchant: 8492 }, { id: 16682, enchant: 8492 },
    { id: 272407 }, { id: 272406 }, { id: 270225 }, { id: 272437 }, { id: 9449, enchant: 8211 }, {}, { id: 272435 }],
  prot: [{ id: 250599 }, { id: 275736 }, { id: 272745 }, { id: 18413 }, { id: 250595 }, { id: 16722 }, { id: 279264 }, { id: 22086 },
    { id: 12619 }, { id: 279263 }, { id: 15855 }, { id: 272409 }, { id: 19024 }, { id: 272440 }, { id: 17016 }, { id: 18168 }, { id: 23203 }],
};

// The wowsims DefaultConsumables, buffs and debuffs (presets.ts), as far as the trainer has them.
export const CONSUMABLES = {
  ret: { flaskId: 13512, conjuredId: 12662, elixirIds: [13452, 13454, 250338, 12460], mhImbueId: 20749 },
  prot: { flaskId: 13512, conjuredId: 12662, mhImbueId: 20749, elixirIds: [13454, 250338, 250335, 250350, 13452] },
};
export const RAID_BUFFS = { prayerOfSpirit: true, arcaneBrilliance: true, giftOfTheWild: true, prayerOfFortitude: true, strengthOfEarthTotem: true,
  windfuryTotem: true, battleShout: 1, leaderOfThePack: true };
export const PARTY_BUFFS = { manaSpringTotem: 1 };
export const BUFFS = { greaterBlessingOfKings: true, greaterBlessingOfWisdom: true, greaterBlessingOfMight: true };
export const DEBUFFS = { curseOfElements: true, judgementOfWisdom: true, curseOfRecklessness: true, sunderArmor: true, faerieFire: true };

export const BUILT_IN_BUILDS = [
  { id: 'twist', name: 'Retribution: Twist of Light talents (wowsims preset)', talents: '55003003--05225331101330321', playable: true, spec: 'retribution',
    note: 'Twist of Light is not modelled: the trainer plays Seal of Command and judges' },
  { id: 'holy-shock', name: 'Holy Shock (wowsims preset)', talents: '550030032101012--052252300012303', playable: true, spec: 'holyShock' },
  { id: 'prot', name: 'Protection (wowsims preset)', talents: '50003-0530313321301531-5022', playable: true, spec: 'protPaladin' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  divineStrength: (p) => `+${pct(T.divineStrength.str[p])} Strength.`,
  divineIntellect: (p) => `+${pct(T.divineIntellect.int[p])} Intellect.`,
  improvedSeals: (p) => `Seal of Righteousness, Command and Fury and their judgements deal ${pct(T.improvedSeals.more[p])} more damage.`,
  divinePrecision: (p) => `+${T.divinePrecision.hitPct[p]}% hit with Holy spells.`,
  holyShock: () => 'Learn Holy Shock.',
  consecratedGround: (p) => `Your Holy damage on a target in your Consecration is ${pct(T.consecratedGround.holyTaken[p])} higher.`,
  holyPower: (p) => `+${T.holyPower.critPct[p]}% crit with Holy spells; +${T.holyPower.shockCritPct[p]}% with Holy Shock and Holy Strike.`,
  precision: (p) => `+${T.precision.hitPct[p]}% hit with melee attacks and spells.`,
  anticipation: (p) => `+${T.anticipation.defense[p]} defense.`,
  onehandedWeaponSpecialization: (p) => `${pct(T.onehandedWeaponSpecialization.dmg[p])} more damage with a one-handed weapon.`,
  twohandedWeaponSpecialization: (p) => `${pct(T.twohandedWeaponSpecialization.dmg[p])} more damage with a two-handed weapon.`,
  swiftJudgement: () => 'Learn Swift Judgement: Judgement is ready again and the next one is free.',
  holyShield: () => 'Learn Holy Shield.',
  improvedJudgement: (p) => `Judgement's cooldown is ${T.improvedJudgement.cd[p]} sec shorter.`,
  conviction: (p) => `+${T.conviction.critPct[p]}% crit with weapons.`,
  sealOfCommand: () => 'Learn Seal of Command.',
  championOfTheLight: (p) => `${pct(T.championOfTheLight.intToSp[p])} of your Intellect as spell damage.`,
  benediction: (p) => `Your spells cost ${pct(T.benediction.cost[p])} less mana.`,
  holyConduit: (p) => `Consecration, Hammer of Wrath and Exorcism cost ${pct(T.holyConduit.cost[p])} less mana.`,
  reverence: (p) => `${pct(T.reverence.casting[p])} of your mana regeneration continues while casting.`,
  sacredArbiter: () => 'Holy Strike deals 20% more damage.',
  sanctifiedJudgement: (p) => `Judgement has a ${pct(T.sanctifiedJudgement.chance[p])} chance to refund ${pct(T.sanctifiedJudgement.refund[p])} of your seal's mana.`,
  shieldSpecialization: (p) => `Your shield blocks ${pct(T.shieldSpecialization.blockValue[p])} more; blocks have a ${pct(T.shieldSpecialization.manaChance[p])} chance to restore 4% of your mana (once every 3 sec).`,
  reckoning: (p) => `A block (${pct(T.reckoning.blockChance[p])}) or a critical hit taken (${pct(T.reckoning.critChance[p])}) stores an extra attack for your next swing, up to 4.`,
  improvedSealOfFury: () => 'When the Seal of Fury shield breaks you gain 87 mana (60, +45% against a boss).',
  sacredDuty: (p) => `+${pct(T.sacredDuty.sta[p])} Stamina.`,
  vengeance: (p) => `Each critical strike gives you ${pct(T.vengeance.dmg[p])} more damage for 30 sec, stacking 3 times.`,
};
export const NO_DPS_EFFECT = new Set(['healingLight', 'spiritualFocus', 'unyieldingFaith', 'voiceOfTruth', 'purifyingPower', 'infusionOfLight',
  'illumination', 'divineFavor', 'toughness', 'redoubt', 'guardiansFavor', 'improvedRighteousFury',
  'improvedHammerOfJustice', 'templarsBulwark', 'ironCreed', 'deflection', 'vindication',
  'pursuitOfJustice', 'eyeForAnEye', 'repentance', 'instrumentOfLaw', 'twistOfLight', 'lightsVigil']);

export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Potion', icon: 'inv_potion_76' },
    { id: 'conjured', name: 'Demonic Rune', icon: 'inv_misc_rune_04' },
  ] },
  { name: 'Holy', spells: [
    { id: 'sealOfRighteousness', name: 'Seal of Righteousness', spellId: 20293, icon: 'ability_thunderbolt' },
    { id: 'consecration', name: 'Consecration', spellId: 20924, icon: 'spell_holy_innerfire' },
    { id: 'exorcism', name: 'Exorcism', spellId: 10314, icon: 'spell_holy_excorcism_02' },
    { id: 'holyShock', name: 'Holy Shock', spellId: 25902, icon: 'spell_holy_searinglight', talent: 'holyShock' },
  ] },
  { name: 'Protection', spells: [
    { id: 'righteousFury', name: 'Righteous Fury', spellId: 25780, icon: 'spell_holy_sealoffury' },
    { id: 'sealOfFury', name: 'Seal of Fury', spellId: 20423, icon: 'spell_holy_sealoffury' },
    { id: 'swiftJudgement', name: 'Swift Judgement', spellId: 1310994, icon: 'ability_paladin_swiftretribution', talent: 'swiftJudgement' },
    { id: 'holyShield', name: 'Holy Shield', spellId: 20928, icon: 'spell_holy_blessingofprotection', talent: 'holyShield' },
  ] },
  { name: 'Retribution', spells: [
    { id: 'judgement', name: 'Judgement', spellId: 20271, icon: 'spell_holy_righteousfury' },
    { id: 'sealOfTheCrusader', name: 'Seal of the Crusader', spellId: 20308, icon: 'spell_holy_holysmite' },
    { id: 'holyStrike', name: 'Holy Strike', spellId: 10333, icon: 'spell_holy_improvedresistanceauras' },
    { id: 'hammerOfWrath', name: 'Hammer of Wrath', spellId: 24239, icon: 'ability_thunderclap' },
    { id: 'sealOfCommand', name: 'Seal of Command', spellId: 20920, icon: 'ability_warrior_innerrage', talent: 'sealOfCommand' },
  ] },
];
