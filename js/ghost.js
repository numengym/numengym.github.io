// The sim as a ghost: the rotation helper's bot plays the same fight beside you, on your setup, from the
// moment you pull. SimGhost runs its fight (the trainer's own engine, its own dice); GhostView draws it in
// the arena as a see-through copy of your warrior that swings when the bot's attacks land.
import * as THREE from 'three';
import { createFight } from './engine/fight.js';
import { suggest } from './apl.js';
import { metricOf, prepullAndPull } from './score.js';
import { animateCharacter, disposeCharacter, makeCharacter } from './world/characters.js';

const STEP = 0.05; // the bot looks at the APL this often, as in score.js

export class SimGhost {
  // sheet / opts: the same as your fight's; apl and items as for the rotation helper.
  constructor(sheet, opts, apl, items) {
    let s = (Math.random() * 4294967296) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    // Its own dummies: the sim's damage and debuffs are not yours. It plays alone, so in a tank fight it tanks.
    this.f = createFight(sheet, { ...opts, group: false }, rng);
    this.apl = apl;
    this.items = items;
    this.lastCast = null; // { id, t }
    this.away = false;    // out of melee for a move window
    this.f.on((ev) => { if (ev.type === 'cast') this.lastCast = { id: ev.id, t: ev.t }; });
  }

  get started() { return this.f.started; }
  dps() { return this.f.started ? this.f.dps() : 0; }
  metric() { return this.f.started ? metricOf(this.f) : 0; } // what your spec is scored on (DPS or TPS)
  on(fn) { this.f.on(fn); }

  // Plays the bot's fight up to time t (your fight's clock).
  advanceTo(t) {
    const f = this.f;
    if (!f.started) prepullAndPull(f, this.apl, this.items); // the APL's pre-pull, then its Charge / Intercept
    while (!f.over && f.t + STEP <= t) {
      // In a move window the sim steps out of melee for all of it, then comes straight back.
      const away = !!f.moveWindow(f.t);
      if (away !== this.away) {
        this.away = away;
        f.geo = { ...f.geo, dist: f.geo.dist.map(() => (away ? 10 : 0)) };
      }
      const hint = suggest(f, this.apl, { items: this.items });
      for (const id of hint.now) f.press(id);
      if (hint.next && hint.pressNow !== false && f.gcdLeft() <= 0) f.press(hint.next);
      f.advance(f.t + STEP);
    }
  }
}

// See-through materials: a pale, glowing copy of each material that does not hide what is behind it.
function ghostly(model) {
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false;
    o.receiveShadow = false;
    const make = (m) => {
      const c = m.clone();
      c.transparent = true;
      c.opacity = 0.38;
      c.depthWrite = false;
      if (c.color) c.color.lerp(new THREE.Color(0xc9d8ff), 0.55);
      if (c.emissive) { c.emissive = new THREE.Color(0x6f8cff); c.emissiveIntensity = 0.45; }
      return c;
    };
    o.material = Array.isArray(o.material) ? o.material.map(make) : make(o.material);
  });
  return model;
}

const SPIN = new Set(['whirlwind', 'whirlwindOh']);
const DOT = new Set(['deepWounds', 'rend']);

export class GhostView {
  constructor(arena) {
    this.arena = arena;
    this.model = null;
    this.key = '';
    this.visible = false;
    this.spin = 0;
    this.pos = new THREE.Vector3();
    this.placed = false;
  }

  // Rebuilds the ghost when your race, gear or look changes.
  sync() {
    const a = this.arena;
    const key = `${a.race}|${a.gearKey}|${a.appearance && a.appearance.transform}`;
    if (this.model && key === this.key) return;
    this.dispose();
    this.key = key;
    this.model = ghostly(makeCharacter({ race: a.race, role: 'player', gear: a.gear, ...a.appearance }));
    this.model.visible = this.visible;
    a.scene.add(this.model);
    this.placed = false;
  }

  setVisible(on) {
    this.visible = on;
    if (on) this.sync();
    if (this.model) this.model.visible = on;
  }

  dispose() {
    if (!this.model) return;
    this.arena.scene.remove(this.model);
    disposeCharacter(this.model);
    this.model = null;
  }

  // An event of the ghost's fight: swing on its hits, spin on Whirlwind.
  onEvent(ev) {
    if (!this.model || !this.visible) return;
    const anim = this.model.userData.anim;
    if (ev.type === 'cast' && ev.id === 'whirlwind') { this.spin = 1; anim.spin = 1; }
    if (ev.type === 'damage' && !ev.key.startsWith('proc') && !DOT.has(ev.key) && !SPIN.has(ev.key)) {
      if (ev.key === 'oh') anim.oh = 1; else anim.mh = 1;
    }
  }

  // Where the ghost stands: before the pull beside you; in the fight at melee range of your target, a little
  // round from you, facing it.
  // away: the sim is out of melee for a move window, so it stands back.
  update(dt, primary, inCombat, away = false) {
    if (!this.visible) return;
    this.sync();
    const a = this.arena;
    const me = a.player.position;
    const target = a.dummies[primary] || a.dummies[0];
    const want = new THREE.Vector3();
    let face;
    if (inCombat && target) {
      const t = target.position;
      const around = Math.atan2(me.x - t.x, me.z - t.z) + 0.8;
      const r = target.userData.radius + (away ? 7.5 : 1.3);
      want.set(t.x + Math.sin(around) * r, 0, t.z + Math.cos(around) * r);
      face = Math.atan2(t.x - want.x, t.z - want.z);
    } else {
      const side = new THREE.Vector3(Math.cos(a.yaw), 0, -Math.sin(a.yaw)); // your right
      want.copy(me).setY(0).addScaledVector(side, -1.8);
      face = a.yaw;
    }
    if (!this.placed) { this.pos.copy(want); this.placed = true; }
    const gap = want.distanceTo(this.pos);
    this.pos.lerp(want, Math.min(1, dt * (gap > 6 ? 10 : 4)));
    const m = this.model;
    m.position.copy(this.pos);
    m.rotation.y = face;
    animateCharacter(m, { dt, speed: gap > 0.4 ? 1 : 0, strafe: 0, air: false, combat: inCombat });
    if (this.spin > 0) {
      m.rotation.y = face + (1 - this.spin) * Math.PI * 2;
      this.spin = Math.max(0, this.spin - dt * 2.2);
    }
  }

  // The point above the ghost's head, for its name tag.
  head() {
    if (!this.model) return null;
    return this.model.position.clone().setY((this.model.userData.height || 2) + 0.35);
  }
}
