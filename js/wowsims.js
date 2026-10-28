// Import and export in the wowsims/forever "Export -> JSON" format (IndividualSimSettings).
import { DEFAULT_TALENTS, RACES } from './data/warrior.js';

const raceByNumber = Object.fromEntries(Object.entries(RACES).map(([key, r]) => [r.id, key]));

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

  const items = ((player.equipment && player.equipment.items) || []).map((it) => ({
    id: it.id || 0,
    enchant: it.enchant || 0,
    randomSuffix: it.randomSuffix || 0,
  }));

  return {
    race: race || 'RaceOrc',
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
// (rotation, encounter, ...) so it round-trips; only race, gear and talents are written over.
export function toWowsimsExport(loadout) {
  const root = loadout.source ? structuredClone(loadout.source) : {};
  const player = root.player || (root.player = {});
  player.race = loadout.race;
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
