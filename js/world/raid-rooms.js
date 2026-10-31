// The classic bosses' rooms, each about fifty times the training ring's floor (its radius 22; these 280-340 yards
// across): Molten Core's lava cavern with Ragnaros's lake and lava falls, Blackwing Lair's dragonkin hall with a black
// dragon's bones, iron chandeliers and forge grates, and Naxxramas's Construct Quarter with slime, cages, chains and
// meat hooks under gothic vaults, Zul'Gurub's jungle temple and the Ruins of Ahn'Qiraj under the open sky. Like Onyxia's lair (world/lair.js) each is a layout the arena reads (heightAt,
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

// The same colour and options give the same material, so the room's still pieces merge into a mesh per material
// (Environment.mergeStatic). Options holding objects (a texture) get a material of their own.
const materials = new Map();
const shared = (key, make) => { if (!materials.has(key)) materials.set(key, make()); return materials.get(key); };
const mat = (color, opts = {}) => (Object.values(opts).some((v) => v && typeof v === 'object')
  ? new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true, ...opts })
  : shared(`m${color}${JSON.stringify(opts)}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true, ...opts })));
const glow = (color, k = 2) => shared(`g${color}|${k}`, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) }));
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

// Volcanic rock, scorched, with glowing seams (Molten Core's floors).
function volcanicTexture(rnd, repeat) {
  return canvasTexture(512, repeat, (ctx, s) => {
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
}

// The lake lies behind the boss (the raid comes from -z, the boss stands at the centre), its near shore LAKE.r - 34
// yards past him, so every Molten Core boss but Ragnaros fights on rock.
const LAKE = { z: 62, r: 48 };

function buildMoltenCore(root, q, look, { ragnaros = false } = {}) {
  const rnd = seeded(41);
  const torches = [];
  const tex = volcanicTexture(rnd, 40);
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

  // The lake: lava behind the boss, a black crust at its shore, rock islands in it, and its glow. The crust sits a
  // little above the lava and the floor so the three never fight over the same depth.
  const lava = molten(0xff5a10, 0xff4a08, 1.4);
  add(root, new THREE.CircleGeometry(LAKE.r, 56), lava, 0, 0.08, LAKE.z, { rx: -Math.PI / 2, shadow: false });
  add(root, new THREE.RingGeometry(LAKE.r, LAKE.r + 6, 56), mat(0x1a100c), 0, 0.14, LAKE.z, { rx: -Math.PI / 2, shadow: false });
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 14 + rnd() * 28;
    add(root, new THREE.DodecahedronGeometry(1.5 + rnd() * 3, 0), mat(0x1a1210), Math.cos(a) * r, 0.4, LAKE.z + Math.sin(a) * r);
  }
  // Ragnaros stands in a pool of his own, joined to the lake by a channel; the raid stays on the rock in front of it.
  if (ragnaros) {
    add(root, new THREE.CircleGeometry(7, 40), lava, 0, 0.09, 0, { rx: -Math.PI / 2, shadow: false });
    add(root, new THREE.RingGeometry(7, 8.6, 40), mat(0x1a100c), 0, 0.15, 0, { rx: -Math.PI / 2, shadow: false });
    add(root, new THREE.PlaneGeometry(9, LAKE.z - LAKE.r), lava, 0, 0.085, (LAKE.z - LAKE.r) / 2 + 2, { rx: -Math.PI / 2, shadow: false });
    lamp(root, 0xff6a20, 30, 40, 0, 6, 0);
  }
  lamp(root, 0xff6a20, 60, 110, 0, 10, LAKE.z);
  lamp(root, 0xff6a20, 30, 70, -30, 8, LAKE.z + 18);
  lamp(root, 0xff6a20, 30, 70, 30, 8, LAKE.z + 18);
  // Lava falls down the far wall into the lake.
  const fall = molten(0xff7a20, 0xff5a10, 1.6);
  for (const x of [-48, -20, 14, 44]) {
    const a = Math.atan2(1, x / MC_R);
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
      if (Math.hypot(nx, nz) < 30 || Math.hypot(nx, nz - LAKE.z) < LAKE.r + 2) break;
      add(root, new THREE.BoxGeometry(len + 0.8, 0.12, 2 + rnd() * 1.5), lava, (x + nx) / 2, 0.02, (z + nz) / 2, { ry: -a, shadow: false });
      x = nx; z = nz;
      a += (rnd() - 0.5) * 0.5 + (Math.atan2(LAKE.z - z, -x) - a) * 0.08; // bending towards the lake
    }
  }
  // The Flamewakers' runes on the floor, glowing.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.3;
    add(root, new THREE.RingGeometry(3.5, 4.2, 6), glow(0xff7a2a, 1.6), Math.cos(a) * 70, 0.1, Math.sin(a) * 70, { rx: -Math.PI / 2, rz: a, shadow: false });
    add(root, new THREE.RingGeometry(1.6, 1.9, 3), glow(0xff9a3a, 1.8), Math.cos(a) * 70, 0.12, Math.sin(a) * 70, { rx: -Math.PI / 2, rz: -a, shadow: false });
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

// ---- Zul'Gurub: the Altar of Hakkar ----------------------------------------------------------------------------
// Open sky over the jungle: a mossy stone temple court ringed by terraced steps, the Gurubashi's stepped pyramid
// behind the boss with Hakkar's blood pool at its foot, tiki totems with glowing eyes, coiled serpent statues, broken
// columns, green fire, and the jungle all around.

const ZG_R = 150;
const zgWall = (a) => ZG_R + 4 * Math.sin(4 * a + 0.6) + 3 * Math.sin(9 * a + 1.1);

function buildZulGurub(root, q, look) {
  const rnd = seeded(83);
  const torches = [];
  // Mossy flagstones.
  const tex = canvasTexture(512, 34, (ctx, s) => {
    ctx.fillStyle = '#2e3024';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const g = 72 + rnd() * 34;
        ctx.fillStyle = `rgb(${g},${g + 6},${g - 16})`;
        ctx.fillRect(x * s / 8 + 3 + (y % 2) * s / 16, y * s / 8 + 3, s / 8 - 6, s / 8 - 6);
      }
    }
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(${40 + rnd() * 30},${90 + rnd() * 60},${30 + rnd() * 20},0.5)`;
      ctx.fillRect(rnd() * s, rnd() * s, 2 + rnd() * 5, 2 + rnd() * 5);
    }
  });
  add(root, new THREE.CircleGeometry(ZG_R + 14, 72), new THREE.MeshStandardMaterial({ map: tex, color: 0xb8c0a0, roughness: 0.95 }), 0, 0, 0, { rx: -Math.PI / 2 });
  add(root, new THREE.CircleGeometry(460, 48), mat(0x1c3618), 0, -0.06, 0, { rx: -Math.PI / 2, shadow: false }); // the jungle floor
  // Terraced steps all around the court.
  const stone = mat(0x6a6a52);
  const darkStone = mat(0x4a4a3a);
  for (let k = 0; k < 4; k++) {
    const r = ZG_R + 4 + k * 7;
    const h = 1.6 * (k + 1);
    add(root, new THREE.CylinderGeometry(r, r, h, 72, 1, true), new THREE.MeshStandardMaterial({ color: k % 2 ? 0x5a5a46 : 0x6a6a52, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }), 0, h / 2, 0, { shadow: false });
    add(root, new THREE.RingGeometry(r, r + 7, 72), stone, 0, h, 0, { rx: -Math.PI / 2, shadow: false });
  }
  // The stepped pyramid behind the boss, its stairs facing the court, a shrine on top.
  const pz = -215;
  for (let k = 0; k < 6; k++) add(root, new THREE.BoxGeometry(84 - k * 12, 7, 84 - k * 12), k % 2 ? darkStone : stone, 0, 3.5 + k * 7, pz, { shadow: false });
  add(root, new THREE.BoxGeometry(16, 44, 70), stone, 0, 20, pz + 42, { rx: -0.56, shadow: false }); // the stairs
  add(root, new THREE.BoxGeometry(18, 10, 14), darkStone, 0, 47, pz);
  add(root, new THREE.ConeGeometry(12, 8, 4), mat(0x3a5a2a), 0, 56, pz, { ry: Math.PI / 4 });
  for (const s of [-1, 1]) brazier(root, torches, s * 8, pz - 8, look.torchColor || 0x7aff4a, look, { height: 44, size: 0.9, reach: 60 });
  // Hakkar's blood pool at its foot.
  const blood = new THREE.MeshStandardMaterial({ color: 0x8a0a0a, emissive: 0x6a0404, emissiveIntensity: 0.9, roughness: 0.3 });
  add(root, new THREE.CircleGeometry(16, 40), blood, 0, 0.05, -138, { rx: -Math.PI / 2, shadow: false });
  add(root, new THREE.RingGeometry(16, 19, 40), darkStone, 0, 0.06, -138, { rx: -Math.PI / 2, shadow: false });
  lamp(root, 0xff2a1a, 30, 70, 0, 6, -138);
  // Coiled serpent statues by the pool and around the court.
  const serpent = mat(0x4a6a4a, { metalness: 0.2 });
  for (const [x, z] of [[-26, -132], [26, -132], [-80, -60], [80, -60], [-80, 70], [80, 70]]) {
    add(root, new THREE.CylinderGeometry(3, 3.4, 2, 10), darkStone, x, 1, z);
    for (let k = 0; k < 3; k++) add(root, new THREE.TorusGeometry(2.4 - k * 0.5, 0.6, 8, 16), serpent, x, 2.6 + k * 1.1, z, { rx: Math.PI / 2 });
    add(root, new THREE.ConeGeometry(0.9, 2.6, 6), serpent, x, 7.4, z, { rx: Math.atan2(-z, -x) > 0 ? 0.6 : -0.6 });
  }
  // Tiki totems with glowing green eyes in a ring.
  const wood = mat(0x5a3a22);
  const eye = glow(0x7aff4a, 2.2);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + 0.11;
    const x = Math.cos(a) * 118;
    const z = Math.sin(a) * 118;
    const t = add(root, new THREE.BoxGeometry(3, 9, 3), wood, x, 4.5, z, { ry: -a + Math.PI / 2 });
    for (const y of [1.8, -1.2]) {
      for (const s of [-1, 1]) add(t, new THREE.BoxGeometry(0.5, 0.35, 0.2), eye, s * 0.7, y, 1.55, { shadow: false });
      add(t, new THREE.BoxGeometry(1.6, 0.3, 0.2), mat(0xd8d0b0), 0, y - 0.9, 1.55, { shadow: false }); // teeth
    }
    add(t, new THREE.ConeGeometry(2.2, 2.4, 4), mat(0x3a2a1a), 0, 5.6, 0, { ry: Math.PI / 4 });
  }
  // Broken columns.
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 55 + rnd() * 80;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (z < -110 && Math.abs(x) < 40) continue;
    const h = 3 + rnd() * 12;
    add(root, new THREE.CylinderGeometry(2, 2.3, h, 8), rnd() < 0.5 ? stone : darkStone, x, h / 2, z, { rz: (rnd() - 0.5) * 0.1 });
  }
  // Green fire around the boss.
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    brazier(root, torches, Math.cos(a) * 46, Math.sin(a) * 46, look.torchColor || 0x7aff4a, look, { height: 1.8, size: 0.6, reach: 30 });
  }
  // The jungle: tall trees with broad crowns and hanging vines, kept clear of the pyramid.
  const bark = mat(0x3a2c1e);
  const leaves = [mat(0x1e4a1c), mat(0x2a5a22), mat(0x183a16)];
  const vine = mat(0x2a4a1a);
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 185 + rnd() * 140;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (z < -150 && Math.abs(x) < 70) continue;
    const h = 22 + rnd() * 20;
    add(root, new THREE.CylinderGeometry(1.1, 1.8, h, 7), bark, x, h / 2, z, { shadow: false });
    for (let k = 0; k < 3; k++) {
      const c = add(root, new THREE.SphereGeometry(8 + rnd() * 5, 9, 7), leaves[(i + k) % 3], x + (rnd() - 0.5) * 8, h + k * 3 - 2, z + (rnd() - 0.5) * 8, { shadow: false });
      c.scale.y = 0.55;
    }
    if (i % 3 === 0) for (let v = 0; v < 3; v++) { const len = 8 + rnd() * 10; add(root, new THREE.CylinderGeometry(0.15, 0.15, len, 4), vine, x + (rnd() - 0.5) * 10, h - len / 2, z + (rnd() - 0.5) * 10, { shadow: false }); }
  }
  return torches;
}

