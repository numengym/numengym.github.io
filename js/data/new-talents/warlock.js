// Warlock in Blizzard's 3 November notes, on today's tree (./base.js). See withChanges in ../new-talents.js.
export default {
  name: 'Warlock', icon: 'classicon_warlock', color: '#9482c9',
  other: [
    'Spellstones now only increase Shadow damage.',
    "Pets gain 2 Health per point of your Stamina (was 7.5).",
    'Bane of Agony now updates its damage dynamically.',
    "Drain Soul's chance to give a Soul Shard from damage (not a kill) is much lower.",
  ],
  guesses: [
    "Wrack's tooltip number: 86 is the notes' value at level 60. Wowhead shows 36.",
    "The wording of the changed tooltips: written from the notes.",
  ],
  changes: {
    Affliction: {
      edit: {
        'Improved Drains': { mark: 'changed', changes: [['Drain Mana', 'not increased', 'increased'], ['Wrack damage', 'increased', 'not increased']] },
        'Amplify Curse': { mark: 'changed', changes: [['Curse of Exhaustion, Bane of Agony', 'not affected', 'affected']] },
        Wrack: {
          text: 'Tears the target apart from within, inflicting 86 Shadow damage every 1 sec and increasing the damage they take from your other Shadow damage over time effects by 10% for 6 sec.',
          changes: [['Damage per sec at 60', '36', '86'], ['Spell damage coefficient', 'half', '0.286 per sec'], ['Base per level', 'not in the notes', '+2.5']],
        },
      },
    },
    Destruction: {
      edit: {
        'Shadow and Flame': {
          text: 'Hitting an enemy with Conflagrate increases all Shadow damage you deal by {4%/8%/12%/16%/20%} for 20 sec, and hitting an enemy with Shadowburn increases all Fire damage you deal by {4%/8%/12%/16%/20%} for 20 sec. In addition, Conflagrate has a {20%/40%/60%/80%/100%} chance not to consume Immolate, and Shadowburn has a {20%/40%/60%/80%/100%} chance to instantly refund a Soul Shard.',
          changes: [['Damage', '2/4/6/8/10%', '4/8/12/16/20%']],
        },
      },
    },
  },
};
