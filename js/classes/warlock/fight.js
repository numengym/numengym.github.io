// The Warlock on the shared caster (classes/caster.js: mana with the five-second rule, casts and channels): Shadow Bolt,
// Incinerate, Searing Pain, Soul Fire, Immolate and the shadow damage over time, the Banes and Curse of the Elements,
// Wrack, Conflagrate, Shadowburn, Life Tap, Soul Shards, the three trees' talents, and the demon fighting beside you
// (the Succubus's swings and Lash of Pain, the Imp's Firebolt) or given up to Demonic Sacrifice. Formulas follow
// wowsims/forever sim/warlock/*.go.
import {
  ABILITIES, AGONIZING_FLAMES, AURAS, BANE_CAST, DESTRUCTION, MALEVOLENCE, NIGHTFALL, PETS, SACRIFICE, SHADOW_DOTS, SHADOW_MASTERY_DIRECT,
  SOUL_SHARDS, SPELL_CRIT_BONUS, SPELL_MISS, TALENT, WRACK_AMPLIFIES, parseTalents,
} from '../../data/warlock.js';
import { RATING } from '../../data/warrior.js';
import { CasterFight } from '../caster.js';

const PET_CRIT_SUPPRESSION = 0.03; // a level 63 boss, as your melee
const PET_MELEE = { miss: 0.08, dodge: 0.065, glance: 0.4, glanceMult: 0.65 };
const ORC_COMMAND = 1.05; // Orc: your demons deal 5% more (sim/core/racials.go applyCommand)
const SUCCUBUS_START = 1; // the Succubus walks in from your side before its first swing
const DEMON_SPEED = 7; // yards a second, walking back in after a recall