// ---- Ruins of Ahn'Qiraj ----------------------------------------------------------------------------------------
// The desert under an open sky: a sand floor with sandstone paving showing through, broken walls and toppled pillars,
// obelisks carved with glyphs, the glowing crystals Ossirian is weakened at, two colossal qiraji statues by the gate of
// Ahn'Qiraj behind the boss, and dunes all around.

const AQ_R = 150;
const aqWall = (a) => AQ_R + 5 * Math.sin(3 * a + 0.2) + 3 * Math.sin(7 * a + 1.7);

function buildRuinsOfAhnQiraj(root, q, look) {
  const rnd = seeded(97);
  const torches = [];
  // Sand, with the old paving showing through.
  const tex = canvasTexture(512, 30, (ctx, s) => {
    ctx.fillStyle = '#c8a46a';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      const g = 150 + rnd() * 30;
      ctx.fillStyle = `rgba(${g},${g - 30},${g - 70},0.55)`;
      ctx.fillRect(rnd() * s, rnd() * s, 30 + rnd() * 50, 20 + rnd() * 40);
    }
    for (let i = 0; i < 5000; i++) {
      const g = 170 + rnd() * 60;
      ctx.fillStyle = `rgba(${g},${g - 30},${g - 80},0.4)`;
      ctx.fillRect(rnd() * s, rnd() * s, 2, 2);
    }
  });
  add(root, new THREE.CircleGeometry(AQ_R + 20, 72), new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 1 }), 0, 0, 0, { rx: -Math.PI / 2 });
  add(root, new THREE.CircleGeometry(520, 48), mat(0xc8a066), 0, -0.06, 0, { rx: -Math.PI / 2, shadow: false });
  const sandstone = mat(0xb08a5a);
  const darkSand = mat(0x8a6a44);
  // Dunes ringing the ruins.
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + rnd() * 0.1;
    const d = aqWall(a) + 10 + rnd() * 30;
    const dune = add(root, new THREE.SphereGeometry(22 + rnd() * 18, 12, 8), mat(0xd0a86a), Math.cos(a) * d, -6, Math.sin(a) * d, { shadow: false });
    dune.scale.set(1.4, 0.45 + rnd() * 0.3, 1);
    dune.rotation.y = -a;
  }
  // The gate of Ahn'Qiraj behind the boss, two colossal qiraji statues beside it.
  const gz = -230;
  add(root, new THREE.BoxGeometry(18, 50, 14), sandstone, -26, 25, gz, { shadow: false });
  add(root, new THREE.BoxGeometry(18, 50, 14), sandstone, 26, 25, gz, { shadow: false });
  add(root, new THREE.BoxGeometry(76, 12, 16), darkSand, 0, 54, gz, { shadow: false });
  add(root, new THREE.PlaneGeometry(34, 48), mat(0x2a1a10), 0, 24, gz + 7.2, { shadow: false });
  for (const s of [-1, 1]) {
    const x = s * 70;
    add(root, new THREE.BoxGeometry(14, 8, 14), darkSand, x, 4, gz + 20);
    add(root, new THREE.CylinderGeometry(4, 5.5, 26, 8), sandstone, x, 21, gz + 20);       // the body
    add(root, new THREE.SphereGeometry(5, 10, 8), sandstone, x, 37, gz + 20);              // the head
    for (const t of [-1, 1]) add(root, new THREE.ConeGeometry(1.2, 9, 5), darkSand, x + t * 3, 42, gz + 22, { rx: -0.5, rz: t * 0.3 }); // its mandible horns
    add(root, new THREE.CylinderGeometry(0.8, 0.8, 34, 6), darkSand, x - s * 7, 17, gz + 24); // a spear
  }
  // Broken walls and toppled pillars.
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 50 + rnd() * 85;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
    if (rnd() < 0.5) add(root, new THREE.BoxGeometry(10 + rnd() * 14, 3 + rnd() * 8, 2.4), rnd() < 0.5 ? sandstone : darkSand, x, 2.5, z, { ry: rnd() * Math.PI });
    else {
      const h = 4 + rnd() * 14;
      add(root, new THREE.CylinderGeometry(1.8, 2.1, h, 10), sandstone, x, h / 2, z);
      if (rnd() < 0.5) add(root, new THREE.CylinderGeometry(1.8, 1.8, 10, 10), sandstone, x + 5, 1.8, z + 2, { rz: Math.PI / 2, ry: rnd() * Math.PI });
    }
  }
  // Obelisks carved with glyphs, and the crystals of Ossirian glowing at their feet.
  const glyph = glow(0x5ac8ff, 1.6);
  const crystal = new THREE.MeshStandardMaterial({ color: 0x7ae0ff, emissive: 0x4ac8ff, emissiveIntensity: 1.3, roughness: 0.2, transparent: true, opacity: 0.9 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.4;
    const x = Math.cos(a) * 100;
    const z = Math.sin(a) * 100;
    const o = add(root, new THREE.CylinderGeometry(1.2, 2.4, 22, 4), darkSand, x, 11, z, { ry: Math.PI / 4 });
    for (let g = 0; g < 4; g++) add(o, new THREE.BoxGeometry(0.6, 0.6, 0.1), glyph, 0, 6 - g * 3, 1.25, { shadow: false });
    for (let c = 0; c < 4; c++) add(root, new THREE.ConeGeometry(0.6 + rnd() * 0.5, 3 + rnd() * 3, 6), crystal, x + (rnd() - 0.5) * 6, 1.5, z + (rnd() - 0.5) * 6, { rx: (rnd() - 0.5) * 0.6, rz: (rnd() - 0.5) * 0.6, shadow: false });
    lamp(root, 0x5ac8ff, 14, 26, x, 3, z);
  }
  // Braziers around the boss, burning gold.
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    brazier(root, torches, Math.cos(a) * 46, Math.sin(a) * 46, look.torchColor || 0xffb040, look, { height: 1.8, size: 0.6, reach: 30 });
  }
  return torches;
}

