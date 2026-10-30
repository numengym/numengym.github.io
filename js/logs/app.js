// Numen Logs (logs.html): the fight reports, rankings and parses of Numen Gym, laid out like Warcraft Logs.
//   #/                 reports: yours (this browser's history.js), and the newest uploads when a server is set
//   #report/<id>       one report: who, what, kill or wipe, the parse, the raid and gear, and the deep dive (the
//                      game's results tabs: damage, threat, auras, casts, resources, timeline, damage taken, log)
//   #rankings/<boss>   the parses of a real encounter (a classic boss at full health, killed), by spec
// Real encounters are uploaded by the game when a server is set (remote.js); without one the rankings are yours.
import { renderResults } from '../results.js';
import { parseTier } from '../score.js';
import { iconUrl } from '../data/warrior.js';
import { CLASS_COLORS } from '../raid-frames.js';
import { ENCOUNTERS } from '../world/encounter.js';
import { deleteReport, getReport, listReports } from '../history.js';
import { fetchRankings, fetchRecent, fetchReport, remoteOn } from './remote.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n, d = 0) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtDate = (t) => new Date(t).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const color = (cls) => CLASS_COLORS[cls] || '#ccc';
const icon = (name, cls = 'li') => `<img class="${cls}" src="${iconUrl(name || 'inv_misc_questionmark')}" alt="" onerror="this.style.visibility='hidden'">`;
const parseCell = (p) => (p == null ? '<span class="muted">–</span>' : `<b style="color:${parseTier(p)[1]}">${p}</b>`);

const BOSS_ICONS = {
  brute: 'spell_fire_incinerate', onyxia: 'inv_misc_head_dragon_black', lucifron: 'spell_shadow_nightofthedead', magmadar: 'ability_hunter_pet_corehound',
  ragnaros: 'spell_fire_lavaspawn', broodlord: 'inv_misc_head_dragon_blue', patchwerk: 'spell_shadow_abominationexplosion', dummies: 'inv_misc_targetdummy',
  venoxis: 'spell_nature_nullifypoison', jeklik: 'ability_hunter_pet_bat', marli: 'ability_hunter_pet_spider', thekal: 'ability_hunter_pet_cat',
  mandokir: 'ability_mount_raptor', hakkar: 'spell_shadow_bloodboil',
  kurinnaxx: 'inv_misc_ahnqirajtrinket_02', rajaxx: 'inv_misc_ahnqirajtrinket_01', moam: 'inv_misc_ahnqirajtrinket_03', buru: 'inv_misc_ahnqirajtrinket_04',
  ayamiss: 'inv_misc_ahnqirajtrinket_05', ossirian: 'inv_misc_ahnqirajtrinket_06',
};
const bossIcon = (key) => BOSS_ICONS[key] || 'inv_misc_questionmark';
// The real encounters: the classic bosses with a classic health.
const RANKED = Object.entries(ENCOUNTERS).filter(([, e]) => e.health);

// Kill, wipe, practice (a boss at less than its health) or training (the clock ends it).
function kind(s) {
  if (s.real) return s.kill ? ['kill', 'Kill'] : ['wipe', 'Wipe'];
  if (s.bossHpPct) return ['practice', `Practice ${s.bossHpPct}%`];
  return ['training', 'Training'];
}

// ---- the pages -----------------------------------------------------------------------------------

