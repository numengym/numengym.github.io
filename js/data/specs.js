// The warrior specs the trainer plays. Each has its own saved character (gear, talents, consumables), keybinds,
// action bar layout and APL; switching the spec in the top bar swaps all of them.
import { DEFAULT_LOADOUT } from '../character.js';
import { DEFAULT_APL } from './fury-apl.js';
import { ARMS_APL } from './arms-apl.js';
import { PROT_APL } from './prot-apl.js';
import { ROGUE_APL } from './rogue-apl.js';
import { CONSUMABLES as ROGUE_CONSUMABLES, GEAR as ROGUE_GEAR } from './rogue.js';
import { withVariables } from '../apl.js';
import { ARCANE_APL, FIRE_APL, FROST_APL } from './mage-apl.js';
import { ARCANE_FIRE_APL, DEMO_SHADOW_BRAND, FFB_APL, SM_RUIN, SMITE, SMITE_APL } from './wowsims-builds.js';
import * as MAGE from './mage.js';
import { HOLY_SHOCK_APL, PROT_PALADIN_APL, RET_APL } from './paladin-apl.js';
import * as PALADIN from './paladin.js';
import { SHADOW_APL } from './priest-apl.js';
import * as PRIEST from './priest.js';
import { ELEMENTAL_APL, ENHANCEMENT_APL } from './shaman-apl.js';
import * as SHAMAN from './shaman.js';
import { BALANCE_APL } from './druid-apl.js';
import { AFFLICTION_APL, DEMONOLOGY_APL, DEMO_SHADOW_BRAND_APL, DESTRUCTION_APL, SM_RUIN_APL } from './warlock-apl.js';
import { BEAST_MASTERY_APL, MARKSMANSHIP_APL, SURVIVAL_APL } from './hunter-apl.js';
import { MELEE_APL, WEAVE_APL } from './hunter-weave-apl.js';
import * as HUNTER from './hunter.js';
import * as WARLOCK from './warlock.js';
import * as DRUID from './druid.js';
import { BEAR_APL, CAT_APL } from './feral-apl.js';
import * as FERAL from './feral.js';

// The warrior's defaults (js/character.js) with the raid buffs of wowsims' warrior DefaultRaidBuffs
// (ui/specs/warrior/shared/presets.ts), which took Grace of Air Totem.
const WARRIOR_LOADOUT = { ...DEFAULT_LOADOUT, raidBuffs: { ...DEFAULT_LOADOUT.raidBuffs, graceOfAirTotem: true } };

// The wowsims Pre-BiS (Defense Cap) Protection set (ui/specs/warrior/protection/gear_sets/prebis.gear.json): a
// one-hander and a shield, 142 defense.
const PROT_GEAR = [
  { id: 10388, randomSuffix: 12736, enchant: 2543 }, { id: 22150 }, { id: 275737 }, { id: 18413, enchant: 7667 },
  { id: 252483, enchant: 1891 }, { id: 10147, randomSuffix: 12727, enchant: 8214 }, { id: 250552, enchant: 8206 },
  { id: 21994 }, { id: 10389, randomSuffix: 12736, enchant: 2543 }, { id: 10376, randomSuffix: 12736, enchant: 1887 },
  { id: 272409 }, { id: 15855 }, { id: 272440 }, { id: 10779 }, { id: 12798, enchant: 1900 }, { id: 16998, enchant: 1886 },
  { id: 15289, randomSuffix: 12736 },
];

// The wowsims Pre-BiS Arms set (ui/specs/warrior/dps/gear_sets/prebis_arms.gear.json): Arcanite Reaper, no off hand.
const ARMS_GEAR = [
  { id: 12640, enchant: 2543 }, { id: 19491 }, { id: 10263, randomSuffix: 12727 }, { id: 10249, randomSuffix: 12727, enchant: 7667 },
  { id: 252483, enchant: 1891 }, { id: 10147, randomSuffix: 12727, enchant: 7656 }, { id: 21998, enchant: 8206 },
  { id: 272403 }, { id: 22385, enchant: 2543 }, { id: 21995, enchant: 1887 }, { id: 272408 }, { id: 272409 },
  { id: 249469 }, { id: 272437 }, { id: 12784, enchant: 1900 }, {}, { id: 15289, randomSuffix: 12727 },
];

// The rogue specs: wowsims has one rogue sim with its talent presets (ui/specs/rogue/dps/presets.ts); each spec here is
// a preset build with the gear set it is simmed with, and the "Direct APL" with Use Backstab off, as wowsims' simple
// rotation has it for these builds. The buffs and debuffs are the rogue sim's defaults (ui/specs/rogue/dps/spec.ts).
const ROGUE_LOADOUT = {
  ...DEFAULT_LOADOUT,
  classId: 'rogue',
  race: 'RaceHuman',
  consumables: ROGUE_CONSUMABLES,
  buffs: { greaterBlessingOfKings: true, greaterBlessingOfMight: true },
  raidBuffs: {
    giftOfTheWild: true, strengthOfEarthTotem: true, windfuryTotem: true, battleShout: 1, leaderOfThePack: true, graceOfAirTotem: true,
    moonkinAura: true, prayerOfFortitude: true,
  },
  partyBuffs: {},
  debuffs: { curseOfRecklessness: true, faerieFire: true, giftOfArthas: true, sunderArmor: true, curseOfElements: true, armorShatter: true },
  trainer: { sunderHelp: false, warriors: 2 },
};
const ROGUE_BARS = (main) => ({ main, stances: [], cds: ['coldBlood', 'premeditation', 'vanish', 'preparation', 'bladeFlurry', 'adrenalineRush', 'kick', 'feint', 'evasion', 'stealth', 'exposeArmor', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'conjured'] });
const ROGUE_SPEC_APL = withVariables(ROGUE_APL, { 'Use Backstab': false });

