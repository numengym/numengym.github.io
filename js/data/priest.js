// Priest (Shadow) data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - spell damage (base points + points per level to 60), coefficients, cast
//                                            times, costs, cooldowns; talent values at full rank
//   sim/priest/*.go                        - how the spells and talents behave
// Talent values per rank are the full-rank value spread evenly over the ranks (APPROX where wowsims reads a curve).
// The Smite build (Discipline and Holy) adds Smite, Holy Fire, Penance and Power Infusion. Not modelled: Vampiric Embrace (it heals the party; its line in the wowsims APL is switched off), the racial
// spells (Starshards, Shadowguard, Dark Sacrifice, Touch of Weakness), Shadow Word: Death's backlash on your own
// health, Holy Nova (three targets or more).
import { TALENT_TREE_DATA, TALENT_TREES } from './priest-talent-tree.js';

export { TALENT_TREE_DATA, TALENT_TREES };

export const SPELL_MISS = 0.17;      // a level 63 boss (sim/core/target.go spellMissChance)
export const SPELL_CRIT_BONUS = 0.5; // a spell crit deals 150%; Shadowform doubles the bonus for Shadow spells

// The wowsims Shadow preset (ui/specs/priest/dps/builds/testing.build.json).
export const DEFAULT_TALENTS = '00530320103--50052201251302051';

export function parseTalents(str) {
  const out = {};
  const trees = String(str || '').split('-');
  TALENT_TREES.forEach((names, t) => {
    const digits = trees[t] || '';
    names.forEach((name, i) => { out[name] = Number(digits[i] || 0); });
  });
  return out;
}

// Talent values per rank, index = rank. Percent values as fractions unless named Pct.
const curve = (...v) => [0, ...v];
const steps = (max, ranks) => curve(...Array.from({ length: ranks }, (_, i) => Math.round((max * (i + 1)) / ranks * 1e4) / 1e4));
export const TALENT = {
  twinDisciplines: { dmg: steps(0.05, 5) },                     // 1225132: Shadow Word: Pain, Mind Flay, Devouring Plague, Shadow Word: Death
  mentalStrength: { int: steps(0.1, 5) },                       // 18551: Intellect
  mentalAgility: { cost: steps(0.1, 3) },                       // 14520: instant spells
  meditation: { casting: steps(0.5, 3) },                       // 14521: regen while casting
  shadowFocus: { hitPct: steps(5, 5) },                         // 15260: Shadow spells
  improvedMindBlast: { cd: steps(2.5, 5) },                     // 15273: Mind Blast's cooldown
  improvedShadowWordPain: { ticks: curve(1, 2) },               // 15275: +3 / +6 sec
  shadowReach: { range: steps(0.2, 2) },                        // 17322: Shadow spells' range
  improvedMindFlay: { ramp: steps(0.2, 2) },                    // 1225139: each tick more than the last
  darkInspiration: { spi: steps(0.15, 5), duration: 10 },       // 1326159 / 1326168: Mind Blast, a full Mind Flay
  shadowWeaving: { chance: steps(1, 3), perStack: 0.02, maxStacks: 5, duration: 15 }, // 15257 / 15258
  devouringContagion: { cost: steps(0.5, 2) },                  // 1309950: Devouring Plague
  earlyDemise: { critPct: steps(30, 2), health: curve(0.2, 0.2) }, // 1310076: Shadow Word: Death on a low target
  darkness: { dmg: steps(0.1, 5) },                             // 15259: Shadow damage
  powerInLight: { dmg: curve(0.02, 0.04, 0.06, 0.08, 0.1) },    // 1309969: Smite and Penance on a target with your Holy Fire or Shadow Word: Pain
  holyPrecision: { hitPct: curve(6, 12, 18) },                  // 1309957: Holy spells
  holySpecialization: { critPct: steps(5, 5) },                 // 14889: Holy spells
  divineFury: { cast: steps(0.5, 5) },                          // 18530: Smite's and Holy Fire's cast time
  searingLight: { dmg: curve(0.02, 0.05) },                     // 14909: Holy damage
  wandSpecialization: { dmg: curve(0.13, 0.25) },               // 14524: the wand's damage
};

