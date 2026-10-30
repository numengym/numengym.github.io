// Molten Core's Flamewaker packs: bosses whose adds are the fight, each add a target of its own (its own health, frame,
// nameplate and casts) that you can tab to, cleave and hit with your area spells.
//   Majordomo Executus on his terrace (world/raid-rooms.js DOMO): eight Flamewakers, four Elites and four Healers, in
//   an arc before him. He cannot be harmed and does not fight; he shields his guards (Magic Reflection: half the spells
//   cast at them come back at the caster; Damage Shield: every melee hit on one burns the striker) and teleports a
//   raider into the fire pit at the ramp's foot. The Elites Blast Wave whoever is near them and Fire Blast someone; the
//   Healers Shadow Shock whoever is near them, Shadow Bolt someone and cast Dark Mending on a hurt guard (interrupt it).
//   The fight is won when all eight are dead: Majordomo submits. You and the raid zone in at the bottom of the ramp;
//   at the pull the NPC tank and raiders walk up to their places, and you walk up yourself.
//   Sulfuron Harbinger in the lava cavern with his four Flamewaker Priests: his own blows run on BruteEncounter's
//   mechanics (world/encounter.js), the priests are adds that heal him and each other and bolt the raid. Kill them first.
// Numbers: the wiki's where it gives them (Blast Wave 694-806 Fire, Fire Blast 841 Fire, Magic Reflection 50% of
// spells for 10 sec, Damage Shield 100 Arcane a hit); the rest (health, timers, the Healers' spells) APPROX.
import * as THREE from 'three';
import { RANGE } from '../data/warrior.js';
import { dressBoss } from './raid-bosses.js';
import { animateCharacter } from './characters.js';
import { DOMO } from './raid-rooms.js';
// The mechanic tables live with the other bosses' in encounter.js (ENCOUNTERS reads them); this module imports them,
// never the other way round, so the two do not import each other.
import { BruteEncounter, MAJORDOMO_INFO, MAJORDOMO_MECH, SULFURON_BOSS_MECH, SULFURON_INFO, SULFURON_MECH } from './encounter.js';

const HEALING_PER_SECOND = 0.03; // your healers, as a share of your maximum health (as the other bosses)
const RUN = 7;                   // yards per second: how fast the NPCs walk to their places (your run speed)
const ADD_RUN = 6.5;             // yards per second: how fast an add goes after whoever tanks it
const SPELL_SCHOOLS = new Set(['fire', 'frost', 'arcane', 'nature', 'holy', 'shadow']);
// Abilities that interrupt a cast when they land on its caster.
const INTERRUPTS = new Set(['kick', 'pummel', 'shieldBash', 'earthShock', 'counterspell', 'feralCharge']);
// Hits that are not a melee strike (Damage Shield answers only those): bleeds and shots.
const NOT_STRIKES = new Set(['rend', 'deepWounds', 'rupture', 'garrote', 'rake', 'rip', 'lacerate', 'pounce', 'autoShot', 'wand', 'shoot']);

// The adds: their names, health (APPROX: classic 40-man; scaled with the boss health setting) and bodies.
export const FLAMEWAKERS = {
  elite: { name: 'Flamewaker Elite', health: 90000, look: { skin: 0x8a2a16, scale: 2.0, shape: 'flamewakerElite' } },
  healer: { name: 'Flamewaker Healer', health: 65000, look: { skin: 0x6a2034, scale: 1.8, shape: 'flamewakerHealer' } },
  priest: { name: 'Flamewaker Priest', health: 52000, look: { skin: 0x5a1c34, scale: 1.8, shape: 'flamewakerHealer' } },
};

// Where each boss's adds stand (yards, the boss at the origin facing +Z) and in what order the raid kills them.
//   Majordomo: an arc 13.5 yards before him, Healers and Elites in turn (close enough that a Whirlwind between two
//   reaches three or four, far enough from him that it leaves him out); the Healers die first, then the Elites.
//   Sulfuron: his four priests at his corners.
const DOMO_ARC = 13.5;
export const PACKS = {
  majordomo: Array.from({ length: 8 }, (_, k) => {
    const a = ((-80 + (160 * k) / 7) * Math.PI) / 180;
    const type = k % 2 === 0 ? 'healer' : 'elite';
    return { type, x: Math.sin(a) * DOMO_ARC, z: Math.cos(a) * DOMO_ARC, order: (type === 'healer' ? 0 : 10) + k };
  }),
  sulfuron: [45, 135, 225, 315].map((deg, k) => {
    const a = (deg * Math.PI) / 180;
    return { type: 'priest', x: Math.sin(a) * 8, z: Math.cos(a) * 8, order: k };
  }),
};

// The pack's adds in the arena (Arena.setScene): Brute rigs dressed as Flamewakers, on their spots facing out.
export function makePackAdds(boss, makeBoss) {
  return PACKS[boss].map((p) => {
    const m = makeBoss();
    dressBoss(m, FLAMEWAKERS[p.type].look);
    m.position.set(p.x, 0, p.z);
    m.rotation.y = Math.atan2(p.x, p.z);
    m.userData.flamewaker = p.type;
    return m;
  });
}

