// The shared side of a fight: the targets (training dummies or a boss) and what is on them. Every player's unit
// in a fight points at the same Encounter, so in a group one warrior's Sunder Armor or a druid's Faerie Fire
// counts for everyone and a dummy's health pool is shared.
//   raid: the debuffs set for the whole raid (the host's settings in a group): armor removed by Faerie Fire and
//         Curse of Recklessness, Expose Armor, a raid wielder's Armor Shatter or Puncture Armor, Gift of Arthas, a tank's Sunder.
//   targets[i]: health taken and death, Sunder Armor, Armor Shatter and Puncture Armor stacks, Thunder Clap and Demoralizing Shout
//         (anyone's), and `own[uid]`: what one player keeps on it for themselves (their Rend, their Deep Wounds bleed).
export const SUNDER = { armor: 450, maxStacks: 5, duration: 30 }; // Sunder Armor 11597 (warrior.js)
export const SHATTER_PER_STACK = 165; // Armor Shatter 16928 (Annihilator)
export const PUNCTURE_PER_STACK = 100; // Puncture Armor 17315 (Bashguuder, Rivenspike; 3 stacks) and 1293005 (Vibroblade; 1)

// The raid's weapon armor debuffs (wowsims sim/core/buffs/drivers.go driveArmorShatter / drivePunctureArmor, 35c75ad,
// 46b420f, EV-0147): one main-hand wielder per target lands its swings at the weapon's base speed and 48 more hits a
// minute (wielderOtherHitsPerMinute), each rolling the weapon's procs per minute, a chance of PPM × speed / 60; a landed
// roll refreshes the debuff and adds a stack. The raid's copy is the same debuff as a player's own procs of it (wowsims
// playerWields), so they share the stacks. Vibroblade's 1293005 stays a copy of its own (no player proc lands it).
// A proc on the melee hit table (Puncture Armor 17315, 1293005: `strike`) is a strike, as the player's (R-0040; wowsims
// rollWielderHits, a059fda, afc3b61, EV-0152): the target dodges 6.5% of them (wielderStrikeDodgeChance), and one that
// lands off a swing (a swing's share of the wielder's hits) rolls the proc once more. Armor Shatter 16928 is on the
// magic table and lands every roll.
// { kind on the target, item, swing speed, procs per minute, duration, max stacks, strike } (db: 12798, 13204, 13286, 9485).
export const RAID_WEAPON_DEBUFFS = {
  shatter: { kind: 'shatter', item: 12798, speed: 2.4, ppm: 1, duration: 45, max: 3 }, // Annihilator, 16928
  1: { kind: 'puncture', item: 13204, speed: 1.8, ppm: 3.2, duration: 30, max: 3, strike: true }, // Bashguuder, 17315
  2: { kind: 'puncture', item: 13286, speed: 2.9, ppm: 1.6, duration: 30, max: 3, strike: true }, // Rivenspike, 17315
  3: { kind: 'vibro', item: 9485, speed: 1.6, ppm: 1, duration: 30, max: 1, strike: true }, // Vibroblade, 1293005
};
const WIELDER_OTHER_HITS_PER_MINUTE = 48;
const WIELDER_STRIKE_DODGE_CHANCE = 0.065;
export const BOSS_ARMOR = 3731; // the wowsims Raid Target, level 63

export class Encounter {
  constructor({ targets = 1, raid = {}, rng = Math.random } = {}) {
    this.raid = { armorReduction: 0, exposeArmor: 0, raidShatter: 0, raidPuncture: 0, physDmgTaken: 0, sunderFull: false, ...raid };
    this.rng = rng;
    this.targets = Array.from({ length: targets }, (_, i) => ({ i, sunder: 0, sunderEnd: 0, shatter: 0, shatterEnd: 0,
      puncture: 0, punctureEnd: 0, vibro: 0, vibroEnd: 0, lacerations: 0, lacerationsEnd: 0, taken: 0, dead: false, own: {},
      tcEnd: 0, slow: 0, demoEnd: 0, apReduction: 0 }));
    if (this.raid.sunderFull) for (const t of this.targets) { t.sunder = SUNDER.maxStacks; t.sunderEnd = Infinity; }
    // The raid's wielders, rolling from the pull (TickImmediately): { def, next roll time } for each target.
    this.wielders = [this.raid.raidShatter && RAID_WEAPON_DEBUFFS.shatter, RAID_WEAPON_DEBUFFS[this.raid.raidPuncture]].filter(Boolean)
      .map((def) => ({ def, period: 60 / (60 / def.speed + WIELDER_OTHER_HITS_PER_MINUTE), chance: def.ppm * def.speed / 60,
        swingShare: (60 / def.speed) / (60 / def.speed + WIELDER_OTHER_HITS_PER_MINUTE) }));
    for (const t of this.targets) t.wieldNext = this.wielders.map(() => 0);
  }

