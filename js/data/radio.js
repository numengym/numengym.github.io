// Radio Numen 104.2 (js/radio.js): what the hosts say between the songs, in the manner of the Grand Theft Auto stations:
// a smug veteran and a savage co-host talking over the next song's intro, station IDs, fake ads, the news, callers, and
// the listener's own fight roasted on air. Mean about classes, races, raiders and parses; real people only for their famous
// public moments (a Hardcore wipe in Dire Maul, a race lost to a hotfix), never for who they are.
// A segment is a list of [who, line]; {track} {style} {prev} {prevStyle} {name} {spec} {cls} {race} {dps} {parse} are
// filled in (radio.js fill); a line needing a value the listener lacks is skipped.

// The voices: who they are and how the browser should say them (pitch, rate, and the voices to try first).
export const HOSTS = {
  rex: { name: 'Rex Overcap', pitch: 0.8, rate: 1.04, prefer: [/guy|david|daniel|george|male|uk english male|ryan|christopher/i] },
  candi: { name: 'Candi Crit', pitch: 1.25, rate: 1.1, prefer: [/zira|samantha|female|aria|jenny|libby|sonia|google us english|hazel/i] },
  ad: { name: 'Announcer', pitch: 0.6, rate: 1.22, prefer: [/mark|guy|george|david|male/i] },
  caller: { name: 'Caller', pitch: 1.45, rate: 1.18, prefer: [/./] },
};

export const STATION_IDS = [
  [['candi', 'Radio Numen, one oh four point two. The only station licensed to play near training dummies.']],
  [['rex', 'You are listening to Radio Numen. If you can hear this, you are not pressing buttons. Press buttons.']],
  [['ad', 'Radio Numen. Louder than your raid leader. Smarter than your raid leader. Honestly, not a high bar.']],
  [['candi', 'One oh four point two, Radio Numen. Music for people whose only cardio is running back from the graveyard.']],
  [['rex', 'Radio Numen. We play the bangers, you play the rotation, and one of us is doing it right.']],
  [['ad', 'Radio Numen. Now with forty percent less hunter.']],
  [['candi', 'Radio Numen. If Blizzard hotfixes your boss in the middle of the race, we recommend the Double Bird. Two fingers. Zero regrets.']],
  [['rex', 'Radio Numen, one oh four point two. Unlike some captains, we do not leave the crew in Dire Maul.']],
];

export const WELCOME = [
  [['rex', 'Good evening, Azeroth! This is Rex Overcap on Radio Numen, the station that judges you.'],
    ['candi', 'And I am Candi Crit. We will be playing music, insulting your class, and watching your DPS. Mostly the last two.'],
    ['rex', 'Here is {track}. Hit the dummy. It has it coming.']],
  [['candi', 'Hi sweeties, Candi Crit here on Radio Numen. Rex is in the booth, still bitter about a loot roll from two expansions ago.'],
    ['rex', 'It was my axe, Candi. Everybody knows it was my axe.'],
    ['candi', 'Anyway. {track}. Go hurt something.']],
];

export const INTROS = [
  [['rex', 'Here is {track}. It is {style}. Like your rotation, it builds slowly and then disappoints nobody, unlike your rotation.']],
  [['candi', 'Coming up, {track}. Play this one loud. Louder than the paladin explaining his build.']],
  [['rex', '{track}, a little {style} for you. Doctors say it lowers your heart rate. Doctors have never pugged a raid.']],
  [['candi', 'This is {track}. If your DPS goes up during this song, that is the song. If it goes down, that is you.']],
  [['rex', 'Next up, {track}. Dedicated to the warlock who keeps life tapping into the fire. We see you, buddy. We all see you.']],
  [['candi', '{track}. {style}. Pairs nicely with an energy drink and a crippling fear of the parse screen.']],
  [['rex', 'Let us go to {track}. Hunters, this is a song, not a pet. Please do not try to tame it.']],
  [['candi', 'Here is {track}, for everyone grinding dummies at three in the morning instead of sleeping. Your mother called. We lied for you.']],
];

export const OUTROS = [
  [['candi', 'That was {prev}. Gorgeous. Like a crit you did not deserve.']],
  [['rex', '{prev}, there. I listened to that whole thing and my wife still has not come back. Coincidence.']],
  [['candi', '{prev}, on Radio Numen. If you parsed grey through that, the song is not the problem, honey.']],
  [['rex', 'That was {prev}. {prevStyle}. Back in my day we did not have {prevStyle}. We had dial-up and a guild master named Darkshadow.']],
  [['candi', 'Ooh, {prev}. That one is going straight to the playlist, right next to the screenshots of my parses that I send to my ex.']],
];

