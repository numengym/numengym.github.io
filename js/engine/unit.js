// The class-independent core of a fight: one player's unit against the targets of an Encounter (engine/target.js),
// in real time, in seconds from the pull. It runs the clock and its events, auras and temporary stats, the
// attack table, white swings, item and enchant procs, damage, casts, damage taken and the fight's end. A class
// module extends it (classes/warrior/fight.js) with its resource, abilities and talents, through the hooks
// marked "class hook" below, which sit exactly where the class's rules apply.
// Formulas follow wowsims/forever: the attack table from sim/core/target.go and spell_outcome.go, racials
// from sim/core/racials.go, item effects from the wowsims spell store (js/data/db.js).
import { ARMOR_CONSTANT_63, BOSS_LEVEL, BOSS_ARMOR, BOSS_MELEE, PER_DEFENSE, PLAYER_LEVEL, RACIALS, RANGE, RATING, REFUND_ON_MISS, STAT } from '../data/warrior.js';
import { WINDFURY } from '../data/buffs.js';
import { DB } from '../data/db.js';
import { CLASS_STATS } from '../data/class-stats.js';
import { POTION_ACTIONS } from '../data/potion-classes.js';
import { THREAT_TALENTS } from '../data/threat-talents.js';
import { Encounter, SUNDER, raidOf } from './target.js';

export const GCD = 1.5;
const DUAL_WIELD_MISS = 0.19;
const RUN_SPEED = 7;            // yards a second, as the arena's run (a bot's walk)
export const EXECUTE_PHASE = 0.2;
const TRAINING_HIT = 0.06;      // a "take a hit" drill hit, as a share of your maximum health (healed back over time)
const EXECUTE_ALWAYS_PCT = 0.15; // the dummies' health shown in an always-in-execute fight
const AGGRO_PULL = 1.1;         // another player takes a target over at 110% of the holder's threat (melee range)
const AGGRO_PULL_RANGED = 1.3;  // ... and at 130% from outside melee range
const PULL_GRACE = 2;           // seconds after the pull in which whoever starts with aggro (the tank) keeps it

let nextUid = 1; // each unit's id on the targets it shares (its own bleeds)

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
  const map = { [STAT.str]: 'str', [STAT.agi]: 'agi', [STAT.ap]: 'ap', [STAT.hit]: 'hitRating', [STAT.crit]: 'critRating', [STAT.haste]: 'hasteRating', [STAT.arpen]: 'arpen',
    [STAT.int]: 'int', [STAT.spi]: 'spi', [STAT.spellDmg]: 'spellPower', [STAT.mp5]: 'mp5' };
  for (const [k, v] of Object.entries(sparse || {})) if (map[k]) out[map[k]] = (out[map[k]] || 0) + v;
  return out;
}

export class Unit {
  // The class's actions and aura names (a class module sets them): { id: { name, cost, cd, gcd, item, ... } }.
  static ABILITIES = {};
  static AURA_NAMES = {};

  // sheet: character sheet from character.js.
  // opts: { duration, targets, queueWindow, end, execute, health, moveEvery, moveFor, hitEvery, ... }
  //   end: 'time' (default: over after `duration`, the dummies' health falls evenly as in the DPS sim),
  //        'health' (each dummy has `health`; over when they are all dead) or 'never' (over when you end it);
  //   execute: 'last20' (default: below 20% health), 'always' or 'never';
  //   moveEvery / moveFor: you have to get out of melee every moveEvery s for moveFor s (0 = never);
  //   hitEvery: you take a hit every hitEvery s (0 = never);
  //   tank: the targets swing at whoever has their aggro (alone: you), as the wowsims Raid Target does;
  //   hps: your healers' healing per second while the targets hit back;
  //   group: other players share the targets (their threat comes in through setOthersThreat);
  //   firstAggro: in a group, you start with aggro (the tank, or the host without one), as the one who pulls.
  // encounter: the shared targets and raid debuffs (engine/target.js); a fight of its own when left out.
  constructor(sheet, opts, rng = Math.random, encounter = null) {
    this.c = sheet;
    this.o = opts;
    this.rng = rng;
    this.uid = nextUid++;
    this.enc = encounter || new Encounter({ targets: opts.targets, raid: raidOf(sheet) });
    this.racial = RACIALS[sheet.race] || {};
    this.cs = CLASS_STATS[sheet.classId] || CLASS_STATS.warrior; // the class's stat conversions
    this.threatTalents = THREAT_TALENTS[sheet.classId] || null; // talents that lower some schools' threat
    this.dual = !!sheet.oh;
    this.tables = { mh: attackTable(sheet.mh.skill || 0), oh: attackTable(sheet.oh ? sheet.oh.skill || 0 : 0) };

    this.t = 0;
    this.started = false;
    this.over = false;
    this.gcdEnd = 0;
    this.cds = {};
    this.catCds = {};
    this.used = {};
    this.procIcd = {};
    this.auras = {};
    this.hasExternals = false; // another player's cooldown has been on you this fight (group play)
    this.absorb = 0;           // a shield on you (Power Word: Shield) and when it runs out
    this.absorbEnd = 0;
    this.events = [];
    this.pending = null; // ability pressed inside the spell queue window
    this.casting = null; // { id, start, end, resets } while a cast (Slam) runs
    this.lastMhSwing = -Infinity; // time of the last main-hand swing (the APL's autoTimeSinceLast)
    this.mhNext = 0;
    this.ohNext = 0.1;
    this.targets = this.enc.targets; // shared with everyone in the encounter
    this.primary = 0;
    // Where the player stands, set by the 3D arena every frame. Without an arena everyone is in melee
    // range behind the targets, the way wowsims sims by default.
    // angle: from each target's front to you (behind it, π, until the arena places you), for its cone attacks.
    this.geo = { dist: this.targets.map(() => 0), inFront: this.targets.map(() => false), angle: this.targets.map(() => Math.PI), facing: true, moving: false };
    this.meter = {};
    this.total = 0;
    this.listeners = [];
    this.review = { parried: 0, outOfRange: 0, damageTaken: 0, hitsTaken: {} };
    this.maxHealth = sheet.health || 4000;
    this.health = this.maxHealth;
    this.dead = false;
    // Your threat on each target, by ability for the threat meter. Who each target attacks: 'me', 'other' (another
    // player in the group) or null (without `tank` a tank somewhere holds them).
    this.threat = this.targets.map(() => 0);
    this.threatMeter = {};
    this.threatTotal = 0;
    this.othersThreat = this.targets.map(() => 0);
    this.holder = this.targets.map(() => Unit.firstHolder(opts));
    this.bossAt = this.targets.map(() => Infinity); // each target's next swing (tank fights)
    // Everything the results view needs (like the wowsims Results tab).
    this.stats = {
      casts: [],          // { t, id }
      dmgBuckets: [],     // damage per second of fight time
      auras: {},          // id -> { name, icon, procs, uptime, since, intervals }
      damageTakenBy: {},  // source -> damage
      execStart: null,    // when the execute phase began (the timeline's shading)
    };
  }

