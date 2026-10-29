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
import * as MAGE from './mage.js';
import { HOLY_SHOCK_APL, PROT_PALADIN_APL, RET_APL } from './paladin-apl.js';
import * as PALADIN from './paladin.js';
import { SHADOW_APL } from './priest-apl.js';
import * as PRIEST from './priest.js';

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
// rotation has it for these builds.
const ROGUE_LOADOUT = {
  ...DEFAULT_LOADOUT,
  classId: 'rogue',
  race: 'RaceHuman',
  consumables: ROGUE_CONSUMABLES,
  debuffs: { giftOfArthas: true, faerieFire: true, sunderArmor: true, curseOfRecklessness: true },
  trainer: { sunderHelp: false, warriors: 2 },
};
const ROGUE_BARS = (main) => ({ main, stances: [], cds: ['coldBlood', 'premeditation', 'vanish', 'preparation', 'bladeFlurry', 'adrenalineRush', 'kick', 'feint', 'evasion', 'stealth', 'racial', 'trinket1', 'trinket2', 'potion', 'conjured'] });
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
const PALADIN_BARS = (main, cds) => ({ main, stances: [], cds: [...cds, 'racial', 'trinket1', 'trinket2', 'weapon', 'potion', 'conjured'] });
const MAGE_BARS = (main) => ({ main, stances: [], cds: ['arcanePower', 'presenceOfMind', 'combustion', 'coldSnap', 'iceBarrier', 'evocation', 'mageArmor', 'manaGem', 'racial', 'trinket1', 'trinket2', 'potion'] });
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

