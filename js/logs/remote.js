// Numen Logs' shared server: real encounters uploaded by every player, for the rankings and for opening anyone's
// report. A Supabase project (its REST API, tools/numen-logs-schema.sql) set in LOGS_SERVER; until one is, Numen
// Logs shows only the reports kept in your own browser (history.js).
//
// The publishable key is public by design (it only allows what the table's row security allows: reading reports and
// adding new ones). Nothing checks that an uploaded fight was played as it says: the rankings trust the game.
export const LOGS_SERVER = { url: 'https://hcenkmjpxwkvrnmgalng.supabase.co', anonKey: 'sb_publishable_vXCJinozGUuAjJo3oeo4sg_luouHwSX' };

export const remoteOn = () => !!(LOGS_SERVER && LOGS_SERVER.url && LOGS_SERVER.anonKey);

// A publishable key (sb_publishable_…) goes in the apikey header alone; a legacy anon key (a JWT) also as the bearer.
const headers = () => ({
  apikey: LOGS_SERVER.anonKey, 'Content-Type': 'application/json',
  ...(LOGS_SERVER.anonKey.startsWith('sb_') ? {} : { Authorization: `Bearer ${LOGS_SERVER.anonKey}` }),
});
const api = (path) => `${LOGS_SERVER.url.replace(/\/$/, '')}/rest/v1/${path}`;

// The report's body (results, log, raid, gear) gzipped into base64: a full combat log is a few hundred kB as JSON.
async function pack(obj) {
  const stream = new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function unpack(b64) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}

// Uploads a report (history.js) once; resolves when the server has it.
export async function uploadReport(report) {
  const s = report.summary;
  const body = await pack({ fight: report.fight, log: report.log, meta: report.meta, raid: report.raid, gear: report.gear });
  const res = await fetch(api('reports'), {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: s.id, encounter: s.encounter, player_name: s.player.name, cls: s.player.cls, spec: s.player.spec,
      dps: s.dps, tps: s.tps, duration: s.duration, kill: s.kill, real: s.real, parse: s.parse, summary: s, body,
    }),
  });
  if (!res.ok && res.status !== 409) throw new Error(`upload failed: ${res.status} ${await res.text()}`); // 409: already there
}

// Every uploaded real-encounter kill of an encounter: their summaries, best DPS first.
export async function fetchRankings(encounter) {
  const res = await fetch(api(`reports?select=summary&encounter=eq.${encodeURIComponent(encounter)}&real=eq.true&kill=eq.true&order=dps.desc&limit=1000`), { headers: headers() });
  if (!res.ok) throw new Error(`rankings: ${res.status}`);
  return (await res.json()).map((r) => ({ ...r.summary, remote: true }));
}

// The newest uploads (any encounter).
export async function fetchRecent(limit = 50) {
  const res = await fetch(api(`reports?select=summary&order=created_at.desc&limit=${limit}`), { headers: headers() });
  if (!res.ok) throw new Error(`recent: ${res.status}`);
  return (await res.json()).map((r) => ({ ...r.summary, remote: true }));
}

// A whole uploaded report, as history.js keeps one.
export async function fetchReport(id) {
  const res = await fetch(api(`reports?select=summary,body&id=eq.${encodeURIComponent(id)}`), { headers: headers() });
  if (!res.ok) throw new Error(`report: ${res.status}`);
  const [row] = await res.json();
  if (!row) return null;
  return { id, summary: { ...row.summary, remote: true }, ...(await unpack(row.body)) };
}