// The mage specs: wowsims has one mage sim; each spec here is one of its preset builds (ui/specs/mage/dps/presets.ts) with
// its APL, all on the P1 Arcane gear, the wowsims default consumables, raid buffs and debuffs.
const MAGE_LOADOUT = {
  ...DEFAULT_LOADOUT,
  classId: 'mage',
  race: 'RaceGnome',
  items: MAGE.GEAR,
  consumables: MAGE.CONSUMABLES,
  buffs: MAGE.BUFFS,
  raidBuffs: MAGE.RAID_BUFFS,
  partyBuffs: MAGE.PARTY_BUFFS,
  debuffs: MAGE.DEBUFFS,
  trainer: { sunderHelp: false, warriors: 2 },
};
// The paladin specs: wowsims' Protection Paladin and Retribution Paladin sims with their preset talents and gear; Holy
// Shock is a Retribution preset build. Human, as the wowsims presets.
const PALADIN_LOADOUT = {
  ...DEFAULT_LOADOUT,
  classId: 'paladin',
  race: 'RaceHuman',
  buffs: PALADIN.BUFFS,
  raidBuffs: PALADIN.RAID_BUFFS,
  partyBuffs: PALADIN.PARTY_BUFFS,
  debuffs: PALADIN.DEBUFFS,
  trainer: { sunderHelp: false, warriors: 2 },
};
const PALADIN_BARS = (main, cds) => ({ main, stances: [], cds: [...cds, 'racial', 'trinket1', 'trinket2', 'weapon', 'potion', 'offensivePotion', 'defensivePotion', 'conjured'], auras: [...PALADIN.PALADIN_AURAS] });
const MAGE_BARS = (main) => ({ main, stances: [], cds: ['arcanePower', 'presenceOfMind', 'combustion', 'coldSnap', 'iceBarrier', 'evocation', 'mageArmor', 'manaGem', 'blink', 'iceBlock', 'frostNova', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion'] });
// The priest: wowsims' Shadow preset (ui/specs/priest/dps/builds/testing.build.json), Human as there.
const PRIEST_LOADOUT = {
  ...DEFAULT_LOADOUT,
  classId: 'priest',
  race: 'RaceHuman',
  items: PRIEST.GEAR,
  consumables: PRIEST.CONSUMABLES,
  buffs: PRIEST.BUFFS,
  raidBuffs: PRIEST.RAID_BUFFS,
  partyBuffs: PRIEST.PARTY_BUFFS,
  debuffs: PRIEST.DEBUFFS,
  trainer: { sunderHelp: false, warriors: 2 },
};
// The shaman: wowsims' Elemental preset (ui/specs/shaman/elemental/builds/testing.build.json), Windshaper Skyborne as there.
const SHAMAN_LOADOUT = {
  ...DEFAULT_LOADOUT,
  classId: 'shaman',
  race: 'RaceWindshaperSkyborne',
  items: SHAMAN.GEAR,
  consumables: SHAMAN.CONSUMABLES,
  buffs: SHAMAN.BUFFS,
  raidBuffs: SHAMAN.RAID_BUFFS,
  partyBuffs: SHAMAN.PARTY_BUFFS,
  debuffs: SHAMAN.DEBUFFS,
  trainer: { sunderHelp: false, warriors: 2 },
};
// The druid: wowsims' Balance preset (ui/specs/druid/balance/presets.ts), Night Elf as there.
const DRUID_LOADOUT = {
  ...DEFAULT_LOADOUT,
  classId: 'druid',
  race: 'RaceNightElf',
  items: DRUID.GEAR,
  consumables: DRUID.CONSUMABLES,
  buffs: DRUID.BUFFS,
  raidBuffs: DRUID.RAID_BUFFS,
  partyBuffs: DRUID.PARTY_BUFFS,
  debuffs: DRUID.DEBUFFS,
  trainer: { sunderHelp: false, warriors: 2 },
};

// The Feral druid: wowsims' Feral Cat and Feral Bear presets (ui/specs/druid/feralcat/presets.ts, feralbear/presets.ts),
// Tauren as there; the druid played in a form (variant feral, form cat or bear).
const FERAL_LOADOUT = {
  ...DRUID_LOADOUT,
  race: 'RaceTauren',
  variant: 'feral',
  buffs: FERAL.BUFFS,
  raidBuffs: FERAL.RAID_BUFFS,
  partyBuffs: FERAL.PARTY_BUFFS,
  debuffs: FERAL.DEBUFFS,
};
const FERAL_BARS = (main, cds) => ({ main, stances: [], cds: [...cds, 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'conjured', 'explosive'] });

// The warlock: the wowsims builds (ui/specs/warlock/dps/builds) on its pre-raid set, each with its demon.
const WARLOCK_LOADOUT = {
  ...DEFAULT_LOADOUT,
  classId: 'warlock',
  race: 'RaceHuman',
  items: WARLOCK.GEAR,
  consumables: WARLOCK.CONSUMABLES.demo,
  buffs: WARLOCK.BUFFS,
  raidBuffs: WARLOCK.RAID_BUFFS.demo,
  partyBuffs: WARLOCK.PARTY_BUFFS.demo,
  debuffs: WARLOCK.DEBUFFS.demo,
  trainer: { sunderHelp: false, warriors: 2 },
};
// The pet bar in WoW's order (Ctrl+1 to Ctrl+0): Attack, Follow, Stay, the pet's spells, then its modes.
const PET_BAR = (spells) => ['petAttack', 'petFollow', 'petStay', ...spells, 'petAssist', 'petDefensive', 'petPassive'];
const WARLOCK_BARS = (main, cds) => ({ main: [...main, 'drainLife', 'drainSoul', 'hellfire', 'rainOfFire'], stances: [], pet: PET_BAR(['firebolt', 'lashOfPain']), cds: [...cds, 'curseOfRecklessness', 'curseOfWeakness', 'lifeTap', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'conjured', 'explosive'] });

// The hunter: the wowsims turret presets on the P1 set, Orc, no pet (Lone Wolf).
const HUNTER_LOADOUT = {
  ...DEFAULT_LOADOUT,
  classId: 'hunter',
  race: 'RaceOrc',
  items: HUNTER.GEAR,
  consumables: HUNTER.CONSUMABLES,
  buffs: HUNTER.BUFFS,
  raidBuffs: HUNTER.RAID_BUFFS,
  partyBuffs: HUNTER.PARTY_BUFFS,
  debuffs: HUNTER.DEBUFFS,
  trainer: { sunderHelp: false, warriors: 2 },
};
const HUNTER_MELEE = ['raptorStrike', 'mongooseBite', 'wingClip', 'striderKick', 'counterattack'];
// The aspects and traps on the small bar above the main one.
const HUNTER_BARS = (main) => ({ main: [...main, 'scorpidSting', 'sniperShot', 'volley', ...HUNTER_MELEE], stances: [...HUNTER.ASPECTS, ...HUNTER.TRAPS], pet: PET_BAR(Object.keys(HUNTER.PET_SPELLS)), cds: ['rapidFire', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'conjured', 'explosive'] });

export const SPECS = {
  fury: {
    classId: 'warrior',
    name: 'Fury', build: 'Fury',
    loadout: WARRIOR_LOADOUT,
    apl: DEFAULT_APL,
    startStance: 'berserker',
    bars: {
      main: ['bloodthirst', 'whirlwind', 'execute', 'heroicStrike', 'cleave', 'overpower', 'rend', 'hamstring', 'sunderArmor'],
      stances: ['battleStance', 'berserkerStance'],
      cds: ['charge', 'intercept', 'deathWish', 'recklessness', 'berserkerRage', 'bloodrage', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'explosive', 'battleShout'],
    },
  },
  arms: {
    classId: 'warrior',
    name: 'Arms', build: 'Arms',
    // wowsims ArmsTalents and ArmsConsumables: the two-hander (an axe) takes the sharpening stone, there is no off hand.
    loadout: {
      ...WARRIOR_LOADOUT,
      items: ARMS_GEAR,
      talentsString: '30325213132515201-0505-2',
      consumables: { ...DEFAULT_LOADOUT.consumables, mhImbueId: 12404, ohImbueId: 0 },
    },
    apl: ARMS_APL,
    startStance: 'battle',
    bars: {
      main: ['mortalStrike', 'slam', 'overpower', 'rend', 'execute', 'whirlwind', 'heroicStrike', 'cleave', 'hamstring', 'sunderArmor'],
      stances: ['battleStance', 'berserkerStance'],
      cds: ['charge', 'intercept', 'sweepingStrikes', 'spearingStrike', 'deathWish', 'recklessness', 'berserkerRage', 'bloodrage', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'explosive', 'battleShout'],
    },
  },
  prot: {
    classId: 'warrior',
    name: 'Protection', build: 'Protection',
    // wowsims ProtectionTalents and DefaultConsumables (ui/specs/warrior/protection/presets.ts), with the trainer's
    // potion slot on the Mighty Rage Potion. The tank keeps Sunder Armor up itself, so no other warriors sunder.
    loadout: {
      ...WARRIOR_LOADOUT,
      items: PROT_GEAR,
      talentsString: '35301003002-03-050530120301011351',
      consumables: { foodId: 20452, elixirIds: [250350, 13452, 12820, 13445, 250329], mhImbueId: 12404, ohImbueId: 0, resourcePotId: 13442 },
      debuffs: { giftOfArthas: true, faerieFire: true, curseOfRecklessness: true },
      trainer: { sunderHelp: false, warriors: 1 },
    },
    apl: PROT_APL,
    startStance: 'defensive',
    // Scored on threat per second, and the target hits back (a tank fight): Settings → Fight.
    metric: 'tps',
    tank: true,
    bars: {
      main: ['shieldSlam', 'revenge', 'sunderArmor', 'heroicStrike', 'cleave', 'thunderClap', 'demoralizingShout', 'shieldBlock', 'rend', 'execute'],
      stances: ['battleStance', 'defensiveStance', 'berserkerStance'],
      cds: ['charge', 'taunt', 'bloodrage', 'shieldWall', 'lastStand', 'concussionBlow', 'shieldBash', 'berserkerRage', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'battleShout'],
    },
  },
  assassination: {
    classId: 'rogue',
    name: 'Assassination', build: 'Asn Muti',
    // Asn Muti: daggers in both hands, Mutilate, Venom and Seal Fate.
    loadout: { ...ROGUE_LOADOUT, items: ROGUE_GEAR.muti, talentsString: '00532310151501031-302303202014' },
    apl: ROGUE_SPEC_APL,
    bars: ROGUE_BARS(['mutilate', 'sliceAndDice', 'venom', 'eviscerate', 'rupture', 'garrote', 'ambush', 'sinisterStrike', 'backstab']),
  },
  combat: {
    classId: 'rogue',
    name: 'Combat', build: 'Combat SS',
    // Combat SS: a slow main hand, Sinister Strike, Blade Flurry and Adrenaline Rush.
    loadout: { ...ROGUE_LOADOUT, items: ROGUE_GEAR.slowMh, talentsString: '005323101012-32030320201515231' },
    apl: ROGUE_SPEC_APL,
    bars: ROGUE_BARS(['sinisterStrike', 'sliceAndDice', 'eviscerate', 'rupture', 'garrote', 'ambush', 'backstab', 'bladeFlurry', 'adrenalineRush']),
  },
  subtlety: {
    classId: 'rogue',
    name: 'Subtlety', build: 'Subtlety Hemo',
    // Subtlety Hemo: a slow main hand, Hemorrhage, Ghostly Strike, Premeditation, Preparation and Thousand Cuts.
    loadout: { ...ROGUE_LOADOUT, items: ROGUE_GEAR.slowMh, talentsString: '005323101014--4323200300013211501' },
    apl: ROGUE_SPEC_APL,
    bars: ROGUE_BARS(['hemorrhage', 'sliceAndDice', 'rupture', 'eviscerate', 'ghostlyStrike', 'garrote', 'ambush', 'sinisterStrike', 'backstab']),
  },
  arcane: {
    classId: 'mage',
    name: 'Arcane', build: 'Arcane',
    // Deep Arcane: Arcane Missiles on Missile Barrage, Arcane Wrath with Presence of Mind, Fire Blast, Arcane Blast as
    // the filler, Evocation at 10% mana.
    loadout: { ...MAGE_LOADOUT, talentsString: '050205223101311531-5500003-003' },
    apl: ARCANE_APL,
    bars: MAGE_BARS(['arcaneBlast', 'arcaneWrath', 'arcaneMissiles', 'frostbolt', 'fireBlast', 'scorch', 'coneOfCold', 'arcaneExplosion']),
  },
  fire: {
    classId: 'mage',
    name: 'Fire', build: 'Fire',
    // Deep Fire: Pyroblast on 3 Heating Up, Fire Blast, Scorch to 5 Fire Vulnerability, Fireball.
    loadout: { ...MAGE_LOADOUT, talentsString: '0502052001001-55500001230133031-003' },
    apl: FIRE_APL,
    bars: MAGE_BARS(['fireball', 'scorch', 'fireBlast', 'pyroblast', 'arcaneBlast', 'arcaneMissiles', 'frostbolt', 'flamestrike', 'blastWave']),
  },
  frost: {
    classId: 'mage',
    name: 'Frost', build: 'Frost Incin',
    // Frost (the wowsims Frost Incin preset): Frostbolt, Cone of Cold on five Winter's Chill with Cold Snap, Ice Lance
    // after a Frostbolt on the last Fingers of Frost charge, Ice Barrier before Frigid Power drops.
    loadout: { ...MAGE_LOADOUT, talentsString: '203205-5-053500011121331251' },
    apl: FROST_APL,
    bars: MAGE_BARS(['frostbolt', 'iceLance', 'coneOfCold', 'arcaneBlast', 'arcaneMissiles', 'fireBlast', 'scorch', 'blizzard']),
  },
  retribution: {
    classId: 'paladin',
    name: 'Retribution', build: 'Unsealed Wrath',
    // Two-hander, Seal of Command and Seal of Righteousness swapped for Unsealed Wrath's Echoes (the wowsims Unsealed Wrath
    // preset of hotfix 113554), Judgement of the Crusader from the opening Judgement.
    loadout: { ...PALADIN_LOADOUT, items: PALADIN.GEAR.ret, talentsString: '050250002-501-05233011201301351', consumables: PALADIN.CONSUMABLES.ret },
    apl: RET_APL,
    bars: PALADIN_BARS(['judgement', 'holyStrike', 'sealOfCommand', 'sealOfTheCrusader', 'hammerOfWrath', 'exorcism', 'consecration'], ['sealOfRighteousness']),
  },
  holyShock: {
    classId: 'paladin',
    name: 'Retribution', build: 'Holy Shock', base: 'retribution',
    // The Holy Shock Retribution build: Seal of Righteousness, Holy Shock with Divine Favor, Champion of the Light (Intellect
    // as spell damage).
    loadout: { ...PALADIN_LOADOUT, items: PALADIN.GEAR.holyShock, talentsString: '05025210221021--0523330110130033', consumables: PALADIN.CONSUMABLES.ret },
    apl: HOLY_SHOCK_APL,
    bars: PALADIN_BARS(['holyShock', 'judgement', 'sealOfRighteousness', 'holyStrike', 'consecration', 'exorcism', 'hammerOfWrath'], ['divineFavor', 'sealOfCommand', 'sealOfTheCrusader']),
  },
  protPaladin: {
    classId: 'paladin',
    name: 'Protection', build: 'Protection',
    // The wowsims Protection preset: a one-hander and a shield, Seal of Fury, Holy Shield, Consecration; scored on threat.
    loadout: { ...PALADIN_LOADOUT, items: PALADIN.GEAR.prot, talentsString: '050050002-05302102213301531-502', consumables: PALADIN.CONSUMABLES.prot },
    apl: PROT_PALADIN_APL,
    metric: 'tps',
    tank: true,
    bars: PALADIN_BARS(['judgement', 'sealOfFury', 'consecration', 'holyShield', 'holyShock', 'holyStrike', 'exorcism'], ['swiftJudgement', 'righteousFury', 'sealOfTheCrusader', 'sealOfRighteousness']),
  },
  shadow: {
    classId: 'priest',
    name: 'Shadow', build: 'Shadow',
    // Shadowform: Shadow Word: Pain and Devouring Plague kept up, Mind Blast (with Inner Focus), Shadow Word: Death, Mind Flay.
    loadout: { ...PRIEST_LOADOUT, talentsString: PRIEST.DEFAULT_TALENTS },
    apl: SHADOW_APL,
    bars: { main: ['shadowWordPain', 'devouringPlague', 'mindBlast', 'mindFlay', 'shadowWordDeath'], stances: [], cds: ['shadowform', 'innerFocus', 'vampiricEmbrace', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'conjured'] },
  },
  elemental: {
    classId: 'shaman',
    name: 'Elemental', build: 'Elemental',
    // Totems down, Flame Shock kept up, Lava Burst on it, Elemental Mastery, Earth Shock on Revelation, Lightning Bolt.
    loadout: { ...SHAMAN_LOADOUT, talentsString: SHAMAN.DEFAULT_TALENTS },
    apl: ELEMENTAL_APL,
    bars: { main: ['lightningBolt', 'lavaBurst', 'flameShock', 'earthShock', 'chainLightning', 'searingTotem', 'fireNova', 'lightningBoltR8'], stances: [], cds: ['elementalMastery', 'manaSpringTotem', 'strengthOfEarthTotem', 'windfuryTotem', 'callOfTheElements', 'totemicRecall', 'totemicProjection', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'conjured'] },
  },
  marksmanship: {
    classId: 'hunter',
    name: 'Marksmanship', build: 'MM',
    // Turret: Hunter's Mark, Serpent Sting, Arcane Shot, Aimed Shot, Sniper Shot between your Auto Shots; Rapid Fire.
    loadout: { ...HUNTER_LOADOUT, talentsString: HUNTER.MM_TALENTS },
    apl: MARKSMANSHIP_APL,
    bars: HUNTER_BARS(['aimedShot', 'arcaneShot', 'serpentSting', 'multiShot', 'huntersMark']),
  },
  survival: {
    classId: 'hunter',
    name: 'Survival', build: 'SV',
    // Turret: Hunter's Mark, Serpent Sting, Arcane Shot, Aimed Shot.
    loadout: { ...HUNTER_LOADOUT, talentsString: HUNTER.SV_TALENTS },
    apl: SURVIVAL_APL,
    bars: HUNTER_BARS(['aimedShot', 'arcaneShot', 'serpentSting', 'multiShot', 'huntersMark']),
  },
  beastMastery: {
    classId: 'hunter',
    name: 'Beast Mastery', build: 'BM',
    // Turret with the Raptor: Hunter's Mark, Serpent Sting, Summon Hawk twice then Arcane Shot, Aimed Shot; Bestial Wrath.
    loadout: { ...HUNTER_LOADOUT, talentsString: HUNTER.BM_TALENTS, classOptions: { pet: 'raptor' } },
    apl: BEAST_MASTERY_APL,
    bars: { main: ['summonHawk', 'arcaneShot', 'aimedShot', 'serpentSting', 'multiShot', 'huntersMark', 'scorpidSting', 'volley', ...HUNTER_MELEE], stances: [...HUNTER.ASPECTS, ...HUNTER.TRAPS], pet: PET_BAR(Object.keys(HUNTER.PET_SPELLS)), cds: ['bestialWrath', 'intimidation', 'rapidFire', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'conjured', 'explosive'] },
  },
  affliction: {
    classId: 'warlock',
    name: 'Affliction', build: 'Aff (Wrack)',
    // Wrack: Corruption, Bane of Agony and Siphon Life kept up, Shadow Bolt for Shadow Vulnerability and on Nightfall,
    // Wrack while they last, the Succubus beside you; Orc, as the build.
    loadout: {
      ...WARLOCK_LOADOUT, race: 'RaceOrc', talentsString: WARLOCK.AFF_TALENTS, consumables: WARLOCK.CONSUMABLES.aff, raidBuffs: WARLOCK.RAID_BUFFS.aff,
      partyBuffs: WARLOCK.PARTY_BUFFS.aff, debuffs: WARLOCK.DEBUFFS.aff, classOptions: { summon: 'succubus' },
    },
    apl: AFFLICTION_APL,
    bars: WARLOCK_BARS(['shadowBolt', 'corruption', 'baneOfAgony', 'siphonLife', 'wrack', 'immolate', 'curseOfElements'], ['amplifyCurse', 'deathCoil']),
  },
  demonology: {
    classId: 'warlock',
    name: 'Demonology', build: 'Demo (Fire Brand)',
    // Fire Brand: the Imp out with the Succubus given up (Demonic Pact), Searing Pain branding the target for the Imp,
    // Bane of Doom, the damage over time, Soul Fire on Decimation.
    loadout: { ...WARLOCK_LOADOUT, talentsString: WARLOCK.DEMO_TALENTS, classOptions: { summon: 'imp', sacrificedDemon: 'succubus' } },
    apl: DEMONOLOGY_APL,
    bars: WARLOCK_BARS(['searingPain', 'immolate', 'corruption', 'baneOfAgony', 'baneOfDoom', 'soulFire', 'curseOfElements'], ['deathCoil']),
  },
  destruction: {
    classId: 'warlock',
    name: 'Destruction', build: 'Destro',
    // Incinerate on Immolate, Conflagrate (Shadow and Flame keeps Immolate), Shadowburn, Bane of Doom, the Succubus.
    loadout: { ...WARLOCK_LOADOUT, talentsString: WARLOCK.DESTRO_TALENTS, classOptions: { summon: 'succubus' } },
    apl: DESTRUCTION_APL,
    bars: WARLOCK_BARS(['incinerate', 'immolate', 'conflagrate', 'shadowburn', 'corruption', 'baneOfDoom', 'baneOfAgony', 'curseOfElements'], ['amplifyCurse', 'deathCoil']),
  },
  enhancement: {
    classId: 'shaman',
    name: 'Enhancement', build: 'Enhancement',
    // A two-hander with Flametongue Weapon: Stormstrike, Flame Shock kept up, Lightning Bolt at five Maelstrom Weapon
    // stacks, Earth Shock, Fire Nova off Magma Totem, your own totems; the wowsims testing build, Windshaper Skyborne.
    loadout: {
      ...SHAMAN_LOADOUT, variant: 'enhancement', items: SHAMAN.ENH_GEAR, talentsString: SHAMAN.ENH_TALENTS, consumables: SHAMAN.ENH_CONSUMABLES,
      buffs: SHAMAN.ENH_BUFFS, raidBuffs: SHAMAN.ENH_RAID_BUFFS, partyBuffs: {}, debuffs: SHAMAN.ENH_DEBUFFS,
    },
    apl: ENHANCEMENT_APL,
    bars: { main: ['stormstrike', 'earthShock', 'flameShock', 'lightningBolt', 'fireNova', 'magmaTotem', 'chainLightning'], stances: [], cds: ['rageOfTheFarseer', 'windfuryTotem', 'strengthOfEarthTotem', 'manaSpringTotem', 'searingTotem', 'callOfTheElements', 'totemicRecall', 'totemicProjection', 'racial', 'trinket1', 'trinket2', 'weapon', 'potion', 'offensivePotion', 'defensivePotion', 'conjured'] },
  },
  balance: {
    classId: 'druid',
    name: 'Balance', build: 'Moonkin',
    // Moonkin: Moonfire and Insect Swarm kept up, Starfire on Eclipse charges, Wrath to build them, Innervate when low.
    loadout: { ...DRUID_LOADOUT, talentsString: DRUID.DEFAULT_TALENTS },
    apl: BALANCE_APL,
    bars: { main: ['wrath', 'starfire', 'moonfire', 'insectSwarm', 'hurricane'], stances: [], cds: ['innervate', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'conjured', 'explosive'] },
  },
  feralCat: {
    classId: 'druid',
    name: 'Feral Cat', build: 'Cat',
    // Cat Form: Rip and Rake kept up, Ferocious Bite at 5 combo points, Shred, Shifting Power for energy.
    loadout: { ...FERAL_LOADOUT, form: 'cat', items: FERAL.GEAR.cat, talentsString: FERAL.CAT_TALENTS, consumables: FERAL.CONSUMABLES.cat },
    apl: CAT_APL,
    bars: FERAL_BARS(['shred', 'rake', 'rip', 'ferociousBite', 'claw', 'shiftingPower', 'ravage', 'pounce', 'faerieFire'], ['innervate', 'prowl', 'dash', 'feralChargeCat', 'barkskin']),
  },
  feralBear: {
    classId: 'druid',
    name: 'Feral Bear', build: 'Bear',
    // Dire Bear Form: five Lacerates kept up, Primal Bite, Maul on the swings, Swipe for more targets; scored on threat.
    loadout: { ...FERAL_LOADOUT, form: 'bear', items: FERAL.GEAR.bear, talentsString: FERAL.BEAR_TALENTS, consumables: FERAL.CONSUMABLES.bear },
    apl: BEAR_APL,
    metric: 'tps',
    tank: true,
    bars: FERAL_BARS(['lacerate', 'primalBite', 'maul', 'swipe', 'demoralizingRoar', 'faerieFire'], ['enrage', 'feralCharge', 'frenziedRegeneration', 'barkskin']),
  },
};

// ---- the wowsims preset builds of a spec beyond its first --------------------------------------------------
// Each is a spec of its own (its saved character, keys and bars), under its base spec in the menus.

// A wowsims build export (wowsims-builds.js) as a loadout on top of the class's: its race, gear (a build that names
// none keeps the class's, as wowsims keeps yours), talents, consumables, buffs and debuffs.
function exportLoadout(base, json, classOptions) {
  const p = json.player;
  return {
    ...base,
    race: p.race,
    items: p.equipment ? p.equipment.items.map((it) => (it.id ? { id: it.id, enchant: it.enchant || 0, randomSuffix: it.randomSuffix || 0 } : {})) : base.items,
    talentsString: p.talentsString,
    consumables: p.consumables,
    buffs: p.buffs || {},
    raidBuffs: json.raidBuffs || {},
    partyBuffs: json.partyBuffs || {},
    debuffs: json.debuffs || {},
    classOptions,
  };
}
const ROGUE_BS_APL = withVariables(ROGUE_APL, { 'Use Backstab': true });

Object.assign(SPECS, {
  combatMuti: {
    classId: 'rogue', name: 'Combat', build: 'Combat Muti', base: 'combat',
    // Daggers in both hands and Mutilate, with the Combat tree.
    loadout: { ...ROGUE_LOADOUT, items: ROGUE_GEAR.muti, talentsString: '00532310101401-302303202015152-001' },
    apl: ROGUE_SPEC_APL,
    bars: SPECS.assassination.bars,
  },
  combatBs: {
    classId: 'rogue', name: 'Combat', build: 'Combat BS', base: 'combat',
    // A dagger main hand and Backstab.
    loadout: { ...ROGUE_LOADOUT, items: ROGUE_GEAR.bsSub, talentsString: '00532310101-32030320201515231-002' },
    apl: ROGUE_BS_APL,
    bars: ROGUE_BARS(['backstab', 'sliceAndDice', 'eviscerate', 'rupture', 'garrote', 'ambush', 'sinisterStrike', 'bladeFlurry', 'adrenalineRush']),
  },
  subBs: {
    classId: 'rogue', name: 'Subtlety', build: 'Subtlety BS', base: 'subtlety',
    // A dagger main hand, Backstab, Premeditation and Preparation.
    loadout: { ...ROGUE_LOADOUT, items: ROGUE_GEAR.bsSub, talentsString: '0053031-3203-4320203300013211051' },
    apl: ROGUE_BS_APL,
    bars: ROGUE_BARS(['backstab', 'sliceAndDice', 'rupture', 'eviscerate', 'ghostlyStrike', 'garrote', 'ambush', 'hemorrhage', 'sinisterStrike']),
  },
  arcaneFire: {
    classId: 'mage', name: 'Arcane', build: 'Arcane Fire', base: 'arcane',
    // Arcane with Fire's talents and the wowsims Arcane Fire APL.
    loadout: { ...MAGE_LOADOUT, talentsString: '050205203100311531-525000012001-003' },
    apl: ARCANE_FIRE_APL,
    bars: SPECS.arcane.bars,
  },
  ffb: {
    classId: 'mage', name: 'Fire', build: 'FFB', base: 'fire',
    // Frostfire Bolt with Fire's and Frost's talents: Scorch's five stacks, Pyroblast on three Heating Up, Fire Blast
    // while Fingers of Frost has fewer than two charges, else Frostfire Bolt (the wowsims FFB APL).
    loadout: { ...MAGE_LOADOUT, talentsString: '-5550000123011303-2035010311013002' },
    apl: FFB_APL,
    bars: { ...SPECS.fire.bars, main: ['frostfireBolt', 'scorch', 'fireBlast', 'pyroblast', 'fireball', 'arcaneBlast', 'arcaneMissiles', 'iceLance'] },
  },
  smite: {
    classId: 'priest', name: 'Smite', build: 'Smite',
    // Discipline and Holy: Power Infusion at the pull, Holy Fire and Shadow Word: Pain kept up, Penance when ready, else
    // Smite; the lower ranks below 20% mana (the wowsims smite_testing build, Undead).
    loadout: exportLoadout(PRIEST_LOADOUT, SMITE),
    apl: SMITE_APL,
    bars: { main: ['smite', 'holyFire', 'penance', 'shadowWordPain', 'smiteR5', 'holyFireR5', 'holyNova'], stances: [], cds: ['powerInfusion', 'innerFocus', 'darkSacrifice', 'touchOfWeakness', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'conjured'] },
  },
  smRuin: {
    classId: 'warlock', name: 'Affliction', build: 'SM/Ruin', base: 'affliction',
    // Shadow Mastery and Ruin: Shadow Bolt and every affliction, the Succubus out; Human, as the build export.
    loadout: exportLoadout(WARLOCK_LOADOUT, SM_RUIN, { summon: 'succubus' }),
    apl: SM_RUIN_APL,
    bars: SPECS.affliction.bars,
  },
  demoShadowBrand: {
    classId: 'warlock', name: 'Demonology', build: 'Demo (Shadow Brand)', base: 'demonology',
    // The Succubus out and the Imp given up (Demonic Sacrifice), Shadow Bolt and Demonic Brand's Shadow.
    loadout: exportLoadout(WARLOCK_LOADOUT, DEMO_SHADOW_BRAND, { summon: 'succubus', sacrificedDemon: 'imp' }),
    apl: DEMO_SHADOW_BRAND_APL,
    bars: SPECS.demonology.bars,
  },
  // The feral Hybrid talents (cat and bear in one tree), on each form's build.
  catHybrid: { ...SPECS.feralCat, build: 'Hybrid', base: 'feralCat', loadout: { ...SPECS.feralCat.loadout, talentsString: FERAL.HYBRID_TALENTS } },
  bearHybrid: { ...SPECS.feralBear, build: 'Hybrid', base: 'feralBear', loadout: { ...SPECS.feralBear.loadout, talentsString: FERAL.HYBRID_TALENTS } },
  // The hunter's weave builds (the wowsims Melee Weave APL: shots from range, a walk in for each melee swing that fits
  // before the next Auto Shot) and the melee build (two one-handers, Aspect of the Beast, in melee all fight).
  svWeave: {
    classId: 'hunter', name: 'Survival', build: 'SV Weave', base: 'survival',
    loadout: { ...HUNTER_LOADOUT, talentsString: '-00530501114-550200030050220151' },
    apl: WEAVE_APL,
    bars: HUNTER_BARS(['multiShot', 'arcaneShot', 'serpentSting', 'huntersMark']),
  },
  mmWeave: {
    classId: 'hunter', name: 'Marksmanship', build: 'MM Weave', base: 'marksmanship',
    loadout: { ...HUNTER_LOADOUT, talentsString: '-205305031150001-5502000300502201' },
    // default_mm.apl.siml (wowsims 6fab871): Rapid Fire from the pull, and straight into the first weave.
    apl: withVariables(WEAVE_APL, { 'Rapid Fire at the pull': true, 'Walk to my spot first': false }),
    bars: HUNTER_BARS(['multiShot', 'arcaneShot', 'serpentSting', 'aimedShot', 'huntersMark']),
  },
  bmWeave: {
    classId: 'hunter', name: 'Beast Mastery', build: 'BM Weave', base: 'beastMastery',
    loadout: { ...HUNTER_LOADOUT, talentsString: '5320001505101251-0053250001-4', classOptions: { pet: 'raptor' } },
    apl: withVariables(WEAVE_APL, { 'Use Summon Hawk': true }),
    bars: SPECS.beastMastery.bars,
  },
  svMelee: {
    classId: 'hunter', name: 'Survival', build: 'SV Melee', base: 'survival',
    loadout: {
      ...HUNTER_LOADOUT, talentsString: '53200005021-005003-5502000300500221', classOptions: { pet: 'raptor' },
      items: HUNTER.GEAR.map((it, i) => (i === 14 ? { id: 12798, enchant: 2564 } : i === 15 ? { id: 12783, enchant: 2564 } : it)),
      consumables: { ...HUNTER.CONSUMABLES, ohImbueId: 18262 },
    },
    apl: MELEE_APL,
    bars: { ...HUNTER_BARS([]), main: ['raptorStrike', 'mongooseBite', 'striderKick', 'wingClip', 'huntersMark', 'serpentSting', 'arcaneShot', 'multiShot', 'summonHawk'] },
  },
});

// Healers (js/classes/healer.js, js/engine/raid.js): the class's own spells with its heals, keeping a raid alive. wowsims
// has no healing sim or APL, so these have none: the rotation helper stays quiet and the score is your healing. Each
// starts on its class's caster gear and talents (change them in the Character and Talents tabs).
const NO_APL = { prepullActions: [], priorityList: [] };
const HEALER_CDS = ['racial', 'trinket1', 'trinket2', 'potion', 'conjured'];
Object.assign(SPECS, {
  holyPriest: {
    classId: 'priest', name: 'Holy', build: 'Holy', healer: true,
    loadout: { ...exportLoadout(PRIEST_LOADOUT, SMITE), variant: 'healer' },
    apl: NO_APL,
    bars: { main: ['greaterHeal', 'flashHeal', 'heal', 'renew', 'powerWordShield', 'prayerOfHealing'], stances: [], cds: ['dispelMagic', 'abolishDisease', 'powerInfusion', 'innerFocus', ...HEALER_CDS] },
  },
  holyPaladin: {
    classId: 'paladin', name: 'Holy', build: 'Holy', healer: true,
    // The Holy standard of wowsims PR 772: Illumination, Divine Favor, Oath of Light, Holy Shock, Boundless Light, Holy
    // Power, Light's Vigil.
    loadout: { ...PALADIN_LOADOUT, variant: 'healer', items: PALADIN.GEAR.holyShock, talentsString: '55320015022101251-503020005001', consumables: PALADIN.CONSUMABLES.holy },
    apl: NO_APL,
    bars: { main: ['holyLight', 'flashOfLight', 'holyShockHeal', 'oathOfLight', 'lightsVigil', 'cleanse'], stances: [], cds: ['divineFavor', 'sealOfRighteousness', 'judgement', ...HEALER_CDS], auras: [...PALADIN.PALADIN_AURAS] },
  },
  restoShaman: {
    classId: 'shaman', name: 'Restoration', build: 'Restoration', healer: true,
    loadout: { ...SHAMAN_LOADOUT, variant: 'healer', talentsString: SHAMAN.RESTO_TALENTS },
    apl: NO_APL,
    bars: { main: ['healingWave', 'lesserHealingWave', 'chainHeal', 'riptide', 'curePoison', 'cureDisease'], stances: [], cds: ['manaSpringTotem', 'manaTideTotem', 'strengthOfEarthTotem', 'windfuryTotem', 'waterShield', 'callOfTheElements', 'totemicRecall', 'totemicProjection', ...HEALER_CDS] },
  },
  restoDruid: {
    classId: 'druid', name: 'Restoration', build: 'Restoration', healer: true,
    loadout: { ...DRUID_LOADOUT, variant: 'healer', talentsString: DRUID.DEFAULT_TALENTS },
    apl: NO_APL,
    bars: { main: ['healingTouch', 'rejuvenation', 'regrowth', 'swiftmend', 'removeCurse', 'abolishPoison'], stances: [], cds: ['innervate', ...HEALER_CDS] },
  },
});

// ---- enchants for the presets wowsims leaves bare -----------------------------------------------------------
// The wowsims gear sets for these specs carry no enchants (mage, warlock, balance and resto on their P1 or pre-raid
// sets, the Feral sets, Protection Paladin, the priest's): they get the usual ones for the role, by slot (head, neck,
// shoulders, back, chest, wrist, hands, waist, legs, feet, rings, trinkets, main hand, off hand, ranged). Casters as
// wowsims' Balance pre-raid set has them, with the gloves of the school the build casts most; healers healing power;
// the cat as wowsims' Feral pre-raid set, the bear the same with +25 Agility on the weapon; Protection Paladin as
// Protection Warrior, with spell power for its holy threat. Only empty slots of items worn are filled.
const CASTER = (hands, mh) => ({ 0: 2544, 1: 8218, 3: 2621, 4: 8492, 5: 7665, 6: hands, 8: 2544, 9: 8492, 14: mh });
const HEALER = (mh) => ({ 0: 1509, 1: 8219, 3: 2621, 4: 1891, 5: 2566, 6: 2617, 8: 1509, 9: 8492, 14: mh });
const FERAL_ENCHANTS = (mh) => ({ 0: 1508, 1: 904, 3: 7667, 4: 1891, 5: 7656, 6: 2564, 8: 1508, 9: 1887, 14: mh });
const SHADOW_POWER = 2614;
const FIRE_POWER = 2616;
const FROST_POWER = 2615;
const ARCANE_POWER = 7647;
const HOLY_POWER = 7646;
const SPELL_POWER = 2504;      // a one-hander
const SPELLBLASTING = 7662;    // a two-hander
export const PRESET_ENCHANTS = {
  arcane: CASTER(ARCANE_POWER, SPELL_POWER), arcaneFire: CASTER(ARCANE_POWER, SPELL_POWER),
  fire: CASTER(FIRE_POWER, SPELL_POWER), ffb: CASTER(FIRE_POWER, SPELL_POWER), frost: CASTER(FROST_POWER, SPELL_POWER),
  affliction: CASTER(SHADOW_POWER, SPELL_POWER), smRuin: CASTER(SHADOW_POWER, SPELL_POWER),
  demonology: CASTER(FIRE_POWER, SPELL_POWER), demoShadowBrand: CASTER(FIRE_POWER, SPELL_POWER), destruction: CASTER(FIRE_POWER, SPELL_POWER),
  balance: CASTER(ARCANE_POWER, SPELL_POWER),
  smite: CASTER(HOLY_POWER, SPELLBLASTING),
  holyPriest: HEALER(8212), // Mighty Healing Power on the staff
  restoDruid: HEALER(2505), // Healing Power on the one-hander
  feralCat: FERAL_ENCHANTS(1896), catHybrid: FERAL_ENCHANTS(1896), // Superior Impact
  feralBear: FERAL_ENCHANTS(2646), bearHybrid: FERAL_ENCHANTS(2646), // +25 Agility
  protPaladin: { 0: 2543, 1: 8218, 3: 7667, 4: 1891, 5: 8214, 6: HOLY_POWER, 8: 2543, 9: 1887, 14: SPELL_POWER, 15: 1886 },
};
// A gear list with those enchants in its empty slots.
export const withPresetEnchants = (items, spec) => {
  const add = PRESET_ENCHANTS[spec];
  return add ? items.map((it, slot) => (it.id && !it.enchant && add[slot] ? { ...it, enchant: add[slot] } : it)) : items;
};
for (const spec of Object.keys(PRESET_ENCHANTS)) if (SPECS[spec]) SPECS[spec].loadout = { ...SPECS[spec].loadout, items: withPresetEnchants(SPECS[spec].loadout.items, spec) };

// ---- the main bars -----------------------------------------------------------------------------------------------
// Each spec's main bar (one centred row): its core rotational abilities in the middle, the most used at the centre,
// the situational ones at the edges. An ability that comes onto it (a hunter's traps, a warlock's Life Tap) leaves the
// bar it was on; each build gets bars of its own.
const MAIN_BARS = {
  affliction: ['hellfire', 'drainSoul', 'curseOfElements', 'immolate', 'siphonLife', 'corruption', 'shadowBolt', 'baneOfAgony', 'wrack', 'lifeTap', 'drainLife', 'rainOfFire'],
  arcane: ['arcaneExplosion', 'scorch', 'fireBlast', 'arcaneMissiles', 'arcaneBlast', 'arcaneWrath', 'frostbolt', 'coneOfCold'],
  arcaneFire: ['arcaneExplosion', 'pyroblast', 'fireBlast', 'arcaneWrath', 'arcaneBlast', 'scorch', 'arcaneMissiles', 'frostbolt', 'coneOfCold'],
  arms: ['heroicStrike', 'whirlwind', 'sunderArmor', 'rend', 'overpower', 'mortalStrike', 'slam', 'execute', 'spearingStrike', 'cleave', 'hamstring'],
  assassination: ['backstab', 'ambush', 'venom', 'sliceAndDice', 'mutilate', 'eviscerate', 'garrote', 'rupture', 'sinisterStrike'],
  balance: ['insectSwarm', 'starfire', 'wrath', 'moonfire', 'hurricane'],
  bearHybrid: ['demoralizingRoar', 'maul', 'lacerate', 'primalBite', 'swipe', 'faerieFire'],
  beastMastery: ['striderKick', 'wingClip', 'scorpidSting', 'explosiveTrap', 'multiShot', 'aimedShot', 'arcaneShot', 'summonHawk', 'serpentSting', 'huntersMark', 'immolationTrap', 'volley', 'raptorStrike', 'mongooseBite', 'counterattack'],
  bmWeave: ['striderKick', 'volley', 'huntersMark', 'explosiveTrap', 'serpentSting', 'multiShot', 'summonHawk', 'raptorStrike', 'arcaneShot', 'wingClip', 'immolationTrap', 'mongooseBite', 'aimedShot', 'scorpidSting', 'counterattack'],
  catHybrid: ['ravage', 'claw', 'ferociousBite', 'rip', 'shred', 'rake', 'shiftingPower', 'faerieFire', 'pounce'],
  combat: ['ambush', 'garrote', 'bladeFlurry', 'sliceAndDice', 'sinisterStrike', 'eviscerate', 'adrenalineRush', 'rupture', 'backstab'],
  combatBs: ['ambush', 'garrote', 'bladeFlurry', 'sliceAndDice', 'backstab', 'eviscerate', 'adrenalineRush', 'rupture', 'sinisterStrike'],
  combatMuti: ['venom', 'ambush', 'garrote', 'sliceAndDice', 'mutilate', 'eviscerate', 'bladeFlurry', 'rupture', 'sinisterStrike', 'backstab'],
  demoShadowBrand: ['hellfire', 'drainLife', 'curseOfElements', 'baneOfAgony', 'corruption', 'searingPain', 'shadowBolt', 'baneOfDoom', 'immolate', 'lifeTap', 'soulFire', 'drainSoul', 'rainOfFire'],
  demonology: ['hellfire', 'drainSoul', 'curseOfElements', 'baneOfAgony', 'immolate', 'baneOfDoom', 'searingPain', 'soulFire', 'corruption', 'lifeTap', 'drainLife', 'rainOfFire'],
  destruction: ['hellfire', 'drainLife', 'curseOfElements', 'baneOfDoom', 'corruption', 'immolate', 'incinerate', 'conflagrate', 'shadowburn', 'baneOfAgony', 'lifeTap', 'drainSoul', 'rainOfFire'],
  elemental: ['lightningBoltR8', 'searingTotem', 'flameShock', 'lightningBolt', 'lavaBurst', 'earthShock', 'chainLightning', 'fireNova', 'magmaTotem'],
  enhancement: ['fireNova', 'magmaTotem', 'flameShock', 'stormstrike', 'lightningBolt', 'earthShock', 'chainLightning'],
  feralBear: ['demoralizingRoar', 'maul', 'lacerate', 'primalBite', 'swipe', 'faerieFire'],
  feralCat: ['ravage', 'claw', 'ferociousBite', 'rip', 'shred', 'rake', 'shiftingPower', 'faerieFire', 'pounce'],
  ffb: ['arcaneBlast', 'arcaneMissiles', 'pyroblast', 'scorch', 'frostfireBolt', 'fireBlast', 'fireball', 'iceLance'],
  fire: ['flamestrike', 'frostbolt', 'pyroblast', 'scorch', 'fireball', 'fireBlast', 'arcaneBlast', 'arcaneMissiles', 'blastWave'],
  frost: ['scorch', 'blizzard', 'arcaneBlast', 'iceLance', 'frostbolt', 'coneOfCold', 'arcaneMissiles', 'fireBlast'],
  fury: ['rend', 'overpower', 'sunderArmor', 'whirlwind', 'bloodthirst', 'heroicStrike', 'execute', 'cleave', 'hamstring'],
  holyPaladin: ['oathOfLight', 'holyShockHeal', 'flashOfLight', 'holyLight', 'lightsVigil', 'cleanse'],
  holyPriest: ['prayerOfHealing', 'renew', 'flashHeal', 'heal', 'greaterHeal', 'powerWordShield'],
  holyShock: ['hammerOfWrath', 'sealOfRighteousness', 'holyStrike', 'judgement', 'consecration', 'holyShock', 'exorcism'],
  marksmanship: ['striderKick', 'wingClip', 'scorpidSting', 'volley', 'immolationTrap', 'huntersMark', 'arcaneShot', 'aimedShot', 'serpentSting', 'multiShot', 'explosiveTrap', 'sniperShot', 'raptorStrike', 'mongooseBite', 'counterattack'],
  mmWeave: ['scorpidSting', 'volley', 'wingClip', 'explosiveTrap', 'immolationTrap', 'striderKick', 'arcaneShot', 'raptorStrike', 'multiShot', 'serpentSting', 'mongooseBite', 'huntersMark', 'aimedShot', 'sniperShot', 'counterattack'],
  prot: ['execute', 'cleave', 'thunderClap', 'shieldBlock', 'shieldSlam', 'revenge', 'sunderArmor', 'heroicStrike', 'demoralizingShout', 'rend'],
  protPaladin: ['holyShock', 'sealOfFury', 'consecration', 'judgement', 'holyShield', 'holyStrike', 'exorcism'],
  restoDruid: ['removeCurse', 'healingTouch', 'rejuvenation', 'regrowth', 'swiftmend', 'abolishPoison'],
  restoShaman: ['curePoison', 'lesserHealingWave', 'riptide', 'chainHeal', 'healingWave', 'cureDisease'],
  retribution: ['sealOfTheCrusader', 'hammerOfWrath', 'sealOfCommand', 'judgement', 'holyStrike', 'sealOfRighteousness', 'consecration', 'exorcism'],
  shadow: ['devouringPlague', 'shadowWordPain', 'mindBlast', 'mindFlay', 'shadowWordDeath'],
  smRuin: ['hellfire', 'drainSoul', 'wrack', 'baneOfDoom', 'immolate', 'corruption', 'shadowBolt', 'baneOfAgony', 'siphonLife', 'curseOfElements', 'lifeTap', 'drainLife', 'rainOfFire'],
  smite: ['holyNova', 'shadowWordPain', 'holyFire', 'smite', 'penance', 'smiteR5', 'holyFireR5', 'wand'],
  subBs: ['ghostlyStrike', 'sliceAndDice', 'hemorrhage', 'rupture', 'backstab', 'eviscerate', 'ambush', 'garrote', 'sinisterStrike'],
  subtlety: ['backstab', 'ghostlyStrike', 'sliceAndDice', 'rupture', 'hemorrhage', 'eviscerate', 'garrote', 'ambush', 'sinisterStrike'],
  survival: ['striderKick', 'wingClip', 'scorpidSting', 'volley', 'immolationTrap', 'huntersMark', 'multiShot', 'arcaneShot', 'serpentSting', 'aimedShot', 'explosiveTrap', 'sniperShot', 'raptorStrike', 'mongooseBite', 'counterattack'],
  svMelee: ['arcaneShot', 'huntersMark', 'summonHawk', 'immolationTrap', 'mongooseBite', 'raptorStrike', 'striderKick', 'explosiveTrap', 'wingClip', 'serpentSting', 'multiShot'],
  svWeave: ['counterattack', 'sniperShot', 'wingClip', 'explosiveTrap', 'immolationTrap', 'striderKick', 'arcaneShot', 'raptorStrike', 'multiShot', 'serpentSting', 'mongooseBite', 'huntersMark', 'volley', 'scorpidSting'],
};
for (const [spec, main] of Object.entries(MAIN_BARS)) {
  if (!SPECS[spec]) continue;
  const moved = new Set(main);
  SPECS[spec].bars = Object.fromEntries(Object.entries(SPECS[spec].bars).map(([k, ids]) => [k, k === 'main' ? [...main] : ids.filter((id) => !moved.has(id))]));
}

// A spec's base (the spec it is a build of), and the builds of a base in menu order.
export const baseSpec = (spec) => (SPECS[spec] && SPECS[spec].base) || spec;
export const buildsOf = (base) => Object.keys(SPECS).filter((k) => baseSpec(k) === base);

// ---- professions ------------------------------------------------------------------------------------------------
// The two professions (js/wowsims.js PROFESSIONS): each spec's as its wowsims preset has them (ui/specs/*/presets.ts
// OtherDefaults), by class with the specs that differ; the hunter and rogue presets take none.
const CLASS_PROFESSIONS = {
  warrior: ['Engineering', 'Blacksmithing'], mage: ['Engineering', 'Tailoring'], warlock: ['Engineering', 'Tailoring'],
  paladin: ['Engineering', 'Blacksmithing'], priest: ['Enchanting', 'Tailoring'], shaman: ['Leatherworking', 'Enchanting'],
  druid: ['Engineering', 'Enchanting'],
};
const SPEC_PROFESSIONS = {
  protPaladin: ['Engineering', 'Enchanting'], holyPaladin: ['Enchanting'], holyPriest: ['Tailoring', 'Enchanting'],
  enhancement: ['Engineering', 'Leatherworking'], balance: ['Enchanting', 'Tailoring'], restoDruid: ['Tailoring', 'Enchanting'],
};
for (const [spec, def] of Object.entries(SPECS)) {
  def.loadout = { ...def.loadout, professions: SPEC_PROFESSIONS[spec] || SPEC_PROFESSIONS[baseSpec(spec)] || CLASS_PROFESSIONS[def.classId || 'warrior'] || [] };
}

export const DEFAULT_SPEC = 'fury';
