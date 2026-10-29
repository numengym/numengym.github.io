// The Hunter on the shared caster (classes/caster.js: mana with the five-second rule, casts, the global cooldown), with
// Auto Shot on its own timer: wowsims' ranged auto runs through casts (sim/core/attack.go), so Aimed Shot and Multi-Shot
// do not hold it. The shots, Serpent Sting, Hunter's Mark, Rapid Fire, Aspect of the Hawk and its Quick Shots, the
// Marksmanship and Survival talents. Formulas follow wowsims/forever sim/hunter/*.go.
import {
  ABILITIES, AMMO_DPS, AURAS, BARRAGE, BEASTSTALKER, EFFICIENCY, HAWK, MORTAL_SHOTS, QUIVER_HASTE, RANGED, SCOPES, TALENT, TRUESHOT_RAP,
  parseTalents,
} from '../../data/hunter.js';
import { CasterFight } from '../caster.js';

const HOME = 12; // the turret builds' shooting spot, in yards
const WINDUP = 0.5; // Auto Shot winds up before its first release

export class HunterFight extends CasterFight {
  static ABILITIES = ABILITIES;
  static AURA_NAMES = Object.fromEntries(Object.entries(AURAS).map(([id, a]) => [id, a.name]));
  static PREPULL = new Set(['huntersMark']);

  constructor(sheet, opts, rng = Math.random, encounter = null) {
    super(sheet, opts, rng, encounter);
    const t = this.tal = parseTalents(sheet.talents);
    this.initMana(0, this.racial.maxRageMult || 1);
    // Lightning Reflexes: more Agility, so more crit and ranged attack power.
    const agiMore = (sheet.agi || 0) * (TALENT.lightningReflexes.agi[t.lightningReflexes] || 0);
    // Auto Shot: the bow, gun or crossbow with the arrows' damage per second.
    const r = sheet.ranged || { name: 'No ranged weapon', min: 1, max: 1, speed: 3, norm: 2.8, flat: 0 };
    const scope = SCOPES[r.scope] || {};
    this.c = {
      ...sheet,
      mh: { ...r, flat: (r.flat || 0) + AMMO_DPS * r.speed },
      oh: null,
      // A sharpening stone's crit stays on the melee weapon.
      critPct: sheet.critPct - (sheet.imbueCritPct || 0) + (TALENT.lethalAttacks.critPct[t.lethalAttacks] || 0) + agiMore * this.cs.critPerAgi,
      hitPct: sheet.hitPct + (TALENT.surefooted.hitPct[t.surefooted] || 0),
    };
    this.scopeHit = scope.hitPct || 0;
    // In melee range the hunter swings the melee weapon instead of shooting (meleeSwing).
    this.meleeWeapon = sheet.mh || { name: 'Unarmed', min: 1, max: 2, speed: 2, norm: 2.4, flat: 0 };
    this.meleeMode = false;
    this.held = 'ranged';
    this.rapBase = (sheet.rap || 0) + agiMore * this.cs.rangedApPerAgi + this.int * (TALENT.carefulAim.rapPerInt[t.carefulAim] || 0)
      + HAWK.rap + (t.trueshotAura ? TRUESHOT_RAP : 0);
    this.dual = false;
    this.mhNext = WINDUP;
    this.home = HOME;
    this.geo = { ...this.geo, dist: this.geo.dist.map(() => HOME) };
  }

  // ---- stats ---------------------------------------------------------------------------------------------

  // Ranged attack power against a target: yours, Hunter's Mark on it, temporary Agility, the racial.
  rap(target = this.target) {
    let rap = this.rapBase + this.tempStats().agi * this.cs.rangedApPerAgi * (this.c.statMult || 1);
    if (target && this.own(target).hmEnd > this.t) rap += ABILITIES.huntersMark.rap;
    const r = this.racialActive();
    if (r && r.apMult) rap *= r.apMult;
    return rap;
  }

  // Ranged haste: the quiver, Rapid Fire, Quick Shots, haste from items and the racial. Casts take it too.
  hasteMult() {
    let h = (1 + QUIVER_HASTE) * this.tempStats().hasteMult;
    if (this.aura('rapidFire')) h *= 1 + ABILITIES.rapidFire.haste;
    if (this.aura('quickShots')) h *= 1 + HAWK.quickShots;
    const r = this.racialActive();
    if (r && r.hasteMult) h *= r.hasteMult;
    return h;
  }

  // Everything you deal: Lone Wolf (no pet) and Improved Tracking.
  applyDamageBonus(m) {
    const t = this.tal;
    return m * (1 + TALENT.loneWolf.dmg * (t.loneWolf ? 1 : 0)) * (1 + (TALENT.improvedTracking.dmg[t.improvedTracking] || 0));
  }

  // The scope's hit is the ranged weapon's; a sharpening stone's crit the melee weapon's.
  addHitBonus(hand, hit) { return this.meleeMode ? hit : hit + this.scopeHit; }
  addCritBonus(crit) { return this.meleeMode ? crit + (this.c.imbueCritPct || 0) : crit; }
  weapon(hand) { return this.meleeMode ? this.meleeWeapon : super.weapon(hand); }

