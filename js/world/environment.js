// The world around the fight: sky, lights, ground, the arena ring with torches and waving banners,
// trees, grass, rocks, mountains, weather and a few raid members standing around. Built for a look (a time
// of day, or a zone's look from ZONE_LOOKS) and a graphics quality, and rebuilt when either changes.
import * as THREE from 'three';
import { animateCharacter, makeCharacter } from './characters.js';
import { LAIR, buildLair } from './lair.js';

export const ARENA_RADIUS = 22; // inside the ring wall

export const QUALITY = {
  // post: bloom + colour grade (needs a little GPU), bloom: glow strength.
  low: { label: 'Low', pixelRatio: 0.75, shadows: false, shadowSize: 0, soft: false, particles: 220, density: 0.4, trails: false, grass: 0, rocks: 10, trees: 35, raid: 0, snow: 300, post: false, bloom: 0 },
  medium: { label: 'Medium', pixelRatio: 1, shadows: true, shadowSize: 1024, soft: false, particles: 700, density: 0.8, trails: true, grass: 450, rocks: 25, trees: 70, raid: 4, snow: 900, post: true, bloom: 0.35 },
  high: { label: 'High', pixelRatio: Math.min(2, window.devicePixelRatio || 1), shadows: true, shadowSize: 2048, soft: true, particles: 1500, density: 1, trails: true, grass: 1400, rocks: 45, trees: 100, raid: 8, snow: 2000, post: true, bloom: 0.45 },
};

export const TIMES = {
  sunset: {
    label: 'Sunset', top: 0x2c5a8c, horizon: 0xf2c48d, bottom: 0x9fb4c4, fog: 0x9fb4c4, fogNear: 60, fogFar: 190,
    sun: 0xffe2b8, sunI: 1.6, sunPos: [30, 40, 18], hemiSky: 0xdbe9ff, hemiGround: 0x3a3020, hemiI: 0.7, torch: 6, ground: 'grass', envI: 0.55,
    sunDisc: 0xffd9a0, clouds: 0.55, cloudColor: 0xf6c6b0, rim: 0xa8c8ff, rimI: 0.7,
  },
  night: {
    label: 'Night', top: 0x02040c, horizon: 0x1a2748, bottom: 0x0b1220, fog: 0x0b1220, fogNear: 28, fogFar: 120,
    sun: 0xa8bcff, sunI: 0.55, sunPos: [-30, 50, -20], hemiSky: 0x5a6a9a, hemiGround: 0x18182a, hemiI: 0.5, torch: 18, ground: 'grass', stars: true, moon: true, envI: 0.12,
    sunDisc: 0x000000, clouds: 0.3, cloudColor: 0x1e2a44, rim: 0x6a8ad8, rimI: 0.45,
  },
  snowy: {
    label: 'Snowy', top: 0x8fa3b8, horizon: 0xe6ecf2, bottom: 0xdfe6ee, fog: 0xdfe6ee, fogNear: 24, fogFar: 110,
    sun: 0xffffff, sunI: 1.0, sunPos: [20, 45, 25], hemiSky: 0xe8f0ff, hemiGround: 0x8a8a90, hemiI: 0.85, torch: 5, ground: 'snow', snow: true, envI: 0.65,
    sunDisc: 0x8090a0, clouds: 0.85, cloudColor: 0xc8d0da, rim: 0xd8e8ff, rimI: 0.5,
  },
};

