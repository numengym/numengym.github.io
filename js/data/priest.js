// Priest (Shadow) data for WoW Forever. Numbers come from wowsims/forever (MIT, https://github.com/wowsims/forever):
//   sim/core/spelldata/spells_auto_gen.go  - spell damage (base points + points per level to 60), coefficients, cast
//                                            times, costs, cooldowns; talent values at full rank
//   sim/priest/*.go                        - how the spells and talents behave
// Talent values per rank are the full-rank value spread evenly over the ranks (APPROX where wowsims reads a curve).
// Not modelled: Vampiric Embrace (it heals the party; its line in the wowsims APL is switched off), the racial
// spells (Starshards, Shadowguard, Dark Sacrifice, Touch of Weakness), Power in Light, Shadow Word: Death's
// backlash on your own health.
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
  devouringPlague: { name: 'Devouring Plague', spellId: 19280, icon: 'spell_shadow_blackplague', key: '4', school: 'shadow', cd: 24, cost: 985, dot: { tick: 106, coef: 0.1, period: 3, ticks: 8 }, instant: true, gcd: true, spell: true },
  // 1309636 (Rank 4): instant, 18 s cooldown, 340 mana: 448 + 2.5 x 4 levels, 42.9%; costs you 10% of your health.
  shadowWordDeath: { name: 'Shadow Word: Death', spellId: 1309636, icon: 'spell_shadow_demonicfortitude', key: '5', school: 'shadow', cd: 18, cost: 340, base: 458, variance: 0.0605, coef: 0.429, instant: true, gcd: true, spell: true },
  // 15473 (talent): 40% of base mana: Shadow damage +10%, Shadow spells cost 50% less and crit for 200%, 15% less
  // damage taken. Up from the start (wowsims preShadowform).
  shadowform: { name: 'Shadowform', spellId: 15473, icon: 'spell_shadow_shadowform', key: 'X', costPct: 0.4, cd: 1.5, gcd: true, dmg: 0.1, costCut: 0.5, critBonusMult: 2, talent: 'shadowform' },
  // 14751 (talent): 3 min from when it is spent: your next spell is free and, if it is not periodic, crits 25% more.
  innerFocus: { name: 'Inner Focus', spellId: 14751, icon: 'spell_frost_windwalkon', key: 'R', cost: 0, cd: 180, critPct: 25, talent: 'innerFocus' },
  trinket1: { name: 'Trinket 1', icon: 'inv_misc_questionmark', key: '7', cost: 0, item: 'trinket1' },
  trinket2: { name: 'Trinket 2', icon: 'inv_misc_questionmark', key: '8', cost: 0, item: 'trinket2' },
  potion: { name: 'Potion', icon: 'inv_potion_76', key: '9', cost: 0, item: 'potion' },
  conjured: { name: 'Demonic Rune', icon: 'inv_misc_rune_04', key: '0', cost: 0, item: 'conjured' },
  racial: { name: 'Racial', icon: 'inv_misc_questionmark', key: 'B', cost: 0, racial: true },
};

// Enchant Weapon - Revelation (8217, sim/common/forever/enchants.go): a direct spell landing without a crit has the
// enchant's chance to give the priest's Revelation (1323377): the next of these spells is a sure crit (one charge, 15 s;
// a Mind Flay crits on every tick).
export const REVELATION = { trigger: 1248806, buff: 1323377, duration: 15, spells: new Set(['mindBlast', 'mindFlay', 'shadowWordDeath']) };

// Twin Disciplines: these spells' damage.
export const TWIN_DISCIPLINES = new Set(['shadowWordPain', 'mindFlay', 'devouringPlague', 'shadowWordDeath']);

export const ACTION_BAR = [
  ['shadowWordPain', 'mindBlast', 'mindFlay', 'devouringPlague', 'shadowWordDeath'],
  ['shadowform', 'innerFocus', 'racial', 'trinket1', 'trinket2', 'potion', 'conjured'],
];
export const ALL_ACTIONS = ACTION_BAR.flat();

export const AURAS = {
  shadowform: { name: 'Shadowform', icon: 'spell_shadow_shadowform' },
  innerFocus: { name: 'Inner Focus', icon: 'spell_frost_windwalkon' },
  darkInspiration: { name: 'Dark Inspiration', icon: 'spell_shadow_requiem' },
  revelation: { name: 'Revelation', icon: 'inv_misc_note_01' },
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
};
export const NO_DPS_EFFECT = new Set(['powerInLight', 'wandSpecialization', 'silentResolve', 'holyPrecision', 'martyrdom', 'improvedPowerWordShield',
  'improvedInnerFire', 'improvedManaBurn', 'soulWarding', 'penance', 'renewedHope', 'divineAegis', 'powerInfusion', 'twilightFocus', 'improvedRenew',
  'holySpecialization', 'spellWarding', 'divineFury', 'holyNova', 'blessedRecovery', 'inspiration', 'holyReach', 'improvedHealing', 'searingLight',
  'bindingHeal', 'litanyOfLight', 'spiritOfRedemption', 'spiritualGuidance', 'spiritualHealing', 'prayerOfMending', 'blackout', 'spiritTap',
  'improvedPsychicScream', 'vampiricEmbrace', 'silence']);

export const SPELLBOOK_TABS = [
  { name: 'General', spells: [
    { id: 'racial', name: 'Racial', icon: 'inv_misc_questionmark' }, { id: 'trinket1', name: 'Trinket 1', icon: 'inv_misc_questionmark' },
    { id: 'trinket2', name: 'Trinket 2', icon: 'inv_misc_questionmark' }, { id: 'potion', name: 'Potion', icon: 'inv_potion_76' },
    { id: 'conjured', name: 'Demonic Rune', icon: 'inv_misc_rune_04' },
  ] },
  { name: 'Discipline', spells: [
    { id: 'innerFocus', name: 'Inner Focus', spellId: 14751, icon: 'spell_frost_windwalkon', talent: 'innerFocus' },
  ] },
  { name: 'Shadow', spells: [
    { id: 'shadowWordPain', name: 'Shadow Word: Pain', spellId: 10894, icon: 'spell_shadow_shadowwordpain' },
    { id: 'mindBlast', name: 'Mind Blast', spellId: 10947, icon: 'spell_shadow_unholyfrenzy' },
    { id: 'devouringPlague', name: 'Devouring Plague', spellId: 19280, icon: 'spell_shadow_blackplague' },
    { id: 'shadowWordDeath', name: 'Shadow Word: Death', spellId: 1309636, icon: 'spell_shadow_demonicfortitude' },
    { id: 'mindFlay', name: 'Mind Flay', spellId: 18807, icon: 'spell_shadow_siphonmana', talent: 'mindFlay' },
    { id: 'shadowform', name: 'Shadowform', spellId: 15473, icon: 'spell_shadow_shadowform', talent: 'shadowform' },
  ] },
];
