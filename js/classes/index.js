// The playable classes. Each class module brings its fight (the core unit, engine/unit.js, plus the class's
// resource, abilities and talents), its data (abilities, talent trees, spellbook, specs) and the wowsims spec it
// sims as. Adding a class: a folder under js/classes with its fight, an entry here, and its data files.
import { WarriorFight } from './warrior/fight.js';
import { ABILITIES, ALL_ACTIONS, TALENT_TREES } from '../data/warrior.js';
import { TALENT_TREE_DATA } from '../data/warrior-talents.js';
import { SPELLBOOK_TABS } from '../data/warrior-spellbook.js';

export const CLASSES = {
  warrior: {
    name: 'Warrior',
    color: '#c79c6e',
    resource: 'rage',
    Fight: WarriorFight,
    abilities: ABILITIES,
    actions: ALL_ACTIONS,
    talentTrees: TALENT_TREES,
    talentData: TALENT_TREE_DATA,
    spellbook: SPELLBOOK_TABS,
    specs: ['fury', 'arms'], // js/data/specs.js
  },
};

export const DEFAULT_CLASS = 'warrior';

// A fight for a character sheet, as its class plays. encounter: the shared targets (engine/target.js), for a
// group fighting the same dummies; left out, the fight has its own.
export function createFight(sheet, opts, rng = Math.random, encounter = null) {
  const cls = CLASSES[sheet.classId] || CLASSES[DEFAULT_CLASS];
  return new cls.Fight(sheet, opts, rng, encounter);
}