// Zone looks (js/data/zones.js): the same settings as a time of day, plus the zone's ground palette, trees,
// horizon, banner and torch colours, and features (embers, wisps, glowing mushrooms, Nordrassil in the distance).
// Settings a time of day leaves out keep the arena's usual look.
export const ZONE_LOOKS = {
  // The battle for the World Tree: a burning dusk, charred trees and embers on the wind, Nordrassil behind.
  hyjalSummit: {
    label: 'Hyjal Summit', top: 0x1a1030, horizon: 0xc4502a, bottom: 0x3a2a28, fog: 0x5a3a30, fogNear: 40, fogFar: 170,
    sun: 0xffb070, sunI: 1.2, sunPos: [-35, 18, -40], hemiSky: 0xb08080, hemiGround: 0x2a1810, hemiI: 0.6, torch: 9, ground: 'ash', envI: 0.35,
    sunDisc: 0xff7a30, clouds: 0.7, cloudColor: 0x6a3030, rim: 0xff8a5a, rimI: 0.6,
    trees: 'burnt', horizonStyle: 'peaks', rockColor: 0x5a524c, wall: 0x6e655c, banner: 0x3a2266, emblem: 0xc0c8d0, torchColor: 0xff8a3c,
    embers: true, worldTree: true,
  },
  // Night-elf forest under the moon: ancient trees, snowy peaks, wisps, moonwell-blue torches.
  mountHyjal: {
    label: 'Mount Hyjal', top: 0x0e1838, horizon: 0x6a7ab8, bottom: 0x1c2438, fog: 0x2a3458, fogNear: 45, fogFar: 170,
    sun: 0xc8d4ff, sunI: 0.8, sunPos: [30, 55, -25], hemiSky: 0x8a9ad0, hemiGround: 0x1a2418, hemiI: 0.65, torch: 10, ground: 'forest', stars: true, moon: true, envI: 0.25,
    sunDisc: 0x000000, clouds: 0.35, cloudColor: 0x3a4670, rim: 0x9ab8ff, rimI: 0.55,
    trees: 'ancient', horizonStyle: 'snowy', rockColor: 0x5c6878, wall: 0x8a8a98, banner: 0x3a2266, emblem: 0xc8d0e0, torchColor: 0x9ad0ff,
    wisps: true, worldTree: true,
  },
  // The barrow den beneath Hyjal: a dark cavern, rock walls, glowing mushrooms and blue-green flames.
  barrowDeeps: {
    label: 'The Barrow Deeps', top: 0x05070a, horizon: 0x13202a, bottom: 0x05070a, fog: 0x0c151a, fogNear: 24, fogFar: 95,
    sun: 0x88b0c0, sunI: 0.6, sunPos: [10, 50, 5], hemiSky: 0x4a6878, hemiGround: 0x141a14, hemiI: 0.8, torch: 16, ground: 'cave', envI: 0.15,
    sunDisc: 0x000000, clouds: 0, cloudColor: 0x000000, rim: 0x5ad0c0, rimI: 0.45,
    trees: 'none', horizonStyle: 'cave', rockColor: 0x3a3f44, wall: 0x4f5550, banner: 0x1e4a3a, emblem: 0x9ad8c8, torchColor: 0x5fe8d0,
    shrooms: true, wisps: true,
  },
  // The classic bosses' raids (world/encounter.js area): Molten Core's lava-lit cavern, Blackwing Lair's dark halls and
  // red-black banners, Naxxramas's cold necropolis in a sickly green.
  moltenCore: {
    label: 'Molten Core', top: 0x0a0302, horizon: 0x3a0f05, bottom: 0x0a0302, fog: 0x2a0c06, fogNear: 26, fogFar: 100,
    sun: 0xff8040, sunI: 0.9, sunPos: [10, 45, 15], hemiSky: 0xc06040, hemiGround: 0x3a1408, hemiI: 1.0, torch: 10, ground: 'ash', envI: 0.35,
    sunDisc: 0x000000, clouds: 0, cloudColor: 0x000000, rim: 0xff6a20, rimI: 0.6,
    trees: 'none', horizonStyle: 'cave', rockColor: 0x3a2620, wall: 0x4a2a20, banner: 0x5a1408, emblem: 0xff9a3a, torchColor: 0xff6a20,
    embers: true,
  },
  blackwingLair: {
    label: 'Blackwing Lair', top: 0x060408, horizon: 0x1c1018, bottom: 0x060408, fog: 0x140c14, fogNear: 26, fogFar: 100,
    sun: 0xd08060, sunI: 0.8, sunPos: [-10, 45, 20], hemiSky: 0x8a6070, hemiGround: 0x1a1014, hemiI: 0.9, torch: 12, ground: 'cave', envI: 0.25,
    sunDisc: 0x000000, clouds: 0, cloudColor: 0x000000, rim: 0xff5a40, rimI: 0.5,
    trees: 'none', horizonStyle: 'cave', rockColor: 0x2a2428, wall: 0x3a3238, banner: 0x161212, emblem: 0xc02020, torchColor: 0xff5030,
  },
  naxxramas: {
    label: 'Naxxramas', top: 0x030806, horizon: 0x0e2018, bottom: 0x030806, fog: 0x0c1a14, fogNear: 24, fogFar: 95,
    sun: 0x9adf9a, sunI: 0.7, sunPos: [10, 50, 5], hemiSky: 0x5a8a6a, hemiGround: 0x101a14, hemiI: 0.9, torch: 14, ground: 'cave', envI: 0.2,
    sunDisc: 0x000000, clouds: 0, cloudColor: 0x000000, rim: 0x6aff8a, rimI: 0.45,
    trees: 'none', horizonStyle: 'cave', rockColor: 0x3a4440, wall: 0x3a4440, banner: 0x1c2a22, emblem: 0x7aff9a, torchColor: 0x6aff8a,
    wisps: true,
  },
  // Onyxia's Lair: a lava cave under a dark ceiling, lit by the lava and braziers (js/world/lair.js builds it).
  onyxiasLair: {
    label: "Onyxia's Lair", top: 0x0a0505, horizon: 0x2a0d06, bottom: 0x0a0505, fog: 0x1a0c08, fogNear: 30, fogFar: 110,
    sun: 0xffa070, sunI: 1.0, sunPos: [10, 40, 30], hemiSky: 0xb07060, hemiGround: 0x3a2018, hemiI: 1.15, torch: 8, ground: 'cave', envI: 0.4,
    sunDisc: 0x000000, clouds: 0, cloudColor: 0x000000, rim: 0xff7a40, rimI: 0.5,
    lair: true, embers: true,
  },
};

