// The fight engine's entry point. The engine is split into a class-independent core (engine/unit.js), the shared
// targets of an encounter (engine/target.js) and a module per class (js/classes); this file keeps the names the
// app imports. Fight is the warrior's fight, the only class so far.
export { WarriorFight as Fight } from '../classes/warrior/fight.js';
export { createFight } from '../classes/index.js';
export { Encounter } from './target.js';
