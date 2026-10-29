// Rotation helper: runs a wowsims APL (the player.rotation of a wowsims export, see js/data/fury-apl.js)
// against the live fight and says which buttons to press.
//
// wowsims casts the first action in the priority list that can be cast, then looks again. The helper
// does the same on a copy of the parts of the state an action changes (the class's: stance, rage and a queued
// swing for a warrior; energy and combo points for a rogue):
//   1. right now: off-GCD actions are collected ("now", blue) until a GCD ability comes up or nothing does;
//   2. then at the moment the GCD is ready, and a little later if nothing is castable yet, for the next
//      GCD ability ("next", green). Stance swaps found on the way are shown too.
// Values that depend on time (cooldowns, aura and dot timers, a rogue's energy) are read at that moment; rage is
// not predicted. Actions wowsims has that the trainer does not model are skipped. What is class-specific comes from
// the class's apl hooks (js/classes/<class>/apl.js).
import { DB } from './data/db.js';
import { classOf } from './classes/index.js';

const SLACK = 0.05;
// A strict sequence of spells waits for the GCD (wowsims apl_actions_sequences.go: within its 400 ms queue window, but
// wowsims looks again only when the GCD is up, while the helper looks all the time).
const SEQUENCE_GCD_WINDOW = SLACK;
const INPUT_DELAY = 0.1;
const LOOKAHEAD = 3; // seconds the helper looks ahead for the next GCD ability
const STEP = 0.25;

const warned = new Set();
const warnOnce = (what) => { if (!warned.has(what)) { warned.add(what); console.info(`Rotation helper: "${what}" is not modelled; it counts as false.`); } };

const hooksOf = (f) => classOf(f.c.classId).apl;
// The class whose names "why" uses (the last fight the helper looked at).
let naming = classOf('warrior');

// "1.5s", "100ms", "40", "40%" (0.4, as wowsims reads a percent), "1.9m", "true" -> number.
function constValue(v) {
  const s = String(v).trim();
  if (s === 'true') return 1;
  if (s === 'false') return 0;
  const m = /^(-?[\d.]+)\s*(ms|s|m|%)?$/.exec(s);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return m[2] === 'ms' ? n / 1000 : m[2] === 'm' ? n * 60 : m[2] === '%' ? n / 100 : n;
}

const CMP = {
  OpEq: (a, b) => Math.abs(a - b) < 1e-6, OpNe: (a, b) => Math.abs(a - b) >= 1e-6,
  OpLt: (a, b) => a < b, OpLe: (a, b) => a <= b, OpGt: (a, b) => a > b, OpGe: (a, b) => a >= b,
};
const MATH = { OpAdd: (a, b) => a + b, OpSub: (a, b) => a - b, OpMul: (a, b) => a * b, OpDiv: (a, b) => (b ? a / b : 0) };
const NONE = { active: false, remaining: 0, stacks: 0 };

// The rotation of a wowsims export (full export, player object or rotation), or null if it has no APL.
export function aplFrom(json) {
  if (!json || typeof json !== 'object') return null;
  const rot = json.priorityList ? json : json.rotation || (json.player && json.player.rotation);
  return rot && Array.isArray(rot.priorityList) && rot.priorityList.length ? rot : null;
}

// An APL with some of its value variables set (the wowsims simple rotation's switches, e.g. "Use Backstab").
export function withVariables(apl, values) {
  return { ...apl, valueVariables: (apl.valueVariables || []).map((v) => (v.name in values ? { name: v.name, value: { const: { val: String(values[v.name]) } } } : v)) };
}

class Evaluation {
  // opts: { items: {itemId: actionId} }
  constructor(f, apl, opts) {
    this.f = f;
    this.k = hooksOf(f);
    this.A = f.A;
    this.apl = apl;
    this.items = { ...(this.k.items || {}), ...(opts.items || {}) };
    this.groups = Object.fromEntries((apl.groups || []).map((g) => [g.name, g]));
    this.vars = Object.fromEntries((apl.valueVariables || []).map((v) => [v.name, v.value]));
    // A group is "used" when a shown priority list entry refers to it (wowsims actionGroupUsed).
    this.used = new Set(apl.priorityList.filter((e) => !e.hide && e.action && e.action.groupReference).map((e) => e.action.groupReference.groupName));
    this.dt = 0;
    this.st = this.k.state(f);
    this.done = new Set();
    this.cooldowns = {}; // abilities used in the look-ahead: cooldown from now
    this.gcdBusy = false;
    this.depth = 0;
    this.trail = []; // groups and conditions on the way to the action being looked at, for "why"
  }