  // Ranged Weapon Specialization; Barrage on Aimed Shot and Multi-Shot; the magic schools take Curse of the Elements.
  shotMult(id, school, target) {
    const t = this.tal;
    let m = this.damageMult();
    m *= 1 + (TALENT.rangedWeaponSpecialization.dmg[t.rangedWeaponSpecialization] || 0);
    if (BARRAGE.has(id)) m *= 1 + (TALENT.barrage.dmg[t.barrage] || 0);
    if (school !== 'physical') m *= 1 + (this.enc.raid.spellDmgTaken || this.c.raidSpellDmgTaken || 0);
    const r = this.racialActive();
    if (r && r.damagePct && r.abilities && r.abilities.includes(id)) m *= 1 + r.damagePct / 100;
    return m;
  }

  // Mortal Shots raises the shots' crit bonus.
  shotCritMult(id) { return 1 + (1 + (MORTAL_SHOTS.has(id) ? TALENT.mortalShots.critBonus[this.tal.mortalShots] || 0 : 0)); }

  // A ranged roll: a miss, else a crit or a hit (no dodge, parry or glancing).
  rollRanged() {
    if (this.rng() < Math.max(0, RANGED.miss - this.hitPct('mh') / 100)) return 'miss';
    return this.rng() < Math.max(0, this.critPct() / 100 - RANGED.critSuppression) ? 'crit' : 'hit';
  }

  // The weapon's roll plus ranged attack power, at the weapon's speed or normalized.
  rangedDamage(normalized, target) {
    const w = this.c.mh;
    return w.min + this.rng() * (w.max - w.min) + w.flat + this.rap(target) / 14 * (normalized ? w.norm : w.speed);
  }

  // A shot's damage on a target, recorded; Judgement of Wisdom on a hit.
  shoot(id, name, raw, target, { school = 'physical', outcome = this.rollRanged() } = {}) {
    let dmg = 0;
    if (outcome !== 'miss') {
      dmg = raw();
      if (school === 'physical') dmg = (dmg + this.physDmgBonus()) * this.armorMult(target);
      dmg *= this.shotMult(id, school, target);
      if (outcome === 'crit') dmg *= this.shotCritMult(id);
      this.judgementOfWisdom();
    }
    this.record(id, name, dmg, outcome, target.i);
    return outcome;
  }

  // ---- Auto Shot ----------------------------------------------------------------------------------------------

  // In range (8 to 35 yards), facing, standing still: Auto Shot fires every swing; otherwise it looks again shortly.
  // In melee range (5 yards) the melee weapon swings instead, moving or not; between 5 and 8 yards neither reaches.
  inRange(i = this.primary) {
    const d = this.geo.dist[i];
    return d >= RANGED.minRange && d <= RANGED.maxRange;
  }
  swing(hand) {
    if (hand !== 'mh') { this.ohNext = Infinity; return; }
    if (this.canMelee()) { this.meleeSwing(); return; }
    if (!this.inRange() || !this.geo.facing || this.geo.moving) { this.mhNext = this.t + RANGED.retry; return; }
    this.lastMhSwing = this.t;
    const target = this.target;
    const o = this.shoot('auto', 'Auto Shot', () => this.rangedDamage(false, target), target);
    // Aspect of the Hawk's Quick Shots, at the release (a miss too); Beaststalker Armor's mana on a hit.
    if (this.tal.deadlyAspects && this.rng() < TALENT.deadlyAspects.quickShots[this.tal.deadlyAspects]) this.setAura('quickShots', HAWK.quickShotsDuration);
    if (o !== 'miss' && (this.c.sets || {})['Beaststalker Armor'] >= 5 && this.rng() < BEASTSTALKER.chance) this.addMana(BEASTSTALKER.mana, 'Sudden Insight');
    this.mhNext = this.t + this.c.mh.speed / this.hasteMult();
  }

  // A white swing of the melee weapon: melee attack power, hit and crit, at melee haste (no quiver, Rapid Fire or
  // Quick Shots), with the weapon's procs and Windfury.
  meleeSwing() {
    this.lastMhSwing = this.t;
    this.held = 'melee';
    this.meleeMode = true;
    this.whiteSwing('mh', 0);
    this.meleeMode = false;
    this.mhNext = this.t + this.meleeWeapon.speed / super.hasteMult();
  }

  // The weapon in the hands: the melee one in melee range, the ranged one from Auto Shot's 8 yards; between the two
  // the last one stays out.
  heldWeapon() {
    if (this.inMelee()) this.held = 'melee';
    else if (this.geo.dist[this.primary] >= RANGED.minRange) this.held = 'ranged';
    return this.held;
  }

  // ---- shots ---------------------------------------------------------------------------------------------

