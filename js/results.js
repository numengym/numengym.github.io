// The after-fight results, laid out like the wowsims Results tab: Damage, Auras, Casts, Resources,
// Timeline, Damage Taken and the full combat Log.
import { iconUrl } from './data/warrior.js';
import { ABILITIES, METER_ICONS } from './active-class.js';
import { parseTier } from './score.js';

const fmt = (n, d = 0) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (a, b) => (b ? (a / b) * 100 : 0);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const EXTRA_ICONS = {
  windfury: 'spell_nature_windfury', deepWounds: 'ability_backstab', whirlwindOh: 'ability_whirlwind', extra: 'ability_warrior_punishingblow',
  touchOfTheGrave: 'spell_shadow_devouringplague', rageGain: 'ability_warrior_innerrage',
};

const copy = (v) => JSON.parse(JSON.stringify(v));
const nameIcon = (x) => (x ? { name: x.name, icon: x.icon } : null);

// A plain copy of what the results need, so they survive the next fight and can be saved.
export function snapshotResults(f) {
  const uses = {};
  for (const [k, u] of Object.entries(f.c.uses || {})) uses[k] = nameIcon(u);
  return {
    t: f.t, duration: f.timed ? f.o.duration : f.t, total: f.total, dps: f.dps(), dead: f.dead, maxRage: f.maxRage, resource: f.resourceName || 'Rage',
    tps: f.tps(), threatTotal: f.threatTotal, threatMeter: copy(f.threatMeter), metric: f.o.metric || 'dps',
    targets: f.targets.length, meter: copy(f.meter), stats: copy(f.stats), review: copy(f.review),
    uses, racial: nameIcon(f.racial.active), mhIcon: f.c.mh && f.c.mh.icon, ohIcon: f.c.oh && f.c.oh.icon,
  };
}

// Trinkets, potions and racials show the actual item or racial.
function itemInfo(key, fight) {
  const ab = ABILITIES[key];
  if (!ab) return null;
  if (ab.item && fight.uses[ab.item]) return fight.uses[ab.item];
  if (ab.racial && fight.racial) return fight.racial;
  return null;
}

// Icon of a damage meter or cast key. fight: snapshotResults() or iconSource() of a live fight.
export function iconFor(key, fight) {
  if (key === 'mh') return fight.mhIcon || 'inv_sword_04';
  if (key === 'oh') return fight.ohIcon || 'inv_sword_04';
  const item = itemInfo(key, fight);
  if (item) return item.icon;
  if (ABILITIES[key]) return ABILITIES[key].icon;
  if (METER_ICONS[key]) return METER_ICONS[key];
  const m = fight.meter && fight.meter[key];
  if (m && m.icon) return m.icon;
  return EXTRA_ICONS[key] || 'inv_misc_questionmark';
}

// What iconFor needs from a live fight.
export function iconSource(f) {
  return { uses: f.c.uses || {}, racial: f.racial.active || null, mhIcon: f.c.mh && f.c.mh.icon, ohIcon: f.c.oh && f.c.oh.icon, meter: f.meter };
}

function nameFor(key, fight) {
  const item = itemInfo(key, fight);
  if (item) return item.name;
  return ABILITIES[key] ? ABILITIES[key].name : key;
}

const img = (icon) => `<img class="ri" src="${iconUrl(icon)}" alt="" onerror="this.style.visibility='hidden'">`;

// ---- tabs --------------------------------------------------------------------------------------

