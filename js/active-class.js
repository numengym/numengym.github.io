// The spec and class being played, read once at load: switching the spec reloads the page, so every view can take
// the class's data (abilities, talents, spellbook, builds) from here under the same names for every class.
import { DEFAULT_SPEC, SPECS } from './data/specs.js';
import { classOf } from './classes/index.js';

function storedSpec() {
  try {
    const s = JSON.parse(localStorage.getItem('furytrainer.settings') || '{}').spec;
    return SPECS[s] ? s : DEFAULT_SPEC;
  } catch {
    return DEFAULT_SPEC;
  }
}

export const SPEC = storedSpec();
export const CLASS_ID = SPECS[SPEC].classId || 'warrior';
export const VARIANT = SPECS[SPEC].loadout.variant || null; // a class played another way (the Feral druid)
export const CLS = classOf(CLASS_ID, VARIANT);
export const IS_WARRIOR = CLASS_ID === 'warrior';
export const IS_HEALER = !!SPECS[SPEC].healer; // a healing spec: the raid to heal, no sim or APL

export const {
  ABILITIES, ALL_ACTIONS, AURAS, TALENT_TREES, DEFAULT_TALENTS, parseTalents, METER_NAMES, METER_ICONS, THREAT_NAMES,
  TALENT_TREE_DATA, TALENT_EFFECTS, NO_DPS_EFFECT, BUILT_IN_BUILDS, SPELLBOOK_TABS, castable, spellbook,
} = CLS.data;

export const MAX_TALENT_POINTS = 51; // level 60
export const POINTS_PER_TIER = 5;    // a row opens after 5 points per row above it in that tree
