// Hunter data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - shot damage, cast times, costs, cooldowns; talent rank curves
//   sim/hunter/*.go, sim/core/attack.go    - Auto Shot, the shots, stings, aspects and talents
//   sim/hunter/pets.go, summon_hawk.go     - the tamed pet (a Raptor for Beast Mastery) and the hawks
// The turret builds: you stand at range and shoot. Not modelled: melee weaving (Raptor Strike, Mongoose Bite, Wing
// Clip), traps, Sniper Shot, Volley, Scorpid Sting.
import { TALENT_TREE_DATA, TALENT_TREES } from './hunter-talent-tree.js';
import { PET_COMMANDS, PET_COMMAND_IDS } from './pet-commands.js';

export { TALENT_TREE_DATA, TALENT_TREES };

// The wowsims presets (ui/specs/hunter/dps/presets.ts): MM and SV with no pet (Lone Wolf), BM with its Raptor.
export const MM_TALENTS = '5-005355251152205-5';
export const SV_TALENTS = '1-00531500114-52225303000021005';
export const BM_TALENTS = '5320001505101251-0053250001-4';
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
// Auto Shot (sim/core/attack.go): a 0.5 s aim at the end of each reload, which moving cancels; a shot due while you move
// looks again every 0.5 s, and goes a reaction time after you stop.
export const RANGED = { miss: 0.08, critSuppression: 0.048, minRange: 8, maxRange: 35, retry: 0.5, windup: 0.5, reaction: 0.1 };
// Thorium Headed Arrows (17.5 damage per second of the weapon's speed) and the Ancient Sinew Wrapped Lamina quiver
// (15% faster shots), as the presets carry (sim/hunter/ammo_auto_gen.go).
export const AMMO_DPS = 17.5;
export const QUIVER_HASTE = 0.15;
// Biznicks 247x128 Accurascope (2523): 3% hit with ranged attacks.
export const SCOPES = { 2523: { hitPct: 3 } };
// Aspect of the Hawk (25296): 120 ranged attack power, held through the fight; its Quick Shots (6150, Deadly Aspects'
// chance on Auto Shot): 30% faster shots for 12 s. Trueshot Aura (20906): 50 ranged attack power for the raid.
export const HAWK = { rap: 120, quickShots: 0.3, quickShotsDuration: 12 };
// The aspects (aspects.go), one at a time: Aspect of the Beast's Quick Strikes (1299448: 30% faster swings for 12 s,
// Deadly Aspects' chance on a melee swing); Aspect of the Cheetah's and the Pack's Dazed when struck (15571: 70% slower
// for 4 s). The fight starts in Aspect of the Hawk, as the presets.
export const QUICK_STRIKES = { haste: 0.3, duration: 12 };
export const DAZED = { slow: 0.7, duration: 4 };
export const START_ASPECT = 'aspectOfTheHawk';
// The traps (traps.go): placed at your feet, armed after 0.5 s, sprung by a target within 5 yards, gone after a minute
// unsprung. Immolation and Explosive Trap take 10% of your ranged attack power over their whole damage, split evenly
// over the ticks; Explosive Trap's hit 10% more.
export const TRAP = { arm: 0.5, radius: 5, life: 60, rapShare: 0.1, critMult: 1.5 };
export const TRUESHOT_RAP = 50;
// Beaststalker Armor 5 pieces (450577): a landed autoattack has a 5% chance to restore 200 mana (Sudden Insight).
export const BEASTSTALKER = { chance: 0.05, mana: 200 };