  // Fight-time conditions (time left, execute phase, multipleCdUsages) are read when the GCD is ready, not at
  // the later look-ahead steps, so a cooldown held for the end is not shown seconds before it is due.
  get fightDt() { return Math.min(this.dt, this.condDt ?? this.dt); }

  resolve(spell) {
    if (!spell) return null;
    if (spell.spellId) return this.k.spells[spell.spellId] || null;
    if (spell.itemId) return this.items[spell.itemId] || null;
    if (spell.otherId) return (this.k.other || {})[spell.otherId] || null;
    return null;
  }

  timeToReady(id) {
    const ab = id && this.A[id];
    if (!ab || (ab.talent && !this.f.tal[ab.talent])) return Infinity;
    if (id in this.cooldowns) return Math.max(0, this.cooldowns[id] - this.dt);
    return Math.max(0, this.f.cdLeft(id) - this.dt);
  }

  // Is the ability known: talented, a racial your race has, an item you carry?
  isKnown(id) {
    const f = this.f;
    const ab = id && this.A[id];
    if (!ab) return false;
    if (ab.talent && !f.tal[ab.talent]) return false;
    if (ab.racial) return !!f.racial.active;
    if (ab.item) return !!f.c.uses[ab.item];
    return true;
  }

  // Can the ability be used at this moment (now + dt), in the copied state? Range and facing are ignored: the
  // helper says what to press, getting in range is up to you.
  canCast(id) {
    const f = this.f;
    const ab = id && this.A[id];
    if (!ab || this.done.has(id) || (ab.gcd && this.gcdBusy)) return false;
    if (this.k.canCast && !this.k.canCast(f, this.st, id)) return false;
    const { geo } = f;
    f.geo = { ...geo, dist: geo.dist.map(() => 0), facing: true };
    let reason;
    try { reason = this.k.withState(f, this.st, this.dt, () => f.blocker(id)); } finally { f.geo = geo; }
    if (reason === 'Ability is not ready yet') {
      const wait = f.readyIn(id); // GCD, cooldown and a cast in progress
      if (wait <= this.dt + SLACK && this.k.afford(f, this.st, this.dt, id)) reason = null;
    }
    return !reason;
  }

  aura(a) {
    const f = this.f;
    const sid = a.auraId && a.auraId.spellId;
    const own = this.k.aura && this.k.aura(this, sid, a);
    if (own) return own;
    if (a.sourceUnit && a.sourceUnit.type === 'CurrentTarget') {
      const end = this.k.targetAura ? this.k.targetAura(this, sid) : null;
      if (end == null) { warnOnce(`target aura ${sid}`); return NONE; }
      return this.endToAura(end);
    }
    const id = this.k.auras[sid];
    if (!id) {
      // A target debuff named without its source (Rend, Thunder Clap) reads the target.
      const end = this.k.targetAura ? this.k.targetAura(this, sid) : null;
      if (end != null) return this.endToAura(end);
      warnOnce(`aura ${sid}`);
      return NONE;
    }
    const x = f.auras[id];
    const rem = x ? x.end - f.t - this.dt : 0;
    return rem > 0 ? { active: true, remaining: rem, stacks: x.stacks || 1 } : NONE;
  }

  // A target aura from the class hook: when it ends, or { end, stacks }.
  endToAura(x) {
    const end = typeof x === 'object' ? x.end : x;
    const rem = (end || 0) - this.f.t - this.dt;
    return rem > 0 ? { active: true, remaining: rem, stacks: typeof x === 'object' ? x.stacks : 1 } : NONE;
  }

  // auraIsKnown: buffs from the raid setup and talents.
  known(a) {
    const f = this.f;
    const sid = a.auraId && a.auraId.spellId;
    if (sid === 10612) return !!f.c.windfuryAp; // Windfury Totem
    const own = this.k.known && this.k.known(this, sid, a);
    if (own !== undefined) return own;
    if (this.k.talents[sid]) return f.tal[this.k.talents[sid]] > 0;
    warnOnce(`known aura ${sid}`);
    return false;
  }

  dotRemaining(spell) {
    const end = spell && this.k.dot ? this.k.dot(this, spell.spellId) : null;
    if (end == null) { warnOnce(`dot ${spell && spell.spellId}`); return 0; }
    return Math.max(0, end - this.f.t - this.dt);
  }

