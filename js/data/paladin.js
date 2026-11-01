// Paladin data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - spell damage (base points + points per level to 60), coefficients, costs,
//                                            cooldowns; talent rank curves (generatedCurves)
//   sim/paladin/*.go                       - seals, judgements and the other spells
// The talents are those of hotfix push 113554 (wowsims PR 772 and its follow-ups 1d8af322, a820f598), which reworked the
// tree: Unsealed Wrath took Twist of Light's place, Swift Judgement became a second Judgement, Conviction crits with
// everything, and Instrument of Law, One-Handed Weapon Specialization, Improved Seal of Fury and Voice of Truth left it.
// Not modelled (APPROX): Vindication, Toughness, Eye for an Eye, Shieldsworn's
// spell block (the trainer's bosses swing physical), and the talents for effects the trainer has none of (Turn Evil,
// Stoicism, Unyielding Faith, Guardian's Favor, Pursuit of Justice, Sacred Duty, Improved Hammer of Justice).
import { TALENT_TREE_DATA, TALENT_TREES } from './paladin-talent-tree.js';

export { TALENT_TREE_DATA, TALENT_TREES };

export const SPELL_MISS = 0.17;
export const SEAL_DURATION = 30;

export const DEFAULT_TALENTS = '050250002-501-05233011201301351';

export function parseTalents(str) {
  const out = {};
  const trees = String(str || '').split('-');
  TALENT_TREES.forEach((names, t) => {
    const digits = trees[t] || '';
    names.forEach((name, i) => { out[name] = Number(digits[i] || 0); });
  });
  return out;
}

// The tree before hotfix push 113554 (wowsims PR 772). A talent string saved before then reads by this order:
// oldPaladinTalents moves each talent's ranks by name (capped at its new maximum; Twist of Light is Unsealed Wrath now,
// the same spell 1310735), drops the removed ones, and returns null when the result breaks the new tree's rules (a row
// opens after 5 points per row above it, a prerequisite must be maxed, 51 points at most), as most do: the caller then
// falls back to the spec's default.
const OLD_TALENT_TREES = [
  ['divineStrength', 'divineIntellect', 'healingLight', 'spiritualFocus', 'improvedSeals', 'unyieldingFaith', 'voiceOfTruth', 'reverence',
    'purifyingPower', 'infusionOfLight', 'illumination', 'divineFavor', 'divinePrecision', 'holyShock', 'consecratedGround', 'holyPower', 'lightsVigil'],
  ['toughness', 'redoubt', 'precision', 'guardiansFavor', 'anticipation', 'improvedSealOfFury', 'improvedRighteousFury', 'shieldSpecialization',
    'sacredDuty', 'swiftJudgement', 'onehandedWeaponSpecialization', 'improvedHammerOfJustice', 'templarsBulwark', 'reckoning', 'ironCreed', 'holyShield'],
  ['deflection', 'benediction', 'improvedJudgement', 'holyConduit', 'conviction', 'vindication', 'sanctifiedJudgement', 'sealOfCommand',
    'pursuitOfJustice', 'eyeForAnEye', 'sacredArbiter', 'twohandedWeaponSpecialization', 'vengeance', 'repentance', 'championOfTheLight',
    'instrumentOfLaw', 'twistOfLight'],
];
const RENAMED = { twistOfLight: 'unsealedWrath' };
export function oldPaladinTalents(str) {
  const ranks = {};
  String(str || '').split('-').forEach((digits, t) => (OLD_TALENT_TREES[t] || []).forEach((name, i) => { ranks[RENAMED[name] || name] = Number(digits[i] || 0); }));
  const next = TALENT_TREE_DATA.map((tree) => tree.talents.map((x) => Math.min(ranks[x.key] || 0, x.max)));
  let total = 0;
  for (const [t, tree] of TALENT_TREE_DATA.entries()) {
    for (const [i, x] of tree.talents.entries()) {
      const r = next[t][i];
      total += r;
      if (!r) continue;
      const above = tree.talents.reduce((s, y, j) => s + (y.row < x.row ? next[t][j] : 0), 0);
      const p = x.prereq ? tree.talents.findIndex((y) => y.row === x.prereq[0] && y.col === x.prereq[1]) : -1;
      if (above < x.row * 5 || (p >= 0 && next[t][p] < tree.talents[p].max)) return null;
    }
  }
  if (total > 51) return null;
  return next.map((r) => r.join('').replace(/0+$/, '')).join('-').replace(/-+$/, '');
}
// The paladin talent strings wowsims shipped before the rework (the old presets): a character still on one of these
// takes its spec's new default rather than a migrated copy of an old build.
export const OLD_PRESET_TALENTS = new Set(['55003003--05225331101330321', '550030032101012--052252300012303', '50003-0530313321301531-5022']);

