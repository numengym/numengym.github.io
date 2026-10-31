// The rogue on top of the core unit (engine/unit.js): energy, combo points, stealth, poisons, the rogue's abilities
// and talents. Formulas follow wowsims/forever sim/rogue/*.go and sim/core/energy.go.
import {
  ABILITIES, AGGRESSION, AURAS, BUILDERS, COLD_BLOODED, DEADLY_TICKS, ENERGY, EUREKA_ABILITIES, FINISHERS, INSTANT_BASE, LETHALITY,
  MAX_COMBO_POINTS, OPPORTUNITY, POISON_ITEMS, POISONS, QUIETUS, REFUND_ON_MISS, ROGUE_GCD, TALENT, THREAT_MULT, parseTalents,
} from '../../data/rogue.js';
import { RANGE } from '../../data/warrior.js';
import { Unit } from '../../engine/unit.js';

const WEAPON = { axe: 1, dagger: 2, fist: 3, mace: 4, sword: 9 }; // wowsims WeaponType
// Usable before the pull without starting the fight (the wowsims APL's pre-pull: Blade Flurry and Premeditation at
// -2 s, Stealth at -1 s).
const PREPULL = new Set(['stealth', 'premeditation', 'bladeFlurry', 'coldBlood']);
const SPELL_MISS = 0.17; // poisons against a level 63 boss (sim/core/target.go spellMissChance)
const SPELL_CRIT_MULT = 1.5;

