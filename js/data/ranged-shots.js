// The ranged weapon's kind and the shots of the classes that carry one without Auto Shot (warriors and rogues): Shoot
// Bow, Shoot Crossbow, Shoot Gun (2480, 7919, 7918: 8-30 yd, a 1 sec cast) and Throw (2764: instant), each with its
// own weapon. A shot waits for the ranged weapon's own timer, its speed (engine/unit.js rangedShot). A wand's Shoot is
// the casters' (classes/caster.js).

// The ranged slot's bow, gun, crossbow, wand or thrown weapon, read off its icon, else its name (the item list carries
// no ranged weapon type, and a few items no icon). A relic (an idol, libram or totem) is none: null.
export function rangedKind(icon = '', name = '') {
  icon = (icon || '').toLowerCase();
  name = (name || '').toLowerCase();
  if (/relics|idol|libram|totem/.test(icon + ' ' + name)) return null;
  const read = (s) => (/crossbow/.test(s) ? 'crossbow' : /rifle|gun|musket|blunderbuss/.test(s) ? 'gun' : /bow/.test(s) ? 'bow'
    : /wand|torch|\brod\b/.test(s) ? 'wand' : /throw|knife|star/.test(s) ? 'thrown' : null);
  return read(icon) || read(name);
}

const SHOT = { key: '', cost: 0, gcd: true, minRange: 8, range: 30 };
export const RANGED_SHOTS = {
  shootBow: { ...SHOT, name: 'Shoot Bow', spellId: 2480, icon: 'ability_marksmanship', castTime: 1, ranged: 'bow' },
  shootCrossbow: { ...SHOT, name: 'Shoot Crossbow', spellId: 7919, icon: 'ability_marksmanship', castTime: 1, ranged: 'crossbow' },
  shootGun: { ...SHOT, name: 'Shoot Gun', spellId: 7918, icon: 'ability_marksmanship', castTime: 1, ranged: 'gun' },
  throw: { ...SHOT, name: 'Throw', spellId: 2764, icon: 'ability_throw', ranged: 'thrown' },
};
// Their spellbook entries.
export const RANGED_SHOT_SPELLS = Object.entries(RANGED_SHOTS).map(([id, a]) => ({ id, name: a.name, spellId: a.spellId, icon: a.icon }));