// Talent values per rank: the wowsims rank curves (sim/core/spelldata/spells_auto_gen.go generatedCurves), index = rank.
const curve = (...v) => [0, ...v];
export const TALENT = {
  // Holy
  spiritualFocus: { pushback: curve(0.14, 0.28, 0.42, 0.56, 0.7) },        // 20205: Holy Light and Flash of Light keep their cast time
  divineStrength: { str: curve(0.02, 0.04, 0.06, 0.08, 0.1) },             // 20262
  healingLight: { heal: curve(0.04, 0.08, 0.12) },                         // 20237: Holy Light, Flash of Light and Holy Shock heal more
  reverence: { casting: curve(0.15, 0.3) },                                // 1310899: mana regen while casting
  // 20224: the Righteousness and Fury hits and the damaging judgements (SpellMod_DirectDamageDone_Pct), and the
  // Seal of Command proc through its weapon percent (registerSealOfCommand).
  improvedSeals: { more: curve(0.03, 0.06, 0.09, 0.12, 0.15) },
  purifyingPower: { cd: curve(0.17, 0.33) },                               // 429144: Exorcism's and Holy Wrath's cooldown (and Cleanse's cost)
  holyConduit: { cost: curve(0.2, 0.4) },                                  // 1237268: Consecration, Holy Wrath, Exorcism, Hammer of Wrath
  divinePrecision: { hitPct: curve(4, 8) },                                // 1310904: Holy spells' hit (effect 1; the silence cut is not read)
  consecratedGround: { holyTaken: curve(0.05, 0.1) },                      // 1310905: more Holy damage from you on Consecrated ground
  // 1328550: Holy Shock's heal crits more often on an ally without your Oath of Light.
  boundlessLight: { critPct: curve(15, 30) },
  // 5923: A_MOD_CRITICAL_HEALING_AMOUNT on the heals (SpellMod_CritMultiplier_Pct): it scales the whole critical heal,
  // the 150% included, so 5/5 makes a heal crit 225%. No crit chance any more.
  holyPower: { critHeal: curve(0.1, 0.2, 0.3, 0.4, 0.5) },
  // 20210: a critical Holy Light, Flash of Light or Holy Shock heal can give back half its base cost (Light's Vigil's
  // party heal, a triggered spell, costs nothing to give back).
  illumination: { chance: curve(0.2, 0.4, 0.6, 0.8, 1), refund: 0.5 },
  // 426065: a Holy Shock or Flash of Light crit makes your next Holy Light within 15 sec 0.5/1 sec faster.
  infusionOfLight: { cast: curve(0.5, 1), duration: 15 },
  // Protection
  divineIntellect: { int: curve(0.02, 0.04, 0.06, 0.08, 0.1) },            // 20257
  precision: { hitPct: curve(1, 2, 3) },                                   // 20189: melee and spell hit
  // 20127: a melee swing on you has a 10% chance to give +6-30% block for 10 sec or 5 blocks (20128).
  redoubt: { chance: 0.1, block: curve(6, 12, 18, 24, 30), duration: 10, charges: 5 },
  // 20150: block value 15/30%, and blocks restore 4% of your mana at 50/100%, once every 3 sec (1310925).
  shieldSpecialization: { blockValue: curve(0.15, 0.3), manaChance: curve(0.5, 1), mana: 0.04, icd: 3 },
  // 20468: with Righteous Fury up, 3/6/9% less damage taken (its row reads -3/-6/-9, MultiplierAt).
  improvedRighteousFury: { taken: curve(0.03, 0.06, 0.09) },
  anticipation: { defense: curve(4, 8, 12, 16, 20) },                      // 20096
  reckoning: { blockChance: curve(0.08, 0.16, 0.24, 0.32, 0.4), critChance: curve(0.2, 0.4, 0.6, 0.8, 1), icd: 1.5, max: 4 }, // 20177: extra attacks
  // 1311034: Holy Strike's threat +10/20/30%; a Holy Strike with Righteous Fury up (whatever its outcome) puts up
  // 1311033, 2/4/6% less damage taken for 6 sec.
  ironCreed: { holyStrikeThreat: curve(0.1, 0.2, 0.3), taken: curve(0.02, 0.04, 0.06), duration: 6 },
  // 1328544: Holy Strike's cooldown 4 sec shorter; a Holy Strike that lands with a shield on deals Holy Shield's damage
  // (no charge spent) and rolls Shield Specialization's mana (no cooldown), and spell block for 6 sec (1328551).
  shieldsworn: { holyStrikeCd: 4, spellBlock: 6 },
  // Retribution
  improvedJudgement: { cd: curve(1, 2) },                                  // 25956: Judgement's cooldown
  conviction: { critPct: curve(2, 4, 6) },                                 // 20117: A_MOD_CRIT_PCT with a weapon on: every spell and attack
  benediction: { cost: curve(0.02, 0.04, 0.06, 0.08, 0.1) },               // 20101: less mana for your spells
  sacredArbiter: { holyStrike: 0.2 },                                      // 1311087: Holy Strike damage
  sanctifiedJudgement: { chance: curve(0.33, 0.66, 1), refund: curve(0.2, 0.4, 0.6) }, // 1311074: Judgement refunds the seal's mana
  // 20111, with a two-hander: physical damage +2/4/6% (and, a melee-weapon row, the melee-defense Holy hits: the seals'
  // procs, the judgements, Holy Strike), and all threat -7/14/20%.
  twohandedWeaponSpecialization: { dmg: curve(0.02, 0.04, 0.06), threat: curve(0.07, 0.14, 0.2) },
  vengeance: { dmg: curve(0.01, 0.02, 0.03), stacks: 3, duration: 30 },   // 20049 / 20050: a stack per crit, Holy and physical damage
  // 1311084: 12-60% of Intellect as spell damage, and Hammer of Wrath's cast 0.2-1.0 sec shorter.
  championOfTheLight: { intToSp: curve(0.12, 0.24, 0.36, 0.48, 0.6), hammerCast: curve(0.2, 0.4, 0.6, 0.8, 1) },
  improvedSealOfTheCrusader: { more: curve(0.05, 0.1, 0.15) },             // 20335-20337 (no longer in the tree): Seal and Judgement of the Crusader
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
  sealOfFury: { name: 'Seal of Fury', spellId: 20423, icon: 'spell_holy_retributionaura', key: '4', cost: 200, gcd: true, seal: true, procBase: 35, procCoef: 0.1, shieldShare: 0.5,
    judge: { name: 'Judgement of Fury', key: 'judgementOfFury', base: 160.4, variance: 0.0876, coef: 0.429, taunt: true } },
  // 20271: 10 s cooldown (less with Improved Judgement), 6% of base mana, 10 yards, off the global cooldown.
  judgement: { name: 'Judgement', spellId: 20271, icon: 'spell_holy_righteousfury', key: '1', costPct: 0.06, cd: 10, range: 10 },
  // 1310994 (talent, sim/paladin/swift_judgement.go): a second Judgement on its own 1 min cooldown, free and off the
  // global cooldown, 10 yards: it unleashes the active seal's judgement as Judgement does (Sanctified Judgement too).
  swiftJudgement: { name: 'Swift Judgement', spellId: 1310994, icon: 'ability_paladin_judgementred', key: 'R', cost: 0, cd: 60, range: 10, talent: 'swiftJudgement' },
  // 20216 (talent, sim/paladin/divine_favor.go): 2 min, 4% of base mana, off the global cooldown: the next Holy Shock,
  // Holy Light or Flash of Light is a critical one (one charge, spent by the cast). A major cooldown in wowsims.
  divineFavor: { name: 'Divine Favor', spellId: 20216, icon: 'spell_holy_heal', key: '', costPct: 0.04, cd: 120, talent: 'divineFavor' },
  // 10333 (Rank 8): 10 s cooldown, 20 mana: (93 +/- 25% + normalized weapon damage + 42.9% of spell power) x 50%, Holy,
  // on the melee table.
  holyStrike: { name: 'Holy Strike', spellId: 10333, icon: 'classicon_paladin', key: '2', cost: 20, cd: 10, gcd: true, melee: true, base: 93, variance: 0.25, coef: 0.429, weapon: 0.5 },
  // 20924 (Rank 5): 8 s cooldown, 565 mana: 8 ticks a second apart of 12, and 27 + 4.2% of spell power to the main
  // target; Consecrated Ground raises your Holy damage on it.
  consecration: { name: 'Consecration', spellId: 20924, icon: 'spell_holy_innerfire', key: 'F', cost: 565, cd: 8, gcd: true, ticks: 8, tick: 12, markTick: 27, coef: 0.042, range: 8 },
  // 20930 (Rank 4, talent; its damage spell 25902, 25903 is the heal): 10 s cooldown, 325 mana: 348 +/- 8% + 42.9% of spell power, Holy, 20 yards.
  holyShock: { name: 'Holy Shock', spellId: 25902, icon: 'spell_holy_searinglight', key: 'Q', cost: 325, cd: 10, gcd: true, base: 348, variance: 0.079, coef: 0.429, range: 20, talent: 'holyShock', spell: true },
  // 10314 (Rank 6): 15 s cooldown, 345 mana: 502 +/- 11% + 42.9% of spell power, Holy, 30 yards.
  exorcism: { name: 'Exorcism', spellId: 10314, icon: 'spell_holy_excorcism_02', key: 'E', cost: 345, cd: 15, gcd: true, base: 502, variance: 0.109, coef: 0.429, range: 30, spell: true, undeadOnly: true },
  // 24239 (Rank 3): 1 s cast (0.2 s less per rank of Champion of the Light), 6 s cooldown, 425 mana, below 20% health:
  // 498 +/- 10% + 42.9% of spell power, Holy.
  hammerOfWrath: { name: 'Hammer of Wrath', spellId: 24239, icon: 'ability_thunderclap', key: 'T', cost: 425, cd: 6, gcd: true, castTime: 1, base: 498, variance: 0.098, coef: 0.429, range: 30, execute: true, spell: true },
  // 20928 (Rank 3, talent): 10 s cooldown, 195 mana: +30% block for 10 s or 4 blocks; each block deals 153 + 8% of
  // spell power Holy to the attacker (20% more threat). Hotfix 113554 moved the ranks to levels 30 / 40 / 50 with the
  // damage and cost of the rank below; its new Rank 4 (1239570, 221 damage) has no SpellMisc row, so wowsims leaves it
  // out and Rank 3 is the highest (holy_shield.go).
  holyShield: { name: 'Holy Shield', spellId: 20928, icon: 'spell_holy_blessingofprotection', key: 'Z', cost: 195, cd: 10, gcd: true, duration: 10, charges: 4, blockPct: 30, damage: 153, coef: 0.08, talent: 'holyShield' },
  // 25780 (righteous_fury.go, effects 1 and 5): 30% of base mana: 90% more threat from Holy damage and 33% more from
  // everything, for 30 min.
  // 10301 (Rank 5): an aura, free: every swing that lands on you deals 20 Holy damage back, plus 6% of your spell power
  // (wowsims DamageShieldSpellPowerCoefficient: the rows carry none, the game scales it). Never runs out.
  retributionAura: { name: 'Retribution Aura', spellId: 10301, icon: 'spell_holy_auraoflight', key: '', cost: 0, gcd: true, damage: 20, coef: 0.06, paladinAura: true },
  // The other auras, free, one at a time with Retribution Aura: 10293 (Rank 7) +735 armor; 19746 Concentration (35%
  // less pushback, which the trainer has none of); 19896, 19898, 19900 (Rank 3) +60 Shadow, Frost or Fire resistance.
  devotionAura: { name: 'Devotion Aura', spellId: 10293, icon: 'spell_holy_devotionaura', key: '', cost: 0, gcd: true, armor: 735, paladinAura: true },
  concentrationAura: { name: 'Concentration Aura', spellId: 19746, icon: 'spell_holy_mindsooth', key: '', cost: 0, gcd: true, pushback: 35, paladinAura: true },
  shadowResistanceAura: { name: 'Shadow Resistance Aura', spellId: 19896, icon: 'spell_shadow_sealofkings', key: '', cost: 0, gcd: true, resist: 'shadow', amount: 60, paladinAura: true },
  frostResistanceAura: { name: 'Frost Resistance Aura', spellId: 19898, icon: 'spell_frost_wizardmark', key: '', cost: 0, gcd: true, resist: 'frost', amount: 60, paladinAura: true },
  fireResistanceAura: { name: 'Fire Resistance Aura', spellId: 19900, icon: 'spell_fire_sealoffire', key: '', cost: 0, gcd: true, resist: 'fire', amount: 60, paladinAura: true },
  // 10318 (Rank 2): 2 s, 60 s cooldown, 805 mana: 533 + 1.9 x 4 levels, 19%, to every undead and demon within 20 yards.
  holyWrath: { name: 'Holy Wrath', spellId: 10318, icon: 'spell_holy_excorcism', key: '', cost: 805, cd: 60, castTime: 2, gcd: true, base: 540.6, variance: 0.1614, coef: 0.19, radius: 20, spell: true, undeadOnly: true },
  righteousFury: { name: 'Righteous Fury', spellId: 25780, icon: 'spell_holy_sealoffury', key: 'X', costPct: 0.3, gcd: true, duration: 1800, holyThreat: 0.9, allThreat: 0.33 },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  // A weapon with a use effect (Manual Crowd Pummeler: +50% attack speed for 30 sec, 3 min cooldown).
  weapon: { name: 'Weapon', icon: 'inv_misc_questionmark', key: 'Shift+7', cost: 0, item: 'weapon' },
  potion: { name: 'Resource Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  offensivePotion: { name: 'Offensive Potion', icon: 'inv_potion_41', key: '', cost: 0, item: 'offensivePotion' },
  defensivePotion: { name: 'Defensive Potion', icon: 'inv_potion_69', key: '', cost: 0, item: 'defensivePotion' },
  conjured: { name: 'Demonic Rune', icon: 'inv_misc_rune_04', key: '0', cost: 0, item: 'conjured' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};
export const SEALS = ['sealOfRighteousness', 'sealOfCommand', 'sealOfTheCrusader', 'sealOfFury'];
// Unsealed Wrath (1310735, sim/paladin/talents_retribution.go applyUnsealedWrath; it took Twist of Light's place and
// spell id in hotfix 113554): each white hit that lands stores your active seal in that seal's Echo (15 sec, 3 stacks
// at most); a white hit that lands under a different seal spends every stack of every other Echo, each stack giving the
// stored seal its normal chance once more (a Seal of Command copy rolls its 7 PPM but neither checks nor starts the
// 1 sec ICD). Seal of the Crusader has no Echo: it stores nothing but spends the others. No seal cost cut any more.
// Echo of Justice 1311705, of Light 1328198 and of Wisdom 1328206 are for seals the trainer does not have.
export const UNSEALED_WRATH = {
  icon: 'spell_holy_blessedresillience', duration: 15, stacks: 3,
  echoes: { sealOfCommand: 'echoOfCommand', sealOfRighteousness: 'echoOfRighteousness', sealOfFury: 'echoOfFury' },
  ids: { echoOfCommand: 1311703, echoOfRighteousness: 1311704, echoOfFury: 1311701 },
};
// The auras: their own bar at the bottom of the screen.
export const PALADIN_AURAS = ['devotionAura', 'retributionAura', 'concentrationAura', 'shadowResistanceAura', 'frostResistanceAura', 'fireResistanceAura'];

export const ACTION_BAR = [
  ['judgement', 'holyStrike', 'sealOfCommand', 'sealOfRighteousness', 'sealOfTheCrusader', 'sealOfFury', 'consecration', 'holyShock', 'exorcism', 'hammerOfWrath', 'holyShield', 'holyWrath'],
  ['swiftJudgement', 'divineFavor', 'righteousFury', 'racial', 'trinket1', 'trinket2', 'weapon', 'potion', 'offensivePotion', 'defensivePotion', 'conjured'],
  PALADIN_AURAS,
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  sealOfRighteousness: { name: 'Seal of Righteousness', icon: 'ability_thunderbolt' },
  sealOfCommand: { name: 'Seal of Command', icon: 'ability_warrior_innerrage' },
  sealOfTheCrusader: { name: 'Seal of the Crusader', icon: 'spell_holy_holysmite' },
  sealOfFury: { name: 'Seal of Fury', icon: 'spell_holy_retributionaura' },
  echoOfCommand: { name: 'Echo of Command', icon: 'ability_warrior_innerrage' },
  echoOfRighteousness: { name: 'Echo of Righteousness', icon: 'ability_thunderbolt' },
  echoOfFury: { name: 'Echo of Fury', icon: 'spell_holy_retributionaura' },
  divineFavor: { name: 'Divine Favor', icon: 'spell_holy_heal' },
  infusionOfLight: { name: 'Infusion of Light', icon: 'ability_paladin_infusionoflight' },
  ironCreed: { name: 'Iron Creed', icon: 'spell_holy_improvedresistanceauras' },
  holyShield: { name: 'Holy Shield', icon: 'spell_holy_blessingofprotection' },
  redoubt: { name: 'Redoubt', icon: 'ability_defend' },
  righteousFury: { name: 'Righteous Fury', icon: 'spell_holy_sealoffury' },
  retributionAura: { name: 'Retribution Aura', icon: 'spell_holy_auraoflight' },
  devotionAura: { name: 'Devotion Aura', icon: 'spell_holy_devotionaura' },
  concentrationAura: { name: 'Concentration Aura', icon: 'spell_holy_mindsooth' },
  shadowResistanceAura: { name: 'Shadow Resistance Aura', icon: 'spell_shadow_sealofkings' },
  frostResistanceAura: { name: 'Frost Resistance Aura', icon: 'spell_frost_wizardmark' },
  fireResistanceAura: { name: 'Fire Resistance Aura', icon: 'spell_fire_sealoffire' },
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
// Holy Shock keeps the Manual Crowd Pummeler (9449), wowsims' item swap set since 94726ad0 (main set: Shin Blade, 15257).
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
  // Retribution: Major Mana Potion as the resource potion since PR 772 (presets.ts DefaultConsumables resourcePotId);
  // Shadow Oil since e37d1eeb.
  ret: { flaskId: 13512, conjuredId: 12662, elixirIds: [13452, 13454, 250338, 12460], mhImbueId: 3824, resourcePotId: 13444 },
  // Holy Shock (HolyShockConsumables): since 94726ad0 the Manual Crowd Pummeler is the item swap set, equipped before the
  // pull, with Frost Oil (swapMhImbueId), and Shin Blade the main set with the inherited Shadow Oil (b2423723). The
  // trainer leaves the swap out and keeps the Pummeler on all fight, so it carries the Pummeler's Frost Oil.
  holyShock: { flaskId: 13512, conjuredId: 12662, elixirIds: [13452, 13454, 250338, 12460], mhImbueId: 3829, resourcePotId: 13444 },
  prot: { flaskId: 13512, conjuredId: 12662, mhImbueId: 20749, elixirIds: [13454, 250338, 250335, 250350, 13452] },
  // Holy (holy/presets.ts): Soaring Pamplona and Major Mana Potion, no oil.
  holy: { foodId: 250066, resourcePotId: 13444 },
};
export const RAID_BUFFS = { prayerOfSpirit: true, arcaneBrilliance: true, giftOfTheWild: true, prayerOfFortitude: true, strengthOfEarthTotem: true,
  windfuryTotem: true, graceOfAirTotem: true, battleShout: 1, leaderOfThePack: true }; // Grace of Air Totem since PR 772, both presets
export const PARTY_BUFFS = { manaSpringTotem: 1 };
export const BUFFS = { greaterBlessingOfKings: true, greaterBlessingOfWisdom: true, greaterBlessingOfMight: true };
export const DEBUFFS = {
  curseOfElements: true, judgementOfLight: true, judgementOfWisdom: true, curseOfRecklessness: true, sunderArmor: true, faerieFire: true, exposeArmor: true,
};

// The wowsims preset talents (ui/specs/paladin/*/presets.ts and the Holy standard of PR 772), rebuilt for the tree of
// hotfix push 113554.
export const BUILT_IN_BUILDS = [
  { id: 'unsealed-wrath', name: 'Retribution: Unsealed Wrath talents (wowsims preset)', talents: '050250002-501-05233011201301351', playable: true, spec: 'retribution',
    note: 'Unsealed Wrath: three swings under Seal of Command store three Echoes of it, then one under Seal of Righteousness spends them all' },
  { id: 'holy-shock', name: 'Holy Shock (wowsims preset)', talents: '05025210221021--0523330110130033', playable: true, spec: 'holyShock' },
  { id: 'prot', name: 'Protection (wowsims preset)', talents: '050050002-05302102213301531-502', playable: true, spec: 'protPaladin' },
  { id: 'holy', name: 'Holy (wowsims preset)', talents: '55320015022101251-503020005001', playable: true, spec: 'holyPaladin' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  // Holy
  spiritualFocus: (p) => `Holy Light and Flash of Light have a ${pct(T.spiritualFocus.pushback[p])} chance not to lose casting time when you take damage.`,
  divineStrength: (p) => `+${pct(T.divineStrength.str[p])} Strength.`,
  healingLight: (p) => `Holy Light, Flash of Light and Holy Shock heal ${pct(T.healingLight.heal[p])} more.`,
  reverence: (p) => `${pct(T.reverence.casting[p])} of your mana regeneration continues while casting.`,
  improvedSeals: (p) => `Your seals and judgements deal ${pct(T.improvedSeals.more[p])} more damage.`,
  purifyingPower: (p) => `Exorcism's and Holy Wrath's cooldowns are ${pct(T.purifyingPower.cd[p])} shorter.`,
  divineFavor: () => 'Learn Divine Favor: your next Holy Shock, Holy Light or Flash of Light is a critical one (2 min cooldown).',
  holyConduit: (p) => `Consecration, Holy Wrath, Exorcism and Hammer of Wrath cost ${pct(T.holyConduit.cost[p])} less mana.`,
  divinePrecision: (p) => `+${T.divinePrecision.hitPct[p]}% hit with Holy spells.`,
  oathOfLight: () => 'Learn Oath of Light: on one ally for 5 min, your Holy Light heals them 400 more, Flash of Light 115 and Holy Shock 230.',
  consecratedGround: (p) => `Your Holy damage on a target in your Consecration is ${pct(T.consecratedGround.holyTaken[p])} higher.`,
  holyShock: () => 'Learn Holy Shock.',
  boundlessLight: (p) => `+${T.boundlessLight.critPct[p]}% crit for Holy Shock's heal on an ally without your Oath of Light.`,
  illumination: (p) => `A critical Holy Light, Flash of Light or Holy Shock heal has a ${pct(T.illumination.chance[p])} chance to give back half its base mana cost.`,
  infusionOfLight: (p) => `A critical Holy Shock or Flash of Light makes your next Holy Light within 15 sec ${T.infusionOfLight.cast[p]} sec faster to cast.`,
  holyPower: (p) => `Your critical heals heal ${pct(T.holyPower.critHeal[p])} more (a crit heals ${pct(1.5 * (1 + T.holyPower.critHeal[p]))}).`,
  lightsVigil: () => 'Learn Light\'s Vigil: on an ally for 30 sec; your next Holy Shock on them has no cooldown and heals their party for 704.',
  // Protection
  divineIntellect: (p) => `+${pct(T.divineIntellect.int[p])} Intellect.`,
  precision: (p) => `+${T.precision.hitPct[p]}% hit with melee attacks and spells.`,
  redoubt: (p) => `A melee swing on you has a 10% chance to give you +${T.redoubt.block[p]}% block for 10 sec or 5 blocks.`,
  shieldSpecialization: (p) => `Your shield blocks ${pct(T.shieldSpecialization.blockValue[p])} more; blocks have a ${pct(T.shieldSpecialization.manaChance[p])} chance to restore 4% of your mana (once every 3 sec).`,
  swiftJudgement: () => 'Learn Swift Judgement: a second Judgement on its own 1 min cooldown, free and off the global cooldown.',
  improvedRighteousFury: (p) => `While Righteous Fury is active you take ${pct(T.improvedRighteousFury.taken[p])} less damage.`,
  anticipation: (p) => `+${T.anticipation.defense[p]} defense.`,
  holyShield: () => 'Learn Holy Shield.',
  reckoning: (p) => `A block (${pct(T.reckoning.blockChance[p])}) or a critical hit taken (${pct(T.reckoning.critChance[p])}) stores an extra attack for your next swing, up to 4.`,
  ironCreed: (p) => `Holy Strike makes ${pct(T.ironCreed.holyStrikeThreat[p])} more threat; with Righteous Fury up it also cuts your damage taken by ${pct(T.ironCreed.taken[p])} for 6 sec.`,
  shieldsworn: () => 'Holy Strike\'s cooldown is 4 sec shorter, and with a shield on it triggers Holy Shield\'s damage (no charge spent) and Shield Specialization\'s mana.',
  // Retribution
  improvedJudgement: (p) => `Judgement's cooldown is ${T.improvedJudgement.cd[p]} sec shorter.`,
  conviction: (p) => `+${T.conviction.critPct[p]}% crit with every spell and attack.`,
  benediction: (p) => `Your spells cost ${pct(T.benediction.cost[p])} less mana.`,
  sanctifiedJudgement: (p) => `Judgement has a ${pct(T.sanctifiedJudgement.chance[p])} chance to refund ${pct(T.sanctifiedJudgement.refund[p])} of your seal's mana.`,
  sealOfCommand: () => 'Learn Seal of Command.',
  sacredArbiter: () => 'Holy Strike deals 20% more damage.',
  twohandedWeaponSpecialization: (p) => `With a two-handed weapon: ${pct(T.twohandedWeaponSpecialization.dmg[p])} more physical damage (your seals, judgements and Holy Strike too) and ${pct(T.twohandedWeaponSpecialization.threat[p])} less threat.`,
  vengeance: (p) => `Each critical strike gives you ${pct(T.vengeance.dmg[p])} more damage for 30 sec, stacking 3 times.`,
  championOfTheLight: (p) => `${pct(T.championOfTheLight.intToSp[p])} of your Intellect as spell damage; Hammer of Wrath's cast is ${T.championOfTheLight.hammerCast[p]} sec shorter.`,
  unsealedWrath: () => 'Your white hits store your seal in its Echo (15 sec, 3 stacks); a hit under a different seal spends every stack, each with the stored seal\'s chance.',
};
export const NO_DPS_EFFECT = new Set(['unyieldingFaith', 'toughness', 'guardiansFavor', 'sacredDuty',
  'templarsBulwark', 'improvedHammerOfJustice', 'stoicism', 'deflection', 'vindication', 'pursuitOfJustice', 'eyeForAnEye', 'turnEvil', 'repentance']);

export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Resource Potion', icon: 'inv_potion_76' }, { id: 'offensivePotion', name: 'Offensive Potion', icon: 'inv_potion_41' },
    { id: 'defensivePotion', name: 'Defensive Potion', icon: 'inv_potion_69' },
    { id: 'conjured', name: 'Demonic Rune', icon: 'inv_misc_rune_04' },
  ] },
  { name: 'Holy', spells: [
    { id: 'sealOfRighteousness', name: 'Seal of Righteousness', spellId: 20293, icon: 'ability_thunderbolt' },
    { id: 'consecration', name: 'Consecration', spellId: 20924, icon: 'spell_holy_innerfire' },
    { id: 'exorcism', name: 'Exorcism', spellId: 10314, icon: 'spell_holy_excorcism_02' },
    { id: 'holyWrath', name: 'Holy Wrath', spellId: 10318, icon: 'spell_holy_excorcism' },
    { id: 'retributionAura', name: 'Retribution Aura', spellId: 10301, icon: 'spell_holy_auraoflight' },
    { id: 'holyShock', name: 'Holy Shock', spellId: 25902, icon: 'spell_holy_searinglight', talent: 'holyShock' },
    { id: 'divineFavor', name: 'Divine Favor', spellId: 20216, icon: 'spell_holy_heal', talent: 'divineFavor' },
  ] },
  { name: 'Protection', spells: [
    { id: 'righteousFury', name: 'Righteous Fury', spellId: 25780, icon: 'spell_holy_sealoffury' },
    { id: 'sealOfFury', name: 'Seal of Fury', spellId: 20423, icon: 'spell_holy_retributionaura' },
    { id: 'swiftJudgement', name: 'Swift Judgement', spellId: 1310994, icon: 'ability_paladin_judgementred', talent: 'swiftJudgement' },
    { id: 'holyShield', name: 'Holy Shield', spellId: 20928, icon: 'spell_holy_blessingofprotection', talent: 'holyShield' },
  ] },
  { name: 'Retribution', spells: [
    { id: 'judgement', name: 'Judgement', spellId: 20271, icon: 'spell_holy_righteousfury' },
    { id: 'sealOfTheCrusader', name: 'Seal of the Crusader', spellId: 20308, icon: 'spell_holy_holysmite' },
    { id: 'holyStrike', name: 'Holy Strike', spellId: 10333, icon: 'classicon_paladin' },
    { id: 'hammerOfWrath', name: 'Hammer of Wrath', spellId: 24239, icon: 'ability_thunderclap' },
    { id: 'sealOfCommand', name: 'Seal of Command', spellId: 20920, icon: 'ability_warrior_innerrage', talent: 'sealOfCommand' },
  ] },
];
