// First-time tutorials for the Priest specs (js/tutorial.js), from each spec's APL (js/data/priest-apl.js and
// js/data/wowsims-builds.js; Holy has none, so its tutorial follows its bars, js/data/healing.js and
// js/classes/healer.js): what the spec does, its core abilities in priority order, the situational rules and what to
// watch.
export const TUTORIALS = {
  shadow: [
    { title: 'Shadow Priest', text: 'A Shadow caster: keep your damage over time on the target, fire <b>Mind Blast</b> and <b>Shadow Word: Death</b> on cooldown, and channel <b>Mind Flay</b> in between. All of it in Shadowform, on a mana bar you have to look after.' },
    { title: 'Shadowform', abilities: ['shadowform'], text: 'Stay in <b>Shadowform</b>: 10% more Shadow damage, Shadow spells cost 50% less and crit harder. It is the first line of the APL, so if it is not up, put it back before anything else.' },
    { title: 'Shadow Word: Pain', abilities: ['shadowWordPain'], text: 'Keep <b>Shadow Word: Pain</b> on the target: recast it whenever it has fallen off. It ticks every 3 sec for 18 sec.' },
    { title: 'Devouring Plague', abilities: ['devouringPlague'], text: 'Then <b>Devouring Plague</b> whenever it is not on the target. Its 24 sec cooldown matches its 24 sec of ticks, so it is up again as it runs out, and it heals you as much as it deals.' },
    { title: 'Mind Blast', abilities: ['mindBlast'], text: 'Cast <b>Mind Blast</b> every time its 8 sec cooldown is up. It is also your pre-pull cast, landing as the fight starts.' },
    { title: 'Shadow Word: Death', abilities: ['shadowWordDeath'], text: 'Then <b>Shadow Word: Death</b> on its 18 sec cooldown. It is instant, but costs you 10% of your health.' },
    { title: 'Mind Flay and Inner Focus', abilities: ['mindFlay', 'innerFocus'], text: 'Everything else is <b>Mind Flay</b>: let it run its full 3 ticks. When <b>Inner Focus</b> is ready, press it before a Mind Flay: the next spell is free.' },
    { title: 'Cooldowns and mana', abilities: ['racial', 'conjured', 'potion', 'offensivePotion'], text: 'Your racial and the offensive potion go out when ready. Take a <b>Demonic Rune</b> or mana potion as soon as its mana fits under your maximum, so none of it is wasted.' },
    { title: 'What to watch', text: 'Watch your damage over time on the target, Mind Blast\'s and Shadow Word: Death\'s cooldowns, and your mana. With the <b>Rotation helper</b> on (Settings), a green border marks the next ability the APL would press, a blue one a cooldown to press now.' },
  ],
  smite: [
    { title: 'Smite Priest', text: 'Discipline and Holy: a Holy caster. Keep <b>Holy Fire</b> and <b>Shadow Word: Pain</b> on the target, <b>Penance</b> when it is ready and <b>Smite</b> the rest. As your mana runs low you drop to cheaper ranks.' },
    { title: 'Power Infusion', abilities: ['powerInfusion'], text: 'Cast <b>Power Infusion</b> a second before the pull: 20% more spell damage for 15 sec. It is off the global cooldown; use it again whenever it is ready.' },
    { title: 'Holy Fire', abilities: ['holyFire'], text: 'Keep <b>Holy Fire</b> burning on the target: recast it whenever its damage over time is gone, while you have 20% mana or more.' },
    { title: 'Shadow Word: Pain', abilities: ['shadowWordPain'], text: 'Keep <b>Shadow Word: Pain</b> on the target too. With your Holy Fire or Shadow Word: Pain on it, Smite and Penance deal more (Power in Light).' },
    { title: 'Penance', abilities: ['penance'], text: 'Channel <b>Penance</b> whenever you can: a bolt at once and one a second, on a 12 sec cooldown.' },
    { title: 'Smite', abilities: ['smite'], text: 'Everything else is <b>Smite</b>.' },
    { title: 'Low mana', abilities: ['smiteR5', 'holyFireR5'], text: 'Below 20% mana, switch to the cheaper ranks: <b>Holy Fire (Rank 5)</b> to keep the burn up and <b>Smite (Rank 5)</b> as the filler. Below 10% the APL shoots your wand until you have mana again.' },
    { title: 'Packs', abilities: ['holyNova'], text: 'The APL saves <b>Holy Nova</b> for 3 or more targets with Holy Purpose up: it hits every enemy within 10 yards of you and causes no threat.' },
    { title: 'What to watch', text: 'Watch Holy Fire and Shadow Word: Pain on the target, Penance\'s cooldown and your mana. With the <b>Rotation helper</b> on (Settings), a green border marks the next ability the APL would press, a blue one a cooldown to press now.' },
  ],
  holyPriest: [
    { title: 'Holy Priest', text: 'A healer: keep the raid alive while the boss hits the tank and the whole raid. There is no APL, so the rotation helper stays quiet and your score is your healing. A heal goes to the player under your mouse on the raid frames, else the one you clicked, else you.' },
    { title: 'Heal', abilities: ['heal'], text: '<b>Heal</b> is your efficient one: a 3 sec cast for little mana. Use it for steady damage, above all on the tank, who is hit every couple of seconds.' },
    { title: 'Greater Heal', abilities: ['greaterHeal'], text: '<b>Greater Heal</b> is slow and large (3 sec, 710 mana). Start it early on someone who will need a big heal, like the tank, so it does not land as overhealing.' },
    { title: 'Flash Heal', abilities: ['flashHeal'], text: '<b>Flash Heal</b> lands in 1.5 sec but costs a lot for what it heals. Keep it for emergencies, when someone would die before a slower heal.' },
    { title: 'Renew and Power Word: Shield', abilities: ['renew', 'powerWordShield'], text: 'Both are instant. <b>Renew</b> heals over 15 sec. <b>Power Word: Shield</b> absorbs damage for 30 sec, but the target cannot be shielded again for 15 sec (Weakened Soul). Good while moving or on the tank.' },
    { title: 'Prayer of Healing', abilities: ['prayerOfHealing'], text: 'A few times a fight a wave of fire hits the whole raid. <b>Prayer of Healing</b> heals everyone in your target\'s group of five: pick a player in the most hurt group.' },
    { title: 'Dispels', abilities: ['dispelMagic', 'abolishDisease'], text: 'Now and then someone gets a debuff that ticks: take a magic one off with <b>Dispel Magic</b> and a disease with <b>Abolish Disease</b>. The raid frames colour debuffs by type.' },
    { title: 'Power Infusion and mana', abilities: ['powerInfusion', 'potion', 'conjured'], text: '<b>Power Infusion</b> makes your heals 20% stronger for 15 sec: use it when damage is heavy. Watch your mana and use the mana potion and Demonic Rune before you run dry.' },
    { title: 'What to watch', text: 'Keep your eyes on the raid frames: the tank first, then whoever drops lowest. Wasted healing (overhealing) is wasted mana, so pick the heal that fits the gap. The meter shows your healing; hover a heal for its overhealing.' },
  ],
};
