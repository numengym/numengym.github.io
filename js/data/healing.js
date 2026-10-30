// Healing: the heal spells of the four healing classes and the raid a healer keeps alive. There is no wowsims healing
// sim (and no APL), so the spells are the WoW Forever rows (wowsims sim/core/spelldata/spells_auto_gen.go) at level 60:
// base = BasePoints + PPL x (level - BaseLevel, up to MaxLevel), rolled +/- variance/2, plus coef x healing power.
//   hot: { tick, coef, period, ticks } a heal over time (coef per tick); shield: an absorb (Power Word: Shield and its
//   Weakened Soul); chain: { jumps, mult } to the most hurt others (Chain Heal); party: the target's group of five
//   (Prayer of Healing); dispel: the debuff types it takes off; swiftmend: eats your Rejuvenation or Regrowth.
//   cdKey: the cooldown it shares (Holy Shock's heal and its damage).

// Debuff types as raid frames colour them (Blizzard's DebuffTypeColor).
export const DEBUFF_COLORS = { magic: '#3399ff', curse: '#9900ff', disease: '#996600', poison: '#009900' };

const P = 'priest';
const PA = 'paladin';
const SH = 'shaman';
const DR = 'druid';

export const HEALS = {
  // ---- priest ----
  // 25314 (Rank 5): 3 sec, 710 mana, 1960 +/- 11%, 85.7%.
  greaterHeal: { cls: P, school: 'holy', name: 'Greater Heal', spellId: 25314, icon: 'spell_holy_greaterheal', key: '1', cost: 710, castTime: 3, base: 1960, variance: 0.1096, coef: 0.857, desc: 'A slow, large heal: 1960 plus 85.7% of your healing power. 3 sec cast.' },
  // 10917 (Rank 7): 1.5 sec, 380 mana, 825 + 4.2 x 4 levels, 42.9%.
  flashHeal: { cls: P, school: 'holy', name: 'Flash Heal', spellId: 10917, icon: 'spell_holy_flashheal', key: '2', cost: 380, castTime: 1.5, base: 841.8, variance: 0.165, coef: 0.429, desc: 'A fast, costly heal: 842 plus 42.9% of your healing power. 1.5 sec cast.' },
  // 6064 (Rank 4): 3 sec, 305 mana, 651 + 4.5 x 5 levels, 85.7%: the cheap one.
  heal: { cls: P, school: 'holy', name: 'Heal', spellId: 6064, icon: 'spell_holy_heal', key: '3', cost: 305, castTime: 3, base: 673.5, variance: 0.1214, coef: 0.857, desc: 'An efficient heal: 674 plus 85.7% of your healing power. 3 sec cast.' },
  // 425277: instant, 410 mana, 194 every 3 sec for 15 sec, 23% a tick.
  renew: { cls: P, school: 'holy', name: 'Renew', spellId: 425277, icon: 'spell_holy_renew', key: '4', cost: 410, hot: { tick: 194, coef: 0.23, period: 3, ticks: 5 }, desc: '194 plus 23% of your healing power every 3 sec for 15 sec.' },
  // 10901 (Rank 10): instant, 500 mana, 4 sec cooldown, absorbs 928 + 10% for 30 sec; Weakened Soul for 15 sec.
  powerWordShield: { cls: P, school: 'holy', name: 'Power Word: Shield', spellId: 10901, icon: 'spell_holy_powerwordshield', key: '5', cost: 500, cd: 4, shield: { amount: 928, coef: 0.1, duration: 30, weakened: 15 }, desc: 'Absorbs 928 plus 10% of your healing power for 30 sec. The target cannot be shielded again for 15 sec (Weakened Soul).' },
  // 25316 (Rank 5): 3 sec, 1070 mana, 649 +/- 5% to each of the target's group, 28.6%.
  prayerOfHealing: { cls: P, school: 'holy', name: 'Prayer of Healing', spellId: 25316, icon: 'spell_holy_prayerofhealing02', key: 'Q', cost: 1070, castTime: 3, base: 649, variance: 0.0542, coef: 0.286, party: true, desc: '649 plus 28.6% of your healing power to everyone in the target\'s group. 3 sec cast.' },
  // 988: 18% of base mana, one magic debuff.
  dispelMagic: { cls: P, school: 'holy', name: 'Dispel Magic', spellId: 988, icon: 'spell_holy_dispelmagic', key: 'E', costPct: 0.18, dispel: ['magic'], desc: 'Removes a magic debuff.' },
  // 552: 15% of base mana, one disease.
  abolishDisease: { cls: P, school: 'holy', name: 'Abolish Disease', spellId: 552, icon: 'spell_nature_nullifydisease', key: 'R', costPct: 0.15, dispel: ['disease'], desc: 'Removes a disease.' },

  // ---- paladin ----
  // 25292 (Rank 9): 2.5 sec, 660 mana, 1580 +/- 11%, 71.4%.
  holyLight: { cls: PA, school: 'holy', name: 'Holy Light', spellId: 25292, icon: 'spell_holy_holybolt', key: '1', cost: 660, castTime: 2.5, base: 1580, variance: 0.1071, coef: 0.714, desc: 'A large heal: 1580 plus 71.4% of your healing power. 2.5 sec cast.' },
  // 19943 (Rank 6): 1.5 sec, 140 mana, 303 + 2.6 x 2 levels, 42.9%: the paladin's cheap, quick heal.
  flashOfLight: { cls: PA, school: 'holy', name: 'Flash of Light', spellId: 19943, icon: 'spell_holy_flashheal', key: '2', cost: 140, castTime: 1.5, base: 308.2, variance: 0.1102, coef: 0.429, desc: 'A quick, very cheap heal: 308 plus 42.9% of your healing power. 1.5 sec cast.' },
  // 25903: Holy Shock's heal, instant, 320 +/- 8%, 42.9%; the talent's 10 sec cooldown and mana, shared with its damage.
  holyShockHeal: { cls: PA, school: 'holy', name: 'Holy Shock (heal)', spellId: 25903, icon: 'spell_holy_searinglight', key: '3', cost: 325, cd: 10, cdKey: 'holyShock', talent: 'holyShock', base: 320, variance: 0.0789, coef: 0.429, desc: 'An instant heal: 320 plus 42.9% of your healing power. Shares its 10 sec cooldown with Holy Shock.' },
  // 4987: one magic, poison or disease debuff (the row lists no cost; 6% of base mana as in Classic, APPROX).
  cleanse: { cls: PA, school: 'holy', name: 'Cleanse', spellId: 4987, icon: 'spell_holy_purify', key: 'E', costPct: 0.06, dispel: ['magic', 'poison', 'disease'], desc: 'Removes a magic, poison or disease debuff.' },

  // ---- shaman ----
  // 25357 (Rank 10): 3 sec, 620 mana, 1615 +/- 13%, 85.7%.
  healingWave: { cls: SH, school: 'nature', name: 'Healing Wave', spellId: 25357, icon: 'spell_nature_magicimmunity', key: '1', cost: 620, castTime: 3, base: 1615, variance: 0.1326, coef: 0.857, desc: 'A large heal: 1615 plus 85.7% of your healing power. 3 sec cast.' },
  // 10468 (Rank 6): 1.5 sec, 380 mana, 820 +/- 11%, 42.9%.
  lesserHealingWave: { cls: SH, school: 'nature', name: 'Lesser Healing Wave', spellId: 10468, icon: 'spell_nature_healingwavelesser', key: '2', cost: 380, castTime: 1.5, base: 820, variance: 0.1091, coef: 0.429, desc: 'A fast heal: 820 plus 42.9% of your healing power. 1.5 sec cast.' },
  // 10623 (Rank 3): 2.5 sec, 405 mana, 490 + 3.3 x 5 levels, 71.4%, then 2 more targets for half each time.
  // 1239243 (Riptide rank 3, the Restoration talent): instant, 6 sec cooldown, 385 mana, 841 +/- 10% at 21.4%, then 161
  // every 3 sec for 15 sec at 10% a tick; a Chain Heal on the target with your Riptide uses it up for 25% more.
  riptide: { cls: SH, school: 'nature', name: 'Riptide', spellId: 1239243, icon: 'spell_nature_riptide', key: '', cost: 385, cd: 6, talent: 'riptide', base: 841, variance: 0.1, coef: 0.214, hot: { tick: 161, coef: 0.1, period: 3, ticks: 5 }, desc: 'An instant heal: 841 plus 21.4% of your healing power, then 161 plus 10% every 3 sec for 15 sec. Your next Chain Heal on that target uses it up and heals 25% more. 6 sec cooldown.' },
  chainHeal: { cls: SH, school: 'nature', name: 'Chain Heal', spellId: 10623, icon: 'spell_nature_healingwavegreater', key: '3', cost: 405, castTime: 2.5, base: 506.5, variance: 0.1322, coef: 0.714, chain: { jumps: 3, mult: 0.5 }, desc: '507 plus 71.4% of your healing power, then jumps to the 2 most hurt others for half as much each time. 2.5 sec cast.' },
  // 526 and 2870: 9% of base mana each.
  curePoison: { cls: SH, school: 'nature', name: 'Cure Poison', spellId: 526, icon: 'spell_nature_nullifypoison', key: 'E', costPct: 0.09, dispel: ['poison'], desc: 'Removes a poison.' },
  cureDisease: { cls: SH, school: 'nature', name: 'Cure Disease', spellId: 2870, icon: 'spell_nature_removedisease', key: 'R', costPct: 0.09, dispel: ['disease'], desc: 'Removes a disease.' },

  // ---- druid ----
  // 25297 (Rank 11): 3.5 sec, 840 mana, 2332 +/- 17%, 100%.
  healingTouch: { cls: DR, school: 'nature', name: 'Healing Touch', spellId: 25297, icon: 'spell_nature_healingtouch', key: '1', cost: 840, castTime: 3.5, base: 2332, variance: 0.1659, coef: 1, desc: 'A very large heal: 2332 plus 100% of your healing power. 3.5 sec cast.' },
  // 25299 (Rank 11): instant, 360 mana, 194 every 3 sec for 12 sec, 20% a tick.
  rejuvenation: { cls: DR, school: 'nature', name: 'Rejuvenation', spellId: 25299, icon: 'spell_nature_rejuvenation', key: '2', cost: 360, hot: { tick: 194, coef: 0.2, period: 3, ticks: 4 }, desc: '194 plus 20% of your healing power every 3 sec for 12 sec.' },
  // 9858 (Rank 9): 2 sec, 525 mana, 1021 +/- 11% (28.6%), then 142 every 3 sec for 21 sec (7.1% a tick).
  regrowth: { cls: DR, school: 'nature', name: 'Regrowth', spellId: 9858, icon: 'spell_nature_resistnature', key: '3', cost: 525, castTime: 2, base: 1021, variance: 0.1093, coef: 0.286, hot: { tick: 142, coef: 0.071, period: 3, ticks: 7 }, desc: '1021 plus 28.6% of your healing power, then 142 plus 7.1% every 3 sec for 21 sec. 2 sec cast.' },
  // 18562 (talent): instant, 15 sec cooldown, 20% of base mana: eats your Rejuvenation (12 sec of it) or Regrowth
  // (18 sec of its heal over time) on the target and heals that much at once.
  swiftmend: { cls: DR, school: 'nature', name: 'Swiftmend', spellId: 18562, icon: 'inv_relics_idolofrejuvenation', key: '4', costPct: 0.2, cd: 15, talent: 'swiftmend', swiftmend: true, desc: 'Consumes your Rejuvenation or Regrowth on the target to heal at once for 12 sec of Rejuvenation or 18 sec of Regrowth.' },
  // 2782 and 2893: 10% and 16% of base mana.
  removeCurse: { cls: DR, school: 'nature', name: 'Remove Curse', spellId: 2782, icon: 'spell_holy_removecurse', key: 'E', costPct: 0.1, dispel: ['curse'], desc: 'Removes a curse.' },
  abolishPoison: { cls: DR, school: 'nature', name: 'Abolish Poison', spellId: 2893, icon: 'spell_nature_nullifypoison_02', key: 'R', costPct: 0.16, dispel: ['poison'], desc: 'Removes a poison.' },
};

