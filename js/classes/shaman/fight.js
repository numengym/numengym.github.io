// The Elemental Shaman on the shared caster (classes/caster.js: mana with the five-second rule, casts): Lightning Bolt
// with Lightning Overload, Lava Burst, Flame Shock ticking on the target, Earth Shock, Chain Lightning, the shocks'
// shared cooldown, totems in their element's slot (Searing Totem attacks, Mana Spring Totem gives mana), Clearcasting,
// Elemental Mastery and the Elemental talents. Formulas follow wowsims/forever sim/shaman/*.go.
import {
  ABILITIES, ALACRITY, AURAS, CALL_OF_FLAME, CLEARCASTING, CONCUSSION, CONVECTION, LIGHTNING, REVELATION, SHAMANISTIC_FOCUS, SPELL_CRIT_BONUS,
  SPELL_MISS, TALENT, TOTEM_OF_THE_STORM, TOTEM_SLOTS, parseTalents,
} from '../../data/shaman.js';
import { RATING } from '../../data/warrior.js';
import { CasterFight } from '../caster.js';

const SHOCK_CD = 6; // the shocks share category 19's cooldown, shorter with Reverberation

export class ShamanFight extends CasterFight {
  static ABILITIES = ABILITIES;
  static AURA_NAMES = Object.fromEntries(Object.entries(AURAS).map(([id, a]) => [id, a.name]));
  // The totems go down before the pull (the wowsims APL drops them at -4 to -1 s).
  static PREPULL = new Set(['searingTotem', 'manaSpringTotem', 'strengthOfEarthTotem', 'windfuryTotem']);

  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    this.tal = parseTalents(sheet.talents);
    // Ancestral Knowledge raises Intellect: more mana and spell crit.
    this.initMana(sheet.int * (TALENT.ancestralKnowledge.int[this.tal.ancestralKnowledge] || 0), this.racial.maxRageMult || 1);
    // Thundering Strikes: crit with spells too while a melee weapon is equipped.
    if (sheet.mh && sheet.mh.icon) this.baseCritPct += TALENT.thunderingStrikes.critPct[this.tal.thunderingStrikes] || 0;
    this.initRevelation(REVELATION.spells);
    this.stormTotem = (sheet.itemIds || []).includes(TOTEM_OF_THE_STORM.id) ? TOTEM_OF_THE_STORM.base : 0;
    // The totem in each element's slot: { id, end }.
    this.totems = Object.fromEntries(TOTEM_SLOTS.map((s) => [s, null]));
  }

  // ---- mana ---------------------------------------------------------------------------------------

  castingShare() { return TALENT.mindfulness.casting[this.tal.mindfulness] || 0; }
  // Your own Mana Spring Totem: 10 mana every 2 s while it stands.
  regenRates() {
    const r = super.regenRates();
    const ms = this.totemUp('water', 'manaSpringTotem') ? ABILITIES.manaSpringTotem.manaPerSec : 0;
    return { free: r.free + ms, casting: r.casting + ms };
  }

  totemUp(slot, id) {
    const t = this.totems[slot];
    return !!t && t.end > this.t && (!id || t.id === id);
  }
  totemLeft(slot) {
    const t = this.totems[slot];
    return t ? Math.max(0, t.end - this.t) : 0;
  }

  // ---- spell stats -----------------------------------------------------------------------------------

  spellPower(school) {
    return (this.c.spellPower || 0) + ((this.c.schoolPower || {})[school] || 0) + this.tempStats().spellPower;
  }

  // Tidal Focus: spell hit for every spell.
  hitChance() {
    const hit = (this.c.spellHitPct || 0) + this.tempStats().hitRating / RATING.hit + (TALENT.tidalFocus.hitPct[this.tal.tidalFocus] || 0);
    return 1 - Math.max(0, SPELL_MISS - hit / 100);
  }

  critChance() {
    let crit = this.baseCritPct + this.tempStats().critRating / RATING.crit + this.tempStats().critPct;
    crit += this.tempStats().int * this.cs.critPerInt * (this.c.statMult || 1);
    const r = this.racialActive();
    if (r && r.critPct) crit += r.critPct;
    return Math.min(1, crit / 100);
  }

  // Elemental Fury raises the crit bonus of the shaman's spells.
  critMult() { return 1 + SPELL_CRIT_BONUS * (1 + (TALENT.elementalFury.critBonus[this.tal.elementalFury] || 0)); }

  // Damage multipliers: Concussion, Call of Flame, Curse of the Elements, item buffs, the racial.
  spellMult(id, target) {
    let m = this.damageMult();
    if (CONCUSSION.has(id) || id === 'overload') m *= 1 + (TALENT.concussion.dmg[this.tal.concussion] || 0);
    if (CALL_OF_FLAME.has(id)) m *= 1 + (TALENT.callOfFlame.dmg[this.tal.callOfFlame] || 0);
    m *= 1 + (this.enc.raid.spellDmgTaken || this.c.raidSpellDmgTaken || 0);
    const r = this.racialActive();
    if (r && r.damagePct && r.abilities && r.abilities.includes(id)) m *= 1 + r.damagePct / 100;
    return m;
  }

  // ---- casting -------------------------------------------------------------------------------------------

  // Totems take a 1 s global cooldown.
  gcdFor(id) { return ABILITIES[id].gcdTime || 1.5; }

  castTime(id) {
    const ab = ABILITIES[id];
    if (!ab || !ab.castTime) return 0;
    let t = ab.castTime;
    if (ALACRITY.has(id)) t -= TALENT.elementalAlacrity.cast[this.tal.elementalAlacrity] || 0;
    if ((id === 'lightningBolt' || id === 'lightningBoltR8' || id === 'lavaBurst') && this.aura('elementalMastery')) t -= ABILITIES.elementalMastery.castCut;
    return Math.max(0, t / this.hasteMult());
  }

  // The shocks share one cooldown.
  cdLeft(id) {
    let left = super.cdLeft(id);
    if (ABILITIES[id] && ABILITIES[id].shock) left = Math.max(left, (this.cds.shock || 0) - this.t);
    return left;
  }

  cost(id) {
    const ab = ABILITIES[id];
    if (!ab) return 0;
    let cost = ab.cost || 0;
    if (!cost) return 0;
    if (CLEARCASTING.has(id) && this.aura('clearcasting')) return 0;
    if (CONVECTION.has(id)) cost *= 1 - (TALENT.convection.cost[this.tal.convection] || 0);
    if (SHAMANISTIC_FOCUS.has(id) && this.tal.shamanisticFocus) cost *= 1 - TALENT.shamanisticFocus.cost;
    const r = this.racialActive();
    if (r && r.costPct && r.abilities && r.abilities.includes(id)) cost *= 1 + r.costPct / 100;
    return Math.max(0, cost);
  }

  spellRange(id) { return ABILITIES[id].range || 30; }
  classBlocker(id) {
    if (id === 'elementalMastery' && this.aura('elementalMastery')) return 'Already active';
    if (id === 'waterShield' && this.aura('waterShield') && this.aura('waterShield').stacks >= ABILITIES.waterShield.charges) return 'Already active';
    return null;
  }

  // A cast lands: its mana is spent now, then the spell resolves.
  completeCast(c) {
    const id = c.id;
    const ab = ABILITIES[id];
    const free = CLEARCASTING.has(id) && this.aura('clearcasting');
    this.spendMana(this.cost(id), id);
    if (free) this.dropAura('clearcasting');
    if (ab.shock) this.cds.shock = this.t + SHOCK_CD - (TALENT.reverberation.cd[this.tal.reverberation] || 0);
    if (ab.totem) { this.dropTotem(id); return; }
    switch (id) {
      case 'elementalMastery': this.setAura('elementalMastery', ab.duration); return;
      case 'waterShield': this.setAura('waterShield', ab.duration, ab.charges); return;
      case 'racial': {
        const r = this.racial.active;
        this.cds.racial = this.t + r.cd;
        this.setAura('racial', r.duration, 0, { name: r.name, icon: r.icon });
        return;
      }
      default: break;
    }
    if (!ab.spell) return;
    const sure = this.takeRevelation(id);
    if (id === 'chainLightning') {
      const hit = [this.target, ...this.others(30)].slice(0, ab.jumps);
      hit.forEach((t, k) => this.spellHit(id, t, { sure: sure && k === 0, mult: ab.jumpMult ** k }));
    } else this.spellHit(id, this.target, { sure });
    // Elemental Focus: a Fire, Frost or Nature damage spell cast can make the next one free.
    if (this.tal.elementalFocus && this.rng() < TALENT.elementalFocus.chance) this.setAura('clearcasting', TALENT.elementalFocus.duration);
  }

  // One spell's hit: hit roll, damage, crit; Lightning Overload after a landed bolt; Flame Shock's ticks.
  spellHit(id, target, { sure = false, mult = 1 } = {}) {
    const ab = ABILITIES[id];
    if (this.rng() >= this.hitChance()) { this.record(id, ab.name, 0, 'miss', target.i); return false; }
    let base = ab.base * (1 + (this.rng() - 0.5) * (ab.variance || 0));
    if (LIGHTNING.has(id)) base += this.stormTotem;
    let dmg = (base + this.spellPower(ab.school) * ab.coef) * this.spellMult(id, target) * mult;
    if (id === 'lavaBurst' && this.own(target).flameShockEnd > this.t) dmg *= 1 + ab.flameShockBonus;
    const crit = this.rng() < this.critChance() || sure;
    if (crit) dmg *= this.critMult();
    this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
    if (crit) this.waterGlobe();
    this.rollRevelation(crit);
    this.judgementOfWisdom();
    if (ab.dot) this.applyDot(id, target);
    if (ab.overload && this.rng() < (TALENT.lightningOverload.chance[this.tal.lightningOverload] || 0)) this.overload(ab, target);
    return true;
  }

  // Lightning Overload: a half-strength copy of the bolt, with its own hit and crit.
  overload(ab, target) {
    if (this.rng() >= this.hitChance()) { this.record('overload', 'Lightning Overload', 0, 'miss', target.i); return; }
    const o = ab.overload;
    let dmg = (o.base * (1 + (this.rng() - 0.5) * o.variance) + this.stormTotem + this.spellPower(ab.school) * o.coef) * this.spellMult('overload', target);
    const crit = this.rng() < this.critChance();
    if (crit) dmg *= this.critMult();
    this.record('overload', 'Lightning Overload', dmg, crit ? 'crit' : 'hit', target.i);
    this.judgementOfWisdom();
  }

  // Flame Shock's ticks (they can crit); a new one starts them again. Call of Flame adds ticks.
  applyDot(id, target) {
    const ab = ABILITIES[id];
    const own = this.own(target);
    const ticks = ab.dot.ticks + (TALENT.callOfFlame.flameShockTicks[this.tal.callOfFlame] || 0);
    const token = Symbol(id);
    own[id] = token;
    own[`${id}End`] = this.t + ab.dot.period * ticks;
    for (let k = 1; k <= ticks; k++) {
      this.schedule(this.t + ab.dot.period * k, () => {
        if (own[id] !== token) return;
        let dmg = (ab.dot.tick + this.spellPower(ab.school) * ab.dot.coef) * this.spellMult(id, target);
        const crit = this.rng() < this.critChance();
        if (crit) dmg *= this.critMult();
        this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
      });
    }
  }

  // Water Shield: a globe for mana, once in 3.5 sec (a spell's crit, a hit taken).
  waterGlobe() {
    const ws = this.aura('waterShield');
    const ab = ABILITIES.waterShield;
    if (!ws || (this.procIcd.waterShield || 0) > this.t) return;
    this.procIcd.waterShield = this.t + ab.icd;
    this.addMana(this.maxMana * ab.manaPct, ab.name);
    if (--ws.stacks <= 0) this.dropAura('waterShield');
  }
  onStruck() { this.waterGlobe(); }

  // How long a totem stands (Trial by Fire lengthens Magma Totem).
  totemDuration(id) { return ABILITIES[id].duration + (id === 'magmaTotem' ? TALENT.trialByFire.magmaTotem[this.tal.trialByFire] || 0 : 0); }

  // A totem stands in its element's slot, taking down the one there. Searing Totem attacks the target every 2.2 s,
  // Magma Totem pulses on every enemy near it every 2 s.
  dropTotem(id) {
    const ab = ABILITIES[id];
    const slot = ab.totem;
    const totem = { id, start: this.t, end: this.t + this.totemDuration(id), token: Symbol(id) };
    this.totems[slot] = totem;
    if (slot === 'water') this.syncMana();
    this.emit({ type: 'totem', slot, id, end: totem.end });
    // Mana Tide: mana every few seconds while it stands.
    if (ab.pulse) {
      for (let k = 1; this.t + ab.pulse.period * k <= totem.end; k++) {
        this.schedule(this.t + ab.pulse.period * k, () => { if (this.totems[slot] === totem) this.addMana(ab.pulse.mana, ab.name); });
      }
    }
    if (!ab.attack) return;
    const a = ab.attack;
    for (let k = 1; this.t + a.period * k <= totem.end; k++) {
      this.schedule(this.t + a.period * k, () => {
        if (this.totems[slot] !== totem || !this.started) return;
        // The totem stands beside you: a pulse reaches the enemies within its radius of you (and the target near it).
        const targets = a.radius ? this.targets.filter((t) => !t.dead && this.geo.dist[t.i] <= a.radius + 2) : [this.target];
        for (const target of targets) {
          if (target.dead || this.geo.dist[target.i] > 20 + 10) continue;
          if (this.rng() >= this.hitChance()) { this.record(id, ab.name, 0, 'miss', target.i); continue; }
          let dmg = (a.base * (1 + (this.rng() - 0.5) * a.variance) + this.spellPower(ab.school) * a.coef) * this.spellMult(id, target);
          const crit = this.rng() < this.critChance();
          if (crit) dmg *= this.critMult();
          this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
        }
      });
    }
  }
}
