// Original Noggenfogger-inspired skeleton anatomy and small torn shorts;
// held equipment is attached separately by character-body.js.
import * as THREE from 'three';
import { armorHull, armorPlate } from './armor.js';

const group = () => new THREE.Group();
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
function ball(r, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = mesh(new THREE.SphereGeometry(r, 10, 7), mat);
  m.scale.set(sx, sy, sz); return at(m, x, y, z);
}
function rod(from, to, radius, mat) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a);
  const m = mesh(new THREE.CylinderGeometry(radius * .8, radius, delta.length(), 8), mat);
  m.position.copy(a.add(b).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return m;
}
function curve(points, radius, mat) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 12, radius, 6, false), mat);
}

export function dressSkeleton(j) {
  const bone = new THREE.MeshStandardMaterial({ color: 0xc7bea0, roughness: .9, envMapIntensity: .15 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x948871, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x211e1b, roughness: 1 });
  const eye = new THREE.MeshStandardMaterial({ color: 0xaca65b, emissive: 0x55501a, emissiveIntensity: .35, roughness: 1 });
  // Open pelvis and a visible spine: the spaces between bones remain empty.
  j.hips.add(curve([[-.16, -.03, 0], [-.13, .08, -.03], [0, .1, -.06], [.13, .08, -.03], [.16, -.03, 0]], .035, bone));
  for (const s of [-1, 1]) {
    j.hips.add(curve([[s * .16, 0, 0], [s * .16, -.08, .05], [s * .07, -.12, .09], [0, -.06, .09]], .025, bone));
    j.hips.add(at(armorPlate([[0, -.03], [s * .08, .06], [s * .1, -.02], [s * .045, -.08]], .018, bone, .008), s * .07, .01, -.035));
  }
  for (let i = 0; i < 9; i++) j.spine.add(ball(.035, i % 2 ? edge : bone, 0, .015 + i * .06, -.08, 1, .65, .85));
  // Six paired ribs curve from the spine around each side to the sternum.
  for (let i = 0; i < 6; i++) {
    const y = .16 + i * .055, width = .16 + Math.sin(i / 5 * Math.PI) * .05;
    for (const s of [-1, 1]) j.spine.add(curve([[0, y + .035, -.08], [s * width, y + .015, -.035], [s * width, y - .025, .095], [s * .065, y - .055, .16], [s * .015, y - .025, .15]], .014, bone));
  }
  j.spine.add(rod([0, .14, .15], [0, .44, .15], .021, bone));
  for (const s of [-1, 1]) {
    j.spine.add(curve([[0, .46, .105], [s * .12, .49, .08], [s * .28, .44, 0]], .025, bone));
    j.spine.add(at(armorPlate([[0, 0], [s * .14, .03], [s * .11, -.15]], .018, bone, .01), s * .08, .43, -.105));
    const k = s < 0 ? 'L' : 'R';
    for (const [node, length, radius] of [[j['thigh' + k], .44, .035], [j['shoulder' + k], .29, .026]]) {
      node.add(rod([0, -.035, 0], [0, -length + .025, 0], radius, bone));
      node.add(ball(radius * 1.4, bone, 0, 0, 0), ball(radius * 1.25, bone, 0, -length + .01, 0));
    }
    for (const [node, length, radius] of [[j['knee' + k], .4, .022], [j['elbow' + k], .26, .016]]) {
      node.add(rod([-.022, -.02, 0], [-.016, -length, 0], radius, bone), rod([.024, -.02, -.005], [.016, -length, .01], radius * .75, bone));
      node.add(ball(radius * 1.8, bone, 0, .005, .015));
    }
    const wrist = j['wrist' + k];
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * .018;
      wrist.add(rod([x, 0, 0], [x, -.067, .005], .008, bone));
      wrist.add(curve([[x, -.067, .005], [x, -.095, .025], [x, -.08, .055], [x, -.063, .045]], .008, bone));
    }
    wrist.add(curve([[-.04, -.01, 0], [-.055, -.05, .04], [-.03, -.065, .055]], .01, bone));
    const ankle = j['ankle' + k];
    ankle.add(ball(.038, bone, 0, -.02, .015));
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * .025, len = .19 - Math.abs(i - 1) * .018;
      ankle.add(rod([x * .4, -.03, 0], [x, -.07, len * .7], .013, bone));
      ankle.add(rod([x, -.07, len * .7], [x, -.075, len], .012, bone));
    }
  }
  j.neck.add(rod([0, 0, 0], [0, .15, .01], .028, bone));
  const skull = group();
  skull.add(armorHull([[-.09, .14, .10], [.02, .19, .13], [.17, .18, .12], [.23, .10, .07], [.24, .015, .02]], bone));
  for (const s of [-1, 1]) {
    skull.add(at(armorPlate([[-.055, -.04], [.055, -.04], [.06, .035], [0, .052], [-.065, .035]], .008, dark, .008), s * .085, .02, .126));
    skull.add(ball(.018, eye, s * .085, .015, .143, 1, .7, .4));
    skull.add(rod([s * .15, -.02, .10], [s * .12, -.105, .12], .025, bone));
    skull.add(at(armorPlate([[-.065, 0], [.065, .01], [.055, .035], [-.05, .035]], .02, bone, .005), s * .085, .065, .126));
  }
  skull.add(at(armorPlate([[0, .025], [.027, -.025], [-.027, -.025]], .007, dark, .002), 0, -.055, .12));
  skull.add(curve([[-.13, -.08, .07], [-.115, -.17, .1], [0, -.185, .14], [.115, -.17, .1], [.13, -.08, .07]], .026, bone));
  // Teeth frame an open mouth rather than painting a smile across the skull.
  for (let i = -3; i <= 3; i++) {
    skull.add(at(mesh(new THREE.BoxGeometry(.021, .03, .027), bone), i * .026, -.11, .124));
    skull.add(at(mesh(new THREE.BoxGeometry(.019, .022, .025), bone), i * .024, -.162, .138));
  }
  j.head.add(skull);

  // This form's own shorts are independent of race, class and equipped clothing.
  const cloth = new THREE.MeshStandardMaterial({ color: 0x202d49, roughness: 1, envMapIntensity: .12, side: THREE.DoubleSide });
  const waistband = armorHull([[-.105, .205, .14], [.075, .19, .12]], cloth);
  waistband.name = 'noggenfogger-shorts';
  waistband.userData.visualLayer = 'noggenfogger-shorts';
  j.hips.add(waistband);
  for (const side of ['L', 'R']) {
    const geo = new THREE.CylinderGeometry(.104, .097, .18, 14, 1, true);
    const pos = geo.attributes.position;
    // Alternating torn points around an open hem, with a higher notch on either leg.
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) {
      const angle = Math.atan2(pos.getX(i), pos.getZ(i));
      const n = ((Math.round(angle / (Math.PI * 2) * 14) % 14) + 14) % 14;
      pos.setY(i, -.09 + (n % 3 === 0 ? .035 : n % 3 === 1 ? -.018 : .008));
    }
    geo.computeVertexNormals();
    const leg = at(mesh(geo, cloth), 0, -.105, 0);
    leg.name = 'noggenfogger-short-leg-' + side;
    leg.userData.visualLayer = 'noggenfogger-shorts';
    j['thigh' + side].add(leg);
  }
}