// ---- Molten Core: Majordomo Executus's terrace -------------------------------------------------------------------
// Domo's spot by Ragnaros's lava lake: a raised rock terrace with a wide ramp up to it from the cavern floor where the
// raid comes in. Majordomo stands on the terrace at the origin facing +Z, down the ramp; his Flamewakers stand in an
// arc in front of him (world/majordomo.js). Everything walkable is one of three pieces, with lava all around them:
//   the terrace, a disc `height` yards up; the ramp, sloping from the terrace down to the floor between `slopeTop` and
//   `slopeBottom` (z); the cavern floor, an ellipse at the ramp's foot, with the fire pit Majordomo teleports raiders into.
export const DOMO = {
  height: 8,
  terrace: { x: 0, z: 4, r: 22 },
  ramp: { z0: 20, z1: 60, slopeTop: 24, slopeBottom: 56, halfTop: 11, halfBottom: 14 },
  floor: { x: 0, z: 82, rx: 40, rz: 26 },
  pit: { x: -27, z: 84, r: 5.5 },
  // Where you zone in: on the floor at the ramp's foot, facing up it (yaw PI: towards -Z).
  zoneIn: { x: 0, z: 70, yaw: Math.PI },
  wall: { x: 0, z: 30, r: 100 },
};

// The ramp's walkable half-width at z: a little wider at its foot.
const domoRampHalf = (z) => {
  const r = DOMO.ramp;
  const k = Math.max(0, Math.min(1, (z - r.slopeTop) / (r.slopeBottom - r.slopeTop)));
  return r.halfTop + (r.halfBottom - r.halfTop) * k;
};

