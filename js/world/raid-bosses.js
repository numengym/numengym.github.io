// The classic raid bosses' own looks on the Brute's rig, so they still swing, walk and fall as it does: pieces of their
// own fixed to its joints (world/character-body.js: head, neck, spine, hips, shoulder/elbow/wrist and the weapon hands).
//   Ragnaros: a burning lord rising from a skirt of lava, a crown and beard of flame, Sulfuras in his hand.
//   Lucifron: a flamewaker in a dark robe with curled horns and shadow burning in his hands.
//   Magmadar: a core hound, hunched, a mane of obsidian spikes down the back, lava cracks and claws.
//   Broodlord Lashlayer: a dragonkin with wings, swept horns and a tail.
//   Patchwerk: a swollen, stitched abomination with a meat hook.
//   Zul'Gurub: Venoxis with a cobra's hood and a serpent's tail, Jeklik with bat wings, Mar'li with a spider's legs and
//   body, Thekal striped like a tiger, Mandokir with a warlord's crest and axe, and Hakkar, a winged serpent.
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
    flames(j.head, 9, 0.13, 0.38, 0.14);                                   // a crown of fire
    flames(j.head, 6, 0.08, 0.24, -0.22, [0xff5a10, 0xff9a2a]);           // a beard of fire
    horns(j.head, 0x2a1408, 0.8, 1.5);
    for (const s of ['L', 'R']) flames(j[`shoulder${s}`], 5, 0.07, 0.28, 0.02);
    // Fire pouring down his back like a mane.
    for (let k = 0; k < 6; k++) piece(j.spine, new THREE.ConeGeometry(0.08, 0.34, 5), mat(0xff7a1c, 0xff6a10, 1.5), [0, 0.5 - k * 0.07, -0.16], [-2.3 + k * 0.05, 0, 0]);
    // He rises from the lava: a molten column in place of legs, and the lava swirling at its foot.
    piece(j.hips, new THREE.CylinderGeometry(0.32, 0.62, 1.05, 12), mat(0x3a1206, 0xff4a08, 0.55), [0, -0.48, 0]);
    piece(j.hips, new THREE.CircleGeometry(1.05, 24), mat(0xff5a10, 0xff4a08, 1.3), [0, -0.94, 0], [-Math.PI / 2, 0, 0]);
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
    // A core hound on four legs: the Brute's body hidden, the hound hung on its rig (hips and head), so it still breathes,
    // turns, lunges and falls with it.
    model.traverse((o) => { if (o.isMesh) o.visible = false; });
    const skin = mat(model.userData.skin || 0xc8601c);
    const crust = mat(0x1e1410);
    const magma = mat(0x7a2006, 0xff5a10, 1.5);
    const body = new THREE.Group();
    j.hips.add(body);
    piece(body, new THREE.BoxGeometry(0.62, 0.5, 1.6), skin, [0, 0.05, -0.05]);
    piece(body, new THREE.BoxGeometry(0.72, 0.6, 0.6), skin, [0, 0.12, 0.62]);                          // the chest
    for (let k = 0; k < 6; k++) piece(body, new THREE.BoxGeometry(0.64, 0.03, 0.05), magma, [0, -0.08 + (k % 2) * 0.14, -0.66 + k * 0.26]); // lava cracks
    for (let k = 0; k < 9; k++) piece(body, new THREE.ConeGeometry(0.06, 0.34 - Math.abs(k - 3) * 0.02, 5), crust, [0, 0.4, -0.72 + k * 0.19], [-0.55, 0, 0]); // obsidian spikes
    for (const [x, z] of [[-0.25, 0.62], [0.25, 0.62], [-0.25, -0.64], [0.25, -0.64]]) {
      piece(body, new THREE.CylinderGeometry(0.1, 0.08, 0.82, 6), skin, [x, -0.5, z]);
      piece(body, new THREE.BoxGeometry(0.17, 0.08, 0.26), crust, [x, -0.9, z + 0.06]);                 // paws and claws
    }
    piece(body, new THREE.ConeGeometry(0.08, 0.9, 6), skin, [0, 0.1, -1.2], [-1.9, 0, 0]);              // the tail
    const head = new THREE.Group();
    head.position.set(0, -0.55, 0.88);
    j.head.add(head);
    piece(head, new THREE.BoxGeometry(0.44, 0.38, 0.5), skin, [0, 0, 0]);
    piece(head, new THREE.BoxGeometry(0.32, 0.17, 0.38), skin, [0, -0.12, 0.38]);                      // the muzzle
    piece(head, new THREE.BoxGeometry(0.3, 0.06, 0.32), magma, [0, -0.22, 0.36]);                      // a glowing maw
    for (const s of [-1, 1]) {
      piece(head, new THREE.SphereGeometry(0.045, 6, 5), mat(0xffd040, 0xffb020, 2), [s * 0.13, 0.08, 0.25]);
      piece(head, new THREE.ConeGeometry(0.07, 0.34, 5), crust, [s * 0.17, 0.27, -0.1], [-0.4, 0, s * 0.35]);
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
    for (const s of [-1, 1]) piece(j.spine, wing, membrane, [s * 0.08, 0.38, -0.14], [0.3, s > 0 ? -0.5 : Math.PI + 0.5, 0], [1.4, 1.4, 1]);
    piece(j.hips, new THREE.ConeGeometry(0.09, 1.1, 6), mat(model.userData.skin || 0x2a2e6a), [0, -0.05, -0.5], [-1.2, 0, 0]); // a tail
    piece(j.head, new THREE.BoxGeometry(0.15, 0.11, 0.26), mat(model.userData.skin || 0x3a4aa0), [0, -0.03, 0.2]); // a dragon's snout
    for (let k = 0; k < 6; k++) piece(j.spine, new THREE.ConeGeometry(0.04, 0.16, 4), mat(0x1a1420), [0, 0.5 - k * 0.08, -0.15], [-1.1, 0, 0]); // spines
  },
  patchwerk(model, j) {
    // A swollen gut, stitched shut, and a meat hook.
    const skin = mat(model.userData.skin || 0x8c9a72);
    piece(j.spine, new THREE.SphereGeometry(0.38, 14, 12), skin, [0, 0.16, 0.12], [0, 0, 0], [1.25, 1.05, 1]);
    for (let k = 0; k < 6; k++) piece(j.spine, new THREE.BoxGeometry(0.2, 0.014, 0.014), mat(0x1a1a14), [0, 0.0 + k * 0.07, 0.49]);
    piece(j.spine, new THREE.BoxGeometry(0.014, 0.42, 0.014), mat(0x1a1a14), [0, 0.18, 0.5]);
    piece(j.spine, new THREE.SphereGeometry(0.2, 10, 8), skin, [0, 0.5, -0.12], [0, 0, 0], [1.4, 0.9, 1]); // a hunched back
    j.head.scale.multiplyScalar(0.8); // a small head on the bulk
    const cleaver = emptyHand(j, 'L');
    if (cleaver) {
      piece(cleaver, new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), mat(0x3a3028), [0, -0.05, 0]);
      piece(cleaver, new THREE.BoxGeometry(0.03, 0.26, 0.3), mat(0x7a7a80, 0x000000, 0), [0, -0.3, 0.1]);
    }
    const hand = emptyHand(j, 'R');
    if (hand) {
      piece(hand, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat(0x3a3028), [0, -0.05, 0]);
      piece(hand, new THREE.TorusGeometry(0.12, 0.022, 6, 12, Math.PI * 1.3), mat(0x6a6a70), [0.06, -0.35, 0], [0, 0, Math.PI / 2]);
    }
  },

  // ---- Zul'Gurub: the Gurubashi's priests and their god ----

  // High Priest Venoxis: a troll priest of the snake god, a cobra's hood behind his head and a serpent's tail.
  venoxis(model, j) {
    troll(j, 0x1e3a2a);
    const scale = mat(0x2e6a3a);
    piece(j.head, new THREE.SphereGeometry(0.3, 12, 8), mat(0x3a7a4a), [0, 0.06, -0.12], [0, 0, 0], [1.35, 1.15, 0.22]); // the hood
    for (let k = 0; k < 4; k++) piece(j.head, new THREE.BoxGeometry(0.05, 0.05, 0.01), mat(0xd8c04a), [(k % 2 ? 1 : -1) * 0.14, 0.14 - Math.floor(k / 2) * 0.16, -0.06]);
    piece(j.hips, new THREE.ConeGeometry(0.44, 0.95, 10, 1, true), mat(0x1e4a2a), [0, -0.42, 0], [Math.PI, 0, 0]); // the robe
    for (let k = 0; k < 11; k++) piece(j.hips, new THREE.SphereGeometry(0.2 - k * 0.013, 8, 6), scale, [Math.sin(k * 0.8) * 0.28, -0.82, -0.3 - k * 0.2]); // the tail
    const hand = emptyHand(j, 'R');
    if (hand) {
      piece(hand, new THREE.CylinderGeometry(0.02, 0.025, 1.0, 6), mat(0x3a2a1a), [0, -0.1, 0]);
      piece(hand, new THREE.SphereGeometry(0.08, 10, 8), mat(0x5aff6a, 0x3aff4a, 1.8), [0, -0.64, 0]);
    }
  },
  // High Priestess Jeklik: a troll priestess of the bat god, bat wings and ears, eyes glowing red.
  jeklik(model, j) {
    troll(j, 0x2a2018);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1.1, 0.45);
    shape.lineTo(0.95, -0.15);
    shape.lineTo(0.7, -0.05);
    shape.lineTo(0.55, -0.45);
    shape.lineTo(0.3, -0.25);
    shape.lineTo(0.15, -0.5);
    shape.lineTo(0, -0.2);
    const wing = new THREE.ShapeGeometry(shape);
    const membrane = new THREE.MeshStandardMaterial({ color: 0x3a2418, side: THREE.DoubleSide, roughness: 0.85 });
    for (const s of [-1, 1]) piece(j.spine, wing, membrane, [s * 0.08, 0.4, -0.14], [0.25, s > 0 ? -0.45 : Math.PI + 0.45, 0], [1.5, 1.5, 1]);
    for (const s of [-1, 1]) {
      piece(j.head, new THREE.ConeGeometry(0.07, 0.3, 4), mat(0x3a2a20), [s * 0.12, 0.24, -0.02], [0, 0, -s * 0.35]);
      piece(j.head, new THREE.SphereGeometry(0.03, 6, 5), mat(0xff3020, 0xff2010, 2.5), [s * 0.06, 0.04, 0.15]);
    }
  },
  // High Priestess Mar'li: a troll priestess of the spider god, eight legs and a spider's body behind her.
  marli(model, j) {
    troll(j, 0x3a2a4a);
    const chitin = mat(0x2a1a3a);
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const leg = new THREE.Group();
      leg.rotation.y = (side > 0 ? 0 : Math.PI) + ((i % 4) - 1.5) * 0.42;
      j.hips.add(leg);
      piece(leg, new THREE.CylinderGeometry(0.035, 0.045, 0.65, 5), chitin, [0.28, 0.18, 0], [0, 0, -1.0]);
      piece(leg, new THREE.CylinderGeometry(0.02, 0.035, 1.38, 5), chitin, [0.7, -0.33, 0], [0, 0, 0.22]);
    }
    piece(j.hips, new THREE.SphereGeometry(0.46, 12, 10), mat(0x3a2448), [0, 0.12, -0.62], [0, 0, 0], [1, 0.85, 1.25]); // the abdomen
    piece(j.hips, new THREE.BoxGeometry(0.12, 0.26, 0.02), mat(0xc02030, 0xa01020, 0.8), [0, 0.3, -0.9], [0.8, 0, 0]); // its mark
  },
  // High Priest Thekal: a troll priest of the tiger god, striped orange, with claws.
  thekal(model, j) {
    troll(j, 0x1a1410);
    const stripe = mat(0x1a1410);
    for (let k = 0; k < 5; k++) for (const z of [0.17, -0.17]) piece(j.spine, new THREE.BoxGeometry(0.34, 0.03, 0.02), stripe, [0, 0.08 + k * 0.1, z], [0, 0, (k % 2 ? 0.25 : -0.25)]);
    for (const s of ['L', 'R']) {
      for (let k = 0; k < 3; k++) piece(j[`wrist${s}`], new THREE.ConeGeometry(0.02, 0.18, 4), mat(0xe8e0c8), [(k - 1) * 0.04, -0.14, 0.04], [Math.PI, 0, 0]);
    }
  },
  // Bloodlord Mandokir: a huge troll warlord with a red crest and a two-handed axe.
  mandokir(model, j) {
    troll(j, 0xc02a1a, 1.4);
    for (const s of ['L', 'R']) {
      piece(j[`shoulder${s}`], new THREE.SphereGeometry(0.13, 8, 6), mat(0x4a3a2a), [0, 0.06, 0], [0, 0, 0], [1.2, 0.7, 1.2]);
      piece(j[`shoulder${s}`], new THREE.ConeGeometry(0.04, 0.2, 5), mat(0xd8d0b8), [0, 0.18, 0]);
    }
    const hand = emptyHand(j, 'R');
    if (hand) {
      piece(hand, new THREE.CylinderGeometry(0.025, 0.03, 1.1, 6), mat(0x3a2418), [0, -0.15, 0]);
      for (const s of [-1, 1]) piece(hand, new THREE.BoxGeometry(0.03, 0.34, 0.26), mat(0x8a8a90), [0, -0.62, s * 0.13], [s * 0.2, 0, 0]);
    }
  },
  // Hakkar the Soulflayer: the blood god, a winged serpent rearing up, crested with feathers. Hung on the Brute's rig
  // (its body on the hips, its head on the head) so it still breathes, turns, strikes and falls with it.
  hakkar(model, j) {
    model.traverse((o) => { if (o.isMesh) o.visible = false; });
    const skin = mat(model.userData.skin || 0x9a1e1e);
    const belly = mat(0xc8a060);
    const body = new THREE.Group();
    j.hips.add(body);
    for (let k = 0; k < 14; k++) { // the coils on the ground
      const a = (k / 14) * Math.PI * 1.8;
      piece(body, new THREE.SphereGeometry(0.26, 10, 8), skin, [Math.cos(a) * 0.6, -0.8, Math.sin(a) * 0.6 - 0.2]);
    }
    for (let k = 0; k < 9; k++) { // rearing up to the head
      const t = k / 8;
      piece(body, new THREE.SphereGeometry(0.27 - t * 0.06, 10, 8), k % 3 === 1 ? belly : skin, [0, -0.6 + t * 1.45, -0.2 + Math.sin(t * Math.PI) * 0.22]);
    }
    // Feathered wings from the back.
    const colors = [0x2a5ab8, 0xc82a2a, 0xe8b82a];
    for (const s of [-1, 1]) {
      for (let k = 0; k < 9; k++) {
        const a = 0.2 + k * 0.16;
        piece(body, new THREE.BoxGeometry(0.08, 1.2 - k * 0.07, 0.02), mat(colors[k % 3]), [s * (0.25 + Math.cos(a) * 0.5), 0.55 + Math.sin(a) * 0.35, -0.25], [0, 0, s * (a - 1.6)]);
      }
    }
    const head = new THREE.Group();
    head.position.set(0, 0, 0.05);
    j.head.add(head);
    piece(head, new THREE.BoxGeometry(0.34, 0.24, 0.5), skin, [0, 0, 0.1]);
    piece(head, new THREE.BoxGeometry(0.28, 0.08, 0.36), belly, [0, -0.14, 0.18]); // the jaw
    for (const s of [-1, 1]) {
      piece(head, new THREE.SphereGeometry(0.04, 8, 6), mat(0xff2010, 0xff1008, 3), [s * 0.12, 0.06, 0.28]);
      piece(head, new THREE.ConeGeometry(0.025, 0.12, 4), mat(0xf0e8d0), [s * 0.08, -0.12, 0.34], [Math.PI, 0, 0]); // fangs
    }
    for (let k = 0; k < 7; k++) piece(head, new THREE.ConeGeometry(0.05, 0.5, 4), mat(colors[k % 3]), [(k - 3) * 0.05, 0.3, -0.12], [-0.6, 0, (k - 3) * 0.12]); // the crest
  },
};

// A Gurubashi troll's face on the Brute: tusks and a crest of hair (size: a warlord's bigger one).
function troll(j, hair, size = 1) {
  for (const s of [-1, 1]) piece(j.head, new THREE.ConeGeometry(0.025 * size, 0.16 * size, 5), mat(0xece4cc), [s * 0.07, -0.06, 0.15], [-0.5, 0, s * 0.3]);
  for (let k = 0; k < 6; k++) piece(j.head, new THREE.ConeGeometry(0.035 * size, (0.2 + (k % 2) * 0.06) * size, 4), mat(hair), [0, 0.2, 0.1 - k * 0.06], [-0.4 - k * 0.12, 0, 0]);
}

// Gives a boss model its own pieces (a key of SHAPES).
export function shapeBoss(model, kind, skin) {
  const j = model && model.userData.rig;
  if (!j || !SHAPES[kind]) return;
  model.userData.skin = skin;
  SHAPES[kind](model, j);
}
