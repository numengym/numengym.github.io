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
};

export const DEFAULT_CLASS = 'warrior';
export const classOf = (id) => CLASSES[id] || CLASSES[DEFAULT_CLASS];

// A fight for a character sheet, as its class plays. encounter: the shared targets (engine/target.js), for a
// group fighting the same dummies; left out, the fight has its own.
export function createFight(sheet, opts, rng = Math.random, encounter = null) {
  return new (classOf(sheet.classId).Fight)(sheet, opts, rng, encounter);
}
