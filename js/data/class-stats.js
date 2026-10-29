// Each class's level 60 base stats and stat conversions (wowsims/forever sim/core/base_stats.go ClassBaseStats,
// base_stats_auto_gen.go CritPerAgiMaxLevel / CritPerIntMaxLevel / ExtraClassBaseStats, and each class's
// AddStatDependency calls). The race offsets on top are in warrior.js RACES.
//   apPerStr / apPerAgi: attack power per point; critPerAgi / critPerInt: crit percent per point;
//   physCrit / spellCrit: base crit percent; dodge: base dodge percent, dodgePerAgi percent per Agility.
export const CLASS_STATS = {
  warrior: {
    base: { str: 120, agi: 80, sta: 110, int: 30, spi: 45, ap: 160, health: 1689, mana: 0 },
    apPerStr: 2, apPerAgi: 0, critPerAgi: 0.05, critPerInt: 0, physCrit: 0, spellCrit: 0, dodge: 0, dodgePerAgi: 0.05,
  },
  rogue: {
    base: { str: 80, agi: 130, sta: 75, int: 35, spi: 50, ap: 100, health: 1523, mana: 0 },
    // sim/rogue/rogue.go: 1 attack power per Strength and per Agility; rogues dodge twice their crit per Agility.
    apPerStr: 1, apPerAgi: 1, critPerAgi: 0.0345, critPerInt: 0, physCrit: 0, spellCrit: 0, dodge: 0, dodgePerAgi: 0.069,
  },
  mage: {
    base: { str: 30, agi: 35, sta: 45, int: 125, spi: 120, ap: -10, health: 1370, mana: 1213 },
    apPerStr: 1, apPerAgi: 0, critPerAgi: 0.0514, critPerInt: 0.0168, physCrit: 3.2, spellCrit: 0.2, dodge: 3.2, dodgePerAgi: 0.0514,
  },
  paladin: {
    base: { str: 105, agi: 65, sta: 100, int: 70, spi: 75, ap: 160, health: 1381, mana: 1512 },
    apPerStr: 2, apPerAgi: 0, critPerAgi: 0.0506, critPerInt: 0.0167, physCrit: 0.7, spellCrit: 3.5, dodge: 0.7, dodgePerAgi: 0.0506,
  },
  priest: {
    base: { str: 35, agi: 40, sta: 50, int: 120, spi: 125, ap: -10, health: 1397, mana: 1376 },
    // sim/priest/priest.go: 1 attack power per Strength.
    apPerStr: 1, apPerAgi: 0, critPerAgi: 0.05, critPerInt: 0.0168, physCrit: 3, spellCrit: 0.8, dodge: 3, dodgePerAgi: 0.05,
  },
  shaman: {
    base: { str: 85, agi: 55, sta: 95, int: 90, spi: 100, ap: 100, health: 1280, mana: 1520 },
    // sim/shaman/shaman.go: 2 attack power per Strength.
    apPerStr: 2, apPerAgi: 0, critPerAgi: 0.0508, critPerInt: 0.0169, physCrit: 1.7, spellCrit: 2.3, dodge: 1.7, dodgePerAgi: 0.0508,
  },
};

// The races each class can be (sim/core/character_constants.go ClassRaceCapabilities).
export const CLASS_RACES = {
  warrior: ['RaceHuman', 'RaceDwarf', 'RaceNightElf', 'RaceGnome', 'RaceHighOrderSkyborne', 'RaceOrc', 'RaceUndead', 'RaceTauren', 'RaceTroll', 'RaceWindshaperSkyborne'],
  rogue: ['RaceHuman', 'RaceDwarf', 'RaceNightElf', 'RaceGnome', 'RaceHighOrderSkyborne', 'RaceOrc', 'RaceUndead', 'RaceTroll', 'RaceWindshaperSkyborne'],
  mage: ['RaceHuman', 'RaceGnome', 'RaceHighOrderSkyborne', 'RaceOrc', 'RaceUndead', 'RaceTroll'],
  paladin: ['RaceHuman', 'RaceDwarf', 'RaceUndead'],
  priest: ['RaceHuman', 'RaceDwarf', 'RaceNightElf', 'RaceGnome', 'RaceUndead', 'RaceTroll'],
  shaman: ['RaceDwarf', 'RaceOrc', 'RaceTauren', 'RaceTroll', 'RaceWindshaperSkyborne'],
};

// Mana: the first 20 Intellect give 1 mana each, the rest 15 (sim/core/character.go); Spirit restores
// 6.25 + Spirit / 8 mana per second outside the five-second rule (sim/core/mana.go).
export const MANA = { perInt: 15, spiritBase: 6.25, perSpirit: 1 / 8, fiveSecondRule: 5 };
