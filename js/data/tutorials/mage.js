// First-time tutorials for the Mage specs (js/tutorial.js), from each spec's APL (js/data/mage-apl.js and
// js/data/wowsims-builds.js): what the spec does, its core abilities in priority order, the situational rules and what
// to watch.
export const TUTORIALS = {
  arcane: [
    { title: 'Arcane Mage', text: 'A caster that turns mana into damage. <b>Arcane Blast</b> is your filler and builds Arcane Charges, <b>Arcane Wrath</b> hits hard on a short cooldown, and free <b>Arcane Missiles</b> from Missile Barrage go out the moment they proc.' },
    { title: 'Missile Barrage', abilities: ['arcaneMissiles'], text: 'Arcane Blast (and Arcane Wrath, at half the chance) can proc <b>Missile Barrage</b>: your next Arcane Missiles is free and twice as fast. Spend it straight away; it comes before Arcane Wrath and Arcane Blast.' },
    { title: 'Arcane Wrath', abilities: ['arcaneWrath', 'presenceOfMind'], text: 'Cast Arcane Wrath every time its 6 sec cooldown is up; it is also your pre-pull cast. When it is ready and <b>Presence of Mind</b> is too, press Presence of Mind then Arcane Wrath so the 3.5 sec cast goes out instantly.' },
    { title: 'Fire Blast', abilities: ['fireBlast'], text: 'Instant, on an 8 sec cooldown: weave <b>Fire Blast</b> in whenever it is ready and Arcane Wrath is not.' },
    { title: 'Arcane Blast', abilities: ['arcaneBlast'], text: 'Everything else is <b>Arcane Blast</b>. Each one adds an <b>Arcane Charge</b> (up to 4): spell power from your Intellect, but Arcane Blast costs 175% more per charge. Charges last 15 sec and nothing spends them.' },
    { title: 'Cooldowns', abilities: ['arcanePower', 'presenceOfMind', 'manaGem'], text: 'Fire <b>Arcane Power</b>, Presence of Mind and your racial when Arcane Wrath is ready or Missile Barrage is up, so they land on your big hits. The <b>Mana Ruby</b> and mana potion go out with them, if their mana fits under your maximum.' },
    { title: 'Evocation', abilities: ['evocation'], text: 'At 10% mana channel <b>Evocation</b>; it stops at 99%.' },
    { title: 'What to watch', text: 'Keep an eye on Missile Barrage, Arcane Wrath\'s cooldown and your mana. With the <b>Rotation helper</b> on (Settings), a green border marks the next ability the APL would press, a blue one an off-GCD cooldown to press now.' },
  ],
  arcaneFire: [
    { title: 'Arcane Fire', text: 'Arcane with Fire talents: <b>Arcane Blast</b> and <b>Arcane Wrath</b> as in Arcane, plus Fire Blast and Pyroblast from Heating Up, with <b>Scorch</b> as the filler instead of Arcane Missiles.' },
    { title: 'Pyroblast and Fire Blast', abilities: ['pyroblast', 'fireBlast'], text: 'At 3 stacks of <b>Heating Up</b> (from Fire crits and every Fire Blast) cast Pyroblast: it comes first. Then use <b>Fire Blast</b> whenever it is off cooldown, which also feeds Heating Up.' },
    { title: 'Missile Barrage', abilities: ['arcaneMissiles'], text: 'When Missile Barrage procs, your next <b>Arcane Missiles</b> is free and twice as fast: cast it right away, ahead of Arcane Wrath and Arcane Blast.' },
    { title: 'Arcane Wrath', abilities: ['arcaneWrath', 'presenceOfMind'], text: 'When Arcane Wrath and <b>Presence of Mind</b> are both ready, press Presence of Mind then Arcane Wrath for an instant cast. Otherwise Arcane Wrath still goes out on cooldown, once you have 3 Arcane Charges.' },
    { title: 'Arcane Blast and Scorch', abilities: ['arcaneBlast', 'scorch'], text: 'Keep at least 3 <b>Arcane Charges</b>: Blast while you have fewer or they are about to drop. With mana above 20% plus 1.3% per second left, keep Blasting; otherwise fill with <b>Scorch</b>.' },
    { title: 'Cooldowns and mana', abilities: ['arcanePower', 'evocation', 'manaGem'], text: 'Fire <b>Arcane Power</b> and your racial when Arcane Wrath is ready or Missile Barrage is up. The Mana Ruby and potion go when they fit under your maximum mana; at 10% mana channel <b>Evocation</b> to 99%.' },
    { title: 'What to watch', text: 'Watch Heating Up, your Arcane Charges and Missile Barrage. The <b>Rotation helper</b> (Settings) puts a green border on the next ability the APL would press, a blue one on a cooldown to press now.' },
  ],
  fire: [
    { title: 'Fire Mage', text: 'A crit-hungry caster. <b>Scorch</b> stacks Fire Vulnerability, <b>Fireball</b> is your main nuke, and Fire crits build <b>Heating Up</b> for a fast Pyroblast. You open with a Pyroblast cast before the pull.' },
    { title: 'Pyroblast on Heating Up', abilities: ['pyroblast'], text: 'Crits with Fireball, Fire Blast and Scorch, and every Fire Blast that lands, stack <b>Heating Up</b>; each stack makes Pyroblast cast 25% faster. At 3 stacks Pyroblast is your top priority.' },
    { title: 'Fire Blast', abilities: ['fireBlast'], text: 'Instant, on an 8 sec cooldown: press <b>Fire Blast</b> every time it is ready. It always adds a Heating Up stack, two when it crits.' },
    { title: 'Scorch and Fire Vulnerability', abilities: ['scorch'], text: 'Scorch puts <b>Fire Vulnerability</b> on the target (3% more Fire damage from you per stack, up to 5, for 30 sec). Scorch until it has 5 stacks, and again whenever it has less than 5 sec left.' },
    { title: 'Arcane Charges and Missile Barrage', abilities: ['arcaneBlast', 'arcaneMissiles'], text: 'Keep an <b>Arcane Charge</b> up (spell power for every school): Arcane Blast when you have none or they are about to drop. When Missile Barrage procs, cast the free, fast <b>Arcane Missiles</b>.' },
    { title: 'Fireball, or Scorch', abilities: ['fireball', 'scorch'], text: 'Fill with <b>Fireball</b>, but only if Fire Blast will still be on cooldown when it finishes. If Fire Blast is about to come up, cast a Scorch instead so you do not sit on it.' },
    { title: 'Combustion and mana', abilities: ['combustion', 'evocation', 'manaGem'], text: 'Once Fire Vulnerability has 5 stacks, fire <b>Combustion</b> and your racial. Use the Mana Ruby and potion when they fit under your maximum mana, and channel <b>Evocation</b> when you cannot afford a Pyroblast.' },
    { title: 'Packs', abilities: ['flamestrike', 'blastWave'], text: 'The APL plays one target. <b>Flamestrike</b> (on the ground at your target) and <b>Blast Wave</b> (around you) are on your bar for packs of dummies.' },
    { title: 'What to watch', text: 'Watch your Heating Up stacks, Fire Vulnerability on the target and Fire Blast\'s cooldown. The <b>Rotation helper</b> (Settings) puts a green border on the next ability the APL would press, a blue one on a cooldown to press now.' },
  ],
  ffb: [
    { title: 'Frostfire Mage', text: 'Fire and Frost talents with <b>Frostfire Bolt</b> as the nuke: it is a Fire spell for Heating Up and Ignite and a Chill for Fingers of Frost. You open with a Pyroblast cast before the pull.' },
    { title: 'Scorch first', abilities: ['scorch'], text: 'Stack <b>Fire Vulnerability</b> with Scorch until the target has 5 stacks, and refresh it whenever it has less than 5 sec left. This comes before everything but Evocation.' },
    { title: 'Pyroblast on Heating Up', abilities: ['pyroblast'], text: 'Crits with Frostfire Bolt, Scorch and Fire Blast, and every Fire Blast, stack <b>Heating Up</b>. At 3 stacks cast Pyroblast, its cast 75% shorter.' },
    { title: 'Fire Blast', abilities: ['fireBlast'], text: 'Use <b>Fire Blast</b> on cooldown, but only while Fingers of Frost has fewer than 2 charges: with both charges up, let Frostfire Bolt use them instead.' },
    { title: 'Frostfire Bolt', abilities: ['frostfireBolt'], text: 'Everything else is <b>Frostfire Bolt</b>. Each one can proc Fingers of Frost and Heating Up and leaves a short burn on the target.' },
    { title: 'Cooldowns and mana', abilities: ['combustion', 'evocation', 'manaGem'], text: 'With 5 Fire Vulnerability stacks up, fire <b>Combustion</b> and your racial. Use the Mana Ruby and potion when they fit under your maximum mana; channel <b>Evocation</b> when you cannot afford a Pyroblast.' },
    { title: 'What to watch', text: 'Watch Fire Vulnerability, Heating Up and Fingers of Frost. The <b>Rotation helper</b> (Settings) puts a green border on the next ability the APL would press, a blue one on a cooldown to press now.' },
  ],
  frost: [
    { title: 'Frost Mage', text: 'A steady caster: <b>Frostbolt</b> is the nuke, and its Chill procs <b>Fingers of Frost</b>, which makes Ice Lance hit as if the target were frozen. Winter\'s Chill sets up Cone of Cold, and Ice Barrier keeps Frigid Power up. You open with Ice Barrier and a Frostbolt cast before the pull.' },
    { title: 'Ice Lance on Fingers of Frost', abilities: ['iceLance', 'frostbolt'], text: '<b>Fingers of Frost</b> gives 2 charges; Ice Lance deals triple to a Frozen target. When a Frostbolt finishes and 1 charge is left, cast <b>Ice Lance</b> right after it.' },
    { title: 'Cone of Cold and Cold Snap', abilities: ['coneOfCold', 'coldSnap'], text: 'Cast <b>Cone of Cold</b> when the target has 5 stacks of <b>Winter\'s Chill</b>, even on one target; stand within its 10 yards. If its cooldown has 7 sec or more left, <b>Cold Snap</b> finishes it so you can cast it again.' },
    { title: 'Ice Barrier and Frostbolt', abilities: ['iceBarrier', 'frostbolt'], text: 'Recast <b>Ice Barrier</b> when <b>Frigid Power</b> (Frost spells 3% more, for 1 min) has 3 sec or less left. Everything else is <b>Frostbolt</b>.' },
    { title: 'Cooldowns and mana', abilities: ['evocation', 'manaGem'], text: 'Your racial, the <b>Mana Ruby</b> and the mana potion go out while Fingers of Frost is up, the gem and potion if their mana fits under your maximum. At 5% mana channel <b>Evocation</b>; it stops at 99%.' },
    { title: 'Packs', abilities: ['blizzard'], text: 'The APL plays packs as one target. <b>Blizzard</b> is on your bar for packs of dummies.' },
    { title: 'What to watch', text: 'Watch your Fingers of Frost charges, Winter\'s Chill on the target and Frigid Power. The <b>Rotation helper</b> (Settings) puts a green border on the next ability the APL would press, a blue one on a cooldown to press now.' },
  ],
};