// Two hosts going at it.
export const BANTER = [
  [['rex', 'Candi, why do hunters roll on the swords?'],
    ['candi', 'Because the swords were there, Rex. That is the whole hunter decision tree. Is it shiny? Need.']],
  [['candi', 'Rex, I saw a gnome warrior today.'],
    ['rex', 'Adorable. Did it reach the boss?'],
    ['candi', 'It hit his ankle for a thousand. Then he stepped on it. Circle of life.']],
  [['rex', 'You know what the undead smell like, Candi?'],
    ['candi', 'Like a raid that has been doing Molten Core since launch?'],
    ['rex', 'Exactly like that. And victory. Mostly that first thing.']],
  [['candi', 'A tauren walked into the auction house today and tried to sell leather.'],
    ['rex', 'Whose leather?'],
    ['candi', 'We did not ask. Some questions are above our pay grade.']],
  [['rex', 'Why do night elves dance on mailboxes?'],
    ['candi', 'Because ten thousand years of immortality and nobody ever gave them a hobby.']],
  [['candi', 'Rex, what is the difference between a paladin and a vending machine?'],
    ['rex', 'The vending machine gives you something when you are dying.']],
  [['rex', 'Raid leaders, Candi. Why are they like that?'],
    ['candi', 'Because the job description is, yell at forty adults who forgot to eat, and the pay is a shoulder token.']],
  [['candi', 'Mages are the only class that brings their own food and still asks you for some.'],
    ['rex', 'And then they blink into the boss and blame the tank.']],
  [['rex', 'My rogue friend says he is the best player in his guild.'],
    ['candi', 'How would he know? Nobody has seen him in three years. He is just a name on the meter and a missing set of bracers.']],
  [['candi', 'Warriors, listen. Rage is a resource. Not a personality.'],
    ['rex', 'Says you. I have been in Berserker Stance since nineteen ninety-nine and I have never been happier. Or more divorced.']],
  [['rex', 'Fun fact, Candi: the average shaman has dropped four hundred totems this week.'],
    ['candi', 'And picked up zero. They just leave them there. Like a dad leaving for milk.']],
  [['candi', 'I dated a priest once.'],
    ['rex', 'How was it?'],
    ['candi', 'Every time I got hurt he looked at the meter first to see if he was getting credit for it.']],
  [['rex', 'Druids. Bear, cat, tree, owl. Pick one, sweetheart.'],
    ['candi', 'That is what their therapist says too, Rex.']],
  [['candi', 'Is it true trolls can regenerate a limb?'],
    ['rex', 'Yes, but not a guild. Ask any troll guild master. Ask the empty guild bank.']],
  [['rex', 'You ever notice dwarves never complain about the beer?'],
    ['candi', 'Because they never stop drinking it long enough to taste it.']],
  [['candi', 'Skyborne. People with wings. In a game where everybody still takes the flight path.'],
    ['rex', 'They are the only race that can be late to a raid and blame the wind.']],
  [['candi', 'Rex, what do you do when your group gets overwhelmed in Dire Maul?'],
    ['rex', 'Depends. Are you a healer, a tank, or a pirate?'],
    ['candi', 'Pirate.'],
    ['rex', 'Then you run, Candi. You run and you write a very long statement.']],
  [['rex', 'You know the Double Bird, Candi?'],
    ['candi', 'Malvanis, Terrace of Endless Spring, stealth hotfix, both fingers straight at Blizzard. Art. Pure art.'],
    ['rex', 'Finally, a raider with an off hand that does something.']],
];

// The listener's own fight, on air. {dps} and {parse} come from the last fight.
export const ROASTS = [
  [['candi', 'We have a listener! {name}, the {race} {spec} {cls}, just did {dps} DPS on a training dummy.'],
    ['rex', 'The dummy is fine. The dummy has requested a stronger opponent.']],
  [['rex', 'Shout out to {name}. {dps} DPS. Son, that is not damage per second. That is damage per sitcom.']],
  [['candi', '{name} parsed {parse} on that last pull.'],
    ['rex', 'Percent, Candi, or degrees Celsius? Because either way it is lukewarm.']],
  [['rex', 'Breaking news: {name} the {spec} {cls} pressed the right button. Once. We are as shocked as you are.']],
  [['candi', 'Hey {name}, sweetie, {dps} DPS. I have seen more damage from a level five rabbit. And it was on my side.']],
  [['rex', 'To {name}, out there pulling {dps}: never change. Actually, change. Change a lot. Start with the talents.']],
];

