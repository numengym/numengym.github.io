// First-time tutorials for the Druid specs (js/tutorial.js), from each spec's APL (js/data/druid-apl.js and
// js/data/feral-apl.js): what the spec does, its core abilities in priority order, the situational rules and what to
// watch. Restoration has no APL (js/data/healing.js, js/classes/healer.js): its steps come from the heals themselves.
// The Hybrid builds (catHybrid, bearHybrid) play their form's list and fall back to feralCat and feralBear.
export const TUTORIALS = {
  balance: [
    { title: 'Balance Druid', text: 'A ranged caster: keep two damage-over-time spells on the target and cast Wrath and Starfire between them, with <b>Eclipse</b> turning your Wraths into faster Starfires. Everything runs on <b>mana</b>.' },
    { title: 'Opening', abilities: ['wrath'], text: 'Cast <b>Wrath</b> before the pull so it lands just as the fight starts, and a second one right after: the Eclipse charges are ready for the first Starfire.' },
    { title: 'Moonfire and Insect Swarm', abilities: ['moonfire', 'insectSwarm'], text: 'Recast <b>Moonfire</b> and <b>Insect Swarm</b> once they fall off, while more than 8 sec of the fight is left (on up to 4 targets). In the last 2.5 sec, Moonfire is the cast. Both are instant and sit above Wrath and Starfire in the list.' },
    { title: 'Starfire on Eclipse', abilities: ['starfire'], text: 'While <b>Eclipse</b> is up, Starfire comes before Wrath: each one casts faster and uses a charge. On your last charge the list does not queue a second Starfire behind the one you are already casting.' },
    { title: 'Wrath', abilities: ['wrath'], text: 'Your filler and builder: each Wrath that lands gives Eclipse 2 Starfire charges (up to 4, for 15 sec). When a dot would fall off during a Wrath, Wrath goes ahead of Starfire (unless your spell hit is capped), so Eclipse is refreshed before you recast the dot.' },
    { title: 'Potions', abilities: ['offensivePotion', 'potion'], text: 'At the top of the list: the <b>Spellblasting Potion</b> when your mana will last until the next potion (counting a Demonic Rune and Innervate that come back in time), otherwise a <b>Major Mana Potion</b>.' },
    { title: 'Innervate and cooldowns', abilities: ['innervate'], text: 'Innervate when mana is under 40% with more than 30 sec left (or under 10%), or with 380 sec or more left when 100 sec of regeneration would not fill your mana; for 20 sec your mana comes back 5 times as fast. Trinkets, racial and the Demonic Rune go out when ready.' },
    { title: 'Several targets', abilities: ['hurricane'], text: 'Hurricane, a 10 sec channel on every enemy within 8 yards of your target each second, comes ahead of the dots on 5 or more targets, on 3 or more in the last 14 sec, and on 4 once Moonfire and Insect Swarm are on all of them. It costs 1495 mana.' },
    { title: 'What to watch', text: "Watch your Eclipse charges and Nature's Grace (after a spell crit: 10% faster casts and a shorter global cooldown) by your buffs, and both dots on the target. The <b>Rotation helper</b> (Settings) puts a green border on the next cast." },
  ],
  feralCat: [
    { title: 'Feral Cat', text: 'Melee damage in Cat Form: builders earn <b>combo points</b> with <b>energy</b>, finishers spend them. Shifting Power turns <b>mana</b> into energy, so all three bars matter.' },
    { title: 'Ferocious Bite', abilities: ['ferociousBite'], text: 'With Predatory Discipline, Bite at 5 combo points while Rip has 4+ sec left, or with Blood Frenzy at 4+ points while Rip has 3+ sec left, once energy reaches 75 (45 with Clearcasting), or 60 at 5 points. Until then the list pools energy: Shred and Claw wait for it, unless Clearcasting makes them free.' },
    { title: 'Shifting Power', abilities: ['shiftingPower'], text: 'When your energy is 53 or less and it can be cast: 55% of your base mana for 40 energy, on an 8 sec cooldown. It cannot be used at full energy.' },
    { title: 'Rip and Rake', abilities: ['rip', 'rake'], text: 'Keep both bleeds up. Rip at 5 combo points, or at 4 when one more builder would leave too little energy for it, and only with 8 sec of fight left. Rake whenever it has fallen off with more than 6 sec to go.' },
    { title: 'Shred and Claw', abilities: ['shred', 'claw'], text: 'Your builders. <b>Shred</b> (60 energy) from behind the target is the main one, and goes ahead of the bleeds when <b>Clearcasting</b> makes it free. Below 60 energy at 4+ combo points (3+ with two Blood Frenzy points) it waits for energy; with one Blood Frenzy point it never waits. Claw (45 energy) only when Shred cannot be cast, as when you are not behind; without Shredding Attacks Claw is the builder.' },
    { title: 'Mana', abilities: ['potion', 'innervate'], text: 'Below 1400 mana with at least 15 sec of fight left, the list drinks the mana potion (once you are missing 2250 mana or more) and uses Innervate when energy is 30 or less, without Clearcasting.' },
    { title: 'End of the fight', abilities: ['ferociousBite'], text: 'In the last second, Ferocious Bite with 2 or more combo points. With under 8 sec left a new Rip will not pay off, so 5 combo points go into Bite instead.' },
    { title: 'Openers and utility', abilities: ['prowl', 'ravage', 'pounce', 'faerieFire'], text: "Ravage and Pounce open from Prowl, from behind. Faerie Fire (Feral) is free and lowers armor by 505, but not on top of the raid's. The helper's simplified list uses none of these: they are yours to add." },
    { title: 'What to watch', text: 'Watch energy, combo points and the Rip and Rake timers on the target, and stay behind it for Shred. Pooling energy for Bite is part of the rotation. The <b>Rotation helper</b> puts a green border on the next ability.' },
  ],
  feralBear: [
    { title: 'Feral Bear', text: 'A tank in Dire Bear Form, scored on <b>threat</b> per second while the target hits back. You spend <b>rage</b> on Lacerate, Primal Bite and Maul, with Demoralizing Roar kept up. The list is the same on any number of targets.' },
    { title: 'Enrage', abilities: ['enrage'], text: 'When your rage is short of a Lacerate, the list presses Enrage: 10 rage now and 2 a second for 10 sec, at 16% less armor. 1 min cooldown, off the global cooldown.' },
    { title: 'Lacerate', abilities: ['lacerate'], text: 'Your filler whenever Demoralizing Roar and Primal Bite are not due (15 rage): it stacks to 5 on the target and each cast refreshes it.' },
    { title: 'Demoralizing Roar', abilities: ['demoralizingRoar'], text: 'Keep it on the target: the list recasts it as soon as it has run out (10 rage). Every enemy within 10 yards has 204 less attack power for 30 sec.' },
    { title: 'Primal Bite', abilities: ['primalBite'], text: 'Press it whenever it is ready (6 sec cooldown, 20 rage): it comes before the Lacerate filler.' },
    { title: 'Maul', abilities: ['maul'], text: 'Off the global cooldown: your next swing deals paw damage plus 128. The list queues it at 20 rage or more, as long as it leaves the rage for a Primal Bite due within 1.5 sec. Swipe is not in the list: use it yourself on packs.' },
    { title: 'Potions and defensives', abilities: ['defensivePotion', 'offensivePotion', 'barkskin', 'frenziedRegeneration'], text: 'The defensive potion goes out when ready, or with none, the offensive one below 20 rage. Barkskin (20% less damage) at 60% health or less, Frenzied Regeneration below 25%.' },
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
