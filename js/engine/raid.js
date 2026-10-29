// The raid a healer keeps alive (data/healing.js RAID_SIM): the other players as health bars, and you (your fight's own
// health). It runs on the fight's clock and dice (fight.schedule, fight.rng): the boss swings at the main tank, hits
// someone now and then, burns the whole raid, and puts debuffs on people that a dispel takes off. A unit:
//   { id, name, cls, role, group, maxHp, hp, absorb, weakenedUntil, hots: { spell: { end, token } }, debuffs, dead, me }
// In a group the raid is the real players instead (GroupRaid below).
import { RAID_SIM } from '../data/healing.js';

// What both raids share: who is alive and most hurt, a heal, a shield, the raid frames' rows.
class Raid {
  alive() { return this.units.filter((u) => !this.isDead(u)); }

  // A heal on a player: returns { done, over } (what it healed, what was more than they missed).
  heal(u, amount) {
    if (this.isDead(u)) return { done: 0, over: amount };
    const missing = this.maxOf(u) - this.hpOf(u);
    const done = Math.max(0, Math.min(missing, amount));
    this.applyHeal(u, done, amount);
    return { done, over: amount - done };
  }
  applyHeal(u, done) { if (u.me) this.f.heal(done); else u.hp += done; }

  // A shield (Power Word: Shield) on a player; on you it is your fight's own absorb.
  shield(u, amount, duration, weakened) {
    u.absorb = amount;
    u.absorbEnd = this.f.t + duration;
    u.weakenedUntil = this.f.t + weakened;
    if (u.me) this.f.addAbsorb(amount, duration);
  }

  // The most hurt living players other than `not`, by missing share of health.
  mostHurt(not = [], n = 1) {
    return this.alive().filter((u) => !not.includes(u))
      .sort((a, b) => this.hpOf(a) / this.maxOf(a) - this.hpOf(b) / this.maxOf(b)).slice(0, n);
  }
  groupOf(u) { return this.units.filter((x) => x.group === u.group); }

  // The raid frames' rows: the players with their health, shields, your heals over time and debuffs.
  rows() {
    const f = this.f;
    return this.units.map((u) => ({
      id: u.id, name: u.name, cls: u.cls, role: u.role, me: !!u.me, host: !!u.host, aggro: u.aggro,
      hp: Math.round(this.hpOf(u)), maxHp: Math.round(this.maxOf(u)), dead: this.isDead(u), ...this.powerOf(u),
      absorb: u.me ? Math.round(f.absorbLeft()) : u.absorbEnd > f.t ? Math.round(u.absorb) : 0,
      hots: Object.entries(u.hots).filter(([, h]) => h.end > f.t).map(([id, h]) => ({ id, icon: h.icon, left: h.end - f.t })),
      debuffs: [
        ...u.debuffs.filter((d) => d.end > f.t).map((d) => ({ type: d.type, name: d.name, icon: d.icon, left: d.end - f.t })),
        // A priest's shield leaves Weakened Soul: no new shield until it is gone (it cannot be dispelled).
        ...(u.weakenedUntil > f.t ? [{ type: 'none', name: 'Weakened Soul', icon: 'spell_holy_ashestoashes', left: u.weakenedUntil - f.t }] : []),
      ],
    }));
  }
  powerOf(u) { return u.me ? { power: Math.floor(this.f.mana || 0), maxPower: this.f.maxMana || 1, powerType: 'mana' } : {}; }
}

export class SimRaid extends Raid {
  constructor(fight, { name = 'You', cls = 'priest' } = {}) {
    super();
    this.f = fight;
    const me = { id: 'me', name, cls, role: 'healer', me: true };
    this.units = [...RAID_SIM.members.map((m, i) => ({ id: `r${i}`, ...m })), me].map((u, i) => ({
      group: Math.floor(i / 5), maxHp: 0, hp: 0, absorb: 0, absorbEnd: 0, weakenedUntil: 0, hots: {}, debuffs: [], dead: false, ...u,
    }));
    for (const u of this.units) if (!u.me) u.hp = u.maxHp;
  }

  get me() { return this.units.find((u) => u.me); }
  unit(id) { return this.units.find((u) => u.id === id) || null; }

  // Your own unit reads and writes your fight's health.
  hpOf(u) { return u.me ? this.f.health : u.hp; }
  maxOf(u) { return u.me ? this.f.maxHealth : u.maxHp; }
  isDead(u) { return u.me ? !!this.f.dead : u.dead; }

  // ---- damage --------------------------------------------------------------------------------------------

  // Starts the boss's damage at the pull.
  start() {
    const f = this.f;
    const s = RAID_SIM;
    const t0 = f.t;
    const every = (period, first, fn) => {
      const tick = (at) => f.schedule(at, () => { if (f.over) return; fn(); tick(at + period); });
      tick(t0 + first);
    };
    every(s.tank.every, s.tank.every, () => this.tankSwing());
    every(s.random.every, s.random.every / 2, () => this.randomHit());
    every(s.aoe.every, s.aoe.first, () => this.aoe());
    every(s.debuff.every, s.debuff.first, () => this.addDebuff());
  }

