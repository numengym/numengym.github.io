// Raid buffs, party buffs, individual buffs and boss debuffs for a Forever Fury warrior, keyed by the wowsims
// field names (proto/buffs.proto) so a wowsims export maps onto them directly. Which buffs there are, and their
// values, come from wowsims Forever: ui/features/settings/model/buffs_debuffs*.ts (the inputs) and
// sim/core/buffs/* with the spell store sim/core/spelldata/spells_auto_gen.go (the amounts). Buffs that do
// nothing for a melee warrior (spell power, mana, resistances, ranged attack power) are left out.
//
// levels: 1 = on/off. Only Battle Shout has two (wowsims TristateEffect: Battle Shout / Enhanced Battle Shout);
// Forever has no improved versions of the other buffs. Each stats list has one entry per level.
// cat: buffs in the same wowsims category do not stack; only the strongest applies.

export const BUFF_GROUPS = [
  {
    title: 'Raid buffs', source: 'raidBuffs', buffs: {
      battleShout: {
        name: 'Battle Shout', icon: 'ability_warrior_battleshout', levels: 2, cat: 'attackPower', numeric: true, // 1 / 2 in wowsims
        levelNames: ['Battle Shout', 'Enhanced Battle Shout'],
        desc: ['+139 attack power (25289), from another warrior', '+169 attack power: Enhanced Battle Shout (23563) adds 30'],
        stats: [{ externalShout: 139 }, { externalShout: 169 }],
      },
      furiousHowl: { name: 'Furious Howl', icon: 'ability_hunter_pet_wolf', levels: 1, cat: 'attackPower', desc: ['+82 attack power (24597); does not stack with Battle Shout'], stats: [{ externalShout: 82 }] },
      strengthOfEarthTotem: { name: 'Strength of Earth Totem', icon: 'spell_nature_earthbindtotem', levels: 1, desc: ['+53 Strength (25362)'], stats: [{ str: 53 }] },
      graceOfAirTotem: { name: 'Grace of Air Totem', icon: 'spell_nature_invisibilitytotem', levels: 1, desc: ['+89 Agility (25360)'], stats: [{ agi: 89 }] },
      windfuryTotem: { name: 'Windfury Totem', icon: 'spell_nature_windfury', levels: 1, desc: ['20% chance on a main-hand hit for an extra attack with +246 attack power (10610)'], stats: [{ windfuryAp: 246 }] },
      // Leader of the Pack and Moonkin Aura: all crit (A_MOD_CRIT_PCT) and one category since hotfix 113531, so only one counts.
      leaderOfThePack: { name: 'Leader of the Pack', icon: 'spell_nature_unyeildingstamina', levels: 1, cat: 'raidCrit', desc: ['+3% crit with attacks and spells (24932)'], stats: [{ raidCritPct: 3 }] },
      giftOfTheWild: { name: 'Gift of the Wild', icon: 'spell_nature_giftofthewild', levels: 1, desc: ['+16 to all stats and +385 armor (21850)'], stats: [{ str: 16, agi: 16, sta: 16, int: 16, spi: 16, playerArmor: 385 }] },
      prayerOfFortitude: { name: 'Prayer of Fortitude', icon: 'spell_holy_prayeroffortitude', levels: 1, desc: ['+70 Stamina (21564)'], stats: [{ sta: 70 }] },
      // Casters (shown for a class with mana).
      arcaneBrilliance: { name: 'Arcane Brilliance', icon: 'spell_holy_arcaneintellect', levels: 1, caster: true, desc: ['+31 Intellect (23028)'], stats: [{ int: 31 }] },
      prayerOfSpirit: { name: 'Prayer of Spirit', icon: 'spell_holy_prayerofspirit', levels: 1, caster: true, desc: ['+40 Spirit (27681)'], stats: [{ spi: 40 }] },
      moonkinAura: { name: 'Moonkin Aura', icon: 'spell_nature_moonglow', levels: 1, cat: 'raidCrit', desc: ['+3% crit with attacks and spells (24907)'], stats: [{ raidCritPct: 3 }] },
    },
  },
  {
    title: 'Party buffs', source: 'partyBuffs', buffs: {
      // wowsims holds the 4% crit up for its average uptime: 20 s out of each 60 s cooldown plus the ~64 s a 5%
      // chance takes on a 3.2 s swing, about 16% of the fight. Averaged here: 4% x 0.161.
      manaSpringTotem: { name: 'Mana Spring Totem', icon: 'spell_nature_manaregentotem', levels: 1, caster: true, numeric: true, desc: ['10 mana every 2 sec (10494): 25 mana per 5 sec'], stats: [{ mp5: 25 }] },
      darkInspiration: { name: 'Dark Inspiration', icon: 'spell_shadow_requiem', levels: 1, caster: true, numeric: true, desc: ['+3% Spirit (1326168), as the wowsims sheet counts it'], stats: [{ spiMult: 0.03 }] },
      darkspear: { name: 'Darkspear', icon: 'inv_spear_08', levels: 1, desc: ['+4% crit (16939) about 16% of the fight, from a troll\'s Darkspear; counted as +0.65% crit'], stats: [{ critPct: 0.65 }] },
    },
  },
  {
    title: 'Blessings', source: 'buffs', buffs: {
      greaterBlessingOfKings: { name: 'Greater Blessing of Kings', icon: 'spell_magic_greaterblessingofkings', levels: 1, desc: ['+10% to all stats (25898)'], stats: [{ statMult: 0.1 }] },
      greaterBlessingOfMight: { name: 'Greater Blessing of Might', icon: 'spell_holy_greaterblessingofkings', levels: 1, desc: ['+133 attack power (25916)'], stats: [{ ap: 133 }] },
      greaterBlessingOfWisdom: { name: 'Greater Blessing of Wisdom', icon: 'spell_holy_greaterblessingofwisdom', levels: 1, caster: true, desc: ['40 mana every 5 sec (25918)'], stats: [{ mp5: 40 }] },
      // On by default for everyone but a tank (main.js), and always with a paladin in the raid.
      greaterBlessingOfSalvation: { name: 'Greater Blessing of Salvation', icon: 'spell_holy_greaterblessingofsalvation', levels: 1, desc: ['30% less threat (25895)'], stats: [{ threatReduction: 0.3 }] },
    },
  },
  {
    // Sunder Armor and Expose Armor are picked together below (ARMOR_DEBUFFS) because they do not stack.
    title: 'Boss debuffs', source: 'debuffs', buffs: {
      faerieFire: { name: 'Faerie Fire', icon: 'spell_nature_faeriefire', levels: 1, cat: 'minorArmor', desc: ['-505 armor (9907)'], stats: [{ minorArmor: 505 }] },
      curseOfRecklessness: { name: 'Curse of Recklessness', icon: 'spell_shadow_unholystrength', levels: 1, cat: 'minorArmor', desc: ['-505 armor (11717)'], stats: [{ minorArmor: 505 }] },
      dustCloud: { name: 'Dust Cloud', icon: 'ability_hunter_pet_tallstrider', levels: 1, cat: 'minorArmor', desc: ['-505 armor (1265904), a hunter pet'], stats: [{ minorArmor: 505 }] },
      armorShatter: { name: 'Armor Shatter (Annihilator)', icon: 'inv_axe_12', levels: 1, desc: ['-495 armor: 3 stacks of 165 (16928), held at 3 like wowsims'], stats: [{ raidShatter: 495 }] },
      judgementOfWisdom: { name: 'Judgement of Wisdom', icon: 'spell_holy_righteousnessaura', levels: 1, caster: true, desc: ['Your melee hits have a 50% chance to restore 59 mana (20355)'], stats: [{ jow: 59 }] },
      curseOfElements: { name: 'Curse of the Elements', icon: 'spell_shadow_chilltouch', levels: 1, caster: true, desc: ['+10% magic damage taken (1311680)'], stats: [{ spellDmgTaken: 0.1 }] },
      judgementOfTheCrusader: { name: 'Judgement of the Crusader', icon: 'spell_holy_holysmite', levels: 1, caster: true, desc: ['+161 Holy damage taken, at the spell\'s spell power coefficient (20303)'], stats: [{ holyTaken: 161 }] },
      giftOfArthas: { name: 'Gift of Arthas', icon: 'spell_shadow_fingerofdeath', levels: 1, desc: ['+8 physical damage taken per hit (11374)'], stats: [{ physDmgTaken: 8 }] },
    },
  },
];

