// The classic bosses' rooms, each about fifty times the training ring's floor (its radius 22; these 280-340 yards
// across): Molten Core's lava cavern with Ragnaros's lake and lava falls, Blackwing Lair's dragonkin hall with a black
// dragon's bones, iron chandeliers and forge grates, and Naxxramas's Construct Quarter with slime, cages, chains and
// meat hooks under gothic vaults. Like Onyxia's lair (world/lair.js) each is a layout the arena reads (heightAt,
// inside, clamp: the floor and the walls, for you, the camera and a fear) and a build of its meshes; the boss stands at
// the origin facing +Z, the raid around it.
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
const molten = (color, emissive, intensity) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.6 });

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
function brazier(root, torches, x, z, color, look, { height = 1.4, size = 0.45, reach = 26 } = {}) {
  add(root, new THREE.CylinderGeometry(size * 0.9, size * 0.6, height, 8), mat(0x2a2624, { metalness: 0.4 }), x, height / 2, z);
  add(root, new THREE.CylinderGeometry(size * 1.3, size * 0.9, 0.3, 10), mat(0x3a332e, { metalness: 0.5 }), x, height + 0.1, z);
  const flame = add(root, new THREE.SphereGeometry(size * 0.9, 12, 8), glow(color, 2.4), x, height + 0.55, z, { shadow: false });
  const light = new THREE.PointLight(color, look.torch, reach, 1.7);
  light.position.set(x, height + 1.2, z);
  root.add(light);
  torches.push({ flame, light, phase: x * 0.37 + z * 0.11 });
}

// A light with no flame (lava's glow, slime's).
function lamp(root, color, intensity, reach, x, y, z) {
  const l = new THREE.PointLight(color, intensity, reach, 1.6);
  l.position.set(x, y, z);
  root.add(l);
}

// The raid around a boss at the origin: melee at its flanks, casters and hunters further back.
const RAID_SPOTS = [[-8, -2], [-8.5, 1.5], [-7.5, -4.5], [8.5, 2.5], [8, -4.5], [-16, 6], [-15, 11], [-20, 3], [16, 7], [15, 12], [20, 3]];
const COMMON = { center: { x: 0, z: 0 }, onyxia: { x: 0, z: 0 }, start: { x: 9.5, z: -1 }, hover: { x: 0, z: 2, height: 13 }, raidSpots: RAID_SPOTS };

// A round room: the wall at radius r(theta).
function roundLayout(wallRadius, heightAt = () => 0) {
  return {
    ...COMMON, heightAt,
    inside(x, z, margin = 0) { return Math.hypot(x, z) <= wallRadius(Math.atan2(z, x)) - margin; },
    clamp(p, margin = 1.2) {
      const d = Math.hypot(p.x, p.z);
      const max = wallRadius(Math.atan2(p.z, p.x)) - margin;
      if (d > max) { p.x *= max / d; p.z *= max / d; }
      return p;
    },
    randomFloor(rnd = Math.random) { const a = rnd() * Math.PI * 2; const r = Math.sqrt(rnd()) * 60; return { x: Math.cos(a) * r, z: Math.sin(a) * r }; },
  };
}

