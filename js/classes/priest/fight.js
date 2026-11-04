// The Shadow Priest on the shared caster (classes/caster.js: mana with the five-second rule, casts and channels): spell
// hit and crit against a level 63 boss, Shadow Word: Pain and Devouring Plague ticking on the target, Mind Flay's
// channel, Shadowform, Inner Focus, Shadow Weaving and Dark Inspiration; for the Smite build Smite, Holy Fire, Penance's
// bolts and Power Infusion. Formulas follow wowsims/forever sim/priest/*.go.
import { ABILITIES, AURAS, POWER_IN_LIGHT, REVELATION, SPELL_CRIT_BONUS, SPELL_MISS, TALENT, TWIN_DISCIPLINES, parseTalents } from '../../data/priest.js';
import { MANA } from '../../data/class-stats.js';
import { RATING } from '../../data/warrior.js';
import { CasterFight } from '../caster.js';
import { RACES } from '../../data/warrior.js';

// Twilight Focus (wowsims/forever 14913): a priest's spells are pushed back 23/47/70% less. Martyrdom (14531): a crit
// taken gives Focused Casting (50/100% of the time), no pushback for 6 sec.
const TWILIGHT_FOCUS = [0, 0.23, 0.47, 0.7];
const MARTYRDOM = [0, 0.5, 1];
// The class masks of the Holy talents, on the heals (js/data/healing.js).
const IMPROVED_HEALING = new Set(['heal', 'greaterHeal', 'prayerOfMending']);
const AGILE_HEALS = new Set(['renew', 'powerWordShield', 'dispelMagic', 'abolishDisease', 'prayerOfMending']);
const LITANY_HEALS = new Set(['flashHeal', 'heal', 'greaterHeal', 'renew', 'prayerOfHealing', 'prayerOfMending']);
const SPIRITUAL_DIRECT = new Set(['flashHeal', 'heal', 'greaterHeal', 'prayerOfHealing', 'prayerOfMending']);
const HOLY_REACH = new Set(['smite', 'smiteR5', 'holyFire', 'holyFireR5']);

