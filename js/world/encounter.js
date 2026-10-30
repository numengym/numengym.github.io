// Boss encounters. As a DPS an NPC tank holds the boss, so it faces away from you and its melee goes to the
// tank; when a player tanks there is no NPC tank and the boss turns to and follows whoever has aggro. The mechanics hit whoever stands in the wrong place, and every hit you take gives rage
// and can proc Enrage. The Brute's damage is a share of your maximum health before armor and stance modifiers; the
// classic bosses' is their abilities' own numbers.
import { ONYXIA_WHELPS } from './onyxia.js';
import { shapeBoss } from './raid-bosses.js';

// Each mechanic: its kind, first cast, repeat interval, cast time (telegraph), and what happens when it lands.
//   cleave: a cone in front of the boss; patch: fire on the ground where you stand, burning while you stay; nova: the
//   whole raid; stomp: everyone near the boss, thrown back; fear: everyone near the boss runs in fear (no casting or
//   attacking); berserk: the boss's enrage timer, a blow every few seconds that ends the raid.
//   damage: a share of your maximum health (the Brute); amount: the ability's damage (the classic bosses).
const BRUTE = {
  cleave: { kind: 'cleave', name: 'Cleave', first: 6, every: 8, cast: 1.5, radius: 9, halfAngle: Math.PI / 3, damage: 0.9 },
  patch: { kind: 'patch', name: 'Flame Patch', first: 9, every: 15, cast: 1.5, radius: 3, duration: 10, tick: 1, damage: 0.1 },
  nova: { kind: 'nova', name: 'Fire Nova', first: 14, every: 20, cast: 1.2, damage: 0.12 },
  stomp: { kind: 'stomp', name: 'War Stomp', first: 25, every: 30, cast: 2, radius: 8, damage: 0.15, knockback: 12 },
};

// Each mechanic's name and icon, for the raid pack's timers and alerts (main.js).
export const BRUTE_INFO = {
  cleave: { name: 'Cleave', icon: 'ability_warrior_cleave' },
  patch: { name: 'Flame Patch', icon: 'spell_fire_fire' },
  nova: { name: 'Fire Nova', icon: 'spell_fire_sealoffire' },
  stomp: { name: 'War Stomp', icon: 'ability_warstomp' },
};