// Wowsims categories: in each, only the strongest buff counts (the stat named here is taken as a maximum).
export const BUFF_CATEGORIES = {
  attackPower: { title: 'Attack power', stat: 'externalShout' },
  minorArmor: { title: 'Minor armor reduction', stat: 'minorArmor' },
  raidCrit: { title: 'Raid crit', stat: 'raidCritPct' },
};

// The major armor debuff on the boss. Sunder Armor (450 per stack, 5 stacks) and Expose Armor (450 per combo
// point at 5 points, 11198) share a category, so only one applies; in Forever both remove 2250 armor.
// "help" means other warriors stack Sunder with their first global cooldowns.
export const ARMOR_DEBUFFS = [
  { id: 'none', name: 'None (only your own Sunders)' },
  { id: 'sunder', name: 'Sunder Armor ×5 (already up, a tank keeps it)', sunderArmor: true },
  { id: 'sunderHelp', name: 'Sunder Armor – other warriors help stack it at the pull', sunderArmor: true, help: true },
  { id: 'expose', name: 'Expose Armor (2250, from the pull)', exposeArmor: 1 },
];
export const EXPOSE_ARMOR = [0, 2250, 2250];

// Which armor debuff a loadout has. A wowsims export can have both on; they do not stack.
export function armorDebuffOf(loadout) {
  const d = loadout.debuffs || {};
  const ea = effectLevel(d.exposeArmor);
  if (d.sunderArmor) return loadout.trainer && loadout.trainer.sunderHelp ? 'sunderHelp' : 'sunder';
  if (ea) return 'expose';
  return 'none';
}

