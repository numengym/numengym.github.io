// Shared humanoid rig. Race anatomy, starter clothing, and transformations are cosmetic layers.
// Joint offsets intentionally match animateRig() and the existing arena weapon trails.
import * as THREE from 'three';
import { armorHull, armorPlate } from './armor.js';
import { buildHead } from './heads.js';
import { weapon, shield, isTwoHandedWeapon } from './weapons.js';
import { dressSkeleton } from './skeleton.js';

const group = (x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };
const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: .93, envMapIntensity: .2 });
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
function ellipsoid(r, mat, sx = 1, sy = 1, sz = 1, detail = false) {
  const m = mesh(new THREE.SphereGeometry(r, detail ? 24 : 12, detail ? 16 : 9), mat); m.scale.set(sx, sy, sz); return m;
}
function segment(len, top, bottom, mat) {
  const g = group();
  g.add(at(mesh(new THREE.CylinderGeometry(top, bottom, len, 10), mat), 0, -len / 2, 0), ellipsoid(top, mat));
  return g;
}
function strip(points, mat, width = .025) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 8, width, 5, false), mat);
}

// Continuous clothed torso surface; the silhouette changes without adding separate chest pieces.
function fittedTorso(look, mat) {
  const profile = [[0, .18, .12], [.12, .166, .115], [.23, .19, .13], [.35, .232, .15], [.44, .235, .13], [.49, .20, .105], [.53, .075, .068]];
  const positions = [], indices = [], sides = 48, rows = 41;
  for (let row = 0; row < rows; row++) {
    const y = row / (rows - 1) * .53;
    let n = 0;
    while (n < profile.length - 2 && y > profile[n + 1][0]) n++;
    const a = profile[n], b = profile[n + 1], t = (y - a[0]) / (b[0] - a[0]);
    const before = profile[Math.max(0, n - 1)], after = profile[Math.min(profile.length - 1, n + 2)];
    const smooth = (axis) => {
      const m0 = (b[axis] - before[axis]) / (b[0] - before[0]) * (b[0] - a[0]);
      const m1 = (after[axis] - a[axis]) / (after[0] - a[0]) * (b[0] - a[0]);
      return (2 * t ** 3 - 3 * t ** 2 + 1) * a[axis] + (t ** 3 - 2 * t ** 2 + t) * m0 + (-2 * t ** 3 + 3 * t ** 2) * b[axis] + (t ** 3 - t ** 2) * m1;
    };
    const width = smooth(1), depth = smooth(2);
    for (let i = 0; i < sides; i++) {
      const angle = i / sides * Math.PI * 2, x = Math.sin(angle) * width, front = Math.cos(angle);
      const lobes = Math.exp(-Math.pow((x - .105) / .09, 2)) + Math.exp(-Math.pow((x + .105) / .09, 2));
      const contour = lobes * Math.exp(-Math.pow((y - .325) / (look.gnome ? .15 : .115), 2));
      const z = front * depth + (front > 0 ? look.bust * contour * Math.pow(front, .6) : 0);
      positions.push(x, y, z);
    }
  }
  for (let row = 0; row < rows - 1; row++) for (let i = 0; i < sides; i++) {
    const a = row * sides + i, b = row * sides + (i + 1) % sides;
    indices.push(a, b, a + sides, b, b + sides, a + sides);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices); geo.computeVertexNormals();
  return mesh(geo, mat);
}

