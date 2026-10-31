// The warrior's side of the rotation helper (js/apl.js): which wowsims spell, aura and talent ids are which of the
// trainer's actions, and what the look-ahead copies (stance, rage, a queued Heroic Strike). Rage is not predicted.
import { ABILITIES, RACIALS, TALENT } from '../../data/warrior.js';

const SPELLS = {};
for (const [id, ab] of Object.entries(ABILITIES)) if (ab.spellId) SPELLS[ab.spellId] = id;
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) SPELLS[r.active.spellId] = 'racial';
SPELLS[12723] = 'sweepingStrikes'; // the id the wowsims APLs cast Sweeping Strikes by
// Other ranks of the trainer's abilities that the APLs name (the trainer casts one rank of each).
Object.assign(SPELLS, { 11567: 'heroicStrike', 11551: 'battleShout', 11601: 'revenge' });

// Player auras by spell id: engine aura ids.
const AURAS = { 25289: 'battleShout', 11551: 'battleShout', 12328: 'deathWish', 1719: 'recklessness', 18499: 'berserkerRage', 2687: 'bloodrage',
  1282733: 'overpowerWindow', 12292: 'sweepingStrikes', 12723: 'sweepingStrikes', 5302: 'revengeWindow', 2565: 'shieldBlock', 12975: 'lastStand',
  871: 'shieldWall' };
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) AURAS[r.active.spellId] = 'racial';
const TALENTS = { 20500: 'improvedBerserkerRage', 12328: 'deathWish', 23881: 'bloodthirst', 23894: 'bloodthirst',
  12862: 'improvedSlam', 12294: 'mortalStrike', 21553: 'mortalStrike', 12292: 'sweepingStrikes', 1310222: 'spearingStrike' };
const STANCE_AURAS = { 2457: 'battle', 2458: 'berserker', 71: 'defensive' };

const keep = (f) => TALENT.tacticalMastery.base + TALENT.tacticalMastery.perRank * f.tal.improvedTacticalMastery;

export const WARRIOR_APL_HOOKS = {
  spells: SPELLS,
  auras: AURAS,
  talents: TALENTS,
  other: { OtherActionResourcePotion: 'potion', OtherActionOffensivePotion: 'offensivePotion', OtherActionDefensivePotion: 'defensivePotion' },

  state: (f) => ({ stance: f.stance, rage: f.rage, queued: f.queued }),
  withState(f, st, dt, fn) {
    const { stance, rage } = f;
    f.stance = st.stance;
    f.rage = st.rage;
    try { return fn(); } finally { f.stance = stance; f.rage = rage; }
  },
  afford: (f, st, dt, id) => st.rage >= f.cost(id),
  canCast: (f, st, id) => !((id === 'heroicStrike' || id === 'cleave') && st.queued),
  castGcd(f, st, id) { st.rage -= f.cost(id); },
  // What an off-GCD action changes for the rest of the look-ahead.
  apply(f, st, id, done) {
    const ab = ABILITIES[id];
    if (ab.stance) {
      st.stance = ab.stance;
      st.rage = Math.min(st.rage, keep(f));
      done.add('battleStance').add('berserkerStance').add('defensiveStance'); // shared stance cooldown
      return true;
    }
    if (ab.queue) { st.queued = id; return true; }
    st.rage -= f.cost(id);
    return false;
  },
  value(ev, kind) {
    if (kind === 'currentRage') return ev.st.rage;
    return undefined;
  },
  aura(ev, sid) {
    const on = STANCE_AURAS[sid];
    if (on) return ev.st.stance === on ? { active: true, remaining: Infinity, stacks: 1 } : { active: false, remaining: 0, stacks: 0 };
    if (sid === ABILITIES.sunderArmor.spellId) {
      const t = ev.f.target;
      const rem = t.sunderEnd - ev.f.t - ev.dt;
      return rem > 0 && t.sunder > 0 ? { active: true, remaining: rem, stacks: t.sunder } : { active: false, remaining: 0, stacks: 0 };
    }
    return undefined;
  },
  // Debuffs on the target: Thunder Clap and Demoralizing Shout (anyone's), your Rend. Returns when it ends.
  targetAura(ev, sid) {
    const f = ev.f;
    const t = f.target;
    if (sid === 11574) return f.own(t).rend ? f.own(t).rendEnd : 0;
    if (sid === 11581) return t.tcEnd || 0;
    if (sid === 11556) return t.demoEnd || 0;
    return null;
  },
  dot(ev, sid) {
    if (sid !== ABILITIES.rend.spellId) return null;
    const own = ev.f.own(ev.f.target); // your Rend, not another warrior's
    return own.rend ? own.rendEnd : 0;
  },
  known(ev, sid, a) {
    const f = ev.f;
    if (sid === 20500) return f.tal.improvedBerserkerRage >= Math.max(1, a.auraId.tag || 1);
    if (sid === ABILITIES.battleShout.spellId) return (f.c.externalShout || 0) >= ABILITIES.battleShout.ap; // a raid shout as strong
    if (sid === 11551) return false; // the raid's Battle Shout here is always the 25289 one, never Rank 6
    return undefined;
  },
  // Before the pull: Charge once you are in its range.
  beforePull(f, apl, ev, dance) {
    const stance = f.stance;
    if (dance.has('charge')) f.stance = 'battle';
    const reason = f.blocker('charge');
    f.stance = stance;
    if (reason && reason.startsWith('Must be in') && !f.blocker('battleStance')) return { next: null, now: ['battleStance'] };
    return { next: null, now: reason ? [] : ['charge'] };
  },
  // Stance swaps due when the GCD is up are shown at once.
  showEarly: (id) => !!ABILITIES[id].stance,
  // A stance-dance macro on the next ability does the swap itself.
  finish(next, now, dance) {
    if (!next || !dance.has(next)) return;
    const need = ABILITIES[next].stances || [];
    for (let i = now.length - 1; i >= 0; i--) if (ABILITIES[now[i]].stance && need.includes(ABILITIES[now[i]].stance)) now.splice(i, 1);
  },
  names: { currentRage: 'rage' },
  auraNames: { 10612: 'Windfury Totem', 20500: 'Improved Berserker Rage', 2457: 'Battle Stance', 2458: 'Berserker Stance', 71: 'Defensive Stance',
    5302: 'Revenge window', 27648: 'Thunderfury' },
};
