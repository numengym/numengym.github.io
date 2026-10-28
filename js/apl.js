// Rotation helper: runs a wowsims APL (the player.rotation of a wowsims export, see js/data/fury-apl.js)
// against the live fight and says which buttons to press.
//
// wowsims casts the first action in the priority list that can be cast, then looks again. The helper
// does the same on a copy of the parts of the state an action changes (stance, rage, queued swing):
//   1. right now: off-GCD actions are collected ("now", blue) until a GCD ability comes up or nothing does;
//   2. then at the moment the GCD is ready, and a little later if nothing is castable yet, for the next
//      GCD ability ("next", green). Stance swaps found on the way are shown too.
// Values that depend on time (cooldowns, aura and dot timers) are read at that moment; rage is not
// predicted. Actions wowsims has that the trainer does not model (e.g. Sweeping Strikes) are skipped.
import { ABILITIES, RACIALS, TALENT } from './data/warrior.js';
import { DB } from './data/db.js';
import { DEFAULT_APL } from './data/fury-apl.js';

const SLACK = 0.05;
const INPUT_DELAY = 0.1;
const LOOKAHEAD = 3; // seconds the helper looks ahead for the next GCD ability
const STEP = 0.25;

// Spell ids of the trainer's abilities and racials.
const SPELLS = {};
for (const [id, ab] of Object.entries(ABILITIES)) if (ab.spellId) SPELLS[ab.spellId] = id;
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) SPELLS[r.active.spellId] = 'racial';
SPELLS[12723] = 'sweepingStrikes'; // the id the wowsims APLs cast Sweeping Strikes by
// The trainer's potion slot is the wowsims resource potion (resourcePotId).
const OTHER = { OtherActionResourcePotion: 'potion' };

// Player auras by spell id: engine aura ids.
const AURAS = { 25289: 'battleShout', 12328: 'deathWish', 1719: 'recklessness', 18499: 'berserkerRage', 2687: 'bloodrage', 1282733: 'overpowerWindow', 12292: 'sweepingStrikes', 12723: 'sweepingStrikes' };
for (const r of Object.values(RACIALS)) if (r.active && r.active.spellId) AURAS[r.active.spellId] = 'racial';
const TALENTS = { 20500: 'improvedBerserkerRage', 12328: 'deathWish', 23881: 'bloodthirst', 23894: 'bloodthirst',
  12862: 'improvedSlam', 12294: 'mortalStrike', 21553: 'mortalStrike', 12292: 'sweepingStrikes', 1310222: 'spearingStrike' };
const STANCE_AURAS = { 2457: 'battle', 2458: 'berserker' };

const warned = new Set();
const warnOnce = (what) => { if (!warned.has(what)) { warned.add(what); console.info(`Rotation helper: "${what}" is not modelled; it counts as false.`); } };

// "1.5s", "100ms", "40", "true" -> number.
function constValue(v) {
  const s = String(v).trim();
  if (s === 'true') return 1;
  if (s === 'false') return 0;
  const m = /^(-?[\d.]+)\s*(ms|s|m)?$/.exec(s);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return m[2] === 'ms' ? n / 1000 : m[2] === 'm' ? n * 60 : n;
}

const CMP = {
  OpEq: (a, b) => Math.abs(a - b) < 1e-6, OpNe: (a, b) => Math.abs(a - b) >= 1e-6,
  OpLt: (a, b) => a < b, OpLe: (a, b) => a <= b, OpGt: (a, b) => a > b, OpGe: (a, b) => a >= b,
};
const MATH = { OpAdd: (a, b) => a + b, OpSub: (a, b) => a - b, OpMul: (a, b) => a * b, OpDiv: (a, b) => (b ? a / b : 0) };

// The rotation of a wowsims export (full export, player object or rotation), or null if it has no APL.
export function aplFrom(json) {
  if (!json || typeof json !== 'object') return null;
  const rot = json.priorityList ? json : json.rotation || (json.player && json.player.rotation);
  return rot && Array.isArray(rot.priorityList) && rot.priorityList.length ? rot : null;
}

