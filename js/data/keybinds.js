// Keybind presets, per class and spec. A spec added later gets its own list under its key; the
// player's own presets are stored per spec as well (main.js).
import { ABILITIES, ALL_ACTIONS } from './warrior.js';
import { ABILITIES as ROGUE_ABILITIES, ALL_ACTIONS as ROGUE_ACTIONS } from './rogue.js';
import { ABILITIES as MAGE_ABILITIES, ALL_ACTIONS as MAGE_ACTIONS } from './mage.js';

export const SPEC_KEY = 'warrior-fury';

// Ledski's in-game binds, from his Myslot export ("Warrior Myslot.txt"), for the abilities the APL uses. Each
// key is the one on the action bar slot holding that spell or its macro (ACTIONBUTTON1-12 = slots 1-12,
// MULTIACTIONBAR1 = 61-72, MULTIACTIONBAR2 = 49-60). The racial and the second trinket have no slot there
// (his TRI macro on Shift+R uses both trinkets), so they are left unbound.
const LEDSKI = {
  rend: '1', sunderArmor: '2', overpower: '3',                  // Rend, SA, OP
  bloodthirst: 'Q', whirlwind: 'E', hamstring: 'R',             // BMR, WSS, HAM
  deathWish: 'T', execute: 'F',                                 // *-*, Exe
  heroicStrike: 'Wheel Up', cleave: 'Wheel Down',               // HS, Clea
  battleShout: 'Shift+2', berserkerRage: 'Shift+Q',             // BS, TCB
  bloodrage: 'Shift+E', trinket1: 'Shift+R', potion: 'Shift+F', // Blod, TRI, Rage
  recklessness: 'Y',                                            // Reck
  charge: 'C', battleStance: '9', berserkerStance: 'Mouse 5',   // Char, Bat, Rat
  explosive: 'Alt+Q',                                           // SAP (Goblin Sapper Charge)
  trinket2: '', racial: '',
};

const DEFAULT_KEYS = Object.fromEntries(ALL_ACTIONS.map((id) => [id, ABILITIES[id].key || '']));
const LEDSKI_KEYS = Object.fromEntries(ALL_ACTIONS.map((id) => [id, LEDSKI[id] ?? '']));
// Arms: Mortal Strike and Slam take Bloodthirst's and Whirlwind's keys.
const ARMS_DEFAULT = { bloodthirst: '', mortalStrike: '1', slam: '2', whirlwind: 'Shift+2' };
const ARMS_LEDSKI = { bloodthirst: '', mortalStrike: LEDSKI.bloodthirst, slam: LEDSKI.whirlwind, whirlwind: '' };
// Protection: Shield Slam and Revenge on the rotation keys, Defensive Stance where Berserker Stance was.
const PROT_DEFAULT = {
  bloodthirst: '', whirlwind: '', overpower: '', deathWish: '', recklessness: '', berserkerRage: '', hamstring: '', sweepingStrikes: '', spearingStrike: '',
  shieldSlam: '1', revenge: '2', thunderClap: '6', demoralizingShout: 'F', shieldBlock: 'R', defensiveStance: 'X', berserkerStance: 'C',
  lastStand: 'Shift+R', shieldWall: 'Shift+F', taunt: 'T', concussionBlow: 'K', shieldBash: 'L',
};
const PROT_LEDSKI = {
  bloodthirst: '', whirlwind: '', hamstring: '', deathWish: '', recklessness: '', berserkerRage: '',
  shieldSlam: LEDSKI.bloodthirst, revenge: LEDSKI.whirlwind, shieldBlock: LEDSKI.hamstring, thunderClap: LEDSKI.berserkerRage,
  demoralizingShout: LEDSKI.deathWish, defensiveStance: LEDSKI.berserkerStance, berserkerStance: '', taunt: LEDSKI.recklessness,
};

// Rogue: one key per ability; each spec's builder on 1 (Mutilate, Sinister Strike or Hemorrhage).
const ROGUE_KEYS = Object.fromEntries(ROGUE_ACTIONS.map((id) => [id, ROGUE_ABILITIES[id].key || '']));
const rogueKeys = (builder) => ({ ...ROGUE_KEYS, mutilate: '', sinisterStrike: '', hemorrhage: '', [builder]: '1', backstab: builder === 'sinisterStrike' ? '2' : 'Shift+1' });

// Mage: the spec's main spells on 1-4, the rest on their own keys.
function mageKeys(main) {
  const keys = Object.fromEntries(MAGE_ACTIONS.map((id) => [id, MAGE_ABILITIES[id].key || '']));
  for (const id of ['frostbolt', 'fireball', 'arcaneBlast', 'arcaneMissiles', 'arcaneWrath', 'scorch', 'fireBlast', 'pyroblast', 'coneOfCold', 'iceLance']) keys[id] = '';
  const spare = ['Q', 'E', 'Shift+1', 'Shift+2', 'Shift+3', 'Shift+4'];
  main.forEach((id, i) => { keys[id] = String(i + 1); });
  for (const id of ['frostbolt', 'fireball', 'arcaneBlast', 'arcaneMissiles', 'arcaneWrath', 'scorch', 'fireBlast', 'pyroblast', 'coneOfCold', 'iceLance']) if (!keys[id]) keys[id] = spare.shift() || '';
  return keys;
}

// Built-in presets (read-only) per spec: the trainer's own keys and Ledski's.
export const BIND_PRESETS = {
  'rogue-assassination': [{ id: 'default', name: 'Default', binds: rogueKeys('mutilate') }],
  'rogue-combat': [{ id: 'default', name: 'Default', binds: rogueKeys('sinisterStrike') }],
  'rogue-subtlety': [{ id: 'default', name: 'Default', binds: rogueKeys('hemorrhage') }],
  'mage-arcane': [{ id: 'default', name: 'Default', binds: mageKeys(['arcaneBlast', 'arcaneWrath', 'arcaneMissiles', 'frostbolt']) }],
  'mage-fire': [{ id: 'default', name: 'Default', binds: mageKeys(['fireball', 'scorch', 'fireBlast', 'pyroblast']) }],
  'mage-frost': [{ id: 'default', name: 'Default', binds: mageKeys(['frostbolt', 'iceLance', 'coneOfCold', 'arcaneMissiles']) }],
  'warrior-fury': [
    { id: 'default', name: 'Default', binds: DEFAULT_KEYS },
    { id: 'ledski', name: 'Ledski', binds: LEDSKI_KEYS },
  ],
  'warrior-arms': [
    { id: 'default', name: 'Default', binds: { ...DEFAULT_KEYS, ...ARMS_DEFAULT } },
    { id: 'ledski', name: 'Ledski', binds: { ...LEDSKI_KEYS, ...ARMS_LEDSKI } },
  ],
  'warrior-prot': [
    { id: 'default', name: 'Default', binds: { ...DEFAULT_KEYS, ...PROT_DEFAULT } },
    { id: 'ledski', name: 'Ledski', binds: { ...LEDSKI_KEYS, ...PROT_LEDSKI } },
  ],
};
