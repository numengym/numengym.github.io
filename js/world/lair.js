// Onyxia's Lair: the cave the Onyxia encounter is fought in, in yards. Onyxia lies at the origin facing +Z, at the
// north end of a wide lava cave that is not round: an uneven wall, whelp caves bulging out east and west, the
// entrance tunnel to the south. The floor is flat where the raid fights and slopes up towards the wall and into the
// whelp caves. Cracks of lava run across the floor (Phase 3's eruptions). The arena reads heightAt and clamp to put
// everyone on the ground and keep them inside; Environment.buildLair builds the meshes.
import * as THREE from 'three';

const CENTER = { x: 0, z: 15 }; // the middle of the cave, where Onyxia hovers in Phase 2
const HALF = { x: 31, z: 28 };   // the cave's half-widths before the bulges
const WALL_FOOT = 3.2;           // how high the floor climbs at the wall
const CAVE_DEPTH = 9;            // how far the whelp caves bulge out
const CAVE_WIDTH = 0.32;         // their half-width, in radians around the centre
const TUNNEL_WIDTH = 0.18;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
// Bulges: the whelp caves due east and west, the entrance tunnel due south (+Z).
const bump = (theta, at, width) => smooth(-1, 0, -Math.abs(angleDiff(theta, at)) / width);

// The wall's distance from the centre in direction theta (0 = +X, PI/2 = +Z).
function wallRadius(theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  let r = 1 / Math.sqrt((c * c) / (HALF.x * HALF.x) + (s * s) / (HALF.z * HALF.z));
  r += 1.6 * Math.sin(5 * theta + 1.3) + 0.9 * Math.sin(11 * theta + 0.4) + 0.5 * Math.sin(23 * theta);
  r += CAVE_DEPTH * (bump(theta, 0, CAVE_WIDTH) + bump(theta, Math.PI, CAVE_WIDTH));
  r += 6 * bump(theta, Math.PI / 2, TUNNEL_WIDTH);
  return r;
}

// The whelp caves' mouths and backs, and where the whelps come out (east, west).
export const WHELP_CAVES = [
  { side: 'east', back: { x: CENTER.x + HALF.x + CAVE_DEPTH - 3, z: CENTER.z }, mouth: { x: CENTER.x + HALF.x - 4, z: CENTER.z } },
  { side: 'west', back: { x: CENTER.x - HALF.x - CAVE_DEPTH + 3, z: CENTER.z }, mouth: { x: CENTER.x - HALF.x + 4, z: CENTER.z } },
];

// Lava cracks over the floor (each a line of points): Phase 3 erupts them.
export const LAVA_CRACKS = [
  [[-4, 6], [-9, 11], [-12, 17], [-18, 21], [-22, 24]],
  [[4, 6], [8, 10], [13, 14], [17, 19], [23, 22]],
  [[-1, 10], [1, 16], [-2, 22], [1, 28], [-1, 35]],
  [[-14, 4], [-17, 9], [-23, 12]],
  [[14, 4], [18, 8], [24, 11]],
  [[-8, 28], [-4, 32], [-6, 38]],
  [[8, 28], [5, 33], [7, 38]],
];

// How far a point lies from the centre, as a share of the wall's distance that way (1 at the wall).
function wallShare(x, z) {
  const dx = x - CENTER.x;
  const dz = z - CENTER.z;
  return Math.hypot(dx, dz) / wallRadius(Math.atan2(dz, dx));
}

