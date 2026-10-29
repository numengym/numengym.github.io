// The rogue's side of the rotation helper (js/apl.js): which wowsims spell, aura and talent ids are which of the
// trainer's actions, and how the look-ahead predicts energy (it regenerates, 10 per second) and combo points.
import { ABILITIES, ENERGY, MAX_COMBO_POINTS } from '../../data/rogue.js';
import { RACIALS } from '../../data/warrior.js';

const SPELLS = {};
for (const [id, ab] of Object.entries(ABILITIES)) if (ab.spellId) SPELLS[ab.spellId] = id;
// Other ranks the APL names, and the rogue's Eureka!.
Object.assign(SPELLS, { 25300: 'backstab', 31016: 'eviscerate', 1310707: 'mutilate', 1259812: 'racial' });
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) SPELLS[r.active.spellId] = 'racial';

const AURAS = { 6774: 'sliceAndDice', 13877: 'bladeFlurry', 13750: 'adrenalineRush', 1310703: 'venom', 14177: 'coldBlood',
  462707: 'cutthroat', 1787: 'stealth', 5277: 'evasion', 1259812: 'racial', 1310723: 'thousandCuts' };
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) AURAS[r.active.spellId] = 'racial';
const TALENTS = { 1310721: 'thousandCuts', 1310723: 'thousandCuts', 13750: 'adrenalineRush', 13877: 'bladeFlurry', 1310707: 'mutilate',
  1241584: 'mutilate', 16511: 'hemorrhage', 14177: 'coldBlood', 14183: 'premeditation', 14185: 'preparation', 1310703: 'venom' };

// Energy at dt seconds from now, at the current regeneration.
const energyAt = (f, st, dt) => Math.min(f.maxEnergy, st.energy + f.regenRate() * dt);

export const ROGUE_APL_HOOKS = {
  strictTiming: true,
  spells: SPELLS,
  auras: AURAS,
  talents: TALENTS,
  other: { OtherActionOffensivePotion: 'potion', OtherActionResourcePotion: 'potion' },
  items: { 7676: 'conjured' }, // Thistle Tea

  state: (f) => ({ energy: f.energy, cp: f.cp }),
  withState(f, st, dt, fn) {
    const keepE = f.energy; // brings the energy up to now first
    const keepCp = f.cp;
    f.energyNow = energyAt(f, st, dt);
    f.cp = st.cp;
    try { return fn(); } finally { f.energyNow = keepE; f.cp = keepCp; }
  },
  afford: (f, st, dt, id) => energyAt(f, st, dt) >= f.cost(id),
  castGcd(f, st, id) {
    const ab = ABILITIES[id];
    st.energy -= f.cost(id);
    st.cp = ab.finisher ? 0 : Math.min(MAX_COMBO_POINTS, st.cp + (ab.cp || 0));
  },
  apply(f, st, id) {
    const ab = ABILITIES[id];
    st.energy -= f.cost(id);
    if (ab.cp) st.cp = Math.min(MAX_COMBO_POINTS, st.cp + ab.cp);
  },
  value(ev, kind) {
    if (kind === 'currentEnergy') return energyAt(ev.f, ev.st, ev.dt);
    if (kind === 'currentComboPoints') return ev.st.cp;
    if (kind === 'maxEnergy') return ev.f.maxEnergy || ENERGY.max;
    return undefined;
  },
  // Debuffs on the target: your Hemorrhage, Expose Armor (not modelled: never up).
  targetAura(ev, sid) {
    const f = ev.f;
    const own = f.own(f.target);
    if (sid === 16511) return own.hemoEnd || 0;
    return null;
  },
  dot(ev, sid) {
    const own = ev.f.own(ev.f.target);
    if (sid === 11290) return own.garrote ? own.garroteEnd : 0;
    if (sid === 11275) return own.rupture ? own.ruptureEnd : 0;
    return null;
  },
  // Before the pull: the APL's pre-pull (Blade Flurry, Premeditation, Stealth) as far as it is not done yet; then the
  // helper shows the opener.
  beforePull(f, apl, ev) {
    for (const id of ev.prepullIds()) {
      if (id === 'stealth' && f.aura('stealth')) continue;
      if (!f.blocker(id)) return { next: null, now: [id] };
    }
    return null;
  },
  names: { currentEnergy: 'energy', currentComboPoints: 'combo points' },
};
