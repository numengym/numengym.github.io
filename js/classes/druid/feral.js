// The Feral Druid on the core unit (engine/unit.js): Cat Form (energy, combo points, Shred, Rake, Rip, Ferocious Bite,
// Shifting Power for mana) or Dire Bear Form (rage, Maul on the next swing, Lacerate, Primal Bite, Swipe, Enrage), the
// paw instead of the weapon, Omen of Clarity, Berserk and the feral talents. The druid keeps a mana bar beside the form's
// resource (Shifting Power, Innervate, the mana potion). Formulas follow wowsims/forever sim/druid/*.go.
import {
  ABILITIES, AURAS, BEAR_GCD, BERSERK, BERSERK_CRIT, CAT_GCD, CLEARCASTING, ENERGY, ENRAGE, FEROCITY_ENERGY, FEROCITY_RAGE, FORMS,
  HOWLING_IDOL, MAX_COMBO_POINTS, OMEN, PAW_VARIANCE, REFUND_ON_MISS, SAVAGE_FURY, TALENT, parseTalents,
} from '../../data/feral.js';
import { WINDFURY } from '../../data/buffs.js';
import { MANA } from '../../data/class-stats.js';
import { DAMAGE_TAKEN_RAGE, RAGE, RANGE, THREAT } from '../../data/warrior.js';
import { Unit } from '../../engine/unit.js';

const RAGE_NO_THREAT = new Set(['Main Hand', 'damage taken', 'refund']);

// The paw a form swings with (forms.go feralWeapon): the weapon's DPS at the paw's speed, ±20%, plus its flat damage.
function pawOf(weapon, speed) {
  const dps = weapon ? (weapon.min + weapon.max) / 2 / weapon.speed : 1;
  const mean = dps * speed;
  const flat = weapon ? weapon.flat || 0 : 0;
  return {
    name: 'Paw', min: Math.max(1, Math.floor(mean * (1 - PAW_VARIANCE / 2))) + flat, max: Math.max(1, Math.round(mean * (1 + PAW_VARIANCE / 2))) + flat,
    speed, norm: speed, flat: 0, skill: 0, twoHand: true, icon: weapon ? weapon.icon : null, type: 0,
  };
}

