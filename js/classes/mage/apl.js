// The mage's side of the rotation helper (js/apl.js): which wowsims spell, aura and talent ids are which of the
// trainer's actions, and what the look-ahead copies (mana; it is not predicted).
import { ABILITIES } from '../../data/mage.js';
import { RACIALS } from '../../data/warrior.js';

const SPELLS = {};
for (const [id, ab] of Object.entries(ABILITIES)) if (ab.spellId) SPELLS[ab.spellId] = id;
// Other ranks and ids the APLs name.
Object.assign(SPELLS, { 25304: 'frostbolt', 25306: 'fireball', 12043: 'presenceOfMind' });
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) SPELLS[r.active.spellId] = 'racial';

const AURAS = { 400573: 'arcaneCharges', 400589: 'missileBarrage', 12536: 'clearcasting', 400625: 'heatingUp', 400669: 'fingersOfFrost',
  13033: 'iceBarrier', 12042: 'arcanePower', 11129: 'combustion', 12043: 'presenceOfMind', 22783: 'mageArmor', 12051: 'evocation', 1953: 'blink' };
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) AURAS[r.active.spellId] = 'racial';
const TALENTS = { 11185: 'improvedBlizzard', 400574: 'arcaneBlast', 1326079: 'arcaneWrath', 11366: 'pyroblast', 1312002: 'iceLance',
  12472: 'coldSnap', 11426: 'iceBarrier', 12042: 'arcanePower', 12043: 'presenceOfMind', 11129: 'combustion', 400647: 'fingersOfFrost' };

export const MAGE_APL_HOOKS = {
  strictTiming: true,
  spells: SPELLS,
  auras: AURAS,
  talents: TALENTS,
  other: { OtherActionResourcePotion: 'potion', OtherActionOffensivePotion: 'offensivePotion', OtherActionDefensivePotion: 'defensivePotion' },
  items: { 8008: 'manaGem' },

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
  // Your debuffs on the target: Fire Vulnerability (Improved Scorch) and Winter's Chill, with their stacks.
  targetAura(ev, sid) {
    const own = ev.f.own(ev.f.target);
    if (sid === 22959) return { end: own.fvEnd || 0, stacks: own.fv || 0 };
    if (sid === 12579) return { end: own.wcEnd || 0, stacks: own.wc || 0 };
    return null;
  },
  dot(ev, sid) {
    const own = ev.f.own(ev.f.target);
    if (sid === 10151) return own.fireballDotEnd || 0;
    if (sid === 18809) return own.pyroblastDotEnd || 0;
    if (sid === 1237313) return own.frostfireBoltDotEnd || 0;
    return null;
  },
  // Before the pull: the APL's pre-pull (Ice Barrier, a precast) as far as it is not done yet.
  beforePull(f, apl, ev) {
    for (const id of ev.prepullIds()) {
      if (f.aura(id)) continue;
      if (!f.blocker(id)) return f.A[id].spell ? { next: id, now: [] } : { next: null, now: [id] };
    }
    return null;
  },
  // wowsims' mage major cooldowns: the damage ones when ready, the mana gem and potion when they fit under your
  // maximum mana, Evocation below 10% mana.
  autocast(ev) {
    const f = ev.f;
    const out = ['arcanePower', 'combustion', 'presenceOfMind', 'racial'];
    if (ev.st.mana + 1200 <= f.maxMana) out.push('manaGem');
    if (ev.st.mana + 2250 <= f.maxMana) out.push('potion');
    if (ev.st.mana < 0.1 * f.maxMana) out.push('evocation');
    return out;
  },
  names: { currentManaPercent: 'mana (%)', currentMana: 'mana' },
};
