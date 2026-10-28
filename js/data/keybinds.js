// Keybind presets, per class and spec. A spec added later gets its own list under its key; the
// player's own presets are stored per spec as well (main.js).
import { ABILITIES, ALL_ACTIONS } from './warrior.js';

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

// Built-in presets (read-only) per spec: the trainer's own keys and Ledski's.
export const BIND_PRESETS = {
  'warrior-fury': [
    { id: 'default', name: 'Default', binds: DEFAULT_KEYS },
    { id: 'ledski', name: 'Ledski', binds: LEDSKI_KEYS },
  ],
  'warrior-arms': [
    { id: 'default', name: 'Default', binds: { ...DEFAULT_KEYS, ...ARMS_DEFAULT } },
    { id: 'ledski', name: 'Ledski', binds: { ...LEDSKI_KEYS, ...ARMS_LEDSKI } },
  ],
};
