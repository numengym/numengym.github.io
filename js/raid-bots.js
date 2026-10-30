// NPC raiders: the raid filled out to its size (the ready room, Settings → Fight) with players of the trainer's own,
// each a DPS spec on its wowsims preset playing its APL on the boss (tank-bot.js TankBot, not tanking), in a mix like a
// real raid's. main.js draws them, puts them on the raid frames, lets their damage come off a shared health pool and
// has them react to the boss's mechanics: mostly in time, now and then not (each one's skill roll).

// The order the raid fills in: a melee and a caster in turn, every class before any comes twice.
export const NPC_RAIDER_SPECS = ['fury', 'fire', 'combat', 'shadow', 'retribution', 'elemental', 'feralCat', 'affliction', 'marksmanship',
  'balance', 'arms', 'arcane', 'enhancement', 'destruction', 'assassination', 'frost', 'survival', 'demonology', 'subtlety', 'beastMastery'];
const NAMES = ['Garosh', 'Elyndra', 'Torvald', 'Mirelle', 'Kazrak', 'Sylvaris', 'Brannoc', 'Ithriel', 'Volgar', 'Nessa', 'Dagrun', 'Liora',
  'Morvek', 'Aelith', 'Hrothgar', 'Selene', 'Zandor', 'Fenwyn', 'Ulgrim', 'Kaelis'];


// The raiders for `count` free places: [{ spec, name }].
export function raiderRoster(count) {
  return Array.from({ length: Math.max(0, Math.min(count, NAMES.length)) }, (_, i) => ({ spec: NPC_RAIDER_SPECS[i % NPC_RAIDER_SPECS.length], name: NAMES[i] }));
}