// A look by key: a time of day or a zone.
export const lookFor = (key) => TIMES[key] || ZONE_LOOKS[key] || TIMES.sunset;

// Ground palettes: the base colour and the speckles over it.
const GROUNDS = {
  grass: { base: '#3f5a2a', speck: (g) => `rgb(${g * 0.6},${g},${g * 0.4})` },
  snow: { base: '#e4eaf0', speck: (g) => `rgb(${g},${g + 3},${Math.min(255, g + 8)})`, light: true },
  forest: { base: '#2e4a2c', speck: (g) => `rgb(${g * 0.45},${g * 0.9},${g * 0.55})` },
  ash: { base: '#2b2522', speck: (g, r) => (r < 0.04 ? `rgb(${200 + g * 0.4},${70 + g * 0.3},20)` : `rgb(${g * 0.55},${g * 0.45},${g * 0.4})`) },
  cave: { base: '#1f2428', speck: (g, r) => (r < 0.1 ? `rgb(${g * 0.3},${g * 0.7},${g * 0.45})` : `rgb(${g * 0.35},${g * 0.42},${g * 0.45})`) },
};

// Small deterministic random generator so the scenery looks the same every load.
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

const RAID_RACES = ['RaceHuman', 'RaceOrc', 'RaceTauren', 'RaceNightElf', 'RaceDwarf', 'RaceTroll', 'RaceUndead', 'RaceGnome'];

export class Environment {
  constructor(scene, renderer, { quality = 'medium', time = 'sunset' } = {}) {
    this.scene = scene;
    this.q = QUALITY[quality] || QUALITY.medium;
    this.t = lookFor(time);
    this.root = new THREE.Group();
    scene.add(this.root);
    this.torches = [];
    this.banners = [];
    this.raid = [];
    this.drifters = []; // embers and wisps
    this.clock = 0;

    renderer.setPixelRatio(this.q.pixelRatio);
    renderer.shadowMap.enabled = this.q.shadows;
    renderer.shadowMap.type = this.q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    renderer.shadowMap.needsUpdate = true;

    this.buildSkyAndLights();
    // The ground the fight stands on: the ring arena, or a lair with its own shape and slopes (layout: heightAt, clamp).
    this.layout = this.t.lair ? LAIR : null;
    if (this.layout) {
      this.torches.push(...buildLair(this.root, this.q));
    } else {
      this.buildGround();
      this.buildFlagstones();
      this.buildWall();
      this.buildScenery();
    }
    if (this.t.snow) this.buildSnow();
    if (this.t.stars) this.buildStars();
    if (this.t.worldTree) this.buildWorldTree();
    if (this.t.shrooms) this.buildShrooms();
    if (this.t.embers) this.buildDrifters('embers');
    if (this.t.wisps) this.buildDrifters('wisps');
    if (this.layout) this.buildLairRaid(); else this.buildRaid();
  }