  get A() { return this.constructor.ABILITIES; }

  on(fn) { this.listeners.push(fn); }
  emit(ev) { ev.t = this.t; for (const fn of this.listeners) fn(ev); }

  setGeometry(geo) {
    this.geo = geo;
    if (this.casting && geo.moving) this.cancelCast(); // a cast stops when you move
  }
  setPrimary(i) { if (i >= 0 && i < this.targets.length) { this.primary = i; this.targetless = false; this.emit({ type: 'target', i }); } }
  // Escape: no target, so no swings, until you pick one again (a click, Tab, an attack).
  clearTarget() { this.targetless = true; }
  get target() { return this.targets[this.primary]; }

  inMelee(i = this.primary) { return this.geo.dist[i] <= RANGE.melee; }
  canMelee(i = this.primary) { return this.inMelee(i) && this.geo.facing; }

  // ---- state queries -------------------------------------------------------------------

  aura(id) { const a = this.auras[id]; return a && a.end > this.t ? a : null; }
  cdLeft(id) {
    const ab = this.A[id];
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
    // An add (a boss's whelp) has its own small health pool, whatever the fight's.
    const add = this.targets[i];
    if (add && add.add) return Math.max(0, 1 - add.taken / add.maxHealth);
    const ex = this.o.execute || 'last20';
    if (ex === 'always') return EXECUTE_ALWAYS_PCT;
    if (this.endMode === 'never') return 1;
    if (this.endMode === 'health') {
      const t = this.targets[i] || this.target;
      return Math.max(0, 1 - (t.taken + this.dps() / this.mainTargets().length * dt) / this.o.health);
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
    const left = this.mainTargets().reduce((s, t) => s + Math.max(0, this.o.health - t.taken), 0);
    const dps = Math.max(this.dps(), 300);
    return Math.max(0, left / dps - dt);
  }
  dps() { return this.t > 0 ? this.total / this.t : 0; }
  // The fight's own targets (the dummies or the boss), without the adds that come and go.
  mainTargets() { return this.targets.filter((t) => !t.add); }

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
    const out = { str: 0, agi: 0, ap: 0, hitRating: 0, critRating: 0, hasteRating: 0, arpen: 0, critPct: 0, dmgPct: 0, int: 0, spi: 0, spellPower: 0, mp5: 0 };
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
    let ap = this.c.ap + tmp.ap + (tmp.str * this.cs.apPerStr + tmp.agi * this.cs.apPerAgi) * this.c.statMult;
    ap += Math.max(this.shoutAp(), this.c.externalShout || 0); // shouts do not stack
    const r = this.racialActive();
    if (r && r.apMult) ap *= r.apMult;
    return ap;
  }

  critPct() {
    const tmp = this.tempStats();
    let crit = this.c.critPct + this.stanceCrit();
    crit += tmp.agi * this.cs.critPerAgi * this.c.statMult + tmp.critRating / RATING.crit + tmp.critPct;
    crit = this.addCritBonus(crit);
    const r = this.racialActive();
    if (r && r.critPct) crit += r.critPct;
    return crit;
  }

  hasteMult() {
    const tmp = this.tempStats();
    let h = (1 + (this.c.hastePct + tmp.hasteRating / RATING.haste) / 100) * tmp.hasteMult * (this.c.attackSpeedMult || 1);
    h = this.applyHasteBonus(h);
    const r = this.racialActive();
    if (r && r.hasteMult) h *= r.hasteMult;
    return h;
  }

  damageMult() {
    let m = 1 + this.tempStats().dmgPct / 100;
    return this.applyDamageBonus(m);
  }

  // ---- class hooks: neutral here, set by the class module ---------------------------------

