// The shared side of a fight: the targets (training dummies or a boss) and what is on them. Every player's unit
// in a fight points at the same Encounter, so in a group one warrior's Sunder Armor or a druid's Faerie Fire
// counts for everyone and a dummy's health pool is shared.
//   raid: the debuffs set for the whole raid (the host's settings in a group): armor removed by Faerie Fire and
//         Curse of Recklessness, Expose Armor, Armor Shatter held by others, Gift of Arthas, a tank's Sunder.
//   targets[i]: health taken and death, Sunder Armor and Armor Shatter stacks, Thunder Clap and Demoralizing Shout
//         (anyone's), and `own[uid]`: what one player keeps on it for themselves (their Rend, their Deep Wounds bleed).
export const SUNDER = { armor: 450, maxStacks: 5, duration: 30 }; // Sunder Armor 11597 (warrior.js)
export const SHATTER_PER_STACK = 165; // Armor Shatter 16928 (Annihilator)
export const BOSS_ARMOR = 3731; // the wowsims Raid Target, level 63

export class Encounter {
  constructor({ targets = 1, raid = {} } = {}) {
    this.raid = { armorReduction: 0, exposeArmor: 0, raidShatter: 0, physDmgTaken: 0, sunderFull: false, ...raid };
    this.targets = Array.from({ length: targets }, (_, i) => ({ i, sunder: 0, sunderEnd: 0, shatter: 0, shatterEnd: 0, taken: 0, dead: false, own: {},
      tcEnd: 0, slow: 0, demoEnd: 0, apReduction: 0 }));
    if (this.raid.sunderFull) for (const t of this.targets) { t.sunder = SUNDER.maxStacks; t.sunderEnd = Infinity; }
  }

  // One player's own state on a target (their bleeds), by the player's unit id.
  own(target, uid) { return target.own[uid] || (target.own[uid] = { rend: null, rendEnd: 0, dw: null }); }

  // A Sunder Armor application at time t (anyone's): +1 stack (a new set if it ran out), 30 s from now.
  addSunder(target, t) {
    target.sunder = target.sunderEnd > t ? Math.min(SUNDER.maxStacks, target.sunder + 1) : 1;
    target.sunderEnd = Math.max(target.sunderEnd, t + SUNDER.duration);
  }

  addShatter(target, t, duration) {
    target.shatter = target.shatterEnd > t ? Math.min(3, target.shatter + 1) : 1;
    target.shatterEnd = t + duration;
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
  // the larger counts) and Armor Shatter (anyone's or the raid's, the larger). A player's own armor penetration is
  // added by their unit.
  armorRemoved(target, t) {
    const r = this.raid;
    const sunder = target.sunderEnd > t ? target.sunder * SUNDER.armor : 0;
    const shatter = target.shatterEnd > t ? target.shatter * SHATTER_PER_STACK : 0;
    return r.armorReduction + Math.max(sunder, r.exposeArmor || 0) + Math.max(shatter, r.raidShatter);
  }
}

// The raid's debuffs from a character sheet (until a group sets them for everyone).
export function raidOf(sheet) {
  return {
    armorReduction: sheet.raidArmorReduction ?? sheet.armorReduction ?? 0,
    exposeArmor: sheet.exposeArmor || 0,
    raidShatter: sheet.raidShatter || 0,
    physDmgTaken: sheet.raidPhysDmgTaken ?? sheet.physDmgTaken ?? 0,
    sunderFull: !!(sheet.sunder && sheet.sunder.mode === 'full'),
  };
}
