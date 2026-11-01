// First-time tutorials for the Rogue specs (js/tutorial.js), from each spec's APL (js/data/rogue-apl.js): what the
// spec does, its core abilities in priority order, the situational rules and what to watch.
const SND = { title: 'Slice and Dice', abilities: ['sliceAndDice'], text: 'Your first finisher: reapply <b>Slice and Dice</b> as soon as it drops, with any number of combo points. When it has 2 s or less left and you have a point, hold your builder (unless you have 75 energy) so the energy is there for it.' };
const VANISH = { title: 'Vanish for Garrote', abilities: ['vanish', 'garrote'], text: 'When Garrote has worn off, you have the energy for it, fewer than 5 combo points and Slice and Dice is not about to drop: <b>Vanish</b> and <b>Garrote</b> again.' };
const SUB_CDS = { title: 'Cooldowns', abilities: ['premeditation', 'vanish', 'preparation'], text: 'Use <b>Premeditation</b> on cooldown at 3 combo points or fewer. When Garrote has worn off (with the energy, under 5 points, Slice and Dice not about to drop), <b>Vanish</b> and Garrote again. <b>Preparation</b> resets Vanish once it is on cooldown.' };
const RUPTURE = { title: 'Rupture', abilities: ['rupture'], text: 'With Thousand Cuts, keep <b>Rupture</b> up: whenever it is not on the target and you have 3 or more combo points, it comes right after Slice and Dice.' };
const TEA = { title: 'Thistle Tea', abilities: ['conjured', 'offensivePotion'], text: 'Drink <b>Thistle Tea</b> at 15 energy or less with fewer than 3 combo points. Use your offensive potion while Blade Flurry is up.' };
const WATCH = { title: 'What to watch', text: 'Watch your <b>energy</b>, your combo points and the Slice and Dice timer. Turn on the <b>rotation helper</b> (Settings): a green border marks the next ability on the global cooldown, a blue one something to press now, off it.' };
const OPENER = { title: 'Opener', abilities: ['bladeFlurry', 'stealth', 'garrote'], text: 'Before the pull the rotation uses <b>Blade Flurry</b>, then <b>Stealth</b>. Open with <b>Garrote</b> from behind the target.' };
const SUB_OPENER = { title: 'Opener', abilities: ['premeditation', 'stealth', 'garrote'], text: 'Before the pull: <b>Premeditation</b> for 2 combo points, then <b>Stealth</b>. Open with <b>Garrote</b> from behind the target.' };
const COMBAT_CDS = { title: 'Blade Flurry and Adrenaline Rush', abilities: ['bladeFlurry', 'adrenalineRush'], text: 'Use <b>Blade Flurry</b> whenever it is ready and Slice and Dice is not about to drop, even on one target: it adds 20% attack speed, and your hits strike a second enemy. Use <b>Adrenaline Rush</b> at 50 energy or less while Slice and Dice is up.' };
const COMBAT_EVIS = { title: 'Eviscerate', abilities: ['coldBlood', 'eviscerate'], text: 'Spend combo points on <b>Eviscerate</b> at 5, or at 4 when Slice and Dice has 2 to 6 s left. At 5 points, <b>Cold Blood</b> goes first for a sure crit. Rupture is not part of this rotation.' };

