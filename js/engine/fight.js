// Real-time Fury warrior fight against training dummies. Time is in seconds from the pull.
// Formulas follow wowsims/forever: rage from sim/core/rage.go, the attack table from sim/core/target.go
// and spell_outcome.go, abilities from sim/warrior/*.go, racials from sim/core/racials.go, item effects
// from the wowsims spell store (js/data/db.js).
import {
  ABILITIES, ARMOR_CONSTANT_63, AURAS, BOSS_LEVEL, BOSS_ARMOR, CRIT_PER_AGI, DAMAGE_TAKEN, DAMAGE_TAKEN_RAGE, MELEE_ABILITIES,
  PLAYER_LEVEL, RACIALS, RAGE, RANGE, RATING, REFUND_ON_MISS, STANCES, STAT, TALENT, parseTalents,
} from '../data/warrior.js';

const AURA_NAMES = Object.fromEntries(Object.entries(AURAS).map(([id, a]) => [id, a.name]));
const WEAPON = { axe: 1, mace: 4, polearm: 6, staff: 8, sword: 9 }; // wowsims WeaponType
// Usable before the pull without starting the fight (the wowsims APLs' pre-pull: Berserker Rage at -4.5 s,
// Bloodrage and Battle Shout at -3 s).
const PREPULL = new Set(['bloodrage', 'berserkerRage', 'battleShout']);
// Hits that do not use a Sweeping Strikes charge (wowsims talents_arms.go: Whirlwind, Thunder Clap and the copies).
const NO_SWEEP = new Set(['whirlwind', 'whirlwindOh', 'sweepingStrikes', 'deepWounds', 'rend', 'touchOfTheGrave']);
import { WINDFURY } from '../data/buffs.js';
import { DB } from '../data/db.js';

const GCD = 1.5;
const DUAL_WIELD_MISS = 0.19;
const EXECUTE_PHASE = 0.2;
const TRAINING_HIT = 0.06;      // a "take a hit" drill hit, as a share of your maximum health (healed back over time)
const EXECUTE_ALWAYS_PCT = 0.15; // the dummies' health shown in an always-in-execute fight
const SHATTER_PER_STACK = 165; // Armor Shatter 16928

// One hand's attack table against a level 63 boss (sim/core/target.go newAttackTableHand).
function attackTable(skillBonus) {
  const levelDiff = BOSS_LEVEL - PLAYER_LEVEL;
  const skillDiff = levelDiff * 5 - skillBonus;
  const baseSkillDiff = levelDiff * 5 - Math.min(skillBonus, 0);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  return {
    miss: skillDiff > 10 ? 0.05 + skillDiff * 0.002 : 0.05 + skillDiff * 0.001,
    dodge: 0.05 + skillDiff * 0.001,
    parry: baseSkillDiff > 10 ? 0.05 + baseSkillDiff * 0.006 : 0.05 + baseSkillDiff * 0.001,
    block: Math.min(0.05, 0.05 + skillDiff * 0.001),
    glance: clamp(0.1 + baseSkillDiff * 0.02, 0, 1),
    glanceMin: clamp(1.3 - 0.05 * skillDiff, 0.01, 0.91),
    glanceMax: clamp(1.2 - 0.03 * skillDiff, 0.2, 0.99),
    critSuppression: baseSkillDiff > 0 ? baseSkillDiff * 0.002 : baseSkillDiff * 0.0004,
  };
}

// Stats an item effect states (wowsims Stat enum) as the engine's temporary stat names.
function statsFromEnum(sparse) {
  const out = {};
  const map = { [STAT.str]: 'str', [STAT.agi]: 'agi', [STAT.ap]: 'ap', [STAT.hit]: 'hitRating', [STAT.crit]: 'critRating', [STAT.haste]: 'hasteRating', [STAT.arpen]: 'arpen' };
  for (const [k, v] of Object.entries(sparse || {})) if (map[k]) out[map[k]] = (out[map[k]] || 0) + v;
  return out;
}

export class Fight {
  // sheet: character sheet from character.js.
  // opts: { duration, targets, startRage, queueWindow, precastShout, end, execute, health, moveEvery, moveFor, hitEvery }
  //   end: 'time' (default: over after `duration`, the dummies' health falls evenly as in the DPS sim),
  //        'health' (each dummy has `health`; over when they are all dead) or 'never' (over when you end it);
  //   execute: 'last20' (default: below 20% health), 'always' or 'never';
  //   moveEvery / moveFor: you have to get out of melee every moveEvery s for moveFor s (0 = never);
  //   hitEvery: you take a hit every hitEvery s (0 = never).
  constructor(sheet, opts, rng = Math.random) {
    this.c = sheet;
    this.o = opts;
    this.rng = rng;
    this.tal = parseTalents(sheet.talents);
    this.racial = RACIALS[sheet.race] || {};
    this.maxRage = RAGE.max * (this.racial.maxRageMult || 1);
    this.dual = !!sheet.oh;
    this.tables = { mh: attackTable(sheet.mh.skill || 0), oh: attackTable(sheet.oh ? sheet.oh.skill || 0 : 0) };

    this.t = 0;
    this.started = false;
    this.over = false;
    this.rage = Math.min(this.maxRage, opts.startRage);
    this.stance = opts.startStance || 'berserker'; // Arms starts in Battle Stance
    this.gcdEnd = 0;
    this.cds = {};
    this.catCds = {};
    this.used = {};
    this.procIcd = {};
    this.auras = {};
    this.events = [];
    this.queued = null;
    this.pending = null; // ability pressed inside the spell queue window
    this.casting = null; // { id, start, end, resets } while a cast (Slam) runs
    this.lastMhSwing = -Infinity; // time of the last main-hand swing (the APL's autoTimeSinceLast)
    this.mhNext = 0;
    this.ohNext = 0.1;
    this.targets = Array.from({ length: opts.targets }, (_, i) => ({ i, sunder: 0, sunderEnd: 0, shatter: 0, shatterEnd: 0, dw: null, rend: null, rendEnd: 0, taken: 0, dead: false }));
    this.primary = 0;
    // Where the player stands, set by the 3D arena every frame. Without an arena everyone is in melee
    // range behind the targets, the way wowsims sims by default.
    this.geo = { dist: this.targets.map(() => 0), inFront: this.targets.map(() => false), facing: true, moving: false };
    this.meter = {};
    this.total = 0;
    this.listeners = [];
    this.review = {
      rageWasted: 0, btIdle: 0, wwIdle: 0, hsQueued: 0, overpowerMissed: 0, stanceRageLost: 0, parried: 0, outOfRange: 0,
      damageTaken: 0, rageFromDamage: 0, hitsTaken: {},
    };
    this.maxHealth = sheet.health || 4000;
    this.health = this.maxHealth;
    this.dead = false;
    // Everything the results view needs (like the wowsims Results tab).
    this.stats = {
      casts: [],          // { t, id }
      dmgBuckets: [],     // damage per second of fight time
      rage: [],           // [t, rage] samples
      auras: {},          // id -> { name, icon, procs, uptime, since, intervals }
      rageGain: {}, rageWaste: {}, rageSpent: {},
      damageTakenBy: {},  // source -> damage
    };

    // Sunder Armor from the raid: already at 5 (a tank keeps it up) or stacked by other warriors at the pull.
    const sunder = sheet.sunder || { mode: 'off' };
    if (sunder.mode === 'full') {
      for (const t of this.targets) { t.sunder = 5; t.sunderEnd = Infinity; }
    }

    if (opts.precastShout) this.setAura('battleShout', ABILITIES.battleShout.duration - 3);
  }

  on(fn) { this.listeners.push(fn); }
  emit(ev) { ev.t = this.t; for (const fn of this.listeners) fn(ev); }

