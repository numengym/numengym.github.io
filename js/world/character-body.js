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
  // Weapon types still follow the imported gear. Cosmetics never alter the character sheet.
  const mh = gear ? gear.mh : outfit.weapon;
  const twoHand = isTwoHandedWeapon(mh);
  const oh = twoHand ? null : gear ? gear.oh : outfit.offhand;
  for (const [side, kind] of [['R', mh], ['L', oh]]) {
    const held = side === 'L' && offHand === 'shield' && !twoHand ? shield() : kind == null ? null : weapon(kind);
    if (!held) continue;
    if (twoHand && !held.userData.ranged) {
      // Grip long shafts near their butt: a rear handle must not extend through the ribs.
      const bounds=new THREE.Box3().setFromObject(held),shift=Math.max(0,-.14-bounds.min.z);
      for(const child of held.children)child.position.z+=shift;
    }
    held.traverse((o) => { if (o.isMesh) o.userData.visualLayer = 'weapon'; });
    held.position.y = -.055; held.scale.setScalar(1.05);
    // Long axes follow the grip; blade/axe edges face forward, not out to the side.
    if (held.userData.kind === 'shield') {
      held.position.x = side === 'L' ? .14 : -.14;
      if (side === 'R') held.rotation.y = Math.PI;
    } else if (!held.userData.ranged) held.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    j['wrist' + side].add(held); j['weapon' + side] = held;
  }
  body.scale.set(anatomy.width, anatomy.height, anatomy.width);
  const hs = anatomy.head || 1;
  j.head.scale.set(hs / anatomy.width, hs / anatomy.height, hs / anatomy.width);
  root.userData = {
    rig: j, body, hunch: anatomy.hunch || 0, twoHand, classId, bodyType, transform: skeleton ? 'noggenfogger' : null,
    rangedEffects: j.weaponR?.userData.ranged ? createRangedEffects(body,j.weaponR) : null,
    radius: .5, height: 2 * anatomy.height,
    anim: { walk: 0, move: 0, mh: 0, oh: 0, ranged: 0, spin: 0, hit: 0, dead: false, death: 0, cheer: 0, combat: 0, t: Math.random() * 10 },
  };
  return root;
}
