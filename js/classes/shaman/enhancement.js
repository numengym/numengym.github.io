// The Enhancement Shaman: the shaman's spells, totems and mana (classes/shaman/fight.js) with the melee back on: the
// two-hander swinging, Stormstrike and its debuff, Flametongue Weapon on every main-hand hit, Maelstrom Weapon making
// Lightning Bolt instant, Flurry, Elemental Devastation, Fire Nova off the fire totem, Rage of the Farseer, and your own
// Strength of Earth and Windfury Totems for yourself. Formulas follow wowsims/forever sim/shaman/*.go.
import { ABILITIES, ALACRITY, FARSEER, FLAMETONGUE, STORMSTRIKE, TALENT } from '../../data/shaman.js';
import { BUFF_GROUPS, WINDFURY } from '../../data/buffs.js';
import { ShamanFight } from './fight.js';

const LIGHTNING_BOLTS = new Set(['lightningBolt', 'lightningBoltR8']);
// What your own totems give you (the raid buffs' values).
const totemBuff = (key) => BUFF_GROUPS.flatMap((g) => Object.entries(g.buffs)).find(([k]) => k === key)[1].stats[0];
const STRENGTH_OF_EARTH = totemBuff('strengthOfEarthTotem').str;
const WINDFURY_AP = totemBuff('windfuryTotem').windfuryAp;

