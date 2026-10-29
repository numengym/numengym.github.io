// The priest's side of the rotation helper (js/apl.js): which wowsims spell, aura and talent ids are which of the
// trainer's actions, and what the look-ahead copies (mana; it is not predicted).
import { ABILITIES } from '../../data/priest.js';
import { RACIALS } from '../../data/warrior.js';

const SPELLS = {};
for (const [id, ab] of Object.entries(ABILITIES)) if (ab.spellId) SPELLS[ab.spellId] = id;
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) SPELLS[r.active.spellId] = 'racial';
// The priests' racial spells the APL names: Elune's Light, Eureka! for priests.
Object.assign(SPELLS, { 1259799: 'racial', 1259823: 'racial' });

const AURAS = { 15473: 'shadowform', 14751: 'innerFocus', 1326168: 'darkInspiration' };
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) AURAS[r.active.spellId] = 'racial';
const TALENTS = { 15407: 'mindFlay', 15473: 'shadowform', 14751: 'innerFocus', 15286: 'vampiricEmbrace' };

export const PRIEST_APL_HOOKS = {
  strictTiming: true,
  spells: SPELLS,
  auras: AURAS,
  talents: TALENTS,
  other: { OtherActionResourcePotion: 'potion', OtherActionOffensivePotion: 'offensivePotion', OtherActionDefensivePotion: 'defensivePotion' },
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
  // Your Shadow Weaving on the target, with its stacks.
  targetAura(ev, sid) {
    const own = ev.f.own(ev.f.target);
    if (sid === 15258) return { end: own.swEnd || 0, stacks: own.sw || 0 };
    return null;
  },
  dot(ev, sid) {
    const own = ev.f.own(ev.f.target);
    if (sid === 10894) return own.shadowWordPainEnd || 0;
    if (sid === 19280) return own.devouringPlagueEnd || 0;
    return null;
  },
  beforePull(f, apl, ev) {
    for (const id of ev.prepullIds()) {
      if (f.aura(id)) continue;
      if (!f.blocker(id)) return f.A[id].spell ? { next: id, now: [] } : { next: null, now: [id] };
    }
    return null;
  },
  // wowsims' priest major cooldowns: the racial and the offensive potion (spell power) when ready, a Demonic Rune or mana
  // potion when it fits under your maximum mana.
  autocast(ev) {
    const f = ev.f;
    const out = ['racial'];
    if (ev.st.mana + 1500 <= f.maxMana) out.push('conjured');
    if (f.c.uses.potion && ev.st.mana + 2250 <= f.maxMana) out.push('potion');
    out.push('offensivePotion');
    return out;
  },
  names: { currentManaPercent: 'mana (%)', currentMana: 'mana' },
};
