// Keybind presets, per class and spec. A spec added later gets its own list under its key; the
// player's own presets are stored per spec as well (main.js).
import { ABILITIES, ALL_ACTIONS } from './warrior.js';
import { ABILITIES as ROGUE_ABILITIES, ALL_ACTIONS as ROGUE_ACTIONS } from './rogue.js';
import { ABILITIES as MAGE_ABILITIES, ALL_ACTIONS as MAGE_ACTIONS } from './mage.js';
import { ABILITIES as PALADIN_ABILITIES, ALL_ACTIONS as PALADIN_ACTIONS } from './paladin.js';
import { ABILITIES as PRIEST_ABILITIES, ALL_ACTIONS as PRIEST_ACTIONS } from './priest.js';
import { ABILITIES as SHAMAN_ABILITIES, ALL_ACTIONS as SHAMAN_ACTIONS } from './shaman.js';
import { ABILITIES as DRUID_ABILITIES, ALL_ACTIONS as DRUID_ACTIONS } from './druid.js';
import { ABILITIES as FERAL_ABILITIES } from './feral.js';
import { ABILITIES as WARLOCK_ABILITIES, ALL_ACTIONS as WARLOCK_ACTIONS } from './warlock.js';
import { ABILITIES as HUNTER_ABILITIES, ALL_ACTIONS as HUNTER_ACTIONS } from './hunter.js';

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

// Paladin: each ability's own key, with the spec's changes.
const paladinKeys = (changes) => ({ ...Object.fromEntries(PALADIN_ACTIONS.map((id) => [id, PALADIN_ABILITIES[id].key || ''])), ...changes });

// Mage: the spec's main spells on 1-4, the rest on their own keys.
function mageKeys(main) {
  const keys = Object.fromEntries(MAGE_ACTIONS.map((id) => [id, MAGE_ABILITIES[id].key || '']));
  for (const id of ['frostbolt', 'fireball', 'arcaneBlast', 'arcaneMissiles', 'arcaneWrath', 'scorch', 'fireBlast', 'pyroblast', 'coneOfCold', 'iceLance']) keys[id] = '';
  const spare = ['Q', 'E', 'Shift+1', 'Shift+2', 'Shift+3', 'Shift+4'];
  main.forEach((id, i) => { keys[id] = String(i + 1); });
  for (const id of ['frostbolt', 'fireball', 'arcaneBlast', 'arcaneMissiles', 'arcaneWrath', 'scorch', 'fireBlast', 'pyroblast', 'coneOfCold', 'iceLance']) if (!keys[id]) keys[id] = spare.shift() || '';
  return keys;
}

function warlockKeys(main) {
  const keys = Object.fromEntries(WARLOCK_ACTIONS.map((id) => [id, WARLOCK_ABILITIES[id].spell ? '' : WARLOCK_ABILITIES[id].key || '']));
  main.forEach((id, i) => { keys[id] = ['1', '2', '3', '4', '5', '6'][i]; });
  keys.curseOfElements = 'T';
  keys.deathCoil = 'F';
  if (!keys.baneOfAgony) keys.baneOfAgony = 'Q';
  if (!keys.baneOfDoom) keys.baneOfDoom = 'E';
  return keys;
}

// A feral form's keys: its own abilities on 1-6, the other form's unbound.
function feralKeys(main) {
  const keys = Object.fromEntries(Object.entries(FERAL_ABILITIES).map(([id, a]) => [id, a.form ? '' : a.key || '']));
  main.forEach((id, i) => { keys[id] = ['1', '2', '3', '4', '5', '6'][i]; });
  return keys;
}

