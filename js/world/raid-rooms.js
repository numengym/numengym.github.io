// The classic bosses' rooms, each about ten times the training ring's floor (its radius 22; these ~70 yards across
// each way): Molten Core's lava cavern, Blackwing Lair's dragonkin hall and Naxxramas's necropolis. Like Onyxia's lair
// (world/lair.js) each is a layout the arena reads (heightAt, inside, clamp: the floor and the walls, for you, the
// camera and a fear) and a build of its meshes; the boss stands at the origin facing +Z, the raid around it.
import * as THREE from 'three';

// Small deterministic random generator so a room looks the same every load.
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

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true, ...opts });
const glow = (color, k = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });

function add(root, geo, material, x, y, z, { rx = 0, ry = 0, rz = 0, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = shadow;
  m.receiveShadow = true;
  root.add(m);
  return m;
}

// A fire on a stand that flickers (environment.js animates `torches`).
function brazier(root, torches, x, z, color, look, { height = 1.4, size = 0.45 } = {}) {
  add(root, new THREE.CylinderGeometry(size * 0.9, size * 0.6, height, 8), mat(0x2a2624, { metalness: 0.4 }), x, height / 2, z);
  add(root, new THREE.CylinderGeometry(size * 1.3, size * 0.9, 0.3, 10), mat(0x3a332e, { metalness: 0.5 }), x, height + 0.1, z);
  const flame = add(root, new THREE.SphereGeometry(size * 0.9, 12, 8), glow(color, 2.4), x, height + 0.55, z, { shadow: false });
  const light = new THREE.PointLight(color, look.torch, 22, 1.7);
  light.position.set(x, height + 1.2, z);
  root.add(light);
  torches.push({ flame, light, phase: x * 0.37 + z * 0.11 });
}

// The raid around a boss at the origin: melee at its flanks, casters and hunters further back.
const RAID_SPOTS = [[-8, -2], [-8.5, 1.5], [-7.5, -4.5], [8.5, 2.5], [8, -4.5], [-16, 6], [-15, 11], [-20, 3], [16, 7], [15, 12], [20, 3]];

// A round room: the wall at radius r(theta).
function roundLayout(wallRadius, heightAt = () => 0) {
  return {
    center: { x: 0, z: 0 }, onyxia: { x: 0, z: 0 }, raidSpots: RAID_SPOTS, heightAt,
    inside(x, z, margin = 0) { return Math.hypot(x, z) <= wallRadius(Math.atan2(z, x)) - margin; },
    clamp(p, margin = 1.2) {
      const d = Math.hypot(p.x, p.z);
      const max = wallRadius(Math.atan2(p.z, p.x)) - margin;
      if (d > max) { p.x *= max / d; p.z *= max / d; }
      return p;
    },
    randomFloor(rnd = Math.random) { const a = rnd() * Math.PI * 2; const r = Math.sqrt(rnd()) * 40; return { x: Math.cos(a) * r, z: Math.sin(a) * r }; },
  };
}

// A hall: a rectangle of half-widths hx (x) and hz (z).
function hallLayout(hx, hz) {
  return {
    center: { x: 0, z: 0 }, onyxia: { x: 0, z: 0 }, raidSpots: RAID_SPOTS, heightAt: () => 0,
    inside(x, z, margin = 0) { return Math.abs(x) <= hx - margin && Math.abs(z) <= hz - margin; },
    clamp(p, margin = 1.2) {
      p.x = Math.max(-hx + margin, Math.min(hx - margin, p.x));
      p.z = Math.max(-hz + margin, Math.min(hz - margin, p.z));
      return p;
    },
    randomFloor(rnd = Math.random) { return { x: (rnd() * 2 - 1) * hx * 0.6, z: (rnd() * 2 - 1) * hz * 0.6 }; },
  };
}

// A floor plane with a texture.
function floor(root, w, d, tex, color = 0xffffff) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, color, roughness: 0.95 }));
  m.receiveShadow = true;
  root.add(m);
  return m;
}

// ---- Molten Core ----------------------------------------------------------------------------------------------

const MC_R = 70;
const mcWall = (a) => MC_R + 3 * Math.sin(5 * a + 1.3) + 1.8 * Math.sin(11 * a + 0.4) + Math.sin(23 * a);

