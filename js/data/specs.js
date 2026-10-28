// The warrior specs the trainer plays. Each has its own saved character (gear, talents, consumables), keybinds,
// action bar layout and APL; switching the spec in the top bar swaps all of them.
import { DEFAULT_LOADOUT } from '../character.js';
import { DEFAULT_APL } from './fury-apl.js';
import { ARMS_APL } from './arms-apl.js';
import { PROT_APL } from './prot-apl.js';

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

export const SPECS = {
  fury: {
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
};

export const DEFAULT_SPEC = 'fury';