  // The raid wielders' rolls on a target up to time t, each on its own clock (run as the target's armor is read).
  rollWielders(target, t) {
    this.wielders.forEach((w, k) => {
      const lands = (at) => {
        if (this.rng() >= w.chance) return false;
        if (w.def.strike && this.rng() < WIELDER_STRIKE_DODGE_CHANCE) return false;
        this.addWeaponDebuff(target, at, w.def.kind, w.def.duration, w.def.max);
        return true;
      };
      for (; target.wieldNext[k] <= t; target.wieldNext[k] += w.period) {
        const at = target.wieldNext[k];
        if (lands(at) && w.def.strike && this.rng() < w.swingShare) lands(at);
      }
    });
  }

  // One player's own state on a target (their bleeds), by the player's unit id.
  own(target, uid) { return target.own[uid] || (target.own[uid] = { rend: null, rendEnd: 0, dw: null }); }

  // A Sunder Armor application at time t (anyone's): +1 stack (a new set if it ran out), 30 s from now.
  addSunder(target, t) {
    target.sunder = target.sunderEnd > t ? Math.min(SUNDER.maxStacks, target.sunder + 1) : 1;
    target.sunderEnd = Math.max(target.sunderEnd, t + SUNDER.duration);
  }

  addShatter(target, t, duration) { this.addWeaponDebuff(target, t, 'shatter', duration, 3); }

  // Lacerations at time t (Mutilator's 10370, anyone's): +1 stack up to max, refreshed; each stack `bp` more physical
  // damage taken (wowsims 5829ef6).
  addLacerations(target, t, duration, max, bp) {
    this.addWeaponDebuff(target, t, 'lacerations', duration, max);
    target.lacerationsBp = bp;
  }
  // Flat physical damage a target takes more of at time t, for anyone's hits (Lacerations).
  physDmgTaken(target, t) { return target && target.lacerationsEnd > t ? target.lacerations * (target.lacerationsBp || 0) : 0; }

  // A weapon's armor debuff landing at time t (Armor Shatter 'shatter', Puncture Armor 'puncture', Vibroblade's 'vibro'):
  // +1 stack up to max (a new set if it ran out), refreshed to t + duration.
  addWeaponDebuff(target, t, kind, duration, max) {
    target[kind] = target[kind + 'End'] > t ? Math.min(max, target[kind] + 1) : 1;
    target[kind + 'End'] = t + duration;
  }

  // Spell Vulnerability (Nightfall's proc, 23605): the target takes `pct` more magic damage from everyone until
  // t + duration; a new proc refreshes it.
  addSpellVuln(target, t, duration, pct) {
    target.spellVuln = pct;
    target.spellVulnEnd = Math.max(target.spellVulnEnd || 0, t + duration);
  }

  // Thunder Clap (anyone's): the target attacks `slow` (a share) slower until t + duration.
  addThunderClap(target, t, duration, slow) {
    target.tcEnd = t + duration;
    target.slow = slow;
  }

  // Demoralizing Shout (anyone's): the target has `amount` less attack power until t + duration.
  addDemoShout(target, t, duration, amount) {
    target.demoEnd = t + duration;
    target.apReduction = amount;
  }

  // How much slower the target swings (Thunder Clap) and how much attack power it has lost (Demoralizing Shout).
  attackSlow(target, t) { return target.tcEnd > t ? target.slow : 0; }
  apReduction(target, t) { return target.demoEnd > t ? target.apReduction : 0; }

  // Armor taken off a target at time t by debuffs: the raid's, plus Sunder Armor or Expose Armor (they do not stack,
  // the larger counts; a rogue's own Expose Armor too) and the minor armor reduction group. Faerie Fire, Curse of
  // Recklessness, Dust Cloud, Armor Shatter and Puncture Armor share it, so the largest of them counts (wowsims
  // MinorArmorReduction, 35c75ad / d79dc88, EV-0147: the weapon debuffs never land beside Faerie Fire or Curse of
  // Recklessness). A player's own armor penetration is added by their unit.
  armorRemoved(target, t) {
    const r = this.raid;
    this.rollWielders(target, t);
    const sunder = target.sunderEnd > t ? target.sunder * SUNDER.armor : 0;
    const expose = target.exposeEnd > t ? target.exposeArmor : 0;
    const minor = Math.max(r.minorArmor || 0,
      target.minorArmorEnd > t ? target.minorArmor : 0, // a druid's own Faerie Fire or a warlock's Curse of Recklessness
      target.shatterEnd > t ? target.shatter * SHATTER_PER_STACK : 0,
      target.punctureEnd > t ? target.puncture * PUNCTURE_PER_STACK : 0,
      target.vibroEnd > t ? target.vibro * PUNCTURE_PER_STACK : 0);
    return r.armorReduction - (r.minorArmor || 0) + minor + Math.max(sunder, r.exposeArmor || 0, expose);
  }
}

// The raid's debuffs from a character sheet (until a group sets them for everyone).
export function raidOf(sheet) {
  return {
    armorReduction: sheet.raidArmorReduction ?? sheet.armorReduction ?? 0,
    exposeArmor: sheet.exposeArmor || 0,
    minorArmor: sheet.raidMinorArmor || 0,
    raidShatter: sheet.raidShatter || 0,
    raidPuncture: sheet.raidPuncture || 0,
    physDmgTaken: sheet.raidPhysDmgTaken ?? sheet.physDmgTaken ?? 0,
    sunderFull: !!(sheet.sunder && sheet.sunder.mode === 'full'),
  };
}
