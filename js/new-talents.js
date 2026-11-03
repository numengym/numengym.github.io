// Check new talents: the announced trees (js/data/new-talents.js) to look through and try builds on, in the main menu.
// A preview only: the spent points stay here and nothing in the game reads them. The Talents tab's look, scaled up.
import { NEW_TALENTS, NEW_TALENTS_SOURCE } from './data/new-talents.js';
import { iconUrl } from './data/warrior.js';

const MAX_TALENT_POINTS = 51;
const POINTS_PER_TIER = 5;
const MARK_LABEL = { new: 'NEW', changed: 'CHANGED', moved: 'MOVED' };
const BG = 'https://wow.zamimg.com/images/wow/talents/backgrounds/tbc/';
// As the main menu lists them.
const CLASS_ORDER = ['warrior', 'druid', 'hunter', 'mage', 'paladin', 'priest', 'rogue', 'shaman', 'warlock'];
// As --nt-cell, --nt-row and --nt-icon in css/new-talents.css.
const CELL = 72, ROW = 68, ICON = 44;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const points = (n) => `${n} point${n === 1 ? '' : 's'}`;

// The points spent per class, kept while the page is open.
const builds = Object.fromEntries(Object.entries(NEW_TALENTS).map(([id, c]) => [id, c.trees.map((tree) => tree.talents.map(() => 0))]));

// The text at one rank (0-based), with the values that change per rank picked out.
const rankText = (tal, r) => (tal.text
  ? esc(tal.text).replace(/\{([^}]+)\}/g, (_, values) => `<b>${values.split('/')[r]}</b>`)
  : esc(tal.texts[r]));
// Every rank in one line, for the list of changes.
const allRanksText = (tal) => esc(tal.text ? tal.text.replace(/[{}]/g, '') : tal.texts[tal.texts.length - 1]);

const changeRows = (changes) => `<dl>${changes.map(([what, was, now]) =>
  `<dt>${esc(what)}</dt><dd><s>${esc(was)}</s> → <ins>${esc(now)}</ins></dd>`).join('')}</dl>`;

// Connections, drawn under the icons. All of them run straight down.
function arrows(tree) {
  const paths = tree.talents.filter((t) => t.needs).map((t) => {
    const p = tree.talents.find((x) => x.name === t.needs);
    if (p.row === t.row) {
      // Beside it in the same row.
      const color = t.newArrow ? '#ffd100' : '#8d8d8d';
      const dir = t.col > p.col ? 1 : -1;
      const y = (t.row + .5) * ROW;
      const from = (p.col + .5) * CELL + dir * ICON / 2, to = (t.col + .5) * CELL - dir * (ICON / 2 + 2);
      return `<path d="M${from} ${y}H${to - dir * 7}" stroke="${color}" stroke-width="${t.newArrow ? 4 : 3}" fill="none"/>
        <path d="M${to - dir * 8} ${y - 7}V${y + 7}L${to} ${y}Z" fill="${color}"/>`;
    }
    // A marked talent's label sits on top of its icon: the arrow stops above the label.
    const y1 = (p.row + .5) * ROW + ICON / 2, y2 = (t.row + .5) * ROW - ICON / 2 - (t.mark ? 9 : 2);
    const color = t.newArrow ? '#ffd100' : '#8d8d8d';
    const x = (t.col + .5) * CELL, x1 = (p.col + .5) * CELL;
    // To another column: down its own column, across just above the talent.
    const line = x === x1 ? `M${x} ${y1}V${y2 - 7}` : `M${x1} ${y1}V${y2 - 12}H${x}V${y2 - 7}`;
    return `<path d="${line}" stroke="${color}" stroke-width="${t.newArrow ? 4 : 3}" fill="none"/>
      <path d="M${x - 7} ${y2 - 8}H${x + 7}L${x} ${y2}Z" fill="${color}"/>`;
  });
  return `<svg viewBox="0 0 ${CELL * 4} ${ROW * 7}" preserveAspectRatio="none" aria-hidden="true">${paths.join('')}</svg>`;
}

