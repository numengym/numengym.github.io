// First-time tutorials for the Druid specs (js/tutorial.js), from each spec's APL (js/data/druid-apl.js and
// js/data/feral-apl.js): what the spec does, its core abilities in priority order, the situational rules and what to
// watch. Restoration has no APL (js/data/healing.js, js/classes/healer.js): its steps come from the heals themselves.
// The Hybrid builds (catHybrid, bearHybrid) play their form's list and fall back to feralCat and feralBear.
export const TUTORIALS = {
  balance: [
    { title: 'Balance Druid', text: 'A ranged caster: keep two damage-over-time spells on the target and cast Wrath and Starfire between them, with <b>Eclipse</b> turning your Wraths into faster Starfires. Everything runs on <b>mana</b>.' },
    { title: 'Moonfire', abilities: ['moonfire'], text: 'The first spell in the list after Innervate: cast Moonfire whenever it is not on the target. It hits at once, then ticks every 3 sec.' },
    { title: 'Insect Swarm', abilities: ['insectSwarm'], text: 'Next: Insect Swarm whenever it has fallen off the target, ticking every 2 sec. Both are instant and sit above every cast in the list: keeping them up comes first.' },
    { title: 'Starfire on Eclipse', abilities: ['starfire'], text: 'While <b>Eclipse</b> is up, Starfire comes before Wrath: each one casts faster and uses a charge. On your last charge the list does not queue a second Starfire behind the one you are already casting.' },
    { title: 'Wrath', abilities: ['wrath'], text: 'Your filler and builder: each Wrath that lands gives Eclipse 2 Starfire charges (up to 4, for 15 sec). The helper even opens with a Wrath 1.5 sec before the pull, so the first Starfire is ready.' },
    { title: 'Innervate and cooldowns', abilities: ['innervate'], text: 'Top of the list: Innervate when mana is under 70% with more than 380 sec of fight left, or under 40% with more than 30 sec left; for 20 sec your mana comes back 5 times as fast. Trinkets, racial and potions go out when ready.' },
    { title: 'Four or more targets', abilities: ['hurricane'], text: 'On 4 or more targets Hurricane comes right after the two dots: a 10 sec channel on every enemy within 8 yards of your target each second. It costs 1495 mana, and the opening Wrath is skipped.' },
    { title: 'What to watch', text: "Watch your Eclipse charges and Nature's Grace (after a spell crit: 10% faster casts and a shorter global cooldown) by your buffs, and both dots on the target. The <b>Rotation helper</b> (Settings) puts a green border on the next cast." },
  ],
  feralCat: [
    { title: 'Feral Cat', text: 'Melee damage in Cat Form: builders earn <b>combo points</b> with <b>energy</b>, finishers spend them. Shifting Power turns <b>mana</b> into energy, so all three bars matter.' },
    { title: 'Ferocious Bite', abilities: ['ferociousBite'], text: 'With Predatory Discipline, Bite at 4+ combo points while Rip has 2+ sec left, once energy reaches 85 (60 with Clearcasting), or 70 (50) at 5 points. Until then the list pools energy: Shred and Claw wait for it.' },
    { title: 'Shifting Power', abilities: ['shiftingPower'], text: 'When your energy is 57 or less and it can be cast: 55% of your base mana for 40 energy, on an 8 sec cooldown. It cannot be used at full energy.' },
    { title: 'Rip and Rake', abilities: ['rip', 'rake'], text: 'Keep both bleeds up. Rip at 5 combo points, or at 4 when one more Shred would leave too little energy for it, and only with 8 sec of fight left. Rake whenever it has fallen off with more than 6 sec to go.' },
    { title: 'Shred and Claw', abilities: ['shred', 'claw'], text: 'Your builders. <b>Shred</b> (60 energy) from behind the target is the main one, and goes ahead of the bleeds when <b>Clearcasting</b> makes it free. Claw (45 energy) only when Shred cannot be cast, as when you are not behind.' },
    { title: 'Mana', abilities: ['potion', 'innervate'], text: 'The list drinks the mana potion once you are missing more than 2250 mana, and uses Innervate when mana is under 1400 and short of the fight left, energy is 30 or less, without Clearcasting, and at least 15 sec remain.' },
    { title: 'End of the fight', abilities: ['ferociousBite'], text: 'In the last second, Ferocious Bite with 2 or more combo points. With under 8 sec left a new Rip will not pay off, so 5 combo points go into Bite instead.' },
    { title: 'Openers and utility', abilities: ['prowl', 'ravage', 'pounce', 'faerieFire'], text: "Ravage and Pounce open from Prowl, from behind. Faerie Fire (Feral) is free and lowers armor by 505, but not on top of the raid's. The helper's simplified list uses none of these: they are yours to add." },
    { title: 'What to watch', text: 'Watch energy, combo points and the Rip and Rake timers on the target, and stay behind it for Shred. Pooling energy for Bite is part of the rotation. The <b>Rotation helper</b> puts a green border on the next ability.' },
  ],
  feralBear: [
    { title: 'Feral Bear', text: 'A tank in Dire Bear Form, scored on <b>threat</b> per second while the target hits back. You spend <b>rage</b> on five Lacerates, Primal Bite and Maul, with Demoralizing Roar kept up.' },
    { title: 'Enrage', abilities: ['enrage'], text: 'When your rage is short of the next attack (Primal Bite when it is ready, else Lacerate), the list presses Enrage: 10 rage now and 2 a second for 10 sec, at 16% less armor. 1 min cooldown, off the global cooldown.' },
    { title: 'Lacerate', abilities: ['lacerate'], text: 'Stack it to 5 on the target and keep it there: at 5 stacks, refresh it when 3 sec or less remain. It is also your filler whenever nothing above is due (15 rage).' },
    { title: 'Demoralizing Roar', abilities: ['demoralizingRoar'], text: 'Keep it on the target: the list recasts it as soon as it has run out (10 rage). Every enemy within 10 yards has 204 less attack power for 30 sec.' },
    { title: 'Primal Bite', abilities: ['primalBite'], text: 'Press it whenever it is ready (6 sec cooldown, 20 rage): it comes before Swipe and the Lacerate filler.' },
    { title: 'Swipe', abilities: ['swipe'], text: 'On 2 or more targets, while your bleeds are on them, Swipe (20 rage, 3 targets) goes ahead of the Lacerate filler.' },
    { title: 'Maul', abilities: ['maul'], text: 'Off the global cooldown: your next swing deals paw damage plus 128. The list queues it at 20 rage or more, as long as it leaves the rage for a Primal Bite due within 1.5 sec.' },
    { title: 'Potions and defensives', abilities: ['defensivePotion', 'offensivePotion', 'barkskin', 'frenziedRegeneration'], text: 'The defensive potion goes out when ready, or with none, the offensive one below 20 rage. Barkskin (20% less damage) and Frenzied Regeneration are not in the list: use them when the boss hits hard.' },
    { title: 'What to watch', text: 'Watch the Lacerate stacks and timer on the target, and your rage. The <b>Rotation helper</b> borders the next ability: green on the global cooldown, blue for Maul and Enrage, which go out right now.' },
  ],
  restoDruid: [
    { title: 'Restoration Druid', text: 'A healer: you keep a raid of ten alive through a boss fight, scored on your <b>healing</b>. A heal goes on the player under your mouse on the raid frames, else the one you clicked, else you. Every heal costs <b>mana</b>.' },
    { title: 'Rejuvenation', abilities: ['rejuvenation'], text: 'Instant, 360 mana: heals every 3 sec for 12 sec. Keep it on the tanks, who take the boss\'s swings every 2 sec. A new one replaces your last on that player.' },
    { title: 'Regrowth', abilities: ['regrowth'], text: '2 sec cast, 525 mana: a direct heal, then a heal every 3 sec for 21 sec. For a player who needs health now and more later.' },
    { title: 'Healing Touch', abilities: ['healingTouch'], text: 'Your big heal: 3.5 sec cast, 840 mana, 2332 plus all of your healing power. Save it for someone who is low; on a nearly full player most of it is overhealing.' },
    { title: 'Swiftmend', abilities: ['swiftmend'], text: 'Instant, 15 sec cooldown: eats your Rejuvenation (12 sec of it) or Regrowth (18 sec) on the target and heals that much at once. A Restoration talent, not in the starting talents: take it in the Talents tab.' },
    { title: 'Dispels', abilities: ['removeCurse', 'abolishPoison'], text: 'Every 16 sec a debuff lands on someone and ticks for 12 sec; the raid frames colour it by type. Remove Curse takes off a curse, Abolish Poison a poison. Magic and diseases you cannot remove.' },
    { title: 'Raid damage and mana', abilities: ['innervate'], text: 'Every 30 sec (first at 15 sec) Flame Wave hits the whole raid. Mana is your limit: Innervate (6 min cooldown) makes it come back 5 times as fast for 20 sec.' },
    { title: 'What to watch', text: 'Healing has no APL, so the <b>Rotation helper</b> stays quiet. Watch the raid frames, your mana and your heals over time running out on the tanks; your score is the healing you do.' },
  ],
};
