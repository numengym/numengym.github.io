// The paladin's side of the rotation helper (js/apl.js): which wowsims spell, aura and talent ids are which of the
// trainer's actions, and what the look-ahead copies (mana; it is not predicted).
import { ABILITIES, TWIST_OF_LIGHT } from '../../data/paladin.js';
import { RACIALS } from '../../data/warrior.js';

const SPELLS = {};
for (const [id, ab] of Object.entries(ABILITIES)) if (ab.spellId) SPELLS[ab.spellId] = id;
// Other ranks and rows the APLs name.
Object.assign(SPELLS, { 25903: 'holyShock', 20930: 'holyShock' }); // 25903 is the heal: an imported APL that names it means the shock
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) SPELLS[r.active.spellId] = 'racial';

const AURAS = { 10301: 'retributionAura', 20293: 'sealOfRighteousness', 20920: 'sealOfCommand', 20308: 'sealOfTheCrusader', 20423: 'sealOfFury', 1310994: 'swiftJudgement',
  20928: 'holyShield', 25780: 'righteousFury' };
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) AURAS[r.active.spellId] = 'racial';
const TALENTS = { 1310905: 'consecratedGround', 20375: 'sealOfCommand', 1311606: 'holyShock', 20925: 'holyShield', 1310994: 'swiftJudgement',
  1310735: 'twistOfLight' };
// Twist of Light's Echoes (1311703 Command, 1311704 Righteousness, 1311701 Fury): the seal each one is.
const ECHOES = Object.fromEntries(Object.entries(TWIST_OF_LIGHT.echoes).map(([seal, sid]) => [sid, seal]));
const NONE = { active: false, remaining: 0, stacks: 0 };

export const PALADIN_APL_HOOKS = {
  strictTiming: true,
  spells: SPELLS,
  auras: AURAS,
  talents: TALENTS,
  other: { OtherActionResourcePotion: 'potion', OtherActionOffensivePotion: 'offensivePotion', OtherActionDefensivePotion: 'defensivePotion' },
  items: { 12662: 'conjured', 9449: 'weapon' },

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
    // No target is undead or a demon for the paladin (Exorcism's rule in fight.js), so the Holy Shock APL never waits on Exorcism.
    if (kind === 'targetIsMobType') return 0;
    return undefined;
  },
  // A Twist of Light Echo waits for your next white hit; the look-ahead takes it as used once that swing is due (a
  // miss leaves it, which is not predicted).
  aura(ev, sid) {
    const seal = ECHOES[sid];
    if (!seal) return undefined;
    const f = ev.f;
    return f.echo === seal && f.aura('echo') && f.mhNext - f.t > ev.dt ? { active: true, remaining: Infinity, stacks: 1 } : NONE;
  },
  auraNames: { 1311703: 'Echo of Command', 1311704: 'Echo of Righteousness', 1311701: 'Echo of Fury', 1280353: 'Consecrated Ground' },
  // Your debuffs on the target: Judgement of the Crusader, the Consecration mark (Consecrated Ground).
  targetAura(ev, sid) {
    const own = ev.f.own(ev.f.target);
    if (sid === 20303) return own.jotcEnd || 0;
    if (sid === 1280353) return own.consecrationEnd || 0;
    return null;
  },
  dot: () => null,
  beforePull(f, apl, ev) {
    for (const id of ev.prepullIds()) {
      if (f.aura(id)) continue;
      if (!f.blocker(id)) return { next: null, now: [id] };
    }
    return null;
  },
  autocast(ev) {
    const out = ['racial', 'weapon'];
    if (ev.st.mana + 1800 <= ev.f.maxMana) out.push('potion', 'conjured');
    return out;
  },
  names: { currentManaPercent: 'mana (%)', currentMana: 'mana' },
};
