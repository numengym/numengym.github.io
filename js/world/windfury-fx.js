// Windfury Totem's extra attack (spell-fx.js windfury): three pale ribbons of wind spiral up around the character it
// procs on and fade within 0.8 s. Only a look: the attack itself is the engine's (Unit.maybeWindfury).
import * as THREE from 'three';

const LIFE = 0.8;    // seconds
const STEPS = 40;    // segments along a ribbon
const TURNS = 1.2;   // turns a ribbon makes on its way up

// One ribbon: a strip that winds up and in around the character, widest in the middle, starting a third of a turn
// after the one before.
function ribbon(arm, radius, height) {
  const vertices = [];
  const indices = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const angle = t * Math.PI * 2 * TURNS + arm * Math.PI * 2 / 3;
    const r = radius * (1 - 0.3 * t);
    const width = Math.sin(t * Math.PI) * 0.07;
    for (const side of [-1, 1]) vertices.push(Math.cos(angle) * r, 0.12 + t * height * 0.8 + side * width, Math.sin(angle) * r);
    if (i < STEPS) {
      const n = i * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry;
}

// model: the character (or a druid's form). Returns a spell-fx item: { kind, model, update(dt) -> keep?, dispose() }.
export function windfuryEffect(scene, model) {
  const group = new THREE.Group();
  group.name = 'windfury-proc';
  const height = model.userData.height || 1.5;
  const radius = Math.max(0.35, Math.min(0.8, height * 0.32));
  const materials = [];
  for (let arm = 0; arm < 3; arm++) {
    const material = new THREE.MeshBasicMaterial({ color: arm === 1 ? 0xd4c7a1 : 0xe7f5f3, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    materials.push(material);
    group.add(new THREE.Mesh(ribbon(arm, radius, height), material));
  }
  scene.add(group);
  const at = new THREE.Vector3();
  let elapsed = 0;
  return {
    kind: 'windfury',
    model,
    group,
    update(dt) {
      elapsed += dt;
      // Gone with its character (dead, or left the arena).
      if (elapsed >= LIFE || !model.parent || (model.userData.anim && model.userData.anim.dead)) return false;
      group.position.copy(model.getWorldPosition(at));
      group.rotation.y = -elapsed * 12;
      group.scale.setScalar(0.9 + elapsed * 0.3);
      const opacity = Math.min(1, elapsed / 0.06) * Math.max(0, 1 - elapsed / LIFE);
      for (const m of materials) m.opacity = opacity * 0.7;
      return true;
    },
    dispose() {
      scene.remove(group);
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    },
  };
}
