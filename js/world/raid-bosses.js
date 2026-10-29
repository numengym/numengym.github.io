// The classic raid bosses' own looks on the Brute's rig, so they still swing, walk and fall as it does: pieces of their
// own fixed to its joints (world/character-body.js: head, neck, spine, hips, shoulder/elbow/wrist and the weapon hands).
//   Ragnaros: a burning lord rising from a skirt of lava, a crown and beard of flame, Sulfuras in his hand.
//   Lucifron: a flamewaker in a dark robe with curled horns and shadow burning in his hands.
//   Magmadar: a core hound, hunched, a mane of obsidian spikes down the back, lava cracks and claws.
//   Broodlord Lashlayer: a dragonkin with wings, swept horns and a tail.
//   Patchwerk: a swollen, stitched abomination with a meat hook.
import * as THREE from 'three';

const mat = (color, emissive = 0x000000, glow = 0) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: glow, roughness: 0.75, flatShading: true });

function piece(parent, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = null) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  if (scale) m.scale.set(...scale);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// The Brute's own weapon put away (a boss with a weapon of its own).
function emptyHand(j, side) {
  const w = j[`weapon${side}`] || j[`wrist${side}`];
  if (w) for (const c of w.children) c.visible = false;
  return w;
}

// A ring of flame cones (a crown, a mane).
function flames(parent, n, radius, height, y, colors = [0xff8a1c, 0xffd23a]) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const h = height * (0.7 + 0.3 * Math.sin(k * 2.3));
    piece(parent, new THREE.ConeGeometry(height * 0.28, h, 5), mat(colors[k % 2], colors[k % 2], 1.6),
      [Math.cos(a) * radius, y + h / 2, Math.sin(a) * radius], [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]);
  }
}

function horns(head, color, curl = 0.9, size = 1) {
  for (const s of [-1, 1]) {
    const h = piece(head, new THREE.TorusGeometry(0.11 * size, 0.035 * size, 6, 10, Math.PI * curl), mat(color), [s * 0.13, 0.12, -0.02], [0, s > 0 ? 0 : Math.PI, s * 0.6]);
    h.rotation.order = 'YXZ';
  }
}