class Evaluation {
  // opts: { items: {itemId: actionId} }
  constructor(f, apl, opts) {
    this.f = f;
    this.apl = apl;
    this.items = opts.items || {};
    this.groups = Object.fromEntries((apl.groups || []).map((g) => [g.name, g]));
    this.vars = Object.fromEntries((apl.valueVariables || []).map((v) => [v.name, v.value]));
    // A group is "used" when a shown priority list entry refers to it (wowsims actionGroupUsed).
    this.used = new Set(apl.priorityList.filter((e) => !e.hide && e.action && e.action.groupReference).map((e) => e.action.groupReference.groupName));
    this.dt = 0;
    this.stance = f.stance;
    this.rage = f.rage;
    this.queued = f.queued;
    this.done = new Set();
    this.cooldowns = {}; // abilities used in the look-ahead: cooldown from now
    this.gcdBusy = false;
    this.depth = 0;
    this.trail = []; // groups and conditions on the way to the action being looked at, for "why"
  }

  // Fight-time conditions (time left, execute phase, multipleCdUsages) are read when the GCD is ready, not at
  // the later look-ahead steps, so a cooldown held for the end is not shown seconds before it is due.
  get fightDt() { return Math.min(this.dt, this.condDt ?? this.dt); }

  get keep() { return TALENT.tacticalMastery.base + TALENT.tacticalMastery.perRank * this.f.tal.improvedTacticalMastery; }

  resolve(spell) {
    if (!spell) return null;
    if (spell.spellId) return SPELLS[spell.spellId] || null;
    if (spell.itemId) return this.items[spell.itemId] || null;
    if (spell.otherId) return OTHER[spell.otherId] || null;
    return null;
  }

  timeToReady(id) {
    const ab = id && ABILITIES[id];
    if (!ab || (ab.talent && !this.f.tal[ab.talent])) return Infinity;
    if (id in this.cooldowns) return Math.max(0, this.cooldowns[id] - this.dt);
    return Math.max(0, this.f.cdLeft(id) - this.dt);
  }

  // Can the ability be used at this moment (now + dt), in the copied stance and rage? Range and facing
  // are ignored: the helper says what to press, getting in range is up to you.
  canCast(id) {
    const f = this.f;
    const ab = id && ABILITIES[id];
    if (!ab || this.done.has(id) || (ab.gcd && this.gcdBusy)) return false;
    if ((id === 'heroicStrike' || id === 'cleave') && this.queued) return false;
    const { geo, stance, rage } = f;
    f.geo = { ...geo, dist: geo.dist.map(() => 0), facing: true };
    f.stance = this.stance;
    f.rage = this.rage;
    let reason;
    try { reason = f.blocker(id); } finally { f.geo = geo; f.stance = stance; f.rage = rage; }
    if (reason === 'Ability is not ready yet') {
      const wait = f.readyIn(id); // GCD, cooldown and a cast in progress
      if (wait <= this.dt + SLACK && this.rage >= f.cost(id)) reason = null;
    }
    return !reason;
  }

  aura(a) {
    const f = this.f;
    const none = { active: false, remaining: 0, stacks: 0 };
    const sid = a.auraId && a.auraId.spellId;
    if (STANCE_AURAS[sid]) {
      const on = this.stance === STANCE_AURAS[sid];
      return on ? { active: true, remaining: Infinity, stacks: 1 } : none;
    }
    if (sid === ABILITIES.sunderArmor.spellId) {
      const t = f.target;
      const rem = t.sunderEnd - f.t - this.dt;
      return rem > 0 && t.sunder > 0 ? { active: true, remaining: rem, stacks: t.sunder } : none;
    }
    const id = AURAS[sid];
    if (!id) { warnOnce(`aura ${sid}`); return none; }
    const x = f.auras[id];
    const rem = x ? x.end - f.t - this.dt : 0;
    return rem > 0 ? { active: true, remaining: rem, stacks: x.stacks || 1 } : none;
  }

  // auraIsKnown: buffs from the raid setup and talents.
  known(a) {
    const f = this.f;
    const sid = a.auraId && a.auraId.spellId;
    if (sid === 10612) return !!f.c.windfuryAp;                          // Windfury Totem
    if (sid === 20500) return f.tal.improvedBerserkerRage >= Math.max(1, a.auraId.tag || 1);
    if (sid === ABILITIES.battleShout.spellId) return (f.c.externalShout || 0) >= ABILITIES.battleShout.ap; // a raid shout as strong
    if (TALENTS[sid]) return f.tal[TALENTS[sid]] > 0;
    warnOnce(`known aura ${sid}`);
    return false;
  }