// The tamed pet (pets.go), as the BM preset brings it: a level 60 creature's swing (its damage per second, 60.45, over
// 2 s, 20% either side) and 30% of that as attack power (14 a point), 10% of your higher attack power on top; your
// higher crit and your ranged hit. Happy (25% more damage), Faster Attack II (25% faster, the damage a second kept),
// Cobra Reflexes (30% faster, 15% less a swing), Pet Aggression 5 (6317: 8 more damage a hit). Its focus: 100, 25
// every 5 s (Bestial Discipline more), full at the pull.
export const CREATURE_DPS = 60.45291519165039;
export const PET = {
  swing: { avg: CREATURE_DPS * 2, spread: 0.2, speed: 2 }, ap: 0.3 * 14 * CREATURE_DPS, apShare: 0.1,
  happiness: 1.25, attackSpeed: 0.25, cobraReflexes: { speed: 0.3, dmg: 0.85 }, aggression: 8,
  focus: { max: 100, tick: 25, every: 5 }, gcd: 1.5,
  // From beside you to melee range at 7 yards a second, Dash (23110: 80% faster) when it starts.
  speed: 7, dash: 0.8,
};
// The Raptor (Tamed Pet Passive 17217: 10% more physical damage) and what it casts, longest cooldown first, waiting
// for the focus of one whose cooldown is up: Savage Rend (1265069: a 26-a-3-sec bleed for 18 s, 50 focus, 60 s), Bite
// (17261: 81-99, 35 focus, 10 s), Claw (3009: 43-59, 25 focus).
export const RAPTOR = {
  name: 'Raptor', dmg: 0.1,
  abilities: [
    { id: 'savageRend', name: 'Savage Rend', spellId: 1265069, icon: 'ability_hunter_pet_raptor', cost: 50, cd: 60, dot: { tick: 26, period: 3, ticks: 6 } },
    { id: 'bite', name: 'Bite', spellId: 17261, icon: 'ability_racial_cannibalize', cost: 35, cd: 10, avg: 90, spread: 0.1 },
    { id: 'claw', name: 'Claw', spellId: 3009, icon: 'ability_druid_rake', cost: 25, cd: 0, avg: 51, spread: 8 / 51 },
  ],
};
// Summon Hawk (1293527, rank 4): 108 + 5% of ranged attack power (it only rolls a crit, as a ranged attack) a second or
// more after the cast (MinDuration), 190 mana, 6 s, then a hawk (1293248) for 18 s, two at a time (the oldest makes
// room). A hawk swings every 2.5 s at your ranged speed for 0.0815 of the creature dps over the swing (a third either
// side) plus 80% of your ranged attack power at 112 a point of dps; half your crit; your ranged hit and expertise; your
// damage done when it came.
export const HAWKS = {
  dive: { base: 108, rapCoef: 0.05, travel: 35, minTravel: 1 }, count: 2, duration: 18,
  swing: { avg: 0.0815 * CREATURE_DPS * 2.5, spread: 1 / 3, speed: 2.5 }, apShare: 0.8, apPerDps: 112, critShare: 0.5,
};

// Talent values per rank (the wowsims rank curves), index = rank. Percent values as fractions unless named Pct.
const curve = (...v) => [0, ...v];
export const TALENT = {
  // 19552: Quick Shots off Auto Shot with Aspect of the Hawk, Quick Strikes off a melee swing with Aspect of the Beast.
  deadlyAspects: { quickShots: curve(0.02, 0.04, 0.06, 0.08, 0.1), quickStrikes: curve(0.02, 0.04, 0.06, 0.08, 0.1) },
  improvedAspectOfTheMonkey: { dodge: curve(1, 2, 4) },                 // 19549: Aspect of the Monkey's dodge (rank 3: +4)
  pathfinding: { speed: curve(0.03, 0.06) },                            // 19559: Aspect of the Cheetah's and the Pack's speed
  // The traps (the rank 2 rows): 1310496 their cooldown, 19239 Immolation and Explosive Trap's damage and Freezing and
  // Frost Trap's time, 19376 their hit.
  survivalistsDiscipline: { trapCd: curve(0.2, 0.4) },
  cleverTraps: { dmg: curve(0.15, 0.3), duration: curve(0.15, 0.3) },
  survivalTactics: { trapHitPct: curve(8.5, 17) },
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
  // The melee talents (their class masks reach Raptor Strike, Mongoose Bite, Wing Clip and Strider Kick).
  savageStrikes: { critPct: curve(2, 4) },                              // 19159
  predatorsEdge: { critDmg: curve(0.06, 0.12, 0.18, 0.24, 0.3) },       // 1310627: their crit bonus
  // 440529: their mana cost 30/60% less; a melee or ranged ability's crit gives 1242688 (50/100% chance): half your
  // regen goes on while casting for 30 s.
  resourcefulness: { cost: curve(0.3, 0.6), chance: curve(0.5, 1), casting: 0.5, duration: 30 },
  exposePrey: { chance: curve(0.05, 0.1), window: 10 },                // 1310532: off attacks on a marked target
  laceratingStrikes: { share: 0.4, period: 3, ticks: 7 },               // 1310533 / 1310536: a Mongoose Bite's bleed
  focusedFire: { dmg: curve(0.01, 0.02) },                              // 1223755: you and the pet, while it is out
  unleashedFury: { dmg: curve(0.03, 0.06, 0.09, 0.12, 0.15) },          // 19616: the pet and the hawks
  ferocity: { critPct: curve(2, 4, 6, 8, 10) },                         // 19598: the pet and the hawks
  frenzy: { chance: curve(0.2, 0.4, 0.6, 0.8, 1), haste: 0.3, duration: 8 }, // 19621 / 19615: on the pet's crits
  bestialDiscipline: { focus: curve(0.1, 0.2), casting: curve(0.25, 0.5) }, // 19590: its focus; your regen casting
};

