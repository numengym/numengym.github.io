// The encounter journal (Journal tab, the ready room's link): each encounter's abilities with their icons, when they
// come and what they do, written from the same mechanic data the fight runs on (world/encounter.js), so the numbers
// match what hits you. Onyxia's are written out here: her fight is scripted in world/onyxia.js.
import { ENCOUNTERS } from './world/encounter.js';
import { ONYXIA_INFO } from './world/onyxia.js';

const SCHOOLS = { physical: 'Physical', fire: 'Fire', shadow: 'Shadow', frost: 'Frost', nature: 'Nature', arcane: 'Arcane', holy: 'Holy' };

// A mechanic's damage: its own number and school, or a share of your health (the Brute).
const dmgOf = (m) => (m.amount != null ? `${m.amount.toLocaleString('en-US')} ${SCHOOLS[m.school || 'physical']} damage` : `${Math.round(m.damage * 100)}% of your health`);
const secs = (s) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} sec`);

// What a mechanic does and how to deal with it, by its kind.
function explain(m) {
  switch (m.kind) {
    case 'cleave': return `${dmgOf(m)} to everyone in a cone in front of the boss, up to ${m.radius} yards out. Stand behind it: only the tank faces it.`;
    case 'patch': return `Fire on the ground under a raider (you, on your screen): ${dmgOf(m)} every ${secs(m.tick)} while you stand in it, for ${secs(m.duration)}. Step out of the circle as soon as it shows.`;
    case 'nova': return `${dmgOf(m)} to the whole raid. Nothing to dodge: keep your health up for it (a defensive cooldown or a potion if you are low).`;
    case 'stomp': return `${dmgOf(m)} to everyone within ${m.radius} yards of the boss${m.knockback ? ', who are thrown back' : ''}. Get out of its reach during the ${secs(m.cast)} cast, then come back.`;
    case 'fear': return `Everyone within ${m.radius} yards flees in fear for ${secs(m.duration)}: no casting, no attacking. A warrior's Berserker Rage keeps it off; otherwise wait it out.`;
    case 'berserk': return `The enrage timer: after ${secs(m.first)} the boss goes berserk and hits the raid for ${dmgOf(m)} every ${secs(m.every)} until everyone is dead. Kill it first.`;
    default: return '';
  }
}

const whenOf = (m) => (m.kind === 'berserk' ? `at ${secs(m.first)}` : `every ${secs(m.every)} · first at ${secs(m.first)}${m.cast ? ` · ${secs(m.cast)} cast` : ' · instant'}`);

const ONYXIA = [
  ['cleave', 'Phases 1 and 3', 'A third of the health of everyone in a cone in front of her. Stand at her side.'],
  ['flameBreath', 'Phases 1 and 3', 'A long cone of fire in front of her for over half your health. Never stand in front of her.'],
  ['tailSweep', 'Phases 1 and 3', 'Her tail hits everyone in a cone behind her and throws them back. Stand at her side, not behind her.'],
  ['whelps', 'Phase 2 (65%)', 'Whelps pour out of the eggs in waves: extra targets that bite. Kill them while she flies.'],
  ['fireball', 'Phase 2', 'From the air she throws Fireballs at a raider, splashing those near them. Spread out.'],
  ['deepBreath', 'Phase 2', 'She flies over the room breathing fire in a wide line for almost all your health. Get out of her path when she turns to breathe.'],
  ['bellowingRoar', 'Phase 3 (40%)', 'Everyone runs in fear for a few seconds. A warrior\'s Berserker Rage keeps it off.'],
  ['eruption', 'Phase 3', 'Lava erupts from the cracks in the floor. Step off the glowing cracks.'],
];

// An encounter's journal: { name, raid, health, overview, abilities: [{ name, icon, when, text }] }.
export function journalOf(key) {
  const enc = ENCOUNTERS[key] || ENCOUNTERS.dummies;
  const page = { name: enc.name, raid: enc.raid || (enc.lair ? "Onyxia's Lair" : ''), health: enc.health || 0, overview: enc.description || '', abilities: [] };
  if (key === 'onyxia') {
    page.abilities = ONYXIA.map(([id, when, text]) => ({ ...ONYXIA_INFO[id], when, text }));
  } else if (enc.mechanics) {
    page.abilities = Object.entries(enc.mechanics).map(([id, m]) => ({ name: m.name, icon: (enc.info[id] || {}).icon, when: whenOf(m), text: explain(m) }));
  } else {
    page.overview = 'Training dummies: they never fight back. Practise your rotation on one target or several.';
  }
  if (enc.rooted) page.overview += ' He never leaves his spot: he only turns to whoever has his aggro.';
  return page;
}