  dotRemaining(spell) {
    const t = this.f.target;
    if (!spell || spell.spellId !== ABILITIES.rend.spellId) { warnOnce(`dot ${spell && spell.spellId}`); return 0; }
    const own = this.f.own(t); // your Rend, not another warrior's
    return own.rend && own.rendEnd > this.f.t + this.dt ? own.rendEnd - this.f.t - this.dt : 0;
  }

  // Cooldown and buff duration (seconds) of an action, or null when it has no self buff.
  cdAndBuff(id) {
    const f = this.f;
    const ab = ABILITIES[id];
    if (!ab) return null;
    if (ab.racial) {
      const r = f.racial.active;
      return r && r.duration ? { cd: r.cd, buff: r.duration } : null;
    }
    if (ab.item) {
      const use = f.c.uses[ab.item];
      if (!use) return null;
      const sp = DB.spells[use.fx.b];
      const ms = use.fx.d > 0 ? use.fx.d : sp && sp.d > 0 ? sp.d : 0;
      return ms > 0 ? { cd: Math.max(use.cd, use.ccd || 0), buff: ms / 1000 } : null;
    }
    return ab.cd && ab.duration ? { cd: ab.cd, buff: ab.duration } : null;
  }

  // wowsims APLValueMultipleCdUsages (sim/core/apl_values_misc.go). Without a base spell and with alignCdEnd,
  // the cooldown is used when its buff runs to the end of the fight, or when a later use still fits
  // (remaining > CD + buff / 2); otherwise it is held for the end. Without alignCdEnd it is always true.
  // A base spell (lining one cooldown up with another) is not modelled: then the cooldown is used when ready.
  multipleCdUsages(a) {
    const base = a.baseSpellId || {};
    if (base.spellId || base.itemId || base.otherId) { warnOnce('multipleCdUsages with a base spell'); return true; }
    if (!a.alignCdEnd) return true;
    const t = this.cdAndBuff(this.resolve(a.targetSpellId));
    if (!t) return true; // wowsims: no related self buff, always considered ready
    const remaining = this.f.timeLeft(this.fightDt);
    return remaining <= t.buff || remaining > t.cd + t.buff / 2;
  }

  truthy(v) { return !!this.value(v); }

  value(v) {
    if (!v) return 0;
    const f = this.f;
    const kind = Object.keys(v)[0];
    const a = v[kind] || {};
    switch (kind) {
      case 'const': return constValue(a.val);
      case 'and': return (a.vals || []).every((x) => this.truthy(x)) ? 1 : 0;
      case 'or': return (a.vals || []).some((x) => this.truthy(x)) ? 1 : 0;
      case 'not': return this.truthy(a.val) ? 0 : 1;
      case 'cmp': return (CMP[a.op] || (() => false))(this.value(a.lhs), this.value(a.rhs)) ? 1 : 0;
      case 'math': return (MATH[a.op] || (() => 0))(this.value(a.lhs), this.value(a.rhs));
      case 'max': return Math.max(...(a.vals || []).map((x) => this.value(x)));
      case 'min': return Math.min(...(a.vals || []).map((x) => this.value(x)));
      case 'variableRef': {
        if (this.depth > 20) return 0;
        this.depth++;
        try { return this.value(this.vars[a.name]); } finally { this.depth--; }
      }
      case 'actionGroupUsed': return this.used.has(a.name) ? 1 : 0;
      case 'multipleCdUsages': return this.multipleCdUsages(a) ? 1 : 0;
      case 'numberTargets': return f.targets.length;
      case 'currentRage': return this.rage;
      case 'currentTime': return f.t + this.fightDt;
      case 'remainingTime': return f.timeLeft(this.fightDt);
      case 'remainingTimePercent': return f.healthPct(f.primary, this.fightDt) * 100;
      case 'isExecutePhase': {
        if ((f.o.execute || 'last20') === 'never') return 0;
        const th = (parseInt(String(a.threshold).replace(/\D/g, ''), 10) || 20) / 100;
        return f.started && f.healthPct(f.primary, this.fightDt) <= th ? 1 : 0;
      }
      case 'spellTimeToReady': return this.timeToReady(this.resolve(a.spellId));
      case 'spellIsReady': return this.timeToReady(this.resolve(a.spellId)) <= 0 ? 1 : 0;
      case 'spellCanCast': return this.canCast(this.resolve(a.spellId)) ? 1 : 0;
      case 'spellGcdHastedDuration': return a.spellId ? f.gcdFor(this.resolve(a.spellId)) : 1.5;
      case 'spellCastTime': return f.castTime(this.resolve(a.spellId));
      case 'spellIsCasting': return f.casting && f.casting.id === this.resolve(a.spellId) ? 1 : 0;
      case 'autoTimeSinceLast': return Math.max(0, f.t + this.dt - f.lastMhSwing); // MainHandAuto
      case 'selectedPotion': {
        const use = f.c.uses.potion;
        return use && a.potionId && use.id === a.potionId.itemId ? 1 : 0;
      }
      case 'gcdTimeToReady': return Math.max(0, f.gcdLeft() - this.dt);
      case 'gcdIsReady': return f.gcdLeft() <= this.dt ? 1 : 0;
      case 'inputDelay': return INPUT_DELAY;
      case 'auraIsActive': case 'auraIsActiveWithReactionTime': return this.aura(a).active ? 1 : 0;
      case 'auraIsInactive': case 'auraIsInactiveWithReactionTime': return this.aura(a).active ? 0 : 1;
      case 'auraRemainingTime': return this.aura(a).remaining;
      case 'auraNumStacks': return this.aura(a).stacks;
      case 'auraIsKnown': return this.known(a) ? 1 : 0;
      case 'dotIsActive': return this.dotRemaining(a.spellId) > 0 ? 1 : 0;
      case 'dotRemainingTime': return this.dotRemaining(a.spellId);
      case 'talentIsKnown': return f.tal[TALENTS[a.talentId && a.talentId.spellId]] > 0 ? 1 : 0;
      default: warnOnce(kind); return 0;
    }
  }