// A hall: a rectangle of half-widths hx (x) and hz (z).
function hallLayout(hx, hz) {
  return {
    ...COMMON, heightAt: () => 0,
    inside(x, z, margin = 0) { return Math.abs(x) <= hx - margin && Math.abs(z) <= hz - margin; },
    clamp(p, margin = 1.2) {
      p.x = Math.max(-hx + margin, Math.min(hx - margin, p.x));
      p.z = Math.max(-hz + margin, Math.min(hz - margin, p.z));
      return p;
    },
    randomFloor(rnd = Math.random) { return { x: (rnd() * 2 - 1) * Math.min(hx, 60), z: (rnd() * 2 - 1) * Math.min(hz, 60) }; },
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

// Four walls, a ceiling, of a hall.
function hallShell(root, W, D, H, wallMat, ceilColor) {
  for (const [x, z, w, d] of [[0, -D - 1, W * 2 + 4, 2], [0, D + 1, W * 2 + 4, 2], [-W - 1, 0, 2, D * 2 + 4], [W + 1, 0, 2, D * 2 + 4]]) {
    add(root, new THREE.BoxGeometry(w, H, d), wallMat, x, H / 2, z, { shadow: false });
  }
  add(root, new THREE.BoxGeometry(W * 2 + 4, 1, D * 2 + 4), mat(ceilColor), 0, H, 0, { shadow: false });
}

// ---- Molten Core: Ragnaros's lair ----------------------------------------------------------------------------

const MC_R = 160;
const mcWall = (a) => MC_R + 6 * Math.sin(5 * a + 1.3) + 4 * Math.sin(11 * a + 0.4) + 2 * Math.sin(23 * a);

function buildMoltenCore(root, q, look) {
  const rnd = seeded(41);
  const torches = [];
  // Volcanic rock, scorched, with glowing seams.
  const tex = canvasTexture(512, 40, (ctx, s) => {
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
  const N = 260;
  const rings = [{ out: 0, y: -0.3 }, { out: 4, y: 20 }, { out: 0, y: 40 }, { out: -14, y: 58 }, { out: -40, y: 72 }];
  const pos = [];
  for (const ring of rings) {
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = mcWall(a) + 1 + ring.out + (ring.y > 0 ? (rnd() - 0.5) * 7 : 0);
      pos.push(Math.cos(a) * r, ring.y + (ring.y > 0 ? (rnd() - 0.5) * 4 : 0), Math.sin(a) * r);
    }
  }
  const idx = [];
  for (let ri = 0; ri < rings.length - 1; ri++) for (let i = 0; i < N; i++) { const a = ri * (N + 1) + i; const b = a + N + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  wallGeo.setIndex(idx);
  wallGeo.computeVertexNormals();
  add(root, wallGeo, mat(0x34241e, { side: THREE.DoubleSide }), 0, 0, 0, { shadow: false });
  const vault = add(root, new THREE.SphereGeometry(125, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x150d0b, { side: THREE.BackSide }), 0, 66, 0, { shadow: false });
  vault.scale.set(1, 0.3, 1);

  // Ragnaros's lake: lava behind him, a black crust at its shore, rock islands in it, and its glow.
  const lava = molten(0xff5a10, 0xff4a08, 1.4);
  add(root, new THREE.CircleGeometry(48, 56), lava, 0, 0.05, -52, { rx: -Math.PI / 2, shadow: false });
  add(root, new THREE.RingGeometry(48, 54, 56), mat(0x1a100c), 0, 0.06, -52, { rx: -Math.PI / 2, shadow: false });
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 14 + rnd() * 28;
    add(root, new THREE.DodecahedronGeometry(1.5 + rnd() * 3, 0), mat(0x1a1210), Math.cos(a) * r, 0.4, -52 + Math.sin(a) * r);
  }
  lamp(root, 0xff6a20, 60, 110, 0, 10, -52);
  lamp(root, 0xff6a20, 30, 70, -30, 8, -70);
  lamp(root, 0xff6a20, 30, 70, 30, 8, -70);
  // Lava falls down the far wall into the lake.
  const fall = molten(0xff7a20, 0xff5a10, 1.6);
  for (const x of [-48, -20, 14, 44]) {
    const a = Math.atan2(-1, x / MC_R);
    const r = mcWall(a) - 4;
    add(root, new THREE.PlaneGeometry(6 + rnd() * 5, 60), fall, Math.cos(a) * r, 30, Math.sin(a) * r, { ry: Math.atan2(-Math.cos(a), -Math.sin(a)), shadow: false });
  }
  // Rivers of lava winding across the floor towards the lake, clear of the fight in the middle.
  for (const [x0, z0, dir] of [[-130, 70, -0.3], [130, 80, Math.PI + 0.3], [-140, -20, 0.1], [140, -10, Math.PI - 0.1], [-60, 130, -1.2], [70, 130, -1.9]]) {
    let x = x0;
    let z = z0;
    let a = dir;
    for (let k = 0; k < 30; k++) {
      const len = 5 + rnd() * 3;
      const nx = x + Math.cos(a) * len;
      const nz = z + Math.sin(a) * len;
      if (Math.hypot(nx, nz) < 30 || Math.hypot(nx, nz + 52) < 50) break;
      add(root, new THREE.BoxGeometry(len + 0.8, 0.06, 2 + rnd() * 1.5), lava, (x + nx) / 2, 0.03, (z + nz) / 2, { ry: -a, shadow: false });
      x = nx; z = nz;
      a += (rnd() - 0.5) * 0.5 + (Math.atan2(-52 - z, -x) - a) * 0.08; // bending towards the lake
    }
  }
  // The Flamewakers' runes on the floor, glowing.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.3;
    add(root, new THREE.RingGeometry(3.5, 4.2, 6), glow(0xff7a2a, 1.6), Math.cos(a) * 70, 0.05, Math.sin(a) * 70, { rx: -Math.PI / 2, rz: a, shadow: false });
    add(root, new THREE.RingGeometry(1.6, 1.9, 3), glow(0xff9a3a, 1.8), Math.cos(a) * 70, 0.06, Math.sin(a) * 70, { rx: -Math.PI / 2, rz: -a, shadow: false });
  }
  // Stalagmites, obsidian spires and rock columns up to the vault.
  const rock = mat(0x3a2a24);
  const obsidian = mat(0x120c10, { roughness: 0.4, metalness: 0.2 });
  for (let i = 0; i < 160; i++) {
    const a = rnd() * Math.PI * 2;
    const r = mcWall(a) - 2 - rnd() * 22;
    const tall = 4 + rnd() * 16;
    add(root, new THREE.ConeGeometry(1 + rnd() * 3, tall, 6), rnd() < 0.3 ? obsidian : rock, Math.cos(a) * r, tall / 2 - 0.2, Math.sin(a) * r);
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.6;
    add(root, new THREE.CylinderGeometry(5, 9, 72, 7), rock, Math.cos(a) * 112, 36, Math.sin(a) * 112);
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    brazier(root, torches, Math.cos(a) * 42, Math.sin(a) * 42, look.torchColor || 0xff6a20, look, { height: 1.8, size: 0.6, reach: 34 });
  }
  return torches;
}

// ---- Blackwing Lair --------------------------------------------------------------------------------------------

const BWL = { hx: 170, hz: 110, height: 50 };

function buildBlackwingLair(root, q, look) {
  const rnd = seeded(53);
  const torches = [];
  // Big dark flagstones with worn joints.
  const tex = canvasTexture(512, 24, (ctx, s) => {
    ctx.fillStyle = '#1c1a1c';
    ctx.fillRect(0, 0, s, s);
    const n = 8;
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
      const g = 34 + rnd() * 24;
      ctx.fillStyle = `rgb(${g + 4},${g},${g + 2})`;
      ctx.fillRect(i * s / n + 2, k * s / n + 2, s / n - 4, s / n - 4);
    }
    for (let i = 0; i < 2500; i++) { ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.25})`; ctx.fillRect(rnd() * s, rnd() * s, 2, 2); }
  });
  floor(root, BWL.hx * 2.2, BWL.hz * 2.2, tex, 0xd8d0d8);
  const { hx: W, hz: D, height: H } = BWL;
  hallShell(root, W, D, H, mat(0x2e2a2e), 0x121012);
  // The black dragonflight's banners: red cloth, black dragon, down both long walls.
  const red = new THREE.MeshStandardMaterial({ color: look.emblem || 0xa01818, roughness: 0.9, side: THREE.DoubleSide });
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0a0c, roughness: 0.9, side: THREE.DoubleSide });
  for (let k = -6; k <= 6; k++) {
    for (const side of [-1, 1]) {
      const b = add(root, new THREE.PlaneGeometry(7, 20), red, k * 24, H - 16, side * (D - 0.05), { ry: side > 0 ? Math.PI : 0, shadow: false });
      add(b, new THREE.CircleGeometry(2.2, 6), black, 0, 1.5, 0.02, { shadow: false });
    }
  }
  // Two rows of massive columns down the hall.
  const col = mat(0x3a3438);
  for (let x = -150; x <= 150; x += 30) {
    if (Math.abs(x) < 20) continue;
    for (const z of [-62, 62]) {
      add(root, new THREE.CylinderGeometry(3.6, 4.2, H, 8), col, x, H / 2, z);
      add(root, new THREE.BoxGeometry(10, 2.4, 10), col, x, 1.2, z);
      add(root, new THREE.BoxGeometry(10, 2.4, 10), col, x, H - 1.2, z);
    }
  }
  // Forge grates down the middle, glowing from below, and braziers along the columns.
  const forge = molten(0x4a1808, 0xff5a10, 0.9);
  for (let x = -140; x <= 140; x += 28) {
    if (Math.abs(x) < 24) continue;
    for (const z of [-30, 30]) {
      add(root, new THREE.BoxGeometry(10, 0.08, 6), forge, x, 0.04, z, { shadow: false });
      for (let k = -2; k <= 2; k++) add(root, new THREE.BoxGeometry(10, 0.12, 0.25), mat(0x141012, { metalness: 0.6 }), x, 0.1, z + k * 1.2, { shadow: false });
    }
  }
  for (const x of [-120, -60, 60, 120]) for (const z of [-62, 62]) brazier(root, torches, x + 15, z, look.torchColor || 0xff5030, look, { height: 2, size: 0.7, reach: 36 });
  for (const [x, z] of [[-18, -18], [18, -18], [-18, 18], [18, 18]]) brazier(root, torches, x, z, look.torchColor || 0xff5030, look, { reach: 30 });
  // Iron chandeliers hanging from the vault, ringed with candles.
  const iron = mat(0x1a1a1c, { metalness: 0.7, roughness: 0.4 });
  for (const [x, z] of [[-80, 0], [80, 0], [0, -60], [0, 60]]) {
    add(root, new THREE.CylinderGeometry(0.15, 0.15, 14, 4), iron, x, H - 7, z, { shadow: false });
    add(root, new THREE.TorusGeometry(5, 0.3, 6, 20), iron, x, H - 14, z, { rx: Math.PI / 2, shadow: false });
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      add(root, new THREE.SphereGeometry(0.3, 6, 5), glow(0xffb060, 2.2), x + Math.cos(a) * 5, H - 13.5, z + Math.sin(a) * 5, { shadow: false });
    }
    lamp(root, 0xffa060, 22, 60, x, H - 15, z);
  }
  // A black dragon's bones on the floor of the hall: spine, ribs and skull.
  const bone = mat(0xbfb6a0, { roughness: 0.8 });
  const bx = -95;
  const bz = 32;
  for (let k = 0; k < 26; k++) {
    const t = k / 25;
    const x = bx + t * 70;
    const z = bz + Math.sin(t * Math.PI * 1.4) * 8;
    add(root, new THREE.SphereGeometry(1.4 - t * 0.6, 8, 6), bone, x, 1.1 - t * 0.3, z);
    if (k > 4 && k < 18) for (const s of [-1, 1]) add(root, new THREE.TorusGeometry(5 - Math.abs(k - 11) * 0.3, 0.35, 5, 10, Math.PI * 0.9), bone, x, 0.3, z + s * 0.6, { rx: s * -Math.PI / 2, ry: Math.PI / 2, shadow: false });
  }
  const skull = add(root, new THREE.BoxGeometry(5, 3, 8), bone, bx - 5, 1.6, bz, { ry: Math.PI / 2 });
  for (const s of [-1, 1]) add(skull, new THREE.ConeGeometry(0.6, 5, 5), bone, s * 1.8, 2.2, -2, { rx: -0.8 });
  // Clutches of black dragon eggs in the far corners.
  const egg = mat(0x2a1a2e, { roughness: 0.5, emissive: 0x3a0a2a, emissiveIntensity: 0.4, flatShading: false });
  for (const [cx, cz] of [[-145, -90], [145, -90], [-145, 90], [145, 90], [-150, 0], [150, 0]]) {
    for (let i = 0; i < 14; i++) {
      const e = add(root, new THREE.SphereGeometry(1.1, 12, 10), egg, cx + (rnd() - 0.5) * 16, 1.2, cz + (rnd() - 0.5) * 12);
      e.scale.set(1, 1.35, 1);
    }
  }
  return torches;
}

// ---- Naxxramas: the Construct Quarter ----------------------------------------------------------------------------

const NAXX = { hx: 140, hz: 140, height: 55 };

function buildNaxxramas(root, q, look) {
  const rnd = seeded(67);
  const torches = [];
  // A floor of dark iron grates.
  const tex = canvasTexture(512, 36, (ctx, s) => {
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
  const { hx: W, hz: D, height: H } = NAXX;
  hallShell(root, W, D, H, mat(0x2c3430, { metalness: 0.3 }), 0x0e1210);
  // Gothic buttresses along the walls with pointed arches between, and ribs across the vault.
  const rib = mat(0x3a4440, { metalness: 0.35 });
  for (let k = -6; k <= 6; k++) {
    for (const [x, z, ry] of [[k * 22, -D + 2, 0], [k * 22, D - 2, 0], [-W + 2, k * 22, Math.PI / 2], [W - 2, k * 22, Math.PI / 2]]) {
      add(root, new THREE.BoxGeometry(3, H, 4), rib, x, H / 2, z, { ry, shadow: false });
      const arch = add(root, new THREE.ConeGeometry(9, 15, 4), rib, x, H - 10, z, { ry: ry + Math.PI / 4, shadow: false });
      arch.scale.set(1, 1, 0.2);
    }
  }
  for (let k = -3; k <= 3; k++) add(root, new THREE.BoxGeometry(W * 2, 2, 2.5), rib, 0, H - 2, k * 40, { shadow: false });
  // Pools of slime, the channels feeding them, and slime falling from spouts in the walls.
  const slime = new THREE.MeshStandardMaterial({ color: 0x4aff5a, emissive: 0x2aff4a, emissiveIntensity: 1.1, roughness: 0.3 });
  for (const [x, z, r] of [[-85, -85, 20], [85, -85, 20], [-85, 85, 18], [85, 85, 18]]) {
    add(root, new THREE.CircleGeometry(r, 36), slime, x, 0.04, z, { rx: -Math.PI / 2, shadow: false });
    add(root, new THREE.RingGeometry(r, r + 2.5, 36), mat(0x1a221c), x, 0.05, z, { rx: -Math.PI / 2, shadow: false });
    lamp(root, 0x5aff6a, 26, 60, x, 6, z);
    // A channel from the pool to the wall, and the fall into it.
    const sx = Math.sign(x);
    add(root, new THREE.BoxGeometry(W - Math.abs(x), 0.06, 3), slime, sx * (Math.abs(x) + (W - Math.abs(x)) / 2), 0.03, z, { shadow: false });
    add(root, new THREE.PlaneGeometry(4, 28), slime, sx * (W - 0.6), 14, z, { ry: -sx * Math.PI / 2, shadow: false });
  }
  // Cages along the walls, the larder's chains and meat hooks hanging from the vault.
  const chain = mat(0x4a4a50, { metalness: 0.7, roughness: 0.4 });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.25;
    const x = Math.cos(a) * 112;
    const z = Math.sin(a) * 112;
    add(root, new THREE.BoxGeometry(6, 0.4, 6), chain, x, 0.2, z);
    add(root, new THREE.BoxGeometry(6, 0.4, 6), chain, x, 7.8, z);
    for (let i = 0; i < 8; i++) {
      const b = (i / 8) * Math.PI * 2;
      add(root, new THREE.CylinderGeometry(0.08, 0.08, 7.6, 4), chain, x + Math.cos(b) * 2.8, 4, z + Math.sin(b) * 2.8, { shadow: false });
    }
  }
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 30 + rnd() * 95;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x) > W - 8 || Math.abs(z) > D - 8) continue;
    const len = 10 + rnd() * 25;
    add(root, new THREE.CylinderGeometry(0.1, 0.1, len, 4), chain, x, H - len / 2, z, { shadow: false });
    add(root, new THREE.TorusGeometry(0.7, 0.1, 6, 10, Math.PI * 1.4), chain, x, H - len - 0.5, z, { rz: Math.PI / 2, ry: rnd() * Math.PI, shadow: false });
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    brazier(root, torches, Math.cos(a) * 44, Math.sin(a) * 44, look.torchColor || 0x6aff8a, look, { height: 1.8, size: 0.6, reach: 34 });
  }
  return torches;
}

export const RAID_ROOMS = {
  moltenCore: { layout: roundLayout(mcWall), build: buildMoltenCore },
  blackwingLair: { layout: hallLayout(BWL.hx, BWL.hz), build: buildBlackwingLair },
  naxxramas: { layout: hallLayout(NAXX.hx, NAXX.hz), build: buildNaxxramas },
};