// The encounter journal's pages (journal.js): [mechanic, when, what to do].
export const PACK_JOURNAL = {
  majordomo: [
    ['magicReflection', 'Every 60 sec, first at 15 sec', 'Majordomo shields all his living guards for 10 sec: half the spells cast at them are reflected back at the caster, for the spell\'s full damage. Casters stop casting at the Flamewakers (or heal, or wait) until it fades.'],
    ['damageShield', 'Every 60 sec, first at 45 sec', 'For 10 sec every melee hit on a guard burns the striker for 100 Arcane damage. Melee keep going if they are healthy, or slow down.'],
    ['teleport', 'Every 25 sec', 'Majordomo teleports a raider into the fire pit at the bottom of the ramp: 500 Fire damage a second while you stand in the coals. Get out and run back up.'],
    ['blastWave', 'Each Elite every 20 sec', '694-806 Fire damage to everyone near the Elite (8 yards of its edge). Step away from an Elite when it starts its 1 sec cast. (The real one slows you too.)'],
    ['fireBlast', 'Each Elite every 10 sec', '841 Fire damage to someone within 20 yards of the Elite, instantly. Nothing to dodge.'],
    ['shadowShock', 'Each Healer every 14 sec', '700 Shadow damage to everyone near the Healer (8 yards of its edge), after a 1 sec cast.'],
    ['shadowBolt', 'Each Healer every 9 sec', 'A 2 sec cast: 900 Shadow damage to one raider. Interruptible.'],
    ['darkMending', 'Each Healer every 12 sec', 'A 2.5 sec cast that heals the most hurt guard for 8% of its health. Interrupt it (Kick, Pummel, Shield Bash, Earth Shock), or kill the Healers first, as the raid does.'],
  ],
  sulfuron: [
    ['handOfRagnaros', 'Every 20 sec, first at 12 sec', '900 Fire damage to everyone within 10 yards of Sulfuron, who are thrown back. Get out of reach during the 1 sec cast.'],
    ['flameSpear', 'Every 12 sec', 'Fire lands under a raider: 700 Fire damage a second while you stand in it. Step out.'],
    ['shadowWordPain', 'Each priest every 12 sec', 'A 1.5 sec cast: 800 Shadow damage to one raider. Interruptible.'],
    ['immolate', 'Each priest every 12 sec', 'A 2 sec cast: 700 Fire damage to one raider. Interruptible.'],
    ['darkMending', 'Each priest every 10 sec', 'A 2.5 sec cast that heals Sulfuron or a priest for 6% of its health. Interrupt it, and kill the priests first.'],
  ],
};

const YELLS = {
  pull: 'Majordomo Executus yells: Reckless mortals! None may challenge the sons of the living flame!',
  half: 'Majordomo Executus yells: Your efforts are futile, mortals!',
  submit: 'Majordomo Executus yells: Impossible! Stay your attack, mortals... I submit! I submit!',
};

// A white skull over the add the raid kills (the raid leader's mark).
function skullSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f0e6';
  g.strokeStyle = '#1a1414';
  g.lineWidth = 3;
  g.beginPath(); g.arc(32, 27, 20, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillRect(22, 40, 20, 14); g.strokeRect(22, 40, 20, 14);
  g.fillStyle = '#1a1414';
  g.beginPath(); g.arc(24, 27, 6, 0, Math.PI * 2); g.arc(40, 27, 6, 0, Math.PI * 2); g.fill();
  for (const x of [27, 32, 37]) g.fillRect(x - 1, 44, 2, 10);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(1.3, 1.3, 1);
  s.renderOrder = 10;
  return s;
}

