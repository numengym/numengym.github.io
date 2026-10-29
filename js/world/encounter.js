// Boss encounters. As a DPS an NPC tank holds the boss, so it faces away from you and its melee goes to the
// tank; when a player tanks there is no NPC tank and the boss turns to and follows whoever has aggro. The mechanics hit whoever stands in the wrong place, and every hit you take gives rage
// and can proc Enrage. Damage is a share of your maximum health before armor and stance modifiers.

export const ENCOUNTERS = {
  dummies: { name: 'Training dummies' },
  brute: {
    name: 'Ragefire Brute',
    boss: true,
    description: 'Stay behind it (frontal Cleave), move out of Flame Patches, keep your distance when it starts War Stomp, and live through Fire Nova.',
  },
};

const HEALING_PER_SECOND = 0.03; // your healers, as a share of maximum health

// Each mechanic: first cast, repeat interval, cast time (telegraph), and what happens when it lands.
const BRUTE = {
  cleave: { name: 'Cleave', first: 6, every: 8, cast: 1.5, radius: 9, halfAngle: Math.PI / 3, damage: 0.9 },
  patch: { name: 'Flame Patch', first: 9, every: 15, cast: 1.5, radius: 3, duration: 10, tick: 1, damage: 0.1 },
  nova: { name: 'Fire Nova', first: 14, every: 20, cast: 1.2, damage: 0.12 },
  stomp: { name: 'War Stomp', first: 25, every: 30, cast: 2, radius: 8, damage: 0.15, knockback: 12 },
};

// Each mechanic's name and icon, for the raid pack's timers and alerts (main.js).
export const BRUTE_INFO = {
  cleave: { name: 'Cleave', icon: 'ability_warrior_cleave' },
  patch: { name: 'Flame Patch', icon: 'spell_fire_fire' },
  nova: { name: 'Fire Nova', icon: 'spell_fire_sealoffire' },
  stomp: { name: 'War Stomp', icon: 'ability_warstomp' },
};

export class BruteEncounter {
  // onMessage(text): a plain raid warning. onAlert({ key, phase: 'cast' | 'land', cast }): the raid pack's alerts;
  // when it is given (and returns true) it replaces the raid warning for that mechanic.
  constructor(fight, arena, onMessage, onAlert = null) {
    this.f = fight;
    this.a = arena;
    this.say = onMessage;
    this.alert = onAlert;
    this.casting = null; // { name, start, end } for the boss cast bar
    this.patches = [];
    this.next = Object.fromEntries(Object.entries(BRUTE).map(([k, m]) => [k, m.first]));
    this.lastHeal = 0;
    this.lastTankSwing = 0;
  }

  // Called every frame after the fight has advanced.
  update() {
    const f = this.f;
    if (!f.started || f.over) return;
    const t = f.t;

    // Healers keep you up.
    while (this.lastHeal + 1 <= t) {
      this.lastHeal += 1;
      f.heal(f.maxHealth * HEALING_PER_SECOND);
    }
    // The boss beats on the NPC tank (a player tank's hits come from the fight, see main.js).
    if (this.a.tank && t - this.lastTankSwing >= 2) {
      this.lastTankSwing = t;
      if (!this.casting) this.a.bossSwing(false);
    }

    for (const [key, m] of Object.entries(BRUTE)) {
      if (t >= this.next[key] - m.cast && !this.pending(key)) this.begin(key, m);
    }
    this.resolve(t);
    this.burn(t);
  }

  pending(key) { return this.casting && this.casting.key === key; }

  // Seconds until each mechanic lands, for the boss timers: [{ key, left, total }].
  timers() {
    const t = this.f.t;
    return Object.entries(BRUTE).map(([key, m]) => {
      const left = this.pending(key) ? this.casting.end - t : this.next[key] - t;
      return { key, left, total: this.pending(key) ? m.cast : m.every };
    });
  }

  // Standing in a Flame Patch (GTFO).
  inFire() {
    const p = this.a.playerPos();
    const r = BRUTE.patch.radius;
    return this.patches.some((patch) => patch.end > this.f.t && Math.hypot(p.x - patch.x, p.z - patch.z) <= r);
  }

  // The raid pack's alert, or the plain raid warning when there is none.
  notify(key, phase, text) {
    const handled = this.alert && this.alert({ key, phase, cast: BRUTE[key].cast });
    if (!handled && text) this.say(text);
  }

  // Starts a cast: shows the telegraph and the cast bar.
  begin(key, m) {
    if (this.casting) return; // one cast at a time; the next one waits
    const t = this.f.t;
    this.casting = { key, name: m.name, start: t, end: t + m.cast };
    const p = this.a.playerPos();
    const bossRadius = this.a.dummies[0].userData.radius;
    if (key === 'cleave') { this.a.telegraphCone(m.radius + bossRadius, m.halfAngle, m.cast); this.notify(key, 'cast', null); }
    if (key === 'patch') {
      this.casting.x = p.x;
      this.casting.z = p.z;
      this.a.groundCircle(p.x, p.z, m.radius, m.cast, 'warn');
      this.notify(key, 'cast', 'Flame Patch under you - move!');
    }
    if (key === 'stomp') {
      this.a.ring(m.radius + bossRadius, m.cast, 0xffb020);
      this.notify(key, 'cast', 'War Stomp - get away from the boss!');
    }
    if (key === 'nova') this.notify(key, 'cast', 'Fire Nova incoming');
  }

  // Lands the cast that just finished.
  resolve(t) {
    const c = this.casting;
    if (!c || t < c.end) return;
    const m = BRUTE[c.key];
    const f = this.f;
    const g = f.geo;
    this.casting = null;
    this.next[c.key] = c.end + m.every;

    if (c.key === 'cleave') {
      this.a.bossSwing(true);
      this.a.shake(0.15);
      if (g.dist[0] <= m.radius && g.angle[0] < m.halfAngle) {
        f.takeDamage(f.maxHealth * m.damage, { name: m.name });
        this.a.shake(0.45);
        this.notify(c.key, 'hit', 'You were hit by Cleave - stand behind the boss!');
      }
    } else if (c.key === 'patch') {
      this.patches.push({ x: c.x, z: c.z, end: t + m.duration, nextTick: t, effect: this.a.groundCircle(c.x, c.z, m.radius, m.duration, 'fire') });
    } else if (c.key === 'nova') {
      this.a.ring(30, 0.8, 0xff5a1a);
      this.a.shake(0.12);
      f.takeDamage(f.maxHealth * m.damage, { school: 'fire', name: m.name });
    } else if (c.key === 'stomp') {
      this.a.bossSwing(true);
      this.a.shake(0.7); // the ground shakes for everyone
      if (g.dist[0] <= m.radius) {
        f.takeDamage(f.maxHealth * m.damage, { name: m.name });
        this.a.knockback(m.knockback);
      }
    }
  }

  // Flame Patches burn while you stand in them.
  burn(t) {
    const m = BRUTE.patch;
    const p = this.a.playerPos();
    this.patches = this.patches.filter((patch) => patch.end > t);
    for (const patch of this.patches) {
      if (t < patch.nextTick) continue;
      patch.nextTick = t + m.tick;
      if (Math.hypot(p.x - patch.x, p.z - patch.z) <= m.radius) {
        this.f.takeDamage(this.f.maxHealth * m.damage, { school: 'fire', name: m.name });
      }
    }
  }
}
