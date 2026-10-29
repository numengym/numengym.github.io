// The paladin on top of the core unit (engine/unit.js): white swings with a seal on them, mana with the five-second
// rule, Judgement, and the Holy spells. Formulas follow wowsims/forever sim/paladin/*.go.
import { ABILITIES, AURAS, SEALS, SEAL_DURATION, SPELL_MISS, TALENT, parseTalents } from '../../data/paladin.js';
import { MANA } from '../../data/class-stats.js';
import { RATING } from '../../data/warrior.js';
import { Unit } from '../../engine/unit.js';

const LIBRAM_OF_LAW = 272435;     // +4% Judgement of Righteousness and of Fury
const LIBRAM_OF_FERVOR = 23203;   // +48 Seal of the Crusader attack power, +33 Judgement of the Crusader
const PREPULL = new Set(['righteousFury', 'sealOfRighteousness', 'sealOfCommand', 'sealOfTheCrusader', 'sealOfFury', 'holyShield']);
const SPELL_CRIT_MULT = 1.5;

export class PaladinFight extends Unit {
  static ABILITIES = ABILITIES;
  static AURA_NAMES = Object.fromEntries(Object.entries(AURAS).map(([id, a]) => [id, a.name]));

  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    this.tal = parseTalents(sheet.talents);
    this.dual = false;
    // Divine Intellect: more Intellect, so more mana and spell crit; Divine Strength: more attack power.
    const intMore = sheet.int * (TALENT.divineIntellect.int[this.tal.divineIntellect] || 0);
    this.int = sheet.int + intMore;
    this.maxMana = (sheet.mana || 0) + intMore * MANA.perInt;
    this.baseSpellCrit = (sheet.spellCritPct || 0) + intMore * this.cs.critPerInt;
    this.strAp = sheet.str * (TALENT.divineStrength.str[this.tal.divineStrength] || 0) * this.cs.apPerStr;
    // Sacred Duty: more Stamina, 10 health each.
    this.maxHealth += Math.round((sheet.sta || 0) * (TALENT.sacredDuty.sta[this.tal.sacredDuty] || 0)) * 10;
    this.health = this.maxHealth;
    this.manaNow = this.maxMana;
    this.manaAt = 0;
    this.fsrEnd = -Infinity;
    this.seal = null;
    this.icd = {};
    Object.assign(this.review, { manaWasted: 0, sealDown: 0, judgementIdle: 0 });
    Object.assign(this.stats, { rage: [], rageGain: {}, rageWaste: {}, rageSpent: {} });
  }

  get resourceName() { return 'Mana'; }
  get power() { return this.mana; }
  get maxPower() { return this.maxMana; }
  get rage() { return this.mana; }
  set rage(v) { this.mana = v; }
  get maxRage() { return this.maxMana; }

  // ---- mana (as the mage's: Spirit outside the five-second rule, mana per 5 always) ----------------------

  regenRates() {
    const spi = (this.c.spi || 0) + this.tempStats().spi;
    const mp5 = ((this.c.mp5 || 0) + this.tempStats().mp5) / 5;
    const spirit = MANA.spiritBase + spi * MANA.perSpirit;
    return { free: mp5 + spirit, casting: mp5 + spirit * (TALENT.reverence.casting[this.tal.reverence] || 0) };
  }
  syncMana() {
    const from = this.manaAt;
    const to = this.t;
    if (to <= from) return;
    const r = this.regenRates();
    const fsr = Math.max(from, Math.min(to, this.fsrEnd));
    const gained = (fsr - from) * r.casting + (to - fsr) * r.free;
    const room = this.maxMana - this.manaNow;
    if (gained > room) { if (this.started) this.review.manaWasted += gained - room; this.manaNow = this.maxMana; } else this.manaNow += gained;
    if (this.started) this.stats.rageGain.Regeneration = (this.stats.rageGain.Regeneration || 0) + gained;
    this.manaAt = to;
  }
  get mana() { this.syncMana(); return this.manaNow; }
  set mana(v) { this.syncMana(); this.manaNow = Math.max(0, Math.min(this.maxMana, v)); }
  gain(amount, source) { this.addMana(amount, source); }
  spend(amount, by) { this.spendMana(amount, by); }
  energize(misc, amount, source) { if (misc === 0) this.addMana(amount, source); }
  addMana(amount, source) {
    const before = this.mana;
    this.mana = before + amount;
    this.stats.rageGain[source] = (this.stats.rageGain[source] || 0) + amount;
    this.emit({ type: 'rage', resource: 'mana', amount, source, total: this.manaNow });
  }
  spendMana(amount, by = 'other') {
    if (amount <= 0) return;
    this.mana -= amount;
    this.fsrEnd = this.t + MANA.fiveSecondRule;
    this.stats.rageSpent[by] = (this.stats.rageSpent[by] || 0) + amount;
  }
  sampleResource() {
    const r = this.stats.rage;
    if (!r.length || this.t - r[r.length - 1][0] >= 0.25) r.push([this.t, this.mana]);
  }

  // ---- stats (core hooks) -------------------------------------------------------------------------------

  ap() {
    let ap = super.ap() + this.strAp;
    if (this.seal === 'sealOfTheCrusader' && this.aura('sealOfTheCrusader')) {
      ap += (ABILITIES.sealOfTheCrusader.ap + (this.hasItem(LIBRAM_OF_FERVOR) ? 48 : 0)) * (1 + (TALENT.improvedSealOfTheCrusader.more[this.tal.improvedSealOfTheCrusader] || 0));
    }
    return ap;
  }
  addCritBonus(crit) { return crit + (TALENT.conviction.critPct[this.tal.conviction] || 0); }
  addHitBonus(hand, hit) { return hit + (TALENT.precision.hitPct[this.tal.precision] || 0); }
  // Seal of the Crusader: 40% faster swings that deal 40% less each.
  applyHasteBonus(h) { return this.aura('sealOfTheCrusader') ? h * ABILITIES.sealOfTheCrusader.speed : h; }
  applyDamageBonus(m) {
    const v = this.aura('vengeance');
    if (v) m *= 1 + (TALENT.vengeance.dmg[this.tal.vengeance] || 0) * v.stacks;
    if (this.c.mh.twoHand) m *= 1 + (TALENT.twohandedWeaponSpecialization.dmg[this.tal.twohandedWeaponSpecialization] || 0);
    else m *= 1 + (TALENT.onehandedWeaponSpecialization.dmg[this.tal.onehandedWeaponSpecialization] || 0);
    return m;
  }
  bonusDefense() { return TALENT.anticipation.defense[this.tal.anticipation] || 0; }
  bonusBlock() { return this.aura('holyShield') ? ABILITIES.holyShield.blockPct : 0; }
  blockValue() { return super.blockValue() * (1 + (TALENT.shieldSpecialization.blockValue[this.tal.shieldSpecialization] || 0)); }
  // Righteous Fury: 90% more threat from Holy damage.
  threatOf(key, amount) {
    if (this.aura('righteousFury') && this.holyKeys.has(key)) amount *= 1 + ABILITIES.righteousFury.holyThreat;
    if (key === 'holyShieldProc') amount *= 1.2;
    return amount;
  }
  get holyKeys() {
    return HOLY_KEYS;
  }

  spellPower() {
    return (this.c.spellPower || 0) + ((this.c.schoolPower || {}).holy || 0) + this.tempStats().spellPower
      + this.int * (TALENT.championOfTheLight.intToSp[this.tal.championOfTheLight] || 0);
  }
  spellCrit(id) {
    let crit = this.baseSpellCrit + this.tempStats().critRating / RATING.crit + this.tempStats().critPct;
    crit += TALENT.holyPower.critPct[this.tal.holyPower] || 0;
    if (id === 'holyShock') crit += TALENT.holyPower.shockCritPct[this.tal.holyPower] || 0;
    return Math.min(1, crit / 100);
  }
  spellHits() {
    const hit = (this.c.spellHitPct || 0) + this.tempStats().hitRating / RATING.hit + (TALENT.precision.hitPct[this.tal.precision] || 0)
      + (TALENT.divinePrecision.hitPct[this.tal.divinePrecision] || 0);
    return this.rng() >= Math.max(0, SPELL_MISS - hit / 100);
  }

  // Holy damage on a target: Judgement of the Crusader's flat bonus, Curse of the Elements, Consecrated Ground.
  holyMult(target) {
    let m = this.damageMult();
    m *= 1 + (this.enc.raid.spellDmgTaken || this.c.raidSpellDmgTaken || 0);
    const own = this.own(target);
    if (this.tal.consecratedGround && own.consecrationEnd > this.t) m *= 1 + TALENT.consecratedGround.holyTaken[this.tal.consecratedGround];
    return m;
  }
  // Yours, else another paladin's from the raid's debuffs.
  crusaderBonus(target) {
    const own = this.own(target);
    const raid = this.c.raidHolyTaken || 0;
    if (!(own.jotcEnd > this.t)) return raid;
    return Math.max(raid, (ABILITIES.sealOfTheCrusader.judge.holyTaken + (this.hasItem(LIBRAM_OF_FERVOR) ? 33 : 0)) * (1 + (TALENT.improvedSealOfTheCrusader.more[this.tal.improvedSealOfTheCrusader] || 0)));
  }

  // A Holy hit that rolls on the melee table (Holy Strike, Seal of Command, the judgements) or crit only (seal procs).
  // Judgement of the Crusader counts as spell power at the spell's coefficient (coef), outside any weapon percent.
  holyMelee(key, name, raw, target, { critOnly = false, bonusCrit = 0, coef = 0 } = {}) {
    let outcome;
    if (critOnly) outcome = this.rng() < Math.max(0, (this.critPct() + bonusCrit) / 100 - this.tables.mh.critSuppression) ? 'crit' : 'hit';
    else outcome = this.rollYellow('mh', target, bonusCrit);
    let dmg = 0;
    if (this.landed(outcome)) {
      dmg = (raw() + coef * this.crusaderBonus(target)) * this.holyMult(target);
      if (outcome === 'crit') dmg *= 2;
    }
    this.record(key, name, dmg, outcome, target.i);
    if (outcome === 'crit') this.onCrit();
    if (this.landed(outcome)) this.refreshJudgements(target);
    // A main-hand special (Holy Strike, a judgement) and Seal of Command's proc: Windfury Totem can proc off it (the
    // sim's 13 Windfury attacks a fight need them: 14 with them, 10.5 without).
    if (this.landed(outcome) && !critOnly) this.maybeWindfury();
    return outcome;
  }

  // A Holy spell: spell hit, spell crit (150%).
  holySpell(id, target) {
    const ab = ABILITIES[id];
    if (!this.spellHits()) { this.record(id, ab.name, 0, 'miss', target.i); return false; }
    let dmg = (ab.base * (1 + (this.rng() - 0.5) * (ab.variance || 0)) + (this.spellPower() + this.crusaderBonus(target)) * ab.coef) * this.holyMult(target);
    const crit = this.rng() < this.spellCrit(id);
    if (crit) dmg *= SPELL_CRIT_MULT;
    this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
    if (crit) this.onCrit();
    return true;
  }

  // ---- swings and seals --------------------------------------------------------------------------------------

  // A white hit landed: the seal on it.
  onWhiteHit(hand, outcome) {
    const target = this.target;
    this.refreshJudgements(target);
    const seal = this.activeSeal();
    if (!seal) return;
    const sp = this.spellPower();
    const spJotc = sp + this.crusaderBonus(target); // the seals' hits take Judgement of the Crusader with the spell power
    if (seal === 'sealOfRighteousness') {
      const w = this.c.mh;
      const hand2 = w.twoHand ? [1.2, 0.12] : [0.85 - 0.2 * Math.max(0, 2 - w.speed), 0.1];
      this.holyMelee('sealOfRighteousnessProc', 'Seal of Righteousness', () => (ABILITIES.sealOfRighteousness.perHit / 100 * w.speed * hand2[0] + hand2[1] * spJotc) * this.improvedSeals(), target, { critOnly: true });
    } else if (seal === 'sealOfCommand') {
      const ab = ABILITIES.sealOfCommand;
      if ((this.icd.soc || 0) > this.t || this.rng() >= ab.ppm * this.c.mh.speed / 60) return;
      this.icd.soc = this.t + ab.icd;
      const more = this.improvedSeals();
      this.holyMelee('sealOfCommandProc', 'Seal of Command', () => (this.weaponDamage('mh', false) + ab.coef * sp) * ab.weapon * more, target, { coef: ab.coef });
    } else if (seal === 'sealOfFury') {
      const ab = ABILITIES.sealOfFury;
      const before = this.meter.sealOfFuryProc ? this.meter.sealOfFuryProc.damage : 0;
      this.holyMelee('sealOfFuryProc', 'Seal of Fury', () => (ab.procBase + ab.procCoef * spJotc) * this.improvedSeals(), target, { critOnly: true });
      // With a shield on, half the Holy damage becomes an absorb shield (the newest replaces the last).
      if (this.c.shield) this.sofShield = (this.meter.sealOfFuryProc.damage - before) * ab.shieldShare;
    }
  }

  // Seal of the Crusader's swings deal 40% less (they come 40% faster).
  deal(key, name, raw, outcome, target, opts = {}) {
    if ((key === 'mh' || key === 'extra') && this.aura('sealOfTheCrusader')) raw /= ABILITIES.sealOfTheCrusader.speed;
    return super.deal(key, name, raw, outcome, target, opts);
  }

  activeSeal() { return this.seal && this.aura(this.seal) ? this.seal : null; }
  hasItem(id) { return (this.c.itemIds || []).includes(id); }
  // Every melee hit that lands (a swing, a strike, a seal's hit) refreshes your judgements on the target.
  refreshJudgements(target) {
    const own = this.own(target);
    if (own.jotcEnd > this.t) own.jotcEnd = this.t + ABILITIES.sealOfTheCrusader.judge.duration;
  }
  improvedSeals() { return 1 + (TALENT.improvedSeals.more[this.tal.improvedSeals] || 0); }

  // Vengeance: each crit adds a stack (3 at most) of more Holy and physical damage.
  onCrit() {
    if (!this.tal.vengeance) return;
    const a = this.aura('vengeance');
    this.setAura('vengeance', TALENT.vengeance.duration, Math.min(TALENT.vengeance.stacks, (a ? a.stacks : 0) + 1));
  }
  afterProcs(outcome) { if (outcome === 'crit') this.onCrit(); }

  // Holy Shield: a block deals Holy damage to the attacker and spends a charge.
  onAvoid(outcome, target) {
    if (outcome !== 'block') return;
    // Shield Specialization: a block can restore 4% of your mana.
    const ss = this.tal.shieldSpecialization;
    if (ss && (this.icd.shieldSpec || 0) <= this.t && this.rng() < TALENT.shieldSpecialization.manaChance[ss]) {
      this.icd.shieldSpec = this.t + TALENT.shieldSpecialization.icd;
      this.addMana(this.maxMana * TALENT.shieldSpecialization.mana, 'Shield Specialization');
    }
    // Reckoning: a block can store an extra attack.
    const rk = this.tal.reckoning;
    if (rk && (this.icd.reckoning || 0) <= this.t && this.rng() < TALENT.reckoning.blockChance[rk]) {
      this.icd.reckoning = this.t + TALENT.reckoning.icd;
      this.reckoningStored = Math.min(TALENT.reckoning.max, (this.reckoningStored || 0) + 1);
    }
    const hs = this.aura('holyShield');
    if (!hs) return;
    const ab = ABILITIES.holyShield;
    if (this.spellHits()) {
      const dmg = (ab.damage + ab.coef * (this.spellPower() + this.crusaderBonus(target))) * this.holyMult(target);
      this.record('holyShieldProc', 'Holy Shield', dmg, 'hit', target.i);
    }
    if (--hs.stacks <= 0) this.dropAura('holyShield');
  }

  // Damage taken: a crit can store a Reckoning attack; the Seal of Fury shield absorbs and (Improved Seal of Fury)
  // gives mana when it breaks.
  suffer(dmg, raw, info) {
    const rk = this.tal.reckoning;
    if (rk && info.outcome === 'crit' && this.rng() < TALENT.reckoning.critChance[rk]) this.reckoningStored = Math.min(TALENT.reckoning.max, (this.reckoningStored || 0) + 1);
    if (this.sofShield > 0 && dmg > 0) {
      const absorbed = Math.min(dmg, this.sofShield);
      this.sofShield -= absorbed;
      dmg -= absorbed;
      if (this.sofShield <= 0 && this.tal.improvedSealOfFury) {
        const T = TALENT.improvedSealOfFury;
        this.addMana(T.mana * (1 + T.perLevel * T.maxLevels), 'Improved Seal of Fury');
      }
    }
    super.suffer(dmg, raw, info);
  }

  // Reckoning: the next main-hand swing spends the stored extra attacks.
  onSwing(outcome, target) {
    super.onSwing(outcome, target);
    const n = this.reckoningStored || 0;
    if (!n || this.spendingReckoning) return;
    this.reckoningStored = 0;
    this.spendingReckoning = true;
    try { for (let k = 0; k < n; k++) this.whiteSwing('mh', 0, true, 'Reckoning'); } finally { this.spendingReckoning = false; }
  }

  // ---- abilities ------------------------------------------------------------------------------------------------

  cooldownBonus(id, cd) {
    if (id === 'judgement') cd -= TALENT.improvedJudgement.cd[this.tal.improvedJudgement] || 0;
    return cd;
  }

  cost(id) {
    const ab = ABILITIES[id];
    if (!ab) return 0;
    let cost = ab.costPct ? ab.costPct * this.cs.base.mana : ab.cost || 0;
    if (id === 'judgement' && this.aura('swiftJudgement')) cost = 0;
    cost *= 1 - (TALENT.benediction.cost[this.tal.benediction] || 0);
    if (id === 'consecration' || id === 'hammerOfWrath' || id === 'exorcism') cost *= 1 - (TALENT.holyConduit.cost[this.tal.holyConduit] || 0);
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
    const d = this.geo.dist[this.primary];
    if (id === 'judgement') {
      if (!this.activeSeal()) return 'You have no seal active';
      if (d > ab.range) return 'Out of range';
    }
    if (ab.melee) {
      if (!this.inMelee()) return 'Out of range';
      if (!this.geo.facing) return 'You are facing the wrong way!';
    }
    if (ab.spell) {
      if (d > ab.range) return 'Out of range';
      if (!this.geo.facing) return 'You are facing the wrong way!';
    }
    if (ab.execute && !this.executePhase()) return "Target's health is above 20%";
    // Exorcism (TargetCreatureType 36): undead and demons only, which the dummies and the Brute are not.
    if (ab.undeadOnly) return 'Exorcism works only on undead and demons';
    if (ab.castTime && this.geo.moving) return "Can't do that while moving";
    if (this.casting) return 'Ability is not ready yet';
    if (this.cdLeft(id) > 0) return 'Ability is not ready yet';
    if (ab.gcd && this.gcdLeft() > 0) return 'Ability is not ready yet';
    if (this.mana < this.cost(id)) return 'Not enough mana';
    return null;
  }

  wouldFail(id) {
    let reason = this.blocker(id);
    if (reason === 'Ability is not ready yet' && this.readyIn(id) <= this.o.queueWindow) reason = null;
    return reason;
  }

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
    return { ok: false, reason };
  }

  cancelQueue() {}
  castResets() { return false; }

  cast(id) {
    const ab = ABILITIES[id];
    if (ab.gcd && this.started) this.gcdEnd = this.t + this.gcdFor(id);
    if (ab.cd) this.cds[id] = this.t + this.cooldownFor(id);
    this.stats.casts.push({ t: this.t, id });
    this.emit({ type: 'cast', id });
    if (ab.item) { this.useItem(id); return; }
    if (ab.castTime) { this.beginCast(id); return; }
    this.completeCast({ id });
  }

  completeCast(c) {
    const id = c.id;
    const ab = ABILITIES[id];
    const target = this.target;
    this.spendMana(this.cost(id), id);
    if (ab.seal) {
      for (const s of SEALS) if (s !== id) this.dropAura(s);
      this.seal = id;
      this.setAura(id, SEAL_DURATION);
      return;
    }
    switch (id) {
      case 'judgement': this.judge(target); break;
      case 'swiftJudgement': this.cds.judgement = 0; this.setAura('swiftJudgement', Infinity); break;
      case 'holyStrike': {
        const bonusCrit = TALENT.holyPower.shockCritPct[this.tal.holyPower] || 0;
        const more = this.tal.sacredArbiter ? 1 + TALENT.sacredArbiter.holyStrike : 1;
        const o = this.holyMelee(id, ab.name, () => (ab.base * (1 + (this.rng() - 0.5) * ab.variance) + this.weaponDamage('mh', true) + ab.coef * this.spellPower()) * ab.weapon * more, target, { bonusCrit, coef: ab.coef });
        this.afterMelee(o, target);
        break;
      }
      case 'consecration': this.consecrate(); break;
      case 'holyShock': case 'exorcism': case 'hammerOfWrath': this.holySpell(id, target); break;
      case 'holyShield': this.setAura('holyShield', ab.duration, ab.charges); break;
      case 'righteousFury': this.setAura('righteousFury', ab.duration); break;
      case 'racial': {
        const r = this.racial.active;
        this.cds.racial = this.t + r.cd;
        this.setAura('racial', r.duration, 0, { name: r.name, icon: r.icon });
        break;
      }
      default: break;
    }
  }

  // Judgement: the seal's judgement on the target; the seal stays.
  judge(target) {
    const seal = this.activeSeal();
    const ab = ABILITIES[seal];
    const j = ab.judge;
    this.dropAura('swiftJudgement');
    // Sanctified Judgement: a chance to get part of the seal's mana back.
    const sj = this.tal.sanctifiedJudgement;
    // wowsims: base cost x (2 - the cost modifier) x the refund share.
    const costMod = 1 - (TALENT.benediction.cost[this.tal.benediction] || 0);
    if (sj && this.rng() < TALENT.sanctifiedJudgement.chance[sj]) this.addMana(ab.cost * (2 - costMod) * TALENT.sanctifiedJudgement.refund[sj], 'Sanctified Judgement');
    if (seal === 'sealOfTheCrusader') {
      const own = this.own(target);
      own.jotcEnd = this.t + j.duration;
      this.emit({ type: 'judgement', target: target.i, debuff: 'crusader' });
      return;
    }
    // Improved Seals; Libram of Law: +4% Judgement of Righteousness and of Fury.
    let more = this.improvedSeals();
    if ((seal === 'sealOfRighteousness' || seal === 'sealOfFury') && this.hasItem(LIBRAM_OF_LAW)) more *= 1.04;
    const outcome = this.holyMelee(j.key, j.name, () => (j.base * (1 + (this.rng() - 0.5) * j.variance) + j.coef * this.spellPower()) * more, target, { coef: j.coef });
    if (j.taunt && this.landed(outcome) && this.o.tank) this.taunt(target.i);
  }

  // Consecration: 8 ticks a second apart on the targets within 8 yards; the main target takes the marked tick.
  consecrate() {
    const ab = ABILITIES.consecration;
    const token = Symbol('consecration');
    this.consecration = token;
    for (const t of this.targets) this.own(t).consecrationEnd = this.t + ab.ticks + 0.6;
    for (let k = 1; k <= ab.ticks; k++) {
      this.schedule(this.t + k, () => {
        if (this.consecration !== token) return;
        for (const t of this.targets) {
          if (t.dead || this.geo.dist[t.i] > ab.range + 5) continue;
          let dmg = ab.tick + (t.i === this.primary ? ab.markTick + ab.coef * (this.spellPower() + this.crusaderBonus(t)) : 0);
          dmg *= this.holyMult(t);
          const crit = this.rng() < this.spellCrit('consecration');
          if (crit) dmg *= SPELL_CRIT_MULT;
          this.record('consecration', ab.name, dmg, crit ? 'crit' : 'hit', t.i);
          if (crit) this.onCrit();
        }
      });
    }
  }

  // ---- the pull, the review -----------------------------------------------------------------------------------

  onStart() { this.manaAt = this.t; }

  trackReview(newT) {
    if (newT <= this.t || !this.started) return;
    if (!this.activeSeal()) this.review.sealDown += newT - this.t;
    else if (this.cdLeft('judgement') <= 0) this.review.judgementIdle += newT - this.t;
  }
}

// Meter keys whose damage is Holy (Righteous Fury raises their threat).
const HOLY_KEYS = new Set(['sealOfRighteousnessProc', 'sealOfCommandProc', 'sealOfFuryProc', 'judgementOfRighteousness', 'judgementOfCommand',
  'judgementOfFury', 'holyStrike', 'consecration', 'holyShock', 'exorcism', 'hammerOfWrath', 'holyShieldProc']);
