// Visual effects: a particle system (sparks, fire, embers, smoke, dust), weapon swing trails, expanding
// rings and short light flashes. Everything is pooled and sized by the graphics quality.
import * as THREE from 'three';

const VERT = `
attribute float size;
attribute float alpha;
attribute vec3 color;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vAlpha = alpha;
  vColor = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (320.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying float vAlpha;
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  float soft = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor, vAlpha * soft);
}`;

// One pool of point particles. additive: glowing (sparks, fire); otherwise normal blending (dust, smoke).
class Particles {
  constructor(scene, capacity, additive) {
    this.cap = capacity;
    this.p = Array.from({ length: capacity }, () => ({ life: 0 }));
    this.next = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo = g;
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  // o: { pos, vel, life, size, color (THREE.Color), gravity, drag, grow, fade }
  spawn(o) {
    const p = this.p[this.next];
    this.next = (this.next + 1) % this.cap;
    Object.assign(p, {
      x: o.pos.x, y: o.pos.y, z: o.pos.z, vx: o.vel.x, vy: o.vel.y, vz: o.vel.z,
      life: o.life, max: o.life, size: o.size, grow: o.grow || 0, color: o.color, gravity: o.gravity || 0,
      drag: o.drag || 0, a0: o.alpha == null ? 1 : o.alpha,
    });
  }

  update(dt) {
    for (let i = 0; i < this.cap; i++) {
      const p = this.p[i];
      if (p.life <= 0) { this.alpha[i] = 0; continue; }
      p.life -= dt;
      p.vy -= p.gravity * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy *= d; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.size += p.grow * dt;
      const k = Math.max(0, p.life / p.max);
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = p.color.r; this.col[i * 3 + 1] = p.color.g; this.col[i * 3 + 2] = p.color.b;
      this.size[i] = p.size;
      this.alpha[i] = p.a0 * Math.min(1, k * 2.2) * Math.min(1, (1 - k) * 8 + 0.2);
    }
    for (const name of ['position', 'color', 'size', 'alpha']) this.geo.attributes[name].needsUpdate = true;
  }

  dispose(scene) {
    scene.remove(this.points);
    this.geo.dispose();
    this.points.material.dispose();
  }
}

// A ribbon that follows a weapon's base and tip while it swings.
class Trail {
  constructor(scene, color, length = 14) {
    this.n = length;
    this.samples = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(length * 2 * 3);
    this.col = new Float32Array(length * 2 * 3);
    const idx = [];
    for (let i = 0; i < length - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo = g;
    this.color = new THREE.Color(color);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  // points: [base, tip] world positions or null; active: whether the weapon is swinging.
  update(points, active) {
    if (active && points) this.samples.unshift(points);
    else if (this.samples.length) this.samples.pop();
    if (this.samples.length > this.n) this.samples.length = this.n;
    const s = this.samples;
    for (let i = 0; i < this.n; i++) {
      const pair = s[Math.min(i, s.length - 1)];
      const fade = s.length ? Math.max(0, 1 - i / s.length) ** 1.5 * 0.85 : 0;
      for (let e = 0; e < 2; e++) {
        const v = pair ? pair[e] : null;
        const o = (i * 2 + e) * 3;
        this.pos[o] = v ? v.x : 0; this.pos[o + 1] = v ? v.y : -100; this.pos[o + 2] = v ? v.z : 0;
        const k = fade * (e === 1 ? 1 : 0.15);
        this.col[o] = this.color.r * k; this.col[o + 1] = this.color.g * k; this.col[o + 2] = this.color.b * k;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.computeBoundingSphere();
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.geo.dispose();
  }
}

const C = (hex) => new THREE.Color(hex);
const rnd = (a, b) => a + Math.random() * (b - a);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

export class Effects {
  constructor(scene, quality) {
    this.scene = scene;
    this.q = quality;
    this.glow = new Particles(scene, quality.particles, true);
    this.soft = new Particles(scene, Math.round(quality.particles * 0.6), false);
    this.trails = quality.trails ? { R: new Trail(scene, 0xfff1c8), L: new Trail(scene, 0xffe0a0) } : null;
    this.rings = [];
    this.lights = [];
    this.flash = new THREE.PointLight(0xffd080, 0, 8, 2);
    scene.add(this.flash);
    this.flashLeft = 0;
  }

  dispose() {
    this.glow.dispose(this.scene);
    this.soft.dispose(this.scene);
    if (this.trails) { this.trails.R.dispose(this.scene); this.trails.L.dispose(this.scene); }
    for (const r of this.rings) this.scene.remove(r.mesh);
    this.scene.remove(this.flash);
  }

  // Sparks where an attack lands. crit: a bigger, brighter burst with a flash of light.
  hit(pos, { crit = false, yellow = false, miss = false } = {}) {
    if (miss) return;
    const n = Math.round((crit ? 26 : 9) * this.q.density);
    const color = crit ? C(0xffd34a) : yellow ? C(0xffe9a0) : C(0xffffff);
    for (let i = 0; i < n; i++) {
      const dir = v3(rnd(-1, 1), rnd(-0.2, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(2, crit ? 9 : 5));
      this.glow.spawn({ pos, vel: dir, life: rnd(0.2, 0.45), size: crit ? rnd(0.14, 0.26) : rnd(0.08, 0.15), color, gravity: 9, drag: 2 });
    }
    if (crit) {
      this.flash.position.copy(pos);
      this.flash.intensity = 10;
      this.flashLeft = 0.18;
      this.ring(pos.x, pos.z, 0.4, 1.6, 0xffd34a, 0.3, pos.y);
    }
  }

  // Expanding ring on the ground (or at height y).
  ring(x, z, r0, r1, color, seconds, y = 0.08, width = 0.18) {
    const m = new THREE.Mesh(new THREE.RingGeometry(1 - width, 1, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    this.scene.add(m);
    this.rings.push({ mesh: m, r0, r1, t: 0, dur: seconds });
  }

  // Battle Shout: golden rings and rising motes.
  shout(pos) {
    this.ring(pos.x, pos.z, 0.5, 9, 0xffc840, 0.9);
    this.ring(pos.x, pos.z, 0.3, 6, 0xffe08a, 0.7, 1.2);
    for (let i = 0; i < 30 * this.q.density; i++) {
      const a = rnd(0, Math.PI * 2);
      this.glow.spawn({ pos: v3(pos.x + Math.cos(a) * 0.6, 0.3, pos.z + Math.sin(a) * 0.6), vel: v3(Math.cos(a) * 3, rnd(2, 5), Math.sin(a) * 3), life: rnd(0.5, 0.9), size: 0.2, color: C(0xffcf5a), drag: 1.5 });
    }
  }

  // Whirlwind: a horizontal streak ring around you and dust kicked up.
  whirl(pos) {
    this.ring(pos.x, pos.z, 0.8, 4.2, 0xdfe8ff, 0.45, 1.1, 0.08);
    this.ring(pos.x, pos.z, 1, 5, 0xc8b89a, 0.5, 0.1, 0.25);
    for (let i = 0; i < 18 * this.q.density; i++) {
      const a = rnd(0, Math.PI * 2);
      this.soft.spawn({ pos: v3(pos.x + Math.cos(a) * 1.5, 0.2, pos.z + Math.sin(a) * 1.5), vel: v3(Math.cos(a) * 3, rnd(0.5, 1.5), Math.sin(a) * 3), life: rnd(0.5, 0.9), size: rnd(0.5, 0.9), grow: 1.5, color: C(0x9c8a70), alpha: 0.5, drag: 2 });
    }
  }

  // Dust behind your feet while charging.
  dust(pos, dir) {
    for (let i = 0; i < 2 * this.q.density + 1; i++) {
      this.soft.spawn({ pos: v3(pos.x + rnd(-0.3, 0.3), 0.15, pos.z + rnd(-0.3, 0.3)), vel: v3(-dir.x * rnd(1, 3) + rnd(-0.6, 0.6), rnd(0.4, 1.4), -dir.z * rnd(1, 3) + rnd(-0.6, 0.6)), life: rnd(0.6, 1.1), size: rnd(0.4, 0.8), grow: 1.8, color: C(0xa89478), alpha: 0.55, drag: 1.5 });
    }
  }

  // Fiery aura (Death Wish, Recklessness): flames licking up around you.
  aura(pos, dt, strong) {
    const rate = (strong ? 70 : 40) * this.q.density * dt;
    for (let i = 0; i < rate; i++) {
      const a = rnd(0, Math.PI * 2);
      const r = rnd(0.3, 0.6);
      this.glow.spawn({ pos: v3(pos.x + Math.cos(a) * r, rnd(0.1, 1.6), pos.z + Math.sin(a) * r), vel: v3(0, rnd(1, 2.5), 0), life: rnd(0.3, 0.6), size: rnd(0.15, 0.3), color: Math.random() < 0.5 ? C(0xff5a1a) : C(0xffa030), drag: 1 });
    }
  }

  // Flame Patch: rising embers and grey smoke.
  fire(x, z, radius, dt) {
    const rate = 45 * this.q.density * dt;
    for (let i = 0; i < rate; i++) {
      const a = rnd(0, Math.PI * 2);
      const r = Math.sqrt(Math.random()) * radius;
      this.glow.spawn({ pos: v3(x + Math.cos(a) * r, 0.1, z + Math.sin(a) * r), vel: v3(rnd(-0.3, 0.3), rnd(1.5, 3.5), rnd(-0.3, 0.3)), life: rnd(0.4, 1.0), size: rnd(0.15, 0.4), color: Math.random() < 0.6 ? C(0xff6a1a) : C(0xffc040), drag: 0.5 });
      if (Math.random() < 0.35) this.soft.spawn({ pos: v3(x + Math.cos(a) * r, 0.6, z + Math.sin(a) * r), vel: v3(rnd(-0.2, 0.2), rnd(0.8, 1.6), rnd(-0.2, 0.2)), life: rnd(1.2, 2.2), size: rnd(0.5, 0.9), grow: 1.2, color: C(0x3a3632), alpha: 0.35, drag: 0.3 });
    }
  }

  // Swing trails: called every frame with the blade points of each hand and whether it is swinging.
  trailsUpdate(points, active) {
    if (!this.trails) return;
    this.trails.R.update(points.R, active.R);
    this.trails.L.update(points.L, active.L);
  }

  update(dt) {
    this.glow.update(dt);
    this.soft.update(dt);
    for (const r of [...this.rings]) {
      r.t += dt;
      const k = r.t / r.dur;
      if (k >= 1) { this.scene.remove(r.mesh); r.mesh.geometry.dispose(); this.rings.splice(this.rings.indexOf(r), 1); continue; }
      const e = 1 - (1 - k) ** 3;
      r.mesh.scale.setScalar(r.r0 + (r.r1 - r.r0) * e);
      r.mesh.material.opacity = 0.85 * (1 - k);
    }
    if (this.flashLeft > 0) {
      this.flashLeft -= dt;
      this.flash.intensity = Math.max(0, this.flashLeft / 0.18) * 10;
    }
  }
}
