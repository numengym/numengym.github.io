// The shaman's side of the rotation helper (js/apl.js): which wowsims spell, aura and talent ids are which of the
// trainer's actions, its totems' time left, and what the look-ahead copies (mana; it is not predicted).
import { ABILITIES } from '../../data/shaman.js';
import { RACIALS } from '../../data/warrior.js';

const SPELLS = {};
for (const [id, ab] of Object.entries(ABILITIES)) if (ab.spellId) SPELLS[ab.spellId] = id;
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) SPELLS[r.active.spellId] = 'racial';

const AURAS = { 16246: 'clearcasting', 16166: 'elementalMastery', 1323418: 'revelation' };
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) AURAS[r.active.spellId] = 'racial';
const TALENTS = { 408490: 'lavaBurst', 16166: 'elementalMastery', 16164: 'elementalFocus', 408510: 'waterShield', 1325256: 'manaTideTotem' };

export const SHAMAN_APL_HOOKS = {
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
  value(ev, kind, a) {
    if (kind === 'currentManaPercent') return ev.f.maxMana ? ev.st.mana / ev.f.maxMana : 0;
    if (kind === 'currentMana') return ev.st.mana;
    // A totem's time left in its element's slot (Fire, Water, Earth, Air).
    if (kind === 'totemRemainingTime') return Math.max(0, ev.f.totemLeft(String(a.totemType || '').toLowerCase()) - ev.dt);
    return undefined;
  },
  // Revelation is known with the enchant on the weapon.
  known(ev, sid) {
    if (sid === 1323418) return !!ev.f.revelationChance;
    return undefined;
  },
  dot(ev, sid) {
    if (sid === 10448) return ev.f.own(ev.f.target).flameShockEnd || 0;
    return null;
  },
  beforePull(f, apl, ev) {
    for (const id of ev.prepullIds()) {
      if (f.A[id] && f.A[id].totem && f.totemUp(f.A[id].totem, id)) continue;
      if (f.aura(id)) continue;
      if (!f.blocker(id)) return f.A[id].spell ? { next: id, now: [] } : { next: null, now: [id] };
    }
    return null;
  },
  // The APL casts the racials, Elemental Mastery and the potions by name; the trinkets are autocast.
  autocast: () => [],
  names: { currentManaPercent: 'mana (%)', currentMana: 'mana', totemRemainingTime: 'totem time left' },
};
