// The first-time spec tutorials (js/tutorial.js), a file per class: for each spec, its steps in order, each
// { title, text, abilities? } where abilities are the action bar buttons it lights up. A build without a tutorial
// of its own takes its base spec's.
import { baseSpec } from '../specs.js';
import { TUTORIALS as warrior } from './warrior.js';
import { TUTORIALS as rogue } from './rogue.js';
import { TUTORIALS as hunter } from './hunter.js';
import { TUTORIALS as druid } from './druid.js';
import { TUTORIALS as mage } from './mage.js';
import { TUTORIALS as warlock } from './warlock.js';
import { TUTORIALS as priest } from './priest.js';
import { TUTORIALS as paladin } from './paladin.js';
import { TUTORIALS as shaman } from './shaman.js';

const TUTORIALS = { ...warrior, ...rogue, ...hunter, ...druid, ...mage, ...warlock, ...priest, ...paladin, ...shaman };

export const tutorialOf = (spec) => TUTORIALS[spec] || TUTORIALS[baseSpec(spec)] || null;
// What a spec's tutorial is seen under: the spec, when it has one of its own, else its base spec.
export const tutorialKey = (spec) => (TUTORIALS[spec] ? spec : baseSpec(spec));