function buildMoltenCore(root, q, look) {
  const rnd = seeded(41);
  const torches = [];
  // Volcanic rock, scorched, with glowing seams.
  const tex = canvasTexture(512, 18, (ctx, s) => {
    ctx.fillStyle = '#231a18';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 6000; i++) {
      const g = 25 + rnd() * 40;
      ctx.fillStyle = rnd() < 0.02 ? `rgb(${170 + g},${60 + g * 0.5},15)` : `rgb(${g + 10},${g * 0.8},${g * 0.7})`;
      ctx.fillRect(rnd() * s, rnd() * s, 2 + rnd() * 5, 2 + rnd() * 3);
    }
    ctx.strokeStyle = 'rgba(255,110,30,0.35)';
    for (let i = 0; i < 40; i++) {
      ctx.lineWidth = 1 + rnd() * 1.5;
      ctx.beginPath();
      let x = rnd() * s;
      let y = rnd() * s;
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 50; y += (rnd() - 0.5) * 50; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  });
  floor(root, MC_R * 2.4, MC_R * 2.4, tex, 0xc0a8a0);

  // The cavern wall: rock rings leaning in under a dark vault.
  const N = 220;
  const rings = [{ out: 0, y: -0.3 }, { out: 2, y: 9 }, { out: 0, y: 18 }, { out: -6, y: 27 }, { out: -18, y: 34 }];
  const pos = [];
  for (const ring of rings) {
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = mcWall(a) + 0.8 + ring.out + (ring.y > 0 ? (rnd() - 0.5) * 3 : 0);
      pos.push(Math.cos(a) * r, ring.y + (ring.y > 0 ? (rnd() - 0.5) * 2 : 0), Math.sin(a) * r);
    }
  }
  const idx = [];
  for (let ri = 0; ri < rings.length - 1; ri++) for (let i = 0; i < N; i++) { const a = ri * (N + 1) + i; const b = a + N + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  wallGeo.setIndex(idx);
  wallGeo.computeVertexNormals();
  add(root, wallGeo, mat(0x34241e, { side: THREE.DoubleSide }), 0, 0, 0, { shadow: false });
  const vault = add(root, new THREE.SphereGeometry(60, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x150d0b, { side: THREE.BackSide }), 0, 30, 0, { shadow: false });
  vault.scale.set(1, 0.35, 1);

  // Rivers of lava winding across the floor (clear of the fight in the middle) and Ragnaros's lake behind the boss.
  const lava = new THREE.MeshStandardMaterial({ color: 0xff5a10, emissive: 0xff4a08, emissiveIntensity: 1.4, roughness: 0.6 });
  for (const [x0, z0, dir] of [[-60, 30, 0.2], [60, 40, Math.PI - 0.3], [-55, -38, -0.4], [58, -30, Math.PI + 0.35]]) {
    let x = x0;
    let z = z0;
    let a = dir;
    for (let k = 0; k < 14; k++) {
      const len = 4 + rnd() * 2;
      const nx = x + Math.cos(a) * len;
      const nz = z + Math.sin(a) * len;
      if (Math.hypot(nx, nz) < 26) break;
      const seg = add(root, new THREE.BoxGeometry(len + 0.6, 0.06, 1.6 + rnd()), lava, (x + nx) / 2, 0.03, (z + nz) / 2, { ry: -a, shadow: false });
      seg.receiveShadow = false;
      x = nx; z = nz; a += (rnd() - 0.5) * 0.7;
    }
  }
  add(root, new THREE.CircleGeometry(16, 40), lava, 0, 0.04, -44, { rx: -Math.PI / 2, shadow: false });
  add(root, new THREE.RingGeometry(16, 19, 40), mat(0x1a100c), 0, 0.05, -44, { rx: -Math.PI / 2, shadow: false });
  const lakeLight = new THREE.PointLight(0xff6a20, 40, 60, 1.6);
  lakeLight.position.set(0, 6, -44);
  root.add(lakeLight);

  // The runes on the floor, glowing (the Flamewakers' wards), and stalagmites and obsidian spires along the wall.
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    add(root, new THREE.RingGeometry(2.4, 2.9, 6), glow(0xff7a2a, 1.6), Math.cos(a) * 34, 0.05, Math.sin(a) * 34, { rx: -Math.PI / 2, rz: a, shadow: false });
    add(root, new THREE.RingGeometry(1.1, 1.3, 3), glow(0xff9a3a, 1.8), Math.cos(a) * 34, 0.06, Math.sin(a) * 34, { rx: -Math.PI / 2, rz: -a, shadow: false });
  }
  const rock = mat(0x3a2a24);
  const obsidian = mat(0x120c10, { roughness: 0.4, metalness: 0.2 });
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2;
    const r = mcWall(a) - 1.5 - rnd() * 8;
    const tall = 3 + rnd() * 9;
    add(root, new THREE.ConeGeometry(0.8 + rnd() * 1.6, tall, 6), rnd() < 0.3 ? obsidian : rock, Math.cos(a) * r, tall / 2 - 0.2, Math.sin(a) * r);
  }
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    brazier(root, torches, Math.cos(a) * 28, Math.sin(a) * 28, look.torchColor || 0xff6a20, look);
  }
  return torches;
}