export class EnhancementFight extends ShamanFight {
  static PREPULL = new Set(['searingTotem', 'magmaTotem', 'manaSpringTotem', 'strengthOfEarthTotem', 'windfuryTotem']);

  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    // The melee is back: one weapon (shamans do not dual wield).
    this.mhNext = 0;
    this.ohNext = Infinity;
    this.dual = false;
    const t = this.tal;
    // Mental Dexterity: attack power from Intellect; Thundering Strikes: melee crit too.
    this.c = {
      ...sheet,
      oh: null,
      ap: sheet.ap + this.int * (TALENT.mentalDexterity.apPerInt[t.mentalDexterity] || 0),
      critPct: sheet.critPct + (TALENT.thunderingStrikes.critPct[t.thunderingStrikes] || 0),
    };
    this.icd = {};
  }

  get melee() { return true; }

  // ---- stats ---------------------------------------------------------------------------------------

  // Mental Quickness: spell damage from Intellect.
  spellPower(school) { return super.spellPower(school) + this.intellect() * (TALENT.mentalQuickness.spPerInt[this.tal.mentalQuickness] || 0); }

  // Your own Strength of Earth Totem.
  tempStats() {
    const out = super.tempStats();
    if (this.totemUp('earth', 'strengthOfEarthTotem')) out.str += STRENGTH_OF_EARTH;
    return out;
  }

  addCritBonus(crit) {
    return crit + (this.aura('elementalDevastation') ? TALENT.elementalDevastation.critPct[this.tal.elementalDevastation] : 0);
  }
  applyHasteBonus(h) {
    if (this.aura('flurry')) h *= 1 + TALENT.flurry.haste[this.tal.flurry];
    if (this.aura('rageOfTheFarseer')) h *= 1 + FARSEER.haste;
    return h;
  }

  // Improved Stormstrike: half the regen goes on while casting.
  castingShare() { return this.aura('improvedStormstrike') ? TALENT.improvedStormstrike.casting : super.castingShare(); }
  regenAura(id) { return id === 'improvedStormstrike' || super.regenAura(id); }

  // ---- casting -------------------------------------------------------------------------------------------

  maelstrom() {
    const a = this.aura('maelstromWeapon');
    return a ? (a.stacks || 1) * (TALENT.maelstromWeapon.perStack[this.tal.maelstromWeapon] || 0) : 0;
  }

  // Spells are not hastened by the melee haste (Flurry, Rage of the Farseer); Maelstrom Weapon shortens Lightning Bolt.
  castTime(id) {
    const ab = ABILITIES[id];
    if (!ab || !ab.castTime) return 0;
    let t = ab.castTime - (ALACRITY.has(id) ? TALENT.elementalAlacrity.cast[this.tal.elementalAlacrity] || 0 : 0);
    if (LIGHTNING_BOLTS.has(id)) t *= 1 - this.maelstrom();
    return Math.max(0, t);
  }

  cost(id) {
    const ab = ABILITIES[id];
    if (!ab) return 0;
    if (ab.costPct) return ab.costPct * this.cs.base.mana;
    let cost = super.cost(id);
    if (LIGHTNING_BOLTS.has(id)) cost *= 1 - this.maelstrom();
    return Math.max(0, cost);
  }


  classBlocker(id) {
    const ab = ABILITIES[id];
    if (ab.melee) {
      if (!this.inMelee()) return 'Out of range';
      if (!this.geo.facing) return 'You are facing the wrong way!';
    }
    if (id === 'rageOfTheFarseer' && this.aura('rageOfTheFarseer')) return 'Already active';
    return super.classBlocker(id);
  }

  completeCast(c) {
    const id = c.id;
    const ab = ABILITIES[id];
    switch (id) {
      case 'stormstrike': {
        this.spendMana(this.cost(id), id);
        const target = this.target;
        const o = this.strike(id, ab.name, () => this.weaponDamage('mh', true));
        if (this.landed(o)) {
          const own = this.own(target);
          own.stormstrike = 1;
          own.stormstrikeEnd = this.t + STORMSTRIKE.duration;
        }
        if (this.tal.improvedStormstrike && this.rng() < TALENT.improvedStormstrike.chance[this.tal.improvedStormstrike]) {
          this.setAura('improvedStormstrike', TALENT.improvedStormstrike.duration);
        }
        return;
      }
      case 'rageOfTheFarseer': this.setAura(id, ab.duration); return;
      default: break;
    }
    super.completeCast(c);
    // Maelstrom Weapon is spent by the Lightning Bolt it made faster.
    if (LIGHTNING_BOLTS.has(id)) this.dropAura('maelstromWeapon');
  }


  // Stormstrike's debuff: 20% more for your next Lightning Bolt, Chain Lightning or Earth Shock on the target.
  stormstrikeUp(target) { const own = this.own(target); return own.stormstrike > 0 && own.stormstrikeEnd > this.t; }
  spellMult(id, target) {
    const m = super.spellMult(id, target);
    return STORMSTRIKE.reach.has(id) && this.stormstrikeUp(target) ? m * (1 + STORMSTRIKE.bonus) : m;
  }
  spellHit(id, target, opts) {
    const landed = super.spellHit(id, target, opts);
    if (landed && STORMSTRIKE.reach.has(id) && this.stormstrikeUp(target)) this.own(target).stormstrike = 0;
    return landed;
  }

  // A direct spell's crit: Elemental Devastation (the class's spell hits report their crit here).
  rollRevelation(crit) {
    super.rollRevelation(crit);
    if (crit && this.tal.elementalDevastation) this.setAura('elementalDevastation', TALENT.elementalDevastation.duration);
  }

  // ---- melee ---------------------------------------------------------------------------------------------

  // Your own Windfury Totem gives you its extra attacks.
  maybeWindfury() {
    const ap = this.totemUp('air', 'windfuryTotem') ? Math.max(WINDFURY_AP, this.c.windfuryAp || 0) : this.c.windfuryAp;
    if (!ap || this.rng() >= WINDFURY.chance) return;
    this.emit({ type: 'windfuryProc' });
    this.whiteSwing('mh', ap, true, 'Windfury Totem');
  }

  // A landed main-hand hit: Flametongue Weapon's fire, Maelstrom Weapon (10 per minute at the weapon's speed). Flurry:
  // three faster swings after a crit, a landed white swing spends one (0.5 s apart; not the Windfury attacks).
  afterProcs(outcome, target, { white = false, extra = false } = {}) {
    if (!this.landed(outcome)) return;
    this.flametongue(target);
    const t = this.tal;
    if (t.maelstromWeapon && this.rng() < TALENT.maelstromWeapon.ppm * this.c.mh.speed / 60) {
      const a = this.aura('maelstromWeapon');
      this.setAura('maelstromWeapon', TALENT.maelstromWeapon.duration, Math.min(TALENT.maelstromWeapon.maxStacks, (a ? a.stacks : 0) + 1));
    }
    if (!t.flurry) return;
    if (outcome === 'crit') { this.setAura('flurry', TALENT.flurry.duration, TALENT.flurry.charges); return; }
    const fl = this.aura('flurry');
    if (fl && white && !extra && (this.icd.flurry || 0) <= this.t) {
      this.icd.flurry = this.t + TALENT.flurry.icd;
      if (--fl.stacks <= 0) this.dropAura('flurry'); else this.emit({ type: 'aura', id: 'flurry' });
    }
  }

  flametongue(target) {
    const name = 'Flametongue Attack';
    if (this.rng() >= this.hitChance()) { this.record('flametongue', name, 0, 'miss', target.i); return; }
    const base = FLAMETONGUE.perSpeed * this.c.mh.speed + this.spellPower('fire') * FLAMETONGUE.coef;
    let dmg = base * this.spellMult('flametongue', target) * (1 + (TALENT.elementalWeapons.flametongue[this.tal.elementalWeapons] || 0));
    const crit = this.rng() < this.critChance();
    if (crit) dmg *= this.critMult();
    this.record('flametongue', name, dmg, crit ? 'crit' : 'hit', target.i);
  }

  // The review: time doing nothing counts only the global cooldown (the swings go on).
  trackReview(newT) {
    if (newT <= this.t || !this.started) return;
    this.review.idle += Math.max(0, newT - Math.max(this.t, this.gcdEnd));
  }
}
