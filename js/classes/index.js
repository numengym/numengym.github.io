// The playable classes. Each class module brings its fight (the core unit, engine/unit.js, plus the class's
// resource, abilities and talents), its data (abilities, talent trees, spellbook, builds), its side of the rotation
// helper (apl hooks) and the wowsims spec it sims as. Adding a class: a folder under js/classes with its fight and
// apl hooks, an entry here, its data files and its specs in js/data/specs.js.
import { WarriorFight } from './warrior/fight.js';
import { WARRIOR_APL_HOOKS } from './warrior/apl.js';
import * as warriorData from '../data/warrior.js';
import * as warriorTalents from '../data/warrior-talents.js';
import * as warriorBook from '../data/warrior-spellbook.js';
import { DEFAULT_APL } from '../data/fury-apl.js';
import { RogueFight } from './rogue/fight.js';
import { ROGUE_APL_HOOKS } from './rogue/apl.js';
import * as rogueData from '../data/rogue.js';
import { ROGUE_APL } from '../data/rogue-apl.js';
import { MageFight } from './mage/fight.js';
import { MAGE_APL_HOOKS } from './mage/apl.js';
import * as mageData from '../data/mage.js';
import { ARCANE_APL } from '../data/mage-apl.js';
import { PaladinFight } from './paladin/fight.js';
import { PALADIN_APL_HOOKS } from './paladin/apl.js';
import * as paladinData from '../data/paladin.js';
import { RET_APL } from '../data/paladin-apl.js';
import { PriestFight } from './priest/fight.js';
import { PRIEST_APL_HOOKS } from './priest/apl.js';
import * as priestData from '../data/priest.js';
import { SHADOW_APL } from '../data/priest-apl.js';
import { ShamanFight } from './shaman/fight.js';
import { SHAMAN_APL_HOOKS } from './shaman/apl.js';
import * as shamanData from '../data/shaman.js';
import { ELEMENTAL_APL } from '../data/shaman-apl.js';
import { EnhancementFight } from './shaman/enhancement.js';
import { DruidFight } from './druid/fight.js';
import { DRUID_APL_HOOKS } from './druid/apl.js';
import * as druidData from '../data/druid.js';
import { BALANCE_APL } from '../data/druid-apl.js';
import { FeralFight } from './druid/feral.js';
import { FERAL_APL_HOOKS } from './druid/feral-apl.js';
import * as feralData from '../data/feral.js';
import { CAT_APL } from '../data/feral-apl.js';
import { WarlockFight } from './warlock/fight.js';
import { WARLOCK_APL_HOOKS } from './warlock/apl.js';
import * as warlockData from '../data/warlock.js';
import { AFFLICTION_APL } from '../data/warlock-apl.js';
import { HunterFight } from './hunter/fight.js';
import { HUNTER_APL_HOOKS } from './hunter/apl.js';
import * as hunterData from '../data/hunter.js';
import { MARKSMANSHIP_APL } from '../data/hunter-apl.js';

const book = (tabs) => ({
  castable: (abilities) => (id) => !!abilities[id],
  spellbook: (talents) => tabs.map((tab) => ({ ...tab, spells: tab.spells.filter((s) => !s.talent || talents[s.talent] > 0) })),
});