// Shots at level 60. cost in mana (costPct: of base mana); castTime in seconds before ranged haste; cd in seconds;
// weapon: normalized ranged weapon damage plus base; school.
export const ABILITIES = {
  // 20904 (Rank 6): 2 s, 6 s (shared with Multi-Shot), 310 mana: normalized weapon damage + 166.
  aimedShot: { name: 'Aimed Shot', spellId: 20904, icon: 'inv_spear_07', key: '1', castTime: 2, cd: 6, cdGroup: 'aimedMulti', cost: 310, base: 166, weapon: true, school: 'physical', shot: true, gcd: true },
  // 2643: 0.5 s, 6 s (shared with Aimed Shot), 13.9% of base mana: normalized weapon damage to 3 targets.
  multiShot: { name: 'Multi-Shot', spellId: 2643, icon: 'ability_upgrademoonglaive', key: '2', castTime: 0.5, cd: 6, cdGroup: 'aimedMulti', costPct: 0.139, base: 0, weapon: true, targets: 3, school: 'physical', shot: true, gcd: true },
  // 14287 (Rank 8): instant, 6 s (one cooldown with Summon Hawk, category 1173), 190 mana: 217 + 10% of ranged attack
  // power, Arcane.
  arcaneShot: { name: 'Arcane Shot', spellId: 14287, icon: 'ability_impalingbolt', key: '3', cd: 6, cdGroup: 'arcaneHawk', cost: 190, base: 217, rapCoef: 0.1, school: 'arcane', shot: true, gcd: true },
  // 25295 (Rank 9): 250 mana: 111 + 3% of ranged attack power every 3 s for 15 s, Nature.
  serpentSting: { name: 'Serpent Sting', spellId: 25295, icon: 'ability_hunter_quickshot', key: '4', cost: 250, dot: { tick: 111, rapCoef: 0.03, period: 3, ticks: 5 }, school: 'nature', shot: true, gcd: true },
  // 14325 (Rank 4): 60 mana: the target gives your ranged attacks 143 more attack power for 2 min.
  huntersMark: { name: "Hunter's Mark", spellId: 14325, icon: 'ability_hunter_snipershot', key: 'Q', cost: 60, rap: 143, duration: 120, gcd: true },
  // 3045: 100 mana, 5 min: 40% faster shots for 15 s.
  rapidFire: { name: 'Rapid Fire', spellId: 3045, icon: 'ability_hunter_runningshot', key: 'R', cost: 100, cd: 300, duration: 15, haste: 0.4 },
  // Beast Mastery. 1293527 (Rank 4): instant, 6 s (shared with Arcane Shot), 190 mana: the hawk's dive, then a hawk for
  // 18 s (HAWKS).
  summonHawk: { name: 'Summon Hawk', spellId: 1293527, icon: 'ability_hunter_animalhandler', key: 'E', cost: 190, cd: 6, cdGroup: 'arcaneHawk', talent: 'summonHawk', spell: true, range: 35, gcd: true },
  // 19574: no global cooldown, 2 min, 12% of base mana: the pet deals 50% more for 18 s.
  bestialWrath: { name: 'Bestial Wrath', spellId: 19574, icon: 'ability_druid_ferociousbite', key: 'T', costPct: 0.12, cd: 120, duration: 18, dmg: 0.5, talent: 'bestialWrath', pet: true },
  // 19577: 1 min, 8% of base mana: the pet's next attack crits.
  intimidation: { name: 'Intimidation', spellId: 19577, icon: 'ability_devour', key: 'G', costPct: 0.08, cd: 60, duration: 15, talent: 'intimidation', pet: true, gcd: true },
  // Melee (5 yards, the melee weapon). 14266 (Rank 8): your next swing deals 70 more, 6 s, 100 mana, no global cooldown.
  raptorStrike: { name: 'Raptor Strike', spellId: 14266, icon: 'ability_meleedamage', key: '', cost: 100, cd: 6, bonus: 70, melee: true, nextMelee: true },
  // 14271 (Rank 4): normalized weapon damage + 57 after you dodge (Defensive State, 5 s) or on Expose Prey; 5 s, 65 mana.
  mongooseBite: { name: 'Mongoose Bite', spellId: 14271, icon: 'ability_hunter_swiftstrike', key: '', cost: 65, cd: 5, bonus: 57, normalized: true, melee: true, gcd: true },
  // 14268 (Rank 3): 50 damage and a snare (a boss ignores it), 80 mana.
  wingClip: { name: 'Wing Clip', spellId: 14268, icon: 'ability_rogue_trip', key: '', cost: 80, flat: 50, melee: true, gcd: true },
  // 1317257 (talent): normalized weapon damage, 8 s, 5.81% of base mana; 30% faster for 3 s.
  striderKick: { name: 'Strider Kick', spellId: 1317257, icon: 'ability_hunter_pet_tallstrider', key: '', costPct: 0.0581, cd: 8, normalized: true, bonus: 0, melee: true, gcd: true, talent: 'striderKick' },
  // The aspects: the global cooldown, no cooldown of their own; casting one ends the other.
  aspectOfTheHawk: { name: 'Aspect of the Hawk', spellId: 25296, icon: 'spell_nature_ravenform', key: '', cost: 120, aspect: true, gcd: true, rap: 120 },
  // 1299447 (Rank 4): 110 attack power.
  aspectOfTheBeast: { name: 'Aspect of the Beast', spellId: 1299447, icon: 'ability_mount_pinktiger', key: '', cost: 110, aspect: true, gcd: true, ap: 110 },
  aspectOfTheMonkey: { name: 'Aspect of the Monkey', spellId: 13163, icon: 'ability_hunter_aspectofthemonkey', key: '', cost: 20, aspect: true, gcd: true, dodge: 8 },
  aspectOfTheCheetah: { name: 'Aspect of the Cheetah', spellId: 5118, icon: 'ability_mount_jungletiger', key: '', cost: 40, aspect: true, gcd: true, speed: 0.3, daze: true },
  aspectOfThePack: { name: 'Aspect of the Pack', spellId: 13159, icon: 'ability_mount_whitetiger', key: '', cost: 100, aspect: true, gcd: true, speed: 0.3, daze: true },
  aspectOfTheWild: { name: 'Aspect of the Wild', spellId: 20190, icon: 'spell_nature_protectionformnature', key: '', cost: 115, aspect: true, gcd: true },
  // The traps (TRAP). 14305 (Rank 5) / 14301: 138 Fire every 3 s for 15 s on the target that springs it.
  immolationTrap: { name: 'Immolation Trap', spellId: 14305, icon: 'spell_fire_flameshock', key: '', cost: 245, cd: 30, cdGroup: 'fireTrap', gcd: true, trap: { tick: 138, period: 3, ticks: 5 } },
  // 14317 (Rank 3) / 14315: 207-265 Fire to every target within 10 yards, then 33 every 2 s for 20 s.
  explosiveTrap: { name: 'Explosive Trap', spellId: 14317, icon: 'spell_fire_selfdestruct', key: '', cost: 520, cd: 30, cdGroup: 'fireTrap', gcd: true, trap: { hit: 236.2, spread: 0.1222, tick: 33, period: 2, ticks: 10, radius: 10 } },
  // 14311 (Rank 3) / 14309: frozen for 20 s (a boss is immune); 13809 / 13810: 60% slower within 10 yards for 30 s.
  freezingTrap: { name: 'Freezing Trap', spellId: 14311, icon: 'spell_frost_chainsofice', key: '', cost: 100, cd: 30, cdGroup: 'frostTrap', gcd: true, trap: { duration: 20 } },
  frostTrap: { name: 'Frost Trap', spellId: 13809, icon: 'spell_frost_freezingbreath', key: '', cost: 60, cd: 30, cdGroup: 'frostTrap', gcd: true, trap: { duration: 30, radius: 10 } },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  potion: { name: 'Resource Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  offensivePotion: { name: 'Offensive Potion', icon: 'inv_potion_41', key: '', cost: 0, item: 'offensivePotion' },
  defensivePotion: { name: 'Defensive Potion', icon: 'inv_potion_69', key: '', cost: 0, item: 'defensivePotion' },
  conjured: { name: 'Demonic Rune', icon: 'inv_misc_rune_04', key: '0', cost: 0, item: 'conjured' },
  explosive: { name: 'Explosive', icon: 'spell_fire_selfdestruct', key: 'C', cost: 0, item: 'explosive' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
  // The pet bar (pet-commands.js) and the Raptor's abilities: a click casts one as soon as its focus allows, a
  // right-click turns its autocast off or on.
  ...PET_COMMANDS,
  bite: { name: 'Bite', icon: 'ability_racial_cannibalize', key: '', cost: 0, petSpell: 'raptor', desc: "Your Raptor's Bite: 81-99 damage, 35 focus, 10 sec cooldown." },
  claw: { name: 'Claw', icon: 'ability_druid_rake', key: '', cost: 0, petSpell: 'raptor', desc: "Your Raptor's Claw: 43-59 damage, 25 focus." },
  savageRend: { name: 'Savage Rend', icon: 'ability_hunter_pet_raptor', key: '', cost: 0, petSpell: 'raptor', desc: "Your Raptor's Savage Rend: a bleed for 18 sec, 50 focus, 1 min cooldown." },
};

// Talent reach by shot (the class masks of the wowsims rows).
export const MORTAL_SHOTS = new Set(['auto', 'aimedShot', 'multiShot', 'arcaneShot', 'serpentSting']);
export const EFFICIENCY = new Set(['aimedShot', 'multiShot', 'arcaneShot', 'serpentSting', 'summonHawk']);
export const BARRAGE = new Set(['aimedShot', 'multiShot']);
export const MELEE_ABILITIES = new Set(['raptorStrike', 'mongooseBite', 'wingClip', 'striderKick']);
export const ASPECTS = ['aspectOfTheHawk', 'aspectOfTheBeast', 'aspectOfTheMonkey', 'aspectOfTheCheetah', 'aspectOfThePack', 'aspectOfTheWild'];
export const TRAPS = ['immolationTrap', 'explosiveTrap', 'freezingTrap', 'frostTrap'];

export const ACTION_BAR = [
  [...PET_COMMAND_IDS, 'savageRend', 'bite', 'claw'],
  ['aimedShot', 'multiShot', 'arcaneShot', 'serpentSting', 'huntersMark', 'summonHawk'],
  ['raptorStrike', 'mongooseBite', 'wingClip', 'striderKick'],
  [...ASPECTS, ...TRAPS],
  ['rapidFire', 'bestialWrath', 'intimidation', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'conjured', 'explosive'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  rapidFire: { name: 'Rapid Fire', icon: 'ability_hunter_runningshot' },
  quickShots: { name: 'Quick Shots', icon: 'ability_warrior_innerrage' },
  rapidRecuperation: { name: 'Rapid Recuperation', icon: 'ability_hunter_rapidregeneration' },
  bestialWrath: { name: 'Bestial Wrath', icon: 'ability_druid_ferociousbite' },
  frenzy: { name: 'Frenzy', icon: 'inv_misc_monsterclaw_03' },
  intimidation: { name: 'Intimidation', icon: 'ability_devour' },
  defensiveState: { name: 'Defensive State', icon: 'ability_defend' },
  exposePrey: { name: 'Expose Prey', icon: 'ability_hunter_swiftstrike' },
  resourcefulness: { name: 'Resourcefulness', icon: 'ability_hunter_resourcefulness' },
  striderKick: { name: 'Strider Kick', icon: 'ability_hunter_pet_tallstrider' },
  aspectOfTheHawk: { name: 'Aspect of the Hawk', icon: 'spell_nature_ravenform' },
  aspectOfTheBeast: { name: 'Aspect of the Beast', icon: 'ability_mount_pinktiger' },
  aspectOfTheMonkey: { name: 'Aspect of the Monkey', icon: 'ability_hunter_aspectofthemonkey' },
  aspectOfTheCheetah: { name: 'Aspect of the Cheetah', icon: 'ability_mount_jungletiger' },
  aspectOfThePack: { name: 'Aspect of the Pack', icon: 'ability_mount_whitetiger' },
  aspectOfTheWild: { name: 'Aspect of the Wild', icon: 'spell_nature_protectionformnature' },
  quickStrikes: { name: 'Quick Strikes', icon: 'ability_rogue_slicedice' },
  dazed: { name: 'Dazed', icon: 'spell_frost_stun' },
};

// The pet's and the hawks' meter rows (main.js plays the pet's attack for them).
export const PET_METER = { petMelee: 'Melee (Raptor)', savageRend: 'Savage Rend', bite: 'Bite', claw: 'Claw', hawkMelee: 'Melee (hawks)' };
export const METER_NAMES = { auto: 'Auto Shot', mh: 'Melee', laceratingStrikes: 'Lacerating Strikes', ...PET_METER };
export const METER_ICONS = { auto: 'ability_whirlwind', petMelee: 'ability_druid_rake', hawkMelee: 'ability_hunter_animalhandler', ...Object.fromEntries(RAPTOR.abilities.map((a) => [a.id, a.icon])) };
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
  { id: 'beastMastery', name: 'BM (wowsims turret, Raptor and hawks)', talents: BM_TALENTS, playable: true, spec: 'beastMastery' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  deadlyAspects: (p) => `Auto Shot has a ${pct(T.deadlyAspects.quickShots[p])} chance with Aspect of the Hawk to make your shots 30% faster for 12 sec; a melee swing as much with Aspect of the Beast to make your swings 30% faster.`,
  improvedAspectOfTheMonkey: (p) => `Aspect of the Monkey gives ${T.improvedAspectOfTheMonkey.dodge[p]}% more dodge.`,
  pathfinding: (p) => `Aspect of the Cheetah and of the Pack make you ${pct(T.pathfinding.speed[p])} faster still.`,
  survivalistsDiscipline: (p) => `Your traps' cooldown is ${pct(T.survivalistsDiscipline.trapCd[p])} shorter.`,
  cleverTraps: (p) => `Immolation and Explosive Trap deal ${pct(T.cleverTraps.dmg[p])} more; Freezing and Frost Trap last ${pct(T.cleverTraps.duration[p])} longer.`,
  survivalTactics: (p) => `Your traps have ${T.survivalTactics.trapHitPct[p]}% more chance to hit.`,
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
  focusedFire: (p) => `With your pet out, you and your pet deal ${pct(T.focusedFire.dmg[p])} more damage.`,
  unleashedFury: (p) => `Your pet and hawks deal ${pct(T.unleashedFury.dmg[p])} more damage.`,
  ferocity: (p) => `Your pet and hawks have ${T.ferocity.critPct[p]}% more crit.`,
  summonHawk: () => 'Summon Hawk: a hawk dives at the target, then fights beside you for 18 sec.',
  intimidation: () => "Intimidation: your pet's next attack crits.",
  bestialDiscipline: (p) => `Your pet's focus comes ${pct(T.bestialDiscipline.focus[p])} faster; ${pct(T.bestialDiscipline.casting[p])} of your mana regeneration continues while casting.`,
  frenzy: (p) => `Your pet's crits have a ${pct(T.frenzy.chance[p])} chance to make it attack 30% faster for 8 sec.`,
  bestialWrath: () => 'Bestial Wrath: your pet deals 50% more damage for 18 sec.',
  savageStrikes: (p) => `Raptor Strike, Mongoose Bite, Wing Clip and Strider Kick have ${T.savageStrikes.critPct[p]}% more crit.`,
  predatorsEdge: (p) => `Your melee abilities crit for ${pct(T.predatorsEdge.critDmg[p])} more bonus damage.`,
  resourcefulness: (p) => `Your melee abilities cost ${pct(T.resourcefulness.cost[p])} less mana; your melee and ranged abilities' crits have a ${pct(T.resourcefulness.chance[p])} chance to let half your regen go on while casting for 30 sec.`,
  exposePrey: (p) => `Your attacks on a target with your Hunter's Mark have a ${pct(T.exposePrey.chance[p])} chance to let you Mongoose Bite for 10 sec.`,
  striderKick: () => 'Strider Kick: normalized weapon damage, and you run 30% faster for 3 sec.',
  laceratingStrikes: () => 'Mongoose Bite makes the target bleed for 40% of its damage over 21 sec.',
};
export const NO_DPS_EFFECT = new Set(['enduranceTraining', 'improvedRevivePet',
  'bestialSwiftness', 'improvedMendPet', 'spiritBond', 'hawkEye', 'improvedConcussiveShot', 'scatterShot', 'sniperShot', 'deflection', 'entrapment', 'survivalist',
  'improvedWingClip', 'deterrence', 'counterattack']);

const petTab = (spells) => ({ name: 'Pet', spells: [...PET_COMMAND_IDS.map((id) => ({ id, name: PET_COMMANDS[id].name, icon: PET_COMMANDS[id].icon })), ...spells] });
export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Resource Potion', icon: 'inv_potion_76' }, { id: 'offensivePotion', name: 'Offensive Potion', icon: 'inv_potion_41' },
    { id: 'defensivePotion', name: 'Defensive Potion', icon: 'inv_potion_69' },
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
  { name: 'Survival', spells: [
    { id: 'raptorStrike', name: 'Raptor Strike', spellId: 14266, icon: 'ability_meleedamage' },
    { id: 'mongooseBite', name: 'Mongoose Bite', spellId: 14271, icon: 'ability_hunter_swiftstrike' },
    { id: 'wingClip', name: 'Wing Clip', spellId: 14268, icon: 'ability_rogue_trip' },
    { id: 'striderKick', name: 'Strider Kick', spellId: 1317257, icon: 'ability_hunter_pet_tallstrider', talent: 'striderKick' },
    ...TRAPS.map((id) => ({ id, name: ABILITIES[id].name, spellId: ABILITIES[id].spellId, icon: ABILITIES[id].icon })),
  ] },
  { name: 'Beast Mastery', spells: [
    { id: 'summonHawk', name: 'Summon Hawk', spellId: 1293527, icon: 'ability_hunter_animalhandler', talent: 'summonHawk' },
    { id: 'bestialWrath', name: 'Bestial Wrath', spellId: 19574, icon: 'ability_druid_ferociousbite', talent: 'bestialWrath' },
    { id: 'intimidation', name: 'Intimidation', spellId: 19577, icon: 'ability_devour', talent: 'intimidation' },
    ...ASPECTS.map((id) => ({ id, name: ABILITIES[id].name, spellId: ABILITIES[id].spellId, icon: ABILITIES[id].icon })),
  ] },
  petTab([{ id: 'savageRend', name: 'Savage Rend', icon: 'ability_hunter_pet_raptor' }, { id: 'bite', name: 'Bite', icon: 'ability_racial_cannibalize' }, { id: 'claw', name: 'Claw', icon: 'ability_druid_rake' }]),
];
