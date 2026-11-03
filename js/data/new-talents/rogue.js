// Rogue in Blizzard's 3 November notes, on today's tree (./base.js). See withChanges in ../new-talents.js.
export default {
  name: 'Rogue', icon: 'classicon_rogue', color: '#fff569',
  other: [
    'New spell Shank, level 24: 5 Energy, 10 sec cooldown, melee. Strikes with your off hand for 50% weapon damage and generates 15 Energy (25 at Rank 2, level 44). It cannot miss.',
    'New passive Poised, level 18: at full Energy out of combat, your next Energy ability costs 10 less.',
    'Deadly Poison Attack Power coefficient: 0.0045 to 0.009. Instant Poison: 0.005 to 0.01.',
    'Slice and Dice and Ruthlessness no longer make a sitting target stand up.',
    'Hemorrhage and Ghostly Strike no longer deal much more damage than intended with a Dagger.',
  ],
  guesses: [
    'Columns: the notes give only rows. Moved talents take the slot the swap or removal left, and new talents the slot left free.',
    "Mutilate: the notes say it moves to Row 7 from Row 9, but it's in Row 5 today. It swaps with Venom, so Mutilate now needs Venom, the old connection turned around.",
    "Dual Wield Specialization keeps needing Precision, and its arrow runs behind Aggression. Weapon Expertise no longer needs Blade Flurry, because it now sits above it.",
    'Death Mark has no required talent. Thousand Cuts, which it replaces, needed Preparation.',
    'Icons of the new talents: none has a spell on Wowhead yet.',
    "Mutilate's flat damage: the notes say only that it went up. The wording of the new and changed tooltips is written from the notes.",
  ],
  changes: {
    Assassination: {
      remove: ['Murder'],
      edit: {
        Lethality: {
          max: 2, text: 'Increases the critical strike damage bonus of your Sinister Strike, Gouge, Backstab, Mutilate, Ghostly Strike, and Hemorrhage abilities by {10%/20%}.',
          changes: [['Critical damage', '4/8/12/16/20%', '10/20%']],
        },
        'Improved Expose Armor': { row: 1 },
        Vigor: { row: 2 },
        'Relentless Strikes': {
          row: 4, max: 5, text: 'Your finishing moves have a {4%/8%/12%/16%/20%} chance per Combo Point to restore 25 Energy.',
          changes: [['Chance per Combo Point', '20%', '4/8/12/16/20%']],
        },
        Venom: {
          row: 4, needs: undefined, head: undefined,
          text: 'Your Shank ability increases your Poison damage by 30% and your chance to apply Poisons by 20% for 6 sec.',
          changes: [['Type', 'finishing move', 'passive, from Shank'], ['Poison apply chance', '10%', '20%'], ['Duration', '9 to 21 sec', '6 sec']],
        },
        'Seal Fate': {
          max: 3, text: 'Your critical strikes from abilities that add Combo Points have a {33%/66%/100%} chance to add an additional Combo Point.',
          changes: [['Chance', '20/40/60/80/100%', '33/66/100%']],
        },
        Mutilate: {
          row: 6, needs: 'Venom', newArrow: true,
          text: 'Instantly attacks with both weapons for 90% weapon damage plus an additional amount with each weapon. Damage increased by 20% against Poisoned targets. Awards 2 Combo Points.',
          changes: [['Weapon damage', '75%', '90%'], ['Flat damage', '17', 'higher'], ['Requires', 'no talent', 'Venom']],
          guess: "The notes say it moves from Row 9, but it's in Row 5 today. Needing Venom is a guess.",
        },
      },
      add: [
        {
          name: 'Blood Splatter', row: 2, col: 1, max: 1, icon: 'ability_rogue_bloodsplatter',
          text: 'Increases the duration of your Rupture ability by 6 sec and your Garrote ability by 9 sec.',
          guess: 'Column, icon and wording guessed.',
        },
      ],
    },
    Combat: {
      edit: {
        'Improved Eviscerate': {
          name: 'Coup de Grace', text: 'Increases the damage done by your Eviscerate ability by {7%/13%/20%}, and the damage and storage rate of your Death Mark ability by {7%/13%/20%}.',
          changes: [['Death Mark', 'not affected', '+7/13/20%']],
        },
        'Improved Sinister Strike': {
          name: 'Efficient Strikes', text: 'Reduces the Energy cost of your Sinister Strike and Hemorrhage abilities by {3/5}.',
          changes: [['Hemorrhage cost', 'no reduction', '-3/5 Energy']],
        },
        'Improved Sprint': { row: 1 },
        'Flawless Execution': {
          text: 'Reduces the Energy cost of your Eviscerate ability by 15.',
          changes: [['Eviscerate cost', '-10 Energy', '-15 Energy']],
        },
        'Weapon Expertise': {
          row: 3, col: 3, needs: undefined,
          changes: [['Requires', 'Blade Flurry', 'no talent']],
          guess: 'Column guessed. It can no longer need Blade Flurry, which is below it now.',
        },
        Aggression: {
          row: 3, text: 'Increases the damage of your Sinister Strike and Eviscerate abilities by {5%/10%/15%}.',
          changes: [['Damage', '2/4/6%', '5/10/15%'], ['Backstab', 'included', 'not included']],
        },
        'Dual Wield Specialization': {
          row: 4, col: 3, max: 2, text: 'Increases the damage done by your off-hand weapon by {25%/50%}.',
          changes: [['Off-hand damage', '5/10/15/20/25%', '25/50%']],
          guess: 'Column guessed, and still needing Precision is a guess: its arrow runs behind Aggression.',
        },
      },
      add: [
        {
          name: 'Composure', row: 2, col: 3, max: 2, icon: 'ability_rogue_quickrecovery',
          text: 'Increases the Energy cost reduction of your Poised ability by {5/10}.',
          guess: 'Column, icon and wording guessed.',
        },
        {
          name: 'Flash of Steel', row: 5, col: 1, max: 5, icon: 'ability_rogue_murderspree',
          text: 'Increases the Energy generated by your Shank ability by {3/6/9/12/15} and reduces its cooldown by {0.4/0.8/1.2/1.6/2.0} sec.',
          guess: 'Column, icon and wording guessed.',
        },
      ],
    },
    Subtlety: {
      remove: ['Improved Distract', 'Quietus', 'Cutthroat', 'Thousand Cuts'],
      edit: {
        Setup: {
          row: 0, text: 'Gives you a {15%/30%/45%} chance to add a Combo Point to your target after Dodging one of their attacks or fully resisting one of their spells.',
          changes: [['Chance', '33/67/100%', '15/30/45%']],
        },
        Opportunity: {
          max: 5, text: 'Increases the damage dealt by your Backstab, Garrote, Ambush, and Mutilate abilities by {4%/8%/12%/16%/20%}.',
          changes: [['Damage', '5/10%', '4/8/12/16/20%']],
        },
        Camouflage: {
          row: 1, max: 3, text: 'Increases your movement speed in Stealth by {5%/10%/15%} and reduces its cooldown by {2/4/6} sec.',
          changes: [['Speed in Stealth', '3/6/9/12/15%', '5/10/15%'], ['Cooldown cut', '2/3/4/5/6 sec', '2/4/6 sec']],
        },
        'Dirty Deeds': { row: 1, col: 1, guess: 'Column guessed: the slot Elusiveness left.' },
        Premeditation: { row: 2 },
        'Serrated Blades': { row: 2 },
        Elusiveness: { row: 3, col: 0, guess: 'Column guessed: Column 3 is left clear for the arrow to Hemorrhage.' },
        'Ghostly Strike': {
          row: 3, text: 'A strike that deals 125% (180% if a Dagger is equipped in your Main Hand) weapon damage and increases your chance to dodge by 15% for 7 sec. Your next Ambush or Garrote within 7 sec does not require Stealth. Awards 1 combo point.',
          changes: [['Ambush and Garrote', 'need Stealth', 'next one needs none']],
        },
        'Heightened Senses': { row: 4 },
        Hemorrhage: {
          text: 'An instant strike that deals 100% weapon damage (145% if a Dagger is equipped) and causes the target to take 15% increased Rupture and Garrote damage from the Rogue. Lasts 15 sec. Awards 1 Combo Point.',
          changes: [['Increases', 'Rupture', 'Rupture and Garrote']],
        },
      },
      add: [
        {
          name: 'Quick Getaway', row: 3, col: 3, max: 2, icon: 'ability_rogue_fleetfooted',
          text: 'Increases the maximum number of targets you may have Sapped by 1 and increases your movement speed by {15%/30%} for 3 sec after Sapping a target.',
          guess: 'Column, icon and wording guessed.',
        },
        {
          name: 'Boot Knife', row: 5, col: 1, max: 5, icon: 'ability_rogue_shadowstrikes',
          text: 'Gives your Shank ability a {20%/40%/60%/80%/100%} chance to add 2 Combo Points to the target.',
          guess: 'Column, icon and wording guessed.',
        },
        {
          name: 'Death Mark', row: 6, col: 1, max: 1, icon: 'ability_rogue_deadliness', head: ['25 Energy', '20 yd range', '10 sec cooldown'],
          text: 'Finishing move that marks the target with a Curse, storing a portion of the damage dealt by your attacks per Combo Point. Garrote and Rupture damage is stored at twice the rate. After 6 sec, the stored damage is dealt, up to a maximum increased by Attack Power and Critical Strike chance.',
          guess: 'Icon and wording guessed, and no required talent: the notes name none.',
        },
      ],
    },
  },
};