// Spells. school; castTime / channel in seconds; cost in mana (costPct: of base mana); base: damage at level 60
// (base points + points per level), variance: the roll's spread; coef: spell power coefficient. dot: a periodic
// effect (tick damage, its coefficient, period, ticks); periodic ticks can crit (ATTR_EX_8_PERIODIC_CAN_CRIT).
export const ABILITIES = {
  // 10894 (Rank 8): instant, 470 mana: 127 + 20% of spell power every 3 s for 18 s.
  shadowWordPain: { name: 'Shadow Word: Pain', spellId: 10894, icon: 'spell_shadow_shadowwordpain', key: '1', school: 'shadow', cost: 470, dot: { tick: 127, coef: 0.2, period: 3, ticks: 6 }, instant: true, gcd: true, spell: true },
  // 10947 (Rank 9): 1.5 s, 8 s cooldown, 350 mana: 485 + 2.6 x 2 levels, 42.9%.
  mindBlast: { name: 'Mind Blast', spellId: 10947, icon: 'spell_shadow_unholyfrenzy', key: '2', school: 'shadow', castTime: 1.5, cd: 8, cost: 350, base: 490.2, variance: 0.0542, coef: 0.429, gcd: true, spell: true },
  // 18807 (Rank 6, talent): a 3 s channel, 205 mana, 20 yards: a tick a second of 130 + 16.7% of spell power.
  mindFlay: { name: 'Mind Flay', spellId: 18807, icon: 'spell_shadow_siphonmana', key: '3', school: 'shadow', channel: 3, ticks: 3, cost: 205, tick: 130, coef: 0.167, range: 20, talent: 'mindFlay', gcd: true, spell: true },
  // 19280 (Rank 6): instant, 24 s cooldown, 985 mana: 106 + 10% of spell power every 3 s for 24 s; heals you as much.
  devouringPlague: { name: 'Devouring Plague', spellId: 19280, icon: 'spell_shadow_devouringplague', key: '4', school: 'shadow', cd: 24, cost: 985, dot: { tick: 106, coef: 0.1, period: 3, ticks: 8 }, instant: true, gcd: true, spell: true },
  // 1309636 (Rank 4): instant, 18 s cooldown, 340 mana: 448 + 2.5 x 4 levels, 42.9%; costs you 10% of your health.
  shadowWordDeath: { name: 'Shadow Word: Death', spellId: 1309636, icon: 'spell_shadow_demonicfortitude', key: '5', school: 'shadow', cd: 18, cost: 340, base: 458, variance: 0.0605, coef: 0.429, instant: true, gcd: true, spell: true },
  // 10934 (Rank 8): 2.5 s, 280 mana: 170 + 1.3 x 5 levels, 71.4%.
  smite: { name: 'Smite', spellId: 10934, icon: 'spell_holy_holysmite', key: '', school: 'holy', castTime: 2.5, cost: 280, base: 176.5, variance: 0.112, coef: 0.714, divineFury: true, agility: true, gcd: true, spell: true },
  // 1004 (Rank 5), the Smite APL's below 20% mana: 140 mana, 81 + 1 x 5 levels.
  smiteR5: { name: 'Smite (Rank 5)', spellId: 1004, icon: 'spell_holy_holysmite', key: '', school: 'holy', castTime: 2.5, cost: 140, base: 86, variance: 0.125, coef: 0.714, divineFury: true, agility: true, gcd: true, spell: true },
  // 15261 (Rank 8): 3.5 s, 255 mana: 208, 75%; then 15 + 5% of spell power every 2 s for 10 s.
  holyFire: { name: 'Holy Fire', spellId: 15261, icon: 'spell_holy_searinglight', key: '', school: 'holy', castTime: 3.5, cost: 255, base: 208, variance: 0.2338, coef: 0.75, dot: { tick: 15, coef: 0.05, period: 2, ticks: 5 }, divineFury: true, agility: true, gcd: true, spell: true },
  // 15265 (Rank 5), the Smite APL's below 20% mana: 170 mana, 106 + 1.5 x 6 levels; 9 a tick (its tooltip says 13).
  holyFireR5: { name: 'Holy Fire (Rank 5)', spellId: 15265, icon: 'spell_holy_searinglight', key: '', school: 'holy', castTime: 3.5, cost: 170, base: 115, variance: 0.2338, coef: 0.75, dot: { tick: 9, coef: 0.05, period: 2, ticks: 5 }, divineFury: true, agility: true, gcd: true, spell: true },
  // 1316995 (Rank 4, talent): a 2 s channel, 12 s cooldown, 385 mana: a bolt at once and one a second, each 92 + 19%
  // of spell power (1316993). Shoot cuts it short.
  penance: { name: 'Penance', spellId: 1316995, icon: 'spell_holy_penance', key: '', school: 'holy', channel: 2, ticks: 2, cd: 12, cost: 385, bolt: 92, coef: 0.19, range: 36, talent: 'penance', gcd: true, spell: true },
  // 10060 (talent): 20% of base mana, 3 min cooldown, off the global cooldown: 20% more spell damage for 15 sec.
  powerInfusion: { name: 'Power Infusion', spellId: 10060, icon: 'spell_holy_powerinfusion', key: '', costPct: 0.2, cd: 180, duration: 15, dmg: 0.2, agility: true, talent: 'powerInfusion' },
  // 5019: the wand's auto shot, off the global cooldown (the Smite APL shoots below 10% mana): the wand's damage, which no
  // spell power raises, in its school (Fire: the build's Brilliant Wand); its bolt flies 20 yards a second.
  wand: { name: 'Shoot', spellId: 5019, icon: 'ability_shootwand', key: '', school: 'fire', range: 30, speed: 20, wand: true },
  // 15473 (talent): 40% of base mana: Shadow damage +10%, Shadow spells cost 50% less and crit for 200%, 15% less
  // damage taken. Up from the start (wowsims preShadowform).
  shadowform: { name: 'Shadowform', spellId: 15473, icon: 'spell_shadow_shadowform', key: 'X', costPct: 0.4, cd: 1.5, gcd: true, dmg: 0.1, costCut: 0.5, critBonusMult: 2, talent: 'shadowform' },
  // 14751 (talent): 3 min from when it is spent: your next spell is free and, if it is not periodic, crits 25% more.
  innerFocus: { name: 'Inner Focus', spellId: 14751, icon: 'spell_frost_windwalkon', key: 'R', cost: 0, cd: 180, critPct: 25, talent: 'innerFocus' },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  potion: { name: 'Resource Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  offensivePotion: { name: 'Offensive Potion', icon: 'inv_potion_41', key: '', cost: 0, item: 'offensivePotion' },
  defensivePotion: { name: 'Defensive Potion', icon: 'inv_potion_69', key: '', cost: 0, item: 'defensivePotion' },
  conjured: { name: 'Demonic Rune', icon: 'inv_misc_rune_04', key: '0', cost: 0, item: 'conjured' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};

// Enchant Weapon - Revelation (8217, sim/common/forever/enchants.go): a direct spell landing without a crit has the
// enchant's chance to give the priest's Revelation (1323377): the next of these spells is a sure crit (one charge, 15 s;
// a Mind Flay crits on every tick).
export const REVELATION = { trigger: 1248806, buff: 1323377, duration: 15, spells: new Set(['mindBlast', 'mindFlay', 'shadowWordDeath']) };

// Twin Disciplines: these spells' damage.
export const TWIN_DISCIPLINES = new Set(['shadowWordPain', 'mindFlay', 'devouringPlague', 'shadowWordDeath', 'penance']);
// Power in Light: these spells' damage on a target with your Holy Fire or Shadow Word: Pain.
export const POWER_IN_LIGHT = new Set(['smite', 'smiteR5', 'penance']);

export const ACTION_BAR = [
  ['shadowWordPain', 'mindBlast', 'mindFlay', 'devouringPlague', 'shadowWordDeath', 'smite', 'holyFire', 'penance', 'smiteR5', 'holyFireR5', 'wand'],
  ['shadowform', 'innerFocus', 'powerInfusion', 'racial', 'trinket1', 'trinket2', 'potion', 'offensivePotion', 'defensivePotion', 'conjured'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  shadowform: { name: 'Shadowform', icon: 'spell_shadow_shadowform' },
  innerFocus: { name: 'Inner Focus', icon: 'spell_frost_windwalkon' },
  darkInspiration: { name: 'Dark Inspiration', icon: 'spell_warlock_demonsoul' },
  revelation: { name: 'Revelation', icon: 'inv_misc_note_01' },
  powerInfusion: { name: 'Power Infusion', icon: 'spell_holy_powerinfusion' },
};

export const METER_NAMES = {};
export const METER_ICONS = {};
export const THREAT_NAMES = {};

// The wowsims testing gear (ui/specs/priest/dps/builds/testing.build.json).
export const GEAR = [
  { id: 10250, randomSuffix: 12761 }, { id: 23125 }, { id: 14112 }, { id: 279269 }, { id: 14136, enchant: 8492 },
  { id: 10248, randomSuffix: 12761, enchant: 1901 }, { id: 18407, enchant: 8492 }, { id: 18405 },
  { id: 10252, randomSuffix: 12761, enchant: 8492 }, { id: 254129, enchant: 8492 }, { id: 272407 }, { id: 275973 },
  { id: 272438 }, { id: 270225 }, { id: 22688, enchant: 8217 }, { id: 15942, randomSuffix: 12761 }, { id: 15283, randomSuffix: 12761 },
];

// The build's consumables, raid buffs and debuffs.
export const CONSUMABLES = {
  flaskId: 13512, foodId: 13931, conjuredId: 12662, mhImbueId: 20749, elixirIds: [9264, 13454, 250328, 250337, 250338, 250341],
  offensivePotId: 250937, // the build also names a Major Mana Potion, but the wowsims sim drinks the Major Spellblasting Potion
};
export const RAID_BUFFS = { arcaneBrilliance: true, prayerOfSpirit: true, giftOfTheWild: true, prayerOfFortitude: true, moonkinAura: true };
export const PARTY_BUFFS = { manaSpringTotem: 1 }; // counts in wowsims
export const BUFFS = { greaterBlessingOfKings: true, greaterBlessingOfWisdom: true };
export const DEBUFFS = { judgementOfWisdom: true, curseOfElements: true };

export const BUILT_IN_BUILDS = [
  { id: 'shadow', name: 'Shadow (wowsims preset)', talents: DEFAULT_TALENTS, playable: true, spec: 'shadow' },
];

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const T = TALENT;
export const TALENT_EFFECTS = {
  twinDisciplines: (p) => `Shadow Word: Pain, Mind Flay, Devouring Plague and Shadow Word: Death deal ${pct(T.twinDisciplines.dmg[p])} more damage.`,
  mentalStrength: (p) => `+${pct(T.mentalStrength.int[p])} Intellect.`,
  mentalAgility: (p) => `Your instant spells cost ${pct(T.mentalAgility.cost[p])} less mana.`,
  innerFocus: () => 'Learn Inner Focus: your next spell is free and crits 25% more.',
  meditation: (p) => `${pct(T.meditation.casting[p])} of your mana regeneration continues while casting.`,
  shadowFocus: (p) => `+${T.shadowFocus.hitPct[p]}% hit with Shadow spells.`,
  improvedMindBlast: (p) => `Mind Blast's cooldown is ${T.improvedMindBlast.cd[p]} sec shorter.`,
  improvedShadowWordPain: (p) => `Shadow Word: Pain lasts ${3 * T.improvedShadowWordPain.ticks[p]} sec longer.`,
  shadowReach: (p) => `Your Shadow spells reach ${pct(T.shadowReach.range[p])} farther.`,
  mindFlay: () => 'Learn Mind Flay.',
  improvedMindFlay: (p) => `Each tick of Mind Flay deals ${pct(T.improvedMindFlay.ramp[p])} more than the one before it.`,
  darkInspiration: (p) => `Mind Blast and a full Mind Flay raise your Spirit by ${pct(T.darkInspiration.spi[p])} for 10 sec.`,
  shadowWeaving: (p) => `Your Shadow spells have a ${pct(T.shadowWeaving.chance[p])} chance to make the target take 2% more Shadow damage from you, stacking to 5.`,
  devouringContagion: (p) => `Devouring Plague costs ${pct(T.devouringContagion.cost[p])} less mana.`,
  earlyDemise: (p) => `Shadow Word: Death crits ${T.earlyDemise.critPct[p]}% more on a target at or below ${pct(T.earlyDemise.health[p])} health.`,
  darkness: (p) => `Your Shadow spells deal ${pct(T.darkness.dmg[p])} more damage.`,
  shadowform: () => 'Learn Shadowform: Shadow damage +10%, Shadow spells cost 50% less and crit for 200%.',
  powerInLight: (p) => `Smite and Penance deal ${pct(T.powerInLight.dmg[p])} more damage to a target with your Holy Fire or Shadow Word: Pain.`,
  holyPrecision: (p) => `+${T.holyPrecision.hitPct[p]}% hit with Holy spells.`,
  holySpecialization: (p) => `+${T.holySpecialization.critPct[p]}% crit with Holy spells.`,
  divineFury: (p) => `Smite and Holy Fire cast ${T.divineFury.cast[p]} sec faster.`,
  searingLight: (p) => `Your Holy spells deal ${pct(T.searingLight.dmg[p])} more damage.`,
  penance: () => 'Learn Penance: three bolts of Holy damage over 2 sec.',
  powerInfusion: () => 'Learn Power Infusion: 20% more spell damage for 15 sec.',
  wandSpecialization: (p) => `Your wand deals ${pct(T.wandSpecialization.dmg[p])} more damage.`,
};
export const NO_DPS_EFFECT = new Set(['silentResolve', 'martyrdom', 'improvedPowerWordShield',
  'improvedInnerFire', 'improvedManaBurn', 'soulWarding', 'renewedHope', 'divineAegis', 'twilightFocus', 'improvedRenew',
  'spellWarding', 'holyNova', 'blessedRecovery', 'inspiration', 'holyReach', 'improvedHealing',
  'bindingHeal', 'litanyOfLight', 'spiritOfRedemption', 'spiritualGuidance', 'spiritualHealing', 'prayerOfMending', 'blackout', 'spiritTap',
  'improvedPsychicScream', 'vampiricEmbrace', 'silence']);

export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Resource Potion', icon: 'inv_potion_76' }, { id: 'offensivePotion', name: 'Offensive Potion', icon: 'inv_potion_41' },
    { id: 'defensivePotion', name: 'Defensive Potion', icon: 'inv_potion_69' },
    { id: 'conjured', name: 'Demonic Rune', icon: 'inv_misc_rune_04' },
  ] },
  { name: 'Discipline', spells: [
    { id: 'innerFocus', name: 'Inner Focus', spellId: 14751, icon: 'spell_frost_windwalkon', talent: 'innerFocus' },
    { id: 'penance', name: 'Penance', spellId: 1316995, icon: 'spell_holy_penance', talent: 'penance' },
    { id: 'powerInfusion', name: 'Power Infusion', spellId: 10060, icon: 'spell_holy_powerinfusion', talent: 'powerInfusion' },
  ] },
  { name: 'Holy', spells: [
    { id: 'smite', name: 'Smite', spellId: 10934, icon: 'spell_holy_holysmite' },
    { id: 'smiteR5', name: 'Smite (Rank 5)', spellId: 1004, icon: 'spell_holy_holysmite' },
    { id: 'holyFire', name: 'Holy Fire', spellId: 15261, icon: 'spell_holy_searinglight' },
    { id: 'holyFireR5', name: 'Holy Fire (Rank 5)', spellId: 15265, icon: 'spell_holy_searinglight' },
    { id: 'wand', name: 'Shoot', spellId: 5019, icon: 'ability_shootwand' },
  ] },
  { name: 'Shadow', spells: [
    { id: 'shadowWordPain', name: 'Shadow Word: Pain', spellId: 10894, icon: 'spell_shadow_shadowwordpain' },
    { id: 'mindBlast', name: 'Mind Blast', spellId: 10947, icon: 'spell_shadow_unholyfrenzy' },
    { id: 'devouringPlague', name: 'Devouring Plague', spellId: 19280, icon: 'spell_shadow_devouringplague' },
    { id: 'shadowWordDeath', name: 'Shadow Word: Death', spellId: 1309636, icon: 'spell_shadow_demonicfortitude' },
    { id: 'mindFlay', name: 'Mind Flay', spellId: 18807, icon: 'spell_shadow_siphonmana', talent: 'mindFlay' },
    { id: 'shadowform', name: 'Shadowform', spellId: 15473, icon: 'spell_shadow_shadowform', talent: 'shadowform' },
  ] },
];