  // The first castable action of a list entry: { id, why } or { wait: seconds } or null. why: the groups and
  // conditions that led to it ({ group } / { cond } entries, outermost first).
  action(a) {
    if (!a) return null;
    if (a.condition && !this.truthy(a.condition)) return null;
    if (a.condition) this.trail.push({ cond: a.condition });
    try {
      if (a.castSpell) {
        const id = this.resolve(a.castSpell.spellId);
        return this.canCast(id) ? { id, why: [...this.trail] } : null;
      }
      if (a.groupReference) {
        const g = this.groups[a.groupReference.groupName];
        if (!g || this.depth > 20) return null;
        this.depth++;
        this.trail.push({ group: g.name });
        try {
          for (const x of g.actions || []) {
            if (x.hide) continue;
            const r = this.action(x.action);
            if (r) return r;
          }
        } finally { this.depth--; this.trail.pop(); }
        return null;
      }
      if (a.castAllStatBuffCooldowns) {
        const id = ['trinket1', 'trinket2'].find((t) => this.canCast(t));
        return id ? { id, why: [...this.trail, { text: 'stat trinkets go out when ready' }] } : null;
      }
    } finally { if (a.condition) this.trail.pop(); }
    if (a.wait) {
      const d = this.value(a.wait.duration);
      return d > 0 ? { wait: d } : null;
    }
    return null;
  }

  pick() {
    for (const e of this.apl.priorityList) {
      if (e.hide) continue;
      const r = this.action(e.action);
      if (r) return r;
    }
    return null;
  }

  // After the GCD ability: its rage is spent and the GCD runs, so only off-GCD actions can follow.
  castGcd(id) {
    this.rage -= this.f.cost(id);
    this.done.add(id);
    this.gcdBusy = true;
    this.cooldowns[id] = this.f.cooldownFor(id);
  }

  // What an off-GCD action changes for the rest of the look-ahead.
  apply(id) {
    const ab = ABILITIES[id];
    if (ab.stance) {
      this.stance = ab.stance;
      this.rage = Math.min(this.rage, this.keep);
      this.done.add('battleStance').add('berserkerStance'); // shared stance cooldown
    } else if (ab.queue) {
      this.queued = id;
    } else {
      this.rage -= this.f.cost(id);
      this.done.add(id);
    }
  }
}

