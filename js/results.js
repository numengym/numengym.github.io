// The after-fight results, laid out like the wowsims Results tab: Damage, Auras, Casts, Resources,
// Timeline (timeline.js), Damage Taken and the full combat Log.
import { iconUrl } from './data/warrior.js';
import { ABILITIES, METER_ICONS } from './active-class.js';
import { parseTier } from './score.js';
import { mountTimeline } from './timeline.js';

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

// A plain copy of what the results need, so they survive the next fight and can be saved. abilities, meterIcons: the
// class's own when the fight is not your class's (an NPC's, for Numen Logs).
export function snapshotResults(f, { abilities = ABILITIES, meterIcons = METER_ICONS } = {}) {
  const uses = {};
  for (const [k, u] of Object.entries(f.c.uses || {})) uses[k] = nameIcon(u);
  const snap = {
    t: f.t, duration: f.timed ? f.o.duration : f.t, total: f.total, dps: f.dps(), dead: f.dead, maxRage: f.maxRage, resource: f.resourceName || 'Rage',
    tps: f.tps(), threatTotal: f.threatTotal, threatMeter: copy(f.threatMeter), metric: f.o.metric || 'dps',
    targets: f.targets.length, meter: copy(f.meter), stats: copy(f.stats), review: copy(f.review),
    uses, racial: nameIcon(f.racial.active), mhIcon: f.c.mh && f.c.mh.icon, ohIcon: f.c.oh && f.c.oh.icon,
  };
  // Every ability's name and icon as this class has them, so the report reads the same from any class (Numen Logs).
  const keys = new Set([...Object.keys(snap.meter), ...snap.stats.casts.map((c) => c.id), ...Object.keys(snap.stats.rageSpent || {}), ...Object.keys(snap.stats.rageGain || {})]);
  snap.names = Object.fromEntries([...keys].map((k) => [k, { name: nameFor(k, snap, abilities), icon: iconFor(k, snap, abilities, meterIcons) }]));
  return snap;
}

// Trinkets, potions and racials show the actual item or racial.
function itemInfo(key, fight, A = ABILITIES) {
  const ab = A[key];
  if (!ab) return null;
  if (ab.item && fight.uses[ab.item]) return fight.uses[ab.item];
  if (ab.racial && fight.racial) return fight.racial;
  return null;
}

// Icon of a damage meter or cast key. fight: snapshotResults() or iconSource() of a live fight.
export function iconFor(key, fight, A = ABILITIES, MI = METER_ICONS) {
  if (fight.names && fight.names[key]) return fight.names[key].icon;
  if (key === 'mh') return fight.mhIcon || 'inv_sword_04';
  if (key === 'oh') return fight.ohIcon || 'inv_sword_04';
  const item = itemInfo(key, fight, A);
  if (item) return item.icon;
  if (A[key]) return A[key].icon;
  if (MI[key]) return MI[key];
  const m = fight.meter && fight.meter[key];
  if (m && m.icon) return m.icon;
  return EXTRA_ICONS[key] || 'inv_misc_questionmark';
}

// What iconFor needs from a live fight.
export function iconSource(f) {
  return { uses: f.c.uses || {}, racial: f.racial.active || null, mhIcon: f.c.mh && f.c.mh.icon, ohIcon: f.c.oh && f.c.oh.icon, meter: f.meter };
}