// el: where it goes. cls: the class to open on (a class without announced trees opens the first).
// Returns what takes it away again.
export function mountNewTalents(el, cls) {
  let classId = NEW_TALENTS[cls] ? cls : Object.keys(NEW_TALENTS)[0];
  const trees = () => NEW_TALENTS[classId].trees;
  const ranks = () => builds[classId];

  // The game's rules for spending points (as js/talents.js, on these trees): at most 51, a row opens after 5 points per
  // row above it in that tree, and a required talent has to be maxed.
  const spentIn = (t) => ranks()[t].reduce((a, b) => a + b, 0);
  const spentTotal = () => ranks().reduce((s, _, t) => s + spentIn(t), 0);
  const spentAbove = (t, row) => trees()[t].talents.reduce((s, tal, i) => s + (tal.row < row ? ranks()[t][i] : 0), 0);
  const neededIndex = (t, tal) => trees()[t].talents.findIndex((x) => x.name === tal.needs);
  const neededMet = (t, tal) => {
    if (!tal.needs) return true;
    const p = neededIndex(t, tal);
    return ranks()[t][p] >= trees()[t].talents[p].max;
  };
  const talentOpen = (t, i) => {
    const tal = trees()[t].talents[i];
    return spentAbove(t, tal.row) >= tal.row * POINTS_PER_TIER && neededMet(t, tal);
  };
  const canAdd = (t, i) => ranks()[t][i] < trees()[t].talents[i].max && spentTotal() < MAX_TALENT_POINTS && talentOpen(t, i);
  const canRemove = (t, i) => {
    if (!ranks()[t][i]) return false;
    ranks()[t][i]--;
    const valid = trees()[t].talents.every((_, k) => !ranks()[t][k] || talentOpen(t, k));
    ranks()[t][i]++;
    return valid;
  };

  const requirements = (t, tal) => {
    const need = [];
    if (tal.row) need.push({ text: `Requires ${tal.row * POINTS_PER_TIER} points in ${trees()[t].name} Talents`, met: spentAbove(t, tal.row) >= tal.row * POINTS_PER_TIER });
    if (tal.needs) {
      const p = trees()[t].talents[neededIndex(t, tal)];
      need.push({ text: `Requires ${points(p.max)} in ${p.name}`, met: neededMet(t, tal) });
    }
    return need;
  };

  const clickHint = (t, i) => {
    const tal = trees()[t].talents[i];
    const r = ranks()[t][i];
    const hints = [];
    if (canAdd(t, i)) hints.push('Left-click: learn a rank');
    else if (r < tal.max && talentOpen(t, i)) hints.push('No points left');
    if (canRemove(t, i)) hints.push('Right-click: unlearn a rank');
    else if (r) hints.push("Can't unlearn: other points depend on it");
    return hints.length ? `<div class="nt-tip-hint">${esc(hints.join(' · '))}</div>` : '';
  };

  const tipHtml = (t, i) => {
    const tree = trees()[t];
    const tal = tree.talents[i];
    const current = ranks()[t][i];
    const rows = Array.from({ length: tal.max }, (_, r) => `<div class="nt-tip-desc${current && r !== current - 1 ? ' off' : ''}">${tal.max > 1 ? `<span class="nt-tip-rank">Rank ${r + 1}</span> ` : ''}${rankText(tal, r)}</div>`);
    const head = tal.head ? `<div class="nt-tip-row">${tal.head.map((h) => `<span>${esc(h)}</span>`).join('')}</div>` : '';
    const req = requirements(t, tal).map((r) => `<div class="nt-tip-req${r.met ? ' met' : ''}">${esc(r.text)}</div>`).join('');
    const tag = tal.mark ? `<span class="nt-tip-tag ${tal.mark}">${MARK_LABEL[tal.mark]}</span>` : '';
    const change = tal.changes ? `<div class="nt-tip-change">${changeRows(tal.changes)}</div>` : '';
    const guess = tal.guess ? `<div class="nt-tip-dim">${esc(tal.guess)}</div>` : '';
    return `<div class="nt-tip-row nt-tip-name"><span>${esc(tal.name)}</span>${tag}</div>
      <div class="nt-tip-dim">Rank ${current}/${tal.max} · ${esc(tree.name)}</div>${head}${req}${rows.join('')}${change}${guess}${clickHint(t, i)}`;
  };

  // The tooltip hangs off the page: the main menu's backdrop would make its fixed place relative to the menu.
  const tip = document.createElement('div');
  tip.className = 'nt-tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);
  const hideTip = () => { tip.hidden = true; };
  // Kept inside the window.
  const placeTip = (x, y) => {
    const { width, height } = tip.getBoundingClientRect();
    const left = x + 16 + width > innerWidth ? x - 16 - width : x + 16;
    const top = Math.min(y + 12, innerHeight - height - 8);
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${Math.max(8, top)}px`;
  };
  const showTip = (b, x, y) => {
    tip.innerHTML = tipHtml(Number(b.dataset.t), Number(b.dataset.i));
    tip.hidden = false;
    placeTip(x, y);
  };

  // Ranks, counters and each talent's state, after any change: learned, open to learn, or locked.
  const drawPoints = () => {
    const total = spentTotal();
    el.querySelectorAll('.nt-talent').forEach((b) => {
      const t = Number(b.dataset.t), i = Number(b.dataset.i);
      const r = ranks()[t][i];
      const open = talentOpen(t, i) && total < MAX_TALENT_POINTS;
      b.classList.toggle('has', r > 0);
      b.classList.toggle('open', !r && open);
      b.classList.toggle('locked', !r && !open);
      b.querySelector('.nt-rank').textContent = `${r}/${trees()[t].talents[i].max}`;
    });
    trees().forEach((_, t) => { el.querySelector(`[data-spent="${t}"]`).textContent = spentIn(t); });
    el.querySelector('[data-points]').textContent = trees().map((_, t) => spentIn(t)).join(' / ');
    el.querySelector('[data-left]').textContent = `${MAX_TALENT_POINTS - total} of ${MAX_TALENT_POINTS} points left`;
    el.querySelector('[data-reset]').disabled = !total;
  };

  const draw = () => {
    const c = NEW_TALENTS[classId];
    hideTip();
    el.innerHTML = `<div class="nt">
      <div class="nt-classes" role="tablist">${CLASS_ORDER.map((id) => [id, NEW_TALENTS[id]]).map(([id, x]) => `<button type="button" role="tab" aria-selected="${id === classId}" class="nt-class${id === classId ? ' current' : ''}" style="--c:${x.color}" data-pick="${id}"><img src="${iconUrl(x.icon)}" alt="">${esc(x.name)}</button>`).join('')}</div>
      <div class="nt-legend">
        <span><i class="new">NEW</i> new talent</span>
        <span><i class="changed">CHANGED</i> new values or requirement</span>
        <span><i class="moved">MOVED</i> new row</span>
        <span>Gold arrows are new connections.</span>
        <span>From <a href="${NEW_TALENTS_SOURCE}" target="_blank" rel="noopener">Blizzard's 3 November notes</a>.</span>
      </div>
      ${c.note ? `<p class="nt-note">${esc(c.note)}</p>` : ''}
      <div class="nt-bar">
        <b data-points></b>
        <span data-left></span>
        <button type="button" data-reset>Reset</button>
        <span>Left-click: learn a rank · Right-click or Shift+click: unlearn one</span>
      </div>
      <div class="nt-trees">${c.trees.map((tree, t) => `
        <section class="nt-tree" style="background-image:url('${BG}${tree.bg}')">
          <h2>${esc(tree.name)} <span><b data-spent="${t}">0</b> points · ${tree.talents.filter((x) => x.mark).length} of ${tree.talents.length} changed</span></h2>
          <div class="nt-grid">${arrows(tree)}${tree.talents.map((tal, i) => `
            <button type="button" class="nt-talent ${tal.mark || ''}" style="grid-row:${tal.row + 1};grid-column:${tal.col + 1}" data-t="${t}" data-i="${i}" aria-label="${esc(tal.name)}${tal.mark ? `, ${tal.mark}` : ''}">
              <img src="${iconUrl(tal.icon)}" alt=""><span class="nt-rank"></span>${tal.mark ? `<span class="nt-mark">${MARK_LABEL[tal.mark]}</span>` : ''}
            </button>`).join('')}</div>
        </section>`).join('')}</div>
      <div class="nt-notes">
        <section class="nt-changes"><h2>Everything that changed</h2>${c.trees.map((tree) => {
          const marked = tree.talents.filter((t) => t.mark);
          const removed = tree.removed && tree.removed.length ? `<h4 class="removed">Removed</h4><div>${esc(tree.removed.join(', '))}</div>` : '';
          return marked.length || removed ? `<h3>${esc(tree.name)}</h3>${marked.map((t) => `<h4 class="${t.mark}">${esc(t.name)}</h4>${t.changes
            ? changeRows(t.changes)
            : `<div>${allRanksText(t)}</div>`}`).join('')}${removed}` : '';
        }).join('')}</section>
        <section>
          <h2>Also in the notes, not talents</h2>
          <ul>${c.other.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          <h2>Guesses, where the notes don't say</h2>
          ${c.guesses.length ? `<ul>${c.guesses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p>None for this class.</p>'}
          <p>Unchanged tooltips are the current text from Wowhead's Forever database. A preview only: the trainer plays on today's trees until wowsims updates.</p>
        </section>
      </div>
    </div>`;
    drawPoints();
  };

  const talentOf = (e) => e.target.closest && e.target.closest('.nt-talent');
  const change = (b, e, step) => {
    const t = Number(b.dataset.t), i = Number(b.dataset.i);
    if (!(step > 0 ? canAdd(t, i) : canRemove(t, i))) return;
    ranks()[t][i] += step;
    drawPoints();
    // A key press has no mouse position: the tooltip goes by the talent.
    const r = b.getBoundingClientRect();
    if (e.detail) showTip(b, e.clientX, e.clientY);
    else showTip(b, r.right, r.top);
  };
  const onClick = (e) => {
    const pickClass = e.target.closest('[data-pick]');
    if (pickClass) { classId = pickClass.dataset.pick; draw(); return; }
    if (e.target.closest('[data-reset]')) { ranks().forEach((tree) => tree.fill(0)); drawPoints(); return; }
    const b = talentOf(e);
    if (b) change(b, e, e.shiftKey ? -1 : 1);
  };
  const onContextMenu = (e) => {
    const b = talentOf(e);
    if (!b) return;
    e.preventDefault();
    change(b, e, -1);
  };
  const onOver = (e) => { const b = talentOf(e); if (b) showTip(b, e.clientX, e.clientY); };
  const onMove = (e) => { if (talentOf(e)) placeTip(e.clientX, e.clientY); };
  const onOut = (e) => {
    const b = talentOf(e);
    if (b && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.nt-talent') === b)) hideTip();
  };
  const onFocusIn = (e) => {
    const b = talentOf(e);
    if (!b || !b.matches(':focus-visible')) return;
    const r = b.getBoundingClientRect();
    showTip(b, r.right, r.top);
  };
  // While the main menu is open it holds on to the keys: this has to be on the window, before them, and Esc closes the
  // menu with the tooltip still up.
  const onKey = (e) => { if (e.key === 'Escape') hideTip(); };
  el.addEventListener('click', onClick);
  el.addEventListener('contextmenu', onContextMenu);
  el.addEventListener('mouseover', onOver);
  el.addEventListener('mousemove', onMove);
  el.addEventListener('mouseout', onOut);
  el.addEventListener('focusin', onFocusIn);
  el.addEventListener('focusout', hideTip);
  addEventListener('keydown', onKey, true);
  draw();

  return () => {
    removeEventListener('keydown', onKey, true);
    tip.remove();
    el.innerHTML = '';
  };
}