export class FeralFight extends Unit {
  static ABILITIES = ABILITIES;
  static AURA_NAMES = Object.fromEntries(Object.entries(AURAS).map(([id, a]) => [id, a.name]));

  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    const tal = this.tal = parseTalents(sheet.talents);
    this.form = sheet.form === 'bear' ? 'bear' : 'cat';
    const form = FORMS[this.form];
    // The form's sheet: the paw, attack power from the form, Predatory Strikes and Heart of the Wild, crit from Sharpened
    // Claws and Nature's Majesty, hit from Nature's Reach.
    const strMore = this.form === 'cat' ? sheet.str * (TALENT.heartOfTheWild.str[tal.heartOfTheWild] || 0) : 0;
    const staMore = this.form === 'bear' ? (sheet.sta || 0) * (TALENT.heartOfTheWild.sta[tal.heartOfTheWild] || 0) : 0;
    const c = this.c = {
      ...sheet,
      mh: pawOf(sheet.mh, form.speed),
      oh: null,
      ap: sheet.ap + form.ap + sheet.agi * form.apPerAgi + (TALENT.predatoryStrikes.ap[tal.predatoryStrikes] || 0) + strMore * this.cs.apPerStr,
      critPct: sheet.critPct + (TALENT.sharpenedClaws.critPct[tal.sharpenedClaws] || 0) + (TALENT.naturesMajesty.critPct[tal.naturesMajesty] || 0),
      hitPct: sheet.hitPct + (TALENT.naturesReach.hitPct[tal.naturesReach] || 0),
    };
    this.dual = false;
    this.tables = { mh: this.tables.mh, oh: this.tables.mh };
    if (this.form === 'bear') {
      // Dire Bear Form: the items' armor 360% higher, Thick Hide's base armor with it, more health.
      c.armor = (sheet.armor || 0) + (sheet.itemArmor || 0) * (form.armorMult - 1) + (TALENT.thickHide.armor[tal.thickHide] || 0) * form.armorMult;
      this.maxHealth = (sheet.health || 4000) + form.health + staMore * 10;
      this.health = this.maxHealth;
    }
    this.baseArmor = c.armor;
    // Mana beside the form's resource: Heart of the Wild's Intellect adds to it.
    const intMore = (sheet.int || 0) * (TALENT.heartOfTheWild.int[tal.heartOfTheWild] || 0);
    this.maxMana = (sheet.mana || 0) + intMore * MANA.perInt;
    this.manaNow = this.maxMana;
    this.manaAt = 0;
    this.fsrEnd = -Infinity;
    this.maxEnergy = ENERGY.max;
    this.energyNow = this.maxEnergy;
    this.energyAt = 0;
    this.rageNow = 0;
    this.maxRageBar = RAGE.max;
    this.cp = 0;
    this.queued = null; // Maul on the next swing
    this.icd = {};
    this.idolCd = (sheet.itemIds || []).includes(HOWLING_IDOL.id) ? HOWLING_IDOL.cd : 0;
    this.setAura(this.form === 'cat' ? 'catForm' : 'bearForm', Infinity);
    Object.assign(this.review, { energyWasted: 0, cpWasted: 0, rageWasted: 0, ripDown: 0, rageFromDamage: 0, mauls: 0 });
    Object.assign(this.stats, { rage: [], rageGain: {}, rageWaste: {}, rageSpent: {} }); // the form's resource for the results
  }

  // The results and HUD read the form's resource through these.
  get cat() { return this.form === 'cat'; }
  get resourceName() { return this.cat ? 'Energy' : 'Rage'; }
  get power() { return this.cat ? this.energy : this.rageNow; }
  get maxPower() { return this.cat ? this.maxEnergy : this.maxRageBar; }
  get rage() { return this.cat ? this.energy : this.rageNow; } // the generic views (APL helper, results) read "rage"
  set rage(v) { if (this.cat) this.energy = v; else this.rageNow = Math.max(0, Math.min(this.maxRageBar, v)); }
  get maxRage() { return this.maxPower; }

  // ---- energy (Cat Form) -----------------------------------------------------------------------------

  regenRate() { return ENERGY.regen; }

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
  energyIn(need) { return Math.max(0, (need - this.energy) / this.regenRate()); }

  // ---- the form's resource: gains and spending -------------------------------------------------------

  gain(amount, source) { if (this.cat) this.addEnergy(amount, source); else this.addRage(amount, source); }
  spend(amount, by) { this.spendPower(amount, by); }
  energize(misc, amount, source) {
    if (misc === 0) this.addMana(amount, source);
    else if (misc === 1 && !this.cat) this.addRage(amount / 10, source);
    else if (misc === 3 && this.cat) this.addEnergy(amount, source);
  }

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

  // Rage gained in combat makes threat, split over the living targets, except from swings, hits taken and refunds.
  addRage(amount, source) {
    const before = this.rageNow;
    this.rageNow = Math.min(this.maxRageBar, before + amount);
    const gained = this.rageNow - before;
    const wasted = amount - gained;
    const s = this.stats;
    s.rageGain[source] = (s.rageGain[source] || 0) + amount;
    if (wasted > 1e-9) {
      s.rageWaste[source] = (s.rageWaste[source] || 0) + wasted;
      if (this.started) this.review.rageWasted += wasted;
    }
    if (this.started && gained > 0 && !RAGE_NO_THREAT.has(source)) {
      const alive = this.targets.filter((t) => !t.dead);
      for (const t of alive) this.addThreat('rageGain', 'Rage gained', t.i, gained * THREAT.perRage / alive.length);
    }
    this.emit({ type: 'rage', resource: 'rage', amount, source, total: this.rageNow });
  }

  spendPower(amount, by = 'other') {
    if (amount <= 0) return;
    if (this.cat) this.energy -= amount; else this.rageNow = Math.max(0, this.rageNow - amount);
    this.stats.rageSpent[by] = (this.stats.rageSpent[by] || 0) + amount;
  }

  sampleResource() {
    const r = this.stats.rage;
    if (!r.length || this.t - r[r.length - 1][0] >= 0.25) r.push([this.t, this.power]);
  }

  // ---- mana (Shifting Power, Innervate) ----------------------------------------------------------------

  spiritRegen() {
    const spi = (this.c.spi || 0) + this.tempStats().spi;
    return (MANA.spiritBase + spi * MANA.perSpirit) * (this.aura('innervate') ? ABILITIES.innervate.regen : 1);
  }
  syncMana() {
    const from = this.manaAt;
    const to = this.t;
    if (to <= from) return;
    const spirit = this.spiritRegen();
    const mp5 = ((this.c.mp5 || 0) + this.tempStats().mp5) / 5;
    const casting = mp5 + (this.aura('innervate') ? spirit : 0);
    const fsr = Math.max(from, Math.min(to, this.fsrEnd));
    this.manaNow = Math.min(this.maxMana, this.manaNow + (fsr - from) * casting + (to - fsr) * (mp5 + spirit));
    this.manaAt = to;
  }
  get mana() { this.syncMana(); return this.manaNow; }
  set mana(v) { this.syncMana(); this.manaNow = Math.max(0, Math.min(this.maxMana, v)); }
  addMana(amount, source) {
    const before = this.mana;
    this.mana = before + amount;
    this.emit({ type: 'rage', resource: 'mana', amount, source, total: this.manaNow });
  }
  spendMana(amount) {
    if (amount <= 0) return;
    this.mana -= amount;
    this.fsrEnd = this.t + MANA.fiveSecondRule;
  }
  manaCost(id) { const ab = ABILITIES[id]; return ab && ab.costPct ? ab.costPct * this.cs.base.mana : 0; }

  // Innervate changes the regeneration: the mana up to its start or end is counted at the old rate.
  setAura(id, ...args) { if (id === 'innervate') this.syncMana(); super.setAura(id, ...args); }
  expire(id, end) { if (id === 'innervate') this.syncMana(); super.expire(id, end); }

  // ---- combo points -------------------------------------------------------------------------------------

  addCombo(n, source) {
    const room = MAX_COMBO_POINTS - this.cp;
    if (n > room && this.started) this.review.cpWasted += n - room;
    this.cp = Math.min(MAX_COMBO_POINTS, this.cp + n);
    this.emit({ type: 'combo', amount: n, source, total: this.cp });
  }
  spendCombo() {
    const points = this.cp;
    this.cp = 0;
    this.emit({ type: 'combo', amount: -points, source: 'finisher', total: 0 });
  }

  // ---- stats (core hooks) ----------------------------------------------------------------------------------

  gcdFor() { return this.cat ? CAT_GCD : BEAR_GCD; }

  // Temporary Agility gives attack power in Cat Form, temporary Strength more with Heart of the Wild.
  ap() {
    const tmp = this.tempStats();
    const strMult = this.cat ? 1 + (TALENT.heartOfTheWild.str[this.tal.heartOfTheWild] || 0) : 1;
    return super.ap() + (tmp.agi * FORMS[this.form].apPerAgi + tmp.str * (strMult - 1) * this.cs.apPerStr) * this.c.statMult;
  }

  // Naturalist: all damage.
  applyDamageBonus(m) { return m * (1 + (TALENT.naturalist.dmg[this.tal.naturalist] || 0)); }
  threatMult() { return FORMS[this.form].threat; }
  // A form cannot parry (no weapon in the paws).
  avoidance() { return { ...super.avoidance(), parry: 0 }; }
  armorTakenMult() {
    this.c.armor = this.baseArmor * (this.aura('enrage') ? ENRAGE.armor : 1);
    return super.armorTakenMult();
  }

  // Rend and Tear (the target is assumed bleeding, as wowsims' assumeBleedActive) and Savage Fury on an ability.
  abilityMult(id, periodic = false) {
    let m = 1 + (TALENT.rendAndTear.dmg[this.tal.rendAndTear] || 0);
    if (periodic && id === 'rake') m *= 1 + (TALENT.savageFury.periodic[this.tal.savageFury] || 0);
    else if (!periodic && SAVAGE_FURY.has(id)) m *= 1 + (TALENT.savageFury.dmg[this.tal.savageFury] || 0);
    const r = this.racialActive();
    if (r && r.damagePct && r.abilities && r.abilities.includes(id)) m *= 1 + r.damagePct / 100;
    return m;
  }

  // Natural Instinct raises the feral attacks' crit bonus; white swings crit for 200%.
  critMultiplier(yellow) { return yellow ? 1 + (1 + (TALENT.naturalInstinct.critBonus[this.tal.naturalInstinct] || 0)) : 2; }
  bonusCrit(id) { return this.aura('berserk') && BERSERK_CRIT.has(id) ? BERSERK.critPct : 0; }

  // ---- attacks -------------------------------------------------------------------------------------------

  // A yellow strike on a target: one roll for miss, dodge, parry and block, then the crit.
  feralStrike(id, raw, { target = this.target, ignoreArmor = false, noCrit = false } = {}) {
    const ab = ABILITIES[id];
    const outcome = this.rollYellow('mh', target, noCrit ? -1000 : this.bonusCrit(id));
    let dmg = 0;
    if (this.landed(outcome)) {
      dmg = raw() * this.abilityMult(id) + this.physDmgBonus();
      dmg *= this.damageMult() * (ignoreArmor ? 1 : this.armorMult(target));
      if (outcome === 'crit') dmg *= this.critMultiplier(true);
    }
    this.record(id, ab.name, dmg, outcome, target.i);
    this.afterMelee(outcome, target, { yellow: true, id });
    if (this.landed(outcome) && target === this.target) this.maybeWindfury();
    return outcome;
  }

  // A bleed's ticks; they can crit (the rows' "periodic can crit"). A new one starts them again.
  bleed(target, key, ticks, period, tickDmg, { id = key, stacks = null } = {}) {
    const own = this.own(target);
    const token = Symbol(key);
    own[key] = token;
    own[`${key}End`] = this.t + ticks * period;
    if (stacks != null) own[`${key}Stacks`] = stacks;
    for (let i = 1; i <= ticks; i++) {
      this.schedule(this.t + i * period, () => {
        if (own[key] !== token) return;
        // Gift of Arthas's flat damage reaches the ticks too, past the multipliers (wowsims: 8 more per tick, crit or not).
        let dmg = tickDmg() * this.abilityMult(id, true) * this.damageMult() + this.physDmgBonus();
        const crit = this.rng() < Math.max(0, (this.critPct() + this.bonusCrit(id)) / 100 - this.tables.mh.critSuppression);
        if (crit) dmg *= this.critMultiplier(true);
        this.record(key, ABILITIES[id].name, dmg, crit ? 'crit' : 'hit', target.i);
      });
    }
  }

  // Omen of Clarity on a landed hit: 2 procs per minute at the paw's speed, 10 s apart. Blood Frenzy on a crit.
  afterProcs(outcome, target, { yellow = false, id = null } = {}) {
    if (!this.landed(outcome)) return;
    if ((this.icd.omen || 0) <= this.t && this.rng() < OMEN.ppm * this.c.mh.speed / 60) {
      this.icd.omen = this.t + OMEN.icd;
      this.setAura('clearcasting', OMEN.duration);
    }
    if (outcome === 'crit' && this.tal.bloodFrenzy && this.rng() < TALENT.bloodFrenzy.chance[this.tal.bloodFrenzy]) {
      if (!this.cat) this.addRage(TALENT.bloodFrenzy.rage, 'Blood Frenzy');
      else if (yellow && ABILITIES[id] && ABILITIES[id].builder) this.addCombo(1, 'Blood Frenzy');
    }
  }

  // Bear: rage from white hits (sim/core/rage.go, the two-hand factor, druid.go BearRageIsTwoHanded).
  onWhiteHit(hand, outcome) {
    if (this.cat) return;
    const swingRage = RAGE.hitFactor * this.c.mh.speed;
    let rage = swingRage * RAGE.twoHandMultiplier;
    if (outcome === 'crit') rage += RAGE.critBonus * swingRage;
    this.addRage(rage, 'Main Hand');
  }
  onDamageTaken(amount) {
    if (this.cat) return;
    this.review.rageFromDamage += DAMAGE_TAKEN_RAGE * amount;
    this.addRage(DAMAGE_TAKEN_RAGE * amount, 'damage taken');
  }

  // Maul replaces the next main-hand swing.
  replaceSwing() {
    if (!this.maul()) return false;
    this.onSwing(null, this.target);
    return true;
  }

  // The queued Maul goes off on a main-hand attack (a swing, or a Windfury attack with its attack power). False when
  // none is queued or there is no rage for it.
  maul(bonusAp = 0) {
    if (this.queued !== 'maul') return false;
    this.queued = null;
    this.emit({ type: 'queue', id: null });
    const cost = this.cost('maul');
    if (this.rageNow < cost || this.cat) return false;
    this.payCost('maul');
    this.stats.casts.push({ t: this.t, id: 'maul' });
    this.review.mauls++;
    const ab = ABILITIES.maul;
    this.inMaul = true;
    const o = this.feralStrike('maul', () => (ab.base + this.weaponDamage('mh', false, bonusAp)) * ab.weapon);
    this.inMaul = false;
    if (!this.landed(o)) this.refund(cost);
    if (!bonusAp && this.landed(o)) this.maybeWindfury();
    return true;
  }

  // Windfury Totem's extra attack takes a queued Maul, as wowsims' swing replacement does (not from its own attack).
  maybeWindfury() {
    if (this.inMaul || !this.c.windfuryAp || this.rng() >= WINDFURY.chance) return;
    if (!this.maul(this.c.windfuryAp)) this.whiteSwing('mh', this.c.windfuryAp);
  }

  // ---- abilities: rules ------------------------------------------------------------------------------------

  // The form's resource an ability costs: talents, Clearcasting (free).
  cost(id) {
    const ab = ABILITIES[id];
    if (!ab || !ab.cost) return 0;
    if (this.aura('clearcasting') && CLEARCASTING.has(id)) return 0;
    let cost = ab.cost;
    const t = this.tal;
    if (FEROCITY_ENERGY.has(id)) cost -= TALENT.ferocity.energy[t.ferocity] || 0;
    if (FEROCITY_RAGE.has(id)) cost -= TALENT.ferocity.rage[t.ferocity] || 0;
    if (id === 'shred') cost -= TALENT.shreddingAttacks.shred[t.shreddingAttacks] || 0;
    if (id === 'lacerate') cost -= TALENT.shreddingAttacks.lacerate[t.shreddingAttacks] || 0;
    const r = this.racialActive();
    if (r && r.costPct && r.abilities && r.abilities.includes(id)) cost *= 1 + r.costPct / 100;
    return Math.max(0, cost);
  }

  cooldownFor(id) {
    const ab = ABILITIES[id];
    if (id === 'shiftingPower') return ab.cd - (TALENT.improvedShiftingPower.cd[this.tal.improvedShiftingPower] || 0) - this.idolCd;
    if (id === 'primalBite' && this.aura('berserk')) return 0;
    return ab.cd || 0;
  }

  blocker(id) {
    const ab = ABILITIES[id];
    if (!ab) return 'Unknown ability';
    if (this.over) return 'The fight is over';
    if (ab.talent && !this.tal[ab.talent]) return `${ab.name} is not talented`;
    if (ab.form && ab.form !== this.form) return `Must be in ${FORMS[ab.form].name}`;
    if (ab.item) {
      const use = this.c.uses[ab.item];
      if (!use) return `No ${ab.name.toLowerCase()} with a use effect`;
      if (use.oncePerFight && this.used[id]) return 'Only one potion per fight';
    }
    if (ab.racial && !this.racial.active) return 'Your race has no offensive racial';
    if (ab.melee) {
      if (!this.inMelee()) return 'Out of range';
      if (!this.geo.facing) return 'You are facing the wrong way!';
    }
    if (ab.behind && this.geo.inFront[this.primary]) return 'You must be behind your target';
    if (ab.finisher && this.cp <= 0) return 'That ability requires combo points';
    if (id === 'maul' && this.queued === 'maul') return 'Already queued';
    if (id === 'shiftingPower' && this.energy >= this.maxEnergy) return 'You are at full energy';
    if (id === 'innervate' && this.aura('innervate')) return 'Already active';
    if (this.cdLeft(id) > 0) return 'Ability is not ready yet';
    if (ab.gcd && this.gcdLeft() > 0) return 'Ability is not ready yet';
    if (this.mana < this.manaCost(id)) return 'Not enough mana';
    if (this.cat && this.energy < this.cost(id)) return 'Not enough energy';
    if (!this.cat && this.rageNow < this.cost(id)) return 'Not enough rage';
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
      this.start();
    }
    // Maul again takes it off the next swing.
    if (id === 'maul' && this.queued === 'maul') {
      this.queued = null;
      this.emit({ type: 'queue', id: null });
      return { ok: true };
    }
    const reason = this.blocker(id);
    if (!reason) { this.cast(id); return { ok: true }; }
    const wait = this.readyIn(id);
    if (reason === 'Ability is not ready yet' && wait <= this.o.queueWindow) {
      this.pending = { id, at: this.t + wait };
      return { ok: true, queued: true };
    }
    // Pressed a little before there is energy for it: it goes off when there is.
    if (reason === 'Not enough energy') {
      const at = Math.max(wait, this.energyIn(this.cost(id)));
      if (at <= this.o.queueWindow) { this.pending = { id, at: this.t + at + 0.001 }; return { ok: true, queued: true }; }
    }
    return { ok: false, reason };
  }

  cancelQueue() {
    if (this.queued) { this.queued = null; this.emit({ type: 'queue', id: null }); }
  }

  // ---- abilities: what they do ---------------------------------------------------------------------------

  refund(cost) { if (cost > 0) this.gain(cost * REFUND_ON_MISS, 'refund'); }

  // Pays an ability's cost; Clearcasting is used up by an ability it makes free.
  payCost(id) {
    const cost = this.cost(id);
    if (this.aura('clearcasting') && CLEARCASTING.has(id) && ABILITIES[id].cost) this.dropAura('clearcasting');
    this.spendPower(cost, id);
    this.spendMana(this.manaCost(id));
    return cost;
  }

  cast(id) {
    const ab = ABILITIES[id];
    if (id === 'maul') {
      this.queued = 'maul';
      this.emit({ type: 'queue', id });
      return;
    }
    if (ab.gcd && this.started) this.gcdEnd = this.t + this.gcdFor(id);
    if (ab.cd) this.cds[id] = this.t + this.cooldownFor(id);
    const cost = this.payCost(id);
    this.stats.casts.push({ t: this.t, id });
    this.emit({ type: 'cast', id });
    if (ab.item) { this.useItem(id); return; }
    const target = this.target;

    switch (id) {
      case 'shred':
      case 'claw':
      case 'primalBite': {
        const o = this.feralStrike(id, () => (ab.base + this.weaponDamage('mh', true)) * ab.weapon);
        if (ab.cp && this.landed(o)) this.addCombo(ab.cp, ab.name);
        if (!this.landed(o)) this.refund(cost);
        // Berserk in Bear Form: Primal Bite bites 3 more targets.
        if (id === 'primalBite' && this.aura('berserk')) {
          for (const t of this.others(RANGE.melee).slice(0, BERSERK.extraTargets)) {
            this.feralStrike(id, () => (ab.base + this.weaponDamage('mh', true)) * ab.weapon, { target: t });
          }
        }
        break;
      }
      case 'rake': {
        // The first hit ignores armor; the bleed ticks on the attack power at each tick.
        const o = this.feralStrike(id, () => ab.base, { ignoreArmor: true });
        if (this.landed(o)) {
          this.bleed(target, 'rake', ab.duration / ab.period, ab.period, () => ab.tick + ab.apCoef * this.ap());
          this.addCombo(ab.cp, ab.name);
        } else this.refund(cost);
        break;
      }
      case 'rip': {
        // A hit roll only; the combo points are taken now, the attack power at each tick (the fifth point counts as the
        // fourth for it).
        const o = this.rollYellow('mh', target, -1000);
        if (!this.landed(o)) { this.record(id, ab.name, 0, o, target.i); this.refund(cost); this.afterMelee(o, target, { yellow: true, id }); break; }
        const points = this.cp;
        this.bleed(target, 'rip', ab.ticks, ab.period, () => ab.tick + ab.perPoint * points + ab.apPerPoint * Math.min(points, ab.maxApPoints) * this.ap());
        this.spendCombo();
        this.afterMelee(o, target, { yellow: true, id });
        break;
      }
      case 'ferociousBite': {
        // The extra energy and the combo points are spent only when it lands.
        const points = this.cp;
        const extra = this.energy;
        const o = this.feralStrike(id, () => ab.base * (1 + (this.rng() - 0.5) * ab.variance) + points * (ab.perPoint + ab.apPerPoint * this.ap()) + extra * ab.perEnergy);
        if (this.landed(o)) {
          this.spendPower(extra, id);
          this.spendCombo();
        }
        break;
      }
      case 'lacerate': {
        // A first Lacerate hits for nothing; each stack already on adds 10% paw damage. A stack more, and the bleed
        // starts again.
        const own = this.own(target);
        const existing = own.lacerateEnd > this.t ? own.lacerateStacks || 0 : 0;
        const o = this.feralStrike(id, () => this.weaponDamage('mh', false) * ab.perStack * existing);
        if (this.landed(o)) {
          const stacks = Math.min(ab.maxStacks, existing + 1);
          this.bleed(target, 'lacerate', ab.duration / ab.period, ab.period, () => ab.tick * stacks, { stacks });
        } else this.refund(cost);
        break;
      }
      case 'swipe': {
        for (const t of [target, ...this.others(RANGE.melee).slice(0, ab.targets - 1)]) {
          this.feralStrike(id, () => ab.base + ab.apCoef * this.ap(), { target: t });
        }
        break;
      }
      case 'shiftingPower': this.addEnergy(ab.energy, ab.name); break;
      case 'enrage': {
        this.addRage(ENRAGE.now, ab.name);
        this.setAura('enrage', ENRAGE.duration);
        for (let i = 1; i <= ENRAGE.duration; i++) this.schedule(this.t + i, () => { if (!this.cat) this.addRage(ENRAGE.perSec, ab.name); });
        break;
      }
      case 'berserk': {
        this.setAura('berserk', BERSERK.duration);
        this.cds.primalBite = 0;
        break;
      }
      case 'innervate': this.setAura('innervate', ab.duration); break;
      case 'racial': {
        const r = this.racial.active;
        this.cds.racial = this.t + r.cd;
        this.setAura('racial', r.duration, 0, { name: r.name, icon: r.icon });
        break;
      }
      default: break;
    }
  }

  // ---- the pull, the review ---------------------------------------------------------------------------------

  onStart() {
    this.energyAt = this.t;
    this.manaAt = this.t;
  }

  trackReview(newT) {
    if (newT <= this.t || !this.started || !this.cat) return;
    const own = this.own(this.target);
    if (!(own.ripEnd > this.t)) this.review.ripDown += newT - this.t;
  }
}
