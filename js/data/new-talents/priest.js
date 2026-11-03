// Priest in Blizzard's 3 November notes, on today's tree (./base.js). See withChanges in ../new-talents.js.
export default {
  name: 'Priest', icon: 'classicon_priest', color: '#ffffff',
  note: 'Wowsims and the trainer already have this tree. Holy Binding is the only talent the notes change.',
  other: [
    'Shadow Word: Death deals 30% of maximum Health to you if it fails to kill (was 10%), and nothing if it misses.',
    'Power Word: Shield can now be replaced by one of equal or greater rank.',
    "Vampiric Embrace's healing can no longer be a critical.",
    "Devouring Contagion doesn't spread Devouring Plague from a critter.",
    "Cure Disease and Abolish Disease no longer take you out of Shadowform, and Undead's Dark Sacrifice no longer breaks crowd control.",
  ],
  guesses: [],
  changes: {
    Holy: {
      remove: ['Binding Heal'],
      edit: { 'Holy Binding': { mark: 'new', guess: 'Replaces Binding Heal in its slot.' } },
    },
  },
};