const SHAPES = {
  ragnaros(model, j) {
    // Sulfuras: a long handle and a burning head.
    const hand = emptyHand(j, 'R');
    if (hand) {
      piece(hand, new THREE.CylinderGeometry(0.025, 0.03, 0.9, 6), mat(0x2a1a14), [0, -0.1, 0]);
      piece(hand, new THREE.BoxGeometry(0.34, 0.2, 0.2), mat(0x3a2418, 0xff5a10, 1.2), [0, -0.58, 0]);
    }
    flames(j.head, 7, 0.12, 0.28, 0.16);                                   // a crown of fire
    flames(j.head, 5, 0.07, 0.18, -0.2, [0xff5a10, 0xff9a2a]);            // a beard of fire
    for (const s of ['L', 'R']) flames(j[`shoulder${s}`], 4, 0.06, 0.2, 0.02);
    // He rises from the lava: a molten skirt in place of legs.
    piece(j.hips, new THREE.CylinderGeometry(0.3, 0.44, 0.9, 10), mat(0x3a1206, 0xff4a08, 0.55), [0, -0.42, 0]);
    model.traverse((o) => { if (o.isMesh && o.material && o.material.emissive && o.material.color.getHex() === model.userData.skin) { o.material.emissive.setHex(0xff3a08); o.material.emissiveIntensity = 0.45; } });
  },
  lucifron(model, j) {
    horns(j.head, 0x1a1210, 1.1, 1.2);
    // A dark robe from the hips down, and shadow burning in his hands.
    piece(j.hips, new THREE.ConeGeometry(0.42, 0.95, 10, 1, true), mat(0x1c0a12), [0, -0.42, 0], [Math.PI, 0, 0]);
    emptyHand(j, 'R');
    for (const s of ['L', 'R']) {
      piece(j[`wrist${s}`], new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: 0x7a3cff, emissive: 0x7a3cff, emissiveIntensity: 2, transparent: true, opacity: 0.85 }), [0, -0.1, 0]);
    }
  },
  magmadar(model, j) {
    // A mane of obsidian spikes down the back, lava glowing between.
    for (let k = 0; k < 6; k++) {
      piece(j.spine, new THREE.ConeGeometry(0.05, 0.26 - k * 0.025, 5), mat(0x161210), [0, 0.45 - k * 0.08, -0.16 - k * 0.01], [-0.9, 0, 0]);
      piece(j.spine, new THREE.BoxGeometry(0.2, 0.015, 0.02), mat(0x7a2006, 0xff5a10, 1.5), [0, 0.42 - k * 0.08, -0.14]);
    }
    piece(j.head, new THREE.BoxGeometry(0.14, 0.1, 0.24), mat(model.userData.skin || 0xc8601c), [0, -0.02, 0.18]); // a hound's muzzle
    for (const s of ['L', 'R']) {
      const hand = emptyHand(j, s) || j[`wrist${s}`];
      for (let k = -1; k <= 1; k++) piece(j[`wrist${s}`], new THREE.ConeGeometry(0.018, 0.14, 4), mat(0x1a1410), [k * 0.035, -0.12, 0.03], [Math.PI, 0, 0]);
      if (hand !== j[`wrist${s}`]) hand.visible = true;
    }
  },
  broodlord(model, j) {
    horns(j.head, 0x2a2420, 0.6, 1.4);
    // Wings: two membranes from the back.
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.9, 0.35);
    shape.lineTo(0.75, -0.25);
    shape.lineTo(0.45, -0.1);
    shape.lineTo(0.3, -0.45);
    shape.lineTo(0, -0.15);
    const wing = new THREE.ShapeGeometry(shape);
    const membrane = new THREE.MeshStandardMaterial({ color: 0x2a1828, side: THREE.DoubleSide, roughness: 0.8 });
    for (const s of [-1, 1]) piece(j.spine, wing, membrane, [s * 0.08, 0.38, -0.14], [0.3, s > 0 ? -0.5 : Math.PI + 0.5, 0], [1, 1, 1]);
    piece(j.hips, new THREE.ConeGeometry(0.08, 0.9, 6), mat(model.userData.skin || 0x2a2e6a), [0, -0.05, -0.45], [-1.2, 0, 0]); // a tail
  },
  patchwerk(model, j) {
    // A swollen gut, stitched shut, and a meat hook.
    const skin = mat(model.userData.skin || 0x8c9a72);
    piece(j.spine, new THREE.SphereGeometry(0.3, 12, 10), skin, [0, 0.18, 0.1], [0, 0, 0], [1.1, 1, 0.9]);
    for (let k = 0; k < 5; k++) piece(j.spine, new THREE.BoxGeometry(0.16, 0.012, 0.012), mat(0x1a1a14), [0, 0.06 + k * 0.06, 0.38]);
    piece(j.spine, new THREE.BoxGeometry(0.012, 0.3, 0.012), mat(0x1a1a14), [0, 0.18, 0.39]);
    const hand = emptyHand(j, 'R');
    if (hand) {
      piece(hand, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat(0x3a3028), [0, -0.05, 0]);
      piece(hand, new THREE.TorusGeometry(0.12, 0.022, 6, 12, Math.PI * 1.3), mat(0x6a6a70), [0.06, -0.35, 0], [0, 0, Math.PI / 2]);
    }
  },
};

// Gives a boss model its own pieces (a key of SHAPES).
export function shapeBoss(model, kind, skin) {
  const j = model && model.userData.rig;
  if (!j || !SHAPES[kind]) return;
  model.userData.skin = skin;
  SHAPES[kind](model, j);
}
