// What the results work out from a fight's log (no drawing here, results.js does that): what each ability set off, its
// damage per resource, the cycles of its DoT, and the APL suggestions. The log's events say which cast set them off
// (by) and through which proc (via), see engine/unit.js emit. A report from before those were kept has none of it, and
// an NPC's report has no log at all: the tables then show what the fight's totals alone can say.

// Spells that are one spell to the sim (a paladin's Swift Judgement is another Judgement): their casts count together.
export const CAST_GROUPS = { swiftJudgement: 'judgement' };
export const castGroup = (id) => CAST_GROUPS[id] || id;
// Abilities that take the next main-hand swing's place, so what they add is less than their damage.
const REPLACES_SWING = new Set(['heroicStrike', 'cleave', 'maul', 'raptorStrike']);
// Hits that come with a cast but are not its own.
const NOT_ITS_OWN = new Set(['windfury', 'extra', 'sweepingStrikes', 'touchOfTheGrave']);
const isProcKey = (key) => NOT_ITS_OWN.has(key) || /proc/i.test(key);
const MISSED = new Set(['miss', 'dodge', 'parry', 'resist']);

const SHORTLY = 3;       // seconds before a shortfall that a cast counts as having spent its rage
const MIN_WAIT = 0.2;    // a shortfall this short is the reaction time, not a shortfall
const MIN_LINKED = 2;    // casts in the way, and their share of the ability's casts, before it is worth saying
const MIN_SHARE = 0.15;
const MIN_MAIN_CASTS = 3; // a main ability the fight hardly casts is not what the rage is for (Whirlwind for some builds)
const WASTE_SHARE = 0.05; // of everything gained
// What the rage is most often suspected of going to: always said, even when there is nothing to say.
const SUSPECTS = new Set(['hamstring', 'heroicStrike', 'overpower', 'rend']);

const blank = () => ({ n: 0, damage: 0, rage: 0, auras: {} });

// By ability: what it refunded, and what it set off, split into the ability itself, the Windfury attacks it procced and
// the other procs (extra attacks, item hits): { refunded, self, wf, other } with each { n, damage, rage, auras }.
export function castImpact(log) {
  const out = {};
  // Only what it spends counts as given back: a bear's Maul spends rage, its Judgement of Wisdom gives mana.
  const spends = {};
  for (const ev of log || []) if (ev.type === 'spend') spends[castGroup(ev.id)] = ev.resource || 'rage';
  for (const ev of log || []) {
    if (!ev.by) continue;
    if (ev.type === 'rage' && spends[castGroup(ev.by)] && (ev.resource || 'rage') !== spends[castGroup(ev.by)]) continue;
    const im = out[castGroup(ev.by)] ||= { refunded: 0, self: blank(), wf: blank(), other: blank() };
    const part = ev.via === 'wf' || ev.key === 'windfury' ? im.wf : ev.via || (ev.key && isProcKey(ev.key)) ? im.other : im.self;
    if (ev.type === 'damage') {
      part.n++;
      part.damage += ev.amount || 0;
    } else if (ev.type === 'rage') {
      if (ev.source === 'refund') im.refunded += ev.amount;
      else part.rage += ev.amount;
    } else if (ev.type === 'aura') {
      const name = ev.name || ev.id;
      part.auras[name] = (part.auras[name] || 0) + 1;
    }
  }
  return out;
}

// The meter rows that are an ability's own: its key, its other hand, its DoT, its seal's hits, a judgement of its seal.
function ownerOf(key, m, ids, nameOf) {
  for (const suffix of ['', 'Oh', 'Dot', 'Proc']) {
    if (suffix ? key.endsWith(suffix) && ids.has(key.slice(0, -suffix.length)) : ids.has(key)) return suffix ? key.slice(0, -suffix.length) : key;
  }
  const name = String(m.name);
  if (ids.has('judgement') && /^Judgement of /.test(name)) return 'judgement';
  for (const id of ids) {
    const n = nameOf(id);
    if (name === n || name.startsWith(`${n} (`)) return id;
  }
  return null;
}