  setGeometry(geo) {
    this.geo = geo;
    if (this.casting && geo.moving) this.cancelCast(); // a cast stops when you move
  }
  setPrimary(i) { if (i >= 0 && i < this.targets.length) { this.primary = i; this.emit({ type: 'target', i }); } }
  get target() { return this.targets[this.primary]; }

  inMelee(i = this.primary) { return this.geo.dist[i] <= RANGE.melee; }
  canMelee(i = this.primary) { return this.inMelee(i) && this.geo.facing; }

  // ---- state queries -------------------------------------------------------------------

  aura(id) { const a = this.auras[id]; return a && a.end > this.t ? a : null; }
  cdLeft(id) {
    const ab = ABILITIES[id];
    let end = this.cds[id] || 0;
    if (ab && ab.stanceCd) end = Math.max(end, this.cds.stance || 0);
    const use = ab && ab.item && this.c.uses[ab.item];
    if (use && use.cat) end = Math.max(end, this.catCds[use.cat] || 0);
    return Math.max(0, end - this.t);
  }
  gcdLeft() { return Math.max(0, this.gcdEnd - this.t); }

  // How the fight ends and when the execute phase is: see the constructor.
  get endMode() { return this.o.end || 'time'; }
  get timed() { return this.endMode === 'time'; }
  // The time the fight is over at by the clock (Infinity when it ends some other way).
  get endTime() { return this.timed ? this.o.duration : Infinity; }

  // A target's health (0..1), dt seconds from now. Timed fights: falls evenly with the clock. Health pools:
  // from the damage taken, at the current DPS for dt. Always-in-execute and infinite fights: fixed.
  healthPct(i = this.primary, dt = 0) {
    const ex = this.o.execute || 'last20';
    if (ex === 'always') return EXECUTE_ALWAYS_PCT;
    if (this.endMode === 'never') return 1;
    if (this.endMode === 'health') {
      const t = this.targets[i] || this.target;
      return Math.max(0, 1 - (t.taken + this.dps() / this.targets.length * dt) / this.o.health);
    }
    return Math.max(0, 1 - (this.t + dt) / this.o.duration);
  }
  executePhase(dt = 0) {
    if ((this.o.execute || 'last20') === 'never') return false;
    return this.started && this.healthPct(this.primary, dt) <= EXECUTE_PHASE;
  }
  // Seconds of fight left, dt seconds from now: by the clock, the dummies' health at your DPS so far, or
  // Infinity when you end the fight yourself.
  timeLeft(dt = 0) {
    if (this.timed) return Math.max(0, this.o.duration - this.t - dt);
    if (this.endMode === 'never') return Infinity;
    const left = this.targets.reduce((s, t) => s + Math.max(0, this.o.health - t.taken), 0);
    const dps = Math.max(this.dps(), 300);
    return Math.max(0, left / dps - dt);
  }
  dps() { return this.t > 0 ? this.total / this.t : 0; }

  // The move window around time t ({ start, end }) when you have to be out of melee, or null.
  moveWindow(t = this.t) {
    const every = this.o.moveEvery || 0;
    const len = this.o.moveFor || 0;
    if (!every || !len || t < every) return null;
    const start = Math.floor(t / every) * every;
    return t < start + len ? { start, end: start + len } : null;
  }
  racialActive() { return this.racial.active && this.aura('racial') ? this.racial.active : null; }

  // Sum of the temporary stats from active item, consumable and potion auras.
  tempStats() {
    const out = { str: 0, agi: 0, ap: 0, hitRating: 0, critRating: 0, hasteRating: 0, arpen: 0, critPct: 0, dmgPct: 0 };
    let hasteMult = 1;
    for (const a of Object.values(this.auras)) {
      if (!a.stats || a.end <= this.t) continue;
      const n = a.stacks || 1;
      for (const [k, v] of Object.entries(a.stats)) {
        if (k === 'hastePct') hasteMult *= 1 + (v * n) / 100;
        else out[k] = (out[k] || 0) + v * n;
      }
    }
    out.hasteMult = hasteMult;
    return out;
  }

  ap() {
    const tmp = this.tempStats();
    let ap = this.c.ap + tmp.ap + tmp.str * 2 * this.c.statMult;
    const ownShout = this.aura('battleShout') ? ABILITIES.battleShout.ap + (this.c.bsT2 ? ABILITIES.battleShout.t2Bonus : 0) : 0;
    ap += Math.max(ownShout, this.c.externalShout || 0); // shouts do not stack
    const r = this.racialActive();
    if (r && r.apMult) ap *= r.apMult;
    return ap;
  }

  critPct() {
    const tmp = this.tempStats();
    let crit = this.c.critPct + STANCES[this.stance].crit;
    crit += tmp.agi * CRIT_PER_AGI * this.c.statMult + tmp.critRating / RATING.crit + tmp.critPct;
    crit += this.tal.cruelty * TALENT.cruelty.critPerRank;
    // Weaponmaster: crit with an axe or polearm.
    if (this.tal.weaponmaster && [WEAPON.axe, WEAPON.polearm].includes(this.c.mh.type)) crit += this.tal.weaponmaster * TALENT.weaponmaster.critPerRank;
    if (this.aura('recklessness')) crit += ABILITIES.recklessness.crit;
    const r = this.racialActive();
    if (r && r.critPct) crit += r.critPct;
    return crit;
  }

  hasteMult() {
    const tmp = this.tempStats();
    let h = (1 + (this.c.hastePct + tmp.hasteRating / RATING.haste) / 100) * tmp.hasteMult * (this.c.attackSpeedMult || 1);
    if (this.aura('flurry')) h *= 1 + this.tal.flurry * TALENT.flurry.hastePerRank;
    const r = this.racialActive();
    if (r && r.hasteMult) h *= r.hasteMult;
    return h;
  }

  damageMult() {
    let m = 1 + this.tempStats().dmgPct / 100;
    if (this.aura('deathWish')) m *= 1 + ABILITIES.deathWish.damage;
    if (this.aura('enrage')) m *= 1 + this.tal.enrage * TALENT.enrage.dmgPerRank;
    if (this.c.mh.twoHand) m *= 1 + this.tal.twohandedWeaponSpecialization * TALENT.twohandedWeaponSpecialization.dmgPerRank;
    return m;
  }

  // ---- casts (Slam) ----------------------------------------------------------------------------

  gcdFor(id) { return id === 'slam' ? GCD - this.tal.improvedSlam * TALENT.improvedSlam.gcdPerRank : GCD; }
  castTime(id) {
    const ab = ABILITIES[id];
    return ab && ab.castTime ? ab.castTime - (id === 'slam' ? this.tal.improvedSlam * TALENT.improvedSlam.castPerRank : 0) : 0;
  }
  cooldownFor(id) {
    const ab = ABILITIES[id];
    let cd = ab.cd || 0;
    if (id === 'intercept') cd -= this.tal.improvedIntercept * TALENT.improvedIntercept.cdPerRank;
    if (id === 'slam') cd -= this.tal.improvedSlam * TALENT.improvedSlam.cdPerRank;
    return cd;
  }
  castLeft() { return this.casting ? Math.max(0, this.casting.end - this.t) : 0; }

  // Starts a cast. Without Improved Slam, Slam holds your swings for the cast and restarts the timers after it.
  beginCast(id) {
    const c = { id, start: this.t, end: this.t + this.castTime(id), resets: !(id === 'slam' && this.tal.improvedSlam), mh0: this.mhNext, oh0: this.ohNext };
    this.casting = c;
    if (c.resets) {
      this.mhNext = Math.max(this.mhNext, c.end);
      if (this.dual) this.ohNext = Math.max(this.ohNext, c.end);
    }
    this.emit({ type: 'castStart', id, end: c.end });
    this.schedule(c.end, () => this.finishCast(c));
  }

