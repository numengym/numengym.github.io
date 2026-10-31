// The Balance Druid on the shared caster (classes/caster.js: mana with the five-second rule, casts): Wrath, Starfire,
// Moonfire and Insect Swarm ticking on the target, Eclipse charges from Wrath, Nature's Grace after a crit,
// Innervate, Moonkin Form and the Balance talents. Formulas follow wowsims/forever sim/druid/*.go.
import { ABILITIES, AURAS, IDOL_OF_THE_MOON, MOONGLOW, SPELL_CRIT_BONUS, SPELL_MISS, TALENT, parseTalents } from '../../data/druid.js';
import { MANA } from '../../data/class-stats.js';
import { RATING } from '../../data/warrior.js';
import { CasterFight } from '../caster.js';

const MIN_GCD = 1;

// Nature's Focus (wowsims/forever 17063): 14% less pushback a rank on Wrath, Starfire and the heals.
export class DruidFight extends CasterFight {
  pushbackResist() { return 0.14 * (this.tal.naturesFocus || 0); }
  static ABILITIES = ABILITIES;
  static AURA_NAMES = Object.fromEntries(Object.entries(AURAS).map(([id, a]) => [id, a.name]));
  static PREPULL = new Set([]);

  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    this.tal = parseTalents(sheet.talents);
    this.initMana(0, this.racial.maxRageMult || 1);
    // Nature's Majesty: crit with spells too.
    this.baseCritPct += TALENT.naturesMajesty.critPct[this.tal.naturesMajesty] || 0;
    this.idol = (sheet.itemIds || []).includes(IDOL_OF_THE_MOON.id) ? IDOL_OF_THE_MOON.base : 0;
  }

  // ---- mana ---------------------------------------------------------------------------------------

  castingShare() { return this.aura('innervate') ? 1 : TALENT.reflection.casting[this.tal.reflection] || 0; }
  // Innervate: the spirit regen 5 times as fast, all of it while casting.
  spiritRegen() {
    const spi = (this.c.spi || 0) + this.tempStats().spi;
    return (MANA.spiritBase + spi * MANA.perSpirit) * (this.aura('innervate') ? ABILITIES.innervate.regen : 1);
  }
  regenAura(id) { return id === 'innervate'; }

  // ---- spell stats -----------------------------------------------------------------------------------

  spellPower(school) {
    return (this.c.spellPower || 0) + ((this.c.schoolPower || {})[school] || 0) + this.tempStats().spellPower;
  }

  // Nature's Reach: hit with every spell.
  hitChance() {
    const hit = (this.c.spellHitPct || 0) + this.tempStats().hitRating / RATING.hit + (TALENT.naturesReach.hitPct[this.tal.naturesReach] || 0);
    return 1 - Math.max(0, SPELL_MISS - hit / 100);
  }

  critChance(id) {
    let crit = this.baseCritPct + this.tempStats().critRating / RATING.crit + this.tempStats().critPct;
    crit += this.tempStats().int * this.cs.critPerInt * (this.c.statMult || 1);
    if (id === 'moonfire') crit += TALENT.improvedMoonfire.critPct[this.tal.improvedMoonfire] || 0;
    const r = this.racialActive();
    if (r && r.critPct) crit += r.critPct;
    return Math.min(1, crit / 100);
  }

  // Vengeance raises the crit bonus of the Balance spells.
  critMult() { return 1 + SPELL_CRIT_BONUS * (1 + (TALENT.vengeance.critBonus[this.tal.vengeance] || 0)); }

  // Damage multipliers: Moonfury (Arcane and Nature), Naturalist (all), Improved Moonfire, Genesis (ticks), Curse of
  // the Elements, item buffs, the racial.
  spellMult(id, target, periodic = false) {
    let m = this.damageMult();
    m *= 1 + (TALENT.moonfury.dmg[this.tal.moonfury] || 0);
    m *= 1 + (TALENT.naturalist.dmg[this.tal.naturalist] || 0);
    if (id === 'moonfire') m *= 1 + (TALENT.improvedMoonfire.dmg[this.tal.improvedMoonfire] || 0);
    if (periodic) m *= 1 + (TALENT.genesis.periodic[this.tal.genesis] || 0);
    m *= (1 + (this.enc.raid.spellDmgTaken || this.c.raidSpellDmgTaken || 0)) * this.spellVulnMult(target);
    const r = this.racialActive();
    if (r && r.damagePct && r.abilities && r.abilities.includes(id)) m *= 1 + r.damagePct / 100;
    return m;
  }

  // ---- casting -------------------------------------------------------------------------------------------

  // Cast speed: haste and Nature's Grace.
  castSpeed() { return this.hasteMult() * (this.aura('naturesGrace') ? 1 + TALENT.naturesGrace.haste : 1); }

  // The global cooldown takes the cast speed, and Nature's Grace cuts it by 10% more (1.227 s).
  gcdFor() {
    const gcd = 1.5 / this.castSpeed() * (this.aura('naturesGrace') ? 1 - TALENT.naturesGrace.gcdCut : 1);
    return Math.max(MIN_GCD, gcd);
  }

  castTime(id) {
    const ab = ABILITIES[id];
    if (!ab || !ab.castTime) return 0;
    let t = ab.castTime;
    if (id === 'wrath') t -= TALENT.improvedWrath.cast[this.tal.improvedWrath] || 0;
    if (id === 'starfire') {
      t -= TALENT.improvedStarfire.cast[this.tal.improvedStarfire] || 0;
      if (this.aura('eclipse')) t -= TALENT.eclipse.cast[this.tal.eclipse] || 0;
    }
    return Math.max(0, t / this.castSpeed());
  }

  cost(id) {
    const ab = ABILITIES[id];
    if (!ab) return 0;
    let cost = ab.costPct ? ab.costPct * this.cs.base.mana : ab.cost || 0;
    if (!cost) return 0;
    if (id === 'wrath') cost *= 1 - (TALENT.improvedWrath.cost[this.tal.improvedWrath] || 0);
    if (MOONGLOW.has(id)) cost *= 1 - (TALENT.moonglow.cost[this.tal.moonglow] || 0);
    const r = this.racialActive();
    if (r && r.costPct && r.abilities && r.abilities.includes(id)) cost *= 1 + r.costPct / 100;
    return Math.max(0, cost);
  }

  classBlocker(id) {
    if (id === 'innervate' && this.aura('innervate')) return 'Already active';
    return null;
  }

  // A cast lands: its mana is spent now, then the spell resolves.
  completeCast(c) {
    const id = c.id;
    const ab = ABILITIES[id];
    this.spendMana(this.cost(id), id);
    switch (id) {
      case 'innervate': this.setAura('innervate', ab.duration); return;
      case 'racial': {
        const r = this.racial.active;
        this.cds.racial = this.t + r.cd;
        this.setAura('racial', r.duration, 0, { name: r.name, icon: r.icon });
        return;
      }
      default: break;
    }
    if (!ab.spell) return;
    // Every Starfire cast spends an Eclipse charge, a missed one too.
    if (id === 'starfire') this.spendEclipse();
    const target = this.target;
    if (this.rng() >= this.hitChance()) { this.record(id, ab.name, 0, 'miss', target.i); return; }
    this.judgementOfWisdom();
    // Eclipse: a Wrath that lands gives Starfire charges.
    if (id === 'wrath' && this.tal.eclipse) {
      const e = this.aura('eclipse');
      this.setAura('eclipse', TALENT.eclipse.duration, Math.min(TALENT.eclipse.maxCharges, (e ? e.stacks : 0) + TALENT.eclipse.charges));
    }
    if (ab.base) this.directHit(id, target);
    if (ab.dot) this.applyDot(id, target);
  }

  // Hurricane: each second on every enemy in the area at your target (hit roll, crit), slowing their attacks.
  channelTick(c) {
    if (c.id !== 'hurricane') return;
    const ab = ABILITIES.hurricane;
    for (const t of this.areaTargets(ab.radius, true)) {
      if (this.rng() >= this.hitChance()) { this.record('hurricane', ab.name, 0, 'miss', t.i); continue; }
      let dmg = (ab.tick + this.spellPower(ab.school) * ab.coef) * this.spellMult('hurricane', t, true);
      const crit = this.rng() < this.critChance('hurricane');
      if (crit) dmg *= this.critMult();
      this.record('hurricane', ab.name, dmg, crit ? 'crit' : 'hit', t.i);
      t.slow = Math.max(t.tcEnd > this.t ? t.slow : 0, ab.slow);
      t.tcEnd = Math.max(t.tcEnd || 0, this.t + 1.5);
    }
  }

  spendEclipse() {
    const e = this.aura('eclipse');
    if (!e) return;
    if (--e.stacks <= 0) this.dropAura('eclipse');
  }

  directHit(id, target) {
    const ab = ABILITIES[id];
    let base = ab.base * (1 + (this.rng() - 0.5) * (ab.variance || 0));
    if (id === 'moonfire') base += this.idol;
    let dmg = (base + this.spellPower(ab.school) * ab.coef) * this.spellMult(id, target);
    const crit = this.rng() < this.critChance(id);
    if (crit) dmg *= this.critMult();
    this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
    // Nature's Grace: a direct spell's crit makes you cast faster for 3 s.
    if (crit && this.tal.naturesGrace) this.setAura('naturesGrace', TALENT.naturesGrace.duration);
  }

  // Moonfire's and Insect Swarm's ticks (they can crit); a new one starts them again. Nature's Splendor adds a tick.
  applyDot(id, target) {
    const ab = ABILITIES[id];
    const own = this.own(target);
    const extra = this.tal.naturesSplendor ? (id === 'moonfire' ? TALENT.naturesSplendor.moonfireTicks : TALENT.naturesSplendor.insectSwarmTicks) : 0;
    const ticks = ab.dot.ticks + extra;
    const key = `${id}Dot`;
    const token = Symbol(id);
    own[key] = token;
    own[`${id}End`] = this.t + ab.dot.period * ticks;
    for (let k = 1; k <= ticks; k++) {
      this.schedule(this.t + ab.dot.period * k, () => {
        if (own[key] !== token) return;
        let dmg = (ab.dot.tick + this.spellPower(ab.school) * ab.dot.coef) * this.spellMult(id, target, true);
        const crit = this.rng() < this.critChance(id); // Improved Moonfire's crit reaches the ticks too
        if (crit) dmg *= this.critMult();
        this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
      });
    }
  }
}