// Each class's heals, in bar order.
export const HEALS_OF = (cls) => Object.keys(HEALS).filter((id) => HEALS[id].cls === cls);

// The raid a healer keeps alive when playing alone (engine/raid.js): ten players in two groups, you among them, and
// what the boss does to them. Tuned so one pre-raid healer can keep up on a 2 minute fight with mana to manage.
//   tank: the boss's swings on the main tank (some avoided, some crushing); random: one player hit now and then;
//   aoe: the whole raid at once; debuff: a dispellable debuff ticking on someone (its type picked at random).
export const RAID_SIM = {
  members: [
    { name: 'Thorgrim', cls: 'warrior', role: 'tank', maxHp: 8200 },
    { name: 'Brakka', cls: 'druid', role: 'tank', maxHp: 7400 },
    { name: 'Velis', cls: 'rogue', role: 'melee', maxHp: 4300 },
    { name: 'Dorran', cls: 'warrior', role: 'melee', maxHp: 4900 },
    { name: 'Sylara', cls: 'mage', role: 'ranged', maxHp: 3900 },
    { name: 'Morkath', cls: 'warlock', role: 'ranged', maxHp: 4400 },
    { name: 'Teyla', cls: 'hunter', role: 'ranged', maxHp: 4200 },
    { name: 'Eldrin', cls: 'priest', role: 'ranged', maxHp: 3800 },
    { name: 'Zul\'jin', cls: 'shaman', role: 'ranged', maxHp: 4300 },
  ],
  tank: { every: 2, min: 250, max: 380, avoid: 0.2, crush: 0.05 },
  random: { every: 4, min: 150, max: 380 },
  aoe: { every: 30, first: 15, min: 200, max: 320, name: 'Flame Wave', icon: 'spell_fire_selfdestruct' },
  debuff: { every: 16, first: 8, duration: 12, period: 2, tick: 90 },
  debuffs: {
    magic: { name: 'Shadow Word: Pain', icon: 'spell_shadow_shadowwordpain' },
    curse: { name: 'Curse of Agony', icon: 'spell_shadow_curseofsargeras' },
    disease: { name: 'Plague', icon: 'spell_shadow_callofbone' },
    poison: { name: 'Deadly Poison', icon: 'ability_rogue_dualweild' },
  },
};