// The ground's height: the terrace up top, the slope (eased at both ends, so you walk onto it and off it smoothly),
// the floor at 0. It depends on z alone; off the walkable pieces it is never stood on.
function domoHeight(x, z) {
  const r = DOMO.ramp;
  if (z <= r.slopeTop) return DOMO.height;
  if (z >= r.slopeBottom) return 0;
  const k = (z - r.slopeTop) / (r.slopeBottom - r.slopeTop);
  return DOMO.height * (1 - (0.6 * k + 0.4 * k * k * (3 - 2 * k)));
}

function domoLayout() {
  const { terrace: T, ramp: R, floor: F } = DOMO;
  const inTerrace = (x, z, m) => Math.hypot(x - T.x, z - T.z) <= T.r - m;
  const inRamp = (x, z, m) => z >= R.z0 && z <= R.z1 && Math.abs(x) <= domoRampHalf(z) - m;
  const inFloor = (x, z, m) => ((x - F.x) / (F.rx - m)) ** 2 + ((z - F.z) / (F.rz - m)) ** 2 <= 1;
  const inside = (x, z, margin = 0) => inTerrace(x, z, margin) || inRamp(x, z, margin) || inFloor(x, z, margin);
  // A raid around the terrace for the room's onlookers (hidden at the boss): on the floor at the ramp's foot.
  const spots = [[-8, 66], [-4, 68], [4, 68], [8, 66], [-12, 72], [-6, 74], [0, 76], [6, 74], [12, 72], [-9, 80], [9, 80]];
  return {
    ...COMMON, raidSpots: spots, heightAt: domoHeight, inside, zoneIn: DOMO.zoneIn, pit: DOMO.pit,
    // Out of every piece: back onto the nearest one (you slide along the ramp's edges and the terrace's rim).
    clamp(p, margin = 1.2) {
      if (inside(p.x, p.z, margin)) return p;
      const cands = [];
      const dt = Math.hypot(p.x - T.x, p.z - T.z) || 1;
      const rt = T.r - margin;
      cands.push({ x: T.x + (p.x - T.x) * rt / dt, z: T.z + (p.z - T.z) * rt / dt });
      const rz = Math.max(R.z0, Math.min(R.z1, p.z));
      const hw = Math.max(0, domoRampHalf(rz) - margin);
      cands.push({ x: Math.max(-hw, Math.min(hw, p.x)), z: rz });
      const ex = (p.x - F.x) / (F.rx - margin);
      const ez = (p.z - F.z) / (F.rz - margin);
      const k = 1 / (Math.hypot(ex, ez) || 1);
      cands.push({ x: F.x + (p.x - F.x) * k, z: F.z + (p.z - F.z) * k });
      let best = cands[0];
      for (const c of cands) if (Math.hypot(c.x - p.x, c.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z)) best = c;
      p.x = best.x;
      p.z = best.z;
      return p;
    },
    randomFloor(rnd = Math.random) { const a = rnd() * Math.PI * 2; const r = Math.sqrt(rnd()) * (T.r - 3); return { x: T.x + Math.cos(a) * r, z: T.z + Math.sin(a) * r }; },
  };
}

