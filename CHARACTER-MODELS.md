# Character models and Noggenfogger integration

Characters use original Three.js geometry. Nothing in `assets/models` is loaded. The supplied models and licence remain untouched on disk.

## Appearance

The default is simple starter clothing: plain trousers, leather footwear/wrist wraps, a Recruit-inspired shirt for Alliance warriors, and a Brawler-inspired harness for Horde warriors. There are no player pauldrons, breastplates, gems, tabards, helmets or cloaks. Equipped weapon types still come from `gearLook()`; clothing intentionally does not become raid armor when importing high-level gear. Stats and item effects are unchanged.

Classic starting outfits depend on **both race and class**, and several races share the same outfit. References:

- [Classic Recruit's Shirt and race/class starting-shirt table](https://www.wowhead.com/classic/item=38/recruits-shirt)
- [Starting class shirts](https://warcraft.wiki.gg/wiki/Shirt#Starting_class_shirts)
- [Noggenfogger Elixir / skeleton form](https://warcraft.wiki.gg/wiki/Noggenfogger_Elixir)

These are original, stylized approximations, not extracted WoW models or exact item appearances. The High Order and Windshaper Skyborne starter outfits are restrained placeholders; their Forever-specific starting gear has not been verified. Other class outfits are basic visual placeholders for future work, not implementations of class gameplay or legal race/class combinations.

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

// Standalone model creation:
import { makeCharacter } from './js/world/characters.js';
const model = makeCharacter({
  race: 'RaceHuman',
  classId: 'mage',
  gear: null,               // or gearLook(equippedItems)
  transform: null,          // or 'noggenfogger'
});
```

Class IDs currently have simple outfit profiles: `warrior`, `paladin`, `hunter`, `rogue`, `priest`, `mage`, `warlock`, `druid`, `shaman`. Unknown values fall back to warrior. A provided gear object controls held equipment; a null gear object uses the profile's preview weapon. Caster profiles can use a plain staff. Ranged equipment/animations, casting animations, shapeshifts, and other class gameplay are future work.

The model boundary is independent of class combat:

- `appearance.js`: race and class clothing profiles, appearance validation.
- `character-body.js`: common joints, simple clothes, equipment attachment.
- `heads.js`: race faces, hair, tusks, horns, ears and beards.
- `skeleton.js`: skeleton anatomy and its own torn navy shorts.
- `weapons.js`: held weapons/shield and blade trail markers.
- `models.js`: race proportions, existing `gearLook()`, factories, animation.
- `characters.js`: public creation, animation, disposal adapter.

`buildWarrior(race, gear)` remains compatible with existing callers. New class-aware callers should use `makeCharacter()` or `buildPlayer(race, gear, appearance)`. Models face +Z, stand near y=0, and expose `userData.rig`, `body`, `anim`, `radius`, and `height`. Animation triggers remain `mh`, `oh`, `spin`, `hit`, `dead`, and `cheer`.

## Preview and verification

Serve the project normally, then open `/tools/character-preview.html`. It provides race comparisons, class outfit and Noggenfogger controls, orbit/zoom, equipment variants and animation selection. These are inspection controls, separate from the game Settings UI.

“Run model checks” exercises all ten races, Noggenfogger across every race, eight additional class profiles, boss/tank, weapon variants, twelve animation states, death/reset, finite geometry/transforms, weapon trail markers, two-handed grip reach and the Arena appearance hook. It also checks that the page requested no GLB/glTF/model-folder assets.