// health: the boss's classic 40-man health (APPROX: no Classic database at hand gives them; Settings → Fight, "Real
// boss health", fights to the death against it). look: the boss's skin and size (the Brute's body recoloured).
export const ENCOUNTERS = {
  dummies: { name: 'Training dummies' },
  brute: {
    name: 'Ragefire Brute',
    boss: true, mechanics: BRUTE, info: BRUTE_INFO,
    description: 'Stay behind it (frontal Cleave), move out of Flame Patches, keep your distance when it starts War Stomp, and live through Fire Nova.',
  },
  // Onyxia in her lair (js/world/onyxia.js): her whelps are extra targets (adds), and the arena becomes the lair.
  onyxia: {
    name: 'Onyxia', boss: 'onyxia', adds: ONYXIA_WHELPS, addName: 'Onyxian Whelp', lair: 'onyxiasLair', health: 1110000,
    description: "Onyxia's Lair: fight from her side (Flame Breath in front, Tail Sweep behind). At 65% she flies: kill the whelps, get out of Deep Breath. At 40% she lands: Bellowing Roar fears, the lava cracks erupt.",
  },
  // ---- Molten Core ----
  lucifron: {
    name: 'Lucifron', raid: 'Molten Core', area: 'moltenCore', boss: true, health: 363000, look: { skin: 0x5a1612, scale: 2.5, shape: 'lucifron' },
    mechanics: {
      shadowShock: { kind: 'nova', name: 'Shadow Shock', first: 5, every: 9, cast: 0.5, amount: 700, school: 'shadow' },
      // Impending Doom: 2000 Shadow to everyone near him (the debuff's 10 sec run as its cast).
      doom: { kind: 'stomp', name: 'Impending Doom', first: 12, every: 20, cast: 3, radius: 20, amount: 2000, school: 'shadow', knockback: 0 },
    },
    info: { shadowShock: { name: 'Shadow Shock', icon: 'spell_shadow_shadowbolt' }, doom: { name: 'Impending Doom', icon: 'spell_shadow_nightofthedead' } },
    description: 'Lucifron: Shadow Shock hits the raid; get 20 yards away from him before Impending Doom lands.',
  },
  magmadar: {
    name: 'Magmadar', raid: 'Molten Core', area: 'moltenCore', boss: true, health: 798000, look: { skin: 0xc8601c, scale: 3.4, shape: 'magmadar' },
    mechanics: {
      lavaBomb: { kind: 'patch', name: 'Lava Bomb', first: 6, every: 12, cast: 1.5, radius: 3, duration: 8, tick: 1, amount: 450, school: 'fire' },
      // Panic: everyone within 40 yards flees in fear for 8 sec (a Fear Ward or a tremor would save you).
      panic: { kind: 'fear', name: 'Panic', first: 15, every: 30, cast: 1.5, radius: 40, duration: 8 },
    },
    info: { lavaBomb: { name: 'Lava Bomb', icon: 'spell_fire_selfdestruct' }, panic: { name: 'Panic', icon: 'spell_shadow_deathscream' } },
    description: 'Magmadar: move out of Lava Bombs; Panic fears everyone near him every 30 sec.',
  },
  ragnaros: {
    name: 'Ragnaros', raid: 'Molten Core', area: 'moltenCore', boss: true, rooted: true, health: 1099000, look: { skin: 0xff6a1c, scale: 5.2, shape: 'ragnaros' }, // rooted: he never leaves his lava
    mechanics: {
      // Wrath of Ragnaros: fire and a throw back for everyone in melee.
      wrath: { kind: 'stomp', name: 'Wrath of Ragnaros', first: 25, every: 25, cast: 1.5, radius: 12, amount: 2300, school: 'fire', knockback: 16 },
      lavaSplash: { kind: 'patch', name: 'Lava Splash', first: 8, every: 14, cast: 1.5, radius: 3.5, duration: 6, tick: 1, amount: 550, school: 'fire' },
      magmaBlast: { kind: 'nova', name: 'Magma Blast', first: 40, every: 40, cast: 2, amount: 1200, school: 'fire' },
    },
    info: { wrath: { name: 'Wrath of Ragnaros', icon: 'spell_fire_soulburn' }, lavaSplash: { name: 'Lava Splash', icon: 'spell_fire_volcano' }, magmaBlast: { name: 'Magma Blast', icon: 'spell_fire_fireball02' } },
    description: 'Ragnaros: melee get thrown back by Wrath of Ragnaros every 25 sec; step out of Lava Splash.',
  },
  // ---- Blackwing Lair ----
  broodlord: {
    name: 'Broodlord Lashlayer', raid: 'Blackwing Lair', area: 'blackwingLair', boss: true, health: 1070000, look: { skin: 0x3a4aa0, scale: 2.8, shape: 'broodlord' },
    mechanics: {
      blastWave: { kind: 'stomp', name: 'Blast Wave', first: 10, every: 20, cast: 1, radius: 10, amount: 1300, school: 'fire', knockback: 6 },
      cleave: { kind: 'cleave', name: 'Cleave', first: 6, every: 9, cast: 1, radius: 9, halfAngle: Math.PI / 3, amount: 1800 },
    },
    info: { blastWave: { name: 'Blast Wave', icon: 'spell_holy_excorcism_02' }, cleave: { name: 'Cleave', icon: 'ability_warrior_cleave' } },
    description: 'Broodlord Lashlayer: stay out of his front (Cleave); Blast Wave hits everyone near him every 20 sec.',
  },
  // ---- Naxxramas ----
  patchwerk: {
    name: 'Patchwerk', raid: 'Naxxramas', area: 'naxxramas', boss: true, health: 4264000, look: { skin: 0x8c9a72, scale: 4.2, width: 1.3, shape: 'patchwerk' },
    mechanics: {
      // A tank-and-spank: Hateful Strike is the tanks' worry; at 7 min he goes berserk and the raid dies.
      berserk: { kind: 'berserk', name: 'Berserk', first: 420, every: 2, cast: 0, amount: 6000 },
    },
    info: { berserk: { name: 'Berserk', icon: 'racial_troll_berserk' } },
    description: 'Patchwerk: a pure damage race. Kill him before he goes berserk at 7 minutes.',
  },
};