// A flat shape in world yards laid on the ground at height y (its UVs are yards, so one texture tiles the same on all).
function flatShape(root, shape, material, y) {
  const g = new THREE.ShapeGeometry(shape, 48);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, material);
  m.position.y = y;
  m.receiveShadow = true;
  root.add(m);
  return m;
}

function buildMajordomoTerrace(root, q, look) {
  const rnd = seeded(77);
  const torches = [];
  const { height: H, terrace: T, ramp: R, floor: F, pit: P, wall: W } = DOMO;
  const tex = volcanicTexture(rnd, 1);
  tex.repeat.set(1 / 9, 1 / 9); // one tile every 9 yards (the shapes' UVs are in yards)
  const ground = new THREE.MeshStandardMaterial({ map: tex, color: 0xc0a8a0, roughness: 0.95 });
  const cliff = mat(0x2e201a);
  const lava = molten(0xff5a10, 0xff4a08, 1.4);

  // The lava around everything, and its glow.
  add(root, new THREE.CircleGeometry(W.r + 6, 64), lava, W.x, -1.4, W.z, { rx: -Math.PI / 2, shadow: false });
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 30 + rnd() * (W.r - 36);
    const x = W.x + Math.cos(a) * r;
    const z = W.z + Math.sin(a) * r;
    if (Math.hypot(x - T.x, z - T.z) < T.r + 4 || ((x - F.x) / (F.rx + 4)) ** 2 + ((z - F.z) / (F.rz + 4)) ** 2 < 1 || (Math.abs(x) < 18 && z > R.z0 && z < R.z1)) continue;
    add(root, new THREE.DodecahedronGeometry(1.2 + rnd() * 2.6, 0), mat(0x1a1210), x, -1, z);
  }
  lamp(root, 0xff6a20, 40, 90, 0, 6, -40);
  lamp(root, 0xff6a20, 26, 60, -50, 5, 30);
  lamp(root, 0xff6a20, 26, 60, 50, 5, 30);

  // The terrace: a disc of rock standing out of the lava, a little wider than where you can walk (a rim).
  const terraceTop = new THREE.Shape();
  terraceTop.absarc(T.x, -T.z, T.r + 1.5, 0, Math.PI * 2, false);
  flatShape(root, terraceTop, ground, H);
  add(root, new THREE.CylinderGeometry(T.r + 1.5, T.r + 4.5, H + 2, 48, 1, true), cliff, T.x, H / 2 - 1, T.z, { shadow: false });
  // Rocks around its foot in the lava.
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2 + rnd() * 0.2;
    if (Math.sin(a) > 0.75) continue; // not across the ramp
    add(root, new THREE.DodecahedronGeometry(1.6 + rnd() * 1.8, 0), cliff, T.x + Math.cos(a) * (T.r + 4), -0.6 + rnd() * 1.5, T.z + Math.sin(a) * (T.r + 4));
  }

  // The ramp: its surface follows domoHeight, a curb 1.5 yards past where you walk, and rock sides down into the lava.
  const steps = 32;
  const pos = [];
  const uv = [];
  const idx = [];
  const curb = 1.5;
  for (let s = 0; s <= steps; s++) {
    const z = R.z0 + ((R.z1 - R.z0) * s) / steps;
    const y = domoHeight(0, z) + 0.03;
    const hw = domoRampHalf(z) + curb;
    // Left side bottom, left edge, right edge, right side bottom.
    for (const [x, yy] of [[-hw - 1.2, -2], [-hw, y], [hw, y], [hw + 1.2, -2]]) { pos.push(x, yy, z); uv.push(x, -z); }
  }
  for (let s = 0; s < steps; s++) {
    const a = s * 4;
    const b = a + 4;
    for (let c = 0; c < 3; c++) idx.push(a + c, b + c, a + c + 1, a + c + 1, b + c, b + c + 1);
  }
  const rampGeo = new THREE.BufferGeometry();
  rampGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rampGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  rampGeo.setIndex(idx);
  rampGeo.computeVertexNormals();
  const ramp = new THREE.Mesh(rampGeo, ground);
  ramp.receiveShadow = true;
  root.add(ramp);
  // Braziers on the ramp's curbs, lighting the way up.
  for (const z of [30, 40, 50]) {
    for (const s of [-1, 1]) {
      const stand = new THREE.Group();
      stand.position.y = domoHeight(0, z);
      root.add(stand);
      brazier(stand, torches, s * (domoRampHalf(z) + 0.8), z, look.torchColor || 0xff6a20, look, { height: 1.6, size: 0.5, reach: 22 });
    }
  }

  // The cavern floor at the ramp's foot, where the raid comes in.
  const floorShape = new THREE.Shape();
  floorShape.absellipse(F.x, -F.z, F.rx + 1.5, F.rz + 1.5, 0, Math.PI * 2, false, 0);
  flatShape(root, floorShape, ground, 0);
  const rim = add(root, new THREE.CylinderGeometry(1, 1.06, 2.4, 64, 1, true), cliff, F.x, -1.2, F.z, { shadow: false });
  rim.scale.set(F.rx + 1.5, 1, F.rz + 1.5);
  // The fire pit: glowing coals in a ring of black stones (Majordomo's Teleport throws a raider into it).
  add(root, new THREE.CircleGeometry(P.r, 32), molten(0xff4a10, 0xff3a08, 1.6), P.x, 0.04, P.z, { rx: -Math.PI / 2, shadow: false });
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    add(root, new THREE.DodecahedronGeometry(0.6 + rnd() * 0.35, 0), mat(0x141010), P.x + Math.cos(a) * (P.r + 0.4), 0.2, P.z + Math.sin(a) * (P.r + 0.4));
  }
  const coals = add(root, new THREE.SphereGeometry(1.2, 10, 6), glow(0xff6a20, 1.6), P.x, -0.6, P.z, { shadow: false });
  const pitLight = new THREE.PointLight(0xff5a18, look.torch, 24, 1.6);
  pitLight.position.set(P.x, 2, P.z);
  root.add(pitLight);
  torches.push({ flame: coals, light: pitLight, phase: 2.1 });
  // The way you came in: a rock causeway to a dark tunnel in the far wall.
  add(root, new THREE.BoxGeometry(12, 2.4, 26), cliff, 0, -1.25, F.z + F.rz + 12, { shadow: false });
  const causeway = new THREE.Shape();
  causeway.moveTo(-6, -(F.z + F.rz - 2)); causeway.lineTo(6, -(F.z + F.rz - 2)); causeway.lineTo(6, -(F.z + F.rz + 25)); causeway.lineTo(-6, -(F.z + F.rz + 25));
  flatShape(root, causeway, ground, -0.02);
  add(root, new THREE.BoxGeometry(16, 14, 4), mat(0x050303), 0, 5, W.z + W.r - 1, { shadow: false });
  for (const s of [-1, 1]) add(root, new THREE.CylinderGeometry(2.2, 3, 16, 7), cliff, s * 9, 8, W.z + W.r - 2);
  add(root, new THREE.BoxGeometry(22, 3, 5), cliff, 0, 15, W.z + W.r - 2);
  for (const s of [-1, 1]) brazier(root, torches, s * 5, F.z + F.rz - 1, look.torchColor || 0xff6a20, look, { height: 1.8, size: 0.55, reach: 26 });

  // On the terrace: Majordomo's rune circle, braziers at its back, obsidian spires behind it over the lake.
  add(root, new THREE.RingGeometry(5, 5.6, 6), glow(0xff7a2a, 1.6), 0, H + 0.04, 0, { rx: -Math.PI / 2, rz: 0.3, shadow: false });
  add(root, new THREE.RingGeometry(2.6, 2.9, 3), glow(0xff9a3a, 1.8), 0, H + 0.05, 0, { rx: -Math.PI / 2, rz: -0.3, shadow: false });
  for (const s of [-1, 1]) {
    const stand = new THREE.Group();
    stand.position.y = H;
    root.add(stand);
    brazier(stand, torches, s * 15, -8, look.torchColor || 0xff6a20, look, { height: 2.2, size: 0.7, reach: 34 });
    brazier(stand, torches, s * 19, 12, look.torchColor || 0xff6a20, look, { height: 1.8, size: 0.55, reach: 26 });
  }
  const obsidian = mat(0x120c10, { roughness: 0.4, metalness: 0.2 });
  for (let k = 0; k < 9; k++) {
    const a = Math.PI + 0.35 + (k / 8) * (Math.PI - 0.7); // the back half, behind Majordomo
    const tall = 6 + rnd() * 10;
    add(root, new THREE.ConeGeometry(1 + rnd() * 1.6, tall, 6), obsidian, T.x + Math.cos(a) * (T.r + 0.5), H + tall / 2 - 0.3, T.z + Math.sin(a) * (T.r + 0.5));
  }

  // The cavern: a rough wall of rock around the lava, leaning in under a dark vault, with lava falling down its back
  // into Ragnaros's lake beyond the terrace.
  const N = 160;
  const wallR = (a) => W.r + 5 * Math.sin(5 * a + 0.7) + 3 * Math.sin(13 * a + 2.1);
  const rings = [{ out: 0, y: -1.5 }, { out: 4, y: 18 }, { out: 0, y: 34 }, { out: -12, y: 48 }, { out: -34, y: 58 }];
  const wp = [];
  for (const ring of rings) {
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = wallR(a) + 1 + ring.out + (ring.y > 0 ? (rnd() - 0.5) * 6 : 0);
      wp.push(W.x + Math.cos(a) * r, ring.y + (ring.y > 0 ? (rnd() - 0.5) * 4 : 0), W.z + Math.sin(a) * r);
    }
  }
  const wi = [];
  for (let ri = 0; ri < rings.length - 1; ri++) for (let i = 0; i < N; i++) { const a = ri * (N + 1) + i; const b = a + N + 1; wi.push(a, b, a + 1, a + 1, b, b + 1); }
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  wallGeo.setIndex(wi);
  wallGeo.computeVertexNormals();
  add(root, wallGeo, mat(0x34241e, { side: THREE.DoubleSide }), 0, 0, 0, { shadow: false });
  const vault = add(root, new THREE.SphereGeometry(80, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x150d0b, { side: THREE.BackSide }), W.x, 52, W.z, { shadow: false });
  vault.scale.set(1, 0.3, 1);
  const fall = molten(0xff7a20, 0xff5a10, 1.6);
  for (const a of [-1.95, -1.7, -1.4, -1.15]) {
    const r = wallR(a) - 3;
    add(root, new THREE.PlaneGeometry(6 + rnd() * 4, 52), fall, W.x + Math.cos(a) * r, 25, W.z + Math.sin(a) * r, { ry: Math.atan2(-Math.cos(a), -Math.sin(a)), shadow: false });
  }
  // Stalagmites and spires along the wall, and rock columns up to the vault out in the lava.
  const rock = mat(0x3a2a24);
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2;
    const r = wallR(a) - 2 - rnd() * 14;
    const tall = 4 + rnd() * 14;
    add(root, new THREE.ConeGeometry(1 + rnd() * 2.5, tall, 6), rnd() < 0.3 ? obsidian : rock, W.x + Math.cos(a) * r, tall / 2 - 1.5, W.z + Math.sin(a) * r);
  }
  for (const [x, z] of [[-55, -10], [55, -10], [-62, 60], [62, 60], [-40, 112], [40, 112]]) add(root, new THREE.CylinderGeometry(4, 7, 64, 7), rock, x, 30, z);
  return torches;
}

export const RAID_ROOMS = {
  moltenCore: { layout: roundLayout(mcWall), build: buildMoltenCore },
  ragnaros: { layout: roundLayout(mcWall), build: (root, q, look) => buildMoltenCore(root, q, look, { ragnaros: true }) },
  majordomo: { layout: domoLayout(), build: buildMajordomoTerrace },
  blackwingLair: { layout: hallLayout(BWL.hx, BWL.hz), build: buildBlackwingLair },
  naxxramas: { layout: hallLayout(NAXX.hx, NAXX.hz), build: buildNaxxramas },
  zulGurub: { layout: roundLayout(zgWall), build: buildZulGurub },
  ruinsOfAhnQiraj: { layout: roundLayout(aqWall), build: buildRuinsOfAhnQiraj },
};