// ---- Blackwing Lair ---------------------------------------------------------------------------------------------

const BWL = { hx: 75, hz: 50, height: 24 };

function buildBlackwingLair(root, q, look) {
  const rnd = seeded(53);
  const torches = [];
  // Big dark flagstones with worn joints.
  const tex = canvasTexture(512, 10, (ctx, s) => {
    ctx.fillStyle = '#1c1a1c';
    ctx.fillRect(0, 0, s, s);
    const n = 8;
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
      const g = 30 + rnd() * 22;
      ctx.fillStyle = `rgb(${g + 4},${g},${g + 2})`;
      ctx.fillRect(i * s / n + 2, k * s / n + 2, s / n - 4, s / n - 4);
    }
    for (let i = 0; i < 2500; i++) { ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.25})`; ctx.fillRect(rnd() * s, rnd() * s, 2, 2); }
  });
  floor(root, BWL.hx * 2.2, BWL.hz * 2.2, tex, 0xd8d0d8);
  // Walls, ceiling, and the black dragonflight's red banners on them.
  const stone = mat(0x2e2a2e);
  const W = BWL.hx;
  const D = BWL.hz;
  const H = BWL.height;
  add(root, new THREE.BoxGeometry(W * 2 + 4, H, 2), stone, 0, H / 2, -D - 1, { shadow: false });
  add(root, new THREE.BoxGeometry(W * 2 + 4, H, 2), stone, 0, H / 2, D + 1, { shadow: false });
  add(root, new THREE.BoxGeometry(2, H, D * 2 + 4), stone, -W - 1, H / 2, 0, { shadow: false });
  add(root, new THREE.BoxGeometry(2, H, D * 2 + 4), stone, W + 1, H / 2, 0, { shadow: false });
  add(root, new THREE.BoxGeometry(W * 2 + 4, 1, D * 2 + 4), mat(0x121012), 0, H, 0, { shadow: false });
  const red = new THREE.MeshStandardMaterial({ color: look.emblem || 0xa01818, roughness: 0.9, side: THREE.DoubleSide });
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0a0c, roughness: 0.9, side: THREE.DoubleSide });
  for (let k = -3; k <= 3; k++) {
    for (const side of [-1, 1]) {
      const z = side * (D - 0.05);
      const b = add(root, new THREE.PlaneGeometry(4, 10), red, k * 20, H - 8, z, { ry: side > 0 ? Math.PI : 0, shadow: false });
      add(b, new THREE.CircleGeometry(1.2, 6), black, 0, 0.5, 0.02, { shadow: false });
    }
  }
  // Two rows of massive columns down the hall, braziers between them.
  const col = mat(0x3a3438);
  for (const x of [-60, -40, -20, 20, 40, 60]) {
    for (const z of [-30, 30]) {
      add(root, new THREE.CylinderGeometry(2.2, 2.6, H, 8), col, x, H / 2, z);
      add(root, new THREE.BoxGeometry(6, 1.6, 6), col, x, 0.8, z);
      add(root, new THREE.BoxGeometry(6, 1.6, 6), col, x, H - 0.8, z);
    }
  }
  for (const x of [-50, -30, 30, 50]) for (const z of [-30, 30]) brazier(root, torches, x, z, look.torchColor || 0xff5030, look, { height: 1.6, size: 0.55 });
  for (const [x, z] of [[-14, -16], [14, -16], [-14, 16], [14, 16]]) brazier(root, torches, x, z, look.torchColor || 0xff5030, look);
  // Clutches of black dragon eggs in the far corners.
  const egg = mat(0x2a1a2e, { roughness: 0.5, emissive: 0x3a0a2a, emissiveIntensity: 0.4, flatShading: false });
  for (const [cx, cz] of [[-62, -40], [62, -40], [-62, 40], [62, 40]]) {
    for (let i = 0; i < 9; i++) {
      const e = add(root, new THREE.SphereGeometry(0.9, 12, 10), egg, cx + (rnd() - 0.5) * 9, 1, cz + (rnd() - 0.5) * 6);
      e.scale.set(1, 1.35, 1);
    }
  }
  return torches;
}

// ---- Naxxramas (the Construct Quarter) --------------------------------------------------------------------------

const NAXX = { hx: 62, hz: 62, height: 26 };

function buildNaxxramas(root, q, look) {
  const rnd = seeded(67);
  const torches = [];
  // A floor of dark iron grates.
  const tex = canvasTexture(512, 16, (ctx, s) => {
    ctx.fillStyle = '#1a201c';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#2c3630';
    ctx.lineWidth = 6;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * s / 8, 0); ctx.lineTo(i * s / 8, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * s / 8); ctx.lineTo(s, i * s / 8); ctx.stroke();
    }
    for (let i = 0; i < 3000; i++) { const g = 20 + rnd() * 30; ctx.fillStyle = `rgba(${g},${g + 12},${g + 4},0.6)`; ctx.fillRect(rnd() * s, rnd() * s, 2, 2); }
  });
  floor(root, NAXX.hx * 2.2, NAXX.hz * 2.2, tex, 0xa8b8ac);
  const W = NAXX.hx;
  const D = NAXX.hz;
  const H = NAXX.height;
  const wall = mat(0x2c3430, { metalness: 0.3 });
  for (const [x, z, w, d] of [[0, -D - 1, W * 2 + 4, 2], [0, D + 1, W * 2 + 4, 2], [-W - 1, 0, 2, D * 2 + 4], [W + 1, 0, 2, D * 2 + 4]]) {
    add(root, new THREE.BoxGeometry(w, H, d), wall, x, H / 2, z, { shadow: false });
  }
  add(root, new THREE.BoxGeometry(W * 2 + 4, 1, D * 2 + 4), mat(0x0e1210), 0, H, 0, { shadow: false });
  // Gothic buttresses along the walls with pointed arches between, and the green glow of the necropolis.
  const rib = mat(0x3a4440, { metalness: 0.35 });
  for (let k = -5; k <= 5; k++) {
    for (const [x, z, ry] of [[k * 11, -D + 1.2, 0], [k * 11, D - 1.2, 0], [-W + 1.2, k * 11, Math.PI / 2], [W - 1.2, k * 11, Math.PI / 2]]) {
      add(root, new THREE.BoxGeometry(1.6, H, 2.4), rib, x, H / 2, z, { ry, shadow: false });
      const arch = add(root, new THREE.ConeGeometry(4.2, 7, 4), rib, x, H - 5, z, { ry: ry + Math.PI / 4, shadow: false });
      arch.scale.set(1, 1, 0.2);
    }
  }
  // Pools of slime and the channels feeding them.
  const slime = new THREE.MeshStandardMaterial({ color: 0x4aff5a, emissive: 0x2aff4a, emissiveIntensity: 1.1, roughness: 0.3 });
  for (const [x, z, r] of [[-38, -38, 9], [38, -38, 9], [-38, 38, 8], [38, 38, 8]]) {
    add(root, new THREE.CircleGeometry(r, 32), slime, x, 0.04, z, { rx: -Math.PI / 2, shadow: false });
    add(root, new THREE.RingGeometry(r, r + 1.4, 32), mat(0x1a221c), x, 0.05, z, { rx: -Math.PI / 2, shadow: false });
    const l = new THREE.PointLight(0x5aff6a, 14, 30, 1.6);
    l.position.set(x, 4, z);
    root.add(l);
  }
  // Chains and meat hooks hanging from the vault (Patchwerk's larder).
  const chain = mat(0x4a4a50, { metalness: 0.7, roughness: 0.4 });
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 22 + rnd() * 34;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x) > W - 4 || Math.abs(z) > D - 4) continue;
    const len = 6 + rnd() * 10;
    add(root, new THREE.CylinderGeometry(0.06, 0.06, len, 4), chain, x, H - len / 2, z, { shadow: false });
    add(root, new THREE.TorusGeometry(0.45, 0.07, 6, 10, Math.PI * 1.4), chain, x, H - len - 0.3, z, { rz: Math.PI / 2, ry: rnd() * Math.PI, shadow: false });
  }
  for (const [x, z] of [[-24, -24], [24, -24], [-24, 24], [24, 24], [0, -40], [0, 40], [-40, 0], [40, 0]]) {
    brazier(root, torches, x, z, look.torchColor || 0x6aff8a, look);
  }
  return torches;
}

export const RAID_ROOMS = {
  moltenCore: { layout: roundLayout(mcWall), build: buildMoltenCore },
  blackwingLair: { layout: hallLayout(BWL.hx, BWL.hz), build: buildBlackwingLair },
  naxxramas: { layout: hallLayout(NAXX.hx, NAXX.hz), build: buildNaxxramas },
};