const HEALING_PER_SECOND = 0.03; // your healers, as a share of maximum health
const BRUTE_SKIN = 0xb5442c;     // models.js RACE_LOOKS.brute, recoloured for each boss

// A classic boss's body: the Brute's, in its own skin colour, size and pieces (world/raid-bosses.js). area: the raid
// it is fought in (world/environment.js ZONE_LOOKS).
export function dressBoss(model, look) {
  if (!model || !look) return;
  if (look.skin != null) {
    model.traverse((o) => {
      for (const m of [].concat(o.material || [])) if (m.color && m.color.getHex() === BRUTE_SKIN) m.color.setHex(look.skin);
    });
  }
  if (look.scale) {
    const k = look.scale / model.scale.x;
    model.scale.setScalar(look.scale);
    model.userData.height *= k;
    model.userData.radius *= k;
  }
  if (look.width) { model.scale.x *= look.width; model.scale.z *= look.width; model.userData.radius *= look.width; }
  if (look.shape) shapeBoss(model, look.shape, look.skin);
}

export class BruteEncounter {
  // onMessage(text): a plain raid warning. onAlert({ key, phase: 'cast' | 'land', cast }): the raid pack's alerts;
  // when it is given (and returns true) it replaces the raid warning for that mechanic. def: the encounter (its
  // mechanics and their info; the Brute's by default).
  constructor(fight, arena, onMessage, onAlert = null, def = ENCOUNTERS.brute) {
    this.f = fight;
    this.a = arena;
    this.say = onMessage;
    this.alert = onAlert;
    this.mech = def.mechanics || BRUTE;
    this.info = def.info || BRUTE_INFO;
    this.casting = null; // { name, start, end } for the boss cast bar
    this.patches = [];
    this.next = Object.fromEntries(Object.entries(this.mech).map(([k, m]) => [k, m.first]));
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
      if (!f.dead) f.heal(f.maxHealth * HEALING_PER_SECOND);
    }
    // The boss beats on the NPC tank (a player tank's hits come from the fight, see main.js).
    if (this.a.tank && t - this.lastTankSwing >= 2) {
      this.lastTankSwing = t;
      if (!this.casting) this.a.bossSwing(false);
    }

