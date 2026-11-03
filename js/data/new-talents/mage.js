// Mage in Blizzard's 3 November notes, on today's tree (./base.js). See withChanges in ../new-talents.js.
export default {
  name: 'Mage', icon: 'classicon_mage', color: '#69ccf0',
  note: "Wowsims and the trainer already have this tree. The marks show what the notes changed, and the old values come from the notes.",
  other: [
    'Frost Blast is removed.',
    "Missile Barrage is now used up at the start of Arcane Missiles' channel, not the end.",
    "Clearcasting isn't used up on Arcane Missiles while Missile Barrage is active, and Arcane Missiles can now trigger Clearcasting.",
    'Ignite now applies to Flamestrike past its first hit.',
    "Imbue Iceknife's visual now reads as a Root, not a Stun.",
  ],
  guesses: [
    "Old values the notes leave out are shown as \"not in the notes\".",
    'Some unchanged tooltips still name Frost Blast, as Wowhead\'s do.',
  ],
  changes: {
    Arcane: {
      remove: ['Arcane Focus'],
      edit: {
        'Arcane Resilience': { mark: 'moved', changes: [['Row', '2', '1'], ['Ranks', 'not in the notes', '3'], ['Armor at full rank', 'not in the notes', '75% of Intellect']] },
        'Missile Barrage': { mark: 'moved', changes: [['Row', '1', '2']] },
        'Arcane Blast': { mark: 'changed', changes: [['Mana cost per stack', '+175%', '+100%'], ['Spell Damage per stack', '15% of Intellect', '12% of Intellect'], ['Duration', 'not in the notes', '18 sec']] },
      },
    },
    Fire: {
      edit: {
        Incineration: { mark: 'changed', changes: [['Ranks', '3', '5'], ['Critical chance', '6% at full rank', '10% at full rank']] },
        Accelerant: { mark: 'changed', changes: [['Name', 'Improved Fireball', 'Accelerant'], ['Arcane Wrath cast', 'no reduction', 'up to -0.5 sec']] },
        'Critical Mass': { mark: 'changed', changes: [['Ranks', '5', '3'], ['Critical chance', '10% at full rank', '6% at full rank']] },
        'Improved Fire Blast': { mark: 'moved', changes: [['Row', '1', '3']] },
      },
    },
    Frost: {
      remove: ['Piercing Ice'],
      edit: {
        'Frost Warding': { mark: 'changed', changes: [['Ice Barrier and Frost Ward', 'no bonus', 'absorb more'], ['Frost Ward', 'can Reflect', 'can negate without depleting']] },
        Precision: { mark: 'changed', changes: [['Name', 'Elemental Precision', 'Precision'], ['Ranks', '5', '3'], ['Hit with all spells', '1/2/3/4/5%', '2/4/6%']] },
        'Ice Lance': { mark: 'changed', changes: [['Cooldown', 'not in the notes', '8 sec, shared with Fire Blast'], ['Bonus to Frozen targets', 'lower', '300%']] },
        "Winter's Chill": { mark: 'changed', changes: [['Cone of Cold bonus per stack', 'lower', '20%']] },
        'Ice Barrier': { mark: 'changed', changes: [['Frost damage when cast', 'none', '+15% for 1 min'], ['While the barrier holds', 'none', '+5% more']] },
      },
    },
  },
};
