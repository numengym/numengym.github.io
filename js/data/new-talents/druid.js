// Druid in Blizzard's 3 November notes, on today's tree (./base.js). See withChanges in ../new-talents.js.
export default {
  name: 'Druid', icon: 'classicon_druid', color: '#ff7d0a',
  note: "Wowsims and the trainer already have this tree. The marks show what the notes changed, and the old values come from the notes.",
  other: [
    'Bear and Dire Bear Form threat bonus: 50% to 115%, to make up for Blessing of Salvation being removed.',
    'New passive Poised, level 32: at full Energy out of combat, your next Energy ability costs 10 less.',
    'Shred 155% to 200% weapon damage, Claw 110% to 140%, Ravage 350% to 435%.',
    'Rip, Rake, Ferocious Bite and Pounce: base points and Attack Power scaling up about 25%. Starfire: base damage up about 40%.',
    'Ferocious Bite has a new Rank 1 at level 24, and the existing ranks moved up one.',
  ],
  guesses: [
    "Rend and Tear's tooltip is written from the notes, because Wowhead still shows the old values.",
    "Wild Growth's old cast time: the notes give only the new 3 sec.",
  ],
  changes: {
    Balance: {
      edit: {
        Genesis: { mark: 'changed', changes: [['Periodic damage and healing', '1/2/3/4/5%', '2/4/6/8/10%']] },
        'Moonkin Form': { mark: 'changed', changes: [['Critical bonus', 'not all types', 'all types'], ['With Leader of the Pack', 'stacks', "doesn't stack"]] },
      },
    },
    'Feral Combat': {
      remove: ['Berserk'],
      edit: {
        Furor: { mark: 'moved', changes: [['Tree', 'Restoration', 'Feral Combat']] },
        'Predatory Strikes': { mark: 'moved', changes: [['Column', '3', '1']] },
        Lacerate: { mark: 'changed', changes: [['Learned by', 'all Druids', 'this talent'], ['Spell ranks', 'fewer', 'two more']], guess: 'Replaces Primal Bite in Row 4.' },
        'Predatory Discipline': { mark: 'new', guess: 'Replaces Shifting Power in Row 4.' },
        'Leader of the Pack': { mark: 'changed', changes: [['Critical bonus', 'not all types', 'all types'], ['With Moonkin Aura', 'stacks', "doesn't stack"]] },
        'Natural Instinct': { mark: 'moved', changes: [['Column', '1', '4']] },
        'Rend and Tear': {
          mark: 'changed', text: 'Increases damage done by your melee abilities on Bleeding targets by {3%/6%/9%/12%/15%}.',
          changes: [['Column', '3', '1'], ['Damage', '2/4/6/8/10%', '3/6/9/12/15%']],
        },
        'Primal Bite': { mark: 'moved', changes: [['Row', '4', '7'], ['Spell ranks', 'more', '3']], guess: 'Replaces Berserk.' },
        'Shifting Power': { mark: 'moved', changes: [['Row', '4', '7'], ['Requires', 'no talent', 'Predatory Discipline']], newArrow: true },
      },
    },
    Restoration: {
      remove: ['Gift of the Earthmother'],
      edit: {
        'Heart of the Wild': { mark: 'moved', changes: [['Tree', 'Feral Combat', 'Restoration']] },
        Naturalist: { mark: 'changed', changes: [['All damage', '1/2/3/4/5%', '2/4/6/8/10%'], ['Wild Growth cast', 'no reduction', '-0.1/0.2/0.3/0.4/0.5 sec']] },
        Reflection: { mark: 'moved', changes: [['Row', '3', '2']] },
        Subtlety: { mark: 'moved', changes: [['Row', '2', '3']] },
        Bloom: { mark: 'new', guess: 'Replaces Gift of the Earthmother in Row 3.' },
        Swiftmend: { mark: 'changed', changes: [['Consumes', "any Druid's effect", 'your own effect']] },
        'Wild Growth': { mark: 'changed', changes: [['Base cast time', 'not in the notes', '3 sec']] },
      },
    },
  },
};