export const CLASSES = {
  warrior: {
    name: 'Warrior',
    color: '#c79c6e',
    resource: 'rage',
    Fight: WarriorFight,
    apl: { ...WARRIOR_APL_HOOKS, defaultApl: DEFAULT_APL },
    data: {
      ABILITIES: warriorData.ABILITIES, ALL_ACTIONS: warriorData.ALL_ACTIONS, AURAS: warriorData.AURAS, TALENT_TREES: warriorData.TALENT_TREES,
      DEFAULT_TALENTS: warriorData.DEFAULT_TALENTS, parseTalents: warriorData.parseTalents, METER_NAMES: warriorData.METER_NAMES,
      METER_ICONS: {}, THREAT_NAMES: warriorData.THREAT_NAMES, TALENT_TREE_DATA: warriorTalents.TALENT_TREE_DATA,
      TALENT_EFFECTS: warriorTalents.TALENT_EFFECTS, NO_DPS_EFFECT: warriorTalents.NO_DPS_EFFECT, BUILT_IN_BUILDS: warriorTalents.BUILT_IN_BUILDS,
      SPELLBOOK_TABS: warriorBook.SPELLBOOK_TABS, castable: warriorBook.castable, spellbook: warriorBook.spellbook,
    },
    // wowsims: the Fury/Arms spec (dpsWarrior) or Protection (protectionWarrior), see wowsims-sim.js.
    wowsims: { cls: 'ClassWarrior' },
  },
  rogue: {
    name: 'Rogue',
    color: '#fff569',
    resource: 'energy',
    Fight: RogueFight,
    apl: { ...ROGUE_APL_HOOKS, defaultApl: ROGUE_APL },
    data: {
      ABILITIES: rogueData.ABILITIES, ALL_ACTIONS: rogueData.ALL_ACTIONS, AURAS: rogueData.AURAS, TALENT_TREES: rogueData.TALENT_TREES,
      DEFAULT_TALENTS: rogueData.DEFAULT_TALENTS, parseTalents: rogueData.parseTalents, METER_NAMES: rogueData.METER_NAMES,
      METER_ICONS: rogueData.METER_ICONS, THREAT_NAMES: rogueData.THREAT_NAMES, TALENT_TREE_DATA: rogueData.TALENT_TREE_DATA,
      TALENT_EFFECTS: rogueData.TALENT_EFFECTS, NO_DPS_EFFECT: rogueData.NO_DPS_EFFECT, BUILT_IN_BUILDS: rogueData.BUILT_IN_BUILDS,
      SPELLBOOK_TABS: rogueData.SPELLBOOK_TABS, castable: book(rogueData.SPELLBOOK_TABS).castable(rogueData.ABILITIES),
      spellbook: book(rogueData.SPELLBOOK_TABS).spellbook,
    },
    wowsims: { cls: 'ClassRogue', spec: () => ({ rogue: { options: { classOptions: {} } } }) },
  },
  mage: {
    name: 'Mage',
    color: '#69ccf0',
    resource: 'mana',
    Fight: MageFight,
    apl: { ...MAGE_APL_HOOKS, defaultApl: ARCANE_APL },
    data: {
      ABILITIES: mageData.ABILITIES, ALL_ACTIONS: mageData.ALL_ACTIONS, AURAS: mageData.AURAS, TALENT_TREES: mageData.TALENT_TREES,
      DEFAULT_TALENTS: mageData.DEFAULT_TALENTS, parseTalents: mageData.parseTalents, METER_NAMES: mageData.METER_NAMES,
      METER_ICONS: mageData.METER_ICONS, THREAT_NAMES: mageData.THREAT_NAMES, TALENT_TREE_DATA: mageData.TALENT_TREE_DATA,
      TALENT_EFFECTS: mageData.TALENT_EFFECTS, NO_DPS_EFFECT: mageData.NO_DPS_EFFECT, BUILT_IN_BUILDS: mageData.BUILT_IN_BUILDS,
      SPELLBOOK_TABS: mageData.SPELLBOOK_TABS, castable: book(mageData.SPELLBOOK_TABS).castable(mageData.ABILITIES),
      spellbook: book(mageData.SPELLBOOK_TABS).spellbook,
    },
    // The wowsims presets stand 20 yards away (Frost 30) in Mage Armor.
    wowsims: { cls: 'ClassMage', distance: 20, spec: () => ({ mage: { options: { classOptions: { defaultMageArmor: 'MageArmorMageArmor' } } } }) },
  },
  paladin: {
    name: 'Paladin',
    color: '#f58cba',
    resource: 'mana',
    Fight: PaladinFight,
    apl: { ...PALADIN_APL_HOOKS, defaultApl: RET_APL },
    data: {
      ABILITIES: paladinData.ABILITIES, ALL_ACTIONS: paladinData.ALL_ACTIONS, AURAS: paladinData.AURAS, TALENT_TREES: paladinData.TALENT_TREES,
      DEFAULT_TALENTS: paladinData.DEFAULT_TALENTS, parseTalents: paladinData.parseTalents, METER_NAMES: paladinData.METER_NAMES,
      METER_ICONS: paladinData.METER_ICONS, THREAT_NAMES: paladinData.THREAT_NAMES, TALENT_TREE_DATA: paladinData.TALENT_TREE_DATA,
      TALENT_EFFECTS: paladinData.TALENT_EFFECTS, NO_DPS_EFFECT: paladinData.NO_DPS_EFFECT, BUILT_IN_BUILDS: paladinData.BUILT_IN_BUILDS,
      SPELLBOOK_TABS: paladinData.SPELLBOOK_TABS, castable: book(paladinData.SPELLBOOK_TABS).castable(paladinData.ABILITIES),
      spellbook: book(paladinData.SPELLBOOK_TABS).spellbook,
    },
    // wowsims: the Protection Paladin spec for the tank, else Retribution (Holy Shock is a Retribution build there).
    wowsims: { cls: 'ClassPaladin', spec: (fight) => (fight.spec === 'protPaladin' ? { protectionPaladin: { options: { classOptions: {} } } } : { retributionPaladin: { options: { classOptions: {} } } }) },
  },
  priest: {
    name: 'Priest',
    color: '#ffffff',
    resource: 'mana',
    Fight: PriestFight,
    apl: { ...PRIEST_APL_HOOKS, defaultApl: SHADOW_APL },
    data: {
      ABILITIES: priestData.ABILITIES, ALL_ACTIONS: priestData.ALL_ACTIONS, AURAS: priestData.AURAS, TALENT_TREES: priestData.TALENT_TREES,
      DEFAULT_TALENTS: priestData.DEFAULT_TALENTS, parseTalents: priestData.parseTalents, METER_NAMES: priestData.METER_NAMES,
      METER_ICONS: priestData.METER_ICONS, THREAT_NAMES: priestData.THREAT_NAMES, TALENT_TREE_DATA: priestData.TALENT_TREE_DATA,
      TALENT_EFFECTS: priestData.TALENT_EFFECTS, NO_DPS_EFFECT: priestData.NO_DPS_EFFECT, BUILT_IN_BUILDS: priestData.BUILT_IN_BUILDS,
      SPELLBOOK_TABS: priestData.SPELLBOOK_TABS, castable: book(priestData.SPELLBOOK_TABS).castable(priestData.ABILITIES),
      spellbook: book(priestData.SPELLBOOK_TABS).spellbook,
    },
    // The wowsims preset stands 20 yards away, in Shadowform and Inner Fire.
    wowsims: { cls: 'ClassPriest', distance: 20, spec: () => ({ dpsPriest: { options: { classOptions: { armor: 'InnerFire', preShadowform: true } } } }) },
  },
  shaman: {
    name: 'Shaman',
    color: '#0070dd',
    resource: 'mana',
    Fight: ShamanFight,
    apl: { ...SHAMAN_APL_HOOKS, defaultApl: ELEMENTAL_APL },
    data: {
      ABILITIES: shamanData.ABILITIES, ALL_ACTIONS: shamanData.ALL_ACTIONS, AURAS: shamanData.AURAS, TALENT_TREES: shamanData.TALENT_TREES,
      DEFAULT_TALENTS: shamanData.DEFAULT_TALENTS, parseTalents: shamanData.parseTalents, METER_NAMES: shamanData.METER_NAMES,
      METER_ICONS: shamanData.METER_ICONS, THREAT_NAMES: shamanData.THREAT_NAMES, TALENT_TREE_DATA: shamanData.TALENT_TREE_DATA,
      TALENT_EFFECTS: shamanData.TALENT_EFFECTS, NO_DPS_EFFECT: shamanData.NO_DPS_EFFECT, BUILT_IN_BUILDS: shamanData.BUILT_IN_BUILDS,
      SPELLBOOK_TABS: shamanData.SPELLBOOK_TABS, castable: book(shamanData.SPELLBOOK_TABS).castable(shamanData.ABILITIES),
      spellbook: book(shamanData.SPELLBOOK_TABS).spellbook,
    },
    // The wowsims preset stands 20 yards away.
    wowsims: { cls: 'ClassShaman', distance: 20, spec: () => ({ elementalShaman: { options: { classOptions: {} } } }) },
    variants: {
      // Enhancement: the same spells and totems with the melee on (its fight), the Flametongue Weapon imbue on the main
      // hand, in melee.
      enhancement: {
        Fight: EnhancementFight,
        wowsims: { cls: 'ClassShaman', spec: () => ({ enhancementShaman: { options: { classOptions: { imbueMh: 'FlametongueWeapon' } } } }) },
      },
    },
  },
  druid: {
    name: 'Druid',
    color: '#ff7c0a',
    resource: 'mana',
    Fight: DruidFight,
    apl: { ...DRUID_APL_HOOKS, defaultApl: BALANCE_APL },
    data: {
      ABILITIES: druidData.ABILITIES, ALL_ACTIONS: druidData.ALL_ACTIONS, AURAS: druidData.AURAS, TALENT_TREES: druidData.TALENT_TREES,
      DEFAULT_TALENTS: druidData.DEFAULT_TALENTS, parseTalents: druidData.parseTalents, METER_NAMES: druidData.METER_NAMES,
      METER_ICONS: druidData.METER_ICONS, THREAT_NAMES: druidData.THREAT_NAMES, TALENT_TREE_DATA: druidData.TALENT_TREE_DATA,
      TALENT_EFFECTS: druidData.TALENT_EFFECTS, NO_DPS_EFFECT: druidData.NO_DPS_EFFECT, BUILT_IN_BUILDS: druidData.BUILT_IN_BUILDS,
      SPELLBOOK_TABS: druidData.SPELLBOOK_TABS, castable: book(druidData.SPELLBOOK_TABS).castable(druidData.ABILITIES),
      spellbook: book(druidData.SPELLBOOK_TABS).spellbook,
    },
    // The wowsims preset stands 20 yards away, in Moonkin Form.
    wowsims: { cls: 'ClassDruid', distance: 20, spec: () => ({ balanceDruid: { options: { classOptions: {} } } }) },
    // Played another way (a spec's variant, js/data/specs.js): what it replaces of the above.
    variants: {
      // Feral: Cat Form or Dire Bear Form (the sheet's form), energy or rage instead of mana; wowsims sims it as the Feral
      // Cat or Feral Bear spec, with another raid member's bleed assumed for Rend and Tear, in melee.
      feral: {
        resource: 'energy',
        Fight: FeralFight,
        apl: { ...FERAL_APL_HOOKS, defaultApl: CAT_APL },
        data: {
          ABILITIES: feralData.ABILITIES, ALL_ACTIONS: feralData.ALL_ACTIONS, AURAS: feralData.AURAS, TALENT_TREES: feralData.TALENT_TREES,
          DEFAULT_TALENTS: feralData.DEFAULT_TALENTS, parseTalents: feralData.parseTalents, METER_NAMES: feralData.METER_NAMES,
          METER_ICONS: feralData.METER_ICONS, THREAT_NAMES: feralData.THREAT_NAMES, TALENT_TREE_DATA: feralData.TALENT_TREE_DATA,
          TALENT_EFFECTS: feralData.TALENT_EFFECTS, NO_DPS_EFFECT: feralData.NO_DPS_EFFECT, BUILT_IN_BUILDS: feralData.BUILT_IN_BUILDS,
          SPELLBOOK_TABS: feralData.SPELLBOOK_TABS, castable: book(feralData.SPELLBOOK_TABS).castable(feralData.ABILITIES),
          spellbook: book(feralData.SPELLBOOK_TABS).spellbook,
        },
        wowsims: {
          cls: 'ClassDruid',
          spec: (fight) => (fight.spec === 'feralBear'
            ? { feralBearDruid: { options: { classOptions: {}, startingRage: 0, assumeBleedActive: true } } }
            : { feralCatDruid: { options: { classOptions: {}, assumeBleedActive: true } } }),
        },
      },
    },
  },
  hunter: {
    name: 'Hunter',
    color: '#abd473',
    resource: 'mana',
    Fight: HunterFight,
    apl: { ...HUNTER_APL_HOOKS, defaultApl: MARKSMANSHIP_APL },
    data: {
      ABILITIES: hunterData.ABILITIES, ALL_ACTIONS: hunterData.ALL_ACTIONS, AURAS: hunterData.AURAS, TALENT_TREES: hunterData.TALENT_TREES,
      DEFAULT_TALENTS: hunterData.DEFAULT_TALENTS, parseTalents: hunterData.parseTalents, METER_NAMES: hunterData.METER_NAMES,
      METER_ICONS: hunterData.METER_ICONS, THREAT_NAMES: hunterData.THREAT_NAMES, TALENT_TREE_DATA: hunterData.TALENT_TREE_DATA,
      TALENT_EFFECTS: hunterData.TALENT_EFFECTS, NO_DPS_EFFECT: hunterData.NO_DPS_EFFECT, BUILT_IN_BUILDS: hunterData.BUILT_IN_BUILDS,
      SPELLBOOK_TABS: hunterData.SPELLBOOK_TABS, castable: book(hunterData.SPELLBOOK_TABS).castable(hunterData.ABILITIES),
      spellbook: book(hunterData.SPELLBOOK_TABS).spellbook,
    },
    // The wowsims turret presets: 12 yards away, Thorium Headed Arrows in the Ancient Sinew Wrapped Lamina; no pet (Lone
    // Wolf), or Beast Mastery's Raptor as presets.ts PetOptions has it.
    wowsims: {
      cls: 'ClassHunter',
      distance: 12,
      spec: (fight, loadout) => {
        const raptor = ((loadout && loadout.classOptions) || {}).pet === 'raptor';
        const pet = raptor ? { petType: 'Raptor', petAttackSpeed: 'FasterAttackII', cobraReflexes: true, petAggression: 5 } : { petType: 'PetNone' };
        return { hunter: { options: { classOptions: { ammo: 'ThoriumHeadedArrow', quiverBonus: 'AncientSinewWrappedLamina', petUptime: 1, ...pet } } } };
      },
    },
  },
  warlock: {
    name: 'Warlock',
    color: '#8788ee',
    resource: 'mana',
    Fight: WarlockFight,
    apl: { ...WARLOCK_APL_HOOKS, defaultApl: AFFLICTION_APL },
    data: {
      ABILITIES: warlockData.ABILITIES, ALL_ACTIONS: warlockData.ALL_ACTIONS, AURAS: warlockData.AURAS, TALENT_TREES: warlockData.TALENT_TREES,
      DEFAULT_TALENTS: warlockData.DEFAULT_TALENTS, parseTalents: warlockData.parseTalents, METER_NAMES: warlockData.METER_NAMES,
      METER_ICONS: warlockData.METER_ICONS, THREAT_NAMES: warlockData.THREAT_NAMES, TALENT_TREE_DATA: warlockData.TALENT_TREE_DATA,
      TALENT_EFFECTS: warlockData.TALENT_EFFECTS, NO_DPS_EFFECT: warlockData.NO_DPS_EFFECT, BUILT_IN_BUILDS: warlockData.BUILT_IN_BUILDS,
      SPELLBOOK_TABS: warlockData.SPELLBOOK_TABS, castable: book(warlockData.SPELLBOOK_TABS).castable(warlockData.ABILITIES),
      spellbook: book(warlockData.SPELLBOOK_TABS).spellbook,
    },
    // The wowsims builds stand 20 yards away in Demon Armor with their demon out (or given up), your Curse of the
    // Elements assigned, a full bag of Soul Shards.
    wowsims: {
      cls: 'ClassWarlock',
      distance: 20,
      spec: (fight, loadout) => {
        const o = (loadout && loadout.classOptions) || {};
        const name = (k) => (k ? k[0].toUpperCase() + k.slice(1) : 'NoSummon');
        return { warlock: { options: { classOptions: { armor: 'DemonArmor', curseOptions: 'Elements', soulShards: 32, summon: name(o.summon), sacrificedDemon: name(o.sacrificedDemon) } } } };
      },
    },
  },
};

export const DEFAULT_CLASS = 'warrior';
// A class, or the variant of it a spec plays (its own fight, resource, data and apl hooks).
export function classOf(id, variant = null) {
  const cls = CLASSES[id] || CLASSES[DEFAULT_CLASS];
  const v = variant && cls.variants && cls.variants[variant];
  return v ? { ...cls, ...v } : cls;
}

// A fight for a character sheet, as its class plays. encounter: the shared targets (engine/target.js), for a
// group fighting the same dummies; left out, the fight has its own.
export function createFight(sheet, opts, rng = Math.random, encounter = null) {
  return new (classOf(sheet.classId, sheet.variant).Fight)(sheet, opts, rng, encounter);
}
