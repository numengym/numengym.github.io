// Onyxia in her lair (js/world/lair.js), her classic encounter in three phases by her health (in a timed fight her
// health falls with the clock: Phase 2 from 35% of the fight, Phase 3 from 60%). An NPC tank holds her facing into
// the room, so you fight from her side; when you tank, she faces you.
//   Phase 1 (100-65%): on the ground. Flame Breath and Cleave in front of her, Tail Sweep behind her (a knockback).
//   Phase 2 (65-40%): she flies up over the middle of the cave, out of melee reach. Fireballs at the raid, Deep
//   Breath across the cave (get out of the band), and whelps pour out of the caves east and west: they are targets
//   of their own (kill them), and bite whoever they reach.
//   Phase 3 (40-0%): she lands where she lay. Phase 1's attacks again, Bellowing Roar fears everyone, and the lava
//   cracks in the floor erupt.
// Damage is a share of your maximum health (your healers bring 3% a second back), as the Ragefire Brute's.
import * as THREE from 'three';
import { LAIR, LAVA_CRACKS, WHELP_CAVES } from './lair.js';
import { dragonMouth } from './dragon.js';

export const ONYXIA_WHELPS = 10; // the target slots past Onyxia, for her whelps
// A whelp: its health, run speed, bite (a share of your health) and how often; the rest of the raid wears each one
// down too (raidDps, not your damage). A wave: `wave` whelps, half from each cave, every `waveEvery` seconds.
const WHELP = { health: 1700, speed: 8, bite: 0.02, every: 2, raidDps: 70, wave: 4, waveEvery: 20 };
const HEALING_PER_SECOND = 0.03;
const PHASE2 = 0.65;
const PHASE3 = 0.4;
const FLIGHT = 4; // seconds to fly up or land

// Each mechanic: the phases it is cast in, its first cast after the phase starts, how often, the cast (the
// telegraph's time) and what it does.
const MECH = {
  cleave: { phases: [1, 3], first: 5, every: 9, cast: 1, radius: 10, halfAngle: Math.PI / 3, damage: 0.35 },
  flameBreath: { phases: [1, 3], first: 8, every: 14, cast: 2, radius: 28, halfAngle: 0.5, damage: 0.55 },
  tailSweep: { phases: [1, 3], first: 12, every: 13, cast: 1.5, radius: 18, halfAngle: 0.75, damage: 0.22, knockback: 14 },
  fireball: { phases: [2], first: 3, every: 5, cast: 2, travel: 0.9, damage: 0.3, splash: 4 },
  deepBreath: { phases: [2], first: 9, every: 19, cast: 5, width: 16, length: 70, damage: 0.95 },
  bellowingRoar: { phases: [3], first: 3, every: 20, cast: 1.5, fear: 3 },
  eruption: { phases: [3], first: 7, every: 8, cast: 1.6, radius: 1.8, damage: 0.3, cracks: 2 },
};

// Names and icons for the raid pack's timers and alerts (main.js).
export const ONYXIA_INFO = {
  cleave: { name: 'Cleave', icon: 'ability_warrior_cleave' },
  flameBreath: { name: 'Flame Breath', icon: 'spell_fire_fire' },
  tailSweep: { name: 'Tail Sweep', icon: 'inv_misc_monsterscales_05' },
  fireball: { name: 'Fireball', icon: 'spell_fire_flamebolt' },
  deepBreath: { name: 'Deep Breath', icon: 'spell_fire_selfdestruct' },
  bellowingRoar: { name: 'Bellowing Roar', icon: 'spell_shadow_psychicscream' },
  eruption: { name: 'Eruption', icon: 'spell_fire_volcano' },
  whelps: { name: 'Whelps', icon: 'inv_misc_head_dragon_black' },
};

const YELLS = {
  2: 'Onyxia yells: This meaningless exertion bores me. I\'ll incinerate you all from above!',
  3: 'Onyxia yells: It seems you\'ll need another lesson, mortals!',
};