function nameFor(key, fight, A = ABILITIES) {
  if (fight.names && fight.names[key]) return fight.names[key].name;
  const item = itemInfo(key, fight, A);
  if (item) return item.name;
  if (A[key]) return A[key].name;
  const m = fight.meter && fight.meter[key];
  return m && m.name ? m.name : key;
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

// ---- log ---------------------------------------------------------------------------------------

const LOG_KINDS = { damage: 'Damage', proc: 'Extra attacks', cast: 'Casts', aura: 'Auras', rage: 'Rage', hurt: 'Damage taken', other: 'Other' };

// Windfury (the totem's proc and its attack, Windfury Weapon's) and extra attacks (Hand of Justice, Sword
// Specialization, Thrash Blade...): marked in the logs so they are easy to pick out. 'wf', 'extra' or null.
export function procOf(ev) {
  if (ev.type === 'windfuryProc') return 'wf';
  if (ev.type !== 'damage') return null;
  if (ev.key === 'windfury' || /windfury/i.test(ev.name || '')) return 'wf';
  if (ev.key === 'extra' || /^extra attack/i.test(ev.name || '')) return 'extra';
  return null;
}
export const PROC_TAGS = { wf: 'WF', extra: 'EXTRA' };

function logKind(ev) {
  if (procOf(ev)) return 'proc';
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
    case 'windfuryProc': return 'Windfury procs: an extra main-hand attack';
    case 'bossSwing': return ev.me ? 'The boss swings at you' : 'The boss swings at its tank';
    case 'cast': return `Cast ${nameFor(ev.id, f)}`;
    case 'aura': return `Aura gained: ${ev.name || ev.id}`;
    case 'auraEnd': return `Aura faded: ${ev.name || ev.id}`;
    case 'rage': return `Gained ${fmt(ev.amount, 2)} ${(ev.resource || 'rage')} from ${ev.source} (now ${fmt(ev.total, 1)})`;
    case 'hurt': return `${ev.name} hit you for ${fmt(ev.amount)} (${ev.school})`;
    case 'death': return `You died (${ev.name})`;
    case 'heal': return `You were healed for ${fmt(ev.amount)}`;
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
  // How many Windfury and extra attacks there were, and what they did.
  const count = { wf: { n: 0, dmg: 0 }, extra: { n: 0, dmg: 0 } };
  for (const ev of log) {
    const p = ev.type === 'damage' && procOf(ev);
    if (p) { count[p].n++; count[p].dmg += ev.amount || 0; }
  }
  const procs = count.wf.n || count.extra.n
    ? `<p class="log-procs">${count.wf.n ? `<span class="proc-wf"><b class="ptag">WF</b> ${count.wf.n} Windfury attacks, ${fmt(count.wf.dmg)} damage</span>` : ''}
      ${count.extra.n ? `<span class="proc-extra"><b class="ptag">EXTRA</b> ${count.extra.n} extra attacks, ${fmt(count.extra.dmg)} damage</span>` : ''}</p>` : '';
  return `<div class="log-tools"><input type="search" class="log-search" placeholder="Search the log (e.g. Bloodthirst, Crit, Flurry)">${kinds}
    <span class="log-count"></span></div>${procs}
    <ol class="rlog">${log.map((ev) => {
      const p = procOf(ev);
      return `<li data-kind="${logKind(ev)}" class="${ev.outcome === 'crit' ? 'crit' : ''}${p ? ` proc-${p}` : ''}">
      <span class="t">[${ev.t.toFixed(2)}]</span> ${p ? `<b class="ptag">${PROC_TAGS[p]}</b> ` : ''}${esc(logText(ev, f))}</li>`;
    }).join('')}</ol>`;
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
// close: a Close button (the game's window; Numen Logs has none).
// Your casts against the rotation (main.js reviewCast / reviewFrame): the share that were its choice, the time the
// global cooldown sat ready with something to cast, and the swap you made most. Shown when there was something to find
// (under 90% of the casts, or 3 sec idle); the Timeline's Rotation row marks each one.
function rotationHtml(f, log, meta) {
  const r = meta && meta.rotation;
  if (!r || r.checked < 5) return '';
  const offs = (log || []).filter((ev) => ev.type === 'apl');
  const idle = (log || []).filter((ev) => ev.type === 'aplIdle').reduce((a, ev) => a + (ev.end - ev.t), 0);
  const share = Math.round(((r.checked - offs.length) / r.checked) * 100);
  if (share >= 90 && idle < 3) return `<p class="rot-note good">Rotation: ${share}% of your casts were the rotation's.</p>`;
  const pairs = {};
  for (const ev of offs) { const k = `${ev.id}|${ev.want}`; (pairs[k] ||= { ...ev, n: 0 }).n++; }
  const top = Object.values(pairs).sort((a, b) => b.n - a.n).slice(0, 3);
  return `<div class="rot-review"><b>Rotation</b> ${share}% of your casts were the rotation's (${r.checked - offs.length} of ${r.checked})${idle >= 1 ? ` · ${idle.toFixed(1)} s with the global cooldown ready and something to cast` : ''}.
    ${top.length ? `<ul>${top.map((p) => `<li>${esc(nameFor(p.id, f))} where it casts ${esc(nameFor(p.want, f))}${p.n > 1 ? ` (${p.n}×)` : ''}${p.why ? `<small>Why: ${esc(p.why)}</small>` : ''}</li>`).join('')}</ul>` : ''}
    <span class="hint">The Timeline marks each one.</span></div>`;
}

export function renderResults(root, f, log, meta, { close = true } = {}) {
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
    ['timeline', 'Timeline', () => '<div class="tlx"></div>'],
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
      ${close ? '<button class="primary" data-close>Close</button>' : ''}
    </div>
    ${rotationHtml(f, log, meta)}
    <nav class="tabs rtabs">${tabs.map(([id, label], i) => `<button class="tab${i === 0 ? ' active' : ''}" data-rtab="${id}">${label}</button>`).join('')}</nav>
    <div class="rbody"></div>`;
  const body = root.querySelector('.rbody');
  const show = (id) => {
    const tab = tabs.find((t) => t[0] === id);
    body.innerHTML = tab[2]();
    root.querySelectorAll('[data-rtab]').forEach((b) => b.classList.toggle('active', b.dataset.rtab === id));
    if (id === 'log') bindLog(body);
    if (id === 'timeline') mountTimeline(body.querySelector('.tlx'), f, log, { iconFor, nameFor });
  };
  root.querySelectorAll('[data-rtab]').forEach((b) => b.addEventListener('click', () => show(b.dataset.rtab)));
  show('damage');
}