  // Cooldown and buff duration (seconds) of an action, or null when it has no self buff.
  cdAndBuff(id) {
    const f = this.f;
    const ab = this.A[id];
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
    const own = this.k.value && this.k.value(this, kind, a);
    if (own !== undefined) return own;
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
      case 'spellIsKnown': return this.isKnown(this.resolve(a.spellId)) ? 1 : 0;
      case 'spellCurrentCost': { const id = this.resolve(a.spellId); return id ? f.cost(id) : 0; }
      case 'spellFullCooldown': { const id = this.resolve(a.spellId); const ab = id && this.A[id]; return ab && ab.cd ? f.cooldownFor(id) : 0; }
      case 'spellGcdHastedDuration': return a.spellId ? f.gcdFor(this.resolve(a.spellId)) : 1.5;
      case 'spellCastTime': return f.castTime(this.resolve(a.spellId));
      case 'spellTravelTime': return 0;
      case 'auraDuration': return 0;
      case 'spellIsCasting': return f.casting && f.casting.id === this.resolve(a.spellId) ? 1 : 0;
      case 'autoTimeSinceLast': return Math.max(0, f.t + this.dt - f.lastMhSwing); // MainHandAuto
      case 'autoTimeToNext': return Math.max(0, f.mhNext - f.t - this.dt);
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
      // wowsims APLValueAuraShouldRefresh: the aura is missing or runs out within maxOverlap.
      case 'auraShouldRefresh': { const x = this.aura(a); return !x.active || x.remaining <= this.value(a.maxOverlap) ? 1 : 0; }
      case 'auraIsKnown': return this.known(a) ? 1 : 0;
      case 'currentHealthPercent': return f.maxHealth > 0 ? f.health / f.maxHealth : 1;
      // The off hand's swing time: 0 without an off-hand weapon (a shield), which is how the Prot APL tells a shield.
      case 'autoSwingTime': return a.autoType === 'OffHand' ? (f.dual ? f.c.oh.speed / f.hasteMult() : 0) : f.c.mh.speed / f.hasteMult();
      case 'dotIsActive': return this.dotRemaining(a.spellId) > 0 ? 1 : 0;
      case 'dotRemainingTime': return this.dotRemaining(a.spellId);
      case 'talentIsKnown': return f.tal[this.k.talents[a.talentId && a.talentId.spellId]] > 0 ? 1 : 0;
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
      if (a.castSpell || a.channelSpell) {
        const id = this.resolve((a.castSpell || a.channelSpell).spellId);
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
      // A strict sequence starts with its first action, when that can be cast and (if it casts spells) the GCD is
      // ready within the spell queue window; once started it runs to its end (pick), as wowsims has it
      // (apl_actions_sequences.go: Inner Focus waits for the Mind Flay after it).
      if (a.strictSequence) {
        const actions = a.strictSequence.actions || [];
        if (actions.some((x) => x.castSpell) && (this.gcdBusy || this.f.gcdLeft() - this.dt > SEQUENCE_GCD_WINDOW)) return null;
        const first = actions[0];
        const r = first ? this.action(first) : null;
        if (r && r.id && this.dt === 0) this.f.aplSeq = { seq: a.strictSequence, idx: 0, casts: this.f.stats.casts.length, until: this.f.t + 6 };
        return r;
      }
      if (a.castAllStatBuffCooldowns || a.autocastOtherCooldowns) {
        // wowsims' major cooldowns: the trinkets, and for autocastOtherCooldowns the class's own (Arcane Power, a
        // mana gem...) that the APL does not cast by name.
        const extra = a.autocastOtherCooldowns && this.k.autocast ? this.k.autocast(this).filter((x) => !this.referenced().has(x)) : [];
        const id = ['trinket1', 'trinket2', ...extra].find((t) => this.canCast(t));
        return id ? { id, why: [...this.trail, { text: 'stat trinkets go out when ready' }] } : null;
      }
    } finally { if (a.condition) this.trail.pop(); }
    if (a.wait) {
      const d = this.value(a.wait.duration);
      return d > 0 ? { wait: d } : null;
    }
    if (a.waitUntil) return this.truthy(a.waitUntil.condition) ? null : { wait: STEP };
    return null;
  }

