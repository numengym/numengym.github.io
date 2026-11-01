// The paladin on top of the core unit (engine/unit.js): white swings with a seal on them, mana with the five-second
// rule, Judgement, and the Holy spells. Formulas follow wowsims/forever sim/paladin/*.go, on the talent tree of hotfix
// push 113554 (wowsims PR 772): Unsealed Wrath's Echoes, Swift Judgement as a second Judgement, Conviction on every
// spell and attack, Two-Handed Weapon Specialization on physical (and melee-defense Holy) damage with less threat,
// Righteous Fury's 33% on all threat, Shieldsworn, Iron Creed, and for a Holy paladin's heals (classes/healer.js)
// Holy Power's crit healing, Oath of Light, Boundless Light, Light's Vigil, Healing Light and Divine Favor.
import { ABILITIES, AURAS, PALADIN_AURAS, SEALS, SEAL_DURATION, SPELL_MISS, TALENT, UNSEALED_WRATH, parseTalents } from '../../data/paladin.js';
import { MANA } from '../../data/class-stats.js';
import { RATING } from '../../data/warrior.js';
import { Unit } from '../../engine/unit.js';

const LIBRAM_OF_LAW = 272435;     // +4% Judgement of Righteousness and of Fury
const LIBRAM_OF_FERVOR = 23203;   // +48 Seal of the Crusader attack power, +33 Judgement of the Crusader
const PREPULL = new Set(['righteousFury', 'sealOfRighteousness', 'sealOfCommand', 'sealOfTheCrusader', 'sealOfFury', 'holyShield', ...PALADIN_AURAS]);
const SPELL_CRIT_MULT = 1.5;
// The Echo of each seal Unsealed Wrath stores (Seal of the Crusader has none).
const ECHO_OF = UNSEALED_WRATH.echoes;
// Divine Favor's charge: spent by the next of these (the row's class mask: Holy Shock, Holy Light, Flash of Light).
const DIVINE_FAVOR_SPELLS = new Set(['holyShock', 'holyShockHeal', 'holyLight', 'flashOfLight']);
// Healing Light (20237) and Holy Power (5923) reach these heals.
const LIGHT_HEALS = new Set(['holyLight', 'flashOfLight', 'holyShockHeal']);

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
  // Conviction (20117, A_MOD_CRIT_PCT with a weapon on): crit with every spell and attack.
  convictionCrit() { return TALENT.conviction.critPct[this.tal.conviction] || 0; }
  addCritBonus(crit) { return crit + this.convictionCrit(); }
  addHitBonus(hand, hit) { return hit + (TALENT.precision.hitPct[this.tal.precision] || 0); }
  // Seal of the Crusader: 40% faster swings that deal 40% less each.
  applyHasteBonus(h) { return this.aura('sealOfTheCrusader') ? h * ABILITIES.sealOfTheCrusader.speed : h; }
  bonusArmor() { return this.aura('devotionAura') ? ABILITIES.devotionAura.armor : 0; }
  // Concentration Aura, and Spiritual Focus (20205: 14-70%) for Holy Light and Flash of Light.
  pushbackResist(c) {
    const aura = this.aura('concentrationAura') ? ABILITIES.concentrationAura.pushback / 100 : 0;
    const focus = c && (c.id === 'holyLight' || c.id === 'flashOfLight') ? TALENT.spiritualFocus.pushback[this.tal.spiritualFocus] || 0 : 0;
    return aura + focus;
  }
  resistance(school) {
    const a = PALADIN_AURAS.find((id) => ABILITIES[id].resist === school && this.aura(id));
    return a ? ABILITIES[a].amount : 0;
  }
  // Two-Handed Weapon Specialization (20111) with a two-hander: A_MOD_DAMAGE_PERCENT_DONE on physical damage, a melee
  // weapon row, so the parser also puts it on the melee-defense spells of the other schools (parse_effects_table.go):
  // the seals' Holy hits, the judgements and Holy Strike. The Holy spells (Holy Shock, Exorcism, Consecration...) miss it.
  twoHandMult() { return this.c.mh.twoHand ? 1 + (TALENT.twohandedWeaponSpecialization.dmg[this.tal.twohandedWeaponSpecialization] || 0) : 1; }
  // Vengeance (Holy and physical), and the two-hander's bonus (a physical hit's; holyMult takes it off the spells).
  applyDamageBonus(m) {
    const v = this.aura('vengeance');
    if (v) m *= 1 + (TALENT.vengeance.dmg[this.tal.vengeance] || 0) * v.stacks;
    return m * this.twoHandMult();
  }
  bonusDefense() { return TALENT.anticipation.defense[this.tal.anticipation] || 0; }
  bonusBlock() {
    return (this.aura('holyShield') ? ABILITIES.holyShield.blockPct : 0) + (this.aura('redoubt') ? TALENT.redoubt.block[this.tal.redoubt] || 0 : 0);
  }
  blockValue() { return super.blockValue() * (1 + (TALENT.shieldSpecialization.blockValue[this.tal.shieldSpecialization] || 0)); }
  // Improved Righteous Fury (with Righteous Fury up) and Iron Creed's 6 sec after a Holy Strike: less damage taken.
  damageTakenMult() {
    let m = 1;
    if (this.aura('righteousFury')) m *= 1 - (TALENT.improvedRighteousFury.taken[this.tal.improvedRighteousFury] || 0);
    if (this.aura('ironCreed')) m *= 1 - (TALENT.ironCreed.taken[this.tal.ironCreed] || 0);
    return m;
  }
  // Righteous Fury (25780, effects 1 and 5): 90% more threat from Holy damage (the school's threat multiplier) and 33%
  // more from everything; Holy Shield's damage 20% more (its ThreatMultiplier); Iron Creed: Holy Strike's threat.
  threatOf(key, amount) {
    if (this.aura('righteousFury') && this.holyKeys.has(key)) amount *= 1 + ABILITIES.righteousFury.holyThreat;
    if (key === 'holyShieldProc') amount *= 1.2;
    if (key === 'holyStrike') amount *= 1 + (TALENT.ironCreed.holyStrikeThreat[this.tal.ironCreed] || 0);
    return amount;
  }
  // All threat: Righteous Fury's 33%, and Two-Handed Weapon Specialization's 7/14/20% less with a two-hander.
  threatMult() {
    let m = this.aura('righteousFury') ? 1 + ABILITIES.righteousFury.allThreat : 1;
    if (this.c.mh.twoHand) m *= 1 - (TALENT.twohandedWeaponSpecialization.threat[this.tal.twohandedWeaponSpecialization] || 0);
    return m;
  }
  get holyKeys() {
    return HOLY_KEYS;
  }

  spellPower() {
    return (this.c.spellPower || 0) + ((this.c.schoolPower || {}).holy || 0) + this.tempStats().spellPower
      + this.int * (TALENT.championOfTheLight.intToSp[this.tal.championOfTheLight] || 0);
  }
  // Spell crit: Intellect and gear, and Conviction (Holy Power gives crit healing now, not crit).
  spellCrit() {
    const crit = this.baseSpellCrit + this.tempStats().critRating / RATING.crit + this.tempStats().critPct + this.convictionCrit();
    return Math.min(1, crit / 100);
  }
  spellHits() {
    const hit = (this.c.spellHitPct || 0) + this.tempStats().hitRating / RATING.hit + (TALENT.precision.hitPct[this.tal.precision] || 0)
      + (TALENT.divinePrecision.hitPct[this.tal.divinePrecision] || 0);
    return this.rng() >= Math.max(0, SPELL_MISS - hit / 100);
  }

  // Holy damage on a target: Judgement of the Crusader's flat bonus, Curse of the Elements, Consecrated Ground.
  // melee: a melee-defense Holy hit (the seals, the judgements, Holy Strike), which keeps Two-Handed Weapon
  // Specialization's bonus; the spells lose it.
  holyMult(target, melee = false) {
    let m = this.damageMult();
    if (!melee) m /= this.twoHandMult();
    m *= (1 + (this.enc.raid.spellDmgTaken || this.c.raidSpellDmgTaken || 0)) * this.spellVulnMult(target);
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
      dmg = (raw() + coef * this.crusaderBonus(target)) * this.holyMult(target, true);
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

  // A Holy spell: spell hit, spell crit (150%). Divine Favor's charge makes Holy Shock a crit; the cast spends it
  // whether or not it lands (divine_favor.go).
  holySpell(id, target) {
    const ab = ABILITIES[id];
    const favor = DIVINE_FAVOR_SPELLS.has(id) && this.aura('divineFavor');
    if (favor) this.dropAura('divineFavor');
    if (!this.spellHits()) { this.record(id, ab.name, 0, 'miss', target.i); return false; }
    let dmg = (ab.base * (1 + (this.rng() - 0.5) * (ab.variance || 0)) + (this.spellPower() + this.crusaderBonus(target)) * ab.coef) * this.holyMult(target);
    const crit = favor || this.rng() < this.spellCrit(id);
    if (crit) dmg *= SPELL_CRIT_MULT;
    this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
    if (crit) this.onCrit();
    if (crit && id === 'holyShock') this.infuse();
    return true;
  }

  // Infusion of Light: a Holy Shock (damage or heal) or Flash of Light crit; the next Holy Light is faster.
  infuse() {
    if (this.tal.infusionOfLight) this.setAura('infusionOfLight', TALENT.infusionOfLight.duration);
  }

  // ---- swings and seals --------------------------------------------------------------------------------------

  // A white hit landed: the seal on it, then Unsealed Wrath.
  onWhiteHit() {
    const target = this.target;
    this.refreshJudgements(target);
    const seal = this.activeSeal();
    if (!seal) return;
    this.sealHit(seal, target);
    if (this.tal.unsealedWrath) this.unsealedWrath(seal, target);
  }

  // Unsealed Wrath (talents_retribution.go applyUnsealedWrath, one pass over the Echoes): the active seal's Echo gains
  // a stack (3 at most, 15 sec), and every other Echo up is spent, each stack giving its seal's effect once more. wowsims
  // replays the copies a batch window after the hit; here they land with it.
  unsealedWrath(seal, target) {
    for (const [s, echo] of Object.entries(ECHO_OF)) {
      const a = this.aura(echo);
      if (s === seal) {
        this.setAura(echo, UNSEALED_WRATH.duration, Math.min(UNSEALED_WRATH.stacks, (a ? a.stacks : 0) + 1));
        continue;
      }
      if (!a) continue;
      const n = a.stacks;
      this.dropAura(echo);
      for (let k = 0; k < n; k++) this.sealHit(s, target, true);
    }
  }

  // One seal's effect on a white hit; echo: a copy Unsealed Wrath spends.
  sealHit(seal, target, echo = false) {
    const sp = this.spellPower();
    const spJotc = sp + this.crusaderBonus(target); // the seals' hits take Judgement of the Crusader with the spell power
    if (seal === 'sealOfRighteousness') {
      const w = this.c.mh;
      const hand2 = w.twoHand ? [1.2, 0.12] : [0.85 - 0.2 * Math.max(0, 2 - w.speed), 0.1];
      this.holyMelee('sealOfRighteousnessProc', 'Seal of Righteousness', () => (ABILITIES.sealOfRighteousness.perHit / 100 * w.speed * hand2[0] + hand2[1] * spJotc) * this.improvedSeals(), target, { critOnly: true });
    } else if (seal === 'sealOfCommand') {
      // 7 PPM with a 1 sec ICD; an Echo's copy rolls the same chance but neither checks nor starts the ICD
      // (seal_of_command.go).
      const ab = ABILITIES.sealOfCommand;
      if (!echo && (this.icd.soc || 0) > this.t) return;
      if (this.rng() >= ab.ppm * this.c.mh.speed / 60) return;
      if (!echo) this.icd.soc = this.t + ab.icd;
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

  // Retribution Aura: each swing that lands on you (a block too) deals Holy damage back; it does not miss or crit.
  // Redoubt (20127): a block spends one of its charges, and each swing that lands has a 10% chance to put it up (again)
  // with all 5.
  onStruck(outcome, target) {
    this.redoubt(outcome);
    if (!this.aura('retributionAura') || target.dead) return;
    const ab = ABILITIES.retributionAura;
    this.record('retributionAura', ab.name, (ab.damage + ab.coef * this.spellPower()) * this.holyMult(target), 'hit', target.i);
  }

  redoubt(outcome) {
    const rd = this.tal.redoubt;
    if (!rd) return;
    const a = this.aura('redoubt');
    if (a && outcome === 'block' && --a.stacks <= 0) this.dropAura('redoubt');
    if (this.rng() < TALENT.redoubt.chance) this.setAura('redoubt', TALENT.redoubt.duration, TALENT.redoubt.charges);
  }

  // Shield Specialization (20150): a block (or a Shieldsworn Holy Strike, without the cooldown) can restore 4% of your mana.
  shieldSpecMana(icd = true) {
    const ss = this.tal.shieldSpecialization;
    if (!ss || (icd && (this.icd.shieldSpec || 0) > this.t) || this.rng() >= TALENT.shieldSpecialization.manaChance[ss]) return;
    if (icd) this.icd.shieldSpec = this.t + TALENT.shieldSpecialization.icd;
    this.addMana(this.maxMana * TALENT.shieldSpecialization.mana, 'Shield Specialization');
  }
  // Holy Shield's Holy damage on the attacker (a block, or a Shieldsworn Holy Strike).
  holyShieldHit(target) {
    const ab = ABILITIES.holyShield;
    if (!this.spellHits()) return;
    const dmg = (ab.damage + ab.coef * (this.spellPower() + this.crusaderBonus(target))) * this.holyMult(target);
    this.record('holyShieldProc', 'Holy Shield', dmg, 'hit', target.i);
  }

  // Holy Shield: a block deals Holy damage to the attacker and spends a charge.
  onAvoid(outcome, target) {
    if (outcome !== 'block') return;
    this.shieldSpecMana();
    // Reckoning: a block can store an extra attack.
    const rk = this.tal.reckoning;
    if (rk && (this.icd.reckoning || 0) <= this.t && this.rng() < TALENT.reckoning.blockChance[rk]) {
      this.icd.reckoning = this.t + TALENT.reckoning.icd;
      this.reckoningStored = Math.min(TALENT.reckoning.max, (this.reckoningStored || 0) + 1);
    }
    const hs = this.aura('holyShield');
    if (!hs) return;
    this.holyShieldHit(target);
    if (--hs.stacks <= 0) this.dropAura('holyShield');
  }

  // Damage taken: a crit can store a Reckoning attack; the Seal of Fury shield absorbs.
  suffer(dmg, raw, info) {
    const rk = this.tal.reckoning;
    if (rk && info.outcome === 'crit' && this.rng() < TALENT.reckoning.critChance[rk]) this.reckoningStored = Math.min(TALENT.reckoning.max, (this.reckoningStored || 0) + 1);
    if (this.sofShield > 0 && dmg > 0) {
      const absorbed = Math.min(dmg, this.sofShield);
      this.sofShield -= absorbed;
      dmg -= absorbed;
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

  // Improved Judgement; Shieldsworn (Holy Strike 4 sec); Purifying Power (Exorcism and Holy Wrath 17/33% shorter).
  cooldownBonus(id, cd) {
    if (id === 'judgement') cd -= TALENT.improvedJudgement.cd[this.tal.improvedJudgement] || 0;
    if (id === 'holyStrike' && this.tal.shieldsworn) cd -= TALENT.shieldsworn.holyStrikeCd;
    if (id === 'exorcism' || id === 'holyWrath') cd *= 1 - (TALENT.purifyingPower.cd[this.tal.purifyingPower] || 0);
    return cd;
  }
  // Champion of the Light: Hammer of Wrath's cast 0.2 sec shorter a rank (instant at 5/5); Infusion of Light: Holy
  // Light's 0.5/1 sec shorter.
  castTimeBonus(id) {
    if (id === 'hammerOfWrath') return TALENT.championOfTheLight.hammerCast[this.tal.championOfTheLight] || 0;
    if (id === 'holyLight' && this.aura('infusionOfLight')) return TALENT.infusionOfLight.cast[this.tal.infusionOfLight] || 0;
    return 0;
  }

  cost(id) {
    const ab = ABILITIES[id];
    if (!ab) return 0;
    let cost = ab.costPct ? ab.costPct * this.cs.base.mana : ab.cost || 0;
    cost *= 1 - (TALENT.benediction.cost[this.tal.benediction] || 0);
    if (id === 'consecration' || id === 'hammerOfWrath' || id === 'exorcism' || id === 'holyWrath') cost *= 1 - (TALENT.holyConduit.cost[this.tal.holyConduit] || 0);
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
    if (id === 'judgement' || id === 'swiftJudgement') {
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
    // Exorcism and Holy Wrath (TargetCreatureType 36): undead and demons only, which the dummies and the bosses are not.
    if (ab.undeadOnly) return `${ab.name} works only on undead and demons`;
    if (ab.paladinAura && this.aura(id)) return 'Already active';
    if (this.castTime(id) > 0 && this.geo.moving) return "Can't do that while moving";
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
    const ab = this.A[id]; // the fight's table: a Holy paladin's has its heals too
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
    if (this.castTime(id) > 0) { this.beginCast(id); return; }
    this.completeCast({ id });
  }

  completeCast(c) {
    const id = c.id;
    const ab = ABILITIES[id];
    const target = this.target;
    this.spendMana(this.cost(id), id);
    if (ab.seal) {
      // One seal at a time (the seal category); Unsealed Wrath's Echoes are stored and spent by the swings, not here.
      for (const s of SEALS) if (s !== id) this.dropAura(s);
      this.seal = id;
      this.setAura(id, SEAL_DURATION);
      return;
    }
    switch (id) {
      // Judgement and Swift Judgement unleash the same judgement, each on its own cooldown (judgementConfig).
      case 'judgement': case 'swiftJudgement': this.judge(target); break;
      case 'divineFavor': this.setAura('divineFavor', Infinity, 1); break;
      case 'holyStrike': {
        const more = this.tal.sacredArbiter ? 1 + TALENT.sacredArbiter.holyStrike : 1;
        const o = this.holyMelee(id, ab.name, () => (ab.base * (1 + (this.rng() - 0.5) * ab.variance) + this.weaponDamage('mh', true) + ab.coef * this.spellPower()) * ab.weapon * more, target, { coef: ab.coef });
        this.afterMelee(o, target);
        // Iron Creed: a Holy Strike with Righteous Fury up, whatever its outcome, cuts damage taken for 6 sec.
        if (this.tal.ironCreed && this.aura('righteousFury')) this.setAura('ironCreed', TALENT.ironCreed.duration);
        // Shieldsworn: a Holy Strike that lands with a shield on strikes with it: Holy Shield's damage (no charge
        // spent) and Shield Specialization's mana roll (no cooldown). Its spell block (1328551) changes nothing against
        // the trainer's physical swings.
        if (this.tal.shieldsworn && this.c.shield && this.landed(o)) {
          if (this.aura('holyShield')) this.holyShieldHit(target);
          this.shieldSpecMana(false);
        }
        break;
      }
      case 'consecration': this.consecrate(); break;
      case 'holyShock': case 'exorcism': case 'hammerOfWrath': this.holySpell(id, target); break;
      case 'holyShield': this.setAura('holyShield', ab.duration, ab.charges); break;
      case 'righteousFury': this.setAura('righteousFury', ab.duration); break;
      case 'retributionAura': case 'devotionAura': case 'concentrationAura':
      case 'shadowResistanceAura': case 'frostResistanceAura': case 'fireResistanceAura':
        // One aura at a time: the new one takes the old one's place.
        for (const other of PALADIN_AURAS) if (other !== id) this.dropAura(other);
        this.setAura(id, Infinity);
        break;
      case 'racial': {
        const r = this.racial.active;
        this.cds.racial = this.t + r.cd;
        this.setAura('racial', r.duration, 0, { name: r.name, icon: r.icon });
        break;
      }
      default: break;
    }
  }

  // Judgement (and Swift Judgement): the seal's judgement on the target; the seal stays.
  judge(target) {
    const seal = this.activeSeal();
    const ab = ABILITIES[seal];
    const j = ab.judge;
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

  // ---- a Holy paladin's heals (classes/healer.js asks through healMods and beforeHeal) ------------------------------

  // What a heal on raid member u gets from the talents: Oath of Light's flat bonus on its ally (oath_of_light.go: Holy
  // Light 6.667, Flash of Light 1.917, Holy Shock 3.833 a level, so 400 / 115 / 230 at 60), Boundless Light's crit on
  // Holy Shock's heal for an ally without it, Healing Light, Holy Power's crit healing (5923: the whole critical heal
  // times 1 + 10-50%), and Divine Favor's charge (spent by the cast).
  healMods(id, h, u) {
    if (!LIGHT_HEALS.has(id)) return null;
    const oath = !!(u && u.hots.oathOfLight && u.hots.oathOfLight.end > this.t);
    const flat = oath ? { holyLight: 400, flashOfLight: 115, holyShockHeal: 230 }[id] : 0;
    const critPct = id === 'holyShockHeal' && !oath ? TALENT.boundlessLight.critPct[this.tal.boundlessLight] || 0 : 0;
    const favor = DIVINE_FAVOR_SPELLS.has(id) && !!this.aura('divineFavor');
    if (favor) this.dropAura('divineFavor');
    // The Holy Light that Infusion of Light sped up spends it.
    if (id === 'holyLight') this.dropAura('infusionOfLight');
    return {
      flat, critPct, forceCrit: favor,
      mult: 1 + (TALENT.healingLight.heal[this.tal.healingLight] || 0),
      critMult: 1 + (TALENT.holyPower.critHeal[this.tal.holyPower] || 0),
    };
  }
  // A critical heal (classes/healer.js): Illumination gives back half the heal's base cost (Light's Vigil's party heal
  // costs nothing), and a Holy Shock or Flash of Light crit infuses the next Holy Light.
  onHealCrit(id, h) {
    if (!LIGHT_HEALS.has(id)) return;
    const il = this.tal.illumination;
    if (il && this.rng() < TALENT.illumination.chance[il]) this.addMana(h.cost * TALENT.illumination.refund, 'Illumination');
    if (id !== 'holyLight') this.infuse();
  }
  // Light's Vigil (lights_vigil.go consumeLightsVigil): a Holy Shock heal on its ally takes it off, resets Holy Shock's
  // cooldown and heals the ally's party (704 +/- 2.8% + 14.3% of healing power each, Holy Power's crit healing too).
  beforeHeal(id, h, u) {
    if (id !== 'holyShockHeal' || !(u.hots.lightsVigil && u.hots.lightsVigil.end > this.t)) return;
    delete u.hots.lightsVigil;
    this.cds.holyShock = this.t;
    const vigil = this.A.lightsVigil;
    const mods = { critMult: 1 + (TALENT.holyPower.critHeal[this.tal.holyPower] || 0) };
    for (const m of this.raid.groupOf(u)) if (!this.raid.isDead(m)) this.landHeal('lightsVigilHeal', { ...vigil, name: 'Light\'s Vigil (heal)' }, m, this.rollHeal(vigil.vigil, mods));
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
  'judgementOfFury', 'holyStrike', 'consecration', 'holyShock', 'exorcism', 'hammerOfWrath', 'holyShieldProc', 'retributionAura', 'holyWrath']);
