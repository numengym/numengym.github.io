// The Feral druid's side of the rotation helper (js/apl.js): which wowsims spell, aura and talent ids are which of the
// trainer's actions, and how the look-ahead predicts energy (10 per second), rage (not predicted), combo points and mana.
import { ABILITIES, MAX_COMBO_POINTS } from '../../data/feral.js';
import { RACIALS } from '../../data/warrior.js';

const SPELLS = {};
for (const [id, ab] of Object.entries(ABILITIES)) if (ab.spellId) SPELLS[ab.spellId] = id;
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) SPELLS[r.active.spellId] = 'racial';
SPELLS[1238070] = 'primalBite'; // the id wowsims' bear APL casts Primal Bite by

const AURAS = { 768: 'catForm', 9634: 'bearForm', 16870: 'clearcasting', 417141: 'berserk', 5229: 'enrage', 29166: 'innervate' };
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) AURAS[r.active.spellId] = 'racial';
const TALENTS = { 1322605: 'shiftingPower', 407995: 'primalBite', 1238073: 'primalBite', 1238070: 'primalBite', 417141: 'berserk', 16958: 'bloodFrenzy', 17007: 'leaderOfThePack' };

// Energy at dt seconds from now, at the current regeneration (Cat Form; a bear's rage is not predicted).
const powerAt = (f, st, dt) => (f.cat ? Math.min(f.maxEnergy, st.power + f.regenRate() * dt) : st.power);

// Mana a second right now: mp5, and Spirit outside the five-second rule (or under Innervate).
function manaRegen(f, at) {
  const mp5 = ((f.c.mp5 || 0) + f.tempStats().mp5) / 5;
  const spirit = f.spiritRegen();
  return at < f.fsrEnd ? mp5 + (f.aura('innervate') ? spirit : 0) : mp5 + spirit;
}

// wowsims' druidExcessEnergy: the energy you can spend now without delaying a coming Rip or Rake refresh. A refresh
// counts when its bleed is up and enough fight is left after it (Rip at 5 combo points with 10 seconds more, Rake with
// a full Rake more). In time order, the energy regenerated before each refresh pays for it, what it cannot cover is
// kept from now, and the first refresh after Shifting Power is ready costs its energy less.
function excessEnergy(ev) {
  const { f, st, dt } = ev;
  const now = f.t + dt;
  const left = ev.value({ remainingTime: {} });
  const own = f.own(f.target);
  const refreshes = [];
  if (st.cp >= 5 && own.rip && own.ripEnd > now && own.ripEnd - now <= left - 10) refreshes.push({ at: own.ripEnd, cost: f.cost('rip') });
  if (own.rake && own.rakeEnd > now && own.rakeEnd - now <= left - ABILITIES.rake.duration) refreshes.push({ at: own.rakeEnd, cost: f.cost('rake') });
  refreshes.sort((a, b) => a.at - b.at);
  const regen = f.cat ? f.regenRate() : 0;
  let shiftEnergy = f.tal.shiftingPower ? ABILITIES.shiftingPower.energy : 0;
  const shiftReadyAt = now + ev.timeToReady('shiftingPower');
  let keep = 0;
  let regenUsedUntil = now;
  for (const r of refreshes) {
    let cost = r.cost;
    if (shiftEnergy > 0 && shiftReadyAt <= r.at) { cost -= shiftEnergy; shiftEnergy = 0; }
    if (regen <= 0) { keep += Math.max(0, cost); continue; }
    const gain = (r.at - regenUsedUntil) * regen;
    if (gain < cost) { keep += cost - gain; regenUsedUntil = r.at; } else regenUsedUntil += cost / regen;
  }
  return powerAt(f, st, dt) - keep;
}

export const FERAL_APL_HOOKS = {
  strictTiming: true,
  spells: SPELLS,
  auras: AURAS,
  talents: TALENTS,
  other: { OtherActionResourcePotion: 'potion', OtherActionOffensivePotion: 'offensivePotion', OtherActionDefensivePotion: 'defensivePotion' },
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
  value(ev, kind, a) {
    const { f, st, dt } = ev;
    if (kind === 'currentEnergy') return f.cat ? powerAt(f, st, dt) : 0;
    if (kind === 'currentRage') return f.cat ? 0 : st.power;
    if (kind === 'currentComboPoints') return st.cp;
    if (kind === 'maxEnergy') return f.maxEnergy;
    if (kind === 'currentMana') return st.mana;
    if (kind === 'maxMana') return f.maxMana;
    if (kind === 'currentManaPercent') return f.maxMana ? st.mana / f.maxMana : 0;
    if (kind === 'currentManaRegen') return manaRegen(f, f.t + dt);
    if (kind === 'druidExcessEnergy') return excessEnergy(ev);
    if (kind === 'talentRank') return f.tal[TALENTS[a.talentId && a.talentId.spellId]] || 0;
    // Shifting Power and Innervate cost mana, not energy.
    if (kind === 'spellCurrentCost') {
      const id = ev.resolve(a.spellId);
      if (id && ABILITIES[id] && ABILITIES[id].mana) return f.manaCost(id);
    }
    return undefined;
  },
  // Judgement of Wisdom: the raid's, on every target when you have it.
  known(ev, sid) {
    if (sid === 20355) return !!ev.f.c.jow;
    return undefined;
  },
  // Your bleeds on the target: Rake, Rip, Lacerate (with its stacks); Demoralizing Roar or Shout (anyone's) and the
  // raid's Judgement of Wisdom.
  targetAura(ev, sid) {
    const own = ev.f.own(ev.f.target);
    if (sid === 9904) return own.rake ? own.rakeEnd : 0;
    if (sid === 9896) return own.rip ? own.ripEnd : 0;
    if (sid === 1235827) return own.lacerate ? { end: own.lacerateEnd, stacks: own.lacerateStacks || 1 } : 0;
    if (sid === 9898) return ev.f.target.demoEnd || 0;
    if (sid === 20355) return ev.f.c.jow ? Infinity : 0;
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
  // wowsims' feral major cooldowns: the racial, the offensive potion and the explosive when ready, a Demonic Rune or
  // mana potion when it fits under your maximum mana (the APLs that cast a potion by name keep it to themselves).
  autocast(ev) {
    const out = ['racial', 'offensivePotion', 'explosive'];
    if (ev.st.mana + 2250 <= ev.f.maxMana) out.push('potion');
    if (ev.st.mana + 1500 <= ev.f.maxMana) out.push('conjured');
    return out;
  },
  names: {
    currentEnergy: 'energy', currentComboPoints: 'combo points', currentRage: 'rage', currentMana: 'mana', currentManaPercent: 'mana (%)',
    maxMana: 'maximum mana', currentManaRegen: 'mana per second', druidExcessEnergy: 'spare energy', talentRank: 'talent points',
  },
};