export class RogueFight extends Unit {
  static ABILITIES = ABILITIES;
  static AURA_NAMES = Object.fromEntries(Object.entries(AURAS).map(([id, a]) => [id, a.name]));

  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    this.tal = parseTalents(sheet.talents);
    // Gnome Eureka! reaches the rogue's own abilities.
    const r = this.racial.active;
    if (r && r.abilities) this.racial = { ...this.racial, active: { ...r, spellId: 1259812, abilities: EUREKA_ABILITIES } };
    this.maxEnergy = ENERGY.max + (TALENT.vigor.energy[this.tal.vigor] || 0);
    this.energyNow = this.maxEnergy; // energy at energyAt: it regenerates continuously (energy.go ticks every 100 ms)
    this.energyAt = 0;
    this.cp = 0;
    this.queued = null;
    this.icd = {};
    // Which poison each hand carries, and their ranks.
    const p = sheet.poisons || {};
    this.poison = { mh: POISON_ITEMS[p.mh] || null, oh: POISON_ITEMS[p.oh] || null };
    const deadlyItem = [p.mh, p.oh].find((id) => POISON_ITEMS[id] === 'deadly');
    const instantItem = [p.mh, p.oh].find((id) => POISON_ITEMS[id] === 'instant');
    this.deadlyTick = DEADLY_TICKS[deadlyItem] || POISONS.deadly.tick;
    this.instantBase = INSTANT_BASE[instantItem] || POISONS.instant.base;
    Object.assign(this.review, { energyWasted: 0, cpWasted: 0, sndDown: 0 });
    Object.assign(this.stats, { rage: [], rageGain: {}, rageWaste: {}, rageSpent: {} }); // the resource (energy) for the results
  }

  // The results and HUD read the class's resource through these.
  get resourceName() { return 'Energy'; }
  get power() { return this.energy; }
  get maxPower() { return this.maxEnergy; }
  get rage() { return this.energy; }   // the generic views (APL helper, results) read "rage" as the resource
  set rage(v) { this.energy = v; }
  get maxRage() { return this.maxEnergy; }

  // ---- energy -----------------------------------------------------------------------------------

  regenRate() { return ENERGY.regen * (this.aura('adrenalineRush') ? 2 : 1); }

  // Brings the energy up to now; energy past the cap is lost (counted from the pull).
  syncEnergy() {
    const dt = this.t - this.energyAt;
    if (dt <= 0) return;
    const gained = this.regenRate() * dt;
    const room = this.maxEnergy - this.energyNow;
    if (gained > room) {
      if (this.started) {
        this.review.energyWasted += gained - room;
        this.stats.rageWaste.Regeneration = (this.stats.rageWaste.Regeneration || 0) + gained - room;
      }
      this.energyNow = this.maxEnergy;
    } else this.energyNow += gained;
    if (this.started) this.stats.rageGain.Regeneration = (this.stats.rageGain.Regeneration || 0) + gained;
    this.energyAt = this.t;
  }

  get energy() { this.syncEnergy(); return this.energyNow; }
  set energy(v) { this.syncEnergy(); this.energyNow = Math.max(0, Math.min(this.maxEnergy, v)); }

  // Seconds until the energy reaches `need` at the current regeneration.
  energyIn(need) { return Math.max(0, (need - this.energy) / this.regenRate()); }

  gain(amount, source) { this.addEnergy(amount, source); }
  spend(amount, by) { this.spendEnergy(amount, by); }
  energize(misc, amount, source) { if (misc === 3) this.addEnergy(amount, source); }

  addEnergy(amount, source) {
    const before = this.energy;
    this.energy = before + amount;
    const wasted = amount - (this.energyNow - before);
    const s = this.stats;
    s.rageGain[source] = (s.rageGain[source] || 0) + amount;
    if (wasted > 1e-9) {
      s.rageWaste[source] = (s.rageWaste[source] || 0) + wasted;
      if (this.started) this.review.energyWasted += wasted;
    }
    this.emit({ type: 'rage', resource: 'energy', amount, source, total: this.energyNow });
  }

  spendEnergy(amount, by = 'other') {
    if (amount <= 0) return;
    this.energy -= amount;
    this.stats.rageSpent[by] = (this.stats.rageSpent[by] || 0) + amount;
  }

  sampleResource() {
    const r = this.stats.rage;
    if (!r.length || this.t - r[r.length - 1][0] >= 0.25) r.push([this.t, this.energy]);
  }

  // Adrenaline Rush changes the regeneration: the energy up to its start or end is counted at the old rate.
  setAura(id, ...args) { if (id === 'adrenalineRush') this.syncEnergy(); super.setAura(id, ...args); }
  expire(id, end) { if (id === 'adrenalineRush') this.syncEnergy(); super.expire(id, end); }

  // ---- combo points -------------------------------------------------------------------------------

  addCombo(n, source) {
    const room = MAX_COMBO_POINTS - this.cp;
    if (n > room && this.started) this.review.cpWasted += n - room;
    this.cp = Math.min(MAX_COMBO_POINTS, this.cp + n);
    this.emit({ type: 'combo', amount: n, source, total: this.cp });
  }

  // A finisher spent its points: Relentless Strikes and Ruthlessness (rogue.go ApplyFinisher).
  applyFinisher(points) {
    this.cp = 0;
    if (this.tal.relentlessStrikes && this.rng() < TALENT.relentlessStrikes.chancePerPoint * points) {
      this.addEnergy(TALENT.relentlessStrikes.energy, 'Relentless Strikes');
    }
    if (this.tal.ruthlessness && this.rng() < TALENT.ruthlessness.chance[this.tal.ruthlessness]) this.addCombo(1, 'Ruthlessness');
    this.emit({ type: 'combo', amount: -points, source: 'finisher', total: this.cp });
  }

  // ---- stats (core hooks) --------------------------------------------------------------------------

  gcdFor() { return ROGUE_GCD; }
  addCritBonus(crit) { return crit + (TALENT.malice.crit[this.tal.malice] || 0); }
  addHitBonus(hand, hit) { return hit + (TALENT.precision.hit[this.tal.precision] || 0); }
  dodgeChance(hand) {
    return Math.max(0, super.dodgeChance(hand) - (TALENT.weaponExpertise.expertise[this.tal.weaponExpertise] || 0) / 100);
  }
  applyHasteBonus(h) {
    if (this.aura('sliceAndDice')) h *= 1 + ABILITIES.sliceAndDice.haste;
    if (this.aura('bladeFlurry')) h *= 1 + ABILITIES.bladeFlurry.haste;
    return h;
  }
  offhandMult() { return 1 + (TALENT.dualWieldSpecialization.ohDamage[this.tal.dualWieldSpecialization] || 0); }
  // Serrated Blades, and Hack and Slash with a mace, ignore part of the armor.
  applyArmorIgnore(armor) {
    let ignore = TALENT.serratedBlades.armorIgnore[this.tal.serratedBlades] || 0;
    if (this.tal.hackAndSlash && (this.c.mh.type === WEAPON.mace || (this.c.oh && this.c.oh.type === WEAPON.mace))) {
      ignore += TALENT.hackAndSlash.armorIgnore[this.tal.hackAndSlash];
    }
    return armor * (1 - Math.min(1, ignore));
  }
  threatMult() { return THREAT_MULT; }
  bonusDodge() { return this.aura('evasion') ? ABILITIES.evasion.dodge : 0; }

  // Hack and Slash with a fist weapon or dagger: crit with that hand.
  handCrit(hand) {
    const w = this.weapon(hand);
    return this.tal.hackAndSlash && w && (w.type === WEAPON.fist || w.type === WEAPON.dagger) ? TALENT.hackAndSlash.crit[this.tal.hackAndSlash] : 0;
  }
  rollWhite(hand, target) {
    const bonus = this.handCrit(hand);
    if (!bonus) return super.rollWhite(hand, target);
    const keep = this.c.critPct;
    this.c.critPct = keep + bonus;
    try { return super.rollWhite(hand, target); } finally { this.c.critPct = keep; }
  }

  // ---- damage --------------------------------------------------------------------------------------

  isDagger(hand) { const w = this.weapon(hand); return !!w && w.type === WEAPON.dagger; }

  // An ability's own damage multiplier from talents and buffs.
  abilityMult(id) {
    let m = 1;
    const t = this.tal;
    if (AGGRESSION.has(id)) m *= 1 + (TALENT.aggression.damage[t.aggression] || 0);
    if (OPPORTUNITY.has(id)) m *= 1 + (TALENT.opportunity.damage[t.opportunity] || 0);
    if (id === 'eviscerate') m *= 1 + (TALENT.improvedEviscerate.damage[t.improvedEviscerate] || 0);
    if (QUIETUS.has(id) && t.quietus && this.healthPct() <= TALENT.quietus.below) m *= 1 + TALENT.quietus.damage[t.quietus];
    const r = this.racialActive();
    if (r && r.damagePct && r.abilities.includes(id)) m *= 1 + r.damagePct / 100;
    return m;
  }

  critMultiplier(yellow, id) {
    if (!yellow) return 2;
    return 1 + (1 + (LETHALITY.has(id) ? TALENT.lethality.critDamage[this.tal.lethality] || 0 : 0));
  }

  // A yellow strike with its own crit bonus and crit multiplier: one roll for miss, dodge, parry and block, then crit.
  rogueStrike(id, name, raw, { hand = 'mh', bonusCrit = 0, cast = id } = {}) {
    const target = this.target;
    if (this.aura('coldBlood') && COLD_BLOODED.has(id)) { bonusCrit += 100; this.dropAura('coldBlood'); }
    const outcome = this.rollYellow(hand, target, bonusCrit + this.handCrit(hand));
    let dmg = 0;
    if (this.landed(outcome)) {
      dmg = raw() * this.abilityMult(id);
      dmg += this.physDmgBonus();
      dmg *= this.damageMult() * this.armorMult(target);
      if (hand === 'oh') dmg *= 0.5 * this.offhandMult();
      if (outcome === 'crit') dmg *= this.critMultiplier(true, id);
    }
    this.record(id, name, dmg, outcome, target.i);
    if (dmg > 0) this.afterDeal(id, dmg, target);
    this.afterMelee(outcome, target, { hand, yellow: true, id: cast });
    if (this.landed(outcome) && hand === 'mh') this.maybeWindfury();
    return outcome;
  }

  // Bleeds ignore armor; their ticks can crit, as a warrior's Rend does.
  bleed(own, key, name, ticks, period, tickDmg, target, { crit = true } = {}) {
    const id = Symbol(key);
    own[key] = id;
    own[key + 'End'] = this.t + ticks * period;
    for (let i = 1; i <= ticks; i++) {
      this.schedule(this.t + i * period, () => {
        if (own[key] !== id) return;
        let dmg = tickDmg() * this.damageMult();
        const isCrit = crit && this.rng() < Math.max(0, this.critPct() / 100 - this.tables.mh.critSuppression);
        if (isCrit) dmg *= this.critMultiplier(true, key);
        this.record(key, name, dmg, isCrit ? 'crit' : 'hit', target.i);
        if (key === 'rupture') this.onRuptureTick();
      });
    }
  }

  // Thousand Cuts: a Rupture tick adds a stack (one per 1.9 s); Backstab and Hemorrhage cost 3 less per stack.
  onRuptureTick() {
    if (!this.tal.thousandCuts || (this.icd.thousandCuts || 0) > this.t) return;
    this.icd.thousandCuts = this.t + TALENT.thousandCuts.icd;
    const a = this.aura('thousandCuts');
    this.setAura('thousandCuts', TALENT.thousandCuts.duration, Math.min(TALENT.thousandCuts.maxStacks, (a ? a.stacks : 0) + 1));
  }

  // ---- melee procs: poisons, Seal Fate, Hack and Slash, Blade Flurry ---------------------------------

  afterProcs(outcome, target, { hand = 'mh', extra = false, yellow = false, id = null } = {}) {
    if (!this.landed(outcome)) return;
    // The poison on the hand that hit (poisons.go registerPoisonProc).
    this.rollPoison(hand, target);
    // Seal Fate: a builder's crit adds a combo point (500 ms cooldown).
    if (outcome === 'crit' && yellow && BUILDERS.has(id) && this.tal.sealFate && (this.icd.sealFate || 0) <= this.t &&
      this.rng() < TALENT.sealFate.chance[this.tal.sealFate]) {
      this.icd.sealFate = this.t + TALENT.sealFate.icd;
      this.addCombo(1, 'Seal Fate');
    }
    // Hack and Slash with an axe or sword: an extra main-hand attack (200 ms cooldown).
    const w = this.weapon(hand);
    if (this.tal.hackAndSlash && !extra && w && (w.type === WEAPON.sword || w.type === WEAPON.axe) && (this.icd.hackAndSlash || 0) <= this.t &&
      this.rng() < TALENT.hackAndSlash.extraChance[this.tal.hackAndSlash]) {
      this.icd.hackAndSlash = this.t + TALENT.hackAndSlash.icd;
      this.schedule(this.t, () => this.whiteSwing('mh', 0, true, 'Hack and Slash'));
    }
  }

  // Blade Flurry: a melee hit also hits the next enemy for the same damage.
  afterDeal(key, dmg, from) {
    if (!this.aura('bladeFlurry') || key === 'bladeFlurryHit' || key.startsWith('proc')) return;
    const other = this.targets.find((t) => t.i !== from.i && !t.dead && this.geo.dist[t.i] <= RANGE.whirlwind);
    if (other) this.record('bladeFlurryHit', 'Blade Flurry', dmg, 'hit', other.i);
  }

  // The poison on a hand, off a landed melee hit with it (poisons.go registerPoisonProc).
  rollPoison(hand, target) {
    const kind = this.poison[hand];
    if (!kind) return;
    let chance = POISONS[kind].chance + (TALENT.improvedPoisons.chance[this.tal.improvedPoisons] || 0);
    if (this.aura('venom')) chance += ABILITIES.venom.chance;
    if (this.rng() < chance) this.applyPoison(kind, target);
  }

  // Poisons crit at spell crit; Malice is A_MOD_CRIT_PCT, so it counts too.
  poisonCrit() { return ((this.c.spellCritPct || 0) + (TALENT.malice.crit[this.tal.malice] || 0)) / 100; }

  poisonMult(periodic) {
    let m = 1 + (TALENT.vilePoisons.damage[this.tal.vilePoisons] || 0);
    if (this.aura('venom')) m *= 1 + ABILITIES.venom.damage;
    return m * this.damageMult();
  }
  spellHits() { return this.rng() >= Math.max(0, SPELL_MISS - (TALENT.precision.hit[this.tal.precision] || 0) / 100 - (this.c.spellHitPct || 0) / 100); }

  applyPoison(kind, target) {
    if (kind === 'instant') {
      const p = POISONS.instant;
      if (!this.spellHits()) { this.record('instantPoison', p.name, 0, 'miss', target.i); return; }
      let dmg = this.instantBase * (1 + (this.rng() - 0.5) * p.variance) + p.apCoef * this.ap();
      const crit = this.rng() < this.poisonCrit();
      dmg *= this.poisonMult(false) * this.spellVulnMult(target) * (crit ? SPELL_CRIT_MULT : 1);
      this.record('instantPoison', p.name, dmg, crit ? 'crit' : 'hit', target.i);
      return;
    }
    // Deadly Poison: a stack more, and the timer starts again; the ticks keep their rhythm.
    const p = POISONS.deadly;
    if (!this.spellHits()) { this.record('deadlyPoison', p.name, 0, 'miss', target.i); return; }
    const own = this.own(target);
    const dp = own.dp;
    if (dp && dp.end > this.t) {
      dp.stacks = Math.min(p.maxStacks, dp.stacks + 1);
      dp.end = this.t + p.duration;
      // The ticks keep their rhythm; a chain that had run out before the refresh goes on from its last tick.
      if (!dp.ticking) { dp.ticking = true; this.schedule(dp.last + p.period, dp.tick); }
      return;
    }
    const d = { stacks: 1, end: this.t + p.duration, last: this.t, ticking: true };
    own.dp = d;
    d.tick = () => {
      if (own.dp !== d || this.t > d.end + 1e-9) { d.ticking = false; return; }
      d.last = this.t;
      // Its ticks crit at your spell crit (wowsims shows crit ticks), for 50% more.
      const crit = this.rng() < this.poisonCrit();
      const dmg = (this.deadlyTick + this.ap() * p.apCoef / (p.duration / p.period)) * d.stacks * this.poisonMult(true) * this.spellVulnMult(target) * (crit ? SPELL_CRIT_MULT : 1);
      this.record('deadlyPoison', p.name, dmg, crit ? 'crit' : 'hit', target.i);
      if (this.t + p.period <= d.end + 1e-9) this.schedule(this.t + p.period, d.tick); else d.ticking = false;
    };
    this.schedule(this.t + p.period, d.tick);
  }
  poisoned(target) { const dp = this.own(target).dp; return !!dp && dp.end > this.t; }

  // ---- swings: none in stealth ------------------------------------------------------------------------

  swing(hand) {
    if (this.aura('stealth')) {
      if (hand === 'mh') this.mhNext = this.t + 0.1; else this.ohNext = this.t + 0.1;
      return;
    }
    super.swing(hand);
  }

  breakStealth() {
    if (!this.aura('stealth')) return;
    this.dropAura('stealth');
    this.mhNext = Math.max(this.mhNext, this.t);
    if (this.dual) this.ohNext = Math.max(this.ohNext, this.t + 0.1);
  }

  // ---- abilities: rules --------------------------------------------------------------------------------

  cost(id) {
    const ab = ABILITIES[id];
    if (!ab) return 0;
    let cost = ab.cost;
    const t = this.tal;
    if (id === 'sinisterStrike') cost -= TALENT.improvedSinisterStrike.cost[t.improvedSinisterStrike] || 0;
    if (id === 'eviscerate' && t.flawlessExecution) cost -= TALENT.flawlessExecution.eviscerateCost;
    if (id === 'garrote') cost -= TALENT.dirtyDeeds.cost[t.dirtyDeeds] || 0;
    if (id === 'exposeArmor') cost -= TALENT.improvedExposeArmor.cost[t.improvedExposeArmor] || 0;
    if (id === 'backstab' || id === 'hemorrhage') { const tc = this.aura('thousandCuts'); if (tc) cost -= TALENT.thousandCuts.cost * tc.stacks; }
    const r = this.racialActive();
    if (r && r.costPct && r.abilities.includes(id)) cost *= 1 + r.costPct / 100;
    return Math.max(0, cost);
  }

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
    if (ab.outOfCombat && this.started) return "Can't do that while in combat";
    if (id === 'stealth' && this.aura('stealth')) return 'You are already stealthed';
    if (ab.stealth && !this.aura('stealth') && !(id === 'ambush' && this.aura('cutthroat'))) return 'You must be stealthed';
    if (ab.dagger && !this.isDagger('mh')) return 'Requires a dagger in the main hand';
    if (ab.daggers && !(this.isDagger('mh') && this.isDagger('oh'))) return 'Requires a dagger in each hand';
    if (ab.melee) {
      if (!this.inMelee()) return 'Out of range';
      if (!this.geo.facing) return 'You are facing the wrong way!';
    }
    if (ab.behind && this.geo.inFront[this.primary] && !(id === 'garrote' && this.tal.dirtyDeeds)) return 'You must be behind your target';
    if (ab.finisher && this.cp <= 0) return 'That ability requires combo points';
    if (this.casting) return 'Ability is not ready yet';
    if (this.cdLeft(id) > 0) return 'Ability is not ready yet';
    if (ab.gcd && this.gcdLeft() > 0) return 'Ability is not ready yet';
    if (this.energy < this.cost(id)) return 'Not enough energy';
    return null;
  }

  wouldFail(id) {
    let reason = this.blocker(id);
    if (reason === 'Ability is not ready yet' && this.readyIn(id) <= this.o.queueWindow) reason = null;
    return reason;
  }

  // ---- input -----------------------------------------------------------------------------------------------

  press(id) {
    const ab = ABILITIES[id];
    if (!ab) return { ok: false, reason: 'Unknown ability' };
    if (!this.started) {
      if (this.over) return { ok: false, reason: 'The fight is over' };
      const reason = this.blocker(id);
      if (reason) return { ok: false, reason };
      if (PREPULL.has(id)) { this.cast(id); return { ok: true }; }
      this.start();
    }
    const reason = this.blocker(id);
    if (!reason) { this.cast(id); return { ok: true }; }
    const wait = this.readyIn(id);
    if (reason === 'Ability is not ready yet' && wait <= this.o.queueWindow) {
      this.pending = { id, at: this.t + wait };
      return { ok: true, queued: true };
    }
    // Pressed a little before there is energy for it: it goes off when there is (the game's energy wait is the
    // spell queue's too).
    if (reason === 'Not enough energy') {
      const at = Math.max(wait, this.energyIn(this.cost(id)));
      if (at <= this.o.queueWindow) { this.pending = { id, at: this.t + at + 0.001 }; return { ok: true, queued: true }; }
    }
    return { ok: false, reason };
  }

  cancelQueue() {}

  // ---- abilities: what they do ---------------------------------------------------------------------------

  // A refund on a miss (IssueRefund): the share of the cost back.
  refund(id) { this.addEnergy(this.cost(id) * REFUND_ON_MISS, 'refund'); }

  cast(id) {
    const ab = ABILITIES[id];
    const cost = this.cost(id);
    if (ab.gcd && this.started) this.gcdEnd = this.t + this.gcdFor(id);
    if (ab.cd) this.cds[id] = this.t + this.cooldownFor(id);
    this.spendEnergy(cost, id);
    this.stats.casts.push({ t: this.t, id });
    this.emit({ type: 'cast', id });
    const target = this.target;
    const t = this.tal;

    if (ab.item) { this.useItem(id); return; }
    if (!['stealth', 'vanish', 'premeditation', 'coldBlood', 'evasion', 'racial', 'bladeFlurry', 'adrenalineRush', 'preparation'].includes(id)) this.breakStealth();

    switch (id) {
      case 'sinisterStrike': {
        const o = this.rogueStrike(id, ab.name, () => ab.base + this.weaponDamage('mh', true));
        if (this.landed(o)) this.addCombo(ab.cp, ab.name); else this.refund(id);
        break;
      }
      case 'backstab': {
        const bonusCrit = TALENT.puncturingWounds.backstabCrit[t.puncturingWounds] || 0;
        const o = this.rogueStrike(id, ab.name, () => (ab.base + this.weaponDamage('mh', true)) * ab.weapon, { bonusCrit });
        if (this.landed(o)) {
          this.addCombo(ab.cp, ab.name);
          if (t.puncturingWounds && this.rng() < TALENT.puncturingWounds.cpChance[t.puncturingWounds]) this.addCombo(1, 'Puncturing Wounds');
          if (t.cutthroat && this.rng() < TALENT.cutthroat.chance[t.cutthroat]) this.setAura('cutthroat', TALENT.cutthroat.duration);
        } else this.refund(id);
        this.dropAura('thousandCuts');
        break;
      }
      case 'mutilate': {
        // The cast rolls hit, dodge and parry; the two strikes that follow roll only block and crit.
        const o = this.rollYellow('mh', target, -1000);
        if (!this.landed(o)) { this.record(id, ab.name, 0, o, target.i); this.refund(id); break; }
        this.addCombo(ab.cp, ab.name);
        // The cast is a main-hand special of its own: it rolls the main-hand poison and Windfury too (wowsims' TODO:
        // a double main-hand poison proc).
        this.rollPoison('mh', target);
        this.maybeWindfury();
        const more = this.poisoned(target) ? 1 + ab.poisoned : 1;
        const bonusCrit = TALENT.puncturingWounds.mutilateCrit[t.puncturingWounds] || 0;
        // The off-hand strike halves only its weapon damage, not the 67 (wowsims OHNormalizedWeaponDamage), and
        // Dual Wield Specialization raises it.
        for (const hand of ['oh', 'mh']) {
          const key = hand === 'mh' ? 'mutilateMh' : 'mutilateOh';
          const weapon = () => (hand === 'mh' ? this.weaponDamage('mh', true) : 0.5 * this.weaponDamage('oh', true));
          const ohMult = hand === 'oh' ? this.offhandMult() : 1;
          this.mutilateHit(key, hand, () => (ab.base + weapon()) * ab.weapon * more * ohMult, bonusCrit);
        }
        if (this.aura('coldBlood')) this.dropAura('coldBlood');
        break;
      }
      case 'hemorrhage': {
        const share = this.isDagger('mh') ? ab.daggerWeapon : ab.weapon;
        const o = this.rogueStrike(id, ab.name, () => this.weaponDamage('mh', true) * share);
        if (this.landed(o)) {
          this.addCombo(ab.cp, ab.name);
          this.own(target).hemoEnd = this.t + ab.duration;
        } else this.refund(id);
        this.dropAura('thousandCuts');
        break;
      }
      case 'ghostlyStrike': {
        const share = this.isDagger('mh') ? ab.daggerWeapon : ab.weapon;
        const o = this.rogueStrike(id, ab.name, () => this.weaponDamage('mh', false) * share);
        if (this.landed(o)) this.addCombo(ab.cp, ab.name); else this.refund(id);
        break;
      }
      case 'ambush': {
        this.dropAura('cutthroat');
        const bonusCrit = TALENT.improvedAmbush.crit[t.improvedAmbush] || 0;
        const o = this.rogueStrike(id, ab.name, () => (ab.base + this.weaponDamage('mh', true)) * ab.weapon, { bonusCrit });
        if (this.landed(o)) {
          this.addCombo(ab.cp, ab.name);
          if (t.initiative && this.rng() < TALENT.initiative.chance[t.initiative]) this.addCombo(1, 'Initiative');
        } else this.refund(id);
        break;
      }
      case 'garrote': {
        const o = this.rollYellow('mh', target);
        if (!this.landed(o)) { this.record(id, ab.name, 0, o, target.i); this.refund(id); break; }
        const more = 1 + (TALENT.opportunity.damage[t.opportunity] || 0);
        this.bleed(this.own(target), 'garrote', ab.name, ab.duration / ab.period, ab.period, () => (ab.tick + this.ap() * ab.apCoef) * more, target);
        this.addCombo(ab.cp, ab.name);
        if (t.initiative && this.rng() < TALENT.initiative.chance[t.initiative]) this.addCombo(1, 'Initiative');
        this.afterMelee(o, target, { yellow: true, id });
        break;
      }
      case 'eviscerate': {
        const points = this.cp;
        const o = this.rogueStrike(id, ab.name, () => ab.base * (1 + (this.rng() - 0.5) * ab.variance) + points * (ab.perPoint + ab.apPerPoint * this.ap()));
        if (this.landed(o)) this.applyFinisher(points); else this.refund(id);
        break;
      }
      case 'sliceAndDice': {
        const points = this.cp;
        const dur = (ab.base + ab.perPoint * points) * (1 + (TALENT.improvedSliceAndDice.duration[t.improvedSliceAndDice] || 0));
        this.applyFinisher(points);
        this.setAura('sliceAndDice', dur);
        break;
      }
      case 'venom': {
        const points = this.cp;
        this.applyFinisher(points);
        this.setAura('venom', ab.base + ab.perPoint * points);
        break;
      }
      case 'rupture': {
        const points = this.cp;
        const o = this.rollYellow('mh', target);
        if (!this.landed(o)) { this.record(id, ab.name, 0, o, target.i); this.refund(id); break; }
        const own = this.own(target);
        const ap = this.ap();
        const more = 1 + (TALENT.serratedBlades.rupture[t.serratedBlades] || 0);
        this.bleed(own, 'rupture', ab.name, ab.baseTicks + points, ab.period, () => {
          const hemo = own.hemoEnd > this.t ? 1 + ABILITIES.hemorrhage.rupture : 1;
          return (ab.tick + ab.perPoint * points + ap * ab.apScaling[points]) * more * hemo;
        }, target);
        this.applyFinisher(points);
        this.afterMelee(o, target, { yellow: true, id });
        break;
      }
      // Expose Armor: a yellow hit roll (a miss gives the energy back); the armor stays off the target for everyone.
      case 'exposeArmor': {
        const points = this.cp;
        const armor = points * ab.perPoint;
        const o = this.rollYellow('mh', target);
        if (!this.landed(o)) { this.record(id, ab.name, 0, o, target.i); this.refund(id); break; }
        if (!(target.exposeEnd > this.t) || armor >= target.exposeArmor) { target.exposeArmor = armor; target.exposeEnd = this.t + ab.duration; }
        this.applyFinisher(points);
        if (points >= 5 && t.improvedExposeArmor) this.addCombo(TALENT.improvedExposeArmor.refund[t.improvedExposeArmor], 'Improved Expose Armor');
        break;
      }
      case 'kick': {
        this.rogueStrike(id, ab.name, () => ab.damage);
        break;
      }
      case 'feint': {
        const lift = Math.min(this.threat[this.primary], ab.threat * this.threatMult());
        this.threat[this.primary] -= lift;
        this.threatTotal -= lift;
        const m = this.threatMeter.feint || (this.threatMeter.feint = { name: 'Feint', threat: 0 });
        m.threat -= lift;
        this.updateAggro(this.primary);
        break;
      }
      case 'stealth': this.setAura('stealth', Infinity); this.mhNext = Math.max(this.mhNext, this.t); break;
      case 'vanish': this.setAura('stealth', Infinity); this.dropThreat(); break; // gone: no threat on anything
      case 'premeditation': this.addCombo(ab.cp, ab.name); break;
      case 'coldBlood': this.setAura('coldBlood', Infinity); break;
      case 'preparation':
        for (const k of ['coldBlood', 'premeditation', 'vanish', 'ghostlyStrike', 'bladeFlurry', 'adrenalineRush']) this.cds[k] = 0;
        break;
      case 'racial': {
        const r = this.racial.active;
        this.cds.racial = this.t + r.cd;
        this.setAura('racial', r.duration, 0, { name: r.name, icon: r.icon });
        break;
      }
      case 'bladeFlurry':
      case 'adrenalineRush':
      case 'evasion':
        this.setAura(id, ab.duration);
        break;
    }
  }

  // One of Mutilate's strikes: it cannot miss, be dodged or parried (the cast rolled that), only crit.
  mutilateHit(key, hand, raw, bonusCrit) {
    const target = this.target;
    let crit = (this.critPct() + bonusCrit + this.handCrit(hand)) / 100 - this.tables[hand].critSuppression;
    if (this.aura('coldBlood')) crit = 1;
    const outcome = this.rng() < crit ? 'crit' : 'hit';
    let dmg = raw() * this.abilityMult(key) + this.physDmgBonus();
    dmg *= this.damageMult() * this.armorMult(target);
    if (outcome === 'crit') dmg *= this.critMultiplier(true, key);
    this.record(key, `Mutilate (${hand === 'mh' ? 'Main Hand' : 'Off Hand'})`, dmg, outcome, target.i);
    this.afterDeal(key, dmg, target);
    this.afterMelee(outcome, target, { hand, yellow: true, id: key });
  }

  // ---- the pull, the review ---------------------------------------------------------------------------------

  onStart() {
    this.energyAt = this.t;
  }

  trackReview(newT) {
    if (newT <= this.t || !this.started) return;
    if (!this.aura('sliceAndDice')) this.review.sndDown += newT - this.t;
  }
}