export const TUTORIALS = {
  assassination: [
    { title: 'Assassination Rogue', text: 'You fight with two daggers on <b>energy</b> and <b>combo points</b>. Mutilate builds 2 points at a time; spend them on Slice and Dice, Venom and Eviscerate.' },
    { title: 'Opener', abilities: ['stealth', 'garrote'], text: 'Start in <b>Stealth</b> and open with <b>Garrote</b> from behind the target.' },
    SND,
    { title: 'Venom', abilities: ['venom'], text: 'Next, cast <b>Venom</b> whenever it is not up and you have 3 or more combo points: your poisons do 30% more damage and proc more often.' },
    { title: 'Eviscerate', abilities: ['coldBlood', 'eviscerate'], text: 'Otherwise spend combo points on <b>Eviscerate</b> at 4 or 5 (Mutilate gives 2 at a time, so 4 is enough). At 5 points, <b>Cold Blood</b> goes first for a sure crit. Rupture is not part of this rotation.' },
    { title: 'Mutilate', abilities: ['mutilate'], text: 'Below 5 combo points, build with <b>Mutilate</b>: both daggers strike for 2 combo points, 20% harder on a poisoned target.' },
    VANISH,
    { ...TEA, abilities: ['conjured'], text: 'Drink <b>Thistle Tea</b> at 15 energy or less with fewer than 3 combo points.' },
    WATCH,
  ],
  combat: [
    { title: 'Combat Rogue', text: 'You fight with a slow main-hand weapon on <b>energy</b> and <b>combo points</b>. Sinister Strike builds them; spend them on Slice and Dice and Eviscerate, with Blade Flurry and Adrenaline Rush as your cooldowns.' },
    OPENER,
    SND,
    COMBAT_EVIS,
    { title: 'Sinister Strike', abilities: ['sinisterStrike'], text: 'Below 5 combo points, build with <b>Sinister Strike</b>, holding it only to save energy for Slice and Dice.' },
    COMBAT_CDS,
    VANISH,
    TEA,
    WATCH,
  ],
  combatMuti: [
    { title: 'Combat Mutilate', text: 'Combat talents with two daggers, on <b>energy</b> and <b>combo points</b>: Mutilate builds 2 points at a time. Spend them on Slice and Dice and Eviscerate, with Blade Flurry as your cooldown.' },
    OPENER,
    SND,
    { title: 'Eviscerate', abilities: ['coldBlood', 'eviscerate'], text: 'Spend combo points on <b>Eviscerate</b> at 4 or 5 (Mutilate gives 2 at a time, so 4 is enough). At 5 points, <b>Cold Blood</b> goes first for a sure crit. Rupture is not part of this rotation.' },
    { title: 'Mutilate', abilities: ['mutilate'], text: 'Below 5 combo points, build with <b>Mutilate</b>: both daggers strike for 2 combo points, 20% harder on a poisoned target.' },
    { title: 'Blade Flurry', abilities: ['bladeFlurry'], text: 'Use <b>Blade Flurry</b> whenever it is ready and Slice and Dice is not about to drop, even on one target: it adds 20% attack speed, and your hits strike a second enemy. This build has no Adrenaline Rush.' },
    VANISH,
    TEA,
    WATCH,
  ],
  combatBs: [
    { title: 'Combat Backstab', text: 'Combat talents with a dagger in your main hand, on <b>energy</b> and <b>combo points</b>: Backstab builds them from behind. Spend them on Slice and Dice and Eviscerate, with Blade Flurry and Adrenaline Rush as your cooldowns.' },
    OPENER,
    SND,
    COMBAT_EVIS,
    { title: 'Backstab', abilities: ['backstab'], text: 'Below 5 combo points, build with <b>Backstab</b> from behind the target, holding it only to save energy for Slice and Dice.' },
    COMBAT_CDS,
    VANISH,
    TEA,
    WATCH,
  ],
  subtlety: [
    { title: 'Subtlety Rogue', text: 'You fight with a slow main hand on <b>energy</b> and <b>combo points</b>. Hemorrhage builds them; keep Slice and Dice and Rupture up, spend the rest on Eviscerate, with Premeditation, Vanish and Preparation as cooldowns.' },
    SUB_OPENER,
    SND,
    RUPTURE,
    { title: 'Eviscerate', abilities: ['coldBlood', 'eviscerate'], text: 'Use <b>Eviscerate</b> at 5 combo points (4 when Slice and Dice has 2 to 6 s left), but only while Rupture has 4 s or more left, unless you have 75 energy. At 5 points, <b>Cold Blood</b> goes first.' },
    { title: 'Hemorrhage', abilities: ['hemorrhage'], text: 'Below 5 combo points, build with <b>Hemorrhage</b>; the target also takes 15% more Rupture damage from you. Ghostly Strike would come before it, but only if you talent it.' },
    SUB_CDS,
    { ...TEA, abilities: ['conjured'], text: 'Drink <b>Thistle Tea</b> at 15 energy or less with fewer than 3 combo points.' },
    WATCH,
  ],
  subBs: [
    { title: 'Subtlety Backstab', text: 'A dagger in your main hand and <b>Backstab</b> from behind, on <b>energy</b> and <b>combo points</b>. Keep Hemorrhage, Slice and Dice and Rupture up, take every Cutthroat Ambush, and spend the rest on Eviscerate.' },
    SUB_OPENER,
    SND,
    RUPTURE,
    { title: 'Eviscerate', abilities: ['eviscerate'], text: 'Use <b>Eviscerate</b> at 5 combo points (4 when Slice and Dice has 2 to 6 s left), but only while Rupture has 4 s or more left, unless you have 75 energy.' },
    { title: 'Cutthroat Ambush', abilities: ['ambush'], text: 'When <b>Cutthroat</b> procs, Ambush works without Stealth: it goes above everything else while you have fewer than 5 combo points, and Backstab waits for it.' },
    { title: 'Hemorrhage and Backstab', abilities: ['hemorrhage', 'backstab'], text: 'Below 5 combo points: <b>Hemorrhage</b> when its debuff is not on the target (it lasts 15 s and adds 15% to your Rupture damage), otherwise <b>Backstab</b> from behind.' },
    SUB_CDS,
    { ...WATCH, text: 'Watch your <b>energy</b>, combo points, the Cutthroat proc and the Rupture and Slice and Dice timers. Thistle Tea goes at 15 energy or less with under 3 points. The <b>rotation helper</b> (Settings) marks the next ability green, one to press now blue.' },
  ],
};