// Damage per point of the resource, ability by ability: [{ id, casts, spent, refunded, net, damage, per, back,
// procDamage, perAll }] (per: its own damage for what it cost, refunds taken off; perAll: with what it set off and the
// resource that gave back; Infinity when that gave back all it cost), and the damage nothing was spent on (swings, procs,
// Deep Wounds), which with the rows makes the fight's total. A row that spends nothing has no number to give. What takes
// a swing's place (Heroic Strike, Cleave) has that swing taken off both numbers (swingDamage, swingRage: all its casts'),
// its damage column left whole so the total still adds up; rawPer is what it reads without that.
export function resourceRows(f, log, nameOf) {
  const im = castImpact(log);
  const swing = averageSwing(f, log);
  const spent = {};
  for (const [id, v] of Object.entries(f.stats.rageSpent || {})) {
    if (id !== 'Stance change (lost)' && id !== 'other' && v > 0) spent[castGroup(id)] = (spent[castGroup(id)] || 0) + v;
  }
  const casts = {};
  for (const c of f.stats.casts || []) casts[castGroup(c.id)] = (casts[castGroup(c.id)] || 0) + 1;
  const ids = new Set(Object.keys(spent));
  const damage = {};
  let free = 0;
  for (const [key, m] of Object.entries(f.meter || {})) {
    const owner = ownerOf(key, m, ids, nameOf);
    if (owner) damage[owner] = (damage[owner] || 0) + m.damage;
    else free += m.damage;
  }
  const rows = [...ids].map((id) => {
    const i = im[id] || { refunded: 0, self: blank(), wf: blank(), other: blank() };
    const net = spent[id] - i.refunded;
    const back = i.self.rage + i.wf.rage + i.other.rage;
    const procDamage = i.wf.damage + i.other.damage;
    const dmg = damage[id] || 0;
    const n = casts[id] || 0;
    const sw = swing && REPLACES_SWING.has(id) ? swing : null;
    const swingDamage = sw ? n * sw.damage : 0;
    const swingRage = sw ? n * sw.rage : 0;
    const cost = net + swingRage;
    // All in, the swing's own Windfury goes too: a white swing that lands rolls for it as well.
    const after = cost - back + (sw ? n * sw.wfRage : 0);
    const allIn = dmg + procDamage - swingDamage - (sw ? n * sw.wfDamage : 0);
    return { id, casts: n, spent: spent[id], refunded: i.refunded, net, damage: dmg, swingDamage, swingRage, rawPer: net > 0 ? dmg / net : null,
      per: cost > 0 ? (dmg - swingDamage) / cost : null, back, procDamage, perAll: after > 0 ? allIn / after : cost > 0 ? Infinity : null, impact: i };
  });
  return { rows: rows.sort((a, b) => (b.per ?? -1) - (a.per ?? -1)), free };
}

// The cycles of each DoT you cast: a cycle runs from a cast that lands to the next one on that target. It is complete
// when it ticked to its end, clipped when the next cast landed with ticks still to come (those ticks are lost), cut when
// the fight ended on it. A cast that missed starts nothing: the running cycle goes on. The ticks are the damage with no
// cast behind it under the ability's own key. Channels, totems and traps are no cycle (names[id].noCycle).
export function dotCycles(f, log) {
  const castIds = new Set((log || []).filter((ev) => ev.type === 'cast').map((ev) => ev.id));
  const owner = (key) => (castIds.has(key) ? key : key.endsWith('Dot') && castIds.has(key.slice(0, -3)) ? key.slice(0, -3) : null);
  const ticking = new Set();
  for (const ev of log || []) {
    if (ev.type !== 'damage' || ev.by || !(ev.amount > 0)) continue;
    const id = owner(ev.key);
    // Something that spends nothing is no cycle to pay for (Retribution Aura's hits back).
    if (id && (f.stats.rageSpent || {})[id] > 0 && !(f.names && f.names[id] && f.names[id].noCycle)) ticking.add(id);
  }
  const cycles = {};
  const running = {}; // `${id}|${target}` -> the cycle ticking there
  const latest = {};
  for (const ev of log || []) {
    if (ev.type === 'cast' && ticking.has(ev.id)) {
      const c = { id: ev.id, on: ev.on ?? 0, t: ev.t, ticks: 0, damage: 0, tickDamage: 0, ticksAt: [], left: ev.dotLeft || 0, prev: running[`${ev.id}|${ev.on ?? 0}`] || null };
      (cycles[ev.id] ||= []).push(c);
      running[`${ev.id}|${c.on}`] = c;
      latest[ev.id] = c;
    } else if (ev.type === 'damage') {
      const id = owner(ev.key);
      if (!id || !ticking.has(id)) continue;
      const c = running[`${id}|${ev.target}`] || latest[id];
      if (!c) continue;
      if (MISSED.has(ev.outcome)) {
        // The cast that just began missed: the one before it goes on ticking. A tick that misses (a totem's bolt) is just that.
        const missed = latest[id];
        if (missed.ticks > 0 || missed.damage > 0) continue;
        missed.missed = true;
        if (missed.prev) running[`${id}|${missed.on}`] = missed.prev;
        else delete running[`${id}|${missed.on}`];
        latest[id] = missed.prev || missed;
      } else {
        c.damage += ev.amount || 0;
        if (!ev.by && ev.target === c.on) { c.ticks++; c.ticksAt.push(ev.t); c.tickDamage += ev.amount || 0; }
      }
    }
  }
  // One "tick" a cycle is a spell's travel time, not a DoT.
  return Object.entries(cycles).map(([id, all]) => cycleRow(f, id, all)).filter((d) => d.ticksFull >= 2);
}

