// The Feral druid's side of the rotation helper (js/apl.js): which wowsims spell, aura and talent ids are which of the
// trainer's actions, and how the look-ahead predicts energy (10 per second), rage (not predicted), combo points and mana.
import { ABILITIES, MAX_COMBO_POINTS } from '../../data/feral.js';
import { RACIALS } from '../../data/warrior.js';

const SPELLS = {};
for (const [id, ab] of Object.entries(ABILITIES)) if (ab.spellId) SPELLS[ab.spellId] = id;
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) SPELLS[r.active.spellId] = 'racial';

const AURAS = { 768: 'catForm', 9634: 'bearForm', 16870: 'clearcasting', 417141: 'berserk', 5229: 'enrage', 29166: 'innervate' };
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) AURAS[r.active.spellId] = 'racial';
const TALENTS = { 1322605: 'shiftingPower', 407995: 'primalBite', 1238073: 'primalBite', 417141: 'berserk', 16958: 'bloodFrenzy', 17007: 'leaderOfThePack' };

// Energy at dt seconds from now, at the current regeneration (Cat Form; a bear's rage is not predicted).
const powerAt = (f, st, dt) => (f.cat ? Math.min(f.maxEnergy, st.power + f.regenRate() * dt) : st.power);

export const FERAL_APL_HOOKS = {
  strictTiming: true,
  spells: SPELLS,
  auras: AURAS,
  talents: TALENTS,
  other: { OtherActionResourcePotion: 'potion', OtherActionOffensivePotion: 'potion' },
  items: { 12662: 'conjured' },

  state: (f) => ({ power: f.power, cp: f.cp, mana: f.mana }),
  withState(f, st, dt, fn) {
    const keep = { power: f.power, cp: f.cp, mana: f.mana };
    if (f.cat) f.energyNow = powerAt(f, st, dt); else f.rageNow = st.power;
    f.cp = st.cp;
    f.manaNow = st.mana;
    try { return fn(); } finally {
      if (f.cat) f.energyNow = keep.power; else f.rageNow = keep.power;
      f.cp = keep.cp;
      f.manaNow = keep.mana;
    }
  },
  afford: (f, st, dt, id) => powerAt(f, st, dt) >= f.cost(id) && st.mana >= f.manaCost(id),
  castGcd(f, st, id) { FERAL_APL_HOOKS.apply(f, st, id); },
  apply(f, st, id) {
    const ab = ABILITIES[id];
    st.power -= f.cost(id);
    st.mana -= f.manaCost(id);
    if (id === 'shiftingPower') st.power = Math.min(f.maxEnergy, st.power + ab.energy);
    if (ab.finisher) st.cp = 0;
    else if (ab.cp) st.cp = Math.min(MAX_COMBO_POINTS, st.cp + ab.cp);
    return false;
  },
  value(ev, kind) {
    const { f, st, dt } = ev;
    if (kind === 'currentEnergy') return f.cat ? powerAt(f, st, dt) : 0;
    if (kind === 'currentRage') return f.cat ? 0 : st.power;
    if (kind === 'currentComboPoints') return st.cp;
    if (kind === 'maxEnergy') return f.maxEnergy;
    if (kind === 'currentMana') return st.mana;
    if (kind === 'currentManaPercent') return f.maxMana ? st.mana / f.maxMana : 0;
    return undefined;
  },
  // Your bleeds on the target: Rake, Rip, Lacerate (with its stacks).
  targetAura(ev, sid) {
    const own = ev.f.own(ev.f.target);
    if (sid === 9904) return own.rake ? own.rakeEnd : 0;
    if (sid === 9896) return own.rip ? own.ripEnd : 0;
    if (sid === 1235827) return own.lacerate ? { end: own.lacerateEnd, stacks: own.lacerateStacks || 1 } : 0;
    return null;
  },
  dot(ev, sid) {
    const own = ev.f.own(ev.f.target);
    if (sid === 9904) return own.rake ? own.rakeEnd : 0;
    if (sid === 9896) return own.rip ? own.ripEnd : 0;
    if (sid === 1235827) return own.lacerate ? own.lacerateEnd : 0;
    return null;
  },
  beforePull() { return null; },
  // wowsims' feral major cooldowns: Berserk, the racial and the explosive when ready, a Demonic Rune or mana potion when
  // it fits under your maximum mana.
  autocast(ev) {
    const out = ['berserk', 'racial', 'explosive'];
    if (ev.st.mana + 2250 <= ev.f.maxMana) out.push('potion');
    if (ev.st.mana + 1500 <= ev.f.maxMana) out.push('conjured');
    return out;
  },
  names: { currentEnergy: 'energy', currentComboPoints: 'combo points', currentRage: 'rage', currentMana: 'mana', currentManaPercent: 'mana (%)' },
};