  // A strict sequence under way: its next action, until it has run (or 6 s have passed).
  sequenceNext() {
    const f = this.f;
    const s = f.aplSeq;
    if (!s || f.t > s.until) { f.aplSeq = null; return null; }
    const actions = s.seq.actions || [];
    // The action it waits for was cast: move on.
    while (f.stats.casts.length > s.casts && s.idx < actions.length) {
      const want = this.resolve(((actions[s.idx] || {}).castSpell || {}).spellId);
      const cast = f.stats.casts[s.casts++];
      if (cast.id === want) s.idx++;
    }
    if (s.idx >= actions.length) { f.aplSeq = null; return null; }
    const id = this.resolve(((actions[s.idx] || {}).castSpell || {}).spellId);
    if (!id) { f.aplSeq = null; return null; }
    return this.canCast(id) ? { id, why: [{ text: 'a strict sequence runs to its end' }] } : { wait: STEP };
  }

  pick() {
    const seq = this.sequenceNext();
    if (seq) return seq;
    for (const e of this.apl.priorityList) {
      if (e.hide) continue;
      const r = this.action(e.action);
      if (r) return r;
    }
    return null;
  }

  // The actions the APL names anywhere (they are not autocast).
  referenced() {
    if (!this.refs) {
      this.refs = new Set();
      for (const m of JSON.stringify(this.apl).matchAll(/"spellId":(\d+)/g)) { const id = this.k.spells[m[1]]; if (id) this.refs.add(id); }
    }
    return this.refs;
  }

  // The APL's pre-pull actions in the order wowsims casts them (by their doAtValue).
  prepullIds() {
    const at = (p) => constValue(p.doAtValue && p.doAtValue.const ? p.doAtValue.const.val : 0);
    return [...(this.apl.prepullActions || [])].sort((a, b) => at(a) - at(b))
      .map((p) => (p.action && p.action.castSpell ? this.resolve(p.action.castSpell.spellId) : null)).filter(Boolean);
  }

  // After the GCD ability: its cost is spent and the GCD runs, so only off-GCD actions can follow.
  castGcd(id) {
    this.k.castGcd(this.f, this.st, id);
    this.done.add(id);
    this.gcdBusy = true;
    this.cooldowns[id] = this.f.cooldownFor(id);
  }

  // What an off-GCD action changes for the rest of the look-ahead.
  apply(id) {
    if (!this.k.apply(this.f, this.st, id, this.done)) this.done.add(id);
  }
}

// Returns { next, now }: next is the GCD ability to press when the GCD is up (or null), now a list of
// off-GCD actions to press right away. apl: a wowsims rotation (null: the class's default). opts.dance: Set of
// abilities whose button is a stance-dance macro; opts.items: { itemId: 'trinket1' | 'trinket2' | 'explosive' }.
export function suggest(f, apl, opts = {}) {
  const dance = opts.dance || new Set();
  if (!f || f.over) return { next: null, now: [] };
  const k = hooksOf(f);
  naming = classOf(f.c.classId);
  apl = apl || k.defaultApl;
  const ev = new Evaluation(f, apl, opts);
  if (!f.started && k.beforePull) {
    const pre = k.beforePull(f, apl, ev, dance);
    if (pre) return { ...pre, pressNow: true };
  }

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
    if (f.A[r.id].gcd) {
      if (next) break;
      next = r.id;
      ev.castGcd(r.id);
      continue;
    }
    now.push(r.id);
    ev.apply(r.id);
  }
  if (next) return finish(k, next, now, dance, why, 0);

  // 2. When the GCD is ready, then a little later until a GCD ability comes up.
  const ready = Math.max(f.gcdLeft(), waitUntil);
  ev.condDt = ready;
  for (ev.dt = ready; !next && ev.dt <= ready + LOOKAHEAD; ev.dt += STEP) {
    for (let i = 0; i < 8; i++) {
      const r = ev.pick();
      if (!r || r.wait) break;
      if (f.A[r.id].gcd) { next = r.id; why[r.id] = r.why; at = ev.dt; break; }
      // Some off-GCD actions due when the GCD is up are shown now (a warrior's stance swap); the others show when due.
      if (k.showEarly && k.showEarly(r.id) && ev.dt <= ready + SLACK && !now.includes(r.id)) { now.push(r.id); why[r.id] = why[r.id] || r.why; }
      ev.apply(r.id);
    }
  }

  return finish(k, next, now, dance, why, at);
}

