# Character models and Noggenfogger integration

Characters use original Three.js geometry. Nothing in `assets/models` is loaded. The supplied models and licence remain untouched on disk.

## Appearance

Starter clothing follows the supplied Forever character-creation screenshots: recruit shirts and yellow trousers, race-specific leathers and harnesses, class robes, and Skyborne wraps. Body 1 and Body 2 have separate anatomy and hairstyles. Humans and gnomes default to Body 2. Equipped weapon types still come from `gearLook()`; clothing does not become raid armor when importing high-level gear. Stats and item effects are unchanged.

The primary reference is the user's 28 October 2026 screenshot collection. [The local catalog](tools/character-references/catalog.json) labels 104 full race/class/body screenshots; nine contact sheets retain the visible reference details. Windshaper warrior, hunter, rogue and druid use their matching High Order outfits at the user's explicit direction. Earlier secondary references:

- [Classic Recruit's Shirt and race/class starting-shirt table](https://www.wowhead.com/classic/item=38/recruits-shirt)
- [Starting class shirts](https://warcraft.wiki.gg/wiki/Shirt#Starting_class_shirts)
- [Noggenfogger Elixir / skeleton form](https://warcraft.wiki.gg/wiki/Noggenfogger_Elixir)

These remain original, stylized approximations: garment colours, cuts, trim, silhouettes and weapon families follow the screenshots; facial fidelity and detailed textile artwork are not pixel-identical to WoW's HD meshes. The race/class matrix below comes from Forever's enabled creation-screen choices, not Retail or Classic assumptions. Class visuals do not implement class gameplay.

| Race | Allowed model classes |
|---|---|
| Human | Warrior, Hunter, Mage, Rogue, Priest, Warlock, Paladin |
| Dwarf | Warrior, Hunter, Rogue, Priest, Paladin, Shaman |
| Gnome | Warrior, Mage, Rogue, Priest, Warlock |
| Night Elf | Warrior, Hunter, Rogue, Priest, Druid |
| Orc | Warrior, Hunter, Mage, Rogue, Warlock, Shaman |
| Undead | Warrior, Mage, Rogue, Priest, Warlock, Paladin |
| Tauren | Warrior, Hunter, Druid, Shaman |
| Troll | Warrior, Hunter, Mage, Rogue, Priest, Warlock, Shaman |
| High Order Skyborne | Warrior, Hunter, Mage, Rogue, Druid |
| Windshaper Skyborne | Warrior, Hunter, Rogue, Druid, Shaman |

This is 56 race/class combinations, each available in both body types. Invalid combinations normalize to that race's warrior profile. The studio hides unavailable choices; its multi-race views offer only classes supported by every displayed race.

## Hook for Claude's settings control

Call this on the existing Arena instance when the setting changes, and after creating a new Arena when restoring saved settings:

```js
arena.setAppearance({ transform: enabled ? 'noggenfogger' : null });
```

This switches only the visual model. Noggenfogger shows the skeleton, its own small torn navy shorts, and held equipment: no armor, clothes, cape, hair, ears, horns, tail or wings from the base race. Main/offhand weapons, empty hands, and two-handed weapons follow the same gear input. The form uses one skeleton anatomy for every race. Player collision radius remains 0.5; nameplate height follows the displayed form.

Changing appearance preserves world position, facing, death/animation state and existing fight state. Changing gear or race keeps the selected transformation. Passing `null` restores the current race/class outfit. The hook does not implement the elixir's random outcomes, shrinking, slow fall, duration, stats, or persistence. The game Settings control is intentionally left for Claude.

## Future classes

```js
arena.setAppearance({ classId: 'mage' }); // keeps the current transformation
arena.setAppearance({ bodyType: 'body2' }); // 'body1', 'body2', or null for the race default

// Standalone model creation:
import { makeCharacter } from './js/world/characters.js';
const model = makeCharacter({
  race: 'RaceHuman',
  classId: 'mage',
  bodyType: 'body2',
  gear: null,               // or gearLook(equippedItems)
  transform: null,          // or 'noggenfogger'
});
```

Class IDs are `warrior`, `paladin`, `hunter`, `rogue`, `priest`, `mage`, `warlock`, `druid`, `shaman`, restricted by race as above. A provided gear object controls held equipment; null gear uses the reference starter weapons. Warriors generally carry a small sword/axe and wooden buckler; caster starters have a staff, dagger or mace as pictured. Hunters use bows except dwarf and tauren starters, which use guns. Tauren warriors and paladin starters use a wooden two-handed hammer.

Weapon models accept numeric melee types plus `sword`, `axe`, `dagger`, `mace`, `fist`, `staff`, `polearm`, `2h-mace`, `2h-sword`, `2h-axe`, `shield`, `bow`, `crossbow`, `gun`, `thrown` (also `throwing` / `throwing-weapon`), and `wand`. Example: `gear: { mh: 'crossbow', oh: null }`. Shield type 7 renders a shield and emits no blade trail; ranged weapons also emit no melee trail. Two-handed equipment suppresses the offhand item.

Main hand is always anatomical right (-X on a model facing +Z); offhand is anatomical left (+X). Melee cutting planes face forward through the swing, and shields face away from the left forearm. Ranged muzzle/arrow axes point along character-forward +Z when aiming. The bow stays in the right/main hand with the left hand drawing its string.

`arena.animate('ranged')` or `model.userData.anim.ranged = 1` starts the equipped ranged weapon's animation. Existing main-hand triggers also select ranged animation automatically for ranged equipment. Bow draw/release, gun aim/recoil, crossbow release/recovery, overarm knife throwing and wand casting have separate poses and cosmetic release effects. The studio's **Ranged attack** mode repeats these for inspection. These effects do not deal damage or implement ammunition, target tracking, cooldowns or class combat. General spellcasting and shapeshifts remain future work.

The current item database omits ranged subtype metadata. Ranged models can therefore be selected explicitly through the model API and studio; importing a ranged-slot item does not automatically replace the warrior's held melee weapon. Future class integration should pass the chosen ranged model when appropriate.

The model boundary is independent of class combat:

- `appearance.js`: Forever race/class rules, reference garment profiles, appearance validation.
- `race-bodies.js`: Body 1/2 anatomy, skin tones and hairstyles.
- `starter-clothing.js`: fitted garments, painted cloth maps, footwear and limb surfaces.
- `character-body.js`: common joints and equipment attachment.
- `heads.js`: race faces, hair, tusks, horns, ears and beards.
- `skeleton.js`: skeleton anatomy and its own torn navy shorts.
- `weapons.js`: held weapons/shield and blade trail markers.
- `ranged-animation.js`: hand placement, ranged poses, recoil, release effects and recovery.
- `models.js`: race proportions, existing `gearLook()`, factories, animation.
- `characters.js`: public creation, animation, disposal adapter.

`buildWarrior(race, gear)` remains compatible with existing callers. New class-aware callers should use `makeCharacter()` or `buildPlayer(race, gear, appearance)`. Models face +Z, stand near y=0, and expose `userData.rig`, `body`, `anim`, `radius`, and `height`. Animation triggers are `mh`, `oh`, `ranged`, `spin`, `hit`, `dead`, and `cheer`.

## Preview and verification

Serve the project normally, then open `/tools/character-preview.html`. It provides race comparisons, class outfit and Noggenfogger controls, orbit/zoom, equipment variants and animation selection. These are inspection controls, separate from the game Settings UI.

“Run model checks” exercises all 112 permitted race/class/body variants, Noggenfogger across every race, boss/tank, weapon variants, twelve animation states, death/reset, finite geometry/transforms, weapon trail markers, two-handed grip reach, race/class restrictions and the Arena appearance hook. It also checks that the page requested no GLB/glTF/model-folder assets. Generated garment textures are owned and disposed with their character instance.

Weapon checks also verify anatomical hand attachments, forward aiming after rotating the character, projectile release/recovery, thrown-weapon visibility, and ranged death/reset. All five ranged types are exercised on Noggenfogger as well as normal bodies.

### Weapon clearance

Long melee handles are gripped near their butt; two-handed attacks follow an arc in front of the chest. Rifle/crossbow carries turn the torso and raise the right elbow, with the left hand supporting the fore-end. Compact stocks leave clearance for fuller torsos. Single-handed windups stay outside the head, wrists keep pommels off the forearms, and strafing leaves more room beside the legs. A fallen character holds the bow lengthwise beside the body.

`tools/weapon-clearance.html` samples actual weapon surfaces against inner torso, head, pelvis, arm, leg and robe volumes through twelve poses. It covers all races, both bodies, robe wearers and Noggenfogger. This catches bulk intersections; it is not a physical collision solver for every decorative strand or an arbitrary future weapon. The existing studio checks separately verify hand reach and aiming direction.

The [Wowhead Forever dressing room](https://www.wowhead.com/forever/dressing-room) provides animation references, including AttackRifle, AttackCrossbow, AttackBow, AttackThrown, Attack1H and Attack2H. The rifle posture was inspected as a visual reference; animation data is not imported into the game.

## Hunter pets, warlock summons and shaman totems

Open `tools/companion-preview.html`, also linked from Character Studio. It has a collection view, individual inspection, three hunter coat palettes, totem race selection, and idle/run/attack/cast/hit/death controls. These are original stylized family models, not copies of every named tameable NPC or its individual texture.

- Hunter: bat, bear, bird of prey (also accepts `owl`), boar, carrion bird, cat, crab, crocolisk, fox, gorilla, hyena, raptor, scorpid, spider, tallstrider, turtle, wind serpent and wolf. The summoned hawk is separate from the 18 tameable families. IDs use hyphens: `bird-of-prey`, `carrion-bird`, `wind-serpent`.
- Warlock: imp, voidwalker, succubus, incubus, felhunter, infernal, doomguard and felguard. Felguard is supplied as a visual asset from the database roster; its presence here does not enable a talent or imply current Forever player availability. Infernal and doomguard likewise have no summon/control rules in this visual module.
- Shaman: earth, fire, water and air, each with Orc, Tauren, Troll, Dwarf and Windshaper Skyborne construction. Invalid shaman races are rejected. Spells of the same element can reuse that element's model; spell IDs and effects remain the class system's responsibility.

Family coverage follows [Forever's pet-family listing](https://mmonster.co/wow-forever/guides/hunter-pets) and [Blizzard's Hunter/Druid deep dive](https://news.blizzard.com/en-us/article/24301515/world-of-warcraft-forever-class-deep-dives-hunter-and-druid), which confirms foxes. Summon references include [Wowhead's Forever summon list](https://www.wowhead.com/forever/spells/name%3Asummon) and [Felguard's database entry](https://www.wowhead.com/forever/spell%3D427733/summon-felguard). Race restrictions use this project's screenshot-derived matrix. Totem race details are original interpretations, not verified replicas of the Forever racial meshes.

```js
import { makeCompanion, animateCompanion, disposeCompanion } from './js/world/companions.js';

const pet = makeCompanion({ category: 'hunter', kind: 'wolf', skin: 'natural' });
const demon = makeCompanion({ category: 'warlock', kind: 'voidwalker' });
const totem = makeCompanion({ category: 'totem', kind: 'air', race: 'RaceTauren' });
scene.add(pet);
pet.position.set(2, 0, 0); // caller owns placement, facing, following and targeting
pet.userData.anim.attack = 1; // also cast = 1, hit = 1, dead = true/false
animateCompanion(pet, { dt, speed: 1 }); // speed -1..1; call every frame
scene.remove(pet);
disposeCompanion(pet);
```

`makeCompanion()` defaults to a wolf; category-only calls default to imp or earth. Roots face +Z and expose `kind`, `category`, `body`, `rig`, `anim`, `height`, and `radius` under `userData`. Flight/hover is part of the visual rig. Animation preserves the root's world placement. Totems pulse and shrink on death, then restore when `dead` becomes false. Material and geometry ownership is per instance.

The companion module does not spawn pets in a warrior encounter or modify combat. Future class controllers can use these factories for spawning, following, attacks and despawning without touching character anatomy. The studio checks all 57 hunter coat/summon combinations, eight demon rigs, 20 totem designs, six animation states, death/reset, finite geometry/transforms and invalid totem race rejection.
