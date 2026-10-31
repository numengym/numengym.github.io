// Numen Gym moved from ledskipov.github.io/numen-gym to numengym.github.io, and a browser keeps what a site saves
// under the site's address. The old address (its own small site) hands the saved data over: it opens this page with
// ?moved, this page asks its opener for the data (the "furytrainer." settings, keybinds, macros and loadouts, and
// Numen Logs' report history), keeps it and loads again without ?moved.
import { importReports } from './history.js';

const OLD_ORIGIN = 'https://ledskipov.github.io';

// Resolves at once unless this page was opened to take the data over; then it never does (the page reloads).
export async function importFromOldAddress() {
  const url = new URL(location.href);
  if (!url.searchParams.has('moved')) return;
  url.searchParams.delete('moved');
  if (window.opener) {
    const data = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 20000);
      window.addEventListener('message', (e) => {
        if (e.origin !== OLD_ORIGIN || !e.data || e.data.type !== 'numen-move') return;
        clearTimeout(timer);
        resolve(e.data);
      });
      window.opener.postMessage({ type: 'numen-move-ready' }, OLD_ORIGIN);
    });
    if (data) {
      for (const [k, v] of Object.entries(data.local || {})) {
        if (k.startsWith('furytrainer.') && typeof v === 'string') localStorage.setItem(k, v);
      }
      localStorage.removeItem('furytrainer.druidTree113531'); // the old address's druid talents predate the new tree
      try { await importReports(data.summaries || [], data.reports || []); } catch { /* the settings still came over */ }
      window.opener.postMessage({ type: 'numen-move-done' }, OLD_ORIGIN);
    }
  }
  location.replace(url.href);
  await new Promise(() => {});
}
