// The results' Timeline, like the wowsims one: damage per second with the running DPS, your resource, then a row
// per ability (each cast as its icon, with a bar behind a cast that has a cast time or a channel) and a row per buff
// (its uptime as bars), all on one time axis you zoom (the buttons, Ctrl + mouse wheel, a double click) and pan
// (drag it, or the scroll bar). The names stay on the left; hover anything for its time. The Rotation row marks where
// you went another way than the rotation (the log's 'apl' entries: a cast it would not have made, ringed red among
// the casts too) and where the global cooldown sat ready with something to cast ('aplIdle').
import { iconUrl } from './data/warrior.js';

const LABEL_W = 190;  // the names column, sticky on the left
const MAX_PPS = 160;  // the closest zoom, in pixels a second
const TICKS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
const AURA_COLORS = ['#4a9eff', '#3fc7a6', '#b07cff', '#e8a33d', '#e86a8a', '#7fbf4d'];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n, d = 0) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const clock = (s, exact = false) => {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${m}:${exact ? sec.toFixed(2).padStart(5, '0') : String(Math.floor(sec)).padStart(2, '0')}`;
};
const img = (icon, cls = 'tl-ic') => `<img class="${cls}" src="${iconUrl(icon || 'inv_misc_questionmark')}" alt="" draggable="false" onerror="this.style.visibility='hidden'">`;

// The casts by ability: when each began, and the bar of a cast with a cast time or a channel (from the log's
// castStart to its castEnd; a cancelled one is marked).
function castRows(f, log, iconFor, nameFor) {
  const dur = f.duration;
  const rows = {};
  const row = (id) => (rows[id] ||= { id, name: nameFor(id, f), icon: iconFor(id, f), casts: [], bars: [] });
  const offs = (log || []).filter((ev) => ev.type === 'apl');
  for (const c of f.stats.casts) {
    const off = offs.find((o) => o.id === c.id && Math.abs(o.t - c.t) < 0.02);
    row(c.id).casts.push({ t: Math.max(0, c.t), off });
  }
  const open = {};
  for (const ev of log || []) {
    if (ev.type === 'castStart') open[ev.id] = { s: Math.max(0, ev.t), e: ev.end };
    else if (ev.type === 'pushback' && open[ev.id]) open[ev.id].e = ev.end;
    else if (ev.type === 'castEnd' && open[ev.id]) {
      const o = open[ev.id];
      row(ev.id).bars.push({ s: o.s, e: Math.min(dur, Math.max(o.s, ev.t)), cancelled: !!ev.cancelled });
      delete open[ev.id];
    }
  }
  for (const [id, o] of Object.entries(open)) row(id).bars.push({ s: o.s, e: Math.min(dur, o.e), cancelled: false });
  return Object.values(rows).filter((r) => r.casts.length || r.bars.length).sort((a, b) => b.casts.length - a.casts.length);
}

export function mountTimeline(root, f, log, { iconFor, nameFor }) {
  const dur = Math.max(1, f.duration || f.t);
  const casts = castRows({ ...f, duration: dur }, log, iconFor, nameFor);
  const auras = Object.values(f.stats.auras).filter((a) => a.intervals.length).sort((a, b) => b.uptime - a.uptime);
  const buckets = f.stats.dmgBuckets || [];
  const running = [];
  let acc = 0;
  for (let s = 0; s < Math.ceil(Math.min(dur, f.t || dur)); s++) { acc += buckets[s] || 0; running.push(acc / (s + 1)); }
  const resource = f.stats.rage || [];
  const deaths = (log || []).filter((ev) => ev.type === 'death');
  const execStart = f.stats.execStart;

  root.innerHTML = `<div class="tl-tools">
      <button type="button" data-z="out" title="Zoom out">−</button><button type="button" data-z="in" title="Zoom in">+</button>
      <button type="button" data-z="fit">Whole fight</button><span class="tl-zoom"></span>
      <span class="hint">Drag to pan · Ctrl + wheel or double click to zoom · hover for times</span></div>
    <div class="tl-scroll"><div class="tl-inner"></div></div><div class="tl-tip" hidden></div>`;
  const scroll = root.querySelector('.tl-scroll');
  const inner = root.querySelector('.tl-inner');
  const tip = root.querySelector('.tl-tip');
  const avail = () => Math.max(300, (scroll.clientWidth || 900) - LABEL_W - 14);
  const fitPps = () => avail() / dur;
  let pps = fitPps();
  let fitted = true;

  function render() {
    const W = Math.round(dur * pps);
    const x = (t) => Math.round(Math.max(0, Math.min(dur, t)) * pps * 10) / 10;
    const step = TICKS.find((s) => s * pps >= 64) || 600;
    const ticks = [];
    for (let s = 0; s <= dur + 1e-6; s += step) ticks.push(s);
    const axis = `<div class="tl-row tl-axisrow"><div class="tl-lab"></div><div class="tl-track" style="width:${W}px">${ticks.map((s) => `<span${x(s) > W - 24 ? ' class="end"' : ''} style="left:${x(s)}px">${clock(s)}</span>`).join('')}</div></div>`;

    // Damage per second, and the running DPS over it.
    const H = 96;
    const maxB = Math.max(1, ...buckets.filter(Boolean));
    const maxR = Math.max(1, ...running);
    const bw = Math.max(1, pps - (pps > 3 ? 1 : 0));
    const dmg = buckets.map((v, s) => (v ? `<rect x="${x(s)}" y="${H - (v / maxB) * H}" width="${bw}" height="${(v / maxB) * H}"/>` : '')).join('');
    const line = running.map((v, s) => `${x(s + 1)},${(H - (v / maxR) * H * 0.9).toFixed(1)}`).join(' ');
    const dmgRow = `<div class="tl-row tl-chartrow" style="height:${H}px"><div class="tl-lab"><b>Damage / s</b><small>peak ${fmt(maxB)} · ${fmt(f.dps)} DPS</small></div>
      <div class="tl-track tl-chart" data-chart="dmg" style="width:${W}px"><svg width="${W}" height="${H}"><g class="tl-dmg">${dmg}</g><polyline class="tl-dps" points="0,${H} ${line}"/></svg></div></div>`;

    // The resource: rage, energy or mana.
    const RH = 46;
    const max = Math.max(1, f.maxRage || Math.max(...resource.map((p) => p[1])));
    const pts = resource.map(([t, r]) => `${x(t)},${(RH - (Math.min(r, max) / max) * RH).toFixed(1)}`);
    const resRow = resource.length ? `<div class="tl-row tl-chartrow" style="height:${RH}px"><div class="tl-lab"><b>${esc(f.resource || 'Rage')}</b><small>of ${fmt(max)}</small></div>
      <div class="tl-track tl-chart" data-chart="res" style="width:${W}px"><svg width="${W}" height="${RH}"><polygon class="tl-resfill" points="${x(resource[0][0])},${RH} ${pts.join(' ')} ${x(resource[resource.length - 1][0])},${RH}"/><polyline class="tl-res" points="${pts.join(' ')}"/></svg></div></div>` : '';

    const castHtml = casts.map((r) => `<div class="tl-row"><div class="tl-lab">${img(r.icon)}<span>${esc(r.name)}</span><small>${r.casts.length}</small></div>
      <div class="tl-track" style="width:${W}px">${r.bars.map((b) => `<div class="tl-bar tl-castbar${b.cancelled ? ' cancelled' : ''}" style="left:${x(b.s)}px;width:${Math.max(2, x(b.e) - x(b.s))}px"
        data-tip="${esc(r.name)}${b.cancelled ? ' (cancelled)' : ''}|${clock(b.s, true)} → ${clock(b.e, true)} · ${(b.e - b.s).toFixed(2)} s"></div>`).join('')}${r.casts.map((c) => `<span class="tl-cast${c.off ? ' off' : ''}" style="left:${Math.min(x(c.t), W - 18)}px" data-tip="${esc(r.name)}|${clock(c.t, true)}${c.off ? ` · the rotation: ${esc(nameFor(c.off.want, f))}` : ''}">${img(r.icon)}</span>`).join('')}</div></div>`).join('');

    // The rotation: a red mark where you cast what it would not have, an amber bar where the global cooldown sat
    // ready with something to cast (past a reaction time).
    const offs = (log || []).filter((ev) => ev.type === 'apl');
    const idles = (log || []).filter((ev) => ev.type === 'aplIdle');
    const idleTotal = idles.reduce((a, ev) => a + (ev.end - ev.t), 0);
    const rotRow = offs.length || idles.length ? `<div class="tl-row tl-rotrow"><div class="tl-lab"><b>Rotation</b><small>${offs.length} other cast${offs.length === 1 ? '' : 's'} · ${idleTotal.toFixed(1)} s idle</small></div>
      <div class="tl-track" style="width:${W}px">${idles.map((ev) => `<div class="tl-bar tl-idle" style="left:${x(ev.t)}px;width:${Math.max(2, x(ev.end) - x(ev.t))}px"
        data-tip="Nothing cast for ${(ev.end - ev.t).toFixed(1)} s|${clock(ev.t, true)} → ${clock(ev.end, true)}${ev.want ? ` · ${esc(nameFor(ev.want, f))} was ready` : ''}"></div>`).join('')}${offs.map((ev) => `<span class="tl-off" style="left:${Math.min(x(ev.t), W - 18)}px"
        data-tip="${esc(nameFor(ev.id, f))} → the rotation: ${esc(nameFor(ev.want, f))}|${clock(ev.t, true)}${ev.wait ? ` · it would have waited ${ev.wait.toFixed(1)} s` : ''}${ev.why ? ` · why: ${esc(ev.why)}` : ''}">${img(iconFor(ev.want, f))}</span>`).join('')}</div></div>` : '';

    const auraHtml = auras.map((a, i) => {
      const color = AURA_COLORS[i % AURA_COLORS.length];
      return `<div class="tl-row"><div class="tl-lab">${a.icon ? img(a.icon) : '<i class="tl-ic"></i>'}<span>${esc(a.name)}</span><small>${((a.uptime / dur) * 100).toFixed(0)}%</small></div>
        <div class="tl-track" style="width:${W}px">${a.intervals.map(([s, e]) => {
          const w = Math.max(2, x(e) - x(s));
          return `<div class="tl-bar tl-aurabar" style="left:${x(s)}px;width:${w}px;--c:${color}" data-tip="${esc(a.name)}|${clock(s, true)} → ${clock(e, true)} · ${(e - s).toFixed(1)} s">${a.icon && w >= 20 ? img(a.icon) : ''}</div>`;
        }).join('')}</div></div>`;
    }).join('');

    const grid = `<div class="tl-grid" style="left:${LABEL_W}px;width:${W}px">
      ${execStart != null && execStart < dur ? `<div class="tl-exec" style="left:${x(execStart)}px;width:${W - x(execStart)}px" data-tip="Execute phase|from ${clock(execStart, true)}"></div>` : ''}
      ${ticks.map((s) => `<i style="left:${x(s)}px"></i>`).join('')}
      ${deaths.map((d) => `<b class="tl-death" style="left:${x(d.t)}px" data-tip="You died|${clock(d.t, true)}${d.name ? ` · ${esc(d.name)}` : ''}"></b>`).join('')}</div>`;

    inner.style.width = `${LABEL_W + W + 14}px`;
    inner.innerHTML = `${grid}${axis}${dmgRow}${resRow}${rotRow}
      ${castHtml ? `<div class="tl-section">Casts</div>${castHtml}` : ''}
      ${auraHtml ? `<div class="tl-section">Buffs and procs</div>${auraHtml}` : ''}${axis}`;
    const zoom = pps / fitPps();
    root.querySelector('.tl-zoom').textContent = fitted ? 'whole fight' : `${zoom < 10 ? zoom.toFixed(1) : Math.round(zoom)}×`;
  }

  // Zoom to `next` pixels a second, keeping the time under clientX (the middle when left out) where it is.
  function zoomTo(next, clientX) {
    const rect = scroll.getBoundingClientRect();
    const scale = rect.width / (scroll.offsetWidth || rect.width) || 1;
    const ax = clientX == null ? LABEL_W + avail() / 2 : (clientX - rect.left) / scale;
    const t = (scroll.scrollLeft + ax - LABEL_W) / pps;
    pps = Math.max(fitPps(), Math.min(MAX_PPS, next));
    fitted = pps <= fitPps() + 1e-9;
    render();
    scroll.scrollLeft = Math.max(0, t * pps - ax + LABEL_W);
  }

  root.querySelector('.tl-tools').addEventListener('click', (e) => {
    const z = e.target.closest('[data-z]');
    if (!z) return;
    if (z.dataset.z === 'fit') { pps = fitPps(); fitted = true; render(); scroll.scrollLeft = 0; }
    else zoomTo(pps * (z.dataset.z === 'in' ? 2 : 0.5));
  });
  scroll.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoomTo(pps * (e.deltaY < 0 ? 1.25 : 0.8), e.clientX);
  }, { passive: false });
  scroll.addEventListener('dblclick', (e) => zoomTo(pps * (e.shiftKey ? 0.5 : 2), e.clientX));

  // Drag to pan.
  let drag = null;
  scroll.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, left: scroll.scrollLeft, id: e.pointerId, moved: false };
  });
  scroll.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 3) { drag.moved = true; scroll.setPointerCapture(drag.id); scroll.classList.add('dragging'); tip.hidden = true; }
    if (drag.moved) scroll.scrollLeft = drag.left - dx;
  });
  const endDrag = () => { drag = null; scroll.classList.remove('dragging'); };
  scroll.addEventListener('pointerup', endDrag);
  scroll.addEventListener('pointercancel', endDrag);

  // Hover: a mark's name and time; over the charts, that second's damage and the running DPS, or the resource.
  root.addEventListener('mousemove', (e) => {
    if (drag && drag.moved) return;
    let text = null;
    const el = e.target.closest('[data-tip]');
    const chart = e.target.closest('.tl-chart');
    if (el) {
      const [head, rest] = el.dataset.tip.split('|');
      text = `<b>${esc(head)}</b>${rest ? `<br>${esc(rest)}` : ''}`;
    } else if (chart) {
      const t = (e.clientX - chart.getBoundingClientRect().left) / (chart.getBoundingClientRect().width / chart.offsetWidth || 1) / pps;
      const s = Math.floor(t);
      if (chart.dataset.chart === 'dmg') text = `<b>${clock(s)}</b><br>${fmt(buckets[s] || 0)} damage that second<br>${fmt(running[s] || 0)} DPS so far`;
      else {
        let r = null;
        for (const p of resource) { if (p[0] > t) break; r = p[1]; }
        text = `<b>${clock(t, true)}</b><br>${esc(f.resource || 'Rage')}: ${fmt(r ?? 0)}`;
      }
    }
    if (!text) { tip.hidden = true; return; }
    const rect = root.getBoundingClientRect();
    const scale = rect.width / (root.offsetWidth || rect.width) || 1;
    tip.innerHTML = text;
    tip.hidden = false;
    const left = (e.clientX - rect.left) / scale + 14;
    tip.style.left = `${Math.min(left, root.offsetWidth - tip.offsetWidth - 4)}px`;
    tip.style.top = `${(e.clientY - rect.top) / scale + 14}px`;
  });
  root.addEventListener('mouseleave', () => { tip.hidden = true; });

  // Showing the whole fight follows the window's width.
  if (window.ResizeObserver) {
    let lastW = scroll.clientWidth;
    new ResizeObserver(() => {
      if (scroll.clientWidth === lastW) return;
      lastW = scroll.clientWidth;
      if (fitted) { pps = fitPps(); render(); } else if (pps < fitPps()) { pps = fitPps(); fitted = true; render(); }
    }).observe(scroll);
  }
  render();
  // The width settles once the tab is laid out (a scroll bar can appear beside it): fit to it then.
  const refit = () => { if (fitted && Math.abs(pps - fitPps()) > 1e-6) { pps = fitPps(); render(); } };
  requestAnimationFrame(refit);
  setTimeout(refit, 150);
}