  shoutAp() { return 0; }                 // AP from your own shout (another's counts as externalShout)
  stanceCrit() { return 0; }
  addCritBonus(crit) { return crit; }      // talents and buffs, added in order
  applyHasteBonus(h) { return h; }
  applyDamageBonus(m) { return m; }
  applyArmorIgnore(armor) { return armor; }
  addHitBonus(hand, hit) { return hit; }
  offhandMult() { return 1; }              // off-hand damage on top of the 50% (Dual Wield Specialization)
  critMultiplier(yellow) { return yellow ? 1 + 1 : 2; } // abilities' crits (Impale)
  castTimeBonus() { return 0; }
  gcdBonus() { return 0; }
  cooldownBonus(id, cd) { return cd; }
  castResets() { return true; }            // a cast holds the swings and restarts them (Slam without Improved Slam)
  completeCast() {}                        // what a cast does when it lands
  damageTakenMult() { return 1; }
  onDamageTaken() {}                       // rage and procs from a hit taken
  onStruck() {}                            // a target's swing landed on you (a damage shield hits back)
  onAuraCancelled() {}                     // you took an aura off (cancelAura)
  bonusMiss() { return 0; }                // more chance for an attacker's swings at you to miss (Elune's Grace, Scorpid Sting)
  onAvoid() {}                             // a target's swing you missed, dodged, parried or blocked (Revenge)
  bonusDefense() { return 0; }             // defense skill, dodge, parry and block % from talents and auras
  bonusDodge() { return 0; }
  bonusParry() { return 0; }
  bonusBlock() { return 0; }
  threatMult() { return 1; }               // stance and talents
  threatOf(key, amount) { return amount; } // the threat of an ability's damage before threatMult (Heroic Strike's flat threat)
  onStart() {}                             // the pull: class periodic effects
  replaceSwing() { return false; }         // a queued "next melee" ability (Heroic Strike) takes the swing
  onWhiteHit() {}                          // a landed white swing (rage)
  beforeProcs() {}                         // a melee result, before item procs (Overpower window on a dodge)
  afterProcs() {}                          // a melee result, after item procs (Flurry, Deep Wounds, extra attacks)
  onSwing() {}                             // a main-hand swing or queued attack landed
  afterDeal() {}                           // damage dealt to a target (Sweeping Strikes)
  onAuraExpired() {}
  trackReview() {}                         // the class's review counters between t and newT
  sampleResource() {}
  gain() {}                                // the class's resource: refunds, energize effects
  // An item's energize effect: power type misc (0 mana, 1 rage in tenths, 3 energy). Rage by default.
  energize(misc, amount, source) { if (misc === 1) this.gain(amount / 10, source); }
  spend() {}

  // ---- casts (Slam) ----------------------------------------------------------------------------

  gcdFor(id) { return GCD - this.gcdBonus(id); }
  castTime(id) {
    const ab = this.A[id];
    return ab && ab.castTime ? ab.castTime - this.castTimeBonus(id) : 0;
  }
  cooldownFor(id) {
    const ab = this.A[id];
    return this.cooldownBonus(id, ab.cd || 0);
  }
  castLeft() { return this.casting ? Math.max(0, this.casting.end - this.t) : 0; }

  // Starts a cast. A cast that resets the swings holds them for the cast and restarts the timers after it.
  beginCast(id) {
    const c = { id, start: this.t, end: this.t + this.castTime(id), resets: this.castResets(id), mh0: this.mhNext, oh0: this.ohNext };
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
    if (this.t < c.end - 1e-9) return; // pushed back: it lands later
    this.casting = null;
    this.lastCastDone = { id: c.id, at: this.t };
    if (c.resets) {
      this.mhNext = this.t + this.c.mh.speed / this.hasteMult();
      if (this.dual) this.ohNext = this.t + this.c.oh.speed / this.hasteMult();
    }
    this.emit({ type: 'castEnd', id: c.id });
    this.completeCast(c);
  }

  // Moving stops a cast: its cost comes back and its cooldown does not start.
  cancelCast(reason = 'Interrupted') {
    const c = this.casting;
    if (!c) return;
    this.casting = null;
    this.gain(this.cost(c.id), 'refund');
    this.cds[c.id] = 0;
    if (c.resets) { this.mhNext = Math.max(this.t, c.mh0); this.ohNext = Math.max(this.t, c.oh0); } // the held swings go on
    this.emit({ type: 'castEnd', id: c.id, cancelled: true });
    this.emit({ type: 'error', reason });
  }

  // ---- damage taken (boss fights, drills) ----------------------------------------------------

  // Physical damage you take is reduced by your armor, against a level 63 attacker.
  armorTakenMult() {
    const armor = this.c.armor + this.bonusArmor();
    return 1 - Math.min(0.75, armor / (armor + ARMOR_CONSTANT_63));
  }
  // Armor and resistances from the class's own buffs (a paladin's Devotion and resistance auras).
  bonusArmor() { return 0; }
  resistance(school) { return 0; }
  // A spell's average share resisted: resistance / (5 x the attacker's level 63) x 75%, at most 75%.
  resistTakenMult(school) { return 1 - Math.min(0.75, 0.75 * this.resistance(school) / (5 * 63)); }

  // A hit on the player. Physical damage is reduced by armor, a spell's by your resistance. Returns the damage taken.
  takeDamage(amount, { school = 'physical', name = 'Boss' } = {}) {
    if (this.over || this.dead) return 0;
    const armorMult = school === 'physical' ? this.armorTakenMult() : this.resistTakenMult(school);
    return this.suffer(amount * armorMult * this.damageTakenMult(), amount, { name, school });
  }