function cycleRow(f, id, all) {
  const landed = all.filter((c) => !c.missed);
  const full = Math.max(0, ...landed.map((c) => c.ticks));
  const gaps = landed.flatMap((c) => c.ticksAt.slice(1).map((t, i) => t - c.ticksAt[i])).filter((g) => g > 0.05);
  const period = gaps.length ? Math.min(...gaps) : 0;
  const counts = { complete: 0, clipped: 0, cut: 0, lostTicks: 0, lostDamage: 0 };
  const complete = [];
  landed.forEach((c, i) => {
    const next = landed.slice(i + 1).find((o) => o.on === c.on);
    if (next && next.left > 0 && c.ticks < full) {
      counts.clipped++;
      const lost = period ? Math.max(1, Math.ceil(next.left / period - 1e-3)) : full - c.ticks;
      counts.lostTicks += lost;
      if (c.ticks) counts.lostDamage += lost * (c.tickDamage / c.ticks);
    } else if (!next && c.ticks < full) counts.cut++;
    else { counts.complete++; complete.push(c); }
  });
  const spent = (f.stats.rageSpent || {})[id] || 0;
  const cost = all.length ? spent / all.length : 0;
  const perCycle = complete.length ? complete.reduce((a, c) => a + c.damage, 0) / complete.length : null;
  return { id, casts: all.length, landed: landed.length, missed: all.length - landed.length, ...counts, ticksFull: full, cost, perCycle,
    per: perCycle != null && cost > 0 ? perCycle / cost : null };
}

// One cast's rage as the log has it: what it spent and what it gave back in that same moment.
function spendsOf(log) {
  const out = [];
  const open = {};
  for (const ev of log || []) {
    if (ev.type === 'spend') {
      const last = open[ev.id];
      if (last && last.t === ev.t) { last.spent += ev.amount; last.after = ev.total; continue; }
      open[ev.id] = { id: ev.id, t: ev.t, spent: ev.amount, after: ev.total, back: 0, resource: ev.resource || 'rage' };
      out.push(open[ev.id]);
    } else if (ev.type === 'rage' && ev.by && open[ev.by] && open[ev.by].t === ev.t && (ev.resource || 'rage') === open[ev.by].resource) open[ev.by].back += ev.amount;
  }
  return out;
}

