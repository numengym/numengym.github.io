// The mage on the shared caster (classes/caster.js: mana with the five-second rule, casts and channels): spell hit
// and crit against a level 63 boss, and the mage's spells, procs and talents. Formulas follow wowsims/forever
// sim/mage/*.go and sim/core/mana.go.
import {
  ABILITIES, AURAS, BARRAGE_HALF, CRITICAL_MASS, HEATING_UP, INCINERATION, SPELL_CRIT_BONUS, SPELL_MISS, TALENT, parseTalents,
} from '../../data/mage.js';
import { RATING } from '../../data/warrior.js';
import { CasterFight } from '../caster.js';

const ARCANE_CHARGES = { max: 4, duration: 15, intShare: 0.15, costPerStack: 1.75 }; // 400573
const HEATING_UP_STACKS = { max: 3, duration: 20, castCut: 0.25 };                     // 400625

export class MageFight extends CasterFight {
  static ABILITIES = ABILITIES;
  static AURA_NAMES = Object.fromEntries(Object.entries(AURAS).map(([id, a]) => [id, a.name]));
  // Usable before the pull without starting the fight.
  static PREPULL = new Set(['iceBarrier', 'mageArmor', 'arcanePower', 'presenceOfMind', 'combustion']);

  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    this.tal = parseTalents(sheet.talents);
    // Gnome Eureka! for mages (1259817): 10% less mana and 10% more damage on the mage's spells for 8 s.
    const r = this.racial.active;
    if (r && r.abilities) this.racial = { ...this.racial, active: { ...r, spellId: 1259817, abilities: Object.keys(ABILITIES).filter((k) => ABILITIES[k].spell) } };
    // Arcane Mind raises Intellect: more mana and spell crit. Gnome Expansive Mind: 5% more maximum mana (the
    // warrior's maxRageMult).
    this.initMana(sheet.int * (TALENT.arcaneMind.int[this.tal.arcaneMind] || 0), this.racial.maxRageMult || 1);
    this.combustionCharges = 0;
    // Mage Armor is up from the start (wowsims DefaultOptions: defaultMageArmor).
    this.setAura('mageArmor', ABILITIES.mageArmor.duration);
  }

  // ---- mana ---------------------------------------------------------------------------------------

  // Mana per second outside and inside the five-second rule (mana.go), Evocation's 16 times the spirit regen.
  regenRates() {
    const evo = this.aura('evocation');
    const spirit = this.spiritRegen() * (evo ? ABILITIES.evocation.regen : 1);
    const mp5 = ((this.c.mp5 || 0) + this.tempStats().mp5) / 5;
    const share = evo ? 1 : Math.min(1, (this.aura('mageArmor') ? ABILITIES.mageArmor.casting : 0) + (TALENT.arcaneMeditation.casting[this.tal.arcaneMeditation] || 0));
    return { free: mp5 + spirit, casting: mp5 + spirit * share };
  }
  regenAura(id) { return id === 'evocation' || id === 'mageArmor'; }

  // ---- spell stats -----------------------------------------------------------------------------------

  spellPower(school, id) {
    let sp = (this.c.spellPower || 0) + ((this.c.schoolPower || {})[school] || 0) + this.tempStats().spellPower;
    const charges = this.aura('arcaneCharges');
    if (charges) sp += ARCANE_CHARGES.intShare * this.intellect() * charges.stacks; // every magic school
    if (id === 'arcaneWrath') sp += ABILITIES.arcaneWrath.manaShare * this.maxMana;
    return sp;
  }

  hitChance(school) {
    let hit = (this.c.spellHitPct || 0) + this.tempStats().hitRating / RATING.hit;
    if (school === 'arcane') hit += TALENT.arcaneFocus.hitPct[this.tal.arcaneFocus] || 0;
    if (school === 'fire' || school === 'frost') hit += TALENT.elementalPrecision.hitPct[this.tal.elementalPrecision] || 0;
    return 1 - Math.max(0, SPELL_MISS - hit / 100);
  }

  critChance(id, school, frozen) {
    const t = this.tal;
    let crit = this.baseCritPct + this.tempStats().critRating / RATING.crit + this.tempStats().critPct;
    crit += this.tempStats().int * this.cs.critPerInt * (this.c.statMult || 1);
    crit += TALENT.arcaneInstability.critPct[t.arcaneInstability] || 0;
    if (school === 'arcane') crit += TALENT.arcaneImpact.critPct[t.arcaneImpact] || 0;
    if (CRITICAL_MASS.has(id)) crit += TALENT.criticalMass.critPct[t.criticalMass] || 0;
    if (INCINERATION.has(id)) crit += TALENT.incineration.critPct[t.incineration] || 0;
    if (school === 'fire') { const c = this.aura('combustion'); if (c) crit += ABILITIES.combustion.critPerStack * c.stacks; }
    if (frozen) crit += TALENT.shatter.critPct[t.shatter] || 0;
    const r = this.racialActive();
    if (r && r.critPct) crit += r.critPct;
    return Math.min(1, crit / 100);
  }

  critMult(school) {
    let bonus = 0;
    if (school === 'frost') bonus += TALENT.iceShards.critBonus[this.tal.iceShards] || 0;
    if (school === 'arcane') bonus += TALENT.arcaneMind.critBonus[this.tal.arcaneMind] || 0;
    return 1 + SPELL_CRIT_BONUS * (1 + bonus);
  }

  // Damage multipliers: talents, buffs, and the target's debuffs (Curse of the Elements, your Fire Vulnerability).
  spellMult(id, school, target, periodic = false) {
    let m = this.damageMult(); // item buffs
    m *= 1 + (TALENT.arcaneInstability.dmg[this.tal.arcaneInstability] || 0);
    if (this.aura('arcanePower')) m *= 1 + ABILITIES.arcanePower.dmg;
    if (school === 'frost' && this.aura('iceBarrier')) m *= 1 + ABILITIES.iceBarrier.frostDmg;
    if (id === 'coneOfCold') m *= 1 + (TALENT.improvedConeOfCold.dmg[this.tal.improvedConeOfCold] || 0);
    m *= 1 + (this.enc.raid.spellDmgTaken || this.c.raidSpellDmgTaken || 0);
    if (school === 'fire') {
      const own = this.own(target);
      const fv = own.fvEnd > this.t ? own.fv : 0;
      m *= 1 + fv * TALENT.improvedScorch.perStack;
      if (this.tal.firePower && !periodic) {
        const effects = (fv ? 1 : 0) + (own.igniteEnd > this.t ? 1 : 0) + (own.fireballDotEnd > this.t ? 1 : 0) + (own.pyroblastDotEnd > this.t ? 1 : 0);
        m *= 1 + TALENT.firePower.perEffect[this.tal.firePower] * Math.min(TALENT.firePower.maxEffects, effects);
      }
    }
    const r = this.racialActive();
    if (r && r.damagePct && r.abilities && r.abilities.includes(id)) m *= 1 + r.damagePct / 100;
    return m;
  }

  // ---- casting -------------------------------------------------------------------------------------------

  castTime(id) {
    const ab = ABILITIES[id];
    if (!ab || !ab.castTime) return 0;
    if (this.aura('presenceOfMind')) return 0;
    let t = ab.castTime;
    if (id === 'fireball') t -= TALENT.improvedFireball.cast[this.tal.improvedFireball] || 0;
    if (id === 'frostbolt') t -= TALENT.improvedFrostbolt.cast[this.tal.improvedFrostbolt] || 0;
    if (id === 'pyroblast') { const h = this.aura('heatingUp'); if (h) t *= 1 - HEATING_UP_STACKS.castCut * h.stacks; }
    return Math.max(0, t / this.hasteMult());
  }

  cooldownBonus(id, cd) {
    if (id === 'fireBlast') cd -= TALENT.improvedFireBlast.cd[this.tal.improvedFireBlast] || 0;
    return cd;
  }

  cost(id) {
    const ab = ABILITIES[id];
    if (!ab) return 0;
    let cost = ab.costPct ? ab.costPct * this.cs.base.mana : ab.cost || 0;
    if (!cost) return 0;
    let more = 0;
    if (id === 'arcaneBlast') { const c = this.aura('arcaneCharges'); if (c) more += ARCANE_CHARGES.costPerStack * c.stacks; }
    if (this.aura('arcanePower') && ab.spell) more += ABILITIES.arcanePower.costMore;
    if (ab.school === 'frost') more -= TALENT.frostChanneling.cost[this.tal.frostChanneling] || 0;
    cost *= 1 + more;
    if (id === 'arcaneMissiles' && this.aura('missileBarrage')) cost = 0;
    if (ab.spell && this.aura('clearcasting')) cost = 0;
    const r = this.racialActive();
    if (r && r.costPct && r.abilities && r.abilities.includes(id)) cost *= 1 + r.costPct / 100;
    return Math.max(0, cost);
  }

  spellRange(id) { return ABILITIES[id].range || (id === 'fireball' || id === 'pyroblast' ? 35 : 30); }
  classBlocker(id) {
    if (id === 'presenceOfMind' && this.aura('presenceOfMind')) return 'Already active';
    if (id === 'combustion' && this.aura('combustion')) return 'Already active';
    return null;
  }
  // Presence of Mind and Combustion: their cooldowns start once they are spent.
  cdOnCast(id) { return !['presenceOfMind', 'combustion'].includes(id); }
  onChannelCancelled(c) { if (c.id === 'evocation') this.dropAura('evocation'); }

  // A cast lands: its mana is spent now, then the spell resolves.
  completeCast(c) {
    const id = c.id;
    const ab = ABILITIES[id];
    const cost = this.cost(id);
    const pom = ab.castTime ? this.aura('presenceOfMind') : null;
    this.spendMana(cost, id);
    this.magisterProc(ab);
    // Clearcasting made the spell free: it is spent.
    if (ab.spell && (ab.cost || ab.costPct) && this.aura('clearcasting')) this.dropAura('clearcasting');
    // Presence of Mind is spent by a spell that had a cast time; its cooldown starts then.
    if (pom && ab.castTime) { this.dropAura('presenceOfMind'); this.cds.presenceOfMind = this.t + ABILITIES.presenceOfMind.cd; }
    switch (id) {
      case 'arcanePower': this.setAura('arcanePower', ab.duration); return;
      case 'presenceOfMind': this.setAura('presenceOfMind', Infinity); return;
      case 'combustion':
        this.combustionCharges = ab.charges;
        this.setAura('combustion', Infinity, 1);
        return;
      case 'coldSnap': this.cds.coneOfCold = 0; this.cds.iceBarrier = 0; return;
      case 'iceBarrier': this.setAura('iceBarrier', ab.duration); return;
      case 'mageArmor': this.setAura('mageArmor', ab.duration); return;
      case 'manaGem': this.used[id] = true; this.addMana(ab.mana * (1 + (this.rng() - 0.5) * ab.variance), ab.name); return;
      case 'racial': {
        const r = this.racial.active;
        this.cds.racial = this.t + r.cd;
        this.setAura('racial', r.duration, 0, { name: r.name, icon: r.icon });
        return;
      }
      default: break;
    }
    if (!ab.spell) return;
    const frozen = !!this.aura('fingersOfFrost');
    const grantsBefore = this.fofGrants || 0;
    if (id === 'coneOfCold') {
      for (const t of this.targets) if (!t.dead && this.geo.dist[t.i] <= ab.range) this.spellHit(id, t, { frozen });
    } else this.spellHit(id, this.target, { frozen });
    // Fingers of Frost: every damage spell cast spends a charge, except the one that granted them. The charge goes a
    // moment after the cast, so a spell cast straight after it (Ice Lance after Frostbolt) still reads the target as
    // Frozen and shares the charge (wowsims: a spell batch; here 0.25 s, a player's reaction).
    if (this.aura('fingersOfFrost') && (this.fofGrants || 0) === grantsBefore) this.spendFingers();
    if (id === 'pyroblast') this.dropAura('heatingUp');
  }

  spendFingers() {
    if (this.fofSpendAt > this.t) return; // one already pending: this spell shares it
    const at = this.t + 0.25;
    this.fofSpendAt = at;
    this.schedule(at, () => {
      const fof = this.aura('fingersOfFrost');
      if (fof && this.fofSpendAt === at) { fof.stacks--; if (fof.stacks <= 0) this.dropAura('fingersOfFrost'); }
    });
  }

  // Magister's Regalia 5 pieces (450527): a 5% chance on a spell cast to restore 200 mana.
  magisterProc(ab) {
    if (ab.spell && ((this.c.sets || {})["Magister's Regalia"] || 0) >= 5 && this.rng() < 0.05) this.addMana(200, 'Sudden Insight');
  }

  // A channel: Arcane Missiles fires a missile per tick; Evocation regenerates mana. The mana is spent at its start.
  beginChannel(id) {
    const ab = ABILITIES[id];
    const barrage = id === 'arcaneMissiles' && this.aura('missileBarrage');
    const period = (ab.channel / ab.ticks) * (barrage ? 0.5 : 1) / this.hasteMult();
    this.spendMana(this.cost(id), id);
    this.magisterProc(ab);
    if (barrage) this.dropAura('missileBarrage');
    if (this.aura('clearcasting') && ab.spell) this.dropAura('clearcasting');
    const c = { id, start: this.t, end: this.t + period * ab.ticks, channel: true, resets: false };
    this.casting = c;
    this.emit({ type: 'castStart', id, end: c.end });
    if (id === 'evocation') this.setAura('evocation', period * ab.ticks);
    for (let k = 1; k <= ab.ticks; k++) {
      this.schedule(this.t + period * k, () => {
        if (this.casting !== c) return;
        if (id === 'arcaneMissiles') {
          const frozen = !!this.aura('fingersOfFrost');
          const landed = this.spellHit(id, this.target, { frozen, missile: true });
          if (landed && this.aura('fingersOfFrost')) this.spendFingers();
        }
        if (k === ab.ticks) { this.casting = null; this.emit({ type: 'castEnd', id }); }
      });
    }
  }

  // One spell's hit on a target: hit roll, damage, crit, then the procs. Returns whether it landed.
  spellHit(id, target, { frozen = false, missile = false } = {}) {
    const ab = ABILITIES[id];
    const school = ab.school;
    if (this.rng() >= this.hitChance(school)) { this.record(id, ab.name, 0, 'miss', target.i); return false; }
    let coef = ab.coef;
    const own = this.own(target);
    let more = 1;
    if (id === 'coneOfCold' && own.wcEnd > this.t && own.wc) {
      coef += TALENT.wintersChill.coefPerStack * own.wc;
      more *= 1 + TALENT.wintersChill.perStack * own.wc;
      own.wc = 0;
    }
    if (id === 'iceLance' && frozen) more *= ab.frozen;
    let dmg = (ab.base * (1 + (this.rng() - 0.5) * (ab.variance || 0)) + this.spellPower(school, id) * coef) * this.spellMult(id, school, target) * more;
    const crit = this.rng() < this.critChance(id, school, frozen);
    if (crit) dmg *= this.critMult(school);
    this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
    this.onSpellLanded(id, ab, target, crit, dmg, { frozen, missile });
    return true;
  }

  onSpellLanded(id, ab, target, crit, dmg, { frozen, missile }) {
    const t = this.tal;
    const own = this.own(target);
    // Clearcasting (Arcane Concentration): any damage spell's hit but Arcane Missiles.
    if (t.arcaneConcentration && !missile && this.rng() < TALENT.arcaneConcentration.chance[t.arcaneConcentration]) this.setAura('clearcasting', 15);
    // Arcane Charges: Arcane Blast adds one; they last 15 s from the first and nothing spends them.
    if (id === 'arcaneBlast') {
      const ch = this.aura('arcaneCharges');
      if (ch) ch.stacks = Math.min(ARCANE_CHARGES.max, ch.stacks + 1);
      else this.setAura('arcaneCharges', ARCANE_CHARGES.duration, 1);
    }
    // Missile Barrage: Arcane Blast, or Fireball, Frostbolt and Arcane Wrath at half the chance.
    if (t.missileBarrage && (id === 'arcaneBlast' || BARRAGE_HALF.has(id))) {
      const chance = TALENT.missileBarrage.chance[t.missileBarrage] * (id === 'arcaneBlast' ? 1 : 0.5);
      if (this.rng() < chance) this.setAura('missileBarrage', 15);
    }
    // Fireball and Pyroblast burn for a while.
    if (ab.dot) this.spellDot(id, ab, target);
    // Improved Scorch: Fire Vulnerability, 3% more Fire damage from you per stack.
    if (id === 'scorch' && t.improvedScorch && this.rng() < TALENT.improvedScorch.chance[t.improvedScorch]) {
      own.fv = Math.min(TALENT.improvedScorch.maxStacks, (own.fvEnd > this.t ? own.fv : 0) + 1);
      own.fvEnd = this.t + TALENT.improvedScorch.duration;
    }
    // Heating Up: crits of Fireball, Fire Blast and Scorch, and every Fire Blast that lands.
    if (t.heatingUp && HEATING_UP.has(id)) {
      const n = (crit ? 1 : 0) + (id === 'fireBlast' ? 1 : 0);
      if (n) {
        const h = this.aura('heatingUp');
        const stacks = Math.min(HEATING_UP_STACKS.max, (h ? h.stacks : 0) + n);
        this.setAura('heatingUp', HEATING_UP_STACKS.duration, stacks);
      }
    }
    // Combustion: each Fire hit adds crit; each Fire crit spends a charge, and it ends after the last.
    const comb = this.aura('combustion');
    if (comb && ab.school === 'fire') {
      comb.stacks = Math.min(10, comb.stacks + 1);
      if (crit && --this.combustionCharges <= 0) {
        this.dropAura('combustion');
        this.cds.combustion = this.t + ABILITIES.combustion.cd;
      }
    }
    if (crit) {
      // Ignite: a share of a Fire crit's damage over 4 s; it rolls into the next.
      if (t.ignite && ab.school === 'fire') this.ignite(target, dmg * TALENT.ignite.share[t.ignite]);
      // Master of Elements: a Fire or Frost crit refunds part of the base cost.
      if (t.masterOfElements && (ab.school === 'fire' || ab.school === 'frost') && ab.cost) {
        this.addMana(ab.cost * TALENT.masterOfElements.refund[t.masterOfElements], 'Master of Elements');
      }
    }
    // Fingers of Frost: a Chill's hit (15%, and Frostbite's own chance).
    if (t.fingersOfFrost && ab.chill) {
      const chance = 1 - (1 - TALENT.fingersOfFrost.chance) * (1 - (TALENT.frostbite.chance[t.frostbite] || 0));
      if (this.rng() < chance) {
        this.fofGrants = (this.fofGrants || 0) + 1;
        this.setAura('fingersOfFrost', TALENT.fingersOfFrost.duration, TALENT.fingersOfFrost.charges[t.fingersOfFrost]);
      }
    }
    // Winter's Chill: Frostbolt, and Ice Lance on a Frozen target, stack it for your next Cone of Cold.
    if (t.wintersChill && (id === 'frostbolt' || (id === 'iceLance' && frozen)) && this.rng() < TALENT.wintersChill.chance[t.wintersChill]) {
      own.wc = Math.min(TALENT.wintersChill.maxStacks, (own.wcEnd > this.t ? own.wc : 0) + 1);
      own.wcEnd = this.t + TALENT.wintersChill.duration;
    }
  }

  // Fireball's and Pyroblast's damage over time, their own spells (no crits).
  spellDot(id, ab, target) {
    const own = this.own(target);
    const key = `${id}Dot`;
    const token = Symbol(key);
    own[key] = token;
    own[`${key}End`] = this.t + ab.dot.period * ab.dot.ticks;
    for (let k = 1; k <= ab.dot.ticks; k++) {
      this.schedule(this.t + ab.dot.period * k, () => {
        if (own[key] !== token) return;
        // The ticks crit at the spell's crit (wowsims shows crit ticks).
        const crit = this.rng() < this.critChance(id, ab.school, false);
        const dmg = (ab.dot.tick + this.spellPower(ab.school, id) * (ab.dot.coef || 0)) * this.spellMult(id, ab.school, target, true) * (crit ? this.critMult(ab.school) : 1);
        this.record(key, `${ab.name} (DoT)`, dmg, crit ? 'crit' : 'hit', target.i);
      });
    }
  }

  // Ignite (412538): two ticks over 4 s; a new crit adds its share to what has not ticked and starts again.
  ignite(target, amount) {
    const own = this.own(target);
    const { duration, period } = TALENT.ignite;
    const ticks = duration / period;
    const left = own.igniteEnd > this.t ? own.ignitePerTick * own.igniteTicksLeft : 0;
    const token = Symbol('ignite');
    own.ignite = token;
    own.ignitePerTick = (left + amount) / ticks;
    own.igniteTicksLeft = ticks;
    own.igniteEnd = this.t + duration;
    for (let k = 1; k <= ticks; k++) {
      this.schedule(this.t + period * k, () => {
        if (own.ignite !== token) return;
        own.igniteTicksLeft--;
        this.record('ignite', 'Ignite', own.ignitePerTick, 'hit', target.i);
      });
    }
  }
}
