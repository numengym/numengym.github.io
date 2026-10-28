// The warrior on top of the core unit (engine/unit.js): rage, stances, the warrior's abilities and talents.
// Formulas follow wowsims/forever: rage from sim/core/rage.go, abilities and talents from sim/warrior/*.go.
import {
  ABILITIES, AURAS, DAMAGE_TAKEN, DAMAGE_TAKEN_RAGE, MELEE_ABILITIES, RAGE, RANGE, REFUND_ON_MISS, STANCES, TALENT, parseTalents,
} from '../../data/warrior.js';
import { EXECUTE_PHASE, Unit } from '../../engine/unit.js';

const WEAPON = { axe: 1, mace: 4, polearm: 6, staff: 8, sword: 9 }; // wowsims WeaponType
// Usable before the pull without starting the fight (the wowsims APLs' pre-pull: Berserker Rage at -4.5 s,
// Bloodrage and Battle Shout at -3 s).
const PREPULL = new Set(['bloodrage', 'berserkerRage', 'battleShout']);
// Hits that do not use a Sweeping Strikes charge (wowsims talents_arms.go: Whirlwind, Thunder Clap and the copies).
const NO_SWEEP = new Set(['whirlwind', 'whirlwindOh', 'sweepingStrikes', 'deepWounds', 'rend', 'touchOfTheGrave']);

export class WarriorFight extends Unit {
  static ABILITIES = ABILITIES;
  static AURA_NAMES = Object.fromEntries(Object.entries(AURAS).map(([id, a]) => [id, a.name]));