export class WarlockFight extends CasterFight {
  static ABILITIES = ABILITIES;
  static AURA_NAMES = Object.fromEntries(Object.entries(AURAS).map(([id, a]) => [id, a.name]));
  static PREPULL = new Set([]);

  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    const t = this.tal = parseTalents(sheet.talents);
    this.initMana(0, (this.racial.maxRageMult || 1) * (1 + (TALENT.felVitality.mana[t.felVitality] || 0)));
    this.shards = SOUL_SHARDS;
    // The demon out, and the one given up before the fight (Demonic Sacrifice; without Demonic Pact no demon is out).
    const o = sheet.classOptions || {};
    let summon = o.summon || null;
    let sacrificed = t.demonicSacrifice ? o.sacrificedDemon || null : null;
    if (sacrificed && !t.demonicPact) summon = null;
    if (sacrificed && sacrificed === summon) sacrificed = null;
    this.sacrificed = sacrificed;
    this.pet = summon && PETS[summon] ? this.makePet(summon) : null;
  }

  get petOut() { return !!this.pet; }

  // The demon a character has out, for the pet bar before a fight: none when it was given up without Demonic Pact.
  static petKind(sheet) {
    const t = parseTalents(sheet.talents);
    const o = sheet.classOptions || {};
    const summon = o.summon && PETS[o.summon] ? o.summon : null;
    const sacrificed = t.demonicSacrifice ? o.sacrificedDemon || null : null;
    return sacrificed && !t.demonicPact ? null : summon;
  }

  // ---- stats ---------------------------------------------------------------------------------------------

  // Demonic Knowledge with a demon out; Blood Fury raises spell damage too.
  spellPower(school) {
    let sp = (this.c.spellPower || 0) + ((this.c.schoolPower || {})[school] || 0) + this.tempStats().spellPower;
    if (this.petOut) sp += 60 * (TALENT.demonicKnowledge.spellPowerPerLevel[this.tal.demonicKnowledge] || 0);
    const r = this.racialActive();
    if (r && r.apMult) sp *= r.apMult;
    return sp;
  }

  // Suppression: spell hit.
  hitChance() {
    const hit = (this.c.spellHitPct || 0) + this.tempStats().hitRating / RATING.hit + (TALENT.suppression.hitPct[this.tal.suppression] || 0);
    return 1 - Math.max(0, SPELL_MISS - hit / 100);
  }

  spellCrit() {
    let crit = this.baseCritPct + this.tempStats().critRating / RATING.crit + this.tempStats().critPct;
    crit += this.tempStats().int * this.cs.critPerInt * (this.c.statMult || 1);
    const r = this.racialActive();
    if (r && r.critPct) crit += r.critPct;
    return crit;
  }
  critChance(id) {
    let crit = this.spellCrit();
    const t = this.tal;
    if (MALEVOLENCE.has(id)) crit += TALENT.malevolence.critPct[t.malevolence] || 0;
    if (id === 'searingPain') crit += TALENT.agonizingFlames.searingCrit[t.agonizingFlames] || 0;
    if (id === 'conflagrate') crit += TALENT.fireAndBrimstone.conflagrateCrit[t.fireAndBrimstone] || 0;
    return Math.min(1, crit / 100);
  }

  // Ruin doubles the Destruction spells' crit bonus, Pandemic the shadow damage over time's.
  critMult(id, periodic) {
    let bonus = 0;
    if (DESTRUCTION.has(id)) bonus = TALENT.ruin.critBonus[this.tal.ruin] || 0;
    else if (periodic && SHADOW_DOTS.has(id)) bonus = TALENT.pandemic.critBonus[this.tal.pandemic] || 0;
    return 1 + SPELL_CRIT_BONUS * (1 + bonus);
  }

  // Your damage multipliers on a spell: the talents', your Curse of the Elements and Shadow Vulnerability on the
  // target, Wrack's channel, Demonic Sacrifice, Master Demonologist and Soul Link with the demon out, Shadow and Flame,
  // Decimation below 35%, the racial.
  spellMult(id, school, target, periodic = false) {
    const t = this.tal;
    const own = this.own(target);
    let m = this.damageMult();
    if (!periodic && SHADOW_MASTERY_DIRECT.has(id)) m *= 1 + (TALENT.shadowMastery.direct[t.shadowMastery] || 0);
    if (periodic && SHADOW_DOTS.has(id)) m *= 1 + (TALENT.shadowMastery.dot[t.shadowMastery] || 0);
    if (periodic && id === 'corruption') m *= 1 + (TALENT.improvedCorruption.dot[t.improvedCorruption] || 0);
    if (periodic && id === 'baneOfAgony') m *= 1 + (TALENT.improvedBaneOfAgony.dot[t.improvedBaneOfAgony] || 0);
    if (AGONIZING_FLAMES.has(id) && (!periodic || id === 'immolate')) m *= 1 + (TALENT.agonizingFlames[periodic ? 'dot' : 'dmg'][t.agonizingFlames] || 0);
    if (!periodic && id === 'immolate') m *= 1 + (TALENT.aftermath.immolate[t.aftermath] || 0);
    if (id === 'incinerate' && own.immolateEnd > this.t) m *= 1 + ABILITIES.incinerate.immolateBonus;
    if ((id === 'shadowBolt' || id === 'searingPain') && this.healthPct() <= TALENT.decimation.below) m *= 1 + (TALENT.decimation.dmg[t.decimation] || 0);
    if (periodic && WRACK_AMPLIFIES.has(id) && this.casting && this.casting.id === 'wrack' && this.casting.target === target) m *= 1 + ABILITIES.wrack.amplify;
    m *= this.schoolMult(school, target);
    const r = this.racialActive();
    if (r && r.damagePct && r.abilities && r.abilities.includes(id)) m *= 1 + r.damagePct / 100;
    return m;
  }

  // What raises all of your damage of a school: the curse, Shadow Vulnerability, the sacrifice, the demon out, Shadow
  // and Flame.
  schoolMult(school, target) {
    const t = this.tal;
    const own = this.own(target);
    let m = 1;
    m *= 1 + Math.max(own.coeEnd > this.t ? ABILITIES.curseOfElements.dmg : 0, this.enc.raid.spellDmgTaken || this.c.raidSpellDmgTaken || 0);
    if (school === 'shadow' && own.isbEnd > this.t) m *= 1 + (TALENT.improvedShadowBolt.shadow[t.improvedShadowBolt] || 0);
    const sac = this.sacrificed && SACRIFICE[this.sacrificed];
    if (sac && sac.school === school) m *= 1 + sac.dmg;
    if (this.pet) {
      if (this.pet.school === school) m *= 1 + (TALENT.masterDemonologist.dmg[t.masterDemonologist] || 0);
      if (t.soulLink) m *= 1 + TALENT.soulLink.dmg;
    }
    const buff = TALENT.shadowAndFlame.buff[t.shadowAndFlame] || 0;
    if (school === 'shadow' && this.aura('shadowAndFlameShadow')) m *= 1 + buff;
    if (school === 'fire' && this.aura('shadowAndFlameFire')) m *= 1 + buff;
    return m;
  }

  // ---- casting -------------------------------------------------------------------------------------------

  castTime(id) {
    const ab = ABILITIES[id];
    if (!ab || !ab.castTime) return 0;
    const t = this.tal;
    let ct = ab.castTime;
    if (BANE_CAST.has(id)) ct -= TALENT.bane.cast[t.bane] || 0;
    if (id === 'soulFire') {
      ct -= TALENT.bane.soulFire[t.bane] || 0;
      if (this.aura('decimation')) ct *= 1 - (TALENT.decimation.soulFireCast[t.decimation] || 0);
    }
    if (id === 'corruption') ct -= TALENT.improvedCorruption.cast[t.improvedCorruption] || 0;
    if (id === 'shadowBolt' && this.aura('shadowTrance')) ct = 0;
    return Math.max(0, ct / this.hasteMult());
  }

  cost(id) {
    const ab = ABILITIES[id];
    if (!ab || !ab.cost) return 0;
    let cost = ab.cost;
    if (DESTRUCTION.has(id)) cost *= 1 - (TALENT.cataclysm.cost[this.tal.cataclysm] || 0);
    const r = this.racialActive();
    if (r && r.costPct && r.abilities && r.abilities.includes(id)) cost *= 1 + r.costPct / 100;
    return Math.max(0, cost);
  }

  cooldownBonus(id, cd) {
    if (id === 'soulFire') return cd * (1 - (TALENT.decimation.soulFireCd[this.tal.decimation] || 0));
    return cd;
  }

  needsShard(id) { return ABILITIES[id].shard && !(id === 'soulFire' && this.aura('decimation')); }

  classBlocker(id) {
    if (this.needsShard(id) && this.shards <= 0) return 'You have no Soul Shards';
    if (id === 'conflagrate' && !(this.own(this.target).immolateEnd > this.t)) return 'Requires your Immolate on the target';
    if (id === 'amplifyCurse' && this.aura('amplifyCurse')) return 'Already active';
    return null;
  }

  completeCast(c) {
    const id = c.id;
    const ab = ABILITIES[id];
    this.spendMana(this.cost(id), id);
    switch (id) {
      case 'lifeTap': return this.lifeTap();
      case 'amplifyCurse': this.setAura('amplifyCurse', ab.duration); return;
      case 'racial': {
        const r = this.racial.active;
        this.cds.racial = this.t + r.cd;
        this.setAura('racial', r.duration, 0, { name: r.name, icon: r.icon });
        return;
      }
      default: break;
    }
    if (!ab.spell) return;
    if (this.needsShard(id)) this.shards--;
    // Shadow Trance is spent by the instant Shadow Bolt it made.
    if (id === 'shadowBolt' && c.instant && this.aura('shadowTrance')) this.dropAura('shadowTrance');
    const target = this.target;
    if (this.rng() >= this.hitChance()) { this.record(id, ab.name, 0, 'miss', target.i); return; }
    this.judgementOfWisdom();
    const own = this.own(target);
    if (id === 'curseOfElements') { own.coeEnd = this.t + ab.duration; return; }
    if (ab.base) this.directHit(id, target);
    if (ab.dot) this.applyDot(id, target);
    // What landing does: Decimation below 35%, Demonic Brand, Conflagrate's Immolate, Shadow and Flame.
    if ((id === 'shadowBolt' || id === 'searingPain') && this.tal.decimation && this.healthPct() <= TALENT.decimation.below) {
      this.setAura('decimation', TALENT.decimation.duration);
    }
    if (id === 'searingPain' && this.tal.demonicBrand) {
      own.brandCharges = TALENT.demonicBrand.charges[this.tal.demonicBrand];
      own.brandEnd = this.t + TALENT.demonicBrand.duration;
    }
    if (id === 'conflagrate') {
      if (this.rng() >= (TALENT.shadowAndFlame.keepImmolate[this.tal.shadowAndFlame] || 0)) { own.immolate = null; own.immolateEnd = 0; }
      if (this.tal.shadowAndFlame) this.setAura('shadowAndFlameShadow', TALENT.shadowAndFlame.duration);
    }
    if (id === 'shadowburn' && this.tal.shadowAndFlame) {
      this.setAura('shadowAndFlameFire', TALENT.shadowAndFlame.duration);
      if (this.rng() < TALENT.shadowAndFlame.keepImmolate[this.tal.shadowAndFlame]) this.shards++; // the shard back
    }
  }

  // A direct hit (its hit already rolled). Improved Shadow Bolt: a Shadow Bolt crit makes the target vulnerable.
  directHit(id, target) {
    const ab = ABILITIES[id];
    const base = ab.base * (1 + (this.rng() - 0.5) * (ab.variance || 0));
    let dmg = (base + this.spellPower(ab.school) * ab.coef) * this.spellMult(id, ab.school, target);
    const crit = this.rng() < this.critChance(id);
    if (crit) dmg *= this.critMult(id, false);
    this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
    if (crit && id === 'shadowBolt' && this.tal.improvedShadowBolt) this.own(target).isbEnd = this.t + TALENT.improvedShadowBolt.duration;
  }

  // The damage over time (ticks can crit); a new one starts it again. Bane of Agony ramps by thirds and takes Amplify
  // Curse; a Bane takes the other off the target. The spell power is read when it lands.
  applyDot(id, target) {
    const ab = ABILITIES[id];
    const own = this.own(target);
    if (ab.bane) for (const other of ['baneOfAgony', 'baneOfDoom']) if (other !== id) { own[other] = null; own[`${other}End`] = 0; }
    const token = Symbol(id);
    own[id] = token;
    own[`${id}End`] = this.t + ab.dot.period * ab.dot.ticks;
    const share = this.spellPower(ab.school) * ab.dot.coef;
    let amp = 1;
    if (id === 'baneOfAgony' && this.aura('amplifyCurse')) { amp = TALENT.amplifyCurse.mult; this.dropAura('amplifyCurse'); }
    const third = Math.max(1, Math.floor(ab.dot.ticks / 3));
    for (let k = 1; k <= ab.dot.ticks; k++) {
      this.schedule(this.t + ab.dot.period * k, () => {
        if (own[id] !== token) return;
        const ramp = id === 'baneOfAgony' ? (k <= third ? 0.5 : k <= 2 * third ? 1 : 1.5) : 1;
        let dmg = (ab.dot.tick * ramp + share) * amp * this.spellMult(id, ab.school, target, true);
        const crit = this.rng() < this.critChance(id);
        if (crit) dmg *= this.critMult(id, true);
        this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
        if (NIGHTFALL.has(id)) this.rollNightfall();
        if (k === ab.dot.ticks && id === 'immolate') own.immolateEnd = this.t;
      });
    }
  }

  // Nightfall: a Corruption or Wrack tick can make the next Shadow Bolt instant.
  rollNightfall() {
    if (this.tal.nightfall && this.rng() < TALENT.nightfall.chance[this.tal.nightfall]) this.setAura('shadowTrance', TALENT.nightfall.duration);
  }

  // Life Tap: 424 + Spirit of health into mana (Improved Life Tap more); Demonic Energies gives the demon a share.
  lifeTap() {
    const amount = (ABILITIES.lifeTap.base + (this.c.spi || 0) + this.tempStats().spi) * (1 + (TALENT.improvedLifeTap.mana[this.tal.improvedLifeTap] || 0));
    this.addMana(amount, 'Life Tap');
    const share = TALENT.demonicEnergies.petShare[this.tal.demonicEnergies] || 0;
    if (this.pet && share) this.petMana(amount * share);
  }

  // Wrack: a hit roll at the start (a miss ends it), then a tick a second, more per affliction effect on the target.
  beginChannel(id) {
    const ab = ABILITIES[id];
    const target = this.target;
    this.spendMana(this.cost(id), id);
    if (this.rng() >= this.hitChance()) { this.record(id, ab.name, 0, 'miss', target.i); return; }
    this.judgementOfWisdom();
    const period = this.channelPeriod(id);
    const c = { id, start: this.t, end: this.t + period * ab.ticks, channel: true, resets: false, target };
    this.casting = c;
    this.emit({ type: 'castStart', id, end: c.end });
    for (let k = 1; k <= ab.ticks; k++) {
      this.schedule(this.t + period * k, () => {
        if (this.casting !== c) return;
        const effects = this.afflictions(target);
        const siphon = 1 + (TALENT.soulSiphon.perEffect[this.tal.soulSiphon] || 0) * Math.min(effects, TALENT.soulSiphon.maxEffects);
        let dmg = (ab.tick + this.spellPower(ab.school) * ab.coef) * siphon * this.spellMult(id, ab.school, target, true);
        const crit = this.rng() < this.critChance(id);
        if (crit) dmg *= this.critMult(id, true);
        this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
        this.rollNightfall();
        if (k === ab.ticks) { this.casting = null; this.emit({ type: 'castEnd', id }); }
      });
    }
  }
  channelPeriod(id) { return ABILITIES[id].channel / ABILITIES[id].ticks / this.hasteMult(); }

  // Your affliction effects on the target (Soul Siphon): the shadow damage over time and the curse.
  afflictions(target) {
    const own = this.own(target);
    let n = 0;
    for (const id of ['corruption', 'baneOfAgony', 'baneOfDoom', 'siphonLife']) if (own[`${id}End`] > this.t) n++;
    if (own.coeEnd > this.t) n++;
    return n;
  }

  // ---- the demon ------------------------------------------------------------------------------------------

  makePet(kind) {
    const p = PETS[kind];
    const mana = p.mana * (1 + (TALENT.felVitality.mana[this.tal.felVitality] || 0));
    return this.initPet({ kind, ...p, mana, maxMana: mana, manaAt: 0, mult: this.petMult() }, [p.spell.id]);
  }

  // The demon's own multiplier: Unholy Power, Soul Link, the Orc's Command.
  petMult() {
    let m = 1 + (TALENT.unholyPower.pet[this.tal.unholyPower] || 0);
    if (this.tal.soulLink) m *= 1 + TALENT.soulLink.dmg;
    if (this.c.race === 'RaceOrc') m *= ORC_COMMAND;
    return m;
  }

  // Your spell damage as the demon inherits it: the better of Shadow and Fire.
  ownerSpellDamage() {
    const school = Math.max((this.c.schoolPower || {}).shadow || 0, (this.c.schoolPower || {}).fire || 0);
    return (this.c.spellPower || 0) + this.tempStats().spellPower + school;
  }
  // The demon's spell damage: a tenth of yours, and Demonic Knowledge's own.
  petSpellPower() {
    return this.ownerSpellDamage() * 0.1 + 60 * (TALENT.demonicKnowledge.spellPowerPerLevel[this.tal.demonicKnowledge] || 0);
  }

  // The demon's mana: its own regeneration is a share of your Intellect as mana per 5 sec.
  syncPetMana() {
    const p = this.pet;
    const dt = this.t - p.manaAt;
    if (dt > 0) p.mana = Math.min(p.maxMana, p.mana + dt * this.intellect() * p.mp5PerOwnerInt / 5);
    p.manaAt = this.t;
  }
  petMana(amount) { this.syncPetMana(); this.pet.mana = Math.min(this.pet.maxMana, this.pet.mana + amount); }
  petManaIn(need) {
    this.syncPetMana();
    const rate = this.intellect() * this.pet.mp5PerOwnerInt / 5;
    return this.pet.mana >= need ? 0 : rate > 0 ? (need - this.pet.mana) / rate : Infinity;
  }

  // The demon's damage multiplier against the target: its own, Master Demonologist, the curse.
  petDamageMult(school, target) {
    let m = this.pet.mult;
    if (school === this.pet.school) m *= 1 + (TALENT.masterDemonologist.dmg[this.tal.masterDemonologist] || 0);
    if (school !== 'physical') m *= 1 + Math.max(this.own(target).coeEnd > this.t ? ABILITIES.curseOfElements.dmg : 0, this.enc.raid.spellDmgTaken || 0);
    return m;
  }

  petSpellHits() { return this.rng() < this.hitChance(); }
  // Judgement of Wisdom on the target: half the demon's landed hits give it mana, as yours give you.
  petJudgementOfWisdom() { if (this.c.jow && this.rng() < 0.5) this.petMana(this.c.jow); }
  petCrit(bonus = 0) { return this.rng() < (this.spellCrit() + bonus) / 100; }

  // A landed hit of the demon spends a charge of your Demonic Brand on the target: Fire from the Imp, Shadow from the
  // others, 66.5 (±1.5) + 7.8% of your spell damage of that school.
  demonicBrand(target) {
    const own = this.own(target);
    if (!(own.brandCharges > 0) || !(own.brandEnd > this.t)) return;
    own.brandCharges--;
    const school = this.pet.kind === 'imp' ? 'fire' : 'shadow';
    if (!this.petSpellHits()) { this.record('demonicBrand', 'Demonic Brand', 0, 'miss', target.i); return; }
    const b = TALENT.demonicBrand;
    const sp = (this.c.spellPower || 0) + this.tempStats().spellPower + ((this.c.schoolPower || {})[school] || 0);
    let dmg = (b.base + b.low + this.rng() * (b.high - b.low) + b.coef * sp) * this.petDamageMult(school, target);
    const crit = this.petCrit();
    if (crit) dmg *= 1 + SPELL_CRIT_BONUS;
    this.record('demonicBrand', 'Demonic Brand', dmg, crit ? 'crit' : 'hit', target.i);
  }

  // The Succubus swings every 2 s (glancing, behind the target), the Imp casts Firebolt as its mana allows. At the
  // pull an assisting demon goes in (the Succubus walks in from your side first); the pet bar sends it in or calls it
  // back later (classes/caster.js), each engagement its own loop (p.loop) so a recalled demon's swings stop.
  startPet() {
    const p = this.pet;
    if (!p) return;
    p.manaAt = this.t;
    this.petPull();
  }
  petEngage() {
    const p = this.pet;
    if (!p || p.engaged || this.over || !this.started) return;
    p.engaged = true;
    const loop = p.loop = Symbol('pet');
    // From your side to the target: a second at the pull, the way back after a recall.
    const walk = p.melee ? (p.fought ? Math.max(SUCCUBUS_START, (this.geo.dist[this.primary] || 0) / DEMON_SPEED) : SUCCUBUS_START) : 0;
    p.fought = true;
    if (p.melee) this.schedule(this.t + walk, () => this.petSwing(loop));
    this.schedule(this.t + walk, () => this.petCast(loop));
  }
  petDisengage() {
    const p = this.pet;
    if (!p) return;
    p.engaged = false;
    p.loop = null;
    p.idle = false;
  }
  petCastNow() {
    const p = this.pet;
    if (p && p.engaged && p.idle) { p.idle = false; const loop = p.loop; this.schedule(this.t, () => this.petCast(loop)); }
  }

  petSwing(loop) {
    const p = this.pet;
    if (this.over || p.loop !== loop) return;
    const target = this.target;
    const m = p.melee;
    const hit = (this.c.spellHitPct || 0) + (TALENT.suppression.hitPct[this.tal.suppression] || 0);
    const r = this.rng();
    let acc = Math.max(0, PET_MELEE.miss - hit * 8 / 17 / 100);
    let outcome = 'hit';
    if (r < acc) outcome = 'miss';
    else if (r < (acc += PET_MELEE.dodge)) outcome = 'dodge';
    else if (r < (acc += PET_MELEE.glance)) outcome = 'glance';
    else if (r < acc + Math.max(0, this.spellCrit() / 100 - PET_CRIT_SUPPRESSION)) outcome = 'crit';
    let dmg = 0;
    if (outcome !== 'miss' && outcome !== 'dodge') {
      const ap = m.ap + m.apPerSpellDamage * this.ownerSpellDamage();
      dmg = (m.avg * (1 + (this.rng() * 2 - 1) * m.spread) + ap / 14 * m.speed + this.physDmgBonus()) * this.armorMult(target) * this.petDamageMult('physical', target);
      if (outcome === 'glance') dmg *= PET_MELEE.glanceMult;
      if (outcome === 'crit') dmg *= 2;
    }
    this.record('petMelee', 'Melee (demon)', dmg, outcome, target.i);
    if (dmg > 0) this.demonicBrand(target);
    if (dmg > 0) this.petJudgementOfWisdom();
    this.schedule(this.t + m.speed, () => this.petSwing(loop));
  }

  // Its spell: on autocast as its mana and cooldown allow, or once when you queue it (the pet bar).
  petCast(loop) {
    const p = this.pet;
    if (this.over || p.loop !== loop) return;
    const s = p.spell;
    const target = this.target;
    if (!p.autocast[s.id] && p.queued !== s.id) { p.idle = true; return; }
    const wait = Math.max(this.petManaIn(s.cost), (p.spellReady || 0) - this.t);
    if (wait > 0) { this.schedule(this.t + Math.max(0.1, wait), () => this.petCast(loop)); return; }
    if (p.queued === s.id) p.queued = null;
    p.mana -= s.cost;
    const cast = s.castTime || 0;
    if (s.cd) p.spellReady = this.t + s.cd;
    this.schedule(this.t + cast, () => {
      if (this.over || p.loop !== loop) return;
      const school = p.school;
      if (!this.petSpellHits()) this.record(s.id, s.name, 0, 'miss', target.i);
      else {
        let dmg = (s.base * (1 + (this.rng() - 0.5) * s.variance) + this.petSpellPower() * s.coef) * this.petDamageMult(school, target);
        if (s.id === 'firebolt') dmg *= 1 + (TALENT.improvedImp.firebolt[this.tal.improvedImp] || 0);
        const crit = this.petCrit(s.id === 'lashOfPain' ? TALENT.malevolence.critPct[this.tal.malevolence] || 0 : 0);
        if (crit) dmg *= 1 + SPELL_CRIT_BONUS;
        this.record(s.id, s.name, dmg, crit ? 'crit' : 'hit', target.i);
        this.demonicBrand(target);
        this.petJudgementOfWisdom();
      }
      this.schedule(this.t + Math.max(0, s.gcd - cast), () => this.petCast(loop));
    });
  }

  onStart() {
    super.onStart();
    this.startPet();
  }
}
