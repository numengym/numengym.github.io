// First-time tutorials for the Rogue specs (js/tutorial.js), from each spec's APL (js/data/rogue-apl.js): what the
// spec does, its core abilities in priority order, the situational rules and what to watch.
const SND = { title: 'Slice and Dice', abilities: ['sliceAndDice'], text: 'Your first finisher: reapply <b>Slice and Dice</b> as soon as it drops, with any number of combo points.' };
const VANISH = { title: 'Vanish for Garrote', abilities: ['vanish', 'garrote'], text: 'You start out of Stealth. From 1 s into the fight, <b>Vanish</b> whenever Garrote is not on the target and you have the energy for it and fewer than 5 combo points, and also whenever Vanish is ready at 3 combo points or fewer with the energy for an Ambush. From Stealth, <b>Garrote</b> from behind if it is not on the target.' };
// bc9f96c: with Improved Ambush (the Subtlety presets), Vanish also opens an Ambush, and Ghostly Strike's no-Stealth window
// takes one too; Hemorrhage leaves room for Ghostly Strike.
const AMBUSH = { title: 'Ambush', abilities: ['ambush', 'vanish'], text: 'With Improved Ambush, below 5 combo points, <b>Ambush</b> whenever you can (from Stealth, or within 7 s of Ghostly Strike) while Garrote has more than 7 s left. At 3 combo points or fewer, <b>Vanish</b> for it when you have the energy and Garrote will outlast Ghostly Strike\'s cooldown.' };
const HEMO = { title: 'Hemorrhage', abilities: ['hemorrhage', 'premeditation'], text: 'Below 5 combo points, build with <b>Hemorrhage</b> while Garrote has 8 s or more left and Ghostly Strike\'s effect is not up; when Ghostly Strike is ready, only while Garrote has between 4 and 21 s left. Near the energy cap, Hemorrhage anyway. <b>Premeditation</b> goes on cooldown at 3 combo points or fewer.' };
const SHANK = (text) => ({ title: 'Shank', abilities: ['shank'], text });
const SHANK_TEXT = 'Use <b>Shank</b> on cooldown whenever you have 80 energy or less: 5 energy for an off-hand stab that cannot miss and gives 25 energy back.';
const TEA = { title: 'Thistle Tea', abilities: ['conjured', 'offensivePotion'], text: 'Drink <b>Thistle Tea</b> at 15 energy or less with fewer than 3 combo points. Use your offensive potion while Blade Flurry is up.' };
const WATCH = { title: 'What to watch', text: 'Watch your <b>energy</b>, your combo points and the Slice and Dice timer. Your first ability costs 10 less (<b>Poised</b>). Turn on the <b>rotation helper</b> (Settings): a green border marks the next ability on the global cooldown, a blue one something to press now, off it.' };
const OPENER = { title: 'Opener', abilities: ['bladeFlurry'], text: 'Before the pull the rotation uses <b>Blade Flurry</b>; you start out of Stealth.' };
const COMBAT_CDS = { title: 'Blade Flurry and Adrenaline Rush', abilities: ['bladeFlurry', 'adrenalineRush'], text: 'Use <b>Blade Flurry</b> whenever it is ready, even on one target: it adds 20% attack speed, and your hits strike a second enemy. Use <b>Adrenaline Rush</b> at 50 energy or less while Slice and Dice is up.' };
const COMBAT_EVIS = (at) => ({ title: 'Eviscerate', abilities: ['coldBlood', 'eviscerate'], text: `Spend combo points on <b>Eviscerate</b> at ${at} (at 3 or more when the fight is about to end). At 5 points, <b>Cold Blood</b> goes first for a sure crit. Rupture is not part of this rotation.` });