  // opts (on top of the core's): { startRage, startStance, precastShout }
  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    this.tal = parseTalents(sheet.talents);
    this.maxRage = RAGE.max * (this.racial.maxRageMult || 1);
    this.rage = Math.min(this.maxRage, opts.startRage);
    this.stance = opts.startStance || 'berserker'; // Arms starts in Battle Stance
    this.queued = null; // Heroic Strike / Cleave waiting for the next main-hand swing
    Object.assign(this.review, { rageWasted: 0, btIdle: 0, wwIdle: 0, hsQueued: 0, overpowerMissed: 0, stanceRageLost: 0, rageFromDamage: 0 });
    Object.assign(this.stats, { rage: [], rageGain: {}, rageWaste: {}, rageSpent: {} }); // rage: [t, rage] samples
    if (opts.precastShout) this.setAura('battleShout', ABILITIES.battleShout.duration - 3);
  }

  // ---- stats (core hooks) --------------------------------------------------------------------

  shoutAp() { return this.aura('battleShout') ? ABILITIES.battleShout.ap + (this.c.bsT2 ? ABILITIES.battleShout.t2Bonus : 0) : 0; }
  stanceCrit() { return STANCES[this.stance].crit; }
  addCritBonus(crit) {
    crit += this.tal.cruelty * TALENT.cruelty.critPerRank;
    // Weaponmaster: crit with an axe or polearm.
    if (this.tal.weaponmaster && [WEAPON.axe, WEAPON.polearm].includes(this.c.mh.type)) crit += this.tal.weaponmaster * TALENT.weaponmaster.critPerRank;
    if (this.aura('recklessness')) crit += ABILITIES.recklessness.crit;
    return crit;
  }
  applyHasteBonus(h) {
    if (this.aura('flurry')) h *= 1 + this.tal.flurry * TALENT.flurry.hastePerRank;
    return h;
  }
  applyDamageBonus(m) {
    if (this.aura('deathWish')) m *= 1 + ABILITIES.deathWish.damage;
    if (this.aura('enrage')) m *= 1 + this.tal.enrage * TALENT.enrage.dmgPerRank;
    if (this.c.mh.twoHand) m *= 1 + this.tal.twohandedWeaponSpecialization * TALENT.twohandedWeaponSpecialization.dmgPerRank;
    return m;
  }
  // Weaponmaster with a mace or staff ignores part of the armor.
  applyArmorIgnore(armor) {
    if (this.tal.weaponmaster && [WEAPON.mace, WEAPON.staff].includes(this.c.mh.type)) armor *= 1 - this.tal.weaponmaster * TALENT.weaponmaster.armorIgnorePerRank;
    return armor;
  }
  addHitBonus(hand, hit) {
    if (hand === 'oh') hit += this.tal.furiousPrecision * TALENT.furiousPrecision.ohHitPerRank;
    return hit;
  }
  offhandMult() { return 1 + this.tal.dualWieldSpecialization * TALENT.dualWieldSpecialization.ohDmgPerRank; }
  critMultiplier(yellow) { return yellow ? 1 + (1 + this.tal.impale * TALENT.impale.critBonusPerRank) : 2; }

  // ---- casts (Slam) --------------------------------------------------------------------------

  gcdBonus(id) { return id === 'slam' ? this.tal.improvedSlam * TALENT.improvedSlam.gcdPerRank : 0; }
  castTimeBonus(id) { return id === 'slam' ? this.tal.improvedSlam * TALENT.improvedSlam.castPerRank : 0; }
  cooldownBonus(id, cd) {
    if (id === 'intercept') cd -= this.tal.improvedIntercept * TALENT.improvedIntercept.cdPerRank;
    if (id === 'slam') cd -= this.tal.improvedSlam * TALENT.improvedSlam.cdPerRank;
    return cd;
  }
  // Slam holds your swings and restarts them; Improved Slam's Slam (1310200) does not touch the swing timer.
  castResets(id) { return !(id === 'slam' && this.tal.improvedSlam); }
  completeCast(c) {
    const ab = ABILITIES[c.id];
    this.strike(c.id, ab.name, () => this.weaponDamage('mh', false) + ab.bonus, { refund: this.cost(c.id) });
  }

  // ---- damage taken ----------------------------------------------------------------------------

  damageTakenMult() {
    let m = 1;
    if (this.stance === 'berserker') m *= 1 + DAMAGE_TAKEN.berserker;
    if (this.aura('deathWish')) m *= 1 + DAMAGE_TAKEN.deathWish;
    if (this.aura('recklessness')) m *= 1 + DAMAGE_TAKEN.recklessness;
    return m;
  }

  // A hit taken gives rage and can proc Enrage and Blood Craze.
  onDamageTaken(amount, dmg) {
    const rage = DAMAGE_TAKEN_RAGE * amount;
    this.review.rageFromDamage += rage;
    this.addRage(rage, 'damage taken');
    if (this.tal.enrage && this.rng() < TALENT.enrage.chance) this.setAura('enrage', TALENT.enrage.duration);
    if (this.tal.bloodCraze && dmg > this.maxHealth * TALENT.bloodCraze.threshold) {
      const total = this.maxHealth * TALENT.bloodCraze.healPerRank * this.tal.bloodCraze;
      this.setAura('bloodCraze', TALENT.bloodCraze.duration);
      for (let i = 1; i <= 3; i++) this.schedule(this.t + i * 2, () => this.heal(total / 3));
    }
  }

  // ---- rage ------------------------------------------------------------------------------------

  gain(amount, source) { this.addRage(amount, source); }
  spend(amount, by) { this.spendRage(amount, by); }

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

  sampleResource() {
    const r = this.stats.rage;
    if (!r.length || this.t - r[r.length - 1][0] >= 0.25) r.push([this.t, this.rage]);
  }

  // Rage from white hits (sim/core/rage.go), and Unbridled Wrath.
  onWhiteHit(hand, outcome) {
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

  // ---- the pull, the review --------------------------------------------------------------------

  onStart() {
    if (this.tal.angerManagement) this.every(TALENT.angerManagement.every, () => this.addRage(TALENT.angerManagement.rage, 'Anger Management'));
  }

  onAuraExpired(id) {
    if (id === 'overpowerWindow') this.review.overpowerMissed++;
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

  // ---- melee procs -----------------------------------------------------------------------------

  beforeProcs(outcome) {
    if (outcome === 'dodge') this.setAura('overpowerWindow', ABILITIES.overpower.window);
  }

  afterProcs(outcome, target, { white = false, whirlwindOh = false, hand = 'mh', extra = false } = {}) {
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

  // Bloodthrill: main-hand swings (white or Heroic Strike / Cleave) open the Overpower window while your Rend bleeds.
  onSwing(outcome, target) {
    const own = this.own(target);
    if (!this.tal.bloodthrill || !this.landed(outcome) || !(own.rend && own.rendEnd > this.t)) return;
    if (this.rng() < this.tal.bloodthrill * TALENT.bloodthrill.chancePerRank) this.setAura('overpowerWindow', ABILITIES.overpower.window);
  }

  // Sweeping Strikes: a melee hit also hits another nearby enemy for the same damage before armor, using a
  // charge; an Execute in the execute phase is copied as a normalized main-hand hit instead (talents_arms.go).
  afterDeal(key, preArmor, from) {
    const a = this.aura('sweepingStrikes');
    if (!a || NO_SWEEP.has(key) || key.startsWith('proc')) return;
    const other = this.targets.find((t) => t.i !== from.i && !t.dead && this.geo.dist[t.i] <= RANGE.whirlwind);
    if (!other) return;
    a.stacks--;
    if (a.stacks <= 0) this.dropAura('sweepingStrikes');
    const raw = key === 'execute' && this.executePhase() ? this.weaponDamage('mh', true) * this.damageMult() : preArmor;
    this.record('sweepingStrikes', 'Sweeping Strikes', raw * this.armorMult(other), 'hit', other.i);
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
    const own = this.own(target); // your bleed; another warrior's Deep Wounds on the target is theirs
    const dw = own.dw;
    if (dw && dw.ticksLeft > 0) {
      dw.perTick = (dw.perTick * dw.ticksLeft + added) / ticks;
      dw.ticksLeft = ticks;
      return;
    }
    const bleed = { perTick: added / ticks, ticksLeft: ticks };
    own.dw = bleed;
    const tickOnce = () => {
      if (own.dw !== bleed || bleed.ticksLeft <= 0) return;
      bleed.ticksLeft--;
      this.record('deepWounds', 'Deep Wounds', bleed.perTick, 'hit', target.i);
      if (bleed.ticksLeft > 0) this.schedule(this.t + tick, tickOnce);
    };
    this.schedule(this.t + tick, tickOnce);
  }

  // Rend as wowsims Forever has it (rend.go, checked against its combat log): each tick is 21 + 2% of your attack
  // power at that tick, with Improved Rend and your damage bonuses, plus flat physical damage taken (Gift of Arthas).
  // Ticks can crit like abilities (x2.2 with Impale); a crit tick does not trigger Deep Wounds (its log shows none).
  applyRend(target) {
    const ab = ABILITIES.rend;
    const bonus = 1 + (TALENT.improvedRend.bonus[this.tal.improvedRend] || 0);
    const id = Symbol('rend');
    const own = this.own(target); // your Rend; each warrior's Rend on a target is their own
    own.rend = id;
    own.rendEnd = this.t + ab.duration;
    for (let i = 1; i <= ab.duration / ab.tick; i++) {
      this.schedule(this.t + i * ab.tick, () => {
        if (own.rend !== id) return;
        let dmg = (ab.tickBase + ab.tickApCoef * this.ap()) * bonus * this.damageMult() + this.physDmgBonus();
        const crit = this.rng() < Math.max(0, this.critPct() / 100 - this.tables.mh.critSuppression);
        if (crit) dmg *= this.critMultiplier(true);
        this.record('rend', 'Rend', dmg, crit ? 'crit' : 'hit', target.i);
      });
    }
  }

  // ---- abilities: rules ------------------------------------------------------------------------

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

  // ---- input -----------------------------------------------------------------------------------

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

  // A queued Heroic Strike / Cleave takes the main-hand swing when there is rage for it.
  replaceSwing(extra) {
    if (!this.queued) return false;
    const id = this.queued;
    this.queued = null;
    const cost = this.cost(id);
    this.emit({ type: 'queue', id: null });
    if (this.rage < cost) return false;
    this.review.hsQueued++;
    this.queuedAttack(id, cost, extra);
    return true;
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

  // ---- abilities: what they do -------------------------------------------------------------------

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
    if (ab.castTime) { this.beginCast(id); return; } // Slam lands when its cast ends (completeCast)

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
          this.enc.addSunder(target, this.t); // on the shared target: everyone's armor goes down
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
}