  // Raised hexagonal flagstones scattered over the floor, like an old arena's worn paving.
  buildFlagstones() {
    const rnd = seeded(23);
    const n = 40;
    const slab = new THREE.CylinderGeometry(1, 1.05, 0.12, 6);
    const stones = new THREE.InstancedMesh(slab, new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.95, flatShading: true }), n);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = 3 + Math.sqrt(rnd()) * (ARENA_RADIUS - 4);
      const s = 0.5 + rnd() * 0.9;
      // Tops sit 2.5-4.5 cm above the floor: visible, but below the ground telegraphs (5 cm and up).
      dummy.position.set(Math.sin(a) * d, -0.035 + rnd() * 0.02, Math.cos(a) * d);
      dummy.rotation.set((rnd() - 0.5) * 0.06, rnd() * Math.PI, (rnd() - 0.5) * 0.06);
      dummy.scale.set(s, 1, s * (0.8 + rnd() * 0.4));
      dummy.updateMatrix();
      stones.setMatrixAt(i, dummy.matrix);
      const g = this.t.ground;
      const v = g === 'snow' ? 0.85 + rnd() * 0.1 : g === 'cave' || g === 'ash' ? 0.24 + rnd() * 0.12 : 0.42 + rnd() * 0.18;
      stones.setColorAt(i, color.setRGB(v, v, v * (g === 'cave' ? 1.12 : 1.02)));
    }
    stones.receiveShadow = true;
    this.root.add(stones);
  }

  dispose() {
    this.scene.remove(this.root);
    this.scene.fog = null;
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) for (const m of [].concat(o.material)) { if (m.map) m.map.dispose(); m.dispose(); }
    });
  }

  buildSkyAndLights() {
    const t = this.t;
    this.scene.fog = new THREE.Fog(t.fog, t.fogNear, t.fogFar);
    // Sky dome: a colour gradient, the sun with a glow around it, and drifting procedural clouds.
    this.skyUniforms = {
      top: { value: new THREE.Color(t.top) }, horizon: { value: new THREE.Color(t.horizon) }, bottom: { value: new THREE.Color(t.bottom) },
      sunDir: { value: new THREE.Vector3(...t.sunPos).normalize() }, sunColor: { value: new THREE.Color(t.sunDisc) },
      cloudAmount: { value: t.clouds }, cloudColor: { value: new THREE.Color(t.cloudColor) }, time: { value: 0 },
    };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.skyUniforms,
      vertexShader: 'varying vec3 vPos; void main() { vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunColor;
        uniform float cloudAmount; uniform vec3 cloudColor; uniform float time; varying vec3 vPos;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
        float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
        void main() {
          vec3 d = normalize(vPos);
          float h = d.y;
          vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.6)) : mix(horizon, bottom, min(1.0, -h * 4.0));
          float s = max(dot(d, sunDir), 0.0);
          c += sunColor * (pow(s, 900.0) * 6.0 + pow(s, 40.0) * 0.35 + pow(s, 6.0) * 0.12);
          if (h > 0.0) {
            vec2 uv = d.xz / (h + 0.2) * 1.4 + vec2(time * 0.012, time * 0.004);
            float n = smoothstep(0.48, 0.78, fbm(uv));
            vec3 lit = cloudColor + sunColor * pow(s, 8.0) * 0.6;
            c = mix(c, lit, n * cloudAmount * smoothstep(0.0, 0.2, h));
          }
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    this.root.add(sky);
    this.root.add(new THREE.HemisphereLight(t.hemiSky, t.hemiGround, t.hemiI));
    // A cool back light from the side opposite the sun, so characters keep a bright edge against the scene.
    const rim = new THREE.DirectionalLight(t.rim, t.rimI);
    rim.position.set(-t.sunPos[0], t.sunPos[1] * 0.6, -t.sunPos[2]);
    this.root.add(rim);
    const sun = new THREE.DirectionalLight(t.sun, t.sunI);
    sun.position.set(...t.sunPos);
    sun.castShadow = this.q.shadows;
    if (this.q.shadows) {
      sun.shadow.mapSize.set(this.q.shadowSize, this.q.shadowSize);
      Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 140 });
      sun.shadow.radius = this.q.soft ? 4 : 1;
      sun.shadow.bias = -0.0005;
    }
    this.root.add(sun);
    if (t.moon) {
      const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe8eeff).multiplyScalar(1.6), fog: false }));
      moon.position.set(-120, 140, -160);
      this.root.add(moon);
    }
  }

  buildGround() {
    const rnd = seeded(7);
    const snow = this.t.ground === 'snow';
    const palette = GROUNDS[this.t.ground] || GROUNDS.grass;
    const outsideTex = canvasTexture(256, 40, (ctx, s) => {
      ctx.fillStyle = palette.base;
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 2500; i++) {
        const g = palette.light ? 215 + rnd() * 35 : 70 + rnd() * 50;
        ctx.fillStyle = palette.speck(g, rnd());
        ctx.fillRect(rnd() * s, rnd() * s, 2, 3);
      }
    });
    const outside = new THREE.Mesh(new THREE.CircleGeometry(260, 64), new THREE.MeshStandardMaterial({ map: outsideTex, roughness: 1 }));
    outside.rotation.x = -Math.PI / 2;
    outside.position.y = -0.02;
    outside.receiveShadow = true;
    this.root.add(outside);

    const stone = canvasTexture(512, 6, (ctx, s) => {
      ctx.fillStyle = '#3d3d3a';
      ctx.fillRect(0, 0, s, s);
      const n = 6;
      const w = s / n;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const off = (y % 2) * w / 2;
          const dark = this.t.ground === 'cave' || this.t.ground === 'ash';
          const v = (dark ? 58 : 95) + rnd() * 40;
          ctx.fillStyle = this.t.ground === 'cave' ? `rgb(${v - 8},${v - 2},${v + 6})` : `rgb(${v},${v - 4},${v - 10})`;
          ctx.fillRect(x * w + off + 3, y * w + 3, w - 6, w - 6);
          ctx.fillRect(x * w + off - s + 3, y * w + 3, w - 6, w - 6);
          for (let k = 0; k < 40; k++) {
            ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`;
            ctx.fillRect(x * w + off + rnd() * w, y * w + rnd() * w, 3, 3);
          }
          if (snow) {
            ctx.fillStyle = `rgba(240,245,250,${0.25 + rnd() * 0.35})`;
            ctx.fillRect(x * w + off + 3, y * w + 3, w - 6, w - 6);
          }
        }
      }
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(ARENA_RADIUS + 2, 64), new THREE.MeshStandardMaterial({ map: stone, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.root.add(floor);
  }

  // The ring wall with pillars, flickering torches and banners that wave in the wind.
  buildWall() {
    const wallMat = new THREE.MeshStandardMaterial({ color: this.t.wall || (this.t.ground === 'snow' ? 0x9a948a : 0x8a8377), roughness: 0.95 });
    const r = ARENA_RADIUS + 1.5;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      if (Math.abs(Math.sin(a / 2)) < 0.05) continue;
      const block = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.4, 1), wallMat);
      block.position.set(Math.sin(a) * r, 0.7, Math.cos(a) * r);
      block.rotation.y = a;
      block.castShadow = block.receiveShadow = true;
      this.root.add(block);
      if (this.t.ground === 'snow') {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.15, 1.05), new THREE.MeshStandardMaterial({ color: 0xf2f6fa, roughness: 1 }));
        cap.position.set(Math.sin(a) * r, 1.47, Math.cos(a) * r);
        cap.rotation.y = a;
        this.root.add(cap);
      }
    }
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x6f6a61, roughness: 0.9 });
    const bannerMat = new THREE.MeshStandardMaterial({ color: this.t.banner || 0x8e1d17, roughness: 0.8, side: THREE.DoubleSide });
    const emblemMat = new THREE.MeshStandardMaterial({ color: this.t.emblem || 0xc9a24a, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide });
    const torchColor = this.t.torchColor || 0xff9a3c;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 5, 16), pillarMat);
      pillar.position.set(x, 2.5, z);
      pillar.castShadow = true;
      this.root.add(pillar);
      // Banner hanging from a pole on the inside of the pillar.
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8), pillarMat);
      pole.rotation.z = Math.PI / 2;
      pole.rotation.y = a;
      pole.position.set(x * 0.955, 4.4, z * 0.955);
      this.root.add(pole);
      const geo = new THREE.PlaneGeometry(1.2, 2.8, 6, 12);
      geo.translate(0, -1.4, 0);
      const banner = new THREE.Mesh(geo, bannerMat);
      banner.position.set(x * 0.95, 4.4, z * 0.95);
      banner.rotation.y = a + Math.PI;
      banner.castShadow = true;
      banner.userData.rest = Float32Array.from(geo.attributes.position.array);
      this.root.add(banner);
      const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), emblemMat);
      emblem.position.set(0, -0.9, 0.01);
      banner.add(emblem);
      this.banners.push({ mesh: banner, phase: i * 0.9 });

      // Over-bright so the bloom pass makes the torches glow.
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(this.t.torchColor || 0xffa640).multiplyScalar(2.2) }));
      flame.position.set(x, 5.4, z);
      this.root.add(flame);
      const light = new THREE.PointLight(torchColor, this.t.torch, 16, 1.8);
      light.position.set(x, 5.6, z);
      this.root.add(light);
      this.torches.push({ flame, light, phase: i * 1.7 });
    }
  }

  buildScenery() {
    const rnd = seeded(42);
    const q = this.q;
    const snow = this.t.ground === 'snow';
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 1 });
    const leafMats = [0x2f4f2a, 0x36592e, 0x284426].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf2f6fa, roughness: 1, flatShading: true });
    const treeStyle = this.t.trees || 'pine';
    for (let i = 0; i < (treeStyle === 'none' ? 0 : q.trees); i++) {
      const a = rnd() * Math.PI * 2;
      const d = 34 + rnd() * 70;
      const s = 0.8 + rnd() * 1.1;
      if (treeStyle !== 'pine') {
        const tree = treeStyle === 'ancient' ? this.ancientTree(s, i, rnd) : this.burntTree(s, rnd);
        tree.position.set(Math.sin(a) * d, 0, Math.cos(a) * d);
        tree.rotation.y = rnd() * Math.PI * 2;
        this.root.add(tree);
        continue;
      }
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.35 * s, 2 * s, 8), trunkMat);
      trunk.position.y = s;
      tree.add(trunk);
      for (let k = 0; k < 3; k++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry((2.2 - k * 0.55) * s, 2.6 * s, 7), leafMats[(i + k) % 3]);
        cone.position.y = (2.4 + k * 1.4) * s;
        cone.castShadow = q.shadows && d < 50;
        tree.add(cone);
        if (snow) {
          const cap = new THREE.Mesh(new THREE.ConeGeometry((1.5 - k * 0.4) * s, 1.1 * s, 7), snowMat);
          cap.position.y = (2.95 + k * 1.4) * s;
          tree.add(cap);
        }
      }
      tree.position.set(Math.sin(a) * d, 0, Math.cos(a) * d);
      this.root.add(tree);
    }

    // Mountains on the horizon (a cavern has rock walls instead).
    const rockMat = new THREE.MeshStandardMaterial({ color: this.t.rockColor || (snow ? 0x8a96a2 : 0x6c7a86), roughness: 1, flatShading: true });
    const peaks = this.t.horizonStyle === 'cave' ? 0 : 18;
    const snowyPeaks = snow || this.t.horizonStyle === 'snowy';
    if (this.t.horizonStyle === 'cave') this.buildCaveWalls(rockMat, rnd);
    for (let i = 0; i < peaks; i++) {
      const a = (i / 18) * Math.PI * 2 + rnd() * 0.2;
      const h = 30 + rnd() * 35;
      const w = 22 + rnd() * 18;
      const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 6), rockMat);
      m.position.set(Math.sin(a) * 180, h / 2 - 2, Math.cos(a) * 180);
      m.rotation.y = rnd() * Math.PI;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(w * (snowyPeaks ? 0.55 : 0.32), h * (snowyPeaks ? 0.55 : 0.32), 6), snowMat);
      cap.position.y = h * (snowyPeaks ? 0.23 : 0.34);
      m.add(cap);
      this.root.add(m);
    }

    // Rocks (instanced).
    const dummy = new THREE.Object3D();
    if (q.rocks) {
      const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: this.t.rockColor || 0x7a7670, roughness: 1, flatShading: true }), q.rocks);
      for (let i = 0; i < q.rocks; i++) {
        const a = rnd() * Math.PI * 2;
        const d = 26 + rnd() * 40;
        const s = 0.3 + rnd() * 1.3;
        dummy.position.set(Math.sin(a) * d, s * 0.3, Math.cos(a) * d);
        dummy.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
        dummy.scale.set(s, s * (0.5 + rnd() * 0.4), s);
        dummy.updateMatrix();
        rocks.setMatrixAt(i, dummy.matrix);
      }
      rocks.castShadow = q.shadows;
      rocks.receiveShadow = true;
      this.root.add(rocks);
    }

    // Grass tufts (instanced): outside the ring and along the inside of the wall.
    const forest = this.t.ground === 'forest';
    const grassy = this.t.ground === 'grass' || forest; // no grass on snow, ash or cavern rock
    if (q.grass && grassy) {
      const blade = new THREE.ConeGeometry(0.06, 0.45, 3);
      blade.translate(0, 0.22, 0);
      const grass = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0x5f8a3a, roughness: 1 }), q.grass);
      const color = new THREE.Color();
      for (let i = 0; i < q.grass; i++) {
        const a = rnd() * Math.PI * 2;
        const d = i % 5 === 0 ? 20.5 + rnd() * 1.5 : 25 + rnd() * 45;
        const s = 0.6 + rnd() * 0.9;
        dummy.position.set(Math.sin(a) * d, 0, Math.cos(a) * d);
        dummy.rotation.set((rnd() - 0.5) * 0.4, rnd() * 3, (rnd() - 0.5) * 0.4);
        dummy.scale.set(s, s * (0.8 + rnd() * 0.8), s);
        dummy.updateMatrix();
        grass.setMatrixAt(i, dummy.matrix);
        grass.setColorAt(i, forest ? color.setHSL(0.32 + rnd() * 0.08, 0.4, 0.2 + rnd() * 0.1) : color.setHSL(0.24 + rnd() * 0.06, 0.45, 0.28 + rnd() * 0.15));
      }
      this.root.add(grass);
    }
  }

  // A night-elf ancient: a tall twisting trunk under a broad teal and violet canopy.
  ancientTree(s, i, rnd) {
    const tree = new THREE.Group();
    const bark = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 1, flatShading: true });
    const leaves = [0x2f5a68, 0x45386a, 0x2c4f4a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
    const h = 7 * s;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * s, 0.9 * s, h, 9), bark);
    trunk.position.y = h / 2;
    trunk.rotation.z = (rnd() - 0.5) * 0.12;
    tree.add(trunk);
    for (let k = 0; k < 3; k++) {
      const r = (2.4 + rnd() * 1.2) * s;
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaves[(i + k) % 3]);
      crown.position.set((rnd() - 0.5) * 2.4 * s, h + (k - 0.5) * 1.2 * s, (rnd() - 0.5) * 2.4 * s);
      crown.scale.y = 0.65;
      crown.castShadow = this.q.shadows;
      tree.add(crown);
    }
    return tree;
  }

  // A tree burnt in the battle: a charred trunk and a few bare branches.
  burntTree(s, rnd) {
    const tree = new THREE.Group();
    const char = new THREE.MeshStandardMaterial({ color: 0x1e1814, roughness: 1, flatShading: true });
    const h = (3 + rnd() * 2.5) * s;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.35 * s, h, 7), char);
    trunk.position.y = h / 2;
    tree.add(trunk);
    for (let k = 0; k < 3; k++) {
      const len = (1 + rnd()) * s;
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.1 * s, len, 5), char);
      branch.position.set(0, h * (0.55 + k * 0.15), 0);
      branch.rotation.set(0, rnd() * Math.PI * 2, 0.7 + rnd() * 0.5);
      branch.translateY(len / 2);
      tree.add(branch);
    }
    return tree;
  }

  // A cavern: a ring of tall rock walls with stalagmites, where the mountains would be.
  buildCaveWalls(rockMat, rnd) {
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rnd() * 0.1;
      const d = 48 + rnd() * 10;
      const h = 30 + rnd() * 30;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rockMat);
      rock.scale.set(10 + rnd() * 6, h, 8 + rnd() * 5);
      rock.position.set(Math.sin(a) * d, h * 0.45, Math.cos(a) * d);
      rock.rotation.y = a;
      this.root.add(rock);
    }
    for (let i = 0; i < 40; i++) {
      const a = rnd() * Math.PI * 2;
      const d = 27 + rnd() * 18;
      const h = 1.5 + rnd() * 5;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.4 + rnd() * 0.8, h, 6), rockMat);
      spike.position.set(Math.sin(a) * d, h / 2, Math.cos(a) * d);
      spike.castShadow = this.q.shadows;
      this.root.add(spike);
    }
  }

  // Nordrassil, the World Tree, as a dark silhouette on the horizon (outside the fog, so always visible).
  buildWorldTree() {
    const tree = new THREE.Group();
    const trunkMat = new THREE.MeshBasicMaterial({ color: 0x241a24, fog: false });
    const crownMat = new THREE.MeshBasicMaterial({ color: 0x1c2a34, fog: false });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(10, 20, 170, 12), trunkMat);
    trunk.position.y = 85;
    tree.add(trunk);
    const rnd = seeded(5);
    for (let k = 0; k < 7; k++) {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(38 + rnd() * 18, 1), crownMat);
      crown.position.set((rnd() - 0.5) * 90, 165 + rnd() * 40, (rnd() - 0.5) * 50);
      crown.scale.y = 0.55;
      tree.add(crown);
    }
    tree.position.set(-90, -4, -235);
    this.root.add(tree);
  }

  // Glowing mushrooms around the barrow den (bright enough for the bloom pass to make them glow).
  buildShrooms() {
    const rnd = seeded(11);
    const n = Math.max(12, Math.round(40 * this.q.density));
    const stem = new THREE.MeshStandardMaterial({ color: 0x9aa8a0, roughness: 0.8 });
    const caps = [0x3fe0c8, 0x6a9cff, 0xa070ff].map((c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.6) }));
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = 22.5 + rnd() * 16;
      const s = 0.5 + rnd() * 1.4;
      const g = new THREE.Group();
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 0.7 * s, 6), stem);
      st.position.y = 0.35 * s;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.35 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), caps[i % 3]);
      cap.position.y = 0.7 * s;
      g.add(st, cap);
      g.position.set(Math.sin(a) * d, 0, Math.cos(a) * d);
      this.root.add(g);
    }
  }

  // Embers rising from the burning battlefield, or wisps drifting through the forest and the barrow.
  buildDrifters(kind) {
    const ember = kind === 'embers';
    const n = Math.round((ember ? 260 : 120) * this.q.density);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 1] = Math.random() * (ember ? 18 : 8);
      pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(g, new THREE.PointsMaterial({
      color: ember ? 0xff8a30 : 0x8ff0ff, size: ember ? 0.14 : 0.22, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    points.frustumCulled = false;
    this.root.add(points);
    this.drifters.push({ points, ember });
  }

  buildSnow() {
    const n = this.q.snow;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.snow = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.9, depthWrite: false }));
    this.snow.frustumCulled = false;
    this.root.add(this.snow);
  }

  buildStars() {
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const h = 0.08 + Math.random() * 0.9;
      const r = 250;
      pos[i * 3] = Math.cos(a) * Math.sqrt(1 - h * h) * r;
      pos[i * 3 + 1] = h * r;
      pos[i * 3 + 2] = Math.sin(a) * Math.sqrt(1 - h * h) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false })));
  }

  // Raid members standing along the wall, waiting their turn.
  // A lair's raid: the melee at the boss's flanks, the casters and hunters further back in the room (the layout's raid
  // spots), all facing the boss. Not shown on low quality.
  buildLairRaid() {
    if (!this.q.raid) return;
    const spots = this.layout.raidSpots;
    const boss = this.layout.onyxia;
    spots.forEach(([x, z], i) => {
      const m = makeCharacter({ race: RAID_RACES[i % RAID_RACES.length], role: 'raid' });
      m.position.set(x, this.layout.heightAt(x, z), z);
      m.rotation.y = Math.atan2(boss.x - x, boss.z - z);
      m.userData.cheer = 2 + (i % 5);
      this.root.add(m);
      this.raid.push(m);
    });
  }

  buildRaid() {
    const rnd = seeded(99);
    for (let i = 0; i < this.q.raid; i++) {
      const race = RAID_RACES[i % RAID_RACES.length];
      const m = makeCharacter({ race, role: 'raid' });
      // Along the left and right sides of the ring, clear of the start positions in front and behind.
      const perSide = Math.ceil(this.q.raid / 2);
      const a = (i % 2 ? 1 : -1) * Math.PI / 2 + ((Math.floor(i / 2) + 0.5) / perSide - 0.5) * 1.3;
      const d = 18.5 + rnd() * 1.5;
      m.position.set(Math.sin(a) * d, 0, Math.cos(a) * d);
      m.rotation.y = Math.atan2(-m.position.x, -m.position.z) + (rnd() - 0.5) * 0.6;
      m.userData.cheer = 3 + rnd() * 6;
      this.root.add(m);
      this.raid.push(m);
    }
  }

  update(dt, cameraPos, combat) {
    this.clock += dt;
    const t = this.clock;
    if (this.skyUniforms) this.skyUniforms.time.value = t;
    for (const torch of this.torches) {
      const f = 0.85 + Math.sin(t * 9 + torch.phase) * 0.08 + Math.sin(t * 23 + torch.phase * 2) * 0.05;
      torch.light.intensity = this.t.torch * f;
      torch.flame.scale.setScalar(f);
    }
    for (const b of this.banners) {
      const pos = b.mesh.geometry.attributes.position;
      const rest = b.mesh.userData.rest;
      for (let i = 0; i < pos.count; i++) {
        const x = rest[i * 3];
        const y = rest[i * 3 + 1];
        const v = -y / 2.8;
        pos.setZ(i, Math.sin(t * 2.2 + v * 3 + x * 2 + b.phase) * 0.12 * v + Math.sin(t * 5.3 + v * 7) * 0.025 * v);
      }
      pos.needsUpdate = true;
      b.mesh.geometry.computeVertexNormals();
    }
    if (this.snow) {
      const p = this.snow.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * (1.2 + (i % 7) * 0.12);
        let x = p.getX(i) + Math.sin(t + i) * dt * 0.3;
        let z = p.getZ(i);
        if (y < 0) { y = 25; x = cameraPos.x + (Math.random() - 0.5) * 60; z = cameraPos.z + (Math.random() - 0.5) * 60; }
        p.setXYZ(i, x, y, z);
      }
      p.needsUpdate = true;
    }
    // Embers rise and drift on the wind; wisps wander slowly. Both wrap around the camera.
    for (const d of this.drifters) {
      const p = d.points.geometry.attributes.position;
      const top = d.ember ? 18 : 8;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i) + (d.ember ? Math.sin(t * 0.7 + i) * 0.6 + 0.4 : Math.sin(t * 0.5 + i * 1.3) * 0.5) * dt;
        let y = p.getY(i) + (d.ember ? 1.1 + (i % 5) * 0.25 : Math.sin(t * 0.8 + i) * 0.3) * dt;
        let z = p.getZ(i) + (d.ember ? Math.cos(t * 0.6 + i) * 0.5 : Math.cos(t * 0.45 + i * 0.7) * 0.5) * dt;
        if (y > top || y < 0.2) y = d.ember ? 0.2 : 0.5 + Math.random() * 4;
        if (Math.abs(x - cameraPos.x) > 35) x = cameraPos.x + (Math.random() - 0.5) * 60;
        if (Math.abs(z - cameraPos.z) > 35) z = cameraPos.z + (Math.random() - 0.5) * 60;
        p.setXYZ(i, x, y, z);
      }
      p.needsUpdate = true;
    }
    for (const m of this.raid) {
      m.userData.cheer -= dt;
      if (m.userData.cheer <= 0) {
        // Alternate cheering and practice swings while waiting.
        if (Math.random() < 0.5 && !this.layout) m.userData.anim.cheer = 1; else m.userData.anim.mh = 1; // in a lair they fight
        m.userData.cheer = 4 + Math.random() * 8;
      }
      animateCharacter(m, { dt, speed: 0, air: false, combat });
    }
  }
}
