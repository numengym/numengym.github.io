// Shaman in Blizzard's 3 November notes, on today's tree (./base.js). See withChanges in ../new-talents.js.
export default {
  name: 'Shaman', icon: 'classicon_shaman', color: '#0070de',
  other: [
    'Lightning Bolt: base damage up on all ranks, max rank up 80%.',
    'Chain Lightning: 2.5 sec cast, primary target base damage about 145% of Lightning Bolt, Mana cost about 225%.',
    'All Shocks: base damage back to Classic Era values.',
    "Totemic Projection is now Totemic Call: it teleports your totems to you, on a 30 sec cooldown.",
    'Windfury Weapon and Windfury Totem now animate an extra swing.',
  ],
  guesses: [
    "Improved Ghost Wolf's column: column 4 is the only free slot in Row 4.",
    "Lightning Mastery's new icon: the notes say it changed but don't show it. Call of Thunder's icon is a guess too.",
    "Call of Thunder takes over Lava Burst's connection to Lightning Mastery, the talent it replaces.",
    "Maelstrom Weapon's chance: the notes say only that it doubled.",
    'The wording of the changed tooltips: written from the notes.',
  ],
  changes: {
    Elemental: {
      edit: {
        'Elemental Reach': {
          text: 'Increases the range of your Lightning Bolt, Chain Lightning, and Fire Nova spells by {3/6} yards.',
          changes: [['Totemic Projection', 'shorter cooldown', 'no effect'], ['Lava Burst', 'more range', 'removed']],
        },
        'Lava Burst': {
          name: 'Call of Thunder', mark: 'new', icon: 'spell_nature_callstorm', head: undefined,
          text: 'Increases the critical strike chance of your Lightning Bolt and Chain Lightning spells by 5%.',
          guess: "Replaces Lava Burst. Icon guessed, and it takes over Lava Burst's connection.",
        },
        'Lightning Overload': {
          text: 'Gives your Lightning Bolt and Chain Lightning spells a {10%/20%/30%} chance to cast a second, similar spell on the same target at no additional cost that causes half damage and no threat.',
          changes: [['Chance', '3/7/10%', '10/20/30%']],
        },
        'Elemental Mastery': {
          name: 'Lightning Mastery', icon: 'spell_lightning_lightningbolt01',
          text: 'Gain mastery over Lightning, reducing the cast time of Lightning Bolt by 0.5 sec, and removing the cooldown from Chain Lightning. Lasts 15 sec.',
          changes: [['Lava Burst', 'faster cast', 'removed'], ['Icon', 'old', 'changed']],
          guess: 'The new icon is a guess: the notes say it changed.',
        },
      },
    },
    Enhancement: {
      edit: {
        'Mental Dexterity': {
          text: 'Increases your Attack Power by an amount equal to {50%/100%/150%} of your Intellect.',
          changes: [['Attack Power', '33/67/100% of Intellect', '50/100/150% of Intellect']],
        },
        'Improved Ghost Wolf': { row: 3, col: 3, guess: 'Column guessed: the only free slot in Row 4.' },
        Flurry: {
          text: 'Increases your attack speed by {6%/12%/18%/24%/30%} for your next 3 swings after dealing a melee critical strike.',
          changes: [['Attack speed', '5/10/15/20/25%', '6/12/18/24/30%']],
        },
        Stormstrike: {
          head: ['8% of base mana', 'Melee Range', '6 sec cooldown'],
          text: 'Instantly strike for 150% normalized weapon damage and increase the damage you deal to the target with your next Lightning Bolt, Chain Lightning, or Earth Shock spell by 20% for 12 sec.',
          changes: [['Weapon damage', '100%', '150%'], ['Cooldown', '8 sec', '6 sec']],
        },
        'Maelstrom Weapon': { mark: 'changed', changes: [['Chance to trigger', 'as today', 'doubled']] },
      },
    },
    Restoration: {
      edit: {
        Riptide: {
          text: 'Heals a friendly target for 445 over 15 sec, and increases the effectiveness of your Chain Heal casts directly on that target by 25%.',
          changes: [['Initial healing', 'yes', 'none'], ['Cooldown', '6 sec', '12 sec'], ['Mana cost', 'full', 'about 40% less']],
        },
      },
    },
  },
};