function damageTab(f) {
  const dur = Math.max(1, f.t);
  const rows = Object.entries(f.meter).filter(([, m]) => m.count > 0).sort((a, b) => b[1].damage - a[1].damage);
  const top = rows.length ? rows[0][1].damage : 1;
  const body = rows.map(([key, m]) => {
    const r = (n) => `${pct(n, m.count).toFixed(1)}%`;
    return `<tr>
      <td class="name">${img(iconFor(key, f))}${esc(m.name)}</td>
      <td class="bar-cell"><div class="rbar" style="width:${pct(m.damage, top)}%"></div><span>${fmt(m.damage / dur)}</span></td>
      <td>${pct(m.damage, f.total).toFixed(1)}%</td>
      <td>${fmt(m.damage)}</td>
      <td>${m.count}</td>
      <td>${m.hits ? fmt(m.hitDamage / m.hits) : '–'}</td>
      <td>${m.crits ? fmt(m.critDamage / m.crits) : '–'}</td>
      <td>${r(m.crits)}</td><td>${r(m.misses)}</td><td>${r(m.dodges)}</td><td>${r(m.parries || 0)}</td>
      <td>${r(m.glances)}</td><td>${r(m.blocks || 0)}</td>
    </tr>`;
  }).join('');
  return `<table class="rtable">
    <thead><tr><th>Name</th><th>DPS</th><th>%</th><th>Damage</th><th>Hits</th><th>Avg hit</th><th>Avg crit</th>
      <th>Crit</th><th>Miss</th><th>Dodge</th><th>Parry</th><th>Glance</th><th>Block</th></tr></thead>
    <tbody>${body || '<tr><td colspan="13">No damage done.</td></tr>'}</tbody>
    <tfoot><tr><td class="name">Total</td><td>${fmt(f.total / dur)}</td><td>100%</td><td>${fmt(f.total)}</td><td colspan="9"></td></tr></tfoot>
  </table>`;
}

function aurasTab(f) {
  const dur = Math.max(1, f.t);
  const rows = Object.entries(f.stats.auras).filter(([id]) => !id.endsWith(':stack') || true)
    .sort((a, b) => b[1].uptime - a[1].uptime);
  return `<table class="rtable">
    <thead><tr><th>Name</th><th>Procs</th><th>PPM</th><th>Uptime</th></tr></thead>
    <tbody>${rows.map(([, a]) => `<tr><td class="name">${a.icon ? img(a.icon) : ''}${esc(a.name)}</td><td>${a.procs}</td>
      <td>${(a.procs / (dur / 60)).toFixed(2)}</td>
      <td class="bar-cell"><div class="rbar" style="width:${pct(a.uptime, dur)}%"></div><span>${pct(a.uptime, dur).toFixed(1)}%</span></td></tr>`).join('')
      || '<tr><td colspan="4">No auras.</td></tr>'}</tbody></table>`;
}

function castsTab(f) {
  const dur = Math.max(1, f.t);
  const by = {};
  for (const c of f.stats.casts) (by[c.id] = by[c.id] || []).push(c.t);
  const rows = Object.entries(by).sort((a, b) => b[1].length - a[1].length);
  return `<table class="rtable">
    <thead><tr><th>Ability</th><th>Casts</th><th>CPM</th><th>Avg time between</th><th>${f.resource || 'Rage'} spent</th></tr></thead>
    <tbody>${rows.map(([id, ts]) => {
      const gaps = ts.slice(1).map((t, i) => t - ts[i]);
      const avg = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
      return `<tr><td class="name">${img(iconFor(id, f))}${esc(nameFor(id, f))}</td><td>${ts.length}</td>
        <td>${(ts.length / (dur / 60)).toFixed(1)}</td><td>${avg ? avg.toFixed(1) + ' s' : '–'}</td><td>${fmt(f.stats.rageSpent[id] || 0)}</td></tr>`;
    }).join('') || '<tr><td colspan="5">No casts.</td></tr>'}</tbody></table>
    ${f.review.btIdle != null ? `<p class="hint">Bloodthirst sat ready for ${f.review.btIdle.toFixed(1)} s and Whirlwind for ${f.review.wwIdle.toFixed(1)} s outside the execute phase.</p>` : ''}`;
}

