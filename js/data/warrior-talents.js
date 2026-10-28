// Warrior talent trees from wowsims/forever ui/sim/talents/trees/warrior.json (names, places, ranks,
// prerequisites; the order is the order of the wowsims talent string), with icons from its db.json.
// key: the wowsims field name (and the engine's, see TALENT_TREES in warrior.js). prereq: [row, col] of a
// talent that has to be maxed first.
import { TALENT } from './warrior.js';

export const MAX_TALENT_POINTS = 51;      // level 60
export const POINTS_PER_TIER = 5;         // a row opens after 5 points per row above it in that tree

export const TALENT_TREE_DATA = [
  {
    name: 'Arms', bg: 'https://wow.zamimg.com/images/wow/talents/backgrounds/tbc/161.jpg',
    talents: [
      { key: 'improvedHeroicStrike', name: 'Improved Heroic Strike', row: 0, col: 0, max: 3, spellId: 12282, icon: 'ability_rogue_ambush' },
      { key: 'deflection', name: 'Deflection', row: 0, col: 1, max: 5, spellId: 16462, icon: 'ability_parry' },
      { key: 'improvedRend', name: 'Improved Rend', row: 0, col: 2, max: 3, spellId: 12286, icon: 'ability_gouge' },
      { key: 'improvedCharge', name: 'Improved Charge', row: 1, col: 0, max: 2, spellId: 12285, icon: 'ability_warrior_charge' },
      { key: 'improvedTacticalMastery', name: 'Improved Tactical Mastery', row: 1, col: 1, max: 5, spellId: 12295, icon: 'spell_nature_enchantarmor' },
      { key: 'improvedOverpower', name: 'Improved Overpower', row: 1, col: 3, max: 2, spellId: 12290, icon: 'inv_sword_05' },
      { key: 'angerManagement', name: 'Anger Management', row: 2, col: 1, max: 1, spellId: 12296, icon: 'spell_holy_blessingofstamina', prereq: [1, 1] },
      { key: 'deepWounds', name: 'Deep Wounds', row: 2, col: 2, max: 3, spellId: 12834, icon: 'ability_backstab', prereq: [0, 2] },
      { key: 'spearingStrike', name: 'Spearing Strike', row: 3, col: 0, max: 1, spellId: 1310222, icon: 'inv_spear_01' },
      { key: 'twohandedWeaponSpecialization', name: 'Two-Handed Weapon Specialization', row: 3, col: 1, max: 3, spellId: 12163, icon: 'inv_axe_09' },
      { key: 'impale', name: 'Impale', row: 3, col: 2, max: 2, spellId: 16493, icon: 'ability_searingarrow', prereq: [2, 2] },
      { key: 'bloodthrill', name: 'Bloodthrill', row: 4, col: 0, max: 5, spellId: 1289682, icon: 'inv_sword_01' },
      { key: 'sweepingStrikes', name: 'Sweeping Strikes', row: 4, col: 1, max: 1, spellId: 12292, icon: 'ability_rogue_slicedice' },
      { key: 'weaponmaster', name: 'Weaponmaster', row: 4, col: 2, max: 5, spellId: 1290261, icon: 'garrison_weaponupgrade' },
      { key: 'improvedSlam', name: 'Improved Slam', row: 5, col: 0, max: 2, spellId: 12862, icon: 'ability_warrior_decisivestrike' },
      { key: 'improvedHamstring', name: 'Improved Hamstring', row: 5, col: 2, max: 3, spellId: 12289, icon: 'ability_shockwave' },
      { key: 'mortalStrike', name: 'Mortal Strike', row: 6, col: 1, max: 1, spellId: 12294, icon: 'ability_warrior_savageblow', prereq: [4, 1] },
    ],
  },
  {
    name: 'Fury', bg: 'https://wow.zamimg.com/images/wow/talents/backgrounds/tbc/164.jpg',
    talents: [
      { key: 'boomingVoice', name: 'Booming Voice', row: 0, col: 1, max: 5, spellId: 12321, icon: 'spell_nature_purge' },
      { key: 'cruelty', name: 'Cruelty', row: 0, col: 2, max: 5, spellId: 12320, icon: 'ability_rogue_eviscerate' },
      { key: 'lingeringRage', name: 'Lingering Rage', row: 1, col: 1, max: 5, spellId: 1323964, icon: 'ability_warrior_secondwind' },
      { key: 'unbridledWrath', name: 'Unbridled Wrath', row: 1, col: 2, max: 5, spellId: 12322, icon: 'spell_nature_stoneclawtotem' },
      { key: 'furiousPrecision', name: 'Furious Precision', row: 2, col: 0, max: 3, spellId: 1323963, icon: 'ability_warrior_incite' },
      { key: 'piercingHowl', name: 'Piercing Howl', row: 2, col: 1, max: 1, spellId: 12323, icon: 'spell_shadow_deathscream' },
      { key: 'bloodCraze', name: 'Blood Craze', row: 2, col: 2, max: 3, spellId: 16487, icon: 'spell_shadow_summonimp' },
      { key: 'dualWieldSpecialization', name: 'Dual Wield Specialization', row: 3, col: 0, max: 5, spellId: 23584, icon: 'ability_dualwield' },
      { key: 'ragingBlows', name: 'Raging Blows', row: 3, col: 1, max: 1, spellId: 1310315, icon: 'ability_whirlwind' },
      { key: 'enrage', name: 'Enrage', row: 3, col: 2, max: 5, spellId: 12317, icon: 'spell_shadow_unholyfrenzy' },
      { key: 'improvedExecute', name: 'Improved Execute', row: 3, col: 3, max: 2, spellId: 20502, icon: 'inv_sword_48' },
      { key: 'improvedBerserkerRage', name: 'Improved Berserker Rage', row: 4, col: 0, max: 2, spellId: 20500, icon: 'spell_nature_ancestralguardian' },
      { key: 'deathWish', name: 'Death Wish', row: 4, col: 1, max: 1, spellId: 12328, icon: 'spell_shadow_deathpact' },
      { key: 'improvedIntercept', name: 'Improved Intercept', row: 4, col: 3, max: 2, spellId: 20504, icon: 'ability_rogue_sprint' },
      { key: 'flurry', name: 'Flurry', row: 5, col: 1, max: 5, spellId: 12319, icon: 'ability_ghoulfrenzy', prereq: [4, 1] },
      { key: 'goreDrinker', name: 'Gore Drinker', row: 5, col: 2, max: 2, spellId: 1323967, icon: 'racial_troll_berserk', prereq: [3, 2] },
      { key: 'bloodthirst', name: 'Bloodthirst', row: 6, col: 1, max: 1, spellId: 23881, icon: 'spell_nature_bloodlust' },
    ],
  },
  {
    name: 'Protection', bg: 'https://wow.zamimg.com/images/wow/talents/backgrounds/tbc/163.jpg',
    talents: [
      { key: 'improvedBloodrage', name: 'Improved Bloodrage', row: 0, col: 0, max: 2, spellId: 12301, icon: 'ability_racial_bloodrage' },
      { key: 'shieldSpecialization', name: 'Shield Specialization', row: 0, col: 1, max: 5, spellId: 12298, icon: 'inv_shield_06' },
      { key: 'ironWill', name: 'Iron Will', row: 0, col: 2, max: 5, spellId: 12962, icon: 'spell_magic_magearmor' },
      { key: 'anticipation', name: 'Anticipation', row: 1, col: 0, max: 5, spellId: 12297, icon: 'spell_nature_mirrorimage' },
      { key: 'improvedRevenge', name: 'Improved Revenge', row: 1, col: 2, max: 3, spellId: 12797, icon: 'ability_warrior_revenge' },
      { key: 'improvedThunderClap', name: 'Improved Thunder Clap', row: 1, col: 3, max: 3, spellId: 12287, icon: 'ability_thunderclap' },
      { key: 'lastStand', name: 'Last Stand', row: 2, col: 0, max: 1, spellId: 12975, icon: 'spell_holy_ashestoashes' },
      { key: 'masterOfDefense', name: 'Master of Defense', row: 2, col: 1, max: 2, spellId: 1310316, icon: 'ability_warrior_shieldguard', prereq: [0, 1] },
      { key: 'improvedDisarm', name: 'Improved Disarm', row: 2, col: 2, max: 3, spellId: 12313, icon: 'ability_warrior_disarm' },
      { key: 'defiance', name: 'Defiance', row: 2, col: 3, max: 3, spellId: 12792, icon: 'ability_warrior_innerrage' },
      { key: 'improvedSunderArmor', name: 'Improved Sunder Armor', row: 3, col: 0, max: 3, spellId: 12308, icon: 'ability_warrior_sunder' },
      { key: 'vanguard', name: 'Vanguard', row: 3, col: 1, max: 1, spellId: 1310317, icon: 'ability_warrior_shieldcharge' },
      { key: 'improvedShieldBash', name: 'Improved Shield Bash', row: 3, col: 2, max: 2, spellId: 12311, icon: 'ability_warrior_shieldbash' },
      { key: 'improvedShieldWall', name: 'Improved Shield Wall', row: 4, col: 0, max: 2, spellId: 12312, icon: 'ability_warrior_shieldwall' },
      { key: 'concussionBlow', name: 'Concussion Blow', row: 4, col: 1, max: 1, spellId: 12809, icon: 'ability_thunderbolt' },
      { key: 'focusedRage', name: 'Focused Rage', row: 4, col: 2, max: 3, spellId: 29787, icon: 'ability_warrior_focusedrage' },
      { key: 'bastion', name: 'Bastion', row: 5, col: 2, max: 5, spellId: 16538, icon: 'inv_shield_04' },
      { key: 'shieldSlam', name: 'Shield Slam', row: 6, col: 1, max: 1, spellId: 23922, icon: 'inv_shield_05', prereq: [4, 1] },
    ],
  },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;

// What a talent does in the trainer's fight engine, per point (p = points spent). Talents without an entry are
// not modelled by the trainer; the wowsims DPS of a build still counts them.
export const TALENT_EFFECTS = {
  improvedHeroicStrike: (p) => `Heroic Strike costs ${p * TALENT.improvedHeroicStrike.costPerRank} less rage.`,
  improvedRend: (p) => `Rend deals ${pct(TALENT.improvedRend.bonus[p] || 0)} more damage (approximate).`,
  improvedCharge: (p) => `Charge generates ${p * 3} more rage.`,
  improvedTacticalMastery: (p) => `You keep up to ${TALENT.tacticalMastery.base + p * TALENT.tacticalMastery.perRank} rage when you change stance.`,
  improvedOverpower: (p) => `Overpower has ${p * TALENT.improvedOverpower.critPerRank}% more crit chance.`,
  angerManagement: () => 'You generate rage over time in combat.',
  deepWounds: (p) => `Your physical crits make the target bleed for ${pct(p * TALENT.deepWounds.sharePerRank)} of your average main-hand hit over ${TALENT.deepWounds.duration} sec; damage still to tick rolls into the new bleed.`,
  impale: (p) => `Your abilities' critical strikes deal ${pct(p * TALENT.impale.critBonusPerRank)} more damage.`,
  boomingVoice: (p) => `Battle Shout costs ${pct(p * TALENT.boomingVoice.shoutCostPerRank)} less rage.`,
  cruelty: (p) => `+${p * TALENT.cruelty.critPerRank}% crit chance (approximate).`,
  unbridledWrath: (p) => `${pct(p * TALENT.unbridledWrath.chancePerRank)} chance on a white hit to gain ${TALENT.unbridledWrath.rage} rage.`,
  furiousPrecision: (p) => `+${p * TALENT.furiousPrecision.ohHitPerRank}% hit with your off hand (approximate).`,
  bloodCraze: () => 'After a hit for more than 20% of your health, you regenerate some health.',
  dualWieldSpecialization: (p) => `Your off hand deals ${pct(p * TALENT.dualWieldSpecialization.ohDmgPerRank)} more damage and generates that much more rage.`,
  ragingBlows: () => `Whirlwind also strikes with your off hand; Cleave and Whirlwind cost ${TALENT.ragingBlows.costReduction} less rage.`,
  enrage: (p) => `${pct(TALENT.enrage.chance)} chance when you are hit to deal ${pct(p * TALENT.enrage.dmgPerRank)} more damage for ${TALENT.enrage.duration} sec.`,
  improvedExecute: (p) => `Execute costs ${TALENT.improvedExecute.costReduction[p] || 0} less rage.`,
  improvedBerserkerRage: (p) => `Berserker Rage generates ${p * TALENT.improvedBerserkerRage.ragePerRank} rage.`,
  deathWish: () => 'Learn Death Wish: 20% more physical damage for 30 sec.',
  improvedIntercept: (p) => `Intercept's cooldown is ${p * TALENT.improvedIntercept.cdPerRank} sec shorter.`,
  flurry: (p) => `After a critical strike your next ${TALENT.flurry.charges} swings are ${pct(p * TALENT.flurry.hastePerRank)} faster.`,
  bloodthirst: () => 'Learn Bloodthirst.',
  // Arms (per-rank splits of the full-rank values are approximate)
  twohandedWeaponSpecialization: (p) => `${pct(p * TALENT.twohandedWeaponSpecialization.dmgPerRank)} more damage with a two-handed weapon.`,
  improvedSlam: (p) => `Slam casts ${p * TALENT.improvedSlam.castPerRank} sec faster, its global cooldown is ${p * TALENT.improvedSlam.gcdPerRank} sec shorter, its cooldown ${p * TALENT.improvedSlam.cdPerRank} sec shorter, and it no longer holds your swing.`,
  weaponmaster: (p) => `Axe or polearm: +${p * TALENT.weaponmaster.critPerRank}% crit. Mace or staff: ignore ${pct(p * TALENT.weaponmaster.armorIgnorePerRank)} of the target's armor. Sword: ${pct(p * TALENT.weaponmaster.extraAttackPerRank)} chance on a main-hand hit for an extra attack.`,
  bloodthrill: (p) => `Your main-hand swings, Heroic Strike and Cleave have a ${pct(p * TALENT.bloodthrill.chancePerRank)} chance to let you Overpower while your Rend is on the target.`,
  spearingStrike: () => 'Learn Spearing Strike: 40% of your normalized weapon damage (Battle Stance, 20 sec cooldown).',
  sweepingStrikes: () => 'Learn Sweeping Strikes: your next 5 melee hits also strike another nearby enemy (Battle Stance).',
  mortalStrike: () => 'Learn Mortal Strike: normalized weapon damage + 160 (6 sec cooldown).',
};

// Talents that only matter for tanking or utility: they change nothing on a training dummy. Lingering Rage only
// slows rage decay out of combat and Gore Drinker heals when Enrage procs (wowsims talents_fury.go).
export const NO_DPS_EFFECT = new Set(['lingeringRage', 'goreDrinker', 'improvedHamstring', 'deflection', 'piercingHowl', 'shieldSpecialization', 'ironWill', 'anticipation',
  'improvedRevenge', 'improvedThunderClap', 'lastStand', 'masterOfDefense', 'improvedDisarm', 'defiance', 'improvedShieldBash',
  'improvedShieldWall', 'concussionBlow', 'bastion', 'shieldSlam', 'vanguard', 'improvedBloodrage', 'focusedRage', 'improvedSunderArmor']);

// Builds: the wowsims talent presets (ui/specs/warrior/dps/presets.ts). playable: the trainer has the abilities.
export const BUILT_IN_BUILDS = [
  { id: 'fury', name: 'Fury (wowsims preset)', talents: '30305213002-15053105102210501', playable: true },
  // 5/5 Enrage (30% on a hit taken: +25% physical damage for 12 s) and 2/5 Lingering Rage instead of Blood Craze,
  // Booming Voice and Improved Berserker Rage. Enrage needs hits: Settings → Fight → take a hit every N s, or the boss.
  { id: 'fury-enrage', name: 'Fury Enrage', talents: '30305013002-05253005151010501', playable: true,
    note: 'Enrage procs when you are hit: take hits (Settings → Fight) or fight the boss; on a quiet dummy it rarely procs' },
  { id: 'arms', name: 'Arms (wowsims preset)', talents: '30325213132515201-0505-2', playable: true, spec: 'arms',
    note: 'Two-handed, Battle Stance: Mortal Strike, Slam, Overpower and Rend' },
];