export const NEWS = [
  [['candi', 'Radio Numen news. A guild in Stormwind has disbanded after a forty minute argument about who pulled. Sources confirm: it was the hunter pet.']],
  [['rex', 'In the news: Ragnaros was asked how he feels about being killed every Tuesday. He said, quote, by fire be purged. His agent says that is all he ever says.']],
  [['candi', 'News: the goblins have raised the price of sapper charges again, citing the rising cost of goblin funerals.']],
  [['rex', 'Local news: a gnome engineer has invented a device that turns gold into smaller amounts of gold. It is called the auction house.']],
  [['rex', 'Radio Numen news. In Dire Maul, a pirate captain led his crew bravely into the north wing, and then bravely back out of it, alone. Two level sixties did not make it. The captain says he does not care about Hardcore anymore. The two level sixties were not asked.']],
  [['candi', 'Race news! Malvanis lost the Terrace of Endless Spring race to a stealth hotfix, and answered Blizzard with not one, but two middle fingers. The Double Bird. Blizzard says it is investigating, and will hotfix the second finger next Tuesday.']],
  [['candi', 'And finally, Onyxia says she is tired of hearing about more dots, and would like everyone to know she has a name.']],
  [['rex', 'Weather: the forecast for Molten Core is hot, with a hundred percent chance of a warlock standing in it.']],
];

// A listener calls in.
export const CALLERS = [
  [['rex', 'Caller, you are on Radio Numen.'],
    ['caller', 'Hi Rex, long time listener. My raid leader says I need to use my cooldowns.'],
    ['rex', 'And?'],
    ['caller', 'I am saving them. For an emergency.'],
    ['rex', 'The boss is the emergency, champ. Next caller.']],
  [['candi', 'Caller, go ahead.'],
    ['caller', 'Candi, is it a ninja loot if I really, really needed it?'],
    ['candi', 'That is literally the definition, babe. Bye.']],
  [['rex', 'You are on the air.'],
    ['caller', 'Yeah, I play a hunter and people keep saying I am bad.'],
    ['rex', 'Is your pet on passive?'],
    ['caller', 'What is passive?'],
    ['rex', 'There it is. Thank you for calling.']],
  [['rex', 'Line two, go.'],
    ['caller', 'Rex, my group pulled too much in Dire Maul. What do I do?'],
    ['rex', 'Two options, son. Stay and fight like a hero, or run like a pirate and blame the hardcore rules. One of them gets you kicked from OnlyFangs.']],
  [['candi', 'Caller, hi!'],
    ['caller', 'I just wanted to say I tank in Berserker Stance because it feels more alive.'],
    ['candi', 'So does your healer, sweetie. For now.']],
];

// The ads: one announcer, a fake product each.
export const ADS = [
  [['ad', 'Is your raid leader yelling? Is your guild chat on fire? Try Thistle Tea. The tea that tastes like a rogue licked a candle.'],
    ['ad', 'Thistle Tea. Brewed with real thistles, and a guy named Steve.']],
  [['ad', 'Goblin Sapper Charge! For when you want to hit the boss and yourself at the same time.'],
    ['ad', 'Goblin Sapper Charge. Because friendly fire is still fire.']],
  [['ad', 'Tired of your class? Respec today at your local trainer. Fifty gold, a hundred gold, your house, your marriage.'],
    ['ad', 'Talent respecs. Find yourself, then lose yourself again on Tuesday.']],
  [['ad', 'Gnomish Battle Chicken. It fights for you, it believes in you, and when it explodes, it takes your problems with it.'],
    ['ad', 'Gnomish Engineering. Ninety percent of the time, it works every time.']],
  [['ad', 'Sick of walking back from the graveyard? Try Soulstone! Die with confidence, come back with regrets.'],
    ['ad', 'Soulstone. Warlock-made, warlock-tested, warlock-blamed.']],
  [['ad', 'Mighty Rage Potion. Taste the anger. Feel the anger. Become the anger. Side effects include shouting at your monitor.']],
  [['ad', 'Loot Council Insurance. When the officers give it to their girlfriend again, we give you a strongly worded scroll.']],
];

export const AD_BREAK_IN = [
  [['candi', 'We will be right back after these messages. Do not go anywhere. You literally cannot, you are rooted.']],
  [['rex', 'Time for the people who pay my bar tab.']],
];
export const AD_BREAK_OUT = [
  [['rex', 'And we are back. On Radio Numen.']],
  [['candi', 'Back on one oh four point two. I bought all of those. None of them worked.']],
];