// The adds and everything they do. opts: { bots() -> { tank, raiders } (main.js's NPC tank and raiders), flash(id,
// text) (the raid frames' numbers), tankHolds: 'skull' (the NPC tank holds the add the raid kills) or 'boss',
// heal: whether this encounter keeps you up (3% a second, as the other bosses) }.
class PackEncounter {
  constructor(fight, arena, onMessage, onAlert, def, packKey, mech, info, opts = {}) {
    this.f = fight;
    this.a = arena;
    this.say = onMessage;
    this.alert = onAlert;
    this.def = def;
    this.mech = mech;
    this.info = info;
    this.o = { tankHolds: 'skull', heal: true, ...opts };
    this.bots = opts.bots || (() => ({ tank: null, raiders: [] }));
    this.flash = opts.flash || (() => {});
    this.rnd = Math.random;
    this.lastHeal = 0;
    this.warned = {};
    // The adds' target slots (1..n): their own health pools, scaled with the boss health setting in a fight to the
    // death (raid testing at 50% halves them too).
    const scale = fight.endMode === 'health' && def.health ? fight.o.health / def.health : 1;
    const pack = PACKS[packKey];
    this.adds = pack.map((p, k) => {
      const i = k + 1;
      const type = FLAMEWAKERS[p.type];
      Object.assign(fight.targets[i], { add: true, maxHealth: Math.round(type.health * scale), dead: false, taken: 0 });
      const model = arena.dummies[i];
      const same = pack.slice(0, k).filter((q) => q.type === p.type).length;
      const next = {};
      for (const [key, m] of Object.entries(mech)) if (m.who === p.type) next[key] = m.first + (m.stagger || 0) * same;
      return { i, type: p.type, name: type.name, home: { x: p.x, z: p.z }, order: p.order, model, next, cast: null, state: 'alive', goneAt: 0 };
    });
    this.order = [...this.adds].sort((a, b) => a.order - b.order);
    this.totalAddHealth = this.adds.reduce((s, ad) => s + fight.targets[ad.i].maxHealth, 0);
    // Shield bubbles on each add (hidden until Majordomo shields them).
    for (const ad of this.adds) {
      if (!ad.model) continue;
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 14), new THREE.MeshBasicMaterial({ color: 0x8ab8ff, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
      bubble.position.y = 1.1;
      bubble.visible = false;
      ad.model.add(bubble);
      ad.bubble = bubble;
    }
    this.skull = skullSprite();
    arena.scene.add(this.skull);
    arena.extras.push(this.skull); // removed with the scene at the next fight
    this.shield = null; // { key, until } while the guards are shielded
    fight.on((ev) => this.onEvent(ev));
    // The raid's other tanks (unseen) hold every add the NPC tank does not: its threat on them, as main.js passes it to
    // your fight, is theirs, more than you can ever make, so they never turn to you. The add it holds it holds by its
    // own threat (pass 110% of it and that one comes for you).
    const tb = this.bots().tank;
    if (tb && fight.o.tank) {
      const own = tb.threatOn.bind(tb);
      tb.threatOn = (i) => (this.addAt(i) && this.heldAdd() !== this.addAt(i) ? Math.max(own(i), 1e9) : own(i));
    }
  }

  // The add the NPC tank holds: the skull (Majordomo's guards), or none (it holds the boss: Sulfuron).
  heldAdd() { return this.o.tankHolds === 'skull' ? this.skullAdd() : null; }

  // ---- who is who ------------------------------------------------------------------------------------------

  addAt(i) { return this.adds.find((ad) => ad.i === i) || null; }
  alive() { return this.adds.filter((ad) => !this.f.targets[ad.i].dead); }
  // The add the raid kills now (the skull): the first living one in the pack's kill order.
  skullAdd() { return this.order.find((ad) => !this.f.targets[ad.i].dead) || null; }
  // The raid leader's marks (on the nameplates and the target frame): a skull on the add the raid kills now, a cross
  // on the next.
  markOf(i) {
    if (this.f.over) return null;
    const live = this.order.filter((ad) => !this.f.targets[ad.i].dead);
    if (live[0] && live[0].i === i) return 'skull';
    if (live[1] && live[1].i === i) return 'cross';
    return null;
  }
  // The NPCs in the fight: [{ b, model }] for the tank and the raiders that are alive.
  npcs() {
    const { tank, raiders } = this.bots();
    return [tank ? { b: tank, model: this.a.tank } : null, ...(raiders || []).map((b) => ({ b, model: b.model }))].filter((x) => x && x.b && !x.b.dead && x.model);
  }
  // A model's distance from add `ad`'s edge.
  edge(model, ad) { return Math.max(0, Math.hypot(model.position.x - ad.model.position.x, model.position.z - ad.model.position.z) - ad.model.userData.radius); }

  // ---- your hits: Magic Reflection, Damage Shield, interrupts ----------------------------------------------

  onEvent(ev) {
    const f = this.f;
    if (ev.type === 'targetDied' && ev.i === f.primary && this.addAt(ev.i)) this.retarget = true;
    // Your target died: the engine moves you to the first living target (the boss); go to the nearest add instead.
    if (ev.type === 'target' && this.retarget) {
      this.retarget = false;
      const next = this.alive().sort((a, b) => f.geo.dist[a.i] - f.geo.dist[b.i])[0];
      if (next && ev.i !== next.i && !this.addAt(ev.i)) f.setPrimary(next.i);
      return;
    }
    if (ev.type !== 'damage' || !f.started || f.over) return;
    const ad = this.addAt(ev.target);
    const landed = ev.outcome !== 'miss' && ev.outcome !== 'dodge' && ev.outcome !== 'parry';
    if (!ad) { this.onBossHit(ev); return; }
    if (f.targets[ad.i].dead || !landed) return;
    const id = String(ev.key).replace(/Dot$/, '');
    const ab = f.A[id];
    // Interrupted: a cast with a cast time (not a stomp's wind-up) stops.
    if (INTERRUPTS.has(id) && ad.cast && ad.cast.interruptible) {
      this.say(`${ad.name}'s ${ad.cast.name} is interrupted`);
      ad.next[ad.cast.key] = f.t + this.mech[ad.cast.key].every * 0.5;
      ad.cast = null;
      if (ad.model) ad.model.userData.anim.cheer = 0;
    }
    const sh = this.shield && this.shield.until > f.t ? this.shield : null;
    if (!sh || !(ev.amount > 0)) return;
    if (id === 'petMelee' || (ab && (ab.petSpell || ab.petCommand))) return; // your pet's hits are its own, not yours
    const spell = ab && !ab.melee && !ab.weapon && SPELL_SCHOOLS.has(ab.school) && !String(ev.key).endsWith('Dot');
    if (sh.key === 'magicReflection' && spell && this.rnd() < this.mech.magicReflection.chance) {
      // Reflected: the add takes none of it (the engine adds it to the add's damage taken right after this event,
      // so it is taken off first) and you take it all, in its own school.
      f.targets[ad.i].taken -= ev.amount;
      f.takeDamage(ev.amount, { school: ab.school, name: `${ab.name || 'Spell'} (Magic Reflection)` });
      this.notify('magicReflection', 'hit', `${ab.name || 'Your spell'} was reflected back at you - stop casting at the shielded guards!`, 2);
    } else if (sh.key === 'damageShield' && !spell && !NOT_STRIKES.has(id) && !(ab && ab.shot) && f.geo.dist[ad.i] <= RANGE.melee) {
      const m = this.mech.damageShield;
      f.takeDamage(m.amount, { school: m.school, name: 'Damage Shield' });
      this.notify('damageShield', 'hit', null, 3);
    }
  }

  onBossHit() {}

  // ---- each frame ----------------------------------------------------------------------------------------------

  // Called every frame after the fight has advanced (before the pull too: the room's own motion).
  update() {
    const f = this.f;
    const a = this.a;
    const dtA = Math.min(0.25, Math.max(0, a.time - (this.lastArena ?? a.time)));
    this.lastArena = a.time;
    this.animate(dtA);
    if (!f.started || f.over) return;
    const t = f.t;
    const dt = Math.max(0, t - (this.lastT ?? t));
    this.lastT = t;
    if (this.o.heal) while (this.lastHeal + 1 <= t) { this.lastHeal += 1; if (!f.dead) f.heal(f.maxHealth * HEALING_PER_SECOND); }
    this.raidShare(dt);
    this.npcsFight();
    for (const ad of this.adds) this.updateAdd(ad, t);
  }

  // In a fight by the clock the unseen rest of the raid kills the adds one after the other, all of them by `shareBy` of
  // the fight (Majordomo's 80%, Sulfuron's priests by half of it, before the boss; you and the NPCs' damage only make
  // it quicker); in a fight to the death it is you and the NPCs alone.
  raidShare(dt) {
    const f = this.f;
    if (f.endMode === 'health' || !(dt > 0)) return;
    const ad = this.skullAdd();
    if (!ad) return;
    const span = f.timed ? f.o.duration : 240;
    f.woundTarget(ad.i, (this.totalAddHealth / ((this.o.shareBy || 0.8) * span)) * dt);
  }

  // The NPCs fight the skull: the raiders' fights turn to it (and leave the boss out of their area spells), and the
  // NPC tank's fight has only the add (or the boss) it holds hitting it.
  npcsFight() {
    const f = this.f;
    const skull = this.skullAdd();
    const k = skull ? skull.i : 0;
    const { tank, raiders } = this.bots();
    for (const b of [tank, ...(raiders || [])]) {
      if (!b || b.healer || !b.f || !b.f.setPrimary || b.dead) continue;
      const bf = b.f;
      const want = b === tank && this.o.tankHolds === 'boss' ? 0 : k;
      if (bf.primary !== want) bf.setPrimary(want);
      if (this.o.bossOutOfReach && bf.geo.dist[0] < 40 && want !== 0) bf.geo = { ...bf.geo, dist: bf.geo.dist.map((d, i) => (i === 0 ? 40 : d)) };
      if (b === tank && bf.started) {
        for (let i = 0; i < bf.bossAt.length; i++) {
          if (i !== want) bf.bossAt[i] = Infinity;
          else if (bf.bossAt[i] === Infinity) bf.bossAt[i] = bf.t + 1.5;
        }
      }
    }
  }

  // One add: dying, turning to its tank, and its casts.
  updateAdd(ad, t) {
    const f = this.f;
    const tgt = f.targets[ad.i];
    const m3 = ad.model;
    if (!m3) return;
    if (tgt.dead) {
      if (ad.state === 'alive') {
        ad.state = 'dying';
        ad.goneAt = t + 4;
        ad.cast = null;
        m3.userData.anim.dead = true;
        if (ad.bubble) ad.bubble.visible = false;
        this.onAddDied(ad);
      }
      if (ad.state === 'dying' && t >= ad.goneAt) {
        // The body goes, out of everyone's way (and out of reach of clicks and area spells).
        ad.state = 'gone';
        m3.visible = false;
        m3.position.set(ad.home.x, 0, -300);
        if (m3.userData.marks) m3.userData.marks.visible = false;
      }
      return;
    }
    // Someone else in the raid kicks a heal now and then; a cast that is not kicked lands when it ends.
    if (ad.cast && ad.cast.raidKick && t >= ad.cast.raidKick) {
      ad.next[ad.cast.key] = t + this.mech[ad.cast.key].every * 0.5;
      ad.cast = null;
      m3.userData.anim.cheer = 0;
    }
    if (ad.cast && t >= ad.cast.end) this.land(ad, t);
    if (ad.cast) return;
    for (const [key, m] of Object.entries(this.mech)) {
      if (m.who !== ad.type || t < ad.next[key]) continue;
      this.begin(ad, key, m, t);
      if (ad.cast) break;
    }
  }

  onAddDied() {}

  // Starts an add's cast (or does an instant one at once).
  begin(ad, key, m, t) {
    const f = this.f;
    const pos = ad.model.position;
    const r = ad.model.userData.radius;
    if (m.kind === 'heal') {
      // The most hurt of its friends (and the boss, for Sulfuron's priests), if any is below the mark.
      const pool = this.alive().map((x) => ({ i: x.i, pct: f.healthPct(x.i) }));
      if (m.boss && this.f.endMode === 'health') pool.push({ i: 0, pct: f.healthPct(0) });
      const hurt = pool.filter((x) => x.pct < m.below).sort((x, y) => x.pct - y.pct)[0];
      if (!hurt) { ad.next[key] = t + 2; return; }
      ad.cast = { key, name: m.name, start: t, end: t + m.cast, on: hurt.i, interruptible: true };
      if (this.rnd() < 0.3) ad.cast.raidKick = t + m.cast * (0.3 + this.rnd() * 0.5); // someone else in the raid kicks it
      ad.model.userData.anim.cheer = 1;
      if (f.primary === ad.i || f.geo.dist[ad.i] <= 10) this.notify(key, 'cast', `${ad.name} casts ${m.name} - interrupt it!`);
      return;
    }
    if (m.kind === 'bolt') {
      const victim = this.pickVictim(ad, m.range);
      ad.next[key] = t + m.every;
      if (!victim) return;
      if (m.cast <= 0) { this.strike(ad, m, victim); return; }
      ad.cast = { key, name: m.name, start: t, end: t + m.cast, victim, interruptible: true };
      ad.model.userData.anim.cheer = 1;
      return;
    }
    if (m.kind === 'stomp') {
      ad.cast = { key, name: m.name, start: t, end: t + m.cast, x: pos.x, z: pos.z };
      this.a.groundCircle(pos.x, pos.z, m.radius + r, m.cast, 'warn');
      ad.model.userData.anim.cheer = 1;
      if (f.geo.dist[ad.i] <= m.radius + 2) this.notify(key, 'cast', `${ad.name}: ${m.name} - get away from it!`);
    }
  }

  // A cast that just finished.
  land(ad, t) {
    const c = ad.cast;
    const m = this.mech[c.key];
    const f = this.f;
    ad.cast = null;
    ad.next[c.key] = Math.max(ad.next[c.key] || 0, t + m.every - m.cast);
    ad.model.userData.anim.cheer = 0;
    ad.model.userData.anim.mh = 1;
    if (m.kind === 'heal') {
      const tgt = f.targets[c.on];
      if (!tgt || tgt.dead) return;
      const max = tgt.add ? tgt.maxHealth : f.o.health;
      tgt.taken = Math.max(0, tgt.taken - max * m.share);
      const at = c.on === 0 ? this.a.dummies[0] : this.addAt(c.on).model;
      if (at) this.a.fx.ring(at.position.x, at.position.z, 0.5, 3, 0x9a5cff, 0.8);
      if (f.primary === c.on) this.say(`${ad.name}'s ${m.name} heals your target`);
    } else if (m.kind === 'bolt') {
      this.strike(ad, m, c.victim);
    } else if (m.kind === 'stomp') {
      this.a.fx.ring(c.x, c.z, 1, m.radius + ad.model.userData.radius, m.school === 'shadow' ? 0x9a5cff : 0xff7a2a, 0.5);
      if (!f.dead && f.geo.dist[ad.i] <= m.radius) {
        f.takeDamage(m.amount * (0.93 + this.rnd() * 0.14), { school: m.school, name: m.name });
        this.notify(c.key, 'hit', `${m.name} hit you - step away from the ${ad.name}s when they cast it`);
      }
      for (const n of this.npcs()) if (this.edge(n.model, ad) <= m.radius && this.rnd() > n.b.skill) this.hurtNpc(n.b, m.amount, m.school, m.name);
    }
  }

  // Someone in the raid within `range` of the add: you or an NPC, at random.
  pickVictim(ad, range) {
    const pool = this.npcs().filter((n) => this.edge(n.model, ad) <= range).map((n) => n.b);
    if (!this.f.dead && this.f.geo.dist[ad.i] <= range) pool.push('me');
    return pool.length ? pool[Math.floor(this.rnd() * pool.length)] : null;
  }

  // A bolt lands on its victim (if they are still there).
  strike(ad, m, victim) {
    const f = this.f;
    const color = m.school === 'shadow' ? 0x9a5cff : 0xff7a2a;
    if (victim === 'me') {
      if (f.dead) return;
      const p = this.a.playerPos();
      this.a.fx.ring(p.x, p.z, 0.3, 1.6, color, 0.4, 1.2);
      f.takeDamage(m.amount, { school: m.school, name: m.name });
    } else if (victim && !victim.dead) {
      this.hurtNpc(victim, m.amount, m.school, m.name);
      const model = victim === this.bots().tank ? this.a.tank : victim.model;
      if (model) this.a.fx.ring(model.position.x, model.position.z, 0.3, 1.6, color, 0.4, 1.2);
    }
  }

  hurtNpc(b, amount, school, name) {
    const took = b.f.takeDamage(amount, { school, name });
    if (took > 0) this.flash(b.id, `-${Math.round(took)}`);
  }

  // The raid pack's alert, or the plain raid warning; `every` sec at most between the same one.
  notify(key, phase, text, every = 0) {
    const t = this.f.t;
    const id = `${key}:${phase}`;
    if (every && this.warned[id] > t - every) return;
    this.warned[id] = t;
    const handled = this.alert && this.alert({ key, phase, cast: (this.mech[key] || {}).cast || 0, info: this.info[key] });
    if (!handled && text) this.say(text);
  }

  // ---- the room's motion (every frame, before the pull too) ----------------------------------------------

  animate(dt) {
    const f = this.f;
    const a = this.a;
    // The adds breathe and swing; one that someone tanks follows them (see holderOf).
    const skull = f.started && !f.over ? this.skullAdd() : null;
    for (const ad of this.adds) {
      const m3 = ad.model;
      if (!m3 || m3.visible === false) continue;
      const holder = this.holderOf(ad, skull);
      if (holder) this.chase(m3, holder, dt);
      if (ad.bubble) {
        const on = this.shield && this.shield.until > f.t && !f.targets[ad.i].dead;
        ad.bubble.visible = !!on;
        if (on) {
          ad.bubble.material.color.setHex(this.shield.key === 'magicReflection' ? 0x8ab8ff : 0xffa040);
          ad.bubble.material.opacity = 0.16 + Math.sin(a.time * 6 + ad.i) * 0.06;
        }
      }
    }
    // The skull over the add the raid kills.
    const sk = skull || (!f.started ? this.order[0] : null);
    this.skull.visible = !!sk && !f.over && !a.plateMarks; // with nameplates the skull is on the add's plate
    if (sk) this.skull.position.set(sk.model.position.x, sk.model.position.y + sk.model.userData.height + 1.4, sk.model.position.z);
  }

  // Who tanks an add, as a position to follow: you once you have its aggro, else the NPC tank for the add it holds
  // (the skull); the raid's unseen tanks hold the others where they stand. Nobody before the pull or once it is dead.
  holderOf(ad, skull) {
    const f = this.f;
    const a = this.a;
    if (!f.started || f.over || f.targets[ad.i].dead) return null;
    if (f.hasAggro(ad.i)) return a.player.position;
    const tb = this.bots().tank;
    if (ad === skull && this.o.tankHolds === 'skull' && a.tank && !(tb && tb.dead)) return a.tank.position;
    return null;
  }
  // An add goes after whoever tanks it, at a run, until it is in melee reach of them, turning to face them (into the
  // fire pit after a teleported tank, and back up with them).
  chase(m3, at, dt) {
    const a = this.a;
    const dx = at.x - m3.position.x;
    const dz = at.z - m3.position.z;
    const dist = Math.hypot(dx, dz);
    const reach = m3.userData.radius + 1.2;
    if (dist > reach) {
      // The way there: straight, or by a room's own path (down Majordomo's ramp rather than over the terrace's edge).
      const go = this.route ? this.route(m3.position, at) : at;
      const gx = go.x - m3.position.x;
      const gz = go.z - m3.position.z;
      const gd = Math.hypot(gx, gz) || 1;
      const step = Math.min(go === at ? dist - reach : gd, ADD_RUN * dt);
      m3.position.x += (gx / gd) * step;
      m3.position.z += (gz / gd) * step;
      if (a.env.layout) a.env.layout.clamp(m3.position, 0.8);
      m3.position.y = a.groundY(m3.position.x, m3.position.z);
    }
    let diff = Math.atan2(dx, dz) - m3.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    m3.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), 4 * dt);
    a.followMarks(m3);
  }

  // ---- for the HUD -----------------------------------------------------------------------------------------

  // Each add's cast for its target frame; the boss's for its own.
  castOf(i) { return i === 0 ? this.casting : (this.addAt(i) || {}).cast || null; }
  // Majordomo's shields on the guards' frames: [{ name, icon, left }].
  targetAuras(i) {
    const sh = this.shield;
    const ad = this.addAt(i);
    if (!ad || !sh || sh.until <= this.f.t || this.f.targets[i].dead) return [];
    return [{ ...this.info[sh.key], left: sh.until - this.f.t, n: 0, tt: '' }];
  }
  // The soonest of each add mechanic that hits around them (a stomp), for the boss timers.
  addTimers() {
    const t = this.f.t;
    const out = [];
    for (const [key, m] of Object.entries(this.mech)) {
      if (m.kind !== 'stomp' || !m.who || m.who === 'majordomo') continue;
      const ads = this.alive().filter((ad) => ad.type === m.who);
      if (!ads.length) continue;
      const left = Math.min(...ads.map((ad) => (ad.cast && ad.cast.key === key ? ad.cast.end : ad.next[key]) - t));
      out.push({ key, left: Math.max(0, left), total: m.every });
    }
    return out;
  }
  // Standing where an add's stomp is about to land.
  inStomp() {
    return this.adds.some((ad) => ad.cast && this.mech[ad.cast.key].kind === 'stomp' && this.f.geo.dist[ad.i] <= this.mech[ad.cast.key].radius);
  }
}