function resourcesTab(f) {
  const s = f.stats;
  const gainTotal = Object.values(s.rageGain).reduce((a, b) => a + b, 0);
  const spentTotal = Object.values(s.rageSpent).reduce((a, b) => a + b, 0);
  const gain = Object.entries(s.rageGain).sort((a, b) => b[1] - a[1]);
  const spent = Object.entries(s.rageSpent).sort((a, b) => b[1] - a[1]);
  const name = (k) => nameFor(k, f);
  return `<div class="rcols">
    <div><h4>${f.resource || 'Rage'} gained</h4><table class="rtable">
      <thead><tr><th>Source</th><th>Gained</th><th>%</th><th>Wasted at cap</th></tr></thead>
      <tbody>${gain.map(([k, v]) => `<tr><td class="name">${esc(name(k))}</td><td>${fmt(v, 1)}</td><td>${pct(v, gainTotal).toFixed(1)}%</td>
        <td>${fmt(s.rageWaste[k] || 0, 1)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td class="name">Total</td><td>${fmt(gainTotal, 1)}</td><td></td><td>${fmt(f.review.rageWasted ?? f.review.energyWasted ?? 0, 1)}</td></tr></tfoot></table></div>
    <div><h4>${f.resource || 'Rage'} spent</h4><table class="rtable">
      <thead><tr><th>Ability</th><th>Spent</th><th>%</th></tr></thead>
      <tbody>${spent.map(([k, v]) => `<tr><td class="name">${esc(name(k))}</td><td>${fmt(v, 1)}</td><td>${pct(v, spentTotal).toFixed(1)}%</td></tr>`).join('')}</tbody>
      <tfoot><tr><td class="name">Total</td><td>${fmt(spentTotal, 1)}</td><td></td></tr></tfoot></table></div>
  </div>`;
}

function damageTakenTab(f) {
  const rows = Object.entries(f.stats.damageTakenBy).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '<p>You took no damage.</p>';
  const total = rows.reduce((a, [, v]) => a + v, 0);
  const r = f.review;
  return `<table class="rtable"><thead><tr><th>Source</th><th>Damage</th><th>%</th><th>Hits</th><th>DTPS</th></tr></thead>
    <tbody>${rows.map(([k, v]) => `<tr><td class="name">${esc(k)}</td><td>${fmt(v)}</td><td>${pct(v, total).toFixed(1)}%</td>
      <td>${r.hitsTaken[k] || 0}</td><td>${fmt(v / Math.max(1, f.t))}</td></tr>`).join('')}</tbody></table>
    <p class="hint">${r.rageFromDamage != null ? `Rage from damage taken: ${fmt(r.rageFromDamage, 1)}.` : ''}${r.avoided ? ` Swings missed, dodged or parried: ${r.avoided}.` : ''}${r.blocked ? ` Damage blocked: ${fmt(r.blocked)}.` : ''}</p>`;
}

// Threat by ability, like the damage table: your stance and Defiance are in every number.
function threatTab(f) {
  const dur = Math.max(1, f.t);
  const rows = Object.entries(f.threatMeter || {}).filter(([, m]) => m.threat > 0).sort((a, b) => b[1].threat - a[1].threat);
  const top = rows.length ? rows[0][1].threat : 1;
  return `<table class="rtable"><thead><tr><th>Name</th><th>TPS</th><th>%</th><th>Threat</th></tr></thead>
    <tbody>${rows.map(([key, m]) => `<tr><td class="name">${img(iconFor(key, f))}${esc(m.name)}</td>
      <td class="bar-cell"><div class="rbar" style="width:${pct(m.threat, top)}%"></div><span>${fmt(m.threat / dur)}</span></td>
      <td>${pct(m.threat, f.threatTotal).toFixed(1)}%</td><td>${fmt(m.threat)}</td></tr>`).join('') || '<tr><td colspan="4">No threat.</td></tr>'}</tbody>
    <tfoot><tr><td class="name">Total</td><td>${fmt(f.threatTotal / dur)}</td><td>100%</td><td>${fmt(f.threatTotal)}</td></tr></tfoot></table>`;
}

// Timeline: damage per second with the running DPS, rage, aura uptimes and casts, like the wowsims Timeline.
function timelineTab(f) {
  const dur = Math.max(1, f.duration);
  const W = 1000;
  const L = 130;
  const x = (t) => L + (t / dur) * (W - L - 10);
  const parts = [];
  let y = 10;

  // Execute phase shading.
  const exec = (top, h) => `<rect x="${x(dur * 0.8)}" y="${top}" width="${x(dur) - x(dur * 0.8)}" height="${h}" class="tl-exec"/>`;

  // Damage per second bars and running DPS line.
  const H = 120;
  const buckets = f.stats.dmgBuckets;
  const maxB = Math.max(1, ...buckets.filter(Boolean));
  parts.push(`<text x="4" y="${y + 14}" class="tl-label">Damage / s</text>`, exec(y, H));
  for (let s = 0; s < buckets.length; s++) {
    if (!buckets[s]) continue;
    const h = (buckets[s] / maxB) * H;
    parts.push(`<rect x="${x(s)}" y="${y + H - h}" width="${Math.max(1, x(s + 1) - x(s) - 1)}" height="${h}" class="tl-dmg"/>`);
  }
  let acc = 0;
  const pts = [];
  for (let s = 0; s < Math.ceil(f.t); s++) {
    acc += buckets[s] || 0;
    pts.push([x(s + 1), (acc / (s + 1))]);
  }
  const maxDps = Math.max(1, ...pts.map((p) => p[1]));
  if (pts.length) parts.push(`<polyline class="tl-dps" points="${pts.map(([px, v]) => `${px},${y + H - (v / maxDps) * H}`).join(' ')}"/>`,
    `<text x="${W - 12}" y="${y + 12}" class="tl-dpslabel" text-anchor="end">DPS ${fmt(f.dps)}</text>`);
  y += H + 14;

  // Rage.
  const RH = 60;
  parts.push(`<text x="4" y="${y + 14}" class="tl-label">${f.resource || 'Rage'}</text>`, exec(y, RH),
    `<rect x="${L}" y="${y}" width="${W - L - 10}" height="${RH}" class="tl-frame"/>`);
  if (f.stats.rage.length) {
    parts.push(`<polyline class="tl-rage" points="${f.stats.rage.map(([t, r]) => `${x(t)},${y + RH - (r / f.maxRage) * RH}`).join(' ')}"/>`);
  }
  y += RH + 14;

  // Auras.
  const auraRows = Object.entries(f.stats.auras).filter(([, a]) => a.intervals.length).sort((a, b) => b[1].uptime - a[1].uptime);
  for (const [, a] of auraRows) {
    parts.push(`<text x="4" y="${y + 11}" class="tl-label">${esc(a.name.slice(0, 20))}</text>`);
    for (const [s, e] of a.intervals) parts.push(`<rect x="${x(s)}" y="${y + 2}" width="${Math.max(1, x(e) - x(s))}" height="10" class="tl-aura"/>`);
    y += 16;
  }
  y += 6;

  // Casts.
  const by = {};
  for (const c of f.stats.casts) (by[c.id] = by[c.id] || []).push(c.t);
  for (const [id, ts] of Object.entries(by)) {
    const name = nameFor(id, f);
    parts.push(`<text x="4" y="${y + 11}" class="tl-label">${esc(name.slice(0, 20))}</text>`);
    for (const t of ts) parts.push(`<rect x="${x(t) - 1}" y="${y + 1}" width="3" height="12" class="tl-cast"><title>${esc(name)} at ${t.toFixed(2)} s</title></rect>`);
    y += 16;
  }

  // Time axis.
  y += 4;
  for (let s = 0; s <= dur; s += dur > 120 ? 30 : 10) {
    parts.push(`<line x1="${x(s)}" x2="${x(s)}" y1="10" y2="${y}" class="tl-grid"/>`, `<text x="${x(s)}" y="${y + 12}" class="tl-axis" text-anchor="middle">${fmtTime(s)}</text>`);
  }
  y += 18;
  return `<div class="timeline"><svg viewBox="0 0 ${W} ${y}" preserveAspectRatio="xMinYMin meet">${parts.join('')}</svg></div>
    <p class="hint">Shaded: execute phase. Hover a cast mark to see its time.</p>`;
}

// ---- log ---------------------------------------------------------------------------------------

const LOG_KINDS = { damage: 'Damage', cast: 'Casts', aura: 'Auras', rage: 'Rage', hurt: 'Damage taken', other: 'Other' };

function logKind(ev) {
  if (ev.type === 'damage') return 'damage';
  if (ev.type === 'cast') return 'cast';
  if (ev.type === 'aura' || ev.type === 'auraEnd') return 'aura';
  if (ev.type === 'rage') return 'rage';
  if (ev.type === 'hurt' || ev.type === 'death') return 'hurt';
  return 'other';
}

function logText(ev, f) {
  switch (ev.type) {
    case 'damage': {
      const tgt = f.targets > 1 ? ` target ${ev.target + 1}` : ' the target';
      if (ev.outcome === 'miss') return `${ev.name} missed${tgt}`;
      if (ev.outcome === 'dodge') return `${ev.name} was dodged by${tgt}`;
      if (ev.outcome === 'parry') return `${ev.name} was parried by${tgt}`;
      const word = { crit: 'Crit', glance: 'Glance', block: 'Blocked hit' }[ev.outcome] || 'Hit';
      return `${ev.name} ${word}${tgt} for ${fmt(ev.amount)}`;
    }
    case 'cast': return `Cast ${nameFor(ev.id, f)}`;
    case 'aura': return `Aura gained: ${ev.name || ev.id}`;
    case 'auraEnd': return `Aura faded: ${ev.name || ev.id}`;
    case 'rage': return `Gained ${fmt(ev.amount, 2)} ${(ev.resource || 'rage')} from ${ev.source} (now ${fmt(ev.total, 1)})`;
    case 'hurt': return `${ev.name} hit you for ${fmt(ev.amount)} (${ev.school})`;
    case 'death': return `You died (${ev.name})`;
    case 'raidSunder': return `Warrior ${ev.warrior} cast Sunder Armor (${ev.stacks} stacks)`;
    case 'stance': return `Changed to ${ev.stance} stance`;
    case 'start': return 'Fight started';
    case 'end': return 'Fight ended';
    case 'error': return `Failed: ${ev.reason}`;
    default: return ev.type;
  }
}

function logTab(f, log) {
  const kinds = Object.entries(LOG_KINDS).map(([k, label]) => `<label class="inline"><input type="checkbox" data-kind="${k}" checked> ${label}</label>`).join('');
  return `<div class="log-tools"><input type="search" class="log-search" placeholder="Search the log (e.g. Bloodthirst, Crit, Flurry)">${kinds}
    <span class="log-count"></span></div>
    <ol class="rlog">${log.map((ev) => `<li data-kind="${logKind(ev)}" class="${ev.outcome === 'crit' ? 'crit' : ''}">
      <span class="t">[${ev.t.toFixed(2)}]</span> ${esc(logText(ev, f))}</li>`).join('')}</ol>`;
}

function bindLog(root) {
  const search = root.querySelector('.log-search');
  if (!search) return;
  const items = [...root.querySelectorAll('.rlog li')];
  const apply = () => {
    const q = search.value.trim().toLowerCase();
    const on = new Set([...root.querySelectorAll('.log-tools input[type=checkbox]')].filter((c) => c.checked).map((c) => c.dataset.kind));
    let shown = 0;
    for (const li of items) {
      const vis = on.has(li.dataset.kind) && (!q || li.textContent.toLowerCase().includes(q));
      li.style.display = vis ? '' : 'none';
      if (vis) shown++;
    }
    root.querySelector('.log-count').textContent = `${shown} / ${items.length} lines`;
  };
  search.addEventListener('input', apply);
  root.querySelectorAll('.log-tools input[type=checkbox]').forEach((c) => c.addEventListener('change', apply));
  apply();
}

// ---- entry point -------------------------------------------------------------------------------

// The parse block of the results header: the score in its Warcraft Logs colour, or how far scoring is.
// meta.parse: { pct, median, best, runs, bestPct }; meta.scoring: "done/runs" while the reference runs.
export function parseHtml(meta) {
  if (meta.parse) {
    const p = meta.parse;
    const unit = meta.metric || 'DPS';
    const [, color, tier] = parseTier(p.pct);
    const against = p.source === 'wowsims'
      ? `Against the wowsims Forever sim on this exact setup (gear, buffs, zone, talents, APL, fight length, targets): ${fmt(p.runs)} sim fights, median ${fmt(p.median)} ${unit}, top 10% from ${fmt(p.p90)}, best ${fmt(p.best)}.`
      : `Against the rotation helper's bot on this exact setup (${p.error && /only played by the bot/.test(p.error) ? 'wowsims has no moving or training hits' : `wowsims could not be reached${p.error ? `: ${p.error}` : ''}`}): median ${fmt(p.median)} ${unit}, best ${fmt(p.best)} ${unit} over ${p.runs} fights.`;
    const skipped = p.skipped && p.skipped.length ? ` wowsims does not know item${p.skipped.length > 1 ? 's' : ''} ${p.skipped.join(', ')}; the sim ran without ${p.skipped.length > 1 ? 'them' : 'it'}.` : '';
    const tip = `Score ${p.pct} (${tier}). ${against} The sim's median scores 95, its top 10% 99, its best fight 100.${skipped} WoW Forever has no Warcraft Logs rankings yet; real parses can replace this reference once raids are logged.`;
    return `<div class="parse" title="${esc(tip)}"><b style="color:${color}">${p.pct}</b><span>score<br><i style="color:${color}">${tier}</i></span></div>
      <div class="hint">vs ${p.source === 'wowsims' ? 'wowsims' : 'the bot'}: median ${fmt(p.median)} ${unit}</div>
      ${p.bestPct != null ? `<div class="hint">Best on this setup: <b style="color:${parseTier(p.bestPct)[1]}">${p.bestPct}</b></div>` : ''}`;
  }
  if (meta.scoring) return `<div class="parse scoring"><span>Scoring… ${esc(meta.scoring)}</span></div>`;
  return '';
}

