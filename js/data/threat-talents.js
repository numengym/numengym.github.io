// Talents that lower the threat of your spells (A_MOD_THREAT in wowsims/forever's sim/core/spelldata/spells_auto_gen.go:
// the value is the talent's at full rank, shared evenly over its ranks), by class: talent: { pct, max (ranks),
// schools (null: every school) }. engine/unit.js applies them by the school of what caused the threat.
const MAGIC = ['holy', 'fire', 'nature', 'frost', 'shadow', 'arcane'];

export const THREAT_TALENTS = {
  mage: {
    burningSoul: { pct: -0.3, max: 3, schools: ['fire'] },         // 11083, misc 4
    frostChanneling: { pct: -0.3, max: 3, schools: ['frost'] },    // 11160, misc 16
  },
  priest: { silentResolve: { pct: -0.3, max: 3, schools: ['holy', 'shadow'] } }, // 14523, misc 34
  druid: { subtlety: { pct: -0.3, max: 3, schools: ['nature', 'arcane'] } },     // 17118, misc 72
  shaman: {
    naturalGrace: { pct: -0.3, max: 3, schools: MAGIC },           // 29187, misc 126
    spiritWeapons: { pct: -0.3, max: 1, schools: null },           // 16268, misc 127
  },
  warlock: { suppression: { pct: -0.2, max: 5, schools: null } },  // 18174, misc 127
  paladin: { instrumentOfLaw: { pct: -0.2, max: 2, schools: null } }, // 1311085, misc 127
};