export const LAIR = {
  center: CENTER,
  // Onyxia's resting place, and the raid's spots: the tank in front of her, you at her side.
  onyxia: { x: 0, z: 0 },
  start: { x: 9.5, z: -1 },
  hover: { x: CENTER.x, z: CENTER.z + 2, height: 13 },
  // The floor's height: flat where the fight is, rising towards the wall and up into the whelp caves, a little uneven.
  heightAt(x, z) {
    const u = wallShare(x, z);
    const rise = WALL_FOOT * smooth(0.55, 1, u) + Math.max(0, u - 1) * 6;
    const lumps = 0.35 * Math.sin(x * 0.31 + 1.1) * Math.cos(z * 0.27 + 0.4) * smooth(0.35, 0.8, u);
    return rise + lumps;
  },
  // Inside the wall (with `margin` yards to spare).
  inside(x, z, margin = 0) {
    const dx = x - CENTER.x;
    const dz = z - CENTER.z;
    return Math.hypot(dx, dz) <= wallRadius(Math.atan2(dz, dx)) - margin;
  },
  // Moves a position back inside the wall.
  clamp(p, margin = 1.2) {
    const dx = p.x - CENTER.x;
    const dz = p.z - CENTER.z;
    const d = Math.hypot(dx, dz);
    const max = wallRadius(Math.atan2(dz, dx)) - margin;
    if (d > max) { p.x = CENTER.x + (dx / d) * max; p.z = CENTER.z + (dz / d) * max; }
    return p;
  },
  // A random spot on the open floor, for the whelps to run past and the eruptions to hit.
  randomFloor(rnd = Math.random) {
    for (let k = 0; k < 40; k++) {
      const x = CENTER.x + (rnd() * 2 - 1) * HALF.x * 0.7;
      const z = CENTER.z + (rnd() * 2 - 1) * HALF.z * 0.7;
      if (wallShare(x, z) < 0.6) return { x, z };
    }
    return { ...CENTER };
  },
  // The nearest point of a crack to (x, z), and how far it is.
  crackDistance(crack, x, z) {
    let best = Infinity;
    for (let k = 1; k < crack.length; k++) {
      const [ax, az] = crack[k - 1];
      const [bx, bz] = crack[k];
      const vx = bx - ax;
      const vz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
      best = Math.min(best, Math.hypot(x - (ax + vx * t), z - (az + vz * t)));
    }
    return best;
  },
};

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function canvasTexture(size, repeat, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// The cave's meshes, into root: the floor on its heights, the rock wall up to a dark ceiling, the whelp caves with
// their eggs, the tunnel, the lava cracks and pools, and fires. Returns the flickering lights for the environment to
// animate ({ flame, light, phase }).
export function buildLair(root, q) {
  const rnd = seeded(61);
  const torches = [];

  // The floor: dark volcanic rock, scorched, a grid displaced by heightAt.
  const rockTex = canvasTexture(512, 14, (ctx, s) => {
    ctx.fillStyle = '#2a2120';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 5000; i++) {
      const g = 30 + rnd() * 45;
      ctx.fillStyle = rnd() < 0.015 ? `rgb(${150 + g},${50 + g * 0.4},20)` : `rgb(${g + 8},${g * 0.85},${g * 0.8})`;
      ctx.fillRect(rnd() * s, rnd() * s, 2 + rnd() * 4, 2 + rnd() * 3);
    }
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.2 + rnd() * 0.3})`;
      ctx.lineWidth = 1 + rnd() * 2;
      ctx.beginPath();
      let x = rnd() * s;
      let y = rnd() * s;
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  });
  const size = 150;
  const seg = q.shadows ? 150 : 110;
  const floorGeo = new THREE.PlaneGeometry(size, size, seg, seg);
  floorGeo.rotateX(-Math.PI / 2);
  floorGeo.translate(CENTER.x, 0, CENTER.z);
  const pos = floorGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, LAIR.heightAt(pos.getX(i), pos.getZ(i)));
  floorGeo.computeVertexNormals();
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.95, color: 0xb8a8a0 }));
  floor.receiveShadow = true;
  root.add(floor);

  // The wall: rings of rock around the wall line, leaning in towards a ceiling; jagged, flat-shaded.
  const N = 200;
  const rings = [
    { out: 0, y: (r, a) => LAIR.heightAt(CENTER.x + Math.cos(a) * r, CENTER.z + Math.sin(a) * r) - 0.5 },
    { out: 1.5, y: () => 6 },
    { out: 0.5, y: () => 12 },
    { out: -3, y: () => 19 },
    { out: -10, y: () => 24 },
  ];
  const wallPos = [];
  for (let ri = 0; ri < rings.length; ri++) {
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = wallRadius(a) + 0.6 + rings[ri].out + (ri ? (rnd() - 0.5) * 2.2 : 0);
      wallPos.push(CENTER.x + Math.cos(a) * r, rings[ri].y(r, a) + (ri ? (rnd() - 0.5) * 1.6 : 0), CENTER.z + Math.sin(a) * r);
    }
  }
  const wallIdx = [];
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let i = 0; i < N; i++) {
      const a = ri * (N + 1) + i;
      const b = a + N + 1;
      wallIdx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3));
  wallGeo.setIndex(wallIdx);
  wallGeo.computeVertexNormals();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a2e2a, roughness: 1, flatShading: true, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.receiveShadow = true;
  root.add(wall);
  // The ceiling: a dark dome over the cave.
  const ceiling = new THREE.Mesh(new THREE.SphereGeometry(48, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x1c1514, roughness: 1, side: THREE.BackSide, flatShading: true }));
  ceiling.scale.set(1, 0.45, 0.95);
  ceiling.position.set(CENTER.x, 18, CENTER.z);
  root.add(ceiling);

  // Boulders and stalagmites along the foot of the wall.
  const boulderMat = new THREE.MeshStandardMaterial({ color: 0x45362f, roughness: 1, flatShading: true });
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2;
    if (Math.abs(angleDiff(a, 0)) < CAVE_WIDTH * 0.8 || Math.abs(angleDiff(a, Math.PI)) < CAVE_WIDTH * 0.8 || Math.abs(angleDiff(a, Math.PI / 2)) < TUNNEL_WIDTH) continue;
    const r = wallRadius(a) - 0.5 - rnd() * 2.5;
    const x = CENTER.x + Math.cos(a) * r;
    const z = CENTER.z + Math.sin(a) * r;
    const tall = rnd() < 0.4;
    const m = tall
      ? new THREE.Mesh(new THREE.ConeGeometry(0.6 + rnd() * 0.8, 2.5 + rnd() * 4, 6), boulderMat)
      : new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + rnd() * 1.6, 0), boulderMat);
    m.position.set(x, LAIR.heightAt(x, z) + (tall ? 1.2 : 0.3), z);
    m.rotation.set(rnd(), rnd() * 6, rnd() * 0.3);
    m.castShadow = q.shadows;
    root.add(m);
  }
  // Hanging stalactites from the ceiling.
  for (let i = 0; i < 40; i++) {
    const p = LAIR.randomFloor(rnd);
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.5 + rnd() * 0.9, 3 + rnd() * 5, 6), boulderMat);
    m.rotation.x = Math.PI;
    m.position.set(p.x, 17 + rnd() * 3, p.z);
    root.add(m);
  }

  // Fire: a flame and a flickering light.
  const fire = (x, y, z, color, intensity, reach, scale = 1) => {
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.3 * scale, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.4) }));
    flame.position.set(x, y, z);
    root.add(flame);
    const light = new THREE.PointLight(color, intensity, reach, 1.8);
    light.position.set(x, y + 0.6, z);
    root.add(light);
    torches.push({ flame, light, phase: rnd() * 10 });
  };

  // The lava: glowing cracks over the floor, and pools at the foot of the wall.
  const lavaMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a10).multiplyScalar(1.6) });
  for (const crack of LAVA_CRACKS) {
    for (let k = 1; k < crack.length; k++) {
      const [ax, az] = crack[k - 1];
      const [bx, bz] = crack[k];
      const len = Math.hypot(bx - ax, bz - az);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, len + 0.3), lavaMat);
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      m.position.set(mx, LAIR.heightAt(mx, mz) + 0.03, mz);
      m.rotation.y = Math.atan2(bx - ax, bz - az);
      root.add(m);
    }
    const [mx, mz] = crack[Math.floor(crack.length / 2)];
    fire(mx, LAIR.heightAt(mx, mz) + 0.2, mz, 0xff5a1a, 3, 9, 0.6);
  }
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.5;
    const r = wallRadius(a) - 2.5;
    const x = CENTER.x + Math.cos(a) * r;
    const z = CENTER.z + Math.sin(a) * r;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.4 + rnd(), 16), lavaMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, LAIR.heightAt(x, z) + 0.05, z);
    root.add(pool);
    fire(x, LAIR.heightAt(x, z) + 0.4, z, 0xff4a10, 5, 12, 0.9);
  }

  // The whelp caves: eggs in nests at the back, a dim glow.
  const eggMat = new THREE.MeshStandardMaterial({ color: 0x2c2a33, roughness: 0.6, metalness: 0.1 });
  const nestMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 });
  for (const cave of WHELP_CAVES) {
    for (let i = 0; i < 26; i++) {
      const x = cave.back.x + (rnd() - 0.5) * 7 * (cave.side === 'east' ? -1 : 1) * 0.6;
      const z = cave.back.z + (rnd() - 0.5) * 12;
      const y = LAIR.heightAt(x, z);
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), eggMat);
      egg.scale.set(1, 1.35, 1);
      egg.position.set(x, y + 0.35, z);
      egg.rotation.z = (rnd() - 0.5) * 0.6;
      root.add(egg);
      if (i % 4 === 0) {
        const nest = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.25, 6, 12), nestMat);
        nest.rotation.x = Math.PI / 2;
        nest.position.set(x, y + 0.15, z);
        root.add(nest);
      }
    }
    fire(cave.back.x, LAIR.heightAt(cave.back.x, cave.back.z) + 1.5, cave.back.z, 0xff7a30, 4, 14, 0.7);
  }

  // Braziers by Onyxia's resting place and at the tunnel.
  for (const [x, z] of [[-9, -4], [9, -4], [-6, 40], [6, 40]]) {
    const y = LAIR.heightAt(x, z);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.35, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0x30302e, metalness: 0.5, roughness: 0.6 }));
    bowl.position.set(x, y + 1.3, z);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.1, 8), bowl.material);
    stand.position.set(x, y + 0.55, z);
    root.add(bowl, stand);
    fire(x, y + 1.8, z, 0xff8a3c, 6, 18, 1.4);
  }
  return torches;
}
