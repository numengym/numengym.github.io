// Spell and ability visuals in the arena: bolts that fly to the target and burst there, beams for channels, novas
// around you, areas on the ground (Blizzard, Flamestrike, Rain of Fire, Hurricane, Hellfire), strike arcs for melee
// abilities, shields and auras on you, and puffs for damage over time and heals. Cosmetic only: the fight has already
// settled what happened (main.js picks the visual from the fight's events).
import * as THREE from 'three';
import { SPELL_COLORS } from './spell-animation.js';
import { chainHealEffect } from './chain-heal.js';
import { windfuryEffect } from './windfury-fx.js';

export const FX_COLORS = Object.freeze({ ...SPELL_COLORS, physical: 0xf4ead8, bleed: 0xd0262e, heal: 0x7dff8a });
const C = (hex) => new THREE.Color(hex);
const rnd = (a, b) => a + Math.random() * (b - a);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const forwardOf = (yaw) => v3(Math.sin(yaw), 0, Math.cos(yaw));
const additive = (color, opacity = 0.85) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

// What each lasting effect on you looks like (setAuras): a bubble, a block of ice, orbs circling you, motes rising.
const AURA_LOOKS = {
  iceBarrier: { kind: 'bubble', color: 0x9fdcff, radius: 1.15, opacity: 0.22 },
  holyShield: { kind: 'bubble', color: 0xffe08a, radius: 1.1, opacity: 0.16 },
  iceBlock: { kind: 'block', color: 0xbfe9ff },
  waterShield: { kind: 'orbs', color: 0x4fb4ff, count: 3 },
  shadowguard: { kind: 'orbs', color: 0x8a52d6, count: 3 },
  touchOfWeakness: { kind: 'orbs', color: 0x5b3a8c, count: 1 },
  barkskin: { kind: 'motes', color: 0x9a7a3c },
  powerInfusion: { kind: 'motes', color: 0xffd76a },
  elunesGrace: { kind: 'motes', color: 0xd8e6ff },
  arcanePower: { kind: 'motes', color: 0xc787ff },
  combustion: { kind: 'motes', color: 0xff7a2a },
  innerFocus: { kind: 'motes', color: 0xffffff },
  retributionAura: { kind: 'ring', color: 0xffcf5a },
  righteousFury: { kind: 'ring', color: 0xff9a3c },
};

export class SpellFx {
  constructor(arena) {
    this.arena = arena;
    this.items = [];      // bolts, beams, areas, arcs: each { update(dt) -> keep?, dispose() }
    this.auraMeshes = {}; // id -> the mesh following you
  }

  get particles() { return this.arena.fx; }
  get scene() { return this.arena.scene; }
  get density() { return this.arena.fx.q.density; }

  // ---- where things are --------------------------------------------------------------------------------

  // Between your hands, a little in front of you.
  hands() {
    const p = this.arena.player.position;
    return p.clone().addScaledVector(forwardOf(this.arena.yaw), 0.45).setY(p.y + 1.35);
  }
  // Target i's middle (or its ground point), or null when it is gone.
  body(i) {
    const d = this.arena.dummies[i];
    return d ? d.position.clone().setY(d.position.y + d.userData.height * 0.55) : null;
  }
  ground(i) {
    const d = this.arena.dummies[i];
    return d ? v3(d.position.x, this.arena.groundY(d.position.x, d.position.z) + 0.08, d.position.z) : null;
  }

  add(item) { this.items.push(item); }

  chainHeal(anchors) { this.add(chainHealEffect(this.scene, this.arena.camera, anchors)); }
  // Windfury Totem's extra attack: wind around whoever it procs on (you, in your form if you are in one, or another
  // player in the group); a new proc on them replaces the last. clearWindfury: all of them (a new fight).
  windfury(model = this.arena.formModel || this.arena.player) {
    this.clearWindfury(model);
    this.add(windfuryEffect(this.scene, model));
  }
  clearWindfury(model = null) {
    this.items = this.items.filter((item) => {
      if (item.kind !== 'windfury' || (model && item.model !== model)) return true;
      item.dispose();
      return false;
    });
  }
  clearChainHeals() {
    this.items = this.items.filter((item) => { if (item.kind !== 'chain-heal') return true; item.dispose(); return false; });
  }

