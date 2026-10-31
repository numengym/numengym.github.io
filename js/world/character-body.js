// Common animation rig; race/body anatomy and starter garments are separate cosmetic layers.
import * as THREE from 'three';
import { weapon, shield, isTwoHandedWeapon } from './weapons.js';
import { dressSkeleton } from './skeleton.js';
import { dressStarter } from './starter-clothing.js';
import { createRangedEffects } from './ranged-animation.js';
const group = (x=0,y=0,z=0) => { const g=new THREE.Group(); g.position.set(x,y,z); return g; };
export function buildHumanoid(look, { outfit, gear = null, offHand = 'weapon', transform = null, classId = 'warrior', bodyType = null }) {
  const skeleton = transform === 'noggenfogger';
  const anatomy = skeleton ? { height: 1, width: .9, head: 1, hunch: .14 } : look;
  const root = group(), body = group(); root.add(body);
  const j = { hair: [] };
  j.hips = group(0, .95, 0); body.add(j.hips);
  j.spine = group(0, .06, 0); j.hips.add(j.spine);
  j.spine.rotation.x = anatomy.hunch || 0;
  j.neck = group(0, .52, .01); j.spine.add(j.neck);
  j.head = group(0, anatomy.headY || .2, .02); j.neck.add(j.head);
  j.head.rotation.x = -(anatomy.hunch || 0) * .85;
  for (const s of [-1, 1]) {
    // Facing +Z, anatomical right is -X (the viewer's left in a front view).
    const k = s < 0 ? 'R' : 'L';
    j['thigh' + k] = group(s * .14, -.02, 0); j.hips.add(j['thigh' + k]);
    j['knee' + k] = group(0, -.44, 0); j['thigh' + k].add(j['knee' + k]);
    j['ankle' + k] = group(0, -.4, 0); j['knee' + k].add(j['ankle' + k]);
    j['shoulder' + k] = group(s * .29, .42, 0); j.spine.add(j['shoulder' + k]);
    j['elbow' + k] = group(0, -.29, 0); j['shoulder' + k].add(j['elbow' + k]);
    j['wrist' + k] = group(0, -.26, 0); j['elbow' + k].add(j['wrist' + k]);
  }
  if (skeleton) dressSkeleton(j); else dressStarter(j, look, outfit);
  body.traverse((o) => { if (o.isMesh && !o.userData.visualLayer) o.userData.visualLayer = skeleton ? 'skeleton' : 'starter'; });
  // Weapon types follow the gear worn. Cosmetics never alter the character sheet.
  // A hunter carries a melee set and a bow, gun or crossbow: one in the hands, the other on the back (holdWeapons).
  // Anyone else wearing a ranged weapon carries it too: a bow, gun or crossbow on the back, a wand or thrown at the hip.
  const outfitRanged = isRangedKind(outfit.weapon);
  const hunter = classId === 'hunter' && !skeleton;
  const rangedKind = skeleton ? null : gear ? gear.ranged : hunter && outfitRanged ? outfit.weapon : null;
  const mh = gear ? gear.mh : hunter && outfitRanged ? 'starter-axe' : outfit.weapon;
  const twoHand = isTwoHandedWeapon(mh);
  const oh = twoHand ? null : gear ? gear.oh : outfit.offhand;
  const sets = { melee: { twoHand } };
  for (const [side, kind] of [['R', mh], ['L', oh]]) {
    const held = side === 'L' && offHand === 'shield' && !twoHand ? shield() : kind == null ? null : weapon(kind, { classId, caster: gear ? gear.caster : null });
    if (held) sets.melee[side] = gripWeapon(held, side, twoHand);
  }
  if (rangedKind) sets.ranged = { twoHand: true, R: gripWeapon(weapon(rangedKind), 'R', true) };
  body.scale.set(anatomy.width, anatomy.height, anatomy.width);
  const hs = anatomy.head || 1;
  j.head.scale.set(hs / anatomy.width, hs / anatomy.height, hs / anatomy.width);
  if (skeleton) body.scale.multiplyScalar(.5);
  root.userData = {
    rig: j, body, hunch: anatomy.hunch || 0, twoHand, classId, bodyType, transform: skeleton ? 'noggenfogger' : null,
    weaponSets: sets, held: null, rangedEffects: null,
    radius: .5, height: 2 * anatomy.height * (skeleton ? .5 : 1),
    anim: { walk: 0, move: 0, mh: 0, oh: 0, ranged: 0, spin: 0, hit: 0, dead: false, death: 0, cheer: 0, combat: 0, t: Math.random() * 10 },
  };
  // The arrow in flight and the muzzle flash of each set held by a ranged weapon.
  for (const set of Object.values(sets)) if (set.R?.userData.ranged) set.fx = createRangedEffects(body, set.R);
  holdWeapons(root, hunter && sets.ranged ? 'ranged' : 'melee');
  return root;
}

