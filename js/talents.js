// Talent points: the wowsims talent string ("30305213002-15053105102210501": one digit per talent in tree
// order, trees joined by "-", trailing zeros left out) and the rules for spending points, as in the game:
// at most 51, a row opens after 5 points per row above it in that tree, and a talent with a prerequisite
// needs that one maxed.
import { MAX_TALENT_POINTS, POINTS_PER_TIER, TALENT_TREE_DATA } from './data/warrior-talents.js';

// The string as ranks per tree: [[3,0,3,...], [...], [...]], clamped to each talent's maximum.
export function talentRanks(str) {
  const trees = String(str || '').split('-');
  return TALENT_TREE_DATA.map((tree, t) => tree.talents.map((tal, i) => Math.min(tal.max, Number((trees[t] || '')[i] || 0) || 0)));
}

export function talentString(ranks) {
  const trees = ranks.map((r) => r.join('').replace(/0+$/, ''));
  while (trees.length && !trees[trees.length - 1]) trees.pop();
  return trees.join('-');
}

export const spentIn = (ranks, t) => ranks[t].reduce((a, b) => a + b, 0);
export const spentTotal = (ranks) => ranks.reduce((s, _, t) => s + spentIn(ranks, t), 0);

// Points in a tree in rows above `row`.
const spentAbove = (ranks, t, row) => TALENT_TREE_DATA[t].talents.reduce((s, tal, i) => s + (tal.row < row ? ranks[t][i] : 0), 0);
const prereqIndex = (t, tal) => (tal.prereq ? TALENT_TREE_DATA[t].talents.findIndex((x) => x.row === tal.prereq[0] && x.col === tal.prereq[1]) : -1);

// Is the talent's row open and its prerequisite maxed (it can take points)?
export function talentOpen(ranks, t, i) {
  const tal = TALENT_TREE_DATA[t].talents[i];
  if (spentAbove(ranks, t, tal.row) < tal.row * POINTS_PER_TIER) return false;
  const p = prereqIndex(t, tal);
  return p < 0 || ranks[t][p] >= TALENT_TREE_DATA[t].talents[p].max;
}

// Every point in a tree still allowed: rows open, prerequisites maxed.
function treeValid(ranks, t) {
  return TALENT_TREE_DATA[t].talents.every((tal, i) => ranks[t][i] === 0 || talentOpen(ranks, t, i));
}

export function canAdd(ranks, t, i) {
  const tal = TALENT_TREE_DATA[t].talents[i];
  return ranks[t][i] < tal.max && spentTotal(ranks) < MAX_TALENT_POINTS && talentOpen(ranks, t, i);
}

export function canRemove(ranks, t, i) {
  if (ranks[t][i] <= 0) return false;
  const next = ranks.map((r) => r.slice());
  next[t][i]--;
  return treeValid(next, t);
}

// A pasted or imported string can break the rules (an old build, a typo): checks it as a whole.
export function talentsValid(ranks) {
  return spentTotal(ranks) <= MAX_TALENT_POINTS && ranks.every((_, t) => treeValid(ranks, t));
}