// Windfury Totem (10610 / 10612): 20% chance on a main-hand hit for an extra attack.
export const WINDFURY = { chance: 0.2 };

// Reads a wowsims TristateEffect / bool value as 0 (off), 1 (regular) or 2 (improved).
export function effectLevel(v) {
  if (v === true || v === 1 || v === 'TristateEffectRegular') return 1;
  if (v === 2 || v === 'TristateEffectImproved') return 2;
  if (typeof v === 'number' && v > 0) return 1;
  return 0;
}

// The value wowsims writes for a level. numeric: a count in wowsims (Mana Spring Totem, Dark Inspiration).
export function levelValue(levels, level, numeric = false) {
  if (!level) return undefined;
  if (numeric) return level;
  if (levels === 1) return true;
  return level === 2 ? 'TristateEffectImproved' : 'TristateEffectRegular';
}

// Consumable pickers: wowsims ConsumesSpec field, label and the wowsims ConsumableType it lists.
export const CONSUMABLE_SLOTS = [
  { field: 'flaskId', label: 'Flask', type: 2 },
  { field: 'foodId', label: 'Food', type: 3 },
  { field: 'elixirIds', index: 0, label: 'Elixir 1', type: 11 },
  { field: 'elixirIds', index: 1, label: 'Elixir 2', type: 11 },
  { field: 'elixirIds', index: 2, label: 'Elixir 3', type: 11 },
  { field: 'mhImbueId', label: 'Main-hand stone', type: 6 },
  { field: 'ohImbueId', label: 'Off-hand stone', type: 6 },
  // wowsims' three potion pickers, each offering the potions of its class (potion-classes.js).
  { field: 'offensivePotId', label: 'Offensive potion', type: 1, potionClass: 3 },
  { field: 'defensivePotId', label: 'Defensive potion', type: 1, potionClass: 2 },
  { field: 'resourcePotId', label: 'Resource potion', type: 1, potionClass: 1 },
  { field: 'explosiveId', label: 'Explosive', type: 5 },
];

// Weapon stones and oils whose effect wowsims applies in code rather than as stats (APPROX).
export const IMBUE_EXTRAS = {
  18262: { critPct: 2 }, // Elemental Sharpening Stone
  20749: { spellCritPct: 1 }, // Brilliant Wizard Oil (enchant 2628)
};

// Oils that put a spell on the weapon's hits (wowsims sim/core/spelldata: the combat spell their temporary enchant
// casts, at level 60): Shadow Oil a Shadow Bolt (350026), with a 10 sec internal cooldown (tools/database spell
// overrides); Frost Oil a Frostbolt (350025), whose slow is not modelled. APPROX: the chances are the items' tooltips'.
export const IMBUE_PROCS = {
  3824: { spell: 350026, name: 'Shadow Bolt', school: 32, min: 63, max: 72, chance: 0.15, icd: 10, icon: 'spell_shadow_shadowbolt' },
  3829: { spell: 350025, name: 'Frostbolt', school: 16, min: 39, max: 44, chance: 0.1, icd: 0, icon: 'spell_frost_frostbolt02' },
};

// The warlock's stones (wowsims mh_weapon_imbue_id), their effect beside the school's damage the stats list carries: a
// Firestone's spell crit (23480-23483), a Spellstone's cast speed (1237162-1237165).
export const WEAPON_IMBUE_EXTRAS = {
  1254: { spellCritPct: 1 }, 13699: { spellCritPct: 1 }, 13700: { spellCritPct: 2 }, 13701: { spellCritPct: 2 },
  5522: { castSpeedPct: 1 }, 13602: { castSpeedPct: 2 }, 13603: { castSpeedPct: 2 },
};
