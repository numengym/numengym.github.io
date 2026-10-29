// The hunter's side of the rotation helper (js/apl.js): which wowsims spell, aura and talent ids are which of the
// trainer's actions, your Hunter's Mark and Serpent Sting on the target, and what the look-ahead copies (mana; it is
// not predicted).
import { ABILITIES } from '../../data/hunter.js';
import { RACIALS } from '../../data/warrior.js';

const SPELLS = {};
for (const [id, ab] of Object.entries(ABILITIES)) if (ab.spellId) SPELLS[ab.spellId] = id;
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) SPELLS[r.active.spellId] = 'racial';

const AURAS = { 3045: 'rapidFire', 6150: 'quickShots', 1242512: 'rapidRecuperation', 19574: 'bestialWrath', 19615: 'frenzy' };
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) AURAS[r.active.spellId] = 'racial';
const TALENTS = { 1299346: 'trueshotAura', 415370: 'loneWolf', 19552: 'deadlyAspects' };

export const HUNTER_APL_HOOKS = {
  strictTiming: true,
  spells: SPELLS,
  auras: AURAS,
  talents: TALENTS,
  other: { OtherActionResourcePotion: 'potion', OtherActionOffensivePotion: 'potion' },
  items: { 12662: 'conjured' },

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
    if (sid === 25295) { const own = ev.f.own(ev.f.target); return own.serpentSting ? own.serpentStingEnd || 0 : 0; }
    return null;
  },
  // Your Hunter's Mark on the target.
  targetAura(ev, sid) {
    if (sid === 14325) return ev.f.own(ev.f.target).hmEnd || 0;
    return null;
  },
  beforePull(f, apl, ev) {
    if (!(f.own(f.target).hmEnd > f.t) && !f.blocker('huntersMark')) return { next: null, now: ['huntersMark'] };
    return null;
  },
  // wowsims' hunter major cooldowns: Rapid Fire, Bestial Wrath, the racial and the explosive when ready, a mana potion
  // or Demonic Rune when it fits under your maximum mana.
  autocast(ev) {
    const out = ['rapidFire', 'bestialWrath', 'racial', 'explosive'];
    if (ev.st.mana + 2250 <= ev.f.maxMana) out.push('potion');
    if (ev.st.mana + 1500 <= ev.f.maxMana) out.push('conjured');
    return out;
  },
  names: { currentManaPercent: 'mana (%)', currentMana: 'mana' },
};
