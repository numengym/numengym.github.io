// The warrior spellbook at level 60, like the game's: every class spell at its highest rank in Forever (spell IDs
// and icons from the wowsims db.json), in the game's tabs. Talent spells are only in the book when talented.
// id: the trainer's action id; the ones in ABILITIES (warrior.js) can be cast in the trainer, the others are
// listed for completeness until the trainer models them.
import { ABILITIES } from './warrior.js';

export const SPELLBOOK_TABS = [
  {
    name: 'General',
    spells: [
      { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' },
      { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
      { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' },
      { id: 'potion', name: 'Resource Potion', icon: 'inv_potion_41' }, { id: 'offensivePotion', name: 'Offensive Potion', icon: 'inv_potion_41' },
    { id: 'defensivePotion', name: 'Defensive Potion', icon: 'inv_potion_69' },
      { id: 'explosive', name: 'Explosive', icon: 'spell_fire_selfdestruct' },
    ],
  },
  {
    name: 'Arms',
    spells: [
      { id: 'battleStance', name: 'Battle Stance', spellId: 2457, icon: 'ability_warrior_offensivestance' },
      { id: 'charge', name: 'Charge', spellId: 11578, icon: 'ability_warrior_charge' },
      { id: 'heroicStrike', name: 'Heroic Strike', spellId: 25286, icon: 'ability_rogue_ambush' },
      { id: 'rend', name: 'Rend', spellId: 11574, icon: 'ability_gouge' },
      { id: 'thunderClap', name: 'Thunder Clap', spellId: 11581, icon: 'spell_nature_thunderclap' },
      { id: 'hamstring', name: 'Hamstring', spellId: 7373, icon: 'ability_shockwave' },
      { id: 'overpower', name: 'Overpower', spellId: 11585, icon: 'ability_meleedamage' },
      { id: 'mockingBlow', name: 'Mocking Blow', spellId: 20560, icon: 'ability_warrior_punishingblow' },
      { id: 'retaliation', name: 'Retaliation', spellId: 20230, icon: 'ability_warrior_challange' },
      { id: 'victoryRush', name: 'Victory Rush', spellId: 402927, icon: 'ability_warrior_devastate' },
      { id: 'sweepingStrikes', name: 'Sweeping Strikes', spellId: 12292, icon: 'ability_rogue_slicedice', talent: 'sweepingStrikes' },
      { id: 'mortalStrike', name: 'Mortal Strike', spellId: 21553, icon: 'ability_warrior_savageblow', talent: 'mortalStrike' },
    ],
  },
  {
    name: 'Fury',
    spells: [
      { id: 'berserkerStance', name: 'Berserker Stance', spellId: 2458, icon: 'ability_racial_avatar' },
      { id: 'battleShout', name: 'Battle Shout', spellId: 25289, icon: 'ability_warrior_battleshout' },
      { id: 'berserkerRage', name: 'Berserker Rage', spellId: 18499, icon: 'spell_nature_ancestralguardian' },
      { id: 'cleave', name: 'Cleave', spellId: 20569, icon: 'ability_warrior_cleave' },
      { id: 'demoralizingShout', name: 'Demoralizing Shout', spellId: 11556, icon: 'ability_warrior_warcry' },
      { id: 'execute', name: 'Execute', spellId: 20662, icon: 'inv_sword_48' },
      { id: 'intercept', name: 'Intercept', spellId: 20617, icon: 'ability_rogue_sprint' },
      { id: 'intimidatingShout', name: 'Intimidating Shout', spellId: 5246, icon: 'ability_golemthunderclap' },
      { id: 'pummel', name: 'Pummel', spellId: 6554, icon: 'inv_gauntlets_04' },
      { id: 'recklessness', name: 'Recklessness', spellId: 1719, icon: 'ability_criticalstrike' },
      { id: 'slam', name: 'Slam', spellId: 11605, icon: 'ability_warrior_decisivestrike' },
      { id: 'challengingShout', name: 'Challenging Shout', spellId: 1161, icon: 'ability_bullrush' },
      { id: 'whirlwind', name: 'Whirlwind', spellId: 1680, icon: 'ability_whirlwind' },
      { id: 'piercingHowl', name: 'Piercing Howl', spellId: 12323, icon: 'spell_shadow_deathscream', talent: 'piercingHowl' },
      { id: 'deathWish', name: 'Death Wish', spellId: 12328, icon: 'spell_shadow_deathpact', talent: 'deathWish' },
      { id: 'bloodthirst', name: 'Bloodthirst', spellId: 23894, icon: 'spell_nature_bloodlust', talent: 'bloodthirst' },
    ],
  },
  {
    name: 'Protection',
    spells: [
      { id: 'defensiveStance', name: 'Defensive Stance', spellId: 71, icon: 'ability_warrior_defensivestance' },
      { id: 'bloodrage', name: 'Bloodrage', spellId: 2687, icon: 'ability_racial_bloodrage' },
      { id: 'sunderArmor', name: 'Sunder Armor', spellId: 11597, icon: 'ability_warrior_sunder' },
      { id: 'taunt', name: 'Taunt', spellId: 355, icon: 'spell_nature_reincarnation' },
      { id: 'disarm', name: 'Disarm', spellId: 676, icon: 'ability_warrior_disarm' },
      { id: 'revenge', name: 'Revenge', spellId: 25288, icon: 'ability_warrior_revenge' },
      { id: 'shieldBash', name: 'Shield Bash', spellId: 1672, icon: 'ability_warrior_shieldbash' },
      { id: 'shieldBlock', name: 'Shield Block', spellId: 2565, icon: 'ability_defend' },
      { id: 'shieldWall', name: 'Shield Wall', spellId: 871, icon: 'ability_warrior_shieldwall' },
      { id: 'lastStand', name: 'Last Stand', spellId: 12975, icon: 'spell_holy_ashestoashes', talent: 'lastStand' },
      { id: 'concussionBlow', name: 'Concussion Blow', spellId: 12809, icon: 'ability_thunderbolt', talent: 'concussionBlow' },
      { id: 'shieldSlam', name: 'Shield Slam', spellId: 23925, icon: 'inv_shield_05', talent: 'shieldSlam' },
    ],
  },
];

// Can the trainer cast it (is it in its engine)?
export const castable = (id) => !!ABILITIES[id];

// The book for a set of talent points: talent spells only when talented.
export function spellbook(talents) {
  return SPELLBOOK_TABS.map((tab) => ({ ...tab, spells: tab.spells.filter((s) => !s.talent || talents[s.talent] > 0) }));
}
