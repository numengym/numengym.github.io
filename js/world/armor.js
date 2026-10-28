// Original sculpted plate shapes. Dimensions match the existing animated joint rig.
import * as THREE from 'three';

const place = (o, x, y, z) => { o.position.set(x, y, z); return o; };
function mesh(geo, material) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Beveled silhouette in the XY plane, with a raised face looking toward +Z.
export function armorPlate(points, depth, material, bevel = 0.012) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, bevelEnabled: true, bevelSegments: 1,
    bevelThickness: bevel, bevelSize: bevel, curveSegments: 1,
  });
  return mesh(geo, material);
}

// An eight-sided tailored solid: broad planes, clipped corners, no spherical chest.
export function armorHull(rings, material) {
  const contour = [[-0.7, 1], [-1, 0.55], [-1, -0.55], [-0.7, -1], [0.7, -1], [1, -0.55], [1, 0.55], [0.7, 1]];
  const p = [], indices = [];
  for (const [y, w, d, z = 0] of rings) for (const [x, f] of contour) p.push(x * w, y, f * d + z);
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < 8; i++) {
    const a = r * 8 + i, b = r * 8 + (i + 1) % 8, c = b + 8, d = a + 8;
    indices.push(a, d, b, b, d, c);
  }
  // End caps keep the joints closed when limbs swing.
  for (let i = 1; i < 7; i++) {
    indices.push(0, i, i + 1);
    const t = (rings.length - 1) * 8;
    indices.push(t, t + i + 1, t + i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const uv = [];
  for (let r = 0; r < rings.length; r++) for (let i = 0; i < 8; i++) uv.push(i / 7, r / (rings.length - 1));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  // Separate the broad planes for crisp, deliberately sculpted highlights.
  const flat = geo.toNonIndexed();
  geo.dispose();
  flat.computeVertexNormals();
  return mesh(flat, material);
}