// ---- Majordomo Executus ---------------------------------------------------------------------------------------

export class MajordomoEncounter extends PackEncounter {
  constructor(fight, arena, onMessage, onAlert, def, opts = {}) {
    super(fight, arena, onMessage, onAlert, def, 'majordomo', MAJORDOMO_MECH, MAJORDOMO_INFO, { ...opts, tankHolds: 'skull', bossOutOfReach: true });
    this.domoCast = null;
    this.next = { magicReflection: MAJORDOMO_MECH.magicReflection.first, damageShield: MAJORDOMO_MECH.damageShield.first, teleport: MAJORDOMO_MECH.teleport.first };
    this.nextBurn = 0;
    // He cannot be harmed: always at full health on his frame, his damage taken wiped every frame.
    const base = fight.healthPct.bind(fight);
    fight.healthPct = (i = fight.primary, dt = 0) => (i === 0 ? 1 : base(i, dt));
    // Majordomo stays where he stands; he does not walk to the tank.
    arena.bossScripted = true;
    this.zoneIn();
  }

  get casting() { return this.domoCast; }

  // Everyone at the ramp's foot before the pull: the NPC tank ahead of you, the raiders in two groups at your sides
  // (clear of your view up the ramp).
  zoneIn() {
    const a = this.a;
    const z0 = DOMO.zoneIn.z;
    if (a.tank) { a.tank.position.set(0, a.groundY(0, z0 - 5), z0 - 5); a.tank.rotation.y = Math.PI; }
    const { raiders } = this.bots();
    (raiders || []).forEach((b, k) => {
      const side = k % 2 ? 1 : -1;
      const slot = Math.floor(k / 2);
      const x = side * (4 + (slot % 3) * 2.6);
      const z = z0 - 2 + Math.floor(slot / 3) * 3;
      b.domoStart = { x, z };
      if (b.model) { b.model.position.set(x, a.groundY(x, z), z); b.model.rotation.set(0, Math.PI, 0); }
    });
  }