export class OnyxiaEncounter {
  // As BruteEncounter: onMessage(text) a raid warning, onAlert({ key, phase, cast }) the raid pack's alerts.
  constructor(fight, arena, onMessage, onAlert = null) {
    this.f = fight;
    this.a = arena;
    this.say = onMessage;
    this.alert = onAlert;
    this.info = ONYXIA_INFO;
    this.casting = null;
    this.phase = 1;
    this.phaseStart = 0;
    this.next = {};
    this.flight = null; // { from, to, start, up } while flying up or landing
    this.lastHeal = 0;
    this.lastTankSwing = 0;
    this.lastWave = -Infinity;
    this.eruptions = []; // cracks about to erupt { crack, at }
    this.band = null;    // Deep Breath's band while she takes the breath
    this.rnd = Math.random;
    // The whelps' target slots: asleep (dead) until they come out.
    this.whelps = [];
    for (let i = 1; i < fight.targets.length; i++) {
      Object.assign(fight.targets[i], { add: true, maxHealth: WHELP.health, dead: true, taken: 0 });
      this.whelps.push({ i, state: 'egg', biteAt: 0, goneAt: 0 });
    }
    this.schedulePhase(1, 0);
  }

  boss() { return this.a.dummies[0]; }
  // Onyxia's health: her own in a health fight, else falling with the clock.
  hp() { return this.f.healthPct(0); }

  schedulePhase(phase, t) {
    this.phase = phase;
    this.phaseStart = t;
    for (const [key, m] of Object.entries(MECH)) this.next[key] = m.phases.includes(phase) ? t + m.first : Infinity;
  }

  // Called every frame after the fight has advanced.
  update() {
    const f = this.f;
    if (!f.started || f.over) return;
    const t = f.t;
    while (this.lastHeal + 1 <= t) { this.lastHeal += 1; f.heal(f.maxHealth * HEALING_PER_SECOND); }

    // Phase changes: up into the air, then down again.
    const hp = this.hp();
    if (this.phase === 1 && hp <= PHASE2) this.takeOff(t);
    else if (this.phase === 2 && hp <= PHASE3) this.land(t);
    this.fly(t);

    // On the ground she bites the NPC tank.
    if (this.a.tank && !this.flight && this.phase !== 2 && t - this.lastTankSwing >= 2) {
      this.lastTankSwing = t;
      if (!this.casting) this.a.bossSwing(false);
    }
    if (!this.flight) {
      for (const [key, m] of Object.entries(MECH)) {
        if (this.next[key] !== Infinity && t >= this.next[key] - m.cast && !this.casting) this.begin(key, m, t);
      }
    }
    this.resolve(t);
    this.updateWhelps(t);
    if (this.phase === 2 && t - this.lastWave >= WHELP.waveEvery) this.whelpWave(t);
  }

  // ---- phases ------------------------------------------------------------------------------------------

  takeOff(t) {
    this.say(YELLS[2]);
    this.casting = null;
    this.schedulePhase(2, t + FLIGHT);
    const b = this.boss();
    this.flight = { from: { x: b.position.x, z: b.position.z }, to: { x: LAIR.hover.x, z: LAIR.hover.z }, start: t, up: true };
    this.a.bossScripted = true;
    this.a.shake(0.4);
    this.lastWave = t - WHELP.waveEvery + FLIGHT; // the first whelps as she reaches the middle
  }

  land(t) {
    this.say(YELLS[3]);
    this.casting = null;
    this.band = null;
    this.schedulePhase(3, t + FLIGHT);
    const b = this.boss();
    this.flight = { from: { x: b.position.x, z: b.position.z }, to: { x: LAIR.onyxia.x, z: LAIR.onyxia.z }, start: t, up: false };
  }