// Returns { next, now }: next is the GCD ability to press when the GCD is up (or null), now a list of
// off-GCD actions to press right away. apl: a wowsims rotation (null: the default). opts.dance: Set of
// abilities whose button is a stance-dance macro; opts.items: { itemId: 'trinket1' | 'trinket2' | 'explosive' }.
export function suggest(f, apl, opts = {}) {
  const dance = opts.dance || new Set();
  if (!f || f.over) return { next: null, now: [] };
  // Before the pull: Charge once you are in its range.
  if (!f.started) {
    const stance = f.stance;
    if (dance.has('charge')) f.stance = 'battle';
    const reason = f.blocker('charge');
    f.stance = stance;
    if (reason && reason.startsWith('Must be in') && !f.blocker('battleStance')) return { next: null, now: ['battleStance'] };
    return { next: null, now: reason ? [] : ['charge'] };
  }

  const ev = new Evaluation(f, apl || DEFAULT_APL, opts);
  const now = [];
  const why = {}; // action id -> the trail that picked it
  let next = null;
  let at = 0;
  let waitUntil = 0;

  // 1. Right now. After a GCD ability wowsims looks again at once, so off-GCD actions still follow it
  //    (Heroic Strike, a stance swap).
  for (let i = 0; i < 8; i++) {
    const r = ev.pick();
    if (!r) break;
    if (r.wait) { waitUntil = r.wait; break; }
    why[r.id] = why[r.id] || r.why;
    if (ABILITIES[r.id].gcd) {
      if (next) break;
      next = r.id;
      ev.castGcd(r.id);
      continue;
    }
    now.push(r.id);
    ev.apply(r.id);
  }
  if (next) return finish(next, now, dance, why, 0);

  // 2. When the GCD is ready, then a little later until a GCD ability comes up.
  const ready = Math.max(f.gcdLeft(), waitUntil);
  ev.condDt = ready;
  for (ev.dt = ready; !next && ev.dt <= ready + LOOKAHEAD; ev.dt += STEP) {
    for (let i = 0; i < 8; i++) {
      const r = ev.pick();
      if (!r || r.wait) break;
      if (ABILITIES[r.id].gcd) { next = r.id; why[r.id] = r.why; at = ev.dt; break; }
      // Stance swaps due when the GCD is up are shown now; other off-GCD actions show when they are due.
      if (ABILITIES[r.id].stance && ev.dt <= ready + SLACK && !now.includes(r.id)) { now.push(r.id); why[r.id] = why[r.id] || r.why; }
      ev.apply(r.id);
    }
  }

  return finish(next, now, dance, why, at);
}

// The APL's pre-pull actions in time order, before the fight starts, as wowsims casts them at their doAtValue:
// Berserker Rage, Bloodrage, Battle Shout, a stance, then the Charge or Intercept of "Pre-pull: Move", which pulls.
// For the bots (ghost and score); f must be in Charge range while this runs.
export function runPrepull(f, apl, opts = {}) {
  apl = apl || DEFAULT_APL;
  const at = (p) => constValue(p.doAtValue && p.doAtValue.const ? p.doAtValue.const.val : 0);
  for (const p of [...(apl.prepullActions || [])].sort((a, b) => at(a) - at(b))) {
    if (f.started) break;
    const ev = new Evaluation(f, apl, opts); // fresh, so conditions see the stance after an earlier swap
    const a = p.action || {};
    let id = null;
    if (a.castSpell) id = ev.resolve(a.castSpell.spellId);
    else if (a.groupReference && ev.groups[a.groupReference.groupName]) {
      for (const x of ev.groups[a.groupReference.groupName].actions || []) {
        const xa = x.action || {};
        if (!xa.castSpell || (xa.condition && !ev.truthy(xa.condition))) continue;
        id = ev.resolve(xa.castSpell.spellId);
        if (id) break;
      }
    }
    if (!id || (id === 'battleShout' && f.aura('battleShout'))) continue; // a precast shout is already up
    f.press(id);
  }
}

// A stance-dance macro on the next ability does the swap itself.
// Returns { next, now, why, at }: why maps an action id to the APL trail that picked it; at is when the next
// GCD ability is due (seconds from now).
function finish(next, now, dance, why = {}, at = 0) {
  if (next && dance.has(next)) {
    const need = ABILITIES[next].stances || [];
    for (let i = now.length - 1; i >= 0; i--) if (ABILITIES[now[i]].stance && need.includes(ABILITIES[now[i]].stance)) now.splice(i, 1);
  }
  return { next, now, why, at };
}