  onBossHit(ev) {
    if (ev.target !== 0 || !(ev.amount > 0) || this.warnedImmune) return;
    this.warnedImmune = true;
    this.say('Majordomo Executus cannot be harmed: kill his Flamewakers');
  }

  onAddDied() {
    const left = this.alive().length;
    if (left === 4) this.say(YELLS.half);
  }

  update() {
    super.update();
    const f = this.f;
    if (!f.started || f.over) return;
    const t = f.t;
    if (!this.pulled) { this.pulled = true; this.say(YELLS.pull); }
    f.targets[0].taken = 0;
    if (f.o.tank) f.bossAt[0] = Infinity; // he never swings at you
    // All eight dead: he submits, and the fight is won.
    if (!this.alive().length) {
      this.say(YELLS.submit);
      this.domoCast = null;
      this.shield = null;
      f.targets[0].dead = true;
      f.end();
      return;
    }
    this.domoMechanics(t);
    this.burn(t);
  }

  // Majordomo's own casts: the shields in turn, and the teleport.
  domoMechanics(t) {
    const c = this.domoCast;
    const domo = this.a.dummies[0];
    if (c && t >= c.end) {
      this.domoCast = null;
      domo.userData.anim.cheer = 0;
      const m = MAJORDOMO_MECH[c.key];
      this.next[c.key] = c.end + m.every;
      if (m.kind === 'reflect' || m.kind === 'shield') {
        this.shield = { key: c.key, until: t + m.duration };
        for (const ad of this.alive()) this.a.fx.ring(ad.model.position.x, ad.model.position.z, 0.5, 2.5, m.kind === 'reflect' ? 0x8ab8ff : 0xffa040, 0.6, 1);
        this.say(m.kind === 'reflect' ? 'Magic Reflection on the Flamewakers: half the spells cast at them come back at the caster' : 'Damage Shield on the Flamewakers: each melee hit on one burns you for 100');
      } else if (m.kind === 'teleport') {
        this.teleport(c.victim, m);
      }
    }
    if (this.domoCast) return;
    for (const key of ['magicReflection', 'damageShield', 'teleport']) {
      const m = MAJORDOMO_MECH[key];
      if (t < this.next[key]) continue;
      this.domoCast = { key, name: m.name, start: t, end: t + m.cast };
      domo.userData.anim.cheer = 1;
      if (key === 'teleport') {
        const pool = this.npcs().map((n) => n.b);
        if (!this.f.dead) pool.push('me');
        this.domoCast.victim = pool.length ? pool[Math.floor(this.rnd() * pool.length)] : null;
      } else {
        this.notify(key, 'cast', `Majordomo casts ${m.name} on his guards`);
      }
      break;
    }
  }