// Renders the results into `root`. f: snapshotResults(fight). meta: { encounter, best, isBest, when, parse, scoring }.
export function renderResults(root, f, log, meta) {
  // A tank's fight leads with threat per second.
  const tank = f.metric === 'tps';
  const unit = tank ? 'TPS' : 'DPS';
  const main = tank ? f.tps : f.dps;
  const tabs = [
    ['damage', 'Damage', () => damageTab(f)],
    ...(f.threatTotal ? [['threat', 'Threat', () => threatTab(f)]] : []),
    ['auras', 'Auras', () => aurasTab(f)],
    ['casts', 'Casts', () => castsTab(f)],
    ['resources', 'Resources', () => resourcesTab(f)],
    ['timeline', 'Timeline', () => timelineTab(f)],
    ...(Object.keys(f.stats.damageTakenBy).length ? [['taken', 'Damage Taken', () => damageTakenTab(f)]] : []),
    ['log', 'Log', () => logTab(f, log)],
  ];
  root.innerHTML = `
    <div class="results-head">
      <div>
        <h3>${f.dead ? `You died at ${fmtTime(f.t)}` : 'Results'} <span class="hint">${esc(meta.encounter)} · ${fmtTime(f.duration)}${meta.when ? ` · ${esc(new Date(meta.when).toLocaleString())}` : ''}</span></h3>
        <div class="big-dps">${fmt(main)} <span class="hint">${unit}</span>${tank ? ` <span class="hint">· ${fmt(f.dps)} DPS</span>` : ''}</div>
        <p>${fmt(f.total)} damage${tank ? ` and ${fmt(f.threatTotal)} threat` : ''} in ${fmtTime(f.t)}. ${meta.isBest ? '<b class="q2">New personal best!</b>' : meta.best ? `Personal best: ${fmt(meta.best)} ${unit}.` : ''}
          ${meta.simDps ? `The sim beside you: ${fmt(meta.simDps)} ${unit} (<span class="${main >= meta.simDps ? 'good' : 'bad'}">${main >= meta.simDps ? '+' : '−'}${fmt(Math.abs(main - meta.simDps))}</span>).` : ''}</p>
      </div>
      <div class="parse-slot">${parseHtml(meta)}</div>
      <button class="primary" data-close>Close</button>
    </div>
    <nav class="tabs rtabs">${tabs.map(([id, label], i) => `<button class="tab${i === 0 ? ' active' : ''}" data-rtab="${id}">${label}</button>`).join('')}</nav>
    <div class="rbody"></div>`;
  const body = root.querySelector('.rbody');
  const show = (id) => {
    const tab = tabs.find((t) => t[0] === id);
    body.innerHTML = tab[2]();
    root.querySelectorAll('[data-rtab]').forEach((b) => b.classList.toggle('active', b.dataset.rtab === id));
    if (id === 'log') bindLog(body);
  };
  root.querySelectorAll('[data-rtab]').forEach((b) => b.addEventListener('click', () => show(b.dataset.rtab)));
  show('damage');
}
