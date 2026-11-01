// Keybind presets, per class and spec. A spec added later gets its own list under its key; the
// player's own presets are stored per spec as well (main.js).
import { ALL_ACTIONS } from './warrior.js';
import { ALL_ACTIONS as ROGUE_ACTIONS } from './rogue.js';
import { ALL_ACTIONS as MAGE_ACTIONS } from './mage.js';
import { ALL_ACTIONS as PALADIN_ACTIONS } from './paladin.js';
import { ALL_ACTIONS as PRIEST_ACTIONS } from './priest.js';
import { ALL_ACTIONS as SHAMAN_ACTIONS } from './shaman.js';
import { ALL_ACTIONS as DRUID_ACTIONS } from './druid.js';
import { ABILITIES as FERAL_ABILITIES } from './feral.js';
import { ALL_ACTIONS as WARLOCK_ACTIONS } from './warlock.js';
import { ALL_ACTIONS as HUNTER_ACTIONS } from './hunter.js';
import { HEALS_OF } from './healing.js';

export const SPEC_KEY = 'warrior-fury';

// Ledski's in-game binds, from his Myslot export ("Warrior Myslot.txt"), for the abilities the APL uses. Each
// key is the one on the action bar slot holding that spell or its macro (ACTIONBUTTON1-12 = slots 1-12,
// MULTIACTIONBAR1 = 61-72, MULTIACTIONBAR2 = 49-60). The racial and the second trinket have no slot there
// (his TRI macro on Shift+R uses both trinkets), so they are left unbound.
const LEDSKI = {
  rend: '1', sunderArmor: '2', overpower: '3',                  // Rend, SA, OP
  bloodthirst: 'Q', whirlwind: 'E', hamstring: 'R',             // BMR, WSS, HAM
  deathWish: 'T', execute: 'F',                                 // *-*, Exe
  heroicStrike: 'Wheel Up', cleave: 'Wheel Down',               // HS, Clea
  battleShout: 'Shift+2', berserkerRage: 'Shift+Q',             // BS, TCB
  bloodrage: 'Shift+E', trinket1: 'Shift+R', potion: 'Shift+F', // Blod, TRI, Rage
  recklessness: 'Y',                                            // Reck
  charge: 'C', battleStance: '9', berserkerStance: 'Mouse 5',   // Char, Bat, Rat
  explosive: 'Alt+Q',                                           // SAP (Goblin Sapper Charge)
  trinket2: '', racial: '',
};

const LEDSKI_KEYS = Object.fromEntries(ALL_ACTIONS.map((id) => [id, LEDSKI[id] ?? '']));
const ARMS_LEDSKI = { bloodthirst: '', mortalStrike: LEDSKI.bloodthirst, slam: LEDSKI.whirlwind, whirlwind: '' };
const PROT_LEDSKI = {
  bloodthirst: '', whirlwind: '', hamstring: '', deathWish: '', recklessness: '', berserkerRage: '',
  shieldSlam: LEDSKI.bloodthirst, revenge: LEDSKI.whirlwind, shieldBlock: LEDSKI.hamstring, thunderClap: LEDSKI.berserkerRage,
  demoralizingShout: LEDSKI.deathWish, defensiveStance: LEDSKI.berserkerStance, berserkerStance: '', taunt: LEDSKI.recklessness,
};