  cost(id) {
    const ab = ABILITIES[id];
    if (!ab) return 0;
    let cost = ab.costPct ? ab.costPct * this.cs.base.mana : ab.cost || 0;
    if (EFFICIENCY.has(id)) cost *= 1 - (TALENT.efficiency.cost[this.tal.efficiency] || 0);
    const r = this.racialActive();
    if (r && r.costPct && r.abilities && r.abilities.includes(id)) cost *= 1 + r.costPct / 100;
    return Math.max(0, cost);
  }

  cooldownBonus(id, cd) {
    if (id === 'arcaneShot') return cd - (TALENT.improvedArcaneShot.cd[this.tal.improvedArcaneShot] || 0);
    if (id === 'rapidFire') return cd - (TALENT.rapidKilling.rapidFireCd[this.tal.rapidKilling] || 0);
    return cd;
  }

  // Aimed Shot and Multi-Shot share one cooldown.
  cdLeft(id) {
    const ab = ABILITIES[id];
    if (ab && ab.cdGroup) {
      let left = 0;
      for (const [k, other] of Object.entries(ABILITIES)) if (other.cdGroup === ab.cdGroup) left = Math.max(left, super.cdLeft(k));
      return left;
    }
    return super.cdLeft(id);
  }

  classBlocker(id) {
    const ab = ABILITIES[id];
    if (ab.shot) {
      const d = this.geo.dist[this.primary];
      if (d < RANGED.minRange) return 'Target is too close';
      if (d > RANGED.maxRange) return 'Out of range';
      if (!this.geo.facing) return 'You are facing the wrong way!';
    }
    if (id === 'rapidFire' && this.aura('rapidFire')) return 'Already active';
    return null;
  }

  // A shot with a cast starts its cooldown when it lands (wowsims: Aimed Shot every 8 sec, not 6).
  cdOnCast(id) { return !!ABILITIES[id].cd && !ABILITIES[id].castTime; }

  // Rapid Recuperation: half your regen goes on while casting.
  castingShare() { return this.aura('rapidRecuperation') ? TALENT.rapidRecuperation.casting[this.tal.rapidRecuperation] || 0 : 0; }
  regenAura(id) { return id === 'rapidRecuperation'; }

  completeCast(c) {
    const id = c.id;
    const ab = ABILITIES[id];
    this.spendMana(this.cost(id), id);
    if (ab.cd && ab.castTime) this.cds[id] = this.t + this.cooldownFor(id);
    const target = this.target;
    switch (id) {
      case 'huntersMark': this.own(target).hmEnd = this.t + ab.duration; return;
      case 'rapidFire': this.setAura('rapidFire', ab.duration); return;
      case 'racial': {
        const r = this.racial.active;
        this.cds.racial = this.t + r.cd;
        this.setAura('racial', r.duration, 0, { name: r.name, icon: r.icon });
        return;
      }
      case 'aimedShot':
        this.shoot(id, ab.name, () => this.rangedDamage(true, target) + ab.base, target);
        return;
      case 'multiShot':
        for (const t of [target, ...this.others(RANGED.maxRange)].slice(0, ab.targets)) this.shoot(id, ab.name, () => this.rangedDamage(true, t), t);
        return;
      case 'arcaneShot':
        this.shoot(id, ab.name, () => ab.base + ab.rapCoef * this.rap(target), target, { school: 'arcane' });
        return;
      case 'serpentSting': {
        if (this.rollRanged() === 'miss') { this.record(id, ab.name, 0, 'miss', target.i); return; }
        this.judgementOfWisdom();
        this.sting(target);
        if (this.tal.rapidRecuperation) this.setAura('rapidRecuperation', TALENT.rapidRecuperation.duration);
        return;
      }
      default: break;
    }
  }

  // Serpent Sting's ticks: 111 + 3% of ranged attack power at each tick (Improved Stings more); they crit as the
  // shots do. A new one starts them again.
  sting(target) {
    const ab = ABILITIES.serpentSting;
    const own = this.own(target);
    const token = Symbol('serpentSting');
    own.serpentSting = token;
    own.serpentStingEnd = this.t + ab.dot.period * ab.dot.ticks;
    for (let k = 1; k <= ab.dot.ticks; k++) {
      this.schedule(this.t + ab.dot.period * k, () => {
        if (own.serpentSting !== token) return;
        const outcome = this.rng() < Math.max(0, this.critPct() / 100 - RANGED.critSuppression) ? 'crit' : 'hit';
        let dmg = (ab.dot.tick + ab.dot.rapCoef * this.rap(target)) * (1 + (TALENT.improvedStings.serpent[this.tal.improvedStings] || 0));
        dmg *= this.shotMult('serpentSting', ab.school, target);
        if (outcome === 'crit') dmg *= this.shotCritMult('serpentSting');
        this.record('serpentSting', ab.name, dmg, outcome, target.i);
      });
    }
  }

  // The review counts the time not shooting a special while the global cooldown is free.
  trackReview(newT) {
    if (newT <= this.t || !this.started) return;
    if (!this.casting) this.review.idle += Math.max(0, newT - Math.max(this.t, this.gcdEnd));
  }
}