  // Flying up to the middle or back down to her spot: the wings beat, she rises or sinks, and turns to face the
  // way she goes (landed: into the room again).
  fly(t) {
    const fl = this.flight;
    const b = this.boss();
    if (!fl) return;
    const k = Math.min(1, (t - fl.start) / FLIGHT);
    const e = k * k * (3 - 2 * k);
    b.position.x = fl.from.x + (fl.to.x - fl.from.x) * e;
    b.position.z = fl.from.z + (fl.to.z - fl.from.z) * e;
    b.userData.hover = LAIR.hover.height * (fl.up ? e : 1 - e);
    b.userData.anim.fly = fl.up ? Math.min(1, k * 2) : Math.min(1, (1 - k) * 2 + 0.001);
    const dx = fl.to.x - fl.from.x;
    const dz = fl.to.z - fl.from.z;
    if (Math.hypot(dx, dz) > 0.5 && k < 0.9) b.rotation.y = Math.atan2(dx, dz);
    if (k >= 1) {
      this.flight = null;
      if (!fl.up) {
        b.userData.hover = 0;
        b.userData.anim.fly = 0;
        b.rotation.y = 0;
        this.a.bossScripted = false;
        this.a.shake(0.6);
      }
    }
  }

  // ---- mechanics -------------------------------------------------------------------------------------------

  notify(key, phase, text) {
    const handled = this.alert && this.alert({ key, phase, cast: MECH[key] ? MECH[key].cast : 0 });
    if (!handled && text) this.say(text);
  }

  begin(key, m, t) {
    const b = this.boss();
    this.casting = { key, name: ONYXIA_INFO[key].name, start: t, end: t + m.cast };
    const a = b.userData.anim;
    if (key === 'cleave') { this.a.telegraphCone(m.radius + b.userData.radius, m.halfAngle, m.cast); this.notify(key, 'cast', null); }
    if (key === 'flameBreath') {
      a.breath = 0.6;
      this.a.telegraphCone(m.radius, m.halfAngle, m.cast);
      this.notify(key, 'cast', 'Flame Breath - stay out of her front!');
    }
    if (key === 'tailSweep') {
      this.a.telegraphCone(m.radius, m.halfAngle, m.cast, Math.PI);
      this.notify(key, 'cast', 'Tail Sweep - stay at her side!');
    }
    if (key === 'fireball') {
      a.cast = 1;
      // At you, or at someone else in the raid (a spot on the floor).
      const p = this.a.playerPos();
      const atYou = this.rnd() < 0.6;
      const spot = atYou ? { x: p.x, z: p.z } : LAIR.randomFloor(this.rnd);
      Object.assign(this.casting, { atYou, x: spot.x, z: spot.z });
      if (atYou) this.notify(key, 'cast', null);
    }
    if (key === 'deepBreath') {
      // She turns and breathes a band across the cave from where she hovers, through the middle.
      const angle = this.rnd() * Math.PI * 2;
      const start = { x: b.position.x - Math.sin(angle) * m.length / 2, z: b.position.z - Math.cos(angle) * m.length / 2 };
      b.rotation.y = angle;
      this.casting.band = { angle, x: start.x, z: start.z };
      this.band = this.casting.band;
      this.a.telegraphBand(start.x, start.z, angle, m.length, m.width, m.cast);
      a.roar = 1;
      this.notify(key, 'cast', 'Onyxia takes in a deep breath... get out of the band!');
    }
    if (key === 'bellowingRoar') {
      a.roar = 1;
      this.notify(key, 'cast', 'Bellowing Roar - you will be feared!');
    }
    if (key === 'eruption') {
      const picks = [...LAVA_CRACKS].sort(() => this.rnd() - 0.5).slice(0, m.cracks);
      this.casting.cracks = picks;
      for (const crack of picks) this.a.crackEruption(crack, m.cast);
      this.notify(key, 'cast', null);
    }
  }