// The default keys, one layout for every class: 1-4 the rotation's first four, 5 an important buff (Slice and Dice),
// Q and E rotation or AoE, R rotation, AoE or a cooldown, T and F cooldowns, G the offensive potion, Y the resource
// potion, Z crowd control, X and V survival (V the defensive potion when the class has nothing else), C movement;
// Shift+1-4 and Shift+Q/W/E/R whatever else, in the spec's order. Bump DEFAULT_LAYOUT when it changes: a spec still
// on a built-in preset of an older layout takes the new keys once (main.js loadBinds).
export const DEFAULT_LAYOUT = 5;
// The pet bar on WoW's own keys (BONUSACTIONBUTTON1-10): Attack, Follow, Stay on Ctrl+1-3, the pet's spells on Ctrl+4-7
// (the spec's pet keys), the modes on Ctrl+8, 9 and 0.
const PET_KEYS = { 'Ctrl+1': 'petAttack', 'Ctrl+2': 'petFollow', 'Ctrl+3': 'petStay', 'Ctrl+8': 'petAssist', 'Ctrl+9': 'petDefensive', 'Ctrl+0': 'petPassive' };
const SPARE = ['Shift+1', 'Shift+2', 'Shift+3', 'Shift+4', 'Shift+Q', 'Shift+W', 'Shift+E', 'Shift+R'];
function layout(actions, keys, rest = []) {
  const out = Object.fromEntries(actions.map((id) => [id, '']));
  const taken = new Set();
  const put = (id, key) => {
    if (!(id in out) || out[id] || !key || taken.has(key)) return false;
    out[id] = key;
    taken.add(key);
    return true;
  };
  for (const [key, id] of Object.entries({ ...keys, ...PET_KEYS })) put(id, key);
  put('offensivePotion', 'G');
  put('potion', 'Y');
  put('defensivePotion', 'V');
  const spare = SPARE.filter((k) => !taken.has(k));
  for (const id of [...rest, 'trinket1', 'trinket2', 'racial', 'defensivePotion', 'explosive', 'conjured']) {
    if (!spare.length) break;
    if (id in out && !out[id]) put(id, spare.shift());
  }
  return out;
}
const preset = (actions, keys, rest) => [{ id: 'default', name: 'Default', binds: layout(actions, keys, rest) }];
// The hunter's crowd control, survival and movement keys (Freezing Trap, Aspect of the Monkey, Aspect of the Cheetah), and
// the other aspects and traps on the spare keys.
const HUNTER_UTILITY = { Z: 'freezingTrap', X: 'aspectOfTheMonkey', C: 'aspectOfTheCheetah' };
const HUNTER_REST = ['aspectOfTheHawk', 'immolationTrap', 'explosiveTrap', 'frostTrap', 'wingClip', 'aspectOfTheBeast', 'striderKick', 'scorpidSting', 'sniperShot', 'volley', 'counterattack'];
const FERAL_ACTIONS = Object.keys(FERAL_ABILITIES);