export const SPECS = {
  fury: {
    classId: 'warrior',
    name: 'Fury',
    loadout: DEFAULT_LOADOUT,
    apl: DEFAULT_APL,
    startStance: 'berserker',
    bars: {
      main: ['bloodthirst', 'whirlwind', 'execute', 'heroicStrike', 'cleave', 'overpower', 'rend', 'hamstring', 'sunderArmor'],
      stances: ['battleStance', 'berserkerStance'],
      cds: ['charge', 'intercept', 'deathWish', 'recklessness', 'berserkerRage', 'bloodrage', 'racial', 'trinket1', 'trinket2', 'potion', 'explosive', 'battleShout'],
    },
  },
  arms: {
    classId: 'warrior',
    name: 'Arms',
    // wowsims ArmsTalents and ArmsConsumables: the two-hander (an axe) takes the sharpening stone, there is no off hand.
    loadout: {
      ...DEFAULT_LOADOUT,
      items: ARMS_GEAR,
      talentsString: '30325213132515201-0505-2',
      consumables: { ...DEFAULT_LOADOUT.consumables, mhImbueId: 12404, ohImbueId: 0 },
    },
    apl: ARMS_APL,
    startStance: 'battle',
    bars: {
      main: ['mortalStrike', 'slam', 'overpower', 'rend', 'execute', 'whirlwind', 'heroicStrike', 'cleave', 'hamstring', 'sunderArmor'],
      stances: ['battleStance', 'berserkerStance'],
      cds: ['charge', 'intercept', 'sweepingStrikes', 'spearingStrike', 'deathWish', 'recklessness', 'berserkerRage', 'bloodrage', 'racial', 'trinket1', 'trinket2', 'potion', 'explosive', 'battleShout'],
    },
  },
  prot: {
    classId: 'warrior',
    name: 'Protection',
    // wowsims ProtectionTalents and DefaultConsumables (ui/specs/warrior/protection/presets.ts), with the trainer's
    // potion slot on the Mighty Rage Potion. The tank keeps Sunder Armor up itself, so no other warriors sunder.
    loadout: {
      ...DEFAULT_LOADOUT,
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
      cds: ['charge', 'taunt', 'bloodrage', 'shieldWall', 'lastStand', 'concussionBlow', 'shieldBash', 'berserkerRage', 'racial', 'trinket1', 'trinket2', 'potion', 'battleShout'],
    },
  },
  assassination: {
    classId: 'rogue',
    name: 'Assassination',
    // Asn Muti: daggers in both hands, Mutilate, Venom and Seal Fate.
    loadout: { ...ROGUE_LOADOUT, items: ROGUE_GEAR.muti, talentsString: '00532310151501031-302303202014' },
    apl: ROGUE_SPEC_APL,
    bars: ROGUE_BARS(['mutilate', 'sliceAndDice', 'venom', 'eviscerate', 'rupture', 'garrote', 'ambush', 'sinisterStrike', 'backstab']),
  },
  combat: {
    classId: 'rogue',
    name: 'Combat',
    // Combat SS: a slow main hand, Sinister Strike, Blade Flurry and Adrenaline Rush.
    loadout: { ...ROGUE_LOADOUT, items: ROGUE_GEAR.slowMh, talentsString: '005323101012-32030320201515231' },
    apl: ROGUE_SPEC_APL,
    bars: ROGUE_BARS(['sinisterStrike', 'sliceAndDice', 'eviscerate', 'rupture', 'garrote', 'ambush', 'backstab', 'bladeFlurry', 'adrenalineRush']),
  },
  subtlety: {
    classId: 'rogue',
    name: 'Subtlety',
    // Subtlety Hemo: a slow main hand, Hemorrhage, Ghostly Strike, Premeditation, Preparation and Thousand Cuts.
    loadout: { ...ROGUE_LOADOUT, items: ROGUE_GEAR.slowMh, talentsString: '005323101014--4323200300013211501' },
    apl: ROGUE_SPEC_APL,
    bars: ROGUE_BARS(['hemorrhage', 'sliceAndDice', 'rupture', 'eviscerate', 'ghostlyStrike', 'garrote', 'ambush', 'sinisterStrike', 'backstab']),
  },
  arcane: {
    classId: 'mage',
    name: 'Arcane',
    // Arcane Frost: Arcane Blast for Arcane Charges, Arcane Wrath with Presence of Mind, Missile Barrage, Frostbolt filler.
    loadout: { ...MAGE_LOADOUT, talentsString: '0552205003100311531-03-0533' },
    apl: ARCANE_APL,
    bars: MAGE_BARS(['arcaneBlast', 'arcaneWrath', 'arcaneMissiles', 'frostbolt', 'fireBlast', 'scorch', 'coneOfCold']),
  },
  fire: {
    classId: 'mage',
    name: 'Fire',
    // Deep Fire: Scorch to 5 Fire Vulnerability, Fire Blast, Pyroblast on 3 Heating Up, Fireball.
    loadout: { ...MAGE_LOADOUT, talentsString: '05022050001001-23550000130135031-003' },
    apl: FIRE_APL,
    bars: MAGE_BARS(['fireball', 'scorch', 'fireBlast', 'pyroblast', 'arcaneBlast', 'arcaneMissiles', 'frostbolt']),
  },
  frost: {
    classId: 'mage',
    name: 'Frost',
    // Frost: Frostbolt, Cone of Cold with Cold Snap, Ice Lance on Fingers of Frost, Ice Barrier up.
    loadout: { ...MAGE_LOADOUT, talentsString: '05022050011003--053500021100331251' },
    apl: FROST_APL,
    bars: MAGE_BARS(['frostbolt', 'iceLance', 'coneOfCold', 'arcaneBlast', 'arcaneMissiles', 'fireBlast', 'scorch']),
  },
  retribution: {
    classId: 'paladin',
    name: 'Retribution',
    // Two-hander, Seal of Command with Judgement of the Crusader kept on the target (Twist of Light talents).
    loadout: { ...PALADIN_LOADOUT, items: PALADIN.GEAR.ret, talentsString: '55003003--05225331101330321', consumables: PALADIN.CONSUMABLES.ret },
    apl: RET_APL,
    bars: PALADIN_BARS(['judgement', 'holyStrike', 'sealOfCommand', 'sealOfTheCrusader', 'hammerOfWrath', 'exorcism', 'consecration'], ['sealOfRighteousness']),
  },
  holyShock: {
    classId: 'paladin',
    name: 'Holy Shock',
    // The Holy Shock Retribution build: Seal of Righteousness, Holy Shock, Champion of the Light (Intellect as spell damage).
    loadout: { ...PALADIN_LOADOUT, items: PALADIN.GEAR.holyShock, talentsString: '550030032101012--052252300012303', consumables: PALADIN.CONSUMABLES.ret },
    apl: HOLY_SHOCK_APL,
    bars: PALADIN_BARS(['holyShock', 'judgement', 'sealOfRighteousness', 'holyStrike', 'consecration', 'exorcism', 'hammerOfWrath'], ['sealOfCommand', 'sealOfTheCrusader']),
  },
  protPaladin: {
    classId: 'paladin',
    name: 'Protection',
    // The wowsims Protection preset: a one-hander and a shield, Seal of Fury, Holy Shield, Consecration; scored on threat.
    loadout: { ...PALADIN_LOADOUT, items: PALADIN.GEAR.prot, talentsString: '50003-0530313321301531-5022', consumables: PALADIN.CONSUMABLES.prot },
    apl: PROT_PALADIN_APL,
    metric: 'tps',
    tank: true,
    bars: PALADIN_BARS(['judgement', 'sealOfFury', 'consecration', 'holyShield', 'holyShock', 'holyStrike', 'exorcism'], ['swiftJudgement', 'righteousFury', 'sealOfTheCrusader', 'sealOfRighteousness']),
  },
  shadow: {
    classId: 'priest',
    name: 'Shadow',
    // Shadowform: Shadow Word: Pain and Devouring Plague kept up, Mind Blast (with Inner Focus), Shadow Word: Death, Mind Flay.
    loadout: { ...PRIEST_LOADOUT, talentsString: PRIEST.DEFAULT_TALENTS },
    apl: SHADOW_APL,
    bars: { main: ['shadowWordPain', 'devouringPlague', 'mindBlast', 'mindFlay', 'shadowWordDeath'], stances: [], cds: ['shadowform', 'innerFocus', 'racial', 'trinket1', 'trinket2', 'potion', 'conjured'] },
  },
};

export const DEFAULT_SPEC = 'fury';