  finishCast(c) {
    if (this.casting !== c) return; // cancelled
    this.casting = null;
    if (c.resets) {
      this.mhNext = this.t + this.c.mh.speed / this.hasteMult();
      if (this.dual) this.ohNext = this.t + this.c.oh.speed / this.hasteMult();
    }
    const ab = ABILITIES[c.id];
    this.emit({ type: 'castEnd', id: c.id });
    this.strike(c.id, ab.name, () => this.weaponDamage('mh', false) + ab.bonus, { refund: this.cost(c.id) });
  }

  // Moving stops a cast: its rage comes back and its cooldown does not start.
  cancelCast(reason = 'Interrupted') {
    const c = this.casting;
    if (!c) return;
    this.casting = null;
    this.addRage(this.cost(c.id), 'refund');
    this.cds[c.id] = 0;
    if (c.resets) { this.mhNext = Math.max(this.t, c.mh0); this.ohNext = Math.max(this.t, c.oh0); } // the held swings go on
    this.emit({ type: 'castEnd', id: c.id, cancelled: true });
    this.emit({ type: 'error', reason });
  }

  // ---- damage taken (boss fights) ------------------------------------------------------------

  damageTakenMult() {
    let m = 1;
    if (this.stance === 'berserker') m *= 1 + DAMAGE_TAKEN.berserker;
    if (this.aura('deathWish')) m *= 1 + DAMAGE_TAKEN.deathWish;
    if (this.aura('recklessness')) m *= 1 + DAMAGE_TAKEN.recklessness;
    return m;
  }