// ---- "why": an APL trail in words ----------------------------------------------------------------

const OPS = { OpEq: '=', OpNe: '≠', OpLt: '<', OpLe: '≤', OpGt: '>', OpGe: '≥' };
const AURA_NAMES = { 10612: 'Windfury Totem', 20500: 'Improved Berserker Rage', 2457: 'Battle Stance', 2458: 'Berserker Stance' };
const spellName = (s) => {
  if (!s) return 'it';
  if (s.otherId === 'OtherActionResourcePotion' || s.otherId === 'OtherActionOffensivePotion') return 'the potion';
  if (s.itemId) return 'the item';
  const id = SPELLS[s.spellId];
  return AURA_NAMES[s.spellId] || (id && ABILITIES[id] ? ABILITIES[id].name : `spell ${s.spellId}`);
};
const secs = (v) => { const n = constValue(v); return /s$/.test(String(v).trim()) ? `${n} s` : String(n); };

// One APL value or condition in words, or null for parts that say nothing to a player (toggles, talents).
export function describe(v, vars = {}) {
  if (!v) return null;
  const kind = Object.keys(v)[0];
  const a = v[kind] || {};
  const d = (x) => describe(x, vars);
  switch (kind) {
    case 'const': return secs(a.val);
    case 'and': case 'or': {
      const parts = (a.vals || []).map(d).filter(Boolean);
      return parts.length ? parts.join(kind === 'and' ? ' and ' : ' or ') : null;
    }
    case 'not': { const x = d(a.val); return x ? `not (${x})` : null; }
    case 'cmp': {
      const l = d(a.lhs);
      const r = d(a.rhs);
      return l && r ? `${l} ${OPS[a.op] || a.op} ${r}` : null;
    }
    case 'variableRef': return a.name;
    case 'multipleCdUsages': return `${spellName(a.targetSpellId)} lined up with the fight length`;
    case 'numberTargets': return 'targets';
    case 'currentRage': return 'rage';
    case 'currentTime': return 'fight time';
    case 'remainingTime': return 'time left';
    case 'remainingTimePercent': return 'time left (%)';
    case 'isExecutePhase': return 'execute phase';
    case 'spellTimeToReady': return `${spellName(a.spellId)} ready in`;
    case 'spellIsReady': return `${spellName(a.spellId)} ready`;
    case 'spellCanCast': return `${spellName(a.spellId)} castable`;
    case 'spellCastTime': return `${spellName(a.spellId)} cast time`;
    case 'spellGcdHastedDuration': return 'a global cooldown';
    case 'spellIsCasting': return `casting ${spellName(a.spellId)}`;
    case 'autoTimeSinceLast': return 'time since your last swing';
    case 'gcdIsReady': return 'global cooldown ready';
    case 'gcdTimeToReady': return 'global cooldown ready in';
    case 'inputDelay': return 'reaction time';
    case 'auraIsActive': case 'auraIsActiveWithReactionTime': return `${spellName(a.auraId)} up`;
    case 'auraIsInactive': case 'auraIsInactiveWithReactionTime': return `${spellName(a.auraId)} not up`;
    case 'auraRemainingTime': return `${spellName(a.auraId)} time left`;
    case 'auraNumStacks': return `${spellName(a.auraId)} stacks`;
    case 'dotIsActive': return `${spellName(a.spellId)} up`;
    case 'dotRemainingTime': return `${spellName(a.spellId)} time left`;
    default: return null; // actionGroupUsed, auraIsKnown, talentIsKnown...: setup, not a reason
  }
}

// The trail that picked an action in words: "Sunder Armor: Refresh — Sunder Armor time left ≤ 10 s".
export function explain(trail) {
  if (!trail) return '';
  const groups = trail.filter((x) => x.group).map((x) => x.group);
  const conds = trail.map((x) => (x.cond ? describe(x.cond) : x.text || null)).filter(Boolean);
  const where = groups.length ? groups[groups.length - 1] : '';
  const because = conds.length ? conds.join('; ') : 'first castable line of the priority list';
  return where ? `${where} — ${because}` : because;
}
