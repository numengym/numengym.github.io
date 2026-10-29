// The warlock's side of the rotation helper (js/apl.js): which wowsims spell, aura and talent ids are which of the
// trainer's actions, your damage over time and debuffs on the target, and what the look-ahead copies (mana; it is not
// predicted).
import { ABILITIES } from '../../data/warlock.js';
import { RACIALS } from '../../data/warrior.js';

const SPELLS = {};
for (const [id, ab] of Object.entries(ABILITIES)) if (ab.spellId) SPELLS[ab.spellId] = id;
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) SPELLS[r.active.spellId] = 'racial';
Object.assign(SPELLS, { 11661: 'shadowBolt', 11668: 'immolate', 11672: 'corruption' }); // the trainer's ranks

const AURAS = { 17941: 'shadowTrance', 18288: 'amplifyCurse', 440873: 'decimation', 1293816: 'shadowAndFlameShadow', 426311: 'shadowAndFlameFire' };
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) AURAS[r.active.spellId] = 'racial';
const TALENTS = { 18288: 'amplifyCurse', 18265: 'siphonLife', 1316697: 'wrack', 17877: 'shadowburn', 1293817: 'conflagrate', 412758: 'incinerate',
  18094: 'nightfall', 17793: 'improvedShadowBolt', 440870: 'decimation', 1293695: 'demonicBrand', 18788: 'demonicSacrifice' };

// Your damage over time on the target, by the spell ids the APLs name.
const DOTS = { 25311: 'corruption', 11672: 'corruption', 11713: 'baneOfAgony', 603: 'baneOfDoom', 18881: 'siphonLife', 25309: 'immolate', 11668: 'immolate' };

export const WARLOCK_APL_HOOKS = {
  strictTiming: true,
  spells: SPELLS,
  auras: AURAS,
  talents: TALENTS,
  other: { OtherActionResourcePotion: 'potion', OtherActionOffensivePotion: 'offensivePotion', OtherActionDefensivePotion: 'defensivePotion' },
  items: { 12662: 'conjured', 250937: 'offensivePotion' },

  state: (f) => ({ mana: f.mana }),
  withState(f, st, dt, fn) {
    const keep = f.mana;
    f.manaNow = st.mana;
    try { return fn(); } finally { f.manaNow = keep; }
  },
  afford: (f, st, dt, id) => st.mana >= f.cost(id),
  castGcd(f, st, id) { st.mana -= f.cost(id); },
  apply(f, st, id) { st.mana -= f.cost(id); return false; },
  value(ev, kind) {
    if (kind === 'currentManaPercent') return ev.f.maxMana ? ev.st.mana / ev.f.maxMana : 0;
    if (kind === 'currentMana') return ev.st.mana;
    return undefined;
  },
  dot(ev, sid) {
    const own = ev.f.own(ev.f.target);
    if (DOTS[sid]) return own[DOTS[sid]] ? own[`${DOTS[sid]}End`] || 0 : 0;
    if (sid === 1316697) return ev.f.casting && ev.f.casting.id === 'wrack' ? ev.f.casting.end : 0;
    if (sid === 11700 || sid === 11675) return ev.f.casting && ev.f.casting.id === SPELLS[sid] ? ev.f.casting.end : 0;
    return null;
  },
  // Debuffs on the target: Shadow Vulnerability, your Curse of the Elements, your Demonic Brand (with its charges).
  targetAura(ev, sid) {
    const own = ev.f.own(ev.f.target);
    if (sid === 17794) return own.isbEnd || 0;
    if (sid === 1311680) return own.coeEnd || 0;
    if (sid === 11717) return own.corEnd || 0;
    if (sid === 11708) return own.cowEnd || 0;
    if (sid === 1293696) return own.brandCharges > 0 ? { end: own.brandEnd || 0, stacks: own.brandCharges } : 0;
    if (DOTS[sid]) return own[DOTS[sid]] ? own[`${DOTS[sid]}End`] || 0 : 0;
    return null;
  },
  beforePull() { return null; },
  // wowsims' warlock major cooldowns: the racial, the explosive and the offensive potion when ready; a mana potion or
  // Demonic Rune when it fits under your maximum mana.
  autocast(ev) {
    const out = ['racial', 'explosive'];
    out.push('offensivePotion');
    if (ev.st.mana + 2250 <= ev.f.maxMana) out.push('potion');
    if (ev.st.mana + 1500 <= ev.f.maxMana) out.push('conjured');
    return out;
  },
  names: { currentManaPercent: 'mana (%)', currentMana: 'mana' },
};
