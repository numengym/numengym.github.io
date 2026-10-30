// Your fight history: every finished fight kept as a report (the results, the combat log, who and what it was), in
// the browser's IndexedDB (localStorage is too small for the logs). The game's results window reopens them, and
// Numen Logs (logs.html) lists, ranks and opens them. A summary per report is kept apart, so the lists never read
// the logs.
//   summary: { id, when, encounter, encounterName, real, bossHpPct, kill, dead, duration, metric, value, dps, tps,
//              parse, player: { name, cls, spec, specName, specIcon, race }, raidSize, group, uploaded }
//   report:  { id, summary, fight (snapshotResults), log, meta, raid: [{ name, cls, spec, npc }] }
const DB_NAME = 'numen-logs';
const MAX_REPORTS = 200; // the oldest go first past this

let opening = null;
function db() {
  opening ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      d.createObjectStore('summaries', { keyPath: 'id' }).createIndex('when', 'when');
      d.createObjectStore('reports', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opening;
}

const done = (tx) => new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(tx.error); });
const result = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });

export const newReportId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// Keeps a report (and its summary), dropping the oldest past MAX_REPORTS.
export async function saveReport(report) {
  const d = await db();
  const tx = d.transaction(['summaries', 'reports'], 'readwrite');
  tx.objectStore('summaries').put(report.summary);
  tx.objectStore('reports').put(report);
  await done(tx);
  const all = await listReports();
  if (all.length > MAX_REPORTS) for (const s of all.slice(MAX_REPORTS)) await deleteReport(s.id);
}

// Every summary, newest first.
export async function listReports() {
  const d = await db();
  const rows = await result(d.transaction('summaries').objectStore('summaries').getAll());
  return rows.sort((a, b) => b.when - a.when);
}

export async function getReport(id) {
  const d = await db();
  return result(d.transaction('reports').objectStore('reports').get(id));
}

// Changes a report's summary (and the copy inside the report): its parse once scored, its upload.
export async function updateReport(id, patch, metaPatch = null) {
  const d = await db();
  const tx = d.transaction(['summaries', 'reports'], 'readwrite');
  const sums = tx.objectStore('summaries');
  const reps = tx.objectStore('reports');
  const s = await result(sums.get(id));
  if (s) sums.put({ ...s, ...patch });
  const r = await result(reps.get(id));
  if (r) reps.put({ ...r, summary: { ...r.summary, ...patch }, meta: metaPatch ? { ...r.meta, ...metaPatch } : r.meta });
  await done(tx);
}

export async function deleteReport(id) {
  const d = await db();
  const tx = d.transaction(['summaries', 'reports'], 'readwrite');
  tx.objectStore('summaries').delete(id);
  tx.objectStore('reports').delete(id);
  await done(tx);
}
