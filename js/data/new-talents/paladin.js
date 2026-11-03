// Paladin in Blizzard's 3 November notes, on today's tree (./base.js). See withChanges in ../new-talents.js.
export default {
  name: 'Paladin', icon: 'classicon_paladin', color: '#f58cba',
  note: "Wowsims and the trainer already have this tree. The marks show what the notes changed, and the old values come from the notes.",
  other: [
    'Righteous Fury: trained at level 10 (was 16), +33% threat, and +90% threat from Holy damage.',
    'Salvation, Mass Salvation, Revoke and Blessing of Light are removed.',
    "Judgement of Fury's duration: 4 sec to 3 sec.",
    'Righteous Fury is now made free by the Legacy Talent The Quick and the Dead.',
  ],
  guesses: [
    "Vengeance's and Two-Handed Weapon Specialization's tooltips are written from the notes, because Wowhead still shows the old text.",
    "Vindication's tooltip leaves out the Attack Power amount, because Wowhead's text for it is broken.",
    "Old values the notes leave out are shown as \"not in the notes\".",
  ],
  changes: {
    Holy: {
      remove: ['Voice of Truth'],
      edit: {
        'Spiritual Focus': { mark: 'moved', changes: [['Row', '2', '1'], ['Ranks', '2', '5']] },
        'Improved Seals': { mark: 'changed', changes: [['Ranks', '3', '5']] },
        Reverence: { mark: 'moved', changes: [['Row', '3', '2'], ['Ranks', '3', '2']] },
        'Purifying Power': { mark: 'moved', changes: [['Row', '3', '2']] },
        'Divine Favor': { mark: 'moved', changes: [['Row', '4', '3']] },
        Illumination: { mark: 'moved', changes: [['Row', '4', '3']] },
        'Holy Conduit': { mark: 'moved', changes: [['Tree', 'Retribution', 'Holy'], ['Row', '2', '3']] },
        'Divine Precision': { mark: 'moved', changes: [['Row', '5', '4'], ['Ranks', '3', '2'], ['Hit with Holy spells', '6/12/18%', '4/8%'], ['Silence duration', 'no reduction', '-10/20%']] },
        'Oath of Light': { mark: 'new' },
        'Boundless Light': { mark: 'new' },
        'Holy Power': { mark: 'changed', changes: [['Bonus', 'critical chance', 'critical healing, 10/20/30/40/50%']] },
        "Light's Vigil": { mark: 'changed', changes: [['Targets', 'any', 'friendly only'], ['Offensive use', 'yes', 'none']] },
      },
    },
    Protection: {
      remove: ['Improved Seal of Fury', 'One-Handed Weapon Specialization'],
      edit: {
        'Divine Intellect': { mark: 'moved', changes: [['Tree', 'Holy', 'Protection']] },
        'Sacred Duty': { mark: 'moved', changes: [['Row', '3', '2'], ['Stamina', 'increased', 'not increased'], ['Forbearance', 'no reduction', '-5/10 sec']] },
        "Templar's Bulwark": { mark: 'moved', changes: [['Row', '5', '3'], ['Dispellable', 'no', 'yes, a Magic effect']] },
        'Shield Specialization': { mark: 'changed', changes: [['Ranks', 'not in the notes', '2, same at full rank']] },
        Toughness: { mark: 'moved', changes: [['Row', '1', '3']] },
        'Swift Judgement': { mark: 'changed', changes: [['Effect', 'resets Judgement', 'unleashes your Seal']] },
        'Improved Righteous Fury': { mark: 'changed', changes: [['Damage reduction', '2/4/6%', '3/6/9%']] },
        Anticipation: { mark: 'moved', changes: [['Row', '2', '4']] },
        Stoicism: { mark: 'new' },
        'Holy Shield': { mark: 'moved', changes: [['Row', '7', '5']] },
        Reckoning: { mark: 'changed', changes: [['Attacks per stack', 'wrong', 'fixed'], ['Stacks while sitting', 'yes', 'no']] },
        'Iron Creed': { mark: 'changed', changes: [['Ranks', '5', '3'], ['Threat', '5/10/15/20/25%', '10/20/30%'], ['Damage reduction', '2/4/6/8/10%', '2/4/6%']] },
        Shieldsworn: { mark: 'new' },
      },
    },
    Retribution: {
      remove: ['Instrument of Law', 'Twist of Light'],
      edit: {
        Conviction: { mark: 'moved', changes: [['Row', '3', '2'], ['Ranks', '5', '3'], ['Critical chance', '1/2/3/4/5%, melee', '2/4/6%, all']] },
        'Sanctified Judgement': { mark: 'moved', changes: [['Row', '3', '2']] },
        Vindication: { mark: 'changed', changes: [['Your Attack Power', '+1/2/3%', 'none']] },
        'Unyielding Faith': { mark: 'moved', changes: [['Tree', 'Holy', 'Retribution'], ['Row', '2', '3']] },
        'Two-Handed Weapon Specialization': {
          mark: 'moved', text: 'Increases the Holy and Physical damage you deal by {2%/4%/6%}, and reduces all threat you generate by {7%/14%/20%} while a two-handed melee weapon is equipped.',
          changes: [['Row', '5', '4'], ['Damage', 'Physical', 'Holy and Physical'], ['Threat', 'no reduction', '-7/14/20%']],
        },
        'Turn Evil': { mark: 'new' },
        Vengeance: {
          mark: 'changed', text: 'Increases your Physical and Holy damage dealt by {1%/2%/3%} for 30 sec after landing a non-periodic critical strike. Stacks up to 5 times.',
          changes: [['Stacks', '3', '5'], ['Requires', 'Sanctified Judgement', 'Seal of Command']], newArrow: true,
        },
        'Champion of the Light': { mark: 'changed', changes: [['Hammer of Wrath cast', 'no reduction', '-0.2/0.4/0.6/0.8/1.0 sec']] },
        'Unsealed Wrath': { mark: 'new', newArrow: true },
      },
    },
  },
};