// What a main-hand swing is worth on average in this fight, its misses and glances in the average: { damage, rage,
// wfDamage, wfRage } (the Windfury attacks swings procced). Without a log the rage comes from the totals and Windfury
// is not known; nor is a proc shared with the off hand (an item's, Unbridled Wrath), which the log cannot tell apart.
function averageSwing(f, log) {
  const mh = (f.meter || {}).mh;
  if (!mh || !mh.count) return null;
  const out = { damage: mh.damage / mh.count, rage: 0, wfDamage: 0, wfRage: 0 };
  if (!(log && log.length)) {
    const wf = (f.meter || {}).windfury;
    out.rage = ((f.stats.rageGain || {})['Main Hand'] || 0) / (mh.count + (wf ? wf.count : 0));
    return out;
  }
  for (const ev of log) {
    if (ev.by) continue;
    if (ev.type === 'rage' && ev.source === 'Main Hand' && !ev.via) out.rage += ev.amount / mh.count;
    else if (ev.type === 'rage' && ev.via === 'wf' && (ev.resource || 'rage') === 'rage') out.wfRage += ev.amount / mh.count;
    else if (ev.type === 'damage' && ev.key === 'windfury') out.wfDamage += (ev.amount || 0) / mh.count;
  }
  return out;
}

const num = (n, d = 0) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const avg = (list, fn) => (list.length ? list.reduce((a, x) => a + fn(x), 0) / list.length : 0);
const orList = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`);

// Things in this fight that the APL could perhaps do better. Only what the log recorded; the APL stays the basis, so
// these are things to try on the sim, never verdicts. { context: [text], items: [{ id, title, evidence: [text], idea }],
// checked: [text] } (context: what the fight's rage looked like; checked: what was looked at and passed).
export function aplSuggestions(f, log, nameOf, meta = {}) {
  const out = { context: [], items: [], checked: [] };
  if (!(log && log.length)) return out;
  const res = (f.resource || 'Rage').toLowerCase();
  const { rows } = resourceRows(f, log, nameOf);
  const rowOf = Object.fromEntries(rows.map((r) => [r.id, r]));
  const value = (r) => (r ? r.perAll ?? r.per : null);
  const per = (v) => (v == null ? 'nothing to compare' : v === Infinity ? 'free (it gave back what it cost)' : num(v, 1));

  shortfalls(f, log, nameOf, { res, rowOf, value, per, out, meta });
  // Rage a stance swap threw away is rage these abilities did not have.
  if (f.review && f.review.stanceRageLost >= 1) out.context.push(`Stance swaps lost ${num(f.review.stanceRageLost, 1)} ${res} above Tactical Mastery's keep, on ${f.review.stanceSwapsLost} swaps.`);

  // Everything gained that went over the cap: the opposite of being short. Not mana: a full bar is where it should be.
  const gained = Object.values(f.stats.rageGain || {}).reduce((a, b) => a + b, 0);
  const wasted = (f.review && (f.review.rageWasted ?? f.review.energyWasted)) || 0;
  if (gained > 0 && wasted / gained >= WASTE_SHARE) {
    out.items.push({ id: 'waste', title: `${f.resource || 'Rage'} went over the cap`, evidence: [`${num(wasted, 1)} of ${num(gained, 1)} ${res} gained was lost at the cap (${((wasted / gained) * 100).toFixed(1)}%).`],
      idea: `The opposite of being short: at those moments the APL could spend sooner, on what it holds back.` });
  }

  // DoTs refreshed with ticks still to come.
  for (const d of dotCycles(f, log)) {
    if (!d.clipped) continue;
    out.items.push({ id: d.id, title: `${nameOf(d.id)} was clipped`, evidence: [`${d.clipped} of ${d.landed} cycles were refreshed early, ${d.lostTicks} tick${d.lostTicks === 1 ? '' : 's'} lost (about ${num(d.lostDamage)} damage).`],
      idea: `Its refresh condition in the APL could wait for the last tick.` });
  }
  return out;
}

