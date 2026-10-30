| `js/loading.js`, `css/loading.css` | The loading screen (Codex's artwork, `assets/numen-gym-loading.jpg`): it loads the game and fades away once the game has drawn its first frame; if the game cannot start it says so |
# Numen Gym

A browser trainer for practising WoW Forever rotations on training dummies and a boss. Warrior (Fury, Arms and
Protection), Rogue (Assassination, Combat, Subtlety), Mage (Arcane, Fire, Frost), Paladin (Retribution, Holy Shock,
Protection), Priest (Shadow, Smite), Shaman (Elemental, Enhancement), Hunter (Beast Mastery, Marksmanship, Survival), Warlock (Affliction, Demonology, Destruction) and Druid (Balance, Feral Cat, Feral Bear), each with the wowsims preset
builds it can play (Combat Muti, Combat BS, Subtlety BS, Arcane Fire, FFB, SM/Ruin, Demo Shadow Brand, the feral Hybrid, the hunter's SV / MM / BM Weave and SV Melee);
keybind presets, the rotation helper and the HUD are set up per class and spec.
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

- **Import:** in wowsims Forever, on your spec's sim, choose *Export → JSON*, paste the text into the Character tab and press *Import*.
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
| `js/classes/priest/fight.js`, `js/classes/priest/hud.js`, `js/data/priest.js`, `js/data/priest-talent-tree.js`, `js/data/priest-apl.js` | The priest, Shadow and Smite: its spells, periodic damage, Mind Flay, Penance, the wand, talents; the HUD after the Fojji Priest UI; the wowsims Shadow preset and APL |
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
| `js/group-play.js` | Group play: the host's fight settings, raid buffs/debuffs and pull for everyone; raid cooldowns asked for and given between players; Sunder Armor, Armor Shatter, Thunder Clap, Demoralizing Shout, taunts, threat and health-pool damage passed between players' encounters; the other players drawn in the arena with name tags; the group's damage and threat meters; the host's reset for everyone |
| `js/raid-bots.js` | The NPC raiders filling a boss's raid out to its size: which DPS specs come in which order, and their names (main.js draws them, puts them on the raid frames and has them react to the boss) |
| `js/name-filter.js` | Player names kept civil: a slur or swear word in a name (yours, another player's, one on Numen Logs) is swapped for a polite stand-in ("Human Feces"), catching numbers for letters and stretched or dotted spellings while leaving ordinary words (grape, raccoon, Scunthorpe) alone |
| `js/history.js` | Your fight history: every finished fight kept as a report (results, combat log, player, raid, gear) in the browser's IndexedDB, the last 200 |
| `logs.html`, `js/logs/app.js`, `css/logs.css` | Numen Logs: your reports, the rankings of the real encounters and the deep dive into each fight, laid out like Warcraft Logs |
| `js/logs/remote.js`, `tools/numen-logs-schema.sql` | Numen Logs' shared server (a Supabase project, off until `LOGS_SERVER` is set): uploads real encounters, serves everyone's rankings and reports |
| `js/journal.js` | The encounter journal: each encounter's abilities with icon, timing and what to do, written from the mechanic data the fight runs on |
| `js/raid-frames.js` | Raid frames in a group (and a healer's raid): health, power, the leader and who has aggro, movable and sizable; for a healer your heals over time, debuffs in their type's colour, shields, the heal being cast, mouseover and click targeting |
| `js/data/healing.js`, `js/classes/healer.js`, `js/engine/raid.js` | Healers: the heal spells (WoW Forever rows), the healing on top of each healing class's fight, and the raid they keep alive |
| `js/data/raid-cooldowns.js` | Raid cooldowns and externals (Power Infusion, Pain Suppression, Innervate, Blessing of Protection, Lay on Hands, Mana Tide Totem) and what they do on whoever gets them |
| `tests/smoke.html` | Loads the game once per spec (or encounter), fights a boss for 45 s with a 10-man NPC raid while the sim plays the APL, ends the fight and fails on any error; puts your settings back afterwards. `await smoke({ specs, encounters })` |
| `tests/engine-regression.html` | Fixed-dice bot fights per spec and fight mode, compared with `tests/engine-baseline.json`: open it after an engine change to see whether results moved |
| `js/data/warrior.js` | Ability, talent, race and rating data with the wowsims source of each value |
| `js/data/buffs.js` | Raid buffs and boss debuffs, keyed by wowsims field names |
| `js/data/db.js` | Item / enchant / consumable database, generated from wowsims `assets/database/db.json` |
| `js/character.js` | Gear + buffs → character sheet |
| `js/wowsims.js` | wowsims JSON import / export |
| `js/audio.js` | Sound made with Web Audio (no sound files): hits, crits, blocks, shouts, procs, the pull countdown, a GTFO-style alarm while you stand in fire, raid pack alert sounds and an endless lofi loop |
| `js/raid-pack.js` | Boss mechanic alerts on the Fojji raid pack anchors (boss timers, emphasized timers, special warnings, text, large icons), with on/off per kind, sounds, spoken callouts and an unlock mode to move them |
| `js/world/spell-animation.js` | Caster spell poses (by Codex): instant, cast and channel in the spell's school colour, weapons put away while one plays; main.js plays them for every caster's spells from the fight's cast events |
| `js/hud-frames.js` | Movable HUD frames: your on-use trinkets above the player frame, a shaman's totem bars under it, every buff you have (the fight's auras, then your raid buffs, blessings and consumables) in the top right; every other part of the screen (unit frames, action bars, cast bar, swing and resource bars, procs, meters, the top bar, the side menu) moves by an offset from its own place. Edit mode (the side menu, or Settings → HUD frames) outlines and names each so you can drag it, and sizes them: the UI scale for everything (1.0 normal) times each frame's own size (click one and use the edit bar's slider, or the wheel over it). The raid pack's alerts and the raid frames (with examples when nobody is in them) move in edit mode too. Reset positions and Reset sizes put them back |
| `js/data/pet-commands.js` | The pet bar for warlocks and hunters (under your frame, movable): Attack, Follow, Stay and the modes Assist (the default, as wowsims sims it: your pet goes at your target when the fight starts), Defensive (only at what hits you) and Passive; the pet's own spells (Firebolt, Lash of Pain; Savage Rend, Bite, Claw), a click or its key to cast one next, a right-click to turn its autocast off or on; keys as WoW's pet bar, Ctrl+1 to Ctrl+0 (Attack, Follow, Stay, the spells, the modes). A recalled pet follows you; a melee pet fights at the target's flank, the Imp casts Firebolts from beside you |
| `js/main-menu.js` | The main menu: a card per class with its specs (like the wowsims Forever start page), then race, body type, spec, the spec's wowsims build and your name |
| `js/main.js` | UI, keybinds, game loop. The HUD is laid out like the Fojji Warrior UI (WeakAuras pack): sizes, colours and anchor offsets from its 1440p export |
| `js/apl.js` | Rotation helper: runs a wowsims APL (priority list, groups, variables, conditions) against the live fight; borders on the buttons to press |
| `js/data/fury-apl.js` | Default APL for the helper. An imported wowsims export, or an APL pasted in Settings, replaces it |
| `js/results.js` | After-fight results (damage, threat, auras, casts, resources, timeline, damage taken, log) |
| `js/score.js` | Parse-style score (0–100, Warcraft Logs colours) against a reference: the wowsims sim, else the rotation helper's bot |
| `js/data/warrior-talents.js` | The three warrior talent trees (wowsims `ui/sim/talents/trees/warrior.json`, icons from its db.json), what each modelled talent does in the trainer, and the wowsims talent presets as builds |
| `js/data/warrior-spellbook.js` | The warrior spellbook at level 60: every class spell at its highest Forever rank (IDs and icons from wowsims db.json), talent spells when talented |
| `js/talents.js` | Talent strings ↔ points, and the rules for spending them (51 points, 5 per row, prerequisites) |
| `js/data/specs.js`, `js/data/wowsims-builds.js` | The specs and their builds (a build is a spec of its own under its base spec, as the wowsims presets): class, default character, APL, starting stance, bar layout, and for a tank the threat score and a fight that hits back; the generated wowsims build exports |
| `js/data/arms-apl.js` | The wowsims Forever Arms APL |
| `js/data/prot-apl.js` | The wowsims Forever Protection APL |
| `js/drills.js` | Move phases in the arena: a warning, then fire over the melee area of your target that you have to step out of |
| `js/ghost.js` | The sim as a ghost: the rotation helper's bot plays the same fight beside you (its own engine fight) and is drawn as a see-through copy of your warrior |
| `js/wowsims-sim.js` | Runs the real wowsims Forever sim (its `sim_worker.js` and `lib.wasm` from wowsims.com) in a Web Worker with your setup |
| `js/data/zones.js` | Zones (Hyjal Summit, The Barrow Deeps, Mount Hyjal, Training Grounds) and which flasks get the zone bonus |
| `js/macros.js` | WoW-style macros for every class (`/cast`, `/use`, `/cancelaura`, conditions such as `[combat]`, `[mod:shift]` and a warrior's `[nostance:1]`), edited in Settings; an enabled macro takes over its ability's button and key. Keys can be the mouse wheel and side buttons too |
| `js/data/keybinds.js` | Keybind presets per class/spec: Default (one layout for every class: 1-4 the rotation, 5 a key buff, Q/E/R rotation or AoE, T/F cooldowns, G offensive potion, Y resource potion, Z crowd control, X/V survival, C movement, Shift+1-4 and Shift+Q/W/E/R the rest) and Ledski (from his in-game Myslot export); your own presets are saved per spec |
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
| `js/world/spell-fx.js` | Spell and ability visuals: bolts and bursts in the spell's school colour, beams while you channel (Mind Flay, Drain Life), novas around you, areas on the ground (Blizzard, Flamestrike, Rain of Fire, Hurricane, Hellfire, Volley), strike arcs for melee abilities, shields and auras on you (Ice Barrier, Ice Block, Water Shield, Shadowguard), puffs for ticks and heals; main.js picks them from the fight's events |
| `js/world/environment.js` | Sky, time of day, zone looks, scenery, weather, raid members, graphics quality |
| `js/world/encounter.js` | Boss mechanics: the encounter list and the Ragefire Brute |
| `js/world/onyxia.js`, `js/world/lair.js`, `js/world/dragon.js` | Onyxia: her encounter (phases, whelps), her lair (layout, heights, the cave's meshes), the dragon models |
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
  trinket lockout (Earthstrike, Kiss of the Spider, Jom Gabbar), potions and explosives. Potions are wowsims' three
  picks, each with its own button: offensive (Major Frenzy, Spellblasting, Mighty Rage...), defensive (healing,
  Stoneshield, protection potions) and resource (mana, rage), each picker offering the potions wowsims classes under it
  (js/data/potion-classes.js). One timer and one potion a fight between them; the APL's Offensive, Defensive and
  Resource Potion placeholders cast them, and the offensive one is a major cooldown that autocasts as in wowsims. An
  aura the popups over the bars show is left out of the buff row.
- Raid setup (Raid tab): raid buffs, blessings, boss debuffs and consumables, keyed like wowsims so they import/export.
  Sunder Armor and Expose Armor are one choice (they do not stack); "help stack" has N other warriors sunder on
  their first global cooldowns until 5 stacks. Raid debuffs show on the boss frame.
- Results after every fight (`js/results.js`), like the wowsims Results tab: Damage, Auras, Casts, Resources,
  Timeline, Damage Taken and a searchable, filterable Log. The last results are saved and reopen with the Results button,
  even after a reload.
- Spell queue window, execute phase in the last 20% of the fight, 1–4 targets.
- Meters (bottom right) in the style of the EUI damage meter of the Fojji profile: class-coloured bars with rank,
  icon, name and value. Damage Done shows your abilities and the race against the sim; a smaller Threat window above
  it shows your threat by ability while the targets hit back. In a group, or beside an NPC tank, the threat window
  lists everyone who can take aggro instead (you, the players, the NPC tank: threat on your target as a share of
  whoever has aggro, a shield on their row, a red flash past 100%), so you see yourself closing in on the tank; your
  own breakdown and the sim's are in the results after the fight.
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
  On the wowsims talent tree of 29 Oct 2026 (Arcane Focus gone, Accelerant and Precision for every school). Their pre-pull
  casts land at the pull, as wowsims (a Pyroblast, a Frostbolt or the Arcane opener cast before the fight: the clock
  waits for it, as a dummy fight in the game); Ice Barrier brings Frigid Power (3% more Frost for 1 min) and Fire Power
  counts on the damage over time. Spell penetration and Arcane Subtlety lower the boss's resistance (wowsims
  spell_resistances.go: P / (P + 540) more damage, a tenth of it on damage over time). The FFB build: Frostfire Bolt
  (Frostfire: a Fire and a Frost spell to your talents, the better school's spell power, a Chill, damage over time), Scorch,
  Pyroblast on three Heating Up, Fire Blast while Fingers of Frost has fewer than two charges. Blink (C): 20 yards ahead,
  the way you face, at once (15 sec cooldown, 35% of base mana); the Frost APL blinks before the pull, as wowsims. Against
  the wowsims sim: Arcane 745 / 726, Fire 786 / 813, Frost 609 / 609, Arcane Fire 804 / 811, FFB 728 / 721 DPS (see
  Known gaps).
- Paladin (Retribution, Holy Shock, Protection): wowsims' Retribution and Protection presets and a Holy Shock build
  (Manual Crowd Pummeler, whose use effect is the Weapon button). Seals as in wowsims `sim/paladin`: Righteousness
  (per-hit damage from weapon speed, hand and spell power), Command (7 a minute), the Crusader (attack power, faster
  and weaker swings) and Fury (Holy damage, half of it as an absorb shield); their judgements; Judgement of the
  Crusader counts as spell power at each spell's coefficient, and every landed melee hit refreshes your judgements.
  Consecration (Consecrated Ground), Holy Strike, Holy Shock, Hammer of Wrath, Exorcism (undead and demons only, so not
  on the dummy), Holy Shield, Righteous Fury, Swift Judgement. Talents: Benediction, Holy Conduit, Reverence, Sanctified
  Judgement, Improved Seals, Sacred Arbiter, Vengeance (3 stacks), Champion of the Light, Conviction, the weapon
  specializations, Shield Specialization (mana on block), Reckoning, Improved Seal of Fury, Sacred Duty and others;
  Libram of Law and Libram of Fervor; Seal of Command's procs can bring Windfury, as in wowsims. Against the wowsims
  sim: Retribution 631 / 633 DPS, Holy Shock 644 / 614,
  Protection 432 / 446 DPS. Retribution Aura (20 Holy damage plus 6% of your spell power to each attacker whose swing
  lands, wowsims' damage shield; 18 / 18 DPS) and Holy Wrath (undead and demons only). Holy (healer): see Healers below.
  Twist of Light (as wowsims): seals cost 20% less, and replacing Seal of Command, Righteousness or Fury with another
  seal leaves an Echo of it that your next landed white hit applies too, so twisting Command and Righteousness between
  swings gives a swing both. A pop-up shows when you can twist (the seal to swap to, with its key) and when an Echo is
  waiting for your next swing. The rotation helper's Retribution APL still keeps one seal up and does not twist.
- Priest (Shadow): the wowsims Shadow preset (gear, talents, consumables, APL), in Shadowform from the start. Shadow
  Word: Pain and Devouring Plague tick on the target (and can crit), Mind Flay channels three ticks that grow with
  Improved Mind Flay (a miss ends it), Mind Blast, Shadow Word: Death; Shadowform (+10% Shadow damage, half the mana,
  crits for 200%), Inner Focus (a free spell; a direct one crits 25% more), Shadow Weaving on the target, Dark
  Inspiration (Spirit), Darkness, Twin Disciplines, Shadow Focus, Improved Mind Blast and Shadow Word: Pain, Shadow
  Reach, Devouring Contagion, Early Demise, Meditation, Mental Strength. The dagger's Enchant Weapon - Revelation
  (a sure crit on the next Mind Blast, Mind Flay or Shadow Word: Death). Against the wowsims sim: 791 / 815 DPS.
- Priest (Smite): the wowsims smite_testing build (Undead, Discipline and Holy talents, its gear, consumables, APL).
  Power Infusion at the pull (20% more spell damage, off the global cooldown), Holy Fire (a hit, then a burn) and
  Shadow Word: Pain kept up, Penance when ready (a 2 sec channel: a bolt at once and one each second), else Smite; the
  lower ranks of Smite and Holy Fire below 20% mana, and the wand below 10%. Shoot aims until the shot (the wand's
  speed after your last shot or spell), shoots again until you cast or move, and cuts Penance short, as in wowsims.
  Talents: Power in Light (Smite and Penance deal 10% more to a target with your Holy Fire or Shadow Word: Pain), Holy
  Precision, Holy Specialization, Divine Fury, Searing Light, Twin Disciplines (Penance and Shadow Word: Pain), Mental
  Agility, Wand Specialization. The raid's Judgement of the Crusader adds 161 Holy damage taken at each spell's
  coefficient (in the Raid tab), and Undead's Touch of the Grave drains on a landed spell, as wowsims casts it. Against
  the wowsims sim: 456 / 462 DPS.
- Shaman (Elemental): the wowsims Elemental preset (Windshaper Skyborne, gear, talents, consumables, APL). Lightning Bolt
  with Lightning Overload (a half-strength copy) and Totem of the Storm, Lava Burst (20% more on your Flame Shock),
  Flame Shock ticking on the target, Earth Shock, Chain Lightning; the shocks share a 6 sec cooldown. Totems stand in
  their element's slot with a 1 sec global cooldown: Searing Totem attacks the target, Mana Spring Totem gives mana,
  Strength of Earth and Windfury stand for the party. Clearcasting (Elemental Focus), Elemental Mastery, Elemental Fury
  (crits for 200%), Convection, Concussion, Elemental Alacrity, Call of Flame, Thundering Strikes, Ancestral
  Knowledge, Tidal Focus, Mindfulness, and Revelation on the dagger. The totems show in the arena (Codex's models, in
  the shaman's race) and on the HUD; they take a 1 sec global cooldown (wowsims Forever), before the pull too: there the
  global cooldown runs on the real clock, since the fight's stands still until you pull. Shamanistic Focus (shocks cost 45% less) and Reverberation. Against the wowsims sim:
  592 / 590 DPS.
- Hunter (Beast Mastery, Marksmanship, Survival): the wowsims turret presets (Orc, P1 Beaststalker set with
  Fahrad's Reloading Repeater; Marksmanship and Survival with no pet: Lone Wolf), standing 12 yards away. Auto Shot
  fires on its own timer that casts do not hold (as wowsims), with Thorium Headed Arrows and the Ancient Sinew Wrapped
  Lamina (15% faster), Aspect of the Hawk and its Quick Shots (Deadly Aspects), Rapid Fire, Hunter's Mark (ranged
  attack power against the target), Aimed Shot and Multi-Shot (one cooldown, from when the cast lands), Arcane Shot,
  Serpent Sting. Ranged attacks: 8% miss, no dodge or glancing, 4.8% less crit against the boss; a sharpening stone's
  crit stays on the melee weapon. Talents: Lethal Attacks, Improved Stings, Efficiency, Careful Aim, Rapid Killing,
  Improved Arcane Shot, Lone Wolf, Trueshot Aura, Mortal Shots, Rapid Recuperation, Barrage, Ranged Weapon
  Specialization, Improved Tracking, Surefooted, Lightning Reflexes; Beaststalker Armor's 3-, 5- and 6-piece bonuses.
  Against the wowsims sim: Marksmanship 803 / 800, Survival 735 / 728.
  In melee range (5 yards) Auto Shot gives way to white swings of the melee weapon (melee attack power, hit and crit,
  its procs and Windfury); between 5 and 8 yards neither reaches and the shots say the target is too close. Your
  character holds the bow, gun or crossbow at range and the melee weapon in melee, with the other one on its back.
  Auto Shot works as in the game and wowsims: after each reload it aims for 0.5 sec, and moving then cancels it; a
  shot due while you move waits and goes a reaction time after you stop; a haste change waits for the next shot. The
  swing bar shows it: the reload in blue (free to move), the aim in the red zone at the end (stand still), red while a
  move holds the shot, a red flash when a move cut the aim; in melee range the melee swing; the five-second rule on the
  thin bar above.
  Where you stand shows four ways: the target frame names the zone in its colour (melee, dead zone, ranged, out of
  range) over a 0-40 yard gauge with your marker, rings on the ground around the target mark 5, 8 and 35 yards (the
  zone you are in lit), and every ability the range blocks, too far or too close, is tinted red.
  The melee abilities, for when you are in melee range: Raptor Strike (the next swing, +70, 6 sec), Mongoose Bite
  (normalized + 57, after you dodge or on Expose Prey), Wing Clip (50), Strider Kick (talent); Savage Strikes, Predator's
  Edge, Resourcefulness (cheaper melee abilities; a melee or ranged ability's crit keeps half your regen going while
  casting), Expose Prey (Mongoose Bite off attacks on your marked target), Lacerating Strikes (Mongoose Bite's bleed).
  The weave builds (SV, MM and BM Weave: the wowsims Melee Weave APL) walk in for each melee swing that fits before
  the next Auto Shot and back out; SV Melee dual wields in melee all fight. Melee and Auto Shot run on timers of their
  own (wowsims attack.go): a melee swing due out of reach waits and goes the moment you arrive, a melee swing starts
  Auto Shot's timer over, an aim turns the melee attack off (the off hand then comes half a swing after it starts
  again), and Raptor Strike queues from any range. Careful Aim gives melee attack power too. The bots walk at run
  speed where the APL moves them (`js/apl.js` botAct). Against the wowsims sim: SV Weave 968 / 994, MM Weave 933 /
  938, BM Weave 984 / 951, SV Melee 789 / 818.
  Aspects and traps (the small bar left of your frame; Z Freezing Trap, X Aspect of the Monkey, C Aspect of the Cheetah,
  the rest on Shift keys): one aspect at a time, Aspect of the Hawk from the pull. Hawk: 120 ranged attack power and
  Quick Shots; Beast: 110 attack power and Quick Strikes off melee swings (30% faster for 12 sec, Deadly Aspects);
  Monkey: 8% dodge (Improved Aspect of the Monkey); Cheetah and Pack: 30% faster (Pathfinding), dazed 4 sec when hit;
  Wild. A trap lies at your feet, arms after 0.5 sec and springs on the first target within 5 yards (wowsims traps.go):
  Immolation Trap (138 Fire every 3 sec for 15 sec), Explosive Trap (207-265 to every target within 10 yards, then 33
  every 2 sec for 20 sec), both with 10% of your ranged attack power over their damage and sharing a 30 sec cooldown;
  Freezing and Frost Trap (a boss and the dummies are immune) share the other. Clever Traps, Survival Tactics and
  Survivalist's Discipline count.
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
  Demonology (Fire Brand) 714 / 712, Destruction 667 / 654 DPS.
- Shaman (Enhancement): the wowsims testing build (Windshaper Skyborne, the Manual Crowd Pummeler with Flametongue
  Weapon, talents, consumables, APL without its weapon swap). The two-hander swings; Stormstrike (normalized weapon
  damage; your next Lightning Bolt, Chain Lightning or Earth Shock on the target deals 20% more), Flametongue Weapon
  (fire on every main-hand hit), Maelstrom Weapon (10 per minute; five stacks make Lightning Bolt instant and free),
  Flurry, Elemental Devastation, Fire Nova off your fire totem, Magma Totem, Rage of the Farseer, Improved Stormstrike,
  Mental Dexterity and Quickness (attack power and spell damage from Intellect), Elemental Weapons, Trial by Fire; your
  own Strength of Earth and Windfury Totems count for you; Call of Flame reaches Fire Nova and Magma Totem. Against the
  wowsims sim: 732 / 732 DPS.
- Druid (Balance): the wowsims Moonkin preset (Night Elf, P1 gear, talents, consumables, APL), in Moonkin Form (its
  Moonkin Aura gives the 3% spell crit). Wrath, Starfire, Moonfire and Insect Swarm ticking on the target (they can
  crit), Eclipse (each Wrath that lands gives 2 Starfire charges, each 0.5 sec faster), Nature's Grace (10% faster
  casts and a shorter global cooldown after a spell crit), Innervate, Improved Wrath and Starfire, Moonglow, Improved
  Moonfire, Genesis, Nature's Majesty and Reach, Nature's Splendor, Vengeance, Moonfury, Naturalist, Reflection, Idol of
  the Moon. Against the wowsims sim: 781 / 787 DPS.
- The rest of each class's abilities that wowsims models, on the spellbook, the bars and spare keys (none of them in
  the preset rotations, so the numbers above stand):
  - Mage: Arcane Explosion, Blast Wave, Frost Nova (around you), Blizzard and Flamestrike (at your target; Flamestrike
    burns the ground 8 sec), Ice Block (10 sec immune to damage; no moving, turning, jumping or casting in it; the default
    Ice Block macro cancels it on a second press with `/cancelaura Ice Block`), Improved Flamestrike, Improved
    Frost Nova, Improved Blizzard (its ticks are a Chill for Fingers of Frost).
  - Rogue: Expose Armor (450 armor per combo point for 30 sec; Sunder Armor and it do not stack), Improved Expose Armor.
  - Paladin: Holy Wrath, and every aura on its own bar at the bottom of the screen (movable, the one in force lit), one
    at a time: Devotion (+735 armor), Retribution, Concentration, and Shadow, Frost and Fire Resistance (+60, about 14%
    less of that school's damage from a level 63 boss).
  - Priest: Holy Nova, Vampiric Embrace (your Shadow damage heals you for 20%), and the racial spells, each for its
    race: Starshards and Elune's Grace (Night Elf), Shadowguard and Hex of Weakness (Troll), Touch of Weakness and Dark
    Sacrifice (Undead), Chastise and Desperate Prayer (Dwarf).
  - Shaman: Call of the Elements (a 3 sec cast that drops the four totems of your set at their mana; set them on the
    totem bar above your frame, one per element, out of combat or in it), Totemic Recall (your totems go, 25% of their
    mana comes back), Totemic Projection (60 sec cooldown, 25% of base mana: your totems move to where you stand).
    Mana Tide Totem and Water Shield (Restoration talents); Fire Nova (your fire totem bursts) on the Elemental
    bar too. Chain Lightning jumps from your target to the nearest enemy within 12 yards of the last one hit.
  - Druid: Hurricane; in a form Prowl (no swings until you attack) with Ravage and Pounce from it, Faerie Fire (Feral),
    Dash, Feral Charge (Bear and Cat: the cat leaps behind the target, 8-25 yards), Frenzied Regeneration, Barkskin,
    Demoralizing Roar.
  - Hunter: Scorpid Sting (your attackers miss more; it takes Serpent Sting's place), Sniper Shot, Counterattack (after
    you parry, 5 sec: 110 + half your weapon, it can't be dodged, parried or blocked), Volley (a 6 sec channel, 112
    Arcane to every target within 8 yards of your target each second). Every pet family Codex made a model for (Bat,
    Bear, Bird of Prey, Boar, Carrion Bird, Cat, Crab, Crocolisk, Fox, Gorilla, Hyena, Raptor, Scorpid, Spider,
    Tallstrider, Turtle, Wind Serpent, Wolf), picked on the Character tab, each with its family's damage and its
    abilities from the WoW Forever spell data (Bite, Claw, Swipe, Dismember, Pinch, Mine, Lightning Breath, Thunderstomp,
    Demoralizing Screech, Savage Rend, Tendon Rip, Web, Scorpid Poison, Dust Cloud, Furious Howl, Trickster's Dance).
    None picked: Lone Wolf.
  - Warlock: the demon on the Character tab: Imp, Voidwalker, Succubus, Incubus or Felhunter (the Voidwalker and the
    Felhunter only swing, as in wowsims).
  - Warlock: Curse of Recklessness and of Weakness (one curse of yours on a target), Drain Life (heals you), Drain Soul,
    Hellfire (it burns you too) and Rain of Fire.
- Ability visuals (`js/world/spell-fx.js`): spells fly to the target as bolts of their school's colour and burst there;
  channels draw a beam (Mind Flay, the drains) or fall on an area (Blizzard, Rain of Fire, Hurricane); novas ring out
  from you; melee abilities flash an arc; damage over time puffs on the target; shields and auras show on you.
  A channel's cast bar is marked at each of its ticks; the cast bar is two thirds as wide as the power bar.
  Floating combat text is large and outlined, starting at the target's head; nameplates are bigger and sit just above
  each enemy's head (measured from its model).
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
  takes it at 110% in melee range, 130% from further off; Taunt takes it at once). Whoever pulls it off the tank gets
  hit, and can die: the boss walks over to them (Ragnaros only turns: he never leaves his lava), and back to the tank
  once it has aggro again. Dead, you take no more damage and can do nothing (no moving, no casting, no macros) until a
  soulstone or a Rebirth brings you back.
- Targeting as in WoW: click a target (its model or its frame), Tab for the nearest enemy and again for the next
  nearest, Escape to drop your target (your swings stop; the target frame goes); an attack with no target takes the
  nearest.
- Racials (wowsims `racials.go`): Blood Fury, Berserking, Elune's Light, Eureka!, Touch of the Grave, and the
  passive crit/hit/rage/attack speed bonuses, and the Undead's Will of the Forsaken (fear). Forever has no racial weapon skill.
- 3D arena (three.js, `js/world/arena.js`): movement as in WoW: W/S along your facing, A/D turn (strafe while the
  right mouse button is held), right-drag turns you with the camera, left-drag only looks around, both buttons held
  run forward; Space to jump. The movement keys (forward, back, turn, strafe, jump) can be rebound in Settings → Keybinds;
  they go by where the key sits, so the default WASD is ZQSD on an AZERTY keyboard, and the arrow keys always move.
  Binding a key takes it off any ability that had it. Race-styled warrior, melee range (5 yd), facing (you have to face your target),
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
  bar under the target frame (Fojji EUI) shows who it is attacking, the NPC tank included. At a boss the room's
  onlookers are gone: the raid is the NPC raiders.
- Encounter journal (the side menu's Journal, and the ready room's link): each encounter's abilities with their icons,
  when they come (every so often, first at, the cast) and what they do and how to deal with them, from the same numbers
  the fight uses; Onyxia's by her phases. Changing the encounter no longer throws its tactics on the screen.
- The sim's next cast (Settings → Show) can be dragged anywhere at any time, and its cross hides it.
- Fight history: every finished fight is kept (the last 200, in the browser's IndexedDB). The results window has a
  "Past fights" list to open any of them again, and a link to the fight in Numen Logs.
- Numen Logs (`logs.html`, the side menu's Logs): reports (every fight, marked Kill, Wipe, Practice at less than full
  boss health, or Training), a report page (who, the boss, kill or wipe, DPS, the score, deaths, the raid, the gear, and
  the deep dive: damage, threat, auras, casts, resources, timeline, damage taken and the searchable combat log), and
  rankings per real encounter (a classic boss at its full classic health, killed): by spec, best per player, with a
  parse (the share of the ranked players beaten) and the score against wowsims. With a server set (`js/logs/remote.js`,
  Supabase, `tools/numen-logs-schema.sql`) real encounters are uploaded (Settings → Fight can keep them local) and the
  rankings are everyone's; without one they are yours. The server is set: the Supabase project numen-logs (its
  publishable key is public by design; the row security lets it only read reports and add real encounters). Nothing
  verifies an upload: the rankings trust the game.
  Settings → Graphics has a Noggenfogger Elixir option that shows you in skeleton form (looks only).
- Boss fight (`js/world/encounter.js`): Ragefire Brute held by a tank, with a frontal Cleave, Flame Patches, Fire Nova
  and War Stomp (knockback). Damage taken gives rage (wowsims formula) and procs Enrage / Blood Craze; you can die.
- Onyxia (`js/world/onyxia.js`) in Onyxia's Lair (`js/world/lair.js`): a lava cave about 60 yards across, not round (an
  uneven wall, whelp caves east and west, the entrance tunnel south), its floor flat where you fight and sloping up to
  the wall; you start at her side. Her classic encounter by her health (in a timed fight it falls with the clock):
  Phase 1 Cleave and Flame Breath in front, Tail Sweep behind (a knockback); at 65% she flies up over the middle, out
  of melee reach: Fireballs, Deep Breath across the cave (a band to get out of) and whelps from both caves every 20 sec
  (targets of their own, with their own health, which bite whoever they reach; the raid wears them down too); at 40%
  she lands: Bellowing Roar fears you (Berserker Rage keeps it off) and the lava cracks erupt, with Phase 1's attacks
  again. Raid members stand at her flanks and sides; half of each whelp wave goes for them (a whelp you target comes for
  you); tanking her yourself you start in front and take her frontal attacks for half. Onyxia and her whelps are dragons
  built from shapes (`js/world/dragon.js`) that bite, breathe, roar and fly.
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
  Raid cooldowns (`js/data/raid-cooldowns.js`): a tracker left of your frame (movable) shows everyone's Power Infusion,
  Pain Suppression, Innervate, Blessing of Protection, Lay on Hands and Mana Tide Totem as an icon, a bar filling as it
  comes back and the player's name in their class colour. Click another player's ready one to ask them for it: they get
  a pop-up to give it or not, and given, it lands on you (Power Infusion 20% more damage, Pain Suppression 40% less
  damage taken, Innervate five times the spirit regen, Blessing of Protection no physical damage, Lay on Hands full
  health; Mana Tide gives the whole group mana). The ready room (most of the screen) opens for everyone on joining a
  group and at the host's Start: the group with each player's role and ready check, what the raid lacks (the buffs and
  debuffs nobody in it brings, by the class that would, and no tank or no healer), links to your own character,
  talents, consumables, keybinds and the encounter journal, the room key to pass on, and the host's encounter, boss
  health, external healing,
  NPC tank, NPC raiders and raid buffs and debuffs. The host pulls once everyone is ready; the setup is kept per
  encounter for the next pull. The host is the party leader (raid leader past five players): only they
  change the encounter, zone, fight length and targets. In a group the classic bosses always have their real health (shared, fought to the
  death), or 75%, 50% or 25% of it: raid testing. The tracker sits left of your frame, under open panels. The pull
  timer counts 15 in a group (5 alone), and during it everyone buffs what their class can: whatever the raid's players
  and NPCs bring (Gift of the Wild, Prayer of Fortitude, the totems, the blessings, Battle Shout from another warrior,
  the curses and Faerie Fire...) is turned on, each caster's buffs called out as a raid warning. Nothing is turned off.
- Healers (Holy Priest, Holy Paladin, Restoration Shaman, Restoration Druid; the Healer role in the main menu): the
  class's own spells plus its heals from the WoW Forever spell rows at level 60 (`js/data/healing.js`): Greater Heal,
  Flash Heal, Heal, Renew, Power Word: Shield (with Weakened Soul), Prayer of Healing (the target's group), Dispel Magic,
  Abolish Disease; Holy Light, Flash of Light, Holy Shock's heal (its cooldown shared with the damage), Cleanse; Healing
  Wave, Lesser Healing Wave, Chain Heal (the 2 most hurt others for half each jump), Riptide (the Restoration talent: an
  instant heal and a 15 sec heal over time, 6 sec cooldown; a Chain Heal on its target uses it up for 25% more), Cure
  Poison and Disease; Healing
  Touch, Rejuvenation, Regrowth, Swiftmend (eats your Rejuvenation or Regrowth), Remove Curse, Abolish Poison. Healing
  power is +healing gear plus spell damage; heals crit for 50% more with your spell crit; Power Infusion heals 20% more.
  wowsims has no healing sim and no APL, so there is no rotation helper, ghost or score: the meter shows your healing,
  HPS and overhealing. The raid (`js/engine/raid.js`): ten players in two groups, you among them; the boss swings at
  the main tank (some avoided, some crushing), hits someone every few seconds, burns everyone every 30 sec and puts a
  magic, curse, disease or poison debuff on someone every 16 sec. The raid frames (EllesmereUI style) show your heals
  over time with their seconds left, debuffs bordered in their type's colour, shields, the heal you are casting as a
  lighter bar, the main tank the boss is on, and heals rising off the frame. Hover a frame and press a heal to cast it
  there (mouseover casting); click one to make it your target (heals go to the hovered player, else your target, else
  you). Each starts on its class's caster gear and talents: set healing talents in the Talents tab (Mana Tide Totem and
  Swiftmend need theirs). In a group the raid is the real players instead: their frames show the health their own
  fights report, and your heals and shields land on their fights (green numbers rise off them); they take their damage
  there (the targets hitting back). Not yet: healing talents' effects, downranking.
- Raid cooldowns alone: the tracker also lists raid members of the trainer's own (a priest, a druid, a shaman, a
  paladin and a warlock); click one of theirs to have it on you. In a group they are there only for the classes nobody
  plays.
- Dying: with a soulstone on you (ask a warlock for one) or a druid's Rebirth ready, the fight goes on without you for
  a minute and a pop-up offers Use Soulstone, Ask <druid> for Rebirth (a player in a group gets the request, the
  trainer's druid gives it) or Release. Both bring you back with 2200 health and 2800 mana (Rebirth rank 5, Major
  Soulstone). A soulstone is placed before the pull and stays on you from fight to fight until it is used. The dead cannot cast or swing.
- Classic bosses (`js/world/encounter.js`, on the Brute's body in their own colour and size): Lucifron (Shadow Shock,
  Impending Doom near him), Magmadar (Lava Bombs under you, Panic fears everyone near him), Ragnaros (Wrath of
  Ragnaros throws melee back, Lava Splash, Magma Blast), Broodlord Lashlayer (Cleave in front, Blast Wave) and
  Patchwerk (a damage race; Berserk at 7 minutes); Baron Geddon (Inferno, Living Bomb, Ignite Mana) and Golemagg (Pyroblast,
  Earthquake, Magma Splash) in Molten Core; Vaelastrasz (Flame Breath, a constant Fire Nova, Burning Adrenaline),
  Chromaggus (Incinerate and Corrosive Acid in turn, Frenzied Bite) and Nefarian (Shadow Flame, Bellowing Roar, Veil of
  Shadow) in Blackwing Lair; Grobbulus (Slime Spray, Poison Clouds, Mutating Injection), Gluth (Terrifying Roar, Decimate
  every 105 s, Berserk at 8 minutes) and Loatheb (Poison Aura, Inevitable Doom, Berserk at 10 minutes) in Naxxramas; and Zul'Gurub's High Priest Venoxis (Holy Nova, Poison Clouds),
  High Priestess Jeklik (Sonic Burst, Terrifying Screech, the bat riders' fire bombs), High Priestess Mar'li (Poison Bolt
  Volley, Enveloping Webs), High Priest Thekal (Mortal Cleave, Force Punch), Bloodlord Mandokir (Cleave, Whirlwind) and
  Hakkar the Soulflayer (Corrupted Blood, Cause Insanity, Blood Siphon every 90 s, Enrage at 10 minutes; APPROX 20-man
  health), and the Ruins of Ahn'Qiraj's Kurinnaxx (Wide Slash, Sand Traps), General Rajaxx (Thundercrash, Thunderclap),
  Moam (Trample, Arcane Eruption every 50 s), Buru the Gorger (exploding eggs, Creeping Plague), Ayamiss the Hunter
  (Stinger Spray, her larvae's swarm) and Ossirian the Unscarred (War Stomp, Sand Vortexes, Supreme at 8 minutes; APPROX
  20-man health). Their abilities deal their own damage. Each is fought in its raid's own room
  (`js/world/raid-rooms.js`, about fifty times the training ring's floor): Molten Core's lava cavern (Ragnaros's lake
  and lava falls, lava rivers, glowing runes, rock columns and obsidian spires), Blackwing Lair's hall (columns, red
  banners, forge grates, iron chandeliers, a black dragon's bones, egg clutches) and Naxxramas's Construct Quarter
  (iron grates, slime pools and falls, cages, chains and meat hooks, gothic vaults, green fire) and Zul'Gurub's Altar of
  Hakkar under the open jungle sky (a mossy temple court in terraced steps, the stepped pyramid with Hakkar's blood pool
  at its foot, tiki totems, serpent statues, broken columns, green fire, the jungle around) and the Ruins of Ahn'Qiraj in
  the open desert (sand over old paving, broken walls and toppled pillars, glyph-carved obelisks with Ossirian's glowing
  crystals, the gate of Ahn'Qiraj between two colossal qiraji statues, dunes around). The bosses are shaped
  on the Brute's rig (`js/world/raid-bosses.js`): Magmadar a four-legged core hound, Ragnaros a burning lord rising
  from the lava with Sulfuras, Patchwerk a stitched abomination with a hook and a cleaver, Broodlord a winged
  dragonkin, Lucifron a robed, horned flamewaker, the Zul'Gurub trolls with tusks and crests (Venoxis with a cobra's
  hood and a serpent's tail, Jeklik with bat wings, Mar'li with a spider's legs, Thekal striped, Mandokir with an axe)
  and Hakkar a winged, feathered serpent; Kurinnaxx and Ayamiss silithid on six legs, Rajaxx a plated qiraji general,
  Moam an obsidian giant glowing with arcane, Buru a bloated beetle-worm and Ossirian grown with crystals; Geddon a fire lord
  in iron bands, Golemagg a molten giant, Vaelastrasz and Nefarian great winged dragons, Chromaggus a two-headed hound of
  many colours, Gluth a rotting hound, Grobbulus a slime abomination and Loatheb a fungal giant under its cap. Settings → Fight (or the
  host's raid setup): Classic bosses at their real health, fought to the death (APPROX: their classic 40-man health;
  in a group the health is shared).
- Spell pushback: a hit while you cast delays the cast by 1 sec, 0.2 sec less for each hit after; a hit while you
  channel cuts 25% of the channel's full length off it (Mind Flay, Drain Life, Arcane Missiles, Evocation...; Shoot is
  not pushed back). Less of it with the pushback talents, at the wowsims Forever values (they add up, to none at most):
  Healing Focus (shaman heals 23/47/70%), Burning Soul (fire spells 23/47/70%), Intensity (Destruction 23/47/70%),
  Fel Concentration (the drains 23/47/70%), Spiritual Focus (Holy Light, Flash of Light 35/70%), Nature's Focus
  (14% a rank), Twilight Focus (priest spells 23/47/70%), Concentration Aura (35%), and Martyrdom's Focused Casting
  (a crit taken, 50/100%: none for 6 sec).
- Loss of control: while feared (Onyxia's Bellowing Roar, Magmadar's Panic) a big icon shows the seconds left and the
  screen's edges turn purple. Feared you can only break it: Berserker Rage, Death Wish and Will of the Forsaken (the
  Undead racial now: 5 sec, 2 min cooldown) break a fear when used and make you immune while they last; a Tremor Totem
  (shaman, earth, 5 min) shakes it off on its next pulse (every 4 sec).
- Pause (top bar, or the Pause key): the fight's clock stops, and with it the boss's mechanics, the sim, the NPC
  tank and a healer's raid; nothing can be cast until you go on. In a group the host pauses and resumes for everyone.
- Only warriors, rogues and hunters show an off-hand weapon; a held-in-off-hand item is not drawn as a weapon.
- Appearance (Character tab, with Codex's `js/world/customization.js`): hair style and colour, eyes, skin, face,
  beard, markings, jewelry and the race's horns, tusks or ears, kept for each race in your settings and shown to your
  group. Without that file in the build the section stays hidden.
- The NPC tank (`js/tank-bot.js`; Settings → Fight, or the host's raid setup): a Protection Warrior, Protection
  Paladin or Feral Bear on its wowsims preset playing its APL in a fight of its own on the boss, with the raid's
  external healing on it. It holds the boss by its threat: pass 110% of it and the boss turns to you. In a fight to the
  death its damage comes off the boss too. Drawn as its class, race and gear with its name over it. "A stand-in" is
  the old NPC that only holds the boss. It is on the raid frames, and on the target of target while it tanks. Its
  Sunder Armor stacks, Thunder Clap and Demoralizing Shout go on your boss (and the sim's) as it lands them: the
  boss's armor drops with each Sunder, as with your own. The raid's "Sunder Armor ×5 (already up)" still holds all
  five from the pull; with "None" you see the tank build them.
- Blessing of Salvation (Raid tab → Blessings, wowsims `greaterBlessingOfSalvation`): 30% less threat. On by default
  for every spec but a tank's; turned off, it stays off. With a paladin in the raid (a player in the group, you, the
  NPC tank or an NPC raider) a non-tank has it whatever the setting says (the tile shows it on).
- The menus, buttons, tabs and highlights take your class's colour (the warrior's tan before only).
- NPC raiders (`js/raid-bots.js`; "Fill the raid with NPCs" under the group in the ready room and the Group panel, or
  Settings → Fight; listed with the group): the raid filled out to 5, 10 or 20, at a boss or the dummies, with
  DPS specs of every class, each on its wowsims preset playing its APL in a fight of its own on the boss (as the NPC
  tank does). They stand around the boss, the melee at its back and flanks (following it when it walks), the rest in
  arcs further off; they are on the raid frames, their damage comes off a shared boss health, the raid's healers keep
  them up, and they bring their class's buffs. They react to the boss's mechanics, but not perfectly: each has a skill
  roll, so now and then one is too slow out of a stomp, steps into a cleave or stands in fire, and the melee get
  feared (a warrior's Berserker Rage mostly in time). They can die. About 0.6 ms a frame for 20.
- NPC healers: about one in four of the NPC raiders (5: 1, 10: 3, 20: 5, less the players who heal) are a Holy
  Priest, Restoration Druid, Restoration Shaman or Holy Paladin on its preset, casting its class's big and fast heals
  (`js/data/healing.js`, with its healing power and crits) on you, the NPC tank and the raiders: the tank first while
  it is below 90%, else whoever is lowest below 80%, without two of them topping off the same one; their heals show on
  the raid frames. With any healer in the raid (a player or an NPC) the external healing per second is off, for you
  and the NPC tank, and the NPCs' unseen regeneration with it. Their mana is not counted.
  A healer player's raid frames are the real raid whenever there is one: the group's players and the NPC tank, healers
  and DPS at their own health, taking the boss's real damage, with your heals and shields landing on them (alone with
  no NPCs, the simulated raid as before).
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

- Mage: Fire is 3% under the wowsims sim and Arcane 3% over; their spells' damage per hit matches the combat log, so
  the rest is in the casts and procs. Spell item procs (on a spell hit) are not modelled.
- Area spells (Blizzard, Flamestrike, Rain of Fire, Hurricane): the world gives only your distance to each target, so
  an area at your target reaches the targets whose distance from you is within its radius of your target's.
- Rogue: set bonuses (Darkmantle) are not modelled; Murder neither (humanoids and giants only: none of the trainer's
  targets).
- Feral: Rip and Rake tick about 5% under wowsims, white swings about 5% over (the totals agree). Powershifting (Furor)
  and a second explosive (Goblin Sapper Charge) are not modelled; the form is fixed by the spec.
- Consumables: wowsims counts the strongest consumable crit once (Elixir of Sages and Elixir of the Grizzly give 2%, not
  4%), with a Natural flask's zone bonus on top; the trainer does the same.
- Casters (Mage, Priest, Shaman, Druid): wowsims precasts the first spell so it lands at the pull; the trainer starts the fight with
  that cast, about 1.5 sec later (some 1–2% of a 2 minute fight).
- Priest: Feedback (Human) does nothing in the trainer, as in wowsims (no target casts at you); the wand's school is the
  Smite build's Brilliant Wand's (Fire).
- Spell crit: Leader of the Pack (A_MOD_WEAPON_CRIT_PERCENT) reaches weapons only, not spells; Brilliant Wizard Oil
  gives 1% spell crit, a Firestone 1–2% and a Spellstone 1–2% cast speed; a Scroll of Imbue fits only its weapon
  (a staff, a dagger or a one-handed sword), as wowsims. The warlock builds now match the sim within 1%.
- Hunter: Counterattack, Volley and the pet families other than the Raptor are not in wowsims, so their numbers come
  from the spell data with no sim to check against; Sniper Shot's range buff is not modelled.
- Warlock: Bane of Havoc's share, the Voidwalker's and Felhunter's spells, summoning or sacrificing in the fight, Fel Domination and
  the Firestone's proc are not modelled; the rotations are the builds' single-target parts.
- Enhancement: Hunter's Mark, Dragonbreath Chili, Storm Gauntlets' lightning and the Manual Crowd Pummeler swap are not
  modelled; casting a Lightning Bolt does not hold your swings.
- Shaman: Chain Lightning's and Magma Totem's extra targets beyond the trainer's are not modelled; totems do not
  travel with you (they stand where you dropped them; Totemic Projection brings them to where you stand, not to a
  spot you aim at).
- Paladin: Iron Creed's damage reduction, Vindication, Light's Vigil and
  Purifying Power are not modelled; Holy Shock is about 5% over wowsims and Retribution 3% under (crit on its seal and Holy Strike hits runs a
  few points high).

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
