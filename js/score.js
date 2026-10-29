// Scoring like a Warcraft Logs parse: a percent and the site's colour for it.
//
// WoW Forever launches on 4 November 2026 and its raids on 9 December, so there are no Forever logs to rank
// against yet. Until there are, the reference is the wowsims Forever sim (js/wowsims-sim.js) playing your
// exact setup (gear, buffs, zone, talents, APL, fight length, targets) over about a thousand fights, or, if
// wowsims cannot be reached, the rotation helper's bot over a set of seeded fights. Perfect APL play is what
// the best players get close to, so the sim's median fight is scored 95 (orange), its 90th percentile 99 and
// its best fight 100; lower DPS falls through the colours on a curve shaped like a typical parse spread
// (around 88% of the top for a 50). The reference is a plain list of DPS values, so real ranking data can
// replace it later without changing the scoring.
import { createFight } from './engine/fight.js';
import { runPrepull, suggest } from './apl.js';

// Warcraft Logs parse colours, best first: [lowest percent, colour, name].
export const PARSE_TIERS = [
  [100, '#e5cc80', 'Gold'],
  [99, '#e268a8', 'Pink'],
  [95, '#ff8000', 'Orange'],
  [75, '#a335ee', 'Purple'],
  [50, '#0070ff', 'Blue'],
  [25, '#1eff00', 'Green'],
  [0, '#666666', 'Grey'],
];

export const parseTier = (pct) => PARSE_TIERS.find(([min]) => pct >= min) || PARSE_TIERS[PARSE_TIERS.length - 1];

// The bot's pull: the APL's pre-pull from Charge range (its Charge or Intercept pulls), then in melee range. A tank
// stands in front of the target, as wowsims has it (InFrontOfTarget): its attacks can be parried and blocked.
export function prepullAndPull(f, apl, items) {
  f.geo = { ...f.geo, dist: f.geo.dist.map(() => 10) };
  runPrepull(f, apl, { items });
  if (!f.started) f.start();
  f.geo = { ...f.geo, dist: f.geo.dist.map(() => f.home || 0), inFront: f.geo.inFront.map(() => !!f.o.tank) };
}

// The bot's result: threat per second for a tank spec (opts.metric 'tps'), otherwise DPS.
export const metricOf = (f) => (f.o.metric === 'tps' ? f.tps() : f.dps());

// One bot fight: it presses what the rotation helper suggests, in melee range behind the target.
function botFight(sheet, opts, apl, items, seed) {
  let s = seed >>> 0;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const f = createFight(sheet, opts, rng);
  prepullAndPull(f, apl, items);
  const step = 0.05;
  let t = 0;
  let away = false;
  while (!f.over) {
    // Move windows: out of melee for all of them, as the ghost does (ghost.js).
    if (!!f.moveWindow(f.t) !== away) {
      away = !away;
      f.geo = { ...f.geo, dist: f.geo.dist.map(() => (away ? (f.home ? 40 : 10) : f.home || 0)) };
    }
    const hint = suggest(f, apl, { items });
    for (const id of hint.now) f.press(id);
    if (hint.next && hint.pressNow !== false && f.gcdLeft() <= 0) f.press(hint.next);
    t += step;
    f.advance(Math.min(t, opts.duration));
  }
  return metricOf(f);
}

// The bot's DPS over `runs` seeded fights, sorted. One fight at a time so the page stays responsive;
// onProgress(done, runs) reports how far it is, and while busy() is true (you are fighting) it waits.
export async function botReference({ sheet, opts, apl, items, runs = 24, onProgress, busy = () => false }) {
  const dps = [];
  for (let i = 0; i < runs; i++) {
    while (busy()) await new Promise((r) => setTimeout(r, 300));
    dps.push(botFight(sheet, opts, apl, items, 7919 * (i + 1)));
    if (onProgress) onProgress(i + 1, runs);
    await new Promise((r) => setTimeout(r, 0));
  }
  return dps.sort((a, b) => a - b);
}

const quantile = (sorted, q) => {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.min(sorted.length - 1, lo + 1)] - sorted[lo]) * (i - lo);
};

// The parse percent for a DPS against a reference (sorted DPS values). Piecewise linear in DPS relative to the
// reference median: 60% of it scores 0, 80% scores 25, 88% scores 50, 95% scores 75, the median 95, the 90th
// percentile 99 and the best run 100.
export function parsePercent(dps, ref) {
  if (!ref || !ref.length || !(dps > 0)) return 0;
  const med = quantile(ref, 0.5);
  const p90 = Math.max(med * 1.0001, quantile(ref, 0.9));
  const max = Math.max(p90 * 1.0001, ref[ref.length - 1]);
  const points = [[0.6 * med, 0], [0.8 * med, 25], [0.88 * med, 50], [0.95 * med, 75], [med, 95], [p90, 99], [max, 100]];
  if (dps <= points[0][0]) return 0;
  if (dps >= max) return 100;
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (dps <= x1) return Math.floor(y0 + ((dps - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 100;
}

export const referenceSummary = (ref) => ({ median: quantile(ref, 0.5), p90: quantile(ref, 0.9), best: ref[ref.length - 1], runs: ref.length });
