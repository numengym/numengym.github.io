# Numen Gym

A browser trainer for practising WoW Forever rotations on training dummies and a boss. Warrior (Fury, Arms and
Protection), Rogue (Assassination, Combat, Subtlety), Mage (Arcane, Fire, Frost), Paladin (Retribution, Holy Shock,
Protection), Priest (Shadow), Shaman (Elemental, Enhancement), Hunter (Beast Mastery, Marksmanship, Survival), Warlock (Affliction, Demonology, Destruction) and Druid (Balance, Feral Cat, Feral Bear); keybind presets, the rotation helper and the HUD are set up per
class and spec.
Combat formulas and item data come from [wowsims/forever](https://github.com/wowsims/forever) (MIT).

## Run it locally

Browsers block JavaScript modules on `file://` pages, so serve the folder:

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:8080. Any static web server works too (GitHub Pages, Cloudflare Pages, ...).
There is no build step.

The code lives at github.com/LedskiPOV/numen-gym. GitHub Pages publishes the repository root from `main` at
https://ledskipov.github.io/numen-gym/ (`.nojekyll`: the files are served as they are), so a push to `main` goes live.

## Import / export with wowsims

- **Import:** in wowsims Forever (Fury Warrior) choose *Export → JSON*, paste the text into the Character tab and press *Import*.
  The trainer reads race, gear (items, enchants, random suffixes), talents, consumables, raid buffs and boss debuffs,
  and turns them into the stats the fight uses. You can edit any of those stats afterwards.
- **Export:** *Export to wowsims* copies a wowsims JSON export. An imported export keeps all its other settings,
  so you can go back and forth.

## Files

| Path | What it is |
| --- | --- |
| `js/engine/unit.js` | The class-independent core of a fight: clock and events, auras, temporary stats, attack table, white swings, item procs, damage, casts, damage taken, fight modes; threat and aggro, and the targets' swings at whoever has aggro (dodge, parry, block, crushing blows). Classes plug in through its "class hooks" |
| `js/engine/target.js` | The shared side of a fight (`Encounter`): the targets, their health and debuffs (Sunder, Armor Shatter, Thunder Clap, Demoralizing Shout, each player's own bleeds) and the raid's debuffs. Every player in a group fight points at the same one |
| `js/classes/index.js` | The class registry and `createFight`: each class brings its fight, abilities, talent trees, spellbook and specs |
| `js/classes/warrior/fight.js` | The warrior: rage, stances, abilities (cost, rules, effects), Heroic Strike / Cleave queueing, talents |
| `js/classes/<class>/apl.js` | The class's side of the rotation helper: which wowsims spell, aura and talent ids are which of its actions, and what the look-ahead copies and predicts (a warrior's stance and rage, a rogue's energy and combo points) |
| `js/classes/rogue/fight.js` | The rogue: energy (10 per second, Adrenaline Rush), combo points, stealth, poisons (Instant on the main hand, Deadly on the off hand), builders, finishers, bleeds, talents |
| `js/classes/mage/fight.js` | The mage: mana with the five-second rule and Evocation, casts and channels (moving stops them), spell hit and crit against a level 63 boss, Arcane Charges, Missile Barrage, Clearcasting, Heating Up, Ignite, Fire Vulnerability, Combustion, Fingers of Frost, Winter's Chill |
| `js/classes/mage/hud.js`, `js/data/mage.js`, `js/data/mage-talent-tree.js`, `js/data/mage-apl.js` | The mage's HUD after the Fojji Mage UI (mana bar, five-second-rule bar, proc popups), its spells and talent values, trees and the wowsims Arcane Frost, Deep Fire and Frost APLs |
| `js/classes/paladin/fight.js` | The paladin: mana as the mage's, seals that hit off white swings, Judgement and the judgement debuffs (every landed melee hit refreshes them), Consecration, Holy Strike, Holy Shock, Hammer of Wrath, Holy Shield, Righteous Fury, Vengeance, Reckoning, the Seal of Fury shield |
| `js/classes/paladin/hud.js`, `js/data/paladin.js`, `js/data/paladin-talent-tree.js`, `js/data/paladin-apl.js` | The paladin's HUD after the Fojji Paladin UI (mana bar, swing timer, seal and judgement popups), its spells and talent values, trees, the wowsims Protection APL and the trainer's own Retribution and Holy Shock lists |
| `js/classes/caster.js` | What the casters share on top of the core unit: mana with the five-second rule, casts, channels, the global cooldown, pressing and queueing; the mage and the priest build on it |
| `js/classes/priest/fight.js`, `js/classes/priest/hud.js`, `js/data/priest.js`, `js/data/priest-talent-tree.js`, `js/data/priest-apl.js` | The Shadow Priest: its spells, periodic damage, Mind Flay, talents; the HUD after the Fojji Priest UI; the wowsims Shadow preset and APL |
| `js/classes/shaman/fight.js`, `js/classes/shaman/hud.js`, `js/data/shaman.js`, `js/data/shaman-talent-tree.js`, `js/data/shaman-apl.js` | The Elemental Shaman: its spells, Lightning Overload, totems, talents; the HUD after the Fojji Shaman UI; the wowsims Elemental preset and APL |
| `js/classes/shaman/enhancement.js` | The Enhancement Shaman: the shaman's spells and totems with the melee on, Stormstrike, Flametongue Weapon, Maelstrom Weapon, Flurry, Fire Nova, Magma Totem, Rage of the Farseer |
| `js/classes/warlock/fight.js`, `js/classes/warlock/apl.js`, `js/classes/warlock/hud.js`, `js/data/warlock.js`, `js/data/warlock-talent-tree.js`, `js/data/warlock-apl.js` | The Warlock: its spells, Banes and curse, Wrack, Soul Shards, talents, and the demon (Succubus, Imp) fighting beside you or given up to Demonic Sacrifice; its HUD; the wowsims builds and their single-target rotations |
| `js/classes/hunter/fight.js`, `js/classes/hunter/apl.js`, `js/classes/hunter/hud.js`, `js/data/hunter.js`, `js/data/hunter-talent-tree.js`, `js/data/hunter-apl.js` | The Hunter: Auto Shot on its own timer, the shots, Serpent Sting, Hunter's Mark, Rapid Fire, Aspect of the Hawk, the talents; Beast Mastery's Raptor (focus, Bite, Claw, Savage Rend) and hawks; melee in melee range; its HUD; the wowsims turret presets and APLs |
| `js/classes/druid/fight.js`, `js/classes/druid/hud.js`, `js/data/druid.js`, `js/data/druid-talent-tree.js`, `js/data/druid-apl.js` | The Balance Druid: its spells, Eclipse, Nature's Grace, Innervate, talents; the HUD after the Fojji Druid UI; the wowsims Balance preset and APL |
| `js/classes/druid/feral.js`, `js/classes/druid/feral-apl.js`, `js/classes/druid/feral-hud.js`, `js/data/feral.js`, `js/data/feral-apl.js` | The Feral Druid, a variant of the druid class (`variants` in `js/classes/index.js`): Cat Form (energy, combo points) or Dire Bear Form (rage), the paw, Omen of Clarity, Berserk and the feral talents; its HUD; the wowsims Cat and Bear presets and simplified APLs |
| `js/classes/rogue/hud.js` | The rogue's HUD pieces after the Fojji Rogue UI (energy bar with combo points, Slice and Dice and Cutthroat popups, bleeds and poisons on the target) and its tooltip texts |
| `js/data/rogue.js`, `js/data/rogue-talent-tree.js`, `js/data/rogue-apl.js` | Rogue abilities and talent values (wowsims rank curves), its talent trees and the wowsims "Direct APL" |
| `js/data/class-stats.js` | Each class's base stats and stat conversions, and the races it can be |
| `js/active-class.js` | The spec and class being played, read at load: every view takes the class's data from here |
| `tests/class-check.html` | The bot against the wowsims sim per ability for a spec (`await check('combat')`), for calibrating a class |
| `js/engine/fight.js` | Entry point that keeps the old import names (`Fight`, `createFight`, `Encounter`) |
| `js/net/group.js` | Group connection: browser to browser over WebRTC with PeerJS (its free public service only introduces the browsers). The host's room key joins; the host relays. `?localgroup` in the address uses a BroadcastChannel between tabs of one browser instead (testing, two windows on one PC) |
| `js/group-play.js` | Group play: the host's fight settings, raid buffs/debuffs and pull for everyone; Sunder Armor, Armor Shatter, Thunder Clap, Demoralizing Shout, taunts, threat and health-pool damage passed between players' encounters; the other players drawn in the arena with name tags; the group's damage and threat meters; the host's reset for everyone |
| `js/raid-frames.js` | Raid frames in a group: health, power, the leader and who has aggro, movable and sizable |
| `tests/engine-regression.html` | Fixed-dice bot fights per spec and fight mode, compared with `tests/engine-baseline.json`: open it after an engine change to see whether results moved |
| `js/data/warrior.js` | Ability, talent, race and rating data with the wowsims source of each value |
| `js/data/buffs.js` | Raid buffs and boss debuffs, keyed by wowsims field names |
| `js/data/db.js` | Item / enchant / consumable database, generated from wowsims `assets/database/db.json` |
| `js/character.js` | Gear + buffs → character sheet |
| `js/wowsims.js` | wowsims JSON import / export |
| `js/audio.js` | Sound made with Web Audio (no sound files): hits, crits, blocks, shouts, procs, the pull countdown, a GTFO-style alarm while you stand in fire, raid pack alert sounds and an endless lofi loop |
| `js/raid-pack.js` | Boss mechanic alerts on the Fojji raid pack anchors (boss timers, emphasized timers, special warnings, text, large icons), with on/off per kind, sounds, spoken callouts and an unlock mode to move them |
| `js/main-menu.js` | The main menu: a card per class with its specs (like the wowsims Forever start page), then race, body type, spec and your name; the warrior specs are playable |
| `js/main.js` | UI, keybinds, game loop. The HUD is laid out like the Fojji Warrior UI (WeakAuras pack): sizes, colours and anchor offsets from its 1440p export |
| `js/apl.js` | Rotation helper: runs a wowsims APL (priority list, groups, variables, conditions) against the live fight; borders on the buttons to press |
| `js/data/fury-apl.js` | Default APL for the helper. An imported wowsims export, or an APL pasted in Settings, replaces it |
| `js/results.js` | After-fight results (damage, threat, auras, casts, resources, timeline, damage taken, log) |
| `js/score.js` | Parse-style score (0–100, Warcraft Logs colours) against a reference: the wowsims sim, else the rotation helper's bot |
| `js/data/warrior-talents.js` | The three warrior talent trees (wowsims `ui/sim/talents/trees/warrior.json`, icons from its db.json), what each modelled talent does in the trainer, and the wowsims talent presets as builds |
| `js/data/warrior-spellbook.js` | The warrior spellbook at level 60: every class spell at its highest Forever rank (IDs and icons from wowsims db.json), talent spells when talented |
| `js/talents.js` | Talent strings ↔ points, and the rules for spending them (51 points, 5 per row, prerequisites) |
| `js/data/specs.js` | The specs (Fury, Arms, Protection; Assassination, Combat, Subtlety): class, default character, APL, starting stance, bar layout, and for Protection the threat score and a fight that hits back |
| `js/data/arms-apl.js` | The wowsims Forever Arms APL |
| `js/data/prot-apl.js` | The wowsims Forever Protection APL |
| `js/drills.js` | Move phases in the arena: a warning, then fire over the melee area of your target that you have to step out of |
| `js/ghost.js` | The sim as a ghost: the rotation helper's bot plays the same fight beside you (its own engine fight) and is drawn as a see-through copy of your warrior |
| `js/wowsims-sim.js` | Runs the real wowsims Forever sim (its `sim_worker.js` and `lib.wasm` from wowsims.com) in a Web Worker with your setup |
| `js/data/zones.js` | Zones (Hyjal Summit, The Barrow Deeps, Mount Hyjal, Training Grounds) and which flasks get the zone bonus |
| `js/macros.js` | WoW-style macros (`/cast [nostance:1] Battle Stance`), edited in Settings; an enabled macro takes over its ability's button and key. Keys can be the mouse wheel and side buttons too |
| `js/data/keybinds.js` | Keybind presets per class/spec: Default and Ledski (from his in-game Myslot export); your own presets are saved per spec |
| `js/data/consumable-icons.js` | Consumable icons, generated from wowsims `db.json` |
| `js/world/arena.js` | 3D arena, movement, camera, telegraphs |
| `js/world/characters.js` | Creates and animates the original warrior, tank, boss and raid characters |
| `js/world/models.js` | Race proportions, character factories, gear appearance adapter and jointed animation |
| `js/world/appearance.js` | Forever race/class restrictions, reference starter outfits and appearance options |
| `js/world/race-bodies.js` | Both body types, race anatomy, skin tones and hairstyles |
| `js/world/starter-clothing.js` | Fitted starter garments, painted cloth details and footwear |
| `js/world/character-body.js` | Shared humanoid rig and equipment attachment |
| `js/world/heads.js` | Original race-specific faces and features |
| `js/world/skeleton.js` | Noggenfogger skeleton anatomy, torn navy shorts and held equipment |
| `js/world/weapons.js` | Original weapons and shield, with swing trail markers |
| `js/world/druid-forms.js` | Cat Form, Dire Bear Form and Moonkin Form models in each druid race's fur, and the veil for Shadowform (dark violet) and stealth (half see-through); the arena shows them from the fight, the sim ghost too |
| `tools/character-preview.html` | Model studio and animation/appearance checks |
| `CHARACTER-MODELS.md` | References, class expansion notes and Noggenfogger settings integration |
| `assets/models/` | Previously supplied KayKit models and their licence, retained on disk but not loaded by the game |
| `js/world/effects.js` | Particles, swing trails, rings and flashes |
| `js/world/environment.js` | Sky, time of day, zone looks, scenery, weather, raid members, graphics quality |
| `js/world/encounter.js` | Boss mechanics |
| `tools/build-db.ps1` | Regenerates `js/data/db.js` from the latest wowsims database |

Refresh the item database after a wowsims update:

```bash
powershell -ExecutionPolicy Bypass -File tools/build-db.ps1
```

## What is modelled

- Rage from white hits (wowsims `rage.go`: 3.46 × weapon speed, half for the off hand, crit bonus), Bloodrage, Unbridled Wrath, Anger Management.
- Attack table against a level 63 boss (miss, dodge, glancing, crit suppression, dual-wield penalty, weapon skill), two-roll specials.
- Heroic Strike / Cleave on next swing, refunds on misses. Unlike Classic, a queued Heroic Strike does not remove the
  off-hand dual-wield miss penalty (wowsims Forever never sets `DisableDWMissPenalty` for it).
- Bloodthirst, Whirlwind (with the Raging Blows off-hand strike), Execute (extra rage), Hamstring, Sunder Armor,
  Battle Shout, Berserker Rage, Death Wish, Recklessness, Charge and Intercept (one "Charge / Intercept" macro button).
- Sunder Armor lasts 30 s from the last application, also when other warriors help stack it, so you practise refreshing it.
- Stance dancing: Battle / Berserker Stance (off the GCD, shared 1 s cooldown, rage above Tactical Mastery is lost),
  Overpower after a dodge (5 s window), Rend.
- Flurry, Deep Wounds, Impale, Cruelty, Dual Wield Specialization, Improved Overpower, Improved Rend. Deep Wounds works
  as in wowsims Forever: every physical crit adds a share of the average main-hand hit, and damage still to tick rolls
  into the new bleed. Windfury Totem procs from main-hand specials too and does not reset the swing timer.
- Item procs and on-use effects read from the wowsims spell store: stat procs (Crusader), extra attacks (Thrash Blade,
  Hand of Justice style), damage procs (Thunderfury), armor debuffs (Annihilator), on-use trinkets with the shared
  trinket lockout (Earthstrike, Kiss of the Spider, Jom Gabbar), potions (Mighty Rage Potion, once per fight) and explosives.
- Raid setup (Raid tab): raid buffs, blessings, boss debuffs and consumables, keyed like wowsims so they import/export.
  Sunder Armor and Expose Armor are one choice (they do not stack); "help stack" has N other warriors sunder on
  their first global cooldowns until 5 stacks. Raid debuffs show on the boss frame.
- Results after every fight (`js/results.js`), like the wowsims Results tab: Damage, Auras, Casts, Resources,
  Timeline, Damage Taken and a searchable, filterable Log. The last results are saved and reopen with the Results button,
  even after a reload.
- Spell queue window, execute phase in the last 20% of the fight, 1–4 targets.
- Meters (bottom right) in the style of the EUI damage meter of the Fojji profile: class-coloured bars with rank,
  icon, name and value. Damage Done shows your abilities and the race against the sim; a smaller Threat window above
  it shows your threat by ability while the targets hit back. In a group both list the players instead (threat on your
  target as a share of whoever has aggro, a shield on their row, a red flash past 100%); your own breakdown and the
  sim's are in the results after the fight.
- Protection (spec): the wowsims Pre-BiS (Defense Cap) gear with a shield, Protection talents and APL
  (`js/data/prot-apl.js`), in Defensive Stance. The target hits back like the wowsims Raid Target (2601 base damage
  every 2 s, crushing blows, parry haste; your defense, dodge, parry, block and block value from gear and talents),
  your healers heal 815 per second, and you are scored on threat per second. Shield Slam, Revenge (after a block, dodge
  or parry), Shield Block, Thunder Clap (slows the target's swings), Demoralizing Shout (lowers its attack power),
  Last Stand, Shield Wall, Taunt, Concussion Blow, Shield Bash, and Defiance, Shield Specialization, Master of Defense,
  Anticipation, Improved Revenge, Focused Rage, Bastion and the other Protection talents. Threat as wowsims has it:
  damage × the ability's multiplier (Revenge 2.25) + flat threat (Heroic Strike, Cleave, Sunder Armor, Demoralizing
  Shout) × your stance (Battle and Berserker −20%, Defensive +30%) and Defiance, plus 5 threat per rage gained (not from
  swings, hits taken or refunds). Against the wowsims sim on the same setup the bot's threat, damage and casts per
  ability are within about 1–2%. The wowsims site never casts Revenge Rank 5, so the trainer uses Rank 6 (as its APL
  does with "Manual: Revenge VI" on).
- Rogue (Assassination, Combat, Subtlety): one wowsims rogue sim with its talent presets as specs (Assassination
  Mutilate with daggers, Combat Sinister Strike and Subtlety Hemorrhage with a slow main hand), the wowsims gear sets,
  consumables (Instant Poison VI on the main hand, Deadly Poison IV on the off hand, Thistle Tea, Major Frenzy Potion)
  and its "Direct APL" with Use Backstab off, as wowsims' simple rotation has it. Energy regenerates 10 per second
  (twice with Adrenaline Rush); 1 s global cooldown; combo points; stealth (no swings until you attack) with Garrote and
  Ambush openers, Vanish and Premeditation; Sinister Strike, Backstab, Mutilate (both daggers, 20% more on a poisoned
  target), Hemorrhage (+15% Rupture damage), Ghostly Strike, Eviscerate, Slice and Dice, Rupture, Venom, Cold Blood,
  Blade Flurry, Adrenaline Rush, Preparation, Kick, Feint (threat) and Evasion; poisons roll per hand on landed hits and
  crit at spell crit; bleeds ignore armor. Talents from the wowsims rank curves: Malice, Ruthlessness, Relentless
  Strikes, Improved Slice and Dice, Lethality, Vile Poisons, Improved Poisons, Vigor, Seal Fate, Improved Eviscerate,
  Improved Sinister Strike, Puncturing Wounds, Precision, Flawless Execution, Dual Wield Specialization, Hack and Slash,
  Weapon Expertise, Aggression, Opportunity, Improved Ambush, Initiative, Serrated Blades, Dirty Deeds, Quietus,
  Cutthroat and Thousand Cuts. Against the wowsims sim on the presets the bot is 1.5–3.5% under (Combat 565 / 573,
  Subtlety 534 / 550, Assassination 508 / 523 DPS).
- Mage (Arcane, Fire, Frost): wowsims' preset builds (Arcane Frost, Deep Fire, Frost) on its P1 Arcane gear with its
  consumables and caster raid buffs (Arcane Brilliance, Prayer of Spirit, Moonkin Aura, Blessing of Wisdom, Mana Spring,
  Dark Inspiration, Curse of the Elements; shown in the Raid tab for classes with mana). Spells at their level 60
  values with their spell power coefficients; 17% spell miss less your hit; spell crit from Intellect, crit rating
  and talents, crits for 150% (more with Ice Shards and Arcane Mind). Mana regenerates from Spirit outside the
  five-second rule (Mage Armor and Arcane Meditation keep part of it while casting), Evocation, a Mana Ruby, Major Mana
  Potion, Magister's Regalia set bonuses. Arcane Blast's Arcane Charges (15% of Intellect as spell power each, 15 s
  from the first), Arcane Wrath, Missile Barrage (free, twice-as-fast Arcane Missiles), Clearcasting, Arcane Power,
  Presence of Mind; Scorch's Fire Vulnerability, Heating Up (faster Pyroblast), Ignite, Fire Power, Combustion, Master
  of Elements; Fingers of Frost (Ice Lance triples, Shatter), Winter's Chill (for Cone of Cold), Cold Snap, Ice
  Barrier (+3% Frost damage); Gnome Eureka!. The rotation helper autocasts what wowsims autocasts (Arcane Power,
  Combustion, Presence of Mind, the racial, a mana gem or potion that fits) and runs a strict sequence to its end.
  On the wowsims talent tree of 29 Oct 2026 (Arcane Focus gone, Accelerant and Precision for every school). Against the
  wowsims sim the bot is 1% under for Arcane (720 / 726 DPS), 8% under for Fire (744 / 813) and 6% under for Frost
  (574 / 609): some multipliers in the wowsims combat log are not placed yet (see Known gaps).
- Paladin (Retribution, Holy Shock, Protection): wowsims' Retribution and Protection presets and a Holy Shock build
  (Manual Crowd Pummeler, whose use effect is the Weapon button). Seals as in wowsims `sim/paladin`: Righteousness
  (per-hit damage from weapon speed, hand and spell power), Command (7 a minute), the Crusader (attack power, faster
  and weaker swings) and Fury (Holy damage, half of it as an absorb shield); their judgements; Judgement of the
  Crusader counts as spell power at each spell's coefficient, and every landed melee hit refreshes your judgements.
  Consecration (Consecrated Ground), Holy Strike, Holy Shock, Hammer of Wrath, Exorcism (undead and demons only, so not
  on the dummy), Holy Shield, Righteous Fury, Swift Judgement. Talents: Benediction, Holy Conduit, Reverence, Sanctified
  Judgement, Improved Seals, Sacred Arbiter, Vengeance (3 stacks), Champion of the Light, Conviction, the weapon
  specializations, Shield Specialization (mana on block), Reckoning, Improved Seal of Fury, Sacred Duty and others;
  Libram of Law and Libram of Fervor. Against the wowsims sim: Retribution 611 / 633 DPS, Holy Shock 644 / 614,
  Protection 419 / 453 DPS (Retribution Aura's damage is not modelled). Holy (healer) comes later.
- Priest (Shadow): the wowsims Shadow preset (gear, talents, consumables, APL), in Shadowform from the start. Shadow
  Word: Pain and Devouring Plague tick on the target (and can crit), Mind Flay channels three ticks that grow with
  Improved Mind Flay (a miss ends it), Mind Blast, Shadow Word: Death; Shadowform (+10% Shadow damage, half the mana,
  crits for 200%), Inner Focus (a free spell; a direct one crits 25% more), Shadow Weaving on the target, Dark
  Inspiration (Spirit), Darkness, Twin Disciplines, Shadow Focus, Improved Mind Blast and Shadow Word: Pain, Shadow
  Reach, Devouring Contagion, Early Demise, Meditation, Mental Strength. The dagger's Enchant Weapon - Revelation
  (a sure crit on the next Mind Blast, Mind Flay or Shadow Word: Death). Against the wowsims sim: 791 / 815 DPS.
- Shaman (Elemental): the wowsims Elemental preset (Windshaper Skyborne, gear, talents, consumables, APL). Lightning Bolt
  with Lightning Overload (a half-strength copy) and Totem of the Storm, Lava Burst (20% more on your Flame Shock),
  Flame Shock ticking on the target, Earth Shock, Chain Lightning; the shocks share a 6 sec cooldown. Totems stand in
  their element's slot with a 1 sec global cooldown: Searing Totem attacks the target, Mana Spring Totem gives mana,
  Strength of Earth and Windfury stand for the party. Clearcasting (Elemental Focus), Elemental Mastery, Elemental Fury
  (crits for 200%), Convection, Concussion, Elemental Alacrity, Call of Flame, Thundering Strikes, Ancestral
  Knowledge, Tidal Focus, Mindfulness, and Revelation on the dagger. The totems show in the arena (Codex's models, in
  the shaman's race) and on the HUD. Shamanistic Focus (shocks cost 45% less) and Reverberation. Against the wowsims sim:
  601 / 590 DPS.
- Hunter (Beast Mastery, Marksmanship, Survival): the wowsims turret presets (Orc, P1 Beaststalker set with
  Fahrad's Reloading Repeater; Marksmanship and Survival with no pet: Lone Wolf), standing 12 yards away. Auto Shot
  fires on its own timer that casts do not hold (as wowsims), with Thorium Headed Arrows and the Ancient Sinew Wrapped
  Lamina (15% faster), Aspect of the Hawk and its Quick Shots (Deadly Aspects), Rapid Fire, Hunter's Mark (ranged
  attack power against the target), Aimed Shot and Multi-Shot (one cooldown, from when the cast lands), Arcane Shot,
  Serpent Sting. Ranged attacks: 8% miss, no dodge or glancing, 4.8% less crit against the boss; a sharpening stone's
  crit stays on the melee weapon. Talents: Lethal Attacks, Improved Stings, Efficiency, Careful Aim, Rapid Killing,
  Improved Arcane Shot, Lone Wolf, Trueshot Aura, Mortal Shots, Rapid Recuperation, Barrage, Ranged Weapon
  Specialization, Improved Tracking, Surefooted, Lightning Reflexes; Beaststalker Armor's 3-, 5- and 6-piece bonuses. Against the wowsims sim: Marksmanship 803 / 800, Survival 727 / 728.
  In melee range (5 yards) Auto Shot gives way to white swings of the melee weapon (melee attack power, hit and crit,
  its procs and Windfury); between 5 and 8 yards neither reaches and the shots say the target is too close. Your
  character holds the bow, gun or crossbow at range and the melee weapon in melee, with the other one on its back.
  Beast Mastery (the BM preset: Raptor, Faster Attack II, Cobra Reflexes, Pet Aggression 5): the Raptor Dashes in at the
  pull and swings (a level 60 creature's swing, 10% of your higher attack power, your crit with Ferocity, your ranged hit
  and expertise, happy, the Orc's Command) and casts Savage Rend, Bite and Claw longest cooldown first on 25 focus every
  5 sec (Bestial Discipline more), waiting for the focus of one that is ready; Frenzy off its crits, Bestial Wrath,
  Intimidation. Summon Hawk (one cooldown with Arcane Shot) dives for 108 + 5% of ranged attack power (Unleashed Fury
  and Ferocity add their rank's number to the 108, as flat modifiers of its effect) and leaves a hawk for 18 sec, two
  at a time, swinging at your ranged speed. Focused Fire, Unleashed Fury, Bestial Discipline (half your regen while
  casting). The rotation is the wowsims turret_hawk APL: Summon Hawk, Summon Hawk, Arcane Shot in turn (a wowsims
  sequence: its next spell when ready, the list going on meanwhile), Serpent Sting, Aimed Shot; Bestial Wrath with the
  cooldowns. Against the wowsims sim: 896 / 875 (the Raptor 249 / 245, the hawks 53 / 53).
- Warlock: the wowsims builds on their pre-raid set (Dreadmist Raiment: 3 pieces +18 spell damage, 6 pieces 8 mana per 5
  sec), each with a single-target cut of its rotation that the sim runs too. Shadow Bolt, Incinerate, Searing Pain, Soul
  Fire, Immolate, Corruption, Bane of Agony (by thirds, Amplify Curse) and Bane of Doom (one Bane per target), Siphon
  Life, Wrack (a channel that makes Corruption and Agony deal 10% more, more per affliction with Soul Siphon), your Curse
  of the Elements, Conflagrate, Shadowburn, Death Coil, Life Tap, Soul Shards; every damage over time can crit. Talents:
  Suppression, Improved Corruption and Bane of Agony, Pandemic and Ruin (double crit bonus), Malevolence, Nightfall,
  Shadow Mastery, Improved Shadow Bolt (Shadow Vulnerability), Bane, Cataclysm, Aftermath, Agonizing Flames, Fire and
  Brimstone, Shadow and Flame, Improved Life Tap, Fel Vitality, Decimation (below 35%), Demonic Brand, Demonic
  Sacrifice and Pact, Soul Link, Demonic Knowledge, Master Demonologist, Unholy Power, Improved Imp, Demonic Energies.
  The demon: the Succubus swings (glancing, behind the target) and casts Lash of Pain, the Imp casts Firebolt as its
  mana allows (Judgement of Wisdom and Life Tap give it mana); it takes a tenth of your spell damage, your spell crit
  and hit, and shows in the arena (Codex's models). Against the wowsims sim: Affliction (Wrack, Orc) 512 / 514,
  Demonology (Fire Brand) 718 / 712, Destruction 667 / 654 DPS.
- Shaman (Enhancement): the wowsims testing build (Windshaper Skyborne, the Manual Crowd Pummeler with Flametongue
  Weapon, talents, consumables, APL without its weapon swap). The two-hander swings; Stormstrike (normalized weapon
  damage; your next Lightning Bolt, Chain Lightning or Earth Shock on the target deals 20% more), Flametongue Weapon
  (fire on every main-hand hit), Maelstrom Weapon (10 per minute; five stacks make Lightning Bolt instant and free),
  Flurry, Elemental Devastation, Fire Nova off your fire totem, Magma Totem, Rage of the Farseer, Improved Stormstrike,
  Mental Dexterity and Quickness (attack power and spell damage from Intellect), Elemental Weapons, Trial by Fire; your
  own Strength of Earth and Windfury Totems count for you. Against the wowsims sim: 730 / 732 DPS.
- Druid (Balance): the wowsims Moonkin preset (Night Elf, P1 gear, talents, consumables, APL), in Moonkin Form (its
  Moonkin Aura gives the 3% spell crit). Wrath, Starfire, Moonfire and Insect Swarm ticking on the target (they can
  crit), Eclipse (each Wrath that lands gives 2 Starfire charges, each 0.5 sec faster), Nature's Grace (10% faster
  casts and a shorter global cooldown after a spell crit), Innervate, Improved Wrath and Starfire, Moonglow, Improved
  Moonfire, Genesis, Nature's Majesty and Reach, Nature's Splendor, Vengeance, Moonfury, Naturalist, Reflection, Idol of
  the Moon. Against the wowsims sim: 764 / 787 DPS.
- Druid (Feral Cat): the wowsims Cat preset (Tauren, gear, talents, consumables) in Cat Form: the paw (the weapon's DPS at
  1.0 speed, ±20%), 100% of Agility and 120 as attack power, energy and five combo points, Shred (from behind), Claw,
  Rake and Rip bleeding (their ticks can crit), Ferocious Bite spending the extra energy, Shifting Power (40 energy for
  55% of base mana, every 7.5 sec with its talent and Howling Idol), Berserk (100% more crit for the builders), Omen of
  Clarity (2 procs a minute), Innervate and the mana potion for Shifting Power, Predatory Strikes, Heart of the Wild,
  Sharpened Claws, Savage Fury, Ferocity, Shredding Attacks, Natural Instinct (crits for 220%), Rend and Tear (the target
  is assumed bleeding, as wowsims), Blood Frenzy, Leader of the Pack, Naturalist. A simplified APL (Rip at 5, Bite while
  Rip has time, Rake kept up, Shred). Against the wowsims sim on that APL: 737 / 721 DPS.
- Druid (Feral Bear): the wowsims Bear preset in Dire Bear Form (the paw at 2.5 speed, 180 attack power, 360% more item
  armor, 1240 health, 50% more threat, no parry): rage from swings (as a two-hander) and hits taken, Maul on the next swing
  (a Windfury attack takes a queued Maul too, as in wowsims), Lacerate stacking to 5, Primal Bite, Swipe, Enrage, Berserk
  (Primal Bite without a cooldown, 3 more targets), Blood Frenzy rage, Thick Hide. Scored on threat; against the
  wowsims sim on its simplified APL about the same TPS (611 / 605 DPS).
- The target hits back (Settings → Fight): automatically for a tank spec, or in a group with a tank; always or never
  by choice. It attacks whoever has its aggro: alone, you; in a group, whoever has the most threat (another player
  takes it at 110%; Taunt takes it at once). Whoever pulls it off the tank gets hit, and can die.
- Racials (wowsims `racials.go`): Blood Fury, Berserking, Elune's Light, Eureka!, Touch of the Grave, and the
  passive crit/hit/rage/attack speed bonuses. Forever has no racial weapon skill.
- 3D arena (three.js, `js/world/arena.js`): movement as in WoW: W/S along your facing, A/D turn (strafe while the
  right mouse button is held), right-drag turns you with the camera, left-drag only looks around, both buttons held
  run forward; Space to jump. Race-styled warrior, melee range (5 yd), facing (you have to face your target),
  front/behind by where the target faces (parry and block only from the front), Whirlwind within 8 yd, Charge
  (8–25 yd, out of combat).
- Sound (Settings → Sound, and the speaker button in the top bar): effects for your hits, crits, misses, blocks
  and parries, hits you take, shouts, Charge, stance changes, Overpower / Revenge becoming usable, the pull countdown
  and death; a soft lofi loop (keys, bass, swung beat, vinyl crackle) made on the fly; and a GTFO alarm, after the
  WoW addon, that repeats while you stand in fire (a Flame Patch, the move drill's fire). All made with Web Audio.
- Raid pack (Settings → Raid pack): the boss's mechanics as alerts on the anchors of Fojji's raid pack ("Fojji -
  Raid Pack Anchors [Classic]": the same places, sizes, colours and font sizes): boss timers right of centre that turn
  red in their last 5 s, special warnings ("FLAME PATCH ON YOU", "WAR STOMP » RUN OUT", "CLEAVE » GET BEHIND" when you
  stand in it, "AGGRO LOST » TAUNT" for a tank), mechanic text and large countdown icons ("Move Out"). Like FojjiCore's
  raid pack menu: on/off for the whole pack and each kind, alert sounds, spoken callouts (the browser's text to
  speech), and "Move alerts" to drag the anchors or nudge them with the arrow keys.
- Tanks and bosses: as DPS an NPC tank holds a boss; when you tank (or a tank is in your group) there is none, and
  the boss turns to and walks after whoever has its aggro, its front and Cleave cone with it. A small target-of-target
  bar under the target frame (Fojji EUI) shows who it is attacking.
  Settings → Graphics has a Noggenfogger Elixir option that shows you in skeleton form (looks only).
- Boss fight (`js/world/encounter.js`): Ragefire Brute held by a tank, with a frontal Cleave, Flame Patches, Fire Nova
  and War Stomp (knockback). Damage taken gives rage (wowsims formula) and procs Enrage / Blood Craze; you can die.
- Zones (topbar): the Natural flasks (Accuracy, Aggression, Precision, Swiftness) give their hit / crit / expertise /
  haste bonus only in Mount Hyjal, Hyjal Summit and The Barrow Deeps, as in wowsims; in the Training Grounds they give
  Stamina only. Each zone has its own scenery and lighting.
- Group (side menu): choose your name (it can be changed while in a group), then host a group and share its
  6-letter room key, or join one. The host's fight settings (length, targets, how it ends, zone, encounter, drills)
  and raid buffs/debuffs count for everyone, and the host's Start and Reset pull and reset the whole group; each
  player keeps their own spec, gear, talents, consumables, keys and bars. Each browser runs its own fight: Sunder
  Armor and Armor Shatter from anyone are added to everyone's dummies, and in a health-pool fight everyone's damage
  comes off the same pool. The others stand in your arena, swing when they hit and have name tags; the meter shows
  their DPS. Raid frames (Fojji EllesmereUI style: class-coloured health, missing health, power, the leader's crown)
  show everyone in groups of five; unlock them in the Group panel to drag them and scroll to size them
  (`js/raid-frames.js`); a red border marks who the target is attacking. Not yet: the Brute's mechanics only check
  you and players are not kept apart. Players on networks that block direct connections go through PeerJS's free
  relay, which can be slower.
- Main menu (opens with the page once per session, and from "Main menu" in the side menu; Esc closes it): pick
  your class, then your race, body type, role (Tank or DPS; Healer is greyed out until healing is in) and the spec
  for that role, and type the name the others see in a group. The race goes with the
  spec's saved character; the body type is passed to the character models (`arena.setAppearance({ bodyType })`) and
  to the others in a group. Only the warrior specs are playable so far; the other classes are listed with their
  wowsims Forever specs for later.
- Specs (top bar or main menu): Fury, Arms and Protection, each with its own saved character, keybinds, bar layout and APL (`js/data/specs.js`).
  Arms: the wowsims Pre-BiS Arms gear (Arcanite Reaper), talents and APL (`js/data/arms-apl.js`), starting in Battle
  Stance. Mortal Strike, Slam (1.5 s cast that holds and restarts your swing; Improved Slam casts faster and leaves the
  swing alone, as its replacement spell 1310200 says), Sweeping Strikes, Spearing Strike, Two-Handed Weapon
  Specialization, Weaponmaster (by weapon type), Bloodthrill. Moving stops a cast.
- Rend as wowsims Forever has it (checked against its combat log): ticks use your attack power at the tick, get
  Gift of Arthas' flat damage and can crit (x2.2 with Impale).
- Pre-pull: Bloodrage, Berserker Rage and Battle Shout can be used before the pull without starting the fight. The
  bot (ghost and score) plays the APL's pre-pull, including its Charge or Intercept.
- Against the wowsims sim on the same setup the bot is about 2–3% low for Arms and 3–5% for Fury (Fury's main hand
  swings about 7% less often than in wowsims; not found yet). `wowsimsLog` in `js/wowsims-sim.js` returns one wowsims
  fight's combat log for checks like these.
- Spellbook (side menu): General / Arms / Fury / Protection tabs like the game's. While it is open the action bars
  can be edited by drag and drop (from the book onto a bar, between bars, off a bar); the layout is saved per spec
  and a spell keeps its key. Spells the trainer cannot cast yet are listed dimmed.
- Talents tab: the three trees with points spent as in the game (click / right-click), tooltips with what each talent
  does in the trainer; talents that change damage but are not modelled yet are dashed. Builds: the wowsims presets
  and a Fury Enrage build (Enrage procs on hits taken, so practise it with "take a hit every N s" or the boss),
  an imported export's talents, your saved builds and your current talents, each with its wowsims DPS on your gear,
  raid setup, zone, APL and fight length. The Arms preset is listed but not playable (no Mortal Strike, Slam or
  Sweeping Strikes in the trainer yet).
- Fight settings (Settings → Fight): the fight ends after the fight time (the dummies' health falls evenly, as in
  the DPS sim), when the dummies are dead (a health pool each; your target moves on to a living one), or never
  (infinite health, optionally in execute range all the time; the Start button reads "End"). Drills: move out of
  melee every N s for N s (fire over the melee area) and take a hit every N s (6% of your health, healed back, gives
  rage). Presets as in the ForeverWarlocking practice sim. A fight that does not end by the clock is scored as a
  timed fight of the same length; with moving or hits the bot is the reference, as wowsims has neither.
- The sim beside you (Settings → Show): a ghost of the rotation helper's bot plays the same fight on your setup from
  your pull, with its latest cast over its head; the damage meter races you against it and your best; "The sim's next
  cast" shows what the APL presses next in your fight and the group and condition that pick it.
- Score after each fight, coloured like a Warcraft Logs parse. There are no WoW Forever logs yet (raids open
  9 December 2026), so the reference is the wowsims Forever sim itself, run in the page with your exact setup (gear,
  buffs, zone, talents, APL, fight length, targets) for 500 fights: its median scores 95, its 90th percentile 99, its
  best fight 100. Without a connection to wowsims.com the rotation helper's bot is the reference instead. Saved per
  setup, with your best score. The trainer's engine is still about 3–5% below wowsims on the same setup, so a
  flawless run currently scores around 75 rather than 95.

## Known gaps / to verify against wowsims

- Mage: Fire and Frost are about 10% under the wowsims sim. Its combat log shows a 3% damage bonus on Frostbolt that
  the trainer does not have, and wowsims' Fire spells crit several points more than its sheet adds up to. Spell item procs
  (on a spell hit) are not modelled.
- Rogue: set bonuses (Darkmantle) are not modelled; Murder and Expose Armor neither.
- Feral: Rip and Rake tick about 5% under wowsims, white swings about 5% over (the totals agree). Prowl and the Ravage /
  Pounce openers, casting Faerie Fire yourself, Dash, Feral Charge, Frenzied Regeneration, Barkskin, Demoralizing
  Roar, powershifting (Furor) and a second explosive (Goblin Sapper Charge) are not modelled; the form is fixed by the spec.
- Consumables: wowsims counts the strongest consumable crit once (Elixir of Sages and Elixir of the Grizzly give 2%, not
  4%), with a Natural flask's zone bonus on top; the trainer does the same.
- Casters (Mage, Priest, Shaman, Druid): wowsims precasts the first spell so it lands at the pull; the trainer starts the fight with
  that cast, about 1.5 sec later (some 1–2% of a 2 minute fight).
- Priest: Vampiric Embrace, the racial spells (Starshards, Shadowguard, Dark Sacrifice, Touch of Weakness) and Power in
  Light are not modelled.
- wowsims gives every class 1% more spell crit with a main-hand weapon equipped, whatever the weapon; the trainer
  copies that (APPROX: the spell behind it is not found).
- Hunter: melee weaving (Raptor Strike, Mongoose Bite), traps, Sniper Shot, Volley, Scorpid Sting and pets other than
  the Raptor are not modelled yet.
- Warlock: Hellfire, Rain of Fire, the drains, Bane of Havoc's share, Curse of Recklessness and Weakness, the
  Voidwalker and Felhunter, summoning or sacrificing in the fight, Fel Domination and the Firestone's proc are not
  modelled; the rotations are the builds' single-target parts.
- Enhancement: Hunter's Mark, Dragonbreath Chili, Storm Gauntlets' lightning and the Manual Crowd Pummeler swap are not
  modelled; casting a Lightning Bolt does not hold your swings.
- Shaman: Chain Lightning's and Magma Totem's extra targets beyond the trainer's, Fire Nova and Water Shield (a
  Restoration talent) are not modelled; totems do not travel with you (they stand where you dropped them).
- Paladin: Retribution Aura's damage, Iron Creed's damage reduction, Vindication, Twist of Light, Light's Vigil and
  Purifying Power are not modelled; Holy Shock is about 5% over wowsims and Retribution 3% under (crit on its seal and Holy Strike hits runs a
  few points high). The Settings tab still shows warrior-only options (starting rage, stance hints) for paladins.

- Values marked `APPROX` in `js/data/warrior.js` and `js/data/buffs.js` use classic numbers because the Forever
  talent rank curves and buff values are in separate wowsims code. Check them by comparing a bot run with the wowsims sim
  (`wowsimsReference` in `js/wowsims-sim.js` runs it from the browser console; `wowsimsStats` returns its character sheet).
- Protection: the wowsims boss's hits imply about 20% more armor than the trainer adds up (gear, elixirs, Gift of the
  Wild), so you take a little more damage than in wowsims; rage from hits counts the damage before armor, so threat is
  unaffected.
- Item effects wowsims codes by hand are not modelled (e.g. Badge of the Swarmguard stacks); the Character tab lists
  which procs and use effects were picked up.
- Not modelled yet: set bonuses other than Battlegear of Wrath 3pc, Bloodthrill, Slam, spell hit/crit for magic
  damage procs. The boss mechanics and their damage are made up for practice, not taken from a real encounter.
- The 3D view loads three.js from cdn.jsdelivr.net, so it needs an internet connection.
- wowsims *links* (the long URL) are not supported yet; use the JSON export.