    for (const [key, m] of Object.entries(this.mech)) {
      if (t >= this.next[key] - m.cast && !this.pending(key)) this.begin(key, m);
    }
    this.resolve(t);
    this.burn(t);
  }

  pending(key) { return this.casting && this.casting.key === key; }

  // A mechanic's damage on you: its own number, or a share of your health (the Brute).
  dmg(m) { return m.amount != null ? m.amount : this.f.maxHealth * m.damage; }

  // Seconds until each mechanic lands, for the boss timers: [{ key, left, total }].
  timers() {
    const t = this.f.t;
    return Object.entries(this.mech).map(([key, m]) => {
      const left = this.pending(key) ? this.casting.end - t : this.next[key] - t;
      return { key, left, total: this.pending(key) ? m.cast : m.every };
    });
  }

  // Standing in fire on the ground (GTFO).
  inFire() {
    const p = this.a.playerPos();
    return this.patches.some((patch) => patch.end > this.f.t && Math.hypot(p.x - patch.x, p.z - patch.z) <= patch.radius);
  }

  // The raid pack's alert, or the plain raid warning when there is none.
  notify(key, phase, text) {
    const handled = this.alert && this.alert({ key, phase, cast: this.mech[key].cast, info: this.info[key] });
    if (!handled && text) this.say(text);
  }

  // Starts a cast: shows the telegraph and the cast bar.
  begin(key, m) {
    if (this.casting) return; // one cast at a time; the next one waits
    const t = this.f.t;
    this.casting = { key, name: m.name, start: t, end: t + m.cast };
    const p = this.a.playerPos();
    const bossRadius = this.a.dummies[0].userData.radius;
    if (m.kind === 'cleave') { this.a.telegraphCone(m.radius + bossRadius, m.halfAngle, m.cast); this.notify(key, 'cast', null); }
    if (m.kind === 'patch') {
      this.casting.x = p.x;
      this.casting.z = p.z;
      this.a.groundCircle(p.x, p.z, m.radius, m.cast, 'warn');
      this.notify(key, 'cast', `${m.name} under you - move!`);
    }
    if (m.kind === 'stomp') {
      this.a.ring(m.radius + bossRadius, m.cast, 0xffb020);
      this.notify(key, 'cast', `${m.name} - get away from the boss!`);
    }
    if (m.kind === 'fear') {
      this.a.ring(m.radius + bossRadius, m.cast, 0x9a5cff);
      this.notify(key, 'cast', `${m.name} - fear incoming!`);
    }
    if (m.kind === 'nova') this.notify(key, 'cast', `${m.name} incoming`);
    if (m.kind === 'berserk' && !this.berserk) { this.berserk = true; this.say(`${m.name}! The boss is enraged.`); }
  }

  // Lands the cast that just finished.
  resolve(t) {
    const c = this.casting;
    if (!c || t < c.end) return;
    const m = this.mech[c.key];
    const f = this.f;
    const g = f.geo;
    this.casting = null;
    this.next[c.key] = c.end + m.every;
    const school = m.school || 'physical';

    if (m.kind === 'cleave') {
      this.a.bossSwing(true);
      this.a.shake(0.15);
      if (g.dist[0] <= m.radius && g.angle[0] < m.halfAngle) {
        f.takeDamage(this.dmg(m), { school, name: m.name });
        this.a.shake(0.45);
        this.notify(c.key, 'hit', `You were hit by ${m.name} - stand behind the boss!`);
      }
    } else if (m.kind === 'patch') {
      this.patches.push({ x: c.x, z: c.z, radius: m.radius, m, end: t + m.duration, nextTick: t, effect: this.a.groundCircle(c.x, c.z, m.radius, m.duration, 'fire') });
    } else if (m.kind === 'nova' || m.kind === 'berserk') {
      this.a.ring(30, 0.8, school === 'shadow' ? 0x8a4cff : 0xff5a1a);
      this.a.shake(0.12);
      f.takeDamage(this.dmg(m), { school, name: m.name });
    } else if (m.kind === 'stomp') {
      this.a.bossSwing(true);
      this.a.shake(0.7); // the ground shakes for everyone
      if (g.dist[0] <= m.radius) {
        f.takeDamage(this.dmg(m), { school, name: m.name });
        if (m.knockback) this.a.knockback(m.knockback);
      }
    } else if (m.kind === 'fear') {
      // You run in fear (world/arena.js), which stops a cast; a warrior's Berserker Rage keeps it off.
      if (g.dist[0] <= m.radius && !f.aura('berserkerRage') && !f.dead) {
        this.a.fear(m.duration);
        this.notify(c.key, 'hit', `${m.name}: you are feared for ${m.duration} sec`);
      }
    }
    // The rest of the raid (main.js: the NPC tank and raiders) gets it too, and gets out of it or not.
    if (this.onLand) this.onLand(m);
  }

  // Fire on the ground burns while you stand in it.
  burn(t) {
    const p = this.a.playerPos();
    this.patches = this.patches.filter((patch) => patch.end > t);
    for (const patch of this.patches) {
      if (t < patch.nextTick) continue;
      patch.nextTick = t + patch.m.tick;
      if (Math.hypot(p.x - patch.x, p.z - patch.z) <= patch.radius) {
        this.f.takeDamage(this.dmg(patch.m), { school: patch.m.school || 'fire', name: patch.m.name });
      }
    }
  }
}