  // A hit on the player. Physical damage is reduced by armor. Taking damage gives rage and can proc
  // Enrage and Blood Craze. Returns the damage taken.
  takeDamage(amount, { school = 'physical', name = 'Boss' } = {}) {
    if (this.over || this.dead) return 0;
    const armorMult = school === 'physical' ? 1 - Math.min(0.75, this.c.armor / (this.c.armor + ARMOR_CONSTANT_63)) : 1;
    const dmg = amount * armorMult * this.damageTakenMult();
    this.health -= dmg;
    this.review.damageTaken += dmg;
    this.stats.damageTakenBy[name] = (this.stats.damageTakenBy[name] || 0) + dmg;
    this.review.hitsTaken[name] = (this.review.hitsTaken[name] || 0) + 1;
    this.emit({ type: 'hurt', amount: Math.round(dmg), name, school });

    const rage = DAMAGE_TAKEN_RAGE * amount;
    this.review.rageFromDamage += rage;
    this.addRage(rage, 'damage taken');

    if (this.tal.enrage && this.rng() < TALENT.enrage.chance) this.setAura('enrage', TALENT.enrage.duration);
    if (this.tal.bloodCraze && dmg > this.maxHealth * TALENT.bloodCraze.threshold) {
      const total = this.maxHealth * TALENT.bloodCraze.healPerRank * this.tal.bloodCraze;
      this.setAura('bloodCraze', TALENT.bloodCraze.duration);
      for (let i = 1; i <= 3; i++) this.schedule(this.t + i * 2, () => this.heal(total / 3));
    }
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.emit({ type: 'death', name });
      this.end();
    }
    return dmg;
  }

  heal(amount) {
    if (this.dead) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  // Sunder Armor (yours and the raid's share one stack) and Expose Armor do not stack: the larger applies.
  armorMult(target) {
    const sunder = target.sunderEnd > this.t ? target.sunder * ABILITIES.sunderArmor.armor : 0;
    const ownShatter = target.shatterEnd > this.t ? target.shatter * SHATTER_PER_STACK : 0;
    const removed = this.c.armorReduction + Math.max(sunder, this.c.exposeArmor || 0) +
      Math.max(ownShatter, this.c.raidShatter) + this.tempStats().arpen;
    let armor = Math.max(0, BOSS_ARMOR - removed);
    // Weaponmaster with a mace or staff ignores part of the armor.
    if (this.tal.weaponmaster && [WEAPON.mace, WEAPON.staff].includes(this.c.mh.type)) armor *= 1 - this.tal.weaponmaster * TALENT.weaponmaster.armorIgnorePerRank;
    const reduction = Math.min(0.75, armor / (armor + 400 + 85 * PLAYER_LEVEL));
    return 1 - reduction;
  }

  cost(id) {
    const ab = ABILITIES[id];
    let cost = ab.cost;
    if (id === 'heroicStrike') cost -= this.tal.improvedHeroicStrike * TALENT.improvedHeroicStrike.costPerRank;
    if ((id === 'whirlwind' || id === 'cleave') && this.tal.ragingBlows) cost -= TALENT.ragingBlows.costReduction;
    if (id === 'execute') cost -= TALENT.improvedExecute.costReduction[this.tal.improvedExecute] || 0;
    if (ab.shout) cost = Math.round(cost * (1 - this.tal.boomingVoice * TALENT.boomingVoice.shoutCostPerRank));
    const r = this.racialActive();
    if (r && r.costPct && r.abilities.includes(id)) cost *= 1 + r.costPct / 100;
    return Math.max(0, cost);
  }

  // Why the ability cannot be used right now, or null if it can.
  blocker(id) {
    const ab = ABILITIES[id];
    if (!ab) return 'Unknown ability';
    if (this.over) return 'The fight is over';
    if (ab.talent && !this.tal[ab.talent]) return `${ab.name} is not talented`;
    if (ab.item) {
      const use = this.c.uses[ab.item];
      if (!use) return `No ${ab.name.toLowerCase()} with a use effect`;
      if (use.oncePerFight && this.used[id]) return 'Only one potion per fight';
    }
    if (ab.racial && !this.racial.active) return 'Your race has no offensive racial';
    if (ab.stance && this.stance === ab.stance) return `Already in ${STANCES[ab.stance].name}`;
    if (ab.stances && !ab.stances.includes(this.stance)) return `Must be in ${ab.stances.map((s) => STANCES[s].name).join(' or ')}`;
    if (id === 'charge' || id === 'intercept') {
      if (id === 'charge' && this.started) return "Can't do that while in combat";
      const d = this.geo.dist[this.primary];
      if (d < ab.minRange) return 'Target is too close';
      if (d > ab.maxRange) return 'Out of range';
    }
    if (MELEE_ABILITIES.has(id)) {
      if (!this.inMelee()) return 'Out of range';
      if (!this.geo.facing) return 'You are facing the wrong way!';
    }
    if (id === 'execute' && !this.executePhase()) return "Target's health is above 20%";
    if (id === 'overpower' && !this.aura('overpowerWindow')) return 'Overpower needs a dodge first';
    if (this.casting) return 'Ability is not ready yet'; // nothing else while a cast runs (it can be queued)
    if (this.cdLeft(id) > 0) return 'Ability is not ready yet';
    if (ab.gcd && this.gcdLeft() > 0) return 'Ability is not ready yet';
    if (this.rage < this.cost(id)) return 'Not enough rage';
    return null;
  }

  // Why the ability would fail even after switching to a stance it can be used in (what a
  // stance-dance macro checks before it swaps), or null. A wait inside the spell queue window is fine.
  wouldFail(id) {
    const ab = ABILITIES[id];
    if (!ab) return null;
    const stance = this.stance;
    if (ab.stances && !ab.stances.includes(stance)) this.stance = ab.stances[0];
    let reason = this.blocker(id);
    this.stance = stance;
    if (reason === 'Ability is not ready yet' && this.readyIn(id) <= this.o.queueWindow) reason = null;
    return reason;
  }

  // Seconds until an ability is off its GCD, cooldown and any cast in progress.
  readyIn(id) {
    const ab = ABILITIES[id];
    return Math.max(ab.gcd ? this.gcdLeft() : 0, this.cdLeft(id), this.casting ? this.castLeft() + 0.001 : 0);
  }

  // ---- input -----------------------------------------------------------------------------

  // Called when the player presses an ability. Out of combat a stance change keeps you out of combat,
  // Charge and any other ability that can be used start the fight. Returns { ok, reason, queued }.
  press(id) {
    const ab = ABILITIES[id];
    if (!ab) return { ok: false, reason: 'Unknown ability' };

    if (!this.started) {
      if (this.over) return { ok: false, reason: 'The fight is over' };
      const reason = ab.queue ? (this.canMelee() ? null : this.inMelee() ? 'You are facing the wrong way!' : 'Out of range') : this.blocker(id);
      if (reason) return { ok: false, reason };
      if (ab.stance) { this.changeStance(ab.stance); return { ok: true }; }
      // Pre-pull: Bloodrage, Berserker Rage and Battle Shout before the pull, as the wowsims APLs do.
      if (PREPULL.has(id)) { this.cast(id); return { ok: true }; }
      this.start();
      if (id === 'charge') { this.cast(id); return { ok: true }; } // Charge is what pulls
    }

    if (ab.queue) {
      if (this.over) return { ok: false, reason: 'The fight is over' };
      if (this.rage < this.cost(id)) return { ok: false, reason: 'Not enough rage' };
      this.queued = id;
      this.emit({ type: 'queue', id });
      return { ok: true };
    }

    const reason = this.blocker(id);
    if (!reason) { this.cast(id); return { ok: true }; }

    // Spell queue window: a press shortly before the GCD, cooldown or cast ends fires when it ends.
    const wait = this.readyIn(id);
    if (reason === 'Ability is not ready yet' && wait <= this.o.queueWindow) {
      this.pending = { id, at: this.t + wait };
      return { ok: true, queued: true };
    }
    return { ok: false, reason };
  }

  cancelQueue() {
    if (this.queued) { this.queued = null; this.emit({ type: 'queue', id: null }); }
  }

  // ---- time --------------------------------------------------------------------------------

  start() {
    if (this.started) return;
    this.started = true;
    if (this.tal.angerManagement) this.every(TALENT.angerManagement.every, () => this.addRage(TALENT.angerManagement.rage, 'Anger Management'));
    // "Take a hit every N s": the hits give rage (and Enrage); your healers bring the health back meanwhile.
    if (this.o.hitEvery > 0) {
      this.every(this.o.hitEvery, () => this.takeDamage(this.maxHealth * TRAINING_HIT, { name: 'Training hit' }));
      this.every(1, () => this.heal(this.maxHealth * TRAINING_HIT / this.o.hitEvery));
    }
    this.emit({ type: 'start' });
    this.scheduleHelpSunders();
  }

  // "Help stack": the other warriors spend their first global cooldowns sundering the main target until it
  // has 5 stacks. Each application lasts 30 s from the last one, as yours do, so keeping it up is up to you.
  scheduleHelpSunders() {
    const sunder = this.c.sunder || {};
    if (sunder.mode !== 'help') return;
    const warriors = Math.max(1, sunder.warriors || 1);
    const target = this.targets[0];
    for (let gcd = 0; gcd < 5; gcd++) {
      this.schedule(0.3 + gcd * GCD, () => {
        for (let w = 0; w < warriors && target.sunder < ABILITIES.sunderArmor.maxStacks; w++) {
          target.sunder = target.sunderEnd > this.t ? target.sunder + 1 : 1;
          target.sunderEnd = this.t + ABILITIES.sunderArmor.duration;
          this.emit({ type: 'raidSunder', warrior: w + 2, stacks: target.sunder });
        }
      });
    }
  }

  schedule(at, fn) {
    this.events.push({ at, fn });
  }

  every(interval, fn) {
    const tick = () => { fn(); this.schedule(this.t + interval, tick); };
    this.schedule(this.t + interval, tick);
  }

  // Runs the fight forward to time `to`, processing swings and events in order.
  advance(to) {
    if (!this.started || this.over) return;
    to = Math.min(to, this.endTime);
    for (;;) {
      let next = this.mhNext;
      let kind = 'mh';
      if (this.dual && this.ohNext < next) { next = this.ohNext; kind = 'oh'; }
      let evIdx = -1;
      for (let i = 0; i < this.events.length; i++) {
        if (this.events[i].at < next) { next = this.events[i].at; kind = 'ev'; evIdx = i; }
      }
      if (this.pending && this.pending.at <= next) { next = this.pending.at; kind = 'pending'; }
      if (next > to) break;

      this.trackReview(next);
      this.t = next;
      if (kind === 'mh') this.swing('mh');
      else if (kind === 'oh') this.swing('oh');
      else if (kind === 'pending') {
        const id = this.pending.id;
        this.pending = null;
        const reason = this.blocker(id);
        if (!reason) this.cast(id); else this.emit({ type: 'error', reason });
      } else {
        const ev = this.events.splice(evIdx, 1)[0];
        ev.fn();
      }
      if (this.over) return; // the last dummy died (or you did)
    }
    this.trackReview(to);
    this.t = to;
    this.sampleRage();
    if (this.t >= this.endTime) this.end();
  }

  // You end the fight (infinite health, or any fight early).
  stop() { if (this.started && !this.over) this.end(); }

  sampleRage() {
    const r = this.stats.rage;
    if (!r.length || this.t - r[r.length - 1][0] >= 0.25) r.push([this.t, this.rage]);
  }

  end() {
    if (this.over) return;
    this.over = true;
    for (const [id, a] of Object.entries(this.stats.auras)) if (a.since != null) this.closeAura(id, this.t);
    this.emit({ type: 'end' });
  }

  // Aura uptime bookkeeping for the results.
  openAura(id, a) {
    const info = this.stats.auras[id] || (this.stats.auras[id] = { name: a.name || id, icon: a.icon, procs: 0, uptime: 0, since: null, intervals: [] });
    info.procs++;
    if (info.since == null) info.since = Math.max(0, this.t);
  }

  closeAura(id, at) {
    const info = this.stats.auras[id];
    if (!info || info.since == null) return;
    const end = Math.min(at, this.endTime);
    if (end > info.since) {
      info.uptime += end - info.since;
      info.intervals.push([info.since, end]);
    }
    info.since = null;
    this.emit({ type: 'auraEnd', id, name: info.name });
  }

  // Time Bloodthirst and Whirlwind sat ready outside the execute phase.
  trackReview(newT) {
    if (newT <= this.t) return;
    const execStart = this.timed && (this.o.execute || 'last20') === 'last20' ? this.o.duration * (1 - EXECUTE_PHASE)
      : this.executePhase() ? this.t : Infinity;
    const end = Math.min(newT, execStart);
    for (const [id, key] of [['bloodthirst', 'btIdle'], ['whirlwind', 'wwIdle']]) {
      if (id === 'bloodthirst' && !this.tal.bloodthirst) continue;
      const readyFrom = Math.max(this.t, this.cds[id] || 0);
      if (readyFrom < end) this.review[key] += end - readyFrom;
    }
  }

  // ---- resources and auras -----------------------------------------------------------------

  addRage(amount, source) {
    const before = this.rage;
    this.rage = Math.min(this.maxRage, this.rage + amount);
    const wasted = amount - (this.rage - before);
    if (this.started && wasted > 1e-9) this.review.rageWasted += wasted;
    const s = this.stats;
    s.rageGain[source] = (s.rageGain[source] || 0) + amount;
    if (wasted > 1e-9) s.rageWaste[source] = (s.rageWaste[source] || 0) + wasted;
    this.emit({ type: 'rage', amount, source, total: this.rage });
  }

  spendRage(amount, by = 'other') {
    if (amount <= 0) return;
    this.rage = Math.max(0, this.rage - amount);
    this.stats.rageSpent[by] = (this.stats.rageSpent[by] || 0) + amount;
  }

  // Starts or refreshes an aura. extra: { stats, stacks, maxStacks, name, icon } for item auras.
  setAura(id, duration, stacks = 0, extra = null) {
    const hasteBefore = this.hasteMult();
    const prev = this.aura(id);
    const a = { end: this.t + duration, stacks, duration, ...(extra || {}) };
    if (extra && extra.maxStacks) a.stacks = Math.min(extra.maxStacks, (prev ? prev.stacks : 0) + 1);
    this.auras[id] = a;
    if (!prev && this.stats.auras[id] && this.stats.auras[id].since != null) this.closeAura(id, this.t);
    this.openAura(id, { name: (extra && extra.name) || AURA_NAMES[id] || id, icon: extra && extra.icon });
    this.rescaleSwings(hasteBefore);
    if (Number.isFinite(a.end)) {
      const end = a.end;
      this.schedule(end, () => this.expire(id, end));
    }
    this.emit({ type: 'aura', id });
  }

  expire(id, end) {
    const a = this.auras[id];
    if (!a || a.end !== end) return;
    a.end = Infinity;
    const hasteBefore = this.hasteMult();
    delete this.auras[id];
    this.rescaleSwings(hasteBefore);
    this.closeAura(id, end);
    if (id === 'overpowerWindow') this.review.overpowerMissed++;
  }

  dropAura(id) {
    const a = this.auras[id];
    if (!a) return;
    a.end = Infinity;
    const hasteBefore = this.hasteMult();
    delete this.auras[id];
    this.rescaleSwings(hasteBefore);
    this.closeAura(id, this.t);
  }

  // A haste change speeds up or slows down the swings already in progress.
  rescaleSwings(hasteBefore) {
    const after = this.hasteMult();
    if (Math.abs(after - hasteBefore) < 1e-12) return;
    const ratio = hasteBefore / after;
    if (this.mhNext > this.t) this.mhNext = this.t + (this.mhNext - this.t) * ratio;
    if (this.dual && this.ohNext > this.t) this.ohNext = this.t + (this.ohNext - this.t) * ratio;
  }

  // ---- item effects (wowsims spell store) --------------------------------------------------

  // Applies an item, enchant or consumable effect: fx = { b: spell id, d: duration ms, s: stats }.
  applyEffect(fx, key, label, icon, parentEnd = null) {
    const sp = DB.spells[fx.b];
    const name = label || (sp && sp.n);
    const durMs = fx.d > 0 ? fx.d : sp && sp.d > 0 ? sp.d : 0;
    const duration = parentEnd != null ? parentEnd - this.t : durMs / 1000;

    if (fx.s && Object.keys(fx.s).length) {
      this.setAura(key, duration, 0, { stats: statsFromEnum(fx.s), name, icon, maxStacks: fx.max });
      return;
    }
    if (!sp) return;

    const stats = {};
    let damageDone = false;
    for (const e of sp.fx) {
      const bp = e.bp || 0;
      if (e.t === 'E_APPLY_AURA') {
        switch (e.a) {
          case 'A_MOD_STAT':
            if (!e.m || e.m === -1) stats.str = (stats.str || 0) + bp;
            if (e.m === 1 || e.m === -1) stats.agi = (stats.agi || 0) + bp;
            break;
          case 'A_MOD_ATTACK_POWER': stats.ap = (stats.ap || 0) + bp; break;
          case 'A_MOD_MELEE_HASTE':
          case 'A_MOD_MELEE_HASTE_2':
          case 'A_MOD_MELEE_HASTE_3': stats.hastePct = (stats.hastePct || 0) + bp; break;
          case 'A_MOD_CRIT_PCT': stats.critPct = (stats.critPct || 0) + bp; break;
          case 'A_MOD_DAMAGE_PERCENT_DONE': if ((e.m || 0) & 1) stats.dmgPct = (stats.dmgPct || 0) + bp; break;
          case 'A_MOD_ARMOR_NO_MODS':
          case 'A_MOD_RESISTANCE':
            if (bp < 0 && ((e.m || 0) & 1) && fx.b === 16928) this.addShatter(this.target, duration);
            break;
          case 'A_PERIODIC_TRIGGER_SPELL': {
            const end = this.t + duration;
            const period = (e.p || 1000) / 1000;
            for (let t = this.t + period; t <= end + 1e-9; t += period) {
              this.schedule(t, () => this.applyEffect({ b: e.tr }, key + ':stack', label, icon, end));
            }
            break;
          }
          default: break;
        }
      } else if (e.t === 'E_TRIGGER_SPELL' && e.tr) {
        this.applyEffect({ b: e.tr }, key + ':stack', label, icon, this.t + duration);
      } else if (e.t === 'E_ADD_EXTRA_ATTACKS') {
        for (let i = 0; i < Math.max(1, bp); i++) this.mainHandAttack({ extra: true, source: name });
      } else if (e.t === 'E_SCHOOL_DAMAGE' && !damageDone) {
        damageDone = true; // further damage effects are side or self effects (Goblin Sapper Charge)
        const amount = bp * (1 + (this.rng() - 0.5) * (e.v || 0));
        const targets = key === 'explosive' ? this.targets.filter((t) => this.geo.dist[t.i] <= 10) : [this.target];
        for (const target of targets) {
          const dmg = sp.sc === 1 ? amount * this.armorMult(target) * this.damageMult() : amount;
          this.record('proc:' + fx.b, name, dmg, 'hit', target.i, icon);
        }
      } else if (e.t === 'E_ENERGIZE' && e.m === 1) {
        this.addRage((bp / 10) * (1 + (this.rng() - 0.5) * (e.v || 0)), name);
      }
    }
    if (Object.keys(stats).length && duration > 0) {
      this.setAura(key, duration, 0, { stats, name, icon, maxStacks: sp.ms || 0 });
    }
  }

  addShatter(target, duration) {
    target.shatter = target.shatterEnd > this.t ? Math.min(3, target.shatter + 1) : 1;
    target.shatterEnd = this.t + duration;
  }

  // Item, enchant and racial procs on a landed melee hit with `hand`.
  rollProcs(hand, extra, target) {
    this.c.procs.forEach((p, i) => {
      if (p.hand !== 'any' && p.hand !== hand) return;
      if (p.icd && (this.procIcd[i] || 0) > this.t) return;
      const sp = DB.spells[p.fx.b];
      if (extra && sp && sp.fx.some((e) => e.t === 'E_ADD_EXTRA_ATTACKS')) return;
      const speed = (hand === 'oh' && this.c.oh ? this.c.oh : this.c.mh).speed;
      const chance = p.chance || (p.ppm * speed) / 60;
      if (this.rng() >= chance) return;
      if (p.icd) this.procIcd[i] = this.t + p.icd;
      this.applyEffect(p.fx, `proc${i}`, p.hand === 'any' ? p.name : `${p.name} (${p.hand.toUpperCase()})`, p.icon);
    });
    // Touch of the Grave (Undead): a shadow drain of 5% of maximum health.
    const tog = this.racial.touchOfTheGrave;
    if (tog && (this.procIcd.tog || 0) <= this.t && this.rng() < tog.chance) {
      this.procIcd.tog = this.t + tog.icd;
      this.record('touchOfTheGrave', 'Touch of the Grave', tog.healthPct * this.c.health, 'hit', target.i);
    }
  }

  // ---- attacks -----------------------------------------------------------------------------

  weapon(hand) { return hand === 'mh' ? this.c.mh : this.c.oh; }

  weaponDamage(hand, normalized, bonusAp = 0) {
    const w = this.weapon(hand);
    const base = w.min + this.rng() * (w.max - w.min) + (w.flat || 0);
    return base + ((this.ap() + bonusAp) / 14) * (normalized ? w.norm : w.speed);
  }

  hitPct(hand) {
    let hit = this.c.hitPct + this.tempStats().hitRating / RATING.hit;
    if (hand === 'oh') hit += this.tal.furiousPrecision * TALENT.furiousPrecision.ohHitPerRank;
    return hit;
  }

  dodgeChance(hand) { return Math.max(0, this.tables[hand].dodge - this.c.expertisePct / 100); }

  // Parry and block only happen when you stand in front of the target (sim/core/spell_outcome.go).
  parryChance(hand, target) { return this.geo.inFront[target.i] ? Math.max(0, this.tables[hand].parry - this.c.expertisePct / 100) : 0; }
  blockChance(hand, target) { return this.geo.inFront[target.i] ? this.tables[hand].block : 0; }

  // White swing outcome: one roll over miss, dodge, parry, glance, block, crit, hit.
  rollWhite(hand, target) {
    const tb = this.tables[hand];
    let miss = tb.miss - this.hitPct(hand) / 100;
    // Dual wielding adds 19% miss to every white swing. In Forever a queued Heroic Strike / Cleave does not
    // remove it from the off hand (that is Classic); wowsims' queue aura never sets DisableDWMissPenalty.
    if (this.dual) miss += DUAL_WIELD_MISS;
    miss = Math.max(0, miss);
    const r = this.rng();
    let acc = miss;
    if (r < acc) return 'miss';
    acc += this.dodgeChance(hand);
    if (r < acc) return 'dodge';
    acc += this.parryChance(hand, target);
    if (r < acc) return 'parry';
    acc += tb.glance;
    if (r < acc) return 'glance';
    acc += this.blockChance(hand, target);
    if (r < acc) return 'block';
    acc += Math.max(0, this.critPct() / 100 - tb.critSuppression);
    if (r < acc) return 'crit';
    return 'hit';
  }

  // Special attack outcome: miss, dodge, parry and block on one roll, then a separate crit roll.
  rollYellow(hand, target, bonusCrit = 0) {
    const tb = this.tables[hand];
    const r = this.rng();
    let acc = Math.max(0, tb.miss - this.hitPct(hand) / 100);
    if (r < acc) return 'miss';
    acc += this.dodgeChance(hand);
    if (r < acc) return 'dodge';
    acc += this.parryChance(hand, target);
    if (r < acc) return 'parry';
    acc += this.blockChance(hand, target);
    if (r < acc) return 'block';
    const crit = Math.max(0, (this.critPct() + bonusCrit) / 100 - tb.critSuppression);
    return this.rng() < crit ? 'crit' : 'hit';
  }

  landed(outcome) { return outcome !== 'miss' && outcome !== 'dodge' && outcome !== 'parry'; }

  record(key, name, amount, outcome, target = 0, icon = null) {
    const m = this.meter[key] || (this.meter[key] = { name, icon, damage: 0, count: 0, crits: 0, misses: 0, dodges: 0, parries: 0, glances: 0 });
    m.damage += amount;
    m.count++;
    if (outcome === 'crit') m.crits++;
    if (outcome === 'miss') m.misses++;
    if (outcome === 'dodge') m.dodges++;
    if (outcome === 'parry') { m.parries++; this.review.parried++; }
    if (outcome === 'glance') m.glances++;
    if (outcome === 'block') m.blocks = (m.blocks || 0) + 1;
    if (amount > 0) {
      if (outcome === 'crit') { m.critDamage = (m.critDamage || 0) + amount; } else { m.hitDamage = (m.hitDamage || 0) + amount; m.hits = (m.hits || 0) + 1; }
    }
    const b = Math.floor(this.t);
    this.stats.dmgBuckets[b] = (this.stats.dmgBuckets[b] || 0) + amount;
    this.total += amount;
    this.emit({ type: 'damage', key, name, amount: Math.round(amount), outcome, target });
    if (amount > 0 && this.endMode === 'health') this.woundTarget(target, amount);
  }

  // Health-pool fights: a dummy dies at `health` damage; your target moves on to a living one, and the fight
  // is over when they are all dead.
  woundTarget(i, amount) {
    const t = this.targets[i];
    if (!t || t.dead) return;
    t.taken += amount;
    if (t.taken < this.o.health) return;
    t.taken = this.o.health;
    t.dead = true;
    this.emit({ type: 'targetDied', i });
    const alive = this.targets.find((x) => !x.dead);
    if (!alive) { this.end(); return; }
    if (i === this.primary) this.setPrimary(alive.i);
  }

  // Applies multipliers and records a physical hit on a target. A block is a hit that cannot crit; the
  // dummy has no block value, so it takes off no damage.
  deal(key, name, raw, outcome, target, { yellow = false, hand = 'mh' } = {}) {
    if (!this.landed(outcome)) { this.record(key, name, 0, outcome, target.i); return 0; }
    let dmg = raw + this.c.physDmgTaken;
    dmg *= this.damageMult() * this.armorMult(target);
    if (hand === 'oh') dmg *= 0.5 * (1 + this.tal.dualWieldSpecialization * TALENT.dualWieldSpecialization.ohDmgPerRank);
    if (outcome === 'glance') {
      const tb = this.tables[hand];
      dmg *= tb.glanceMin + this.rng() * (tb.glanceMax - tb.glanceMin);
    }
    if (outcome === 'crit') dmg *= yellow ? 1 + (1 + this.tal.impale * TALENT.impale.critBonusPerRank) : 2;
    const r = this.racialActive();
    if (yellow && r && r.damagePct && r.abilities.includes(key)) dmg *= 1 + r.damagePct / 100;
    this.record(key, name, dmg, outcome, target.i);
    if (dmg > 0) this.sweep(key, dmg / this.armorMult(target), target);
    return dmg;
  }

  // Sweeping Strikes: a melee hit also hits another nearby enemy for the same damage before armor, using a
  // charge; an Execute in the execute phase is copied as a normalized main-hand hit instead (talents_arms.go).
  sweep(key, preArmor, from) {
    const a = this.aura('sweepingStrikes');
    if (!a || NO_SWEEP.has(key) || key.startsWith('proc')) return;
    const other = this.targets.find((t) => t.i !== from.i && !t.dead && this.geo.dist[t.i] <= RANGE.whirlwind);
    if (!other) return;
    a.stacks--;
    if (a.stacks <= 0) this.dropAura('sweepingStrikes');
    const raw = key === 'execute' && this.executePhase() ? this.weaponDamage('mh', true) * this.damageMult() : preArmor;
    this.record('sweepingStrikes', 'Sweeping Strikes', raw * this.armorMult(other), 'hit', other.i);
  }

  // Arms talents on main-hand swings (white or Heroic Strike / Cleave): Bloodthrill opens the Overpower window
  // when the target bleeds from your Rend.
  onSwing(outcome, target) {
    if (!this.tal.bloodthrill || !this.landed(outcome) || !(target.rend && target.rendEnd > this.t)) return;
    if (this.rng() < this.tal.bloodthrill * TALENT.bloodthrill.chancePerRank) this.setAura('overpowerWindow', ABILITIES.overpower.window);
  }

  // Procs every melee result can trigger.
  afterMelee(outcome, target, { white = false, whirlwindOh = false, hand = 'mh', extra = false } = {}) {
    if (outcome === 'dodge') this.setAura('overpowerWindow', ABILITIES.overpower.window);
    if (this.landed(outcome)) this.rollProcs(hand, extra, target);
    // Weaponmaster with a sword: a chance on a main-hand hit for an extra attack (not from extra attacks).
    if (hand === 'mh' && !extra && this.landed(outcome) && this.tal.weaponmaster && this.c.mh.type === WEAPON.sword &&
      this.rng() < this.tal.weaponmaster * TALENT.weaponmaster.extraAttackPerRank) {
      this.schedule(this.t, () => this.mainHandAttack({ extra: true, source: 'Weaponmaster' }));
    }
    if (outcome === 'crit') {
      if (this.tal.flurry && !whirlwindOh) this.setAura('flurry', TALENT.flurry.duration, TALENT.flurry.charges);
      if (this.tal.deepWounds) this.applyDeepWounds(target);
      return;
    }
    const fl = this.aura('flurry');
    if (white && fl) {
      fl.stacks--;
      if (fl.stacks <= 0) this.dropAura('flurry');
    }
  }

  // Deep Wounds as wowsims Forever has it (talents_arms.go registerDeepWounds): every physical crit adds a share
  // of the average main-hand hit to the bleed. While it is up, the damage still to tick is added in and the sum
  // is spread over a full set of ticks; the ticks keep the first application's timer.
  applyDeepWounds(target) {
    const w = this.c.mh;
    const avg = (w.min + w.max) / 2 + (this.ap() / 14) * w.speed;
    const { duration, tick } = TALENT.deepWounds;
    const ticks = duration / tick;
    const added = avg * this.tal.deepWounds * TALENT.deepWounds.sharePerRank * this.damageMult();
    const dw = target.dw;
    if (dw && dw.ticksLeft > 0) {
      dw.perTick = (dw.perTick * dw.ticksLeft + added) / ticks;
      dw.ticksLeft = ticks;
      return;
    }
    const bleed = { perTick: added / ticks, ticksLeft: ticks };
    target.dw = bleed;
    const tickOnce = () => {
      if (target.dw !== bleed || bleed.ticksLeft <= 0) return;
      bleed.ticksLeft--;
      this.record('deepWounds', 'Deep Wounds', bleed.perTick, 'hit', target.i);
      if (bleed.ticksLeft > 0) this.schedule(this.t + tick, tickOnce);
    };
    this.schedule(this.t + tick, tickOnce);
  }

  swing(hand) {
    // Out of range or facing away: the swing waits and goes off as soon as you are back.
    if (!this.canMelee()) {
      if (hand === 'mh') this.mhNext = this.t + 0.1; else this.ohNext = this.t + 0.1;
      this.review.outOfRange += hand === 'mh' ? 0.1 : 0;
      return;
    }
    if (hand === 'mh') { this.lastMhSwing = this.t; this.mainHandAttack({}); } else {
      this.whiteSwing('oh', 0);
      this.ohNext = this.t + this.c.oh.speed / this.hasteMult();
    }
  }

  // A main-hand attack: the timed swing or an extra attack. A queued Heroic Strike / Cleave replaces it.
  mainHandAttack({ extra = false, bonusAp = 0, source = '' }) {
    if (this.queued) {
      const id = this.queued;
      this.queued = null;
      const cost = this.cost(id);
      this.emit({ type: 'queue', id: null });
      if (this.rage >= cost) {
        this.review.hsQueued++;
        this.queuedAttack(id, cost, extra);
        this.mhNext = this.t + this.c.mh.speed / this.hasteMult();
        return;
      }
    }
    this.whiteSwing('mh', bonusAp, extra, source);
    this.mhNext = this.t + this.c.mh.speed / this.hasteMult();
  }

  whiteSwing(hand, bonusAp, extra = false, source = '') {
    const target = this.target;
    const outcome = this.rollWhite(hand, target);
    const key = bonusAp ? 'windfury' : extra ? 'extra' : hand;
    const name = bonusAp ? 'Windfury Attack' : extra ? `Extra attack (${source})` : hand === 'mh' ? 'Main Hand' : 'Off Hand';
    const raw = this.landed(outcome) ? this.weaponDamage(hand, false, bonusAp) : 0;
    this.deal(key, name, raw, outcome, target, { hand });

    if (this.landed(outcome)) {
      // Rage from white hits (sim/core/rage.go).
      const w = this.weapon(hand);
      let factor = RAGE.hitFactor;
      let handMult = 1;
      if (hand === 'oh') {
        factor /= 2;
        handMult = 1 + this.tal.dualWieldSpecialization * TALENT.dualWieldSpecialization.ohRagePerRank;
      }
      const swingRage = factor * w.speed * handMult;
      let rage = swingRage * (w.twoHand ? RAGE.twoHandMultiplier : 1);
      if (outcome === 'crit') rage += RAGE.critBonus * swingRage;
      this.addRage(rage, hand === 'mh' ? 'Main Hand' : 'Off Hand');

      if (this.tal.unbridledWrath && this.rng() < this.tal.unbridledWrath * TALENT.unbridledWrath.chancePerRank) {
        this.addRage(TALENT.unbridledWrath.rage, 'Unbridled Wrath');
      }
    }
    this.afterMelee(outcome, target, { white: true, hand, extra: extra || !!bonusAp });
    if (hand === 'mh') this.onSwing(outcome, target);
    if (hand === 'mh' && !bonusAp && !extra && this.landed(outcome)) this.maybeWindfury();
  }

  // A Windfury extra attack does not reset the main-hand swing timer in wowsims Forever (its main-hand swing
  // count matches the off hand's haste only without the reset).
  maybeWindfury() {
    if (!this.c.windfuryAp || this.rng() >= WINDFURY.chance) return;
    this.whiteSwing('mh', this.c.windfuryAp);
  }

  // Targets other than the primary that a cleaving attack reaches, nearest first.
  others(range) {
    return this.targets.filter((t) => t.i !== this.primary && !t.dead && this.geo.dist[t.i] <= range)
      .sort((a, b) => this.geo.dist[a.i] - this.geo.dist[b.i]);
  }

  // Heroic Strike / Cleave replacing a main-hand swing.
  queuedAttack(id, cost, extra) {
    const ab = ABILITIES[id];
    this.spendRage(cost, id);
    this.stats.casts.push({ t: this.t, id });
    const targets = [this.target, ...(id === 'cleave' ? this.others(RANGE.melee).slice(0, ab.maxTargets - 1) : [])];
    let firstLanded = false;
    targets.forEach((target, i) => {
      const outcome = this.rollYellow('mh', target);
      if (i === 0) firstLanded = this.landed(outcome);
      const raw = this.landed(outcome) ? this.weaponDamage('mh', false) + ab.bonus : 0;
      this.deal(id, ab.name, raw, outcome, target, { yellow: true });
      this.afterMelee(outcome, target, { extra });
      if (i === 0) this.onSwing(outcome, target);
    });
    if (!firstLanded) this.addRage(cost * REFUND_ON_MISS, 'refund');
    if (firstLanded && !extra) this.maybeWindfury();
  }

  // A yellow main-hand strike on the primary target. Returns the outcome.
  strike(id, name, raw, { bonusCrit = 0, refund = 0 } = {}) {
    const target = this.target;
    const outcome = this.rollYellow('mh', target, bonusCrit);
    this.deal(id, name, this.landed(outcome) ? raw() : 0, outcome, target, { yellow: true });
    this.afterMelee(outcome, target);
    if (!this.landed(outcome) && refund) this.addRage(refund * REFUND_ON_MISS, 'refund');
    // The Windfury Totem aura (10609) procs from main-hand specials as well as white swings.
    if (this.landed(outcome)) this.maybeWindfury();
    return outcome;
  }

  // ---- abilities ---------------------------------------------------------------------------

  cast(id) {
    const ab = ABILITIES[id];
    const cost = this.cost(id);
    if (ab.gcd && this.started) this.gcdEnd = this.t + this.gcdFor(id); // a pre-pull GCD is over by the pull
    if (ab.cd) this.cds[id] = this.t + this.cooldownFor(id);
    this.spendRage(cost, id);
    this.stats.casts.push({ t: this.t, id });
    this.emit({ type: 'cast', id });
    const target = this.target;

    if (ab.item) { this.useItem(id); return; }
    if (ab.stance) { this.changeStance(ab.stance); return; }
    if (ab.castTime) { this.beginCast(id); return; } // Slam lands when its cast ends (finishCast)

    switch (id) {
      case 'mortalStrike': {
        this.strike(id, ab.name, () => this.weaponDamage('mh', true) + ab.bonus, { refund: cost });
        break;
      }
      case 'spearingStrike': {
        this.strike(id, ab.name, () => ab.weaponShare * this.weaponDamage('mh', true), { refund: cost });
        break;
      }
      case 'sweepingStrikes': {
        this.setAura('sweepingStrikes', ab.duration, ab.charges);
        break;
      }
      case 'bloodthirst': {
        this.strike(id, ab.name, () => this.ap() * ab.apCoef + ab.base, { refund: cost });
        break;
      }
      case 'whirlwind': {
        // Hits everything within 8 yards, facing does not matter.
        const inReach = this.targets.filter((t) => !t.dead && this.geo.dist[t.i] <= RANGE.whirlwind).slice(0, ab.maxTargets);
        let mhLanded = false;
        for (const t of inReach) {
          const outcome = this.rollYellow('mh', t);
          this.deal(id, ab.name, this.landed(outcome) ? this.weaponDamage('mh', true) : 0, outcome, t, { yellow: true });
          this.afterMelee(outcome, t);
          mhLanded = mhLanded || this.landed(outcome);
          if (this.tal.ragingBlows && this.dual) {
            const oh = this.rollYellow('oh', t);
            this.deal('whirlwindOh', 'Whirlwind (Off Hand)', this.landed(oh) ? this.weaponDamage('oh', true) : 0, oh, t, { yellow: true, hand: 'oh' });
            this.afterMelee(oh, t, { whirlwindOh: true, hand: 'oh' });
          }
        }
        if (mhLanded) this.maybeWindfury(); // once per Whirlwind (the totem aura has a 100 ms cooldown)
        break;
      }
      case 'execute': {
        const extra = Math.min(this.rage, this.maxRage - cost);
        this.spendRage(extra, id);
        this.strike(id, ab.name, () => ab.base + ab.perRage * extra, { refund: cost });
        break;
      }
      case 'hamstring': {
        this.strike(id, ab.name, () => ab.base, { refund: cost });
        break;
      }
      case 'overpower': {
        this.dropAura('overpowerWindow');
        this.strike(id, ab.name, () => this.weaponDamage('mh', true) + ab.bonus,
          { bonusCrit: this.tal.improvedOverpower * TALENT.improvedOverpower.critPerRank, refund: cost });
        break;
      }
      case 'rend': {
        const outcome = this.rollYellow('mh', target);
        if (this.landed(outcome)) this.applyRend(target);
        else { this.record(id, ab.name, 0, outcome, target.i); this.addRage(cost * REFUND_ON_MISS, 'refund'); }
        if (outcome === 'dodge') this.setAura('overpowerWindow', ABILITIES.overpower.window);
        break;
      }
      case 'sunderArmor': {
        const outcome = this.rollYellow('mh', target);
        if (this.landed(outcome)) {
          target.sunder = target.sunderEnd > this.t ? Math.min(ab.maxStacks, target.sunder + 1) : 1;
          target.sunderEnd = Math.max(target.sunderEnd, this.t + ab.duration);
        } else {
          this.record(id, ab.name, 0, outcome, target.i);
          this.addRage(cost * REFUND_ON_MISS, 'refund');
        }
        if (outcome === 'dodge') this.setAura('overpowerWindow', ABILITIES.overpower.window);
        this.emit({ type: 'sunder', outcome, stacks: target.sunder });
        break;
      }
      case 'charge': {
        this.addRage(ab.rage + ab.ragePerTalentRank * this.tal.improvedCharge, ab.name);
        this.emit({ type: 'charge', target: this.primary });
        break;
      }
      case 'intercept': {
        // Intercept Stun: a little physical damage that cannot be dodged. Raid bosses are immune to the stun.
        this.deal(id, ab.name, ab.damage, 'hit', target);
        this.emit({ type: 'charge', target: this.primary });
        break;
      }
      case 'bloodrage': {
        this.addRage(ab.instantRage, ab.name);
        this.setAura('bloodrage', ab.duration);
        for (let i = 1; i <= ab.ticks; i++) this.schedule(this.t + i, () => this.addRage(ab.tickRage, ab.name));
        break;
      }
      case 'berserkerRage': {
        this.setAura('berserkerRage', ab.duration);
        const rage = this.tal.improvedBerserkerRage * TALENT.improvedBerserkerRage.ragePerRank;
        if (rage) this.addRage(rage, ab.name);
        break;
      }
      case 'racial': {
        const r = this.racial.active;
        this.cds.racial = this.t + r.cd;
        this.setAura('racial', r.duration, 0, { name: r.name, icon: r.icon });
        break;
      }
      case 'deathWish':
      case 'recklessness':
      case 'battleShout':
        this.setAura(id, ab.duration);
        break;
    }
  }

  // Rend as wowsims Forever has it (rend.go, checked against its combat log): each tick is 21 + 2% of your attack
  // power at that tick, with Improved Rend and your damage bonuses, plus flat physical damage taken (Gift of Arthas).
  // Ticks can crit like abilities (x2.2 with Impale); a crit tick does not trigger Deep Wounds (its log shows none).
  applyRend(target) {
    const ab = ABILITIES.rend;
    const bonus = 1 + (TALENT.improvedRend.bonus[this.tal.improvedRend] || 0);
    const id = Symbol('rend');
    target.rend = id;
    target.rendEnd = this.t + ab.duration;
    for (let i = 1; i <= ab.duration / ab.tick; i++) {
      this.schedule(this.t + i * ab.tick, () => {
        if (target.rend !== id) return;
        let dmg = (ab.tickBase + ab.tickApCoef * this.ap()) * bonus * this.damageMult() + this.c.physDmgTaken;
        const crit = this.rng() < Math.max(0, this.critPct() / 100 - this.tables.mh.critSuppression);
        if (crit) dmg *= 1 + (1 + this.tal.impale * TALENT.impale.critBonusPerRank);
        this.record('rend', 'Rend', dmg, crit ? 'crit' : 'hit', target.i);
      });
    }
  }

  // Stance change: off the global cooldown, shared 1 s cooldown, rage above Tactical Mastery is lost.
  changeStance(stance) {
    const tm = TALENT.tacticalMastery;
    const keep = tm.base + tm.perRank * this.tal.improvedTacticalMastery;
    if (this.rage > keep) {
      if (this.started) this.review.stanceRageLost += this.rage - keep;
      this.stats.rageSpent['Stance change (lost)'] = (this.stats.rageSpent['Stance change (lost)'] || 0) + this.rage - keep;
      this.rage = keep;
    }
    this.cds.stance = this.t + ABILITIES[stance + 'Stance'].stanceCd;
    this.stance = stance;
    this.emit({ type: 'stance', stance });
  }

  useItem(id) {
    const use = this.c.uses[ABILITIES[id].item];
    if (use.cd) this.cds[id] = this.t + use.cd;
    if (use.cat && use.ccd) this.catCds[use.cat] = this.t + use.ccd;
    this.used[id] = true;
    this.applyEffect(use.fx, id, use.name, use.icon);
  }
}