export class PriestFight extends CasterFight {
  pushbackResist() { return TWILIGHT_FOCUS[this.tal.twilightFocus || 0] || 0; }
  onDamageTaken(raw, dmg, outcome) {
    super.onDamageTaken(raw, dmg, outcome);
    if (outcome === 'crit' && this.rng() < (MARTYRDOM[this.tal.martyrdom || 0] || 0)) {
      this.setAura('focusedCasting', 6, 0, { name: 'Focused Casting', icon: 'spell_arcane_blink' });
    }
  }
  static ABILITIES = ABILITIES;
  static AURA_NAMES = Object.fromEntries(Object.entries(AURAS).map(([id, a]) => [id, a.name]));
  static PREPULL = new Set(['shadowform', 'innerFocus', 'powerInfusion', 'shadowguard', 'touchOfWeakness']);

  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    this.tal = parseTalents(sheet.talents);
    // Gnome Eureka! for priests (1259823): less mana and more damage on the priest's spells for a while.
    const r = this.racial.active;
    if (r && r.abilities) this.racial = { ...this.racial, active: { ...r, spellId: 1259823, abilities: Object.keys(ABILITIES).filter((k) => ABILITIES[k].spell) } };
    // Mental Strength raises Intellect: more mana and spell crit.
    this.initMana(sheet.int * (TALENT.mentalStrength.int[this.tal.mentalStrength] || 0), this.racial.maxRageMult || 1);
    this.initRevelation(REVELATION.spells);
    // Shadowform is up from the start (wowsims preShadowform).
    if (this.tal.shadowform) this.setAura('shadowform', Infinity);
  }

  // ---- mana ---------------------------------------------------------------------------------------

  // Dark Inspiration raises Spirit, so the regeneration.
  spirit() {
    const spi = (this.c.spi || 0) + this.tempStats().spi;
    return this.aura('darkInspiration') ? spi * (1 + (TALENT.darkInspiration.spi[this.tal.darkInspiration] || 0)) : spi;
  }
  spiritRegen() { return MANA.spiritBase + this.spirit() * MANA.perSpirit; }
  castingShare() { return TALENT.meditation.casting[this.tal.meditation] || 0; }
  regenAura(id) { return id === 'darkInspiration'; }

  // ---- spell stats -----------------------------------------------------------------------------------

  spellPower(school) {
    return (this.c.spellPower || 0) + ((this.c.schoolPower || {})[school] || 0) + this.tempStats().spellPower
      + (TALENT.spiritualGuidance.dmg[this.tal.spiritualGuidance] || 0) * this.spirit();
  }

  hitChance(school) {
    let hit = (this.c.spellHitPct || 0) + this.tempStats().hitRating / RATING.hit;
    if (school === 'shadow') hit += TALENT.shadowFocus.hitPct[this.tal.shadowFocus] || 0;
    if (school === 'holy') hit += TALENT.holyPrecision.hitPct[this.tal.holyPrecision] || 0;
    return 1 - Math.max(0, SPELL_MISS - hit / 100);
  }

  // Crit: a direct spell under Inner Focus crits 25% more; Shadow Word: Death more on a low target (Early Demise); Holy
  // spells more with Holy Specialization.
  critChance(id, { focus = false, periodic = false } = {}) {
    let crit = this.baseCritPct + this.tempStats().critRating / RATING.crit + this.tempStats().critPct;
    crit += this.tempStats().int * this.cs.critPerInt * (this.c.statMult || 1);
    if (focus && !periodic) crit += ABILITIES.innerFocus.critPct;
    if (ABILITIES[id].school === 'holy') crit += TALENT.holySpecialization.critPct[this.tal.holySpecialization] || 0;
    const ed = this.tal.earlyDemise;
    if (id === 'shadowWordDeath' && ed && this.started && this.healthPct() <= TALENT.earlyDemise.health[ed]) crit += TALENT.earlyDemise.critPct[ed];
    const r = this.racialActive();
    if (r && r.critPct) crit += r.critPct;
    return Math.min(1, crit / 100);
  }

  // Shadowform doubles the crit bonus of Shadow spells (200%).
  critMult(school) {
    const form = school === 'shadow' && this.aura('shadowform') ? ABILITIES.shadowform.critBonusMult : 1;
    return 1 + SPELL_CRIT_BONUS * form;
  }

  // Your damage multipliers: Shadowform, Darkness, Searing Light, Power Infusion, Twin Disciplines, the racial.
  casterMult(id, school) {
    let m = this.damageMult(); // item buffs
    if (school === 'shadow') {
      if (this.aura('shadowform')) m *= 1 + ABILITIES.shadowform.dmg;
      m *= 1 + (TALENT.darkness.dmg[this.tal.darkness] || 0);
    }
    if (school === 'holy') m *= 1 + (TALENT.searingLight.dmg[this.tal.searingLight] || 0);
    if (this.aura('powerInfusion')) m *= 1 + ABILITIES.powerInfusion.dmg;
    if (TWIN_DISCIPLINES.has(id)) m *= 1 + (TALENT.twinDisciplines.dmg[this.tal.twinDisciplines] || 0);
    const r = this.racialActive();
    if (r && r.damagePct && r.abilities && r.abilities.includes(id)) m *= 1 + r.damagePct / 100;
    return m;
  }
  // The target's: your Shadow Weaving, Power in Light (your Holy Fire or Shadow Word: Pain on it), Curse of the Elements.
  targetMult(id, school, target) {
    let m = 1;
    const own = this.own(target);
    if (school === 'shadow' && own.swEnd > this.t) m *= 1 + TALENT.shadowWeaving.perStack * own.sw;
    if (POWER_IN_LIGHT.has(id) && [own.holyFireEnd, own.holyFireR5End, own.shadowWordPainEnd].some((end) => end > this.t)) m *= 1 + (TALENT.powerInLight.dmg[this.tal.powerInLight] || 0);
    return m * (1 + (this.enc.raid.spellDmgTaken || this.c.raidSpellDmgTaken || 0)) * this.spellVulnMult(target);
  }
  spellMult(id, school, target) { return this.casterMult(id, school) * this.targetMult(id, school, target); }

  // A hit's or tick's damage from its raw amount (base plus spell power): Judgement of the Crusader on the target adds
  // Holy damage taken at the spell's coefficient, after your multipliers and before the target's.
  damageOf(id, raw, coef, target) {
    const school = ABILITIES[id].school;
    const crusader = school === 'holy' ? (this.c.raidHolyTaken || 0) * coef : 0;
    return (raw * this.casterMult(id, school) + crusader) * this.targetMult(id, school, target);
  }

  // ---- casting -------------------------------------------------------------------------------------------

  cooldownBonus(id, cd) {
    if (id === 'mindBlast') cd -= TALENT.improvedMindBlast.cd[this.tal.improvedMindBlast] || 0;
    return cd;
  }

  // Divine Fury: Smite and Holy Fire cast faster.
  castTime(id) {
    const ab = ABILITIES[id];
    if (!ab || !ab.castTime) return 0;
    const fury = ab.divineFury ? TALENT.divineFury.cast[this.tal.divineFury] || 0 : 0;
    return Math.max(0, (ab.castTime - fury) / this.hasteMult());
  }

  cost(id) {
    const ab = ABILITIES[id];
    if (!ab) return 0;
    let cost = ab.costPct ? ab.costPct * this.cs.base.mana : ab.cost || 0;
    if (!cost) return 0;
    if (ab.spell && this.aura('innerFocus')) return 0;
    if (id === 'holyNova' && this.aura('holyPurpose')) return 0;
    if (ab.school === 'shadow' && this.aura('shadowform')) cost *= 1 - ABILITIES.shadowform.costCut;
    if (ab.instant || ab.agility) cost *= 1 - (TALENT.mentalAgility.cost[this.tal.mentalAgility] || 0);
    if (id === 'devouringPlague') cost *= 1 - (TALENT.devouringContagion.cost[this.tal.devouringContagion] || 0);
    const r = this.racialActive();
    if (r && r.costPct && r.abilities && r.abilities.includes(id)) cost *= 1 + r.costPct / 100;
    return Math.max(0, cost);
  }

  spellRange(id) {
    const ab = ABILITIES[id];
    const reach = HOLY_REACH.has(id) ? TALENT.holyReach.range[this.tal.holyReach] || 0 : 0;
    return (ab.range || 30) * (ab.school === 'shadow' ? 1 + (TALENT.shadowReach.range[this.tal.shadowReach] || 0) : 1) * (1 + reach);
  }
  classBlocker(id) {
    if ((id === 'shadowform' || id === 'innerFocus') && this.aura(id)) return 'Already active';
    const ab = ABILITIES[id];
    if (ab && ab.race && this.c.race !== ab.race) return `${ab.name} is a ${RACES[ab.race].name} priest's spell`;
    if (ab && ab.humanoidOnly) return `${ab.name} works only on humanoids`;
    return null;
  }
  // Inner Focus: its cooldown starts once it is spent.
  cdOnCast(id) { return id !== 'innerFocus' && super.cdOnCast(id); }
  cdOnLanding(id) { return id !== 'innerFocus' && super.cdOnLanding(id); }
  // ---- the Holy talents on the heals (the hooks of classes/healer.js; wowsims talents_holy.go) -------------------------

  castTimeBonus(id) { return id === 'heal' || id === 'greaterHeal' ? TALENT.divineFury.cast[this.tal.divineFury] || 0 : 0; }
  healPowerBonus() { return (TALENT.spiritualGuidance.heal[this.tal.spiritualGuidance] || 0) * this.spirit(); }
  // Inner Focus makes any heal free; Improved Healing and Mental Agility cut their spells' mana.
  healCostMult(id) {
    if (this.aura('innerFocus')) return 0;
    const t = this.tal;
    return (1 - (IMPROVED_HEALING.has(id) ? TALENT.improvedHealing.cost[t.improvedHealing] || 0 : 0))
      * (1 - (AGILE_HEALS.has(id) ? TALENT.mentalAgility.cost[t.mentalAgility] || 0 : 0));
  }
  // A heal is cast: it spends Inner Focus (a direct one crits 25% more, at this moment only); Litany of Light.
  onHealCast(id, h) {
    if (this.aura('innerFocus')) {
      this.dropAura('innerFocus');
      this.cds.innerFocus = this.t + ABILITIES.innerFocus.cd;
      this.healFocusAt = this.t;
    }
    if (!LITANY_HEALS.has(id)) return;
    if (this.lastHeal && this.lastHeal !== id && this.tal.litanyOfLight) this.addMana(h.cost * TALENT.litanyOfLight.refund[this.tal.litanyOfLight], 'Litany of Light');
    this.lastHeal = id;
  }
  // A direct heal: Holy Specialization's crit, Inner Focus's, Spiritual Healing.
  healMods(id) {
    const t = this.tal;
    return {
      critPct: (TALENT.holySpecialization.critPct[t.holySpecialization] || 0) + (this.healFocusAt === this.t ? ABILITIES.innerFocus.critPct : 0),
      mult: SPIRITUAL_DIRECT.has(id) ? 1 + (TALENT.spiritualHealing.heal[t.spiritualHealing] || 0) : 1,
    };
  }
  hotMult(id) {
    if (id !== 'renew') return 1;
    const t = this.tal;
    return (1 + (TALENT.improvedRenew.heal[t.improvedRenew] || 0)) * (1 + (TALENT.spiritualHealing.heal[t.spiritualHealing] || 0));
  }
  shieldMult(id) { return id === 'powerWordShield' ? 1 + (TALENT.improvedPowerWordShield.absorb[this.tal.improvedPowerWordShield] || 0) : 1; }
  // Spell Warding: less damage from spells.
  takeDamage(amount, opts = {}) {
    const warded = opts.school && opts.school !== 'physical' ? 1 - (TALENT.spellWarding.taken[this.tal.spellWarding] || 0) : 1;
    return super.takeDamage(amount * warded, opts);
  }

  // Holy Binding: your Flash Heal on someone else heals you for half as much (wowsims talents_holy.go).
  afterHeal(key, u, amount) {
    if (key !== 'flashHeal' || !this.tal.holyBinding || u.id === this.raid.me.id) return;
    this.landHeal('holyBinding', { name: 'Holy Binding', icon: 'spell_holy_blindingheal' }, this.raid.me, { amount: amount * TALENT.holyBinding.share, crit: false });
  }

  // Inner Focus is spent by the next spell: the cast is free, a direct one crits more.
  takeFocus(ab) {
    if (!ab.spell || !this.aura('innerFocus')) return false;
    this.dropAura('innerFocus');
    this.cds.innerFocus = this.t + ABILITIES.innerFocus.cd;
    return true;
  }

  // A cast lands: its mana is spent now, then the spell resolves.
  completeCast(c) {
    const id = c.id;
    const ab = ABILITIES[id];
    this.spendMana(this.cost(id), id);
    const focus = this.takeFocus(ab);
    const sure = this.takeRevelation(id);
    if (id === 'holyNova' && this.aura('holyPurpose')) this.dropAura('holyPurpose');
    switch (id) {
      case 'shadowform': this.setAura('shadowform', Infinity); return;
      case 'innerFocus': this.setAura('innerFocus', Infinity); return;
      case 'powerInfusion': this.setAura('powerInfusion', ab.duration); return;
      case 'elunesGrace': this.setAura('elunesGrace', ab.duration, ab.charges); return;
      case 'shadowguard': this.setAura('shadowguard', ab.duration, ab.charges); return;
      case 'touchOfWeakness': this.setAura('touchOfWeakness', ab.duration, 1); return;
      case 'darkSacrifice': this.darkSacrifice(ab); return;
      case 'desperatePrayer': this.selfHeal((ab.heal * (1 + (this.rng() - 0.5) * ab.variance) + this.spellPower('holy') * ab.coef) * this.damageMult()); return;
      case 'vampiricEmbrace':
        if (this.rng() >= this.hitChance(ab.school)) { this.record(id, ab.name, 0, 'miss', this.target.i); return; }
        this.own(this.target).veEnd = this.t + ab.duration;
        return;
      case 'hexOfWeakness':
        if (this.rng() >= this.hitChance(ab.school)) { this.record(id, ab.name, 0, 'miss', this.target.i); return; }
        this.enc.addDemoShout(this.target, this.t, ab.duration, ab.apReduction);
        return;
      case 'racial': {
        const r = this.racial.active;
        this.cds.racial = this.t + r.cd;
        this.setAura('racial', r.duration, 0, { name: r.name, icon: r.icon });
        return;
      }
      default: break;
    }
    if (!ab.spell) return;
    // Holy Nova: every enemy around you.
    if (ab.radius) { for (const t of this.areaTargets(ab.radius)) this.spellHit(id, t, focus, sure); return; }
    // Holy Fire: a hit, then its burn if it landed.
    if (ab.dot && ab.base) { if (this.spellHit(id, this.target, focus, sure)) this.startDot(id, this.target); }
    else if (ab.dot) this.applyDot(id, this.target);
    else this.spellHit(id, this.target, focus, sure);
  }

  // Mind Blast, Shadow Word: Death, Smite, Holy Fire's hit: hit roll, damage, crit.
  spellHit(id, target, focus, sure = false) {
    const ab = ABILITIES[id];
    if (this.rng() >= this.hitChance(ab.school)) { this.record(id, ab.name, 0, 'miss', target.i); return false; }
    let dmg = this.damageOf(id, ab.base * (1 + (this.rng() - 0.5) * (ab.variance || 0)) + this.spellPower(ab.school) * ab.coef, ab.coef, target);
    const crit = this.rng() < this.critChance(id, { focus }) || sure;
    if (crit) dmg *= this.critMult(ab.school);
    this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
    this.onShadowHit(id, target);
    this.rollRevelation(crit);
    this.judgementOfWisdom();
    this.touchOfTheGrave(target);
    if (id === 'mindBlast') this.darkInspiration();
    return true;
  }

  // A Shadow spell landed (a direct hit, a periodic spell taking hold): Shadow Weaving may stack on the target.
  onShadowHit(id, target) {
    const sw = this.tal.shadowWeaving;
    if (!sw || ABILITIES[id].school !== 'shadow' || this.rng() >= TALENT.shadowWeaving.chance[sw]) return;
    const own = this.own(target);
    own.sw = Math.min(TALENT.shadowWeaving.maxStacks, (own.swEnd > this.t ? own.sw : 0) + 1);
    own.swEnd = this.t + TALENT.shadowWeaving.duration;
  }

  darkInspiration() {
    if (this.tal.darkInspiration) this.setAura('darkInspiration', TALENT.darkInspiration.duration);
  }

  // Shadow Word: Pain and Devouring Plague: a hit roll, then ticks on the target (they can crit); a new cast starts them
  // again.
  applyDot(id, target) {
    const ab = ABILITIES[id];
    if (this.rng() >= this.hitChance(ab.school)) { this.record(id, ab.name, 0, 'miss', target.i); return false; }
    this.onShadowHit(id, target);
    this.judgementOfWisdom();
    this.startDot(id, target);
    return true;
  }

  // The ticks on the target; each rank of a spell keeps its own.
  startDot(id, target) {
    const ab = ABILITIES[id];
    const own = this.own(target);
    const ticks = ab.dot.ticks + (id === 'shadowWordPain' ? TALENT.improvedShadowWordPain.ticks[this.tal.improvedShadowWordPain] || 0 : 0);
    const token = Symbol(id);
    own[id] = token;
    own[`${id}End`] = this.t + ab.dot.period * ticks;
    for (let k = 1; k <= ticks; k++) {
      this.schedule(this.t + ab.dot.period * k, () => {
        if (own[id] !== token) return;
        this.tick(id, target, this.damageOf(id, ab.dot.tick + this.spellPower(ab.school) * ab.dot.coef, ab.dot.coef, target));
        // Searing Light: a Holy Fire tick can make your next Holy Nova free.
        if ((id === 'holyFire' || id === 'holyFireR5') && this.tal.searingLight && this.rng() < TALENT.searingLight.holyPurpose[this.tal.searingLight]) this.setAura('holyPurpose', TALENT.searingLight.duration);
      });
    }
  }

  tick(id, target, dmg, sure = false) {
    const ab = ABILITIES[id];
    const crit = this.rng() < this.critChance(id, { periodic: true }) || sure;
    if (crit) dmg *= this.critMult(ab.school);
    this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
  }

  // Mind Flay: a hit roll at the start (a miss ends the channel), then a tick a second, each more than the one before
  // it (Improved Mind Flay); a full channel brings Dark Inspiration.
  beginChannel(id) {
    if (id === 'penance') { this.penance(); return; }
    if (id === 'starshards') { this.starshards(); return; }
    const ab = ABILITIES[id];
    const target = this.target;
    this.spendMana(this.cost(id), id);
    this.takeFocus(ab);
    const sure = this.takeRevelation(id);
    if (this.rng() >= this.hitChance(ab.school)) { this.record(id, ab.name, 0, 'miss', target.i); return; }
    this.onShadowHit(id, target);
    this.judgementOfWisdom();
    const period = this.channelPeriod(id);
    const ramp = 1 + (TALENT.improvedMindFlay.ramp[this.tal.improvedMindFlay] || 0);
    const c = { id, start: this.t, end: this.t + period * ab.ticks, channel: true, resets: false };
    this.casting = c;
    this.emit({ type: 'castStart', id, end: c.end });
    for (let k = 1; k <= ab.ticks; k++) {
      this.schedule(this.t + period * k, () => {
        if (this.casting !== c) return;
        this.tick(id, target, (ab.tick + this.spellPower(ab.school) * ab.coef) * this.spellMult(id, ab.school, target) * ramp ** (k - 1), sure);
        if (k === ab.ticks) {
          this.casting = null;
          this.emit({ type: 'castEnd', id });
          this.darkInspiration();
        }
      });
    }
  }

  // Penance: a bolt at once and one each tick of its channel, each its own hit roll and crit.
  penance() {
    const id = 'penance';
    const ab = ABILITIES[id];
    const target = this.target;
    this.spendMana(this.cost(id), id);
    const focus = this.takeFocus(ab);
    const bolt = () => {
      if (this.rng() >= this.hitChance(ab.school)) { this.record(id, ab.name, 0, 'miss', target.i); return; }
      let dmg = this.damageOf(id, ab.bolt + this.spellPower(ab.school) * ab.coef, ab.coef, target);
      const crit = this.rng() < this.critChance(id, { focus });
      if (crit) dmg *= this.critMult(ab.school);
      this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
      this.judgementOfWisdom();
      this.touchOfTheGrave(target);
    };
    bolt();
    const period = this.channelPeriod(id);
    const c = { id, start: this.t, end: this.t + period * ab.ticks, channel: true, resets: false };
    this.casting = c;
    this.emit({ type: 'castStart', id, end: c.end });
    for (let k = 1; k <= ab.ticks; k++) {
      this.schedule(this.t + period * k, () => {
        if (this.casting !== c) return;
        bolt();
        if (k === ab.ticks) { this.casting = null; this.emit({ type: 'castEnd', id }); }
      });
    }
  }

  // Expected damage per execute time of a channel (wowsims core/apl_values_spell.go APLValueSpellExpectedDpet, priest.go
  // periodicDamageSpellConfig, mind_flay.go): the ticks that fit in the fight from the start of the channel, each the
  // average tick with the expected crit (OutcomeExpectedMagicCrit, no hit roll), Mind Flay's at the mean of its
  // Improved Mind Flay ramp; over the channel's ticked time, at least a GCD. Only the channels have one here.
  expectedDpet(id, dt = 0) {
    const ab = ABILITIES[id];
    if (!ab || !ab.channel || !ab.tick || (ab.race && ab.race !== this.c.race)) return 0;
    const period = this.channelPeriod(id);
    const ticks = Math.min(ab.ticks, Math.floor(this.timeLeft(dt) / period + 1e-9));
    const execute = Math.max(this.gcdFor(id), period * ticks);
    if (ticks <= 0 || execute <= 0) return 0;
    let tick = this.damageOf(id, ab.tick + this.spellPower(ab.school) * ab.coef, ab.coef, this.target);
    if (id === 'mindFlay') {
      const ramp = 1 + (TALENT.improvedMindFlay.ramp[this.tal.improvedMindFlay] || 0);
      let sum = 0;
      for (let n = 0; n < ab.ticks; n++) sum += ramp ** n;
      tick *= sum / ab.ticks;
    }
    tick *= 1 + this.critChance(id, { periodic: true }) * (this.critMult(ab.school) - 1);
    return tick * ticks / execute;
  }

  // Starshards: a hit roll at the start (a miss ends it), then a tick a second (they can crit).
  starshards() {
    const id = 'starshards';
    const ab = ABILITIES[id];
    const target = this.target;
    this.spendMana(this.cost(id), id);
    this.takeFocus(ab);
    if (this.rng() >= this.hitChance(ab.school)) { this.record(id, ab.name, 0, 'miss', target.i); return; }
    this.judgementOfWisdom();
    const period = this.channelPeriod(id);
    const c = { id, start: this.t, end: this.t + period * ab.ticks, channel: true, resets: false };
    this.casting = c;
    this.emit({ type: 'castStart', id, end: c.end });
    for (let k = 1; k <= ab.ticks; k++) {
      this.schedule(this.t + period * k, () => {
        if (this.casting !== c) return;
        this.tick(id, target, this.damageOf(id, ab.tick + this.spellPower(ab.school) * ab.coef, ab.coef, target));
        if (k === ab.ticks) { this.casting = null; this.emit({ type: 'castEnd', id }); }
      });
    }
  }

  // Dark Sacrifice: health for mana, every 3 s for 15 sec.
  darkSacrifice(ab) {
    this.setAura('darkSacrifice', ab.period * ab.ticks);
    for (let k = 1; k <= ab.ticks; k++) {
      this.schedule(this.t + ab.period * k, () => {
        if (this.dead) return;
        this.health = Math.max(1, this.health - ab.health);
        this.addMana(ab.mana + (this.c.spi || 0) / ab.ticks, ab.name);
      });
    }
  }

  // Vampiric Embrace on the target: your Shadow damage to it heals you for a share.
  record(id, name, dmg, outcome, i = 0, ...rest) {
    super.record(id, name, dmg, outcome, i, ...rest);
    const ab = ABILITIES[id];
    if (dmg > 0 && ab && ab.school === 'shadow' && this.own(this.targets[i]).veEnd > this.t) this.selfHeal(dmg * ABILITIES.vampiricEmbrace.heal);
  }
  // Holy Nova and Shadowguard's strikes cause no threat.
  threatOf(key, amount) { return key === 'holyNova' || key === 'shadowguard' ? 0 : super.threatOf(key, amount); }

  // Elune's Grace: attacks on you miss more while it lasts; each miss spends a charge.
  bonusMiss() { return this.aura('elunesGrace') ? ABILITIES.elunesGrace.miss : 0; }
  onAvoid(outcome) {
    const eg = this.aura('elunesGrace');
    if (eg && outcome === 'miss' && --eg.stacks <= 0) this.dropAura('elunesGrace');
  }

  // Shadowguard and Touch of Weakness: an attack that lands on you is struck back.
  onStruck(outcome, target) {
    const sg = this.aura('shadowguard');
    if (sg && (this.procIcd.shadowguard || 0) <= this.t) {
      const ab = ABILITIES.shadowguard;
      this.procIcd.shadowguard = this.t + ab.icd;
      if (this.rng() < this.hitChance(ab.school)) this.record('shadowguard', ab.name, this.damageOf('shadowguard', ab.strike + this.spellPower(ab.school) * ab.coef, ab.coef, target), 'hit', target.i);
      else this.record('shadowguard', ab.name, 0, 'miss', target.i);
      if (--sg.stacks <= 0) this.dropAura('shadowguard');
    }
    if (this.aura('touchOfWeakness')) {
      const ab = ABILITIES.touchOfWeakness;
      this.dropAura('touchOfWeakness');
      if (this.rng() >= this.hitChance(ab.school)) { this.record('touchOfWeakness', ab.name, 0, 'miss', target.i); return; }
      let dmg = this.damageOf('touchOfWeakness', ab.strike + this.spellPower(ab.school) * ab.coef, ab.coef, target);
      const crit = this.rng() < this.critChance('touchOfWeakness');
      if (crit) dmg *= this.critMult(ab.school);
      this.record('touchOfWeakness', ab.name, dmg, crit ? 'crit' : 'hit', target.i);
      this.enc.addDemoShout(target, this.t, ab.weaken, ab.apReduction);
    }
  }

  // ---- the wand (classes/caster.js): Wand Specialization ----------------------------------------------------------
  wandDamageMult() { return 1 + (TALENT.wandSpecialization.dmg[this.tal.wandSpecialization] || 0); }
}
