// The druid's side of the rotation helper (js/apl.js): which wowsims spell, aura and talent ids are which of the
// trainer's actions, and what the look-ahead copies (mana; it is not predicted).
import { ABILITIES } from '../../data/druid.js';
import { RACIALS } from '../../data/warrior.js';

const SPELLS = {};
for (const [id, ab] of Object.entries(ABILITIES)) if (ab.spellId) SPELLS[ab.spellId] = id;
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) SPELLS[r.active.spellId] = 'racial';

const AURAS = { 408255: 'eclipse', 16886: 'naturesGrace', 29166: 'innervate', 16870: 'clearcasting', 1323400: 'revelation' };
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) AURAS[r.active.spellId] = 'racial';
const TALENTS = { 5570: 'insectSwarm', 408248: 'eclipse', 16880: 'naturesGrace', 24858: 'moonkinForm' };

export const DRUID_APL_HOOKS = {
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
  value(ev, kind, a) {
    const f = ev.f;
    if (kind === 'currentManaPercent') return f.maxMana ? ev.st.mana / f.maxMana : 0;
    if (kind === 'currentMana') return ev.st.mana;
    if (kind === 'maxMana') return f.maxMana;
    // Mana per second now: inside the five-second rule the casting rate, outside it the free one (caster.js regenRates).
    if (kind === 'currentManaRegen') { const r = f.regenRates(); return f.t + ev.dt < f.fsrEnd ? r.casting : r.free; }
    // wowsims APLValueSpellIsHitCapped: the spell's chance to miss the target is 0 (every druid spell rolls the spell table).
    if (kind === 'spellIsHitCapped') return f.hitChance() >= 1 - 1e-9 ? 1 : 0;
    // wowsims APLValueDotIsActiveOnAllTargets: the dot is on every living target.
    if (kind === 'dotIsActiveOnAllTargets') {
      const sid = a.spellId && a.spellId.spellId;
      const key = sid === 9835 ? 'moonfireEnd' : sid === 24977 ? 'insectSwarmEnd' : null;
      if (!key) return 0;
      const now = f.t + ev.dt;
      return f.targets.filter((t) => !t.dead).every((t) => (f.own(t)[key] || 0) > now) ? 1 : 0;
    }
    return undefined;
  },
  // Revelation (1323400): the trainer's druid does not take the enchant's Revelation, so the APL's Revelation lines are off.
  known(ev, sid) { return sid === 1323400 ? !!ev.f.revelationChance : undefined; },
  dot(ev, sid) {
    const own = ev.f.own(ev.f.target);
    if (sid === 9835) return own.moonfireEnd || 0;
    if (sid === 24977) return own.insectSwarmEnd || 0;
    return null;
  },
  beforePull(f, apl, ev) {
    for (const id of ev.prepullIds()) {
      if (f.aura(id)) continue;
      if (!f.blocker(id)) return f.A[id].spell ? { next: id, now: [] } : { next: null, now: [id] };
    }
    return null;
  },
  // wowsims' druid major cooldowns: the racial, the offensive potion (spell power) and the explosive when ready, a
  // Demonic Rune when it fits under your maximum mana.
  autocast(ev) {
    const out = ['racial', 'offensivePotion', 'potion', 'explosive'];
    if (ev.st.mana + 1500 <= ev.f.maxMana) out.push('conjured');
    return out;
  },
  names: { currentManaPercent: 'mana (%)', currentMana: 'mana', maxMana: 'maximum mana', currentManaRegen: 'mana per second', dotIsActiveOnAllTargets: 'on every target', spellIsHitCapped: 'hit capped' },
};