function dressStarter(j, look, outfit) {
  const skin = material(look.skin), cloth = material(outfit.cloth), pants = material(outfit.pants), leather = material(outfit.leather);
  const seam = material(new THREE.Color(outfit.leather).multiplyScalar(1.3));
  const harness = outfit.top === 'harness';
  const pelvis = ellipsoid(.17, pants, look.female ? 1.36 : 1.25, look.female ? (look.gnome ? 1.2 : .95) : .75, look.female ? 1.08 : .85, look.female);
  if (look.seat) {
    // Shape the trousers as one surface, keeping the hip and leg pivots unchanged.
    const p = pelvis.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (z > 0) p.setZ(i, z * .55);
      if (z < 0) {
        const lobes = Math.exp(-Math.pow((x - .07) / .085, 2)) + Math.exp(-Math.pow((x + .07) / .085, 2));
        const roundness = lobes * Math.exp(-Math.pow((y + .025) / .12, 2)) * Math.pow(-z / .17, 2);
        p.setZ(i, z - look.seat * roundness);
      }
    }
    pelvis.geometry.computeVertexNormals();
  }
  j.hips.add(at(pelvis, 0, -.015, 0));
  j.spine.add(look.female ? fittedTorso(look, harness ? skin : cloth) : armorHull([[0, .17, .12], [.15, .215, .14], [.36, .28, .17], [.47, .25, .14], [.53, .085, .075]], harness ? skin : cloth));
  if (harness) {
    // Bare chest under two work-worn leather straps, following the chest volume front and back.
    for (const s of [-1, 1]) {
      j.spine.add(strip([[s * .10, .015, .128], [s * .14, .2, .161], [s * .19, .40, .171], [s * .19, .49, .07], [s * .16, .44, -.15], [s * .1, .02, -.13]], leather, .025));
    }
    j.spine.add(at(armorPlate([[-.20, -.025], [.20, -.025], [.20, .025], [-.20, .025]], .01, leather, .002), 0, .17, .145));
  } else {
    // Simple collar and a narrow shirt opening with lacing.
    j.spine.add(at(armorPlate([[-.045, .05], [.045, .05], [.025, -.09], [-.025, -.09]], .008, leather, .001), 0, .46, .116));
    for (let i = 0; i < 3; i++) j.spine.add(at(mesh(new THREE.BoxGeometry(.036, .007, .01), seam), 0, .43 - i * .025, .133));
  }
  const belt = mesh(new THREE.CylinderGeometry(.18, .18, .075, 12), leather);
  belt.scale.z = .76; j.hips.add(at(belt, 0, .07, 0));
  j.hips.add(at(armorPlate([[-.045, -.03], [.045, -.03], [.045, .03], [-.045, .03]], .015, seam, .003), 0, .075, .145));
  if (outfit.top === 'robe') {
    const robe = armorHull([[-.76, .31, .22], [-.36, .25, .18], [.03, .18, .14]], cloth);
    j.hips.add(robe);
    j.hips.add(at(armorPlate([[-.025, 0], [.025, 0], [.035, -.73], [-.035, -.73]], .008, seam, .001), 0, .01, .22));
  }
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'L' : 'R';
    j['thigh' + k].add(segment(.44, .10, .076, pants));
    j['knee' + k].add(segment(.4, .076, .055, outfit.barefoot || look.hooves ? skin : pants));
    const foot = j['ankle' + k];
    if (look.hooves) {
      const hoof = material(0x302b24);
      for (const t of [-1, 1]) foot.add(at(armorHull([[-.105, .045, .12, .04], [-.06, .05, .115, .04], [.035, .033, .07]], hoof), t * .05, 0, 0));
    } else {
      foot.add(at(ellipsoid(.09, outfit.barefoot ? skin : leather, 1, .7, 1.7), 0, -.043, .065));
      if (!outfit.barefoot) {
        foot.add(at(mesh(new THREE.CylinderGeometry(.083, .075, .17, 10), leather), 0, .07, 0));
        foot.add(at(mesh(new THREE.CylinderGeometry(.087, .087, .035, 10), seam), 0, .145, 0));
      } else for (const x of [-.045, .045]) foot.add(at(ellipsoid(.027, skin, 1, .8, 1.8), x, -.065, .19));
    }
    j['shoulder' + k].add(segment(.29, look.female ? .07 : .095, look.female ? .05 : .065, skin));
    if (!look.female) j['shoulder' + k].add(at(ellipsoid(.077, skin, 1, 1.3, 1), 0, -.13, .02));
    if (outfit.top === 'shirt' || outfit.top === 'robe') j['shoulder' + k].add(at(mesh(new THREE.CylinderGeometry(look.female ? .076 : .10, look.female ? .07 : .092, .15, 12), cloth), 0, -.045, 0));
    j['elbow' + k].add(segment(.26, look.female ? .05 : .065, look.female ? .039 : .047, skin));
    j['elbow' + k].add(at(mesh(new THREE.CylinderGeometry(look.female ? .046 : .055, look.female ? .043 : .052, .075, 10), leather), 0, -.215, 0));
    const wrist = j['wrist' + k];
    wrist.add(at(ellipsoid(.055, skin, 1, 1.15, .75), 0, -.045, .01));
    for (let i = 0; i < 4; i++) wrist.add(at(ellipsoid(.013, skin, .9, 1.1, 1.45), (i - 1.5) * .024, -.072, .036));
  }
  const neckLength = look.gnome ? .22 : .14;
  j.neck.add(at(mesh(new THREE.CylinderGeometry(.05, .065, neckLength, 14), skin), 0, neckLength / 2 - .02, 0));
  j.head.add(buildHead(look, j.hair));
  if (look.tail) {
    const tail = group(0, -.05, -.15); tail.rotation.x = .6;
    tail.add(segment(.5, .026, .017, skin), at(ellipsoid(.055, material(0x302319), 1, 1.4, 1), 0, -.51, 0));
    j.hips.add(tail); j.hair.push({ obj: tail, base: tail.rotation.clone(), amp: .3 });
  }
  if (look.wings) {
    const featherMat = material(look.wings);
    for (const s of [-1, 1]) {
      const wing = group(s * .07, .35, -.15);
      for (let i = 0; i < 7; i++) {
        const length = .55 - i * .04;
        const feather = armorPlate([[0, .05], [.045, 0], [.04, -length * .7], [0, -length], [-.04, -length * .7], [-.04, 0]], .008, featherMat, .003);
        feather.position.set(s * (.12 + i * .08), .1 + i * .05, -i * .015);
        feather.rotation.z = s * (.55 + i * .15); wing.add(feather);
      }
      j.spine.add(wing); j['wing' + (s < 0 ? 'L' : 'R')] = wing;
    }
  }
}

export function buildHumanoid(look, { outfit, gear = null, offHand = 'weapon', transform = null, classId = 'warrior' }) {
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
    const k = s < 0 ? 'L' : 'R';
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
  const oh = twoHand ? null : gear ? gear.oh : outfit.weapon;
  for (const [side, kind] of [['R', mh], ['L', oh]]) {
    const held = side === 'L' && offHand === 'shield' && !twoHand ? shield() : kind == null ? null : weapon(kind);
    if (!held) continue;
    held.traverse((o) => { if (o.isMesh) o.userData.visualLayer = 'weapon'; });
    held.position.y = -.08; held.scale.setScalar(1.05);
    j['wrist' + side].add(held); j['weapon' + side] = held;
  }
  body.scale.set(anatomy.width, anatomy.height, anatomy.width);
  const hs = anatomy.head || 1;
  j.head.scale.set(hs / anatomy.width, hs / anatomy.height, hs / anatomy.width);
  root.userData = {
    rig: j, body, hunch: anatomy.hunch || 0, twoHand, classId, transform: skeleton ? 'noggenfogger' : null,
    radius: .5, height: 2 * anatomy.height,
    anim: { walk: 0, move: 0, mh: 0, oh: 0, spin: 0, hit: 0, dead: false, death: 0, cheer: 0, combat: 0, t: Math.random() * 10 },
  };
  return root;
}
