// Import and export in the wowsims/forever "Export -> JSON" format (IndividualSimSettings).
import { RACES } from './data/warrior.js';
import { DEFAULT_TALENTS } from './active-class.js';
import { RENAMED_RAID_BUFFS, effectLevel } from './data/buffs.js';

const SLOT_COUNT = 17; // proto ItemSlot
const MH_SLOT = 14;
const OH_SLOT = 15;

// Raid buffs between wowsims' field names and the keys here (RENAMED_RAID_BUFFS): an export's new names read as ours,
// and ours go out under wowsims' current names.
function renameKeys(obj, map) {
  if (!obj) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[map[k] || k] = v;
  return out;
}
const RAID_BUFF_KEYS = Object.fromEntries(Object.entries(RENAMED_RAID_BUFFS).map(([field, key]) => [key, field]));

// The buff and debuff fields wowsims holds as a number (proto/buffs.proto: a rank, a count, an amount or a
// TristateEffect); the rest are bools. A saved loadout can have an older form (the totems and Greater Blessings were
// bools until wowsims b6657d3), and one value of the wrong type makes wowsims refuse the whole import.
const NUMERIC_BUFFS = new Set(['strengthOfEarthTotem', 'graceOfAirTotem', 'battleShout', 'manaSpringTotem', 'manaTideTotems', 'retributionAuraSpellPower',
  'atieshMage', 'atieshWarlock', 'atieshDruid', 'atieshPriest', 'stoneskinTotem', 'darkInspiration', 'greaterBlessingOfMight', 'greaterBlessingOfWisdom',
  'innervates', 'powerInfusions', 'thornsSpellPower']);
function buffFields(obj) {
  if (!obj) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = !NUMERIC_BUFFS.has(k) ? !!v : typeof v === 'number' ? v : effectLevel(v);
  return out;
}

const raceByNumber = Object.fromEntries(Object.entries(RACES).map(([key, r]) => [r.id, key]));
// The professions by their proto Profession number (proto/common.proto; 7 was Jewelcrafting, retired). They go to the
// wowsims sim and into exports; the sim gates profession items and enchants on them.
const PROFESSION_NAMES = [null, 'Alchemy', 'Blacksmithing', 'Enchanting', 'Engineering', 'Herbalism', 'Inscription', null, 'Leatherworking', 'Mining', 'Skinning', 'Tailoring'];
export const PROFESSIONS = PROFESSION_NAMES.filter(Boolean);

// Finds the player settings in a pasted wowsims export. Accepts the full IndividualSimSettings JSON or
// just its "player" object.
export function parseWowsimsExport(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Paste a wowsims JSON export first.');
  if (/^https?:\/\//.test(trimmed)) {
    throw new Error('That is a wowsims link. In wowsims use Export -> JSON instead and paste the JSON here.');
  }
  let root;
  try {
    root = JSON.parse(trimmed);
  } catch {
    throw new Error('This is not valid JSON. In wowsims use Export -> JSON and copy the whole text.');
  }
  const player = root.player || (root.equipment ? root : null);
  if (!player) throw new Error('No "player" section found. Is this a wowsims individual sim export?');

  let race = player.race;
  if (typeof race === 'number') race = raceByNumber[race];
  // Professions by name ("Engineering") or by proto number; none set is none.
  const professions = [player.profession1, player.profession2]
    .map((p) => (typeof p === 'number' ? PROFESSION_NAMES[p] : p))
    .filter((p) => PROFESSIONS.includes(p));

  const itemSpec = (it) => ({
    id: (it && it.id) || 0,
    enchant: (it && it.enchant) || 0,
    randomSuffix: (it && it.randomSuffix) || 0,
  });
  const items = ((player.equipment && player.equipment.items) || []).map(itemSpec);

  // The item swap set (Player.enable_item_swap, item_swap), all its slots and its pre-pull stats kept for the way back;
  // left out when it has no items.
  const swapItems = ((player.itemSwap && player.itemSwap.items) || []).map(itemSpec);
  const itemSwap = swapItems.some((it) => it.id) ? { enableItemSwap: !!player.enableItemSwap, itemSwap: { ...player.itemSwap, items: swapItems } } : {};

  return {
    race: race || 'RaceOrc',
    professions,
    items,
    ...itemSwap,
    talentsString: player.talentsString || DEFAULT_TALENTS,
    consumables: player.consumables || {},
    buffs: player.buffs || {},
    raidBuffs: renameKeys(root.raidBuffs, RENAMED_RAID_BUFFS) || {},
    partyBuffs: root.partyBuffs || {},
    debuffs: root.debuffs || {},
    name: player.name || '',
    source: root,
  };
}

// Builds a wowsims JSON export from a loadout. An imported export keeps all its other settings
// (rotation, encounter, ...) so it round-trips; only race, professions, gear and talents are written over.
export function toWowsimsExport(loadout) {
  const root = loadout.source ? structuredClone(loadout.source) : {};
  const player = root.player || (root.player = {});
  player.race = loadout.race;
  const [profession1, profession2] = loadout.professions || [];
  for (const [key, p] of [['profession1', profession1], ['profession2', profession2]]) {
    if (p) player[key] = p; else delete player[key];
  }
  // wowsims' JSON import takes race and professions with its "Miscellaneous" settings, which it only loads when the
  // export has a healing model (ui/sim/state/serialization.ts); so there always is one, and its reaction time.
  player.healingModel = player.healingModel || {};
  player.reactionTimeMs = player.reactionTimeMs || 100;
  player.class = player.class || 'ClassWarrior';
  const itemJson = (it) => {
    const o = { id: it.id };
    if (it.enchant) o.enchant = it.enchant;
    if (it.randomSuffix) o.randomSuffix = it.randomSuffix;
    return o;
  };
  player.equipment = { items: loadout.items.map(itemJson) };
  player.talentsString = loadout.talentsString;
  let consumables = loadout.consumables;
  if (loadout.itemSwap && (loadout.itemSwap.items || []).some((it) => it && it.id)) {
    player.enableItemSwap = !!loadout.enableItemSwap;
    const swap = Array.from({ length: SLOT_COUNT }, (_, slot) => {
      const it = loadout.itemSwap.items[slot];
      return it && it.id ? itemJson(it) : {};
    });
    // wowsims swaps the main hand along with an off hand, so a set with an empty one would take your weapon off
    // (sim/core/item_swaps.go): the set holds the one you wear, with its stone and poison.
    const worn = loadout.items[MH_SLOT];
    if (swap[OH_SLOT].id && !swap[MH_SLOT].id && worn && worn.id) {
      swap[MH_SLOT] = itemJson(worn);
      consumables = { ...consumables, swapMhImbueId: (consumables || {}).mhImbueId || 0, swapMhWeaponImbueId: (consumables || {}).mhWeaponImbueId || 0 };
    }
    player.itemSwap = { ...loadout.itemSwap, items: swap };
  } else {
    delete player.enableItemSwap;
    delete player.itemSwap;
  }
  if (consumables) player.consumables = consumables;
  player.buffs = buffFields(loadout.buffs || player.buffs);
  root.raidBuffs = buffFields(renameKeys(loadout.raidBuffs, RAID_BUFF_KEYS) || root.raidBuffs);
  root.partyBuffs = buffFields(loadout.partyBuffs || root.partyBuffs);
  root.debuffs = buffFields(loadout.debuffs || root.debuffs);
  return JSON.stringify(root, null, 2);
}
