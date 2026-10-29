// Original, code-built characters. Geometry and animation live in models.js; no external model
// files are loaded. Models stand on y = 0 and face +Z, matching the arena's movement and targeting.
import { animateRig, bladePoints, buildBoss, buildTank, buildPlayer } from './models.js';

// role: 'player' | 'tank' | 'boss' | 'raid'. gear: gearLook() output.
export function makeCharacter({ race = 'RaceOrc', role = 'player', gear = null, classId = 'warrior', transform = null, bodyType = null } = {}) {
  if (role === 'boss') return buildBoss();
  if (role === 'tank') return buildTank();
  return buildPlayer(race, gear, { classId, transform, bodyType });
}

// Attacks are triggered by setting anim.mh / anim.oh / anim.ranged / anim.spin / anim.hit to 1.
export function animateCharacter(model, s) {
  animateRig(model, s);
}

// World positions of a weapon's base and tip for swing trails, or null.
export function characterBlade(model, side) {
  return bladePoints(model, side);
}

// Original character geometry/materials belong to that instance, including race features.
export function disposeCharacter(model) {
  const geometries = new Set(), materials = new Set();
  model.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) for (const m of [].concat(o.material)) materials.add(m);
  });
  for (const g of geometries) g.dispose();
  for (const m of materials) {
    if (m.map?.userData.characterOwned) m.map.dispose();
    m.dispose();
  }
}
