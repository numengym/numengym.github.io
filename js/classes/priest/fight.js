// The Shadow Priest on the shared caster (classes/caster.js: mana with the five-second rule, casts and channels): spell
// hit and crit against a level 63 boss, Shadow Word: Pain and Devouring Plague ticking on the target, Mind Flay's
// channel, Shadowform, Inner Focus, Shadow Weaving and Dark Inspiration. Formulas follow wowsims/forever
// sim/priest/*.go.
import { ABILITIES, AURAS, REVELATION, SPELL_CRIT_BONUS, SPELL_MISS, TALENT, TWIN_DISCIPLINES, parseTalents } from '../../data/priest.js';
import { MANA } from '../../data/class-stats.js';
import { RATING } from '../../data/warrior.js';
import { CasterFight } from '../caster.js';

export class PriestFight extends CasterFight {
  static ABILITIES = ABILITIES;
  static AURA_NAMES = Object.fromEntries(Object.entries(AURAS).map(([id, a]) => [id, a.name]));
  static PREPULL = new Set(['shadowform', 'innerFocus']);

  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    this.tal = parseTalents(sheet.talents);
    // Gnome Eureka! for priests (1259823): less mana and more damage on the priest's spells for a while.
    const r = this.racial.active;
    if (r && r.abilities) this.racial = { ...this.racial, active: { ...r, spellId: 1259823, abilities: Object.keys(ABILITIES).filter((k) => ABILITIES[k].spell) } };
    // Mental Strength raises Intellect: more mana and spell crit.
    this.initMana(sheet.int * (TALENT.mentalStrength.int[this.tal.mentalStrength] || 0), this.racial.maxRageMult || 1);
    // APPROX: wowsims gives a priest 1% more spell crit with a main-hand weapon equipped (seen in its character sheet
    // for Human and Dwarf alike; the spell behind it is not found yet).
    if (sheet.mh && sheet.mh.icon) this.baseCritPct += 1;
    // Enchant Weapon - Revelation on the weapon: its chance per direct hit that does not crit.
    const rev = (sheet.procs || []).find((p) => p.fx && p.fx.b === REVELATION.trigger);
    this.revelationChance = rev ? rev.chance : 0;
    // Shadowform is up from the start (wowsims preShadowform).
    if (this.tal.shadowform) this.setAura('shadowform', Infinity);
  }

  // ---- mana ---------------------------------------------------------------------------------------

  // Dark Inspiration raises Spirit, so the regeneration.
  spiritRegen() {
    let spi = (this.c.spi || 0) + this.tempStats().spi;
    if (this.aura('darkInspiration')) spi *= 1 + (TALENT.darkInspiration.spi[this.tal.darkInspiration] || 0);
    return MANA.spiritBase + spi * MANA.perSpirit;
  }
  castingShare() { return TALENT.meditation.casting[this.tal.meditation] || 0; }
  regenAura(id) { return id === 'darkInspiration'; }

  // ---- spell stats -----------------------------------------------------------------------------------

  spellPower(school) {
    return (this.c.spellPower || 0) + ((this.c.schoolPower || {})[school] || 0) + this.tempStats().spellPower;
  }

  hitChance(school) {
    let hit = (this.c.spellHitPct || 0) + this.tempStats().hitRating / RATING.hit;
    if (school === 'shadow') hit += TALENT.shadowFocus.hitPct[this.tal.shadowFocus] || 0;
    return 1 - Math.max(0, SPELL_MISS - hit / 100);
  }

  // Crit: a direct spell under Inner Focus crits 25% more; Shadow Word: Death more on a low target (Early Demise).
  critChance(id, { focus = false, periodic = false } = {}) {
    let crit = this.baseCritPct + this.tempStats().critRating / RATING.crit + this.tempStats().critPct;
    crit += this.tempStats().int * this.cs.critPerInt * (this.c.statMult || 1);
    if (focus && !periodic) crit += ABILITIES.innerFocus.critPct;
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

  // Damage multipliers: Shadowform, Darkness, Twin Disciplines, your Shadow Weaving on the target, Curse of the Elements.
  spellMult(id, school, target) {
    let m = this.damageMult(); // item buffs
    if (school === 'shadow') {
      if (this.aura('shadowform')) m *= 1 + ABILITIES.shadowform.dmg;
      m *= 1 + (TALENT.darkness.dmg[this.tal.darkness] || 0);
      const own = this.own(target);
      if (own.swEnd > this.t) m *= 1 + TALENT.shadowWeaving.perStack * own.sw;
    }
    if (TWIN_DISCIPLINES.has(id)) m *= 1 + (TALENT.twinDisciplines.dmg[this.tal.twinDisciplines] || 0);
    m *= 1 + (this.enc.raid.spellDmgTaken || this.c.raidSpellDmgTaken || 0);
    const r = this.racialActive();
    if (r && r.damagePct && r.abilities && r.abilities.includes(id)) m *= 1 + r.damagePct / 100;
    return m;
  }

  // ---- casting -------------------------------------------------------------------------------------------

  cooldownBonus(id, cd) {
    if (id === 'mindBlast') cd -= TALENT.improvedMindBlast.cd[this.tal.improvedMindBlast] || 0;
    return cd;
  }

  cost(id) {
    const ab = ABILITIES[id];
    if (!ab) return 0;
    let cost = ab.costPct ? ab.costPct * this.cs.base.mana : ab.cost || 0;
    if (!cost) return 0;
    if (ab.spell && this.aura('innerFocus')) return 0;
    if (ab.school === 'shadow' && this.aura('shadowform')) cost *= 1 - ABILITIES.shadowform.costCut;
    if (ab.instant) cost *= 1 - (TALENT.mentalAgility.cost[this.tal.mentalAgility] || 0);
    if (id === 'devouringPlague') cost *= 1 - (TALENT.devouringContagion.cost[this.tal.devouringContagion] || 0);
    const r = this.racialActive();
    if (r && r.costPct && r.abilities && r.abilities.includes(id)) cost *= 1 + r.costPct / 100;
    return Math.max(0, cost);
  }

  spellRange(id) {
    const ab = ABILITIES[id];
    return (ab.range || 30) * (ab.school === 'shadow' ? 1 + (TALENT.shadowReach.range[this.tal.shadowReach] || 0) : 1);
  }
  classBlocker(id) {
    if ((id === 'shadowform' || id === 'innerFocus') && this.aura(id)) return 'Already active';
    return null;
  }
  // Inner Focus: its cooldown starts once it is spent.
  cdOnCast(id) { return id !== 'innerFocus'; }

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
    switch (id) {
      case 'shadowform': this.setAura('shadowform', Infinity); return;
      case 'innerFocus': this.setAura('innerFocus', Infinity); return;
      case 'racial': {
        const r = this.racial.active;
        this.cds.racial = this.t + r.cd;
        this.setAura('racial', r.duration, 0, { name: r.name, icon: r.icon });
        return;
      }
      default: break;
    }
    if (!ab.spell) return;
    if (ab.dot) this.applyDot(id, this.target);
    else this.spellHit(id, this.target, focus, sure);
  }

  // Mind Blast, Shadow Word: Death: hit roll, damage, crit.
  spellHit(id, target, focus, sure = false) {
    const ab = ABILITIES[id];
    if (this.rng() >= this.hitChance(ab.school)) { this.record(id, ab.name, 0, 'miss', target.i); return false; }
    let dmg = (ab.base * (1 + (this.rng() - 0.5) * (ab.variance || 0)) + this.spellPower(ab.school) * ab.coef) * this.spellMult(id, ab.school, target);
    const crit = this.rng() < this.critChance(id, { focus }) || sure;
    if (crit) dmg *= this.critMult(ab.school);
    this.record(id, ab.name, dmg, crit ? 'crit' : 'hit', target.i);
    this.onShadowHit(id, target);
    if (!crit && this.revelationChance && this.rng() < this.revelationChance) this.setAura('revelation', REVELATION.duration);
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

  // Revelation is spent by the next spell it names: that one is a sure crit.
  takeRevelation(id) {
    if (!REVELATION.spells.has(id) || !this.aura('revelation')) return false;
    this.dropAura('revelation');
    return true;
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
    const own = this.own(target);
    const ticks = ab.dot.ticks + (id === 'shadowWordPain' ? TALENT.improvedShadowWordPain.ticks[this.tal.improvedShadowWordPain] || 0 : 0);
    const token = Symbol(id);
    own[id] = token;
    own[`${id}End`] = this.t + ab.dot.period * ticks;
    for (let k = 1; k <= ticks; k++) {
      this.schedule(this.t + ab.dot.period * k, () => {
        if (own[id] !== token) return;
        this.tick(id, target, (ab.dot.tick + this.spellPower(ab.school) * ab.dot.coef) * this.spellMult(id, ab.school, target));
      });
    }
    return true;
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
    const ab = ABILITIES[id];
    const target = this.target;
    this.spendMana(this.cost(id), id);
    this.takeFocus(ab);
    const sure = this.takeRevelation(id);
    if (this.rng() >= this.hitChance(ab.school)) { this.record(id, ab.name, 0, 'miss', target.i); return; }
    this.onShadowHit(id, target);
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
}