async function reportsPage() {
  const view = $('#view');
  view.innerHTML = '<p class="muted">Loading…</p>';
  let mine = [];
  try { mine = await listReports(); } catch { /* no IndexedDB */ }
  const filter = sessionStorage.getItem('logs.filter') || 'all';
  const shown = mine.filter((s) => filter === 'all' || kind(s)[0] === filter || (filter === 'real' && s.real));
  view.innerHTML = `
    <section class="card">
      <div class="card-head"><h2>Your reports</h2>
        <label>Show <select id="rep-filter">${[['all', 'Every fight'], ['real', 'Real encounters'], ['kill', 'Kills'], ['wipe', 'Wipes'], ['practice', 'Practice'], ['training', 'Training']]
          .map(([v, l]) => `<option value="${v}"${v === filter ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <span class="muted">${mine.length} kept in this browser (the last 200)</span></div>
      ${reportTable(shown, { mine: true })}
    </section>
    <section class="card" id="recent"><div class="card-head"><h2>Newest uploads</h2></div>
      ${remoteOn() ? '<p class="muted">Loading…</p>' : `<p class="muted">No Numen Logs server is set up yet, so real encounters stay in your browser and the rankings are yours alone.</p>`}</section>`;
  $('#rep-filter').addEventListener('change', (e) => { sessionStorage.setItem('logs.filter', e.target.value); reportsPage(); });
  bindRows(view);
  if (remoteOn()) {
    try { $('#recent').innerHTML = `<div class="card-head"><h2>Newest uploads</h2></div>${reportTable(await fetchRecent(50))}`; bindRows($('#recent')); }
    catch (e) { $('#recent').insertAdjacentHTML('beforeend', `<p class="bad">The server could not be reached: ${esc(e.message)}</p>`); }
  }
}

function reportTable(rows, { mine = false } = {}) {
  if (!rows.length) return '<p class="muted">No fights yet. Finish a fight in Numen Gym and it shows up here.</p>';
  return `<table class="wcl">
    <thead><tr><th>Date</th><th>Encounter</th><th></th><th>Player</th><th>Duration</th><th>Amount</th><th>Score</th>${mine ? '<th></th>' : ''}</tr></thead>
    <tbody>${rows.map((s) => {
      const [k, label] = kind(s);
      return `<tr class="rep" data-id="${esc(s.id)}"${s.remote ? ' data-remote="1"' : ''}>
        <td class="muted">${esc(fmtDate(s.when))}</td>
        <td><div class="enc">${icon(bossIcon(s.encounter))}<span>${esc(s.encounterName)}<small>${esc(s.raidName || '')}</small></span></div></td>
        <td><span class="badge ${k}">${esc(label)}</span></td>
        <td><div class="who">${icon(s.player.specIcon)}<span><b style="color:${color(s.player.cls)}">${esc(s.player.name)}</b><small>${esc(s.player.specName)}</small></span></div></td>
        <td>${fmtTime(s.duration)}</td>
        <td class="num">${fmt(s.value, 1)} <small>${esc(s.metric)}</small></td>
        <td class="num">${parseCell(s.parse)}</td>
        ${mine ? `<td><button class="del" data-del="${esc(s.id)}" title="Delete this report from your browser">✕</button></td>` : ''}
      </tr>`;
    }).join('')}</tbody></table>`;
}

function bindRows(root) {
  root.querySelectorAll('tr.rep').forEach((tr) => tr.addEventListener('click', (e) => {
    if (e.target.closest('[data-del]')) return;
    location.hash = `report/${tr.dataset.id}${tr.dataset.remote ? '?remote' : ''}`;
  }));
  root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this report from your browser? It cannot be brought back.')) return;
    await deleteReport(b.dataset.del);
    reportsPage();
  }));
}

async function reportPage(id, remote) {
  const view = $('#view');
  view.innerHTML = '<p class="muted">Loading…</p>';
  let r = null;
  try { r = remote ? await fetchReport(id) : (await getReport(id)) || (remoteOn() ? await fetchReport(id) : null); }
  catch (e) { view.innerHTML = `<p class="bad">The report could not be loaded: ${esc(e.message)}</p>`; return; }
  if (!r) { view.innerHTML = '<p class="bad">No such report in this browser.</p>'; return; }
  const s = r.summary;
  const [k, label] = kind(s);
  const p = s.parse;
  const deaths = (r.log || []).filter((ev) => ev.type === 'death');
  view.innerHTML = `
    <section class="report-head card">
      ${icon(bossIcon(s.encounter), 'boss')}
      <div class="rh-main">
        <h1>${esc(s.encounterName)} <span class="badge ${k}">${esc(label)}</span></h1>
        <p class="muted">${esc(s.raidName || 'Numen Gym')} · ${esc(fmtDate(s.when))} · ${fmtTime(s.duration)} · ${s.raidSize} in the raid${s.group ? ' (a group)' : ''}${s.uploaded ? ' · uploaded' : ''}</p>
        <p class="who big">${icon(s.player.specIcon)}<span style="color:${color(s.player.cls)}">${esc(s.player.name)}</span> <small>${esc(s.player.specName)} · ${esc((s.player.race || '').replace(/^Race/, ''))}</small></p>
      </div>
      <div class="rh-stats">
        <div><b>${fmt(s.value, 1)}</b><small>${esc(s.metric)}</small></div>
        ${s.metric !== 'DPS' ? `<div><b>${fmt(s.dps, 1)}</b><small>DPS</small></div>` : ''}
        <div><b style="color:${p == null ? '#888' : parseTier(p)[1]}">${p ?? '–'}</b><small>score</small></div>
        <div><b>${deaths.length}</b><small>death${deaths.length === 1 ? '' : 's'}</small></div>
      </div>
    </section>
    <div class="report-cols">
      <section class="card deep"><div class="results-box logs-results"></div></section>
      <aside>
        <section class="card"><h2>The raid</h2><ul class="raid">${(r.raid || []).map((m) => `<li><span style="color:${color(m.cls)}">${esc(m.name)}</span>${m.me ? ' <small>(this report)</small>' : ''}<small>${esc(m.spec || '')}${m.npc ? ' · NPC' : ''}</small></li>`).join('') || '<li class="muted">Alone</li>'}</ul></section>
        <section class="card"><h2>Gear</h2><ul class="gear">${(r.gear || []).map((g) => `<li>${icon(g.icon)}<span class="q${g.quality}">${esc(g.name)}</span><small>${esc(g.slot || '')}${g.enchant ? ` · ${esc(g.enchant)}` : ''}</small></li>`).join('') || '<li class="muted">Not kept for this report</li>'}</ul></section>
        ${s.real ? `<section class="card"><a href="#rankings/${esc(s.encounter)}">${esc(s.encounterName)} rankings →</a></section>` : ''}
      </aside>
    </div>`;
  renderResults(view.querySelector('.logs-results'), r.fight, r.log || [], { ...r.meta, isBest: false }, { close: false });
}

async function rankingsPage(enc) {
  const view = $('#view');
  if (!ENCOUNTERS[enc] || !ENCOUNTERS[enc].health) enc = RANKED[0][0];
  const spec = sessionStorage.getItem('logs.spec') || 'all';
  const bestOnly = sessionStorage.getItem('logs.best') !== '0';
  view.innerHTML = `
    <nav class="boss-tabs">${RANKED.map(([key, e]) => `<a href="#rankings/${key}" class="${key === enc ? 'on' : ''}">${icon(bossIcon(key))}<span>${esc(e.name)}<small>${esc(e.raid || "Onyxia's Lair")}</small></span></a>`).join('')}</nav>
    <section class="card"><div class="card-head"><h2>${esc(ENCOUNTERS[enc].name)}: damage rankings</h2>
      <label>Spec <select id="rk-spec"></select></label>
      <label class="inline"><input type="checkbox" id="rk-best"${bestOnly ? ' checked' : ''}> Best per player</label>
      <span class="muted">${remoteOn() ? 'Everyone\'s uploaded kills' : 'Your kills in this browser (no server yet)'} at full classic health.</span></div>
      <div id="rk-table"><p class="muted">Loading…</p></div></section>`;
  let rows = [];
  try { rows = (await listReports()).filter((s) => s.encounter === enc && s.real && s.kill); } catch { /* no IndexedDB */ }
  if (remoteOn()) {
    try {
      const ids = new Set(rows.map((s) => s.id));
      rows = [...rows, ...(await fetchRankings(enc)).filter((s) => !ids.has(s.id))];
    } catch (e) { view.querySelector('.card-head').insertAdjacentHTML('beforeend', `<span class="bad">Server: ${esc(e.message)}</span>`); }
  }
  const specs = [...new Map(rows.map((s) => [s.player.spec, s.player.specName])).entries()];
  const sel = $('#rk-spec');
  sel.innerHTML = `<option value="all">All specs</option>${specs.map(([v, n]) => `<option value="${esc(v)}"${v === spec ? ' selected' : ''}>${esc(n)}</option>`).join('')}`;
  sel.addEventListener('change', () => { sessionStorage.setItem('logs.spec', sel.value); rankingsPage(enc); });
  $('#rk-best').addEventListener('change', (e) => { sessionStorage.setItem('logs.best', e.target.checked ? '1' : '0'); rankingsPage(enc); });
  let list = rows.filter((s) => spec === 'all' || s.player.spec === spec).sort((a, b) => b.dps - a.dps);
  if (bestOnly) { const seen = new Set(); list = list.filter((s) => { const k = `${s.player.name}|${s.player.spec}`; if (seen.has(k)) return false; seen.add(k); return true; }); }
  // Rank percent, as a parse: 100 for the top, down to 0 for the last.
  const n = list.length;
  $('#rk-table').innerHTML = n ? `<table class="wcl ranks">
    <thead><tr><th>Rank</th><th>Parse</th><th>Player</th><th>DPS</th><th>Score</th><th>Duration</th><th>Date</th></tr></thead>
    <tbody>${list.map((s, i) => {
      const pct = n === 1 ? 100 : Math.round((100 * (n - 1 - i)) / (n - 1));
      return `<tr class="rep" data-id="${esc(s.id)}"${s.remote ? ' data-remote="1"' : ''}><td class="num">${i + 1}</td><td class="num">${parseCell(pct)}</td>
        <td><div class="who">${icon(s.player.specIcon)}<span><b style="color:${color(s.player.cls)}">${esc(s.player.name)}</b><small>${esc(s.player.specName)}</small></span></div></td>
        <td class="num"><b>${fmt(s.dps, 1)}</b></td><td class="num">${parseCell(s.parse)}</td><td>${fmtTime(s.duration)}</td><td class="muted">${esc(fmtDate(s.when))}</td></tr>`;
    }).join('')}</tbody></table>
    <p class="muted">Parse: the share of the ranked ${spec === 'all' ? 'players' : 'players of this spec'} you beat (100 is the top). Score: the fight against the wowsims sim on the same setup, as in the game.</p>`
    : '<p class="muted">No kills of this boss at its full classic health yet. In Numen Gym, a group always fights it at its real health; alone, turn on "Classic bosses at their real health" in Settings → Fight.</p>';
  bindRows($('#rk-table'));
}

// ---- the router ----------------------------------------------------------------------------------

function route() {
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  const [page, arg] = path.split('/');
  document.querySelectorAll('.top nav a').forEach((a) => a.classList.toggle('on', a.dataset.page === (page || 'reports') || (page === 'report' && a.dataset.page === 'reports')));
  window.scrollTo(0, 0);
  if (page === 'report' && arg) reportPage(decodeURIComponent(arg), query === 'remote');
  else if (page === 'rankings') rankingsPage(arg);
  else reportsPage();
}
$('#server-state').textContent = remoteOn() ? 'Connected' : 'Local only';
$('#server-state').classList.toggle('on', remoteOn());
window.addEventListener('hashchange', route);
route();