// Built-in presets (read-only) per spec: the trainer's own keys, and Ledski's for the warrior.
export const BIND_PRESETS = {
  'rogue-assassination': preset(ROGUE_ACTIONS,
    { 1: 'mutilate', 2: 'eviscerate', 3: 'rupture', 4: 'venom', 5: 'sliceAndDice', Q: 'ambush', E: 'garrote', R: 'coldBlood', T: 'vanish', F: 'premeditation', Z: 'kick', X: 'evasion', C: 'stealth', V: 'feint' },
    ['preparation', 'backstab', 'exposeArmor']),
  'rogue-combat': preset(ROGUE_ACTIONS,
    { 1: 'sinisterStrike', 2: 'eviscerate', 3: 'rupture', 4: 'backstab', 5: 'sliceAndDice', Q: 'bladeFlurry', E: 'ghostlyStrike', R: 'adrenalineRush', T: 'coldBlood', F: 'vanish', Z: 'kick', X: 'evasion', C: 'stealth', V: 'feint' },
    ['preparation', 'ambush', 'garrote', 'premeditation', 'exposeArmor']),
  'rogue-subtlety': preset(ROGUE_ACTIONS,
    { 1: 'hemorrhage', 2: 'eviscerate', 3: 'rupture', 4: 'ghostlyStrike', 5: 'sliceAndDice', Q: 'ambush', E: 'garrote', R: 'premeditation', T: 'preparation', F: 'vanish', Z: 'kick', X: 'evasion', C: 'stealth', V: 'feint' },
    ['coldBlood', 'backstab', 'exposeArmor']),
  'paladin-retribution': preset(PALADIN_ACTIONS,
    { 1: 'judgement', 2: 'holyStrike', 3: 'sealOfCommand', 4: 'sealOfRighteousness', 5: 'sealOfTheCrusader', Q: 'consecration', E: 'exorcism', R: 'hammerOfWrath', T: 'swiftJudgement', F: 'weapon' },
    ['holyShock', 'sealOfFury', 'holyShield', 'righteousFury', 'retributionAura', 'holyWrath']),
  'paladin-holyShock': preset(PALADIN_ACTIONS,
    { 1: 'holyShock', 2: 'judgement', 3: 'holyStrike', 4: 'sealOfRighteousness', 5: 'sealOfTheCrusader', Q: 'consecration', E: 'exorcism', R: 'hammerOfWrath', T: 'swiftJudgement', F: 'weapon' },
    ['divineFavor', 'sealOfCommand', 'sealOfFury', 'holyShield', 'righteousFury', 'retributionAura', 'holyWrath']),
  'paladin-protPaladin': preset(PALADIN_ACTIONS,
    { 1: 'judgement', 2: 'holyShield', 3: 'consecration', 4: 'holyStrike', 5: 'righteousFury', Q: 'holyShock', E: 'exorcism', R: 'sealOfFury', T: 'hammerOfWrath', F: 'weapon' },
    ['retributionAura', 'sealOfRighteousness', 'sealOfCommand', 'sealOfTheCrusader', 'swiftJudgement', 'holyWrath']),
  'mage-arcane': preset(MAGE_ACTIONS,
    { 1: 'arcaneBlast', 2: 'arcaneWrath', 3: 'arcaneMissiles', 4: 'frostbolt', 5: 'mageArmor', Q: 'fireBlast', E: 'coneOfCold', R: 'arcanePower', T: 'presenceOfMind', F: 'evocation', X: 'iceBarrier', C: 'blink' },
    ['arcaneExplosion', 'frostNova', 'iceBlock', 'manaGem', 'scorch', 'fireball']),
  'mage-fire': preset(MAGE_ACTIONS,
    { 1: 'fireball', 2: 'scorch', 3: 'fireBlast', 4: 'pyroblast', 5: 'mageArmor', Q: 'coneOfCold', E: 'arcaneMissiles', R: 'combustion', T: 'presenceOfMind', F: 'evocation', X: 'iceBarrier', C: 'blink' },
    ['flamestrike', 'blastWave', 'frostNova', 'iceBlock', 'manaGem', 'frostbolt']),
  'mage-ffb': preset(MAGE_ACTIONS,
    { 1: 'frostfireBolt', 2: 'scorch', 3: 'fireBlast', 4: 'pyroblast', 5: 'mageArmor', Q: 'iceLance', E: 'fireball', R: 'combustion', T: 'presenceOfMind', F: 'evocation', X: 'iceBarrier', C: 'blink' },
    ['flamestrike', 'blastWave', 'frostNova', 'iceBlock', 'manaGem', 'frostbolt', 'coneOfCold', 'arcaneMissiles']),
  'mage-frost': preset(MAGE_ACTIONS,
    { 1: 'frostbolt', 2: 'iceLance', 3: 'coneOfCold', 4: 'arcaneMissiles', 5: 'mageArmor', Q: 'fireBlast', E: 'scorch', R: 'coldSnap', T: 'presenceOfMind', F: 'evocation', X: 'iceBarrier', C: 'blink' },
    ['blizzard', 'frostNova', 'iceBlock', 'manaGem', 'fireball']),
  'priest-shadow': preset(PRIEST_ACTIONS,
    { 1: 'mindFlay', 2: 'mindBlast', 3: 'shadowWordPain', 4: 'devouringPlague', 5: 'shadowform', Q: 'shadowWordDeath', R: 'innerFocus' },
    ['vampiricEmbrace', 'starshards', 'shadowguard', 'touchOfWeakness', 'hexOfWeakness', 'darkSacrifice', 'elunesGrace', 'desperatePrayer']),
  'priest-smite': preset(PRIEST_ACTIONS,
    { 1: 'smite', 2: 'holyFire', 3: 'penance', 4: 'shadowWordPain', 5: 'powerInfusion', Q: 'smiteR5', E: 'holyFireR5', R: 'innerFocus', T: 'wand' },
    ['holyNova', 'darkSacrifice', 'touchOfWeakness']),
  'shaman-elemental': preset(SHAMAN_ACTIONS,
    { 1: 'lightningBolt', 2: 'lavaBurst', 3: 'flameShock', 4: 'earthShock', 5: 'manaSpringTotem', Q: 'chainLightning', E: 'searingTotem', R: 'elementalMastery', T: 'strengthOfEarthTotem', F: 'windfuryTotem', G: 'fireNova' },
    ['lightningBoltR8', 'manaTideTotem', 'waterShield', 'weapon', 'rageOfTheFarseer']),
  'shaman-enhancement': preset(SHAMAN_ACTIONS,
    { 1: 'stormstrike', 2: 'earthShock', 3: 'flameShock', 4: 'lightningBolt', 5: 'windfuryTotem', Q: 'fireNova', E: 'magmaTotem', R: 'rageOfTheFarseer', T: 'strengthOfEarthTotem', F: 'manaSpringTotem' },
    ['weapon', 'chainLightning', 'searingTotem']),
  // Healers: the heals on 1-6, dispels on E and R, cooldowns after them.
  'priest-holyPriest': preset([...HEALS_OF('priest'), ...PRIEST_ACTIONS],
    { 1: 'greaterHeal', 2: 'flashHeal', 3: 'heal', 4: 'renew', 5: 'powerWordShield', Q: 'prayerOfHealing', E: 'dispelMagic', R: 'abolishDisease', T: 'powerInfusion', F: 'innerFocus' }, []),
  'paladin-holyPaladin': preset([...HEALS_OF('paladin'), ...PALADIN_ACTIONS],
    { 1: 'holyLight', 2: 'flashOfLight', 3: 'holyShockHeal', 4: 'oathOfLight', 5: 'lightsVigil', E: 'cleanse', Q: 'judgement', R: 'sealOfRighteousness', T: 'divineFavor' }, []),
  'shaman-restoShaman': preset([...HEALS_OF('shaman'), ...SHAMAN_ACTIONS],
    { 1: 'healingWave', 2: 'lesserHealingWave', 3: 'chainHeal', E: 'curePoison', R: 'cureDisease', 5: 'manaSpringTotem', T: 'manaTideTotem', F: 'waterShield', Q: 'strengthOfEarthTotem' }, []),
  'druid-restoDruid': preset([...HEALS_OF('druid'), ...DRUID_ACTIONS],
    { 1: 'healingTouch', 2: 'rejuvenation', 3: 'regrowth', 4: 'swiftmend', E: 'removeCurse', R: 'abolishPoison', T: 'innervate' }, []),
  'druid-balance': preset(DRUID_ACTIONS, { 1: 'wrath', 2: 'starfire', 3: 'moonfire', 4: 'insectSwarm', R: 'innervate' }, ['hurricane']),
  'druid-feralCat': preset(FERAL_ACTIONS,
    { 1: 'shred', 2: 'rake', 3: 'rip', 4: 'ferociousBite', Q: 'claw', E: 'shiftingPower', T: 'innervate', Z: 'pounce', X: 'barkskin', C: 'dash' },
    ['ravage', 'faerieFire', 'prowl', 'feralChargeCat']),
  'druid-feralBear': preset(FERAL_ACTIONS,
    { 1: 'lacerate', 2: 'primalBite', 3: 'maul', 4: 'swipe', E: 'demoralizingRoar', T: 'enrage', F: 'innervate', X: 'frenziedRegeneration', C: 'feralCharge', V: 'barkskin' },
    ['faerieFire']),
  'warlock-affliction': preset(WARLOCK_ACTIONS,
    { 1: 'shadowBolt', 2: 'corruption', 3: 'baneOfAgony', 4: 'siphonLife', 5: 'curseOfElements', Q: 'wrack', E: 'immolate', R: 'amplifyCurse', T: 'lifeTap', F: 'deathCoil', 'Ctrl+4': 'lashOfPain' },
    ['baneOfDoom', 'searingPain', 'drainLife', 'drainSoul', 'curseOfRecklessness', 'curseOfWeakness', 'rainOfFire', 'hellfire']),
  'warlock-demonology': preset(WARLOCK_ACTIONS,
    { 1: 'searingPain', 2: 'immolate', 3: 'corruption', 4: 'baneOfAgony', 5: 'curseOfElements', Q: 'baneOfDoom', E: 'soulFire', R: 'amplifyCurse', T: 'lifeTap', F: 'deathCoil', 'Ctrl+4': 'firebolt' },
    ['shadowBolt', 'drainLife', 'drainSoul', 'curseOfRecklessness', 'curseOfWeakness', 'rainOfFire', 'hellfire']),
  'warlock-destruction': preset(WARLOCK_ACTIONS,
    { 1: 'incinerate', 2: 'immolate', 3: 'conflagrate', 4: 'shadowburn', 5: 'curseOfElements', Q: 'corruption', E: 'baneOfDoom', R: 'soulFire', T: 'lifeTap', F: 'deathCoil', 'Ctrl+4': 'lashOfPain' },
    ['shadowBolt', 'searingPain', 'drainLife', 'drainSoul', 'curseOfRecklessness', 'curseOfWeakness', 'rainOfFire', 'hellfire']),
  'hunter-marksmanship': preset(HUNTER_ACTIONS,
    { 1: 'aimedShot', 2: 'arcaneShot', 3: 'serpentSting', 4: 'multiShot', 5: 'huntersMark', Q: 'raptorStrike', E: 'mongooseBite', R: 'rapidFire', T: 'racial', F: 'trinket1', ...HUNTER_UTILITY },
    HUNTER_REST),
  'hunter-survival': preset(HUNTER_ACTIONS,
    { 1: 'multiShot', 2: 'arcaneShot', 3: 'serpentSting', 4: 'aimedShot', 5: 'huntersMark', Q: 'raptorStrike', E: 'mongooseBite', R: 'rapidFire', T: 'racial', F: 'trinket1', ...HUNTER_UTILITY },
    HUNTER_REST),
  // SV Melee: the melee abilities on 1-4.
  'hunter-svMelee': preset(HUNTER_ACTIONS,
    { 1: 'raptorStrike', 2: 'mongooseBite', 3: 'striderKick', 4: 'wingClip', 5: 'huntersMark', Q: 'serpentSting', E: 'immolationTrap', R: 'rapidFire', T: 'racial', F: 'trinket1', ...HUNTER_UTILITY, 'Ctrl+4': 'savageRend', 'Ctrl+5': 'bite', 'Ctrl+6': 'claw' },
    ['arcaneShot', 'multiShot', ...HUNTER_REST]),
  'hunter-beastMastery': preset(HUNTER_ACTIONS,
    { 1: 'summonHawk', 2: 'arcaneShot', 3: 'aimedShot', 4: 'serpentSting', 5: 'huntersMark', Q: 'raptorStrike', E: 'mongooseBite', R: 'rapidFire', T: 'bestialWrath', F: 'intimidation', ...HUNTER_UTILITY, 'Ctrl+4': 'savageRend', 'Ctrl+5': 'bite', 'Ctrl+6': 'claw' },
    ['multiShot', ...HUNTER_REST]),
  'warrior-fury': [
    ...preset(ALL_ACTIONS,
      { 1: 'bloodthirst', 2: 'whirlwind', 3: 'execute', 4: 'overpower', 5: 'battleShout', Q: 'heroicStrike', E: 'cleave', R: 'hamstring', T: 'deathWish', F: 'recklessness', Z: 'intercept', X: 'berserkerRage', C: 'charge' },
      ['bloodrage', 'sunderArmor', 'battleStance', 'berserkerStance']),
    { id: 'ledski', name: 'Ledski', binds: LEDSKI_KEYS },
  ],
  'warrior-arms': [
    ...preset(ALL_ACTIONS,
      { 1: 'mortalStrike', 2: 'slam', 3: 'execute', 4: 'overpower', 5: 'battleShout', Q: 'heroicStrike', E: 'whirlwind', R: 'sweepingStrikes', T: 'deathWish', F: 'recklessness', Z: 'intercept', X: 'berserkerRage', C: 'charge' },
      ['bloodrage', 'spearingStrike', 'sunderArmor', 'battleStance', 'berserkerStance']),
    { id: 'ledski', name: 'Ledski', binds: { ...LEDSKI_KEYS, ...ARMS_LEDSKI } },
  ],
  'warrior-prot': [
    ...preset(ALL_ACTIONS,
      { 1: 'shieldSlam', 2: 'revenge', 3: 'sunderArmor', 4: 'heroicStrike', 5: 'battleShout', Q: 'thunderClap', E: 'cleave', R: 'shieldBlock', T: 'taunt', F: 'demoralizingShout', Z: 'concussionBlow', X: 'lastStand', C: 'charge', V: 'shieldWall' },
      ['bloodrage', 'shieldBash', 'defensiveStance', 'berserkerRage', 'berserkerStance']),
    { id: 'ledski', name: 'Ledski', binds: { ...LEDSKI_KEYS, ...PROT_LEDSKI } },
  ],
};
