// Warrior data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - ability costs, cooldowns and damage
//   sim/warrior/*.go                       - how the abilities and talents behave
//   sim/core/rage.go, sim/core/target.go   - rage and attack table formulas
//   sim/core/base_stats*.go                - base stats and rating conversions
// Values marked APPROX are not stated directly in wowsims (the talent rank curves live in a separate
// generated table) and use the classic value instead. Check them against the wowsims sim.

export const iconUrl = (icon) => `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;

// wowsims Stat enum (proto/common.proto).
export const STAT = {
  str: 0, agi: 1, sta: 2, int: 3, healing: 4, spellDmg: 5, arcaneDmg: 6, fireDmg: 7, frostDmg: 8, holyDmg: 9, natureDmg: 10,
  shadowDmg: 11, spellPen: 12, spi: 13, ap: 14, hit: 17, crit: 18, haste: 19,
  arpen: 20, expertise: 21, defense: 22, block: 23, blockValue: 24, dodge: 25, parry: 26,
  armor: 27, bonusArmor: 28, health: 29, mana: 30, mp5: 31, physDmg: 37, armorNoMods: 38,
};

// Rating needed for 1% (sim/core/base_stats_auto_gen.go); defense rating is one defense skill point per point.
export const RATING = { hit: 10, crit: 14, haste: 10, expertise: 10, dodge: 12, parry: 15, block: 5, defense: 1 };
export const CRIT_PER_AGI = 0.05;
export const DODGE_PER_AGI = 0.05; // warriors: the crit per Agility (sim/core/base_stats.go dodgePerAgility)
// Each point of defense skill above 300 makes the boss miss, and you dodge, parry and block, 0.04% more, and takes
// 0.04% off its crit chance (sim/core/constants.go MissDodgeParryBlockCritChancePerDefense).
export const PER_DEFENSE = 0.04;
// Block value: 1 per 20 Strength, less 1, for classes that can use a shield (sim/core/unit.go BlockDamageReduction).
export const BLOCK_VALUE_PER_STR = 0.05;

// The wowsims "Raid Target" (db.json encounters, Default/Raid Target): a level 63 boss swinging every 2 s for
// 2601 x (1 + 0.5 x roll + its 320 attack power x 0.00052) before your armor (sim/core/attack.go
// EnemyWeaponDamage), 5.6% crit, 15% crushing blows (x1.5), and parry haste. Against you its table is
// sim/core/target.go NewAttackTable: 5% - 0.6% miss, your dodge - 0.6%, 5% - 0.6% + your parry, 5% - 0.6% + your
// block (with a shield), then crit, then crush, all on one roll (spell_outcome.go outcomeEnemyMeleeWhite).
export const BOSS_MELEE = {
  min: 2601, spread: 0.5, speed: 2, ap: 320, apCoef: 0.00052, critPct: 5.6, crush: 0.15, levelDelta: -0.006,
};

// Level 60 warrior before race (sim/core/base_stats.go). Health is the class base plus 10 per Stamina.
export const BASE = { str: 120, agi: 80, sta: 110, ap: 160, health: 1689 };

// Racials (sim/core/racials.go). `active` is the racial on the action bar; the rest are passives.
export const RACIALS = {
  RaceOrc: { active: { name: 'Blood Fury', spellId: 20572, icon: 'racial_orc_berserkerstrength', cd: 120, duration: 15, apMult: 1.1 } },
  RaceTroll: { active: { name: 'Berserking', spellId: 20554, icon: 'racial_troll_berserk', cd: 180, duration: 15, hasteMult: 1.1 } },
  RaceNightElf: { active: { name: "Elune's Light", spellId: 1259799, icon: 'spell_nature_moonglow', cd: 180, duration: 15, critPct: 10 } },
  // Eureka! 1259813: the warrior row's class masks reach these abilities' cost and direct damage.
  RaceGnome: {
    active: { name: 'Eureka!', spellId: 1259813, icon: 'inv_gnometoy', cd: 120, duration: 8, costPct: -10, damagePct: 10,
      abilities: ['bloodthirst', 'whirlwind', 'whirlwindOh', 'heroicStrike', 'cleave', 'execute', 'overpower', 'hamstring'] },
    maxRageMult: 1.05, // Expansive Mind
  },
  RaceHuman: { critPct: 1, spiMult: 0.1 },  // Ruthless; The Human Spirit (+10% Spirit)
  RaceDwarf: { hitPct: 1 },   // Artisan's Precision
  RaceUndead: { touchOfTheGrave: { chance: 0.2, icd: 15, healthPct: 0.05 } },
  RaceHighOrderSkyborne: { attackSpeedMult: 1.02 },  // Wind Blessed
  RaceWindshaperSkyborne: { attackSpeedMult: 1.02 },
};

// Distances in yards (sim/core MaxMeleeRange; Whirlwind 1680 RadiusMax 8).
export const RANGE = { melee: 5, whirlwind: 8, dummyRadius: 1 };

// Abilities that need the target in melee range and in front of you.
export const MELEE_ABILITIES = new Set(['bloodthirst', 'execute', 'hamstring', 'overpower', 'rend', 'sunderArmor', 'mortalStrike', 'slam', 'spearingStrike',
  'shieldSlam', 'revenge', 'concussionBlow', 'shieldBash']);

export const PLAYER_LEVEL = 60;
export const BOSS_LEVEL = 63;
export const BOSS_ARMOR = 3731; // APPROX: classic level 63 boss armor

// Race offsets (sim/core/base_stats.go RaceOffsets). skill = weapon skill bonus by wowsims WeaponType;
// Forever has no racial weapon skill (sim/core/character_constants.go ClassWeaponSkills).
export const RACES = {
  RaceHuman: { id: 4, name: 'Human', str: 0, agi: 0, sta: 0, int: 0, spi: 0, skill: {} },
  RaceOrc: { id: 6, name: 'Orc', str: 3, agi: -3, sta: 2, int: -3, spi: 3, skill: {} },
  RaceDwarf: { id: 2, name: 'Dwarf', str: 2, agi: -4, sta: 3, int: -1, spi: -1, skill: {} },
  RaceNightElf: { id: 5, name: 'Night Elf', str: -3, agi: 5, sta: -1, int: 0, spi: 0, skill: {} },
  RaceGnome: { id: 3, name: 'Gnome', str: -5, agi: 3, sta: -1, int: 3, spi: 0, skill: {} },
  RaceUndead: { id: 9, name: 'Undead', str: -1, agi: -2, sta: 1, int: -2, spi: 5, skill: {} },
  RaceTauren: { id: 7, name: 'Tauren', str: 5, agi: -5, sta: 2, int: -5, spi: 2, skill: {} },
  RaceTroll: { id: 8, name: 'Troll', str: 1, agi: 2, sta: 1, int: -4, spi: 1, skill: {} },
  RaceHighOrderSkyborne: { id: 10, name: 'High Order Skyborne', str: -1, agi: 1, sta: -1, int: 1, spi: 0, skill: {} },
  RaceWindshaperSkyborne: { id: 11, name: 'Windshaper Skyborne', str: -1, agi: 1, sta: -1, int: 1, spi: 0, skill: {} },
};

// Talent order per tree, as the wowsims talent string lists them (ui/sim/talents/trees/warrior.json).
export const TALENT_TREES = [
  ['improvedHeroicStrike', 'deflection', 'improvedRend', 'improvedCharge', 'improvedTacticalMastery',
    'improvedOverpower', 'angerManagement', 'deepWounds', 'spearingStrike', 'twohandedWeaponSpecialization',
    'impale', 'bloodthrill', 'sweepingStrikes', 'weaponmaster', 'improvedSlam', 'improvedHamstring', 'mortalStrike'],
  ['boomingVoice', 'cruelty', 'lingeringRage', 'unbridledWrath', 'furiousPrecision', 'piercingHowl',
    'bloodCraze', 'dualWieldSpecialization', 'ragingBlows', 'enrage', 'improvedExecute',
    'improvedBerserkerRage', 'deathWish', 'improvedIntercept', 'flurry', 'goreDrinker', 'bloodthirst'],
  ['improvedBloodrage', 'shieldSpecialization', 'ironWill', 'anticipation', 'improvedRevenge',
    'improvedThunderClap', 'lastStand', 'masterOfDefense', 'improvedDisarm', 'defiance',
    'improvedSunderArmor', 'vanguard', 'improvedShieldBash', 'improvedShieldWall', 'concussionBlow',
    'focusedRage', 'bastion', 'shieldSlam'],
];

// The wowsims Fury preset (ui/specs/warrior/dps/presets.ts).
export const DEFAULT_TALENTS = '30305213002-15053105102210501';

export function parseTalents(str) {
  const out = {};
  const trees = String(str || '').split('-');
  TALENT_TREES.forEach((names, t) => {
    const digits = trees[t] || '';
    names.forEach((name, i) => { out[name] = Number(digits[i] || 0); });
  });
  return out;
}

// Per-rank talent values used by the fight engine.
export const TALENT = {
  cruelty: { critPerRank: 1 },                       // APPROX: 12320 states 5 at max
  unbridledWrath: { chancePerRank: 0.12, rage: 1 },  // sim/warrior/talents_fury.go (12/24/36/48/60)
  dualWieldSpecialization: { ohDmgPerRank: 0.05, ohRagePerRank: 0.05 }, // APPROX per rank
  furiousPrecision: { ohHitPerRank: 1 },             // APPROX: off-hand hit
  ragingBlows: { costReduction: 3 },                 // 1310315: Cleave/Whirlwind -3 rage, Whirlwind adds an off-hand strike
  improvedExecute: { costReduction: [0, 2, 5] },     // APPROX (classic)
  improvedBerserkerRage: { ragePerRank: 5 },         // APPROX
  flurry: { hastePerRank: 0.05, charges: 3, duration: 15 }, // talents_fury.go uses the talent ladder (5%/pt)
  improvedHeroicStrike: { costPerRank: 1 },          // 12282
  improvedIntercept: { cdPerRank: 5 },               // 20504 (2 ranks): Intercept cooldown -10 s at 2/2
  // Arms. The spells state the full-rank value; the per-rank split is APPROX (the rank curves are in wowsims spelldata).
  improvedSlam: { castPerRank: 0.25, gcdPerRank: 0.25, cdPerRank: 1.5 }, // 12862: -0.5 s cast, -0.5 s GCD, -3 s cd at 2/2
  twohandedWeaponSpecialization: { dmgPerRank: 0.01 }, // 12163: +1% damage per rank with a two-handed weapon
  weaponmaster: { critPerRank: 1, armorIgnorePerRank: 0.03, extraAttackPerRank: 0.01 }, // 1290261: 5% / 15% / 5% at 5/5
  bloodthrill: { chancePerRank: 0.03 },               // 1289682: 15% at 5/5, swings on a target with Rend open Overpower
  // 12834 / bleed 412609 (12 s, 3 s ticks). APPROX share: 20% of the average main-hand hit per crit at 3/3,
  // worked back from the wowsims sim's Deep Wounds damage per crit (the rank curve is in wowsims spelldata).
  deepWounds: { sharePerRank: 0.2 / 3, duration: 12, tick: 3 },
  impale: { critBonusPerRank: 0.1 },                 // 16493
  angerManagement: { rage: 1, every: 3 },            // 12296
  boomingVoice: { shoutCostPerRank: 0.05 },          // 12321: -25% shout cost at 5/5
  improvedOverpower: { critPerRank: 25 },            // 12290: +25% Overpower crit per rank
  improvedRend: { bonus: [0, 0.15, 0.25, 0.35] },    // APPROX (classic)
  tacticalMastery: { base: 10, perRank: 3 },         // 1310185 keeps 10 rage; Improved Tactical Mastery 12295: 3/6/9/12/15 (stances.go)
  enrage: { chance: 0.3, duration: 12, dmgPerRank: 0.05 }, // 12317 / 12880; per-rank value is the talent ladder (APPROX 5%)
  bloodCraze: { healPerRank: 0.01, threshold: 0.2, duration: 6 }, // 16487 / 16488 (APPROX heal share)
  // Protection. Each talent spell states its full-rank value; the per-rank split is APPROX (even steps).
  defiance: { threatPerRank: 0.05 },                  // 12792: +15% threat in Defensive Stance at 3/3, with a shield
  shieldSpecialization: { blockPerRank: 1, rageChancePerRank: 0.2, rage: 5 }, // 12298: +5% block; 1310318: 5 rage on a block
  masterOfDefense: { chancePerRank: 0.5, rage: 5 },   // 1310316 / 23602: 5 rage on a dodge or parry, with a shield
  anticipation: { defensePerRank: 4 },                // 12297: +20 defense at 5/5
  deflection: { parryPerRank: 1 },                    // 16462 (APPROX: classic 1% parry per rank)
  improvedRevenge: { dmgPerRank: 0.2 },               // 12797: Revenge +60% damage at 3/3
  improvedThunderClap: { costPerRank: 2 },            // 12287: -6 rage at 3/3
  improvedSunderArmor: { costPerRank: 1 },            // 12308: -3 rage at 3/3
  focusedRage: { costPerRank: 1 },                    // 29787: -3 rage at 3/3 on the abilities in FOCUSED_RAGE
  bastion: { dmgPerRank: 0.02 },                      // 16538: +10% physical damage at 5/5, with a shield
  improvedShieldWall: { cdPerRank: 330 },             // 12312: -660 s cooldown at 2/2
  improvedBloodrage: { ragePerRank: 0.25 },           // 12301: Bloodrage's rage +50% at 2/2 (bloodrage.go MultiplierAt)
  lastStand: { healthPct: 0.3, duration: 20 },        // 12975 / 12976: +30% maximum health for 20 s
};

// Abilities Focused Rage makes cheaper (its class mask on 29787; APPROX for Whirlwind, Overpower and Hamstring).
export const FOCUSED_RAGE = new Set(['heroicStrike', 'cleave', 'thunderClap', 'revenge', 'shieldBash', 'sunderArmor', 'demoralizingShout',
  'shieldSlam', 'mortalStrike', 'bloodthirst', 'concussionBlow', 'execute', 'overpower', 'rend', 'hamstring']);

// Threat (sim/core threat: damage x the spell's multiplier + its flat threat, x your threat multiplier). The stance
// passives: Battle Stance 21156 and Berserker Stance 7381 -20%, Defensive Stance 7376 +30%; Defiance multiplies on top.
export const THREAT = {
  stance: { battle: 0.8, berserker: 0.8, defensive: 1.3 },
  // Flat threat and threat multipliers the game files state (FlatThreat, E_THREAT effects; revenge.go 2.25).
  heroicStrike: { flat: 152.4 }, heroicStrikeRank8: { flat: 142.24 }, cleave: { flat: 91.8 },
  sunderArmor: { flat: 206, apCoef: 0.05 },           // 11597 E_THREAT 206 + 5% of attack power
  demoralizingShout: { flat: 43 + 0.8 * 6 },          // 11556 E_THREAT 43, 0.8 per level above 54 (per target)
  revenge: { mult: 2.25 },
  // Rage gained: 5 threat per point, split over the targets (sim/core/rage.go ThreatPerRageGained), except rage from
  // your swings, from hits taken and refunds.
  perRage: 5,
};

// Damage taken (sim/core/rage.go): rage = 2.5 * (1 - 0.40) * damage before mitigation / rage conversion at level 63.
export const DAMAGE_TAKEN_RAGE = 2.5 * (1 - 0.4) / (0.0091107836 * 63 * 63 + 3.225598133 * 63 + 4.2652911);
// Armor against a level 63 attacker: armor / (armor + 400 + 85 * (63 + 4.5 * (63 - 59))).
export const ARMOR_CONSTANT_63 = 400 + 85 * (63 + 4.5 * 4);
// Damage taken: Berserker Stance 7381 (+10%), Death Wish 12328 (+5%), Recklessness 1719 (+20%); Defensive Stance
// 7376 (-10%), Shield Wall 871 (-60%).
export const DAMAGE_TAKEN = { berserker: 0.1, deathWish: 0.05, recklessness: 0.2, defensive: -0.1, shieldWall: -0.6 };

// What each stance changes (sim/warrior/stances.go and the stance passives 21156 / 7381 / 7376). Defensive Stance
// also deals 10% less damage (7376 effect 2).
export const STANCES = {
  battle: { name: 'Battle Stance', icon: 'ability_warrior_offensivestance', crit: 0 },
  defensive: { name: 'Defensive Stance', icon: 'ability_warrior_defensivestance', crit: 0, damage: -0.1 },
  berserker: { name: 'Berserker Stance', icon: 'ability_racial_avatar', crit: 3 },
};

// Rage formulas (sim/core/rage.go).
export const RAGE = {
  hitFactor: 3.46,
  twoHandMultiplier: 4.5 / 3.46,
  critBonus: 1.0,
  max: 100,
};

export const REFUND_ON_MISS = 0.8; // APPROX: share of the cost given back when an attack misses

// Abilities. cost in rage, cd and gcd in seconds. spellId is the wowsims/game spell ID.
// stances lists where the ability can be used (from the spell's StanceMask); none means any stance.
export const ABILITIES = {
  bloodthirst: {
    name: 'Bloodthirst', spellId: 23894, icon: 'spell_nature_bloodlust', key: '1',
    cost: 30, cd: 6, gcd: true, talent: 'bloodthirst', apCoef: 0.45, base: 48,
  },
  whirlwind: {
    name: 'Whirlwind', spellId: 1680, icon: 'ability_whirlwind', key: '2',
    cost: 25, cd: 10, gcd: true, maxTargets: 4, stances: ['berserker'],
  },
  hamstring: {
    name: 'Hamstring', spellId: 7373, icon: 'ability_shockwave', key: '6',
    cost: 10, gcd: true, base: 45, stances: ['battle', 'berserker'],
  },
  overpower: {
    name: 'Overpower', spellId: 11585, icon: 'ability_meleedamage', key: 'C',
    cost: 5, cd: 5, gcd: true, bonus: 35, window: 5, stances: ['battle'],
  },
  rend: {
    name: 'Rend', spellId: 11574, icon: 'ability_gouge', key: 'V',
    cost: 10, gcd: true, tickBase: 21, tickApCoef: 0.02, tick: 3, duration: 21, stances: ['battle', 'defensive'],
  },
  // 11578: 8-25 yards, out of combat only (attribute NOT_IN_COMBAT), Battle Stance, +15 rage (+3 per
  // Improved Charge rank, 12695/12696), 15 s cooldown.
  charge: {
    name: 'Charge', spellId: 11578, icon: 'ability_warrior_charge', key: 'H',
    cost: 0, cd: 15, minRange: 8, maxRange: 25, rage: 15, ragePerTalentRank: 3, stances: ['battle'],
  },
  // 20617 (Rank 3): 8-25 yards, in or out of combat, Berserker Stance, 10 rage, 30 s cooldown (-10 s with
  // Improved Intercept, 20504), off the global cooldown. Intercept Stun 20615 deals 65 damage and stuns for 3 s.
  intercept: {
    name: 'Intercept', spellId: 20617, icon: 'ability_rogue_sprint', key: 'J',
    cost: 10, cd: 30, minRange: 8, maxRange: 25, damage: 65, stun: 3, stances: ['berserker'],
  },
  battleStance: {
    name: 'Battle Stance', spellId: 2457, icon: 'ability_warrior_offensivestance', key: 'Z',
    cost: 0, stanceCd: 1, stance: 'battle',
  },
  berserkerStance: {
    name: 'Berserker Stance', spellId: 2458, icon: 'ability_racial_avatar', key: 'X',
    cost: 0, stanceCd: 1, stance: 'berserker',
  },
  defensiveStance: {
    name: 'Defensive Stance', spellId: 71, icon: 'ability_warrior_defensivestance', key: '',
    cost: 0, stanceCd: 1, stance: 'defensive',
  },
  // Protection (sim/core/spelldata/spells_auto_gen.go). shield: needs a shield in the off hand.
  // 23925 (Rank 4): 20 rage, 6 s cooldown, 655 +/- 4.6% + your block value.
  shieldSlam: {
    name: 'Shield Slam', spellId: 23925, icon: 'inv_shield_05', key: '',
    cost: 20, cd: 6, gcd: true, talent: 'shieldSlam', shield: true, base: 655, variance: 0.0457,
  },
  // 25288 (Rank 6, Manual of Revenge VI; the rank the wowsims sim casts): 5 rage, 5 s cooldown, Defensive Stance,
  // 153 +/- 20% + 28% of attack power, 2.25x threat. Usable for 5 s after you block, dodge or parry (Defensive State).
  revenge: {
    name: 'Revenge', spellId: 25288, icon: 'ability_warrior_revenge', key: '',
    cost: 5, cd: 5, gcd: true, stances: ['defensive'], base: 153, variance: 0.2, apCoef: 0.28, window: 5,
  },
  // 2565: 10 rage, off the global cooldown, 5 s cooldown, Defensive Stance: +75% block chance for the next 2 blocks
  // within 7 s.
  shieldBlock: {
    name: 'Shield Block', spellId: 2565, icon: 'ability_defend', key: '',
    cost: 10, cd: 5, stances: ['defensive'], shield: true, blockPct: 75, charges: 2, duration: 7,
  },
  // 11581 (Rank 6): 20 rage, 6 s cooldown, Battle or Defensive Stance: 103 + 7% of attack power to up to 4 enemies
  // within 8 yards, and their attacks are 20% slower for 30 s.
  thunderClap: {
    name: 'Thunder Clap', spellId: 11581, icon: 'spell_nature_thunderclap', key: '',
    cost: 20, cd: 6, gcd: true, stances: ['battle', 'defensive'], base: 103, apCoef: 0.07, maxTargets: 4, duration: 30, slow: 0.2,
  },
  // 11556 (Rank 5): 10 rage: enemies within 10 yards lose 196 + 1.4 per level above 54 attack power for 45 s.
  demoralizingShout: {
    name: 'Demoralizing Shout', spellId: 11556, icon: 'ability_warrior_warcry', key: '',
    cost: 10, gcd: true, duration: 45, apReduction: 196 + 1.4 * 6, shout: true,
  },
  // 12975: 3 min cooldown, off the global cooldown: +30% maximum health for 20 s.
  lastStand: {
    name: 'Last Stand', spellId: 12975, icon: 'spell_holy_ashestoashes', key: '',
    cost: 0, cd: 180, talent: 'lastStand', duration: 20,
  },
  // 871: 15 min cooldown (-5:30 per Improved Shield Wall rank), Defensive Stance: 60% less damage taken for 12 s.
  shieldWall: {
    name: 'Shield Wall', spellId: 871, icon: 'ability_warrior_shieldwall', key: '',
    cost: 0, cd: 900, gcd: true, stances: ['defensive'], shield: true, duration: 12,
  },
  // 355: 8 s cooldown, off the global cooldown, Defensive Stance: the target attacks you for 3 s and your threat on
  // it rises to the highest anyone has.
  taunt: {
    name: 'Taunt', spellId: 355, icon: 'spell_nature_reincarnation', key: '',
    cost: 0, cd: 8, stances: ['defensive'], duration: 3,
  },
  // 12809: 10 rage, 45 s cooldown: stuns the target for 5 s (raid bosses are immune); no damage.
  concussionBlow: {
    name: 'Concussion Blow', spellId: 12809, icon: 'ability_thunderbolt', key: '',
    cost: 10, cd: 45, gcd: true, talent: 'concussionBlow',
  },
  // 1672 (Rank 3): 10 rage, 12 s cooldown, Battle or Defensive Stance: 45 damage and interrupts.
  shieldBash: {
    name: 'Shield Bash', spellId: 1672, icon: 'ability_warrior_shieldbash', key: '',
    cost: 10, cd: 12, gcd: true, stances: ['battle', 'defensive'], shield: true, damage: 45,
  },
  heroicStrike: {
    name: 'Heroic Strike', spellId: 25286, icon: 'ability_rogue_ambush', key: '3',
    cost: 15, queue: true, bonus: 157,
  },
  cleave: {
    name: 'Cleave', spellId: 20569, icon: 'ability_warrior_cleave', key: '4',
    cost: 20, queue: true, bonus: 50, maxTargets: 2,
  },
  execute: {
    name: 'Execute', spellId: 20662, icon: 'inv_sword_48', key: '5',
    cost: 15, gcd: true, base: 600, perRage: 15, stances: ['battle', 'berserker'],
  },
  sunderArmor: {
    name: 'Sunder Armor', spellId: 11597, icon: 'ability_warrior_sunder', key: 'Q',
    cost: 15, gcd: true, armor: 450, maxStacks: 5, duration: 30,
  },
  bloodrage: {
    name: 'Bloodrage', spellId: 2687, icon: 'ability_racial_bloodrage', key: 'E',
    cost: 0, cd: 60, instantRage: 10, tickRage: 1, ticks: 10, duration: 10,
  },
  berserkerRage: {
    name: 'Berserker Rage', spellId: 18499, icon: 'spell_nature_ancestralguardian', key: 'R',
    cost: 0, cd: 30, gcd: true, duration: 10, stances: ['berserker'],
  },
  deathWish: {
    name: 'Death Wish', spellId: 12328, icon: 'spell_shadow_deathpact', key: 'F',
    cost: 10, cd: 180, gcd: true, duration: 30, damage: 0.2, talent: 'deathWish',
  },
  recklessness: {
    name: 'Recklessness', spellId: 1719, icon: 'ability_criticalstrike', key: 'T',
    cost: 0, cd: 1800, gcd: true, duration: 15, crit: 100, stances: ['berserker'],
  },
  // Arms. 21553 (Rank 4): 30 rage, 6 s cooldown, normalized weapon damage + 160.
  mortalStrike: {
    name: 'Mortal Strike', spellId: 21553, icon: 'ability_warrior_savageblow', key: '', // per spec: keybinds.js
    cost: 30, cd: 6, gcd: true, talent: 'mortalStrike', bonus: 160,
  },
  // 11605 (Rank 5): 15 rage, 1.5 s cast, 18 s cooldown, weapon damage + 87. It holds your swing during the cast and
  // restarts it after; Improved Slam swaps it for 1310200, which does not touch the swing timer (SPELL_ATTR2
  // "does not reset auto actions") and casts, cools down and triggers the GCD faster.
  slam: {
    name: 'Slam', spellId: 11605, icon: 'ability_warrior_decisivestrike', key: '',
    cost: 15, cd: 18, gcd: true, castTime: 1.5, bonus: 87,
  },
  // 12292: 30 rage, off the GCD, Battle Stance, 30 s cooldown: for 20 s your next 5 melee hits also hit another
  // nearby enemy (Whirlwind does not use a charge).
  sweepingStrikes: {
    name: 'Sweeping Strikes', spellId: 12292, icon: 'ability_rogue_slicedice', key: 'K',
    cost: 30, cd: 30, duration: 20, charges: 5, talent: 'sweepingStrikes', stances: ['battle'],
  },
  // 1310222 (talent): 15 rage, 20 s cooldown, Battle Stance, 40% of normalized weapon damage.
  spearingStrike: {
    name: 'Spearing Strike', spellId: 1310222, icon: 'inv_spear_01', key: 'L',
    cost: 15, cd: 20, gcd: true, talent: 'spearingStrike', weaponShare: 0.4, stances: ['battle'],
  },
  battleShout: {
    name: 'Battle Shout', spellId: 25289, icon: 'ability_warrior_battleshout', key: 'G',
    cost: 10, gcd: true, duration: 180, ap: 139, t2Bonus: 30, shout: true,
  },
  // Item actions: name and icon come from the equipped trinket or the chosen consumable.
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  potion: { name: 'Potion', icon: 'inv_potion_41', key: '9', cost: 0, item: 'potion' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
  explosive: { name: 'Explosive', icon: 'spell_fire_selfdestruct', key: '0', cost: 0, item: 'explosive' },
};

// Two rows: the rotation, then stances, cooldowns and items.
export const ACTION_BAR = [
  ['bloodthirst', 'whirlwind', 'heroicStrike', 'cleave', 'execute', 'hamstring', 'overpower', 'rend', 'sunderArmor', 'battleShout'],
  ['charge', 'intercept', 'battleStance','berserkerStance', 'bloodrage', 'berserkerRage', 'deathWish', 'recklessness', 'racial', 'trinket1', 'trinket2', 'potion', 'explosive'],
  ['mortalStrike', 'slam', 'sweepingStrikes', 'spearingStrike'], // Arms
  ['defensiveStance', 'shieldSlam', 'revenge', 'shieldBlock', 'thunderClap', 'demoralizingShout', 'lastStand', 'shieldWall', 'taunt',
    'concussionBlow', 'shieldBash'], // Protection
];
export const ALL_ACTIONS = ACTION_BAR.flat();

// Default gear: the wowsims Pre-BiS Fury set (ui/specs/warrior/dps/gear_sets/prebis_fury.gear.json).
export const DEFAULT_GEAR = [
  { id: 12640, enchant: 2543 }, { id: 19491 }, { id: 10263, randomSuffix: 12727 }, { id: 18511, enchant: 7667 },
  { id: 252483, enchant: 1891 }, { id: 10147, randomSuffix: 12727, enchant: 7656 }, { id: 21998, enchant: 8206 },
  { id: 20216 }, { id: 22385, enchant: 2543 }, { id: 21995, enchant: 1887 }, { id: 272408 }, { id: 272409 },
  { id: 249469 }, { id: 272437 }, { id: 22384, enchant: 1900 }, { id: 12798, enchant: 1900 }, { id: 22347 },
];

// Buff and aura display info.
export const AURAS = {
  flurry: { name: 'Flurry', icon: 'ability_ghoulfrenzy' },
  sweepingStrikes: { name: 'Sweeping Strikes', icon: 'ability_rogue_slicedice' },
  deathWish: { name: 'Death Wish', icon: 'spell_shadow_deathpact' },
  recklessness: { name: 'Recklessness', icon: 'ability_criticalstrike' },
  berserkerRage: { name: 'Berserker Rage', icon: 'spell_nature_ancestralguardian' },
  bloodrage: { name: 'Bloodrage', icon: 'ability_racial_bloodrage' },
  battleShout: { name: 'Battle Shout', icon: 'ability_warrior_battleshout' },
  overpowerWindow: { name: 'Overpower ready', icon: 'ability_meleedamage' },
  enrage: { name: 'Enrage', icon: 'spell_shadow_unholyfrenzy' },
  bloodCraze: { name: 'Blood Craze', icon: 'spell_shadow_summonimp' },
  revengeWindow: { name: 'Revenge usable', icon: 'ability_warrior_revenge' },
  shieldBlock: { name: 'Shield Block', icon: 'ability_defend' },
  lastStand: { name: 'Last Stand', icon: 'spell_holy_ashestoashes' },
  shieldWall: { name: 'Shield Wall', icon: 'ability_warrior_shieldwall' },
  taunt: { name: 'Taunt', icon: 'spell_nature_reincarnation' },
};

export const METER_NAMES = {
  mh: 'Main Hand', oh: 'Off Hand', deepWounds: 'Deep Wounds', windfury: 'Windfury Attack',
  whirlwindOh: 'Whirlwind (Off Hand)',
};

// Threat-only meter rows (no damage): what they are called.
export const THREAT_NAMES = { demoralizingShout: 'Demoralizing Shout', sunderArmor: 'Sunder Armor', taunt: 'Taunt' };