// Built-in presets (read-only) per spec: the trainer's own keys and Ledski's.
export const BIND_PRESETS = {
  'rogue-assassination': [{ id: 'default', name: 'Default', binds: rogueKeys('mutilate') }],
  'rogue-combat': [{ id: 'default', name: 'Default', binds: rogueKeys('sinisterStrike') }],
  'rogue-subtlety': [{ id: 'default', name: 'Default', binds: rogueKeys('hemorrhage') }],
  'paladin-retribution': [{ id: 'default', name: 'Default', binds: paladinKeys({}) }],
  'paladin-holyShock': [{ id: 'default', name: 'Default', binds: paladinKeys({ holyShock: '1', judgement: '2', holyStrike: '3', sealOfRighteousness: '4', sealOfCommand: 'Shift+3' }) }],
  'paladin-protPaladin': [{ id: 'default', name: 'Default', binds: paladinKeys({ judgement: '1', holyShield: '2', consecration: '3', sealOfFury: '4', holyStrike: 'Q', holyShock: 'E', sealOfRighteousness: 'Shift+4' }) }],
  'mage-arcane': [{ id: 'default', name: 'Default', binds: mageKeys(['arcaneBlast', 'arcaneWrath', 'arcaneMissiles', 'frostbolt']) }],
  'mage-fire': [{ id: 'default', name: 'Default', binds: mageKeys(['fireball', 'scorch', 'fireBlast', 'pyroblast']) }],
  'mage-frost': [{ id: 'default', name: 'Default', binds: mageKeys(['frostbolt', 'iceLance', 'coneOfCold', 'arcaneMissiles']) }],
  'priest-shadow': [{ id: 'default', name: 'Default', binds: Object.fromEntries(PRIEST_ACTIONS.map((id) => [id, PRIEST_ABILITIES[id].key || ''])) }],
  'shaman-elemental': [{ id: 'default', name: 'Default', binds: Object.fromEntries(SHAMAN_ACTIONS.map((id) => [id, SHAMAN_ABILITIES[id].key || ''])) }],
  'shaman-enhancement': [{ id: 'default', name: 'Default', binds: { ...Object.fromEntries(SHAMAN_ACTIONS.map((id) => [id, ''])), stormstrike: '1', earthShock: '2', flameShock: '3', lightningBolt: '4', fireNova: '5', magmaTotem: 'Q', chainLightning: '6', windfuryTotem: 'T', strengthOfEarthTotem: 'R', manaSpringTotem: 'E', searingTotem: 'Shift+Q', rageOfTheFarseer: 'F', racial: 'B', trinket1: '7', trinket2: '8', weapon: 'V', potion: '9', conjured: '0' } }],
  'druid-balance': [{ id: 'default', name: 'Default', binds: Object.fromEntries(DRUID_ACTIONS.map((id) => [id, DRUID_ABILITIES[id].key || ''])) }],
  // A warlock spec: its own filler and damage over time on 1-6, the rest as the ability keys.
  'hunter-marksmanship': [{ id: 'default', name: 'Default', binds: Object.fromEntries(HUNTER_ACTIONS.map((id) => [id, HUNTER_ABILITIES[id].key || ''])) }],
  'hunter-survival': [{ id: 'default', name: 'Default', binds: { ...Object.fromEntries(HUNTER_ACTIONS.map((id) => [id, HUNTER_ABILITIES[id].key || ''])), multiShot: '1', aimedShot: '2' } }],
  'warlock-affliction': [{ id: 'default', name: 'Default', binds: warlockKeys(['shadowBolt', 'corruption', 'baneOfAgony', 'siphonLife', 'wrack', 'immolate']) }],
  'warlock-demonology': [{ id: 'default', name: 'Default', binds: warlockKeys(['searingPain', 'immolate', 'corruption', 'baneOfAgony', 'baneOfDoom', 'soulFire']) }],
  'warlock-destruction': [{ id: 'default', name: 'Default', binds: warlockKeys(['incinerate', 'immolate', 'conflagrate', 'shadowburn', 'corruption', 'baneOfDoom']) }],
  'druid-feralCat': [{ id: 'default', name: 'Default', binds: feralKeys(['shred', 'rake', 'rip', 'ferociousBite', 'claw', 'shiftingPower']) }],
  'druid-feralBear': [{ id: 'default', name: 'Default', binds: feralKeys(['lacerate', 'primalBite', 'maul', 'swipe']) }],
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
