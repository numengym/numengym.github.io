// "You have to move every N s for N s" in the arena: a warning ring, then fire over the whole melee area of your
// target for the move window (Fight.moveWindow), so you have to step out of melee. Standing in it burns.
// The sim beside you steps out for the same windows (ghost.js).
import { RANGE } from './data/warrior.js';

const WARN = 1.5;          // seconds of warning before the fire
const BURN_TICK = 1;       // seconds between burns while you stand in it
const BURN = 0.08;         // share of your maximum health per burn

export class MoveDrill {
  // say(text): a plain raid warning. alert(seconds): the raid pack's "move out" alert instead, when given and it
  // returns true.
  constructor(fight, arena, say, alert = null) {
    this.f = fight;
    this.a = arena;
    this.say = say;
    this.alert = alert;
    this.warned = -1;  // start time of the window already warned about
    this.lit = -1;     // start time of the window already burning
    this.spot = null;  // { x, z, r } of the current fire
    this.nextBurn = 0;
  }

  // Standing in the fire right now (GTFO).
  inFire() {
    const f = this.f;
    if (!this.spot || !f.started || f.over || !f.moveWindow(f.t)) return false;
    const p = this.a.playerPos();
    return Math.hypot(p.x - this.spot.x, p.z - this.spot.z) <= this.spot.r;
  }

  // Called every frame after the fight has advanced.
  update() {
    const f = this.f;
    const every = f.o.moveEvery || 0;
    if (!every || !f.o.moveFor || !f.started || f.over) return;
    const t = f.t;
    const nextStart = Math.max(every, Math.ceil((t + 1e-6) / every) * every);
    if (nextStart - t <= WARN && this.warned !== nextStart) {
      this.warned = nextStart;
      const d = this.a.dummies[f.primary] || this.a.dummies[0];
      if (!d) return;
      this.spot = { x: d.position.x, z: d.position.z, r: d.userData.radius + RANGE.melee + 0.8, at: nextStart };
      this.a.groundCircle(this.spot.x, this.spot.z, this.spot.r, nextStart - t, 'warn');
      if (!(this.alert && this.alert(nextStart - t + f.o.moveFor))) this.say(`Move out of melee for ${f.o.moveFor} s!`);
    }
    const w = f.moveWindow(t);
    if (w && this.spot && this.lit !== w.start) {
      this.lit = w.start;
      this.a.groundCircle(this.spot.x, this.spot.z, this.spot.r, w.end - t, 'fire');
      this.nextBurn = t + 0.3; // a moment to react
    }
    if (w && this.spot && t >= this.nextBurn) {
      this.nextBurn = t + BURN_TICK;
      const p = this.a.playerPos();
      if (Math.hypot(p.x - this.spot.x, p.z - this.spot.z) <= this.spot.r) {
        f.takeDamage(f.maxHealth * BURN, { school: 'fire', name: 'Fire under you' });
      }
    }
  }
}