  update(dt) {
    this.items = this.items.filter((it) => {
      const keep = it.update(dt);
      if (!keep && it.dispose) it.dispose();
      return keep;
    });
    this.updateAuras(dt);
  }

  // ---- bursts and puffs -----------------------------------------------------------------------------------

  // A spell landing: a burst of its colour and a ring, bigger on a crit.
  impact(pos, color, crit = false) {
    const n = Math.round((crit ? 30 : 14) * this.density);
    for (let k = 0; k < n; k++) {
      const dir = v3(rnd(-1, 1), rnd(-0.3, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(1.5, crit ? 6 : 3.5));
      this.particles.glow.spawn({ pos, vel: dir, life: rnd(0.25, 0.55), size: rnd(0.12, crit ? 0.32 : 0.22), color: C(color), drag: 3 });
    }
    this.particles.ring(pos.x, pos.z, 0.2, crit ? 2 : 1.2, color, 0.35, pos.y, 0.25);
  }

  // A tick of damage over time (or a channel's tick): a few motes around the target's middle.
  tick(i, color) {
    const at = this.body(i);
    if (!at) return;
    for (let k = 0; k < 6 * this.density + 1; k++) {
      this.particles.glow.spawn({ pos: at.clone().add(v3(rnd(-0.4, 0.4), rnd(-0.5, 0.5), rnd(-0.4, 0.4))), vel: v3(rnd(-0.5, 0.5), rnd(0.6, 1.6), rnd(-0.5, 0.5)), life: rnd(0.4, 0.8), size: rnd(0.1, 0.2), color: C(color), drag: 1.5 });
    }
  }

  // A heal on you: green motes rising.
  heal() {
    const p = this.arena.player.position;
    for (let k = 0; k < 12 * this.density + 2; k++) {
      const a = rnd(0, Math.PI * 2);
      this.particles.glow.spawn({ pos: v3(p.x + Math.cos(a) * 0.5, p.y + rnd(0.2, 1.4), p.z + Math.sin(a) * 0.5), vel: v3(0, rnd(1, 2), 0), life: rnd(0.6, 1), size: rnd(0.1, 0.2), color: C(FX_COLORS.heal), drag: 1 });
    }
  }

  // ---- bolts --------------------------------------------------------------------------------------------

  // A bolt from your hands (or from `from`) to target i: a glowing core leaving a trail, a burst where it lands.
  bolt(i, color, { size = 0.15, speed = 26, from = null, crit = false } = {}) {
    const to = this.body(i);
    if (!to) return;
    const start = from || this.hands();
    const core = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 8), additive(color, 1));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(size * 2.2, 10, 8), additive(color, 0.25));
    core.add(halo);
    core.position.copy(start);
    this.scene.add(core);
    const time = Math.max(0.12, start.distanceTo(to) / speed);
    let t = 0;
    this.add({
      update: (dt) => {
        t += dt;
        const k = Math.min(1, t / time);
        core.position.lerpVectors(start, to, k);
        core.position.y += Math.sin(Math.PI * k) * 0.4;
        this.particles.glow.spawn({ pos: core.position.clone(), vel: v3(rnd(-0.3, 0.3), rnd(-0.3, 0.3), rnd(-0.3, 0.3)), life: 0.25, size: size * 1.4, color: C(color), drag: 2 });
        if (k < 1) return true;
        this.impact(to, color, crit);
        return false;
      },
      dispose: () => { this.scene.remove(core); core.geometry.dispose(); core.material.dispose(); halo.geometry.dispose(); halo.material.dispose(); },
    });
  }

  // A star falling on target i (Starshards).
  star(i, color) {
    const to = this.body(i);
    if (to) this.bolt(i, color, { size: 0.12, speed: 22, from: to.clone().add(v3(rnd(-1, 1), 7, rnd(-1, 1))) });
  }

  // ---- beams --------------------------------------------------------------------------------------------

  // A channel's beam from your hands to target i for `duration` seconds (Mind Flay, Drain Life); stop() ends it early.
  beam(i, color, duration) {
    const mat = additive(color, 0.55);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8, 1, true), mat);
    this.scene.add(mesh);
    let t = 0;
    const item = {
      stopped: false,
      update: (dt) => {
        t += dt;
        const to = this.body(i);
        if (item.stopped || t >= duration || !to) return false;
        const from = this.hands();
        const mid = from.clone().lerp(to, 0.5);
        const len = from.distanceTo(to);
        mesh.position.copy(mid);
        mesh.scale.set(1 + 0.4 * Math.sin(t * 20), len, 1 + 0.4 * Math.sin(t * 20));
        mesh.quaternion.setFromUnitVectors(v3(0, 1, 0), to.clone().sub(from).normalize());
        mat.opacity = 0.4 + 0.2 * Math.sin(t * 14);
        // Motes drawn along it (toward you for a drain, toward the target otherwise).
        if (Math.random() < 0.6 * this.density) {
          const k = Math.random();
          this.particles.glow.spawn({ pos: from.clone().lerp(to, k), vel: v3(rnd(-0.3, 0.3), rnd(-0.3, 0.3), rnd(-0.3, 0.3)), life: 0.3, size: rnd(0.08, 0.16), color: C(color), drag: 2 });
        }
        return true;
      },
      dispose: () => { this.scene.remove(mesh); mesh.geometry.dispose(); mat.dispose(); },
    };
    this.add(item);
    return item;
  }
  stopBeams() { for (const it of this.items) if ('stopped' in it) it.stopped = true; }

  // ---- around you ---------------------------------------------------------------------------------------

  // A nova from you (Arcane Explosion, Frost Nova, Holy Nova, Blast Wave, Demoralizing Roar): rings and a burst outward.
  nova(color, radius) {
    const p = this.arena.player.position;
    this.particles.ring(p.x, p.z, 0.5, radius, color, 0.5, p.y + 0.12, 0.2);
    this.particles.ring(p.x, p.z, 0.3, radius * 0.7, color, 0.4, p.y + 1, 0.08);
    const n = Math.round(40 * this.density);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      this.particles.glow.spawn({ pos: v3(p.x + Math.cos(a) * 0.6, p.y + rnd(0.3, 1.2), p.z + Math.sin(a) * 0.6), vel: v3(Math.cos(a) * radius * 1.6, rnd(-0.2, 0.6), Math.sin(a) * radius * 1.6), life: 0.55, size: rnd(0.14, 0.26), color: C(color), drag: 2.5 });
    }
  }

  // A strike's arc in front of you, toward target i (a melee ability): a bright crescent that sweeps and fades.
  slash(i, color, crit = false) {
    const p = this.arena.player.position;
    const to = this.body(i);
    if (!to) return;
    const dir = to.clone().setY(p.y).sub(p).normalize();
    const geo = new THREE.RingGeometry(0.75, crit ? 1.05 : 0.95, 24, 1, -1.1, 2.2);
    const mat = additive(color, 0.9);
    const arc = new THREE.Mesh(geo, mat);
    arc.position.copy(p).addScaledVector(dir, 0.55).setY(p.y + 1.15);
    arc.lookAt(arc.position.clone().add(dir));
    arc.rotateZ(rnd(-0.9, 0.9));
    this.scene.add(arc);
    let t = 0;
    this.add({
      update: (dt) => {
        t += dt;
        const k = t / 0.22;
        arc.rotateZ(dt * 9);
        arc.scale.setScalar(1 + k * 0.4);
        mat.opacity = 0.9 * (1 - k);
        return k < 1;
      },
      dispose: () => { this.scene.remove(arc); geo.dispose(); mat.dispose(); },
    });
  }

  // ---- areas --------------------------------------------------------------------------------------------

  // An area for `duration` seconds: on the ground under target i (Blizzard, Flamestrike, Rain of Fire, Hurricane) or
  // around you (Hellfire: i is null). kind picks the look.
  area(i, kind, radius, duration) {
    const at = i == null ? null : this.ground(i);
    if (i != null && !at) return null;
    const color = { blizzard: 0x9fdcff, fire: 0xff6a1a, hurricane: 0x9be7a0, hellfire: 0xff5a1a, holy: 0xffd76a, volley: 0xb59cff }[kind] || 0xffffff;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), additive(color, 0.2));
    disc.rotation.x = -Math.PI / 2;
    // Its edge, a brighter rim.
    const rim = new THREE.Mesh(new THREE.RingGeometry(radius * 0.96, radius, 48), additive(color, 0.6));
    disc.add(rim);
    this.scene.add(disc);
    let t = 0;
    const item = {
      stopped: false,
      update: (dt) => {
        t += dt;
        if (item.stopped || t >= duration) return false;
        const c = at || this.arena.player.position.clone().setY(this.arena.player.position.y + 0.08);
        disc.position.copy(c);
        disc.material.opacity = 0.16 + 0.06 * Math.sin(t * 6);
        const rate = (kind === 'hurricane' ? 160 : 110) * this.density * dt * radius / 5;
        for (let k = 0; k < rate; k++) {
          const a = rnd(0, Math.PI * 2);
          const r = Math.sqrt(Math.random()) * radius;
          const x = c.x + Math.cos(a) * r;
          const z = c.z + Math.sin(a) * r;
          if (kind === 'blizzard') this.particles.glow.spawn({ pos: v3(x, c.y + rnd(5, 8), z), vel: v3(rnd(-1, 1), -14, rnd(-1, 1)), life: 0.5, size: rnd(0.25, 0.42), color: C(Math.random() < 0.5 ? 0xbfe9ff : 0x6fc6ff) });
          if (kind === 'blizzard' && Math.random() < 0.3) this.particles.soft.spawn({ pos: v3(x, c.y + 0.3, z), vel: v3(rnd(-0.4, 0.4), rnd(0.2, 0.6), rnd(-0.4, 0.4)), life: rnd(0.8, 1.4), size: rnd(0.6, 1.1), grow: 1.4, color: C(0xd8f2ff), alpha: 0.35, drag: 1 });
          else if (kind === 'volley') this.particles.glow.spawn({ pos: v3(x - 1.5, c.y + rnd(7, 9), z - 1.5), vel: v3(4, -20, 4), life: 0.4, size: rnd(0.12, 0.2), color: C(Math.random() < 0.5 ? 0xd8ccff : 0x9b80ff) });
          else if (kind === 'fire') this.particles.glow.spawn({ pos: v3(x, c.y + rnd(6, 9), z), vel: v3(rnd(-0.5, 0.5), -15, rnd(-0.5, 0.5)), life: 0.55, size: rnd(0.35, 0.6), color: C(Math.random() < 0.6 ? 0xff6a1a : 0xffc040) });
          else if (kind === 'hurricane') {
            const h = rnd(0.2, 4);
            this.particles.glow.spawn({ pos: v3(c.x + Math.cos(a) * r, c.y + h, c.z + Math.sin(a) * r), vel: v3(-Math.sin(a) * 7, rnd(0.5, 2), Math.cos(a) * 7), life: rnd(0.4, 0.8), size: rnd(0.18, 0.32), color: C(Math.random() < 0.5 ? 0xc8f5cf : 0x9be7a0), drag: 0.5 });
          } else if (kind === 'holy') this.particles.glow.spawn({ pos: v3(x, c.y + 0.1, z), vel: v3(0, rnd(1, 2.5), 0), life: rnd(0.4, 0.9), size: rnd(0.12, 0.22), color: C(0xffd76a), drag: 1 });
        }
        if (kind === 'fire' || kind === 'hellfire') this.particles.fire(c.x, c.z, radius * (kind === 'hellfire' ? 0.9 : 0.6), dt);
        return true;
      },
      dispose: () => { this.scene.remove(disc); disc.geometry.dispose(); disc.material.dispose(); rim.geometry.dispose(); rim.material.dispose(); },
    };
    this.add(item);
    return item;
  }

  // ---- shields and auras on you -------------------------------------------------------------------------

  // The effects on you this frame (ids from AURA_LOOKS); each shows while it is in the list.
  setAuras(ids) {
    const want = new Set(ids.filter((id) => AURA_LOOKS[id]));
    for (const id of Object.keys(this.auraMeshes)) {
      if (want.has(id)) continue;
      const m = this.auraMeshes[id];
      this.scene.remove(m);
      m.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      delete this.auraMeshes[id];
    }
    for (const id of want) {
      if (this.auraMeshes[id] !== undefined) continue;
      const look = AURA_LOOKS[id];
      let m = null;
      if (look.kind === 'bubble') m = new THREE.Mesh(new THREE.SphereGeometry(look.radius, 24, 16), additive(look.color, look.opacity));
      else if (look.kind === 'block') m = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 1.3), new THREE.MeshPhysicalMaterial({ color: look.color, transparent: true, opacity: 0.55, roughness: 0.05, transmission: 0.4, depthWrite: false }));
      else if (look.kind === 'orbs') {
        m = new THREE.Group();
        for (let k = 0; k < look.count; k++) m.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), additive(look.color, 0.95)));
      } else if (look.kind === 'ring') {
        m = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.35, 40), additive(look.color, 0.35));
        m.rotation.x = -Math.PI / 2;
      } else m = new THREE.Group(); // motes: particles only
      m.userData.look = look;
      this.scene.add(m);
      this.auraMeshes[id] = m;
    }
  }

  updateAuras(dt) {
    const p = this.arena.player.position;
    this.auraT = (this.auraT || 0) + dt;
    for (const m of Object.values(this.auraMeshes)) {
      const look = m.userData.look;
      if (look.kind === 'bubble') { m.position.set(p.x, p.y + 1, p.z); m.material.opacity = look.opacity * (0.85 + 0.15 * Math.sin(this.auraT * 3)); }
      else if (look.kind === 'block') m.position.set(p.x, p.y + 1.15, p.z);
      else if (look.kind === 'ring') m.position.set(p.x, p.y + 0.06, p.z);
      else if (look.kind === 'orbs') {
        m.children.forEach((o, k) => {
          const a = this.auraT * 2.2 + (k / m.children.length) * Math.PI * 2;
          o.position.set(p.x + Math.cos(a) * 0.8, p.y + 1.1 + 0.2 * Math.sin(this.auraT * 3 + k), p.z + Math.sin(a) * 0.8);
        });
      } else if (look.kind === 'motes' && Math.random() < 8 * dt * this.density) {
        const a = rnd(0, Math.PI * 2);
        this.particles.glow.spawn({ pos: v3(p.x + Math.cos(a) * 0.55, p.y + rnd(0.2, 1.6), p.z + Math.sin(a) * 0.55), vel: v3(0, rnd(0.6, 1.4), 0), life: rnd(0.5, 0.9), size: rnd(0.08, 0.16), color: C(look.color), drag: 1 });
      }
    }
  }

  dispose() {
    for (const it of this.items) if (it.dispose) it.dispose();
    this.items = [];
    this.setAuras([]);
  }
}