const isRangedKind = (kind) => ['bow', 'crossbow', 'gun', 'thrown', 'wand'].includes(kind);

// A weapon's place in the hand, kept so it can go back there after the back.
function gripWeapon(held, side, twoHand) {
  if (twoHand && !held.userData.ranged) {
    // Grip a long weapon toward the middle of its shaft (40% up from its butt), as its weight asks; slung on the back
    // it hangs from the same point, low across the back.
    const bounds=new THREE.Box3().setFromObject(held),shift=-.4*(bounds.max.z-bounds.min.z)-bounds.min.z;
    for(const child of held.children)child.position.z+=shift;
  }
  held.traverse((o) => { if (o.isMesh) o.userData.visualLayer = 'weapon'; });
  held.position.y = -.055; held.scale.setScalar(1.05);
  // Shafts point down the hand; axes reverse their cutting face without moving the grip.
  if (held.userData.kind === 'shield') {
    held.position.x = side === 'L' ? .14 : -.14;
    if (side === 'R') held.rotation.y = Math.PI;
  } else if (!held.userData.ranged) {
    const axe = ['starter-axe', 'greataxe', '2h1', 1, '1'].includes(held.userData.kind);
    held.rotation.set(Math.PI / 2, 0, axe ? -Math.PI / 2 : Math.PI / 2);
  }
  held.userData.grip = { position: held.position.clone(), quaternion: held.quaternion.clone() };
  return held;
}

// Slung across the back: the grip low on one side, the blade, barrel or bow's limbs up over the other shoulder.
const BACK_TILT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), .55);
const HIP_HANG = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - .25, 0, 0));
function backQuaternion(held) {
  const kind = held.userData.kind;
  if (kind === 'shield' || kind === 'buckler') return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
  // A bow's limbs lie flat against the back; anything else points its +Z (blade, barrel) up.
  const up = kind === 'bow' ? new THREE.Euler(0, Math.PI / 2, 0) : new THREE.Euler(-Math.PI / 2, 0, 0);
  return BACK_TILT.clone().multiply(new THREE.Quaternion().setFromEuler(up));
}

// Which set is in the hands: 'melee' (the main and off hand) or 'ranged' (a hunter's bow, gun or crossbow). The other
// set's main weapon is slung on the back and its off hand put away. The rig's weaponR / weaponL are the held ones.
export function holdWeapons(model, mode) {
  const u = model.userData, j = u.rig, sets = u.weaponSets;
  if (!sets || !sets[mode] || u.held === mode) return;
  u.held = mode;
  for (const [name, set] of Object.entries(sets)) {
    const inHand = name === mode;
    for (const side of ['R', 'L']) {
      const held = set[side];
      if (!held) continue;
      held.removeFromParent();
      if (inHand) {
        held.visible = true;
        held.position.copy(held.userData.grip.position); held.quaternion.copy(held.userData.grip.quaternion);
        j['wrist' + side].add(held);
      } else if (side === 'R' || held.userData.kind === 'shield') {
        held.visible = true;
        const ranged = held.userData.ranged;
        if (held.userData.kind === 'wand' || held.userData.kind === 'thrown') {
          // A wand or thrown weapon hangs at the right hip, pointing down.
          held.position.set(-.22, -.02, .03);
          held.quaternion.copy(HIP_HANG);
        } else {
          held.position.set(side === 'R' ? (ranged ? 0 : .16) : 0, ranged ? .22 : side === 'R' ? .02 : .2, -.24);
          held.quaternion.copy(backQuaternion(held));        }
        j.spine.add(held);
      } else { held.visible = false; j.spine.add(held); }
    }
    if (inHand) {
      j.weaponR = set.R || null; j.weaponL = set.L || null;
      u.twoHand = set.twoHand;
    }
  }
  for (const { fx } of Object.values(sets)) if (fx) { fx.flight.visible = fx.flash.visible = false; fx.released = false; }
  u.rangedEffects = sets[mode].fx || null;
  u.anim.mh = u.anim.oh = u.anim.ranged = 0;
}