  // Into the fire pit at the ramp's foot: you (out of your control for a moment: you were moved), or an NPC.
  teleport(victim, m) {
    const a = this.a;
    const P = DOMO.pit;
    if (!victim || victim.dead) return;
    const spot = { x: P.x + (this.rnd() - 0.5) * 2, z: P.z + (this.rnd() - 0.5) * 2 };
    if (victim === 'me') {
      if (this.f.dead) return;
      const from = a.player.position.clone();
      a.fx.blink(from, from);
      a.charging = null;
      a.knock = null;
      a.breakFear();
      a.player.position.set(spot.x, a.groundY(spot.x, spot.z), spot.z);
      a.fx.blink(a.player.position, a.player.position);
      a.camSnap = true;
      this.nextBurn = this.f.t; // it burns at once
      this.notify('teleport', 'cast', 'Majordomo teleported you into the fire pit - get out and run back up!');
      return;
    }
    const tank = this.bots().tank;
    const model = victim === tank ? a.tank : victim.model;
    if (!model) return;
    a.fx.blink(model.position, model.position);
    model.position.set(spot.x, a.groundY(spot.x, spot.z), spot.z);
    victim.pitUntil = this.f.t + 1 + this.rnd() * 1.5;
    this.hurtNpc(victim, m.burn * 2, m.school, 'Fire Pit');
    this.say(`Majordomo teleports ${victim.name} into the fire pit`);
  }