export const TUTORIALS = {
  assassination: [
    { title: 'Assassination Rogue', text: 'You fight with two daggers on <b>energy</b> and <b>combo points</b>. Mutilate builds 2 points at a time; spend them on Slice and Dice and Eviscerate, and keep Venom up with Shank.' },
    SND,
    { title: 'Eviscerate', abilities: ['coldBlood', 'eviscerate'], text: 'Otherwise spend combo points on <b>Eviscerate</b> at 3 or more (Mutilate gives 2 at a time). At 4 or 5 points, <b>Cold Blood</b> goes first for a sure crit. With Flawless Execution, Rupture is not part of this rotation.' },
    SHANK(`${SHANK_TEXT} With <b>Venom</b>, each Shank makes your poisons 30% stronger and 20% more likely for 6 s.`),
    { title: 'Mutilate', abilities: ['mutilate'], text: 'Below 5 combo points, build with <b>Mutilate</b>: both daggers strike for 2 combo points, 20% harder on a poisoned target.' },
    VANISH,
    { ...TEA, abilities: ['conjured'], text: 'Drink <b>Thistle Tea</b> at 15 energy or less with fewer than 3 combo points.' },
    WATCH,
  ],
  combat: [
    { title: 'Combat Rogue', text: 'You fight with a slow main-hand weapon on <b>energy</b> and <b>combo points</b>. Sinister Strike builds them; spend them on Slice and Dice and Eviscerate, with Shank, Blade Flurry and Adrenaline Rush feeding you energy and speed.' },
    OPENER,
    SND,
    COMBAT_EVIS('5'),
    SHANK(`${SHANK_TEXT} Flash of Steel makes it 40 energy on an 8 s cooldown.`),
    { title: 'Sinister Strike', abilities: ['sinisterStrike'], text: 'Below 5 combo points, build with <b>Sinister Strike</b>.' },
    COMBAT_CDS,
    VANISH,
    TEA,
    WATCH,
  ],
  combatBs: [
    { title: 'Combat Backstab', text: 'Combat talents with a dagger in your main hand, on <b>energy</b> and <b>combo points</b>: Backstab builds them from behind. Spend them on Slice and Dice and Eviscerate, with Shank, Blade Flurry and Adrenaline Rush.' },
    OPENER,
    SND,
    COMBAT_EVIS('4 or more (Backstab)'),
    SHANK(`${SHANK_TEXT} Flash of Steel makes it 40 energy on an 8 s cooldown.`),
    { title: 'Backstab', abilities: ['backstab'], text: 'Below 5 combo points, build with <b>Backstab</b> from behind the target.' },
    COMBAT_CDS,
    VANISH,
    TEA,
    WATCH,
  ],
  combatVenom: [
    { title: 'Combat Venom', text: 'Combat talents with Venom from the Assassination tree, on <b>energy</b> and <b>combo points</b>: Sinister Strike builds them, Shank keeps Venom on your poisons. Spend them on Slice and Dice and Eviscerate, with Blade Flurry as your cooldown.' },
    OPENER,
    SND,
    COMBAT_EVIS('5'),
    SHANK(`${SHANK_TEXT} With <b>Venom</b>, each Shank makes your poisons 30% stronger and 20% more likely for 6 s.`),
    { title: 'Sinister Strike', abilities: ['sinisterStrike'], text: 'Below 5 combo points, build with <b>Sinister Strike</b>.' },
    { title: 'Blade Flurry', abilities: ['bladeFlurry'], text: 'Use <b>Blade Flurry</b> whenever it is ready, even on one target: it adds 20% attack speed, and your hits strike a second enemy. This build has no Adrenaline Rush.' },
    VANISH,
    TEA,
    WATCH,
  ],
  subtlety: [
    { title: 'Subtlety Rogue', text: 'You fight with a slow main hand on <b>energy</b> and <b>combo points</b>. Hemorrhage builds them; keep Garrote, Slice and Dice and Rupture up and spend the rest on Death Mark, with Premeditation, Vanish and Preparation as cooldowns.' },
    { title: 'Opener', abilities: ['premeditation'], text: 'Before the pull: <b>Premeditation</b> for 2 combo points. You start out of Stealth.' },
    { title: 'Garrote', abilities: ['ghostlyStrike', 'garrote', 'vanish', 'preparation'], text: 'Keep <b>Garrote</b> up. Below 5 combo points, <b>Ghostly Strike</b> when Garrote has 4 s or less left, or when it has 21 s or more left and Hemorrhage has 2 s or more on the target: the next Ambush or Garrote within 7 s needs no Stealth. When Garrote is gone, <b>Vanish</b> and Garrote. <b>Preparation</b> resets Vanish once Vanish, Ghostly Strike, Premeditation and Cold Blood are all on cooldown and you have 85 energy or less.' },
    AMBUSH,
    { title: 'Death Mark', abilities: ['deathMark'], text: 'At 4 or 5 combo points, <b>Death Mark</b>: for 6 s it stores part of all the damage you deal the target, twice as much from Garrote and Rupture, and deals it when it ends. It replaces Eviscerate.' },
    { title: 'Rupture', abilities: ['rupture'], text: 'At 3 or more combo points, put <b>Rupture</b> back up whenever it is not on the target; Hemorrhage makes it 15% stronger.' },
    SND,
    SHANK('Use <b>Shank</b> on cooldown at 3 combo points or fewer and 80 energy or less: 5 energy for an off-hand stab that gives 25 energy back, and <b>Boot Knife</b> adds 2 combo points.'),
    HEMO,
    { ...TEA, abilities: ['conjured'], text: 'Drink <b>Thistle Tea</b> at 25 energy or less while Death Mark is on the target and you have fewer than 3 combo points.' },
    WATCH,
  ],
  hemoSf: [
    { title: 'Hemo Seal Fate', text: 'Subtlety\'s Hemorrhage and Ghostly Strike with Seal Fate and Venom from Assassination, a dagger in each hand, on <b>energy</b> and <b>combo points</b>. Hemorrhage builds them (its crits add one more); keep Garrote, Slice and Dice and Rupture up and spend the rest on Eviscerate.' },
    { title: 'Opener', abilities: ['premeditation'], text: 'Before the pull: <b>Premeditation</b> for 2 combo points. You start out of Stealth.' },
    { title: 'Garrote', abilities: ['ghostlyStrike', 'garrote', 'vanish'], text: 'Keep <b>Garrote</b> up. Below 5 combo points, <b>Ghostly Strike</b> when Garrote has 4 s or less left, or when it has 21 s or more left and Hemorrhage has 2 s or more on the target: the next Ambush or Garrote within 7 s needs no Stealth. When Garrote is gone, <b>Vanish</b> and Garrote.' },
    AMBUSH,
    { title: 'Rupture', abilities: ['rupture'], text: 'At 3 or more combo points, put <b>Rupture</b> back up whenever it is not on the target; Hemorrhage makes it 15% stronger.' },
    SND,
    { title: 'Eviscerate', abilities: ['coldBlood', 'eviscerate'], text: 'Spend 5 combo points on <b>Eviscerate</b> while Rupture has 3 s or more left. <b>Cold Blood</b> goes first for a sure crit.' },
    SHANK(`${SHANK_TEXT} With <b>Venom</b>, each Shank makes your poisons 30% stronger and 20% more likely for 6 s.`),
    HEMO,
    { ...TEA, abilities: ['conjured'], text: 'Drink <b>Thistle Tea</b> at 15 energy or less with fewer than 3 combo points.' },
    WATCH,
  ],
};
