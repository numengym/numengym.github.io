// A vertex normal of zero length lights as NaN, and a NaN pixel flickers black as the camera moves. Recomputing a
// geometry's normals leaves such vertices wherever its triangles cancel out or collapse (a sphere's poles once welded,
// a blade's tip, a model's seams), so every recompute goes through this guard: a vertex left without a normal takes
// the direction from the geometry's centre to it, or straight up. Imported first (main.js), before any model is built.
import * as THREE from 'three';

export function repairNormals(geometry) {
  const n = geometry.attributes.normal;
  const p = geometry.attributes.position;
  if (!n || !p) return 0;
  let fixed = 0;
  let center = null;
  const v = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    const x = n.getX(i);
    const y = n.getY(i);
    const z = n.getZ(i);
    const len = x * x + y * y + z * z;
    if (len > 1e-12 && Number.isFinite(len)) continue;
    if (!center) {
      geometry.computeBoundingBox();
      center = geometry.boundingBox.getCenter(new THREE.Vector3());
    }
    v.set(p.getX(i), p.getY(i), p.getZ(i)).sub(center);
    if (v.lengthSq() < 1e-12 || !Number.isFinite(v.lengthSq())) v.set(0, 1, 0);
    v.normalize();
    n.setXYZ(i, v.x, v.y, v.z);
    fixed++;
  }
  if (fixed) n.needsUpdate = true;
  return fixed;
}

const compute = THREE.BufferGeometry.prototype.computeVertexNormals;
THREE.BufferGeometry.prototype.computeVertexNormals = function computeVertexNormals() {
  compute.call(this);
  repairNormals(this);
};
