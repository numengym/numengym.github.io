// Import and export in the wowsims/forever "Export -> JSON" format (IndividualSimSettings).
import { RACES } from './data/warrior.js';
import { DEFAULT_TALENTS } from './active-class.js';

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

  const items = ((player.equipment && player.equipment.items) || []).map((it) => ({
    id: it.id || 0,
    enchant: it.enchant || 0,
    randomSuffix: it.randomSuffix || 0,
  }));

  return {
    race: race || 'RaceOrc',
    professions,
    items,
    talentsString: player.talentsString || DEFAULT_TALENTS,
    consumables: player.consumables || {},
    buffs: player.buffs || {},
    raidBuffs: root.raidBuffs || {},
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
  player.equipment = {
    items: loadout.items.map((it) => {
      const o = { id: it.id };
      if (it.enchant) o.enchant = it.enchant;
      if (it.randomSuffix) o.randomSuffix = it.randomSuffix;
      return o;
    }),
  };
  player.talentsString = loadout.talentsString;
  if (loadout.consumables) player.consumables = loadout.consumables;
  if (loadout.buffs) player.buffs = loadout.buffs;
  root.raidBuffs = loadout.raidBuffs || root.raidBuffs;
  root.partyBuffs = loadout.partyBuffs || root.partyBuffs;
  root.debuffs = loadout.debuffs || root.debuffs;
  return JSON.stringify(root, null, 2);
}