  // The cast that just finished lands.
  resolve(t) {
    const c = this.casting;
    if (!c || t < c.end) return;
    const m = MECH[c.key];
    const f = this.f;
    const g = f.geo;
    const b = this.boss();
    const a = b.userData.anim;
    this.casting = null;
    this.next[c.key] = c.end + m.every;
    const p = this.a.playerPos();
    if (c.key === 'cleave') {
      this.a.bossSwing(true);
      if (g.dist[0] <= m.radius && g.angle[0] < m.halfAngle) {
        f.takeDamage(f.maxHealth * m.damage * this.tankShare(), { name: 'Cleave' });
        this.notify(c.key, 'hit', 'You were hit by Cleave - stand at her side!');
      }
    } else if (c.key === 'flameBreath') {
      a.breath = 0;
      const mouth = dragonMouth(b);
      const ahead = { x: b.position.x + Math.sin(b.rotation.y) * m.radius, z: b.position.z + Math.cos(b.rotation.y) * m.radius };
      this.a.flameLine(mouth.x, mouth.z, ahead.x, ahead.z, 1.2, 6);
      if (g.dist[0] <= m.radius && g.angle[0] < m.halfAngle) {
        f.takeDamage(f.maxHealth * m.damage * this.tankShare(), { school: 'fire', name: 'Flame Breath' });
        this.notify(c.key, 'hit', 'You were hit by Flame Breath - stay out of her front!');
      }
    } else if (c.key === 'tailSweep') {
      this.a.shake(0.3);
      if (g.dist[0] <= m.radius && g.angle[0] > Math.PI - m.halfAngle) {
        f.takeDamage(f.maxHealth * m.damage, { name: 'Tail Sweep' });
        this.a.knockback(m.knockback);
        this.notify(c.key, 'hit', 'Tail Sweep threw you - stand at her side!');
      }
    } else if (c.key === 'fireball') {
      a.cast = 0;
      const from = dragonMouth(b);
      this.a.fireball(from, c.x, c.z, m.travel, () => {
        const q = this.a.playerPos();
        if (c.atYou || Math.hypot(q.x - c.x, q.z - c.z) <= m.splash) f.takeDamage(f.maxHealth * m.damage, { school: 'fire', name: 'Fireball' });
      });
    } else if (c.key === 'deepBreath') {
      const band = c.band;
      this.band = null;
      const end = { x: band.x + Math.sin(band.angle) * m.length, z: band.z + Math.cos(band.angle) * m.length };
      this.a.flameLine(band.x, band.z, end.x, end.z, 2.5, m.width);
      // Inside the band: across it within half its width, along it within its length.
      const dx = p.x - band.x;
      const dz = p.z - band.z;
      const along = dx * Math.sin(band.angle) + dz * Math.cos(band.angle);
      const across = Math.abs(dx * Math.cos(band.angle) - dz * Math.sin(band.angle));
      if (along >= 0 && along <= m.length && across <= m.width / 2) {
        f.takeDamage(f.maxHealth * m.damage, { school: 'fire', name: 'Deep Breath' });
        this.notify(c.key, 'hit', 'Deep Breath burned you - run to the side of the band!');
      }
    } else if (c.key === 'bellowingRoar') {
      this.a.shake(0.5);
      // A warrior's Berserker Rage keeps fear off.
      if (!f.aura('berserkerRage')) {
        this.a.fear(m.fear);
        this.say('You are feared!');
      }
    } else if (c.key === 'eruption') {
      for (const crack of c.cracks) {
        if (LAIR.crackDistance(crack, p.x, p.z) <= m.radius) {
          f.takeDamage(f.maxHealth * m.damage, { school: 'fire', name: 'Eruption' });
          this.notify(c.key, 'hit', 'The lava erupted under you - keep off the cracks!');
          break;
        }
      }
    }
  }

  // ---- whelps ----------------------------------------------------------------------------------------------

  // A wave from both caves, into free slots.
  whelpWave(t) {
    this.lastWave = t;
    const free = this.whelps.filter((w) => w.state === 'egg');
    if (!free.length) return;
    this.notify('whelps', 'cast', 'Onyxian whelps pour out of the caves!');
    free.slice(0, WHELP.wave).forEach((w, k) => {
      const cave = WHELP_CAVES[k % 2];
      const d = this.a.dummies[w.i];
      const tgt = this.f.targets[w.i];
      Object.assign(tgt, { dead: false, taken: 0, own: {} });
      w.state = 'run';
      // Half the wave goes for you, the other half for someone in the raid.
      w.prey = k % 2 === 0 ? null : LAIR.raidSpots[Math.floor(this.rnd() * LAIR.raidSpots.length)];
      w.biteAt = 0;
      d.visible = true;
      d.userData.anim.dead = false;
      d.position.set(cave.back.x + (this.rnd() - 0.5) * 3, 0, cave.back.z + (k - 2.5) * 1.6);
    });
  }