  roll(min, max) { return min + this.f.rng() * (max - min); }
  alive() { return this.units.filter((u) => !this.isDead(u)); }

  // The boss's swing on the first living tank: avoided, crushing or a hit.
  tankSwing() {
    const t = this.units.find((u) => u.role === 'tank' && !this.isDead(u));
    if (!t) return;
    const s = RAID_SIM.tank;
    const r = this.f.rng();
    if (r < s.avoid) return;
    this.damage(t, this.roll(s.min, s.max) * (r < s.avoid + s.crush ? 1.5 : 1), 'Boss');
  }

  randomHit() {
    const pool = this.alive().filter((u) => u.role !== 'tank');
    if (!pool.length) return;
    const u = pool[Math.floor(this.f.rng() * pool.length)];
    this.damage(u, this.roll(RAID_SIM.random.min, RAID_SIM.random.max), 'Boss');
  }

  aoe() {
    const a = RAID_SIM.aoe;
    for (const u of this.alive()) this.damage(u, this.roll(a.min, a.max), a.name, 'fire');
    this.f.emit({ type: 'raidAoe', name: a.name });
  }

  // A debuff of a random type on a random player, ticking until it runs out or is dispelled.
  addDebuff() {
    const pool = this.alive().filter((u) => !u.debuffs.length);
    if (!pool.length) return;
    const f = this.f;
    const u = pool[Math.floor(f.rng() * pool.length)];
    const types = Object.keys(RAID_SIM.debuffs);
    const type = types[Math.floor(f.rng() * types.length)];
    const s = RAID_SIM.debuff;
    const d = { type, ...RAID_SIM.debuffs[type], end: f.t + s.duration, token: Symbol(type) };
    u.debuffs.push(d);
    for (let k = 1; k * s.period <= s.duration; k++) {
      f.schedule(f.t + k * s.period, () => { if (u.debuffs.includes(d) && !f.over) this.damage(u, s.tick, d.name, 'shadow'); });
    }
    f.schedule(d.end, () => { u.debuffs = u.debuffs.filter((x) => x !== d); });
  }

  // Damage on a player: their shield takes it first; at 0 health they die (you: your fight's own death, after your
  // fight's own shield).
  damage(u, amount, source, school = 'physical') {
    if (this.isDead(u) || !(amount > 0)) return;
    const f = this.f;
    if (u.me) { f.takeDamage(amount, { school, name: source }); return; }
    if (u.absorb > 0 && u.absorbEnd > f.t) {
      const took = Math.min(u.absorb, amount);
      u.absorb -= took;
      amount -= took;
    }
    if (amount <= 0) return;
    u.hp = Math.max(0, u.hp - amount);
    if (u.hp <= 0) {
      u.dead = true;
      u.hots = {};
      u.debuffs = [];
      f.emit({ type: 'raidDeath', unit: u.id, name: u.name });
    }
  }

}

// In a group a healer heals the real players: their health is what their own fights report (group-play.js, ten times
// a second), and a heal or a shield is sent to them (link.heal, link.shield); you are your own fight. They take their
// damage in their own fights (the targets hitting back), so this raid has no boss of its own.
//   link: { members() -> [{ id, name, cls, tank, me, host, aggro }], stat(id) -> { hp, maxHp, power, maxPower,
//   powerType }, heal(id, amount, crit), shield(id, amount, duration) }
export class GroupRaid extends Raid {
  constructor(fight, link) {
    super();
    this.f = fight;
    this.link = link;
    this.group = true;
    this.cache = new Map(); // member id -> unit (your heals over time and shields on them)
  }

  get units() {
    return this.link.members().map((m, i) => {
      let u = this.cache.get(m.id);
      if (!u) this.cache.set(m.id, (u = { id: m.id, absorb: 0, absorbEnd: 0, weakenedUntil: 0, hots: {}, debuffs: [] }));
      return Object.assign(u, { name: m.name, cls: m.cls, role: m.tank ? 'tank' : 'dps', group: Math.floor(i / 5), me: m.me, host: m.host, aggro: m.aggro });
    });
  }
  get me() { return this.units.find((u) => u.me); }
  unit(id) { return id === 'me' ? this.me : this.units.find((u) => u.id === id) || null; }

  hpOf(u) { return u.me ? this.f.health : this.link.stat(u.id).hp ?? 1; }
  maxOf(u) { return u.me ? this.f.maxHealth : this.link.stat(u.id).maxHp || 1; }
  isDead(u) { return u.me ? !!this.f.dead : this.maxOf(u) > 1 && this.hpOf(u) <= 0; }
  powerOf(u) {
    if (u.me) return super.powerOf(u);
    const s = this.link.stat(u.id);
    return { power: s.power ?? 0, maxPower: s.maxPower ?? 100, powerType: s.powerType || 'rage' };
  }

  start() {}

  // Another player's heal goes to them (they put it on their own fight).
  applyHeal(u, done, amount) {
    if (u.me) this.f.heal(done);
    else this.link.heal(u.id, amount);
  }
  shield(u, amount, duration, weakened) {
    super.shield(u, amount, duration, weakened);
    if (!u.me) this.link.shield(u.id, amount, duration);
  }
}
