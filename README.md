# Numen Gym

A browser trainer for practising WoW Forever rotations on training dummies and a boss. Warrior for now (Fury, Arms
and Protection); keybind presets and the rotation helper are set up per class and spec so more can be added.
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
| `js/main.js` | UI, keybinds, game loop. The HUD is laid out like the Fojji Warrior UI (WeakAuras pack): sizes, colours and anchor offsets from its 1440p export |
| `js/apl.js` | Rotation helper: runs a wowsims APL (priority list, groups, variables, conditions) against the live fight; borders on the buttons to press |
| `js/data/fury-apl.js` | Default APL for the helper. An imported wowsims export, or an APL pasted in Settings, replaces it |
| `js/results.js` | After-fight results (damage, threat, auras, casts, resources, timeline, damage taken, log) |
| `js/score.js` | Parse-style score (0–100, Warcraft Logs colours) against a reference: the wowsims sim, else the rotation helper's bot |
| `js/data/warrior-talents.js` | The three warrior talent trees (wowsims `ui/sim/talents/trees/warrior.json`, icons from its db.json), what each modelled talent does in the trainer, and the wowsims talent presets as builds |
| `js/data/warrior-spellbook.js` | The warrior spellbook at level 60: every class spell at its highest Forever rank (IDs and icons from wowsims db.json), talent spells when talented |
| `js/talents.js` | Talent strings ↔ points, and the rules for spending them (51 points, 5 per row, prerequisites) |
| `js/data/specs.js` | The specs (Fury, Arms, Protection): default character, APL, starting stance, bar layout, and for Protection the threat score and a fight that hits back |
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
| `js/world/appearance.js` | Simple race/class starter outfit profiles and cosmetic transformation options |
| `js/world/character-body.js` | Shared humanoid rig and simple clothing |
| `js/world/heads.js` | Original race-specific faces and features |
| `js/world/skeleton.js` | Noggenfogger skeleton anatomy, torn navy shorts and held equipment |
| `js/world/weapons.js` | Original weapons and shield, with swing trail markers |
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
- The target hits back (Settings → Fight): automatically for a tank spec, or in a group with a tank; always or never
  by choice. It attacks whoever has its aggro: alone, you; in a group, whoever has the most threat (another player
  takes it at 110%; Taunt takes it at once). Whoever pulls it off the tank gets hit, and can die.
- Racials (wowsims `racials.go`): Blood Fury, Berserking, Elune's Light, Eureka!, Touch of the Grave, and the
  passive crit/hit/rage/attack speed bonuses. Forever has no racial weapon skill.
- 3D arena (three.js, `js/world/arena.js`): WASD movement, Space to jump, race-styled warrior, melee range (5 yd),
  facing, front/behind (parry and block only from the front), Whirlwind within 8 yd, Charge (8–25 yd, out of combat).
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
- Specs (top bar): Fury, Arms and Protection, each with its own saved character, keybinds, bar layout and APL (`js/data/specs.js`).
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