// The main abilities that sat ready without the rage, and the casts that spent it just before.
function shortfalls(f, log, nameOf, { res, rowOf, value, per, out, meta }) {
  const casts = {};
  for (const c of f.stats.casts || []) casts[c.id] = (casts[c.id] || 0) + 1;
  const short = (f.stats.short || []).filter((w) => w.e - w.s >= MIN_WAIT && (casts[w.id] || 0) >= MIN_MAIN_CASTS);
  const mains = [...new Set(short.map((w) => w.id))];
  for (const id of mains) {
    const own = short.filter((w) => w.id === id);
    out.context.push(`${nameOf(id)} sat off its cooldown without the ${res} ${own.length} time${own.length === 1 ? '' : 's'}, ${num(own.reduce((a, w) => a + w.e - w.s, 0), 1)} s in all, ${num(avg(own, (w) => w.cost - w.rage), 1)} ${res} short on average.`);
  }
  if (!mains.length) { if (f.stats.short) out.checked.push(`${res[0].toUpperCase()}${res.slice(1)} was there for your main abilities: no long wait for it.`); return; }
  const mainList = orList(mains.map(nameOf));
  // Each cast of anything else that did damage, against the first shortfall it came shortly before or during.
  const spends = spendsOf(log).filter((c) => !mains.includes(c.id) && rowOf[c.id]);
  const linked = {};
  for (const c of spends) {
    const w = short.filter((o) => o.s - SHORTLY <= c.t && c.t <= o.e).sort((a, b) => a.s - b.s)[0];
    const l = linked[c.id] ||= [];
    if (!w) continue;
    // Without it the swing would have landed: its rage is part of what the cast cost.
    const net = c.spent - c.back + (rowOf[c.id].casts ? rowOf[c.id].swingRage / rowOf[c.id].casts : 0);
    const rageThen = c.t < w.s ? w.rage : c.after + c.back;
    l.push({ w, net, short: w.cost - rageThen, enough: net >= w.cost - rageThen, during: c.t >= w.s });
  }
  const best = mains.map((id) => rowOf[id]).filter(Boolean);
  const bestValue = Math.max(...best.map((r) => value(r) ?? 0));
  const compare = best.map((r) => `${nameOf(r.id)} ${per(value(r))}`).join(', ');
  for (const [id, list] of Object.entries(linked)) {
    const row = rowOf[id];
    const name = nameOf(id);
    const worth = value(row);
    const share = row.casts ? list.length / row.casts : 0;
    if (!list.length && !SUSPECTS.has(id)) continue;
    if (!row.damage && list.length >= MIN_LINKED) {
      out.checked.push(`${name}: ${list.length} of ${row.casts} casts came before a shortfall of ${mainList}. It does no damage of its own, so damage per ${res} cannot weigh it.`);
      continue;
    }
    if (list.length < MIN_LINKED || share < MIN_SHARE) {
      out.checked.push(`${name}: ${list.length} of ${row.casts} casts came before a shortfall of ${mainList}, too few to say anything.`);
      continue;
    }
    if (worth != null && worth >= bestValue) {
      out.checked.push(`${name}: ${list.length} of ${row.casts} casts came before a shortfall, but it does ${per(worth)} damage per ${res}, no less than ${compare}.`);
      continue;
    }
    const enough = list.filter((l) => l.enough).length;
    const sim = meta.simCasts && meta.simCasts[id] != null ? ` The sim casts it ${num(meta.simCasts[id], 1)} times a fight of this length.` : '';
    const evidence = [
      `${list.length} of ${row.casts} casts came within ${SHORTLY} s before ${mainList} was off cooldown without the ${res}, or while it waited (${list.filter((l) => l.during).length} while).${sim}`,
      `It was ${num(avg(list, (l) => l.short), 1)} ${res} short on average and waited ${num(avg(list, (l) => l.w.e - l.w.s), 1)} s. On ${enough} of them, what this cast spent (${num(avg(list, (l) => l.net), 1)} ${res} after what it gave back${row.swingRage ? ', with the rage of the swing it took' : ''}) would have paid for it alone.`,
      `Damage per ${res}: ${name} ${per(row.per)}${row.perAll != null && row.perAll !== row.per ? ` (${per(row.perAll)} with what it procced)` : ''}, against ${compare}.`,
    ];
    if (row.swingDamage) evidence.push(`Those numbers have the main-hand swing it replaces taken off: ${num(row.swingDamage / row.casts)} damage and ${num(row.swingRage / row.casts, 1)} ${res} a cast. Without that it would read ${per(row.rawPer)}.`);
    out.items.push({ id, title: `${name} may be spending what ${mainList} needs`, evidence,
      idea: `Worth trying on the sim: ${name} only when the ${res} left after it still pays for the next ${mainList}.` });
  }
}