  // Damage dmg (after mitigation; raw before it, which the rage from it counts) taken from `name`.
  suffer(dmg, raw, { name, school = 'physical', outcome = 'hit' }) {
    if (this.over || this.dead) return 0; // nothing lands on the dead
    // Immune (a mage's Ice Block, immuneUntil; Blessing of Protection against physical hits): nothing lands.
    const shielded = this.hasExternals && school === 'physical' && this.externalOn('physImmune');
    if (this.immuneUntil > this.t || shielded) { this.emit({ type: 'hurt', amount: 0, name, school, outcome: 'immune' }); return 0; }
    if (this.hasExternals) dmg *= this.externalMult('dmgTaken'); // Pain Suppression
    // A shield on you (a priest's Power Word: Shield) takes the damage first.
    if (this.absorb > 0 && this.absorbEnd > this.t) {
      const took = Math.min(this.absorb, dmg);
      this.absorb -= took;
      dmg -= took;
      if (dmg <= 0) { this.emit({ type: 'hurt', amount: 0, name, school, outcome: 'absorb' }); return 0; }
    }
    this.health -= dmg;
    this.review.damageTaken += dmg;
    this.stats.damageTakenBy[name] = (this.stats.damageTakenBy[name] || 0) + dmg;
    this.review.hitsTaken[name] = (this.review.hitsTaken[name] || 0) + 1;
    this.emit({ type: 'hurt', amount: Math.round(dmg), name, school, outcome });
    this.onDamageTaken(raw, dmg, outcome);
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.emit({ type: 'death', name });
      this.dropThreat();
      // A soulstone or a druid's Rebirth can bring you back (resWait, from main.js): the fight goes on without you for
      // that long, then ends for you.
      const wait = this.resWait ? this.resWait() : 0;
      if (wait > 0) this.schedule(this.t + wait, () => { if (this.dead) this.end(); });
      else this.end();
    } else if (dmg > 0 && this.casting) this.pushBack(this.casting);
    return dmg;
  }

  // Spell pushback: a hit while you cast delays the cast, 1 sec for the first hit and 0.2 sec less for each after; a
  // hit while you channel cuts 25% of the channel's full length off it. pushbackResist(c): the share the class's
  // talents and auras take off (wowsims/forever spell modifier 9, "pushback": they add up, to all of it at most); a
  // priest's Focused Casting (Martyrdom) takes it all.
  pushBack(c) {
    if (c.end <= this.t) return;
    const resist = this.aura('focusedCasting') ? 1 : Math.min(1, this.pushbackResist(c));
    if (resist >= 1) return;
    if (c.channel) {
      const full = (c.full ||= c.end - c.start); // the channel's whole length, kept from the first hit
      const cut = Math.min(c.end - this.t, full * 0.25 * (1 - resist));
      c.end -= cut;
      this.emit({ type: 'pushback', id: c.id, end: c.end, amount: -cut, channel: true });
      this.schedule(c.end, () => {
        if (this.casting !== c) return;
        this.casting = null;
        if (this.onChannelCancelled) this.onChannelCancelled(c);
        this.emit({ type: 'castEnd', id: c.id });
      });
      return;
    }
    c.pushes = (c.pushes || 0) + 1;
    const d = Math.max(0, 1.2 - 0.2 * c.pushes) * (1 - resist);
    if (d <= 0) return;
    c.end += d;
    this.schedule(c.end, () => this.finishCast(c));
    this.emit({ type: 'pushback', id: c.id, end: c.end, amount: d });
  }
  pushbackResist() { return 0; }

  // Back from the dead (a soulstone, a Rebirth) with this health and mana.
  revive(health, mana = 0, by = null) {
    if (!this.dead || this.over) return false;
    this.dead = false;
    this.health = Math.min(this.maxHealth, health);
    if (mana && this.maxMana) this.addMana(mana, 'Resurrection');
    if (Number.isFinite(this.mhNext)) this.mhNext = Math.max(this.mhNext, this.t + 1);
    this.emit({ type: 'revive', by });
    return true;
  }

  // ---- the targets hit back (tank fights) ---------------------------------------------------------

  // Your defense skill above 300 and avoidance against a level 63 boss, as fractions (sim/core/unit.go
  // GetTotal*ChanceAsDefender): each defense point adds 0.04% to miss, dodge, parry and block.
  defenseSkill() { return (this.c.defense || 0) + this.bonusDefense(); }
  avoidance(attacker = null) {
    const def = this.defenseSkill() * PER_DEFENSE / 100;
    const ld = BOSS_MELEE.levelDelta;
    return {
      miss: Math.max(0, 0.05 + ld + def + this.bonusMiss(attacker)),
      dodge: Math.max(0, ld + ((this.c.dodgePct || 0) + this.bonusDodge()) / 100 + def),
      parry: Math.max(0, 0.05 + ld + ((this.c.parryPct || 0) + this.bonusParry()) / 100 + def),
      block: this.c.shield ? Math.max(0, 0.05 + ld + ((this.c.blockPct || 0) + this.bonusBlock()) / 100 + def) : 0,
      crit: Math.max(0, BOSS_MELEE.critPct / 100 - def),
      crush: BOSS_MELEE.crush,
    };
  }
  blockValue() { return this.c.blockValue || 0; }

  // Seconds between target i's swings: 2 s, slower under Thunder Clap.
  bossSpeed(i) { return BOSS_MELEE.speed / (1 - this.enc.attackSlow(this.targets[i], this.t)); }

  // Target i swings at whoever has its aggro. At you: one roll over miss, dodge, parry, block, crit and crushing
  // blow (sim/core/spell_outcome.go outcomeEnemyMeleeWhite), armor before the crit and the block.
  bossSwing(i) {
    const target = this.targets[i];
    this.bossAt[i] = this.t + this.bossSpeed(i);
    if (target.dead) { this.bossAt[i] = Infinity; return; }
    if (!this.hasAggro(i) || this.dead) { this.emit({ type: 'bossSwing', target: i, me: false }); return; }
    // Out of its reach it waits for you, as your own swings do.
    if (this.geo.dist[i] > RANGE.melee) { this.bossAt[i] = this.t + 0.1; return; }
    const B = BOSS_MELEE;
    const av = this.avoidance(target);
    const r = this.rng();
    let acc = av.miss;
    let outcome = 'hit';
    if (r < acc) outcome = 'miss';
    else if (r < (acc += av.dodge)) outcome = 'dodge';
    else if (r < (acc += av.parry)) outcome = 'parry';
    else if (r < (acc += av.block)) outcome = 'block';
    else if (r < (acc += av.crit)) outcome = 'crit';
    else if (r < (acc += av.crush)) outcome = 'crush';
    this.emit({ type: 'bossSwing', target: i, me: true, outcome });
    if (outcome === 'miss' || outcome === 'dodge' || outcome === 'parry') {
      if (outcome === 'parry') this.parryHaste();
      this.review.avoided = (this.review.avoided || 0) + 1;
      this.emit({ type: 'hurt', amount: 0, name: 'Melee', school: 'physical', outcome });
      this.onAvoid(outcome, target);
      return;
    }
    const ap = Math.max(0, B.ap - this.enc.apReduction(target, this.t));
    // Curse of Weakness: a flat amount less per hit.
    const raw = Math.max(0, B.min * (1 + B.spread * this.rng() + ap * B.apCoef) - (target.weaknessEnd > this.t ? target.weakness : 0));
    const mult = outcome === 'crit' ? 2 : outcome === 'crush' ? 1.5 : 1;
    let dmg = raw * this.armorTakenMult() * this.damageTakenMult() * mult;
    if (outcome === 'block') {
      const blocked = Math.min(dmg, this.blockValue());
      dmg -= blocked;
      this.review.blocked = (this.review.blocked || 0) + blocked;
    }
    this.suffer(dmg, raw * mult, { name: 'Melee', outcome });
    if (!this.dead) this.onStruck(outcome, target);
    if (outcome === 'block') this.onAvoid(outcome, target);
  }

  // Parry haste (sim/core/attack.go applyParryHaste): your next swing comes up to 40% of its time sooner, but not
  // sooner than 20% of it.
  parryHaste() {
    const speed = this.c.mh.speed / this.hasteMult();
    const left = this.mhNext - this.t;
    if (left > speed * 0.2) this.mhNext -= Math.min(speed * 0.4, left - speed * 0.2);
  }

  // ---- threat and aggro ----------------------------------------------------------------------------

  tps() { return this.t > 0 ? this.threatTotal / this.t : 0; }

  // Threat on target i: `raw` (the ability's, see threatOf) times your threat multiplier (and Blessing of Salvation's),
  // on the meter under `key`.
  addThreat(key, name, i, raw) {
    const amount = raw * this.threatMult() * this.talentThreatMult(key) * (1 - (this.c.salvation || 0));
    if (!(amount > 0) || !this.targets[i]) return;
    this.threat[i] += amount;
    this.threatTotal += amount;
    const m = this.threatMeter[key] || (this.threatMeter[key] = { name, threat: 0 });
    m.threat += amount;
    this.updateAggro(i);
  }

  // Your talents that lower the threat of a school (data/threat-talents.js: Burning Soul, Frost Channeling, Silent
  // Resolve, Subtlety, Natural Grace, Spirit Weapons, Suppression, Instrument of Law), for what `key` is.
  talentThreatMult(key) {
    const tt = this.threatTalents;
    if (!tt || !this.tal) return 1;
    const ab = this.A && this.A[key];
    const school = (ab && ab.school) || 'physical';
    let m = 1;
    for (const [talent, t] of Object.entries(tt)) {
      const rank = this.tal[talent] || 0;
      if (rank && (!t.schools || t.schools.includes(school))) m *= 1 + t.pct * Math.min(rank, t.max) / t.max;
    }
    return m;
  }

  hasAggro(i) { return this.holder[i] === 'me'; }

  // Who has the targets at the pull: alone, you; in a group, whoever pulls (opts.firstAggro), so every player's
  // browser starts with the same holder.
  static firstHolder(opts) {
    if (!opts.tank) return null;
    if (!opts.group) return 'me';
    return opts.firstAggro ? 'me' : 'other';
  }

  // In a group: the highest threat anyone else has on target i.
  setOthersThreat(i, threat) {
    this.othersThreat[i] = threat;
    this.updateAggro(i);
  }

  // Whoever has a target keeps it until someone else has 110% of their threat in melee range (130% from further off),
  // and for the first 2 s after the pull. Taking it is announced to the others (an 'aggro' event the group passes on, see lostAggro),
  // so everyone's browser agrees on who is hit.
  updateAggro(i) {
    if (!this.o.tank || !this.o.group || this.t < PULL_GRACE) return; // alone the targets attack you
    const mine = this.threat[i];
    const other = this.othersThreat[i];
    const was = this.holder[i];
    if (was === 'me' && other > mine * AGGRO_PULL) this.holder[i] = 'other';
    else if (was !== 'me' && mine > other * (this.inMelee(i) ? AGGRO_PULL : AGGRO_PULL_RANGED)) this.holder[i] = 'me';
    if (this.holder[i] !== was) this.emit({ type: 'aggro', target: i, me: this.holder[i] === 'me' });
  }

  // Dying (or Vanish) wipes your threat: what you held turns to whoever is next on its table, and you start again
  // from nothing.
  dropThreat() {
    this.targets.forEach((t, i) => {
      this.threat[i] = 0;
      if (this.o.tank && this.o.group && this.holder[i] === 'me') this.lostAggro(i);
    });
  }

  // Another player taunted target i: it attacks them now.
  lostAggro(i) {
    if (this.holder[i] !== 'me') { this.holder[i] = 'other'; return; }
    this.holder[i] = 'other';
    this.emit({ type: 'aggro', target: i, me: false });
  }

  // Taunt: target i attacks you, and your threat rises to the highest anyone has on it.
  taunt(i) {
    const lift = Math.max(0, this.othersThreat[i] - this.threat[i]);
    this.threat[i] += lift;
    this.threatTotal += lift;
    const m = this.threatMeter.taunt || (this.threatMeter.taunt = { name: 'Taunt', threat: 0 });
    m.threat += lift;
    const was = this.holder[i];
    this.holder[i] = 'me';
    if (was !== 'me') this.emit({ type: 'aggro', target: i, me: true });
  }

  // /cancelaura: takes an aura of yours off; whether it was up.
  cancelAura(id) {
    if (!this.aura(id)) return false;
    this.dropAura(id);
    this.onAuraCancelled(id);
    return true;
  }

  heal(amount) {
    if (this.dead) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  // A shield on you: it takes damage before your health until it is used up or runs out.
  addAbsorb(amount, duration) {
    this.absorb = amount;
    this.absorbEnd = this.t + duration;
  }
  absorbLeft() { return this.absorb > 0 && this.absorbEnd > this.t ? this.absorb : 0; }

  // Group play: another player's cooldown on you, an aura with `ext` (main.js puts it up as ext:<id>; the values in
  // data/raid-cooldowns.js). hasExternals: one has been put up this fight, so the checks are skipped otherwise.
  externalMult(field) {
    let m = 1;
    for (const a of Object.values(this.auras)) if (a.ext && a.ext[field] && a.end > this.t) m *= 1 + a.ext[field];
    return m;
  }
  externalOn(field) { return Object.values(this.auras).some((a) => a.ext && a.ext[field] && a.end > this.t); }
  // A heal of your own (Drain Life, Desperate Prayer): shown on you and in the log.
  selfHeal(amount) {
    if (this.dead || !(amount > 0)) return;
    this.heal(amount);
    this.emit({ type: 'heal', amount: Math.round(amount) });
  }

  // Flat physical damage per hit: the raid's Gift of Arthas on the target plus your own gear's bonus.
  physDmgBonus() { return this.enc.raid.physDmgTaken + (this.c.physDmgBonus || 0); }
  // Your own state on a target (your bleeds), on the shared encounter.
  own(target) { return this.enc.own(target, this.uid); }

  // A target's armor after the debuffs on it (the encounter's) and your own armor penetration.
  armorMult(target) {
    const removed = this.enc.armorRemoved(target, this.t) + (this.c.arpen || 0) + this.tempStats().arpen;
    let armor = Math.max(0, BOSS_ARMOR - removed);
    armor = this.applyArmorIgnore(armor);
    const reduction = Math.min(0.75, armor / (armor + 400 + 85 * PLAYER_LEVEL));
    return 1 - reduction;
  }

  // Seconds until an ability is off its GCD, cooldown and any cast in progress.
  readyIn(id) {
    const ab = this.A[id];
    return Math.max(ab.gcd ? this.gcdLeft() : 0, this.cdLeft(id), this.casting ? this.castLeft() + 0.001 : 0);
  }

  // ---- time --------------------------------------------------------------------------------

  start() {
    if (this.started) return;
    this.started = true;
    this.onStart();
    // "Take a hit every N s": the hits (and what they give the class); your healers bring the health back meanwhile.
    if (this.o.hitEvery > 0) {
      this.every(this.o.hitEvery, () => this.takeDamage(this.maxHealth * TRAINING_HIT, { name: 'Training hit' }));
      this.every(1, () => this.heal(this.maxHealth * TRAINING_HIT / this.o.hitEvery));
    }
    // The targets hit back: their first swings at random within one swing (sim/core/target.go Enable), and your
    // healers heal you every second.
    if (this.o.tank) {
      this.bossAt = this.targets.map(() => this.t + this.rng() * BOSS_MELEE.speed);
      if (this.o.hps > 0) this.every(1, () => this.heal(this.o.hps));
    }
    this.emit({ type: 'start' });
    this.scheduleHelpSunders();
  }

  // "Help stack": other warriors in the raid spend their first global cooldowns sundering the main target until it
  // has 5 stacks. Each application lasts 30 s from the last one, so keeping it up is up to you.
  scheduleHelpSunders() {
    const sunder = this.c.sunder || {};
    if (sunder.mode !== 'help') return;
    const warriors = Math.max(1, sunder.warriors || 1);
    const target = this.targets[0];
    for (let gcd = 0; gcd < 5; gcd++) {
      this.schedule(0.3 + gcd * GCD, () => {
        for (let w = 0; w < warriors && !(target.sunderEnd > this.t && target.sunder >= SUNDER.maxStacks); w++) {
          this.enc.addSunder(target, this.t);
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

  // A bot's walk (an APL move): towards `to` yards from the target at run speed (7 yards a second, faster or slower
  // with the class's moveSpeedMult), moving while it walks. advance takes the steps.
  walkTo(to, recheck = false) { this.walk = { to, recheck }; }
  stopWalk() {
    if (!this.walk) return;
    this.walk = null;
    this.setGeometry({ ...this.geo, moving: false });
  }
  walkStep(dt) {
    const w = this.walk;
    const left = w.to - this.geo.dist[this.primary];
    const step = RUN_SPEED * (this.moveSpeedMult ? this.moveSpeedMult() : 1) * dt;
    const arrived = Math.abs(left) <= step;
    if (arrived) this.walk = null;
    const delta = arrived ? left : Math.sign(left) * step;
    this.setGeometry({ ...this.geo, dist: this.geo.dist.map((d) => Math.max(0, d + delta)), moving: !arrived });
  }

  // Runs the fight forward to time `to`, processing swings and events in order.
  advance(to) {
    if (!this.started || this.over) return;
    to = Math.min(to, this.endTime);
    if (this.walk && to > this.t) this.walkStep(to - this.t);
    for (;;) {
      let next = this.mhNext;
      let kind = 'mh';
      if (this.dual && this.ohNext < next) { next = this.ohNext; kind = 'oh'; }
      let evIdx = -1;
      for (let i = 0; i < this.events.length; i++) {
        if (this.events[i].at < next) { next = this.events[i].at; kind = 'ev'; evIdx = i; }
      }
      let bossIdx = -1;
      for (let i = 0; i < this.bossAt.length; i++) {
        if (this.bossAt[i] < next) { next = this.bossAt[i]; kind = 'boss'; bossIdx = i; }
      }
      if (this.pending && this.pending.at <= next) { next = this.pending.at; kind = 'pending'; }
      if (next > to) break;

      this.trackReview(next);
      this.t = next;
      // The dead do not swing (they may yet be brought back).
      if ((kind === 'mh' || kind === 'oh') && this.dead) this[`${kind}Next`] = this.t + 1;
      else if (kind === 'mh') this.swing('mh');
      else if (kind === 'oh') this.swing('oh');
      else if (kind === 'boss') this.bossSwing(bossIdx);
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
    this.sampleResource();
    if (this.t >= this.endTime) this.end();
  }

  // You end the fight (infinite health, or any fight early).
  stop() { if (this.started && !this.over) this.end(); }

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

  // ---- auras -------------------------------------------------------------------------------

  // Starts or refreshes an aura. extra: { stats, stacks, maxStacks, name, icon } for item auras.
  setAura(id, duration, stacks = 0, extra = null) {
    const hasteBefore = this.hasteMult();
    const prev = this.aura(id);
    const a = { end: this.t + duration, stacks, duration, ...(extra || {}) };
    if (extra && extra.maxStacks) a.stacks = Math.min(extra.maxStacks, (prev ? prev.stacks : 0) + 1);
    this.auras[id] = a;
    if (!prev && this.stats.auras[id] && this.stats.auras[id].since != null) this.closeAura(id, this.t);
    this.openAura(id, { name: (extra && extra.name) || this.constructor.AURA_NAMES[id] || id, icon: extra && extra.icon });
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
    this.onAuraExpired(id);
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
        // An explosive is thrown at the target: it hits it, and the others within 10 yards of you (a caster stands
        // further off than the blast).
        const targets = key === 'explosive' ? this.targets.filter((t) => t.i === this.primary || this.geo.dist[t.i] <= 10) : [this.target];
        for (const target of targets) {
          const dmg = sp.sc === 1 ? amount * this.armorMult(target) * this.damageMult() : amount;
          this.record('proc:' + fx.b, name, dmg, 'hit', target.i, icon);
        }
      } else if (e.t === 'E_ENERGIZE') {
        this.energize(e.m || 0, bp * (1 + (this.rng() - 0.5) * (e.v || 0)), name);
      }
    }
    if (Object.keys(stats).length && duration > 0) {
      this.setAura(key, duration, 0, { stats, name, icon, maxStacks: sp.ms || 0 });
    }
  }

  addShatter(target, duration) {
    this.enc.addShatter(target, this.t, duration);
    this.emit({ type: 'shatter', target: target.i, duration }); // for the others in a group
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

  useItem(id) {
    const use = this.c.uses[this.A[id].item];
    if (use.cd) this.cds[id] = this.t + use.cd;
    if (use.cat && use.ccd) this.catCds[use.cat] = this.t + use.ccd;
    this.used[id] = true;
    // One potion a fight, whichever of the three picks.
    if (use.oncePerFight) for (const k of POTION_ACTIONS) this.used[k] = true;
    this.applyEffect(use.fx, id, use.name, use.icon);
  }

  // ---- attacks -----------------------------------------------------------------------------

  weapon(hand) { return hand === 'mh' ? this.c.mh : this.c.oh; }
  dualWieldMiss() { return this.dual; }

  weaponDamage(hand, normalized, bonusAp = 0) {
    const w = this.weapon(hand);
    const base = w.min + this.rng() * (w.max - w.min) + (w.flat || 0);
    return base + ((this.ap() + bonusAp) / 14) * (normalized ? w.norm : w.speed);
  }

  hitPct(hand) {
    let hit = this.c.hitPct + this.tempStats().hitRating / RATING.hit;
    return this.addHitBonus(hand, hit);
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
    if (this.dualWieldMiss()) miss += DUAL_WIELD_MISS;
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
  // unavoidable: it cannot be dodged, parried or blocked (Counterattack); only the miss and the crit roll.
  rollYellow(hand, target, bonusCrit = 0, unavoidable = false) {
    const tb = this.tables[hand];
    const r = this.rng();
    let acc = Math.max(0, tb.miss - this.hitPct(hand) / 100);
    if (r < acc) return 'miss';
    if (unavoidable) {
      const crit = Math.max(0, (this.critPct() + bonusCrit) / 100 - tb.critSuppression);
      return this.rng() < crit ? 'crit' : 'hit';
    }
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
    if (amount > 0 && this.hasExternals) amount *= this.externalMult('dmgDone'); // Power Infusion from another player
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
    if (this.stats.execStart == null && this.started && this.executePhase()) this.stats.execStart = this.t;
    this.total += amount;
    this.emit({ type: 'damage', key, name, amount: Math.round(amount), outcome, target });
    if (this.landed(outcome)) this.addThreat(key, name, target, this.threatOf(key, amount));
    // The target parried you: parry haste brings its next swing at you closer.
    if (outcome === 'parry' && this.o.tank && this.hasAggro(target)) {
      const speed = this.bossSpeed(target);
      const left = this.bossAt[target] - this.t;
      if (left > speed * 0.2) this.bossAt[target] -= Math.min(speed * 0.4, left - speed * 0.2);
    }
    if (amount > 0 && (this.endMode === 'health' || (this.targets[target] && this.targets[target].add))) this.woundTarget(target, amount);
  }

  // Health-pool fights: a dummy dies at `health` damage; your target moves on to a living one, and the fight
  // is over when they are all dead.
  woundTarget(i, amount) {
    const t = this.targets[i];
    if (!t || t.dead) return;
    const max = t.add ? t.maxHealth : this.o.health;
    t.taken += amount;
    if (t.taken < max) return;
    t.taken = max;
    t.dead = true;
    this.emit({ type: 'targetDied', i });
    // Over when the fight's own targets are dead (an add dying is not the end); your target moves on.
    if (this.endMode === 'health' && !this.mainTargets().some((x) => !x.dead)) { this.end(); return; }
    const alive = this.targets.find((x) => !x.dead);
    if (!alive) return;
    if (i === this.primary) this.setPrimary(alive.i);
  }

  // Applies multipliers and records a physical hit on a target. A block is a hit that cannot crit; the
  // dummy has no block value, so it takes off no damage.
  deal(key, name, raw, outcome, target, { yellow = false, hand = 'mh' } = {}) {
    if (!this.landed(outcome)) { this.record(key, name, 0, outcome, target.i); return 0; }
    let dmg = raw + this.physDmgBonus();
    dmg *= this.damageMult() * this.armorMult(target);
    if (hand === 'oh') dmg *= 0.5 * this.offhandMult();
    if (outcome === 'glance') {
      const tb = this.tables[hand];
      dmg *= tb.glanceMin + this.rng() * (tb.glanceMax - tb.glanceMin);
    }
    if (outcome === 'crit') dmg *= this.critMultiplier(yellow);
    const r = this.racialActive();
    if (yellow && r && r.damagePct && r.abilities.includes(key)) dmg *= 1 + r.damagePct / 100;
    this.record(key, name, dmg, outcome, target.i);
    if (dmg > 0) this.afterDeal(key, dmg / this.armorMult(target), target);
    return dmg;
  }

  // Procs every melee result can trigger: the class's rules around the item and enchant procs.
  afterMelee(outcome, target, ctx = {}) {
    const { hand = 'mh', extra = false } = ctx;
    this.beforeProcs(outcome, target, ctx);
    if (this.landed(outcome)) this.rollProcs(hand, extra, target);
    // Judgement of Wisdom on the target (a raid debuff): half your melee hits restore mana.
    if (this.c.jow && this.landed(outcome) && this.rng() < 0.5) this.energize(0, this.c.jow, 'Judgement of Wisdom');
    this.afterProcs(outcome, target, ctx);
  }

  swing(hand) {
    // No target (Escape): no swings until you take one again.
    if (this.targetless) {
      if (hand === 'mh') this.mhNext = this.t + 0.1; else this.ohNext = this.t + 0.1;
      return;
    }
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

  // A main-hand attack: the timed swing or an extra attack. A queued "next melee" ability (the class's) replaces it.
  mainHandAttack({ extra = false, bonusAp = 0, source = '' }) {
    if (this.replaceSwing(extra)) {
      this.mhNext = this.t + this.c.mh.speed / this.hasteMult();
      return;
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
    if (this.landed(outcome)) this.onWhiteHit(hand, outcome);
    this.afterMelee(outcome, target, { white: true, hand, extra: extra || !!bonusAp });
    if (hand === 'mh') this.onSwing(outcome, target);
    if (hand === 'mh' && !bonusAp && !extra && this.landed(outcome)) this.maybeWindfury();
  }

  // Windfury Totem (a shaman in the raid): an extra main-hand attack with bonus AP. It does not reset the
  // main-hand swing timer in wowsims Forever (its main-hand swing count matches the off hand's haste only
  // without the reset). The totem aura (10609) procs from main-hand specials as well as white swings.
  maybeWindfury() {
    if (!this.c.windfuryAp || this.rng() >= WINDFURY.chance) return;
    this.whiteSwing('mh', this.c.windfuryAp);
  }

  // A chain from the primary target: each jump to the nearest target not yet hit within `reach` yards of the last one
  // (the world's target-to-target distances; without them, the difference of their distances from you).
  chain(count, reach) {
    const g = this.geo;
    const apart = (a, b) => (g.between ? g.between[a][b] : Math.abs(g.dist[a] - g.dist[b]));
    const hit = [this.target];
    while (hit.length < count) {
      const last = hit[hit.length - 1].i;
      const next = this.targets.filter((t) => !t.dead && !hit.includes(t) && apart(last, t.i) <= reach)
        .sort((a, b) => apart(last, a.i) - apart(last, b.i))[0];
      if (!next) break;
      hit.push(next);
    }
    return hit;
  }

  // Targets other than the primary that a cleaving attack reaches, nearest first.
  others(range) {
    return this.targets.filter((t) => t.i !== this.primary && !t.dead && this.geo.dist[t.i] <= range)
      .sort((a, b) => this.geo.dist[a.i] - this.geo.dist[b.i]);
  }

  // A yellow main-hand strike on the primary target. Returns the outcome.
  strike(id, name, raw, { bonusCrit = 0, refund = 0 } = {}) {
    const target = this.target;
    const outcome = this.rollYellow('mh', target, bonusCrit);
    this.deal(id, name, this.landed(outcome) ? raw() : 0, outcome, target, { yellow: true });
    this.afterMelee(outcome, target);
    if (!this.landed(outcome) && refund) this.gain(refund * REFUND_ON_MISS, 'refund');
    if (this.landed(outcome)) this.maybeWindfury();
    return outcome;
  }
}