// The APL's pre-pull actions in time order, before the fight starts, as wowsims casts them at their doAtValue:
// e.g. Berserker Rage, Bloodrage, Battle Shout, a stance, then the Charge or Intercept of "Pre-pull: Move", which
// pulls; a rogue's Blade Flurry, Premeditation and Stealth. For the bots (ghost and score); f must be in Charge range
// while this runs.
export function runPrepull(f, apl, opts = {}) {
  apl = apl || hooksOf(f).defaultApl;
  const at = (p) => constValue(p.doAtValue && p.doAtValue.const ? p.doAtValue.const.val : 0);
  for (const p of [...(apl.prepullActions || [])].sort((a, b) => at(a) - at(b))) {
    if (f.started) break;
    const ev = new Evaluation(f, apl, opts); // fresh, so conditions see the stance after an earlier swap
    const a = p.action || {};
    let id = null;
    if (a.castSpell || a.channelSpell) id = ev.resolve((a.castSpell || a.channelSpell).spellId);
    else if (a.groupReference && ev.groups[a.groupReference.groupName]) {
      for (const x of ev.groups[a.groupReference.groupName].actions || []) {
        const xa = x.action || {};
        if (!xa.castSpell || (xa.condition && !ev.truthy(xa.condition))) continue;
        id = ev.resolve(xa.castSpell.spellId);
        if (id) break;
      }
    }
    if (!id || (id === 'battleShout' && f.aura('battleShout')) || (id === 'stealth' && f.aura('stealth'))) continue; // already up
    f.press(id);
  }
}

// Returns { next, now, why, at }: why maps an action id to the APL trail that picked it; at is when the next
// GCD ability is due (seconds from now).
// pressNow: a bot presses next now. A class whose look-ahead predicts its resource (strictTiming) waits until next
// is due, or it would refresh a buff the look-ahead sees running out seconds from now; the warrior's bots keep the
// press-when-the-GCD-is-up they are calibrated with.
function finish(k, next, now, dance, why = {}, at = 0) {
  if (k.finish) k.finish(next, now, dance);
  return { next, now, why, at, pressNow: !k.strictTiming || at <= SLACK };
}

// ---- "why": an APL trail in words ----------------------------------------------------------------

const OPS = { OpEq: '=', OpNe: '≠', OpLt: '<', OpLe: '≤', OpGt: '>', OpGe: '≥' };
const spellName = (s) => {
  if (!s) return 'it';
  if (s.otherId === 'OtherActionResourcePotion' || s.otherId === 'OtherActionOffensivePotion') return 'the potion';
  if (s.itemId) return 'the item';
  const k = naming.apl;
  const named = k.auraNames && k.auraNames[s.spellId];
  if (named) return named;
  const id = k.spells[s.spellId] || k.auras[s.spellId];
  const ab = id && naming.data.ABILITIES[id];
  const aura = id && naming.data.AURAS[id];
  return ab ? ab.name : aura ? aura.name : `spell ${s.spellId}`;
};
const secs = (v) => {
  const s = String(v).trim();
  if (/%$/.test(s)) return s;
  const n = constValue(v);
  return /s$/.test(s) ? `${n} s` : String(n);
};

// One APL value or condition in words, or null for parts that say nothing to a player (toggles, talents).
export function describe(v, vars = {}) {
  if (!v) return null;
  const kind = Object.keys(v)[0];
  const a = v[kind] || {};
  const d = (x) => describe(x, vars);
  const named = naming.apl.names && naming.apl.names[kind];
  if (named) return named;
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
    case 'math': {
      const l = d(a.lhs);
      const r = d(a.rhs);
      return l && r ? `${l} ${{ OpAdd: '+', OpSub: '−', OpMul: '×', OpDiv: '/' }[a.op] || a.op} ${r}` : null;
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
    case 'spellCurrentCost': return `${spellName(a.spellId)} cost`;
    case 'spellFullCooldown': return `${spellName(a.spellId)} cooldown`;
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
    case 'auraShouldRefresh': return `${spellName(a.auraId)} running out (${d(a.maxOverlap) || 'soon'})`;
    case 'currentHealthPercent': return 'your health';
    case 'dotIsActive': return `${spellName(a.spellId)} up`;
    case 'dotRemainingTime': return `${spellName(a.spellId)} time left`;
    default: return null; // actionGroupUsed, auraIsKnown, talentIsKnown, spellIsKnown...: setup, not a reason
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