  // The fire pit's coals burn whoever stands in them.
  burn(t) {
    const p = this.a.playerPos();
    const P = DOMO.pit;
    if (this.f.dead || Math.hypot(p.x - P.x, p.z - P.z) > P.r || t < this.nextBurn) return;
    this.nextBurn = t + 1;
    this.f.takeDamage(MAJORDOMO_MECH.teleport.burn, { school: 'fire', name: 'Fire Pit' });
  }

  animate(dt) {
    super.animate(dt);
    const a = this.a;
    a.fx.fire(DOMO.pit.x, DOMO.pit.z, DOMO.pit.r * 0.8, dt * 0.5); // the coals flicker
    // The NPC tank walks up to the skull add's front at the pull, and on to the next one as each dies.
    const f = this.f;
    const tank = a.tank;
    const tb = this.bots().tank;
    a.tankIdle = !f.started;
    if (!tank || (tb && tb.dead)) { a.tankWalk = false; return; }
    let want = { x: 0, z: DOMO.zoneIn.z - 5 };
    const skull = f.started ? this.skullAdd() : null;
    if (f.started && tb && tb.pitUntil > f.t) want = { x: tank.position.x, z: tank.position.z };
    else if (skull) {
      const h = skull.home;
      const d = Math.hypot(h.x, h.z) || 1;
      const r = skull.model.userData.radius + 1;
      want = { x: h.x + (h.x / d) * r, z: h.z + (h.z / d) * r };
    }
    a.tankWalk = this.walk(tank, want, dt, skull ? skull.model.position : null);
  }

  // The way from one place to another on the terrace's three pieces: by the top of the ramp to leave the terrace or
  // come back onto it, by its foot to go out onto the floor or come back up; else straight.
  route(from, to) {
    const r = DOMO.ramp;
    const top = (x) => Math.max(-r.halfTop + 2, Math.min(r.halfTop - 2, x));
    const foot = (x) => Math.max(-r.halfBottom + 2, Math.min(r.halfBottom - 2, x));
    if (from.z < r.z0 && to.z > r.z0 + 1) return { x: top(to.x), z: r.z0 + 1.5 };
    if (from.z > r.z1 && to.z < r.z1 - 1) return { x: foot(from.x), z: r.z1 - 1.5 };
    if (from.z >= r.z0 && from.z <= r.z1 && to.z > r.z1 + 1) return { x: foot(to.x), z: r.z1 + 1.5 };
    if (from.z >= r.z0 && from.z <= r.z1 && to.z < r.z0 - 1) return { x: top(to.x), z: r.z0 - 1.5 };
    return to;
  }

