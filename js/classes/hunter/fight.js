// The Hunter on the shared caster (classes/caster.js: mana with the five-second rule, casts, the global cooldown), with
// Auto Shot on its own timer: wowsims' ranged auto runs through casts (sim/core/attack.go), so Aimed Shot and Multi-Shot
// do not hold it. The shots, Serpent Sting, Hunter's Mark, Rapid Fire, Aspect of the Hawk and its Quick Shots, the
// Marksmanship and Survival talents. Formulas follow wowsims/forever sim/hunter/*.go.
import {
  ABILITIES, AMMO_DPS, AURAS, BARRAGE, BEASTSTALKER, EFFICIENCY, HAWK, HAWKS, MELEE_ABILITIES, MORTAL_SHOTS, PET, QUIVER_HASTE, RANGED, RAPTOR, SCOPES, TALENT,
  TRUESHOT_RAP,
  parseTalents,
} from '../../data/hunter.js';
import { CasterFight } from '../caster.js';

const HOME = 12; // the turret builds' shooting spot, in yards
const WINDUP = 0.5; // Auto Shot winds up before its first release
// The pet's and the hawks' melee against a level 63 boss from behind it: as the warlock's demon (warlock/fight.js), a
// glancing blow 55-75% of a hit, but their crits 4.8% fewer, as your ranged attacks (the wowsims logs' rates).
const PET_MELEE = { miss: 0.08, dodge: 0.065, glance: 0.4, glanceMin: 0.55, glanceMax: 0.75, critSuppression: 0.048 };
const MELEE_REACH = 4; // where the pet stops, in yards (wowsims MoveTo(MaxMeleeRange - 1))
const ORC_COMMAND = 1.05; // Orc: your pet and hawks deal 5% more (sim/core/racials.go applyCommand)
const RANGE_MELEE = 5; // the melee abilities' reach, in yards (as the engine's melee range)

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
    // Beast Mastery: the tamed pet (the build's Raptor) and the hawks Summon Hawk leaves.
    const o = sheet.classOptions || {};
    this.pet = HunterFight.petKind(sheet) === 'raptor'
      ? this.initPet({ kind: 'raptor', category: 'hunter', ...RAPTOR, focus: PET.focus.max, cds: {}, gcdEnd: 0, swingAt: Infinity, actAt: Infinity, focusAt: Infinity }, RAPTOR.abilities.map((a) => a.id))
      : null;
    this.hawks = [];
    this.nextHawk = 0;
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

  // Everything you deal: Lone Wolf (no pet), Improved Tracking, Focused Fire (with the pet out).
  applyDamageBonus(m) {
    const t = this.tal;
    return m * (1 + TALENT.loneWolf.dmg * (t.loneWolf ? 1 : 0)) * (1 + (TALENT.improvedTracking.dmg[t.improvedTracking] || 0)) * this.focusedFire();
  }
  focusedFire() { return this.pet ? 1 + (TALENT.focusedFire.dmg[this.tal.focusedFire] || 0) : 1; }

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
    this.afterAttack(id, outcome, target);
    return outcome;
  }

  // After any attack: Expose Prey off a target with your Hunter's Mark (a Mongoose Bite window); Resourcefulness off a
  // melee or ranged ability's crit (not an autoattack's).
  afterAttack(id, outcome, target) {
    const t = this.tal;
    if (t.exposePrey && this.own(target).hmEnd > this.t && this.rng() < TALENT.exposePrey.chance[t.exposePrey]) this.setAura('exposePrey', TALENT.exposePrey.window);
    if (t.resourcefulness && outcome === 'crit' && id !== 'auto' && id !== 'mh' && this.rng() < TALENT.resourcefulness.chance[t.resourcefulness]) {
      this.setAura('resourcefulness', TALENT.resourcefulness.duration);
    }
  }

  // ---- melee ------------------------------------------------------------------------------------------------

  // A melee ability's crit: Savage Strikes more often, Predator's Edge bigger (the hunter's yellow hits are these).
  critMultiplier(yellow) { return yellow ? 2 + (TALENT.predatorsEdge.critDmg[this.tal.predatorsEdge] || 0) : 2; }

  // Raptor Strike, Mongoose Bite, Wing Clip, Strider Kick: one roll as a special, the melee weapon's procs.
  meleeStrike(id, target) {
    const ab = ABILITIES[id];
    this.meleeMode = true;
    const outcome = this.rollYellow('mh', target, TALENT.savageStrikes.critPct[this.tal.savageStrikes] || 0);
    const raw = this.landed(outcome) ? (ab.flat != null ? ab.flat : this.weaponDamage('mh', !!ab.normalized) + (ab.bonus || 0)) : 0;
    const dmg = this.deal(id, ab.name, raw, outcome, target, { yellow: true });
    this.afterMelee(outcome, target, { hand: 'mh' });
    if (this.landed(outcome)) this.maybeWindfury(); // a main-hand special procs Windfury Totem
    this.meleeMode = false;
    this.held = 'melee';
    this.afterAttack(id, outcome, target);
    if (id === 'mongooseBite' && dmg > 0 && this.tal.laceratingStrikes) this.lacerate(target, dmg * TALENT.laceratingStrikes.share);
    return outcome;
  }

  // Lacerating Strikes: a share of the bite over 21 s; a new bite adds what is left of the last one and starts over.
  lacerate(target, amount) {
    const L = TALENT.laceratingStrikes;
    const own = this.own(target);
    const left = own.lacerateEnd > this.t ? own.lacerateTick * Math.ceil((own.lacerateEnd - this.t) / L.period - 1e-9) : 0;
    const token = Symbol('lacerate');
    own.lacerate = token;
    own.lacerateEnd = this.t + L.period * L.ticks;
    own.lacerateTick = (left + amount) / L.ticks;
    for (let k = 1; k <= L.ticks; k++) {
      this.schedule(this.t + L.period * k, () => { if (own.lacerate === token) this.record('laceratingStrikes', 'Lacerating Strikes', own.lacerateTick, 'hit', target.i); });
    }
  }

  // You dodged a melee attack: Mongoose Bite for 5 s (Defensive State).
  onAvoid(outcome) { if (outcome === 'dodge') this.setAura('defensiveState', 5); }

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
  // A queued Raptor Strike takes the swing's place when it can still go (its cooldown, your mana).
  meleeSwing() {
    this.lastMhSwing = this.t;
    this.held = 'melee';
    const target = this.target;
    if (this.raptorQueued) {
      this.raptorQueued = false;
      if (this.cdLeft('raptorStrike') <= 0 && this.mana >= this.cost('raptorStrike')) {
        this.spendMana(this.cost('raptorStrike'), 'raptorStrike');
        this.cds.raptorStrike = this.t + this.cooldownFor('raptorStrike');
        this.meleeStrike('raptorStrike', target);
        this.mhNext = this.t + this.meleeWeapon.speed / super.hasteMult();
        return;
      }
    }
    this.meleeMode = true;
    this.whiteSwing('mh', 0);
    this.meleeMode = false;
    this.afterAttack('mh', null, target);
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
    if (MELEE_ABILITIES.has(id)) cost *= 1 - (TALENT.resourcefulness.cost[this.tal.resourcefulness] || 0);
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
    if (ab.pet && !this.pet) return 'You do not have a pet';
    if (ab.melee) {
      if (this.geo.dist[this.primary] > RANGE_MELEE) return 'Out of range';
      if (!this.geo.facing) return 'You are facing the wrong way!';
      if (id === 'mongooseBite' && !this.aura('defensiveState') && !this.aura('exposePrey')) return 'Requires a dodge';
      if (id === 'raptorStrike' && this.raptorQueued) return 'Already queued';
    }
    return null;
  }

  // A shot with a cast starts its cooldown when it lands (wowsims: Aimed Shot every 8 sec, not 6); Raptor Strike when
  // the swing it is queued on goes.
  cdOnCast(id) { return !!ABILITIES[id].cd && !ABILITIES[id].castTime && !ABILITIES[id].nextMelee; }

  // Rapid Recuperation (after a Serpent Sting), Resourcefulness and Bestial Discipline: a share of your regen goes on
  // while casting.
  castingShare() {
    const t = this.tal;
    return (this.aura('rapidRecuperation') ? TALENT.rapidRecuperation.casting[t.rapidRecuperation] || 0 : 0)
      + (this.aura('resourcefulness') ? TALENT.resourcefulness.casting : 0) + (TALENT.bestialDiscipline.casting[t.bestialDiscipline] || 0);
  }
  regenAura(id) { return id === 'rapidRecuperation' || id === 'resourcefulness'; }

  completeCast(c) {
    const id = c.id;
    const ab = ABILITIES[id];
    // Raptor Strike waits for the next swing, which spends its mana.
    if (ab.nextMelee) { this.raptorQueued = true; return; }
    this.spendMana(this.cost(id), id);
    if (ab.cd && ab.castTime) this.cds[id] = this.t + this.cooldownFor(id);
    const target = this.target;
    switch (id) {
      case 'huntersMark': this.own(target).hmEnd = this.t + ab.duration; return;
      case 'rapidFire': this.setAura('rapidFire', ab.duration); return;
      case 'summonHawk': this.summonHawk(target); return;
      case 'bestialWrath': this.setAura('bestialWrath', ab.duration); return;
      case 'intimidation': this.setAura('intimidation', ab.duration); return;
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
      case 'mongooseBite':
        this.meleeStrike(id, target);
        this.dropAura('defensiveState');
        this.dropAura('exposePrey');
        return;
      case 'wingClip': this.meleeStrike(id, target); return;
      case 'striderKick': this.meleeStrike(id, target); this.setAura('striderKick', 3); return;
      case 'serpentSting': {
        this.afterAttack(id, null, target);
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

  // ---- the pet --------------------------------------------------------------------------------------------

  // What it inherits: 10% of your higher attack power, your higher crit (Ferocity on top), your ranged hit.
  petAp() { return PET.ap + PET.apShare * Math.max(this.ap(), this.rap(null)); }
  petCrit() { return this.critPct() + (TALENT.ferocity.critPct[this.tal.ferocity] || 0); }
  petHitPct() { return this.hitPct('mh'); }
  glanceMult() { return PET_MELEE.glanceMin + this.rng() * (PET_MELEE.glanceMax - PET_MELEE.glanceMin); }
  command() { return this.c.race === 'RaceOrc' ? ORC_COMMAND : 1; }
  // Happy, the Raptor's own, Unleashed Fury, Focused Fire, the Orc's Command, Bestial Wrath.
  petMult() {
    const t = this.tal;
    let m = PET.happiness * (1 + this.pet.dmg) * (1 + (TALENT.unleashedFury.dmg[t.unleashedFury] || 0)) * this.focusedFire() * this.command();
    if (this.aura('bestialWrath')) m *= 1 + ABILITIES.bestialWrath.dmg;
    return m;
  }
  // Faster Attack II and Cobra Reflexes; Frenzy.
  petHaste() { return (1 + PET.attackSpeed) * (1 + PET.cobraReflexes.speed) * (this.aura('frenzy') ? 1 + TALENT.frenzy.haste : 1); }

  // A melee roll of the pet or a hawk: white swings on one roll with glancing blows, specials a landed roll and then
  // a crit roll. Intimidation's charge makes the pet's next attack crit.
  beastRoll(white, crit, hit) {
    const miss = Math.max(0, PET_MELEE.miss - hit / 100);
    const dodge = Math.max(0, PET_MELEE.dodge - (this.c.expertisePct || 0) / 100); // your expertise, inherited
    const critChance = Math.max(0, crit / 100 - PET_MELEE.critSuppression);
    const r = this.rng();
    if (r < miss) return 'miss';
    if (r < miss + dodge) return 'dodge';
    if (!white) return this.rng() < critChance ? 'crit' : 'hit';
    if (r < miss + dodge + PET_MELEE.glance) return 'glance';
    return r < miss + dodge + PET_MELEE.glance + critChance ? 'crit' : 'hit';
  }
  petRoll(white) {
    const intimidated = !!this.aura('intimidation');
    if (intimidated) this.dropAura('intimidation');
    return this.beastRoll(white, this.petCrit() + (intimidated ? 100 : 0), this.petHitPct());
  }

  // A physical hit of the pet in wowsims' order: Pet Aggression's flat damage (not on a bleed's ticks), the
  // multipliers, armor (not a bleed), the target's flat damage taken (Gift of Arthas), then a glance or a crit.
  petHit(raw, outcome, target, { bleed = false, mult = 1 } = {}) {
    if (outcome === 'miss' || outcome === 'dodge') return 0;
    let dmg = (raw + (bleed ? 0 : PET.aggression)) * mult * this.petMult();
    if (!bleed) dmg *= this.armorMult(target);
    dmg += this.physDmgBonus();
    if (outcome === 'glance') dmg *= this.glanceMult();
    if (outcome === 'crit') dmg *= 2;
    return dmg;
  }
  // Frenzy off the pet's crits.
  petAfter(outcome) {
    const t = this.tal;
    if (outcome !== 'crit' || !t.frenzy || this.rng() >= TALENT.frenzy.chance[t.frenzy]) return;
    const before = this.petHaste();
    this.setAura('frenzy', TALENT.frenzy.duration);
    this.rescalePet(before);
  }
  rescalePet(before) {
    const p = this.pet;
    const after = this.petHaste();
    if (Math.abs(after - before) < 1e-12 || !(p.swingAt > this.t) || !Number.isFinite(p.swingAt)) return;
    this.petSwingAt(this.t + (p.swingAt - this.t) * before / after);
  }
  onAuraExpired(id) {
    if (id === 'frenzy' && this.pet) this.rescalePet(this.petHaste() * (1 + TALENT.frenzy.haste));
  }

  // At the pull the pet Dashes (20 focus) from beside you into melee range and starts swinging; its focus comes every
  // 5 s from a random point.
  startPet() {
    const p = this.pet;
    if (!p) return;
    this.petFocusAt(this.t + this.rng() * PET.focus.every);
    this.petPull();
  }
  // The pet bar (classes/caster.js) sends it in, Dashing when it has the focus, or calls it back: a recalled pet's
  // swings and abilities stop (their times go to Infinity, which the scheduled ones check).
  petEngage() {
    const p = this.pet;
    if (!p || p.engaged || this.over || !this.started) return;
    p.engaged = true;
    const yards = Math.max(0, (this.geo.dist[this.primary] || 0) - MELEE_REACH);
    const dash = p.focus >= 20;
    if (dash) { p.focus -= 20; p.gcdEnd = this.t + PET.gcd; }
    const arrive = this.t + yards / (PET.speed * (dash ? 1 + PET.dash : 1));
    const token = p.engageToken = Symbol('engage');
    this.schedule(arrive, () => {
      if (p.engageToken !== token || !p.engaged) return;
      this.petSwingAt(this.t);
      this.petActAt(Math.max(this.t, p.gcdEnd));
    });
  }
  petDisengage() {
    const p = this.pet;
    if (!p) return;
    p.engaged = false;
    p.engageToken = null;
    p.swingAt = p.actAt = Infinity;
  }
  petCastNow() {
    const p = this.pet;
    if (p && p.engaged && Number.isFinite(p.swingAt)) this.petActAt(Math.max(this.t, p.gcdEnd));
  }
  static petKind(sheet) { return ((sheet.classOptions || {}).pet === 'raptor') ? 'raptor' : null; }
  petFocusAt(at) {
    const p = this.pet;
    p.focusAt = at;
    this.schedule(at, () => {
      if (this.over || p.focusAt !== at) return;
      p.focus = Math.min(PET.focus.max, p.focus + PET.focus.tick * (1 + (TALENT.bestialDiscipline.focus[this.tal.bestialDiscipline] || 0)));
      this.petFocusAt(at + PET.focus.every);
    });
  }

  petSwingAt(at) {
    const p = this.pet;
    p.swingAt = at;
    this.schedule(at, () => { if (!this.over && p.swingAt === at) this.petSwing(); });
  }
  petSwing() {
    const p = this.pet;
    const target = this.target;
    const s = PET.swing;
    const outcome = this.petRoll(true);
    // Faster Attack keeps the damage a second (less a swing), Cobra Reflexes takes 15% off.
    const raw = s.avg * (1 + (this.rng() * 2 - 1) * s.spread) + this.petAp() / 14 * s.speed;
    const mult = PET.cobraReflexes.dmg / (1 + PET.attackSpeed);
    this.record('petMelee', 'Melee (Raptor)', this.petHit(raw, outcome, target, { mult }), outcome, target.i);
    this.petAfter(outcome);
    this.petSwingAt(this.t + s.speed / this.petHaste());
  }

  // The pet's abilities, longest cooldown first: one whose cooldown is up waits for its focus.
  petActAt(at) {
    const p = this.pet;
    p.actAt = at;
    this.schedule(at, () => { if (!this.over && p.actAt === at) this.petAct(); });
  }
  petAct() {
    const p = this.pet;
    if (this.t + 1e-9 < p.gcdEnd) { this.petActAt(p.gcdEnd); return; }
    for (const ab of p.abilities) {
      if (!p.autocast[ab.id] && p.queued !== ab.id) continue; // its autocast is off, and you did not ask for it
      if ((p.cds[ab.id] || 0) > this.t + 1e-9) continue;
      if (p.focus >= ab.cost) { if (p.queued === ab.id) p.queued = null; this.petCast(ab); this.petActAt(p.gcdEnd); return; }
      if (ab.cd) { this.petActAt(p.focusAt + 1e-6); return; }
    }
    const next = p.abilities.map((ab) => p.cds[ab.id] || 0).filter((at) => at > this.t);
    this.petActAt(Math.min(p.focusAt + 1e-6, ...next));
  }
  petCast(ab) {
    const p = this.pet;
    const target = this.target;
    p.focus -= ab.cost;
    if (ab.cd) p.cds[ab.id] = this.t + ab.cd;
    p.gcdEnd = this.t + PET.gcd;
    const outcome = this.petRoll(false);
    if (ab.dot) {
      // Savage Rend: a bleed (no armor) at the multipliers it was put on with; each tick can crit as the pet does.
      const landed = outcome !== 'miss' && outcome !== 'dodge';
      this.record(ab.id, ab.name, 0, landed ? 'hit' : outcome, target.i);
      if (landed) this.petBleed(ab, target);
      return;
    }
    const raw = ab.avg * (1 + (this.rng() * 2 - 1) * ab.spread);
    this.record(ab.id, ab.name, this.petHit(raw, outcome, target), outcome, target.i);
    this.petAfter(outcome);
  }
  petBleed(ab, target) {
    const own = this.own(target);
    const token = Symbol(ab.id);
    own[ab.id] = token;
    own[`${ab.id}End`] = this.t + ab.dot.period * ab.dot.ticks;
    const dmg = this.petHit(ab.dot.tick, 'hit', target, { bleed: true });
    for (let k = 1; k <= ab.dot.ticks; k++) {
      this.schedule(this.t + ab.dot.period * k, () => {
        if (own[ab.id] !== token) return;
        const crit = this.rng() < Math.max(0, this.petCrit() / 100 - PET_MELEE.critSuppression);
        this.record(ab.id, ab.name, crit ? dmg * 2 : dmg, crit ? 'crit' : 'hit', target.i);
      });
    }
  }

  onStart() {
    super.onStart();
    this.startPet();
  }

  // ---- the hawks ------------------------------------------------------------------------------------------

  // The dive: 108 + 5% of ranged attack power after its flight (a second at least), a crit or a hit; Unleashed Fury
  // and Ferocity are flat modifiers of its effect 1 in the game files (their class masks reach it), so they add their
  // rank's number to the 108. Then a hawk for 18 s in the place of the one summoned longest ago.
  summonHawk(target) {
    const ab = ABILITIES.summonHawk;
    const d = HAWKS.dive;
    const t = this.tal;
    const base = d.base + (TALENT.unleashedFury.dmg[t.unleashedFury] || 0) * 100 + (TALENT.ferocity.critPct[t.ferocity] || 0);
    const rap = this.rap(target);
    const mult = this.damageMult();
    this.schedule(this.t + Math.max(d.minTravel, (this.geo.dist[target.i] || 0) / d.travel), () => {
      const crit = this.rng() < Math.max(0, this.critPct() / 100 - RANGED.critSuppression);
      let dmg = (base + d.rapCoef * rap) * mult * this.armorMult(target) + this.physDmgBonus();
      if (crit) dmg *= 2;
      this.record('summonHawk', ab.name, dmg, crit ? 'crit' : 'hit', target.i);
    });
    const i = this.nextHawk;
    this.nextHawk = (i + 1) % HAWKS.count;
    // Your damage done as it comes (Focused Fire, Improved Tracking), Unleashed Fury's, the Orc's Command.
    const fury = 1 + (TALENT.unleashedFury.dmg[this.tal.unleashedFury] || 0);
    const hawk = { end: this.t + HAWKS.duration, mult: this.damageMult() * fury * this.command(), swingAt: Infinity };
    this.hawks[i] = hawk;
    this.hawkSwingAt(hawk, this.t);
  }
  hawkSwingAt(hawk, at) {
    hawk.swingAt = at;
    this.schedule(at, () => {
      if (this.over || hawk.swingAt !== at || this.t >= hawk.end || !this.hawks.includes(hawk)) return;
      this.hawkSwing(hawk);
    });
  }
  // A hawk's swing at your ranged speed: the creature's share plus 80% of your ranged attack power (the logs were read
  // with Unleashed Fury 5/5, which its own multiplier adds back), half your crit and Ferocity.
  hawkSwing(hawk) {
    const target = this.target;
    const s = HAWKS.swing;
    const fury = 1 + TALENT.unleashedFury.dmg[5];
    const crit = HAWKS.critShare * this.critPct() + (TALENT.ferocity.critPct[this.tal.ferocity] || 0);
    const outcome = this.beastRoll(true, crit, this.petHitPct());
    let dmg = 0;
    if (outcome !== 'miss' && outcome !== 'dodge') {
      const raw = s.avg / fury * (1 + (this.rng() * 2 - 1) * s.spread) + HAWKS.apShare * this.rap(null) / (HAWKS.apPerDps * fury) * s.speed;
      dmg = raw * hawk.mult * this.armorMult(target) + this.physDmgBonus();
      if (outcome === 'glance') dmg *= this.glanceMult();
      if (outcome === 'crit') dmg *= 2;
    }
    this.record('hawkMelee', 'Melee (hawks)', dmg, outcome, target.i);
    this.hawkSwingAt(hawk, this.t + s.speed / this.hawkHaste());
  }
  hawksUp() { return this.hawks.filter((h) => h && h.end > this.t).length; }
  // Your ranged speed without the racial (Berserking's does not reach them).
  hawkHaste() {
    const r = this.racialActive();
    return this.hasteMult() / (r && r.hasteMult ? r.hasteMult : 1);
  }
  rescaleSwings(hasteBefore) {
    super.rescaleSwings(hasteBefore);
    const ratio = hasteBefore / this.hasteMult();
    if (Math.abs(ratio - 1) < 1e-12 || !this.hawks) return;
    for (const h of this.hawks) if (h && h.end > this.t && h.swingAt > this.t) this.hawkSwingAt(h, this.t + (h.swingAt - this.t) * ratio);
  }

  // The review counts the time not shooting a special while the global cooldown is free.
  trackReview(newT) {
    if (newT <= this.t || !this.started) return;
    if (!this.casting) this.review.idle += Math.max(0, newT - Math.max(this.t, this.gcdEnd));
  }
}
