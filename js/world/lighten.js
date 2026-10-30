// Fewer draw calls for a character the player does not play (an NPC raider): a character is built of some sixty small
// meshes, each a draw call (twice with shadows), so a 20-player raid costs over two thousand. The meshes that move
// together (the plain children of one joint, with one material) become one mesh; the joints the rig animates stay, and
// so does everything the model points to (its weapons, which go from hand to back, and their effects, which come and
// go). Optionally it casts no shadow.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Every Object3D the model's data points to (rig joints, weapon sets, effects), found a few levels deep.
function referenced(model) {
  const joints = new Set(Object.values(model.userData.rig || {}).filter((o) => o && o.isObject3D));
  const whole = new Set(); // kept with all below them
  const seen = new Set();
  const walk = (v, depth) => {
    if (!v || typeof v !== 'object' || depth > 4 || seen.has(v)) return;
    seen.add(v);
    if (v.isObject3D) {
      // A piece that comes and goes (a weapon, an effect) is kept whole; one that holds joints (the body) is structure.
      let holdsJoint = false;
      v.traverse((x) => { if (joints.has(x)) holdsJoint = true; });
      if (holdsJoint) joints.add(v);
      else if (v !== model) whole.add(v);
      return;
    }
    for (const x of Array.isArray(v) ? v : Object.values(v)) walk(x, depth + 1);
  };
  for (const [k, v] of Object.entries(model.userData)) if (k !== 'rig') walk(v, 0);
  return { joints, whole };
}

// A simpler copy of a geometry, or null: the round shapes rebuilt with a third of their segments, a custom one thinned
// by snapping its corners to a grid a fourteenth of its size and dropping the triangles that close up.
const SIMPLER = {
  SphereGeometry: (p) => new THREE.SphereGeometry(p.radius, Math.max(8, Math.round(p.widthSegments / 2)), Math.max(6, Math.round(p.heightSegments / 2)), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength),
  CylinderGeometry: (p) => new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, Math.max(6, Math.round(p.radialSegments / 2)), p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength),
  TorusGeometry: (p) => new THREE.TorusGeometry(p.radius, p.tube, Math.max(3, Math.round(p.radialSegments / 2)), Math.max(6, Math.round(p.tubularSegments / 2)), p.arc),
};
const simpler = new Map(); // geometry uuid -> its simpler copy (models share geometries)
function simplify(g) {
  if (simpler.has(g.uuid)) return simpler.get(g.uuid);
  let out = null;
  const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
  if (SIMPLER[g.type] && g.parameters && tris > 64) out = SIMPLER[g.type](g.parameters);
  else if (g.type === 'BufferGeometry' && tris > 300 && !Object.keys(g.morphAttributes || {}).length) out = thinned(g);
  // A rebuilt shape must be where the old one was (a geometry moved or scaled after it was made is left alone).
  if (out && g.parameters) {
    g.computeBoundingBox();
    out.computeBoundingBox();
    if (g.boundingBox.min.distanceTo(out.boundingBox.min) + g.boundingBox.max.distanceTo(out.boundingBox.max) > 0.02 * g.boundingBox.getSize(new THREE.Vector3()).length()) out = null;
  }
  simpler.set(g.uuid, out);
  return out;
}
function thinned(g) {
  g.computeBoundingBox();
  const size = g.boundingBox.getSize(new THREE.Vector3());
  const cell = Math.max(size.x, size.y, size.z) / 14;
  if (!(cell > 0)) return null;
  const out = g.clone();
  const pos = out.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, Math.round(pos.getX(i) / cell) * cell, Math.round(pos.getY(i) / cell) * cell, Math.round(pos.getZ(i) / cell) * cell);
  }
  const same = (a, b) => pos.getX(a) === pos.getX(b) && pos.getY(a) === pos.getY(b) && pos.getZ(a) === pos.getZ(b);
  const n = out.index ? out.index.count : pos.count;
  const at = (k) => (out.index ? out.index.getX(k) : k);
  const keep = [];
  for (let k = 0; k < n; k += 3) {
    const [a, b, c] = [at(k), at(k + 1), at(k + 2)];
    if (!same(a, b) && !same(b, c) && !same(a, c)) keep.push(a, b, c);
  }
  if (keep.length > n * 0.85) { out.dispose(); return null; } // too little gained to look worse
  out.setIndex(keep);
  out.computeVertexNormals();
  return out;
}

export function lightenModel(model, { shadows = false } = {}) {
  const { joints, whole } = referenced(model);
  const kept = new Set();
  for (const o of whole) o.traverse((x) => kept.add(x));
  // Fewer triangles first: an NPC is seen from a few yards away at least.
  model.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh) return;
    const s = simplify(o.geometry);
    if (s) o.geometry = s;
  });
  const parents = [];
  model.traverse((o) => { if (!kept.has(o)) parents.push(o); });
  for (const p of parents) {
    const groups = new Map();
    for (const m of p.children) {
      if (!m.isMesh || m.isSkinnedMesh || m.children.length || kept.has(m) || joints.has(m) || !m.visible || Array.isArray(m.material)) continue;
      const g = m.geometry;
      if (!g || !g.isBufferGeometry || Object.keys(g.morphAttributes || {}).length) continue;
      const key = `${m.material.uuid}|${Object.keys(g.attributes).sort().join()}|${g.index ? 'i' : 'n'}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const geos = list.map((m) => { m.updateMatrix(); return m.geometry.clone().applyMatrix4(m.matrix); });
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, list[0].material);
      mesh.castShadow = list.some((m) => m.castShadow);
      mesh.receiveShadow = list.some((m) => m.receiveShadow);
      for (const m of list) p.remove(m);
      p.add(mesh);
    }
  }
  if (!shadows) model.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return model;
}
