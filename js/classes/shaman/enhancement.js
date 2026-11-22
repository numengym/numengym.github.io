// The Enhancement Shaman: the shaman's spells, totems and mana (classes/shaman/fight.js) with the melee back on: the
// two-hander swinging, Stormstrike and its debuff, the main hand's imbue (Windfury Weapon's strikes, or Flametongue
// Weapon on every main-hand hit), Maelstrom Weapon making
// Lightning Bolt instant, Flurry, Elemental Devastation, Fire Nova off the fire totem, Rage of the Farseer, and your own
// Strength of Earth and Windfury Totems for yourself. Formulas follow wowsims/forever sim/shaman/*.go.
import { ABILITIES, ALACRITY, ENH_IMBUE, FARSEER, FLAMETONGUE, STORMSTRIKE, TALENT, WINDFURY_WEAPON } from '../../data/shaman.js';
import { BUFF_GROUPS } from '../../data/buffs.js';
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
    // The main hand's imbue (wowsims enhancementShaman classOptions.imbueMh): Windfury Weapon or Flametongue Weapon.
    this.imbue = (sheet.classOptions || {}).imbueMh || ENH_IMBUE;
  }

  get melee() { return true; }

  onItemSwap(delta) {
    const int = this.int;
    super.onItemSwap(delta);
    this.c.ap += (this.int - int) * (TALENT.mentalDexterity.apPerInt[this.tal.mentalDexterity] || 0);
  }

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
    if (ab.costPct) return Math.round(ab.costPct * this.cs.base.mana);
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
        // 100% of normalized weapon damage, 8 s cooldown (17364 effect 3, push 114027: wowsims a63f2b37f; was 150% and 6 s).
        const o = this.strike(id, ab.name, () => this.weaponDamage('mh', true) * ab.weaponPct);
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
    // Maelstrom Weapon is spent by the Lightning Bolt it made faster, and Maelstrom Ready! goes with it; a Chain
    // Lightning takes Maelstrom Ready! off (talents_enhancement.go applyMaelstromWeapon, wowsims bc17504).
    if (LIGHTNING_BOLTS.has(id)) { this.dropAura('maelstromWeapon'); this.maelstromReady = false; }
    if (id === 'chainLightning') this.maelstromReady = false;
  }

  // Clearcasting stays on a Lightning Bolt that consumes five Maelstrom Weapon stacks, and on a Chain Lightning cast
  // while Maelstrom Ready! (408501) is up: it goes up as the stacks reach five and comes off with them or at the next
  // Chain Lightning. Both are read before the cast spends them (talents_elemental.go applyElementalFocus, EV-0180,
  // wowsims bc17504 / 53b703f).
  keepsClearcasting(id) {
    const mw = this.aura('maelstromWeapon');
    if (LIGHTNING_BOLTS.has(id)) return !!mw && mw.stacks >= TALENT.maelstromWeapon.maxStacks;
    return id === 'chainLightning' && !!mw && !!this.maelstromReady;
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

  // Your own Windfury Totem gives you its strikes.
  windfuryTotemAp() { return this.totemUp('air', 'windfuryTotem') ? Math.max(WINDFURY_AP, this.c.windfuryAp || 0) : this.c.windfuryAp || 0; }

  // A landed main-hand hit: Flametongue Weapon's fire (with that imbue), Maelstrom Weapon (6-10 per minute by rank at the weapon's speed, not off Windfury Totem's strike). Flurry
  // (wowsims 449d153 talents_enhancement.go applyFlurry): any melee crit gives three faster swings; a white swing spends
  // one whatever its outcome, misses, dodges and parries included (0.5 s apart), and so does a Windfury Weapon strike;
  // Windfury Totem's strike 10610, Stormstrike and spells spend none (EV-0010, wowsims bc17504). A white swing in the
  // instant of a gain spends none; a Windfury Weapon strike in the instant a white or Stormstrike crit gained the
  // charges spends one (such a crit and its two strikes leave two), but none in the instant a Windfury Weapon strike's
  // own crit gained them. A Windfury Weapon strike can proc Maelstrom Weapon.
  afterProcs(outcome, target, { white = false, windfury = false, windfuryWeapon = false } = {}) {
    const t = this.tal;
    if (t.flurry) {
      if (outcome === 'crit') {
        this.setAura('flurry', TALENT.flurry.duration, TALENT.flurry.charges);
        this.flurryGainedAt = this.t;
        this.flurryGainedByImbue = windfuryWeapon;
      } else {
        const fl = this.aura('flurry');
        const blocked = this.flurryGainedAt === this.t && (!windfuryWeapon || this.flurryGainedByImbue);
        if (fl && (white || windfuryWeapon) && !blocked && (this.icd.flurry || 0) <= this.t) {
          this.icd.flurry = this.t + TALENT.flurry.icd;
          if (--fl.stacks <= 0) this.dropAura('flurry'); else this.emit({ type: 'aura', id: 'flurry' });
        }
      }
    }
    if (!this.landed(outcome)) return;
    if (white) this.rollFuriousStorm(this.c.mh.speed);
    if (this.imbue === 'FlametongueWeapon') this.flametongue(target);
    // Windfury Totem's strike 10610 never procs Maelstrom Weapon (0 of 261 landed strikes in logs; Windfury Weapon's
    // strike does): wowsims 434723c / 743ed9b, talents_enhancement.go applyMaelstromWeapon.
    if (t.maelstromWeapon && !windfury && this.rng() < TALENT.maelstromWeapon.ppm[t.maelstromWeapon] * this.c.mh.speed / 60) {
      const a = this.aura('maelstromWeapon');
      const max = TALENT.maelstromWeapon.maxStacks;
      const stacks = Math.min(max, (a ? a.stacks : 0) + 1);
      // Maelstrom Ready! goes up as the stacks reach five (a refresh at five leaves it as it is) and comes off with them.
      if (!a) this.maelstromReady = false;
      if (stacks === max && (!a || a.stacks < max)) this.maelstromReady = true;
      this.setAura('maelstromWeapon', TALENT.maelstromWeapon.duration, stacks);
    }
  }

  // Improved Stormstrike: a swing you dodge or parry can make Stormstrike ready at once.
  onAvoid(outcome) {
    if (outcome !== 'dodge' && outcome !== 'parry') return;
    const chance = TALENT.improvedStormstrike.chance[this.tal.improvedStormstrike] || 0;
    if (chance && this.rng() < chance) this.cds.stormstrike = 0;
  }

  // Windfury Weapon (wowsims weapon_imbues.go RegisterWindfuryImbue, 439431): a landed main-hand swing or melee ability
  // rolls 20%, once per 1.5 s, and two strikes follow in the same instant. The strikes are main-hand abilities: they
  // roll Windfury Totem's proc like any, and land inside the 1.5 s they started, so never Windfury Weapon again.
  maybeWindfury() {
    super.maybeWindfury();
    this.maybeWindfuryWeapon();
  }
  windfuryAttack() {
    const outcome = super.windfuryAttack();
    if (outcome && this.landed(outcome)) this.maybeWindfuryWeapon();
    return outcome;
  }
  maybeWindfuryWeapon() {
    if (this.imbue !== 'WindfuryWeapon') return;
    if ((this.icd.windfuryWeapon || 0) > this.t || this.rng() >= WINDFURY_WEAPON.chance) return;
    this.icd.windfuryWeapon = this.t + WINDFURY_WEAPON.icd;
    this.emit({ type: 'windfuryProc' });
    for (let i = 0; i < WINDFURY_WEAPON.strikes; i++) this.windfuryWeaponStrike();
  }
  // 439440: the main hand's weapon damage with 16361's 333 attack power (times 1 + Elemental Weapons' 13/27/40%) added,
  // on the special table of miss, dodge, parry and crit, never a glancing blow (OutcomeMeleeWeaponSpecialHitAndCrit).
  windfuryWeaponStrike() {
    const target = this.target;
    if (!target || target.dead) return;
    const ap = WINDFURY_WEAPON.ap * (1 + (TALENT.elementalWeapons.windfury[this.tal.elementalWeapons] || 0));
    const outcome = this.rollYellow('mh', target);
    const via = this.via;
    this.via = 'wf';
    this.deal('windfuryWeapon', 'Windfury Weapon', this.landed(outcome) ? this.weaponDamage('mh', false, ap) : 0, outcome, target, { yellow: true });
    this.afterMelee(outcome, target, { hand: 'mh', yellow: true, windfuryWeapon: true, id: 'windfuryWeapon' });
    this.via = via;
    if (this.landed(outcome)) super.maybeWindfury();
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