  // Walks a model towards `want` at a run, on the walkable ground (sliding along the ramp's edges), facing where it
  // goes, then `face`. Returns whether it moved.
  walk(model, want, dt, face) {
    const a = this.a;
    want = this.route(model.position, want); // by the ramp, not over the terrace's edge
    const dx = want.x - model.position.x;
    const dz = want.z - model.position.z;
    const dist = Math.hypot(dx, dz);
    const moving = dist > 0.3;
    if (moving) {
      const step = Math.min(dist, RUN * dt);
      model.position.x += (dx / dist) * step;
      model.position.z += (dz / dist) * step;
      if (a.env.layout) a.env.layout.clamp(model.position, 0.8);
      model.rotation.y = Math.atan2(dx, dz);
    } else if (face) {
      model.rotation.y = Math.atan2(face.x - model.position.x, face.z - model.position.z);
    }
    model.position.y = a.groundY(model.position.x, model.position.z);
    return moving;
  }

  // main.js updateRaidBots hands each NPC raider's model here (Majordomo places his raid himself): at the ramp's foot
  // before the pull, then up to the terrace, the melee at the skull add's back and flanks, the rest in an arc behind
  // them at the terrace's front; out of the fire pit and back after a teleport.
  raidPlace(b, m, dt) {
    const f = this.f;
    if (b.dead) { animateCharacter(m, { dt, speed: 0, air: false, combat: false }); return; }
    const skull = f.started ? this.skullAdd() : null;
    let want = b.domoStart || { x: 0, z: DOMO.zoneIn.z + 3 };
    if (f.started && b.pitUntil > f.t) want = { x: m.position.x, z: m.position.z };
    else if (f.started) want = this.spotFor(b, skull);
    const moving = this.walk(m, want, dt, skull ? skull.model.position : this.a.dummies[0].position);
    animateCharacter(m, { dt, speed: moving ? 1 : 0, air: false, combat: f.started && !f.over });
  }

  // Each raider's place on the terrace.
  spotFor(b, skull) {
    const { raiders } = this.bots();
    const list = (raiders || []).filter((x) => x.melee === b.melee);
    const k = Math.max(0, list.indexOf(b));
    const n = Math.max(1, list.length);
    if (b.melee && skull) {
      // Around the add's back and flanks where it stands now (its front is the tank's: it faces whoever tanks it).
      const h = skull.model.position;
      const ang = skull.model.rotation.y + Math.PI + (k - (n - 1) / 2) * Math.min(0.5, 3 / n);
      const r = skull.model.userData.radius + 1.4;
      return { x: h.x + Math.sin(ang) * r, z: h.z + Math.cos(ang) * r };
    }
    // Two rows in an arc at the terrace's front, 20 and 23 yards from Majordomo.
    const row = k % 2;
    const slot = Math.floor(k / 2);
    const per = Math.ceil(n / 2);
    const ang = (slot - (per - 1) / 2) * Math.min(0.22, 1.2 / per);
    const r = row ? 23 : 20;
    return { x: Math.sin(ang) * r, z: Math.cos(ang) * r };
  }

  timers() {
    const t = this.f.t;
    const out = [];
    const c = this.domoCast;
    // The next shield (whichever it is), the teleport, and the soonest Blast Wave and Shadow Shock.
    const shieldKey = (c && c.key !== 'teleport') ? c.key : this.next.magicReflection <= this.next.damageShield ? 'magicReflection' : 'damageShield';
    for (const key of [shieldKey, 'teleport']) {
      const m = MAJORDOMO_MECH[key];
      const pending = c && c.key === key;
      out.push({ key, left: pending ? c.end - t : this.next[key] - t, total: pending ? m.cast : key === 'teleport' ? m.every : 30 });
    }
    return [...out, ...this.addTimers()];
  }

  // In the fire pit, or where a Blast Wave or Shadow Shock is about to land.
  inFire() {
    const p = this.a.playerPos();
    const P = DOMO.pit;
    return Math.hypot(p.x - P.x, p.z - P.z) <= P.r || this.inStomp();
  }
}

// ---- Sulfuron Harbinger ---------------------------------------------------------------------------------------

export class SulfuronEncounter extends PackEncounter {
  constructor(fight, arena, onMessage, onAlert, def, opts = {}) {
    super(fight, arena, onMessage, onAlert, def, 'sulfuron', SULFURON_MECH, SULFURON_INFO, { ...opts, tankHolds: 'boss', heal: false, shareBy: 0.45 });
    // His own blows: the Brute's kinds of mechanic (you get your healing from there).
    this.boss = new BruteEncounter(fight, arena, onMessage, onAlert, { ...def, mechanics: SULFURON_BOSS_MECH, info: SULFURON_INFO });
    if (opts.onLand) this.boss.onLand = opts.onLand;
  }

  get casting() { return this.boss.casting; }

  update() {
    super.update();
    this.boss.update();
  }

  timers() { return [...this.boss.timers(), ...this.addTimers()]; }
  inFire() { return this.boss.inFire() || this.inStomp(); }
}

// The encounter classes by ENCOUNTERS boss key (main.js newFight).
export const PACK_ENCOUNTERS = { majordomo: MajordomoEncounter, sulfuron: SulfuronEncounter };