  // Whelps run at you and bite; dead ones fall over, then go.
  updateWhelps(t) {
    const p = this.a.playerPos();
    const dt = this.lastWhelpT ? Math.max(0, t - this.lastWhelpT) : 0;
    this.lastWhelpT = t;
    for (const w of this.whelps) {
      const d = this.a.dummies[w.i];
      const tgt = this.f.targets[w.i];
      if (!d || w.state === 'egg') continue;
      if (w.state !== 'dying' && tgt.dead) {
        w.state = 'dying';
        w.goneAt = t + 2.5;
        d.userData.anim.dead = true;
        continue;
      }
      if (w.state === 'dying') {
        if (t >= w.goneAt) {
          w.state = 'egg';
          d.visible = false;
          d.position.set(0, 0, -300);
        }
        continue;
      }
      this.f.woundTarget(w.i, WHELP.raidDps * dt); // the raid's share
      // A whelp after the raid turns on you once you target it.
      if (w.prey && this.f.primary === w.i) w.prey = null;
      const at = w.prey ? { x: w.prey[0], z: w.prey[1] } : p;
      const to = new THREE.Vector3(at.x - d.position.x, 0, at.z - d.position.z);
      const dist = to.length();
      d.rotation.y = Math.atan2(to.x, to.z);
      const reach = d.userData.radius + 0.7;
      if (dist > reach) {
        d.position.addScaledVector(to.normalize(), Math.min(WHELP.speed * dt, dist - reach));
        LAIR.clamp(d.position, 0.8);
        d.userData.anim.run = 1;
      } else if (t >= w.biteAt) {
        w.biteAt = t + WHELP.every;
        d.userData.anim.mh = 1;
        if (!w.prey) this.f.takeDamage(this.f.maxHealth * WHELP.bite, { name: 'Onyxian Whelp' });
      }
    }
  }

  // You tanking her take her frontal attacks for half (your tank gear and cooldowns); anyone else in front, in full.
  tankShare() { return this.f.o.tank && this.f.hasAggro(0) ? 0.5 : 1; }

  // ---- for the HUD -----------------------------------------------------------------------------------------

  // Seconds until each of this phase's mechanics lands, for the boss timers: [{ key, left, total }].
  timers() {
    const t = this.f.t;
    const out = [];
    for (const [key, m] of Object.entries(MECH)) {
      if (!m.phases.includes(this.phase)) continue;
      const pending = this.casting && this.casting.key === key;
      out.push({ key, left: pending ? this.casting.end - t : this.next[key] - t, total: pending ? m.cast : m.every });
    }
    if (this.phase === 2) out.push({ key: 'whelps', left: this.lastWave + WHELP.waveEvery - t, total: WHELP.waveEvery });
    return out;
  }

  // In something burning (the raid pack's "move!"): Deep Breath's band, an erupting crack.
  inFire() {
    const p = this.a.playerPos();
    const c = this.casting;
    if (c && c.key === 'eruption') return c.cracks.some((crack) => LAIR.crackDistance(crack, p.x, p.z) <= MECH.eruption.radius);
    if (c && c.key === 'deepBreath' && this.band) {
      const m = MECH.deepBreath;
      const dx = p.x - this.band.x;
      const dz = p.z - this.band.z;
      const along = dx * Math.sin(this.band.angle) + dz * Math.cos(this.band.angle);
      return along >= 0 && along <= m.length && Math.abs(dx * Math.cos(this.band.angle) - dz * Math.sin(this.band.angle)) <= m.width / 2;
    }
    return false;
  }
}
